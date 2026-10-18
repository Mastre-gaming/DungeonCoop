// La muraille de l'entrée (#123, design v4 validé par Mope le 18 oct) : une seule image posée au pied du mur, triée
// comme le reste (ce qui est au sud passe devant). Dehors, elle est pleine ; dès que le héros passe sous la porte et
// entre au camp, elle devient fantôme (20 % d'opacité, floutée) pour qu'on voie tout le camp, et redevient pleine quand
// il ressort. En visite (la carte du dashboard), elle reste pleine. Les deux braseros du pont brûlent ici aussi.
import { T, MURAILLE } from './01_plan.js';
import ENTREE from './data/muraille.json';

export const name = 'muraille';
export const always = true;

export const FANTOME = 0.2;     // l'opacité de la muraille vue de l'intérieur
const FLOU = 1.6;               // le flou, en pixels du pixel art
const DUREE = 0.35;             // le fondu, en secondes
const PAS_FLAMME = 0.14;

let rendu, heros, visite, nette, floue, braseros = [], temps = 0, k = 0;   // k : 0 pleine, 1 fantôme

// Le héros est dedans dès que ses pieds passent au nord du pied de la muraille (il entre sous la voûte).
export const dedans = (y) => y < MURAILLE.pied * T;

export function init(game, options) {
  ({ rendu, heros, visite } = options);
  const im = options.images.muraille, w = im.width, h = im.height;
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d');
  g.filter = `blur(${FLOU}px)`;
  g.drawImage(im, 0, 0);
  nette = rendu.sprite(im, 'muraille', w, h);
  floue = rendu.sprite(c, 'muraille-floue', w, h);
  for (const s of [nette, floue]) s.poser(0, ENTREE.muraille.y, ENTREE.muraille.pied);
  braseros = options.camp.braseros.map((b) => ({ ...b, sprite: rendu.sprite(options.images.brasero, 'brasero', 16, 40) }));
  k = !visite && heros && dedans(heros.heros.y) ? 1 : 0;
  appliquer();
  update(0);
  return api;
}

// k = 0 : la muraille nette, opaque (comme tout le décor) ; k = 1 : seulement la floue, à 20 %. Entre les deux, un fondu.
function appliquer() {
  const mn = nette.mesh.material, mf = floue.mesh.material;
  const transparente = k > 0;
  if (mn.transparent !== transparente) {
    Object.assign(mn, { transparent: transparente, alphaTest: transparente ? 0.01 : 0.5, depthWrite: !transparente });
    mn.needsUpdate = true;
  }
  if (!mf.transparent) { Object.assign(mf, { transparent: true, alphaTest: 0.01, depthWrite: false }); mf.needsUpdate = true; }
  mn.opacity = 1 - k;
  mf.opacity = FANTOME * k;
  nette.cacher(k >= 1);
  floue.cacher(k <= 0);
}

export function update(dt) {
  temps += dt;
  const cible = !visite && heros && dedans(heros.heros.y) ? 1 : 0;
  if (k !== cible) {
    k = cible > k ? Math.min(1, k + dt / DUREE) : Math.max(0, k - dt / DUREE);
    appliquer();
  }
  braseros.forEach((b, i) => b.sprite.poser(b.x, b.y, b.pied, 16 * ((Math.floor(temps / PAS_FLAMME) + i * 2) % 4), 0));
}

export function dispose() {}

export const api = {
  get fantome() { return k; },                 // 0 pleine, 1 fantôme
  get opacite() { return Math.max(nette.mesh.visible ? nette.mesh.material.opacity : 0, floue.mesh.visible ? floue.mesh.material.opacity : 0); },
  get floue() { return floue.mesh.visible && !nette.mesh.visible; },
  dedans,
};
