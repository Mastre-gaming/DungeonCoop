// Les lieux grandissent (CAMP §4) : chaque lieu prend le niveau que lui donnent les missions rentrées de son axe
// (S 1, M 3, L 8 ; niveaux aux seuils 1, 5, 15, 35), et se dessine avec les pièces LPC de ce niveau.
// Un niveau montre ses pièces et celles des niveaux d'avant. Une pièce peut s'animer (lanternes, torches) et bloquer
// le passage (sa base). Quand un lieu monte de niveau en direct, il s'illumine un instant.
// Porte T : le tableau d'affichage d'abord (validé par le propriétaire), les sept autres ensuite, sur son modèle.
import { T, LIEUX, emprise } from './01_plan.js';
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

// Le tableau d'affichage, autour du panneau-carte (proposition du 18 oct, à choisir par le propriétaire).
// Le panneau-carte occupe dx 1,5 à 4,5 et dy 2,1 à 4,6 dans l'emprise.
export const NIVEAUX = {
  interface: [
    [],                                                                  // 0 : le panneau-carte seul
    [P(7, 5, 1, 1, 0.45, 3.55, { bloque: true })],                      // 1 : un panneau à feuilles épinglées, à côté
    [P(11, 0, 1, 2, 4.75, 2.55, { bloque: true }),                       // 2 : une potence, sa lanterne allumée
      P(13, 0, 1, 1, 5.35, 2.95, { ...LANTERNE, pied: 4.6 })],
    [P(0, 38, 5, 2, 0.5, 0.35, { pied: 2.0 }),                           // 3 : les bannières des couleurs, derrière ;
      P(6, 34, 2, 1, 0.1, 4.45, { bloque: true })],                      //     un banc pour lire les missions
    [P(13, 5, 1, 1, 1.0, 2.2, { ...TORCHE, pied: 4.55 }),                // 4 : des torches allumées sur le panneau
      P(13, 5, 1, 1, 4.0, 2.2, { ...TORCHE, pied: 4.55 }),               //     et un étal couvert : de la lumière et de la vie
      P(8, 5, 1, 1, 5.05, 3.95, { bloque: true })],
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

// L'armurerie (validée par le propriétaire le 18 oct, design/camp/outils/armurerie.json) : chaque niveau est une
// composition entière (piquets, tente, tente et abri de forge, atelier de pierre, grand atelier), pas une pièce de plus.
// Ses pièces viennent de deux planches (img : deco, ou armurerie pour le mur, le toit, la gueule du foyer, l'enseigne) ;
// ses dalles de pierre, de plus en plus nombreuses, se posent sous tout le reste. Fabriqué par armurerie_jeu.py.
export const COMPLETS = { classes: ARMURERIE.niveaux };
// Le niveau d'office (demande du propriétaire, 18 oct) : l'armurerie est livrée au niveau 2, la tente et son abri de forge.
export const PLANCHERS = { classes: 2 };
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
  for (let n = 1; n <= Math.min(niveau, liste.length - 1); n++) liste[n].forEach(poserPiece);
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
