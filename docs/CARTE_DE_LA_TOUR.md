# La carte de la tour : les 25 salles

Brouillon du 24 oct 2026, **provisoire**. Source de vérité : [`content/carte-tour.json`](../content/carte-tour.json) ; ce fichier n'en est que la version lisible. Contrôle : `node tools/verifier-carte.mjs`. Les noms de salles et de boss sont ceux, provisoires, des fiches et des maquettes : **ils sont à l'équipe**, comme l'histoire. La monnaie de la tour est la **Caillasse**.

## 1. Le schéma (de bas en haut)

```
                        ┌─────────────────────────┐
              niv. 20   │  LE GARDIEN  (boss)     │
                        └────────────▲────────────┘
                                     │
   ÉTAGE 3 · LES HAUTEURS            │      (niveau 20 atteint dès la salle 4)
   niv. 17-20      6  boss A ───┬─── boss B        ◄ vote
                                │
                   5  repos / boutique / mini-jeu  ◄ graine
                                │
                   4  élite ───┬─── trésor         ◄ vote
                                │
                   3  combat
                                │
                   2  événement ┬── énigme         ◄ vote
                                │
                   1  combat
                                ▲  (escalier : cinématique)
   ÉTAGE 2 · LA GARNISON        │
   niv. 12-16      6 à 1 : même ordre que l'étage 3
                                ▲  (escalier)
   ÉTAGE 1 · LES CAVES          │
   niv. 7-11       6  Gros Rat ┬ Geôlier            ◄ vote
                   5  repos / boutique / mini-jeu   ◄ graine
                   4  élite ┬ trésor                ◄ vote
                   3  combat
                   2  événement ┬ énigme            ◄ vote
                   1  combat
                                ▲  (la porte s'ouvre)
   LE CHEMIN       6  la porte de la tour (mini-boss)   niv. 6
   niv. 1-6        5  le moulin           (combat)      niv. 5
                   4  les champs  chariot ┬ bandits    niv. 4  ◄ graine
                   3  le gué              (combat)      niv. 3
                   2  la fourche  colporteur ┬ borne   niv. 2  ◄ vote
                   1  le sentier des Gueux (combat)     niv. 1
                                ▲
                          [ LE CAMP ]
```

Ordre fixe dans chaque étage : 1 combat · 2 événement ou énigme · 3 combat · 4 élite ou trésor · 5 repos, boutique ou mini-jeu · 6 boss A ou B.

- **Vote** : 20 s, le plus de voix gagne, l'hôte départage (salles 2, 4 et 6 de chaque étage ; la fourche du chemin).
- **Graine** (décidé par le propriétaire) : la salle 5 de chaque étage est **tirée au sort par la graine, sans vote** ; au chemin, la salle 4 (bandits ou chariot) aussi.
- **Niveaux** : « niveau » est celui du groupe **en entrant** dans la salle. +1 après chaque salle ; **le repos des étages 1 et 2 ne donne pas de niveau** (d'où le niveau qui ne change pas entre les salles 5 et 6) ; plafond 20 (au plafond, une salle donne à la place de l'or, une potion ou un objet). Pas de repos dans le chemin.

## 2. Les 25 salles

| Zone | N° | Id | Nom (provisoire) | Sorte | Choix | Niveau | État | Fiche |
|---|---|---|---|---|---|---|---|---|
| Le chemin | 1 | `chemin-1-sentier-des-gueux` | Le sentier des Gueux | combat | · | 1 | code | [fiche](fiches/chemin-sentier-des-gueux.md) |
| Le chemin | 2 | `chemin-2-fourche` | La fourche | événement (Le colporteur / La vieille borne) | vote | 2 | code | [fiche](fiches/chemin-de-la-tour.md) |
| Le chemin | 3 | `chemin-3-gue` | Le gué | combat | · | 3 | code | [fiche](fiches/chemin-combats.md) |
| Le chemin | 4 | `chemin-4-champs` | Les champs | événement (L'embuscade des bandits / Le chariot renversé) | graine | 4 | code | [fiche](fiches/chemin-de-la-tour.md) |
| Le chemin | 5 | `chemin-5-moulin` | Le moulin | combat | · | 5 | code | [fiche](fiches/chemin-combats.md) |
| Le chemin | 6 | `chemin-6-porte` | La porte de la tour | mini-boss | · | 6 | code | [fiche](fiches/chemin-combats.md) |
| Étage 1 · les caves | 1 | `etage1-s1` | Combat (les caves) | combat | · | 7 | a_ecrire | — |
| Étage 1 · les caves | 2 | `etage1-s2` | Événement ou énigme | événement / énigme | vote | 8 | a_ecrire | — |
| Étage 1 · les caves | 3 | `etage1-s3` | Combat (les caves) | combat | · | 9 | a_ecrire | — |
| Étage 1 · les caves | 4 | `etage1-s4` | Élite ou trésor | élite / trésor | vote | 10 | a_ecrire | — |
| Étage 1 · les caves | 5 | `etage1-s5` | Repos, boutique ou mini-jeu | repos / boutique / mini-jeu | graine | 11 | a_ecrire | — |
| Étage 1 · les caves | 6 | `etage1-s6` | Boss : Le Gros Rat ou Le Geôlier | boss | vote | 11 | a_ecrire | — |
| Étage 2 · la garnison | 1 | `etage2-s1` | Combat (la garnison) | combat | · | 12 | a_ecrire | — |
| Étage 2 · la garnison | 2 | `etage2-s2` | Événement ou énigme | événement / énigme | vote | 13 | a_ecrire | — |
| Étage 2 · la garnison | 3 | `etage2-s3` | Combat (la garnison) | combat | · | 14 | a_ecrire | — |
| Étage 2 · la garnison | 4 | `etage2-s4` | Élite ou trésor | élite / trésor | vote | 15 | a_ecrire | — |
| Étage 2 · la garnison | 5 | `etage2-s5` | Repos, boutique ou mini-jeu | repos / boutique / mini-jeu | graine | 16 | a_ecrire | — |
| Étage 2 · la garnison | 6 | `etage2-s6` | Boss : Le Capitaine ou Les Jumeaux d'armes | boss | vote | 16 | a_ecrire | — |
| Étage 3 · les hauteurs | 1 | `etage3-s1` | Combat (les hauteurs) | combat | · | 17 | a_ecrire | — |
| Étage 3 · les hauteurs | 2 | `etage3-s2` | Événement ou énigme | événement / énigme | vote | 18 | a_ecrire | — |
| Étage 3 · les hauteurs | 3 | `etage3-s3` | Combat (les hauteurs) | combat | · | 19 | a_ecrire | — |
| Étage 3 · les hauteurs | 4 | `etage3-s4` | Élite ou trésor | élite / trésor | vote | 20 | a_ecrire | — |
| Étage 3 · les hauteurs | 5 | `etage3-s5` | Repos, boutique ou mini-jeu | repos / boutique / mini-jeu | graine | 20 | a_ecrire | — |
| Étage 3 · les hauteurs | 6 | `etage3-s6` | Boss : Le Bibliothécaire ou La Sentinelle de verre | boss | vote | 20 | a_ecrire | — |
| Le Gardien | 1 | `gardien` | La salle du Gardien | boss | · | 20 | a_ecrire | — |

États : `a_ecrire` → `fiche` (écrite) → `valide` (par DonBabaa) → `code` → `joue` (jouée et notée).
**Remarque :** les six salles du chemin sont marquées `code` parce que le chemin existe déjà sur le terrain d'entraînement ; leur validation et leur note restent au propriétaire.

## 3. Ce que le joueur voit sur la carte

- **Les salles faites** sont cochées.
- **La salle actuelle** pulse.
- **La bifurcation choisie** (vote ou graine) est marquée sur le chemin pris.
- **Le niveau du groupe** est affiché sur la carte.
- **Seulement la sorte de la prochaine salle est visible** (« combat », « élite »… : nécessaire pour voter) ; **son contenu reste caché jusqu'à l'entrée** (quel groupe d'ennemis, quel événement, quels boss). **Les salles plus loin sont grisées.**
- À une bifurcation votée, les deux sortes proposées sont visibles ; pour une salle tirée par la graine, la sorte n'est connue qu'une fois la graine lancée (point ouvert 2).

## 4. Comment ajouter une salle ou changer son état (sans coder)

1. Ouvre `content/carte-tour.json` et cherche l'`id` de la salle (par exemple `etage1-s3`).
2. Pour changer son avancement, modifie la ligne `"etat"` : `a_ecrire`, `fiche`, `valide`, `code` ou `joue`. Quand tu écris une fiche, mets son chemin dans `"fiche"` (par exemple `"docs/fiches/etage1-evenement.md"`).
3. Pour renommer une salle, change `"nom"` (garde `"provisoire": true` tant que l'équipe n'a pas validé).
4. Pour **ajouter** une salle : copie une ligne de salle, donne-lui un `id` neuf, puis change la ligne `"suit"` de la salle d'avant pour qu'elle pointe vers le nouvel id, et celle de la nouvelle salle vers la suivante. La tour a 25 salles : le contrôle protestera si tu en ajoutes une, et le nombre se décide avec DonBabaa.
5. Lance `node tools/verifier-carte.mjs` : il dit ✓ ou liste ce qui ne va pas. Mets ensuite ce tableau à jour (ou demande-le à ton Claude).

## 5. Points ouverts et contradictions (à trancher, pas par Claude)

1. **Le chemin a été repensé le 23 oct** (`chemin-de-la-tour.md`) : une seule carte à explorer à pied, neuf zones, quatre combats dont un mini-boss. Le brief dit « six salles ». Cette carte garde six salles (sentier des Gueux, fourche, gué, champs, moulin, porte), les explorations étant à l'intérieur. À confirmer.
2. **La salle 5 tirée par la graine** : le brief dit « un seul lancer au départ du chemin », mais la règle des salles dit « à l'entrée de chaque salle, on lance le dé ». La sorte de la salle 5 est-elle connue avant l'entrée ? La carte en a besoin.
3. **Les niveaux de la salle 6** : le niveau reste celui de la salle 5 (le repos ne donne rien aux étages 1 et 2). Si la salle 5 est une boutique ou un mini-jeu, donnent-ils un niveau ? À décider.
4. **Étage 3 :** niveau 20 dès la salle 4 ; les salles 4 à 6 donnent donc une récompense au lieu d'un niveau.
5. `STORY_STRUCTURE` parle de 9 salles par chapitre, `LEVEL_STRUCTURE.md` de 9 salles au total : à recaler sur cette carte.
6. **Renommer « Gold » en « Caillasse »** dans `MONNAIE.fr.md`, `LEVEL_STRUCTURE.md` et le code reste à faire (décidé par DonBabaa le 22 oct).
7. La fiche de la salle 1 des caves (`salle-combat-caves.md`) vit sur une autre branche : son lien sera ajouté quand elle sera sur `main`.
