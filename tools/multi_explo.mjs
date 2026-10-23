// L'exploration à plusieurs, sur le build (dist/) : l'hôte et un ami simulé (fil « loopback », sans réseau) jouent le sentier F.
//   npm run build && node tools/multi_explo.mjs [dossier des captures]
// Vérifie : le lancement (le départ), la marche de chacun, les refus, les scènes de zone, un geste (cueillir), la fourche
// (la voix de l'hôte, l'éboulis chez tous), l'embuscade, l'entrée en combat et le départ d'un ami.
import path from 'node:path';
import fs from 'node:fs';
import { servir, ouvrir } from './captures.mjs';

const sortie = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (sortie) fs.mkdirSync(sortie, { recursive: true });
const srv = await servir();
let code = 0;
try {
const URL = 'aventure=camp-des-mastres&mot=KLMNP&graine=11&cinema=auto&des=0&equipe=brute,chevalier,voleur,druide';
// Le prélude : l'hôte (cette page), Ana (un ami simulé), le lobby et le lancement ; chaque scénario repart d'une page neuve.
const PRELUDE = String.raw`(async () => {
    const { partyNet, multi, ihm } = dbg;
    const erreurs = []; addEventListener('error', (e) => erreurs.push(e.message)); addEventListener('unhandledrejection', (e) => erreurs.push(String(e.reason?.stack ?? e.reason)));
    const ce = console.error; console.error = (...a) => { erreurs.push(a.map(String).join(' ')); ce(...a); };
    const hub = partyNet.createLoopback({ latency: 0.02 });
    const bilan = [], note = (ok, label) => bilan.push([!!ok, label]);
    const amis = [];
    const ami = (nom) => { const A = { recus: [], pointeur: { x: -1, y: -1, h: 0, c: 0, v: 0 } };
      A.party = partyNet.createParty({ transport: () => hub.transport(), fields: ['x', 'y', 'h', 'c', 'v'], me: () => A.pointeur, name: () => nom, now: () => hub.time, on: (type, d) => { if (type === 'game') A.recus.push(d.m); } });
      A.dernier = (type) => [...A.recus].reverse().find((m) => m.t === type); A.tous = (type) => A.recus.filter((m) => m.t === type); amis.push(A); return A; };
    const pas = 1 / 60, jouer = (s) => { for (let k = 0; k < Math.round(s / pas); k++) { hub.advance(pas); dbg.advance(pas); for (const a of amis) a.party.update(pas); } };
    const C = () => dbg.combat, S = () => dbg.combat.S;
    const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const montre = (id) => { const u = S().unites.find((x) => x.id === id); return u ? [Math.round(u.x * 10) / 10, Math.round(u.y * 10) / 10] : null; };
    const poser = (id, x, y) => { const u = C().U(id); u.x = x; u.y = y; };
    const attendreFile = () => { for (let k = 0; k < 600 && dbg.vue.occupe(); k++) jouer(0.1); };

    // 1. le groupe, le lobby, le lancement
    const party = multi.brancherTest(hub, { comme: 'hote', avec: 'KXQZB', aller: () => {} });
    jouer(0.1);
    const ana = ami('Ana'); ana.party.join('KXQZB'); jouer(0.4);
    note(multi.L.proprio[1] === ana.party.id, 'Ana arrive : la place 2 est à elle');
    party.toHost({ t: 'commencer' }); jouer(0.4);
    note(S().phase === 'exploration' && multi.L.phase === 'combat', 'Commencer : le tronçon commence à pied (pas un combat)');
    const debut = ana.dernier('debut');
    note(debut && JSON.parse(debut.copie).phase === 'exploration', 'Ana reçoit le début : la même exploration');
    note(S().unites.filter((u) => u.camp === 'h').length === 4 && multi.L.proprio[3] === 'host', 'les quatre héros sont là, le dernier est à l’hôte');

`;
const scenario = async (titre, corps) => {
  console.log(`
— ${titre}`);
  const page = await ouvrir(srv.url + 'entrainement.html', URL);
  const r = await page.eval(PRELUDE + corps + ' return { bilan, erreurs }; })()');
  for (const [ok, label] of r.bilan) { console.log(`${ok ? '✓' : '✗'} ${label}`); if (!ok) code = 1; }
  if (r.erreurs.length || page.errors.length) { console.log('erreurs :', [...r.erreurs, ...page.errors].join(' | ')); code = 1; }
  await page.close();
};
await scenario('le sentier à deux : marche, geste, fourche, scène, embuscade', String.raw`    // 2. chacun mène ses héros
    const h2a = montre('h2'), h1a = montre('h1'), h3a = montre('h3');
    ana.recus.length = 0;
    ana.party.toHost({ t: 'action', a: { type: 'explo', op: 'marche', id: 'h2', x: h2a[0] + 3, y: h2a[1] } }); jouer(0.5);
    const h2b = montre('h2');
    note(h2b[0] > h2a[0] + 2 && montre('h1')[0] === h1a[0], 'Ana mène son héros : l’hôte le fait marcher (les autres ne bougent pas)');
    const etat1 = ana.dernier('etat');
    note(etat1 && etat1.evs.some((e) => e.type === 'marche' || e.type === 'groupe'), 'Ana reçoit l’état et la marche à montrer');
    ana.recus.length = 0;
    ana.party.toHost({ t: 'action', a: { type: 'explo', op: 'marche', id: 'h1', x: h1a[0] + 3, y: h1a[1] } }); jouer(0.3);
    note(ana.dernier('refus') && montre('h1')[0] === h1a[0], 'Ana ne mène pas le héros de l’hôte : refusé');
    ana.recus.length = 0;
    const ec = S().fourches[0];
    ana.party.toHost({ t: 'action', a: { type: 'explo', op: 'choix', quoi: 'chemin', id: 'h2', fourche: ec.id, branche: ec.branches[0].id } }); jouer(0.3);
    note(ana.dernier('refus') && !ec.choisi, 'Ana ne choisit pas le chemin : la voix est à l’hôte');
    // (la suite se joue sans ennemis : on franchit des zones d'un bond, ce qu'un joueur ne ferait pas)
    for (const e of S().unites.filter((u) => u.camp === 'e')) e.mort = true;
    // l’hôte mène : ses trois héros marchent ensemble
    multi.agir({ type: 'explo', op: 'marche', id: 'h1', x: h1a[0] + 4, y: h1a[1] }); jouer(0.5);
    const h1b = montre('h1');
    note(h1b[0] > h1a[0] + 3 && montre('h3')[0] !== h3a[0], 'l’hôte mène : ses autres héros le suivent en file');
    attendreFile();

    for (const e of S().unites.filter((u) => u.camp === 'e')) e.mort = true;
    // 2b. la fourche : le groupe arrive au poteau ; tous la voient, l'hôte choisit, l'éboulis arrive chez tous
    const f = S().fourches[0];
    for (const id of ['h1', 'h2', 'h3', 'h4']) poser(id, f.poteau[0] - 6 - (id.charCodeAt(1) - 49) * 1.7, f.poteau[1]);
    multi.agir({ type: 'explo', op: 'marche', id: 'h1', x: f.poteau[0] - 2, y: f.poteau[1] }); jouer(0.6);
    note(S().question?.fourche === f.id, 'au poteau : la question de la fourche est posée');
    for (let k = 0; k < 300 && !document.querySelector('[data-branche]'); k++) { if (dbg.cine?.actif()) dbg.cine.suivant(); jouer(0.2); await sleep(5); }
    const etatQ = ana.tous('etat').find((m) => JSON.parse(m.copie).question?.fourche === f.id);
    note(!!etatQ, 'Ana reçoit la question avec l’état');
    note(!!document.querySelector('[data-branche]') && !document.querySelector('[data-branche]').disabled, 'chez l’hôte : les deux chemins se choisissent');
    ana.recus.length = 0;
    ana.party.toHost({ t: 'action', a: { type: 'explo', op: 'marche', id: 'h2', x: f.poteau[0] + 1, y: f.poteau[1] } }); jouer(0.3);
    note(ana.dernier('refus'), 'pendant la question, personne ne marche');
    ana.recus.length = 0;
    if (!document.querySelector('[data-branche]')) return { bilan, diag: { erreurs } };
    document.querySelector('[data-branche]').click(); jouer(0.5);
    note(S().fourches[0].choisi && !S().question && !document.querySelector('[data-branche]'), 'l’hôte choisit : le chemin est pris, la question fermée');
    const ch = ana.dernier('chemin');
    note(ch && ch.fourche === f.id && ch.branche === S().fourches[0].choisi && Array.isArray(ch.evs) && ch.evs.length > 0, 'Ana reçoit le chemin choisi et l’éboulis à montrer (' + (ch?.evs?.length ?? 0) + ' événements)');
    note(ana.dernier('etat') && !JSON.parse(ana.dernier('etat').copie).question, 'Ana voit la question fermée');
    for (let k = 0; k < 400 && (dbg.cine?.actif() || dbg.vue.occupe()); k++) { if (dbg.cine?.actif()) dbg.cine.suivant(); jouer(0.2); await sleep(5); }
    // 3. un geste : cueillir (Ana, au contact)
    const tv = S().trouvailles.find((o) => !o.fait);
    if (tv) {
      poser('h2', tv.x - 1, tv.y);
      ana.recus.length = 0;
      const pv0 = C().U('h2').pv, max = C().U('h2').pvMax;
      C().U('h2').pv = Math.max(1, max - 6);
      ana.party.toHost({ t: 'action', a: { type: 'explo', op: 'cueillir', id: 'h2', obj: tv.id } }); jouer(0.4);
      note(S().trouvailles.find((o) => o.id === tv.id).fait && C().U('h2').pv > max - 6, 'Ana cueille : l’hôte le joue, ses PV remontent');
      note(ana.dernier('etat') && JSON.parse(ana.dernier('etat').copie).trouvailles.find((o) => o.id === tv.id).fait, 'Ana voit la trouvaille prise');
      attendreFile();
    } else note(false, 'aucune trouvaille dans le tronçon ?');

    // 4. une scène de zone (cinématique) : jouée chez Ana aussi
    const dec = dbg.cine?.donnees?.declencheurs ?? [];
    note(dec.length > 0, 'le tronçon a des scènes de zone (' + dec.length + ')');
    if (dec.length) {
      ana.recus.length = 0;
      const d = dec[0];
      poser('h1', d.x - 6, S().unites.find((u) => u.id === 'h1').y);
      multi.agir({ type: 'explo', op: 'marche', id: 'h1', x: d.x + 1, y: C().U('h1').y }); jouer(0.4);
      const sc = ana.tous('scene');
      note(sc.some((m) => m.scene === d.scene), 'franchir la zone : Ana reçoit la scène « ' + d.scene + ' »');
      for (let k = 0; k < 200 && dbg.cine?.actif(); k++) { dbg.cine.suivant(); jouer(0.2); }
      attendreFile();
    }


    // 6. l'embuscade des champs : la voix de l'hôte, le jet de négociation ; Ana voit la question puis son issue
    const inc = S().incidents.find((o) => o.sorte === 'embuscade');
    if (inc) {
      for (const id of ['h1', 'h2', 'h3', 'h4']) poser(id, inc.x - inc.rayon - 4 - (id.charCodeAt(1) - 49) * 1.7, inc.y);
      ana.recus.length = 0;
      multi.agir({ type: 'explo', op: 'marche', id: 'h1', x: inc.x - inc.rayon + 1, y: inc.y }); jouer(0.6);
      note(S().question?.incident === inc.id, 'l’embuscade : la question est posée');
      for (let k = 0; k < 60 && !document.querySelector('[data-choix]'); k++) { jouer(0.2); await sleep(5); }
      note(ana.tous('etat').some((m) => JSON.parse(m.copie).question?.incident === inc.id), 'Ana reçoit l’embuscade avec l’état');
      note(!!document.querySelector('[data-choix="negocier"]') && !document.querySelector('[data-choix="negocier"]').disabled, 'chez l’hôte : payer, négocier ou combattre');
      ana.recus.length = 0;
      ana.party.toHost({ t: 'action', a: { type: 'explo', op: 'choix', quoi: 'embuscade', id: 'h2', incident: inc.id, choix: 'combattre' } }); jouer(0.3);
      note(ana.dernier('refus') && S().question?.incident === inc.id, 'Ana ne tranche pas l’embuscade : refusé');
      ana.recus.length = 0;
      document.querySelector('[data-choix="negocier"]').click(); jouer(0.6);
      const issue = S().incidents.find((o) => o.id === inc.id);
      note(!S().question && (issue.fait || S().phase !== 'exploration'), 'l’hôte négocie : le jet est fait, la question fermée (' + (issue.fait ? 'ils partent' : 'combat') + ')');
      note(ana.dernier('etat') && !JSON.parse(ana.dernier('etat').copie).question, 'Ana voit l’embuscade réglée');
      for (let k = 0; k < 400 && dbg.vue.occupe(); k++) { jouer(0.1); }
    } else note(false, 'pas d’embuscade dans le tronçon ?');
`);
await scenario('l’entrée en combat, les prêts, le départ d’Ana', String.raw`
    // le premier groupe d'ennemis : le héros le plus avancé entre dans son champ de vision
    const g = S().unites.find((u) => u.camp === 'e' && !u.cache);
    const cible = { x: g.x, y: g.y };
    for (const id of ['h1', 'h2', 'h3', 'h4']) poser(id, cible.x - 10 - (id.charCodeAt(1) - 49) * 1.7, cible.y);
    ana.recus.length = 0;
    let k = 0;
    while (S().phase === 'exploration' && k++ < 8) { multi.agir({ type: 'explo', op: 'marche', id: 'h1', x: C().U('h1').x + 5, y: cible.y }); jouer(0.5); attendreFile(); }
    note(S().phase === 'heros', 'repéré en route : le combat commence (la phase des héros)');
    const etatC = ana.dernier('etat');
    note(etatC && JSON.parse(etatC.copie).phase === 'heros', 'Ana reçoit l’état du combat');
    note(multi.attendus().includes(ana.party.id) && multi.attendus().includes('host'), 'on attend l’hôte et Ana pour finir la phase');
    const round0 = S().round;
    ana.party.toHost({ t: 'pret', oui: true }); jouer(0.3);
    note(!ana.dernier('etat') || JSON.parse(ana.dernier('etat').copie).round === round0, 'Ana est prête : on attend encore l’hôte');
    multi.pret(true); jouer(0.3);
    for (let n = 0; n < 200 && dbg.vue.occupe(); n++) jouer(0.1);
    note(S().round > round0 || S().phase === 'ennemis', 'tous prêts : la phase passe aux ennemis');
    ana.party.leave(); jouer(0.5);
    note(multi.L.proprio[1] === 'host', 'Ana part en plein combat : l’hôte joue son héros');
`);

// Côté invité : cette page est l'ami d'un hôte simulé. Elle voit la question en lecture seule, ses clics partent vers l'hôte.
{
  console.log('\n— côté invité : la fourche en lecture seule, les clics vers l’hôte');
  const page = await ouvrir(srv.url + 'entrainement.html', URL);
  const r = await page.eval(String.raw`(async () => {
    const { partyNet, multi, ihm } = dbg;
    const bilan = [], note = (ok, label) => bilan.push([!!ok, label]);
    const hub = partyNet.createLoopback({ latency: 0.02 });
    const H = { recus: [] };
    H.party = partyNet.createParty({ transport: () => hub.transport(), fields: ['x', 'y', 'h', 'c', 'v'], me: () => ({ x: -1, y: -1, h: 0, c: 0, v: 0 }), name: () => 'Hôte', now: () => hub.time, on: (type, d) => { if (type === 'game') H.recus.push(d.m); } });
    H.party.host('QWERT');
    const pas = 1 / 60, jouer = (s) => { for (let k = 0; k < Math.round(s / pas); k++) { hub.advance(pas); dbg.advance(pas); H.party.update(pas); } };
    const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const moi = multi.brancherTest(hub, { comme: 'invite', avec: 'QWERT', aller: () => {} });
    jouer(0.5);
    const copie = JSON.parse(dbg.combat.instantane());
    const L = { phase: 'combat', equipe: ['brute', 'chevalier', 'voleur', 'druide'], proprio: ['host', moi.id, 'host', 'host'], mode: 'equipe', infini: false, pret: [], absents: {} };
    H.party.toAll({ t: 'debut', L, R: {}, copie: JSON.stringify(copie), evs: [] }); jouer(0.5);
    const S = () => dbg.combat.S;
    note(S().phase === 'exploration' && multi.L.phase === 'combat' && ihm.reseau, 'l’invité reçoit le début : la même exploration, à pied');
    note(ihm.choisirHeros('h2') && !ihm.choisirHeros('h1'), 'il choisit son héros (h2) et pas celui de l’hôte');
    // un clic sur le terrain : l'action part vers l'hôte, rien ne bouge chez l'invité
    const h2 = dbg.combat.U('h2'), avant = [h2.x, h2.y];
    H.recus.length = 0;
    const cibles = [[2, 0], [0, 2], [-2, 0], [0, -2], [1, 1], [-1, -1], [3, 0], [0, 3]], dst = cibles.map(([dx, dy]) => ({ x: h2.x + dx, y: h2.y + dy })).find((p) => dbg.combat.apercuMarche(h2, p.x, p.y, dbg.combat.portee(h2)).ok);
    for (let k = 0; k < 200 && dbg.cine?.actif(); k++) { dbg.cine.suivant(); jouer(0.2); }
    ihm.cliquer(dst); jouer(0.4);
    const a = H.recus.find((m) => m.t === 'action')?.a;
    note(a && a.type === 'explo' && a.op === 'marche' && a.id === 'h2' && Math.abs(a.x - dst.x) < 0.01 && Math.abs(a.y - dst.y) < 0.01, 'son clic part vers l’hôte comme une marche d’exploration ');
    note(h2.x === avant[0], 'et rien ne bouge avant la réponse de l’hôte');
    // l'hôte pose la question de la fourche
    const f = S().fourches[0];
    const q = JSON.parse(JSON.stringify(copie)); q.question = { fourche: f.id };
    H.party.toAll({ t: 'etat', L, R: {}, copie: JSON.stringify(q), evs: [] });
    for (let k = 0; k < 400 && !document.querySelector('[data-branche]'); k++) { if (dbg.cine?.actif()) dbg.cine.suivant(); jouer(0.2); await sleep(5); }
    const b = document.querySelector('[data-branche]');
    note(b && b.disabled && /hôte/.test(document.querySelector('.entree-question')?.textContent ?? ''), 'la fourche s’affiche chez l’invité, en lecture seule (« L’hôte choisit… »)');
    // l'hôte a choisi : la question se ferme chez l'invité, l'éboulis se joue
    const ap = JSON.parse(JSON.stringify(copie)); ap.fourches[0].choisi = f.branches[0].id; ap.question = null;
    H.party.toAll({ t: 'etat', L, R: {}, copie: JSON.stringify(ap), evs: [] });
    H.party.toAll({ t: 'chemin', fourche: f.id, branche: f.branches[0].id, evs: [] }); jouer(0.5);
    for (let k = 0; k < 200 && dbg.cine?.actif(); k++) { dbg.cine.suivant(); jouer(0.2); await sleep(5); }
    note(!document.querySelector('[data-branche]') && S().fourches[0].choisi === f.branches[0].id, 'le choix de l’hôte ferme la question chez l’invité');
    return { bilan };
  })()`);
  for (const [ok, label] of r.bilan) { console.log(`${ok ? '✓' : '✗'} ${label}`); if (!ok) code = 1; }
  if (page.errors.length) { console.log('erreurs :', page.errors.join(' | ')); code = 1; }
  await page.close();
}
} finally { srv.stop(); }
process.exit(code);
