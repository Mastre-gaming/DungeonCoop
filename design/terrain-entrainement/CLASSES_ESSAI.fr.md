# Les classes d'essai du terrain d'entraînement (mission #76)

À l'entrée du terrain d'entraînement, on choisit la classe de chacun des 4 héros. On a le choix entre les 4 héros du kit D1 (Brute, Mage, Voleur, Gardien, dans `PAPER_FIGHT_KIT.fr.md`) et les **4 classes d'essai** ci-dessous.

Ce sont des **classes d'essai, au niveau 1, pour tester les règles** : surtout le mode sans cases, où chaque classe a sa propre distance par tour. Elles sont faites au budget de `CLASS_TEMPLATE.fr.md` (27 points de caractéristiques, 10 points de classe). Les vraies classes restent celles que chacun crée (missions #30 à #33) : celles-ci peuvent servir d'exemples, ou finir à la poubelle. Leurs noms, leurs textes et leurs looks sont provisoires (l'histoire et l'apparence des héros sont à l'équipe).

Les règles du mode sans cases sont dans `FIGHT_RULES.md`, « On trial ». Une case vaut 1,5 m.

| Classe | Rôle · particularité | PV | Distance par tour | Ressource | Le combo qu'elle apporte |
|---|---|---|---|---|---|
| Éclaireuse | dégâts à distance · harcèle et entrave | 110 | **10,5 m** (la plus rapide) | Énergie | Filet (Gelé), puis Tir lesté ×2 ; la glace du Gardien gèle aussi |
| Chevalier | tank · protège les siens | 155 | **6 m** (le plus lent) | Foi | Charge au bouclier (À terre), Cri de ralliement |
| Druide | contrôle · attire et inonde | 135 | **9 m** | Mana | Liane : attire un ennemi dans le feu, l'eau, la glace ou le fossé ; Pluie : une grande flaque pour la Mage |
| Barde | soutien · donne l'avantage | 135 | **9 m** | Énergie | Chant de bataille (un allié a l'avantage), Moquerie (Exposé) |

## Éclaireuse
- **En une phrase :** elle court plus vite que tout le monde, entrave une cible de loin et la finit d'un tir lesté.
- **Caractéristiques (27 points) :** FOR 8, DEX 15 (+2), CON 13 (+1), INT 10, SAG 14 (+2), CHA 12.
- **Points de classe (10) :** déplacement 7 cases (+2 = 4 points) · Filet, une préparation (2) · Tir lesté, une exploitation (3) · 1 point restant = +5 PV. **PV : 100 + 5 (CON) + 5 = 110.**
- **Ressource :** Énergie (3 à chaque tour ; ce qui n'est pas dépensé est perdu).

| # | Nom | Sorte | Points | Coût | Portée | Ce qu'elle fait | Lien de combo | Carac. |
|---|---|---|---|---|---|---|---|---|
| 1 | Tir rapide | Attaque de base (action) | 0 | aucun | 12 m | 8 + d4 + 2 | | DEX |
| 2 | Filet | Préparation (bonus) | 2 | 2 Énergie | 7,5 m | la cible est Gelée (−3 m, désavantage) | crée Gelé | DEX |
| 3 | Tir lesté | Exploitation (action) | 3 | 1 Énergie | 12 m | 14 + d6 + 2, ×2 sur une cible Gelée | utilise Gelé | DEX |

- **Faiblesse :** un ennemi à son contact, et ses tirs ont le désavantage.
- **Le look :** une femme, bonnet de cuir à plume, tenue brune, arc recourbé.

## Chevalier
- **En une phrase :** lent et solide, il renverse ce qui s'approche et remet ses alliés debout d'un cri.
- **Caractéristiques (27 points) :** FOR 15 (+2), DEX 8 (−1), CON 15 (+2), INT 8, SAG 12 (+1), CHA 13 (+1).
- **Points de classe (10) :** déplacement 4 cases (rend 1 point) · Charge au bouclier, une préparation (2) · Cri de ralliement, un soin (3) · PV +30 (3 points, plafond 130) · 3 points restants = +15 PV. **PV : 130 + 10 (CON) + 15 = 155.**
- **Ressource :** Foi (+1 par protection : chaque Cri de ralliement).

| # | Nom | Sorte | Points | Coût | Portée | Ce qu'elle fait | Lien de combo | Carac. |
|---|---|---|---|---|---|---|---|---|
| 1 | Coup d'épée | Attaque de base (action) | 0 | aucun | contact | 8 + d4 + 2 | | FOR |
| 2 | Charge au bouclier | Préparation (bonus) | 2 | aucun | contact | pousse de 3 m ; s'il heurte quelque chose, +8 et À terre | crée À terre, poussée | FOR |
| 3 | Cri de ralliement | Soin (action) | 3 | aucun | 4,5 m autour de lui | +10 PV à chaque allié (lui compris), sans jet | | CHA |

- **Faiblesse :** lent (6 m), et la glace le renverse à coup sûr, sans jet.
- **Le look :** armure de plaques, grand heaume, cape bleue, épée et bouclier à croix.

## Druide
- **En une phrase :** il ne frappe pas fort, mais il décide où se tient l'ennemi.
- **Caractéristiques (27 points) :** FOR 8, DEX 10, CON 12 (+1), INT 13 (+1), SAG 15 (+2), CHA 14 (+2).
- **Points de classe (10) :** déplacement 6 cases (2) · Liane, une préparation (2) · Pluie, une préparation (2) renforcée en grande zone (+1) · PV +30 (3, plafond 130). **PV : 130 + 5 (CON) = 135.**
- **Ressource :** Mana (40 par combat, +5 à chaque tour).

| # | Nom | Sorte | Points | Coût | Portée | Ce qu'elle fait | Lien de combo | Carac. |
|---|---|---|---|---|---|---|---|---|
| 1 | Fouet de ronce | Attaque de base (action) | 0 | aucun | 4,5 m | 8 + d4 + 2 | | SAG |
| 2 | Liane | Préparation (bonus) | 2 | aucun | 7,5 m | attire un ennemi de 3 m vers lui | placement : dans le feu, l'eau, la glace, le fossé | SAG |
| 3 | Pluie | Préparation (action) | 2 + 1 | 15 Mana | 9 m | une flaque d'eau de 2,5 m de rayon ; ceux dedans sont Trempés | crée Eau, Trempé | SAG |

- **Faiblesse :** la foudre lui fait double dégâts, même l'eau électrisée. Il doit donc sortir de sa propre pluie avant la Foudre de la Mage.
- **Le look :** un vieil homme à barbe blanche, tenue verte, sandales, bâton à boucle.

## Barde
- **En une phrase :** elle ne gagne pas les combats seule ; elle fait gagner les autres.
- **Caractéristiques (27 points) :** FOR 8, DEX 15 (+2), CON 12 (+1), INT 11, SAG 10, CHA 15 (+2).
- **Points de classe (10) :** déplacement 6 cases (2) · Chant de bataille, un bonus (3) · Moquerie, une préparation (2) · 3 points restants = PV +30 (plafond 130). **PV : 130 + 5 (CON) = 135.**
- **Ressource :** Énergie (3 à chaque tour ; ce qui n'est pas dépensé est perdu).

| # | Nom | Sorte | Points | Coût | Portée | Ce qu'elle fait | Lien de combo | Carac. |
|---|---|---|---|---|---|---|---|---|
| 1 | Dague | Attaque de base (action) | 0 | aucun | contact | 8 + d4 + 2 | | DEX |
| 2 | Chant de bataille | Bonus (bonus) | 3 | 1 Énergie | 9 m | un allié a l'avantage à sa prochaine attaque | compte comme un combo quand l'allié frappe | CHA |
| 3 | Moquerie | Préparation (bonus) | 2 | 2 Énergie | 9 m | un ennemi est Exposé : la prochaine attaque contre lui a l'avantage | crée Exposé | CHA |

- **Faiblesse :** fragile, chaque coup reçu au contact lui fait 3 dégâts de plus.
- **Le look :** une femme, chapeau à plume rouge, chemise rouge, pantalon noir, dague.

## Ce qui reste à décider (par l'équipe)
- Les sous-classes et les niveaux suivants ne sont pas écrits : ces classes ne servent qu'au niveau 1, pour tester.
- Si l'une d'elles plaît, son créateur la reprend dans sa propre fiche (#30 à #33) et en devient le responsable.
