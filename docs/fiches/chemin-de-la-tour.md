# FICHE : le chemin de la tour (étape 0, niveaux 1 à 6)

Brouillon du 22 oct 2026, **validé le 22 oct** pour le tableau des 6 étapes, la salle 5 des étages et la boutique. **Repensé le 23 oct par le propriétaire** : le chemin n'est plus une suite de salles mais **une seule carte qu'on explore à pied, de gauche à droite, où les combats se déclenchent en marchant** (comme dans Baldur's Gate 3). Les détails de chaque étape restent discutés un par un avant tout code. Source : le tableau Miro « La soirée d'un coup d'œil ». Cette fiche remplace les 9 salles de `LEVEL_STRUCTURE.md` pour le trajet du camp à la tour. C'est le début de l'aventure « Le camp des mastres » (`aventure-camp-des-mastres.md`). Les textes, noms et histoires restent à l'équipe.

## 1. But et durée
- **Ce que le joueur y vit :** le trajet du camp à la porte de la tour, à pied, en groupe. Il apprend le combat, le d20 hors combat, les choix du groupe et la Caillasse (`MONNAIE.fr.md`) avant le premier étage.
- **Durée visée :** environ 45 min (40 de combats et d'étapes, plus l'exploration). **Niveaux 1 à 6** : +1 après chaque combat ou étape.
- **Avant :** le prologue (45 s). **Après :** la cinématique « la porte de la tour s'ouvre ».

## 2. Une carte, de gauche à droite (décidé le 23 oct)
- **Une route d'environ 180 x 24 cases (270 m)**, du camp (ouest) à la porte de la tour (est) : six tronçons d'environ 30 cases, l'un après l'autre. Rien à l'écran ne sépare deux tronçons : on marche.
- **Chacun déplace son héros**, en temps réel, comme au camp (la marche, la caméra et le jeu à plusieurs du camp). Les héros sans joueur suivent l'hôte.
- **Le groupe ne se sépare jamais.** Aux choix, il prend un seul chemin (§4).
- **On explore :** des cachettes (Caillasse, potion), des objets à regarder, des traces ; un d20 de perception lancé par un joueur pour trouver ce qui est caché. Les textes sont à l'équipe.

## 3. Les combats se déclenchent sur place
- **Quand les ennemis vous voient** (leur champ de vue est montré au sol) : le combat commence, au tour par tour, **là où chacun se tient**, sans retour aux places de départ. Bien se placer avant (un héros près du brasero) prépare le combo.
- **Quand vous frappez les premiers sans être vus** : les ennemis sont **Surpris** et perdent leur premier tour (décidé le 23 oct ; nouvel état à ajouter à `FIGHT_RULES.md`).
- Pas de discrétion (s'accroupir, se cacher) : décidé non le 23 oct.
- Le combat se joue dans sa clairière (le moteur du terrain d'entraînement, posé sur cette zone) ; une fois gagné, on reprend la marche.

## 4. Les choix du groupe (décidé le 23 oct)
- **Un élément du décor propose le choix** (un poteau indicateur, une fourche du sentier) : chaque joueur choisit.
- **D'accord** : on y va. **En désaccord** : on lance le dé (chacun un d20, le plus haut décide ; égalité : on relance).
- **Puis le décor ferme le chemin perdu** (un arbre tombé, un éboulis, un pont qui cède) et **les joueurs prennent le chemin gagnant en marchant**.

## 5. Les neuf zones (carte validée le 23 oct)
Environ **300 x 26 cases (450 m)** : une exploration, puis un combat, puis une exploration… Les scénarios de jeu des combats : `chemin-combats.md`.
| # | Zone | Sorte | Ce qui s'y passe |
|---|---|---|---|
| 0 | Le départ | découverte | On part de la clairière de l'est du camp (son étang, sa ferme), par le sentier des Gueux qui s'enfonce dans la forêt (le plan agrandi du camp, `design/camp/plans/PLAN_AGRANDI.fr.md` ; décidé le 23 oct). Rien n'attaque : on apprend à marcher, à fouiller (une souche), à lire un champ de vue ; des traces de bandits. |
| 1 | Le sentier des Gueux | combat 1 · niv. 1 | « Les guetteurs » : le foin, le brasero, les bandits. Fiche : `chemin-sentier-des-gueux.md`. |
| 2 | La fourche | exploration | Le poteau indicateur (le choix, §4) : le colporteur au nord, la vieille borne au sud ; un éboulis ferme la branche perdue (à ses deux bouts). |
| 3 | Le gué | combat 2 · niv. 3 | « Le péage » : la rivière, le pont tenu par des bandits, des arbalétriers sur l'autre rive, le haut-fond. |
| 4 | Les champs | exploration | Le blé, les épouvantails, les meules ; tiré par la graine : le chariot renversé (énigme ou piège) ou l'embuscade (négociée ou combattue). |
| 5 | Le moulin | combat 3 · niv. 5 | « Le moulin envahi » : loups et rats, le canal, la roue, quelqu'un à protéger. |
| 6 | La montée | exploration | La pierre, des ruines et des statues ; la dernière cachette ; la porte qu'on aperçoit. |
| 7 | La porte de la tour | mini-boss · niv. 6 | « Le gardien de la porte » : sa Charge annoncée à faire percuter un pilier. |
| 8 | L'arrivée | fin | La porte s'ouvre : la cinématique, la sauvegarde. |

Les niveaux montent de 1 après chaque combat ou étape (1 à 6). Décors encore à trouver ou dessiner : le moulin, la porte de la tour, le gardien, le PNJ du moulin.

## 6. La graine
**Un seul lancer, au départ du chemin** : l'hôte choisit le héros qui lance le dé (jamais automatique) ; ce d20 donne la graine (5 lettres), qui tire toute la route : le gabarit et les ennemis de chaque combat, bandits ou chariot, la place des cachettes. Même graine, même route ; l'ordre des tronçons ne change pas.

## 7. Défaite et sauvegarde (décidé le 23 oct)
- **Une défaite totale renvoie au début du chemin** (au camp).
- **La partie se sauvegarde entre les combats** : on peut s'arrêter et reprendre là où on était.

## 8. La Caillasse sur le chemin
Chaque combat rapporte 15 à 25 par héros, soit environ 60 avant la porte, plus les cachettes. Le colporteur est la seule dépense. Les chiffres sont des valeurs de départ (`MONNAIE.fr.md`).

## 9. Le score 8/10
- Un nouveau joueur comprend le combo du sentier des Gueux sans explication et le réussit avant la fin du tour 3.
- Le groupe arrive à la porte au niveau 6 en environ 45 min, sans que personne n'ait été perdu sur un seul jet.
- On a envie de fouiller : chaque tronçon a au moins une chose trouvée en marchant.
- Le d20 hors combat se comprend dès la première cachette : même geste, même son qu'en combat.
- Deux graines donnent deux routes que les joueurs reconnaissent comme différentes.
- Test sur la route du propriétaire : lien, Hôte, code, amis, le chemin ; captures à l'appui.

## 10. L'ordre de construction (porte T, décidé le 23 oct)
1. **Le premier tronçon seul** (le sentier des Gueux) comme début de la grande carte : la marche, l'exploration, le combat qui se déclenche, la surprise. Joué et noté.
2. Ensuite seulement, les autres tronçons, un par un, chacun avec sa fiche.

## 11. Reste à discuter
- La mécanique exacte du mini-boss de la porte (avec l'axe Combats).
- L'état Surpris dans `FIGHT_RULES.md` (axe Combats).
- Les noms et les textes : à l'équipe, jamais à Claude.

## 12. Fait (branche histoire/lisiere)
- **23 oct, la zone 2, la fourche :** la carte s'étend à 105 cases. Arrivé au poteau, le groupe s'arrête et choisit (sur un seul écran : l'hôte ; à plusieurs, le vote et le dé en cas de désaccord restent à faire) ; un éboulis ferme l'autre branche à ses deux bouts. Au nord, l'étal du colporteur (une potion : 20 Caillasse) ; au sud, la vieille borne (un d20 sans risque, une fois : 11 ou plus, 10 Caillasse). Pas encore : la montée d'un niveau après l'étape.
- **23 oct, la zone 3, le gué (combat 2, « le péage ») :** la carte s'étend à 141 cases. Une rivière profonde serpente du nord au sud ; un pont de planches sur le sentier, un haut-fond au sud (de l'eau peu profonde : on en sort Trempé). Trois bandits tiennent le bout est du pont, un arbalétrier sur chaque rive, un loup de garde ; deux bandits sortent de la cabane du péage au tour 3. Poussé dans la rivière, un sbire est emporté ; plus gros, il prend 20 et regagne la berge. Plusieurs combats sur une même carte : seul celui qui se déclenche joue, et sa victoire rend la route. Pas encore : la variante « forcer le péage ».
- **23 oct, la zone 4, les champs :** la carte s'étend à 183 cases. Des blés de part et d'autre du sentier, des meules, deux épouvantails. La graine tire le chariot (le fouiller : un d20 de prudence, piège à 8 dégâts ou non, 15 Caillasse) ou l'embuscade (3 bandits et un arbalétrier sortent des blés : payer 30, négocier au d20, ou combattre).
- **23 oct, les zones 5 à 8 (le chemin est fini) :** la carte fait 301 cases.
  - **Le moulin (combat 3, « le moulin envahi ») :** le moulin, sa roue qui tourne dans le bief, le canal et son gué (un haut-fond entre deux berges). Les rats dans les sacs voient mal (3 cases), les loups longent le canal ; en arrivant par le nord, derrière le moulin, sans être vu, on surprend les bêtes. Le meunier (un PNJ : son nom et son rôle restent à l'équipe, « Meunier » est provisoire) reste devant sa porte : les bêtes s'en prennent à lui. Il tient 4 tours : les bêtes s'enfuient, et +20 Caillasse s'il est sauf ; s'il tombe, le combat continue sans la récompense. Projeté contre la roue : +8, puis elle le jette dans le bief (20, ou emporté pour un sbire).
  - **La montée :** le sentier devient une allée dallée, bordée de statues deux à deux ; une croix de pierre à son début, un monument sur sa place (l'urne : une cachette).
  - **La porte de la tour (combat 4, le gardien) :** une cour dallée, quatre piliers, deux braseros devant la porte. Le gardien (180 PV, coriace) : la Fente au contact ; la Parade (un coup au contact par tour n'est qu'une éraflure) ; un tour sur trois, il annonce sa Charge (une bande rouge au sol) et la fait au tour suivant (18 + d6 et 3 m de poussée à qui est encore dessus). S'il finit contre un pilier, un rocher ou la porte : **Étourdi** (nouvel état : il ne joue pas son tour, ne pare plus, avantage contre lui ; le héros qu'il visait et qui s'est écarté fait le combo avec celui qui frappe). À la moitié de ses PV, deux bandits sortent de la porte et il charge à chaque tour. Vaincu, les autres s'enfuient.
  - **L'arrivée :** la herse se lève ; on passe la porte à pied, et le chemin est fini (un écran le dit ; la suite de l'aventure est à écrire).
  - **Pas encore :** la graine ne change ni les piliers ni le côté de l'arbalétrier ; à plusieurs, l'exploration et les choix (fourche, embuscade) se jouent sur l'écran de l'hôte seulement.
- **23 oct, après la note du propriétaire (6/10 : « plus tactique, plus vivant ») :**
  - **les combos se voient :** un ralenti, un éclair doré, la secousse, un trait d'or entre les deux héros et le tampon « COMBO ! » avec leurs portraits ;
  - **le gardien** est une fois et demie plus grand ; poussé, attiré ou projeté avant sa Charge, il emporte sa ligne avec lui (on peut le pousser face à un pilier : celui qui pousse prépare le combo) ;
  - **les intentions :** au début de la phase des héros, chaque ennemi dit ce qu'il va faire et à qui (au-dessus de sa tête ; survoler l'ennemi trace sa menace), et il s'y tient ;
  - **le couvert :** un tir vers une cible collée derrière un rocher, un arbre, un pilier, une statue ou un brasero a le désavantage (un bouclier sur la cible en visant) ;
  - **un objet par combat** (l'action du héros, aperçu au survol) : la corde du pont au gué, la vanne du bief au moulin, le treuil de la herse à la porte (la herse se lève quand la garde entre en combat) ; si un autre héros a poussé quelqu'un dans la zone ce tour-ci, c'est un combo ;
  - **l'exploration :** les champs de vue ne se montrent qu'en approchant ; la perception passive (un d20 par héros près d'une cachette, l'éclat n'apparaît que sur un bon jet) ; des pommiers et des herbes à cueillir (des PV) ; le poteau de la fourche se lit ; des pas mènent à deux cachettes ; les loups du canal, le gardien et un loup du gué font leur ronde (leur regard suit leur pas) ; les oiseaux posés s'envolent, les lapins filent, les canards s'écartent.
- **23 oct, « que le joueur comprenne ce qu'il se passe » :**
  - **le début d'un combat :** des « ! » sur les ennemis, la scène du combat s'il en a une, puis la carte « Combat ! » (son titre, son objectif en clair, surprise ou repérés) ;
  - **la fin :** la carte « Victoire ! » (la Caillasse qui monte, les combos du combat) ; la défaite, un fondu au noir avant l'écran ;
  - **le compteur de Caillasse** en haut ; chaque gain s'envole vers lui ;
  - **les cinématiques** (src/entrainement/cinema.js, les scènes dans content/moments/chemin-de-la-tour.json) : le départ, le premier combat, la fourche (ce que donne chaque branche, puis l'éboulis qui ferme l'autre), le gué, les champs, le moulin, la montée, la porte, la porte ouverte, l'arrivée. Clic : la suite ; Échap : passer la scène ; ?cinema=0 : sans elles.
  - **Les répliques du conteur sont des BROUILLONS** (marquées « brouillon » dans le fichier et à l'écran) : l'histoire est à l'équipe, qui les réécrit dans le fichier, sans toucher au code.
- **23 oct, la fourche qui compte (décidé par le propriétaire, sur la proposition A avec un peu de B) :**
  - **le nord, le colporteur :** des potions (20) et un tonneau d'huile (25, une fois) à poser où l'on veut avant un combat ; mais le colporteur bavarde : au gué, le péage vous attend (pas de surprise, un bandit de plus) ;
  - **le sud, la vieille borne :** une relance pour le groupe (le premier d20 raté d'un héros se rejoue), le d20 de Caillasse ; au gué, la surprise reste possible ;
  - l'écran du choix dit ce qu'on gagne et ce qu'on perd de chaque côté ; la scène de la fourche et celle du gué changent selon la branche ; la relance et le tonneau se voient en haut.
- **23 oct, la saison du camp et le dé de cristal :**
  - **la saison :** le chemin suit celle du camp (src/entrainement/saison.js, reprise de src/51_saisons.js de main : à remplacer par un import quand la branche aura rattrapé main). Aujourd'hui, l'automne : feuillus jaunes, orange et rouges, herbe qui jaunit, feuilles tombées, plus de papillons. L'hiver : la neige, plus de canards ; la rivière et le canal restent liquides (on y tombe toujours). `?saison=hiver` (printemps, ete, automne) pour en forcer une ;
  - **le jet de d20** (src/61_des.js, le panneau de dé de cristal fusionné sur main) : une attaque de héros ouvre le panneau (avantage, bonus, table des chances, cible solide), avec les dés déjà tirés par les règles ; le coup part quand il se ferme, et le journal se cache pendant le jet. `?des=0` pour s'en passer. Les tests passent aussi par le dé : fouille, vieille borne, piège du chariot, persuasion, glace (le panneau annonce le DD, et un verdict Raté / Réussi / Échec critique / Réussite éclatante selon le seuil). Pas par le dé : la perception passive, qui se joue sans bruit en marchant.
- **23 oct, l'étal du colporteur :** le colporteur est dessiné en pixel art (src/entrainement/etal.json, public/assets/lpc/etal.png) : sur la carte, un petit commerçant derrière son comptoir sous l'auvent (il cligne des yeux, lève une fiole), avec des sacs et du bois empilé autour ; en cinématique, un gros plan animé de l'étal (la lanterne qui se balance, des fioles, un tonneau d'huile, de la corde, des pièces de Caillasse), avec des étiquettes sur ce qu'il vend et ses répliques (brouillons). Il se joue à la fourche (scène « fourche-avant »), et à la première visite de l'étal (scène « colporteur ») avant la fenêtre d'achat.
- **23 oct, le gabarit du départ de Paul (branche paul/contrat-depart, fusionnée sur main, #272) :** les cinématiques en reprennent la forme : les textes dans content/moments/ (chemin-de-la-tour.json, avec son `_lisez_moi`), des répliques courtes (190 caractères au plus), la boîte de dialogue du jeu avec le **médaillon** de celui qui parle (un héros du groupe, le conteur, le colporteur), son nom, « Suivant » et « Échap : passer la scène », et des trous {heros}, {heros2}, {heros3}, {heros4}, {partants} remplis avec le groupe. Les héros réagissent à la scène du départ (brouillons) ; elle suit le contrat de Paul (« la tour au-delà de la lisière, du gué et du vieux moulin », la règle « pas d'échec critique là-haut »). Les bandes noires font 56 px, comme les siennes.

## 13. Le décor raconte (chaque pièce a sa raison)
Rien n'est posé pour remplir : chaque pièce dit quelque chose du chemin, ou sert le jeu. Les raisons sont celles du monde (qui vit là, ce qu'on y fait), jamais une histoire : celle-ci est à l'équipe.

| Zone | Pièce | Pourquoi elle est là |
|---|---|---|
| 0, le départ | l'étang, la meule, l'épouvantail, la charrette, la clôture | la lisière du camp se cultive : le départ est encore « chez soi » |
| 1, le sentier des Gueux | la souche à la hache, le bois empilé, les souches | des bûcherons du camp coupent ici ; une souche creuse cache de la Caillasse |
| 2, la fourche | le poteau | il marque le choix (s'y arrêter ouvre la question) |
| 2 | l'étal du colporteur (nord), la vieille borne (sud) | chaque branche a sa rencontre : acheter, ou tenter le dé |
| 2 | l'éboulis | il ferme la branche perdue, à ses deux bouts |
| 3, le gué | la rivière, le pont, le haut-fond | deux passages : le pont gardé, ou l'eau froide (Trempé) |
| 3 | la cabane du péage | les bandits y vivent ; les renforts en sortent |
| 4, les champs | les blés, les meules, les épouvantails, la charrette | des champs qu'on travaille ; les blés hauts cachent l'embuscade ; la charrette est le chariot de la variante |
| 5, le moulin | le canal, le bief, la roue | l'eau des champs fait tourner le moulin ; la roue est un piège pour qui s'en approche trop |
| 5 | les sacs de grain, la charrette | le blé des champs monte au moulin et en repart en farine ; les rats sont dans les sacs |
| 5 | la fumée de la cheminée | quelqu'un est encore dans le moulin (le meunier) |
| 6, la montée | la croix de pierre | elle marque où la route ordinaire devient l'allée de la tour |
| 6 | l'allée de statues, le pilier brisé, les rochers | une route qu'on soignait, laissée à l'abandon depuis longtemps |
| 6 | le monument et son urne | une offrande au pied du monument : la cachette de la zone |
| 7, la porte | les quatre piliers | la cour d'une porte fortifiée ; et là où la Charge du gardien se brise |
| 7 | les deux braseros | la garde veille, de jour comme de nuit ; et un combo (pousser l'étourdi dedans) |
| 7 | la herse | fermée tant que la garde tient la cour |

## 14. La vie et les clins d'œil (src/entrainement/vie.js)
- **La vie (du décor seulement, sans règle) :** des volées d'oiseaux traversent la carte d'est en ouest, leur ombre au sol ; des papillons sur l'herbe haute et les blés ; des canards sur l'étang et sur le canal ; la fumée de la cheminée du moulin et du toit de la cabane, poussée vers l'ouest par le vent ; des ronds dans l'eau ; la roue du moulin tourne ; la herse se lève quand la porte s'ouvre.
- **Les clins d'œil (sans histoire, un peu de Caillasse) :**
  - **le canard du canal :** cliqué trois fois depuis la berge, il s'en va bouder et laisse 1 Caillasse ;
  - **la planche à roulettes**, au pied du moulin (un salut à DeadSlide) : 3 Caillasse ;
  - **le rat couronné**, au pied d'une statue de l'allée : il file quand on approche, et laisse briller une couronne minuscule (5 Caillasse) ;
  - **la statue du loup :** cliquée, elle « hurle » dans le vent.

## 15. À plusieurs (src/entrainement/explo.js, multi.js)
- **Qui fait quoi :** chacun mène ses héros (clic = sa marche, ses autres héros le suivent en file). L'hôte tient les règles : il vérifie chaque action (`arbitrerExploration`), la joue, renvoie l'état et les événements à tous. Les rondes avancent d'une part de la marche de chacun (1/nombre de joueurs), pour ne pas aller N fois plus vite.
- **Les gestes** (acheter au colporteur, cueillir, fouiller, la borne, le chariot, un levier, une curiosité, poser le tonneau) partent vers l'hôte comme la marche ; le moteur vérifie la distance et l'action du héros.
- **Les choix du groupe** (la fourche, l'embuscade) : la question s'affiche chez tous, **l'hôte seul choisit** (au nom du groupe) ; les autres voient « L'hôte choisit… ». Le vote reste à faire (il viendra avec le choix du chemin à la grande porte).
- **Les scènes** : celles d'une zone franchie, et la chute de l'éboulis après la fourche, sont jouées chez tous (messages `scene` et `chemin`) ; le départ se joue quand l'hôte lance.
- **Le combat** : repéré en route, il commence pour tous ; les « prêts » de la phase des héros sont ceux du terrain d'entraînement. Un ami qui part laisse ses héros à l'hôte.
- **Un bug trouvé en route :** `instantane()` écrivait l'infini (le déplacement à pied) en `null` : un invité ne pouvait plus marcher. Corrigé (`'∞'`), avec un test.
- **Vérifié :** `?test` (558) et `node tools/multi_explo.mjs` (un hôte et un ami simulé sur le fil loopback ; une page invitée face à un hôte simulé).
- **Reste à faire :** le vote du chemin et le « prêt » au bout, dans le flux camp → mission (patch suivant).

## 16. L'expérience, les niveaux et les compétences (src/entrainement/progression.js)
- **Le nom :** « le sentier F » s'appelle désormais **le sentier des Gueux** (nom, dialogues, fichiers : `sentier-des-gueux-*`). Un nom provisoire, à confirmer ou changer par l'équipe.
- **Le plan (content/aventures/camp-des-mastres.json, « progression ») :** 100 XP par niveau, niveau max 6 ; le premier combat, le gué, les champs (l'embuscade évitée ou gagnée, ou le chariot fouillé), le moulin, la porte et la fourche valent chacun 100 : le groupe arrive à la porte au niveau 6. Une trouvaille, une cachette ou une curiosité : 5. Le groupe gagne l'XP ensemble.
- **Un niveau :** +5 PV à chaque héros (CLASS_TEMPLATE.fr.md §7) et des compétences qui s'ouvrent (`DEBLOQUE` dans progression.js) : 2 → Projection (Brute), Éclaboussure (Mage), Fiole ciblée (Voleur), Garde de givre (Gardien), etc. ; 4 → les secondes (Projection 20, Foudre, Ouverture 2…). Une compétence pas encore apprise ne se lance pas et n'est pas sur la barre. Les classes des amis (Traqueur, Shadow, Baba, Changepeau) n'ont rien de verrouillé : leur créateur écrit ses niveaux. Aux niveaux 3 (sous-classe), 5 et 6 (mouvement d'équipe), rien n'est encore écrit : le tableau les accepte.
- **Garder ou non :** l'XP et le niveau vivent dans la run (`57_run.js`, `progression`) et donc dans sa sauvegarde (`60_sauvegarde.js`) ; la page du niveau les reçoit par `?xp=` et `?nh=`. Relancer l'aventure (une nouvelle run) repart au niveau 1 ; une salle perdue ne rapporte rien ; l'XP ne recule jamais.
- **À brancher dans le flux camp → mission :** que le camp passe `xp` et `nh` en lançant le niveau, et que le niveau rende `combat.S.progression` à `finirSalle(issue, rapport, progression)`.
- **À confirmer par l'équipe :** les chiffres (100 par niveau, +5 PV, ce qui s'ouvre à 2 et 4).

## 17. Du camp à la mission, et retour (src/63_depart.js)
- **Après le contrat :** les partants sont libres au camp (un panneau « Le départ : préparez-vous »). À la **grande porte** (côté camp, E) : le vote du chemin, entre ceux qui partent (58_vote.js ; un seul chemin : pas de vote). On marche ensuite jusqu'au **bout du chemin**, de l'autre côté du pont (un drapeau le marque) ; là, E : **« je suis prêt (x/N) »** ; quand tous les partants le sont : un compte à rebours de 3 s, puis le niveau (`entrainement.html?aventure=…&niveau=1&groupe=CODE`, l'hôte avec `&hote`). Seul, un « prêt » suffit. Qui s'éloigne n'est plus prêt ; qui part n'est plus attendu.
- **Les chemins proposés :** le niveau suivant de la run s'il est écrit, et « Recommencer l'aventure » (une run neuve, niveau 1, sans l'XP) dès qu'une run est en cours. Le niveau 2 n'étant pas écrit, il ne reste que « Recommencer » après le niveau 1.
- **La run :** le départ crée une vraie run (les 6 niveaux de l'aventure, sans boutons d'essai) ; elle est sauvegardée avant de quitter le camp. Le niveau reçoit `?xp=&nh=` ; à la porte de la tour, « Retour au camp » ramène à la grande porte avec `?retour=victoire&xp=&nh=` : l'hôte reprend la run sauvegardée, lui rend l'XP, et passe au niveau suivant.
- **Vérifié :** `?test` (le départ seul et à trois, avec le fil loopback), `node tools/depart_flux.mjs` (le vrai camp, de la porte au retour, et le rechargement). Pas essayé avec de vrais amis par internet.
- **Reste :** le niveau 2 à écrire ; l'écran de vote est vu par tous (ceux qui restent au camp ne votent pas) ; les héros de la run sont h1 à h4 (leurs PV ne suivent pas encore ceux du niveau).
