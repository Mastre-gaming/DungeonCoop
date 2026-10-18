# GAME_SPEC: Dungeon Co-op (working title)

The plan and the actual state, kept in step. Claude updates it the same day anything changes; the owner reads "Now" before every round. The game belongs to all the friends ("This game should feel like everyone's, not mine only"). Why this file exists: findings F1 and F2.

**The design lives in its own files:** `CORE_LOOP.md`, `FIGHT_RULES.md`, `LEVEL_STRUCTURE.md`, `STORY_STRUCTURE.md` (+ `.fr`), `CLASS_TEMPLATE.md` (+ `.fr`), `PAPER_FIGHT_KIT.md`. The friends' answers are in `FRIENDS.md`. This file points to them and doesn't repeat them.

## Now
- **Current stage:** D, the design stage, and M1 "the camp" starts (KICKOFF.md signed off 18 Oct). First code: the camp prototype v0 (`CAMP.fr.md` §7).
- **Live link:** https://dungeoncoop.0xbaba-eth.workers.dev (the owner's Cloudflare account, 18 Oct): rebuilt on every merge to `main`, a preview per PR. Empty until the camp's first code lands.
- **Camp v0, step 1 of 5 (18 Oct, branch `donbabaa/camp-v0`, not committed):** the empty camp in LPC tiles (42 x 28, the clearings plan), the 8 places at level 0, the small fire, the map board, the starting hero walking and running, the dead-zone camera, `?visite`, named screenshots in `shots/`. Then, on the owner's note: the map board twinkles (missions to take, or a first visit in this browser) and opens the missions panel on a click or E, with the dashboard work board's tasks read live from Paul's Worker. `?test` 60/60 (visit 5/5). Waits for the owner's look and score.
- **The training ground (#14, 18 Oct, branch `paul/terrain-entrainement`):** E in front of the camp's training ground opens `entrainement.html`, the D1 "Salle d'essai" fight played **without squares** (each class has a maximum distance per turn, in metres; `FIGHT_RULES.md` « On trial »), in a room of 24 × 16 squares (36 × 24 m) in LPC pixel art. `?test` 44/44, the camp 138/138. Trial classes at the entrance (#76, branch `paul/classes-essai`): pick each of the 4 heroes among the kit's 4 and 4 trial classes made to `CLASS_TEMPLATE` budget (Éclaireuse 10.5 m, Chevalier 6 m, Druide 9 m, Barde 9 m; `design/terrain-entrainement/CLASSES_ESSAI.fr.md`). Together (#80, branch `paul/terrain-multi`): in a camp group, E at the training ground takes the whole group to a lobby where each player takes hero places and picks their classes; the host starts, holds the rules and dice, and the heroes' phase ends when everyone is ready; each sees the others' pointer and what they are preparing. Health bars and names over heads: V for enemies, Shift+V for allies. A team change or Rejouer no longer reloads the page. `?test`: training ground 127/127, camp 263/263; checked for real with two browsers (PeerJS). Next: the bigger enclosure in the camp (#77). Waits for a playtest and a score.
- **The Deadlock radio at the camp (#94, 18 Oct, branch `paul/radio-deadlock`):** a bard sits by the fire with a medieval lyre and a speaker; DEADLOCK RECORDS RADIO (Mastres Racing's live station: 27 Deadlock Records tracks, host voice and jingles through the "small radio" filter) plays in the whole camp, louder near the speaker; E in front of him: what is playing, next song, off. Engine in `src/audio/` as delivered; `design/radio/README.fr.md`. Next: the Settings menu, music and effects (#95).
- **The armoury, the class creator (#125, 18 Oct, branch `paul/createur-classe`, first base, awaits the team's look):** E in front of the camp's armoury opens `classe.html`: each friend designs their own class inside the game's frame, with the build previewed live (final health, metres per turn, modifiers, each ability's graze/hit/critical damage, what blocks and what is only advised), saves it in the browser, exports the JSON (`content/classes/<id>.json`, by PR) or the text sheet (the `CLASS_TEMPLATE` format), imports one, opens the 5 shipped examples. The frame itself is written down in `CLASS_FRAMEWORK.fr.md` (BG3/5e-inspired: 27-point buy, 10 class points, damage tiers T1/T2/T3, range and area bands, the shared resources, the combo hooks, role envelopes as advice, the forbidden list, the in-play bars, the level skeleton, the class JSON format) and in machine form in `src/classe/cadre.json`; the editor's « Le cadre » tab shows it and lets anyone retouch a number on their own sheet and copy the changed frame to propose it. Found on the way: the `CLASS_TEMPLATE` rogue example only spent 24 of its 27 stat points (fixed: WIS 13). `?test`: armoury 95/95, camp 342/342, training ground 133/133. Next: a playable effect vocabulary so an exported class enters the training ground without being recoded.
- **Current score of the focus aspect:** 9/10 "fun" from the D1 fight (18 Oct, team turn only, `design/combat-d1/COMPTE_RENDU.fr.md`). Not yet a score of combos against the 9/10 bar.
- **The training ground's enclosure in the camp (#77, 18 Oct, branch `paul/enclos-terrain`):** the training ground is an 8 × 8 enclosure in the heroes' clearing (rope fence and posts like the fight's room, packed-earth floor, a 2-square entrance at the end of the path); what is inside grows with the place's level (targets, scarecrows, the rack, then torches). A proposal: the camp's owner chooses. `?test` camp 265/265, `verifier.py` OK.
- **Waiting on the owner's check (gate F):** nothing.

| Item | Fixed on | Route to check it | Owner: confirmed / reopened / waived |
|---|---|---|---|
| The map board twinkles and opens the missions panel (click or E) with the work board's tasks | 18 Oct | live link → walk to the map board right of the fire → click it, or E in front of it | confirmed (18 Oct: « tout marche ») |

## The focus aspect
- **The aspect:** co-op combos in turn-based fights. Repeat runs become the focus once combos reach 9/10.
- **9/10 looks like:** the four of you win the first playable's boss fight with at least one combo between two players' builds, and the game showed what the combo would do before anyone committed. Reference: Baldur's Gate 3, Grease, then Fire Bolt; notice that one sets it up and the other finishes it.
- **The first minute a friend plays:** opens the live link, joins with the five-letter code, takes their hero, and is in one room on a grid. On their turn they move, hover an enemy to see the chance of each result, and roll. Within the first round, two heroes can set up and finish a combo.

## Out of scope
Real-time action · PvP · a phone version · voice chat, and text chat during fights (Discord) · open-world exploration. (The team's messaging from the dashboard opens in the camp's HUD, through the camp's mailbox: owner, 18 Oct.) Parked: voice acting (ElevenLabs), Claude as dungeon master. New ideas go in the parking lot below (gate P).

## Core loop (details: `CORE_LOOP.md`)
- **The 30 seconds that repeat:** on your hero's turn, move up to 5 squares, use an action and a bonus action, set up a teammate or finish their setup, and roll the d20 to see how well it lands.
- **What changes over a session:** a run of 9 rooms in a line with side choices (about 65 min). Fights give abilities, upgrades, looted gear and gold. The group picks one of two bosses at the end.
- **What carries over:** heroes level up permanently (up to 20, subclass at 3). Gear, gold and consumables are lost on a wipe roll.
- **Why a friend plays again:** shuffled rooms and bosses, new levels and subclasses, and content their friends added since last time.

## Quality bars
| What | 9/10 means | Reference | Owner's latest score (date) |
|---|---|---|---|
| Co-op combos (focus) | the boss is beaten with a combo between two players, previewed before anyone committed | Baldur's Gate 3: Grease, then Fire Bolt | |
| Pace | a full round with four players fits the agreed time (4.5 min at most, owner; faster asked by both friends) | Slay the Spire's quick turns | |
| Reading a fight | the chance of each result on hover is always exact; whose turn it is reads at a glance | Baldur's Gate 3's hover and initiative bar | |
| Luck | no fight is lost to one roll; a fumble is funny, never worse than a lost turn | Mario Party, to avoid (Paolitus) | |
| Nobody carries | no hero deals more than 40% of the team's damage | Paolitus's "never" | |
| Heroes (hero asset) | each hero's class and look read at the game's zoom | the LPC generator's preview | |
| Adding content | a friend adds a new ability in one file in under 30 min, the checks pass, nothing else breaks | the owner's notes | |

Standing calls taken on: 14 (a game for friends).

## Assets and licenses
Nothing goes in the game without a line here. Credits also go in the game's `CREDITS.md` and on a Credits screen.

| Asset | Source (URL) | License | Credit written | In the game since |
|---|---|---|---|---|
| Heroes (gate A) | Universal LPC Spritesheet Character Generator, modified in Sprite Painter (`lpc-sprite-mods`) | per piece: CC0, CC-BY, CC-BY-SA, OGA-BY, GPL | from the generator's credits export | the starting hero and the sentinel, 18 Oct (`CREDITS.md`) |
| Camp tiles and decorations | LPC Base Assets, [LPC] Medieval Village Decorations, Camp Fire Animation (OpenGameArt) | CC-BY-SA 3.0 / 4.0, GPL 3.0 | `CREDITS.md`, `public/assets/credits/` | 18 Oct |
| Tiles, monsters | OpenGameArt LPC sets | checked per set | | |
| Rules and monsters (adapted) | D&D 5e SRD 5.1 | CC BY 4.0; the SRD's credit line; no "D&D" in the name | | |

## Milestones
Each ends in something played on the live link (or, in stage D, on paper) and scored. M1 is the asset proof (gate A), shown in the camp.

| # | Result you play | Check, and the score that passes | Status (date) |
|---|---|---|---|
| **D1** | **The paper fight**, both turn modes, with the test classes (`PAPER_FIGHT_KIT.md`) | the measure sheet filled in; "fun with four" 5/10 or more; turn mode, health and fight length decided from it | played 18 Oct in the "Salle d'essai" (`design/combat-d1/`), team turn only: won in round 5, 8 min 53, 4 combos, fun 9/10, Voleur 68 % of damage. Initiative order not played yet; the decisions are #26 |
| **D2** | **Each friend's class** on the template, the group picks the first four | four sheets within budget, each with a combo hook into another class | not started |
| **D3** | **The world sheet**, written by the team (the owner scrapped the suggested hooks) | one page the group agrees on; chapter 1's place, enemies and two bosses named | not started |
| **D4** | **One hero sprite** in Sprite Painter, scored | the owner's score of 7/10 or more (gate A brought forward) | not started |
| M1 | **The camp** (`CAMP.fr.md`): repo and live link, the pixel-art camp with one place per creation axis, four heroes walking freely, host and join with a code; closed missions (the game's issues) grow the places live; the camp shown on the dashboard | a hero walks the whole camp without getting stuck; two browsers join, move, leave; a mission closed on the dashboard grows its place on both within 5 s; the heroes and the camp scored 7/10 or more; score in `../game-studio/SCOREBOARD.md` (gate S) | started (18 Oct) |
| M2 | Roll for it: turn order, d20 with stats and the exact chance of each result, enemies with habits, content rules v1 | a seeded fight replays in `?test`; the chances shown match 10,000 simulated rolls; "turns read clearly" 6/10 or more | not started |
| M3 | First playable: the four chosen classes, statuses, surfaces, shoves, a team move, revives, a leader and a small boss | the four of you win with a combo; "fun with four" 5/10 or more, **or the fight rules change before anything is built on them** | not started |
| M4 | The first run: 9 rooms, rewards, the wipe roll, levels that persist, a choice of two bosses | three runs of the same chapter feel different | not started |

Each milestone has at most 5 items and fits one session. Items are broken down when the milestone starts.

## Progress: systems, plan against state
| System | Planned | State | Owner's last score | Skill used or extracted |
|---|---|---|---|---|
| Loop, saves, `?test`, screenshots | M1 | started (18 Oct): `?test`, `window.dbg`, named screenshots, build stamp | | `game-core` |
| Online play (host, join, rejoin) | M1 | not started | | `party-net` (adapted) |
| Heroes from LPC pieces | D4, M1 | not started | | `lpc-sprite-mods` |
| Grid, line of sight, pathing | M2 (the camp in M1 has free movement, no grid) | not started | | `grid-building` (logic only) |
| Fight rules, d20, stats | M2 | not started | | built fresh (focus) |
| Combos: statuses, surfaces, shoves, team moves | M3 | not started | | built fresh (focus) |
| Rewards, levels, wipe roll | M4 | not started | | `run-progression` |
| Shared saved characters and the shared story campaign | M4 (the campaign); characters later | not started | | `edge-leaderboard` (adapted) |
| The living camp | M1: the camp, grown by the team's missions (`CAMP.fr.md`); its people and story once axis 1 has an owner; runs leave from it at M4 | started (18 Oct) | | built fresh |
| The campaign journal | after M4 | not started | | built fresh |
| Team workflow (repo, checks, previews) | before M1 | guides and drafts written, nothing pushed | | `docs/` |

## Parking lot (gate P)
One line each. Nothing here is built until the owner moves it up and says what it replaces.

| Date | Idea | Would replace | Decision |
|---|---|---|---|
| 17 Oct | Voice acting with ElevenLabs | | parked; audio comes last, on a credit budget |
| 17 Oct | Claude as dungeon master | | parked; needs a server and costs per call |

Moved into scope on 17 Oct: Paolitus's training mini-game, as a **turn-based** room (LEVEL_STRUCTURE.md).

## Open questions
| Date | Question | Who answers | Answer (date) |
|---|---|---|---|
| 17 Oct | Initiative order or team turn | the paper fight (D1) | team turn played (18 Oct); initiative order still to play before #26 decides |
| 17 Oct | Round 4.5 min and fight 7 min don't fit together (about 1.5 rounds per fight) | D1 | with enemies and dice automatic, the heroes' phase took 39 s a round after the first (18 Oct); the fight took 5 rounds. To decide in #26 |
| 17 Oct | Permanent levels vs "every run starts weak"; enemies must scale to level 20 | the owner, after the first runs | |
| 17 Oct | Should a third wipe end a run? | the first runs | |
| 17 Oct | Who owns: fight rules, classes, monsters, rooms and the map, pixel art | the group | |
| 17 Oct | The world and the story | the team (D3) | |
| 17 Oct | The story frame (`STORY_STRUCTURE.md`): does Paolitus agree? | Paolitus | |
| 17 Oct | The End boss: what counts as wear, how much, when its fight opens, a floor | the owner, Paolitus | the End boss is never beaten: the wear is the team's score. Every finished run adds wear, more for the harder boss. How much: the first runs. A direct fight against it: still open (17 Oct) |
| 17 Oct | Chapters in any order: who picks (group or draw), and difficulty that follows the heroes' level rather than the chapter number | the owner, Paolitus | the game draws the next chapter (owner, 17 Oct); difficulty follows the heroes' level, not the chapter number (owner, 17 Oct; FIGHT_RULES.md) |
| 17 Oct | The living camp: what grows there, and does it change fights or only the story? | the owner, Paolitus | ideally both; details in a second phase (owner, 17 Oct). First, it grows with the team's missions: one place per creation axis (owner, 18 Oct; `CAMP.fr.md`) |
| 17 Oct | After the End boss | the owner | an epilogue once the 3 chapters' chains are finished, then the friends add new arcs and chapters as content, like builds (owner, 17 Oct) |
| 17 Oct | Story archetypes: their own list or the four roles; how many | the team | their own list, work in progress: Fighter, Support, Ranged, Mage (owner, 17 Oct) |
| 17 Oct | The game's name | the group | |
| 17 Oct | The answers still missing from the remaining friends | the friends | |
| 17 Oct | The GitHub plan for enforcing checks on a private repo | the owner | the repo is public, so the main-branch rule is free (17 Oct) |

## Decisions
| Date | Decision | Evidence it was based on | Reversed? |
|---|---|---|---|
| 17 Oct | 2D pixel art, LPC heroes, three.js with a flat camera | the owner's kickoff answers | |
| 17 Oct | Co-op 1–4, the party is always four, `party-net` host runs the game | kickoff | |
| 17 Oct | Visible d20; attacks always hit and the roll grades them; 1 is a funny fumble, 20 a critical | owner's fight answers; Paolitus: avoid luck deciding everything | |
| 17 Oct | Fixed damage plus a small die; 100 health; 5 squares | owner's fight answers | |
| 17 Oct | All four combo kinds: statuses, surfaces, positioning, team moves | owner; combos rated 9 and 7 by the friends | |
| 17 Oct | 9-room line with side choices, fixed layout with shuffled contents, two bosses to pick, 3 chapters for v1 | owner's level answers | |
| 17 Oct | Wipe: back to the last rest room, each hero rolls to lose gear, consumables or gold | owner | |
| 17 Oct | Classes: six D&D stats (27 points), 10 class points, 3 starting abilities, a weakness, a subclass at 3, no starting gear | owner's class answers | |
| 17 Oct | The story is written by the team; the suggested hooks are scrapped | owner | |
| 17 Oct | Content goes live as soon as its owner merges it | owner | |
| 17 Oct | Story frame (draft, awaits Paolitus): Hades-style flags that survive wipes; run bosses set flags and every run wears down one End boss; classes fall under story archetypes and the story names the hero; event choices by timed group vote. Then: every finished run wears the End boss (more for the harder boss); it is never beaten and its wear is the team's score; the epilogue plays once the 3 chains are finished; archetypes Fighter, Support, Ranged, Mage (WIP); one shared campaign kept online, whoever hosts; chapters modular (any order); a living camp between runs (after M4); an epilogue, then play goes on; a campaign journal for friends who missed an evening | owner, in the story-structure session | |
| 17 Oct | The repo is **public**: github.com/Mastre-gaming/DungeonCoop, friends' answers included | owner: "the repo being public is fine" | |
| 18 Oct | **Building the game is part of the game.** The living camp comes first, as M1 (it replaces "four heroes on a grid room"); the dashboard's work board feeds it: missions are the game's issues, and each closed mission grows its axis's place. Free movement in the camp; camera follows the hero with a dead zone, medium zoom, a whole-camp view on the dashboard | owner: "coder un jeu représente une bonne partie du fun de l'aventure" (`CAMP.fr.md`) | reverses "a living camp after M4" (17 Oct) |
| 18 Oct | KICKOFF.md signed before every friend answered | owner | |
| 18 Oct | Axis 1 (story) has no owner for now; owners are spread once the camp has taken shape | owner | |
| 18 Oct | Camp design (`CAMP.fr.md` §4, §5, §9): the clearings layout (42 × 28); the missions board is the heart of the camp (zones to build, then their missions, each closed by a merged PR containing "Ferme #n"); the first login makes clear the team grows the world by coding and committing; the board in the scenery is a map board with twinkling stars; the starting hero is a basic LPC human with walk and run; a spawn sentinel (LPC knight) asks the dev name on first arrival, linked to the GitHub username through the dashboard's `equipe.json`; LPC packs downloaded into `dl/` with their licences | owner, in the camp design session; the missions panel and the hero are in `LIKED.md` | |
| 18 Oct | Camp v0 answers: the sentinel keeps the design's text (« Halte. Avant d'entrer au camp : quel est ton nom de dev ? », a name box, « C'est moi »), not RENOMMEE §1 bis's buttons; each player types their own name on arrival (empty names in `equipe.json` are fine); one character design for now, 1 to 4 players; the axes (8 in CAMP, 6 in the dashboard) and the places' level art are decided later | owner, camp v0 session | |
| 18 Oct | Camp v0, step 3 brought forward on the owner's note (« le lobby du camp n'est pas multijoueur », « l'animation de la sentinelle n'y est pas »): the sentinel scene at the south entrance (halt, gold « ! », the design's dialogue box and text, salute, steps aside to the left; next time « Rebonjour, … »; E in front of her to change name); host and join with a five-letter code or `?code=`, 1 to 4 heroes, names above heads, leave without breaking the others (`party-net`) | owner | |
| 18 Oct | **The camp's 8 axes are the dashboard work board's 8** (combats, classes, histoire, pixel art, salles, menus, son, technique), described once in `content/axes.json`, read by the game and the dashboard. The south-west slot planned for « la porte du camp » (runs) goes to Technique, provisionally « la forge »; runs missions (4.x) are labelled `axe: salles` and grow the map table | owner: « Le tableau a 8 axes » | replaces CAMP's own list of 8 axes |
| 18 Oct | **A 9th axis, « Le camp » (`axe: camp`)**: no building of its own; its level modernises the whole camp's look and life (levels to be proposed, then chosen) | owner: « créer une nouvelle axe… modernisera le design du camp » | |
| 18 Oct | **The camp's HUD carries the whole dashboard, RPG-style** (`CAMP.fr.md` §8 bis): an action bar at the bottom; work board → quest journal (J) and quest tracker; who does what → party frames; progress → campaign bar; pushes → camp chronicle; links → satchel; ideas → tavern rumours; messaging → a mailbox in the camp with a notification icon, the messages open in the HUD. Read-only first; one at a time, quest journal first | owner | the dashboard's team messaging moves out of the excluded « text chat » |
| 18 Oct | The mouse wheel zooms the camp camera: one notch = one whole pixel scale (1 to 8), the hero keeps his place on screen, the choice is kept in the browser; not in `?visite` (the dashboard page must scroll) nor while the missions panel is open | owner: « make the players be able to adjust camera zoom with the molette » | |
| 18 Oct | **A finer, animated zoom (#122)**, at the camp and the training ground: one notch = ×1.19 (four notches to double, from the medium zoom), from 1 to 8 (5 at the training ground); the zoom glides to its target in a fraction of a second; the hero (camp) or the point under the mouse (training ground) keeps its place; touchpad steps add up to a notch. Between whole scales the world is drawn at the next whole scale off-screen, then scaled down smoothly (the emulators' « sharp bilinear »): crisp pixel art at every level. Colours now pass through unmanaged (identical on screen, checked pixel by pixel), so shadows look the same at every zoom | Paul (Paolitus): « Zoom plus de granularité dans le zoom. L'effet de zoom doit être smooth » | replaces « one notch = one whole pixel scale » |
| 18 Oct | D1 counts as played with the digital "Salle d'essai" (the kit's rules, room and heroes; enemies, dice and measures automatic) instead of paper; #25 closed on it. Players' notes: too much movement, walking on water should not be possible, winning should not only mean beating the boss, their own dice rolls should be visible | owner (`design/combat-d1/COMPTE_RENDU.fr.md`) | the initiative-order fight is still owed to #26 |
| 18 Oct | Camp v0, Claude's calls to check (2): until the axes are decided, `src/data/axes.json` files each dashboard label under the camp place that looks closest (menus → board, combats → training ground, pixel art → workshop, salles → map table, histoire → story corner); `axe: technique` and tasks with no axis show under « Sans lieu »; a closed task with no `taille:` label grows nothing | Claude; owner to confirm when the axes are decided | |
| 18 Oct | Camp v0, Claude's calls to check: the four clearings stay grass (all-dirt clearings were too brown in LPC tiles), with a small dirt yard in front of each place; forest trunks start 2 rows inside each clump and the bottom tree line stands just outside the camp, so no canopy hides a hero in front of a place | Claude, from the screenshots; owner to confirm | |
| 18 Oct | **The builder's renown** (`RENOMMEE.fr.md`): closed missions give each assignee renown (S 1, M 3, L 8, +50 % when done with others, +5 per finished phase). It grows their tent, gives a title, and a podium per plan phase (reset each phase) puts the winner's statue in the camp. Cosmetic and social only: nothing in it changes fights or runs | owner | replaces "no number per person" from `CAMP.fr.md` for people; the camp's places stay the team's |
| 18 Oct | **The training ground (#14)** turns the D1 "Salle d'essai" (Fraps, #74) into a scene of the game, entered from the camp: same rules, heroes, enemies and objective, but **without squares** (a maximum distance per turn per class, in metres; ranges and areas in metres; `FIGHT_RULES.md` « On trial »), a room of **24 × 16 squares** (36 × 24 m, about five times D1), and **LPC pixel art now**: 8 provisional characters from the generator through `lpc-sprite-mods` (the friends' own heroes come with D4 and 3.5). From the D1 notes: deep water is scenery (the pond), a spell's puddle is walkable, and each d20 shows big on the board | Paul (Paolitus): « tester un mode sans case mais avec une distance max par tour selon les classes », « les rooms seront bien plus grandes », « augmente aussi la taille pour le terrain d'entraînement », pixel art LPC right away | the squares stay the rule until #26 decides |
| 18 Oct | **The training ground's enclosure (#77):** in the camp, the training ground has its own footprint, an 8 × 8 enclosure (24, 2 to 32, 10) instead of the 6 × 5 of the other places; its door moves to the enclosure's entrance (27, 9) and the path ends there. Rope fence and posts, packed earth inside; its level shows what is inside (level 1 a target … level 4 torches at the entrance). Claude's proposal, coded directly | Paul (Paolitus): « Code directement l'enclos » | the camp's owner (DonBabaa) validates the plan in the PR |
| 18 Oct | **The class creator (#125):** every friend designs their own class in the game, inside a written frame (`CLASS_FRAMEWORK.fr.md`, first base to confirm with the players): the armoury in the camp opens the editor; the frame's numbers live in `src/classe/cadre.json` and are editable from the editor's « Le cadre » tab to propose a change; a class enters the game as `content/classes/<id>.json` by PR | Paul (Paolitus): « que chacun puisse coder lui-même sa classe… les limites de stats fixées par le jeu, prévisualisation de build… inspire-toi du framework de Baldur's Gate » | the frame changes in the .md and the .json together, after the players have seen it |
| 18 Oct | **Trial classes at the training ground's entrance (#76):** each of the 4 heroes takes one of 8 classes: the D1 kit's 4 or 4 trial classes made to `CLASS_TEMPLATE` budget, each with its own distance per turn and a combo hook (Éclaireuse 10.5 m: Net then Weighted Shot; Chevalier 6 m: Shield Charge, Rally; Druide 9 m: Vine pulls an enemy into a surface or the pit, Rain; Barde 9 m: Battle Song gives advantage, Mockery exposes). Trial classes only: the real classes stay each friend's (#30 to #33); names, texts and looks are provisional | Paul (Paolitus): « propose des classes d'essai à sélectionner à l'entrée du terrain d'entraînement » | |
| 18 Oct | **The training ground together (#80):** a camp group enters together (E at the door; the camp host becomes the training host, same code). Lobby: each player takes one or more hero places and picks their classes; the host picks the turn mode, starts, and plays the places nobody took. In the fight the host holds the rules and dice; the others send their actions; each plays only their own heroes and sees the others' pointer with what they prepare (the combo shows before it is played). The heroes' phase ends when everyone with a hero standing has said "ready"; no undo then (`FIGHT_RULES.md`, "A turn"). A friend who leaves: the host plays their heroes until they are back; the host leaves: everyone carries on alone | Paul (Paolitus): « si on est dans une session multi on peut entrer dans le lobby à plusieurs et choisir sa classe » | |
| 18 Oct | **Health bars over heads** at the training ground: name and health of each creature, V for the enemies, Shift+V for the allies, off until asked, remembered in the browser | Paul (Paolitus): « une barre de vie/name plates activables avec V pour les ennemis et shift V pour les alliés » | |
| 18 Oct | **The Deadlock radio at the camp (#94):** a new NPC, the bard, sits by the fire (west side) with a medieval lyre and a speaker that plays DEADLOCK RECORDS RADIO, exported from Mastres Racing (engine unchanged). Heard everywhere in the camp, louder near the speaker (full within 2.5 squares, 18 % beyond 15); live on the world clock; starts at the first gesture and keeps playing in a hidden tab (no jump on return); E or a click on the bard: previous song, next song, off. In a camp group everyone hears the host's radio (his clock and skips), and a song skipped by anyone is skipped for the whole group. The 27 tracks (94 MB) are in the repo and online, with the band's agreement; ElevenLabs voices credited. The bard's lines and look are provisional | Paul (Paolitus): « Arrivée radio deadlock sur le camp […] designer un nouveau perso : barde avec une lyre médiévale et une enceinte à côté de lui qui diffuse les sons » ; près du feu, plus fort près du barde, les mp3 dans le repo | the Settings menu (music, effects) is #95 |
| 18 Oct | **The training ground's combat UI from the mockups (#129, design in `design/ui-combat/`, #113):** the abilities bar shows each ability's LPC icon, action or bonus, and its hit damage (or what it does); hovering an ability in the bar, or choosing it, opens its sheet above the bar, with no target needed: miss, graze, hit and critical damage and the d20 that lead to each, range, area, cost, d20 bonus and effects (#85); hovering a creature with an attack chosen shows a target card with the chances of each result in % and their damage. The bar, the sheet and the target card are dark wood; the hero cards keep parchment, with health and resource on one line. Zoom (#83) and dialogue skipping (#84) are not in it | the owner: « pourquoi je la vois pas implémentée in game ? … code le truc » ; the mockups he approved (#113) | |
| 18 Oct | **Ability effects in the training ground's fights (#134):** the 42 bricks of the animation library (#127) play in combat as sprites placed by their anchor: projectiles (Spark, Fire Arrow, arrows, Splash, Oil Flask, notes, the mocking bubble), impacts, weapon trails (slash, heavy slash, thrust), the lightning strike, spreading puddles and ice spikes, the rain cloud, healing crosses and light columns, the rally ring; and the states loop on the creatures while they last (Soaked, Oiled, Burning, Frozen, Exposed, Prone, Inspired). The attack scene lasts until the hit lands, so the damage numbers show on impact. Enemies use the same arrows and slashes | the owner: « pourquoi les effets/animations qu’on a créé ne sont pas ingame ? push ça » | |

## How it works (the reference part)
See the design files listed at the top. Controls: mouse cursor on a square grid; click a square to move, an ability (or 1–9) then a target; hover shows range, the chance of each result and what a combo would do; Space ends the turn. The manual's locked-mouse look and 3D defaults don't apply to this game.
