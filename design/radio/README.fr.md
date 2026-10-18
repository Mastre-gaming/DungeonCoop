# La radio Deadlock au camp (mission #94)

DEADLOCK RECORDS RADIO, la station « à la GTA » de Mastres Racing, joue dans le camp. **Le barde** la diffuse : assis sur une souche à l'ouest du feu, une lyre médiévale sur les genoux, avec **son enceinte** à côté de lui.

- **En direct.** La station joue même quand personne ne l'écoute. Sa grille est une boucle fixe calée sur l'horloge du monde : en arrivant, on la prend au milieu d'un morceau, et tous les amis du camp entendent la même chose au même moment. Entre deux morceaux passent une voix de l'animateur, puis un jingle. Les trois morceaux « en fin de queue » de `station.json` passent toujours en dernier.
- **Le son vient de l'enceinte.** On l'entend dans tout le camp, et de plus en plus fort en s'approchant du feu : à pleine puissance à moins de 2,5 cases, à 18 % au-delà de 15 cases (`presence` dans `src/24_radio.js`).
- **Il démarre au premier geste** (une touche, un clic), parce que les navigateurs refusent le son avant. **Un onglet qu'on quitte ne coupe pas la radio**, et au retour elle n'a pas sauté (Paul, 18 oct. : dans Mastres Racing, une page cachée se taisait, puis se recalait en sautant au retour).
- **Le barde.** Sa lyre est pincée au rythme de la radio, des notes montent, et le haut-parleur de l'enceinte pousse sur les temps forts. **E devant lui**, ou un clic sur lui ou sur l'enceinte : ce qui joue, « Morceau précédent », « Morceau suivant », « Couper la radio ». Ses répliques sont **provisoires** : l'histoire est à l'équipe.
- **Le bandeau.** Chaque nouveau morceau s'affiche en haut de l'écran pendant 4 s (pas les jingles).
- **À plusieurs** (le groupe du camp) : tout le monde entend **la radio de l'hôte**, au même instant. L'hôte donne son heure et ses morceaux passés, à l'arrivée de chacun puis toutes les 10 s, et chacun cale sa radio dessus. Un morceau passé ou repris au barde, **par n'importe qui**, l'est pour tout le groupe : la demande part chez l'hôte, qui la renvoie à tous, et le bandeau dit qui l'a choisi. Le groupe fini, chacun reprend sa radio seule. Vérifié à deux navigateurs : le même son à 0,06 s près, et le saut ensemble à 0,02 s près.
- **Le volume de la musique** vient du réglage « musique » (`dungeoncoop:reglages`), qu'écrira le menu Réglages (#95). Sans lui, 0,6.
- **Pas de son** en `?test` (une fausse radio, sans son) ni en `?visite` (la carte du dashboard).

## Les fichiers
| Quoi | Où |
|---|---|
| Le moteur (lecteur, grille, filtre, catalogue généré), repris tel quel | `src/audio/` (seul changement : le préfixe de stockage `dungeoncoop:`) |
| Le barde, l'enceinte, le volume selon la distance, le bandeau, et leurs tests | `src/24_radio.js` |
| Les sons (94 Mo) : 27 morceaux, 3 voix, 4 jingles, le grésillement | `public/assets/radio/` |
| Le barde (assis, avec sa lyre), l'enceinte, les notes | `public/assets/lpc/barde.png`, `enceinte.png`, `notes.png`, dessinés par `design/camp/outils/barde_radio.py` |
| La documentation de l'export, et les prompts ElevenLabs (pour une co-animatrice, prévue) | `RADIO_DEADLOCK.md`, `RADIO_ELEVENLABS_DEADLOCK.md` (ici) |
| Regénérer le catalogue si les sons changent | `npm run radio:scan` (`tools/radio-scan.mjs`, avec Edge, ou `NAVIGATEUR=<chemin de Chrome>`) |

## Le barde
- Un personnage du générateur LPC, importé avec `lpc-sprite-mods` (chapeau cavalier violet, tenue bordeaux ; le lien est en tête de `public/assets/credits/barde-camp.txt`). Son look est provisoire.
- Le générateur n'a ni lyre ni luth, et une retouche de `lpc-sprite-mods` ne passe jamais devant les vêtements. La lyre est donc dessinée à part, pixel par pixel dans le style LPC, et posée sur ses genoux dans la pose « assis » de face ; ses mains sont repeintes par-dessus pour qu'il la tienne. La souche du camp est derrière lui.

## Les captures
| Fichier | Ce qu'on voit |
|---|---|
| `1-le-barde-pres-du-feu.png` | le barde à l'ouest du feu, sa lyre, l'enceinte, une note qui monte (la radio joue : un vrai clic l'a lancée) |
| `2-parler-au-barde.png` | E devant le barde : ce qui joue, « Morceau suivant », et le bandeau du morceau en haut |

## Les droits
Les morceaux sont de Deadlock Records, utilisés avec l'accord du groupe (Paul, 18 oct.). Les voix et les jingles viennent d'ElevenLabs. Le détail est dans `public/assets/credits/radio-deadlock.txt` et dans `CREDITS.md`.
