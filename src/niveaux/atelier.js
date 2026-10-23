// L'atelier des niveaux (idée de DonBabaa et Paolitus, 23 oct) : on dessine une salle à la souris, avec ce que le jeu a
// déjà (le sol, l'eau, les bois, les rochers, les pièces de la planche des décors, les surfaces, le relief, les héros et
// les ennemis), on l'essaie au terrain d'entraînement, et on l'exporte (le fichier de la salle, et son plan en image).
// La salle a le format des salles de la route (src/entrainement/salles.js) : ce que l'atelier dessine, c'est ce qu'on
// jouera. Un fichier exporté, posé dans content/salles/, s'ajoute tout seul à la liste du terrain.
//
// L'écran : en haut, la salle (nom, fichiers, essai) ; à gauche, les outils par famille ; au milieu, la salle dessinée
// comme au terrain ; à droite, ce qui est choisi, la salle elle-même et ce qui est à revoir.
import { construireDepuis, SALLES, CLE_ESSAI, PLANCHES_SALLES, DECORS_SALLES, SOLS, TERRAINS, MURS, HAUT_MUR } from '../entrainement/salles.js';
import { ENNEMIS } from '../entrainement/regles.js';
import { chargerImages } from '../02_images.js';
import * as M from './modele.js';

export const name = 'atelier';
export const always = true;

const T = 32;
const FICHES = Object.fromEntries(Object.values(import.meta.glob('../../content/ennemis/*.json', { eager: true, import: 'default' })).map((f) => [f.id, f]));
const KIT = { sbire: 'sbire', archer: 'archer', brt: 'brute-ennemie', chef: 'chef' };   // le type → sa planche au terrain
const HEROS_KIT = ['brute', 'mage', 'voleur', 'gardien'];
const CLE_SALLES = 'dungeoncoop:atelier-salles', CLE_COURANTE = 'dungeoncoop:atelier-courante';

// Des pièces de la planche des décors toutes prêtes (celles du camp des pillards, salles.js) : [sx, sy, w, h] en cases,
// et la forme qui bloque, relative au coin de la pièce (un rectangle, ou un rond { x, y, r }).
export const PIECES = [
  { id: 'charrette', nom: 'Charrette', d: [6, 44, 4, 3], f: { x0: 0.3, x1: 3.7, y0: 0.9, y1: 2.9 } },
  { id: 'carriole', nom: 'Carriole', d: [7, 22, 2, 2], f: { x0: 0.2, x1: 1.7, y0: 0.9, y1: 1.8 } },
  { id: 'foin', nom: 'Foin', d: [4, 21, 2, 2], f: { x0: 0.1, x1: 1.9, y0: 0.9, y1: 2.1 } },
  { id: 'tente-cote', nom: 'Tente de côté', d: [12, 55, 4, 4], f: { x0: 0.3, x1: 3.3, y0: 0.8, y1: 3.8 }, vue: true },
  { id: 'pilori', nom: 'Pilori', d: [2, 44, 2, 3], f: { x: 1.0, y: 2.2, r: 0.5 } },
  { id: 'marmite', nom: 'Marmite', d: [11, 49, 1, 1], f: { x: 0.5, y: 0.7, r: 0.35 } },
  { id: 'ratelier', nom: 'Râtelier d’armes', d: [0, 47, 2, 1], f: { x0: 0.1, x1: 1.9, y0: 0.4, y1: 1.0 } },
];

// Les planches où l'on prend une pièce (un tampon) : les décors médiévaux, et tout le château et le donjon (LPC Base Assets)
export const NOMS_PLANCHES = { deco: 'Les décors médiévaux', ...Object.fromEntries(Object.entries(DECORS_SALLES).map(([id, d]) => [id, d.nom])) };
// Les outils, par famille. sorte : pinceau (des coins de sol), rect (un rectangle à tirer), point (un clic), choisir, gomme.
export const OUTILS = [
  { famille: 'Main', liste: [
    { id: 'choisir', nom: 'Choisir et déplacer', sorte: 'choisir', touche: 'V' },
    { id: 'gomme', nom: 'Gomme', sorte: 'gomme', touche: 'X' }] },
  { famille: 'Sol', liste: [
    { id: 'terre', nom: 'Terre battue', sorte: 'pinceau', calque: 'terre' },
    { id: 'terre-x', nom: 'Effacer la terre', sorte: 'pinceau', calque: 'terre', effacer: true },
    { id: 'eau', nom: 'Eau peu profonde', sorte: 'pinceau', calque: 'peu' },
    { id: 'eau-profonde', nom: 'Eau profonde', sorte: 'pinceau', calque: 'profonde' },
    { id: 'eau-x', nom: 'Effacer l’eau', sorte: 'pinceau', calque: 'eaux', effacer: true },
    ...Object.entries(TERRAINS).map(([t, d]) => ({ id: `terrain-${t}`, nom: d.bloque ? `${d.nom} (bloque)` : d.nom, sorte: 'pinceau', calque: `terrain:${t}` })),
    { id: 'terrain-x', nom: 'Effacer pavés, lave, roche, fosse', sorte: 'pinceau', calque: 'terrains', effacer: true },
    { id: 'pont', nom: 'Pont', sorte: 'rect' }] },
  { famille: 'Nature', liste: [
    { id: 'arbre', nom: 'Arbre', sorte: 'point' },
    { id: 'bois', nom: 'Bois (un rectangle d’arbres)', sorte: 'rect' },
    { id: 'rocher', nom: 'Rocher', sorte: 'point' }] },
  { famille: 'Objets', liste: [
    { id: 'tonneau', nom: 'Tonneau (explose)', sorte: 'point' },
    { id: 'feu', nom: 'Feu de camp', sorte: 'point' },
    { id: 'tente', nom: 'Tente', sorte: 'point' },
    ...PIECES.map((p) => ({ id: `piece-${p.id}`, nom: p.nom, sorte: 'point', piece: p })),
    { id: 'tampon', nom: 'Une pièce de n’importe quelle planche…', sorte: 'point', planche: true }] },
  { famille: 'Château et donjon', liste: [
    ...Object.entries(MURS).map(([m, d]) => ({ id: `mur-${m}`, nom: d.nom, sorte: 'rect', mur: m })),
    { id: 'tampon-chateau', nom: 'Une pièce du château…', sorte: 'point', planche: true, defaut: 'murs-chateau' },
    { id: 'tampon-donjon', nom: 'Une pièce du donjon…', sorte: 'point', planche: true, defaut: 'donjon' },
    { id: 'tampon-interieur', nom: 'Une pièce de l’intérieur…', sorte: 'point', planche: true, defaut: 'interieur' }] },
  { famille: 'Surfaces', liste: ['eau', 'huile', 'feu', 'glace'].map((t) => ({ id: `surface-${t}`, nom: { eau: 'Flaque d’eau', huile: 'Huile', feu: 'Feu', glace: 'Glace' }[t], sorte: 'point', surface: t })) },
  { famille: 'Relief', liste: [
    { id: 'plateau-1', nom: 'Plateau de 3 m', sorte: 'rect', haut: 1 },
    { id: 'plateau-2', nom: 'Plateau de 6 m', sorte: 'rect', haut: 2 },
    { id: 'rampe', nom: 'Rampe (au bord sud d’un plateau)', sorte: 'point' },
    { id: 'echelle', nom: 'Échelle (au bord sud d’un plateau)', sorte: 'point' }] },
  { famille: 'Héros', liste: [0, 1, 2, 3].map((k) => ({ id: `heros-${k}`, nom: `Départ du héros ${k + 1}`, sorte: 'point', heros: k })) },
  { famille: 'Ennemis', liste: [
    ...Object.keys(ENNEMIS).map((t) => ({ id: `ennemi-${t}`, nom: ENNEMIS[t].nom, sorte: 'point', ennemi: t, jouable: true })),
    ...Object.values(FICHES).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map((f) => ({ id: `ennemi-${f.id}`, nom: f.nom, sorte: 'point', ennemi: f.id, rang: f.rang }))] },
];
const OUTIL = Object.fromEntries(OUTILS.flatMap((f) => f.liste).map((o) => [o.id, o]));

// --- L'état --------------------------------------------------------------------------------------------------------------
let game, images = null, canvas, g, dom = {}, naviguer = (url) => { location.href = url; };
const ui = { outil: 'choisir', sel: null, zoom: 2, aimant: false, grille: true, obstacles: false, taille: 1, rayon: 1, piece: [0, 47, 2, 1], planche: 'deco', aplat: false, pieces: { deco: [0, 47, 2, 1] },
  souris: null, appui: null, rect: null, bouge: false, sols: null, avant: [], apres: [], sale: true, solCle: '', solImg: null, notes: [] };
let S = M.vide();

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'dataset') Object.assign(n.dataset, v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const pas = () => (ui.aimant ? 0.5 : 0.1);
const caler = (v) => Math.round(v / pas()) * pas();
const r1 = (v) => Math.round(v * 10) / 10;

// --- L'historique (annuler, rétablir) et la sauvegarde dans ce navigateur -----------------------------------------------
function retenir() { ui.avant.push(JSON.stringify(S)); if (ui.avant.length > 120) ui.avant.shift(); ui.apres = []; }
function annuler() { if (!ui.avant.length) return false; ui.apres.push(JSON.stringify(S)); S = JSON.parse(ui.avant.pop()); apresChangement(false); return true; }
function retablir() { if (!ui.apres.length) return false; ui.avant.push(JSON.stringify(S)); S = JSON.parse(ui.apres.pop()); apresChangement(false); return true; }
function lireSalles() { try { return JSON.parse(localStorage.getItem(CLE_SALLES)) ?? {}; } catch { return {}; } }
function garder() {
  try { const t = lireSalles(); t[S.id] = S; localStorage.setItem(CLE_SALLES, JSON.stringify(t)); localStorage.setItem(CLE_COURANTE, S.id); } catch {}
}
function apresChangement(garde = true) {
  ui.sols = null; ui.sale = true;
  if (ui.sel && !existe(ui.sel)) ui.sel = null;
  if (garde) garder();
  dessinerPanneaux();
}
const existe = (sel) => (sel.k === 'heros' ? !!S.departs.heros[sel.i] : sel.k === 'pont' ? !!S.pont : !!S[sel.k]?.[sel.i]);
function charger(salle, { garde = true } = {}) {
  S = M.normaliser(salle); ui.sel = null; ui.avant = []; ui.apres = [];
  ui.zoom = zoomQuiTient(); dimensionner(); apresChangement(garde);
}
// Le plus grand zoom entier (×1 à ×4) où toute la salle tient dans la vue
function zoomQuiTient() {
  const r = dom.vue?.getBoundingClientRect();
  if (!r?.width) return ui.zoom;
  return Math.max(1, Math.min(4, Math.floor(Math.min((r.width - 8) / (S.l * T), (r.height - 8) / (S.h * T)))));
}

// --- Les sols : la terre et l'eau, peintes coin par coin (le temps d'un trait), puis rangées en rectangles --------------
function sols() {
  if (!ui.sols) {
    const e = M.eauxDe(S);
    ui.sols = { terre: M.coinsDe(S.terre), peu: e.peu, profonde: e.profonde,
      terrains: Object.fromEntries(Object.keys(TERRAINS).map((t) => [t, M.coinsDe(S.terrains.filter((x) => x.t === t).map((x) => x.c))])) };
  }
  return ui.sols;
}
function peindre(o, x, y) {
  const s = sols();
  let change = false;
  if (o.calque === 'eaux') change = M.pinceau(s.peu, x, y, ui.taille, true) | M.pinceau(s.profonde, x, y, ui.taille, true);
  else if (o.calque === 'terrains') for (const e of Object.values(s.terrains)) change = M.pinceau(e, x, y, ui.taille, true) || change;
  else if (o.calque.startsWith('terrain:')) {
    const t = o.calque.slice(8);
    change = M.pinceau(s.terrains[t], x, y, ui.taille, !!o.effacer);
    if (!o.effacer) for (const [u, e] of Object.entries(s.terrains)) if (u !== t) M.pinceau(e, x, y, ui.taille, true);
  } else {
    change = M.pinceau(s[o.calque], x, y, ui.taille, !!o.effacer);
    if (!o.effacer && o.calque === 'peu') M.pinceau(s.profonde, x, y, ui.taille, true);
    if (!o.effacer && o.calque === 'profonde') M.pinceau(s.peu, x, y, ui.taille, true);
  }
  if (change) { S.terre = M.rectsDe(s.terre); S.eau = M.eauDepuis(s); S.terrains = Object.entries(s.terrains).flatMap(([t, e]) => M.rectsDe(e).map((c) => ({ t, c }))); ui.sale = true; ui.solCle = ''; }
  return change;
}

// --- Les gestes : poser, tirer un rectangle, choisir et déplacer, gommer ------------------------------------------------
function poser(o, x, y) {
  x = caler(x); y = caler(y);
  if (o.id === 'arbre') S.arbres.push([x, y]);
  else if (o.id === 'rocher') S.rochers.push([x, y]);
  else if (o.id === 'tonneau') S.tonneaux.push([x, y]);
  else if (o.id === 'feu') { S.feux.push([x, y]); S.surfaces.push({ x, y, r: 0.55, t: 'feu' }); }
  else if (o.id === 'tente') S.tentes.push({ x: r1(x - 2.5), y: r1(y - 4.5) });
  else if (o.surface) S.surfaces.push({ x, y, r: ui.rayon, t: o.surface });
  else if (o.planche && ui.aplat) {
    const [sx, sy, w, h] = ui.piece;
    S.tapis.push({ p: ui.planche, d: [sx, sy, w, h, r1(x - w / 2), r1(y - h / 2)] });
  } else if (o.piece || o.planche) {
    const [sx, sy, w, h] = o.piece ? o.piece.d : ui.piece, px = r1(x - w / 2), py = r1(y - h + 0.5);
    const f = o.piece ? o.piece.f : { x0: 0.1, x1: w - 0.1, y0: h - 0.8, y1: h - 0.1 };
    const forme = f.r != null ? { x: r1(px + f.x), y: r1(py + f.y), r: f.r } : { x0: r1(px + f.x0), x1: r1(px + f.x1), y0: r1(py + f.y0), y1: r1(py + f.y1) };
    S.objets.push({ forme, marche: true, ...(o.piece?.vue ? { vue: true } : {}), ...(o.planche && ui.planche !== 'deco' ? { p: ui.planche } : {}), dessin: [sx, sy, w, h, px, py] });
  } else if (o.id === 'rampe' || o.id === 'echelle') {
    const i = S.relief.findIndex((p) => x > p.x0 && x < p.x1 && Math.abs(y - p.y1) < 1.6);
    if (i < 0) { banniere('Une rampe ou une échelle se pose au bord sud d’un plateau.'); return false; }
    const w = o.id === 'echelle' ? 1.0 : 1.8;
    S.rampes.push({ plateau: i, x0: r1(x - w / 2), x1: r1(x + w / 2), ...(o.id === 'echelle' ? { echelle: true } : {}) });
  } else if (o.heros != null) S.departs.heros[o.heros] = [x, y];
  else if (o.ennemi) S.ennemis.push({ id: M.nouvelId(o.ennemi, S.ennemis), type: o.ennemi, x, y });
  else return false;
  return true;
}
function tirer(o, a, b) {
  const x0 = caler(Math.min(a.x, b.x)), x1 = caler(Math.max(a.x, b.x)), y0 = caler(Math.min(a.y, b.y)), y1 = caler(Math.max(a.y, b.y));
  if (x1 - x0 < 0.5 || y1 - y0 < 0.5) return false;
  if (o.id === 'bois') S.bois.push({ x0, x1, y0, y1 });
  else if (o.id === 'pont') S.pont = { x0, x1, y0, y1 };
  else if (o.mur) S.murs.push({ style: o.mur, x0: Math.round(x0), x1: Math.max(Math.round(x0) + 1, Math.round(x1)), y: y0 });
  else if (o.haut) S.relief.push({ x0, y0, x1, y1, haut: o.haut });
  else return false;
  return true;
}
// Un appui de souris (ou un appel de test) : x, y en cases
function appuyer(x, y, { droit = false } = {}) {
  const o = OUTIL[ui.outil];
  ui.appui = { x, y, ox: x, oy: y }; ui.bouge = false;
  if (o.sorte === 'pinceau') { retenir(); ui.trait = droit ? { ...o, effacer: true } : o; peindre(ui.trait, x, y); ui.appui.dernier = { x, y }; }
  else if (o.sorte === 'rect') ui.rect = { a: { x, y }, b: { x, y } };
  else if (o.sorte === 'choisir') { ui.sel = M.sous(S, x, y); if (ui.sel) retenir(); dessinerPanneaux(); }
  else if (o.sorte === 'gomme') { const s = M.sous(S, x, y); if (s) { retenir(); if (M.retirer(S, s)) apresChangement(); else ui.avant.pop(); } }
  else if (o.sorte === 'point') { retenir(); if (poser(o, x, y)) { ui.sel = null; apresChangement(); } else ui.avant.pop(); }
  ui.sale = true;
}
function glisser(x, y) {
  ui.souris = { x, y }; ui.sale = true;
  if (!ui.appui) return;
  const o = OUTIL[ui.outil];
  if (o.sorte === 'pinceau') {
    // tout le trait, pas seulement ses bouts : un coin tous les demi-pas entre la dernière position et celle-ci
    const a = ui.appui.dernier ?? { x, y }, n = Math.max(1, Math.ceil(Math.hypot(x - a.x, y - a.y) / 0.5));
    for (let k = 1; k <= n; k++) peindre(ui.trait ?? o, a.x + ((x - a.x) * k) / n, a.y + ((y - a.y) * k) / n);
    ui.appui.dernier = { x, y };
  } else if (o.sorte === 'rect') ui.rect.b = { x, y };
  else if (o.sorte === 'choisir' && ui.sel) {
    const dx = caler(x - ui.appui.ox), dy = caler(y - ui.appui.oy);
    if (dx || dy) { M.deplacer(S, ui.sel, dx, dy); ui.appui.ox += dx; ui.appui.oy += dy; ui.bouge = true; if (['relief', 'rampes', 'pont'].includes(ui.sel.k)) ui.solCle = ''; dessinerPanneaux(); }
  }
}
function lacher() {
  const o = OUTIL[ui.outil];
  if (!ui.appui) return;
  if (o.sorte === 'pinceau') apresChangement();
  else if (o.sorte === 'rect' && ui.rect) { retenir(); if (tirer(o, ui.rect.a, ui.rect.b)) apresChangement(); else ui.avant.pop(); ui.rect = null; }
  else if (o.sorte === 'choisir' && ui.sel) { if (ui.bouge) apresChangement(); else ui.avant.pop(); }
  ui.appui = null; ui.sale = true;
}
function choisirOutil(id) {
  if (!OUTIL[id]) return;
  if (OUTIL[id].defaut) { ui.planche = OUTIL[id].defaut; ui.piece = ui.pieces[ui.planche] ??= [0, 0, 1, 1]; }   // (les tampons du château, du donjon, de l'intérieur : leur planche)
  ui.outil = id; ui.rect = null; if (id !== 'choisir') ui.sel = null; dessinerPanneaux(); ui.sale = true; }

// --- Le dessin : la salle comme au terrain, puis les repères de l'atelier ------------------------------------------------
function dimensionner() {
  canvas.width = S.l * T; canvas.height = S.h * T;
  canvas.style.width = `${S.l * T * ui.zoom}px`; canvas.style.height = `${S.h * T * ui.zoom}px`;
  ui.solCle = ''; ui.sale = true;
}
const cleSol = () => JSON.stringify([S.l, S.h, S.sol, S.interieur, S.terre, S.eau, S.terrains, S.tapis, S.pont, S.relief, S.rampes]);
function personnage(gg, img, x, y) { if (img) gg.drawImage(img, 0, 10 * 64, 64, 64, Math.round(x * T - 32), Math.round(y * T - 60), 64, 64); }
const planche = (type) => images[`perso_${KIT[type] ?? ''}`] ?? images[`mob_${type}`];
// Dessine la salle (sans les repères : c'est aussi le plan qu'on exporte)
export function dessinerSalle(gg) {
  const B = construireDepuis(S, S.id);
  if (ui.solCle !== cleSol() || !ui.solImg) { ui.solImg = B.composerSol(images); ui.solCle = cleSol(); }
  gg.imageSmoothingEnabled = false;
  gg.fillStyle = '#2f5a2a'; gg.fillRect(0, 0, S.l * T, S.h * T);
  gg.drawImage(ui.solImg, 0, 0);
  const COUL = { eau: 'rgba(46,120,196,.45)', huile: 'rgba(44,30,18,.62)', feu: 'rgba(232,121,42,.6)', glace: 'rgba(176,222,240,.6)' };
  for (const s of S.surfaces) { gg.fillStyle = COUL[s.t] ?? 'rgba(255,255,255,.4)'; gg.beginPath(); gg.arc(s.x * T, s.y * T, s.r * T, 0, Math.PI * 2); gg.fill(); }
  const pieces = B.composerDecor().map((o) => ({ ...o, dessin: (q) => q.drawImage(images[o.img], o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.sw, o.sh) }));
  for (const [x, y] of S.tonneaux) pieces.push({ pied: y * T, dessin: (q) => q.drawImage(images.tonneau, 0, 0, 32, 64, x * T - 16, y * T - 50, 32, 64) });
  S.departs.heros.forEach(([x, y], k) => pieces.push({ pied: y * T, dessin: (q) => personnage(q, images[`perso_${HEROS_KIT[k]}`], x, y) }));
  for (const e of S.ennemis) pieces.push({ pied: e.y * T, dessin: (q) => personnage(q, planche(e.type), e.x, e.y) });
  for (const p of pieces.sort((a, b) => a.pied - b.pied)) p.dessin(gg);
  return B;
}
// Les repères : la zone jouable, la grille, ce qui bloque, le choix, l'aperçu de l'outil, les numéros des héros
function dessinerReperes(gg, B) {
  const Z = M.zoneDe(S);
  if (ui.grille) {
    gg.strokeStyle = 'rgba(255,255,255,.12)'; gg.lineWidth = 1; gg.beginPath();
    for (let i = 0; i <= S.l; i++) { gg.moveTo(i * T + 0.5, 0); gg.lineTo(i * T + 0.5, S.h * T); }
    for (let j = 0; j <= S.h; j++) { gg.moveTo(0, j * T + 0.5); gg.lineTo(S.l * T, j * T + 0.5); }
    gg.stroke();
  }
  gg.strokeStyle = 'rgba(255,211,90,.85)'; gg.setLineDash([6, 4]); gg.lineWidth = 2;
  gg.strokeRect(Z.x0 * T, Z.y0 * T, (Z.x1 - Z.x0) * T, (Z.y1 - Z.y0) * T); gg.setLineDash([]);
  if (ui.obstacles) {
    gg.strokeStyle = 'rgba(232,64,48,.9)'; gg.lineWidth = 1.5;
    for (const o of B.salle().obstacles) {
      if (o.x0 != null && (o.x0 < -0.5 || o.y0 < -0.5) && (o.x1 > S.l + 0.5 || o.y1 > S.h + 0.5)) continue;   // (les bords)
      if (o.r != null) { gg.beginPath(); gg.arc(o.x * T, o.y * T, o.r * T, 0, Math.PI * 2); gg.stroke(); } else gg.strokeRect(o.x0 * T, o.y0 * T, (o.x1 - o.x0) * T, (o.y1 - o.y0) * T);
    }
  }
  gg.font = '700 12px "Pixelify Sans", monospace'; gg.textAlign = 'center';
  S.departs.heros.forEach(([x, y], k) => { gg.fillStyle = '#1e130c'; gg.fillRect(x * T - 7, y * T + 2, 14, 13); gg.fillStyle = '#ffd35a'; gg.fillText(String(k + 1), x * T, y * T + 13); });
  if (ui.sel) {
    const b = boite(ui.sel);
    if (b) { gg.strokeStyle = '#ffd35a'; gg.lineWidth = 2; gg.strokeRect(b.x0 * T, b.y0 * T, (b.x1 - b.x0) * T, (b.y1 - b.y0) * T); }
  }
  if (ui.rect) {
    const { a, b } = ui.rect;
    gg.fillStyle = 'rgba(255,211,90,.18)'; gg.strokeStyle = '#ffd35a'; gg.lineWidth = 2;
    const x = Math.min(a.x, b.x) * T, y = Math.min(a.y, b.y) * T, w = Math.abs(b.x - a.x) * T, h = Math.abs(b.y - a.y) * T;
    gg.fillRect(x, y, w, h); gg.strokeRect(x, y, w, h);
  }
  const o = OUTIL[ui.outil];
  if (ui.souris && o.sorte === 'pinceau') {
    const n = ui.taille, i0 = Math.round(ui.souris.x - (n - 1) / 2), j0 = Math.round(ui.souris.y - (n - 1) / 2);
    gg.strokeStyle = o.effacer ? 'rgba(232,64,48,.9)' : 'rgba(255,255,255,.85)'; gg.lineWidth = 2;
    gg.strokeRect((i0 - 0.5) * T, (j0 - 0.5) * T, n * T, n * T);
  } else if (ui.souris && o.surface) {
    gg.strokeStyle = 'rgba(255,255,255,.8)'; gg.beginPath(); gg.arc(caler(ui.souris.x) * T, caler(ui.souris.y) * T, ui.rayon * T, 0, Math.PI * 2); gg.stroke();
  }
}
// La boîte autour d'un élément choisi (en cases)
function boite({ k, i }) {
  const pt = (x, y, w = 0.6, h = 1.6) => ({ x0: x - w, x1: x + w, y0: y - h, y1: y + 0.3 });
  if (k === 'heros') { const [x, y] = S.departs.heros[i]; return pt(x, y); }
  if (k === 'ennemis') return pt(S.ennemis[i].x, S.ennemis[i].y);
  if (k === 'surfaces') { const s = S.surfaces[i]; return { x0: s.x - s.r, x1: s.x + s.r, y0: s.y - s.r, y1: s.y + s.r }; }
  if (['tonneaux', 'rochers', 'feux'].includes(k)) { const [x, y] = S[k][i]; return pt(x, y, 0.55, 1); }
  if (k === 'arbres') { const [x, y] = S.arbres[i]; return { x0: x - 1.4, x1: x + 1.4, y0: y - 3.3, y1: y + 0.2 }; }
  if (k === 'tentes') { const t = S.tentes[i]; return { x0: t.x, x1: t.x + 5, y0: t.y, y1: t.y + 5 }; }
  if (k === 'objets') { const d = S.objets[i].dessin; return d ? { x0: d[4], x1: d[4] + d[2], y0: d[5], y1: d[5] + d[3] } : null; }
  if (k === 'rampes') { const r = S.rampes[i], p = S.relief[r.plateau]; return p ? { x0: r.x0, x1: r.x1, y0: p.y1 - 0.5, y1: p.y1 + 2 * p.haut } : null; }
  if (k === 'pont') return S.pont;
  if (k === 'murs') { const m = S.murs[i]; return { x0: m.x0, x1: m.x1, y0: m.y, y1: m.y + HAUT_MUR }; }
  if (k === 'tapis') { const d = S.tapis[i].d; return { x0: d[4], x1: d[4] + d[2], y0: d[5], y1: d[5] + d[3] }; }
  return S[k]?.[i] ?? null;
}

// --- Les panneaux ------------------------------------------------------------------------------------------------------
let banniereT = 0;
function banniere(texte) { dom.banniere.textContent = texte; dom.banniere.hidden = false; banniereT = 3; }
function dessinerPalette() {
  dom.palette.replaceChildren(...OUTILS.map((f) => el('section', { class: 'famille' },
    el('h2', {}, f.famille),
    el('div', { class: f.famille === 'Ennemis' ? 'outils outils-ennemis' : 'outils' }, f.liste.map((o) => el('button', {
      type: 'button', class: `outil${ui.outil === o.id ? ' actif' : ''}${o.ennemi && !o.jouable ? ' sans-regles' : ''}`, dataset: { outil: o.id }, 'aria-pressed': String(ui.outil === o.id),
      title: o.ennemi && !o.jouable ? `${o.nom} : pas encore ses règles (au terrain, joué par une doublure)` : o.touche ? `${o.nom} (${o.touche})` : o.nom,
      onclick: () => choisirOutil(o.id) }, apercu(o), el('span', { class: 'outil-nom' }, o.nom)))))));
}
// La petite image d'un outil : la pièce, le personnage, sinon une pastille de couleur
function apercu(o) {
  const c = el('canvas', { width: 32, height: 32, class: 'outil-image', 'aria-hidden': 'true' }), q = c.getContext('2d');
  q.imageSmoothingEnabled = false;
  if (!images) return c;
  const ss = (img, sx, sy, sw, sh) => { const k = Math.min(32 / sw, 32 / sh); q.drawImage(img, sx, sy, sw, sh, (32 - sw * k) / 2, (32 - sh * k) / 2, sw * k, sh * k); };
  if (o.ennemi) ss(planche(o.ennemi), 16, 10 * 64 + 10, 32, 46);
  else if (o.heros != null) ss(images[`perso_${HEROS_KIT[o.heros]}`], 16, 10 * 64 + 10, 32, 46);
  else if (o.piece) ss(images.deco, o.piece.d[0] * T, o.piece.d[1] * T, o.piece.d[2] * T, o.piece.d[3] * T);
  else if (o.planche) { const [pl, pc] = o.defaut ? [o.defaut, ui.pieces[o.defaut] ?? [0, 0, 3, 3]] : [ui.planche, ui.piece]; if (images[pl]) ss(images[pl], pc[0] * T, pc[1] * T, pc[2] * T, pc[3] * T); }
  else if (o.mur) ss(images[MURS[o.mur].p], 0, 0, 96, MURS[o.mur].h);
  else if (o.calque?.startsWith('terrain:')) ss(images[o.calque.slice(8)], T, 3 * T, T, T);
  else if (o.calque === 'terrains') ss(images.lave, T, 3 * T, T, T);
  else if (o.id === 'arbre' || o.id === 'bois') ss(images.cimes, 0, 0, 96, 96);
  else if (o.id === 'rocher') ss(images.roche, 0, 0, 32, 32);
  else if (o.id === 'tonneau') ss(images.tonneau, 0, 0, 32, 64);
  else if (o.id === 'feu') ss(images.deco, 10 * T, 49 * T, T, T);
  else if (o.id === 'tente') ss(images.deco, 8 * T, 51 * T, 5 * T, 4 * T);
  else if (o.calque === 'terre') ss(images.terre, T, 3 * T, T, T);
  else if (o.calque === 'peu' || o.calque === 'profonde') ss(images.eau, T, 3 * T, T, T);
  else if (o.id === 'pont') ss(images.douves, 448, 0, 64, 76);
  else if (o.haut || o.id === 'rampe' || o.id === 'echelle') ss(images.montagnes, 190, 74, 32, 64);
  else if (o.calque === 'eaux') ss(images.eau, T, 3 * T, T, T);
  else {
    const coul = { eau: '#2e78c4', huile: '#3a2814', feu: '#e8792a', glace: '#b0def0' }[o.surface] ?? (o.sorte === 'gomme' ? '#b8322a' : '#ffd35a');
    q.fillStyle = coul; q.beginPath(); q.arc(16, 16, 11, 0, Math.PI * 2); q.fill(); q.strokeStyle = '#1e130c'; q.lineWidth = 2; q.stroke();
    if (o.sorte === 'choisir') { q.fillStyle = '#1e130c'; q.beginPath(); q.moveTo(11, 8); q.lineTo(11, 24); q.lineTo(15, 20); q.lineTo(19, 26); q.lineTo(21, 25); q.lineTo(17, 19); q.lineTo(22, 19); q.closePath(); q.fill(); }
  }
  if (o.effacer) { q.strokeStyle = '#1e130c'; q.lineWidth = 6; q.beginPath(); q.moveTo(7, 7); q.lineTo(25, 25); q.moveTo(25, 7); q.lineTo(7, 25); q.stroke(); q.strokeStyle = '#e8402e'; q.lineWidth = 3; q.stroke(); }   // (effacer : une croix rouge)
  return c;
}
function champ(nom, valeur, onchange, attrs = {}) {
  return el('label', { class: 'champ' }, el('span', {}, nom), el('input', { value: valeur ?? '', onchange: (e) => onchange(e.target.value), ...attrs }));
}
const nombre = (nom, valeur, onchange, attrs = {}) => champ(nom, valeur, (v) => onchange(Number(v)), { type: 'number', step: '0.1', ...attrs });
// Modifier un élément depuis le panneau (une valeur), avec l'historique
function modifier(f) { retenir(); f(); apresChangement(); }
function dessinerPanneaux() {
  if (!dom.droite) return;
  const s = ui.sel, blocs = [];
  // l'outil en cours et ses réglages
  const o = OUTIL[ui.outil];
  const reglages = [el('p', { class: 'outil-courant' }, o.nom)];
  if (o.sorte === 'pinceau') reglages.push(el('div', { class: 'boutons-ligne' }, el('span', {}, 'Pinceau :'), [1, 2, 3].map((n) => el('button', { type: 'button', class: `bouton-jeu petit${ui.taille === n ? ' choisi' : ''}`, onclick: () => { ui.taille = n; dessinerPanneaux(); } }, `${n} × ${n}`))));
  if (o.surface) reglages.push(nombre('Rayon (cases)', ui.rayon, (v) => { ui.rayon = Math.max(0.4, Math.min(3, v)); }, { min: '0.4', max: '3' }));
  if (o.planche) reglages.push(el('p', { class: 'note' }, NOMS_PLANCHES[ui.planche] ?? ui.planche),
    el('button', { type: 'button', class: 'bouton-jeu', onclick: () => ouvrirPlanche() }, 'Choisir la pièce sur la planche'),
    el('div', { class: 'boutons-ligne' }, [[false, 'Debout'], [true, 'À plat sur le sol']].map(([v, n]) => el('button', { type: 'button', class: `bouton-jeu petit${ui.aplat === v ? ' choisi' : ''}`, onclick: () => { ui.aplat = v; dessinerPanneaux(); } }, n))),
    el('p', { class: 'note' }, ui.aplat ? 'À plat : sous les personnages, ne bloque rien (tapis, dalles, motifs).' : 'Debout : trié avec les personnages ; bloque le passage par son pied (à régler une fois posée).'));
  if (o.mur) reglages.push(el('p', { class: 'note' }, 'Tire un rectangle : la façade se pose en haut, sur toute sa largeur ; elle bloque le passage et la vue.'));
  if (o.ennemi && !o.jouable) reglages.push(el('p', { class: 'note' }, 'Il n’a pas encore ses règles : au terrain, il est joué par une doublure (', M.doublure(FICHES[o.ennemi]), ').'));
  blocs.push(el('section', { class: 'bloc' }, el('h2', {}, 'L’outil'), reglages));
  // ce qui est choisi
  if (s) {
    const lignes = [];
    if (s.k === 'heros') { const p = S.departs.heros[s.i]; lignes.push(el('p', {}, `Départ du héros ${s.i + 1}`), nombre('x', p[0], (v) => modifier(() => { p[0] = v; })), nombre('y', p[1], (v) => modifier(() => { p[1] = v; }))); }
    else if (s.k === 'ennemis') {
      const e = S.ennemis[s.i];
      lignes.push(el('p', {}, `${FICHES[e.type]?.nom ?? ENNEMIS[e.type]?.nom ?? e.type} (${e.id})`), nombre('x', e.x, (v) => modifier(() => { e.x = v; })), nombre('y', e.y, (v) => modifier(() => { e.y = v; })));
    } else if (s.k === 'surfaces') {
      const q = S.surfaces[s.i];
      lignes.push(el('p', {}, `Surface : ${q.t}`), nombre('Rayon', q.r, (v) => modifier(() => { q.r = Math.max(0.4, Math.min(3, v)); })));
    } else if (s.k === 'objets') {
      const q = S.objets[s.i];
      lignes.push(el('p', {}, 'Une pièce de décor'),
        el('label', { class: 'case' }, el('input', { type: 'checkbox', checked: q.marche ? true : null, onchange: (e) => modifier(() => { q.marche = e.target.checked; }) }), ' bloque le passage'),
        el('label', { class: 'case' }, el('input', { type: 'checkbox', checked: q.vue ? true : null, onchange: (e) => modifier(() => { if (e.target.checked) q.vue = true; else delete q.vue; }) }), ' bloque la vue'));
    } else if (s.k === 'relief') {
      const q = S.relief[s.i];
      lignes.push(el('p', {}, 'Un plateau'), el('div', { class: 'boutons-ligne' }, [1, 2].map((n) => el('button', { type: 'button', class: `bouton-jeu petit${q.haut === n ? ' choisi' : ''}`, onclick: () => modifier(() => { q.haut = n; }) }, `${n * 3} m`))));
    } else lignes.push(el('p', {}, { arbres: 'Un arbre', rochers: 'Un rocher', tonneaux: 'Un tonneau', feux: 'Un feu de camp', tentes: 'Une tente', bois: 'Un bois', pont: 'Le pont', rampes: S.rampes[s.i]?.echelle ? 'Une échelle' : 'Une rampe' }[s.k] ?? s.k));
    if (s.k !== 'heros') lignes.push(el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => supprimer() }, 'Supprimer (Suppr)'));
    blocs.push(el('section', { class: 'bloc' }, el('h2', {}, 'Ce qui est choisi'), lignes));
  }
  // la salle
  blocs.push(el('section', { class: 'bloc' }, el('h2', {}, 'La salle'),
    champ('Nom', S.nom, (v) => modifier(() => { const auto = S.id === M.idDe(S.nom) || S.id === 'nouvelle-salle'; S.nom = v; if (auto) S.id = M.idDe(v); })),
    champ('Fichier', S.id, (v) => modifier(() => { S.id = M.idDe(v); })),
    champ('La question qu’elle pose', S.idee, (v) => modifier(() => { S.idee = v; }), { placeholder: 'Forcer le pont, ou piéger le gué ?' }),
    el('label', { class: 'champ' }, el('span', {}, 'Le sol de la salle'), el('select', { onchange: (e) => modifier(() => { S.sol = e.target.value; }) },
      Object.entries(SOLS).map(([id, d]) => el('option', { value: id, selected: S.sol === id ? true : null }, id === 'terre' ? 'Terre battue partout' : d.nom)))),
    el('label', { class: 'champ' }, el('span', {}, 'Dehors ou dedans'), el('select', { onchange: (e) => modifier(() => { S.interieur = e.target.value === 'non' ? false : e.target.value; }) },
      el('option', { value: 'non', selected: !S.interieur ? true : null }, 'Dehors (la forêt autour)'),
      Object.entries(MURS).map(([id, d]) => el('option', { value: id, selected: S.interieur === id ? true : null }, ({ brique: 'Dedans : brique du donjon', bleu: 'Dedans : murs bleus' })[id] ?? `Dedans : ${d.nom}`))))));
  // la taille : de chaque côté (le contenu reste à sa place), ou une taille toute faite (autour du centre)
  const cote = (nom, cle, ou) => el('div', { class: 'taille-cote' }, el('span', {}, nom),
    el('button', { type: 'button', class: 'bouton-jeu petit', 'aria-label': `Réduire ${ou}`, onclick: () => redimensionner({ [cle]: -1 }) }, '−'),
    el('button', { type: 'button', class: 'bouton-jeu petit', 'aria-label': `Agrandir ${ou}`, onclick: () => redimensionner({ [cle]: 1 }) }, '+'));
  blocs.push(el('section', { class: 'bloc' }, el('h2', {}, 'La taille'),
    el('p', { class: 'taille-actuelle' }, `${S.l} × ${S.h} cases (${(S.l * 1.5).toLocaleString('fr-FR')} × ${(S.h * 1.5).toLocaleString('fr-FR')} m)`),
    el('div', { class: 'taille-cotes' }, cote('Nord', 'nord', 'au nord'), cote('Sud', 'sud', 'au sud'), cote('Ouest', 'ouest', 'à l’ouest'), cote('Est', 'est', 'à l’est')),
    el('div', { class: 'boutons-ligne' }, M.TAILLES.map(([n, l, h]) => el('button', { type: 'button', class: `bouton-jeu petit${S.l === l && S.h === h ? ' choisi' : ''}`, title: `${l} × ${h} cases`,
      onclick: () => { const dl = l - S.l, dh = h - S.h; redimensionner({ ouest: Math.trunc(dl / 2), est: dl - Math.trunc(dl / 2), nord: Math.trunc(dh / 2), sud: dh - Math.trunc(dh / 2) }); } }, n)))));
  // ce qui est à revoir
  const B = construireDepuis(S, S.id);
  ui.notes = M.verifier(S, B.salle().obstacles);
  blocs.push(el('section', { class: 'bloc a-revoir' }, el('h2', {}, ui.notes.length ? `À revoir (${ui.notes.length})` : 'Prête à essayer'),
    ui.notes.length ? el('ul', {}, ui.notes.map((n) => el('li', {}, n))) : el('p', { class: 'note' }, 'Rien à redire : essaie-la au terrain.')));
  dom.droite.replaceChildren(...blocs);
  dessinerPalette();
  dom.titre.textContent = S.nom || 'Sans nom';
  for (const [b, v] of [[dom.aimant, ui.aimant], [dom.grille, ui.grille], [dom.obstacles, ui.obstacles]]) b.setAttribute('aria-pressed', String(v));
}
// Agrandir ou réduire la salle de chaque côté (le contenu suit au nord et à l'ouest)
function redimensionner(cotes) { retenir(); M.redimensionner(S, cotes); ui.zoom = zoomQuiTient(); dimensionner(); apresChangement(); }
function supprimer() { if (!ui.sel) return; retenir(); if (M.retirer(S, ui.sel)) { ui.sel = null; apresChangement(); } else ui.avant.pop(); }

// La planche des décors : on y choisit une pièce (un rectangle de cases), qu'on pose ensuite
function ouvrirPlanche(planche = ui.planche) {
  ui.planche = planche;
  const img = images[planche], k = 1, c = el('canvas', { width: img.width, height: img.height, class: 'planche-deco' }), q = c.getContext('2d');
  let a = null, b = null;
  const redessiner = () => {
    q.clearRect(0, 0, c.width, c.height); q.drawImage(img, 0, 0);
    q.strokeStyle = 'rgba(255,255,255,.12)'; for (let x = 0; x <= c.width; x += T) { q.beginPath(); q.moveTo(x + 0.5, 0); q.lineTo(x + 0.5, c.height); q.stroke(); }
    for (let y = 0; y <= c.height; y += T) { q.beginPath(); q.moveTo(0, y + 0.5); q.lineTo(c.width, y + 0.5); q.stroke(); }
    const [sx, sy, w, h] = ui.piece; q.strokeStyle = '#ffd35a'; q.lineWidth = 2; q.strokeRect(sx * T, sy * T, w * T, h * T); q.lineWidth = 1;
  };
  const caseDe = (e) => { const r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * img.width / T), Math.floor((e.clientY - r.top) / r.height * img.height / T)]; };
  ui.piece = ui.pieces[planche] ??= [0, 0, 1, 1];
  const maj = () => { if (!a || !b) return; ui.piece = ui.pieces[planche] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]) + 1, Math.abs(b[1] - a[1]) + 1]; redessiner(); };
  c.addEventListener('pointerdown', (e) => { a = b = caseDe(e); maj(); });
  c.addEventListener('pointermove', (e) => { if (a && e.buttons) { b = caseDe(e); maj(); } });
  c.addEventListener('pointerup', () => { a = null; });
  redessiner();
  const fermer = () => { dom.planche.hidden = true; dessinerPanneaux(); };
  const choix = el('select', { onchange: (e) => ouvrirPlanche(e.target.value) }, Object.entries(NOMS_PLANCHES).map(([id, n]) => el('option', { value: id, selected: id === planche ? true : null }, n)));
  dom.planche.replaceChildren(el('header', {}, el('h2', {}, 'Choisir une pièce'), el('label', { class: 'champ' }, el('span', {}, 'La planche'), choix), el('p', {}, 'Tire un rectangle sur la pièce à poser, puis « Prendre cette pièce ».'),
    el('button', { type: 'button', class: 'bouton-jeu', onclick: fermer }, 'Prendre cette pièce')), el('div', { class: 'planche-defile' }, c));
  dom.planche.hidden = false;
  void k;
}

// --- Les fichiers : nouvelle, ouvrir, importer, exporter, le plan, l'essai -------------------------------------------
function telecharger(nom, blob) { const a = el('a', { href: URL.createObjectURL(blob), download: nom }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
export const json = () => `${JSON.stringify(M.exporter(S), null, 2)}\n`;
function exporterJson() { telecharger(`${S.id}.json`, new Blob([json()], { type: 'application/json' })); banniere(`« ${S.id}.json » : envoie-le, ou pose-le dans content/salles/ pour qu’il rejoigne le terrain.`); }
export function plan() { const c = el('canvas', { width: S.l * T, height: S.h * T }); dessinerSalle(c.getContext('2d')); return c; }
function exporterPlan() { plan().toBlob((b) => telecharger(`${S.id}.png`, b)); }
function importer() {
  const f = el('input', { type: 'file', accept: '.json,application/json' });
  f.addEventListener('change', async () => { try { charger(JSON.parse(await f.files[0].text())); banniere(`« ${S.nom} » est ouverte.`); } catch { banniere('Ce fichier n’est pas une salle.'); } });
  f.click();
}
export const ADRESSE_ESSAI = './entrainement.html?salle=essai';
function essayer() {
  try { localStorage.setItem(CLE_ESSAI, JSON.stringify(M.pourEssai(S, FICHES))); } catch {}
  naviguer(ADRESSE_ESSAI);
}
function menuOuvrir() {
  const mes = lireSalles();
  const ligne = (nom, sous, action) => el('li', {}, el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => { action(); dom.ouvrir.hidden = true; } }, nom), el('span', {}, sous));
  dom.ouvrir.replaceChildren(el('h2', {}, 'Ouvrir une salle'),
    el('h3', {}, 'Mes salles (dans ce navigateur)'),
    Object.keys(mes).length ? el('ul', {}, Object.values(mes).map((m) => ligne(m.nom, m.id, () => charger(m)))) : el('p', { class: 'note' }, 'Pas encore de salle enregistrée.'),
    el('h3', {}, 'Partir d’une salle du terrain (une copie)'),
    el('ul', {}, Object.entries(SALLES).map(([id, m]) => ligne(m.nom, m.idee ?? '', () => charger({ ...m, id: `${id}-copie`, nom: `${m.nom} (copie)` })))),
    el('button', { type: 'button', class: 'bouton-jeu', onclick: () => { dom.ouvrir.hidden = true; } }, 'Fermer'));
  dom.ouvrir.hidden = false;
}

// --- Le skill -----------------------------------------------------------------------------------------------------------
// Les images de l'atelier (chargées par main.js avant de l'ouvrir) : le terrain, les pièces, les héros et tous les ennemis
export const PLANCHES = {
  ...PLANCHES_SALLES,
  herbe: 'grass.png', terre: 'dirt.png', eau: 'water.png', roche: 'rock.png', cimes: 'treetop.png', troncs: 'trunk.png', douves: 'douves.png', montagnes: 'mountains.png', tonneau: 'barrel.png', deco: 'decorations-medieval.png',
  ...Object.fromEntries([...Object.values(KIT), ...HEROS_KIT].map((id) => [`perso_${id}`, `entrainement/${id}.png`])),
  ...Object.fromEntries(Object.keys(FICHES).map((id) => [`mob_${id}`, `ennemis/${id}/planche.png`])),
};
export const chargerPlanches = () => chargerImages('./assets/lpc/', PLANCHES);

export function init(g0, options = {}) {
  game = g0;
  images = options.images;
  // l'écran
  const bouton = (texte, onclick, attrs = {}) => el('button', { type: 'button', class: 'bouton-jeu', onclick, ...attrs }, texte);
  dom.haut = el('header', { class: 'atelier-haut bois' },
    el('div', { class: 'atelier-titre' }, el('span', { class: 'surtitre' }, 'La table des cartes · l’atelier des niveaux'), dom.titre = el('strong', {}, '')),
    el('nav', { class: 'atelier-fichiers', 'aria-label': 'La salle' },
      bouton('Nouvelle', () => { charger(M.vide()); banniere('Une salle neuve.'); }),
      bouton('Ouvrir…', () => menuOuvrir()),
      bouton('Importer', () => importer()),
      bouton('Exporter (.json)', () => exporterJson(), { id: 'exporter' }),
      bouton('Le plan (.png)', () => exporterPlan()),
      bouton('Essayer au terrain', () => essayer(), { id: 'essayer', class: 'bouton-jeu fort' }),
      el('a', { class: 'bouton-jeu discret', href: './index.html?spot=level' }, 'Retour au camp')));
  dom.palette = el('aside', { class: 'atelier-palette bois', 'aria-label': 'Les outils' });
  canvas = el('canvas', { class: 'atelier-salle', 'aria-label': 'La salle' });
  g = canvas.getContext('2d');
  dom.vue = el('main', { class: 'atelier-vue' }, canvas);
  dom.aimant = bouton('Aimant ½ case (G)', () => { ui.aimant = !ui.aimant; dessinerPanneaux(); }, { class: 'bouton-jeu petit' });
  dom.grille = bouton('Grille', () => { ui.grille = !ui.grille; ui.sale = true; dessinerPanneaux(); }, { class: 'bouton-jeu petit' });
  dom.obstacles = bouton('Ce qui bloque (B)', () => { ui.obstacles = !ui.obstacles; ui.sale = true; dessinerPanneaux(); }, { class: 'bouton-jeu petit' });
  dom.outilsVue = el('div', { class: 'atelier-outils-vue bois' }, dom.aimant, dom.grille, dom.obstacles,
    bouton('−', () => zoomer(-1), { class: 'bouton-jeu petit', 'aria-label': 'Dézoomer' }), bouton('+', () => zoomer(1), { class: 'bouton-jeu petit', 'aria-label': 'Zoomer' }),
    bouton('Annuler', () => annuler(), { class: 'bouton-jeu petit' }), bouton('Rétablir', () => retablir(), { class: 'bouton-jeu petit' }));
  dom.droite = el('aside', { class: 'atelier-droite plaque', 'aria-label': 'La salle et ce qui est choisi' });
  dom.banniere = el('div', { class: 'atelier-banniere', hidden: true, role: 'status' });
  dom.ouvrir = el('section', { class: 'atelier-modale plaque', hidden: true, role: 'dialog', 'aria-label': 'Ouvrir une salle' });
  dom.planche = el('section', { class: 'atelier-modale atelier-planche plaque', hidden: true, role: 'dialog', 'aria-label': 'La planche des décors' });
  document.body.append(dom.haut, dom.palette, dom.vue, dom.outilsVue, dom.droite, dom.banniere, dom.ouvrir, dom.planche);
  // la souris
  const enCases = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * S.l, y: (e.clientY - r.top) / r.height * S.h }; };
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); const p = enCases(e); appuyer(p.x, p.y, { droit: e.button === 2 }); });
  canvas.addEventListener('pointermove', (e) => { const p = enCases(e); glisser(p.x, p.y); });
  canvas.addEventListener('pointerup', () => lacher());
  canvas.addEventListener('pointerleave', () => { ui.souris = null; ui.sale = true; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.vue.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoomer(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  window.addEventListener('keydown', clavier);
  // la salle en cours (celle d'avant, si on en avait une)
  let courante = null;
  try { courante = lireSalles()[localStorage.getItem(CLE_COURANTE)]; } catch {}
  charger(courante ?? M.vide(), { garde: false });
  naviguer = options.naviguer ?? naviguer;
  return api;
}
function zoomer(sens) { ui.zoom = Math.max(1, Math.min(4, ui.zoom + sens)); dimensionner(); }
function clavier(e) {
  if (e.target.closest?.('input, textarea')) return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) retablir(); else annuler(); return; }
  if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); retablir(); return; }
  if (ctrl) return;
  if (e.key === 'v' || e.key === 'V') choisirOutil('choisir');
  else if (e.key === 'x' || e.key === 'X') choisirOutil('gomme');
  else if (e.key === 'g' || e.key === 'G') { ui.aimant = !ui.aimant; dessinerPanneaux(); }
  else if (e.key === 'b' || e.key === 'B') { ui.obstacles = !ui.obstacles; ui.sale = true; dessinerPanneaux(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') supprimer();
  else if (e.key === 'Escape') { dom.ouvrir.hidden = true; dom.planche.hidden = true; ui.sel = null; choisirOutil('choisir'); }
  else if (e.key.startsWith('Arrow') && ui.sel) {
    e.preventDefault();
    const d = e.shiftKey ? 0.5 : 0.1, [dx, dy] = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
    retenir(); M.deplacer(S, ui.sel, dx, dy); apresChangement();
  }
}
export function update(dt) {
  if (banniereT > 0 && (banniereT -= dt) <= 0) dom.banniere.hidden = true;
  if (!ui.sale || !images) return;
  ui.sale = false;
  const B = dessinerSalle(g);
  dessinerReperes(g, B);
}
export function dispose() { window.removeEventListener('keydown', clavier); for (const k of ['haut', 'palette', 'vue', 'outilsVue', 'droite', 'banniere', 'ouvrir', 'planche']) dom[k]?.remove(); }

export const api = {
  get salle() { return S; }, get ui() { return ui; }, get dom() { return dom; }, get images() { return images; },
  charger, choisirOutil, appuyer, glisser, lacher, annuler, retablir, supprimer, json, plan, essayer, PIECES, OUTILS,
  // un geste complet (un test) : appuyer, glisser jusqu'à (x1, y1), lâcher
  geste(x0, y0, x1 = x0, y1 = y0) { appuyer(x0, y0); glisser(x1, y1); lacher(); update(0); },
  testerNavigation(f) { naviguer = f ?? ((url) => { location.href = url; }); },
};
