// Les parties dans la messagerie : quand quelqu'un héberge un groupe au camp (13_reseau.js), le camp poste tout seul
// son code dans la messagerie de l'équipe (que le dashboard voit aussi, avec un lien qui rejoint). Chez les autres, au
// camp, une bulle propose de rejoindre tout de suite ; l'onglet « Parties » de la messagerie liste celles de l'heure.
// L'annonce part seulement si on est entré dans la messagerie (le laissez-passer), une fois par code.
// Fermer : l'hôte retire sa partie avec « Fermer » (onglet « Parties »), et le camp le fait tout seul quand il ferme son
// groupe ou en ouvre un autre (ses anciennes partent, en un seul message). Le Worker ne sait pas effacer un message :
// la fermeture est un message (« … a fermé la partie ABCDE. »), et le camp cache les parties fermées par leur auteur.

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
const annonces = new Set(), vues = new Set(), ecartees = new Set(), fermees = new Set();

// Le texte de l'annonce (texte provisoire : les mots sont à l'équipe). 21_messagerie.js la reconnaît avec partieDe().
export const texteAnnonce = (nom, code) => `🎲 ${nom} héberge une partie au camp : code ${code}. Pour rejoindre : ${JEU}/?code=${code}`;
export const texteFermeture = (nom, codes) => `🎲 ${nom} a fermé ${codes.length > 1 ? 'les parties' : 'la partie'} ${codes.join(', ')}.`;

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
  game.bus.on('party:status', suivreHote);
  game.bus.on('parties:fermer', ({ codes }) => fermer(codes));   // (le bouton « Fermer » de l'onglet « Parties »)
  // l'onglet se ferme pendant que j'héberge : on dit que la partie est finie (au mieux : la connexion part avec l'onglet)
  window.addEventListener('pagehide', () => { if (hote) fermer([hote]); });
  return api;
}

const monCode = () => (reseau?.party?.active ? reseau.party.code : null);
let hote = null;   // le code du groupe que j'héberge en ce moment

// Mes parties encore ouvertes dans la messagerie (les codes).
const mesParties = () => [...messagerie.etat.messages.values()].filter((m) => messagerie.estMoi(m.auteur) && messagerie.partieOuverte(m)).map((m) => partieDe(m).code).filter((c) => !fermees.has(c));

// Fermer mes parties : un seul message pour toutes.
export function fermer(codes) {
  const l = [...new Set(codes)].filter((c) => c && !fermees.has(c));
  if (!l.length || messagerie?.etat.statut !== 'ouverte') return false;
  const ok = messagerie.envoyer(texteFermeture(reseau.nom(), l));
  if (ok) for (const c of l) fermees.add(c);
  return ok;
}

// J'arrête d'héberger (« Fermer le groupe ») : ma partie se ferme. J'en ouvre une autre : les anciennes aussi.
function suivreHote() {
  const p = reseau?.party, maintenant = p?.hosting && p.code ? p.code : null;
  if (hote && hote !== maintenant) fermer([hote]);
  hote = maintenant;
}

// J'héberge : le code part dans la messagerie (une fois par code).
function annoncerSiHote() {
  const p = reseau?.party;
  if (!p?.hosting || !p.code || annonces.has(p.code) || messagerie?.etat.statut !== 'ouverte') return;
  const anciennes = mesParties().filter((c) => c !== p.code && c !== hote);
  if (anciennes.length) fermer(anciennes);
  if (messagerie.envoyer(texteAnnonce(reseau.nom(), p.code))) annonces.add(p.code);
}

// Un nouveau message de partie, d'un autre, récent : la bulle « Rejoindre » (la plus récente seulement).
function regarder() {
  const parties = [...messagerie.etat.messages.values()].map((m) => ({ m, p: partieDe(m) })).filter((x) => x.p).sort((a, b) => a.m.id - b.m.id);
  const nouvelles = parties.filter((x) => !vues.has(x.m.id));
  for (const x of nouvelles) vues.add(x.m.id);
  if (proposee && !parties.some((x) => x.p.code === proposee.code && messagerie.partieOuverte(x.m))) cacher();   // fermée entre-temps
  const candidates = nouvelles.filter((x) => !messagerie.estMoi(x.m.auteur) && Date.now() - (x.m.t ?? 0) < RECENTE && messagerie.partieOuverte(x.m) && x.p.code !== monCode() && !ecartees.has(x.p.code));
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
  rejoindre, texteAnnonce, texteFermeture, fermer,
  get bulle() { return bulle; },
  get proposee() { return proposee; },
  // Pour les tests : oublier ce qu'on a vu et annoncé.
  oublier() { annonces.clear(); vues.clear(); ecartees.clear(); fermees.clear(); hote = null; cacher(); },
};
