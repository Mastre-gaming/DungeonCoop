// Le camp de Dungeon Co-op, prototype v0 (CAMP.fr.md §7) : le camp, le héros, la caméra, le panneau des missions,
// la sentinelle de l'entrée et le jeu à plusieurs.
//   ?code=ABCDE rejoindre ce groupe
//   ?visite   pas de héros, tout le camp dans le cadre (la carte du dashboard)
//   ?test     les vérifications, résultat « réussies/total » en bas à droite
//   ?spot=feu aller à un point nommé (apparition, feu, visite, et chaque lieu : interface, histoire, level, combat…)
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
import './jeu.css';

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
  const images = await chargerImages();
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
  const camera = game.use(cameraSkill, { rendu, visite, monde: { w: W * T, h: H * T }, cible: visite ? null : () => heros.heros });
  // les missions (les tâches du tableau de travail) ; en ?test, rien ne part sur le réseau
  const missions = game.use(missionsSkill, { horsLigne: query.has('test') });
  const panneau = game.use(panneauSkill, { rendu, canvas, decor, missions, heros, images, visite });
  // la sentinelle : sa scène à chaque arrivée (pas en visite, ni pendant les vérifications, ni quand on va à un point nommé)
  const sentinelle = game.use(sentinelleSkill, { rendu, heros, images, missions, collision, camera, visite, scene: !visite && !query.has('test') && !query.has('spot') });
  const reseau = game.use(reseauSkill, { rendu, heros, images, sentinelle, visite });
  game.render = () => rendu.dessiner();
  const camptests = game.use(tests, { heros, collision, camera, rendu, visite, camp, game, missions, panneau, decor, sentinelle, reseau });

  // Les points nommés (dbg.go, ?spot=, les captures).
  const aller = (x, y, dir = 'bas') => () => { heros.placer(x, y, dir); camera.snap(); };
  game.dbg.spot('apparition', aller(depart.x, depart.y));
  game.dbg.spot('feu', aller(...tests.devantFeu(), 'haut'));
  for (const l of LIEUX) game.dbg.spot(l.id, aller(...tests.devant(l), 'haut'));
  game.dbg.spot('visite', () => { location.search = '?visite'; });
  Object.assign(game.dbg, { rendu, camp, heros, camera, decor, collision, missions, panneau, sentinelle, reseau, tests: camptests, lieux: LIEUX.map((l) => l.id) });
  game.dbg.spot('sentinelle', () => { sentinelle.oublier(); sentinelle.demarrer(); });
  game.dbg.spot('panneau', () => { aller(...tests.devant(LIEUX[0]), 'haut')(); panneau.ouvrir('interface'); });

  document.documentElement.dataset.pret = '1';
  game.start();
}

demarrer().catch((e) => {
  console.error(e);
  document.querySelector('#chargement').textContent = `Le camp n'a pas pu se charger : ${e.message}`;
});
