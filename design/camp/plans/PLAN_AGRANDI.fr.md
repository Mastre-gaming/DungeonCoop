# Le plan d'agrandissement du camp, par quartiers (proposition du 22 oct, à valider)

![Le plan agrandi](plan_agrandi.png)

**En une phrase :** le camp se range en quartiers qui vont ensemble. Il grandit vers le nord à l'intérieur des murs, et s'ouvre hors les murs, au sud du pont-levis, sur un **faubourg des fêtes**. Il a quatre portes, et six chemins partent dans la forêt pour les prochaines missions.

## Ce qui ne bouge pas
**La grande muraille du sud, telle qu'elle** (demande du propriétaire) : même largeur (42 cases), mêmes douves, même pont-levis, et la grande porte toujours sur les colonnes 14 et 15. Le camp ne s'élargit pas : il grandit vers le nord, et le faubourg tient dans la même largeur.

## Les quartiers
| Quartier | Ce qu'il y a | Pourquoi ensemble |
|---|---|---|
| **le cœur du camp** (au milieu) | la place du village et son feu, le tableau d'affichage ; les emplacements 4 et 5 | on y arrive par la grande porte, et toutes les routes y mènent |
| **le quartier du savoir** (au nord) | l'observatoire des cartographes, la grande bibliothèque des archives, autour de la place du savoir ; l'emplacement 1 | apprendre, préparer : les cartes, les livres, ce qu'on sait du monde |
| **le quartier des artisans** (à l'ouest) | l'atelier des peintres, la forge ; l'emplacement 2 | fabriquer : les apparences, les outils |
| **le quartier des héros** (à l'est) | le terrain d'entraînement, l'armurerie ; l'emplacement 3 | se préparer au combat : s'entraîner, s'équiper |
| **le faubourg des fêtes** (hors les murs, au sud du pont-levis) | le théâtre des récits, l'estrade, autour de la place des fêtes ; l'emplacement 6 | se divertir : les histoires et la musique (demande du propriétaire) |

Le faubourg est au bout de la route du pont : en sortant par la grande porte, la route longe le théâtre et arrive sur la place des fêtes, devant sa scène. Il n'a pas de mur : la forêt l'entoure.

## Les quatre portes
| Porte | Où | Elle mène à |
|---|---|---|
| sud, la grande porte | la muraille, colonnes 14 et 15 (inchangée) | au faubourg, au sud ; à la place du village, au nord |
| ouest | le mur ouest, à hauteur de l'atelier | le quartier des artisans |
| est | le mur est, à hauteur du feu | la place du village |
| nord | le mur nord, à côté de la bibliothèque | la place du savoir |

Ce sont les portes secondaires du chantier de Mope (19 oct) : une tourelle, une porte cloutée, une lanterne. Les murs ouest et est montent jusqu'au nouveau mur nord, reculé de 24 rangées.

## Les chemins de départ des missions
Six chemins de terre sortent du camp et s'enfoncent dans la forêt jusqu'au bord de la carte (en jaune sur le plan). Ils ne mènent encore nulle part : chacun attend une mission (une salle, un chapitre, un portail…).

| Chemin | D'où il part |
|---|---|
| A | la porte nord |
| B | la porte ouest |
| C | la porte est |
| D | la place des fêtes, vers le sud |
| E | le faubourg, vers le sud-ouest |
| F | le faubourg, vers le sud-est |

## Les emplacements pour les prochains bâtiments (6 × 5 cases chacun)
Un ou deux par quartier, pour que chaque nouveau bâtiment aille avec ses voisins : **1** le savoir, **2** les artisans, **3** les héros, **4** et **5** le cœur du camp, **6** les fêtes. Chacun a sa porte en bas, au bout d'un sentier, et une case de marge autour de lui. Au niveau 0, on y voit des piquets et une pancarte, comme les autres lieux.

## Les tailles
Le camp fait 42 × 77 cases : 55 rangées dedans (au lieu de 31), la muraille et les douves (4 rangées), et 16 rangées pour le faubourg. Le théâtre fait 12 × 9 cases ; l'observatoire, la bibliothèque et l'atelier 9 × 7 ; le terrain d'entraînement garde son enclos de 8 × 8 ; les autres lieux 6 × 5.

## Vérifié par `plan_agrandi.py`
`python plan_agrandi.py` refait le plan (`plan_agrandi.svg`) et vérifie qu'il n'y a :
- aucun chevauchement entre deux lieux ou emplacements (avec une case de marge) ;
- aucun lieu sur un mur, un bois ou une place, ni hors du faubourg quand il est dehors ;
- aucun sentier qui traverse un lieu ou un bois, ni qui passe la muraille ailleurs qu'à la grande porte ;
- rien qui ne soit relié à la place du village : les quatre portes, la porte de chaque lieu et de chaque emplacement, et le bout de chaque chemin de départ ;
- aucun chemin de départ qui ne sorte pas dans la forêt.

Résultat : **OK**.

## À décider, puis à faire
- **Valider le plan** (le propriétaire, et Mope pour les murs, les portes et le faubourg devant sa muraille).
- **Le mettre dans le jeu :** `src/01_plan.js` (la taille, les lieux, les sentiers, les bois), `45_murs.js` et le chantier (le mur nord reculé, les murs ouest et est allongés), la muraille qui ne s'estompe plus de la même façon quand on sort vers le faubourg, la caméra et la vue du dashboard (le camp est bien plus haut), et les tests de marche depuis chaque porte.
- Ce qui fait grandir les archives.
