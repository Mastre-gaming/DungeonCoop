# LEVEL STRUCTURE (design draft)

From the owner's answers on 17 Oct 2026. The story, and what a chapter means story-wise, belong to the team and are decided later. This file only sets the shape of a run.

## Decided
| Question | Answer |
|---|---|
| Map shape | a line of rooms, with side choices |
| Same map every run? | the layout is fixed; what's in each room is shuffled from a pool |
| Room types | fight, elite fight, story event, rest, shop, treasure, turn-based training mini-game, puzzle or trap |
| Rooms per run | 9 |
| End of a chapter | the group picks one of two bosses |
| Getting harder | more enemies, tougher types, nastier rooms (hazards, surfaces), enemies with new tricks |
| Whole party down | back to the last rest room |
| Chapters in the first full version | 3 |

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

## What's shuffled each run
- which enemy group is in each fight room, from that chapter's pool;
- which event, puzzle and mini-game appear;
- what the shop and the treasure room offer;
- the two bosses on offer, from the chapter's pool.

**Pools needed per chapter for runs to feel different:** about 8 enemy groups, 4 events, 3 puzzles, 2 mini-games and 3 bosses. Three chapters is about three times that. This is the content the builder loop fills, one owner per kind.

## In scope now: the training mini-game
Paolitus's idea comes in as a **turn-based** room: short sparring challenges on the grid (for example, "knock three dummies off the ledge in two rounds"). It stays turn-based, so "no real-time action" still holds. Paolitus owns chapters and events, so it's his room to design.

## The wipe roll (owner, 17 Oct: "roll for gold, consumables, items")
When the whole party falls, everyone wakes at the last rest room, and **each hero rolls a d20** in plain view (first-draft numbers):

| d20 | That hero loses |
|---|---|
| 1 | one piece of gear (chosen at random) **and** half their gold |
| 2–5 | one piece of gear (chosen at random) |
| 6–10 | all their consumables (potions, flasks) |
| 11–15 | half their gold |
| 16–19 | a quarter of their gold |
| 20 | nothing; they also find a potion |

- Levels and unlocks are never lost.
- Advantage from teamwork applies here too: a hero who revived an ally during the lost fight rolls with advantage.
- The room that wiped the party keeps its enemies, so the retry is the same fight with a better plan.

## Tensions
1. **A run still can't be lost outright.** The wipe roll makes failure hurt without ending the run. If endless retries flatten the tension, add a limit later (for example, the third wipe in a run ends it). Watch for it in the first runs.
2. **The fight length decides everything.** This plan only fits 65 minutes if a fight takes about 7 minutes. FIGHT_RULES.md's first estimate is about 20 minutes. The paper fight settles it; if fights stay long, a run drops to about 6 rooms.
3. **A fixed layout.** Replay comes only from shuffled contents and the boss choice. If three runs of the same chapter feel alike, move up to a new layout each run, built from the same hand-made rooms (round 2's other option).
