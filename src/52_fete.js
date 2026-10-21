// La fête du niveau 4 (design validé par Mope le 21 oct, design/camp/saisons/) : le jour où un lieu atteint le niveau 4
// (le jour de Paris où la mission qui l'y fait passer est rentrée), le camp fait la fête toute la journée. Quatre mâts
// plantés aux coins de la place du feu, des guirlandes de fanions et de lanternes de papier entre eux (les fanions flottent ;
// la nuit, les lanternes éclairent), et de temps en temps une ronde : les héros qui se promènent viennent danser en rond
// sur la place, devant le feu, pendant une minute, puis repartent ; le barde de la radio joue à côté. On parle à un
// danseur (E) : il quitte la ronde. Pendant la fête, pas d'autre scène entre habitants. ?fete pour la voir n'importe quand.
import { estTache, etatDe, lieuDe, tailleDe, POINTS, SEUILS } from './10_missions.js';
import { paris } from './48_meteo.js';

export const name = 'fete';
export const always = true;

export const MATS = [[548, 372], [742, 372], [742, 520], [548, 520]];   // aux coins de la place, dans la terre
const HAUT = 46;                                   // la hauteur d'un mât
export const RONDE = { x: 640, y: 566, rx: 86, ry: 24, tour: 40, danseurs: 7 };   // la ronde, devant le feu ; un tour en 40 s
const DANSE = 60, REPOS = 40, ALLER = 25;          // une ronde dure une minute, puis 40 s de repos ; 25 s pour s'y rendre
const FANIONS = ['#d63430', '#f6c83c', '#3c6ec8', '#faf8f0', '#46a046'];
const CORDE = '#463224', LANTERNE = '#ec7828', LANTERNE_CLAIR = '#fcc45a', LANTERNE_BORD = '#6e3c1e';
const MARCHE = 8;                                  // la rangée de la marche, dans une planche LPC (+ la direction)

let rendu, promeneurs, scenes, lieux, missions, jourNuit;
const S = { active: false, force: null, t: 0, etat: 'repos', attente: 10, ronde: [], angle: 0, verif: 0, aleat: Math.random };
const pieces = [];   // { sprite, w, h, x, y, pied, frames: [sx de chaque image] }

// le jour (de Paris) où chaque lieu a atteint le niveau 4 : quand la mission qui l'y fait passer est rentrée
export function joursDuNiveau4(issues = []) {
  const rentrees = issues.filter((i) => estTache(i) && etatDe(i) === 'rentree' && i.closed_at && lieuDe(i) && tailleDe(i))
    .sort((a, b) => a.closed_at.localeCompare(b.closed_at));
  const points = {}, jours = {};
  for (const i of rentrees) {
    const l = lieuDe(i);
    points[l] = (points[l] ?? 0) + POINTS[tailleDe(i)];
    if (!jours[l] && points[l] >= SEUILS[4]) jours[l] = paris(new Date(i.closed_at)).jour;
  }
  return jours;
}

// --- Le dessin : les mâts et les guirlandes, deux images chacun (les fanions flottent) --------------------------
function toile(w, h) { const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

function mat(t) {
  const [c, g] = toile(14, HAUT + 3);
  px(g, '#784e32', 2, 3, 2, HAUT); px(g, '#543820', 4, 3, 1, HAUT);    // le mât (le pied en bas de l'image)
  px(g, '#c4a03c', 1, 0, 4, 3);                                         // la boule dorée
  const v = t % 2;                                                      // le fanion du haut flotte
  g.fillStyle = '#d63430'; g.beginPath(); g.moveTo(5, 4); g.lineTo(13 + v, 6 - v); g.lineTo(5, 9); g.closePath(); g.fill();
  return c;
}

// une guirlande d'un mât à l'autre : la corde pend un peu ; un fanion tous les 9 pixels, une lanterne sur trois
function guirlande([ax, ay], [bx, by], t) {
  ay -= HAUT - 4; by -= HAUT - 4;
  const x0 = Math.min(ax, bx) - 4, y0 = Math.min(ay, by) - 1, x1 = Math.max(ax, bx) + 4, y1 = Math.max(ay, by) + 20;
  const [c, g] = toile(x1 - x0, y1 - y0);
  const n = Math.round(Math.max(Math.abs(bx - ax), Math.abs(by - ay))), pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([ax + (bx - ax) * u - x0, ay + (by - ay) * u + 40 * u * (1 - u) - y0]); }
  for (const [x, y] of pts) px(g, CORDE, x, y);
  for (let k = 0, i = 5; i < n - 4; k++, i += 9) {
    const [x, y] = pts[i];
    if (k % 3 === 1) {   // une lanterne de papier
      px(g, CORDE, x, y, 1, 3); px(g, LANTERNE, x - 2, y + 3, 5, 6); px(g, LANTERNE_CLAIR, x - 1, y + 4, 1, 4);
      px(g, LANTERNE_BORD, x - 2, y + 3, 5, 1); px(g, LANTERNE_BORD, x - 2, y + 8, 5, 1);
    } else {             // un fanion
      const v = (t + k) % 2;
      g.fillStyle = FANIONS[k % FANIONS.length]; g.beginPath(); g.moveTo(Math.round(x) - 2, Math.round(y)); g.lineTo(Math.round(x) + 3, Math.round(y)); g.lineTo(Math.round(x) + v, Math.round(y) + 6); g.closePath(); g.fill();
    }
  }
  return { c, x: x0, y: y0 };
}

// une pièce à deux images : les deux côte à côte dans un seul canevas
function piece(dessin, x, y, pied) {
  const a = dessin(0), b = dessin(1), w = a.width, h = a.height;
  const [c, g] = toile(w * 2, h);
  g.drawImage(a, 0, 0); g.drawImage(b, w, 0);
  const sprite = rendu.sprite(c, `fete-${pieces.length}`, w, h);
  pieces.push({ sprite, w, h, x, y, pied });
}

export function init(game, options) {
  ({ rendu, promeneurs, scenes, lieux, missions, jourNuit } = options);
  S.force = options.fete ? true : null;
  for (const [x, y] of MATS) piece(mat, x - 3, y - HAUT - 2, y);
  // les guirlandes : celle du fond (devant le lampadaire), celles des côtés et celle de devant (devant la place)
  MATS.forEach((a, k) => {
    const b = MATS[(k + 1) % 4], fond = k === 0, { x, y } = guirlande(a, b, 0);
    piece((t) => guirlande(a, b, t).c, x, y, fond ? a[1] + 1 : 521);
  });
  // la nuit, les lanternes éclairent un peu (une source au milieu de chaque guirlande)
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = MATS[k], [bx, by] = MATS[(k + 1) % 4];
    jourNuit?.SOURCES?.push({ x: (ax + bx) / 2, y: (ay + by) / 2 - 28, r: 56, f: 0.6, c: [1.0, 0.7, 0.35], quand: () => S.active });
  }
  S.active = actif(); montrer();
  game.bus?.on?.('missions:maj', () => { S.verif = Math.min(S.verif, 0.5); });   // (les missions arrivent : on regarde juste après les lieux)
  return api;
}

// la fête : un lieu a atteint le niveau 4 aujourd'hui (et on le voit au niveau 4), ou ?fete
function actif() {
  if (S.force !== null) return S.force;
  const jour = paris().jour, jours = joursDuNiveau4(missions?.etat?.issues ?? []);
  return Object.entries(jours).some(([l, j]) => j === jour && (lieux?.niveau?.(l) ?? 0) >= 4);
}

function montrer() {
  const f = Math.floor(S.t / 0.35) % 2;
  for (const p of pieces) { p.sprite.poser(p.x, p.y, p.pied, f * p.w, 0); p.sprite.cacher(!S.active); }
}

// --- La ronde ----------------------------------------------------------------------------------------------------
const libres = () => (promeneurs?.promeneurs ?? []).filter((p) => !p.absent && !p.scene && p.bulleT <= 0 && p.va <= 0 && p.montre <= 0);
const place = (a) => [RONDE.x + RONDE.rx * Math.cos(a), RONDE.y + RONDE.ry * Math.sin(a)];
function face(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'gauche' : 'droite') : (dy < 0 ? 'haut' : 'bas'); }

function commencer() {
  if (scenes?.scene) return false;   // une scène en cours : on attend qu'elle finisse
  const gens = libres().sort((a, b) => Math.hypot(a.x - RONDE.x, a.y - RONDE.y) - Math.hypot(b.x - RONDE.x, b.y - RONDE.y)).slice(0, RONDE.danseurs);
  if (gens.length < 3) return false;
  S.ronde = [];
  gens.forEach((p, k) => {
    const d = { p, a: (2 * Math.PI * k) / gens.length };
    const [x, y] = place(d.a);
    p.scene = { fete: true, dir: face(RONDE.x - x, RONDE.y - y), pose: () => pose(d), quitter: () => lacher(d) };
    if (promeneurs.envoyer(p, x, y)) S.ronde.push(d); else promeneurs.liberer(p);
  });
  if (S.ronde.length < 3) { finir(); return false; }
  S.etat = 'aller'; S.t0 = S.t; S.angle = 0;
  return true;
}

// en dansant : il marche (les images de la marche), tourné dans le sens de la ronde
function pose(d) {
  if (S.etat !== 'danse') return null;
  return { rang: MARCHE + (promeneurs.DIRS?.[d.p.dir] ?? 2), col: 1 + (Math.floor((S.t + d.a) * 9) % 8) };
}

function lacher(d) { S.ronde = S.ronde.filter((x) => x !== d); if (d.p.scene?.fete) promeneurs.liberer(d.p); }
function finir() { for (const d of S.ronde) if (d.p.scene?.fete) promeneurs.liberer(d.p); S.ronde = []; S.etat = 'repos'; S.attente = REPOS; }

function danser(dt) {
  S.ronde = S.ronde.filter((d) => !d.p.absent && d.p.scene?.fete);
  if (S.etat === 'aller') {
    const arrives = S.ronde.every((d) => !d.p.route?.length);
    if (arrives || S.t - S.t0 > ALLER) {
      for (const d of S.ronde.filter((x) => x.p.route?.length)) lacher(d);   // pas arrivé à temps : il ne danse pas
      if (S.ronde.length < 3) { finir(); return; }
      S.etat = 'danse'; S.t0 = S.t;
    }
    return;
  }
  if (S.etat !== 'danse') return;
  if (S.t - S.t0 > DANSE || S.ronde.length < 2) { finir(); return; }
  S.angle += (2 * Math.PI * dt) / RONDE.tour;
  for (const d of S.ronde) {
    const a = d.a + S.angle, [x, y] = place(a);
    d.p.x = x; d.p.y = y;
    d.p.scene.dir = face(-Math.sin(a) * RONDE.rx, Math.cos(a) * RONDE.ry);
  }
}

export function update(dt) {
  S.t += dt;
  if ((S.verif -= dt) <= 0) {   // (une fois par minute, et quand les missions arrivent : la fête commence, ou s'arrête à minuit)
    S.verif = 60;
    const a = actif();
    if (a !== S.active) { S.active = a; if (!a) finir(); }
  }
  scenes?.bloquer?.(S.active);
  if (S.active) {
    if (S.etat === 'repos') { if ((S.attente -= dt) <= 0 && !commencer()) S.attente = 5; }
    else danser(dt);
  }
  montrer();
}

export function dispose() { finir(); for (const p of pieces) p.sprite.retirer(); pieces.length = 0; }

export function selfTest(t) {
  t.group('La fête du niveau 4');
  const m = (n, axe, taille, quand) => ({ number: n, state: 'closed', closed_at: quand, labels: [`axe: ${axe}`, `taille: ${taille}`], assignees: [{ login: 'x' }] });
  const issues = [...Array.from({ length: 4 }, (_, k) => m(k + 1, 'menus', 'L', `2026-10-0${k + 1}T10:00:00Z`)), m(9, 'menus', 'M', '2026-10-12T22:30:00Z'), m(10, 'combats', 'L', '2026-10-05T10:00:00Z')];
  const jours = joursDuNiveau4(issues);
  t.ok(jours.interface === '2026-10-13' && !jours.combat, 'le jour de la fête : celui où un lieu passe le niveau 4 (35 points), à l’heure de Paris');
  const avant = { force: S.force, active: S.active, etat: S.etat, attente: S.attente };
  S.force = true; S.verif = 0; update(0.01);
  t.ok(S.active && pieces.length === 8 && pieces.every((p) => p.sprite.mesh.visible), 'la fête : quatre mâts et quatre guirlandes autour de la place');
  t.ok(jourNuit?.SOURCES ? jourNuit.SOURCES.filter((s) => s.quand).length >= 4 : true, 'la nuit, les lanternes éclairent');
  // la ronde : des héros viennent danser (on les pose directement à leur place)
  S.etat = 'repos'; S.attente = 0; update(0.01);
  if (S.etat === 'aller') {
    for (const d of S.ronde) { const [x, y] = place(d.a); d.p.x = x; d.p.y = y; d.p.route = null; }
    update(0.01); const a0 = S.ronde.map((d) => [d.p.x, d.p.y]);
    update(2);
    t.ok(S.etat === 'danse' && S.ronde.length >= 3 && S.ronde.every((d, k) => Math.hypot(d.p.x - a0[k][0], d.p.y - a0[k][1]) > 1), `la ronde : ${S.ronde.length} héros dansent en rond devant le feu`);
    t.ok(scenes?.bloque !== false, 'pendant la fête, pas d’autre scène entre habitants');
    const d = S.ronde[0]; d.p.scene.quitter();
    t.ok(!d.p.scene && !S.ronde.includes(d), 'on parle à un danseur : il quitte la ronde');
  } else t.ok(true, 'la ronde attend que les héros soient libres');
  S.force = false; S.verif = 0; update(0.01);
  t.ok(!S.active && S.ronde.length === 0 && pieces.every((p) => !p.sprite.mesh.visible), 'pas de fête : ni mâts, ni guirlandes, ni ronde');
  Object.assign(S, avant); S.verif = 0; update(0);
}

export const api = {
  MATS, RONDE, joursDuNiveau4,
  // dbg.fete.forcer(true) : la fête tout de suite ; forcer(null) : revenir au calendrier
  forcer(x) { S.force = x; S.verif = 0; update(0); },
  ronde() { S.attente = 0; update(0); return S.etat; },
  get etat() { return { active: S.active, etat: S.etat, danseurs: S.ronde.map((d) => d.p.h.id) }; },
};
