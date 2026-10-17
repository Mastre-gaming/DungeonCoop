# Prompt : designer le camp

Colle le bloc ci-dessous dans une nouvelle session Claude Code ouverte sur `AI games/dungeon-coop/`. Il porte tout ce qui a été décidé le 18 oct, pour que la session parte du bon endroit sans tout redemander.

```
Session de design du camp de Dungeon Co-op. Objectif : que le camp soit dessiné, cohérent et prêt à construire. On ne construit pas encore le prototype : le code du camp viendra dans une session suivante, sur ce design.

## À lire d'abord, dans cet ordre
1. CAMP.fr.md : le concept complet du camp. C'est la référence ; tout ce qui suit en vient.
2. CLAUDE.md du projet, puis ../game-studio/STANDING_CALLS.md et ../game-studio/ANTI_PATTERNS.md.
3. GAME_SPEC.md (« Now », les jalons, les décisions du 18 oct) et STORY_STRUCTURE.fr.md §8.
4. Le plan de travail, dans l'autre repo : https://github.com/Mastre-gaming/DungeonCoop-dashboard/blob/main/docs/PLAN_TRAVAIL.md (la phase 0 et les 8 axes).
5. Les skills : game-skills d'abord, puis lpc-sprite-mods (et son PITFALLS.md).

## Déjà décidé (ne pas rouvrir)
- Construire le jeu, c'est déjà le jeu. On est des apprentis développeurs de jeux vidéo ; coder le jeu est une grande partie du fun. Le camp gamifie la création elle-même.
- Le camp du dashboard EST le camp vivant du jeu (STORY_STRUCTURE §8). Il vient en premier : M1 = « le camp ». KICKOFF.md est signé (18 oct).
- Pixel art LPC, 2D, vue de dessus « trois-quarts » (celle des sprites LPC), cases de 32 px, rendu net (pas de lissage, échelle entière).
- Déplacement libre (pas de grille, pas de tours), au clavier (ZQSD, flèches) ou au clic.
- Caméra : suit le héros avec une zone morte au centre (30 % de l'écran), rattrape en douceur, s'arrête aux bords, position arrondie au pixel. Zoom « moyen » par défaut : environ 20 × 11 cases visibles. Vue « visite » dans le dashboard : pas de héros, tout le camp dans le cadre. Un camp d'environ 36 × 24 cases (à confirmer par le design).
- 1 à 4 héros : visiter seul, ou héberger avec un code à cinq lettres et rejoindre (skill party-net).
- Les missions sont les issues du repo du jeu (label `axe: …`, label `taille: S/M/L`, un jalon). On les prend et on les rend dans le tableau de travail du dashboard (autre repo). Le camp ne fait que les lire.
- Un lieu par axe de création du plan (8), plus le feu de camp au centre pour toute l'équipe. Points par mission rentrée : S = 1, M = 3, L = 8. Niveaux d'un lieu : 0 (emplacement : piquets et pancarte), 1 (tente, dès 1 point), 2 (cabane, 5), 3 (bâtiment, 15), 4 (bâtiment décoré, lumière et vie, 35). Le feu grandit avec le total de l'équipe. Aucun chiffre par personne, aucun classement.
- Les noms des lieux sont PROVISOIRES (CAMP.fr.md §4) : l'axe Histoire n'a pas de responsable pour l'instant, et l'histoire est celle de l'équipe. Tu n'écris ni histoire, ni dialogues, ni noms définitifs.
- « Les premières fois du dev » (l'équipement des héros) : à définir plus tard. N'y touche pas.

## Ce que la session doit produire
1. Le plan du camp : où va chaque lieu, le feu, les chemins, l'entrée, le point d'apparition des héros, les bords (arbres, palissade…). Un lieu (ou deux) à l'écran à la fois au zoom moyen, de la place autour de chacun (une pièce maîtresse par vue). Rendu : une image de blockout (vue de dessus, les cases, les emprises de chaque lieu à chaque niveau) que tu regardes avant de me la montrer.
2. Pour chaque lieu, ses 5 niveaux en pixel art : ce qu'on voit, l'emprise en cases (qui grandit sans écraser les voisins), l'élément qui dit l'axe d'un coup d'œil (une enclume pour la technique, un chevalet pour l'art…), et la vie au niveau 4 (fumée, lumière, petit mouvement). Et le feu de camp à plusieurs tailles.
3. La liste des pièces LPC à utiliser : tuiles du sol, chemins, arbres, tentes, cabanes, bâtiments, accessoires, feu, et les héros de départ. Pour chacune : le lien OpenGameArt (ou le générateur LPC), les auteurs, la licence, et ce qu'il faudrait retoucher dans Sprite Painter. Vérifie chaque licence sur sa page. Ne télécharge RIEN sans mon accord : présente la liste, avec la taille des fichiers, et attends mon oui.
4. Ce qu'on voit en s'approchant d'un lieu : le panneau qui montre l'axe, son niveau, ses points et ses missions (maquette dans le style du jeu, pas un tableau de programmeur).
5. Le brouillon de content/axes.json : les 8 axes du plan, leur label GitHub, le lieu (nom provisoire) et l'emplacement de chacun. C'est le contrat lu par le jeu et par le dashboard.
6. La mise à jour de CAMP.fr.md avec tout ça (la carte, les niveaux de chaque lieu, les pièces LPC), et les questions qui restent dans §10.

## Règles
- Le style : bright, lisible, pas de brume ni de flou ; le camp doit avoir l'air vivant (feu qui crépite, fumée, lumières), même au niveau 0.
- Pas de nouveau modèle 3D ni de Blender : l'art vient du générateur LPC et des packs LPC, retouchés avec lpc-sprite-mods.
- Chaque pièce garde sa licence ; les crédits vont dans CREDITS.md quand les pièces entrent dans le jeu.
- Une seule chose à la fois (porte T) : un lieu dessiné et validé par moi avant de faire les sept autres sur le même modèle.
- Tu me montres chaque image avant de dire que c'est fait.
- Ne commite et ne pousse que quand je le dis. Pas de ligne « Co-authored-by » (règle 12). Rien de dl/ dans le repo.
- Tout écrit pour l'équipe est en français.

## Commence par
Lire les fichiers ci-dessus, puis me proposer deux ou trois plans de camp très différents (en blockout simple), avec ta recommandation, avant d'aller dans le détail des lieux.
```
