// Le limier du Traqueur au limier (la classe de Paolitus, content/classes/traqueur-au-limier.json) : quand un héros
// du camp est le Traqueur, son malinois le suit. Il marche sur ses traces, un peu derrière lui, et s'arrête quand il
// s'arrête. Il ne bloque personne et rien ne le bloque (il suit le chemin que le héros a pris).
// À plusieurs (13_reseau.js) : chacun dit déjà quel héros il incarne ; chaque client fait donc suivre un limier à toute
// copie d'ami qui incarne le Traqueur, sur ses traces à elle. Rien de plus ne passe sur le réseau, et tout le monde le voit.
// Sa planche : public/assets/lpc/compagnons/limier.png (design/classes/traqueur-au-limier/outil/limier.mjs), des cases de
// 64 × 64, rangées haut, gauche, bas, droite, colonnes 0 à 4 la marche, colonne 5 l'arrêt.

export const name = 'limier';
export const always = true;
export const CLASSE = 'traqueur-au-limier';
export const IMAGE = './assets/lpc/compagnons/limier.png';

const LIGNES = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const ECART = 34;          // px : à cette distance derrière le héros, sur ses traces
const SAUT = 260;          // px : plus loin que ça (le héros a été posé ailleurs), le limier le rejoint d'un coup
const IMAGES = 9;          // images de marche par seconde

let game, rendu, heros, visite, reseau = null, image = null;
const local = creer();                 // le limier de mon héros
const amis = new Map();                // id d'une copie d'ami → son limier
// Une scène peut lui donner une place (61_contrat.js : la réunion) : placeDe(id du joueur) → { x, y, dir } ou null.
let placeDe = () => null;

function creer() { return { actif: false, x: 0, y: 0, dir: 'bas', bouge: false, t: 0, traces: [], sprite: null, ombre: null }; }

export function init(g, options) {
  game = g;
  ({ rendu, heros, visite } = options);
  reseau = options.reseau ?? null;
  const im = new Image();
  im.onload = () => { image = im; };
  im.src = options.image ?? IMAGE;
  return api;
}

// ses sprites, dès que la planche est là
function habiller(ch) {
  if (!ch.ombre) ch.ombre = rendu.ombre(22, 5);
  if (!ch.sprite && image) ch.sprite = rendu.sprite(image, 'limier', 64, 64);
}
function cacher(ch, oui) { ch.sprite?.cacher(oui); ch.ombre?.cacher(oui); }
function retirer(ch) { ch.sprite?.retirer(); ch.ombre?.retirer(); ch.sprite = ch.ombre = null; }

// (ré)apparaître à côté de son héros, ses traces oubliées
function rejoindre(ch, hx, hy, dir = 'bas') {
  Object.assign(ch, { x: hx - 22, y: hy + 4, dir, bouge: false, t: 0, traces: [{ x: hx, y: hy }] });
}

// le point des traces à ECART px derrière le héros (en remontant ses traces depuis lui)
function cible(ch, hx, hy) {
  const tr = ch.traces;
  let reste = ECART, px = hx, py = hy;
  for (let k = tr.length - 1; k >= 0; k--) {
    const d = Math.hypot(tr[k].x - px, tr[k].y - py);
    if (d >= reste) { const f = reste / d; return { x: px + (tr[k].x - px) * f, y: py + (tr[k].y - py) * f }; }
    reste -= d; px = tr[k].x; py = tr[k].y;
  }
  // des traces trop courtes (il vient de le rejoindre d'un saut) : il reste où il est, ou s'approche à ECART de lui
  const d = Math.hypot(ch.x - hx, ch.y - hy);
  if (d <= ECART) return { x: ch.x, y: ch.y };
  return { x: hx + ((ch.x - hx) / d) * ECART, y: hy + ((ch.y - hy) / d) * ECART };
}

// à sa place dans une scène : immobile, à l'arrêt (colonne 5), tourné vers où on lui dit ; à la fin, il repart de là
function placer(ch, p) {
  Object.assign(ch, { x: p.x, y: p.y, dir: p.dir ?? 'bas', bouge: false, t: 0, enScene: true });
  habiller(ch);
  ch.sprite?.poser(ch.x - 32, ch.y - 62, ch.y, 5 * 64, LIGNES[ch.dir] * 64);
  ch.ombre?.poser(ch.x, ch.y - 1);
}
function suivreOuPlacer(ch, id, hx, hy, dt) {
  const p = placeDe(id);
  if (p) { placer(ch, p); return; }
  if (ch.enScene) { ch.enScene = false; ch.traces = [{ x: hx, y: hy }]; }   // la scène finie : il suit de nouveau, de là où il est
  suivre(ch, hx, hy, dt);
}

// un pas : il suit son héros (hx, hy)
function suivre(ch, hx, hy, dt) {
  const tr = ch.traces, der = tr[tr.length - 1];
  if (!der || Math.hypot(hx - der.x, hy - der.y) > 3) { tr.push({ x: hx, y: hy }); if (tr.length > 80) tr.shift(); }
  if (Math.hypot(hx - ch.x, hy - ch.y) > SAUT) rejoindre(ch, hx, hy, ch.dir);
  const c = cible(ch, hx, hy), vx = c.x - ch.x, vy = c.y - ch.y, d = Math.hypot(vx, vy);
  // il rattrape en douceur : vite quand il est loin, au pas quand il colle aux traces
  const pas = Math.min(d, Math.max(40, d * 6) * dt);
  ch.bouge = d > 1.5;
  if (ch.bouge) {
    ch.x += (vx / d) * pas; ch.y += (vy / d) * pas;
    ch.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'gauche' : 'droite') : (vy < 0 ? 'haut' : 'bas');
    ch.t += dt;
  } else ch.t = 0;
  habiller(ch);
  const col = ch.bouge ? Math.floor(ch.t * IMAGES) % 5 : 5;
  ch.sprite?.poser(ch.x - 32, ch.y - 62, ch.y, col * 64, LIGNES[ch.dir] * 64);
  ch.ombre?.poser(ch.x, ch.y - 1);
}

export function update(dt) {
  // le mien
  const actif = !visite && heros.incarne?.id === CLASSE, h = heros.heros;
  if (actif !== local.actif) { local.actif = actif; if (actif) rejoindre(local, h.x, h.y, h.dir); }
  if (actif) { suivreOuPlacer(local, reseau?.party?.id ?? 'me', h.x, h.y, dt); cacher(local, false); } else cacher(local, true);
  // ceux des amis : une copie qui incarne le Traqueur (et qui se montre : pas pendant la colonne dorée)
  const copies = visite ? new Map() : reseau?.copies ?? new Map();
  for (const [id, ch] of amis) if (copies.get(id)?.heros?.id !== CLASSE) { retirer(ch); amis.delete(id); }
  for (const [id, c] of copies) {
    if (c.heros?.id !== CLASSE || c.x == null) continue;
    let ch = amis.get(id);
    if (!ch) { ch = creer(); ch.actif = true; rejoindre(ch, c.x, c.y); amis.set(id, ch); }
    if (c.montre > 0) { cacher(ch, true); rejoindre(ch, c.x, c.y, ch.dir); continue; }
    suivreOuPlacer(ch, id, c.x, c.y, dt); cacher(ch, false);
  }
}

export function dispose() { retirer(local); for (const ch of amis.values()) retirer(ch); amis.clear(); }

export function selfTest(t) {
  t.group('le limier du Traqueur');
  if (visite) { update(0); t.ok(!local.actif && !amis.size, 'en visite : pas de héros, pas de chien'); return; }
  const h = heros.heros, avant = { x: h.x, y: h.y, dir: h.dir };
  // (on joue l'incarnation sans changer la planche du héros : seule l'identité compte pour le limier)
  const vraie = Object.getOwnPropertyDescriptor(heros, 'incarne');
  const faire = (id) => Object.defineProperty(heros, 'incarne', { configurable: true, get: () => ({ ...vraie.get.call(heros), id }) });
  try {
    faire('depart'); update(0.05);
    t.ok(!local.actif, 'un autre héros : pas de chien');
    faire(CLASSE); update(0.05);
    t.ok(local.actif && Math.hypot(local.x - h.x, local.y - h.y) < 40, 'le Traqueur au limier : le limier apparaît à ses côtés');
    // le héros marche 6 cases vers la droite, le limier suit sur ses traces
    for (let k = 1; k <= 60; k++) { heros.placer(avant.x + k * 3.2, avant.y, 'droite'); h.bouge = true; update(1 / 30); }
    const derriere = h.x - local.x;
    t.ok(local.dir === 'droite' && derriere > 10 && derriere < 60, `il le suit vers la droite, ${Math.round(derriere)} px derrière lui`);
    h.bouge = false;
    for (let k = 0; k < 40; k++) update(1 / 30);
    t.ok(!local.bouge && Math.hypot(h.x - local.x, h.y - local.y) < ECART + 4, 'le héros s’arrête : le limier s’arrête à côté de lui');
    heros.placer(avant.x + 600, avant.y + 200); update(1 / 30);
    t.ok(Math.hypot(h.x - local.x, h.y - local.y) < 40, 'le héros est posé ailleurs : le limier le rejoint d’un coup');
    faire('depart'); update(0.05);
    t.ok(!local.actif && (!local.sprite || !local.sprite.mesh.visible), 'on change de héros : le limier s’en va');
  } finally {
    if (vraie) Object.defineProperty(heros, 'incarne', vraie);
    heros.placer(avant.x, avant.y, avant.dir); update(0);
  }
}

export const api = {
  get chien() { return { ...local, traces: local.traces.length }; },
  get amis() { return amis; },
  get sprite() { return local.sprite; },
  CLASSE,
  // le réseau arrive après (main.js) : on le branche ensuite
  brancherReseau(r) { reseau = r; },
  // une scène qui place les limiers (61_contrat.js) : f(id du joueur) → { x, y, dir } ou null
  brancherScene(f) { placeDe = f ?? (() => null); },
};
