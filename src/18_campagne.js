// La campagne (C) : l'avancée du projet, façon RPG (CAMP §8 bis). C'est « Avancée du projet » du dashboard
// (src/widgets/avancee.js), avec les mêmes sources : le tableau « Milestones » de GAME_SPEC.md (le statut de chaque
// jalon, la source officielle) et les jalons GitHub (la part de missions rentrées de chacun).
//   la bannière de campagne : toujours visible en haut au centre (DESIGN.fr.md §1, direction C), le chapitre en cours
//     en lettres d'or et sa jauge, dans un cadre de bois à coins de laiton, deux flammes rouges qui pendent dessous ;
//   la carte de campagne : les jalons D1 à M4 comme des étapes sur un chemin, le détail au clic.

export const name = 'campagne';
export const always = true;

const DEPOT = 'Mastre-gaming/DungeonCoop';
const WORKER = 'https://dungeoncoop-direct.mastredev.workers.dev';
const SPEC = `https://raw.githubusercontent.com/${DEPOT}/main/GAME_SPEC.md`;

// --- Lire GAME_SPEC.md (le même lecteur que le dashboard) -------------------------------------
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const nettoyer = (s) => String(s ?? '').replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
function section(texte, titre) {
  const debut = new RegExp(`^##\\s+${titre}\\b.*$`, 'mi').exec(texte);
  if (!debut) return '';
  const reste = texte.slice(debut.index + debut[0].length), fin = reste.search(/^##\s/m);
  return fin < 0 ? reste : reste.slice(0, fin);
}
function titreEtDetail(resultat) {
  const gras = /^\*\*(.+?)\*\*[\s,:;.-]*(.*)$/.exec(resultat.trim());
  if (gras) return { titre: nettoyer(gras[1]), detail: nettoyer(gras[2]) };
  const texte = nettoyer(resultat), i = texte.indexOf(':');
  if (i > 0 && i < 60) return { titre: texte.slice(0, i), detail: texte.slice(i + 1).trim() };
  return { titre: texte, detail: '' };
}
export function lireJalons(texte) {
  return section(texte, 'Milestones').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'))
    .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((c) => c.length >= 4 && !/^:?-+:?$/.test(c[0]) && nettoyer(c[0]) !== '#')
    .map(([id, resultat, check, statut]) => ({ id: nettoyer(id), ...titreEtDetail(resultat), check: nettoyer(check), statut: nettoyer(statut) }))
    .filter((j) => j.id);
}
export function etatDe(statut) {
  const n = norm(statut);
  if (/^(done|fait|termine|passed|reussi|valide)/.test(n)) return 'fait';
  if (/^(in progress|en cours|started|commence)/.test(n)) return 'en-cours';
  return 'pas-commence';
}
// La campagne : chaque jalon avec sa part de missions rentrées (ses issues GitHub), et le jalon en cours.
export function campagne(texte, jalonsGithub) {
  const comptes = new Map(jalonsGithub.map((j) => [String(j.title).split(/[\s·:]+/)[0].toUpperCase(), j]));
  const jalons = lireJalons(texte).map((j) => {
    const c = comptes.get(j.id.toUpperCase()), total = c ? c.open_issues + c.closed_issues : 0, etat = etatDe(j.statut);
    return { ...j, etat, fermees: c?.closed_issues ?? 0, total, part: total ? c.closed_issues / total : etat === 'fait' ? 1 : 0, lien: c?.html_url ?? null };
  });
  return { jalons, courant: jalons.find((j) => j.etat !== 'fait') ?? null, faits: jalons.filter((j) => j.etat === 'fait').length };
}

// --- La lecture --------------------------------------------------------------------------------
async function lireJson(url) { const r = await fetch(url, { headers: { accept: 'application/vnd.github+json' } }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }
async function lireTexte(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${r.status}`); return r.text(); }

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, visite, barre, carte, ouvert = false, choisi = null;
const etat = { texte: '', jalonsGithub: [], resultat: null, lueA: 0 };

async function lire() {
  try {
    const chemin = `/repos/${DEPOT}/milestones?state=all&per_page=100`;
    const [texte, jalons] = await Promise.all([
      lireTexte(SPEC),
      lireJson(`${WORKER}/api${chemin}`).catch(() => lireJson(`https://api.github.com${chemin}`)),
    ]);
    api.charger(texte, jalons);
  } catch (e) { console.warn('la campagne ne se lit pas', e); }
  etat.lueA = Date.now();
}

export function init(g, options) {
  game = g;
  visite = options.visite;
  barre = el('div', { id: 'barre-campagne', class: 'banniere-campagne', role: 'button', tabindex: '0', title: 'La campagne (C)', onclick: () => options.ouvrirCarte?.(),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); options.ouvrirCarte?.(); } } });
  carte = el('section', { id: 'carte-campagne', class: 'carte-campagne', hidden: true, role: 'dialog', 'aria-label': 'La carte de campagne' });
  document.body.append(barre, carte);
  if (visite) barre.hidden = true;
  if (!options.horsLigne) { lire(); game.bus.on('missions:maj', () => { if (Date.now() - etat.lueA > 20000) lire(); }); }
  dessinerBarre();
  return api;
}

function dessinerBarre() {
  const r = etat.resultat, j = r?.courant;
  const pct = j ? Math.round(j.part * 100) : 0;
  barre.replaceChildren(
    el('span', { class: 'flamme gauche', 'aria-hidden': 'true' }), el('span', { class: 'flamme droite', 'aria-hidden': 'true' }),
    el('span', { class: 'titre-campagne' }, j ? `${j.id} · ${j.titre}` : r ? 'La campagne est terminée !' : 'La campagne'),
    el('span', { class: 'jauge-campagne' },
      el('span', { class: 'rempli', style: `width:${pct}%` }),
      el('span', { class: 'texte' }, j ? `${j.fermees}/${j.total} missions · ${pct} %` : r ? 'tous les chapitres sont faits' : 'la carte se lit…')));
  barre.setAttribute('aria-label', j ? `La campagne : ${j.id}, ${pct} %` : 'La campagne');
}

function dessinerCarte() {
  const r = etat.resultat;
  if (!r) { carte.replaceChildren(el('p', {}, 'La carte de campagne arrive…')); return; }
  choisi ??= r.courant?.id ?? r.jalons[0]?.id;
  const j = r.jalons.find((x) => x.id === choisi);
  carte.replaceChildren(
    el('header', {}, el('h2', {}, 'La carte de campagne'), el('span', { class: 'compte' }, `${r.faits} / ${r.jalons.length} chapitres faits`),
      el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer la carte' }, '✕')),
    el('ol', { class: 'chemin' }, r.jalons.map((x) => el('li', {},
      el('button', { type: 'button', class: `etape ${x.etat}${x === r.courant ? ' courant' : ''}${x.id === choisi ? ' choisi' : ''}`, 'data-jalon': x.id, onclick: () => { choisi = x.id; dessinerCarte(); } },
        el('span', { class: 'drapeau', 'aria-hidden': 'true' }, x.etat === 'fait' ? '⚑' : x === r.courant ? '⚐' : '·'),
        el('span', { class: 'id' }, x.id),
        el('span', { class: 'pct' }, `${Math.round(x.part * 100)} %`))))),
    j ? el('article', { class: 'detail-jalon' },
      el('h3', {}, `${j.id} · ${j.titre}`, j === r.courant ? el('span', { class: 'maintenant' }, 'maintenant') : null),
      j.detail ? el('p', {}, j.detail) : null,
      el('p', {}, el('b', {}, 'Validé quand : '), j.check),
      el('p', {}, el('b', {}, 'Missions : '), j.total ? `${j.fermees} rentrées sur ${j.total}` : 'aucune pour l’instant',
        j.lien ? [' · ', el('a', { href: j.lien, target: '_blank', rel: 'noopener' }, 'les voir sur GitHub ↗')] : null),
      el('div', { class: 'jauge', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(j.part * 100)) }, el('span', { style: `width:${Math.round(j.part * 100)}%` })),
      el('p', { class: 'statut' }, `Dans GAME_SPEC.md : ${j.statut || '—'}`)) : null);
}

function ouvrir() { ouvert = true; carte.hidden = false; dessinerCarte(); }
function fermer() { ouvert = false; carte.hidden = true; }

export function update() {}
export function dispose() { barre?.remove(); carte?.remove(); }

export const api = {
  etat, campagne, lireJalons, ouvrir, fermer,
  get ouvert() { return ouvert; },
  get barre() { return barre; },
  get carte() { return carte; },
  // Pour les tests (et un rechargement) : le texte de GAME_SPEC.md et les jalons GitHub.
  charger(texte, jalonsGithub) {
    etat.texte = texte; etat.jalonsGithub = jalonsGithub; etat.resultat = campagne(texte, jalonsGithub);
    dessinerBarre(); if (ouvert) dessinerCarte();
  },
};
