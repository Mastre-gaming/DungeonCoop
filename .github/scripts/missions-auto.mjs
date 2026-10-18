// Les missions rentrées automatiquement : seul ce qui arrive sur main compte pour la renommée des bâtisseurs.
// Lancé par .github/workflows/missions-auto.yml à chaque push sur main. Pour chaque commit du push :
//  - il vient d'une PR fusionnée : les missions citées (« Ferme #n », aussi Closes/Fixes #n) sont fermées, assignées
//    à l'auteur de la PR si personne ne l'était, et reçoivent une taille si elles n'en avaient pas ;
//    une PR qui ne cite aucune mission en devient une : même titre, même axe, assignée à l'auteur, fermée ;
//  - il a été poussé sans PR : une mission par auteur, fermée, assignée à l'auteur.
// La taille automatique se lit aux lignes changées (ajoutées + retirées) : S sous 150, M sous 600, L au-dessus.
// Une taille ou une personne déjà posées à la main ne sont jamais changées.
//
// Le rattrapage (--historique) : tout ce qui est déjà sur main, chaque PR fusionnée et chaque push direct, passe par
// les mêmes règles ; ce qui a déjà sa mission rentrée, assignée et taillée n'est pas touché, rien n'est créé deux fois.
// Lancé à la main depuis l'onglet Actions (« Run workflow », historique coché), ou à blanc ici.
//
// À blanc, sans rien écrire (lecture seule, pour vérifier) ; le bilan dit les points que chacun gagnerait :
//   node .github/scripts/missions-auto.mjs --a-blanc --pr 72 [--pr 75] [--sha <commit>]
//   node .github/scripts/missions-auto.mjs --a-blanc --historique

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

export const SEUILS = { S: 150, M: 600 };
export const tailleAuto = (lignes) => (lignes < SEUILS.S ? 'S' : lignes < SEUILS.M ? 'M' : 'L');
export const aUneTaille = (labels) => labels.some((l) => /^taille\s*:/i.test(nom(l)));
export const axesDe = (labels) => labels.map(nom).filter((l) => /^axe\s*:/i.test(l));
const nom = (l) => (typeof l === 'string' ? l : l.name);

// Les missions citées : « Ferme #12 », « Fermé : #12 », et les mots que GitHub comprend (close, fix, resolve).
export function missionsCitees(texte, sauf) {
  const re = /\b(?:ferm[eé]|ferm[eé]e|close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d+)/gi;
  const n = new Set();
  for (const m of String(texte ?? '').matchAll(re)) if (Number(m[1]) !== sauf) n.add(Number(m[1]));
  return [...n].sort((a, b) => a - b);
}
// La marque laissée dans une mission créée ici : elle évite d'en créer deux pour la même PR ou le même commit.
export const marque = (cle) => `<!-- missions-auto: ${cle} -->`;
const estRobot = (u) => !u || u.type === 'Bot' || /\[bot\]$/.test(u.login ?? '');
const POINTS = { S: 1, M: 3, L: 8 };   // les mêmes que le jeu (src/10_missions.js) et RENOMMEE.fr.md

// Le bilan : les points que chaque personne gagne (missions créées ou devenues comptables), sans les bonus de phase.
export const bilan = new Map();
function gagner(qui, taille, numero) {
  const base = POINTS[taille], bonus = qui.length > 1 ? Math.ceil(base / 2) : 0;
  for (const q of qui) { const b = bilan.get(q) ?? { points: 0, missions: [] }; b.points += base + bonus; b.missions.push(`${numero} ${taille}`); bilan.set(q, b); }
}

// --- GitHub -------------------------------------------------------------------------------------------------------
function client({ depot, jeton, aBlanc, journal = console.log }) {
  const base = `https://api.github.com/repos/${depot}`;
  async function api(chemin, { method = 'GET', body } = {}) {
    if (method !== 'GET' && aBlanc) { journal(`  (à blanc) ${method} ${chemin} ${body ? JSON.stringify(body) : ''}`); return {}; }
    const url = chemin.startsWith('http') ? chemin : base + chemin;
    const r = await fetch(url, {
      method, body: body && JSON.stringify(body),
      headers: { authorization: `Bearer ${jeton}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'x-github-api-version': '2022-11-28' },
    });
    if (r.status === 404 && method === 'GET') return null;
    if (!r.ok) throw new Error(`${method} ${chemin} : ${r.status} ${await r.text()}`);
    return r.status === 204 ? {} : r.json();
  }
  return { api, depot };
}

async function dejaCreee(gh, cle) {
  const q = encodeURIComponent(`repo:${gh.depot} is:issue in:body "missions-auto: ${cle}"`);
  const r = await gh.api(`https://api.github.com/search/issues?q=${q}`);
  return r?.items?.[0]?.number ?? null;
}

// Une mission existante : fermée, assignée, taillée (seulement ce qui manque).
async function rentrer(gh, n, { auteur, taille, pourquoi, journal }) {
  const i = await gh.api(`/issues/${n}`);
  if (!i) return journal(`  #${n} : introuvable, rien à faire.`);
  if (i.pull_request) return journal(`  #${n} : c'est une PR, pas une mission.`);
  const faits = [];
  const tailleAvant = (i.labels ?? []).map(nom).find((l) => /^taille\s*:/i.test(l))?.split(':')[1].trim().toUpperCase();
  const quiAvant = (i.assignees ?? []).map((a) => a.login);
  const comptait = i.state === 'closed' && tailleAvant && quiAvant.length;
  if (!comptait && (tailleAvant ?? taille) && (quiAvant.length || auteur)) gagner(quiAvant.length ? quiAvant : [auteur], tailleAvant ?? taille, `#${n}`);
  if (!(i.assignees ?? []).length && auteur) { await gh.api(`/issues/${n}/assignees`, { method: 'POST', body: { assignees: [auteur] } }); faits.push(`assignée à ${auteur}`); }
  if (!aUneTaille(i.labels ?? [])) { await gh.api(`/issues/${n}/labels`, { method: 'POST', body: { labels: [`taille: ${taille}`] } }); faits.push(`taille ${taille}`); }
  if (i.state === 'open') {
    await gh.api(`/issues/${n}/comments`, { method: 'POST', body: { body: `Rentrée : ${pourquoi} est sur main.` } });
    await gh.api(`/issues/${n}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
    faits.push('fermée');
  }
  journal(`  #${n} : ${faits.length ? faits.join(', ') : 'déjà rentrée, assignée et taillée'}.`);
}

// Une mission nouvelle, pour un travail arrivé sur main sans mission.
async function creer(gh, { cle, titre, axes, auteur, taille, corps, journal }) {
  const deja = await dejaCreee(gh, cle);
  if (deja) return journal(`  déjà une mission pour ${cle} : #${deja}.`);
  if (auteur) gagner([auteur], taille, cle);
  const i = await gh.api('/issues', { method: 'POST', body: { title: titre, labels: [...axes, `taille: ${taille}`], body: `${corps}\n\n${marque(cle)}` } });
  const n = i.number ?? '(nouvelle)';
  if (auteur) { try { await gh.api(`/issues/${n}/assignees`, { method: 'POST', body: { assignees: [auteur] } }); } catch (e) { journal(`  ${auteur} ne peut pas être assigné : ${e.message}`); } }
  await gh.api(`/issues/${n}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
  journal(`  mission #${n} créée et rentrée : « ${titre} », ${axes.join(', ') || 'sans axe'}, taille ${taille}, ${auteur ?? 'personne'}.`);
}

export async function traiterPR(gh, numero, journal = console.log) {
  const pr = await gh.api(`/pulls/${numero}`);
  if (!pr?.merged_at) return journal(`PR #${numero} : pas fusionnée, rien à faire.`);
  if (estRobot(pr.user)) return journal(`PR #${numero} : ouverte par un robot, ignorée.`);
  const lignes = pr.additions + pr.deletions, taille = tailleAuto(lignes), auteur = pr.user.login;
  journal(`PR #${numero} « ${pr.title} » de ${auteur} : ${lignes} lignes, taille ${taille}.`);
  const citees = missionsCitees(`${pr.title}\n${pr.body ?? ''}`, numero);
  if (citees.length) {
    for (const n of citees) await rentrer(gh, n, { auteur, taille, pourquoi: `la PR #${numero}`, journal });
  } else {
    await creer(gh, {
      cle: `PR #${numero}`, titre: pr.title, axes: axesDe(pr.labels ?? []), auteur, taille, journal,
      corps: `Rentrée automatiquement : la PR #${numero} est sur main sans citer de mission.\n\n**Taille ${taille}** d'après ses ${lignes} lignes changées (S sous 150, M sous 600, L au-dessus).`,
    });
  }
}

// Les commits poussés sans PR, regroupés par auteur.
export async function traiterDirects(gh, commits, journal = console.log) {
  const parAuteur = new Map();
  for (const c of commits) {
    const auteur = c.author?.login;
    if (estRobot(c.author) || (c.parents ?? []).length > 1) continue;
    const g = parAuteur.get(auteur ?? '') ?? { auteur, lignes: 0, commits: [] };
    g.lignes += c.stats?.total ?? 0; g.commits.push(c); parAuteur.set(auteur ?? '', g);
  }
  for (const g of parAuteur.values()) {
    const premier = g.commits[0], taille = tailleAuto(g.lignes);
    const titre = g.commits.length === 1 ? premier.commit.message.split('\n')[0] : `${g.commits.length} commits poussés sur main`;
    journal(`Push direct de ${g.auteur ?? '(inconnu)'} : ${g.commits.length} commit(s), ${g.lignes} lignes, taille ${taille}.`);
    await creer(gh, {
      cle: `commit ${premier.sha.slice(0, 7)}`, titre, axes: [], auteur: g.auteur, taille, journal,
      corps: `Rentrée automatiquement : poussé sur main sans PR.\n\n${g.commits.map((c) => `- ${c.sha.slice(0, 7)} ${c.commit.message.split('\n')[0]}`).join('\n')}\n\n**Taille ${taille}** d'après ${g.lignes} lignes changées (S sous 150, M sous 600, L au-dessus). Sans axe : ajoute le label \`axe: …\` pour qu'elle compte aussi pour un lieu.`,
    });
  }
}

// Un push : quels commits viennent d'une PR fusionnée sur main, lesquels ont été poussés directement.
export async function traiterPush(gh, shas, journal = console.log) {
  const prs = new Set(), directs = [];
  for (const sha of shas) {
    const liees = (await gh.api(`/commits/${sha}/pulls`)) ?? [];
    const fusionnee = liees.find((p) => p.merged_at && p.base?.ref === 'main');
    if (fusionnee) prs.add(fusionnee.number);
    else { const c = await gh.api(`/commits/${sha}`); if (c) directs.push(c); }
  }
  for (const n of [...prs].sort((a, b) => a - b)) await traiterPR(gh, n, journal);
  if (directs.length) await traiterDirects(gh, directs, journal);
}

// GitHub répond parfois 500 : on réessaie deux fois.
async function essayer(f) { for (let k = 0; ; k++) { try { return await f(); } catch (e) { if (k >= 2) throw e; await new Promise((r) => setTimeout(r, 2000)); } } }

// Le rattrapage : chaque PR fusionnée sur main, puis les commits de main poussés sans PR.
async function toutes(gh, chemin) {
  const l = [];
  for (let page = 1; ; page++) { const p = (await essayer(() => gh.api(`${chemin}${chemin.includes('?') ? '&' : '?'}per_page=100&page=${page}`))) ?? []; l.push(...p); if (p.length < 100) return l; }
}
export async function traiterHistorique(gh, journal = console.log) {
  const prs = (await toutes(gh, '/pulls?state=closed&base=main')).filter((p) => p.merged_at).sort((a, b) => a.number - b.number);
  journal(`Historique : ${prs.length} PR fusionnées sur main.`);
  for (const p of prs) await traiterPR(gh, p.number, journal);
  // les commits de la ligne de main (sans ceux des branches fusionnées) : chacun vient d'une PR ou d'un push direct
  const shas = execSync('git log --first-parent --no-merges --format=%H origin/main', { encoding: 'utf8' }).split(/\s+/).filter(Boolean);
  const directs = [];
  for (const sha of shas) {
    const liees = (await essayer(() => gh.api(`/commits/${sha}/pulls`))) ?? [];
    if (!liees.some((p) => p.merged_at)) directs.push(await essayer(() => gh.api(`/commits/${sha}`)));
  }
  journal(`Historique : ${directs.length} commit(s) poussé(s) sur main sans PR.`);
  if (directs.length) await traiterDirects(gh, directs, journal);
}

// --- Lancement -----------------------------------------------------------------------------------------------------
if (process.argv[1]?.replace(/\\/g, '/').endsWith('.github/scripts/missions-auto.mjs')) {
  const args = process.argv.slice(2), aBlanc = args.includes('--a-blanc');
  const valeurs = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
  const gh = client({ depot: process.env.GH_REPO ?? 'Mastre-gaming/DungeonCoop', jeton: process.env.GH_TOKEN, aBlanc });
  if (aBlanc) console.log('À blanc : rien n’est écrit sur GitHub.');
  const prs = valeurs('--pr').map(Number), shas = valeurs('--sha');
  if (args.includes('--historique')) {
    await traiterHistorique(gh);
  } else if (prs.length || shas.length) {
    for (const n of prs) await traiterPR(gh, n);
    if (shas.length) await traiterPush(gh, shas);
  } else {
    const ev = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const commits = (ev.commits ?? []).filter((c) => c.distinct !== false).map((c) => c.id);
    console.log(`Push sur ${ev.ref} : ${commits.length} commit(s).`);
    await traiterPush(gh, commits);
  }
  console.log(`
Bilan${aBlanc ? ' (à blanc)' : ''} : ${bilan.size ? [...bilan].map(([q, b]) => `${q} +${b.points} (${b.missions.length} mission${b.missions.length > 1 ? 's' : ''})`).join(' · ') : 'personne ne gagne de points'}.`);
}
