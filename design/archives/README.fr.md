# Les archives du camp : l'intérieur de la grande tente

Les archives (`archives.html`, `src/archives/`) montrent tous les assets du projet : les personnages, les classes, les sorts et les animations, chacun avec un petit aperçu animé. On y entre par une petite tente du camp, à l'ouest du feu (`src/27_archives.js`, un court sentier y mène) ; dedans, c'est une immense tente avec une bibliothèque au fond, et l'interface est posée par-dessus.

## Ce qui est ici
| Pièce | Où | Ce que c'est |
|---|---|---|
| L'intérieur de la grande tente | `public/assets/lpc/archives/interieur.png` (640 × 360) | la toile du chapiteau, les mâts et la poutre, les pans drapés, la bibliothèque à cinq rayons, le plancher et le tapis, deux lanternes de laiton |
| La planche de contrôle | `_planche.png` | l'intérieur, pour le regarder sans lancer le jeu |

Il est dessiné pixel par pixel par `outil/archives.mjs` (Node seul), dans les rampes du camp : le bois et le laiton de `design/camp/outils/loup_sculpte.mjs`, contour sombre, lumière en haut à gauche. Pour le changer, modifier l'outil puis lancer, depuis `outil/` :

```
node archives.mjs
```

## Les règles suivies (DESIGN.fr.md)
- **L'habillage épique de BABA** : les grandes boîtes prennent le cadre de bois (`--cadre-bois`), les rayons le cadre fin (`--cadre-fin`), le parchemin est dedans ; tout vient de `src/33_cadres.js` et `src/cadres.css`. Les aperçus sont dans des cases de bois creux ; ce qui est choisi est bordé d'or.
- **Des pixels nets** : l'intérieur est posé à l'échelle entière qui couvre l'écran (3× sur un écran de 1600 × 900).
- **Pas de verre ni de flou** : les panneaux sont opaques ; la tente se voit autour d'eux.

## La petite tente du camp
La tente pointue à l'entrée ouverte, la potence et l'enseigne au livre viennent de « [LPC] Medieval Village Decorations » (la planche des décorations du camp, `CREDITS.md`). `src/tente.js` la découpe et la pose.

## À trancher
- L'emplacement de la tente (la clairière à l'ouest du feu, `TENTE` dans `src/27_archives.js`, et son sentier dans `src/01_plan.js`) : c'est le camp de BABA, il peut la déplacer.
- L'intérieur est une première version : la toile du plafond pourrait être plus marquée, et la bibliothèque recevoir des objets (un globe, un crâne, des bougies).
