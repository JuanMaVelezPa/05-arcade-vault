# 08 — TETRIS Game

**State:** Approved
**Depends on:** 05-asteroids-game, 06-games-and-scores-tables, 07-published-games-only
**Date:** 2026-09-28

**Objective:** Port `references/started-games/03-tetris/game.js` to a TypeScript canvas engine. The port is restyled in the app's neon palette and runs inside the `GamePlayer` shell at `/player/tetris`. TETRIS is added to the catalog as a new, published `games` row, so its scores go to the existing leaderboards.

## Scope

### In scope

- A TypeScript port at `lib/games/tetris/engine.ts` that follows the shared engine contract (`lib/games/types.ts`). It keeps the reference gameplay as-is:
  - a 10 × 20 board with 30 px cells;
  - the 8 reference pieces, each with a 1-in-8 chance: I, O, T, S, Z, J, L, and the 3 × 3 "nut" ring with a hole in the middle;
  - clockwise rotation (transpose and reverse) with wall kicks `[0, -1, 1, -2, 2]`;
  - gravity that accumulates `dt` against `dropInterval = max(100, 1000 − (level − 1) × 90)` ms;
  - soft drop (+1 point per row) and hard drop (+2 points per cell);
  - the ghost piece;
  - line clears scored as `[0, 100, 300, 500, 800][cleared] × level`;
  - `level = floor(lines / 10) + 1`.
- The run ends when a newly spawned piece collides right away. There are no lives, so the HUD sends `lives: 0` and shows `—`.
- A fixed logical resolution of 450 × 600. The 300 × 600 board sits on the left. A 150 px side column on the right draws the next piece inside a glowing frame, with no text. The 3:4 canvas is letterboxed inside the 4:3 `.crt-screen`.
- Neon restyle, with colors taken from the `app/globals.css` tokens:
  - I `--cyan`, O `--yellow`, T `--magenta`, S `--green`, Z `--bronze`, J `--silver`, L `--gold`, and the nut `--ink-dim` (metallic, like the reference gray);
  - glowing blocks via `shadowBlur`, with the reference's top highlight strip;
  - the ghost piece drawn as a faint outline in the piece's color;
  - grid lines in `--line`;
  - the dark radial background of `.game-arena`.
- The canvas draws no HUD and no overlay text. Score, lives (`—`), and level go to the React HUD. Extra HUD stat: `LINES`, always shown.
- Controls:
  - ↝ and → move the piece;
  - ↑ or X rotates it;
  - ↓ soft drops it (browser key repeat, as in the reference);
  - Space hard drops it (key repeat ignored);
  - P and Escape pause.
- Auto-pause on a hidden tab and on window blur.
- Touch-only viewports show the "KEYBOARD REQUIRED" notice.
- One-time registry step:
  - add the shared engine contract `lib/games/types.ts`;
  - add a generic `components/games/GameCanvas.tsx`, which replaces `AsteroidsCanvas.tsx`;
  - add `lib/games/registry.ts`;
  - move Asteroids onto them, with triple-shot shown as the `3X` HUD extra;
  - rename `.asteroids-canvas` to `.game-canvas`, with letterbox sizing for non-4:3 games.
- A `tetris` entry in `lib/games/registry.ts`.
- New `cover-tetris` cover art in `app/globals.css`. It is CSS-only and distinct from every existing cover, including `cover-tetro`.
- Migration `supabase/migrations/0003_tetris_game.sql`. It inserts a new `games` row and publishes it:
  - `id: "tetris"`
  - `title: "TETRIS"`
  - `tagline: "Stack falling blocks, clear lines, and keep up as the speed climbs."`
  - `description: "Guide falling pieces into a 10 × 20 well. Fill a row to clear it, and clear four at once for 800 points × level. Every 10 lines raises the level and the drop speed. A ghost piece shows where you'll land, the side panel previews the next piece, and watch out for the nut: a hollow 3 × 3 ring that doesn't fit like the rest."`
  - `category: "PUZZLE"`
  - `color: "yellow"`
  - `cover: "cover-tetris"`
  - `sort_order: 10`
  - `is_published: true`
- All copy in English. The reference's Spanish strings (`PAUSA`, `Puntuación`, `Reiniciar`, `mover`, `rotar`, `bajar`, `caída`) are not ported.

### Not in scope

- Reusing or publishing the seeded row `caida` (DROP). It stays unpublished, and `cover-tetro` stays unchanged.
- The reference's light/dark theme toggle and its `localStorage` theme key.
- Sound effects or music (the reference has none).
- On-screen touch controls.
- Gameplay not present in the reference: hold piece, 7-bag randomizer, SRS kicks, T-spins, lock delay, combos.
- Changes to leaderboard code, views, or RLS. They already support any published game.
- High-DPI canvas rendering.

## Data model

No schema change. One new `games` row (see Scope).

```ts
export function createTetris(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
```

Internal state, all inside the closure:

- `board: number[][]` (`ROWS × COLS`, `0` = empty, `1–8` = piece index);
- `current` and `next`, each `{ type, shape: number[][], x, y }`;
- `score`, `lines`, `level`, `dropInterval`, and `dropAccum` (ms);
- `state`, one of `'playing' | 'paused' | 'gameover'`, plus `stateBeforePause`;
- `dt` capped at 50 ms.

HUD payload: `{ score, lives: 0, level, extras: [{ label: "LINES", value: String(lines) }] }`.

## Implementation plan

1. **Registry step:**
   - add `lib/games/types.ts`, `lib/games/registry.ts` (with `asteroids`), and `components/games/GameCanvas.tsx`;
   - adapt the Asteroids engine to `GameEngine`/`GameCallbacks` (`tripleShot` becomes the `3X` extra);
   - in `GamePlayer`, switch to `GAME_REGISTRY[game.id]` and render the extras;
   - rename `.asteroids-canvas` to `.game-canvas`;
   - delete `AsteroidsCanvas.tsx`;
   - QA `/player/asteroids`.
2. **Port the engine** — `lib/games/tetris/engine.ts`. Nothing imports it yet.
3. **Apply the neon palette** — piece colors, glow, ghost outline, grid, background, and the next-piece frame.
4. **Register** — add the `tetris` entry (450 × 600, `keyboard`, aria label, controls `↝ → ↑ ↓ SPACE`) to `lib/games/registry.ts`.
5. **Cover art** — add `cover-tetris` to `app/globals.css` (`/frontend-design`).
6. **Migration** — write `0003_tetris_game.sql`, apply it with MCP `apply_migration`, verify it with `execute_sql`, and run `get_advisors` (security).
7. **QA** — Playwright MCP (screenshots in `.playwright-screenshots/`). Delete the QA score rows, then run `npm run lint` and `npm run build`.

## Acceptance criteria

- [ ] `/games` lists TETRIS with its `cover-tetris` art and the `PUZZLE` chip, linking to `/game/tetris`.
- [ ] `/game/tetris` shows the new copy, Global Best `0`, Plays `NEW`, and `NO SCORES YET — BE THE FIRST` before any save.
- [ ] `/player/tetris` renders a 450 × 600 logical canvas, letterboxed inside the CRT screen, with the scanline overlay on top.
- [ ] ↝ and → move the piece. ↑ and X rotate it, with wall kicks next to the walls.
- [ ] ↓ moves the piece down one row and adds 1 point.
- [ ] Space drops the piece instantly and adds 2 points per cell.
- [ ] The ghost piece shows the landing position.
- [ ] The side column shows the next piece, and it becomes the current piece on the next spawn.
- [ ] Clearing 1, 2, 3, or 4 lines adds 100, 300, 500, or 800 × level.
- [ ] `LINES` counts the cleared lines. The level rises every 10 lines, and the pieces fall faster.
- [ ] The nut piece spawns and can be moved, rotated, and locked.
- [ ] The React HUD shows the live score, `—` for lives, the level, and `LINES`. The canvas draws no HUD or overlay text.
- [ ] PAUSE/RESUME, P, and Escape pause and resume the game, and the button label stays in sync.
- [ ] Switching tabs leaves the game paused.
- [ ] Topping out opens GAME OVER with the real final score.
- [ ] Pressing END opens GAME OVER with the real final score.
- [ ] Typing initials in the modal does not control the game.
- [ ] SAVE SCORE inserts a `scores` row with `game_id: "tetris"`.
- [ ] The saved score shows on `/game/tetris`, on `/hall-of-fame?game=tetris`, and as the TETRIS champion on `/hall-of-fame`.
- [ ] PLAY AGAIN starts a fresh run with an empty board, score 0, level 1, and lines 0.
- [ ] Arrow keys and Space do not scroll the page.
- [ ] Leaving the page stops the loop with no console errors.
- [ ] A touch-only viewport shows the "KEYBOARD REQUIRED" notice.
- [ ] `/player/asteroids` still works: movement, HUD, the `3X` stat, pause, END, and save.
- [ ] The migration file exists and is applied.
- [ ] `get_advisors` (security) reports no new errors.
- [ ] QA score rows are deleted.
- [ ] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: a new `games` row, appended last and published.** A new game gets a new id. The look-alike seeded row `caida` (DROP) stays hidden.
- **Yes: the React shell owns the HUD, pause, and game over.** This is the same split as in spec 05.
- **Yes: a framework-free engine behind the shared contract.** This is the same approach as spec 05.
- **Yes: the one-time registry now.** Spec 05 deferred it until a second real game landed, and TETRIS is that game.
- **Yes: keep the nut piece.** Explicit user decision. It follows the rule to port `game.js` as-is, even though the README lists only 7 pieces.
- **Yes: the next-piece preview goes in a side column on the canvas (450 × 600).** Explicit user decision. It keeps the reference's visual preview without drawing text.
- **No: the preview as a HUD text extra.** It loses the piece shape.
- **Yes: title `TETRIS` and id `tetris`.** Explicit user decision.
- **Yes: color `yellow`.** Explicit user decision. It stays distinct from ASTEROIDS (cyan).
- **Yes (default): category `PUZZLE`.** It is the closest of the four DB categories, and the `/games` chips pick it up automatically.
- **Yes (default): `lives: 0`, shown as `—`.** The reference has no lives, and the contract defines this case.
- **Yes (default): `LINES` as the only HUD extra.** It is the one reference stat that has no fixed HUD slot.
- **Yes (default): Space ignores key repeat.** Holding Space would otherwise hard-drop several pieces in a row. Movement and soft drop keep repeat, as in the reference.
- **Yes (default): Escape pauses, as P does.** This matches the shell and Asteroids. The reference only had P.
- **No: the theme toggle.** The app has a single neon theme.
- **No: sounds.** The reference has none.

## Identified risks

| Risk                                                 | Mitigation                                                                                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| The tall 3:4 canvas looks small inside the 4:3 CRT   | Letterbox with `aspect-ratio` and `margin: auto`. At 30 px cells, the board stays readable at the CRT's normal size. Checked with a QA screenshot. |
| The generic `GameCanvas` refactor breaks Asteroids   | Step 1 ends with a full Asteroids QA before any TETRIS code is written.                                                                            |
| The nut piece leaves holes that can't be filled      | This is accepted reference behavior (explicit user decision) and is described in the catalog copy.                                                 |
| "TETRIS" is a trademarked name                       | Explicit user decision for a course project. Renaming later only takes a `title` UPDATE plus a new id if the URL has to change.                    |
| Browser key repeat on ↓ scores soft-drop points fast | This matches the reference. The score is capped at 10,000,000 by the DB CHECK.                                                                     |
| QA leaves test scores in the production table        | The QA step deletes its own rows with `execute_sql`.                                                                                               |

## What is **not** in this spec

- Publishing or changing DROP (`caida`) or `cover-tetro`.
- The theme toggle, sounds, and touch controls.
- Modern guideline mechanics: hold, 7-bag, SRS, T-spins, lock delay.
- Leaderboard, view, or RLS changes.
- High-DPI rendering.

Each one of those, if it lands, goes in its own spec.
