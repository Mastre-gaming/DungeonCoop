// Les règles du combat du terrain d'entraînement : celles de la Salle d'essai de Fraps (design/combat-d1/salle-d1.html,
// d'après PAPER_FIGHT_KIT.fr.md et FIGHT_RULES.md), reprises une à une, mais sans cases (FIGHT_RULES « On trial ») :
// les distances sont en cases de 1,5 m, libres, et la géométrie vient de geometrie.js.
//
// Ce module ne dessine rien : il change l'état et publie des événements (S.evenements) que la vue joue ensuite,
// dans l'ordre (une marche, une attaque et son dé, des dégâts…). Un combat entier peut donc se jouer d'un trait (?test).
// Le hasard passe par `alea` (une graine en ?test, pour que tout se rejoue pareil).
import {
  CONTACT, ECART_MIN, dist, metres, vue, voit, enTenaille, carteDistances, chemin, longueurChemin, indiceDe, pointDe,
  libre, simulerPoussee, pointLibreProche, trajetLibre, ajouterObstacle, retirerObstacle, dansForme,
} from './geometrie.js';

// --- Les classes d'essai (niveau 1, « uniquement pour ce test ») et les ennemis du kit ------------------------------
// Les 4 premières sont les héros du kit D1 ; les 4 suivantes, des classes d'essai faites au budget de
// CLASS_TEMPLATE.fr.md (mission #76, fiches dans design/terrain-entrainement/CLASSES_ESSAI.fr.md).
// Les vraies classes restent celles de chacun (missions #30 à #33).
export const EQUIPE_KIT = ['brute', 'mage', 'voleur', 'gardien'];
export const CLASSES_ESSAI = ['brute', 'mage', 'voleur', 'gardien', 'eclaireuse', 'chevalier', 'druide', 'barde'];
export const PLACES = ['h1', 'h2', 'h3', 'h4'];            // les 4 héros : une place, une classe choisie à l'entrée
// « brute,chevalier,druide,barde » (l'adresse : ?equipe=…) → une équipe valable de 4 classes, ou null.
export function equipeDepuis(texte) {
  const ids = String(texte ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length === 4 && ids.every((id) => CLASSES_ESSAI.includes(id)) ? ids : null;
}
export const ORDRE_ENNEMIS = ['s1', 's2', 's3', 'a1', 'a2', 'br', 'chef'];
export const HEROS = {
  brute: { nom: 'Brute', court: 'BRU', pv: 145, vitesse: 5, dex: 0, res: { type: 'Rage', v: 0, max: 50 }, role: 'Tank · lance les ennemis',
    faiblesse: 'Gelé dure deux fois plus longtemps ; aucune attaque à distance.',
    passif: 'Provocation (réaction, automatique) : un ennemi qui attaque un allié à côté de toi t’attaque à la place. Rage : +10 par coup donné ou reçu.',
    capacites: ['fracas', 'projection', 'projection20', 'pousser', 'potion', 'relever'] },
  mage: { nom: 'Mage', court: 'MAG', pv: 125, vitesse: 5, dex: 1, res: { type: 'Mana', v: 40, max: 40 }, role: 'Dégâts · contrôle l’eau',
    faiblesse: 'Dégâts ×2 quand elle se tient dans l’eau.', passif: 'Mana : +5 au début de son tour.',
    capacites: ['etincelle', 'eclaboussure', 'foudre', 'pousser', 'potion', 'relever'] },
  voleur: { nom: 'Voleur', court: 'VOL', pv: 115, vitesse: 6, dex: 2, res: { type: 'Concentration', v: 0, max: 3 }, role: 'Contrôle · prépare le coup final',
    faiblesse: 'Feu ×2, même le sien.', passif: 'Concentration : +1 quand un coéquipier exploite une de ses préparations.',
    capacites: ['fleche', 'fiole', 'fioleCible', 'ouverture', 'ouverture2', 'pousser', 'potion', 'relever'] },
  gardien: { nom: 'Gardien', court: 'GAR', pv: 140, vitesse: 5, dex: 0, res: { type: 'Foi', v: 0, max: 3 }, role: 'Soutien · gèle le sol',
    faiblesse: 'Ne peut pas se soigner lui-même.', passif: 'Foi : +1 par soin.',
    capacites: ['baton', 'soin', 'givre', 'givre3', 'pousser', 'potion', 'relever'] },
  eclaireuse: { nom: 'Éclaireuse', court: 'ECL', pv: 110, vitesse: 7, dex: 2, res: { type: 'Énergie', v: 3, max: 3 }, role: 'Dégâts à distance · harcèle et entrave', essai: true,
    faiblesse: 'Un ennemi à son contact : ses tirs ont le désavantage.', passif: 'Énergie : 3 à chaque tour, perdue si elle n’est pas dépensée. La plus rapide : 10,5 m par tour.',
    capacites: ['tirRapide', 'filet', 'tirLeste', 'pousser', 'potion', 'relever'] },
  chevalier: { nom: 'Chevalier', court: 'CHE', pv: 155, vitesse: 4, dex: -1, res: { type: 'Foi', v: 0, max: 3 }, role: 'Tank · protège les siens', essai: true,
    faiblesse: 'Lent (6 m), et la glace le renverse à coup sûr, sans jet.', passif: 'Foi : +1 par protection (le Cri de ralliement).',
    capacites: ['epee', 'chargeBouclier', 'ralliement', 'pousser', 'potion', 'relever'] },
  druide: { nom: 'Druide', court: 'DRU', pv: 135, vitesse: 6, dex: 0, res: { type: 'Mana', v: 40, max: 40 }, role: 'Contrôle · attire et inonde', essai: true,
    faiblesse: 'La foudre lui fait double dégâts, même l’eau électrisée.', passif: 'Mana : +5 au début de son tour.',
    capacites: ['ronce', 'liane', 'pluie', 'pousser', 'potion', 'relever'] },
  barde: { nom: 'Barde', court: 'BAR', pv: 135, vitesse: 6, dex: 2, res: { type: 'Énergie', v: 3, max: 3 }, role: 'Soutien · donne l’avantage', essai: true,
    faiblesse: 'Fragile : chaque coup reçu au contact lui fait 3 dégâts de plus.', passif: 'Énergie : 3 à chaque tour, perdue si elle n’est pas dépensée.',
    capacites: ['dague', 'chant', 'moquerie', 'pousser', 'potion', 'relever'] },
};
export const ENNEMIS = {
  sbire: { nom: 'Sbire', pv: 30, vitesse: 5, dex: 0, atk: { nom: 'Coup', base: 8, de: 4, portee: CONTACT, anim: 'attaque' }, habitude: 'frappe le héros le plus proche' },
  archer: { nom: 'Archer', pv: 25, vitesse: 5, dex: 2, atk: { nom: 'Flèche', base: 8, de: 4, portee: 8, anim: 'tir' }, habitude: 'reste à 6 m, tire sur le plus proche qu’il voit' },
  brt: { nom: 'Brute ennemie', pv: 60, vitesse: 5, dex: 0, coriace: true, atk: { nom: 'Charge', base: 14, de: 6, portee: CONTACT, anim: 'attaque' }, habitude: 'charge le héros qui a le moins de PV et le repousse' },
  // les ennemis du chemin (la lisière : ENNEMIS.fr.md ; en salle 1, le bandit ne vole ni ne fuit)
  bandit: { nom: 'Bandit', rang: 'sbire', pv: 25, vitesse: 6, dex: 2, atk: { nom: 'Coup de dague', base: 8, de: 4, portee: CONTACT, anim: 'attaque' }, habitude: 'frappe le héros le plus proche' },
  arbaletrier: { nom: 'Arbalétrier', pv: 30, vitesse: 4, dex: 1, garde: 16 / 3, recharge: true, vueLoin: 8, atk: { nom: 'Carreau', base: 12, de: 6, portee: 10, anim: 'tir' }, habitude: 'reste à 8 m ; un tour pour recharger entre deux tirs' },
  loup: { nom: 'Loup', pv: 35, vitesse: 8, dex: 2, meute: true, atk: { nom: 'Morsure', base: 10, de: 6, portee: CONTACT, anim: 'attaque', aTerreSur: 18 }, habitude: 'chasse en meute : mord le héros que les siens attaquent déjà ; sur 18 ou plus, la cible tombe' },
  rat: { nom: 'Rat', rang: 'sbire', pv: 12, vitesse: 6, dex: 1, vueLoin: 3, atk: { nom: 'Grignote', base: 4, de: 4, portee: CONTACT, anim: 'attaque' }, habitude: 'en nuée : grignote le héros le plus proche' },
  'rat-geant': { nom: 'Rat géant', pv: 40, vitesse: 6, dex: 1, vueLoin: 4, atk: { nom: 'Morsure', base: 8, de: 6, portee: CONTACT, anim: 'attaque' }, habitude: 'mord le plus proche (le meunier, s’il est là) ; voit mal, de près' },
  // le gardien de la porte (chemin-combats.md §4) : un mini-boss, d'après le Mercenaire d'ENNEMIS.fr.md
  'gardien-porte': { nom: 'Gardien de la porte', court: 'GARDIEN', rang: 'boss', pv: 180, vitesse: 5, dex: 1, coriace: true, parade: true, vueLoin: 8,
    atk: { nom: 'Fente', base: 14, de: 6, portee: CONTACT, anim: 'attaque' }, charge: { nom: 'Charge', base: 18, de: 6, longueur: 9, pousse: 2 },
    habitude: 'Fente au contact ; pare un coup au contact par tour ; un tour sur trois, annonce une Charge (la ligne rouge) et la fait au tour suivant (à chaque tour sous la moitié de ses PV). S’il finit contre un pilier, un rocher ou la porte : Étourdi' },
  chef: { nom: 'Chef', pv: 90, vitesse: 5, dex: 1, coriace: true, atk: { nom: 'Frappe du chef', base: 22, de: 8, anim: 'attaque' }, habitude: 'tours 1–2 : avantage aux ennemis · tour 3 : une zone de 5 m' },
};
const R2 = 1.7 / 1.5, R3 = 2.5 / 1.5;        // les zones 2×2 et 3×3 : des cercles de 1,7 m et 2,5 m de rayon
export const CAPACITES = {
  fracas: { nom: 'Fracas', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, anim: 'attaque', ds: 'Au contact · 5–7 / 11–14 / 22–28' },
  projection: { nom: 'Projection', slot: 'bonus', type: 'poussee', portee: CONTACT, longueur: 3, proj: true, ds: 'Pousse de 4,5 m ; s’il heurte quelque chose : +8 et À terre' },
  projection20: { nom: 'Projection furieuse', slot: 'bonus', type: 'poussee', portee: CONTACT, longueur: 5, proj: true, cout: 20, ds: '20 Rage · pousse de 7,5 m' },
  pousser: { nom: 'Pousser', slot: 'bonus', type: 'poussee', portee: CONTACT, longueur: 2, ds: '3 m ; +8 contre un obstacle ; fossé : sbire éliminé, sinon 20' },
  potion: { nom: 'Potion', slot: 'bonus', type: 'potion', ds: '+20 PV · une seule par héros' },
  relever: { nom: 'Relever', slot: 'action', type: 'relever', portee: CONTACT, ds: 'Un allié KO au contact revient à 25 PV' },
  etincelle: { nom: 'Étincelle', slot: 'action', type: 'attaque', portee: 6, mod: 2, base: 8, de: 4, anim: 'sort', ds: 'Portée 9 m · 5–7 / 11–14 / 22–28' },
  eclaboussure: { nom: 'Éclaboussure', slot: 'action', type: 'zone', surf: 'eau', rayon: R2, portee: 5, cout: 10, anim: 'sort', ds: '10 Mana · une flaque de 1,7 m à 7,5 m ; ceux dedans sont Trempés' },
  foudre: { nom: 'Foudre', slot: 'action', type: 'attaque', portee: 6, mod: 2, base: 14, de: 6, el: 'foudre', cout: 15, anim: 'sort', ds: '15 Mana · 8–11 / 17–22 / 34–44 ; ×2 sur Trempé ; électrise l’eau' },
  fleche: { nom: 'Flèche de feu', slot: 'action', type: 'attaque', portee: 8, mod: 2, base: 8, de: 4, el: 'feu', anim: 'tir', ds: 'Portée 12 m · ×2 sur Huilé ; enflamme l’huile et les tonneaux' },
  fiole: { nom: 'Fiole d’huile', slot: 'bonus', type: 'zone', surf: 'huile', rayon: R2, portee: 4, anim: 'tir', ds: 'Huile sur 1,7 m à 6 m ; ceux dedans sont Huilés' },
  fioleCible: { nom: 'Fiole sur une cible', slot: 'bonus', type: 'huileCible', portee: 4, ds: 'Huilé sur une créature à 6 m' },
  ouverture: { nom: 'Ouverture', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, aTerre: true, anim: 'estoc', ds: 'Au contact · 5–7 / 11–14 / 22–28 ; la cible est À terre' },
  ouverture2: { nom: 'Ouverture critique', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, aTerre: true, auto: true, cout: 2, anim: 'estoc', ds: '2 Concentration · critique assuré (22–28), À terre' },
  baton: { nom: 'Coup de bâton', slot: 'action', type: 'attaque', portee: CONTACT, mod: 1, base: 8, de: 4, anim: 'estoc', ds: 'Au contact, +1 · 5–6 / 10–13 / 20–26' },
  soin: { nom: 'Soin', slot: 'action', type: 'soin', portee: 6, anim: 'sort', ds: '18–23 PV à un allié à 9 m, sans jet' },
  givre: { nom: 'Garde de givre', slot: 'action', type: 'zone', surf: 'glace', rayon: R2, portee: 5, anim: 'sort', ds: 'Glace sur 1,7 m à 7,5 m (l’eau gèle) ; ennemis dessus Gelés' },
  givre3: { nom: 'Grand givre', slot: 'action', type: 'zone', surf: 'glace', rayon: R3, portee: 5, cout: 3, anim: 'sort', ds: '3 Foi · Glace sur 2,5 m' },
  // l'Éclaireuse
  tirRapide: { nom: 'Tir rapide', slot: 'action', type: 'attaque', portee: 8, mod: 2, base: 8, de: 4, anim: 'tir', ds: 'Portée 12 m · 5–7 / 11–14 / 22–28' },
  filet: { nom: 'Filet', slot: 'bonus', type: 'etatCible', etat: 'gele', portee: 5, cout: 2, anim: 'tir', ds: '2 Énergie · un ennemi à 7,5 m est Gelé (−3 m, désavantage)' },
  tirLeste: { nom: 'Tir lesté', slot: 'action', type: 'attaque', portee: 8, mod: 2, base: 14, de: 6, contreGele: true, cout: 1, anim: 'tir', ds: '1 Énergie · 8–11 / 17–22 / 34–44 ; ×2 sur une cible Gelée' },
  // le Chevalier
  epee: { nom: 'Coup d’épée', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, anim: 'attaque', ds: 'Au contact · 5–7 / 11–14 / 22–28' },
  chargeBouclier: { nom: 'Charge au bouclier', slot: 'bonus', type: 'poussee', portee: CONTACT, longueur: 2, proj: true, ds: 'Pousse de 3 m ; s’il heurte quelque chose : +8 et À terre' },
  ralliement: { nom: 'Cri de ralliement', slot: 'action', type: 'soinZone', rayon: 3, soin: 10, anim: 'sort', ds: '+10 PV à chaque allié à 4,5 m de toi (toi compris), sans jet' },
  // le Druide
  ronce: { nom: 'Fouet de ronce', slot: 'action', type: 'attaque', portee: 3, mod: 2, base: 8, de: 4, anim: 'estoc', ds: 'Portée 4,5 m · 5–7 / 11–14 / 22–28' },
  liane: { nom: 'Liane', slot: 'bonus', type: 'attraction', portee: 5, longueur: 2, anim: 'sort', ds: 'Attire un ennemi à 7,5 m de 3 m vers toi (dans le feu, l’eau, le fossé…)' },
  pluie: { nom: 'Pluie', slot: 'action', type: 'zone', surf: 'eau', rayon: R3, portee: 6, cout: 15, anim: 'sort', ds: '15 Mana · une grande flaque de 2,5 m à 9 m ; ceux dedans sont Trempés' },
  // la Barde
  dague: { nom: 'Dague', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, anim: 'estoc', ds: 'Au contact · 5–7 / 11–14 / 22–28' },
  chant: { nom: 'Chant de bataille', slot: 'bonus', type: 'inspiration', portee: 6, cout: 1, anim: 'sort', ds: '1 Énergie · un allié à 9 m a l’avantage à sa prochaine attaque' },
  // à tous, quand il y a un brasero dans la salle (la lisière) : n’importe quel héros au contact peut le renverser
  renverser: { nom: 'Renverser le brasero', slot: 'bonus', type: 'brasero', portee: CONTACT, ds: 'Au contact d’un brasero · le feu prend sur le foin qui le touche' },
  moquerie: { nom: 'Moquerie', slot: 'bonus', type: 'moquerie', portee: 6, cout: 2, anim: 'sort', ds: '2 Énergie · un ennemi à 9 m est Exposé : la prochaine attaque contre lui a l’avantage' },
};
// L'exploration (chemin-de-la-tour.md §3) : un ennemi voit à VUE cases (vueLoin s'il en a une), à ±35° de son regard.
export const VUE = 6;
// Les PNJ d'un combat (le moulin) : ils ne jouent pas ; les bêtes s'en prennent à eux.
export const PNJ = { meunier: { nom: 'Meunier', habitude: 'reste devant sa porte : à protéger' } };
export const NOM_SURFACE = { eau: 'l’eau', huile: 'l’huile', feu: 'le feu', glace: 'la glace', foin: 'le foin' };
// Les capacités d'un héros dans ce combat : les siennes, plus « Renverser » tant qu'il reste un brasero debout.
export const capacitesDe = (S, type) => (S.braseros?.some((b) => !b.renverse) ? [...HEROS[type].capacites, 'renverser'] : HEROS[type].capacites);
export const NOM_RESULTAT = { rate: 'Raté', eraflure: 'Éraflure', touche: 'Touché', critique: 'Critique' };
export const NOM_ETAT = { surpris: 'Surpris', trempe: 'Trempé', huile: 'Huilé', brulure: 'Brûlure', gele: 'Gelé', aTerre: 'À terre', expose: 'Exposé', inspire: 'Inspiré', etourdi: 'Étourdi' };

// --- Les surfaces : des taches sur une trame fine (un demi-pas de case), dessinées sans cases -----------------------
const MAILLE = 0.5;
const cle = (x, y) => `${Math.floor(x / MAILLE)},${Math.floor(y / MAILLE)}`;
const centreMaille = (k) => { const [i, j] = k.split(',').map(Number); return { x: (i + 0.5) * MAILLE, y: (j + 0.5) * MAILLE }; };
const VOISINS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// equipe : la classe de chacun des 4 héros (deux fois la même, c'est permis : on teste).
// rencontre : les ennemis du combat (les identifiants de ORDRE_ENNEMIS, tous par défaut) · objectif : « vaincre-chef » (le
// chef tombe, les autres fuient : D1) ou « vaincre-tous » · foin : des rectangles de foin (une surface qui brûle) ·
// braseros : leurs places [x, y] (un héros au contact peut en renverser un : le feu prend sur le foin qui le touche).
export function creerCombat({ trame, salle, departs, tonneaux = [], flaque = null, mode = 'equipe', equipe = EQUIPE_KIT, alea = Math.random, horloge = Date.now,
  rencontre = ORDRE_ENNEMIS, types = {}, objectif = 'vaincre-chef', foin = [], braseros = [], cachettes = [], recompense = null,
  fourches = [], colporteurs = [], bornes = [], groupeDe = {}, renforts = {}, combats = null, eaux = [], incidents = [], pnjs = [], portes = [], curiosites = [], declencheurs = [], leviers = [], rondes = {}, trouvailles = [] }) {
  const d = (n) => 1 + Math.floor(alea() * n);
  let combos = new Set();                     // les combos déjà comptés dans l'action en cours

  // --- L'état (des données seulement : on peut le copier pour « Annuler ») ---------------------------------------
  const S = {
    mode, round: 1, gi: 0, phase: 'preparation', ordre: [], unites: [], tonneaux: [], braseros: [], surfaces: {}, journal: [], evenements: [],
    ennemisIds: rencontre.slice(), objectif, cachettes: cachettes.map((c) => ({ ...c, trouvee: false, fouillePar: [], reperee: false, essais: [] })), trouvailles: trouvailles.map((o) => ({ ...o, fait: false })), caillasse: 0, repere: null, recompense, question: null, groupeActif: null, incidents: incidents.map((i) => ({ ...i, fait: false })),
    combats: combats ?? { principal: { objectif, recompense } }, arrivee: false,
    leviers: leviers.map((l) => ({ ...l, fait: false })), portes: portes.map((p) => ({ ...p, ouverte: false, herseLevee: false })), declencheurs: declencheurs.map((o) => ({ ...o, fait: false })),
    curiosites: curiosites.map((c) => ({ ...c, faits: 0, fait: false, parti: false, couronne: false })),
    fourches: fourches.map((f) => ({ ...f, choisi: null })), voie: null, alertes: {}, relances: 0, tonneauxPortes: 0, colporteurs: colporteurs.map((c) => ({ ...c })), bornes: bornes.map((b) => ({ ...b, faite: false })),
    chefTour: 1, ennemisAvantage: false, debut: null, fin: null, debutPhase: null, resultat: null,
    heros: PLACES.slice(), equipe: equipe.slice(),
    stats: { degats: Object.fromEntries(PLACES.map((p) => [p, 0])), combos: [], tenailles: 0, ko: 0, releves: 0, rounds: [] },
  };
  const unite = (o) => Object.assign({ ko: false, mort: false, st: {}, expose: false, coriace: false, t: { mv: o.vitesse, action: true, bonus: true, reaction: true } }, o);
  PLACES.forEach((id, k) => {
    const type = equipe[k], h = HEROS[type], [x, y] = departs.heros[k];
    const meme = equipe.slice(0, k).filter((t) => t === type).length;     // deux fois la même classe : « Brute 2 »
    S.unites.push(unite({ id, camp: 'h', type, nom: meme ? `${h.nom} ${meme + 1}` : h.nom, court: h.court, x, y, pv: h.pv, pvMax: h.pv, vitesse: h.vitesse, dex: h.dex, res: { ...h.res }, potion: 1 }));
  });
  const TYPE = { s: 'sbire', a: 'archer', br: 'brt', chef: 'chef' };
  for (const id of rencontre) {
    const type = types[id] ?? TYPE[id] ?? TYPE[id[0]], df = ENNEMIS[type], [x, y] = departs.ennemis[id];
    const n = id.match(/\d+$/)?.[0];
    S.unites.push(unite({ id, camp: 'e', groupe: groupeDe[id] ?? 'principal', cache: !!renforts[id], renfort: renforts[id] ?? null, type, nom: n ? `${df.nom} ${n}` : df.nom, court: n ? `${df.nom[0]}${n}` : (df.court ?? (type === 'chef' ? 'CHEF' : 'BR')), x, y, pv: df.pv, pvMax: df.pv, vitesse: df.vitesse, dex: df.dex, coriace: !!df.coriace }));
  }
  for (const p of pnjs) S.unites.push(unite({ id: p.id, camp: 'p', type: p.type, groupe: p.groupe, nom: PNJ[p.type]?.nom ?? p.id, court: 'PNJ', x: p.x, y: p.y, pv: p.pv, pvMax: p.pv, vitesse: 0, dex: 0 }));
  for (const [id, [dx, dy]] of Object.entries(rondes)) { const u = S.unites.find((o) => o.id === id); if (u) u.ronde = { x0: u.x, y0: u.y, dx, dy, t: 0, sens: 1 }; }
  tonneaux.forEach(([x, y], k) => S.tonneaux.push({ id: `t${k}`, x, y }));
  braseros.forEach(([x, y], k) => S.braseros.push({ id: `b${k}`, x, y, renverse: false }));
  for (const r of foin) peindreRect(r, () => ({ t: 'foin', ttl: null, par: null }));
  for (const r of eaux) peindreRect(r, () => ({ t: 'eau', ttl: null, par: null }));          // un haut-fond : de l'eau peu profonde, toujours là
  if (flaque) peindre(flaque.x, flaque.y, flaque.r, () => ({ t: 'eau', ttl: null, par: null }));

  const U = (id) => S.unites.find((u) => u.id === id);
  const herosVivants = () => S.unites.filter((u) => u.camp === 'h' && !u.ko);
  const ennemisVivants = () => S.unites.filter((u) => u.camp === 'e' && !u.mort && !u.cache && (!S.groupeActif || u.groupe === S.groupeActif));
  const ciblesEnnemies = () => [...herosVivants(), ...S.unites.filter((u) => u.camp === 'p' && !u.mort && S.groupeActif && u.groupe === S.groupeActif)];
  const estHeros = (id) => !!id && U(id)?.camp === 'h';
  const butDe = (g) => S.combats[g ?? 'principal'] ?? null;
  const nomHeros = (id) => U(id)?.nom ?? '';
  const ev = (o) => S.evenements.push(o);
  const log = (t, c = '') => { S.journal.unshift({ r: S.round, t, c }); if (S.journal.length > 250) S.journal.length = 250; };
  const entreeRound = () => { let e = S.stats.rounds.find((r) => r.r === S.round); if (!e) { e = { r: S.round, herosMs: 0 }; S.stats.rounds.push(e); } return e; };
  const flotter = (u, texte, genre) => ev({ type: 'flottant', id: u.id, texte, genre });

  // --- Les surfaces ---------------------------------------------------------------------------------------------
  function surfaceA(p) { return S.surfaces[cle(p.x, p.y)] ?? null; }
  function peindre(cx, cy, r, quoi) {
    const touchees = [];
    for (let x = cx - r; x <= cx + r + MAILLE; x += MAILLE) for (let y = cy - r; y <= cy + r + MAILLE; y += MAILLE) {
      const k = cle(x, y), c = centreMaille(k);
      if (Math.hypot(c.x - cx, c.y - cy) > r || touchees.includes(k)) continue;
      if (!libre(trame, c.x, c.y)) continue;                           // pas dans un mur, l'étang ni le fossé
      const nouveau = quoi(S.surfaces[k], k);
      if (nouveau === undefined) continue;
      if (nouveau === null) delete S.surfaces[k]; else S.surfaces[k] = nouveau;
      touchees.push(k);
    }
    return touchees;
  }
  function peindreRect(r, quoi) {                  // un rectangle de surface (le foin), maille par maille
    for (let x = r.x0; x < r.x1; x += MAILLE) for (let y = r.y0; y < r.y1; y += MAILLE) {
      const k = cle(x + MAILLE / 2, y + MAILLE / 2), c = centreMaille(k);
      if (libre(trame, c.x, c.y)) S.surfaces[k] = quoi();
    }
  }
  function inonder(p, t) {                         // toute la tache d'une même surface, à partir d'un point
    const out = [], vu = new Set(), pile = [cle(p.x, p.y)];
    while (pile.length) {
      const k = pile.pop();
      if (vu.has(k)) continue; vu.add(k);
      const s = S.surfaces[k]; if (!s || s.t !== t) continue;
      out.push(k);
      const [i, j] = k.split(',').map(Number);
      for (const [di, dj] of VOISINS4) pile.push(`${i + di},${j + dj}`);
    }
    return out;
  }
  const dedans = (k) => S.unites.filter((u) => !u.mort && !u.ko && cle(u.x, u.y) === k);

  // --- Dégâts, états, combos ------------------------------------------------------------------------------------
  function combo(a, b, quoi) {
    if (!estHeros(a) || !estHeros(b) || a === b) return;
    const k = `${a}>${b}`; if (combos.has(k)) return; combos.add(k);
    S.stats.combos.push({ r: S.round, a, b, quoi });
    log(`Combo ! ${nomHeros(a)} prépare, ${nomHeros(b)} exploite : ${quoi}.`, 'combo');
    ev({ type: 'combo', a, b, quoi });
    const v = U(a);
    if (v.type === 'voleur' && v.res.v < v.res.max) { v.res.v++; log(`${v.nom} gagne 1 Concentration.`, 'muet'); }
  }
  const rage = (u, n) => { if (u && u.type === 'brute' && u.camp === 'h') u.res.v = Math.min(u.res.max, u.res.v + n); };
  function blesser(u, n, par, o = {}) {
    if (!u || u.mort || u.ko || n <= 0) return 0;
    if (!o.sansFaiblesse && u.type === 'mage' && surfaceA(u)?.t === 'eau') { n *= 2; log('La Mage est dans l’eau : dégâts ×2.', 'muet'); }
    if (o.melee && u.type === 'barde') { n += 3; log(`${u.nom} est fragile au contact : +3.`, 'muet'); }
    const avant = u.pv; u.pv -= n;
    if (estHeros(par) && u.camp === 'e') S.stats.degats[par] += Math.min(n, avant);
    ev({ type: 'degats', id: u.id, n, pv: Math.max(0, u.pv) });
    if (u.pv <= 0) tomber(u);
    else if (u.camp === 'e' && ENNEMIS[u.type]?.rang === 'boss' && !u.miVie && u.pv <= u.pvMax / 2) {
      u.miVie = true;
      const arrivent = S.unites.filter((o) => o.cache && !o.mort && o.renfort === 'mi-vie' && o.groupe === u.groupe);
      log(`${u.nom} est à la moitié de ses PV : il charge désormais à chaque tour${arrivent.length ? ', et appelle à l’aide' : ''} !`, 'ennemi');
      if (arrivent.length) { for (const o of arrivent) o.cache = false; ev({ type: 'renfort', ids: arrivent.map((o) => o.id) }); }
    }
    return n;
  }
  function tomber(u) {
    u.pv = 0; u.st = {}; u.expose = false;
    if (u.camp === 'p') { u.mort = true; log(`${u.nom} tombe : la récompense pour l’avoir protégé est perdue.`, 'mauvais'); ev({ type: 'ko', id: u.id }); return; }
    if (u.camp === 'h') {
      u.ko = true; S.stats.ko++; log(`${u.nom} est KO.`, 'mauvais'); ev({ type: 'ko', id: u.id });
      if (!herosVivants().length) finir('defaite');
    } else {
      u.mort = true; ev({ type: 'ko', id: u.id });
      // la victoire se juge sur le combat de celui qui tombe (en exploration, un coup peut finir un combat d'un trait)
      const g = S.groupeActif ?? u.groupe ?? 'principal', but = S.combats[g]?.objectif ?? S.objectif;
      const restants = S.unites.some((o) => o.camp === 'e' && !o.mort && !o.cache && (o.groupe ?? 'principal') === g);
      const chefFinit = (u.type === 'chef' || ENNEMIS[u.type]?.rang === 'boss') && but === 'vaincre-chef';
      log(chefFinit ? `${u.nom} est vaincu ! Les autres s’enfuient.` : `${u.nom} est vaincu.`, 'bon');
      if (chefFinit) fuir(g);
      if (chefFinit || (['vaincre-tous', 'proteger'].includes(but) && !restants)) { S.groupeActif = g; finir('victoire'); }
    }
  }
  function fuir(g) {                                // les ennemis d'un combat s'enfuient (leur chef est tombé, le meunier a tenu)
    const partent = S.unites.filter((o) => o.camp === 'e' && !o.mort && (o.groupe ?? 'principal') === g);
    for (const o of partent) o.mort = true;
    if (partent.length) ev({ type: 'fuite', ids: partent.map((o) => o.id) });
  }
  function finir(r) {
    if (S.resultat) return;
    if (S.phase === 'heros' && S.debutPhase) entreeRound().herosMs += horloge() - S.debutPhase;
    S.resultat = r; S.phase = 'fini'; S.fin = horloge();
    log(r === 'victoire' ? `Victoire au round ${S.round} !` : `Défaite au round ${S.round} : les quatre héros sont KO.`, r === 'victoire' ? 'bon' : 'mauvais');
    ev({ type: 'fin', resultat: r });
  }
  function toucheFeu(u, n, par) {
    let m = 1;
    if (u.st.huile) { m *= 2; combo(u.st.huile.par, par, 'Huilé puis feu'); delete u.st.huile; }
    if (u.type === 'voleur') m *= 2;
    blesser(u, n * m, par);
    if (u.mort || u.ko) return;
    if (u.st.trempe) { delete u.st.trempe; log(`${u.nom} était Trempé : pas de Brûlure.`, 'muet'); } else u.st.brulure = { n: 2, par };
  }
  // Entrer dans une tache de surface (en marchant, ou poussé). Renvoie true si l'élan s'arrête (glissé, À terre).
  function entrerSurface(u, s, enMarchant) {
    if (!s || u.mort || u.ko) return false;
    if (s.t === 'eau') { u.st.trempe = { ttl: 3, par: s.par }; if (u.st.brulure) { delete u.st.brulure; log(`L’eau éteint ${u.nom}.`, 'muet'); } }
    else if (s.t === 'huile') u.st.huile = { ttl: 3, par: s.par };
    else if (s.t === 'feu') { log(`${u.nom} entre dans le feu.`, u.camp === 'h' ? 'mauvais' : ''); toucheFeu(u, 6, s.par); }
    else if (s.t === 'glace' && enMarchant && u.type === 'chevalier') {
      u.st.aTerre = { par: s.par }; log(`${u.nom} pose son armure sur la glace : À terre, sans jet.`, 'mauvais'); return true;
    } else if (s.t === 'glace' && enMarchant) {
      const r = d(20);
      ev({ type: 'de', id: u.id, k: r, quoi: 'glace' });
      if (r <= 9) { u.st.aTerre = { par: s.par }; log(`${u.nom} glisse sur la glace (d20 : ${r}) : À terre.`, u.camp === 'h' ? 'mauvais' : 'bon'); return true; }
      log(`${u.nom} garde l’équilibre sur la glace (d20 : ${r}).`, 'muet');
    }
    return false;
  }
  function enflammer(p, par) {
    const huile = inonder(p, 'huile'), foinM = inonder(p, 'foin'), mailles = [...huile, ...foinM]; if (!mailles.length) return false;
    new Set(huile.map((k) => S.surfaces[k].par)).forEach((a) => combo(a, par, 'huile enflammée'));
    new Set(foinM.flatMap((k) => dedans(k)).map((u) => u.foinPar).filter(Boolean)).forEach((a) => combo(a, par, 'foin enflammé'));
    for (const k of mailles) S.surfaces[k] = { t: 'feu', ttl: 3, par };
    log(`${huile.length ? 'L’huile' : 'Le foin'} s’enflamme : ${Math.round(mailles.length * (MAILLE * 1.5) ** 2)} m² en feu.`);
    ev({ type: 'surfaces' });
    for (const k of mailles) for (const u of dedans(k)) toucheFeu(u, 6, par);
    return true;
  }
  function electrifier(p, par) {
    const mailles = inonder(p, 'eau'); if (!mailles.length) return;
    new Set(mailles.map((k) => S.surfaces[k].par)).forEach((a) => combo(a, par, 'eau électrisée'));
    log('La foudre électrise l’eau : 8 dégâts à tous ceux qui sont dedans.');
    ev({ type: 'eclair', mailles: mailles.length });
    const touches = new Set();
    for (const k of mailles) for (const u of dedans(k)) if (!touches.has(u)) { touches.add(u); blesser(u, u.type === 'druide' ? 16 : 8, par); }
  }
  function eclaterTonneau(b, par, feu) {
    S.tonneaux = S.tonneaux.filter((o) => o !== b);
    const n = peindre(b.x, b.y, R3, (vieux) => (vieux?.t === 'feu' ? undefined : { t: 'huile', ttl: 3, par }));
    for (const u of S.unites) if (!u.mort && !u.ko && dist(u, b) <= R3) u.st.huile = { ttl: 3, par };
    log(`Le tonneau éclate : de l’huile tout autour (${n.length ? metres(R3) : 0} m).`);
    ev({ type: 'tonneau', id: b.id, x: b.x, y: b.y });
    ev({ type: 'surfaces' });
    if (feu) enflammer(b, par);
  }
  function poserZone(h, cap, centre) {
    const par = h.id;
    peindre(centre.x, centre.y, cap.rayon, (vieux) => {
      if (cap.surf === 'eau') return { t: 'eau', ttl: 3, par };
      if (cap.surf === 'huile') return vieux?.t === 'feu' ? undefined : { t: 'huile', ttl: 3, par };
      if (vieux?.t === 'eau') combo(vieux.par, par, 'eau gelée');
      if (vieux?.t === 'feu') return { t: 'eau', ttl: 3, par };
      return { t: 'glace', ttl: 3, par };
    });
    for (const u of S.unites) {
      if (u.mort || u.ko || dist(u, centre) > cap.rayon) continue;
      if (cap.surf === 'eau') { u.st.trempe = { ttl: 3, par }; delete u.st.brulure; }
      else if (cap.surf === 'huile') u.st.huile = { ttl: 3, par };
      else if (u.camp === 'e') { u.st.gele = { n: 1, par }; log(`${u.nom} est Gelé.`, 'muet'); }
    }
    ev({ type: 'zone', x: centre.x, y: centre.y, r: cap.rayon, surf: cap.surf });
    ev({ type: 'surfaces' });
  }

  // --- Les attaques ---------------------------------------------------------------------------------------------
  // Le couvert (le plan validé le 23 oct) : un tir (pas au contact) vers une cible collée à un rocher, un arbre, un pilier,
  // une statue ou un brasero qui se trouve entre elle et le tireur a le désavantage.
  function couvert(att, cible) {
    if (dist(att, cible) <= CONTACT) return null;
    const vx = cible.x - att.x, vy = cible.y - att.y, l2 = vx * vx + vy * vy || 1;
    return trame.salle.obstacles.find((o) => {
      if (o.r == null || o.r > 0.6 || o.roue || o.fosse) return false;
      const dc = Math.hypot(o.x - cible.x, o.y - cible.y);
      if (dc > o.r + 1.1 || Math.hypot(o.x - att.x, o.y - att.y) <= dc) return false;
      const t = Math.max(0, Math.min(1, ((o.x - att.x) * vx + (o.y - att.y) * vy) / l2));
      return Math.hypot(o.x - (att.x + vx * t), o.y - (att.y + vy * t)) <= o.r + 0.3;
    }) ?? null;
  }
  function calculer(att, cible, A) {
    let av = false, des = false, mult = 1, tenaille = false;
    const notes = [], aCombos = [];
    if (cible.st.etourdi) { av = true; notes.push('cible Étourdie : avantage, elle ne pare pas'); if (cible.st.etourdi.par) aCombos.push([cible.st.etourdi.par, 'Étourdi puis frappe']); }
    else if (A.melee && ENNEMIS[cible.type]?.parade && cible.camp === 'e' && cible.t?.reaction) notes.push('Parade : son premier coup au contact de ce tour n’est qu’une éraflure');
    if (cible.st.aTerre) { av = true; notes.push('cible À terre : avantage'); if (cible.st.aTerre.par) aCombos.push([cible.st.aTerre.par, 'cible À terre']); }
    if (cible.expose) {
      av = true; notes.push(cible.expose.par ? 'la cible est moquée (Exposé) : avantage' : 'la cible a pris la pose : avantage');
      if (cible.expose.par) aCombos.push([cible.expose.par, 'cible moquée']);
    }
    if (att.st.inspire) { av = true; notes.push('Inspiré par un chant : avantage'); aCombos.push([att.st.inspire.par, 'chant de bataille']); }
    if (att.type === 'eclaireuse' && !A.melee && S.unites.some((o) => o.camp !== att.camp && !o.mort && !o.ko && dist(o, att) <= CONTACT)) {
      des = true; notes.push('un ennemi au contact de l’Éclaireuse : désavantage');
    }
    if (A.contreGele && cible.st.gele) { mult *= 2; notes.push('cible Gelée : tir lesté ×2'); aCombos.push([cible.st.gele.par, 'Gelé puis tir lesté']); }
    if (A.el === 'foudre' && cible.type === 'druide') { mult *= 2; notes.push('faiblesse du Druide : foudre ×2'); }
    if (A.melee && enTenaille(att, cible, S.unites.filter((o) => o.camp === att.camp && !o.ko && !o.mort))) { av = true; tenaille = true; notes.push('prise en tenaille : avantage'); }
    if (att.camp === 'e' && S.ennemisAvantage) { av = true; notes.push('ordres du chef : avantage'); }
    if (surfaceA(att)?.t === 'glace') { des = true; notes.push('attaque depuis la glace : désavantage'); }
    if (att.st.gele) { des = true; notes.push('attaquant Gelé : désavantage'); }
    const cv = !A.melee ? couvert(att, cible) : null;
    if (cv) { des = true; notes.push(`cible à couvert derrière ${cv.pilier ? 'un pilier' : cv.brasero ? 'un brasero' : 'un obstacle'} : désavantage`); }
    if (A.el === 'foudre' && cible.st.trempe) { mult *= 2; notes.push('Trempé : foudre ×2'); aCombos.push([cible.st.trempe.par, 'Trempé puis foudre']); }
    const huile = A.el === 'feu' && !!cible.st.huile;
    if (huile) { mult *= 2; notes.push('Huilé : feu ×2, et Brûlure'); aCombos.push([cible.st.huile.par, 'Huilé puis feu']); }
    if (A.el === 'feu' && cible.type === 'voleur') { mult *= 2; notes.push('faiblesse du Voleur : feu ×2'); }
    if (cible.type === 'mage' && surfaceA(cible)?.t === 'eau') { mult *= 2; notes.push('la Mage est dans l’eau : ×2'); }
    if (A.el === 'foudre' && surfaceA(cible)?.t === 'eau') notes.push('la cible est dans l’eau : électrise toute la flaque (8 à chacun)');
    if (A.el === 'feu' && surfaceA(cible)?.t === 'huile') notes.push('la cible est dans l’huile : tout s’enflamme');
    if (A.aTerre) notes.push('la cible sera À terre');
    return { av: av && !des ? 1 : des && !av ? -1 : 0, mult, notes, aCombos, tenaille, huile, coriace: !!cible.coriace };
  }
  const noter = (k, A, c) => (A.auto ? 'critique' : k === 1 ? 'rate' : k === 20 ? 'critique' : k + A.mod <= (c.coriace ? 12 : 9) ? 'eraflure' : 'touche');
  function chances(A, c) {
    const o = { rate: 0, eraflure: 0, touche: 0, critique: 0 };
    if (A.auto) { o.critique = 1; return o; }
    for (let k = 1; k <= 20; k++) o[noter(k, A, c)] += c.av === 1 ? (2 * k - 1) / 400 : c.av === -1 ? (41 - 2 * k) / 400 : 1 / 20;
    return o;
  }
  function fourchette(A, c, g) {
    const lo = A.base + 1 + A.dmod, hi = A.base + A.de + A.dmod;
    const f = (v) => (g === 'eraflure' ? Math.floor(v / 2) : g === 'critique' ? v * 2 : v) * c.mult;
    return g === 'rate' ? '0' : `${f(lo)}–${f(hi)}`;
  }
  const attaqueHeros = (cap) => ({ nom: cap.nom, mod: cap.mod, dmod: cap.mod, base: cap.base, de: cap.de, el: cap.el, melee: cap.portee === CONTACT, auto: !!cap.auto, aTerre: !!cap.aTerre, contreGele: !!cap.contreGele, anim: cap.anim });
  const attaqueEnnemi = (e) => { const a = ENNEMIS[e.type].atk; return { nom: a.nom, mod: 2, dmod: 0, base: a.base, de: a.de, melee: a.portee === CONTACT, anim: a.anim, aTerreSur: a.aTerreSur }; };
  function rate(u) {
    const r = d(6);
    const T = { 1: 'lâche son arme', 2: 'glisse : À terre', 3: 'pousse un cri de guerre épique… rien ne se passe, l’ennemi le plus proche se moque', 4: 'renverse de l’huile à ses pieds', 5: 'trébuche sur un allié', 6: 'prend la pose : la prochaine attaque contre lui a l’avantage' };
    log(`Raté comique (d6 : ${r}) : ${u.nom} ${T[r]}.`, 'muet');
    if (r === 1 && u.t) u.t.bonus = false;
    if (r === 2) u.st.aTerre = { par: null };
    if (r === 4) { peindre(u.x, u.y, 0.6, () => ({ t: 'huile', ttl: 3, par: null })); u.st.huile = { ttl: 3, par: null }; ev({ type: 'surfaces' }); }
    if (r === 6) u.expose = true;
    flotter(u, 'Raté !', 'info');
  }
  function attaquer(att, cible, A) {
    const c = calculer(att, cible, A);
    let k = 20, jets = [20];
    if (!A.auto) {
      const r1 = d(20), r2 = d(20);
      k = c.av === 1 ? Math.max(r1, r2) : c.av === -1 ? Math.min(r1, r2) : r1;
      jets = c.av ? [r1, r2] : [r1];
    }
    let g = noter(k, A, c);
    if ((g === 'touche' || g === 'critique') && A.melee && cible.camp === 'e' && ENNEMIS[cible.type]?.parade && cible.t?.reaction && !cible.st.etourdi) {
      cible.t.reaction = false; g = 'eraflure';
      log(`${cible.nom} pare le coup : une éraflure.`, 'ennemi'); flotter(cible, 'Parade !', 'info');
    }
    cible.expose = false;
    if (att.st.inspire) delete att.st.inspire;          // le chant ne sert qu'une fois
    const qui = `${att.nom} → ${cible.nom} · ${A.nom}`;
    const label = A.auto ? 'critique assuré' : c.av ? `${jets[0]} et ${jets[1]} (${c.av === 1 ? 'avantage' : 'désavantage'}) → ${k}` : String(k);
    ev({ type: 'attaque', de: att.id, vers: cible.id, cap: A.id, anim: A.anim, jets, k, mod: A.auto ? null : A.mod, resultat: g, av: c.av,
      nomCap: A.nom, coriace: c.coriace, raison: c.av ? c.notes.find((n) => /avantage/.test(n)) ?? null : null });   // (le panneau de jet : le nom, la cible solide, la raison de l'avantage)
    if (g === 'rate' && att.camp === 'h' && S.relances > 0 && !A.relance) {
      S.relances--;
      log(`${qui} · d20 ${label} : Raté… la vieille borne veille : le dé se rejoue !`, 'combo');
      ev({ type: 'relance', id: att.id }); flotter(att, 'Relance !', 'info');
      return attaquer(att, cible, { ...A, relance: true });
    }
    if (g === 'rate') { log(`${qui} · d20 ${label} : Raté !`, att.camp === 'e' ? 'ennemi' : 'mauvais'); rate(att); return g; }
    const jet = d(A.de);
    let n = A.base + jet + A.dmod;
    if (g === 'eraflure') n = Math.floor(n / 2);
    if (g === 'critique') n *= 2;
    n *= c.mult;
    c.aCombos.forEach(([a, w]) => combo(a, att.id, w));
    if (c.tenaille && att.camp === 'h') S.stats.tenailles++;
    log(`${qui} · d20 ${label}${A.auto ? '' : ` + ${A.mod} = ${k + A.mod}`} : ${NOM_RESULTAT[g]} · ${n} dégâts${c.mult > 1 ? ` (×${c.mult})` : ''}`, att.camp === 'e' ? 'ennemi' : '');
    blesser(cible, n, att.id, { sansFaiblesse: true, melee: A.melee });
    rage(att, 10); rage(cible, 10);
    if (!cible.mort && !cible.ko) {
      if (A.aTerre || (A.aTerreSur && k >= A.aTerreSur)) cible.st.aTerre = { par: A.aTerre ? att.id : null };
      if (c.huile) { delete cible.st.huile; if (cible.st.trempe) delete cible.st.trempe; else cible.st.brulure = { n: 2, par: att.id }; }
    }
    if (A.el === 'feu') enflammer(cible, att.id);
    if (A.el === 'foudre' && surfaceA(cible)?.t === 'eau') electrifier(cible, att.id);
    return g;
  }

  // --- Les poussées ---------------------------------------------------------------------------------------------
  function pousser(src, cible, o) {
    const estUnite = !!cible.camp, parHeros = estHeros(src.id) ? src.id : null;
    let longueur = o.longueur;
    if (estUnite && cible.st.gele) { longueur += 2; combo(cible.st.gele.par, parHeros, 'Gelé puis poussée'); }
    const autres = [...S.unites.filter((u) => !u.mort && !u.ko && u !== cible), ...S.tonneaux.filter((b) => b !== cible)];
    const sim = simulerPoussee(trame, src, cible, longueur, { obstacles: autres, surGlace: (x, y) => S.surfaces[cle(x, y)]?.t === 'glace' });
    log(`${src.nom} ${o.attire ? 'attire' : o.proj ? 'projette' : 'pousse'} ${estUnite ? cible.nom : 'le tonneau'} de ${metres(sim.parcouru)} m.`, src.camp === 'e' ? 'ennemi' : '');
    ev({ type: 'poussee', id: cible.id, tonneau: !estUnite, chemin: sim.chemin.map((p) => ({ ...p })) });
    let vu = surfaceA(cible);
    for (const p of sim.chemin) {
      cible.x = p.x; cible.y = p.y;
      if (!estUnite) continue;
      const s = surfaceA(p);
      if (s && s !== vu) {
        if (s.t === 'foin' && parHeros) cible.foinPar = parHeros;          // poussé dans le foin : celui qui l’enflammera exploite ce coup
        if (s.par && parHeros && s.par !== parHeros) combo(s.par, parHeros, `${o.attire ? 'attiré' : 'poussé'} dans ${NOM_SURFACE[s.t]}`);
        entrerSurface(cible, s, false);
      }
      vu = s;
      if (cible.mort || cible.ko) break;
    }
    if (!estUnite) { eclaterTonneau(cible, parHeros, false); return; }
    if (parHeros) cible.poussePar = { par: parHeros, round: S.round };
    if (cible.mort || cible.ko) return;
    if (sim.arret === 'fosse') {
      chute(cible, trame.salle.obstacles.find((x) => x.fosse && dansForme(x, cible.x, cible.y)) ?? trame.salle.obstacles.find((x) => x.fosse), parHeros);
    } else if (sim.arret === 'mur' && sim.heurte?.roue) {             // contre la roue du moulin : le choc, puis elle le jette à l'eau
      log(`${cible.nom} heurte la roue du moulin : +8, et elle le jette à l’eau !`, 'combo');
      blesser(cible, 8, parHeros);
      if (!cible.mort && !cible.ko) {
        const fo = trame.salle.obstacles.filter((x) => x.fosse).sort((a, b) => distForme(a, sim.heurte) - distForme(b, sim.heurte))[0];
        if (fo) chute(cible, fo, parHeros);
      }
    } else if (sim.arret === 'mur' && sim.heurte?.brasero) {          // poussé contre le brasero : il prend le feu, le brasero tombe
      const br = S.braseros.find((b) => !b.renverse && Math.hypot(b.x - sim.heurte.x, b.y - sim.heurte.y) < 0.01);
      log(`${cible.nom} est ${o.attire ? 'attiré' : 'poussé'} contre le brasero !`, 'combo');
      toucheFeu(cible, 6, parHeros);
      if (br && !cible.mort) {
        br.renverse = true; ev({ type: 'brasero', id: br.id });
        const p = foinContre(br);
        if (p) enflammer(p, parHeros);
      }
    } else if (sim.arret && !(o.attire && sim.heurte === o.attire)) {      // attiré jusqu'au lanceur : il arrive, sans choc
      log(`${cible.nom} heurte ${sim.arret === 'mur' ? (sim.heurte?.rocher ? 'un rocher' : 'la barrière') : 'un obstacle'} : +8.`);
      blesser(cible, 8, parHeros);
      if (o.proj && !cible.mort && !cible.ko) { cible.st.aTerre = { par: parHeros }; log(`${cible.nom} est À terre.`, 'muet'); }
    }
  }

  const distForme = (f, p) => (f.r != null ? Math.hypot(f.x - p.x, f.y - p.y) : Math.hypot(Math.max(f.x0 - p.x, 0, p.x - f.x1), Math.max(f.y0 - p.y, 0, p.y - f.y1)));
  // Tomber dans l'eau profonde ou le fossé : un sbire est emporté (éliminé) ; plus gros, 20 dégâts, il remonte au bord, À terre.
  function chute(cible, fo, parHeros) {
    const ou = fo.nom ?? (fo.riviere ? 'la rivière' : 'le fossé');
    ev({ type: 'chute', id: cible.id });
    if (cible.type === 'sbire' || ENNEMIS[cible.type]?.rang === 'sbire') {
      log(`${cible.nom} tombe dans ${ou} : ${fo.riviere ? 'emporté' : 'éliminé'} !`, 'bon');
      if (parHeros) S.stats.degats[parHeros] += cible.pv;
      tomber(cible); return;
    }
    log(`${cible.nom} tombe dans ${ou} et remonte : 20 dégâts.`);
    blesser(cible, 20, parHeros);
    if (cible.mort || cible.ko) return;
    const p = pointLibreProche(trame, fo.riviere ? { x: cible.x, y: cible.y } : { x: cible.x, y: fo.y0 - 0.5 }, S.unites.filter((u) => u !== cible && !u.mort && !u.ko));
    cible.x = p.x; cible.y = p.y;
    ev({ type: 'place', id: cible.id, x: p.x, y: p.y });
  }

  // Attirer (la Liane du Druide) : une poussée vers le lanceur, avec les mêmes chocs, surfaces et chutes.
  function attirer(src, cible, longueur) {
    const derriere = { id: src.id, nom: src.nom, camp: src.camp, x: cible.x + (cible.x - src.x), y: cible.y + (cible.y - src.y) };
    pousser(derriere, cible, { longueur, attire: src });
  }

  // --- Les déplacements -----------------------------------------------------------------------------------------
  // Qui gêne ce marcheur : ses ennemis debout et les tonneaux (on traverse ses alliés et les KO).
  const genantsDe = (m) => [...S.unites.filter((u) => !u.mort && !u.ko && u.camp !== m.camp), ...S.tonneaux];
  const occupants = (m) => [...S.unites.filter((u) => !u.mort && !u.ko && u !== m), ...S.tonneaux];
  const danger = (m) => (x, y) => {
    const s = S.surfaces[cle(x, y)]; if (!s) return 0;
    return m.camp === 'e' ? ({ feu: 1.5, glace: 0.5, huile: 0.1 }[s.t] || 0) : ({ feu: 0.02, glace: 0.01 }[s.t] || 0);
  };
  function carteDe(u, max = u.t.mv) {
    return carteDistances(trame, [u], { genants: genantsDe(u), penalite: danger(u), max: max + 0.01 });
  }
  // Peut-on finir là ? (pas sur une autre créature ni un tonneau)
  const finPossible = (u, p) => libre(trame, p.x, p.y) && !occupants(u).some((o) => Math.hypot(o.x - p.x, o.y - p.y) < ECART_MIN);
  // La portée de marche : la carte, et un test « ce point est-il atteignable ? ».
  function portee(u) {
    const carte = carteDe(u);
    return { carte, atteint: (p) => { const k = indiceDe(trame, p.x, p.y); return carte.longueur[k] <= u.t.mv + 1e-6 && finPossible(u, p); } };
  }
  function marcher(u, pts, meneur = false) {
    const parcours = [{ x: u.x, y: u.y }];
    let fait = 0, vu = surfaceA(u), stop = false;
    for (const p of pts) {
      const a = parcours[parcours.length - 1], l = dist(a, p), n = Math.max(1, Math.ceil(l / 0.1));
      for (let k = 1; k <= n; k++) {
        const q = { x: a.x + (p.x - a.x) * (k / n), y: a.y + (p.y - a.y) * (k / n) };
        fait += l / n;
        const s = surfaceA(q);
        if (s && s !== vu && s.t !== (vu?.t)) { u.x = q.x; u.y = q.y; stop = entrerSurface(u, s, true); }
        vu = s;
        if (S.phase === 'exploration' && u.camp === 'h' && !S.repere) {      // repéré en marchant : il s'arrête là
          const e = quiVoit(q);
          if (e) { S.repere = { e: e.id, h: u.id }; stop = true; }
          // arrivé tout près sans être vu (le moulin : les bêtes s'occupent du meunier) : le combat commence, par surprise
          const dc = !e && S.declencheurs.find((o) => !o.fait && Math.hypot(q.x - o.x, q.y - o.y) <= o.rayon && S.unites.some((x) => x.camp === 'e' && !x.mort && x.groupe === o.groupe));
          if (dc) { dc.fait = true; S.repere = { e: null, h: u.id, groupe: dc.groupe, surprise: true }; stop = true; }
        }
        if (S.phase === 'exploration' && u.camp === 'h') {
          if (meneur) avancerRondes(l / n);
          for (const c of S.cachettes) if (!c.trouvee && !c.reperee && !c.essais.includes(u.id) && Math.hypot(q.x - c.x, q.y - c.y) <= 3.5) {   // la perception passive
            c.essais.push(u.id);
            const k = d(20), ok = k >= c.dd;
            if (ok) c.reperee = true;
            ev({ type: 'perception', id: u.id, k, ok, cachette: c.id });
            log(ok ? `${u.nom} remarque quelque chose (perception, d20 : ${k}).` : `${u.nom} passe sans rien remarquer (perception, d20 : ${k}).`, ok ? 'bon' : 'muet');
          }
          for (const c of S.curiosites) if (c.fuit && !c.parti && Math.hypot(q.x - c.x, q.y - c.y) <= c.portee) {
            c.parti = true; c.couronne = true;
            log('Quelque chose file entre les pierres… et laisse briller quelque chose derrière lui.', 'muet');
            ev({ type: 'curiosite', id: c.id, fuite: true });
          }
          const po = S.portes.find((o) => o.ouverte && o.sortie && Math.hypot(q.x - o.sortie.x, q.y - o.sortie.y) <= o.sortie.rayon);
          if (po && !S.arrivee) { S.arrivee = true; stop = true; log('Le groupe passe la porte de la tour.', 'bon'); ev({ type: 'arrivee', id: po.id }); }
        }
        if (S.phase === 'exploration' && u.camp === 'h' && !S.question) {    // arrivé au poteau d'une fourche : le groupe choisit
          const f = S.fourches.find((o) => !o.choisi && Math.hypot(q.x - o.poteau[0], q.y - o.poteau[1]) <= o.rayon);
          if (f) { S.question = { fourche: f.id }; stop = true; }
          const i = S.incidents.find((o) => o.sorte === 'embuscade' && !o.fait && Math.hypot(q.x - o.x, q.y - o.y) <= o.rayon);
          if (i) {                                                          // l'embuscade : les bandits sortent des blés
            S.question = { incident: i.id }; stop = true;
            const sortent = S.unites.filter((o) => o.camp === 'e' && !o.mort && o.groupe === i.id);
            for (const o of sortent) o.cache = false;
            log('Une embuscade ! Des bandits sortent des blés et barrent la route.', 'ennemi');
            ev({ type: 'embuscade', id: i.id, ids: sortent.map((o) => o.id) });
          }
        }
        if (stop || u.mort || u.ko) { parcours.push(q); break; }
      }
      if (stop || u.mort || u.ko) break;
      parcours.push({ ...p });
    }
    const fin = parcours[parcours.length - 1];
    u.x = fin.x; u.y = fin.y;
    ev({ type: 'marche', id: u.id, chemin: parcours.slice(1) });
    if (meneur) for (const e of S.unites) if (e.traceRonde?.length) { ev({ type: 'marche', id: e.id, chemin: e.traceRonde }); e.traceRonde = null; }
    u.t.mv = Math.max(0, u.t.mv - fait);
    if (u.st.aTerre) u.t.mv = 0;
    return fait;
  }
  // Le chemin qu'un héros prendrait jusqu'en (x, y), et sa longueur ; ok : il tient dans son déplacement.
  // `P` : sa portée déjà calculée (l'interface la garde tant qu'il ne bouge pas).
  function apercuMarche(h, x, y, P = portee(h)) {
    if (!peutAgir(h) || !P.atteint({ x, y })) return { ok: false, pts: [], longueur: 0 };
    const pts = chemin(P.carte, h, indiceDe(trame, x, y), genantsDe(h));
    if (!pts.length) return { ok: false, pts: [], longueur: 0 };
    // on finit sur le point visé s'il est en ligne droite du point d'avant, sinon au centre de sa maille
    const exact = [...pts.slice(0, -1), { x, y }];
    if (trajetLibre(trame, exact.length > 1 ? exact[exact.length - 2] : h, { x, y }, genantsDe(h)) && longueurChemin(h, exact) <= h.t.mv + 1e-6) pts.splice(0, pts.length, ...exact);
    const longueur = longueurChemin(h, pts);
    return { ok: longueur <= h.t.mv + 1e-6 && finPossible(h, pts[pts.length - 1]), pts, longueur };
  }
  // Un héros va en (x, y) : le chemin le plus court, s'il tient dans son déplacement.
  function deplacer(h, x, y, P, { meneur = false } = {}) {
    const a = apercuMarche(h, x, y, P);
    if (!a.ok) return false;
    combos = new Set();
    marcher(h, a.pts, meneur);
    return true;
  }

  // --- Les tours ------------------------------------------------------------------------------------------------
  function groupes() {
    if (S.mode === 'equipe') return [{ camp: 'h', ids: S.heros.slice() }, { camp: 'e', ids: S.ennemisIds.filter((id) => { const u = U(id); return u && !u.cache && (!S.groupeActif || u.groupe === S.groupeActif); }) }];
    const gs = [];
    for (const id of S.ordre) {
      const u = U(id); if (!u) continue;
      const der = gs[gs.length - 1];
      if (der && der.camp === u.camp) der.ids.push(id); else gs.push({ camp: u.camp, ids: [id] });
    }
    return gs;
  }
  const groupeCourant = () => groupes()[S.gi];
  function peutAgir(h) {
    if (S.phase === 'exploration') return !!h && h.camp === 'h' && !h.ko && !S.resultat;
    return !!h && h.camp === 'h' && !h.ko && S.phase === 'heros' && !S.resultat && (groupeCourant()?.ids || []).includes(h.id);
  }

  // --- L'exploration (chemin-de-la-tour.md §2 et §3) : on marche librement, les ennemis regardent l'ouest -------------
  const regard = (e) => e.regard ?? Math.PI;     // vers l'ouest, sauf un ennemi qui fait sa ronde (il regarde où il va)
  function quiVoit(p) {                           // le premier ennemi qui voit ce point, ou null
    return ennemisVivants().find((e) => voit(trame.salle, e, p, ENNEMIS[e.type].vueLoin ?? VUE, regard(e))) ?? null;
  }
  function explorer() {
    S.phase = 'exploration'; S.repere = null;
    for (const h of S.unites) if (h.camp === 'h') h.t = { mv: Infinity, action: true, bonus: true, reaction: true };
    log('Exploration : marchez, fouillez, approchez sans vous faire voir.', 'round');
  }
  // Les rondes (le plan validé le 23 oct) : en exploration, certains ennemis vont et viennent (les loups le long du canal, le
  // gardien devant sa porte), à la moitié du pas du héros qui mène ; ils regardent où ils vont, leur champ de vue tourne avec eux.
  function avancerRondes(pas) {
    for (const e of ennemisVivants()) {
      const r = e.ronde; if (!r) continue;
      const l = Math.hypot(r.dx, r.dy) || 1;
      let t = r.t + (r.sens * pas * 0.5) / l;
      if (t > 1 || t < 0) { r.sens = -r.sens; t = Math.max(0, Math.min(1, t)); }
      const x = r.x0 + r.dx * t, y = r.y0 + r.dy * t;
      if (!libre(trame, x, y, S.unites.filter((o) => o !== e && !o.mort && !o.ko && !o.cache))) { r.sens = -r.sens; continue; }
      r.t = t; e.x = x; e.y = y; e.regard = Math.atan2(r.dy * r.sens, r.dx * r.sens);
      const tr = (e.traceRonde ??= []), der = tr[tr.length - 1];
      if (!der || Math.hypot(der.x - x, der.y - y) >= 0.25) tr.push({ x, y });
    }
  }
  // Le combat commence là où chacun se tient. surprise : un héros a frappé sans être vu, les ennemis perdent leur premier tour.
  function engager(surprise, groupe = null) {
    if (S.phase !== 'exploration') return false;
    S.groupeActif = groupe ?? U(S.repere?.e)?.groupe ?? 'principal';
    if (surprise && S.alertes[S.groupeActif]) { surprise = false; log('Ils vous attendaient : le colporteur a parlé. Pas de surprise.', 'ennemi'); }
    if (surprise) for (const e of ennemisVivants()) e.st.surpris = { n: 1 };
    log(surprise ? 'Surprise ! Les ennemis n’ont rien vu venir.' : `${U(S.repere?.e)?.nom ?? 'Un ennemi'} vous a vus !`, 'combo');
    ev({ type: 'engage', surprise: !!surprise, par: S.repere?.e ?? null });
    for (const p of S.portes) if (p.groupe === S.groupeActif && !p.ouverte && !p.herseLevee) { p.herseLevee = true; ev({ type: 'herse', id: p.id, levee: true }); }
    S.phase = 'preparation';
    commencer();
    return true;
  }
  // Après une victoire, dans une aventure : la Caillasse de la rencontre (un tirage par héros), le feu et les flaques
  // passagères s'éteignent, et l'on reprend la marche là où l'on est. Les héros KO restent à terre : on les relève en marchant.
  function reprendre() {
    if (S.resultat !== 'victoire') return 0;
    const g = S.groupeActif ?? 'principal', c = butDe(g);
    const [a, b] = c?.recompense ?? S.recompense ?? [0, 0];
    let n = 0;
    for (let k = 0; k < S.heros.length; k++) n += a + Math.floor(alea() * (b - a + 1));
    if (c?.objectif === 'proteger' && U(c.but.pnj) && !U(c.but.pnj).mort) { n += c.but.bonus; log(`${U(c.but.pnj).nom} est sauf : +${c.but.bonus} Caillasse.`, 'bon'); }
    S.caillasse += n;
    for (const k of Object.keys(S.surfaces)) if (S.surfaces[k].ttl != null) delete S.surfaces[k];
    for (const u of S.unites) if (u.camp === 'h') { delete u.st.brulure; delete u.st.huile; delete u.st.trempe; delete u.st.gele; delete u.st.aTerre; u.expose = false; }
    for (const u of S.unites) if (u.cache && u.groupe === (S.groupeActif ?? 'principal')) u.mort = true;
    S.resultat = null; S.fin = null; S.groupeActif = null;
    log(`Victoire : ${n} Caillasse. La route continue.`, 'bon');
    ev({ type: 'surfaces' });
    for (const p of S.portes) if (p.groupe === g && !p.ouverte) ouvrir(p.id);
    explorer();
    return n;
  }
  // La porte de la tour : son combat gagné, la herse se lève (l'obstacle de la porte s'en va).
  function ouvrir(id) {
    const p = S.portes.find((o) => o.id === id); if (!p || p.ouverte) return false;
    const o = trame.salle.obstacles.find((x) => x.porte === id);
    if (o) retirerObstacle(trame, o);
    p.ouverte = true;
    log('La herse se lève : la porte de la tour est ouverte.', 'bon');
    ev({ type: 'porte', id });
    return true;
  }
  // Les objets des combats (le plan validé le 23 oct) : couper la corde du pont du gué (ceux qui sont dessus tombent à l'eau),
  // ouvrir la vanne du bief (la cour du moulin est inondée : tous Trempés, la Foudre est prête), lâcher la herse de la porte
  // (qui est dessous prend 10 et est Étourdi ; les renforts restent bloqués derrière). Une fois chacun ; l'action du héros.
  // Si un autre héros a poussé quelqu'un dans la zone ce tour-ci, c'est un combo.
  const dansZone = (z, u) => u.x >= z.x0 && u.x <= z.x1 && u.y >= z.y0 && u.y <= z.y1;
  function levierPossible(h, l) {
    if (!l || l.fait || !peutAgir(h) || dist(h, l) > CONTACT + 0.8) return false;
    if (S.phase === 'heros' && !h.t.action) return false;
    if (!S.unites.some((u) => u.camp === 'e' && !u.mort && u.groupe === l.groupe)) return false;      // son combat est fini
    if (l.sorte === 'herse' && !S.portes.find((p) => p.id === l.porte)?.herseLevee) return false;
    return true;
  }
  function apercuLevier(id) {
    const l = S.leviers.find((o) => o.id === id); if (!l || l.fait) return null;
    return { id, nom: l.nom, zone: l.zone, touches: S.unites.filter((u) => !u.mort && !u.ko && !u.cache && dansZone(l.zone, u)).map((u) => ({ id: u.id, camp: u.camp })) };
  }
  function actionner(h, id) {
    const l = S.leviers.find((o) => o.id === id);
    if (!levierPossible(h, l)) return false;
    const explo = S.phase === 'exploration';
    if (!explo) h.t.action = false;
    l.fait = true; combos = new Set();
    const pris = S.unites.filter((u) => !u.mort && !u.ko && !u.cache && dansZone(l.zone, u));
    const prepare = (u) => (u.poussePar?.round === S.round && u.poussePar.par !== h.id ? u.poussePar.par : null);
    ev({ type: 'levier', id, sorte: l.sorte, h: h.id, zone: l.zone });
    if (l.sorte === 'corde') {
      log(`${h.nom} coupe la corde : le pont s’effondre !`, 'combo');
      for (const f of l.fosses) ajouterObstacle(trame, { ...f });
      for (const u of pris) { const p = prepare(u); if (p) combo(p, h.id, 'le pont s’effondre'); chute(u, trame.salle.obstacles.find((o) => o.fosse && dansForme(o, u.x, u.y)) ?? l.fosses[0], h.id); }
    } else if (l.sorte === 'vanne') {
      log(`${h.nom} ouvre la vanne : l’eau du bief inonde la cour du moulin !`, 'combo');
      peindreRect(l.zone, () => ({ t: 'eau', ttl: 3, par: h.id }));
      for (const u of pris) { u.st.trempe = { ttl: 3, par: h.id }; delete u.st.brulure; }
      ev({ type: 'surfaces' });
    } else if (l.sorte === 'herse') {
      const po = S.portes.find((o) => o.id === l.porte); po.herseLevee = false;
      log(`${h.nom} lâche la herse !`, 'combo');
      ev({ type: 'herse', id: po.id, levee: false });
      for (const u of pris) {
        const p = prepare(u); if (p) combo(p, h.id, 'la herse tombe');
        blesser(u, 10, h.id);
        if (!u.mort && !u.ko) { u.st.etourdi = { n: 1, par: p }; flotter(u, 'Étourdi !', 'info'); log(`${u.nom} est pris sous la herse : Étourdi.`, 'combo'); }
      }
      const bloques = S.unites.filter((u) => u.cache && !u.mort && u.groupe === l.groupe && u.renfort === 'mi-vie');
      for (const u of bloques) u.mort = true;
      if (bloques.length) log('Les renforts restent bloqués derrière la herse.', 'bon');
    }
    if (explo && !S.resultat) {                    // en exploration : c'est un coup porté, le combat commence (par surprise si personne ne l'a vu)
      S.repere = quiVoit(h) ? { e: quiVoit(h).id, h: h.id } : null;
      engager(!S.repere, l.groupe);
    }
    return true;
  }
  // Ce qu'on cueille en chemin (le plan validé le 23 oct) : les pommes d'un pommier, une herbe qui soigne ; au contact, une fois.
  function cueillir(h, id) {
    const o = S.trouvailles.find((x) => x.id === id);
    if (!o || o.fait || S.phase !== 'exploration' || !peutAgir(h) || dist(h, o) > CONTACT + 0.8) return false;
    o.fait = true;
    const n = Math.min(o.soin, h.pvMax - h.pv); h.pv += n;
    ev({ type: 'trouvaille', id, h: h.id, n, sorte: o.sorte });
    if (n) ev({ type: 'soin', id: h.id, n, pv: h.pv });
    log(o.sorte === 'pommier' ? `${h.nom} secoue le pommier et croque une pomme : +${n} PV.` : `${h.nom} cueille une herbe et la mâche : +${n} PV.`, 'bon');
    return true;
  }
  // Les curiosités du chemin (des clins d'œil, sans histoire) : le canard de l'étang, la planche, la couronne du rat, la statue.
  function curiosite(h, id) {
    const c = S.curiosites.find((o) => o.id === id);
    if (!c || S.phase !== 'exploration' || !peutAgir(h)) return false;
    if (c.fuit) {                                   // la couronne laissée par le rat : au contact
      if (!c.couronne || c.fait || Math.hypot(h.x - c.x, h.y - c.y) > CONTACT + 0.8) return false;
      c.fait = true; c.couronne = false; S.caillasse += c.caillasse;
      log(`${h.nom} ramasse une couronne minuscule : +${c.caillasse} Caillasse.`, 'bon');
      ev({ type: 'curiosite', id, h: h.id, n: c.caillasse });
      return true;
    }
    if (c.parti || dist(h, c) > c.portee) return false;
    if (c.sorte === 'canard') {
      c.faits++;
      const gagne = c.faits >= c.clics && !c.fait;
      if (gagne) { c.fait = true; S.caillasse += c.caillasse; }
      log(gagne ? `Coin coin ! Le canard s’en va bouder… il a laissé ${c.caillasse} Caillasse sur la berge.` : 'Coin !', 'muet');
      ev({ type: 'curiosite', id, h: h.id, n: gagne ? c.caillasse : 0, coin: true });
      return true;
    }
    if (c.sorte === 'planche') {
      c.fait = true; c.parti = true; S.caillasse += c.caillasse;
      log(`${h.nom} trouve une vieille planche à roulettes : +${c.caillasse} Caillasse.`, 'bon');
      ev({ type: 'curiosite', id, h: h.id, n: c.caillasse });
      return true;
    }
    if (c.sorte === 'loup') {
      c.faits++;
      log('Le vent siffle dans la gueule de la statue : on dirait un hurlement.', 'muet');
      ev({ type: 'curiosite', id, h: h.id, hurle: true });
      return true;
    }
    return false;
  }
  // La fourche (chemin-de-la-tour.md §4) : le groupe prend une branche ; un éboulis ferme les autres à leurs deux bouts (les
  // branches se rejoignent : un seul éboulis se contournerait par l'autre bout).
  function choisir(id, brancheId) {
    const f = S.fourches.find((o) => o.id === id), b = f?.branches.find((o) => o.id === brancheId);
    if (!f || f.choisi || !b) return false;
    f.choisi = brancheId; S.question = null;
    const fermees = f.branches.filter((o) => o !== b);
    const arbres = fermees.flatMap((o) => o.tombe);
    for (const r of arbres) ajouterObstacle(trame, { ...r, marche: true, arbre: true });
    log(`Le groupe choisit « ${b.nom || b.id} ». Un éboulis ferme l’autre chemin.`, 'bon');
    S.voie = brancheId;
    if (b.alerte) {                                   // le colporteur bavarde : le péage est prévenu, un bandit de plus l'attend
      S.alertes[b.alerte] = true;
      const enJeu = S.unites.some((u) => u.groupe === b.alerte && !u.mort && !u.cache);   // (un combat déjà gagné ne reçoit personne)
      for (const u of S.unites) if (u.groupe === b.alerte && u.renfort === 'alerte' && !u.mort) { if (enJeu) { u.cache = false; u.renfort = null; } else u.mort = true; }
    } else for (const u of S.unites) if (u.renfort === 'alerte' && !u.mort) u.mort = true;   // (personne ne les prévient : il reste chez lui)
    if (b.relances) { S.relances += b.relances; log(`La vieille borne veille sur le groupe : ${b.relances} relance.`, 'bon'); }
    ev({ type: 'fourche', id, choisi: brancheId, tombe: arbres });
    return true;
  }
  // L'embuscade des champs : payer la rançon, négocier (un d20 de persuasion : dd ou plus, on passe pour le rabais), ou combattre.
  function resoudre(id, choix, h) {
    const i = S.incidents.find((o) => o.id === id);
    if (!i || i.fait || i.sorte !== 'embuscade') return false;
    const partir = (texte) => {
      for (const o of S.unites) if (o.camp === 'e' && o.groupe === i.id) o.mort = true;
      i.fait = true; S.question = null;
      log(texte, 'bon'); ev({ type: 'paye', id: i.id });
    };
    if (choix === 'payer') {
      if (S.caillasse < i.rancon) return false;
      S.caillasse -= i.rancon; partir(`Le groupe paie ${i.rancon} Caillasse : les bandits s’écartent.`);
      return true;
    }
    if (choix === 'negocier' && h) {
      const k = d(20), ok = k >= i.dd;
      ev({ type: 'fouille', id: h.id, k, ok, n: 0, persuasion: true, dd: i.dd });
      if (ok) { const n = Math.min(i.rabais, S.caillasse); S.caillasse -= n; partir(`${h.nom} négocie (d20 : ${k}) : le passage pour ${n} Caillasse.`); return true; }
      log(`${h.nom} négocie (d20 : ${k}) : les bandits refusent.`, 'ennemi');
    }
    if (choix !== 'combattre' && choix !== 'negocier') return false;
    i.fait = true; S.question = null;
    engager(false, i.id);
    return true;
  }
  // Le chariot des champs : le fouiller, c'est risquer son piège (un d20 de prudence : dd ou plus, désamorcé) ; son butin, de toute façon.
  function fouillerChariot(h, id) {
    const i = S.incidents.find((o) => o.id === id);
    if (!i || i.fait || i.sorte !== 'chariot' || !peutAgir(h) || dist(h, i) > CONTACT + 0.8) return false;
    i.fait = true;
    const k = d(20), ok = k >= i.dd;
    ev({ type: 'fouille', id: h.id, k, ok, n: i.caillasse, piege: true, dd: i.dd, degats: ok ? 0 : i.degats });
    if (!ok) blesser(h, i.degats, null);
    S.caillasse += i.caillasse;
    log(ok ? `${h.nom} désamorce le piège du chariot (d20 : ${k}) : ${i.caillasse} Caillasse.` : `Le piège du chariot claque sur ${h.nom} (d20 : ${k}) : ${i.degats} dégâts ; ${i.caillasse} Caillasse.`, ok ? 'bon' : 'mauvais');
    return true;
  }
  // Le colporteur : une potion, au contact de son étal, contre de la Caillasse.
  function acheter(h, id) {
    const c = S.colporteurs.find((o) => o.id === id);
    if (!c || !peutAgir(h) || dist(h, c) > CONTACT + 0.8 || S.caillasse < c.prix) return false;
    S.caillasse -= c.prix; h.potion++;
    ev({ type: 'achat', id: h.id, prix: c.prix });
    log(`${h.nom} achète une potion au colporteur (${c.prix} Caillasse).`, 'bon');
    return true;
  }
  function acheterTonneau(h, id) {
    const c = S.colporteurs.find((o) => o.id === id);
    if (!c?.tonneau || c.tonneauVendu || !peutAgir(h) || dist(h, c) > CONTACT + 0.8 || S.caillasse < c.tonneau) return false;
    S.caillasse -= c.tonneau; c.tonneauVendu = true; S.tonneauxPortes++;
    ev({ type: 'achat', id: h.id, prix: c.tonneau, tonneau: true });
    log(`${h.nom} achète un tonneau d’huile au colporteur (${c.tonneau} Caillasse) : à poser avant un combat.`, 'bon');
    return true;
  }
  function poserTonneau(h) {
    if (!S.tonneauxPortes || S.phase !== 'exploration' || !peutAgir(h)) return false;
    const p = [0, 1, -1, 2].map((a) => ({ x: h.x + Math.cos(a) * 1.1, y: h.y + Math.sin(a) * 1.1 })).find((q) => libre(trame, q.x, q.y, S.unites.filter((u) => !u.mort && !u.ko)));
    if (!p) return false;
    S.tonneauxPortes--;
    const b = { id: `tp${S.tonneaux.length}${Math.round(p.x)}`, x: p.x, y: p.y };
    S.tonneaux.push(b);
    ev({ type: 'tonneau-pose', id: b.id, x: b.x, y: b.y });
    log(`${h.nom} pose le tonneau d’huile. Un coup, une flèche de feu… et tout ce qui est autour brûle.`, 'bon');
    return true;
  }
  // La vieille borne : un d20 sans risque, une fois pour le groupe (la découverte du dé) ; dd ou plus : de la Caillasse.
  function toucherBorne(h, id) {
    const b = S.bornes.find((o) => o.id === id);
    if (!b || b.faite || !peutAgir(h) || dist(h, b) > CONTACT + 0.8) return false;
    b.faite = true;
    const k = d(20), ok = k >= b.dd;
    if (ok) S.caillasse += b.caillasse;
    ev({ type: 'fouille', id: h.id, k, ok, n: ok ? b.caillasse : 0, borne: true, dd: b.dd });
    log(ok ? `${h.nom} touche la vieille borne (d20 : ${k}) : ${b.caillasse} Caillasse !` : `${h.nom} touche la vieille borne (d20 : ${k}) : rien ne se passe.`, ok ? 'bon' : 'muet');
    return true;
  }
  // Fouiller une cachette, au contact : un d20 de perception (comme en combat) ; dd ou plus, on trouve. Une fois par héros.
  function fouiller(h, id) {
    const c = S.cachettes.find((o) => o.id === id);
    if (!c || c.trouvee || !peutAgir(h) || dist(h, c) > CONTACT + 0.3 || c.fouillePar.includes(h.id)) return false;
    c.fouillePar.push(h.id);
    const k = d(20), ok = k >= c.dd;
    let n = 0;
    if (ok) { c.trouvee = true; n = c.caillasse[0] + Math.floor(alea() * (c.caillasse[1] - c.caillasse[0] + 1)); S.caillasse += n; }
    ev({ type: 'fouille', id: h.id, k, ok, n, cachette: id, dd: c.dd });
    log(ok ? `${h.nom} fouille (d20 : ${k}) : ${n} Caillasse !` : `${h.nom} fouille (d20 : ${k}) : rien.`, ok ? 'bon' : 'muet');
    return true;
  }
  function debutTour(u) {
    if (u.mort || u.ko) return;
    if (u.st.brulure) {
      const par = u.st.brulure.par, n = u.type === 'voleur' ? 10 : 5;
      u.st.brulure.n--; if (u.st.brulure.n <= 0) delete u.st.brulure;
      log(`${u.nom} brûle : ${n} dégâts.`, u.camp === 'h' ? 'mauvais' : '');
      blesser(u, n, par);
      if (u.mort || u.ko) return;
    }
    let mv = u.vitesse;
    if (u.st.gele) mv = Math.max(0, mv - 2);
    if (u.st.aTerre) { mv = Math.max(0, mv - u.vitesse / 2); delete u.st.aTerre; log(`${u.nom} se relève (la moitié de son déplacement).`, 'muet'); ev({ type: 'releve', id: u.id }); }
    u.t = { mv, action: true, bonus: true, reaction: true };
    if (u.camp === 'h' && u.res.type === 'Mana') u.res.v = Math.min(u.res.max, u.res.v + 5);
    if (u.camp === 'h' && u.res.type === 'Énergie') u.res.v = u.res.max;          // 3 à chaque tour, le reste est perdu
  }
  function finTour(u) {
    if (u.mort || u.ko) return;
    const s = surfaceA(u);
    if (s && s.t === 'feu') { log(`${u.nom} finit son tour dans le feu.`, u.camp === 'h' ? 'mauvais' : ''); toucheFeu(u, 6, s.par); }
    if (u.st.gele && !u.mort && !u.ko) { u.st.gele.n--; if (u.st.gele.n <= 0) delete u.st.gele; }
  }
  function finRound() {
    for (const k of Object.keys(S.surfaces)) { const s = S.surfaces[k]; if (s.ttl != null) { s.ttl--; if (s.ttl <= 0) delete S.surfaces[k]; } }
    for (const u of S.unites) for (const n of ['trempe', 'huile']) if (u.st[n]) { u.st[n].ttl--; if (u.st[n].ttl <= 0) delete u.st[n]; }
    ev({ type: 'surfaces' });
  }
  function commencer() {
    S.debut = horloge(); S.round = 1; S.gi = 0; S.stats.rounds = [];
    log(`Début du combat · ${S.mode === 'equipe' ? 'tour d’équipe' : 'ordre d’initiative'} · sans cases.`, 'round');
    if (S.mode === 'initiative') {
      const jets = S.unites.filter((u) => u.camp !== 'p').map((u) => ({ id: u.id, v: d(20) + u.dex, dex: u.dex, r: alea() }));
      jets.sort((a, b) => b.v - a.v || b.dex - a.dex || a.r - b.r);
      S.ordre = jets.map((j) => j.id);
      log(`Initiative : ${jets.map((j) => `${U(j.id).court} ${j.v}`).join(' · ')}`, 'muet');
    }
    log('Round 1', 'round');
    ev({ type: 'round', r: 1 });
    avancer();
  }
  // Fait jouer les ennemis jusqu'à la prochaine phase des héros (ou la fin).
  function avancer() {
    for (let garde = 0; garde < 400; garde++) {
      if (S.resultat) return;
      const G = groupes();
      if (S.gi >= G.length) {
        finRound(); S.round++; S.gi = 0; entreeRound(); log(`Round ${S.round}`, 'round'); ev({ type: 'round', r: S.round });
        const arrivent = S.unites.filter((u) => u.cache && !u.mort && u.renfort === S.round && u.groupe === (S.groupeActif ?? 'principal'));
        if (arrivent.length) { for (const u of arrivent) u.cache = false; log(`Des renforts arrivent : ${arrivent.map((u) => u.nom).join(', ')} !`, 'ennemi'); ev({ type: 'renfort', ids: arrivent.map((u) => u.id) }); }
        const c = butDe(S.groupeActif);                // protéger : le PNJ a tenu ses tours, les bêtes s'enfuient
        if (c?.objectif === 'proteger' && S.round > c.but.tours && U(c.but.pnj) && !U(c.but.pnj).mort) {
          log(`${U(c.but.pnj).nom} a tenu ${c.but.tours} tours : les bêtes s’enfuient !`, 'bon');
          fuir(S.groupeActif ?? 'principal'); finir('victoire'); return;
        }
        continue;
      }
      const g = G[S.gi];
      entreeRound();
      if (g.camp === 'h') {
        if (g.ids.every((id) => U(id).ko)) { S.gi++; continue; }
        g.ids.forEach((id) => { combos = new Set(); debutTour(U(id)); });
        if (S.resultat) return;
        prevoir();
        S.phase = 'heros'; S.debutPhase = horloge();
        ev({ type: 'phase', phase: 'heros', ids: g.ids.slice() });
        return;
      }
      S.phase = 'ennemis';
      ev({ type: 'phase', phase: 'ennemis' });
      for (const id of g.ids) {
        const e = U(id); if (!e || e.mort) continue;
        combos = new Set();
        if (e.st.surpris) { delete e.st.surpris; log(`${e.nom} est surpris : il ne joue pas ce tour.`, 'bon'); flotter(e, 'Surpris !', 'info'); continue; }
        if (e.st.etourdi) { delete e.st.etourdi; log(`${e.nom} est Étourdi : il ne joue pas ce tour.`, 'bon'); flotter(e, 'Étourdi !', 'info'); continue; }
        debutTour(e);
        if (!e.mort && !S.resultat) agirEnnemi(e);
        e.intention = null;
        if (!e.mort) finTour(e);
        if (S.resultat) return;
      }
      S.gi++;
    }
  }
  function finPhaseHeros() {
    if (S.phase !== 'heros') return false;
    entreeRound().herosMs += horloge() - S.debutPhase;
    groupeCourant().ids.forEach((id) => { combos = new Set(); finTour(U(id)); });
    if (S.resultat) return true;
    S.gi++;
    avancer();
    return true;
  }

  // --- Les ennemis (leurs habitudes, du kit) --------------------------------------------------------------------
  function plusProcheParChemin(e, heros) {
    const R = carteDistances(trame, [e], { genants: genantsDe(e), penalite: danger(e) });
    let meilleur = null, md = Infinity;
    for (const h of heros) {
      let m = dist(e, h) <= CONTACT ? 0 : Infinity;
      for (let a = 0; a < 8; a++) {
        const p = { x: h.x + Math.cos((a / 8) * Math.PI * 2) * 1.1, y: h.y + Math.sin((a / 8) * Math.PI * 2) * 1.1 };
        if (p.x > 0 && p.y > 0 && p.x < trame.salle.l && p.y < trame.salle.h) m = Math.min(m, R.cout[indiceDe(trame, p.x, p.y)]);
      }
      if (m === Infinity) m = 100 + dist(e, h);
      if (m < md) { md = m; meilleur = h; }
    }
    return meilleur;
  }
  // Choisit où finir son mouvement (le meilleur score), et y marche.
  function allerVers(e, score) {
    const R = carteDe(e);
    let mk = -1, ms = score({ x: e.x, y: e.y }, 0);
    for (let k = 0; k < R.longueur.length; k += 1) {
      if (R.longueur[k] > e.t.mv) continue;
      const p = pointDe(trame, k);
      if (!finPossible(e, p)) continue;
      const s = score(p, R.cout[k]);
      if (s < ms - 1e-9) { ms = s; mk = k; }
    }
    if (mk < 0) return;
    const pts = chemin(R, e, mk, genantsDe(e));
    if (pts.length) marcher(e, pts);
  }
  function approcher(e, t) {
    if (!t || dist(e, t) <= CONTACT || e.t.mv <= 0) return;
    const F = carteDistances(trame, [t], { genants: genantsDe(e).filter((g) => g !== t) });
    const dg = danger(e);
    allerVers(e, (p, cout) => {
      const d0 = dist(p, t);
      const base = d0 <= CONTACT - 0.05 ? 0 : (F.longueur[indiceDe(trame, p.x, p.y)] < Infinity ? F.longueur[indiceDe(trame, p.x, p.y)] : 50 + d0);
      return base + dg(p.x, p.y) * 4 + cout * 0.01;
    });
  }
  function attaqueEnnemie(e, cible) {
    let t = cible;
    const B = S.unites.find((u) => u.camp === 'h' && u.type === 'brute' && !u.ko && u !== t && u.t.reaction && dist(u, t) <= CONTACT);
    if (B) { B.t.reaction = false; log(`Provocation : ${e.nom} attaque ${B.nom} à la place de ${t.nom}.`, 'combo'); ev({ type: 'texte', id: B.id, texte: 'Provocation !' }); t = B; }
    const g = attaquer(e, t, attaqueEnnemi(e));
    if (e.type === 'brt' && g !== 'rate' && !t.ko && !t.mort) pousser(e, t, { longueur: 2 });
  }
  function cibleMelee(e) {
    const heros = ciblesEnnemies(); if (!heros.length) return null;
    const engages = ENNEMIS[e.type].meute ? heros.filter((h) => ennemisVivants().some((o) => o !== e && dist(o, h) <= CONTACT)) : [];
    return e.type === 'brt' ? heros.slice().sort((a, b) => a.pv - b.pv || dist(a, e) - dist(b, e))[0] : plusProcheParChemin(e, engages.length ? engages : heros);
  }
  // Les intentions (le plan validé le 23 oct, comme Into the Breach) : au début de la phase des héros, chaque ennemi dit
  // ce qu'il va faire et à qui ; il s'y tient (sauf si sa cible est tombée ou hors d'atteinte : il frappe alors qui est au contact).
  function prevoir() {
    for (const e of ennemisVivants()) {
      const df = ENNEMIS[e.type];
      let o;
      if (e.st.surpris || e.st.etourdi) o = { quoi: 'passe' };
      else if (e.type === 'gardien-porte') o = e.charge ? { quoi: 'charge' } : e.miVie || e.enGarde ? { quoi: 'garde' } : { quoi: 'frappe', cible: cibleMelee(e)?.id ?? null };
      else if (e.type === 'chef') o = { quoi: S.chefTour < 3 ? 'ordres' : 'zone' };
      else if ((df.atk.portee ?? CONTACT) > CONTACT) {
        if (df.recharge && e.recharge) o = { quoi: 'recharge' };
        else { const t = ciblesEnnemies().sort((a, b) => (vue(trame.salle, e, b) - vue(trame.salle, e, a)) || dist(e, a) - dist(e, b))[0]; o = { quoi: 'tire', cible: t?.id ?? null }; }
      } else o = { quoi: 'frappe', cible: cibleMelee(e)?.id ?? null };
      e.intention = o;
    }
  }
  function agirMelee(e) {
    if (!ciblesEnnemies().length) return;
    const vise = U(e.intention?.cible);
    let t = vise && !vise.ko && !vise.mort ? vise : cibleMelee(e);
    approcher(e, t);
    if (e.mort || S.resultat) return;
    if (!t || t.ko || t.mort || dist(e, t) > CONTACT) t = ciblesEnnemies().filter((h) => dist(e, h) <= CONTACT).sort((a, b) => a.pv - b.pv)[0];
    if (t) attaqueEnnemie(e, t); else log(`${e.nom} avance.`, 'muet');
  }
  function agirArcher(e) {
    if (!herosVivants().length) return;
    const df = ENNEMIS[e.type], garde = df.garde ?? 4, portee = df.atk.portee ?? 8;
    if (df.recharge && e.recharge) { e.recharge = false; log(`${e.nom} recharge son arbalète.`, 'muet'); flotter(e, 'Recharge…', 'info'); return; }
    const dg = danger(e);
    allerVers(e, (p, cout) => {
      let pres = Infinity, voit = false;
      for (const h of ciblesEnnemies()) { const dd = dist(p, h); pres = Math.min(pres, dd); if (!voit && dd <= portee && vue(trame.salle, p, h)) voit = true; }
      return (voit ? Math.abs(pres - garde) * 3 + (pres < garde ? 6 : 0) : 100 + pres) + dg(p.x, p.y) * 4 + cout * 0.15;
    });
    if (e.mort || S.resultat) return;
    const visibles = ciblesEnnemies().filter((h) => dist(e, h) <= portee && vue(trame.salle, e, h)).sort((a, b) => (b.id === e.intention?.cible) - (a.id === e.intention?.cible) || dist(e, a) - dist(e, b));
    if (visibles.length) { attaqueEnnemie(e, visibles[0]); if (df.recharge) e.recharge = true; } else log(`${e.nom} ne voit personne.`, 'muet');
  }
  function agirChef(e) {
    if (S.chefTour < 3) {
      S.ennemisAvantage = true;
      log(`Le chef donne ses ordres (tour ${S.chefTour}/3) : les ennemis ont l’avantage.`, 'ennemi');
      flotter(e, 'Ordres !', 'info');
      S.chefTour++; return;
    }
    S.ennemisAvantage = false; S.chefTour = 1;
    const choisir = () => {
      const hs = herosVivants(), cands = [];
      hs.forEach((a, i) => { cands.push(a); hs.slice(i + 1).forEach((b) => cands.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })); });
      let best = null, bs = 0;
      for (const c of cands) {
        if (dist(e, c) > 6) continue;
        const n = hs.filter((h) => dist(h, c) <= R3).length;
        const s = n * 10 - dist(e, c) * 0.1;
        if (n && s > bs) { bs = s; best = c; }
      }
      return best;
    };
    let c = choisir();
    if (!c) { approcher(e, plusProcheParChemin(e, herosVivants())); c = choisir(); }
    if (!c) { log('Le chef frappe dans le vide.', 'ennemi'); return; }
    ev({ type: 'menace', x: c.x, y: c.y, r: R3 });
    log(`Le chef frappe une zone de ${metres(R3 * 2)} m de large !`, 'ennemi');
    for (const h of herosVivants().filter((h) => dist(h, c) <= R3)) attaquer(e, h, attaqueEnnemi(e));
  }
  // Le gardien (chemin-combats.md §4) : un tour il frappe, le suivant il annonce sa Charge (une ligne montrée au sol), le
  // suivant il la fait ; sous la moitié de ses PV, il charge à chaque tour (il fait la ligne annoncée, puis en annonce une autre).
  // La Charge : 18 + d6 et 3 m de poussée à qui est encore sur la ligne ; s'il finit contre un pilier, un rocher ou la porte,
  // il est Étourdi (le héros qu'il visait, s'il s'est écarté, a préparé le combo).
  function ligneDeCharge(e, vers) {
    const df = ENNEMIS[e.type].charge, l = dist(e, vers) || 1, ux = (vers.x - e.x) / l, uy = (vers.y - e.y) / l;
    const sim = simulerPoussee(trame, { x: e.x - ux, y: e.y - uy }, e, df.longueur, { obstacles: [] });
    const fin = sim.chemin[sim.chemin.length - 1] ?? { x: e.x, y: e.y }, hz = sim.heurte;
    const contre = hz?.pilier ? 'pilier' : hz?.porte ? 'porte' : hz?.rocher ? 'rocher' : hz?.brasero ? 'brasero' : null;
    return { x: e.x, y: e.y, x0: e.x, y0: e.y, x1: fin.x, y1: fin.y, contre, brasero: hz?.brasero ? { x: hz.x, y: hz.y } : null };
  }
  const surLigne = (c, p) => {                    // la distance d'un point à la ligne de charge
    const vx = c.x1 - c.x0, vy = c.y1 - c.y0, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - c.x0) * vx + (p.y - c.y0) * vy) / l2));
    return { d: Math.hypot(p.x - (c.x0 + vx * t), p.y - (c.y0 + vy * t)), px: c.x0 + vx * t, py: c.y0 + vy * t };
  };
  // Poussé, attiré ou projeté avant sa Charge : sa ligne repart de sa nouvelle place, dans la même direction (le retour du
  // propriétaire, 23 oct) ; on peut donc le pousser face à un pilier.
  function recalerCharge(e, par = null) {
    const c = e.charge; if (!c || e.mort) return;
    const l = Math.hypot(c.x1 - c.x0, c.y1 - c.y0) || 1, ux = (c.x1 - c.x0) / l, uy = (c.y1 - c.y0) / l;
    e.charge = { ...ligneDeCharge(e, { x: e.x + ux * 5, y: e.y + uy * 5 }), cible: c.cible, prepare: par ?? c.prepare ?? null };   // (celui qui l'a mis face au pilier prépare le combo)
    log(`La ligne de Charge de ${e.nom} se déplace avec lui${e.charge.contre === 'pilier' ? ' : elle finit contre un pilier !' : '.'}`, e.charge.contre === 'pilier' ? 'combo' : 'muet');
    ev({ type: 'charge', id: e.id, x0: e.charge.x0, y0: e.charge.y0, x1: e.charge.x1, y1: e.charge.y1, recale: true });
  }
  function annoncerCharge(e) {
    const cands = ciblesEnnemies().map((h) => { const c = ligneDeCharge(e, h); return { h, c, n: ciblesEnnemies().filter((o) => surLigne(c, o).d <= 0.8).length }; })
      .filter((o) => dist(o.c, { x: o.c.x1, y: o.c.y1 }) > 1).sort((a, b) => b.n - a.n || dist(e, a.h) - dist(e, b.h));
    if (!cands.length) return false;
    const { h, c } = cands[0];
    e.charge = { ...c, cible: h.camp === 'h' ? h.id : null };
    log(`${e.nom} se met en garde face à ${h.nom} : il chargera au prochain tour (la ligne rouge).`, 'ennemi');
    flotter(e, 'En garde !', 'info');
    ev({ type: 'charge', id: e.id, x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1 });
    return true;
  }
  function charger(e) {
    const c = e.charge, df = ENNEMIS[e.type].charge; e.charge = null;
    log(`${e.nom} charge !`, 'ennemi');
    const A = { nom: df.nom, mod: 2, dmod: 0, base: df.base, de: df.de, melee: true, anim: 'attaque' };
    const touches = ciblesEnnemies().filter((u) => surLigne(c, u).d <= 0.8).sort((a, b) => dist(c, a) - dist(c, b));
    for (const t of touches) {
      if (attaquer(e, t, A) === 'rate' || t.ko || t.mort) continue;
      const s = surLigne(c, t); let vx = t.x - s.px, vy = t.y - s.py;
      if (Math.hypot(vx, vy) < 0.05) { const l = dist(c, { x: c.x1, y: c.y1 }) || 1; vx = -(c.y1 - c.y0) / l; vy = (c.x1 - c.x0) / l; }
      const n = Math.hypot(vx, vy);
      pousser({ id: e.id, nom: e.nom, camp: 'e', x: t.x - vx / n, y: t.y - vy / n }, t, { longueur: df.pousse });
      if (S.resultat) return;
    }
    let fin = { x: c.x1, y: c.y1 };
    if (!finPossible(e, fin)) fin = pointLibreProche(trame, fin, occupants(e));
    ev({ type: 'poussee', id: e.id, chemin: [{ x: (e.x + fin.x) / 2, y: (e.y + fin.y) / 2 }, fin], ruee: true });
    e.x = fin.x; e.y = fin.y;
    if (['pilier', 'rocher', 'porte'].includes(c.contre) && Math.hypot(fin.x - c.x1, fin.y - c.y1) < 0.6) {
      e.st.etourdi = { n: 1, par: c.prepare ?? (c.cible && !touches.some((u) => u.id === c.cible) ? c.cible : null) };
      log(`${e.nom} percute ${c.contre === 'pilier' ? 'un pilier' : c.contre === 'porte' ? 'la porte' : 'un rocher'} : Étourdi !`, 'combo');
      flotter(e, 'Étourdi !', 'info'); ev({ type: 'texte', id: e.id, texte: 'Étourdi !' });
    } else if (c.contre === 'brasero') {
      const br = S.braseros.find((b) => !b.renverse && c.brasero && Math.hypot(b.x - c.brasero.x, b.y - c.brasero.y) < 0.01);
      log(`${e.nom} finit sa charge dans le brasero !`, 'combo');
      toucheFeu(e, 6, null);
      if (br && !e.mort) { br.renverse = true; ev({ type: 'brasero', id: br.id }); }
    }
  }
  function agirGardien(e) {
    if (e.charge) { charger(e); if (!e.mort && !S.resultat && e.miVie && !e.st.etourdi) annoncerCharge(e); return; }
    if (e.miVie || e.enGarde) { e.enGarde = false; if (annoncerCharge(e)) return; }
    e.enGarde = true;                                // au prochain tour, il annonce
    agirMelee(e);
  }
  function agirEnnemi(e) {
    ev({ type: 'agit', id: e.id });
    if (!herosVivants().length) return;
    if (e.type === 'gardien-porte') agirGardien(e);
    else if (e.type === 'chef') agirChef(e);
    else if (e.type === 'archer' || e.type === 'arbaletrier') agirArcher(e);
    else agirMelee(e);
  }

  // --- Ce que les héros peuvent faire ---------------------------------------------------------------------------
  function peutUtiliser(h, cap) {
    if (!peutAgir(h)) return false;
    if (cap.slot === 'action' && !h.t.action) return false;
    if (cap.slot === 'bonus' && !h.t.bonus) return false;
    if (cap.cout && h.res.v < cap.cout) return false;
    if (cap.type === 'potion' && (h.potion < 1 || h.pv >= h.pvMax)) return false;
    if (cap.type === 'brasero' && !braseroProche(h)) return false;
    return true;
  }
  const braseroProche = (h) => S.braseros.find((b) => !b.renverse && dist(h, b) <= CONTACT + 0.3);
  // le foin qui touche un brasero : le point de foin le plus proche, à 3 m au plus
  function foinContre(b) {
    let best = null, bd = 2.2;
    for (const [k, s] of Object.entries(S.surfaces)) { if (s.t !== 'foin') continue; const c = centreMaille(k), dd = Math.hypot(c.x - b.x, c.y - b.y); if (dd < bd) { bd = dd; best = c; } }
    return best;
  }
  // L'aperçu du combo (le survol du brasero) : les mailles de foin qui brûleraient, et qui serait pris dedans.
  function apercuBrasero(id) {
    const b = S.braseros.find((o) => o.id === id); if (!b || b.renverse) return null;
    const p = foinContre(b), mailles = p ? inonder(p, 'foin') : [], vus = new Set(), touches = [];
    for (const k of mailles) for (const u of dedans(k)) if (!vus.has(u.id)) {
      vus.add(u.id);
      touches.push({ id: u.id, camp: u.camp, degats: 6 * (u.type === 'voleur' ? 2 : 1) * (u.st.huile ? 2 : 1), huile: !!u.st.huile });
    }
    return { x: b.x, y: b.y, mailles, touches };
  }
  const aPortee = (h, cap, p) => dist(h, p) <= cap.portee + 1e-6 && (cap.portee <= CONTACT || vue(trame.salle, h, p));
  // Les cibles possibles d'une capacité : des créatures, des tonneaux, et (feu) des taches d'huile.
  function cibles(h, cap) {
    const out = [];
    if (cap.type === 'attaque') {
      ennemisVivants().filter((u) => aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
      S.tonneaux.filter((b) => aPortee(h, cap, b)).forEach((b) => out.push({ id: b.id, tonneau: true }));
    } else if (cap.type === 'poussee') {
      S.unites.filter((u) => !u.mort && !u.ko && u !== h && dist(h, u) <= CONTACT).forEach((u) => out.push({ id: u.id }));
      S.tonneaux.filter((b) => dist(h, b) <= CONTACT).forEach((b) => out.push({ id: b.id, tonneau: true }));
    } else if (cap.type === 'soin') herosVivants().filter((u) => u !== h && dist(h, u) <= cap.portee).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'relever') S.unites.filter((u) => u.camp === 'h' && u.ko && dist(h, u) <= CONTACT).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'huileCible') S.unites.filter((u) => !u.mort && !u.ko && u !== h && aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'brasero') S.braseros.filter((b) => !b.renverse && dist(h, b) <= CONTACT + 0.3).forEach((b) => out.push({ id: b.id, brasero: true }));
    else if (['etatCible', 'attraction', 'moquerie'].includes(cap.type)) ennemisVivants().filter((u) => aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'inspiration') herosVivants().filter((u) => u !== h && dist(h, u) <= cap.portee).forEach((u) => out.push({ id: u.id }));
    return out;
  }
  const zonePossible = (h, cap, p) => dist(h, p) <= cap.portee + 1e-6 && libre(trame, p.x, p.y);
  const huileVisable = (h, cap, p) => cap.el === 'feu' && ['huile', 'foin'].includes(surfaceA(p)?.t) && aPortee(h, cap, p);
  function payer(h, cap) { if (cap.slot === 'action') h.t.action = false; else h.t.bonus = false; if (cap.cout) h.res.v -= cap.cout; }
  // Utiliser une capacité : cible = { id } (créature ou tonneau), ou { x, y } (une zone, une tache d'huile).
  const HOSTILE = new Set(['attaque', 'poussee', 'zone', 'huileCible', 'etatCible', 'attraction', 'moquerie', 'brasero']);
  function utiliser(h, capId, cible = {}) {
    const explo = S.phase === 'exploration', ok = utiliserCapacite(h, capId, cible);
    if (ok && explo && HOSTILE.has(CAPACITES[capId].type) && !S.resultat) {
      // un coup porté sans être vu : la surprise (ou, si celui qui l'a porté était déjà vu, un combat normal)
      S.repere = quiVoit(h) ? { e: quiVoit(h).id, h: h.id } : null;
      // le combat de la cible frappée ; sinon (le brasero, une zone) celui de l'ennemi le plus proche
      const vise = U(cible.id)?.camp === 'e' ? U(cible.id) : ennemisVivants().sort((a, b) => dist(a, h) - dist(b, h))[0];
      engager(!S.repere, U(S.repere?.e)?.groupe ?? vise?.groupe);
    }
    return ok;
  }
  function utiliserCapacite(h, capId, cible = {}) {
    const cap = CAPACITES[capId];
    if (!cap || !peutUtiliser(h, cap)) return false;
    combos = new Set();
    if (cap.type === 'zone') {
      if (!zonePossible(h, cap, cible)) return false;
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: cible.x, y: cible.y });
      log(`${h.nom} · ${cap.nom} à ${metres(dist(h, cible))} m.`);
      poserZone(h, cap, cible);
      return true;
    }
    if (cap.type === 'soinZone') {                // le Cri de ralliement : tous les alliés autour, sans cible à choisir
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: h.x, y: h.y });
      ev({ type: 'zone', x: h.x, y: h.y, r: cap.rayon, surf: 'soin' });
      log(`${h.nom} pousse un cri de ralliement.`, 'bon');
      for (const u of herosVivants().filter((u) => dist(u, h) <= cap.rayon)) {
        const a = Math.min(cap.soin, u.pvMax - u.pv); if (a <= 0) continue;
        u.pv += a; ev({ type: 'soin', id: u.id, n: a, pv: u.pv });
      }
      h.res.v = Math.min(h.res.max, h.res.v + 1);
      return true;
    }
    if (cap.type === 'potion') {
      payer(h, cap); h.potion--;
      const a = Math.min(20, h.pvMax - h.pv); h.pv += a;
      ev({ type: 'soin', id: h.id, n: a, pv: h.pv, potion: true });
      log(`${h.nom} boit sa potion : +${a} PV.`, 'bon');
      return true;
    }
    if (cap.type === 'brasero') {                  // Renverser : le feu prend sur le foin qui touche le brasero
      const br = S.braseros.find((o) => o.id === cible.id);
      if (!br || br.renverse || dist(h, br) > CONTACT + 0.3) return false;
      payer(h, cap); br.renverse = true;
      ev({ type: 'lance', id: h.id, cap: capId, anim: 'attaque', x: br.x, y: br.y });
      ev({ type: 'brasero', id: br.id });
      log(`${h.nom} renverse le brasero.`);
      const p = foinContre(br);
      if (!p || !enflammer(p, h.id)) log('Le brasero s’éteint dans l’herbe : rien à enflammer.', 'muet');
      return true;
    }
    const u = cible.id ? U(cible.id) : null, b = cible.id ? S.tonneaux.find((o) => o.id === cible.id) : null;
    if (cap.type === 'attaque') {
      if (b && aPortee(h, cap, b)) { payer(h, cap); ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: b.x, y: b.y }); log(`${h.nom} · ${cap.nom} sur le tonneau.`); eclaterTonneau(b, h.id, cap.el === 'feu'); return true; }
      if (!u && cible.x != null && huileVisable(h, cap, cible)) { payer(h, cap); ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: cible.x, y: cible.y }); log(surfaceA(cible)?.t === 'foin' ? `${h.nom} tire dans le foin.` : `${h.nom} tire dans l’huile.`); enflammer(cible, h.id); return true; }
      if (!u || u.camp === 'h' || u.mort || !aPortee(h, cap, u)) return false;
      payer(h, cap);
      attaquer(h, u, { ...attaqueHeros(cap), id: capId });
      return true;
    }
    if (cap.type === 'poussee') {
      const t = u ?? b;
      if (!t || dist(h, t) > CONTACT || (u && (u.ko || u.mort || u === h))) return false;
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: 'attaque', x: t.x, y: t.y });
      pousser(h, t, { longueur: cap.longueur, proj: cap.proj });
      if (t.charge) recalerCharge(t, h.id);
      return true;
    }
    if (cap.type === 'soin' && u && u.camp === 'h' && !u.ko && u !== h && dist(h, u) <= cap.portee) {
      payer(h, cap);
      const r = d(6), a = Math.min(15 + r + 2, u.pvMax - u.pv); u.pv += a;
      ev({ type: 'lance', id: h.id, cap: capId, anim: 'sort', x: u.x, y: u.y });
      ev({ type: 'soin', id: u.id, n: a, pv: u.pv });
      log(`${h.nom} soigne ${u.nom} : 15 + ${r} + 2, +${a} PV.`, 'bon');
      h.res.v = Math.min(h.res.max, h.res.v + 1);
      return true;
    }
    if (cap.type === 'relever' && u && u.camp === 'h' && u.ko && dist(h, u) <= CONTACT) {
      payer(h, cap);
      u.ko = false; u.pv = 25; u.t = { mv: 0, action: false, bonus: false, reaction: false }; S.stats.releves++;
      ev({ type: 'ranime', id: u.id, pv: 25 });
      log(`${h.nom} relève ${u.nom} (25 PV). Il rejouera au prochain tour.`, 'bon');
      return true;
    }
    const ennemiVise = u && u.camp === 'e' && !u.mort && aPortee(h, cap, u);
    if (cap.type === 'etatCible' && ennemiVise) {          // le Filet : Gelé
      payer(h, cap); u.st[cap.etat] = { n: 1, par: h.id };
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y });
      ev({ type: 'texte', id: u.id, texte: NOM_ETAT[cap.etat] });
      log(`${h.nom} · ${cap.nom} : ${u.nom} est ${NOM_ETAT[cap.etat]}.`);
      return true;
    }
    if (cap.type === 'attraction' && ennemiVise) {         // la Liane : attire vers soi
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y });
      attirer(h, u, cap.longueur);
      if (u.charge) recalerCharge(u, h.id);
      return true;
    }
    if (cap.type === 'moquerie' && ennemiVise) {           // Exposé : la prochaine attaque contre lui a l'avantage
      payer(h, cap); u.expose = { par: h.id };
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y });
      ev({ type: 'texte', id: u.id, texte: 'Exposé !' });
      log(`${h.nom} se moque de ${u.nom} : il est Exposé.`);
      return true;
    }
    if (cap.type === 'inspiration' && u && u.camp === 'h' && !u.ko && u !== h && dist(h, u) <= cap.portee) {
      payer(h, cap); u.st.inspire = { par: h.id };
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y });
      ev({ type: 'texte', id: u.id, texte: 'Inspiré !' });
      log(`${h.nom} chante pour ${u.nom} : avantage à sa prochaine attaque.`, 'bon');
      return true;
    }
    if (cap.type === 'huileCible' && u && !u.mort && !u.ko && u !== h && aPortee(h, cap, u)) {
      payer(h, cap); u.st.huile = { ttl: 3, par: h.id };
      ev({ type: 'lance', id: h.id, cap: capId, anim: 'tir', x: u.x, y: u.y });
      log(`${h.nom} lance une fiole : ${u.nom} est Huilé.`);
      return true;
    }
    return false;
  }
  // L'aperçu d'une attaque (le survol) : les chances de chaque résultat, les dégâts, ce qui joue.
  function apercu(h, capId, cibleId) {
    const cap = CAPACITES[capId], u = U(cibleId);
    if (!cap || cap.type !== 'attaque' || !u) return null;
    const A = attaqueHeros(cap), c = calculer(h, u, A), o = chances(A, c);
    return { chances: o, degats: Object.fromEntries(Object.keys(o).map((g) => [g, fourchette(A, c, g)])), notes: c.notes, av: c.av };
  }

  // --- La fiche de mesure (comme la Salle d'essai, pour comparer) -----------------------------------------------
  function fiche(notes = {}) {
    const fmt = (ms) => { const s = Math.round(Math.max(0, ms || 0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const tot = Object.values(S.stats.degats).reduce((a, b) => a + b, 0) || 1;
    const rounds = S.stats.rounds.filter((r) => r.herosMs > 0);
    const moy = rounds.length ? rounds.reduce((a, r) => a + r.herosMs, 0) / rounds.length : 0;
    return [
      `Terrain d’entraînement · sans cases · mode : ${S.mode === 'equipe' ? 'tour d’équipe' : 'ordre d’initiative'}`,
      `Résultat : ${S.resultat === 'victoire' ? 'victoire' : S.resultat === 'defaite' ? 'défaite' : 'en cours'} au round ${S.round}, durée ${fmt((S.fin ?? horloge()) - (S.debut ?? horloge()))}`,
      `Phase des héros par round : ${rounds.map((r) => `R${r.r} ${fmt(r.herosMs)}`).join(' · ') || '—'} (moyenne ${fmt(moy)})`,
      `Combos entre héros : ${S.stats.combos.length}${S.stats.combos.length ? ` (${S.stats.combos.map((c) => `R${c.r} ${nomHeros(c.a)} → ${nomHeros(c.b)} : ${c.quoi}`).join(' ; ')})` : ''}`,
      `Prises en tenaille : ${S.stats.tenailles}`,
      `Équipe : ${S.heros.map((id) => nomHeros(id)).join(', ')}`,
      `Dégâts : ${S.heros.map((id) => `${nomHeros(id)} ${S.stats.degats[id]} (${Math.round((S.stats.degats[id] / tot) * 100)} %)`).join(' · ')}`,
      `Héros KO : ${S.stats.ko} · relevés : ${S.stats.releves}`,
      ...Object.entries(notes).filter(([, v]) => v).map(([k, v]) => `${k} : ${v}`),
    ].join('\n');
  }

  return {
    S, U, herosVivants, ennemisVivants, groupes, groupeCourant, peutAgir, peutUtiliser, cibles, zonePossible, huileVisable, aPortee,
    portee, apercuMarche, deplacer, utiliser, apercu, apercuBrasero, braseroProche, foinContre, commencer, explorer, engager, fouiller, quiVoit, cueillir, acheterTonneau, poserTonneau, avancerRondes, regardDe: regard, couvert, prevoir, actionner, levierPossible, apercuLevier, reprendre, choisir, acheter, toucherBorne, resoudre, fouillerChariot, ouvrir, curiosite, ciblesEnnemies, finPhaseHeros, fiche, surfaceA, mailles: () => S.surfaces, MAILLE,
    // « Annuler le déplacement » : une copie de l'état, et la remettre (les événements ne se copient pas)
    instantane: () => JSON.stringify({ ...S, evenements: [] }),
    restaurer(copie) { const o = JSON.parse(copie); for (const k of Object.keys(o)) S[k] = o[k]; S.evenements = []; },
    // pour les tests : des actions directes, sans passer par l'interface
    _: { agirGardien, annoncerCharge, charger, recalerCharge, attaquer, pousser, calculer, chances, noter, fourchette, eclaterTonneau, enflammer, poserZone, agirEnnemi, marcher, carteDe, attaqueHeros },
  };
}
