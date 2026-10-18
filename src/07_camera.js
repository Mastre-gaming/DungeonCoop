// La caméra (CAMP §9, validée par le propriétaire le 18 oct, porte Q) :
//   en jeu, elle suit le héros avec une zone morte au centre (30 % de l'écran) : il bouge dedans sans que l'image bouge,
//   puis elle le rattrape en douceur ; elle s'arrête aux bords du camp ; zoom moyen (environ 20 x 11 cases) ;
//   en visite (?visite, la carte du dashboard), pas de héros : tout le camp tient dans le cadre.
// La position est arrondie au pixel d'écran par le rendu (rien ne scintille en mouvement).
export const name = 'camera';
export const always = true;

const DEFAUTS = { zoom: { w: 20, h: 11 }, zoneMorte: 0.3, douceur: 7 };
let cfg, rendu, cible, monde, visite;
const cam = { x: 0, y: 0 };

export function init(game, options) {
  cfg = { ...DEFAUTS, ...options.config };
  ({ rendu, cible, monde, visite } = options);
  const ajuster = () => { rendu.ajuster(visite ? { tout: monde } : { zoom: cfg.zoom }); api.snap(); };
  window.addEventListener('resize', ajuster);
  ajuster();
  return api;
}

const borner = (v, taille, vue) => (vue >= taille ? (taille - vue) / 2 : Math.max(0, Math.min(taille - vue, v)));

export function update(dt) {
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
  // Recentre d'un coup (après une téléportation de test, au démarrage).
  snap() {
    const vue = rendu.vue;
    if (visite || !cible) { cam.x = borner(0, monde.w, vue.w); cam.y = borner(0, monde.h, vue.h); }
    else { const { x, y } = cible(); cam.x = borner(x - vue.w / 2, monde.w, vue.w); cam.y = borner(y - 24 - vue.h / 2, monde.h, vue.h); }
    rendu.viser(cam.x, cam.y);
  },
};
