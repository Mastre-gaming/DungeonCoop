// Les missions du camp = les tâches du tableau de travail du dashboard = les issues du repo du jeu (CAMP §3).
// Mêmes règles que le dashboard (src/widgets/travail.js) : une tâche est une issue (pas une PR), et une idée n'en est
// une que si quelqu'un l'a prise. Fermée = rentrée ; quelqu'un d'assigné = en cours ; sinon = à prendre.
// Lecture : le Worker « direct » de Paul (CORS ouvert), sinon GitHub sans jeton, relu au plus toutes les 5 minutes.
// En direct : le WebSocket du Worker dit quand les issues changent ; on relit alors tout de suite.
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
let game, horsLigne = false, ws = null, ping = 0, relance = 0;
const etat = { issues: [], equipe: [], source: null, lueA: 0, erreur: null };

async function lireJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`${r.status} sur ${url}`);
  return r.json();
}

async function lire() {
  if (horsLigne) return;
  const chemin = `/repos/${DEPOT}/issues?state=all&per_page=100`;
  try {
    etat.issues = await lireJson(`${WORKER}/api${chemin}`); etat.source = 'worker'; etat.erreur = null;
  } catch (e) {
    try { etat.issues = await lireJson(`${GITHUB}${chemin}`); etat.source = 'github'; etat.erreur = null; }
    catch (e2) { etat.erreur = 'Les missions ne se lisent pas pour l’instant.'; console.warn(e, e2); }
  }
  etat.lueA = Date.now();
  game.bus.emit('missions:maj', api.resume());
}

function brancherDirect() {
  try {
    ws = new WebSocket(WORKER.replace(/^http/, 'ws') + '/direct');
    ws.onmessage = (m) => {
      try { const d = JSON.parse(m.data); if (d?.type === 'maj' && (d.sujets ?? []).includes('issues')) lire(); } catch {}
    };
    ws.onopen = () => { clearInterval(ping); ping = setInterval(() => { try { ws.send('ping'); } catch {} }, 30000); };
    ws.onclose = () => { clearInterval(ping); ws = null; clearTimeout(relance); relance = setTimeout(brancherDirect, 15000); };
  } catch { relance = setTimeout(brancherDirect, 15000); }
}

export function init(g, { horsLigne: hl = false } = {}) {
  game = g; horsLigne = hl;
  if (!horsLigne) {
    lire();
    lireJson(EQUIPE).then((e) => { etat.equipe = Array.isArray(e) ? e : []; game.bus.emit('missions:maj', api.resume()); }).catch(() => {});
    brancherDirect();
  }
  return api;
}

export function update() {
  // secours : sans le direct, on relit au plus toutes les 5 minutes (GitHub : 60 appels par heure sans jeton)
  if (!horsLigne && !ws && Date.now() - etat.lueA > 5 * 60_000) { etat.lueA = Date.now(); lire(); }
}

export function dispose() { clearInterval(ping); clearTimeout(relance); try { ws?.close(); } catch {} }

export const api = {
  etat,
  lire,
  regles: { progression, etatDe, lieuDe, tailleDe, estTache },
  // Pour les tests et dbg : remplace les issues par celles données (rien ne part sur le réseau).
  charger(issues, equipe = etat.equipe) { etat.issues = issues; etat.equipe = equipe; etat.source = 'test'; game.bus.emit('missions:maj', api.resume()); },
  taches: () => etat.issues.filter(estTache),
  nomDe(login) { const m = etat.equipe.find((e) => norm(e.github) === norm(login)); return m?.nom || login; },
  resume() {
    const taches = api.taches(), p = progression(etat.issues);
    return { ...p, aPrendre: taches.filter((t) => etatDe(t) === 'aprendre').length, taches: taches.length };
  },
};
