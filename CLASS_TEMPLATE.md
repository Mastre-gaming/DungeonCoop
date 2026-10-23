# CLASS TEMPLATE: design your own class

Remade from the owner's answers on 17 Oct 2026. Anyone can design **as many classes as they like**; the group picks which ones go in. Rules: `FIGHT_RULES.md`. The frame (how far a class can go, enforced by the armoury, the class creator): `CLASS_FRAMEWORK.fr.md`. French version: `CLASS_TEMPLATE.fr.md`. All numbers are first drafts for the paper fight.

## How a class is built
| Part | Rule |
|---|---|
| Role | **one main role plus a twist** (e.g. "support who fights up close") |
| Stats | the **six D&D stats**, bought with **27 stat points** (5e point buy) |
| Class points | **10 points** to spend freely on health, movement and abilities |
| Starting abilities | **3**, and one of them must be a **basic attack** |
| Resource | **picked from the shared list** below |
| Weakness | **one real drawback**, written on the sheet |
| Gear | **none**: there is no item system for now (owner, 20 Oct); a hero grows through levels and ability upgrades |
| Growth | levels 1 to 20, with a **subclass at level 3** (D&D style) |

## 1. Identity
- **Name:**
- **In one line, who are they?**
- **Main role:** tank · damage · support · control
- **The twist:** (what makes this class not just its role)
- **Story archetype:** one from the team's list: Fighter · Support · Ranged · Mage (work in progress, `STORY_STRUCTURE.md` §4). The story speaks to your hero through it.

## 2. Stats (27 points, 5e point buy)
Each stat starts at 8. Raising it costs: 9 = 1 point, 10 = 2, 11 = 3, 12 = 4, 13 = 5, 14 = 7, 15 = 9. A stat can't go above 15 at level 1.

| Stat | Score | Modifier | What it does here |
|---|---|---|---|
| Strength (STR) | | | added to the d20 and damage of strength attacks; shove distance +1 at 14+ |
| Dexterity (DEX) | | | added to the d20 and damage of finesse and ranged attacks; added to initiative |
| Constitution (CON) | | | +5 health per modifier point, at level 1 and every level |
| Intelligence (INT) | | | added to the d20 and damage of arcane abilities; surface abilities last +1 round at 14+ |
| Wisdom (WIS) | | | added to healing and nature or divine abilities; spots traps and hidden rooms |
| Charisma (CHA) | | | added to presence abilities (taunts, inspire); better event choices |

Modifier = (score − 10) ÷ 2, rounded down: 8 → −1, 10 → 0, 12 → +1, 14 → +2, 15 → +2.

## 3. Class points (10)
| Spend on | Cost |
|---|---|
| Health above 100 | 1 point per +10 (max 130) |
| Health below 100 | gives back 1 point per −10 (min 70) |
| Movement above 5 squares | 2 points per +1 square (max 7) |
| Movement below 5 squares | gives back 1 point per −1 square (min 4) |
| The basic attack (about 8 + d4 + modifier) | free |
| A setup ability (status, surface, shove or pull) | 2 |
| A payoff ability (about 14 + d6 + modifier, stronger on a setup) | 3 |
| A bonus action or a reaction | 2 |
| A heal, shield or buff | 3 |
| Making any ability stronger (bigger area, extra effect, more damage) | +1 or +2, the group judges |

Unspent points become +5 health each (this doesn't count toward the 130 cap).

## 4. Resource (pick one from the shared list)
| Resource | Fills by | Max |
|---|---|---|
| Rage | +10 per hit dealt or taken | 50 |
| Mana | 40 per fight, +5 each turn | 40 |
| Focus | +1 per setup that a teammate uses | 3 |
| Faith | +1 per heal or guard | 3 |
| Energy | 3 each turn, unspent energy is lost | 3 |
| Momentum | +1 per square moved, empties if you stand still | 5 |

A new resource goes on the list only if the group agrees.

## 5. Starting abilities (3, one is the basic attack)
| # | Name | Kind | Points | Cost in resource | Range | What it does | Combo hook (status, surface or position it makes or uses) | Stat |
|---|---|---|---|---|---|---|---|---|
| 1 | | Basic attack | 0 | none | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |

## 6. Weakness (required)
One real drawback that the enemies or the room can use, e.g. "can't stand on Ice", "takes double fire damage", "loses all Rage if healed".
- **Weakness:**

## 7. Levelling up (permanent, 1 to 20)
| Level | Gain |
|---|---|
| every level | +5 health + CON modifier |
| 2 | a new ability (spend 3 class points' worth) |
| **3** | **subclass**: pick one of two paths the designer writes (each with its own features at 3, 7, 11 and 15) |
| 4, 8, 12, 16, 19 | +2 to one stat, or +1 to two (max 20) |
| 5, 9, 13, 17 | a new ability, or an upgrade to one you have |
| 6 | a team move with another class |
| 20 | the class's signature: one thing nobody else can do |

**Subclass paths** (write two):
| Path | The idea | Level 3 feature | Level 7 | Level 11 | Level 15 |
|---|---|---|---|---|---|
| A | | | | | |
| B | | | | | |

## 8. The look (for the LPC sprite in Sprite Painter)
- **Body and build:**
- **Outfit and colours:** (there is no gear: this is how they look)
- **One touch that makes them theirs** (horns, a scar, a crest, a plume, an emblem):

## 9. References and in-jokes
- 

---

## Example: the test rogue, remade
- **Role:** control, twist: sets up kills for others · **Resource:** Focus · **Weakness:** takes double damage from Fire, including their own.
- **Stats:** STR 8, DEX 15, CON 13, INT 12, WIS 13, CHA 12 (27 points: 9 + 5 + 4 + 5 + 4). CON +1 means +5 health.
- **Class points (10):** Oil flask, a setup (2) · Opening, a payoff (3) · Opening made stronger, with a Critical for 2 Focus (+1) · movement 6 (2) · 2 left over = +10 health. **Health: 100 + 10 + 5 = 115.**

| # | Name | Kind | Points | Cost | Range | What it does | Combo hook | Stat |
|---|---|---|---|---|---|---|---|---|
| 1 | Fire arrow | Basic attack | 0 | none | 8 | 8 + d4 + DEX; sets Oil alight | ignites Oil | DEX |
| 2 | Oil flask | Setup (bonus) | 2 | none | 4 | a 2x2 of Oil, or Oiled on one target | makes Oil, Oiled | DEX |
| 3 | Opening | Payoff | 3 | 2 Focus for a Critical | 1 | 8 + d4 + DEX, the target is Prone | makes Prone | DEX |

- **Subclass paths:** A, Arsonist (bigger fires); B, Shadow (moves through enemies, more Criticals).
