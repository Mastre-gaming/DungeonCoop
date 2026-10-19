// Le crieur du tableau d'affichage (maquette validée par le propriétaire le 18 oct) : un villageois du générateur LPC
// (design/camp/crieur/), sa cloche de laiton peinte par tableau_jeu.py. À partir du niveau 2 du tableau, il monte sur son
// estrade de bois, à droite de la potence.
// Son rôle (demande du propriétaire, 19 oct) : il crie et recense les derniers push, ceux de la rubrique « Derniers push »
// du dashboard, que le jeu lit déjà pour la chronique du camp (19_chronique.js, même source). D'abord les push :
//   1. un push qui arrive en direct, il le crie tout de suite ;
//   2. une mission rentrée, un lieu qui monte de niveau ;
//   3. quand on passe près de lui, il fait le tour des derniers push (les 5 plus récents), et de temps en temps ce qui
//      reste à prendre au tableau.
// Devant lui, E ouvre la chronique : la liste des derniers push.
// Ses répliques sont provisoires (les textes du jeu sont à l'équipe).
import { T, LIEUX, emprise } from './01_plan.js';
import { ESTRADE } from './14_lieux.js';
import { etatDe } from './10_missions.js';
import { phrase as phraseChronique } from './19_chronique.js';

export const name = 'crieur';
export const always = true;

export const NIVEAU = 2;                           // le niveau du tableau où il arrive
const CRI = 3.6, PAUSE = 12, PRES = 9 * T;         // durée d'un cri ; près de lui (à moins de 9 cases), un cri toutes les 12 s
const RECENSES = 5, MESSAGE = 42;                  // le tour des 5 derniers push ; un message de commit coupé à 42 lettres
const PRIORITE = { push: 0, nouvelle: 1, tour: 2 };
const SORT_BAS = 2, MARCHE_BAS = 10, CRIER = [3, 4, 5, 4];   // ses rangées LPC, et les images du cri (bras levés, cloche)
const court = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
export const TEXTE = {
  push: (p) => `Oyez ! ${p.qui} ${p.verbe} ${p.branche} (${p.depot})${p.message ? ` : « ${court(p.message, MESSAGE)} »` : ''} !`,
  rentree: (t) => `Oyez ! La mission #${t.number} est rentrée !`,
  monte: (lieu, n) => `Oyez ! ${lieu.lieu[0].toUpperCase()}${lieu.lieu.slice(1)} passe au niveau ${n} !`,
  aPrendre: (n) => (n ? `Oyez ! ${n} mission${n > 1 ? 's' : ''} à prendre au tableau !` : 'Oyez ! Tout est pris, bravo !'),
};

let game, rendu, images, heros, missions, lieux, chronique, ouvrirChronique, sprite, bulle, ecouter;
const S = { la: false, x: 0, y: 0, t: 0, cri: 0, phrase: '', sorte: null, attente: 3, connues: null, tour: 0, recense: 0, file: [] };

// où il se tient : au milieu de l'estrade, les pieds sur son plancher
function place() {
  const [x0, y0] = emprise(LIEUX[0]);
  return { x: (x0 + ESTRADE.dx + 1) * T, y: (y0 + ESTRADE.dy) * T + 34, devant: (y0 + ESTRADE.dy + 2) * T + 1 };
}

const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};
const nomDe = (login) => missions?.nomDe?.(login) ?? login;

// Crier tout de suite (sans attendre la file).
export function crier(texte, sorte = 'nouvelle') {
  if (!S.la) return false;
  Object.assign(S, { phrase: texte, sorte, cri: CRI, t: 0, attente: PAUSE });
  return true;
}
// Une nouvelle à crier dès qu'il a fini la précédente ; un push passe avant le reste.
function annoncer(texte, sorte) {
  if (!S.la) return;
  if (S.file.some((f) => f.texte === texte) || (S.cri > 0 && S.phrase === texte)) return;
  S.file.push({ texte, sorte });
  S.file.sort((a, b) => PRIORITE[a.sorte] - PRIORITE[b.sorte]);
  S.file.length = Math.min(S.file.length, 6);
}

// les derniers push, du plus récent au plus ancien, tels que la chronique les lit
export function derniersPush() {
  return (chronique?.entrees ?? []).slice(0, RECENSES).map((e) => phraseChronique(e, nomDe));
}

// les missions rentrées depuis la dernière fois (pas au premier chargement : ce ne sont pas des nouvelles)
function nouvelles() {
  const rentrees = new Set(missions.taches().filter((t) => etatDe(t) === 'rentree').map((t) => t.number));
  const avant = S.connues; S.connues = rentrees;
  if (!avant) return;
  for (const t of missions.taches().filter((x) => rentrees.has(x.number) && !avant.has(x.number))) annoncer(TEXTE.rentree(t), 'nouvelle');
}

// près de lui, quand il n'a pas de nouvelle : le tour des derniers push ; tous les trois cris, ce qui reste à prendre
function prochainTour() {
  const push = derniersPush();
  S.tour++;
  if (!push.length || S.tour % 3 === 0) return TEXTE.aPrendre(missions.resume().aPrendre);
  return TEXTE.push(push[S.recense++ % push.length]);
}

export function init(g, options) {
  game = g;
  ({ rendu, images, heros, missions, lieux } = options);
  sprite = rendu.sprite(images.crieur, 'crieur', 64, 64);
  bulle = document.createElement('div');
  bulle.className = 'bulle-perso bulle-crieur'; bulle.hidden = true;
  ecouter = document.createElement('div');
  ecouter.className = 'bulle-panneau'; ecouter.hidden = true;
  ecouter.innerHTML = '<kbd data-key="KeyE">E</kbd> : les derniers push';
  document.body.append(bulle, ecouter);
  Object.assign(S, place());
  game.bus.on('chronique:nouveau', (e) => annoncer(TEXTE.push(phraseChronique(e, nomDe)), 'push'));
  game.bus.on('missions:maj', () => { if (missions.etat.source) nouvelles(); });
  game.bus.on('lieu:monte', ({ id, niveau }) => { const l = LIEUX.find((x) => x.id === id); if (l) annoncer(TEXTE.monte(l, niveau), 'nouvelle'); });
  return api;
}

// la chronique (créée après lui dans main.js) : ses derniers push, et de quoi l'ouvrir
export function brancher(c, ouvrir) { chronique = c; ouvrirChronique = ouvrir; }

export function update(dt) {
  S.la = lieux.niveau('interface') >= NIVEAU;
  sprite.cacher(!S.la);
  if (!S.la) { bulle.hidden = true; ecouter.hidden = true; S.file.length = 0; return; }
  S.t += dt;
  const h = heros.heros, pres = Math.hypot(h.x - S.x, h.y - S.y) < PRES;
  if (S.cri > 0) S.cri -= dt;
  else if (S.file.length) { const f = S.file.shift(); crier(f.texte, f.sorte); }
  else if (pres && (S.attente -= dt) <= 0) crier(prochainTour(), 'tour');

  const im = S.cri > 0 ? { l: SORT_BAS, c: CRIER[Math.floor(S.t / 0.15) % CRIER.length] } : { l: MARCHE_BAS, c: 0 };
  sprite.poser(S.x - 32, S.y - 60, S.devant, im.c * 64, im.l * 64);   // trié devant son estrade, qu'il domine
  bulle.hidden = !(S.cri > 0);
  if (S.cri > 0) {
    bulle.textContent = S.phrase;
    const p = ecran(S.x, S.y - 62), m = bulle.offsetWidth / 2 + 12;   // centrée sur lui, sans sortir de l'écran
    bulle.style.left = `${Math.max(m, Math.min(innerWidth - m, p.x))}px`; bulle.style.top = `${p.y}px`;
  }
  // devant son estrade : E ouvre la chronique (la liste des derniers push)
  const devant = h.controle && Math.abs(h.x - S.x) < 40 && h.y > S.devant - 4 && h.y - S.devant < 40;
  ecouter.hidden = !devant;
  if (devant) {
    const p = ecran(S.x, S.devant - 4); ecouter.style.left = `${p.x}px`; ecouter.style.top = `${p.y}px`;
    if (game.input.take('consulter')) ouvrirChronique?.();
  }
}

export function dispose() { sprite?.retirer(); bulle?.remove(); ecouter?.remove(); }

export const api = {
  crier, brancher, derniersPush, NIVEAU, TEXTE,
  get la() { return S.la; },
  get criant() { return S.cri > 0; },
  get phrase() { return S.phrase; },
  get sorte() { return S.sorte; },
  get file() { return S.file; },
  get bulle() { return bulle; },
  get ecouter() { return ecouter; },
  place,
};
