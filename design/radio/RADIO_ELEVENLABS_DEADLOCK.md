# DEADLOCK RECORDS RADIO — les prompts pour ElevenLabs

La radio dédiée à **Deadlock Records**, le groupe de rap légendaire de Monaco des années 2020 : du rap
**chill**, présenté par un animateur **très énergique** qui parle **anglais**, en argot américain, et
rappelle sans cesse où l'on est. Depuis le 2026-10-16 (soir), une **co-animatrice** lui répond : plus
posée, pince-sans-rire, elle fait le lien avec la musique chill et le taquine (§ 1 bis, § 2 bis). La voix
des animateurs (les transitions entre les morceaux) et les jingles de la station, à générer avec
ElevenLabs, puis à déposer dans le jeu (§ 5). Rédigé le 2026-10-16 à la demande de Paul ; même démarche
que pour DRUM&MASTRES RADIO (`stuv/RADIO_ELEVENLABS.md`). Les musiques de la station, elles, viendront
d'ailleurs.

| Quoi | Outil ElevenLabs | Durée | Combien |
|---|---|---|---|
| La voix de l'animateur | **Voice Design** (créer une voix en la décrivant) | — | 1 |
| La voix de la co-animatrice | **Voice Design** | — | 1 |
| Les transitions parlées de l'animateur | **Text to Speech**, modèle **Eleven v3** | 2 à 12 s | 13 |
| Les transitions parlées de la co-animatrice | **Text to Speech**, modèle **Eleven v3** | 2 à 12 s | 10 |
| Les répliques en duo | **Text to Dialogue** (Eleven v3), sinon TTS + montage | 5 à 15 s | 4 |
| Les jingles | **Eleven Music** | 4 à 10 s | 4 + 3 féminins |
| Le jingle à la voix grave (J5, « certified hood classic ») | **Voice Design** puis **Text to Speech** (ou Eleven Music) | 2 à 4 s | 1 |
| Le jingle chuchoté (J9, la réponse féminine au J5) | **Text to Speech** + Audacity | 2 à 4 s | 1 |
| Les « stingers » sans voix | **Sound Effects** | 2 à 4 s | 4 |

Tout est en **anglais**, les descriptions comme ce qui est dit (les animateurs parlent anglais). Le
contraste est voulu : une voix survoltée sur des morceaux posés, comme un hype man de radio hip-hop ; la
co-animatrice, elle, est dans le ton de la musique, et c'est elle qui le recadre.

## 1. La voix de l'animateur (Voice Design)

Description de la voix :

```
A young American male radio host in his mid-twenties, hosting a hip-hop radio station. Extremely energetic and charismatic hype-man energy, fast-talking with a big smile in his voice, strong New York accent, uses American street slang naturally. Deep, slightly raspy voice, punchy delivery, loud but never distorted. Crisp close-mic studio broadcast quality, no background noise, no reverb.
```

Texte de l'aperçu :

```
Yo, yo, yo! You're locked in to Deadlock Records Radio, the home of the legendary Deadlock Records, straight outta Monaco! Let's get it!
```

Générer, écouter les propositions, garder la meilleure et l'enregistrer comme voix (un nom au choix).

## 1 bis. La voix de la co-animatrice (Voice Design)

Le complément de l'animateur, pas sa copie : plus lente, plus grave dans l'intention, un accent de la côte
Ouest face à son accent new-yorkais (les deux voix se distinguent tout de suite à l'oreille), et un
sourire en coin plutôt qu'un cri.

Description de la voix :

```
A young American female radio co-host in her late twenties, hosting a chill hip-hop radio station at night. Smooth, warm, slightly husky voice, relaxed and confident, effortlessly cool with a playful, teasing edge. Laid-back West Coast Los Angeles accent, uses American slang casually. Medium-low pitch, unhurried delivery, a knowing smile in her voice. Crisp close-mic studio broadcast quality, no background noise, no reverb.
```

Texte de l'aperçu :

```
Hey, hey... you're tuned in to Deadlock Records Radio. Smooth sounds from the legendary Deadlock Records, straight outta Monaco. Settle in, babe.
```

Si les propositions sortent trop « pub » ou trop lisses, ajouter à la description : `natural, not overly polished, sounds like a real late-night radio host` ; si elles sortent trop aiguës : `low, smoky tone`.

## 2. Les transitions parlées (Text to Speech, Eleven v3)

Réglages : la voix créée au § 1 ; le modèle **Eleven v3** (il joue les balises d'émotion entre crochets :
`[excited]`, `[laughs]`, `[shouts]`, `[whispers]`…) ; la stabilité sur « Creative » (l'énergie d'un
hype man) ; une ligne par génération, donc un fichier par transition. Quelques règles :

- le nom écrit **« Deadlock Records Radio »** en entier, dans presque chaque ligne : la radio doit le
  rappeler ;
- les nombres en lettres (« twenty-twenties », « eighty-six ») ;
- générer deux ou trois versions de chaque ligne, et garder la meilleure ;
- une transition passe à un moment QUELCONQUE, dans tous les modes (circuits, Skyline, Survie) : rien
  qui dépende d'une situation de course précise.

01 — l'indicatif

```
[excited] Yo, yo, yo! You're locked in to Deadlock Records Radio! The one and only station for Deadlock Records — the legendary rap crew straight outta Monaco. Let's gooo!
```

02 — après un morceau

```
[laughs] Man, that track was smooth like a Sunday cruise down the harbor. No cap. Stay locked in, fam — Deadlock Records Radio, all day, every day.
```

03 — la légende

```
[excited] Real ones know: back in the twenty-twenties, Deadlock Records ran the whole Riviera. From Monte-Carlo to the world, baby! This is their station. This is Deadlock Records Radio!
```

04 — Monaco

```
Yo, shout out to everybody racing through Monaco tonight! Tunnel's wide open, the Casino's lit up... [whispers] but watch that hairpin, fam. [excited] Deadlock Records Radio got you covered!
```

05 — chill

```
[calm] Alright, alright... we keep it chill tonight. Windows down, bass low, eyes on the road. Deadlock Records Radio — vibes only.
```

06 — on monte le son

```
[shouts] Turn it up! This is Deadlock Records Radio, and we don't do skips, we don't do brakes — we only do bangers!
```

07 — la police de Skyline

```
[laughs] Heard the cops are chasing somebody down the highway again... Deadass, just turn the volume up and keep it moving. Deadlock Records Radio, baby!
```

08 — le drift

```
Ayo, I see y'all drifting out there in that eighty-six! That's some clean steez right there. Keep sliding — Deadlock Records Radio is riding with you.
```

09 — le cri (très court)

```
[shouts] Deadlock Records Radio!
```

10 — légendaire

```
[excited] Legendary crew, legendary sound! Deadlock Records, Monaco's finest, right on your radio. If you know, you know!
```

11 — un classique

```
[confident] Next one's a classic, straight from the vault. Lean back, ride slow... or don't, I ain't your mama. [laughs] Deadlock Records Radio!
```

12 — la nuit

```
[calm] It's late, Monte-Carlo's glowing, the yachts are chilling in the harbor... and you're locked in to Deadlock Records Radio. Stay with us.
```

13 — big up

```
[excited] Big shout out to all the drivers online right now — multiplayer, survival, time trial, everybody's tuned in! Deadlock Records Radio, worldwide!
```

## 2 bis. Les transitions de la co-animatrice (Text to Speech, Eleven v3)

Réglages : la voix créée au § 1 bis ; **Eleven v3** ; la stabilité sur « Natural » (elle joue moins la
comédie que lui ; passer sur « Creative » seulement si une ligne sort plate). Mêmes règles qu'au § 2.
Les noms de fichiers proposés (`01f-…`) la font alterner avec l'animateur (voir § 5).

F01 — l'indicatif (`01f-indicatif.mp3`)

```
[warm] Hey, hey... you're tuned in to Deadlock Records Radio. Smooth sounds from the legendary Deadlock Records, straight outta Monaco. Settle in.
```

F02 — après un morceau (`02f-apres-morceau.mp3`)

```
[sighs happily] Mmm... that one hits different every single time. Deadlock Records Radio — we only play the good stuff.
```

F03 — elle taquine l'animateur (`03f-decaf.mp3`)

```
[laughs] My co-host is way too hyped tonight... somebody get that man a decaf. Me? I'm keeping it smooth. Deadlock Records Radio.
```

F04 — la Riviera (`04f-riviera.mp3`)

```
[softly] Sunset on the Riviera, top down, Monte-Carlo shining in the rearview... Yeah. This is Deadlock Records Radio.
```

F05 — la légende (`05f-legende.mp3`)

```
Back in the twenty-twenties, everybody wanted a Deadlock Records verse. Every club, every yacht party, every car on the Corniche. That's history, babe — and it's playing right here on Deadlock Records Radio.
```

F06 — la signature (très courte) (`06f-signature.mp3`)

```
[playful] Deadlock Records Radio. You already know.
```

F07 — la police de Skyline (`07f-sirenes.mp3`)

```
[laughs] Sirens in the rearview? Don't panic, babe... just turn it up. Deadlock Records Radio.
```

F08 — la nuit (`08f-nuit.mp3`)

```
[whispers] It's late... the city's asleep, but you're not. [softly] Stay locked in to Deadlock Records Radio.
```

F09 — un classique (`09f-classique.mp3`)

```
[confident] Ooh, this next one? Certified classic. Don't you dare touch that dial. Deadlock Records Radio.
```

F10 — big up (`10f-big-up.mp3`)

```
[excited] Shout out to all my drivers out there, solo or online — Deadlock Records Radio is riding shotgun tonight!
```

## 2 ter. Les répliques en duo (Text to Dialogue, Eleven v3)

Le vrai plus d'une deuxième voix : des échanges entre les deux animateurs, qui donnent l'impression d'une
émission en direct. ElevenLabs propose un mode **dialogue** avec Eleven v3 (plusieurs voix dans une même
génération, chacune sa réplique) : choisir la voix du § 1 pour HIM et celle du § 1 bis pour HER, puis
coller les répliques une par une. Si l'interface ne le propose pas dans ton offre : générer chaque
réplique séparément en Text to Speech, puis les mettre bout à bout dans Audacity (0,2 à 0,4 s de
silence entre deux répliques ; les faire légèrement se chevaucher sur les rires).

D1 — l'ouverture (`01d-ouverture.mp3`)

```
HIM: [excited] Yo, yo, yo! Deadlock Records Radio!
HER: [laughs] Calm down... we're live in Monaco, not in a stadium.
HIM: Monaco IS my stadium!
HER: [sighs] Deadlock Records Radio, everybody.
```

D2 — la question (`02d-question.mp3`)

```
HER: So... who's the greatest rap crew to ever come out of Monaco?
HIM: [shouts] Deadlock Records! Next question!
HER: [laughs] Fair enough. You're locked in to Deadlock Records Radio.
```

D3 — le désaccord (`03d-son.mp3`)

```
HIM: [excited] Turn it up!
HER: [calm] Keep it smooth.
HIM: Turn it UP!
HER: [playful] Fine... Deadlock Records Radio. Both ways.
```

D4 — le relais (`04d-relais.mp3`)

```
HIM: [excited] Deadlock Records...
HER: [smooth] ...Radio.
```

## 3. Les jingles (Eleven Music)

Pour chacun : la description du style, les paroles (s'il y a un champ pour elles), et la durée la plus
courte proposée ; un jingle trop long se raccourcit dans un éditeur audio.

J1 — l'indicatif principal

```
Radio station ident jingle, about 6 seconds. Chill hip-hop at 85 BPM: dusty boom bap drums, warm jazzy Rhodes chords, vinyl crackle, deep sub bass. A smooth, confident male voice says "Deadlock Records Radio" over the beat, ending on a soft reverb tail. Laid-back luxury Riviera vibe.
```

Paroles : `Deadlock Records Radio.`

J2 — le refrain chanté

```
Short chill rap jingle, about 8 seconds, 82 BPM: lo-fi beat, mellow electric piano, light saxophone riff. A soulful female vocal sings "Deadlock Records... Radio" as a catchy hook, ending cleanly. Sunset over Monaco harbor mood.
```

Paroles : `Deadlock Records... Radio`

J3 — la version trap douce

```
Melodic chill trap jingle, about 6 seconds, 140 BPM with a half-time feel: soft 808 bass, crisp hi-hat rolls, dreamy synth pad. A deep male voice with light autotune says "Deadlock Records Radio, Monaco", ending on a reversed cymbal.
```

Paroles : `Deadlock Records Radio, Monaco`

J4 — la légende (old school)

```
Old-school boom bap radio drop, about 5 seconds: classic sampled horn stab, DJ scratching, crowd cheering, a hype man shouting "Deadlock! Legendary!", ending on a record scratch.
```

Paroles : `Deadlock! Legendary!`

J5 — la voix grave façon « this is a certified hood classic » (demande de Paul, 2026-10-16)

La voix du mème : un homme très grave, lent, comme une voix RALENTIE et descendue de plusieurs demi-tons,
avec un gros écho. ElevenLabs ne copie pas une voix d'après un nom : on la DÉCRIT (Voice Design), on lui
fait dire la phrase (Text to Speech), puis on pousse l'effet dans un éditeur audio (étape 3) ; c'est ce
traitement, plus que la voix elle-même, qui fait le son du mème.

1. La voix (Voice Design) :

```
An extremely deep, slow male voice, like a slowed-down, pitched-down hip-hop radio drop. Dark, rumbling, cavernous bass tone, calm and menacing but cool, very deliberate delivery with long pauses between words. Gritty low end, as if the vocal was pitched down several semitones. American accent. Close-mic studio quality, no background noise, no reverb.
```

Texte de l'aperçu (Voice Design en demande une centaine de caractères ; un clin d'œil au mème) :

```
This... is a certified... Deadlock Records classic. Straight outta Monaco. Deadlock... Records... Radio.
```

2. La phrase (Text to Speech) : la voix de l'étape 1, la stabilité sur « Robust » (une voix de « drop » ne
joue pas la comédie : régulière, posée), la vitesse au plus lent (0,7). Les points de suspension font les
silences entre les mots.

```
Deadlock... Records... Radio.
```

La variante clin d'œil, pour un deuxième jingle :

```
This is a certified... Deadlock Records classic.
```

3. L'effet, dans Audacity (gratuit ; les noms des menus varient un peu selon la version) :

- Effet → Hauteur et tempo → Changer la vitesse (*Change Speed*) : −15 % ; la voix descend ET ralentit
  ensemble, l'effet « slowed » du mème. Plus grave encore : Changer la hauteur (*Change Pitch*), −2 à −3
  demi-tons ;
- Effet → Écho (*Echo*) : délai 0,25 s, atténuation 0,3 (le rebond), puis Réverbération (*Reverb*) :
  grande salle, mixage « humide » vers 25 % ;
- un peu de basses : Basses et aigus (*Bass and Treble*), +4 dB de basses ;
- Fichier → Exporter en MP3, 192 kbps.

4. La variante tout-en-un (Eleven Music : le fond et la voix d'un coup, l'effet moins maîtrisé) :

```
Hip-hop radio drop, about 4 seconds: a massive 808 boom and a vinyl stop, then an extremely deep, slowed-down, pitched-down male voice slowly says "Deadlock Records Radio" with heavy echo, ending on a long dark reverb tail.
```

Paroles : `Deadlock... Records... Radio`

Pour le jeu : dans `jingles/` (pas `voix/` : c'est un jingle, il passe APRÈS la voix de l'animateur, avant
le morceau suivant). Fait le 2026-10-16 : `jingles/01-deadlock-records-radio.mp3` et
`jingles/02-certified-classic.mp3`, la variante clin d'œil.

### Les jingles féminins

J6 — l'indicatif chuchoté sur un beat (Eleven Music)

```
Radio station ident jingle, about 6 seconds. Chill lo-fi hip-hop at 80 BPM: soft dusty drums, warm Rhodes chords, vinyl crackle, round sub bass. A smooth, husky female voice whispers "Deadlock Records Radio" very close to the mic, intimate and confident, ending on a soft reverb tail. Late-night Monaco, luxury and calm.
```

Paroles : `Deadlock Records Radio.`

J7 — le refrain R&B (Eleven Music)

```
Melodic R&B jingle, about 8 seconds, 75 BPM: smooth neo-soul chords, gentle finger snaps, warm bass. Stacked female vocal harmonies sing "Deadlock... Records... Radio... Monaco nights" as a silky hook, ending on a held harmony that fades out cleanly.
```

Paroles : `Deadlock... Records... Radio... Monaco nights`

J8 — l'appel et la réponse, homme et femme (Eleven Music)

```
Hip-hop radio jingle, about 5 seconds, 88 BPM boom bap beat with a DJ scratch intro. Call and response: an energetic male hype voice shouts "Deadlock Records!", then a smooth, relaxed female voice answers "...Radio." Ends on a vinyl stop.
```

Paroles : `Deadlock Records! ... Radio.`

(Plus maîtrisé : reprendre le duo D4 du § 2 ter et le poser sur un petit « bed » instrumental dans Audacity.)

J9 — le chuchotement façon « drop » (la réponse féminine au J5)

Le pendant du J5 : là où lui descend dans les graves, elle chuchote, et c'est l'écho qui fait l'effet.

1. La phrase (Text to Speech) : la voix du § 1 bis, **Eleven v3**, la stabilité sur « Natural », la
   vitesse vers 0,85.

```
[whispers] Deadlock... Records... Radio.
```

La variante :

```
[whispers] You're listening to... Deadlock Records Radio.
```

2. L'effet, dans Audacity :

- Effet → Écho (*Echo*) : délai 0,35 s, atténuation 0,4 ;
- Réverbération (*Reverb*) : grande salle, mixage « humide » vers 35 % (plus que le J5 : le chuchotement
  doit flotter) ;
- Basses et aigus (*Bass and Treble*) : +3 dB d'aigus (le souffle ressort), −2 dB de basses ;
- Fichier → Exporter en MP3, 192 kbps.

## 4. Les stingers sans voix (Sound Effects)

La durée réglée à la main (2 à 4 s).

S1

```
DJ vinyl scratch followed by a deep 808 bass hit, hip-hop radio transition.
```

S2

```
Tape stop effect slowing a lo-fi hip-hop beat down to silence.
```

S3

```
Luxury supercar engine purring past, blending into a soft jazzy piano chord.
```

S4

```
Yacht horn echoing across a harbor, followed by a chill bass drop.
```

Astuce : pour un vrai son de radio, on peut poser une transition parlée sur un petit fond musical (un
« bed » instrumental de 8 à 10 s fait avec Eleven Music, dans le style du J1) dans un éditeur audio ;
sans ça, la voix seule entre deux morceaux marche aussi.

## 5. Pour le jeu

- Télécharger en **MP3** (44,1 kHz, 128 ou 192 kbps).
- Déposer les VOIX (les transitions parlées, § 2, 2 bis et 2 ter) dans
  `public/assets/radio/deadlock-records/voix/`, les JINGLES et les stingers (§ 3 et 4, J6 à J9 compris)
  dans `public/assets/radio/deadlock-records/jingles/` (ou me les envoyer en vrac) ; les MUSIQUES de la
  station, elles, directement dans `public/assets/radio/deadlock-records/`.
  Puis `npm run radio:scan` : les durées exactes, les silences des bouts coupés, les volumes égalisés.
  Sans aucune musique, une station joue le grésillement d'une CB en boucle (par blocs de 45 s), ses
  intermèdes entre deux. Le 2026-10-16, DEADLOCK a reçu son indicatif (01), puis son premier morceau,
  « Daghe!! » (un WAV converti en MP3 ; l'original dans `radio-originaux/`), deux autres voix (10, 11),
  les deux jingles à la voix grave (J5), les stingers S1 et S2, puis deux autres morceaux (« Musette »,
  « Articule fréro!!!! »), et enfin vingt-quatre d'un coup : 27 morceaux, le bandeau n'affichant que leur
  titre (tout est de Deadlock Records). Les morceaux livrés en 320 kbps sont ré-encodés en 128 kbps (le poids
  de la build ; les originaux dans `radio-originaux/`). Les « bonus » pas encore activés y attendent aussi.
- L'ORDRE : entre deux morceaux, une VOIX puis un JINGLE (2026-10-16, Paul : le jingle « après les voix,
  avant de passer à la musique suivante »), après chaque morceau (`jingleEvery: 1` dans `station.json`) ;
  dans chaque dossier, à tour de rôle dans l'ordre alphabétique des noms (`01-indicatif.mp3`,
  `10-legendaire.mp3`…).
- L'ALTERNANCE des deux voix : l'ordre étant alphabétique, les noms proposés au § 2 bis et 2 ter
  intercalent la co-animatrice et les duos entre les lignes de l'animateur (`01-indicatif.mp3`, puis
  `01d-ouverture.mp3`, puis `01f-indicatif.mp3`, puis `02-…`) : on n'entend jamais trois fois de suite la
  même voix. Même chose pour les jingles : nommer les féminins `01f-…`, `02f-…` dans `jingles/` pour
  qu'ils alternent avec les autres, et éviter qu'un jingle féminin suive une voix féminine trop souvent.
  (Vérifié le 2026-10-16 : le tri du scan donne bien cet ordre, le tiret avant les lettres. Mais à
  condition que les lignes de l'animateur existent aussi : ce jour-là, seules 01, 10 et 11 sont dans le
  jeu ; avec les fichiers de la co-animatrice seuls, 05f à 09f passeraient cinq fois de suite.)
- Tous seront entendus, même avec peu de morceaux : la grille de la station répète les morceaux
  (mélangés à chaque tour) autant de fois qu'il faut pour placer chaque voix et chaque jingle.
- Les DROITS : vérifier que l'offre ElevenLabs utilisée permet de mettre ces sons dans un jeu (à notre
  connaissance, l'offre gratuite demande de citer ElevenLabs et interdit l'usage commercial ; les offres
  payantes l'autorisent) : à confirmer dans leurs conditions.
