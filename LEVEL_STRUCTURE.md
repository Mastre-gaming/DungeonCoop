# LEVEL STRUCTURE (design draft)

From the owner's answers on 17 Oct 2026. The story belongs to the team. This file only sets the shape of a run; where story sits in it, and how it moves from run to run, is in `STORY_STRUCTURE.md`.

## Decided
| Question | Answer |
|---|---|
| Map shape | a line of rooms, with side choices |
| Same map every run? | the layout is fixed; what's in each room is shuffled from a pool |
| Room types | fight, elite fight, story event, rest, stall, treasure, turn-based training mini-game, puzzle or trap |
| Rewards | **no gold and no items** (owner, 20 Oct: no currency and no item system during a run, « pas sûr qu'il y en ait besoin »): a reward is **1 ability upgrade out of 3**, free. The **stall** (it replaces the shop) offers one; the **treasure** room offers one, or refilled potions; once the heroes reach the level cap of 20, every room offers one. Potions are the only thing a hero carries |
| Rooms per run | 9 |
| End of a chapter | the group picks one of two bosses |
| Getting harder | within a run: more enemies, tougher types, nastier rooms (hazards, surfaces), enemies with new tricks. Across chapters: enemies follow the heroes' level, since chapters play in any order |
| Whole party down | back to the last rest room |
| Chapters in the first full version | 3, modular: playable in any order (owner, 17 Oct; `STORY_STRUCTURE.md`) |

## A run, as a first layout to test
Rooms 1 to 9 go left to right. Where the line splits, the group votes (CORE_LOOP.md).

```
 1        2         3              4       5              6         7              8      9
Fight -> Fight -> [Event      ] -> Rest -> [Elite     ] -> Fight -> [Shop     ] -> Rest -> [Boss A]
                  [or Puzzle  ]            [or Treasure]            [or Mini-  ]          [or Boss B]
                                                                   [game      ]
```
| | Count | Minutes (target) |
|---|---|---|
| Fights | 3 | 3 × 7 = 21 |
| Elite or treasure | 1 | 10 or 3 |
| Event, puzzle, shop, mini-game | 2 | about 5 each |
| Rest | 2 | about 2 each |
| Boss | 1 | about 15 |
| **Run** | **9** | **about 62 to 67** |

Each side choice trades safety for reward: the elite is harder than the treasure room and pays better.

## How a run is played (owner, 19 Oct)
- **The road comes first** (owner, 19 Oct): the adventure starts with the way from the camp to the tower, **6 rooms shaped like a floor** (proposed: the forest edge, an event or a puzzle, the ford, an elite or a treasure, the mill, the tower door with a mini-boss). **It counts in the 20 levels: +1 level after each room, except the rest room of floors 1 and 2; cap 20.** Road 1→6, floor 1 7→11, floor 2 12→16, floor 3 17→20: level 20 from floor 3's room 4, so three rooms and the Guardian are played at the cap. Once capped, a room gives a reward instead (gold, a potion, an item). An evening grows to about 3 h. Owner, 19 Oct (options A and B).
- **From fight room to fight room**, as in Slay the Spire: no walking between rooms, no corridors. The group picks the next room on the map, and the fight starts in it.
- **Short cutscenes** (a few seconds, skippable) link one room to the next, and one level to the next.
- **Each room is an arena with its own design**, and each level its own identity: tiles, layout, obstacles and surfaces, enemies, light. The training ground is only the draft where the fight system is tried.
- **The fight** is the training ground's system (without squares, `FIGHT_RULES.md` « On trial »), fed with each room's walls, obstacles and enemy group.
- **The entrance** from the camp is a dedicated place, built later; until then the prototype opens at `donjon.html`.

## What's shuffled each run
- which enemy group is in each fight room, from that chapter's pool;
- which event, puzzle and mini-game appear;
- which upgrades the stall and the treasure room offer;
- the two bosses on offer, from the chapter's pool.

**Pools needed per chapter for runs to feel different:** about 8 enemy groups, 4 events, 3 puzzles, 2 mini-games and 3 bosses. Three chapters is about three times that. This is the content the builder loop fills, one owner per kind.

## In scope now: the training mini-game
Paolitus's idea comes in as a **turn-based** room: short sparring challenges on the grid (for example, "knock three dummies off the ledge in two rounds"). It stays turn-based, so "no real-time action" still holds. Paolitus owns chapters and events, so it's his room to design.

## A wipe (owner, 20 Oct; it replaces the wipe roll of 17 Oct)
When the whole party falls, everyone wakes at the last rest room and **loses their potions**. There is no gold or gear to lose any more, so the d20 wipe roll is gone.

- Levels, ability upgrades and unlocks are never lost.
- The room that wiped the party keeps its enemies, so the retry is the same fight with a better plan.

## Tensions
1. **A run still can't be lost outright.** A wipe costs the potions and the walk back, without ending the run. If endless retries flatten the tension, add a limit later (for example, the third wipe in a run ends it). Watch for it in the first runs.
2. **The fight length decides everything.** This plan only fits 65 minutes if a fight takes about 7 minutes. FIGHT_RULES.md's first estimate is about 20 minutes. The paper fight settles it; if fights stay long, a run drops to about 6 rooms.
3. **A fixed layout.** Replay comes only from shuffled contents and the boss choice. If three runs of the same chapter feel alike, move up to a new layout each run, built from the same hand-made rooms (round 2's other option).
