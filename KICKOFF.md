# KICKOFF: Dungeon Co-op (working title)

Filled in at the kickoff session, 17 Oct 2026, from the owner's answers (quotes are the owner's words). Claude asks about any empty line instead of guessing. Each section's why: OWNER_REVIEW findings F1 to F7.

**A first draft. The game belongs to all four friends** ("This game should feel like everyone's, not mine only"). Each friend answers `FRIEND_PROMPT.md` (pitch: `PITCH.md`), and their answers can change any line here before sign-off. Answers so far: `FRIENDS.md`.

## 0. The game
- **What it is:** a turn-based co-op dungeon RPG for 1 to 4 friends. "Kill enemies, go through a dungeon/story line, turn by turn D&D style." Players build their characters from pieces; the four friends also add new pieces by writing code.
- **It is like:**

  | Game | Take | Avoid |
  |---|---|---|
  | Baldur's Gate 3 | turn order by initiative, d20 rolls, rooms with objects that set up combos, the hover hit chance | _(open question)_ |
  | Slay the Spire | the branching map, a pick of one in three rewards after each fight, builds that differ every run | _(open question)_ |

- **Who plays, on what, how long:** "4 friends building it", co-op online for 1 to 4, mainly desktop, each on their own machine. Evenings and weekends. A sitting lasts "depends on how long the team lasts".
- **After ten minutes a player feels:** "Progression, coop builds, us against them, fun easter eggs."
- **The moment it is at its best:** "The players managing to get through the story line levels through ingenuity from their builds, luck and cooperation."
- **Why this game:** a game to keep, "endlessly expandable". "Half the fun is building/coding the game, then showing our friends our builds." The owner wants to learn design depth. A clean break from DeadSlide (no zombies). Not the real-time "Game 2" described in `AI games/CLAUDE.md` §12: real-time action is out of scope here.
- **What carries over:**

  | Item | Call | Why |
  |---|---|---|
  | `game-core` | use | the manual starts every game from it: loop, saves, bus, `?test`, stills |
  | `party-net` | adapt | rooms, the host runs the game, rejoin, loopback test wire; turn-based sends moves, not 12 position updates a second |
  | `run-progression` | use | the owner's pick: "Re-use build/level up mechanic"; rewards, synergies, kept runs |
  | `browser-playtest` | use | testing with nobody at the keyboard; here with four simulated players |
  | `edge-leaderboard` | adapt, later | its one Cloudflare function on KV could keep shared characters between sessions |
  | `grid-building` | adapt | its grid, line of sight and pathing for square-by-square movement; its look scored 3/10, so logic only |
  | `lpc-sprite-mods` | use | LPC heroes with our own touches (Sprite Painter); each friend describes their hero and it is built at dev time (owner's call, 17 Oct; draft skill) |
  | Standing call 14: a game for friends | use | no anti-cheat; co-op first |

  Not taken: standing calls 1 (fluidity: a fast action call), 2 and 3 (cut-ins: `cutscene-director` dropped), 4 (no 3D models in a 2D game), 6 (the owner chose pixel art), 13 (music per place: decided when audio comes). Dropped by the owner: the casino table, the secrets module, `cutscene-director`, `synth-audio`.

## 1. The one focus aspect
- **The aspect:** co-op combos in turn-based fights. Once they reach 9/10, the focus moves to repeat runs (owner: "A.B", confirmed as one at a time).
- **What 9/10 looks like for it:** the four of you win the first playable's boss fight using at least one combo between two players' builds, and the game showed what the combo would do before anyone committed. Reference: Baldur's Gate 3, one character casts Grease and another sets it alight with Fire Bolt. Notice that one sets it up and the other finishes it.
- **The first minute a friend plays:** opens the live URL, joins with the five-letter code, takes a seat, and is in one dungeon room on a grid. On their character's turn they move square by square, hover an enemy to see the exact hit chance, and roll. Within the first round, two characters can set up and finish a combo.

## 2. Out of scope (the list Claude points at when a new idea arrives)
- Real-time action.
- PvP.
- A phone version.
- Voice or text chat (use Discord).
- Open-world exploration.
- **New ideas mid-build go in the parking lot (GAME_SPEC.md), not into the build.** Parked at kickoff: voice acting with ElevenLabs, Claude as dungeon master.

## 3. Assets and licenses
- **How models come in:** none; the game is 2D. Standing call 4 does not apply.
- **The hero asset:** the character sprite kit. Characters are stacked from pieces (body, outfit, hair, gear) with the Universal LPC Spritesheet Character Generator (owner's pick, 17 Oct). Licenses are set per piece (CC0, CC-BY, CC-BY-SA, OGA-BY, GPL). Every author is credited on a Credits screen built from the generator's credits export, and any art we change keeps its share-alike license. In the game and scored on day one (gate A).
- **Animation:** LPC's own frame animations (walking, attacks, casting, getting hit; the exact set is listed from the generator at milestone 1). No skeletal animation.
- **Everything else:** tiles and enemies in the LPC style, so the look matches (OpenGameArt's LPC sets, license checked per set). Rules and monsters adapted from the D&D 5e SRD 5.1 (CC BY 4.0: the SRD's credit line is required, and the game cannot use the D&D name).
- **Music and sound:** last, on a credit budget stated then (manual §8). Voices parked (ElevenLabs).
- **Built in code:** the grid, dice, hit flashes and floating numbers. Never characters or tiles.

## 4. Quality bars
| What | 9/10 means | Reference |
|---|---|---|
| Co-op combos (focus) | you four win the boss fight with at least one combo between two players' builds, previewed before anyone committed | Baldur's Gate 3: Grease, then Fire Bolt |
| Repeat runs (next focus) | three runs in a row play differently and you want a fourth | Slay the Spire: the second run's deck looks nothing like the first |
| Reading a fight | the hit chance on hover is always exact; whose turn it is and who acts next read at a glance | Baldur's Gate 3: the hover hit chance and the initiative bar |
| Characters (hero asset) | each character's class and gear read at the game's zoom | the LPC generator's preview: notice how each piece reads in a 64-pixel frame |
| Adding content | a friend adds a new ability in one file in under 30 minutes, the tests pass, and nothing else breaks | the owner's notes: "endlessly expandable", "without compromising the game" |

Standing calls this game takes on: 14 (a game for friends).

## 5. Players and architecture
- **Single or multiplayer:** co-op for 1 to 4. The party is always four characters: each player who joins takes one, and the leftover characters are split among the players (solo controls all four). Someone joining mid-fight takes a character at the start of its next turn.
- **Turns:** initiative order, as in Baldur's Gate 3. Player characters next to each other in the order share their turn and act in any order.
- **Dice:** visible d20 rolls. Flanking or a teammate's setup gives advantage (roll two, keep the higher).
- **Engine:** three.js (the studio's pinned 0.186.1) with a flat camera looking straight down (owner's pick, 17 Oct). Sprites draw crisp: no smoothing, zoom in whole steps. This keeps `game-core` and the studio's screenshot tools. It overrides the manual's 3D and locked-mouse-look defaults.
- **Architecture:** `party-net`, host-authoritative. Players send moves; the host rolls the dice and sends the results. Joining checks everyone is on the same build. The game saves at each room; if the host leaves, someone hosts again from that room (that fight restarts).
- **How friends join:** a five-letter room code.
- **Hosting:** a private GitHub repo. Each friend works on a branch; a change merges only when the `?test` checks pass on GitHub. Cloudflare Pages publishes the main version to the live URL and each proposed change to its own preview URL.
- **Test from day one:** two browsers join, play and leave (manual §3); four simulated players from milestone 2.

## 6. How I will play-test
- **The build:** the Cloudflare Pages live URL _(created at milestone 1)_. A friend's change: its preview URL, same route.
- **The route:** open the URL → Host → share the five-letter code → friends join → take seats → the fight.
- **When:** after every round, before writing the next request.
- **Friends:** all four code and playtest. Notes in `FEEDBACK.md` form, one score per item. Whoever owns an aspect decides on it and closes its fixes _(who owns what: open question)_.

## 7. Conditions
- **Deadline, if any:** none: "Quality over deadline, building it is half the fun". The first gate is a score: the milestone 3 fight at 5/10 or more for "is it fun with four?" before runs are built.
- **Unattended runs allowed:** none until a build scores 5/10; then only under gate N.

**Signed off by the owner on:** _(date, once the four friends' answers are folded in)_ → Claude may start.
