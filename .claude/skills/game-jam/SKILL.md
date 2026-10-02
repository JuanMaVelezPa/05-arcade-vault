---
name: game-jam
description: >
  Runs a game jam for one game idea. Spawns two game-jam agents in parallel, each
  writing an independent spec draft (same format as specs 08, 09, and 11), then
  judges both and picks the best. Output goes to specs/game-jam/<game-id>/. Use
  for /game-jam <idea>, "@game-jam", or "game jam".
argument-hint: <game or idea, e.g. pong or "a space frogger">
---

# Game jam

Turn one game idea into two competing spec drafts, then pick the best. This skill runs in the main thread because subagents cannot start other subagents. The `game-jam` agent (`.claude/agents/game-jam.md`) writes one draft each.

The skill only writes specs. Never implement a game here.

## Steps

### 1. Prepare

1. Read `$ARGUMENTS` as the game idea. If it is empty, ask for a one-sentence idea.
2. Derive a kebab-case `<game-id>` (for example `pong`). If the idea is a known game name, use it.
3. Read the current catalog before proposing anything: `references/implemented-games.md` (published games) and `ls specs/` (every `NN-*.md`, including games that are specced but not yet published). Check the id is free in both, and check `specs/game-jam/` for an existing `<game-id>/` folder. If the idea matches a published or specced game, or the folder has files, ask: overwrite, or use a new id.
4. Work out `NN`: the highest number in `specs/NN-*.md` plus 1, two digits (for example `12`). Do not count `specs/game-jam/`.
5. Create nothing yet. The agents create the files.

### 2. Run two writers in parallel

Send ONE message with TWO `Agent` calls, `subagent_type: "game-jam"`. Both get the same brief. They differ only in the output path:

- Writer A: `specs/game-jam/<game-id>/<NN>-<game-id>-option-a.md`
- Writer B: `specs/game-jam/<game-id>/<NN>-<game-id>-option-b.md`

Brief for each: the idea text, the `game-id`, the output path, and the instruction "Work independently. Do not read the other option." Never run the two calls one after the other.

### 3. Judge

When both return, read both files in full. Check each against the game spec layout of specs 08, 09, and 11 first. A missing section is a penalty. Then score each draft from 1 to 5:

| Criterion               | Question                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Format match            | Same sections and header as specs 08, 09, 11?                                       |
| Concreteness            | Canvas size, speeds, formulas, level table, and max score all given as numbers?     |
| Scope narrowness        | One narrow slice, with a clear "Not in scope"?                                      |
| Acceptance criteria     | Every check is boolean and verifiable in the browser?                               |
| Engine and registry fit | Matches `lib/games/types.ts` and the registry; no contract change without a reason? |
| Leaderboard fit         | Integer score from 0 to 10,000,000 and a real GAME OVER?                            |
| Decisions and risks     | Real trade-offs, each with a reason?                                                |
| Port effort             | Realistic effort; uses a reference game if one exists?                              |

Tie-break: the smaller scope wins.

### 4. Write the verdict

Write `specs/game-jam/<game-id>/<NN>-<game-id>-verdict.md` with: the idea, the score table for both options, the winner, why it won, and what to borrow from the loser. Both option files stay in the folder. Do not copy the winner to `specs/NN-slug.md`.

### 5. Report

Reply with the winner, the three file paths, and the next step: copy the winner to `specs/NN-slug.md`, set `State: Approved`, then run `/spec-impl NN-slug`. Stop there.

## Rules

- Never start implementation.
- Never edit files outside `specs/game-jam/<game-id>/`.
- Reply in the language of the user's prompt. Spec text stays in English.
