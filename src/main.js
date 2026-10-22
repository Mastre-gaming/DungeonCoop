// Le camp de Dungeon Co-op, prototype v0 (CAMP.fr.md §7) : le camp, le héros, la caméra, le panneau des missions,
// la sentinelle de l'entrée et son tour du camp, les rats des PR à résoudre, et le jeu à plusieurs.
// D'abord l'écran titre (src/45_titre.js) : Jouer, Rejoindre, Réglages, Retour au dashboard. (Héberger se fait au camp.)
//   ?code=ABCDE rejoindre ce groupe (l'écran titre s'ouvre sur Rejoindre, le code déjà tapé)
//   ?visite   pas de héros, tout le camp dans le cadre (la carte du dashboard)
//   ?run      une run d'essai (le bandeau de la run : Victoire / Défaite / Abandon, le vote aux embranchements)
//   ?test     les vérifications, résultat « réussies/total » en bas à droite
//   ?spot=feu aller à un point nommé (apparition, feu, visite, porte, entree, chantier, sentinelle, tour, rats, et chaque lieu : interface, histoire, level, combat…)
//   ?heure=22:30 forcer l'heure du camp (le jour et la nuit suivent sinon l'heure de Paris)
//   ?meteo=pluie forcer la météo du camp (beau, pluie, orage, brouillard, neige)
//   ?saison=hiver forcer la saison du camp (printemps, ete, automne, hiver ; sinon le calendrier de Paris)
//   ?fete     la fête du niveau 4 (sinon, le jour où un lieu atteint le niveau 4)
import { createGame } from './skills/core/module/06_game.js';
import { T, MONDE, VISITE, LIEUX, APPARITION } from './01_plan.js';
import { fabriquerSauvage } from './53_sauvage.js';
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
import * as patchNotesSkill from './48_patch_notes.js';
import * as forgeronSkill from './40_forgeron.js';
import * as choixSkill from './41_choix_heros.js';
import * as promeneursSkill from './42_promeneurs.js';
import * as limierSkill from './47_limier.js';
import * as apparitionsSkill from './43_apparitions.js';
import * as chantierSkill from './44_chantier.js';
import * as mursSkill from './45_murs.js';
import * as jourNuitSkill from './46_jour_nuit.js';
import * as meteoSkill from './48_meteo.js';
import * as animauxSkill from './49_animaux.js';
import * as vivantSkill from './54_vivant.js';
import * as gardesSkill from './55_gardes.js';
import * as habitantsSkill from './56_habitants.js';
import * as scenesSkill from './50_scenes.js';
import * as saisonsSkill from './51_saisons.js';
import * as feteSkill from './52_fete.js';
import * as runSkill from './57_run.js';
import * as voteSkill from './58_vote.js';
import * as contratSkill from './61_contrat.js';
import * as synchroSkill from './59_synchro.js';
import * as sauvegardeSkill from './60_sauvegarde.js';
import { ecranTitre, sauterTitre, retourAuDashboard } from './45_titre.js';
import './jeu.css';
import './cadres.css';   // les jetons de DESIGN.fr.md
import './hud.css';      // l'habillage épique du HUD (DESIGN.fr.md), après tout le reste
import './titre.css';

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

// Les planches du camp (et celles des héros à incarner) se chargent pendant que l'écran titre est ouvert.
const imagesCamp = Promise.all([chargerImages(), chargerImages('./assets/lpc/', { ...choixSkill.FICHIERS, ...apparitionsSkill.FICHIERS })]);
imagesCamp.catch(() => {});   // (une erreur ici est dite par demarrer)

async function demarrer(sortieTitre) {
  const [imagesBase, imagesHeros] = await imagesCamp;
  const images = { ...imagesBase, ...imagesHeros };   // (et les planches des héros à incarner)
  images.sauvage = fabriquerSauvage();               // les buissons, roseaux, fleurs… dessinés pour le dehors sauvage
  const camp = composerCamp(images);
  const canvas = document.querySelector('#jeu');
  const rendu = creerRendu(canvas);
  // les saisons : les planches du décor et le sol, repeints avant que le camp ne se dessine (?saison=hiver pour en forcer
  // une ; en ?test, l'été : le camp tel qu'il est dessiné, comme midi et le beau temps)
  const saisonForcee = saisonsSkill.SAISONS.includes(query.get('saison')) ? query.get('saison') : query.has('test') ? 'ete' : null;
  const saison = saisonForcee ?? saisonsSkill.saisonDe();
  const sol = composerSol(images, camp.solPlat);
  saisonsSkill.teindreCamp({ images, camp, sol, saison });
  rendu.sol(sol, MONDE.x0, MONDE.y0);
  rendu.statiques(camp.objets, images);
  const collision = creerCollision(camp);

  const depart = { x: APPARITION[0] * T, y: APPARITION[1] * T };
  const heros = game.use(herosSkill, { rendu, collision, canvas, images, ...depart });
  if (visite) heros.cacher();
  const decor = game.use(decorSkill, { rendu, camp, images });
  const apparitions = game.use(apparitionsSkill, { rendu, images });   // la colonne dorée : qui arrive, qui s'en va
  const muraille = game.use(murailleSkill, { rendu, camp, images, heros, visite });   // l'entrée : fantôme une fois dedans (#123)
  const camera = game.use(cameraSkill, { rendu, visite, monde: visite ? VISITE : MONDE, cible: visite ? null : () => heros.heros });
  // les missions (les tâches du tableau de travail) ; en ?test, rien ne part sur le réseau
  const missions = game.use(missionsSkill, { horsLigne: query.has('test') });
  const lieux = game.use(lieuxSkill, { rendu, images, collision, missions, decor });
  const place = game.use(placeSkill, { rendu, images, collision, missions, decor });   // la place du village, autour du feu
  // la connexion GitHub (la même que le tableau de travail du dashboard) : gérer les missions depuis le panneau
  const github = game.use(githubSkill, { horsLigne: query.has('test') });
  const panneau = game.use(panneauSkill, { rendu, canvas, decor, missions, heros, images, visite, github, horsLigne: query.has('test') });
  // la sentinelle : sa scène à chaque arrivée (pas en visite, ni pendant les vérifications, ni quand on va à un point nommé)
  // avant elle, à chaque arrivée : le choix du héros (41_choix_heros.js), qui lance sa scène une fois le héros pris
  const arrivee = !visite && !query.has('test') && !query.has('spot');
  const sentinelle = game.use(sentinelleSkill, { rendu, heros, images, missions, collision, camera, visite, scene: false });
  const choix = game.use(choixSkill, { heros, images, missions, sentinelle, arrivee });
  const limier = game.use(limierSkill, { rendu, heros, visite });   // le limier (un malinois) du Traqueur au limier le suit dans le camp
  // le crieur, sur son estrade à côté du tableau d'affichage, à partir du niveau 3 du tableau
  const crieur = game.use(crieurSkill, { rendu, images, heros, missions, lieux });
  // Baba Brisenclume tape sur l'enclume de l'armurerie, sous l'abri de forge (sauf quand on l'incarne)
  const forgeron = game.use(forgeronSkill, { rendu, images, lieux, collision, heros, pris: (id) => promeneursSkill.estPris(id) });
  const renommee = game.use(renommeeSkill, { missions, sentinelle, visite });
  const hud = game.use(hudSkill, { missions, sentinelle, panneau, images, visite, renommee, heros });
  const reseau = game.use(reseauSkill, { rendu, heros, images, sentinelle, visite, apparitions });
  limier.brancherReseau(reseau);   // le limier d'un ami qui incarne le Traqueur : chacun le voit
  const terrain = game.use(terrainSkill, { rendu, canvas, heros, visite, reseau });   // E devant le terrain : le combat d'entraînement (à plusieurs : tout le groupe)
  const armurerie = game.use(armurerieSkill, { rendu, canvas, heros, visite });       // E devant l'armurerie : le créateur de classe (#125)
  const archives = game.use(archivesSkill, { rendu, canvas, heros, collision, images, visite });   // E devant la tente des archives : tous les assets du projet
  // le chantier des trois autres murs : ses ouvriers, et le chef de chantier (E : où en est chaque mur)
  const chantier = game.use(chantierSkill, { rendu, images, heros, missions, collision, visite });
  // les murs ouest, nord et est montent avec le chantier, et s'estompent comme la grande muraille quand on s'en éloigne
  const murs = game.use(mursSkill, { rendu, images, heros, chantier, collision, visite });
  // le jour et la nuit : le camp suit l'heure de Paris (?heure=22:30 pour en forcer une) ; en visite, plein jour
  // (en ?test, midi : la nuit coûte cher en rendu logiciel, et les tests de GitHub dépassaient leur quart d'heure ; le
  // test du jour et de la nuit passe lui-même par 23 h)
  const jourNuit = game.use(jourNuitSkill, { rendu, heros, reseau, chantier, murs, muraille, camp, visite, heure: query.get('heure') ?? (query.has('test') ? '12:00' : null) });
  // la météo : la pluie, l'orage, le brouillard du matin, toutes les trois heures (?meteo=pluie pour en forcer un) ;
  // en visite, beau temps (en ?test aussi, comme midi pour le jour et la nuit)
  const saisons = game.use(saisonsSkill, { saison, forcee: !!saisonForcee });
  // en hiver, la neige tombe à la place de la pluie
  const meteo = game.use(meteoSkill, { rendu, sol, images, place, jourNuit, visite, saison, meteo: query.get('meteo') ?? (query.has('test') ? 'beau' : null) });
  // les rats : les PR ouvertes qui attendent quelque chose (en ?test, rien ne part sur le réseau)
  const rats = game.use(ratsSkill, { rendu, heros, images, collision, camera, sentinelle, missions, canvas, visite, horsLigne: query.has('test') });
  const tour = game.use(tourSkill, { heros, sentinelle, camera, collision, camp, lieux, decor, rats, images, visite });
  const groupe = game.use(groupeSkill, { missions, renommee, reseau, sentinelle, images, ouvrirJournal: () => hud.activer('journal') });
  hud.brancher('groupe', groupe);
  const campagne = game.use(campagneSkill, { visite, horsLigne: query.has('test'), ouvrirCarte: () => hud.activer('campagne') });
  hud.brancher('campagne', campagne);
  const chronique = game.use(chroniqueSkill, { missions, visite, horsLigne: query.has('test') });
  hud.brancher('chronique', chronique);
  const patchNotes = game.use(patchNotesSkill, { missions, horsLigne: query.has('test') });
  crieur.brancher(chronique, () => patchNotes.ouvrir());   // le crieur crie les derniers push ; un clic sur lui : les patch notes
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
  // le moteur de la run (#261) : la suite des salles, le vote de la salle suivante, la run chez les amis, la sauvegarde
  const run = game.use(runSkill, { visite, joueurs: () => synchro.joueurs(), moi: () => reseau.party?.id });
  const nomDuVote = (id) => (id === reseau.party?.id || id === 'me' ? sentinelle.qui?.nom || 'Moi' : reseau.party?.others.get(id)?.name ?? id);
  const vote = game.use(voteSkill, { party: () => reseau.party, run: () => run.courante, nom: nomDuVote, visite });
  const synchro = game.use(synchroSkill, { party: () => reseau.party, run: () => run, nom: nomDuVote });
  const sauvegarde = game.use(sauvegardeSkill, { party: () => reseau.party, run: () => run, joueurs: () => synchro.joueurs(), visite, horsLigne: query.has('test') });
  if (query.has('run') && !query.has('test')) run.nouvelle({ heros: ['Aldric', 'Brune', 'Cendre', 'Dune'] }).partir();   // ?run : une run d'essai, avec son bandeau
  // les héros qu'on peut incarner se promènent dans le camp et parlent (E) ; un héros pris par un joueur s'en va.
  // (après tous les autres : E sert d'abord aux lieux et aux personnages du camp, puis aux promeneurs)
  const promeneurs = game.use(promeneursSkill, { rendu, heros, collision, images, reseau, forgeron, apparitions, visite });
  // les animaux du camp : les poules, le chat, les lapins, les canards, les papillons (ils suivent la nuit et la météo)
  const animaux = game.use(animauxSkill, { rendu, images, heros, collision, reseau, promeneurs, jourNuit, meteo, saison, visite });
  // le dehors qui vit : le feu de camp et sa fumée, l'étang et ses canards, les lapins, les papillons, les lucioles (54_vivant.js)
  // une sentinelle à chaque porte secondaire
  const gardes = game.use(gardesSkill, { rendu, images, heros, collision, visite });
  const habitants = game.use(habitantsSkill, { rendu, images, heros, collision, camp, jourNuit, visite });
  const vivant = game.use(vivantSkill, { rendu, images, heros, collision, camp, jourNuit, meteo, visite, saison });
  // les scènes entre habitants : la veillée au feu, le crieur et son public, le chef à la forge, un duel à l'enclos
  const scenes = game.use(scenesSkill, { rendu, images, heros, collision, promeneurs, chantier, crieur, forgeron, jourNuit, visite, auto: !visite && !query.has('test') });
  // la fête du niveau 4 : le jour où un lieu y arrive, des mâts, des guirlandes et une ronde de héros sur la place du feu
  const fete = game.use(feteSkill, { rendu, promeneurs, scenes, lieux, missions, jourNuit, fete: query.has('fete') });
  // le contrat au tableau et la réunion du départ (Paolitus, 22 oct) : la porte de l'aventure
  const contrat = game.use(contratSkill, { rendu, heros, camera, decor, promeneurs, scenes, images, visite, reseau, limier, nom: nomDuVote });
  // la case « Retour au dashboard » (B) : le chemin à l'envers, par l'écran titre et le ciel de nuit (en ?test, rien ne part)
  const versDashboard = { ouvert: false, essais: 0, ouvrir() { this.essais++; if (!query.has('test')) retourAuDashboard({ stamp: game.stamp }); }, fermer() {} };
  hud.brancher('dashboard', versDashboard);
  game.dbg.versDashboard = (aller) => retourAuDashboard({ stamp: game.stamp, aller });   // (les captures : sans partir)
  game.dbg.retour = retourAuDashboard;   // (retour.titre : l'écran titre du chemin du retour)
  game.render = () => rendu.dessiner();
  const camptests = game.use(tests, { heros, collision, camera, rendu, visite, camp, game, missions, panneau, decor, sentinelle, crieur, reseau, renommee, hud, groupe, campagne, chronique, patchNotes, sacoche, rumeurs, messagerie, boite, rats, tour, lieux, place, terrain, muraille, parties, github });

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
  // le chantier des trois autres murs : devant le chef de chantier et son panneau
  game.dbg.spot('chantier', aller(292, 664, 'haut'));
  Object.assign(game.dbg, { rendu, camp, heros, camera, decor, collision, missions, panneau, sentinelle, crieur, reseau, lieux, place, renommee, hud, groupe, campagne, chronique, sacoche, rumeurs, messagerie, boite, rats, tour, terrain, armurerie, archives, radio, reglages, muraille, parties, github, forgeron, choix, promeneurs, apparitions, chantier, murs, limier, jourNuit, meteo, animaux, vivant, gardes, habitants, scenes, saisons, fete, patchNotes, run, vote, synchro, sauvegarde, contrat, tests: camptests });
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
  game.dbg.spot('plans', () => { aller(...tests.devant(LIEUX[0]), 'haut')(); panneau.ouvrir('interface', 'plans'); });

  document.documentElement.dataset.pret = '1';
  game.start();
  sortieTitre?.titre?.retirer();
}

// L'écran titre, puis le camp. Rejoindre passe par ?code= (le réseau rejoint le groupe de l'adresse en s'ouvrant).
async function lancer() {
  let sortieTitre = null;
  if (!sauterTitre(query)) {
    sortieTitre = await ecranTitre({ stamp: game.stamp, code: query.get('code') ?? '', dbg: game.dbg }).catch((e) => { console.error(e); return null; });
    const q = new URLSearchParams(location.search);
    if (sortieTitre?.action === 'rejoindre') q.set('code', sortieTitre.code); else q.delete('code');
    history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}${location.hash}`);
  }
  await demarrer(sortieTitre);
}

lancer().catch((e) => {
  console.error(e);
  document.querySelector('#chargement').textContent = `Le camp n'a pas pu se charger : ${e.message}`;
});
