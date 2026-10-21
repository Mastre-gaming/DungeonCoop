// La chronique du camp (N) : les derniers push, façon RPG (CAMP §8 bis). C'est « Derniers push » du dashboard
// (src/widgets/commits.js), avec la même source : l'« activité » des deux repos (le jeu et le dashboard), à jour tout
// de suite, et les messages des commits de main. Quand un push arrive en direct (le Worker le signale : sujet
// « commits »), sa ligne s'affiche quelques secondes en bas à gauche ; N ouvre l'historique.

export const name = 'chronique';
export const always = true;

const ORG = 'Mastre-gaming';
const DEPOTS = [['DungeonCoop', 'jeu'], ['DungeonCoop-dashboard', 'dashboard']];
const WORKER = 'https://dungeoncoop-direct.mastredev.workers.dev';
export const VERBES = {
  push: 'a forgé sur',
  force_push: 'a reforgé de force',
  branch_creation: 'a ouvert le chantier',
  branch_deletion: 'a démonté le chantier',
  pr_merge: 'a scellé une PR dans',
  merge_queue_merge: 'a scellé une PR dans',
};

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const depuis = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
};

// Une ligne de chronique, à partir d'un événement d'activité GitHub.
export function phrase(e, nomDe = (l) => l) {
  const branche = String(e.ref ?? '').replace(/^refs\/(heads|tags)\//, '');
  return { qui: nomDe(e.actor?.login ?? '?'), verbe: VERBES[e.activity_type] ?? e.activity_type, branche, depot: e.depot, message: e.commit?.commit?.message?.split('\n')[0] ?? null, quand: e.timestamp, id: e.id };
}

let game, missions, visite, boite, crieur, ouvert = false, entrees = [], vus = null, lueA = 0;

async function lireJson(url) { const r = await fetch(url, { headers: { accept: 'application/vnd.github+json' } }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }
async function lire() {
  lueA = Date.now();
  try {
    const parDepot = await Promise.all(DEPOTS.map(async ([depot, court]) => {
      const base = `/repos/${ORG}/${depot}`;
      const via = (chemin) => lireJson(`${WORKER}/api${base}/${chemin}`).catch(() => lireJson(`https://api.github.com${base}/${chemin}`));
      const [activite, commits] = await Promise.all([via('activity?per_page=15'), via('commits?per_page=10').catch(() => [])]);
      const parSha = new Map(commits.map((c) => [c.sha, c]));
      return activite.map((a) => ({ ...a, depot: court, commit: parSha.get(a.after) }));
    }));
    api.charger(parDepot.flat());
  } catch (e) { console.warn('la chronique ne se lit pas', e); }
}

export function init(g, options) {
  game = g;
  ({ missions, visite } = options);
  boite = el('section', { id: 'chronique', class: 'chronique-camp', hidden: true, 'aria-label': 'La chronique du camp' });
  crieur = el('div', { id: 'crieur', class: 'crieur', 'aria-live': 'polite' });
  document.body.append(boite, crieur);
  if (!options.horsLigne) {
    lire();
    game.bus.on('direct:message', (d) => { if (d?.type === 'maj' && (d.sujets ?? []).includes('commits')) lire(); });
  }
  return api;
}

const nomDe = (login) => missions?.nomDe?.(login) ?? login;

function crier(e) {
  const p = phrase(e, nomDe);
  const ligne = el('p', { class: 'cri' }, '⚒ ', el('b', {}, p.qui), ` ${p.verbe} `, el('code', {}, p.branche), ` (${p.depot})`, p.message ? ` : « ${p.message} »` : '');
  crieur.append(ligne);
  setTimeout(() => ligne.classList.add('part'), 6000);
  setTimeout(() => ligne.remove(), 6800);
}

function dessiner() {
  const lignes = entrees.slice(0, 12).map((e) => {
    const p = phrase(e, nomDe);
    return el('li', { class: `evenement ${e.activity_type}` },
      el('p', {}, el('b', {}, p.qui), ` ${p.verbe} `, el('code', {}, p.branche), el('span', { class: 'depot' }, ` · ${p.depot}`)),
      p.message ? el('p', { class: 'message' }, `« ${p.message} »`) : null,
      el('p', { class: 'quand' }, depuis(p.quand)));
  });
  boite.replaceChildren(
    el('header', {}, el('h2', {}, 'Chronique du camp'), el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer la chronique' }, '✕')),
    lignes.length ? el('ol', {}, lignes) : el('p', { class: 'vide' }, 'La chronique attend son premier push…'),
    el('p', { class: 'pied' }, 'Toute l’activité : ', DEPOTS.map(([d, c], i) => [i ? ' · ' : '', el('a', { href: `https://github.com/${ORG}/${d}/activity`, target: '_blank', rel: 'noopener' }, c)])));
}

function ouvrir() { ouvert = true; boite.hidden = false; dessiner(); }
function fermer() { ouvert = false; boite.hidden = true; }

export function update() {
  // secours sans le direct : on relit au plus toutes les 5 minutes
  if (!visite && lueA && Date.now() - lueA > 5 * 60_000) lire();
}
export function dispose() { boite?.remove(); crieur?.remove(); }

export const api = {
  ouvrir, fermer, phrase, VERBES,
  get ouvert() { return ouvert; },
  get boite() { return boite; },
  get crieur() { return crieur; },
  get entrees() { return entrees; },
  // Les événements (de tous les repos), du plus récent au plus ancien. Un nouveau, après le premier chargement : on le crie.
  charger(liste) {
    entrees = [...liste].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    // (et le bus le dit : le crieur du tableau d'affichage le crie aussi, 38_crieur.js)
    if (vus && !visite) for (const e of entrees.slice(0, 3).reverse()) if (!vus.has(e.id)) { crier(e); game?.bus.emit('chronique:nouveau', e); }
    vus = new Set(entrees.map((e) => e.id));
    if (ouvert) dessiner();
  },
};
