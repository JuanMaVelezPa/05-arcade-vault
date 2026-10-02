# JAM — PONG Game

**State:** Approved
**Depends on:** 05-asteroids-game, 06-games-and-scores-tables, 07-published-games-only, 09-arkanoid-game, 11-snake-game
**Date:** 2026-10-02

**Objective:** Build a single-player PONG against a CPU paddle as a TypeScript canvas engine that runs inside the `GamePlayer` shell at `/player/pong` and is published as a new `games` row, so its scores go to the existing leaderboards.

## Why this spec exists

There is no reference game in `references/started-games/` (it holds only Asteroids, Tetris, and Arkanoid). Classic Pong has no lives, levels, or score cap that fits the arcade's per-game leaderboard, so this spec adapts it: the CPU's goals are the player's lives, and five CPU opponents are the levels. Every rule is written down here so the engine does not improvise.

## Scope

### In scope

- A new engine at `lib/games/pong/engine.ts` that follows the shared engine contract (`lib/games/types.ts`):
  - a fixed 800 × 600 logical field that fills the 4:3 `.crt-screen` with no letterbox;
  - the player's paddle is on the left (`x = 24`) and the CPU's paddle on the right (`x = 764`). Both are 12 × 90 px, and their y is clamped to `0..510`;
  - the ball is a 14 × 14 square. It bounces off the top and bottom edges (`vy` flips, and the ball is pushed back inside);
  - **paddle bounce:** when the ball overlaps a paddle while moving toward it, it is placed against the paddle face and leaves with `offset = clamp((ballCenterY − paddleCenterY) / 52, −1, 1)` and `angle = offset × 55°`. The new velocity is `vx = ±speed·cos(angle)` (away from the paddle) and `vy = speed·sin(angle)`. A hit on the middle goes straight, and a hit on the edge goes out at 55°;
  - **rally speed:** each paddle hit (player or CPU) multiplies `speed` by 1.04, capped at `1.6 × levelBaseSpeed`;
  - **no tunneling:** each frame is split into `n = ceil(maxStepPx / 6)` sub-steps, so the ball never moves more than 6 px between collision checks. Max ball speed is 832 px/s, so a 50 ms frame is 41.6 px and 7 sub-steps;
  - **goals:** the ball fully past the right edge (`x > 800`) is a player goal. Past the left edge (`x + w < 0`) is a CPU goal;
  - **serve:** after each goal the ball sits at the center (`(393, 293)`) for a 1000 ms freeze (it blinks, and nothing moves, but both paddles can still be positioned). It then launches at a random angle in `±25°` with `speed = levelBaseSpeed`. The first serve of a level goes toward the CPU. After a player goal, the next serve goes toward the CPU. After a CPU goal, it goes toward the player;
  - **lives and goals:** the player has 3 lives. A CPU goal costs 1 life. Losing the last life ends the run;
  - **level clear:** scoring 5 goals on a level clears it. The next level starts with a fresh serve (goal count 0, lives kept). Clearing level 5 ends the run;
  - **scoring** (the score is always a non-negative integer):
    - `+5` for each ball return by the player's paddle;
    - `+100 × level` for each player goal;
    - `+250 × livesLeft` when a level is cleared;
  - the best possible run is `5 × 100 × (1 + 2 + 3 + 4 + 5) + 5 × 250 × 3 = 7500 + 3750 = 11,250` goal and clear points, plus 5 per return. A rally lasts about 1 s per return, so reaching the 10,000,000 DB cap would take months of play. Even so, `onHud` and `onGameOver` clamp the score to `10_000_000`.
- Five levels, each against a stronger CPU:

  | Level | Ball base speed | CPU paddle speed | CPU aim error (max, px) | CPU reaction delay |
  | ----- | --------------- | ---------------- | ----------------------- | ------------------ |
  | 1     | 360 px/s        | 260 px/s         | ±80                     | 250 ms             |
  | 2     | 400 px/s        | 300 px/s         | ±62                     | 200 ms             |
  | 3     | 440 px/s        | 340 px/s         | ±45                     | 150 ms             |
  | 4     | 480 px/s        | 380 px/s         | ±30                     | 100 ms             |
  | 5     | 520 px/s        | 420 px/s         | ±15                     | 60 ms              |

- CPU rules:
  - while the ball moves toward the CPU and its x is past the field center (`x > 400`), the CPU's target is `ball.y + aimError`. `aimError` is re-rolled uniformly in `±maxError` each time the player returns the ball, and the CPU only updates its target every `reaction delay` ms;
  - while the ball moves away, or before it crosses the center, the target is the field center (`y = 255` for the paddle top, at half speed);
  - the CPU moves toward its target at its paddle speed, with a 6 px dead zone, and never faster;
  - the CPU never reads the player's input and never cheats on speed. Because ball `vy` reaches up to `832 × sin 55° ≈ 680 px/s` after long rallies and the CPU paddle tops out at 420 px/s, steep angled returns can beat it on every level.
- Neon restyle with a token from `app/globals.css` for each element:
  - the player's paddle is `--cyan` with a `shadowBlur` glow, and the CPU's paddle is `--magenta` with a glow;
  - the ball is an `--ink` core with a `--yellow` glow, and a short fading trail of 6 previous positions in `--yellow`;
  - a dashed center line in `--line`, and thin `--line-2` top and bottom borders;
  - the dark radial background of `.game-arena`;
  - a paddle hit flashes that paddle white for 80 ms, and a goal flashes the scored-on edge in the scorer's color for 200 ms;
  - the ball blinks (alternating `--ink` and `--ink-dim`, every 125 ms) during the serve freeze.
- The canvas draws no HUD and no overlay text, not even the Pong scoreboard digits. Score, lives (♥), and level go to the React HUD. Extra HUD stat: `GOALS` with the value `n/5`, always shown.
- Controls:
  - ↑ and ↓ or W and S move the paddle at 480 px/s;
  - the pointer moves the paddle: the paddle's center follows the pointer's y (mouse move or touch drag), mapped from the canvas rect to 600 logical px;
  - the last input used wins, so the keyboard and the pointer never fight. The pointer is ignored while paused or after game over;
  - P and Escape pause.
- Auto-pause on a hidden tab and on window blur.
- Registry `input: "pointer"`, so touch-only viewports get the playable canvas, not the "KEYBOARD REQUIRED" notice. The existing `touch-action: none` on pointer canvases (spec 09) keeps a touch drag from scrolling the page. The engine calls `preventDefault` on the arrow keys so the page does not scroll.
- Level selector: the registry entry sets `levels: 5`, and the engine implements `jumpToLevel(level)`. It loads that level's speeds, resets the level's goal count to 0, keeps the score and lives, runs a fresh serve toward the CPU, and resumes (same behavior as ARKANOID and SNAKE).
- No sound: the registry entry does not set `sound`, and the mute toggle does not show.
- A `pong` entry in `lib/games/registry.ts`.
- New `cover-pong` cover art in `app/globals.css`. It is CSS-only, in the in-game style (cyan and magenta paddles, a dashed center line, a glowing yellow ball with a trail), and distinct from every existing cover (`cover-asteroids`, `cover-tetris`, `cover-arkanoid`, `cover-snake-arcade`, and the legacy `cover-duelo`).
- Migration `supabase/migrations/0007_pong_game.sql`. It inserts a new `games` row and publishes it:
  - `id: "pong"`
  - `title: "PONG"`
  - `tagline: "Out-rally the CPU through five opponents, one angled return at a time."`
  - `description: "Slide your paddle with the mouse, a finger, or the arrow keys and return the ball past the CPU. Hit it near the paddle's edge to send it out at a sharper angle, but every return makes the ball faster. Score 5 goals to beat each of five opponents, and each one is quicker and more accurate than the last. Every goal the CPU scores costs one of your 3 lives. Clearing opponent 5 ends the run. Pause the game to jump to any level."`
  - `category: "VERSUS"`
  - `color: "yellow"`
  - `cover: "cover-pong"`
  - `sort_order: 13`
  - `is_published: true`
- All copy in English.

### Not in scope

- Two-player (local or online) mode. The category `VERSUS` only describes the CPU duel.
- Sound effects or music. The repo has no Pong audio, so the mute toggle stays hidden.
- Power-ups, multi-ball, paddle spin from paddle velocity, curved balls, and obstacles.
- Difficulty select, a "first to N" match mode, and the classic on-canvas scoreboard digits.
- Swipe-only or on-screen touch buttons beyond the pointer drag.
- Seeded look-alike rows: the live `games` table has only the 4 published games (`asteroids`, `tetris`, `arkanoid`, `snake`), and migration `0006` removed the unpublished seeds. `cover-duelo` stays unchanged.
- Changes to leaderboard code, views, or RLS. They already support any published game.
- High-DPI canvas rendering.

## Data model

No schema change. One new `games` row (see Scope).

```ts
export function createPong(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine; // implements the optional jumpToLevel()
```

Module-level constants (immutable):

```ts
const W = 800,
  H = 600;
const PADDLE_W = 12,
  PADDLE_H = 90,
  PLAYER_X = 24,
  CPU_X = 764;
const BALL = 14;
const START_LIVES = 3,
  GOALS_PER_LEVEL = 5;
const SERVE_FREEZE_MS = 1000;
const RALLY_GAIN = 1.04,
  SPEED_CAP = 1.6,
  MAX_ANGLE_DEG = 55;
const KEY_SPEED = 480,
  MAX_STEP_PX = 6;
const RETURN_POINTS = 5,
  GOAL_POINTS = 100, // × level
  CLEAR_BONUS = 250; // × lives left
const LEVELS: {
  ballSpeed: number;
  cpuSpeed: number;
  aimError: number;
  reactionMs: number;
}[]; // 5 entries, built from the table in Scope
```

Internal state, all inside the closure:

- `player: { y }`, `cpu: { y, targetY, aimError, reactionAcc }`, and `ball: { x, y, vx, vy, speed }`, plus a `trail` of the last 6 ball positions;
- `score`, `lives`, `level` (1-based), `goals` (0..5 on the current level);
- `serveMs` (serve freeze countdown) and `serveDir` (`1` toward the CPU, `-1` toward the player);
- `keys: { up, down }` and `lastInput: "keys" | "pointer"`, plus `pointerY`;
- `flash` timers for paddles and goal edges;
- `state`, one of `'playing' | 'paused' | 'gameover'`, plus `stateBeforePause`;
- `dt` capped at 50 ms.

HUD payload: `{ score, lives, level, extras: [{ label: "GOALS", value: "n/5" }] }`.

## Implementation plan

1. **Engine skeleton** — add `lib/games/pong/engine.ts` with the closure, the rAF loop (`dt` capped at 50 ms), pause/resume/end/restart/destroy, the key, pointer, and visibility listeners, the player paddle, and the ball with wall bounce, sub-stepping, paddle bounce, serve freeze, goals, and lives. The CPU paddle follows the ball with level 1 numbers. Nothing imports it yet.
2. **Levels and CPU** — add `LEVELS`, the CPU target, reaction, and aim-error rules, the goal count, level advance, the scoring formula, the clear bonus, the completion end, and `jumpToLevel`.
3. **Neon palette** — draw paddles, ball, trail, center line, borders, hit and goal flashes, and the serve blink with the tokens from Scope.
4. **Register** — add the `pong` entry (800 × 600, `pointer`, `levels: 5`, aria label, controls `↑ ↓`) to `lib/games/registry.ts`. The `ControlKey` union already has `↑` and `↓`.
5. **Cover art** — add `cover-pong` to `app/globals.css` (`/frontend-design`).
6. **Migration** — write `0007_pong_game.sql`, apply it with MCP `apply_migration`, verify it with `execute_sql`, and run `get_advisors` (security).
7. **Update the catalog doc** — add PONG to `references/implemented-games.md`.
8. **QA** — Playwright MCP (screenshots in `.playwright-screenshots/`). Delete the QA score rows with `execute_sql`, then run `npm run lint` and `npm run build`.

## Acceptance criteria

- [ ] `/games` lists PONG with its `cover-pong` art and the `VERSUS` chip, linking to `/game/pong`.
- [ ] `/game/pong` shows the new copy, Global Best `0`, Plays `NEW`, and `NO SCORES YET — BE THE FIRST` before any save.
- [ ] `/player/pong` renders an 800 × 600 logical canvas filling the CRT screen, with the scanline overlay on top.
- [ ] ↑ ↓ and W S move the player's paddle at 480 px/s, the mouse moves it, and a touch drag moves it. The paddle stays inside `0..510`.
- [ ] The ball bounces off the top and bottom edges.
- [ ] A hit at the paddle's center sends the ball straight back, and a hit at the edge sends it out at about 55°.
- [ ] Each paddle hit makes the ball 4% faster, up to 1.6 × the level's base speed, and the ball never passes through a paddle.
- [ ] A ball past the right edge is a player goal: `GOALS` goes up by 1 and the score goes up by `100 × level`. A ball past the left edge costs one life.
- [ ] Each player return adds exactly 5 points, and a CPU return adds none.
- [ ] After every goal, the ball waits 1000 ms at the center, then serves. It serves toward the player after a CPU goal and toward the CPU after a player goal.
- [ ] Scoring 5 goals loads the next level: the level goes up by 1, `GOALS` resets to `0/5`, lives are kept, `250 × livesLeft` is added, and the ball and the CPU are faster, as in the level table.
- [ ] The CPU paddle never moves faster than the level's speed, and it loses rallies on steep angled returns.
- [ ] The React HUD shows the live score, the lives as ♥, the level, and `GOALS n/5`. The canvas draws no HUD or overlay text.
- [ ] PAUSE/RESUME, P, and Escape pause and resume the game, and the button label stays in sync. The ball does not move and the pointer does not move the paddle while paused.
- [ ] Switching tabs or blurring the window leaves the game paused.
- [ ] The pause overlay shows `JUMP TO LEVEL` with buttons 1–5, and the current level is highlighted.
- [ ] Clicking a level button loads that level, resumes the game, keeps the score and lives, and resets `GOALS` to `0/5`.
- [ ] No mute toggle shows on `/player/pong`.
- [ ] Losing the last life opens GAME OVER with the real final score.
- [ ] Scoring the 5th goal on level 5 adds the goal and clear points and opens GAME OVER with that score.
- [ ] Pressing END opens GAME OVER with the real final score.
- [ ] Typing initials in the modal (including W and S) does not control the game.
- [ ] SAVE SCORE inserts a `scores` row with `game_id: "pong"`.
- [ ] The saved score shows on `/game/pong`, on `/hall-of-fame?game=pong`, and as the PONG champion on `/hall-of-fame`.
- [ ] PLAY AGAIN starts a fresh run with score 0, 3 lives, level 1, and `GOALS 0/5`.
- [ ] Arrow keys do not scroll the page, and a touch drag on the canvas does not scroll it.
- [ ] Leaving the page stops the loop with no console errors.
- [ ] A touch-only viewport shows the canvas (no "KEYBOARD REQUIRED" notice).
- [ ] `/player/asteroids`, `/player/tetris`, `/player/arkanoid`, and `/player/snake` still work.
- [ ] The migration file `0007_pong_game.sql` exists and is applied.
- [ ] `get_advisors` (security) reports no new errors.
- [ ] QA score rows are deleted.
- [ ] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: a new `games` row, appended last and published.** `sort_order` is 13, after SNAKE (12). The id `pong` is free.
- **Yes: the React shell owns the HUD, pause, and game over.** This is the same split as in spec 05.
- **Yes: a framework-free engine behind the shared contract.** This is the same approach as specs 05, 08, 09, and 11.
- **Yes (default): single-player against a CPU.** A leaderboard game needs a solo score, and the arcade has no multiplayer layer.
- **Yes (default): the CPU's goals are the player's lives, and five CPU opponents are the levels.** It maps Pong onto the HUD's score, lives, and level, with no new shell code.
- **No: first-to-N match with a win or loss and no lives.** The score would not grow with skill, and the leaderboard needs a number.
- **Yes (default): scoring is returns × 5, goals × `100 × level`, and a clear bonus of `250 × livesLeft`.** Returns reward rallies, goals reward winning, and the bonus rewards a clean level.
- **Yes (default): paddle-offset bounce angle up to 55°, and no spin from paddle speed.** The player has one skill to learn, and the rule is simple to test.
- **Yes (default): a beatable, imperfect CPU (reaction delay, aim error, speed cap).** A perfect tracker would make the game unwinnable, and this keeps the difficulty in the level table.
- **Yes (default): sub-stepped ball movement of at most 6 px.** Without it, the ball tunnels through a 12 px paddle at 832 px/s on a lagging frame.
- **Yes (default): `input: "pointer"` with keyboard (↑ ↓, W S) too.** Pointer events cover the mouse and touch drag, as in ARKANOID, so phones can play. Last-used input wins.
- **Yes (default): the level selector (`levels: 5`, `jumpToLevel`).** It reuses the spec 09 shell feature, and it makes QA of each CPU quick.
- **Yes (default): no sound, so `sound` is not set.** The repo has no Pong audio, and the mute toggle stays hidden.
- **Yes (default): category `VERSUS` and color `yellow`.** `VERSUS` is an allowed value of the DB check and describes a duel. Yellow is the ball's glow and is shared only with TETRIS, and no game uses `VERSUS` yet.
- **Yes (default): a 1000 ms serve freeze after each goal.** It gives the player time to read the HUD and position the paddle.
- **Yes (default): the 5th goal on level 5 ends the run with `onGameOver`.** The contract treats completion as the end of a run, as in ARKANOID and SNAKE.
- **No: drawing the score digits on the canvas.** The canvas draws no HUD, and the shell already shows the score.

## Identified risks

| Risk                                                                   | Mitigation                                                                                                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A fast ball tunnels through a paddle on a long frame                   | `dt` is capped at 50 ms and the move is split into sub-steps of at most 6 px.                                                                        |
| An endless rally (a CPU that never misses) stalls the run              | The CPU speed is below the ball's max `vy`, and the aim error is re-rolled on each return, so steep returns beat it. Score is clamped to 10,000,000. |
| Keyboard and pointer inputs fight over the paddle                      | The last input used wins, and the pointer is ignored while paused or after game over.                                                                |
| Jumping to a level resets its goals, so a player can farm points       | Same trade-off accepted in specs 09 and 11. Every point still takes a return or a goal, and the DB caps scores at 10,000,000.                        |
| `touch-action: none` on the canvas blocks page scroll on phones        | It applies only to pointer-input canvases, and only over the canvas. The page scrolls from the HUD and margins.                                      |
| A near-horizontal serve or bounce makes the ball crawl up and down     | Serve angles are limited to `±25°`, and bounce angles are limited to `±55°`, so `vx` is always at least `0.57 × speed`.                              |
| QA leaves test scores in the production table                          | The QA step deletes its own rows with `execute_sql`.                                                                                                 |
| The `VERSUS` chip or `yellow` color is not styled in the games browser | QA checks `/games` for the chip and the card color. The DB check allows both values, and the fix would be a CSS-only change.                         |

## What is **not** in this spec

- Two-player or online play.
- Sound, music, power-ups, multi-ball, spin, and curved balls.
- Difficulty select, a match mode, and on-canvas scoreboard digits.
- On-screen touch buttons.
- Leaderboard, view, or RLS changes.
- High-DPI rendering.

Each one of those, if it lands, goes in its own spec.
