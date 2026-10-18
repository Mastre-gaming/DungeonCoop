// Les archives du camp (mission à venir) : on y entre par la tente des archives (E devant elle, au camp) ; « Retour au
// camp » ramène devant elle. On y consulte tous les assets du projet : personnages, classes, sorts et animations.
//   ?test   les vérifications, résultat « réussies/total »
//   ?onglet=sorts&id=foudre   ouvre ce rayon et cette carte
import { createGame } from '../skills/core/module/06_game.js';
import * as vueSkill from './vue.js';
import * as tests from './tests.js';
import { habiller } from '../33_cadres.js';
import '../panneau.css';
import '../jeu.css';
import '../cadres.css';
import './archives.css';

habiller();   // le bois veiné, les cadres à coins de laiton, le parchemin (DESIGN.fr.md §1, src/33_cadres.js)

const game = createGame({ storage: { prefix: 'dungeoncoop:' } });
const vue = game.use(vueSkill);
game.use(tests, { vue });
Object.assign(game.dbg, { vue });
game.render = () => {};
document.querySelector('#chargement')?.remove();
document.documentElement.dataset.pret = '1';
game.start();
