// L'intérieur de la grande tente des archives, dessiné pixel par pixel pour le jeu (Node seul, sans dépendance) :
//   interieur.png   640 × 360 : la toile du chapiteau, les mâts et la poutre, les pans drapés, la bibliothèque au fond, le plancher,
//                   le tapis et les lanternes. La page des archives le pose derrière son interface, à l'échelle entière.
// (Les cadres de l'interface sont ceux du HUD épique de BABA : src/33_cadres.js.)
// Rampes : le bois et le laiton de design/camp/outils/loup_sculpte.mjs ; contour sombre ; lumière en haut à gauche.
//   node archives.mjs        (depuis design/archives/outil/) → ../../../public/assets/lpc/archives/interieur.png et ../_planche.png
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ecrire } from '../../ui-combat/icones/outil/png.mjs';

const ici = (p) => fileURLToPath(new URL(p, import.meta.url));
const SORTIE = ici('../../../public/assets/lpc/archives/');
mkdirSync(SORTIE, { recursive: true });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BOIS = ['#1e130c', '#2b1c1d', '#3b2716', '#573726', '#85581b', '#986a20', '#b78c41', '#ccbd7b'].map(hex);   // de l'ombre au reflet
const LAITON = ['#1e130c', '#85581b', '#986a20', '#b78c41', '#ccbd7b', '#f0dfa0'].map(hex);
const TOILE = ['#6f5f45', '#8f7d5c', '#b3a07a', '#cdbb92', '#ddcca6', '#ebdfc0', '#f4ead2'].map(hex);
const CONTOUR = hex('#1e130c');
function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function image(W, H) {
  const px = Buffer.alloc(W * H * 4);
  const im = {
    W, H, px,
    p(x, y, c, a = 255) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H || !c) return;
      const i = (y * W + x) * 4;
      if (a >= 255) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; return; }
      const k = a / 255; px[i] = px[i] * (1 - k) + c[0] * k; px[i + 1] = px[i + 1] * (1 - k) + c[1] * k; px[i + 2] = px[i + 2] * (1 - k) + c[2] * k; px[i + 3] = 255;
    },
    rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) im.p(i, j, c); },
    ligne(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) im.p(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c); },
    get(x, y) { const i = (y * W + x) * 4; return [px[i], px[i + 1], px[i + 2], px[i + 3]]; },
  };
  return im;
}
// une boîte de bois en relief : contour sombre, lumière en haut à gauche, ombre en bas à droite
function boite(im, x, y, w, h, rampe = BOIS, base = 3) {
  im.rect(x, y, w, h, CONTOUR);
  im.rect(x + 1, y + 1, w - 2, h - 2, rampe[base + 1]);
  im.rect(x + 2, y + 2, w - 3, h - 3, rampe[base]);
  im.rect(x + 2, y + h - 2, w - 3, 1, rampe[base - 1]); im.rect(x + w - 2, y + 2, 1, h - 3, rampe[base - 1]);
}
// un mât de bois vertical, veiné
function mat(im, x, y0, y1, w, r) {
  im.rect(x, y0, w, y1 - y0, CONTOUR);
  for (let y = y0; y < y1; y++) for (let i = 1; i < w - 1; i++) {
    const k = i / (w - 1), c = k < 0.3 ? BOIS[5] : k < 0.7 ? BOIS[4] : BOIS[3];
    im.p(x + i, y, (y * 7 + i * 13) % 23 === 0 ? BOIS[3] : c);
  }
  for (let y = y0 + 6; y < y1; y += 9 + Math.floor(r() * 12)) im.p(x + 1 + Math.floor(r() * (w - 2)), y, BOIS[2]);
}

// --- L'intérieur de la grande tente ---------------------------------------------------------------------------------
function interieur() {
  const W = 640, H = 360, im = image(W, H), r = hasard(1018);
  const SOL = 282, HAUT_ETAGERE = 74;
  // la toile : des pans qui montent vers le faîte, un sur deux un peu plus sombre, des plis
  const fx = W / 2, fy = -120;
  for (let y = 0; y < SOL; y++) for (let x = 0; x < W; x++) {
    const ang = Math.atan2(x - fx, y - fy), pan = Math.floor((ang + Math.PI) / 0.11);
    const ombre = (Math.abs(x - fx) / W) * 2.2 + (y > 120 ? (y - 120) / 260 : 0) + (y < 70 ? (70 - y) / 26 : 0);   // le haut du chapiteau, dans l'ombre
    let k = 5 - Math.round(ombre) - (pan % 2);
    const pli = Math.sin((ang * 120) + y * 0.02);
    if (pli > 0.92) k -= 1;
    im.p(x, y, TOILE[Math.max(0, Math.min(6, k))]);
  }
  // les coutures des pans
  for (let k = -12; k <= 12; k++) {
    const a = k * 0.11 * 2;
    for (let y = 0; y < SOL; y++) { const x = fx + Math.tan(a) * (y - fy); im.p(x, y, TOILE[1]); }
  }
  // les côtés : la toile tombe plus sombre, avec ses cordes de laçage
  for (let y = 0; y < SOL; y++) for (let x = 0; x < 52; x++) { const k = x < 6 ? 0 : x < 26 ? 1 : 2; if ((x + y) % 3 || k < 2) { im.p(x, y, TOILE[k]); im.p(W - 1 - x, y, TOILE[k]); } }
  for (let y = 20; y < SOL; y += 22) { im.ligne(46, y, 54, y + 8, BOIS[3]); im.ligne(W - 47, y, W - 55, y + 8, BOIS[3]); }

  // la bibliothèque du fond : un grand meuble, 5 rayons de livres, de rouleaux et de piles
  const EX = 70, EW = W - 140, EY = HAUT_ETAGERE, EH = SOL - EY - 4, RAYON = Math.floor((EH - 12) / 5);
  boite(im, EX - 6, EY - 10, EW + 12, 12, BOIS, 4);                         // la corniche
  boite(im, EX, EY, EW, EH, BOIS, 3);
  im.rect(EX + 6, EY + 4, EW - 12, EH - 8, BOIS[1]);                         // le fond du meuble, dans l'ombre
  const COULEURS = [['#7a2a22', '#a8443a', '#c8685a'], ['#2c4670', '#43679e', '#6a8cc0'], ['#365f2e', '#4f8340', '#74a85e'], ['#5e4024', '#85603a', '#a8845a'],
    ['#4f3462', '#6e4c86', '#9370aa'], ['#8a6422', '#b08a32', '#d0ac58'], ['#3a2c22', '#55402e', '#70583e'], ['#6a2440', '#8e3a5a', '#b25e7c']].map((t) => t.map(hex));
  for (let k = 0; k < 5; k++) {
    const yb = EY + 6 + (k + 1) * RAYON;                                        // le bas du rayon
    let x = EX + 8;
    while (x < EX + EW - 10) {
      const t = r();
      if (t < 0.06) { x += 4 + Math.floor(r() * 8); continue; }                // un vide
      if (t < 0.14) {                                                           // une pile couchée
        const pw = 14 + Math.floor(r() * 8); let y = yb;
        for (let n = 0; n < 2 + Math.floor(r() * 3) && x + pw < EX + EW - 8; n++) { const c = COULEURS[Math.floor(r() * COULEURS.length)], h = 4 + Math.floor(r() * 2); boite(im, x, y - h, pw - Math.floor(r() * 4), h, c, 1); y -= h; }
        x += pw + 2; continue;
      }
      if (t < 0.2) {                                                            // des rouleaux de parchemin
        for (let n = 0; n < 3 && x < EX + EW - 14; n++) { const h = 5; im.rect(x, yb - h * (n + 1), 12, h, CONTOUR); im.rect(x + 1, yb - h * (n + 1) + 1, 10, h - 2, TOILE[5]); im.p(x + 1, yb - h * (n + 1) + 1, TOILE[6]); im.p(x + 10, yb - h * (n + 1) + 2, TOILE[3]); }
        x += 14; continue;
      }
      const w = 4 + Math.floor(r() * 4), h = RAYON - 8 - Math.floor(r() * 9), c = COULEURS[Math.floor(r() * COULEURS.length)];
      im.rect(x, yb - h, w, h, CONTOUR);
      for (let j = 1; j < h; j++) for (let i = 1; i < w - 1; i++) im.p(x + i, yb - h + j, i === 1 ? c[2] : i === w - 2 ? c[0] : c[1]);
      if (h > 14 && r() < 0.7) { const bande = LAITON[3]; im.rect(x + 1, yb - h + 3, w - 2, 1, bande); im.rect(x + 1, yb - 4, w - 2, 1, bande); }
      x += w;
    }
    boite(im, EX + 4, yb, EW - 8, 5, BOIS, 4);                                  // la planche du rayon
  }
  // les montants du meuble
  for (const mx of [EX, EX + EW / 2 - 3, EX + EW - 7]) boite(im, Math.round(mx), EY, 7, EH, BOIS, 4);

  // le sol : des planches, et le grand tapis
  for (let y = SOL; y < H; y++) for (let x = 0; x < W; x++) {
    const rang = Math.floor((y - SOL) / 9), decal = (rang * 37) % 64, joint = (x + decal) % 64 === 0 || (y - SOL) % 9 === 0;
    im.p(x, y, joint ? BOIS[1] : ((x * 3 + y * 7) % 29 === 0 ? BOIS[2] : (y - SOL) % 9 === 1 ? BOIS[4] : BOIS[3]));
  }
  const TX = 150, TY = SOL + 22, TW = W - 300, TH = H - TY - 8;
  im.rect(TX, TY, TW, TH, CONTOUR);
  for (let y = TY + 1; y < TY + TH - 1; y++) for (let x = TX + 1; x < TX + TW - 1; x++) {
    const bord = Math.min(x - TX, TX + TW - 1 - x, y - TY, TY + TH - 1 - y);
    let c = hex('#7a2a22');
    if (bord <= 4) c = (x + y) % 4 < 2 ? LAITON[3] : LAITON[2];
    else if (bord <= 6) c = hex('#4a1a14');
    else if (((x - TX) % 18 < 2 || (y - TY) % 12 < 1) && bord > 8) c = hex('#8e3a2e');
    im.p(x, y, c);
  }

  // les mâts : un au centre, devant le meuble, et deux au premier plan ; une poutre en haut
  mat(im, W / 2 - 5, 0, SOL + 6, 10, r);
  mat(im, 6, 0, H, 16, r); mat(im, W - 22, 0, H, 16, r);
  boite(im, 0, 14, W, 9, BOIS, 4);
  // des pans de toile drapés sous la poutre, d'un mât à l'autre (des chaînettes)
  for (const [a, b] of [[22, W / 2 - 5], [W / 2 + 5, W - 22]]) {
    for (let x = a; x <= b; x++) {
      const k = (x - a) / (b - a), creux = Math.sin(k * Math.PI) * 26;
      for (let y = 23; y < 23 + creux + 6; y++) {
        const fond = y > 23 + creux;
        im.p(x, y, fond ? (y === Math.round(23 + creux + 5) ? CONTOUR : TOILE[2]) : (y < 26 ? TOILE[2] : ((x + y) % 11 === 0 ? TOILE[3] : TOILE[4])));
      }
      im.p(x, Math.round(23 + creux + 1), TOILE[5]);
    }
  }
  // les lanternes de laiton, pendues à la poutre, et leur halo en pixels
  for (const lx of [150, W - 150]) {
    im.ligne(lx, 23, lx, 40, LAITON[1]);
    for (let rr = 26; rr >= 10; rr -= 8) for (let a = 0; a < 360; a += 2) {
      const x = lx + Math.cos((a * Math.PI) / 180) * rr, y = 52 + Math.sin((a * Math.PI) / 180) * rr * 0.8;
      for (let d = 0; d < 3; d++) if ((Math.round(x) + Math.round(y) + d) % 2 === 0) im.p(x, y + d, hex('#fff0a0'), 38);
    }
    boite(im, lx - 6, 40, 13, 4, LAITON, 2);
    im.rect(lx - 5, 44, 11, 14, CONTOUR); im.rect(lx - 4, 45, 9, 12, hex('#ffd35a')); im.rect(lx - 2, 47, 5, 8, hex('#fff7c8'));
    im.p(lx - 4, 45, LAITON[5]); im.rect(lx, 45, 1, 12, LAITON[2]);
    boite(im, lx - 6, 58, 13, 4, LAITON, 2);
  }
  return im;
}

const pieces = { interieur: interieur() };
for (const [nom, im] of Object.entries(pieces)) ecrire(`${SORTIE}${nom}.png`, im);

// la planche de contrôle : l'intérieur, tel quel
ecrire(ici('../_planche.png'), pieces.interieur);
console.log(Object.entries(pieces).map(([n, im]) => `${n} ${im.W}x${im.H}`).join(', '));
