# Shadow : la planche et les animations

La fiche de la classe est `content/classes/shadow.json` (par FrapsFTW). Ce dossier fait sa planche LPC (`public/assets/lpc/entrainement/shadow.png`) et montre ce qu'il fait.

Un homme du désert, venu de très loin : chèche et écharpe indigo sur le bas du visage, robe et cape couleur sable, sandales, des yeux violets, une dague à la main et une deuxième, courbe, en travers du dos. Tout ce qui vient de lui est encre et violet ; ce qui touche reste blanc.

## Ce qu'on voit
| Quoi | Où |
|---|---|
| Debout, de face, de gauche, de dos et de droite | `captures/shadow-tour.png` |
| Sa marche, son estoc, sa taille | `captures/shadow-marche.gif`, `shadow-estoc.gif`, `shadow-taille.gif` |
| Le visage de près (×6) | `captures/visage-face.png` |
| Ses trois capacités : Dague, Pas dans l'ombre, Coup dans le dos | `captures/dague.gif`, `pas-ombre.gif`, `coup-dos.gif` |
| En montant : Mirage et Lame de minuit (niveau 3), Marteau et enclume avec le Gardien (niveau 6), Mille ombres (niveau 20) | `captures/mirage.gif`, `lame-minuit.gif`, `marteau-enclume.gif`, `mille-ombres.gif` |
| Ses trois icônes, sur l'enseigne des capacités du combat | `icones/enseigne-*.png` |

Les animations sont des esquisses, au niveau des briques de `design/animations/` : elles disent ce qu'on doit voir.

## Au terrain d'entraînement (#198)
Shadow se choisit à l'entrée du terrain, à côté des classes d'essai. Ses règles sont dans `src/entrainement/regles.js` (`HEROS.shadow`, et `pasOmbre`, `coupDos`, `coupDos3` dans `CAPACITES`), au budget de `CLASS_TEMPLATE.fr.md` :

| | |
|---|---|
| PV, déplacement | 120 PV (100 + 10 de CON + 10 des 2 points restants), 9 m par tour (6 cases) |
| Élan | +1 par case parcourue (1,5 m), le Pas compris ; 5 au plus ; retombe à 0 s'il finit son tour sans bouger |
| Dague | au contact, 8 + d4 + 2 |
| Pas dans l'ombre (bonus) | jusqu'à 7,5 m : il ressort derrière un ennemi qu'un allié serre (à 4,5 m au plus, pas forcément collé), à l'opposé de cet allié. Il pose la Tenaille sur la cible jusqu'à la fin du round : elle compte pour ses coups à lui. Grisé tant qu'aucun ennemi n'est serré. Le trajet donne de l'Élan |
| Coup dans le dos (action) | au contact, 14 + d6 + 2, ×2 sur une cible en Tenaille ou Exposée ; l'allié qui tient la cible fait un combo avec lui |
| Coup dans le dos critique | le même, critique assuré, pour 3 Élan |
| Faiblesse | Brûlant, ou debout dans le feu : plus de Pas dans l'ombre |

En jeu, le Pas joue une plongée dans son ombre (il s'enfonce, puis ressort derrière la cible) ; le Coup dans le dos, deux entailles croisées.

## Comment elle est faite
La base vient du générateur LPC (le lien est en tête de `public/assets/credits/entrainement-shadow.txt`) : corps d'homme au teint bronze, capuche, tunique et pantalon sable, cape sable, sandales, dague. `outil/shadow.mjs` peint le reste sur chaque image, comme une couche `lpc-sprite-mods` posée sur la tête :

- **le chèche** : le bleu vif de la capuche du générateur, foncé en indigo, par clarté ;
- **l'écharpe** : la tête sous les yeux, en indigo, avec un pli, sauf le contour ;
- **les yeux** : l'iris LPC passe au violet ;
- **la deuxième dague** : de dos, en travers, de l'épaule à la hanche (lame d'acier, garde dorée, poignée de cuir).

## La refaire
Depuis `outil/` :
```
node shadow.mjs <sheet.png> <bare.png> ../shadow.png
node gifs.mjs
```
`sheet.png` et `bare.png` : l'import du skill `lpc-sprite-mods` (`npm run import -- "<le lien>" --id=shadow --anchor=head`). Puis recouper `../shadow.png` aux rangées 0 à 25 (jusqu'au repos) pour `public/assets/lpc/entrainement/shadow.png`, comme les autres planches du terrain d'entraînement.

`moteur.mjs` est celui des esquisses (`design/animations/outil/`), avec deux ajouts : un personnage peut s'enfoncer dans le sol (`enfonce`, coupé à ses pieds) et devenir transparent (`alpha`).
