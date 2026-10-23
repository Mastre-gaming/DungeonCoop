// L'atelier des niveaux (niveaux.html) : on y entre depuis la table des cartes du camp (src/62_table_cartes.js).
//   ?test   les vérifications (le modèle, les gestes, l'export, l'essai au terrain)
import { createGame } from '../skills/core/module/06_game.js';
import * as atelierSkill from './atelier.js';
import * as tests from './tests.js';
import { habiller } from '../33_cadres.js';
import '../panneau.css';
import '../jeu.css';
import '../cadres.css';
import './niveaux.css';

habiller();   // le bois veiné, les cadres à coins de laiton, le parchemin (DESIGN.fr.md §1, src/33_cadres.js)

const game = createGame({ storage: { prefix: 'dungeoncoop:' } });
const images = await atelierSkill.chargerPlanches();
const atelier = game.use(atelierSkill, { images });
game.use(tests, { atelier });
Object.assign(game.dbg, { atelier });
game.render = () => {};
document.querySelector('#chargement')?.remove();
document.documentElement.dataset.pret = '1';
game.start();
