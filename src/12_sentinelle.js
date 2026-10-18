// La sentinelle de l'entrée (CAMP §5, aimée : LIKED.md). Un chevalier du générateur LPC, sans retouche.
// La première fois : le héros entre par le sud et monte vers elle ; elle lève la main, un « ! » doré apparaît ; une boîte
// de dialogue en bois et parchemin s'ouvre en bas de l'écran, avec son portrait, la réplique (lettre à lettre), le champ
// « Ton nom de dev » et le bouton « C'est moi » (un nom vide est refusé) ; elle salue, puis presse le joueur (il y a du
// travail : « Magne-toi ! Suis-moi ») et, sur « Je te suis », lui fait faire le tour du camp (31_tour.js, validé le 18 oct).
// Les fois suivantes, le nom est gardé dans ce navigateur : elle lève la main, salue (« Rebonjour, Paul ») et s'écarte.
// Pour changer de nom ou refaire le tour : lui parler de nouveau (E, devant elle).
// Le nom est relié au pseudo GitHub par equipe.json (le dashboard) : on le cherche dans le nom ou dans le pseudo, sans
// tenir compte des majuscules ni des accents. Un nom inconnu entre quand même, comme visiteur. Il ne sert qu'à afficher.
// Un dev relié à GitHub prend le pseudo choisi dans le dashboard (missions.fusionner) ; son ancien nom reste reconnu.
// Ses répliques sont provisoires (les textes du jeu sont à l'équipe) : marquées « texte provisoire » à l'écran.
import { T } from './01_plan.js';

export const name = 'sentinelle';
export const always = true;

const TEXTE = {
  question: 'Halte. Avant d’entrer au camp : quel est ton nom de dev ?',
  vide: 'Écris ton nom de dev pour entrer.',
  bienvenue: (n) => `Bienvenue, ${n}.`,
  retour: (n) => `Rebonjour, ${n}.`,
  presse: (n) => `Bien, ${n}. Ne reste pas planté là : ce camp ne va pas se construire tout seul, et le travail ne manque pas. Magne-toi ! Suis-moi, je te fais faire le tour.`,
};
// Où ça se passe : l'entrée sud du camp (la trouée dans la lisière), sur le sentier qui monte vers le feu.
export const POSTE = { x: 15 * T, y: 24.3 * T };                 // la sentinelle, au milieu du sentier
const ARRIVEE = { x: 15 * T, y: 27.7 * T }, HALTE = { x: 15 * T, y: 25.8 * T };
const ECART = -1.5 * T;                                        // elle s'écarte d'une case et demie, vers la gauche (à droite, le bois)
export const POSTE_LIBRE = { x: POSTE.x + ECART, y: POSTE.y }; // sa place quand elle laisse passer
const LIGNE = { sortBas: 2, marcheBas: 10, marcheGauche: 9 };  // les rangées de sa planche LPC (64 px)
const SORT = { haut: 0, gauche: 1, bas: 2, droite: 3 }, MARCHE = { haut: 8, gauche: 9, bas: 10, droite: 11 };
const CLE_NOM = 'dungeoncoop:nom-dev';

const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export function reconnaitre(saisie, equipe = []) {
  const n = norm(saisie);
  const m = equipe.find((e) => [e.nom, ...(e.autresNoms ?? [])].some((x) => x && norm(x) === n) || norm(e.github) === n);
  return { nom: m?.nom || String(saisie).trim(), github: m?.github ?? null, saisie: String(saisie).trim() };
}
export function lireNom() { try { const v = JSON.parse(localStorage.getItem(CLE_NOM)); return v && v.nom ? v : null; } catch { return null; } }
function ecrireNom(v) { try { v ? localStorage.setItem(CLE_NOM, JSON.stringify(v)) : localStorage.removeItem(CLE_NOM); } catch {} }

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, rendu, heros, images, missions, collision, camera, obstacle, sprite, ombre;
let boite, texte, champ, erreur, excl, bulle, portrait, parler, form, suite, refaire;
// phase : arrivee, halte, question, salut, presse, guide (le tour la mène : marche, leve, dir), ecart, libre, reparler
const S = { phase: 'libre', t: 0, x: POSTE.x + ECART, y: POSTE.y, dir: 'bas', qui: null, ecrit: 0, phrase: '', bulle: '', bulleT: 0, nouveau: false, marche: false, leve: false };

export function init(g, options) {
  game = g;
  ({ rendu, heros, images, missions, collision, camera } = options);
  sprite = rendu.sprite(images.sentinelle, 'sentinelle', 64, 64);
  ombre = rendu.ombre(20, 4);
  obstacle = { x: 0, y: 0, w: 20, h: 8 };
  collision.ajouter(obstacle);

  portrait = el('canvas', { width: 40, height: 40, class: 'portrait', 'aria-hidden': 'true' });
  texte = el('p', { class: 'dial-texte', 'aria-live': 'polite' });
  champ = el('input', { id: 'nom-dev', name: 'nom', autocomplete: 'nickname', maxlength: '24', placeholder: 'Paul', spellcheck: 'false' });
  erreur = el('p', { class: 'dial-erreur', hidden: true }, TEXTE.vide);
  champ.addEventListener('input', () => { erreur.hidden = true; });
  refaire = el('button', { class: 'bouton-jeu discret', type: 'button', hidden: true, onclick: () => suivre() }, 'Refaire le tour');
  form = el('form', { class: 'dial-saisie', onsubmit: (e) => { e.preventDefault(); repondre(champ.value); } },
    el('label', { for: 'nom-dev' }, 'Ton nom de dev'), champ, el('button', { class: 'bouton-jeu', type: 'submit' }, 'C’est moi'), refaire);
  suite = el('div', { class: 'dial-boutons', hidden: true }, el('button', { class: 'bouton-jeu', type: 'button', id: 'je-te-suis', onclick: () => suivre() }, 'Je te suis'));
  boite = el('div', { id: 'dialogue', class: 'dialogue', hidden: true, role: 'dialog', 'aria-label': 'La sentinelle te parle' },
    portrait,
    el('div', { class: 'dial-corps' }, el('p', { class: 'dial-qui' }, 'La sentinelle ', el('span', { class: 'provisoire' }, 'texte provisoire')), texte, form, suite, erreur));
  excl = el('div', { class: 'excl', hidden: true, 'aria-hidden': 'true' }, '!');
  bulle = el('div', { class: 'bulle-perso', hidden: true });
  parler = el('div', { class: 'bulle-panneau', hidden: true }, el('kbd', { 'data-key': 'KeyE' }, 'E'), ' : parler');
  document.body.append(boite, excl, bulle, parler);
  dessinerPortrait();

  S.qui = lireNom();
  if (options.visite) { S.phase = 'libre'; poser(); }
  else if (options.scene) demarrer();
  else { S.phase = 'libre'; poser(); }
  return api;
}

function dessinerPortrait() {
  const g = portrait.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 40, 40);
  g.drawImage(images.sentinelle, 12, LIGNE.sortBas * 64 + 6, 40, 40, 0, 0, 40, 40);   // sa tête, prise sur sa planche
}

// La scène, depuis le début : le héros entre par le sud, la sentinelle au milieu du sentier.
function demarrer() {
  S.qui = lireNom();
  Object.assign(S, { phase: 'arrivee', t: 0, x: POSTE.x, y: POSTE.y, dir: 'bas' });
  heros.controle(false);
  heros.placer(ARRIVEE.x, ARRIVEE.y, 'haut');
  heros.allerA(HALTE.x, HALTE.y);
  camera?.snap();
  boite.hidden = true; excl.hidden = true; erreur.hidden = true;
  S.nouveau = !S.qui;   // seule la toute première arrivée a droit au tour
}

function ouvrirQuestion() {
  S.phase = 'question'; S.t = 0;
  S.phrase = TEXTE.question; S.ecrit = 0; texte.textContent = '';
  champ.value = S.qui?.saisie ?? '';
  form.hidden = false; suite.hidden = true; refaire.hidden = !S.qui;
  boite.hidden = false;
  setTimeout(() => champ.focus(), 50);
}

function repondre(valeur) {
  const v = String(valeur ?? '').trim();
  if (!v) { erreur.hidden = false; champ.focus(); return false; }
  S.qui = reconnaitre(v, missions?.etat.equipe ?? []);
  ecrireNom(S.qui);
  boite.hidden = true;
  dire(TEXTE.bienvenue(S.qui.nom));
  S.phase = 'salut'; S.t = 0;
  game.bus.emit('nom:change', S.qui);
  champ.blur();
  return true;
}

// Une fois le nom donné, la première fois : il y a du travail, magne-toi (texte provisoire).
function ouvrirPresse() {
  S.phase = 'presse'; S.t = 0; S.nouveau = false;
  S.phrase = TEXTE.presse(S.qui.nom); S.ecrit = 0; texte.textContent = '';
  form.hidden = true; erreur.hidden = true; suite.hidden = false; boite.hidden = false;
  setTimeout(() => suite.querySelector('button').focus(), 50);
}

// « Je te suis » (ou « Refaire le tour ») : le tour la prend en main.
function suivre() {
  boite.hidden = true; excl.hidden = true; champ.blur();
  S.phase = 'guide'; S.t = 0; S.marche = false; S.leve = false;
  game.bus.emit('tour:demarrer');
}

function dire(phrase) { S.bulle = phrase; S.bulleT = 2.4; }

const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};

function image() {
  const p = S.phase;
  if (p === 'halte' || p === 'question' || p === 'salut' || p === 'reparler' || p === 'presse') return { l: LIGNE.sortBas, c: Math.min(5, Math.floor(S.t / 0.12)) };
  if (p === 'guide') {
    if (S.leve) return { l: SORT[S.dir], c: Math.min(5, Math.floor(S.t / 0.12)) };
    return { l: MARCHE[S.dir], c: S.marche ? 1 + (Math.floor(S.t * 10) % 8) : 0 };
  }
  if (p === 'ecart') return { l: LIGNE.marcheGauche, c: 1 + (Math.floor(S.t * 10) % 8) };
  return { l: LIGNE.marcheBas, c: 0 };   // debout : la première image de la marche (celle qui a le bouclier)
}

function poser() {
  const im = image();
  sprite.poser(S.x - 32, S.y - 60, S.y, im.c * 64, im.l * 64);
  ombre.poser(S.x, S.y - 1);
  Object.assign(obstacle, { x: S.x - 10, y: S.y - 8 });
}

export function update(dt) {
  S.t += dt;
  const h = heros.heros;
  if (S.phase === 'arrivee' && (!h.route || Math.hypot(h.x - HALTE.x, h.y - HALTE.y) < 3)) { S.phase = 'halte'; S.t = 0; heros.placer(HALTE.x, HALTE.y, 'haut'); }
  else if (S.phase === 'halte' && S.t > 0.9) {
    if (S.qui) { S.phase = 'salut'; S.t = 0; dire(TEXTE.retour(S.qui.nom)); game.bus.emit('nom:change', S.qui); }
    else ouvrirQuestion();
  }
  else if (S.phase === 'salut' && S.t > 1.1 && S.nouveau) ouvrirPresse();
  else if (S.phase === 'salut' && S.t > 1.1) { S.phase = Math.abs(S.x - (POSTE.x + ECART)) < 0.5 ? 'libre' : 'ecart'; S.t = 0; if (S.phase === 'libre') heros.controle(true); }
  else if (S.phase === 'ecart') { S.x = Math.max(POSTE.x + ECART, S.x - 60 * dt); if (S.x <= POSTE.x + ECART) { S.phase = 'libre'; S.t = 0; heros.controle(true); } }
  else if (S.phase === 'reparler' && S.t > 0.5) ouvrirQuestion();

  // la réplique s'écrit lettre à lettre (35 par seconde)
  if ((S.phase === 'question' || S.phase === 'presse') && S.ecrit < S.phrase.length) { S.ecrit = Math.min(S.phrase.length, S.ecrit + dt * 35); texte.textContent = S.phrase.slice(0, Math.floor(S.ecrit)); }

  // la qui est connue mais pas reliée à GitHub, et equipe.json est arrivé entre-temps : on la relie
  if (S.qui && !S.qui.github && missions?.etat.equipe?.length) {
    const r = reconnaitre(S.qui.saisie ?? S.qui.nom, missions.etat.equipe);
    if (r.github) { S.qui = r; ecrireNom(r); game.bus.emit('nom:change', r); }
  }
  // relié à GitHub : son nom suit le pseudo choisi dans le dashboard (et revient au sien si le pseudo est retiré)
  const membre = S.qui?.github && missions?.etat.equipe?.find((e) => norm(e.github) === norm(S.qui.github));
  const voulu = membre && (membre.nom || S.qui.saisie || S.qui.nom);
  if (voulu && voulu !== S.qui.nom) { S.qui = { ...S.qui, nom: voulu }; ecrireNom(S.qui); game.bus.emit('nom:change', S.qui); }
  poser();

  const levee = S.phase === 'halte' || S.phase === 'question' || S.phase === 'reparler' || (S.phase === 'guide' && S.leve);
  excl.hidden = !levee;
  if (levee) { const p = ecran(S.x, S.y - 66); excl.style.left = `${p.x}px`; excl.style.top = `${p.y}px`; }
  if (S.bulleT > 0) {
    S.bulleT -= dt; bulle.hidden = S.bulleT <= 0; bulle.textContent = S.bulle;
    const p = ecran(S.x, S.y - 70); bulle.style.left = `${p.x}px`; bulle.style.top = `${p.y}px`;
  } else bulle.hidden = true;

  // parler de nouveau à la sentinelle, pour changer de nom
  const pres = S.phase === 'libre' && h.controle && Math.abs(h.x - S.x) < 30 && h.y > S.y && h.y - S.y < 44;
  parler.hidden = !pres;
  if (pres) {
    const p = ecran(S.x, S.y - 66); parler.style.left = `${p.x}px`; parler.style.top = `${p.y}px`;
    if (game.input.take('consulter')) { S.phase = 'reparler'; S.t = 0; heros.controle(false); }
  }
}

export function dispose() { boite?.remove(); excl?.remove(); bulle?.remove(); parler?.remove(); }

export const api = {
  etat: S, demarrer, repondre, reconnaitre, lireNom, suivre, poser, POSTE_LIBRE,
  get suite() { return suite; },
  // Pendant le tour, elle ne bloque pas le passage (le héros la suit de près) ; elle bloque de nouveau à son poste.
  bloquer(oui) { collision.retirer(obstacle); if (oui) collision.ajouter(obstacle); },
  get qui() { return S.qui; },
  get dialogue() { return boite; },
  get texte() { return texte.textContent; },
  oublier() { ecrireNom(null); S.qui = null; },
};
