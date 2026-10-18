// Les missions du camp = les tâches du tableau de travail du dashboard = les issues du repo du jeu (CAMP §3).
// Mêmes règles que le dashboard (src/widgets/travail.js) : une tâche est une issue (pas une PR), et une idée n'en est
// une que si quelqu'un l'a prise. Fermée = rentrée ; quelqu'un d'assigné = en cours ; sinon = à prendre.
// Lecture : le Worker « direct » de Paul (CORS ouvert), sinon GitHub sans jeton, relu au plus toutes les 5 minutes.
// En direct : le WebSocket du Worker dit quand les issues changent ; on relit alors tout de suite, et à chaque reconnexion.
// L'équipe : equipe.json, où le pseudo choisi dans le dashboard (Worker, GET /profils) remplace le nom ; le
// WebSocket prévient aussi quand un pseudo change. Le camp lit les pseudos, il ne les écrit pas.
// En ?test, rien ne part sur le réseau : les vérifications donnent leurs propres missions.
import AXES from '../content/axes.json';   // le contrat des axes, lu aussi par le dashboard

export const name = 'missions';
export const always = true;

const DEPOT = 'Mastre-gaming/DungeonCoop';
const WORKER = 'https://dungeoncoop-direct.mastredev.workers.dev';
const GITHUB = 'https://api.github.com';
const EQUIPE = 'https://raw.githubusercontent.com/Mastre-gaming/DungeonCoop-dashboard/main/equipe.json';
export const DASHBOARD = 'https://dungeoncoop-dashboard.mastredev.workers.dev/';
// Chaque axe : son lieu au camp, et les labels qui le désignent (le sien, puis les anciens).
export const LIEUX_AXES = AXES.axes.map((a) => ({ id: a.id, lieu: a.lieu, axe: a.nom, couleur: a.couleur, labels: [a.label, ...(a.anciens ?? [])] }));
export const SEUILS = [0, 1, 5, 15, 35];                 // niveaux 0 à 4 d'un lieu (CAMP §4)
export const SEUILS_FEU = [0, 10, 40, 100, 200];         // tailles 0 à 4 du feu
export const POINTS = { S: 1, M: 3, L: 8 };

// --- Les règles (fonctions pures, testées dans ?test) ------------------------------------------
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const labels = (issue) => (issue.labels ?? []).map((l) => norm(typeof l === 'string' ? l : l.name));
export const estIdee = (issue) => labels(issue).includes('idee');
export const estTache = (issue) => !issue.pull_request && (!estIdee(issue) || (issue.assignees?.length ?? 0) > 0);
export const etatDe = (issue) => (issue.state === 'closed' ? 'rentree' : issue.assignees?.length ? 'encours' : 'aprendre');
export function lieuDe(issue) {
  const l = labels(issue);
  return LIEUX_AXES.find((x) => x.labels.some((lab) => l.includes(norm(lab))))?.id ?? null;
}
export function tailleDe(issue) {
  for (const l of labels(issue)) { const m = /^taille\s*:\s*([sml])$/.exec(l); if (m) return m[1].toUpperCase(); }
  return null;
}
const niveauDe = (p, seuils) => seuils.reduce((n, s, i) => (p >= s ? i : n), 0);

// fusionner(equipe, profils) → l'équipe où le pseudo remplace le nom d'equipe.json. L'ancien nom reste connu
// (autresNoms) : la sentinelle reconnaît encore « paul » après que Paul a choisi un pseudo.
export function fusionner(equipe = [], profils = []) {
  return equipe.map((m) => {
    const p = profils.find((x) => norm(x.github) === norm(m.github));
    return p?.nom ? { ...m, nom: p.nom, autresNoms: [m.nom].filter(Boolean) } : m;
  });
}

// progression(issues) → les points et le niveau de chaque lieu, le total de l'équipe et la taille du feu.
// Seules les missions rentrées comptent, selon leur taille (S 1, M 3, L 8 ; sans taille : 0). Une rouverte ne compte plus.
export function progression(issues) {
  const points = Object.fromEntries(LIEUX_AXES.map((x) => [x.id, 0]));
  for (const i of issues) {
    if (!estTache(i) || etatDe(i) !== 'rentree') continue;
    const lieu = lieuDe(i), t = tailleDe(i);
    if (lieu && t) points[lieu] += POINTS[t];
  }
  const niveaux = Object.fromEntries(Object.entries(points).map(([k, p]) => [k, niveauDe(p, SEUILS)]));
  const total = Object.values(points).reduce((a, b) => a + b, 0);
  return { points, niveaux, total, feu: niveauDe(total, SEUILS_FEU) };
}

// --- La lecture --------------------------------------------------------------------------------
// Le réseau (fetch, WebSocket, l'adresse du Worker) : celui du navigateur, ou un faux serveur en ?test (api.relier).
const RESEAU = { fetch: (...a) => fetch(...a), WebSocket: globalThis.WebSocket, worker: WORKER };
let game, horsLigne = false, reseau = RESEAU, ws = null, ping = 0, relance = 0, attente = 1000, dejaOuvert = false;
const etat = { issues: [], equipe: [], equipeFichier: [], profils: [], source: null, lueA: 0, erreur: null };
const RELIRE_DIRECT = 2 * 60_000;   // direct ouvert : une relecture de secours (le cache du Worker la sert)
const RELIRE_SEUL = 5 * 60_000;     // sans le direct : GitHub, 60 appels par heure sans jeton

async function lireJson(url) {
  const r = await reseau.fetch(url, { headers: { accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`${r.status} sur ${url}`);
  return r.json();
}

async function lire() {
  if (horsLigne) return;
  const chemin = `/repos/${DEPOT}/issues?state=all&per_page=100`;
  etat.lueA = Date.now();
  try {
    etat.issues = await lireJson(`${reseau.worker}/api${chemin}`); etat.source = 'worker'; etat.erreur = null;
  } catch (e) {
    try { etat.issues = await lireJson(`${GITHUB}${chemin}`); etat.source = 'github'; etat.erreur = null; }
    catch (e2) { etat.erreur = 'Les missions ne se lisent pas pour l’instant.'; console.warn(e, e2); }
  }
  etat.lueA = Date.now();
  game.bus.emit('missions:maj', api.resume());
}
const lireProfils = () => lireJson(`${reseau.worker}/profils`).then((p) => api.profils(p)).catch(() => {});

// Le direct. Comme celui du dashboard (son src/direct.js) : reconnexion en 1 s, puis 2, 4… jusqu'à 30 s, et tout de
// suite quand l'onglet revient au premier plan. À chaque reconnexion, on relit les issues et les pseudos : ce qui a
// changé pendant la coupure (une mission rentrée, une renommée gagnée) n'a pas été annoncé par le Worker.
function brancherDirect() {
  clearTimeout(relance);
  if (horsLigne || ws) return;
  let s;
  try { s = ws = new reseau.WebSocket(reseau.worker.replace(/^http/, 'ws') + '/direct'); } catch { ws = null; return plusTard(); }
  s.onmessage = (m) => {
    if (s !== ws || m.data === 'pong') return;
    try {
      const d = JSON.parse(m.data);
      if (d?.type === 'maj' && (d.sujets ?? []).includes('issues')) lire();
      if (d?.type === 'profils') api.profils(d.profils);
      game.bus.emit('direct:message', d);   // (les autres modules écoutent aussi : les push, la messagerie)
    } catch {}
  };
  s.onopen = () => {
    if (s !== ws) return;
    attente = 1000;
    clearInterval(ping); ping = setInterval(() => { try { s.send('ping'); } catch {} }, 30000);
    if (dejaOuvert) { lire(); lireProfils(); }
    dejaOuvert = true;
    game.bus.emit('direct:ouvert');
  };
  s.onclose = () => {
    if (s !== ws) return;
    clearInterval(ping); ws = null;
    game.bus.emit('direct:ferme');
    plusTard();
  };
}
function plusTard() {
  clearTimeout(relance);
  if (horsLigne) return;
  relance = setTimeout(brancherDirect, attente);
  attente = Math.min(attente * 2, 30_000);
}
function auPremierPlan() {
  if (document.visibilityState !== 'visible' || horsLigne || ws) return;
  attente = 1000; brancherDirect();
}
function debrancher() {
  clearInterval(ping); clearTimeout(relance);
  const s = ws; ws = null;
  try { s?.close(); } catch {}
}
function demarrer() {
  lire();
  lireJson(EQUIPE).then((e) => { etat.equipeFichier = Array.isArray(e) ? e : []; api.profils(etat.profils); }).catch(() => {});
  lireProfils();
  brancherDirect();
}

export function init(g, { horsLigne: hl = false } = {}) {
  game = g; horsLigne = hl;
  document.addEventListener('visibilitychange', auPremierPlan);
  if (!horsLigne) demarrer();
  return api;
}

export function update() {
  // secours : le direct ouvert, on relit toutes les 2 minutes (servi par le cache du Worker) ; sans lui, toutes les 5
  if (horsLigne) return;
  const ouvert = ws?.readyState === 1;
  if (Date.now() - etat.lueA > (ouvert ? RELIRE_DIRECT : RELIRE_SEUL)) lire();
}

export function dispose() { document.removeEventListener('visibilitychange', auPremierPlan); debrancher(); }

export const api = {
  // Envoyer au Worker direct, sur la même connexion (la messagerie) ; false si elle n'est pas ouverte.
  envoyerDirect(objet) { if (ws?.readyState !== 1) return false; try { ws.send(JSON.stringify(objet)); return true; } catch { return false; } },
  get directOuvert() { return ws?.readyState === 1; },
  // Pour les tests : brancher le camp sur un faux serveur ({ fetch, WebSocket, worker }) comme s'il était en ligne,
  // puis délier pour revenir hors ligne. Rien ne part sur le réseau.
  relier(faux) { debrancher(); reseau = { ...RESEAU, ...faux }; horsLigne = false; attente = 1000; dejaOuvert = false; demarrer(); },
  delier() { debrancher(); reseau = RESEAU; horsLigne = true; dejaOuvert = false; game.bus.emit('direct:ferme'); },
  etat,
  lire,
  regles: { progression, etatDe, lieuDe, tailleDe, estTache },
  // Pour les tests et dbg : remplace les issues par celles données (rien ne part sur le réseau).
  charger(issues, equipe = etat.equipe) { etat.issues = issues; etat.equipe = equipe; etat.source = 'test'; game.bus.emit('missions:maj', api.resume()); },
  taches: () => etat.issues.filter(estTache),
  nomDe(login) { const m = etat.equipe.find((e) => norm(e.github) === norm(login)); return m?.nom || login; },
  // Les pseudos du Worker (à la lecture, puis à chaque changement) : l'équipe est refaite avec.
  profils(liste) {
    etat.profils = Array.isArray(liste) ? liste : [];
    etat.equipe = fusionner(etat.equipeFichier, etat.profils);
    game.bus.emit('missions:maj', api.resume());
  },
  resume() {
    const taches = api.taches(), p = progression(etat.issues);
    return { ...p, aPrendre: taches.filter((t) => etatDe(t) === 'aprendre').length, taches: taches.length };
  },
};
