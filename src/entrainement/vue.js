// Ce qu'on voit du terrain d'entraînement : les personnages LPC animés, les taches des surfaces (dessinées sans cases,
// au pixel près), les marques de jeu (où l'on peut marcher, le chemin et sa longueur, la portée, les cibles, les zones),
// la caméra (molette : zoom fin et animé, clic droit glissé : déplacer la vue), et la file des événements du combat, jouée dans
// l'ordre : une marche, une attaque et son d20 en grand (la remarque de la partie D1), des dégâts, un KO…
// Les barres de vie sous les pieds, sans cadre ni nom, et dessous les icônes des états (buffs et debuffs, avec les tours
// qui restent : etats.js) ; le détail est dans la carte de survol. V cache ou montre les barres des ennemis, Maj+V celles
// des alliés (gardé dans ce navigateur) ; les icônes des états restent toujours visibles.
// Les effets des capacités (projectiles, impacts, foudre, soins) et les états en boucle sur les créatures : effets.js (#134).
import * as THREE from 'three';
import { T } from '../01_plan.js';
import PERSOS from './persos.json';
import { CONTACT } from './geometrie.js';
import { creerEffets, effetsAttaque, effetsLance, ETATS } from './effets.js';
import { etatsActifs } from './etats.js';

export const name = 'vue';
export const always = true;

const DIR = { haut: 0, gauche: 1, bas: 2, droite: 3 };
// Les rangées LPC (64 px) et leur nombre d'images : sort, estoc, marche, taille, tir, blessé, repos.
const ANIM = { sort: [0, 7], estoc: [4, 8], marche: [8, 9], attaque: [12, 6], tir: [16, 13], blesse: [20, 6], repos: [22, 2] };
const VITESSE_MARCHE = 5 * T;          // 5 cases par seconde à l'écran (le temps réel du jeu, pas la règle)
const COULEURS = {
  eau: [[46, 120, 196], [70, 150, 220], [148, 206, 244], [24, 78, 140]],
  huile: [[44, 30, 18], [62, 44, 26], [120, 96, 60], [20, 12, 6]],
  glace: [[176, 222, 240], [206, 238, 250], [255, 255, 255], [96, 150, 186]],
  feu: [[214, 80, 22], [244, 136, 30], [255, 220, 90], [130, 36, 14]],
  // les pièges du Traqueur : le fer des mâchoires, l'ambre de la glu, la corde du collet
  'piege-machoires': [[92, 92, 98], [120, 120, 128], [200, 200, 210], [40, 40, 46]],
  'piege-glu': [[176, 128, 40], [200, 156, 60], [240, 210, 120], [100, 70, 20]],
  'piege-collet': [[150, 110, 60], [176, 136, 80], [220, 190, 130], [80, 56, 26]],
};
// Le limier du Traqueur (public/assets/lpc/compagnons/limier.png, comme au camp) : une créature du combat (regles.js,
// FAMILIERS), dessinée avec sa planche ; il court à la cible d'un ordre et revient ; à terre, il est terni.
const LIGNES_CHIEN = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const VITESSE_CHIEN = 9 * T;
const NOM_PIEGE = { machoires: 'Mâchoires !', glu: 'Glu !', collet: 'Collet !' };

let game, rendu, images, combat, salle, canvas;
const aff = new Map();                 // ce que la vue montre de chaque créature (ça suit la file, pas l'état final)
const tonneaux = new Map();
let enclume = null;                    // l'enclume de Baba Brisenclume : { x, y, s, cache, haut }, posée par l'événement « enclume »
const ENCLUME = { sx: 13 * 32, sy: 23 * 32 };   // l'enclume sur sa souche, dans la planche des décorations (comme au camp, 40_forgeron.js)
let fondSurfaces, ctxSurfaces, texSurfaces, fondMarques, ctxMarques, texMarques;
let file = [], courant = null, ecouteurs = [];
let temps = 0, prochainFeu = 0;
let fx = null, etatsVus = new Map();   // les effets joués, et les états montrés (relus quand la file est vide)
let etatsPlaques = new Map();         // id → les états sous sa barre (etats.js), relus aussi quand la file est vide
export const effets = () => fx;
// La caméra : son centre (cx, cy), l'échelle affichée (s) qui glisse vers celle des crans (base × 2^(crans/4), #122),
// le point de l'écran qui reste sous la souris pendant le zoom (ancre), la molette pas encore comptée (des petits pas).
const cam = { s: 2, base: 2, crans: 0, ancre: null, molette: 0, cx: 0, cy: 0, cible: null, glisse: null };
const CRANS = 4, MOLETTE = 100, ZOOM_MAX = 5, DOUCEUR_ZOOM = 12;
let marques = {};                      // ce que l'interface demande de montrer (voir dessinerMarques)
// (une clé neuve : les barres sont maintenant montrées par défaut, sous les pieds ; l'ancien choix « cachées » ne compte plus)
const CLE_PLAQUES = 'dungeoncoop:barres-terrain';
const plaques = { e: true, h: true }; // les barres de vie montrées : des ennemis (e), des alliés (h)
let calquePlaques = null;

export function init(g, options) {
  game = g;
  ({ rendu, images, combat, salle, canvas } = options);
  const W = salle.l * T, H = salle.h * T;

  // deux calques à plat au-dessus du sol : les surfaces, puis les marques de jeu
  const plan = (z, nom) => {
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;   // (pas d'espace de couleurs : 04_rendu.js)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(W / 2, -H / 2, z); m.name = nom;
    rendu.scene.add(m);
    return [c, c.getContext('2d'), tex];
  };
  [fondSurfaces, ctxSurfaces, texSurfaces] = plan(-90, 'surfaces');
  [fondMarques, ctxMarques, texMarques] = plan(-80, 'marques');
  calquePlaques = Object.assign(document.createElement('div'), { className: 'plaques-terrain' });
  calquePlaques.setAttribute('aria-hidden', 'true');
  document.body.append(calquePlaques);
  try { const lu = JSON.parse(localStorage.getItem(CLE_PLAQUES)); if (lu) { plaques.e = !!lu.e; plaques.h = !!lu.h; } } catch {}

  fx = creerEffets(rendu, images);
  peupler();

  // la caméra : molette (zoom fin et animé, sous la souris), clic droit glissé (déplacer la vue)
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.ancre = { x: e.clientX, y: e.clientY };
    cam.cible = null;   // (comme le clic droit glissé : le joueur reprend la vue, elle ne file plus vers le dernier qui a agi)
    cam.molette += e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
  }, { passive: false });
  canvas.addEventListener('pointerdown', (e) => { if (e.button === 2 || e.button === 1) { cam.glisse = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy }; cam.cible = null; } });
  window.addEventListener('pointermove', (e) => {
    if (!cam.glisse) return;
    const r = canvas.getBoundingClientRect(), f = rendu.vue.w / r.width;
    cam.cx = cam.glisse.cx - (e.clientX - cam.glisse.x) * f; cam.cy = cam.glisse.cy - (e.clientY - cam.glisse.y) * f;
  });
  window.addEventListener('pointerup', () => { cam.glisse = null; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => ajusterCamera());
  cam.cx = W / 2; cam.cy = H / 2;
  ajusterCamera(true);
  redessinerSurfaces();
  return api;
}

// Les personnages et les tonneaux du combat, en sprites LPC.
function peupler() {
  for (const u of combat.S.unites) {
    const chien = u.type === 'limier';
    const img = chien ? images.limier : images[`perso_${u.type === 'brt' ? 'brute-ennemie' : u.type}`];
    const meta = chien ? { attaque: null } : PERSOS[u.type === 'brt' ? 'brute-ennemie' : u.type];
    const nomTex = `perso-${u.type}`;
    const s64 = rendu.sprite(img, nomTex, 64, 64);
    const grand = meta.attaque ? rendu.sprite(img, nomTex, meta.attaque.taille, meta.attaque.taille) : null;
    grand?.cacher(true);
    aff.set(u.id, {
      id: u.id, type: u.type, camp: u.camp, x: u.x * T, y: u.y * T, dir: u.camp === 'h' ? 'droite' : 'gauche', anim: 'repos', t: Math.random(),
      pv: u.pv, ko: u.ko, mort: u.mort, cache: false, enfonce: 0, s64, grand, meta, ombre: rendu.ombre(20, 5),
      pvMax: u.pvMax, plaque: creerPlaque(u), chien,
    });
  }
  for (const b of combat.S.tonneaux) tonneaux.set(b.id, { x: b.x * T, y: b.y * T, s: rendu.sprite(images.tonneau, 'tonneau', 32, 64), cache: false });
  const e = combat.S.enclume;
  enclume = { x: (e?.x ?? 0) * T, y: (e?.y ?? 0) * T, s: rendu.sprite(images.deco, 'deco', 32, 32), ombre: rendu.ombre(26, 7), cache: !e, haut: 0 };
}

// Un autre combat (une autre équipe, choisie à l'accueil ou dans le lobby) : on retire tout et on recommence, sans recharger.
export function remplacer(nouveau) {
  for (const a of aff.values()) { a.s64.retirer(); a.grand?.retirer(); a.ombre.retirer(); a.plaque.el.remove(); }
  for (const b of tonneaux.values()) b.s.retirer();
  enclume?.s.retirer(); enclume?.ombre.retirer();
  aff.clear(); tonneaux.clear(); file = []; courant = null; fx.vider(); etatsVus = new Map(); etatsPlaques = new Map();
  combat = nouveau;
  peupler();
  redessinerSurfaces();
  dessinerMarques({});
}

// --- La caméra -------------------------------------------------------------------------------------------------
function echelleDeBase() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
  const f = Math.min((r.width * dpr) / (salle.l * T), (r.height * dpr) / (salle.h * T));
  return Math.max(1, Math.floor(f + 0.35));       // presque tout le terrain, au pixel entier (on fait défiler le reste)
}
const echelleDe = (n) => Math.max(1, Math.min(ZOOM_MAX, cam.base * 2 ** (n / CRANS)));
const bornesCrans = () => [Math.floor(CRANS * Math.log2(1 / cam.base)), Math.ceil(CRANS * Math.log2(ZOOM_MAX / cam.base))];
// La taille de l'écran a changé (ou le début) : l'échelle de base suit l'écran ; on garde ses crans.
function ajusterCamera(premiere = false) {
  cam.base = echelleDeBase();
  if (premiere) cam.crans = 0;
  const [min, max] = bornesCrans();
  cam.crans = Math.max(min, Math.min(max, cam.crans));
  cam.s = echelleDe(cam.crans);
  rendu.ajuster({ echelle: cam.s });
}
// Un cran de zoom (+1 : plus près), sous le point (cx, cy) de l'écran s'il est donné. Le but change tout de suite ;
// l'image y glisse (glisserZoom, à chaque image).
function zoomer(sens, cx, cy) {
  const [min, max] = bornesCrans();
  cam.crans = Math.max(min, Math.min(max, cam.crans + sens));
  cam.ancre = cx != null ? { x: cx, y: cy } : null;
}
function glisserZoom(dt) {
  while (Math.abs(cam.molette) >= MOLETTE) { zoomer(cam.molette < 0 ? 1 : -1, cam.ancre?.x, cam.ancre?.y); cam.molette -= Math.sign(cam.molette) * MOLETTE; }
  const but = echelleDe(cam.crans);
  if (cam.s === but) return;
  let e = Math.exp(Math.log(cam.s) + (Math.log(but) - Math.log(cam.s)) * (1 - Math.exp(-DOUCEUR_ZOOM * dt)));
  if (Math.abs(Math.log(but / e)) < 0.003) e = but;
  const avant = cam.ancre ? rendu.versMonde(cam.ancre.x, cam.ancre.y) : null;
  cam.s = e;
  rendu.ajuster({ echelle: e });
  if (avant) {
    // le point sous la souris y reste : on recale le centre de la vue
    rendu.viser(cam.cx - rendu.vue.w / 2, cam.cy - rendu.vue.h / 2);
    const apres = rendu.versMonde(cam.ancre.x, cam.ancre.y);
    cam.cx += avant.x - apres.x; cam.cy += avant.y - apres.y;
  }
}
function bornerCamera() {
  const W = salle.l * T, H = salle.h * T, vw = rendu.vue.w, vh = rendu.vue.h;
  cam.cx = vw >= W ? W / 2 : Math.min(W - vw / 2, Math.max(vw / 2, cam.cx));
  cam.cy = vh >= H ? H / 2 : Math.min(H - vh / 2, Math.max(vh / 2, cam.cy));
}
export function viser(x, y) { cam.cible = { x, y }; }

// --- Les surfaces : des taches au pixel près (une maille de surface = 16 px), contour plus sombre -----------------
function redessinerSurfaces(flammes = 0) {
  const W = fondSurfaces.width, H = fondSurfaces.height, M = combat.MAILLE * T;
  const img = ctxSurfaces.createImageData(W, H), p = img.data;
  const type = new Uint8Array(W * H), TYPES = ['', 'eau', 'huile', 'glace', 'feu', 'piege-machoires', 'piege-glu', 'piege-collet'];
  const r = M * 0.72;
  for (const [k, s] of Object.entries(combat.mailles())) {
    const [i, j] = k.split(',').map(Number), cx = (i + 0.5) * M, cy = (j + 0.5) * M, n = TYPES.indexOf(s.t === 'piege' ? `piege-${s.v}` : s.t);
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      // un bord un peu irrégulier, toujours pareil au même endroit
      const bruit = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 7 / 7;
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r - 1.5 + bruit * 3) type[y * W + x] = n;
    }
  }
  const graine = Math.floor(flammes * 8);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = type[y * W + x]; if (!n) continue;
    const c = COULEURS[TYPES[n]];
    const bord = x === 0 || y === 0 || x === W - 1 || y === H - 1 || type[y * W + x - 1] !== n || type[y * W + x + 1] !== n || type[(y - 1) * W + x] !== n || type[(y + 1) * W + x] !== n;
    const h = (((x * 2654435761) ^ (y * 40503) ^ (n === 4 ? graine * 977 : 0)) >>> 0) % 100;
    let col = c[0], a = n === 2 ? 215 : n === 4 ? 225 : 170;
    if (bord) { col = c[3]; a = 235; }
    else if (n === 4) col = h < 18 ? c[2] : h < 55 ? c[1] : c[0];
    else if (h < 4) col = c[2]; else if (h < 30 && (x + y) % 2) col = c[1];
    const k = (y * W + x) * 4;
    p[k] = col[0]; p[k + 1] = col[1]; p[k + 2] = col[2]; p[k + 3] = a;
  }
  ctxSurfaces.putImageData(img, 0, 0);
  texSurfaces.needsUpdate = true;
}
const feuPresent = () => Object.values(combat.mailles()).some((s) => s.t === 'feu');

// --- Les marques de jeu ----------------------------------------------------------------------------------------
// marques = { selection: id, portee: carte|null, mv, chemin: [pts], survolCible: id, cibles: [ids], cercle: {x,y,r}, zone: {x,y,r,surf}, menace: {x,y,r}, actif: id }
export function dessinerMarques(m = marques) {
  marques = m;
  const g = ctxMarques, W = fondMarques.width, H = fondMarques.height;
  g.clearRect(0, 0, W, H);
  if (m.portee) {
    // la zone atteignable : un remplissage léger et un liseré clair, sans cases (on interpole la trame des chemins)
    const tr = m.portee.tr, P = 0.25 * T, nx = tr.nx, ny = tr.ny, L = m.portee.longueur, mv = m.mv;
    const ok = (i, j) => (i >= 0 && j >= 0 && i < nx && j < ny && L[j * nx + i] <= mv ? 1 : 0);
    const img = g.createImageData(W, H), px = img.data, dedans = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const fy = y / P - 0.5, j = Math.floor(fy), ty = fy - j;
      for (let x = 0; x < W; x++) {
        const fx = x / P - 0.5, i = Math.floor(fx), tx = fx - i;
        const v = ok(i, j) * (1 - tx) * (1 - ty) + ok(i + 1, j) * tx * (1 - ty) + ok(i, j + 1) * (1 - tx) * ty + ok(i + 1, j + 1) * tx * ty;
        if (v >= 0.5) dedans[y * W + x] = 1;
      }
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!dedans[y * W + x]) continue;
      const bord = !dedans[y * W + x - 1] || !dedans[y * W + x + 1] || !dedans[(y - 1) * W + x] || !dedans[(y + 1) * W + x];
      const k = (y * W + x) * 4;
      if (bord) { px[k] = 255; px[k + 1] = 236; px[k + 2] = 170; px[k + 3] = 230; }
      else if ((x + y) % 4 === 0) { px[k] = 255; px[k + 1] = 245; px[k + 2] = 210; px[k + 3] = 70; }
    }
    g.putImageData(img, 0, 0);
  }
  const anneau = (id, couleur, epais = 2) => {
    const a = aff.get(id) ?? tonneaux.get(id) ?? (id === 'enclume' && !enclume?.cache ? enclume : null); if (!a) return;
    g.strokeStyle = couleur; g.lineWidth = epais; g.beginPath(); g.ellipse(a.x, a.y - 1, 15, 7, 0, 0, Math.PI * 2); g.stroke();
  };
  for (const id of m.cibles ?? []) anneau(id, 'rgba(255, 214, 90, 0.9)');
  if (m.survolCible) anneau(m.survolCible, '#ffffff', 3);
  if (m.selection) anneau(m.selection, '#7ce0ff', 3);
  if (m.actif) anneau(m.actif, '#ff6a50', 3);
  if (m.cercle) {           // la portée de la capacité choisie
    g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255, 240, 200, 0.8)'; g.lineWidth = 2;
    g.beginPath(); g.arc(m.cercle.x * T, m.cercle.y * T, m.cercle.r * T, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  }
  if (m.zone) {
    const c = COULEURS[m.zone.surf]?.[1] ?? [255, 255, 255];
    g.fillStyle = `rgba(${c.join(',')}, 0.35)`; g.strokeStyle = m.zone.ok === false ? '#ff5a4a' : `rgb(${c.join(',')})`; g.lineWidth = 2;
    g.beginPath(); g.arc(m.zone.x * T, m.zone.y * T, m.zone.r * T, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  if (m.menace) {
    g.fillStyle = 'rgba(220, 40, 30, 0.35)'; g.strokeStyle = '#ff3a2a'; g.lineWidth = 3;
    g.beginPath(); g.arc(m.menace.x * T, m.menace.y * T, m.menace.r * T, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  if (m.chemin?.length) {
    const h = aff.get(m.selection);
    g.strokeStyle = m.cheminOk === false ? 'rgba(255, 90, 74, 0.9)' : m.cheminDanger ? 'rgba(255, 110, 60, 1)' : 'rgba(255, 255, 255, 0.95)'; g.lineWidth = 2; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(h.x, h.y);
    for (const p of m.chemin) g.lineTo(p.x * T, p.y * T);
    g.stroke(); g.setLineDash([]);
    const f = m.chemin[m.chemin.length - 1];
    g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(f.x * T, f.y * T, 4, 0, Math.PI * 2); g.fill();
  }
  texMarques.needsUpdate = true;
}

// --- La file des événements ------------------------------------------------------------------------------------
export function jouer(evenements) { file.push(...evenements); }
export const occupe = () => !!courant || file.length > 0;
export function surEvenement(f) { ecouteurs.push(f); }
const versDir = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'gauche' : 'droite') : (dy < 0 ? 'haut' : 'bas'));
const tourner = (a, b) => { if (a && b && (Math.abs(b.x - a.x) > 1 || Math.abs(b.y - a.y) > 1)) a.dir = versDir(b.x - a.x, b.y - a.y); };

// Chaque événement devient une petite scène : { duree, maj(t), fin() } (sa durée en secondes ; 0 = tout de suite).
function scene(e) {
  const a = e.id ? aff.get(e.id) : null;
  switch (e.type) {
    case 'marche': {
      const pts = e.chemin.map((p) => ({ x: p.x * T, y: p.y * T }));
      const segs = []; let tot = 0, prec = { x: a.x, y: a.y };
      for (const p of pts) { const l = Math.hypot(p.x - prec.x, p.y - prec.y); segs.push({ a: prec, b: p, l, d: tot }); tot += l; prec = p; }
      viser(a.x, a.y);
      return { duree: tot / VITESSE_MARCHE, maj(t) {
        const d = Math.min(tot, t * VITESSE_MARCHE), s = segs.find((x) => d <= x.d + x.l) ?? segs[segs.length - 1];
        if (!s) return;
        const k = s.l ? (d - s.d) / s.l : 1;
        a.x = s.a.x + (s.b.x - s.a.x) * k; a.y = s.a.y + (s.b.y - s.a.y) * k;
        a.dir = versDir(s.b.x - s.a.x, s.b.y - s.a.y); a.anim = 'marche'; viser(a.x, a.y);
      }, fin() { a.anim = 'repos'; } };
    }
    case 'poussee': {
      const cible = e.tonneau ? tonneaux.get(e.id) : a, dep = { x: cible.x, y: cible.y };
      const pts = e.chemin.map((p) => ({ x: p.x * T, y: p.y * T })), fin = pts[pts.length - 1] ?? dep;
      const duree = Math.min(0.6, 0.12 + Math.hypot(fin.x - dep.x, fin.y - dep.y) / (12 * T));
      fx.jouer('poussiere', { x: dep.x, y: dep.y }); fx.jouer('poussiere', { x: fin.x, y: fin.y, retard: duree });
      return { duree, maj(t, k) {
        cible.x = dep.x + (fin.x - dep.x) * k; cible.y = dep.y + (fin.y - dep.y) * k; if (!e.tonneau) a.anim = 'blesse';
      }, fin() { if (!e.tonneau) a.anim = 'repos'; } };
    }
    case 'attaque': case 'lance': {
      const att = aff.get(e.type === 'attaque' ? e.de : e.id), cible = e.type === 'attaque' ? aff.get(e.vers) : { x: e.x * T, y: e.y * T };
      tourner(att, cible);
      att.anim = e.anim ?? 'attaque'; att.t = 0;
      viser((att.x + cible.x) / 2, (att.y + cible.y) / 2);
      if (e.type === 'attaque') pourEcouteurs({ ...e, type: 'de' });
      // l'effet de la capacité : la scène dure jusqu'à ce que le coup arrive (les dégâts s'affichent après)
      const genre = att.camp === 'e' ? (e.anim === 'tir' ? 'tir' : ['brt', 'chef'].includes(att.type) ? 'lourd' : 'taille') : null;
      const d = e.type === 'attaque' ? effetsAttaque(fx, e.cap, att, cible, genre) : effetsLance(fx, e.cap, att, cible, e.cap === 'fioleCible' ? cible : null);
      return { duree: Math.max(e.type === 'attaque' ? 0.6 : 0.45, d), maj() {}, fin() { att.anim = 'repos'; } };
    }
    case 'degats': {
      a.pv = e.pv; a.anim = a.ko || a.mort ? a.anim : 'blesse'; a.t = 0;
      flottant(a, `−${e.n}`, 'degats');
      return { duree: 0.32, maj() {}, fin() { if (!a.ko && !a.mort) a.anim = 'repos'; } };
    }
    case 'soin':
      a.pv = e.pv; flottant(a, `+${e.n}`, 'soin');
      fx.jouer('croix-soin', { x: a.x, y: a.y });
      if (e.potion) { fx.jouer('bulles-potion', { x: a.x, y: a.y }); fx.jouer('coeur', { x: a.x, y: a.y - 50, duree: 0.8 }); }
      return { duree: 0.3 };
    case 'ko': a.anim = 'tombe'; a.t = 0; if (a.camp === 'h') a.ko = true; else a.mort = true; return { duree: 0.55 };
    case 'ranime':
      a.ko = false; a.pv = e.pv; a.anim = 'repos'; flottant(a, '+25', 'soin');
      fx.jouer('colonne-doree', { x: a.x, y: a.y }); fx.jouer('croix-soin', { x: a.x, y: a.y, retard: 0.2 });
      return { duree: 0.5 };
    case 'releve': flottant(a, 'debout', 'info'); return { duree: 0.15 };
    case 'chute': return { duree: 0.45, maj(t, k) { a.enfonce = k; }, fin() { if (a.mort || combat.U(a.id)?.mort) a.cache = true; a.enfonce = 0; } };
    case 'place': a.x = e.x * T; a.y = e.y * T; return { duree: 0.1 };
    // le Pas dans l’ombre de Shadow : il s’enfonce dans son ombre, et en ressort derrière la cible
    // (l'esquisse : design/classes/shadow/captures/pas-ombre.gif ; les briques « flaque-ombre », « fumee-ombre », « ombre-file »,
    // « chevrons-tenaille »). Il s'enfonce dans sa flaque, son ombre file au ras du sol jusque derrière la cible, il remonte
    // d'une flaque qui s'ouvre là-bas, tourné vers elle ; deux chevrons clignent autour d'elle : elle est prise entre deux.
    case 'ombre': {
      const dep = { x: a.x, y: a.y }, p = { x: e.x * T, y: e.y * T }, c = aff.get(e.cible) ?? p;
      const PLONGE = 0.4, vol = Math.min(0.5, 0.18 + Math.hypot(p.x - dep.x, p.y - dep.y) / (14 * T)), MONTE = 0.45, arrive = PLONGE + vol;
      fx.jouer('ombre-file', { x: dep.x, y: dep.y, vers: p, retard: PLONGE, duree: vol, miroir: p.x < dep.x });
      fx.jouer('flaque-ombre', { x: p.x, y: p.y, retard: arrive - 0.2 });
      fx.jouer('fumee-ombre', { x: p.x, y: p.y, retard: arrive });
      fx.jouer('chevrons-tenaille', { x: c.x, y: c.y - 58, retard: arrive + MONTE });
      let passe = false;
      return { duree: arrive + MONTE, maj(t) {
        if (t < PLONGE) { a.plonge = t / PLONGE; a.cache = a.plonge > 0.95; return; }
        if (t < arrive) { a.cache = true; return; }
        if (!passe) { passe = true; a.x = p.x; a.y = p.y; tourner(a, c); }
        a.cache = false; a.plonge = Math.max(0, 1 - (t - arrive) / MONTE);
      }, fin() { a.x = p.x; a.y = p.y; a.plonge = 0; a.cache = false; tourner(a, c); } };
    }
    // l'enclume de Baba : elle tombe du ciel (la Chute d'Enclume), ou glisse vers lui (les Tenailles)
    case 'enclume': {
      const p = { x: e.x * T, y: e.y * T };
      if (e.chute) {
        Object.assign(enclume, { x: p.x, y: p.y, cache: false, haut: 170 });
        viser(p.x, p.y);
        return { duree: 0.42, maj(t, k) { enclume.haut = 170 * (1 - k * k); }, fin() {
          enclume.haut = 0; fx.jouer('impact-lourd', { x: p.x, y: p.y }); fx.jouer('poussiere', { x: p.x, y: p.y }); fx.jouer('poussiere', { x: p.x + 10, y: p.y + 2, retard: 0.08 });
        } };
      }
      const dep = { x: enclume.x, y: enclume.y };
      fx.jouer('poussiere', { x: dep.x, y: dep.y });
      return { duree: 0.35, maj(t, k) { enclume.x = dep.x + (p.x - dep.x) * k; enclume.y = dep.y + (p.y - dep.y) * k; }, fin() { enclume.x = p.x; enclume.y = p.y; } };
    }
    case 'forge': { const c = aff.get(e.vers); if (c) fx.jouer(e.forge === 'lame' ? 'impact-feu' : 'impact-dore', { x: c.x, y: c.y - 24, retard: 0.05 }); return { duree: 0.25 }; }
    case 'tonneau': { const b = tonneaux.get(e.id); if (b) { b.cache = true; flottant(b, 'Huile !', 'info'); fx.jouer('verre-brise', { x: b.x, y: b.y }); fx.jouer('impact-lourd', { x: b.x, y: b.y }); } return { duree: 0.25 }; }
    case 'surfaces': redessinerSurfaces(temps); return { duree: 0.05 };
    case 'piege': flottant(a, NOM_PIEGE[e.v] ?? 'Piège !', 'info'); fx.jouer('poussiere', { x: a.x, y: a.y }); fx.jouer('impact-lourd', { x: a.x, y: a.y }); return { duree: 0.35 };
    case 'limier': {
      // le limier court au contact de la cible d'un ordre, puis revient à sa place (à côté de son maître)
      const c = a; if (!c) return { duree: 0 };
      const u = combat.U(e.id), b = e.vers ? aff.get(e.vers) : null, dep = { x: c.x, y: c.y };
      const fin = b ? { x: b.x + (c.x < b.x ? -24 : 24), y: b.y + 4 } : { x: u.x * T, y: u.y * T };
      const duree = Math.min(0.7, Math.max(0.15, Math.hypot(fin.x - dep.x, fin.y - dep.y) / VITESSE_CHIEN));
      if (b) viser((dep.x + b.x) / 2, (dep.y + b.y) / 2);
      return { duree, maj(t, k) {
        c.x = dep.x + (fin.x - dep.x) * k; c.y = dep.y + (fin.y - dep.y) * k; c.anim = 'marche';
        if (Math.abs(fin.x - dep.x) + Math.abs(fin.y - dep.y) > 1) c.dir = versDir(fin.x - dep.x, fin.y - dep.y);
      }, fin() { c.anim = 'repos'; if (b) c.dir = versDir(b.x - c.x, b.y - c.y); } };
    }
    case 'zone': marques.zone = { x: e.x, y: e.y, r: e.r, surf: e.surf }; dessinerMarques(); return { duree: 0.35, fin() { marques.zone = null; dessinerMarques(); } };
    case 'menace': marques.menace = { x: e.x, y: e.y, r: e.r }; dessinerMarques(); viser(e.x * T, e.y * T); return { duree: 0.85, fin() { marques.menace = null; dessinerMarques(); } };
    case 'eclair': pourEcouteurs(e); return { duree: 0.35 };
    case 'flottant': case 'texte': flottant(a, e.texte, e.genre ?? 'info'); return { duree: 0.2 };
    case 'de': pourEcouteurs({ type: 'de', jets: [e.k], k: e.k, mod: null, resultat: e.k <= (e.seuil ?? 9) ? 'glisse' : 'tient', de: e.id, glace: true }); return { duree: 0.5 };
    case 'agit': marques.actif = e.id; dessinerMarques(); viser(a.x, a.y); return { duree: 0.25 };
    default: pourEcouteurs(e); return { duree: e.type === 'combo' ? 0.7 : 0 };
  }
}
function pourEcouteurs(e) { for (const f of ecouteurs) f(e); }

// --- Les textes qui montent (dégâts, soins, « Raté ! ») ----------------------------------------------------------
const flottants = [];
function flottant(a, texte, genre) {
  if (!a) return;
  const el = Object.assign(document.createElement('div'), { className: `flottant ${genre}`, textContent: texte });
  document.body.append(el);
  flottants.push({ el, x: a.x, y: a.y - 58, t: 0 });   // (au-dessus de la tête ; la barre de vie est sous les pieds)
}
export function versEcran(x, y) {
  const r = canvas.getBoundingClientRect();
  return { x: r.left + ((x - rendu.cam.x) / rendu.vue.w) * r.width, y: r.top + ((y - rendu.cam.y) / rendu.vue.h) * r.height };
}

// --- Les barres de vie ------------------------------------------------------------------------------------------
// Une barre : la jauge (les PV écrits dedans), et dessous une rangée d'icônes d'états. Pas de cadre, pas de nom.
function creerPlaque(u) {
  const el = Object.assign(document.createElement('div'), { className: `plaque-vie ${u.camp === 'h' ? 'allie' : 'ennemi'}`, hidden: true });
  const barre = Object.assign(document.createElement('span'), { className: 'pv-barre' }), plein = Object.assign(document.createElement('span'), { className: 'pv-plein' });
  const chiffre = Object.assign(document.createElement('span'), { className: 'pv-chiffre' });
  const etats = Object.assign(document.createElement('span'), { className: 'pv-etats' });
  barre.append(plein, chiffre);
  el.append(barre, etats);
  el.dataset.id = u.id;
  calquePlaques.append(el);
  return { el, barre, plein, chiffre, etats, pv: null, ko: null, cle: '' };
}
const plaqueVisible = (a) => plaques[a.camp] && !a.cache && !a.mort;
// Une icône d'état : à l'échelle entière du pixel art (×2 de près, ×1 de loin), les tours qui restent en bas à droite.
function iconeEtat(e) {
  const box = Object.assign(document.createElement('span'), { className: `etat-icone ${e.genre}` });
  box.dataset.etat = e.id;
  const img = Object.assign(document.createElement('img'), { src: e.src, alt: '' });
  img.addEventListener('load', () => { img.style.setProperty('--w', img.naturalWidth); img.style.setProperty('--h', img.naturalHeight); });
  box.append(img);
  if (e.n != null) box.append(Object.assign(document.createElement('b'), { textContent: e.n }));
  return box;
}
function poserPlaque(a) {
  const p = a.plaque, etats = a.cache || a.mort ? [] : etatsPlaques.get(a.id) ?? [];
  const barre = plaqueVisible(a), voir = barre || etats.length > 0;
  if (p.el.hidden === voir) p.el.hidden = !voir;
  if (!voir) return;
  if (p.barre.hidden === barre) p.barre.hidden = !barre;
  if (p.pv !== a.pv || p.ko !== a.ko) {
    p.pv = a.pv; p.ko = a.ko;
    const k = Math.max(0, Math.min(1, a.pv / a.pvMax));
    p.plein.style.width = `${Math.round(k * 100)}%`;
    p.el.classList.toggle('bas', k <= 0.3);
    p.el.classList.toggle('ko', a.ko);
    p.chiffre.textContent = a.ko ? 'KO' : `${Math.max(0, a.pv)}/${a.pvMax}`;
  }
  const cle = etats.map((e) => `${e.id}${e.n ?? ''}`).join(',');
  if (cle !== p.cle) { p.cle = cle; p.etats.replaceChildren(...etats.map(iconeEtat)); }
  // sous les pieds, au-delà de l'ombre ; de près (zoom 2 et plus) les icônes ×2 et les PV écrits dans la barre
  p.el.classList.toggle('pres', cam.s >= 2);
  const e = versEcran(a.x, a.y + 2);
  p.el.style.transform = `translate(${Math.round(e.x)}px, ${Math.round(e.y)}px) translate(-50%, 0)`;
}
// V, Maj+V (l'interface) : montrer ou cacher les barres d'un camp ; ce navigateur s'en souvient.
export function basculerPlaques(camp, oui = !plaques[camp]) {
  plaques[camp] = !!oui;
  try { localStorage.setItem(CLE_PLAQUES, JSON.stringify(plaques)); } catch {}
  return plaques[camp];
}

// --- Chaque image ----------------------------------------------------------------------------------------------
export function update(dt) {
  temps += dt;
  // la file
  if (!courant && file.length) {
    const e = file.shift(), s = scene(e) ?? { duree: 0 };
    courant = { e, s, t: 0 };
    if (!s.duree) { s.maj?.(0, 1); s.fin?.(); courant = null; }
  }
  if (courant) {
    courant.t += dt;
    const k = Math.min(1, courant.t / courant.s.duree);
    courant.s.maj?.(courant.t, k);
    if (k >= 1) { courant.s.fin?.(); courant = null; if (!file.length && marques.actif) { marques.actif = null; dessinerMarques(); } }
  }
  if (!occupe()) resynchroniser();
  // le feu crépite
  if (temps > prochainFeu) { prochainFeu = temps + 0.16; if (feuPresent()) redessinerSurfaces(temps); }
  // la caméra glisse vers sa cible
  glisserZoom(dt);
  if (cam.cible && !cam.glisse) { cam.cx += (cam.cible.x - cam.cx) * Math.min(1, dt * 5); cam.cy += (cam.cible.y - cam.cy) * Math.min(1, dt * 5); }
  bornerCamera();
  rendu.viser(cam.cx - rendu.vue.w / 2, cam.cy - rendu.vue.h / 2);
  // les états sous les barres : relus quand la file est vide (ils apparaissent quand le coup a porté)
  if (!occupe()) etatsPlaques = new Map(combat.S.unites.map((u) => [u.id, etatsActifs(u)]));
  // les personnages
  for (const a of aff.values()) {
    a.t += dt;
    poserPerso(a);
    poserPlaque(a);
  }
  for (const b of tonneaux.values()) { b.s.cacher(b.cache); if (!b.cache) b.s.poser(b.x - 16, b.y - 50, b.y); }
  if (enclume) {               // (son ombre au sol, pendant la chute : on voit où elle va tomber)
    enclume.s.cacher(enclume.cache); enclume.ombre.cacher(enclume.cache || enclume.haut <= 0);
    if (!enclume.cache) { enclume.s.poser(enclume.x - 16, enclume.y - 26 - enclume.haut, enclume.y, ENCLUME.sx, ENCLUME.sy); enclume.ombre.poser(enclume.x, enclume.y - 1); }
  }
  // les états en boucle sur les créatures : relus quand la file est vide (ils apparaissent quand le coup a porté)
  if (!occupe()) etatsVus = new Map(combat.S.unites.filter((u) => !u.mort).map((u) => [u.id, ETATS.filter(([k]) => (k === 'expose' ? u.expose : u.st[k]))]));
  for (const [id, liste] of etatsVus) {
    const a = aff.get(id); if (!a || a.cache || a.mort) continue;
    for (const [k, brique, dy] of liste) if (!(a.ko && k !== 'aTerre')) fx.garder(`${id}:${k}`, brique, a.x, a.y + dy);
  }
  fx.update(dt);
  for (let k = flottants.length - 1; k >= 0; k--) {
    const f = flottants[k]; f.t += dt;
    const p = versEcran(f.x, f.y - f.t * 30);
    f.el.style.left = `${p.x}px`; f.el.style.top = `${p.y}px`; f.el.style.opacity = String(Math.max(0, 1 - Math.max(0, f.t - 0.6) / 0.5));
    if (f.t > 1.1) { f.el.remove(); flottants.splice(k, 1); }
  }
}

function poserPerso(a) {
  if (a.chien) return void poserChien(a);
  if (a.cache) { a.s64.cacher(true); a.grand?.cacher(true); a.ombre.cacher(true); return; }
  const ligne = DIR[a.dir];
  let anim = a.anim, rang, col;
  if (a.ko || a.mort || anim === 'tombe') { rang = ANIM.blesse[0]; col = anim === 'tombe' ? Math.min(5, Math.floor(a.t * 11)) : 5; }
  else if (anim === 'marche') { rang = ANIM.marche[0] + ligne; col = 1 + (Math.floor(a.t * 10) % 8); }
  else if (anim === 'blesse') { rang = ANIM.blesse[0]; col = Math.min(2, Math.floor(a.t * 10)); }
  else if (anim === 'repos') { rang = ANIM.repos[0] + ligne; col = Math.floor(a.t * 1.6) % 2; }
  else {
    // une attaque : le bloc des grandes armes s'il y en a un pour cette animation, sinon la rangée LPC
    const bloc = a.meta.attaque, grandeArme = bloc && ((anim === 'attaque' && bloc.nom.startsWith('slash')) || (anim === 'estoc' && bloc.nom.startsWith('thrust')));
    if (grandeArme) {
      const s = bloc.taille, n = bloc.images, c = Math.min(n - 1, Math.floor(a.t * n / 0.45));
      a.s64.cacher(true); a.grand.cacher(false);
      a.grand.poser(a.x - s / 2, a.y - 60 - (s - 64) / 2 + a.enfonce * 20, a.y, c * s, bloc.y + ligne * s);
      a.ombre.cacher(false); a.ombre.poser(a.x, a.y - 1);
      return;
    }
    const [r0, n] = ANIM[anim] ?? ANIM.attaque;
    rang = r0 + ligne; col = Math.min(n - 1, Math.floor(a.t * n / 0.45));
  }
  a.grand?.cacher(true); a.s64.cacher(false);
  // plonge (le Pas dans l'ombre de Shadow) : il descend sous ses pieds, coupé au ras du sol
  const sous = Math.round((a.plonge ?? 0) * 60);
  a.s64.poser(a.x - 32, a.y - 60 + a.enfonce * 26 + sous, a.y, col * 64, rang * 64, 64 - sous);
  a.ombre.cacher(a.enfonce > 0.3 || (a.plonge ?? 0) > 0.2); a.ombre.poser(a.x, a.y - 1);
}

// Le limier : sa planche à lui (4 rangées : la marche, colonnes 0 à 4 ; l'arrêt, colonne 5) ; à terre, terni.
function poserChien(a) {
  if (a.cache) { a.s64.cacher(true); a.ombre.cacher(true); return; }
  const col = a.anim === 'marche' ? Math.floor(a.t * 10) % 5 : 5;
  a.s64.cacher(false);
  a.s64.poser(a.x - 32, a.y - 62 + a.enfonce * 26, a.y, col * 64, LIGNES_CHIEN[a.dir] * 64);
  const m = a.s64.mesh.material, terni = a.ko || a.mort;
  if (m.userData.terni !== terni) { m.color.setRGB(...(terni ? [0.42, 0.42, 0.48] : [1, 1, 1])); m.userData.terni = terni; }   // (assombri, pas transparent : alphaTest)
  a.ombre.cacher(a.enfonce > 0.3); a.ombre.poser(a.x, a.y - 1);
}

// Quand la file est vide, la vue colle à l'état du combat (au cas où une scène a été sautée).
function resynchroniser() {
  for (const u of combat.S.unites) {
    const a = aff.get(u.id); if (!a) continue;
    a.x = u.x * T; a.y = u.y * T; a.pv = u.pv; a.ko = u.ko; a.mort = u.mort;
    if (a.anim === 'tombe' && !u.ko && !u.mort) a.anim = 'repos';
  }
  for (const [id, b] of tonneaux) {
    const t = combat.S.tonneaux.find((o) => o.id === id);
    if (!t) b.cache = true; else { b.x = t.x * T; b.y = t.y * T; b.cache = false; }
  }
  const e = combat.S.enclume;
  if (enclume) { if (!e) enclume.cache = true; else Object.assign(enclume, { x: e.x * T, y: e.y * T, cache: false, haut: 0 }); }
}

// La planche LPC d'un personnage (pour le médaillon de sa fiche).
export const planche = (type) => images[`perso_${type === 'brt' ? 'brute-ennemie' : type}`] ?? null;
// Un portrait (la tête, de face) pris sur la planche d'un personnage, pour l'interface.
export function portrait(type, taille = 64) {
  const nom = type === 'brt' ? 'brute-ennemie' : type, img = images[`perso_${nom}`];
  const c = Object.assign(document.createElement('canvas'), { width: taille, height: taille, className: 'portrait-terrain' });
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, 16, (ANIM.repos[0] + DIR.bas) * 64 + 6, 32, 32, 0, 0, taille, taille);
  return c;
}

export function dispose() { for (const f of flottants) f.el.remove(); calquePlaques?.remove(); }

// Pour l'interface et les tests : l'état de la vue, sans y toucher.
export const api = {
  aff, tonneaux, get enclume() { return enclume; }, cam, jouer, occupe, surEvenement, dessinerMarques, versEcran, viser, portrait, planche, redessinerSurfaces, remplacer, basculerPlaques, effets,
  get plaques() { return { ...plaques }; },
  get marques() { return marques; },
  versMonde: (cx, cy) => { const p = rendu.versMonde(cx, cy); return { x: p.x / T, y: p.y / T }; },
  // la créature (ou le tonneau) sous un point du monde (en cases) : on touche son corps, des pieds à la tête
  sous(x, y) {
    let best = null, bd = Infinity;
    for (const a of aff.values()) {
      if (a.cache || a.mort) continue;
      const ax = a.x / T, ay = a.y / T, haut = a.ko ? 0.6 : 1.7;
      if (Math.abs(x - ax) > 0.5 || y < ay - haut || y > ay + 0.3) continue;
      const d = Math.abs(x - ax) + Math.abs(y - (ay - haut / 2));
      if (d < bd) { bd = d; best = a.id; }
    }
    if (best) return best;
    for (const [id, b] of tonneaux) { if (!b.cache && Math.abs(b.x / T - x) < 0.5 && y > b.y / T - 1.2 && y < b.y / T + 0.2) return id; }
    if (enclume && !enclume.cache && Math.abs(enclume.x / T - x) < 0.5 && y > enclume.y / T - 0.9 && y < enclume.y / T + 0.25) return 'enclume';
    return null;
  },
  zoomer, ajusterCamera, contact: CONTACT,
};
