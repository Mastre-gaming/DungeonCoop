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
- **Out of scope:** real-time action, PvP, a phone version, in-game chat, open world. New ideas go in GAME_SPEC.md's parking lot.
- **(if it fits) calls this game takes on:** 14 (a game for friends) only. **Overrides of the manual:** 2D, not 3D; a mouse cursor, not locked-mouse look; heroes come from the LPC generator through `lpc-sprite-mods`, not the Blender MCP; the story is the team's to write, never Claude's.
- **Players:** co-op for 1 to 4; the party is always four heroes · **Live build:** _(created at M1)_ · **The owner's route:** live link → Host → share the five-letter code → friends join → the fight.

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
