// Le menu Échap du terrain et de l'aventure (retour des joueurs, 25 oct. : « un menu Échap pour régler le son pendant
// l'aventure ») : reprendre, la musique et les effets (les mêmes réglages qu'au camp : dungeoncoop:reglages, annoncés au moteur
// son par « reglages:maj »), les touches, et rentrer au camp. Le jeu ne s'arrête pas (à plusieurs, les autres continuent) :
// ce joueur ne marche plus tant que le menu est ouvert. Il a l'allure des fenêtres du chemin (la fourche, l'étal).
import { CLE, lireReglages } from '../25_reglages.js';

export const name = 'menu-echap';
let game, ihm, boite = null, ouvert = false;

const el = (tag, attrs = {}, ...enfants) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) { if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
};

export function init(g, o) { game = g; ihm = o.ihm; return api; }
export function update() {}
export function dispose() { boite?.remove(); }

function changer(id, v) {
  const r = { ...lireReglages(), [id]: Math.max(0, Math.min(1, v)) };
  try { localStorage.setItem(CLE, JSON.stringify(r)); } catch {}
  game.bus.emit('reglages:maj', r);
  return r;
}
function curseur(id, nom) {
  const r = lireReglages(), sortie = el('output', { for: `menu-${id}` }, `${Math.round(r[id] * 100)} %`);
  const range = el('input', { type: 'range', id: `menu-${id}`, min: '0', max: '100', step: '5', value: String(Math.round(r[id] * 100)), 'aria-label': nom });
  range.addEventListener('input', () => { const v = changer(id, Number(range.value) / 100)[id]; sortie.textContent = v ? `${Math.round(v * 100)} %` : 'coupé'; });
  if (!r[id]) sortie.textContent = 'coupé';
  return el('label', { class: 'menu-reglage' }, el('span', {}, nom), range, sortie);
}
const TOUCHES = [['ZQSD ou les flèches', 'marcher (hors combat)'], ['Maj', 'courir'], ['Clic tenu', 'aller vers le pointeur'], ['Clic sur un objet', 'y aller, et s’en servir'],
  ['1 à 9', 'une capacité (en combat)'], ['F', 'la fiche de la capacité'], ['V, Maj+V', 'les barres de vie'], ['I', 'les intentions des ennemis'], ['Échap', 'ce menu']];

function ouvrir() {
  if (ouvert) return;
  ouvert = true;
  boite = el('div', { class: 'entree-fond menu-echap' }, el('section', { class: 'entree-terrain plaque', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Le menu' },
    el('h2', {}, 'Le menu'),
    el('div', { class: 'menu-reglages' }, curseur('musique', 'Musique'), curseur('effets', 'Effets')),
    el('dl', { class: 'menu-touches' }, TOUCHES.flatMap(([k, v]) => [el('dt', {}, el('kbd', {}, k)), el('dd', {}, v)])),
    el('div', { class: 'entree-choix deux' },
      el('button', { type: 'button', class: 'entree-heros', 'data-menu': 'reprendre', onclick: fermer }, el('strong', {}, 'Reprendre'), el('span', { class: 'detail-branche' }, 'Échap')),
      el('a', { class: 'entree-heros retour-camp', 'data-menu': 'camp', href: ihm.adresseRetour() }, el('strong', {}, 'Retour au camp'), el('span', { class: 'detail-branche' }, 'La partie en cours s’arrête')))));
  boite.addEventListener('pointerdown', (e) => { if (e.target === boite) fermer(); });
  document.body.append(boite);
  boite.querySelector('[data-menu="reprendre"]').focus();
}
function fermer() { if (!ouvert) return; ouvert = false; boite?.remove(); boite = null; }

export const api = {
  ouvrir, fermer,
  get ouvert() { return ouvert; },
  basculer() { if (ouvert) fermer(); else ouvrir(); },
};
