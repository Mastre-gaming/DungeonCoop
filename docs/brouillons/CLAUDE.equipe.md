# Draft: the "Team" part of the game's CLAUDE.md

Written by the team-workflow session, 17 Oct 2026, for whoever fills in `CLAUDE.md` at sign-off. Not loaded by anything until it is pasted in. It has two parts: the import change that makes a friend's clone work, and the section itself.

## 1. Replace the imports at the top

```
@docs/studio/STANDING_CALLS.md
@docs/studio/ANTI_PATTERNS.md
```

(instead of `@../game-studio/…`, which only exists on the owner's machine). Copies go in `docs/studio/` at milestone 1 (`docs/MISE_EN_PLACE.md`, part F). Also replace every other `../game-studio/` path in CLAUDE.md with `docs/studio/`, and drop the "`AI games/CLAUDE.md` loads too" sentence: on a friend's machine it does not. Anything from the manual this game relies on is written into CLAUDE.md itself.

## 2. Add this section

```markdown
## Team (four friends, each with their own Claude)
- **Who you work for:** the friend at this keyboard. The game belongs to the four friends; each aspect's owner has the last word on it (table in `docs/GUIDE_EQUIPE.md`, "Qui décide quoi"; `.github/CODEOWNERS`). The team writes French: answer in the language you are written to in; docs for the team are in French.
- **Branches:** never commit to `main`. One branch per change, named `firstname/short-topic`. At the start of every session, bring the branch up to date with `main` (`git fetch` then `git merge origin/main`) before changing anything.
- **Commits:** commit and push only when told; one ask, one push (call 11). No `Co-authored-by` line, ever (call 12; `.claude/settings.json` sets `attribution` to empty, and the `tests` check fails a PR that has one). Never commit `dl/`, `node_modules/`, `dist/` or secrets.
- **Pull requests:** fill in `.github/pull_request_template.md`. A PR does one thing. It merges only with the `tests` check green, the preview played, and the aspect owner's yes. Merge with squash and delete any `Co-authored-by` line GitHub puts in the squash message.
- **Other people's aspects:** if a change touches files another friend owns, say so in the PR and leave the yes to them. Shared files (`package.json`, `package-lock.json`, `vite.config.js`, `src/skills/`, `CLAUDE.md`, `.github/`, `docs/studio/`) change only in a PR of their own, reviewed by the owner.
- **Skills:** the game's skills are in the repo: code in `src/skills/<name>/module/`, docs in `.claude/skills/<name>/`. Use those copies, never ones from elsewhere on the machine. An improvement to a skill is its own PR, and the owner merges it back into the studio library.
- **Content:** data files under `docs/REGLES_CONTENU.md` (milestone 2). A friend who doesn't code adds art through the GitHub website or GitHub Desktop; when wiring their art in, keep their file and credit them.
- **Before saying a change is ready:** `npm run build`, the game with `?test` (passed/total), and a screenshot of what changed (call 7). On the preview URL, not only localhost, before calling a fix "fixed: awaiting check" (call 9).
- **Conflicts:** show the friend what you keep from each side before committing the resolution. Never force-push, never rewrite `main`. A bad merge is undone with GitHub's Revert button, as a new PR.
```
