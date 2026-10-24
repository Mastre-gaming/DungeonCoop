// Le vote de la salle suivante (Miro « Le vote de la salle suivante » et « L'aperçu avant de voter »).
// Là où la ligne de salles se divise, le groupe vote (STORY_STRUCTURE.md §5, CORE_LOOP.md) :
//   - un minuteur de 20 s ; chacun peut changer son vote tant qu'il tourne ;
//   - quand tout le monde a voté, il ne reste que 3 s (pour changer d'avis, pas pour attendre) ;
//   - le plus de voix gagne ; en cas d'égalité, l'hôte départage : sa propre voix l'emporte si elle est parmi les ex æquo,
//     sinon c'est la première des salles à égalité ; personne n'a voté : la première salle ;
//   - seul, on choisit et c'est tout, sans minuteur ;
//   - qui part en plein vote n'attend personne ; qui arrive en cours de route vote aussi.
// Trois morceaux : le vote lui-même (pur, testé), le contrôleur (l'hôte compte et dit à tous, les amis votent par
// l'hôte), l'écran (les cartes). Le même vote servira aux deux boss et aux choix d'événement : il prend une liste d'options.
import './vote.css';
import { APERCU } from './57_run.js';
import { createParty, createLoopback } from './skills/party-net/module/03_skill.js';

export const name = 'vote';
export const always = true;

export const DUREE = 20;          // le minuteur, en secondes
export const DELAI_FIN = 3;       // ce qu'il en reste une fois que tout le monde a voté
export const PAUSE_RESULTAT = 1.6; // le résultat reste affiché avant que le groupe parte
const RAISONS = {
  voix: 'Le plus de voix l’emporte.', egalite: 'Égalité : l’hôte tranche.', solo: '', aucune: 'Personne n’a voté : on prend la première.',
};

// --- Le vote (pur) -----------------------------------------------------------------------------------------------------
export function creerVote({ options, electeurs, hote, duree = DUREE, delaiFin = DELAI_FIN }) {
  const v = {
    options: options.map(({ id, nom, type, gain, cout }) => ({ id, nom, type, gain, cout })), electeurs: [...electeurs], votes: {},
    restant: electeurs.length > 1 ? duree : null, fini: null,
  };
  const voix = () => v.options.map((_, i) => Object.values(v.votes).filter((x) => x === i).length);
  function conclure() {
    const n = voix(), max = Math.max(...n), egaux = n.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
    let i, raison;
    if (max === 0) { i = 0; raison = 'aucune'; }
    else if (egaux.length === 1) { i = egaux[0]; raison = v.electeurs.length === 1 ? 'solo' : 'voix'; }
    else { const h = v.votes[hote]; i = egaux.includes(h) ? h : egaux[0]; raison = 'egalite'; }
    v.fini = { i, raison }; v.restant = v.restant == null ? null : 0;
  }
  // Tout le monde a voté : plus que quelques secondes. Seul, c'est fini tout de suite.
  function verifier() {
    if (v.fini) return;
    if (v.electeurs.length === 0) return conclure();
    const tous = v.electeurs.every((id) => id in v.votes);
    if (tous && v.electeurs.length === 1) conclure();
    else if (tous && v.restant != null) v.restant = Math.min(v.restant, delaiFin);
  }
  const api = {
    get etat() { return v; },
    voix,
    voter(id, i) {
      if (v.fini || !v.electeurs.includes(id) || !v.options[i]) return false;
      v.votes[id] = i; verifier(); return true;
    },
    partir(id) {
      const k = v.electeurs.indexOf(id); if (k < 0) return false;
      v.electeurs.splice(k, 1); delete v.votes[id]; verifier(); return true;
    },
    ajouter(id) {
      if (v.fini || v.electeurs.includes(id)) return false;
      v.electeurs.push(id); if (v.restant == null) v.restant = duree; return true;
    },
    avancer(dt) {
      if (v.fini || v.restant == null) return;
      v.restant = Math.max(0, v.restant - dt);
      if (v.restant <= 0) conclure();
    },
  };
  verifier();
  return api;
}

// --- Le contrôleur : l'hôte compte, tout le monde voit -----------------------------------------------------------------
// `party()` : le groupe en ce moment (party-net) ; `run()` : la run à faire avancer (hôte ou seul) ; `nom(id)` : le nom
// affiché ; `emettre(nom, donnees)` : le bus du jeu ; `ecran` : { dessiner(a, moi), fermer() } (rien en test).
export function creerControleur({ party = () => null, run = () => null, nom = (id) => id, emettre = () => {}, ecran = null } = {}) {
  let n = 0, vote = null, affiche = null, pause = null, depuis = 0, derniereSeconde = null;
  const moi = () => party()?.id ?? 'me';
  const enGroupe = () => !!party()?.active;
  const estHote = () => !enGroupe() || party().hosting;
  const electeurs = () => (enGroupe() ? [party().id, ...party().others.keys()] : [moi()]);

  // Ce que tout le monde voit : les options, les voix, le temps.
  const vue = () => {
    const e = vote.etat;
    return { n, options: e.options, votes: { ...e.votes }, restant: e.restant, solo: e.restant == null, fini: e.fini, electeurs: e.electeurs.map((id) => ({ id, nom: nom(id) })) };
  };
  function dessiner() { if (affiche) ecran?.dessiner(affiche, moi()); }
  function diffuser() {
    affiche = vue(); depuis = 0;
    party()?.toAll?.({ k: 'vote:etat', a: affiche });
    if (affiche.fini && pause == null) pause = PAUSE_RESULTAT;
    dessiner();
  }
  function terminer() {
    const { i } = affiche.fini, options = affiche.options;
    const r = run();
    vote = null; affiche = null; pause = null; derniereSeconde = null;
    party()?.toAll?.({ k: 'vote:ferme', n });
    ecran?.fermer();
    emettre('vote:fin', { i, options });
    r?.choisir(i);
  }

  const api = {
    get affiche() { return affiche; },
    get ouvert() { return !!affiche; },
    get vote() { return vote; },
    // Le groupe arrive à un embranchement. Seul l'hôte (ou celui qui joue seul) compte les voix.
    // `qui` : les seuls à voter (le départ de l'aventure : ceux qui partent) ; sinon, tout le groupe.
    demarrer(options, qui = null) {
      if (!estHote() || vote) return false;
      n += 1; vote = creerVote({ options, electeurs: qui?.length ? qui : electeurs(), hote: moi() });
      diffuser();
      emettre('vote:debut', { options });
      return true;
    },
    // Ma voix : l'hôte la compte tout de suite, un ami la lui envoie.
    voter(i) {
      if (!affiche || affiche.fini) return false;
      if (vote) { if (!vote.voter(moi(), i)) return false; diffuser(); return true; }
      if (!affiche.options[i]) return false;
      party()?.toHost?.({ k: 'vote:vote', i });
      affiche.votes[moi()] = i; dessiner();   // (en attendant que l'hôte le confirme)
      return true;
    },
    // Ce que dit party-net : un message du jeu, un ami qui part, un ami qui arrive.
    ecouter(type, d) {
      if (type === 'game') {
        const { from, m } = d, k = m?.k;
        if (k === 'vote:vote' && vote) { if (vote.voter(from, m.i)) diffuser(); }
        else if (k === 'vote:etat' && !estHote()) {
          const nouveau = !affiche || m.a.n !== affiche.n;
          affiche = m.a; if (affiche.fini && pause == null) pause = PAUSE_RESULTAT; if (nouveau) pause = affiche.fini ? PAUSE_RESULTAT : null;
          dessiner();
        } else if (k === 'vote:ferme' && !estHote() && affiche && affiche.n === m.n) { affiche = null; pause = null; ecran?.fermer(); }
      } else if (type === 'leave' && vote) { if (vote.partir(d.id)) diffuser(); }
      else if (type === 'join' && vote) { if (vote.ajouter(d.id)) diffuser(); }
    },
    // Chaque image : l'hôte fait tourner le minuteur ; les amis font tourner le leur (pour l'affichage seulement).
    avancer(dt) {
      if (!affiche) return;
      if (vote) {
        const avant = vote.etat.fini;
        vote.avancer(dt); depuis += dt;
        if (!avant && vote.etat.fini) diffuser();
        else if (depuis >= 1) diffuser();   // une fois par seconde : les amis recalent leur minuteur sur celui de l'hôte
      } else if (affiche.restant != null && !affiche.fini) affiche.restant = Math.max(0, affiche.restant - dt);
      if (affiche?.fini && pause != null) {
        pause -= dt;
        if (pause <= 0 && vote) terminer();
        else if (pause <= -3) { affiche = null; pause = null; ecran?.fermer(); }   // (un ami dont le « fermé » s'est perdu)
      }
      const s = affiche?.restant == null ? null : Math.ceil(affiche.restant);
      if (affiche && s !== derniereSeconde) { derniereSeconde = s; dessiner(); }
    },
  };
  return api;
}

// --- L'écran : les cartes ----------------------------------------------------------------------------------------------
function el(tag, attrs = {}, ...enfants) {
  const nd = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) nd.addEventListener(k.slice(2), v); else nd.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) nd.append(e instanceof Node ? e : String(e));
  return nd;
}

function creerEcran({ voter }) {
  const boite = el('div', { id: 'vote', hidden: true, role: 'dialog', 'aria-label': 'Vote de la salle suivante' });
  document.body.append(boite);
  const surTouche = (e) => {
    if (boite.hidden || /INPUT|TEXTAREA/.test(e.target?.tagName ?? '')) return;
    const i = '123'.indexOf(e.key); if (i >= 0) { voter(i); e.preventDefault(); }
  };
  window.addEventListener('keydown', surTouche);
  return {
    dessiner(a, moi) {
      const mien = a.votes[moi], gagne = a.fini?.i;
      const titre = a.fini ? `Le groupe part vers : ${a.options[gagne].nom}` : 'Où va le groupe ?';
      const temps = a.restant == null ? el('div', { class: 'vote-secondes' }, a.solo ? 'Tu choisis seul.' : '')
        : [el('div', { class: 'vote-temps' }, el('i', { class: a.restant <= 5 ? 'presse' : '', style: `width:${Math.round((a.restant / DUREE) * 100)}%` })), el('div', { class: 'vote-secondes' }, a.fini ? '' : `${Math.ceil(a.restant)} s`)];
      const cartes = a.options.map((o, i) => {
        const ap = APERCU[o.type] ?? {}, qui = a.electeurs.filter((e) => a.votes[e.id] === i);
        return el('button', { type: 'button', class: `carte${mien === i ? ' mien' : ''}${a.fini ? (gagne === i ? ' gagne' : ' perdu') : ''}`, onclick: () => voter(i) },
          el('span', { class: 'touche' }, `[${i + 1}]`), el('strong', {}, o.nom),
          el('div', { class: 'ligne' }, el('b', {}, 'Rapporte : '), o.gain ?? ap.gain ?? ''), el('div', { class: 'ligne' }, el('b', {}, 'Coûte : '), o.cout ?? ap.cout ?? ''),
          el('div', { class: 'votes' }, qui.map((e) => el('span', {}, e.nom))));
      });
      const tous = a.electeurs.length > 1 && a.electeurs.every((e) => e.id in a.votes);
      const pied = a.fini ? RAISONS[a.fini.raison] : tous ? 'Tout le monde a voté : plus que quelques secondes pour changer d’avis.' : a.solo ? '' : 'Clique une carte, ou 1 · 2 · 3. Tu peux changer jusqu’à la fin. L’hôte tranche les égalités.';
      boite.replaceChildren(el('h2', {}, titre), ...[temps].flat(), el('div', { class: 'vote-cartes' }, cartes), el('div', { class: 'vote-pied' }, pied));
      boite.hidden = false;
    },
    fermer() { boite.hidden = true; },
    dispose() { window.removeEventListener('keydown', surTouche); boite.remove(); },
  };
}

// --- Le skill -----------------------------------------------------------------------------------------------------------
let ctrl = null, ecranVote = null, arrets = [];

export function init(game, options = {}) {
  const { party = () => null, run = () => null, nom = (id) => id, visite = false } = options;
  let c = null;
  ecranVote = visite ? null : creerEcran({ voter: (i) => c?.voter(i) });
  c = ctrl = creerControleur({ party, run, nom, emettre: (n, d) => game.bus.emit(n, d), ecran: ecranVote });
  arrets = [
    game.bus.on('run:choix', ({ options: o }) => c.demarrer(o)),
    game.bus.on('party:game', (d) => c.ecouter('game', d)),
    game.bus.on('party:leave', (d) => c.ecouter('leave', d)),
    game.bus.on('party:join', (d) => c.ecouter('join', d)),
  ];
  return api;
}
export function update(dt) { ctrl?.avancer(dt); }
export function dispose() { arrets.forEach((f) => f()); arrets = []; ecranVote?.dispose(); ecranVote = ctrl = null; }
export const api = {
  get controleur() { return ctrl; },
  get ouvert() { return !!ctrl?.ouvert; },
  voter: (i) => ctrl?.voter(i),
};

// --- Les vérifications (?test) ------------------------------------------------------------------------------------------
export async function selfTest(t) {
  const OPTS = [{ id: '3a', nom: 'Événement', type: 'evenement' }, { id: '3b', nom: 'Énigme', type: 'enigme' }, { id: '3c', nom: 'Repos', type: 'repos' }];
  const vote = (el, opts = {}) => creerVote({ options: OPTS, electeurs: el, hote: el[0], ...opts });

  t.group('le vote : compter');
  let v = vote(['h']);
  t.ok(v.etat.restant === null && !v.etat.fini, 'seul : pas de minuteur');
  v.voter('h', 1);
  t.eq(v.etat.fini, { i: 1, raison: 'solo' }, 'seul, on choisit et c’est fini tout de suite');
  t.ok(!v.voter('h', 0), 'un vote fini ne change plus');
  v = vote(['h', 'a', 'b']);
  t.eq(v.etat.restant, DUREE, 'à plusieurs : 20 s');
  t.ok(!v.voter('inconnu', 0) && !v.voter('h', 7), 'un inconnu ou une option qui n’existe pas : refusé');
  v.voter('h', 0); v.voter('a', 1); v.voter('b', 1);
  t.eq([v.voix(), v.etat.restant], [[1, 2, 0], DELAI_FIN], 'les voix se comptent ; tout le monde a voté : plus que 3 s');
  v.voter('a', 0);
  t.eq(v.voix(), [2, 1, 0], 'on peut changer son vote tant que ça tourne');
  v.avancer(2.9); t.ok(!v.etat.fini, 'avant la fin du minuteur, rien n’est décidé');
  v.avancer(0.2);
  t.eq(v.etat.fini, { i: 0, raison: 'voix' }, 'le plus de voix l’emporte');

  t.group('le vote : égalités et silence');
  v = vote(['h', 'a']); v.voter('h', 2); v.voter('a', 1); v.avancer(99);
  t.eq(v.etat.fini, { i: 2, raison: 'egalite' }, 'égalité : la voix de l’hôte l’emporte si elle est parmi les ex æquo');
  v = vote(['h', 'a', 'b', 'c']); v.voter('a', 0); v.voter('b', 1); v.avancer(99);
  t.eq(v.etat.fini, { i: 0, raison: 'egalite' }, 'égalité sans la voix de l’hôte : la première des salles à égalité');
  v = vote(['h', 'a']); v.avancer(20);
  t.eq(v.etat.fini, { i: 0, raison: 'aucune' }, 'personne n’a voté : la première salle');
  v = vote(['h', 'a', 'b']); v.voter('h', 1); v.avancer(20);
  t.eq(v.etat.fini, { i: 1, raison: 'voix' }, 'un seul vote à la fin du minuteur suffit');

  t.group('le vote : départs et arrivées');
  v = vote(['h', 'a', 'b']); v.voter('h', 2); v.voter('a', 2);
  t.ok(v.etat.restant === DUREE, 'un ami n’a pas voté : le minuteur continue');
  v.partir('b');
  t.eq(v.etat.restant, DELAI_FIN, 'il part : les autres ont tous voté, il ne reste que 3 s');
  v = vote(['h', 'a']); v.voter('h', 0); v.partir('a');
  t.eq(v.etat.fini, { i: 0, raison: 'solo' }, 'l’ami part, l’hôte a voté : c’est décidé');
  v = vote(['h', 'a']); v.voter('h', 1); v.voter('a', 0); v.ajouter('b');
  t.eq(v.etat.restant, DELAI_FIN, 'un ami arrive en plein vote : il peut voter aussi (le délai de 3 s ne se rallonge pas)');
  v.voter('b', 1);
  t.eq(v.voix(), [1, 2, 0], 'sa voix compte');
  v = vote(['h']); v.partir('h');
  t.ok(v.etat.fini && v.etat.fini.raison === 'aucune', 'tout le monde est parti : la première salle');
  v = vote(['h', 'a']); v.voter('h', 1); v.voter('a', 1); v.ajouter('z');
  t.ok(v.etat.restant <= DELAI_FIN && !v.etat.fini, 'un arrivant ne rend pas la main aux autres');

  // --- Le contrôleur, à quatre, sur un fil « loopback » (party-net) ---
  const H = 1 / 60;
  function salle(joueurs = 2) {
    const hub = createLoopback({ latency: 0.03 });
    const gens = [], runs = [];
    const fabrique = (qui) => {
      const P = { qui, evts: [], choisi: [] };
      const ctrlP = creerControleur({ party: () => P.party, run: () => ({ choisir: (i) => P.choisi.push(i) }), nom: (id) => (id === 'host' ? 'Hôte' : id), emettre: (n, d) => P.evts.push([n, d]) });
      P.ctrl = ctrlP;
      P.party = createParty({ transport: () => hub.transport(), fields: ['x'], me: () => ({ x: 0 }), name: () => qui, now: () => hub.time, on: (type, d) => { if (type === 'game') ctrlP.ecouter('game', d); if (type === 'leave') ctrlP.ecouter('leave', d); if (type === 'join') ctrlP.ecouter('join', d); } });
      gens.push(P); return P;
    };
    const hote = fabrique('Hôte'); hote.party.host('ABCDE');
    const pas = (s) => { for (let i = 0; i < Math.round(s / H); i++) { hub.advance(H); for (const P of gens) { P.party.update(H); P.ctrl.avancer(H); } } };
    pas(0.1);
    const amis = [];
    for (let k = 0; k < joueurs - 1; k++) { const P = fabrique(`ami${k + 1}`); P.party.join('abcde'); amis.push(P); pas(0.3); }
    return { hub, hote, amis, pas, tous: gens, runs };
  }

  t.group('le vote : à quatre, par le réseau');
  let S = salle(4); const { hote, amis } = S;
  t.eq(S.tous.map((P) => P.party.id).length, 4, 'quatre joueurs dans la salle');
  hote.ctrl.demarrer(OPTS); S.pas(0.2);
  t.ok(amis.every((P) => P.ctrl.ouvert && P.ctrl.affiche.options.length === 3 && P.ctrl.affiche.restant > 19), 'le menu s’ouvre chez tout le monde, avec les mêmes options');
  t.eq(hote.ctrl.affiche.electeurs.length, 4, 'quatre électeurs');
  hote.ctrl.voter(0); amis[0].ctrl.voter(1); amis[1].ctrl.voter(1); S.pas(0.2);
  t.eq(amis[2].ctrl.affiche.votes, { host: 0, [amis[0].party.id]: 1, [amis[1].party.id]: 1 }, 'les votes se voient chez le quatrième, qui n’a pas encore voté');
  amis[1].ctrl.voter(0); S.pas(0.2);
  t.eq(hote.ctrl.vote.voix(), [2, 1, 0], 'un ami change son vote : l’hôte le compte');
  amis[2].ctrl.voter(2); S.pas(0.2);
  t.ok(hote.ctrl.affiche.restant <= DELAI_FIN, 'tout le monde a voté : plus que 3 s, chez tous');
  t.ok(amis.every((P) => P.ctrl.affiche.restant <= DELAI_FIN + 0.2), 'les amis le voient aussi');
  S.pas(6);
  t.eq(hote.choisi, [0], 'à la fin, l’hôte fait avancer la run sur la salle élue');
  t.ok(S.tous.every((P) => !P.ctrl.ouvert), 'le menu se ferme chez tout le monde');
  t.eq(S.tous.slice(1).map((P) => P.choisi.length), [0, 0, 0], 'les amis ne font pas avancer la run (c’est l’hôte qui la tient)');
  t.ok(hote.evts.some(([n]) => n === 'vote:debut') && hote.evts.some(([n, d]) => n === 'vote:fin' && d.i === 0), 'le bus dit « vote:debut » et « vote:fin »');

  t.group('le vote : un ami part, un autre arrive');
  S = salle(3);
  S.hote.ctrl.demarrer(OPTS); S.pas(0.2); S.hote.ctrl.voter(1); S.amis[0].ctrl.voter(1); S.pas(0.2);
  t.ok(S.hote.ctrl.affiche.restant > 15, 'un ami n’a pas voté : on attend');
  S.amis[1].party.leave(); S.pas(0.3);
  t.ok(S.hote.ctrl.affiche.restant <= DELAI_FIN + 0.5 && S.hote.ctrl.affiche.electeurs.length === 2, 'il part en plein vote : les autres ont voté, plus que 3 s');
  S.pas(6);
  t.eq(S.hote.choisi, [1], 'la run avance sans lui');
  S = salle(2);
  S.hote.ctrl.demarrer(OPTS); S.pas(0.2);
  const nouveau = (() => { const P = { choisi: [] }; P.ctrl = creerControleur({ party: () => P.party, nom: (id) => id }); P.party = createParty({ transport: () => S.hub.transport(), fields: ['x'], me: () => ({ x: 0 }), name: () => 'tard', now: () => S.hub.time, on: (ty, d) => { if (ty === 'game') P.ctrl.ecouter('game', d); } }); P.party.join('abcde'); return P; })();
  for (let i = 0; i < 90; i++) { S.hub.advance(H); S.hote.party.update(H); nouveau.party.update(H); S.hote.ctrl.avancer(H); }
  t.ok(S.hote.ctrl.affiche.electeurs.length === 3 && nouveau.ctrl.ouvert, 'un ami arrive en plein vote : il le voit et peut voter');

  t.group('le vote : seul, et les touches');
  const seul = { choisi: [] };
  seul.ctrl = creerControleur({ party: () => null, run: () => ({ choisir: (i) => seul.choisi.push(i) }), nom: (id) => id });
  seul.ctrl.demarrer(OPTS);
  t.ok(seul.ctrl.affiche.solo && seul.ctrl.affiche.restant === null, 'seul : pas de minuteur');
  seul.ctrl.voter(2);
  t.ok(seul.ctrl.affiche.fini?.i === 2, 'il choisit : c’est décidé');
  for (let i = 0; i < 120; i++) seul.ctrl.avancer(H);
  t.eq([seul.choisi, seul.ctrl.ouvert], [[2], false], 'la run avance une fois le résultat montré, et le menu se ferme');
  t.ok(!seul.ctrl.voter(0), 'plus de vote une fois fermé');
  t.ok(OPTS.every((o) => APERCU[o.type]?.gain && APERCU[o.type]?.cout), 'chaque salle propose un aperçu : ce qu’elle rapporte et ce qu’elle coûte');
}
