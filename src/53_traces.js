// Le camp garde des traces (design validé par Mope le 22 oct, design/camp/traces/). Deux choses :
// - La voie des étendards : chaque grosse mission (taille L) rentrée plante un étendard devant la grande porte, de chaque
//   côté de la route, aux couleurs de son axe. Le plus ancien est le plus près de la porte ; la voie s'allonge vers
//   l'extérieur (12 de chaque côté par rang, trois rangs). Ceux des trois derniers jours ont une gerbe de fleurs au pied.
//   On s'approche d'un étendard, E : la mission, qui l'a faite et quand. Les drapeaux ondulent au vent.
// - Les sentiers qui s'usent : chaque sentier suit le travail des 14 derniers jours dans le lieu où il mène, comparé au lieu
//   le plus actif (moins de 10 % : l'herbe reprend un bord ; moins de 35 % : normal ; moins de 70 % : usé ; sinon très
//   usé). La route de la porte au feu est toujours très usée : tout le monde la prend. Le sol est redessiné (01_plan.js,
//   terreUsee ; 03_carte.js, composerSol) quand l'usure change, puis repeint pour la saison.
import { CHEMINS_LIEUX } from './01_plan.js';
import { composerSol } from './03_carte.js';
import { reteindreSol } from './51_saisons.js';
import { estTache, etatDe, lieuDe, tailleDe, POINTS, LIEUX_AXES } from './10_missions.js';

export const name = 'traces';
export const always = true;

const JOURS = 14, JOUR = 86400e3;
// le pied des mâts : le premier rang au milieu de la rive, le deuxième derrière lui (entre ses étendards), le dernier devant
const PORTE = { gauche: 384, droite: 576 }, PAS = 26, PAR_COTE = 12, RANGS = [1192, 1166, 1214], DECALE = [0, 13, 6];
const W = 22, H = 52, PIED = 48, MAT = 11;      // une case de la planche des étendards ; le pied du mât en (MAT, PIED)
const PRES = 26, BULLE = 7, VENT = 0.45;        // E à moins de 26 px d'un étendard ; on le lit 7 s ; le drapeau ondule

let game, rendu, images, sol, solMesh, missions, heros, collision, visite;
const S = { usure: null, etendards: [], t: 0, lit: null, parle: 0, maintenant: () => Date.now() };
let planche = null, bulle = null, parler = null;

// --- Ce que disent les missions ---------------------------------------------------------------------------------
// l'usure de chaque lieu : son travail des 14 derniers jours (en points), comparé au lieu le plus actif
export function usures(issues = [], maintenant = Date.now()) {
  const points = Object.fromEntries(LIEUX_AXES.filter((a) => a.id !== 'camp').map((a) => [a.id, 0]));
  for (const i of issues) {
    if (!estTache(i) || etatDe(i) !== 'rentree' || !i.closed_at) continue;
    const l = lieuDe(i), t = tailleDe(i);
    if (l in points && t && maintenant - Date.parse(i.closed_at) <= JOURS * JOUR) points[l] += POINTS[t];
  }
  const top = Math.max(0, ...Object.values(points));
  if (!top) return { ...Object.fromEntries(Object.keys(points).map((k) => [k, 1])), '*': 1, archives: 1 };   // personne n'a travaillé : rien ne change
  const u = (r) => (r < 0.1 ? 0 : r < 0.35 ? 1 : r < 0.7 ? 2 : 3);
  return { ...Object.fromEntries(Object.entries(points).map(([k, p]) => [k, u(p / top)])), '*': 3, archives: 1 };
}
const usureDe = (usure) => (n, k) => Math.max(...(CHEMINS_LIEUX[n]?.[k] ?? ['?']).map((l) => usure[l] ?? 1));

// les grosses missions rentrées, la plus ancienne d'abord
export function grossesMissions(issues = []) {
  return issues.filter((i) => estTache(i) && etatDe(i) === 'rentree' && tailleDe(i) === 'L' && i.closed_at)
    .sort((a, b) => a.closed_at.localeCompare(b.closed_at) || a.number - b.number);
}
// où se plante le k-ième étendard (le pied du mât) : à gauche puis à droite de la route, en s'éloignant de la porte
export function place(k) {
  const rang = Math.floor(k / (2 * PAR_COTE)), j = k % (2 * PAR_COTE), col = j >> 1;
  if (rang >= RANGS.length) return null;
  const d = col * PAS + DECALE[rang];
  return { x: j % 2 === 0 ? PORTE.gauche - d : PORTE.droite + d, y: RANGS[rang] };
}

// --- Le dessin : une planche, une rangée par axe ; 4 images (le vent, puis les mêmes avec la gerbe de fleurs) --------
const BOIS = { f: '#5c3c24', c: '#92643a' }, OR = { c: '#fad660', m: '#d6a634', f: '#8c641e' };
const PIERRE = { o: '#3a3438', c: '#d6d0c4', m: '#b0a99e', s: '#807972' };
const AXES = [...LIEUX_AXES.map((a) => a.couleur), '#888888'];
const hexa = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = (c) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(',')})`;

function dessinerPlanche() {
  const c = Object.assign(document.createElement('canvas'), { width: 4 * W, height: AXES.length * H }), g = c.getContext('2d');
  AXES.forEach((couleur, a) => { for (let f = 0; f < 4; f++) etendard(g, f * W + MAT, a * H + PIED, hexa(couleur), f >= 2, f % 2); });
  return c;
}
function etendard(g, x, y, couleur, fleurs, vent) {
  const px = (i, j, c) => { g.fillStyle = c; g.fillRect(x + i, y + j, 1, 1); };
  g.fillStyle = 'rgba(0,0,0,0.28)';                     // l'ombre sur l'herbe
  for (let j = -2; j <= 2; j++) for (let i = -7; i <= 8; i++) if ((i / 7.5) ** 2 + (j / 2.4) ** 2 <= 1) g.fillRect(x + i + 1, y + j, 1, 1);
  for (let j = 0; j < 4; j++) for (let i = -4; i <= 4; i++)   // la pierre où il est planté
    px(i, j - 4, PIERRE[j === 3 || Math.abs(i) === 4 ? 'o' : j === 0 ? 'c' : i > 1 ? 's' : 'm']);
  const haut = -46;
  for (let j = haut; j < -4; j++) { px(-1, j, BOIS.c); px(0, j, BOIS.f); }          // le mât
  for (let i = -8; i <= 8; i++) { px(i, haut + 4, BOIS.c); px(i, haut + 5, BOIS.f); } // la traverse et ses bouts dorés
  for (const i of [-9, 9]) { px(i, haut + 4, OR.c); px(i, haut + 5, OR.m); }
  for (const [i, j, c] of [[-1, -2, 'c'], [0, -2, 'm'], [-1, -1, 'm'], [0, -1, 'f'], [-1, 0, 'f'], [0, 0, 'f'], [-1, 1, 'm'], [0, 1, 'm']]) px(i, haut + j + 1, OR[c]);
  // le drapeau : 15 x 24 sous la traverse, la queue d'aronde en bas ; il ondule un peu au vent
  const clair = rgb(couleur.map((v) => v * 1.25 + 30)), fonce = rgb(couleur.map((v) => v * 0.62)), plein = rgb(couleur);
  for (let k = 0; k < 24; k++) {
    const dec = k > 4 && (Math.floor(k / 6) + vent) % 2 ? 1 : 0, creux = Math.max(0, k - 16);
    for (let i = -7; i <= 7; i++) {
      if (Math.abs(i) < creux) continue;
      const bord = i === -7 || i === 7 || k === 23 || (creux > 0 && Math.abs(i) === creux);
      px(i + dec, haut + 6 + k, bord ? '#281a16' : k < 2 ? OR.m : i <= -5 ? clair : i >= 5 || (dec && i >= 3) ? fonce : plein);
    }
  }
  for (const [i, j] of [[0, 7], [-1, 8], [0, 8], [1, 8], [0, 9], [-2, 8], [2, 8], [0, 6], [0, 10]])   // l'étoile brodée
    px(i + ((Math.floor(j / 6) + vent) % 2 ? 1 : 0), haut + 6 + j, i === 0 && j === 8 ? OR.f : OR.c);
  if (fleurs) {                                          // une gerbe de fleurs posée contre la pierre
    const R = '#dc383c', J = '#fad246', B = '#f4f4fa', V = '#3e8c32', VF = '#246022';
    for (const [i, j, c] of [[-8, -3, R], [-7, -4, J], [-6, -3, B], [-7, -2, R], [-5, -4, R], [-8, -1, V], [-7, -1, VF],
      [-6, -1, V], [-6, -2, VF], [-5, -2, V], [-9, -2, V], [-5, -3, J], [-4, -2, VF]]) px(i, j, c);
  }
}

// --- Lire les missions : les étendards et l'usure des sentiers -------------------------------------------------------
function lire(issues = missions?.etat?.issues ?? []) {
  const maintenant = S.maintenant();
  // les étendards : un par grosse mission rentrée (on en ajoute, on n'en retire que si la mission repart)
  const grosses = grossesMissions(issues);
  for (const e of S.etendards.splice(grosses.length)) { e.sprite.retirer(); collision?.retirer(e.obstacle); }
  grosses.forEach((m, k) => {
    const p = place(k);
    if (!p) return;
    let e = S.etendards[k];
    if (!e) {
      e = { sprite: rendu.sprite(planche, 'etendards', W, H), obstacle: { x: p.x - 4, y: p.y - 4, w: 9, h: 4 }, ...p };
      collision?.ajouter(e.obstacle);
      S.etendards[k] = e;
    }
    const a = LIEUX_AXES.findIndex((x) => x.id === lieuDe(m));
    Object.assign(e, { m, axe: a < 0 ? AXES.length - 1 : a, fleurs: maintenant - Date.parse(m.closed_at) < 3 * JOUR });
  });
  poser();
  // l'usure : le sol n'est redessiné que si elle a changé
  const u = usures(issues, maintenant), cle = JSON.stringify(u);
  if (cle !== S.cle && sol && images) {
    S.cle = cle; S.usure = u;
    composerSol(images, usureDe(u), sol);
    reteindreSol(sol);
    if (solMesh?.material?.map) solMesh.material.map.needsUpdate = true;
    game?.bus.emit('sol:maj');
  }
}

function poser() {
  const f = Math.floor(S.t / VENT) % 2;
  for (const e of S.etendards) if (e.m) e.sprite.poser(e.x - MAT, e.y - PIED, e.y, ((e.fleurs ? 2 : 0) + f) * W, e.axe * H);
}

const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};
const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });
export function texte(m) {
  const qui = (m.assignees ?? []).map((a) => missions?.nomDe?.(a.login) ?? a.login);
  const axe = LIEUX_AXES.find((x) => x.id === lieuDe(m));
  return [`#${m.number} · ${m.title ?? ''}`, `Grosse mission rentrée le ${DATE.format(new Date(m.closed_at))}${qui.length ? ` par ${qui.join(' et ')}` : ''}`, axe ? `Axe : ${axe.axe}` : ''].filter(Boolean);
}
const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function init(g, options) {
  game = g;
  ({ rendu, images, sol, solMesh, missions, heros, collision, visite } = options);
  planche = dessinerPlanche();
  bulle = document.createElement('div');
  bulle.className = 'bulle-perso bulle-etendard'; bulle.hidden = true;
  parler = document.createElement('div');
  parler.className = 'bulle-panneau'; parler.hidden = true;
  parler.innerHTML = '<kbd data-key="KeyE">E</kbd> : lire l’étendard';
  document.body.append(bulle, parler);
  lire();
  game.bus.on('missions:maj', () => lire());
  return api;
}

export function update(dt) {
  S.t += dt;
  poser();
  // E devant un étendard : ce qu'il raconte
  const h = heros?.heros;
  let proche = null;
  if (!visite && h?.controle) for (const e of S.etendards) if (e.m && Math.hypot(h.x - e.x, h.y - e.y) < PRES && (!proche || Math.hypot(h.x - e.x, h.y - e.y) < Math.hypot(h.x - proche.x, h.y - proche.y))) proche = e;
  if (proche !== S.lit) S.parle = 0;
  parler.hidden = !proche || S.parle > 0;
  if (proche) {
    const p = ecran(proche.x, proche.y + 6); parler.style.left = `${p.x}px`; parler.style.top = `${p.y + 24}px`;
    if (S.parle <= 0 && game.input.take('consulter')) { S.parle = BULLE; S.lit = proche; }
  }
  if (!proche) S.lit = null;
  if (S.parle > 0) S.parle -= dt;
  bulle.hidden = !(S.parle > 0 && S.lit);
  if (!bulle.hidden) {
    const [titre, ...lignes] = texte(S.lit.m);
    bulle.innerHTML = `<b>${echapper(titre)}</b>${lignes.map((l) => `<br>${echapper(l)}`).join('')}`;
    const p = ecran(S.lit.x, S.lit.y - 54), m = bulle.offsetWidth / 2 + 12;
    bulle.style.left = `${Math.max(m, Math.min(innerWidth - m, p.x))}px`; bulle.style.top = `${p.y}px`;
  }
}

export function dispose() {
  for (const e of S.etendards) { e.sprite.retirer(); collision?.retirer(e.obstacle); }
  S.etendards = []; bulle?.remove(); parler?.remove();
}

export function selfTest(t) {
  t.group('Le camp garde des traces');
  const jour = Date.parse('2026-10-22T12:00:00Z');
  const m = (n, axe, taille, quand, etat = 'closed') => ({ number: n, title: `Mission ${n}`, state: etat, closed_at: etat === 'closed' ? quand : null, labels: [`axe: ${axe}`, `taille: ${taille}`], assignees: [{ login: 'devmope' }] });
  const issues = [m(1, 'menus', 'L', '2026-10-20T10:00:00Z'), m(2, 'menus', 'M', '2026-10-21T10:00:00Z'), m(3, 'pixel art', 'L', '2026-10-19T10:00:00Z'),
    m(4, 'son', 'S', '2026-10-18T10:00:00Z'), m(5, 'combats', 'L', '2026-09-01T10:00:00Z'), m(6, 'camp', 'L', '2026-10-21T10:00:00Z'), m(7, 'classes', 'L', null, 'open')];
  const u = usures(issues, jour);
  t.ok(u.interface === 3 && u.art === 3 && u.son === 0 && u.combat === 0 && u['*'] === 3,
    'les sentiers : très usé vers le lieu le plus actif des 14 derniers jours, l’herbe reprend là où personne ne va (le vieux travail ne compte plus)');
  t.ok(Object.values(usures([], jour)).every((v) => v === 1), 'personne n’a travaillé : les sentiers restent comme ils sont');
  t.eq(grossesMissions(issues).map((i) => i.number), [5, 3, 1, 6], 'un étendard par grosse mission rentrée, le plus ancien d’abord (pas les M, ni les L en cours)');
  t.ok(place(2).x < place(0).x && place(3).x > place(1).x && place(1).x > place(0).x && place(0).y === place(1).y && place(24).y !== place(0).y && place(72) === null,
    'les étendards : à gauche puis à droite de la route, en s’éloignant de la porte, rang après rang');
  // le sol : moins de terre là où personne ne va, plus là où on va tout le temps (et jamais dans l'emprise d'un lieu)
  const canvas = (u0) => { const c = composerSol(images, () => u0); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  const terre = (p) => { let n = 0; for (let i = 0; i < p.length; i += 16) if (p[i] > p[i + 1] + 10 && p[i + 1] > p[i + 2]) n++; return n; };
  if (images?.herbe && images?.terre) {
    const [t0, t1, t3] = [canvas(0), canvas(1), canvas(3)].map(terre);
    t.ok(t0 < t1 && t1 < t3, `le sol : l’herbe reprend sur un sentier oublié (${t0} < ${t1}), un sentier très usé déborde (${t3})`);
  }
  // les étendards dans le camp, et E devant l'un d'eux
  const avant = { maintenant: S.maintenant };
  S.maintenant = () => jour;
  lire(issues); update(0);
  t.ok(S.etendards.length === 4 && S.etendards.every((e) => e.sprite.mesh.visible) && S.etendards.filter((e) => e.fleurs).map((e) => e.m.number).join() === '1,6',
    'quatre étendards plantés ; ceux des trois derniers jours ont des fleurs');
  t.ok(collision ? collision.bloque(S.etendards[0].x, S.etendards[0].y - 2) : true, 'on ne passe pas à travers le pied d’un étendard');
  if (heros && !visite) {
    const h = heros.heros, avantH = { x: h.x, y: h.y }, e = S.etendards[1];
    heros.placer(e.x, e.y + 14, 'haut'); update(0);
    t.ok(!parler.hidden, 'devant un étendard : « E : lire l’étendard »');
    S.parle = BULLE; S.lit = e; update(0.1);
    t.ok(!bulle.hidden && bulle.textContent.includes('#3') && bulle.textContent.includes('Pixel art'), `E : « ${bulle.textContent} »`);
    heros.placer(avantH.x, avantH.y, 'bas'); update(0.1);
    t.ok(bulle.hidden && parler.hidden, 'on s’éloigne : la bulle s’efface');
  }
  S.maintenant = avant.maintenant;
  lire(); update(0);
}

export const api = {
  usures, grossesMissions, place, texte,
  get usure() { return S.usure ? { ...S.usure } : null; },
  get etendards() { return S.etendards.filter((e) => e.m).map((e) => e.m.number); },
};
