# 11 — SNAKE Game

**State:** Implemented
**Depends on:** 05-asteroids-game, 06-games-and-scores-tables, 07-published-games-only, 09-arkanoid-game
**Date:** 2026-09-29

**Objective:** Build a five-level SNAKE as a TypeScript canvas engine that uses the fruit sprites from `references/source-assets/snake-assets/`, runs inside the `GamePlayer` shell at `/player/snake`, and is published as a new `games` row so its scores go to the existing leaderboards.

## Why this spec exists

Unlike specs 05, 08, and 09, there is no reference game to port. The only source material is `references/source-assets/snake-assets/` (`fruits.png`, a 3790 × 442 sheet, and `sprites.js`, an atlas of 22 fruit crops). The gameplay below is new. It is classic Snake, extended to 5 levels with obstacle layouts and speed-ups, and every rule is written down here so the engine does not improvise.

## Scope

### In scope

- A new engine at `lib/games/snake/engine.ts` that follows the shared engine contract (`lib/games/types.ts`):
  - a board of 32 × 24 cells of 25 px, so the logical canvas is 800 × 600 and fills the 4:3 `.crt-screen` with no letterbox;
  - the snake moves one cell per tick. It starts with length 4: head at `(8, 12)`, body to the left, heading right;
  - arrow keys and WASD turn the snake. A 180° reversal is ignored. Up to 2 turns are buffered per tick, so quick turns such as ↑ then ← are not lost;
  - one fruit is on the board at a time, on a random free cell (not on the snake or on an obstacle). Its sprite is picked at random from the 22 atlas fruits;
  - eating a fruit grows the snake by 1 segment and adds `10 × level` points;
  - hitting the border, an obstacle, or its own body costs one life;
  - after a crash with lives left, the snake respawns at the start position on the same level and **keeps its length** until GAME OVER. All its segments start coiled on the start cell `(8, 12)` heading right, and the body unrolls behind the head as it moves. The level's fruit count is kept. The snake blinks for 600 ms before it moves again;
  - 3 lives. Losing the last life ends the run;
  - eating 10 fruits on a level loads the next level. The snake **keeps its length** and respawns coiled on the start cell with the same 600 ms blink, so each level starts 10 segments longer: 4, 14, 24, 34, and 44 on levels 1–5;
  - eating the 10th fruit on level 5 adds a completion bonus of 500 points and ends the run.
- Five levels, each with its own obstacle layout and tick length. Coordinates are in cells:

  | Level | Tick   | Points per fruit | Obstacles                                                                                                                     |
  | ----- | ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
  | 1     | 140 ms | 10               | none (open field)                                                                                                             |
  | 2     | 120 ms | 20               | four corner L-blocks, each 4 + 4 cells, at the corners `(3,3)`, `(28,3)`, `(3,20)`, `(28,20)`                                 |
  | 3     | 105 ms | 30               | two horizontal bars: `y = 6` and `y = 17`, `x = 8..23`                                                                        |
  | 4     | 90 ms  | 40               | box `x = 6..25`, `y = 4..19`, with 4-cell gaps in the middle of each side                                                     |
  | 5     | 75 ms  | 50               | vertical bars `x = 10` and `x = 21` at `y = 3..9` and `y = 15..20`, plus horizontal bars `y = 6` and `y = 18` at `x = 13..18` |

  Row 12 from `x = 3` to `x = 14` stays clear on every level, so the respawn is always safe.

- The best possible run scores `10 × (10 + 20 + 30 + 40 + 50) + 500 = 2000` points without the level selector, far below the DB cap of 10,000,000.
- Fruit sprites:
  - `fruits.png` is copied to `public/games/snake/fruits.png` and loaded by absolute URL;
  - the 22 atlas crops from `sprites.js` (the middle pixel-art row, `y = 136`, `h = 160`) become a typed module-level constant in the engine;
  - each fruit is drawn centered in its cell, fitted to about 23 px while keeping its aspect ratio, with image smoothing off to keep the pixel look;
  - until the image loads (or if it fails to load), the fruit is drawn as a glowing `--magenta` circle, so the game never blocks on the asset.
- Neon restyle with colors from the `app/globals.css` tokens:
  - the snake body is made of `--green` rounded segments with a `shadowBlur` glow, and the head is brighter, with two dark eyes facing the current direction;
  - obstacles are `--magenta` blocks with a glow and an inner highlight;
  - a faint `--line` grid and the dark radial background of `.game-arena`;
  - a crash flashes the head `--magenta` for the blink period.
- The canvas draws no HUD and no overlay text. Score, lives (♥), and level go to the React HUD. Extra HUD stat: `FRUIT` with the value `n/10`, always shown.
- Controls: ← ↑ → ↓ and W A S D turn. P and Escape pause. Auto-pause on a hidden tab and on window blur.
- Registry `input: "keyboard"`. Touch-only viewports get the "KEYBOARD REQUIRED" notice.
- Level selector: the registry entry sets `levels: 5`, and the engine implements `jumpToLevel(level)`. It loads that level's obstacles, sets the snake to that level's start length `4 + 10 × (level − 1)` (coiled on the start cell), resets the level's fruit count to 0, keeps the score and lives, and resumes (same behavior as ARKANOID).
- A `snake` entry in `lib/games/registry.ts`.
- New `cover-snake-arcade` cover art in `app/globals.css`. It is CSS-only, in the in-game style (green snake, magenta walls, a pixel fruit), and distinct from every existing cover, including `cover-snake`.
- Migration `supabase/migrations/0005_snake_game.sql`. It inserts a new `games` row and publishes it:
  - `id: "snake"`
  - `title: "SNAKE"`
  - `tagline: "Eat the fruit, grow longer, and slither through five walled mazes."`
  - `description: "Steer the snake with the arrow keys or WASD and eat the fruit to grow. Each fruit is worth 10 points times the level. Eat 10 fruits to reach the next of five stages: open field, corner blocks, twin bars, the box, and the maze. The snake gets faster on every stage. Hitting a wall, an obstacle, or your own tail costs one of 3 lives. Clearing stage 5 ends the run with a 500-point bonus. Pause the game to jump to any level."`
  - `category: "ARCADE"`
  - `color: "green"`
  - `cover: "cover-snake-arcade"`
  - `sort_order: 12`
  - `is_published: true`
- All copy in English. The Spanish comments in `sprites.js` are not ported.

### Not in scope

- Reusing or publishing the seeded row `serpentina` (SERPENTINE). It stays unpublished, and `cover-snake` stays unchanged.
- Sound effects or music. The assets include none, so the registry entry does not set `sound` and the mute toggle does not show.
- Swipe gestures or on-screen touch controls.
- Wrap-around edges, power-ups, special fruits with different points, poison fruits, and fruit timers.
- The photo and large-pixel rows of `fruits.png`. Only the middle row is used.
- Changes to leaderboard code, views, or RLS. They already support any published game.
- High-DPI canvas rendering.

## Data model

No schema change. One new `games` row (see Scope).

```ts
export function createSnake(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine; // implements the optional jumpToLevel()
```

Module-level constants (immutable):

```ts
const COLS = 32,
  ROWS = 24,
  CELL = 25; // 800 × 600
const FRUITS_PER_LEVEL = 10;
const COMPLETION_BONUS = 500;
const FRUIT_ATLAS: {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}[]; // 22 crops
const LEVELS: { tickMs: number; walls: [number, number][] }[]; // 5 entries, built from the table in Scope
```

Internal state, all inside the closure:

- `snake: { x: number; y: number }[]` (head first) and `dir` / `turnQueue` (at most 2 queued directions);
- `fruit: { x, y, sprite }` and `wallSet: Set<number>` (`y * COLS + x`) for the current level;
- `score`, `lives`, `level` (1-based), `fruitsEaten` (0..10 on the current level);
- `tickAcc` (accumulated ms) and `blinkMs` (respawn freeze);
- `state`, one of `'playing' | 'paused' | 'gameover'`, plus `stateBeforePause`;
- `dt` capped at 50 ms. A tick fires each time `tickAcc >= LEVELS[level - 1].tickMs`.

HUD payload: `{ score, lives, level, extras: [{ label: "FRUIT", value: "n/10" }] }`.

## Implementation plan

1. **Engine skeleton** — add `lib/games/snake/engine.ts` with the closure, the rAF loop, pause/resume/end/restart/destroy, the key and visibility listeners, and the open field of level 1 (snake movement, fruit as a placeholder circle, growth, scoring, crashes, lives). Nothing imports it yet.
2. **Levels** — add `LEVELS` with the five layouts and tick lengths, level advance after 10 fruits, the level 5 completion bonus, the respawn blink, and `jumpToLevel`.
3. **Sprites and neon palette** — copy `fruits.png` to `public/games/snake/`, add `FRUIT_ATLAS`, draw the fruit sprites with the circle fallback, and style the snake, walls, grid, and background.
4. **Register** — add the `snake` entry (800 × 600, `keyboard`, `levels: 5`, aria label, controls `← ↑ → ↓`) to `lib/games/registry.ts`.
5. **Cover art** — add `cover-snake-arcade` to `app/globals.css` (`/frontend-design`).
6. **Migration** — write `0005_snake_game.sql`, apply it with MCP `apply_migration`, verify it with `execute_sql`, and run `get_advisors` (security).
7. **QA** — Playwright MCP (screenshots in `.playwright-screenshots/`). Delete the QA score rows, then run `npm run lint` and `npm run build`.

## Acceptance criteria

- [x] `/games` lists SNAKE with its `cover-snake-arcade` art and the `ARCADE` chip, linking to `/game/snake`.
- [x] `/game/snake` shows the new copy, Global Best `0`, Plays `NEW`, and `NO SCORES YET — BE THE FIRST` before any save.
- [x] `/player/snake` renders an 800 × 600 logical canvas filling the CRT screen, with the scanline overlay on top.
- [x] Arrow keys and WASD turn the snake, and pressing the opposite direction does not reverse it.
- [x] Fruits are drawn with sprites from `/games/snake/fruits.png`, and the network panel shows the image loaded with status 200.
- [x] Eating a fruit grows the snake by 1 and adds exactly `10 × level` points, and the `FRUIT` stat goes up by 1.
- [x] A new fruit never appears on the snake or on an obstacle.
- [x] Hitting the border, an obstacle, or the snake's own body costs 1 life and respawns the snake at the start after the blink, with the same length it had before the crash.
- [x] Eating 10 fruits loads the next level's layout, the level goes up by 1, `FRUIT` resets to `0/10`, the snake keeps its length, and the snake moves faster.
- [x] Each of the 5 levels shows the obstacle layout from the Scope table.
- [x] The React HUD shows the live score, the lives as ♥, the level, and `FRUIT n/10`. The canvas draws no HUD or overlay text.
- [x] PAUSE/RESUME, P, and Escape pause and resume the game, and the button label stays in sync.
- [x] Switching tabs leaves the game paused.
- [x] The pause overlay shows `JUMP TO LEVEL` with buttons 1–5, and the current level is highlighted.
- [x] Clicking a level button loads that level, resumes the game, keeps the score and lives, and sets the snake to length `4 + 10 × (level − 1)`.
- [x] No mute toggle shows on `/player/snake`.
- [x] Losing the last life opens GAME OVER with the real final score.
- [x] Eating the 10th fruit on level 5 adds 500 points and opens GAME OVER with that score.
- [x] Pressing END opens GAME OVER with the real final score.
- [x] Typing initials in the modal (including W, A, S, D) does not control the game.
- [x] SAVE SCORE inserts a `scores` row with `game_id: "snake"`.
- [x] The saved score shows on `/game/snake`, on `/hall-of-fame?game=snake`, and as the SNAKE champion on `/hall-of-fame`.
- [x] PLAY AGAIN starts a fresh run with score 0, 3 lives, level 1, and `FRUIT 0/10`.
- [x] Arrow keys do not scroll the page.
- [x] Leaving the page stops the loop with no console errors.
- [x] A touch-only viewport shows the "KEYBOARD REQUIRED" notice.
- [x] `/player/asteroids`, `/player/tetris`, and `/player/arkanoid` still work.
- [x] The seeded `serpentina` row is still unpublished, and `cover-snake` is unchanged.
- [x] The migration file exists and is applied.
- [x] `get_advisors` (security) reports no new errors.
- [x] QA score rows are deleted.
- [x] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: a new `games` row, appended last and published.** A new game gets a new id. The look-alike seeded row `serpentina` (SERPENTINE) stays hidden.
- **Yes: id `snake`, but cover class `cover-snake-arcade`.** The usual `cover-<id>` name would be `cover-snake`, which the seeded `serpentina` row already uses. Reusing it would change that hidden row's art.
- **Yes: the React shell owns the HUD, pause, and game over.** This is the same split as in spec 05.
- **Yes: a framework-free engine behind the shared contract.** This is the same approach as specs 05, 08, and 09.
- **Yes: levels differ by obstacles and speed, and fruit points scale with the level.** Explicit user decision.
- **No: speed-only levels.** Explicit user decision. Five identical fields would make the levels hard to tell apart.
- **Yes: advance after 10 fruits.** Explicit user decision. Progress is shown as `FRUIT n/10`.
- **No: score-threshold advance.** Explicit user decision. With points that scale per level, fruit counts are easier to read.
- **Yes: walls kill, and 3 lives.** Explicit user decision. It matches the HUD's lives display in the other games.
- **No: wrap-around edges, or a single life.** Explicit user decision.
- **Yes: arrows + WASD, registry `input: "keyboard"`.** Explicit user decision. Touch-only devices get the existing notice.
- **No: swipe controls.** Explicit user decision. They would need `input: "pointer"` and gesture code.
- **Yes (default): no sound.** The assets include no audio, so `sound` is not set and the mute toggle stays hidden.
- **Yes (default): the level selector (`levels: 5`, `jumpToLevel`).** It reuses the spec 09 shell feature at no cost, and it makes QA of each layout quick.
- **Yes: the snake keeps its length after losing a life.** Explicit user decision (amended during implementation). Growth is only lost at GAME OVER.
- **Yes (default): a long snake respawns coiled on the start cell.** A straight body to the left of `(8, 12)` only fits 9 cells; stacked segments always fit and unroll along the head's path.
- **Yes: the snake keeps its length on level change.** Explicit user decision (amended during implementation). Each level adds 10 segments, so later levels are harder with a longer snake as well as a faster tick.
- **Yes (default): a level jump sets the length to `4 + 10 × (level − 1)`.** That is the length a normal run has at the start of that level, so the selector cannot skip the difficulty.
- **Yes (default): a level change also respawns the snake coiled on the start cell.** A 44-segment snake cannot be laid out straight.
- **No: reset to length 4 on level change.** Replaced by the user decision above.
- **No: reset to length 4 after a crash.** Replaced by the user decision above.
- **Yes (default): the fruit count is kept after a crash.** A crash already costs a life, and losing the level's progress as well would be harsh.
- **Yes (default): a 500-point completion bonus on level 5.** It rewards finishing over dying on the last level, and clearing level 5 ends the run as in ARKANOID.
- **Yes (default): the middle pixel-art row of `fruits.png`.** It is the row mapped in `sprites.js`, and the pixel style fits the arcade look better than the photo row.
- **Yes (default): a 2-turn input buffer.** Without it, two quick presses within one tick lose the first turn, which feels unresponsive at 75 ms ticks.
- **Yes (default): a 32 × 24 grid of 25 px cells.** It gives an 800 × 600 canvas, the same 4:3 size as ASTEROIDS and ARKANOID.

## Identified risks

| Risk                                                                   | Mitigation                                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| The sprite sheet fails to load or loads late                           | Fruits fall back to a glowing circle until `img.complete && img.naturalWidth > 0`. The game never waits on the image. |
| Jumping to a level resets its fruit count, so a player can farm points | Same trade-off accepted in spec 09. Every point still takes a fruit, and the DB caps scores at 10,000,000.            |
| A late-level snake fills most free cells, so no fruit cell is left     | Fruit placement picks from a list of free cells. If the list is empty, the level counts as cleared.                   |
| Several ticks in one frame after a lag skip collision checks           | `dt` is capped at 50 ms, and each tick runs its own move and collision check in a loop.                               |
| Obstacles block the respawn path                                       | Row 12 from `x = 3` to `x = 14` stays clear on every level (checked in the Scope table).                              |
| QA leaves test scores in the production table                          | The QA step deletes its own rows with `execute_sql`.                                                                  |

## What is **not** in this spec

- Publishing or changing SERPENTINE (`serpentina`) or `cover-snake`.
- Sound, music, swipe, or on-screen controls.
- Wrap-around edges, power-ups, special or timed fruits.
- The other rows of `fruits.png`.
- Leaderboard, view, or RLS changes.
- High-DPI rendering.

Each one of those, if it lands, goes in its own spec.
