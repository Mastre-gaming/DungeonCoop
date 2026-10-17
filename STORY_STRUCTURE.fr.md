# STRUCTURE DE L'HISTOIRE (brouillon de design)

D'après les réponses du propriétaire du 17 oct. 2026. Version anglaise : `STORY_STRUCTURE.md` (on change les deux ensemble). **Ce fichier ne pose que le cadre :** où l'histoire se place dans une partie, comment elle avance, et ce qu'un auteur remplit. Il n'y a ici ni univers, ni noms, ni méchant, ni texte. Tout ça appartient à l'équipe (D3, la fiche du monde). **Paolitus est responsable des chapitres et des événements et a le dernier mot dessus : ce brouillon attend son oui.** Il colle à la forme d'une partie décrite dans `LEVEL_STRUCTURE.md`.

## Décidé (propriétaire, 17 oct.)
| Question | Réponse |
|---|---|
| Comment l'histoire avance quand on rejoue un chapitre | **Façon Hades :** chaque partie peut débloquer le moment suivant. Rejouer un chapitre en révèle davantage ; on ne revoit jamais la même scène |
| Ce que veut dire le choix du boss | chaque boss de partie **pose un drapeau**, et **chaque partie use un Boss final** qui attend à la fin de l'histoire |
| La place des héros | l'équipe écrit une liste d'**archétypes de classe** ; chaque classe appartient à l'un d'eux. L'histoire est écrite par archétype et **appelle le héros du joueur par son nom** |
| Qui choisit dans un événement | **le groupe vote**, avec un minuteur, comme pour choisir la salle suivante |
| Ce qui use le Boss final | **toute partie finie**, et **davantage avec le plus dur des deux boss** |
| Le Boss final peut-il être battu ? | **Non.** L'usure qu'on lui fait est **le score de l'équipe**. Savoir si l'équipe l'affronte un jour directement reste ouvert |
| Les archétypes (en cours) | **Combattant, Soutien, À distance, Mage** : une liste à part, distincte des rôles de combat |
| Où vit la progression de l'histoire | **une campagne partagée**, rangée en ligne : peu importe qui héberge |
| L'ordre des chapitres | **modulaires** : les chapitres se jouent dans n'importe quel ordre, et **le jeu tire le suivant au hasard** |
| Entre deux parties | **un vrai camp vivant** qui grandit avec la campagne (le hameau de Darkest Dungeon) |
| L'épilogue | **se joue quand les chaînes des 3 chapitres sont finies**, puis on continue. Les amis ajoutent **de nouveaux arcs et chapitres comme ils ajoutent des builds** |
| La difficulté d'un chapitre à l'autre | **suit le niveau des héros**, pas le numéro du chapitre (`FIGHT_RULES.md`) |
| Un ami qui a raté une soirée | **un journal de campagne** garde chaque moment vu ; chacun le relit quand il veut |

## Les niveaux
```
Camp     : entre les parties, grandit avec la campagne
Campagne : 3 chapitres en v1, dans n'importe quel ordre, puis un épilogue
Boss final : jamais battu ; l'usure qu'on lui fait est le score de l'équipe
 └ Chapitre : un lieu, son ouverture, sa chaîne d'histoire, ses réserves, 3 boss (2 proposés par partie)
    └ Partie : un passage dans les 9 salles du chapitre
       └ Salle : peut contenir un moment (ouverture, événement, feu de camp, boss)
          └ Moment : 4 lignes courtes au plus, parfois un choix
```

## 1. Comment l'histoire avance : les drapeaux
- **La progression est un ensemble de drapeaux**, sauvegardés avec le groupe comme les niveaux, et **jamais perdus quand toute l'équipe tombe**.
- **Une campagne partagée :** les drapeaux sont rangés en ligne (le skill `edge-leaderboard`, adapté), donc la même histoire continue, peu importe qui héberge.
- Sortes de drapeaux : une partie commencée dans le chapitre N · une partie finie · un boss battu (lequel) · un événement d'histoire vu · un choix fait · l'usure du Boss final.
- **Chaque morceau d'histoire dit ce dont il a besoin et ce qu'il pose.** Il ne se joue que si ses besoins sont remplis.
- **Les chapitres sont modulaires.** La chaîne d'un chapitre ne suppose jamais qu'un autre chapitre a été joué avant. Un moment ne parle d'un autre chapitre que par un drapeau, avec une ligne de secours si ce drapeau n'est pas posé.
- **Les événements d'histoire forment une chaîne par chapitre**, dans l'ordre. Quand la partie arrive à une salle d'événement et que le maillon suivant est débloqué, il passe avant un événement d'ambiance. Chaque maillon ne se joue qu'une fois.
- **Les événements d'ambiance** reviennent et sont tirés au hasard. Les références et les easter eggs vont là (le « mettre des références » de Fraps).

## 2. Où se place l'histoire dans une partie
L'histoire reste dans des emplacements fixes : un combat n'est jamais coupé.

| Salle (LEVEL_STRUCTURE.md) | Moment | Change avec les drapeaux ? |
|---|---|---|
| Avant la salle 1 | **ouverture** : où on est, pourquoi on entre | oui : une nouvelle version chaque fois que la chaîne avance |
| 3 (événement) | le **maillon d'histoire suivant**, ou un événement d'ambiance | oui |
| 4 et 8 (repos) | une **réplique au coin du feu** entre héros | oui, et selon les archétypes présents |
| 7 (boutique) | répliques du marchand (facultatif) | peuvent réagir aux drapeaux |
| 9 (boss) | **arrivée du boss** avant, **moment d'après** une fois gagné ; pose le drapeau du boss | l'arrivée peut rappeler les parties d'avant |
| Après le boss | l'usure du Boss final monte (partie 3) | |

**Le rythme (les deux amis ont demandé un jeu plus rapide) :** un moment fait 4 lignes courtes au plus. Il passe quand tout le monde a cliqué, ou au bout d'un court minuteur. Hors choix, l'histoire devrait prendre environ 3 minutes sur une partie de 65 minutes.

## 3. Les boss de partie et le Boss final (le score de l'équipe)
- Chaque chapitre propose 2 de ses 3 boss ; le groupe en choisit un. Le battre **pose le drapeau de ce boss** (et compte combien de fois).
- **Le Boss final ne peut pas être battu.** C'est la menace derrière toute la campagne, et **l'usure qu'on lui fait est le score de l'équipe**.
- **Toute partie finie l'use, et battre le plus dur des deux boss l'use davantage.** L'usure est sauvegardée, jamais perdue, et ne fait que monter.
- Les drapeaux des boss de partie peuvent aussi marquer le Boss final (par exemple, un boss souvent battu lui retire un de ses tours). L'équipe décide si on s'en sert.
- Le score s'affiche au camp. Savoir si l'équipe peut aussi affronter le Boss final directement (un combat qu'on ne gagne jamais, où les dégâts faits s'ajoutent à l'usure) reste ouvert.

## 4. Les héros : les archétypes
- **Les archétypes (en cours, propriétaire, 17 oct.) : Combattant, Soutien, À distance, Mage.** C'est une liste à part, distincte des rôles de combat (tank, dégâts, soutien, contrôle) : un Mage peut être un soutien. L'équipe peut encore les renommer ou en ajouter. Chaque fiche de classe en nomme **un seul** (`CLASS_TEMPLATE.fr.md` §1).
- Le texte de l'histoire a des emplacements : **« le héros de tel archétype »** devient le nom de ce héros, tel que le joueur l'a nommé ; **« n'importe quel héros »** en prend un dans le groupe.
- **Toute ligne qui appelle un archétype a une ligne de secours**, pour quand aucun héros de cet archétype n'est dans le groupe. Le groupe a toujours quatre héros, mais dans n'importe quel mélange.
- **Deux héros du même archétype :** l'emplacement nomme celui qui a eu le moins de répliques depuis le début de la partie, pour que personne ne soit oublié.

## 5. Les choix : le vote du groupe
- Le même vote que pour choisir la salle suivante. Un minuteur tourne (20 secondes pour commencer) ; à la fin, le plus de voix l'emporte et **l'hôte départage les égalités**. En solo, tu choisis.
- Un choix peut poser des drapeaux, donner ou coûter une récompense, ou lancer un combat.
- Un choix qui lance le d20 suit les règles de chance du combat : le travail d'équipe donne l'avantage, et un échec critique n'est jamais pire qu'une récompense perdue (Paolitus : la chance ne doit pas tout décider).

## 6. Ce qu'un auteur remplit pour un moment
Le format du fichier sera fixé dans `docs/REGLES_CONTENU.md` à l'étape M2. Un moment contient :

| Champ | Ce que c'est |
|---|---|
| id, chapitre, auteur | ce que c'est, où ça va, qui l'a écrit |
| sorte | ouverture · maillon d'histoire · ambiance · feu de camp · boutique · arrivée du boss · après le boss |
| besoins | les drapeaux qu'il attend (aucun pour l'ambiance) |
| pose | les drapeaux qu'il pose une fois joué |
| ordre | sa place dans la chaîne (maillons d'histoire seulement) |
| lignes | 4 au plus, avec les emplacements de héros |
| secours | une ligne par emplacement d'archétype |
| choix | 3 au plus : le texte, ce qui arrive, les drapeaux posés |
| références | la blague ou l'easter egg, s'il y en a, pour que le mérite reste à son auteur |

## 7. Ce que les vérifications attrapent (pour que l'événement d'un ami ne casse pas celui d'un autre)
- Chaque drapeau dont un moment a besoin est posé quelque part ; aucun maillon n'est impossible à atteindre.
- Deux maillons d'une même chaîne n'ont jamais le même ordre.
- Chaque emplacement d'archétype a sa ligne de secours.
- Un moment qui attend un drapeau d'un autre chapitre a sa ligne de secours.
- Aucun moment ne dépasse 4 lignes ; aucun choix ne propose plus de 3 options.

## 8. Le camp
- **Entre deux parties, l'équipe se retrouve dans un camp vivant** qui grandit avec la campagne : des gens qui le rejoignent, des lieux qui s'ouvrent, des répliques qui changent avec les drapeaux. Référence : le hameau de Darkest Dungeon (la référence de Paolitus).
- C'est là que **le jeu tire le chapitre suivant**, voit **l'usure du Boss final** et ouvre **le journal**.
- **Idéalement, il grandit des deux côtés :** l'histoire (gens, lieux, répliques) et les combats (améliorations). Les détails viendront dans un deuxième temps.
- **Changé le 18 oct (le propriétaire) : le camp vient en premier, au jalon M1.** Avant même les parties, il grandit avec **les missions de l'équipe** : construire le jeu, c'est déjà le jeu. Un lieu par axe de création, et chaque mission rentrée fait grandir le sien. Tout est dans `CAMP.fr.md`. Les gens, les répliques et les lieux définitifs viendront quand l'axe Histoire aura un responsable ; le départ des runs, à M4 (porte T : une pièce à la fois).

## 9. Le journal
- **Chaque moment joué va dans le journal de campagne**, avec la date et qui était là. Pour les choix, on voit ce que le groupe a voté.
- Un ami qui a raté une soirée le relit depuis le camp quand il veut ; personne n'attend personne.

## 10. L'épilogue, et la suite
- **Un moment d'épilogue se joue quand les chaînes des 3 chapitres sont finies**, dans n'importe quel ordre. Ensuite la campagne continue : tous les chapitres restent jouables, et le score continue de monter.
- **Les nouveaux arcs et chapitres sont du contenu, comme les builds.** Un ami ajoute un chapitre (ou tout un arc : quelques chapitres et leur propre Boss final) à partir de fichiers qui suivent un modèle, contrôlés comme tout autre contenu (partie 7). Il est en ligne dès que son responsable le fusionne.

## Questions ouvertes
| Question | Qui répond |
|---|---|
| Paolitus est-il d'accord avec ce cadre ? | Paolitus |
| Les détails du camp : ce qui grandit, et quelles améliorations changent les combats (idéalement les deux ; deuxième temps). D'abord : les missions de l'équipe font grandir un lieu par axe (18 oct, `CAMP.fr.md`) | le propriétaire, le responsable de l'axe Histoire |
| Le modèle d'un nouvel arc : combien de chapitres, comment son Boss final et son usure se branchent | à M4, dans `docs/REGLES_CONTENU.md` |
| Combien d'usure donne une partie, et combien de plus avec le boss le plus dur (l'échelle du score) | les premières parties |
| L'équipe affronte-t-elle un jour le Boss final directement (un combat qu'on ne gagne jamais, les dégâts s'ajoutent au score) ? | le propriétaire, Paolitus |
| La liste des archétypes est en cours : les noms définitifs, et s'il en faut d'autres | l'équipe |
| Quand construire la campagne partagée en ligne (elle avance `edge-leaderboard`, prévu « plus tard »), et que faire si la sauvegarde en ligne est injoignable | le propriétaire (à M4, avec les parties) |
| Le maillon d'histoire peut-il passer quand le groupe choisit le côté énigme de la salle 3 ? | Paolitus |

## Pas décidé ici (c'est à l'équipe)
Le monde, le lieu de chaque chapitre, les boss et le Boss final, les gens et les lieux du camp, l'épilogue, et chaque ligne de texte. Tout ça va sur la fiche du monde (D3) et dans les fichiers de chapitre.
