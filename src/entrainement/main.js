// Le terrain d'entraînement (mission #14) : le combat D1 de la Salle d'essai de Fraps, sans cases, en pixel art LPC.
// On y entre depuis son lieu dans le camp (E devant le terrain) ; « Retour au camp » ramène devant lui.
//   ?test   les vérifications, résultat « réussies/total » (le moteur, la géométrie, un combat entier, l'interface)
//   ?graine=12   les dés d'un combat rejouable (sinon, le hasard)
//   ?groupe=ABCDE(&hote)   à plusieurs (#80) : le groupe du camp, venu ensemble (multi.js)
import { createGame } from '../skills/core/module/06_game.js';
import { chargerImages } from '../02_images.js';
import { creerRendu } from '../04_rendu.js';
import * as SALLE from './salle.js';
import { creerTrame } from './geometrie.js';
import { creerCombat, equipeDepuis, EQUIPE_KIT } from './regles.js';
import * as vueSkill from './vue.js';
import * as interfaceSkill from './interface.js';
import * as multiSkill from './multi.js';
import * as tests from './tests.js';
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

async function demarrer() {
  const planches = {
    limier: 'compagnons/limier.png', herbe: 'grass.png', terre: 'dirt.png', eau: 'water.png', trou: 'hole.png', roche: 'rock.png', tonneau: 'barrel.png', deco: 'decorations-medieval.png',
    ...Object.fromEntries(Object.keys(PERSOS).map((id) => [`perso_${id}`, `entrainement/${id}.png`])),
    ...EFFETS,                    // les briques de la bibliothèque d'animations (effets.js, #134)
  };
  const images = await chargerImages('./assets/lpc/', planches);
  const canvas = document.querySelector('#jeu');
  const rendu = creerRendu(canvas);
  rendu.renderer.setClearColor(0x2f5a2a);
  rendu.sol(SALLE.composerSol(images));
  rendu.statiques(SALLE.composerDecor(), images);

  const salle = SALLE.salle(), trame = creerTrame(salle);
  const alea = query.has('graine') || query.has('test') ? graine(Number(query.get('graine')) || 20261018) : Math.random;
  // l'équipe choisie à l'entrée (#76) : ?equipe=brute,chevalier,druide,barde ; sinon les 4 héros du kit D1
  const equipe = equipeDepuis(query.get('equipe')) ?? EQUIPE_KIT;
  const creer = (eq) => creerCombat({ trame, salle, departs: SALLE.DEPARTS, tonneaux: SALLE.TONNEAUX, flaque: SALLE.FLAQUE, equipe: eq, alea });
  let combat = creer(equipe);
  // Un autre combat sans recharger la page (une autre équipe, Rejouer, le lobby à plusieurs) ; copie : l'état de l'hôte.
  const nouveauCombat = (eq, copie = null) => {
    combat = creer(eq);
    if (copie) combat.restaurer(copie);
    vueSkill.remplacer(combat); interfaceSkill.remplacer(combat); multiSkill.api.remplacer(combat);
    game.dbg.combat = combat;
    return combat;
  };

  const vue = game.use(vueSkill, { rendu, images, combat, salle, canvas });
  // ?go : on vient de choisir l'équipe et de cliquer « Commencer » : le combat démarre tout de suite (?mode= le mode de tour)
  const ihm = game.use(interfaceSkill, { combat, vue, canvas, nouveauCombat, demarrer: query.has('go'), mode: query.get('mode') });
  const multi = game.use(multiSkill, { combat, vue, ihm, nouveauCombat });
  game.render = () => rendu.dessiner();
  Object.assign(game.dbg, { combat, vue, ihm, multi, trame, salle, rendu, nouveauCombat });
  game.use(tests, { combat, vue, ihm, multi, trame, salle, game, images, SALLE });

  document.querySelector('#chargement').hidden = true;
  document.documentElement.dataset.pret = '1';
  game.start();
}

demarrer().catch((e) => {
  console.error(e);
  document.querySelector('#chargement').textContent = `Le terrain n'a pas pu se charger : ${e.message}`;
});
