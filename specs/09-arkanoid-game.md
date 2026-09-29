# 09 — ARKANOID Game

**State:** Approved
**Depends on:** 05-asteroids-game, 06-games-and-scores-tables, 07-published-games-only, 08-tetris-game
**Date:** 2026-09-28

**Objective:** Port `references/started-games/04-arkanoid/game.js` to a TypeScript canvas engine. The port is restyled in the app's neon palette and runs inside the `GamePlayer` shell at `/player/arkanoid`. ARKANOID is added to the catalog as a new, published `games` row, so its scores go to the existing leaderboards.

## Scope

### In scope

- A TypeScript port at `lib/games/arkanoid/engine.ts` that follows the shared engine contract (`lib/games/types.ts`). It keeps the reference gameplay as-is:
  - an 800 × 600 field with a paddle of 81 × 14 at `y = 560` that moves at 400 px/s with the arrow keys;
  - a 16 × 16 ball with a base velocity of `(200, −300)` px/s, multiplied by the level's speed;
  - the ball bounces off the left, right, and top walls;
  - the ball bounces off the paddle when it falls onto it (`vy` flips, `vx` is kept);
  - a hit on a brick (AABB) destroys it, adds 10 points, and flips `vy`, with at most one brick per frame;
  - bricks are 64 × 24, laid out on a 10 × 6 grid starting at `(80, 80)`;
  - the 5 reference levels from `levels.js`: full grid ×1.00, pyramid ×1.10, checkerboard ×1.21, gapped rows ×1.33, and frame + cross ×1.46;
  - clearing a level loads the next one, and the ball restarts from the paddle;
  - 3 lives. When the ball drops below the field, the player loses a life and the ball relaunches from the paddle right away;
  - a break animation of 150 ms (4 steps) for each destroyed brick.
- The run ends when the last life is lost, or when level 5 is cleared (the reference's win screen). Both call `onGameOver(score)`.
- A fixed logical resolution of 800 × 600, which fills the 4:3 `.crt-screen` with no letterbox.
- Neon restyle with no spritesheet. Colors come from the `app/globals.css` tokens:
  - bricks by reference color: red `--bronze`, yellow `--yellow`, cyan `--cyan`, magenta `--magenta`, hotpink `--silver`, green `--green`, and gray `--ink-dim`;
  - glowing bricks via `shadowBlur`, with a top highlight strip;
  - the paddle is a `--cyan` bar with `--magenta` end caps;
  - the ball is an `--ink` core with a `--cyan` glow;
  - the break animation is an expanding, fading outline in the brick's color;
  - the dark radial background of `.game-arena`.
- The canvas draws no HUD and no overlay text. Score, lives (♥), and level go to the React HUD. There are no extra HUD stats.
- Controls:
  - the pointer moves the paddle (mouse move, or touch drag) with its center following the pointer's x, as in the reference;
  - ↝ and → move the paddle;
  - P and Escape pause.
- Auto-pause on a hidden tab and on window blur.
- Registry `input: "pointer"`. Touch-only viewports get the playable canvas, not the "KEYBOARD REQUIRED" notice.
- Sound effects: `ball-bounce.mp3` plays on wall and paddle bounces, and `break-sound.mp3` plays on brick breaks. They are copied to `public/games/arkanoid/` and play only while the game is running.
- Level selector in the pause overlay:
  - `GameEntry` gets an optional `levels?: number`, and `GameEngine` and `GameHandle` get an optional `jumpToLevel?(level: number): void`;
  - when `entry.levels` is set, the React pause overlay in `GamePlayer` shows `JUMP TO LEVEL` and the buttons `1`…`N`, with the current level highlighted;
  - a click loads that level's bricks and resumes the game, and the score and lives are kept (reference behavior).
- Canvases with `input: "pointer"` get `touch-action: none`, so a touch drag moves the paddle and does not scroll the page.
- An `arkanoid` entry in `lib/games/registry.ts`.
- New `cover-arkanoid` cover art in `app/globals.css`. It is CSS-only and distinct from every existing cover, including `cover-bricks`.
- Migration `supabase/migrations/0004_arkanoid_game.sql`. It inserts a new `games` row and publishes it:
  - `id: "arkanoid"`
  - `title: "ARKANOID"`
  - `tagline: "Bounce the ball, smash every brick, and survive five speeding walls."`
  - `description: "Slide the paddle with the mouse, a finger, or the arrow keys, and keep the ball in play. Every brick is worth 10 points. Clear a wall to reach the next of five patterns: full grid, pyramid, checkerboard, gapped rows, and a framed cross. The ball gets 10% faster on every level. You have 3 lives, and clearing level 5 ends the run. Pause the game to jump to any level."`
  - `category: "ARCADE"`
  - `color: "magenta"`
  - `cover: "cover-arkanoid"`
  - `sort_order: 11`
  - `is_published: true`
- All copy in English. The reference's Spanish strings (`PAUSA`, `Saltar al nivel:`, `Nivel`, `Score`, `¡Completaste el juego!`) are not ported.

### Not in scope

- Reusing or publishing the seeded row `bloque-buster` (BLOCK BUSTER). It stays unpublished, and `cover-bricks` stays unchanged.
- The reference spritesheet (`spritesheet-breakout.png`) and its helpers.
- A mute toggle or volume control in the shell.
- A serve (hold the ball on the paddle until a click). The reference launches the ball right away.
- Gameplay not present in the reference: power-ups, multi-hit bricks, paddle angle control, enemies.
- Changes to leaderboard code, views, or RLS. They already support any published game.
- High-DPI canvas rendering.

## Data model

No schema change. One new `games` row (see Scope).

```ts
export function createArkanoid(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine; // implements the optional jumpToLevel()
```

Optional contract additions (existing games ignore them):

```ts
// lib/games/types.ts — GameEngine
jumpToLevel?(level: number): void; // 1-based; keeps score and lives, resumes

// lib/games/registry.ts — GameEntry
levels?: number; // shows the pause-overlay level selector when set
```

Internal state, all inside the closure:

- `paddle: { x, y, w, h }` and `ball: { x, y, w, h, vx, vy }`;
- `blocks: { x, y, w, h, color, alive }[]` and `explosions: { x, y, w, h, color, elapsed }[]`;
- `score`, `lives`, `level` (1-based), and `keys: { left, right }`;
- `state`, one of `'playing' | 'paused' | 'gameover'`, plus `stateBeforePause`;
- `LEVELS` (the ported `levels.js`) as a module-level constant;
- `dt` capped at 50 ms.

HUD payload: `{ score, lives, level }`.

## Implementation plan

1. **Shell: level selector and pointer canvas:**
   - add the optional `jumpToLevel` to `GameEngine`, `levels` to `GameEntry`, and `jumpToLevel` to `GameHandle` in `GameCanvas`;
   - render the `JUMP TO LEVEL` buttons in the `GamePlayer` pause overlay when `entry.levels` is set;
   - give pointer-input canvases `touch-action: none`.

   No entry sets `levels` yet, so Asteroids and Tetris are unchanged.

2. **Port the engine** — add `lib/games/arkanoid/engine.ts` and copy the two mp3s to `public/games/arkanoid/`. Nothing imports it yet.
3. **Apply the neon palette** — bricks, paddle, ball, break animation, and background.
4. **Register** — add the `arkanoid` entry (800 × 600, `pointer`, `levels: 5`, aria label, controls `↝ →`) to `lib/games/registry.ts`.
5. **Cover art** — add `cover-arkanoid` to `app/globals.css` (`/frontend-design`).
6. **Migration** — write `0004_arkanoid_game.sql`, apply it with MCP `apply_migration`, verify it with `execute_sql`, and run `get_advisors` (security).
7. **QA** — Playwright MCP (screenshots in `.playwright-screenshots/`). Delete the QA score rows, then run `npm run lint` and `npm run build`.

## Acceptance criteria

- [x] `/games` lists ARKANOID with its `cover-arkanoid` art and the `ARCADE` chip, linking to `/game/arkanoid`.
- [x] `/game/arkanoid` shows the new copy, Global Best `0`, Plays `NEW`, and `NO SCORES YET — BE THE FIRST` before any save.
- [x] `/player/arkanoid` renders an 800 × 600 logical canvas filling the CRT screen, with the scanline overlay on top.
- [x] Moving the mouse over the canvas moves the paddle, and so do ↝ and →. The paddle stays inside the field.
- [x] The ball bounces off the walls and the paddle.
- [x] Breaking a brick removes it, plays the break animation, and adds exactly 10 points.
- [x] Bounces and breaks play their sounds, and no sound plays while paused.
- [x] Clearing all bricks loads the next level's pattern, the level goes up by 1, and the ball is faster.
- [ ] Losing the ball takes one life and relaunches the ball from the paddle.
- [x] The React HUD shows the live score, the lives as ♥, and the level. The canvas draws no HUD or overlay text.
- [x] PAUSE/RESUME, P, and Escape pause and resume the game, and the button label stays in sync.
- [x] Switching tabs leaves the game paused.
- [x] The pause overlay shows `JUMP TO LEVEL` with buttons 1–5, and the current level is highlighted.
- [x] Clicking a level button loads that level, resumes the game, and keeps the score and lives.
- [x] The pause overlays of `/player/asteroids` and `/player/tetris` show no level buttons.
- [x] Losing the last life opens GAME OVER with the real final score.
- [x] Clearing level 5 opens GAME OVER with the real final score.
- [x] Pressing END opens GAME OVER with the real final score.
- [x] Typing initials in the modal does not control the game.
- [x] SAVE SCORE inserts a `scores` row with `game_id: "arkanoid"`.
- [x] The saved score shows on `/game/arkanoid`, on `/hall-of-fame?game=arkanoid`, and as the ARKANOID champion on `/hall-of-fame`.
- [x] PLAY AGAIN starts a fresh run with level 1 bricks, score 0, 3 lives, and level 1.
- [x] Arrow keys do not scroll the page.
- [x] Leaving the page stops the loop with no console errors.
- [x] A touch-only viewport shows the canvas (no "KEYBOARD REQUIRED" notice), and a touch drag moves the paddle.
- [x] `/player/asteroids` and `/player/tetris` still work: movement, HUD, pause, END, and save.
- [x] The migration file exists and is applied.
- [x] `get_advisors` (security) reports no new errors.
- [x] QA score rows are deleted.
- [x] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: a new `games` row, appended last and published.** A new game gets a new id. The look-alike seeded row `bloque-buster` (BLOCK BUSTER) stays hidden.
- **Yes: the React shell owns the HUD, pause, and game over.** This is the same split as in spec 05.
- **Yes: a framework-free engine behind the shared contract.** This is the same approach as specs 05 and 08.
- **Yes: title `ARKANOID`, id `arkanoid`, color `magenta`, category `ARCADE`.** Explicit user decision. Magenta stays distinct from ASTEROIDS (cyan) and TETRIS (yellow).
- **Yes: keep both sound effects.** Explicit user decision. Each play call swallows the autoplay rejection, so a blocked sound never breaks the game.
- **Yes: pointer and arrow-key controls, registry `input: "pointer"`.** Explicit user decision. Pointer events cover both the mouse and touch drag, so phones can play without on-screen buttons.
- **Yes: keep the pause-menu level selector.** Explicit user decision. It moves from canvas-drawn buttons to React buttons in the pause overlay, because the canvas draws no overlay text.
- **Yes: the level selector as optional contract fields (`levels`, `jumpToLevel`).** Other games opt out by omitting them, so no existing code path changes.
- **No: canvas-drawn level buttons with a canvas click handler (reference approach).** It would draw overlay text on the canvas and duplicate the shell's pause overlay.
- **Yes (default): clearing level 5 ends the run with `onGameOver`.** The reference shows a win screen there, and the contract treats completion as the end of a run.
- **Yes (default): neon vector drawing instead of the spritesheet.** It matches the app's palette and the other ported games, and it removes the image load step.
- **Yes (default): keep the reference's 81 px paddle.** `game.js` uses 81, even though the sprite is 162 wide. The port follows `game.js`.
- **Yes (default): the pointer is ignored while paused or after game over.** The reference also moves the paddle while paused, but that lets the player set up a resume shot for free.
- **Yes (default): Escape pauses, as P does.** This matches the reference and the shell.

## Identified risks

| Risk                                                                                 | Mitigation                                                                                                                       |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| The browser blocks sounds before the first user gesture                              | `play()` is wrapped in `.catch(() => {})`. The game runs silently until the player interacts with the page.                      |
| Jumping to a level resets its bricks, so a player can replay a level for more points | Explicit user decision to keep the selector. Every point still takes a brick hit, and the DB caps scores at 10,000,000.          |
| `touch-action: none` on the canvas blocks page scroll on phones                      | It applies only to pointer-input canvases, and only over the canvas. The page scrolls from the HUD and margins.                  |
| A fast ball tunnels through a brick or the paddle when `dt` is large                 | `dt` is capped at 50 ms (max 22 px/frame at level 5, below the 24 px brick height), as in the other engines.                     |
| "ARKANOID" is a trademarked name                                                     | Explicit user decision for a course project. Renaming later only takes a `title` UPDATE, plus a new id if the URL has to change. |
| QA leaves test scores in the production table                                        | The QA step deletes its own rows with `execute_sql`.                                                                             |

## What is **not** in this spec

- Publishing or changing BLOCK BUSTER (`bloque-buster`) or `cover-bricks`.
- The spritesheet, a mute toggle, and a serve.
- Power-ups, multi-hit bricks, paddle angle control, and enemies.
- Leaderboard, view, or RLS changes.
- High-DPI rendering.

Each one of those, if it lands, goes in its own spec.
