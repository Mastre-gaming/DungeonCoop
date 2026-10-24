# FICHE : le sentier des Gueux (chemin de la tour, tronçon 1, niveau 1)

**Renommé le 23 oct** (propriétaire) : « la lisière » devient **« le sentier des Gueux »**, le nom du sentier du plan du camp d'où l'on part, pour ne pas se confondre avec la salle « lisière » de Fraps (`fraps/salles-route`, PR #265).

## 0. Repensé le 23 oct : le premier tronçon de la grande carte
Le chemin de la tour devient **une seule carte qu'on explore à pied, de gauche à droite** (`chemin-de-la-tour.md` §2 à §7). Le sentier des Gueux en est le premier tronçon, et le premier construit (porte T). Ce qui change ici ; le reste de la fiche (le combo, le foin, le brasero, les ennemis, le score) tient toujours.
- **Le tronçon :** environ 30 x 24 cases (45 x 36 m). On entre à l'ouest par le sentier qui vient du camp ; le sentier longe l'orée du bois (deux rangs d'arbres au nord, des bosquets au sud, de l'herbe haute) et traverse la **clairière du combat** (l'un des trois gabarits du §2) ; il ressort à l'est vers la fourche du tronçon 2. Les arbres bloquent le pas et la vue ; le sentier et l'herbe haute sont du décor.
- **On marche avant de combattre :** chacun déplace son héros, en temps réel ; les héros sans joueur suivent l'hôte. Avant la clairière : le coin du bûcheron (une souche, sa hache, du bois coupé) et **une cachette** (de la Caillasse, trouvée sur un d20 de perception lancé par un joueur : le premier d20 hors combat, avant celui du combat). Les textes sont à l'équipe.
- **Le combat se déclenche sur place** quand un ennemi voit un héros (son champ de vue est montré au sol), ou quand un héros frappe le premier sans être vu : les ennemis sont alors **Surpris** et perdent leur premier tour. On combat **là où chacun se tient**.
- **Le combo reste visible avant le combat :** le brasero est au bord de la clairière, côté sentier ; un héros peut s'en approcher avant d'être vu. L'aperçu (survol du brasero) marche aussi en marchant.
- **Le dé de la graine** se lance au départ du chemin, plus à l'entrée du sentier des Gueux (l'hôte choisit qui lance).
- **Le validateur** vérifie désormais que le brasero est atteignable au tour 1 depuis l'orée de la clairière (là où les ennemis voient les héros arriver), plus depuis des places de départ fixes.

Brouillon du 22 oct 2026, **validé par le propriétaire le 22 oct** (réponses en §7) ; aucun code avant le feu vert d'implémentation. Première salle du chemin (`chemin-de-la-tour.md`, cadre validé), même format que `salle-combat-caves.md`. Règles : `FIGHT_RULES.md`. Ennemis : `ENNEMIS.fr.md` (worktree niveaux). Distances en mètres. Les noms, textes et histoires restent à l'équipe : tout nom ci-dessous est provisoire.

## 1. But et durée
- **Ce que le joueur y vit :** son tout premier combat du chemin. Il doit découvrir, sans qu'on le lui dise, que **le terrain est une arme** : un tas de foin, un brasero, et deux amis qui s'en servent ensemble.
- **Ce que la salle apprend, dans cet ordre :**
  1. **Qui lance le dé** : à l'entrée, l'hôte choisit le héros qui lance (décidé le 22 oct : pas de vote) ; jamais automatique.
  2. **Le d20** : ce premier lancer donne la graine, devant tout le monde ; puis chaque attaque montre son d20 et son résultat (Éraflure, Coup, Critique) avec les mêmes geste et son que hors combat.
  3. **L'aperçu du combo** : au survol du brasero ou d'une capacité, la zone de feu future et les dégâts prévus s'affichent avant que personne ne s'engage.
- **Durée visée :** environ 7 min (`FIGHT_RULES.md`), 3 à 4 tours.
- **Budget de difficulté :** plafond 8 (salle 1, `NIVEAUX` §6). **Je vise 5 à 6**, parce que c'est la salle douce du chemin.
- **Objectif :** `vaincre-tous`. Pas d'objectif spécial en salle 1.
- **Ce qu'on ne fait pas ici :** pas de renforts, pas de piège, pas de choix de chemin. Une défaite renvoie au camp (cadre du chemin).

## 2. Le terrain : trois gabarits
Chaque gabarit est un fichier `content/salles/<id>.json`, **24 × 16 m**, départs `avant` / `loin` / `fond`. Dans les schémas, 1 caractère = 2 m. Légende : `h` héros, `░` foin, `B` brasero, `R` rocher, `a` avant, `l` loin, `d` fond.

**A. La clairière aux deux rochers** (apprentissage, gabarit par défaut de la première partie)
```
 ..........l.
 ...........d
 .h....R..a..
 .h...B░░...d
 .h....░░a...
 .h....R.....
 ..........l.
 ............
```
Deux rochers forment un goulot de 4 m. Il est garni de foin ; le brasero touche le foin, côté héros (à environ 6,5 m des héros : on y arrive au tour 1, en marchant). Les ennemis qui foncent sur les héros traversent le foin **d'eux-mêmes**.

**B. La meule**
```
 ............
 .h..........
 .h.....░░░.l
 .h....B░░░.d
 .h.....░░░.a
 .h..R.......
 ..........l.
 ............
```
Un grand tas de foin (6 × 6 m) au milieu-droite, des ennemis rangés autour, le brasero collé à son flanc ouest, un rocher en couverture pour les héros. Ici le combo se prépare en **tirant ou poussant** un ennemi dessus.

**C. Le champ fauché**
```
 ..........l.
 .h..░░....d.
 .h..░░..R...
 .h.B....a...
 .h.....R.░░.
 .h.B.....░░.
 ..........l.
 ............
```
Deux bottes de foin et deux braseros, un de chaque côté : on peut allumer l'un ou l'autre, ou les deux. Sert aux groupes qui ont déjà compris, et enseigne l'encerclement (avantage de flanc).

## 3. Le combo prêt à voir dès le tour 1
Règle de la salle : **un combo possible avec n'importe quel groupe de quatre classes jouables** (validateur, `NIVEAUX` §7). La torche n'est donc pas réservée à une classe.

| Rôle | Qui peut le faire | Comment |
|---|---|---|
| **Finit** (obligatoire, à la portée de tous) | **n'importe quel héros** adjacent au brasero | **Renverser** le brasero : action bonus, le feu prend sur le foin qui le touche (surface Feu, 3 tours). |
| Finit, de loin | Voleur ou Éclaireuse | **Flèche de feu** sur le foin. |
| **Prépare** | Chevalier : **Charge au bouclier** (pousse de 3 m) · Druide : **Liane** (attire de 3 m) · Voleur : **Fiole d'huile** (Huilé, le feu fait ×2) | amène un ennemi dans le foin ; sur le gabarit A, **la marche des ennemis suffit**. |

- **Résultat :** un ennemi pris dans le foin en feu prend 6 (entrée) + Brûlure (5 par tour, 2 tours), soit **16 à 22** : plus de la moitié d'un bandit ou d'un arbalétrier. Huilé : ×2.
- **Aperçu :** survoler le brasero allume en rouge la future zone de feu et liste les ennemis qui seraient touchés avec leurs dégâts prévus. Le groupe voit le combo avant de l'engager ; **aucun texte ne l'explique**.
- **Combo de secours :** pousser un ennemi **dans** le brasero (Charge au bouclier) lui fait prendre le Feu directement. Si le groupe n'a ni poussée ni attirance, la marche des ennemis sur le gabarit A sert de préparation, d'où le choix de A comme premier gabarit.
- **Le danger du finisseur :** le héros qui renverse le brasero est au bord du feu, donc exposé aux ennemis qui arrivent. C'est le petit prix du combo.

## 4. Le contenu tiré au sort
**Graine :** à l'entrée, **l'hôte choisit qui lance le dé** (pas de vote, décidé le 22 oct ; jamais automatique) ; ce d20 donne la graine (mot de 5 lettres comme le code de partie), et tout le monde reconstruit la même salle. Même graine, même salle.

**Le pool du sentier des Gueux** (tiré de `ENNEMIS.fr.md`, bandits, archers et bêtes simples) :
| Ennemi | Rang | Coût | Habitude | Pourquoi ici |
|---|---|---|---|---|
| Bandit | sbire | 1 | lâche | le corps à corps lisible (cf. question 4) |
| Arbalétrier | soldat | 2 | distance 8 m | l'archer qui se tient derrière un rocher |
| Nuée de rats | sbire | 1 | plus-proche | des bêtes qui traversent le foin en courant |
| Loup | soldat | 2 | meute | une bête rapide (12) qui rend le foin vite utile |

**Trois rencontres types** (3 à 4 ennemis, 5 à 6 points, 105 à 130 PV au total) :
- **Les bandits :** 3 bandits + 1 arbalétrier (5).
- **Les rôdeurs :** 1 loup + 2 nuées de rats (4) + 1 arbalétrier (6).
- **Les braconniers :** 1 loup + 2 bandits + 1 arbalétrier (6).

**Ce qui change d'une partie à l'autre :** le gabarit (A, B ou C), l'orientation (miroir haut/bas), la rencontre type, les positions de départ dans les groupes `avant` / `loin` / `fond`, le côté du brasero, la Caillasse gagnée (15 à 25 par héros, `MONNAIE.fr.md`).
**Ce qui ne change pas :** un combo possible avec n'importe quel groupe, la règle « jamais perdu sur un seul jet », l'objectif `vaincre-tous`, l'absence de renforts.

## 5. Le score 8/10 de cette salle
- **Un nouveau joueur trouve le combo seul avant le tour 3, sans qu'on le lui explique** (mesure : voir plus bas).
- Aucun combat perdu sur un seul jet ; le fumble ne coûte jamais plus que le tour.
- Le groupe a vu le d20 (la graine, puis chaque attaque) avant la fin de la salle, et le dit.
- 7 min ± 2 ; au moins un combo à deux joueurs aperçu avant d'être joué.
- Trois graines donnent trois sentiers F que les joueurs reconnaissent comme différentes.
- Test sur la route du propriétaire : lien, Hôte, code, amis, le chemin ; captures à l'appui.

**Mesure du « seul » :** trois testeurs qui n'ont jamais vu le jeu, sans aide ; 2 sur 3 jouent le combo avant la fin du tour 3 pour que la note tienne. Je note à quel tour chacun y arrive.

## 6. Ce qui est nouveau (porte P : à valider, rien d'autre)
- **Une surface « Foin »** : se transforme en Feu quand le feu la touche (comme l'huile). Elle est déjà citée comme surface dans la fiche des caves.
- **Une interaction « Renverser »** sur le brasero (action bonus, adjacent), déjà proposée dans la fiche des caves.
- **Aperçu de la zone** au survol du brasero (les dégâts prévus s'affichent déjà au survol des capacités).
Pas de nouvel état, pas de nouvelle règle de combat.

## 7. Questions pour le propriétaire
| # | Point | Ma proposition |
|---|---|---|
| 1 | **Le nombre d'ennemis** : le cadre dit « 2 ou 3 », mais 2 ou 3 ennemis font ≈ 90 PV, soit 1 à 2 tours : le combat serait fini avant le « tour 3 » du score | **3 à 4** (une nuée de rats compte pour un) ; sinon baisser la barre à « avant la fin du combat » |
| 2 | Les trois gabarits A, B, C, ou seulement deux (A et B) | les trois, A en premier |
| 3 | Le foin comme surface qui brûle et « Renverser » le brasero (§6) | oui |
| 4 | Le bandit **lâche** (fuit sous 30 %) et **vole une potion** : trop piégeux pour le premier combat ? | en salle 1 : il ne vole pas et ne fuit pas |
| 5 | Le vote : seulement « qui lance le dé » (proposé), ou aussi un second petit vote avant le combat | un seul ; un second vote (approche de front ou par le flanc) serait une règle de plus, au parc d'idées |
| 6 | Une récompense de combat en plus de la Caillasse (choix d'une capacité, comme aux caves) ? | non sur le chemin : la Caillasse seule |
| 7 | L'ambiance et le nom du sentier des Gueux | à l'équipe |

### Réponses du propriétaire (22 oct) : fiche validée
1. 3 à 4 ennemis (une nuée compte pour un) : **oui**. 2. Les trois gabarits : **oui**. 3. Foin qui brûle et Renverser : **oui**. 4. Bandit sans vol ni fuite en salle 1 : **oui**. 5. Un seul vote, celui du dé : **oui**. 6. La Caillasse seule : **oui**.
7. **Nom : « le sentier des Gueux ».** L'ambiance suit le nom : l'orée d'un bois, herbe, foin et brasero de passage, lumière de jour. Seul le cadre visuel est fixé ici ; les textes et l'histoire restent à l'équipe.

## 8. Ce que ça demande en code (pas avant le « oui »)
Trois `content/salles/camp-des-mastres/sentier-des-gueux-*.json` et trois `content/rencontres/camp-des-mastres/sentier-des-gueux-*.json`, la surface Foin, l'interaction Renverser, l'aperçu de zone, le vote « qui lance le dé » et le tirage avec graine (déjà prévu pour les caves). Une salle jouée et notée avant d'en faire d'autres (porte T).

## 9. Fait au terrain d'entraînement (22 oct, branche histoire/lisiere, à ton contrôle)
- `?aventure=camp-des-mastres` : l'hôte choisit qui lance le dé, le d20 donne la graine, la salle et la rencontre sont tirées.
- Les trois gabarits, les trois rencontres avec les ennemis du chemin (bandit, arbalétrier qui recharge, loup en meute, nuées de trois rats).
- Le foin, « Renverser le brasero », l'aperçu du feu au survol, et le combo de secours : un ennemi poussé contre le brasero prend le feu et le brasero tombe sur le foin.
- La planche du brasero : `public/assets/lpc/brasero_sentier_gueux.png` (4 images de flamme, puis renversé).
- Reste : le tirage partagé à plusieurs (aujourd'hui chacun tire le sien), l'accès depuis le camp, les cartes des nouveaux ennemis dans les Archives.
- **23 oct, le tronçon :** `?aventure=camp-des-mastres` ouvre le tronçon du sentier des Gueux (`content/salles/camp-des-mastres/sentier-des-gueux-troncon.json`, 32 x 26 cases) : on marche à pied (un clic, les autres suivent), les champs de vue des ennemis sont au sol, être vu déclenche le combat là où l'on se tient, frapper ou renverser le brasero sans être vu donne la surprise (les ennemis perdent leur premier tour), la souche creuse se fouille sur un d20 de perception. Reste : l'exploration à plusieurs, la sortie à l'est vers la fourche, la sauvegarde entre les combats.
- **23 oct, le départ :** la carte s'étend vers l'ouest jusqu'à la porte du camp (67 x 26 cases) : la zone 0 (la sortie par la grande porte, l'allée, une souche à fouiller, des traces de bandits vers l'est, aucun ennemi), puis le sentier des Gueux, 34 cases plus loin. La caméra cadre au plus 32 cases de large et suit le groupe.
- **23 oct, confirmé par le propriétaire** après son essai en local : le départ et le sentier des Gueux (l'exploration, la détection, la surprise, la fouille, la victoire qui rend la route, la défaite qui ramène au début du chemin).
- **23 oct, le départ déplacé (propriétaire) :** on ne sort plus par la grande porte du sud mais par **la porte est** : le chemin commence au bord de la clairière de l'est du nouveau plan du camp (l'étang, la ferme : meule, épouvantail, charrette, clôture) et prend **le sentier des Gueux**, qui s'enfonce dans une forêt serrée jusqu'au sentier des Gueux. Le raccord avec la carte du camp (sortir par le sentier des Gueux et arriver ici) viendra quand le plan agrandi sera dans main.
