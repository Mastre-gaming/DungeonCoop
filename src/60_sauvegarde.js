// Sauvegarder et reprendre (Miro « Sauvegarder et reprendre » : une run de 3 h, on reprend où on s'est arrêté, peu
// importe qui héberge).
// Chaque joueur garde chez lui la dernière copie de la run (l'hôte la sienne, les amis celle que l'hôte leur diffuse) :
// le soir où quelqu'un d'autre héberge, sa copie suffit. Ce qui est gardé : une run en cours (une salle ou un choix) ;
// une run finie, abandonnée ou rentrée au camp n'est plus gardée. Une seule sauvegarde ; une nouvelle run met l'ancienne
// de côté (une copie), pour qu'on ne perde pas trois heures d'un clic.
// À la reprise, les héros retrouvent leurs joueurs par le nom (voir `reaffecter` dans 57_run.js).
import './sauvegarde.css';
import { creerRun } from './57_run.js';

export const name = 'sauvegarde';
export const always = true;

export const CLE = 'dungeoncoop:run-sauvee';
export const CLE_PRECEDENTE = 'dungeoncoop:run-precedente';
export const VERSION = 1;
const PHASES = ['salle', 'choix'];

// --- Le format (pur) ---------------------------------------------------------------------------------------------------
export const emballer = (instantane, quand = Date.now()) => ({ v: VERSION, quand, run: instantane });

// Un texte rangé : une sauvegarde utilisable, ou pourquoi pas (jamais d'exception : le stockage peut contenir n'importe quoi).
export function lire(texte) {
  let s;
  try { s = JSON.parse(texte); } catch { return { ok: false, raison: 'illisible' }; }
  if (!s || typeof s !== 'object') return { ok: false, raison: 'illisible' };
  if (s.v !== VERSION) return { ok: false, raison: 'autre-version' };
  const r = s.run;
  if (!r || !PHASES.includes(r.phase) || !Array.isArray(r.heros) || !r.heros.length || !Array.isArray(r.joueurs)
    || !Number.isInteger(r.etape) || !Array.isArray(r.gabarit) || r.etape < 0 || r.etape >= r.gabarit.length
    || !r.heros.every((h) => h && typeof h.id === 'string' && Number.isFinite(h.pv) && Number.isFinite(h.pvMax))) return { ok: false, raison: 'incomplete' };
  return { ok: true, sauvegarde: s };
}

export function depuis(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return h < 48 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
}

// Une ligne pour le panneau : « Salle 4/9 · Repos · 3 joueurs · il y a 2 h ».
export function resumer(s, maintenant = Date.now()) {
  const r = s.run, n = r.joueurs.length;
  const salle = r.phase === 'salle' ? r.salle?.nom ?? '' : 'le groupe choisit';
  return [`Salle ${r.etape + 1}/${r.gabarit.length}`, salle, `${n} joueur${n > 1 ? 's' : ''}`, depuis(Math.max(0, maintenant - s.quand))].filter(Boolean).join(' · ');
}

// --- Le rangement : le stockage du navigateur, ou une mémoire pour ?test ------------------------------------------------
export function creerStockage({ memoire = false } = {}) {
  const m = new Map();
  if (memoire) return { lire: (k) => m.get(k) ?? null, ecrire: (k, v) => { m.set(k, v); return true; }, effacer: (k) => { m.delete(k); } };
  return {
    lire: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    ecrire: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },   // (plein, bloqué, navigation privée)
    effacer: (k) => { try { localStorage.removeItem(k); } catch { /* rien à faire */ } },
  };
}

export function creerSauvegarde({ stockage = creerStockage(), maintenant = () => Date.now() } = {}) {
  const api = {
    // La sauvegarde utilisable, ou null.
    get() { const t = stockage.lire(CLE); if (t == null) return null; const l = lire(t); return l.ok ? l.sauvegarde : null; },
    get existe() { return !!api.get(); },
    // Une sauvegarde qu'on ne sait pas lire (autre version, abîmée) : on le dit au lieu de la jeter en silence.
    get probleme() { const t = stockage.lire(CLE); return t == null ? null : (lire(t).raison ?? null); },
    ecrire(run) { return stockage.ecrire(CLE, JSON.stringify(emballer(run.instantane(), maintenant()))); },
    effacer() { stockage.effacer(CLE); },
    // Une nouvelle run commence : l'ancienne sauvegarde passe de côté (une seule copie).
    mettreDeCote() { const t = stockage.lire(CLE); if (t != null) stockage.ecrire(CLE_PRECEDENTE, t); },
    precedente() { const t = stockage.lire(CLE_PRECEDENTE); if (t == null) return null; const l = lire(t); return l.ok ? l.sauvegarde : null; },
    restaurerPrecedente() { const t = stockage.lire(CLE_PRECEDENTE); if (t == null) return false; stockage.ecrire(CLE, t); return true; },
    // Ce que dit le bus : une run bouge. En cours : on la garde ; finie : on l'oublie.
    surRun(nomEvenement, run) {
      if (!run) return;
      if (nomEvenement === 'run:depart') api.mettreDeCote();
      if (PHASES.includes(run.phase)) api.ecrire(run); else api.effacer();
    },
  };
  return api;
}

// --- Le panneau « Reprendre » -------------------------------------------------------------------------------------------
function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

let sauv = null, panneau = null, arrets = [], chrono = 0, confirme = 0, options = {};

// Qui peut reprendre : celui qui joue seul ou qui héberge ; pas un ami (il regarde la run de l'hôte), pas pendant une run.
function peutReprendre() {
  const p = options.party?.(), r = options.run?.();
  if (options.visite || (r?.courante && r.courante.phase !== 'camp')) return false;
  return !(p?.active && !p.hosting);
}

function dessiner() {
  if (!panneau || !sauv) return;
  const s = sauv.get();
  if (!s) {
    panneau.hidden = !(sauv.probleme && peutReprendre());
    if (!panneau.hidden) panneau.replaceChildren(el('div', { class: 'ligne' }, 'Une sauvegarde de run existe mais ne peut pas être lue : elle est gardée telle quelle.'));
    return;
  }
  panneau.hidden = !peutReprendre();
  if (panneau.hidden) return;
  panneau.replaceChildren(
    el('div', { class: 'titre' }, 'Une run t’attend'), el('div', { class: 'ligne' }, resumer(s)),
    el('div', { class: 'boutons' },
      el('button', { type: 'button', class: 'principal', onclick: reprendre }, 'Reprendre'),
      el('button', { type: 'button', onclick: oublier }, confirme > 0 ? 'Sûr ? Elle sera perdue' : 'Oublier')));
}

export function reprendre() {
  const s = sauv?.get(), r = options.run?.();
  if (!s || !r || !peutReprendre()) return false;
  r.reprendre(s.run, options.joueurs?.());
  dessiner();
  return true;
}
function oublier() {
  if (confirme > 0) { confirme = 0; sauv.effacer(); } else confirme = 4;   // un second clic dans les 4 s : on perd vraiment la run
  dessiner();
}

export function init(g, o = {}) {
  options = o;
  sauv = creerSauvegarde({ stockage: creerStockage({ memoire: !!o.horsLigne }) });
  if (!o.visite) { panneau = el('div', { id: 'run-reprise', hidden: true }); document.body.append(panneau); }
  arrets = [g.bus.on('*', (n, d) => { if (n.startsWith('run:') && n !== 'run:photo') { sauv.surRun(n, d?.run); dessiner(); } })];
  chrono = 0;
  setTimeout(dessiner, 0);
  return api;
}
export function update(dt) {
  if (confirme > 0) { confirme -= dt; if (confirme <= 0) { confirme = 0; dessiner(); } }
  chrono += dt; if (chrono >= 1) { chrono = 0; dessiner(); }   // (le groupe change, le temps passe)
}
export function dispose() { arrets.forEach((f) => f()); arrets = []; panneau?.remove(); panneau = sauv = null; }
export const api = { get sauvegarde() { return sauv; }, reprendre, get panneau() { return panneau; } };

// --- Les vérifications (?test) ------------------------------------------------------------------------------------------
export async function selfTest(t) {
  const HEROS = ['Aldric', 'Brune', 'Cendre', 'Dune'];
  const J = (...noms) => noms.map((n) => ({ id: n.toLowerCase(), nom: n }));
  const jusquAuChoix = (joueurs) => { const r = creerRun({ heros: HEROS, joueurs }); r.partir(); r.finirSalle('victoire', { Aldric: { pv: 7, potions: 1, etats: ['poison'] } }); r.finirSalle('victoire', { Brune: { pv: 0 } }); return r; };
  const ids = (r) => r.options.map((o) => o.id);
  const qui = (r) => r.etat.heros.map((h) => h.joueur);
  const rejouer = (copie, joueurs, evenement) => creerRun({ gabarit: copie.gabarit, evenement }).restaurer(copie).reaffecter(joueurs);

  t.group('la sauvegarde : le format');
  const r0 = jusquAuChoix(J('Hôte', 'Ana', 'Ben'));
  const texte = JSON.stringify(emballer(r0.instantane(), 1000));
  const l = lire(texte);
  t.ok(l.ok && l.sauvegarde.run.phase === 'choix' && l.sauvegarde.run.heros[0].pv === 7, 'une sauvegarde valide se relit');
  t.ok(texte.length < 4000, `la sauvegarde est petite (${texte.length} octets)`);
  t.eq(lire('pas du json').raison, 'illisible', 'du texte abîmé : refusé sans exception');
  t.eq([lire('null').raison, lire('42').raison, lire('{}').raison], ['illisible', 'illisible', 'autre-version'], 'rien, un nombre, un objet vide : refusés');
  t.eq(lire(JSON.stringify({ v: 2, run: r0.instantane() })).raison, 'autre-version', 'une autre version du format : refusée, on le dit');
  const casse = (f) => { const c = JSON.parse(texte); f(c.run); return lire(JSON.stringify(c)).raison; };
  t.eq([casse((r) => { r.phase = 'camp'; }), casse((r) => { r.phase = 'bilan'; }), casse((r) => { r.heros = []; }), casse((r) => { r.etape = 99; }), casse((r) => { delete r.gabarit; }), casse((r) => { r.heros[0].pv = 'x'; })],
    ['incomplete', 'incomplete', 'incomplete', 'incomplete', 'incomplete', 'incomplete'], 'une run finie, sans héros, hors tracé, sans tracé ou aux PV abîmés : refusée');
  t.eq([depuis(10000), depuis(5 * 60000), depuis(3 * 3600000), depuis(72 * 3600000)], ['à l’instant', 'il y a 5 min', 'il y a 3 h', 'il y a 3 j'], 'le temps passé se dit en clair');
  t.eq(resumer(l.sauvegarde, 1000 + 2 * 3600000), 'Salle 3/9 · le groupe choisit · 3 joueurs · il y a 2 h', 'le panneau dit où on en est');

  t.group('la sauvegarde : quand on garde');
  const S = creerSauvegarde({ stockage: creerStockage({ memoire: true }), maintenant: () => 5000 });
  t.ok(!S.existe && S.probleme === null, 'au début, rien');
  const r = creerRun({ heros: HEROS, joueurs: J('Hôte', 'Ana'), evenement: (n, d) => S.surRun(n, d.run) });
  r.partir();
  t.eq([S.existe, S.get().run.salle.id], [true, '1a'], 'la run part : elle est gardée');
  r.finirSalle('victoire'); r.finirSalle('victoire');
  t.eq([S.get().run.phase, S.get().run.options.length], ['choix', 2], 'au choix : gardée avec ses deux options');
  r.choisir(0); r.rapporter({ Aldric: { pv: 4 } });
  t.eq(S.get().run.heros[0].pv, 4, 'chaque changement d’état est gardé');
  r.finirSalle('abandon');
  t.ok(!S.existe, 'abandon : la run est finie, plus de sauvegarde');
  r.rentrer(); r.partir();
  t.ok(S.existe && S.precedente() === null, 'une nouvelle run : gardée (et rien à mettre de côté)');
  r.finirSalle('victoire'); r.finirSalle('victoire'); r.choisir(1);
  t.eq(S.get().run.salle.id, '3b', 'on la garde jusqu’au bout');

  t.group('la sauvegarde : l’XP et le niveau suivent la run');
  const SX = creerSauvegarde({ stockage: creerStockage({ memoire: true }) });
  const rx = creerRun({ heros: HEROS, joueurs: J('Hôte'), evenement: (n, d) => SX.surRun(n, d.run) });
  t.eq(rx.progression, { xp: 0, niveau: 1 }, 'une run neuve : 0 XP, niveau 1');
  rx.partir(); rx.finirSalle('victoire', null, { xp: 130, niveau: 2 });
  t.eq(SX.get().run.progression, { xp: 130, niveau: 2 }, 'une salle gagnée : l’XP et le niveau sont dans la sauvegarde');
  t.eq(rejouer(SX.get().run, J('Hôte')).progression, { xp: 130, niveau: 2 }, 'reprendre la run : le groupe retrouve son niveau');
  rx.finirSalle('victoire', null, { xp: 50, niveau: 1 });
  t.eq(rx.progression, { xp: 130, niveau: 2 }, 'l’XP ne recule jamais');
  rx.finirSalle('defaite', null, { xp: 900, niveau: 6 });
  t.eq(rx.progression, { xp: 130, niveau: 2 }, 'une salle perdue ne rapporte rien');
  const ancienne = JSON.parse(JSON.stringify(SX.get().run)); delete ancienne.progression;
  t.eq(rejouer(ancienne, J('Hôte')).progression, { xp: 0, niveau: 1 }, 'une ancienne sauvegarde sans XP : niveau 1');
  const neuve = creerRun({ heros: HEROS, joueurs: J('Hôte') }); neuve.partir();
  t.eq(neuve.progression, { xp: 0, niveau: 1 }, 'une nouvelle run (l’aventure relancée) repart du niveau 1');

  t.group('la sauvegarde : une nouvelle run ne perd pas l’ancienne');
  const S3 = creerSauvegarde({ stockage: creerStockage({ memoire: true }) });
  const a = creerRun({ heros: HEROS, joueurs: J('Hôte'), evenement: (n, d) => S3.surRun(n, d.run) });
  a.partir(); a.finirSalle('victoire'); a.finirSalle('victoire'); a.choisir(1);
  const b = creerRun({ heros: HEROS, joueurs: J('Hôte'), evenement: (n, d) => S3.surRun(n, d.run) });
  b.partir();
  t.eq([S3.get().run.salle.id, S3.precedente()?.run.salle.id], ['1a', '3b'], 'la nouvelle run est gardée, l’ancienne passe de côté');
  t.ok(S3.restaurerPrecedente() && S3.get().run.salle.id === '3b', 'on peut la retrouver');
  const plein = creerSauvegarde({ stockage: { lire: () => null, ecrire: () => false, effacer: () => {} } });
  t.ok(plein.ecrire(a) === false, 'un stockage plein ou bloqué : l’écriture échoue sans exception');
  const abime = creerSauvegarde({ stockage: { lire: () => '{"v":1,"run":{"phase":"salle"}}', ecrire: () => true, effacer: () => {} } });
  t.ok(!abime.get() && abime.probleme === 'incomplete', 'une sauvegarde abîmée : ignorée, et on sait pourquoi');

  t.group('reprendre : le même groupe');
  let r1 = jusquAuChoix(J('Hôte', 'Ana', 'Ben'));
  let copie = lire(JSON.stringify(emballer(r1.instantane()))).sauvegarde.run;
  let vus = [];
  let r2 = rejouer(copie, J('Hôte', 'Ana', 'Ben'), (n) => vus.push(n));
  t.eq([r2.phase, ids(r2), qui(r2)], ['choix', ['3a', '3b'], qui(r1)], 'on reprend au choix, chacun avec ses héros');
  t.eq(r2.etat.heros.map((h) => [h.pv, h.tombe, h.potions, h.etats]), r1.etat.heros.map((h) => [h.pv, h.tombe, h.potions, h.etats]), 'l’état des héros est intact (PV, tombé, potions, états)');
  r2.annoncer();
  t.eq(vus, ['run:reprise', 'run:choix'], 'la reprise est annoncée, puis le vote en cours repart');
  r2.choisir(1); r2.finirSalle('victoire');
  t.eq([r2.salle.id, r2.etat.heros[1].pv], ['4a', 10], 'la run continue normalement (le repos soigne : Brune, tombée, se relève)');

  t.group('reprendre : un autre soir, un autre hôte');
  r1 = jusquAuChoix(J('Hôte', 'Ana', 'Ben'));
  copie = lire(JSON.stringify(emballer(r1.instantane()))).sauvegarde.run;
  // Ce soir, Ana héberge ; Ben est là ; l'ancien hôte est absent.
  r2 = rejouer(copie, [{ id: 'n1', nom: 'Ana' }, { id: 'n2', nom: 'Ben' }]);
  t.eq(r2.etat.joueurs.map((j) => j.nom), ['Ana', 'Ben'], 'Ana héberge, Ben est là');
  t.eq(qui(r2), ['n1', 'n1', 'n2', 'n2'], 'Brune (Ana) et Cendre (Ben) retrouvent leurs joueurs ; les héros de l’absent passent à l’hôte, puis Ben prend sa part');
  t.ok(r2.etat.heros.filter((h) => h.ancien === 'Hôte').length === 2 && r2.etat.heros.every((h) => h.joueur), 'les héros de l’absent restent à son nom, et aucun héros n’est sans joueur');
  t.eq(r2.etat.heros[0].pv, 7, 'le héros de l’absent garde son état');
  r2.rejoindre({ id: 'n3', nom: 'Hôte' });
  t.ok(r2.heros('n3').map((h) => h.id).join() === 'Aldric,Dune' && r2.etat.heros.every((h) => h.ancien !== 'Hôte'), 'l’ancien hôte arrive en cours de soirée : il retrouve ses héros');
  t.eq(r2.etat.joueurs.length, 3, 'et le groupe est de nouveau à trois');
  r2 = rejouer(copie, [{ id: 'x', nom: 'Cléo' }]);
  t.ok(qui(r2).every((j) => j === 'x'), 'seul ce soir, quelqu’un d’autre : il mène les quatre');
  r2 = rejouer(copie, [{ id: 'p', nom: 'Dana' }, { id: 'q', nom: 'Eli' }]);
  t.ok(r2.heros('p').length === 2 && r2.heros('q').length === 2, 'deux inconnus : chacun a sa part');
  const r3 = creerRun({ heros: HEROS, joueurs: J('Hôte') }); r3.partir(); r3.rapporter({ Aldric: { pv: 3 } });
  vus = [];
  const r4 = rejouer(JSON.parse(JSON.stringify(r3.instantane())), J('Hôte'), (n) => vus.push(n)); r4.annoncer();
  t.eq([r4.salle.id, r4.etat.heros[0].pv, vus], ['1a', 3, ['run:reprise', 'run:salle']], 'reprise en pleine salle : la salle est annoncée avec ses héros');
  r4.finirSalle('defaite');
  t.eq([r4.salle.id, r4.etat.heros[0].pv], ['1a', 20], 'et le réveil après une défaite fonctionne aussi après une reprise');
}
