// Le tour du camp (CAMP §5, validé par le propriétaire le 18 oct dans la démo design/camp/demo ; aimé : LIKED.md).
// Une fois le nom donné, la sentinelle a pressé le joueur (« Magne-toi ! Suis-moi ») ; sur « Je te suis », elle part
// devant et le héros la suit tout seul (il court s'il est loin). À chaque arrêt, elle se tourne vers lui et parle dans
// la boîte de dialogue ; la caméra cadre ce qu'elle montre dans le haut de l'écran, au-dessus de la boîte.
//   le feu · le tableau d'affichage (il se met à scintiller) · un terrain vide (piquets, corde, pancarte) ·
//   un rat d'exemple, d'une PR du joueur, qui surgit avec son « ! » · la fin : « Au travail ! »
// À la fin, le rat d'exemple détale, elle retourne à son poste et le joueur reprend la main.
// On peut passer le tour (bouton ou Échap) et le refaire plus tard (lui parler, E, puis « Refaire le tour »).
// Les visites suivantes n'ont pas de tour. Ses répliques sont provisoires : les textes du jeu sont à l'équipe.
import { T, FEU, LIEUX } from './01_plan.js';

export const name = 'tour';
export const always = true;

const TEXTE = {
  feu: () => 'Le feu, c’est l’équipe entière. Chaque mission rentrée le nourrit. Regarde-le : il fait pitié. C’est à vous de le faire grandir.',
  tableau: () => 'Le tableau d’affichage. Tout ce qu’il reste à bâtir est écrit là : les zones du camp, et les missions de chacune. Quand il scintille, c’est qu’il y a du travail à prendre. Et il y en a.',
  terrain: () => 'Et ça, c’est un terrain. Vide. Il attend quelqu’un. Tu prends une mission, ta PR dit « Ferme #12 », elle est fusionnée : un bâtiment pousse ici, chez tout le monde. Ce camp, c’est toi qui le construis.',
  rat: () => 'Ah, un rat. Chaque PR qui traîne en devient un, et il court après celui qui l’a poussée. Clique dessus : il te mène à la PR à régler. Une fois réglée, il détale.',
  fin: (n) => `Voilà le tour, ${n}. Le reste n’existe pas encore : c’est à toi de le bâtir. Allez, magne-toi !`,
};
const VITESSE = 78;                    // la sentinelle marche à peine plus vite que le héros (74) : il court pour la rattraper
const LOIN = 64;                       // au-delà, le héros court
const TERRAINS = ['combat', 'level', 'classes', 'histoire', 'art', 'son', 'technique'];   // le terrain vide montré : le premier au niveau 0

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null) n.append(e instanceof Node ? e : String(e));
  return n;
}
const dirDe = (vx, vy) => (Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'gauche' : 'droite') : (vy < 0 ? 'haut' : 'bas'));
const ELAN = { haut: [0, -1], droite: [1, 0], bas: [0, 1], gauche: [-1, 0] };

let game, heros, sentinelle, camera, collision, camp, lieux, decor, rats, images, visite;
let boite, texte, portrait, suivant, passer;
// phase : appel (elle lève la main), marche, parle, retour (elle rentre à son poste) ; inactif hors du tour
const V = { actif: false, etape: 0, phase: '', t: 0, chemin: [], arrets: [], rat: null, but: null, reroute: 0, phrase: '', ecrit: 0, vus: [] };

// Les arrêts, posés sur le plan du camp : où elle s'arrête, où le héros se tient à côté d'elle, ce que la caméra cadre.
export function arrets() {
  const pan = camp.lieux.interface.panneau;
  const id = TERRAINS.find((i) => (lieux?.niveau(i) ?? 0) === 0) ?? TERRAINS[0];
  const [px, py] = LIEUX.find((l) => l.id === id).porte;
  const terrain = { sentinelle: [(px - 0.3) * T, (py + 1.5) * T], heros: [(px + 1.3) * T, (py + 1.8) * T], vue: [(px + 1) * T, (py + 0.2) * T] };
  return [
    { id: 'feu', sentinelle: [20.4 * T, 17.7 * T], heros: [19.2 * T, 17.9 * T], vue: [FEU[0] * T, FEU[1] * T - 0.2 * T], texte: TEXTE.feu },
    { id: 'tableau', sentinelle: [pan.x - 0.4 * T, pan.pied + 1.3 * T], heros: [pan.x + 1.6 * T, pan.pied + 1.7 * T], vue: [pan.x + pan.w / 2, pan.y + pan.h / 2], etoiles: true, texte: TEXTE.tableau },
    { id: 'terrain', lieu: id, ...terrain, texte: TEXTE.terrain },
    { id: 'rat', ...terrain, rat: true, texte: TEXTE.rat },
    { id: 'fin', ...terrain, fin: true, bouton: 'Au travail !', texte: () => TEXTE.fin(sentinelle.qui?.nom ?? 'l’ami') },
  ];
}

export function init(g, options) {
  game = g;
  ({ heros, sentinelle, camera, collision, camp, lieux, decor, rats, images, visite } = options);
  portrait = el('canvas', { width: 40, height: 40, class: 'portrait', 'aria-hidden': 'true' });
  const gp = portrait.getContext('2d'); gp.imageSmoothingEnabled = false;
  gp.drawImage(images.sentinelle, 12, 2 * 64 + 6, 40, 40, 0, 0, 40, 40);   // sa tête, comme dans la boîte du nom
  texte = el('p', { class: 'dial-texte', 'aria-live': 'polite' });
  passer = el('button', { class: 'bouton-jeu discret', type: 'button', onclick: () => finir() }, 'Passer le tour');
  suivant = el('button', { class: 'bouton-jeu', type: 'button', onclick: () => suite() }, 'Suivant');
  boite = el('div', { id: 'dialogue-tour', class: 'dialogue', hidden: true, role: 'dialog', 'aria-label': 'La sentinelle te fait faire le tour du camp' },
    portrait,
    el('div', { class: 'dial-corps' }, el('p', { class: 'dial-qui' }, 'La sentinelle ', el('span', { class: 'provisoire' }, 'texte provisoire')), texte,
      el('div', { class: 'dial-boutons' }, passer, suivant)));
  document.body.append(boite);
  window.addEventListener('keydown', (e) => {
    if (!V.actif || V.phase === 'retour') return;
    if (e.code === 'Escape') { e.preventDefault(); finir(); }
    else if ((e.code === 'Enter' || e.code === 'Space') && V.phase === 'parle' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); suite(); }
  });
  game.bus.on('tour:demarrer', demarrer);
  return api;
}

function demarrer() {
  if (visite) return;
  const S = sentinelle.etat;
  Object.assign(V, { actif: true, etape: 0, phase: 'appel', t: 0, chemin: [], arrets: arrets(), rat: null, but: null, reroute: 0, vus: [] });
  heros.controle(false);
  sentinelle.bloquer(false);
  Object.assign(S, { phase: 'guide', leve: true, marche: false, t: 0, dir: dirDe(heros.heros.x - S.x, heros.heros.y - S.y) });
  boite.hidden = true;
  game.bus.emit('tour:etape', { phase: 'appel' });
}

function partirVers([x, y]) {
  const S = sentinelle.etat;
  V.chemin = collision.chemin(S.x, S.y, x, y) ?? [];
  if (V.chemin.length) V.chemin[V.chemin.length - 1] = [x, y];   // le dernier point : la place exacte
  S.t = 0;
}

// Où le héros doit aller : derrière elle quand elle marche, à sa place à côté d'elle quand elle s'arrête.
function butHeros() {
  const S = sentinelle.etat;
  if (V.phase === 'appel') return null;
  if (V.phase === 'marche' && V.chemin.length) { const [ex, ey] = ELAN[S.dir]; return [S.x - ex * 30, S.y - ey * 22]; }
  return V.arrets[V.etape].heros;
}

function suivre(dt) {
  const h = heros.heros, but = butHeros();
  if (!but) return;
  const d = Math.hypot(but[0] - h.x, but[1] - h.y);
  heros.presser(d > LOIN);
  V.reroute -= dt;
  const bouge = !V.but || Math.hypot(but[0] - V.but[0], but[1] - V.but[1]) > 10;
  if (d > 6 && (bouge || (!h.route && V.reroute <= 0))) { heros.allerA(...but); V.but = but; V.reroute = 0.3; }
}

function marcher(dt) {
  const S = sentinelle.etat, b = V.chemin[0];
  if (!b) { S.marche = false; return true; }
  const vx = b[0] - S.x, vy = b[1] - S.y, d = Math.hypot(vx, vy), v = VITESSE * dt;
  S.marche = true;
  if (d <= v) { S.x = b[0]; S.y = b[1]; V.chemin.shift(); }
  else { S.x += (vx / d) * v; S.y += (vy / d) * v; S.dir = dirDe(vx, vy); }
  return false;
}

export function update(dt) {
  if (!V.actif) return;
  const S = sentinelle.etat, h = heros.heros;
  V.t += dt;
  if (V.phase === 'appel') {
    S.dir = dirDe(h.x - S.x, h.y - S.y);
    if (V.t > 1.1) { S.leve = false; V.phase = 'marche'; V.t = 0; partirVers(V.arrets[0].sentinelle); }
  } else if (V.phase === 'marche') {
    if (marcher(dt)) {
      const a = V.arrets[V.etape];
      S.dir = dirDe(h.x - S.x, h.y - S.y);
      const arrive = Math.hypot(a.heros[0] - h.x, a.heros[1] - h.y) < 10 || (!h.route && Math.hypot(a.heros[0] - h.x, a.heros[1] - h.y) < 20);
      if (arrive || V.t > 12) { V.phase = 'parle'; V.t = 0; parler(); }
    }
  } else if (V.phase === 'parle') {
    S.dir = dirDe(h.x - S.x, h.y - S.y);
    if (!h.bouge) h.dir = dirDe(S.x - h.x, S.y - h.y);
    // la réplique s'écrit lettre à lettre (35 par seconde), comme celle du nom
    if (V.ecrit < V.phrase.length) { V.ecrit = Math.min(V.phrase.length, V.ecrit + dt * 35); texte.textContent = V.phrase.slice(0, Math.floor(V.ecrit)); }
  } else if (V.phase === 'retour') {
    if (marcher(dt)) { Object.assign(S, { phase: 'libre', t: 0, dir: 'bas', marche: false }); sentinelle.bloquer(true); V.actif = false; game.bus.emit('tour:fini'); }
  }
  if (V.phase === 'appel' || V.phase === 'marche' || V.phase === 'parle') suivre(dt);
}

function parler() {
  const a = V.arrets[V.etape], h = heros.heros;
  V.vus.push(a.id);
  camera.cadrer(a.vue);
  if (a.etoiles) decor.forcerAppel(true);
  if (a.rat && !V.rat && rats) {   // un rat d'exemple, de ta PR : il surgit avec son « ! » et te court après
    V.rat = rats.exemple({ cle: 'tour', espece: 2, chasse: true,
      pr: { numero: 7, titre: 'Exemple : ta PR qui attend une relecture', url: 'https://github.com/Mastre-gaming/DungeonCoop/pulls', depot: 'jeu', auteur: sentinelle.qui?.github ?? '' } },
    [h.x + 4 * T, h.y + 0.2 * T]);
  }
  V.phrase = a.texte(); V.ecrit = 0; texte.textContent = '';
  suivant.textContent = a.bouton ?? 'Suivant';
  boite.hidden = false;
  setTimeout(() => { if (!boite.hidden) suivant.focus({ preventScroll: true }); }, 50);
  game.bus.emit('tour:etape', { phase: 'parle', id: a.id });
}

function suite() {
  if (!V.actif || V.phase !== 'parle') return;
  if (V.ecrit < V.phrase.length) { V.ecrit = V.phrase.length; texte.textContent = V.phrase; return; }   // d'abord, finir la phrase
  const a = V.arrets[V.etape];
  if (a.fin) { finir(); return; }
  boite.hidden = true;
  V.etape++; V.phase = 'marche'; V.t = 0; V.but = null;
  const b = V.arrets[V.etape];
  if (String(b.vue) !== String(a.vue)) camera.cadrer(null);
  partirVers(b.sentinelle);
}

// « Au travail ! », « Passer le tour » ou Échap : le rat d'exemple détale, elle retourne à son poste, le joueur a la main.
function finir() {
  if (!V.actif || V.phase === 'retour') return;
  boite.hidden = true;
  camera.cadrer(null);
  decor.forcerAppel(false);
  if (V.rat) rats.fuir(V.rat);
  heros.presser(false);
  heros.heros.route = null;
  heros.controle(true);
  const S = sentinelle.etat;
  Object.assign(S, { leve: false });
  V.phase = 'retour'; V.t = 0;
  partirVers([sentinelle.POSTE_LIBRE.x, sentinelle.POSTE_LIBRE.y]);
  game.bus.emit('tour:etape', { phase: 'retour' });
}

export function dispose() { boite?.remove(); }

export const api = {
  etat: V, arrets, demarrer, suite, finir,
  get dialogue() { return boite; },
  get texte() { return texte.textContent; },
  get phrase() { return V.phrase; },
  get bouton() { return suivant; },
  get passer() { return passer; },
};
