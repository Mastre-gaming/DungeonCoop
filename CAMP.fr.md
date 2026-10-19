# Le camp

**En une phrase :** le camp est le lieu du jeu où l'équipe se retrouve entre deux missions. Au début, les missions, c'est **construire le jeu lui-même** : chaque mission accomplie fait grandir le camp.

**Statut :** concept validé, design en cours (18 oct). Remplace le jalon M1 « la table est mise » et avance le camp vivant de `STORY_STRUCTURE.fr.md` §8, qui était prévu après M4. Validés : le plan des clairières, le panneau des missions, le panneau-carte, le héros de départ, la sentinelle au spawn (§4, §5 et §10). La maquette jouable (héros, tableau, feu) est une page privée du propriétaire sur claude.ai.

## 0. Pourquoi : construire le jeu, c'est déjà le jeu

On est des apprentis développeurs de jeux vidéo, et **coder le jeu est une grande partie du fun de l'aventure** (KICKOFF : « Half the fun is building/coding the game, then showing our friends our builds »). Le camp rend ça visible et le transforme en jeu :

- **L'aventure commence avant la première ligne de code du combat :** les premières missions, c'est construire le jeu.
- **Ce qu'on construit se voit tout de suite :** une mission rentrée fait grandir le camp, chez tout le monde.
- **On apprend en construisant :** plus tard, chaque « première fois » de dev se verra sur son héros (§5, à définir). On fêtera des progrès, sans classer personne.
- **On code soi-même :** une mission dit si on la fait seul, avec Claude comme aide, ou si Claude la fait. Les missions « seul » et « avec Claude » sont celles qui font apprendre.

---

## 1. Ce que c'est, ce que ce n'est pas

| Le camp, c'est | Ce n'est pas |
|---|---|
| **le camp vivant du jeu** (`STORY_STRUCTURE.fr.md` §8), le même qu'on retrouvera entre deux runs | un décor à part, fait seulement pour le dashboard |
| une scène en **pixel art LPC**, où 1 à 4 héros **marchent librement** | un combat : pas de tours, pas d'ennemis, pas de dés |
| un lieu qui **montre l'avancée du projet** : chaque axe de création a son bâtiment | un classement des lieux : ils montrent ce que l'**équipe** a construit. Les personnes sont récompensées à part, par la renommée du bâtisseur (`RENOMMEE.fr.md`) |
| visible **dans le dashboard** et sur le **lien du jeu** | un écran pour gérer les missions : les missions se prennent et se ferment dans le tableau de travail du dashboard |

---

## 2. Deux repos, un seul camp

```
Repo du JEU (DungeonCoop)                          Repo du DASHBOARD (DungeonCoop-dashboard)
├─ le code et l'art du camp                         ├─ PLAN_TRAVAIL.md : l'ordre des étapes, le rituel
├─ content/axes.json   ── le contrat, lu par ─────► ├─ le tableau de travail lit les mêmes axes
│                         les deux côtés            │
├─ les issues = LES MISSIONS  ◄──── écrit ───────── ├─ le tableau de travail : prendre, finir, créer
│                                                   │
└─ le lien en ligne du jeu ─── affiché dans ──────► └─ la carte « Le camp », en haut de la page
```

- **Le jeu possède le camp :** son code, son art et ses règles de progression. Le dashboard ne fait que l'afficher.
- **Les missions sont les issues du repo du jeu.** Le tableau de travail les modifie, et le camp les lit. Aucune base de données : tout se recalcule depuis GitHub.
- **Le contrat, `content/axes.json`,** est le seul endroit où sont décrits les axes : leur nom, leur label GitHub et le lieu du camp de chacun. Le jeu et le dashboard le lisent tous les deux au chargement, et un test de chaque côté échoue s'il ne correspond plus aux labels.

### Ce qui se met à jour tout seul
| Quand… | …alors | En combien de temps |
|---|---|---|
| quelqu'un ferme une mission dans le tableau | le lieu de son axe grandit, chez tous ceux qui regardent le camp | 1 à 2 s (webhook → Worker « direct » de Paul → pages ouvertes) |
| le Worker de Paul ne répond pas | le camp relit GitHub lui-même | quelques minutes |
| on change le code ou l'art du camp (fusion sur `main` du jeu) | le lien du jeu se republie, et le dashboard affiche la nouvelle version | quelques minutes |
| on change le code du dashboard | rien ne change au camp | |
| on change `PLAN_TRAVAIL.md` | rien ne change au camp (c'est du texte pour l'équipe) | |

---

## 3. Les missions

- **Une mission = une issue** du repo du jeu, avec :
  - un label d'axe (`axe: combat`, `axe: histoire`…), qui dit quel lieu elle fait grandir ;
  - un label de taille : `taille: S` (une soirée), `taille: M` (quelques soirées) ou `taille: L` (un gros morceau). C'est ce qu'elle rapporte au camp ;
  - un label de façon de faire : `fait par: moi` (on la fait seul), `fait par: avec Claude` (on code, Claude aide et explique) ou `fait par: Claude` (Claude la fait, on relit). Les deux premiers font apprendre ; c'est à chacun de choisir en prenant la mission ;
  - un jalon (D1 à M4) : le chapitre du plan auquel elle appartient ;
  - « fini quand » dans la description, repris de `PLAN_TRAVAIL.md`.
- **La vie d'une mission :**

  | Dans le tableau | Dans GitHub |
  |---|---|
  | à faire | l'issue est ouverte, personne n'est assigné |
  | partie (« Je prends ») | quelqu'un est assigné |
  | rentrée (« Fait ✓ ») | l'issue est fermée |

  **Rentrer une mission en codant :** une PR dont la description contient « Ferme #n », fusionnée. GitHub ne comprend que l'anglais (« Closes #n ») ; c'est la vérification « Missions rentrées » du repo (`.github/workflows/ferme-missions.yml`) qui ferme les missions citées par « Ferme #n » (décision du 18 oct : on garde « Ferme »).

- **Les premières missions sont les étapes de `PLAN_TRAVAIL.md`** (phases 0 à 2). Le plan garde l'ordre et les explications, et met le numéro de l'issue à côté de chaque étape. **On ne coche plus le plan :** c'est l'issue fermée qui compte.
- **Une mission faite à plusieurs** (deux personnes ou plus assignées) compte normalement. Le bonus d'équipe viendra plus tard (§8).

---

## 4. Les lieux du camp

Un lieu par axe du plan. **Les noms sont provisoires :** les lieux du camp font partie de l'histoire (axe 1), qui n'a pas de responsable pour l'instant. Ils seront renommés quand l'axe en aura un.

**Les axes sont ceux du tableau de travail du dashboard** (décision du 18 oct), plus « le camp » (9e axe, même jour) ; ils sont décrits une seule fois, dans `content/axes.json`, que le jeu et le dashboard lisent tous les deux.

| Axe (label GitHub) | Lieu (provisoire) | Ce qu'on y trouve plus tard dans le jeu |
|---|---|---|
| Chapitres et histoire (`axe: histoire`) | le coin des récits | le journal de campagne, les récits |
| Combats (`axe: combats`) | le terrain d'entraînement | la salle d'entraînement de Paolitus : déjà ouverte, E à son entrée lance le combat d'entraînement sans cases (`entrainement.html`, mission #14) ; dans le camp, c'est un enclos de 8 × 8 cases (mission #77, plus bas) |
| Classes et personnages (`axe: classes`) | l'armurerie | choisir et équiper son héros |
| Salles et carte (`axe: salles`, avec la structure des runs) | la table des cartes | la carte du chapitre, le départ des runs |
| Pixel art (`axe: pixel art`) | l'atelier | les apparences des héros |
| Menus et écrans (`axe: menus`) | le tableau d'affichage | les missions, au cœur du camp |
| Son et musique (`axe: son`) | l'estrade | la musique du camp |
| Technique (`axe: technique`) | la forge | les outils de l'équipe |
| Le camp (`axe: camp`, ajouté le 18 oct) | **le camp tout entier** (pas de bâtiment) | à chaque niveau, le camp se modernise : son design graphique, sa vie (les niveaux sont à proposer, puis à choisir) |

### Le plan : les clairières (retenu le 18 oct, à détailler plus tard)
- **Un camp de 42 × 28 cases.** Au centre : le feu, le tableau d'affichage et le point d'apparition des héros. On arrive là où se trouve le travail.
- **Trois clairières de deux lieux, séparées par des bois,** chacune regroupant des axes qui vont ensemble :
  - le monde : le coin des récits et la table des cartes ;
  - les héros : le terrain d'entraînement et l'armurerie ;
  - l'atelier : l'atelier et l'estrade.
- **La forge (la technique)** est seule, au sud-ouest, près de l'entrée sud (elle prend l'emplacement prévu pour « la porte du camp », avant que les axes ne soient ceux du tableau de travail).
- **Chaque lieu réserve dès le départ son emprise du niveau 4 (6 × 5 cases),** avec une case de marge : il grandit sans écraser son voisin. Les façades sont tournées vers le bas (vue trois-quarts LPC) et chaque sentier arrive devant la porte. Seule exception : le terrain d'entraînement, un enclos de 8 × 8 cases (plus bas).
- **Vérifié par un contrôle automatique :** aucun chevauchement, aucun sentier qui traverse un lieu, et jamais plus de 2 lieux entiers dans le cadre de la caméra au zoom moyen.
- Écartés : « le carré » (des rangées autour d'une place, trop lotissement) et « le chemin » (une longue rue, trop longue à parcourir et petite dans le dashboard).

| Lieu | Porte (case) | Clairière |
|---|---|---|
| tableau d'affichage | 27, 16 | le centre, à côté du feu (20, 14) |
| coin des récits | 5, 8 | le monde (nord-ouest) |
| table des cartes | 13, 8 | le monde (nord-ouest) |
| terrain d'entraînement | 27, 9 (l'entrée de l'enclos, emprise 24, 2 à 32, 10) | les héros (nord-est) |
| armurerie | 35, 7 | les héros (nord-est) |
| estrade | 25, 24 | l'atelier (sud-est) |
| atelier | 33, 23 | l'atelier (sud-est) |
| forge | 8, 24 | l'entrée (sud-ouest) |

### Le terrain d'entraînement : un enclos (mission #77, proposé le 18 oct, à valider par le propriétaire du camp)
- **Un enclos de 8 × 8 cases** dans la clairière des héros, entre le bois et l'armurerie, à une case de marge de l'une comme de l'autre. Le terrain, c'est déjà la salle de combat d'entraînement (#14) : dans le camp, il prend la place qu'il lui faut, plus grande que l'emprise de 6 × 5 des autres lieux.
- **Une clôture de cordes et de poteaux,** les mêmes pièces LPC que la salle du combat d'entraînement, et un **sol de terre battue**. **L'entrée** est au sud : 2 cases de large, entre deux poteaux, au bout du sentier, avec la pancarte à sa gauche. E à l'entrée lance le combat.
- **Ce qui grandit, c'est ce qu'il y a dedans** (le même modèle que le tableau d'affichage) : au niveau 1 une cible sur son trépied ; au 2 une botte de foin et sa cible, un épouvantail ; au 3 le râtelier, les arcs et un tonneau de flèches ; au 4 des torches sur les poteaux de l'entrée et un second épouvantail. Le milieu reste libre. Au niveau 0, l'enclos est vide.
- **Vérifié** comme le reste du plan (`?test` et `design/camp/plans/verifier.py`) : aucun chevauchement, aucun sentier qui traverse un lieu, au plus 2 lieux entiers dans le cadre. On y entre par l'entrée, et la clôture arrête le héros partout ailleurs.
- **Les captures** sont dans `design/camp/enclos/` : l'entrée, l'enclos entier au niveau d'aujourd'hui, les niveaux 0 et 4, et la vue du dashboard.

### L'entrée du camp : la muraille blanche et la grande porte (mission #123, proposé par Mope le 18 oct, construit)
- **D'après les références de Mope** (Minas Tirith : la ville blanche, sa grande porte, ses remparts) : le camp a une entrée majestueuse au sud, là où le sentier sort aujourd'hui de la lisière.
- **Le camp s'agrandit de 10 rangées au sud (42 × 38 cases).** La muraille a sa propre bande, sous tous les lieux : elle ne cache rien du camp. La lisière sud disparaît ; à l'ouest et à l'est, la forêt descend jusqu'en bas et avale les bouts de la muraille.
- **La muraille :** pierre blanche, 4 cases de façade, créneaux, chemin de ronde et contreforts. Elle finit de chaque côté sur une tour d'angle à moitié cachée dans les arbres. **Trois tours de guet, à droite seulement,** avec un dôme vert et une bannière.
- **Le chemin de ronde vu un peu de dessus** (demandé par Mope le 18 oct, « pour donner du relief ») : son sol est en dalles, plus claires au fond, avec un petit mur côté camp ; devant, un rebord bas et des créneaux courts, entre lesquels on voit presque les pieds des archers. Le dessus des tours est fait pareil. Les archers (#124) se tiendront au milieu des dalles, avec une ombre, le rebord devant leurs jambes.
- **La grande porte,** au bout du sentier (la même colonne qu'aujourd'hui) : deux tours plus hautes à dômes verts, une voûte en plein cintre, la herse relevée, une galerie à trois baies et un blason doré (une flamme, le feu du camp). Des bannières aux couleurs des axes sur les tours, avec « MASTRES » écrit à la verticale en lettres gothiques dorées.
- **Les douves et le pont-levis :** deux cases d'eau au pied de la muraille ; le pont-levis abaissé, avec ses chaînes, est le seul passage. Au-delà, une route pavée entre deux braseros.
- **La muraille fantôme, en fondu selon la distance** (demandé par Mope le 18 oct) : une fois la porte passée vers le nord, la muraille s'estompe. Collé à elle, sous la voûte, elle est presque nette et un peu transparente (70 %, on voit le héros passer) ; plus on s'éloigne, plus elle est floue et pâle, jusqu'à disparaître à 9 cases de son pied ; elle revient de la même façon quand on se rapproche, et redevient pleine quand on ressort.
- **Quatre archers** postés (mission #124, à venir) : un sur chaque tour de la porte, un sur la muraille de chaque côté. Ils saluent (bras levés, rangée « sort » LPC) chaque héros qui entre ou qui sort. Ils viennent du générateur LPC, à travers `lpc-sprite-mods`.
- **L'art :** dessiné pixel par pixel dans le style LPC (contour sombre, lumière en haut à gauche, rampe de pierre blanche), comme le panneau-carte ; l'eau, les arbres et les personnages sont des pièces LPC, crédités dans `CREDITS.md`.
- **Dans le jeu :** `src/32_muraille.js` pose la muraille (une seule image, triée sur son pied) et l'estompe dès que le héros passe sous la voûte ; les pièces (`muraille.png`, `douves.png`, `brasero.png`) sont faites par `design/camp/outils/muraille.py`. La muraille et l'eau bloquent sur les rangées 31 à 34, sauf les colonnes 14 et 15 (la porte et le pont). Le point nommé `porte` est sur la route, `entree` juste après la porte.
- **Vérifié** dans `?test` : la muraille et les douves bloquent partout sauf à la porte ; on va à pied de la route au feu par le pont et la porte ; la muraille est pleine dehors et en visite ; dedans, elle a disparu au feu, et en revenant vers elle (8, 5, 2,5 puis 0,8 case) elle est à chaque pas plus visible et moins floue ; elle redevient pleine quand on ressort.
- **La maquette** (v4, validée par Mope le 18 oct, agrandissement compris) est dans `design/camp/entree/` : la porte, l'arrivée avec la muraille fantôme, et le camp entier ; à côté, les mêmes vues prises dans le jeu (5 à 7), le flou progressif (8) et le chemin de ronde vu de dessus avec des archers provisoires (9, `MAQUETTE=dossier python3 design/camp/outils/muraille.py`).

### Le chantier des trois autres murs et les portes secondaires (proposé par Mope le 19 oct, design validé)
- **Le camp sera fermé de tous les côtés :** après la muraille du sud, on construit les murs du nord, de l'ouest et de l'est. Le design montre le chantier **au tout début des travaux**, pour que les joueurs voient la muraille monter au fil des missions.
- **Où passent les murs :** le long de la lisière, côté camp, sans agrandir le camp. Le mur nord est collé à la ligne d'arbres du haut ; le mur ouest part de la tour d'angle sud-ouest, une case à l'intérieur de la lisière ; le mur est part de la tour d'angle sud-est, sous le bord de la forêt.
- **Chaque mur à un stade différent :**
  - **Ouest (le plus avancé) :** deux assises de pierre blanche depuis la tour d'angle, un échafaudage avec un maçon dessus ; au-dessus du bois, des piquets et un cordeau.
  - **Nord :** la base de la tour d'angle nord-ouest (le petit bosquet du coin a été abattu : souches et bois coupé), une première assise, une chèvre de levage avec son treuil, des palettes de pierres, une brouette ; la tranchée des fondations s'arrête au bord du bosquet nord, où travaille un bûcheron ; le cordeau reprend après.
  - **Est :** seulement le tracé (piquets et cordeau), un ouvrier qui plante un piquet, le début de la tranchée au-dessus des tours du sud, et la première charrette de pierres qui arrive par le sentier.
- **Les murs pas finis sont vus de haut comme un vrai chantier :** deux parements de pierres blanches et, au milieu, le blocage (des moellons dans le mortier).
- **La base du chantier,** au pied du mur ouest : une cabane, des palettes de pierres, un tas de sable, une auge à mortier.
- **Le chef de chantier** se tient au carrefour du sentier des archives, à côté de son panneau « Chantier » (une barre d'avancement par mur : N, O, E). On passe devant en allant au feu ; E pour lui parler : il dit où en est chaque mur. **L'avancement monte avec les missions fermées de l'axe camp** (validé par Mope le 19 oct). Ses textes de la maquette sont provisoires : sa voix est à l'équipe.
- **Une porte secondaire sur chaque mur,** moins officielle que la grande porte : une seule tourelle crénelée, un peu plus haute que le mur, une porte de bois cloutée, une lanterne ; pas de dôme, pas de bannière, pas d'or ; un passage d'environ 40 × 62 pixels (la grande porte : 72 × 106). Chacune au bout d'un sentier qui existe : **nord** entre le coin des récits et la table des cartes (au chantier : les deux bases de la tourelle et le cintre de bois dressé entre elles), **ouest** au bout du sentier du coin des récits, au-dessus du bois (les deux bases, le passage entre elles), **est** au bout du sentier de l'atelier (l'emplacement tracé au cordeau). Une pancarte à chaque emplacement.
- **Réalisme :** rien ne passe sur un arbre, une tour ou un toit ; là où un mur traverse un bois, le chantier s'arrête au bord, et il faudra d'abord abattre les arbres.
- **Les ouvriers et le chef** de la maquette sont des personnages provisoires (planches déjà dans le jeu) ; les vrais viendront du générateur LPC, à travers `lpc-sprite-mods`.
- **La maquette** (v3, validée par Mope le 19 oct) est dans `design/camp/chantier/` : le camp entier, le nord-ouest, la base ouest, l'est, le chef de chantier, et la porte secondaire à côté de la grande porte. Elle est dessinée par `design/camp/outils/chantier.py` par-dessus deux captures (`chantier_captures.mjs` : le camp, puis le même avec seulement le sol).
- **Dans le jeu** (`src/44_chantier.js`) : les mêmes pièces, découpées une par une par `design/camp/outils/chantier_jeu.py` et triées comme le reste du décor ; les murs commencés et les tranchées bloquent le passage ; les ouvriers travaillent (ils tapent, creusent, tournent le treuil), et le chef de chantier se tourne vers le héros qui approche. **Le compte de l'avancement :** au premier jour (le 19 oct), nord 6 %, ouest 18 %, est 2 % ; chaque point d'une mission de l'axe camp rentrée depuis (S 1, M 3, L 8) ajoute 2 % à chaque mur, jusqu'à 100 %. Le panneau et le chef le disent. Les murs eux-mêmes montent à l'écran : voir juste en dessous.
- **Les murs qui montent** (design v4 validé par Mope le 19 oct, `design/camp/murs/`, dessiné par `design/camp/outils/murs_montent.py`) : avec l'avancement, chaque mur monte à l'écran. L'ouest et l'est montent du sud vers le nord, le nord de l'ouest vers l'est. Sur chaque mur : le tronçon fini (pleine hauteur, chemin de ronde, merlons), le front de taille (deux assises de plus, un échafaudage et un maçon qui travaille), la tranchée creusée devant, puis les piquets et le cordeau jusqu'au bout. À 100 % : le mur fini, avec sa porte secondaire et le sentier qui y mène ; le chantier se range (cabane, palettes et ouvriers partent ; le chef et son panneau restent, avec des fanions).
  - **Les jointures :** au sud, les murs ouest et est continuent et disparaissent derrière les tours de la grande muraille (on n'en voit jamais le bout) ; au nord, deux tours d'angle sont là dès le début, et les murs ouest et est viennent s'appuyer contre leur face ; le mur nord passe derrière le bosquet nord.
  - **Les arbres :** ceux du bois, hors du camp, sont coupés au ras des murs ouest et est (aucun ne dépasse côté camp) ; la rangée du haut, derrière le mur nord, est enlevée (on n'en voyait que les troncs) ; dans le bois ouest, les arbres sur la ligne du mur (colonnes 2 et 3) sont abattus.
  - **Le flou, pour tout le château :** comme la grande muraille, une fois dans le camp chaque mur s'estompe et devient flou selon la distance du héros à ce mur (presque net collé à lui, disparu à 9 cases). En visite (la carte du dashboard), ils restent pleins et nets.
  - **Dans le jeu :** `src/45_murs.js`, les pièces dessinées par `design/camp/outils/murs_jeu.py` (`public/assets/lpc/murs.png`, `src/data/murs.json`). La ligne des murs bloque toujours, finie ou pas.

### Comment un lieu grandit
- **Les points :** chaque mission fermée de l'axe rapporte S = 1, M = 3, L = 8.
- **Les niveaux :**

  | Niveau | Points | Ce qu'on voit (v0, pièces LPC existantes) |
  |---|---|---|
  | 0 | 0 | un emplacement : des piquets et une pancarte avec le nom de l'axe |
  | 1 | 1 | une tente |
  | 2 | 5 | une cabane |
  | 3 | 15 | un vrai bâtiment |
  | 4 | 35 | le bâtiment décoré, avec de la lumière et de la vie autour |

- **Le calcul est une fonction pure,** `progression(missions) → niveaux`, testée dans `?test` avec des missions inventées.
- **L'armurerie (validée le 18 oct) : le camp du forgeron, qui se civilise.** Chaque niveau est une composition entière (rien ne s'empile d'un niveau à l'autre), en pièces LPC, et des dalles de pierre gagnent le sol à partir du niveau 2. Les décorations peuvent dépasser d'une case du cadre de 6 × 5. Elle est **livrée au niveau 2** (demande du propriétaire) ; les missions de l'axe Classes la font monter aux niveaux 3 et 4.

  | Niveau | Ce qu'on voit |
  |---|---|
  | 0 | des piquets et une pancarte |
  | 1 | la tente du forgeron, une forge en plein air (un feu, l'enclume sur sa souche), les premières épées |
  | 2 | la tente reste ; à côté, une cabane en bois abrite la forge ; les premières dalles au seuil |
  | 3 | le grand atelier de pierre seul : toit de chaume brun, le feu dans sa gueule, l'enclume et le baquet devant, le bois contre le mur, l'enseigne au marteau et aux tenailles, son bras tourné vers l'extérieur ; un parvis de dalles |
  | 4 | l'appentis des armes s'accole à l'atelier (arcs et lames dessous), le grand tas de bois derrière lui, la grande enclume, deux torches de part et d'autre du foyer ; une cour pavée |

  Le design : `design/camp/outils/armurerie.json` (aperçu `pieces/arm_apercu.png`). `armurerie_jeu.py` en tire la planche du jeu (`public/assets/lpc/armurerie.png` : mur, toit, gueule du foyer, poteau retourné, dalles) et les niveaux (`src/data/armurerie.json`), que dessine `src/14_lieux.js`.
- **Le coin des récits, la table des cartes, l'atelier et les archives (v3, validés par le propriétaire le 19 oct ; le coin des récits noté 8/10) :** sur le modèle de l'armurerie, chaque niveau est une composition entière. Les demandes du propriétaire (19 oct) : **pas de bannières** ; **chaque lieu a sa propre silhouette** ; **des derniers niveaux imposants** ; **le sol pavé déborde et s'effiloche dans l'herbe** (des pierres semées de moins en moins serrées), jamais un bord carré ; la terre battue a un bord irrégulier. **Les emprises grandissent** (le plan du camp s'agrandira pour elles, il est en cours) : 12 × 9 cases pour le coin des récits, 9 × 7 pour les trois autres. Les grands bâtiments sont dessinés pixel par pixel dans la pierre blanche, le cuivre vert et l'or de la place et de la muraille : les lieux vont avec le centre du village.

  **Le coin des récits** (axe Histoire) : de l'arc de souches au **théâtre gréco-romain**, où des personnages viendront raconter des histoires. **Le lutrin et son grand livre sont toujours au milieu de la scène,** face au sud, dans l'axe du sentier.

  | Niveau | Ce qu'on voit |
  |---|---|
  | 0 | des piquets et une pancarte |
  | 1 · le cercle du conteur | le lutrin sur une pierre plate, au milieu ; quatre souches en arc devant lui, un petit feu, les livres ; une ronde de terre battue |
  | 2 · l'estrade du conteur | une estrade de bois et son rideau rouge entre deux poteaux, deux lanternes, le lutrin au milieu ; deux rangs de bancs, une allée au milieu |
  | 3 · le petit théâtre | une scène de pierre, son mur à colonnes, ses niches et ses statues, un petit fronton ; l'orchestre en demi-cercle, trois rangs de gradins et leur escalier ; deux braseros ; les pavés |
  | 4 · le théâtre des récits | le grand mur de scène à deux étages (colonnes, niches et statues, le livre doré au milieu, le fronton) ; six rangs de gradins et trois escaliers ; le mur extérieur à arcades et sa grande arche d'entrée, au bout du sentier ; deux braseros, deux réverbères, deux buis |

  **La table des cartes** (axe Salles et carte) : le camp d'une expédition, jusqu'à l'observatoire. Le signe : la table et sa carte dépliée.

  | Niveau | Ce qu'on voit |
  |---|---|
  | 0 | des piquets et une pancarte |
  | 1 · la table de l'éclaireur | la table et sa carte, le panier de cartes roulées, un tabouret, un poteau indicateur |
  | 2 · l'auvent du cartographe | la table sous un auvent rayé vert, un globe sur son pied, le panier, le poteau ; les premiers pavés au seuil |
  | 3 · la roulotte des explorateurs | une roulotte de bois à roues ; la table et sa carte à côté, une carte du pays sur un chevalet, le poteau |
  | 4 · l'observatoire des cartographes | une tour ronde de pierre blanche, son parapet crénelé, ses meurtrières éclairées, et en haut la grande lunette de laiton et une sphère armillaire ; la roulotte à son pied, la grande table et la carte du pays, le globe, deux réverbères |

  **L'atelier** (axe Pixel art) : du chevalet en plein air à **la halle de verre des peintres**. Le signe : le chevalet et sa toile.

  | Niveau | Ce qu'on voit |
  |---|---|
  | 0 | des piquets et une pancarte |
  | 1 · le chevalet en plein air | le chevalet, un tabouret, les pots de couleur, l'étendoir des étoffes teintes |
  | 2 · l'abri du peintre | le chevalet sous un auvent rayé orange, l'étendoir, les pots ; les premiers pavés au seuil |
  | 3 · l'atelier du peintre | une maison à colombage blanc, toit de chaume doré, deux grandes fenêtres à meneaux ; l'enseigne à la palette, l'étendoir, un chevalet dehors |
  | 4 · la halle des peintres | une halle blanche à poteaux de bois, son grand toit de verre, deux hautes fenêtres cintrées, une porte double vitrée ; à gauche l'échafaudage, son échelle et une statue en cours de taille ; à droite le grand chevalet et sa toile (le camp au couchant) ; l'étendoir, les pots |

  **Les archives** : de la simple tente d'aujourd'hui (`src/27_archives.js`) à **la grande bibliothèque** (demande du propriétaire, 19 oct). On la reconnaît à ses hautes fenêtres où l'on voit les rayonnages pleins de livres, et à sa coupole. Ce n'est pas un des 8 lieux : ce qui la fait grandir reste à choisir (proposé : le nombre de cartes des archives, puisque chaque nouvel asset y a la sienne).

  | Niveau | Ce qu'on voit |
  |---|---|
  | 0 · la petite tente (aujourd'hui) | la tente pointue à l'entrée ouverte, la potence et l'enseigne au livre |
  | 1 · la tente et ses coffres | la tente, un coffre, le lutrin, une pile de livres ; les premiers pavés au seuil |
  | 2 · la grande tente des archives | la grande tente (celle qu'on voit de l'intérieur), son entrée, deux lanternes, le coffre, les livres |
  | 3 · la bibliothèque | un bâtiment de pierre blanche au toit d'ardoise, deux hautes fenêtres cintrées où l'on voit les rayonnages et leurs livres, la porte de bois sous le livre doré, trois marches ; un lutrin, deux réverbères |
  | 4 · la grande bibliothèque | une rotonde à colonnes et sa coupole de cuivre vert, sa lanterne et son épi doré ; entre les colonnes, des fenêtres pleines de livres ; deux ailes au toit d'ardoise ; le grand escalier, deux statues, deux réverbères |

  La tente d'aujourd'hui n'a pas d'emprise réservée : avant d'entrer dans le jeu, la place des archives (et celle des trois autres lieux, plus grands qu'avant) est à revoir sur le plan du camp (`src/01_plan.js`, `design/camp/plans/verifier.py`).

  Le design : `design/camp/outils/lieux_niveaux.py` dessine les 20 niveaux (aperçus `pieces/recits_apercu.png`, `cartes_apercu.png`, `atelier_apercu.png`, `archives_apercu.png`). Les grands bâtiments sont dans `lieux_batiments.py`, le sol (herbe, terre battue, pavés qui s'effilochent) dans `lieux_dessin.py` ; les premiers niveaux des cartes, de l'atelier et des archives sont des pièces LPC (`lieux_specs.py`), et les objets-signes que LPC n'a pas sont dessinés par `objets_lieux.py`. Pas encore dans le jeu : une fois choisis, ils y entrent comme l'armurerie (une planche du jeu et un `src/data/<lieu>.json`).
- **Premier lieu dessiné en pièces LPC :** le tableau d'affichage, du niveau 0 au niveau 4 (corde et pancarte, panneau de parchemins, panneaux couverts et enseigne, kiosque à auvent rayé, cabane avec lanterne et bannière). Depuis, son apparence dans le décor est devenue le panneau-carte (plus bas) ; ses niveaux sont à redessiner sur ce modèle.

### Le feu de camp
Il n'appartient à aucun lieu : **il montre l'équipe entière**, avec la somme de tous les points. C'est la jauge de l'équipe. Ce que chaque personne a construit se voit à part, avec la renommée du bâtisseur (`RENOMMEE.fr.md`) : sa tente, son titre, les statues. **Il brûle dès le premier jour,** pour que le camp soit vivant même vide.

| Taille | Points de l'équipe | Ce qu'on voit (pièces LPC) |
|---|---|---|
| 0 | 0 | un petit feu (1 × 2 cases), une souche pour s'asseoir |
| 1 | 10 | des pierres autour, deux souches, un tas de bois |
| 2 | 40 | le grand feu (2 × 2 cases), trois souches |
| 3 | 100 | deux bancs, le chaudron sur son trépied |
| 4 | 200 | les bannières de toutes les zones autour du feu, des tabourets |

Les flammes sont animées (5 images LPC) et des étincelles montent du feu, plus nombreuses quand il grandit. Pour comparer : les 8 lieux au niveau 4 font 280 points.

**La place du village (validée le 18 oct, dans le jeu) : le feu devient le centre du village.** Les 5 tailles du feu sont 5 niveaux de la place, dans la pierre blanche de la muraille (pavés décalés de la route du pont, étendards dorés aux couleurs des axes, braseros). **Elle est livrée au niveau 2** ; avec les vraies missions, elle prend tout de suite la taille du feu de l'équipe (3 au 19 oct).

| Niveau | Ce qu'on voit |
|---|---|
| 0 · le feu de bivouac | le petit feu et sa souche, l'herbe sauvage |
| 1 · la place du village | le grand feu dans un foyer de pierres blanches, trois bancs autour, le chaudron sur son trépied, un tonneau, une souche, le panneau d'annonces, un réverbère ; un premier rond de pavés |
| 2 · la fontaine | une fontaine de pierre blanche au milieu, les braseros (le feu de l'équipe brûle toujours) au bout du banc du nord, un banc à l'est et à l'ouest tournés vers elle, deux réverbères ; les sentiers commencent à se paver, l'herbe autour est tondue |
| 3 · le cœur du village | une fontaine à deux coupes, deux bancs au nord, des étendards, trois réverbères, un buis ; la terre battue recule devant une pelouse rayée et fleurie |
| 4 · le centre du village | la grande fontaine à trois coupes et son dôme de cuivre, la pierre des bâtisseurs au sud entre deux buis, la couronne d'étendards, une haie basse taillée ; tous les sentiers pavés et bordés |

- **Rien ne gêne le passage** : les objets sont rangés entre les quatre sentiers (jamais dans leurs couloirs), voisins collés ou bien écartés (pas de fente où un pied se coince). Le barde et son enceinte (ouest), la boîte aux lettres (est) et l'arrêt du tour (sud) gardent leur place. `design/camp/outils/place_niveaux.py` le vérifie à pied pour chaque niveau.
- **Comment c'est fait** : `place_niveaux.py` dessine la place (aperçu `pieces/place_apercu.png`) ; `place_jeu.py` en tire un calque de sol par niveau (`place_sols.png`), les objets et leurs images d'animation (`place_objets.png` : l'eau, les braseros, les étendards, les lanternes) et `src/data/place.json` ; `src/36_place.js` les pose et remplace le petit feu.

### Le barde et la radio Deadlock (mission #94, 18 oct.)
- **Près du feu, à l'ouest, un barde** est assis sur une souche, une lyre médiévale sur les genoux, avec **une enceinte** à côté de lui. Il diffuse DEADLOCK RECORDS RADIO, la station de Mastres Racing : les morceaux de Deadlock Records, l'animateur et les jingles, comme un petit poste.
- **La radio est en direct :** on l'entend partout, plus fort en s'approchant de l'enceinte. Elle démarre au premier geste du joueur, et continue quand on quitte l'onglet. À plusieurs, tout le groupe entend la radio de l'hôte, au même instant.
- **E devant le barde** (ou un clic) : ce qui joue, « Morceau précédent », « Morceau suivant », couper ou rallumer ; à plusieurs, un morceau passé l'est pour tout le groupe. Un bandeau annonce chaque morceau. Ses répliques sont provisoires.
- Le détail, les fichiers et les droits : `design/radio/README.fr.md`. Le volume de la musique se réglera dans le menu Réglages (#95).

### Le tableau d'affichage dans le décor : le panneau-carte
- **D'après la référence du propriétaire (18 oct) :** deux poteaux, une traverse aux bouts biseautés, et un parchemin encadré qui montre **la carte du camp** (la forêt, les clairières, les sentiers, le feu au centre). Environ 3 × 2,5 cases (96 × 80 px).
- **La carte vit avec le jeu :** une zone grise est à construire ; une zone rentrée prend sa couleur et grandit sur la carte. La légende à droite, une ligne par zone, s'allonge avec le niveau. On voit d'un coup d'œil, depuis le camp, ce qui reste à construire.
- **Le tableau appelle :** tant qu'il y a des missions à prendre, et surtout à la première connexion, **des étoiles scintillent dessus**. Ce sont de petites croix dorées en pixels (sans flou) qui naissent, s'ouvrent en croix à quatre branches avec un cœur blanc, puis s'éteignent, en moins d'une seconde, 3 à 4 à la fois, sur la traverse, le haut des poteaux, le cadre et la carte.
- **Dessiné pixel par pixel dans le style LPC,** puisqu'aucune pièce LPC ne lui ressemble : contour sombre, lumière en haut à gauche, rampe de bois prise sur les planches LPC (`#2b1c1d #573726 #85581b #986a20 #b78c41 #ccbd7b`).
- **À faire ensuite :** ses niveaux de 0 à 4 (c'est aussi le lieu de l'axe Interface), par exemple un toit, une lanterne, des fanions.

---

## 5. Les héros et le multijoueur

- **Déplacement libre** (décision du propriétaire, 18 oct). On marche dans le camp sans grille ni tours : au clavier (ZQSD ou flèches) ou en cliquant là où on veut aller. Les bâtiments bloquent le passage.
- **Les héros viennent du générateur LPC**, à travers `lpc-sprite-mods`. Pour le prototype, quatre héros de départ ; plus tard, chacun ses propres héros (axe 3). Ça respecte la porte A : l'élément visuel principal du jeu est en jeu dès le premier jour.
- **Seul ou à plusieurs :**
  - **Visiter**, seul, c'est ce que montre le dashboard ;
  - **Héberger**, c'est donner un code à cinq lettres, que les amis tapent pour **rejoindre** (skill `party-net`, sans serveur à nous). Chacun voit les autres marcher.
  - **Au terrain d'entraînement, ensemble (#80) :** en groupe, E devant le terrain emmène tout le groupe dans son lobby (n'importe qui peut le demander : l'hôte emmène tout le monde). Au retour, le groupe se refait au camp avec le même code.
- **S'approcher d'un lieu** affiche son axe, son niveau, ses points, et les missions de cet axe (ouvertes et récentes). Un lien mène au tableau de travail pour en prendre une.

### Le héros de départ (validé le 18 oct)
- **Un humain de base du générateur LPC :** peau claire, tête d'homme humain, expression neutre, cheveux simples châtain foncé, tee-shirt blanc, pantalon et bottes marron. Le lien du générateur est dans `dl/lpc/heros/credits.txt`.
- **Les vraies animations LPC, dans les 4 directions :** marche en 8 images, à environ 2,3 cases par seconde ; course en 8 images, à environ 4,3 cases par seconde. Au repos, il garde la pose debout dans la dernière direction prise.
- **Commandes :** flèches ou ZQSD pour marcher, Maj pour courir, ou un clic maintenu pour marcher vers le pointeur. Les poteaux du tableau et le feu bloquent le passage.

### Le choix du héros, avant d'entrer au camp (demande du propriétaire, 19 oct)
- **Un menu avant l'entrée :** à chaque arrivée, avant la scène de la sentinelle, on choisit le héros qu'on incarne. Puis la scène d'arrivée se joue avec lui (il entre par le sud et monte vers la sentinelle).
- **Des onglets :** le **set de base** (le héros de départ et les classes d'essai : Chevalier, Barde, Druide, Éclaireuse, Voleur), puis **un onglet par joueur**, qui ne montre **que ses héros** (les classes de `content/classes/` dont l'`auteur` est son pseudo GitHub). Un joueur sans héros a son onglet vide, qui renvoie à l'armurerie.
- **Le médaillon suit :** en haut à gauche, le médaillon montre le héros choisi. Un clic dessus rouvre le menu, pour changer de héros sur place.
- **Un héros incarné quitte son poste :** quand on incarne Baba Brisenclume, il n'est plus à la forge.
- **Le choix est gardé** dans ce navigateur : le menu s'ouvre sur le dernier héros pris.
- Les héros des classes n'ont pas de course LPC : Maj les fait marcher plus vite, au rythme de la course.
- **Validé par le propriétaire le 19 oct** (LOCKED.md).

### Les héros du camp : ils se promènent et parlent (demande du propriétaire, 19 oct)
- **Chaque héros qu'on peut incarner se balade sur toute la carte**, dans la muraille, de proche en proche (une étape fait au plus 15 cases), et s'arrête un moment entre deux. Il ne vise jamais l'endroit d'un autre : ils ne s'agglutinent pas. Ils ne bloquent pas le passage.
- **Chacun a son foyer, là où il a du sens** : il y apparaît et y revient souvent (une fois sur trois). Le Chevalier au terrain d'entraînement, l'Éclaireuse à la table des cartes, le Druide au coin des récits, la Barde sur l'estrade, le Voleur dans la foule du tableau d'affichage, le héros de départ au feu.
- **Il interagit avec le décor** (une fois sur trois, ailleurs que chez lui) : se chauffer les mains au feu, s'entraîner au terrain (l'épée, l'arc, la dague ou un sort selon sa classe), lire le tableau ou les récits, étudier les cartes, poster une lettre, chanter sur l'estrade. Ses animations de base, de sa planche LPC : la marche, le repos, et pour les gestes le sort, l'estoc, la taille et le tir, dans les 4 directions.
- **Baba Brisenclume ne se promène pas :** il reste à sa forge.
- **E devant un héros** (Baba compris, à sa forge) : il s'arrête, se tourne vers toi et dit une réplique, la suivante à chaque fois. De temps en temps, un héros qu'on voit en dit une tout seul.
- **Ses répliques lui sont propres**, basiques et parfois drôles, d'après sa fiche de classe : `src/data/repliques.json`. **Texte provisoire** : les textes du jeu sont à l'équipe.
- **Un héros pris par un joueur quitte le camp** pour lui laisser la place : le mien, et ceux des amis du groupe (chacun dit au groupe quel héros il incarne ; sa copie porte ce héros).
- **Apparaître, disparaître :** quand un ami rejoint le groupe ou le quitte, quand il change de héros, et quand un héros du camp est pris (ou rendu), une colonne de lumière dorée tombe sur lui et une bouffée de poussière part de ses pieds ; il se montre (ou s'en va) quand la lumière touche le sol.
- **E, c'est interagir** (l'aide en bas à gauche le dit) : consulter un lieu, parler à un personnage, écouter le barde, lire le courrier. Un lieu ou un personnage du camp passe avant un héros qui se promène.

### La sentinelle au spawn (validée le 18 oct)
- **Ce qu'elle fait :** à la toute première arrivée, elle arrête le héros et lui demande son **nom de dev**. Le camp sait alors qui rentre quelle mission.
- **Son apparence :** un chevalier du générateur LPC, en armure de plaques acier, grand heaume, gantelets et bottes d'armure, cape rouge, épée et bouclier à croix. Pas de retouche : le panache bleu proposé a été abandonné. Le lien du générateur est dans `dl/lpc/sentinelle/credits.txt`.
- **Ses animations (vraies images LPC) :** debout, elle garde la première image de la marche (celle qui a le bouclier ; l'animation de repos du générateur n'en a pas). Pour la « halte » puis le salut, elle lève la main avec la rangée « sort » (images 0 à 5, la main levée tenue). Pour s'écarter, elle marche sur le côté. La rangée « emote » n'est pas utilisée : le générateur n'y dessine ni la cape ni l'armure.
- **La scène, la première fois :**
  1. le héros apparaît et monte vers elle ;
  2. elle lève la main, et un « ! » doré apparaît au-dessus d'elle ;
  3. une boîte de dialogue s'ouvre en bas de l'écran, dans le style du panneau des missions (cadre en bois, parchemin), avec son portrait (sa tête, prise sur sa planche), une réplique, le champ « Ton nom de dev » et le bouton « C'est moi ». Un nom vide est refusé avec un message ;
  4. elle salue, puis **presse le joueur** : il y a du travail, « Magne-toi ! Suis-moi, je te fais faire le tour. » (bouton « Je te suis ») ;
  5. elle lui fait faire **le tour du camp** (plus bas), puis retourne à son poste.
- **Le nom, relié au pseudo GitHub :** par `equipe.json`, le même fichier que l'entrée du dashboard (repo du dashboard). On cherche le nom tapé dans le nom affiché ou dans le pseudo GitHub, sans tenir compte des majuscules ni des accents : « paul » devient Paul, `@PCrrfng`. Un nom inconnu entre quand même, comme **visiteur**, et le camp ne lui attribue pas de mission. Pour être reconnu, on s'ajoute à `equipe.json`.
- **Le tour du camp (validé le 18 oct) :** elle part devant, et le héros la suit tout seul (il court s'il est loin). À chaque arrêt, elle se tourne vers lui et parle dans la boîte de dialogue ; la caméra cadre ce qu'elle montre dans le haut de l'écran, au-dessus de la boîte.

  | Arrêt | Ce qu'elle explique (texte provisoire) |
  |---|---|
  | le feu | c'est l'équipe entière, chaque mission rentrée le nourrit ; « il fait pitié » |
  | le tableau d'affichage | tout ce qu'il reste à bâtir : les zones et leurs missions ; ses étoiles s'allument |
  | un terrain vide (piquets, corde, pancarte « ? ») | une PR avec « Ferme #12 », fusionnée, y fait pousser un bâtiment chez tout le monde : « Ce camp, c'est toi qui le construis » |
  | un rat | un rat d'exemple, d'une PR du joueur, surgit avec son « ! » : chaque PR qui traîne en devient un, on clique dessus pour la régler |
  | la fin | « Le reste n'existe pas encore : c'est à toi de le bâtir. » Bouton « Au travail ! » : le rat d'exemple détale, elle retourne à son poste, le joueur reprend la main |

  On peut passer le tour (bouton ou Échap) et le refaire plus tard. Les visites suivantes n'ont pas de tour.
- **Les fois suivantes :** le nom est gardé dans ce navigateur. Elle lève la main, salue (« Rebonjour, Paul ») et s'écarte, sans rien demander.
- **Ses répliques sont provisoires,** marquées « texte provisoire » à l'écran : les textes du jeu sont à l'équipe (l'axe Histoire).

### Le panneau des missions (ce qui s'ouvre au tableau d'affichage)
Le propriétaire l'aime tel quel (`LIKED.md`). On l'ouvre en s'approchant du tableau (bulle « E : consulter »).
- **Un cadre en bois,** avec en tête le total du camp (« 18 points, le feu : taille 1 »).
- **À gauche, les 8 zones à construire :** pour chacune, son lieu et son axe, son niveau, une barre d'avancée, « encore 1 point pour le niveau 2 », et le nombre de missions à prendre.
- **À droite, la zone choisie :** la carte du tableau, où la zone clignote ; son niveau et ce qui manque pour le suivant ; ses missions sur des parchemins épinglés, rangées en « à prendre », « en cours » et « rentrées ».
- **Chaque parchemin :** le numéro de l'issue, le titre, la taille et ses points (« M · 3 pts »), le jalon, qui s'en occupe ou qui l'a rentrée, et **comment la rentrer : « une PR qui contient `Ferme #33`, fusionnée »**. C'est le lien entre coder et voir le monde grandir.
- **En pied :** prendre une mission se fait dans le tableau de travail du dashboard (« Je prends »), avec un lien vers lui. En v0, le camp ne fait que lire.

### La première connexion
Il faut comprendre tout de suite que **ce monde ne grandit que si l'équipe le construit**, en codant, en dessinant, en écrivant, puis en commitant.
1. **La sentinelle :** au spawn, elle arrête le héros, lui demande son nom de dev, le presse (il y a du travail) et lui fait faire le tour du camp (plus haut).
2. **Un camp vide :** on entre près du feu, au milieu de huit terrains vides (piquets et pancartes). Sur le tableau, la carte est toute grise.
3. **Le tableau appelle :** des étoiles scintillent dessus, et une seule bulle s'affiche : « Ce camp, c'est vous qui le construisez. » (texte provisoire). Puis on laisse jouer.
4. **Les zones à construire :** on ouvre le tableau ; les huit zones sont au niveau 0, chacune avec ses premières missions et la façon de les rentrer.
5. **On commit, la zone pousse :** la PR qui contient « Ferme #n » est fusionnée, GitHub ferme la mission, et la zone grandit dans le camp de tout le monde. Elle prend aussi sa couleur sur la carte du tableau, et le parchemin porte le nom de qui l'a rentrée.

### Les premières fois du dev : l'équipement de ton héros (à définir plus tard)
L'idée : chaque « première fois » de dev (premier commit, première PR fusionnée, première relecture…) ajoute une pièce d'équipement à ton héros, sans classement, et tout le monde peut tout obtenir. **Le détail sera défini plus tard** (décision du propriétaire, 18 oct) ; rien n'est construit avant.

---

## 6. Le camp dans le dashboard

- **Une carte « Le camp »**, tout en haut du dashboard, affiche le camp en mode visite, au-dessus du tableau de travail.
- Un bouton **« Ouvrir le camp »** l'ouvre en grand sur le lien du jeu, pour héberger ou rejoindre.
- Le camp et le tableau montrent les mêmes missions, chacun à sa façon. Fermer une mission dans le tableau fait grandir le lieu dans la carte d'au-dessus, devant toi.

---

## 7. Le prototype : v0

**Ce qu'il y a dedans :**
- une scène de camp en pixel art (tuiles LPC), avec les 8 emplacements et le feu ;
- un héros qui marche librement, et jusqu'à 4 avec héberger et rejoindre ;
- les lieux qui prennent leur niveau d'après les vraies missions, et grandissent en direct ;
- s'approcher d'un lieu pour voir ses missions ;
- la carte « Le camp » dans le dashboard ;
- `?test`, les captures et le tampon de version (le manuel, §2).

**Ce qu'il n'y a pas encore :** des noms de lieux définitifs, des personnages au camp, le journal, prendre une mission depuis le camp, et l'art fait sur mesure.

**Fini quand :**
1. sur le lien du jeu, un héros marche dans tout le camp sans rester coincé (test de marche, pas de téléportation) ;
2. deux navigateurs hébergent et rejoignent, se voient marcher, l'un part, l'autre continue ;
3. une mission fermée dans le tableau fait monter son lieu chez les deux en moins de 5 s ;
4. le dashboard affiche le camp en haut de la page ;
5. tout est montré par des captures, et le propriétaire note le camp sur 10.

**Le jalon M1, « le camp »,** reprend ces critères avec quatre héros, notés 7/10 ou plus par le propriétaire.

---

## 8. Ensuite (plus tard, une chose à la fois : porte T)
1. **Le label `fait par:`** dans le tableau de travail ; puis, une fois définies, **les premières fois du dev** sur les héros (§5).
2. **Prendre et rendre une mission depuis le tableau d'affichage du camp.**
3. **Les gens du camp :** un personnage arrive quand un lieu atteint un niveau. C'est l'histoire, donc quand l'axe 1 a un responsable.
4. **Le bonus d'équipe :** une mission rentrée à plusieurs fait quelque chose de visible au feu de camp.
5. **Le journal de campagne,** au feu de camp.
6. **À M4, la porte du camp lance les runs :** le camp devient le lieu entre les parties qu'imaginait `STORY_STRUCTURE.fr.md`.

---

## 8 bis. Le HUD du camp : le dashboard, façon RPG (décidé le 18 oct)

Chaque partie du dashboard a sa place dans le HUD du jeu, en lecture d'abord (les actions qui écrivent viendront ensemble, avec la connexion GitHub). **Une barre d'action en bas de l'écran,** des icônes en bois avec leur touche ; un seul panneau ouvert à la fois. Toujours à l'écran : la renommée (en haut à droite), le suivi de tes quêtes, la barre de campagne. Une chose à la fois (porte T), chacune validée sur capture avant la suivante.

| Le dashboard | Dans le jeu | Où |
|---|---|---|
| Tableau de travail | **le journal de quêtes** (J) : les missions par axe, à prendre, en cours, rentrées, avec leur **urgence** (élevée, moyenne, faible : les labels « priorité: … » que le tableau du dashboard choisit) ; et **le suivi de quêtes**, tes missions en cours, les plus urgentes d'abord, toujours visible. Une mission abandonnée depuis le dashboard (fermée « non prévue ») ne compte pas | barre d'action ; sous la renommée |
| Qui fait quoi | **les cadres de groupe** : un portrait par membre, son titre et sa quête en cours ; doré s'il est au camp | barre d'action |
| Avancée du projet | **la barre de campagne** : le jalon en cours comme une barre d'expérience ; la carte de campagne (D1 à M4) au clic | en bas de l'écran |
| Derniers push | **la chronique du camp** : « Paul a forgé 3 commits sur camp-v0 », quelques secondes en bas à gauche ; l'historique au clic | barre d'action |
| Liens utiles | **la sacoche** : un inventaire, un objet par lien (`liens.json`) | barre d'action |
| Idées | **les rumeurs de la taverne** : les idées par jalon, leurs votes | barre d'action |
| Messagerie | **la boîte aux lettres** : une vraie boîte dans le camp, une icône au-dessus quand un message arrive ; la messagerie s'ouvre sur le HUD | dans le décor ; barre d'action |

**La messagerie et son laissez-passer :** c'est celle du dashboard, par le Worker direct de Paul, qui n'accepte que le laissez-passer de l'entrée du dashboard (un jeton signé, gardé dans un cookie de son domaine, que le jeu ne peut pas lire). Le dashboard le passe au jeu dans le fragment de l'adresse (`#jeton=…`, qui ne passe par aucun serveur) quand on ouvre le camp avec son bouton ; le jeu le garde dans le navigateur. Sans lui, le panneau dit comment l'obtenir. Les non-lus : une pastille sur la case M, et l'événement `messagerie:nonlus` pour l'icône de la boîte aux lettres du décor.

## 9. Choix techniques
- **2D en pixel art,** rendu net : pas de lissage, à l'échelle entière.
- **La caméra (validée par le propriétaire le 18 oct, porte Q) :**
  - **vue de dessus « trois-quarts »**, celle des sprites LPC (on voit le dessus du sol et la façade des bâtiments), avec des cases de 32 px ;
  - **en mode joueur,** elle suit ton héros avec une **zone morte** au centre (30 % de l'écran) : le héros bouge dedans sans que l'image bouge, puis la caméra le rattrape en douceur. Elle s'arrête aux bords du camp ;
  - **zoom « moyen » par défaut :** environ 20 × 11 cases visibles sur un camp de 42 × 28 (le plan des clairières). On découvre le camp en marchant, avec un ou deux lieux à l'écran à la fois ;
  - **en mode visite** (la carte du dashboard), il n'y a pas de héros : tout le camp tient dans le cadre ;
  - la position de la caméra est arrondie au pixel près, pour que le pixel art ne scintille pas en mouvement.
- **Le moteur :** le skill `game-core` (boucle, `?test`, `window.dbg`, captures), avec une caméra de dessus en 2D.
- **Le réseau :** `party-net`, isolé dans son propre module.
- **Les données :** les issues, lues par le Worker « direct » de Paul (CORS ouvert, déjà branché sur les webhooks du jeu), et sinon directement chez GitHub.
- **Mis en ligne :** comme un site statique, sur le lien du jeu (https://dungeoncoop.0xbaba-eth.workers.dev). Le dashboard l'affiche dans un cadre ; le jeu doit donc autoriser l'affichage depuis l'adresse du dashboard.
- **L'herbe :** la case d'herbe pleine de LPC Base Assets, éclaircie légèrement (une retouche de couleur, permise par la licence) pour un camp lumineux.

### Les pièces LPC (téléchargées le 18 oct dans `dl/`, jamais commité)
Toutes sont en « share-alike » : ce qu'on retouche reste sous CC-BY-SA, et le jeu affiche un écran de crédits. Quand une pièce entre dans le jeu (`public/`), sa ligne va dans `CREDITS.md`, avec le fichier de crédits du pack.

| Pack | Auteurs | Licence | Ce qu'on en prend |
|---|---|---|---|
| [[LPC] Medieval Village Decorations](https://opengameart.org/content/lpc-medieval-village-decorations) | bluecarrot16, Lanea Zimmerman (Sharm), Reemax et 17 autres (`CREDITS-decorations-medieval.txt`) | CC-BY-SA 3.0 et 4.0 | panneaux, lanternes, bannières, étals, caisses, souches, tas de bois, bancs, trépied et chaudron, petit feu animé, grande tente, palissade |
| [[LPC] Thatched-roof Cottage](https://opengameart.org/content/lpc-thatched-roof-cottage) | bluecarrot16, d'après Sharm, Daniel Armstrong (HughSpectrum), Casper Nilsson | CC-BY-SA 3.0 ou GPL 3.0 | murs à colombages et toits de chaume (niveaux 3 et 4 des lieux) |
| [LPC Base Assets](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles) | Lanea Zimmerman (Sharm) et les auteurs de `CREDITS.TXT` | CC-BY-SA 3.0 ou GPL 3.0 | herbe, terre, pierres, tonneau |
| [Camp Fire Animation for RPGs](https://opengameart.org/content/camp-fire-animation-for-rpgs-finished) | Zabin et Jetrel | CC-BY-SA 3.0 | le grand feu animé (2 × 2 cases) |
| [Générateur LPC](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) : le héros de départ | une liste par pièce dans `dl/lpc/heros/credits.txt` (bluecarrot16, JaidynReiman, Eliza Wyatt, Redshrike…) | OGA-BY 3.0, CC-BY-SA 3.0 ou GPL 3.0 selon la pièce | la planche complète du héros, dont la marche et la course |
| [Générateur LPC](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) : la sentinelle | une liste par pièce dans `dl/lpc/sentinelle/credits.txt` | OGA-BY 3.0, CC-BY-SA 3.0 ou GPL 3.0 selon la pièce | sa planche complète ; on utilise la marche et la rangée « sort » (deux fichiers manquent sur le site du générateur : la course des jambes d'armure et l'escalade de la cape, sans effet ici) |

Pour plus tard, si le sol manque de variété : [[LPC] Terrains](https://opengameart.org/content/lpc-terrains) (9,2 Mo, CC-BY-SA), pas téléchargé.

---

## 10. Décisions et questions

| Date | Décision | Par |
|---|---|---|
| 18 oct | Le camp du dashboard **est** le camp vivant du jeu, en pixel art | le propriétaire |
| 18 oct | Le tableau de travail du dashboard nourrit le camp : les missions sont les issues du jeu | le propriétaire |
| 18 oct | Déplacement libre dans le camp | le propriétaire |
| 18 oct | M1 devient « le camp » | le propriétaire |
| 18 oct | La caméra : suivi du héros avec zone morte, zoom moyen par défaut, vue visite (tout le camp) dans le dashboard | le propriétaire |
| 18 oct | Construire le jeu fait partie du jeu : on gamifie la création elle-même, et on récompense l'apprentissage de chacun | le propriétaire |
| 18 oct | L'axe 1 (Histoire) n'a plus de responsable pour l'instant ; on répartira quand le camp aura pris forme | le propriétaire |
| 18 oct | KICKOFF.md signé ; le lien en ligne du jeu est sur le compte Cloudflare du propriétaire | le propriétaire |
| 18 oct | Le plan du camp : les clairières (42 × 28) ; le détail du plan est remis à plus tard | le propriétaire |
| 18 oct | Le tableau des missions est le cœur du camp : les zones à construire, puis leurs missions | le propriétaire |
| 18 oct | À la première connexion, on doit comprendre qu'on fait grandir le monde en codant et en commitant | le propriétaire |
| 18 oct | Le tableau dans le décor : un panneau-carte (deux poteaux, une traverse, la carte du camp), d'après sa référence ; des étoiles scintillent dessus quand il appelle | le propriétaire |
| 18 oct | Le panneau des missions qui s'ouvre est gardé tel quel | le propriétaire |
| 18 oct | Le héros de départ : un humain LPC de base, avec la marche et la course | le propriétaire |
| 18 oct | La sentinelle au spawn : un chevalier LPC sans retouche qui demande le nom de dev à la première arrivée, relié au pseudo GitHub par `equipe.json` ; un nom inconnu entre comme visiteur | le propriétaire |
| 18 oct | « Les premières fois du dev » (l'équipement des héros) : à définir plus tard | le propriétaire |
| 18 oct | L'armurerie : tente, tente et abri de forge, puis un atelier de pierre (pas une petite maison), des dalles qui gagnent le sol ; livrée au niveau 2 | le propriétaire |
| 18 oct | La place du village : le feu devient le centre du village dans la pierre de la muraille (sans flou), une fontaine dès le niveau 2, les sentiers qui se pavent, l'herbe qui se dompte, et rien qui gêne le passage ; livrée au niveau 2 | le propriétaire |
| 18 oct | Après le nom, la sentinelle presse le joueur et lui fait faire le tour du camp : le feu, le tableau, un terrain vide, un rat | le propriétaire |
| 19 oct | Un menu de choix du héros avant d'entrer au camp : le set de base, puis un onglet par joueur avec seulement ses héros ; le médaillon suit le héros choisi ; Baba incarné n'est plus à la forge | le propriétaire |
| 19 oct | Les héros qu'on peut incarner se promènent dans le camp et parlent (E), chacun avec ses répliques ; un héros pris par un joueur (moi ou un ami) disparaît pour lui laisser la place | le propriétaire |
| 19 oct | Les héros se baladent sur toute la carte, chacun depuis un foyer qui a du sens, et interagissent avec le décor ; une colonne dorée quand quelqu'un apparaît ou disparaît (un ami qui rejoint ou part, un héros pris) ; E, c'est interagir | le propriétaire |
| 19 oct | Les lieux n'ont pas de bannières ; chacun a sa propre silhouette ; les archives, une simple tente aujourd'hui, deviennent une bibliothèque | le propriétaire |
| 19 oct | Le coin des récits devient, au dernier niveau, un théâtre gréco-romain où des personnages raconteront des histoires, le livre au milieu de la scène ; les derniers niveaux sont imposants ; les pavés débordent et s'effilochent dans l'herbe ; les emprises et le plan du camp peuvent grandir | le propriétaire |
| 19 oct | Les niveaux v3 du coin des récits, de la table des cartes, de l'atelier et des archives sont validés ; le coin des récits est noté 8/10 | le propriétaire |

| Question | Qui répond |
|---|---|
| Valider le feu de camp et ses 5 tailles (seuils 0, 10, 40, 100, 200 points) | le propriétaire |
| Les 5 niveaux du tableau d'affichage sur le modèle du panneau-carte | Claude propose, le propriétaire choisit |
| Les sept autres lieux, un par un, sur le modèle validé (porte T) | Claude propose, le propriétaire choisit |
| Ce qui fait grandir les archives ; la place des quatre lieux agrandis sur le plan du camp | le propriétaire |
| Les noms définitifs des lieux et le texte de la bulle d'arrivée | le responsable de l'axe Histoire, quand il y en aura un |
| Les crédits : un écran de crédits dans le jeu, à partir de `CREDITS.md` et des fichiers de crédits des packs | le propriétaire |
