// Le panneau de réglages du combat (R) : on règle les nombres du combat soi-même, sans demander à personne. Les valeurs
// vivent dans reglages-combat.js ; ici, seulement l'affichage : des sections repliables, un curseur et un champ par valeur,
// un point sur ce qui a changé, copier/coller la config, deux préréglages (A, B : la touche B passe de l'un à l'autre).
// À plusieurs, seul l'hôte règle : les invités voient le panneau en lecture seule, « réglé par l'hôte ».
import * as REG from './reglages-combat.js';

export const name = 'panneau-reglages';
export const always = true;
let ihm, dom = {}, ligne = new Map(), touches = null;

const el = (tag, attrs = {}, ...enfants) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
};
const lectureSeule = () => REG.estExterne();
const decimales = (d) => (String(d.step).split('.')[1] ?? '').length;

export function init(g, options) {
  ({ ihm } = options);
  construire();
  REG.surChangement(rafraichir);
  touches = (e) => {
    if (e.target.closest?.('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyR') basculer();
    else if (e.code === 'KeyB') permuter();
  };
  window.addEventListener('keydown', touches);
  rafraichir();
  return api;
}
export function update() { if (dom.panneau && dom.panneau.dataset.seul !== String(lectureSeule())) rafraichir(); }
export function dispose() { window.removeEventListener('keydown', touches); dom.panneau?.remove(); dom.bouton?.remove(); }

function construire() {
  dom.panneau = el('section', { class: 'plaque panneau-reglages', id: 'reglages', hidden: true, 'aria-label': 'Réglages du combat' });
  dom.titre = el('header', {}, el('h2', {}, 'Réglages du combat'), el('button', { type: 'button', class: 'bouton-jeu discret petit', onclick: () => basculer(false), 'aria-label': 'Fermer' }, '✕'));
  dom.hote = el('p', { class: 'reglages-hote', hidden: true }, 'réglé par l’hôte');
  dom.presets = el('div', { class: 'reglages-presets' }, el('span', { class: 'muet' }, 'Préréglage'),
    ...['A', 'B'].map((n) => el('button', { type: 'button', class: 'bouton-jeu discret petit', 'data-preset': n, onclick: () => REG.choisirPreset(n) }, n)),
    el('span', { class: 'muet' }, el('kbd', {}, 'B'), ' pour passer de l’un à l’autre'));
  const sections = REG.GROUPES.map((gr) => {
    const defs = REG.DEFS.filter((d) => d.groupe === gr.id && d.etape <= REG.ETAPE_OUVERTE);
    if (!defs.length) return null;
    const bouton = el('button', { type: 'button', class: 'bouton-jeu discret petit', 'data-reinit': gr.id, onclick: (e) => { e.preventDefault(); REG.reinitialiser(gr.id); } }, 'Réinitialiser');
    return el('details', { class: 'reglages-groupe', open: true, 'data-groupe': gr.id }, el('summary', {}, gr.titre, bouton), ...defs.map(rangee));
  }).filter(Boolean);
  dom.texte = el('textarea', { class: 'reglages-texte', rows: 5, hidden: true, spellcheck: 'false', 'aria-label': 'Config à coller (JSON)' });
  dom.valider = el('button', { type: 'button', class: 'bouton-jeu petit', id: 'appliquer-config', hidden: true, onclick: appliquerTexte }, 'Appliquer');
  dom.message = el('p', { class: 'reglages-message muet', role: 'status' });
  dom.actions = el('div', { class: 'reglages-actions' },
    el('button', { type: 'button', class: 'bouton-jeu discret petit', id: 'copier-config', onclick: copier }, 'Copier la config'),
    el('button', { type: 'button', class: 'bouton-jeu discret petit', id: 'coller-config', onclick: coller }, 'Coller une config'),
    el('button', { type: 'button', class: 'bouton-jeu discret petit', id: 'reinit-tout', onclick: () => REG.reinitialiser() }, 'Tout réinitialiser'));
  dom.panneau.append(dom.titre, dom.hote, dom.presets, ...sections, dom.actions, dom.texte, dom.valider, dom.message);
  dom.bouton = el('button', { type: 'button', class: 'bouton-jeu discret', id: 'ouvrir-reglages', onclick: () => basculer(), title: 'Les réglages du combat (touche R)' }, 'Réglages ', el('kbd', {}, 'R'));
  document.querySelector('.haut-terrain')?.insertBefore(dom.bouton, document.querySelector('#retour-camp'));
  document.body.append(dom.panneau);
  const aide = document.querySelector('.aide-terrain');
  if (aide) aide.append(' · ', el('kbd', {}, 'R'), ' réglages · ', el('kbd', {}, 'B'), ' préréglage A/B');
}

function rangee(d) {
  const curseur = el('input', { type: 'range', min: d.min, max: d.max, step: d.step, 'aria-label': d.label });
  const champ = el('input', { type: 'number', min: d.min, max: d.max, step: d.step, 'aria-label': `${d.label} (valeur)` });
  const point = el('span', { class: 'point-change', title: 'Changé par rapport au défaut', 'aria-hidden': 'true' }, '●');
  curseur.addEventListener('input', () => REG.regler(d.id, curseur.value));
  champ.addEventListener('change', () => { REG.regler(d.id, champ.value); rafraichir(); });
  const r = el('div', { class: 'reglage', 'data-id': d.id }, point, el('label', {}, d.label), curseur, champ, el('span', { class: 'unite' }, d.unite),
    el('span', { class: 'defaut muet' }, `défaut ${d.def.toFixed(decimales(d))}`));
  ligne.set(d.id, { d, curseur, champ, point, r });
  return r;
}

function rafraichir() {
  if (!dom.panneau) return;
  const seul = lectureSeule();
  dom.panneau.dataset.seul = String(seul);
  dom.hote.hidden = !seul;
  for (const { d, curseur, champ, point, r } of ligne.values()) {
    const v = REG.lire(d.id);
    if (document.activeElement !== champ) champ.value = v.toFixed(decimales(d));
    curseur.value = v;
    curseur.disabled = champ.disabled = seul;
    point.style.visibility = REG.estChange(d.id) ? 'visible' : 'hidden';
    r.classList.toggle('change', REG.estChange(d.id));
  }
  for (const b of dom.panneau.querySelectorAll('[data-preset]')) { b.classList.toggle('actif', b.dataset.preset === REG.presetActif() && !seul); b.disabled = seul; }
  for (const b of dom.panneau.querySelectorAll('[data-reinit], #reinit-tout, #coller-config, #appliquer-config')) b.disabled = seul;
}

export function basculer(ouvert = dom.panneau.hidden) { dom.panneau.hidden = !ouvert; if (ouvert) rafraichir(); }
function permuter() {
  if (lectureSeule()) return void ihm.banniere('Réglé par l’hôte');
  REG.basculerPreset();
  ihm.banniere(`Préréglage ${REG.presetActif()}`);
}
const message = (t) => { dom.message.textContent = t; };
async function copier() {
  const texte = REG.exporter();
  try { await navigator.clipboard.writeText(texte); message('Config copiée (seulement les valeurs changées).'); }
  catch {
    // pas de presse-papiers : le texte est montré, déjà sélectionné, à copier à la main
    dom.texte.hidden = false; dom.valider.hidden = true; dom.texte.value = texte; dom.texte.focus(); dom.texte.select();
    message('Copie impossible : le texte est sélectionné, copie-le (Ctrl+C).');
  }
}
function coller() {
  const montre = dom.texte.hidden || dom.valider.hidden;
  dom.texte.hidden = dom.valider.hidden = !montre;
  if (montre) { dom.texte.value = ''; dom.texte.focus(); message('Colle la config puis « Appliquer ».'); } else message('');
}
function appliquerTexte() {
  const r = REG.importer(dom.texte.value);
  message(r.ok ? `Config appliquée (${r.n} valeur${r.n > 1 ? 's' : ''}${r.ignores ? `, ${r.ignores} inconnue${r.ignores > 1 ? 's' : ''} ignorée${r.ignores > 1 ? 's' : ''}` : ''}).` : r.erreur);
  if (r.ok) dom.texte.hidden = dom.valider.hidden = true;
}
export const api = { basculer, permuter, rafraichir, get ouvert() { return !dom.panneau.hidden; } };
