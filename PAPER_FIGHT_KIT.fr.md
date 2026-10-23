# KIT DU COMBAT SUR PAPIER (D1)

On joue un combat avec de vrais dés avant d'écrire la moindre ligne de code, **une fois dans chaque mode de tour**, et on mesure. Version anglaise : `PAPER_FIGHT_KIT.md`. Règles complètes : `FIGHT_RULES.md`.

## La soirée (environ 1 h 30)
| Quand | Quoi | Qui |
|---|---|---|
| Avant | Préparer le plateau, partager les fiches, mettre un chrono sur un téléphone | l'organisateur |
| 0:00 | Les règles en 10 minutes (résumé ci-dessous) | l'organisateur |
| 0:10 | **Combat 1, tour d'équipe** : tous les héros jouent dans l'ordre qu'ils veulent, puis tous les ennemis. Chronométrer chaque round | tout le monde |
| 0:35 | Remplir la fiche de mesure du combat 1 ; remettre le plateau en place | tout le monde |
| 0:45 | **Combat 2, ordre d'initiative** : chacun lance d20 + DEX ; deux héros qui se suivent dans l'ordre partagent leur tour. Chronométrer chaque round | tout le monde |
| 1:10 | Fiche du combat 2, puis chacun note les deux combats et répond aux quatre questions | tout le monde |
| 1:20 | Coller la fiche remplie dans la session de lancement avec Claude | l'organisateur |

- **Qui joue quoi :** l'organisateur joue les ennemis ; les quatre héros sont répartis entre les autres. À trois joueurs, l'un joue deux héros.
- **En ligne :** une table virtuelle gratuite dans le navigateur, comme Owlbear Rodeo (grille, pions et dés intégrés), ou un tableau Excalidraw partagé et une appli de dés, sur un appel Discord. **Autour d'une table :** papier quadrillé, pièces de monnaie comme pions, vrais dés.
- **Dés pour chacun :** d20, d4, d6, d8.

## Les règles en 10 minutes
**Un tour :** se déplacer de 5 cases maximum, puis une **action** et une **action bonus**, dans l'ordre qu'on veut. Les **réactions** ne viennent que des capacités qui le disent.

**Une attaque touche toujours ; le d20 dit à quel point** (on ajoute le modificateur de la caractéristique) :
| d20 + modif. | Résultat | Dégâts |
|---|---|---|
| 1 naturel | **Raté comique** : aucun dégât, lancer sur la table des ratés | 0 |
| 2–9 | **Éraflure** | moitié |
| 10–19 | **Touché** | plein |
| 20 naturel | **Critique** | double |

- **Avantage** (deux d20, on garde le meilleur) : un allié de l'autre côté de la cible (prise en tenaille), une cible À terre, ou une préparation d'un coéquipier.
- **Désavantage** (deux d20, on garde le pire) : attaquer depuis une surface glissante, ou en étant Gelé.
- **Ennemis coriaces** (brute, chef) : l'éraflure va de 2 à 12.

**Les états :**
| État | Effet | Exploité par |
|---|---|---|
| Trempé | éteint la Brûlure | la foudre fait double |
| Huilé | | le feu fait double et enflamme |
| Brûlure | 5 dégâts au début de son tour, pendant 2 tours | |
| Gelé | −2 cases de déplacement, désavantage aux attaques | une poussée l'envoie 2 cases plus loin |
| À terre | dépense la moitié de son déplacement pour se relever | les attaques contre lui ont l'avantage |

**Les surfaces** (3 rounds) :
| Surface | Effet | Devient |
|---|---|---|
| Huile | Huilé en entrant | le feu la change en Feu |
| Eau | Trempé en entrant | la foudre l'électrise (8 dégâts à tous dedans) ; le froid la change en Glace |
| Feu | 6 dégâts en entrant ou en finissant son tour dedans, Brûlure | l'eau l'éteint |
| Glace | glissante : en entrant, d20, À terre sur 1–9 ; une cible poussée glisse jusqu'à heurter quelque chose | le feu la change en Eau |

**Pousser** (action bonus, au contact) : 2 cases. Contre un mur ou une créature : +8 dégâts. Dans le vide : un sbire est éliminé, les plus gros prennent 20.

**Tomber et relever :** à 0 PV un héros est À terre et hors jeu. Un coéquipier au contact dépense son action pour le relever à 25 PV. Le combat est perdu si les quatre héros tombent en même temps. **Potion** : action bonus, 20 PV ; chaque héros en a une pour ce test.

## La salle (10 × 8 cases)
```
  A B C D E F G H I J
1 # # # # # # # # # #
2 # . . . . o . . . #      # mur       . sol
3 # . . w w . . a . #      o tonneau d'huile (touché ou poussé : Huile sur 3x3)
4 1 . . w w . . g L #      w eau
5 2 . . . . . . g B #      _ corniche (la ligne 8 tombe dans le vide)
6 3 . . . o . . a . #      1-4 départ des héros
7 4 . . . . . . g . #      g sbire  a archer  B brute  L chef
8 _ _ _ _ _ _ _ _ _ _
```
**Objectif : vaincre tous les ennemis**, le chef compris.

## Les héros de test (niveau 1, faits avec `CLASS_TEMPLATE.fr.md` ; uniquement pour ce test)
Chacun créera sa propre classe ; celles-ci servent à tester les règles maintenant. Les mouvements d'équipe arrivent au niveau 6, donc ils ne sont pas dans ce test.

**Brute** : tank, particularité : lance les ennemis · Rage (+10 par coup donné ou reçu, max 50) · **145 PV**, 5 cases
- FOR 15 (+2), DEX 10, CON 15 (+2), INT 8, SAG 11, CHA 12
- Fracas (de base, action) : 8 + d4 + 2, au contact.
- Projection (préparation, bonus) : pousse une cible au contact de 3 cases ; À terre si elle heurte un mur ou une créature. 20 Rage : 5 cases.
- Provocation (réaction) : quand un ennemi attaque un allié à côté de toi, il t'attaque à la place.
- Faiblesse : l'état Gelé dure deux fois plus longtemps sur toi, et tu n'as aucune attaque à distance.

**Mage des tempêtes** : dégâts, particularité : contrôle l'eau · Mana (40, +5 par tour) · **125 PV**, 5 cases
- FOR 8, DEX 13, CON 14 (+2), INT 15 (+2), SAG 10, CHA 12
- Étincelle (de base, action) : 8 + d4 + 2, portée 6.
- Éclaboussure (préparation, action, 10 Mana) : une zone 2x2 d'Eau à 5 cases ou moins ; tous ceux dedans sont Trempés.
- Foudre (exploitation, action, 15 Mana) : 14 + d6 + 2, portée 6 ; double sur Trempé ; électrise l'Eau.
- Faiblesse : prend double dégâts quand il se tient dans l'Eau.

**Voleur** : contrôle, particularité : prépare le coup final · Concentration (+1 par préparation utilisée par un coéquipier, max 3) · **115 PV**, 6 cases
- FOR 8, DEX 15 (+2), CON 13 (+1), INT 12, SAG 10, CHA 12
- Flèche de feu (de base, action) : 8 + d4 + 2, portée 8 ; enflamme l'Huile.
- Fiole d'huile (préparation, bonus) : une zone 2x2 d'Huile à 4 cases ou moins, ou Huilé sur une cible.
- Ouverture (exploitation, action) : 8 + d4 + 2, au contact ; la cible est À terre. 2 Concentration : c'est un Critique.
- Faiblesse : prend double dégâts de Feu, y compris le sien.

**Gardien** : soutien, particularité : gèle le sol · Foi (+1 par soin ou protection, max 3) · **140 PV**, 5 cases
- FOR 12 (+1), DEX 10, CON 14 (+2), INT 10, SAG 15 (+2), CHA 11
- Coup de bâton (de base, action) : 8 + d4 + 1, au contact.
- Soin (soin, action) : 15 + d6 + 2 à un allié à 6 cases ou moins.
- Garde de givre (préparation, action) : une zone 2x2 de Glace, ou change l'Eau en Glace ; les ennemis dessus sont Gelés. 3 Foi : zone 3x3.
- Faiblesse : ne peut pas se soigner lui-même.

## Les ennemis (ils suivent leurs habitudes ; leurs intentions sont cachées)
| Ennemi | PV | Attaque | Habitude |
|---|---|---|---|
| Sbire × 3 | 30 | 8 + d4, au contact | attaque le héros le plus proche |
| Archer × 2 | 25 | 8 + d4, portée 8 | reste à 4 cases ; tire sur le héros le plus proche qu'il voit |
| Brute (coriace) | 60 | 14 + d6, au contact, pousse | charge le héros le plus blessé, en part de ses PV (PV ÷ PV max ; à égalité, le plus proche) |
| Chef (coriace) | 90 | tours 1–2 : donne l'avantage à tous les ennemis ; tour 3 : 22 + d8 sur une zone 3x3 | recommence |

Les ennemis lancent la même table de d20 que les héros, avec +2.

## Table des ratés (d6 sur un 1 naturel ; jamais pire que perdre son tour)
1. Ton arme t'échappe : l'action bonus sert à la ramasser.
2. Tu glisses : À terre.
3. Cri de guerre épique, rien ne se passe : l'ennemi le plus proche se moque de toi.
4. Tu heurtes un tonneau ou une flaque : ça se renverse sur ta case.
5. Tu trébuches sur un allié : vous bougez tous les deux d'1 case, sans dégâts.
6. Tu prends la pose : la prochaine attaque contre toi a l'avantage.

## La fiche de mesure
| Mesure | Tour d'équipe | Ordre d'initiative |
|---|---|---|
| Durée de chaque round complet (min) | | |
| Nombre de rounds pour gagner, et durée totale | | |
| Combos entre deux joueurs (nombre) | | |
| Héros tombés / relevés | | |
| Un seul jet a-t-il décidé du combat ? (oui/non, lequel) | | |
| Part des dégâts du meilleur héros (%) | | |
| Fun à quatre, note de chaque joueur sur 10 | | |
| Ce qui a semblé lent | | |

**Les quatre questions pour chaque joueur à la fin :**
1. Quel mode tu jouerais tous les soirs, et pourquoi ?
2. Quel a été le meilleur moment, et était-ce un combo ?
3. Quand est-ce que tu t'es ennuyé, et combien de temps ?
4. Une règle que tu changerais.
