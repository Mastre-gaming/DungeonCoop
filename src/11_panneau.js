// Le panneau des missions (CAMP §5, aimé tel quel : LIKED.md) : il s'ouvre en cliquant sur le panneau-carte, ou avec E
// quand on est devant. Ce sont les tâches du tableau de travail du dashboard, rangées par lieu du camp :
// à gauche les zones à construire (niveau, barre, ce qui manque), à droite la zone choisie et ses missions en parchemins
// épinglés : à prendre, en cours, rentrées.
// Connecté à GitHub (27_github.js, la même connexion que le dashboard), on y gère les missions comme dans le tableau de
// travail : créer, modifier (titre, description, lieu, taille, qui), prendre, lâcher, « Fait », rouvrir, supprimer (les
// admins du repo ; sinon « Fermer (abandonnée) »). Tout part dans GitHub : le tableau du dashboard suit tout seul.
// Deux onglets : « Missions » (le panneau ci-dessus) et « Plans » (41_plans.js : les plans du jeu, mission #157).
import './panneau.css';
import './plans.css';
import { creerPlans, ISSUE as PLANS_ISSUE } from './41_plans.js';
import { dessinerPanneau } from './03_carte.js';
import { LIEUX_AXES, SEUILS, POINTS, DASHBOARD, DEPOT, URGENCES, etatDe, lieuDe, tailleDe, urgenceDe } from './10_missions.js';

export const name = 'panneau';
export const always = true;

const ETATS = [{ id: 'aprendre', nom: 'À prendre' }, { id: 'encours', nom: 'En cours' }, { id: 'rentree', nom: 'Rentrées' }];
const SANS = { id: 'sans', lieu: 'Sans lieu', axe: 'Pas encore d’axe', couleur: '#8f8a7c' };

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

let game, rendu, canvas, decor, missions, heros, images, visite, github;
// L'écriture : la fiche ouverte (un numéro, ou 'nouvelle'), la suppression à confirmer, la dernière nouvelle, et la
// mission dont GitHub a refusé la suppression (on propose alors de la fermer, abandonnée).
let edition = null, aConfirmer = null, nouvelle = null, refusee = null, occupe = false;
let boite, bulle, apercu, gApercu, choisie = 'interface', ouvert = false, temps = 0, survol = false;
let plans, onglet = 'missions';   // l'onglet ouvert : 'missions' ou 'plans'
// La première connexion (CAMP §5) : le tableau appelle tant qu'on ne l'a jamais ouvert dans ce navigateur.
const CLE_VU = 'dungeoncoop:panneau-vu';
let vu = (() => { try { return localStorage.getItem(CLE_VU) === '1'; } catch { return false; } })();
const marquerVu = (oui) => { vu = oui; try { oui ? localStorage.setItem(CLE_VU, '1') : localStorage.removeItem(CLE_VU); } catch {} };

const rect = () => decor.panneau();
const dedans = (p) => { const r = rect(); return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; };
const pres = () => {
  if (visite) return false;
  const r = rect(), h = heros.heros;
  return h.x > r.x - 12 && h.x < r.x + r.w + 12 && h.y > r.y + r.h - 4 && h.y < r.y + r.h + 56;
};

export function init(g, options) {
  game = g;
  ({ rendu, canvas, decor, missions, heros, images, visite, github } = options);
  plans = creerPlans({ missions, github, visite, horsLigne: !!options.horsLigne, redessiner: () => { if (ouvert && onglet === 'plans') dessiner(); } });
  game.input.bindings.consulter = ['KeyE'];

  boite = el('div', { id: 'missions', class: 'fond-missions', hidden: true, onclick: (e) => { if (e.target === boite) fermer(); } });
  bulle = el('div', { id: 'bulle-panneau', class: 'bulle-panneau', hidden: true }, el('kbd', { 'data-key': 'KeyE' }, 'E'), ' : consulter');
  document.body.append(boite, bulle);
  apercu = el('canvas', { width: 96, height: 80, class: 'apercu-carte', 'aria-hidden': 'true' });
  gApercu = apercu.getContext('2d');
  gApercu.imageSmoothingEnabled = false;

  // un clic sur le panneau-carte l'ouvre (avant que le héros ne parte marcher vers le clic)
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !dedans(rendu.versMonde(e.clientX, e.clientY))) return;
    e.stopImmediatePropagation(); e.preventDefault();
    ouvrir();
  }, { capture: true });
  canvas.addEventListener('pointermove', (e) => {
    survol = dedans(rendu.versMonde(e.clientX, e.clientY));
    canvas.style.cursor = survol ? 'zoom-in' : '';
  });
  window.addEventListener('keydown', (e) => {
    if (!ouvert || e.code !== 'Escape') return;
    e.preventDefault();
    if (onglet === 'plans' && plans.enEdition) plans.annuler();   // Échap : d'abord la fiche en cours
    else if (edition || aConfirmer) { edition = null; aConfirmer = null; dessiner(); } else fermer();
  });
  game.bus.on('missions:maj', () => { if (ouvert && !edition && !plans.enEdition) dessiner(); });   // (pas pendant qu'on écrit une fiche)
  game.bus.on('github:connexion', () => { if (ouvert) dessiner(); });
  return api;
}

function ouvrir(zone, quelOnglet) {
  if (zone) choisie = zone;
  if (quelOnglet) onglet = quelOnglet;
  if (onglet === 'plans') plans.charger();
  ouvert = true; boite.hidden = false;
  marquerVu(true);
  game.solo = 'panneau';                 // le héros s'arrête pendant qu'on lit
  game.input.clear();
  dessiner();
  boite.querySelector('.fermer')?.focus();
}
function fermer() {
  ouvert = false; boite.hidden = true; decor.zoneVisee = null; edition = null; aConfirmer = null;
  if (plans.enEdition) plans.annuler();
  if (game.solo === 'panneau') game.solo = null;
  canvas.focus?.();
}

// --- Le contenu --------------------------------------------------------------------------------
function zones() {
  const taches = missions.taches(), sans = taches.filter((t) => !lieuDe(t));
  return [...LIEUX_AXES, ...(sans.length ? [SANS] : [])];
}
const tachesDe = (id) => missions.taches().filter((t) => (lieuDe(t) ?? 'sans') === id);

// Les deux onglets du panneau, en tête : Missions et Plans (les flèches passent de l'un à l'autre).
function onglets() {
  const ONGLETS = [{ id: 'missions', nom: 'Missions' }, { id: 'plans', nom: 'Plans' }];
  const aller = (id) => { if (id === onglet) return; if (onglet === 'plans' && plans.enEdition) plans.annuler(); onglet = id; if (id === 'plans') plans.charger(); edition = null; aConfirmer = null; dessiner(); boite.querySelector(`.onglet[data-onglet="${id}"]`)?.focus(); };
  return el('div', { class: 'onglets', role: 'tablist', 'aria-label': 'Le tableau', onkeydown: (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = ONGLETS.findIndex((o) => o.id === onglet);
    aller(ONGLETS[(i + (e.key === 'ArrowRight' ? 1 : ONGLETS.length - 1)) % ONGLETS.length].id);
  } }, ONGLETS.map((o) => el('button', { class: 'onglet', type: 'button', role: 'tab', 'data-onglet': o.id, id: `onglet-${o.id}`, 'aria-selected': String(onglet === o.id),
    'aria-controls': 'vue-tableau', tabindex: onglet === o.id ? '0' : '-1', onclick: () => aller(o.id) }, o.nom)));
}

function dessiner() {
  if (onglet === 'plans') return dessinerPlans();
  const res = missions.resume(), etat = missions.etat;
  if (!zones().some((z) => z.id === choisie)) choisie = 'interface';
  decor.zoneVisee = choisie === 'sans' ? null : choisie;
  const lignes = zones().map((z) => {
    const p = res.points[z.id] ?? 0, n = res.niveaux[z.id] ?? 0, suiv = SEUILS[n + 1], ts = tachesDe(z.id);
    const aPrendre = ts.filter((t) => etatDe(t) === 'aprendre').length;
    const pct = z.id === 'sans' ? 0 : suiv ? Math.round((100 * (p - SEUILS[n])) / (suiv - SEUILS[n])) : 100;
    return el('button', { class: 'zone', type: 'button', 'aria-pressed': String(choisie === z.id), onclick: () => { choisie = z.id; dessiner(); } },
      el('i', { class: 'sceau', style: `background:${z.couleur}` }),
      el('span', { class: 'nom' }, z.lieu),
      el('span', { class: 'lvl' }, z.id === 'sans' ? `${ts.length}` : `niv. ${n}`),
      el('span', { class: 'axe' }, z.axe),
      el('span', { class: 'lvl' }, `${aPrendre} à prendre`),
      z.id === 'sans' ? null : el('span', { class: 'barre', 'aria-hidden': 'true' }, el('i', { style: `width:${pct}%` })),
      z.id === 'sans' ? el('span', { class: 'reste' }, 'Ces missions ne font grandir aucun lieu pour l’instant.')
        : el('span', { class: 'reste' }, suiv ? `${p} pt${p > 1 ? 's' : ''} · encore ${suiv - p} pour le niveau ${n + 1}` : `${p} pts · niveau maximum`));
  });

  const z = zones().find((x) => x.id === choisie), ts = tachesDe(choisie);
  const p = res.points[choisie] ?? 0, n = res.niveaux[choisie] ?? 0, suiv = SEUILS[n + 1];
  const groupes = ETATS.map((e) => {
    const l = ts.filter((t) => etatDe(t) === e.id).sort((a, b) => a.number - b.number);
    return el('div', { class: 'groupe' }, el('h4', {}, `${e.nom} · ${l.length}`),
      l.length ? el('div', { class: 'parchemins' }, l.map(carte))
        : el('p', { class: 'rien' }, e.id === 'aprendre' ? 'Plus rien à prendre ici pour l’instant.' : 'Rien pour l’instant.'));
  });

  boite.replaceChildren(el('div', { class: 'panneau-missions', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 't-missions' },
    el('div', { class: 'tete' },
      el('h3', { id: 't-missions' }, 'Tableau des missions'),
      onglets(),
      el('span', { class: 'total' }, `Le camp : ${res.total} point${res.total > 1 ? 's' : ''} · le feu : taille ${res.feu}`),
      el('span', { class: 'provisoire', title: 'Les noms des lieux sont provisoires : ils sont à l’axe Histoire.' }, 'noms provisoires'),
      enTeteGithub(),
      el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer le panneau' }, 'Fermer ', el('kbd', {}, 'Échap'))),
    etat.erreur ? el('p', { class: 'annonce grave', role: 'alert' }, etat.erreur) : null,
    nouvelle ? el('p', { class: `annonce${nouvelle.grave ? ' grave' : ''}`, role: nouvelle.grave ? 'alert' : 'status' }, nouvelle.texte) : null,
    !etat.source && !etat.erreur ? el('p', { class: 'annonce' }, 'Les missions arrivent…') : null,
    el('div', { class: 'corps', id: 'vue-tableau', role: 'tabpanel', 'aria-labelledby': 'onglet-missions' },
      el('div', { class: 'zones', role: 'group', 'aria-label': 'Zones à construire' }, lignes),
      el('div', { class: 'detail' },
        el('div', { class: 'apercu' },
          el('figure', {}, apercu, el('figcaption', {}, 'Sur le tableau du camp')),
          el('div', { class: 'etatzone' },
            el('b', {}, choisie === 'sans' ? z.lieu : `${z.lieu} · niveau ${n}`),
            choisie === 'sans' ? el('span', {}, `${ts.length} mission${ts.length > 1 ? 's' : ''} sans lieu dans le camp.`)
              : el('span', {}, suiv ? `${p} point${p > 1 ? 's' : ''}. Encore ${suiv - p} point${suiv - p > 1 ? 's' : ''} pour le niveau ${n + 1}.` : `${p} points. Niveau maximum.`),
            el('span', {}, z.axe))),
        el('div', { class: 'liege' },
          peutEcrire() ? (edition === 'nouvelle' ? fiche(null) : el('button', { class: 'ecrire-mission', type: 'button', disabled: occupe, onclick: () => { edition = 'nouvelle'; aConfirmer = null; dessiner(); focusFiche(); } }, '+ Nouvelle mission ici')) : null,
          groupes))),
    el('div', { class: 'pied' },
      el('span', {}, peutEcrire() ? 'Tout part dans GitHub : le tableau de travail du dashboard suit tout seul.'
        : visite ? 'Prendre une mission : dans le tableau de travail du dashboard, « Je prends ».'
          : 'Pour gérer les missions ici (créer, prendre, « Fait », assigner, taille…) : « Se connecter à GitHub », en haut.'),
      el('a', { href: DASHBOARD, target: '_blank', rel: 'noopener' }, 'Ouvrir le dashboard ↗'))));
  dessinerApercu();
}

// L'onglet Plans : la même tête, les plans du jeu dessous (41_plans.js).
function dessinerPlans() {
  const res = missions.resume();
  decor.zoneVisee = null;
  const garder = document.activeElement && boite.contains(document.activeElement) ? document.activeElement.closest('[data-onglet]')?.dataset.onglet : null;
  boite.replaceChildren(el('div', { class: 'panneau-missions', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 't-missions' },
    el('div', { class: 'tete' },
      el('h3', { id: 't-missions' }, 'Tableau des missions'),
      onglets(),
      el('span', { class: 'total' }, `Le camp : ${res.total} point${res.total > 1 ? 's' : ''} · le feu : taille ${res.feu}`),
      enTeteGithub(),
      el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer le panneau' }, 'Fermer ', el('kbd', {}, 'Échap'))),
    el('div', { id: 'vue-tableau', role: 'tabpanel', 'aria-labelledby': 'onglet-plans' }, plans.vue()),
    el('div', { class: 'pied' }, el('span', {}, plans.pied()),
      el('a', { href: `https://github.com/${DEPOT}/issues/${PLANS_ISSUE}`, target: '_blank', rel: 'noopener' }, `La mission #${PLANS_ISSUE} sur GitHub ↗`))));
  if (garder) boite.querySelector(`.onglet[data-onglet="${garder}"]`)?.focus();
}

function carte(t) {
  if (edition === t.number) return fiche(t);
  const e = etatDe(t), taille = tailleDe(t), urgence = e === 'rentree' ? null : urgenceDe(t), qui = (t.assignees ?? []).map((a) => missions.nomDe(a.login));
  return el('article', { class: `mission${e === 'rentree' ? ' rentree' : ''}` },
    el('span', { class: 'num' }, `#${t.number}`),
    el('h5', {}, el('a', { href: t.html_url ?? '#', target: '_blank', rel: 'noopener' }, t.title)),
    el('div', { class: 'meta' },
      el('span', { class: 'puce' }, taille ? `${taille} · ${POINTS[taille]} pt${POINTS[taille] > 1 ? 's' : ''}` : 'sans taille · 0 pt'),
      urgence ? el('span', { class: `puce urgence urgence-${urgence}` }, `urgence ${URGENCES[urgence]}`) : null,
      t.milestone?.title ? el('span', { class: 'puce' }, t.milestone.title) : null,
      qui.length ? el('span', { class: 'qui', title: e === 'rentree' ? 'rentrée par' : 'en cours avec' }, qui.join(', ')) : null),
    e === 'aprendre' ? el('div', { class: 'comment' }, 'Pour la rentrer : une PR qui contient ', el('code', {}, `Ferme #${t.number}`), ', fusionnée.') : null,
    e === 'encours' ? el('div', { class: 'comment' }, 'Elle rentre quand la PR avec ', el('code', {}, `Ferme #${t.number}`), ' est fusionnée.') : null,
    peutEcrire() ? actions(t) : null);
}

// --- Écrire dans GitHub depuis le tableau (27_github.js) --------------------------------------------
const peutEcrire = () => !visite && !!github?.connecte;
const moi = () => github?.login;
const logins = (t) => (t.assignees ?? []).map((a) => a.login);
const estAMoi = (t) => !!moi() && logins(t).some((l) => l.toLowerCase() === moi().toLowerCase());
const nomLabel = (l) => (typeof l === 'string' ? l : l.name);
const norm = (x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const TAILLES = ['S', 'M', 'L'];

function enTeteGithub() {
  if (visite || !github) return null;
  if (!github.connecte) {
    return el('button', { class: 'fermer connexion-github', type: 'button', onclick: () => github.connecter(), title: 'La même connexion que le tableau de travail du dashboard' }, 'Se connecter à GitHub');
  }
  return el('span', { class: 'connecte-github' }, 'GitHub : ', el('b', {}, moi() ?? '…'), ' ',
    el('button', { class: 'lien-discret', type: 'button', onclick: () => { github.deconnecter(); nouvelle = { texte: 'Déconnecté de GitHub.' }; dessiner(); } }, 'se déconnecter'));
}

// Les labels d'une mission avec ce lieu (axe) et cette taille ; les autres labels (idée, priorité…) restent.
export function labelsAvec(labels, { lieu, taille }) {
  const axes = LIEUX_AXES.flatMap((x) => x.labels.map(norm));
  const garder = (labels ?? []).map(nomLabel).filter((n) => !axes.includes(norm(n)) && !/^taille\s*:/.test(norm(n)));
  const axe = LIEUX_AXES.find((x) => x.id === lieu)?.labels[0];
  return [...garder, ...(axe ? [axe] : []), ...(TAILLES.includes(taille) ? [`taille: ${taille}`] : [])];
}

function actions(t) {
  const ouverte = t.state !== 'closed', b = (texte, f, classe = '') => el('button', { type: 'button', class: `action ${classe}`.trim(), disabled: occupe, onclick: f }, texte);
  if (aConfirmer === t.number) {
    return el('div', { class: 'actions confirmer' }, el('span', {}, 'Supprimer pour de bon ?'),
      b('Oui, supprimer', () => supprimer(t), 'danger'), b('Annuler', () => { aConfirmer = null; dessiner(); }));
  }
  return el('div', { class: 'actions' },
    ouverte ? (estAMoi(t) ? b('Je lâche', () => ecrire(t, { assignees: logins(t).filter((l) => l.toLowerCase() !== moi().toLowerCase()) }, 'lâchée'))
      : b('Je prends', () => ecrire(t, { assignees: [...logins(t), moi()] }, 'prise'))) : null,
    ouverte ? b('Fait ✓', () => ecrire(t, { state: 'closed', state_reason: 'completed' }, 'rentrée'), 'fait')
      : b('Rouvrir', () => ecrire(t, { state: 'open' }, 'rouverte')),
    b('Modifier', () => { edition = t.number; aConfirmer = null; dessiner(); focusFiche(); }),
    refusee === t.number ? b('Fermer (abandonnée)', () => ecrire(t, { state: 'closed', state_reason: 'not_planned' }, 'fermée, abandonnée')) : null,
    b('Supprimer', () => { aConfirmer = t.number; dessiner(); }, 'danger'));
}

// La fiche d'une mission : nouvelle (t = null) ou à modifier.
function fiche(t) {
  const equipe = missions.etat.equipe ?? [], qui = new Set(t ? logins(t).map((l) => l.toLowerCase()) : []);
  const titre = el('input', { name: 'titre', type: 'text', required: true, maxlength: '200', value: t?.title ?? '', 'aria-label': 'Titre de la mission', placeholder: 'Ce qu’il faut faire' });
  const corps = el('textarea', { name: 'corps', rows: '3', 'aria-label': 'Description', placeholder: 'Ce que c’est, et quand c’est fini (facultatif)' });
  corps.value = t?.body ?? '';
  const lieuActuel = t ? lieuDe(t) ?? 'sans' : choisie;
  const lieu = el('select', { name: 'lieu', 'aria-label': 'Lieu du camp (axe)' },
    [...LIEUX_AXES.map((x) => el('option', { value: x.id, selected: x.id === lieuActuel }, `${x.lieu} · ${x.axe}`)), el('option', { value: 'sans', selected: lieuActuel === 'sans' }, 'Sans lieu')]);
  const tailleActuelle = t ? tailleDe(t) : null;
  const taille = el('select', { name: 'taille', 'aria-label': 'Taille (renommée)' },
    el('option', { value: '', selected: !tailleActuelle }, 'sans taille · 0'), TAILLES.map((x) => el('option', { value: x, selected: tailleActuelle === x }, `${x} · ${POINTS[x]} pt${POINTS[x] > 1 ? 's' : ''}`)));
  const cases = equipe.filter((m) => m.github).map((m) => el('label', { class: 'case' },
    el('input', { type: 'checkbox', name: 'qui', value: m.github, checked: qui.has(m.github.toLowerCase()) }), ` ${m.nom || m.github}`));
  const form = el('form', { class: 'mission fiche', 'data-numero': t ? String(t.number) : 'nouvelle', onsubmit: (e) => {
    e.preventDefault();
    const choix = { titre: titre.value.trim(), corps: corps.value.trim(), lieu: lieu.value, taille: taille.value, qui: [...form.querySelectorAll('input[name=qui]:checked')].map((c) => c.value) };
    if (!choix.titre) { titre.focus(); return; }
    enregistrer(t, choix);
  } },
    el('span', { class: 'num' }, t ? `#${t.number} · modifier` : 'Nouvelle mission'),
    titre, corps,
    el('div', { class: 'ligne-fiche' }, lieu, taille),
    cases.length ? el('fieldset', { class: 'qui-fiche' }, el('legend', {}, 'Qui s’en occupe'), cases) : null,
    el('div', { class: 'actions' },
      el('button', { type: 'submit', class: 'action fait', disabled: occupe }, t ? 'Enregistrer' : 'Créer la mission'),
      el('button', { type: 'button', class: 'action', onclick: () => { edition = null; dessiner(); } }, 'Annuler')));
  return form;
}
const focusFiche = () => setTimeout(() => boite.querySelector('.fiche input[name=titre]')?.focus(), 0);

// Une écriture : on montre « … », puis l'issue à jour (sans attendre le webhook), ou ce que GitHub refuse.
async function travailler(f, reussite) {
  occupe = true; nouvelle = { texte: 'J’écris dans GitHub…' }; dessiner();
  try {
    const n = await f();
    nouvelle = { texte: reussite(n) };
    return n;
  } catch (e) {
    nouvelle = { texte: e.message, grave: true };
    throw e;
  } finally { occupe = false; dessiner(); }
}

function ecrire(t, corps, resume) {
  return travailler(() => github.appel('PATCH', `/repos/${DEPOT}/issues/${t.number}`, corps), (n) => { missions.remplacer(n); return `#${n.number} ${resume}.`; }).catch(() => {});
}

function enregistrer(t, { titre, corps, lieu, taille, qui }) {
  const contenu = { title: titre, body: corps, labels: labelsAvec(t?.labels, { lieu, taille }), assignees: qui };
  const f = t ? () => github.appel('PATCH', `/repos/${DEPOT}/issues/${t.number}`, contenu) : () => github.appel('POST', `/repos/${DEPOT}/issues`, contenu);
  return travailler(f, (n) => { missions.remplacer(n); edition = null; if (lieu !== 'sans') choisie = lieu; return t ? `#${n.number} modifiée.` : `#${n.number} créée.`; }).catch(() => {});
}

function supprimer(t) {
  aConfirmer = null;
  return travailler(async () => {
    if (!t.node_id) throw Object.assign(new Error('GitHub n’a pas donné l’identifiant de cette mission : recharge la page.'), { status: 0 });
    await github.graphql('mutation($id: ID!) { deleteIssue(input: { issueId: $id }) { clientMutationId } }', { id: t.node_id });
    return t;
  }, (n) => { missions.retirer(n.number); refusee = null; return `#${n.number} supprimée.`; })
    .catch((e) => {
      if (e.status === 0) return;
      refusee = t.number;   // pas admin du repo, ou la suppression n'est pas permise : on propose de la fermer
      nouvelle = { texte: `${e.message.replace(/[.\s]*$/, '.')} Tu peux la fermer comme abandonnée : elle disparaît du camp et du tableau, sans renommée.`, grave: true };
      dessiner();
    });
}

function dessinerApercu() { dessinerPanneau(gApercu, images, missions.resume().niveaux, decor.zoneVisee, temps); }

export function update(dt) {
  temps += dt;
  const res = missions.resume();
  decor.appeler(res.aPrendre > 0 || !vu);   // des missions attendent, ou c'est la première fois
  if (ouvert) { dessinerApercu(); return; }
  // la bulle « E : consulter » au-dessus du panneau, quand on est devant
  const proche = pres();
  bulle.hidden = !proche;
  if (proche) {
    const r = rect(), cr = canvas.getBoundingClientRect();
    bulle.style.left = `${cr.left + ((r.x + r.w / 2 - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
    bulle.style.top = `${cr.top + ((r.y - 6 - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
    if (game.input.take('consulter')) ouvrir();
  }
}

export function dispose() { boite?.remove(); bulle?.remove(); }

export const api = {
  ouvrir, fermer, labelsAvec,
  get plans() { return plans; },
  get onglet() { return onglet; },
  get nouvelle() { return nouvelle; },
  get occupe() { return occupe; },
  get vu() { return vu; },
  marquerVu,
  get ouvert() { return ouvert; },
  get boite() { return boite; },
  get bulle() { return bulle; },
  // Le centre du panneau-carte à l'écran (pour un clic de test)
  centreEcran() {
    const r = rect(), cr = canvas.getBoundingClientRect();
    return { x: cr.left + ((r.x + r.w / 2 - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((r.y + r.h / 2 - rendu.cam.y) / rendu.vue.h) * cr.height };
  },
};
