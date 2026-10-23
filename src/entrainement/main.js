// Le terrain d'entraînement (mission #14) : le combat D1 de la Salle d'essai de Fraps, sans cases, en pixel art LPC.
// On y entre depuis son lieu dans le camp (E devant le terrain) ; « Retour au camp » ramène devant lui.
//   ?test   les vérifications, résultat « réussies/total » (le moteur, la géométrie, un combat entier, l'interface)
//   ?graine=12   les dés d'un combat rejouable (sinon, le hasard)
//   ?aventure=camp-des-mastres(&niveau=1)   un niveau de l'aventure : on désigne qui lance le dé, la graine tire la salle (aventure.js)
//     &mot=ABCDE la graine donnée (sans vote) · &salle= &rencontre= forcer des fichiers · &miroir
//   ?groupe=ABCDE(&hote)   à plusieurs (#80) : le groupe du camp, venu ensemble (multi.js)
import { createGame } from '../skills/core/module/06_game.js';
import { chargerImages } from '../02_images.js';
import { creerRendu } from '../04_rendu.js';
import * as SALLE from './salle.js';
import { creerTrame } from './geometrie.js';
import { creerCombat, equipeDepuis, EQUIPE_KIT, HEROS } from './regles.js';
import * as vueSkill from './vue.js';
import * as interfaceSkill from './interface.js';
import * as multiSkill from './multi.js';
import * as cinemaSkill from './cinema.js';
import * as SAISON from './saison.js';
import * as desSkill from '../61_des.js';   // le jet de d20 (le dé de cristal, fusionné sur main)
import CHEMIN from './chemin.json';
import * as tests from './tests.js';
import * as AVENTURE from './aventure.js';
import { demanderLancer } from './entree.js';
import PERSOS from './persos.json';
import { PLANCHES as EFFETS } from './effets.js';
import { habiller } from '../33_cadres.js';
import '../panneau.css';
import '../jeu.css';
import '../cadres.css';
import './entrainement.css';

habiller();   // le bois veiné, les coins de laiton, le parchemin (DESIGN.fr.md §1)

const query = new URLSearchParams(location.search);
const graine = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

const game = createGame({ storage: { prefix: 'dungeoncoop:' } });

const CLE_PREMIERE = 'dungeoncoop:sentier-f-vue';

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
  const equipe = equipeDepuis(query.get('equipe')) ?? EQUIPE_KIT;
  const niveau = query.has('aventure') ? await entrerNiveau(equipe) : null;
  const MONDE = niveau ? niveau.plan : SALLE;                 // le module de la salle : D1 (salle.js) ou un fichier de l'aventure
  const planches = {
    herbe: 'grass.png', terre: 'dirt.png', eau: 'water.png', trou: 'hole.png', roche: 'rock.png', tonneau: 'barrel.png', deco: 'decorations-medieval.png', brasero: 'brasero_sentier_f.png', cimes: 'treetop.png', troncs: 'trunk.png', haute: 'herbe_haute.png', surfaces: 'surfaces.png', surfaces_lpc: 'surfaces_lpc.png', chemin: 'chemin.png', etal: 'etal.png',
    ...Object.fromEntries(Object.keys(PERSOS).map((id) => [`perso_${id}`, `entrainement/${id}.png`])),
    ...EFFETS,                    // les briques de la bibliothèque d'animations (effets.js, #134)
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
  const monde = niveau ? niveau.options : { departs: SALLE.DEPARTS, tonneaux: SALLE.TONNEAUX, flaque: SALLE.FLAQUE };
  const creer = (eq) => {
    const c = creerCombat({ trame, salle, ...monde, equipe: eq, alea });
    if (saison === 'hiver') c.S.curiosites = c.S.curiosites.filter((o) => o.sorte !== 'canard');   // (en hiver, pas de canard à taquiner)
    return c;
  };
  let combat = creer(equipe);
  // Un autre combat sans recharger la page (une autre équipe, Rejouer, le lobby à plusieurs) ; copie : l'état de l'hôte.
  const nouveauCombat = (eq, copie = null) => {
    combat = creer(eq);
    if (copie) combat.restaurer(copie);
    vueSkill.remplacer(combat); interfaceSkill.remplacer(combat); multiSkill.api.remplacer(combat);
    if (niveau?.plan.troncon) explorer();
    game.dbg.combat = combat;
    return combat;
  };

  // le panneau de jet de d20 pour les attaques des héros (pas en ?test : les vérifications n'attendent pas un dé ; ?des=0 pour s'en passer)
  const des = !query.has('test') && query.get('des') !== '0' ? game.use(desSkill, {}) : null;
  const vue = game.use(vueSkill, { rendu, images, combat, salle, canvas, plan: niveau?.plan ?? null, pont, saison, des });
  // ?go : on vient de choisir l'équipe et de cliquer « Commencer » : le combat démarre tout de suite (?mode= le mode de tour)
  // les cinématiques de l'aventure (cinema.js) ; ?cinema=0 sans elles (les captures), ?cinema=auto sans attendre les clics
  const cine = niveau?.plan.troncon && query.get('cinema') !== '0' ? game.use(cinemaSkill, { vue, images, heros: () => combat.S.unites.filter((u) => u.camp === 'h'), aventure: query.get('aventure'), auto: query.get('cinema') === 'auto' }) : null;
  const ihm = game.use(interfaceSkill, { combat, vue, canvas, nouveauCombat, cinema: cine, demarrer: query.has('go'), mode: query.get('mode'),
    aventure: niveau?.plan.troncon ? AVENTURE.aventure(query.get('aventure'))?.nom ?? null : null });
  const multi = game.use(multiSkill, { combat, vue, ihm, nouveauCombat });
  game.render = () => rendu.dessiner();
  Object.assign(game.dbg, { combat, vue, ihm, multi, trame, salle, rendu, nouveauCombat, niveau, cine, saison, des });
  game.use(tests, { combat, vue, ihm, multi, trame, salle, game, images, SALLE });

  // un tronçon du chemin : on commence à pied, sans écran d'accueil (chemin-sentier-f.md §0)
  function explorer() { combat.explorer(); ihm.lance(); ihm.choisirHeros('h1'); }
  if (niveau?.plan.troncon) explorer();
  if (cine) cine.jouer('depart', {});
  document.querySelector('#chargement').hidden = true;
  document.documentElement.dataset.pret = '1';
  game.start();
}

demarrer().catch((e) => {
  console.error(e);
  document.querySelector('#chargement').textContent = `Le terrain n'a pas pu se charger : ${e.message}`;
});
