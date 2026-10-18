# Les animations des capacités : esquisses et bibliothèque

Aujourd'hui, une capacité ne joue que le geste LPC du lanceur (sort, estoc, taille ou tir, dans `src/entrainement/vue.js`). Il n'y a pas de projectile, pas d'impact et rien sur la cible. Ce dossier montre ce qui manque, et fournit les pièces pour le construire. Rien ne change dans le jeu : pour les y mettre, il faudra une mission sur l'axe pixel art (voir aussi [#55](https://github.com/Mastre-gaming/DungeonCoop/issues/55), les effets des combos).

## Ce qu'il y a
| Quoi | Où | Pour quoi faire |
|---|---|---|
| Les esquisses | `index.html` (s'ouvre par un double-clic) | 25 effets, chacun sur une vraie scène du terrain d'entraînement (les personnages LPC, l'herbe et le tonneau du jeu), en boucle, avec leur déroulé image par image |
| Leurs planches | `esquisses/<effet>.png`, `esquisses/<effet>-cles.png` | toutes les images d'un effet côte à côte (192 × 96 px chacune), et 4 images clés |
| Leurs GIF | `captures/<effet>.gif` | pour les montrer ailleurs (PR, Discord) |
| La bibliothèque | `bibliotheque/index.html` | 42 briques détourées et réutilisables, rangées par famille |
| Ses planches et son index | `bibliotheque/<brique>.png`, `bibliotheque/bibliotheque.json` | ce que le jeu chargera |
| Le lecteur | `bibliotheque/lecteur.js` | quelle image montrer à un instant, et où la poser |
| L'outil | `outil/` | tout se refait avec `node fabriquer.mjs` depuis `outil/` (Node seul, sans rien installer) |
| L'index des esquisses | `esquisses/esquisses.json` | le nom, la classe, la famille, le nombre d'images et le déroulé de chaque effet, pour les pages web (les archives du camp) ; `node index-esquisses.mjs` depuis `outil/` le refait |

Les 25 effets : Étincelle, Éclaboussure, Foudre, Foudre sur l'eau (le combo) ; Flèche de feu, Fiole d'huile, Tir rapide, Filet, Tir lesté ; Fouet de ronce, Liane, Pluie, Chant de bataille, Moquerie ; Soin, Garde de givre, Cri de ralliement, Charge au bouclier ; Coup d'épée, Fracas, Dague, Ouverture, Projection et Pousser, Potion, Relever.

## Les règles suivies
- **12 images par seconde**, comme les animations LPC. Un effet dure de 1,2 à 2 s.
- **Trois calques.** Le sol (flaques, glace, anneaux) passe sous les personnages. Les objets (flèches, fioles, lianes) ont le contour sombre des objets LPC. La lumière (lueurs, éclairs) s'ajoute à l'image.
- **Les couleurs sont celles des icônes** (`design/ui-combat/icones/`) : chaque effet a la couleur de son icône. La foudre est jaune et blanche, le givre cyan, l'huile violet sombre, le soin vert.
- **Le coup qui porte** : la cible blanchit une image et recule de 2 px. Les gros coups (Fracas, Foudre, Tir lesté, les chocs) font aussi trembler l'écran de 1 à 3 px.
- **Un effet se découpe en trois** : un départ (sur le lanceur), un vol (une boucle de 2 à 4 images, qu'on déplace) et un impact (4 à 8 images). C'est ce découpage qui donne la bibliothèque.

## La bibliothèque
Chaque brique est une planche : ses images sont côte à côte, de gauche à droite, sur un fond transparent. `bibliotheque.json` donne pour chacune :

| Champ | Sens |
|---|---|
| `w`, `h`, `images` | la taille d'une image et leur nombre |
| `fps`, `boucle` | la vitesse (12) ; `true` si elle tourne tant que l'effet dure (un état, un projectile) |
| `ancre` | le point de l'image à poser sur la scène : le torse de la cible, ses pieds, la tête, le bout de l'arme… |
| `calque` | `sol` : sous les personnages ; `dessus` : par-dessus |
| `usage`, `description` | les capacités qui s'en servent, et ce qu'on voit |

Les familles : impacts, projectiles, traînées d'armes, foudre, surfaces, états (En feu, Trempé, Huilé, Gelé, Exposé, À terre, Inspiré…), soins, divers.

Avec les sprites three.js du jeu, une brique se pose comme un personnage :

```js
import { cadre } from '../../design/animations/bibliotheque/lecteur.js';
const c = cadre(briques['impact-etoile'], t);          // t : secondes depuis le début de l'effet
if (c) sprite.poser(x - c.ax, y - c.ay, y, c.sx, c.sy); // null : la brique est finie
```

Les flèches pointent à droite : pour un tir vers la gauche, on retourne l'image.

## Trouvé en route : les personnages perdent des habits au repos
Les rangées « repos » (22 à 25) des feuilles du terrain d'entraînement ne contiennent pas tous les calques LPC. Au repos, la mage n'a plus sa robe, la barde sa chemise, le druide son bâton, le chevalier son bouclier, et les brutes et le chef leur arme. Les esquisses prennent donc l'image debout de la marche. Dans le jeu, c'est sans doute à corriger, dans une mission à part.

## À trancher
- La Fiole d'huile joue le geste du tir à l'arc : un geste de lancer serait plus juste.
- Aucun geste LPC ne permet de boire : pour la Potion, le geste du sort, ou aucun geste ?
- Faut-il garder l'assombrissement de la salle et le flash de la Foudre ? Ils sont forts, mais c'est le coup le plus cher du Mage.
- Faut-il garder la lumière en addition dans le jeu ? Les planches de la bibliothèque la mettent déjà dans l'image, ce qui suffit pour commencer.
