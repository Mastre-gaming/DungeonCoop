// Le groupe (P) : les cadres de portrait de l'équipe, comme les cadres de raid d'un RPG (CAMP §8 bis).
// C'est « Qui fait quoi » du dashboard : un cadre par membre (equipe.json, et tout pseudo assigné à une mission),
// son nom, son titre (la renommée), ses quêtes en cours ; doré s'il est au camp en ce moment (en multijoueur).
// En bas, « Personne » : les quêtes que personne n'a prises, avec un lien vers le journal.
import { etatDe, tailleDe } from './10_missions.js';

export const name = 'groupe';
export const always = true;

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

let game, missions, renommee, reseau, sentinelle, images, boite, ouvert = false, quandJournal = null;

// Le portrait : la tête du héros de départ (tout le monde a le même pour l'instant), prise sur sa planche LPC.
function portrait() {
  const c = el('canvas', { width: 32, height: 32, class: 'portrait', 'aria-hidden': 'true' });
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(images.heros, 16, 10 * 64 + 8, 32, 32, 0, 0, 32, 32);   // marche vers le bas, première image : le visage
  return c;
}

// Les membres : equipe.json, plus tout pseudo assigné à une mission ; qui est au camp (moi et les copies du groupe).
export function membres(equipe, taches, presents) {
  const liste = new Map();
  for (const e of equipe) liste.set(norm(e.github), { login: e.github, nom: e.nom || e.github });
  for (const t of taches) for (const a of t.assignees ?? []) if (!liste.has(norm(a.login))) liste.set(norm(a.login), { login: a.login, nom: a.login });
  return [...liste.values()].map((m) => {
    const quetes = taches.filter((t) => etatDe(t) === 'encours' && (t.assignees ?? []).some((a) => norm(a.login) === norm(m.login))).sort((a, b) => a.number - b.number);
    return { ...m, quetes, present: presents.some((p) => norm(p) === norm(m.login) || norm(p) === norm(m.nom)) };
  }).sort((a, b) => (b.present - a.present) || (b.quetes.length - a.quetes.length) || a.nom.localeCompare(b.nom));
}

export function init(g, options) {
  game = g;
  ({ missions, renommee, reseau, sentinelle, images } = options);
  quandJournal = options.ouvrirJournal;
  boite = el('section', { id: 'groupe-cadres', class: 'cadres-groupe', hidden: true, 'aria-label': 'Le groupe : qui fait quoi' });
  document.body.append(boite);
  game.bus.on('missions:maj', () => ouvert && dessiner());
  for (const e of ['party:join', 'party:leave', 'party:status', 'nom:change']) game.bus.on(e, () => ouvert && dessiner());
  return api;
}

function presents() {
  const l = [];
  const moi = sentinelle?.qui;
  if (moi) l.push(moi.github ?? moi.nom);
  for (const o of reseau?.party?.others?.values() ?? []) l.push(o.name);
  return l;
}

function dessiner() {
  const taches = missions.taches(), titres = renommee?.resultat?.titres ?? {}, totaux = renommee?.resultat?.parPersonne ?? {};
  const moi = sentinelle?.qui;
  // (mon cadre porte le nom que j'ai donné à la sentinelle, si equipe.json n'en a pas)
  const equipe = (missions.etat.equipe ?? []).map((e) => (moi?.github && norm(e.github) === norm(moi.github) && !e.nom ? { ...e, nom: moi.nom } : e));
  const liste = membres(equipe, taches, presents());
  const aPrendre = taches.filter((t) => etatDe(t) === 'aprendre').length;
  const cadre = (m) => el('article', { class: `cadre${m.present ? ' present' : ''}`, 'data-login': m.login },
    portrait(),
    el('div', { class: 'cadre-corps' },
      el('p', { class: 'nom' }, m.nom, titres[m.login] ? el('span', { class: 'titre' }, ` · ${titres[m.login]}`) : null,
        totaux[m.login] ? el('span', { class: 'renom' }, ` ✦ ${totaux[m.login]}`) : null),
      m.present ? el('p', { class: 'etat' }, '● au camp') : null,
      m.quetes.length
        ? el('ul', {}, m.quetes.slice(0, 3).map((t) => el('li', {}, el('span', { class: 'num' }, `#${t.number}`), ' ', t.title, tailleDe(t) ? el('span', { class: 'taille' }, ` · ${tailleDe(t)}`) : null)),
          m.quetes.length > 3 ? el('li', { class: 'plus' }, `et ${m.quetes.length - 3} autre${m.quetes.length - 3 > 1 ? 's' : ''}`) : null)
        : el('p', { class: 'libre' }, 'Pas de quête en cours')));
  boite.replaceChildren(
    el('header', {}, el('h2', {}, 'Le groupe'), el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer le groupe' }, '✕')),
    el('div', { class: 'liste' }, liste.map(cadre),
      el('article', { class: 'cadre personne' },
        el('div', { class: 'portrait vide', 'aria-hidden': 'true' }, '?'),
        el('div', { class: 'cadre-corps' }, el('p', { class: 'nom' }, 'Personne'),
          el('p', { class: 'libre' }, `${aPrendre} quête${aPrendre > 1 ? 's' : ''} à prendre`),
          el('button', { class: 'bouton-jeu discret', type: 'button', onclick: () => { fermer(); quandJournal?.(); } }, 'Voir le journal (J)')))));
}

function ouvrir() { ouvert = true; boite.hidden = false; dessiner(); }
function fermer() { ouvert = false; boite.hidden = true; }

export function update() {}
export function dispose() { boite?.remove(); }

export const api = {
  ouvrir, fermer, membres,
  get ouvert() { return ouvert; },
  get boite() { return boite; },
};
