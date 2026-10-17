# Prompt: the team workflow guide and repo setup

Paste the block below into a new Claude Code session opened at `AI games/`. It carries the context from the kickoff session, so that session can stay on building the game.

```
Team workflow session for dungeon-coop: write the team guide and draft the repo setup.
- Write no game code (gate K: the game's KICKOFF.md isn't signed off yet).
- Touch nothing outside `AI games/dungeon-coop/`. Inside it, don't edit KICKOFF.md, PITCH.md, FRIEND_PROMPT*.md, FRIENDS.md or friends/: the kickoff session owns them.
- Don't create accounts, repos or Cloudflare projects. Don't push. Don't commit unless I say so.

## Who this is for
- dungeon-coop is a 2D turn-based co-op dungeon RPG that a group of friends builds and plays together. It belongs to all of them: "This game should feel like everyone's, not mine only."
- It's the first team project for every one of them. Paolitus asked: « Il faudra bien nous expliquer comment mettre en place le workflow pour bosser à plusieurs car c'est notre premier projet à plusieurs pour tous les membres de l'équipe ».
- Levels so far:
  - Paolitus codes "a bit", does interface design and music, and can give 10+ hours a week.
  - Fraps has never coded and wants to do pixel art.
  - I (the owner) work through Claude Code.
  - At least one more friend hasn't answered yet; FRIENDS.md is the live list.
- The team writes French. Every guide is in French, plain and step by step, and assumes no git knowledge.

## Already decided (KICKOFF.md §5 and §6; don't reopen)
- One private GitHub repo. Each friend works on a branch, and a change merges into main only when the automatic `?test` checks pass on GitHub.
- Cloudflare Pages publishes main to the live URL and every pull request to its own preview URL, so a friend's change can be played before it merges.
- Whoever owns an aspect has the last word on it and decides on its changes. Known so far: Paolitus owns chapters and events. Pixel art has a volunteer (Fraps) but no owner.
- Stack: Vite 8.3.4, three.js 0.186.1, plain JavaScript ES modules. `npm run build` builds dist/ with `base: './'` from a clean clone. `?test` prints passed/total. Headless screenshots use game-core's tools.
- Standing calls (../game-studio/STANDING_CALLS.md) that bind every friend's Claude too:
  - commit and push only when told, one ask, one push (11);
  - no co-author line in commit messages (12: it broke the host's free-plan builds);
  - never commit downloads (dl/) or secrets; API keys never go in source.
- Feedback: one score per item, in the FEEDBACK.md format. A fix stays "awaiting check" until its owner confirms it on the live route (gate F, PLAYTEST.md).
- Content will be added as data files under content rules written at milestone 2. The guide only says where those rules will live.

## Read first
- dungeon-coop/KICKOFF.md, FRIENDS.md, friends/*.md
- ../game-studio/STANDING_CALLS.md, STUDIO.md, FEEDBACK.md, PLAYTEST.md
- ../skills/INDEX.md (the pinned stack)
- the game-core skill's SKILL.md (build, ?test and screenshot commands)
- the lpc-sprite-mods skill's SKILL.md (how art is made in Sprite Painter, and its credits)

## Problems to solve, not just describe
1. **Enforcing "merge only when tests pass" on a private repo.** Check GitHub's current docs: I believe branch protection and rulesets on private repos need a paid plan (GitHub Pro or Team). Give the options with what each costs:
   - the owner on GitHub Pro;
   - an organization on the Team plan;
   - a public repo;
   - a team rule, with the check still shown on every pull request.

   Recommend one, and leave the choice to me.
2. **The repo must work on a friend's machine.** Today the game's CLAUDE.md imports ../game-studio/ files, and the skills live in AI games/skills and ~/.claude/skills on my machine only. Propose how the repo carries what it needs so that a friend's clone, and their Claude, get the same rules: copied docs, skill modules under src/skills/, the Sprite Painter zip in AI games/share/.
3. **A friend who never codes (Fraps) must be able to add art and play previews without the command line**, for example with GitHub Desktop or the GitHub website, and Sprite Painter for the art. Show that path end to end.
4. **Several people adding content at once:** branch names, small changes, keeping a branch up to date, what to do on a conflict or a failed check, how to undo a bad merge.
5. **Each friend using Claude Code on their own machine:** what their Claude must follow (the repo's CLAUDE.md), and how not to step on each other's work.

## Write these
- **docs/GUIDE_EQUIPE.md**, in French: how we work together, from "I have an idea" to "it's live", with one walk-through per role (coder, artist, writer, tester). Short sections; numbered steps only where the order matters.
- **docs/MISE_EN_PLACE.md**, in French: the one-time setup as a checklist, saying who does each step. Mark the steps only a person can do: accounts, creating the repo, invites, the plan choice, connecting Cloudflare Pages.
- **docs/PREMIER_PAS.md**, in French: a first session together. Each friend makes one small change that puts something of theirs in the game (their name in the credits, a reference or an easter egg), then takes it through a pull request, a preview and a merge. It runs at milestone 1, once there is code.
- **Repo files, drafted in the game folder and not pushed:**
  - .gitignore (node_modules, dist, dl/, secrets);
  - .gitattributes (line endings, PNG as binary);
  - .github/workflows/ for the checks (npm ci, build, ?test headless);
  - .github/pull_request_template.md;
  - an issue template in the FEEDBACK.md format;
  - a CODEOWNERS draft, with placeholders for owners not chosen yet.
- **When the guide is done, publish it as a page the friends can open**, like the pitch page (https://claude.ai/artifact/S2Gdt6xoUvZe7F1CAjVhgj, in French and English), and give me the link.

## Report back
- the files written;
- the decisions waiting on me (the plan for enforcing checks, the repo name, who holds admin, anything else), each with your recommendation;
- the steps only a person can do, in order;
- anything in this brief that turned out to be wrong.
```
