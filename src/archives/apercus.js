// Les aperçus animés des archives : chaque aperçu est un petit canevas qui joue une planche (un personnage LPC, une
// scène de Fraps, une brique d'animation), en pixels nets à une échelle entière. Une seule boucle pour tous ; un aperçu
// hors de l'écran ne se redessine pas. Le temps vient de l'horloge du jeu (dbg.advance le fait avancer en ?test).
import { ANIMS_LPC, DIRECTIONS } from './catalogue.js';

const images = new Map();
export function image(src) {
  let im = images.get(src);
  if (!im) { im = new Image(); im.src = src; images.set(src, im); }
  return im;
}
const prete = (im) => im.complete && im.naturalWidth > 0;

const apercus = new Set();
let visibles = null;
let temps = 0;

// Un aperçu : le canevas (sa taille CSS fixe la taille), et ce qu'il joue. Rend un objet qu'on peut régler ensuite.
//   joue : { genre: 'lpc' | 'bande' | 'rat' | 'planche', … } (voir cadreDe)
export function creerApercu(joue, { w = 128, h = 128, fond = 'herbe', classe = '' } = {}) {
  const canvas = Object.assign(document.createElement('canvas'), { className: `apercu ${classe}`.trim() });
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  canvas.width = w * dpr; canvas.height = h * dpr;
  const a = { canvas, joue, fond, t0: temps, pause: false, image: null, vu: true, dessine: -1, ancre: false };
  canvas.apercu = a;
  apercus.add(a);
  visibles?.observe(canvas);
  return a;
}
export function retirer(racine) { for (const a of [...apercus]) if (!a.canvas.isConnected || racine?.contains(a.canvas)) { apercus.delete(a); visibles?.unobserve(a.canvas); } }

// Quelle image montrer, et où la prendre dans la planche : { src, sx, sy, sw, sh, n (le numéro de l'image), total }
export function cadreDe(j, t) {
  if (j.genre === 'lpc') {
    if (j.anim === 'grande' && j.attaque) {
      const A = j.attaque, n = Math.floor(t * 12) % A.images, rang = DIRECTIONS.find((d) => d[0] === j.dir)?.[1] ?? 2;
      return { src: j.planche, sx: n * A.taille, sy: A.y + rang * A.taille, sw: A.taille, sh: A.taille, n, total: A.images };
    }
    const A = ANIMS_LPC[j.anim] ?? ANIMS_LPC.marche, boucle = A.images - A.debut;
    const n = A.debut + (Math.floor(t * (j.anim === 'marche' ? 10 : 12)) % boucle);
    const rang = A.rang + (A.face ? 0 : DIRECTIONS.find((d) => d[0] === j.dir)?.[1] ?? 2);
    return { src: j.planche, sx: n * 64, sy: rang * 64, sw: 64, sh: 64, n: n - A.debut, total: boucle };
  }
  if (j.genre === 'rat') {
    // 3 animaux x 4 directions (haut, droite, bas, gauche), 5 images de 32 px : la marche (3), puis la morsure (2)
    const ligne = j.espece * 4 + ({ haut: 0, droite: 1, bas: 2, gauche: 3 }[j.dir ?? 'bas']), n = Math.floor(t * 8) % 3;
    return { src: j.planche, sx: n * 32, sy: ligne * 32, sw: 32, sh: 32, n, total: 3 };
  }
  // une bande d'images côte à côte (le barde, une scène, une brique) ; une brique qui ne boucle pas marque une pause
  const pauseFin = j.boucle === false ? Math.max(4, Math.round(j.images * 0.6)) : 0, cycle = j.images + pauseFin;
  const k = j.image != null ? j.image : Math.floor(t * (j.fps ?? 12)) % cycle;
  if (k >= j.images) return { src: j.planche, vide: true, n: k, total: j.images };
  return { src: j.planche, sx: k * j.w, sy: 0, sw: j.w, sh: j.h, n: k, total: j.images };
}

const FONDS = { herbe: '#3f7a2c', terre: '#9a7448', nuit: '#2b1c1d', aucun: null };
function dessiner(a) {
  const c = cadreDe(a.joue, a.pause ? a.tFige ?? 0 : temps - a.t0);
  const g = a.canvas.getContext('2d'), W = a.canvas.width, H = a.canvas.height;
  g.imageSmoothingEnabled = false;
  const fond = FONDS[a.fond];
  if (fond) { g.fillStyle = fond; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H);
  a.cadre = c;
  if (c.vide) return;
  const im = image(c.src);
  if (!prete(im)) return;
  // la plus grande échelle entière qui tient (au moins 1), centrée ; un personnage a les pieds en bas
  const s = Math.max(1, Math.floor(Math.min(W / c.sw, H / c.sh)));
  const x = Math.round((W - c.sw * s) / 2), y = a.joue.genre === 'lpc' || a.joue.genre === 'rat' ? H - c.sh * s : Math.round((H - c.sh * s) / 2);
  g.drawImage(im, c.sx, c.sy, c.sw, c.sh, x, y, c.sw * s, c.sh * s);
  a.echelle = s;
  // l'ancre d'une brique (le point posé sur la scène) : une petite croix or
  if (a.ancre && a.joue.ancre) {
    const [ax, ay] = a.joue.ancre, px = x + ax * s, py = y + ay * s, r = Math.max(3, s * 2);
    g.fillStyle = '#ffd35a'; g.fillRect(px - r, py - Math.floor(s / 2), r * 2 + 1, Math.max(1, s)); g.fillRect(px - Math.floor(s / 2), py - r, Math.max(1, s), r * 2 + 1);
  }
}

// Chaque image du jeu : on avance le temps et on redessine les aperçus visibles (et ceux qui ont changé).
export function avancer(dt) {
  temps += dt;
  for (const a of apercus) {
    if (!a.canvas.isConnected) { apercus.delete(a); continue; }
    if (!a.vu) continue;
    dessiner(a);
  }
}
export function brancherVisibilite() {
  if (!('IntersectionObserver' in window)) return;
  visibles = new IntersectionObserver((entrees) => { for (const e of entrees) if (e.target.apercu) e.target.apercu.vu = e.isIntersecting; }, { rootMargin: '120px' });
  for (const a of apercus) visibles.observe(a.canvas);
}
export const etat = { get temps() { return temps; }, get nombre() { return apercus.size; }, apercus };
