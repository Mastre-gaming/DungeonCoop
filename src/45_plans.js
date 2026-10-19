// Les plans du jeu (mission #157) : l'onglet « Plans » du tableau des missions. Des fiches qui disent ce qu'on construit,
// comment, et où on en est : chaque chose prévue porte un sceau lu en direct dans les missions (bâti, en chantier,
// à prendre, pas encore de mission, à trancher).
// Une fiche est un petit texte (le format est dans AIDE, plus bas) : lisible sur GitHub, modifiable au camp.
// Où elles vivent :
//   - les fiches de départ, dans le dépôt : content/plans/NN-id.md (NN = l'ordre) ;
//   - les fiches modifiées ou créées au camp : un commentaire chacune sur l'issue #157, qui commence par
//     <!-- plan id=… ordre=… --> (ou <!-- plan id=… supprimee --> pour retirer une fiche de départ).
//   Un commentaire l'emporte sur la fiche de départ du même id. Seuls comptent ceux de l'équipe (OWNER, MEMBER,
//   COLLABORATOR) : le repo est public, n'importe qui peut commenter. L'historique de chaque fiche est celui du
//   commentaire sur GitHub.
// Écrire passe par la connexion GitHub du camp (27_github.js) : c'est GitHub qui dit qui a le droit.
// En ?test, rien ne part sur le réseau : api.relier({ fetch }) branche un faux GitHub.
import { DEPOT, LIEUX_AXES, SEUILS, estAbandonnee, estIdee } from './10_missions.js';
import { LIEUX, FEU, W, H, MURAILLE, emprise } from './01_plan.js';

export const ISSUE = 157;
const API = 'https://api.github.com';
const EQUIPE = ['OWNER', 'MEMBER', 'COLLABORATOR'];
const RELIRE = 60_000;   // on relit les commentaires en rouvrant l'onglet, au plus une fois par minute

// Les fiches de départ, dans le dépôt
const DEPART = Object.entries(import.meta.glob('../content/plans/*.md', { query: '?raw', import: 'default', eager: true }))
  .map(([chemin, texte]) => {
    const m = /(\d+)-([\w-]+)\.md$/.exec(chemin);
    return { id: m[2], ordre: Number(m[1]), texte: texte.replace(/\r\n/g, '\n').trim(), source: 'depot' };
  });

// Construit un élément sans innerHTML : el('p', { class: 'x', onclick }, 'texte', autreElement)
function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style') n.style.cssText = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

// --- Le format d'une fiche (fonctions pures, testées dans ?test) ------------------------------------------
export const AIDE = [
  ['# Titre', 'le titre de la fiche (la première ligne)'],
  ['> Une phrase', 'son résumé, sous le titre'],
  ['## Une partie', 'commence une partie de la fiche'],
  ['- Une chose prévue #42', 'une ligne de la liste ; #42 la relie à sa mission, et son sceau suit la mission'],
  ['%M1', 'toutes les missions du jalon M1 (une barre d’avancée)'],
  ['@Paolitus', 'qui décide, ou qui s’en occupe'],
  ['- + … / - * … / - ? …', 'acquis · en chantier sans mission · à trancher'],
  ['- ~ … / - x …', 'remplacé par une décision plus récente · écarté du jeu'],
  [':: flux', 'des étapes reliées par des flèches, une par ligne : Titre | texte | #42'],
  [':: cycle', 'pareil, et la dernière étape ramène à la première'],
  [':: cartes', 'des cartes : Titre | texte | #42 | #c2412f (la couleur)'],
  [':: tableau', 'un tableau : la première ligne est l’en-tête, les cases séparées par |'],
  [':: camp', 'le plan du camp, avec le niveau de chaque lieu'],
  ['**gras**, `code`', 'dans le texte'],
];
export const SORTES = ['flux', 'cycle', 'cartes', 'tableau', 'camp'];
const MARQUES = { '+': 'acquis', '*': 'chantier', '?': 'trancher', '~': 'remplace', x: 'ecarte' };

// Les références d'un bout de texte : les missions (#42), les jalons (%M1), les personnes (@Paolitus) ; et le texte sans elles.
export function references(texte) {
  const missions = [...texte.matchAll(/(^|[\s(])#(\d+)\b/g)].map((m) => Number(m[2]));
  const jalons = [...texte.matchAll(/(^|[\s(])%([A-Z]\d+)\b/g)].map((m) => m[2]);
  const qui = [...texte.matchAll(/(^|[\s(])@([\p{L}\d_-]+)/gu)].map((m) => m[2]);
  const nu = texte.replace(/(^|[\s(])(#\d+\b|%[A-Z]\d+\b|@[\p{L}\d_-]+)/gu, '$1').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
  return { missions, jalons, qui, texte: nu };
}

function item(ligne) {
  let reste = ligne.trim(), marque = null;
  const m = /^([+*?~x])\s+/.exec(reste);
  if (m) { marque = MARQUES[m[1]]; reste = reste.slice(m[0].length); }
  return { marque, ...references(reste) };
}

// lireFiche(texte) → { titre, resume, parties: [{ titre, morceaux: [{ t: 'p' | 'liste' | 'visuel', … }] }], inconnues }
export function lireFiche(texte) {
  const fiche = { titre: '', resume: '', parties: [], inconnues: [] };
  let partie = { titre: '', morceaux: [] }, visuel = null, para = [];
  fiche.parties.push(partie);
  const finirPara = () => { if (para.length) partie.morceaux.push({ t: 'p', texte: para.join(' ') }); para = []; };
  for (const brut of String(texte ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const ligne = brut.trim();
    if (visuel && ligne.includes('|')) {
      visuel.lignes.push(ligne.split('|').map((c) => c.trim()));
      continue;
    }
    visuel = null;
    if (!ligne || /^<!--.*-->$/.test(ligne)) { finirPara(); continue; }
    if (/^#\s/.test(ligne) && !fiche.titre) { finirPara(); fiche.titre = ligne.slice(2).trim(); continue; }
    if (/^>\s?/.test(ligne) && !fiche.resume && !partie.titre) { finirPara(); fiche.resume = ligne.replace(/^>\s?/, '').trim(); continue; }
    if (/^##\s/.test(ligne)) { finirPara(); partie = { titre: ligne.slice(3).trim(), morceaux: [] }; fiche.parties.push(partie); continue; }
    const v = /^::\s*([\p{L}-]+)\s*(.*)$/u.exec(ligne);
    if (v) {
      finirPara();
      const sorte = v[1].toLowerCase();
      if (!SORTES.includes(sorte)) fiche.inconnues.push(sorte);
      visuel = { t: 'visuel', sorte, lignes: [] };
      partie.morceaux.push(visuel);
      continue;
    }
    if (/^[-•]\s+/.test(ligne)) {
      finirPara();
      let l = partie.morceaux[partie.morceaux.length - 1];
      if (l?.t !== 'liste') { l = { t: 'liste', items: [] }; partie.morceaux.push(l); }
      l.items.push(item(ligne.replace(/^[-•]\s+/, '')));
      continue;
    }
    para.push(ligne);
  }
  finirPara();
  fiche.parties = fiche.parties.filter((p) => p.titre || p.morceaux.length);
  return fiche;
}

// L'état d'une chose prévue, d'après ses missions (les issues du repo, comme le tableau des missions).
// → { etat, faites, total } ; etat : bati · chantier · aprendre · idee · prevu (pas de mission) · acquis · trancher · remplace · ecarte
export function etatDe(ref, issues) {
  const liees = (issues ?? []).filter((i) => !i.pull_request && !estAbandonnee(i) && (
    ref.missions?.includes(i.number) || ref.jalons?.some((j) => new RegExp(`^${j}\\b`).test(i.milestone?.title ?? ''))));
  const faites = liees.filter((i) => i.state === 'closed').length, total = liees.length;
  let etat = 'prevu';
  if (total) {
    if (faites === total) etat = 'bati';
    else if (liees.some((i) => i.state !== 'closed' && i.assignees?.length)) etat = 'chantier';
    else if (liees.every((i) => i.state === 'closed' || estIdee(i))) etat = 'idee';
    else etat = 'aprendre';
  }
  return { etat: ref.marque ?? etat, faites, total, liees };
}
export const SCEAUX = {
  bati: { nom: 'Bâti', signe: '✓' }, acquis: { nom: 'Acquis', signe: '✓' }, chantier: { nom: 'En chantier', signe: '◐' },
  aprendre: { nom: 'À prendre', signe: '○' }, idee: { nom: 'Idée', signe: '✧' }, prevu: { nom: 'Pas encore de mission', signe: '◌' },
  trancher: { nom: 'À trancher', signe: '?' }, remplace: { nom: 'Remplacé', signe: '~' }, ecarte: { nom: 'Écarté', signe: '×' },
};
const LEGENDE = ['bati', 'chantier', 'aprendre', 'prevu', 'trancher', 'acquis', 'idee', 'remplace', 'ecarte'];

// Toutes les choses prévues d'une fiche (lignes de liste, étapes et cartes reliées à des missions), pour le compte du sommaire.
export function chosesDe(fiche) {
  const l = [];
  for (const p of fiche.parties) for (const m of p.morceaux) {
    if (m.t === 'liste') l.push(...m.items);
    if (m.t === 'visuel' && ['flux', 'cycle', 'cartes'].includes(m.sorte)) {
      for (const c of m.lignes) { const r = references(c.slice(2).join(' ')); if (r.missions.length || r.jalons.length) l.push(r); }
    }
  }
  return l;
}

// L'en-tête d'un commentaire de plan : <!-- plan id=combat ordre=60 --> ; null si ce n'en est pas un.
export function lireEntete(corps) {
  const m = /^\s*<!--\s*plan\b([^>]*)-->\s*\n?/.exec(corps ?? '');
  if (!m) return null;
  const attr = Object.fromEntries([...m[1].matchAll(/([\w-]+)(?:=([^\s]+))?/g)].map((x) => [x[1], x[2] ?? true]));
  if (!attr.id) return null;
  return { id: String(attr.id), ordre: Number(attr.ordre) || 0, supprimee: !!attr.supprimee, texte: corps.slice(m[0].length).replace(/\r\n/g, '\n').trim() };
}
export const ecrireEntete = ({ id, ordre, supprimee }, texte = '') =>
  supprimee ? `<!-- plan id=${id} supprimee -->` : `<!-- plan id=${id} ordre=${ordre} -->\n${texte.trim()}\n`;

// fusionner(depart, commentaires) → les fiches à montrer, dans l'ordre. Un commentaire de l'équipe l'emporte sur la fiche
// de départ du même id (le plus récent s'il y en a plusieurs) ; « supprimee » la retire.
export function fusionner(depart, commentaires) {
  const parId = new Map(depart.map((f) => [f.id, { ...f }]));
  const plans = (commentaires ?? []).filter((c) => EQUIPE.includes(c.author_association))
    .map((c) => ({ c, e: lireEntete(c.body) })).filter((x) => x.e)
    .sort((a, b) => String(a.c.updated_at).localeCompare(String(b.c.updated_at)));
  for (const { c, e } of plans) {
    parId.set(e.id, { id: e.id, ordre: e.ordre || parId.get(e.id)?.ordre || 0, texte: e.texte, supprimee: e.supprimee, source: 'github',
      commentaire: c.id, maj: c.updated_at, auteur: c.user?.login, url: c.html_url, depart: depart.some((d) => d.id === e.id) });
  }
  return [...parId.values()].filter((f) => !f.supprimee).sort((a, b) => a.ordre - b.ordre || a.id.localeCompare(b.id));
}

const MODELE = '# Une nouvelle fiche\n> Ce qu’elle explique, en une phrase.\n\nCe qu’on veut construire, et pourquoi.\n\n## Ce qui est prévu\n- Une première chose #42\n- ? Une question à trancher @équipe\n';
const slug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'fiche';

// --- L'onglet ------------------------------------------------------------------------------------------------
export function creerPlans({ missions, github, visite, horsLigne = false, redessiner }) {
  let reseau = { fetch: (...a) => fetch(...a) };
  const etat = { commentaires: [], lueA: 0, erreur: null, chargement: null };
  let choisie = DEPART[0]?.id ?? null, edition = null, brouillon = '', aConfirmer = null, nouvelle = null, occupe = false, conflit = null;
  let apercuMinuteur = 0;

  const peutEcrire = () => !visite && !!github?.connecte;
  const issues = () => missions.etat.issues ?? [];
  const fiches = () => fusionner(DEPART, etat.commentaires);

  async function lireTout() {
    const l = [];
    for (let p = 1; p <= 5; p++) {
      const chemin = `/repos/${DEPOT}/issues/${ISSUE}/comments?per_page=100&page=${p}`;
      let r;
      if (github?.connecte) r = await github.appel('GET', chemin);
      else {
        const rep = await reseau.fetch(`${API}${chemin}`, { headers: { accept: 'application/vnd.github+json' }, cache: 'no-store' });
        if (!rep.ok) throw new Error(`GitHub a répondu ${rep.status}`);
        r = await rep.json();
      }
      l.push(...r);
      if (r.length < 100) break;
    }
    return l;
  }
  function charger(force = false) {
    if (horsLigne && !force) return Promise.resolve();
    if (etat.chargement) return etat.chargement;
    if (!force && Date.now() - etat.lueA < RELIRE) return Promise.resolve();
    etat.chargement = lireTout()
      .then((l) => { etat.commentaires = l; etat.erreur = null; })
      .catch((e) => { etat.erreur = `Les plans modifiés au camp ne se lisent pas pour l’instant (${e.message}) : voici ceux du dépôt.`; })
      .finally(() => { etat.lueA = Date.now(); etat.chargement = null; if (!edition) redessiner(); });
    return etat.chargement;
  }

  // --- Écrire (les commentaires de l'issue #157) ---
  async function travailler(f, reussite) {
    occupe = true; nouvelle = { texte: 'J’écris dans GitHub…' }; redessiner();
    try { const r = await f(); nouvelle = { texte: reussite(r) }; return r; }
    catch (e) { nouvelle = { texte: e.message, grave: true }; throw e; }
    finally { occupe = false; redessiner(); }
  }
  const remplacer = (c) => { etat.commentaires = [...etat.commentaires.filter((x) => x.id !== c.id), c]; };
  async function ecrireFiche(f, corps) {
    if (f.commentaire) return remplacer(await github.appel('PATCH', `/repos/${DEPOT}/issues/comments/${f.commentaire}`, { body: corps })) ?? true;
    return remplacer(await github.appel('POST', `/repos/${DEPOT}/issues/${ISSUE}/comments`, { body: corps })) ?? true;
  }

  async function enregistrer() {
    const texte = brouillon.trim(), lue = lireFiche(texte);
    if (!lue.titre) { nouvelle = { texte: 'Il faut un titre : une première ligne qui commence par « # ».', grave: true }; redessiner(); return; }
    const toutes = fiches();
    const f = edition === 'nouvelle'
      ? { id: `${slug(lue.titre)}-${Date.now().toString(36).slice(-4)}`, ordre: Math.max(0, ...toutes.map((x) => x.ordre)) + 10 }
      : toutes.find((x) => x.id === edition);
    if (!f) { edition = null; redessiner(); return; }
    await travailler(async () => {
      // quelqu'un l'a-t-il changée pendant qu'on écrivait ? On ne l'écrase pas : on montre sa version, on garde la tienne.
      if (f.commentaire) {
        const c = await github.appel('GET', `/repos/${DEPOT}/issues/comments/${f.commentaire}`);
        if (c.updated_at !== f.maj) {
          remplacer(c);
          conflit = { auteur: c.user?.login, texte: lireEntete(c.body)?.texte ?? '' };
          throw Object.assign(new Error(`${c.user?.login ?? 'Quelqu’un'} a modifié cette fiche pendant que tu écrivais. Sa version est en dessous ; ton texte est gardé : relis, puis enregistre à nouveau.`), { status: 409 });
        }
      }
      await ecrireFiche(f, ecrireEntete(f, texte));
      return f;
    }, () => { const ok = edition === 'nouvelle' ? 'Fiche créée' : 'Fiche enregistrée'; choisie = f.id; edition = null; conflit = null; return `${ok} : elle est sur GitHub, son historique aussi.`; })
      .catch(() => {});
  }

  function supprimer(f) {
    aConfirmer = null;
    return travailler(async () => {
      if (f.source === 'depot' || f.depart) await ecrireFiche(f, ecrireEntete({ id: f.id, supprimee: true }));   // une fiche de départ : on la marque retirée
      else { await github.appel('DELETE', `/repos/${DEPOT}/issues/comments/${f.commentaire}`); etat.commentaires = etat.commentaires.filter((c) => c.id !== f.commentaire); }
      return f;
    }, () => { choisie = fiches()[0]?.id ?? null; return `« ${lireFiche(f.texte).titre} » est retirée des plans.`; }).catch(() => {});
  }

  function deplacer(f, sens) {
    const toutes = fiches(), i = toutes.findIndex((x) => x.id === f.id), autre = toutes[i + sens];
    if (!autre) return;
    return travailler(async () => {
      await ecrireFiche(f, ecrireEntete({ id: f.id, ordre: autre.ordre }, f.texte));
      await ecrireFiche(autre, ecrireEntete({ id: autre.id, ordre: f.ordre === autre.ordre ? f.ordre + sens : f.ordre }, autre.texte));
    }, () => 'Ordre des fiches enregistré.').catch(() => {});
  }

  function ouvrirEdition(id) {
    edition = id; aConfirmer = null; conflit = null; nouvelle = null;
    brouillon = id === 'nouvelle' ? MODELE : fiches().find((x) => x.id === id)?.texte ?? '';
    redessiner();
    setTimeout(() => document.querySelector('.plans-edition textarea')?.focus(), 0);
  }
  function annuler() { edition = null; aConfirmer = null; conflit = null; redessiner(); }

  // --- Dessiner ---
  const enLigne = (texte) => {
    // **gras** et `code`, sans innerHTML
    const out = [];
    for (const m of String(texte).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
      if (!m) continue;
      if (m.startsWith('**') && m.endsWith('**')) out.push(el('b', {}, m.slice(2, -2)));
      else if (m.startsWith('`') && m.endsWith('`')) out.push(el('code', {}, m.slice(1, -1)));
      else out.push(m);
    }
    return out;
  };
  const sceau = (e, petit = false) => el('span', { class: `sceau-plan s-${e}${petit ? ' petit' : ''}`, title: SCEAUX[e].nom, 'aria-label': SCEAUX[e].nom }, SCEAUX[e].signe);
  const puceMission = (i) => el('a', { class: `ref-mission r-${i.state === 'closed' ? 'bati' : i.assignees?.length ? 'chantier' : estIdee(i) ? 'idee' : 'aprendre'}`,
    href: i.html_url ?? `https://github.com/${DEPOT}/issues/${i.number}`, target: '_blank', rel: 'noopener',
    title: `${i.title}${i.assignees?.length ? ` · ${i.assignees.map((a) => missions.nomDe(a.login)).join(', ')}` : ''}` }, `#${i.number}`);
  function refs(r) {
    const s = etatDe(r, issues());
    const manquantes = r.missions.filter((n) => !s.liees.some((i) => i.number === n));
    const qui = s.liees.filter((i) => i.state !== 'closed').flatMap((i) => (i.assignees ?? []).map((a) => missions.nomDe(a.login)));
    return [
      s.total > 1 ? el('span', { class: 'avance', title: `${s.faites} sur ${s.total} rentrées` }, el('span', { class: 'jauge' }, el('i', { style: `width:${Math.round((100 * s.faites) / s.total)}%` })), el('b', {}, `${s.faites}/${s.total}`)) : null,
      ...s.liees.filter((i) => r.missions.includes(i.number)).map(puceMission),
      ...manquantes.map((n) => el('a', { class: 'ref-mission r-prevu', href: `https://github.com/${DEPOT}/issues/${n}`, target: '_blank', rel: 'noopener' }, `#${n}`)),
      ...[...new Set(qui)].map((q) => el('span', { class: 'qui-plan' }, q)),
      ...r.qui.map((q) => el('span', { class: 'decide-plan', title: 'qui décide ou s’en occupe' }, q)),
    ];
  }

  function visuel(m) {
    const lignes = m.lignes.filter((l) => l.some(Boolean));
    if (m.sorte === 'flux' || m.sorte === 'cycle') {
      const etapes = lignes.map(([titre, texte = '', ...autres]) => {
        const r = references(autres.join(' ')), s = (r.missions.length || r.jalons.length) ? etatDe(r, issues()).etat : null;
        return el('li', { class: `etape${s ? ` e-${s}` : ''}` }, s ? sceau(s, true) : null, el('b', {}, enLigne(titre)), texte ? el('span', {}, enLigne(texte)) : null,
          (r.missions.length || r.jalons.length) ? el('span', { class: 'refs' }, refs(r)) : null);
      });
      return el('ol', { class: `flux${m.sorte === 'cycle' ? ' cycle' : ''}` }, etapes, m.sorte === 'cycle' && etapes.length ? el('li', { class: 'retour', 'aria-hidden': 'true' }, '↺ et on recommence') : null);
    }
    if (m.sorte === 'cartes') {
      return el('div', { class: 'cartes-plan' }, lignes.map(([titre, texte = '', ref = '', couleur = '']) => {
        const r = references(ref), c = /^#[0-9a-f]{3,8}$/i.test(couleur) ? couleur : '#b8892a';
        return el('div', { class: 'carte-plan', style: `--teinte:${c}` }, el('b', {}, enLigne(titre)), texte ? el('span', {}, enLigne(texte)) : null,
          (r.missions.length || r.jalons.length) ? el('span', { class: 'refs' }, refs(r)) : null);
      }));
    }
    if (m.sorte === 'tableau') {
      const [tete = [], ...corps] = lignes;
      return el('div', { class: 'tableau-plan' }, el('table', {},
        el('thead', {}, el('tr', {}, tete.map((c) => el('th', { scope: 'col' }, enLigne(c))))),
        el('tbody', {}, corps.map((l) => el('tr', {}, l.map((c, k) => (k === 0 ? el('th', { scope: 'row' }, enLigne(c)) : el('td', {}, enLigne(c)))))))));
    }
    if (m.sorte === 'camp') return planCamp();
    return el('p', { class: 'rien' }, `« :: ${m.sorte} » n’est pas un dessin connu (${SORTES.join(', ')}).`);
  }

  // Le plan du camp en petit : les lieux sur leur emprise, à la couleur de leur axe, avec leur niveau en direct.
  function planCamp() {
    const niveaux = missions.resume().niveaux, pct = (v, t) => `${(100 * v) / t}%`;
    const boite = (x0, y0, x1, y1, classe, style = '', ...enfants) =>
      el('div', { class: classe, style: `left:${pct(x0, W)};top:${pct(y0, H)};width:${pct(x1 - x0, W)};height:${pct(y1 - y0, H)};${style}` }, ...enfants);
    const lieux = LIEUX.map((l) => {
      const [x0, y0, x1, y1] = emprise(l), a = LIEUX_AXES.find((x) => x.id === l.id), n = niveaux[l.id] ?? 0;
      return boite(x0, y0, x1, y1, `lieu-plan${n ? '' : ' vide'}`, `--teinte:${a?.couleur ?? '#8f8a7c'}`,
        el('b', {}, a?.lieu ?? l.lieu), el('span', {}, `niv. ${n}`));
    });
    return el('figure', { class: 'plan-camp' },
      el('div', { class: 'carte', role: 'img', 'aria-label': `Le plan du camp : ${LIEUX.map((l) => `${LIEUX_AXES.find((x) => x.id === l.id)?.lieu} niveau ${niveaux[l.id] ?? 0}`).join(', ')}` },
        boite(0, MURAILLE.mur[0], W, MURAILLE.douves[1] + 1, 'muraille-plan', '', el('span', {}, 'la muraille, la porte et les douves')),
        boite(FEU[0] - 2.5, FEU[1] - 2.5, FEU[0] + 2.5, FEU[1] + 2.5, 'feu-plan', '', el('b', {}, 'le feu'), el('span', {}, `taille ${missions.resume().feu}`)),
        lieux),
      el('figcaption', {}, `Niveau d’un lieu : ${SEUILS.map((s, i) => `${i} à ${s} pt${s > 1 ? 's' : ''}`).join(' · ')}. Les noms sont provisoires.`));
  }

  function morceau(m) {
    if (m.t === 'p') return el('p', {}, enLigne(m.texte));
    if (m.t === 'visuel') return visuel(m);
    return el('ul', { class: 'choses' }, m.items.map((it) => {
      const s = etatDe(it, issues());
      return el('li', { class: `chose c-${s.etat}` }, sceau(s.etat), el('span', { class: 'texte' }, enLigne(it.texte)), el('span', { class: 'refs' }, refs(it)));
    }));
  }

  function rendreFiche(f) {
    const l = lireFiche(f.texte);
    return el('article', { class: 'fiche-plan' },
      el('h4', {}, l.titre || 'Sans titre'),
      l.resume ? el('p', { class: 'resume' }, enLigne(l.resume)) : null,
      l.parties.map((p) => el('section', {}, p.titre ? el('h5', {}, enLigne(p.titre)) : null, p.morceaux.map(morceau))));
  }

  function compte(f) {
    const c = {};
    for (const it of chosesDe(lireFiche(f.texte))) { const e = etatDe(it, issues()).etat; c[e] = (c[e] ?? 0) + 1; }
    return ['bati', 'chantier', 'aprendre', 'prevu', 'trancher'].filter((e) => c[e]).map((e) => el('span', { class: `compte s-${e}`, title: SCEAUX[e].nom }, SCEAUX[e].signe, ` ${c[e]}`));
  }

  function vue() {
    const toutes = fiches();
    if (!toutes.some((x) => x.id === choisie)) choisie = toutes[0]?.id ?? null;
    const f = toutes.find((x) => x.id === choisie);
    const b = (texte, faire, classe = '', attrs = {}) => el('button', { type: 'button', class: `action ${classe}`.trim(), disabled: occupe, onclick: faire, ...attrs }, texte);
    const sommaire = el('div', { class: 'zones sommaire-plans', role: 'group', 'aria-label': 'Les fiches des plans' },
      toutes.map((x) => {
        const l = lireFiche(x.texte);
        return el('button', { class: 'zone', type: 'button', 'aria-pressed': String(x.id === choisie), onclick: () => { if (edition) return; choisie = x.id; aConfirmer = null; redessiner(); } },
          el('span', { class: 'nom' }, l.titre || 'Sans titre'),
          el('span', { class: 'lvl comptes' }, compte(x)),
          l.resume ? el('span', { class: 'reste' }, l.resume) : null);
      }),
      peutEcrire() && !edition ? el('button', { class: 'ecrire-mission', type: 'button', disabled: occupe, onclick: () => ouvrirEdition('nouvelle') }, '+ Nouvelle fiche') : null);

    let droite;
    if (edition) {
      const zone = el('textarea', { rows: '22', spellcheck: 'true', 'aria-label': 'Le texte de la fiche', oninput: (e) => {
        brouillon = e.target.value;
        clearTimeout(apercuMinuteur);
        apercuMinuteur = setTimeout(() => { const a = document.querySelector('.plans-edition .apercu-plan'); a?.replaceChildren(rendreFiche({ texte: brouillon })); }, 150);
      } });
      zone.value = brouillon;
      const inconnues = lireFiche(brouillon).inconnues;
      droite = el('form', { class: 'plans-edition', onsubmit: (e) => { e.preventDefault(); enregistrer(); } },
        el('div', { class: 'tete-fiche' }, el('b', {}, edition === 'nouvelle' ? 'Nouvelle fiche' : 'Modifier la fiche'),
          el('button', { type: 'submit', class: 'action fait', disabled: occupe }, edition === 'nouvelle' ? 'Créer la fiche' : 'Enregistrer'),
          b('Annuler', annuler)),
        conflit ? el('details', { class: 'conflit', open: true }, el('summary', {}, `La version de ${conflit.auteur ?? 'quelqu’un'}`), el('pre', {}, conflit.texte)) : null,
        inconnues.length ? el('p', { class: 'annonce grave' }, `Dessin inconnu : ${inconnues.map((x) => `:: ${x}`).join(', ')}.`) : null,
        el('div', { class: 'deux' }, el('label', { class: 'ecrire' }, el('span', {}, 'Le texte'), zone),
          el('div', { class: 'apercu-plan', 'aria-live': 'polite' }, rendreFiche({ texte: brouillon }))),
        el('details', { class: 'aide-plan' }, el('summary', {}, 'Comment écrire une fiche'),
          el('dl', {}, AIDE.map(([k, v]) => [el('dt', {}, el('code', {}, k)), el('dd', {}, v)]))));
    } else if (f) {
      const i = toutes.indexOf(f);
      droite = el('div', { class: 'fiche-cadre' },
        el('div', { class: 'tete-fiche' },
          el('span', { class: 'source' }, f.source === 'github'
            ? ['modifiée au camp', f.auteur ? ` par ${missions.nomDe(f.auteur)}` : '', f.maj ? `, le ${new Date(f.maj).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : '', ' · ', el('a', { href: f.url, target: '_blank', rel: 'noopener' }, 'historique ↗')]
            : 'version du dépôt'),
          peutEcrire() ? (aConfirmer === f.id
            ? el('span', { class: 'actions confirmer' }, el('span', {}, 'Retirer cette fiche ?'), b('Oui, retirer', () => supprimer(f), 'danger'), b('Annuler', () => { aConfirmer = null; redessiner(); }))
            : el('span', { class: 'actions' },
              b('Modifier', () => ouvrirEdition(f.id)),
              b('↑', () => deplacer(f, -1), '', { 'aria-label': 'Monter la fiche', disabled: occupe || i === 0 }),
              b('↓', () => deplacer(f, 1), '', { 'aria-label': 'Descendre la fiche', disabled: occupe || i === toutes.length - 1 }),
              b('Supprimer', () => { aConfirmer = f.id; redessiner(); }, 'danger'))) : null),
        rendreFiche(f));
    } else droite = el('p', { class: 'rien' }, 'Aucune fiche pour l’instant.');

    return el('div', { class: 'plans' },
      etat.erreur ? el('p', { class: 'annonce grave', role: 'alert' }, etat.erreur) : null,
      nouvelle ? el('p', { class: `annonce${nouvelle.grave ? ' grave' : ''}`, role: nouvelle.grave ? 'alert' : 'status' }, nouvelle.texte) : null,
      el('div', { class: 'corps' }, sommaire,
        el('div', { class: 'detail' },
          el('p', { class: 'legende-plans', 'aria-label': 'Les sceaux' }, LEGENDE.map((e) => el('span', {}, sceau(e, true), ` ${SCEAUX[e].nom}`))),
          el('div', { class: 'liege parchemin-plans' }, droite))));
  }

  const pied = () => (peutEcrire() ? `Chaque fiche modifiée est un commentaire de la mission #${ISSUE} sur GitHub : tout le monde la voit, et son historique reste.`
    : visite ? 'Les plans du jeu : ce qu’on construit, comment, et où on en est.'
      : 'Pour modifier les plans (créer, changer, retirer une fiche) : « Se connecter à GitHub », en haut.');

  return {
    vue, pied, charger, annuler, ouvrirEdition, enregistrer, supprimer, deplacer, fiches,
    get enEdition() { return !!edition; },
    get brouillon() { return brouillon; },
    set brouillon(v) { brouillon = v; },
    get nouvelle() { return nouvelle; },
    get occupe() { return occupe; },
    get choisie() { return choisie; },
    choisir(id) { choisie = id; edition = null; redessiner(); },
    etat,
    // Pour les tests : un faux GitHub ({ fetch }), sans rien sur le réseau.
    relier(faux) { reseau = { ...reseau, ...faux }; horsLigne = false; },
    delier() { reseau = { fetch: (...a) => fetch(...a) }; horsLigne = true; },
    oublier() { etat.commentaires = []; etat.lueA = 0; nouvelle = null; edition = null; aConfirmer = null; conflit = null; },
  };
}
