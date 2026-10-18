// Les parties dans la messagerie : quand quelqu'un héberge un groupe au camp (13_reseau.js), le camp poste tout seul
// son code dans la messagerie de l'équipe (que le dashboard voit aussi, avec un lien qui rejoint). Chez les autres, au
// camp, une bulle propose de rejoindre tout de suite ; l'onglet « Parties » de la messagerie liste celles de l'heure.
// L'annonce part seulement si on est entré dans la messagerie (le laissez-passer), une fois par code.

import './parties.css';
import { partieDe, JEU } from './21_messagerie.js';

export const name = 'parties';
export const always = true;

const RECENTE = 30 * 60_000;   // une partie annoncée il y a plus de 30 minutes ne fait plus de bulle

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, messagerie, reseau, visite, bulle, proposee = null;
const annonces = new Set(), vues = new Set(), ecartees = new Set();

// Le texte de l'annonce (texte provisoire : les mots sont à l'équipe). 21_messagerie.js la reconnaît avec partieDe().
export const texteAnnonce = (nom, code) => `🎲 ${nom} héberge une partie au camp : code ${code}. Pour rejoindre : ${JEU}/?code=${code}`;

export function init(g, options) {
  game = g;
  ({ messagerie, reseau, visite } = options);
  bulle = el('div', { class: 'bulle-partie', hidden: true, role: 'status' });
  document.body.append(bulle);
  if (visite) return api;
  game.bus.on('party:status', annoncerSiHote);
  game.bus.on('messagerie:maj', regarder);
  game.bus.on('parties:rejoindre', ({ code }) => rejoindre(code));   // (le bouton « Rejoindre » de la messagerie)
  game.bus.on('party:status', () => { if (proposee && monCode() === proposee.code) cacher(); });
  return api;
}

const monCode = () => (reseau?.party?.active ? reseau.party.code : null);

// J'héberge : le code part dans la messagerie (une fois par code).
function annoncerSiHote() {
  const p = reseau?.party;
  if (!p?.hosting || !p.code || annonces.has(p.code) || messagerie?.etat.statut !== 'ouverte') return;
  if (messagerie.envoyer(texteAnnonce(reseau.nom(), p.code))) annonces.add(p.code);
}

// Un nouveau message de partie, d'un autre, récent : la bulle « Rejoindre » (la plus récente seulement).
function regarder() {
  const parties = [...messagerie.etat.messages.values()].map((m) => ({ m, p: partieDe(m) })).filter((x) => x.p).sort((a, b) => a.m.id - b.m.id);
  const nouvelles = parties.filter((x) => !vues.has(x.m.id));
  for (const x of nouvelles) vues.add(x.m.id);
  const candidates = nouvelles.filter((x) => !messagerie.estMoi(x.m.auteur) && Date.now() - (x.m.t ?? 0) < RECENTE && x.p.code !== monCode() && !ecartees.has(x.p.code));
  const derniere = candidates[candidates.length - 1];
  if (derniere) proposer({ code: derniere.p.code, qui: derniere.m.auteur });
}

function proposer(p) {
  proposee = p;
  const nom = messagerie.nomDe?.(p.qui) ?? p.qui;
  bulle.replaceChildren(
    el('span', { class: 'texte' }, `🎲 ${nom} héberge une partie`),
    el('button', { class: 'bouton-jeu', type: 'button', onclick: () => rejoindre(p.code) }, 'Rejoindre'),
    el('button', { class: 'plus-tard', type: 'button', 'aria-label': 'Plus tard', onclick: () => { ecartees.add(p.code); cacher(); } }, '✕'));
  bulle.hidden = false;
}
function cacher() { proposee = null; bulle.hidden = true; }

export function rejoindre(code) {
  cacher();
  if (monCode() === code) return false;
  if (reseau?.party?.active) reseau.quitter();
  return reseau?.rejoindre?.(code);
}

export function update() {}
export function dispose() { bulle?.remove(); }

export const api = {
  rejoindre, texteAnnonce,
  get bulle() { return bulle; },
  get proposee() { return proposee; },
  // Pour les tests : oublier ce qu'on a vu et annoncé.
  oublier() { annonces.clear(); vues.clear(); ecartees.clear(); cacher(); },
};
