// Baba Brisenclume à l'enclume du camp : sa planche « forgeron » (public/assets/lpc/forgeron.png), 8 images de 96 × 64.
// Il est tourné vers la gauche (vers l'enclume), et reprend sa frappe LPC de profil (rangée 13 de sa planche) :
// le marteau levé (image 5), qui descend (4), qui frappe (3) ; à l'impact, un éclair sur le lingot et une gerbe
// d'étincelles en trois temps. Le lingot rougeoie sur l'enclume, sous le marteau.
// Chaque image : Baba dans les 64 px de droite, 32 px de vide à gauche pour les étincelles au-dessus de l'enclume.
// Écrit aussi src/data/forgeron.json : le point d'impact dans l'image (où poser le dessus de l'enclume) et la durée
// de chaque image.
//   node forgeron.mjs        (depuis ce dossier)
import { writeFileSync } from 'node:fs';
import { lire, ecrire } from '../../../animations/outil/png.mjs';

const RACINE = '../../../../';
const P = lire(`${RACINE}public/assets/lpc/entrainement/baba-brisenclume.png`);
const RANG = 13, DX = 32, FW = 96, FH = 64;
// [image LPC, étape des étincelles (0 : aucune), durée en secondes]
const IMAGES = [[5, 0, 0.24], [4, 0, 0.07], [3, 1, 0.08], [3, 2, 0.09], [3, 3, 0.11], [4, 0, 0.12], [5, 0, 0.14], [5, 0, 0.2]];

// le point d'impact : le bas de la tête du marteau à l'image 3 (les pixels opaques tout à gauche de Baba)
const cellule = (f, x, y) => { const i = ((RANG * 64 + y) * P.W + f * 64 + x) * 4; return P.px.subarray(i, i + 4); };
const tete = [];
for (let y = 24; y < 52; y++) for (let x = 0; x < 14; x++) if (cellule(3, x, y)[3] > 200) tete.push([x, y]);   // à hauteur du coup, pas le marteau qui pend
const xs = tete.map((p) => p[0]), ys = tete.map((p) => p[1]);
const IMPACT = { x: DX + Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.max(...ys) + 1 };

const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const W = FW * IMAGES.length, out = Buffer.alloc(W * FH * 4);
const poser = (ox, x, y, c, a = 255) => {
  x = Math.round(x); y = Math.round(y); if (x < 0 || x >= FW || y < 0 || y >= FH) return;
  const i = (y * W + ox + x) * 4, t = a / 255, base = out[i + 3] ? [out[i], out[i + 1], out[i + 2]] : c;
  const v = mix(base, c, out[i + 3] ? t : 1); out.set(v, i); out[i + 3] = Math.max(out[i + 3], a);
};

IMAGES.forEach(([f, etape], n) => {
  const ox = n * FW;
  // 1. le lingot sur l'enclume (sous Baba) : chauffé à blanc juste après le coup, rouge sinon
  const chaud = etape === 1 ? 1 : etape === 2 ? 0.75 : etape === 3 ? 0.55 : 0.3;
  const coeur = mix([226, 84, 20], [255, 246, 200], chaud), bord = mix([150, 36, 10], [255, 170, 60], chaud);
  for (let dx = -4; dx <= 4; dx++) {
    poser(ox, IMPACT.x + dx, IMPACT.y - 2, Math.abs(dx) === 4 ? [40, 12, 8] : bord);
    poser(ox, IMPACT.x + dx, IMPACT.y - 1, Math.abs(dx) === 4 ? [40, 12, 8] : coeur);
  }
  // 2. Baba, dans les 64 px de droite
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const c = cellule(f, x, y); if (!c[3]) continue;
    const i = (y * W + ox + DX + x) * 4, t = c[3] / 255;
    if (out[i + 3]) { out.set(mix([out[i], out[i + 1], out[i + 2]], [c[0], c[1], c[2]], t), i); out[i + 3] = Math.max(out[i + 3], c[3]); }
    else out.set(c, i);
  }
  // 3. l'impact : un éclair, puis la gerbe d'étincelles qui retombe
  if (etape === 1) for (const [dx, dy, c] of [[0, -3, [255, 255, 230]], [-1, -3, [255, 230, 150]], [1, -3, [255, 230, 150]], [0, -4, [255, 214, 110]], [-2, -2, [255, 190, 80]], [2, -2, [255, 190, 80]]]) poser(ox, IMPACT.x + dx, IMPACT.y + dy, c);
  if (etape) for (let s = 0; s < 12; s++) {
    const ang = Math.PI * (1.05 + hash(s, 1) * 0.9), v = 3.2 + hash(s, 2) * 4.2, t = etape;   // vers le haut, en éventail
    const x = IMPACT.x + Math.cos(ang) * v * t, y = IMPACT.y - 3 + Math.sin(ang) * v * t + 0.55 * t * t;
    const c = etape === 1 ? [255, 246, 190] : etape === 2 ? [255, 176, 64] : [224, 84, 22];
    poser(ox, x, y, c);
    if (etape < 3) poser(ox, x - Math.cos(ang) * 1.2, y - Math.sin(ang) * 1.2, [255, 120, 32], 150);   // la traînée
  }
});

ecrire(`${RACINE}public/assets/lpc/forgeron.png`, { W, H: FH, px: out });
writeFileSync(`${RACINE}src/data/forgeron.json`, JSON.stringify({
  _lisez_moi: 'Fabriqué par design/classes/baba-brisenclume/outil/forgeron.mjs : ne pas modifier à la main.',
  image: { w: FW, h: FH }, impact: IMPACT, pieds: DX + 32, durees: IMAGES.map((i) => i[2]),
}, null, 1) + '\n');
console.log('forgeron.png', IMAGES.length, 'images ; impact', IMPACT);
