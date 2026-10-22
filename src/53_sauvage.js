// Le dehors, sauvage (CAMP.fr.md §4, plan agrandi) : ce qui fait vivre les clairières de l'ouest, de l'est et du nord, et la
// forêt autour. Trois choses :
//   - le sol : la mousse et les feuilles de la forêt, les fleurs, les touffes, les champignons, les cailloux ; le ruisseau de
//     l'ouest et l'étang de l'est, dessinés pixel par pixel (rives de terre, eau et reflets) ; les nénuphars ;
//   - les pièces qu'on trie avec le reste : buissons, fougères, roseaux, troncs couchés, massifs de fleurs, rochers, arbres
//     isolés, et dans chaque clairière un petit décor à elle (le campement du chasseur à l'ouest, la ferme et l'étang à l'est,
//     la place des fêtes et ses étals au nord) ;
//   - la liste de ce qui bouge (feux, fumée, reflets, lucioles, oiseaux, bêtes) : 54_vivant.js la lit.
// Les pièces dessinées pour le jeu sont faites ici, au chargement, dans une planche à part (images.sauvage) ; le reste vient
// des planches LPC déjà dans le camp (décorations, rochers, arbres).
import { T, X0, Y0, X1, Y1, MONDE, CAMP, LIEUX, EMPLACEMENTS, ARCHIVES, PLACES, CHEMINS, SAUVAGES, DEPARTS, CLAIRIERES, RUISSEAU, ETANG, BOIS, PROFONDEUR, FOSSE, PONTS, estFosse, terre, dansClairiere, libre } from './01_plan.js';

// (un mélange des bits : les bas bits d'un simple produit dessinent des rayures en diagonale)
const hash = (i, j, s = 0) => { let h = (Math.imul(i | 0, 73856093) ^ Math.imul(j | 0, 19349663) ^ Math.imul(s | 0, 83492791)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; h ^= h >>> 15; return h >>> 0; };
const alea = (graine) => { let a = graine >>> 0 || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; };
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

// ---------------------------------------------------------------- la planche des pièces dessinées pour le jeu
const OUT = '#26211f';
const VERTS = ['#1d4a2c', '#2f6b3a', '#43904a', '#69b556', '#a6dc78'];          // un buisson : ombre, ... lumière
const FLEURS = ['#d93d3d', '#f2c744', '#f7f2e6', '#9a6ee0', '#ee8fb4', '#5fa8ee'];
const BOIS_C = ['#2b1c1d', '#573726', '#85581b', '#986a20', '#b78c41'];
export const SPR = {};   // nom -> { sx, sy, sw, sh } dans images.sauvage

export function fabriquerSauvage() {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 256 });
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  let case_ = 0;
  const poser = (nom, sw, sh, dessin) => {
    const per = Math.ceil(512 / 64), x = (case_ % per) * 64, y = Math.floor(case_ / per) * 48;
    case_ += sw > 32 ? 2 : 1;
    SPR[nom] = { sx: x, sy: y, sw, sh };
    dessin(x, y);
  };
  // un buisson rond, éclairé en haut à gauche : contour sombre, masses de feuilles, quelques points de lumière
  const buisson = (nom, w, h, seed, baies, pal = VERTS) => poser(nom, w, h, (x0, y0) => {
    const rnd = alea(seed), cx = w / 2, cy = h * 0.55, rx = w / 2 - 1, ry = h * 0.5 - 1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry, d = dx * dx + dy * dy + (rnd() - 0.5) * 0.18;
      if (d > 1) continue;
      let k = 2 + (dx + dy < -0.5 ? 1 : 0) + (dx + dy < -1.0 ? 1 : 0) - (dx + dy > 0.45 ? 1 : 0) - (dx + dy > 0.95 ? 1 : 0);
      if (rnd() < 0.18) k += rnd() < 0.5 ? 1 : -1;
      px(x0 + i, y0 + j, pal[Math.max(0, Math.min(4, k))]);
      if (d > 0.86) px(x0 + i, y0 + j, pal[0]);
    }
    for (let i = 0; i < w; i++) for (let j = h - 1; j >= 0; j--) { if (g.getImageData(x0 + i, y0 + j, 1, 1).data[3]) { px(x0 + i, Math.min(h - 1, j + 1) + y0, OUT); break; } }
    for (let n = 0; n < baies; n++) { const bx = x0 + 3 + Math.floor(rnd() * (w - 6)), by = y0 + 3 + Math.floor(rnd() * (h - 8)); if (g.getImageData(bx, by, 1, 1).data[3]) { const col = baies > 6 ? FLEURS[0] : FLEURS[(n % 3) + 1]; r(bx, by, 2, 2, col); px(bx, by, '#ffffffaa'); } }
  });
  buisson('buisson0', 30, 24, 11, 0);
  buisson('buisson1', 26, 20, 23, 0);
  buisson('buisson2', 28, 22, 37, 9);        // un buisson à baies rouges
  buisson('buisson3', 28, 22, 41, 7, ['#2a5236', '#3e7a48', '#58a15a', '#8cc970', '#c3eb95']);   // en fleurs
  // une touffe d'herbe haute et une fougère
  poser('herbeHaute', 22, 18, (x0, y0) => {
    const rnd = alea(5);
    for (let n = 0; n < 11; n++) {
      const bx = 2 + Math.floor(rnd() * 18), h = 8 + Math.floor(rnd() * 9), pen = (rnd() - 0.5) * 0.35;
      for (let k = 0; k < h; k++) px(x0 + Math.round(bx + pen * k), y0 + 17 - k, k > h * 0.7 ? VERTS[4] : k > h * 0.3 ? VERTS[3] : VERTS[2]);
      px(x0 + Math.round(bx + pen * h), y0 + 17 - h, VERTS[4]);
    }
  });
  poser('fougere', 26, 20, (x0, y0) => {
    for (const [a, l] of [[-1.1, 12], [-0.6, 15], [-0.15, 17], [0.3, 16], [0.8, 14], [1.2, 11]]) {
      for (let k = 0; k < l; k++) {
        const x = 13 + Math.sin(a) * k * 0.85, y = 18 - Math.cos(a) * k * 0.95 + (k * k) / 60;
        px(x0 + Math.round(x), y0 + Math.round(y), k > l * 0.5 ? VERTS[3] : VERTS[2]);
        if (k > 2 && k % 2 === 0) { px(x0 + Math.round(x) - 1, y0 + Math.round(y) + 1, VERTS[1]); px(x0 + Math.round(x) + 1, y0 + Math.round(y) + 1, VERTS[1]); }
      }
    }
  });
  // des roseaux : tiges, feuilles longues, et le cigare brun
  poser('roseaux', 28, 38, (x0, y0) => {
    const rnd = alea(9);
    for (let n = 0; n < 7; n++) {
      const bx = 3 + n * 3 + Math.floor(rnd() * 2), h = 22 + Math.floor(rnd() * 14), pen = (rnd() - 0.5) * 0.25;
      for (let k = 0; k < h; k++) px(x0 + Math.round(bx + pen * k), y0 + 37 - k, k > h * 0.5 ? VERTS[3] : VERTS[2]);
      if (n % 2 === 0) { const tx = x0 + Math.round(bx + pen * h); r(tx - 1, y0 + 37 - h - 5, 2, 6, BOIS_C[1]); px(tx - 1, y0 + 37 - h - 5, BOIS_C[3]); }
      else for (let k = 0; k < 8; k++) px(x0 + Math.round(bx + pen * h + k * 0.8), y0 + 37 - h + k * 0.7, VERTS[3]);
    }
  });
  // un massif de fleurs (une par couleur) : feuilles, tiges, corolles
  FLEURS.slice(0, 5).forEach((col, v) => poser('massif' + v, 28, 18, (x0, y0) => {
    const rnd = alea(70 + v);
    for (let k = 0; k < 18; k++) px(x0 + 3 + Math.floor(rnd() * 22), y0 + 12 + Math.floor(rnd() * 6), VERTS[1 + Math.floor(rnd() * 3)]);
    for (let n = 0; n < 9; n++) {
      const bx = 3 + Math.floor(rnd() * 21), by = 4 + Math.floor(rnd() * 9), c2 = n % 4 === 3 ? FLEURS[(v + 2) % 5] : col;
      px(x0 + bx, y0 + by + 2, VERTS[2]); px(x0 + bx, y0 + by + 3, VERTS[1]);
      r(x0 + bx - 1, y0 + by, 3, 1, c2); px(x0 + bx, y0 + by - 1, c2); px(x0 + bx, y0 + by, '#fff3b0');
    }
  }));
  // un tronc couché (64 x 22) : l'écorce, ses cernes au bout, de la mousse dessus
  poser('tronc', 56, 22, (x0, y0) => {
    for (let j = 0; j < 16; j++) for (let i = 0; i < 56; i++) {
      const dy = (j - 8) / 8; if (Math.abs(dy) > 1) continue;
      const k = dy < -0.4 ? 4 : dy < 0.1 ? 3 : dy < 0.6 ? 2 : 1;
      px(x0 + i, y0 + 3 + j, (i + j * 3) % 7 === 0 ? BOIS_C[k - 1] : BOIS_C[k]);
    }
    for (let i = 0; i < 56; i++) { px(x0 + i, y0 + 3 + (i % 9 === 0 ? 1 : 0), OUT); px(x0 + i, y0 + 19, OUT); }
    for (let j = 0; j < 16; j++) { px(x0 + 55, y0 + 3 + j, OUT); px(x0, y0 + 3 + j, OUT); }
    for (const [cx, cy, rr] of [[3, 11, 6]]) for (let a = 0; a < 360; a += 4) { const x = Math.round(cx + Math.cos(a * Math.PI / 180) * rr * 0.55), y = Math.round(cy + Math.sin(a * Math.PI / 180) * rr); px(x0 + x, y0 + y, BOIS_C[4]); }
    for (let n = 0; n < 16; n++) px(x0 + 10 + Math.floor(Math.random() * 40), y0 + 2 + Math.floor(Math.random() * 3), n % 2 ? VERTS[2] : VERTS[3]);   // de la mousse
    for (let i = 14; i < 30; i++) r(x0 + i, y0 + 2, 1, 2, VERTS[2]);
  });
  // des champignons : deux grands, un petit
  poser('champignons', 22, 14, (x0, y0) => {
    const un = (cx, by, rr, col) => {
      r(x0 + cx - 1, y0 + by - 4, 2, 4, '#e9dfc4'); r(x0 + cx - rr, y0 + by - 4 - rr + 1, rr * 2, rr, OUT); r(x0 + cx - rr + 1, y0 + by - 4 - rr + 2, rr * 2 - 2, rr - 1, col);
      px(x0 + cx - 1, y0 + by - 4 - rr + 2, '#ffffff'); px(x0 + cx + 1, y0 + by - 4 - rr + 3, '#ffffff');
    };
    un(5, 13, 4, '#c9362f'); un(13, 12, 3, '#c9362f'); un(18, 13, 2, '#a8794a');
  });
  // des pierres de gué : trois dalles plates dans l'eau
  poser('gue', 30, 14, (x0, y0) => {
    for (const [cx, cy, rx] of [[5, 7, 5], [15, 8, 6], [25, 6, 4]]) {
      for (let j = -3; j <= 3; j++) for (let i = -rx; i <= rx; i++) if ((i / rx) ** 2 + (j / 3.2) ** 2 <= 1) px(x0 + cx + i, y0 + cy + j, j < 0 ? '#c1bdb2' : j < 2 ? '#9a968c' : '#6f6c64');
      for (let i = -rx; i <= rx; i++) px(x0 + cx + i, y0 + cy + 3, '#4a4842');
    }
  });
  // un nénuphar avec sa fleur (posé sur l'eau, au sol)
  poser('nenuphar', 14, 10, (x0, y0) => {
    for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) if (((i - 6) / 6) ** 2 + ((j - 4) / 3.5) ** 2 <= 1) px(x0 + 1 + i, y0 + 1 + j, i + j < 7 ? VERTS[3] : VERTS[2]);
    px(x0 + 7, y0 + 4, '#f2c1d6'); px(x0 + 6, y0 + 4, '#ffffff'); px(x0 + 7, y0 + 3, '#ee8fb4');
  });
  // un ballot de linge à sécher / un panier de chasse : un panier tressé plein de champignons
  poser('panier', 18, 16, (x0, y0) => {
    r(x0 + 2, y0 + 6, 14, 9, OUT); r(x0 + 3, y0 + 7, 12, 7, BOIS_C[3]);
    for (let j = 8; j < 14; j += 2) r(x0 + 3, y0 + j, 12, 1, BOIS_C[2]);
    for (let i = 4; i < 14; i += 3) r(x0 + i, y0 + 7, 1, 7, BOIS_C[4]);
    r(x0 + 4, y0 + 3, 4, 4, '#c9362f'); r(x0 + 9, y0 + 4, 3, 3, '#a8794a'); r(x0 + 12, y0 + 2, 3, 4, '#c9362f'); px(x0 + 5, y0 + 4, '#fff'); px(x0 + 13, y0 + 3, '#fff');
  });
  // un tas de pierres du foyer (un anneau), pour le feu de camp
  poser('foyer', 34, 20, (x0, y0) => {
    for (let a = 0; a < 360; a += 28) {
      const x = 17 + Math.cos(a * Math.PI / 180) * 13, y = 11 + Math.sin(a * Math.PI / 180) * 6.5;
      r(x0 + Math.round(x) - 3, y0 + Math.round(y) - 2, 6, 5, OUT); r(x0 + Math.round(x) - 2, y0 + Math.round(y) - 1, 4, 3, a < 180 ? '#a9a59a' : '#7e7a70'); px(x0 + Math.round(x) - 2, y0 + Math.round(y) - 1, '#d4d0c4');
    }
    for (let j = 0; j < 8; j++) for (let i = 0; i < 18; i++) if (((i - 9) / 9) ** 2 + ((j - 4) / 4) ** 2 <= 1) px(x0 + 8 + i, y0 + 7 + j, j < 3 ? '#3a3230' : '#2a2320');
  });
  // un étendoir à peaux (deux poteaux, une corde, deux peaux)
  poser('etendoir', 46, 34, (x0, y0) => {
    for (const x of [3, 41]) { r(x0 + x - 1, y0 + 4, 4, 30, OUT); r(x0 + x, y0 + 5, 2, 28, BOIS_C[3]); r(x0 + x, y0 + 5, 1, 28, BOIS_C[4]); }
    r(x0 + 3, y0 + 7, 40, 2, OUT); r(x0 + 3, y0 + 7, 40, 1, BOIS_C[3]);
    for (const [cx, col, l] of [[10, '#c9a37a', 18], [22, '#8c6a4a', 20], [34, '#d8c8a8', 16]]) {
      for (let j = 0; j < l; j++) { const w = 12 - Math.floor(j / (l / 4)); r(x0 + cx - w / 2 | 0, y0 + 9 + j, w, 1, j % 5 === 0 ? '#6a4c32' : col); px(x0 + (cx - w / 2 | 0), y0 + 9 + j, OUT); px(x0 + (cx + w / 2 | 0) - 1, y0 + 9 + j, OUT); }
    }
  });
  // une ruche sur son support (à l'est) : un dôme de paille, des bandes, un trou
  poser('ruche', 20, 24, (x0, y0) => {
    r(x0 + 3, y0 + 18, 14, 3, OUT); r(x0 + 4, y0 + 19, 12, 1, BOIS_C[3]); r(x0 + 4, y0 + 21, 2, 3, BOIS_C[2]); r(x0 + 14, y0 + 21, 2, 3, BOIS_C[2]);
    for (let j = 0; j < 17; j++) { const w = Math.round(9 * Math.sqrt(1 - ((j - 17) / 17) ** 2)); r(x0 + 10 - w, y0 + 1 + j, 2 * w, 1, j % 4 === 3 ? '#b58a2a' : j % 4 === 0 ? '#f0c85a' : '#e0b445'); px(x0 + 10 - w, y0 + 1 + j, OUT); px(x0 + 9 + w, y0 + 1 + j, OUT); }
    r(x0 + 8, y0 + 12, 4, 3, OUT);
  });
  // une lanterne de fête sur son poteau (la flamme est ajoutée par le jeu)
  poser('lanterne', 12, 46, (x0, y0) => {
    r(x0 + 5, y0 + 10, 3, 36, OUT); r(x0 + 6, y0 + 11, 1, 34, BOIS_C[3]);
    r(x0 + 1, y0 + 2, 11, 9, OUT); r(x0 + 2, y0 + 3, 9, 7, '#ffe48a'); r(x0 + 2, y0 + 3, 9, 1, '#fff7c8'); r(x0 + 4, y0 + 3, 1, 7, OUT); r(x0 + 8, y0 + 3, 1, 7, OUT);
    r(x0 + 3, y0, 7, 2, OUT); px(x0 + 6, y0 - 0, OUT);
  });
  return c;
}

// L'eau des douves : un morceau d'eau pris dans douves.png, répété (chaque bande de 54 px décalée, pour qu'on ne voie pas la répétition).
let eauMemo = null;
export function eauDouves(douves) {
  if (eauMemo) return eauMemo;
  const c = Object.assign(document.createElement('canvas'), { width: douves.width, height: 70 }), g = c.getContext('2d');
  g.drawImage(douves, 0, 0);
  const d = g.getImageData(0, 0, c.width, 70).data, W = c.width, H0 = 14, HH = 54;
  eauMemo = (x, y) => {
    const bande = Math.floor(y / HH), sx = (((x + bande * 211) % W) + W) % W, sy = H0 + ((y % HH) + HH) % HH, k = (sy * W + sx) * 4;
    return [d[k], d[k + 1], d[k + 2]];
  };
  return eauMemo;
}

// Les douves tout autour des trois autres murs, et leurs ponts-levis aux trois portes (comme le pont de la grande porte).
export function dessinerFosse(g, ox, oy, im) {
  const eau = eauDouves(im.douves), px = (x, y, c) => { g.fillStyle = c; g.fillRect(x - ox, y - oy, 1, 1); };
  const pont = (i, j) => (i >= PONTS.ouest.i[0] && i <= PONTS.ouest.i[1] && j >= PONTS.ouest.j[0] && j <= PONTS.ouest.j[1]) ||
    (i >= PONTS.est.i[0] && i <= PONTS.est.i[1] && j >= PONTS.est.j[0] && j <= PONTS.est.j[1]) || (i >= PONTS.nord.i[0] && i <= PONTS.nord.i[1] && j >= PONTS.nord.j[0] && j <= PONTS.nord.j[1]);
  for (const [i, j] of FOSSE) {
    for (let y = j * T; y < (j + 1) * T; y++) for (let x = i * T; x < (i + 1) * T; x++) {
      const c = eau(x, y);
      // la rive : un liseré sombre, puis une lèvre de terre, du côté où l'eau s'arrête
      const gauche = !estFosse(i - 1, j) && x - i * T < 3, droite = !estFosse(i + 1, j) && (i + 1) * T - 1 - x < 3;
      const haut = !estFosse(i, j - 1) && y - j * T < 3, bas = !estFosse(i, j + 1) && (j + 1) * T - 1 - y < 3;
      const bord = (gauche ? x - i * T : 9) < (haut ? y - j * T : 9) ? (gauche ? x - i * T : 9) : (haut ? y - j * T : 9);
      const bord2 = Math.min(bord, droite ? (i + 1) * T - 1 - x : 9, bas ? (j + 1) * T - 1 - y : 9);
      if (bord2 === 0) px(x, y, '#26211f');
      else if (bord2 < 3) px(x, y, bord2 === 1 ? '#7a5632' : '#9a7442');
      else px(x, y, `rgb(${c[0]},${c[1]},${c[2]})`);
    }
  }
  // les ponts : des planches en travers, deux rampes de bois sur les côtés, un cadre sombre
  const planches = (i0, j0, i1, j1, enLong) => {
    const x0 = i0 * T, y0 = j0 * T, x1 = (i1 + 1) * T, y1 = (j1 + 1) * T;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const t = enLong ? y - y0 : x - x0, u = enLong ? x - x0 : y - y0, pas = Math.floor(t / 7), r = t % 7;
      let c = (pas % 2) ? '#8c5e34' : '#a06c3c';
      if (r === 0) c = '#3e2a1c'; else if (r === 1) c = '#c58f58';
      if ((u * 3 + pas * 5) % 17 === 0) c = '#6e4828';
      const lg = enLong ? x1 - x0 : y1 - y0;
      if (u < 3 || u >= lg - 3) c = u === 0 || u === lg - 1 ? '#26211f' : (u < 3 ? '#573726' : '#573726');
      px(x, y, c);
    }
  };
  planches(PONTS.ouest.i[0], PONTS.ouest.j[0], PONTS.ouest.i[1], PONTS.ouest.j[1], false);
  planches(PONTS.est.i[0], PONTS.est.j[0], PONTS.est.i[1], PONTS.est.j[1], false);
  planches(PONTS.nord.i[0], PONTS.nord.j[0], PONTS.nord.i[1], PONTS.nord.j[1], true);
}

// ---------------------------------------------------------------- le sol : ce qui se dessine à plat
// `g` : le contexte du canevas du sol ; (ox, oy) : la place du coin haut-gauche du monde dans ce canevas.
export function dessinerSol(g, ox, oy, im) {
  g.imageSmoothingEnabled = false;
  const eauLPC = eauDouves(im.douves);
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x) - ox, Math.round(y) - oy, 1, 1); };
  const bloc = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x) - ox, Math.round(y) - oy, w, h); };
  const lire = (x, y) => g.getImageData(Math.round(x) - ox, Math.round(y) - oy, 1, 1).data;

  // la forêt : une ombre qui s'épaissit avec la profondeur, de la mousse, des feuilles mortes, des brindilles
  for (const [i, j] of BOIS) {
    const d = PROFONDEUR.get(`${i},${j}`) ?? 7, h = hash(i, j, 3), rnd = alea(h);
    if (i >= CAMP.x0 && i < CAMP.x1 && j >= 31) continue;      // le sud, l'introduction : la forêt claire d'avant, inchangée
    const a = Math.min(0.62, 0.16 + d * 0.08);
    bloc(i * T, j * T, T, T, `rgba(14,40,24,${a})`);
    for (let n = 0; n < 10; n++) {
      const x = i * T + Math.floor(rnd() * 30), y = j * T + Math.floor(rnd() * 30), k = rnd();
      if (k < 0.34) bloc(x, y, 2, 1, 'rgba(94,132,62,0.55)');                                // mousse
      else if (k < 0.55) bloc(x, y, 2, 1, ['#8a5a2a', '#a8742e', '#6e4a22'][n % 3]);          // feuilles mortes
      else if (k < 0.62) { px(x, y, '#4a3a2a'); px(x + 1, y + 1, '#4a3a2a'); px(x + 2, y + 1, '#4a3a2a'); }   // une brindille
      else if (k < 0.68) bloc(x, y, 1, 3, 'rgba(120,200,110,0.6)');                          // une herbe claire
    }
  }

  // les clairières (et l'herbe du camp, plus sage) : des touffes serrées, des taches de trèfle, des fleurs, des champignons, des cailloux
  const detail = (i, j, camp) => {
    const h = hash(i, j, 9), rnd = alea(h), cx = i * T, cy = j * T;
    if (terre(i, j) && terre(i + 1, j) && terre(i, j + 1) && terre(i + 1, j + 1)) return;
    if (h % 5 === 0) {   // une tache de trèfle : une grappe de pixels plus clairs
      const x = cx + 6 + Math.floor(rnd() * 16), y = cy + 6 + Math.floor(rnd() * 16);
      for (let n = 0; n < 9; n++) px(x + Math.floor(rnd() * 7) - 3, y + Math.floor(rnd() * 5) - 2, n % 3 ? '#8fcf6a' : '#b7e58a');
    }
    if (h % (camp ? 4 : 3) === 0) {   // des herbes hautes, en petits paquets
      const x = cx + 4 + Math.floor(rnd() * 22), y = cy + 8 + Math.floor(rnd() * 18);
      for (let k = 0; k < 3; k++) { const hh = 3 + Math.floor(rnd() * 3); bloc(x + k * 2, y - hh, 1, hh, k === 1 ? '#6fb85a' : '#4f9a48'); px(x + k * 2, y - hh, '#a9de7c'); }
    }
    if (h % (camp ? 9 : 7) === 0) {   // des fleurs : de petits bouquets
      const x = cx + 4 + Math.floor(rnd() * 20), y = cy + 6 + Math.floor(rnd() * 20), col = FLEURS[Math.floor(rnd() * 6)];
      for (let n = 0; n < 4; n++) { const fx = x + Math.floor(rnd() * 8) - 4, fy = y + Math.floor(rnd() * 6) - 3; px(fx, fy + 1, '#3f8a3e'); bloc(fx - 1, fy, 3, 1, col); px(fx, fy - 1, col); px(fx, fy, '#fff6b8'); }
    }
    if (!camp && h % 29 === 0) { const x = cx + 8 + Math.floor(rnd() * 14), y = cy + 12 + Math.floor(rnd() * 12); bloc(x, y, 3, 2, '#e9e2d0'); bloc(x - 1, y - 1, 5, 1, '#c9362f'); bloc(x, y - 2, 3, 1, '#c9362f'); px(x + 1, y - 2, '#fff'); }
    if (h % (camp ? 41 : 23) === 0) { const x = cx + 6 + Math.floor(rnd() * 20), y = cy + 8 + Math.floor(rnd() * 18); bloc(x, y, 3, 2, '#8e8a80'); bloc(x, y, 2, 1, '#bdb9ae'); px(x + 3, y + 2, 'rgba(0,0,0,.3)'); }
  };
  for (let j = CAMP.y0 + 2; j < 31; j++) for (let i = 1; i < CAMP.x1 - 1; i++) detail(i, j, true);
  for (const bl of Object.values(CLAIRIERES)) for (const b of bl) {
    const xs = b.map((q) => q[0]), ys = b.map((q) => q[1]);
    for (let j = Math.floor(Math.min(...ys)); j <= Math.ceil(Math.max(...ys)); j++) for (let i = Math.floor(Math.min(...xs)); i <= Math.ceil(Math.max(...xs)); i++) {
      if (!libre(i, j) || (i >= CAMP.x0 && i < CAMP.x1 && j >= CAMP.y0 && j < 31)) continue;
      detail(i, j, false);
    }
  }

  // le ruisseau : une rive de terre, l'eau, des reflets clairs et des rides
  const dist = (pts, x, y) => { let d = 1e9; for (let k = 0; k + 1 < pts.length; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0; d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return d; };
  // l'eau : la même que celle des douves de la grande muraille (LPC : un bleu plat, des traînées cyan en grappes), reprise de
  // douves.png, pour que tout le camp ait la même eau ; plus sombre vers le milieu (k : 0 la rive, 1 le milieu)
  const eau = (x, y) => { const c = eauLPC(x, y); return `rgb(${c[0]},${c[1]},${c[2]})`; };   // (les couleurs exactes des douves : en hiver, la glace les reconnaît, 51_saisons.js)
  const rive = (x, y) => { const h = hash(x, y, 7) % 10; return h < 4 ? '#8d6b44' : h < 7 ? '#a47c50' : h < 9 ? '#755633' : '#b89260'; };
  {
    const xs = RUISSEAU.map((q) => q[0]), ys = RUISSEAU.map((q) => q[1]);
    const x0 = Math.floor(Math.min(...xs) * T) - 40, x1 = Math.ceil(Math.max(...xs) * T) + 40, y0 = Math.floor(Math.min(...ys) * T) - 40, y1 = Math.ceil(Math.max(...ys) * T) + 40;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const d = dist(RUISSEAU, x / T, y / T) * T + Math.sin(x * 0.11 + y * 0.07) * 2.2 + Math.sin(x * 0.31 - y * 0.23) * 1.1;
      if (d > 27) continue;
      if (d < 13) px(x, y, eau(x, y, 1 - d / 13 * 0.7));
      else if (d < 17) px(x, y, rive(x, y));   // la rive
      else if (d < 20 && hash(x, y, 2) % 3 === 0) px(x, y, '#b08a5c');       // de la terre humide qui s'effrite dans l'herbe
      else if (d < 23 && hash(x, y, 4) % 9 === 0) px(x, y, '#d9c79c');           // des grains de sable
    }
  }
  // l'étang : un contour irrégulier, une rive, l'eau profonde au centre, des reflets, des nénuphars
  {
    const [ex, ey, rx, ry] = ETANG, X = ex * T, Y = ey * T, RX = rx * T, RY = ry * T;
    for (let y = Math.floor(Y - RY - 30); y < Y + RY + 30; y++) for (let x = Math.floor(X - RX - 30); x < X + RX + 30; x++) {
      const dx = (x - X) / RX, dy = (y - Y) / RY, wob = 1 + Math.sin(Math.atan2(dy, dx) * 3 + 1) * 0.07 + Math.sin(Math.atan2(dy, dx) * 7) * 0.03, d = Math.hypot(dx, dy) / wob;
      if (d > 1.18) continue;
      if (d < 0.93) px(x, y, eau(x, y, 1 - d * 0.9));
      else if (d < 1.06) px(x, y, rive(x, y));
      else if (hash(x, y, 6) % 4 === 0) px(x, y, d < 1.12 ? '#b69a68' : '#d9c79c');
    }
  }
}

// ---------------------------------------------------------------- les pièces qu'on trie avec le reste
// `objets` : la liste du camp (03_carte.js) ; `obstacles` et `bloquees` : ce qui bloque ; renvoie ce qui bouge (54_vivant.js).
export function decorSauvage({ objets, obstacles, bloquees, images }) {
  const vivants = { feux: [], eau: [], lucioles: [], lanternes: [], zones: {}, mares: [], nids: [] };
  const rnd = alea(2026);
  const occupe = [];   // [x0, y0, x1, y1] en cases : ce qui est déjà posé (on ne pose rien dessus)
  const rect = (e, m = 0) => occupe.push([e[0] - m, e[1] - m, e[2] + m, e[3] + m]);
  for (const l of LIEUX) rect(l.emprise, 1.4);
  for (const e of EMPLACEMENTS) rect(e.emprise, 1.4);
  rect(ARCHIVES.emprise, 1.4);
  for (const r of [[-2, -28.2, 1.4, 35.5], [41.6, -28.2, 45, 35.5], [-2, -28.2, 45, -24.4]]) occupe.push(r);   // les douves et leurs abords
  const proche = (x, y, m = 0) => occupe.some((o) => x > o[0] - m && x < o[2] + m && y > o[1] - m && y < o[3] + m);
  const loinSentier = (x, y, d) => !CHEMINS.some((ch) => distCh(ch, x, y) < d + 0.5) && !SAUVAGES.some((ch) => distCh(ch, x, y) < d) && !DEPARTS.some((q) => distCh(q.points, x, y) < d);
  const surPlace = (x, y, m = 0) => PLACES.some((p) => Math.hypot(x - p.x, y - p.y) < p.r + m);
  const [ex, ey, erx, ery] = ETANG;
  const dansEtang = (x, y, m = 0) => ((x - ex) / (erx + m)) ** 2 + ((y - ey) / (ery + m)) ** 2 < 1;
  const surRuisseau = (x, y, m = 0) => distCh(RUISSEAU, x, y) < 1.05 + m;
  const bon = (x, y, nom, m = 1.0) => !proche(x, y) && loinSentier(x, y, 1.6) && !surPlace(x, y, 1) && !dansEtang(x, y, 1.2) && !surRuisseau(x, y, 1.1) && dansClairiere(x, y, nom) &&
    [[-m, 0], [m, 0], [0, -m], [0, m]].every(([dx, dy]) => dansClairiere(x + dx, y + dy, nom));
  const S = (nom, x, y, plus = {}) => { const s = SPR[nom]; objets.push({ img: 'sauvage', sx: s.sx, sy: s.sy, sw: s.sw, sh: s.sh, x: Math.round(x * T - s.sw / 2), y: Math.round(y * T - s.sh), pied: Math.round(y * T), ...plus }); };
  const base = (x, y, w, h = 5) => obstacles.push({ x: Math.round(x * T - w / 2), y: Math.round(y * T - h), w, h });
  const deco = (cx, cy, cw, ch, x, y, plus = {}) => objets.push({ img: 'deco', sx: Math.round(cx * T), sy: Math.round(cy * T), sw: Math.round(cw * T), sh: Math.round(ch * T), x: Math.round(x * T), y: Math.round((y - ch) * T), pied: Math.round(y * T), ...plus });
  // les accessoires de « [LPC] Tavern » (bluecarrot16) : tav(colonne, rangée, largeur, hauteur de la pièce en cases, x gauche, y du pied) ; tapis : posé à plat
  const tav = (cx, cy, cw, ch, x, y, plus = {}) => objets.push({ img: 'taverne', sx: Math.round(cx * T), sy: Math.round(cy * T), sw: Math.round(cw * T), sh: Math.round(ch * T), x: Math.round(x * T), y: Math.round((y - ch) * T), pied: Math.round(y * T), ...plus });
  const tapis = (cx, cy, cw, ch, x, y) => tav(cx, cy, cw, ch, x, y, { pied: Math.round((y - ch) * T) + 2 });
  const arbreSeul = (x, y, nom) => { const i = Math.floor(x), j = Math.floor(y); if (bloquees.has(`${i},${j}`)) return; bloquees.add(`${i},${j}`); objets.arbres.push([i, j, 0.25]); };
  objets.arbres = [];

  const parClairiere = (nom, f) => { for (const b of CLAIRIERES[nom]) { const xs = b.map((q) => q[0]), ys = b.map((q) => q[1]); f(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)); } };
  // les roseaux et les nénuphars : autour de l'étang et le long du ruisseau
  for (let n = 0; n < 15; n++) {
    const a = n / 15 * 2 * Math.PI + rnd() * 0.3, x = ex + Math.cos(a) * (erx + 0.55), y = ey + Math.sin(a) * (ery + 0.5);
    if (!loinSentier(x, y, 1.1) || (Math.sin(a) > 0.6 && Math.cos(a) < -0.2 && false)) continue;
    S('roseaux', x, y + 0.2, { pied: Math.round((y + 0.2) * T) }); vivants.nids.push([x, y]);
  }
  vivants.mares.push({ x: ex, y: ey, rx: erx, ry: ery });
  for (let n = 0; n < 5; n++) vivants.eau.push([ex + (rnd() - 0.5) * erx * 1.5, ey + (rnd() - 0.5) * ery * 1.4]);
  for (let n = 0; n < 7; n++) { const x = ex + (rnd() - 0.5) * erx * 1.5, y = ey + (rnd() - 0.5) * ery * 1.4; if (dansEtang(x, y, -0.4)) S('nenuphar', x, y, { y: Math.round(y * T) - 6, pied: -9300 }); }
  for (let k = 0; k < RUISSEAU.length - 1; k++) {
    const [ax, ay] = RUISSEAU[k], [bx, by] = RUISSEAU[k + 1];
    for (let n = 0; n < 4; n++) {
      const t = rnd(), x = ax + (bx - ax) * t, y = ay + (by - ay) * t + (rnd() < 0.5 ? -1 : 1) * 1.15;
      if (loinSentier(x, y, 1.2) && dansClairiere(x, y, 'ouest')) { S(rnd() < 0.6 ? 'roseaux' : 'fougere', x, y); }
      vivants.eau.push([x, y - (y > ay ? 1.15 : -1.15)]);
    }
  }
  // le gué : des pierres plates là où un sentier sauvage traverse le ruisseau (on passe à pied sec ; l'eau, elle, ne bloque pas)
  {
    const poses = [];
    for (const ch of SAUVAGES) for (let k = 0; k + 1 < ch.length; k++) for (let t = 0; t <= 1; t += 0.04) {
      const x = ch[k][0] + (ch[k + 1][0] - ch[k][0]) * t, y = ch[k][1] + (ch[k + 1][1] - ch[k][1]) * t;
      if (distCh(RUISSEAU, x, y) < 0.8 && !poses.some(([a2, b2]) => Math.hypot(a2 - x, b2 - y) < 6)) { poses.push([x, y]); S('gue', x, y + 0.45, { pied: -9300 }); }
    }
  }

  // où poser un décor de w x h cases, le plus près de (cx, cy) : tout dans la clairière, loin des sentiers, des lieux, de l'eau
  const RAISON = {};
  const libreRect = (x, y, w, h, nom) => {
    const e = [x - w / 2, y - h, x + w / 2, y];
    if (occupe.some((o) => e[0] < o[2] && o[0] < e[2] && e[1] < o[3] && o[1] < e[3])) { RAISON.occupe = (RAISON.occupe ?? 0) + 1; return false; }
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const px = e[0] + (e[2] - e[0]) * i / 4, py = e[1] + (e[3] - e[1]) * j / 4;
      if (!dansClairiere(px, py, nom)) { RAISON.hors = (RAISON.hors ?? 0) + 1; return false; }
      if (!loinSentier(px, py, 1.2)) { RAISON.sentier = (RAISON.sentier ?? 0) + 1; return false; }
      if (dansEtang(px, py, 1.5) || surRuisseau(px, py, 1.2) || surPlace(px, py, 0.5)) { RAISON.eau = (RAISON.eau ?? 0) + 1; return false; }
      if (![[-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]].every(([dx, dy]) => dansClairiere(px + dx, py + dy, nom))) { RAISON.bord = (RAISON.bord ?? 0) + 1; return false; }
    }
    // les cimes des arbres de la lisière sud couvrent trois rangées au nord de leur tronc : il faut de la place devant
    for (let i = 0; i <= 4; i++) if (!dansClairiere(e[0] + (e[2] - e[0]) * i / 4, y + 3.2, nom)) { RAISON.cimes = (RAISON.cimes ?? 0) + 1; return false; }
    return true;
  };
  const cherche = (nom, cx, cy, w, h) => {
    for (let r = 0; r <= 26; r += 0.5) for (let a = 0; a < 360; a += r === 0 ? 360 : 12) {
      const x = cx + Math.cos(a * Math.PI / 180) * r, y = cy + Math.sin(a * Math.PI / 180) * r * 0.8;
      if (libreRect(x, y, w, h, nom)) { occupe.push([x - w / 2 - 0.5, y - h, x + w / 2 + 0.5, y + 3]); return [x, y]; }
    }
    console.error('cherche', nom, cx, cy, JSON.stringify(RAISON)); return null;
  };
  const brule = (x, y, type = 'feu') => vivants.feux.push({ x: x * T, y: y * T, type });
  const sol = [];     // ce qui se dessine à plat, après coup : { f(g, ox, oy) }

  // ------- à l'ouest : le campement du chasseur (sa tente, son feu qui fume, ses bûches, son étendoir, son panier)
  const camp = cherche('ouest', -28, 9, 9, 5.5);
  if (camp) {
    const [cx, ay] = camp, ax = cx + 0.6;                     // le feu, un peu à droite du milieu
    S('foyer', ax, ay - 0.1, { pied: Math.round((ay - 0.1) * T) - 400 }); brule(ax, ay - 0.15);
    deco(12.1, 54, 3.9, 5, cx - 4.2, ay - 0.3); base(cx - 2.3, ay - 0.3, 78, 9);         // la tente, à gauche du feu
    S('etendoir', cx + 3.6, ay - 0.6); base(cx + 3.6, ay - 0.6, 40, 6);                  // l'étendoir à peaux, à droite
    S('tronc', ax - 0.6, ay + 1.7); base(ax - 0.6, ay + 1.7, 40, 6);                     // deux troncs pour s'asseoir
    S('tronc', ax + 2.0, ay + 1.3); base(ax + 2.0, ay + 1.3, 40, 6);
    deco(14, 20, 2, 2, cx + 2.6, ay + 2.2); base(cx + 3.6, ay + 2.2, 50, 8);             // les bûches
    S('panier', ax - 2.2, ay + 1.0); S('champignons', ax + 0.9, ay + 2.4);
    deco(14.2, 22.2, 1.8, 1.4, cx - 3.8, ay + 2.2); base(cx - 2.9, ay + 2.2, 24, 6);     // un billot et sa hache
    tapis(13, 34, 3, 2, ax - 0.9, ay + 3.2);                                              // une peau d'ours sous les troncs
    tav(0, 27, 1, 1, ax - 1.15, ay + 1.55, { pied: Math.round((ay + 1.75) * T) });       // un rôti sur le tronc
    tav(2, 17, 1, 1, ax + 1.55, ay + 1.4, { pied: Math.round((ay + 1.4) * T) }); tav(2, 19, 1, 1, ax + 0.3, ay + 2.55);   // une chope, une bouteille
    vivants.zones.chasseur = { x: ax * T, y: ay * T };
    vivants.lucioles.push([ax, ay - 1]);
  }
  // ------- à l'est : la ferme (des meules, des ruches, un épouvantail, un potager) près de l'étang
  const ferme = cherche('est', 66, 5, 7.4, 4.8) ?? cherche('est', 66, 6, 6.8, 4.4);
  if (ferme) {
    const [fx, fy] = ferme;
    deco(0, 20, 1.9, 3, fx - 3.6, fy - 0.9); base(fx - 2.7, fy - 0.9, 36, 8);              // une meule ronde
    deco(2, 20.2, 1.5, 1.6, fx - 1.7, fy - 0.8); base(fx - 0.9, fy - 0.8, 40, 8);          // un tas de foin
    deco(6.95, 20, 2.1, 3.1, fx + 0.3, fy - 1.1); base(fx + 1.4, fy - 1.1, 60, 8);          // une charrette
    deco(10, 4, 1, 2, fx + 3.0, fy + 0.5); base(fx + 3.5, fy + 0.5, 12, 5);                // l'épouvantail, dans son champ
    for (let k = 0; k < 3; k++) { const x = fx - 3.1 + k * 0.95, y = fy + 1.7 - (k % 2) * 0.25; S('ruche', x, y); base(x, y, 16, 5); vivants.nids.push([x, y - 0.8]); }
    sol.push((g, ox, oy) => {   // le potager : une planche de terre labourée, des rangs de pousses
      const x0 = Math.round((fx - 0.1) * T) - ox, y0 = Math.round((fy + 0.9) * T) - oy;
      for (let j = 0; j < 36; j++) for (let i = 0; i < 100; i++) { g.fillStyle = (j % 9 < 3) ? '#7a5632' : (j % 9 === 3 ? '#9a7442' : '#6a4a2a'); g.fillRect(x0 + i, y0 + j, 1, 1); }
      for (let rang = 0; rang < 4; rang++) for (let i = 4; i < 96; i += 9) { const y = y0 + rang * 9 + 2; g.fillStyle = '#4fae48'; g.fillRect(x0 + i, y - 2, 2, 4); g.fillStyle = '#8fd66a'; g.fillRect(x0 + i - 1, y - 3, 1, 2); g.fillRect(x0 + i + 2, y - 3, 1, 2); if (rang === 2) { g.fillStyle = '#e07a2a'; g.fillRect(x0 + i, y - 1, 2, 2); } }
    });
    const pose = (nom, f, x, y) => { if (dansClairiere(x, y, nom) && dansClairiere(x + 1.2, y, nom) && !dansEtang(x, y, 1) && !surRuisseau(x, y, 1)) f(); };
    pose('est', () => { tav(1, 1, 2, 2, fx - 1.7, fy + 0.5); base(fx - 0.7, fy + 0.5, 56, 8); }, fx - 1.7, fy + 0.5);   // des tonneaux
    pose('est', () => { tav(13, 20, 1, 1, fx + 0.5, fy + 0.4); tav(14, 20, 1, 1, fx + 1.0, fy + 0.45); }, fx + 0.5, fy + 0.4);   // des dames-jeannes
    tav(4, 25, 1, 1, fx - 0.5, fy + 2.55);                                                // un pain sur le muret du potager
    vivants.zones.ferme = { x: fx * T, y: fy * T };
    vivants.lucioles.push([fx, fy]);
  }
  vivants.zones.etang = { x: ex * T, y: ey * T, rx: erx * T, ry: ery * T };
  if (dansClairiere(ex - 3.4, ey + 2.9, 'est') && !dansEtang(ex - 3.4, ey + 2.9, 0.6)) { tav(3, 0, 1, 1, ex - 3.4, ey + 2.9); base(ex - 2.9, ey + 2.9, 20, 6); tav(13, 20, 1, 1, ex - 5.0, ey + 2.85); }   // le tonneau et la dame-jeanne du pêcheur
  // ------- au nord : la place des fêtes : ses étals, ses lanternes, ses massifs, un puits, des tonneaux, des bancs
  {
    const place = PLACES.find((p) => p.nom === 'la place des fêtes');
    if (place) {
      const { x: px, y: py, r } = place;
      const poser = (f) => f();
      for (const a of [-155, -105, -50, 0, 35, 140, 195]) {   // des lanternes en couronne autour de la place
        const x = px + Math.cos(a * Math.PI / 180) * (r + 1.1), y = py + Math.sin(a * Math.PI / 180) * (r + 0.9) * 0.85 + 0.9;
        if (!dansClairiere(x, y, 'nord') || proche(x, y) || !loinSentier(x, y, 1.3)) continue;
        S('lanterne', x, y); base(x, y, 6, 5); vivants.lanternes.push({ x: x * T, y: (y - 1.4) * T });
      }
      for (const [dx, dy, orange] of [[-6.2, 1.8, true], [6.2, 1.6, false]]) {   // des étals rayés, et un étalage
        const x = px + dx, y = py + dy;
        if (!dansClairiere(x, y, 'nord') || proche(x, y, -0.5) || surPlace(x, y, 0)) continue;
        if (orange) deco(6, 25, 2, 3, x - 1, y - 0.5); else deco(10.62, 25, 2.38, 3, x - 1.2, y - 0.5);
        base(x, y - 0.2, 60, 8); deco(8, 35, 2, 1.5, x - 1, y + 0.5); occupe.push([x - 1.6, y - 4, x + 1.6, y + 1.6]);
        deco(13.5, 17, 1, 1, x + 1.2, y + 1.3);
        // l'étal garni : chopes, pain, fromage, bouteilles sur le comptoir ; ail, herbes et saucisses sous l'auvent
        const pc = Math.round((y + 0.52) * T) + 1;
        tav(2, 17, 1, 1, x - 0.95, y + 0.12, { pied: pc }); tav(4, 25, 1, 1, x - 0.4, y + 0.12, { pied: pc }); tav(0, 25, 1, 1, x + 0.15, y + 0.12, { pied: pc }); tav(2, 19, 1, 1, x + 0.55, y + 0.1, { pied: pc });
        const ph = Math.round((y - 0.45) * T);
        tav(8, 28, 1, 2, x - 0.9, y - 0.95, { pied: ph }); tav(2, 28, 1, 1, x - 0.1, y - 1.1, { pied: ph }); tav(9, 28, 2, 1, x - 0.45, y - 1.05, { pied: ph });
      }
      deco(14, 13, 2, 3.5, px - 5.6, py - 0.8); base(px - 4.6, py - 0.8, 44, 8);            // un puits à manivelle, sur le côté de la place
      for (const [dx, dy] of [[-2.2, 3.1], [2.4, 3.0]]) { deco(6, 34, 2, 1, px + dx - 1, py + dy); base(px + dx, py + dy, 56, 6); }
      tav(9, 2, 1, 1, px - 2.7, py + 2.75, { pied: Math.round((py + 3.1) * T) + 1 });   // un jeu de dames sur un banc   // des bancs, face à la scène
      for (const [dx, dy, v] of [[-3.8, -0.6, 0], [3.6, -0.4, 2], [-1.6, 1.8, 3], [1.8, 2.0, 1]]) S('massif' + v, px + dx, py + dy);
      for (const [dx, dy] of [[-4.6, 3.2], [4.4, 3.4]]) { objets.push({ img: 'tonneau', sx: 0, sy: 0, sw: 32, sh: 32, x: Math.round((px + dx) * T - 16), y: Math.round((py + dy) * T - 30), pied: Math.round((py + dy) * T) }); base(px + dx, py + dy, 20, 6); tav(2, 17, 1, 1, px + dx - 0.5, py + dy - 0.3, { pied: Math.round((py + dy) * T) + 1 }); }
      vivants.zones.fetes = { x: px * T, y: py * T };
    }
  }
  // des arbres, des buissons, des fougères, des massifs, des rochers, des troncs : semés dans chaque clairière, plus ou moins
  for (const nom of ['ouest', 'est', 'nord']) {
    parClairiere(nom, (x0, y0, x1, y1) => {
      for (let n = 0; n < (x1 - x0) * (y1 - y0) * 0.9; n++) {
        const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), k = rnd();
        if (!bon(x, y, nom)) continue;
        if (k < 0.12 && nom !== 'nord') { if (dansEtang(x, y - 1.6, 1.4) || surRuisseau(x, y - 1.6, 1.8)) continue; arbreSeul(x, y, nom); occupe.push([x - 1.2, y - 1.2, x + 1.2, y + 1.2]); }
        else if (k < 0.30) { S('buisson' + Math.floor(rnd() * 4), x, y); base(x, y, 20, 6); occupe.push([x - 0.9, y - 0.7, x + 0.9, y + 0.3]); }
        else if (k < 0.44) { S('fougere', x, y); }
        else if (k < 0.62) { S('massif' + Math.floor(rnd() * 5), x, y); }
        else if (k < 0.74) { S('herbeHaute', x, y); }
        else if (k < 0.82) { const r = Math.floor(rnd() * 2); objets.push({ img: 'roche', sx: r * 32, sy: 0, sw: 32, sh: 32, x: Math.round(x * T - 16), y: Math.round(y * T - 28), pied: Math.round(y * T) }); base(x, y, 18, 6); occupe.push([x - 0.7, y - 0.5, x + 0.7, y + 0.3]); }
        else if (k < 0.88) { S('champignons', x, y); }
        else if (k < 0.955 && nom !== 'nord') { S('tronc', x, y); base(x, y, 46, 6); occupe.push([x - 1.5, y - 0.7, x + 1.5, y + 0.3]); }
        else if (k < 0.97) { deco(15, 23, 1, 1, x - 0.5, y, { pied: Math.round(y * T) }); base(x, y, 14, 6); occupe.push([x - 0.6, y - 0.6, x + 0.6, y + 0.3]); }   // une souche
      }
    });
  }
  // ------- dans le camp : de quoi le rendre habité et soigné (lanternes, haies, massifs, bancs, arbres de jardin, tonneaux)
  {
    const dansCamp = (x, y, m = 0) => x > 2.9 + m && x < 39.6 - m && y > -21.7 + m && y < 29.6 - m;
    const loinDesChemins = (x, y, d, sauf = -1) => !CHEMINS.some((ch, k) => k !== sauf && distCh(ch, x, y) < d);
    const bonVille = (x, y, m = 0) => dansCamp(x, y, 0.4) && !proche(x, y, m) && !surPlace(x, y, 0.8) && loinDesChemins(x, y, 1.6 + m);
    const portes = [[0, 5], [42, 9], [21, -25]];
    // (ce qui est déjà là, à des places fixes : la sentinelle sur le grand sentier, le barde et son enceinte, la boîte aux lettres,
    // le chef de chantier et son panneau, la base du chantier : on laisse de la place autour)
    for (const r of [[10.5, 18.5, 19.5, 31.5], [15, 12.5, 19.5, 16.5], [23, 14.5, 26.5, 17.5], [5.5, 17.5, 11, 22.5], [3, 22, 8, 27.5], [2.6, 6.2, 4.6, 8.2], [37.4, 10.2, 39.4, 12.2], [17.4, -22.6, 19.4, -20.6], [31.8, 21.4, 41, 29.8], [8.5, 8.5, 32, 21]]) occupe.push(r);   // (le centre-ville : 14_lieux.js)   // (les trois gardes des portes : 55_gardes.js)
    // des lanternes le long des allées, un côté puis l'autre, avec leur halo la nuit
    let cote = 1;
    CHEMINS.forEach((ch, k) => {
      let d = 3;
      for (let i = 0; i + 1 < ch.length; i++) {
        const [ax, ay] = ch[i], [bx, by] = ch[i + 1], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
        for (; d < L; d += 5.6) {
          const x = ax + (bx - ax) * d / L + nx * 1.9 * cote, y = ay + (by - ay) * d / L + ny * 1.9 * cote + 0.4;
          cote = -cote;
          if (!dansCamp(x, y, 0.6) || proche(x, y, 0.2) || surPlace(x, y, 0.6) || !loinDesChemins(x, y, 1.5, k)) continue;
          S('lanterne', x, y); base(x, y, 6, 5); vivants.lanternes.push({ x: x * T, y: (y - 1.45) * T }); occupe.push([x - 0.4, y - 0.4, x + 0.4, y + 0.2]);
        }
        d -= L;
      }
    });
    // une haie le long des murs, ouverte aux portes et devant les lieux
    const haie = (x, y) => { if (!dansCamp(x, y, -0.2) || occupe.some((r) => x > r[0] && x < r[2] && y > r[1] && y < r[3]) || proche(x, y, -0.8) || portes.some(([px, py]) => Math.hypot(px - x, py - y) < 4.2) || !loinDesChemins(x, y, 1.1)) return; S('buisson' + ((Math.floor(x * 3 + y * 5)) & 3), x, y); base(x, y, 18, 6); };
    for (let y = -21.2; y < 29.5; y += 1.45) { haie(3.4, y); haie(39.2, y); }
    for (let x = 3.4; x < 39.5; x += 1.45) haie(x, -21.5);
    // des massifs de fleurs qui bordent les allées
    for (let n = 0; n < 260; n++) {
      const x = 3 + rnd() * 37, y = -21 + rnd() * 50;
      if (!bonVille(x, y, -0.4) || loinDesChemins(x, y, 2.9) || distCh(CHEMINS[0], x, y) > 90) continue;
      S('massif' + Math.floor(rnd() * 5), x, y); occupe.push([x - 0.7, y - 0.5, x + 0.7, y + 0.2]);
    }
    // des arbres de jardin, espacés, un bosquet de buissons par endroits
    const plantes = [];
    for (let n = 0; n < 900 && plantes.length < 22; n++) {
      const x = 4 + rnd() * 35, y = -20 + rnd() * 48;
      if (!bonVille(x, y, 1.1) || plantes.some(([a, b]) => Math.hypot(a - x, b - y) < 6.5)) continue;
      plantes.push([x, y]); arbreSeul(x, y); occupe.push([x - 1.3, y - 1.3, x + 1.3, y + 0.6]);
      for (const [dx, dy] of [[-1.4, 0.5], [1.5, 0.7], [0.2, 1.2]]) if (rnd() < 0.7 && bonVille(x + dx, y + dy, -0.2)) { S('buisson' + Math.floor(rnd() * 4), x + dx, y + dy); base(x + dx, y + dy, 18, 6); }
    }
    // des herbes hautes, des fougères et des cailloux, pour que l'herbe ne soit pas vide
    for (let n = 0; n < 420; n++) {
      const x = 3 + rnd() * 37, y = -21 + rnd() * 50;
      if (!bonVille(x, y, -0.6)) continue;
      const k = rnd();
      if (k < 0.5) S('herbeHaute', x, y); else if (k < 0.75) S('fougere', x, y); else if (k < 0.9) S('champignons', x, y);
      else { objets.push({ img: 'roche', sx: 0, sy: 0, sw: 32, sh: 32, x: Math.round(x * T - 16), y: Math.round(y * T - 28), pied: Math.round(y * T) }); base(x, y, 18, 6); }
    }
    // des bancs aux places et devant les lieux ; des tonneaux et des caisses chez les artisans ; un râtelier et des cibles chez les héros
    const savoir = PLACES.find((p) => p.nom === 'la place du savoir');
    if (savoir) for (const [dx, dy] of [[-3.6, -0.2], [3.6, -0.2], [-1.8, 2.8], [1.8, 2.8]]) {
      const x = savoir.x + dx, y = savoir.y + dy;
      if (dansCamp(x, y) && !proche(x, y, -0.3) && loinDesChemins(x, y, 1.4)) { deco(6, 34, 2, 1, x - 1, y); base(x, y, 56, 6); tav(dx < 0 ? 7 : 6, dx < 0 ? 0 : 1, 1, 1, x - 0.5, y - 0.05, { pied: Math.round(y * T) + 1 }); }   // un parchemin, ou un livre, sur le banc
    }
    // les accessoires de la taverne, là où ils font sens : un parchemin et un livre sur les bancs du savoir ; à chaque porte, un tonneau, une lanterne
    // et un bouclier de la garde ; des boucliers au pied du râtelier du terrain d'entraînement
    for (const [bx, by, sx2, sy2] of [[2.1, 8.5, 2.95, 8.55], [39.3, 12.5, 38.45, 12.55], [16.9, -20.4, 17.75, -20.35]]) {
      tav(3, 0, 1, 1, bx, by); base(bx + 0.5, by, 22, 6); tav(12, 14, 1, 1, bx, by - 0.55);   // un tonneau et sa lanterne
      tav(2, 40, 1, 1, sx2, by); base(sx2 + 0.5, by, 20, 6);                                  // un bouclier posé contre le mur
    }
    { const [x0, , , y1] = LIEUX.find((q) => q.id === 'classes').emprise; tav(2, 41, 1, 1, x0 - 1.0, y1 + 0.1); tav(2, 39, 1, 1, x0 - 0.2, y1 + 0.2); tav(3, 41, 1, 1, x0 + 0.6, y1 + 0.15); }
    for (const id of ['technique', 'art']) {
      const l = LIEUX.find((q) => q.id === id), [x0, y0, x1, y1] = l.emprise;
      for (const [dx, dy, t] of [[x1 + 0.6, y1 - 0.4, 'tonneau'], [x1 + 1.6, y1 - 0.6, 'tonneau'], [x1 + 1.1, y1 - 1.7, 'tonneau']]) {
        const x = dx, y = dy; if (!dansCamp(x, y, 0.4) || !loinDesChemins(x, y, 1.4)) continue;
        objets.push({ img: 'tonneau', sx: 0, sy: 0, sw: 32, sh: 32, x: Math.round(x * T - 16), y: Math.round(y * T - 30), pied: Math.round(y * T) }); base(x, y, 20, 6);
      }
      if (id === 'technique') { deco(14, 20, 2, 2, x0 - 2.6, y1 - 0.2); base(x0 - 1.6, y1 - 0.2, 50, 8); }
    }
    const heros = LIEUX.find((q) => q.id === 'classes');
    if (heros) { const [x0, y0, x1, y1] = heros.emprise; deco(1, 47, 2, 1, x0 - 3.2, y1 - 0.3); base(x0 - 2.2, y1 - 0.3, 56, 6); deco(4, 47, 2, 2, x0 - 3.2, y0 + 1.5); base(x0 - 2.2, y0 + 1.5, 40, 6); }
  }
  return { vivants, sol, bon, S, base, deco, occupe, loinSentier, proche, surPlace, dansEtang, rnd, arbres: objets.arbres };
}

function distCh(pts, x, y) {
  let d = 1e9;
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0;
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}
