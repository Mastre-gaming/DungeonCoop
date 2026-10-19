// Le jour et la nuit dans le camp (design validé par Mope le 19 oct, design/camp/jour-nuit/) : le camp suit la vraie heure
// de Paris. L'aube de 6 h à 8 h, le jour jusqu'à 18 h, le crépuscule jusqu'à 20 h 30, puis la nuit ; on passe de l'un à
// l'autre en une demi-heure. La nuit, seul ce qui brûle éclaire autour de soi : le feu de camp, le lampadaire, la forge,
// la lanterne de la table des cartes, les braseros du pont, une bougie dans chaque tente, les lanternes des portes
// secondaires (une fois leur mur fini) ; les fenêtres des tours s'allument, des lucioles volent près des bosquets, et les
// ouvriers du chantier vont se coucher. Au crépuscule et la nuit, chaque héros porte une torche, allumée toute seule.
// En visite (la carte du dashboard), le camp reste en plein jour.
// La lumière : deux voiles posés sur tout le monde, devant le reste. Le premier multiplie chaque pixel par la lumière du
// moment (le ciel, plus chaque source, qui baisse avec la distance) ; le second ajoute un peu de chaud autour des
// sources, les fenêtres et les lucioles. Les fenêtres sont dans src/data/fenetres.json (design/camp/outils/jour_nuit_jeu.py).
import * as THREE from 'three';
import { T, W, H } from './01_plan.js';
import FENETRES from './data/fenetres.json';
import MAINS from './data/mains.json';

export const name = 'jour-nuit';
export const always = true;

const FEU = [1.0, 0.62, 0.28], FORGE = [1.0, 0.5, 0.2], LANTERNE = [1.0, 0.82, 0.45], TENTE = [1.0, 0.7, 0.4], BRASERO = [1.0, 0.58, 0.25];
const TORCHE = [1.0, 0.5, 0.24];
// les sources fixes : x, y (pixels du monde), rayon, force, couleur ; `mur` : seulement quand ce mur est fini
export const SOURCES = [
  { x: 640, y: 438, r: 170, f: 1.25, c: FEU },          // le feu de camp
  { x: 675, y: 322, r: 80, f: 0.9, c: LANTERNE },       // le lampadaire près du feu
  { x: 1225, y: 228, r: 90, f: 1.0, c: FORGE },         // la forge de Baba
  { x: 1117, y: 228, r: 46, f: 0.55, c: TENTE },        // une bougie dans la tente du nord-est
  { x: 351, y: 548, r: 46, f: 0.55, c: TENTE },         // et dans celle de l'ouest
  { x: 410, y: 1146, r: 110, f: 1.1, c: BRASERO },      // les braseros du pont
  { x: 550, y: 1146, r: 110, f: 1.1, c: BRASERO },
  { x: 480, y: 1010, r: 60, f: 0.6, c: LANTERNE },      // sous la voûte de la grande porte
  { x: 985, y: 492, r: 60, f: 0.75, c: LANTERNE },      // la lanterne de la table des cartes
  { x: 83, y: 215, r: 60, f: 0.75, c: LANTERNE, mur: 'ouest' },   // les lanternes des portes secondaires
  { x: 1274, y: 573, r: 60, f: 0.75, c: LANTERNE, mur: 'est' },
  { x: 356, y: 27, r: 60, f: 0.75, c: LANTERNE, mur: 'nord' },
];
const MAX = 24;                                  // sources dans le voile (les fixes, puis une torche par héros)
const BOSQUETS = [[160, 470, 70], [620, 720, 70], [1170, 440, 70], [650, 110, 60]];
const LUCIOLES = 24;

// Les moments de la journée (minutes depuis minuit, heure de Paris) : le ciel, la force des sources, les fenêtres, les
// lucioles. Entre deux repères, on fond.
const NUIT = { ciel: [0.22, 0.27, 0.48], sources: 1, fenetres: 1, lucioles: 1 };
const AUBE = { ciel: [0.7, 0.64, 0.78], sources: 0.4, fenetres: 0, lucioles: 0 };
const JOUR = { ciel: [1, 1, 1], sources: 0, fenetres: 0, lucioles: 0 };
const CREPUSCULE = { ciel: [0.78, 0.56, 0.48], sources: 0.7, fenetres: 1, lucioles: 0 };
export const REPERES = [[0, NUIT], [330, NUIT], [360, AUBE], [450, AUBE], [480, JOUR], [1080, JOUR], [1110, CREPUSCULE], [1200, CREPUSCULE], [1230, NUIT], [1440, NUIT]];

export function moment(min) {
  min = ((min % 1440) + 1440) % 1440;
  let i = 0; while (REPERES[i + 1][0] < min) i++;
  const [m0, a] = REPERES[i], [m1, b] = REPERES[i + 1], f = m1 > m0 ? (min - m0) / (m1 - m0) : 0, mix = (u, v) => u + (v - u) * f;
  return { ciel: a.ciel.map((c, k) => mix(c, b.ciel[k])), sources: mix(a.sources, b.sources), fenetres: mix(a.fenetres, b.fenetres), lucioles: mix(a.lucioles, b.lucioles) };
}
// le nom du moment (pour les textes et les tests)
export function nom(min) {
  min = ((min % 1440) + 1440) % 1440;
  return min < 345 || min >= 1215 ? 'nuit' : min < 465 ? 'aube' : min < 1095 ? 'jour' : 'crépuscule';
}
// l'heure de Paris, en minutes depuis minuit
export function heureParis(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]));
  return Number(p.hour) * 60 + Number(p.minute);
}
const lire = (s) => { const m = /^(\d{1,2})(?:[:h](\d{2}))?$/.exec(s ?? ''); return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : null; };

// La torche : un manche de bois penché vers l'extérieur, un lien, une flamme (3 images qui dansent). Le héros la tient dans
// sa main droite : sa main, prise dans sa propre planche, est redessinée par-dessus le manche (il la serre). La main suit
// celle de la planche, image par image (src/data/mains.json, relevée par design/camp/outils/mains_torche.py).
const BOIS = '#764c28', BOIS2 = '#50321a', LIEN = '#3a2822', O = '#d6541c', M = '#faa030', C = '#ffe896', J = '#ffc850';
const FLAMMES = [
  [[-1, -9, O], [0, -9, M], [1, -9, M], [2, -9, O], [-1, -10, O], [0, -10, C], [1, -10, C], [2, -10, M], [-1, -11, M], [0, -11, C], [1, -11, J], [2, -11, O], [0, -12, M], [1, -12, J], [0, -13, O], [1, -13, M], [1, -14, O]],
  [[-1, -9, O], [0, -9, M], [1, -9, M], [2, -9, O], [-1, -10, M], [0, -10, C], [1, -10, C], [2, -10, O], [-1, -11, O], [0, -11, J], [1, -11, C], [2, -11, M], [0, -12, J], [1, -12, M], [0, -13, M], [0, -14, O]],
  [[-1, -9, O], [0, -9, M], [1, -9, M], [2, -9, O], [-1, -10, O], [0, -10, C], [1, -10, C], [2, -10, M], [0, -11, C], [1, -11, C], [2, -11, O], [0, -12, J], [1, -12, M], [1, -13, M], [1, -14, O], [2, -15, O]],
];
const LIGNES = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const PENCHE = [1, 1, -1, -1];                   // vers où penche la torche (haut, gauche, bas, droite) : hors du corps, loin du visage
const TW = 12, TH = 24, MX = 5, MY = 18;         // la planche de la torche : 12 × 24 par image, la main en (5, 18)
const FW = 6, FH = 5;                            // la main redessinée : 6 × 5 autour de la prise
const decale = (y, p) => p * Math.floor((3 - y) / 4);   // le manche penche d'un pixel toutes les 4 rangées
const HAUT_MANCHE = 11;                          // le manche monte de 11 pixels au-dessus de la main

function planche() {
  const c = Object.assign(document.createElement('canvas'), { width: TW * FLAMMES.length, height: TH * 2 }), g = c.getContext('2d');
  [-1, 1].forEach((p, r) => FLAMMES.forEach((f, k) => {
    const px = (dx, dy, col) => { g.fillStyle = col; g.fillRect(k * TW + MX + dx, r * TH + MY + dy, 1, 1); };
    for (let y = -HAUT_MANCHE + 1; y < 4; y++) { px(decale(y, p), y, p < 0 ? BOIS2 : BOIS); px(decale(y, p) + 1, y, p < 0 ? BOIS : BOIS2); }
    const h = -HAUT_MANCHE, d = decale(h, p);
    for (let x = -1; x < 3; x++) px(d + x, h, LIEN);
    for (const [dx, dy, col] of f) px(dx + d, dy + h + 8, col);
  }));
  return c;
}

const VERTEX = `varying vec2 vMonde;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vMonde = vec2(w.x, -w.y); gl_Position = projectionMatrix * viewMatrix * w; }`;
const LUMIERE = `
uniform vec4 sources[${MAX}]; uniform vec3 couleurs[${MAX}]; uniform int n;
float part(int i) { vec4 s = sources[i]; vec2 d = vMonde - s.xy; return pow(clamp(1.0 - length(vec2(d.x, d.y * 1.15)) / s.z, 0.0, 1.0), 1.6) * s.w; }`;
const MULTIPLIE = `varying vec2 vMonde; uniform vec3 ciel; ${LUMIERE}
void main() { vec3 L = ciel; for (int i = 0; i < ${MAX}; i++) { if (i >= n) break; L += part(i) * couleurs[i]; } gl_FragColor = vec4(min(L, vec3(1.0)), 1.0); }`;
const AJOUTE = `varying vec2 vMonde; ${LUMIERE}
uniform vec4 fenetres[${FENETRES.length}]; uniform float allume; uniform vec3 lucioles[${LUCIOLES}];
void main() {
  vec3 a = vec3(0.0);
  for (int i = 0; i < ${MAX}; i++) { if (i >= n) break; float k = part(i); a += k * k * couleurs[i] * 0.12; }
  for (int i = 0; i < ${FENETRES.length}; i++) { vec4 f = fenetres[i]; if (vMonde.x >= f.x && vMonde.x < f.x + f.z && vMonde.y >= f.y && vMonde.y < f.y + f.w) a += vec3(1.0, 0.72, 0.33) * allume; }
  for (int i = 0; i < ${LUCIOLES}; i++) { vec3 l = lucioles[i]; vec2 d = abs(vMonde - l.xy); if (d.x < 1.0 && d.y < 0.5) a += vec3(0.84, 1.0, 0.47) * l.z; }
  gl_FragColor = vec4(a, 1.0);
}`;

let rendu, heros, reseau, chantier, murs, muraille, visite, voiles, torches = new Map(), feuille, temps = 0;
const S = { force: null, min: 0, m: JOUR, dort: false, torche: false };
const sources = Array.from({ length: MAX }, () => new THREE.Vector4()), couleurs = Array.from({ length: MAX }, () => new THREE.Vector3());
const lucioles = Array.from({ length: LUCIOLES }, () => new THREE.Vector3());

function voile(fragment, dessus, uniforms, ordre) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * T, H * T), new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: fragment, uniforms, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: dessus ? THREE.OneFactor : THREE.ZeroFactor, blendDst: dessus ? THREE.OneFactor : THREE.SrcColorFactor,
  }));
  m.position.set(W * T / 2, -H * T / 2, 100); m.renderOrder = ordre; m.frustumCulled = false;
  rendu.scene.add(m);
  return m;
}

export function init(game, options) {
  ({ rendu, heros, reseau, chantier, murs, muraille, visite } = options);
  S.force = lire(options.heure);
  if (visite) return api;
  feuille = planche();
  const commun = { sources: { value: sources }, couleurs: { value: couleurs }, n: { value: 0 } };
  voiles = [
    voile(MULTIPLIE, false, { ...commun, ciel: { value: new THREE.Vector3(1, 1, 1) } }, 1000),
    voile(AJOUTE, true, { ...commun, fenetres: { value: FENETRES.map(([x, y, w, h]) => new THREE.Vector4(x, y, w, h)) }, allume: { value: 0 }, lucioles: { value: lucioles } }, 1001),
  ];
  update(0);
  return api;
}

// une torche par héros visible (le mien, puis ceux des autres joueurs) : la torche, la main qui la serre, et sa lumière
// (q : le héros { x, y, ligne, rang, col, feuille })
function torche(cle, q, visible, k) {
  let t = torches.get(cle);
  if (!t) { t = { torche: rendu.sprite(feuille, 'torche', TW, TH), main: null, nom: '' }; torches.set(cle, t); }
  const vu = visible && S.torche && !!q.feuille;
  if (vu && t.nom !== q.feuille.nom) { t.main?.retirer(); t.main = rendu.sprite(q.feuille.source, q.feuille.nom, FW, FH); t.nom = q.feuille.nom; }
  t.torche.cacher(!vu); t.main?.cacher(!vu);
  if (!vu) return null;
  const table = q.rang >= 38 ? MAINS.course : MAINS.marche, l = table[q.ligne] ?? table[2], [mx, my] = l[Math.min(l.length - 1, q.col ?? 0)];
  const p = PENCHE[q.ligne] ?? -1, gx = q.x - 32 + mx, gy = q.y - 60 + my;
  t.torche.poser(gx - MX, gy - MY, q.y + 0.5, (Math.floor(temps / 0.12 + k) % FLAMMES.length) * TW, (p > 0 ? 1 : 0) * TH);
  t.main.poser(gx - 3, gy - 2, q.y + 0.6, (q.col ?? 0) * 64 + mx - 3, q.rang * 64 + my - 2);
  return { x: gx + decale(-HAUT_MANCHE, p) + 0.5, y: gy - HAUT_MANCHE - 3, r: 115, f: 1.15 * (0.95 + 0.05 * Math.sin(temps * 13 + k)), c: TORCHE };
}

export function update(dt) {
  if (visite || !voiles) return;
  temps += dt;
  S.min = S.force ?? heureParis();
  const m = S.m = moment(S.min);
  S.torche = m.sources >= 0.5;
  // les ouvriers du chantier vont se coucher à la nuit tombée
  const dort = nom(S.min) === 'nuit';
  if (dort !== S.dort) { S.dort = dort; chantier?.dormir?.(dort); murs?.dormir?.(dort); }
  // les sources : les fixes, puis les torches
  const liste = SOURCES.filter((s) => !s.mur || (murs?.avancement?.[s.mur] ?? 0) >= 100);
  const h = heros?.heros;
  const mienne = h && torche('moi', { x: h.x, y: h.y, ligne: LIGNES[h.dir] ?? 2, rang: h.rang ?? 10, col: h.col ?? 0, feuille: heros.feuille }, !!heros.sprite?.mesh.visible, 0);
  if (mienne) liste.push(mienne);
  const vus = new Set(['moi']);
  for (const [id, c] of reseau?.copies ?? []) {
    vus.add(id);
    const l = torche(id, { x: c.x ?? 0, y: c.y ?? 0, ligne: c.ligne ?? 2, rang: c.rang ?? 10, col: c.col ?? 0, feuille: c.feuille }, c.x !== undefined && !!c.sprite?.mesh.visible, 1.7 + vus.size);
    if (l) liste.push(l);
  }
  for (const [id, t] of torches) if (!vus.has(id)) { t.torche.retirer(); t.main?.retirer(); torches.delete(id); }
  const n = Math.min(MAX, liste.length);
  for (let i = 0; i < n; i++) { const s = liste[i]; sources[i].set(s.x, s.y, s.r, s.f * (s === mienne || s.c === TORCHE ? 1 : m.sources)); couleurs[i].set(...s.c); }
  const [multi, ajout] = voiles;
  multi.material.uniforms.ciel.value.set(...m.ciel);
  multi.material.uniforms.n.value = ajout.material.uniforms.n.value = m.sources > 0.001 || mienne ? n : 0;
  // les fenêtres des tours
  // (dans le camp, la muraille n'est plus qu'un voile flou : ses fenêtres aussi, à peine)
  const e = muraille?.estompe ?? 0;
  ajout.material.uniforms.allume.value = m.fenetres * (e > 0 ? 0.35 * (1 - e) : 1);
  BOSQUETS.forEach(([bx, by, r], b) => {
    for (let k = 0; k < LUCIOLES / BOSQUETS.length; k++) {
      const i = b * (LUCIOLES / BOSQUETS.length) + k, a = temps * (0.2 + 0.05 * k) + i * 2.4, d = r * (0.3 + 0.7 * ((i * 0.618) % 1));
      lucioles[i].set(Math.round(bx + Math.cos(a) * d), Math.round(by + Math.sin(a * 1.3) * d * 0.8), m.lucioles * Math.max(0, Math.sin(temps * 1.7 + i * 3.1)));
    }
  });
  const rien = m.ciel[0] >= 0.999 && n === 0;
  for (const v of voiles) v.visible = !rien;
}

export function dispose() {}

export function selfTest(t) {
  t.group('Le jour et la nuit');
  t.eq(nom(12 * 60), 'jour', 'à midi, c’est le jour');
  t.eq([nom(7 * 60), nom(19 * 60), nom(23 * 60), nom(3 * 60)], ['aube', 'crépuscule', 'nuit', 'nuit'], 'l’aube à 7 h, le crépuscule à 19 h, la nuit à 23 h et à 3 h');
  t.ok(moment(12 * 60).ciel.every((c) => c === 1) && moment(12 * 60).sources === 0, 'le jour : rien n’est assombri, les lanternes sont éteintes');
  const n = moment(23 * 60), mi = moment(1095);
  t.ok(n.ciel[2] > n.ciel[0] && n.ciel[0] < 0.3 && n.sources === 1, 'la nuit : un ciel bleu sombre, les feux allumés');
  t.ok(mi.ciel[0] < 1 && mi.ciel[0] > 0.78, 'à 18 h 15, on passe doucement du jour au crépuscule');
  t.ok(heureParis(new Date('2026-07-01T10:00:00Z')) === 12 * 60 && heureParis(new Date('2026-12-01T10:00:00Z')) === 11 * 60, 'l’heure de Paris (été comme hiver)');
  if (visite || !voiles) return;
  const avant = S.force;
  S.force = 23 * 60; update(0.1);
  t.ok(voiles[0].visible && voiles[0].material.uniforms.ciel.value.x < 0.3, 'à 23 h : le camp est dans la nuit');
  t.ok(S.torche && torches.get('moi')?.torche.mesh.visible === !!heros.sprite?.mesh.visible && torches.get('moi')?.main?.mesh.visible === !!heros.sprite?.mesh.visible, 'le héros porte une torche, allumée toute seule, serrée dans sa main');
  t.ok(chantier?.dormant !== false, 'les ouvriers du chantier sont couchés');
  S.force = 12 * 60; update(0.1);
  t.ok(!voiles[0].visible && !torches.get('moi')?.torche.mesh.visible && !S.dort, 'à midi : plein jour, plus de torche, les ouvriers au travail');
  S.force = avant; update(0);
}

export const api = {
  moment, nom, heureParis, SOURCES, MAINS,
  // forcer une heure (« 22:30 », ou des minutes ; null : l'heure de Paris) — pour les captures et les tests
  heure(h) { S.force = typeof h === 'number' ? h : lire(h); update(0); },
  get etat() { return { min: S.min, nom: nom(S.min), ...S.m, torche: S.torche, dort: S.dort }; },
};
