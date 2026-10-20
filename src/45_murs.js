// Les trois autres murs qui montent avec le chantier (design validé par Mope le 19 oct, design/camp/murs/) : à chaque
// mission de l'axe camp rentrée, le chantier avance (44_chantier.js) et les murs ouest, nord et est montent. Chaque mur :
// le tronçon fini (pleine hauteur, chemin de ronde et merlons), le front de taille (deux assises de plus, un échafaudage et
// un maçon), la tranchée creusée devant, puis les piquets et le cordeau jusqu'au bout. À 100 %, le mur est fini, avec sa
// porte secondaire (une tourelle, des vantaux de bois, une lanterne) et le sentier qui y mène. Les tours d'angle du nord
// sont là dès le début ; les murs ouest et est viennent s'appuyer contre leur face, et au sud ils passent derrière les
// tours de la grande muraille.
// Comme la grande muraille (32_muraille.js), une fois dans le camp, chaque mur s'estompe et devient flou selon la distance
// du héros à ce mur : collé à lui, presque net ; à 9 cases, il a disparu. Dehors (sorti par la grande porte), ils
// redeviennent pleins et nets en douceur, comme la façade sud. En visite, ils restent pleins.
// Les pièces sont dessinées par design/camp/outils/murs_jeu.py (public/assets/lpc/murs.png, src/data/murs.json).
import M from './data/murs.json';
import { T } from './01_plan.js';
import { PRES, LOIN, dedans } from './32_muraille.js';

export const name = 'murs';
export const always = true;

const FLOUS = [0, 0.8, 1.6, 2.6, 4];      // les flous préparés (comme la grande muraille)
const DOUCEUR = 6;
const P = M.pieces, HAUT = M.haut, FRONT = M.front, CORDE = '#ece2c4';
const O = M.ouest, E = M.est, N = M.nord;
// chaque mur : la zone du monde où il se dessine, sa profondeur, et la distance (en pixels) du héros à son bord intérieur
export const MURS = {
  ouest: { zone: { x: 0, y: 0, w: 128, h: 900 }, pied: 900, distance: (h) => h.x - (O.x + O.w), tours: [] },
  nord: { zone: { x: 0, y: 0, w: 1344, h: 80 }, pied: N.pied, distance: (h) => h.y - N.pied, tours: ['tour nord-ouest', 'tour nord-est'] },
  est: { zone: { x: 1216, y: 0, w: 128, h: 900 }, pied: 900, distance: (h) => E.x - h.x, tours: [] },
};
// ce qu'on ne traverse pas, fini ou pas : la ligne de chaque mur (le long de la lisière)
export const LIGNES = [{ x: 32, y: 0, w: O.x + O.w - 32, h: O.sud }, { x: 32, y: 32, w: N.est - 32, h: N.pied - 32 }, { x: E.x, y: 0, w: 1312 - E.x, h: E.sud }];

let rendu, images, heros, chantier, collision, visite, atlas;
const S = { cache: false, avant: '', dort: false };   // dort : la nuit, les maçons sont couchés (46_jour_nuit.js)

// une pièce de la planche, ou la partie (wx, wy, w, h, en pixels du monde) qui en tombe dans le rectangle donné
function poser(g, nom, zone, wx = P[nom].x, wy = P[nom].y, w = P[nom].w, h = P[nom].h) {
  const p = P[nom], x0 = Math.max(wx, p.x), y0 = Math.max(wy, p.y), x1 = Math.min(wx + w, p.x + p.w), y1 = Math.min(wy + h, p.y + p.h);
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  g.drawImage(atlas, p.sx + x0 - p.x, p.sy + y0 - p.y, x1 - x0, y1 - y0, x0 - zone.x, y0 - zone.y, x1 - x0, y1 - y0);
}
// des piquets reliés par un cordeau (pts : leurs pieds, en pixels du monde)
function piquets(g, zone, pts) {
  g.fillStyle = CORDE;
  for (let k = 1; k < pts.length; k++) {
    const [a, b] = pts[k - 1], [c, d] = pts[k], n = Math.max(Math.abs(c - a), Math.abs(d - b));
    for (let s = 0; s <= n; s++) g.fillRect(Math.round(a + (c - a) * s / n) - zone.x, Math.round(b - 9 + (d - b) * s / n) - zone.y, 1, 1);
  }
  const p = P.piquet;
  for (const [x, y] of pts) g.drawImage(atlas, p.sx, p.sy, p.w, p.h, x + p.x - 200 - zone.x, y + p.y - 400 - zone.y, p.w, p.h);
}

// où en est un mur à p % : jusqu'où il est plein, où est son front, sa tranchée, ses piquets
export function etat(cle, p) {
  if (cle === 'nord') {
    const xb = N.ouest + p / 100 * (N.est - N.ouest);
    return { fini: p >= 100, plein: [N.ouest, xb - FRONT], front: [Math.max(N.ouest + 84, xb - FRONT), xb], tranchee: [xb, Math.min(N.est, xb + 120)], bout: xb };
  }
  const m = cle === 'ouest' ? O : E, yb = m.sud - p / 100 * (m.sud - m.nord);
  return { fini: p >= 100, plein: [Math.max(yb + FRONT, m.nord), m.sud], front: [yb, Math.min(m.sud, yb + FRONT)], tranchee: [Math.max(m.nord, yb - 70), yb], bout: yb };
}

function dessiner(cle, p) {
  const mur = MURS[cle], z = mur.zone, g = mur.g, e = etat(cle, p);
  g.clearRect(0, 0, z.w, z.h);
  if (e.fini) poser(g, `${cle} fin`, z);
  else if (cle === 'nord') {
    if (e.plein[1] > e.plein[0]) poser(g, 'nord plein', z, e.plein[0], 0, e.plein[1] - e.plein[0], 200);
    if (e.front[1] > e.front[0]) poser(g, 'nord front', z, e.front[0], 0, e.front[1] - e.front[0], 200);
    if (e.tranchee[1] > e.tranchee[0]) poser(g, 'nord tranchee', z, e.tranchee[0], 0, e.tranchee[1] - e.tranchee[0], 200);
    const pts = []; for (let x = e.tranchee[1] + 10; x < N.est; x += 66) pts.push([x, N.pied - 6]);
    piquets(g, z, pts);
  } else {
    const m = cle === 'ouest' ? O : E, px = cle === 'ouest' ? m.x + 18 : m.x + 14, pas = cle === 'ouest' ? 60 : 56;
    if (e.plein[1] > e.plein[0]) poser(g, `${cle} plein`, z, 0, e.plein[0] - HAUT, 2000, 2000);
    if (e.front[1] > e.front[0]) poser(g, `${cle} front`, z, 0, e.front[0] - 24, 2000, e.front[1] - e.front[0]);
    if (e.tranchee[1] > e.tranchee[0]) poser(g, `${cle} tranchee`, z, 0, e.tranchee[0], 2000, e.tranchee[1] - e.tranchee[0]);
    const pts = []; for (let y = e.tranchee[0] - 10; y > m.nord; y -= pas) pts.push([px, y]);
    piquets(g, z, pts);
  }
  // les flous préparés, à partir de l'image nette
  mur.couches.forEach((c, i) => {
    if (i) { c.g.clearRect(0, 0, z.w, z.h); c.g.filter = `blur(${FLOUS[i]}px)`; c.g.drawImage(mur.canvas, 0, 0); c.g.filter = 'none'; }
    c.sprite.rafraichir();
  });
  // le front de taille : l'échafaudage et son maçon (pas quand le mur est fini)
  mur.front.forEach((s) => s.sprite.cacher(e.fini || S.cache));
  if (mur.obstacle) { collision.retirer(mur.obstacle); mur.obstacle = null; }
  if (!e.fini && !S.cache) {
    const [ech, gars] = mur.front, nom = cle === 'nord' ? 'echafaudage nord' : 'echafaudage cote', q = P[nom];
    const f = cle === 'nord' ? { x: e.bout - 30, pied: N.pied + 10, gx: e.bout - 6, gy: N.pied - 26 }
      : cle === 'ouest' ? { x: O.x + O.w + 6, pied: e.front[1] + 10, gx: O.x + O.w + 26, gy: e.front[1] - 22 }
        : { x: E.x - 52, pied: e.front[1] + 10, gx: E.x - 20, gy: e.front[1] - 22 };
    ech.sprite.poser(f.x + q.x - 200, f.pied + q.y - 400, f.pied);
    Object.assign(gars, { x: f.gx - gars.g.pieds[0], y: f.gy - gars.g.pieds[1], pied: f.pied + 1 });
    mur.obstacle = { x: f.x - 2, y: f.pied - 8, w: q.w - 4, h: 8 };
    collision.ajouter(mur.obstacle);
  }
  mur.sentier?.forEach((s) => { s.visible = e.fini && !S.cache; });
  mur.p = p;
}

export function init(game, options) {
  ({ rendu, images, heros, chantier, collision, visite } = options);
  atlas = images.murs;
  for (const [cle, mur] of Object.entries(MURS)) {
    const z = mur.zone;
    mur.couches = FLOUS.map((f, i) => {
      const canvas = Object.assign(document.createElement('canvas'), { width: z.w, height: z.h });
      const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
      const sprite = rendu.sprite(canvas, `murs-${cle}-${i}`, z.w, z.h);
      sprite.poser(z.x, z.y, mur.pied);
      return { canvas, g, sprite };
    });
    mur.canvas = mur.couches[0].canvas; mur.g = mur.couches[0].g;
    mur.tours = mur.tours.map((nom) => FLOUS.map((f, i) => {
      const p = P[nom], c = Object.assign(document.createElement('canvas'), { width: p.w, height: p.h }), g = c.getContext('2d');
      g.filter = f ? `blur(${f}px)` : 'none'; g.drawImage(atlas, p.sx, p.sy, p.w, p.h, 0, 0, p.w, p.h);
      const s = rendu.sprite(c, `murs-${nom}-${i}`, p.w, p.h); s.poser(p.x, p.y, N.pied + 26);
      return s;
    }));
    const nomEch = cle === 'nord' ? 'echafaudage nord' : 'echafaudage cote', gens = M.gens[cle === 'nord' ? 'macon nord' : `ouvrier ${cle}`];
    mur.front = [{ sprite: rendu.sprite(atlas, 'murs', P[nomEch].w, P[nomEch].h) }, { sprite: rendu.sprite(atlas, 'murs', gens.w, 64), g: gens }];
    const sentier = P[`${cle} sentier`];
    if (sentier) mur.sentier = [rendu.calqueSol(atlas, 'murs', sentier.x, sentier.y, sentier.sx, sentier.sy, sentier.w, sentier.h)];
    mur.k = 0; mur.voile = 0; mur.p = -1;
  }
  LIGNES.forEach((o) => collision.ajouter(o));
  update(0);
  return api;
}

const avancement = () => chantier?.etat ?? { nord: 0, ouest: 0, est: 0 };

// Comme la grande muraille : dedans, l'opacité baisse de PRES à 0 avec la distance, et le flou monte d'une couche à
// l'autre ; dehors (voile 0), pleins et nets ; en ressortant, le voile s'en va en douceur. En visite : pleins et nets.
function appliquer(mur) {
  const opacite = visite ? 1 : 1 - mur.voile + mur.voile * PRES * (1 - mur.k), pos = mur.k * (FLOUS.length - 1);
  const i = Math.min(FLOUS.length - 2, Math.floor(pos)), f = pos - i;
  const groupes = [mur.couches.map((c) => c.sprite), ...mur.tours];
  for (const liste of groupes) liste.forEach((s, n) => {
    const m = s.mesh.material, a = visite ? (n === 0 ? 1 : 0) : n === i ? opacite * (1 - f) : n === i + 1 ? opacite * f : 0;
    const transparente = !visite && (mur.voile > 0 || mur.k > 0);
    if (m.transparent !== transparente) { Object.assign(m, { transparent: transparente, alphaTest: transparente ? 0.01 : 0.5, depthWrite: !transparente }); m.needsUpdate = true; }
    m.opacity = a;
    s.cacher(S.cache || a <= 0.003);
  });
}

export function update(dt) {
  const a = avancement(), cle = `${a.nord},${a.ouest},${a.est},${S.cache}`;
  if (cle !== S.avant) { S.avant = cle; for (const m of Object.keys(MURS)) dessiner(m, a[m]); }
  const h = heros?.heros, suivre = dt > 0 ? 1 - Math.exp(-DOUCEUR * dt) : 1;
  for (const mur of Object.values(MURS)) {
    const loge = !visite && !!h && dedans(h.y);
    const cible = loge ? Math.max(0.02, Math.min(1, mur.distance(h) / T / LOIN)) : 0;
    mur.k += (cible - mur.k) * suivre; if (Math.abs(cible - mur.k) < 0.002) mur.k = cible;
    // en entrant, d'un coup ; en sortant, en douceur (comme la grande muraille)
    mur.voile = loge ? 1 : mur.voile * (1 - suivre); if (mur.voile < 0.002) mur.voile = 0;
    appliquer(mur);
    const gars = mur.front[1];
    if (gars.x !== undefined && !S.cache && mur.p < 100) {
      gars.sprite.cacher(S.dort);
      const k = Math.floor((performance.now() / 1000 + (gars.g.w === 96 ? 0 : 0.4)) / 0.14) % gars.g.images;
      gars.sprite.poser(gars.x, gars.y, gars.pied, k * gars.g.w, gars.g.sy);
    }
  }
}

export function dispose() {}

// tout cacher (les captures : le camp sans le chantier ni les murs)
export function cacher(oui = true) { S.cache = oui; update(0); }

export function selfTest(t) {
  t.group('Les trois autres murs');
  const avant = { ...avancement() };
  // la géométrie : à 0 %, rien de plein ; à 50 %, la moitié ; à 100 %, fini
  const o0 = etat('ouest', 0), o50 = etat('ouest', 50), n50 = etat('nord', 50);
  t.ok(o0.plein[0] >= o0.plein[1] - FRONT - 1 && o50.bout === (O.sud + O.nord) / 2 && etat('ouest', 100).fini, `l’ouest : le front à mi-hauteur à 50 % (pied ${o50.bout})`);
  t.ok(n50.bout === (N.ouest + N.est) / 2 && n50.tranchee[0] === n50.bout && n50.plein[1] === n50.bout - FRONT, 'le nord : plein, puis le front, puis la tranchée');
  // on ne traverse pas la ligne des murs, mais la porte du camp et les sentiers restent libres
  t.ok(collision.bloque(50, 400) && collision.bloque(600, 50) && collision.bloque(1300, 400), 'on ne traverse pas la ligne des murs');
  // le dessin suit l'avancement : le pixel du mur ouest à mi-hauteur
  const px = (cle, x, y) => MURS[cle].g.getImageData(x - MURS[cle].zone.x, y - MURS[cle].zone.y, 1, 1).data[3];
  dessiner('ouest', 30); const bas30 = px('ouest', O.x + 19, 700), haut30 = px('ouest', O.x + 19, 300);
  dessiner('ouest', 90); const haut90 = px('ouest', O.x + 19, 300);
  t.ok(bas30 > 0 && haut30 === 0 && haut90 > 0, 'le mur ouest monte : à 30 %, plein en bas seulement ; à 90 %, jusqu’en haut');
  t.ok(MURS.ouest.front[0].sprite.mesh.visible && !!MURS.ouest.obstacle, 'son échafaudage suit le front, et on ne le traverse pas');
  dessiner('ouest', 100);
  t.ok(px('ouest', O.x - 4, O.porte[0] - HAUT - 10) > 0 && MURS.ouest.sentier[0].visible && !MURS.ouest.front[0].sprite.mesh.visible && !MURS.ouest.obstacle, 'à 100 % : la tourelle de la porte ouest, son sentier, plus d’échafaudage');
  dessiner('nord', 100);
  t.ok(px('nord', (N.porte[0] + N.porte[1]) / 2, N.pied - 20) > 0 && MURS.nord.sentier[0].visible, 'à 100 % : la porte nord et son sentier');
  S.avant = ''; update(0);
  // le flou : près du mur ouest, il est plus net et plus visible que le mur est, au loin
  if (heros && !visite) {
    const h = heros.heros, avantH = { x: h.x, y: h.y };
    heros.placer(4 * T, 20 * T, 'gauche'); for (let k = 0; k < 40; k++) update(0.1);
    const vis = (cle) => MURS[cle].couches.reduce((s, c) => s + (c.sprite.mesh.visible ? c.sprite.mesh.material.opacity : 0), 0);
    t.ok(vis('ouest') > 0.4 && vis('est') < 0.01, `près du mur ouest : il est là (${vis('ouest').toFixed(2)}), le mur est a disparu (${vis('est').toFixed(2)})`);
    // sorti du camp par la grande porte : les trois murs redeviennent pleins et nets, comme la façade sud
    heros.placer(15 * T, 37 * T, 'bas'); for (let k = 0; k < 40; k++) update(0.1);
    const net = (cle) => MURS[cle].couches[0].sprite.mesh.visible && MURS[cle].couches[0].sprite.mesh.material.opacity > 0.99 && MURS[cle].couches.slice(1).every((c) => !c.sprite.mesh.visible);
    t.ok(['ouest', 'nord', 'est'].every(net), `dehors : les trois murs sont pleins et nets (${['ouest', 'nord', 'est'].map((c) => vis(c).toFixed(2)).join(' ')})`);
    heros.placer(avantH.x, avantH.y, 'bas'); for (let k = 0; k < 40; k++) update(0.1);
  }
  t.ok(avant.ouest === avancement().ouest, 'l’avancement n’a pas bougé');
}

export const api = {
  etat, cacher, MURS, LIGNES,
  dormir(oui = true) { S.dort = !!oui; update(0); },
  get avancement() { return avancement(); },
  opacite(cle) { return MURS[cle].couches.reduce((s, c) => s + (c.sprite.mesh.visible ? c.sprite.mesh.material.opacity : 0), 0); },
};
