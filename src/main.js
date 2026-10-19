// Le camp de Dungeon Co-op, prototype v0 (CAMP.fr.md §7) : le camp, le héros, la caméra, le panneau des missions,
// la sentinelle de l'entrée et son tour du camp, les rats des PR à résoudre, et le jeu à plusieurs.
//   ?code=ABCDE rejoindre ce groupe
//   ?visite   pas de héros, tout le camp dans le cadre (la carte du dashboard)
//   ?test     les vérifications, résultat « réussies/total » en bas à droite
//   ?spot=feu aller à un point nommé (apparition, feu, visite, porte, entree, sentinelle, tour, rats, et chaque lieu : interface, histoire, level, combat…)
import { createGame } from './skills/core/module/06_game.js';
import { T, W, H, LIEUX, APPARITION } from './01_plan.js';
import { chargerImages } from './02_images.js';
import { composerSol, composerCamp } from './03_carte.js';
import { creerRendu } from './04_rendu.js';
import { creerCollision } from './05_collision.js';
import * as herosSkill from './06_heros.js';
import * as cameraSkill from './07_camera.js';
import * as decorSkill from './08_decor.js';
import * as tests from './09_tests.js';
import * as missionsSkill from './10_missions.js';
import * as panneauSkill from './11_panneau.js';
import * as sentinelleSkill from './12_sentinelle.js';
import * as reseauSkill from './13_reseau.js';
import * as lieuxSkill from './14_lieux.js';
import * as placeSkill from './36_place.js';
import * as renommeeSkill from './15_renommee.js';
import * as hudSkill from './16_hud.js';
import * as groupeSkill from './17_groupe.js';
import * as campagneSkill from './18_campagne.js';
import * as chroniqueSkill from './19_chronique.js';
import { creerSacoche, creerRumeurs } from './20_sacoche.js';
import * as messagerieSkill from './21_messagerie.js';
import * as githubSkill from './27_github.js';
import * as partiesSkill from './28_parties.js';
import * as boiteSkill from './22_boite.js';
import * as radioSkill from './24_radio.js';
import * as reglagesSkill from './25_reglages.js';
import * as ratsSkill from './30_rats.js';
import * as tourSkill from './31_tour.js';
import * as terrainSkill from './23_terrain.js';
import * as armurerieSkill from './26_armurerie.js';
import * as archivesSkill from './27_archives.js';
import * as murailleSkill from './32_muraille.js';
import * as crieurSkill from './38_crieur.js';
import * as forgeronSkill from './40_forgeron.js';
import * as choixSkill from './41_choix_heros.js';
import './jeu.css';
import './cadres.css';   // les jetons de DESIGN.fr.md
import './hud.css';      // l'habillage épique du HUD (DESIGN.fr.md), après tout le reste

const query = new URLSearchParams(location.search);
const visite = query.has('visite');
document.documentElement.classList.toggle('visite', visite);

const game = createGame({
  bindings: {
    haut: ['KeyW', 'ArrowUp'], bas: ['KeyS', 'ArrowDown'], gauche: ['KeyA', 'ArrowLeft'], droite: ['KeyD', 'ArrowRight'],
    courir: ['ShiftLeft', 'ShiftRight'],
  },
  storage: { prefix: 'dungeoncoop:' },
});

document.querySelector('#tampon').textContent = `version du ${game.stamp}`;

async function demarrer() {
  const images = { ...await chargerImages(), ...await chargerImages('./assets/lpc/', choixSkill.FICHIERS) };   // (et les planches des héros à incarner)
  const camp = composerCamp();
  const canvas = document.querySelector('#jeu');
  const rendu = creerRendu(canvas);
  rendu.sol(composerSol(images));
  rendu.statiques(camp.objets, images);
  const collision = creerCollision(camp);

  const depart = { x: APPARITION[0] * T, y: APPARITION[1] * T };
  const heros = game.use(herosSkill, { rendu, collision, canvas, images, ...depart });
  if (visite) heros.cacher();
  const decor = game.use(decorSkill, { rendu, camp, images });
  const muraille = game.use(murailleSkill, { rendu, camp, images, heros, visite });   // l'entrée : fantôme une fois dedans (#123)
  const camera = game.use(cameraSkill, { rendu, visite, monde: { w: W * T, h: H * T }, cible: visite ? null : () => heros.heros });
  // les missions (les tâches du tableau de travail) ; en ?test, rien ne part sur le réseau
  const missions = game.use(missionsSkill, { horsLigne: query.has('test') });
  const lieux = game.use(lieuxSkill, { rendu, images, collision, missions, decor });
  const place = game.use(placeSkill, { rendu, images, collision, missions, decor });   // la place du village, autour du feu
  // la connexion GitHub (la même que le tableau de travail du dashboard) : gérer les missions depuis le panneau
  const github = game.use(githubSkill, { horsLigne: query.has('test') });
  const panneau = game.use(panneauSkill, { rendu, canvas, decor, missions, heros, images, visite, github });
  // la sentinelle : sa scène à chaque arrivée (pas en visite, ni pendant les vérifications, ni quand on va à un point nommé)
  // avant elle, à chaque arrivée : le choix du héros (41_choix_heros.js), qui lance sa scène une fois le héros pris
  const arrivee = !visite && !query.has('test') && !query.has('spot');
  const sentinelle = game.use(sentinelleSkill, { rendu, heros, images, missions, collision, camera, visite, scene: false });
  const choix = game.use(choixSkill, { heros, images, missions, sentinelle, arrivee });
  // le crieur, sur son estrade à côté du tableau d'affichage, à partir du niveau 3 du tableau
  const crieur = game.use(crieurSkill, { rendu, images, heros, missions, lieux });
  // Baba Brisenclume tape sur l'enclume de l'armurerie, sous l'abri de forge (sauf quand on l'incarne)
  const forgeron = game.use(forgeronSkill, { rendu, images, lieux, collision, heros });
  const renommee = game.use(renommeeSkill, { missions, sentinelle, visite });
  const hud = game.use(hudSkill, { missions, sentinelle, panneau, images, visite, renommee, heros });
  const reseau = game.use(reseauSkill, { rendu, heros, images, sentinelle, visite });
  const terrain = game.use(terrainSkill, { rendu, canvas, heros, visite, reseau });   // E devant le terrain : le combat d'entraînement (à plusieurs : tout le groupe)
  const armurerie = game.use(armurerieSkill, { rendu, canvas, heros, visite });       // E devant l'armurerie : le créateur de classe (#125)
  const archives = game.use(archivesSkill, { rendu, canvas, heros, collision, images, visite });   // E devant la tente des archives : tous les assets du projet
  // les rats : les PR ouvertes qui attendent quelque chose (en ?test, rien ne part sur le réseau)
  const rats = game.use(ratsSkill, { rendu, heros, images, collision, camera, sentinelle, missions, canvas, visite, horsLigne: query.has('test') });
  const tour = game.use(tourSkill, { heros, sentinelle, camera, collision, camp, lieux, decor, rats, images, visite });
  const groupe = game.use(groupeSkill, { missions, renommee, reseau, sentinelle, images, ouvrirJournal: () => hud.activer('journal') });
  hud.brancher('groupe', groupe);
  const campagne = game.use(campagneSkill, { visite, horsLigne: query.has('test'), ouvrirCarte: () => hud.activer('campagne') });
  hud.brancher('campagne', campagne);
  const chronique = game.use(chroniqueSkill, { missions, visite, horsLigne: query.has('test') });
  hud.brancher('chronique', chronique);
  crieur.brancher(chronique, () => hud.activer('chronique'));   // le crieur crie et recense les derniers push
  const sacoche = creerSacoche({ horsLigne: query.has('test') });
  hud.brancher('sacoche', sacoche);
  const rumeurs = creerRumeurs({ missions, bus: game.bus });
  hud.brancher('rumeurs', rumeurs);
  const messagerie = game.use(messagerieSkill, { missions, sentinelle, ...(query.has('test') ? { jeton: null } : {}) });
  hud.brancher('lettres', messagerie);
  // les parties : héberger poste le code dans la messagerie ; chez les autres, une bulle « Rejoindre »
  const parties = game.use(partiesSkill, { messagerie, reseau, visite });
  const boite = game.use(boiteSkill, { rendu, heros, collision, visite, ouvrirMessages: () => { if (!messagerie.ouvert) hud.activer('lettres'); } });
  const radio = game.use(radioSkill, { rendu, heros, collision, visite, reseau, muet: query.has('test') });   // la radio Deadlock : le barde près du feu (#94)
  const reglages = game.use(reglagesSkill, { visite });   // le menu Réglages (O) : la musique et les effets (#95)
  hud.brancher('reglages', reglages);
  game.render = () => rendu.dessiner();
  const camptests = game.use(tests, { heros, collision, camera, rendu, visite, camp, game, missions, panneau, decor, sentinelle, crieur, reseau, renommee, hud, groupe, campagne, chronique, sacoche, rumeurs, messagerie, boite, rats, tour, lieux, place, terrain, muraille, parties, github });

  // Les points nommés (dbg.go, ?spot=, les captures).
  const aller = (x, y, dir = 'bas') => () => { heros.placer(x, y, dir); camera.snap(); };
  game.dbg.spot('apparition', aller(depart.x, depart.y));
  game.dbg.spot('feu', aller(...tests.devantFeu(), 'haut'));
  for (const l of LIEUX) game.dbg.spot(l.id, aller(...tests.devant(l), 'haut'));
  game.dbg.spot('archives', aller(archivesSkill.PORTE.x * T, (archivesSkill.PORTE.y + 0.8) * T, 'haut'));
  game.dbg.spot('visite', () => { location.search = '?visite'; });
  // l'entrée du camp (#123) : sur la route, devant le pont ; et juste après la porte, en entrant
  game.dbg.spot('porte', aller(15 * T, 36.6 * T, 'haut'));
  game.dbg.spot('entree', aller(15 * T, 29 * T, 'haut'));
  Object.assign(game.dbg, { rendu, camp, heros, camera, decor, collision, missions, panneau, sentinelle, crieur, reseau, lieux, place, renommee, hud, groupe, campagne, chronique, sacoche, rumeurs, messagerie, boite, rats, tour, terrain, armurerie, archives, radio, reglages, muraille, parties, github, forgeron, choix, tests: camptests });
  game.dbg.spot('sentinelle', () => { sentinelle.oublier(); sentinelle.demarrer(); });
  // le tour : depuis la sentinelle à son poste, le héros devant elle
  game.dbg.spot('tour', () => { aller(sentinelle.POSTE_LIBRE.x, sentinelle.POSTE_LIBRE.y + 1.5 * T, 'haut')(); sentinelle.suivre(); });
  // les rats d'exemple, autour du héros devant le feu : le premier est à toi
  game.dbg.spot('rats', () => {
    aller(...tests.devantFeu(), 'haut')();
    const moi = sentinelle.qui?.github ?? 'DonBabaa';
    rats.accorder([
      { cle: 'ex-12', espece: 0, pr: { numero: 12, titre: 'Ajoute l’événement de la taverne', url: 'https://github.com/Mastre-gaming/DungeonCoop/pulls', depot: 'jeu', auteur: moi }, chasse: true },
      { cle: 'ex-14', espece: 1, pr: { numero: 14, titre: 'Sprite du chevalier : couronne et cape', url: 'https://github.com/Mastre-gaming/DungeonCoop/pulls', depot: 'jeu', auteur: 'PCrrfng-autre' } },
      { cle: 'ex-3', espece: 2, pr: { numero: 3, titre: 'Widget des idées : trier par votes', url: 'https://github.com/Mastre-gaming/DungeonCoop-dashboard/pulls', depot: 'dashboard', auteur: 'quelqu’un' } },
    ], { force: true });
  });
  game.dbg.spot('panneau', () => { aller(...tests.devant(LIEUX[0]), 'haut')(); panneau.ouvrir('interface'); });

  document.documentElement.dataset.pret = '1';
  game.start();
}

demarrer().catch((e) => {
  console.error(e);
  document.querySelector('#chargement').textContent = `Le camp n'a pas pu se charger : ${e.message}`;
});
