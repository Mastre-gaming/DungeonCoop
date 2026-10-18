# UI de combat : les maquettes

Une proposition pour revoir l'interface du combat, à partir des trois rumeurs de la taverne :
[#83](https://github.com/Mastre-gaming/DungeonCoop/issues/83) (un zoom plus fin),
[#84](https://github.com/Mastre-gaming/DungeonCoop/issues/84) (accélérer ou passer le texte) et
[#85](https://github.com/Mastre-gaming/DungeonCoop/issues/85) (voir ce que fait une attaque).
Ce sont des maquettes : rien ne change dans le jeu. Avant de construire, chaque rumeur doit recevoir un « oui maintenant » de la personne responsable de son aspect, puis devenir une mission.

Tout est fait avec les assets LPC du jeu : les sprites du terrain d'entraînement (importés avec `lpc-sprite-mods`), les tuiles d'herbe et d'eau, le tonneau, le feu de camp, la sentinelle et l'enseigne vierge des décorations médiévales. Les polices sont celles du jeu : Pixelify Sans, et Source Sans 3 pour quelques textes longs.

## Les planches
| Capture | Page | Ce qu'elle montre |
|---|---|---|
| `captures/main.png` | `maquettes/main.html` | l'écran de combat revu, avec les trois rumeurs ensemble |
| `captures/capacite.png` | `maquettes/capacite.html` | #85 : le bouton, la fiche de la capacité sans cible, la carte de la cible visée, les effets autour |
| `captures/zoom.png` | `maquettes/zoom.html` | #83 : la même scène à 2×, au demi-cran 2,5× et en vue de toute la salle, avec le réglage |
| `captures/dialogue.png` | `maquettes/dialogue.html` | #84 : la boîte de dialogue, « tout afficher », la vitesse du texte, « tout passer » |
| `captures/boutons.png` | `maquettes/boutons.html` | cinq directions pour les boutons (bois, parchemin et sceau, pierre runique, cases d'action, enseignes suspendues) |
| `captures/icones.png` | `maquettes/icones.html` | les icônes des 31 capacités, classe par classe |

Les pages s'ouvrent dans un navigateur, sans rien installer. La version de travail, sur laquelle on peut commenter et déplacer les éléments, est un canevas Claude ; DonBabaa peut le partager.

## Ce qui est déjà décidé dans ces maquettes
- La fiche, la carte de la cible et la barre des capacités sont en **bois sombre** : dégradé brun foncé, double filet de bois, cases d'encoche noires. Le parchemin clair est trop clair pour le combat.
- Tout le texte de l'interface est en **Pixelify Sans**. Les étiquettes sont des tampons carrés, jamais des pastilles arrondies.
- Une **couleur par sens** : or pour le choisi et le critique, vert pour le touché, ambre pour l'éraflure, rouge pour le raté, bleu pour un bonus, rouge brûlé pour le feu, violet sombre pour l'huile et les combos.
- Sur les cartes des héros, PV et ressource tiennent **sur une seule ligne**.

## Les icônes
`icones/` : 25 PNG de 24 × 26 px, au format des enseignes du pack. Le fond est l'enseigne vierge de « [LPC] Hanging signs », telle quelle. Le symbole est peint avec des rampes à 3 tons (lumière en haut, ombre en bas, contour sombre) et posé sur l'axe du panneau : x = 11,5 (entre les chaînes), rangée 15 sous la poutre. Comme l'axe tombe entre deux pixels, chaque symbole a une largeur paire (10 à 14 px) ; le générateur refuse une largeur impaire. Les variantes (Projection furieuse, Ouverture critique, Fiole sur une cible, Grand givre) gardent l'icône de base avec un tampon doré.

Pour changer une icône : modifier sa grille dans `icones/outil/icones.mjs` (une lettre par couleur, la légende est en tête du fichier), puis lancer, depuis `icones/outil/` :

```
node icones.mjs enseigne-a0.png ..
```

`icones/_planche.png` montre toutes les icônes à 4× pour les comparer.

## À trancher
- Le style des boutons : une des cinq directions, ou un mélange.
- Le zoom en demi-crans floute un peu le pixel art : seulement en combat ?
- Les autres plaques de l'écran (bandeau, zoom, cartes des héros, journal) passent-elles aussi au bois sombre ?
