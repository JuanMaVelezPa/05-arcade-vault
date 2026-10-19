# 19 — Frogger performance (measure, then fix)

**State:** Implemented
**Depends on:** 18-frogger-skins
**Date:** 2026-10-19

**Objective:** Measure Frogger's frame rate and render cost on a production build, then fix the engine, React and page-CSS costs the data shows so Frogger holds 60 FPS with no frame over 50 ms on desktop and on a throttled mobile profile.

## Why this spec exists

The report is slowness on web and mobile, with the suspicion that React re-renders too much. The game under test and fixed is **Frogger only**; the other four games' code is not touched. The code read before writing this spec shows three possible cost areas:

**Engine (`lib/games/frogger/engine.ts`)**

- The loop already skips `onHud` when score, lives, level and the `TIME` seconds did not change.
- `draw()` runs on every frame, even while paused or after game over.
- `drawBackground()` repaints the bands, about 12 river ripple strokes, the dashed road lines and about 40 grass dots on every frame, although it only changes with the skin.
- `drawLog` and `drawTurtles` start a new path and stroke for each line or arc, and entities fully off screen are still drawn (lane rings are wider than the screen).
- On 120/144 Hz screens the game draws more than twice as often as it needs to.
- Frogger uses no `shadowBlur`, so glow is not a cause here.

**React**

- Each `onHud` call (about once per second, plus score, lives and level changes) makes `GamePlayer.handleHud` call four setters and `setExtras` with a new array, which re-renders the whole `GamePlayer` tree, including `GameCanvas` and the `TouchPad` portal. `GamePlayer` and `GameCanvas` are shared by all games.

**Page CSS around the canvas (`app/globals.css`, shared by all games)**

- `.av-bg` is `position: fixed` over the whole viewport on every route (`app/layout.tsx`). Its `::before` animates `background-position` forever (`gridscroll 8s linear infinite`) on a grid with a 3D `transform` and a `mask-image`. Animating `background-position` is not compositor-only, so it repaints a large layer every frame.
- `.av-bg::after` is a full-viewport scanline layer with `mix-blend-mode: overlay`, and `.crt-screen::after` is a scanline layer with `mix-blend-mode: multiply` over the canvas. Blend modes force a re-blend each time the canvas repaints.
- `.av-noise` is a full-viewport fixed SVG `feTurbulence` background, static but one more full-screen layer.

**Dev server**

- Testing so far was on `npm run dev`, which is much slower than production. Part of the slowness may be a dev artifact.

None of these is proven to be the main cost. This spec is measurement first, and each fix applies only if the baseline supports it.

## Scope

**In:**

- A reproducible measurement of Frogger on `npm run build` + `npm run start`, using Playwright MCP, saved as `references/game-performance.md`.
- Metrics per profile: average FPS, worst frame time, number of frames over 50 ms, and number of `GamePlayer` re-renders per 10 s of play.
- Two profiles: desktop (1366×650) and mobile (390×844 touch profile with 4× CPU throttling).
- Frogger engine fixes in `lib/games/frogger/`, keeping the three skins identical.
- A React re-render fix, only if the baseline shows it matters, in a way that does not change the behavior of the other games.
- Page CSS fixes for the layers around the canvas, only for layers that show a measurable gain, with the same look.
- A final "after" run of the same measurement, logged next to the baseline.
- A neon parity check: neon must perform as well as classic and retro, with a fix in `lib/games/frogger/` only if a neon-specific cost shows up.

**Out of scope (for future specs):**

- Measuring or fixing the engines of Asteroids, Tetris, Arkanoid and Snake (including their `shadowBlur` use). The CSS and React fixes may help them, but they are not measured or tuned here.
- Visual changes to any Frogger skin, the page background, the CRT frame or the scanlines. Everything must look the same as today.
- Removing the CRT frame, vignette or noise for good.
- Gameplay, speeds, lanes, scoring, controls, sound or touch pad changes (including the pad's CSS animations from spec 17).
- Changes to the engine contract in `lib/games/types.ts`.
- Bundle size, fonts, images and page load time.
- Supabase, API routes and server actions.
- A permanent in-app FPS overlay, a performance toggle in the UI, or a test runner. Measurement stays a manual QA step.

## Data model

This feature introduces no new data structures. The only new artifact is the measurement log `references/game-performance.md`, a markdown table per run:

```markdown
| Game    | Profile | Variant | Avg FPS | Worst frame (ms) | Frames > 50 ms | GamePlayer renders / 10 s |
| ------- | ------- | ------- | ------- | ---------------- | -------------- | ------------------------- |
| frogger | ...     | ...     | ...     | ...              | ...            | ...                       |
```

`Variant` is `baseline`, `no-grid`, `no-blend`, `no-noise` (one CSS layer disabled through DevTools) or `after`.

Measurement conventions:

- Frame times come from a `requestAnimationFrame` sampler injected with `mcp__playwright__browser_evaluate` for 10 s of active play (game started, not paused).
- Re-render count comes from a temporary ref counter or `console.count` in `GamePlayer`, added for the baseline run and **removed before the final commit**.
- Warm-up: ignore the first 2 s of each run.

## Implementation plan

1. **Baseline** — run `npm run build` and `npm run start`. With Playwright MCP, measure Frogger on both profiles in the three skins. Then repeat in neon with each CSS layer disabled one at a time through DevTools (`gridscroll` animation, `.av-bg::after`, `.crt-screen::after`, `.av-noise`). Save the tables and the observed bottlenecks to `references/game-performance.md`. Also record one `npm run dev` run to show the dev vs production gap.
2. **Decide** — mark in the log whether Frogger misses the target (60 FPS, no frame over 50 ms) and which area causes the miss: engine, React or CSS. A CSS layer qualifies for a fix only if disabling it gains at least 5 FPS or removes frames over 50 ms. Steps 3 to 5 run only for what the data supports; a step with no finding is recorded as "not needed".
3. **Frogger engine** — in `lib/games/frogger/`, apply only the candidates below that the baseline supports, hottest first. `setSkin` must still repaint a paused frame. One fix per commit.
   - **Static background layer:** draw `drawBackground()` (bands, river ripples, dashed road lines, grass dots) once to an offscreen canvas and copy it each frame with `drawImage`. Rebuild it in `setSkin`.
   - **No redraw when idle:** skip `draw()` while the state is `paused` or `gameover` unless something changed (dirty flag set by `setSkin`, `restart`, `gameOver`, `resume`).
   - **Frame cap:** draw at most about 60 times per second on 120/144 Hz screens while `update` keeps advancing by `dt`. Drop this if the baseline shows visible judder.
   - **Batched strokes:** build one path per log or turtle group (`drawLog`, `drawTurtles`) and stroke once, instead of one path per line or arc.
   - **Off-screen culling:** skip drawing entities fully outside the canvas.
4. **React re-renders (only if the data requires it)** — reduce the re-render cost of HUD updates without changing how other games behave. Keep `useState` to a minimum: values that change often and are not rendered live in `useRef`, and the update is skipped when the new value equals the current one. Keep `extras` referentially stable when its content is equal. Candidate: wrap `GameCanvas` in `React.memo` (callbacks already go through `useEffectEvent`) so a HUD update no longer re-renders it and the `TouchPad` portal.
5. **Page CSS (only for layers that qualify in step 2)** — in `app/globals.css`:
   - **Grid animation:** pause `gridscroll` on the player route while the game is playing (for example `animation-play-state: paused` under a player wrapper class), or rewrite it as a `transform` animation with the same speed and look. The grid keeps animating on other routes.
   - **Blend modes:** replace `mix-blend-mode` on `.av-bg::after` and `.crt-screen::after` with plain alpha overlays that look the same, or remove it where no difference is visible.
   - **Reduced motion:** the grid does not animate under `prefers-reduced-motion: reduce`.
6. **Re-measure** — repeat the step 1 `baseline` runs on the same build and profiles, append the `after` table to `references/game-performance.md`, and remove any temporary counters.
7. **Neon parity** — the user wants neon to perform like the other skins. On the production build, compare neon with classic and retro on the desktop profile and on the mobile profile at 6× CPU (a stress level where small gaps show), 3 runs of 10 s per skin, taking the median. Also sample the cost of `draw()` per frame with a temporary `performance.now()` wrapper in the engine, removed afterwards. If neon's average FPS is more than 2 FPS lower, or its median `draw()` time is more than 10% higher, than the best of the other two skins, find the neon-specific cost (palette values in `skins.ts`, per-frame color string building, palette-dependent draw paths) and fix it with the look unchanged. Otherwise log "no neon-specific cost" with the numbers. One fix per commit; the grep rule from spec 18 (no color literals in the engine) holds.
8. **QA** — play Frogger on desktop and on the 390×844 touch profile in the three skins to confirm look and feel are unchanged (screenshots in `.playwright-screenshots/`). If the CSS or React code changed, also check `/`, `/games`, `/game/[id]`, `/player/snake`, `/hall-of-fame` and `/about` before/after, and smoke-test one other game. Then `npm run format:check`, `npm run lint` and `npm run build`. Patch `app/globals.css` with small Bash edits if the format hook would rewrite a large diff (see project memory).

## Acceptance criteria

- [x] `references/game-performance.md` exists with a Frogger baseline table for the desktop and throttled mobile profiles, measured on a production build.
- [x] The log has one row per disabled CSS layer and one `npm run dev` measurement, and states the dev vs production difference.
- [x] In the `after` run, Frogger shows an average of at least 58 FPS with no frame over 50 ms in 10 s of play on the desktop profile.
- [x] In the `after` run, Frogger shows no frame over 50 ms in 10 s of play on the 390×844 profile with 4× CPU throttling.
- [x] If Frogger already met the target in the baseline, there is no performance code change and the log says so.
- [x] Each engine, React and CSS change is justified by a number in the log; areas with no gain are unchanged and the log says so.
- [x] If step 4 was done, the `GamePlayer` re-render count per 10 s in Frogger is lower than the baseline.
- [x] The log has a neon parity table (neon, classic, retro; desktop and mobile at 6× CPU; median of 3 runs, plus `draw()` time), and neon is within 2 FPS and 10% `draw()` time of the best other skin, or the log states the fix that closed the gap.
- [x] Neon, classic and retro look identical to before in Frogger, including the paused-frame repaint after pressing SKIN.
- [x] Before/after screenshots of `/player/frogger` look the same (grid, scanlines, vignette) at 1366×650 and 390×844.
- [x] If the grid animation changed, it still runs on the non-player routes as before, and does not animate under `prefers-reduced-motion: reduce`.
- [x] Frogger gameplay is unchanged: hops, river carry, hazards, goals, time bar, score, lives, touch pad, sound and game over flow.
- [x] No file under `lib/games/asteroids/`, `tetris/`, `arkanoid/` or `snake/` changes, and `lib/games/types.ts` is unchanged.
- [x] `scrollWidth <= innerWidth` at 360×640, 390×844 and 667×375, and the touch pad fit rules from specs 15–17 still hold.
- [x] No temporary counters or debug logging remain in the code.
- [x] `npm run format:check`, `npm run lint` and `npm run build` complete with no errors.

## Decisions taken and discarded

- **Yes:** one performance spec, with Frogger as the measured and tuned game. The user asked to keep a single spec instead of splitting the CSS work out.
- **Yes:** the CSS and React changes are shared code, so they are allowed only if they look and behave the same for the other four games. They may help those games, but those games are not measured here.
- **Yes:** measure first. The cause is unproven and the engine already limits HUD updates, so fixing React blindly could change nothing.
- **Yes:** measure on a production build. Dev mode is not a fair proxy, and the user's reports came from dev.
- **Yes:** target is 60 FPS with no frame over 50 ms, on desktop and on a throttled mobile profile (4× CPU).
- **Yes:** keep `useState` to a minimum. Values that change often and are not rendered (counters, last-seen HUD values, timers) go in `useRef`, and a re-render is skipped when a new value equals the current one. `useState` stays only for values the UI shows or reacts to.
- **Yes:** measure CSS layers off one at a time, so only layers with a real cost are changed (at least 5 FPS gain or fewer frames over 50 ms).
- **Yes:** a neon parity step (step 7), added after the Step 6 `after` run on request. The baseline and `after` runs showed neon equal to the other skins at 60 Hz (46.6 vs 45.8 and 45.9 FPS; 60 FPS each after), so the step measures at a harsher profile and fixes only a real neon-specific cost.
- **Yes (default):** `GamePlayer` stays untouched unless the data requires it; prefer Frogger-side and CSS fixes first.
- **Yes (default):** results live in `references/game-performance.md`, like `game-mobile.md` and `game-skins.md`.
- **Yes (default):** Playwright MCP with an injected sampler for measurement, no new dependency and no test runner (project rule).
- **No:** a separate CSS spec (the former draft 20 was merged into this one and deleted).
- **No:** touching the other four engines, even though some use `shadowBlur`. Another spec if their measurement shows a need.
- **No:** removing the CRT frame, vignette or noise, or a lighter look on mobile. The look must stay the same.
- **No:** a permanent FPS overlay or a performance toggle in the app. They add code that ships to users.
- **No:** a fixed-timestep loop rewrite. The engine already scales by `dt` with a `MAX_DT` clamp.
- **No:** moving the game to a Web Worker or `OffscreenCanvas`. Overengineering for this size of game.
- **Note:** the user did not describe the symptom (FPS, input lag or speed variation). The baseline covers frame time; input lag and refresh-rate speed differences are noted in the log if seen, and handled in their own spec.

## Identified risks

| Risk                                                                                | Mitigation                                                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| The slowness is mostly the dev server, and production already meets the target      | Step 2 records "not needed" and the spec closes with the log only, which is a valid outcome.      |
| Playwright in WSL has no real GPU, so FPS and blend-mode cost may be under-reported | Compare before/after on the same machine; recheck on a real phone if possible and log it.         |
| 4× CPU throttling is not a real phone                                               | Treat it as a proxy; note it in the log.                                                          |
| A `GamePlayer`, `GameCanvas` or CSS change affects the other four games             | Make only look-neutral changes; smoke-test one other game and the main routes in step 7.          |
| An alpha overlay does not look exactly like `overlay` or `multiply` blend           | Compare screenshots; keep the blend mode if no close match exists.                                |
| Pausing the grid on the player route makes the page feel static                     | The grid is behind the game and mostly hidden by the CRT frame; check visually in step 7.         |
| A cached background layer goes stale after `setSkin`                                | Rebuild the layer in `setSkin` and repaint a paused frame (the spec 13 and 18 rule).              |
| A draw-path refactor changes a skin's look                                          | Compare screenshots per skin; the grep rule from spec 18 (no color literals in the engine) holds. |
| The format hook rewrites the whole of `app/globals.css` on each edit                | Patch the file with small `Bash` edits when the diff would be large.                              |
| Temporary re-render counters are left in the code                                   | Acceptance criterion and step 6 require removing them.                                            |

## What is **not** in this spec

- Measuring or tuning the engines of Asteroids, Tetris, Arkanoid or Snake.
- Skin, background, CRT or scanline design changes.
- Gameplay, controls, sound or touch pad changes.
- Page load time, bundle size, fonts or images.
- A permanent FPS overlay, Web Workers or an `OffscreenCanvas` rewrite.
- Supabase, API routes and server actions.

Each one of those, if it lands, goes in its own spec.
