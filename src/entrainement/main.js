// Le terrain d'entraînement (mission #14) : le combat D1 de la Salle d'essai de Fraps, sans cases, en pixel art LPC.
// On y entre depuis son lieu dans le camp (E devant le terrain) ; « Retour au camp » ramène devant lui.
//   ?test   les vérifications, résultat « réussies/total » (le moteur, la géométrie, un combat entier, l'interface)
//   ?graine=12   les dés d'un combat rejouable (sinon, le hasard)
import { createGame } from '../skills/core/module/06_game.js';
import { chargerImages } from '../02_images.js';
import { creerRendu } from '../04_rendu.js';
import * as SALLE from './salle.js';
import { creerTrame } from './geometrie.js';
import { creerCombat, equipeDepuis, EQUIPE_KIT } from './regles.js';
import * as vueSkill from './vue.js';
import * as interfaceSkill from './interface.js';
import * as tests from './tests.js';
import PERSOS from './persos.json';
import '../panneau.css';
import '../jeu.css';
import './entrainement.css';

const query = new URLSearchParams(location.search);
const graine = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

const game = createGame({ storage: { prefix: 'dungeoncoop:' } });

async function demarrer() {
  const planches = {
    herbe: 'grass.png', terre: 'dirt.png', eau: 'water.png', trou: 'hole.png', roche: 'rock.png', tonneau: 'barrel.png', deco: 'decorations-medieval.png',
    ...Object.fromEntries(Object.keys(PERSOS).map((id) => [`perso_${id}`, `entrainement/${id}.png`])),
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
  const combat = creerCombat({ trame, salle, departs: SALLE.DEPARTS, tonneaux: SALLE.TONNEAUX, flaque: SALLE.FLAQUE, equipe, alea });

  const vue = game.use(vueSkill, { rendu, images, combat, salle, canvas });
  // ?go : on vient de choisir l'équipe et de cliquer « Commencer » : le combat démarre tout de suite (?mode= le mode de tour)
  const ihm = game.use(interfaceSkill, { combat, vue, canvas, demarrer: query.has('go'), mode: query.get('mode') });
  game.render = () => rendu.dessiner();
  game.use(tests, { combat, vue, ihm, trame, salle, game, images, SALLE });
  Object.assign(game.dbg, { combat, vue, ihm, trame, salle, rendu });

  document.querySelector('#chargement').hidden = true;
  document.documentElement.dataset.pret = '1';
  game.start();
}

demarrer().catch((e) => {
  console.error(e);
  document.querySelector('#chargement').textContent = `Le terrain n'a pas pu se charger : ${e.message}`;
});
