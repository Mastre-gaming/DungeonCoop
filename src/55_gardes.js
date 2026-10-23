// Une sentinelle à chaque porte secondaire (ouest, est, nord) : elle monte la garde dans le camp, le dos au mur, face au dehors ;
// quand un héros approche, elle se tourne vers lui et lève la main. Elle ne bloque pas le passage (petit obstacle à côté de la porte).
import { T, PORTES } from './01_plan.js';

export const name = 'gardes';
export const always = true;

const SORT = { haut: 0, gauche: 1, bas: 2, droite: 3 }, MARCHE = { haut: 8, gauche: 9, bas: 10, droite: 11 };
const PRES = 4.5 * T;
// où elles se tiennent : à côté du passage, dedans, face au dehors
export const POSTES_CASES = { ouest: { x: 3.5, y: 6.9, dir: 'gauche' }, est: { x: 38.5, y: 10.9, dir: 'droite' }, nord: { x: 18.4, y: -21.6, dir: 'haut' } };
const POSTES = Object.fromEntries(Object.entries(POSTES_CASES).map(([k, p]) => [k, { x: p.x * T, y: p.y * T, dir: p.dir }]));
const gardes = [];
let heros, visite;

export function init(game, options) {
  const { rendu, images, collision } = options;
  ({ heros, visite } = options);
  for (const [porte, p] of Object.entries(POSTES)) {
    const sprite = rendu.sprite(images.sentinelle, `garde-${porte}`, 64, 64), ombre = rendu.ombre(20, 4);
    const obstacle = { x: p.x - 10, y: p.y - 8, w: 20, h: 8 };
    collision.ajouter(obstacle);
    gardes.push({ porte, ...p, dir0: p.dir, sprite, ombre, obstacle, t: Math.random() * 5, salut: 0 });
  }
  update(0);
  return api;
}

export function update(dt) {
  const h = heros.heros;
  for (const g of gardes) {
    g.t += dt;
    const dx = h.x - g.x, dy = h.y - g.y, pres = !visite && Math.hypot(dx, dy) < PRES;
    if (pres) {
      g.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'gauche' : 'droite') : (dy < 0 ? 'haut' : 'bas');
      g.salut = Math.min(5.99, g.salut + dt / 0.12);
    } else { g.dir = g.dir0; g.salut = Math.max(0, g.salut - dt / 0.12); }
    const l = g.salut > 0.01 ? SORT[g.dir] : MARCHE[g.dir], c = g.salut > 0.01 ? Math.floor(g.salut) : 0;
    g.sprite.poser(g.x - 32, g.y - 60, g.y, c * 64, l * 64);
    g.ombre.poser(g.x, g.y - 1);
    g.sprite.cacher?.(!!visite); g.ombre.cacher?.(!!visite);
  }
}

export function selfTest(t) {
  t.ok(gardes.length === 3, 'une sentinelle à chaque porte secondaire');
  for (const g of gardes) t.ok(Math.abs(g.x - PORTES[g.porte][0] * T) < 4 * T, `la garde ${g.porte} est près de sa porte`);
}
export function dispose() {}
export const api = { get gardes() { return gardes.map((g) => ({ porte: g.porte, x: g.x, y: g.y })); } };
