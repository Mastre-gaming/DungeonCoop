# Le design du camp : pièces, outils, plans, démo

Tout ce qui a servi à dessiner le camp le 18 oct. Le concept et les décisions sont dans `../../CAMP.fr.md` ; ici, ce sont les fichiers.

| Dossier | Ce qu'il y a |
|---|---|
| `pieces/` | les images prêtes à l'emploi : découpes LPC, le panneau-carte dessiné à la main, les deux personnages réduits à leurs animations utiles, les 5 niveaux du premier tableau d'affichage |
| `outils/` | les scripts qui fabriquent `pieces/` à partir des planches LPC brutes (`dl/lpc/`), en Python sans dépendance |
| `plans/` | les trois plans du camp en blockout (A le carré, B le chemin, C les clairières, retenu), le script qui les dessine et celui qui les vérifie |
| `demo/` | la page de démonstration (un seul fichier, `camp.html`) : la première connexion, la sentinelle, le héros, le panneau-carte avec ses étoiles, le tableau des missions, le feu |

## Refaire les pièces et la démo
Il faut d'abord les planches brutes dans `dl/lpc/` (la liste et les liens sont dans `CAMP.fr.md` §9 ; `dl/` n'est jamais commité).

```
cd design/camp/outils
python decouper.py          les découpes LPC et les personnages
python panneau_carte.py     le panneau-carte : son fond, la position des zones, deux exemples
python tableau_niveaux.py   les 5 niveaux du premier tableau d'affichage
cd ../demo
python construire.py        camp.html, avec equipe.json lu sur le repo du dashboard
```

Pour retrouver une pièce dans une planche : `python grille.py <planche.png> x y largeur hauteur zoom sortie.png [taille de case]` montre un morceau agrandi avec la grille et les numéros de cases.

Pour vérifier un plan : `cd plans && python plans.py && python verifier.py` (chevauchements, sentiers qui traversent un lieu, lieux dans le cadre de la caméra).

## D'où vient chaque pièce, et sa licence
Les pièces LPC restent sous leur licence d'origine : toutes demandent de créditer leurs auteurs, et les CC-BY-SA demandent que ce qu'on en tire reste sous CC-BY-SA. Quand une pièce entre dans le jeu, sa ligne va dans `CREDITS.md` avec le fichier de crédits de son pack.

| Pièce | Source | Licence |
|---|---|---|
| `feu_petit`, `buches`, `souche`, `tas_bois`, `banc`, `tabouret`, `trepied`, `chaudron`, `bannieres`, `panneaux_couverts`, `panneau_parchemins`, `potence`, `enseigne_livre`, `lanterne` | [[LPC] Medieval Village Decorations](https://opengameart.org/content/lpc-medieval-village-decorations), bluecarrot16 et al. (`CREDITS-decorations-medieval.txt` dans le zip) | CC-BY-SA 3.0 et 4.0 |
| `feu_grand` | [Camp Fire Animation for RPGs](https://opengameart.org/content/camp-fire-animation-for-rpgs-finished), Zabin et Jetrel | CC-BY-SA 3.0 |
| `herbe`, `touffes` (éclaircies), `tonneau`, `cailloux` | [LPC Base Assets](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles), Lanea Zimmerman (Sharm) et al. (`CREDITS.TXT`) | CC-BY-SA 3.0 ou GPL 3.0 |
| `heros` | [Générateur LPC](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) : la marche et la course de l'humain de base ; auteurs dans `dl/lpc/heros/credits.txt` | OGA-BY 3.0, CC-BY-SA 3.0 ou GPL 3.0 selon la pièce |
| `sentinelle` | Générateur LPC : le « sort » et la marche du chevalier ; auteurs dans `dl/lpc/sentinelle/credits.txt` | OGA-BY 3.0, CC-BY-SA 3.0 ou GPL 3.0 selon la pièce |
| `carte_fond`, `carte_debut`, `carte_milieu` | **dessinés pour le jeu** (`outils/panneau_carte.py`), dans le style LPC ; seules les couleurs du bois sont relevées sur les planches LPC | les nôtres |
| `loup_sculpte` (les loups de la barre d'action, maquette du HUD) | [LPC Wolf Animation](https://opengameart.org/content/lpc-wolf-animation), le loup qui hurle (`howl_0.png`) de Stephen « Redshrike » Challener, commandé par William.Thompsonj ; repeint en bois et laiton par `outils/loup_sculpte.mjs` | au choix CC-BY 4.0 / 3.0, OGA-BY 3.0, GPL 2.0 / 3.0 : on le prend sous CC-BY 3.0 |
| `tab_n0` à `tab_n4` | compositions de pièces LPC ci-dessus (décorations, Base Assets) | celles de leurs pièces : CC-BY-SA |
| `objets_lieux` (lutrin, chevalet, carte dépliée, panier, globe, pots, livres, enseignes) | **dessinés pour le jeu** (`outils/objets_lieux.py`), dans le style LPC ; les trois bannières sont la bannière blanche de [LPC] Medieval Village Decorations, teinte | les objets : les nôtres ; les bannières : CC-BY-SA |
| `recits_*`, `cartes_*`, `atelier_*` (niveaux 0 à 4 et aperçus) | compositions des pièces LPC ci-dessus, de `Thatched-roof Cottage` (murs et toits), de Base Assets (portes, fenêtres) et de `objets_lieux` (`outils/lieux_niveaux.py`) | celles de leurs pièces : CC-BY-SA |
