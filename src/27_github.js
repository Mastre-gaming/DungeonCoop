// La connexion GitHub du camp : pour créer, modifier, prendre, rentrer, assigner et supprimer les missions depuis le
// tableau du camp. C'est la même que celle du tableau de travail du dashboard (son src/connexion.js) : le Worker direct
// fait l'aller-retour avec GitHub (la GitHub App « DungeonCoop Dashboard ») et rend le token dans le fragment de
// l'adresse (#jeton=…, qui ne passe par aucun serveur). Le camp le garde dans ce navigateur et écrit dans GitHub
// lui-même : c'est GitHub qui dit qui a le droit. Le tableau de travail du dashboard suit tout seul (le webhook).
// Le Worker ne renvoie le token qu'aux pages de sa liste PAGES : le camp doit y être (Paul, docs/brouillons/POUR_PAUL…).
// Le même fragment #jeton= porte aussi le laissez-passer de la messagerie (v1.…) : ici, on ne prend que le token GitHub.
// En ?test, rien ne part sur le réseau : api.relier({ fetch }) branche un faux GitHub.

export const name = 'github';
export const always = true;

const WORKER = 'https://dungeoncoop-direct.mastredev.workers.dev';
const API = 'https://api.github.com';
const CLE = 'dungeoncoop:github';
const lire = () => { try { return localStorage.getItem(CLE); } catch { return null; } };
const ecrire = (v) => { try { v ? localStorage.setItem(CLE, v) : localStorage.removeItem(CLE); } catch {} };

let game, reseau = { fetch: (...a) => fetch(...a) };
const etat = { jeton: null, login: null, erreur: null, verifie: false };

// Au chargement : le Worker vient peut-être de nous rendre un token GitHub (ou une erreur) dans le fragment.
export function lireFragment() {
  const f = new URLSearchParams(location.hash.slice(1));
  const jeton = f.get('jeton'), erreur = f.get('connexion-erreur');
  const pourNous = (jeton && !jeton.startsWith('v1.')) || erreur;   // (v1.… : le laissez-passer, pour la messagerie)
  if (!pourNous) return null;
  if (jeton && !jeton.startsWith('v1.')) ecrire(jeton);
  history.replaceState(null, '', location.pathname + location.search);   // le token ne reste pas dans l'adresse
  return { jeton, erreur };
}

export function init(g, options = {}) {
  game = g;
  const f = options.horsLigne ? null : lireFragment();
  etat.erreur = f?.erreur ?? null;
  etat.jeton = options.horsLigne ? null : lire();
  if (etat.jeton) qui();
  return api;
}

const prevenir = () => game.bus.emit('github:connexion', { login: etat.login });

// Qui est connecté. Un token refusé (expiré, révoqué) est oublié.
async function qui() {
  try {
    const u = await appel('GET', '/user');
    etat.login = u?.login ?? null;
  } catch (e) {
    if (e.status === 401) { deconnecter(); etat.erreur = 'La connexion GitHub a expiré : reconnecte-toi.'; }
  }
  etat.verifie = true;
  prevenir();
  return etat.login;
}

// L'adresse qui lance la connexion : le Worker, puis GitHub, puis retour ici avec #jeton=…
export const adresseConnexion = (ici = location.origin + location.pathname + location.search) => `${WORKER}/auth/connexion?retour=${encodeURIComponent(ici)}`;
function connecter() { location.href = adresseConnexion(); }
function deconnecter() { etat.jeton = null; etat.login = null; ecrire(null); prevenir(); }

const MESSAGES = {
  401: 'La connexion GitHub a expiré : reconnecte-toi.',
  403: 'GitHub refuse : il faut l’écriture sur le repo du jeu.',
  404: 'GitHub refuse : il faut l’écriture sur le repo du jeu.',
};
// Une requête à l'API REST de GitHub, avec le token. Renvoie la réponse (l'issue à jour), ou lance une erreur en français.
export async function appel(methode, chemin, corps) {
  if (!etat.jeton) throw Object.assign(new Error('Connecte-toi d’abord à GitHub.'), { status: 0 });
  const r = await reseau.fetch(`${API}${chemin}`, {
    method: methode, cache: 'no-store',
    headers: { Authorization: `Bearer ${etat.jeton}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(corps ? { 'Content-Type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (r.ok) return r.status === 204 ? null : r.json();
  const raison = (await r.json().catch(() => ({}))).message ?? '';
  const message = MESSAGES[r.status] ?? (r.status === 422 ? `GitHub refuse ce changement (${raison || 'données invalides'}).` : `GitHub a répondu ${r.status}${raison ? ` : ${raison}` : ''}.`);
  throw Object.assign(new Error(message), { status: r.status });
}

// Une requête GraphQL (la seule façon de supprimer une issue ; réservé aux admins du repo).
export async function graphql(query, variables) {
  const d = await appel('POST', '/graphql', { query, variables });
  if (d?.errors?.length) throw Object.assign(new Error(`GitHub refuse : ${d.errors.map((e) => e.message).join(' ; ')}`), { status: 403, graphql: true });
  return d?.data;
}

export function update() {}
export function dispose() {}

export const api = {
  etat, appel, graphql, connecter, deconnecter, adresseConnexion,
  get connecte() { return !!etat.jeton; },
  get login() { return etat.login; },
  // Pour les tests : un faux GitHub ({ fetch }), et un token posé à la main (null pour l'oublier). Rien ne part sur le réseau.
  relier(faux) { reseau = { ...reseau, ...faux }; },
  delier() { reseau = { fetch: (...a) => fetch(...a) }; },
  async poserJeton(jeton) { etat.jeton = jeton || null; etat.login = null; etat.erreur = null; if (!jeton) { prevenir(); return null; } return qui(); },
};
