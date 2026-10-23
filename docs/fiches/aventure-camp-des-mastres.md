# FICHE : l'aventure « Le camp des mastres »

Note du 22 oct 2026, **donnée par le propriétaire**. Elle ne fixe que le cadre : l'histoire, les noms et les textes restent à l'équipe.

## 1. Ce qui est décidé
- L'aventure s'appelle **« Le camp des mastres »**.
- **Le sentier F en est le niveau 1** (`chemin-sentier-f.md`, validé le 22 oct ; il s'appelait « la lisière » jusqu'au 23 oct).
- Le niveau 1 est la première salle du chemin de la tour (`chemin-de-la-tour.md`, 6 salles, niveaux 1 à 6).

## 2. Ce qui reste à décider (propriétaire)
| # | Question | Ma proposition provisoire |
|---|---|---|
| 1 | L'aventure, ce sont les 6 salles du chemin, ou plus (le camp, les étages de la tour) ? | les 6 salles du chemin d'abord ; le fichier d'aventure accepte d'autres niveaux ensuite |
| 2 | Les niveaux 2 à 6 gardent-ils l'ordre du chemin (colporteur ou borne, gué, bandits ou chariot, moulin, porte) ? | oui, sans changement |

## 3. Ce que ça change dans le code
- Un fichier `content/aventures/camp-des-mastres.json` : l'identifiant, le nom (champ à l'équipe), la liste ordonnée des niveaux, chacun avec sa salle ou son événement. Au départ, un seul niveau rempli : le sentier F.
- Les salles et rencontres du sentier F sont rangées sous `camp-des-mastres/` (`sentier-f-a`, `-b`, `-c`).
- Le socle (salle en JSON, graine, Foin, Renverser, aperçu, vote) est écrit pour **n'importe quel niveau de l'aventure**, pas pour le sentier F seul.
- Tous les textes (intro, ambiance, noms à l'écran) sont des champs vides pour l'équipe.
