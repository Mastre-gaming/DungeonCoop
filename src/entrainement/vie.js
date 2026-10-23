// La vie du chemin de la tour (docs/fiches/chemin-de-la-tour.md §13) : rien ici ne compte pour les règles, tout se voit.
// Des oiseaux traversent la carte d'est en ouest (le vent souffle vers le camp), des papillons sur l'herbe haute et les
// blés, des canards sur l'étang, la fumée de la cheminée du moulin, des ronds dans l'eau ; la roue du moulin tourne ; la
// herse de la porte se lève quand son combat est gagné. Et les curiosités (des clins d'œil, sans histoire) : le canard
// qu'on taquine, la planche à roulettes, le rat couronné qui file entre les pierres.
// Les images sont dans public/assets/lpc/chemin.png (design/terrain-entrainement/outils/chemin.px.js, chemin.json).
import { T } from '../01_plan.js';
import CHEMIN from './chemin.json';
import ETAL from './etal.json';

let rendu, images, tr, combat, haut, herosVus = () => [];
const vols = [], papillons = [], canards = [], fumees = [], ronds = [], roues = [], portes = new Map(), curios = new Map();
const poses = [], lapins = [], cueillettes = new Map(), colporteurs = [];      // (les oiseaux posés, les lapins : ils fuient quand on approche)
let temps = 0, prochainVol = 2, prochainRond = 1, prochaineFumee = 0, puff = null, rond = null, ombre = null;
const alea = (() => { let s = 20261023; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();   // la même vie à chaque partie (les captures se comparent)
const frame = (nom) => CHEMIN[nom] ?? CHEMIN[nom.replace(/_\d+$/, '_0')];

// Un petit dessin à part (une bouffée de fumée, un rond dans l'eau), en toile.
function toile(w, h, dessin) {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d');
  dessin(g); return c;
}
function translucide(s) { s.mesh.material.transparent = true; s.mesh.material.depthWrite = false; return s; }

export function init(o) {
  ({ rendu, images, combat } = o);
  herosVus = o.heros ?? (() => []);
  const saison = o.saison ?? 'ete';                 // (comme au camp : plus de papillons en automne et en hiver, plus de canards en hiver)
  tr = o.plan?.troncon ?? null;
  if (!tr || !images.chemin) return;
  haut = (tr.monde[1] + 2) * T;                     // au-dessus de tout (les oiseaux volent)
  // la roue du moulin (et tout ce qui s'anime sur place)
  for (const a of tr.animes ?? []) {
    const [, , w, h] = CHEMIN[`${a.morceau}_0`];
    roues.push({ a, s: rendu.sprite(images.chemin, 'chemin', w, h) });
  }
  // la herse de chaque porte, baissée
  for (const p of tr.portes ?? []) {
    const [, , w, h] = CHEMIN.herse;
    portes.set(p.id, { p, s: rendu.sprite(images.chemin, 'chemin', w, h), leve: 0, monte: false, h });
  }
  // les canards : sur l'étang du départ, et sur le canal du moulin (l'eau calme) ; l'un d'eux est la curiosité « canard »
  const nager = (cx, cy, rx, ry, a, v) => canards.push({ cx, cy, rx, ry, a, v, s: rendu.sprite(images.chemin, 'chemin', 20, 14), saut: 0, part: 0 });
  if (saison !== 'hiver') for (const [x, y, rx, ry] of tr.etangs ?? []) for (let k = 0; k < 3; k++) nager(x, y, rx - 1.4, ry - 1.1, k * 2.1, 0.12 + k * 0.05);
  if (saison !== 'hiver') for (const r of (tr.canaux ?? []).filter((o) => o.x1 - o.x0 > 8)) for (let k = 0; k < 2; k++) nager(r.x0 + 4 + k * 7, (r.y0 + r.y1) / 2 + 0.1, 2.4, 0.2, k * 2.6, 0.18);
  // les papillons : au-dessus de l'herbe haute et des champs de blé
  const fleurs = [...(tr.herbes ?? []).map(([x, y]) => [x, y]), ...(tr.champs ?? []).flatMap((r) => [[r.x0 + 1.5, r.y0 + 1], [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2]])];
  if (['printemps', 'ete'].includes(saison)) fleurs.forEach(([x, y], k) => papillons.push({ x, y, k, orange: k % 3 === 0, s: rendu.sprite(images.chemin, 'chemin', 9, 7) }));
  // la fumée : la cheminée du moulin (et le toit de la cabane du gué)
  puff = toile(12, 12, (g) => { g.fillStyle = 'rgba(232, 232, 236, 0.85)'; g.beginPath(); g.arc(6, 6, 5, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(190, 190, 200, 0.7)'; g.beginPath(); g.arc(7, 7, 3, 0, Math.PI * 2); g.fill(); });
  ombre = toile(14, 6, (g) => { g.fillStyle = 'rgba(0, 0, 0, 0.22)'; g.beginPath(); g.ellipse(7, 3, 7, 3, 0, 0, Math.PI * 2); g.fill(); });
  rond = toile(28, 14, (g) => { g.strokeStyle = 'rgba(220, 244, 255, 0.9)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(14, 7, 12, 5, 0, 0, Math.PI * 2); g.stroke(); });
  // le colporteur, derrière son comptoir sous l'auvent de la carte (etal.png) : il cligne des yeux et lève une fiole
  if (images.etal) for (const c of tr.colporteurs ?? []) {
    const p = (tr.pieces ?? []).filter((q) => q.piece === 'etal').sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    if (p) colporteurs.push({ x: p.x * T + 4, y: p.y * T + 128 - 64, pied: p.y * T + 127, s: rendu.sprite(images.etal, 'etal', 56, 64) });
  }
  // les oiseaux posés sur le chemin (ils picorent ; ils s'envolent quand un héros approche) et les lapins (ils filent)
  for (const [x, y] of tr.oiseaux_poses ?? []) for (let k = 0; k < 3; k++) poses.push({ x: x + (k - 1) * 0.6, y: y + (k % 2) * 0.4, ph: k * 1.3 + x, s: rendu.sprite(images.chemin, 'chemin', 14, 12) });
  for (const [x, y] of tr.lapins ?? []) lapins.push({ x, y, x0: x, y0: y, ph: x, fuite: null, s: rendu.sprite(images.chemin, 'chemin', 18, 14) });
  // ce qu'on cueille : les pommes dans un pommier, une herbe qui soigne
  for (const c of tr.trouvailles ?? []) {
    const [, , w, h] = CHEMIN[c.sorte === 'pommier' ? 'pommes' : 'herbe_soin'];
    cueillettes.set(c.id, { c, s: rendu.sprite(images.chemin, 'chemin', w, h), chute: 0 });
  }
  // les curiosités qui se voient : la planche, le rat couronné
  for (const c of tr.curiosites ?? []) {
    if (c.sorte === 'planche') curios.set(c.id, { c, s: rendu.sprite(images.chemin, 'chemin', 28, 12), x: c.x * T, y: c.y * T });
    if (c.sorte === 'rat') curios.set(c.id, { c, s: rendu.sprite(images.chemin, 'chemin', 20, 16), x: c.x * T, y: c.y * T, fuite: 0 });
  }
}

const cheminees = () => [
  ...(tr.images ?? []).filter((o) => o.morceau === 'moulin').map((o) => ({ x: o.x * T + 158, y: o.y * T + 12 })),
  ...(tr.pieces ?? []).filter((p) => p.piece === 'cabane').map((p) => ({ x: p.x * T + 46, y: p.y * T + 10 })),
];
const eaux = () => [
  ...(tr.etangs ?? []).map(([x, y, rx, ry]) => () => ({ x: x + (alea() - 0.5) * rx, y: y + (alea() - 0.5) * ry })),
  ...(tr.riviere ? [() => { const y = 2 + alea() * (tr.monde[1] - 4); return { x: tr.riviere.x + tr.riviere.amplitude * Math.sin(y * tr.riviere.frequence) + (alea() - 0.5) * 2, y }; }] : []),
  ...(tr.canaux ?? []).filter((r) => r.x1 - r.x0 > 4).map((r) => () => ({ x: r.x0 + 1 + alea() * (r.x1 - r.x0 - 2), y: (r.y0 + r.y1) / 2 })),
];

export function update(dt) {
  if (!tr) return;
  temps += dt;
  const cam = rendu.cam, vue = rendu.vue;
  const heros = herosVus(), pres = (x, y, r) => heros.some((h) => Math.hypot(h.x - x, h.y - y) < r);
  // les oiseaux posés : ils picorent, et s'envolent tous ensemble quand un héros s'approche
  for (let k = poses.length - 1; k >= 0; k--) {
    const o = poses[k];
    if (pres(o.x, o.y, 4)) {
      const f = CHEMIN.oiseau_0;
      vols.push({ x: o.x * T, y: o.y * T - 6, v: 110 + (k % 3) * 20, vy: -60 - (k % 2) * 25, ph: o.ph, s: rendu.sprite(images.chemin, 'chemin', f[2], f[3]), o: translucide(rendu.sprite(ombre, 'ombre-oiseau', 14, 6)) });
      o.s.retirer(); poses.splice(k, 1); continue;
    }
    const f = CHEMIN[`oiseau_pose_${Math.floor(temps * 1.5 + o.ph) % 3 === 0 ? 1 : 0}`];
    o.s.poser(o.x * T - 7, o.y * T - 11, o.y * T, f[0], f[1]);
  }
  // les lapins : assis, un petit bond de temps en temps ; quand un héros approche, ils filent loin de lui et disparaissent
  for (let k = lapins.length - 1; k >= 0; k--) {
    const o = lapins[k];
    if (!o.fuite) {
      const h = heros.find((x) => Math.hypot(x.x - o.x, x.y - o.y) < 5);
      if (h) { const l = Math.hypot(o.x - h.x, o.y - h.y) || 1; o.fuite = { ux: (o.x - h.x) / l, uy: (o.y - h.y) / l, t: 0 }; }
    }
    let bond = 0;
    if (o.fuite) {
      o.fuite.t += dt; o.x += o.fuite.ux * dt * 7; o.y += o.fuite.uy * dt * 7; bond = 1;
      if (o.fuite.t > 1.1) { o.s.retirer(); lapins.splice(k, 1); continue; }
    } else bond = Math.sin(temps * 2 + o.ph) > 0.92 ? 1 : 0;
    const f = CHEMIN[`lapin_${bond}`], gauche = o.fuite ? o.fuite.ux < 0 : true;
    o.s.mesh.scale.x = gauche ? 1 : -1;
    o.s.poser(o.x * T - 9, o.y * T - 12 - bond * Math.abs(Math.sin(temps * 14)) * 5, o.y * T, f[0], f[1]);
  }
  // les pommes (elles tombent quand on secoue l'arbre) et les herbes (cueillies, elles disparaissent)
  for (const o of cueillettes.values()) {
    const S = combat.S.trouvailles?.find((x) => x.id === o.c.id), [sx, sy, w] = CHEMIN[o.c.sorte === 'pommier' ? 'pommes' : 'herbe_soin'];
    if (S?.fait && o.c.sorte !== 'pommier') { o.s.cacher(true); continue; }
    if (S?.fait) o.chute = Math.min(1, o.chute + dt * 1.6);
    o.s.cacher(o.chute >= 1);
    if (o.c.sorte === 'pommier') o.s.poser(o.c.x * T - w / 2, o.c.y * T - 96 + o.chute * o.chute * 90, o.c.y * T + 1, sx, sy);
    else o.s.poser(o.c.x * T - w / 2, o.c.y * T - 12, o.c.y * T, sx, sy);
  }
  for (const o of colporteurs) { const k = Math.floor(temps * 3) % 4, [sx, sy] = ETAL[`etal_map_${k}`]; o.s.poser(o.x, o.y, o.pied, sx, sy); }
  // la roue tourne
  for (const { a, s } of roues) { const f = CHEMIN[`${a.morceau}_${Math.floor(temps * a.fps) % a.images}`]; s.poser(a.x * T, a.y * T, a.pied * T, f[0], f[1]); }
  // les herses : baissées, ou qui montent (on montre le bas de leur image, qui remonte dans la voûte)
  for (const o of portes.values()) {
    if (o.monte) o.leve = Math.min(1, o.leve + dt / 1.6);
    else if (o.leve > 0) o.leve = Math.max(0, o.leve - dt / 0.18);      // lâchée : elle tombe d'un coup
    const [sx, sy] = CHEMIN.herse, d = Math.round(o.leve * o.h);
    o.s.cacher(o.leve >= 1);
    o.s.poser(o.p.herse.x * T, o.p.herse.y * T, (o.p.y1 + 0.4) * T, sx, sy + d);
  }
  // les canards dérivent en rond sur l'étang, dodelinent ; celui qu'on a taquiné saute, puis s'en va bouder plus loin
  canards.forEach((c, k) => {
    if (c.x != null && pres(c.x, c.y, 3)) c.peur = 2;               // un héros tout près : ils s'écartent (plus vite)
    c.peur = Math.max(0, (c.peur ?? 0) - dt);
    c.a += dt * c.v * (c.part ? 3 : 1) * (c.peur ? 4 : 1);
    if (c.part) c.part = Math.min(1, c.part + dt * 0.5);
    const x = c.cx + Math.cos(c.a) * c.rx * (1 - c.part * 0.3), y = c.cy + Math.sin(c.a) * c.ry * (1 - c.part * 0.3);
    c.saut = Math.max(0, c.saut - dt * 3);
    const f = frame(`canard_${Math.floor(temps * 2 + k) % 2}`), bond = Math.sin(c.saut * Math.PI) * 8;
    c.s.poser(x * T - 10, y * T - 10 - bond, y * T, f[0], f[1]);
    c.x = x; c.y = y;
  });
  // les papillons volettent autour de leur fleur
  for (const p of papillons) {
    const t = temps * 0.7 + p.k * 1.7, x = p.x * T + Math.sin(t) * 26 + Math.sin(t * 2.3) * 8, y = p.y * T + Math.cos(t * 1.3) * 14 - 22 + Math.sin(t * 5) * 3;
    const f = frame(`papillon${p.orange ? '_orange' : ''}_${Math.floor(temps * 8 + p.k) % 2}`);
    p.s.poser(x, y, y + 40, f[0], f[1]);
  }
  // les oiseaux : une volée entre par l'est de la vue, traverse vers l'ouest, ressort et disparaît
  if (temps > prochainVol) {
    prochainVol = temps + 5 + alea() * 9;
    const n = 1 + Math.floor(alea() * 4), y0 = cam.y + 30 + alea() * Math.max(60, vue.h - 120), v = 70 + alea() * 50;
    for (let k = 0; k < n; k++) vols.push({ x: cam.x + vue.w + 30 + k * 26, y: y0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 16, v, ph: alea() * 6, s: rendu.sprite(images.chemin, 'chemin', 26, 22), o: translucide(rendu.sprite(ombre, 'ombre-oiseau', 14, 6)) });
  }
  for (let k = vols.length - 1; k >= 0; k--) {
    const o = vols[k]; o.x -= o.v * dt; if (o.vy) { o.y += o.vy * dt; o.vy *= 1 - dt * 0.5; }
    const f = frame(`oiseau_${Math.floor(temps * 10 + o.ph) % 4}`);
    o.s.poser(o.x, o.y + Math.sin(temps * 2 + o.ph) * 4, haut, f[0], f[1]);
    o.o.poser(o.x + 6, o.y + 84, 0);                     // son ombre, loin dessous : il vole haut
    if (o.x < cam.x - 60 || o.y < cam.y - 60) { o.s.retirer(); o.o.retirer(); vols.splice(k, 1); }
  }
  // la fumée monte de la cheminée et part vers l'ouest avec le vent
  if (temps > prochaineFumee) {
    prochaineFumee = temps + 0.45;
    for (const c of cheminees()) fumees.push({ x: c.x, y: c.y, t: 0, s: translucide(rendu.sprite(puff, 'fumee', 12, 12)) });
  }
  for (let k = fumees.length - 1; k >= 0; k--) {
    const o = fumees[k]; o.t += dt;
    const e = 1 + o.t * 0.6;
    o.s.mesh.scale.set(e, e, 1); o.s.mesh.material.opacity = Math.max(0, 0.8 - o.t / 3.2);
    o.s.poser(o.x - o.t * 9 + Math.sin(o.t * 2) * 3, o.y - o.t * 16, haut - 1);
    if (o.t > 3.2) { o.s.retirer(); fumees.splice(k, 1); }
  }
  // des ronds dans l'eau (un poisson) : dans la vue seulement
  if (temps > prochainRond) {
    prochainRond = temps + 0.9 + alea() * 1.6;
    const sources = eaux();
    if (sources.length) {
      const p = sources[Math.floor(alea() * sources.length)]();
      if (p.x * T > cam.x && p.x * T < cam.x + vue.w) ronds.push({ x: p.x * T, y: p.y * T, t: 0, s: translucide(rendu.sprite(rond, 'rond', 28, 14)) });
    }
  }
  for (let k = ronds.length - 1; k >= 0; k--) {
    const o = ronds[k]; o.t += dt;
    const e = 0.4 + o.t * 0.9;
    o.s.mesh.scale.set(e, e, 1); o.s.mesh.material.opacity = Math.max(0, 0.9 - o.t / 1.3);
    o.s.poser(o.x - 14, o.y - 7, o.y - 30);
    if (o.t > 1.3) { o.s.retirer(); ronds.splice(k, 1); }
  }
  // les curiosités : la planche (tant qu'on ne l'a pas prise), le rat (assis, puis qui file vers l'est entre les pierres)
  for (const o of curios.values()) {
    const S = combat.S.curiosites.find((c) => c.id === o.c.id);
    if (o.c.sorte === 'planche') { o.s.cacher(!!S?.parti); if (!S?.parti) o.s.poser(o.x - 14, o.y - 8, o.y, ...CHEMIN.planche.slice(0, 2)); continue; }
    if (S?.parti) o.fuite = Math.min(1, o.fuite + dt * 1.4);
    o.s.cacher(o.fuite >= 1);
    const sautille = o.fuite ? Math.abs(Math.sin(o.fuite * 18)) * 3 : 0;
    o.s.poser(o.x - 10 + o.fuite * 4 * T, o.y - 12 - sautille, o.y, ...CHEMIN.rat_couronne.slice(0, 2));
  }
}

// Ce que la file des événements demande (vue.js) : une herse qui monte, un canard taquiné.
export function cueilli(id) { const o = cueillettes.get(id); if (o) o.chute = 0.01; }
export function porte(id) { const o = portes.get(id); if (o) o.monte = true; }
export function herse(id, levee) { const o = portes.get(id); if (o) o.monte = levee; }
export function curiosite(e) {
  const c = tr?.curiosites?.find((o) => o.id === e.id); if (!c) return null;
  if (c.sorte === 'canard') {
    const d = canards.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    if (d) { d.saut = 1; if (e.n) d.part = 0.01; return { x: d.x * T, y: d.y * T - 14 }; }
  }
  return { x: c.x * T, y: c.y * T - 20 };
}
export function dispose() {
  for (const o of vols) o.o.retirer();
  for (const o of [...poses, ...lapins, ...cueillettes.values(), ...colporteurs]) o.s.retirer();
  poses.length = lapins.length = colporteurs.length = 0; cueillettes.clear();
  for (const o of [...vols, ...papillons, ...canards, ...fumees, ...ronds, ...roues, ...portes.values(), ...curios.values()]) o.s.retirer();
  vols.length = papillons.length = canards.length = fumees.length = ronds.length = roues.length = 0; portes.clear(); curios.clear();
}
export const etat = () => ({ vols: vols.length, papillons: papillons.length, canards: canards.length, fumees: fumees.length, roues: roues.length, portes: [...portes.values()].map((o) => ({ id: o.p.id, leve: o.leve })) });
