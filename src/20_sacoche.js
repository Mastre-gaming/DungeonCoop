// La sacoche (I) et les rumeurs de la taverne (R), façon RPG (CAMP §8 bis).
//   La sacoche : « Liens utiles » du dashboard (liens.json, dans son repo), un objet d'inventaire par lien. Un lien
//   encore vide est un emplacement à remplir.
//   Les rumeurs : « Idées » du dashboard (src/widgets/idees.js) : les issues ouvertes « idée », rangées par jalon
//   (« À trier » d'abord, le parking à la fin), puis par priorité et par votes 👍, ici « 🍺 n y croient ».

const LIENS = 'https://raw.githubusercontent.com/Mastre-gaming/DungeonCoop-dashboard/main/liens.json';
const DASHBOARD = 'https://dungeoncoop-dashboard.mastredev.workers.dev';
const NOUVELLE_IDEE = 'https://github.com/Mastre-gaming/DungeonCoop/issues/new?template=idee.md';
const JALONS = ['D1', 'D2', 'D3', 'D4', 'M1', 'M2', 'M3', 'M4'];

// Le nom d'objet de chaque lien (selon son adresse) ; sinon, son nom tel quel.
const OBJETS = [
  [/\/issues\/new/, 'Plume des idées'], [/\/issues$/, 'Registre des quêtes'], [/GUIDE_EQUIPE/, 'Manuel du compagnon'],
  [/GAME_SPEC/, 'Carte du monde'], [/FIGHT_RULES/, 'Traité de combat'], [/workers\.dev\/?$|0xbaba-eth/, 'Pierre de rappel (le jeu)'],
  [/sprite-painter/, 'Pinceau enchanté'], [/Character-Generator/, 'Miroir des apparences'], [/mastre-gaming\.github\.io/, 'Portail des jeux'],
  [/discord/i, 'Cor de ralliement'], [/DungeonCoop-dashboard$/, 'Plans du tableau de bord'], [/DungeonCoop$/, 'Grimoire du code'], [/projects?\b/i, 'Tableau des chantiers'],
];
export const nomObjet = (lien) => OBJETS.find(([re]) => re.test(lien.url ?? ''))?.[1] ?? lien.nom;

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
const fermer = (p) => el('button', { class: 'fermer', type: 'button', onclick: () => p.fermer(), 'aria-label': 'Fermer' }, '✕');

// --- La sacoche ---------------------------------------------------------------------------------
export function creerSacoche({ horsLigne = false } = {}) {
  const boite = el('section', { id: 'sacoche', class: 'sacoche', hidden: true, 'aria-label': 'La sacoche : les liens utiles' });
  document.body.append(boite);
  let liens = null;
  const p = {
    ouvert: false,
    boite,
    charger(l) { liens = Array.isArray(l) ? l : []; if (p.ouvert) dessiner(); },
    ouvrir() { p.ouvert = true; boite.hidden = false; dessiner(); },
    fermer() { p.ouvert = false; boite.hidden = true; },
  };
  function dessiner() {
    const cases = (liens ?? []).map((l) => {
      const url = l.url ? (l.url.startsWith('/') ? DASHBOARD + l.url : l.url) : null;
      const contenu = [el('span', { class: 'objet', 'aria-hidden': 'true' }, l.icone ?? '🔗'), el('span', { class: 'nom' }, nomObjet(l)), el('span', { class: 'note' }, url ? `${l.nom} · ${l.note ?? ''}` : `emplacement à remplir · ${l.nom}`)];
      return el('li', {}, url ? el('a', { class: 'case-objet', href: url, target: '_blank', rel: 'noopener', title: `${l.nom} : ${l.note ?? ''}` }, contenu)
        : el('span', { class: 'case-objet vide', title: 'Ce lien est vide : il se remplit dans liens.json (repo du dashboard)' }, contenu));
    });
    boite.replaceChildren(el('header', {}, el('h2', {}, 'La sacoche'), fermer(p)),
      liens === null ? el('p', { class: 'vide' }, 'La sacoche s’ouvre…') : el('ul', { class: 'inventaire' }, cases),
      el('p', { class: 'pied' }, 'Ajouter un objet : ', el('a', { href: 'https://github.com/Mastre-gaming/DungeonCoop-dashboard/edit/main/liens.json', target: '_blank', rel: 'noopener' }, 'liens.json ↗')));
  }
  if (!horsLigne) fetch(LIENS, { cache: 'no-cache' }).then((r) => r.json()).then(p.charger).catch(() => p.charger([]));
  return p;
}

// --- Les rumeurs de la taverne -----------------------------------------------------------------
const estIdee = (i) => !i.pull_request && (i.labels ?? []).some((l) => norm(typeof l === 'string' ? l : l.name) === 'idee');
const prioriteDe = (i) => { for (const l of i.labels ?? []) { const m = /^priorite\s*:\s*(\w+)/.exec(norm(typeof l === 'string' ? l : l.name)); if (m) return m[1]; } return null; };
const RANG = { haute: 0, moyenne: 1, basse: 2 };
const jalonDe = (i) => { const t = String(i.milestone?.title ?? ''); if (!t) return 'À trier'; if (/^parking/i.test(t)) return 'Parking'; return t.split(/[\s·:]+/)[0].toUpperCase(); };
const votes = (i) => i.reactions?.['+1'] ?? 0;
const titre = (i) => String(i.title).replace(/^\s*\[id[ée]e\]\s*/i, '');

// Les rumeurs, rangées : [{ jalon, rumeurs: [...] }] (les idées ouvertes ; la priorité décide, les votes départagent).
export function ranger(issues) {
  const ouvertes = issues.filter((i) => estIdee(i) && i.state !== 'closed');
  const ordre = ['À trier', ...JALONS, 'Parking'], groupes = new Map();
  for (const i of ouvertes) { const j = jalonDe(i); if (!ordre.includes(j)) ordre.splice(ordre.length - 1, 0, j); (groupes.get(j) ?? groupes.set(j, []).get(j)).push(i); }
  return ordre.filter((j) => groupes.has(j)).map((j) => ({ jalon: j, rumeurs: groupes.get(j).sort((a, b) => (RANG[prioriteDe(a)] ?? 3) - (RANG[prioriteDe(b)] ?? 3) || votes(b) - votes(a) || a.number - b.number) }));
}

export function creerRumeurs({ missions, bus }) {
  const boite = el('section', { id: 'rumeurs', class: 'rumeurs', hidden: true, 'aria-label': 'Les rumeurs de la taverne : les idées' });
  document.body.append(boite);
  const p = {
    ouvert: false, boite,
    ouvrir() { p.ouvert = true; boite.hidden = false; dessiner(); },
    fermer() { p.ouvert = false; boite.hidden = true; },
  };
  bus.on('missions:maj', () => p.ouvert && dessiner());
  function dessiner() {
    const groupes = ranger(missions.etat.issues);
    boite.replaceChildren(el('header', {}, el('h2', {}, 'Rumeurs de la taverne'), fermer(p)),
      groupes.length ? el('div', { class: 'groupes' }, groupes.map((g) => el('section', { class: 'groupe-rumeurs', 'data-jalon': g.jalon },
        el('h3', {}, g.jalon, el('span', { class: 'compte' }, ` · ${g.rumeurs.length}`)),
        el('ul', {}, g.rumeurs.map((i) => el('li', { class: 'rumeur', 'data-numero': i.number },
          el('a', { href: i.html_url ?? '#', target: '_blank', rel: 'noopener' }, titre(i)),
          el('span', { class: 'meta' }, `#${i.number}`, prioriteDe(i) ? ` · priorité ${prioriteDe(i)}` : '', ` · 🍺 ${votes(i)} ${votes(i) > 1 ? 'y croient' : 'y croit'}`, (i.assignees ?? []).length ? ` · prise par ${i.assignees.map((a) => missions.nomDe(a.login)).join(', ')}` : '')))))))
        : el('p', { class: 'vide' }, 'La taverne est calme : aucune rumeur pour l’instant.'),
      el('p', { class: 'pied' }, el('a', { class: 'bouton-jeu discret', href: NOUVELLE_IDEE, target: '_blank', rel: 'noopener' }, 'Lancer une rumeur (une idée) ↗'), ' · voter : 👍 sur l’issue'));
  }
  return p;
}
