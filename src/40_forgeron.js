// Baba Brisenclume à l'enclume de l'armurerie (demande du propriétaire, 19 oct) : le forgeron de la classe du même nom
// tape sur l'enclume sous l'abri de forge, tourné vers elle, en boucle. Sa planche (public/assets/lpc/forgeron.png) et
// son point d'impact (src/data/forgeron.json) sont fabriqués par design/classes/baba-brisenclume/outil/forgeron.mjs.
// Il se tient à droite de l'enclume, où qu'elle soit selon le niveau de l'armurerie ; sans enclume (niveaux 0 et 4),
// il n'est pas là. On ne le traverse pas.
import FORGERON from './data/forgeron.json';

export const name = 'forgeron';
export const always = true;
const ENCLUME = { sx: 13, sy: 23 };   // l'enclume sur sa souche, dans la planche des décorations
const DESSUS = 9;                     // le dessus de l'enclume, en pixels sous le haut de sa case

let rendu, images, lieux, collision, sprite, obstacle = null;
const S = { la: false, x: 0, y: 0, pied: 0, t: 0, image: 0 };
const CYCLE = FORGERON.durees.reduce((a, b) => a + b, 0);

// l'enclume de l'armurerie à son niveau actuel : { x, y, pied } en pixels du monde, ou null
export function enclume() {
  const s = lieux.etat.classes?.sprites.find((q) => q.p.sx === ENCLUME.sx && q.p.sy === ENCLUME.sy && (q.p.img ?? 'deco') === 'deco');
  return s ? { x: s.x, y: s.y, pied: s.pied } : null;
}

// l'image du cycle à l'instant t
function imageA(t) {
  let r = t % CYCLE;
  for (let i = 0; i < FORGERON.durees.length; i++) { r -= FORGERON.durees[i]; if (r < 0) return i; }
  return 0;
}

function placer() {
  const e = enclume();
  S.la = !!e;
  if (obstacle) { collision.retirer(obstacle); obstacle = null; }
  if (!e) return;
  // le point d'impact de l'image tombe sur le milieu du dessus de l'enclume
  S.x = e.x + 16 - FORGERON.impact.x; S.y = e.y + DESSUS - FORGERON.impact.y;
  S.pied = e.pied + 1;                 // devant l'enclume : son marteau et le lingot passent par-dessus
  S.cle = `${e.x},${e.y}`;
  const px = S.x + FORGERON.pieds;     // ses pieds, au milieu de sa moitié droite de l'image
  obstacle = { x: px - 10, y: S.y + 54, w: 20, h: 8 };
  collision.ajouter(obstacle);
}

export function init(g, options) {
  ({ rendu, images, lieux, collision } = options);
  sprite = rendu.sprite(images.forgeron, 'forgeron', FORGERON.image.w, FORGERON.image.h);
  placer();
  return api;
}

export function update(dt) {
  const e = enclume();
  if (!!e !== S.la || (e && `${e.x},${e.y}` !== S.cle)) placer();   // l'armurerie a changé de niveau
  sprite.cacher(!S.la);
  if (!S.la) return;
  S.t += dt;
  S.image = imageA(S.t);
  sprite.poser(S.x, S.y, S.pied, S.image * FORGERON.image.w, 0);
}

export function dispose() { sprite?.retirer(); if (obstacle) collision.retirer(obstacle); }

export function selfTest(t) {
  t.group('Baba Brisenclume à l’enclume');
  const e = enclume();
  t.ok(!!e && S.la, `l’armurerie a son enclume, et Baba est là (niveau ${lieux.niveau('classes')})`);
  if (!e) return;
  const ix = S.x + FORGERON.impact.x, iy = S.y + FORGERON.impact.y;
  t.ok(Math.abs(ix - (e.x + 16)) < 1 && Math.abs(iy - (e.y + DESSUS)) < 1, 'son marteau tombe sur le dessus de l’enclume');
  t.ok(S.pied > e.pied, 'il passe devant l’enclume (le marteau et le lingot par-dessus)');
  const vues = new Set(); for (let k = 0; k < 60; k++) vues.add(imageA(k * CYCLE / 60));
  t.eq(vues.size, FORGERON.durees.length, `il joue ses ${FORGERON.durees.length} images en boucle (${CYCLE.toFixed(2)} s)`);
  const avant = lieux.niveau('classes');
  lieux.forcer('classes', 0); update(0);
  t.ok(!S.la, 'sans enclume (niveau 0), il n’est pas là');
  lieux.forcer('classes', null); update(0);
  t.ok(S.la && lieux.niveau('classes') === avant, 'l’enclume revient, lui aussi');
}

export const api = {
  enclume,
  get la() { return S.la; },
  get position() { return { x: S.x, y: S.y, pied: S.pied, image: S.image }; },
  CYCLE,
};
