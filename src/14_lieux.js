// Les lieux grandissent (CAMP §4) : chaque lieu prend le niveau que lui donnent les missions rentrées de son axe
// (S 1, M 3, L 8 ; niveaux aux seuils 1, 5, 15, 35), et se dessine avec les pièces LPC de ce niveau.
// Un niveau montre ses pièces et celles des niveaux d'avant. Une pièce peut s'animer (lanternes, torches) et bloquer
// le passage (sa base). Quand un lieu monte de niveau en direct, il s'illumine un instant.
// Porte T : le tableau d'affichage d'abord (validé par le propriétaire), les sept autres ensuite, sur son modèle.
import { T, LIEUX } from './01_plan.js';

export const name = 'lieux';
export const always = true;

// Une pièce : la case de la planche des décorations (sx, sy, en cases), sa taille (w, h), sa place dans l'emprise du
// lieu (dx, dy, en cases, depuis le coin haut-gauche de l'emprise 6 x 5), et :
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
};

let game, rendu, images, collision, missions, decor;
const etat = {};            // id → { niveau, sprites: [], obstacles: [], eclat }
const forces = {};          // dbg : un niveau imposé, pour voir et faire voir
let temps = 0;

const empriseDe = (l) => ({ x: (l.porte[0] - 2) * T, y: (l.porte[1] - 4) * T });

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
  const liste = NIVEAUX[lieu.id];
  if (!liste) return;
  const o = empriseDe(lieu);
  for (let n = 1; n <= Math.min(niveau, liste.length - 1); n++) {
    for (const p of liste[n]) {
      const x = o.x + p.dx * T, y = o.y + p.dy * T, w = p.w * T, h = p.h * T;
      const pied = p.pied != null ? o.y + p.pied * T : y + h;
      const sprite = rendu.sprite(images.deco, 'deco', w, h);
      e.sprites.push({ sprite, p, x, y, pied });
      if (p.bloque) { const ob = { x: x + 6, y: y + h - 9, w: w - 12, h: 8 }; collision.ajouter(ob); e.obstacles.push(ob); }
    }
  }
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
  for (const [id, v] of Object.entries(forces)) n[id] = v;
  return n;
}

export function init(g, options) {
  game = g;
  ({ rendu, images, collision, missions, decor } = options);
  for (const l of LIEUX) construire(l, 0);
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
  etat, NIVEAUX,
  // dbg.lieux.forcer('interface', 3) : voir un niveau sans mission ; forcer('interface', null) : revenir aux vraies
  forcer(id, n) { if (n == null) delete forces[id]; else forces[id] = n; update(0); },
  niveau: (id) => etat[id]?.niveau ?? 0,
  pieces: (id) => etat[id]?.sprites.length ?? 0,
};
