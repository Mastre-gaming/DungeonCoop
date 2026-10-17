# STORY STRUCTURE (design draft)

From the owner's answers on 17 Oct 2026. **This file sets the frame only:** where story sits in a run, how it moves forward, and what a writer fills in. No setting, names, villain or text appear here. All of that belongs to the team (D3, the world sheet). **Paolitus owns chapters and events and has the last word on them: this draft waits for his yes.** It fits the run shape in `LEVEL_STRUCTURE.md`. French version: `STORY_STRUCTURE.fr.md` (change both together).

## Decided (owner, 17 Oct)
| Question | Answer |
|---|---|
| How the story moves when a chapter is replayed | **Hades-style:** each run can unlock the next beat. Replaying a chapter reveals more of it; it never repeats the same scene |
| What the boss choice means | each run boss **sets a flag**, and **every run wears down one End boss** waiting at the end of the story |
| Where the heroes sit | the team writes a set of **class archetypes**; every class falls under one. The story is written per archetype and **names the player's hero** |
| Who chooses in an event | the **group votes**, on a timer, as when picking the next room |
| What wears the End boss down | **every finished run**, and **more for the harder of the two bosses** |
| Can the End boss be beaten? | **No.** The wear done to it is **the team's score**. Whether the team ever fights it directly is still open |
| The archetypes (work in progress) | **Fighter, Support, Ranged, Mage**: their own list, separate from the fight roles |
| Who holds the story's progress | **one shared campaign**, kept online: it doesn't matter who hosts |
| The order of chapters | **modular**: chapters play in any order, and **the game draws the next one at random** |
| Between runs | **a real, living camp** that grows with the campaign (Darkest Dungeon's hamlet) |
| The epilogue | **plays once the 3 chapters' chains are finished**, then play goes on. The friends add **new arcs and chapters the same way they add builds** |
| Difficulty across chapters | **follows the heroes' level**, not the chapter number (`FIGHT_RULES.md`) |
| A friend who missed an evening | **a campaign journal** keeps every beat seen; anyone rereads it whenever they like |

## The layers
```
Camp      : between runs, grows with the campaign
Campaign  : 3 chapters in v1, in any order, then an epilogue
End boss  : never beaten; the wear done to it is the team's score
 └ Chapter : a place, its opening, its story chain, its pools, 3 bosses (2 offered per run)
    └ Run  : one trip through the chapter's 9 rooms
       └ Room : may hold a beat (opening, event, campfire, boss)
          └ Beat : up to 4 short lines, maybe a choice
```

## 1. How the story moves: flags
- **Progress is a set of flags**, saved with the party like levels, and **never lost on a wipe**.
- **One shared campaign:** the flags are kept online (the `edge-leaderboard` skill, adapted), so the same story goes on whoever hosts.
- Kinds of flag: a run started in chapter N · a run finished · a boss beaten (which one) · a story event seen · a choice made · the End boss's wear.
- **Every story piece says what it needs and what it sets.** A piece plays only when its needs are met.
- **Chapters are modular.** A chapter's chain never assumes another chapter was played first. A beat may mention another chapter only through a flag, with a fallback line for when that flag isn't set.
- **Story events form a chain per chapter**, in order. When the run reaches an event room and the next link of the chain is unlocked, it takes the room ahead of a flavour event. Each link plays once.
- **Flavour events** repeat and are shuffled. References and easter eggs live here (Fraps's « mettre des références »).

## 2. Where story sits in a run
Story stays in fixed slots, so a fight is never interrupted.

| Room (LEVEL_STRUCTURE.md) | Beat | Changes with flags? |
|---|---|---|
| Before room 1 | **opening**: where we are, why we go in | yes: a new variant each time the chain moves on |
| 3 (event) | the **next story link**, or a flavour event | yes |
| 4 and 8 (rest) | one **campfire line** between heroes | yes, and by the archetypes present |
| 7 (shop) | shopkeeper lines (optional) | can react to flags |
| 9 (boss) | **boss intro** before, **after-beat** once won; sets the boss's flag | the intro can mention earlier runs |
| After the boss | the End boss's wear goes up (section 3) | |

**Pace (both friends asked for faster play):** a beat is at most 4 short lines. It moves on when everyone has clicked, or after a short timer. Story outside choices should take about 3 minutes of a 65-minute run.

## 3. The run bosses and the End boss (the team's score)
- Each chapter offers 2 of its 3 bosses; the group picks one. Beating it **sets that boss's flag** (and counts how many times).
- **The End boss can't be beaten.** It is the threat behind the whole campaign, and **the wear done to it is the team's score**.
- **Every finished run wears it down, and beating the harder of the two bosses wears it more.** The wear is saved, never lost, and only goes up.
- Flags from the run bosses can also mark the End boss (for example, a boss beaten often takes one of the End boss's tricks away). The team decides whether to use that.
- The score shows at the camp. Whether the team can also face the End boss directly (a fight it never wins, where the damage dealt adds to the wear) is still open.

## 4. The heroes: archetypes
- **The archetypes (work in progress, owner, 17 Oct): Fighter, Support, Ranged, Mage.** It is their own list, separate from the fight roles (tank, damage, support, control): a Mage can be a support. The team can still rename or add to it. Each class sheet names **exactly one** (`CLASS_TEMPLATE.md` §1).
- Story text uses slots: **"the archetype's hero"** becomes that hero's name, as the player named them; **"any hero"** picks one from the party.
- **Every line that calls an archetype has a fallback** for when no hero of that archetype is in the party. The party is always four but can be any mix.
- **Two heroes of the same archetype:** the slot names the one with fewer lines so far this run, so no friend is left out.

## 5. Choices: the group vote
- The same vote as picking the next room. A timer runs (20 seconds to start with); when it ends, the most votes win and **the host breaks ties**. Solo, you just pick.
- A choice can set flags, give or cost a reward, or start a fight.
- A choice that rolls the d20 follows the fight's luck rules: teamwork gives advantage, and a fumble is never worse than a lost reward (Paolitus: luck must not decide everything).

## 6. What a writer fills in for one beat
The file format is set in `docs/REGLES_CONTENU.md` at M2. A beat holds:

| Field | What it is |
|---|---|
| id, chapter, author | what it is, where it goes, who wrote it |
| kind | opening · story link · flavour · campfire · shop · boss intro · boss after |
| needs | flags it waits for (none for flavour) |
| sets | flags it sets once played |
| order | its place in the chain (story links only) |
| lines | up to 4, with hero slots |
| fallbacks | one per archetype slot |
| choices | up to 3: label, what happens, flags set |
| references | the in-joke or easter egg, if any, so credit stays with its author |

## 7. What the checks catch (so a friend's event can't break another's)
- Every flag a beat needs is set somewhere; no story link can be unreachable.
- No two links of a chapter's chain share the same order.
- Every archetype slot has its fallback.
- A beat that needs a flag from another chapter has its fallback.
- No beat runs past 4 lines; no choice offers more than 3 options.

## 8. The camp
- **Between runs the team meets in a living camp** that grows as the campaign moves on: people who join it, places that open, lines that change with the flags. Reference: Darkest Dungeon's hamlet (Paolitus's reference).
- It is where **the game draws the next chapter**, sees **the End boss's wear**, and opens **the journal**.
- **Ideally it grows both ways:** the story (people, places, lines) and the fights (upgrades). The details come in a second phase. **It is a big piece:** it is built after the first run (M4), first as a plain camp, then grown one piece at a time (gate T).

## 9. The journal
- **Every beat played goes into the campaign journal**, with its date and who was there. Choices show what the group voted.
- A friend who missed an evening rereads it from the camp whenever they like; nobody waits for anyone.

## 10. The epilogue, and what comes after
- **An epilogue beat plays once the 3 chapters' chains are finished**, in whatever order. Then the campaign goes on: every chapter stays playable, and the score keeps climbing.
- **New arcs and chapters are content, like builds.** A friend adds a chapter (or a whole arc: a few chapters plus their own End boss) from files that follow a template, checked like any other content (section 7). It goes live when its owner merges it.

## Open questions
| Question | Who answers |
|---|---|
| Does Paolitus agree with this frame? | Paolitus |
| The camp's details: what grows, and which upgrades change the fights (ideally both; second phase) | the owner, Paolitus |
| The template for a new arc: how many chapters, how its End boss and wear plug in | at M4, in `docs/REGLES_CONTENU.md` |
| How much wear a run gives, and how much more the harder boss gives (the score's scale) | the first runs |
| Does the team ever fight the End boss directly (a fight it never wins, the damage dealt adds to the score)? | the owner, Paolitus |
| The archetype list is a work in progress: final names, and whether to add more | the team |
| When the shared online campaign gets built (it moves `edge-leaderboard` up from "later"), and what happens if the online save can't be reached | the owner (at M4, with runs) |
| Can the chain hand an event room story to a run that only plays the puzzle side? | Paolitus |

## Not decided here (the team's)
The world, each chapter's place, the bosses and the End boss, the camp's people and places, the epilogue, and every line of text. These go on the world sheet (D3) and in the chapter files.
