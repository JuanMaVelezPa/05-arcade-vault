# 21 — Asteroids performance (measure, then fix)

**State:** Implemented
**Depends on:** 19-frogger-performance
**Date:** 2026-10-19

**Objective:** Measure Asteroids' frame rate and render cost on a production build, then fix only the engine, React or page-CSS costs the data supports, so Asteroids holds at least 58 FPS with no frame over 50 ms on desktop and on a throttled mobile profile.

## Why this spec exists

The user asked to "improve performance" with no specific symptom (low FPS, input lag or mobile only), and asked to check `shadowBlur`. Only Asteroids is measured and tuned. Code read in `lib/games/asteroids/engine.ts`:

**Engine candidates**

- `shadowBlur` through `glow()` on every asteroid (10), bullet (10), power-up (14 and 8), ship (12, plus 12 on the flame) and particle (6), each wrapped in `save()`/`restore()`. Skins with `palette.glow = false` skip it, so neon is the likely heavy skin.
- `draw()` runs every frame while paused and after game over.
- Per-entity `save()`/`restore()` and one path per entity; particles allocate a closure per explosion.
- The background gradient is a cached `CanvasGradient`, so it is cheap; no offscreen cache is needed.
- Entities wrap around the screen and are always on screen, so culling does not apply.
- On 120/144 Hz screens the game draws more often than needed.

**React and CSS:** `handleHud` re-renders `GamePlayer` when the HUD changes (score, lives, level, 3X timer every 0.1 s while active). Shared fixes from spec 19 (grid paused on the player route, no `mix-blend-mode` on the scanline layers) are verified, not repeated.

## Scope

**In:** measurement on `npm run build` + `npm run start`, saved in `references/game-performance.md`; fixes in `lib/games/asteroids/` backed by a number; a React or CSS change only if the data requires it; a skin parity check; a final "after" run.

**Out:** other games' engines, gameplay, speeds, scoring, controls, sound, touch pad, the look of any skin, `lib/games/types.ts`, Supabase and API routes, a permanent FPS overlay or toggle.

## Data model

No new data structures. The log uses the table format of spec 19 (`Game | Profile | Variant | Avg FPS | Worst frame (ms) | Frames > 50 ms | GamePlayer renders / 10 s`).

## Implementation plan

1. Baseline: both profiles (desktop 1366x650, mobile 390x844 at 4x CPU), all three skins, 10 s sample after a 2 s warm-up. CSS variants only if the target is missed.
2. Decide: a candidate qualifies only with a gain of at least 5 FPS or fewer frames over 50 ms. If the target is already met, log it, remove the instrumentation and close with no code change.
3. Engine fixes, hottest first, one at a time, re-measured. `setSkin` must still repaint a paused frame.
4. React only if renders per 10 s exceed one per HUD tick. Page CSS only for a layer that still qualifies.
5. After run and skin parity (desktop, mobile at 6x CPU, median of 3 runs, plus `draw()` median).
6. QA: screenshots per skin, keyboard play, overflow checks, `format:check`, `lint`, `build`.

## Acceptance criteria

- [x] `references/game-performance.md` has an Asteroids section with Baseline, Decision, After and Skin parity.
- [x] Average at least 58 FPS and no frame over 50 ms on desktop and mobile (4x) in the after run, or the log states why not.
- [x] Each code change is justified by a number; areas with no gain are unchanged.
- [x] Skins look identical before and after, including the paused-frame repaint after SKIN.
- [x] Gameplay unchanged: movement, shooting, power-up, score, lives, pause, game over, sound.
- [x] No other game's folder and no `lib/games/types.ts` change.
- [x] `scrollWidth <= innerWidth` at 360x640, 390x844 and 667x375; clean console.
- [x] `grep -rn "TEMP-PERF" components lib app` has no hits.
- [x] `npm run format:check`, `npm run lint` and `npm run build` pass.

## Decisions taken and discarded

- **Yes (default):** production build for all measurements.
- **Yes (default):** target is 58 FPS average and no frame over 50 ms on both profiles.
- **Yes (default):** measure on the player idle; if the ship dies, send synthetic key presses to keep the run in play and log it.
- **Yes (default):** shared code untouched unless the data qualifies it.
- **Yes (default):** results go in `references/game-performance.md`.
- **Note:** the glow-batching experiment (one path and one shadow per color group) made neon slower at 6x CPU and was reverted; no code change remains.
- **No:** offscreen background cache (the gradient is already cached) and entity culling (all entities wrap on screen).
- **No:** gameplay, skin look or touch pad changes.

## Identified risks

| Risk                                                | Mitigation                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| WSLg has no GPU, so glow cost may be under-reported | Log `draw()` ms as well as FPS; note the caveat.                           |
| Removing `shadowBlur` changes the neon look         | Only pre-render or restructure with identical output; compare screenshots. |
| Idle ship dies and skews the run                    | Synthetic key presses, verified not game over at the end.                  |

## What is **not** in this spec

Other engines, skin or CRT design, gameplay, controls, sound, touch pad, page load, bundle size, Web Workers, Supabase.
