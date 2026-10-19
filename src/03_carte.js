// La carte du camp en pièces LPC : le sol (herbe, terre battue), les bois, les huit emplacements, le feu, le panneau-carte.
// Ce module ne dessine pas à l'écran : il compose le sol dans un canevas et fait la liste des objets et des obstacles.
//   objet    { img, sx, sy, sw, sh, x, y, pied }   une image découpée dans une planche, posée en (x, y) ; `pied` sert au tri
//   obstacle { x, y, w, h }                        un rectangle où un pied ne peut pas entrer (pixels du monde)
import { T, W, H, LIEUX, ARBRES, BOIS, FEU, ENCLOS, MURS, terre } from './01_plan.js';
import POS from './data/carte_zones.json';
import ENTREE from './data/muraille.json';

const hash = (i, j) => ((i * 73856093) ^ (j * 19349663)) >>> 0;

// Le sol, coin par coin : chaque case regarde ses 4 coins (terre ou herbe) et prend la bonne tuile de bord de la planche
// LPC « dirt » (3 x 6 cases : coins intérieurs en haut, le carré 3 x 3 des bords au milieu, les pleins en bas).
const BORD = {   // masque des coins en terre (haut-gauche 1, haut-droite 2, bas-gauche 4, bas-droite 8) → case de la planche
  8: [0, 2], 12: [1, 2], 4: [2, 2], 10: [0, 3], 5: [2, 3], 2: [0, 4], 3: [1, 4], 1: [2, 4],
  7: [1, 0], 11: [2, 0], 13: [1, 1], 14: [2, 1],
};
export function composerSol(im) {
  const c = Object.assign(document.createElement('canvas'), { width: W * T, height: H * T });
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const coin = [];
  for (let j = 0; j <= H; j++) { coin[j] = []; for (let i = 0; i <= W; i++) coin[j][i] = terre(i, j); }
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = i * T, y = j * T, h = hash(i, j);
      g.drawImage(im.herbe, T, 3 * T, T, T, x, y, T, T);
      if (h % 9 === 0) g.drawImage(im.herbe, (h >>> 4) % 3 * T, 5 * T, T, T, x, y, T, T);   // des touffes, ici et là
      const m = (coin[j][i] ? 1 : 0) | (coin[j][i + 1] ? 2 : 0) | (coin[j + 1][i] ? 4 : 0) | (coin[j + 1][i + 1] ? 8 : 0);
      const tuile = (cx, cy) => g.drawImage(im.terre, cx * T, cy * T, T, T, x, y, T, T);
      if (m === 15) { if (h % 5 === 0) tuile((h >>> 3) % 3, 5); else tuile(1, 3); }
      else if (m === 9) { tuile(...BORD[1]); tuile(...BORD[8]); }
      else if (m === 6) { tuile(...BORD[2]); tuile(...BORD[4]); }
      else if (m) tuile(...BORD[m]);
    }
  }
  // l'entrée (#123) : le parement au pied de la muraille, les douves, le pont-levis abaissé et la route pavée
  g.drawImage(im.douves, 0, ENTREE.douves.y);
  return c;
}

// Les arbres : un tronc et une cime (feuillus ou sapins), le pied au bas de la case (ou plus bas : `decalage`, en cases).
// Ce qui bloque, ce sont les cases des bois (BOIS, dans le plan), pas les arbres un par un.
const CIMES = [   // [sx, sy, sw, sh, ligne du bas de la cime dans ce cadre, recouvrement sur le tronc]
  [0, 0, 96, 96, 80, 30], [96, 0, 96, 96, 96, 30], [0, 96, 96, 128, 96, 42], [96, 96, 96, 128, 112, 42],
];
function arbre(objets, i, j, decalage = 0) {
  const h = hash(i, j), pied = Math.round((j + 1 + decalage) * T) - 3, cx = (i + 0.5) * T + ((h >>> 5) % 7) - 3;
  const sapin = h % 3 === 0, k = sapin ? 2 + ((h >>> 2) & 1) : (h >>> 2) & 1;
  const tronc = sapin ? 1 : k, hautTronc = pied - 70;
  objets.push({ img: 'troncs', sx: tronc * 96, sy: 0, sw: 96, sh: 96, x: cx - 48, y: hautTronc, pied });
  const [sx, sy, sw, sh, bas, rec] = CIMES[k];
  objets.push({ img: 'cimes', sx, sy, sw, sh, x: cx - 48, y: hautTronc + rec - bas, pied: pied + 0.01 });
}

// Un arbre de la lisière ouest ou est, hors du camp : coupé au ras du mur (MURS), pour ne pas dépasser côté camp. Au sud de
// la grande muraille, il reste entier.
export function couper(o, cote) {
  if (o.pied > MURS.sud + 40) return o;
  if (cote === 'ouest' && o.x + o.sw > MURS.ouest) o.sw = Math.max(0, MURS.ouest - o.x);
  if (cote === 'est' && o.x < MURS.est) { const d = Math.min(o.sw, MURS.est - o.x); o.x += d; o.sx += d; o.sw -= d; }
  return o;
}

// Une pièce de la planche des décorations médiévales, en cases de 32 px.
const deco = (cx, cy, cw, ch, x, y, pied) => ({ img: 'deco', sx: cx * T, sy: cy * T, sw: cw * T, sh: ch * T, x, y, pied: pied ?? y + ch * T });

// Un lieu au niveau 0 : une corde tendue entre deux piquets, et une pancarte (comme design/camp/outils/tableau.json, niveau 0).
function emplacement(objets, obstacles, [px, py]) {
  const rx = (px - 0.5) * T, ry = (py - 0.3) * T;
  objets.push(deco(6, 6, 3, 1, rx, ry));
  obstacles.push({ x: rx + 12, y: ry + 20, w: 73, h: 9 });
  const sx = (px + 0.5) * T, sy = (py - 0.7) * T;
  objets.push(deco(6, 4, 1, 1, sx, sy));
  obstacles.push({ x: sx + 11, y: sy + 24, w: 8, h: 6 });
}

// L'enclos du terrain d'entraînement (#77) : les mêmes cordes et poteaux que la salle du combat d'entraînement.
// Au nord une corde d'un poteau d'angle à l'autre ; à l'ouest et à l'est des poteaux tous les 3 cases ; au sud deux
// cordes jusqu'aux poteaux de l'entrée. Les cordes passent à mi-hauteur des poteaux (0,7 case au-dessus de leurs pieds).
// La pancarte reste à gauche de l'entrée. Ce qui bloque : la ligne des pieds, sauf l'entrée.
const enPx = (c) => Math.round(c * T);
function enclos(objets, obstacles) {
  const { ouest, est, nord, sud, entree: [g, d] } = ENCLOS;
  // une corde (la planche la dessine à 0,27 case du haut de sa case), triée sur la ligne des pieds `pied`
  const corde = (sy, x0, x1, pied) => {
    for (let x = x0; x < x1 - 0.01; x += 4) {
      const w = Math.min(4, x1 - x);
      objets.push({ img: 'deco', sx: 0, sy: sy * T, sw: enPx(w), sh: T, x: enPx(x), y: enPx(pied - 0.7 - 0.27), pied: enPx(pied) });
    }
  };
  // un poteau (le bois va de 0,19 à 2,64 cases dans sa pièce de 3 cases), le pied sur la ligne
  const poteau = (x, pied) => objets.push({ img: 'deco', sx: 11 * T, sy: 6 * T, sw: T, sh: 3 * T, x: enPx(x - 0.5), y: enPx(pied - 2.64), pied: enPx(pied) + 1 });
  corde(11, ouest, est, nord);
  corde(12, ouest, g, sud);
  corde(12, d, est, sud);
  for (const x of [ouest, est]) for (let y = nord; y <= sud + 0.01; y += 3) poteau(x, y);
  poteau(g, sud); poteau(d, sud);
  const e = 0.22;   // (une demi-épaisseur de clôture)
  obstacles.push(
    { x: enPx(ouest - e), y: enPx(nord - e), w: enPx(est - ouest + 2 * e), h: enPx(2 * e) },
    { x: enPx(ouest - e), y: enPx(nord - e), w: enPx(2 * e), h: enPx(sud - nord + 2 * e) },
    { x: enPx(est - e), y: enPx(nord - e), w: enPx(2 * e), h: enPx(sud - nord + 2 * e) },
    { x: enPx(ouest - e), y: enPx(sud - e), w: enPx(g - ouest + e), h: enPx(2 * e) },
    { x: enPx(d), y: enPx(sud - e), w: enPx(est - d + e), h: enPx(2 * e) },
  );
  const pancarte = deco(6, 4, 1, 1, enPx(g - 1.6), enPx(sud - 0.2));
  objets.push(pancarte);
  obstacles.push({ x: pancarte.x + 11, y: pancarte.y + 24, w: 8, h: 6 });
}

// Le panneau-carte (CAMP §4) : dessiné à part, parce qu'il change avec les niveaux et qu'il scintille.
export const COULEURS = { interface: '#2f68b8', combat: '#c2412f', classes: '#d9822b', art: '#c25a8a', histoire: '#8e5cc2', level: '#2f7d6d', technique: '#5b6e2f', son: '#7a6a5a' };
const ORDRE = ['interface', 'combat', 'classes', 'art', 'histoire', 'level', 'technique', 'son'];
// `zone` clignote (cadre doré) : celle qu'on regarde dans le panneau des missions. `temps` en secondes.
export function dessinerPanneau(g, im, niveaux = {}, zone = null, temps = 0) {
  g.clearRect(0, 0, 96, 80);
  g.drawImage(im.panneau, 0, 0);
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  for (const id of ORDRE) {
    const n = niveaux[id] || 0, [x, y, w, h] = POS[id][n], clignote = zone === id && Math.floor(temps / 0.35) % 2 === 0;
    r(x - 1, y - 1, w + 2, h + 2, clignote ? '#ffd35a' : '#2a2333'); r(x, y, w, h, n ? COULEURS[id] : '#8f8a7c'); if (n >= 3) r(x, y, 1, 1, '#fff5d2');
  }
  let y = 26;
  for (const id of ORDRE) {
    const n = niveaux[id] || 0;
    r(64, y, 3, 3, '#2a2333'); r(65, y + 1, 1, 1, n ? COULEURS[id] : '#8f8a7c'); r(68, y + 1, Math.min(5, 1 + n), 1, '#2a2333'); y += 3;
  }
  r(64, 52, 9, 1, '#2a2333');
}

export function composerCamp() {
  const objets = [], obstacles = [], bloquees = new Set();
  for (const [i, j, d] of ARBRES) {
    if (j === 0 && i > 0 && i < W - 1) continue;   // la lisière du nord : derrière le mur nord, on n'en verrait que les troncs
    const n = objets.length;
    arbre(objets, i, j, d);
    if (i === 0 || i === W - 1) {
      const coupes = objets.splice(n).map((o) => couper(o, i === 0 ? 'ouest' : 'est')).filter((o) => o.sw > 0);
      objets.push(...coupes);
    }
  }
  for (const [i, j] of BOIS) bloquees.add(`${i},${j}`);

  const lieux = {};
  for (const l of LIEUX) {
    const [px, py] = l.porte;
    if (l.id === 'interface') {
      // le panneau-carte : 96 x 80, ses deux poteaux bloquent le passage
      const x = (px - 0.5) * T, bas = Math.round((py + 0.6) * T), y = bas - 80;
      lieux[l.id] = { ...l, panneau: { x, y, w: 96, h: 80, pied: bas } };
      obstacles.push({ x: x + 8, y: bas - 9, w: 9, h: 8 }, { x: x + 77, y: bas - 9, w: 9, h: 8 });
    } else if (l.id === 'combat') {
      enclos(objets, obstacles);
      lieux[l.id] = { ...l };
    } else if (l.id === 'classes') {
      lieux[l.id] = { ...l };                                // l'armurerie : 14_lieux.js la dessine en entier, à chaque niveau
    } else {
      emplacement(objets, obstacles, l.porte);
      lieux[l.id] = { ...l };
    }
    lieux[l.id].centre = [(px + 1) * T, (py + 1) * T];     // le devant du lieu : là où le sentier arrive
  }

  // Le feu, taille 0 (CAMP §4) : le petit feu animé et une souche pour s'asseoir.
  const fx = FEU[0] * T, fy = FEU[1] * T + 8;
  const feu = { img: 'deco', sx: 8 * T, sy: 47 * T, sw: 32, sh: 64, x: fx - 16, y: fy - 62, pied: fy, images: 5, pas: 0.12 };
  // (ce qui bloque autour du feu, et sa souche, sont à la place du village : src/36_place.js, qui cache ce petit feu)

  // Les deux braseros au bout du pont (#123) : animés par la muraille (32_muraille.js) ; leur pied bloque.
  const braseros = ENTREE.braseros.map(([x, y]) => ({ x: x - 8, y, pied: y + 38 }));
  for (const b of braseros) obstacles.push({ x: b.x + 2, y: b.pied - 6, w: 12, h: 6 });

  return { objets, obstacles, bloquees, lieux, feu, braseros };
}
