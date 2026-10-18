// La renommée du bâtisseur (RENOMMEE.fr.md), sur le HUD du camp (décision du 18 oct).
// Le calcul (§1, §2) : une mission rentrée rapporte sa taille (S 1, M 3, L 8) à chaque personne assignée, +50 % (arrondi
// au-dessus) si elle est faite à plusieurs ; une phase finie rapporte +5 à chaque personne qui y a rendu une mission.
// La phase d'une mission est celle de son jalon ; sans jalon, la phase en cours. Le podium d'une phase : les trois
// premiers de la renommée gagnée pendant la phase (une égalité partage la place), jamais un classement complet.
// Rien n'est stocké : tout se recalcule depuis les issues GitHub. Cosmétique et social seulement.
// La plaque : ton nom, ton titre, ta renommée ; le podium de la phase en cours ; une annonce quand une mission rentre.
// Le bouton ⟳ relit les issues tout de suite : le workflow missions-auto.yml a rentré, assigné et taillé sur GitHub ce qui
// est arrivé sur main ; la plaque recompte et dit ce qui a changé. « Sur le chantier » : les missions prises, pas rentrées.
import PHASES from '../content/phases.json';
import AXES from '../content/axes.json';
import { estTache, tailleDe, lieuDe, etatDe, POINTS } from './10_missions.js';

export const name = 'renommee';
export const always = true;

const codeJalon = (issue) => String(issue.milestone?.title ?? '').trim().split(/[\s·:]+/)[0].toUpperCase() || null;

// renommee(issues, phases) → { parPersonne, parPhase, parAxe, podiums, titres, phaseEnCours, finies, gains }
export function renommee(issues, phases = PHASES.phases) {
  const taches = issues.filter(estTache);
  const phaseDuJalon = (issue) => { const c = codeJalon(issue); return c ? phases.find((p) => p.jalons.includes(c))?.id ?? null : null; };
  // les phases finies : elles ont des missions (par leur jalon), toutes rentrées
  const finies = phases.filter((p) => { const l = taches.filter((t) => phaseDuJalon(t) === p.id); return l.length && l.every((t) => t.state === 'closed'); }).map((p) => p.id);
  const phaseEnCours = phases.find((p) => !finies.includes(p.id))?.id ?? phases[phases.length - 1]?.id ?? 0;

  const parPersonne = {}, parPhase = {}, parAxe = {}, rendus = {}, gains = {};
  const ajouter = (qui, n, phase, axe) => {
    parPersonne[qui] = (parPersonne[qui] ?? 0) + n;
    ((parPhase[phase] ??= {})[qui] = (parPhase[phase][qui] ?? 0) + n);
    if (axe) ((parAxe[qui] ??= {})[axe] = (parAxe[qui][axe] ?? 0) + n);
  };
  for (const t of taches) {
    if (t.state !== 'closed') continue;
    const taille = tailleDe(t), qui = (t.assignees ?? []).map((a) => a.login);
    if (!taille || !qui.length) continue;
    const base = POINTS[taille], bonus = qui.length > 1 ? Math.ceil(base / 2) : 0;
    const phase = phaseDuJalon(t) ?? phaseEnCours;
    for (const q of qui) { ajouter(q, base + bonus, phase, lieuDe(t)); (rendus[phase] ??= new Set()).add(q); }
    gains[t.number] = { chacun: base + bonus, qui, aPlusieurs: qui.length > 1 };
  }
  for (const id of finies) for (const q of rendus[id] ?? []) ajouter(q, 5, id, null);

  const podiums = {};
  for (const [id, points] of Object.entries(parPhase)) {
    const l = Object.entries(points).filter(([, n]) => n > 0).map(([qui, n]) => ({ qui, n }));
    for (const e of l) e.rang = 1 + l.filter((x) => x.n > e.n).length;   // une égalité partage la place
    podiums[id] = l.filter((e) => e.rang <= 3).sort((a, b) => a.rang - b.rang || a.qui.localeCompare(b.qui));
  }
  const titres = {};
  for (const [qui, axes] of Object.entries(parAxe)) {
    let best = null;
    for (const a of AXES.axes) if ((axes[a.id] ?? 0) > (best ? axes[best.id] : 0)) best = a;
    if (best) titres[qui] = best.titre;
  }
  return { parPersonne, parPhase, parAxe, podiums, titres, phaseEnCours, finies, gains };
}

// --- La plaque du HUD --------------------------------------------------------------------------
function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const CLE_REPLIE = 'dungeoncoop:renommee-repliee';
// Un visiteur rejoint l'équipe par l'invitation de l'organisation GitHub (une fois invité par l'organisateur).
export const INVITATION = 'https://github.com/orgs/Mastre-gaming/invitation';
const lireRepliee = () => { try { return localStorage.getItem(CLE_REPLIE) === '1'; } catch { return false; } };

let game, missions, sentinelle, visite, plaque, annonces, repliee = lireRepliee(), dernier = null, connues = null;
// Le bouton ⟳ : pendant la lecture, puis 10 s de repos (la lecture de secours sans Worker n'a que 60 appels par heure).
export const REPOS_ACTUALISER = 10_000;
const actu = { enCours: false, a: 0, message: null };

export function init(g, options) {
  game = g;
  ({ missions, sentinelle, visite } = options);
  plaque = el('section', { id: 'renommee', class: 'renommee-jeu', 'aria-label': 'La renommée des bâtisseurs' });
  annonces = el('div', { id: 'annonces', class: 'annonces', 'aria-live': 'polite' });
  document.body.append(plaque, annonces);
  game.bus.on('missions:maj', majDonnees);
  game.bus.on('nom:change', dessiner);
  majDonnees();
  return api;
}

function majDonnees() {
  dernier = renommee(missions.etat.issues);
  // une mission qui vient de rentrer (pas au premier chargement) : une annonce dorée
  const fermees = new Set(missions.etat.issues.filter((i) => i.state === 'closed').map((i) => i.number));
  if (connues && missions.etat.source) for (const n of fermees) if (!connues.has(n) && dernier.gains[n]) annoncer(n, dernier.gains[n]);
  if (missions.etat.source) connues = fermees;
  dessiner();
}

// Le nom d'une personne : le mien, celui que j'ai donné à la sentinelle ; les autres, celui du dashboard (ou leur pseudo).
function nomDe(login) {
  const moi = sentinelle?.qui;
  if (moi?.github && moi.github.toLowerCase() === String(login).toLowerCase() && moi.nom) return moi.nom;
  return missions.nomDe(login);
}

// ⟳ : relire les missions, puis dire ce qui a changé pour moi (ou que tout est à jour).
async function actualiser(lire = () => missions.lire()) {
  if (actu.enCours || Date.now() - actu.a < REPOS_ACTUALISER) return null;
  const login = sentinelle?.qui?.github ?? null;
  const avant = dernier ? { moi: login ? dernier.parPersonne[login] ?? 0 : 0, rentrees: Object.keys(dernier.gains).length } : { moi: 0, rentrees: 0 };
  actu.enCours = true; actu.message = null; dessiner();
  try { const p = lire(); if (p?.then) await p; } catch (e) { console.warn(e); }   // (une lecture sans attente reste synchrone : les tests)
  actu.enCours = false; actu.a = Date.now();
  majDonnees();
  const moi = login ? dernier.parPersonne[login] ?? 0 : 0, rentrees = Object.keys(dernier.gains).length - avant.rentrees;
  const heure = new Date(actu.a).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  actu.message = missions.etat.erreur ? missions.etat.erreur
    : moi > avant.moi ? `✦ +${moi - avant.moi} pour toi · à jour à ${heure}`
    : rentrees > 0 ? `${rentrees} mission${rentrees > 1 ? 's' : ''} rentrée${rentrees > 1 ? 's' : ''} · à jour à ${heure}`
    : `Rien de nouveau · à jour à ${heure}`;
  dessiner();
  setTimeout(() => { if (!actu.enCours) dessiner(); }, REPOS_ACTUALISER + 50);
  return { gagne: moi - avant.moi, rentrees, message: actu.message };
}

// Sur le chantier : chaque personne et la mission qu'elle a prise (la plus récente), sans les idées non prises.
function chantier() {
  const parQui = new Map();
  for (const t of missions.etat.issues.filter(estTache)) {
    if (etatDe(t) !== 'encours') continue;
    for (const a of t.assignees) { const l = parQui.get(a.login) ?? []; l.push(t); parQui.set(a.login, l); }
  }
  return [...parQui.entries()].map(([qui, l]) => ({ qui, mission: l.sort((a, b) => b.number - a.number)[0], autres: l.length - 1 }))
    .sort((a, b) => a.qui.localeCompare(b.qui));
}

function annoncer(numero, g) {
  const noms = g.qui.map(nomDe);
  const liste = noms.length > 1 ? `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}` : noms[0];
  const a = el('p', { class: 'annonce-renommee' }, `✦ +${g.chacun} pour ${liste} : #${numero} rentrée${g.aPlusieurs ? ` à ${noms.length}` : ''}`);
  annonces.append(a);
  setTimeout(() => a.classList.add('part'), 5000);
  setTimeout(() => a.remove(), 5800);
}

function dessiner() {
  if (!plaque || !dernier) return;
  const r = dernier, phase = PHASES.phases.find((p) => p.id === r.phaseEnCours);
  const podium = r.podiums[r.phaseEnCours] ?? [];
  const moi = sentinelle?.qui, login = moi?.github ?? null;
  const enfants = [];
  const repos = !actu.enCours && Date.now() - actu.a < REPOS_ACTUALISER;
  const boutonActu = visite ? null : el('button', { class: `actualiser${actu.enCours ? ' tourne' : ''}`, type: 'button', disabled: actu.enCours || repos,
    title: 'Actualiser : relire les missions rentrées sur main', 'aria-label': actu.enCours ? 'Lecture des missions…' : 'Actualiser la renommée',
    onclick: () => actualiser() }, '⟳');
  if (!visite) {
    const total = login ? r.parPersonne[login] ?? 0 : null;
    enfants.push(el('div', { class: 'moi' },
      el('button', { class: 'replier', type: 'button', 'aria-expanded': String(!repliee), 'aria-label': repliee ? 'Déplier la renommée' : 'Replier la renommée',
        onclick: () => { repliee = !repliee; try { localStorage.setItem(CLE_REPLIE, repliee ? '1' : '0'); } catch {} dessiner(); } }, repliee ? '▸' : '▾'),
      repliee ? el('span', { class: 'total' }, login ? `✦ ${total}` : '✦')
        : el('div', {},
          el('p', { class: 'qui' }, moi ? moi.nom : 'Voyageur', login && r.titres[login] ? el('span', { class: 'titre' }, ` · ${r.titres[login]}`) : null),
          login ? el('p', { class: 'total', title: 'Toute ta renommée, toutes phases confondues' }, `✦ ${total} au total`)
            : moi ? el('div', { class: 'visiteur' },
              el('p', { class: 'petit' }, 'Visiteur : rejoins l’équipe pour gagner de la renommée.'),
              el('a', { class: 'bouton-jeu', href: INVITATION, target: '_blank', rel: 'noopener' }, 'Rejoindre l’équipe sur GitHub ↗'))
            : el('p', { class: 'petit' }, 'Dis ton nom à la sentinelle de l’entrée.')),
      boutonActu));
    if (actu.message && !repliee) enfants.push(el('p', { class: 'petit etat-maj', role: 'status' }, actu.message));
  }
  if (visite || !repliee) {
    enfants.push(el('h2', { title: 'Le podium ne compte que la renommée gagnée pendant cette phase' }, `Podium · ${phase ? phase.titre : 'la phase en cours'}`));
    if (!podium.length) enfants.push(el('p', { class: 'petit' }, 'Personne sur le podium : la première mission rentrée y monte.'));
    else enfants.push(el('ol', { class: 'podium' }, podium.map((e) => el('li', { class: login === e.qui ? 'toi' : null }, el('span', { class: 'rang' }, `${e.rang}.`), el('span', { class: 'nom' }, nomDe(e.qui)), el('span', { class: 'n' }, `✦ ${e.n}`)))));
    if (!visite && login && !podium.some((e) => e.qui === login)) enfants.push(el('p', { class: 'petit' }, `Toi, cette phase : ✦ ${r.parPhase[r.phaseEnCours]?.[login] ?? 0}`));
    const enCours = chantier();
    if (enCours.length) {
      enfants.push(el('h2', {}, 'Sur le chantier'));
      enfants.push(el('ul', { class: 'chantier' }, enCours.slice(0, 5).map((c) => el('li', { class: login === c.qui ? 'toi' : null, title: `#${c.mission.number} ${c.mission.title}` },
        el('span', { class: 'nom' }, nomDe(c.qui)), el('span', { class: 'chantier-titre' }, c.mission.title), c.autres ? el('span', { class: 'n' }, `+${c.autres}`) : null))));
    }
  }
  plaque.classList.toggle('repliee', repliee && !visite);
  plaque.replaceChildren(...enfants);
}

export function update() {}
export function dispose() { plaque?.remove(); annonces?.remove(); }

export const api = {
  renommee,
  get resultat() { return dernier; },
  get plaque() { return plaque; },
  get annonces() { return annonces; },
  maj: majDonnees,
  actualiser,
  chantier,
  get actu() { return actu; },
  replier(oui) { repliee = !!oui; dessiner(); },
};
