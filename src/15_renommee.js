// La renommée du bâtisseur (RENOMMEE.fr.md), sur le HUD du camp (décision du 18 oct).
// Le calcul (§1, §2) : une mission rentrée rapporte sa taille (S 1, M 3, L 8) à chaque personne assignée, +50 % (arrondi
// au-dessus) si elle est faite à plusieurs ; une phase finie rapporte +5 à chaque personne qui y a rendu une mission.
// La phase d'une mission est celle de son jalon ; sans jalon, la phase en cours. Le podium d'une phase : les trois
// premiers de la renommée gagnée pendant la phase (une égalité partage la place), jamais un classement complet.
// Rien n'est stocké : tout se recalcule depuis les issues GitHub. Cosmétique et social seulement.
// La plaque : ton nom, ton titre, ta renommée ; le podium de la phase en cours ; une annonce quand une mission rentre.
import PHASES from '../content/phases.json';
import AXES from '../content/axes.json';
import { estTache, tailleDe, lieuDe, POINTS } from './10_missions.js';

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
  if (!visite) {
    const total = login ? r.parPersonne[login] ?? 0 : null;
    enfants.push(el('div', { class: 'moi' },
      el('button', { class: 'replier', type: 'button', 'aria-expanded': String(!repliee), 'aria-label': repliee ? 'Déplier la renommée' : 'Replier la renommée',
        onclick: () => { repliee = !repliee; try { localStorage.setItem(CLE_REPLIE, repliee ? '1' : '0'); } catch {} dessiner(); } }, repliee ? '▸' : '▾'),
      repliee ? el('span', { class: 'total' }, login ? `✦ ${total}` : '✦')
        : el('div', {},
          el('p', { class: 'qui' }, moi ? moi.nom : 'Voyageur', login && r.titres[login] ? el('span', { class: 'titre' }, ` · ${r.titres[login]}`) : null),
          login ? el('p', { class: 'total' }, `✦ ${total} renommée`)
            : moi ? el('div', { class: 'visiteur' },
              el('p', { class: 'petit' }, 'Visiteur : rejoins l’équipe pour gagner de la renommée.'),
              el('a', { class: 'bouton-jeu', href: INVITATION, target: '_blank', rel: 'noopener' }, 'Rejoindre l’équipe sur GitHub ↗'))
            : el('p', { class: 'petit' }, 'Dis ton nom à la sentinelle de l’entrée.'))));
  }
  if (visite || !repliee) {
    enfants.push(el('h2', {}, phase ? phase.titre : 'La phase en cours'));
    if (!podium.length) enfants.push(el('p', { class: 'petit' }, 'Personne sur le podium : la première mission rentrée y monte.'));
    else enfants.push(el('ol', { class: 'podium' }, podium.map((e) => el('li', { class: login === e.qui ? 'toi' : null }, el('span', { class: 'rang' }, `${e.rang}.`), el('span', { class: 'nom' }, nomDe(e.qui)), el('span', { class: 'n' }, `✦ ${e.n}`)))));
    if (!visite && login && !podium.some((e) => e.qui === login)) enfants.push(el('p', { class: 'petit' }, `Toi, cette phase : ✦ ${r.parPhase[r.phaseEnCours]?.[login] ?? 0}`));
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
  replier(oui) { repliee = !!oui; dessiner(); },
};
