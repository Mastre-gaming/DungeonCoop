# FRIENDS: the co-owners' answers

Each friend's summary block from `FRIEND_PROMPT.md` (or `.fr.md`) is saved as-is in `friends/<name>.md`. This page adds them up. KICKOFF.md stays as drafted until every answer is in and the owner folds them in. The owner's own answers are KICKOFF.md itself.

## Received
| Friend | Date | File |
|---|---|---|
| Paolitus | 17 Oct 2026 | `friends/paolitus.md` |
| Fraps | 17 Oct 2026 | `friends/fraps.md` |

## The pattern so far
**Both friends raised the pace of turns.** Paolitus rated turn-based 6 and named Mario Party's long waits as something to avoid. Fraps rated turn-based 9 but put "too slow" on the never list, and would take the rhythm of turns from Slay the Spire rather than Baldur's Gate 3's one-at-a-time order. The draft (KICKOFF §5) uses initiative order, the owner's round 2 pick over a team turn. This is the first thing to settle when the answers are folded in.

## Ratings (1 to 10)
| Part | Paolitus | Fraps | Average |
|---|---|---|---|
| Overall | 8 | 8 | 8 |
| Turn-based fights | 6 | 9 | 7.5 |
| Co-op combos | 9 | 7 | 8 |
| Runs on a map | 7 | 9 | 8 |
| d20 rolls | 8 | 10 | 9 |
| Character from pieces | 6 | 8 | 7 |
| 2D pixel art | 7 | 10 | 8.5 |
| Building it ourselves | 8 | 10 | 9 |

## Story hook votes
**Scrapped by the owner, 17 Oct:** "completely scrap the story you suggested, let us create them." The team writes the story; the votes below only show taste.

| The Guild | The Table | The Breach | Their own |
|---|---|---|---|
| 1 (Fraps) | 1 (Paolitus) | 0 | 0 |

Fraps on The Guild: « passer de pouilleux à des types hyper chauds », with gear to loot and skills to improve.

## Who wants what
| Friend | 1st | 2nd | 3rd | Owns and decides | Rather not touch | Code | Art, design, other | Time a week | Plays |
|---|---|---|---|---|---|---|---|---|---|
| Paolitus | chapters and events | menus and screens | rooms and the map | chapters and events (yes) | nothing | a bit | interface design, music | 10 h or more | weekday evenings, Friday evening, weekends |
| Fraps | pixel art | rooms and the map | menus and screens | pixel art (no) | nothing in mind | never | not said | not known yet | not known yet |

Overlaps so far: both want rooms and the map, and menus and screens. Pixel art has a volunteer (Fraps) but no owner.

## Signals for the draft (weighed when folding in)
| From | Signal | Touches | Note |
|---|---|---|---|
| Paolitus | Turn-based rated 6; names Mario Party's long waits as something to avoid | KICKOFF §5 turns | see "The pattern so far" |
| Fraps | Never: « un jeu pas assez dynamique, un gameplay trop lent »; take the rhythm of turns from Slay the Spire rather than Baldur's Gate 3 | KICKOFF §5 turns | the wording fits two systems (gate Q): a team turn (all players act, then the enemies), or the same order with faster turns? Ask Fraps |
| Paolitus | Never: « un joueur qui porte les autres » (one player carrying the rest) | the focus, balance | fits the focus (combos need two players); becomes a balance rule |
| Paolitus | Mario Party: avoid « la chance qui décide de tout » | KICKOFF §5 dice | matches the draft: teamwork tilts the d20 |
| Fraps | d20 rated 10; likes most « le fait de pouvoir faire sa propre classe » | the dice, building characters | supports the draft; "own class" goes further than "own hero" |
| Paolitus | Darkest Dungeon added as a reference | KICKOFF §0 "It is like" | what to take and avoid not said yet |
| Fraps | Wants the game to be a mix of Baldur's Gate 3 and Slay the Spire | KICKOFF §0 "It is like" | matches the draft |
| Paolitus | Feels like theirs when they find things they made in the game, and their ideas are kept | the heroes, the parking lot | each friend describes their hero and it is built at dev time (`lpc-sprite-mods`); every idea gets a line and an answer |
| Fraps | Feels like theirs with « mettre des références » | easter eggs | room for each friend's references and in-jokes |
| Fraps | Codes "never" and wants pixel art first | the team workflow | the workflow guide must cover a contributor who doesn't code: art made in Sprite Painter (`lpc-sprite-mods`) and added without writing code |

## Ideas (they go to GAME_SPEC's parking lot, gate P)
| Date | From | Idea | Note |
|---|---|---|---|
| 17 Oct | Paolitus | a room type: interactive combat-training mini-games, « où ça se tape un peu en mode Binding of Isaac » | a real-time version crosses the out-of-scope "real-time action"; a turn-based version could fit as an event room, which is Paolitus's area |
| 17 Oct | Fraps | loot gear and improve skills, going from broke to legendary (The Guild) | close to the draft's rewards after each fight; "loot" adds gear dropped by enemies |
| 17 Oct | Fraps | put references in the game | fits the easter eggs from the owner's notes |

## Questions to answer
| From | Question | Proposed answer |
|---|---|---|
| Paolitus | « Il faudra bien nous expliquer comment mettre en place le workflow pour bosser à plusieurs car c'est notre premier projet à plusieurs pour tous les membres de l'équipe » | in milestone 1: a step-by-step team guide in French, and one session together where each friend makes a first change that puts something of theirs in the game |
| Fraps | À quoi va ressembler la feedback loop du jeu ? | GAME_SPEC's "Core loop" (a turn, a run, what carries over), sent to the friends as one page in French |
| Fraps | Comment vont marcher les mécaniques de combat ? | the fight rules written at milestone 2, as one page in French, before the first fight is played |
