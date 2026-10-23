// Baba Brisenclume autour de la forge du camp : sa planche « forgeron » (public/assets/lpc/forgeron.png).
// Trois animations, une rangée chacune, en images de 96 × 64 (Baba dans les 64 px de droite, toujours au même endroit,
// 32 px de vide à gauche pour ce qui vole au-dessus de l'enclume), reprises de sa planche de combat :
//   0. forge   : il tape sur l'enclume (sa frappe de profil, rangée 13) ; un lingot rougeoie sous le marteau, chauffé à
//                blanc au coup, et une gerbe d'étincelles retombe en trois temps ;
//   1. attise  : tourné vers la droite, il fouille les braises du feu de forge (son estoc de profil, rangée 7) ; des
//                braises s'envolent de son marteau, et le feu s'emballe (rangée 3) ;
//   2. sonne   : face à nous, il lève ses deux marteaux et les fait sonner au-dessus de sa tête (son sort, rangée 2) ;
//                une gerbe d'étincelles à chaque tête.
//   3. le feu qui s'emballe : 6 images de 32 × 64, les flammes du feu de forge (planche des décorations) agrandies et
//                ravivées ; le jeu les pose sur le feu de l'armurerie, où qu'il soit, pendant « attise ».
//   4 à 7. la marche (vers le haut, la gauche, le bas, la droite ; images 1 à 8), pour aller d'un endroit à l'autre.
// Écrit aussi src/data/forgeron.json : le point d'impact (où poser le dessus de l'enclume), les rangées et les durées.
//   node forgeron.mjs        (depuis ce dossier)
import { writeFileSync } from 'node:fs';
import { lire, ecrire } from '../../../animations/outil/png.mjs';

const RACINE = '../../../../';
const P = lire(`${RACINE}public/assets/lpc/entrainement/baba-brisenclume.png`);
const DECO = lire(`${RACINE}public/assets/lpc/decorations-medieval.png`);
const DX = 32, FW = 96, FH = 64;
// [image LPC, effet, durée en secondes]
const ANIMS = {
  forge: { rang: 13, images: [[5, 0, 0.24], [4, 0, 0.07], [3, 1, 0.08], [3, 2, 0.09], [3, 3, 0.11], [4, 0, 0.12], [5, 0, 0.14], [5, 0, 0.2]] },
  attise: { rang: 7, images: [[0, 0, 0.16], [2, 0, 0.1], [3, 0, 0.1], [4, 1, 0.1], [5, 2, 0.12], [6, 3, 0.14], [5, 0, 0.1], [3, 0, 0.1], [1, 0, 0.14]] },
  sonne: { rang: 2, images: [[0, 0, 0.2], [1, 0, 0.1], [3, 0, 0.1], [4, 0, 0.1], [5, 1, 0.09], [5, 2, 0.1], [5, 3, 0.14], [4, 0, 0.1], [3, 0, 0.1], [1, 0, 0.16]] },
};
const FEU = { rang: 3, w: 32, h: 64, images: 6 };
const NB = Math.max(...Object.values(ANIMS).map((a) => a.images.length));
const W = FW * NB, H = FH * 8, out = Buffer.alloc(W * H * 4);

const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cellule = (rang, f, x, y) => { const i = ((rang * 64 + y) * P.W + f * 64 + x) * 4; return P.px.subarray(i, i + 4); };
// poser un pixel dans l'image (ox, oy) de la planche, sans sortir de l'image (fw × fh)
const poser = (ox, oy, x, y, c, a = 255, fw = FW, fh = FH) => {
  x = Math.round(x); y = Math.round(y); if (x < 0 || x >= fw || y < 0 || y >= fh) return;
  const i = ((oy + y) * W + ox + x) * 4, base = out[i + 3] ? [out[i], out[i + 1], out[i + 2]] : c;
  out.set(mix(base, c, out[i + 3] ? a / 255 : 1), i); out[i + 3] = Math.max(out[i + 3], a);
};
const baba = (ox, oy, rang, f) => {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const c = cellule(rang, f, x, y); if (!c[3]) continue;
    const i = ((oy + y) * W + ox + DX + x) * 4, t = c[3] / 255;
    if (out[i + 3]) { out.set(mix([out[i], out[i + 1], out[i + 2]], [c[0], c[1], c[2]], t), i); out[i + 3] = Math.max(out[i + 3], c[3]); }
    else out.set(c, i);
  }
};
// une gerbe d'étincelles depuis (x, y) : etape 1, 2, 3 ; vers le haut en éventail, elle retombe
const gerbe = (ox, oy, x0, y0, etape, graine, n = 12, ouverture = [1.05, 0.9]) => {
  for (let s = 0; s < n; s++) {
    const ang = Math.PI * (ouverture[0] + hash(s + graine, 1) * ouverture[1]), v = 3 + hash(s + graine, 2) * 4.2, t = etape;
    const x = x0 + Math.cos(ang) * v * t, y = y0 + Math.sin(ang) * v * t + 0.55 * t * t;
    poser(ox, oy, x, y, etape === 1 ? [255, 246, 190] : etape === 2 ? [255, 176, 64] : [224, 84, 22]);
    if (etape < 3) poser(ox, oy, x - Math.cos(ang) * 1.2, y - Math.sin(ang) * 1.2, [255, 120, 32], 150);
  }
};
const eclair = (ox, oy, x, y) => {
  for (const [dx, dy, c] of [[0, 0, [255, 255, 230]], [-1, 0, [255, 230, 150]], [1, 0, [255, 230, 150]], [0, -1, [255, 214, 110]], [-2, 1, [255, 190, 80]], [2, 1, [255, 190, 80]]]) poser(ox, oy, x + dx, y + dy, c);
};
// la tête d'un marteau dans une image : le milieu des pixels opaques d'une zone de la cellule
function tete(rang, f, x0, x1, y0, y1) {
  const pts = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (cellule(rang, f, x, y)[3] > 200) pts.push([x, y]);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: DX + Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.min(...ys), bas: Math.max(...ys) + 1, gauche: DX + Math.min(...xs) };
}

// --- 0. forge : le point d'impact, le bas de la tête du marteau à l'image 3 (à hauteur du coup, pas celui qui pend) --
const t3 = tete(13, 3, 0, 14, 24, 52);
const IMPACT = { x: t3.x, y: t3.bas };
ANIMS.forge.images.forEach(([f, etape], n) => {
  const ox = n * FW, oy = 0;
  const chaud = etape === 1 ? 1 : etape === 2 ? 0.75 : etape === 3 ? 0.55 : 0.3;
  const coeur = mix([226, 84, 20], [255, 246, 200], chaud), bord = mix([150, 36, 10], [255, 170, 60], chaud);
  for (let dx = -4; dx <= 4; dx++) {   // le lingot, sous Baba
    poser(ox, oy, IMPACT.x + dx, IMPACT.y - 2, Math.abs(dx) === 4 ? [40, 12, 8] : bord);
    poser(ox, oy, IMPACT.x + dx, IMPACT.y - 1, Math.abs(dx) === 4 ? [40, 12, 8] : coeur);
  }
  baba(ox, oy, 13, f);
  if (etape === 1) eclair(ox, oy, IMPACT.x, IMPACT.y - 3);
  if (etape) gerbe(ox, oy, IMPACT.x, IMPACT.y - 3, etape, 0);
});

// --- 1. attise : des braises s'envolent du marteau tendu vers le feu (à droite) ----------------------------------
// la pointe : le bout du marteau tendu, à l'image la plus allongée (6) ; le jeu la pose sur le bord du feu
const t6 = tete(7, 6, 42, 64, 20, 52);
const POINTE = { x: DX + 42 + Math.max(...[...Array(22)].map((_, k) => k).filter((k) => [...Array(32)].some((_, y) => cellule(7, 6, 42 + k, 20 + y)[3] > 200))), y: t6.y + 3 };
ANIMS.attise.images.forEach(([f, etape], n) => {
  const ox = n * FW, oy = FH;
  baba(ox, oy, 7, f);
  if (!etape) return;
  const t = tete(7, f, 42, 64, 20, 52); if (!t) return;
  const bout = DX + 42 + Math.max(...[...Array(22)].map((_, k) => k).filter((k) => [...Array(32)].some((_, y) => cellule(7, f, 42 + k, 20 + y)[3] > 200)));
  for (let s = 0; s < 7; s++) {   // des braises qui montent en tournoyant, plus haut à chaque étape
    const x = bout - 1 + hash(s, 7) * 7 + Math.sin(s * 1.7 + etape) * 1.5, y = t.y + 2 - etape * (3 + hash(s, 8) * 4) - hash(s, 9) * 3;
    poser(ox, oy, x, y, etape === 1 ? [255, 236, 160] : etape === 2 ? [255, 160, 50] : [220, 80, 20]);
  }
});

// --- 4 à 7. la marche : ses rangées 8 à 11, images 0 à 8, telles quelles ----------------------------------------------
for (let d = 0; d < 4; d++) for (let f = 0; f < 9; f++) baba(f * FW, (4 + d) * FH, 8 + d, f);

// --- 2. sonne : les deux têtes de marteau au-dessus de sa tête, une gerbe à chacune ------------------------------------
ANIMS.sonne.images.forEach(([f, etape], n) => {
  const ox = n * FW, oy = 2 * FH;
  baba(ox, oy, 2, f);
  if (!etape) return;
  for (const [x0, x1, g] of [[0, 30, 0], [34, 64, 40]]) {
    const t = tete(2, f, x0, x1, 0, 30); if (!t) continue;
    if (etape === 1) eclair(ox, oy, t.x, t.y);
    gerbe(ox, oy, t.x, t.y, etape, g, 9, [1.0, 1.0]);
  }
});

// --- 3. le feu qui s'emballe : les 5 images du feu de forge (décorations 8 à 12, rangée 47), plus hautes et ravivées ---
for (let n = 0; n < FEU.images; n++) {
  const ox = n * FEU.w, oy = 3 * FH, src = 8 + (n % 5);
  for (let y = 0; y < FEU.h; y++) for (let x = 0; x < FEU.w; x++) {
    // agrandi de 1,35 en hauteur et 1,15 en largeur, le pied en bas, centré
    const sx = Math.floor((x - 16) / 1.15 + 16), sy = Math.floor(64 - (64 - y) / 1.35);
    if (sx < 0 || sx >= 32 || sy < 0 || sy >= 64) continue;
    const i = ((47 * 32 + sy) * DECO.W + src * 32 + sx) * 4; if (DECO.px[i + 3] < 10) continue;
    const c = mix([DECO.px[i], DECO.px[i + 1], DECO.px[i + 2]], [255, 230, 140], 0.25);
    poser(ox, oy, x, y, c, DECO.px[i + 3], FEU.w, FEU.h);
  }
  for (let s = 0; s < 5; s++) {   // des braises au-dessus des flammes
    const x = 8 + hash(s, 21) * 16 + Math.sin(n + s) * 2, y = 16 - ((n * 5 + hash(s, 22) * 20) % 18);
    poser(ox, oy, x, y, (n + s) % 3 ? [255, 176, 64] : [255, 240, 170], 255, FEU.w, FEU.h);
  }
}

ecrire(`${RACINE}public/assets/lpc/forgeron.png`, { W, H, px: out });
const anims = Object.fromEntries(Object.entries(ANIMS).map(([k, a], r) => [k, { rang: r, durees: a.images.map((i) => i[2]) }]));
writeFileSync(`${RACINE}src/data/forgeron.json`, JSON.stringify({
  _lisez_moi: 'Fabriqué par design/classes/baba-brisenclume/outil/forgeron.mjs : ne pas modifier à la main.',
  image: { w: FW, h: FH }, impact: IMPACT, pointe: POINTE, pieds: { x: DX + 32, y: 62 }, anims,
  marche: { rang: 4, directions: ['haut', 'gauche', 'bas', 'droite'], images: 8, pas: 4 }, feu: { rang: 3, w: FEU.w, h: FEU.h, images: FEU.images, pas: 0.1 },
}, null, 1) + '\n');
console.log('forgeron.png', `${W}x${H}`, Object.entries(anims).map(([k, a]) => `${k} ${a.durees.length} images`).join(' · '), '; impact', IMPACT);
