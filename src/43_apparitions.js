// Apparaître et disparaître (demande du propriétaire, 19 oct) : quand un ami rejoint le groupe ou le quitte, et quand un
// héros du camp est pris par un joueur (ou rendu), une colonne de lumière dorée tombe sur lui, et une bouffée de poussière
// part de ses pieds. À l'apparition, le personnage se montre quand la colonne touche le sol ; à la disparition, il s'en va
// au même moment. Les planches viennent des effets du terrain d'entraînement (public/assets/lpc/effets/, effets.json :
// colonne-doree 24 × 72, 6 images ; poussiere 32 × 12, 5 images ; 12 images par seconde, ancrées aux pieds).
export const name = 'apparitions';
export const always = true;

export const FICHIERS = { fx_colonne: 'effets/colonne-doree.png', fx_poussiere: 'effets/poussiere.png' };
const COLONNE = { w: 24, h: 72, images: 6, ancre: [12, 70] }, POUSSIERE = { w: 32, h: 12, images: 5, ancre: [16, 8] };
const FPS = 12;
export const AU_SOL = 2 / FPS;   // la colonne touche le sol à sa 3e image : le personnage se montre (ou s'en va) là

let rendu, images, colonne = null;
const enCours = [];   // { colonne, poussiere, x, y, t, fini }

// La colonne de la planche est faite pour le combat (douce, sur un fond clair) : au camp elle ne se voit presque pas.
// On la renforce une fois : trois fois et demie plus opaque, et tirée vers l'or clair.
function renforcer(im) {
  const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height }), g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let k = 0; k < p.length; k += 4) {
    if (!p[k + 3]) continue;
    p[k] = Math.round(p[k] * 0.4 + 255 * 0.6); p[k + 1] = Math.round(p[k + 1] * 0.4 + 233 * 0.6); p[k + 2] = Math.round(p[k + 2] * 0.4 + 160 * 0.6);
    p[k + 3] = Math.min(235, Math.round(p[k + 3] * 3.5));
  }
  g.putImageData(d, 0, 0);
  return c;
}

export function init(g, options) {
  ({ rendu, images } = options);
  if (images.fx_colonne) colonne = renforcer(images.fx_colonne);
  return api;
}

// Jouer l'effet aux pieds (x, y). sorte : 'apparait' ou 'disparait' (la même lumière ; la poussière part au sol).
// Renvoie la durée (s) avant laquelle le personnage doit changer d'état (AU_SOL).
function jouer(sorte, x, y) {
  if (!colonne || !images?.fx_poussiere) return 0;
  const e = { sorte, x, y, t: 0,
    colonne: rendu.sprite(colonne, 'fx-colonne-forte', COLONNE.w, COLONNE.h),
    poussiere: rendu.sprite(images.fx_poussiere, 'fx-poussiere', POUSSIERE.w, POUSSIERE.h) };
  // la lumière est douce (translucide) : elle se mêle à ce qu'elle couvre au lieu d'être coupée à 50 % d'opacité
  Object.assign(e.colonne.mesh.material, { transparent: true, alphaTest: 0.01, depthWrite: false, needsUpdate: true });
  enCours.push(e);
  poser(e);
  return AU_SOL;
}

function poser(e) {
  const k = Math.floor(e.t * FPS);
  e.colonne.cacher(k >= COLONNE.images);
  if (k < COLONNE.images) e.colonne.poser(e.x - COLONNE.ancre[0], e.y - COLONNE.ancre[1], e.y + 2, k * COLONNE.w, 0);   // devant le personnage
  const kp = k - 2;   // la poussière, quand la lumière touche le sol
  e.poussiere.cacher(kp < 0 || kp >= POUSSIERE.images);
  if (kp >= 0 && kp < POUSSIERE.images) e.poussiere.poser(e.x - POUSSIERE.ancre[0], e.y - POUSSIERE.ancre[1], e.y + 3, kp * POUSSIERE.w, 0);
}

export function update(dt) {
  for (let i = enCours.length - 1; i >= 0; i--) {
    const e = enCours[i];
    e.t += dt;
    if (e.t * FPS >= Math.max(COLONNE.images, POUSSIERE.images + 2)) { e.colonne.retirer(); e.poussiere.retirer(); enCours.splice(i, 1); continue; }
    poser(e);
  }
}

export function dispose() { for (const e of enCours) { e.colonne.retirer(); e.poussiere.retirer(); } enCours.length = 0; }

export function selfTest(t) {
  t.group('Apparaître et disparaître : la colonne dorée');
  t.ok(images.fx_colonne?.width === COLONNE.w * COLONNE.images && images.fx_poussiere?.width === POUSSIERE.w * POUSSIERE.images, 'les deux planches d’effets sont chargées, à leur taille');
  const d = jouer('apparait', 600, 500), e = enCours.at(-1);
  t.ok(d > 0 && e.colonne.mesh.visible, `l’effet part, le personnage se montre dans ${Math.round(d * 1000)} ms`);
  for (let k = 0; k < 30; k++) update(1 / 30);
  t.ok(!enCours.includes(e), 'puis il s’efface tout seul (moins d’une seconde)');
}

export const api = { jouer, AU_SOL, get enCours() { return enCours.length; } };
