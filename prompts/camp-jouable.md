# Prompt : rendre le camp jouable en multijoueur, sur le dashboard

Colle le bloc ci-dessous dans une nouvelle session Claude Code ouverte sur `AI games/dungeon-coop/`, **quand la session de design du camp a fini** sa carte et ses personnages (`prompts/camp-design.md`). Ce bloc transforme ce design en un camp jouable à plusieurs : en ligne sur le lien du jeu, et affiché en haut du dashboard.

```
Session de construction du camp de Dungeon Co-op : le prototype v0 (CAMP.fr.md §7). On prend la carte et les personnages dessinés dans la session de design du camp, et on les rend jouables en multijoueur (héberger avec un code, rejoindre), en ligne sur le lien du jeu, et visibles dans le dashboard.

## À lire d'abord, dans cet ordre
1. CAMP.fr.md : le concept complet, mis à jour par la session de design (la carte, les lieux et leurs niveaux, les pièces LPC). C'est la référence.
2. CLAUDE.md du projet, ../CLAUDE.md (le manuel : §2 l'échafaudage, §3 les tests), ../game-studio/STANDING_CALLS.md, ../game-studio/ANTI_PATTERNS.md.
3. GAME_SPEC.md : « Now », le jalon M1 « le camp », les décisions du 18 oct.
4. Les skills : game-skills d'abord, puis game-core, party-net, lpc-sprite-mods, browser-playtest. Lis le PITFALLS.md de chacun.
5. Le dashboard (autre repo) : https://github.com/Mastre-gaming/DungeonCoop-dashboard (le README, src/widgets/, src/config.js, src/test.js, docs/PLAN_TRAVAIL.md phase 0).

## Ce que la session de design a produit, et où le trouver
- Le design est dans ce dossier, peut-être pas encore commité : CAMP.fr.md, le brouillon de content/axes.json, les images de blockout, la liste des pièces LPC, les feuilles de sprites des héros (exports du générateur LPC, retouchés dans Sprite Painter) et ce qui a été téléchargé dans dl/.
- Avant de coder : fais-moi la liste de ce que tu as trouvé (carte, lieux, héros, pièces LPC, licences), et demande-moi quels fichiers sont définitifs. Ne réinvente ni la carte ni les personnages : s'il manque quelque chose, dis-le.

## Déjà décidé (ne pas rouvrir)
- Le camp du dashboard EST le camp vivant du jeu. M1 = « le camp ». KICKOFF.md est signé (18 oct) : le code est permis.
- 2D en pixel art LPC, vue de dessus trois-quarts, cases de 32 px, rendu net (pas de lissage, échelle entière). Moteur : three.js 0.186.1 avec une caméra orthographique (« three.js with a flat camera », GAME_SPEC), Vite 8.3.4, ES modules, à partir de game-core.
- Déplacement libre (pas de grille, pas de tours) : ZQSD ou flèches, ou un clic pour aller quelque part. Le curseur reste libre (pas de pointer lock).
- Caméra : suit le héros avec une zone morte au centre (30 % de l'écran), rattrape en douceur, s'arrête aux bords, position arrondie au pixel ; zoom moyen par défaut (environ 20 × 11 cases). Mode « visite » (?visite) : pas de héros, tout le camp dans le cadre.
- Multijoueur : party-net. Visiter seul ; héberger donne un code à cinq lettres ; rejoindre avec ce code (aussi par l'adresse : ?code=ABCDE). L'hôte fait tourner le monde ; 1 à 4 héros ; un départ ne casse rien pour les autres ; rejoindre après une coupure.
- Les lieux grandissent avec les missions : les issues du repo du jeu (label `axe: …`, label `taille: S/M/L`). S = 1, M = 3, L = 8 ; niveaux aux seuils 1, 5, 15, 35 (CAMP.fr.md §4). Le feu de camp grandit avec le total. C'est une fonction pure, progression(missions) → niveaux, testée dans ?test.
- La renommée du bâtisseur (RENOMMEE.fr.md : tentes, titres, statues) n'est PAS dans ce prototype. Elle viendra après.
- Les noms des lieux restent provisoires ; tu n'écris ni histoire ni dialogues.

## Comment les deux repos se parlent
- Le repo du jeu (celui-ci) possède le camp : le code, l'art, content/axes.json (le contrat des axes : label GitHub, lieu, emplacement).
- Les missions se lisent par le Worker « direct » de Paul (CORS ouvert, déjà branché sur les webhooks du repo du jeu) :
  - lecture : GET https://dungeoncoop-direct.mastredev.workers.dev/api/repos/Mastre-gaming/DungeonCoop/issues?state=all&per_page=100
  - direct : WebSocket wss://dungeoncoop-direct.mastredev.workers.dev/direct ; à chaque message { type: 'maj', sujets } qui contient 'issues', on relit et les lieux grandissent. Envoie « ping » toutes les 30 s.
  - secours, si le Worker ne répond pas : https://api.github.com/... sans token, relu toutes les 5 minutes au plus (limite de 60 appels par heure).
  - Ne modifie pas le Worker de Paul.
- Le dashboard affiche le camp : une nouvelle carte « Le camp » tout en haut de la page, avec une iframe sur https://dungeoncoop.0xbaba-eth.workers.dev/?visite et un bouton « Ouvrir le camp » (nouvel onglet, pour héberger et rejoindre). Suis les règles du dashboard : un widget = un fichier dans src/widgets/, la page construite avec el() (jamais innerHTML), une vérification dans src/test.js (en ?demo et ?test, pas de réseau : la carte montre une image ou un texte à la place de l'iframe), le README à jour. Le tableau de travail lit aussi content/axes.json (au lieu de la liste dans src/config.js), avec repli sur config.js si le fichier ne se lit pas.
- Le jeu doit accepter d'être affiché dans le dashboard : en-tête Content-Security-Policy frame-ancestors 'self' https://dungeoncoop-dashboard.mastredev.workers.dev https://*-dungeoncoop-dashboard.mastredev.workers.dev http://localhost:8000 (fichier public/_headers).

## La mise en ligne
- Lien du jeu : https://dungeoncoop.0xbaba-eth.workers.dev (compte Cloudflare du propriétaire, Workers Builds depuis main ; build command `npm run build`, deploy `npx wrangler deploy` ; un aperçu par PR).
- Il faut donc dans ce repo : package.json (avec wrangler en devDependency), vite.config.js (base: './', le build refuse les erreurs de syntaxe), et wrangler.jsonc avec "name": "dungeoncoop" (exactement) et des assets statiques sur ./dist. Le build marche depuis un clone propre.
- Le tampon de version (date et heure du build) est visible à l'écran, pour ne jamais confondre une vieille copie avec la nouvelle.

## L'échafaudage (le manuel §2)
- Le code en petits fichiers numérotés (src/01_core.js, src/02_carte.js…), game-core copié dans src/skills/core/module/, party-net dans src/skills/party-net/module/.
- ?test affiche réussies/total ; window.dbg pour se téléporter à un lieu, figer le temps, forcer le niveau d'un lieu, simuler une mission rentrée ; les captures sans écran (shots.mjs de game-core) aux points nommés : apparition, feu, chaque lieu, vue visite.
- Les fichiers téléchargés restent dans dl/ (jamais commités) ; ce qui entre dans le jeu va dans public/, avec sa source et sa licence dans CREDITS.md.

## Les tests qui comptent (le manuel §3)
- Marcher, ne pas se téléporter : depuis l'apparition, aller à pied jusqu'à chaque lieu et au feu ; donner les coordonnées exactes de tout endroit où le héros reste coincé.
- Deux clients simulés (le fil loopback de party-net) : héberger, rejoindre, bouger, l'un part, l'autre continue, sans plantage ni décalage.
- progression() : missions inventées (aucune, une S, plusieurs tailles, une rouverte, un axe inconnu) → les bons niveaux.
- Une mission simulée comme rentrée fait monter son lieu à l'écran (capture avant et après).
- Le dashboard : la carte « Le camp » s'affiche en haut, et ses vérifications ?test passent.
- Rien ne se chevauche, rien ne passe à travers un bâtiment, en marchant comme à l'arrêt.

## Comment on avance
- Au plus 5 étapes, chacune avec sa note « ce qui fait 8/10 ». Propose-les-moi avant de commencer. Ordre conseillé : 1. le camp en ligne et vide (la carte, un héros qui marche, la caméra) ; 2. les lieux et leurs niveaux, lus depuis les missions ; 3. héberger et rejoindre ; 4. la carte « Le camp » dans le dashboard ; 5. le passage complet à deux navigateurs.
- Une chose à la fois (porte T) : le premier lieu avec ses 5 niveaux, validé par moi, avant les sept autres.
- Après chaque changement important : build, captures, tu les regardes, tu me les montres. Ne me dis jamais que c'est fait sans une capture ou un résultat de test qui le prouve. Un correctif s'annonce « corrigé : à vérifier par toi », avec le chemin et une capture.

## Git
- Repo du jeu : une branche (donbabaa/camp-v0), une PR vers main, une seule chose par PR. Repo du dashboard : une PR aussi (Paul la voit passer).
- Ne commite et ne pousse que quand je le dis. Jamais de ligne « Co-authored-by » (règle 12 ; la vérification du dashboard la refuse). Rien de dl/, aucun secret.
- Tout ce qui est écrit pour l'équipe est en français.

## Fini quand (CAMP.fr.md §7)
1. Sur https://dungeoncoop.0xbaba-eth.workers.dev, un héros marche dans tout le camp sans rester coincé.
2. Deux navigateurs hébergent et rejoignent, se voient marcher ; l'un part, l'autre continue.
3. Une mission fermée dans le tableau de travail fait monter son lieu chez les deux en moins de 5 s.
4. Le dashboard affiche le camp en haut de la page.
5. Les captures le montrent, et je note le camp sur 10.

## Commence par
Lire les fichiers ci-dessus, me lister ce que la session de design a produit et ce qui manque, puis me proposer tes 5 étapes avec leur 8/10.
```
