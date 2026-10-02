# Verdict — PONG game jam

**Idea:** pong (single-player Pong against a CPU, published as a new `VERSUS` game).
**Date:** 2026-10-02
**Files:** `12-pong-option-a.md`, `12-pong-option-b.md`

Both drafts have the same sections and header as specs 08, 09, and 11 (State, Depends on, Date, Objective, Why this spec exists, Scope with In/Not in scope, Data model, Implementation plan, Acceptance criteria, Decisions, Risks, "What is not in this spec"). Neither has a missing section.

## Scores (1–5)

| Criterion               | Option A | Option B | Notes                                                                                                                                                           |
| ----------------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format match            | 5        | 5        | Same layout in both.                                                                                                                                            |
| Concreteness            | 5        | 5        | Both give canvas size, speeds, formulas, level table, and sub-step size. A also lists the exact max ball speed (832 px/s).                                      |
| Scope narrowness        | 4        | 3        | A has one extra HUD stat (`GOALS`). B adds `MATCH`, `RALLY`, a rally cap, and a pointer speed cap.                                                              |
| Acceptance criteria     | 4        | 4        | Both are mostly boolean. "Loses rallies on steep returns" is soft in both. B's 30-return cap is hard to test by hand.                                           |
| Engine and registry fit | 5        | 5        | Both fit `types.ts` (`pointer` input, `levels: 5`, `jumpToLevel`, no `sound`). No contract change.                                                              |
| Leaderboard fit         | 4        | 5        | Both give integer scores and a real GAME OVER. B proves a ceiling (under 34,000). A only clamps to 10,000,000 and relies on the CPU being beatable.             |
| Decisions and risks     | 5        | 5        | Both give a reason for each decision and mitigations for the risks.                                                                                             |
| Port effort             | 4        | 3        | No reference game exists, so both write the rules from scratch. B adds the rally cap, the pointer speed limiter, and two stats, so it has more to build and QA. |
| **Total**               | **36**   | **35**   |                                                                                                                                                                 |

## Winner: Option A

A wins by one point. The tie-break would also favor it, because its scope is smaller.

## Why it won

- Narrower slice: one HUD extra (`GOALS n/5`) and no rally-cap rule. The CPU rules fit in a short list.
- Clean mapping onto the arcade shell: CPU goals are lives, CPU opponents are levels. The level clear ends at 5 player goals.
- Lower port and QA effort. Every acceptance check is something a tester can see in one play-through.
- Picks a free color (`yellow`) that matches the ball glow, with a QA check that the `VERSUS` chip renders.

## What to borrow from Option B

1. **Score ceiling.** A's score has no hard cap. Either add B's rally cap (the CPU freezes on the 30th return in a rally) or, at least, write a worked maximum into the spec. B's work gives a ceiling under 34,000.
2. **Pointer speed limit.** B caps pointer-driven paddle speed at 900 px/s so a mouse jump cannot move the paddle through the ball. A has no such limit. Add it to A's controls and risks.
3. **Aim error per rally leg.** B rolls `aimError` when the ball turns toward the CPU, and the CPU follows the ball's current y (no trajectory prediction). This is simpler to implement and test than A's rule.
4. **Acceptance checks from B:**
   - The `VERSUS` filter on `/games` shows only PONG.
   - `cover-duelo` and every other existing cover are unchanged.
   - The ball does not tunnel at 800 px/s or after a 50 ms frame.
5. **Risk row from B:** the "PONG" name is trademarked (a course project, as with ARKANOID).

## What not to borrow

- B's `RALLY` and `MATCH` HUD extras. They add shell work for little gain.
- B's rally-scaled return points (`level × min(k, 10)`). A's flat 5 per return is easier to check.
- B's `cyan` color. It matches no new element and A's `yellow` is distinct from the existing cyan ASTEROIDS card.
