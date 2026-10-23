// L'atelier des niveaux : les données d'une salle et ce qu'on leur fait (pur : testé sans écran).
// Une salle a exactement le format des salles de la route (src/entrainement/salles.js, par Fraps) : ce que l'atelier
// enregistre se joue tel quel au terrain d'entraînement (?salle=<id>, une fois le fichier dans content/salles/).
// Tout est en cases de 32 px ; les positions ont un dixième de case de précision.
import { ENNEMIS } from '../entrainement/regles.js';

export const VERSION = 1;
const arrondi = (v) => Math.round(v * 10) / 10;

// Une salle neuve : de l'herbe, les 4 héros à l'ouest, personne en face.
export function vide({ l = 24, h = 18, auteur = '' } = {}) {
  return {
    version: VERSION, id: 'nouvelle-salle', nom: 'Nouvelle salle', idee: '', auteur, sol: 'herbe', l, h,
    terre: [], eau: [], pont: null, bois: [], arbres: [], rochers: [], tentes: [], objets: [], surfaces: [], feux: [], tonneaux: [],
    relief: [], rampes: [],
    departs: { heros: [[3, Math.round(h / 2) - 2], [3, Math.round(h / 2)], [3, Math.round(h / 2) + 2], [4.4, Math.round(h / 2) + 3.6]] },
    ennemis: [],
  };
}

// La zone jouable (le reste est la lisière, dessinée autour)
export const zoneDe = (S) => ({ x0: 1, y0: 2, x1: (S.l ?? 24) - 1, y1: (S.h ?? 18) - 2 });

// Un id lisible depuis un nom : « Le gué des Brumes » → « le-gue-des-brumes »
export const idDe = (nom) => String(nom ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'salle';

// --- Les coins de case (le sol se dessine coin par coin : terre, eau) -----------------------------------------------
// [i0, i1, j0, j1] (bornes comprises) ↔ un ensemble « i,j »
export function coinsDe(rects) {
  const s = new Set();
  for (const [i0, i1, j0, j1] of rects) for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) s.add(`${i},${j}`);
  return s;
}
// Un ensemble de coins → le moins de rectangles possible (par rangées, réunies quand elles se suivent à l'identique)
export function rectsDe(ensemble) {
  const lignes = new Map();
  for (const k of ensemble) { const [i, j] = k.split(',').map(Number); if (!lignes.has(j)) lignes.set(j, []); lignes.get(j).push(i); }
  const runs = [];
  for (const j of [...lignes.keys()].sort((a, b) => a - b)) {
    const is = lignes.get(j).sort((a, b) => a - b);
    let d = is[0];
    for (let k = 1; k <= is.length; k++) if (k === is.length || is[k] !== is[k - 1] + 1) { runs.push([d, is[k - 1], j]); d = is[k]; }
  }
  const ouverts = [], faits = [];
  for (const [i0, i1, j] of runs) {
    const o = ouverts.find((r) => r[0] === i0 && r[1] === i1 && r[3] === j - 1);
    if (o) o[3] = j; else ouverts.push([i0, i1, j, j]);
  }
  for (const r of ouverts) faits.push(r);
  return faits.sort((a, b) => a[2] - b[2] || a[0] - b[0]);
}
// Peindre (ou effacer) des coins autour de (x, y) cases : un pinceau de `taille` (1 : un coin ; 2 : 2 × 2 ; 3 : 3 × 3)
export function pinceau(ensemble, x, y, taille = 1, effacer = false) {
  const n = Math.max(1, taille), i0 = Math.round(x - (n - 1) / 2), j0 = Math.round(y - (n - 1) / 2);
  let change = false;
  for (let i = i0; i < i0 + n; i++) for (let j = j0; j < j0 + n; j++) {
    const k = `${i},${j}`;
    if (effacer ? ensemble.delete(k) : !ensemble.has(k) && ensemble.add(k)) change = true;
  }
  return change;
}
// L'eau d'une salle en deux ensembles (peu profonde, profonde) ↔ sa liste [{ c, profond }]
export function eauxDe(S) {
  const peu = new Set(), profonde = new Set();
  for (const e of S.eau ?? []) for (const k of coinsDe([e.c])) (e.profond ? profonde : peu).add(k);
  for (const k of profonde) peu.delete(k);
  return { peu, profonde };
}
export const eauDepuis = ({ peu, profonde }) => [...rectsDe(peu).map((c) => ({ c })), ...rectsDe(profonde).map((c) => ({ c, profond: true }))];

// --- Les ennemis ------------------------------------------------------------------------------------------------------
// Les ennemis qui ont déjà leurs règles au terrain (regles.js) ; les autres (content/ennemis/) se posent aussi, et
// se jouent pour l'instant avec les règles du plus proche d'entre eux (doublure).
export const JOUABLES = Object.keys(ENNEMIS);
const PREFIXE = { sbire: 's', archer: 'a', brt: 'br', chef: 'chef' };
export function nouvelId(type, ennemis) {
  const p = PREFIXE[type] ?? type;
  for (let n = 1; ; n++) { const id = p === 'chef' && n === 1 ? 'chef' : p === 'br' && n === 1 ? 'br' : `${p}${n}`; if (!ennemis.some((e) => e.id === id)) return id; }
}
// La doublure d'un ennemi sans règles : d'après sa fiche (rang, habitude)
export function doublure(fiche) {
  if (!fiche) return 'sbire';
  if (fiche.rang === 'boss' || fiche.rang === 'chef') return 'chef';
  if (/distance|tir|loin/.test(fiche.habitude?.type ?? '')) return 'archer';
  if (fiche.rang === 'elite') return 'brt';
  return 'sbire';
}
// La salle telle qu'on la fait essayer au terrain : les ennemis sans règles joués par leur doublure (leur vrai type
// gardé dans « look »), les départs des héros dans la zone.
export function pourEssai(S, fiches = {}) {
  const c = JSON.parse(JSON.stringify(S));
  c.ennemis = (c.ennemis ?? []).map((e) => (JOUABLES.includes(e.type) ? e : { ...e, type: doublure(fiches[e.type]), look: e.type }));
  return c;
}

// Une salle de Fraps (departs.ennemis : les 7 du kit, par id) → la liste d'ennemis de l'atelier
export function normaliser(S0) {
  const S = { ...vide({ l: S0.l ?? 24, h: S0.h ?? 18 }), ...JSON.parse(JSON.stringify(S0)) };
  S.l = S0.l ?? 24; S.h = S0.h ?? 18;
  if (!S.ennemis?.length && S.departs?.ennemis) {
    const TYPE = { s: 'sbire', a: 'archer', br: 'brt', chef: 'chef' };
    S.ennemis = Object.entries(S.departs.ennemis).map(([id, [x, y]]) => ({ id, type: TYPE[id] ?? TYPE[id[0]] ?? 'sbire', x, y }));
  }
  S.departs = { heros: (S.departs?.heros ?? vide({ h: S.h }).departs.heros).map((p) => [...p]) };
  for (const k of ['terre', 'eau', 'bois', 'arbres', 'rochers', 'tentes', 'objets', 'surfaces', 'feux', 'tonneaux', 'relief', 'rampes', 'ennemis']) S[k] ??= [];
  S.version = VERSION;
  return S;
}

// Ce qu'on enregistre : la salle, sans les champs vides (lisible dans un fichier)
export function exporter(S) {
  const o = {};
  for (const [k, v] of Object.entries(S)) {
    if (v == null || (Array.isArray(v) && !v.length) || v === '') continue;
    o[k] = v;
  }
  o.version = VERSION; o.id = S.id; o.nom = S.nom; o.l = S.l; o.h = S.h; o.sol = S.sol;
  return o;
}

// --- Ce qui est où : trouver l'élément sous un point, le déplacer --------------------------------------------------
// Chaque élément est désigné par { k, i } (sa liste, son rang), ou { k: 'heros', i } pour un départ.
const dans = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
export function sous(S, x, y) {
  const pres = (px, py, d = 0.6) => Math.hypot(px - x, py - y) <= d;
  for (let i = 0; i < (S.departs?.heros ?? []).length; i++) { const [hx, hy] = S.departs.heros[i]; if (pres(hx, hy - 0.5, 0.8)) return { k: 'heros', i }; }
  for (let i = S.ennemis.length - 1; i >= 0; i--) if (pres(S.ennemis[i].x, S.ennemis[i].y - 0.5, 0.8)) return { k: 'ennemis', i };
  for (const k of ['tonneaux', 'rochers', 'feux']) for (let i = S[k].length - 1; i >= 0; i--) if (pres(S[k][i][0], S[k][i][1] - 0.3)) return { k, i };
  for (let i = S.arbres.length - 1; i >= 0; i--) { const [ax, ay] = S.arbres[i]; if (x > ax - 1 && x < ax + 1 && y > ay - 3.2 && y < ay + 0.3) return { k: 'arbres', i }; }
  for (let i = S.tentes.length - 1; i >= 0; i--) { const t = S.tentes[i]; if (dans({ x0: t.x, x1: t.x + 5, y0: t.y, y1: t.y + 5 }, x, y)) return { k: 'tentes', i }; }
  for (let i = S.surfaces.length - 1; i >= 0; i--) if (pres(S.surfaces[i].x, S.surfaces[i].y, S.surfaces[i].r)) return { k: 'surfaces', i };
  for (let i = S.objets.length - 1; i >= 0; i--) {
    const o = S.objets[i], d = o.dessin;
    if (d && dans({ x0: d[4], x1: d[4] + d[2], y0: d[5], y1: d[5] + d[3] }, x, y)) return { k: 'objets', i };
  }
  for (let i = S.bois.length - 1; i >= 0; i--) if (dans(S.bois[i], x, y)) return { k: 'bois', i };
  if (S.pont && dans(S.pont, x, y)) return { k: 'pont', i: 0 };
  for (let i = S.rampes.length - 1; i >= 0; i--) { const r = S.rampes[i], p = S.relief[r.plateau]; if (p && x >= r.x0 && x <= r.x1 && y >= p.y1 - 0.5 && y <= p.y1 + 2.5 * p.haut) return { k: 'rampes', i }; }
  for (let i = S.relief.length - 1; i >= 0; i--) if (dans(S.relief[i], x, y)) return { k: 'relief', i };
  return null;
}
// Déplacer un élément de (dx, dy) cases
export function deplacer(S, sel, dx, dy) {
  const { k, i } = sel;
  const r = (v) => arrondi(v);
  if (k === 'heros') { const p = S.departs.heros[i]; p[0] = r(p[0] + dx); p[1] = r(p[1] + dy); return; }
  if (k === 'ennemis' || k === 'surfaces') { const e = S[k][i]; e.x = r(e.x + dx); e.y = r(e.y + dy); return; }
  if (['tonneaux', 'rochers', 'feux', 'arbres'].includes(k)) {
    const p = S[k][i], [ox, oy] = p; p[0] = r(ox + dx); p[1] = r(oy + dy);
    if (k === 'feux') { const s = S.surfaces.find((q) => q.t === 'feu' && Math.abs(q.x - ox) < 0.05 && Math.abs(q.y - oy) < 0.05); if (s) { s.x = p[0]; s.y = p[1]; } }
    return;
  }
  if (k === 'tentes') { const t = S.tentes[i]; t.x = r(t.x + dx); t.y = r(t.y + dy); return; }
  const rect = (o) => { o.x0 = r(o.x0 + dx); o.x1 = r(o.x1 + dx); o.y0 = r(o.y0 + dy); o.y1 = r(o.y1 + dy); };
  if (k === 'bois' || k === 'relief') { rect(S[k][i]); return; }
  if (k === 'pont') { rect(S.pont); return; }
  if (k === 'rampes') { const q = S.rampes[i]; q.x0 = r(q.x0 + dx); q.x1 = r(q.x1 + dx); return; }
  if (k === 'objets') {
    const o = S.objets[i];
    if (o.forme.r != null) { o.forme.x = r(o.forme.x + dx); o.forme.y = r(o.forme.y + dy); } else rect(o.forme);
    if (o.dessin) { o.dessin[4] = r(o.dessin[4] + dx); o.dessin[5] = r(o.dessin[5] + dy); }
  }
}
// Retirer un élément
export function retirer(S, sel) {
  const { k, i } = sel;
  if (k === 'heros') return false;                                   // (les 4 départs restent : on les déplace)
  if (k === 'pont') { S.pont = null; return true; }
  if (k === 'feux') { const [fx, fy] = S.feux[i]; S.surfaces = S.surfaces.filter((q) => !(q.t === 'feu' && Math.abs(q.x - fx) < 0.05 && Math.abs(q.y - fy) < 0.05)); }
  if (k === 'relief') { S.rampes = S.rampes.filter((q) => q.plateau !== i).map((q) => ({ ...q, plateau: q.plateau > i ? q.plateau - 1 : q.plateau })); }
  S[k].splice(i, 1);
  return true;
}

// --- Ce qui est à revoir avant de l'essayer ---------------------------------------------------------------------------
export function verifier(S, obstacles = []) {
  const Z = zoneDe(S), notes = [];
  const horsZone = (x, y) => x < Z.x0 || x > Z.x1 || y < Z.y0 || y > Z.y1;
  const bloque = (x, y) => obstacles.some((o) => (o.r != null ? Math.hypot(o.x - x, o.y - y) < o.r : x > o.x0 && x < o.x1 && y > o.y0 && y < o.y1) && (o.marche || o.eau || o.fosse));
  if (!S.nom?.trim()) notes.push('La salle n’a pas de nom.');
  if (!S.ennemis.length) notes.push('Personne en face : pose au moins un ennemi.');
  S.departs.heros.forEach(([x, y], k) => { if (horsZone(x, y)) notes.push(`Le départ du héros ${k + 1} est hors de la zone jouable.`); else if (bloque(x, y)) notes.push(`Le départ du héros ${k + 1} est dans un obstacle.`); });
  for (const e of S.ennemis) { if (horsZone(e.x, e.y)) notes.push(`${e.id} est hors de la zone jouable.`); else if (bloque(e.x, e.y)) notes.push(`${e.id} est dans un obstacle.`); }
  if (S.ennemis.some((e) => !JOUABLES.includes(e.type))) notes.push('Des ennemis n’ont pas encore leurs règles : au terrain, ils sont joués par une doublure (sbire, archer, brute ou chef).');
  return notes;
}
