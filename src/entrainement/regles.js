// Les règles du combat du terrain d'entraînement : celles de la Salle d'essai de Fraps (design/combat-d1/salle-d1.html,
// d'après PAPER_FIGHT_KIT.fr.md et FIGHT_RULES.md), reprises une à une, mais sans cases (FIGHT_RULES « On trial ») :
// les distances sont en cases de 1,5 m, libres, et la géométrie vient de geometrie.js.
//
// Ce module ne dessine rien : il change l'état et publie des événements (S.evenements) que la vue joue ensuite,
// dans l'ordre (une marche, une attaque et son dé, des dégâts…). Un combat entier peut donc se jouer d'un trait (?test).
// Le hasard passe par `alea` (une graine en ?test, pour que tout se rejoue pareil).
import {
  CONTACT, ECART_MIN, dist, metres, vue, enTenaille, carteDistances, chemin, longueurChemin, indiceDe, pointDe,
  libre, simulerPoussee, pointLibreProche, trajetLibre,
} from './geometrie.js';
import { lire } from './reglages-combat.js';   // les nombres qu'on règle à la main (panneau) ; leurs défauts sont les valeurs d'avant

// --- Les classes d'essai (niveau 1, « uniquement pour ce test ») et les ennemis du kit ------------------------------
// Les 4 premières sont les héros du kit D1 ; les 4 suivantes, des classes d'essai faites au budget de
// CLASS_TEMPLATE.fr.md (mission #76, fiches dans design/terrain-entrainement/CLASSES_ESSAI.fr.md).
// Les vraies classes restent celles de chacun (missions #30 à #33).
export const EQUIPE_KIT = ['brute', 'mage', 'voleur', 'gardien'];
// La 9e : le Traqueur au limier, la classe de Paolitus (content/classes/traqueur-au-limier.json), la première vraie classe ici ;
// la 10e : Shadow, la classe de FrapsFTW (content/classes/shadow.json, #198) ; la 11e : Baba Brisenclume, la classe de DonBabaa
// (content/classes/baba-brisenclume.json). Chacune ne se joue que par son auteur (peutJouer).
export const CLASSES_ESSAI = ['brute', 'mage', 'voleur', 'gardien', 'eclaireuse', 'chevalier', 'druide', 'barde', 'traqueur-au-limier', 'shadow', 'baba-brisenclume'];
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
  'traqueur-au-limier': { nom: 'Traqueur', court: 'TRA', auteur: 'PCrrfng', pv: 120, vitesse: 6, dex: 2, res: { type: 'Concentration', v: 0, max: 3 }, role: 'Contrôle · pièges et limier',
    faiblesse: 'Lié à sa bête : si le limier tombe, ses attaques ont le désavantage et il ne lui donne plus d’ordre, jusqu’à ce qu’il le relève (Relever, au contact).',
    passif: 'Le limier : un ordre par tour, en action bonus. Concentration : +1 quand un coéquipier exploite une de ses préparations.',
    capacites: ['arc', 'machoires', 'glu', 'collet', 'lecher', 'mordre', 'rabattre', 'pousser', 'potion', 'relever'] },
  // Shadow (content/classes/shadow.json, par FrapsFTW), au budget de CLASS_TEMPLATE.fr.md : FOR 8, DEX 15 (+2), CON 14 (+2),
  // INT 12, SAG 13, CHA 10 · déplacement 6 cases (2) · Pas dans l'ombre, une préparation (2) · Coup dans le dos, une
  // exploitation (3) renforcée d'un Critique pour 3 Élan (+1) · 2 points restants = +10 PV. PV : 100 + 10 (CON) + 10 = 120.
  shadow: { nom: 'Shadow', court: 'SHA', pv: 120, vitesse: 6, dex: 2, res: { type: 'Élan', v: 0, max: 5 }, role: 'Dégâts · frappe dans le dos', auteur: 'FrapsFTW',
    faiblesse: 'La lumière le trahit : Brûlant ou dans le feu, plus de Pas dans l’ombre.',
    passif: 'Élan : +1 par case parcourue à pied (1,5 m), pas par le Pas dans l’ombre ; il se vide s’il finit son tour sans avoir bougé.',
    capacites: ['dague', 'pasOmbre', 'coupDos', 'coupDos3', 'pousser', 'potion', 'relever'] },
  // Baba Brisenclume (content/classes/baba-brisenclume.json, par DonBabaa) : FOR 15 (+2), DEX 9 (−1), CON 15, 130 PV,
  // déplacement 4 cases (6 m), la Rage de la Brute. Marteau (base) · Enclume et Forge (exploitation) : la Chute d'Enclume
  // une fois par combat, puis la Forge en action bonus près de l'enclume · Tenailles (préparation).
  'baba-brisenclume': { nom: 'Baba Brisenclume', court: 'BAB', auteur: 'DonBabaa', pv: 130, vitesse: 4, dex: -1, res: { type: 'Rage', v: 0, max: 50 }, role: 'Tank · forge pour ses alliés',
    faiblesse: 'Vieux Os : se relever d’À terre lui coûte tout son déplacement, et la glace le renverse sur 1 à 14 ; loin de son enclume, il ne forge pas.',
    passif: 'Marteau lourd : ses poussées vont 1,5 m plus loin. Rage : +10 par coup donné ou reçu.',
    capacites: ['marteau', 'chuteEnclume', 'lameArdente', 'trempe', 'tenailles', 'pousser', 'potion', 'relever'] },
};
// Une classe faite par un joueur (« auteur » : son pseudo GitHub, comme dans content/classes/) ne se joue que par lui ;
// les classes du kit et d'essai, par tout le monde (Paolitus, 20 oct).
const pseudo = (t) => String(t ?? '').trim().toLowerCase();
export const peutJouer = (type, github) => !!HEROS[type] && (!HEROS[type].auteur || (!!github && pseudo(HEROS[type].auteur) === pseudo(github)));
export const classesPour = (github) => CLASSES_ESSAI.filter((c) => peutJouer(c, github));
// une équipe pour ce joueur : une classe qu'il ne peut pas jouer redevient, à sa place, celle du kit
export const equipePour = (equipe, github) => equipe.map((c, k) => (peutJouer(c, github) ? c : EQUIPE_KIT[k]));
// Les familiers : une créature du camp des héros, sans tour à elle (elle obéit à son maître), qu'on peut frapper.
export const FAMILIERS = {
  limier: { nom: 'Limier', court: 'LIM', pv: 30, vitesse: 6, dex: 2, maitre: 'traqueur-au-limier', role: 'Le limier du Traqueur · pas de tour à lui : il obéit à ses ordres' },
};
export const ENNEMIS = {
  sbire: { nom: 'Sbire', pv: 30, vitesse: 5, dex: 0, atk: { nom: 'Coup', base: 8, de: 4, portee: CONTACT, anim: 'attaque' }, habitude: 'frappe le héros le plus proche' },
  archer: { nom: 'Archer', pv: 25, vitesse: 5, dex: 2, atk: { nom: 'Flèche', base: 8, de: 4, portee: 8, anim: 'tir' }, habitude: 'reste à 6 m, tire sur le plus proche qu’il voit' },
  brt: { nom: 'Brute ennemie', pv: 60, vitesse: 5, dex: 0, coriace: true, atk: { nom: 'Charge', base: 14, de: 6, portee: CONTACT, anim: 'attaque' }, habitude: 'charge le héros le plus blessé (en part de ses PV) et le repousse' },
  chef: { nom: 'Chef', pv: 90, vitesse: 5, dex: 1, coriace: true, atk: { nom: 'Frappe du chef', base: 22, de: 8, anim: 'attaque' }, habitude: 'tours 1–2 : avantage aux ennemis · tour 3 : une zone de 5 m' },
};
const R2 = 1.7 / 1.5, R3 = 2.5 / 1.5;        // les zones 2×2 et 3×3 : des cercles de 1,7 m et 2,5 m de rayon
const RP = 0.5;                              // un piège : un cercle de 0,75 m
const TENU = 3;                              // le Pas dans l'ombre de Shadow : un ennemi qu'un allié serre à 4,5 m au plus
export const CAPACITES = {
  fracas: { nom: 'Fracas', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, anim: 'attaque', ds: 'Au contact · 5–7 / 11–14 / 22–28' },
  projection: { nom: 'Projection', slot: 'bonus', type: 'poussee', portee: CONTACT, longueur: 3, proj: true, ds: 'Pousse de 4,5 m ; s’il heurte quelque chose : +8 et À terre' },
  projection20: { nom: 'Projection furieuse', slot: 'bonus', type: 'poussee', portee: CONTACT, longueur: 5, proj: true, cout: 20, ds: '20 Rage · pousse de 7,5 m' },
  pousser: { nom: 'Pousser', slot: 'bonus', type: 'poussee', portee: CONTACT, longueur: 2, ds: '3 m ; +8 contre un obstacle ; fossé : sbire éliminé, sinon 20' },
  potion: { nom: 'Potion', slot: 'bonus', type: 'potion', get ds() { return `+${lire('potion.soin')} PV · une seule par héros`; } },
  // l'action commune de tous les héros (#231), hors de la barre : un bouton et la touche D
  desengager: { nom: 'Se désengager', slot: 'bonus', type: 'desengager', ds: 'Ce tour-ci, il s’éloigne sans attaque d’opportunité' },
  relever: { nom: 'Relever', slot: 'action', type: 'relever', portee: CONTACT, get ds() { return `Un allié KO au contact revient à ${lire('releve.pv')} PV`; } },
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
  // Shadow
  pasOmbre: { nom: 'Pas dans l’ombre', slot: 'bonus', type: 'ombre', portee: 5, anim: 'repos', ds: 'Portée 7,5 m · derrière un ennemi qu’un allié serre (4,5 m) : Tenaille' },
  coupDos: { nom: 'Coup dans le dos', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, dansLeDos: true, anim: 'attaque', ds: 'Au contact · 5–7 / 11–14 / 22–28 ; ×2 si Tenaille ou Exposée' },
  coupDos3: { nom: 'Coup dans le dos critique', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, dansLeDos: true, auto: true, cout: 3, anim: 'attaque', ds: '3 Élan · critique assuré · ×2 si Tenaille ou Exposée' },
  moquerie: { nom: 'Moquerie', slot: 'bonus', type: 'moquerie', portee: 6, cout: 2, anim: 'sort', ds: '2 Énergie · un ennemi à 9 m est Exposé : la prochaine attaque contre lui a l’avantage' },
  // le Traqueur au limier : l'arc, un piège posé au sol (un seul à la fois, le premier ennemi qui y entre le déclenche),
  // et un ordre au limier par tour (l'action bonus) : il court à la cible, agit, et revient
  arc: { nom: 'Arc de chasse', slot: 'action', type: 'attaque', portee: 8, mod: 2, base: 8, de: 4, anim: 'tir', ds: 'Portée 12 m · 5–7 / 11–14 / 22–28' },
  machoires: { nom: 'Piège à mâchoires', slot: 'action', type: 'zone', surf: 'piege', piege: 'machoires', rayon: RP, portee: 5, anim: 'sort', ds: 'Un piège à 7,5 m ; le premier ennemi qui y entre est À terre et s’arrête' },
  glu: { nom: 'Piège à glu', slot: 'action', type: 'zone', surf: 'piege', piege: 'glu', rayon: RP, portee: 5, anim: 'sort', ds: 'Un piège à 7,5 m ; le premier ennemi qui y entre est Gelé et s’arrête' },
  collet: { nom: 'Collet', slot: 'action', type: 'zone', surf: 'piege', piege: 'collet', rayon: RP, portee: 5, anim: 'sort', ds: 'Un piège à 7,5 m ; le premier ennemi qui y entre est tiré de 3 m vers le Traqueur' },
  lecher: { nom: 'Lécher les plaies', slot: 'bonus', type: 'soin', chien: true, soin: { base: 8, de: 4, mod: 2 }, portee: 6, anim: 'repos', ds: 'Le limier · 11–14 PV à un allié à 9 m, sans jet ; retire Brûlure, Gelé ou Huilé' },
  mordre: { nom: 'Mordre', slot: 'bonus', type: 'attaque', chien: true, expose: true, portee: 6, mod: 0, base: 5, de: 4, anim: 'repos', ds: 'Le limier · à 9 m · 3–4 / 6–9 / 12–18 ; la cible est Exposée' },
  rabattre: { nom: 'Rabattre', slot: 'bonus', type: 'poussee', chien: true, ennemi: true, portee: 6, longueur: 2, anim: 'repos', ds: 'Le limier · un ennemi à 9 m est poussé de 3 m, à l’opposé du Traqueur (dans un piège, une surface, le fossé)' },
  // Baba Brisenclume : une seule enclume à la fois, qui reste jusqu'à la fin du combat (S.enclume) ; la Forge se fait à son contact
  marteau: { nom: 'Marteau', slot: 'action', type: 'attaque', portee: CONTACT, mod: 2, base: 8, de: 4, anim: 'attaque', ds: 'Au contact · 5–7 / 11–14 / 22–28' },
  chuteEnclume: { nom: 'Chute d’Enclume', slot: 'action', type: 'enclume', portee: 5, mod: 2, base: 14, de: 6, aTerre: true, anim: 'sort',
    ds: 'Une fois par combat · portée 7,5 m · 8–11 / 17–22 / 34–44 ; la cible est À terre ; l’enclume reste : elle bloque le passage, couvre des tirs, et une poussée contre elle fait +8' },
  lameArdente: { nom: 'Lame Ardente', slot: 'bonus', type: 'forge', forge: 'lame', portee: CONTACT, cout: 20, anim: 'attaque',
    ds: '20 Rage · près de l’enclume, sur lui ou un allié au contact · +d6 à sa prochaine attaque · elle compte comme du feu (Huilé ×2, enflamme l’huile)' },
  trempe: { nom: 'Trempe', slot: 'bonus', type: 'forge', forge: 'trempe', portee: CONTACT, cout: 20, anim: 'attaque',
    ds: '20 Rage · près de l’enclume, sur lui ou un allié au contact · un bouclier de 10' },
  tenailles: { nom: 'Tenailles', slot: 'action', type: 'tenailles', portee: 3, longueur: 2, anim: 'estoc',
    ds: 'Portée 4,5 m · tire de 3 m vers lui · un ennemi (dans l’huile, le feu, la glace…) · un allié (pour le sauver) · ou son enclume' },
};
export const BABA = 'baba-brisenclume';
export const NOM_SURFACE = { eau: 'l’eau', huile: 'l’huile', feu: 'le feu', glace: 'la glace', piege: 'le piège' };
export const NOM_PIEGE = { machoires: 'les mâchoires', glu: 'la glu', collet: 'le collet' };
export const NOM_RESULTAT = { rate: 'Raté', eraflure: 'Éraflure', touche: 'Touché', critique: 'Critique' };
export const NOM_ETAT = { trempe: 'Trempé', huile: 'Huilé', brulure: 'Brûlure', gele: 'Gelé', aTerre: 'À terre', expose: 'Exposé', inspire: 'Inspiré', lame: 'Lame ardente', bouclier: 'Trempe' };

// --- Les surfaces : des taches sur une trame fine (un demi-pas de case), dessinées sans cases -----------------------
const MAILLE = 0.5;
const cle = (x, y) => `${Math.floor(x / MAILLE)},${Math.floor(y / MAILLE)}`;
const centreMaille = (k) => { const [i, j] = k.split(',').map(Number); return { x: (i + 0.5) * MAILLE, y: (j + 0.5) * MAILLE }; };
const VOISINS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// equipe : la classe de chacun des 4 héros (deux fois la même, c'est permis : on teste).
// ennemis : le groupe d'une salle du donjon, [{ id, type, x, y }] (type : une clé d'ENNEMIS) ; sans lui, les 7 du kit D1
// placés par departs.ennemis. Victoire : le chef vaincu s'il y en a un (les autres s'enfuient), sinon tous les ennemis.
export function creerCombat({ trame, salle, departs, ennemis = null, tonneaux = [], flaque = null, mode = 'equipe', equipe = EQUIPE_KIT, alea = Math.random, horloge = Date.now }) {
  const d = (n) => 1 + Math.floor(alea() * n);
  let combos = new Set();                     // les combos déjà comptés dans l'action en cours

  // --- L'état (des données seulement : on peut le copier pour « Annuler ») ---------------------------------------
  const S = {
    mode, round: 1, gi: 0, phase: 'preparation', ordre: [], unites: [], tonneaux: [], enclume: null, surfaces: {}, journal: [], evenements: [],
    chefTour: 1, ennemisAvantage: false, debut: null, fin: null, debutPhase: null, resultat: null,
    heros: PLACES.slice(), equipe: equipe.slice(), ennemis: [],
    stats: { degats: Object.fromEntries(PLACES.map((p) => [p, 0])), combos: [], tenailles: 0, ko: 0, releves: 0, rounds: [], reles: {}, potions: {} },
  };
  const unite = (o) => Object.assign({ ko: false, mort: false, st: {}, expose: false, coriace: false, t: { mv: o.vitesse, action: true, bonus: true, reaction: true } }, o);
  PLACES.forEach((id, k) => {
    const type = equipe[k], h = HEROS[type], [x, y] = departs.heros[k], pvH = Math.max(1, Math.round(h.pv * lire('heros.pv')));
    const meme = equipe.slice(0, k).filter((t) => t === type).length;     // deux fois la même classe : « Brute 2 »
    S.unites.push(unite({ id, camp: 'h', type, nom: meme ? `${h.nom} ${meme + 1}` : h.nom, court: h.court, x, y, pv: pvH, pvMax: pvH, vitesse: h.vitesse, dex: h.dex, res: { ...h.res }, potion: lire('potion.nb') }));
  });
  for (const [type, f] of Object.entries(FAMILIERS)) {
    for (const m of S.unites.filter((u) => u.camp === 'h' && u.type === f.maitre)) {
      const p = pointLibreProche(trame, { x: m.x + 0.9, y: m.y + 0.5 }, S.unites);
      S.unites.push(unite({ id: `${m.id}-${type}`, camp: 'h', type, familier: true, maitre: m.id, nom: m.nom.replace(HEROS[m.type].nom, f.nom), court: f.court,
        x: p.x, y: p.y, pv: f.pv, pvMax: f.pv, vitesse: f.vitesse, dex: f.dex, res: { type: '', v: 0, max: 0 }, potion: 0 }));
    }
  }
  const TYPE = { s: 'sbire', a: 'archer', br: 'brt', chef: 'chef' };
  // Les ennemis du kit D1 : 3 sbires, 2 archers, la Brute, le chef (réglable : « Difficulté »). Les premiers gardent leur place ;
  // ceux en plus se mettent près du premier de leur sorte.
  function groupeDuKit() {
    const kit = { sbire: ['s1', 's2', 's3'], archer: ['a1', 'a2'], brt: ['br'], chef: ['chef'] };
    const nb = { sbire: lire('ennemis.sbire'), archer: lire('ennemis.archer'), brt: lire('ennemis.brute'), chef: lire('ennemis.chef') };
    const pos = (id) => ({ x: departs.ennemis[id][0], y: departs.ennemis[id][1] });
    const out = [];
    for (const id of ORDRE_ENNEMIS) { const type = TYPE[id] ?? TYPE[id[0]]; if (kit[type].indexOf(id) < nb[type]) out.push({ id, type, ...pos(id) }); }
    for (const type of ['sbire', 'archer', 'brt']) {
      for (let k = kit[type].length; k < nb[type]; k++) {
        const id = `${type === 'sbire' ? 's' : type === 'archer' ? 'a' : 'br'}${k + 1}`, b = pos(kit[type][0]);
        const p = pointLibreProche(trame, { x: b.x + 1.1 * (k - kit[type].length + 1), y: b.y + 0.9 }, [...S.unites, ...out]);
        out.push({ id, type, x: p.x, y: p.y });
      }
    }
    return out.length ? out : [{ id: 's1', type: 'sbire', ...pos('s1') }];          // (aucun ennemi : un sbire, pour qu'il y ait un combat)
  }
  const groupe = ennemis ?? groupeDuKit();
  for (const { id, type, x, y } of groupe) {
    const df = ENNEMIS[type], pvE = Math.max(1, Math.round(df.pv * lire('ennemis.pv')));
    const n = id.match(/\d$/)?.[0];
    S.ennemis.push(id);
    S.unites.push(unite({ id, camp: 'e', type, nom: n ? `${df.nom} ${n}` : df.nom, court: n ? `${df.nom[0]}${n}` : (type === 'chef' ? 'CHEF' : 'BR'), x, y, pv: pvE, pvMax: pvE, vitesse: df.vitesse, dex: df.dex, coriace: !!df.coriace }));
  }
  tonneaux.forEach(([x, y], k) => S.tonneaux.push({ id: `t${k}`, x, y }));
  if (flaque) peindre(flaque.x, flaque.y, flaque.r, () => ({ t: 'eau', ttl: null, par: null }));

  const U = (id) => S.unites.find((u) => u.id === id);
  const herosVivants = () => S.unites.filter((u) => u.camp === 'h' && !u.ko);
  const ennemisVivants = () => S.unites.filter((u) => u.camp === 'e' && !u.mort);
  const estHeros = (id) => !!id && U(id)?.camp === 'h' && !U(id).familier;
  const familierDe = (h) => S.unites.find((u) => u.familier && u.maitre === h?.id) ?? null;
  // Sa place : derrière son maître, à l'opposé de l'ennemi le plus proche (Paolitus : devant, il se faisait viser dès le tour 1).
  const ennemiProche = (m) => S.unites.filter((u) => u.camp === 'e' && !u.mort).sort((a, b) => dist(a, m) - dist(b, m))[0] ?? null;
  function placeFamilier(f, m) {
    const e = ennemiProche(m), l = e ? dist(e, m) : 0;
    const dx = e && l > 0.01 ? (m.x - e.x) / l : -1, dy = e && l > 0.01 ? (m.y - e.y) / l : 0;
    return pointLibreProche(trame, { x: m.x + dx * 0.95, y: m.y + dy * 0.95 }, S.unites.filter((u) => u !== f && !u.mort && !u.ko));
  }
  // Le familier suit son maître : après chaque pas, ordre ou action ennemie, il revient derrière lui s'il s'en est éloigné,
  // ou s'il se retrouve devant lui (plus près de l'ennemi que lui). sansScene : au début du combat, sans le montrer marcher.
  function suivreFamiliers(sansScene = false) {
    for (const f of S.unites.filter((u) => u.familier && !u.ko)) {
      const m = U(f.maitre); if (!m || m.ko) continue;
      const e = ennemiProche(m), devant = !!e && dist(f, e) < dist(m, e) - 0.3;
      if (dist(f, m) <= 1.6 && !devant) continue;
      const p = placeFamilier(f, m);
      f.x = p.x; f.y = p.y;
      if (!sansScene) ev({ type: 'marche', id: f.id, chemin: [{ x: p.x, y: p.y }] });
    }
  }
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
    if (['voleur', 'traqueur-au-limier'].includes(v.type) && v.res.v < v.res.max) { v.res.v = Math.min(v.res.max, v.res.v + lire('concentration.gain')); log(`${v.nom} gagne ${lire('concentration.gain')} Concentration.`, 'muet'); }
  }
  // Les multiplicateurs d'essai (panneau de réglages) : ceux des héros ou des ennemis, et celui de la classe du héros qui frappe.
  const campMult = (u) => (!u ? 1 : u.camp === 'h' ? lire('degats.heros') * (lire(`classe.${u.type}`) ?? 1) : lire('degats.ennemis'));
  const finalDeg = (n, m) => (m === 1 || n <= 0 ? n : Math.max(1, Math.round(n * m)));
  const degatsDe = (g, v, c) => finalDeg(Math.round((g === 'eraflure' ? Math.floor(v / 2) : g === 'critique' ? Math.round(v * lire('des.critMult')) : v) * c.mult), c.dm);
  const rage = (u, n) => { if (u && u.camp === 'h' && u.res?.type === 'Rage') u.res.v = Math.min(u.res.max, u.res.v + n); };
  function blesser(u, n, par, o = {}) {
    if (!u || u.mort || u.ko || n <= 0) return 0;
    if (!o.sansMult) n = finalDeg(n, campMult(U(par)));
    if (!o.sansFaiblesse && u.type === 'mage' && surfaceA(u)?.t === 'eau') { n *= 2; log('La Mage est dans l’eau : dégâts ×2.', 'muet'); }
    if (o.melee && u.type === 'barde') { n += 3; log(`${u.nom} est fragile au contact : +3.`, 'muet'); }
    if (u.st.bouclier) {                             // la Trempe de Baba : le bouclier prend les coups d'abord
      const b = Math.min(u.st.bouclier.v, n);
      u.st.bouclier.v -= b; n -= b;
      log(`La Trempe de ${u.nom} absorbe ${b}${u.st.bouclier.v > 0 ? ` (reste ${u.st.bouclier.v})` : ' : elle se brise'}.`, 'muet');
      if (u.st.bouclier.v <= 0) delete u.st.bouclier;
      ev({ type: 'texte', id: u.id, texte: `Trempe −${b}` });
      if (n <= 0) return 0;
    }
    const avant = u.pv; u.pv -= n;
    if (estHeros(par) && u.camp === 'e') S.stats.degats[par] += Math.min(n, avant);
    ev({ type: 'degats', id: u.id, n, pv: Math.max(0, u.pv) });
    if (u.pv <= 0) tomber(u);
    return n;
  }
  function tomber(u) {
    u.pv = 0; u.st = {}; u.expose = false;
    if (u.familier) {
      u.ko = true; ev({ type: 'ko', id: u.id });
      log(`Le ${u.nom.toLowerCase()} tombe : le ${U(u.maitre)?.nom ?? 'maître'} a le désavantage tant qu’il ne l’a pas relevé.`, 'mauvais');
    } else if (u.camp === 'h') {
      u.ko = true; S.stats.ko++; log(`${u.nom} est KO.`, 'mauvais'); ev({ type: 'ko', id: u.id });
      if (!herosVivants().some((x) => !x.familier)) finir('defaite');
    } else {
      u.mort = true; ev({ type: 'ko', id: u.id });
      log(u.type === 'chef' ? 'Le chef est vaincu ! Les autres s’enfuient.' : `${u.nom} est vaincu.`, 'bon');
      if (u.type === 'chef' || !ennemisVivants().length) finir('victoire');
    }
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
    if (u.st.huile) { m *= lire('mult.feuHuile'); combo(u.st.huile.par, par, 'Huilé puis feu'); delete u.st.huile; }
    if (u.type === 'voleur') m *= 2;
    blesser(u, Math.round(n * m), par);
    if (u.mort || u.ko) return;
    if (u.st.trempe) { delete u.st.trempe; log(`${u.nom} était Trempé : pas de Brûlure.`, 'muet'); } else u.st.brulure = { n: lire('etat.brulure.duree'), par };
  }
  // Entrer dans une tache de surface (en marchant, ou poussé). Renvoie true si l'élan s'arrête (glissé, À terre).
  function entrerSurface(u, s, enMarchant) {
    if (!s || u.mort || u.ko) return false;
    if (s.t === 'piege') return u.camp === 'e' ? declencher(u, s) : false;
    if (s.t === 'eau') { u.st.trempe = { ttl: lire('etat.trempe.duree'), par: s.par }; if (u.st.brulure) { delete u.st.brulure; log(`L’eau éteint ${u.nom}.`, 'muet'); } }
    else if (s.t === 'huile') u.st.huile = { ttl: lire('etat.huile.duree'), par: s.par };
    else if (s.t === 'feu') { log(`${u.nom} entre dans le feu.`, u.camp === 'h' ? 'mauvais' : ''); toucheFeu(u, lire('feu.degats'), s.par); }
    else if (s.t === 'glace' && enMarchant && u.type === 'chevalier') {
      u.st.aTerre = { par: s.par }; log(`${u.nom} pose son armure sur la glace : À terre, sans jet.`, 'mauvais'); return true;
    } else if (s.t === 'glace' && enMarchant) {
      const r = d(20), seuil = u.type === BABA ? 14 : 9;     // Vieux Os : Baba glisse sur 1 à 14
      ev({ type: 'de', id: u.id, k: r, quoi: 'glace', seuil });
      if (r <= seuil) { u.st.aTerre = { par: s.par }; log(`${u.nom} glisse sur la glace (d20 : ${r}) : À terre.`, u.camp === 'h' ? 'mauvais' : 'bon'); return true; }
      log(`${u.nom} garde l’équilibre sur la glace (d20 : ${r}).`, 'muet');
    }
    return false;
  }
  // --- Les pièges du Traqueur : une petite tache « piege » (v : la sorte, id : le piège, sous : la surface d'avant) -------
  let nPieges = 0;
  const apres = [];                                 // ce qui se joue une fois le pas fini (le collet tire)
  function retirerPiege(id) {
    for (const [k, s] of Object.entries(S.surfaces)) if (s.t === 'piege' && s.id === id) { if (s.sous) S.surfaces[k] = s.sous; else delete S.surfaces[k]; }
  }
  function poserPiege(h, cap, centre) {
    for (const s of Object.values(S.surfaces)) if (s.t === 'piege' && s.par === h.id) { retirerPiege(s.id); break; }   // un seul à la fois
    const id = `p${++nPieges}`;
    peindre(centre.x, centre.y, cap.rayon, (vieux) => ({ t: 'piege', v: cap.piege, id, par: h.id, ttl: null, sous: vieux?.t === 'piege' ? null : vieux ?? null }));
    log(`${h.nom} pose ${NOM_PIEGE[cap.piege]} à ${metres(dist(h, centre))} m.`);
    ev({ type: 'surfaces' });
    const pris = ennemisVivants().find((u) => surfaceA(u)?.id === id);     // posé sous un ennemi : il se referme tout de suite
    if (pris) { declencher(pris, surfaceA(pris)); jouerApres(); }
  }
  function declencher(u, s) {
    retirerPiege(s.id);
    ev({ type: 'surfaces' });
    ev({ type: 'piege', id: u.id, v: s.v });
    if (s.v === 'machoires') { u.st.aTerre = { par: s.par }; log(`${u.nom} marche dans les mâchoires : À terre.`, 'bon'); return true; }
    if (s.v === 'glu') { u.st.gele = { n: lire('etat.gele.duree'), par: s.par }; log(`${u.nom} est pris dans la glu : Gelé.`, 'bon'); return true; }
    const t = U(s.par);
    log(`${u.nom} se prend dans le collet.`, 'bon');
    if (t && !t.ko) apres.push(() => attirer(t, u, 2));
    return true;
  }
  function jouerApres() { while (apres.length) apres.shift()(); }
  function enflammer(p, par) {
    const mailles = inonder(p, 'huile'); if (!mailles.length) return false;
    new Set(mailles.map((k) => S.surfaces[k].par)).forEach((a) => combo(a, par, 'huile enflammée'));
    for (const k of mailles) S.surfaces[k] = { t: 'feu', ttl: lire('surface.duree'), par };
    log(`L’huile s’enflamme : ${Math.round(mailles.length * (MAILLE * 1.5) ** 2)} m² en feu.`);
    ev({ type: 'surfaces' });
    for (const k of mailles) for (const u of dedans(k)) toucheFeu(u, lire('feu.degats'), par);
    return true;
  }
  function electrifier(p, par) {
    const mailles = inonder(p, 'eau'); if (!mailles.length) return;
    new Set(mailles.map((k) => S.surfaces[k].par)).forEach((a) => combo(a, par, 'eau électrisée'));
    log(`La foudre électrise l’eau : ${lire('eau.degats')} dégâts à tous ceux qui sont dedans.`);
    ev({ type: 'eclair', mailles: mailles.length });
    const touches = new Set();
    for (const k of mailles) for (const u of dedans(k)) if (!touches.has(u)) { touches.add(u); blesser(u, lire('eau.degats') * (u.type === 'druide' ? 2 : 1), par); }
  }
  function eclaterTonneau(b, par, feu) {
    S.tonneaux = S.tonneaux.filter((o) => o !== b);
    const n = peindre(b.x, b.y, R3, (vieux) => (vieux?.t === 'feu' ? undefined : { t: 'huile', ttl: lire('surface.duree'), par }));
    for (const u of S.unites) if (!u.mort && !u.ko && dist(u, b) <= R3) u.st.huile = { ttl: lire('etat.huile.duree'), par };
    log(`Le tonneau éclate : de l’huile tout autour (${n.length ? metres(R3) : 0} m).`);
    ev({ type: 'tonneau', id: b.id, x: b.x, y: b.y });
    ev({ type: 'surfaces' });
    if (feu) enflammer(b, par);
  }
  function poserZone(h, cap, centre) {
    if (cap.surf === 'piege') { poserPiege(h, cap, centre); return; }
    const par = h.id;
    peindre(centre.x, centre.y, cap.rayon, (vieux) => {
      if (cap.surf === 'eau') return { t: 'eau', ttl: lire('surface.duree'), par };
      if (cap.surf === 'huile') return vieux?.t === 'feu' ? undefined : { t: 'huile', ttl: lire('surface.duree'), par };
      if (vieux?.t === 'eau') combo(vieux.par, par, 'eau gelée');
      if (vieux?.t === 'feu') return { t: 'eau', ttl: lire('surface.duree'), par };
      return { t: 'glace', ttl: lire('surface.duree'), par };
    });
    for (const u of S.unites) {
      if (u.mort || u.ko || dist(u, centre) > cap.rayon) continue;
      if (cap.surf === 'eau') { u.st.trempe = { ttl: lire('etat.trempe.duree'), par }; delete u.st.brulure; }
      else if (cap.surf === 'huile') u.st.huile = { ttl: lire('etat.huile.duree'), par };
      else if (u.camp === 'e') { u.st.gele = { n: lire('etat.gele.duree'), par }; log(`${u.nom} est Gelé.`, 'muet'); }
    }
    ev({ type: 'zone', x: centre.x, y: centre.y, r: cap.rayon, surf: cap.surf });
    ev({ type: 'surfaces' });
  }

  // --- L'enclume de Baba ----------------------------------------------------------------------------------------
  // Un tir passe derrière elle quand elle est sur la ligne, entre le tireur et sa cible (à 0,7 case de la ligne au plus).
  function derriereEnclume(att, cible) {
    const e = S.enclume; if (!e) return false;
    const dx = cible.x - att.x, dy = cible.y - att.y, l2 = dx * dx + dy * dy; if (l2 < 1e-6) return false;
    const t = ((e.x - att.x) * dx + (e.y - att.y) * dy) / l2;
    if (t <= 0.1 || t >= 1) return false;
    return Math.hypot(att.x + dx * t - e.x, att.y + dy * t - e.y) < 0.7;
  }
  const enclumes = () => (S.enclume ? [S.enclume] : []);
  const presDeLEnclume = (h) => !!S.enclume && dist(h, S.enclume) <= CONTACT + 0.15;
  // L'attaque d'un héros qui porte une Lame ardente (la Forge de Baba) : +d6, et du feu.
  const armer = (att, A) => (att.st.lame ? { ...A, el: 'feu', de2: 6, lame: att.st.lame.par } : A);

  // --- Les attaques ---------------------------------------------------------------------------------------------
  function calculer(att, cible, A) {
    let av = false, des = false, mult = 1, tenaille = false;
    const notes = [], aCombos = [];
    if (cible.st.aTerre) { av = true; notes.push('cible À terre : avantage'); if (cible.st.aTerre.par) aCombos.push([cible.st.aTerre.par, 'cible À terre']); }
    if (cible.expose) {
      const mordue = U(cible.expose.par)?.type === 'traqueur-au-limier';          // (Mordre : le limier l'a exposée)
      av = true; notes.push(cible.expose.par ? `la cible est ${mordue ? 'mordue' : 'moquée'} (Exposé) : avantage` : 'la cible a pris la pose : avantage');
      if (cible.expose.par) aCombos.push([cible.expose.par, mordue ? 'cible mordue' : 'cible moquée']);
    }
    if (att.st.inspire) { av = true; notes.push('Inspiré par un chant : avantage'); aCombos.push([att.st.inspire.par, 'chant de bataille']); }
    if (att.type === 'eclaireuse' && !A.melee && S.unites.some((o) => o.camp !== att.camp && !o.mort && !o.ko && dist(o, att) <= CONTACT)) {
      des = true; notes.push('un ennemi au contact de l’Éclaireuse : désavantage');
    }
    if (A.contreGele && cible.st.gele) { mult *= 2; notes.push('cible Gelée : tir lesté ×2'); aCombos.push([cible.st.gele.par, 'Gelé puis tir lesté']); }
    if (A.el === 'foudre' && cible.type === 'druide') { mult *= 2; notes.push('faiblesse du Druide : foudre ×2'); }
    const allies = S.unites.filter((o) => o.camp === att.camp && !o.ko && !o.mort);
    if (lire('des.tenaille') >= 0.5 && A.melee && enTenaille(att, cible, allies)) { av = true; tenaille = true; notes.push('prise en tenaille : avantage'); }
    // la Tenaille posée par le Pas dans l'ombre : elle compte pour celui qui l'a posée, au contact, jusqu'à la fin du round
    const ombre = lire('des.tenaille') >= 0.5 && A.melee && cible.st.tenaille?.par === att.id ? cible.st.tenaille : null;
    if (ombre && !tenaille) { av = true; tenaille = true; notes.push('prise en tenaille (Pas dans l’ombre) : avantage'); }
    if (A.dansLeDos && (tenaille || cible.expose)) {             // le Coup dans le dos de Shadow
      mult *= 2; notes.push(`${tenaille ? 'en Tenaille' : 'Exposée'} : coup dans le dos ×2`);
      const tient = tenaille ? (ombre && U(ombre.tient)) || allies.find((o) => enTenaille(att, cible, [o])) : null;
      if (tient) aCombos.push([tient.id, 'Tenaille puis coup dans le dos']);
    }
    if (att.camp === 'e' && S.ennemisAvantage) { av = true; notes.push('ordres du chef : avantage'); }
    if (surfaceA(att)?.t === 'glace') { des = true; notes.push('attaque depuis la glace : désavantage'); }
    if (att.st.gele) { des = true; notes.push('attaquant Gelé : désavantage'); }
    if (!A.melee && derriereEnclume(att, cible)) { des = true; notes.push('la cible est derrière l’enclume : désavantage'); }
    if (A.lame) notes.push('Lame ardente : +d6, et compte comme du feu');
    if (familierDe(att)?.ko) { des = true; notes.push('son limier est à terre : désavantage'); }
    if (A.el === 'foudre' && cible.st.trempe) { mult *= lire('mult.foudreTrempe'); notes.push(`Trempé : foudre ×${lire('mult.foudreTrempe')}`); aCombos.push([cible.st.trempe.par, 'Trempé puis foudre']); }
    const huile = A.el === 'feu' && !!cible.st.huile;
    if (huile) { mult *= lire('mult.feuHuile'); notes.push(`Huilé : feu ×${lire('mult.feuHuile')}, et Brûlure`); aCombos.push([cible.st.huile.par, 'Huilé puis feu']); }
    if (A.el === 'feu' && cible.type === 'voleur') { mult *= 2; notes.push('faiblesse du Voleur : feu ×2'); }
    if (cible.type === 'mage' && surfaceA(cible)?.t === 'eau') { mult *= 2; notes.push('la Mage est dans l’eau : ×2'); }
    if (A.el === 'foudre' && surfaceA(cible)?.t === 'eau') notes.push('la cible est dans l’eau : électrise toute la flaque (8 à chacun)');
    if (A.el === 'feu' && surfaceA(cible)?.t === 'huile') notes.push('la cible est dans l’huile : tout s’enflamme');
    if (A.aTerre) notes.push('la cible sera À terre');
    return { av: av && !des ? 1 : des && !av ? -1 : 0, mult, dm: campMult(att), notes, aCombos, tenaille, huile, coriace: !!cible.coriace };
  }
  const noter = (k, A, c) => (A.auto ? 'critique' : k <= lire('des.rate') ? 'rate' : k >= lire('des.critique') ? 'critique' : k + A.mod <= (c.coriace ? lire('des.eraflureCoriace') : lire('des.eraflure')) ? 'eraflure' : 'touche');
  function chances(A, c) {
    const o = { rate: 0, eraflure: 0, touche: 0, critique: 0 };
    if (A.auto) { o.critique = 1; return o; }
    for (let k = 1; k <= 20; k++) o[noter(k, A, c)] += c.av === 1 ? (2 * k - 1) / 400 : c.av === -1 ? (41 - 2 * k) / 400 : 1 / 20;
    return o;
  }
  function fourchette(A, c, g) {
    const lo = A.base + 1 + A.dmod + (A.de2 ? 1 : 0), hi = A.base + A.de + A.dmod + (A.de2 ?? 0);
    const f = (v) => degatsDe(g, v, c);
    return g === 'rate' ? '0' : `${f(lo)}–${f(hi)}`;
  }
  const attaqueHeros = (cap) => ({ nom: cap.nom, mod: cap.mod, dmod: cap.mod, base: cap.base, de: cap.de, el: cap.el, melee: cap.portee === CONTACT, auto: !!cap.auto, aTerre: !!cap.aTerre, contreGele: !!cap.contreGele, expose: !!cap.expose, dansLeDos: !!cap.dansLeDos, anim: cap.anim });
  const attaqueEnnemi = (e) => { const a = ENNEMIS[e.type].atk; return { nom: a.nom, mod: lire('des.bonusEnnemis'), dmod: 0, base: a.base, de: a.de, melee: a.portee === CONTACT, anim: a.anim }; };
  function rate(u) {
    const r = d(6);
    const T = { 1: 'lâche son arme', 2: 'glisse : À terre', 3: 'pousse un cri de guerre épique… rien ne se passe, l’ennemi le plus proche se moque', 4: 'renverse de l’huile à ses pieds', 5: 'trébuche sur un allié', 6: 'prend la pose : la prochaine attaque contre lui a l’avantage' };
    log(`Raté comique (d6 : ${r}) : ${u.nom} ${T[r]}.`, 'muet');
    if (r === 1 && u.t) u.t.bonus = false;
    if (r === 2) u.st.aTerre = { par: null };
    if (r === 4) { peindre(u.x, u.y, 0.6, () => ({ t: 'huile', ttl: lire('surface.duree'), par: null })); u.st.huile = { ttl: lire('etat.huile.duree'), par: null }; ev({ type: 'surfaces' }); }
    if (r === 6) u.expose = true;
    flotter(u, 'Raté !', 'info');
  }
  function attaquer(att, cible, A) {
    A = armer(att, A);
    if (A.lame) {                                      // la Lame ardente ne sert qu'une fois, touché ou raté
      delete att.st.lame;
      if (A.lame !== att.id) combo(A.lame, att.id, 'lame ardente');
    }
    const c = calculer(att, cible, A);
    let k = 20, jets = [20];
    if (!A.auto) {
      const r1 = d(20), r2 = d(20);
      k = c.av === 1 ? Math.max(r1, r2) : c.av === -1 ? Math.min(r1, r2) : r1;
      jets = c.av ? [r1, r2] : [r1];
    }
    const g = noter(k, A, c);
    cible.expose = false;
    if (att.st.inspire) delete att.st.inspire;          // le chant ne sert qu'une fois
    const qui = `${att.nom} → ${cible.nom} · ${A.nom}`;
    const label = A.auto ? 'critique assuré' : c.av ? `${jets[0]} et ${jets[1]} (${c.av === 1 ? 'avantage' : 'désavantage'}) → ${k}` : String(k);
    ev({ type: 'attaque', de: att.id, vers: cible.id, cap: A.id, anim: A.anim, jets, k, mod: A.auto ? null : A.mod, resultat: g, av: c.av });
    if (g === 'rate') { log(`${qui} · d20 ${label} : Raté !`, att.camp === 'e' ? 'ennemi' : 'mauvais'); if (lire('des.ratesComiques') >= 0.5) rate(att); else flotter(att, 'Raté !', 'info'); return g; }
    const jet = d(A.de) + (A.de2 ? d(A.de2) : 0);
    let n = A.base + jet + A.dmod;
    if (g === 'eraflure') n = Math.floor(n / 2);
    if (g === 'critique') n = Math.round(n * lire('des.critMult'));
    n = finalDeg(Math.round(n * c.mult), c.dm);
    c.aCombos.forEach(([a, w]) => combo(a, att.id, w));
    if (c.tenaille && att.camp === 'h') S.stats.tenailles++;
    log(`${qui} · d20 ${label}${A.auto ? '' : ` + ${A.mod} = ${k + A.mod}`} : ${NOM_RESULTAT[g]} · ${n} dégâts${c.mult > 1 ? ` (×${c.mult})` : ''}`, att.camp === 'e' ? 'ennemi' : '');
    blesser(cible, n, att.id, { sansFaiblesse: true, melee: A.melee, sansMult: true });
    rage(att, lire('rage.gain')); rage(cible, lire('rage.gain'));
    if (!cible.mort && !cible.ko) {
      if (A.aTerre) cible.st.aTerre = { par: att.id };
      if (A.expose) cible.expose = { par: att.id };
      if (c.huile) { delete cible.st.huile; if (cible.st.trempe) delete cible.st.trempe; else cible.st.brulure = { n: lire('etat.brulure.duree'), par: att.id }; }
    }
    if (A.el === 'feu') enflammer(cible, att.id);
    if (A.el === 'foudre' && surfaceA(cible)?.t === 'eau') electrifier(cible, att.id);
    return g;
  }

  // --- Les poussées ---------------------------------------------------------------------------------------------
  function pousser(src, cible, o) {
    const estUnite = !!cible.camp, parHeros = estHeros(src.id) ? src.id : null;
    let longueur = o.longueur * lire('poussee.distance');
    if (estUnite && cible.st.gele) { longueur += 2; combo(cible.st.gele.par, parHeros, 'Gelé puis poussée'); }
    const autres = [...S.unites.filter((u) => !u.mort && !u.ko && u !== cible), ...S.tonneaux.filter((b) => b !== cible), ...enclumes()];
    const sim = simulerPoussee(trame, src, cible, longueur, { obstacles: autres, surGlace: (x, y) => S.surfaces[cle(x, y)]?.t === 'glace' });
    log(`${src.nom} ${o.attire ? 'attire' : o.proj ? 'projette' : 'pousse'} ${estUnite ? cible.nom : 'le tonneau'} de ${metres(sim.parcouru)} m.`, src.camp === 'e' ? 'ennemi' : '');
    ev({ type: 'poussee', id: cible.id, tonneau: !estUnite, chemin: sim.chemin.map((p) => ({ ...p })) });
    let vu = surfaceA(cible);
    for (const p of sim.chemin) {
      cible.x = p.x; cible.y = p.y;
      if (!estUnite) continue;
      const s = surfaceA(p);
      if (s && s !== vu) {
        if (s.par && parHeros && s.par !== parHeros) combo(s.par, parHeros, `${o.attire ? 'attiré' : 'poussé'} dans ${NOM_SURFACE[s.t]}`);
        entrerSurface(cible, s, false);
      }
      vu = s;
      if (cible.mort || cible.ko) break;
    }
    if (!estUnite) { eclaterTonneau(cible, parHeros, false); return; }
    jouerApres();
    if (cible.mort || cible.ko) return;
    if (sim.arret === 'fosse') {
      if (cible.type === 'sbire') { log(`${cible.nom} tombe dans le fossé : éliminé !`, 'bon'); if (parHeros) S.stats.degats[parHeros] += cible.pv; ev({ type: 'chute', id: cible.id }); tomber(cible); }
      else {
        log(`${cible.nom} tombe dans le fossé et remonte : ${lire('poussee.degatsFosse')} dégâts.`);
        ev({ type: 'chute', id: cible.id });
        blesser(cible, lire('poussee.degatsFosse'), src.id);
        const p = pointLibreProche(trame, { x: cible.x, y: trame.salle.obstacles.find((x) => x.fosse).y0 - 0.5 }, S.unites.filter((u) => u !== cible && !u.mort && !u.ko));
        cible.x = p.x; cible.y = p.y;
        ev({ type: 'place', id: cible.id, x: p.x, y: p.y });
      }
    } else if (sim.arret && !(o.attire && sim.heurte === o.attire)) {      // attiré jusqu'au lanceur : il arrive, sans choc
      log(`${cible.nom} heurte ${sim.arret === 'mur' ? (sim.heurte?.rocher ? 'un rocher' : 'la barrière') : sim.heurte === S.enclume ? 'l’enclume' : 'un obstacle'} : +${lire('poussee.degatsMur')}.`);
      if (sim.heurte === S.enclume && S.enclume.par !== parHeros) combo(S.enclume.par, parHeros, 'poussé contre l’enclume');
      blesser(cible, lire('poussee.degatsMur'), src.id);
      if (o.proj && !cible.mort && !cible.ko) { cible.st.aTerre = { par: parHeros }; log(`${cible.nom} est À terre.`, 'muet'); }
    }
  }

  // Attirer (la Liane du Druide) : une poussée vers le lanceur, avec les mêmes chocs, surfaces et chutes.
  function attirer(src, cible, longueur) {
    const derriere = { id: src.id, nom: src.nom, camp: src.camp, x: cible.x + (cible.x - src.x), y: cible.y + (cible.y - src.y) };
    pousser(derriere, cible, { longueur, attire: src });
  }

  // --- Les déplacements -----------------------------------------------------------------------------------------
  // Qui gêne ce marcheur : ses ennemis debout, les tonneaux et l'enclume de Baba (on traverse ses alliés et les KO).
  const genantsDe = (m) => [...S.unites.filter((u) => !u.mort && !u.ko && u.camp !== m.camp), ...S.tonneaux, ...enclumes()];
  const occupants = (m) => [...S.unites.filter((u) => !u.mort && !u.ko && u !== m), ...S.tonneaux, ...enclumes()];
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
  // --- Les attaques d'opportunité (FIGHT_RULES, à l'essai, #231 : comme dans Baldur's Gate 3) --------------------------
  // Le coup au contact qu'une créature donne en réaction : l'attaque de base au contact d'un héros (sans coût), celle d'un
  // ennemi qui frappe au contact (le chef aussi) ; null sans attaque au contact (les archers, la Mage, l'Éclaireuse…).
  function attaqueReflexe(o) {
    if (o.familier) return null;          // le limier n'a pas de tour à lui : il ne frappe que sur l'ordre de son maître
    if (o.camp === 'h') {
      const id = HEROS[o.type].capacites.find((k) => { const c = CAPACITES[k]; return c.type === 'attaque' && c.portee === CONTACT && !c.cout && !c.auto; });
      return id ? { ...attaqueHeros(CAPACITES[id]), id } : null;
    }
    const a = ENNEMIS[o.type].atk;
    return a.portee == null || a.portee === CONTACT ? { ...attaqueEnnemi(o), melee: true } : null;
  }
  const peutReagir = (o, u) => o.camp !== u.camp && !o.mort && !o.ko && o.t.reaction && !!attaqueReflexe(o);
  // Le long d'un chemin, chaque point où le marcheur sort du contact d'une créature d'en face : appelle quitte(o, q, i)
  // (i : l'indice du point du chemin d'où part ce bout ; il rend true pour s'arrêter). Seulement si elle peut réagir.
  function sortiesDeContact(u, pts, quitte) {
    if (u.t.desengage) return;
    const proches = new Set(S.unites.filter((o) => peutReagir(o, u) && dist(o, u) <= CONTACT));
    let a = { x: u.x, y: u.y };
    for (const [i, p] of pts.entries()) {
      const l = dist(a, p), n = Math.max(1, Math.ceil(l / 0.1));
      for (let k = 1; k <= n; k++) {
        const q = { x: a.x + (p.x - a.x) * (k / n), y: a.y + (p.y - a.y) * (k / n) };
        for (const o of S.unites) {
          if (!peutReagir(o, u)) { proches.delete(o); continue; }
          const pres = dist(o, q) <= CONTACT;
          if (pres) proches.add(o);
          else if (proches.has(o)) { proches.delete(o); if (quitte(o, q, i)) return; }
        }
      }
      a = p;
    }
  }
  // L'aperçu : qui frappera ce héros s'il prend ce chemin, avec ses chances de toucher et les dégâts d'un touché.
  function menacesDuChemin(h, pts) {
    const out = [];
    sortiesDeContact(h, pts, (o) => {
      const A = attaqueReflexe(o), c = calculer(o, h, A), ch = chances(A, c);
      out.push({ id: o.id, nom: o.nom, touche: 1 - ch.rate, degats: fourchette(A, c, 'touche') });
    });
    return out;
  }
  function marcher(u, pts) {
    const parcours = [{ x: u.x, y: u.y }];
    let fait = 0, vu = surfaceA(u), stop = false, montre = 0;
    // les attaques d'opportunité : où elles tombent sur le chemin (le point, puis l'attaquant)
    const coups = [];
    sortiesDeContact(u, pts, (o, q) => { coups.push({ o, q }); });
    for (const p of pts) {
      const a = parcours[parcours.length - 1], l = dist(a, p), n = Math.max(1, Math.ceil(l / 0.1));
      for (let k = 1; k <= n; k++) {
        const q = { x: a.x + (p.x - a.x) * (k / n), y: a.y + (p.y - a.y) * (k / n) };
        fait += l / n;
        const s = surfaceA(q);
        if (s && s !== vu && s.t !== (vu?.t)) { u.x = q.x; u.y = q.y; stop = entrerSurface(u, s, true); }
        vu = s;
        // il sort du contact d'une créature d'en face qui a sa réaction : elle frappe, et la marche reprend
        const ici = coups.filter((c) => Math.abs(c.q.x - q.x) < 1e-9 && Math.abs(c.q.y - q.y) < 1e-9);
        for (const { o } of ici) {
          if (stop || u.mort || u.ko || !peutReagir(o, u)) continue;
          parcours.push(q); u.x = q.x; u.y = q.y;
          ev({ type: 'marche', id: u.id, chemin: parcours.slice(montre + 1) }); montre = parcours.length - 1;
          o.t.reaction = false;
          log(`Attaque d’opportunité : ${o.nom} frappe ${u.nom}, qui s’éloigne.`, o.camp === 'e' ? 'ennemi' : 'combo');
          flotter(o, 'Opportunité !', 'info');
          const A = attaqueReflexe(o);
          attaquer(o, u, { ...A, nom: `${A.nom} (opportunité)` });
        }
        if (stop || u.mort || u.ko) { parcours.push(q); break; }
      }
      if (stop || u.mort || u.ko) break;
      parcours.push({ ...p });
    }
    const fin = parcours[parcours.length - 1];
    u.x = fin.x; u.y = fin.y;
    if (parcours.length - 1 > montre) ev({ type: 'marche', id: u.id, chemin: parcours.slice(montre + 1) });
    u.t.mv = Math.max(0, u.t.mv - fait);
    if (u.st.aTerre) u.t.mv = 0;
    jouerApres();
    return fait;
  }
  // Le chemin qu'un héros prendrait jusqu'en (x, y), et sa longueur ; ok : il tient dans son déplacement.
  // `P` : sa portée déjà calculée (l'interface la garde tant qu'il ne bouge pas).
  function apercuMarche(h, x, y, P = portee(h)) {
    if (!peutAgir(h) || !P.atteint({ x, y })) return { ok: false, pts: [], longueur: 0, menaces: [] };
    const pts = chemin(P.carte, h, indiceDe(trame, x, y), genantsDe(h));
    if (!pts.length) return { ok: false, pts: [], longueur: 0, menaces: [] };
    // on finit sur le point visé s'il est en ligne droite du point d'avant, sinon au centre de sa maille
    const exact = [...pts.slice(0, -1), { x, y }];
    if (trajetLibre(trame, exact.length > 1 ? exact[exact.length - 2] : h, { x, y }, genantsDe(h)) && longueurChemin(h, exact) <= h.t.mv + 1e-6) pts.splice(0, pts.length, ...exact);
    const longueur = longueurChemin(h, pts);
    return { ok: longueur <= h.t.mv + 1e-6 && finPossible(h, pts[pts.length - 1]), pts, longueur, menaces: menacesDuChemin(h, pts) };
  }
  // L'Élan (CLASS_TEMPLATE.fr.md §4) : +1 par case parcourue (les morceaux de case s'additionnent pendant le tour), max 5.
  function elan(h, cases) {
    if (h.res?.type !== 'Élan' || cases <= 0) return;
    const avant = Math.floor((h.t.parcouru ?? 0) + 1e-6);
    h.t.parcouru = (h.t.parcouru ?? 0) + cases;
    const n = Math.floor(h.t.parcouru + 1e-6) - avant;
    if (n > 0 && h.res.v < h.res.max) { const g = n * lire('elan.gain'); h.res.v = Math.min(h.res.max, h.res.v + g); flotter(h, `+${g} Élan`, 'info'); }
  }
  // Un héros va en (x, y) : le chemin le plus court, s'il tient dans son déplacement.
  function deplacer(h, x, y, P) {
    const a = apercuMarche(h, x, y, P);
    if (!a.ok) return false;
    combos = new Set();
    elan(h, marcher(h, a.pts));
    suivreFamiliers();
    return true;
  }

  // --- Les tours ------------------------------------------------------------------------------------------------
  function groupes() {
    if (S.mode === 'equipe') return [{ camp: 'h', ids: S.heros.slice() }, { camp: 'e', ids: S.ennemis.slice() }];
    const gs = [];
    for (const id of S.ordre) {
      const u = U(id); if (!u) continue;
      const der = gs[gs.length - 1];
      if (der && der.camp === u.camp) der.ids.push(id); else gs.push({ camp: u.camp, ids: [id] });
    }
    return gs;
  }
  const groupeCourant = () => groupes()[S.gi];
  function peutAgir(h) { return !!h && h.camp === 'h' && !h.ko && S.phase === 'heros' && !S.resultat && (groupeCourant()?.ids || []).includes(h.id); }
  // Plus personne n'a rien à faire : ni déplacement, ni action, ni action bonus (la fin de phase automatique du panneau).
  const rienAFaire = () => S.phase === 'heros' && !S.resultat && groupeCourant().ids.every((id) => { const u = U(id); return !u || u.ko || u.familier || (!u.t.action && !u.t.bonus && u.t.mv < 0.05); });
  function debutTour(u) {
    const f = familierDe(u); if (f) debutTour(f);
    if (u.mort || u.ko) return;
    if (u.st.brulure) {
      const par = u.st.brulure.par, n = lire('etat.brulure.degats') * (u.type === 'voleur' ? 2 : 1);
      u.st.brulure.n--; if (u.st.brulure.n <= 0) delete u.st.brulure;
      log(`${u.nom} brûle : ${n} dégâts.`, u.camp === 'h' ? 'mauvais' : '');
      blesser(u, n, par);
      if (u.mort || u.ko) return;
    }
    let mv = u.vitesse;
    if (u.st.gele) mv = Math.max(0, mv - 2);
    if (u.st.aTerre && u.type === BABA) { mv = 0; delete u.st.aTerre; log(`${u.nom} se relève, et ses vieux os lui prennent tout son déplacement.`, 'muet'); ev({ type: 'releve', id: u.id }); }
    else if (u.st.aTerre) { mv = Math.max(0, mv - u.vitesse / 2); delete u.st.aTerre; log(`${u.nom} se relève (la moitié de son déplacement).`, 'muet'); ev({ type: 'releve', id: u.id }); }
    u.t = { mv, action: true, bonus: true, reaction: true };
    if (u.camp === 'h' && u.res.type === 'Mana') u.res.v = Math.min(u.res.max, u.res.v + lire('mana.gain'));
    if (u.camp === 'h' && u.res.type === 'Énergie') u.res.v = Math.min(u.res.max, lire('energie.gain'));          // 3 à chaque tour, le reste est perdu
  }
  function finTour(u) {
    const f = familierDe(u); if (f) finTour(f);
    if (u.mort || u.ko) return;
    if (u.camp === 'h' && u.res.type === 'Élan' && !(u.t.parcouru > 0) && !u.t.ombre && u.res.v > 0) { u.res.v = 0; log(`${u.nom} est resté immobile : son Élan retombe à 0.`, 'muet'); }
    const s = surfaceA(u);
    if (s && s.t === 'feu') { log(`${u.nom} finit son tour dans le feu.`, u.camp === 'h' ? 'mauvais' : ''); toucheFeu(u, lire('feu.degats'), s.par); }
    if (u.st.gele && !u.mort && !u.ko) { u.st.gele.n--; if (u.st.gele.n <= 0) delete u.st.gele; }
  }
  function finRound() {
    for (const k of Object.keys(S.surfaces)) { const s = S.surfaces[k]; if (s.ttl != null) { s.ttl--; if (s.ttl <= 0) delete S.surfaces[k]; } }
    for (const u of S.unites) for (const n of ['trempe', 'huile']) if (u.st[n]) { u.st[n].ttl--; if (u.st[n].ttl <= 0) delete u.st[n]; }
    for (const u of S.unites) delete u.st.tenaille;            // la Tenaille du Pas dans l'ombre dure un round
    ev({ type: 'surfaces' });
  }
  function commencer() {
    S.debut = horloge(); S.round = 1; S.gi = 0; S.stats.rounds = [];
    suivreFamiliers(true);                          // (les ennemis sont là : le limier se met derrière son maître)
    log(`Début du combat · ${S.mode === 'equipe' ? 'tour d’équipe' : 'ordre d’initiative'} · sans cases.`, 'round');
    if (S.mode === 'initiative') {
      const jets = S.unites.filter((u) => !u.familier).map((u) => ({ id: u.id, v: d(20) + u.dex, dex: u.dex, r: alea() }));
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
      if (S.gi >= G.length) { finRound(); S.round++; S.gi = 0; entreeRound(); log(`Round ${S.round}`, 'round'); ev({ type: 'round', r: S.round }); continue; }
      const g = G[S.gi];
      entreeRound();
      if (g.camp === 'h') {
        if (g.ids.every((id) => U(id).ko)) { S.gi++; continue; }
        g.ids.forEach((id) => { combos = new Set(); debutTour(U(id)); });
        if (S.resultat) return;
        S.phase = 'heros'; S.debutPhase = horloge();
        ev({ type: 'phase', phase: 'heros', ids: g.ids.slice() });
        return;
      }
      S.phase = 'ennemis';
      ev({ type: 'phase', phase: 'ennemis' });
      for (const id of g.ids) {
        const e = U(id); if (!e || e.mort) continue;
        combos = new Set();
        debutTour(e);
        if (!e.mort && !S.resultat) agirEnnemi(e);
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
  // L'IA des ennemis (FIGHT_RULES, « Enemies play their habit with common sense », à l'essai) : ses outils.
  // La moyenne des dégâts d'une attaque (raté, éraflure, touché, critique, chacun avec sa chance), et la chance d'achever.
  function degatsMoyens(A, c) {
    const ch = chances(A, c), m = A.base + (A.de + 1) / 2 + A.dmod;
    return (ch.eraflure * Math.floor(m / 2) + ch.touche * m + ch.critique * m * lire('des.critMult')) * c.mult * c.dm;
  }
  function chanceAchever(A, c, cible) {
    const ch = chances(A, c);
    let p = 0;
    for (const g of ['eraflure', 'touche', 'critique']) {
      let n = 0;
      for (let d = 1; d <= A.de; d++) { const v = A.base + d + A.dmod; if (degatsDe(g, v, c) >= cible.pv) n++; }
      p += (ch[g] * n) / A.de;
    }
    return p;
  }
  // Ce que coûte un chemin en attaques d'opportunité : la moyenne des coups qu'il prendra en route.
  function coutOpportunites(u, pts) {
    let n = 0;
    sortiesDeContact(u, pts, (o) => { const A = attaqueReflexe(o); n += degatsMoyens(A, calculer(o, u, A)); });
    return n;
  }
  // Le calcul d'un coup comme s'il se tenait déjà en p (la tenaille dépend d'où il est).
  function calculerDepuis(att, p, cible, A) {
    const x = att.x, y = att.y;
    att.x = p.x; att.y = p.y;
    try { return calculer(att, cible, A); } finally { att.x = x; att.y = y; }
  }
  // Choisit où finir son mouvement (le meilleur score, le plus bas), et y marche. Les attaques d'opportunité du chemin
  // comptent (× poids) ; elles ne sont vérifiées que sur les meilleurs points (un chemin coûte à calculer), et rester
  // sur place est toujours essayé.
  function allerVers(e, score, poids = 1) {
    const R = carteDe(e), cands = [];
    for (let k = 0; k < R.longueur.length; k += 1) {
      if (R.longueur[k] > e.t.mv) continue;
      const p = pointDe(trame, k);
      if (!finPossible(e, p)) continue;
      cands.push({ k, s: score(p, R.cout[k]) });
    }
    cands.sort((a, b) => a.s - b.s);
    let best = { s: score({ x: e.x, y: e.y }, 0), pts: [] };
    for (const c of cands.slice(0, 16)) {
      if (c.s >= best.s - 1e-9) break;
      const pts = chemin(R, e, c.k, genantsDe(e)), v = c.s + (pts.length ? coutOpportunites(e, pts) * poids : 0);
      if (v < best.s - 1e-9) best = { s: v, pts };
    }
    if (best.pts.length) marcher(e, best.pts);
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
  const estSoigneur = (h) => !!HEROS[h.type]?.capacites.some((c) => ['soin', 'ralliement', 'chant'].includes(c));
  const entame = (h) => h.pv / h.pvMax;            // la part de PV qui reste : plus elle est basse, plus il est blessé
  const cibleBrute = (e, heros = herosVivants()) => heros.slice().sort((a, b) => entame(a) - entame(b) || dist(a, e) - dist(b, e))[0];
  // Un plan contre le héros h : le meilleur point au contact de h où finir ce tour-ci (rester, s'il y est déjà), et ce
  // qu'il vaut, en dégâts : les dégâts moyens (la tenaille compte : l'avantage), achever (×25), se placer en tenaille (+3),
  // moins les coups pris en route, le feu et la glace. null s'il ne peut pas l'atteindre ce tour-ci.
  function planContre(e, h, R, A) {
    const dg = danger(e), cands = [];
    const evaluer = (k, p) => {
      const c = calculerDepuis(e, p, h, A), achever = chanceAchever(A, c, h);
      cands.push({ k, p, c, achever, v: degatsMoyens(A, c) + achever * 25 + (c.tenaille ? 3 : 0) - dg(p.x, p.y) * 4 - (k < 0 ? 0 : R.cout[k] * 0.01) });
    };
    const reste = dist(e, h) <= CONTACT;
    if (reste) evaluer(-1, { x: e.x, y: e.y });
    for (let k = 0; k < R.longueur.length; k++) {
      if (R.longueur[k] > e.t.mv) continue;
      const p = pointDe(trame, k);
      if (dist(p, h) > CONTACT - 0.05 || !finPossible(e, p)) continue;
      evaluer(k, p);
    }
    if (!cands.length) return null;
    const ici = reste ? cands[0] : null;
    cands.sort((a, b) => b.v - a.v);
    let best = null;
    for (const c of [...cands.slice(0, 6), ...(ici ? [ici] : [])]) {
      const pts = c.k < 0 ? [] : chemin(R, e, c.k, genantsDe(e));
      const v = c.v - (pts.length ? coutOpportunites(e, pts) : 0);
      if (!best || v > best.v + 1e-9) best = { ...c, v, pts };
    }
    return best;
  }
  // Le sbire et la Brute ennemie : l'habitude choisit (le plus proche ; le plus blessé, pour la Brute), sauf si un autre
  // plan vaut clairement mieux ce tour-ci (achever, encercler, ne pas prendre un coup pour rien). Personne à portée : il
  // marche vers la cible de son habitude.
  function agirMelee(e) {
    const heros = herosVivants(); if (!heros.length) return;
    const A = attaqueEnnemi(e), R = carteDe(e);
    const habitude = e.type === 'brt' ? cibleBrute(e, heros) : plusProcheParChemin(e, heros);
    let choix = null, habitudeAPortee = false;
    for (const h of heros) {
      const p = planContre(e, h, R, A); if (!p) continue;
      if (h === habitude) habitudeAPortee = true;
      if (e.type === 'brt') p.v += lire('ia.blesse') * (1 - entame(h));           // la Brute : plus il est blessé, mieux c'est
      else if (h === habitude) p.v += lire('ia.proche');                            // le sbire : le plus proche, à valeur presque égale
      if (estSoigneur(h)) p.v += lire('ia.soigneur');          // (0 par défaut : le soigneur n'attire personne)
      if (!choix || p.v > choix.v) choix = { ...p, h };
    }
    if (!choix) {
      approcher(e, habitude);
      if (e.mort || S.resultat) return;
      const t = herosVivants().filter((h) => dist(e, h) <= CONTACT).sort((a, b) => entame(a) - entame(b))[0];
      if (t) attaqueEnnemie(e, t); else log(`${e.nom} avance.`, 'muet');
      return;
    }
    if (choix.h !== habitude) {
      const pourquoi = choix.achever >= 0.5 ? 'à achever ce tour-ci' : !habitudeAPortee ? `${habitude.nom} est hors de portée`
        : choix.c.tenaille ? 'pris en tenaille' : !choix.pts.length ? 'reste au contact plutôt que de prendre un coup en partant' : 'un meilleur coup';
      log(`${e.nom} s’en prend à ${choix.h.nom} : ${pourquoi}.`, 'muet');
    }
    if (choix.pts.length) marcher(e, choix.pts);
    if (e.mort || S.resultat) return;
    const t = !choix.h.ko && dist(e, choix.h) <= CONTACT ? choix.h : herosVivants().filter((h) => dist(e, h) <= CONTACT).sort((a, b) => entame(a) - entame(b))[0];
    if (t) attaqueEnnemie(e, t); else log(`${e.nom} avance.`, 'muet');
  }
  // L'archer : à 4 cases du plus proche, d'où il le voit ; si possible hors de portée des héros qui frappent au contact
  // (leur marche et le contact, au prochain tour) ; les coups pris en partant comptent triple (25 PV : il ne s'y risque
  // pas). Il tire sur le héros qu'il peut achever, sinon sur le plus proche qu'il voit.
  function agirArcher(e) {
    if (!herosVivants().length) return;
    const dg = danger(e), frappeurs = herosVivants().filter((h) => attaqueReflexe(h));
    allerVers(e, (p, cout) => {
      let pres = Infinity, voit = false;
      for (const h of herosVivants()) { const dd = dist(p, h); pres = Math.min(pres, dd); if (!voit && dd <= 8 && vue(trame.salle, p, h)) voit = true; }
      const atteint = frappeurs.filter((h) => dist(p, h) <= h.vitesse + CONTACT).length;
      return (voit ? Math.abs(pres - 4) * 3 + (pres < 4 ? 6 : 0) : 100 + pres) + atteint * 8 + dg(p.x, p.y) * 4 + cout * 0.15;
    }, 3);
    if (e.mort || S.resultat) return;
    const A = attaqueEnnemi(e);
    const visibles = herosVivants().filter((h) => dist(e, h) <= 8 && vue(trame.salle, e, h))
      .map((h) => ({ h, achever: chanceAchever(A, calculer(e, h, A), h) }))
      .sort((a, b) => (b.achever >= 0.5) - (a.achever >= 0.5) || (a.achever >= 0.5 ? b.achever - a.achever : 0) || dist(e, a.h) - dist(e, b.h));
    if (!visibles.length) { log(`${e.nom} ne voit personne.`, 'muet'); return; }
    if (visibles[0].achever >= 0.5 && visibles.some((v) => dist(e, v.h) < dist(e, visibles[0].h))) log(`${e.nom} vise ${visibles[0].h.nom} : à achever ce tour-ci.`, 'muet');
    attaqueEnnemie(e, visibles[0].h);
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
  function agirEnnemi(e) { agirEnnemiSeul(e); suivreFamiliers(); }
  function agirEnnemiSeul(e) {
    ev({ type: 'agit', id: e.id });
    if (!herosVivants().length) return;
    if (e.type === 'chef') agirChef(e);
    else if (e.type === 'archer') agirArcher(e);
    else agirMelee(e);
  }

  // --- Ce que les héros peuvent faire ---------------------------------------------------------------------------
  // La faiblesse de Shadow : Brûlant, ou debout dans le feu, il ne peut plus plonger dans son ombre.
  const trahiParLaLumiere = (h) => !!h.st.brulure || surfaceA(h)?.t === 'feu';
  // Le Pas dans l'ombre : le point où ressortir, au contact de la cible et à l'opposé d'un allié qui la tient (la Tenaille),
  // libre et sans créature ; le plus droit derrière elle d'abord. null s'il n'y en a pas.
  // « Tenu » : un allié à 4,5 m au plus de la cible (la portée courte de CLASS_TEMPLATE), pas forcément collé à elle.
  function sortieOmbre(h, cible) {
    const tiennent = S.unites.filter((o) => o.camp === h.camp && o !== h && !o.ko && !o.mort && dist(o, cible) <= TENU)
      .sort((a, b) => dist(a, cible) - dist(b, cible));
    for (const ecart of [0, 15, -15, 30, -30, 40, -40]) for (const r of [1.2, 1.35, 1.0]) for (const o of tiennent) {
      const a = Math.atan2(cible.y - o.y, cible.x - o.x) + (ecart * Math.PI) / 180;
      const p = { x: cible.x + Math.cos(a) * r, y: cible.y + Math.sin(a) * r };
      if (finPossible(h, p)) return { ...p, tient: o };          // à 40° au plus de l'opposé : l'angle de la Tenaille (135°)
    }
    return null;
  }
  function peutUtiliser(h, cap) {
    if (!peutAgir(h)) return false;
    if (cap.type === 'ombre' && trahiParLaLumiere(h)) return false;
    if (cap.slot === 'action' && !h.t.action) return false;
    if (cap.slot === 'bonus' && !h.t.bonus) return false;
    if (cap.cout && h.res.v < cap.cout) return false;
    if (cap.type === 'potion' && (h.potion < 1 || h.pv >= h.pvMax)) return false;
    if (cap.type === 'desengager' && h.t.desengage) return false;
    if (cap.chien && (!familierDe(h) || familierDe(h).ko)) return false;
    if (cap.type === 'enclume' && h.enclumeTombee) return false;
    if (cap.type === 'forge' && !presDeLEnclume(h)) return false;
    return true;
  }
  // La Chute d'Enclume : elle se pose sur la case visée (l'ennemi visé, ou le sol), jamais sur Baba ni sur un tonneau ;
  // ceux qui s'y tiennent en sont repoussés (degager). null si elle ne peut pas s'y poser.
  function poseEnclume(h, cible) {
    const p = { x: cible.x, y: cible.y };
    if (!libre(trame, p.x, p.y) || dist(h, p) < ECART_MIN || S.tonneaux.some((b) => dist(b, p) < ECART_MIN)) return null;
    return p;
  }
  // Ceux qui sont sur la case de l'enclume en sont repoussés d'une case (1,5 m), à l'opposé de Baba (ou du centre de la
  // case) : une poussée ordinaire (surfaces, fossé, choc +8). Bloqué, on le pose sur le point libre le plus proche.
  function degager(h, p) {
    for (const u of S.unites.filter((o) => !o.mort && !o.ko && o !== h && dist(o, p) < ECART_MIN + 0.05)) {
      const l = dist(u, p), d = l > 0.05 ? { x: (u.x - p.x) / l, y: (u.y - p.y) / l } : { x: (p.x - h.x) / (dist(h, p) || 1), y: (p.y - h.y) / (dist(h, p) || 1) };
      log(`${u.nom} est repoussé de la case de l’enclume.`, u.camp === 'h' ? 'mauvais' : 'bon');
      pousser({ id: h.id, nom: h.nom, camp: h.camp, x: u.x - d.x, y: u.y - d.y }, u, { longueur: 1 });
      if (!u.mort && !u.ko && dist(u, p) < ECART_MIN) {
        const q = pointLibreProche(trame, { x: p.x + d.x * ECART_MIN, y: p.y + d.y * ECART_MIN }, [...S.unites.filter((o) => o !== u && !o.mort && !o.ko), ...S.tonneaux, p]);
        u.x = q.x; u.y = q.y; ev({ type: 'place', id: u.id, x: q.x, y: q.y });
      }
    }
  }
  const aPortee = (h, cap, p) => dist(h, p) <= cap.portee + 1e-6 && (cap.portee <= CONTACT || vue(trame.salle, h, p));
  // Les cibles possibles d'une capacité : des créatures, des tonneaux, et (feu) des taches d'huile.
  function cibles(h, cap) {
    const out = [];
    if (cap.type === 'attaque') {
      ennemisVivants().filter((u) => aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
      S.tonneaux.filter((b) => aPortee(h, cap, b)).forEach((b) => out.push({ id: b.id, tonneau: true }));
    } else if (cap.type === 'poussee') {
      S.unites.filter((u) => !u.mort && !u.ko && u !== h && (!cap.ennemi || u.camp === 'e') && aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
      if (!cap.ennemi) S.tonneaux.filter((b) => dist(h, b) <= CONTACT).forEach((b) => out.push({ id: b.id, tonneau: true }));
    } else if (cap.type === 'soin') herosVivants().filter((u) => u !== h && !(cap.chien && u.familier) && dist(h, u) <= cap.portee).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'relever') S.unites.filter((u) => u.camp === 'h' && u.ko && dist(h, u) <= CONTACT).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'huileCible') S.unites.filter((u) => !u.mort && !u.ko && u !== h && aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
    else if (['etatCible', 'attraction', 'moquerie'].includes(cap.type)) ennemisVivants().filter((u) => aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'ombre') ennemisVivants().filter((u) => aPortee(h, cap, u) && sortieOmbre(h, u)).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'inspiration') herosVivants().filter((u) => u !== h && dist(h, u) <= cap.portee).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'enclume') ennemisVivants().filter((u) => aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'forge') herosVivants().filter((u) => !u.familier && (u === h || dist(h, u) <= CONTACT)).forEach((u) => out.push({ id: u.id }));
    else if (cap.type === 'tenailles') {
      S.unites.filter((u) => !u.mort && !u.ko && u !== h && aPortee(h, cap, u)).forEach((u) => out.push({ id: u.id }));
      if (S.enclume && aPortee(h, cap, S.enclume)) out.push({ id: 'enclume', enclume: true });
    }
    return out;
  }
  // une zone au sol (et la Chute d'Enclume sur le sol : là où elle peut se poser, en vue)
  const zonePossible = (h, cap, p) => dist(h, p) <= cap.portee + 1e-6 && libre(trame, p.x, p.y) && (cap.type !== 'enclume' || (vue(trame.salle, h, p) && !!poseEnclume(h, p)));
  const huileVisable = (h, cap, p) => cap.type === 'attaque' && (cap.el === 'feu' || !!h.st.lame) && surfaceA(p)?.t === 'huile' && aPortee(h, cap, p);
  function payer(h, cap) { if (cap.slot === 'action') h.t.action = false; else h.t.bonus = false; if (cap.cout) h.res.v -= cap.cout; }
  // Utiliser une capacité : cible = { id } (créature ou tonneau), ou { x, y } (une zone, une tache d'huile).
  function utiliser(h, capId, cible = {}) { const ok = utiliserSeul(h, capId, cible); if (ok) suivreFamiliers(); return ok; }
  function utiliserSeul(h, capId, cible = {}) {
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
      h.res.v = Math.min(h.res.max, h.res.v + lire('foi.gain'));
      return true;
    }
    if (cap.type === 'desengager') {          // Se désengager : plus d'attaque d'opportunité pour ce tour
      payer(h, cap); h.t.desengage = true;
      flotter(h, 'Désengagé', 'info');
      log(`${h.nom} se désengage : il peut s’éloigner sans attaque d’opportunité.`);
      return true;
    }
    if (cap.type === 'potion') {
      payer(h, cap); h.potion--; S.stats.potions[h.id] = (S.stats.potions[h.id] ?? 0) + 1;
      const a = Math.min(lire('potion.soin'), h.pvMax - h.pv); h.pv += a;
      ev({ type: 'soin', id: h.id, n: a, pv: h.pv, potion: true });
      log(`${h.nom} boit sa potion : +${a} PV.`, 'bon');
      return true;
    }
    const u = cible.id ? U(cible.id) : null, b = cible.id ? S.tonneaux.find((o) => o.id === cible.id) : null;
    if (cap.type === 'enclume') {                  // la Chute d'Enclume : sur un ennemi (un jet), ou sur le sol
      const e = u && u.camp === 'e' && !u.mort && aPortee(h, cap, u) ? u : null;
      if (!e && !(cible.x != null && zonePossible(h, cap, cible))) return false;
      const p = poseEnclume(h, e ?? cible); if (!p) return false;
      payer(h, cap); h.enclumeTombee = true;
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: p.x, y: p.y, vers: e?.id ?? null });
      ev({ type: 'enclume', x: p.x, y: p.y, chute: true, sur: e?.id ?? null });
      if (e) attaquer(h, e, { ...attaqueHeros(cap), id: capId });          // (avant qu'elle soit posée : elle ne couvre pas sa propre cible)
      degager(h, p);
      S.enclume = { id: 'enclume', x: p.x, y: p.y, par: h.id };
      log(`L’enclume de ${h.nom} reste sur sa case, à ${metres(dist(h, p))} m de lui : elle bloque le passage et couvre des tirs.`);
      const s = surfaceA(p); if (s?.t === 'huile' || s?.t === 'eau') log('Elle s’enfonce dans la flaque, et y reste.', 'muet');
      return true;
    }
    if (cap.type === 'forge') {                    // la Forge : au contact de l'enclume, sur lui ou un allié au contact
      if (!u || u.camp !== 'h' || u.ko || u.familier || (u !== h && dist(h, u) > CONTACT)) return false;
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y, vers: u.id });
      if (cap.forge === 'lame') { u.st.lame = { par: h.id }; ev({ type: 'texte', id: u.id, texte: 'Lame ardente !' }); log(`${h.nom} forge une Lame ardente pour ${u === h ? 'lui-même' : u.nom} : +d6 et du feu à sa prochaine attaque.`, 'bon'); }
      else { u.st.bouclier = { v: 10, par: h.id }; ev({ type: 'texte', id: u.id, texte: 'Trempe : 10' }); log(`${h.nom} trempe l’armure de ${u === h ? 'lui-même' : u.nom} : un bouclier de 10.`, 'bon'); }
      return true;
    }
    if (cap.type === 'tenailles') {                // les Tenailles : un ennemi, un allié ou l'enclume, tiré de 3 m vers lui
      if (cible.id === 'enclume') {
        if (!S.enclume || !aPortee(h, cap, S.enclume)) return false;
        payer(h, cap);
        ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: S.enclume.x, y: S.enclume.y, vers: 'enclume' });
        const derriere = { x: S.enclume.x + (S.enclume.x - h.x), y: S.enclume.y + (S.enclume.y - h.y) };
        const autres = [...S.unites.filter((o) => !o.mort && !o.ko), ...S.tonneaux];
        const sim = simulerPoussee(trame, derriere, S.enclume, cap.longueur, { obstacles: autres });
        const chemin = sim.arret === 'fosse' ? sim.chemin.slice(0, -1) : sim.chemin;      // (elle s'arrête au bord du fossé)
        const dep = { x: S.enclume.x, y: S.enclume.y }, fin = chemin[chemin.length - 1] ?? dep;
        S.enclume.x = fin.x; S.enclume.y = fin.y;
        ev({ type: 'enclume', x: fin.x, y: fin.y, chemin: chemin.map((q) => ({ ...q })) });
        log(`${h.nom} tire son enclume de ${metres(dist(dep, fin))} m vers lui.`);
        return true;
      }
      if (!u || u === h || u.mort || u.ko || !aPortee(h, cap, u)) return false;
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y, vers: u.id });
      attirer(h, u, cap.longueur);
      return true;
    }
    if (cap.type === 'attaque') {
      const feu = cap.el === 'feu' || !!h.st.lame;
      if (b && aPortee(h, cap, b)) { payer(h, cap); delete h.st.lame; ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: b.x, y: b.y }); log(`${h.nom} · ${cap.nom} sur le tonneau.`); eclaterTonneau(b, h.id, feu); return true; }
      if (!u && cible.x != null && huileVisable(h, cap, cible)) { payer(h, cap); delete h.st.lame; ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: cible.x, y: cible.y }); log(`${h.nom} ${cap.portee === CONTACT ? 'frappe' : 'tire dans'} l’huile.`); enflammer(cible, h.id); return true; }
      if (!u || u.camp === 'h' || u.mort || !aPortee(h, cap, u)) return false;
      payer(h, cap);
      if (cap.chien) ev({ type: 'limier', id: familierDe(h).id, vers: u.id });
      attaquer(h, u, { ...attaqueHeros(cap), id: capId });
      if (cap.chien) ev({ type: 'limier', id: familierDe(h).id, retour: true });
      return true;
    }
    if (cap.type === 'poussee') {
      const t = u ?? b;
      if (!t || !aPortee(h, cap, t) || (u && (u.ko || u.mort || u === h)) || (cap.ennemi && u?.camp !== 'e')) return false;
      payer(h, cap);
      if (cap.chien) ev({ type: 'limier', id: familierDe(h).id, vers: t.id });
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.chien ? 'repos' : 'attaque', x: t.x, y: t.y });
      pousser(h, t, { longueur: cap.longueur + (h.type === BABA ? 1 : 0), proj: cap.proj });      // (le Marteau lourd de Baba : +1,5 m)
      if (cap.chien) ev({ type: 'limier', id: familierDe(h).id, retour: true });
      return true;
    }
    if (cap.type === 'soin' && u && u.camp === 'h' && !u.ko && u !== h && !(cap.chien && u.familier) && dist(h, u) <= cap.portee) {
      payer(h, cap);
      const q = cap.soin ?? { base: 15, de: 6, mod: 2 };
      const r = d(q.de), a = Math.min(q.base + r + q.mod, u.pvMax - u.pv); u.pv += a;
      if (cap.chien) ev({ type: 'limier', id: familierDe(h).id, vers: u.id });
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.chien ? 'repos' : 'sort', x: u.x, y: u.y });
      ev({ type: 'soin', id: u.id, n: a, pv: u.pv });
      log(`${cap.chien ? 'Le limier lèche les plaies de' : `${h.nom} soigne`} ${u.nom} : ${q.base} + ${r} + ${q.mod}, +${a} PV.`, 'bon');
      if (cap.chien) {
        const k = ['brulure', 'gele', 'huile'].find((e) => u.st[e]);
        if (k) { delete u.st[k]; ev({ type: 'texte', id: u.id, texte: `${NOM_ETAT[k]} : retiré` }); log(`${u.nom} n’est plus ${NOM_ETAT[k]}.`, 'muet'); }
        ev({ type: 'limier', id: familierDe(h).id, retour: true });
      } else h.res.v = Math.min(h.res.max, h.res.v + lire('foi.gain'));
      return true;
    }
    if (cap.type === 'relever' && u && u.camp === 'h' && u.ko && dist(h, u) <= CONTACT) {
      payer(h, cap);
      const pvRelve = lire('releve.pv');
      u.ko = false; u.pv = pvRelve; u.t = { mv: 0, action: false, bonus: false, reaction: false }; S.stats.releves++; S.stats.reles[h.id] = (S.stats.reles[h.id] ?? 0) + 1;
      ev({ type: 'ranime', id: u.id, pv: pvRelve });
      log(`${h.nom} relève ${u.nom} (${pvRelve} PV). Il rejouera au prochain tour.`, 'bon');
      return true;
    }
    const ennemiVise = u && u.camp === 'e' && !u.mort && aPortee(h, cap, u);
    if (cap.type === 'etatCible' && ennemiVise) {          // le Filet : Gelé
      payer(h, cap); u.st[cap.etat] = { n: lire('etat.gele.duree'), par: h.id };
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y });
      ev({ type: 'texte', id: u.id, texte: NOM_ETAT[cap.etat] });
      log(`${h.nom} · ${cap.nom} : ${u.nom} est ${NOM_ETAT[cap.etat]}.`);
      return true;
    }
    if (cap.type === 'attraction' && ennemiVise) {         // la Liane : attire vers soi
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y });
      attirer(h, u, cap.longueur);
      return true;
    }
    if (cap.type === 'ombre' && ennemiVise) {             // le Pas dans l'ombre : ressortir derrière la cible
      const p = sortieOmbre(h, u); if (!p) return false;
      payer(h, cap);
      ev({ type: 'lance', id: h.id, cap: capId, anim: cap.anim, x: u.x, y: u.y });
      ev({ type: 'ombre', id: h.id, x: p.x, y: p.y, cible: u.id });
      h.x = p.x; h.y = p.y; u.st.tenaille = { par: h.id, tient: p.tient.id };
      log(`${h.nom} plonge dans son ombre et ressort derrière ${u.nom} : pris en Tenaille avec ${p.tient.nom}.`);
      h.t.ombre = true;                    // il a bougé (son Élan ne retombe pas), mais le Pas ne donne pas d'Élan
      const s = surfaceA(h); if (s) entrerSurface(h, s, false);
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
      payer(h, cap); u.st.huile = { ttl: lire('etat.huile.duree'), par: h.id };
      ev({ type: 'lance', id: h.id, cap: capId, anim: 'tir', x: u.x, y: u.y });
      log(`${h.nom} lance une fiole : ${u.nom} est Huilé.`);
      return true;
    }
    return false;
  }
  // L'aperçu d'une attaque (le survol) : les chances de chaque résultat, les dégâts, ce qui joue.
  function apercu(h, capId, cibleId) {
    const cap = CAPACITES[capId], u = U(cibleId);
    if (!cap || !['attaque', 'enclume'].includes(cap.type) || !u || u.camp !== 'e') return null;
    const A = armer(h, attaqueHeros(cap)), c = calculer(h, u, A), o = chances(A, c);
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
    S, U, herosVivants, ennemisVivants, trahiParLaLumiere, sortieOmbre, presDeLEnclume, poseEnclume, derriereEnclume, menacesDuChemin, groupes, groupeCourant, peutAgir, peutUtiliser, cibles, zonePossible, huileVisable, aPortee,
    portee, apercuMarche, deplacer, utiliser, apercu, commencer, finPhaseHeros, rienAFaire, fiche, surfaceA, mailles: () => S.surfaces, MAILLE,
    // « Annuler le déplacement » : une copie de l'état, et la remettre (les événements ne se copient pas)
    instantane: () => JSON.stringify({ ...S, evenements: [] }),
    restaurer(copie) { const o = JSON.parse(copie); for (const k of Object.keys(o)) S[k] = o[k]; S.evenements = []; },
    // pour les tests : des actions directes, sans passer par l'interface
    _: { attaquer, pousser, calculer, chances, noter, fourchette, eclaterTonneau, enflammer, poserZone, agirEnnemi, marcher, carteDe, attaqueHeros, cibleBrute, attaqueReflexe, degatsMoyens, chanceAchever, coutOpportunites },
  };
}
