// Le héros de départ (CAMP §5, aimé : LIKED.md) : un humain du générateur LPC, marche et course LPC dans les 4 directions.
//   flèches ou ZQSD (touches physiques : WASD en QWERTY) pour marcher, Maj pour courir,
//   un clic pour aller quelque part (en contournant ce qui bloque), ou un clic maintenu pour suivre le pointeur.
// Au repos, il garde la pose debout dans la dernière direction prise.
// Pendant le tour de la sentinelle, il la suit tout seul (une route), et court s'il est loin (presser).
// Mordu par un rat, il rougit un instant (rougir) : la même planche, teintée de rouge.
// Le déplacement se fait par pas fixes (step), l'animation à chaque image (update).
// Le héros incarné (41_choix_heros.js) change de planche avec incarner() : une planche LPC de 64 px, la marche en rangées
// 8 à 11 ; sans rangée de course (les classes), Maj le fait marcher au rythme de la course.
import { PIED } from './05_collision.js';

export const name = 'heros';

const LIGNES = { haut: 0, gauche: 1, bas: 2, droite: 3 };   // l'ordre des directions dans une planche LPC
const MARCHE = 8, COURSE = 38;                            // les rangées de la marche et de la course dans la planche
const DEFAUTS = { marche: 74, course: 138, imagesMarche: 10, imagesCourse: 14 };   // px/s : ~2,3 et ~4,3 cases par seconde

let game, cfg, rendu, collision, sprite, spriteRouge, ombre, canvas, rouge = 0, cache = false;
let feuille = null;   // la planche montrée et le nom de sa texture (la main qui tient la torche la reprend : 46_jour_nuit.js)
let incarne = { id: 'depart', course: true };   // le héros incarné : son id, et s'il a une rangée de course
// controle : false pendant une scène (la sentinelle) : le clavier et les clics ne le font plus bouger, une route oui.
const heros = { x: 0, y: 0, vx: 0, vy: 0, dir: 'bas', bouge: false, court: false, t: 0, route: null, bloqueDepuis: 0, controle: true, presse: false };
const doigt = { tenu: false, x: 0, y: 0, recalcule: 0 };

export function init(g, options) {
  game = g; cfg = { ...DEFAUTS, ...options.config };
  ({ rendu, collision, canvas } = options);
  heros.x = options.x; heros.y = options.y;
  ombre = rendu.ombre(18, 4);
  sprite = rendu.sprite(options.images.heros, 'heros', 64, 64);
  feuille = { source: options.images.heros, nom: 'heros' };
  spriteRouge = rendu.sprite(teinter(options.images.heros), 'heros-rouge', 64, 64);
  spriteRouge.cacher(true);

  const versMonde = (e) => rendu.versMonde(e.clientX, e.clientY);
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !heros.controle) return;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    doigt.tenu = true; Object.assign(doigt, versMonde(e)); doigt.recalcule = 0;
    allerA(doigt.x, doigt.y);
  });
  canvas.addEventListener('pointermove', (e) => { if (doigt.tenu) Object.assign(doigt, versMonde(e)); });
  const lacher = () => { doigt.tenu = false; };
  canvas.addEventListener('pointerup', lacher);
  canvas.addEventListener('pointercancel', lacher);
  return api;
}

// La même planche, en rouge : le héros rougit un instant quand un rat le mord.
function teinter(im) {
  const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height }), g = c.getContext('2d');
  g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(220,40,30,.3)'; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Aller à pied jusqu'à (x, y), en contournant les obstacles. Renvoie false si l'endroit est hors d'atteinte.
function allerA(x, y) {
  const r = collision.chemin(heros.x, heros.y, x, y);
  heros.route = r && r.length ? r : null;
  heros.bloqueDepuis = 0;
  return !!heros.route;
}

function deplacer(dx, dy, v) {
  const nx = heros.x + dx * v, ny = heros.y + dy * v;
  if (!collision.bloque(nx, ny)) { heros.x = nx; heros.y = ny; return true; }
  // on glisse le long de ce qui bloque
  if (dx && !collision.bloque(nx, heros.y)) { heros.x = nx; return true; }
  if (dy && !collision.bloque(heros.x, ny)) { heros.y = ny; return true; }
  // l'aide aux coins : on frôle un coin de quelques pixels, on est poussé sur le côté libre au lieu de rester bloqué
  const ax = Math.abs(dx) >= Math.abs(dy);
  for (let k = 1; k <= 10; k++) {
    for (const s of [-1, 1]) {
      const ox = ax ? 0 : s * k, oy = ax ? s * k : 0;
      if (!collision.bloque(heros.x + ox + (ax ? Math.sign(dx) * v : 0), heros.y + oy + (ax ? 0 : Math.sign(dy) * v)) &&
          !collision.bloque(heros.x + Math.sign(ox) * v, heros.y + Math.sign(oy) * v)) {
        heros.x += Math.sign(ox) * v; heros.y += Math.sign(oy) * v;
        return true;
      }
    }
  }
  return false;
}

export function step(h) {
  const inp = game.input;
  const x0 = heros.x, y0 = heros.y;
  let dx = heros.controle ? inp.axis('gauche', 'droite') : 0, dy = heros.controle ? inp.axis('haut', 'bas') : 0;
  if (dx || dy) heros.route = null;                       // le clavier reprend la main
  else if (heros.route) {
    const [tx, ty] = heros.route[0], vx = tx - heros.x, vy = ty - heros.y, d = Math.hypot(vx, vy);
    if (d < 2) { heros.route.shift(); if (!heros.route.length) heros.route = null; }
    else { dx = vx / d; dy = vy / d; }
  }
  const n = Math.hypot(dx, dy);
  heros.bouge = n > 0;
  heros.court = heros.bouge && (heros.controle ? inp.held('courir') : heros.presse);
  if (!heros.bouge) { heros.vx = heros.vy = 0; return; }
  dx /= n; dy /= n;
  heros.dir = Math.abs(dx) > Math.abs(dy) + 0.01 ? (dx < 0 ? 'gauche' : 'droite') : (dy < 0 ? 'haut' : 'bas');
  const v = (heros.court ? cfg.course : cfg.marche) * h;
  // un clic sur la route : on avance au plus jusqu'au point visé
  const reste = heros.route ? Math.hypot(heros.route[0][0] - heros.x, heros.route[0][1] - heros.y) : Infinity;
  const ok = deplacer(dx, dy, Math.min(v, reste));
  if (!ok && heros.route && (heros.bloqueDepuis += h) > 0.4) heros.route = null;   // coincé sur une route : on abandonne
  heros.vx = (heros.x - x0) / h; heros.vy = (heros.y - y0) / h;   // (pour le réseau : les copies avancent à cette vitesse)
}

export function update(dt) {
  if (doigt.tenu && heros.controle && (doigt.recalcule -= dt) <= 0) { doigt.recalcule = 0.15; allerA(doigt.x, doigt.y); }
  if (heros.bouge) heros.t += dt; else heros.t = 0;
  const ligne = LIGNES[heros.dir];
  let rang = MARCHE + ligne, col = 0;
  if (heros.bouge && heros.court && incarne.course) { rang = COURSE + ligne; col = Math.floor(heros.t * cfg.imagesCourse) % 8; }
  else if (heros.bouge && heros.court) col = 1 + Math.floor(heros.t * cfg.imagesCourse) % 8;
  else if (heros.bouge) col = 1 + Math.floor(heros.t * cfg.imagesMarche) % 8;
  rouge = Math.max(0, rouge - dt);
  sprite.cacher(cache || rouge > 0); spriteRouge.cacher(cache || rouge <= 0);
  sprite.poser(heros.x - 32, heros.y - 60, heros.y, col * 64, rang * 64);
  heros.rang = rang; heros.col = col;
  spriteRouge.poser(heros.x - 32, heros.y - 60, heros.y, col * 64, rang * 64);
  ombre.poser(heros.x, heros.y - 1);
}

export function dispose() {}

export const api = {
  heros,
  allerA,
  placer(x, y, dir = heros.dir) { Object.assign(heros, { x, y, dir, route: null, bouge: false, vx: 0, vy: 0 }); update(0); },
  controle(oui) { heros.controle = !!oui; if (!oui) { heros.route = null; doigt.tenu = false; } },
  cacher(oui = true) { cache = oui; sprite.cacher(oui); spriteRouge.cacher(true); ombre.cacher(oui); },
  presser(oui) { heros.presse = !!oui; },
  rougir(duree = 0.12) { rouge = duree; update(0); },
  get rouge() { return rouge; },
  pied: PIED,
  // incarner un autre héros : sa planche LPC (64 px) ; course : s'il a les rangées de course
  incarner(def, planche) {
    if (!def || !planche) return;
    sprite.retirer(); spriteRouge.retirer();
    sprite = rendu.sprite(planche, `heros-${def.id}`, 64, 64);
    feuille = { source: planche, nom: `heros-${def.id}` };
    spriteRouge = rendu.sprite(teinter(planche), `heros-${def.id}-rouge`, 64, 64);
    incarne = { ...def, course: !!def.course };
    sprite.cacher(cache); spriteRouge.cacher(true);
    update(0);
    game.bus.emit('heros:incarne', incarne);
  },
  get incarne() { return incarne; },
  get sprite() { return sprite; },
  get feuille() { return feuille; },
};
