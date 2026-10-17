# PAPER FIGHT KIT (D1)

Play one fight of `FIGHT_RULES.md` with real dice before any code, **once in each turn mode**, and measure it. French version for the table: `PAPER_FIGHT_KIT.fr.md`.

## The evening (about 90 minutes)
| When | What | Who |
|---|---|---|
| Before | Set up the board (below), share the sheets, put a timer on a phone | the owner |
| 0:00 | Rules in 10 minutes: a turn, the d20 table, statuses and surfaces, revive | the owner |
| 0:10 | **Fight 1, team turn** (all heroes act in any order, then all enemies). Time every round | everyone |
| 0:35 | Fill the measure sheet for fight 1; reset the board | everyone |
| 0:45 | **Fight 2, initiative order** (each hero and enemy rolls d20 + DEX; heroes next to each other in the order share their turn). Time every round | everyone |
| 1:10 | Fill the sheet for fight 2, then each player scores both fights and answers the four questions | everyone |
| 1:20 | Paste the filled sheet back into the kickoff session | the owner |

- **Who plays what:** the owner runs the enemies (and owns the fight rules); the four heroes are split among the friends. If there are only three friends, one plays two heroes.
- **Online:** a free browser tabletop such as Owlbear Rodeo (grid, tokens and dice built in), or a shared Excalidraw board plus a dice app, on a Discord call. **At a table:** squared paper, coins as tokens, real dice.
- **Dice each:** d20, d4, d6, d8.

## The room (10 × 8 squares)
```
  A B C D E F G H I J
1 # # # # # # # # # #
2 # . . . . o . . . #      # wall      . floor
3 # . . w w . . a . #      o oil barrel (hit or shoved: Oil on its 3x3)
4 1 . . w w . . g L #      w water
5 2 . . . . . . g B #      _ ledge (row 8 drops into the pit)
6 3 . . . o . . a . #      1-4 heroes start here
7 4 . . . . . . g . #      g grunt  a archer  B brute  L leader
8 _ _ _ _ _ _ _ _ _ _
```
**Goal: defeat the leader** (the rest flee).

## Test heroes (level 1, built with `CLASS_TEMPLATE.md`; test classes only)
Each friend will design their own class; these exist so the rules can be played now. Team moves unlock at level 6, so they're left out of this level 1 test.

**Brute**: tank, twist: throws enemies around · Rage (+10 per hit dealt or taken, max 50) · **145 health**, 5 squares
- Stats: STR 15 (+2), DEX 10, CON 15 (+2), INT 8, WIS 11, CHA 12
- Smash (basic, action): 8 + d4 + 2, adjacent.
- Hurl (setup, bonus): push an adjacent target 3 squares; Prone if it hits a wall or a creature. Spend 20 Rage: 5 squares.
- Taunt (reaction): when an enemy attacks an adjacent ally, it attacks you instead.
- Weakness: Chilled lasts twice as long on you, and you have no ranged attack.

**Storm caller**: damage, twist: controls water · Mana (40, +5 each turn) · **125 health**, 5 squares
- Stats: STR 8, DEX 13, CON 14 (+2), INT 15 (+2), WIS 10, CHA 12
- Spark (basic, action): 8 + d4 + 2, range 6.
- Splash (setup, action, 10 Mana): a 2x2 of Water within 5 squares; everyone in it is Soaked.
- Lightning (payoff, action, 15 Mana): 14 + d6 + 2, range 6; double on Soaked; electrifies Water.
- Weakness: 90 base health (included above); takes double damage while standing in Water.

**Rogue**: control, twist: sets up kills for others · Focus (+1 per setup a teammate uses, max 3) · **115 health**, 6 squares
- Stats: STR 8, DEX 15 (+2), CON 13 (+1), INT 12, WIS 10, CHA 12
- Fire arrow (basic, action): 8 + d4 + 2, range 8; sets Oil alight.
- Oil flask (setup, bonus): a 2x2 of Oil within 4 squares, or Oiled on one target.
- Opening (payoff, action): 8 + d4 + 2, adjacent; the target is Prone. Spend 2 Focus: it's a Critical.
- Weakness: takes double damage from Fire, including their own.

**Warden**: support, twist: freezes the ground · Faith (+1 per heal or guard, max 3) · **140 health**, 5 squares
- Stats: STR 12 (+1), DEX 10, CON 14 (+2), INT 10, WIS 15 (+2), CHA 11
- Staff strike (basic, action): 8 + d4 + 1, adjacent.
- Mend (heal, action): 15 + d6 + 2 to an ally within 6.
- Frost ward (setup, action): a 2x2 of Ice, or turn Water into Ice; enemies on it are Chilled. Spend 3 Faith: 3x3.
- Weakness: can't heal themself.

Every hero can also **shove** (bonus action), **revive** an adjacent ally (action, back at 25 health) and **drink a potion** (bonus action; each hero starts this test with one, 20 health).

## Enemies (they act on their habits; intents are hidden)
| Enemy | Health | Attack | Habit |
|---|---|---|---|
| Grunt × 3 | 30 | 8 + d4, adjacent | attacks the nearest hero |
| Archer × 2 | 25 | 8 + d4, range 8 | keeps 4 squares away; shoots the nearest hero it can see |
| Brute (tough) | 60 | 14 + d6, adjacent, shoves | charges the hero with the least health |
| Leader (tough) | 90 | turns 1–2: gives every enemy advantage; turn 3: 22 + d8 to a 3x3 area | repeats |

Enemies roll the same d20 table as heroes, with +2. Tough enemies have a Graze range of 2–12.

## Fumble table (d6 on a natural 1; never worse than losing the turn)
1. Your weapon slips: the bonus action is lost picking it up.
2. You slip: Prone.
3. Dramatic battle cry, nothing happens: the nearest enemy laughs.
4. You hit a barrel or a puddle: it spills on your own square.
5. You trip into an ally: both move 1 square, no damage.
6. You pose heroically: the next attack against you has advantage.

## What to measure
| Measure | Team turn | Initiative order |
|---|---|---|
| Time per full round (min), each round | | |
| Rounds to win, and total time | | |
| Combos between two players (count) | | |
| Heroes downed / revived | | |
| Did one roll decide the fight? (yes/no, which) | | |
| Damage share of the top hero (%) | | |
| Fun with four, each player 1–10 | | |
| What felt slow | | |

**The four questions for each player afterwards:**
1. Which mode would you play every evening, and why?
2. What was the best moment, and was it a combo?
3. When were you bored, and for how long?
4. One rule you'd change.

Paste the filled sheet and the answers into the kickoff session. They settle turn order, health, fight length and the size of a run, and set the bars that milestones 2 and 3 must hit.

## Already suspected, so watch for it
- **Health is high.** Heroes have 115 to 145 health because unspent class points turn into health. If fights drag, that rule is the first suspect.
- **Fight length.** About 265 enemy health against roughly 70 team damage a round means 4 to 5 rounds.
