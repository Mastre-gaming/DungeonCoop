# Le terrain d'entraînement (mission #14)

Le combat D1 de la Salle d'essai de Fraps (`design/combat-d1/`, PR #74), devenu une scène du jeu, où l'on entre depuis le camp. Les règles et les héros sont les mêmes que dans le kit, mais **sans cases** : chaque classe a une distance maximale par tour, en mètres. Les règles exactes sont dans `FIGHT_RULES.md`, partie « On trial ».

- **Y aller :** dans le camp, devant le terrain d'entraînement (clairière des héros, au nord-est), appuie sur **E**. On peut aussi ouvrir directement `entrainement.html`. « Retour au camp » ramène devant le terrain.
- **La salle :** 24 × 16 cases (36 × 24 m), cinq fois la salle D1. Au nord, l'étang : de l'eau profonde, on n'y marche pas (une remarque après D1). Sa flaque, elle, se traverse. Au sud, le fossé remplace la corniche du kit. Il y a aussi des tonneaux d'huile, des rochers (ils coupent la vue) et du foin (il ne la coupe pas).
- **En jeu :** clique sur un héros, puis sur le sol éclairé pour marcher : le chemin et sa longueur s'affichent. Choisis une capacité (1 à 9), puis une cible entourée d'or. Chaque attaque montre son d20 en grand (l'autre remarque après D1). La fiche de mesure se copie à la fin, comme dans la Salle d'essai.
- **À plusieurs (#80) :** dans un groupe du camp (« Jouer à plusieurs »), **E** devant le terrain emmène **tout le groupe** : l'hôte du camp devient l'hôte du terrain, avec le même code. Dans le lobby (l'accueil), chacun a une place de héros, peut en **prendre** une libre ou la **laisser**, et choisit la classe des siennes (◀ ▶). L'hôte choisit le mode de tour et **commence** ; il joue les héros sans joueur. En combat, chacun ne joue que ses héros, et voit le **pointeur** des autres avec ce qu'ils préparent (« Fraps : Foudre → Sbire 2 »). La phase finit quand tous ceux qui ont un héros debout ont cliqué **« Je suis prêt »**. L'hôte tient les règles et les dés ; si un ami part, l'hôte joue ses héros (ils lui reviennent s'il revient) ; si l'hôte part, chacun continue seul. « Retour au camp » de l'hôte ramène tout le groupe, qui se refait au camp.
- **Les barres de vie :** **V** montre ou cache celles des ennemis, **Maj+V** celles des alliés : le nom et les PV au-dessus de chaque tête. Ce navigateur s'en souvient.
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
| `7-choix-de-l-equipe.png` | l'accueil : la classe de chaque héros, ◀ ▶ (#76) |
| `8-equipe-d-essai.png` | une équipe d'essai en jeu : Éclaireuse (10,5 m), Chevalier (6 m), Druide, Barde |
| `9-lobby-a-plusieurs.png` | le lobby chez Fraps (deux navigateurs, la vraie connexion) : sa place, celle de Paolitus, deux libres (#80) |
| `10-combat-a-plusieurs.png` | le combat chez Paolitus : le Voleur de Fraps, son pointeur et ce qu'il prépare, « Je suis prêt (0/2) » (#80) |
| `11-barres-de-vie.png` | V et Maj+V : les barres de vie et les noms au-dessus des têtes |

## La suite
- **#76 :** les classes d'essai à choisir à l'entrée. C'est fait : à l'accueil, ◀ ▶ sur chaque héros, « Le kit D1 », « Au hasard ». Les fiches sont dans `CLASSES_ESSAI.fr.md`.
- **#80 :** le terrain à plusieurs. C'est fait : le lobby, le combat partagé, « Je suis prêt ».
- **#77 :** l'enclos agrandi du terrain dans le camp. C'est une proposition de plan, que le propriétaire du camp doit choisir.
