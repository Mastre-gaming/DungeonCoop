# The friends' interview prompt

Each friend pastes the block below into a new Claude chat, answers its questions, and sends back the summary block it writes at the end. The four summaries come back to this kickoff session, which folds them into KICKOFF.md and GAME_SPEC.md (story hook, who owns which part, what to avoid, and any draft decision someone wants to overturn).

The pitch inside the block is the same text as `PITCH.md`. The French version is `FRIEND_PROMPT.fr.md`. Change all three together.

```
Four of us friends are going to build a game together, and it should feel like all of ours. One of us ran a first kickoff session and wrote the draft pitch below. Nothing in it is locked. Your job is to show me the pitch, interview me about it, and at the end write my answers up in a fixed block I'll send back to the group.

How to run this:
- First ask my name. Then show me the whole pitch, then start the questions.
- Ask in rounds of at most 4 numbered questions. Offer lettered options where it fits so I can answer fast (like "1b 2a 3: my own answer"); my own answer is always allowed.
- Treat me as a co-owner of this game. Don't sell me the pitch or defend it. If I want to change something big, write it down plainly.
- If I answer with only a feeling ("make it more fun"), ask once what I'd see on screen when it's right.
- Don't promise anything or add features that aren't in the pitch. If I suggest an idea, record it as my idea.
- Keep your messages short. Don't repeat my answers back. Reply in the language I write in.
- When all rounds are done, write the summary block, filled in with my answers, in my own words where I gave them. Write nothing after it.

=== THE PITCH (a first draft) ===

Dungeon Co-op (working title; we'll pick the name together)

This is a starting draft, not a finished plan. Every line can change, the name included, and your answers decide what stays.

In one line: a turn-based co-op dungeon RPG for the four of us. Build your character from pieces, roll the d20, and win fights with combos none of us could pull off alone. And we make it together: every class, monster and chapter in it is something one of us added.

Why it could be great:
- Your turn sets up mine. One of us tips an oil barrel, the next sets it alight. The game shows what a combo will do before you commit.
- No two runs alike. A run is a branching map of rooms. After each fight everyone picks one of three rewards, so your build is never the same twice.
- Luck, but we tilt it. Every attack is a visible d20 roll. Flank an enemy or set it up for a friend and you get advantage: roll two, keep the higher. Needing an 8 or more is 65% to hit; with advantage it's 88%.
- Everyone builds it. A private GitHub repo where each of us works on our own branch. A change only goes in when the tests pass, and you can play a friend's change from its own link first. Rules for adding content keep anything new from breaking the rest. Each of us owns the parts we care about and has the last word on them.

How a fight plays (from Baldur's Gate 3):
- One room on a square grid: four heroes against a pack of monsters.
- Everyone acts in initiative order. When two of our characters are next to each other in the order, they share the turn and act in any order.
- Hover over an enemy to see your exact chance to hit.
- Rooms have things to use: barrels, oil, ledges, water.

How a run plays (from Slay the Spire):
- A run is one chapter: a map of 10 to 15 rooms (fights, events, rests, a shop, a boss), and you choose the path.
- Rewards after each fight build your character; unlocks carry over to the next run.
- Story beats are events inside a chapter, so any of us can write a new chapter and plug it in.

The party is always four. Two of us online? Each controls two characters. Solo, you run all four.

The look: 2D pixel art seen from above. Characters are stacked from pieces (body, outfit, hair, gear), so your build shows on your character.

Left out for now: real-time action, PvP, a phone game, an open world. Voice acting and an AI dungeon master are parked for later.

The story is ours to create. There's no setting or plot yet: we'll write it together, chapter by chapter.

The first playable: one fight, the four of us online, one room, five or six enemies and a small boss. If it isn't at least 5/10 fun with four, we change the fight rules before building anything else.

=== THE INTERVIEW (cover every question; skip any I've already answered) ===

Round 1, first reaction
1. Overall, how much do you want to play this, from 1 to 10? Why that number?
2. Rate each part from 1 to 10: turn-based fights; co-op combos; runs on a branching map; the d20 rolls; building your character from pieces; 2D pixel art; building the game ourselves.
3. What's the one thing you like most? What's the one thing you'd change or drop?
4. Is there a draft decision you'd overturn? (turn-based rather than real-time; 2D pixel art; runs on a map; d20 luck; the party always being four; building it in GitHub with tests; something else)

Round 2, the game you'd want
5. The story is ours to create. What would you want in it: a setting, a tone, a villain, a moment?
6. What would you love to see in it: a class, a monster, a kind of room, a moment? Up to three.
7. What would make you stop playing, or what should we never put in?
8. Which games should we look at? For each, what to take and what to avoid.

Round 3, making it yours
9. What would make this feel like your game, not someone else's?
10. Which parts would you most like to work on? Up to three, in order: classes and abilities; monsters and bosses; rooms and the map; story chapters and events; pixel art; menus and screens; online play and tech; dice and balance; sound and music (later); easter eggs.
11. Which part would you rather not touch?
12. For the part you want most: are you happy to own it and have the last word when we disagree?

Round 4, practical
13. How much do you code today: never, a bit, comfortably, a lot? Any art or design experience?
14. Roughly how many hours a week can you give it, and when can you play together?
15. Any name ideas for the game? (optional)

=== THE SUMMARY BLOCK (write this at the end, in exactly this shape) ===

## Feedback: [name]
- Overall: [1-10], because [why]
- Ratings: turn-based [n] · combos [n] · map runs [n] · d20 [n] · character pieces [n] · pixel art [n] · building it ourselves [n]
- Likes most: [...]
- Would change or drop: [...]
- Would overturn: [decision, and what instead, or "none"]
- Story ideas: [...]
- Wants to see: [up to three]
- Never put in: [...]
- Games to look at: [game: take / avoid]
- Makes it feel like mine: [...]
- Wants to work on: 1. [...] 2. [...] 3. [...]
- Rather not touch: [...]
- Owns and decides: [part, yes / no]
- Experience: code [level]; art or design [...]
- Time: [hours a week]; plays [when]
- Name ideas: [...]
- Ideas they raised: [...]
- Questions they asked: [...]
```
