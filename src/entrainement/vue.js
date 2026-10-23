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
import SURF from './surfaces.json';
import { terrain } from './salle.js';
import { CONTACT } from './geometrie.js';
import { lire, surChangement } from './reglages-combat.js';
import { creerEffets, effetsAttaque, effetsLance, ETATS } from './effets.js';
import { etatsActifs } from './etats.js';
import * as VIE from './vie.js';
import { creerFilms, traction, ENCLUME as ENCLUME_FILM } from './films.js';

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
  foin: [[204, 172, 84], [222, 192, 104], [240, 214, 140], [140, 110, 46]],
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
// Les trois formes du Changepeau de Mope (public/assets/lpc/entrainement/formes/, réduites des planches de design/classes/changepeau/formes/) :
// une image debout par face (bas, gauche, haut, droite), animée par le jeu (elle respire, marche, bondit, frappe en se jetant en avant).
const FACES_FORME = { bas: 0, gauche: 1, haut: 2, droite: 3 };
const NOMS_FORME = { bete: 'La Bête !', cosa: 'La Cosa !', illumine: 'L’Illuminé !' };

let game, rendu, images, combat, salle, canvas, niveauPlan, pont, saison, des = null;
const aff = new Map();                 // ce que la vue montre de chaque créature (ça suit la file, pas l'état final)
const tonneaux = new Map();
const braseros = new Map();
const tombes = [], chutes = [];                     // les éboulis qui ferment un chemin (la fourche), posés une fois            // la lisière : id → { x, y, renverse, s } (la planche : 4 images de flamme, puis renversé)
// l'enclume de Baba Brisenclume : { x, y, s, cache }, celle de sa Chute d'Enclume (films.js) ; ses animations validées
// (les films) la cachent quand elles la dessinent elles-mêmes (sa chute, la Forge)
let enclume = null;
let films = null;
const BABA = 'baba-brisenclume';
const FILMS_ENCLUME = ['chute-enclume', 'lame-ardente', 'trempe'];
let fondSurfaces, ctxSurfaces, texSurfaces, fondMarques, ctxMarques, texMarques;
let file = [], courant = null, ecouteurs = [];
let phaseVue = null;                  // la phase que la file montre en ce moment (les ennemis jouent : leurs tours se règlent à part)
let temps = 0, prochainFeu = 0;
// le combo (le retour du propriétaire, 23 oct : « des animations satisfaisantes pour confirmer le combo ») : un ralenti,
// une secousse, un trait doré entre les deux héros, des éclats d'or à l'impact ; le tampon « COMBO ! » est dans l'interface
let dernierImpact = null;
let fx = null, etatsVus = new Map();   // les effets joués, et les états montrés (relus quand la file est vide)
let etatsPlaques = new Map();         // id → les états sous sa barre (etats.js), relus aussi quand la file est vide
export const effets = () => fx;
// La caméra : son centre (cx, cy), l'échelle affichée (s) qui glisse vers celle des crans (base × 2^(crans/4), #122),
// le point de l'écran qui reste sous la souris pendant le zoom (ancre), la molette pas encore comptée (des petits pas).
const cam = { s: 2, base: 2, crans: 0, ancre: null, molette: 0, cx: 0, cy: 0, cible: null, glisse: null };
const CRANS = 4, MOLETTE = 100, ZOOM_MAX = 5;      // (la douceur du zoom, le zoom de départ : réglages « Ressenti »)
let zoomDemande = lire('feel.zoom');
let marques = {};                      // ce que l'interface demande de montrer (voir dessinerMarques)
// (une clé neuve : les barres sont maintenant montrées par défaut, sous les pieds ; l'ancien choix « cachées » ne compte plus)
const CLE_PLAQUES = 'dungeoncoop:barres-terrain';
const plaques = { e: true, h: true }; // les barres de vie montrées : des ennemis (e), des alliés (h)
let calquePlaques = null;
// Le ressenti des coups : au moment où le coup touche (l'arme ou le projectile arrive, pas à la fin de l'animation),
// un arrêt sur image (la file et les animations attendent), une secousse de la caméra, un éclair blanc et un recul
// de la cible, et son chiffre ; dosés sur le résultat du d20 et sur les dégâts. Quatre styles, à essayer avec
// ?ressenti=sobre|percutant|manga|cinema ; en plus, selon le style : des étincelles, un éclair de tout l'écran,
// des traits de vitesse autour de la cible, un coup de zoom, un ralenti, un voile sombre qui isole la cible.
//   gel : l'arrêt (s) · secousse, recul : en px d'écran, à tous les zooms (mesurés à l'échelle des maquettes, ×1,8) · flash, traits, voile : leur force (0 à 1) · zoom : +x % ·
//   ralenti : { k : la vitesse, d : sa durée réelle (s) } · etincelles : des briques en plus sur la cible
const STYLES = {
  sobre: {
    eraflure: { gel: 0.025, secousse: 0.8, recul: 1.5 }, touche: { gel: 0.05, secousse: 1.6, recul: 3 },
    critique: { gel: 0.11, secousse: 3.2, recul: 5 }, autre: { gel: 0.02, secousse: 1, recul: 1.5 },
  },
  percutant: {
    eraflure: { gel: 0.035, secousse: 1.2, recul: 2 }, touche: { gel: 0.075, secousse: 2.6, recul: 4, etincelles: ['impact-etoile'] },
    critique: { gel: 0.2, secousse: 6, recul: 7, etincelles: ['impact-dore', 'impact-etoile'] }, autre: { gel: 0.03, secousse: 1.4, recul: 2 },
  },
  manga: {
    eraflure: { gel: 0.04, secousse: 1.4, recul: 2.5 }, touche: { gel: 0.1, secousse: 3.2, recul: 5, traits: 0.55, etincelles: ['impact-etoile'] },
    critique: { gel: 0.3, secousse: 7, recul: 9, traits: 1, flash: 0.4, zoom: 0.07, etincelles: ['impact-dore', 'impact-etoile'] },
    autre: { gel: 0.03, secousse: 1.6, recul: 2 },
  },
  cinema: {
    eraflure: { gel: 0.03, secousse: 1, recul: 2 }, touche: { gel: 0.06, secousse: 2, recul: 4 },
    critique: { gel: 0.05, ralenti: { k: 0.18, d: 0.6 }, secousse: 4, recul: 8, voile: 0.6, zoom: 0.12, etincelles: ['impact-dore'] },
    autre: { gel: 0.025, secousse: 1.2, recul: 2 },
  },
};
const STYLE_DEFAUT = 'percutant';
// (en px d'écran : sans ça, au zoom normal, 1 px du monde ≈ 1 px d'écran, et la secousse du style Sobre ne se voyait pas)
const ECRAN = 1.8, SECOUSSE_MAX = 14, RECUL_MAX = 12;      // (la durée, la force de la secousse et le recul : réglages « Ressenti »)
const calme = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let style = STYLE_DEFAUT;
let gel = 0, coup = null;                              // l'arrêt sur image restant (s) ; le dernier jet (attaque)
const secousse = { a: 0, t: 0 };
const ralenti = { k: 1, reste: 0 };
// ce qui se joue par-dessus le terrain (sous l'interface) : l'éclair de l'écran, les traits, le voile ; et le zoom
const ecran = { cible: null, t: 9, flash: 0, traits: 0, voile: 0, zoom: 0, tenue: 0 };
let voile = null;

export function init(g, options) {
  game = g;
  const q = new URLSearchParams(location.search).get('ressenti');
  style = STYLES[q] ? q : STYLE_DEFAUT;
  document.documentElement.dataset.ressenti = style;
  voile = Object.assign(document.createElement('div'), { className: 'voile-impact' });
  voile.innerHTML = '<div class="vi-voile"></div><div class="vi-traits"></div><div class="vi-flash"></div>';
  document.body.append(voile);
  ({ rendu, images, combat, salle, canvas } = options);
  niveauPlan = options.plan ?? null; pont = options.pont ?? null; saison = options.saison ?? 'ete'; des = options.des ?? null;
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
  // le zoom de départ réglé en plein jeu : la caméra y glisse
  surChangement(() => { if (lire('feel.zoom') !== zoomDemande) { zoomDemande = lire('feel.zoom'); const [min, max] = bornesCrans(); cam.crans = Math.max(min, Math.min(max, zoomDemande)); } });
  try { const lu = JSON.parse(localStorage.getItem(CLE_PLAQUES)); if (lu) { plaques.e = !!lu.e; plaques.h = !!lu.h; } } catch {}

  fx = creerEffets(rendu, images);
  films = creerFilms(rendu, images);
  peupler();
  VIE.init({ rendu, images, combat, plan: niveauPlan, heros: herosVus, saison });          // la vie du chemin (vie.js)

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

// Où la vue montre les héros debout, en cases (les bêtes de vie.js fuient ce qu'elles voient, pas l'état final)
const herosVus = () => [...aff.values()].filter((a) => a.camp === 'h' && !a.ko).map((a) => ({ x: a.x / T, y: a.y / T }));
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
      id: u.id, type: u.type, camp: u.camp, x: u.x * T, y: u.y * T, dir: u.camp === 'h' ? 'droite' : u.camp === 'p' ? 'bas' : 'gauche', anim: 'repos', t: Math.random(),
      pv: u.pv, ko: u.ko, mort: u.mort, cache: false, enfonce: 0, s64, grand, meta, ombre: rendu.ombre(20 * (meta.echelle ?? 1), 5 * (meta.echelle ?? 1)),
      pvMax: u.pvMax, plaque: creerPlaque(u), chien,
      formes: u.type === 'changepeau' ? Object.fromEntries(['bete', 'cosa', 'illumine'].map((f) => { const sp = rendu.sprite(images[`forme_${f}`], `forme-${f}`, 64, 64); sp.cacher(true); return [f, sp]; })) : null,
      forme: u.forme?.id ?? null, formePv: u.forme?.pv ?? 0, formeMax: u.forme?.max ?? 0,
    });
  }
  for (const b of combat.S.tonneaux) tonneaux.set(b.id, { x: b.x * T, y: b.y * T, s: rendu.sprite(images.tonneau, 'tonneau', 32, 64), cache: false });
for (const b of combat.S.braseros) braseros.set(b.id, { x: b.x * T, y: b.y * T, renverse: b.renverse, s: rendu.sprite(images.brasero, 'brasero', 32, 64) });
  const e = combat.S.enclume;
  enclume = { x: (e?.x ?? 0) * T, y: (e?.y ?? 0) * T, s: rendu.sprite(images.film_enclume, 'film-enclume', ENCLUME_FILM.w, ENCLUME_FILM.h), cache: !e };
}

// Un autre combat (une autre équipe, choisie à l'accueil ou dans le lobby) : on retire tout et on recommence, sans recharger.
export function remplacer(nouveau) {
  for (const a of aff.values()) { a.s64.retirer(); a.grand?.retirer(); a.ombre.retirer(); a.plaque.el.remove(); a.plaque.intention.remove(); for (const sp of Object.values(a.formes ?? {})) sp.retirer(); }
  for (const b of tonneaux.values()) b.s.retirer();
  enclume?.s.retirer(); films.vider();
  for (const b of braseros.values()) b.s.retirer();
  for (const s of tombes.splice(0)) s.retirer();
  aff.clear(); tonneaux.clear(); braseros.clear(); file = []; courant = null; phaseVue = null; fx.vider(); etatsVus = new Map(); etatsPlaques = new Map();
  combat = nouveau;
  peupler();
  VIE.dispose(); VIE.init({ rendu, images, combat, plan: niveauPlan, heros: herosVus, saison });
  redessinerSurfaces();
  dessinerMarques({});
}

// --- La caméra -------------------------------------------------------------------------------------------------
function echelleDeBase() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
  const f = Math.min((r.width * dpr) / (Math.min(salle.l, 32) * T), (r.height * dpr) / (salle.h * T));   // au plus 32 cases de large : un long chemin défile
  return Math.max(1, Math.floor(f + 0.35));       // presque tout le terrain, au pixel entier (on fait défiler le reste)
}
const echelleDe = (n) => Math.max(1, Math.min(ZOOM_MAX, cam.base * 2 ** (n / CRANS)));
const bornesCrans = () => [Math.floor(CRANS * Math.log2(1 / cam.base)), Math.ceil(CRANS * Math.log2(ZOOM_MAX / cam.base))];
// La taille de l'écran a changé (ou le début) : l'échelle de base suit l'écran ; on garde ses crans.
function ajusterCamera(premiere = false) {
  cam.base = echelleDeBase();
  if (premiere) cam.crans = lire('feel.zoom');
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
  let e = Math.exp(Math.log(cam.s) + (Math.log(but) - Math.log(cam.s)) * (1 - Math.exp(-lire('feel.zoomDouceur') * dt)));
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
export function viser(x, y) { if (!camCine) cam.cible = { x, y }; }
// Les cinématiques (cinema.js) : la caméra glisse d'un point à l'autre (en pixels du monde), ou y coupe ; libererCamera rend la main.
let camCine = null;
export function cameraVers(x, y, duree) { camCine = { de: { x: cam.cx, y: cam.cy }, vers: { x, y }, t: 0, duree: Math.max(0.01, duree) }; cam.cible = null; }
export function placerCamera(x, y) { cam.cx = x; cam.cy = y; cam.cible = null; camCine = { de: { x, y }, vers: { x, y }, t: 1, duree: 1 }; }
export function libererCamera() { camCine = null; }
export function exclamer(ids) { for (const id of ids) { const a = aff.get(id); if (a && !a.cache && !a.mort) flottant(a, '!', 'alerte'); } }   // repérés : un « ! » sur chaque ennemi

// --- Les surfaces au sol (retouches du propriétaire, 22 oct) ----------------------------------------------------------
// Le foin, le feu, l'huile et la glace sont des terrains LPC (public/assets/lpc/surfaces_lpc.png, fait par
// design/terrain-entrainement/outils/surfaces_lpc.py) : le blé de la ferme (un tas surélevé, son flanc de tiges), la lave,
// l'eau violette recoloriée en huile, l'îlot de glace. Ils se dessinent comme l'étang de D1 (terrain() de salle.js) :
// une case de 32 px en prend les bords et les coins selon ses quatre coins (estCoin, plus bas). Sur le feu, des flammes animées, chacune à son temps.
// L'eau peu profonde garde sa nappe : chaque pixel prend l'eau si son poids, interpolé entre les 4 mailles voisines,
// dépasse la moitié ; son fond vient de la planche des surfaces (surfaces.px.js, surfaces.json).
const TYPES = ['', 'eau', 'huile', 'glace', 'feu', 'foin'];
const BLOC_LPC = { foin: 0, feu: 1, huile: 2, glace: 3 };                 // leur bloc de 3 x 6 cases dans surfaces_lpc.png
const PLEIN_VARIE = { feu: true, huile: true, glace: true };             // le blé n'a pas de variantes pleines (sa rangée 5 est de l'herbe)
const hash = (i, j) => ((i * 73856093) ^ (j * 19349663)) >>> 0;     // toujours le même tirage au même endroit
let planchePx = null, blocs = null;
function pixelsPlanche() {
  if (!planchePx && images.surfaces) {
    const im = images.surfaces, c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height }), g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    planchePx = g.getImageData(0, 0, im.width, im.height);
  }
  return planchePx;
}
function blocsLPC() {                                // chaque bloc dans sa propre toile : terrain() le lit depuis (0, 0)
  if (!blocs && images.surfaces_lpc) {
    blocs = {};
    for (const [nom, k] of Object.entries(BLOC_LPC)) {
      const c = Object.assign(document.createElement('canvas'), { width: 3 * T, height: 6 * T });
      c.getContext('2d').drawImage(images.surfaces_lpc, k * 3 * T, 0, 3 * T, 6 * T, 0, 0, 3 * T, 6 * T);
      blocs[nom] = c;
    }
  }
  return blocs;
}
function redessinerSurfaces(flammes = 0) {
  const W = fondSurfaces.width, H = fondSurfaces.height, M = combat.MAILLE * T;
  const img = ctxSurfaces.createImageData(W, H), p = img.data, P = pixelsPlanche();
  const nx = Math.ceil(W / M), ny = Math.ceil(H / M), grille = new Uint8Array(nx * ny);
  for (const [k, s] of Object.entries(combat.mailles())) {
    const [i, j] = k.split(',').map(Number);
    if (i >= 0 && j >= 0 && i < nx && j < ny) grille[j * nx + i] = Math.max(0, TYPES.indexOf(s.t));      // (les pièges : dessinés à part, plus bas)
  }
  const at = (i, j) => (i >= 0 && j >= 0 && i < nx && j < ny ? grille[j * nx + i] : 0);
  // l'eau : une nappe lisse, pixel par pixel
  const EAU = 1, eau = new Uint8Array(W * H);
  if (grille.includes(EAU)) {
    for (let y = 0; y < H; y++) {
      const fy = y / M - 0.5, j = Math.floor(fy), ty = fy - j;
      for (let x = 0; x < W; x++) {
        const fx = x / M - 0.5, i = Math.floor(fx), tx = fx - i;
        const s = (at(i, j) === EAU) * (1 - tx) * (1 - ty) + (at(i + 1, j) === EAU) * tx * (1 - ty) + (at(i, j + 1) === EAU) * (1 - tx) * ty + (at(i + 1, j + 1) === EAU) * tx * ty;
        if (s >= 0.5) eau[y * W + x] = 1;
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x; if (!eau[k]) continue;
      const bord = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !eau[k - 1] || !eau[k + 1] || !eau[k - W] || !eau[k + W];
      let r = 46, g = 120, b = 196;
      if (P) {
        const [sx, sy] = SURF[`eau_${hash(x >> 5, y >> 5) % 3}`], q = ((sy + (y & 31)) * P.width + sx + (x & 31)) * 4;
        r = P.data[q]; g = P.data[q + 1]; b = P.data[q + 2];
      }
      const f = bord ? 0.55 : 1, o = k * 4;
      p[o] = r * f; p[o + 1] = g * f; p[o + 2] = b * f; p[o + 3] = bord ? 240 : 205;
    }
  }
  ctxSurfaces.putImageData(img, 0, 0);
  // le foin, le feu, l'huile, la glace : des terrains LPC, coin par coin (le feu par-dessus le reste)
  const B = blocsLPC(), coins = {};
  if (B) {
    for (const nom of ['glace', 'huile', 'foin', 'feu']) {
      const n = TYPES.indexOf(nom);
      if (!grille.includes(n)) continue;
      // un coin est à la matière si deux des quatre mailles qui le touchent le sont, ou si la seule qui l'est fait l'angle
      // d'un bloc (ses voisines, en s'éloignant du coin, le sont aussi) : un tas rectangulaire garde ses angles
      const estCoin = (I, J) => {
        let k = 0, mi = 0, mj = 0;
        for (const [a, b] of [[2 * I - 1, 2 * J - 1], [2 * I, 2 * J - 1], [2 * I - 1, 2 * J], [2 * I, 2 * J]]) if (at(a, b) === n) { k++; mi = a; mj = b; }
        if (k !== 1) return k >= 2;
        const dx = mi === 2 * I ? 1 : -1, dy = mj === 2 * J ? 1 : -1;
        return at(mi + dx, mj) === n && at(mi, mj + dy) === n;
      };
      coins[nom] = estCoin;
      terrain(ctxSurfaces, B[nom], estCoin, (tuile, h) => (PLEIN_VARIE[nom] && h % 5 === 0 ? tuile((h >>> 3) % 3, 5) : tuile(1, 3)));
    }
  }
  // les flammes : une par maille de feu (une sur deux), seulement dans les cases pleines de lave
  if (coins.feu && images.surfaces) {
    const graine = Math.floor(flammes * 8), plein = (I, J) => coins.feu(I, J) && coins.feu(I + 1, J) && coins.feu(I, J + 1) && coins.feu(I + 1, J + 1);
    const poses = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (grille[j * nx + i] !== 4) continue;
      const h = hash(i * 7 + 3, j * 13 + 5);
      if (h % 100 >= 50 || !plein(i >> 1, j >> 1)) continue;
      const [sx, sy, sw, sh] = SURF[`flamme_${(graine + (h >>> 9)) % 4}`];
      poses.push([j, sx, sy, sw, sh, Math.round(i * M + M / 2 - sw / 2 + ((h >>> 3) % 7) - 3), Math.round(j * M + M - sh + ((h >>> 6) % 5))]);
    }
    poses.sort((a, b) => a[0] - b[0]);
    for (const [, sx, sy, sw, sh, x, y] of poses) ctxSurfaces.drawImage(images.surfaces, sx, sy, sw, sh, x, y, sw, sh);
  }
  // les pièges du Traqueur (une tache de la couleur du fer, de l'ambre ou de la corde, au contour plus sombre)
  for (const [k, s] of Object.entries(combat.mailles())) {
    if (s.t !== 'piege') continue;
    const [i, j] = k.split(',').map(Number), c = COULEURS[`piege-${s.v}`] ?? COULEURS['piege-machoires'], r = M * 0.72;
    ctxSurfaces.fillStyle = `rgb(${c[3].join(',')})`; ctxSurfaces.beginPath(); ctxSurfaces.arc((i + 0.5) * M, (j + 0.5) * M, r, 0, Math.PI * 2); ctxSurfaces.fill();
    ctxSurfaces.fillStyle = `rgb(${c[1].join(',')})`; ctxSurfaces.beginPath(); ctxSurfaces.arc((i + 0.5) * M, (j + 0.5) * M, r - 1.5, 0, Math.PI * 2); ctxSurfaces.fill();
  }
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
  if (m.vues) for (const v of m.vues) {   // l'exploration : le champ de vue de chaque ennemi, au sol
    g.fillStyle = 'rgba(255, 70, 50, 0.16)'; g.strokeStyle = 'rgba(255, 120, 90, 0.6)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(v.x * T, v.y * T); g.arc(v.x * T, v.y * T, v.r * T, v.regard - v.demi, v.regard + v.demi); g.closePath(); g.fill(); g.stroke();
  }
  if (m.cachettes) for (const c of m.cachettes) {   // une cachette pas encore trouvée : un éclat doré
    const x = c.x * T, y = c.y * T - 18;
    g.fillStyle = '#ffe98a'; g.strokeStyle = '#8a5a14'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 2, y - 2); g.lineTo(x + 6, y); g.lineTo(x + 2, y + 2); g.lineTo(x, y + 6); g.lineTo(x - 2, y + 2); g.lineTo(x - 6, y); g.lineTo(x - 2, y - 2); g.closePath(); g.fill(); g.stroke();
  }
  const anneau = (id, couleur, epais = 2) => {
    const a = aff.get(id) ?? tonneaux.get(id) ?? braseros.get(id) ?? (id === 'enclume' && !enclume?.cache ? enclume : null); if (!a) return;
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
  if (m.apercuFeu) {          // l'aperçu du combo : le foin qui brûlerait, et qui serait pris dedans (le survol du brasero)
    const M = combat.MAILLE * T;
    for (const k of m.apercuFeu.mailles) {   // un damier rouge et orange : la zone qui prendrait feu
      const [i, j] = k.split(',').map(Number);
      g.fillStyle = (i + j) % 2 ? 'rgba(255, 70, 20, 0.62)' : 'rgba(255, 150, 30, 0.62)'; g.fillRect(i * M, j * M, M, M);
    }
    g.font = 'bold 12px "Source Sans 3", sans-serif'; g.textAlign = 'center'; g.lineWidth = 3;
    const n = m.apercuFeu.touches.filter((t) => t.camp === 'e').length;
    const titre = n ? `Renverser : ${n} ennemi${n > 1 ? 's' : ''} pris dans le feu` : 'Renverser : le foin prend feu';
    g.strokeStyle = 'rgba(40, 14, 4, 0.9)'; g.fillStyle = '#ffe9a3';
    g.strokeText(titre, m.apercuFeu.x * T, m.apercuFeu.y * T - 58); g.fillText(titre, m.apercuFeu.x * T, m.apercuFeu.y * T - 58);
    for (const t of m.apercuFeu.touches) {
      const a = aff.get(t.id); if (!a) continue;
      g.strokeStyle = 'rgba(40, 14, 4, 0.9)'; g.fillStyle = t.camp === 'e' ? '#ffd36a' : '#ff8a6a';
      const texte = `−${t.degats}, puis Brûlure`;
      g.strokeText(texte, a.x, a.y - 52); g.fillText(texte, a.x, a.y - 52);
    }
    g.textAlign = 'start';
  }
  for (const c of m.charges ?? []) {   // la Charge annoncée du gardien : une bande rouge au sol, et sa pointe
    const l = Math.hypot(c.x1 - c.x0, c.y1 - c.y0) || 1, ux = (c.x1 - c.x0) / l, uy = (c.y1 - c.y0) / l, px = -uy * 0.8 * T, py = ux * 0.8 * T;
    const a = { x: c.x0 * T, y: c.y0 * T }, b = { x: c.x1 * T, y: c.y1 * T };
    g.fillStyle = 'rgba(220, 40, 30, 0.32)'; g.strokeStyle = '#ff3a2a'; g.lineWidth = 2; g.setLineDash([8, 5]);
    g.beginPath(); g.moveTo(a.x + px, a.y + py); g.lineTo(b.x + px, b.y + py); g.lineTo(b.x - px, b.y - py); g.lineTo(a.x - px, a.y - py); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff3a2a'; g.beginPath(); g.moveTo(b.x + ux * 18, b.y + uy * 18); g.lineTo(b.x + px * 0.9, b.y + py * 0.9); g.lineTo(b.x - px * 0.9, b.y - py * 0.9); g.closePath(); g.fill();
    if (c.contre) {
      g.font = 'bold 12px "Source Sans 3", sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(40, 8, 4, 0.9)'; g.fillStyle = '#ffd36a';
      const t = c.contre === 'brasero' ? 'finit dans le brasero' : 'percute : Étourdi';
      g.strokeText(t, b.x + ux * 30, b.y + uy * 30 - 6); g.fillText(t, b.x + ux * 30, b.y + uy * 30 - 6); g.textAlign = 'start';
    }
  }
  for (const o of m.trouvailles ?? []) {   // à cueillir : un éclat vert (une pomme, une herbe)
    const x = o.x * T, y = o.y * T - (o.sorte === 'pommier' ? 90 : 20), k = 4 + Math.sin(temps * 4) * 1.5;
    g.fillStyle = '#b8f28a'; g.strokeStyle = '#2a5a14'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y - k); g.lineTo(x + k * 0.4, y); g.lineTo(x, y + k); g.lineTo(x - k * 0.4, y); g.closePath(); g.fill(); g.stroke();
  }
  for (const l of m.leviers ?? []) {     // un objet du combat : une main dorée, et son nom quand on approche
    const x = l.x * T, y = l.y * T - 34;
    g.fillStyle = l.possible ? '#ffe98a' : 'rgba(255, 233, 138, 0.5)'; g.strokeStyle = '#5a3b10'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#5a3b10'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('!', x, y + 4);
    if (l.nom) { g.font = 'bold 11px "Source Sans 3", sans-serif'; g.lineWidth = 3; g.strokeStyle = 'rgba(30, 18, 6, 0.9)'; g.fillStyle = '#ffe9a3'; g.strokeText(l.nom, x, y - 12); g.fillText(l.nom, x, y - 12); }
    g.textAlign = 'start';
  }
  if (m.apercuLevier) {        // l'aperçu de l'objet : la zone touchée, et qui est dedans
    const z = m.apercuLevier.zone;
    g.fillStyle = 'rgba(80, 170, 255, 0.28)'; g.strokeStyle = '#7ce0ff'; g.lineWidth = 2; g.setLineDash([6, 4]);
    g.fillRect(z.x0 * T, z.y0 * T, (z.x1 - z.x0) * T, (z.y1 - z.y0) * T); g.strokeRect(z.x0 * T, z.y0 * T, (z.x1 - z.x0) * T, (z.y1 - z.y0) * T); g.setLineDash([]);
    for (const t of m.apercuLevier.touches) { const a = aff.get(t.id); if (!a) continue; g.strokeStyle = t.camp === 'e' ? '#ffd36a' : '#ff8a6a'; g.lineWidth = 3; g.beginPath(); g.ellipse(a.x, a.y - 1, 16, 8, 0, 0, Math.PI * 2); g.stroke(); }
  }
  if (m.menaceVers) {         // l'intention survolée : un trait rouge jusqu'au héros visé
    const a = aff.get(m.menaceVers.a.id), b = aff.get(m.menaceVers.b.id);
    if (a && b) { g.strokeStyle = 'rgba(255, 70, 50, 0.9)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(a.x, a.y - 20); g.lineTo(b.x, b.y - 20); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ff4632'; g.beginPath(); g.arc(b.x, b.y - 20, 4, 0, Math.PI * 2); g.fill(); }
  }
  for (const id of m.couverts ?? []) {   // une cible à couvert : un petit bouclier au-dessus d'elle (désavantage au tir)
    const a = aff.get(id); if (!a) continue;
    const x = a.x + 14, y = a.y - 66;
    g.fillStyle = '#c9d4e2'; g.strokeStyle = '#2a3442'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y - 7); g.lineTo(x + 7, y); g.quadraticCurveTo(x + 6, y + 6, x, y + 9); g.quadraticCurveTo(x - 6, y + 6, x - 7, y); g.closePath(); g.fill(); g.stroke();
  }
  if (m.lienCombo) {          // le combo : un trait d'or qui va de celui qui a préparé à celui qui a exploité, puis à l'impact
    const { a, b, i, k } = m.lienCombo, f = Math.min(1, k * 2.2), o = k < 0.7 ? 1 : (1 - k) / 0.3;
    g.save(); g.globalAlpha = Math.max(0, o); g.lineCap = 'round';
    for (const [l, c] of [[10, 'rgba(255, 200, 60, 0.35)'], [4, '#ffe58a'], [2, '#ffffff']]) {
      g.strokeStyle = c; g.lineWidth = l; g.beginPath(); g.moveTo(a.x, a.y);
      const mx = a.x + (b.x - a.x) * Math.min(1, f * 2), my = a.y + (b.y - a.y) * Math.min(1, f * 2); g.lineTo(mx, my);
      if (f > 0.5) { const q = (f - 0.5) * 2; g.lineTo(b.x + (i.x - b.x) * q, b.y + (i.y - 26 - b.y) * q); }
      g.stroke();
    }
    g.fillStyle = 'rgba(255, 230, 120, 0.5)'; g.beginPath(); g.arc(i.x, i.y - 26, 10 + k * 40, 0, Math.PI * 2); g.fill();
    g.restore();
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
    case 'groupe': {         // l'exploration : plusieurs héros marchent en même temps (le premier mène, la caméra le suit)
      const tous = e.marches.map((m) => {
        const a = aff.get(m.id), segs = []; let tot = 0, prec = { x: a.x, y: a.y };
        for (const q of m.chemin) { const p = { x: q.x * T, y: q.y * T }, l = Math.hypot(p.x - prec.x, p.y - prec.y); segs.push({ a: prec, b: p, l, d: tot }); tot += l; prec = p; }
        return { a, segs, tot };
      });
      const duree = Math.max(0.05, ...tous.map((o) => o.tot)) / VITESSE_MARCHE;
      return { duree, maj(t) {
        for (const o of tous) {
          const d = Math.min(o.tot, t * VITESSE_MARCHE), sg = o.segs.find((x) => d <= x.d + x.l) ?? o.segs[o.segs.length - 1];
          if (!sg) continue;
          const k = sg.l ? (d - sg.d) / sg.l : 1;
          o.a.x = sg.a.x + (sg.b.x - sg.a.x) * k; o.a.y = sg.a.y + (sg.b.y - sg.a.y) * k;
          o.a.dir = versDir(sg.b.x - sg.a.x, sg.b.y - sg.a.y); o.a.anim = d < o.tot ? 'marche' : 'repos';
        }
        viser(tous[0].a.x, tous[0].a.y);
      }, fin() { for (const o of tous) o.a.anim = 'repos'; } };
    }
    case 'poussee': {
      const cible = e.tonneau ? tonneaux.get(e.id) : a, dep = { x: cible.x, y: cible.y };
      const tiree = !e.tonneau && films.de(cible);                // tirée par les Tenailles de Baba : au rythme de ses à-coups
      if (tiree) return tirer(tiree, cible, e.chemin, () => { a.anim = 'blesse'; }, () => { a.anim = 'repos'; });
      const pts = e.chemin.map((p) => ({ x: p.x * T, y: p.y * T })), fin = pts[pts.length - 1] ?? dep;
      const duree = Math.min(0.6, 0.12 + Math.hypot(fin.x - dep.x, fin.y - dep.y) / (12 * T));
      fx.jouer('poussiere', { x: dep.x, y: dep.y }); fx.jouer('poussiere', { x: fin.x, y: fin.y, retard: duree });
      // poussé du haut d'un plateau : un petit bond par-dessus le bord, puis la chute (plus longue)
      if (e.chute) {
        const d2 = duree + 0.15 * e.chute;
        return { duree: d2, maj(t, k) {
          cible.x = dep.x + (fin.x - dep.x) * k; cible.y = dep.y + (fin.y - dep.y) * k * k;
          if (!e.tonneau) { a.anim = 'blesse'; a.enfonce = -0.6 * Math.sin(Math.PI * Math.min(1, k * 1.6)); }
        }, fin() {
          if (!e.tonneau) { a.anim = 'repos'; a.enfonce = 0; }
          if (!calme) { secousse.a = Math.max(secousse.a, (2.5 * e.chute * ECRAN) / Math.max(0.5, canvas.clientWidth / rendu.vue.w)); secousse.t = 0; }
        } };
      }
      return { duree, maj(t, k) {
        cible.x = dep.x + (fin.x - dep.x) * k; cible.y = dep.y + (fin.y - dep.y) * k; if (!e.tonneau) a.anim = 'blesse';
      }, fin() { if (!e.tonneau) a.anim = 'repos'; } };
    }
    case 'attaque': case 'lance': {
      if (aff.get(e.type === 'attaque' ? e.de : e.id)?.type === BABA) { const sb = sceneBaba(e); if (sb) return sb; }
      const att = aff.get(e.type === 'attaque' ? e.de : e.id), cible = e.type === 'attaque' ? aff.get(e.vers) : { x: e.x * T, y: e.y * T };
      dernierImpact = { x: cible.x, y: cible.y };
      // l'attaque d'un héros : le panneau de jet (61_des.js, le dé de cristal), avec les dés déjà tirés par les règles ;
      // la scène attend qu'il se ferme, puis le coup part (une deuxième scène, sans panneau)
      if (des && e.type === 'attaque' && att.camp === 'h' && !e.jetMontre && e.mod != null) {
        let fini = false;
        viser((att.x + cible.x) / 2, (att.y + cible.y) / 2);
        des.lancer({ titre: 'Jet d’attaque', sous: `${combat.U(e.de)?.nom ?? ''} · ${e.nomCap ?? ''} → ${combat.U(e.vers)?.nom ?? ''}`, qui: combat.U(e.de)?.nom,
          avantage: e.av === 1 ? 'avantage' : e.av === -1 ? 'desavantage' : null, raison: e.raison, valeurs: e.jets, grazeMax: e.coriace ? 12 : 9,
          mods: [{ nom: 'Maîtrise', val: e.mod }], auto: true }).then(() => { fini = true; });
        file.unshift({ ...e, jetMontre: true });
        return { duree: Infinity, maj() { if (fini) courant.s.duree = 0; } };
      }
      tourner(att, cible);
      att.anim = e.anim ?? 'attaque'; att.t = 0;
      coup = e.type === 'attaque' ? { de: e.de, vers: e.vers, resultat: e.resultat } : null;
      viser((att.x + cible.x) / 2, (att.y + cible.y) / 2);
      if (e.type === 'attaque' && !e.jetMontre) pourEcouteurs({ ...e, type: 'de' });
      // l'effet de la capacité : la scène dure jusqu'à ce que le coup arrive (les dégâts s'affichent après)
      const genre = att.camp === 'e' ? (e.anim === 'tir' ? 'tir' : ['brt', 'chef'].includes(att.type) ? 'lourd' : 'taille') : null;
      const d = e.type === 'attaque' ? effetsAttaque(fx, e.cap, att, cible, genre) : effetsLance(fx, e.cap, att, cible, e.cap === 'fioleCible' ? cible : null);
      // (effetsAttaque rend la fin de l'effet : l'impact est 0,05 s avant)
      const quand = Math.max(0.12, d - 0.05);
      let porte = e.type !== 'attaque';
      const toucher = () => {
        porte = true;
        const suite = file[0];
        if (suite?.type !== 'degats' || suite.id !== e.vers || !cible) return;
        suite.porte = true; coup = null;
        cible.anim = 'blesse'; cible.t = 0;
        impact(cible, att, suite.n, e.resultat, suite.pv <= 0);
        chiffre(cible, suite.n, e.resultat);
      };
      return { duree: Math.max(e.type === 'attaque' ? 0.6 : 0.45, d), maj(t) { if (!porte && t >= quand) toucher(); }, fin() { if (!porte) toucher(); att.anim = 'repos'; } };
    }
    case 'degats': {
      a.pv = e.pv; if (e.forme != null) a.formePv = e.forme;
      if (e.porte) return { duree: 0.2, maj() {}, fin() { if (!a.ko && !a.mort) a.anim = 'repos'; } };   // (déjà montré à l'impact)
      a.anim = a.ko || a.mort ? a.anim : 'blesse'; a.t = 0;
      const jet = coup?.vers === e.id ? coup : null; coup = null;
      const resultat = jet?.resultat ?? 'autre';
      impact(a, jet ? aff.get(jet.de) : null, e.n, resultat, e.pv <= 0);
      chiffre(a, e.n, resultat);
      return { duree: 0.32, maj() {}, fin() { if (!a.ko && !a.mort) a.anim = 'repos'; } };
    }
    case 'soin':
      a.pv = e.pv; flottant(a, `+${e.n}`, 'soin');
      fx.jouer('croix-soin', { x: a.x, y: a.y });
      if (e.potion) { fx.jouer('bulles-potion', { x: a.x, y: a.y }); fx.jouer('coeur', { x: a.x, y: a.y - 50, duree: 0.8 }); }
      return { duree: 0.3 };
    case 'ko': a.anim = 'tombe'; a.t = 0; if (a.camp === 'h') a.ko = true; else a.mort = true; return { duree: 0.55 };
    case 'ranime':
      a.ko = false; a.pv = e.pv; a.anim = 'repos'; flottant(a, `+${e.pv}`, 'soin');
      fx.jouer('colonne-doree', { x: a.x, y: a.y }); fx.jouer('croix-soin', { x: a.x, y: a.y, retard: 0.2 });
      return { duree: 0.5 };
    case 'releve': flottant(a, 'debout', 'info'); return { duree: 0.15 };
    // la Mue du Changepeau (ou la chute, ou quitter sa forme) : un éclat, un nuage de poussière, et l'autre corps
    case 'mue':
      fx.jouer('poussiere', { x: a.x, y: a.y }); fx.jouer('impact-dore', { x: a.x, y: a.y - 30 });
      a.eclair = 1; a.anim = 'repos'; a.t = 0;
      return { duree: 0.4, maj(t, k) { if (k >= 0.35 && a.forme !== (e.forme ?? null)) { a.forme = e.forme ?? null; if (e.forme) { a.formePv = e.pv; a.formeMax = e.max; flottant(a, NOMS_FORME[e.forme], 'info'); } } },
        fin() { a.forme = e.forme ?? null; if (e.forme) { a.formePv = e.pv; a.formeMax = e.max; } } };
    case 'forme': a.formePv = e.pv; flottant(a, `+${e.n} forme`, 'soin'); return { duree: 0.25 };
    // le Bond de la Bête : un saut en cloche jusqu'au contact de sa cible, de la poussière à l'arrivée
    case 'bond': {
      const dep = { x: a.x, y: a.y }, arr = { x: e.x * T, y: e.y * T }, c = aff.get(e.vers);
      tourner(a, c ?? arr); a.anim = 'attaque'; a.t = 0;
      return { duree: 0.42, maj(t, k) { a.x = dep.x + (arr.x - dep.x) * k; a.y = dep.y + (arr.y - dep.y) * k; a.saut = Math.sin(Math.PI * k) * 26; viser(a.x, a.y); },
        fin() { a.x = arr.x; a.y = arr.y; a.saut = 0; a.anim = 'repos'; fx.jouer('poussiere', { x: arr.x, y: arr.y }); if (c) { c.anim = 'blesse'; c.t = 0; fx.jouer('impact-etoile', { x: c.x, y: c.y - 24 }); } } };
    }
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
    // l'enclume de Baba : posée (sa chute est dans le film de la Chute d'Enclume), ou tirée par les Tenailles
    case 'enclume': {
      const p = { x: e.x * T, y: e.y * T };
      if (e.chute) { Object.assign(enclume, { x: p.x, y: p.y, cache: false }); return { duree: 0 }; }
      const tiree = films.de(enclume);
      if (tiree) return tirer(tiree, enclume, e.chemin.length ? e.chemin : [{ x: e.x, y: e.y }]);
      const dep = { x: enclume.x, y: enclume.y };
      return { duree: 0.35, maj(t, k) { enclume.x = dep.x + (p.x - dep.x) * k; enclume.y = dep.y + (p.y - dep.y) * k; }, fin() { enclume.x = p.x; enclume.y = p.y; } };
    }
    case 'tonneau': { const b = tonneaux.get(e.id); if (b) { b.cache = true; flottant(b, 'Huile !', 'info'); fx.jouer('verre-brise', { x: b.x, y: b.y }); fx.jouer('impact-lourd', { x: b.x, y: b.y }); } return { duree: 0.25 }; }
    case 'fourche': {        // un éboulis ferme chaque chemin perdu : des rochers entassés en travers, de bord à bord
      for (const r of e.tombe) {
        const w = Math.round((r.x1 - r.x0) * T) + 40, h = Math.round((r.y1 - r.y0) * T) + 24, c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        for (let y = 0, k = 0; y < h - 28; y += 11, k++) for (let x = (k % 2) * 9; x < w - 24; x += 15) {   // un tas de travers : des trous, des décalages, des tailles
          const hh = (x * 13 + y * 7 + k * 5) % 17; if (hh < 3) continue;
          const t = 22 + (hh % 3) * 5; g.drawImage(images.roche, x + (hh % 7) - 3, y + (hh % 5) - 2, t, t);
        }
        const s = rendu.sprite(c, `tombe-${tombes.length}`, w, h);
        s.poser(r.x0 * T - 20, r.y0 * T - 12 - 240, r.y1 * T);
        tombes.push(s); chutes.push({ s, x: r.x0 * T - 20, y: r.y0 * T - 12, pied: r.y1 * T });
        for (let k = 0; k < 3; k++) fx.jouer('poussiere', { x: ((r.x0 + r.x1) / 2) * T + (k - 1) * 14, y: r.y1 * T - k * 20, retard: 0.45 + k * 0.08 });
      }
      secousse.a = Math.max(secousse.a, 9); secousse.t = 0;
      return { duree: 0.9, maj(t, k) { const e = Math.min(1, k / 0.55); for (const o of chutes) o.s.poser(o.x, o.y - 240 * (1 - e * e), o.pied); }, fin() { for (const o of chutes) o.s.poser(o.x, o.y, o.pied); chutes.length = 0; } };
    }
    case 'porte': {          // la herse se lève (vie.js) ; la caméra regarde la porte
      const p = niveauPlan?.troncon?.portes?.find((o) => o.id === e.id);
      VIE.porte(e.id);
      if (p) { viser(((p.x0 + p.x1) / 2) * T, (p.y1 + 2) * T); fx.jouer('poussiere', { x: ((p.x0 + p.x1) / 2) * T, y: p.y1 * T }); }
      pourEcouteurs(e);
      return { duree: 1.7 };
    }
    case 'curiosite': {      // un clin d'œil : le canard saute, la statue hurle, le rat file
      const o = VIE.curiosite(e);
      if (o) flottant({ x: o.x, y: o.y + 40 }, e.coin ? (e.n ? 'Coin coin !' : 'Coin !') : e.hurle ? 'Aouuuh…' : e.fuite ? '!' : `+${e.n} Caillasse`, e.n ? 'soin' : 'info');
      pourEcouteurs(e);
      return { duree: e.fuite ? 0.4 : 0.25 };
    }
    case 'fuite': {          // les ennemis d'un combat fini s'enfuient vers l'est, et disparaissent
      const qui = e.ids.map((id) => aff.get(id)).filter(Boolean), dep = qui.map((o) => ({ x: o.x, y: o.y }));
      return { duree: 0.7, maj(t, k) { qui.forEach((o, i) => { o.x = dep[i].x + k * 3 * T; o.dir = 'droite'; o.anim = 'marche'; }); },
        fin() { for (const o of qui) { o.cache = true; o.anim = 'repos'; } } };
    }
    case 'herse': {          // la herse monte (la garde entre en combat) ou tombe (le treuil)
      VIE.herse(e.id, e.levee);
      const p = niveauPlan?.troncon?.portes?.find((o) => o.id === e.id);
      if (p) { viser(((p.x0 + p.x1) / 2) * T, (p.y1 + 1) * T); if (!e.levee) { secousse.a = Math.max(secousse.a, 8); secousse.t = 0; fx.jouer('impact-lourd', { x: ((p.x0 + p.x1) / 2) * T, y: (p.y1 + 1) * T, retard: 0.15 }); fx.jouer('poussiere', { x: ((p.x0 + p.x1) / 2) * T, y: (p.y1 + 1.2) * T, retard: 0.15 }); } }
      return { duree: e.levee ? 0.8 : 0.45 };
    }
    case 'levier': {         // un objet du combat : la corde, la vanne, le treuil
      const z = e.zone, cx = ((z.x0 + z.x1) / 2) * T, cy = ((z.y0 + z.y1) / 2) * T;
      viser(cx, cy);
      if (e.sorte === 'corde') { if (pont) pont.visible = false; secousse.a = Math.max(secousse.a, 7); secousse.t = 0; for (let k = 0; k < 4; k++) fx.jouer('couronne-eau', { x: cx + (k - 1.5) * 26, y: cy + ((k % 2) - 0.5) * 30, retard: k * 0.06 }); }
      if (e.sorte === 'vanne') for (let k = 0; k < 6; k++) fx.jouer('couronne-eau', { x: z.x0 * T + (k + 0.5) * ((z.x1 - z.x0) * T / 6), y: cy, retard: k * 0.05 });
      pourEcouteurs(e);
      return { duree: 0.6 };
    }
    case 'tonneau-pose': { const b = { x: e.x * T, y: e.y * T, s: rendu.sprite(images.tonneau, 'tonneau', 32, 64), cache: false }; tonneaux.set(e.id, b); fx.jouer('poussiere', { x: b.x, y: b.y }); return { duree: 0.25 }; }
    case 'fouille': case 'de': {      // un test (fouille, borne, piège, persuasion, glace) : le dé de cristal, puis le résultat annoncé
      const t = testDe(e), pour = e.type === 'de' ? { type: 'de', jets: [e.k], k: e.k, mod: null, resultat: e.k <= (e.seuil ?? 9) ? 'glisse' : 'tient', de: e.id, glace: true } : e;   // (la glace, comme avant, pour l'interface)
      if (!des || !t) { pourEcouteurs(pour); return { duree: e.type === 'de' ? 0.5 : 0 }; }
      let fini = false;
      const qui = combat.U(e.id);
      des.lancer({ titre: t.titre, sous: `${qui?.nom ?? ''} · ${t.sous} · DD ${t.dd}`, qui: qui?.nom, valeurs: [e.k], grazeMax: t.dd - 1, mods: [],
        paliers: { fumble: { nom: 'Échec critique', effet: t.ko }, graze: { nom: 'Raté', effet: t.ko }, hit: { nom: 'Réussi', effet: t.ok }, crit: { nom: 'Réussite éclatante', effet: t.ok } }, auto: true }).then(() => { fini = true; });
      return { duree: Infinity, maj() { if (fini) courant.s.duree = 0; }, fin() { pourEcouteurs({ ...pour, deJoue: true }); } };
    }
    case 'perception': flottant(a, e.ok ? `Perception ${e.k} : quelque chose !` : `Perception ${e.k}`, e.ok ? 'soin' : 'info'); return { duree: 0 };
    case 'trouvaille': VIE.cueilli(e.id); return { duree: 0.3 };
    case 'charge': viser(((e.x0 + e.x1) / 2) * T, ((e.y0 + e.y1) / 2) * T); pourEcouteurs(e); return { duree: 0.7 };
    case 'brasero': { const b = braseros.get(e.id); if (b) { b.renverse = true; fx.jouer('poussiere', { x: b.x, y: b.y }); } return { duree: 0.3 }; }
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
    case 'agit': marques.actif = e.id; dessinerMarques(); viser(a.x, a.y); return { duree: 0.25 };
    case 'combo': {
      const A = aff.get(e.a), B = aff.get(e.b), ici = dernierImpact ?? (B ? { x: B.x, y: B.y } : null);
      if (!A || !B || !ici) { pourEcouteurs(e); return { duree: 0.7 }; }
      ralenti.k = 0.35; ralenti.reste = 0.55; secousse.a = Math.max(secousse.a, 10); secousse.t = 0;
      viser(ici.x, ici.y);
      fx.jouer('impact-dore', { x: ici.x, y: ici.y - 24 }); fx.jouer('impact-dore', { x: ici.x - 14, y: ici.y - 34, retard: 0.08 }); fx.jouer('impact-dore', { x: ici.x + 14, y: ici.y - 14, retard: 0.16 });
      fx.jouer('impact-etoile', { x: ici.x, y: ici.y - 50, retard: 0.05 });
      fx.jouer('colonne-doree', { x: A.x, y: A.y }); fx.jouer('colonne-doree', { x: B.x, y: B.y, retard: 0.1 });
      const ecran = versEcran(ici.x, ici.y - 40);
      pourEcouteurs({ ...e, ecran });
      return { duree: 1.15, maj(t, k) { marques.lienCombo = { a: { x: A.x, y: A.y - 26 }, b: { x: B.x, y: B.y - 26 }, i: ici, k }; dessinerMarques(); },
        fin() { marques.lienCombo = null; dessinerMarques(); } };
    }
    default: pourEcouteurs(e); return { duree: 0 };
  }
}
// Les tests qui passent par le panneau de jet : ce qu'ils sont, leur DD, ce qui se passe selon le résultat
function testDe(e) {
  if (e.type === 'de') return e.quoi === 'glace' ? { titre: 'Jet d’équilibre', sous: 'sur la glace', dd: (e.seuil ?? 9) + 1, ok: 'Il garde l’équilibre', ko: 'Il glisse : À terre' } : null;
  if (e.dd == null) return null;
  if (e.persuasion) return { titre: 'Jet de persuasion', sous: 'négocier avec les bandits', dd: e.dd, ok: 'Ils acceptent le passage', ko: 'Ils refusent' };
  if (e.piege) return { titre: 'Jet de prudence', sous: 'le piège du chariot', dd: e.dd, ok: 'Piège désamorcé', ko: `Le piège claque : ${e.degats ?? 0} dégâts` };
  if (e.borne) return { titre: 'Jet de la vieille borne', sous: 'toucher la borne', dd: e.dd, ok: `+${e.n} Caillasse`, ko: 'Rien ne se passe' };
  return { titre: 'Jet de perception', sous: 'fouiller', dd: e.dd, ok: `+${e.n} Caillasse`, ko: 'Rien trouvé' };
}
function pourEcouteurs(e) { for (const f of ecouteurs) f(e); }

// --- Baba Brisenclume : ses animations validées (films.js) -----------------------------------------------------------
// Chaque capacité joue sa scène verrouillée ; la file reprend quand le coup porte (l'image « impact »), le film continue.
function sceneBaba(e) {
  const b = aff.get(e.type === 'attaque' ? e.de : e.id);
  if (e.type === 'attaque' && e.cap === 'marteau') {
    const c = aff.get(e.vers);
    pourEcouteurs({ ...e, type: 'de' });
    viser((b.x + c.x) / 2, (b.y + c.y) / 2);
    return { duree: Math.max(0.5, films.jouer('marteau', { baba: b, cible: c }).impact + 0.05) };
  }
  if (e.type === 'attaque' && e.cap === 'chuteEnclume') { pourEcouteurs({ ...e, type: 'de' }); return { duree: 0.5 }; }   // (le film tourne déjà)
  if (e.type !== 'lance') return null;
  if (e.cap === 'chuteEnclume') {
    const p = { x: e.x * T, y: e.y * T };
    viser(p.x, p.y - 30);
    return { duree: films.jouer('chute-enclume', { baba: b, cible: p }).impact };
  }
  if (e.cap === 'tenailles') {
    const c = e.vers === 'enclume' ? enclume : aff.get(e.vers);
    viser((b.x + c.x) / 2, (b.y + c.y) / 2);
    return { duree: films.jouer(e.vers === 'enclume' ? 'tenailles-enclume' : 'tenailles', { baba: b, cible: c }).impact };
  }
  if (e.cap === 'lameArdente' || e.cap === 'trempe') {
    // il se tourne vers son enclume (la scène la fait apparaître devant lui, là où elle est) ; l'allié, au contact, reçoit
    // le feu ou le bouclier où qu'il soit (la traînée s'étire jusqu'à lui)
    const c = aff.get(e.vers), soi = c === b;
    viser(b.x, b.y);
    return { duree: films.jouer(e.cap === 'lameArdente' ? 'lame-ardente' : 'trempe', { baba: b, cible: c, vers: enclume, sansMilieu: soi }).impact };
  }
  return null;
}
// une cible tirée par les Tenailles : elle avance de son chemin au rythme des à-coups du film (jusqu'au dernier)
function tirer(film, cible, chemin, pendant = () => {}, apres = () => {}) {
  const dep = { x: cible.x, y: cible.y }, pts = chemin.map((p) => ({ x: p.x * T, y: p.y * T })), fin = pts[pts.length - 1] ?? dep;
  const F = film.F, dernier = F.tire[F.tire.length - 1] + 2, reste = Math.max(0.05, (dernier - (films.image(film) ?? dernier)) / 12);
  return { duree: reste, maj() {
    const f = films.image(film), k = f == null ? 1 : traction(F, f);
    cible.x = dep.x + (fin.x - dep.x) * k; cible.y = dep.y + (fin.y - dep.y) * k; pendant();
  }, fin() { cible.x = fin.x; cible.y = fin.y; apres(); } };
}

// --- Les textes qui montent (dégâts, soins, « Raté ! ») ----------------------------------------------------------
const flottants = [];
function flottant(a, texte, genre, haut = 0) {
  if (!a) return;
  const el = Object.assign(document.createElement('div'), { className: `flottant ${genre}`, textContent: texte });
  document.body.append(el);
  flottants.push({ el, x: a.x, y: a.y - 58 - haut, t: 0 });   // (au-dessus de la tête ; la barre de vie est sous les pieds)
}

// le chiffre des dégâts (et « Critique ! » au-dessus)
function chiffre(a, n, resultat) {
  flottant(a, `−${n}`, `degats ${resultat}`);
  if (resultat === 'critique') flottant(a, 'Critique !', 'critique-titre');
}
// Un coup porte sur `a` (venu de `att`, s'il y en a un) : l'arrêt sur image, la secousse, l'éclair, le recul, et les
// extras du style (étincelles, traits, éclair de l'écran, zoom, ralenti, voile).
function impact(a, att, n, resultat, tombe) {
  const S = STYLES[style], r = S[resultat] ?? S.autre, poids = Math.min(1.5, 0.6 + n / 25);   // 10 dégâts ≈ 1, 22 ≈ 1,5
  gel = Math.max(gel, r.gel * (tombe ? 1.6 : 1));
  a.eclair = 1;
  for (const id of r.etincelles ?? []) fx.jouer(id, { x: a.x, y: a.y - 26 });
  if (calme) return;
  const ech = Math.max(0.5, canvas.clientWidth / rendu.vue.w);             // px d'écran par px du monde
  secousse.a = Math.max(secousse.a, Math.min(SECOUSSE_MAX, r.secousse * poids * ECRAN) * lire('feel.secousse') / ech); secousse.t = 0;
  if (att) {
    const dx = a.x - att.x, dy = a.y - att.y, l = Math.hypot(dx, dy) || 1;
    a.recul = { x: dx / l, y: dy / l, n: Math.min(RECUL_MAX, r.recul * poids * ECRAN / ech) * lire('feel.recul'), t: 0 };
  }
  if (r.ralenti) { ralenti.k = r.ralenti.k; ralenti.reste = r.ralenti.d; }
  if (r.flash || r.traits || r.voile || r.zoom) {
    Object.assign(ecran, { cible: a, t: 0, flash: r.flash ?? 0, traits: r.traits ?? 0, voile: r.voile ?? 0, zoom: r.zoom ?? 0,
      tenue: r.gel * (tombe ? 1.6 : 1) + (r.ralenti?.d ?? 0) });
  }
}
// chaque image (en temps réel) : l'éclair de l'écran, les traits, le voile, le zoom, autour de la cible
function poserEcran(dt) {
  if (!voile) return;
  ecran.t += dt;
  const t = ecran.t, actif = ecran.cible && t < ecran.tenue + 0.6;
  voile.hidden = !actif;
  if (!actif) { if (canvas.style.transform) canvas.style.transform = ''; return; }
  const p = versEcranBrut(ecran.cible.x, ecran.cible.y - 28);
  const sortie = (d) => Math.max(0, 1 - Math.max(0, t - ecran.tenue) / d);      // tenu pendant l'arrêt, puis s'efface en d
  voile.style.setProperty('--x', `${p.x}px`); voile.style.setProperty('--y', `${p.y}px`);
  voile.style.setProperty('--flash', String(ecran.flash * Math.max(0, 1 - t / 0.14)));
  voile.style.setProperty('--traits', String(ecran.traits * Math.min(1, t / 0.03) * sortie(0.25)));
  voile.style.setProperty('--tour', `${(t * 40) % 360}deg`);
  voile.style.setProperty('--voile', String(ecran.voile * Math.min(1, t / 0.12) * sortie(0.45)));
  const z = ecran.zoom * Math.min(1, t / 0.07) * sortie(0.35) ** 2;
  canvas.style.transformOrigin = `${p.x}px ${p.y}px`;
  canvas.style.transform = z > 0.001 ? `scale(${1 + z})` : '';
}
// le décalage du recul (px) : la cible part en arrière et revient, en 0,22 s
function decalageRecul(a, dt) {
  const r = a.recul; if (!r) return null;
  r.t += dt;
  const k = r.t / 0.22;
  if (k >= 1) { a.recul = null; return null; }
  const d = r.n * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k * 0.3);
  return { x: r.x * d, y: r.y * d * 0.5 };
}
// l'éclair blanc : le matériau du personnage éclairci (la couleur multiplie l'image), puis il revient en 0,12 s
function teinter(a, base = 1) {
  const e = Math.max(0, a.eclair ?? 0), v = base * (1 + e * 3.5);
  for (const sp of [a.s64, a.grand]) {
    if (!sp) continue;
    const m = sp.mesh.material;
    if (m.userData.teinte !== v) { m.color.setScalar(v); m.userData.teinte = v; }
  }
}
function versEcranBrut(x, y) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  return { x: ((x - rendu.cam.x) / rendu.vue.w) * w, y: ((y - rendu.cam.y) / rendu.vue.h) * h };
}
export function versEcran(x, y) {
  const r = canvas.getBoundingClientRect();
  return { x: r.left + ((x - rendu.cam.x) / rendu.vue.w) * r.width, y: r.top + ((y - rendu.cam.y) / rendu.vue.h) * r.height };
}

// --- Les barres de vie ------------------------------------------------------------------------------------------
// Une barre : la jauge (les PV écrits dedans), et dessous une rangée d'icônes d'états. Pas de cadre, pas de nom.
function creerPlaque(u) {
  const el = Object.assign(document.createElement('div'), { className: `plaque-vie ${u.camp === 'h' ? 'allie' : u.camp === 'p' ? 'allie pnj' : 'ennemi'}`, hidden: true });
  const barre = Object.assign(document.createElement('span'), { className: 'pv-barre' }), plein = Object.assign(document.createElement('span'), { className: 'pv-plein' });
  const chiffre = Object.assign(document.createElement('span'), { className: 'pv-chiffre' });
  const etats = Object.assign(document.createElement('span'), { className: 'pv-etats' });
  barre.append(plein, chiffre);
  el.append(barre, etats);
  el.dataset.id = u.id;
  calquePlaques.append(el);
  const intention = Object.assign(document.createElement('div'), { className: 'intention-terrain', hidden: true });   // ce qu'il va faire (un ennemi)
  calquePlaques.append(intention);
  return { el, barre, plein, chiffre, etats, intention, texteIntention: '', pv: null, ko: null, cle: '' };
}
// Les barres de vie (réglage « Ressenti ») : toujours (V et Maj+V les cachent par camp), au survol (survolé, choisi, ciblé, qui agit), ou jamais.
const plaqueVisible = (a) => {
  const mode = lire('feel.barres');
  if (!plaques[a.camp === 'p' ? 'h' : a.camp] || a.cache || a.mort || mode === 2) return false;
  return mode === 0 || a.id === marques.survolCible || a.id === marques.selection || a.id === marques.actif || !!marques.cibles?.includes(a.id);
};
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
const INTENTION = { frappe: (c) => `Frappe ${c}`, tire: (c) => `Tire sur ${c}`, recharge: () => 'Recharge', garde: () => 'En garde : Charge au tour suivant', charge: () => 'Charge !', passe: () => 'Passe son tour', ordres: () => 'Donne ses ordres', zone: () => 'Frappe une zone' };
let groupesIntention = new Map();        // les intentions pareilles et voisines (une nuée de rats) : une seule étiquette, « ×3 »
function grouperIntentions() {
  const vus = []; groupesIntention = new Map();
  for (const a of aff.values()) {
    const o = combat.U(a.id)?.intention; if (!o || a.mort) continue;
    const cle = `${o.quoi}:${o.cible}`, g = vus.find((v) => v.cle === cle && Math.hypot(v.a.x - a.x, v.a.y - a.y) < 1.6 * T);
    if (g) { g.n++; groupesIntention.set(a.id, null); } else { const v = { cle, a, n: 1 }; vus.push(v); groupesIntention.set(a.id, v); }
  }
}
function poserIntention(a, u) {           // au-dessus de la tête, pendant la phase des héros : ce que l'ennemi fera, et à qui
  const g = groupesIntention.get(a.id);
  const i = a.plaque.intention, o = u?.intention, voir = !!o && !!g && combat.S.phase === 'heros' && !occupe() && !a.mort && !a.cache;
  if (i.hidden === voir) i.hidden = !voir;
  if (!voir) return;
  const texte = (INTENTION[o.quoi]?.(combat.U(o.cible)?.nom ?? '…') ?? '') + (g.n > 1 ? ` ×${g.n}` : '');
  if (texte !== a.plaque.texteIntention) { a.plaque.texteIntention = texte; i.textContent = texte; i.className = `intention-terrain ${o.quoi}`; }
  const e = versEcran(a.x, a.y - 66 * (a.meta.echelle ?? 1));
  i.style.transform = `translate(${Math.round(e.x)}px, ${Math.round(e.y)}px) translate(-50%, -100%)`;
}
function poserPlaque(a) {
  poserIntention(a, combat.U(a.id));
  if (combat.U(a.id)?.cache) { a.plaque.el.hidden = true; return; }
  const p = a.plaque, etats = a.cache || a.mort ? [] : etatsPlaques.get(a.id) ?? [];
  const barre = plaqueVisible(a), voir = barre || etats.length > 0;
  if (p.el.hidden === voir) p.el.hidden = !voir;
  if (!voir) return;
  if (p.barre.hidden === barre) p.barre.hidden = !barre;
  const forme = a.forme && !a.ko ? `${a.formePv}/${a.formeMax}` : '';
  if (p.pv !== a.pv || p.ko !== a.ko || p.forme !== forme) {
    p.pv = a.pv; p.ko = a.ko; p.forme = forme;
    const k = forme ? Math.max(0, Math.min(1, a.formePv / a.formeMax)) : Math.max(0, Math.min(1, a.pv / a.pvMax));
    p.plein.style.width = `${Math.round(k * 100)}%`;
    p.el.classList.toggle('bas', !forme && k <= 0.3);
    p.el.classList.toggle('forme', !!forme);
    p.el.classList.toggle('ko', a.ko);
    p.chiffre.textContent = a.ko ? 'KO' : forme || `${Math.max(0, a.pv)}/${a.pvMax}`;
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
export function update(dtReel) {
  const dt = (gel > 0 ? 0 : ralenti.reste > 0 ? dtReel * ralenti.k : dtReel) * lire('anim.vitesse');   // (le réglage « vitesse des animations » : ×1 par défaut)
  if (gel > 0) gel = Math.max(0, gel - dtReel); else ralenti.reste = Math.max(0, ralenti.reste - dtReel);
  temps += dt;
  // la file
  if (!courant && file.length) {
    const e = file.shift(), s = scene(e) ?? { duree: 0 };
    if (e.type === 'phase') phaseVue = e.phase;
    courant = { e, s, t: 0 };
    if (!s.duree) { s.maj?.(0, 1); s.fin?.(); courant = null; }
  }
  if (courant) {
    courant.t += dt * (phaseVue === 'ennemis' ? lire('ennemis.vitesse') : 1);   // la marche et les pauses des ennemis, plus vives ou plus lentes
    const k = Math.min(1, courant.t / courant.s.duree);
    courant.s.maj?.(courant.t, k);
    if (k >= 1) { courant.s.fin?.(); courant = null; if (!file.length && marques.actif) { marques.actif = null; dessinerMarques(); } }
  }
  if (!occupe()) resynchroniser();
  // le feu crépite
  if (temps > prochainFeu) { prochainFeu = temps + 0.16; if (feuPresent()) redessinerSurfaces(temps); }
  // la caméra glisse vers sa cible
  glisserZoom(dt);
  if (camCine) { camCine.t = Math.min(camCine.duree, camCine.t + dt); const k = camCine.t / camCine.duree, e = k * k * (3 - 2 * k); cam.cx = camCine.de.x + (camCine.vers.x - camCine.de.x) * e; cam.cy = camCine.de.y + (camCine.vers.y - camCine.de.y) * e; }
  else if (cam.cible && !cam.glisse) { cam.cx += (cam.cible.x - cam.cx) * Math.min(1, dt * 5); cam.cy += (cam.cible.y - cam.cy) * Math.min(1, dt * 5); }
  bornerCamera();
  let ox = 0, oy = 0;
  if (secousse.a > 0) {
    secousse.t += dtReel;
    const k = Math.max(0, 1 - secousse.t / lire('feel.secousseDuree')), amp = secousse.a * k * k;
    ox = (Math.random() * 2 - 1) * amp; oy = (Math.random() * 2 - 1) * amp;
    if (k <= 0) secousse.a = 0;
  }
  rendu.viser(cam.cx - rendu.vue.w / 2 + ox, cam.cy - rendu.vue.h / 2 + oy);
  poserEcran(dtReel);
  // les états sous les barres : relus quand la file est vide (ils apparaissent quand le coup a porté)
  if (!occupe()) etatsPlaques = new Map(combat.S.unites.map((u) => [u.id, etatsActifs(u)]));
  // les personnages
  grouperIntentions();
  for (const a of aff.values()) {
    a.t += dt;
    if (a.eclair > 0) a.eclair = Math.max(0, a.eclair - dt / 0.12);
    const r = decalageRecul(a, dt);
    if (r) { a.x += r.x; a.y += r.y; }
    poserPerso(a);
    poserPlaque(a);
    if (r) { a.x -= r.x; a.y -= r.y; }
  }
  for (const b of tonneaux.values()) { b.s.cacher(b.cache); if (!b.cache) b.s.poser(b.x - 16, b.y - 50, b.y); }
  for (const b of braseros.values()) b.s.poser(b.x - 16, b.y - 60, b.y, (b.renverse ? 4 : Math.floor(temps * 8) % 4) * 32, 0);
  if (enclume) {
    const cachee = enclume.cache || FILMS_ENCLUME.some((id) => films.actif(id));
    enclume.s.cacher(cachee);
    if (!cachee) enclume.s.poser(enclume.x - ENCLUME_FILM.w / 2, enclume.y - ENCLUME_FILM.h, enclume.y);
  }
  // les états en boucle sur les créatures : relus quand la file est vide (ils apparaissent quand le coup a porté)
  if (!occupe()) etatsVus = new Map(combat.S.unites.filter((u) => !u.mort).map((u) => [u.id, ETATS.filter(([k]) => (k === 'expose' ? u.expose : u.st[k]))]));
  for (const [id, liste] of etatsVus) {
    const a = aff.get(id); if (!a || a.cache || a.mort) continue;
    for (const [k, brique, dy] of liste) if (!(a.ko && k !== 'aTerre')) fx.garder(`${id}:${k}`, brique, a.x, a.y + dy);
  }
  fx.update(dt);
  VIE.update(dt);
  // les films de Baba, et leur secousse de l'écran
  const [sx, sy] = films.update(dt);
  if (sx || sy) rendu.viser(cam.cx - rendu.vue.w / 2 + ox - sx, cam.cy - rendu.vue.h / 2 + oy - sy);   // (avec la secousse des coups)
  for (let k = flottants.length - 1; k >= 0; k--) {
    const f = flottants[k]; f.t += dtReel;
    const p = versEcran(f.x, f.y - f.t * 30);
    f.el.style.left = `${p.x}px`; f.el.style.top = `${p.y}px`; f.el.style.opacity = String(Math.max(0, 1 - Math.max(0, f.t - 0.6) / 0.5));
    if (f.t > 1.1) { f.el.remove(); flottants.splice(k, 1); }
  }
}

function poserPerso(a) {
  const k = a.meta.echelle ?? 1;                    // (le gardien de la porte : une fois et demie plus grand, les pieds au même endroit)
  if (a.chien) return void poserChien(a);
  const cache = a.cache || !!combat.U(a.id)?.cache;   // (caché, ou pas encore vu en exploration)
  if (a.formes) { for (const [f, sp] of Object.entries(a.formes)) if (f !== a.forme || cache || a.ko || a.mort) sp.cacher(true); }
  if (a.formes && a.forme && !cache && !a.ko && !a.mort) return void poserForme(a);
  if (cache) { a.s64.cacher(true); a.grand?.cacher(true); a.ombre.cacher(true); return; }
  const ligne = DIR[a.dir];
  let anim = a.anim, rang, col;
  let decale = 0;
  if (a.ko || a.mort || anim === 'tombe') { rang = ANIM.blesse[0]; col = anim === 'tombe' ? Math.min(5, Math.floor(a.t * 11)) : 5; }
  else if (anim === 'film' && a.film) {
    // Baba dans une de ses scènes validées : sa pose image par image (au repos : l'image debout de la marche, comme les esquisses)
    const p = a.film; decale = p.dx * (p.miroir ? -1 : 1);
    if (p.anim === 'repos') { rang = ANIM.marche[0] + ligne; col = 0; }
    else if (p.anim === 'blesse') { rang = ANIM.blesse[0]; col = Math.min(5, p.i); }
    else { rang = (ANIM[p.anim] ?? ANIM.attaque)[0] + ligne; col = p.i; }
  }
  else if (anim === 'marche') { rang = ANIM.marche[0] + ligne; col = 1 + (Math.floor(a.t * 10) % 8); }
  else if (anim === 'blesse') { rang = ANIM.blesse[0]; col = Math.min(2, Math.floor(a.t * 10)); }
  else if (anim === 'repos') { rang = ANIM.repos[0] + ligne; col = Math.floor(a.t * 1.6) % 2; }
  else {
    // une attaque : le bloc des grandes armes s'il y en a un pour cette animation, sinon la rangée LPC
    const bloc = a.meta.attaque, grandeArme = bloc && ((anim === 'attaque' && bloc.nom.startsWith('slash')) || (anim === 'estoc' && bloc.nom.startsWith('thrust')));
    if (grandeArme) {
      const s = bloc.taille, n = bloc.images, c = Math.min(n - 1, Math.floor(a.t * n / 0.45));
      a.s64.cacher(true); a.grand.cacher(false);
      a.grand.mesh.scale.set(k, k, 1);
      a.grand.poser(a.x - s / 2, a.y - 28 * k - s / 2 + a.enfonce * 20, a.y, c * s, bloc.y + ligne * s);
      a.ombre.cacher(false); a.ombre.poser(a.x, a.y - 1);
      teinter(a);
      return;
    }
    const [r0, n] = ANIM[anim] ?? ANIM.attaque;
    rang = r0 + ligne; col = Math.min(n - 1, Math.floor(a.t * n / 0.45));
  }
  a.grand?.cacher(true); a.s64.cacher(false);
  teinter(a);
  // plonge (le Pas dans l'ombre de Shadow) : il descend sous ses pieds, coupé au ras du sol
  const sous = Math.round((a.plonge ?? 0) * 60);
  a.s64.mesh.scale.set(k, k, 1);
  a.s64.poser(a.x - 32 + decale, a.y - 28 * k - 32 + a.enfonce * 26 + sous, a.y, col * 64, rang * 64, 64 - sous);
  a.ombre.cacher(a.enfonce > 0.3 || (a.plonge ?? 0) > 0.2); a.ombre.poser(a.x, a.y - 1);
}

// Une forme du Changepeau : sa face selon la direction ; elle respire au repos, rebondit en marchant, se jette en avant
// pour frapper, tremble quand elle est touchée.
function poserForme(a) {
  const sp = a.formes[a.forme];
  a.s64.cacher(true); a.grand?.cacher(true); sp.cacher(false);
  const v = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }[a.dir] ?? [0, 1];
  let dx = 0, dy = 0;
  if (a.anim === 'marche') dy = -Math.abs(Math.sin(a.t * 10)) * 3;
  else if (a.anim === 'blesse') dx = Math.sin(a.t * 60) * 2 * Math.max(0, 1 - a.t * 3);
  else if (a.anim === 'repos') dy = Math.round(Math.sin(a.t * 2.4));
  else { const k = Math.min(1, a.t / 0.45), l = Math.sin(Math.PI * Math.min(1, k * 1.6)) * 9; dx = v[0] * l; dy = v[1] * l * 0.6; }
  sp.poser(Math.round(a.x - 32 + dx), Math.round(a.y - 60 + dy - (a.saut ?? 0) + a.enfonce * 26), a.y, FACES_FORME[a.dir] * 64, 0);
  const m = sp.mesh.material, b = 1 + Math.max(0, a.eclair ?? 0) * 3.5;
  if (m.userData.teinte !== b) { m.color.setScalar(b); m.userData.teinte = b; }
  a.ombre.cacher(a.enfonce > 0.3); a.ombre.poser(a.x, a.y - 1);
}

// Le limier : sa planche à lui (4 rangées : la marche, colonnes 0 à 4 ; l'arrêt, colonne 5) ; à terre, terni.
function poserChien(a) {
  if (a.cache) { a.s64.cacher(true); a.ombre.cacher(true); return; }
  const col = a.anim === 'marche' ? Math.floor(a.t * 10) % 5 : 5;
  a.s64.cacher(false);
  a.s64.poser(a.x - 32, a.y - 62 + a.enfonce * 26, a.y, col * 64, LIGNES_CHIEN[a.dir] * 64);
  const m = a.s64.mesh.material, terni = a.ko || a.mort;
  if (terni) { if (m.userData.terni !== true) { m.color.setRGB(0.42, 0.42, 0.48); m.userData.terni = true; m.userData.teinte = null; } }   // (assombri, pas transparent : alphaTest)
  else { m.userData.terni = false; teinter(a); }
  a.ombre.cacher(a.enfonce > 0.3); a.ombre.poser(a.x, a.y - 1);
}

// Quand la file est vide, la vue colle à l'état du combat (au cas où une scène a été sautée).
function resynchroniser() {
  for (const u of combat.S.unites) {
    const a = aff.get(u.id); if (!a) continue;
    a.x = u.x * T; a.y = u.y * T; a.pv = u.pv; a.ko = u.ko; a.mort = u.mort;
    if (a.formes) { a.forme = u.forme?.id ?? null; a.formePv = u.forme?.pv ?? 0; a.formeMax = u.forme?.max ?? 0; a.saut = 0; }
    if (a.anim === 'tombe' && !u.ko && !u.mort) a.anim = 'repos';
  }
  for (const [id, b] of tonneaux) {
    const t = combat.S.tonneaux.find((o) => o.id === id);
    if (!t) b.cache = true; else { b.x = t.x * T; b.y = t.y * T; b.cache = false; }
  }
  for (const [id, b] of braseros) b.renverse = !!combat.S.braseros.find((o) => o.id === id)?.renverse;
  const e = combat.S.enclume;
  if (enclume) { if (!e) enclume.cache = true; else Object.assign(enclume, { x: e.x * T, y: e.y * T, cache: false }); }
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

export function dispose() { for (const f of flottants) f.el.remove(); calquePlaques?.remove(); films?.retirer(); voile?.remove(); canvas.style.transform = ''; VIE.dispose(); }

// Pour l'interface et les tests : l'état de la vue, sans y toucher.
export const api = {
  aff, tonneaux, braseros, get enclume() { return enclume; }, get films() { return films; }, cam, jouer, occupe, surEvenement, dessinerMarques, versEcran, viser, portrait, planche, redessinerSurfaces, remplacer, basculerPlaques, effets,
  get plaques() { return { ...plaques }; },
  get marques() { return marques; },
  versMonde: (cx, cy) => { const p = rendu.versMonde(cx, cy); return { x: p.x / T, y: p.y / T }; },
  // la créature (ou le tonneau) sous un point du monde (en cases) : on touche son corps, des pieds à la tête
  sous(x, y) {
    let best = null, bd = Infinity;
    for (const a of aff.values()) {
      if (a.cache || a.mort) continue;
      const k = a.meta.echelle ?? 1, ax = a.x / T, ay = a.y / T, haut = (a.ko ? 0.6 : 1.7) * k;
      if (Math.abs(x - ax) > 0.5 * k || y < ay - haut || y > ay + 0.3) continue;
      const d = Math.abs(x - ax) + Math.abs(y - (ay - haut / 2));
      if (d < bd) { bd = d; best = a.id; }
    }
    if (best) return best;
    for (const [id, b] of tonneaux) { if (!b.cache && Math.abs(b.x / T - x) < 0.5 && y > b.y / T - 1.2 && y < b.y / T + 0.2) return id; }
    for (const [id, b] of braseros) { if (!b.renverse && Math.abs(b.x / T - x) < 0.6 && y > b.y / T - 1.4 && y < b.y / T + 0.4) return id; }
    if (enclume && !enclume.cache && Math.abs(enclume.x / T - x) < 1 && y > enclume.y / T - 1.15 && y < enclume.y / T + 0.2) return 'enclume';
    return null;
  },
  zoomer, ajusterCamera, contact: CONTACT, vie: VIE.etat, cameraVers, placerCamera, libererCamera, exclamer,
  get ressenti() { return { style, styles: Object.keys(STYLES), gel, secousse: secousse.a, secousseEcran: secousse.a * (canvas.clientWidth / rendu.vue.w), ralenti: ralenti.reste, ecran: { ...ecran, cible: ecran.cible?.id ?? null }, calme }; },
};
