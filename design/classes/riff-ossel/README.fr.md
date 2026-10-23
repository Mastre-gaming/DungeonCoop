# Riff Ossel

La classe de DonBabaa. La fiche qui entre dans le jeu : `content/classes/riff-ossel.json`. Design en cours : les chiffres sont des premiers jets pour le terrain d'entraînement.

Un squelette rockeur à l'afro énorme (clin d'œil à Brook, de One Piece, pour la silhouette ; le nom, la tenue et la palette sont à nous) qui joue la bataille de très loin avec une guitare-hache. Un **soutien offensif** : il tire, soigne, accélère les alliés et les fait frapper plus fort. Le thème est le hard rock.

## Pourquoi cette classe
L'équipe (Baba tank, Shadow dégâts, le Traqueur contrôle, Mope dégâts) est presque toute au contact, n'a qu'un seul tireur et n'a pas de vrai soigneur (le limier, à 30 PV, est une cible). Les combos y tournent autour de **À terre, Exposé, Tenaille, attirer et poussée**, pas des éléments : Riff Ossel les nourrit sans en dépendre.

## La fiche
- **Rôle :** soutien. **Particularité :** soutien offensif à distance. **Archétype :** Support.
- **Caractéristiques (27 points) :** FOR 8, DEX 14, CON 12, INT 11, SAG 12, CHA 15. DEX pour ses tirs, CHA pour ses riffs de soutien, SAG pour la Ballade.
- **PV de base 100 + 5 (CON) + 5 (1 point restant) = 110, déplacement 6 cases (9 m).** 9 points de classe sur 10.
- **Ressource : le Rythme** (accepté par le groupe). +1 à chaque attaque d'un allié, 4 au plus ; il se vide si aucun allié n'attaque pendant un tour complet ; il commence le combat à 1. Seul, il est faible ; plus l'équipe frappe, plus il joue fort.
- **Faiblesse : Os fragiles.** Les dégâts de poussée, de mur et de chute lui font ×2 (la Brute ennemie, les falaises du terrain).

## Les capacités
| # | Nom | Niveau | Sorte | Coût | Ce qu'elle fait | Combo |
|---|---|---|---|---|---|---|
| 1 | **Riff** | départ | attaque de base, action, 9 m | gratuit | 8 + d4 + DEX. **Au contact d'un ennemi, c'est le même coup, donné à la hache** (il tient alors la guitare comme une hache) : il a une attaque d'opportunité | utilise À terre et Exposé |
| 2 | **Ballade** | départ | soutien, action, 9 m | relever : 2 Rythme, une fois par combat | soin 8 + d4 + SAG et retire un état (Brûlure, Gelé, Huilé) ; relève à distance un allié K.O. à 25 PV | |
| 3 | **Course effrénée** | départ | préparation, action bonus, 9 m | 1 Rythme | un allié gagne 3 m de déplacement et peut s'éloigner d'un ennemi sans attaque d'opportunité | crée Mobilité |
| 4 | **Power chord** | 2 | soutien, action bonus, 9 m | 1 Rythme | la prochaine attaque d'un allié fait +d6 | crée Dégâts bonus |
| 5 | **Solo de la hache** | 5 | exploitation, action, contact | 3 Rythme | coup effréné au contact : 14 + d6 + DEX, la cible est Exposée ; puis il bondit en arrière jusqu'à 4,5 m (un bond n'est pas une marche : pas d'attaque d'opportunité) | crée Exposé |
| ↑ | **Final de concert** | 9 | amélioration du Solo | | les ennemis voisins de la cible reculent d'une case ; les alliés à 3 m ont l'avantage à leur prochaine attaque | |

Le niveau 6 est le coup d'équipe (à écrire avec une autre classe). Le niveau 3 est la sous-classe :
- **Virtuose :** le Power chord touche deux alliés, le Riff traverse deux cibles alignées, le Solo coûte moins de Rythme.
- **Rockstar :** il pose un ampli au sol qui soigne ou accélère les alliés autour de lui.

## Points à vérifier
- **Hors cadre à confirmer avec Paul :** le Power chord est un soutien en **action bonus** (le cadre met les soutiens en action) ; la Ballade relève à distance (deux renforts « effet » : 5 points).
- **La part de dégâts** (barre : 40 % de l'équipe au plus) à mesurer au terrain.
- **L'ordre du tour du Solo :** il doit d'abord arriver au contact, puis frapper, puis reculer.
- **Le Rythme** (valeurs 4 au plus, départ 1, vidage) : premiers jets, à régler au terrain.

## Ce qui reste à faire pour qu'il se joue
- **Le code du terrain** (`src/entrainement/regles.js`) : la jauge Rythme, Mobilité, Dégâts bonus, la relève à distance, le bond en arrière. C'est une mission à part.
- **Le look :** le corps squelette, l'afro, les lunettes, la veste, et la guitare-hache (à dessiner avec `lpc-sprite-mods`, elle n'existe pas dans LPC). `look.base` reste vide dans la fiche tant que la planche `public/assets/lpc/entrainement/riff-ossel.png` n'existe pas, pour ne pas casser le choix du héros.

## Le look, les animations, les sons (premiers jets, 23 oct. 2026)
| Quoi | Où |
|---|---|
| Le perso de base (générateur LPC : corps et tête squelette, afro, lunettes noires, gilet ouvert rouge, pantalon noir, bottes) | `pieces/nu.png` (les planches rendues, à refaire avec `outil/rendu.mjs`), `essais/` (les rendus et aperçus) |
| La guitare-hache en V volant (peinte image par image par-dessus la planche) | `outil/concepts.py` (la forme `V2`), `outil/guitare.py`, `outil/animer.py` : deux tenues, « garde » (comme une guitare, entre les deux mains) et « hache » (à deux mains, le V en avant : le Solo et le corps à corps) |
| Une animation sur mesure par sort, dans les 4 directions, avec ses effets | `outil/scenes.py` et `outil/fracas.py` → `captures/riff-*.gif` et `anims/riff-ossel-anims.png` + `.json` (une rangée par animation et direction, `secousse` = le tremblement d'écran image par image) |
| Les sons (synth-audio, aucun fichier audio) | `son/sons.js`, la table d'écoute `son/index.html` (à servir : `node tools/serve.mjs design/classes/riff-ossel 4391`, puis `/son/`), le module copié dans `son/module/` |

- **Riff au contact** rejoue le **Fracas** de la bibliothèque (`design/animations/outil/melee.mjs`) ; le **Solo de la hache** est ce même Fracas, plus dramatique et dur, suivi du bond en arrière.
- **Ballade** et **Course effrénée** se jouent contre la poitrine, sans bras en l'air (le lever de bras écartés est refusé).
- Les sons : 10/10 calculés hors-ligne, jamais au plafond, silence à la fin. **Pas encore écoutés par une personne.**
- Les effets sont peints dans les images pour l'instant ; pour le jeu, ils doivent être séparés du corps (comme les films de Baba).


## Au terrain d'entraînement

- **Classe jouable** (13e) : `src/entrainement/regles.js` (`HEROS['riff-ossel']`, ses cinq sorts, le Rythme, les Os fragiles) ; elle ne se joue que par son auteur (DonBabaa).
- **Feuille** : `python outil/planche.py` (depuis `outil/`) écrit `public/assets/lpc/entrainement/riff-ossel.png` : les rangées LPC (marche, repos, blessé…) avec la guitare, puis une animation par sort (rangées 26 à 49 : Riff, Riff au contact = le Fracas, Ballade, Course effrénée, Power chord, Solo = le Fracas dramatique).
- **Les niveaux** : le Power chord (niveau 2, 1 Rythme, action bonus : +d6 à la prochaine attaque d'un allié à 9 m) et le Solo de la hache (niveau 5, 3 Rythme, au contact : 14 + d6 + DEX, cible Exposée, puis bond de 4,5 m en arrière, à l'opposé de la cible) sont au terrain. Le terrain n'a pas de niveaux de héros : le réglage « Niveau de Riff Ossel » (Réglages, difficulté ; 5 par défaut) les montre ou les cache (1 : ni l'un ni l'autre, 2 : le Power chord, 5 : les deux).
- **Pas encore au terrain** : le Final de concert (niveau 9), les sous-classes ; les sons de Rythme, blessé et K.O. sont de synthèse (`src/entrainement/sons-synthese.js`), à remplacer par des enregistrements ; des icônes à lui (il emprunte celles du tir rapide, du soin et du chant).
- Vérifié : `?test` terrain 507/507, armurerie 98/98, archives 47/47 ; image de chaque sort : `node tools/riff_capture.mjs` (dans `shots/`).
