// Ce qui vit dans le décor : les flammes du feu (5 images LPC) et le panneau-carte du tableau d'affichage.
// Le tableau appelle (CAMP §4) : tant qu'il y a des missions à prendre, des étoiles scintillent dessus. Ce sont de petites
// croix dorées en pixels (sans flou) qui naissent, s'ouvrent en croix à quatre branches avec un cœur blanc, puis
// s'éteignent, en moins d'une seconde, 3 à 4 à la fois, sur la traverse, le haut des poteaux, le cadre et la carte.
import { dessinerPanneau } from './03_carte.js';

export const name = 'decor';
export const always = true;

// Les 4 images d'une étoile (décalage x, y et couleur de chaque pixel), et sa vie : 0 1 2 3 2 1 0.
const ETOILE = [
  [[0, 0, '#fff3b0']],
  [[0, 0, '#ffffff'], [-1, 0, '#ffd35a'], [1, 0, '#ffd35a'], [0, -1, '#ffd35a'], [0, 1, '#ffd35a']],
  [[0, 0, '#ffffff'], [-1, 0, '#fff0a0'], [1, 0, '#fff0a0'], [0, -1, '#fff0a0'], [0, 1, '#fff0a0'], [-2, 0, '#ffc93a'], [2, 0, '#ffc93a'], [0, -2, '#ffc93a'], [0, 2, '#ffc93a'], [-1, -1, '#ffe48a'], [1, 1, '#ffe48a'], [1, -1, '#ffe48a'], [-1, 1, '#ffe48a']],
  [[0, 0, '#ffffff'], [-1, 0, '#fff0a0'], [1, 0, '#fff0a0'], [0, -1, '#fff0a0'], [0, 1, '#fff0a0'], [-2, 0, '#ffd35a'], [2, 0, '#ffd35a'], [0, -2, '#ffd35a'], [0, 2, '#ffd35a'], [-3, 0, '#e8a23a'], [3, 0, '#e8a23a'], [0, -3, '#e8a23a'], [0, 3, '#e8a23a']],
];
const VIE = [0, 1, 2, 3, 2, 1, 0];
// Où une étoile peut naître (coordonnées du panneau 96 x 80) : la carte (plus souvent), la traverse, le haut des poteaux.
const ZONES_ETOILE = [[6, 8, 90, 17], [18, 19, 77, 58], [10, 3, 17, 30], [79, 3, 86, 30]];

let feuCache = false, feu, spriteFeu, panneau, spritePanneau, gPanneau, images, temps = 0, niveaux = {};
const etoiles = { liste: [], prochaine: 0, appel: false, force: false };   // force : la sentinelle le montre (le tour)

export function init(game, { rendu, camp, images: im }) {
  images = im;
  feu = camp.feu;
  spriteFeu = rendu.sprite(im[feu.img], feu.img, feu.sw, feu.sh);
  panneau = camp.lieux.interface.panneau;
  const c = Object.assign(document.createElement('canvas'), { width: 96, height: 80 });
  gPanneau = c.getContext('2d');
  gPanneau.imageSmoothingEnabled = false;
  spritePanneau = rendu.sprite(c, 'panneau-vivant', 96, 80);
  update(0);
  return api;
}

function scintiller(dt) {
  const ms = temps * 1000;
  if (etoiles.appel && ms >= etoiles.prochaine && etoiles.liste.length < 4) {
    const [x0, y0, x1, y1] = ZONES_ETOILE[Math.random() < 0.55 ? 1 : Math.floor(Math.random() * 4)];
    etoiles.liste.push({ x: x0 + Math.floor(Math.random() * (x1 - x0)), y: y0 + Math.floor(Math.random() * (y1 - y0)), ne: ms, pas: 70 + Math.random() * 50 });
    etoiles.prochaine = ms + 110 + Math.random() * 170;
  }
  etoiles.liste = etoiles.liste.filter((s) => ms - s.ne < s.pas * VIE.length);
  for (const s of etoiles.liste) {
    const k = VIE[Math.min(VIE.length - 1, Math.floor((ms - s.ne) / s.pas))];
    for (const [dx, dy, col] of ETOILE[k]) { gPanneau.fillStyle = col; gPanneau.fillRect(s.x + dx, s.y + dy, 1, 1); }
  }
}

export function update(dt) {
  temps += dt;
  const k = Math.floor(temps / feu.pas) % feu.images;
  spriteFeu.poser(feu.x, feu.y, feu.pied, feu.sx + k * feu.sw, feu.sy);
  // le panneau se redessine à chaque image (96 x 80 pixels : presque rien), avec ses étoiles
  dessinerPanneau(gPanneau, images, niveaux, api.zoneVisee, temps);
  scintiller(dt);
  spritePanneau.rafraichir();
  spritePanneau.poser(panneau.x, panneau.y, panneau.pied, 0, 0);
}

export function dispose() {}

export const api = {
  // Les niveaux des lieux, pour colorier la carte du panneau (tout gris au départ).
  niveaux(n) { niveaux = { ...n }; },
  // Le tableau appelle quand des missions attendent d'être prises.
  appeler(oui) { etoiles.appel = !!oui || etoiles.force; if (!etoiles.appel) etoiles.liste.length = 0; },
  forcerAppel(oui) { etoiles.force = !!oui; if (oui) etoiles.appel = true; },
  get appel() { return etoiles.appel; },
  get nbEtoiles() { return etoiles.liste.length; },
  zoneVisee: null,           // une zone qui clignote sur la carte (celle choisie dans le panneau des missions)
  get imageFeu() { return Math.floor(temps / feu.pas) % feu.images; },
  // La place du village (36_place.js) dessine le feu elle-même : elle cache celui-ci.
  cacherFeu(oui = true) { spriteFeu.cacher(oui); feuCache = oui; },
  get feuCache() { return feuCache; },
  panneau: () => panneau,
};
