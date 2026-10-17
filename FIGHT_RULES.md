# FIGHT RULES v0 (design draft)

From the owner's answers on 17 Oct 2026, plus CORE_LOOP.md. Every number is a starting value for the paper fight (`PAPER_FIGHT_KIT.md`). "Decided" means the owner chose it; the numbers are mine, and are meant to be tested and changed.

## A turn
- **Move** up to 5 squares (1 square = 1.5 m), then an **action** and a **bonus action**, in any order.
- **Who acts when:** initiative order, or the team turn. Both are tested on paper (CORE_LOOP.md).
- **Reactions:** only abilities that say "Reaction" can be used outside your turn, at most one per round.

## Attacks always hit; the d20 decides how well
| d20 | Result | Damage |
|---|---|---|
| 1 | **Fumble**: no damage, and roll on the fumble table (`PAPER_FIGHT_KIT.md`) | 0 |
| 2–9 | **Graze** | half, rounded down |
| 10–19 | **Hit** | full |
| 20 | **Critical** | double, and the ability's effect is stronger |

- **Stats:** the ability's stat modifier (STR, DEX, INT, WIS or CHA; see `CLASS_TEMPLATE.md`) is added to the d20 before reading the table, and to the damage. A natural 1 is always a fumble, and a natural 20 always a Critical.
- **Advantage** (roll two d20s, keep the higher) comes from: an ally standing on the opposite side of the target (a flank), a target that is Prone, or a teammate's setup ability.
- **Disadvantage** (roll two, keep the lower) comes from: attacking from a slippery surface, attacking while Chilled, or an enemy's ability that says so.
- **A tough target** (armoured enemies, the leader): their Graze range rises to 2–12, so they take more full hits from setups than from plain swings.
- The hover panel shows the chance of each result, so the odds are always exact.

## Damage: a fixed number plus a small die
- Basic attack: about 8 + d4. Strong ability: about 14 + d6. Big ability: about 22 + d8.
- Starting hero health: **100**. Grunt 30, archer 25, brute 60, leader 90 (paper-test values).

## Resources and stats
Each class picks one resource from the shared list in `CLASS_TEMPLATE.md` (Rage, Mana, Focus, Faith, Energy, Momentum). A new one is added only if the group agrees. Heroes have the six D&D stats, bought with 27 points. Constitution adds health; the other stats add to rolls and damage.

**Scaling to level 20:** heroes gain about 5 health and better abilities per level, so enemy health and damage must grow along each chapter. The paper fight only tests level 1.

## Combos (all four kinds are in)
**Statuses** (on a creature):
| Status | Effect | Exploited by |
|---|---|---|
| Soaked | puts out Burning | lightning does double |
| Oiled | | fire does double, and sets it Burning |
| Burning | 5 damage at the start of its turn, for 2 turns | |
| Chilled | 2 fewer squares of movement, disadvantage on attacks | a shove moves it 2 extra squares |
| Prone | spends half its movement to stand | attacks against it have advantage |

**Surfaces** (on squares; they last 3 rounds unless changed):
| Surface | Effect | Changes into |
|---|---|---|
| Oil | Oiled on entry | fire turns it into Fire |
| Water | Soaked on entry | lightning electrifies it (8 damage to everyone in it); cold turns it into Ice |
| Fire | 6 damage on entry or at the end of a turn in it, Burning | water puts it out |
| Ice | slippery: entering means a d20 roll, Prone on 1–9; a shoved creature slides until it hits something | fire turns it into Water |

**Positioning:**
- **Shove** (bonus action, adjacent): push 2 squares. Into a wall or creature: +8 damage. Off a ledge: a grunt is out, anything bigger takes 20.
- **Pull** (some abilities): drag a target 2 squares toward you.
- **Flank:** an ally on the opposite side gives advantage.

**Team moves:** two specific classes, adjacent to each other, both spend their action on the same turn to make a named move (for example, the brute throws the rogue across the room to land a Critical). Team moves unlock as the heroes level up. Each class pair can have one.

## Downed and healing
- At 0 health a hero is **downed**: no turns, and enemies ignore them unless a rule says otherwise.
- **Revive:** an adjacent teammate spends their action; the hero comes back at 25 health.
- **Healing comes from:** healer abilities, potions (bonus action; bought in the shop or looted), and rest rooms on the map. Nothing heals automatically after a fight.
- **The fight is lost** when all four heroes are down at once.

## Enemies
- **Intents are hidden**, as in D&D. Each enemy type has a readable habit, so players can learn to predict it:
  - grunt: attacks the nearest hero;
  - archer: keeps 4 squares away;
  - brute: charges the hero with the least health;
  - leader: helps the others for 2 turns, then makes a big attack.
- Enemies use statuses, surfaces and shoves too.

## Winning a fight
Each encounter states one of these: **defeat every enemy**, **defeat the leader** (the rest flee), or **reach or protect something** (an exit, a prisoner, an altar) for a number of rounds.

## Critical 1s: the fumble
A natural 1 deals no damage and makes something funny happen (`PAPER_FIGHT_KIT.md` has the table). It must never be worse than losing the turn, so luck stays fun and never decides a fight on its own (Paolitus's "never").

## Checks this draft must pass on paper
| Bar | Target |
|---|---|
| A full round with four players | at most 4.5 min (owner); both friends asked for faster |
| A normal fight | about 7 min |
| Combos between two players | at least 1 per fight |
| Fights decided by luck | none: no fight is lost to one roll |
| Carrying | no hero deals more than 40% of the team's damage |

**Already a warning:** with about 265 enemy health and roughly 60–70 team damage a round, a fight lasts 4 to 5 rounds. At 4.5 minutes a round, that's about 20 minutes, against a 7-minute target. The paper fight shows which has to give: round time, enemy health, or the number of enemies.
