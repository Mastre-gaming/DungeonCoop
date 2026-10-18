// L'armurerie : le créateur de classe (mission #125). On y entre depuis l'armurerie du camp (E devant sa porte) ;
// « Retour au camp » ramène devant elle. Chacun y conçoit sa classe dans le cadre du jeu (CLASS_FRAMEWORK.fr.md),
// voit son build en direct (PV, distance, dégâts, ce qui bloque), l'enregistre dans ce navigateur, l'exporte en JSON
// (content/classes/<id>.json dans une PR) ou en fiche texte, et peut lire et retoucher le cadre lui-même (l'onglet Cadre).
//   ?test   les vérifications, résultat « réussies/total »
//   ?classe=eclaireuse   ouvre cet exemple (content/classes/)
import { createGame } from '../skills/core/module/06_game.js';
import * as editeurSkill from './editeur.js';
import * as tests from './tests.js';
import CADRE from './cadre.json';
import '../panneau.css';
import '../jeu.css';
import './classe.css';

const query = new URLSearchParams(location.search);
const game = createGame({ storage: { prefix: 'dungeoncoop:' } });
// les exemples livrés avec le jeu (content/classes/*.json) : l'exemple de la fiche et les classes d'essai du terrain
const EXEMPLES = Object.fromEntries(Object.entries(import.meta.glob('../../content/classes/*.json', { eager: true, import: 'default' }))
  .map(([chemin, c]) => [c.id ?? chemin.split('/').pop().replace('.json', ''), c]));

const editeur = game.use(editeurSkill, { cadre: CADRE, exemples: EXEMPLES, ouvrir: query.get('classe') });
game.use(tests, { editeur, cadre: CADRE, exemples: EXEMPLES });
Object.assign(game.dbg, { editeur, cadre: CADRE, exemples: EXEMPLES });
game.render = () => {};
document.querySelector('#chargement')?.remove();
document.documentElement.dataset.pret = '1';
game.start();
