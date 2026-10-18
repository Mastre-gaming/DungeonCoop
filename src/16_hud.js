// Le HUD du camp, façon RPG (CAMP §8 bis) : une barre d'action en bas de l'écran, une case par partie du dashboard,
// chacune avec son icône (des pièces LPC) et sa touche ; un seul panneau ouvert à la fois.
// Et le suivi de quêtes, toujours visible sous la renommée : tes missions en cours.
// Porte T : le journal de quêtes d'abord ; les autres cases s'allument une à une, chacune validée sur capture.
import { etatDe, tailleDe, POINTS } from './10_missions.js';

export const name = 'hud';
export const always = true;

const T = 32;
// Chaque case : son nom, sa touche, son icône (une case de la planche des décorations, ou une enveloppe dessinée).
// Une case est prête quand son panneau existe (options.panneaux : { id: { ouvrir, fermer, ouvert } }).
export const CASES = [
  { id: 'journal', nom: 'Journal de quêtes', touche: 'KeyJ', icone: [7, 5] },
  { id: 'groupe', nom: 'Le groupe', touche: 'KeyP', icone: [7, 0] },
  { id: 'campagne', nom: 'La campagne', touche: 'KeyC', icone: [6, 1] },
  { id: 'chronique', nom: 'Chronique du camp', touche: 'KeyN', icone: [10, 1] },
  { id: 'sacoche', nom: 'La sacoche', touche: 'KeyI', icone: [8, 0] },
  { id: 'rumeurs', nom: 'Rumeurs de la taverne', touche: 'KeyR', icone: [7, 1] },
  { id: 'lettres', nom: 'Boîte aux lettres', touche: 'KeyM', icone: 'enveloppe' },
];

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

// Une icône de 32 px, dessinée nette dans un petit canevas.
function icone(images, src) {
  const c = el('canvas', { width: 32, height: 32, class: 'icone', 'aria-hidden': 'true' });
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (src === 'enveloppe') {   // une enveloppe en pixels, dans la rampe de bois et parchemin du camp
    const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    r(5, 9, 22, 15, '#2b1c1d'); r(6, 10, 20, 13, '#f3e7c9'); r(6, 20, 20, 3, '#e4d4ac');
    for (let k = 0; k < 10; k++) { r(6 + k, 10 + k, 1, 1, '#85581b'); r(25 - k, 10 + k, 1, 1, '#85581b'); }
    r(14, 18, 4, 3, '#b8322a'); r(15, 19, 2, 1, '#e8792a');   // le cachet de cire
  } else g.drawImage(images.deco, src[0] * T, src[1] * T, T, T, 0, 0, T, T);
  return c;
}

let game, missions, sentinelle, panneau, images, visite, barre, suivi, panneaux = {};

export function init(g, options) {
  game = g;
  ({ missions, sentinelle, panneau, images, visite } = options);
  for (const c of CASES) game.input.bindings[`hud-${c.id}`] = [c.touche];
  game.input.bindings['fermer-hud'] = ['Escape'];
  panneaux = { journal: panneau, ...(options.panneaux ?? {}) };
  for (const c of CASES) c.pret = !!panneaux[c.id];

  barre = el('nav', { id: 'barre-action', class: 'barre-action', 'aria-label': 'Barre d’action' },
    CASES.map((c) => el('button', {
      class: `case${c.pret ? '' : ' bientot'}`, type: 'button', 'data-case': c.id,
      title: c.pret ? `${c.nom} (${c.touche.replace('Key', '')})` : `${c.nom} : bientôt`,
      'aria-label': c.pret ? c.nom : `${c.nom}, bientôt`, 'aria-disabled': c.pret ? null : 'true',
      onclick: () => activer(c.id),
    }, icone(images, c.icone), el('kbd', { 'data-key': c.touche }, c.touche.replace('Key', '')))));
  suivi = el('section', { id: 'suivi', class: 'suivi-quetes', 'aria-label': 'Tes quêtes en cours' });
  // la colonne de droite : la plaque de renommée, le suivi, puis les annonces
  const colonne = el('div', { class: 'colonne-droite' }, options.renommee?.plaque, suivi, options.renommee?.annonces);
  document.body.append(barre, colonne);
  if (visite) { barre.hidden = true; suivi.hidden = true; }
  // les messages non lus : une pastille sur la case M
  game.bus.on('messagerie:nonlus', ({ n }) => {
    const c = barre.querySelector('[data-case="lettres"]');
    let p = c?.querySelector('.pastille');
    if (c && !p) { p = el('span', { class: 'pastille', 'aria-hidden': 'true' }); c.append(p); }
    if (!p) return;
    p.hidden = !n; p.textContent = n > 99 ? '99+' : String(n);
    c.setAttribute('aria-label', n ? `Boîte aux lettres : ${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}` : 'Boîte aux lettres');
  });
  game.bus.on('missions:maj', dessinerSuivi);
  game.bus.on('nom:change', dessinerSuivi);
  dessinerSuivi();
  return api;
}

// Une case : ouvre son panneau (et ferme les autres : un seul à la fois), ou le referme s'il est ouvert.
function activer(id) {
  const p = panneaux[id];
  if (!p) return false;
  if (p.ouvert) { p.fermer(); return true; }
  for (const [autre, q] of Object.entries(panneaux)) if (autre !== id && q.ouvert) q.fermer();
  p.ouvrir();
  return true;
}
// Ajouter un panneau après coup (les modules créés après le HUD).
function brancher(id, p) {
  panneaux[id] = p;
  const c = CASES.find((x) => x.id === id);
  if (!c) return;
  c.pret = true;
  const b = barre.querySelector(`[data-case="${id}"]`);
  b.classList.remove('bientot'); b.removeAttribute('aria-disabled');
  b.title = `${c.nom} (${c.touche.replace('Key', '')})`; b.setAttribute('aria-label', c.nom);
}

// Le suivi : tes missions en cours (assignées à ton pseudo GitHub, encore ouvertes), comme le suivi d'objectifs d'un RPG.
function dessinerSuivi() {
  if (!suivi || visite) return;
  const login = sentinelle?.qui?.github;
  if (!login) { suivi.hidden = true; return; }
  const miennes = missions.taches().filter((t) => etatDe(t) === 'encours' && (t.assignees ?? []).some((a) => a.login.toLowerCase() === login.toLowerCase()))
    .sort((a, b) => a.number - b.number);
  suivi.hidden = false;
  const lignes = miennes.slice(0, 4).map((t) => {
    const taille = tailleDe(t);
    return el('li', {}, el('span', { class: 'num' }, `#${t.number}`), el('span', { class: 'titre-q' }, t.title), taille ? el('span', { class: 'taille' }, `${taille} · ✦${POINTS[taille]}`) : null);
  });
  suivi.replaceChildren(...[
    el('h2', {}, 'Tes quêtes'),
    miennes.length ? el('ol', {}, lignes) : el('p', { class: 'petit' }, 'Aucune quête en cours : ouvre le journal (J) pour en choisir une.'),
    miennes.length > 4 ? el('p', { class: 'petit' }, `et ${miennes.length - 4} autre${miennes.length - 4 > 1 ? 's' : ''} dans le journal`) : null,
  ].filter(Boolean));   // (replaceChildren écrirait « null » en texte)
}

export function update() {
  if (visite) return;
  // les touches de la barre (pas pendant la saisie d'un nom : l'entrée ignore les touches tapées dans un champ)
  for (const c of CASES) if (game.input.take(`hud-${c.id}`)) activer(c.id);
  for (const [id, p] of Object.entries(panneaux)) barre.querySelector(`[data-case="${id}"]`)?.classList.toggle('active', !!p.ouvert);
  if (game.input.take('fermer-hud')) for (const p of Object.values(panneaux)) if (p.ouvert && p !== panneau) p.fermer();
}

export function dispose() { barre?.remove(); suivi?.remove(); }

export const api = {
  CASES, activer, brancher,
  get barre() { return barre; },
  get suivi() { return suivi; },
  majSuivi: dessinerSuivi,
};
