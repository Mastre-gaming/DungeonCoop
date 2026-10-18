// Les lieux grandissent (CAMP §4) : chaque lieu prend le niveau que lui donnent les missions rentrées de son axe
// (S 1, M 3, L 8 ; niveaux aux seuils 1, 5, 15, 35), et se dessine avec les pièces LPC de ce niveau.
// Un niveau montre ses pièces et celles des niveaux d'avant. Une pièce peut s'animer (lanternes, torches) et bloquer
// le passage (sa base). Quand un lieu monte de niveau en direct, il s'illumine un instant.
// Porte T : le tableau d'affichage d'abord (validé par le propriétaire), les sept autres ensuite, sur son modèle.
import { T, LIEUX, emprise, terre } from './01_plan.js';
import ARMURERIE from './data/armurerie.json';

export const name = 'lieux';
export const always = true;

// Une pièce : la case de la planche des décorations (sx, sy, en cases), sa taille (w, h), sa place dans l'emprise du
// lieu (dx, dy, en cases, depuis le coin haut-gauche de son emprise : 6 x 5, ou l'enclos 8 x 8), et :
//   anim : les colonnes de ses images (elle les parcourt en boucle), pas : la durée d'une image
//   bloque : sa base bloque le passage   pied : où elle se trie (en cases depuis le haut de l'emprise ; par défaut, son bas)
const P = (sx, sy, w, h, dx, dy, plus = {}) => ({ sx, sy, w, h, dx, dy, ...plus });
const LANTERNE = { anim: [13, 14, 15], pas: 0.18 };
const TORCHE = { anim: [13, 14, 15], pas: 0.12 };

// Le tableau d'affichage apprivoise la nature autour de lui et devient pierre (maquette validée par le propriétaire le
// 18 oct) : des pierres de gué, puis des pavés qui suivent la terre battue et les sentiers, puis le panneau, la potence et
// l'étal en pierre blanche. Le crieur (38_crieur.js) monte sur son estrade de bois au niveau 3.
// Le panneau-carte occupe dx 1,5 à 4,5 et dy 2,1 à 4,6 dans l'emprise. `jusqua` : la pièce s'en va au-delà de ce niveau
// (la potence de bois, remplacée par celle de pierre). Les pièces img 'tableau' sont dessinées par tableau_jeu.py.
const PIERRE = { img: 'tableau' };
export const ESTRADE = { dx: 6.0, dy: 2.4 };          // l'estrade du crieur (2 x 2 cases), à droite de la potence
export const NIVEAUX = {
  interface: [
    [],                                                                  // 0 : le panneau-carte seul, dans la terre
    [P(7, 5, 1, 1, 0.45, 3.55, { bloque: true }),                       // 1 : un panneau à feuilles épinglées, à côté ;
      P(0, 4, 3, 1, 1.4, 4.7, { ...PIERRE, pied: 0, jusqua: 1 })],             //     des pierres de gué posées dans la terre
    [P(11, 0, 1, 2, 4.75, 2.55, { bloque: true, jusqua: 3 }),            // 2 : une potence, sa lanterne allumée ;
      P(13, 0, 1, 1, 5.35, 2.95, { ...LANTERNE, pied: 4.6 }),            //     les premiers pavés, des socles de pierre
      P(3, 4, 3, 0.5, 1.5, 4.1, { ...PIERRE, pied: 4.63 })],             //     au pied des poteaux
    [P(6, 34, 2, 1, -0.3, 4.45, { bloque: true }),                        // 3 : un banc pour lire les missions, deux buis,
      P(7, 1, 1, 2, 0.7, 3.0, { ...PIERRE, bloque: true }),              //     l'estrade du crieur
      P(7, 1, 1, 2, 4.12, 3.0, { ...PIERRE, bloque: true }),
      P(7, 30, 2, 2, ESTRADE.dx, ESTRADE.dy, { bloque: true })],
    [P(0, 1, 3, 2.5, 1.5, 2.1, { ...PIERRE, pied: 4.62 }),               // 4 : tout en pierre : le panneau, la potence,
      P(3, 1, 1, 2, 4.75, 2.55, { ...PIERRE, bloque: true }),            //     l'étal ; des torches sur le panneau,
      P(13, 5, 1, 1, 1.0, 2.2, { ...TORCHE, pied: 4.65 }),               //     deux réverbères
      P(13, 5, 1, 1, 4.0, 2.2, { ...TORCHE, pied: 4.65 }),
      P(4, 1, 2, 2, 5.0, 3.7, { ...PIERRE, bloque: true }),
      P(6, 1, 1, 2, -0.75, 3.4, { ...PIERRE, bloque: true }),
      P(6, 1, 1, 2, 7.3, 3.6, { ...PIERRE, bloque: true })],
  ],
  // Le terrain d'entraînement, dans son enclos (#77, proposition à choisir par le propriétaire du camp) : au fond, de
  // quoi viser et frapper ; devant, les armes ; au niveau 4, les torches de l'entrée. Le milieu reste libre.
  // L'enclos va de dx 0,5 à 7,5 et de dy 1,3 à 7,3 ; l'entrée est entre dx 3 et 5.
  combat: [
    [],
    [P(4, 47, 2, 2, 1.0, 1.35, { bloque: true })],                       // 1 : une cible sur son trépied
    [P(3, 47, 1, 2, 3.5, 1.3, { bloque: true }),                        // 2 : une botte de foin et sa cible,
      P(10, 4, 1, 2, 5.7, 1.25, { bloque: true })],                     //     un épouvantail pour frapper
    [P(1, 47, 2, 1, 0.9, 4.7, { bloque: true }),                        // 3 : le râtelier, les arcs,
      P(2, 48, 1, 2, 6.2, 3.95, { bloque: true }),                      //     un tonneau de flèches
      P(3, 49, 1, 1, 5.3, 4.95, { bloque: true })],
    [P(13, 5, 1, 1, 2.5, 4.55, { ...TORCHE, pied: 7.4 }),                // 4 : des torches sur les poteaux de l'entrée,
      P(13, 5, 1, 1, 4.5, 4.55, { ...TORCHE, pied: 7.4 }),               //     un autre épouvantail
      P(10, 4, 1, 2, 4.6, 1.25, { bloque: true })],
  ],
};

// Les pavés du tableau d'affichage : la terre battue (sa cour, ses sentiers) se pave à partir du pied du tableau, de
// plus en plus loin avec le niveau ; au niveau 4, un parvis sous la potence, l'étal, l'estrade et les réverbères.
// Pas de cercle dessiné : les pavés suivent le décor, et s'arrêtent là où le sentier continue en terre.
// `portee` : jusqu'où (en cases, depuis le devant du tableau) ; `parvis` : [x0, y0, x1, y1] en cases depuis le coin de
// l'emprise, x1 et y1 exclus. Une case est pavée si deux de ses coins au moins sont de la terre battue (le sol se
// dessine coin par coin) : le bord des pavés suit celui du sentier.
export const PAVES = { 2: { portee: 2.3 }, 3: { portee: 4.2 }, 4: { portee: 6.5, parvis: [-1, 2, 9, 6] } };
const DEVANT = [3, 5.5];   // le devant du tableau, en cases depuis le coin de l'emprise
export function pavesDe(lieu, niveau) {
  const p = PAVES[Math.min(niveau, 4)];
  if (!p) return [];
  const [x0, y0] = emprise(lieu), r = Math.ceil(p.portee), cases = [];
  const dans = (q, i, j) => q && i >= q[0] && i < q[2] && j >= q[1] && j < q[3];
  for (let j = Math.floor(DEVANT[1]) - r - 1; j <= DEVANT[1] + r; j++) {
    for (let i = DEVANT[0] - r - 1; i <= DEVANT[0] + r; i++) {
      const I = x0 + i, J = y0 + j, loin = Math.hypot(i + 0.5 - DEVANT[0], j + 0.5 - DEVANT[1]) > p.portee;
      const sol = terre(I, J) + terre(I + 1, J) + terre(I, J + 1) + terre(I + 1, J + 1) >= 2;
      if (dans(p.parvis, i, j) || (sol && !loin)) cases.push([i, j]);
    }
  }
  return cases;
}

// L'armurerie (validée par le propriétaire le 18 oct, design/camp/outils/armurerie.json) : chaque niveau est une
// composition entière (piquets, tente, tente et abri de forge, atelier de pierre, grand atelier), pas une pièce de plus.
// Ses pièces viennent de deux planches (img : deco, ou armurerie pour le mur, le toit, la gueule du foyer, l'enseigne) ;
// ses dalles de pierre, de plus en plus nombreuses, se posent sous tout le reste. Fabriqué par armurerie_jeu.py.
export const COMPLETS = { classes: ARMURERIE.niveaux };
// Le niveau d'office (demandes du propriétaire, 18 et 19 oct) : l'armurerie est livrée au niveau 2, la tente et son abri
// de forge ; le tableau d'affichage au niveau 3, ses pavés et son crieur.
export const PLANCHERS = { classes: 2, interface: 3 };
const DALLES = -9000;   // le pied des dalles : sous tout ce qui se trie, au-dessus du sol

let game, rendu, images, collision, missions, decor;
const etat = {};            // id → { niveau, sprites: [], obstacles: [], eclat }
const forces = {};          // dbg : un niveau imposé, pour voir et faire voir
let temps = 0;

const empriseDe = (l) => { const [x0, y0] = emprise(l); return { x: x0 * T, y: y0 * T }; };

function retirer(id) {
  const e = etat[id];
  if (!e) return;
  for (const s of e.sprites) s.sprite.retirer();
  for (const o of e.obstacles) collision.retirer(o);
  e.sprites = []; e.obstacles = [];
}

function construire(lieu, niveau) {
  retirer(lieu.id);
  const e = (etat[lieu.id] ??= { niveau: 0, sprites: [], obstacles: [], eclat: 0 });
  e.niveau = niveau;
  const o = empriseDe(lieu);
  const poserPiece = (p) => {
    const x = o.x + p.dx * T, y = o.y + p.dy * T, w = p.w * T, h = p.h * T;
    const pied = p.pied != null ? o.y + p.pied * T : y + h, img = p.img ?? 'deco';
    const sprite = rendu.sprite(images[img], img, w, h);
    e.sprites.push({ sprite, p, x, y, pied });
    if (p.bloque) { const ob = { x: x + 6, y: y + h - 9, w: w - 12, h: 8 }; collision.ajouter(ob); e.obstacles.push(ob); }
  };
  const complet = COMPLETS[lieu.id];
  if (complet) {
    const n = complet[Math.min(niveau, complet.length - 1)];
    for (const [i, j] of n.dalles) {   // une variante de dalle par case, toujours la même
      const v = ((i + 3) * 7 + (j + 3) * 13) % 8;
      const sprite = rendu.sprite(images.armurerie, 'armurerie', T, T);
      e.sprites.push({ sprite, p: { sx: v, sy: 6 }, x: o.x + i * T, y: o.y + j * T, pied: DALLES });
    }
    n.pieces.forEach(poserPiece);
    poser(e);
    return;
  }
  const liste = NIVEAUX[lieu.id];
  if (!liste) return;
  for (const [i, j] of pavesDe(lieu, niveau)) {   // une variante de dalle par case, toujours la même
    const sprite = rendu.sprite(images.tableau, 'tableau', T, T);
    e.sprites.push({ sprite, p: { sx: ((i + 5) * 7 + (j + 5) * 13) % 8, sy: 0 }, x: o.x + i * T, y: o.y + j * T, pied: DALLES });
  }
  for (let n = 1; n <= Math.min(niveau, liste.length - 1); n++) liste[n].filter((p) => !(p.jusqua < niveau)).forEach(poserPiece);
  poser(e);
}

function poser(e) {
  for (const s of e.sprites) {
    const col = s.p.anim ? s.p.anim[Math.floor(temps / s.p.pas) % s.p.anim.length] : s.p.sx;
    s.sprite.poser(s.x, s.y, s.pied, col * T, s.p.sy * T);
  }
}

function niveauxVoulus() {
  const n = { ...(missions?.resume().niveaux ?? {}) };
  for (const [id, v] of Object.entries(PLANCHERS)) n[id] = Math.max(v, n[id] ?? 0);
  for (const [id, v] of Object.entries(forces)) n[id] = v;
  return n;
}

export function init(g, options) {
  game = g;
  ({ rendu, images, collision, missions, decor } = options);
  for (const l of LIEUX) construire(l, PLANCHERS[l.id] ?? 0);
  return api;
}

export function update(dt) {
  temps += dt;
  const voulus = niveauxVoulus();
  decor?.niveaux(voulus);
  for (const l of LIEUX) {
    const e = etat[l.id], n = voulus[l.id] ?? 0;
    if (e.niveau !== n) {
      const monte = n > e.niveau;
      construire(l, n);
      if (monte) { e.eclat = 1.2; game.bus.emit('lieu:monte', { id: l.id, niveau: n }); }
    }
    if (e.sprites.some((s) => s.p.anim)) poser(e);
  }
}

export function dispose() { for (const id of Object.keys(etat)) retirer(id); }

export const api = {
  etat, NIVEAUX, COMPLETS, PLANCHERS,
  // dbg.lieux.forcer('interface', 3) : voir un niveau sans mission ; forcer('interface', null) : revenir aux vraies
  forcer(id, n) { if (n == null) delete forces[id]; else forces[id] = n; update(0); },
  niveau: (id) => etat[id]?.niveau ?? 0,
  pieces: (id) => etat[id]?.sprites.length ?? 0,
};
