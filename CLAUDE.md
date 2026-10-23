@../game-studio/STANDING_CALLS.md
@../game-studio/ANTI_PATTERNS.md

# CLAUDE.md: Dungeon Co-op (working title)

The two files imported above are the owner's standing calls and what failed before. Follow every **(every game)** call; follow an **(if it fits)** call only if "This game" below lists it. `AI games/CLAUDE.md` (the build manual) loads too, because this folder is inside `AI games/`. At kickoff, also read `../game-studio/STUDIO.md` (phases and gates).

## This game
- **What it is:** a 2D, turn-based co-op dungeon RPG for 1 to 4 friends, D&D style, with Slay the Spire-style runs. **It belongs to all the friends**, not only the owner: never frame it as one person's game. Whoever owns an aspect has the last word on it (FRIENDS.md lists who wants what). The team writes French.
- **Focus aspect:** co-op combos in turn-based fights (then repeat runs, once combos reach 9/10).
- **9/10 for it looks like:** the four friends beat the boss with a combo between two players, previewed before anyone committed. Reference: Baldur's Gate 3, Grease then Fire Bolt.
- **The slice:** one room on a grid, four heroes, a few enemies and a leader; in the first round two heroes can set up and finish a combo.
- **The design:** CORE_LOOP.md, FIGHT_RULES.md, LEVEL_STRUCTURE.md, STORY_STRUCTURE.md, CLASS_TEMPLATE.md. Change a rule there first, then in code.
- **The look:** `DESIGN.fr.md` is the visual template for every screen and every build (colours, fonts, pixel art, frames, HUD layout, check list). Read it before touching anything the player sees; a look that is not in it goes in it first.
- **Out of scope:** real-time action, PvP, a phone version, in-game chat, open world. New ideas go in GAME_SPEC.md's parking lot.
- **(if it fits) calls this game takes on:** 14 (a game for friends) only. **Overrides of the manual:** 2D, not 3D; a mouse cursor, not locked-mouse look; heroes come from the LPC generator through `lpc-sprite-mods`, not the Blender MCP; the story is the team's to write, never Claude's.
- **Players:** co-op for 1 to 4; the party is always four heroes · **Live build:** https://dungeoncoop.0xbaba-eth.workers.dev (the owner's Cloudflare account, Workers Builds from `main`, a preview per PR) · **The owner's route:** live link → Host → share the five-letter code → friends join → the fight.

## Every change is a mission
- **Use the `mission-camp` skill** (`.claude/skills/mission-camp/SKILL.md`, loaded automatically in this repo) for anything built, drawn or written for DungeonCoop: find or create the mission (an issue with an `axe` and a `taille`), take it (`--add-assignee @me`), then a PR with « Ferme #n ». The reference copy is in the dashboard repo (`skills/mission-camp/`); the checks warn when the two differ.
- **Only what lands on `main` counts** for the builders' renown. The workflow `missions-auto.yml` runs on every push to `main`: it closes the missions the PR names, assigns them to the author and sizes them if nobody did; a PR or direct push with no mission becomes a mission, closed, sized by lines changed (S under 150, M under 600, L above).

## Every PR has a patch note
The camp's crier (`src/38_crieur.js`) opens the « Patch notes » when clicked (`src/48_patch_notes.js`): it shows, for each PR merged into `main`, only its **`## Patch note`** section. Every PR body has one (the PR template and the `mission-camp` skill ask for it):
- **2 to 5 sentences in French** on what a player will see or feel, for someone who never opened the code.
- **Funny**, in the voice of a village crier (« Oyez ! … »), with a small joke; but true, never invented.
- **No code and nothing technical:** no file, function, branch or tool name, no « module », « test », « CSS », « PR ». A purely technical PR says what the player gains, or laughs about it.
- **One or two photos of the game when possible:** commit the capture to `docs/patch-notes/<n>-<subject>.png` (under 300 KB) and link it as `https://raw.githubusercontent.com/Mastre-gaming/DungeonCoop/main/docs/patch-notes/<n>-<subject>.png`, or the person drags it into the PR on GitHub.
- Write it with the person and let them reread it: the game's texts belong to the team.

## The plans follow the design
The missions board has a « Plans » tab (`src/45_plans.js`, mission #157): the game's plans as sheets, for every player. **A design `.md` that changes updates its sheet in `content/plans/` in the same PR** (the format is at the top of `src/45_plans.js`). Sheets edited in the camp are comments on #157 and win over the repo's: read them there first.

## Every new asset goes into the Archives du camp
The camp's archives (`archives.html`, the tent west of the fire) show every asset of the project. **A new character, class, spell or animation is not done until it has its card there, in the same PR.**
- **Put it where the archives already read** (`src/archives/catalogue.js`), and it appears on its own:
  - Characters: `src/entrainement/persos.json` (training ground) or the camp list in `personnages()` of `catalogue.js`.
  - Classes: `src/entrainement/regles.js` (`HEROS`) or `content/classes/*.json`.
  - Spells: `CAPACITES` in `src/entrainement/regles.js`, with their icon and sheet (`src/entrainement/fiches.js`).
  - Animations: Fraps's scenes in `design/animations/esquisses/` (then `node index-esquisses.mjs` from `design/animations/outil/`), combat bricks in `src/entrainement/effets.json`.
- **Anything else** (a new kind of asset, a sheet kept somewhere new): add it to `catalogue.js` with its name, group, sheet, animations, credits and one line saying what it is, and add a check in `src/archives/tests.js`.
- **Prove it in the PR:** the link to its card (`archives.html?onglet=<rayon>&id=<id>`), `archives.html?test` green, and its source and license in `CREDITS.md`.

## Before anything
- **`KICKOFF.md` must be signed off.** No code until it is (gate K).
- **`GAME_SPEC.md`** holds the plan and the state; update it the same day anything changes.

## Skills
- **Load the `game-skills` skill first.** It lists the installed game skills, the library they come from (`AI games/skills/`) and the asset licenses.
- **Start from `game-core` plus every skill that fits a non-focus aspect.** Build only the focus aspect fresh. Say in writing which skills you use and what you build fresh.
- **Plug in:** copy each skill's `module/` into `src/skills/<name>/module/` (`game-core` goes in as `core`). Read each used skill's `PITFALLS.md`.
- **Quality bars:** every skill is `draft`, and its quality bar is the floor for its aspect here.

## DeadSlide is reference only
- `../deadglide/` is opened with `--add-dir` so you can read how something was done (`REUSABLE_SYSTEMS.md` is the tour).
- **Never edit it.** Do not copy its code you do not understand line by line; prefer the skill when one exists.
- New setting, fresh art and layout: never DeadSlide's world renamed.

## Gates you enforce (STUDIO.md has the why)
- **F, fixes first:** while any item is "fixed: awaiting your check", build nothing new. Remind the owner which ones are waiting.
- **P, scope:** a new idea mid-build names what it replaces, or it goes in the parking lot. A new mode or game is a new project.
- **T, one then more:** a new kind of moment is built once and scored before it is multiplied.
- **Q, ask:** standing call 8. Anything that changes time, the camera or the player's speed is proposed, never built unasked.
- **N, unattended runs:** only on a build scored 5/10 or more, with at most 5 items each with their 8/10 written, and a playtest booked for the end.
- **A, assets:** the hero asset (KICKOFF.md §3: what the look rests on) is in the game and scored on day one. If this game takes on standing call 4, it comes through the Blender MCP: check each model with the MCP's `look` before exporting, and say before using a generation credit.

## Reporting a fix
- **Reproduce first**, as a script, on the owner's route (KICKOFF.md §6, or the one the report names), before changing anything.
- **Check after the change** on that route, from every side it can happen (both sides of a door, each camera, each weapon).
- **Report "fixed: awaiting your check"**, with the route and a still. Never "fixed" or "done".

## Tests, screenshots, commits
- **Tests:** the manual §2 and §3 and the `browser-playtest` skill: headless driver, `?test`, stages for every feature.
- **Sound tests:** muted; measured offline where possible.
- **Never commit:** downloads (`dl/`) and secrets.

## Feedback
- **Format:** the owner writes notes in `../game-studio/FEEDBACK.md` form. If a note is missing a part (where, what 8/10 looks like), ask for that part only.
- **Player reviews:** log them in `FEEDBACK.md`, explain, recommend an order, and build only what the owner picks.
