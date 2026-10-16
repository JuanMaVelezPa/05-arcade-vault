---
name: spec-impl-game
description: Implements an approved game spec by following the /spec-impl flow, then runs the @skin-designer and @mobile-porter agents one after the other. Use for /spec-impl-game <spec>.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implement a game spec, then audit it

Same as `/spec-impl`, plus two audits at the end: `@skin-designer`, then `@mobile-porter`. This skill runs in the main thread because subagents cannot start other subagents.

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Steps

The received argument is: `$ARGUMENTS`

### 1. Run /spec-impl

`/spec-impl` cannot be invoked through the Skill tool (`disable-model-invocation`). Read `~/.claude/skills/spec-impl/SKILL.md` and follow its Phases 1–4 exactly, using `$ARGUMENTS` as the spec argument and the session context above. Keep all its rules: the Approved check, the working-tree check, branch creation, the pause after each step, and never committing.

If `/spec-impl` stops for any reason (spec not found, not Approved, user declines or cancels), stop here. Do not run the agents.

Continue only when the last plan step is implemented and the user has confirmed it.

### 2. Find the game id

Take the game id from the spec (title or registry step) or from the entry the branch added to `lib/games/registry.ts`. If it is unclear, ask the user once.

### 3. Run @skin-designer

Send ONE `Agent` call with `subagent_type: "skin-designer"`. Brief: "Audit skins after implementing `specs/<NN-slug>.md`; game id `<id>`." Wait for it to return.

### 4. Run @mobile-porter

Only after step 3 has returned, send ONE `Agent` call with `subagent_type: "mobile-porter"`. Brief: "Audit game id `<id>` after implementing `specs/<NN-slug>.md`." Tell the user first that the dev server should be up at `http://localhost:3000`; without it the agent runs static checks only.

### 5. Report

Reply briefly with:

1. Spec implemented, and the active branch.
2. Skin result (status and Draft spec path, or "passes").
3. Mobile result (status per column, Draft spec path, or "game passes"; any "Not verified").
4. Next steps: `/spec-impl <draft spec>` for each gap, check the acceptance criteria, mark the spec `Implemented`, commit (the user's call).

## Rules

- Never run the two agents in the same message. Skins first, mobile second.
- Never commit. Never edit specs, code or logs yourself after the implementation; the agents write only their own logs and Draft specs.
- Reply in the language of the user's prompt. Spec text stays in English.
