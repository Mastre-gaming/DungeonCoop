// Le limier du Traqueur, et ses étapes : tout part du loup LPC de Redshrike (« [LPC] Wolf Animation », OpenGameArt,
// wolfsheet3.png, 640 × 384), repeint selon la clarté de chaque pixel (comme design/camp/outils/loup_sculpte.mjs).
//   le malinois (niveau 1) : robe fauve, masque noir en dégradé, voile charbonné sur le dos ;
//   le loup (niveau 7) : gris ;   le loup alpha (niveau 15) : sombre et bleuté.
// Il écrit les trois planches entières (../familier/<etape>.png) et la planche du camp du limier
// (public/assets/lpc/compagnons/limier.png) : des cases de 64 × 64, rangées haut, gauche, bas, droite (l'ordre LPC),
// colonnes 0 à 4 la marche, colonne 5 l'arrêt.
//   node limier.mjs <wolfsheet3.png>        (la planche téléchargée va dans dl/, qu'on ne garde pas dans le dépôt)
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lire, ecrire } from './png.mjs';

const ici = (p) => fileURLToPath(new URL(p, import.meta.url));
const [src] = process.argv.slice(2);
if (!src) { console.error('usage : node limier.mjs <wolfsheet3.png>'); process.exit(1); }
const im = lire(src);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (p, i) => 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
const ls = []; for (let i = 0; i < im.px.length; i += 4) if (im.px[i + 3]) ls.push(lum(im.px, i));
ls.sort((a, b) => a - b);
const lo = ls[Math.floor(ls.length * 0.03)], hi = ls[Math.floor(ls.length * 0.97)];
const rang = (v, n) => Math.max(0, Math.min(n - 1, Math.round(((v - lo) / (hi - lo)) * (n - 1))));

const ETAPES = {
  malinois: { clair: ['#3e2a12', '#76521f', '#a8782e', '#cf9c44', '#e8bf6a', '#f6dc9c'], sombre: ['#120d0a', '#221a14', '#33271c', '#463626', '#5a4632', '#6e5840'] },
  loup: { clair: ['#1c1d24', '#363944', '#5a5f6c', '#868c9a', '#b4bac6', '#e2e6ec'] },
  alpha: { clair: ['#0b0b12', '#191b2a', '#2a2e44', '#43496a', '#6c7699', '#a6b1d4'] },
};
mkdirSync(ici('../familier'), { recursive: true });
const planches = {};
for (const [nom, R] of Object.entries(ETAPES)) {
  const clair = R.clair.map(hex), px = Buffer.from(im.px);
  for (let i = 0; i < px.length; i += 4) if (px[i + 3]) [px[i], px[i + 1], px[i + 2]] = clair[rang(lum(im.px, i), clair.length)];
  if (R.sombre) {
    // le malinois : sur chaque image de profil (moitié droite, 64 × 32, la tête à droite), le masque et le voile
    const sombre = R.sombre.map(hex);
    for (let cy = 0; cy < 224; cy += 32) for (let cx = 320; cx < 640; cx += 64) {
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = cy; y < cy + 32; y++) for (let x = cx; x < cx + 64; x++) if (im.px[(y * im.W + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < 0) continue;
      const w = x1 - x0 + 1, h = y1 - y0 + 1, tete = x1 - Math.round(w * 0.3);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = (y * im.W + x) * 4; if (!im.px[i + 3]) continue;
        const ry = (y - y0) / h, l = lum(im.px, i);
        if (l < lo + (hi - lo) * 0.12) continue;                                   // le contour reste
        const dansTete = x >= tete;
        // le masque : il fonce du cou vers le museau, par paliers tramés (pas de passage net), plus clair sous la mâchoire
        const fx = (x - tete) / Math.max(1, x1 - tete), bas = ry < 0.45 ? 1 : ry < 0.7 ? (0.7 - ry) / 0.25 : 0;
        const m = dansTete ? Math.max(0, Math.min(1, (fx - 0.04) / 0.45)) * bas : 0;
        if (m > 0) {
          const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][y % 4][x % 4] / 16;
          const q = Math.min(4, Math.floor(m * 4 + bayer)) / 4;          // 5 paliers : 0, ¼, ½, ¾, plein
          const c = sombre[rang(l, sombre.length)], k = clair[rang(l, clair.length)];
          if (q > 0) [px[i], px[i + 1], px[i + 2]] = [0, 1, 2].map((v) => Math.round(c[v] * q + k[v] * (1 - q)));
        }
        else if (!dansTete && x > x0 + w * 0.15) {                                 // le voile charbonné : des poils, pas une selle
          const h2 = ((x * 7 + y * 13) % 10) / 10, densite = ry < 0.16 ? 0.9 : ry < 0.27 ? 0.6 : ry < 0.36 ? 0.25 : 0;
          if (h2 < densite) { const c = sombre[Math.min(sombre.length - 1, rang(l, sombre.length) + 1)], k = clair[rang(l, clair.length)]; [px[i], px[i + 1], px[i + 2]] = [0, 1, 2].map((q) => Math.round(c[q] * 0.85 + k[q] * 0.15)); }
        }
      }
    }
  }
  ecrire(ici(`../familier/${nom}.png`), { W: im.W, H: im.H, px });
  planches[nom] = px;
}

// La planche du camp du limier (le malinois) : cases de 64 × 64. De profil (64 × 32) : la marche (rangée y = 96), l'arrêt
// (y = 0, image 0), posés en bas de la case ; la gauche est la droite retournée. De face et de dos (32 × 64) : la marche
// (rangée y = 192, face x 0–160, dos x 160–320), l'arrêt (y = 0), centrés.
const M = planches.malinois, C = 64, O = { W: 6 * C, H: 4 * C, px: Buffer.alloc(6 * C * 4 * C * 4) };
const poser = (sx, sy, w, h, ligne, col, miroir = false) => {
  const dx = col * C + (C - w) / 2, dy = ligne * C + (C - h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((sy + y) * im.W + sx + (miroir ? w - 1 - x : x)) * 4; if (!M[i + 3]) continue;
    M.copy(O.px, ((dy + y) * O.W + dx + x) * 4, i, i + 4);
  }
};
for (let k = 0; k < 5; k++) {
  poser(160 + k * 32, 192, 32, 64, 0, k);          // haut : de dos
  poser(320 + k * 64, 96, 64, 32, 1, k, true);     // gauche : le profil retourné
  poser(k * 32, 192, 32, 64, 2, k);                // bas : de face
  poser(320 + k * 64, 96, 64, 32, 3, k);           // droite
}
poser(160, 0, 32, 64, 0, 5); poser(320, 0, 64, 32, 1, 5, true); poser(0, 0, 32, 64, 2, 5); poser(320, 0, 64, 32, 3, 5);
mkdirSync(ici('../../../../public/assets/lpc/compagnons'), { recursive: true });
ecrire(ici('../../../../public/assets/lpc/compagnons/limier.png'), O);
console.log('ok : familier/malinois.png, loup.png, alpha.png ; public/assets/lpc/compagnons/limier.png');
