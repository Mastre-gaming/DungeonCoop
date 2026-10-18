// Une petite tente du camp, avec son enseigne sur une potence : la tente pointue à l'entrée ouverte de « [LPC] Medieval
// Village Decorations » (la planche des décorations du camp), et une des enseignes de la même planche. Les archives
// (27_archives.js) en ont une, à l'enseigne au livre : on y entre par l'ouverture. Une autre enseigne pour un autre usage.
const T = 32;
// où les prendre dans la planche (en px) ; la grande tente voisine déborde dans le coin haut-gauche du rectangle, et le
// vert de remplissage de la planche est effacé
const TENTE = { sx: 386, sy: 1733, w: 124, h: 150, effacer: [0, 0, 6, 23] };
const POTENCE = [352, 0, 32, 64];
export const ENSEIGNES = { livre: [192, 32], epee: [224, 0], vase: [256, 0], biere: [224, 32] };
const VERT = [129, 161, 0];
export const LARGEUR = TENTE.w / T, HAUTEUR = TENTE.h / T;   // en cases (≈ 3,9 × 4,7)

let decoupee = null;
function decouper(deco) {
  if (decoupee) return decoupee;
  const c = Object.assign(document.createElement('canvas'), { width: TENTE.w, height: TENTE.h }), g = c.getContext('2d');
  g.drawImage(deco, TENTE.sx, TENTE.sy, TENTE.w, TENTE.h, 0, 0, TENTE.w, TENTE.h);
  g.clearRect(...TENTE.effacer);
  const d = g.getImageData(0, 0, TENTE.w, TENTE.h), p = d.data;
  for (let k = 0; k < p.length; k += 4) if (p[k] === VERT[0] && p[k + 1] === VERT[1] && p[k + 2] === VERT[2]) p[k + 3] = 0;
  g.putImageData(d, 0, 0);
  return (decoupee = c);
}

// Pose une tente : `cx` le milieu de son ouverture et `pied` le bas de la toile, en cases ; l'enseigne pend à gauche.
// Rend { sprites, obstacles, porte : le point devant l'ouverture (en cases) }.
export function poserTente({ rendu, deco, collision, cx, pied, enseigne = 'livre' }) {
  const x = Math.round(cx * T - TENTE.w / 2), y = Math.round(pied * T - TENTE.h), p = pied * T;
  const tente = rendu.sprite(decouper(deco), 'petite-tente', TENTE.w, TENTE.h);
  tente.poser(x, y, p);
  const potence = rendu.sprite(deco, 'deco', 32, 64), px = x - 14, py = p - 58;
  potence.poser(px, py, p + 2, POTENCE[0], POTENCE[1]);
  const [ex, ey] = ENSEIGNES[enseigne] ?? ENSEIGNES.livre;
  const panneau = rendu.sprite(deco, 'deco', 32, 32);
  panneau.poser(px - 32, py, p + 3, ex, ey);
  // ce qui bloque : la base de la tente (on n'entre pas dans la toile), et le pied de la potence
  const obstacles = [
    { x: x + 6, y: p - 54, w: TENTE.w - 12, h: 50 },
    { x: px + 10, y: p - 8, w: 12, h: 8 },
  ];
  for (const o of obstacles) collision.ajouter(o);
  return { sprites: [tente, potence, panneau], obstacles, porte: { x: cx, y: pied + 0.5 } };
}
