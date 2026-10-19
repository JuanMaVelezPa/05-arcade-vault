# 20 — Snake performance (measure, then fix)

**State:** Implemented
**Depends on:** 19-frogger-performance, 11-snake-game, 13-game-skins
**Date:** 2026-10-19

**Objective:** Measure Snake's frame rate and `draw()` cost on a production build and fix only the engine costs the numbers support, so Snake holds 58+ FPS with no frame over 50 ms on desktop and on a throttled mobile profile in all three skins.

## Why this spec exists

The user asked to "improve performance" with no symptom. The shared page fixes from spec 19 (grid animation paused on the player route, no `mix-blend-mode` on `.av-bg::after` and `.crt-screen::after`) are already in `app/globals.css` and are verified, not redone. The code read before writing this spec shows these engine candidates in `lib/games/snake/engine.ts`:

- The loop calls `draw()` on every frame, also while `paused` or `gameover`, though nothing changes then.
- The static field (background, grid, walls) is already cached in an offscreen layer, so it is not a candidate.
- `drawSnake()` sets `shadowBlur` 10 for the body path and 16 for the head on every frame in neon. A blur over a path of up to 44+ rounded segments is the likeliest hot spot, and only neon pays it.
- `drawSnake()` allocates per frame (`[head, ...body]` and `[-1, 1]`), and all body segments are one path (already batched).
- No cap on 120/144 Hz screens: the game draws more often than the 60 Hz it needs. The snake moves on a tick (75-140 ms), so drawing more than 60 times per second adds nothing.
- Retro draws `drawScanlines` over the canvas every frame.

Nothing is proven. Each fix applies only if the baseline supports it.

## Scope

**In:**

- A reproducible measurement of Snake on `npm run build` + `npm run start`, using Playwright MCP, logged in `references/game-performance.md`.
- Metrics per profile and skin: average FPS, worst frame, frames over 50 ms, `GamePlayer` renders per 10 s.
- Profiles: desktop (1366×650) and mobile (390×844, 4× CPU throttling).
- Engine fixes in `lib/games/snake/` only, keeping the three skins identical.
- A skin parity check (neon vs classic vs retro) on desktop and on mobile at 6× CPU.
- React or page-CSS changes only if the data qualifies them.

**Out of scope:**

- Other games' folders, `lib/games/types.ts`.
- Gameplay, tick speeds, scoring, controls, sound, touch pad, skin looks.
- Supabase, API routes, bundle size, fonts, images.
- A permanent FPS overlay or toggle.

## Data model

No new data structures. The artifact is a new `## Snake (spec 20)` section in `references/game-performance.md` with the Baseline, Decision, After and Skin parity tables. `Variant` is `baseline`, `after`, or a CSS variant.

## Implementation plan

1. **Baseline** on a production build: temporary `TEMP-PERF-COUNTER` in `GamePlayer` and `TEMP-PERF-DRAW` timer in the snake engine. Desktop and mobile, three skins, 2 s warm-up, 10 s sample, idle player. CSS variants only if the shared fixes are missing or the target is missed.
2. **Decide** with a table (area, evidence, Fix or Not needed). A candidate qualifies with a gain of at least 5 FPS or fewer frames over 50 ms. If the baseline meets the target (58 FPS, no frame over 50 ms), log it, remove instrumentation and make no code change.
3. **Engine fixes**, hottest first, one per step, re-measure each: skip `draw()` while paused or over unless dirty; cap drawing near 60 Hz; reduce `shadowBlur` cost (glow only where it shows); remove per-frame allocation. `setSkin` must still repaint a paused frame.
4. **React** only if renders exceed one per HUD tick or tie to lost frames.
5. **Page CSS** only for a layer that still qualifies.
6. **After and skin parity**: repeat the baseline without the counter; median of 3 runs of 10 s per skin on desktop and mobile at 6× CPU, with median `draw()` time. Fix a skin-specific cost (more than 2 FPS or 10% `draw()` worse than the best other skin) with the look unchanged.
7. **QA**: before/after screenshots per skin at 1366×650 and 390×844, keyboard play (movement, score, lives, pause, game over, sound toggle), no horizontal overflow at 360×640, 390×844, 667×375, clean console, `npm run format:check`, `npm run lint`, `npm run build`.

## Acceptance criteria

- [x] `references/game-performance.md` has a Snake section with baseline, decision, after and skin parity tables from a production build.
- [x] After: average at least 58 FPS and no frame over 50 ms on desktop and on mobile (4× CPU), or the log says the baseline already met it and no code changed.
- [x] Each code change is justified by a number in the log.
- [x] Neon is within 2 FPS and 10% `draw()` time of the best other skin, or the log states the fix.
- [x] The three skins look identical to before, including the paused-frame repaint after SKIN.
- [x] Snake gameplay is unchanged.
- [x] No file outside `lib/games/snake/` changes except the log and this spec (unless the data qualified shared code).
- [x] `grep -rn "TEMP-PERF" components lib app` returns nothing.
- [x] No color literals in the engine.
- [x] `npm run format:check`, `npm run lint` and `npm run build` pass.

## Decisions taken and discarded

- **Yes (default):** one spec for Snake, engine-first, shared code untouched unless the data requires it.
- **Yes (default):** target 58 FPS average and no frame over 50 ms on desktop and mobile at 4× CPU.
- **Yes (default):** measure on a production build with an idle player; the snake crashes into a wall eventually, so each run starts on a fresh load and is discarded if the game is over at the end.
- **Yes (default):** no symptom reported; frame time is measured, input lag is noted only if seen.
- **Yes (default):** the shared CSS fixes from spec 19 are verified, not re-proposed.
- **No:** a permanent FPS overlay, a fixed-timestep rewrite, a Web Worker or `OffscreenCanvas`.
- **No:** visual changes to any skin.

## Identified risks

| Risk                                               | Mitigation                                                                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The idle snake crashes before 12 s                 | Fresh load per run; level 1 at 140 ms/tick crosses 32 cells in ~4 s with lives 3 and 0.6 s blinks, so verify the state at the end and discard on game over. |
| Sandbox has no GPU, 60 Hz, CPU throttle is a proxy | Compare before/after on the same machine and note it in the log.                                                                                            |
| A cache or cap makes a paused frame stale          | Dirty flag set by `setSkin`, `restart`, `resume`, `jumpToLevel`, game over.                                                                                 |
| Format hook rewrites whole files                   | Small edits.                                                                                                                                                |
| Temporary instrumentation left behind              | Final grep for `TEMP-PERF`.                                                                                                                                 |

## What is **not** in this spec

Other games' engines, skin design, gameplay, controls, sound, touch pad, bundle size, backend, a permanent FPS overlay.

## Result

Baseline met the target (60 FPS, no frame over 50 ms) on desktop and mobile 4x in all skins, so no code changed. See `references/game-performance.md`.
