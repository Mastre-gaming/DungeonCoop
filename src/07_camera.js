// La caméra (CAMP §9, validée par le propriétaire le 18 oct, porte Q) :
//   en jeu, elle suit le héros avec une zone morte au centre (30 % de l'écran) : il bouge dedans sans que l'image bouge,
//   puis elle le rattrape en douceur ; elle s'arrête aux bords du camp ; zoom moyen (environ 20 x 11 cases) ;
//   en visite (?visite, la carte du dashboard), pas de héros : tout le camp tient dans le cadre.
// La molette règle le zoom (demande du propriétaire, 18 oct ; plus fin et animé, Paul, #122) : un cran = un quart de
// doublement (×1,19 : quatre crans pour doubler), du plus loin (1 pixel d'écran par pixel LPC) au plus près (8). Le zoom
// glisse vers son but en une fraction de seconde, et le héros garde sa place à l'écran pendant qu'il glisse. Entre deux
// échelles entières, le rendu garde le pixel art net (04_rendu.js : l'image à part). Un pavé tactile envoie de petits
// pas : ils s'additionnent jusqu'à faire un cran. Le choix est gardé dans ce navigateur. Pas en visite : dans le
// dashboard, la molette doit faire défiler la page.
// La position est arrondie au pixel d'écran par le rendu (rien ne scintille en mouvement).
// Pendant que la sentinelle parle (le tour du camp), elle cadre ce qu'elle montre dans le haut de la vue, au-dessus de
// la boîte de dialogue (cadrer). Une morsure de rat la secoue de 2 px pendant 0,16 s (secouer).
import { ECHELLE_MAX } from './04_rendu.js';

export const name = 'camera';
export const always = true;

const DEFAUTS = { zoom: { w: 20, h: 11 }, zoneMorte: 0.3, douceur: 7, douceurZoom: 12, hautCadre: 0.35, douceurCadre: 5 };
export const CRANS = 4;              // crans de molette pour doubler le zoom
const MOLETTE = 100;                 // le deltaY d'un cran (une molette : ~100 ; un pavé tactile : de petits pas qui s'additionnent)
const CLE_ZOOM = 'dungeoncoop:zoom-crans', CLE_ANCIENNE = 'dungeoncoop:zoom';
let game, cfg, rendu, cible, monde, visite, crans = 0, molette = 0, cadre = null, secousse = 0, ampleur = 0;
let echelleVue = null;               // l'échelle affichée : elle glisse vers celle du but
const cam = { x: 0, y: 0 };

const lireCrans = () => { try { const v = localStorage.getItem(CLE_ZOOM); return v === null ? null : Math.max(-24, Math.min(24, Math.round(Number(v) || 0))); } catch { return null; } };
const ecrireCrans = (v) => { try { v ? localStorage.setItem(CLE_ZOOM, String(v)) : localStorage.removeItem(CLE_ZOOM); } catch {} };
// L'échelle visée : le zoom moyen (entier) × 2^(crans/4), bornée à [1, ECHELLE_MAX] ; et les crans possibles de part et d'autre.
const echelleDe = (n) => Math.max(1, Math.min(ECHELLE_MAX, rendu.echelleBase * 2 ** (n / CRANS)));
const bornesCrans = () => [Math.floor(CRANS * Math.log2(1 / rendu.echelleBase)), Math.ceil(CRANS * Math.log2(ECHELLE_MAX / rendu.echelleBase))];

export function init(g, options) {
  game = g;
  cfg = { ...DEFAUTS, ...options.config };
  ({ rendu, cible, monde, visite } = options);
  if (!visite) {
    // la molette au-dessus du camp seulement (pas au-dessus du panneau des missions, qui défile)
    rendu.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      molette += e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);   // (en lignes ou en pages : en pixels)
    }, { passive: false });
  }
  const ajuster = () => { appliquer(true); api.snap(); };
  window.addEventListener('resize', ajuster);
  ajuster();
  return api;
}

// L'échelle du zoom moyen d'abord (echelleBase, selon l'écran), puis celle du zoom choisi. `tout` : tout de suite (sinon,
// l'échelle affichée reste où elle en est, et update la fait glisser).
function appliquer(tout = false) {
  if (visite) { rendu.ajuster({ tout: monde }); return; }
  rendu.ajuster({ zoom: cfg.zoom });
  if (echelleVue === null) {
    // le zoom gardé : en crans ; sinon l'ancien réglage (des échelles entières en plus ou en moins), converti
    let n = lireCrans();
    if (n === null) {
      let ancien = 0; try { ancien = Math.round(Number(localStorage.getItem(CLE_ANCIENNE)) || 0); localStorage.removeItem(CLE_ANCIENNE); } catch {}
      n = ancien ? Math.round(CRANS * Math.log2(Math.max(1, rendu.echelleBase + ancien) / rendu.echelleBase)) : 0;
    }
    const [min, max] = bornesCrans();
    crans = Math.max(min, Math.min(max, n));
  }
  if (tout || echelleVue === null) echelleVue = echelleDe(crans);
  rendu.ajuster({ zoom: cfg.zoom, echelle: echelleVue });
}

// (le monde commence en (monde.x0, monde.y0), négatifs vers le nord et l'ouest : `debut` est le bord de ce côté)
const borner = (v, taille, vue, debut = 0) => (vue >= taille ? debut + (taille - vue) / 2 : Math.max(debut, Math.min(debut + taille - vue, v)));

// Un cran de zoom : +1 rapproche, -1 éloigne. Le but change tout de suite ; l'image y glisse (update).
function zoomer(sens) {
  const [min, max] = bornesCrans(), n = Math.max(min, Math.min(max, crans + sens));
  if (n === crans) return false;
  crans = n;
  ecrireCrans(crans);
  game.bus.emit('camera:zoom', { echelle: echelleDe(crans) });
  return true;
}

// L'échelle affichée glisse vers le but, et le héros garde sa place à l'écran pendant ce temps.
function glisserZoom(dt) {
  const but = echelleDe(crans);
  if (echelleVue === but) return;
  const k = 1 - Math.exp(-cfg.douceurZoom * dt);
  let e = Math.exp(Math.log(echelleVue) + (Math.log(but) - Math.log(echelleVue)) * k);
  if (Math.abs(Math.log(but / e)) < 0.003) e = but;
  const c = cible?.(), vue0 = rendu.vue;
  const fx = c ? (c.x - cam.x) / vue0.w : 0.5, fy = c ? (c.y - 24 - cam.y) / vue0.h : 0.5;
  const mx = c ? c.x : cam.x + vue0.w / 2, my = c ? c.y - 24 : cam.y + vue0.h / 2;
  echelleVue = e;
  rendu.ajuster({ zoom: cfg.zoom, echelle: e });
  const vue = rendu.vue;
  cam.x = borner(mx - fx * vue.w, monde.w, vue.w, monde.x0 ?? 0); cam.y = borner(my - fy * vue.h, monde.h, vue.h, monde.y0 ?? 0);
}

export function update(dt) {
  // la molette : un cran par ~100 de deltaY (une molette : un cran par cran ; un pavé tactile : ses petits pas s'additionnent)
  if (game.solo) molette = 0;
  while (Math.abs(molette) >= MOLETTE) { zoomer(molette < 0 ? 1 : -1); molette -= Math.sign(molette) * MOLETTE; }
  if (!visite && echelleVue !== null) glisserZoom(dt);

  const vue = rendu.vue;
  if (!visite && cadre) {
    const tx = borner(cadre.x - vue.w / 2, monde.w, vue.w, monde.x0 ?? 0), ty = borner(cadre.y - vue.h * cfg.hautCadre, monde.h, vue.h, monde.y0 ?? 0);
    const k = 1 - Math.exp(-cfg.douceurCadre * dt);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  } else if (!visite && cible) {
    const { x, y } = cible(), hy = y - 24;   // on vise le milieu du corps, pas les pieds
    const zw = vue.w * cfg.zoneMorte, zh = vue.h * cfg.zoneMorte;
    const zx = cam.x + (vue.w - zw) / 2, zy = cam.y + (vue.h - zh) / 2;
    let tx = cam.x, ty = cam.y;
    if (x < zx) tx -= zx - x; if (x > zx + zw) tx += x - (zx + zw);
    if (hy < zy) ty -= zy - hy; if (hy > zy + zh) ty += hy - (zy + zh);
    tx = borner(tx, monde.w, vue.w, monde.x0 ?? 0); ty = borner(ty, monde.h, vue.h, monde.y0 ?? 0);
    const k = 1 - Math.exp(-cfg.douceur * dt);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }
  secousse = Math.max(0, secousse - dt);
  const sx = secousse > 0 ? Math.round((Math.random() * 2 - 1) * ampleur) : 0, sy = secousse > 0 ? Math.round((Math.random() * 2 - 1) * ampleur) : 0;
  rendu.viser(cam.x + sx, cam.y + sy);
}

export function dispose() {}

export const api = {
  cam,
  zoomer,
  get ecart() { return crans; },          // (les crans par rapport au zoom moyen)
  get echelleVisee() { return echelleDe(crans); },
  // Cadrer un point du monde dans le haut de la vue (null : revenir au héros).
  cadrer(p) { cadre = p ? { x: p[0] ?? p.x, y: p[1] ?? p.y } : null; },
  get cadre() { return cadre; },
  // Secouer l'image : `px` pixels du monde au plus, pendant `duree` secondes.
  secouer(duree = 0.16, px = 2) { secousse = duree; ampleur = px; },
  get secousse() { return secousse; },
  get ampleur() { return ampleur; },
  // Revient au zoom moyen (et l'oublie).
  zoomMoyen() { crans = 0; molette = 0; ecrireCrans(0); appliquer(true); api.snap(); },
  // Recentre d'un coup (après une téléportation de test, au démarrage).
  snap() {
    const vue = rendu.vue;
    if (visite || !cible) { cam.x = borner(0, monde.w, vue.w, monde.x0 ?? 0); cam.y = borner(0, monde.h, vue.h, monde.y0 ?? 0); }
    else { const { x, y } = cible(); cam.x = borner(x - vue.w / 2, monde.w, vue.w, monde.x0 ?? 0); cam.y = borner(y - 24 - vue.h / 2, monde.h, vue.h, monde.y0 ?? 0); }
    rendu.viser(cam.x, cam.y);
  },
};
