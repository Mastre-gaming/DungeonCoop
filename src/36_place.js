// La place du village (CAMP §4, design validé par le propriétaire le 18 oct) : le feu de camp devient le centre du
// village, dans la pierre blanche de la muraille. Cinq niveaux, qui suivent la taille du feu (le total de l'équipe) :
//   0 le feu de bivouac · 1 la place du village (le foyer) · 2 la fontaine · 3 le cœur du village · 4 le centre du village
// Elle est livrée au niveau 1 (demande du propriétaire). À chaque niveau, l'herbe autour se dompte et les sentiers se pavent.
// Tout vient de design/camp/outils/place_jeu.py : un calque de sol par niveau (place_sols.png, sous tout le reste), les
// objets debout et leurs images d'animation (place_objets.png : l'eau de la fontaine, les braseros, les étendards, les
// lanternes, le grand feu), et src/data/place.json (où va chaque objet, son pied, et ce qui bloque le passage).
// Ce module remplace le petit feu de 03_carte.js (le décor le cache) et sa souche.
import PLACE from './data/place.json';

export const name = 'place';
export const always = true;
export const PLANCHER = 1;          // le niveau d'office (avant la pierre)
// Le plafond (demande du propriétaire, 19 oct) : la place reste au niveau 1 pour l'instant, même quand le feu de l'équipe
// a grandi (les missions rentrées comptent toujours ; la place monte quand on lève le plafond). place.forcer passe outre.
export const PLAFOND = 1;
const PIED_SOL = -9500;             // le calque du sol : au-dessus du sol du camp, sous tout ce qui se trie

let game, rendu, images, collision, missions, decor;
let niveau = -1, force = null, temps = 0, sol = null, objets = [], obstacles = [];

function retirer() {
  sol?.retirer(); sol = null;
  for (const { sprite } of objets) sprite.retirer();
  objets = [];
  for (const o of obstacles) collision.retirer(o);
  obstacles = [];
}

function construire(n) {
  retirer();
  niveau = n;
  // Le centre-ville a été refait (22 oct) : le sol, le foyer, les bancs, la guirlande et l'estrade sont dessinés par 14_lieux.js
  // (le lieu « centre »). Ici ne reste que ce qui bouge : le feu de joie, quatre flammes du grand feu (ses cinq images), décalées et
  // déphasées, sur les bûches dressées du foyer (demande du propriétaire, 22 oct : un feu plus grand).
  const o = PLACE.niveaux[1].objets.find((q) => q.images === 5);
  for (const [dx, dy, ph, dp] of [[0, -12, 1, -2], [-21, 4, 2, 2], [21, 4, 3, 2], [0, 0, 0, 3]]) objets.push({ sprite: rendu.sprite(images.placeObjets, 'placeObjets', o.w, o.h), o, dx, dy, ph, dp });
  decor?.cacherFeu?.(true);   // le feu, c'est maintenant la place qui le dessine
  poser();
}

function poser() {
  for (const { sprite, o, dx = 0, dy = 0, ph = 0, dp = 0 } of objets) {
    const k = o.images > 1 ? (Math.floor(temps / o.pas) + ph) % o.images : 0;
    sprite.poser(o.x + dx, o.y + dy, o.pied + dp, o.sx + k * o.w, o.sy);
  }
}

const voulu = () => (force != null ? force : Math.min(PLAFOND, Math.max(PLANCHER, missions?.resume().feu ?? 0)));

export function init(g, options) {
  game = g;
  ({ rendu, images, collision, missions, decor } = options);
  construire(voulu());
  return api;
}

export function update(dt) {
  temps += dt;
  const n = voulu();
  if (n !== niveau) {
    const monte = n > niveau;
    construire(n);
    if (monte) game.bus.emit('place:monte', { niveau: n });
  }
  poser();
}

export function dispose() { retirer(); }

export const api = {
  PLANCHER, PLAFOND, PLACE,
  get niveau() { return niveau; },
  // dbg.place.forcer(4) : voir un niveau sans mission ; forcer(null) : revenir au vrai
  forcer(n) { force = n; update(0); },
  objets: () => objets.length,
  socles: () => obstacles.slice(),
  image: (i) => { const { o } = objets[i]; return o.images > 1 ? Math.floor(temps / o.pas) % o.images : 0; },
};
