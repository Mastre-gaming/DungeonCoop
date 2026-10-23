// Les cinématiques d'une aventure (le retour du propriétaire, 23 oct : « que le joueur comprenne ce qu'il se passe ») :
// des bandes noires, la caméra qui se déplace ou coupe (un fondu au noir), un titre, des répliques en bas de l'écran, des
// repères sur la carte. Les scènes sont des données : content/moments/chemin-de-la-tour.json (le gabarit de content/moments/depart.json) (les répliques marquées
// « brouillon » sont à réécrire par l'équipe, et s'affichent avec l'étiquette BROUILLON). Pendant une scène, le jeu ne
// prend plus les clics : un clic (ou Espace, Entrée) passe à la réplique suivante, Échap passe toute la scène.
// Le temps de la scène est celui du jeu (update(dt)) : ?test et les captures l'avancent avec dbg.advance.
import { T } from '../01_plan.js';
import { medaillon } from '../33_cadres.js';
import ETAL from './etal.json';

export const name = 'cinema';
export const always = true;
const FICHIERS = Object.values(import.meta.glob('../../content/moments/chemin-de-la-tour.json', { eager: true, import: 'default' }));
export const cinematiques = (id) => FICHIERS.find((f) => f.id === id) ?? null;

let vue, donnees = null, auto = false, images = null, grosT = 0, herosDuGroupe = () => [];
const portraits = new Map();       // un médaillon par locuteur, dessiné une fois
let scene = null;                 // { etapes, k, ctx, resoudre, attente, t }
const vues = new Set();           // les scènes déjà jouées (une fois par partie)
const dom = {};

export function init(game, options) {
  ({ vue } = options);
  images = options.images ?? null;
  herosDuGroupe = options.heros ?? (() => []);
  donnees = options.aventure ? cinematiques(options.aventure) : null;
  auto = !!options.auto;
  const el = (tag, cls) => Object.assign(document.createElement(tag), { className: cls });
  dom.racine = el('div', 'cinema-racine'); dom.racine.hidden = true;
  dom.haut = el('div', 'cinema-bande haut'); dom.bas = el('div', 'cinema-bande bas');
  dom.fondu = el('div', 'cinema-fondu');
  dom.titre = el('div', 'cinema-titre'); dom.titre.hidden = true;
  // la réplique : le dialogue du jeu, comme la réunion du départ (61_contrat.js) : le médaillon de celui qui parle, son nom,
  // le texte, et « Suivant » (un clic n'importe où fait pareil ; Échap passe la scène)
  dom.boite = el('div', 'dialogue cinema-dialogue'); dom.boite.hidden = true;
  dom.portrait = el('span', 'cinema-portrait');
  dom.qui = el('span', 'cinema-qui'); dom.tag = el('span', 'cinema-brouillon'); dom.tag.textContent = 'BROUILLON'; dom.texte = el('p', 'dial-texte');
  dom.bouton = el('button', 'bouton-jeu cinema-suivant'); dom.bouton.type = 'button'; dom.bouton.tabIndex = -1;       // (le clic remonte à la scène)
  dom.passer = el('span', 'cinema-passer'); dom.passer.textContent = 'Échap : passer la scène';
  const corps = el('div', 'dial-corps'), qui = el('p', 'dial-qui'), suite = el('div', 'cinema-suite');
  qui.append(dom.qui, dom.tag); suite.append(dom.passer, dom.bouton); corps.append(qui, dom.texte, suite); dom.boite.append(dom.portrait, corps);
  dom.marqueur = el('div', 'cinema-marqueur'); dom.marqueur.hidden = true;
  // le gros plan (pixel art, animé) : l'étal du colporteur, avec des étiquettes sur ce qu'il vend
  dom.gros = el('div', 'cinema-gros'); dom.gros.hidden = true;
  dom.grosCadre = el('div', 'cinema-gros-cadre'); dom.grosToile = Object.assign(el('canvas', 'cinema-gros-toile'), { width: 240, height: 150 });
  dom.grosCadre.append(dom.grosToile); dom.gros.append(dom.grosCadre);
  dom.racine.append(dom.fondu, dom.gros, dom.haut, dom.bas, dom.titre, dom.marqueur, dom.boite);
  dom.racine.addEventListener('click', suivant);       // (la scène couvre l'écran : un clic passe à la suite, le jeu dessous ne le reçoit pas)
  document.body.append(dom.racine);
  return api;
}

// Les trous des textes (comme content/moments/depart.json) : {heros}, {heros2}, {heros3}, {heros4}, {partants}
const noms = () => herosDuGroupe().map((h) => h.nom);
export function remplir(s) {
  const n = noms(), liste = n.length > 1 ? `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}` : n[0] ?? 'Les héros';
  return String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k === 'partants' ? liste : /^heros\d?$/.test(k) ? n[(Number(k.slice(5)) || 1) - 1] ?? n[0] ?? 'Un héros' : m));
}
// Celui qui parle : un héros du groupe ({heros2}…), le conteur, le colporteur ; chacun son médaillon (33_cadres.js)
function locuteur(qui) {
  const q = String(qui ?? 'Le conteur'), m = /^\{heros(\d?)\}$/.exec(q);
  const h = m ? herosDuGroupe()[(Number(m[1]) || 1) - 1] ?? herosDuGroupe()[0] : null;
  const cle = h ? `h:${h.type}` : q;
  if (!portraits.has(cle)) {
    let planche = null;
    if (h) planche = images?.[`perso_${h.type}`] ?? null;
    else if (q === 'Le colporteur' && images?.etal) {     // sa tête et son chapeau, pris sur son dessin de la carte
      const [sx, sy] = ETAL.etal_map_0, c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), g = c.getContext('2d');
      g.imageSmoothingEnabled = false; g.drawImage(images.etal, sx + 6, sy + 0, 44, 40, 12, 8, 44, 40); planche = c;
    }
    const cv = h || q === 'Le colporteur' ? medaillon(planche, planche && !h ? { ligne: 0, colonne: 0 } : undefined) : medaillon(null);
    cv.classList.add('cinema-medaillon'); portraits.set(cle, cv);
  }
  const cv = portraits.get(cle).cloneNode(true);
  cv.getContext('2d').drawImage(portraits.get(cle), 0, 0);
  return { nom: h ? h.nom : remplir(q), portrait: cv };
}

// Une scène : rend une promesse tenue quand elle est finie (ou passée). ctx : des points nommés pour la caméra
// (ennemis, brasero, branche-perdue…) et des actions (eboulis).
export function jouer(id, ctx = {}) {
  const etapes = donnees?.scenes?.[id];
  if (!etapes || vues.has(id)) return Promise.resolve(false);
  vues.add(id);
  if (scene) passer();
  return new Promise((resoudre) => {
    scene = { id, etapes, k: -1, ctx, resoudre, attente: null, t: 0 };
    document.body.classList.add('cinema');
    for (const c of document.querySelectorAll('.carte-victoire, .carte-combat')) c.remove();
    dom.racine.hidden = false; dom.racine.classList.remove('sort'); dom.racine.classList.add('entre');
    etapeSuivante();
  });
}
const point = (v, ctx) => (Array.isArray(v) ? { x: v[0], y: v[1] } : ctx[v] ?? null);

function etapeSuivante() {
  if (!scene) return;
  scene.k++; scene.t = 0;
  const e = scene.etapes[scene.k];
  if (!e) return finir();
  if (e.si && e.si !== scene.ctx.voie) return etapeSuivante();       // (une étape pour une seule branche de la fourche)
  dom.titre.hidden = true;
  if (e.camera) {
    const p = point(e.camera, scene.ctx);
    if (p) vue.cameraVers(p.x * T, p.y * T, e.duree ?? 1);
    dom.marqueur.hidden = true;
    scene.attente = { temps: e.duree ?? 1 };
  } else if (e.coupe) {
    const p = point(e.coupe, scene.ctx);
    dom.marqueur.hidden = true; dom.boite.hidden = true;
    dom.fondu.classList.add('noir');
    scene.attente = { temps: 0.75, mi: () => { if (p) vue.placerCamera(p.x * T, p.y * T); }, fin: () => dom.fondu.classList.remove('noir') };
  } else if (e.titre) {
    dom.boite.hidden = true;
    dom.titre.replaceChildren(Object.assign(document.createElement('strong'), { textContent: e.titre }), Object.assign(document.createElement('span'), { textContent: e.sous ?? '' }));
    dom.titre.hidden = false; dom.titre.classList.remove('frappe'); void dom.titre.offsetWidth; dom.titre.classList.add('frappe');
    scene.attente = { temps: auto ? 0.05 : 2.6, clic: true };
  } else if (e.texte) {
    const l = locuteur(e.qui);
    dom.qui.textContent = l.nom; dom.portrait.replaceChildren(l.portrait);
    dom.texte.textContent = remplir(e.texte); dom.tag.hidden = !e.brouillon;
    dom.bouton.textContent = scene.etapes.slice(scene.k + 1).some((x) => x.texte && !(x.si && x.si !== scene.ctx.voie)) ? 'Suivant' : 'Terminer';
    dom.boite.hidden = false; dom.boite.classList.remove('neuf'); void dom.boite.offsetWidth; dom.boite.classList.add('neuf');
    scene.attente = { clic: true, temps: auto ? 0.05 : Infinity };
  } else if (e.marqueur) {
    const p = e.marqueur.ou ? point(e.marqueur.ou, scene.ctx) : { x: e.marqueur.x, y: e.marqueur.y };
    if (p) { scene.marque = p; dom.marqueur.textContent = e.marqueur.texte; dom.marqueur.hidden = false; }
    scene.attente = { temps: 0 };
  } else if ('gros_plan' in e) {                      // le gros plan entre (« etal ») ou sort (null)
    dom.marqueur.hidden = true; scene.marque = null;
    if (e.gros_plan && images?.etal) { dom.gros.hidden = false; dom.gros.classList.remove('sort'); dom.gros.classList.add('entre'); grosT = 0; dessinerGros(); }
    else { dom.gros.classList.remove('entre'); dom.gros.classList.add('sort'); setTimeout(() => { if (!dom.gros.classList.contains('entre')) dom.gros.hidden = true; }, 350); }
    dom.grosCadre.querySelectorAll('.cinema-etiquette').forEach((n) => n.remove());
    scene.attente = { temps: e.gros_plan ? 0.8 : 0.3 };
  } else if ('etiquette' in e) {                      // une étiquette sur le gros plan : x, y en pixels de l'image (240 x 150)
    dom.grosCadre.querySelectorAll('.cinema-etiquette').forEach((n) => n.remove());
    if (e.etiquette) {
      const n = Object.assign(document.createElement('div'), { className: 'cinema-etiquette', textContent: e.etiquette.texte });
      n.style.left = `${(e.etiquette.x / 240) * 100}%`; n.style.top = `${(e.etiquette.y / 150) * 100}%`;
      if (e.etiquette.bas) n.classList.add('bas');
      dom.grosCadre.append(n);
    }
    scene.attente = { temps: 0 };
  } else if (e.eboulis) {
    scene.ctx.eboulis?.();
    scene.attente = { temps: 1.1 };
  } else scene.attente = { temps: e.attendre ?? 0 };
}
function dessinerGros() {                              // l'image du gros plan, 3 par seconde (le commerçant cligne, la lanterne se balance)
  if (!images?.etal || dom.gros.hidden) return;
  const [sx, sy, w, h] = ETAL[`etal_gros_${Math.floor(grosT * 3) % 4}`], g = dom.grosToile.getContext('2d');
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, w, h); g.drawImage(images.etal, sx, sy, w, h, 0, 0, w, h);
}
function finir() {
  const s = scene; scene = null;
  dom.gros.classList.remove('entre'); dom.gros.hidden = true;
  dom.boite.hidden = true; dom.titre.hidden = true; dom.marqueur.hidden = true; dom.fondu.classList.remove('noir');
  dom.racine.classList.remove('entre'); dom.racine.classList.add('sort');
  document.body.classList.remove('cinema');
  setTimeout(() => { if (!scene) dom.racine.hidden = true; }, 400);
  vue.libererCamera();
  s?.resoudre(true);
}
// Un clic : la réplique suivante (ou le titre) ; Échap : toute la scène (les actions qu'elle devait faire sont faites).
export function suivant() { if (scene?.attente?.clic) etapeSuivante(); }
export function passer() {
  if (!scene) return;
  for (let k = scene.k + 1; k < scene.etapes.length; k++) if (scene.etapes[k].eboulis) scene.ctx.eboulis?.();
  const der = [...scene.etapes].reverse().find((e) => e.camera || e.coupe);
  const p = der ? point(der.camera ?? der.coupe, scene.ctx) : null;
  if (p) vue.placerCamera(p.x * T, p.y * T);
  finir();
}
export const actif = () => !!scene;

export function update(dt) {
  if (!dom.gros?.hidden) { grosT += dt; dessinerGros(); }
  if (!scene) return;
  const a = scene.attente;
  if (scene.marque && !dom.marqueur.hidden) {
    const e = vue.versEcran(scene.marque.x * T, scene.marque.y * T);
    dom.marqueur.style.left = `${Math.round(e.x)}px`; dom.marqueur.style.top = `${Math.round(e.y)}px`;
  }
  if (!a) return;
  scene.t += dt;
  if (a.mi && scene.t >= a.temps / 2) { a.mi(); a.mi = null; }
  if (scene.t >= a.temps) { a.fin?.(); etapeSuivante(); }
}
export function dispose() { dom.racine?.remove(); }
export const api = { jouer, suivant, passer, actif, vues, get donnees() { return donnees; }, get scene() { return scene ? { id: scene.id, k: scene.k } : null; } };
