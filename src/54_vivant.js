// Le dehors qui vit (plan agrandi, 53_sauvage.js pour le décor) : ce qui bouge dans les clairières et le long des allées.
//   - les feux de camp du dehors (le campement du chasseur) : leurs flammes, et la fumée qui monte en se défaisant ;
//   - l'eau : des reflets qui scintillent sur l'étang et le ruisseau, des ronds qui s'élargissent, quatre canards qui nagent ;
//   - les bêtes sauvages : des lapins qui sautillent et filent quand on approche, des papillons au-dessus des fleurs, des abeilles
//     autour des ruches, des oiseaux qui traversent le ciel ;
//   - l'air : du pollen en été, des feuilles en automne, qui dérivent dans la vue ;
//   - la nuit : des lucioles dans les clairières, et la flamme de chaque lanterne qui vacille (leur lumière est dans 46_jour_nuit.js).
// Tout est caché en visite (la carte du dashboard : le camp tel qu'il est, sans bêtes ni fumée) ; rien ne bloque personne.
import A from './data/animaux.json';
import { T, CLAIRIERES, ETANG } from './01_plan.js';

export const name = 'vivant';
export const always = true;

const [CW, CH] = A.case;
let rendu, images, heros, collision, jourNuit, meteo, visite, vivants, saison = 'ete';
const S = { t: 0, nuit: false, beau: true, aleat: Math.random, force: null };
const hasard = (a, b) => a + S.aleat() * (b - a);
const choisir = (l) => l[Math.floor(S.aleat() * l.length)];
const flammes = [], fumees = [], eclats = [], ronds = [], canards = [], lapins = [], papillons = [], abeilles = [], oiseaux = [], motes = [], lucioles = [], lanternes = [];
let atlas = null;

// ---- de petites images dessinées ici : de la fumée tramée (la transparence se fait en trames : pas de demi-teintes), des
// éclats d'eau, des ronds sur l'eau, un oiseau, une luciole, un grain de pollen, une feuille, une flamme de lanterne
function fabriquer() {
  const c = Object.assign(document.createElement('canvas'), { width: 160, height: 40 });
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const POS = {};
  const zone = (nom, x, y, w, h) => { POS[nom] = { x, y, w, h }; };
  // fumée : trois densités (10 x 10), des pixels gris clair, plus ou moins nombreux
  [0.62, 0.42, 0.22].forEach((d, v) => {
    zone('fumee' + v, v * 10, 0, 10, 10);
    for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
      const dx = (i - 4.5) / 4.5, dy = (j - 4.5) / 4.5, r = dx * dx + dy * dy;
      if (r > 1) continue;
      const trame = ((i * 3 + j * 5 + (i ^ j)) % 10) / 10;
      if (trame < d * (1.25 - r)) px(v * 10 + i, j, r < 0.35 ? '#eeeeee' : r < 0.7 ? '#cfcfd2' : '#b4b4ba');
    }
  });
  // éclat d'eau : un point, une croix, un point (5 x 5, trois images)
  for (let k = 0; k < 3; k++) {
    zone('eclat' + k, 30 + k * 5, 0, 5, 5);
    if (k === 1) { for (const [x, y] of [[2, 0], [0, 2], [2, 2], [4, 2], [2, 4]]) px(30 + 5 + x, y, '#e8fbff'); px(30 + 5 + 2, 1, '#ffffff'); px(30 + 5 + 1, 2, '#ffffff'); px(30 + 5 + 3, 2, '#ffffff'); px(30 + 5 + 2, 3, '#ffffff'); }
    else px(30 + k * 5 + 2, 2, k ? '#cdeefa' : '#ffffff');
  }
  // un rond sur l'eau : une ellipse, qui grandit en s'effaçant (3 images de 20 x 10)
  [[3, 1.5, '#e6faff'], [6, 3, '#bfe6f4'], [9, 4.4, '#8fcbe4']].forEach(([rx, ry, col], k) => {
    zone('rond' + k, 45 + k * 20, 0, 20, 10);
    for (let a = 0; a < 360; a += 5) px(45 + k * 20 + 10 + Math.round(Math.cos(a * Math.PI / 180) * rx), 5 + Math.round(Math.sin(a * Math.PI / 180) * ry), col);
  });
  // un oiseau, vu de loin (7 x 5) : les ailes en haut, puis en bas
  for (let k = 0; k < 2; k++) {
    zone('oiseau' + k, 105 + k * 8, 0, 7, 5);
    const o = 105 + k * 8;
    if (k === 0) { for (const [x, y] of [[0, 0], [1, 1], [2, 2], [3, 3], [4, 2], [5, 1], [6, 0]]) px(o + x, y, '#2a2530'); }
    else { for (const [x, y] of [[0, 3], [1, 2], [2, 1], [3, 1], [4, 1], [5, 2], [6, 3]]) px(o + x, y, '#2a2530'); }
  }
  // une luciole (3 x 3, deux images : vive, mi-vive), un grain de pollen (2 x 2), une feuille (3 x 2), une flamme de lanterne (3 x 4, deux images)
  zone('luciole0', 122, 0, 3, 3); px(123, 1, '#fff7a0'); px(122, 1, '#d8e86a'); px(124, 1, '#d8e86a'); px(123, 0, '#d8e86a'); px(123, 2, '#d8e86a');
  zone('luciole1', 126, 0, 3, 3); px(127, 1, '#e9f09a');
  zone('pollen', 130, 0, 2, 2); px(130, 0, '#fff6c0'); px(131, 1, '#f6e48a');
  zone('feuille', 133, 0, 3, 2); px(133, 0, '#c8651f'); px(134, 0, '#e08a2c'); px(135, 1, '#a8501a');
  for (let k = 0; k < 2; k++) { zone('flamme' + k, 137 + k * 4, 0, 3, 4); const o = 137 + k * 4; px(o + 1, 0 + k, '#ffe08a'); px(o + 1, 1, '#ffb347'); px(o, 2, '#ff8a2a'); px(o + 1, 2, '#ffe9a0'); px(o + 2, 2, '#ff8a2a'); px(o + 1, 3, '#ff8a2a'); }
  return { canvas: c, POS };
}

const sprite = (nom, w, h) => rendu.sprite(atlas.canvas, 'vivant', w ?? atlas.POS[nom].w, h ?? atlas.POS[nom].h);
const poserImage = (s, nom, x, y, pied) => { const p = atlas.POS[nom]; s.poser(x, y, pied, p.x, p.y); };
const dansVue = (x, y, m = 60) => x > rendu.cam.x - m && x < rendu.cam.x + rendu.vue.w + m && y > rendu.cam.y - m && y < rendu.cam.y + rendu.vue.h + m;

export function init(game, options) {
  ({ rendu, images, heros, collision, jourNuit, meteo, visite } = options);
  saison = options.saison ?? 'ete';
  vivants = options.camp?.vivants;
  if (visite || !vivants) return api;
  atlas = fabriquer();
  // les feux de camp et leur fumée
  for (const f of vivants.feux) {
    flammes.push({ ...f, sprite: rendu.sprite(images.deco, 'deco', 32, 64), decalage: S.aleat() });
    const e = { x: f.x, y: f.y, parts: [], suite: 0 };
    for (let k = 0; k < 14; k++) e.parts.push({ sprite: sprite('fumee0', 10, 10), t: -1, vie: 0, x: 0, y: 0, v: 0 });
    fumees.push(e);
  }
  // l'eau : des éclats sur l'étang et le long du ruisseau, des ronds sur l'étang
  for (const [x, y] of vivants.eau) eclats.push({ x: x * T, y: y * T, sprite: sprite('eclat0'), t: hasard(0, 3), cycle: hasard(1.2, 3.2) });
  for (let k = 0; k < 3; k++) ronds.push({ sprite: sprite('rond0'), t: hasard(0, 6), cycle: hasard(5, 9), x: 0, y: 0 });
  // les canards de l'étang
  const mare = vivants.mares[0];
  if (mare) for (const [robe, sens] of [['canard', 'g'], ['cane', 'd'], ['cane', 'g'], ['cane', 'd']]) {
    const c = { robe, sens, x: mare.x * T + (S.aleat() - 0.5) * mare.rx * T, y: mare.y * T + (S.aleat() - 0.5) * mare.ry * T * 0.8, sprite: rendu.sprite(images.animaux, 'animaux', CW, CH), mare, but: null, pause: hasard(1, 4), decalage: S.aleat() * 6 };
    canards.push(c);
  }
  // les lapins (ouest et est), les papillons (partout dans les clairières), les abeilles (près des ruches)
  const lapinsPlaces = { ouest: [[-24, 12], [-12, -2], [-34, 2]], est: [[48, 14], [66, 2], [52, -8]], nord: [[8, -44], [34, -46]] };
  for (const [nom, l] of Object.entries(lapinsPlaces)) for (const [x, y] of l) {
    const sx = x * T, sy = y * T;
    if (collision && collision.bloque(sx, sy)) continue;
    lapins.push({ x: sx, y: sy, ancre: [sx, sy], sens: 'g', etat: 'repos', attente: hasard(1, 5), cible: null, sprite: rendu.sprite(images.animaux, 'animaux', CW, CH), ombre: rendu.ombre(10, 3), decalage: S.aleat() * 3, parti: false, retour: 0 });
  }
  const couleurs = ['jaune', 'blanc', 'orange'];
  for (const nom of ['ouest', 'est', 'nord']) for (let k = 0; k < (nom === 'est' ? 9 : 6); k++) {
    const b = choisir(CLAIRIERES[nom]), xs = b.map((q) => q[0]), ys = b.map((q) => q[1]);
    const x = hasard(Math.min(...xs) + 2, Math.max(...xs) - 2) * T, y = hasard(Math.min(...ys) + 2, Math.max(...ys) - 2) * T;
    if (collision?.bloque(x, y)) continue;
    papillons.push({ ax: x, ay: y, robe: choisir(couleurs), sprite: rendu.sprite(images.animaux, 'animaux', 3, 2), decalage: S.aleat() * 20, vit: hasard(0.5, 1.1) });
  }
  for (const [x, y] of vivants.nids) for (let k = 0; k < 2; k++) abeilles.push({ ax: x * T, ay: y * T - 14, sprite: sprite('luciole1'), decalage: S.aleat() * 20 });
  // des oiseaux, qui traversent la vue de temps en temps
  for (let k = 0; k < 4; k++) oiseaux.push({ sprite: sprite('oiseau0'), actif: false, attente: hasard(2, 12), x: 0, y: 0, vx: 0, vy: 0, decalage: S.aleat() * 5 });
  // du pollen ou des feuilles dans l'air, tout près de la vue
  for (let k = 0; k < 26; k++) motes.push({ sprite: sprite(saison === 'automne' ? 'feuille' : 'pollen'), x: 0, y: 0, ph: S.aleat() * 6, v: hasard(3, 9), init: false });
  // la nuit : des lucioles dans les clairières
  for (const nom of ['ouest', 'est', 'nord']) for (const b of CLAIRIERES[nom]) {
    const xs = b.map((q) => q[0]), ys = b.map((q) => q[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2 * T, cy = (Math.min(...ys) + Math.max(...ys)) / 2 * T;
    for (let k = 0; k < 6; k++) lucioles.push({ cx, cy, r: hasard(40, 150), a: S.aleat() * 6.28, v: hasard(0.15, 0.4), ph: S.aleat() * 6, sprite: sprite('luciole0') });
  }
  for (const [x, y] of vivants.lucioles) for (let k = 0; k < 6; k++) lucioles.push({ cx: x * T, cy: y * T, r: hasard(30, 90), a: S.aleat() * 6.28, v: hasard(0.15, 0.4), ph: S.aleat() * 6, sprite: sprite('luciole0') });
  // la flamme de chaque lanterne
  for (const l of vivants.lanternes) lanternes.push({ ...l, sprite: sprite('flamme0'), decalage: S.aleat() * 3 });
  update(0);
  return api;
}

const nuitEtat = () => S.force?.nuit ?? (!visite && (jourNuit?.etat?.nom === 'nuit' || jourNuit?.etat?.nom === 'crépuscule'));

export function update(dt) {
  if (visite || !atlas) return;
  S.t += dt;
  S.nuit = nuitEtat();
  const m = meteo?.etat;
  const mauvais = !!m && (m.temps === 'pluie' || m.temps === 'orage' || m.temps === 'neige' || (m.temps === 'brouillard' && m.force > 0.3)) && m.force > 0.4;
  S.beau = S.force?.beau ?? (!S.nuit && !mauvais);
  const h = heros?.heros;

  // les feux : les flammes (5 images), et la fumée qui monte, dérive et se défait
  for (const f of flammes) {
    const vu = dansVue(f.x, f.y, 80);
    f.sprite.cacher(!vu);
    if (vu) f.sprite.poser(f.x - 16, f.y - 52, f.y + 2, 8 * T + (Math.floor(S.t / 0.12 + f.decalage * 5) % 5) * 32, 47 * T);
  }
  for (const e of fumees) {
    const vu = dansVue(e.x, e.y - 120, 100);
    e.suite -= dt;
    for (const p of e.parts) {
      if (p.t >= 0) {
        p.t += dt; p.y -= p.v * dt; p.x += (6 + 4 * Math.sin(S.t * 0.7 + p.x * 0.02)) * dt * 0.6;
        if (p.t >= p.vie) p.t = -1;
      } else if (e.suite <= 0 && vu) { p.t = 0; p.vie = hasard(2.6, 3.8); p.x = e.x + hasard(-3, 3); p.y = e.y - 20; p.v = hasard(16, 24); e.suite = hasard(0.22, 0.4); }
      const visible = p.t >= 0 && vu;
      p.sprite.cacher(!visible);
      if (visible) { const k = p.t / p.vie; poserImage(p.sprite, k < 0.35 ? 'fumee0' : k < 0.7 ? 'fumee1' : 'fumee2', Math.round(p.x - 5 - k * 3), Math.round(p.y - 5), e.y + 300); }
    }
  }
  // l'eau : les éclats naissent, brillent et s'éteignent ; les ronds s'élargissent
  const mare = vivants.mares[0];
  for (const e of eclats) {
    e.t += dt;
    if (e.t > e.cycle) e.t = 0;
    const k = Math.floor(e.t / 0.18), vu = k < 3 && dansVue(e.x, e.y, 20);
    e.sprite.cacher(!vu);
    if (vu) poserImage(e.sprite, `eclat${[0, 1, 2][k]}`, Math.round(e.x - 2), Math.round(e.y - 2), e.y - 9000);
  }
  for (const r of ronds) {
    r.t += dt;
    if (r.t > r.cycle) { r.t = 0; r.x = (mare.x + (S.aleat() - 0.5) * mare.rx * 1.3) * T; r.y = (mare.y + (S.aleat() - 0.5) * mare.ry * 1.2) * T; }
    const k = Math.floor(r.t / 0.35), vu = r.x && k < 3 && dansVue(r.x, r.y, 20);
    r.sprite.cacher(!vu);
    if (vu) poserImage(r.sprite, `rond${k}`, Math.round(r.x - 10), Math.round(r.y - 5), r.y - 9000);
  }
  // les canards : ils nagent doucement d'un point à l'autre de l'étang, et s'arrêtent
  for (const c of canards) {
    const m2 = c.mare, rx = m2.rx * T * 0.78, ry = m2.ry * T * 0.7, cx = m2.x * T, cy = m2.y * T;
    if (c.pause > 0) c.pause -= dt;
    else {
      if (!c.but) c.but = [cx + (S.aleat() * 2 - 1) * rx * 0.8, cy + (S.aleat() * 2 - 1) * ry * 0.8];
      const dx = c.but[0] - c.x, dy = c.but[1] - c.y, d = Math.hypot(dx, dy), pas = 7 * dt;
      if (d <= pas) { c.pause = hasard(2, 7); c.but = null; } else { c.x += dx / d * pas; c.y += dy / d * pas; if (Math.abs(dx) > 1) c.sens = dx < 0 ? 'g' : 'd'; }
    }
    const vu = dansVue(c.x, c.y, 30);
    c.sprite.cacher(!vu || saison === 'hiver');
    if (vu) { const [sx, sy] = A.images[`${c.robe}-${c.sens}`], flotte = S.nuit ? 0 : Math.round(Math.sin(S.t * 1.6 + c.decalage) * 0.6); c.sprite.poser(c.x - CW / 2, c.y - CH + flotte, c.y, sx, sy); }
  }
  // les lapins : assis, un bond de temps en temps ; un héros approche : ils filent et reviennent plus tard
  for (const l of lapins) {
    const vu = dansVue(l.x, l.y, 40);
    if (S.nuit) { l.parti = true; } else if (l.parti && l.retour <= 0) { l.parti = false; l.x = l.ancre[0]; l.y = l.ancre[1]; l.etat = 'repos'; }
    if (l.retour > 0) l.retour -= dt;
    if (l.parti) { l.sprite.cacher(true); l.ombre.cacher(true); continue; }
    const loin = h ? Math.hypot(h.x - l.x, h.y - l.y) : 9999;
    if (loin < 60 && l.etat !== 'fuit') {
      // il file à l'opposé du héros, puis disparaît (dans un buisson, un terrier)
      const dx = l.x - h.x, dy = l.y - h.y, d = Math.hypot(dx, dy) || 1;
      l.etat = 'fuit'; l.cible = [l.x + dx / d * 90, l.y + dy / d * 60];
    }
    if (l.cible) {
      const dx = l.cible[0] - l.x, dy = l.cible[1] - l.y, d = Math.hypot(dx, dy), pas = (l.etat === 'fuit' ? 78 : 34) * dt;
      if (d <= pas) { if (l.etat === 'fuit') { l.parti = true; l.retour = hasard(20, 40); } l.cible = null; l.etat = l.etat === 'fuit' ? 'fuit' : 'repos'; l.attente = hasard(1.5, 5); }
      else {
        const nx = l.x + dx / d * pas, ny = l.y + dy / d * pas;
        if (!collision || !collision.bloque(nx, ny)) { l.x = nx; l.y = ny; if (Math.abs(dx) > 1) l.sens = dx < 0 ? 'g' : 'd'; } else { l.cible = null; l.etat = 'repos'; l.attente = hasard(1, 3); }
      }
    } else if ((l.attente -= dt) <= 0) {
      const a = S.aleat() * 6.28, r = hasard(10, 26);
      l.cible = [l.ancre[0] + Math.cos(a) * r * 2, l.ancre[1] + Math.sin(a) * r]; l.etat = 'saute';
    }
    l.sprite.cacher(!vu); l.ombre.cacher(!vu);
    if (vu) { const [sx, sy] = A.images[`lapin${l.cible ? '-saute' : ''}-${l.sens}`]; l.sprite.poser(l.x - CW / 2, l.y - CH, l.y, sx, sy); l.ombre.poser(l.x, l.y - 1); }
  }
  // les papillons : ils volettent autour de leur fleur, le jour et au beau temps (et pas en hiver)
  const vole = S.beau && saison !== 'hiver' && saison !== 'automne';
  for (const b of papillons) {
    const k = b.decalage * 7;
    const x = b.ax + Math.sin(S.t * 0.5 * b.vit + k) * 38 + Math.sin(S.t * 1.7 + k) * 6, y = b.ay + Math.cos(S.t * 0.7 * b.vit + k) * 22;
    const vu = vole && dansVue(x, y, 20);
    b.sprite.cacher(!vu);
    if (vu) { const [sx, sy] = A.images[`papillon-${b.robe}`]; b.sprite.poser(Math.round(x - 1), Math.round(y - 12 + Math.sin(S.t * 3 + k) * 2), b.ay + 4, sx + (Math.floor(S.t / 0.12 + k) % 2) * 5, sy); }
  }
  for (const b of abeilles) {
    const k = b.decalage, x = b.ax + Math.sin(S.t * 2.1 + k) * 12 + Math.sin(S.t * 5 + k) * 2, y = b.ay + Math.cos(S.t * 1.7 + k * 1.3) * 7;
    const vu = vole && dansVue(x, y, 20);
    b.sprite.cacher(!vu);
    if (vu) poserImage(b.sprite, 'luciole1', Math.round(x), Math.round(y), b.ay + 30);
  }
  // les oiseaux : un vol qui traverse la vue d'un bord à l'autre, haut dans le ciel, le jour seulement
  for (const o of oiseaux) {
    if (!o.actif) {
      o.attente -= dt;
      if (o.attente <= 0 && S.beau && h) {
        o.actif = true; const gauche = S.aleat() < 0.5;
        o.x = rendu.cam.x + (gauche ? -20 : rendu.vue.w + 20); o.y = rendu.cam.y + hasard(20, rendu.vue.h * 0.7);
        o.vx = (gauche ? 1 : -1) * hasard(26, 44); o.vy = hasard(-5, 5);
      }
      o.sprite.cacher(true); continue;
    }
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (o.x < rendu.cam.x - 40 || o.x > rendu.cam.x + rendu.vue.w + 40) { o.actif = false; o.attente = hasard(8, 25); o.sprite.cacher(true); continue; }
    o.sprite.cacher(false);
    poserImage(o.sprite, `oiseau${Math.floor(S.t / 0.18 + o.decalage) % 2}`, Math.round(o.x), Math.round(o.y + Math.sin(S.t * 2 + o.decalage) * 2), o.y + 4000);
  }
  // le pollen (ou les feuilles) : des grains qui dérivent dans la vue, et se reposent plus loin
  const brise = saison === 'hiver' ? false : S.beau;
  for (const p of motes) {
    if (!brise || !h) { p.sprite.cacher(true); continue; }
    if (!p.init || p.x < rendu.cam.x - 30 || p.x > rendu.cam.x + rendu.vue.w + 30 || p.y > rendu.cam.y + rendu.vue.h + 20 || p.y < rendu.cam.y - 30) {
      p.init = true; p.x = rendu.cam.x + S.aleat() * rendu.vue.w; p.y = rendu.cam.y + S.aleat() * rendu.vue.h;
    }
    p.x += (6 + 3 * Math.sin(S.t * 0.6 + p.ph)) * dt; p.y += (saison === 'automne' ? p.v * 0.9 : Math.sin(S.t * 0.9 + p.ph) * 3) * dt;
    p.sprite.cacher(false);
    poserImage(p.sprite, saison === 'automne' ? 'feuille' : 'pollen', Math.round(p.x), Math.round(p.y), p.y + 3500);
  }
  // les lucioles de la nuit
  const obscur = S.nuit && (jourNuit?.etat?.lucioles ?? 1) > 0.15;
  for (const l of lucioles) {
    const x = l.cx + Math.cos(l.a + S.t * l.v) * l.r, y = l.cy + Math.sin((l.a + S.t * l.v) * 1.3) * l.r * 0.6, vive = Math.sin(S.t * 1.7 + l.ph) > -0.2;
    const vu = obscur && dansVue(x, y, 10);
    l.sprite.cacher(!vu);
    if (vu) poserImage(l.sprite, vive ? 'luciole0' : 'luciole1', Math.round(x), Math.round(y), y + 3000);
  }
  // les lanternes : la flamme vacille
  for (const l of lanternes) {
    const vu = dansVue(l.x, l.y, 20);
    l.sprite.cacher(!vu);
    if (vu) poserImage(l.sprite, `flamme${Math.floor(S.t / 0.17 + l.decalage * 9) % 2}`, Math.round(l.x - 1) - 0, Math.round(l.y + 13), l.y + 62);
  }
}

export function dispose() {}

export function selfTest(t) {
  t.group('Le dehors qui vit');
  if (visite || !atlas) { t.ok(true, 'en visite : rien ne bouge'); return; }
  t.ok(flammes.length >= 1 && fumees.length === flammes.length, `un feu de camp au moins, et sa fumée (${flammes.length})`);
  t.ok(canards.length === 4 && canards.every((c) => ((c.x / T - c.mare.x) / c.mare.rx) ** 2 + ((c.y / T - c.mare.y) / c.mare.ry) ** 2 < 1.1), 'quatre canards, sur l’étang');
  t.ok(lapins.length >= 4 && papillons.length >= 10 && lanternes.length >= 10, `des lapins (${lapins.length}), des papillons (${papillons.length}) et des lanternes (${lanternes.length})`);
  // la fumée monte : après quelques secondes, au moins une volute est au-dessus du feu
  for (let k = 0; k < 40; k++) update(0.1);
  const f = flammes[0], haut = fumees[0].parts.some((p) => p.t >= 0 && p.y < f.y - 30);
  t.ok(haut || !dansVue(f.x, f.y, 80), 'la fumée du feu de camp monte');
}

export const api = {
  get betes() { return { lapins: lapins.length, canards: canards.length, papillons: papillons.length, oiseaux: oiseaux.length }; },
  // forcer le temps (les tests et les captures) : { nuit, beau }
  forcer(v) { S.force = v; update(0); },
  get feux() { return flammes.length; },
};
