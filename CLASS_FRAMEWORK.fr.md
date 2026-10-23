# CLASS FRAMEWORK : le cadre dans lequel chacun crée sa classe

**Première base, 18 octobre 2026, à confirmer avec les joueurs.** Ce cadre est volontairement large : il dit jusqu'où on peut aller, pas ce qu'il faut faire. Il s'inspire du système de Baldur's Gate 3 (la 5e de D&D : l'achat de caractéristiques à 27 points, un rôle par classe et une sous-classe qui le colore, action, action bonus et réaction, des paliers de puissance qui montent avec les niveaux) ramené à la taille de notre jeu : des combats de 7 minutes à quatre, où **le cœur est le combo entre deux joueurs**.

Il part de `CLASS_TEMPLATE.fr.md` (la fiche à remplir) et de `FIGHT_RULES.md` (les règles du combat) : rien ici ne les contredit, il les complète en posant les bornes. On modifiera ce fichier quand l'équipe aura vu et testé cette première base. La version machine est `src/classe/cadre.json` : c'est elle que l'armurerie (le créateur de classe, `classe.html`) applique ; l'onglet « Le cadre » de l'armurerie la montre et laisse la retoucher pour proposer un changement.

**Comment lire ce fichier :** *règle* = une borne que l'armurerie fait respecter (la fiche est « hors cadre » sinon) · *conseil* = l'enveloppe habituelle, qu'on peut quitter en le disant · *interdit* = ce qu'aucune classe ne fait, à aucun niveau.

## 1. Ce qu'est une classe, en une page
| Partie | Le cadre |
|---|---|
| Rôle | **un rôle principal** (tank · dégâts · soutien · contrôle) **et une particularité** : ce qui fait qu'elle n'est pas que son rôle |
| Caractéristiques | les six de D&D, achetées avec **27 points** (5e), de 8 à 15 au niveau 1 |
| Points de classe | **10 points**, à répartir librement entre PV, déplacement et capacités |
| Capacités de départ | **3**, dont **l'attaque de base** (gratuite) ; chacune dit ce qu'elle **crée** ou ce qu'elle **utilise** comme accroche de combo |
| Ressource | **une de la liste commune** (§5) |
| Faiblesse | **une vraie**, écrite sur la fiche, que les ennemis ou la salle peuvent exploiter |
| Équipement | **aucun au départ** : tout se trouve en jeu |
| Niveaux | 1 à 20, **la sous-classe au niveau 3** (deux chemins), comme dans D&D |

## 2. Les caractéristiques (règle)
- Chaque caractéristique part de **8**. Monter coûte : 9 = 1, 10 = 2, 11 = 3, 12 = 4, 13 = 5, 14 = 7, 15 = 9. **27 points** au total, **15 au plus** au niveau 1 (20 au plus, plus tard).
- Modificateur = (score − 10) ÷ 2, arrondi en dessous : 8 → −1, 10 → 0, 12 → +1, 14 → +2, 15 → +2.
- Trois 15 font 27 pile ; le reste à 8. L'autre forme classique : 15, 14, 13, 12, 10, 8.

| Carac. | Ce qu'elle fait ici |
|---|---|
| FOR | au d20 et aux dégâts des attaques de force ; poussée +1 case à 14+ |
| DEX | au d20 et aux dégâts des attaques de finesse et à distance ; à l'initiative |
| CON | **+5 PV par point de modificateur**, au niveau 1 et à chaque niveau |
| INT | au d20 et aux dégâts des capacités arcaniques ; les surfaces durent +1 round à 14+ |
| SAG | aux soins et aux capacités de nature ou divines ; repère les pièges et les salles cachées |
| CHA | aux capacités de présence (provocations, inspiration) ; meilleurs prix et choix d'événements |

## 3. Les points de classe (règle)
**10 points.** Ce qui n'est pas dépensé devient **+5 PV par point** (sans compter dans le plafond).

| Dépense | Coût | Bornes |
|---|---|---|
| PV de base au-dessus de 100 | 1 point par +10 | 130 au plus |
| PV de base en dessous de 100 | rend 1 point par −10 | 70 au moins |
| Déplacement au-dessus de 5 cases (7,5 m) | 2 points par +1 case | 7 cases (10,5 m) au plus |
| Déplacement en dessous de 5 cases | rend 1 point par −1 case | 4 cases (6 m) au moins |
| L'attaque de base | **0** | une seule |
| Une préparation (statut, surface, poussée, attirance) | 2 | |
| Une exploitation (plus forte sur une préparation) | 3 | |
| Une action bonus ou une réaction | 2 | une seule réaction par classe |
| Un soin, un bouclier ou un buff | 3 | un soin rend au plus 25 PV au niveau 1 |
| Renfort : zone plus grande | +1 | |
| Renfort : un effet en plus | +1 | |
| Renfort : plus de dégâts (un palier) | +2 | jamais sur l'attaque de base ; jamais jusqu'au palier T3 au niveau 1 |
| Renfort : critique assuré contre la ressource | +1 | |

**PV finaux au niveau 1** = PV de base + 5 × modificateur de CON + 5 × points non dépensés.

## 4. Les paliers de puissance (règle)
C'est ce qui garde les classes comparables, quelle que soit leur saveur. Une capacité se décrit dans ces cases ; on en sort seulement en le disant au groupe.

**Dégâts : un nombre fixe plus un petit dé**, plus le modificateur de la caractéristique. Le d20 décide seulement de la qualité (`FIGHT_RULES.md`) : 2–9 éraflure (moitié), 10–19 touche, 20 critique (double).
| Palier | Formule | Qui | Éraflure / touche / critique avec +2 |
|---|---|---|---|
| **T1** | 8 + d4 | l'attaque de base | 5–7 / 11–14 / 22–28 |
| **T2** | 14 + d6 | une exploitation, une capacité à coût | 8–11 / 17–22 / 34–44 |
| **T3** | 22 + d8 | **niveau 5 et plus seulement** | 12–16 / 25–32 / 50–64 |

**Portées** (de centre à centre, avec ligne de vue) : contact 2,25 m · courte 4,5 m · moyenne 7,5 m · longue 9 m · très longue 12 m.
**Zones :** une cible · petite zone (2×2 : un cercle de 1,7 m) · grande zone (3×3 : 2,5 m). Le centre de la zone est dans la portée.
**Moments :** action · action bonus · réaction (au plus une par round, et une seule par classe).
**Soins :** un soin de niveau 1 rend au plus 25 PV ; le Cri (+10 à tous autour) et le Soin (18–23 à un allié) sont les deux formes de référence.

## 5. La ressource (règle : une de la liste)
| Ressource | Se remplit | Max |
|---|---|---|
| Rage | +10 par coup donné ou reçu | 50 |
| Mana | 40 par combat, +5 à chaque tour | 40 |
| Concentration | +1 par préparation qu'un coéquipier exploite | 3 |
| Foi | +1 par soin ou protection | 3 |
| Énergie | 3 à chaque tour, perdue si elle n'est pas dépensée | 3 |
| Élan | +1 par case parcourue, se vide si on reste immobile | 5 |
| Rythme | +1 à chaque attaque d'un allié ; se vide si aucun allié n'attaque pendant un tour complet | 4 |

Une nouvelle ressource entre dans la liste seulement avec l'accord du groupe : elle devient alors disponible pour tout le monde.

## 6. Les accroches de combo (règle : au moins une par classe)
Chaque capacité dit ce qu'elle **crée** (elle prépare) ou ce qu'elle **utilise** (elle exploite). Une classe sans aucune accroche est hors cadre : personne ne pourrait faire de combo avec elle. L'idéal : **une préparation pour la table, une exploitation pour soi.**

| Statut | Effet | Exploité par |
|---|---|---|
| Trempé | éteint Brûlant | la foudre fait ×2 |
| Huilé | | le feu fait ×2 et enflamme |
| Brûlant | 5 dégâts au début de son tour, 2 tours | |
| Gelé | −3 m de déplacement, désavantage aux attaques | une poussée le déplace de 3 m de plus |
| À terre | se relever coûte la moitié du déplacement | avantage aux attaques contre lui |
| Exposé | | la prochaine attaque contre lui a l'avantage |

| Surface (3 rounds) | Effet | Devient |
|---|---|---|
| Huile | Huilé en entrant | le feu l'enflamme |
| Eau | Trempé en entrant | la foudre l'électrise (8 à tous dedans) ; le froid la gèle |
| Feu | 6 dégâts en entrant ou en y finissant son tour, Brûlant | l'eau l'éteint |
| Glace | glissante : d20 en entrant, À terre sur 1–9 ; une poussée fait glisser | le feu la fait fondre |

| Position | Effet |
|---|---|
| Poussée | 3 m tout droit ; +8 contre un obstacle ; le fossé élimine un sbire, 20 dégâts aux autres |
| Attirer | 3 m vers soi : dans une surface, le feu, le fossé |
| Tenaille | un allié de l'autre côté de la cible donne l'avantage |
| Donner l'avantage | un allié a l'avantage à sa prochaine attaque |

Un nouveau statut ou une nouvelle surface se propose au groupe (axe combats) : il doit dire ce qui l'exploite, sinon ce n'est pas une accroche.

## 7. Les enveloppes des rôles (conseil)
Ce sont les formes habituelles. On peut en sortir, à condition de dire pourquoi sur la fiche : l'armurerie l'affiche en conseil, pas en blocage.

| Rôle | PV finaux | Déplacement | Carac. conseillées | La forme qui marche |
|---|---|---|---|---|
| Tank | 120 à 155 | 6 à 9 m | FOR, CON | encaisse, provoque, renverse ; sa préparation est souvent une poussée ou À terre |
| Dégâts | 100 à 125 | 7,5 à 10,5 m | DEX, FOR, INT | finit ce que les autres préparent : une exploitation ×2 sur un statut |
| Soutien | 105 à 140 | 7,5 à 9 m | SAG, CHA | fait gagner les autres : un soin ou un buff, et une préparation pour la table |
| Contrôle | 100 à 135 | 7,5 à 10,5 m | INT, SAG, DEX | décide où se tient l'ennemi et dans quel état : surfaces, statuts, attirances |

## 8. Les interdits (à tout niveau)
- Pas de palier T3 (22 + d8) au niveau 1 : il vient au niveau 5 et plus.
- Une seule attaque de base, et elle ne monte jamais au-dessus de T1.
- Au plus une réaction par classe.
- Un soin ne rend pas plus de 25 PV au niveau 1.
- Pas d'avantage permanent : l'avantage se gagne (tenaille, statut, préparation d'un allié).
- Pas de nouvelle ressource, de nouveau statut ni de nouvelle surface sans l'accord du groupe.
- Aucun équipement de départ.
- Rien qui change le temps, la caméra ou la vitesse de la partie (porte Q de la méthode de l'équipe).
- La faiblesse est réelle : « prend 1 dégât de plus la nuit » n'en est pas une. Elle doit pouvoir coûter un combat mal joué.

## 9. Les barres qu'une classe doit tenir en jeu
On ne les vérifie pas sur la fiche, mais au terrain d'entraînement, puis en salle. Une classe qui les casse revient à l'armurerie.
| Barre | Cible | D'où ça vient |
|---|---|---|
| Personne ne porte les autres | aucun héros ne fait plus de **40 %** des dégâts de l'équipe | le « jamais » de Paolitus ; au D1 le Voleur a fait 68 % |
| Les combos existent | **au moins 1 combo entre deux joueurs** par combat, avec cette classe à la table | le focus du jeu |
| Le rythme | un round à quatre en **4,5 min** au plus, un combat vers **7 min** | KICKOFF, FIGHT_RULES |
| Pas de coup de chance | aucun combat perdu sur un seul jet | le « jamais » de Paolitus |

## 10. Les niveaux (le squelette, les détails viennent après les premiers combats)
| Niveau | Gain |
|---|---|
| chaque niveau | +5 PV + le modificateur de CON |
| 2 | une capacité nouvelle (3 points de classe de valeur) |
| **3** | **la sous-classe** : un des deux chemins écrits par l'auteur, chacun avec un trait aux niveaux 3, 7, 11 et 15 |
| 4, 8, 12, 16, 19 | +2 à une caractéristique, ou +1 à deux (20 au plus) |
| 5, 9, 13, 17 | une capacité nouvelle, ou une amélioration ; le palier T3 s'ouvre au 5 |
| 6 | un coup d'équipe avec une autre classe (les deux adjacentes, les deux actions) |
| 20 | la signature : la seule chose que personne d'autre ne sait faire |

Les ennemis suivent le niveau des héros, pas le chapitre (`FIGHT_RULES.md`).

## 11. Le format d'une classe dans le jeu
L'armurerie enregistre une classe en JSON ; **« Exporter le JSON »** donne `content/classes/<id>.json`, qui entre dans le jeu par une PR (mission de l'axe classes). Les fichiers déjà là : l'exemple de la fiche (`voleur-exemple.json`) et les quatre classes d'essai du terrain (`eclaireuse`, `chevalier`, `druide`, `barde`), tous au budget.

```json
{
  "id": "eclaireuse", "nom": "Éclaireuse", "auteur": "qui l'a faite", "phrase": "en une phrase, qui elle est",
  "role": "degats", "twist": "harcèle et entrave", "archetype": "Ranged",
  "caracs": { "FOR": 8, "DEX": 15, "CON": 13, "INT": 10, "SAG": 14, "CHA": 12 },
  "pv": 100, "vitesse": 7, "ressource": "energie",
  "capacites": [
    { "nom": "Tir rapide", "sorte": "base", "slot": "action", "portee": "tres-longue", "zone": "aucune", "carac": "DEX", "cout": "", "effet": "", "cree": [], "utilise": [], "renforts": [] },
    { "nom": "Filet", "sorte": "preparation", "slot": "bonus", "portee": "moyenne", "zone": "aucune", "carac": "DEX", "cout": "2 Énergie", "effet": "la cible est Gelée", "cree": ["gele"], "utilise": [], "renforts": [] },
    { "nom": "Tir lesté", "sorte": "exploitation", "slot": "action", "portee": "tres-longue", "zone": "aucune", "carac": "DEX", "cout": "1 Énergie", "effet": "×2 sur une cible Gelée", "cree": [], "utilise": ["gele"], "renforts": [] }
  ],
  "faiblesse": "un ennemi à son contact : ses tirs ont le désavantage",
  "sousClasses": [{ "nom": "", "idee": "" }, { "nom": "", "idee": "" }],
  "look": { "corps": "", "tenue": "", "touche": "", "lien": "le lien du générateur LPC", "base": "eclaireuse" },
  "references": ""
}
```
- `sorte` : `base` · `preparation` · `exploitation` · `reaction` · `soutien` ; `slot` : `action` · `bonus` · `reaction` ; `portee` : `contact` · `courte` · `moyenne` · `longue` · `tres-longue` ; `zone` : `aucune` · `petite` · `grande` ; `renforts` : `zone` · `effet` · `degats` · `critique`.
- `cree` et `utilise` prennent les identifiants des accroches du §6 (`trempe`, `huile`, `brulant`, `gele`, `aterre`, `expose`, `eau`, `feu`, `glace`, `poussee`, `attirer`, `tenaille`, `avantage`).
- **Ce que le JSON ne dit pas encore :** l'effet exact d'une capacité est un texte (`effet`) : pour la jouer au terrain d'entraînement, quelqu'un l'écrit en règle (`src/entrainement/regles.js`, `CAPACITES`). C'est la prochaine étape du créateur de classe : un vocabulaire d'effets assez riche pour que le JSON se joue tout seul.

## 12. Le chemin d'une classe, de l'idée à la table
1. **À l'armurerie** (E devant sa porte au camp, ou `classe.html`) : remplir la fiche, lire l'aperçu du build, arriver à « ✔ Dans le cadre ».
2. **La partager :** « Copier la fiche » dans l'issue de sa mission (3.1 « Créer une classe », #30 à #33), pour l'avis du groupe. Le groupe juge les « conseils » (les enveloppes des rôles, les renforts) ; les « problèmes » se corrigent avant.
3. **La mettre dans le jeu :** « Exporter le JSON » → `content/classes/<id>.json` dans une PR qui ferme la mission. Son look suit le chemin du skill `lpc-sprite-mods` (générateur LPC, Sprite Painter, `CREDITS.md`).
4. **La tester :** au terrain d'entraînement, dans les barres du §9. Ce qui casse revient à l'armurerie ; ce qui plaît est choisi pour la D2 (#35).
5. **Changer le cadre :** quand une bonne classe ne rentre pas, on change peut-être le cadre et non la classe. L'onglet « Le cadre » de l'armurerie permet d'essayer un autre chiffre sur sa propre fiche et de **copier le cadre modifié** dans une issue « Idée » ; si le groupe est d'accord, ce fichier et `src/classe/cadre.json` changent ensemble.

## Ce que cette première base ne tranche pas (à voir avec les joueurs)
- Les enveloppes des rôles (§7) : les bornes sont prises sur les 8 classes qui existent ; elles bougeront avec les classes de chacun.
- Le coût des renforts (+1, +2) : « le groupe juge » dans la fiche ; ici c'est chiffré pour que l'armurerie compte. À vérifier sur les premières fiches.
- Les niveaux 2 à 20 : le squelette est celui de la fiche ; rien n'est équilibré au-delà du niveau 1 tant que les combats de niveau 1 ne sont pas à 9/10.
- Un vocabulaire d'effets jouables (§11), pour que la classe sortie de l'armurerie entre au terrain d'entraînement sans qu'on la recode.
