# Game performance log

Measurements for spec 19 (Frogger performance). Production build (`npm run build` + `npm run start -p 3100`) unless noted.

## Method

- Playwright MCP (Linux Chromium through WSLg, no real GPU), `requestAnimationFrame` sampler injected for 10 s of active play after a 2 s warm-up.
- Profiles: `desktop` = 1366×650, no throttling. `mobile` = 390×844 viewport with CDP `Emulation.setCPUThrottlingRate` = 4. Touch emulation is not on; this is a CPU/viewport proxy, not a real phone.
- `GamePlayer renders / 10 s` = commits counted by a temporary `useEffect` counter in `components/GamePlayer.tsx` (`TEMP-PERF-COUNTER`, removed before the final commit).
- CSS variants inject one rule on a fresh page load, neon skin:
  - `no-grid`: `.av-bg::before { animation: none }`
  - `no-bg-scan`: `.av-bg::after { display: none }`
  - `no-crt-scan`: `.crt-screen::after { display: none }`
  - `no-noise`: `.av-noise { display: none }`
- The player is idle (frog never hops). Each run starts on a fresh page load so the game is still in play (an earlier chained run lost all lives and measured game-over frames; it was discarded).
- The sandbox display runs at 60 Hz, so 60 FPS is the ceiling.

## Baseline

| Game    | Profile | Variant            | Avg FPS | Worst frame (ms) | Frames > 50 ms | GamePlayer renders / 10 s |
| ------- | ------- | ------------------ | ------- | ---------------- | -------------- | ------------------------- |
| frogger | desktop | baseline (neon)    | 46.6    | 50.1             | 4              | 10                        |
| frogger | desktop | baseline (classic) | 45.8    | 50.1             | 3              | 10                        |
| frogger | desktop | baseline (retro)   | 45.9    | 50.1             | 2              | 10                        |
| frogger | desktop | no-grid            | 60.0    | 16.8             | 0              | 10                        |
| frogger | desktop | no-bg-scan         | 59.8    | 33.5             | 0              | 10                        |
| frogger | desktop | no-crt-scan        | 56.2    | 33.4             | 0              | 10                        |
| frogger | desktop | no-noise           | 45.9    | 50.1             | 1              | 10                        |
| frogger | mobile  | baseline (neon)    | 60.0    | 16.8             | 0              | 10                        |
| frogger | mobile  | baseline (classic) | 60.0    | 16.8             | 0              | 10                        |
| frogger | mobile  | baseline (retro)   | 60.0    | 16.8             | 0              | 10                        |
| frogger | mobile  | no-grid            | 60.0    | 16.8             | 0              | 10                        |
| frogger | mobile  | no-bg-scan         | 60.0    | 16.8             | 0              | 10                        |
| frogger | mobile  | no-crt-scan        | 59.9    | 33.3             | 0              | 10                        |
| frogger | mobile  | no-noise           | 59.9    | 33.3             | 0              | 10                        |

Skin rows come from the first run (neon 45.2 FPS / 1 frame > 50 ms there; the table shows the clean re-run for neon). Classic and retro are from the first, chained run, which was still in play for them (10 renders each).

## Dev server vs production

| Game    | Profile | Variant         | Avg FPS | Worst frame (ms) | Frames > 50 ms | GamePlayer renders / 10 s |
| ------- | ------- | --------------- | ------- | ---------------- | -------------- | ------------------------- |
| frogger | desktop | dev (neon)      | 41.2    | 50.1             | 5              | 10                        |
| frogger | desktop | prod (neon)     | 46.6    | 50.1             | 4              | 10                        |

Dev is about 5 FPS slower than production, but production is below target too, so the slowness is not only a dev artifact.

## Observations (raw, before the Step 2 decision)

- Desktop misses the target in all three skins (about 46 FPS, frames at 50 ms). Mobile at 4× CPU holds 60 FPS with no frame over 50 ms.
- Disabling the `gridscroll` animation takes desktop to 60 FPS with no frame over 50 ms (+13.4 FPS). The `.av-bg::after` scanlines give +13.2 FPS and `.crt-screen::after` gives +9.6 FPS. `.av-noise` gives no gain (-0.7 FPS, inside noise).
- The three gains are not additive: each one alone nearly reaches 60 FPS, so they most likely compete for the same full-viewport repaint/blend work on this software-rendered setup.
- `GamePlayer` re-renders 10 times per 10 s (one per HUD second tick); no extra renders per frame.
- Skins perform the same, so the cost is not skin-specific.
- Input lag and refresh-rate speed differences: not observed (no input was driven).

## Decision (spec 19, Step 2)

Target: 60 FPS, no frame over 50 ms. A CSS layer qualifies only with a gain of at least 5 FPS or fewer frames over 50 ms.

| Profile | Meets target? | Cause                                          |
| ------- | ------------- | ---------------------------------------------- |
| desktop | No (46.6 FPS) | CSS: full-viewport layers around the canvas    |
| mobile  | Yes (60 FPS)  | none (4× CPU proxy, see risks in the spec)     |

| Area                                  | Evidence                                                      | Decision (step)        |
| ------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| CSS `gridscroll` animation            | +13.4 FPS, 4 → 0 frames > 50 ms                               | **Fix** (step 5)       |
| CSS `.av-bg::after` (overlay blend)   | +13.2 FPS, 4 → 0 frames > 50 ms                               | **Fix** (step 5)       |
| CSS `.crt-screen::after` (multiply)   | +9.6 FPS, 4 → 0 frames > 50 ms                                | **Fix** (step 5)       |
| CSS `.av-noise`                       | -0.7 FPS, 4 → 1 frames > 50 ms (noise-level difference)       | Not needed             |
| Frogger engine (step 3)               | Desktop reaches 60 FPS with no frame > 50 ms once one CSS layer is off, so engine draw cost is not the limit | Not needed |
| React re-renders (step 4)             | 10 `GamePlayer` renders / 10 s (one per HUD tick); no per-frame renders; no FPS effect | Not needed |

Notes:

- The three qualifying CSS layers overlap (each alone nearly reaches 60 FPS), so after the fix the `after` run must be checked as a whole, not summed.
- Engine and React candidates stay in the spec; they are reopened only if the `after` run still misses the target.

## After (spec 19, Step 6)

Same production build flow, profiles and sampler as the baseline, after the Step 5 CSS changes (grid paused behind the player, `mix-blend-mode` removed from `.av-bg::after` and `.crt-screen::after`). No engine or React change was needed.

| Game    | Profile | Variant        | Avg FPS | Worst frame (ms) | Frames > 50 ms | GamePlayer renders / 10 s |
| ------- | ------- | -------------- | ------- | ---------------- | -------------- | ------------------------- |
| frogger | desktop | after (neon)   | 60.0    | 16.8             | 0              | 10                        |
| frogger | desktop | after (classic) | 60.0   | 16.8             | 0              | 10                        |
| frogger | desktop | after (retro)  | 60.0    | 16.8             | 0              | 10                        |
| frogger | mobile  | after (neon)   | 60.0    | 16.8             | 0              | 10                        |
| frogger | mobile  | after (classic) | 60.0   | 16.8             | 0              | 10                        |
| frogger | mobile  | after (retro)  | 60.0    | 16.8             | 0              | 10                        |

Result: desktop went from 46.6 to 60.0 FPS and from 4 frames over 50 ms to 0; mobile (4× CPU) stays at 60 FPS with 0 frames over 50 ms. Both acceptance targets are met. The sandbox has no real GPU and no real phone, so a check on a real device is still worth doing.

Note: the skin button is persisted per device, so a clicked skin carries over page reloads; two rows were re-run until the button label read the intended skin.

The temporary `GamePlayer` render counter was removed after this run.

## Neon parity (spec 19, Step 7)

Production build with the Step 5 CSS. Median of 3 runs of 10 s per skin (2 s warm-up), idle frog. `draw()` ms is the median per-frame time of `draw()` measured with a temporary `performance.now()` wrapper in `lib/games/frogger/engine.ts` (`TEMP-PERF-DRAW`, removed after the run; about 600 frames per run). Mobile uses 390×844 with 6× CPU throttling.

| Game    | Profile      | Variant | Avg FPS | Worst frame (ms) | Frames > 50 ms (3 runs) | draw() median (ms) |
| ------- | ------------ | ------- | ------- | ---------------- | ----------------------- | ------------------ |
| frogger | desktop      | neon    | 60.0    | 16.8             | 0 / 0 / 0               | 0.5                |
| frogger | desktop      | classic | 60.0    | 16.8             | 0 / 0 / 0               | 0.5                |
| frogger | desktop      | retro   | 60.0    | 16.8             | 0 / 0 / 0               | 0.6                |
| frogger | mobile, 6× CPU | neon    | 60.0    | 16.8             | 0 / 0 / 0               | 1.3                |
| frogger | mobile, 6× CPU | classic | 60.0    | 16.8             | 0 / 0 / 1               | 1.6                |
| frogger | mobile, 6× CPU | retro   | 59.2    | 33.5             | 0 / 1 / 0               | 1.5                |

Result: **no neon-specific cost.** Neon is equal to or better than the other two skins on both profiles (equal FPS on desktop; on mobile at 6× neon has the lowest `draw()` time and no frame over 50 ms, while classic and retro each had one). Neon is not worse than the best other skin by more than 2 FPS or 10% `draw()` time, so no engine change was made for it.

Caveat: this sandbox has no real GPU and no real phone, and the display is 60 Hz. If neon still feels slower on a real device, record the device and the symptom (FPS, input lag or glow) and open a new spec.

The temporary `draw()` timer was removed from the engine after this run.
