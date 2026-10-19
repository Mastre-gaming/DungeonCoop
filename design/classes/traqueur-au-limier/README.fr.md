# Le Traqueur au limier : la classe de Paolitus

La fiche de la classe est `content/classes/traqueur-au-limier.json` (par Paolitus, PCrrfng). Ce dossier fait sa planche LPC (`public/assets/lpc/entrainement/traqueur-au-limier.png`), celle de son limier au camp (`public/assets/lpc/compagnons/limier.png`), les étapes du familier, et montre ce qu'ils font.

Un baroudeur des bois, capuche brune et barbe de trois jours, et son limier, un malinois au masque noir. Ses pièges clouent la proie sur place, le limier la rabat dedans ou soigne un allié, et lui l'achève à l'arc.

## La classe en bref
| | |
|---|---|
| **Rôle** | Contrôle, avec un soin d'appoint (le limier) |
| **Particularité** | un familier qui rabat la proie et soigne les alliés |
| **Caractéristiques (27 points)** | FOR 10, DEX 15 (+2), CON 14 (+2), INT 8 (−1), SAG 14 (+2), CHA 10 |
| **Points de classe (10)** | PV de base 110 (1), déplacement 6 cases (2), Pose de piège 2 + renfort 1, le limier 3 + renfort 1 |
| **PV, distance** | **120 PV** (110 + 10 de CON), **9 m par tour** |
| **Ressource** | Concentration (+1 quand un allié exploite une de ses préparations) |
| **Faiblesse** | Lié à sa bête : si le limier tombe, le Traqueur a le désavantage jusqu'à ce qu'il le relève (une action) ; et un chien qui soigne devient une cible prioritaire |

## Ses trois capacités de départ
| Capacité | Sorte | Ce qu'elle fait |
|---|---|---|
| **Arc de chasse** | attaque de base, action | 8 + d4 + DEX à 12 m (5–7 / 11–14 / 22–28) |
| **Pose de piège** | préparation, action (+ renfort) | un piège au sol à 7,5 m, que le premier ennemi déclenche. Au choix en le posant : **Mâchoires** (À terre, ne bouge pas à son prochain tour), **Glu** (Gelé), **Collet** (tiré de 3 m vers le Traqueur) |
| **Le limier** | soutien, action bonus (+ renfort) | un malinois, 30 PV, 9 m par tour, **sans tour à lui** : un ordre par tour. **Lécher les plaies** : il court au contact d'un allié à 9 m, 8 + d4 + SAG PV (11 à 14) et retire un état (Brûlure, Gelé, Huilé). **Mordre** : 5 + d4, la cible est Exposée. **Rabattre** (renfort) : il pousse un ennemi de 3 m, dans un piège, une surface ou le fossé |

**Le choix de chaque tour :** un seul ordre au limier. Rabattre la proie dans le piège, ou soigner l'allié : c'est là que se joue la classe.

## Ses dégâts
Au niveau 1, environ 12 à 15 par round, soit un cinquième des dégâts de l'équipe (la barre est 40 % : jamais un joueur qui porte les autres). Sa vraie valeur, ce sont les dégâts des autres grâce à lui.

| Source | Éraflure | Touché | Critique |
|---|---|---|---|
| Arc de chasse | 5–7 | 11–14 | 22–28 |
| Morsure du limier | 6–9, la cible est Exposée | | |
| **Tir sur proie entravée** (niveau 2) | 8–11 | 17–22 ; **×2 sur une cible À terre ou Gelée : 34–44** | 34–44 (×2 : 68–88) |

## Sa progression
- **Niveau 2 : Tir sur proie entravée.** Une exploitation : 14 + d6 + DEX, ×2 sur une cible À terre ou Gelée. Les pièges et le limier préparent, lui finit.
- **Niveau 3, deux chemins :**
  - **Maître-piégeur** : niv. 3 deux pièges posés à la fois · niv. 7 les mâchoires mordent (8 + d4) · niv. 11 les pièges sont invisibles aux ennemis · niv. 15 il déclenche un piège à distance, d'un tir.
  - **Maître-chien** : niv. 3 la Curée (quand une proie piégée tombe, le limier soigne l'allié le plus blessé de 10) · niv. 7 le limier devient **loup** (45 PV, Lécher les plaies rend 14 + d6) · niv. 11 Garde (en réaction, le loup intercepte un ennemi qui fonce sur un allié) · niv. 15 **loup alpha** (60 PV, deux ordres par tour, sa morsure met À terre).
- **Niveau 6, coup d'équipe avec la Brute : la Battue.** Le limier rabat, la Brute projette la proie à travers deux pièges.
- **Niveau 20, signature : l'Hallali.** Une fois par combat, trois loups surgissent et rabattent chacun un ennemi dans un piège.

## Ses combos avec l'équipe
| Avec | Le combo |
|---|---|
| La Brute | le limier rabat, la Brute projette la proie clouée par les mâchoires (+8 contre l'obstacle) |
| La Mage | la glu tient la proie dans sa flaque : Foudre ×2 sur la cible Trempée qui ne peut plus fuir |
| Le Voleur | le collet tire l'ennemi dans l'Huile, le Voleur l'enflamme |
| Le Druide | la Liane attire la proie, le piège l'attend à l'arrivée |
| Baba Brisenclume | la proie est À terre dans les mâchoires : l'enclume tombe dessus, et le limier soigne Baba |
| Shadow | la morsure Expose la cible : son Coup dans le dos fait ×2 |

## Ce qu'on voit
| Quoi | Où |
|---|---|
| Debout, de dos, de gauche, de face et de droite | `captures/traqueur-tour.png` |
| Sa marche (les 4 directions), son tir à l'arc | `captures/traqueur-marche.gif`, `captures/traqueur-tir.gif` |
| Le limier au camp, les 4 directions | `captures/limier-marche.gif` |
| Les étapes du familier : le malinois, le loup, le loup alpha | `captures/familier-etapes.gif`, `familier/*.png` |
| Au camp : le Traqueur et son limier qui le suit ; le menu de choix (onglet Paolitus) | `captures/jeu-camp.png`, `captures/jeu-choix.png` |

## Comment c'est fait
- **Le Traqueur** est le personnage du générateur LPC, tel quel : capuche brune, manteau marron fourré, mantelet et pantalon vert foncé, écharpe et bandoulière noires, bracelets de bronze, ceinture de cuir, bottes à revers noires, carquois et arc long, barbe de trois jours (le lien est en tête de `public/assets/credits/entrainement-traqueur-au-limier.txt`). Le look a été choisi par Paolitus parmi une dizaine de variantes rendues.
- **Le limier et ses étapes** partent du loup de « [LPC] Wolf Animation » (Redshrike, OpenGameArt), repeint selon la clarté de chaque pixel. Le malinois : robe fauve, masque noir qui fonce en dégradé du cou au museau, voile charbonné sur le dos (des poils épars, pas une selle), sans collier. Le loup : gris. Le loup alpha : sombre et bleuté. Pour l'instant, le masque et le voile ne sont peints que sur les vues de profil.
- **Au camp** (`src/47_limier.js`) : quand le héros incarné est le Traqueur, le limier le suit sur ses traces, un peu derrière lui, et s'arrête avec lui. Il ne bloque personne. Pour l'instant, il n'est que chez soi : les autres joueurs voient le Traqueur sans son chien.

## La refaire
Depuis `outil/` :
```
node planche.mjs <sheet.png> <credits.txt>
node limier.mjs ../../../../dl/lpc/loup/wolfsheet3.png
node gifs.mjs
```
`sheet.png` et `credits.txt` : l'import du skill `lpc-sprite-mods` (`npm run import -- "<le lien de planche.mjs>" --id=traqueur-au-limier --anchor=weapon`). `wolfsheet3.png` : de https://opengameart.org/content/lpc-wolf-animation, dans `dl/` (on ne le garde pas dans le dépôt).

## À décider avec le groupe
- **Le familier n'existe pas encore dans le cadre des classes** (`CLASS_FRAMEWORK.fr.md`) : ce qu'il coûte (ici, une capacité de soutien, 3 points + 1 de renfort), ce qu'il peut faire, et qu'il n'ait pas de tour à lui, pour garder des tours rapides.
- **Les pièges sont des objets nouveaux** au sol (le cadre demande l'accord de l'équipe pour toute nouvelle surface).
- **Le soin :** le limier soigne en appoint (11 à 14 par round). Quelqu'un fera-t-il un vrai soigneur ?
- **Les répliques du camp** (`src/data/repliques.json`) sont provisoires et neutres : à réécrire par Paolitus.
