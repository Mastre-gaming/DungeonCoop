# Crédits

Tout ce qui est dans le jeu et qui n'a pas été fait par l'équipe, avec sa source et sa licence. Les fichiers de crédits complets des packs sont dans `public/assets/credits/` et partent en ligne avec le jeu. Les pièces sous CC-BY-SA restent sous CC-BY-SA une fois retouchées (l'herbe éclaircie, par exemple).

| Dans le jeu | Fichier | Source | Auteurs | Licence |
|---|---|---|---|---|
| Herbe, terre battue, arbres (cimes et troncs), roche, tonneau | `public/assets/lpc/grass.png`, `dirt.png`, `treetop.png`, `trunk.png`, `rock.png`, `barrel.png` | [LPC Base Assets](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles) | Lanea Zimmerman (Sharm) et les auteurs de `credits/lpc-base-assets.txt` | CC-BY-SA 3.0 ou GPL 3.0 |
| Retouche : l'herbe un peu plus claire et plus chaude | (faite au chargement, `src/02_images.js`) | d'après LPC Base Assets | l'équipe | CC-BY-SA 3.0 |
| Piquets et corde, pancartes, petit feu animé, souche (et les décorations des niveaux à venir) | `public/assets/lpc/decorations-medieval.png` | [[LPC] Medieval Village Decorations](https://opengameart.org/content/lpc-medieval-village-decorations) | bluecarrot16, Lanea Zimmerman (Sharm), Reemax et 17 autres (`credits/decorations-medieval.txt`) | CC-BY-SA 3.0 et 4.0 |
| Le grand feu animé (taille 2 et plus) | `public/assets/lpc/CampFireFinished.png` | [Camp Fire Animation for RPGs](https://opengameart.org/content/camp-fire-animation-for-rpgs-finished) | Zabin, Jetrel | CC-BY-SA 3.0 |
| Le héros de départ | `public/assets/lpc/heros.png` | [Universal LPC Spritesheet Character Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) | une liste par pièce dans `credits/heros.txt` (bluecarrot16, JaidynReiman, Eliza Wyatt, Redshrike…) | OGA-BY 3.0, CC-BY-SA 3.0 ou GPL 3.0 selon la pièce |
| La sentinelle | `public/assets/lpc/sentinelle.png` | même générateur | une liste par pièce dans `credits/sentinelle.txt` | OGA-BY 3.0, CC-BY-SA 3.0 ou GPL 3.0 selon la pièce |
| Les rats des PR à résoudre (rat gris aux yeux rouges, rat vert recolorié, souris ; marche et morsure) | `public/assets/lpc/rats.png` | « Rodents (Rat Rework) » sur OpenGameArt (lien à ajouter), assemblé et recolorié par `design/camp/outils/rats.py` | Tuomo Untinen (Reemax), Jordan Irwin (AntumDeluge) | CC-BY 3.0 |
| Le panneau-carte du tableau d'affichage | `public/assets/lpc/panneau_carte.png` | dessiné pixel par pixel pour le camp (session de design du 18 oct), rampe de bois prise sur les planches LPC | l'équipe | CC-BY-SA 3.0 (comme les planches dont il prend les couleurs) |
| La boîte aux lettres du camp | `public/assets/lpc/boite_lettres.png` | dessinée pixel par pixel pour le camp (design/camp/outils/boite_lettres.py), rampe de bois prise sur les planches LPC | l'équipe | CC-BY-SA 3.0 (comme les planches dont elle prend les couleurs) |

Moteur : [three.js](https://threejs.org) 0.186.1 (MIT). Jeu à plusieurs : [PeerJS](https://peerjs.com) 1.5.5 (MIT), par son service public de mise en relation. Outils : [Vite](https://vite.dev) (MIT), [Wrangler](https://github.com/cloudflare/workers-sdk) (MIT ou Apache 2.0).

Un écran de crédits dans le jeu reste à faire (question ouverte de `CAMP.fr.md` §10).
