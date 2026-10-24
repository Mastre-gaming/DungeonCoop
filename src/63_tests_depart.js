// Les vérifications du départ par la grande porte (src/63_depart.js) : les chemins, l'adresse du niveau, le départ seul, puis
// à plusieurs (l'hôte mène, Ben reste au camp, Ana s'éloigne ou part). Appelées par le selfTest de 63_depart.js.
import AVENTURE from '../content/aventures/camp-des-mastres.json';
import { T } from './01_plan.js';
import { creerDepart, chemins, gabarit, adresse, vaAuNiveau, dansPorte, auBout, PORTE, BOUT, HEROS_RUN } from './63_depart.js';
import { creerRun } from './57_run.js';
import { createLoopback, createParty } from './skills/party-net/module/03_skill.js';

const av = AVENTURE;

// Un groupe de joueurs simulés sur le fil « loopback » : chacun son contrôleur ; `pas(s)` fait passer le temps.
function groupe(code, noms, options = {}) {
  const hub = createLoopback(), H = 1 / 10, gens = [];
  const fabrique = (nom) => {
    const P = { nom, vus: [] };
    P.ctrl = creerDepart({ party: () => P.party, nom: (id) => id, emettre: (n, d) => P.vus.push([n, d]), ...options });
    P.party = createParty({ transport: () => hub.transport(), fields: ['x'], me: () => ({ x: 0 }), name: () => nom, now: () => hub.time,
      on: (ty, d) => { if (ty === 'game') P.ctrl.ecouter('game', d); else if (ty === 'leave') P.ctrl.ecouter('leave', d); } });
    gens.push(P);
    return P;
  };
  const pas = (s) => { for (let i = 0; i < Math.round(s / H); i++) { hub.advance(H); for (const P of gens) { P.party.update(H); P.ctrl.avancer(H); } } };
  const hote = fabrique(noms[0]); hote.party.host(code); pas(0.2);
  const amis = noms.slice(1).map((nom) => { const P = fabrique(nom); P.party.join(code.toLowerCase()); pas(0.4); return P; });
  return { hote, amis, pas };
}

export async function testsDepart(t) {
  t.group('le départ : les chemins et l’adresse du niveau');
  t.eq(gabarit().length, av.niveaux.length, 'un type de salle par niveau de l’aventure');
  t.eq(chemins(null).map((c) => c.id), [`chemin:${av.niveaux[0].id}`], 'au départ : un seul chemin, le premier niveau');
  const enCours = creerRun({ gabarit: gabarit(), heros: HEROS_RUN, joueurs: [{ id: 'a', nom: 'A' }], reelle: true });
  enCours.partir(); enCours.finirSalle('victoire', null, { xp: 120, niveau: 2 });
  t.eq(chemins(enCours.etat).map((c) => c.id), ['chemin:neuf'], 'une run au niveau 2 (pas encore écrit) : seulement « Recommencer l’aventure »');
  t.ok(chemins(enCours.etat)[0].cout.includes('perdue') && enCours.progression.xp === 120, 'recommencer dit ce que ça coûte ; l’XP de la run est gardée');
  t.eq(adresse({ niveau: 1 }, { code: 'ABCDE', hote: true, progression: { xp: 120, niveau: 2 } }), './entrainement.html?aventure=camp-des-mastres&niveau=1&groupe=ABCDE&hote=&xp=120&nh=2', 'l’hôte : le code du groupe, et l’XP de la run');
  t.eq(adresse({ niveau: 1 }, { code: 'ABCDE' }), './entrainement.html?aventure=camp-des-mastres&niveau=1&groupe=ABCDE', 'un ami : le code, sans « hote »');
  t.eq(adresse({ niveau: 1 }, { progression: { xp: 120, niveau: 2 }, pv: [1, 0.5, 1, 0.25] }), './entrainement.html?aventure=camp-des-mastres&niveau=1&xp=120&nh=2&pv=1%2C0.5%2C1%2C0.25', 'les PV de chacun, en fraction du maximum, partent avec le groupe');
  t.ok(!adresse({ niveau: 1 }, { pv: [1, 1, 1, 1] }).includes('pv=') && !adresse({ niveau: 1, neuf: true }, { pv: [0.5, 1, 1, 1] }).includes('pv='), 'tous au maximum, ou en recommençant : pas de PV dans l’adresse');
  t.eq(adresse({ niveau: 1, neuf: true }, { progression: { xp: 120, niveau: 2 } }), './entrainement.html?aventure=camp-des-mastres&niveau=1', 'seul, et en recommençant : ni code ni XP (niveau 1)');
  t.ok(dansPorte({ x: PORTE.x, y: PORTE.y }) && !dansPorte({ x: PORTE.x, y: PORTE.y + 6 * T }) && auBout({ x: BOUT.x, y: BOUT.y }) && !auBout({ x: BOUT.x, y: BOUT.y - 5 * T }), 'la grande porte et le bout du chemin sont deux zones distinctes');

  t.eq(adresse({ niveau: 1 }, { progression: { xp: 5, niveau: 1 }, potions: [2, 1, 0, 2], caillasse: 40 }), './entrainement.html?aventure=camp-des-mastres&niveau=1&xp=5&nh=1&po=2%2C1%2C0%2C2&ca=40', 'les potions de chacun et la Caillasse du groupe suivent la run');
  const [a, b] = [{ id: 'ana' }, { id: 'ben' }];
  t.ok(vaAuNiveau([a], 'ana', false) && !vaAuNiveau([a], 'ben', false) && vaAuNiveau([a], 'host', true) && vaAuNiveau([], 'ben', false), 'ceux qui sont restés au camp n’y vont pas ; l’hôte y va toujours (c’est lui qui tient le niveau)');
  t.group('le départ : seul');
  {
    const vus = [], solo = creerDepart({ emettre: (n, d) => vus.push([n, d]) });
    t.ok(!solo.demanderChemin() && !solo.arrive(true), 'avant le contrat : rien ne bouge');
    t.ok(solo.ouvrir([{ id: 'me', nom: 'Moi' }]) && solo.etat.phase === 'preparation', 'le contrat accepté : on se prépare');
    t.ok(!solo.arrive(true), 'pas de bout du chemin avant d’avoir choisi');
    t.ok(solo.demanderChemin() && vus.at(-1)[0] === 'depart:vote' && vus.at(-1)[1].options.length === 1, 'à la grande porte : le vote du chemin s’ouvre');
    t.ok(!solo.demanderChemin(), 'pas deux votes à la fois');
    t.ok(solo.cheminChoisi(`chemin:${av.niveaux[0].id}`) && solo.etat.phase === 'marche', 'le chemin choisi : on marche jusqu’au bout');
    t.ok(!solo.pret(true), 'prêt, mais pas encore arrivé : refusé');
    solo.arrive(true);
    t.ok(solo.pret(true), 'au bout du chemin : prêt');
    t.eq([vus.at(-1)[0], vus.at(-1)[1].chemin.niveau, solo.etat.phase], ['depart:lancer', 1, 'parti'], 'seul, un « prêt » suffit : le niveau se lance');
  }

  t.group('le départ : à plusieurs (l’hôte mène)');
  {
    const { hote, amis: [ana, ben], pas } = groupe('DEPAR', ['Hôte', 'Ana', 'Ben'], { compte: 1 });
    const les3 = [hote, ana, ben];
    hote.ctrl.ouvrir([{ id: hote.party.id, nom: 'Hôte' }, { id: ana.party.id, nom: 'Ana' }]); pas(0.3);          // Ben reste au camp
    t.ok(les3.every((P) => P.ctrl.etat?.phase === 'preparation') && ana.ctrl.partant() && !ben.ctrl.partant(), 'tout le monde voit le départ ; Ana part, Ben reste au camp');
    ben.ctrl.demanderChemin(); pas(0.3);
    t.ok(!hote.ctrl.etat.vote, 'Ben ne part pas : il n’ouvre pas le vote');
    ana.ctrl.demanderChemin(); pas(0.3);
    const vote = hote.vus.find(([n]) => n === 'depart:vote');
    t.ok(vote && vote[1].electeurs.length === 2 && !vote[1].electeurs.includes(ben.party.id), 'Ana demande le chemin : le vote s’ouvre, entre ceux qui partent (pas Ben)');
    hote.ctrl.cheminChoisi(vote[1].options[0].id); pas(0.3);
    t.ok(les3.every((P) => P.ctrl.etat.phase === 'marche' && P.ctrl.etat.chemin.niveau === 1), 'le chemin est choisi : tout le monde marche jusqu’au bout');
    hote.ctrl.arrive(true); hote.ctrl.pret(true); pas(0.3);
    t.ok(hote.ctrl.etat.prets.length === 1 && hote.ctrl.etat.phase === 'marche', 'l’hôte est prêt : on attend Ana');
    ana.ctrl.pret(true); pas(0.3);
    t.ok(ana.ctrl.etat.prets.length === 1, 'Ana n’est pas encore au bout : son « prêt » ne compte pas');
    ana.ctrl.arrive(true); pas(0.3); ana.ctrl.pret(true); pas(0.3);
    t.ok(les3.every((P) => P.ctrl.etat.phase === 'compte'), 'tous les partants sont prêts : le compte à rebours, chez tout le monde');
    ana.ctrl.arrive(false); pas(0.3);
    t.ok(hote.ctrl.etat.phase === 'marche' && hote.ctrl.etat.prets.length === 1, 'Ana s’éloigne : plus prête, le compte à rebours s’arrête');
    ana.ctrl.arrive(true); pas(0.3); ana.ctrl.pret(true); pas(1.6);
    t.ok(les3.every((P) => P.vus.some(([n]) => n === 'depart:lancer')), 'le compte est fini : le niveau se lance chez l’hôte, chez Ana et chez Ben');
  }
  {
    const { hote, amis: [ana], pas } = groupe('DEPAB', ['Hôte', 'Ana']);
    hote.ctrl.ouvrir([{ id: hote.party.id }, { id: ana.party.id }]); pas(0.2);
    hote.ctrl.ouvrirVote(hote.party.id); hote.ctrl.cheminChoisi(chemins(null)[0].id); hote.ctrl.arrive(true); hote.ctrl.pret(true); pas(0.2);
    ana.party.leave(); pas(0.5);
    t.ok(hote.vus.some(([n]) => n === 'depart:lancer'), 'Ana part en route : on ne l’attend plus, l’hôte (prêt) part seul');
  }
}
