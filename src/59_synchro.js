// La run chez les amis (Miro « Rejoindre ou partir en pleine run »).
// L'hôte tient la run ; à chaque fois qu'elle bouge il en diffuse une copie (`run:photo`), et chaque ami la regarde en
// lecture seule. Qui arrive en pleine run reçoit la copie tout de suite et prend un héros ; qui part rend les siens à
// l'hôte, avec leur état. Seul, rien de tout ça ne se voit.
import { creerRun, JOUEURS_MAX } from './57_run.js';
import { createParty, createLoopback } from './skills/party-net/module/03_skill.js';

export const name = 'synchro';
export const always = true;

// `party()` : le groupe (party-net) ; `run()` : { courante, lecture, miroir(copie), lacher() } (le skill de la run) ;
// `nom(id)` : le nom affiché de quelqu'un du groupe.
export function creerSynchro({ party = () => null, run = () => null, nom = (id) => id } = {}) {
  const enGroupe = () => !!party()?.active;
  const hote = () => enGroupe() && party().hosting;
  const api = {
    // Les joueurs du groupe en ce moment, l'hôte en premier : ce que la run répartit en héros.
    joueurs() {
      const p = party();
      return p?.active ? [{ id: p.id, nom: nom(p.id) }, ...[...p.others.values()].map((o) => ({ id: o.id, nom: o.name || nom(o.id) }))] : [{ id: p?.id ?? 'me', nom: nom(p?.id ?? 'me') }];
    },
    // La run a bougé (le bus dit « run:… ») : l'hôte en envoie la copie à tout le monde.
    diffuser() {
      const r = run();
      if (hote() && r?.courante && !r.lecture) party().toAll({ k: 'run:photo', p: r.courante.instantane() });
    },
    // Ce que dit party-net : un message, un ami qui arrive, un ami qui part.
    ecouter(type, d) {
      const r = run(); if (!r) return;
      if (type === 'game' && d.m?.k === 'run:photo' && !hote()) r.miroir(d.m.p);
      else if (type === 'join' && hote() && r.courante && !r.lecture) { r.courante.rejoindre({ id: d.id, nom: d.name || nom(d.id) }); api.diffuser(); }
      else if (type === 'leave' && hote() && r.courante && !r.lecture) { r.courante.quitter(d.id); api.diffuser(); }
    },
    // Chaque image : un ami dont l'hôte a disparu ne regarde plus une run qui n'existe plus.
    avancer() { if (!enGroupe() && run()?.lecture) run().lacher(); },
  };
  return api;
}

let ctrl = null, arrets = [];
export function init(game, { party = () => null, run = () => null, nom = (id) => id } = {}) {
  ctrl = creerSynchro({ party, run, nom });
  arrets = [
    game.bus.on('*', (n) => { if (n.startsWith('run:')) ctrl.diffuser(); }),
    game.bus.on('party:game', (d) => ctrl.ecouter('game', d)),
    game.bus.on('party:join', (d) => ctrl.ecouter('join', d)),
    game.bus.on('party:leave', (d) => ctrl.ecouter('leave', d)),
  ];
  return ctrl;
}
export function update() { ctrl?.avancer(); }
export function dispose() { arrets.forEach((f) => f()); arrets = []; ctrl = null; }

// --- Les vérifications (?test) ------------------------------------------------------------------------------------------
export async function selfTest(t) {
  const HEROS = ['Aldric', 'Brune', 'Cendre', 'Dune'];
  const J = (...noms) => noms.map((n) => ({ id: n.toLowerCase(), nom: n }));
  const qui = (r) => r.etat.heros.map((h) => h.joueur);

  t.group('les héros et leurs joueurs');
  let r = creerRun({ heros: HEROS, joueurs: J('Hôte') });
  t.eq(qui(r), ['hôte', 'hôte', 'hôte', 'hôte'], 'seul, on mène les quatre héros');
  r = creerRun({ heros: HEROS, joueurs: J('Hôte', 'Ana') });
  t.eq(qui(r), ['hôte', 'ana', 'hôte', 'ana'], 'à deux : deux héros chacun');
  r = creerRun({ heros: HEROS, joueurs: J('Hôte', 'Ana', 'Ben') });
  t.eq(qui(r), ['hôte', 'ana', 'ben', 'hôte'], 'à trois : 2, 1, 1');
  r = creerRun({ heros: HEROS, joueurs: J('Hôte', 'Ana', 'Ben', 'Cléo') });
  t.eq(qui(r), ['hôte', 'ana', 'ben', 'cléo'], 'à quatre : un chacun');
  t.eq(creerRun({ heros: HEROS, joueurs: J('A', 'B', 'C', 'D', 'E') }).etat.joueurs.length, JOUEURS_MAX, 'pas plus de quatre joueurs');

  t.group('rejoindre en pleine run');
  r = creerRun({ heros: HEROS, joueurs: J('Hôte') }); r.partir(); r.finirSalle('victoire', { Aldric: { pv: 7 } });
  t.ok(r.rejoindre({ id: 'ana', nom: 'Ana' }), 'un ami arrive');
  t.eq(qui(r), ['hôte', 'hôte', 'ana', 'ana'], 'il prend sa part : deux héros, les derniers de l’hôte');
  t.eq([r.heros('hôte').map((h) => h.id), r.etat.heros[0].pv], [['Aldric', 'Brune'], 7], 'les héros gardent leur état (PV, etc.) en changeant de main');
  t.ok(!r.rejoindre({ id: 'ana', nom: 'Ana' }), 'pas deux fois');
  r.rejoindre({ id: 'ben', nom: 'Ben' });
  t.eq(qui(r), ['hôte', 'ben', 'ana', 'ana'], 'un troisième prend le dernier héros de celui qui en a le plus (l’hôte, à égalité, en premier)');
  r.rejoindre({ id: 'cléo', nom: 'Cléo' });
  t.ok(r.etat.joueurs.length === 4 && r.etat.heros.every((h) => h.joueur) && new Set(qui(r)).size === 4, 'à quatre joueurs, un héros chacun');
  t.ok(!r.rejoindre({ id: 'zoé', nom: 'Zoé' }), 'le groupe est complet (4 au plus)');

  t.group('partir en pleine run');
  r = creerRun({ heros: HEROS, joueurs: J('Hôte', 'Ana', 'Ben') }); r.partir();
  r.rapporter({ Brune: { pv: 3 } });
  t.ok(!r.quitter('hôte') && !r.quitter('zzz'), 'l’hôte ne « part » pas, un inconnu non plus');
  t.ok(r.quitter('ana'), 'un ami part');
  t.eq(qui(r), ['hôte', 'hôte', 'ben', 'hôte'], 'son héros passe à l’hôte');
  t.eq([r.etat.heros[1].pv, r.etat.heros[1].ancien], [3, 'Ana'], 'avec son état, et le nom de celui qui l’a laissé');
  r.quitter('ben');
  t.eq(qui(r), ['hôte', 'hôte', 'hôte', 'hôte'], 'tout le monde est parti : l’hôte mène les quatre');
  t.eq(r.etat.heros.length, 4, 'la run garde ses quatre héros');
  r.rejoindre({ id: 'ana-2', nom: 'Ana' });
  t.ok(r.etat.heros[1].joueur === 'ana-2' && r.etat.heros[1].pv === 3, 'Ana revient (sous un autre identifiant) : elle retrouve son héros, tel qu’elle l’avait laissé');
  t.eq(r.heros('ana-2').length, 2, 'et complète sa part (deux héros à deux joueurs)');
  r.rejoindre({ id: 'ben-2', nom: 'Ben' });
  t.eq(r.etat.heros[2].joueur, 'ben-2', 'Ben revient lui aussi, et retrouve le sien');
  t.eq(r.etat.heros.map((h) => h.ancien), [null, null, null, null], 'plus personne n’est « laissé à l’hôte »');

  t.group('la défaite et la copie');
  r = creerRun({ heros: HEROS, joueurs: J('Hôte', 'Ana') }); r.partir();
  r.finirSalle('victoire'); r.finirSalle('victoire'); r.choisir(0); r.finirSalle('victoire');   // jusqu'au repos 4a
  r.quitter('ana'); r.finirSalle('victoire'); r.choisir(0);
  r.rapporter({ Aldric: { pv: 2 } }); r.finirSalle('defaite');
  t.eq([r.salle.id, qui(r).every((j) => j === 'hôte')], ['4a', true], 'réveil au dernier repos, avec les joueurs d’aujourd’hui (pas ceux d’avant)');
  r = creerRun({ heros: HEROS, joueurs: J('Hôte') }); r.partir(); r.rejoindre({ id: 'ana', nom: 'Ana' });
  const photo = r.instantane(), miroir = creerRun({ gabarit: photo.gabarit }).restaurer(photo);
  t.eq([miroir.etat.joueurs.map((j) => j.nom), miroir.heros('ana').length], [['Hôte', 'Ana'], 2], 'la copie porte aussi les joueurs');
  r.finirSalle('victoire'); r.finirSalle('victoire'); r.choisir(0);
  const avant = qui(r); r.finirSalle('victoire');
  t.eq(qui(r), avant, 'les héros restent à leurs joueurs d’une salle à l’autre');

  // --- Par le réseau : un hôte, un ami qui arrive en pleine run, un autre qui part ---
  t.group('la run chez les amis');
  const H = 1 / 60, hub = createLoopback({ latency: 0.03 }), gens = [];
  const fabrique = (nomP) => {
    const P = { nomP, lecture: false, courante: null };
    const runP = {
      get courante() { return P.courante; }, get lecture() { return P.lecture; },
      miroir(c) { if (!P.lecture) { P.lecture = true; P.courante = creerRun({ gabarit: c.gabarit }); } P.courante.restaurer(c); return P.courante; },
      lacher() { P.courante = null; P.lecture = false; },
    };
    P.sync = creerSynchro({ party: () => P.party, run: () => runP, nom: (id) => (id === 'host' ? 'Hôte' : id) });
    P.party = createParty({ transport: () => hub.transport(), fields: ['x'], me: () => ({ x: 0 }), name: () => nomP, now: () => hub.time, on: (ty, d) => { if (['game', 'join', 'leave'].includes(ty)) P.sync.ecouter(ty, d); } });
    gens.push(P); return P;
  };
  const pas = (s) => { for (let i = 0; i < Math.round(s / H); i++) { hub.advance(H); for (const P of gens) { P.party.update(H); P.sync.avancer(); } } };
  const hote = fabrique('Hôte'); hote.party.host('ABCDE'); pas(0.1);
  hote.courante = creerRun({ heros: HEROS, joueurs: hote.sync.joueurs(), evenement: () => hote.sync.diffuser() });
  hote.courante.partir(); pas(0.1);
  t.ok(qui(hote.courante).every((j) => j === hote.party.id), 'au départ, seul : l’hôte mène les quatre');
  const ana = fabrique('Ana'); ana.party.join('abcde'); pas(0.5);
  t.ok(ana.lecture && ana.courante?.phase === 'salle' && ana.courante.salle.id === '1a', 'Ana arrive en pleine run : elle voit la salle en cours');
  t.eq([hote.courante.heros(ana.party.id).length, ana.courante.heros(ana.party.id).length], [2, 2], 'elle a pris deux héros, et le voit');
  hote.courante.finirSalle('victoire'); pas(0.2);
  t.eq(ana.courante.salle.id, '2a', 'quand la run avance chez l’hôte, Ana la voit avancer');
  hote.courante.rapporter({ Aldric: { pv: 11 } }); pas(0.2);
  t.eq(ana.courante.etat.heros[0].pv, 11, 'et voit l’état des héros');
  const ben = fabrique('Ben'); ben.party.join('abcde'); pas(0.5);
  t.eq(hote.courante.etat.joueurs.map((j) => j.nom), ['Hôte', 'Ana', 'Ben'], 'Ben arrive : trois joueurs');
  ana.party.leave(); pas(0.4);
  t.eq(hote.courante.etat.joueurs.map((j) => j.nom), ['Hôte', 'Ben'], 'Ana part : il reste deux joueurs');
  t.ok(hote.courante.etat.heros.every((h) => [hote.party.id, ben.party.id].includes(h.joueur)), 'ses héros sont passés à l’hôte : aucun héros sans joueur');
  t.eq(ben.courante.etat.joueurs.map((j) => j.nom), ['Hôte', 'Ben'], 'Ben le voit');
  const ana2 = fabrique('Ana'); ana2.party.join('abcde'); pas(0.5);
  t.ok(hote.courante.heros(ana2.party.id).length >= 1 && ana2.courante?.etat.joueurs.length === 3, 'Ana revient et reprend un héros');
  hote.party.leave(); pas(0.3);
  t.ok(!ben.party.active && !ben.lecture && !ben.courante, 'si l’hôte part, les amis continuent seuls et ne regardent plus une run qui n’existe plus');
}
