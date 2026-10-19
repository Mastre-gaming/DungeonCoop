// Le limier du Traqueur au limier (la classe de Paolitus, content/classes/traqueur-au-limier.json) : quand le
// héros incarné est le Traqueur, son malinois le suit dans le camp. Il marche sur ses traces, un peu derrière lui, et
// s'arrête quand il s'arrête. Il ne bloque personne et rien ne le bloque (il suit le chemin que le héros a pris).
// Sa planche : public/assets/lpc/compagnons/limier.png (design/classes/traqueur-au-limier/outil/limier.mjs), des cases de
// 64 × 64, rangées haut, gauche, bas, droite, colonnes 0 à 4 la marche, colonne 5 l'arrêt.
// Pour l'instant, le limier n'est que chez soi : les autres joueurs voient le Traqueur, sans son chien.

export const name = 'limier';
export const always = true;
export const CLASSE = 'traqueur-au-limier';
export const IMAGE = './assets/lpc/compagnons/limier.png';

const LIGNES = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const ECART = 34;          // px : à cette distance derrière le héros, sur ses traces
const SAUT = 260;          // px : plus loin que ça (le héros a été posé ailleurs), le limier le rejoint d'un coup
const IMAGES = 9;          // images de marche par seconde

let game, rendu, heros, visite, sprite = null, ombre = null;
const chien = { actif: false, x: 0, y: 0, dir: 'bas', bouge: false, t: 0, traces: [] };

export function init(g, options) {
  game = g;
  ({ rendu, heros, visite } = options);
  ombre = rendu.ombre(22, 5);
  ombre.cacher(true);
  const im = new Image();
  im.onload = () => { sprite = rendu.sprite(im, 'limier', 64, 64); sprite.cacher(!chien.actif); };
  im.src = options.image ?? IMAGE;
  return api;
}

// (ré)apparaître à côté du héros, ses traces oubliées
function rejoindre() {
  const h = heros.heros;
  Object.assign(chien, { x: h.x - 22, y: h.y + 4, dir: h.dir, bouge: false, t: 0, traces: [{ x: h.x, y: h.y }] });
}

// le point des traces à ECART px derrière le héros (en remontant ses traces depuis lui)
function cible() {
  const h = heros.heros, tr = chien.traces;
  let reste = ECART, px = h.x, py = h.y;
  for (let k = tr.length - 1; k >= 0; k--) {
    const d = Math.hypot(tr[k].x - px, tr[k].y - py);
    if (d >= reste) { const f = reste / d; return { x: px + (tr[k].x - px) * f, y: py + (tr[k].y - py) * f }; }
    reste -= d; px = tr[k].x; py = tr[k].y;
  }
  return { x: px, y: py };
}

export function update(dt) {
  const actif = !visite && heros.incarne?.id === CLASSE;
  if (actif !== chien.actif) { chien.actif = actif; if (actif) rejoindre(); }
  sprite?.cacher(!actif); ombre.cacher(!actif);
  if (!actif) return;
  const h = heros.heros, tr = chien.traces, der = tr[tr.length - 1];
  if (!der || Math.hypot(h.x - der.x, h.y - der.y) > 3) { tr.push({ x: h.x, y: h.y }); if (tr.length > 80) tr.shift(); }
  if (Math.hypot(h.x - chien.x, h.y - chien.y) > SAUT) rejoindre();
  const c = cible(), vx = c.x - chien.x, vy = c.y - chien.y, d = Math.hypot(vx, vy);
  // il rattrape en douceur : vite quand il est loin, au pas quand il colle aux traces
  const pas = Math.min(d, Math.max(40, d * 6) * dt);
  chien.bouge = d > 1.5;
  if (chien.bouge) {
    chien.x += (vx / d) * pas; chien.y += (vy / d) * pas;
    chien.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'gauche' : 'droite') : (vy < 0 ? 'haut' : 'bas');
    chien.t += dt;
  } else { chien.t = 0; if (!h.bouge) chien.dir = h.dir === 'haut' ? 'haut' : chien.dir; }
  const col = chien.bouge ? Math.floor(chien.t * IMAGES) % 5 : 5;
  sprite?.poser(chien.x - 32, chien.y - 62, chien.y, col * 64, LIGNES[chien.dir] * 64);
  ombre.poser(chien.x, chien.y - 1);
}

export function dispose() { sprite?.retirer(); ombre?.retirer(); }

export function selfTest(t) {
  t.group('le limier du Traqueur');
  if (visite) { update(0); t.ok(!chien.actif, 'en visite : pas de héros, pas de chien'); return; }
  const h = heros.heros, avant = { incarne: heros.incarne, x: h.x, y: h.y, dir: h.dir };
  const faire = (id) => Object.defineProperty(heros, 'incarne', { configurable: true, get: () => ({ ...avant.incarne, id }) });
  // (on joue l'incarnation sans changer la planche du héros : seule l'identité compte pour le limier)
  const vraie = Object.getOwnPropertyDescriptor(heros, 'incarne');
  try {
    faire('depart'); update(0.05);
    t.ok(!chien.actif, 'un autre héros : pas de chien');
    faire(CLASSE); update(0.05);
    t.ok(chien.actif && Math.hypot(chien.x - h.x, chien.y - h.y) < 40, 'le Traqueur au limier : le limier apparaît à ses côtés');
    // le héros marche 6 cases vers la droite, le limier suit sur ses traces
    for (let k = 1; k <= 60; k++) { heros.placer(avant.x + k * 3.2, avant.y, 'droite'); h.bouge = true; update(1 / 30); }
    const derriere = h.x - chien.x;
    t.ok(chien.dir === 'droite' && derriere > 10 && derriere < 60, `il le suit vers la droite, ${Math.round(derriere)} px derrière lui`);
    h.bouge = false;
    for (let k = 0; k < 40; k++) update(1 / 30);
    t.ok(!chien.bouge && Math.hypot(h.x - chien.x, h.y - chien.y) < ECART + 4, 'le héros s’arrête : le limier s’arrête à côté de lui');
    heros.placer(avant.x + 600, avant.y + 200); update(1 / 30);
    t.ok(Math.hypot(h.x - chien.x, h.y - chien.y) < 40, 'le héros est posé ailleurs : le limier le rejoint d’un coup');
    faire('depart'); update(0.05);
    t.ok(!chien.actif, 'on change de héros : le limier s’en va');
  } finally {
    if (vraie) Object.defineProperty(heros, 'incarne', vraie); else delete heros.incarne;
    heros.placer(avant.x, avant.y, avant.dir); update(0);
  }
}

export const api = { get chien() { return { ...chien, traces: chien.traces.length }; }, get sprite() { return sprite; }, CLASSE, rejoindre };
