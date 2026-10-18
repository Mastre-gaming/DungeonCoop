// La caméra (CAMP §9, validée par le propriétaire le 18 oct, porte Q) :
//   en jeu, elle suit le héros avec une zone morte au centre (30 % de l'écran) : il bouge dedans sans que l'image bouge,
//   puis elle le rattrape en douceur ; elle s'arrête aux bords du camp ; zoom moyen (environ 20 x 11 cases) ;
//   en visite (?visite, la carte du dashboard), pas de héros : tout le camp tient dans le cadre.
// La molette règle le zoom (demande du propriétaire, 18 oct) : un cran = une échelle entière de plus ou de moins, pour que
// le pixel art reste net ; le héros garde sa place à l'écran ; le choix est gardé dans ce navigateur. Pas en visite :
// dans le dashboard, la molette doit faire défiler la page.
// La position est arrondie au pixel d'écran par le rendu (rien ne scintille en mouvement).
import { ECHELLE_MAX } from './04_rendu.js';

export const name = 'camera';
export const always = true;

const DEFAUTS = { zoom: { w: 20, h: 11 }, zoneMorte: 0.3, douceur: 7, pauseMolette: 0.12 };
const CLE_ZOOM = 'dungeoncoop:zoom';
let game, cfg, rendu, cible, monde, visite, ecart = 0, attente = 0, molette = 0;
const cam = { x: 0, y: 0 };

const lireEcart = () => { try { return Math.max(-8, Math.min(8, Math.round(Number(localStorage.getItem(CLE_ZOOM)) || 0))); } catch { return 0; } };
const ecrireEcart = (v) => { try { v ? localStorage.setItem(CLE_ZOOM, String(v)) : localStorage.removeItem(CLE_ZOOM); } catch {} };

export function init(g, options) {
  game = g;
  cfg = { ...DEFAUTS, ...options.config };
  ({ rendu, cible, monde, visite } = options);
  if (!visite) {
    ecart = lireEcart();
    // la molette au-dessus du camp seulement (pas au-dessus du panneau des missions, qui défile)
    rendu.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY) molette += Math.sign(e.deltaY);
    }, { passive: false });
  }
  const ajuster = () => { appliquer(); api.snap(); };
  window.addEventListener('resize', ajuster);
  ajuster();
  return api;
}

function appliquer() { rendu.ajuster(visite ? { tout: monde } : { zoom: cfg.zoom, ecart }); }

const borner = (v, taille, vue) => (vue >= taille ? (taille - vue) / 2 : Math.max(0, Math.min(taille - vue, v)));

// Un cran de zoom : +1 rapproche, -1 éloigne. Le héros reste au même endroit de l'écran.
function zoomer(sens) {
  const avant = rendu.echelle, cible0 = cible?.();
  const nouvelle = Math.max(1, Math.min(ECHELLE_MAX, avant + sens));
  if (nouvelle === avant) return false;
  const fx = cible0 ? (cible0.x - cam.x) / rendu.vue.w : 0.5, fy = cible0 ? (cible0.y - 24 - cam.y) / rendu.vue.h : 0.5;
  ecart = nouvelle - rendu.echelleBase;
  ecrireEcart(ecart);
  appliquer();
  const vue = rendu.vue;
  if (cible0) { cam.x = borner(cible0.x - fx * vue.w, monde.w, vue.w); cam.y = borner(cible0.y - 24 - fy * vue.h, monde.h, vue.h); }
  rendu.viser(cam.x, cam.y);
  game.bus.emit('camera:zoom', { echelle: rendu.echelle });
  return true;
}

export function update(dt) {
  // la molette : un cran à la fois, avec une petite pause (un pavé tactile envoie des dizaines d'événements d'un coup)
  attente -= dt;
  if (molette && attente <= 0 && !game.solo) { zoomer(molette < 0 ? 1 : -1); attente = cfg.pauseMolette; }
  molette = 0;

  const vue = rendu.vue;
  if (!visite && cible) {
    const { x, y } = cible(), hy = y - 24;   // on vise le milieu du corps, pas les pieds
    const zw = vue.w * cfg.zoneMorte, zh = vue.h * cfg.zoneMorte;
    const zx = cam.x + (vue.w - zw) / 2, zy = cam.y + (vue.h - zh) / 2;
    let tx = cam.x, ty = cam.y;
    if (x < zx) tx -= zx - x; if (x > zx + zw) tx += x - (zx + zw);
    if (hy < zy) ty -= zy - hy; if (hy > zy + zh) ty += hy - (zy + zh);
    tx = borner(tx, monde.w, vue.w); ty = borner(ty, monde.h, vue.h);
    const k = 1 - Math.exp(-cfg.douceur * dt);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }
  rendu.viser(cam.x, cam.y);
}

export function dispose() {}

export const api = {
  cam,
  zoomer,
  get ecart() { return ecart; },
  // Revient au zoom moyen (et l'oublie).
  zoomMoyen() { ecart = 0; ecrireEcart(0); appliquer(); api.snap(); },
  // Recentre d'un coup (après une téléportation de test, au démarrage).
  snap() {
    const vue = rendu.vue;
    if (visite || !cible) { cam.x = borner(0, monde.w, vue.w); cam.y = borner(0, monde.h, vue.h); }
    else { const { x, y } = cible(); cam.x = borner(x - vue.w / 2, monde.w, vue.w); cam.y = borner(y - 24 - vue.h / 2, monde.h, vue.h); }
    rendu.viser(cam.x, cam.y);
  },
};
