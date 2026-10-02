# JAM — PONG Game

**State:** Draft
**Depends on:** 05-asteroids-game, 06-games-and-scores-tables, 07-published-games-only, 09-arkanoid-game, 11-snake-game
**Date:** 2026-10-02

**Objective:** Build a five-level, single-player PONG against a CPU paddle as a TypeScript canvas engine that runs inside the `GamePlayer` shell at `/player/pong`, scores rallies and points, and is published as a new `VERSUS` `games` row so its scores go to the existing leaderboards.

## Why this spec exists

There is no reference game in `references/started-games/` (only asteroids, tetris, and arkanoid exist there), so, as in spec 11, the gameplay is written rule by rule. Classic Pong has no score to save, only a match result. To fit the leaderboards, this spec adds a run structure: 5 CPU opponents of rising skill, 3 lives shared across the run, and a score that rewards long rallies. The catalog has no `VERSUS` game yet, although the `VERSUS` category chip already exists in `lib/data.ts`. The prototype `duelo-pixel` row was deleted in migration `0006`, so no look-alike row is left to avoid, but its `cover-duelo` CSS class still exists and stays unchanged.

## Scope

### In scope

- A new engine at `lib/games/pong/engine.ts` that follows the shared engine contract (`lib/games/types.ts`):
  - a field of 800 × 600 logical px, 4:3, filling the `.crt-screen` with no letterbox;
  - the player's paddle is on the left (`x = 24`, size 14 × 90). The CPU paddle is on the right (`x = 762`, size 14 × 90). The ball is a 14 × 14 square;
  - the top and bottom edges (`y = 0` and `y = 600`) bounce the ball (`vy` flips). The left and right edges are goals;
  - paddle bounce: the ball's outgoing angle depends on where it hits the paddle. `offset = clamp((ballCenterY − paddleCenterY) / 45, −1, 1)`, `angle = offset × 55°` from the horizontal, and the ball leaves toward the opposite side of the paddle at speed `s` (`vx = ±s·cos(angle)`, `vy = s·sin(angle)`);
  - each paddle hit multiplies the ball's speed by 1.04, capped at the level's max speed;
  - the paddle never leaves the field (`y` is clamped to `0..510`);
  - sub-stepping: each frame the ball moves in steps of at most 6 px, with the wall and paddle checks run on every step, so a capped `dt` of 50 ms at 800 px/s (40 px) cannot tunnel through a paddle;
  - **serve:** after a goal (and at the start of each level), the ball sits at the field center `(393, 293)` for 800 ms (it blinks, no movement), then launches toward the side that just conceded the point (toward the CPU at the start of a level and of a run). Launch angle is random in `−25°..+25°` from the horizontal, at the level's serve speed;
  - **goals:** the ball's right edge past `x = 800` is a point for the player. The ball's left edge past `x = 0` is a point for the CPU;
  - a level is a match to **5 points**. The player reaching 5 wins the level. The CPU scoring a point costs the player **one life**; the CPU's own points are not counted toward a match limit, so the only way to lose is to run out of lives;
  - 3 lives for the whole run (not per level). Losing the third life ends the run;
  - winning level 5 ends the run with a completion bonus.
- The CPU opponent, written rule by rule so the engine does not improvise:
  - it only moves while the ball travels toward it (`vx > 0`). Otherwise it drifts to the field center `y = 300` at its speed;
  - when the ball turns toward the CPU, the engine rolls `aimError` once for that rally leg, uniform in `±errorPx` of the level. The CPU's target is `ballCenterY + aimError` (the ball's current y, not a trajectory prediction, so wall bounces fool it);
  - the paddle center moves toward the target at up to `cpuSpeed` px/s, with a 100 ms reaction delay (it ignores the ball for 100 ms after it turns toward the CPU);
  - **rally cap:** on the player's 30th return in one rally, the CPU freezes for the rest of that rally. The ball then reaches the right goal, so the rally always ends and the score has a hard maximum.
- Five levels (speeds in px/s):

  | Level | Serve speed | Max ball speed | CPU speed | CPU `errorPx` | Return base | Point value |
  | ----- | ----------- | -------------- | --------- | ------------- | ----------- | ----------- |
  | 1     | 320         | 560            | 200       | ±40           | 1           | 100         |
  | 2     | 360         | 620            | 250       | ±34           | 2           | 200         |
  | 3     | 400         | 680            | 300       | ±28           | 3           | 300         |
  | 4     | 440         | 740            | 350       | ±22           | 4           | 400         |
  | 5     | 480         | 800            | 400       | ±16           | 5           | 500         |

  The player's paddle moves at 420 px/s, faster than every CPU. A steep return (angle 55° at 800 px/s gives `vy ≈ 655` px/s) outruns even the level 5 CPU (400 px/s), so every level can be won.

- Scoring (all integers):
  - **return:** each time the player's paddle hits the ball, add `level × min(k, 10)`, where `k` is the count of the player's returns in the current rally (1, 2, 3, …). `k` resets to 0 at every serve;
  - **point:** when the CPU misses (goal on the right), add `100 × level`;
  - **level won** (5th point of the match): add `250 × level`. The next level loads: the match score resets to 0–0, lives are kept, and the ball is served after the 800 ms pause;
  - **completion bonus:** winning level 5 adds `1000` more and ends the run;
  - the CPU's returns score nothing.
- Best possible run, with every rally at the 30-return cap: one point is `100·l + l·(55 + 200) = 355·l`. A level is `5 × 355·l + 250·l = 2025·l`, and levels 1–5 sum to `2025 × 15 = 30,375`. The 1000 bonus makes `31,375`. Up to 2 lost points (3 lives, the third ends the run) add at most `2 × 255 × 5 = 2,550` in returns. The ceiling is under 34,000, far below the DB cap of 10,000,000.
- Neon restyle with colors from the `app/globals.css` tokens:
  - the player's paddle is a `--cyan` bar with a `shadowBlur` glow, and the CPU's paddle is a `--magenta` bar with the same glow;
  - the ball is a `--yellow` square with a short fading trail (the last 5 positions, alpha 0.5 down to 0.1);
  - the center net is a vertical dashed line of `--ink-faint`, 4 px wide, 16 px dashes and 16 px gaps;
  - a faint `--line` border frame and the dark radial background of `.game-arena`;
  - a paddle hit flashes that paddle `--ink` for 90 ms; a goal flashes the scoring side's edge (a 6 px strip) in the scorer's color for 300 ms;
  - during the serve pause the ball blinks (toggles every 100 ms).
- The canvas draws no HUD and no overlay text, so no score digits are drawn in the field. Score, lives (♥), and level go to the React HUD, with two extra stats: `MATCH` (`p-c`, player points in this level against CPU points in this level, e.g. `3-1`) and `RALLY` (the player's return count `k`, `0` while serving).
- Controls: ↑ ↓ and W S move the player's paddle at 420 px/s. The pointer also moves it (mouse move or touch drag): the paddle center follows the pointer's y, clamped to the field and not faster than 900 px/s, so a teleporting mouse cannot jump the paddle through the ball. P and Escape pause. The pointer is ignored while paused or after game over. Auto-pause on a hidden tab and on window blur.
- Registry `input: "pointer"` (as ARKANOID), so touch-only viewports get a playable canvas with `touch-action: none` and no "KEYBOARD REQUIRED" notice. `sound` is not set.
- Level selector: the registry entry sets `levels: 5`, and the engine implements `jumpToLevel(level)`. It loads that level, resets the match score to 0–0, keeps score and lives, serves after the 800 ms pause, and resumes (same behavior as ARKANOID and SNAKE).
- A `pong` entry in `lib/games/registry.ts` (800 × 600, `pointer`, `levels: 5`, aria label, controls `↑ ↓`).
- New `cover-pong` cover art in `app/globals.css`. It is CSS-only, in the in-game style (cyan paddle on the left, magenta paddle lower on the right, a yellow ball with a diagonal trail, a dashed net), and distinct from every existing cover, including the unused `cover-duelo`, which stays unchanged.
- Migration `supabase/migrations/0007_pong_game.sql`. It inserts a new `games` row and publishes it:
  - `id: "pong"`
  - `title: "PONG"`
  - `tagline: "Out-rally the CPU through five levels of faster paddles and a faster ball."`
  - `description: "Move your paddle with the mouse, a finger, the arrow keys, or W and S, and return the ball past the CPU. Hit the ball near the edge of your paddle for a sharper angle. Every return is worth more the longer the rally lasts, each goal is worth 100 points times the level, and the first to 5 points wins the level. The CPU gets quicker and more accurate on every one of five levels. You have 3 lives for the whole run, and each CPU goal costs one. Win level 5 for a 1000-point bonus. Pause the game to jump to any level."`
  - `category: "VERSUS"`
  - `color: "cyan"`
  - `cover: "cover-pong"`
  - `sort_order: 13`
  - `is_published: true`
- All copy in English.

### Not in scope

- Two-player mode (local or online) and any multi-CPU setting.
- Sound effects or music. There are no assets, so the registry entry does not set `sound` and the mute toggle does not show.
- Power-ups, spin, paddle size changes, obstacles, and multiple balls.
- A "best of" match that ends when the CPU reaches a point count. The CPU's points cost lives only.
- Free-text difficulty options or a difficulty selector beyond the 5-level jump.
- Changes to `lib/data.ts` categories, leaderboard code, views, or RLS. `VERSUS` already exists and the leaderboards already support any published game.
- Editing or deleting `cover-duelo` or any other existing cover.
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
const PADDLE_W = 14,
  PADDLE_H = 90,
  BALL = 14;
const PLAYER_X = 24,
  CPU_X = 762;
const PLAYER_SPEED = 420,
  POINTER_MAX_SPEED = 900; // px/s
const SERVE_PAUSE_MS = 800,
  CPU_REACTION_MS = 100;
const SPEEDUP = 1.04,
  MAX_ANGLE_DEG = 55,
  RALLY_CAP = 30,
  POINTS_TO_WIN = 5,
  START_LIVES = 3;
const STEP_PX = 6; // max ball travel per sub-step
const LEVELS: {
  serve: number;
  maxBall: number;
  cpuSpeed: number;
  errorPx: number;
}[]; // 5 entries, built from the table in Scope
```

Internal state, all inside the closure:

- `player: { y: number }`, `cpu: { y: number; frozen: boolean; reactMs: number; aimError: number }`, and `ball: { x, y, vx, vy, trail: {x,y}[] }`;
- `score`, `lives`, `level` (1-based), `playerPts`, `cpuPts` (match points of the current level), `rally` (the player's return count `k`);
- `serveMs` (serve pause countdown) and `serveDir` (`1` toward the CPU, `-1` toward the player);
- `flash: { player, cpu, goalLeft, goalRight }` timers in ms;
- `keys: { up, down }` and `pointerY: number | null`;
- `state`, one of `'playing' | 'paused' | 'gameover'`, plus `stateBeforePause`;
- `dt` capped at 50 ms.

HUD payload: `{ score, lives, level, extras: [{ label: "MATCH", value: "p-c" }, { label: "RALLY", value: "k" }] }`. `onHud` fires only when a value changes.

## Implementation plan

1. **Engine skeleton** — add `lib/games/pong/engine.ts` with the closure, the rAF loop, pause/resume/end/restart/destroy, the key, pointer, and visibility listeners, the paddle, the ball with sub-stepping and wall bounces, the serve pause, and goals. Nothing imports it yet.
2. **Rules and levels** — add paddle-angle bounce and speed-up, the CPU opponent (reaction delay, aim error, rally cap), the scoring formulas, lives, the 5-point match, `LEVELS`, level advance, the level 5 completion bonus, and `jumpToLevel`.
3. **Neon palette** — draw paddles, ball and trail, net, frame, hit and goal flashes, serve blink, and the `.game-arena` background. Check that no text is drawn on the canvas.
4. **Register** — add the `pong` entry (800 × 600, `pointer`, `levels: 5`, aria label, controls `↑ ↓`) to `lib/games/registry.ts`.
5. **Cover art** — add `cover-pong` to `app/globals.css` (`/frontend-design`).
6. **Migration** — write `0007_pong_game.sql`, apply it with MCP `apply_migration`, verify it with `execute_sql`, and run `get_advisors` (security).
7. **QA** — Playwright MCP (screenshots in `.playwright-screenshots/`): play each level via `JUMP TO LEVEL`, force each GAME OVER path, and save a score. Delete the QA score rows, then run `npm run lint` and `npm run build`.

## Acceptance criteria

- [ ] `/games` lists PONG with its `cover-pong` art and the `VERSUS` chip, linking to `/game/pong`, and the `VERSUS` filter shows only PONG.
- [ ] `/game/pong` shows the new copy, Global Best `0`, Plays `NEW`, and `NO SCORES YET — BE THE FIRST` before any save.
- [ ] `/player/pong` renders an 800 × 600 logical canvas filling the CRT screen, with the scanline overlay on top.
- [ ] ↑ ↓ and W S move the player's paddle at 420 px/s, and the mouse moves it too. The paddle stays inside the field (`y` in `0..510`).
- [ ] The ball bounces off the top and bottom edges, and off both paddles with an angle set by the hit offset (a center hit returns it flat, an edge hit at about 55°).
- [ ] The ball speed rises 4% on each paddle hit and never exceeds the level's max speed.
- [ ] The ball does not pass through a paddle at the highest speed (800 px/s on level 5) or after a 50 ms frame.
- [ ] After a goal and at the start of each level, the ball waits 800 ms at the center, blinking, and then launches toward the side that conceded.
- [ ] The CPU paddle does not move toward the ball while the ball travels away, and it misses steep returns on every level.
- [ ] Each player return adds exactly `level × min(k, 10)` points, and the `RALLY` stat goes up by 1 and resets to `0` at the next serve.
- [ ] A CPU miss adds exactly `100 × level` points and raises the player's `MATCH` count by 1.
- [ ] A CPU goal costs 1 life and raises the CPU's `MATCH` count by 1. The CPU's `MATCH` count never ends a level.
- [ ] On the player's 30th return in one rally, the CPU freezes and the rally ends in a player goal.
- [ ] Reaching 5 points loads the next level: the level goes up by 1, `MATCH` resets to `0-0`, lives are kept, and `250 × level` points (using the level just won) are added.
- [ ] Each of the 5 levels uses the speeds, CPU speed, and aim error from the Scope table.
- [ ] The React HUD shows the live score, the lives as ♥, the level, `MATCH p-c`, and `RALLY k`. The canvas draws no HUD or overlay text.
- [ ] PAUSE/RESUME, P, and Escape pause and resume the game, and the button label stays in sync. The pointer does not move the paddle while paused.
- [ ] Switching tabs leaves the game paused, and so does window blur.
- [ ] The pause overlay shows `JUMP TO LEVEL` with buttons 1–5, and the current level is highlighted.
- [ ] Clicking a level button loads that level, resets `MATCH` to `0-0`, keeps the score and lives, serves after the pause, and resumes the game.
- [ ] No mute toggle shows on `/player/pong`.
- [ ] Losing the third life opens GAME OVER with the real final score.
- [ ] Winning level 5 adds `250 × 5` plus 1000 points and opens GAME OVER with that score.
- [ ] Pressing END opens GAME OVER with the real final score.
- [ ] Typing initials in the modal (including W and S) does not control the game.
- [ ] SAVE SCORE inserts a `scores` row with `game_id: "pong"`.
- [ ] The saved score shows on `/game/pong`, on `/hall-of-fame?game=pong`, and as the PONG champion on `/hall-of-fame`.
- [ ] PLAY AGAIN starts a fresh run with score 0, 3 lives, level 1, `MATCH 0-0`, and `RALLY 0`.
- [ ] Arrow keys do not scroll the page, and a touch drag on the canvas does not scroll it.
- [ ] Leaving the page stops the loop with no console errors.
- [ ] A touch-only viewport shows the canvas (no "KEYBOARD REQUIRED" notice), and a touch drag moves the paddle.
- [ ] `/player/asteroids`, `/player/tetris`, `/player/arkanoid`, and `/player/snake` still work.
- [ ] `cover-duelo` and every other existing cover are unchanged.
- [ ] The migration file exists and is applied.
- [ ] `get_advisors` (security) reports no new errors.
- [ ] QA score rows are deleted.
- [ ] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: a new `games` row, appended last and published.** A new game gets a new id, with `sort_order: 13` after SNAKE (12). The unpublished prototype `duelo-pixel` was already removed by migration `0006`.
- **Yes: id `pong`, category `VERSUS`.** The `VERSUS` chip already exists in `lib/data.ts` and no published game uses it, so no category code changes.
- **Yes: a new cover class `cover-pong`.** `cover-duelo` still exists in `app/globals.css` from the prototype. Reusing or editing it would blur the two, so PONG gets its own class.
- **Yes (default): color `cyan`.** All four neon tokens are already used by published games, and `color` is a free text column. Cyan matches the player's paddle, and the only cyan-specific use today is the default button style.
- **Yes: the React shell owns the HUD, pause, and game over.** This is the same split as in spec 05.
- **Yes: a framework-free engine behind the shared contract.** This is the same approach as specs 05, 08, 09, and 11.
- **Yes (default): single player against a CPU.** The leaderboard needs one score per run, and the contract has no networking or second input.
- **Yes (default): CPU points cost lives, and there is no CPU match limit.** It reuses the 3-lives HUD and gives the run one clear end condition.
- **No: classic "first to N wins the match, then it is over".** A match result is not a score, and the run would end after one match at most.
- **Yes (default): rally-based return scoring `level × min(k, 10)`.** It rewards long rallies, so the score is not just 5 points per level, and the cap of 10 keeps one lucky rally from dominating.
- **Yes (default): a hard rally cap of 30 returns (the CPU freezes).** It guarantees every rally ends and gives the score a provable maximum (under 34,000).
- **Yes (default): the CPU follows the ball's current y with an aim error, not a trajectory prediction.** It is simple to specify, wall bounces fool it, and it stays beatable by angle.
- **Yes (default): the 100 ms CPU reaction delay and per-leg aim error.** They make levels differ by skill, not only by speed.
- **Yes (default): ball angle from the paddle hit offset, up to 55°.** It lets the player aim and is the skill that beats the CPU. A flat bounce would make the CPU unbeatable and the game a lottery.
- **Yes (default): ball sub-stepping at 6 px.** The ball reaches 800 px/s, and with `dt` capped at 50 ms it would travel 40 px in a frame, more than the 14 px paddle width.
- **Yes (default): the serve goes toward the side that conceded.** The scorer gets a breather, and the player never has to defend straight after scoring.
- **Yes: arrows, W and S, and pointer, registry `input: "pointer"`.** Same approach as ARKANOID, so phones play with a drag and no on-screen buttons.
- **Yes (default): a pointer speed cap of 900 px/s.** Without it, a mouse jump moves the paddle through the ball in one frame.
- **No: keyboard-only with the "KEYBOARD REQUIRED" notice.** Pong is natural on touch, and the shell already supports pointer games.
- **Yes (default): no sound.** There are no assets, so `sound` is not set and the mute toggle stays hidden.
- **Yes (default): the level selector (`levels: 5`, `jumpToLevel`).** It reuses the spec 09 shell feature and makes QA of each level quick.
- **Yes (default): a level jump resets the match to 0–0 and keeps score and lives.** Same trade-off as in specs 09 and 11.
- **Yes (default): a 1000-point completion bonus on level 5.** Clearing level 5 ends the run, as in ARKANOID and SNAKE.
- **Yes (default): the field draws no score digits.** The canvas shows no text, so the `MATCH` extra in the HUD carries the match score.

## Identified risks

| Risk                                                                            | Mitigation                                                                                                                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The ball tunnels through a paddle at high speed or after a lag frame            | `dt` is capped at 50 ms and the ball moves in sub-steps of at most 6 px, with a paddle check on each step.                             |
| A mouse jump teleports the paddle through the ball                              | The pointer moves the paddle at no more than 900 px/s toward the pointer's y.                                                          |
| A perfect-reading CPU makes levels unwinnable                                   | The player's paddle (420 px/s) outruns every CPU, aim error is random per leg, and a 55° return at 800 px/s outpaces the 400 px/s CPU. |
| Rallies never end, so score is unbounded and the match stalls                   | The 30-return rally cap freezes the CPU. The maximum score is under 34,000.                                                            |
| The ball gets stuck in a flat horizontal loop between two paddles               | Launch angles are random in ±25°, paddle bounces use the hit offset, and the CPU's aim error moves its hit point off-center.           |
| Jumping to a level resets its match, so a player can farm points on easy levels | Same trade-off accepted in specs 09 and 11. Every point still takes a goal, and the DB caps scores at 10,000,000.                      |
| `touch-action: none` on the canvas blocks page scroll on phones                 | It applies only to pointer-input canvases, and only over the canvas. The page scrolls from the HUD and margins.                        |
| Pointer and keyboard fight over the paddle                                      | The paddle takes the last input source used in that frame. The pointer sets a target, and keys move the paddle from where it is.       |
| "PONG" is a trademarked name                                                    | Course project, as with ARKANOID. Renaming later only takes a `title` UPDATE, plus a new id if the URL has to change.                  |
| QA leaves test scores in the production table                                   | The QA step deletes its own rows with `execute_sql`.                                                                                   |

## What is **not** in this spec

- Two-player mode, online play, or a difficulty selector beyond the 5-level jump.
- Sound, music, or a mute toggle.
- Power-ups, spin, paddle size changes, obstacles, and multiple balls.
- A CPU-side match limit (a best-of match).
- Changes to `lib/data.ts` categories, `cover-duelo`, or any existing cover.
- Leaderboard, view, or RLS changes.
- High-DPI rendering.

Each one of those, if it lands, goes in its own spec.
