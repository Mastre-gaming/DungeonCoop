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
| 18 oct | Après le nom, la sentinelle presse le joueur et lui fait faire le tour du camp : le feu, le tableau, un terrain vide, un rat | le propriétaire |

| Question | Qui répond |
|---|---|
| Valider le feu de camp et ses 5 tailles (seuils 0, 10, 40, 100, 200 points) | le propriétaire |
| Les 5 niveaux du tableau d'affichage sur le modèle du panneau-carte | Claude propose, le propriétaire choisit |
| Les sept autres lieux, un par un, sur le modèle validé (porte T) | Claude propose, le propriétaire choisit |
| Les noms définitifs des lieux et le texte de la bulle d'arrivée | le responsable de l'axe Histoire, quand il y en aura un |
| Les crédits : un écran de crédits dans le jeu, à partir de `CREDITS.md` et des fichiers de crédits des packs | le propriétaire |
