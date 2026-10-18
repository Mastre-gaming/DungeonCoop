# Intégrer DEADLOCK RECORDS RADIO (exportée de Mastres Racing)

Ce dossier contient une station de radio « à la GTA », exportée du jeu Mastres Racing (un jeu de course web en
TypeScript, Vite et three.js) : **DEADLOCK RECORDS RADIO**, du rap chill (27 morceaux du groupe Deadlock Records),
avec la voix d'un animateur et des jingles entre les morceaux, passée dans un filtre qui sonne comme un petit poste
de radio. Ta mission : l'intégrer dans le projet de ce workspace. Lis tout ce document avant de copier quoi que ce soit.

## 1. Ce que fait la radio

- **En direct** : une station joue même quand on ne l'écoute pas. Sa grille est une boucle fixe (ses morceaux
  mélangés une fois pour toutes, la graine étant l'identifiant de la station), calée sur l'horloge du monde
  (`Date.now()`). Recharger la page, c'est retrouver la station plus loin, au milieu d'un morceau. Rien n'est
  mémorisé, sauf les morceaux passés (voir plus bas).
- **Entre deux morceaux** : une voix de l'animateur, PUIS un jingle (`jingleEvery: 1` : après chaque morceau),
  chacun à tour de rôle dans l'ordre alphabétique de ses fichiers. Trois morceaux (`playLast` de `station.json`)
  passent toujours en fin de boucle.
- **Les commandes** : station suivante et précédente (avec une seule station : allumer et couper), **morceau
  suivant** (la station avance jusqu'au début du prochain morceau ; ce décalage est gardé dans `localStorage`,
  sinon le morceau sauté reviendrait à la page suivante), volume.
- **Le son** : un élément `<audio>` lit le fichier au fil de l'eau (pas de décodage complet en mémoire), puis
  Web Audio le fait passer par le **filtre radio** : mono, coupe-bas à 300 Hz, coupe-haut à 3 400 Hz, +5 dB vers
  1,5 kHz, une légère saturation (tanh), une forte compression. Chaque son a un **gain mesuré** qui égalise les
  volumes à la SORTIE de ce filtre. Un grésillement de 0,3 s accompagne chaque changement de station.
- **Le démarrage** : au premier geste de l'utilisateur (touche, clic, toucher), à cause de la règle des
  navigateurs sur le son. Page cachée : silence ; au retour, la station reprend en direct.

## 2. Le contenu de ce dossier

```
RADIO_DEADLOCK.md                      ce document
public/assets/radio/
  cb-static.mp3                        le grésillement d'attente (joué par une station sans morceau)
  deadlock-records/                    LA STATION (94 Mo) : son identifiant = le nom du dossier
    *.mp3                              27 morceaux (128 kbps)
    voix/                              3 passages de l'animateur (01-indicatif, 10-legendaire, 11-un-classique)
    jingles/                           4 jingles (01 à 04)
    station.json                       nom, genre, couleur, ordre, playLast, titres affichés
src/audio/                             LE MOTEUR (aucune dépendance hors de ce dossier)
  Radio.ts                             le lecteur : `export const radio` (un seul par page)
  radioSchedule.ts                     la grille en direct (logique pure, tourne aussi dans Node)
  radioFx.ts                           le filtre radio (la recette, et sa chaîne Web Audio)
  radioCatalog.ts                      le catalogue GÉNÉRÉ (durées, silences coupés, gains), réduit à cette station
  radioStorage.ts                      la clé de localStorage (remplace un module de Mastres Racing)
scripts/
  radio-scan.mjs                       regénère radioCatalog.ts d'après public/assets/radio/ (voir § 5)
  edge.mjs                             pilote Microsoft Edge sans fenêtre (le scan mesure le son dans le navigateur)
reference/                             À LIRE ET ADAPTER, pas à copier tel quel
  ui/RadioDisplay.ts                   le bandeau « à la GTA » (station, morceau) et les touches N, B, « , », la molette
  ui/CarRadio.ts                       le poste d'autoradio (écran néon, spectre, touches, bouton de volume)
  ui/multiRadio.ts                     le branchement de la radio partagée en multijoueur (§ 3.6)
  scripts/radio-check.ts               les contrôles du catalogue et de la grille, dans Node
  RADIO_ELEVENLABS_DEADLOCK.md         les prompts ElevenLabs des voix et jingles (pour en générer d'autres)
```

Le moteur (`src/audio/`) compile seul : vérifié avec TypeScript 7 en `strict`, avec `lib: ES2022, DOM`. Il utilise
`Float32Array<ArrayBuffer>` (TypeScript 5.7 ou plus ; en dessous, retirer `<ArrayBuffer>`). Les fichiers sont
commentés en français : chaque choix y a sa raison. Garde ces commentaires.

## 3. Intégrer

### 3.0 D'abord, regarde le projet d'accueil

- Sa pile (TypeScript ? bundler ? framework ?) et **comment il sert ses fichiers statiques** (`public/` avec Vite,
  un autre dossier, un CDN).
- S'il a déjà une musique ou un système audio : la radio le remplace-t-elle, ou cohabitent-ils ? Demande à Paul.
- S'il a déjà des fichiers de mêmes noms (`src/audio/Radio.ts`…) : ne rien écraser.
- Où il range ses réglages (volume, préférences) et sa convention de clés `localStorage`.

### 3.1 Les sons

Copier `public/assets/radio/` pour qu'ils soient servis à l'adresse **`assets/radio/…` relative à la page** :
`Radio.ts` résout chaque fichier par `new URL(track.file, document.baseURI)`, et le catalogue écrit des chemins
comme `assets/radio/deadlock-records/999.mp3`. Si le projet sert ses fichiers ailleurs, regénère le catalogue
(§ 5) ou change le préfixe des chemins dans `radioCatalog.ts`.

**Même origine obligatoire** : `createMediaElementSource` sur un fichier d'un autre domaine sans en-têtes CORS
donne du SILENCE, sans erreur. Si les sons doivent venir d'un CDN : `audio.crossOrigin = 'anonymous'` dans
`Radio.start` (juste après `new Audio()`), et des en-têtes CORS sur le CDN.

### 3.2 Le code

Copier `src/audio/*` dans le projet. Dans `radioStorage.ts`, adapter `PREFIX` à la convention du projet.
`radioCatalog.ts` est généré : ne pas l'éditer à la main, sauf pour le préfixe des chemins (§ 3.1).

### 3.3 Démarrer

```ts
import { radio } from './audio/Radio';

// Une fois par page. Le volume va de 0 à 1 ; 'deadlock-records' : la station ('off' : coupée ; un identifiant
// inconnu ou '' : la première station).
radio.start(0.5, 'deadlock-records');
```

Le son démarre au premier geste de l'utilisateur, de lui-même (le lecteur écoute `keydown`, `pointerdown`,
`pointerup` et `touchend` sur `window`). Ne crée pas d'`AudioContext` ailleurs pour la radio : celui du filtre naît
pendant ce geste, sinon il démarrerait suspendu.

### 3.4 L'API

| Appel | Effet |
|---|---|
| `radio.next()`, `radio.prev()` | la station suivante, précédente (l'ordre : les stations, puis « coupée ») ; appelle `radio.persist` |
| `radio.skip()` | le morceau suivant (voix et jingle sautés) ; décalage gardé dans `localStorage` |
| `radio.tune(id)` | une station par son identifiant (`'off'` : coupée), sans appeler `persist` |
| `radio.setVolume(v)` | le volume, de 0 à 1 (appliqué après le filtre) |
| `radio.info` | ce qui joue : `station`, `track` (son `title`), `jingle`, `filler`, `index`, `count` |
| `radio.onChange(fn)` | prévenu à chaque changement ; `fn(info)` avec `info.reason` : `'tune'`, `'track'` ou `'locked'` ; renvoie de quoi se désabonner |
| `radio.analyser()` | un `AnalyserNode` sur la sortie (pour dessiner un spectre) ; `null` avant le premier geste |
| `radio.stationId` | l'identifiant écouté (`'off'` : coupée), à enregistrer dans les réglages |
| `radio.persist = (id) => …` | appelée quand le JOUEUR change de station : y enregistrer son choix |

### 3.5 L'affichage (au choix)

Le moteur n'affiche rien. Trois possibilités :

1. **Minimal** : écouter `radio.onChange` et afficher `info.station?.name` et `info.track?.title` (pas pour un
   jingle ni pour le grésillement : `info.jingle`, `info.filler`). Brancher des touches (dans Mastres Racing :
   N la suivante, B la précédente, « , » le morceau suivant, lue par `e.key` car la virgule change de place entre
   AZERTY et QWERTY ; jamais dans un champ de saisie ; pas sur une touche répétée, `e.repeat`).
2. **Le bandeau** (`reference/ui/RadioDisplay.ts`) : il apparaît en haut à droite au changement de station (4 s)
   et à chaque morceau (3 s). Il compile tel quel une fois placé dans `src/ui/` (à côté de `src/audio/`). À
   adapter : il porte la classe CSS `hud` du jeu (`position: fixed; pointer-events: none`) et les variables CSS
   `--shadow`, `--muted`, `--num` ; la liste `OCCUPANTS` (les éléments du jeu sous lesquels il se range) et
   `PANELS_OPEN` (où la molette ne change pas de station) nomment des éléments de Mastres Racing : à vider ou à
   remplacer.
3. **Le poste d'autoradio** (`reference/ui/CarRadio.ts`) : un vrai poste à l'écran (écran néon, spectre, touches,
   présélections, bouton de volume), en grand (`mountCarRadio`) ou en petit (`mountHudRadio`). Il dépend des
   réglages du jeu (`Settings`, `saveSettings` : `radio`, `musicVolume`) et de sa mise en page (`#menu`,
   `#minimap`, `html.touch-ui`) : à réécrire autour du projet plutôt qu'à copier.

### 3.6 Le multijoueur (facultatif)

Dans Mastres Racing, la radio est PARTAGÉE dans un salon : tous entendent le même morceau au même instant, et seul
l'hôte passe les morceaux. `radio.setSync({ now, offsets, host, skip })` remplace l'horloge par celle du serveur et
les décalages par ceux du salon ; `radio.setSyncOffsets(…)` applique un passage de l'hôte ; `radio.resync()` suit
une meilleure mesure de l'heure. `reference/ui/multiRadio.ts` montre ce branchement, mais il demande un serveur qui
relaie l'heure et les décalages. Sans multijoueur, ne rien faire : le lecteur fonctionne seul.

## 4. Ce qu'il ne faut pas casser

- **Les gains du catalogue sont mesurés à la sortie du filtre radio** (`radioFx.ts`). Si tu retires ou changes le
  filtre (une version « propre » sans effet radio, par exemple), les volumes ne sont plus égalisés : regénère le
  catalogue (§ 5), sinon les morceaux s'écartent de près de 7 dB (mesuré). Changer la saturation (`drive`)
  change aussi le niveau de sortie : il faut remesurer `levelDb` et le grésillement (`CRACKLE` dans `Radio.ts`).
- **Des gains au-dessus de 1** (jusqu'à 2,1) : ils passent par un `GainNode`. Sans Web Audio, le lecteur retombe
  sur `audio.volume`, plafonné à 1 : le son reste correct, mais moins bien égalisé.
- **`createMediaElementSource` détourne l'élément pour toujours** : une seule fois, et en DERNIER (tout le graphe
  d'abord), sinon un échec en route laisse un élément muet. C'est déjà fait ainsi (`connectFx`).
- **`play()` refusé** : `NotAllowedError` (pas encore de geste) remet la radio en attente ; `AbortError` (un autre
  chargement l'a interrompu) n'est pas une erreur. Les confondre arrêtait la radio à la fin du son en cours.
- **L'identifiant de la station** (`deadlock-records`) donne l'ordre des morceaux et la position dans la boucle :
  le renommer change la grille. C'est sans gravité, mais ce n'est plus « la même » radio que dans Mastres Racing.
- **Les durées** viennent du scan (décodage complet) : l'en-tête d'un mp3 à débit variable peut se tromper de
  plusieurs secondes. Ne remplace pas un fichier sans relancer le scan.
- **Les formats** : mp3 ou m4a seulement (Safari ne lit pas l'ogg ; le wav pèse dix fois plus).

## 5. Ajouter ou changer des sons : le scan

Le catalogue fourni est prêt : le scan ne sert que si les fichiers changent.

- Les règles du dossier d'une station : les morceaux directement dedans, les voix dans `voix/`, les jingles dans
  `jingles/` (pris dans l'ordre alphabétique). `station.json` : `name`, `genre`, `color`, `order`, `jingleEvery`,
  `playLast` (les fichiers à passer en fin de boucle), `titles` (fichier → titre affiché), `musicGainDb` (les
  morceaux plus ou moins forts que le niveau commun, de −6 à +6 dB), `logo`. Le champ `note` n'est lu par rien :
  ses chemins sont ceux de Mastres Racing.
- `npx tsx scripts/radio-scan.mjs`, depuis la racine du projet. Il lit `public/assets/radio/`, écrit
  `src/audio/radioCatalog.ts` (chemins à adapter en tête du script si le projet est rangé autrement), et
  scanne TOUTES les stations du dossier. Il demande Node 18 ou plus, `tsx` (il importe `radioFx.ts` pour rejouer
  le même filtre que le jeu) et **Microsoft Edge** au chemin écrit dans `scripts/edge.mjs` (Windows). Ailleurs,
  pointer `EDGE` sur Chrome ou Chromium : le protocole est le même.
- Ce qu'il mesure, fichier par fichier, dans le navigateur : la durée exacte, la partie audible (les silences des
  deux bouts coupés), et le volume perçu (LUFS) à la sortie du filtre radio, d'où le gain qui l'amène à −13 LUFS
  (le grésillement : −23).

## 6. Vérifier

- Au premier clic, la station démarre au milieu d'un morceau ; le titre s'affiche (si un affichage est branché).
- « Suivante » coupe la radio, puis la rallume ; un grésillement court à chaque changement.
- « Morceau suivant » passe au morceau d'après (voix et jingle sautés) ; après un rechargement, ce morceau ne
  revient pas.
- Recharger la page : la station a continué ; l'onglet caché : silence ; revenu, elle reprend en direct.
- Les volumes se tiennent d'un morceau à l'autre ; la voix de l'animateur passe au même niveau.
- Aucune erreur dans la console. Dans l'onglet réseau, les mp3 arrivent par morceaux (réponses 206) : la lecture
  se fait au fil de l'eau.
- `reference/scripts/radio-check.ts` contrôle le catalogue et la grille dans Node (chaque fichier existe, gains
  dans les bornes, la boucle, les pauses, le direct). Pour l'utiliser : le placer dans `scripts/`, retirer sa
  partie 4 (elle lit les réglages de Mastres Racing), puis `npx tsx scripts/radio-check.ts`.

## 7. Droits et sources

- **Les morceaux** sont de Deadlock Records, confiés par Paul pour Mastres Racing. Les réutiliser ailleurs se fait
  avec l'accord de Paul (et du groupe) : à confirmer avec lui avant de publier.
- **Les voix et les jingles** ont été générés avec ElevenLabs : l'offre utilisée doit permettre l'usage voulu (à
  notre connaissance, l'offre gratuite demande de citer ElevenLabs et interdit l'usage commercial). Pour en
  générer d'autres (une co-animatrice est prévue, avec ses répliques et des jingles féminins, pas encore
  générés) : `reference/RADIO_ELEVENLABS_DEADLOCK.md`, sections 1 à 5, avec les noms de fichiers qui font
  alterner les voix.
- **Les originaux** (en WAV ou en 320 kbps, environ 357 Mo, avec quelques morceaux « bonus » pas encore activés)
  ne sont pas dans ce dossier. Ils sont dans Mastres Racing, `radio-originaux/deadlock-records/`, hors de git. Les
  morceaux livrés ici sont ré-encodés en 128 kbps pour le poids du site.
