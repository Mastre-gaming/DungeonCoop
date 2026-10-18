# Le terrain d'entraînement (mission #14)

Le combat D1 de la Salle d'essai de Fraps (`design/combat-d1/`, PR #74), devenu une scène du jeu, où l'on entre depuis le camp. Les règles et les héros sont les mêmes que dans le kit, mais **sans cases** : chaque classe a une distance maximale par tour, en mètres. Les règles exactes sont dans `FIGHT_RULES.md`, partie « On trial ».

- **Y aller :** dans le camp, devant le terrain d'entraînement (clairière des héros, au nord-est), appuie sur **E**. On peut aussi ouvrir directement `entrainement.html`. « Retour au camp » ramène devant le terrain.
- **La salle :** 24 × 16 cases (36 × 24 m), cinq fois la salle D1. Au nord, l'étang : de l'eau profonde, on n'y marche pas (une remarque après D1). Sa flaque, elle, se traverse. Au sud, le fossé remplace la corniche du kit. Il y a aussi des tonneaux d'huile, des rochers (ils coupent la vue) et du foin (il ne la coupe pas).
- **En jeu :** clique sur un héros, puis sur le sol éclairé pour marcher : le chemin et sa longueur s'affichent. Choisis une capacité (1 à 9), puis une cible entourée d'or. Chaque attaque montre son d20 en grand (l'autre remarque après D1). La fiche de mesure se copie à la fin, comme dans la Salle d'essai.
- **Les personnages** sont provisoires : 8 personnages du générateur LPC, importés avec `lpc-sprite-mods`. Les liens et les crédits sont dans `public/assets/credits/entrainement-*.txt`. Les héros de chacun viendront avec D4 et les missions 3.5.

## Les captures
| Fichier | Ce qu'on voit |
|---|---|
| `1-entree-depuis-le-camp.png` | la bulle « E : entrer au terrain d'entraînement » dans le camp |
| `2-accueil.png` | l'accueil : les héros, leur distance par tour, le mode de tour |
| `3-marcher-sans-cases.png` | la zone où la Brute peut marcher, et le chemin visé (7,4 m) |
| `4-attaque-et-d20.png` | une Étincelle de la Mage : le d20 en grand, et le journal |
| `5-surfaces.png` | l'huile enflammée, la glace et l'eau, dessinées sans cases |
| `6-pixel-art-zoom.png` | le terrain zoomé : les personnages LPC |

## La suite
- **#76 :** les classes d'essai à choisir à l'entrée.
- **#77 :** l'enclos agrandi du terrain dans le camp. C'est une proposition de plan, que le propriétaire du camp doit choisir.
