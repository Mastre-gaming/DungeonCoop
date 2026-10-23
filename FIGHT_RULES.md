# FIGHT RULES v0 (design draft)

From the owner's answers on 17 Oct 2026, plus CORE_LOOP.md. Every number is a starting value for the paper fight (`PAPER_FIGHT_KIT.md`). "Decided" means the owner chose it; the numbers are mine, and are meant to be tested and changed.

## A turn
- **Move** up to 5 squares (1 square = 1.5 m), then an **action** and a **bonus action**, in any order.
- **Who acts when:** initiative order, or the team turn. Both are tested on paper (CORE_LOOP.md).
- **Reactions:** only abilities that say "Reaction" can be used outside your turn, at most one per round. One reaction belongs to everyone: the opportunity attack (below, on trial).
- **Playing together** (the training ground, #80): each player plays only their own heroes, in any order with the others. The heroes' phase ends when everyone who has a hero standing in it has said "ready" (playing again takes the "ready" back). A move can't be undone then: the others may already have played after it.

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

**Scaling to level 20:** heroes gain about 5 health and better abilities per level, so enemy health and damage **follow the heroes' level, not the chapter number** (owner, 17 Oct: chapters play in any order, `STORY_STRUCTURE.md`). The paper fight only tests level 1.

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
- **Healing comes from:** healer abilities, potions (bonus action; refilled in rest and treasure rooms: there is no shop and no gold, owner, 20 Oct), and rest rooms on the map. Nothing heals automatically after a fight.
- **The fight is lost** when all four heroes are down at once.

## Enemies
- **Intents are hidden**, as in D&D. Each enemy type has a readable habit, so players can learn to predict it:
  - grunt: attacks the nearest hero;
  - archer: keeps 4 squares away;
  - brute: charges the hero with the least health;
  - leader: helps the others for 2 turns, then makes a big attack.
- **Enemies play their habit with common sense** (on trial, #247, after the enemy playtest of 21 Oct): the habit picks the target, unless something clearly better is in reach this turn. Players can still read them:
  - **they count opportunity attacks**: an enemy weighs the hits it would take on its way, like fire. An enemy in contact with a hero who can still react stays and fights; an archer in that spot shoots from where it stands instead of backing away;
  - **they finish a hero off**: a hero they can knock out this turn comes first;
  - **they surround**: in contact, a grunt or a brute picks the side opposite one of its allies (a flank: advantage);
  - **they don't give up a fight for little**: a brute leaves the hero it is hitting only for one clearly weaker, worth the opportunity attack it will take;
  - **archers keep out of reach**: 4 squares away, if possible where no melee hero can reach them next turn; they shoot the hero they can knock out, otherwise the nearest they see.
- Enemies use statuses, surfaces and shoves too.

## Winning a fight
Each encounter states one of these: **defeat every enemy**, **defeat the leader** (the rest flee), or **reach or protect something** (an exit, a prisoner, an altar) for a number of rounds.

## Critical 1s: the fumble
A natural 1 deals no damage and makes something funny happen (`PAPER_FIGHT_KIT.md` has the table). It must never be worse than losing the turn, so luck stays fun and never decides a fight on its own (Paolitus's "never").

## On trial: moving without squares (the training ground, mission #14)
The team asked on 18 Oct to try a mode **without squares**, where each class has its own **maximum distance per turn**. The training ground in the camp plays it (`entrainement.html`). The squares above stay the rule until the team decides (#26).

- **Metres instead of squares.** One square of the kit is 1.5 m. Creatures stand anywhere.
- **Moving:** up to the class's distance per turn, along any path; the length walked is what counts, so a diagonal is no longer free. The kit's heroes keep their speed: Brute, Mage and Guardian 7.5 m, Rogue 9 m; enemies 7.5 m. Movement can be split before and after the action and the bonus action. You walk through allies, never through enemies, walls, rocks, barrels, deep water or the pit.
- **Chilled:** 3 m less. **Prone:** standing up costs half your distance.
- **Contact** (melee, shove, revive): the two creatures' centres are 2.25 m apart or less (about one square, diagonal included).
- **Ranges:** the kit's squares × 1.5 m (Spark 9 m, Fire Arrow 12 m), centre to centre, with a line of sight: walls and rocks block it; fences, hay, barrels and water don't.
- **Areas:** a 2×2 area becomes a circle of 1.7 m radius, a 3×3 area a circle of 2.5 m radius. Its centre must be within the ability's range.
- **Surfaces** are patches on the ground, drawn without squares. A creature is in a surface when its centre is.
- **Shoves** go straight away from the shover: 2 squares become 3 m (Hurl: 4.5 m, 7.5 m with 20 Rage). Hitting a wall, rock, barrel or creature: +8 damage. Into the pit: as off the ledge (a grunt is out, anything bigger takes 20 and climbs back out). On ice, the target slides on until it hits something.
- **Flank:** an ally in contact with the target, on its far side: the angle attacker, target, ally is 135° or more.
- **Opportunity attacks (on trial, #231, as in Baldur's Gate 3):** walking out of contact with a standing enemy gives that enemy a free hit with its melee attack: it spends its reaction (one per round, shared with Taunt), and the walk goes on unless the walker drops. It works both ways: an enemy walking away from a hero takes the hero's melee attack, played on its own. Only walking provokes it: a shove, a pull, a slide on ice or a teleport (Shadow's Shadow Step) does not. Who has no melee attack (Archers; the Mage, the Scout, the Druid, the Tracker) makes none, nor does the Tracker's hound, which only bites on its master's order (following its master is not a walk either). **Disengage** (bonus action, every hero): walk away freely for the rest of the turn. Before you click, the path turns red and names who will hit you, with the odds and the damage.
- **Height (on trial, as in Baldur's Gate 3):** some rooms have plateaus, 1 or 2 levels high (a level is 3 m), and a plateau can sit on another one.
  - **Getting up:** only by a ramp (a path cut into the cliff) or a ladder. Everywhere else the edge is a cliff: nobody stands on its face or at its foot. Two creatures on different levels are therefore never in contact, so there is no melee between levels.
  - **High ground:** an attack from a level or more above the target adds +2 to the d20, and an attack from below takes −2, melee or ranged. The hover panel shows it in the odds.
  - **Line of sight:** it runs from mid-body to mid-body (about 1 m above the ground), and the ground must not rise above it. From below, you see whoever stands near the edge, but not someone who steps back. A plateau between two creatures on the ground hides them from each other.
  - **Falling:** a shove over the edge makes the target fall to the first free ground below. It takes 10 damage per level fallen and is Prone. A barrel shoved off bursts where it lands. Shoved against a cliff from below, the target hits it like a wall (+8).
  - **Enemies:** an archer keeps the high ground, and leaves it only when it has nothing to shoot at from up there.
  - **To test in the training ground:** `?salle=butte` (classic size, 24 × 18) and `?salle=col` (twice as big, 34 × 26).
- **Deep water is scenery:** nobody walks in it (players' note after D1). A puddle made by a spell is a surface you walk through.
- **The training room:** 24 × 16 squares (36 × 24 m), with the D1 fight's heroes, enemies and objective (defeat the leader). Each hero's d20 shows big on the board (players' note after D1).

## Checks this draft must pass on paper
| Bar | Target |
|---|---|
| A full round with four players | at most 4.5 min (owner); both friends asked for faster |
| A normal fight | about 7 min |
| Combos between two players | at least 1 per fight |
| Fights decided by luck | none: no fight is lost to one roll |
| Carrying | no hero deals more than 40% of the team's damage |

**Already a warning:** with about 265 enemy health and roughly 60–70 team damage a round, a fight lasts 4 to 5 rounds. At 4.5 minutes a round, that's about 20 minutes, against a 7-minute target. The paper fight shows which has to give: round time, enemy health, or the number of enemies.
