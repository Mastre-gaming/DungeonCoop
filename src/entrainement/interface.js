// L'interface du terrain d'entraînement, en bois et parchemin comme le camp : l'accueil (le mode de tour), les fiches
// des héros, la barre des capacités (leurs icônes LPC et leurs dégâts), la fiche de la capacité choisie ou survolée,
// la carte de la cible survolée (ses chances), le journal, le d20 en grand, la fin et sa fiche de mesure (à copier,
// comme dans la Salle d'essai). Les maquettes : design/ui-combat/ (#113, #129). Les clics sur le terrain deviennent
// des actions du combat.
//   clic : choisir un héros, marcher (on voit le chemin et sa longueur), viser · Échap ou clic droit : annuler
//   1 à 9 : une capacité · Tab : le héros suivant · molette : zoom · clic droit glissé : déplacer la vue
//   V : les barres de vie des ennemis · Maj+V : celles des alliés
// À plusieurs (#80, multi.js branché) : l'accueil devient le lobby (chacun ses places), on ne choisit que ses héros, les
// actions partent chez l'hôte, et « Fin de la phase » devient « Je suis prêt ».
import { CAPACITES, HEROS, ENNEMIS, PNJ, NOM_ETAT, NOM_RESULTAT, CLASSES_ESSAI, EQUIPE_KIT, PLACES, equipeDepuis, capacitesDe, VUE } from './regles.js';
import { CONTACT, metres, dist } from './geometrie.js';
import { icone, TAMPONS, resultats, caracteristiques, effets, resume } from './fiches.js';
import { curseurCss } from './armes.js';
import { etatsActifs } from './etats.js';

export const name = 'interface';
export const always = true;

const RETOUR_CAMP = './index.html?spot=combat';
const el = (tag, attrs = {}, ...enfants) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'dataset') Object.assign(n.dataset, v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
};
const pct = (x) => `${Math.round(x * 100)} %`;
const duree = (ms) => { const s = Math.round(Math.max(0, ms) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

let cine = null, game, combat, vue, canvas, nouveauCombat, reseau = null;
// la fiche de la capacité, montrée ou cachée (I, ou le bouton au-dessus de la barre) : ce navigateur s'en souvient
const CLE_FICHE = 'dungeoncoop:fiche-capacite';
const ui = { ficheCachee: (() => { try { return localStorage.getItem(CLE_FICHE) === 'cachee'; } catch { return false; } })(), sel: null, cap: null, capSurvol: null, survol: null, annuler: [], portee: null, fini: false, sale: true, horloge: Date.now };
const dom = {};

export function init(g, options) {
  game = g;
  ({ combat, vue, canvas, nouveauCombat } = options);
  cine = options.cinema ?? null;
  ui.aventure = options.aventure ?? null;           // le nom de l'aventure : pas de fiche de mesure, la route continue
  if (options.horloge) ui.horloge = options.horloge;
  // l'équipe à choisir : celle de l'adresse (?equipe=), sinon la dernière choisie dans ce navigateur, sinon le kit D1
  ui.choix = (new URLSearchParams(location.search).has('equipe') ? combat.S.equipe : lireChoix() ?? combat.S.equipe).slice();
  construire();
  if (ui.aventure) { dom.titre.textContent = ui.aventure; dom.boutonFiche.hidden = true; }
  if (options.mode === 'initiative') dom.accueil.querySelector('input[value=initiative]').checked = true;
  if (options.demarrer) commencer();
  vue.surEvenement(surEvenement);
  canvas.addEventListener('pointermove', (e) => { ui.survol = vue.versMonde(e.clientX, e.clientY); ui.client = { x: e.clientX, y: e.clientY }; ui.capSurvol = null; ui.sale = true; });
  canvas.addEventListener('pointerleave', () => { ui.survol = null; ui.sale = true; });
  canvas.addEventListener('pointerdown', (e) => { if (cine?.actif()) return void cine.suivant(); if (e.button === 0) cliquer(vue.versMonde(e.clientX, e.clientY)); else if (e.button === 2) choisirCapacite(null); });
  window.addEventListener('keydown', clavier);
  return api;
}

// --- La page ----------------------------------------------------------------------------------------------------
function construire() {
  dom.haut = el('header', { class: 'haut-terrain plaque' },
    dom.titre = el('strong', { class: 'titre-terrain' }, 'Terrain d’entraînement'),
    dom.etat = el('span', { class: 'etat-terrain' }, 'Prêt'),
    dom.emporte = el('span', { class: 'emporte-hud', hidden: true },
      dom.relance = el('span', { class: 'relance-hud', title: 'La vieille borne : le premier d20 raté d’un héros se rejoue' }),
      dom.poserTonneau = el('button', { type: 'button', class: 'bouton-jeu discret petit', title: 'Poser le tonneau d’huile à côté du héros choisi (exploration)', onclick: () => { const h = herosChoisi(); if (h && combat.poserTonneau(h)) vider(); else banniere('En exploration, avec un héros choisi'); } }, 'Poser le tonneau')),
    dom.caillasse = el('span', { class: 'caillasse-hud', title: 'La Caillasse du groupe', hidden: true }, el('i', { class: 'piece-caillasse', 'aria-hidden': 'true' }), dom.caillasseN = el('b', {}, '0')),
    dom.chrono = el('span', { class: 'chrono' }),
    el('span', { class: 'sans-cases', title: 'FIGHT_RULES.md, « On trial » : chaque classe a une distance max par tour' }, 'sans cases'),
    dom.boutonFiche = el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => montrerFin(true) }, 'Fiche'),
    el('a', { class: 'bouton-jeu retour-camp', id: 'retour-camp', href: RETOUR_CAMP }, 'Retour au camp'));
  dom.equipe = el('aside', { class: 'equipe-terrain', 'aria-label': 'Les héros' });
  // le journal, en haut à droite : les dernières lignes ; « Tout » le déplie
  dom.droite = el('aside', { class: 'droite-terrain' },
    dom.journalCadre = el('section', { class: 'journal-terrain plaque' },
      el('header', {}, el('h2', {}, 'Journal'),
        dom.journalTout = el('button', { type: 'button', class: 'bouton-jeu discret petit', 'aria-expanded': 'false', onclick: basculerJournal }, 'Tout')),
      dom.journal = el('ol', {})));
  // en bas à droite : finir la phase (« Je suis prêt » à plusieurs), et annuler le dernier déplacement
  dom.coin = el('div', { class: 'coin-phase bois' },
    dom.annuler = el('button', { type: 'button', class: 'bouton-jeu discret', onclick: annuler, title: 'Annuler le dernier déplacement (sans dé)' }, 'Annuler le déplacement'),
    dom.finPhase = el('button', { type: 'button', class: 'bouton-jeu', id: 'fin-phase', onclick: finPhase }, 'Fin de la phase des héros'));
  // en bas : la fiche de la capacité (choisie, ou survolée dans la barre), au-dessus de la barre des capacités
  dom.bas = el('div', { class: 'bas-terrain' },
    dom.ficheCap = el('section', { class: 'fiche-capacite bois', hidden: true, 'aria-live': 'polite' }),
    dom.basculeFiche = el('button', { type: 'button', class: 'bascule-fiche bouton-jeu discret petit', 'aria-pressed': 'true', title: 'Montrer ou cacher la fiche de la capacité (I)', onclick: () => basculerFiche() }, 'Fiche'),
    dom.barre = el('nav', { class: 'barre-terrain bois', 'aria-label': 'Les capacités du héros choisi' }, dom.capacites = el('div', { class: 'capacites' })));
  dom.de = el('div', { class: 'de-grand', hidden: true, 'aria-live': 'polite' });
  dom.banniere = el('div', { class: 'banniere-terrain', hidden: true });
  dom.info = el('div', { class: 'carte-cible bois', hidden: true });
  dom.distance = el('div', { class: 'distance-survol', hidden: true });
  dom.aide = el('p', { class: 'aide-terrain plaque' }, 'Clic : choisir, marcher, viser · ', el('kbd', {}, '1'), '–', el('kbd', {}, '9'), ' capacités · ',
    el('kbd', {}, 'Tab'), ' héros suivant · ', el('kbd', {}, 'Échap'), ' annuler · ', el('kbd', {}, 'V'), ' vie des ennemis · ', el('kbd', {}, 'I'), ' fiche · ', el('kbd', {}, 'Maj'), '+', el('kbd', {}, 'V'),
    ' des alliés · molette : zoom · clic droit glissé : la vue');
  dom.accueil = el('div', { class: 'fond-terrain', id: 'accueil' }, el('section', { class: 'cadre-terrain' },
    el('h1', {}, 'Le terrain d’entraînement'),
    el('p', {}, 'Le combat D1 du kit papier (la Salle d’essai de Fraps), joué ', el('strong', {}, 'sans cases'),
      ' : chaque classe a une distance maximale par tour, en mètres, et la salle est cinq fois plus grande (36 × 24 m). L’eau de l’étang est profonde : on n’y marche pas. Le fossé au sud remplace la corniche.'),
    dom.groupe = el('div', { class: 'groupe-lobby', hidden: true, 'aria-live': 'polite' }),
    dom.titreEquipe = el('h2', {}, 'Ton équipe : choisis la classe de chacun'),
    el('p', { class: 'muet' }, 'Les 4 héros du kit D1, ou des classes d’essai (marquées « essai » : faites au budget de la fiche de classe, pour tester ; les vraies classes restent celles de chacun). ◀ ▶ pour changer.'),
    dom.places = el('div', { class: 'places-accueil' }),
    dom.boutonsEquipe = el('div', { class: 'boutons' },
      el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => { ui.choix = EQUIPE_KIT.slice(); dessinerPlaces(); } }, 'Le kit D1'),
      el('button', { type: 'button', class: 'bouton-jeu discret', id: 'au-hasard', onclick: auHasard }, 'Au hasard')),
    dom.mode = el('fieldset', { class: 'mode-tour', onchange: (e) => reseau?.mode(e.target.value) }, el('legend', {}, 'Le mode de tour'),
      el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'equipe', checked: true }), ' Tour d’équipe : tous les héros, puis tous les ennemis'),
      el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'initiative' }), ' Ordre d’initiative : d20 + DEX, deux héros qui se suivent jouent ensemble')),
    el('p', { class: 'objectif' }, 'Objectif : vaincre le chef (les autres s’enfuient).'),
    dom.attente = el('p', { class: 'attente-lobby', hidden: true }),
    el('div', { class: 'boutons' }, dom.commencer = el('button', { type: 'button', class: 'bouton-jeu', id: 'commencer', onclick: commencer }, 'Commencer le combat'),
      el('a', { class: 'bouton-jeu discret retour-camp', href: RETOUR_CAMP }, 'Retour au camp'))));
  dom.fin = el('div', { class: 'fond-terrain', id: 'fin', hidden: true }, el('section', { class: 'cadre-terrain' },
    dom.finTitre = el('h1', {}),
    el('div', { class: 'notes-fin' },
      ...[['fun', 'Fun, sur 10'], ['lent', 'Ce qui a semblé lent'], ['cases', 'Sans cases : mieux ou moins bien qu’avec, et pourquoi'], ['regle', 'Une règle à changer']]
        .map(([k, t]) => el('label', {}, t, el('input', { type: 'text', name: k, oninput: () => { dom.fiche.textContent = combat.fiche(notes()); } })))),
    dom.fiche = el('pre', { class: 'fiche' }),
    el('div', { class: 'boutons' },
      el('button', { type: 'button', class: 'bouton-jeu', id: 'copier-fiche', onclick: copier }, 'Copier la fiche'),
      dom.continuer = el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => { dom.fin.hidden = true; } }, 'Revenir au combat'),
      dom.rejouer = el('button', { type: 'button', class: 'bouton-jeu discret', onclick: rejouer }, 'Rejouer'),
      el('a', { class: 'bouton-jeu discret retour-camp', href: RETOUR_CAMP }, 'Retour au camp'))));
  dom.defaite = el('div', { class: 'fond-terrain', id: 'defaite', hidden: true }, el('section', { class: 'cadre-terrain' },
    el('h1', {}, 'Défaite'),
    el('p', {}, 'Les quatre héros sont à terre. Le groupe retourne au début du chemin.'),
    el('div', { class: 'boutons' },
      el('button', { type: 'button', class: 'bouton-jeu', id: 'recommencer-chemin', onclick: recommencerChemin }, 'Recommencer le chemin'),
      el('a', { class: 'bouton-jeu discret retour-camp', href: RETOUR_CAMP }, 'Retour au camp'))));
  // la fin du chemin : la porte de la tour passée (le niveau suivant est à écrire)
  dom.arrivee = el('div', { class: 'fond-terrain', id: 'arrivee', hidden: true }, el('section', { class: 'cadre-terrain' },
    el('h1', {}, 'La porte de la tour'),
    dom.arriveeTexte = el('p', {}, ''),
    el('div', { class: 'boutons' },
      el('a', { class: 'bouton-jeu retour-camp', href: RETOUR_CAMP }, 'Retour au camp'),
      el('button', { type: 'button', class: 'bouton-jeu discret', onclick: recommencerChemin }, 'Refaire le chemin (une autre graine)'))));
  document.body.append(dom.haut, dom.equipe, dom.droite, dom.bas, dom.coin, dom.de, dom.banniere, dom.info, dom.distance, dom.aide, dom.accueil, dom.fin, dom.defaite, dom.arrivee);
  // à plusieurs, « Retour au camp » passe par multi.js : l'hôte y emmène tout le groupe
  document.addEventListener('click', (e) => { const a = e.target.closest?.('a.retour-camp'); if (a && reseau) { e.preventDefault(); reseau.partirAuCamp(); } });
  dessinerPlaces();
  dessinerTout();
}

// --- Le choix de l'équipe (#76) ---------------------------------------------------------------------------------
const CLE_CHOIX = 'dungeoncoop:equipe-entrainement';
function lireChoix() { try { return equipeDepuis(localStorage.getItem(CLE_CHOIX)); } catch { return null; } }
const equipeAffichee = () => (reseau ? reseau.L.equipe : ui.choix);
function changerClasse(k, sens) {
  const i = CLASSES_ESSAI.indexOf(equipeAffichee()[k]), type = CLASSES_ESSAI[(i + sens + CLASSES_ESSAI.length) % CLASSES_ESSAI.length];
  if (reseau) return void reseau.classe(k, type);
  ui.choix[k] = type;
  dessinerPlaces();
}
// à plusieurs : ma place, ou une place libre pour l'hôte (celle d'un ami, non)
const peutRegler = (k) => !reseau || reseau.L.proprio[k] === reseau.moi || (reseau.hote && reseau.L.proprio[k] === null);
function auHasard() {
  const melange = CLASSES_ESSAI.slice().sort(() => Math.random() - 0.5);
  ui.choix = melange.slice(0, 4);
  dessinerPlaces();
}
function dessinerPlaces() {
  dessinerLobby();
  dom.places.replaceChildren(...equipeAffichee().map((type, k) => {
    const H = HEROS[type], ok = peutRegler(k), qui = reseau?.L.proprio[k];
    return el('article', { class: `place-heros${reseau ? ` ${joueurDePlace(k)}` : ''}`, dataset: { place: k, classe: type }, style: qui ? `--couleur:${reseau.couleurDe(qui)}` : null },
      el('header', {},
        el('button', { type: 'button', class: 'fleche', disabled: !ok, 'aria-label': `Héros ${k + 1} : la classe d’avant`, onclick: () => changerClasse(k, -1) }, '◀'),
        el('span', { class: 'qui-place' }, `Héros ${k + 1}`),
        el('button', { type: 'button', class: 'fleche', disabled: !ok, 'aria-label': `Héros ${k + 1} : la classe d’après`, onclick: () => changerClasse(k, 1) }, '▶')),
      reseau ? proprioPlace(k) : null,
      vue.portrait(type, 56),
      el('strong', { class: 'classe' }, H.nom, H.essai ? el('span', { class: 'essai' }, 'essai') : null),
      el('span', { class: 'role' }, H.role),
      el('span', { class: 'chiffres' }, `${H.pv} PV · `, el('strong', {}, `${metres(H.vitesse)} m par tour`)),
      el('span', { class: 'liste-capacites' }, H.capacites.slice(0, 3).map((c) => CAPACITES[c].nom).join(' · ')),
      el('span', { class: 'faiblesse' }, `Faiblesse : ${H.faiblesse}`));
  }));
}

// --- Le lobby à plusieurs (#80) ------------------------------------------------------------------------------------
const joueurDePlace = (k) => { const p = reseau.L.proprio[k]; return p === null ? 'libre' : p === reseau.moi ? 'mienne' : 'prise'; };
function proprioPlace(k) {
  const p = reseau.L.proprio[k];
  if (p === null) return el('div', { class: 'joueur-place' }, el('span', { class: 'muet' }, 'libre'), el('button', { type: 'button', class: 'bouton-jeu petit prendre', onclick: () => reseau.prendre(k) }, 'Prendre'));
  if (p === reseau.moi) return el('div', { class: 'joueur-place' }, el('strong', {}, 'toi'), el('button', { type: 'button', class: 'bouton-jeu discret petit laisser', onclick: () => reseau.rendre(k) }, 'Laisser'));
  return el('div', { class: 'joueur-place' }, el('strong', {}, reseau.nomDe(p)));
}
function dessinerLobby() {
  dom.groupe.hidden = !reseau;
  dom.boutonsEquipe.hidden = !!reseau;
  dom.titreEquipe.textContent = reseau ? 'Le lobby : chacun prend ses héros et choisit leur classe' : 'Ton équipe : choisis la classe de chacun';
  for (const i of dom.mode.querySelectorAll('input')) i.disabled = !!reseau && !reseau.hote;
  dom.commencer.hidden = !!reseau && !reseau.hote;
  dom.attente.hidden = !reseau;
  if (!reseau) return;
  const L = reseau.L, joueurs = reseau.joueurs(), hote = joueurs.find((j) => j.id === 'host');
  const radio = dom.mode.querySelector(`input[value=${L.mode}]`); if (radio && !radio.checked) radio.checked = true;
  dom.groupe.replaceChildren(el('span', {}, `Le groupe${reseau.code ? ` (code ${reseau.code})` : ''} : `),
    ...joueurs.map((j) => el('span', { class: 'joueur', style: `--couleur:${reseau.couleurDe(j.id)}` }, j.nom, j.moi ? ' (toi)' : '', j.id === 'host' ? ' · hôte' : '')),
    ...(reseau.statut ? [el('span', { class: 'statut' }, reseau.statut)] : []));
  const libres = L.proprio.filter((p) => p === null).length;
  dom.attente.textContent = reseau.hote ? (libres ? `${libres === 1 ? 'Le héros sans joueur sera joué' : `Les ${libres} héros sans joueur seront joués`} par toi.` : 'Chaque héros a son joueur.')
    : `${hote ? hote.nom : 'L’hôte'} lance le combat quand tout le monde est prêt.`;
}
// l'adresse qui lance le combat avec cette équipe et ce mode
export const adresseEquipe = (equipe, mode) => `?equipe=${equipe.join(',')}&mode=${mode}&go`;
const notes = () => Object.fromEntries([...dom.fin.querySelectorAll('input')].map((i) => [{ fun: 'Fun sur 10', lent: 'Ce qui a semblé lent', cases: 'Sans cases', regle: 'Une règle à changer' }[i.name], i.value.trim()]));

// --- Le déroulé -------------------------------------------------------------------------------------------------
function vider() { const evs = combat.S.evenements.splice(0); vue.jouer(evs); ui.sale = true; }
function commencer() {
  if (reseau) return void (reseau.hote && reseau.commencer());
  const mode = dom.accueil.querySelector('input[name=mode]:checked')?.value ?? 'equipe';
  try { localStorage.setItem(CLE_CHOIX, ui.choix.join(',')); } catch {}
  // une autre équipe que celle du combat préparé : un nouveau combat avec elle, sans recharger
  if (ui.choix.join(',') !== combat.S.equipe.join(',') || combat.S.phase !== 'preparation') nouveauCombat(ui.choix);
  combat.S.mode = mode;
  lance();
  combat.commencer();
  vider();
}
function lance() { dom.accueil.hidden = true; dom.fin.hidden = true; ui.fini = false; ui.finMontree = false; ui.sale = true; }
function accueil() { dom.fin.hidden = true; dom.accueil.hidden = false; ui.fini = false; ui.finMontree = false; dessinerPlaces(); ui.sale = true; }
function rejouer() {
  if (reseau) return void (reseau.hote && reseau.rejouer());
  ui.choix = combat.S.equipe.slice();
  nouveauCombat(ui.choix);
  accueil();
}
function finPhase() {
  if (reseau) return void (combat.S.phase === 'heros' && reseau.attendus().includes(reseau.moi) && reseau.pret(!reseau.estPret()));
  if (vue.occupe() || combat.S.phase !== 'heros') return;
  ui.sel = null; ui.cap = null; ui.annuler = []; ui.portee = null;
  combat.finPhaseHeros();
  vider();
}
function annuler() {
  if (vue.occupe() || !ui.annuler.length) return;
  combat.restaurer(ui.annuler.pop());
  ui.portee = null; ui.sale = true;
}
function surEvenement(e) {
  if (e.type === 'de') { if (!e.deJoue) montrerDe(e); }
  else if (e.type === 'combo') tamponCombo(e);
  else if (e.type === 'round') banniere(`Round ${e.r}`);
  else if (e.type === 'phase' && e.phase === 'ennemis') banniere('Les ennemis jouent', 'ennemi');
  else if (e.type === 'phase' && e.phase === 'heros') {
    banniere('À vous', 'heros');
    ui.sel = e.ids.map((id) => combat.U(id)).find((u) => !u.ko && aMoi(u.id))?.id ?? null; ui.cap = null; ui.portee = null; ui.annuler = [];
  } else if (e.type === 'fin') ui.fini = true;
  else if (e.type === 'eclair') banniere('L’eau est électrisée !', 'combo');
  else if (e.type === 'renfort') banniere('Des renforts !', 'ennemi');
  else if (e.type === 'embuscade') banniere('Une embuscade !', 'ennemi');
  else if (e.type === 'paye') banniere('Les bandits s’écartent', 'combo');
  else if (e.type === 'fourche') banniere('Un éboulis ferme l’autre chemin !', 'ennemi');
  else if (e.type === 'achat') banniere(e.tonneau ? `Tonneau d’huile acheté : −${e.prix} Caillasse (« Poser le tonneau », en haut)` : `Potion achetée : −${e.prix} Caillasse`, 'combo');
  else if (e.type === 'relance') banniere('La vieille borne veille : le dé se rejoue !', 'combo');
  else if (e.type === 'fouille') { if (!e.deJoue) montrerDe({ de: e.id, jets: [e.k], k: e.k, mod: null, fouille: true, ok: e.ok, borne: e.borne, piege: e.piege, persuasion: e.persuasion }); banniere(e.ok ? `+${e.n} Caillasse` : 'Rien trouvé', e.ok ? 'combo' : ''); }
  else if (e.type === 'engage') debutCombat(e);
  else if (e.type === 'charge') banniere(e.recale ? 'La ligne de Charge a bougé avec le gardien' : 'Le gardien annonce sa Charge : écartez-vous de la ligne rouge !', e.recale ? 'combo' : 'ennemi');
  else if (e.type === 'porte') banniere('La porte de la tour s’ouvre !', 'combo');
  else if (e.type === 'trouvaille') banniere(e.n ? `+${e.n} PV` : 'Déjà en pleine forme', 'combo');
  else if (e.type === 'perception' && e.ok) banniere('Quelque chose brille…', 'combo');
  else if (e.type === 'levier') banniere({ corde: 'Le pont s’effondre !', vanne: 'La cour est inondée !', herse: 'La herse tombe !' }[e.sorte] ?? '', 'combo');
  else if (e.type === 'curiosite' && e.n) banniere(`+${e.n} Caillasse`, 'combo');
  else if (e.type === 'arrivee') ui.arrivee = true;
  ui.sale = true;
}

// --- Choisir, marcher, viser ------------------------------------------------------------------------------------
const herosChoisi = () => (ui.sel ? combat.U(ui.sel) : null);
// Mon curseur : l'arme du héros choisi s'il est à moi, sinon celle de mon premier héros debout (armes.js).
function majCurseur() {
  const h = herosChoisi(), mien = h && aMoi(h.id) ? h : combat.S.unites.find((u) => u.camp === 'h' && !u.ko && aMoi(u.id));
  const type = mien?.type ?? null;
  if (type === ui.curseur) return;
  ui.curseur = type;
  canvas.style.cursor = curseurCss(type);
}
const aMoi = (id) => !reseau || reseau.aMoi(id);
function choisirHeros(id) {
  const h = combat.U(id);
  if (!h || h.camp !== 'h' || !combat.peutAgir(h) || !aMoi(id)) return false;
  ui.sel = id; ui.cap = null; ui.portee = null; ui.sale = true;
  vue.viser(h.x * 32, h.y * 32);
  return true;
}
function choisirCapacite(id) {
  const h = herosChoisi();
  if (id && (!h || !combat.peutUtiliser(h, CAPACITES[id]))) return false;
  ui.cap = id && ui.cap !== id ? id : null;
  // une capacité sans cible (la potion) se lance tout de suite
  if (ui.cap && CAPACITES[ui.cap].type === 'potion') { agir({}); return true; }
  ui.sale = true;
  return true;
}
function agir(cible) {
  const h = herosChoisi(); if (!h || !ui.cap) return false;
  if (reseau) { reseau.agir({ type: 'capacite', id: h.id, cap: ui.cap, cible }); ui.cap = null; ui.portee = null; ui.sale = true; return true; }
  const ok = combat.utiliser(h, ui.cap, cible);
  if (ok) { ui.cap = null; ui.annuler = []; ui.portee = null; vider(); }
  return ok;
}
// L'exploration : le héros choisi marche où l'on clique, les autres le suivent en file ; repéré en route, le combat commence.
function explorerVers(h, p) {
  const a = combat.apercuMarche(h, p.x, p.y, portee(h));
  if (!a.ok) return false;
  const depart = { x: h.x, y: h.y };
  combat.deplacer(h, p.x, p.y, portee(h), { meneur: true });
  ui.portee = null;
  const l = Math.hypot(depart.x - h.x, depart.y - h.y) || 1, ux = (depart.x - h.x) / l, uy = (depart.y - h.y) / l;
  combat.S.heros.map((id) => combat.U(id)).filter((u) => u !== h && !u.ko && aMoi(u.id)).forEach((u, k) => {
    if (combat.S.repere) return;
    for (const recul of [1.3 * (k + 1), 1.3 * k + 0.8, 0.9]) {        // derrière lui, sur le chemin qu'il a pris
      const c = { x: h.x + ux * recul + (k % 2 ? 0.5 : -0.5) * uy, y: h.y + uy * recul + (k % 2 ? -0.5 : 0.5) * ux };
      if (combat.deplacer(u, c.x, c.y, combat.portee(u))) break;
    }
  });
  // toutes les marches en même temps
  const evs = combat.S.evenements, marches = evs.filter((e) => e.type === 'marche');
  if (marches.length > 1) { const i = evs.indexOf(marches[0]); evs.splice(0, evs.length, ...evs.slice(0, i), { type: 'groupe', marches: marches.map((e) => ({ id: e.id, chemin: e.chemin })) }, ...evs.slice(i + 1).filter((e) => e.type !== 'marche')); }
  if (combat.S.repere) combat.engager(!!combat.S.repere.surprise, combat.S.repere.groupe ?? null);
  vider();
  if (cine && combat.S.phase === 'exploration') {          // la scène de la dernière zone franchie (celles d'avant, passées d'un coup, comptent comme vues)
    const passes = (cine.donnees?.declencheurs ?? []).filter((o) => h.x >= o.x && !cine.vues.has(o.scene)), d = passes[passes.length - 1];
    for (const o of passes) if (o !== d) cine.vues.add(o.scene);
    if (d) cine.jouer(d.scene, {});
  }
  if (combat.S.question?.fourche) demanderChemin();
  if (combat.S.question?.incident) demanderIncident();
  return true;
}
// L'étal du colporteur : une potion, ou le tonneau d'huile (une fois), payés en Caillasse.
function ouvrirEtal(h, id) {
  const c = combat.S.colporteurs.find((o) => o.id === id);
  if (!c || dom.choix) return;
  if (cine && !cine.vues.has('colporteur')) { cine.jouer('colporteur', {}).then(() => ouvrirEtal(h, id)); return; }      // la première fois : le gros plan, puis l'étal
  const fermer = () => { dom.choix.remove(); dom.choix = null; ui.sale = true; };
  const acheter = (f) => { if (f()) vider(); else banniere('Pas assez de Caillasse'); fermer(); };
  dom.choix = el('div', { class: 'entree-fond' }, el('section', { class: 'entree-terrain plaque', role: 'dialog', 'aria-label': 'L’étal du colporteur' },
    el('h2', {}, 'L’étal du colporteur'), el('p', {}, `${h.nom} a ${combat.S.caillasse} Caillasse.`),
    el('div', { class: 'entree-choix trois' },
      el('button', { type: 'button', class: 'entree-heros', 'data-achat': 'potion', disabled: combat.S.caillasse < c.prix, onclick: () => acheter(() => combat.acheter(h, id)) },
        el('strong', {}, `Une potion : ${c.prix}`), el('span', { class: 'detail-branche' }, '+20 PV, à boire en combat')),
      c.tonneau ? el('button', { type: 'button', class: 'entree-heros', 'data-achat': 'tonneau', disabled: c.tonneauVendu || combat.S.caillasse < c.tonneau, onclick: () => acheter(() => combat.acheterTonneau(h, id)) },
        el('strong', {}, c.tonneauVendu ? 'Le tonneau : vendu' : `Le tonneau d’huile : ${c.tonneau}`), el('span', { class: 'detail-branche' }, 'À poser avant un combat : un coup ou du feu, et l’huile s’étend')) : '',
      el('button', { type: 'button', class: 'entree-heros', 'data-achat': 'rien', onclick: fermer }, el('strong', {}, 'Rien, merci')))));
  document.body.append(dom.choix);
}
// L'embuscade des champs : payer, négocier (le héros choisi lance le d20), ou combattre.
function demanderIncident() {
  const i = combat.S.incidents.find((o) => o.id === combat.S.question?.incident);
  if (!i || dom.choix) return;
  const fermer = (choix) => { dom.choix.remove(); dom.choix = null; combat.resoudre(i.id, choix, herosChoisi() ?? combat.U('h1')); vider(); };
  dom.choix = el('div', { class: 'entree-fond' }, el('section', { class: 'entree-terrain plaque', role: 'dialog', 'aria-label': 'Une embuscade' },
    el('h2', {}, 'Une embuscade !'), el('p', { class: 'entree-question' }, 'Des bandits sortent des blés et barrent la route.'),
    el('div', { class: 'entree-choix trois' },
      el('button', { type: 'button', class: 'entree-heros', 'data-choix': 'payer', disabled: combat.S.caillasse < i.rancon, onclick: () => fermer('payer') }, el('strong', {}, `Payer ${i.rancon} Caillasse`)),
      el('button', { type: 'button', class: 'entree-heros', 'data-choix': 'negocier', onclick: () => fermer('negocier') }, el('strong', {}, 'Négocier (d20)')),
      el('button', { type: 'button', class: 'entree-heros', 'data-choix': 'combattre', onclick: () => fermer('combattre') }, el('strong', {}, 'Combattre')))));
  document.body.append(dom.choix);
}
// La fourche : arrivé au poteau, le groupe choisit son chemin (sur un seul écran : l'hôte ; à plusieurs, le vote et le dé
// en cas de désaccord restent à faire). Puis un arbre ferme l'autre chemin.
function demanderChemin() {
  const f = combat.S.fourches.find((o) => o.id === combat.S.question?.fourche);
  if (!f || dom.choix || ui.fourcheEnCours) return;
  if (cine && !cine.vues.has('fourche-avant')) { ui.fourcheEnCours = true; cine.jouer('fourche-avant', {}).then(() => { ui.fourcheEnCours = false; demanderChemin(); }); return; }
  dom.choix = el('div', { class: 'entree-fond' }, el('section', { class: 'entree-terrain plaque', role: 'dialog', 'aria-label': 'Quel chemin ?' },
    el('h2', {}, 'La fourche'), f.panneau ? el('p', {}, f.panneau) : '', el('p', { class: 'entree-question' }, 'Quel chemin prend le groupe ?'),
    el('div', { class: 'entree-choix deux' }, f.branches.map((b) => el('button', { type: 'button', class: 'entree-heros', 'data-branche': b.id, onclick: () => {
      dom.choix.remove(); dom.choix = null;
      combat.choisir(f.id, b.id);
      const evs = combat.S.evenements.splice(0), r = f.branches.find((o) => o.id !== b.id)?.tombe?.[0];
      let fait = false; const eboulis = () => { if (!fait) { fait = true; vue.jouer(evs); ui.sale = true; } };
      if (cine) cine.jouer('fourche-apres', { 'branche-perdue': r ? { x: (r.x0 + r.x1) / 2 + 3, y: (r.y0 + r.y1) / 2 } : null, eboulis }).then(eboulis); else eboulis();
    } }, el('strong', {}, b.nom || b.id), b.detail ? el('span', { class: 'detail-branche' }, b.detail) : '')))));
  document.body.append(dom.choix);
}
function cliquer(p) {
  if (cine?.actif()) return void cine.suivant();
  if (vue.occupe() || ui.fini || !['heros', 'exploration'].includes(combat.S.phase)) return;
  if (combat.S.phase === 'exploration' && !ui.cap) {
    const h = herosChoisi(), dessous = vue.sous(p.x, p.y);
    if (dessous && choisirHeros(dessous)) return;
    if (!h) return;
    // l'étal du colporteur, la vieille borne : au contact, on achète ou on lance le dé ; sinon, on y va
    const objet = [...combat.S.colporteurs.map((o) => ({ ...o, sorte: 'colporteur' })), ...combat.S.bornes.filter((o) => !o.faite).map((o) => ({ ...o, sorte: 'borne' })),
      ...combat.S.incidents.filter((o) => o.sorte === 'chariot' && !o.fait)].find((o) => dist(o, p) < 1.3);
    if (objet && dist(h, objet) <= CONTACT + 0.8) {
      if (objet.sorte === 'colporteur') return void ouvrirEtal(h, objet.id);
      const ok = objet.sorte === 'chariot' ? combat.fouillerChariot(h, objet.id) : combat.toucherBorne(h, objet.id);
      if (ok) vider(); else banniere(objet.sorte === 'colporteur' ? `Une potion : ${objet.prix} Caillasse` : 'Déjà fait');
      return;
    }
    if (objet) { const l = dist(h, objet), q = { x: objet.x + ((h.x - objet.x) / l) * 1.2, y: objet.y + ((h.y - objet.y) / l) * 1.2 }; explorerVers(h, q); return; }
    const lv = combat.S.leviers.find((l) => !l.fait && dist(l, p) < 1.2);
    if (lv && actionnerLevier(h, lv)) return;
    const cu = combat.S.curiosites.find((o) => (o.fuit ? o.couronne : !o.parti) && dist(o, p) < ({ canard: 3, loup: 1.3 }[o.sorte] ?? 0.9));   // (le canard nage autour de sa place ; la statue se clique sur tout son corps)
    if (cu) {
      const loin = cu.fuit ? CONTACT + 0.8 : cu.portee;
      if (dist(h, cu) <= loin) { if (combat.curiosite(h, cu.id)) vider(); return; }
      const l = dist(h, cu), q = { x: cu.x + ((h.x - cu.x) / l) * (loin - 0.4), y: cu.y + ((h.y - cu.y) / l) * (loin - 0.4) };
      if (!explorerVers(h, q)) banniere('Trop loin : approche-toi');
      return;
    }
    const tv = combat.S.trouvailles.find((o) => !o.fait && dist(o, p) < (o.sorte === 'pommier' ? 1.6 : 0.9));
    if (tv) {
      if (dist(h, tv) <= CONTACT + 0.8) { if (combat.cueillir(h, tv.id)) vider(); return; }
      const l = dist(h, tv), q = { x: tv.x + ((h.x - tv.x) / l) * 1.2, y: tv.y + ((h.y - tv.y) / l) * 1.2 };
      explorerVers(h, q); return;
    }
    const c = combat.S.cachettes.find((o) => !o.trouvee && o.reperee && dist(o, p) < 0.9);
    if (c && dist(h, c) <= CONTACT + 0.3) { if (combat.fouiller(h, c.id)) vider(); else banniere('Déjà fouillé par ce héros'); return; }
    if (c) { const l = dist(h, c), q = { x: c.x + ((h.x - c.x) / l) * 1.1, y: c.y + ((h.y - c.y) / l) * 1.1 }; explorerVers(h, q); return; }
    explorerVers(h, p);
    return;
  }
  const h = herosChoisi(), dessous = vue.sous(p.x, p.y);
  const lv = !ui.cap && h && combat.S.leviers.find((l) => !l.fait && dist(l, p) < 1.2);
  if (lv) { if (actionnerLevier(h, lv)) return; }
  if (ui.cap) {
    const cap = CAPACITES[ui.cap];
    if (cap.type === 'zone') return void agir({ x: p.x, y: p.y });
    if (dessous && combat.cibles(h, cap).some((c) => c.id === dessous)) return void agir({ id: dessous });
    if (cap.el === 'feu' && combat.huileVisable(h, cap, p)) return void agir({ x: p.x, y: p.y });
    return;
  }
  if (dessous && choisirHeros(dessous)) return;
  if (!h) return;
  const P = portee(h), a = combat.apercuMarche(h, p.x, p.y, P);
  if (!a.ok) return;
  if (reseau) { reseau.agir({ type: 'marche', id: h.id, x: p.x, y: p.y }); ui.portee = null; return; }
  const copie = combat.instantane();
  combat.deplacer(h, p.x, p.y, P);
  const evs = combat.S.evenements;
  if (evs.some((e) => e.type === 'de')) ui.annuler = []; else ui.annuler.push(copie);   // sur la glace, le dé a parlé : pas d'annulation
  ui.portee = null;
  vider();
}
function clavier(e) {
  if (e.target.closest?.('input, textarea')) return;
  if (cine?.actif()) { if (e.key === 'Escape') cine.passer(); else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cine.suivant(); } return; }
  if (e.key === 'Escape') { if (ui.cap) choisirCapacite(null); else if (!dom.fin.hidden && !ui.fini) dom.fin.hidden = true; return; }
  if (e.code === 'KeyI' && !e.ctrlKey && !e.metaKey && !e.altKey) { basculerFiche(); return; }
  if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const camp = e.shiftKey ? 'h' : 'e', oui = vue.basculerPlaques(camp);
    banniere(`Barres de vie ${camp === 'h' ? 'des alliés' : 'des ennemis'} : ${oui ? 'affichées' : 'cachées'}`);
    return;
  }
  if (e.key === 'Tab' && combat.S.phase === 'heros') {
    e.preventDefault();
    const ids = combat.groupeCourant()?.ids.filter((id) => combat.peutAgir(combat.U(id)) && aMoi(id)) ?? [];
    if (ids.length) choisirHeros(ids[(ids.indexOf(ui.sel) + 1) % ids.length]);
    return;
  }
  const n = Number(e.key);
  const h = herosChoisi();
  if (n >= 1 && n <= 9 && h) { const id = capacitesDe(combat.S, h.type)[n - 1]; if (id) choisirCapacite(id); }
}
function portee(h) { if (!ui.portee || ui.portee.id !== h.id || ui.portee.mv !== h.t.mv || ui.portee.x !== h.x || ui.portee.y !== h.y) ui.portee = { id: h.id, mv: h.t.mv, x: h.x, y: h.y, P: combat.portee(h) }; return ui.portee.P; }

// --- Chaque image : les marques, l'aperçu, les fiches -------------------------------------------------------------
export function update() {
  majCurseur();
  const libre = !vue.occupe();
  if (libre && ui.etaitOccupe) ui.sale = true;          // la file vient de finir : on redessine (boutons, zone de marche)
  ui.etaitOccupe = !libre;
  if (combat.S.phase === 'heros' && combat.S.debutPhase) dom.chrono.textContent = `phase des héros ${duree(ui.horloge() - combat.S.debutPhase)}`;
  compterCaillasse();
  document.body.classList.toggle('de-ouvert', document.querySelector('#des')?.hidden === false);   // (le journal ne gâche pas le jet : il se cache pendant que le dé roule)
  if (ui.fini && libre && dom.fin.hidden && !ui.finMontree) { ui.finMontree = true; if (ui.aventure) finAventure(); else montrerFin(false); }
  if (ui.arrivee && libre && dom.arrivee.hidden && !ui.arriveeJouee) { ui.arriveeJouee = true; if (cine) { cine.jouer('arrivee', {}).then(() => { ui.arriveeVue = true; ui.sale = true; }); } else ui.arriveeVue = true; }
  if (ui.arrivee && ui.arriveeVue && libre && dom.arrivee.hidden && !cine?.actif()) {
    const S = combat.S;
    dom.arriveeTexte.textContent = `Le groupe a passé la porte de la tour avec ${S.caillasse} Caillasse et ${S.stats.combos.length} combo${S.stats.combos.length > 1 ? 's' : ''} entre héros. La suite du camp des mastres est à écrire.`;
    dom.arrivee.hidden = false;
  }
  if (!ui.sale) return;
  if (!libre) {
    vue.dessinerMarques({ ...vue.marques, chemin: null, portee: null, zone: null, cibles: null, cercle: null });
    dom.distance.hidden = true; dom.ficheCap.hidden = true; dom.info.hidden = true;
    dessinerTout(); ui.sale = false; return;
  }
  ui.sale = false;
  const h = herosChoisi(), m = { selection: h && !h.ko ? h.id : null, actif: null };
  dom.distance.hidden = true;
  let info = null;
  if (h && combat.peutAgir(h)) {
    if (ui.cap) {
      const cap = CAPACITES[ui.cap];
      if (cap.portee && cap.portee > CONTACT) m.cercle = { x: h.x, y: h.y, r: cap.portee };
      m.cibles = combat.cibles(h, cap).map((c) => c.id);
      if (ui.survol) {
        if (cap.type === 'zone') m.zone = { x: ui.survol.x, y: ui.survol.y, r: cap.rayon, surf: cap.surf, ok: combat.zonePossible(h, cap, ui.survol) };
        const d = vue.sous(ui.survol.x, ui.survol.y);
        if (d && m.cibles.includes(d)) { m.survolCible = d; info = combat.apercu(h, ui.cap, d); }
      }
    } else {
      if (combat.S.phase !== 'exploration') { m.portee = portee(h).carte; m.mv = h.t.mv; }
      if (ui.survol && !vue.sous(ui.survol.x, ui.survol.y)) {
        const a = combat.apercuMarche(h, ui.survol.x, ui.survol.y, portee(h));
        if (a.pts.length) {
          m.chemin = a.pts; m.cheminOk = a.ok;
          dom.distance.hidden = false; dom.distance.textContent = `${metres(a.longueur)} m${a.ok ? '' : ' : trop loin'}`;
          dom.distance.style.left = `${ui.client.x + 14}px`; dom.distance.style.top = `${ui.client.y + 12}px`;
        }
      }
    }
  }
  // l'aperçu du combo : survoler un brasero (ou avoir choisi « Renverser » à son contact) montre le foin qui brûlerait
  if (combat.S.phase === 'exploration') {
    // les champs de vue : seulement ceux des ennemis dont on s'approche (le retour du propriétaire, 23 oct) ; on découvre la garde en avançant
    const heros = combat.herosVivants(), PRES = 4;
    m.vues = combat.ennemisVivants().map((e) => ({ e, r: ENNEMIS[e.type].vueLoin ?? VUE })).filter(({ e, r }) => heros.some((h) => dist(h, e) <= r + PRES))
      .map(({ e, r }) => ({ x: e.x, y: e.y, r, regard: combat.regardDe(e), demi: (35 * Math.PI) / 180 }));
    m.cachettes = [...combat.S.cachettes.filter((c) => !c.trouvee && c.reperee), ...combat.S.curiosites.filter((c) => c.couronne), ...combat.S.colporteurs, ...combat.S.bornes.filter((b) => !b.faite), ...combat.S.incidents.filter((i) => i.sorte === 'chariot' && !i.fait)];
  }
  if (combat.S.braseros.length && ['heros', 'exploration'].includes(combat.S.phase)) {
    const sous = ui.survol ? vue.sous(ui.survol.x, ui.survol.y) : null;
    const idBr = combat.S.braseros.find((b) => b.id === sous)?.id ?? (h && ui.cap && CAPACITES[ui.cap].type === 'brasero' ? combat.braseroProche(h)?.id : null);
    if (idBr) m.apercuFeu = combat.apercuBrasero(idBr);
  }
  m.charges = combat.S.unites.filter((u) => u.charge && !u.mort).map((u) => u.charge);
  if (['heros', 'exploration'].includes(combat.S.phase)) {
    const hs = combat.herosVivants(), proche = ui.survol && combat.S.leviers.find((l) => !l.fait && dist(l, ui.survol) < 1.2);
    m.leviers = combat.S.leviers.filter((l) => !l.fait && hs.some((x) => dist(x, l) < 9)).map((l) => ({ x: l.x, y: l.y, nom: l === proche || (h && dist(h, l) < 3) ? l.nom : null, possible: !!h && combat.levierPossible(h, l) }));
    if (proche) m.apercuLevier = combat.apercuLevier(proche.id);
    m.trouvailles = combat.S.phase === 'exploration' ? combat.S.trouvailles.filter((o) => !o.fait && hs.some((x) => dist(x, o) < 7)) : [];
  }
  // les intentions : survoler un ennemi trace sa menace jusqu'à sa cible ; viser un tir montre le couvert de chaque cible
  const survole = ui.survol ? combat.U(vue.sous(ui.survol.x, ui.survol.y)) : null;
  if (combat.S.phase === 'heros' && survole?.camp === 'e' && survole.intention?.cible) { const c = combat.U(survole.intention.cible); if (c) m.menaceVers = { a: survole, b: c }; }
  if (h && ui.cap && CAPACITES[ui.cap].type === 'attaque' && CAPACITES[ui.cap].portee > CONTACT) m.couverts = (m.cibles ?? []).filter((id) => combat.U(id) && combat.couvert(h, combat.U(id)));
  vue.dessinerMarques(m);
  dessinerFiche(h);
  dessinerInfo(info);
  dessinerTout();
}

// à plusieurs : qui joue ce héros (« toi », ou le nom de l'ami, dans sa couleur)
function joueurFiche(id) {
  const p = reseau.L.proprio[PLACES.indexOf(id)];
  if (p === null) return el('span', { class: 'fh-joueur libre' }, 'libre');
  return el('span', { class: 'fh-joueur', style: `--couleur:${reseau.couleurDe(p)}` }, aMoi(id) ? 'toi' : reseau.nomDe(p));
}

// La fiche de la capacité (#85) : ce qu'elle fait, sans avoir besoin d'une cible. Celle qu'on survole dans la barre,
// sinon celle qu'on a choisie.
const RESULTATS = ['rate', 'eraflure', 'touche', 'critique'];
function pourquoiPas(h, cap) {
  if (cap.slot === 'action' && !h.t.action) return 'Son action est déjà dépensée ce tour.';
  if (cap.slot === 'bonus' && !h.t.bonus) return 'Son action bonus est déjà dépensée ce tour.';
  if (cap.cout && h.res.v < cap.cout) return `Pas assez de ${h.res.type} : ${h.res.v} sur ${cap.cout}.`;
  if (cap.type === 'brasero') return 'Va au contact d’un brasero : il se renverse à portée de main.';
  if (cap.type === 'potion') return h.potion < 1 ? 'Sa potion est déjà bue.' : 'Ses PV sont au maximum.';
  return 'Pas maintenant.';
}
function dessinerFiche(h) {
  const id = ui.capSurvol ?? ui.cap, cap = id ? CAPACITES[id] : null;
  dom.basculeFiche.setAttribute('aria-pressed', String(!ui.ficheCachee)); dom.basculeFiche.textContent = ui.ficheCachee ? 'Fiche : cachée (I)' : 'Fiche (I)';
  if (ui.ficheCachee || !cap || !h || !['heros', 'exploration'].includes(combat.S.phase) || vue.occupe()) { dom.ficheCap.hidden = true; return; }
  const r = resultats(cap), ok = combat.peutUtiliser(h, cap), k = capacitesDe(combat.S, h.type).indexOf(id) + 1;
  dom.ficheCap.dataset.capacite = id;
  dom.ficheCap.replaceChildren(
    el('header', { class: 'fc-tete' },
      el('img', { class: 'fc-icone', src: icone(id), alt: '' }),
      el('h2', {}, cap.nom),
      el('span', { class: `tampon ${cap.slot}` }, cap.slot === 'action' ? 'ACTION' : 'BONUS'),
      el('span', { class: 'fc-carac' }, caracteristiques(cap, h.res.type).map((t) => el('span', { class: 'puce' }, t)))),
    r ? el('div', { class: `fc-resultats n${r.length}` }, r.map((x) => el('div', { class: `fc-res ${x.g}` },
      el('span', { class: 'fc-nom' }, NOM_RESULTAT[x.g]), el('strong', {}, x.degats), el('span', { class: 'fc-d20' }, x.d20)))) : '',   // (replaceChildren écrirait « null »)
    el('div', { class: 'fc-effets' }, effets(cap).map((e) => el('span', { class: `effet ${e.genre}` }, e.texte))),
    el('p', { class: 'fc-aide' }, !ok ? pourquoiPas(h, cap)
      : ui.cap === id ? (cap.type === 'zone' ? 'Clique là où poser la zone.' : cap.type === 'potion' ? '' : 'Clique sur une cible entourée d’or.')
        : `${k ? `Touche ${k} ou clic` : 'Clic'} pour la choisir.${r && !cap.auto ? ` Contre un coriace (Brute ennemie, Chef), l’éraflure va jusqu’à d20 ${12 - cap.mod}.` : ''}`));
  dom.ficheCap.hidden = false;
}

// La carte de la créature survolée : avec une attaque choisie, ses chances et ses dégâts ; sinon, qui elle est.
const etatsDe = (u) => Object.keys(u.st).map((k) => NOM_ETAT[k]).filter(Boolean).concat(u.expose && !u.st.expose ? ['Exposé'] : []);
// les états d'une créature, dans la carte : l'icône, le nom et les tours qui restent, puis ce que l'état fait
function listeEtats(u) {
  const liste = etatsActifs(u);
  if (!liste.length) return null;
  return el('ul', { class: 'cc-etats' }, liste.map((e) => el('li', { class: e.genre, dataset: { etat: e.id } },
    el('img', { src: e.src, alt: '' }),
    el('span', { class: 'cc-etat-nom' }, e.nom, e.n != null ? el('small', {}, ` · encore ${e.n} tour${e.n > 1 ? 's' : ''}`) : null),
    el('span', { class: 'cc-etat-effet' }, e.effet))));
}
function dessinerInfo(info) {
  const d = ui.survol && !vue.occupe() ? vue.sous(ui.survol.x, ui.survol.y) : null, u = d ? combat.U(d) : null;
  if (!u) { dom.info.hidden = true; return; }
  const tete = el('div', { class: 'cc-tete' }, el('strong', {}, u.nom), el('span', {}, `${Math.max(0, u.pv)} / ${u.pvMax} PV`));
  if (info) {
    const cap = CAPACITES[ui.cap];
    dom.info.replaceChildren(tete,
      el('div', { class: 'cc-barre', 'aria-hidden': 'true' }, RESULTATS.map((g) => el('span', { class: g, style: `width:${(info.chances[g] * 100).toFixed(1)}%` }))),
      el('div', { class: 'cc-chances' }, RESULTATS.map((g) => el('span', { class: `cc-ligne ${g}` }, el('span', { class: 'cc-nom' }, NOM_RESULTAT[g]), el('b', {}, pct(info.chances[g])), el('span', {}, info.degats[g])))),
      el('div', { class: 'fc-effets' },
        info.av ? el('span', { class: `effet ${info.av > 0 ? 'magie' : 'feu'}` }, info.av > 0 ? 'Avantage : deux d20, le meilleur' : 'Désavantage : deux d20, le pire') : null,
        info.notes.map((n) => el('span', { class: `effet ${effets({ ds: n })[0]?.genre ?? ''}` }, n[0].toUpperCase() + n.slice(1))),
      ),
      listeEtats(u),
      el('span', { class: 'cc-cap' }, el('img', { src: icone(ui.cap), alt: '' }), cap.nom));
  } else {
    dom.info.replaceChildren(tete,
      el('div', { class: 'cc-jauge' }, el('span', { class: u.camp === 'e' ? 'ennemi' : '', style: `width:${Math.max(0, (u.pv / u.pvMax) * 100)}%` })),
      listeEtats(u),
      el('div', { class: 'cc-role' }, u.camp === 'e' ? `Habitude : ${ENNEMIS[u.type].habitude}${u.coriace ? ' · coriace' : ''}` : u.camp === 'p' ? PNJ[u.type]?.habitude ?? '' : HEROS[u.type].role));
  }
  dom.info.hidden = false;
  // à droite du pointeur, ou à gauche s'il n'y a pas la place
  const w = dom.info.offsetWidth || 240, x = ui.client.x + 18 + w > innerWidth - 8 ? ui.client.x - 18 - w : ui.client.x + 18;
  dom.info.style.left = `${Math.max(8, x)}px`; dom.info.style.top = `${Math.max(8, ui.client.y - 24)}px`;
}

function dessinerTout() {
  const S = combat.S, groupe = S.phase === 'heros' ? combat.groupeCourant()?.ids ?? [] : [];
  dom.etat.textContent = S.phase === 'exploration' ? 'Exploration' : S.phase === 'preparation' ? 'Prêt' : S.phase === 'fini' ? (S.resultat === 'victoire' ? `Victoire au round ${S.round}` : `Défaite au round ${S.round}`)
    : `Round ${S.round} · ${S.phase === 'heros' ? 'phase des héros' : 'phase des ennemis'} · ${S.mode === 'equipe' ? 'tour d’équipe' : 'initiative'}`;
  if (S.phase !== 'heros') dom.chrono.textContent = '';
  // les fiches des héros
  dom.equipe.replaceChildren(...S.heros.map((id) => {
    const u = combat.U(id), H = HEROS[u.type], actif = groupe.includes(id) && !u.ko;
    const etats = etatsDe(u);
    // PV et ressource sur une seule ligne, la jauge dessous (les maquettes)
    return el('button', { type: 'button', class: `fiche-heros plaque${ui.sel === id ? ' choisi' : ''}${u.ko ? ' ko' : ''}${actif ? '' : ' attend'}${aMoi(id) ? '' : ' ami'}`, dataset: { heros: id }, onclick: () => choisirHeros(id) },
      vue.portrait(u.type, 40),
      el('span', { class: 'fh-corps' },
        el('span', { class: 'fh-titre' }, el('strong', {}, H.nom, u.ko ? ' · KO' : ''), reseau ? joueurFiche(id) : null,
          el('span', { class: `fh-potion${u.potion ? '' : ' bue'}`, title: u.potion ? 'Sa potion' : 'Potion bue' }, el('img', { src: icone('potion'), alt: u.potion ? 'potion' : 'potion bue' }))),
        el('span', { class: 'fh-chiffres' }, el('span', {}, `${Math.max(0, u.pv)} / ${u.pvMax} PV`), el('span', { class: `fh-res ${u.res.type}` }, `${u.res.type} ${u.res.v}/${u.res.max}`)),
        el('span', { class: 'jauge' }, el('span', { class: u.pv <= u.pvMax * 0.3 ? 'bas' : '', style: `width:${Math.max(0, (u.pv / u.pvMax) * 100)}%` })),
        el('span', { class: 'fh-ligne' }, actif ? `${metres(u.t.mv)} / ${metres(u.vitesse)} m · ${u.t.action ? 'action' : '—'} · ${u.t.bonus ? 'bonus' : '—'}` : `${metres(u.vitesse)} m par tour`),
        etats.length ? el('span', { class: 'fh-etats' }, etats.join(' · ')) : null));
  }));
  // la barre des capacités : l'icône, le nom, action ou bonus, les dégâts d'un touché (ou ce qu'elle fait), la touche
  const h = herosChoisi();
  dom.capacites.replaceChildren(...(h && ['heros', 'exploration'].includes(S.phase) ? capacitesDe(S, h.type).map((id, k) => {
    const c = CAPACITES[id], ok = combat.peutUtiliser(h, c);
    const survol = (oui) => () => { if (oui ? ui.capSurvol !== id : ui.capSurvol === id) { ui.capSurvol = oui ? id : null; ui.sale = true; } };
    return el('button', { type: 'button', class: `capacite ${c.slot}${ui.cap === id ? ' choisie' : ''}${ok ? '' : ' indispo'}`, 'aria-disabled': ok ? null : 'true',
      dataset: { capacite: id }, onclick: () => choisirCapacite(id), onmouseenter: survol(true), onmouseleave: survol(false), onfocus: survol(true), onblur: survol(false) },
    el('span', { class: 'cap-icone' }, el('img', { src: icone(id), alt: '' }), TAMPONS[id] ? el('span', { class: 'cap-tampon' }, TAMPONS[id]) : null),
    el('span', { class: 'cap-texte' }, el('span', { class: 'cap-nom' }, c.nom),
      el('span', { class: 'cap-slot' }, el('span', { class: `tampon ${c.slot}` }, c.slot === 'action' ? 'ACT' : 'BONUS'), el('span', { class: 'cap-resume' }, resume(c)))),
    el('kbd', {}, String(k + 1)));
  }) : [el('span', { class: 'muet' }, S.phase === 'heros' ? 'Choisis un héros.' : S.phase === 'ennemis' ? 'Les ennemis jouent…' : '')]));
  const n = dom.capacites.children.length;
  dom.capacites.style.setProperty('--col', n <= 5 ? n : Math.ceil(n / 2));
  dom.finPhase.disabled = S.phase !== 'heros' || vue.occupe();
  dom.annuler.disabled = !ui.annuler.length || vue.occupe();
  dom.annuler.hidden = !!reseau;          // (à plusieurs, pas d'annulation : les autres ont peut-être déjà joué)
  dom.finPhase.classList.toggle('pret', !!reseau?.estPret());
  if (!reseau) dom.finPhase.textContent = 'Fin de la phase des héros';
  else {
    const attendus = reseau.attendus(), prets = attendus.filter((p) => reseau.L.pret.includes(p)).length, moi = attendus.includes(reseau.moi);
    dom.finPhase.disabled = S.phase !== 'heros' || !moi;
    dom.finPhase.textContent = S.phase !== 'heros' ? 'Fin de la phase des héros' : !moi ? `Les autres jouent (${prets}/${attendus.length} prêts)`
      : reseau.estPret() ? `Prêt ✓ (${prets}/${attendus.length}) : je rejoue` : `Je suis prêt (${prets}/${attendus.length})`;
  }
  // le journal : les 6 dernières lignes, ou les 60 dernières une fois déplié
  dom.journal.replaceChildren(...S.journal.slice(0, ui.journalTout ? 60 : 6).map((l) => el('li', { class: l.c }, l.t)));
  dom.coin.hidden = S.phase === 'preparation';
}
function basculerFiche(oui = ui.ficheCachee) {   // oui : la montrer
  ui.ficheCachee = !oui;
  try { localStorage.setItem(CLE_FICHE, ui.ficheCachee ? 'cachee' : 'montree'); } catch {}
  banniere(`Fiche de la capacité : ${ui.ficheCachee ? 'cachée' : 'montrée'} (I)`);
  ui.sale = true;
}
function basculerJournal() {
  ui.journalTout = !ui.journalTout;
  dom.journalCadre.classList.toggle('deplie', ui.journalTout);
  dom.journalTout.textContent = ui.journalTout ? 'Moins' : 'Tout';
  dom.journalTout.setAttribute('aria-expanded', String(ui.journalTout));
  ui.sale = true;
}

// --- Le d20 en grand, les bannières, la fin ------------------------------------------------------------------------
let minuterieDe = 0, minuterieBanniere = 0;
function montrerDe(e) {
  const qui = combat.U(e.de);
  const res = e.fouille ? (e.piege ? (e.ok ? 'Désamorcé !' : 'Le piège claque !') : e.persuasion ? (e.ok ? 'Ils acceptent' : 'Ils refusent') : e.ok ? 'Trouvé !' : 'Rien') : e.glace ? (e.resultat === 'glisse' ? 'glisse : À terre' : 'tient debout') : NOM_RESULTAT[e.resultat];
  dom.de.className = `de-grand ${e.fouille ? (e.ok ? 'touche' : 'rate') : e.glace ? (e.resultat === 'glisse' ? 'rate' : 'touche') : e.resultat}${qui?.camp === 'e' ? ' ennemi' : ''}`;
  dom.de.replaceChildren(
    el('span', { class: 'de-qui' }, qui?.nom ?? ''),
    el('span', { class: 'des' }, e.jets.map((j) => el('span', { class: `face${e.jets.length > 1 && j !== e.k ? ' ecarte' : ''}` }, String(j)))),
    el('span', { class: 'calcul' }, e.mod != null ? `${e.k} + ${e.mod} = ${e.k + e.mod}` : e.fouille ? (e.borne ? `la vieille borne : d20 ${e.k}` : e.piege ? `prudence : d20 ${e.k}` : e.persuasion ? `persuasion : d20 ${e.k}` : `perception : d20 ${e.k}`) : e.glace ? `glace : d20 ${e.k}` : 'critique assuré'),
    el('strong', { class: 'resultat' }, res));
  dom.de.hidden = false;
  clearTimeout(minuterieDe); minuterieDe = setTimeout(() => { dom.de.hidden = true; }, 1500);
}
// Un objet du combat : au contact, on l'actionne (l'action du héros) ; sinon on y va (en exploration) ou l'on dit pourquoi pas.
function actionnerLevier(h, l) {
  if (dist(h, l) <= CONTACT + 0.8) {
    if (reseau) { banniere('À plusieurs : bientôt'); return true; }
    if (combat.actionner(h, l.id)) { ui.cap = null; ui.portee = null; ui.annuler = []; vider(); }
    else banniere(combat.S.phase === 'heros' && !h.t.action ? 'Son action est déjà dépensée' : 'Pas maintenant');
    return true;
  }
  if (combat.S.phase === 'exploration') { const d = dist(h, l), q = { x: l.x + ((h.x - l.x) / d) * 1.3, y: l.y + ((h.y - l.y) / d) * 1.3 }; explorerVers(h, q); return true; }
  return false;
}
// --- Le début et la fin d'un combat (le retour du propriétaire, 23 oct : « que le joueur comprenne ce qu'il se passe ») -------
const TITRES = () => cine?.donnees?.combats ?? {};
function objectifDe(g) {
  const c = combat.S.combats[g ?? 'principal'] ?? {}, b = c.but ?? {};
  if (c.objectif === 'proteger') return `Protéger ${combat.U(b.pnj)?.nom ?? 'le PNJ'} pendant ${b.tours} tours`;
  if (c.objectif === 'vaincre-chef') return combat.S.unites.some((u) => u.groupe === g && ENNEMIS[u.type]?.rang === 'boss') ? 'Vaincre le gardien : les autres fuiront' : 'Vaincre le chef : les autres fuiront';
  return 'Vaincre tous les ennemis';
}
function debutCombat(e) {
  const g = combat.S.groupeActif, ennemis = combat.ennemisVivants();
  ui.combosDebut = combat.S.stats.combos.length;
  vue.exclamer(ennemis.map((u) => u.id));
  const centre = ennemis.length ? { x: ennemis.reduce((s, u) => s + u.x, 0) / ennemis.length, y: ennemis.reduce((s, u) => s + u.y, 0) / ennemis.length } : null;
  const brasero = centre ? combat.S.braseros.filter((b) => !b.renverse).sort((a, b) => dist(a, centre) - dist(b, centre))[0] : null;
  const carte = () => carteCombat(g, e.surprise);
  if (cine && TITRES()[g]?.scene) cine.jouer(TITRES()[g].scene, { ennemis: centre, brasero, voie: combat.S.voie }).then(carte); else carte();
}
function carteCombat(g, surprise) {
  const t = el('div', { class: `carte-combat${surprise ? ' surprise' : ''}`, role: 'status' },
    el('strong', {}, 'Combat !'),
    el('span', { class: 'cc-titre' }, TITRES()[g]?.titre ?? ''),
    el('span', { class: 'cc-objectif' }, `Objectif : ${objectifDe(g)}`),
    surprise ? el('span', { class: 'cc-surprise' }, 'Surprise : les ennemis passent leur premier tour') : el('span', { class: 'cc-surprise vu' }, 'Repérés : les ennemis jouent normalement'));
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}
function carteVictoire(g, n) {
  const combos = combat.S.stats.combos.length - (ui.combosDebut ?? 0);
  const chiffre = el('b', {}, '+0');
  const t = el('div', { class: 'carte-victoire', role: 'status', onclick: () => t.remove() },
    el('strong', {}, 'Victoire !'),
    el('span', { class: 'cc-titre' }, TITRES()[g]?.titre ?? ''),
    el('span', { class: 'cv-gain' }, chiffre, ' Caillasse'),
    el('span', { class: 'cv-combos' }, combos ? `${combos} combo${combos > 1 ? 's' : ''} pendant ce combat` : 'Aucun combo : la prochaine fois, à deux !'),
    el('span', { class: 'cv-suite' }, 'La route continue…'));
  document.body.append(t);
  let k = 0; const pas = setInterval(() => { k = Math.min(n, k + Math.max(1, Math.ceil(n / 25))); chiffre.textContent = `+${k}`; if (k >= n) clearInterval(pas); }, 40);
  setTimeout(() => t.remove(), 3200);
}
// Le compteur de Caillasse (en haut) : il monte jusqu'au vrai compte ; chaque gain s'envole vers lui
function compterCaillasse() {
  if (!ui.aventure) return;
  dom.caillasse.hidden = false;
  const vrai = combat.S.caillasse;
  if (ui.cv == null) ui.cv = vrai;
  if (ui.cv !== vrai) {
    if (vrai > ui.cv && !ui.envol) {
      const r = dom.caillasse.getBoundingClientRect(), f = el('span', { class: 'gain-caillasse' }, `+${vrai - ui.cv}`);
      f.style.left = `${r.left + r.width / 2}px`; f.style.top = `${r.bottom + 4}px`;
      document.body.append(f); ui.envol = true; setTimeout(() => { f.remove(); ui.envol = false; }, 1100);
    }
    ui.cv += Math.sign(vrai - ui.cv) * Math.max(1, Math.floor(Math.abs(vrai - ui.cv) / 8));
    dom.caillasse.classList.add('gagne'); clearTimeout(ui.minCv); ui.minCv = setTimeout(() => dom.caillasse.classList.remove('gagne'), 400);
  }
  dom.caillasseN.textContent = String(ui.cv);
  const S = combat.S;
  dom.emporte.hidden = !S.relances && !S.tonneauxPortes;
  dom.relance.hidden = !S.relances; dom.relance.textContent = `Relance ×${S.relances}`;
  dom.poserTonneau.hidden = !S.tonneauxPortes; dom.poserTonneau.textContent = `Poser le tonneau${S.tonneauxPortes > 1 ? ` (×${S.tonneauxPortes})` : ''}`;
  dom.poserTonneau.disabled = S.phase !== 'exploration';
}
// Le combo : un éclair doré sur tout l'écran, et un tampon « COMBO ! » à l'impact, avec les deux héros et le nom du combo.
function tamponCombo(e) {
  const A = combat.U(e.a), B = combat.U(e.b);
  const flash = el('div', { class: 'flash-combo', 'aria-hidden': 'true' });
  const t = el('div', { class: 'tampon-combo', role: 'status' },
    el('strong', {}, 'COMBO !'),
    el('span', { class: 'tc-heros' }, A ? vue.portrait(A.type, 36) : '', el('span', { class: 'tc-fleche' }, '→'), B ? vue.portrait(B.type, 36) : ''),
    el('span', { class: 'tc-quoi' }, `${A?.nom ?? ''} prépare, ${B?.nom ?? ''} exploite : ${e.quoi}`));
  if (e.ecran) { t.style.left = `${Math.max(160, Math.min(innerWidth - 160, e.ecran.x))}px`; t.style.top = `${Math.max(90, Math.min(innerHeight - 220, e.ecran.y))}px`; }
  document.body.append(flash, t);
  setTimeout(() => flash.remove(), 500); setTimeout(() => t.remove(), 1900);
}
function banniere(texte, genre = '') {
  if (cine?.actif()) return;
  dom.banniere.textContent = texte; dom.banniere.className = `banniere-terrain ${genre}`; dom.banniere.hidden = false;
  clearTimeout(minuterieBanniere); minuterieBanniere = setTimeout(() => { dom.banniere.hidden = true; }, 1300);
}
// Une aventure : la victoire rend la route (la Caillasse, puis l'exploration) ; la défaite ramène au début du chemin.
function finAventure() {
  if (combat.S.resultat === 'victoire') {
    const g = combat.S.groupeActif ?? 'principal';
    const n = combat.reprendre();
    carteVictoire(g, n);
    if (cine && g === 'porte') setTimeout(() => cine.jouer('porte-ouverte', {}), 3300);
    Object.assign(ui, { fini: false, finMontree: false, cap: null, portee: null, annuler: [] });
    ui.sel = combat.S.heros.find((id) => !combat.U(id).ko && aMoi(id)) ?? null;
    vider();
    return;
  }
  const noir = el('div', { class: 'fondu-defaite' });
  document.body.append(noir);
  setTimeout(() => { dom.defaite.hidden = false; noir.remove(); }, 1400);
}
function recommencerChemin() {         // un nouveau lancer de dé, au début du chemin (sans la graine de la partie perdue)
  const q = new URLSearchParams(location.search);
  q.delete('mot');
  location.search = q.toString();
}
function montrerFin(enCours) {
  const S = combat.S;
  dom.rejouer.disabled = !!reseau && !reseau.hote;
  dom.rejouer.title = dom.rejouer.disabled ? 'L’hôte relance le combat pour tout le groupe' : '';
  dom.finTitre.textContent = S.resultat === 'victoire' ? `Victoire au round ${S.round} !` : S.resultat === 'defaite' ? `Défaite au round ${S.round}` : 'La fiche de mesure (combat en cours)';
  dom.continuer.hidden = !enCours || !!S.resultat;
  dom.fiche.textContent = combat.fiche(notes());
  dom.fin.hidden = false;
}
async function copier() {
  const texte = combat.fiche(notes());
  try { await navigator.clipboard.writeText(texte); banniere('Fiche copiée'); } catch { banniere('Copie impossible : sélectionne le texte'); }
}

export function dispose() { window.removeEventListener('keydown', clavier); }

// Un autre combat (main.js) : on oublie la sélection, la fin, l'annulation.
export function remplacer(c) {
  combat = c;
  Object.assign(ui, { sel: null, cap: null, annuler: [], portee: null, fini: false, finMontree: false, sale: true });
}
// Ce que mon pointeur montre aux amis (multi.js) : où il est, mon héros, ma capacité et ma cible (en numéros).
function pointeur() {
  const h = herosChoisi(), caps = h ? capacitesDe(combat.S, h.type) : [], vise = vue.marques.survolCible;
  return { x: ui.survol?.x ?? -1, y: ui.survol?.y ?? -1, h: h ? PLACES.indexOf(h.id) + 1 : 0, c: ui.cap ? caps.indexOf(ui.cap) + 1 : 0,
    v: vise ? combat.S.unites.findIndex((u) => u.id === vise) + 1 : 0 };
}

export const api = {
  basculerFiche, ui, dom, majCurseur, finAventure, demanderChemin, demanderIncident, commencer, choisirHeros, choisirCapacite, cliquer, finPhase, annuler, montrerFin, remplacer, pointeur, banniere, accueil, lance, rejouer,
  get selection() { return ui.sel; },
  get reseau() { return reseau; },
  // multi.js : à plusieurs, puis de nouveau seul (l'hôte est parti : tous les héros sont à moi)
  brancher(r) { reseau = r; dessinerPlaces(); ui.sale = true; },
  debrancher(texte) {
    reseau = null;
    if (texte) banniere(texte);
    if (combat.S.phase === 'heros' && !ui.sel) ui.sel = combat.groupeCourant()?.ids.find((id) => !combat.U(id).ko) ?? null;
    dessinerPlaces(); ui.sale = true;
  },
  redessiner() { if (!dom.accueil.hidden) dessinerPlaces(); ui.sale = true; },
  etatRecu() { ui.portee = null; ui.sale = true; if (ui.sel && !combat.U(ui.sel)) ui.sel = null; },
};
