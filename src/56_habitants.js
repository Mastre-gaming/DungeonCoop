// Du monde dans le camp et dehors : des villageois (des planches de héros teintées) qui flânent autour de leur poste (le chasseur à son
// campement, la fermière à sa ferme, le pêcheur à l'étang, les badauds de la place des fêtes), et des bêtes (des poules à la ferme, un
// chat au campement et près du feu du camp). Rien ne bloque personne ; tout est caché en visite et les villageois rentrent la nuit.
import A from './data/animaux.json';
import { T, FEU } from './01_plan.js';

export const name = 'habitants';
export const always = true;

const DIRS = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const MARCHE = 8, REPOS = 22, VITESSE = 24;
const [CW, CH] = A.case;
// (la zone, le décalage en cases, le rayon de balade en cases, la teinte, ce qu'il fait : flâne ou reste planté)
const GENS = [
  { zone: 'chasseur', dx: -2.2, dy: 1.2, r: 3, teinte: 'rgba(70,110,50,.45)', flane: true },
  { zone: 'ferme', dx: -3, dy: 2.5, r: 4, teinte: 'rgba(200,170,60,.45)', flane: true },
  { zone: 'ferme', dx: 2, dy: 3.5, r: 3, teinte: 'rgba(170,90,60,.4)', flane: true },
  { zone: 'etang', dx: -4.2, dy: 2.6, r: 0.6, teinte: 'rgba(60,110,170,.45)', flane: false, dir: 'droite' },
  { zone: 'fetes', dx: -3, dy: 1.5, r: 4, teinte: 'rgba(190,60,90,.4)', flane: true },
  { zone: 'fetes', dx: 3.5, dy: 2, r: 4, teinte: 'rgba(120,70,170,.4)', flane: true },
  { zone: 'fetes', dx: 0.5, dy: 3.6, r: 3, teinte: 'rgba(220,150,50,.4)', flane: true },
  { zone: 'fetes', dx: -5.5, dy: -0.5, r: 0.5, teinte: 'rgba(60,150,150,.4)', flane: false, dir: 'bas' },
  { zone: 'fetes', dx: 6, dy: -0.5, r: 0.5, teinte: 'rgba(170,140,90,.4)', flane: false, dir: 'bas' },
];
const BETES = [
  { zone: 'ferme', dx: -1, dy: 1.4, r: 2.5, robe: 'poule' }, { zone: 'ferme', dx: 1.2, dy: 1.8, r: 2.5, robe: 'poule' },
  { zone: 'ferme', dx: 0.2, dy: 2.8, r: 2.5, robe: 'rousse' }, { zone: 'ferme', dx: 2.2, dy: 1.2, r: 2.5, robe: 'rousse' },
  { zone: 'chasseur', dx: 1.4, dy: 1.6, r: 1.2, robe: 'chat' }, { feu: true, dx: 2.6, dy: 1.2, r: 1.2, robe: 'chat' },
];
const gens = [], betes = [];
let heros, rendu, collision, jourNuit, visite, atlasTeinte = new Map();
const S = { t: 0, aleat: Math.random };
const hasard = (a, b) => a + S.aleat() * (b - a);

function teinter(im, couleur) {
  if (atlasTeinte.has(couleur)) return atlasTeinte.get(couleur);
  const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height }), g = c.getContext('2d');
  g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = couleur; g.fillRect(0, 0, c.width, c.height);
  atlasTeinte.set(couleur, c); return c;
}

export function init(game, options) {
  ({ heros, rendu, collision, jourNuit, visite } = options);
  const { images, camp } = options, zones = camp.vivants.zones;
  const pos = (d) => d.feu ? [FEU[0] * T + d.dx * T, FEU[1] * T + d.dy * T] : zones[d.zone] ? [zones[d.zone].x + d.dx * T, zones[d.zone].y + d.dy * T] : null;
  for (const d of GENS) {
    const p = pos(d); if (!p) continue;
    gens.push({ ...d, x: p[0], y: p[1], ancre: [...p], dir: d.dir ?? 'bas', but: null, pause: hasard(0.5, 4), t: S.aleat() * 3, marche: false,
      sprite: rendu.sprite(teinter(images.heros, d.teinte), `habitant-${d.teinte}`, 64, 64), ombre: rendu.ombre(18, 4) });
  }
  for (const d of BETES) {
    const p = pos(d); if (!p) continue;
    betes.push({ ...d, x: p[0], y: p[1], ancre: [...p], sens: S.aleat() < 0.5 ? 'g' : 'd', but: null, pause: hasard(0.5, 4), t: S.aleat() * 5,
      sprite: rendu.sprite(images.animaux, 'animaux', CW, CH), ombre: rendu.ombre(10, 3) });
  }
  update(0);
  return api;
}

// choisir un point où aller, près de l'ancre, hors des obstacles
function choisir(o) {
  for (let k = 0; k < 8; k++) {
    const a = S.aleat() * 6.283, r = hasard(0.3, 1) * o.r * T, x = o.ancre[0] + Math.cos(a) * r, y = o.ancre[1] + Math.sin(a) * r;
    if (!collision.bloque(x, y)) return [x, y];
  }
  return null;
}
function marcher(o, vit, dt) {
  const dx = o.but[0] - o.x, dy = o.but[1] - o.y, d = Math.hypot(dx, dy);
  if (d < 1.5) { o.but = null; o.pause = hasard(2, 6); return false; }
  const nx = o.x + dx / d * vit * dt, ny = o.y + dy / d * vit * dt;
  if (collision.bloque(nx, ny)) { o.but = null; o.pause = 1; return false; }
  o.x = nx; o.y = ny; return true;
}

export function update(dt) {
  S.t += dt;
  const nuit = jourNuit?.etat?.nom === 'nuit';
  const cache = !!visite;
  for (const o of gens) {
    o.t += dt;
    const parti = cache || nuit;
    o.sprite.cacher(parti); o.ombre.cacher(parti);
    if (parti) continue;
    o.marche = false;
    if (o.but) { const dx = o.but[0] - o.x, dy = o.but[1] - o.y; o.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'gauche' : 'droite') : (dy < 0 ? 'haut' : 'bas'); o.marche = marcher(o, VITESSE, dt); }
    else if (o.flane && (o.pause -= dt) <= 0) o.but = choisir(o);
    const rang = (o.marche ? MARCHE : REPOS) + DIRS[o.dir], col = o.marche ? 1 + (Math.floor(o.t * 8) % 8) : Math.floor(o.t * 1.4) % 2;
    o.sprite.poser(o.x - 32, o.y - 60, o.y, col * 64, rang * 64); o.ombre.poser(o.x, o.y - 1);
  }
  for (const o of betes) {
    o.t += dt;
    o.sprite.cacher(cache); o.ombre.cacher(cache);
    if (cache) continue;
    let marche = false;
    if (o.but) { o.sens = o.but[0] < o.x ? 'g' : 'd'; marche = marcher(o, o.robe === 'chat' ? 18 : 14, dt); }
    else if ((o.pause -= dt) <= 0) o.but = choisir(o);
    const tour = Math.floor(o.t * 2.5) % 2;
    const nom = o.robe === 'chat' ? (marche || tour ? `chat-${o.sens}` : `chat-etire-${o.sens}`)
      : marche ? `${o.robe}-marche-${o.sens}` : tour ? `${o.robe}-picore-${o.sens}` : `${o.robe}-${o.sens}`;
    const im = A.images[nom] ?? A.images[`${o.robe}-${o.sens}`];
    if (im) o.sprite.poser(o.x - CW / 2, o.y - CH, o.y, im[0], im[1]);
    o.ombre.poser(o.x, o.y - 1);
  }
}

export function selfTest(t) {
  t.ok(gens.length >= 6 && betes.length >= 4, `des villageois (${gens.length}) et des bêtes (${betes.length}) dans le camp et dehors`);
  const h0 = gens.find((o) => o.flane); const x0 = h0.x, y0 = h0.y;
  for (let k = 0; k < 600; k++) update(0.1);
  t.ok(gens.every((o) => !collision.bloque(o.x, o.y)), 'aucun villageois dans un obstacle');
  t.ok(Math.hypot(h0.x - x0, h0.y - y0) < 8 * T, 'un villageois reste près de son poste');
}
export function dispose() {}
export const api = { get gens() { return gens.length; }, get betes() { return betes.length; } };
