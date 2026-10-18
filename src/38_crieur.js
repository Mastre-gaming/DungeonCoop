// Le crieur du tableau d'affichage (maquette validée par le propriétaire le 18 oct) : un villageois du générateur LPC
// (design/camp/crieur/), sa cloche de laiton peinte par tableau_jeu.py. À partir du niveau 3 du tableau, il monte sur son
// estrade de bois, à droite de la potence, et crie les nouvelles en agitant sa cloche : une mission rentrée, un lieu qui
// monte de niveau ; sinon, de temps en temps, quand on passe près de lui, ce qui reste à prendre.
// Ses répliques sont provisoires (les textes du jeu sont à l'équipe).
import { T, LIEUX, emprise } from './01_plan.js';
import { ESTRADE } from './14_lieux.js';
import { etatDe } from './10_missions.js';

export const name = 'crieur';
export const always = true;

export const NIVEAU = 3;                           // le niveau du tableau où il arrive
const CRI = 3.2, PAUSE = 26, PRES = 9 * T;         // durée d'un cri ; un cri de temps en temps, quand le héros est à moins de 9 cases
const SORT_BAS = 2, MARCHE_BAS = 10, CRIER = [3, 4, 5, 4];   // ses rangées LPC, et les images du cri (bras levés, cloche)
const TEXTE = {
  rentree: (t) => `Oyez ! La mission #${t.number} est rentrée !`,
  monte: (lieu, n) => `Oyez ! ${lieu.lieu[0].toUpperCase()}${lieu.lieu.slice(1)} passe au niveau ${n} !`,
  aPrendre: (n) => (n ? `Oyez ! ${n} mission${n > 1 ? 's' : ''} à prendre au tableau !` : 'Oyez ! Tout est pris, bravo !'),
};

let game, rendu, images, heros, missions, lieux, sprite, bulle;
const S = { la: false, x: 0, y: 0, t: 0, cri: 0, phrase: '', attente: 4, connues: null };

// où il se tient : au milieu de l'estrade, les pieds sur son plancher
function place() {
  const [x0, y0] = emprise(LIEUX[0]);
  return { x: (x0 + ESTRADE.dx + 1) * T, y: (y0 + ESTRADE.dy) * T + 34, devant: (y0 + ESTRADE.dy + 2) * T + 1 };
}

const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};

export function crier(phrase) { if (!S.la) return false; S.phrase = phrase; S.cri = CRI; S.t = 0; S.attente = PAUSE; return true; }

// les missions rentrées depuis la dernière fois (pas au premier chargement : ce ne sont pas des nouvelles)
function nouvelles() {
  const rentrees = new Set(missions.taches().filter((t) => etatDe(t) === 'rentree').map((t) => t.number));
  const avant = S.connues; S.connues = rentrees;
  if (!avant) return;
  const t = missions.taches().find((x) => rentrees.has(x.number) && !avant.has(x.number));
  if (t) crier(TEXTE.rentree(t));
}

export function init(g, options) {
  game = g;
  ({ rendu, images, heros, missions, lieux } = options);
  sprite = rendu.sprite(images.crieur, 'crieur', 64, 64);
  bulle = document.createElement('div');
  bulle.className = 'bulle-perso bulle-crieur'; bulle.hidden = true;
  document.body.append(bulle);
  Object.assign(S, place());
  game.bus.on('missions:maj', () => { if (missions.etat.source) nouvelles(); });
  game.bus.on('lieu:monte', ({ id, niveau }) => { const l = LIEUX.find((x) => x.id === id); if (l) crier(TEXTE.monte(l, niveau)); });
  return api;
}

export function update(dt) {
  S.la = lieux.niveau('interface') >= NIVEAU;
  sprite.cacher(!S.la);
  if (!S.la) { bulle.hidden = true; return; }
  S.t += dt;
  const h = heros.heros, pres = Math.hypot(h.x - S.x, h.y - S.y) < PRES;
  if (S.cri > 0) S.cri -= dt;
  else if (pres && (S.attente -= dt) <= 0) crier(TEXTE.aPrendre(missions.resume().aPrendre));

  const im = S.cri > 0 ? { l: SORT_BAS, c: CRIER[Math.floor(S.t / 0.15) % CRIER.length] } : { l: MARCHE_BAS, c: 0 };
  sprite.poser(S.x - 32, S.y - 60, S.devant, im.c * 64, im.l * 64);   // trié devant son estrade, qu'il domine
  bulle.hidden = !(S.cri > 0);
  if (S.cri > 0) {
    bulle.textContent = S.phrase;
    const p = ecran(S.x, S.y - 62); bulle.style.left = `${p.x}px`; bulle.style.top = `${p.y}px`;
  }
}

export function dispose() { sprite?.retirer(); bulle?.remove(); }

export const api = {
  crier, NIVEAU,
  get la() { return S.la; },
  get criant() { return S.cri > 0; },
  get phrase() { return S.phrase; },
  get bulle() { return bulle; },
  place,
};
