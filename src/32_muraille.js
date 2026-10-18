// La muraille de l'entrée (#123, design v4 validé par Mope le 18 oct) : une seule image posée au pied du mur, triée
// comme le reste (ce qui est au sud passe devant). Dehors, elle est pleine. Dès que le héros passe sous la porte et
// entre au camp, elle s'estompe selon la distance (demande de Mope, 18 oct) : collé à la muraille, presque nette ;
// plus il s'éloigne vers le nord, plus elle est floue et transparente, jusqu'à disparaître ; elle revient en douceur
// quand il se rapproche, et redevient pleine quand il ressort. En visite (la carte du dashboard), elle reste pleine.
// Le flou est préparé une fois : la même image à plusieurs flous, et on fond entre deux voisines.
// Les deux braseros du pont brûlent ici aussi.
import { T, MURAILLE } from './01_plan.js';
import ENTREE from './data/muraille.json';

export const name = 'muraille';
export const always = true;

const FLOUS = [0, 0.8, 1.6, 2.6, 4];   // les flous préparés, en pixels du pixel art (le premier : nette)
export const PRES = 0.7;               // l'opacité juste derrière la muraille (on voit le héros sous la voûte)
export const LOIN = 9;                 // à partir de combien de cases au nord du pied elle a disparu
const DOUCEUR = 6;                     // la vitesse à laquelle elle suit le héros (comme la caméra)
const PAS_FLAMME = 0.14;

let rendu, heros, visite, couches = [], braseros = [], temps = 0, k = 0;   // k : 0 pleine (dehors), 1 disparue
let voile = 0;   // 1 dedans (la muraille un peu transparente), 0 dehors : d'un coup en entrant, en douceur en sortant

// Le héros est dedans dès que ses pieds passent au nord du pied de la muraille (il entre sous la voûte).
export const dedans = (y) => y < MURAILLE.pied * T;
// Où en est l'estompe pour des pieds en y : 0 dehors ; dedans, de presque 0 collé au mur à 1 à LOIN cases.
export function estompe(y) {
  if (!dedans(y)) return 0;
  return Math.max(0.02, Math.min(1, (MURAILLE.pied * T - y) / T / LOIN));
}

export function init(game, options) {
  ({ rendu, heros, visite } = options);
  const im = options.images.muraille, w = im.width, h = im.height;
  couches = FLOUS.map((f, i) => {
    let source = im;
    if (f) {
      source = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = source.getContext('2d');
      g.filter = `blur(${f}px)`;
      g.drawImage(im, 0, 0);
    }
    const s = rendu.sprite(source, `muraille-${i}`, w, h);
    s.poser(0, ENTREE.muraille.y, ENTREE.muraille.pied);
    return s;
  });
  braseros = options.camp.braseros.map((b) => ({ ...b, sprite: rendu.sprite(options.images.brasero, 'brasero', 16, 40) }));
  k = cible();
  voile = k > 0 ? 1 : 0;
  appliquer();
  update(0);
  return api;
}

const cible = () => (!visite && heros ? estompe(heros.heros.y) : 0);

// Dehors (voile 0) : la muraille nette et opaque (comme tout le décor). Dedans : l'opacité baisse de PRES à 0, et le
// flou monte d'une couche à l'autre (deux couches voisines en fondu). En ressortant, le voile s'en va en douceur,
// pour qu'elle redevienne pleine sans à-coup.
function appliquer() {
  const opacite = 1 - voile + voile * PRES * (1 - k);
  const pos = k * (couches.length - 1), i = Math.min(couches.length - 2, Math.floor(pos)), f = pos - i;
  couches.forEach((c, n) => {
    const m = c.mesh.material, a = n === i ? opacite * (1 - f) : n === i + 1 ? opacite * f : 0;
    const transparente = voile > 0 || k > 0;
    if (m.transparent !== transparente) {
      Object.assign(m, { transparent: transparente, alphaTest: transparente ? 0.01 : 0.5, depthWrite: !transparente });
      m.needsUpdate = true;
    }
    m.opacity = a;
    c.cacher(a <= 0.003);
  });
}

export function update(dt) {
  temps += dt;
  const c = cible(), v = c > 0 ? 1 : 0, suivre = dt > 0 ? 1 - Math.exp(-DOUCEUR * dt) : 1;
  if (k !== c || voile !== v) {
    k += (c - k) * suivre;
    if (Math.abs(c - k) < 0.002) k = c;
    // en entrant, d'un coup (on voit le héros sous la voûte) ; en sortant, en douceur
    voile = v ? 1 : voile * (1 - suivre);
    if (voile < 0.002) voile = 0;
    appliquer();
  }
  braseros.forEach((b, i) => b.sprite.poser(b.x, b.y, b.pied, 16 * ((Math.floor(temps / PAS_FLAMME) + i * 2) % 4), 0));
}

export function dispose() {}

export const api = {
  get estompe() { return k; },                 // 0 pleine, 1 disparue
  // l'opacité totale à l'écran, et le flou (en pixels) de la couche la plus visible
  get opacite() { return couches.reduce((s, c) => s + (c.mesh.visible ? c.mesh.material.opacity : 0), 0); },
  get flou() {
    let best = null;
    couches.forEach((c, n) => { if (c.mesh.visible && (!best || c.mesh.material.opacity > best.o)) best = { o: c.mesh.material.opacity, f: FLOUS[n] }; });
    return best ? best.f : 0;
  },
  dedans,
};
