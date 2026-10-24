// Le terrain d'entraînement (mission #14) : le combat D1 de la Salle d'essai de Fraps, sans cases, en pixel art LPC.
// On y entre depuis son lieu dans le camp (E devant le terrain) ; « Retour au camp » ramène devant lui.
//   ?test   les vérifications, résultat « réussies/total » (le moteur, la géométrie, un combat entier, l'interface)
//   ?graine=12   les dés d'un combat rejouable (sinon, le hasard)
//   ?aventure=camp-des-mastres(&niveau=1)   un niveau de l'aventure : on désigne qui lance le dé, la graine tire la salle (aventure.js)
//     &mot=ABCDE la graine donnée (sans vote) · &salle= &rencontre= forcer des fichiers · &miroir
//   ?groupe=ABCDE(&hote)   à plusieurs (#80) : le groupe du camp, venu ensemble (multi.js)
import * as partyNet from '../skills/party-net/module/03_skill.js';      // (pour les tests à plusieurs : tools/multi_explo.mjs)
import { createGame } from '../skills/core/module/06_game.js';
import { chargerImages } from '../02_images.js';
import { creerRendu } from '../04_rendu.js';
import * as ESSAI from './salle.js';
import { construire as construireSalle, PLANCHES_SALLES } from './salles.js';
import { creerTrame } from './geometrie.js';
import { creerCombat, equipeDepuis, equipePour, EQUIPE_KIT, HEROS } from './regles.js';
import { monGithub } from './joueur.js';
import * as vueSkill from './vue.js';
import * as interfaceSkill from './interface.js';
import * as multiSkill from './multi.js';
import * as reglagesSkill from './panneau-reglages.js';
import * as cinemaSkill from './cinema.js';
import * as SAISON from './saison.js';
import * as desSkill from '../61_des.js';   // le jet de d20 (le dé de cristal)
import CHEMIN from './chemin.json';
import * as tests from './tests.js';
import * as PROGRESSION from './progression.js';
import * as AVENTURE from './aventure.js';
import { demanderLancer } from './entree.js';
import PERSOS from './persos.json';
import { PLANCHES as EFFETS } from './effets.js';
import { PLANCHES as FILMS } from './films.js';
import { habiller } from '../33_cadres.js';
import '../panneau.css';
import '../jeu.css';
import '../cadres.css';
import './entrainement.css';

habiller();   // le bois veiné, les coins de laiton, le parchemin (DESIGN.fr.md §1)

const query = new URLSearchParams(location.search);
const graine = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

// la salle : celle d'essai, ou une salle de la route (?salle=gue|lisiere|pillards|butte|col : salles.js)
const SALLE = construireSalle(query.get('salle')) ?? ESSAI;

const game = createGame({ storage: { prefix: 'dungeoncoop:' } });

const CLE_PREMIERE = 'dungeoncoop:sentier-des-gueux-vue';

// Un niveau de l'aventure (?aventure=) : le vote de qui lance le dé, la graine, puis la salle et la rencontre tirées.
async function entrerNiveau(equipe) {
  const av = AVENTURE.aventure(query.get('aventure')), niveau = AVENTURE.niveauDe(av, query.get('niveau') ?? 1);
  if (!av || !niveau || niveau.a_ecrire) throw new Error(`le niveau ${query.get('niveau') ?? 1} de « ${query.get('aventure')} » n’existe pas encore`);
  let mot = AVENTURE.nettoyerMot(query.get('mot')), premiere = false;
  if (mot.length !== 5) {
    try { premiere = !localStorage.getItem(CLE_PREMIERE); } catch {}
    const r = await demanderLancer({ titre: niveau.nom || av.nom, noms: equipe.map((t) => HEROS[t].nom) });
    mot = r.mot;
    try { localStorage.setItem(CLE_PREMIERE, '1'); } catch {}
  }
  const tirage = { ...AVENTURE.tirer(niveau, mot, { premiere }) };
  if (query.get('salle')) tirage.salle = query.get('salle');
  if (query.get('rencontre')) tirage.rencontre = query.get('rencontre');
  if (query.has('miroir')) tirage.miroir = true;
  return AVENTURE.preparer(tirage);
}

async function demarrer() {
  // l'équipe choisie à l'entrée (#76) : ?equipe=brute,chevalier,druide,barde ; sinon les 4 héros du kit D1
  const equipe = equipePour(equipeDepuis(query.get('equipe')) ?? EQUIPE_KIT, monGithub());   // (la classe d'un autre joueur : pas pour moi)
  const niveau = query.has('aventure') ? await entrerNiveau(equipe) : null;
  const MONDE = niveau ? niveau.plan : SALLE;                 // le module de la salle : D1 (salle.js) ou un fichier de l'aventure
  const planches = {
    limier: 'compagnons/limier.png', forme_bete: 'entrainement/formes/bete.png', forme_cosa: 'entrainement/formes/cosa.png', forme_illumine: 'entrainement/formes/illumine.png', herbe: 'grass.png', terre: 'dirt.png', eau: 'water.png', trou: 'hole.png', roche: 'rock.png', cimes: 'treetop.png', troncs: 'trunk.png', douves: 'douves.png', montagnes: 'mountains.png', tonneau: 'barrel.png', deco: 'decorations-medieval.png',
    brasero: 'brasero_sentier_gueux.png', haute: 'herbe_haute.png', surfaces: 'surfaces.png', surfaces_lpc: 'surfaces_lpc.png', chemin: 'chemin.png', etal: 'etal.png',   // (le chemin de la tour)
    ...PLANCHES_SALLES,           // le château et le donjon (les salles de l'atelier des niveaux)
    ...Object.fromEntries(Object.keys(PERSOS).map((id) => [`perso_${id}`, `entrainement/${id}.png`])),
    ...EFFETS,                    // les briques de la bibliothèque d'animations (effets.js, #134)
    ...FILMS,                     // les animations validées de Baba Brisenclume (films.js)
  };
  const images = await chargerImages('./assets/lpc/', planches);
  const canvas = document.querySelector('#jeu');
  const rendu = creerRendu(canvas);
  rendu.renderer.setClearColor(0x2f5a2a);
  // la saison du camp (saison.js) : le sol, les arbres et les planches du décor repeints, avant le premier dessin
  const saison = SAISON.SAISONS.includes(query.get('saison')) ? query.get('saison') : SAISON.saisonDe();
  const sol = MONDE.composerSol(images), decor = MONDE.composerDecor();
  const betes = Object.entries(CHEMIN).filter(([n]) => /^(oiseau|papillon|canard|rat_couronne|lapin)/.test(n)).map(([, r]) => r);   // (la neige ne tombe pas sur les bêtes)
  SAISON.teindreChemin({ images, objets: decor, sol, saison, sauf: { chemin: betes } });
  rendu.sol(sol);
  rendu.statiques(decor.filter((o) => !o.pont), images);
  const pont = decor.some((o) => o.pont) ? rendu.statiques(decor.filter((o) => o.pont), images) : null;   // (le pont du gué peut s'effondrer)

  const salle = MONDE.salle(), trame = creerTrame(salle);
  const alea = query.has('graine') || query.has('test') ? graine(Number(query.get('graine')) || 20261018) : Math.random;
    // la salle jouée : celle d'une aventure (un tronçon), ou celle d'essai / de la route (salles.js)
    const monde = niveau ? niveau.options : { departs: SALLE.DEPARTS, tonneaux: SALLE.TONNEAUX, flaque: SALLE.FLAQUE, surfaces: SALLE.SURFACES, ennemis: SALLE.ENNEMIS ?? null };
    const creer = (eq, infini = null) => {
      const c = creerCombat({ trame, salle, ...monde, equipe: eq, alea, infini, progression, pvDepart });
      if (saison === 'hiver') c.S.curiosites = c.S.curiosites.filter((o) => o.sorte !== 'canard');   // (en hiver, pas de canard à taquiner)
      return c;
    };
  // l'XP du groupe (progression.js) : d'après le plan de l'aventure ; ?xp= et ?nh= viennent de la run sauvegardée (sinon, niveau 1 : relancer l'aventure repart de zéro)
  const progression = niveau ? { plan: PROGRESSION.planDe(AVENTURE.aventure(query.get('aventure'))), xp: query.get('xp'), niveau: query.get('nh') } : null;
  const pvDepart = niveau && query.get('pv') ? query.get('pv').split(',').map((v) => Math.min(1, Math.max(0, Number(v)))).map((v) => (Number.isFinite(v) ? v : null)) : null;      // ?pv=1,0.6,1,0.25 : les PV de chacun au départ, en fraction de son maximum
  let combat = creer(equipe);
  // Un autre combat sans recharger la page (une autre équipe, Rejouer, le lobby à plusieurs) ; copie : l'état de l'hôte.
  // infini : la manche à jouer (mode infini : DEBUT_INFINI, puis suiteInfini() de la manche gagnée)
  const nouveauCombat = (eq, copie = null, infini = null) => {
    combat = creer(eq, infini);
    if (niveau?.plan.troncon && !copie) combat.explorer();      // (la copie de l'hôte porte déjà l'exploration en cours)
    if (copie) combat.restaurer(copie);
    vueSkill.remplacer(combat); interfaceSkill.remplacer(combat); multiSkill.api.remplacer(combat);
    if (niveau?.plan.troncon) { ihm.lance(); ihm.choisirHeros(premierDeMoi()); }
    game.dbg.combat = combat;
    return combat;
  };

  // le panneau de jet de d20 pour les attaques des héros (pas en ?test : les vérifications n'attendent pas un dé ; ?des=0 pour s'en passer)
  const des = !query.has('test') && query.get('des') !== '0' ? game.use(desSkill, {}) : null;
  const vue = game.use(vueSkill, { rendu, images, combat, salle, canvas, plan: niveau?.plan ?? null, pont, saison, des });
  // ?go : on vient de choisir l'équipe et de cliquer « Commencer » : le combat démarre tout de suite (?mode= le mode de tour)
  // les cinématiques de l'aventure (cinema.js) ; ?cinema=0 sans elles (les captures), ?cinema=auto sans attendre les clics
  const cine = niveau?.plan.troncon && query.get('cinema') !== '0' ? game.use(cinemaSkill, { vue, images, heros: () => combat.S.unites.filter((u) => u.camp === 'h'), aventure: query.get('aventure'), auto: query.get('cinema') === 'auto' }) : null;
  const ihm = game.use(interfaceSkill, { combat, vue, canvas, nouveauCombat, cinema: cine, demarrer: query.has('go'), mode: query.get('mode'), infini: query.has('infini'), salle: SALLE.id ?? null, salleNom: SALLE.nom, salleIdee: SALLE.idee,
    aventure: niveau?.plan.troncon ? AVENTURE.aventure(query.get('aventure'))?.nom ?? null : null });
  const multi = game.use(multiSkill, { combat, vue, ihm, nouveauCombat });
  const reglages = game.use(reglagesSkill, { ihm });   // le panneau de réglages du combat (R)
  game.render = () => rendu.dessiner();
    Object.assign(game.dbg, { partyNet, combat, vue, ihm, multi, reglages, trame, salle, rendu, nouveauCombat, niveau, cine, saison, des });
  game.use(tests, { combat, vue, ihm, multi, trame, salle, game, images, SALLE });

  // un tronçon du chemin : on commence à pied, sans écran d'accueil (chemin-sentier-des-gueux.md §0)
  function premierDeMoi() { return combat.S.heros.find((id) => !ihm.reseau || ihm.reseau.aMoi(id)) ?? 'h1'; }
  function explorer() { combat.explorer(); ihm.lance(); ihm.choisirHeros(premierDeMoi()); }
  // à plusieurs, le lobby d'abord : l'hôte lance (multi.js), et la scène du départ se joue alors chez tous
  const enGroupe = /^[A-Za-z0-9]{5}$/.test(query.get('groupe') ?? '') && !query.has('test');
  if (niveau?.plan.troncon && !enGroupe) explorer();
  if (cine && !enGroupe) cine.jouer('depart', {});
  document.querySelector('#chargement').hidden = true;
  document.documentElement.dataset.pret = '1';
  game.start();
}

demarrer().catch((e) => {
  console.error(e);
  document.querySelector('#chargement').textContent = `Le terrain n'a pas pu se charger : ${e.message}`;
});
