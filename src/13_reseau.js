// Jouer à plusieurs au camp (CAMP §5) : le skill party-net, sans serveur à nous.
//   Héberger : on reçoit un code de cinq lettres (et un lien ?code=…) à donner aux amis. Rejoindre : on tape le code.
//   1 à 4 héros. Chacun voit les autres marcher, avec leur nom au-dessus de la tête. Un départ ne casse rien pour les
//   autres ; un onglet qui cale revient tout seul ; si l'hôte part, on continue seul.
// Le camp n'a pas de « monde » à partager pour l'instant : les missions, chacun les lit lui-même sur GitHub.
// Le nom affiché vient de la sentinelle (le nom de dev) ; en ?visite, rien de tout ça.
// En revenant du terrain d'entraînement à plusieurs (#80) : ?hote=ABCDE rouvre le groupe avec le même code, ?code=ABCDE
// le rejoint ; on réessaie un moment (l'hôte n'est peut-être pas encore revenu, son ancien code pas encore libéré).
// Chacun dit aussi quel héros il incarne (41_choix_heros.js) : sa copie porte ce héros, et le héros pris quitte le camp
// (il ne se promène plus, 42_promeneurs.js ; Baba quitte sa forge). Un ami qui arrive, qui part ou qui change de héros :
// la colonne dorée tombe sur lui (43_apparitions.js) ; il se montre (ou s'en va) quand elle touche le sol.
import * as partyNet from './skills/party-net/module/03_skill.js';
import { HEROS, DEPART } from './41_choix_heros.js';

export const name = 'reseau';
export const always = true;

const PREFIXE = 'dungeoncoop-camp-';
const DIRS = ['haut', 'gauche', 'bas', 'droite'];   // l'ordre des directions LPC
const FRANCAIS = {
  'Opening a room...': 'Ouverture du groupe…',
  'Give your friends the code': 'Donne le code à tes amis',
  'Joining...': 'Connexion au groupe…',
  Joined: 'Tu es dans le groupe',
  'No room with that code': 'Aucun groupe avec ce code',
  'That code is taken, try again': 'Ce code est déjà pris : réessaie',
  'Lost the connection': 'Connexion perdue',
  "This browser can't make direct connections": 'Ce navigateur ne peut pas se connecter directement',
  "Couldn't connect": 'Connexion impossible',
  'The host went quiet': 'L’hôte ne répond plus : tu continues seul',
  'That room is full': 'Le groupe est complet (4 au plus)',
  'The host closed the room': 'L’hôte a fermé le groupe : tu continues seul',
};
export const fr = (s) => FRANCAIS[s] ?? s ?? '';

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, party, rendu, heros, images, sentinelle, apparitions, visite, panneau, noms, statut = '', copie = 0;
let attente = null;          // { sorte: 'hote' | 'invite', code, essais } : un groupe qu'on réessaie d'ouvrir ou de rejoindre
const RATE = { hote: 'That code is taken, try again', invite: 'No room with that code' };
const copies = new Map();   // id → { sprite, ombre, etiquette, t }
let monEtiquette = null;

const nomAffiche = () => sentinelle?.qui?.nom || 'Voyageur';

function creerParty(transport) {
  party?.dispose?.();
  party = partyNet.createParty({
    transport, fields: ['x', 'y', 'vx', 'vy', 'dir', 'court', 'bouge', 'heros'],
    me: () => { const h = heros.heros; return { x: h.x, y: h.y, vx: h.vx, vy: h.vy, dir: DIRS.indexOf(h.dir), court: h.court ? 1 : 0, bouge: h.bouge ? 1 : 0, heros: Math.max(0, HEROS.findIndex((x) => x.id === heros.incarne?.id)) }; },
    name: nomAffiche,
    settings: { snap: 320 },   // (en pixels : au-delà de 10 cases d'écart, la copie saute au lieu de glisser)
    ...(api.horloge ? { now: api.horloge } : {}),
    on: (type, d) => {
      if (type === 'status') { statut = fr(d.status); reessayer(d.status); dessiner(); }
      if (type === 'join' || type === 'leave' || type === 'welcome') dessiner();
      game.bus.emit(`party:${type}`, d);
    },
  });
  api.party = party;
  return party;
}

export function init(g, options) {
  game = g;
  ({ rendu, heros, images, sentinelle, apparitions, visite } = options);
  noms = el('div', { id: 'noms', 'aria-hidden': 'true' });
  panneau = el('section', { id: 'groupe', class: 'groupe-jeu', 'aria-label': 'Jouer à plusieurs' });
  document.body.append(noms, panneau);
  if (visite) { panneau.hidden = true; return api; }
  creerParty(options.transport ?? (() => partyNet.createPeerTransport({ prefix: PREFIXE })));
  monEtiquette = el('div', { class: 'etiquette moi' });
  noms.append(monEtiquette);
  dessiner();
  // ?code=ABCDE dans l'adresse : on rejoint ce groupe tout de suite
  // ?hote=ABCDE : on revient du terrain d'entraînement en hôte, on rouvre le même groupe
  const q = new URLSearchParams(location.search), code = q.get('code'), hote = q.get('hote');
  if (hote && !game.query.has('test')) heberger(hote, { attendre: true });
  else if (code && !game.query.has('test')) rejoindre(code, { attendre: !!q.get('spot') });
  return api;
}

const nettoyer = (code) => String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function heberger(code, { attendre = false } = {}) {
  const c = nettoyer(code);
  attente = attendre && c.length === 5 ? { sorte: 'hote', code: c, essais: 8 } : null;
  if (c.length === 5) party.host(c); else party.host();
  dessiner();
}
function rejoindre(code, { attendre = false } = {}) {
  const c = nettoyer(code);
  if (c.length !== 5) { statut = 'Le code a cinq lettres'; dessiner(); return false; }
  attente = attendre ? { sorte: 'invite', code: c, essais: 45 } : null;
  party.join(c); dessiner(); return true;
}
// Un essai raté pendant qu'on attend : on réessaie dans 2 s (ouvert ou rejoint : on n'attend plus).
function reessayer(status) {
  const a = attente;
  if (!a) return;
  if (status === 'Give your friends the code' || status === 'Joined') { attente = null; return; }
  if (status !== RATE[a.sorte]) return;
  if (--a.essais <= 0) { attente = null; return; }
  statut = a.sorte === 'hote' ? 'Le groupe se rouvre…' : 'En attente de l’hôte du groupe…';
  setTimeout(() => { if (attente === a && !party.active) (a.sorte === 'hote' ? party.host(a.code) : party.join(a.code)); }, 2000);
}
function quitter() { attente = null; party.leave(party.hosting ? 'Tu as fermé le groupe' : 'Tu as quitté le groupe'); statut = fr(party.status); dessiner(); }
const lien = () => `${location.origin}${location.pathname}?code=${party.code}`;

// Le panneau « Jouer à plusieurs », en haut à gauche, dans le style du jeu.
function dessiner() {
  if (!panneau || visite) return;
  const enfants = [el('h2', {}, 'Jouer à plusieurs')];
  if (!party.active) {
    const champ = el('input', { 'aria-label': 'Code du groupe', placeholder: 'CODE', maxlength: '5', autocomplete: 'off', spellcheck: 'false', class: 'code-champ' });
    champ.addEventListener('input', () => { champ.value = champ.value.toUpperCase(); });
    enfants.push(
      el('div', { class: 'ligne' }, el('button', { class: 'bouton-jeu', type: 'button', onclick: () => heberger() }, 'Héberger')),
      el('form', { class: 'ligne', onsubmit: (e) => { e.preventDefault(); rejoindre(champ.value); } },
        champ, el('button', { class: 'bouton-jeu discret', type: 'submit' }, 'Rejoindre')));
  } else {
    if (party.code) enfants.push(el('p', { class: 'code' }, party.hosting ? 'Ton code : ' : 'Groupe : ', el('b', {}, party.code)));
    const joueurs = [nomAffiche() + ' (toi)', ...[...party.others.values()].map((o) => o.name)];
    enfants.push(el('ul', { class: 'joueurs' }, joueurs.map((n) => el('li', {}, n))));
    const boutons = [];
    if (party.hosting && party.code) boutons.push(el('button', { class: 'bouton-jeu', type: 'button', onclick: async () => {
      try { await navigator.clipboard.writeText(lien()); copie = 2; } catch { copie = -2; }
      dessiner();
    } }, copie > 0 ? 'Lien copié ✓' : 'Copier le lien'));
    boutons.push(el('button', { class: 'bouton-jeu discret', type: 'button', onclick: quitter }, party.hosting ? 'Fermer le groupe' : 'Quitter'));
    enfants.push(el('div', { class: 'ligne' }, boutons));
    if (copie < 0) enfants.push(el('p', { class: 'petit' }, lien()));
  }
  if (statut) enfants.push(el('p', { class: 'statut', role: 'status' }, statut));
  panneau.replaceChildren(...enfants);
}

const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};
function placerEtiquette(e, x, y, texte) {
  if (e.textContent !== texte) e.textContent = texte;
  const p = ecran(x, y - 52);   // juste au-dessus de la tête (le sprite LPC a 8 px vides en haut)
  e.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
}

export function update(dt) {
  if (visite || !party) return;
  if (copie > 0 && (copie -= dt) <= 0) { copie = 0; dessiner(); }
  party.update(dt);

  // les autres héros : une copie qui glisse là où ils ont dit être, avec leur animation et leur nom
  for (const [id, c] of copies) if (!party.others.has(id)) {
    apparitions?.jouer('disparait', c.x ?? 0, c.y ?? 0);   // il part : la lumière tombe là où il était
    c.sprite.retirer(); c.ombre.retirer(); c.etiquette.remove(); copies.delete(id);
  }
  for (const o of party.others.values()) {
    let c = copies.get(o.id);
    if (!c) {
      c = { sprite: rendu.sprite(images.heros, 'heros', 64, 64), ombre: rendu.ombre(18, 4), etiquette: el('div', { class: 'etiquette' }), t: 0, heros: DEPART, montre: 0, nouveau: true };
      noms.append(c.etiquette);
      copies.set(o.id, c);
    }
    // le héros qu'il incarne : sa copie change de planche
    const h = HEROS[Math.round(o.state.heros)] ?? DEPART;
    if (h !== c.heros && images[h.image]) {
      c.sprite.retirer(); c.sprite = rendu.sprite(images[h.image], `heros-${h.id}`, 64, 64); c.heros = h;
      if (!c.nouveau) c.montre = apparitions?.jouer('apparait', o.shown.x, o.shown.y) ?? 0;   // il change de héros : la lumière aussi
    }
    // il arrive : la colonne dorée, puis lui
    if (c.nouveau) { c.nouveau = false; c.montre = apparitions?.jouer('apparait', o.shown.x, o.shown.y) ?? 0; }
    c.montre = Math.max(0, c.montre - dt);
    c.sprite.cacher(c.montre > 0); c.ombre.cacher(c.montre > 0); c.etiquette.hidden = c.montre > 0;
    const s = o.shown, bouge = o.state.bouge > 0.5, court = o.state.court > 0.5;
    const ligne = Math.max(0, Math.min(3, Math.round(o.state.dir)));
    c.t = bouge ? c.t + dt : 0;
    const course = court && c.heros.course;   // (sans rangée de course : la marche, au rythme de la course)
    const rang = (bouge && course ? 38 : 8) + ligne, col = !bouge ? 0 : course ? Math.floor(c.t * 14) % 8 : 1 + (Math.floor(c.t * (court ? 14 : 10)) % 8);
    c.sprite.poser(s.x - 32, s.y - 60, s.y, col * 64, rang * 64);
    c.ombre.poser(s.x, s.y - 1);
    c.x = s.x; c.y = s.y; c.ligne = ligne;   // (sa direction : pour sa torche, 46_jour_nuit.js)
    placerEtiquette(c.etiquette, s.x, s.y, o.name);
  }
  // mon nom au-dessus de mon héros (dès que la sentinelle le connaît)
  const h = heros.heros;
  monEtiquette.hidden = !sentinelle?.qui;
  if (sentinelle?.qui) placerEtiquette(monEtiquette, h.x, h.y, sentinelle.qui.nom);
}

export function dispose() { party?.dispose?.(); panneau?.remove(); noms?.remove(); }

export const api = {
  party: null,
  copies,
  horloge: null,
  heberger, rejoindre, quitter, nom: nomAffiche,
  // les héros incarnés par les autres joueurs du groupe (leurs id)
  herosPris() { return new Set([...copies.values()].map((c) => c.heros.id)); },
  get statut() { return statut; },
  get panneau() { return panneau; },
  // Pour les tests : le même camp sur un fil « loopback » (party-net), avec son horloge.
  brancherTest(hub) { api.horloge = () => hub.time; creerParty(() => hub.transport()); dessiner(); return party; },
  rebrancher() { api.horloge = null; creerParty(() => partyNet.createPeerTransport({ prefix: PREFIXE })); dessiner(); },
};
