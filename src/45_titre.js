// L'écran titre, en pixel art rétro, entre le dashboard et le camp, comme une seule caméra qui descend : en venant du
// dashboard, un écran noir (celui du chargement), puis le ciel de nuit, et la caméra descend sur le paysage ; au choix,
// elle continue de descendre sur le camp, déjà vivant. Le bouton « Retour au dashboard » du camp fait le chemin à
// l'envers, vite : le camp, l'écran titre, le ciel de nuit, le noir, le dashboard.
// La scène raconte la soirée : au premier plan, notre camp au crépuscule, fermé par sa palissade, avec sa porte, sa
// sentinelle, ses tentes, ses bannières, son râtelier, sa cible, ses tonneaux, son bois coupé, ses rats ; autour du feu,
// les héros de l'équipe (la règle des sièges, plus bas), qui bougent. Derrière la porte, le chemin de la montée (les 6
// salles de LEVEL_STRUCTURE : la lisière, le gué, le moulin… un petit feu par salle, des monstres qui patrouillent),
// puis, au loin sur sa montagne, la tour : trois étages et, tout en haut, la lueur du gardien, qui balaie la plaine.
// Le titre en lettres de pixels, le menu dans un cadre du HUD épique (Jouer, Rejoindre, Réglages, Retour au
// dashboard), « Autour du feu » avec les médaillons des héros, et la date du build.
// Il s'ouvre avant le camp ; ?test, ?spot, ?visite et ?hote (le retour du terrain d'entraînement) le passent. Un lien
// ?code=ABCDE ouvre Rejoindre, le code déjà tapé.
// La scène est peinte dans une petite image (environ 800 × 450) agrandie d'un nombre entier de fois : des pixels nets.
// Le décor fixe est peint une fois par taille d'écran ; tout le reste bouge. La lumière : le crépuscule assombrit le
// camp, le feu le réchauffe autour de lui ; les flammes restent vives.
// Deux petits détails dans le ciel : un éclat de couleurs, de temps en temps, au sommet de la tour, et une fine fissure.
import { chargerImages } from './02_images.js';
import { DASHBOARD } from './10_missions.js';
import { CLE as CLE_REGLAGES, lireReglages } from './25_reglages.js';
import { habiller, medaillon } from './33_cadres.js';

// Le nom du jeu, ligne par ligne (en majuscules : la police de pixels n'a qu'elles).
export const TITRE = ['DUNGEON', 'CO-OP'];
const HAUTEUR_VISEE = 450;   // la hauteur de l'image avant l'agrandissement (sur un écran en largeur)
export const DUREE = { noir: 0.35, descente: 1.8, camp: 1.8, remontee: 0.8, ciel: 0.6, fondu: 0.25 };   // en secondes
export const NOIR = '#07040b';   // le noir du chargement, du ciel tout en haut et des fondus (le fond de la page aussi)

// --- Les héros autour du feu : la règle des sièges (CAMP.fr.md §5) ---------------------------------------------------
// Quatre sièges. 1) le héros que j'ai choisi (le menu du choix du héros le garde dans ce navigateur) ; 2) les héros
// créés par les joueurs (une fiche de content/classes/ dont l'auteur est un pseudo GitHub) ; 3) le set de base, pour les
// sièges vides. Quand le choix de chacun sera partagé, le dernier héros choisi par chaque joueur prendra sa place en 2.
const FICHES = import.meta.glob('../content/classes/*.json', { eager: true, import: 'default' });
export const CLE_HEROS = 'dungeoncoop:heros';
const estPseudo = (a) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(String(a ?? ''));
export const DEPART = { id: 'depart', nom: 'Héros de départ', image: 'heros', fichier: 'heros.png', auteur: null };
export const HEROS = [DEPART, ...Object.values(FICHES).filter((f) => f?.id && f.look?.base)
  .map((f) => ({ id: f.id, nom: String(f.nom).replace(/\s*\(.*\)\s*$/, ''), image: `perso_${f.look.base}`, fichier: `entrainement/${f.look.base}.png`, auteur: estPseudo(f.auteur) ? f.auteur : null }))];
const SET_DE_BASE = ['chevalier', 'druide', 'barde', 'eclaireuse', 'depart'];
export function sieges({ heros = HEROS, choisi = null, places = 4 } = {}) {
  const pris = [];
  const prendre = (h) => { if (h && !pris.includes(h) && pris.length < places) pris.push(h); };
  prendre(heros.find((h) => h.id === choisi));
  heros.filter((h) => h.auteur).sort((a, b) => a.id.localeCompare(b.id)).forEach(prendre);
  for (const id of SET_DE_BASE) prendre(heros.find((h) => h.id === id));
  heros.forEach(prendre);
  return pris;
}
const heroChoisi = () => { try { return localStorage.getItem(CLE_HEROS); } catch { return null; } };
// Leur place autour du feu : deux sur les côtés (de profil, tournés vers le feu), deux derrière (de face).
const PLACES = [{ dx: -50, dy: 2, dir: 'droite' }, { dx: 50, dy: 2, dir: 'gauche' }, { dx: -23, dy: -18, dir: 'bas' }, { dx: 24, dy: -18, dir: 'bas' }];
const DIR = { haut: 0, gauche: 1, bas: 2, droite: 3 };
// Les rangées LPC (64 px) : le sort (7 images), la taille (6), la marche (9), le repos (2).
const ANIM = { sort: [0, 7], taille: [12, 6], marche: [8, 9], repos: [22, 2] };

const FICHIERS = {
  feu: 'CampFireFinished.png', deco: 'decorations-medieval.png', tonneau: 'barrel.png', brasero: 'brasero.png', herbe: 'grass.png', terre: 'dirt.png',
  sentinelle: 'sentinelle.png', rats: 'rats.png', sbire: 'entrainement/sbire.png', brute: 'entrainement/brute-ennemie.png', chef: 'entrainement/chef.png',
  ...Object.fromEntries(HEROS.map((h) => [h.image, h.fichier])),
};
export const chargerImagesTitre = () => chargerImages('./assets/lpc/', FICHIERS);

// Passer l'écran titre : les vérifications, un point nommé, la vue visite, le retour du terrain d'entraînement.
export const sauterTitre = (query) => ['test', 'spot', 'visite', 'hote'].some((k) => query.has(k));

// Les pièces du camp dans la planche des décorations (en px) : [sx, sy, w, h].
const PIECES = {
  // (la tente : son coin haut gauche est un bout de la grande tente voisine, effacé comme dans tente.js)
  tente: [386, 1733, 124, 150, [0, 0, 6, 23]], ratelier: [38, 1504, 52, 34], cible: [140, 1512, 40, 56], fleches: [100, 1568, 28, 32],
  bois: [452, 644, 60, 60], buche: [400, 640, 32, 36], foyer: [448, 1504, 32, 64],
};
const BANNIERE = (k) => [32 * k, 1218, 32, 76];   // 0 blanche, 1 bleue, 2 verte, 3 rouge, 4 or
const LANTERNE = (k) => [384 + 32 * k, 32, 32, 32];   // 0 éteinte, 1 à 3 allumée
const VERT = [129, 161, 0];   // le vert de remplissage de la planche, à effacer
export const TENTE_FOND = 100;   // la profondeur au sol d'une tente (son toit), en pixels de la scène

// --- La police de pixels (5 × 7) -----------------------------------------------------------------------------------
const GLYPHES = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  '-': '000 000 000 111 000 000 000', ' ': '000 000 000 000 000 000 000',
};
const glyphe = (ch) => (GLYPHES[ch] ?? GLYPHES[' ']).split(' ');
export const largeurTexte = (s, sc) => [...s].reduce((n, ch) => n + (glyphe(ch)[0].length + 1) * sc, 0) - sc;
// Du haut en bas des lettres : de l'or clair à l'ambre.
const OR = ['#fff3c2', '#ffe48a', '#ffd35a', '#f7b443', '#ec9636', '#d8762c', '#b45a24'];

// --- Le tramage (Bayer 4 × 4), les couleurs, les courbes ------------------------------------------------------------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const seuil = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const CIEL = ['#100922', '#1c1036', '#2e1549', '#481c56', '#6c2758', '#963654', '#c2524b', '#e27e4c', '#f4ad5e', '#f9cf7a'].map(rgb);
const NOIR_TOUR = '#0b0612';
const onde = (a) => (Math.sin(a) + 0.5 * Math.sin(1.7 * a + 1.3) + 0.25 * Math.sin(3.1 * a + 0.4)) / 1.75;
const hasard = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lisse = (u) => u * u * (3 - 2 * u);

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const toile = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.max(1, w), height: Math.max(1, h) });

// Une pièce de la planche des décorations, son vert de remplissage effacé (gardée une fois découpée).
const pieces = new WeakMap();
function piece(deco, [sx, sy, w, h, effacer]) {
  let cache = pieces.get(deco);
  if (!cache) pieces.set(deco, (cache = new Map()));
  const cle = `${sx},${sy},${w},${h}`;
  if (cache.has(cle)) return cache.get(cle);
  const c = toile(w, h), g = c.getContext('2d');
  g.drawImage(deco, sx, sy, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), p = d.data;
  for (let k = 0; k < p.length; k += 4) if (p[k] === VERT[0] && p[k + 1] === VERT[1] && p[k + 2] === VERT[2]) p[k + 3] = 0;
  g.putImageData(d, 0, 0);
  if (effacer) g.clearRect(...effacer);
  cache.set(cle, c);
  return c;
}
// Une silhouette de monstre au loin : une image de marche LPC réduite au quart, toute noire, deux yeux rouges.
const silhouettes = new WeakMap();
function silhouette(planche, col, dir) {
  let cache = silhouettes.get(planche);
  if (!cache) silhouettes.set(planche, (cache = new Map()));
  const cle = `${col},${dir}`;
  if (cache.has(cle)) return cache.get(cle);
  const c = toile(16, 16), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(planche, col * 64, (ANIM.marche[0] + DIR[dir]) * 64, 64, 64, 0, 0, 16, 16);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#07040b'; g.fillRect(0, 0, 16, 16);
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#ff3a2a';
  if (dir !== 'haut') g.fillRect(dir === 'gauche' ? 6 : 8, 4, 1, 1);
  cache.set(cle, c);
  return c;
}

// La mise en page de la scène pour une image de W × H.
export function plan(W, H) {
  const debout = H > W;
  const hz = Math.round(H * 0.58);                                          // l'horizon
  const tx = Math.round(W * (debout ? 0.7 : 0.66));                         // l'axe de la tour, au loin
  const base = hz - Math.round(H * 0.09), sommet = Math.max(10, Math.round(H * 0.045));   // le pied de la tour (sur sa montagne), son sommet
  const sc = W >= 700 ? 6 : W >= 480 ? 5 : 4;
  const x0 = Math.max(12, Math.round(W * 0.045)), y0 = Math.max(12, Math.round(H * 0.06));
  const feu = { x: Math.round(W * (debout ? 0.5 : 0.52)), y: H - Math.max(58, Math.round(H * 0.165)) };
  const cloture = feu.y - 64, porte = { x: feu.x + 84, y: cloture };          // la palissade du fond, et sa porte
  const h = base - sommet, etages = [base - Math.round(h * 0.36), base - Math.round(h * 0.64), base - Math.round(h * 0.84)];
  const oeil = { x: tx, y: Math.round((etages[2] + sommet) / 2) + 3 };
  // le chemin de la montée : de la porte du camp à la porte de la tour ; ses 6 salles (LEVEL_STRUCTURE)
  const route = [
    [porte.x, cloture], [W * 0.4, cloture - 8], [W * 0.27, hz + 26], [W * 0.33, hz + 20], [W * 0.43, hz + 16],
    [W * 0.51, hz + 11], [W * 0.47, hz + 5], [W * 0.56, hz - 4], [W * 0.6, hz - 18], [W * 0.57, hz - 26], [tx, base + 1],
  ].map(([x, y]) => [Math.round(x), Math.round(y)]);
  const salles = [2, 3, 4, 5, 6, 10].map((i) => route[i]);   // la lisière, l'épreuve, le gué, l'élite, le moulin, la porte
  return { W, H, debout, hz, tx, base, sommet, etages, oeil, sc, x0, y0, feu, cloture, porte, route, salles,
    riviere: hz + 15, titreH: TITRE.length * 7 * sc + (TITRE.length - 1) * 2 * sc };
}

// --- Le fond : le ciel, la lueur derrière la tour, la lune, les nuages, les montagnes --------------------------------
function peindreFond(p) {
  const { W, H, hz, tx } = p, c = toile(W, H), g = c.getContext('2d');
  const img = g.createImageData(W, H), d = img.data;
  const poser = (x, y, col) => { const k = (y * W + x) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; };
  for (let y = 0; y < hz + 4; y++) for (let x = 0; x < W; x++) {
    // le couchant est derrière la tour : le ciel s'y éclaire
    const pres = Math.max(0, 1 - Math.hypot((x - tx) / (W * 0.45), (y - hz) / (hz * 0.9)));
    const v = Math.min(1, y / hz + pres * 0.28) * (CIEL.length - 1), i = Math.min(CIEL.length - 2, Math.floor(v)), f = v - i;
    poser(x, y, f > seuil(x, y) ? CIEL[i + 1] : CIEL[i]);
  }
  // la lune, un croissant pâle, loin de la tour
  const lx = Math.round(W * 0.42), ly = Math.round(H * 0.11), lr = 10;
  for (let y = ly - lr; y <= ly + lr; y++) for (let x = lx - lr; x <= lx + lr; x++) {
    const dedans = Math.hypot(x - lx, y - ly) <= lr, ombre = Math.hypot(x - lx - 5, y - ly + 3) <= lr - 1;
    if (dedans && !ombre) poser(x, y, rgb(Math.hypot(x - lx, y - ly) > lr - 1.5 ? '#c9b8e0' : '#f2ead8'));
  }
  g.putImageData(img, 0, 0);
  const P = (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // les bancs de nuages, éclairés par-dessous
  const banc = (cx, cy, long, epais, haut, bas) => {
    for (let y = -epais; y <= epais; y++) for (let x = -long; x <= long; x++) {
      const q = Math.hypot(x / long, y / epais) + 0.18 * onde(x * 0.15 + cy);
      if (q < 1 && (1 - q) * 3 > seuil(cx + x, cy + y)) P(y > epais * 0.25 ? bas : haut, cx + x, cy + y);
    }
  };
  [[0.12, 0.2, 70, 6, '#3a1a4e', '#6a2c5a'], [0.3, 0.3, 90, 5, '#4a1d52', '#8c3a58'], [0.9, 0.24, 60, 5, '#3a1a4e', '#6a2c5a'],
    [0.2, 0.5, 110, 4, '#7a2e56', '#d0604c'], [0.84, 0.46, 80, 4, '#6c2a56', '#c45a4c'], [0.06, 0.56, 60, 3, '#9a3e52', '#ec9050']]
    .forEach(([fx, fy, long, epais, haut, bas]) => banc(Math.round(W * fx), Math.round(hz * fy * 1.5), long, epais, haut, bas));
  // deux crêtes lointaines, puis la montagne de la tour, noire et dentelée, qui monte vers son pied
  for (let x = 0; x < W; x++) {
    const a = Math.round(hz - 40 - 16 * onde(x * 0.011) - 6 * onde(x * 0.043 + 3));
    const b = Math.round(hz - 18 - 9 * onde(x * 0.019 + 7) - 3 * onde(x * 0.08));
    P('#57265a', x, a, 1, hz - a); P('#9a4560', x, a, 1, 1);
    P('#3c1a48', x, b, 1, hz - b + 2); P('#5a2852', x, b, 1, 1);
    const ecart = Math.abs(x - tx) / (W * 0.22);
    if (ecart < 1) {   // le pic de la tour : raide près d'elle, dentelé, ses arêtes éclairées par le couchant derrière
      const m = Math.round(p.base - 3 + (b + 2 - p.base + 3) * Math.pow(ecart, 1.35) - 7 * Math.abs(onde(x * 0.23)) * ecart * (1 - ecart) * 3 - (hasard(x) > 0.82 ? 2 : 0));
      if (m < b + 2) {
        // la même roche que la colline : la couleur de la crête, son arête claire, et une ombre tramée vers la tour
        for (let y = m; y < b + 2; y++) P((Math.abs(x - tx) < 26 && (y - m) / 10 + Math.abs(x - tx) / 26 < 1 + seuil(x, y) * 0.6) ? '#331640' : '#3c1a48', x, y, 1, 1);
        P(x < tx ? '#6a2c56' : '#5a2852', x, m, 1, 1);
        if ((x * 7) % 11 === 0) P(x < tx ? '#4e2252' : '#33163e', x, m + 1, 1, 3 + (x % 5));   // les strates de la roche
      }
    }
  }
  return c;
}

// La tour, au loin : trois étages qui s'affinent, des contreforts en lames, deux cornes au sommet et la lueur entre elles.
function peindreTour(p) {
  const { W, H, tx, base, sommet, etages, oeil } = p, c = toile(W, H), g = c.getContext('2d');
  const P = (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const corps = (y0, y1, d0, d1) => {   // une tranche de la tour, de y0 (bas, demi-largeur d0) à y1 (haut, d1)
    for (let y = y1; y <= y0; y++) {
      const d = Math.round(d1 + (d0 - d1) * (y - y1) / Math.max(1, y0 - y1));
      P(NOIR_TOUR, tx - d, y, d * 2 + 1, 1);
      P('#5a2246', tx - d, y, 1, 1); P('#3a1636', tx + d, y, 1, 1);   // le couchant derrière : les deux flancs bordés
    }
  };
  const corniche = (y, d) => {
    P(NOIR_TOUR, tx - d, y - 2, d * 2 + 1, 3); P('#6a2a4e', tx - d, y - 2, d * 2 + 1, 1);
    for (let x = tx - d; x <= tx + d; x += 3) P(NOIR_TOUR, x, y - 5, 1, 3);   // les épines
    P(NOIR_TOUR, tx - d - 2, y - 4, 2, 1); P(NOIR_TOUR, tx + d + 1, y - 4, 2, 1);
  };
  corps(base, base - 18, 30, 22);   // l'empattement, qui s'enfonce dans la montagne
  corps(base - 18, etages[0], 22, 17);
  corps(etages[0], etages[1], 15, 12);
  corps(etages[1], etages[2], 11, 8);
  corps(etages[2], oeil.y + 2, 7, 5);
  corniche(etages[0], 20); corniche(etages[1], 15); corniche(etages[2], 11);
  // des contreforts en épines le long du premier étage
  for (const cote of [-1, 1]) for (let k = 0; k < 30; k++) { const y = base - 18 - k * 2; if (y <= etages[0] + 2) break; P(NOIR_TOUR, tx + cote * (23 + Math.round(k * 0.12)) - (cote < 0 ? 1 : 0), y, 2, 2); }
  // les deux cornes qui se referment au-dessus de la lueur
  const n = oeil.y - sommet + 4;
  for (let k = 0; k <= n; k++) {
    const y = oeil.y + 4 - k, ouv = Math.round(3 + 5 * Math.sin(Math.PI * k / n));
    P(NOIR_TOUR, tx - ouv - 2, y, 2, 1); P(NOIR_TOUR, tx + ouv + 1, y, 2, 1);
    if (k % 3 === 0) P('#5a2246', tx - ouv - 2, y, 1, 1);
  }
  P(NOIR_TOUR, tx - 1, base - 7, 3, 7);   // la porte, noire dans le noir, et son seuil
  P('#3a1636', tx - 3, base, 7, 1);
  // la colline passe devant la base de la tour : une lèvre de roche dentelée, plus haute sur les côtés, avec son arête claire,
  // et une frange tramée entre le noir de la tour et la roche
  for (let x = tx - 46; x <= tx + 46; x++) {
    const ecart = Math.abs(x - tx), haut = Math.round(base + 3 - Math.max(0, ecart - 5) * 0.22 - 2 * Math.abs(onde(x * 0.7)));
    if (ecart < 5) continue;   // (la porte reste visible)
    for (let y = haut - 3; y < haut; y++) if (seuil(x, y) < (y - haut + 4) / 4) P('#331640', x, y, 1, 1);
    P('#3c1a48', x, haut, 1, base + 12 - haut); P(x < tx ? '#6a2c56' : '#5a2852', x, haut, 1, 1);
  }
  for (const [dx, h] of [[-34, 12], [-26, 8], [-44, 6], [29, 10], [37, 14], [46, 7]]) {   // des aiguilles de roche, devant
    const x0 = tx + dx, y0 = base + 6 + Math.round(Math.abs(dx) * 0.1);
    for (let k = 0; k < h; k++) { const l = Math.max(1, Math.round((h - k) * 0.4)); P('#3c1a48', x0 - (l >> 1), y0 - k, l, 1); }
    P(dx < 0 ? '#6a2c56' : '#5a2852', x0 - 1, y0 - h + 1, 1, Math.max(2, h >> 1));
  }
  return c;
}

// --- La plaine : le chemin de la montée, la lisière, la rivière et son gué, le moulin ; puis le sol du camp -------------
function peindrePlaine(p, images) {
  const { W, H, hz } = p, c = toile(W, H), g = c.getContext('2d');
  const P = (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // la plaine : l'herbe LPC assombrie par le soir, voilée près de l'horizon
  const sol = toile(W, H - hz), gs = sol.getContext('2d');
  if (images.herbe) for (let y = 0; y < sol.height; y += 32) for (let x = 0; x < W; x += 32) {
    gs.drawImage(images.herbe, 32, 96, 32, 32, x, y, 32, 32);
    const hh = hasard(x * 7 + y);
    if (hh > 0.7) gs.drawImage(images.herbe, Math.floor(hh * 10) % 3 * 32, 160, 32, 32, x, y, 32, 32);
  } else { gs.fillStyle = '#3d6b2e'; gs.fillRect(0, 0, W, sol.height); }
  // la place du camp, en terre battue, autour du feu (dans la palissade)
  const masque = toile(W, H - hz), gm = masque.getContext('2d');
  gm.fillStyle = '#000';
  const rx = W * 0.4, ry = (H - p.cloture) * 0.62;
  for (let y = p.cloture; y < H; y++) for (let x = 0; x < W; x++) {
    const q = Math.hypot((x - p.feu.x) / rx, (y - p.feu.y + 6) / ry);
    if (q < 0.85 || (q < 1.1 && (1.1 - q) / 0.25 > seuil(x, y))) gm.fillRect(x, y - hz, 1, 1);
  }
  if (images.terre) { gm.globalCompositeOperation = 'source-in'; for (let y = 0; y < masque.height; y += 32) for (let x = 0; x < W; x += 32) gm.drawImage(images.terre, 32, 96, 32, 32, x, y, 32, 32); }
  gs.drawImage(masque, 0, 0);
  for (let y = 0; y < sol.height; y += 3) {   // le soir, par bandes de 3 pixels
    const u = y / sol.height;
    gs.fillStyle = `rgba(${Math.round(64 - 44 * u)}, ${Math.round(30 - 16 * u)}, ${Math.round(88 - 46 * u)}, ${(0.8 - 0.1 * u).toFixed(2)})`;
    gs.fillRect(0, y, W, 3);
  }
  g.drawImage(sol, 0, hz);
  // la rivière, qui coupe la plaine, avec le reflet du couchant
  for (let x = 0; x < W; x++) {
    const y = p.riviere + Math.round(2 * onde(x * 0.03));
    P('#3c2a5c', x, y, 1, 3); P('#7a4a78', x, y, 1, 1);
  }
  // la lisière : un bois sombre que le chemin traverse
  for (let k = 0; k < 46; k++) {
    const x = Math.round(W * (0.1 + 0.26 * hasard(k + 5))), y = Math.round(hz + 18 + 14 * hasard(k + 9)), h = 7 + Math.floor(hasard(k + 2) * 8);
    for (let r = 0; r < h; r++) { const dm = Math.round(r * 0.35); P('#120a1c', x - dm, y - h + r, dm * 2 + 1, 1); }
  }
  // le moulin, sur sa butte (ses ailes tournent : dessinées à chaque image)
  const [mx, my] = p.route[6];
  for (let x = -14; x <= 14; x++) P('#22122e', mx + x, my + 1 - Math.round(4 * (1 - Math.abs(x) / 14)), 1, 5);
  P('#140a1c', mx - 3, my - 14, 7, 12); P('#140a1c', mx - 4, my - 16, 9, 2); P('#140a1c', mx - 2, my - 18, 5, 2);
  P('#ffb05a', mx, my - 8, 1, 2);
  // le chemin de la montée : de la terre pâle, en pointillés vers la tour
  g.fillStyle = '#8a6a64';
  for (let i = 1; i < p.route.length; i++) {
    const [ax, ay] = p.route[i - 1], [bx, by] = p.route[i], n = Math.max(1, Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n), large = y > hz + 22 ? 3 : y > hz + 8 ? 2 : 1;
      g.fillStyle = i >= 8 ? '#3e2846' : '#8a6a64';   // (sur la montagne, le chemin se devine à peine)
      g.fillRect(x, y, large, 1);
    }
  }
  for (const i of [8, 9]) { const [x, y] = p.route[i]; P('#ff9a40', x, y - 2, 1, 2); P('#ffd36b', x, y - 3, 1, 1); }   // deux torches sur la montée
  // le gué : des pierres dans l'eau
  const [gx] = p.salles[2];
  for (let k = -2; k <= 2; k++) P('#8a7a90', gx + k * 3, p.riviere + 1 + (k % 2), 2, 1);
  return c;
}

// La palissade du camp : des pieux taillés en pointe au fond, une porte haute vers le chemin, et deux côtés en biais.
function peindreCloture(p) {
  const { W, H, cloture, porte } = p, c = toile(W, H), g = c.getContext('2d');
  const P = (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const pieu = (x, pied, h, l = 6) => {
    P('#3b2716', x, pied - h, l, h); P('#6b4226', x, pied - h, 1, h); P('#85581b', x + 1, pied - h, 1, h); P('#2b1c1d', x + l - 1, pied - h, 1, h);
    for (let k = 0; k < 3; k++) P('#3b2716', x + k, pied - h - 3 + k, l - k * 2, 1);   // la pointe
    P('#2b1c1d', x, pied - h + Math.round(h * 0.3), l, 1); P('#2b1c1d', x, pied - h + Math.round(h * 0.75), l, 1);   // les liens
  };
  const g0 = Math.round(W * 0.08), g1 = Math.round(W * 0.95);
  for (let x = g0; x < g1; x += 6) if (Math.abs(x + 3 - porte.x) > 18) pieu(x, cloture, 26 + Math.round(2 * hasard(x)));
  // les côtés, qui descendent vers le premier plan en grandissant
  for (let k = 0; k < 14; k++) {
    const u = k / 13, y = Math.round(cloture + (H - 10 - cloture) * u), h = Math.round(26 + 22 * u), l = Math.round(6 + 4 * u);
    pieu(Math.round(g0 - 12 - u * W * 0.1), y, h, l);
    pieu(Math.round(g1 + u * W * 0.06), y, h, l);
  }
  // la porte : deux grands poteaux, un linteau, et l'écu du camp
  for (const dx of [-20, 15]) { P('#3b2716', porte.x + dx, cloture - 58, 6, 58); P('#85581b', porte.x + dx + 1, cloture - 58, 1, 58); P('#2b1c1d', porte.x + dx + 5, cloture - 58, 1, 58); P('#3b2716', porte.x + dx - 1, cloture - 62, 8, 4); }
  P('#3b2716', porte.x - 24, cloture - 54, 49, 6); P('#85581b', porte.x - 24, cloture - 54, 49, 1); P('#2b1c1d', porte.x - 24, cloture - 49, 49, 1);
  P('#b78c41', porte.x - 4, cloture - 46, 9, 9); P('#ffd35a', porte.x - 3, cloture - 45, 7, 1); P('#986a20', porte.x - 4, cloture - 38, 9, 1);
  P('#b8322a', porte.x - 1, cloture - 43, 3, 4);
  return c;
}

// Le premier plan : de grands sapins noirs aux deux bords, des herbes hautes en bas, et les coins assombris.
function peindreAvant(p) {
  const { W, H } = p, c = toile(W, H), g = c.getContext('2d');
  const sapin = (x, base, h, col) => {
    g.fillStyle = col;
    for (let k = 0; k < h; k++) { const demi = Math.round((k % 9) * 1.1 + k * 0.3); g.fillRect(x - demi, base - h + k, demi * 2 + 1, 1); }
    g.fillRect(x - 2, base, 5, 8);
  };
  const gauche = p.debout ? [[0.03, 120]] : [[0.01, 190], [0.06, 130]];
  const droite = p.debout ? [[0.97, 130]] : [[0.995, 200], [0.955, 120]];
  for (const [fx, h] of [...gauche, ...droite]) sapin(Math.round(W * fx), H - 6, h, '#080c0b');
  for (let k = 0; k < W; k += 3) {   // les herbes hautes
    const h = 4 + Math.floor(hasard(k) * 9);
    g.fillStyle = hasard(k + 3) > 0.5 ? '#0b120d' : '#070a09';
    g.fillRect(k, H - h, 1, h); g.fillRect(k + 1, H - Math.floor(h * 0.6), 1, h);
  }
  const img = g.getImageData(0, 0, W, H), d = img.data;   // le vignettage, tramé
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = Math.hypot((x - W / 2) / (W * 0.62), (y - H * 0.45) / (H * 0.7));
    if (q > 0.78 && (q - 0.78) * 2.2 > seuil(x, y)) { const k = (y * W + x) * 4; if (d[k + 3] === 0) { d[k] = 7; d[k + 1] = 4; d[k + 2] = 11; d[k + 3] = 150; } }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Une lueur tramée (pour le feu sur le sol, et la lueur de la tour), en plusieurs tailles.
function peindreLueur(rx, ry = Math.round(rx * 0.4), couleurs = ['#ffb45a', '#e07a3a']) {
  const c = toile(rx * 2 + 1, ry * 2 + 1), g = c.getContext('2d');
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const q = Math.hypot(x / rx, y / ry);
    if (q < 1 && (1 - q) * 0.85 > seuil(x + rx, y + ry)) { g.fillStyle = q < 0.45 ? couleurs[0] : couleurs[1]; g.fillRect(x + rx, y + ry, 1, 1); }
  }
  return c;
}

// Le titre en lettres de pixels : un contour sombre, un liseré de bronze, l'or qui fonce vers le bas, un filet dessous.
function peindreTitre(p) {
  const { sc } = p, larges = TITRE.map((l) => largeurTexte(l, sc)), w = Math.max(...larges), pas = 9 * sc;
  const c = toile(w + 6, p.titreH + 14), g = c.getContext('2d'), pleins = [];
  TITRE.forEach((ligne, n) => {
    let x = 3 + Math.round((w - larges[n]) / 2);
    for (const ch of ligne) {
      const rangs = glyphe(ch);
      rangs.forEach((r, ry) => { for (let k = 0; k < r.length; k++) if (r[k] === '1') pleins.push([x + k * sc, 3 + n * pas + ry * sc, ry]); });
      x += (rangs[0].length + 1) * sc;
    }
  });
  g.fillStyle = '#0a0612'; for (const [x, y] of pleins) g.fillRect(x - 1, y + 3, sc + 2, sc + 1);
  g.fillStyle = '#2b1c1d'; for (const [x, y] of pleins) g.fillRect(x - 2, y - 2, sc + 4, sc + 4);
  g.fillStyle = '#7a4a1e'; for (const [x, y] of pleins) g.fillRect(x - 1, y - 1, sc + 2, sc + 2);
  for (const [x, y, ry] of pleins) {
    g.fillStyle = OR[ry]; g.fillRect(x, y, sc, sc);
    if (ry === 0) { g.fillStyle = '#fffbe8'; g.fillRect(x, y, sc, 1); }
  }
  const fy = p.titreH + 7, mx = 3 + Math.round(w / 2);
  g.fillStyle = '#2b1c1d'; g.fillRect(3, fy, w, 3);
  g.fillStyle = '#e0b04a'; g.fillRect(4, fy + 1, w - 2, 1);
  for (let k = 0; k < 4; k++) { g.fillStyle = '#2b1c1d'; g.fillRect(mx - k - 1, fy - 2 + k, k * 2 + 3, 1); g.fillRect(mx - k - 1, fy + 4 - k, k * 2 + 3, 1); }
  for (let k = 0; k < 3; k++) { g.fillStyle = '#ffd35a'; g.fillRect(mx - k, fy - 1 + k, k * 2 + 1, 1); g.fillRect(mx - k, fy + 3 - k, k * 2 + 1, 1); }
  return c;
}

// Une ligne de pixels (Bresenham).
function trait(g, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
// Une étoffe qui flotte : chaque rangée glisse un peu, davantage vers le bas.
function flotter(g, src, x, y, t, amp = 2) {
  for (let r = 0; r < src.height; r++) g.drawImage(src, 0, r, src.width, 1, x + Math.round(Math.sin(t * 2.4 + r * 0.16) * amp * (r / src.height)), y + r, src.width, 1);
}
// Ce que fait un héros à l'instant t : le repos, et de temps en temps un geste (de profil : un coup ; de face : un sort).
export function geste(i, dir, t) {
  const periode = 6 + i * 1.4, u = (t + i * 2.3) % periode, duree = 1.1;
  if (u < periode - duree) return { rang: ANIM.repos[0] + DIR[dir], col: Math.floor(t * 1.6 + i) % 2, geste: false };
  const a = dir === 'gauche' || dir === 'droite' ? ANIM.taille : ANIM.sort, v = (u - (periode - duree)) / duree;
  return { rang: a[0] + DIR[dir], col: Math.min(a[1] - 1, Math.floor(v * a[1])), geste: true };
}

// --- L'écran titre ------------------------------------------------------------------------------------------------
// images : celles de chargerImagesTitre() ; code : un code de groupe déjà connu (?code=) ; onChoix({ action, code }).
// choisi : l'id du héros choisi (par défaut, celui gardé dans ce navigateur).
// figer : pas de boucle d'animation ni de descente (les vérifications et les captures dessinent avec dessinerA).
// mode : 'arrivee' (en venant du dashboard : la descente depuis le ciel), 'retour' (le chemin vers le dashboard : pas de
// menu, la caméra remonte au ciel avec versLeCiel()).
export function creerTitre({ images, stamp = 'dev', code = '', onChoix = () => {}, figer = false, choisi = heroChoisi(), mode = 'arrivee', aller = allerVers }) {
  if (figer) mode = 'fige';
  habiller();   // les textures du HUD épique (33_cadres.js) : les cadres en bois du menu et d'« Autour du feu »
  const scene = el('canvas', { class: 'titre-scene', 'aria-hidden': 'true' });
  const hd = el('canvas', { class: 'titre-bascule', 'aria-hidden': 'true', hidden: true });   // la bascule, à la pleine résolution de l'écran
  const g0 = scene.getContext('2d');
  const statut = el('p', { class: 'titre-statut', role: 'status' });
  const champ = el('input', { class: 'titre-code', 'aria-label': 'Code du groupe', placeholder: 'CODE', maxlength: '5', size: '5', autocomplete: 'off', spellcheck: 'false' });
  champ.value = nettoyer(code);
  champ.addEventListener('input', () => { champ.value = champ.value.toUpperCase(); statut.textContent = ''; });
  const panRejoindre = el('form', { class: 'titre-sous', hidden: true, onsubmit: (e) => { e.preventDefault(); valider(); } },
    el('label', { class: 'titre-note' }, 'Le code de cinq lettres de l’hôte'),
    el('div', { class: 'titre-ligne' }, champ, el('button', { class: 'titre-petit', type: 'submit' }, 'Entrer')), statut);
  const curseurs = {};
  const panReglages = el('div', { class: 'titre-sous', hidden: true },
    ...[['musique', 'Musique'], ['effets', 'Effets']].map(([id, nom]) => {
      const valeur = el('output', { class: 'titre-valeur' });
      const curseur = el('input', { type: 'range', min: '0', max: '100', step: '5', 'aria-label': nom, oninput: () => regler(id, curseur.value / 100) });
      curseurs[id] = { curseur, valeur };
      return el('label', { class: 'titre-reglage' }, el('span', {}, nom), curseur, valeur);
    }));
  const bouton = (action, texte, note, extra = {}) => el(extra.href ? 'a' : 'button', { class: 'titre-choix', 'data-action': action, ...(extra.href ? {} : { type: 'button' }), ...extra },
    el('span', { class: 'titre-choix-nom' }, texte), note && el('span', { class: 'titre-choix-note' }, note));
  const items = [
    bouton('jouer', 'Jouer', 'entrer au camp (pour inviter tes amis : « Jouer à plusieurs », au camp)', { onclick: () => choisir('jouer') }),
    bouton('rejoindre', 'Rejoindre', 'le camp d’un ami, avec son code', { onclick: () => basculer(panRejoindre, champ) }),
    bouton('reglages', 'Réglages', 'la musique et les effets', { onclick: () => basculer(panReglages, curseurs.musique.curseur) }),
    bouton('dashboard', 'Retour au dashboard', null, { href: DASHBOARD, target: '_top', onclick: (e) => { e.preventDefault(); versDashboard(); } }),
  ];
  const menu = el('nav', { class: 'titre-menu cadre-epique', 'aria-label': 'Menu principal' }, items[0], items[1], panRejoindre, items[2], panReglages, items[3]);

  const autour = sieges({ choisi }).map((h, i) => ({ ...h, ...PLACES[i], qui: h.id === choisi ? 'toi' : h.auteur ?? 'set de base' }));
  const equipe = el('section', { class: 'titre-equipe cadre-epique', 'aria-label': 'Autour du feu' },
    el('h2', {}, 'Autour du feu'),
    el('ul', {}, autour.map((h) => el('li', {},
      images[h.image] ? Object.assign(medaillon(images[h.image]), { className: 'titre-medaillon', role: 'img', ariaLabel: `Le portrait de ${h.nom}` }) : null,
      el('span', { class: 'titre-heros' }, h.nom), el('span', { class: 'titre-qui' }, h.qui)))));
  const racine = el('div', { id: 'titre', class: `titre${mode === 'arrivee' ? ' intro' : mode === 'retour' ? ' fini retour' : ''}`, role: 'dialog', 'aria-label': TITRE.join(' ') },
    scene, hd, el('h1', { class: 'titre-nom' }, TITRE.join(' ')), menu, equipe,
    el('p', { class: 'titre-aide' }, '↑ ↓ choisir · Entrée valider'),
    el('p', { class: 'titre-tampon' }, `version du ${stamp}`));
  document.body.append(racine);
  document.documentElement.classList.add('a-titre');

  let p = null, L = {}, s = 1, image = null, camp = null, scratch = null;
  let choix = null, tCiel = null, tDescente = null, tRemontee = null, finDescente = null, raf = 0, dernier = null, tCourant = 0;
  const t0 = performance.now(), braises = [], fumees = [];
  const trames = [...Array(17)].map((_, n) => {   // 17 niveaux de noir tramé, pour les fondus
    const c = toile(4, 4), cg = c.getContext('2d'); cg.fillStyle = '#07040b';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (seuil(x, y) < n / 16) cg.fillRect(x, y, 1, 1);
    return g0.createPattern(c, 'repeat');
  });

  function mesurer() {
    const vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight);
    s = vh > vw ? Math.max(1, Math.floor(vw / 380)) : Math.max(1, Math.round(vh / HAUTEUR_VISEE));
    if (s > 1 && vw / s < 560 && vh <= vw) s -= 1;
    const W = Math.ceil(vw / s), H = Math.ceil(vh / s);
    if (p && p.W === W && p.H === H) return;
    p = plan(W, H);
    scene.width = W; scene.height = H;
    scene.style.width = `${W * s}px`; scene.style.height = `${H * s}px`;
    L = { fond: peindreFond(p), tour: peindreTour(p), plaine: peindrePlaine(p, images), cloture: peindreCloture(p), avant: peindreAvant(p), titre: peindreTitre(p),
      lueurs: [104, 110, 116].map((r) => peindreLueur(r)), halo: peindreLueur(22, 22, ['#ffd36b', '#ff7a3a']), ciel: peindreCielHaut(p) };
    image = toile(W, H); camp = toile(W, H); scratch = toile(L.titre.width, L.titre.height);
    // le HUD, en pixels d'écran : de la taille des lettres du titre, quelle que soit l'échelle de la scène
    racine.style.setProperty('--s', Math.max(2, Math.min(5, Math.round(vh / 300), Math.floor(vw / 150))));
    menu.style.left = `${p.x0 * s}px`; menu.style.top = `${(p.y0 + L.titre.height + 6) * s}px`;
    g0.imageSmoothingEnabled = false;
  }

  // Les objets du camp, autour du feu.
  function objetsDuCamp() {
    const { x: fx, y: fy } = p.feu, deco = images.deco, objets = [];
    if (!deco) return objets;
    const large = p.W >= 760;   // sur une image étroite, le camp se resserre : la tente du fond, la cible et deux tonneaux restent dehors
    const poser = (nom, x, pied, miroir = false) => { const im = piece(deco, PIECES[nom]); objets.push({ im, x: Math.round(x - im.width / 2), y: Math.round(pied - im.height), pied, miroir }); };
    // (en vue de trois quarts, le toit d'une tente couvre le sol derrière elle, sur environ les deux tiers de sa hauteur :
    // posées à l'avant, à plus de TENTE_FOND du pied de la palissade, elles restent dans l'enceinte)
    poser('tente', fx - 188, Math.max(fy + 36, p.cloture + TENTE_FOND));
    if (large) poser('tente', fx + 252, Math.max(fy + 36, p.cloture + TENTE_FOND));
    poser('bois', fx - 300, fy - 24);
    poser('buche', fx - 104, fy + 42);
    poser('buche', fx + 92, fy + 30);
    poser('foyer', fx + 106, fy - 8);
    poser('ratelier', fx + 166, fy - 30);
    poser('fleches', fx + 124, fy + 30);
    if (large) poser('cible', fx + 160, fy + 50);
    if (images.tonneau) {
      objets.push({ im: images.tonneau, sx: 64, sy: 0, sw: 64, sh: 64, x: fx - 124, y: fy - 44, pied: fy + 20 });
      if (large) objets.push({ im: images.tonneau, sx: 0, sy: 6, sw: 32, sh: 34, x: fx + 196, y: fy - 40, pied: fy - 6 });
      if (large) objets.push({ im: images.tonneau, sx: 32, sy: 22, sw: 32, sh: 36, x: fx - 344, y: fy - 14, pied: fy + 22 });
    }
    return objets;
  }

  // Une image de la scène, à l'instant t (en secondes) ; dt fait vivre les braises et la fumée.
  function dessinerA(t, dt = 1 / 60) {
    mesurer();
    tCourant = t;
    const { W, H, hz, tx, oeil, feu, porte } = p, g = image.getContext('2d');
    const P = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    g.drawImage(L.fond, 0, 0);
    // les étoiles, et parfois une étoile filante
    for (let k = 0; k < 110; k++) {
      const x = Math.floor(hasard(k * 3.1) * W), y = Math.floor(hasard(k * 7.7) * hz * 0.5);
      const v = Math.sin(t * (1 + hasard(k) * 2) + k);
      if (v > -0.3) P(v > 0.85 ? '#ffffff' : k % 3 ? '#d8c8f0' : '#a898c8', x, y);
      if (v > 0.96 && k % 5 === 0) { P('#b9a6e0', x - 1, y); P('#b9a6e0', x + 1, y); P('#b9a6e0', x, y - 1); P('#b9a6e0', x, y + 1); }
    }
    const ef = t % 17;
    if (ef < 0.7) {
      const u = ef / 0.7, x = W * 0.12 + u * W * 0.25, y = H * 0.05 + u * H * 0.1;
      for (let k = 0; k < 10; k++) { g.globalAlpha = (1 - k / 10) * (1 - u); P('#fff6e0', Math.round(x - k * 2.4), Math.round(y - k)); }
      g.globalAlpha = 1;
    }
    // la fine fissure dans le ciel : à peine visible, elle luit un instant de loin en loin
    const fl = (t % 13) < 0.9 ? 0.07 + 0.13 * Math.sin(Math.PI * (t % 13) / 0.9) : 0.07;
    g.globalAlpha = fl; g.fillStyle = '#f0b8ff';
    const fx0 = Math.round(W * 0.88), pts = [[0, 4], [4, 11], [2, 16], [8, 24], [6, 29], [11, 38]];
    for (let k = 1; k < pts.length; k++) trait(g, fx0 + pts[k - 1][0], pts[k - 1][1], fx0 + pts[k][0], pts[k][1]);
    trait(g, fx0 + 8, 24, fx0 + 13, 26);
    g.globalAlpha = 1;
    // de longs nuages fins qui glissent, et un vol d'oiseaux de temps en temps
    for (let k = 0; k < 4; k++) {
      const long = 46 + k * 14, y = Math.round(hz * (0.16 + k * 0.12)), x = Math.round(((t * (2 + k * 0.7) + hasard(k + 3) * W) % (W + long * 2)) - long);
      P('#4a1f4e', x + 8, y, long - 16, 1); P('#5a2a52', x, y + 1, long, 2); P('#a84a55', x + 4, y + 3, long - 10, 1);
    }
    const vol = t % 23;
    if (vol < 9) {
      const bx = W * 1.05 - vol / 9 * W * 1.2, by = hz * 0.32 + Math.sin(vol) * 4;
      for (let k = 0; k < 5; k++) {
        const x = Math.round(bx + k * 7 + (k % 2) * 3), y = Math.round(by + Math.abs(k - 2) * 4), b = Math.floor(t * 7 + k) % 2;
        P('#1a0e24', x - 2, y - b, 2, 1); P('#1a0e24', x, y, 1, 1); P('#1a0e24', x + 1, y - b, 2, 1);
      }
    }
    // la tour : la lueur du gardien qui balaie la plaine, la tour par-dessus, ses fenêtres, la lueur et ses cendres
    const balai = Math.PI / 2 + Math.sin(t * 0.22) * 0.75, long = H * 1.1;
    g.globalAlpha = 0.07; g.fillStyle = '#ffb060';
    g.beginPath(); g.moveTo(oeil.x, oeil.y);
    g.lineTo(oeil.x + Math.cos(balai - 0.07) * long, oeil.y + Math.sin(balai - 0.07) * long);
    g.lineTo(oeil.x + Math.cos(balai + 0.07) * long, oeil.y + Math.sin(balai + 0.07) * long); g.fill();
    g.globalAlpha = 1;
    g.drawImage(L.tour, 0, 0);
    [p.base - 18, ...p.etages].forEach((ye, n) => {   // les fenêtres : des fentes rouges, sur chaque étage
      const bas = n === 0 ? p.base - 22 : ye, haut = n === 0 ? p.etages[0] + 6 : (p.etages[n] ?? oeil.y) + 6, large = [16, 11, 8, 5][n];
      for (let y = haut, k = 0; y < bas - 3; y += 11, k++) for (const c of [-1, 1]) {
        if ((k + n + (c > 0 ? 1 : 0)) % 2) continue;
        P(Math.sin(t * 4 + k * 1.3 + n * 2 + c) > -0.4 ? '#ff6a2a' : '#a8341e', tx + c * Math.round(large * 0.45), y, 1, 3);
      }
    });
    const pouls = 0.75 + 0.25 * Math.sin(t * 2.2);
    g.globalAlpha = 0.4 * pouls; g.drawImage(L.halo, oeil.x - 22, oeil.y - 22); g.globalAlpha = 1;
    P('#ff7a3a', oeil.x - 2, oeil.y - 1, 5, 3); P('#ffd36b', oeil.x - 1, oeil.y - 1, 3, 3); P(pouls > 0.9 ? '#ffffff' : '#fff2c0', oeil.x, oeil.y, 1, 1);
    const lp = t % 9, eclat = lp < 1.5 ? Math.sin(Math.PI * lp / 1.5) : 0;   // et parfois l'éclat de couleurs
    if (eclat > 0) {
      ['#ff5f6d', '#ff9f43', '#ffe066', '#7dff8f', '#5ec4ff', '#b98aff'].forEach((c, i) => {
        const a = 0.22 + i * 0.1, Lr = 8 + 24 * eclat;
        g.globalAlpha = Math.min(1, eclat * 1.2); g.fillStyle = c;
        trait(g, oeil.x + 3, oeil.y + 1, oeil.x + 3 + Math.cos(a) * Lr, oeil.y + 1 + Math.sin(a) * Lr);
      });
      g.globalAlpha = 1;
    }
    for (let k = 0; k < 7; k++) {   // les cendres qui tournent autour du sommet
      const a = t * 0.6 + k * 0.9, x = Math.round(tx + Math.cos(a) * (20 + k * 3)), y = Math.round(oeil.y - 4 + Math.sin(a) * 6 + k);
      g.globalAlpha = 0.5; P('#24112e', x, y, 4, 2); P('#24112e', x + 1, y - 1, 2, 1); g.globalAlpha = 1;
    }
    for (let k = 0; k < 3; k++) {   // des chauves-souris autour des cornes
      const a = t * (0.9 + k * 0.3) + k * 2.1, x = Math.round(tx + Math.cos(a) * (26 + k * 10)), y = Math.round(oeil.y + 10 + Math.sin(a * 1.3) * 8);
      const bat = (Math.floor(t * 9 + k) % 2) ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]];
      for (const [bx, by] of bat) P('#0d0812', x + bx, y + by);
    }
    // la plaine, et ce qui y vit : les reflets de la rivière, les ailes du moulin, un feu par salle, les monstres
    g.drawImage(L.plaine, 0, 0);
    for (let k = 0; k < 14; k++) { const x = Math.round((hasard(k + 70) * W + t * (6 + k % 3)) % W); if (Math.sin(t * 3 + k) > 0.2) P('#f4ad5e', x, p.riviere + Math.round(2 * onde(x * 0.03)), 2, 1); }
    const [mx, my] = p.route[6], aile = t * 0.9;
    g.fillStyle = '#140a1c';
    for (let k = 0; k < 4; k++) { const a = aile + k * Math.PI / 2; trait(g, mx, my - 14, mx + Math.cos(a) * 11, my - 14 + Math.sin(a) * 11); }
    p.salles.forEach(([x, y], k) => {
      const v = Math.sin(t * 7 + k * 1.9);
      g.globalAlpha = 0.5; P('#ff9a40', x - 1, y - 2, 3, 2); g.globalAlpha = 1;
      P(v > 0 ? '#ffd36b' : '#ff9a40', x, y - 2, 1, 1 + (v > 0.5 ? 1 : 0));
    });
    [['sbire', 2, 10], ['brute', 3, 8], ['chef', 5, 6]].forEach(([nom, i, amp], k) => {
      if (!images[nom]) return;
      const [sx, sy] = p.salles[i], va = Math.sin(t * 0.5 + k * 2), dir = Math.cos(t * 0.5 + k * 2) > 0 ? 'droite' : 'gauche';
      g.drawImage(silhouette(images[nom], 1 + Math.floor(t * 8 + k) % 8, dir), Math.round(sx - 8 + va * amp), sy - 15);
    });

    // (pendant la bascule vers le camp : le ciel et la plaine, sans le camp de l'écran titre, servent au-dessus de l'horizon)
    if ((tDescente != null || tRemontee != null) && sansCamp) sansCamp.getContext('2d').drawImage(image, 0, 0);
    // le camp : la palissade, les objets, la sentinelle, les rats et les héros, triés de haut en bas,
    // assombris par le soir puis réchauffés par le feu
    const gc = camp.getContext('2d');
    gc.globalCompositeOperation = 'source-over'; gc.globalAlpha = 1; gc.clearRect(0, 0, W, H); gc.imageSmoothingEnabled = false;
    gc.drawImage(L.cloture, 0, 0);
    const corps = objetsDuCamp().map((o) => ({ pied: o.pied, dessiner: () => {
      if (o.sw) gc.drawImage(o.im, o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.sw, o.sh);
      else if (o.miroir) { gc.save(); gc.translate(o.x + o.im.width, o.y); gc.scale(-1, 1); gc.drawImage(o.im, 0, 0); gc.restore(); }
      else gc.drawImage(o.im, o.x, o.y);
    } }));
    if (images.deco) for (const [dx, k, ph] of [[-92, 3, 0], [136, 1, 1.7], ...(W >= 760 ? [[-340, 4, 0.9]] : [])]) {   // les mâts des bannières
      const x = feu.x + dx, pied = feu.y - 26, haut = 96, tissu = piece(images.deco, BANNIERE(k));
      corps.push({ pied, dessiner: () => {
        gc.fillStyle = '#3b2716'; gc.fillRect(x - 1, pied - haut, 3, haut); gc.fillStyle = '#6b4226'; gc.fillRect(x - 1, pied - haut, 1, haut);
        gc.fillStyle = '#3b2716'; gc.fillRect(x - 14, pied - haut + 3, 29, 3); gc.fillStyle = '#ffd35a'; gc.fillRect(x, pied - haut - 3, 2, 3);
        flotter(gc, tissu, x - 16, pied - haut + 4, t + ph, 2.5);
      } });
    }
    autour.forEach((h, i) => {
      const im = images[h.image];
      if (!im) return;
      const x = feu.x + h.dx, y = feu.y + h.dy, a = geste(i, h.dir, t);
      corps.push({ pied: y, dessiner: () => {
        gc.globalAlpha = 0.45; gc.fillStyle = '#050806'; gc.fillRect(x - 10, y - 2, 20, 3); gc.globalAlpha = 1;
        gc.drawImage(im, a.col * 64, a.rang * 64, 64, 64, x - 32, y - 61, 64, 64);
      } });
    });
    if (images.sentinelle) {   // la sentinelle garde la porte : elle y fait les cent pas
      const u = (t * 0.1) % 2, aller = u < 1, k = aller ? u : 2 - u, pause = k < 0.15 || k > 0.85;
      const x = Math.round(porte.x - 9 + 18 * lisse(Math.min(1, Math.max(0, (k - 0.15) / 0.7)))), y = porte.y + 6, dir = pause ? 'bas' : aller ? 'droite' : 'gauche';
      const col = pause ? 0 : 1 + Math.floor(t * 9) % 8;
      corps.push({ pied: y, dessiner: () => gc.drawImage(images.sentinelle, col * 64, (ANIM.marche[0] + DIR[dir]) * 64, 64, 64, x - 32, y - 61, 64, 64) });
    }
    if (images.rats) {   // deux rats qui traversent le camp de temps en temps
      [[11, 0, feu.y + 44], [17, 2, feu.y - 30]].forEach(([periode, espece, y], k) => {
        const u = ((t + k * 5) % periode) / 3.2;
        if (u > 1) return;
        const vers = k ? -1 : 1, x = Math.round(vers > 0 ? -20 + u * (W + 40) : W + 20 - u * (W + 40)), col = Math.floor(t * 12) % 5;
        corps.push({ pied: y, dessiner: () => {
          if (vers > 0) { gc.save(); gc.translate(x + 32, 0); gc.scale(-1, 1); gc.drawImage(images.rats, col * 32, (espece * 4 + 1) * 32, 32, 32, 0, y - 24, 32, 32); gc.restore(); }
          else gc.drawImage(images.rats, col * 32, (espece * 4 + 1) * 32, 32, 32, x, y - 24, 32, 32);
        } });
      });
    }
    const poteau = { x: feu.x - 104, pied: feu.y - 8 };   // la lanterne sur son poteau, devant la tente
    corps.push({ pied: poteau.pied, dessiner: () => {
      gc.fillStyle = '#3b2716'; gc.fillRect(poteau.x - 1, poteau.pied - 58, 3, 58); gc.fillStyle = '#6b4226'; gc.fillRect(poteau.x - 1, poteau.pied - 58, 1, 58);
      gc.fillStyle = '#3b2716'; gc.fillRect(poteau.x - 1, poteau.pied - 58, 14, 3);
    } });
    corps.sort((a, b) => a.pied - b.pied).forEach((c) => c.dessiner());
    gc.globalCompositeOperation = 'source-atop';
    gc.fillStyle = 'rgba(34, 18, 72, 0.34)'; gc.fillRect(0, 0, W, H);   // le soir
    const r = 190 * (1 + 0.04 * Math.sin(t * 9) + 0.03 * Math.sin(t * 23));
    const lum = gc.createRadialGradient(feu.x, feu.y - 18, 4, feu.x, feu.y - 18, r);
    lum.addColorStop(0, 'rgba(255, 200, 120, 0.26)'); lum.addColorStop(0.5, 'rgba(255, 140, 60, 0.14)'); lum.addColorStop(1, 'rgba(255, 120, 40, 0)');
    gc.fillStyle = lum; gc.fillRect(0, 0, W, H);
    // la lueur du feu sur le sol, sous le camp
    const lu = L.lueurs[Math.floor(t * 7) % 3];
    g.globalAlpha = 0.33; g.drawImage(lu, feu.x - (lu.width >> 1), feu.y - (lu.height >> 1) - 4);
    const braseros = [[porte.x - 30, porte.y + 6], [porte.x + 30, porte.y + 6]];
    for (const [bx, by] of braseros) g.drawImage(L.lueurs[0], 0, 0, L.lueurs[0].width, L.lueurs[0].height, bx - 26, by - 10, 52, 20);
    g.globalAlpha = 1;
    g.drawImage(camp, 0, 0);

    // ce qui brille, par-dessus : le feu, les braseros de la porte, la lanterne
    if (images.feu) g.drawImage(images.feu, (Math.floor(t * 10) % 5) * 64, 0, 64, 64, feu.x - 32, feu.y - 52, 64, 64);
    if (images.brasero) braseros.forEach(([bx, by], i) => g.drawImage(images.brasero, 16 * ((Math.floor(t * 8) + i * 2) % 4), 0, 16, 40, Math.round(bx - 8), by - 38, 16, 40));
    if (images.deco) g.drawImage(piece(images.deco, LANTERNE(1 + Math.floor(t * 4) % 3)), poteau.x + 2, poteau.pied - 58);
    if (dt > 0) {   // les braises qui montent, et la fumée qui s'en va avec le vent
      if (Math.random() < dt * 12) braises.push({ x: feu.x + (Math.random() - 0.5) * 14, y: feu.y - 20, v: 14 + Math.random() * 14, vie: 0, ph: Math.random() * 6 });
      if (Math.random() < dt * 3) fumees.push({ x: feu.x + (Math.random() - 0.5) * 6, y: feu.y - 40, vie: 0 });
      for (const b of braises) { b.vie += dt; b.y -= b.v * dt; b.x += Math.sin(b.vie * 3 + b.ph) * 8 * dt; }
      for (const f of fumees) { f.vie += dt; f.y -= 9 * dt; f.x += 5 * dt; }
      for (let k = braises.length - 1; k >= 0; k--) if (braises[k].vie > 2) braises.splice(k, 1);
      for (let k = fumees.length - 1; k >= 0; k--) if (fumees[k].vie > 5) fumees.splice(k, 1);
    }
    for (const f of fumees) {
      const taille = 2 + Math.floor(f.vie * 1.2);
      g.globalAlpha = 0.28 * (1 - f.vie / 5); g.fillStyle = '#4a3e58';
      g.fillRect(Math.round(f.x), Math.round(f.y), taille, taille); g.fillRect(Math.round(f.x) - 1, Math.round(f.y) + 1, taille + 2, taille - 1);
    }
    g.globalAlpha = 1;
    for (const b of braises) P(b.vie < 0.8 ? '#ffe08a' : b.vie < 1.4 ? '#ff9a40' : '#c8502a', Math.round(b.x), Math.round(b.y));
    for (let k = 0; k < 12; k++) {   // les lucioles
      const x = Math.round(W * (0.05 + 0.9 * hasard(k + 40)) + Math.sin(t * 0.5 + k) * 12), y = Math.round(hz + 18 + (H - hz - 40) * hasard(k + 60) + Math.cos(t * 0.7 + k * 2) * 5);
      if (Math.sin(t * 2.2 + k * 1.7) > 0.3) { P('#e6ff8a', x, y); g.globalAlpha = 0.4; P('#e6ff8a', x - 1, y, 3, 1); P('#e6ff8a', x, y - 1, 1, 3); g.globalAlpha = 1; }
    }
    g.drawImage(L.avant, 0, 0);
    // le titre, avec un reflet qui le traverse de temps en temps
    const sg = scratch.getContext('2d');
    sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, scratch.width, scratch.height); sg.drawImage(L.titre, 0, 0);
    const rp = t % 6;
    if (rp < 0.9) {
      const bx = -24 + (L.titre.width + 48) * rp / 0.9;
      sg.globalCompositeOperation = 'source-atop'; sg.fillStyle = 'rgba(255,255,240,.7)';
      sg.beginPath(); sg.moveTo(bx, 0); sg.lineTo(bx + 8, 0); sg.lineTo(bx - 10, L.titre.height); sg.lineTo(bx - 18, L.titre.height); sg.fill();
    }
    g.drawImage(scratch, p.x0, p.y0);

    // la caméra : cam = 0, la scène ; cam = -H, le ciel de nuit juste au-dessus (on en descend en arrivant, on y remonte
    // en partant) ; noir : le noir tramé du chargement et du départ, de 0 à 1
    const borne = (u) => Math.max(0, Math.min(1, u));
    const { cam, noir } = camera(t), dy = Math.round(-cam), ctx = g0;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    // le passage vers le camp (ou depuis le camp) : v = 0, l'écran titre ; v = 1, le camp vu d'en haut
    let v = null;
    if (tDescente != null && t >= tDescente) v = borne((t - tDescente) / DUREE.camp);
    if (tRemontee != null) v = 1 - borne((t - tRemontee) / DUREE.remontee);
    if (v == null || v <= 0) cacherBascule();
    if (v != null && v > 0) {
      passage(ctx, v);
      if (tDescente != null && v >= 1 && finDescente) { const f = finDescente; finDescente = null; f(); }
      return;
    }
    if (dy > 0) {
      ctx.drawImage(L.ciel, 0, dy - H);
      for (let k = 0; k < 40; k++) {   // quelques étoiles qui scintillent, là-haut
        const x = Math.floor(hasard(k * 5.3 + 1) * W), y = dy - H + Math.floor(hasard(k * 9.1 + 2) * H);
        if (Math.sin(t * (1.5 + hasard(k) * 2) + k) > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); }
      }
    }
    ctx.drawImage(image, 0, dy);
    if (noir > 0) { ctx.fillStyle = trames[Math.min(16, Math.round(noir * 16))]; ctx.fillRect(0, 0, W, H); }
  }

  // --- La bascule de la caméra, entre l'écran titre et le camp -------------------------------------------------------
  // L'image de passage : une caméra qui pivote. Au début, elle regarde l'horizon de l'écran titre, et sous l'horizon le
  // sol du vrai camp apparaît en perspective (comme le « mode 7 » des consoles 16 bits), voilé de brume et de soir ;
  // puis elle bascule jusqu'à regarder droit vers le bas, et l'image tombe pile sur le camp. Au-dessus de l'horizon, le
  // ciel de l'écran titre (sa tour, ses montagnes), qui monte avec l'horizon et sort par le haut.
  //   v : 0 → 0,22, l'écran titre se dissout (trame) dans la vue basculée à l'horizon ; 0,22 → 0,88, la caméra pivote
  //   et le soir se lève ; 0,88 → 1, la vue s'ajoure (trame) sur le vrai camp, et le HUD du camp revient.
  const TANF = Math.tan(Math.PI / 6), PHASE = { a: 0.22, c: 0.12 };
  let photoCamp = null, vue = null, pixelsVue = null, masque = null, sansCamp = null;
  // Une image du camp tel qu'il est maintenant (son canevas garde son image : preserveDrawingBuffer), à la taille de la scène.
  // (calculée à la résolution de la scène, puis agrandie ; sa dernière image, la caméra droit vers le bas, est la photo du
  // camp à la pleine résolution de l'écran : pixel pour pixel celle du camp vivant)
  let Wh = 0, Hh = 0, tramesHD = [], photoHD = null;
  function photographierCamp() {
    const { W, H } = p;
    Wh = Math.max(1, innerWidth); Hh = Math.max(1, innerHeight);
    photoHD = toile(Wh, Hh);
    const g = photoHD.getContext('2d');
    g.fillStyle = '#3d6b2e'; g.fillRect(0, 0, Wh, Hh);
    const jeu = document.querySelector('#jeu');
    if (jeu) { g.imageSmoothingEnabled = false; try { g.drawImage(jeu, 0, 0, Wh, Hh); } catch {} }
    const bas = toile(W, H), gb = bas.getContext('2d');
    gb.imageSmoothingEnabled = true; gb.drawImage(photoHD, 0, 0, W, H);
    photoCamp = new Uint32Array(gb.getImageData(0, 0, W, H).data.buffer);
    hd.width = Wh; hd.height = Hh;
    vue = toile(W, H); pixelsVue = vue.getContext('2d').createImageData(W, H); masque = toile(Wh, Hh);
    if (!sansCamp) { sansCamp = toile(W, H); sansCamp.getContext('2d').drawImage(image, 0, 0); }
    // les trames, en pixels de la scène (un pixel de trame = s pixels d'écran)
    tramesHD = [...Array(17)].map((_, n) => {
      const t4 = toile(4 * s, 4 * s), cg = t4.getContext('2d'); cg.fillStyle = NOIR;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (seuil(x, y) < n / 16) cg.fillRect(x * s, y * s, s, s);
      return g0.createPattern(t4, 'repeat');
    });
  }
  const horizon0 = () => Math.atan(-((p.hz - p.H / 2) / (p.H / 2)) * TANF);   // l'angle où l'horizon tombe sur celui de l'écran titre
  // La vue basculée de theta (radians sous l'horizontale) ; soir : 1 au crépuscule de l'écran titre, 0 en plein jour.
  function vueBasculee(theta, soir) {
    const { W, H, hz } = p, sortie = new Uint32Array(pixelsVue.data.buffer), demi = H / 2;
    const sn = Math.sin(theta), cs = Math.cos(theta), zc = -Math.min(2.2, cs / Math.max(0.25, sn));
    const yh = demi * (1 - Math.tan(theta) / TANF);   // l'horizon à l'écran
    const titre = yh > -2 ? new Uint32Array((sansCamp ?? image).getContext('2d').getImageData(0, 0, W, H).data.buffer) : null;
    // hors de l'image du camp, le sol continue en miroir (pas de bord net, pas de plaine vide)
    const miroir = (a, n) => { if (a >= 0 && a < n) return a; a = ((a % (2 * n)) + 2 * n) % (2 * n); return a < n ? a : 2 * n - 1 - a; };
    const decale = Math.round(hz - yh);   // le ciel de l'écran titre, calé sur l'horizon
    for (let y = 0; y < H; y++) {
      const yp = (y + 0.5 - demi) / demi, den = sn + yp * TANF * cs, o = y * W;
      if (den <= 0.004) {   // au-dessus de l'horizon : le ciel de l'écran titre
        const ty = Math.max(0, Math.min(hz - 1, y + decale)) * W;
        for (let x = 0; x < W; x++) sortie[o + x] = titre ? titre[ty + x] : 0xff000000;
        continue;
      }
      const d = 1 / den, gz = zc + (cs - yp * TANF * sn) * d, sy = Math.floor(demi - (gz / TANF) * demi);
      // le soir assombrit et bleuit ; la brume (au loin) tire vers le violet des montagnes de l'écran titre
      const brume = Math.min(1, Math.max(0, (d - 1.4) / 6)) * soir, k1 = (1 - 0.5 * soir) * (1 - brume), kb = (1 - 0.3 * soir) * (1 - brume);
      const fr = 64 * brume, fg = 30 * brume, fb = 84 * brume, ligne = miroir(sy, H) * W;
      const x0 = W / 2 - (W / 2 - 0.5) * d;   // sx = x0 + x · d (une ligne du sol, vue de loin, se resserre)
      for (let x = 0; x < W; x++) {
        const c = photoCamp[ligne + miroir(Math.floor(x0 + x * d), W)];
        const r = (c & 255) * k1 + fr, g = ((c >> 8) & 255) * k1 + fg, b = ((c >> 16) & 255) * kb + fb;
        sortie[o + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
      }
    }
    vue.getContext('2d').putImageData(pixelsVue, 0, 0);
    return vue;
  }
  let hdVisible = false;
  function passage(ctx, v) {
    if (!photoCamp) photographierCamp();
    const b = 1 - PHASE.a - PHASE.c, u = lisse(Math.max(0, Math.min(1, (v - PHASE.a) / b)));
    const theta = horizon0() + (Math.PI / 2 - horizon0()) * u;
    const vueB = u >= 1 ? photoHD : vueBasculee(theta, 1 - u), h = hd.getContext('2d');   // (droit vers le bas : la photo, telle quelle)
    hd.hidden = false; hdVisible = true;
    h.globalCompositeOperation = 'source-over'; h.imageSmoothingEnabled = false; h.clearRect(0, 0, Wh, Hh);
    if (v < PHASE.a) {   // l'écran titre se dissout dans la vue basculée
      ctx.drawImage(image, 0, 0);
      const m = masque.getContext('2d');
      m.imageSmoothingEnabled = false;
      m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, Wh, Hh); m.drawImage(vueB, 0, 0, Wh, Hh);
      m.globalCompositeOperation = 'destination-in'; m.fillStyle = tramesHD[Math.round(lisse(v / PHASE.a) * 16)]; m.fillRect(0, 0, Wh, Hh);
      h.drawImage(masque, 0, 0);
      poserCamp(1);
      return;
    }
    h.drawImage(vueB, 0, 0, Wh, Hh);
    const ajour = Math.max(0, (v - PHASE.a - b) / PHASE.c);   // la vue s'ajoure sur le vrai camp (qui est la même image)
    if (ajour > 0) { h.globalCompositeOperation = 'destination-out'; h.fillStyle = tramesHD[Math.min(16, Math.round(ajour * 16))]; h.fillRect(0, 0, Wh, Hh); h.globalCompositeOperation = 'source-over'; }
    poserCamp(1 - ajour);
  }
  function cacherBascule() { if (hdVisible) { hd.getContext('2d').clearRect(0, 0, hd.width, hd.height); hd.hidden = true; hdVisible = false; } }

  // Le HUD du camp, pendant les passages : k = 1, caché (on ne voit que la scène) ; k = 0, à sa place. Le canevas du camp
  // reste visible : la vue basculée s'ajoure dessus.
  function poserCamp(k) {
    for (const n of document.body.children) {
      if (n === racine || n.tagName === 'SCRIPT' || n.id === 'jeu') continue;
      n.style.opacity = k > 0.001 ? (1 - k).toFixed(3) : '';
    }
  }

  // Où est la caméra à l'instant t, et combien de noir par-dessus.
  function camera(t) {
    const H = p.H, borne = (u) => Math.max(0, Math.min(1, u));
    if (mode === 'arrivee') {
      const u = borne((t - DUREE.noir) / DUREE.descente);
      return { cam: -H * (1 - lisse(u)), noir: t < DUREE.noir ? 1 : borne(1 - (t - DUREE.noir) / 0.5) };
    }
    if (tCiel != null) {   // (le chemin du retour, ou « Retour au dashboard » depuis le menu)
      const u = borne((t - tCiel) / DUREE.ciel);
      return { cam: -H * lisse(u), noir: borne((t - tCiel - DUREE.ciel + 0.05) / DUREE.fondu) };
    }
    return { cam: 0, noir: 0 };
  }

  function boucle(maintenant) {
    const t = Math.max(0, (maintenant - t0) / 1000);   // (la première image peut dater d'avant la création)
    if (t >= DUREE.noir + DUREE.descente * 0.8 && racine.classList.contains('intro')) racine.classList.remove('intro');
    dessinerA(t, Math.min(0.05, t - (dernier ?? t)));
    dernier = t;
    raf = requestAnimationFrame(boucle);
  }

  // Le menu au clavier : ↑ ↓ (ou W S) passent d'un choix à l'autre ; Échap referme un sous-menu.
  const visibles = () => [...racine.querySelectorAll('.titre-choix, .titre-sous:not([hidden]) input, .titre-sous:not([hidden]) button')];
  function touche(e) {
    if (choix) return;
    const dans = e.target instanceof HTMLInputElement && e.target.type === 'text';
    if (e.key === 'Escape') { panRejoindre.hidden = true; panReglages.hidden = true; marquer(); items[1].focus(); return; }
    const sens = (e.key === 'ArrowDown' || (!dans && e.code === 'KeyS')) ? 1 : (e.key === 'ArrowUp' || (!dans && e.code === 'KeyW')) ? -1 : 0;
    if (!sens) return;   // (sur un curseur, ← → règlent le volume ; ↑ ↓ passent au choix suivant)
    const liste = visibles(), i = liste.indexOf(document.activeElement);
    e.preventDefault();
    liste[(i + sens + liste.length) % liste.length].focus();
  }
  function marquer() {
    items[1].setAttribute('aria-expanded', String(!panRejoindre.hidden));
    items[2].setAttribute('aria-expanded', String(!panReglages.hidden));
  }
  function basculer(pan, cible) {
    if (choix) return;
    const ouvrir = pan.hidden;
    panRejoindre.hidden = true; panReglages.hidden = true;
    pan.hidden = !ouvrir;
    marquer();
    if (ouvrir) cible.focus();
  }
  function regler(id, v) {
    const r = { ...lireReglages(), [id]: Math.max(0, Math.min(1, v)) };
    try { localStorage.setItem(CLE_REGLAGES, JSON.stringify(r)); } catch {}
    afficherReglages();
  }
  function afficherReglages() {
    const r = lireReglages();
    for (const [id, { curseur, valeur }] of Object.entries(curseurs)) {
      const pc = Math.round(r[id] * 100);
      curseur.value = String(pc); valeur.textContent = pc ? `${pc} %` : 'coupé';
    }
  }
  function valider() {
    const c = nettoyer(champ.value);
    if (c.length !== 5) { statut.textContent = 'Le code a cinq lettres'; champ.focus(); return false; }
    return choisir('rejoindre', c);
  }
  // « Retour au dashboard », depuis le menu : le menu s'efface, la caméra remonte au ciel de nuit, le noir, puis le dashboard.
  function versDashboard() {
    if (choix) return false;
    choix = { action: 'dashboard', code: '' };
    racine.classList.remove('intro'); racine.classList.add('fini');
    for (const n of racine.querySelectorAll('button, input, a')) n.tabIndex = -1;
    tCiel = tCourant;
    attendre(DUREE.ciel + DUREE.fondu).then(() => aller(DASHBOARD));
    return true;
  }
  // Un choix : le menu s'efface, onChoix (le camp se charge derrière l'écran titre), puis retirer() descend sur le camp.
  function choisir(action, c = '') {
    if (choix) return false;
    choix = { action, code: c };
    racine.classList.add('fini');
    for (const n of racine.querySelectorAll('button, input, a')) n.tabIndex = -1;
    onChoix({ ...choix });
    return true;
  }

  addEventListener('resize', mesurer);
  addEventListener('keydown', touche);
  for (const n of items) n.addEventListener('pointerenter', () => { if (!choix) n.focus({ preventScroll: true }); });
  afficherReglages();
  mesurer();
  if (champ.value) { panRejoindre.hidden = false; marquer(); items[1].focus(); } else items[0].focus();
  if (figer) dessinerA(4, 0); else raf = requestAnimationFrame(boucle);
  racine.dataset.pret = '1';

  return {
    racine, items, champ, statut, panRejoindre, panReglages, curseurs, equipe,
    autour: autour.map((h) => h.id),   // les héros autour du feu (la règle des sièges)
    get choix() { return choix && { ...choix }; },
    get plan() { return p; },
    get echelle() { return s; },
    choisir, valider, dessinerA, mesurer, regler, versDashboard,
    // Pour les captures : arrêter l'animation, puis dessiner soi-même un instant donné.
    arreter() { cancelAnimationFrame(raf); raf = 0; racine.classList.remove('intro'); },
    // Le chemin du retour : l'écran titre redescend sur le camp qui s'assombrit (remonter), puis la caméra remonte au ciel
    // de nuit et le noir (versLeCiel). Chacun rend une promesse.
    remonter() { racine.classList.add('transparent'); photographierCamp(); tRemontee = tCourant; return attendre(DUREE.remontee); },
    versLeCiel() { tCiel = tCourant; return attendre(DUREE.ciel + DUREE.fondu); },
    // Après le choix, quand le camp est prêt : la caméra descend de l'écran titre sur le camp vivant (l'écran titre monte
    // et se dissout, le camp arrive du soir), puis l'écran titre s'en va.
    retirer() {
      const fin = () => { cancelAnimationFrame(raf); poserCamp(0); removeEventListener('resize', mesurer); removeEventListener('keydown', touche); racine.remove(); document.documentElement.classList.remove('a-titre'); };
      if (figer) { fin(); return Promise.resolve(); }
      poserCamp(1);
      racine.classList.add('transparent');
      tDescente = tCourant + 0.05;   // (une image du camp a eu le temps d'être dessinée)
      return new Promise((ok) => { finDescente = () => { fin(); ok(); }; });
    },
    get enDescente() { return tDescente != null; },
    // Pour les captures (après arreter) : une image d'un passage, à u (0 → 1) de son déroulé.
    essai(etape, u) {
      const T0 = 100;
      if (etape === 'arrivee') { dessinerA(u * (DUREE.noir + DUREE.descente), 0); return; }
      if (etape === 'descente') { if (!photoCamp) photographierCamp(); tDescente = T0; dessinerA(T0 + Math.min(0.999, u) * DUREE.camp, 0); return; }
      if (etape === 'remontee') { racine.classList.add('transparent'); if (!photoCamp) photographierCamp(); tRemontee = T0; dessinerA(T0 + u * DUREE.remontee, 0); return; }
      if (etape === 'ciel') { tRemontee = T0 - DUREE.remontee; tCiel = T0; dessinerA(T0 + u * (DUREE.ciel + DUREE.fondu), 0); }
    },
    // Pour les captures : finir la descente (le camp à sa place, l'écran titre parti).
    finir() { const f = finDescente; finDescente = null; f?.(); },
  };
}

const attendre = (s) => new Promise((ok) => setTimeout(ok, s * 1000));
const allerVers = (url) => { try { window.top.location.href = url; } catch { location.href = url; } };

// Le ciel de nuit, juste au-dessus de la scène : du noir tout en haut au ciel du haut de la scène, tramé, et ses étoiles.
function peindreCielHaut(p) {
  const { W, H } = p, c = toile(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  const pal = [rgb(NOIR), rgb('#0b0619'), CIEL[0]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = (y / H) * (pal.length - 1), i = Math.min(pal.length - 2, Math.floor(v)), f = v - i, col = f > seuil(x, y) ? pal[i + 1] : pal[i], k = (y * W + x) * 4;
    d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 160; k++) { g.fillStyle = k % 4 ? '#b9a6e0' : '#ffffff'; g.fillRect(Math.floor(hasard(k * 2.7) * W), Math.floor(hasard(k * 4.9) * H), 1, 1); }
  return c;
}

// Le bouton « Retour au dashboard » du camp : le camp descend et l'écran titre revient d'en haut, la caméra remonte
// au ciel de nuit, le noir, puis le dashboard. Très vite (un peu plus d'une seconde).
export async function retourAuDashboard({ stamp = 'dev', aller = allerVers } = {}) {
  if (retourAuDashboard.enCours) return false;
  retourAuDashboard.enCours = true;
  const images = await chargerImagesTitre().catch(() => ({}));
  const titre = creerTitre({ images, stamp, mode: 'retour' });
  retourAuDashboard.titre = titre;   // (les captures s'en servent)
  await titre.remonter();
  await titre.versLeCiel();
  aller(DASHBOARD);
  return true;
}

function nettoyer(code) { return String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); }

// L'écran titre, jusqu'au choix : { action: 'jouer' | 'rejoindre', code, titre } (titre.retirer() quand le camp est prêt).
// dbg : la poignée de débogage, qui reçoit dbg.titre (les captures s'en servent).
export async function ecranTitre({ stamp, code, dbg = null }) {
  const images = await chargerImagesTitre();
  return new Promise((ok) => {
    const titre = creerTitre({ images, stamp, code, onChoix: (c) => ok({ ...c, titre }) });
    if (dbg) dbg.titre = titre;
  });
}
