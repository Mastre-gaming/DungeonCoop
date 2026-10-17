# Le camp

**En une phrase :** le camp est le lieu du jeu où l'équipe se retrouve entre deux missions. Au début, les missions, c'est **construire le jeu lui-même** : chaque mission accomplie fait grandir le camp.

**Statut :** concept, à valider par le propriétaire (18 oct). Remplace le jalon M1 « la table est mise » et avance le camp vivant de `STORY_STRUCTURE.fr.md` §8, qui était prévu après M4.

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
| un lieu qui **montre l'avancée du projet** : chaque axe de création a son bâtiment | un classement : on voit ce que l'**équipe** a construit, jamais qui en a fait le plus |
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

- **Les premières missions sont les étapes de `PLAN_TRAVAIL.md`** (phases 0 à 2). Le plan garde l'ordre et les explications, et met le numéro de l'issue à côté de chaque étape. **On ne coche plus le plan :** c'est l'issue fermée qui compte.
- **Une mission faite à plusieurs** (deux personnes ou plus assignées) compte normalement. Le bonus d'équipe viendra plus tard (§8).

---

## 4. Les lieux du camp

Un lieu par axe du plan. **Les noms sont provisoires :** les lieux du camp font partie de l'histoire (axe 1), qui n'a pas de responsable pour l'instant. Ils seront renommés quand l'axe en aura un.

| Axe du plan | Lieu (provisoire) | Ce qu'on y trouve plus tard dans le jeu |
|---|---|---|
| 1. Histoire et narration | le coin des récits | le journal de campagne, les récits |
| 2. Combat et combos | le terrain d'entraînement | la salle d'entraînement de Paolitus |
| 3. Classes et personnages | l'armurerie | choisir et équiper son héros |
| 4. Structure des runs | la porte du camp | le départ des runs |
| 5. Level design | la table des cartes | la carte du chapitre |
| 6. Direction artistique | l'atelier | les apparences des héros |
| 7. Interface et UX | le tableau d'affichage | les missions, au cœur du camp |
| 8. Son et musique | l'estrade | la musique du camp |

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

- **Le feu de camp, au centre, n'appartient à aucun axe : il montre l'équipe entière :** la somme de tous les points. Plus le camp avance, plus il est grand et lumineux. C'est la seule jauge commune ; il n'y a aucun chiffre par personne.
- **Le calcul est une fonction pure,** `progression(missions) → niveaux`, testée dans `?test` avec des missions inventées.

---

## 5. Les héros et le multijoueur

- **Déplacement libre** (décision du propriétaire, 18 oct). On marche dans le camp sans grille ni tours : au clavier (ZQSD ou flèches) ou en cliquant là où on veut aller. Les bâtiments bloquent le passage.
- **Les héros viennent du générateur LPC**, à travers `lpc-sprite-mods`. Pour le prototype, quatre héros de départ ; plus tard, chacun ses propres héros (axe 3). Ça respecte la porte A : l'élément visuel principal du jeu est en jeu dès le premier jour.
- **Seul ou à plusieurs :**
  - **Visiter**, seul, c'est ce que montre le dashboard ;
  - **Héberger**, c'est donner un code à cinq lettres, que les amis tapent pour **rejoindre** (skill `party-net`, sans serveur à nous). Chacun voit les autres marcher.
- **S'approcher d'un lieu** affiche son axe, son niveau, ses points, et les missions de cet axe (ouvertes et récentes). Un lien mène au tableau de travail pour en prendre une.

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

## 9. Choix techniques
- **2D en pixel art,** rendu net : pas de lissage, à l'échelle entière.
- **La caméra (validée par le propriétaire le 18 oct, porte Q) :**
  - **vue de dessus « trois-quarts »**, celle des sprites LPC (on voit le dessus du sol et la façade des bâtiments), avec des cases de 32 px ;
  - **en mode joueur,** elle suit ton héros avec une **zone morte** au centre (30 % de l'écran) : le héros bouge dedans sans que l'image bouge, puis la caméra le rattrape en douceur. Elle s'arrête aux bords du camp ;
  - **zoom « moyen » par défaut :** environ 20 × 11 cases visibles sur un camp de 36 × 24. On découvre le camp en marchant, avec un ou deux lieux à l'écran à la fois ;
  - **en mode visite** (la carte du dashboard), il n'y a pas de héros : tout le camp tient dans le cadre ;
  - la position de la caméra est arrondie au pixel près, pour que le pixel art ne scintille pas en mouvement.
- **Le moteur :** le skill `game-core` (boucle, `?test`, `window.dbg`, captures), avec une caméra de dessus en 2D.
- **Le réseau :** `party-net`, isolé dans son propre module.
- **Les données :** les issues, lues par le Worker « direct » de Paul (CORS ouvert, déjà branché sur les webhooks du jeu), et sinon directement chez GitHub.
- **Mis en ligne :** comme un site statique, sur le lien du jeu. Le dashboard l'affiche dans un cadre ; le jeu doit donc autoriser l'affichage depuis l'adresse du dashboard.

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

| Question | Qui répond |
|---|---|
| Signer KICKOFF.md (porte K) pour que le code du camp puisse commencer, même si toutes les réponses des amis ne sont pas encore là | le propriétaire |
| Sur quel compte mettre le lien en ligne du jeu (Cloudflare Pages : celui du propriétaire, ou celui de Paul comme le dashboard) | le propriétaire, Paul |
| Les pièces LPC du camp (tuiles, tentes, bâtiments) : lesquelles, et leurs licences dans `CREDITS.md` | Claude propose, le propriétaire choisit |
