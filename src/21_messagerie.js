// La messagerie de l'équipe, sur le HUD (M) (CAMP §8 bis ; la boîte aux lettres du décor est dessinée à part).
// C'est la messagerie du dashboard (son src/messagerie.js) : les messages passent par le Worker direct de Paul, sur
// la même connexion que le direct du camp. On y entre avec le laissez-passer de l'entrée du dashboard (un jeton
// signé) : le Worker le vérifie et signe chaque message du nom de son auteur. Le dashboard le passe au jeu par le
// fragment de l'adresse (#jeton=…, qui ne passe par aucun serveur) ; le jeu le garde dans ce navigateur.
// Sans lui (le lien local, ou le dashboard pas encore à jour) : « Me connecter par le dashboard » y mène avec
// #camp=<cette adresse> pour qu'il nous renvoie le laissez-passer, ou on colle celui que montre sa page /session.
// À l'entrée, le Worker donne l'historique (les 100 derniers messages, ceux du dashboard) ; ensuite chaque message,
// d'où qu'il soit écrit, arrive en direct. Après une coupure, on se représente et l'historique est relu.
// Dans le texte, #12 mène à l'issue ou la PR, et @nom prévient la personne. Les non-lus : une pastille sur la case M,
// et l'événement « messagerie:nonlus » pour la boîte aux lettres du camp (son icône).
//
// Le Worker (dashboard/worker/src/messagerie.js) :
//   page → Worker : { type: 'jeton', jeton } · { type: 'envoyer', ref, texte }
//   Worker → page : { type: 'bienvenue', nom, messages } · { type: 'refuse', raison } · { type: 'message', message }
//                   { type: 'envoye', ref, id } · { type: 'erreur', ref, erreur }      message = { id, auteur, texte, t }

export const name = 'messagerie';
export const always = true;

const CLE_JETON = 'dungeoncoop:laissez-passer';   // (la même clé que le dashboard, pour essayer sur son ordi)
const CLE_VU = 'dungeoncoop:messages-vus';
const DASHBOARD = 'https://dungeoncoop-dashboard.mastredev.workers.dev/';
const DEPOT = 'https://github.com/Mastre-gaming/DungeonCoop';
const MOTIF = /(https?:\/\/[^\s<>"]*[^\s<>".,;:!?)])|#(\d+)\b|@([\p{L}\p{N}_-]+)/gu;
const LONGUEUR_MAX = 500;

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const lire = (cle) => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle, v) => { try { v == null ? localStorage.removeItem(cle) : localStorage.setItem(cle, v); } catch {} };
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const heure = (t) => { try { return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// Le laissez-passer : dans le fragment de l'adresse (le dashboard l'y met), sinon celui qu'on a gardé.
export function lireLaissezPasser() {
  const m = /(?:^|[#&])jeton=([^&]+)/.exec(location.hash);
  if (m) {
    const jeton = decodeURIComponent(m[1]);
    ecrire(CLE_JETON, jeton);
    history.replaceState(null, '', location.pathname + location.search);   // on ne le laisse pas dans l'adresse
    return jeton;
  }
  return lire(CLE_JETON);
}

// Ce qu'on colle : le jeton seul (v1.…), ou la réponse de /session du dashboard ({ "nom": …, "jeton": … }).
export function extraireJeton(texte) {
  const t = String(texte ?? '').trim();
  const m = /v1\.\d{1,15}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.exec(t);
  return m && m[0].length <= 400 ? m[0] : null;
}
// L'adresse du dashboard qui nous renverra ici avec le laissez-passer (le dashboard doit le savoir faire).
export const versDashboard = (ici = location.origin + location.pathname + location.search) => `${DASHBOARD}#camp=${encodeURIComponent(ici)}`;

let game, missions, sentinelle, boite, fil, zone, info, erreur, statut, entree, ouvert = false, nonLusAvant = -1;
const etat = { messages: new Map(), statut: 'sans-jeton', raison: '', nom: null, jeton: null, vu: Number(lire(CLE_VU) ?? 0), enAttente: new Map(), compteur: 0 };
const INFOS = {
  'sans-jeton': 'Pour lire et écrire ici, il faut ton laissez-passer du dashboard (texte provisoire).',
  connexion: 'Connexion…',
  coupee: 'Connexion perdue, je me reconnecte…',
};

export function init(g, options) {
  game = g;
  ({ missions, sentinelle } = options);
  etat.jeton = options.jeton !== undefined ? options.jeton : lireLaissezPasser();
  etat.statut = etat.jeton ? 'connexion' : 'sans-jeton';

  fil = el('ol', { class: 'fil-messages', 'aria-live': 'polite' });
  info = el('p', { class: 'info' });
  erreur = el('p', { class: 'erreur-envoi', role: 'alert', hidden: true });
  statut = el('span', { class: 'statut' });
  zone = el('textarea', { rows: '2', maxlength: String(LONGUEUR_MAX), 'aria-label': 'Ton message', placeholder: 'Écris à l’équipe… #12 pour une mission, @nom pour prévenir' });
  const form = el('form', { class: 'ecrire', onsubmit: (e) => { e.preventDefault(); envoyer(zone.value); } }, zone, el('button', { class: 'bouton-jeu', type: 'submit' }, 'Envoyer'));
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } if (e.key === 'Escape') fermer(); });
  // sans laissez-passer : aller le chercher au dashboard, ou le coller
  const colle = el('input', { type: 'text', 'aria-label': 'Ton laissez-passer', placeholder: 'ou colle ton laissez-passer ici', autocomplete: 'off', spellcheck: 'false' });
  entree = el('form', { class: 'laissez-passer', hidden: true, onsubmit: (e) => {
    e.preventDefault();
    const jeton = extraireJeton(colle.value);
    if (!jeton) { erreur.textContent = 'Ce n’est pas un laissez-passer (il commence par v1.).'; erreur.hidden = false; return; }
    colle.value = ''; erreur.hidden = true; api.laissezPasser(jeton);
  } },
    el('a', { class: 'bouton-jeu', href: versDashboard(), rel: 'opener' }, 'Me connecter par le dashboard'),
    el('div', { class: 'coller' }, colle, el('button', { class: 'bouton-jeu', type: 'submit' }, 'Entrer')),
    el('p', { class: 'petit' }, 'Le laissez-passer est sur ', el('a', { href: `${DASHBOARD}session`, target: '_blank', rel: 'noopener' }, 'la page /session du dashboard ↗'), ' (une fois entré avec le mot de passe).'));
  colle.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });
  boite = el('section', { id: 'messagerie', class: 'messagerie-jeu', hidden: true, 'aria-label': 'Les messages de l’équipe' },
    el('header', {}, el('h2', {}, 'Messages'), statut, el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer les messages' }, '✕')),
    fil, info, entree, erreur, form);
  document.body.append(boite);

  game.bus.on('direct:ouvert', presenter);
  game.bus.on('direct:message', recevoir);
  game.bus.on('direct:ferme', couper);
  if (missions?.directOuvert) presenter();
  dessiner();
  return api;
}

// À chaque (re)connexion du direct, on montre son laissez-passer.
function presenter() {
  if (!etat.jeton) return;
  if (etat.statut === 'coupee' || etat.statut === 'connexion') etat.statut = 'connexion';
  missions?.envoyerDirect?.({ type: 'jeton', jeton: etat.jeton });
  dessiner();
}

// Le direct est tombé : le Worker a oublié qu'on était entré ; on se représentera à la reconnexion.
function couper() {
  if (!etat.jeton || etat.statut === 'refusee') return;
  etat.statut = 'coupee';
  dessiner();
}

function recevoir(m) {
  if (!m || typeof m !== 'object') return;
  if (m.type === 'bienvenue') {
    // l'historique du Worker (les 100 derniers) fait foi, à l'entrée comme à chaque reconnexion
    etat.statut = 'ouverte'; etat.nom = m.nom ?? null;
    etat.messages.clear();
    for (const x of m.messages ?? []) etat.messages.set(x.id, x);
  } else if (m.type === 'refuse') {
    etat.statut = 'refusee'; etat.raison = m.raison ?? 'Laissez-passer refusé.';
  } else if (m.type === 'message' && m.message) {
    etat.messages.set(m.message.id, m.message);
  } else if (m.type === 'envoye') {
    etat.enAttente.delete(m.ref);
  } else if (m.type === 'erreur') {
    const texte = etat.enAttente.get(m.ref); etat.enAttente.delete(m.ref);
    erreur.textContent = m.erreur ?? 'Le message n’est pas parti.'; erreur.hidden = false;
    if (texte && !zone.value) zone.value = texte;
  } else return;
  if (ouvert) marquerVus();
  dessiner();
}

function envoyer(texte) {
  const propre = String(texte ?? '').trim();
  if (!propre) return false;
  if (propre.length > LONGUEUR_MAX) { erreur.textContent = `${LONGUEUR_MAX} caractères au plus.`; erreur.hidden = false; return false; }
  const ref = `j${++etat.compteur}`;
  if (etat.statut !== 'ouverte' || !missions?.envoyerDirect?.({ type: 'envoyer', ref, texte: propre })) {
    erreur.textContent = etat.statut === 'sans-jeton' ? INFOS['sans-jeton'] : 'Pas de connexion : le message n’est pas parti.'; erreur.hidden = false;
    return false;
  }
  etat.enAttente.set(ref, propre); zone.value = ''; erreur.hidden = true;
  return true;
}

// Qui suis-je : le nom signé par le Worker, ou celui de la sentinelle (et son pseudo GitHub).
function estMoi(nom) {
  const n = norm(nom), moi = sentinelle?.qui;
  return [etat.nom, moi?.nom, moi?.github].filter(Boolean).some((x) => norm(x) === n);
}
const nonLus = () => [...etat.messages.values()].filter((m) => m.id > etat.vu && !estMoi(m.auteur)).length;
function marquerVus() {
  const max = Math.max(etat.vu, ...[...etat.messages.keys()].map(Number).filter(Number.isFinite));
  if (max !== etat.vu) { etat.vu = max; ecrire(CLE_VU, String(max)); }
}

function formater(texte) {
  const morceaux = [];
  String(texte).split('\n').forEach((ligne, i) => {
    if (i) morceaux.push(el('br'));
    let fin = 0;
    for (const m of ligne.matchAll(MOTIF)) {
      if (m.index > fin) morceaux.push(ligne.slice(fin, m.index));
      if (m[1]) morceaux.push(el('a', { href: m[1], target: '_blank', rel: 'noopener' }, m[1]));
      else if (m[2]) morceaux.push(el('a', { href: `${DEPOT}/issues/${m[2]}`, target: '_blank', rel: 'noopener', class: 'ref' }, `#${m[2]}`));
      else morceaux.push(el('span', { class: `mention${estMoi(m[3]) ? ' moi' : ''}` }, `@${m[3]}`));
      fin = m.index + m[0].length;
    }
    if (fin < ligne.length) morceaux.push(ligne.slice(fin));
  });
  return morceaux;
}

function dessiner() {
  const tries = [...etat.messages.values()].sort((a, b) => a.id - b.id);
  const enBas = fil.scrollHeight - fil.scrollTop - fil.clientHeight < 40;
  fil.replaceChildren(...(tries.length
    ? tries.map((m) => el('li', { class: `msg${estMoi(m.auteur) ? ' mien' : ''}`, 'data-id': m.id },
      el('p', { class: 'qui' }, el('b', {}, missions?.nomDe ? missions.nomDe(m.auteur) : m.auteur), el('span', { class: 'quand' }, ` ${heure(m.t)}`)),
      el('p', { class: 'texte' }, formater(m.texte))))
    : [el('li', { class: 'vide' }, etat.statut === 'ouverte' ? 'Pas encore de message. Le premier, c’est toi ?' : '…')]));
  if (enBas) fil.scrollTop = fil.scrollHeight;
  info.replaceChildren(...(etat.statut === 'refusee' ? [etat.raison]
    : [INFOS[etat.statut] ?? '']));
  info.hidden = etat.statut === 'ouverte';
  entree.hidden = !(etat.statut === 'sans-jeton' || etat.statut === 'refusee');
  statut.textContent = etat.statut === 'ouverte' && etat.nom ? `· ${etat.nom}` : '';
  zone.disabled = etat.statut !== 'ouverte';
  const n = nonLus();
  if (n !== nonLusAvant) { nonLusAvant = n; game.bus.emit('messagerie:nonlus', { n }); }
}

function ouvrir() { ouvert = true; boite.hidden = false; marquerVus(); dessiner(); fil.scrollTop = fil.scrollHeight; if (!zone.disabled) setTimeout(() => zone.focus(), 30); }
function fermer() { ouvert = false; boite.hidden = true; zone.blur(); }

export function update() {}
export function dispose() { boite?.remove(); }

export const api = {
  etat, ouvrir, fermer, envoyer, recevoir, nonLus, lireLaissezPasser, extraireJeton,
  get ouvert() { return ouvert; },
  get boite() { return boite; },
  // Pour les tests : un laissez-passer posé à la main (null pour l'oublier).
  laissezPasser(jeton) { etat.jeton = jeton; ecrire(CLE_JETON, jeton); etat.statut = jeton ? 'connexion' : 'sans-jeton'; presenter(); dessiner(); },
};
