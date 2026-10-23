// La salle du terrain d'entraînement : 24 x 16 cases jouables (36 x 24 m, FIGHT_RULES « On trial »), le combat D1 du
// kit papier (PAPER_FIGHT_KIT.fr.md) agrandi. Tout est en cases de 32 px ; la salle vue par la géométrie, plus ce qu'il
// faut pour la dessiner en pièces LPC (le sol, l'étang, le fossé, les clôtures et le décor autour).
//
//   ouest : les 4 héros   ·   au nord : l'étang (eau profonde, on ne marche pas dedans) et sa flaque (une surface)
//   est : les ennemis, le chef au fond   ·   au sud : le fossé (la corniche du kit : on y pousse les ennemis)
import { T } from '../01_plan.js';

export const L = 26, H = 20;                        // le monde, en cases (le terrain et ses abords)
export const ZONE = { x0: 1, y0: 2, x1: 25, y1: 18 };   // le terrain jouable : 24 x 16 cases

// L'étang : des coins de case en eau (le sol se dessine coin par coin, comme le camp) ; la forme qui bloque, en cases.
const COINS_EAU = [];
for (let i = 9; i <= 11; i++) for (let j = 5; j <= 6; j++) COINS_EAU.push([i, j]);
const COINS_FOSSE = [];
for (let i = 7; i <= 19; i++) COINS_FOSSE.push([i, 17]);

export const ETANG = { x0: 8.55, y0: 4.55, x1: 11.45, y1: 6.45 };
export const FOSSE = { x0: 6.55, y0: 16.5, x1: 19.45, y1: 18 };

export const DEPARTS = {
  heros: [[3, 8.5], [3, 10.5], [3, 12.5], [3, 14.5]],               // la Brute, le Mage, le Voleur, le Gardien
  ennemis: {
    s1: [18.5, 8.5], s2: [18.5, 10.5], s3: [18.5, 14.5],         // les sbires
    a1: [19.5, 5.5], a2: [19.5, 12.5],                             // les archers
    br: [21.5, 10.5], chef: [21.5, 8.5],                           // la brute ennemie et le chef
  },
};
export const TONNEAUX = [[14, 5], [11.5, 13.5], [17, 15]];
export const FLAQUE = { x: 10, y: 8.3, r: 1.15 };                 // de l'eau peu profonde : Trempé en entrant
const ROCHERS = [[13, 10], [16, 6.5]];
const FOIN = { x0: 6.6, y0: 12.2, x1: 8.4, y1: 13.4 };

// La salle vue par la géométrie (geometrie.js) : ce qui bloque le pas, la vue, l'eau profonde et le fossé.
export function salle() {
  const bord = [
    { x0: -1, y0: -1, x1: L + 1, y1: ZONE.y0, marche: true },
    { x0: -1, y0: ZONE.y1, x1: L + 1, y1: H + 1, marche: true },
    { x0: -1, y0: -1, x1: ZONE.x0, y1: H + 1, marche: true },
    { x0: ZONE.x1, y0: -1, x1: L + 1, y1: H + 1, marche: true },
  ];
  return {
    l: L, h: H,
    obstacles: [
      ...bord,
      { ...ETANG, eau: true },
      { ...FOSSE, fosse: true },
      ...ROCHERS.map(([x, y]) => ({ x, y, r: 0.42, marche: true, vue: true, rocher: true })),
      { ...FOIN, marche: true },
    ],
  };
}

// --- Le dessin ------------------------------------------------------------------------------------------------
export const hash = (i, j) => ((i * 73856093) ^ (j * 19349663)) >>> 0;
// La planche LPC d'un terrain (3 x 6 cases) : quelle case pour quel masque de coins (comme src/03_carte.js).
export const BORD = { 8: [0, 2], 12: [1, 2], 4: [2, 2], 10: [0, 3], 5: [2, 3], 2: [0, 4], 3: [1, 4], 1: [2, 4], 7: [1, 0], 11: [2, 0], 13: [1, 1], 14: [2, 1] };

export function terrain(g, planche, estCoin, plein, l = L, h = H) {        // (l, h : la taille du monde, en cases)
  for (let j = 0; j < h; j++) for (let i = 0; i < l; i++) {
    const m = (estCoin(i, j) ? 1 : 0) | (estCoin(i + 1, j) ? 2 : 0) | (estCoin(i, j + 1) ? 4 : 0) | (estCoin(i + 1, j + 1) ? 8 : 0);
    if (!m) continue;
    const tuile = (cx, cy) => g.drawImage(planche, cx * T, cy * T, T, T, i * T, j * T, T, T);
    if (m === 15) { plein(tuile, hash(i, j)); continue; }
    if (m === 9) { tuile(...BORD[1]); tuile(...BORD[8]); } else if (m === 6) { tuile(...BORD[2]); tuile(...BORD[4]); } else tuile(...BORD[m]);
  }
}

// Le sol : l'herbe autour, la terre battue du terrain, l'étang, le fossé.
export function composerSol(im) {
  const c = Object.assign(document.createElement('canvas'), { width: L * T, height: H * T });
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let j = 0; j < H; j++) for (let i = 0; i < L; i++) {
    g.drawImage(im.herbe, T, 3 * T, T, T, i * T, j * T, T, T);
    const h = hash(i, j);
    if (h % 9 === 0) g.drawImage(im.herbe, (h >>> 4) % 3 * T, 5 * T, T, T, i * T, j * T, T, T);
  }
  const dansZone = (i, j) => i >= ZONE.x0 && i <= ZONE.x1 && j >= ZONE.y0 && j <= ZONE.y1;
  terrain(g, im.terre, dansZone, (tuile, h) => (h % 5 === 0 ? tuile((h >>> 3) % 3, 5) : tuile(1, 3)));
  const eau = new Set(COINS_EAU.map(([i, j]) => `${i},${j}`));
  terrain(g, im.eau, (i, j) => eau.has(`${i},${j}`), (tuile, h) => tuile((h >>> 3) % 3, 5));
  const fosse = new Set(COINS_FOSSE.map(([i, j]) => `${i},${j}`));
  terrain(g, im.trou, (i, j) => fosse.has(`${i},${j}`), (tuile) => tuile(1, 3));
  return c;
}

// Une pièce de la planche des décorations médiévales, en cases (sx, sy, w, h) posée en (x, y) cases ; `pied` : son tri.
export const deco = (sx, sy, w, h, x, y, pied) => ({ img: 'deco', sx: sx * T, sy: sy * T, sw: w * T, sh: h * T, x: x * T, y: y * T, pied: (pied ?? y + h) * T });

// Le décor qui ne bouge pas : les cordes du terrain, les poteaux, et l'équipement d'entraînement le long du nord.
export function composerDecor() {
  const objets = [];
  for (let x = ZONE.x0; x < ZONE.x1; x += 4) {
    objets.push(deco(0, 11, 4, 1, x, ZONE.y0 - 0.65, ZONE.y0 - 0.2));          // la corde du nord
    objets.push(deco(0, 12, 4, 1, x, ZONE.y1 - 0.15, ZONE.y1 + 0.3));          // la corde du sud
  }
  for (let y = ZONE.y0 - 1.6; y <= ZONE.y1 - 2; y += 3) {
    objets.push(deco(11, 6, 1, 3, ZONE.x0 - 0.55, y, y + 2.9));                // les poteaux de l'ouest
    objets.push(deco(11, 6, 1, 3, ZONE.x1 - 0.45, y, y + 2.9));                // et de l'est
  }
  // au nord, derrière la corde : de quoi s'entraîner (décor seulement)
  objets.push(deco(10, 4, 1, 2, 2.0, -0.3));        // un épouvantail
  objets.push(deco(4, 47, 2, 2, 4.2, -0.2));        // une cible sur son trépied
  objets.push(deco(3, 47, 1, 2, 7.0, -0.25));       // une botte de foin et sa cible
  objets.push(deco(1, 47, 2, 1, 12.5, 0.6));        // un râtelier
  objets.push(deco(2, 48, 1, 2, 15.4, -0.25));      // les arcs
  objets.push(deco(3, 49, 1, 1, 16.4, 0.75));       // un tonneau de flèches
  objets.push(deco(0, 48, 2, 1, 18.5, 0.6));        // une barrière
  objets.push(deco(10, 4, 1, 2, 23.0, -0.3));       // un autre épouvantail
  // dans le terrain : le foin (il bloque le pas, pas la vue) et les rochers (ils bloquent les deux)
  objets.push(deco(4, 21, 2, 2, FOIN.x0 - 0.1, FOIN.y0 - 0.95, FOIN.y1));
  for (const [x, y] of ROCHERS) objets.push({ img: 'roche', sx: 0, sy: 0, sw: T, sh: T, x: (x - 0.5) * T, y: (y - 0.75) * T, pied: (y + 0.3) * T });
  return objets;
}

export const enPixels = (c) => c * T;
