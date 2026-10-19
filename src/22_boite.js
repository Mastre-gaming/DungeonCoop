// La boîte aux lettres du camp (CAMP §8 bis ; dessinée à part : design/camp/outils/boite_lettres.py).
// Une boîte en bois sur un poteau, près du feu. Deux images de 32 x 48 : vide (drapeau baissé), et nouveau message
// (drapeau levé, une lettre dépasse). Quand des messages de l'équipe ne sont pas lus (l'événement
// « messagerie:nonlus » de la messagerie), son drapeau se lève et un « ! » doré apparaît au-dessus.
// Un clic sur elle, ou E devant elle, ouvre la messagerie sur le HUD.

export const name = 'boite';
export const always = true;

const T = 32;
// À côté du tableau d'affichage (demande du propriétaire, 19 oct), sur l'herbe à gauche du petit panneau épinglé,
// hors des sentiers et hors de l'emprise du tableau (qui commence à la case 25).
export const POSTE = { x: 24.6 * T, y: 16.5 * T };
const IMAGE = './assets/lpc/boite_lettres.png';

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; n.setAttribute(k, v === true ? '' : v); }
  for (const e of enfants.flat()) if (e != null) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, rendu, heros, collision, ouvrirMessages, visite, sprite = null, ombre, excl, bulle, nonLus = 0, obstacle;

export function init(g, options) {
  game = g;
  ({ rendu, heros, collision, ouvrirMessages, visite } = options);
  obstacle = { x: POSTE.x - 5, y: POSTE.y - 7, w: 10, h: 7 };   // le poteau
  collision.ajouter(obstacle);
  ombre = rendu.ombre(14, 3);
  ombre.poser(POSTE.x, POSTE.y - 1);
  excl = el('div', { class: 'excl', hidden: true, 'aria-hidden': 'true' }, '!');
  bulle = el('div', { class: 'bulle-panneau', hidden: true }, el('kbd', { 'data-key': 'KeyE' }, 'E'), ' : lire le courrier');
  document.body.append(excl, bulle);
  const im = new Image();
  im.onload = () => { sprite = rendu.sprite(im, 'boite-lettres', 32, 48); poser(); };
  im.src = options.image ?? IMAGE;
  game.bus.on('messagerie:nonlus', ({ n }) => { nonLus = n; poser(); });

  // un clic sur la boîte ouvre la messagerie (avant que le héros ne parte marcher vers le clic)
  const toile = rendu.renderer.domElement;
  toile.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || visite || !dessus(rendu.versMonde(e.clientX, e.clientY))) return;
    e.stopImmediatePropagation(); e.preventDefault();
    ouvrirMessages?.();
  }, { capture: true });
  return api;
}

const dessus = (p) => p.x >= POSTE.x - 12 && p.x <= POSTE.x + 12 && p.y >= POSTE.y - 40 && p.y <= POSTE.y + 2;
function poser() {
  // l'image 32 x 48 : le pied du poteau est à y = 45 ; image 1 si des messages attendent
  sprite?.poser(POSTE.x - 16, POSTE.y - 45, POSTE.y, nonLus > 0 ? 32 : 0, 0);
}
const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};

export function update() {
  if (visite) { excl.hidden = true; bulle.hidden = true; return; }
  excl.hidden = nonLus === 0;
  if (!excl.hidden) { const p = ecran(POSTE.x, POSTE.y - 40); excl.style.left = `${p.x}px`; excl.style.top = `${p.y}px`; }
  const h = heros.heros;
  const pres = h.controle && Math.abs(h.x - POSTE.x) < 28 && h.y > POSTE.y - 4 && h.y - POSTE.y < 40;
  bulle.hidden = !pres;
  if (pres) {
    const p = ecran(POSTE.x, POSTE.y - (nonLus ? 64 : 44)); bulle.style.left = `${p.x}px`; bulle.style.top = `${p.y}px`;
    if (game.input.take('consulter')) ouvrirMessages?.();
  }
}

export function dispose() { excl?.remove(); bulle?.remove(); sprite?.retirer(); ombre?.retirer(); collision?.retirer(obstacle); }

export const api = {
  POSTE,
  get nonLus() { return nonLus; },
  get drapeauLeve() { return nonLus > 0; },
  get excl() { return excl; },
  get bulle() { return bulle; },
  // Le centre de la boîte à l'écran (pour un clic de test)
  centreEcran: () => ecran(POSTE.x, POSTE.y - 24),
};
