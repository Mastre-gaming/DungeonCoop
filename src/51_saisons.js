// Les saisons au camp (design validé par Mope le 21 oct, design/camp/saisons/) : le camp suit les vraies saisons, les mêmes
// pour tous les joueurs (le calendrier de Paris, comme la météo). Le printemps du 21 mars, l'été du 21 juin, l'automne du
// 23 septembre, l'hiver du 21 décembre.
//   - le printemps : l'herbe plus tendre, des fleurs dans l'herbe, un arbre sur deux en fleurs (roses et blanches) ;
//   - l'été : le camp tel qu'il est dessiné ;
//   - l'automne : les feuillus jaunes, orange ou rouges (chacun le sien), l'herbe qui jaunit, des feuilles tombées à leur pied ;
//   - l'hiver : la neige sur le sol, sur le haut des toits, des murs, des tentes et des arbres ; les chemins, tassés par les
//     pas, restent visibles ; les douves gèlent. La neige remplace la pluie (48_meteo.js) ; plus de canards ni de papillons
//     (49_animaux.js).
// Les sapins restent verts toute l'année. Les habitants, les héros et les bêtes ne changent pas : la neige ne tombe jamais
// sur leur tête (leurs planches ne passent pas ici, ni les ouvriers des planches du chantier et des murs).
// Comment : au chargement, avant que le camp ne se dessine, les planches du décor et le sol sont repeints pour la saison
// (une fois, dans des canevas). L'été ne repeint rien. ?saison=hiver pour en forcer une (printemps, ete, automne, hiver).
import { paris } from './48_meteo.js';
import CHANTIER from './data/chantier.json';
import MURS from './data/murs.json';

export const name = 'saisons';
export const always = true;

export const SAISONS = ['printemps', 'ete', 'automne', 'hiver'];
export const NOMS = { printemps: 'le printemps', ete: 'l’été', automne: 'l’automne', hiver: 'l’hiver' };

// la saison d'un jour (« 2026-10-21 », la date de Paris)
export function saisonDu(jour) {
  const md = Number(jour.slice(5, 7)) * 100 + Number(jour.slice(8, 10));
  if (md >= 321 && md < 621) return 'printemps';
  if (md >= 621 && md < 923) return 'ete';
  if (md >= 923 && md < 1221) return 'automne';
  return 'hiver';
}
export const saisonDe = (date = new Date()) => saisonDu(paris(date).jour);

// --- Les couleurs ------------------------------------------------------------------------------------------------
export const NEIGE = [242, 245, 250], NEIGE_OMBRE = [214, 222, 236], NEIGE_BLEUE = [150, 162, 190];
const herbe = (r, g, b) => g > r + 40 && g > b + 40 && b >= 30 && g >= 110;   // (et les pousses)
const cle = (r, g, b) => (r << 16) | (g << 8) | b;
const HERBE_SOMBRE = new Set([[47, 114, 43], [45, 110, 41], [46, 115, 40], [70, 120, 40]].map((c) => cle(...c)));   // l'herbe à l'ombre, au pied des objets
const terre = (r, g, b) => r > g && g > b && r - b > 50 && r > 110 && r < 215 && g > 70;
// les douves gelées : chaque couleur de l'eau devient une glace
const GLACE = new Map([[[21, 108, 153], [176, 208, 228]], [[0, 152, 178], [204, 228, 240]], [[0, 207, 223], [236, 248, 252]], [[40, 70, 90], [126, 152, 172]]].map(([a, b]) => [cle(...a), b]));
// l'herbe de la saison (l'été : telle quelle)
const HERBES = {
  printemps: (r, g, b) => [r * 1.22 + 1, g * 1.12, b * 1.13],
  automne: (r, g, b) => [r + (g - r) * 0.6, g * 0.96, b * 1.05],
};
// les feuillus (le clair, le moyen, le sombre, le plus sombre de la planche des cimes) ; en automne, quatre teintes
const FEUILLUS = [[129, 161, 0], [57, 126, 0], [16, 91, 45], [0, 48, 35]].map((c) => cle(...c));
export const TEINTES = [
  [[236, 180, 40], [196, 116, 24], [120, 60, 22], [70, 34, 16]],    // or
  [[230, 132, 36], [182, 72, 26], [110, 40, 22], [64, 26, 16]],     // orange
  [[204, 70, 42], [146, 40, 32], [88, 28, 28], [52, 20, 20]],       // rouge
  [[200, 176, 46], [150, 126, 26], [96, 82, 26], [56, 50, 18]],     // jaune vert
];
const PRINTEMPS = [[156, 196, 52], [78, 152, 24], [16, 91, 45], [0, 48, 35]];
const HIVER = [NEIGE, [172, 184, 202], [84, 96, 112], [52, 60, 74]];
const SAPIN_CLAIR = new Set([[11, 92, 47], [7, 67, 55]].map((c) => cle(...c)));
const SAPIN_SOMBRE = new Set([[12, 45, 43], [16, 24, 32]].map((c) => cle(...c)));
const OMBRE_ARBRE = cle(50, 33, 37);   // l'ombre au pied des troncs
const FLEURS = [[252, 252, 246], [250, 214, 60], [190, 140, 230], [240, 120, 150]];
const PETALES = [[250, 196, 212], [255, 232, 238], [236, 160, 186]];

// un nombre entre 0 et 1, toujours le même pour un pixel (les fleurs, les feuilles, la neige ne bougent pas)
const h = (x, y, s = 0) => { let n = Math.imul(x + 374761393 * s, 668265263) ^ Math.imul(y, 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

function toile(im) {
  const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height });
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.drawImage(im, 0, 0);
  return c;
}
function pixels(c) { const g = c.getContext('2d', { willReadFrequently: true }); const d = g.getImageData(0, 0, c.width, c.height); return { g, d, p: d.data, w: c.width, h: c.height }; }
const poser = (p, i, c) => { p[i] = Math.max(0, Math.min(255, Math.round(c[0]))); p[i + 1] = Math.max(0, Math.min(255, Math.round(c[1]))); p[i + 2] = Math.max(0, Math.min(255, Math.round(c[2]))); };

// --- Le sol (le canevas du camp, la place, le chantier) ---------------------------------------------------------
// Les grands morceaux de terre (les chemins), pas les petites taches : pour la neige tassée des chemins.
function grandsMorceaux(m, w, hh, min) {
  const lab = new Int32Array(w * hh), garde = new Uint8Array(w * hh), pile = new Int32Array(w * hh);
  let n = 0;
  for (let s = 0; s < w * hh; s++) {
    if (!m[s] || lab[s]) continue;
    n++; let haut = 0, taille = 0; pile[haut++] = s; lab[s] = n;
    const membres = [];
    while (haut) {
      const k = pile[--haut]; membres.push(k); taille++;
      const x = k % w, y = (k - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= hh) continue;
        const q = Y * w + X;
        if (m[q] && !lab[q]) { lab[q] = n; pile[haut++] = q; }
      }
    }
    if (taille >= min) for (const k of membres) garde[k] = 1;
  }
  return garde;
}

// Le sol : l'herbe de la saison, ses fleurs ou ses feuilles tombées, la neige et les douves gelées.
//   arbres : les pieds des feuillus [x, y] (les feuilles tombent autour) ; chemins : la taille des morceaux de terre à tasser
export function teindreSol(c, saison, { arbres = [], chemins = 3000 } = {}) {
  if (saison === 'ete' || !SAISONS.includes(saison)) return c;
  const { g, d, p, w, h: hh } = pixels(c);
  const H = new Uint8Array(w * hh), Tm = new Uint8Array(w * hh);
  for (let k = 0, i = 0; k < w * hh; k++, i += 4) {
    if (p[i + 3] < 128) continue;
    const r = p[i], gg = p[i + 1], b = p[i + 2];
    if (herbe(r, gg, b) || HERBE_SOMBRE.has(cle(r, gg, b))) H[k] = 1; else if (terre(r, gg, b)) Tm[k] = 1;
  }
  if (saison === 'hiver') {
    const chemin = grandsMorceaux(Tm, w, hh, chemins);
    for (let k = 0, i = 0; k < w * hh; k++, i += 4) {
      if (p[i + 3] < 128) continue;
      const x = k % w, y = (k - x) / w;
      if (H[k]) poser(p, i, HERBE_SOMBRE.has(cle(p[i], p[i + 1], p[i + 2])) || h(x, y, 1) < 0.05 ? NEIGE_OMBRE : NEIGE);
      else if (chemin[k]) poser(p, i, [p[i] * 0.35 + 236 * 0.65, p[i + 1] * 0.35 + 230 * 0.65, p[i + 2] * 0.35 + 224 * 0.65]);
      else { const gl = GLACE.get(cle(p[i], p[i + 1], p[i + 2])); if (gl) poser(p, i, gl); }
    }
    // des fêlures dans la glace : de petits traits qui partent de côté
    const glace = new Set([...GLACE.values()].map((v) => cle(...v)));
    const surGlace = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= hh) return false; const i = (y * w + x) * 4; return glace.has(cle(p[i], p[i + 1], p[i + 2])); };
    for (let n = 0, faites = 0; n < 400 && faites < Math.ceil(w / 100); n++) {
      let x = Math.floor(h(n, 7, 3) * w), y = Math.floor(h(n, 9, 3) * hh);
      if (!surGlace(x, y)) continue;
      faites++;
      for (let s = 0; s < 8 + Math.floor(h(n, 11, 3) * 10); s++) {
        if (surGlace(x, y)) poser(p, (y * w + x) * 4, [150, 180, 204]);
        x++; y += h(n, s, 4) < 0.25 ? -1 : h(n, s, 4) > 0.75 ? 1 : 0;
      }
    }
  } else {
    const f = HERBES[saison];
    for (let k = 0, i = 0; k < w * hh; k++, i += 4) if (H[k]) poser(p, i, f(p[i], p[i + 1], p[i + 2]));
    // loin de tout objet : un carré de 7 x 7 tout en herbe (une somme par carrés)
    const S = new Int32Array((w + 1) * (hh + 1));
    for (let y = 0; y < hh; y++) for (let x = 0, l = 0; x < w; x++) { l += H[y * w + x]; S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + l; }
    const loin = (x, y, r = 3) => x - r >= 0 && y - r >= 0 && x + r < w && y + r < hh && S[(y + r + 1) * (w + 1) + x + r + 1] - S[(y - r) * (w + 1) + x + r + 1] - S[(y + r + 1) * (w + 1) + x - r] + S[(y - r) * (w + 1) + x - r] === (2 * r + 1) ** 2;
    const point = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < hh) poser(p, (y * w + x) * 4, c); };
    if (saison === 'printemps') {
      // des fleurs, par petites touffes de 3 à 6, dans l'herbe dégagée (une touffe pour environ 260 pixels d'herbe)
      for (let y = 4; y < hh - 4; y += 2) for (let x = 4; x < w - 4; x += 2) {
        if (h(x, y, 5) > 4 / 260 || !loin(x, y)) continue;
        const c = FLEURS[Math.floor(h(x, y, 6) * FLEURS.length)];
        for (let n = 0; n < 3 + Math.floor(h(x, y, 7) * 4); n++) {
          const fx = x + Math.floor(h(x, y, 10 + n) * 9) - 4, fy = y + Math.floor(h(x, y, 20 + n) * 7) - 3;
          if (!loin(fx, fy, 1)) continue;
          point(fx, fy, c);
          if (c === FLEURS[0]) point(fx, fy + 1, [60, 120, 40]);   // la tige des marguerites
        }
      }
    } else {
      // les feuilles tombées : nombreuses au pied des feuillus, quelques-unes partout ailleurs (sur l'herbe et la terre)
      const sol = (x, y) => x >= 0 && y >= 0 && x < w && y < hh && (H[y * w + x] || Tm[y * w + x]);
      const feuille = (x, y, s) => {
        const t = TEINTES[Math.floor(h(x, y, s) * TEINTES.length)];
        point(x, y, t[h(x, y, s + 1) < 0.5 ? 0 : 1]);
        if (h(x, y, s + 2) < 0.5 && sol(x + 1, y)) point(x + 1, y, t[1]);
      };
      for (const [ax, ay] of arbres) {
        for (let n = 0; n < 70; n++) {
          const a = h(ax, ay, 40 + n) * Math.PI * 2, d = 6 + h(ax, ay, 140 + n) * 34;
          const x = Math.round(ax + Math.cos(a) * d * 1.3), y = Math.round(ay - 6 + Math.sin(a) * d * 0.6);
          if (sol(x, y)) feuille(x, y, 300 + n);
        }
      }
      for (let y = 0; y < hh; y += 3) for (let x = 0; x < w; x += 3) if (h(x, y, 50) < 9 / 1200 && sol(x, y)) feuille(x, y, 60);
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}

// --- Les planches du décor --------------------------------------------------------------------------------------
// La neige sur le haut des objets : sous leur bord du haut (là où rien n'est au-dessus, dans la planche), une couche de
// 6 à 9 pixels (moins sur un petit objet), sous le trait sombre du contour, gardé ; elle s'arrête au premier trait sombre
// (une arête, un créneau) ou à une flamme ; son bas, un peu dans l'ombre. `sauf` : des rectangles à laisser (les ouvriers).
function neigeDessus(p, w, hh, sauf = []) {
  const plein = (x, y) => y >= 0 && p[(y * w + x) * 4 + 3] >= 128;
  const sombre = (i) => p[i] + p[i + 1] + p[i + 2] < 115;
  const flamme = (i) => p[i] > 200 && p[i + 1] > 110 && p[i + 2] < 110;
  const dehors = (x, y) => sauf.some(([sx, sy, sw, sh]) => x >= sx && x < sx + sw && y >= sy && y < sy + sh);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < hh; y++) {
      if (!plein(x, y) || plein(x, y - 1) || dehors(x, y)) continue;
      let fin = y; while (fin + 1 < hh && plein(x, fin + 1)) fin++;
      const epais = Math.min([6, 7, 9, 8, 7, 6, 8, 9, 7][(x * 7 + Math.floor(x / 3) * 5) % 9], Math.max(2, Math.floor((fin - y + 1) * 0.35)));
      let yy = y;
      if (sombre((yy * w + x) * 4)) yy++;   // le contour reste au-dessus de la neige
      const couche = [];
      for (; yy <= fin && couche.length < epais; yy++) {
        const i = (yy * w + x) * 4;
        if (sombre(i) || flamme(i)) break;
        couche.push(i);
      }
      couche.forEach((i, n) => poser(p, i, n === couche.length - 1 && couche.length > 2 ? NEIGE_OMBRE : NEIGE));
      y = fin;
    }
  }
}

// Une planche du décor pour la saison : l'herbe (et sa neige), et en hiver la neige sur le haut des objets.
export function teindrePlanche(im, saison, { sauf = [], neige = true } = {}) {
  if (saison === 'ete' || !SAISONS.includes(saison)) return im;
  const c = toile(im), { g, d, p, w, h: hh } = pixels(c), f = HERBES[saison];
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 128) continue;
    const r = p[i], gg = p[i + 1], b = p[i + 2], k = (i / 4) | 0, x = k % w, y = (k - x) / w;
    const sombre = HERBE_SOMBRE.has(cle(r, gg, b));
    if (!herbe(r, gg, b) && !sombre) continue;
    if (sauf.some(([sx, sy, sw, sh]) => x >= sx && x < sx + sw && y >= sy && y < sy + sh)) continue;
    poser(p, i, saison === 'hiver' ? (sombre ? NEIGE_OMBRE : NEIGE) : f(r, gg, b));
  }
  if (saison === 'hiver' && neige) neigeDessus(p, w, hh, sauf);
  g.putImageData(d, 0, 0);
  return c;
}

// Les cimes des arbres (les deux feuillus en haut de la planche, les deux sapins en bas). `teinte` : laquelle des
// teintes d'automne ; `fleurs` : au printemps, un arbre en fleurs.
export function teindreCimes(im, saison, { teinte = 0, fleurs = false } = {}) {
  if (saison === 'ete' || !SAISONS.includes(saison)) return im;
  const c = toile(im), { g, d, p, w, h: hh } = pixels(c);
  const pal = saison === 'automne' ? TEINTES[teinte % TEINTES.length] : saison === 'hiver' ? HIVER : PRINTEMPS;
  const sapins = 96;   // les sapins commencent à cette ligne
  const avant = new Uint8ClampedArray(p);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 128) continue;
    const k = (i / 4) | 0, x = k % w, y = (k - x) / w, c0 = cle(p[i], p[i + 1], p[i + 2]);
    if (y < sapins) {
      const n = FEUILLUS.indexOf(c0);
      if (n >= 0) poser(p, i, pal[n]);
      if (fleurs && (n === 0 || n === 1) && h(x >> 1, y >> 1, 8) < (n ? 0.06 : 0.2)) poser(p, i, PETALES[Math.floor(h(x >> 1, y >> 1, 9) * 3)]);
    } else if (saison === 'hiver' && SAPIN_CLAIR.has(c0)) {
      // la neige sur le haut des branches des sapins : un clair juste sous le vide ou sous un trait sombre, et celui d'en dessous
      const dessus = (yy) => { if (yy < sapins) return true; const j = (yy * w + x) * 4; return avant[j + 3] < 128 || SAPIN_SOMBRE.has(cle(avant[j], avant[j + 1], avant[j + 2])); };
      if (dessus(y - 1) || (dessus(y - 2) && SAPIN_CLAIR.has(cle(avant[i - w * 4], avant[i - w * 4 + 1], avant[i - w * 4 + 2])))) poser(p, i, NEIGE);
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}

// Les troncs : en hiver, leur ombre se pose sur la neige (bleutée).
export function teindreTroncs(im, saison) {
  if (saison !== 'hiver') return im;
  const c = toile(im), { g, d, p } = pixels(c);
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 0 && cle(p[i], p[i + 1], p[i + 2]) === OMBRE_ARBRE) poser(p, i, NEIGE_BLEUE);
  g.putImageData(d, 0, 0);
  return c;
}

// Les planches à repeindre, et ce qu'il faut y laisser : les ouvriers du chantier et des murs.
const OUVRIERS = {
  chantier: CHANTIER.gens.map((o) => [0, o.sy, o.w * (o.images ?? 1), 64]),
  murs: Object.values(MURS.gens).map((o) => [0, o.sy, o.w * (o.images ?? 1), 64]),
};
const PLANCHES = ['roche', 'tonneau', 'deco', 'armurerie', 'placeObjets', 'muraille', 'tableau', 'chantier', 'murs', 'panneau', 'sauvage', 'lieuxBat', 'taverne'];

// Tout le camp pour la saison, avant qu'il ne se dessine : les planches du décor (images), les arbres (camp.objets),
// et le sol (sol, le canevas déjà composé). L'original de la planche des décorations reste pour les icônes du HUD.
export function teindreCamp({ images, camp, sol, saison }) {
  if (saison === 'ete' || !SAISONS.includes(saison)) return;
  if (images.deco) images.decoOriginal = images.deco;
  for (const k of PLANCHES) if (images[k]) images[k] = teindrePlanche(images[k], saison, { sauf: OUVRIERS[k] ?? [] });
  for (const k of ['placeSols', 'chantierSol']) if (images[k]) images[k] = teindreSol(toile(images[k]), saison, { chemins: 200 });
  if (images.troncs) images.troncs = teindreTroncs(images.troncs, saison);
  // les feuillus : chacun sa teinte en automne, un sur deux en fleurs au printemps
  const arbres = [];
  if (images.cimes && camp) {
    const base = images.cimes, variantes = saison === 'automne' ? TEINTES.length : saison === 'printemps' ? 2 : 1;
    for (let v = 0; v < variantes; v++) images[v ? `cimes~${v}` : 'cimes'] = teindreCimes(base, saison, { teinte: v, fleurs: saison === 'printemps' && v === 1 });
    for (const o of camp.objets) {
      if (o.img !== 'cimes' || o.sy !== 0) continue;   // (les sapins sont en bas de la planche)
      const v = Math.floor(h(Math.round(o.x), Math.round(o.pied), 12) * variantes);
      if (v) o.img = `cimes~${v}`;
      arbres.push([Math.round(o.x + 48), Math.round(o.pied)]);
    }
  }
  if (sol) teindreSol(sol, saison, { arbres });
}

// --- La compétence : la saison du camp, pour les autres (la météo, les bêtes) et les tests ------------------------
let S = { saison: 'ete', forcee: false };

export function init(game, options = {}) {
  S = { saison: options.saison, forcee: !!options.forcee };
  return api;
}
export function update() {}
export function dispose() {}

export function selfTest(t) {
  t.group('Les saisons');
  t.eq([saisonDu('2026-03-20'), saisonDu('2026-03-21'), saisonDu('2026-06-21'), saisonDu('2026-09-23'), saisonDu('2026-12-21'), saisonDu('2027-01-15')],
    ['hiver', 'printemps', 'ete', 'automne', 'hiver', 'hiver'], 'les saisons suivent le calendrier (21 mars, 21 juin, 23 septembre, 21 décembre)');
  t.ok(SAISONS.includes(S.saison), `le camp est en ${NOMS[S.saison] ?? S.saison}`);
  // un petit bout de camp : de l'herbe, un chemin, de l'eau, et un objet posé dessus (un toit gris)
  const c = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }), g = c.getContext('2d');
  g.fillStyle = 'rgb(59,148,51)'; g.fillRect(0, 0, 60, 40);
  g.fillStyle = 'rgb(184,135,81)'; g.fillRect(0, 10, 60, 10);
  g.fillStyle = 'rgb(21,108,153)'; g.fillRect(0, 30, 60, 10);
  const lire = (cv, x, y) => [...cv.getContext('2d').getImageData(x, y, 1, 1).data.slice(0, 3)];
  const hiver = teindreSol(toile(c), 'hiver', { chemins: 100 });
  const blanc = (v) => v.every((x) => x > 200);
  t.ok(blanc(lire(hiver, 5, 5)) && !blanc(lire(hiver, 5, 15)) && lire(hiver, 5, 15)[0] > 200 && lire(hiver, 5, 35)[2] > 200 && lire(hiver, 5, 35)[0] > 120,
    'l’hiver : l’herbe sous la neige, le chemin tassé reste visible, les douves gelées');
  const automne = teindreSol(toile(c), 'automne'), a = lire(automne, 30, 3);
  t.ok(a[0] > 90 && a[1] < 148, 'l’automne : l’herbe jaunit');
  t.eq(lire(teindreSol(toile(c), 'ete'), 5, 5), [59, 148, 51], 'l’été : le sol tel qu’il est dessiné');
  // la neige sur un objet, jamais sur ce qu'on laisse (un ouvrier)
  const o = Object.assign(document.createElement('canvas'), { width: 20, height: 30 }), go = o.getContext('2d');
  go.fillStyle = 'rgb(140,90,60)'; go.fillRect(2, 5, 6, 20); go.fillRect(12, 5, 6, 20);
  const n = teindrePlanche(o, 'hiver', { sauf: [[10, 0, 10, 30]] });
  t.ok(blanc(lire(n, 4, 6)) && !blanc(lire(n, 4, 20)) && !blanc(lire(n, 14, 6)), 'l’hiver : la neige sur le haut des objets, pas sur les habitants');
}

export const api = {
  SAISONS, NOMS, saisonDu, saisonDe,
  get saison() { return S.saison; },
  get forcee() { return S.forcee; },
};
