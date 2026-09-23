# 05 — Asteroids Game

**State:** Implemented
**Depends on:** 01-mvp-screens, 02-home-landing-and-games-route
**Date:** 2026-09-23 (amended 2026-09-23: ASTEROIDS becomes a new catalog game; ROCKS stays as it was)

**Objective:** Port `references/started-games/02-asteroids/game.js` to a TypeScript canvas engine, restyled in the app's neon palette, that runs inside the existing `GamePlayer` shell at `/player/asteroids`. ASTEROIDS is added to the catalog as a new, independent game; the existing ROCKS (`rocas`) entry is a different game and stays unchanged.

## Scope

### In scope

- A TypeScript port of `game.js` at `lib/games/asteroids/engine.ts`. It keeps the reference gameplay as-is: ship rotation, thrust and drag, toroidal wrapping, bullets with TTL and a 0.2 s cooldown, asteroid sizes 3 → 2 → 1 with the same `RADII`, `SPEEDS`, and `POINTS` (20 / 50 / 100), explosion particles, 3 lives, 3 s respawn invincibility with blinking, a 2 s respawn delay, levels (`3 + level` large asteroids per level), and the triple-shot power-up (15% drop chance, guaranteed after 5 kills, one per level, 5 s duration, 12 s TTL).
- The engine is framework-free (no React import). It owns the canvas, the `requestAnimationFrame` loop, and its own keyboard listeners. It exposes a small control API and reports state changes through callbacks (see Data model).
- Fixed logical resolution of 800 × 600 (4:3, same as the `.crt-screen` aspect ratio). The canvas fills `.crt-screen` through CSS scaling and keeps its aspect ratio.
- Neon restyle, drawn on the canvas with the app's color values: cyan ship, magenta/yellow asteroid outlines, white-to-cyan bullets, orange thrust flame, cyan power-up diamond with the "3x" label. Glow comes from `shadowBlur`/`shadowColor`. The existing `.crt-screen::after` scanline overlay stays on top of the canvas.
- The canvas draws no HUD and no overlay text. Score, lives, and level go to the React HUD in `GamePlayer`. The triple-shot timer is shown as an extra HUD stat (`3X` with the seconds left) only while it is active.
- `GamePlayer` integration, only for `game.id === "asteroids"`:
  - The fake animated arena (`.game-arena` with `.enemy`/`.player-ship`) and the random score timer are replaced by the canvas.
  - PAUSE/RESUME calls `engine.pause()`/`engine.resume()`. P and Escape also toggle pause from the keyboard, and the React `paused` state stays in sync.
  - END calls `engine.end()`, which ends the run and opens the existing GAME OVER modal.
  - Losing the last life opens the same GAME OVER modal with the final score. SAVE SCORE uses the existing `saveScore()` (`localStorage`, `av_scores`).
  - PLAY AGAIN calls `engine.restart()`. EXIT and BACK TO VAULT navigate away, and the engine is destroyed on unmount.
- Keyboard input: ↝/→ rotate, ↑ thrust, Space fire, P/Escape pause. While the game is mounted, `preventDefault()` is called for arrows and Space so the page does not scroll. Keys are ignored while the GAME OVER modal is open, so typing initials does not fire the ship.
- The game auto-pauses when the browser tab is hidden (`visibilitychange`).
- On touch-only devices (`(pointer: coarse)` with no fine pointer), the CRT shows a "KEYBOARD REQUIRED" notice instead of starting the game.
- New catalog entry in `lib/data.ts` (amendment), appended after the existing eight: `id: "asteroids"`, `title: "ASTEROIDS"`, English `short`/`long` describing the real game (mention the triple-shot power-up), `category: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroids"`, `best: 0`, `plays: "NEW"`. Routes: `/game/asteroids` and `/player/asteroids`.
- New `cover-asteroids` cover art in `app/globals.css`, CSS-only like the other covers, in the in-game style: magenta/yellow asteroid outlines and a cyan ship on the dark radial background. It must read as a different game from the `cover-rocas` art.
- The ROCKS (`rocas`) entry and the "ROCKS" line in the home activity feed stay exactly as on `main`.
- All in-game and HUD copy in English (the reference's Spanish strings `NIVEL`, `PUNTAJE`, and `ESPACIO PARA REINICIAR` are not ported).

### Not in scope

- The other eight catalog games, including ROCKS (`rocas`). They keep the current simulated `GamePlayer` behavior unchanged.
- On-screen touch controls (rotate/thrust/fire buttons) — deferred to a future mobile-controls spec.
- Sound effects or music.
- UFOs, hyperspace, or any gameplay not present in `game.js`.
- Saving scores to Supabase or showing real scores on leaderboards. Scores stay in `localStorage`, and the `/game/asteroids` leaderboard uses `seededScores` like the other games.
- A generic multi-game engine framework or plugin registry. The `asteroids` check in `GamePlayer` is a direct branch; a shared abstraction can come when the second real game lands.
- Changes to the ROCKS entry or its `cover-rocas` cover art.
- Featuring ASTEROIDS on the home page (hero, mini-rail order, or activity feed); it only joins the `/games` catalog.
- High-DPI (`devicePixelRatio`) canvas rendering.

## Data model

No new persisted data. Scores keep using the existing `SavedScore` shape and `av_scores` key.

New in-memory shapes in `lib/games/asteroids/engine.ts`:

```ts
export interface AsteroidsHud {
  score: number;
  lives: number;
  level: number;
  tripleShot: number; // seconds left, 0 when inactive
}

export interface AsteroidsCallbacks {
  onHud: (hud: AsteroidsHud) => void; // called only when a value changes (tripleShot rounded to 0.1 s)
  onGameOver: (finalScore: number) => void; // last life lost, or end() called
  onPauseChange: (paused: boolean) => void; // P/Escape or tab hidden
}

export interface AsteroidsEngine {
  pause(): void;
  resume(): void;
  end(): void; // stops the run and fires onGameOver with the current score
  restart(): void; // new game: score 0, 3 lives, level 1
  destroy(): void; // cancels rAF and removes all listeners
}

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine;
```

Internal engine state follows `game.js`: `Ship`, `Bullet`, `Asteroid`, `PowerUp`, and `Particle` classes with `update(dt)`/`draw(ctx)` and a `dead` flag. State is `'playing' | 'dead' | 'paused' | 'gameover'`. `dt` is capped at 50 ms. All state lives inside the `createAsteroids` closure (no module-level globals), so mounting twice (React Strict Mode) does not share state.

New component: `components/games/AsteroidsCanvas.tsx` (client component). It renders the `<canvas width={800} height={600}>`, creates the engine in `useEffect`, calls `destroy()` in the cleanup, and passes a ref-based handle (`pause`/`resume`/`end`/`restart`) up to `GamePlayer`.

## Implementation plan

1. **Rename the catalog entry** — update the `rocas` entry in `lib/data.ts` (title ASTEROIDS, new English `short`/`long`) and the "ROCKS" line in `app/page.tsx`. The app still runs; `/games` and `/game/rocas` show ASTEROIDS.
2. **Port the engine** — add `lib/games/asteroids/engine.ts` with the classes, constants, collision, levels, and power-up logic from `game.js`, typed and scoped inside `createAsteroids()`. Replace direct `window` globals with the passed canvas and with listeners registered/removed by the engine. Remove all canvas HUD and overlay drawing; emit `onHud`, `onGameOver`, and `onPauseChange` instead. Nothing imports it yet.
3. **Apply the neon palette** — set the stroke/fill colors and `shadowBlur` glow described in scope for the ship, flame, asteroids, bullets, particles, and power-up. Clear each frame with the dark radial background used by `.game-arena`.
4. **Build `AsteroidsCanvas`** — add `components/games/AsteroidsCanvas.tsx`: canvas scaled to fill `.crt-screen` with `object-fit`-like CSS (`width: 100%; height: 100%`), engine created on mount, destroyed on unmount, handle exposed via ref. Include the touch-only "KEYBOARD REQUIRED" notice.
5. **Wire `GamePlayer`** — for `game.id === "rocas"`: render `AsteroidsCanvas` instead of the fake arena, skip the random score/level effects, drive `score`/`lives`/`level`/triple-shot HUD from `onHud`, connect PAUSE/END/PLAY AGAIN to the engine, open the modal from `onGameOver`, sync `paused` from `onPauseChange`, and stop keyboard game input while the modal is open. Other games keep the current code path.
6. **QA pass** — run `npm run dev` and use the Playwright MCP tools on `/player/rocas` (screenshots in `.playwright-screenshots/`): the ship moves and fires with the keyboard, asteroids split, the score/lives/level HUD updates, the power-up appears and the `3X` stat shows, PAUSE and P pause the canvas, END and losing all lives open the modal, SAVE SCORE writes to `av_scores`, PLAY AGAIN starts a fresh run, EXIT leaves with no console errors, and the page does not scroll on arrows/Space. Check that `/player/bloque-buster` still runs the simulated game. Check a mobile viewport with touch emulation for the notice. Run `npm run build` and `npm run lint`.
7. **Split ASTEROIDS into its own catalog entry (amendment)** — restore the `rocas` entry in `lib/data.ts` and the "ROCKS" feed line in `app/page.tsx` to their `main` versions; append the new `asteroids` entry; add the `cover-asteroids` art to `app/globals.css`; change the `GamePlayer` branch to `game.id === "asteroids"`. Then re-run a short QA: `/games` shows nine games with both ROCKS and ASTEROIDS, `/game/asteroids` shows the new cover and copy, `/player/asteroids` runs the canvas game, `/player/rocas` runs the simulated arena again, SAVE SCORE writes `game: "asteroids"`, and `npm run lint` and `npm run build` pass.

## Acceptance criteria

- [x] `/games` lists ASTEROIDS as a ninth game with its own `cover-asteroids` art, linking to `/game/asteroids`, which shows the new copy.
- [x] The ROCKS (`rocas`) entry, its cover, and the "ROCKS" home activity line are unchanged from `main`.
- [x] `/player/asteroids` renders an 800 × 600 logical canvas that fills the CRT screen at 4:3, with the scanline overlay still visible on top.
- [x] ↝/→ rotate, ↑ thrusts with a visible flame, and Space fires; the ship and asteroids wrap around the edges.
- [x] Shooting a large asteroid adds 20 points and splits it in two medium ones; medium adds 50 and splits into two small ones; small adds 100 and disappears.
- [x] Clearing all asteroids advances the level, and the new level spawns `3 + level` large asteroids.
- [x] A collision costs one life; the ship respawns after about 2 s at the center and blinks while invincible for 3 s.
- [x] The triple-shot power-up drops (guaranteed by the 5th kill of a level if not earlier), picking it up fires three bullets for 5 s, and the HUD shows a `3X` stat with the remaining seconds only while it is active.
- [x] The React HUD shows the live score, lives, and level; the canvas draws no HUD or overlay text.
- [x] PAUSE/RESUME and the P/Escape keys pause and resume the game, and the button label stays in sync with the keyboard.
- [x] Switching to another tab and back leaves the game paused.
- [x] Losing the last life, or pressing END, opens the GAME OVER modal with the real final score.
- [x] Typing initials in the modal does not move or fire the ship; SAVE SCORE adds an entry with `game: "asteroids"` and the final score to `localStorage` `av_scores`.
- [x] PLAY AGAIN starts a fresh run with score 0, 3 lives, and level 1.
- [x] Arrow keys and Space do not scroll the page while `/player/asteroids` is open.
- [x] Leaving `/player/asteroids` (EXIT, BACK TO VAULT, or Nav) stops the loop and removes the key listeners, with no console errors.
- [x] On a touch-only viewport, `/player/asteroids` shows "KEYBOARD REQUIRED" instead of starting the game.
- [x] The other eight games at `/player/[id]`, including `/player/rocas`, still show the simulated arena and behave as before.
- [x] Ship, asteroids, bullets, and power-up use the neon palette with glow, not plain white.
- [x] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes (amendment): a new, independent `asteroids` catalog entry** — explicit user decision after implementation: ROCKS is a different game, and ASTEROIDS is its own game with its own URL (`/player/asteroids`). Replaces the original decision below.
- **No (amendment): reuse the `rocas` catalog slot renamed to ASTEROIDS** — the original decision; dropped because it overwrote a different game.
- **Yes (amendment, default): append the entry last, with `best: 0` and `plays: "NEW"`** — no invented stats for a game nobody has played yet, and no reordering of the existing catalog or home rail.
- **Yes: React shell owns HUD, pause, and game over** — explicit user decision. The game looks like every other screen in the app, and it reuses the existing modal and `saveScore()`.
- **No: canvas-drawn HUD or self-contained port** — it would duplicate the React HUD and skip score saving.
- **Yes: neon palette with glow** — explicit user decision. It matches the app's cyan/magenta/yellow style inside the CRT frame.
- **Yes: keyboard only, with a touch-only notice** — explicit user decision. On-screen controls need their own layout and feel decisions, so they get their own spec.
- **Yes: framework-free engine with a callbacks API** — keeps the game loop out of React renders (no state updates at 60 fps; `onHud` fires only on changes) and makes the engine reusable for a future standalone test.
- **Yes: all state inside `createAsteroids()`** — the reference uses module globals, which would break under React Strict Mode's double mount and when navigating back to the page.
- **Yes: direct `game.id === "asteroids"` branch in `GamePlayer`** — the simplest option with one real game. A game registry is deferred until a second real game exists.
- **Yes: fixed 800 × 600 logical canvas scaled by CSS** — keeps the reference physics and speeds unchanged at any screen size.
- **No: high-DPI canvas rendering** — thin vector lines at CSS scale are acceptable for a retro look; can be added later.
- **Yes: English copy** — matches the convention of specs 01–03.
- **Yes (default): auto-pause on hidden tab** — the `dt` cap already prevents physics jumps, but the player should not lose lives while away.

## Identified risks

| Risk                                                                 | Mitigation                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| React Strict Mode mounts effects twice, creating two loops           | The engine has no module state, and the `useEffect` cleanup calls `destroy()`.                         |
| Global key listeners steal input from the modal's initials field     | The engine ignores input when in `gameover` state, and listeners are removed on unmount.               |
| `onHud` called every frame causes excessive React re-renders         | The engine compares against the last emitted HUD and calls `onHud` only when a value changes.          |
| `shadowBlur` glow is slow on low-end devices                         | Glow is limited to strokes of a few dozen objects; if FPS drops in QA, reduce blur on particles first. |
| Arrow/Space `preventDefault()` blocks keyboard use elsewhere on page | Only those keys are blocked, only while the game is mounted, and not when focus is in an input.        |
