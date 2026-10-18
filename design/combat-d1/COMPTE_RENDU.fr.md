# Compte rendu : le combat D1 (18 oct. 2026)

Mission [#25](https://github.com/Mastre-gaming/DungeonCoop/issues/25) · axe combats · la suite, c'est [#26](https://github.com/Mastre-gaming/DungeonCoop/issues/26) : décider, d'après ce combat, du mode de tour, des PV et de la durée d'un combat.

## En bref
- On a joué le combat de `PAPER_FIGHT_KIT.fr.md` en **tour d'équipe**, dans une version jouable sur ordinateur, avec les mêmes règles, la même salle et les mêmes héros que le kit papier. Les ennemis jouent seuls.
- **Victoire au round 5, en 8 min 53.** 4 combos entre héros. « Fun » : **9/10**.
- Après le premier round, passé à apprendre l'outil, **la phase des héros dure 39 s en moyenne**. L'objectif de 4 min 30 par round tient largement.
- **Le Voleur a fait 68 % des dégâts** (le plafond est de 40 %). C'est le problème n° 1 à régler.
- **Pas encore joué : l'ordre d'initiative.** La comparaison des deux modes reste à faire.

## Ce qui a été fait pendant la session
1. Les trois repos de Mastre-gaming ont été récupérés et relus. Pour les classes, les règles de création existent (`CLASS_TEMPLATE.fr.md`), mais aucun ami n'a encore rempli la sienne. L'axe 3 attendait justement D1.
2. On a gardé **4 héros**, comme décidé dans le KICKOFF. À 2 ou 3 joueurs, certains en jouent deux.
3. **Un plateau Excalidraw** (`salle-D1.excalidraw`) contient la salle 10 × 8, les pions, les tuiles de surface, les marqueurs d'état et les fiches avec les dégâts déjà calculés. Il sert pour jouer à la main sur Excalidraw.
4. **La Salle d'essai** (`salle-d1.html`) est le combat du kit, jouable :
   - les ennemis suivent leur habitude tout seuls ;
   - les dés, les dégâts, les états, les surfaces, les poussées et la corniche sont calculés ;
   - au survol d'une cible, elle montre les chances de chaque résultat et les dégâts ;
   - le chrono de la phase des héros, les combos, la part des dégâts et les KO sont mesurés tout seuls.
5. **Une partie a été jouée** et la fiche de mesure remplie (ci-dessous).

## La fiche de mesure
| Mesure | Tour d'équipe | Ordre d'initiative |
|---|---|---|
| Phase des héros, par round | R1 5:57 · R2 1:20 · R3 0:29 · R4 0:38 · R5 0:07 | pas joué |
| Rounds pour gagner, durée totale | 5 rounds, 8 min 53 | |
| Combos entre deux héros | 4 : R2 Voleur → Brute (poussé dans le feu) · R3 Mage → Gardien (eau gelée) · R4 Gardien → Brute (poussé dans la glace) · R4 Voleur → Brute (poussé dans le feu) | |
| Héros KO / relevés | 2 KO (Voleur au R2, Brute au R4) / 1 relevé | |
| Un seul jet a-t-il décidé ? | « je n'ai pas vu mes jets, donc je ne saurais trop dire » | |
| Part des dégâts du meilleur héros | Voleur 68 % (100 sur 147) · Mage 18 % · Gardien 10 % · Brute 4 % | |
| Fun, sur 10 | 9, note de DonBabaa (« alors que c'était même pas un vrai playtest avec de vrais assets graphiques ») | |
| Ce qui a semblé lent | rien de signalé ; le R1 a pris 6 min (prise en main) | |

La phase des ennemis n'est pas chronométrée. Dans le jeu, elle sera automatique, comme ici.

## Le feedback de DonBabaa après la partie
La fiche complète, telle qu'il l'a envoyée, est en annexe.
- **Trop de déplacement :** « on avait trop de déplacements allowed », « on pouvait vraiment aller n'importe où sur la map ».
- **Marcher sur l'eau :** « on pouvait être sur l'eau, ça ne devrait pas arriver ». Le kit dit pourtant « Trempé en entrant » : l'eau y est une flaque, où l'on marche.
- **La victoire :** « je ne pense pas qu'il faille uniquement battre le boss pour gagner ».
- **Les dés :** on ne voit pas assez ses propres jets. Ils ne sont écrits que dans le journal.

## Ce qu'on en tire (à trancher dans #26)
| Sujet | Ce qu'on a vu | Proposition à discuter |
|---|---|---|
| Déplacement | 5 cases, avec la diagonale à 1 case, couvrent la moitié d'une salle de 10 × 8 | 4 cases, ou la diagonale qui coûte 1 puis 2 en alternance (variante D&D), ou une salle plus grande |
| L'eau | la flaque se traverse | séparer **eau profonde** (décor, infranchissable) et **flaque** (surface créée par un sort, qui se traverse) |
| Conditions de victoire | le kit n'utilise que « vaincre le chef » | `FIGHT_RULES.md` prévoit déjà trois objectifs : tout vaincre, vaincre le chef, atteindre ou protéger. Les essayer dans les salles de l'axe 5 |
| Le Voleur porte l'équipe | son feu double sur une cible Huilée, et la Brûlure et le feu au sol lui sont comptés | baisser le feu (pas de ×2 cumulé avec la Brûlure), ou compter la Brûlure à moitié pour chacun des deux héros du combo |
| Voir ses dés | les jets ne s'affichent que dans le journal | afficher le d20 en grand sur le plateau à chaque attaque (axe menus) |
| Durée | 39 s par phase des héros, après la prise en main | l'objectif de 4 min 30 par round tient ; on peut se permettre plus d'ennemis ou des combats plus longs |
| Mode de tour | seul le tour d'équipe a été joué | jouer un combat en ordre d'initiative avant de trancher (la Salle d'essai le propose au démarrage) |

**Défauts de la Salle d'essai vus pendant la partie** (à corriger si on la réutilise) :
- le chef reste dans le feu pendant ses tours d'ordres (il ne bouge que pour frapper) ;
- une poussée bloquée dès le départ s'écrit « pousse de 0 case » ;
- les dés ne s'affichent pas sur le plateau.

## Règles tranchées pour ce test
Le kit ne les disait pas. Elles sont aussi listées en bas de la Salle d'essai.
- À 0 PV, un héros est **KO**. « À terre » ne désigne que l'état, parce que le kit utilisait le même mot pour les deux.
- Soins, poussées, surfaces et préparations : pas de d20. Seules les attaques à dégâts en lancent un.
- L'effet d'une attaque s'applique sur une éraflure, un touché ou un critique ; pas sur un raté.
- Les doubles se cumulent : Foudre sur Trempé avec un critique, c'est ×4.
- Tonneau touché ou poussé : Huile en 3 × 3. Avec la Flèche de feu, l'huile s'enflamme aussitôt.
- Diagonale = 1 case ; on ne coupe pas le coin d'un mur ; on traverse ses alliés, pas ses ennemis.
- Trempé et Huilé : 3 rounds. Brûlure : 2 tours. Gelé : jusqu'à la fin du prochain tour de la cible.
- Garde de givre : portée 5. L'eau gèle ; le feu devient de l'eau.
- Provocation : automatique, une fois par round. Prise en tenaille : au contact seulement.
- Le chef frappe une zone 3 × 3 à 6 cases au plus, sans toucher ses alliés. Ses ordres donnent l'avantage aux ennemis jusqu'à sa frappe.
- Les ennemis évitent le feu et la glace quand ils le peuvent. Un héros relevé rejoue au tour suivant.

## Rejouer
- **Partie partagée en direct :** https://claude.ai/artifact/TEAd5RvcvYYAukJsWYeYS1. Elle est privée : demande à DonBabaa de te la partager, en Éditeur pour jouer, en Lecteur pour regarder.
- **Sans compte :** ouvre `design/combat-d1/salle-d1.html` dans ton navigateur (double-clic). La partie reste sur ta machine.
- **À la main :** ouvre `salle-D1.excalidraw` sur excalidraw.com (menu ☰ → Ouvrir), puis *Partager* → *Démarrer la session*.

## Pour prendre la suite
1. **#26 : trancher.** Jouer d'abord un combat en ordre d'initiative dans la Salle d'essai. Ensuite, décider du mode de tour, des PV et de la durée d'un combat, en traitant les sujets du tableau ci-dessus. Mettre à jour `FIGHT_RULES.md`, `CORE_LOOP.md` et `GAME_SPEC.md`.
2. **Axe 3 : les classes.** C'est maintenant débloqué. Chacun remplit sa fiche (`CLASS_TEMPLATE.fr.md`, missions #30 à #33). Les chiffres peuvent encore bouger après #26.
3. **#27 : la grille des combos.** Les 4 combos de ce combat sont un point de départ : Huile + feu, Eau + givre, poussée dans une surface.
4. **#14 : le terrain d'entraînement.** La Salle d'essai peut servir de base pour ses défis.

## Les fichiers
| Fichier | Quoi |
|---|---|
| `design/combat-d1/salle-d1.html` | la Salle d'essai (une page, rien à installer) |
| `design/combat-d1/salle-D1.excalidraw` | le plateau à jouer à la main |
| `design/combat-d1/COMPTE_RENDU.fr.md` | ce compte rendu |

## Annexe : la fiche envoyée par DonBabaa après la partie
Copiée telle quelle depuis le bouton « Copier la fiche » de la Salle d'essai.

```
D1 · Salle d'essai · mode : tour d'équipe
Résultat : victoire au round 5, durée 8:53
Phase des héros par round : R1 5:57 · R2 1:20 · R3 0:29 · R4 0:38 · R5 0:07 (moyenne 1:42)
Combos entre héros : 4 (R2 Voleur → Brute : poussé dans le feu ; R3 Mage → Gardien : eau gelée ; R4 Gardien → Brute : poussé dans la glace ; R4 Voleur → Brute : poussé dans le feu)
Prises en tenaille : 1
Dégâts : Brute 6 (4 %) · Mage 27 (18 %) · Voleur 100 (68 %) · Gardien 14 (10 %)
Héros KO : 2 · relevés : 1
Un seul jet a décidé du combat ? je n'ai pas vu mes jets, donc je ne saurais trop dire
Notes « fun » sur 10 : franchement un bon 9 alors que c'était meme pas un vrai playteste avec de vrais assets graphiques. Par contre je ne pense pas qu'il faille unqiquement battre le boss pour gagner
Moment d'ennui : non, par contre j'ai vu qu'on pouvait etre sur l'eau, ca ne devrait pas arriver
Une règle à changer : pas possible d'aller sur l'eau, et au niveayu des deplacements j'avais l'impresisobn qu'on pouvait vraiment aller n'importe ou sur la map,
Quel mode tous les soirs, et pourquoi : N/A
Questions de règle tranchées : je trouve qu'on avait trop de déplacements allowed.
```
