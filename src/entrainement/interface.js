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
import { CAPACITES, HEROS, ENNEMIS, NOM_ETAT, NOM_RESULTAT, CLASSES_ESSAI, EQUIPE_KIT, PLACES, FAMILIERS, equipeDepuis, equipePour, classesPour } from './regles.js';
import { monGithub } from './joueur.js';
import { CONTACT, metres } from './geometrie.js';
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

let game, combat, vue, canvas, nouveauCombat, reseau = null;
const ui = { sel: null, cap: null, capSurvol: null, survol: null, annuler: [], portee: null, fini: false, sale: true, horloge: Date.now };
const dom = {};

export function init(g, options) {
  game = g;
  ({ combat, vue, canvas, nouveauCombat } = options);
  if (options.horloge) ui.horloge = options.horloge;
  // l'équipe à choisir : celle de l'adresse (?equipe=), sinon la dernière choisie dans ce navigateur, sinon le kit D1
  ui.choix = equipePour(new URLSearchParams(location.search).has('equipe') ? combat.S.equipe : lireChoix() ?? combat.S.equipe, monGithub());
  construire();
  if (options.mode === 'initiative') dom.accueil.querySelector('input[value=initiative]').checked = true;
  if (options.demarrer) commencer();
  vue.surEvenement(surEvenement);
  canvas.addEventListener('pointermove', (e) => { ui.survol = vue.versMonde(e.clientX, e.clientY); ui.client = { x: e.clientX, y: e.clientY }; ui.capSurvol = null; ui.sale = true; });
  canvas.addEventListener('pointerleave', () => { ui.survol = null; ui.sale = true; });
  canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) cliquer(vue.versMonde(e.clientX, e.clientY)); else if (e.button === 2) choisirCapacite(null); });
  window.addEventListener('keydown', clavier);
  return api;
}

// --- La page ----------------------------------------------------------------------------------------------------
function construire() {
  dom.haut = el('header', { class: 'haut-terrain plaque' },
    el('strong', { class: 'titre-terrain' }, 'Terrain d’entraînement'),
    dom.etat = el('span', { class: 'etat-terrain' }, 'Prêt'),
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
    // l'action commune de tous les héros (#231) : partir du contact sans attaque d'opportunité, pour son action bonus
    dom.desengager = el('button', { type: 'button', class: 'bouton-jeu discret', id: 'desengager', onclick: () => desengager(), title: 'Action bonus : ce tour-ci, il s’éloigne sans attaque d’opportunité (touche D)' }, el('img', { class: 'bouton-icone', src: icone('desengager'), alt: '' }), 'Se désengager (D)'),
    dom.finPhase = el('button', { type: 'button', class: 'bouton-jeu', id: 'fin-phase', onclick: finPhase }, 'Fin de la phase des héros'));
  // en bas : la fiche de la capacité (choisie, ou survolée dans la barre), au-dessus de la barre des capacités
  dom.bas = el('div', { class: 'bas-terrain' },
    dom.ficheCap = el('section', { class: 'fiche-capacite bois', hidden: true, 'aria-live': 'polite' }),
    dom.barre = el('nav', { class: 'barre-terrain bois', 'aria-label': 'Les capacités du héros choisi' }, dom.capacites = el('div', { class: 'capacites' })));
  dom.de = el('div', { class: 'de-grand', hidden: true, 'aria-live': 'polite' });
  dom.banniere = el('div', { class: 'banniere-terrain', hidden: true });
  dom.info = el('div', { class: 'carte-cible bois', hidden: true });
  dom.distance = el('div', { class: 'distance-survol', hidden: true });
  dom.aide = el('p', { class: 'aide-terrain plaque' }, 'Clic : choisir, marcher, viser · ', el('kbd', {}, '1'), '–', el('kbd', {}, '9'), ' capacités · ',
    el('kbd', {}, 'Tab'), ' héros suivant · ', el('kbd', {}, 'Échap'), ' annuler · ', el('kbd', {}, 'V'), ' vie des ennemis · ', el('kbd', {}, 'Maj'), '+', el('kbd', {}, 'V'),
    ' des alliés · molette : zoom · clic droit glissé : la vue');
  dom.accueil = el('div', { class: 'fond-terrain', id: 'accueil' }, el('section', { class: 'cadre-terrain' },
    el('h1', {}, 'Le terrain d’entraînement'),
    el('p', {}, 'Le combat D1 du kit papier (la Salle d’essai de Fraps), joué ', el('strong', {}, 'sans cases'),
      ' : chaque classe a une distance maximale par tour, en mètres, et la salle est cinq fois plus grande (36 × 24 m). L’eau de l’étang est profonde : on n’y marche pas. Le fossé au sud remplace la corniche.'),
    dom.groupe = el('div', { class: 'groupe-lobby', hidden: true, 'aria-live': 'polite' }),
    dom.titreEquipe = el('h2', {}, 'Ton équipe : choisis la classe de chacun'),
    el('p', { class: 'muet' }, 'Les 4 héros du kit D1, des classes d’essai (marquées « essai » : faites au budget de la fiche de classe, pour tester), et les vraies classes de chacun dès que leurs règles sont écrites (le Traqueur de Paolitus, Shadow de Fraps : chacune ne se joue que par son auteur). ◀ ▶ pour changer.'),
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
  document.body.append(dom.haut, dom.equipe, dom.droite, dom.bas, dom.coin, dom.de, dom.banniere, dom.info, dom.distance, dom.aide, dom.accueil, dom.fin);
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
  // (seulement les classes que je peux jouer : celle d'un autre joueur n'est qu'à lui)
  const liste = classesPour(monGithub()), i = liste.indexOf(equipeAffichee()[k]);
  const type = liste[i < 0 ? (sens > 0 ? 0 : liste.length - 1) : (i + sens + liste.length) % liste.length];
  if (reseau) return void reseau.classe(k, type);
  ui.choix[k] = type;
  dessinerPlaces();
}
// à plusieurs : ma place, ou une place libre pour l'hôte (celle d'un ami, non)
const peutRegler = (k) => !reseau || reseau.L.proprio[k] === reseau.moi || (reseau.hote && reseau.L.proprio[k] === null);
function auHasard() {
  const melange = classesPour(monGithub()).sort(() => Math.random() - 0.5);
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
  if (e.type === 'de') montrerDe(e);
  else if (e.type === 'combo') banniere(`Combo ! ${combat.U(e.a)?.nom} → ${combat.U(e.b)?.nom} : ${e.quoi}`, 'combo');
  else if (e.type === 'round') banniere(`Round ${e.r}`);
  else if (e.type === 'phase' && e.phase === 'ennemis') banniere('Les ennemis jouent', 'ennemi');
  else if (e.type === 'phase' && e.phase === 'heros') {
    banniere('À vous', 'heros');
    ui.sel = e.ids.map((id) => combat.U(id)).find((u) => !u.ko && aMoi(u.id))?.id ?? null; ui.cap = null; ui.portee = null; ui.annuler = [];
  } else if (e.type === 'fin') ui.fini = true;
  else if (e.type === 'eclair') banniere('L’eau est électrisée !', 'combo');
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
  if (id && (!h || !utilisable(h, CAPACITES[id]))) return false;
  ui.cap = id && ui.cap !== id ? id : null;
  // une capacité sans cible (la potion) se lance tout de suite
  if (ui.cap && CAPACITES[ui.cap].type === 'potion') { agir({}); return true; }
  ui.sale = true;
  return true;
}
// Se désengager (#231) : l'action commune, sans cible, pour le héros choisi
function desengager() {
  const h = herosChoisi();
  if (!h || vue.occupe() || !utilisable(h, CAPACITES.desengager)) return false;
  ui.cap = 'desengager';
  return agir({});
}
function agir(cible) {
  const h = herosChoisi(); if (!h || !ui.cap) return false;
  if (reseau) { reseau.agir({ type: 'capacite', id: h.id, cap: ui.cap, cible }); ui.cap = null; ui.portee = null; ui.sale = true; return true; }
  const ok = combat.utiliser(h, ui.cap, cible);
  if (ok) { ui.cap = null; ui.annuler = []; ui.portee = null; vider(); }
  return ok;
}
function cliquer(p) {
  if (vue.occupe() || ui.fini || combat.S.phase !== 'heros') return;
  const h = herosChoisi(), dessous = vue.sous(p.x, p.y);
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
  if (evs.some((e) => e.type === 'de' || e.type === 'attaque')) ui.annuler = []; else ui.annuler.push(copie);   // sur la glace, ou une attaque d'opportunité : le dé a parlé, pas d'annulation
  ui.portee = null;
  vider();
}
function clavier(e) {
  if (e.target.closest?.('input, textarea')) return;
  if (e.key === 'Escape') { if (ui.cap) choisirCapacite(null); else if (!dom.fin.hidden && !ui.fini) dom.fin.hidden = true; return; }
  if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey && !e.altKey) { desengager(); return; }
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
  if (n >= 1 && n <= 9 && h) { const id = HEROS[h.type].capacites[n - 1]; if (id) choisirCapacite(id); }
}
function portee(h) { if (!ui.portee || ui.portee.id !== h.id || ui.portee.mv !== h.t.mv || ui.portee.x !== h.x || ui.portee.y !== h.y) ui.portee = { id: h.id, mv: h.t.mv, x: h.x, y: h.y, P: combat.portee(h) }; return ui.portee.P; }

// --- Chaque image : les marques, l'aperçu, les fiches -------------------------------------------------------------
export function update() {
  majCurseur();
  const libre = !vue.occupe();
  if (libre && ui.etaitOccupe) ui.sale = true;          // la file vient de finir : on redessine (boutons, zone de marche)
  ui.etaitOccupe = !libre;
  if (combat.S.phase === 'heros' && combat.S.debutPhase) dom.chrono.textContent = `phase des héros ${duree(ui.horloge() - combat.S.debutPhase)}`;
  if (ui.fini && libre && dom.fin.hidden && !ui.finMontree) { ui.finMontree = true; montrerFin(false); }
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
      m.portee = portee(h).carte; m.mv = h.t.mv;
      if (ui.survol && !vue.sous(ui.survol.x, ui.survol.y)) {
        const a = combat.apercuMarche(h, ui.survol.x, ui.survol.y, portee(h));
        if (a.pts.length) {
          // une attaque d'opportunité sur ce chemin (#231) : il passe en rouge, et dit qui frappera, ses chances et ses dégâts
          m.chemin = a.pts; m.cheminOk = a.ok; m.cheminDanger = a.ok && a.menaces.length > 0;
          const menaces = a.ok ? a.menaces.map((x) => `${x.nom} (${Math.round(x.touche * 100)} % · ${x.degats})`).join(', ') : '';
          dom.distance.hidden = false; dom.distance.classList.toggle('danger', !!menaces);
          dom.distance.textContent = `${metres(a.longueur)} m${a.ok ? '' : ' : trop loin'}${menaces ? ` · attaque d’opportunité : ${menaces}` : ''}`;
          dom.distance.style.left = `${ui.client.x + 14}px`; dom.distance.style.top = `${ui.client.y + 12}px`;
        }
      }
    }
  }
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
// Le Pas dans l’ombre de Shadow n’a de sens qu’avec un ennemi tenu par un allié : sans cible, on le montre indisponible.
const sansCible = (h, cap) => cap.type === 'ombre' && !combat.cibles(h, cap).length;
const utilisable = (h, cap) => combat.peutUtiliser(h, cap) && !sansCible(h, cap);
function pourquoiPas(h, cap) {
  if (cap.slot === 'action' && !h.t.action) return 'Son action est déjà dépensée ce tour.';
  if (cap.slot === 'bonus' && !h.t.bonus) return 'Son action bonus est déjà dépensée ce tour.';
  if (cap.type === 'ombre' && combat.trahiParLaLumiere(h)) return 'La lumière le trahit : Brûlant ou dans le feu, pas de Pas dans l’ombre.';
  if (cap.cout && h.res.v < cap.cout) return `Pas assez ${/^[AEIOUÉ]/.test(h.res.type) ? 'd’' : 'de '}${h.res.type} : ${h.res.v} sur ${cap.cout}.`;
  if (sansCible(h, cap)) return 'Aucun ennemi à 7,5 m qu’un allié serre à 4,5 m.';
  if (cap.type === 'potion') return h.potion < 1 ? 'Sa potion est déjà bue.' : 'Ses PV sont au maximum.';
  return 'Pas maintenant.';
}
// la tête tient sur une ligne : sans « Sans coût », et la poussée (ou l’attraction) passe aux effets, où elle est souvent déjà
const puces = (cap, ressource) => caracteristiques(cap, ressource).filter((t) => t !== 'Sans coût' && !/^(Pousse|Attire) de /.test(t));
function effetsFiche(cap) {
  const liste = effets(cap).map((e) => (/^[\d,]+ m$/.test(e.texte) ? { ...e, texte: `Pousse de ${e.texte}` } : e));
  if (cap.longueur && !liste.some((e) => /pousse|attire/i.test(e.texte))) liste.unshift({ texte: `${cap.type === 'attraction' ? 'Attire' : 'Pousse'} de ${metres(cap.longueur)} m`, genre: '' });
  return liste;
}
function dessinerFiche(h) {
  const id = ui.capSurvol ?? ui.cap, cap = id ? CAPACITES[id] : null;
  if (!cap || !h || combat.S.phase !== 'heros' || vue.occupe()) { dom.ficheCap.hidden = true; return; }
  const r = resultats(cap), ok = utilisable(h, cap);
  const refus = ok ? null : el('span', { class: 'effet refus' }, pourquoiPas(h, cap));
  dom.ficheCap.dataset.capacite = id;
  dom.ficheCap.replaceChildren(
    el('header', { class: 'fc-tete' },
      el('img', { class: 'fc-icone', src: icone(id), alt: '' }),
      el('h2', {}, cap.nom),
      el('span', { class: `tampon ${cap.slot}` }, cap.slot === 'action' ? 'ACTION' : 'BONUS'),
      el('span', { class: 'fc-carac' }, puces(cap, h.res.type).map((t) => el('span', { class: 'puce' }, t)))),
    r ? el('div', { class: `fc-resultats n${r.length}` }, r.map((x) => el('div', { class: `fc-res ${x.g}` },
      el('span', { class: 'fc-nom' }, NOM_RESULTAT[x.g]), el('strong', {}, x.degats), el('span', { class: 'fc-d20' }, x.d20))))
      : refus ? el('div', { class: 'fc-effets' }, refus) : '',
    // pas d’aide en dessous (la touche est sur le bouton, les chances contre un coriace dans la carte de la cible) : la fiche
    // garde la même hauteur ; quand la capacité est indisponible, la raison passe en tête des effets (ou à la place des
    // résultats, pour une capacité sans dégâts)
    el('div', { class: 'fc-effets' }, r ? refus : null,
      effetsFiche(cap).map((e) => el('span', { class: `effet ${e.genre}` }, e.texte))));
  dom.ficheCap.hidden = false;
}

// La carte de la créature survolée : avec une attaque choisie, ses chances et ses dégâts ; sinon, qui elle est.
const etatsDe = (u) => Object.keys(u.st).map((k) => NOM_ETAT[k]).filter(Boolean).concat(u.expose && !u.st.expose ? ['Exposé'] : []);
// les états d'une créature, dans la carte : l'icône, le nom et les tours qui restent, puis ce que l'état fait
function listeEtats(u) {
  const liste = etatsActifs(u);
  if (!liste.length) return '';          // (replaceChildren écrirait « null »)
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
      el('div', { class: 'cc-role' }, u.camp === 'e' ? `Habitude : ${ENNEMIS[u.type].habitude}${u.coriace ? ' · coriace' : ''}` : (HEROS[u.type] ?? FAMILIERS[u.type]).role));
  }
  dom.info.hidden = false;
  // à droite du pointeur, ou à gauche s'il n'y a pas la place
  const w = dom.info.offsetWidth || 240, x = ui.client.x + 18 + w > innerWidth - 8 ? ui.client.x - 18 - w : ui.client.x + 18;
  dom.info.style.left = `${Math.max(8, x)}px`; dom.info.style.top = `${Math.max(8, ui.client.y - 24)}px`;
}

function dessinerTout() {
  const S = combat.S, groupe = S.phase === 'heros' ? combat.groupeCourant()?.ids ?? [] : [];
  dom.etat.textContent = S.phase === 'preparation' ? 'Prêt' : S.phase === 'fini' ? (S.resultat === 'victoire' ? `Victoire au round ${S.round}` : `Défaite au round ${S.round}`)
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
  dom.capacites.replaceChildren(...(h && S.phase === 'heros' ? HEROS[h.type].capacites.map((id, k) => {
    const c = CAPACITES[id], ok = utilisable(h, c);
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
  { const h = herosChoisi(); dom.desengager.disabled = !h || vue.occupe() || !utilisable(h, CAPACITES.desengager); }
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
  const res = e.glace ? (e.resultat === 'glisse' ? 'glisse : À terre' : 'tient debout') : NOM_RESULTAT[e.resultat];
  dom.de.className = `de-grand ${e.glace ? (e.resultat === 'glisse' ? 'rate' : 'touche') : e.resultat}${qui?.camp === 'e' ? ' ennemi' : ''}`;
  dom.de.replaceChildren(
    el('span', { class: 'de-qui' }, qui?.nom ?? ''),
    el('span', { class: 'des' }, e.jets.map((j) => el('span', { class: `face${e.jets.length > 1 && j !== e.k ? ' ecarte' : ''}` }, String(j)))),
    el('span', { class: 'calcul' }, e.mod != null ? `${e.k} + ${e.mod} = ${e.k + e.mod}` : e.glace ? `glace : d20 ${e.k}` : 'critique assuré'),
    el('strong', { class: 'resultat' }, res));
  dom.de.hidden = false;
  clearTimeout(minuterieDe); minuterieDe = setTimeout(() => { dom.de.hidden = true; }, 1500);
}
function banniere(texte, genre = '') {
  dom.banniere.textContent = texte; dom.banniere.className = `banniere-terrain ${genre}`; dom.banniere.hidden = false;
  clearTimeout(minuterieBanniere); minuterieBanniere = setTimeout(() => { dom.banniere.hidden = true; }, 1300);
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
  const h = herosChoisi(), caps = h ? HEROS[h.type].capacites : [], vise = vue.marques.survolCible;
  return { x: ui.survol?.x ?? -1, y: ui.survol?.y ?? -1, h: h ? PLACES.indexOf(h.id) + 1 : 0, c: ui.cap ? caps.indexOf(ui.cap) + 1 : 0,
    v: vise ? combat.S.unites.findIndex((u) => u.id === vise) + 1 : 0 };
}

export const api = {
  ui, dom, majCurseur, commencer, choisirHeros, choisirCapacite, cliquer, finPhase, annuler, montrerFin, remplacer, pointeur, banniere, accueil, lance, rejouer,
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
