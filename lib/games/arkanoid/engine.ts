// Arkanoid engine — TypeScript port of references/started-games/04-arkanoid/game.js.
// Framework-free: owns the canvas, the rAF loop, its keyboard and pointer
// listeners, and its sound effects. All state lives inside createArkanoid().

import type { GameCallbacks, GameEngine, GameHud } from "../types";

type GameState = "playing" | "paused" | "gameover";

type BrickColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

interface LevelBrick {
  col: number;
  row: number;
  color: BrickColor;
}

interface Level {
  speed: number;
  blocks: LevelBrick[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Block extends Rect {
  color: BrickColor;
  alive: boolean;
}

interface Explosion extends Rect {
  color: BrickColor;
  elapsed: number; // ms
}

// ── Constants ─────────────────────────────────────────────────────────────────
const W = 800;
const H = 600;

const PADDLE_SPEED = 400; // px/s
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200; // px/s
const BASE_BALL_VY = -300;
const BRICK_POINTS = 10;
const START_LIVES = 3;
const EXPLOSION_DURATION = 150; // ms
const EXPLOSION_STEPS = 4;
const MAX_DT = 50; // ms
const MAX_SCORE = 10_000_000; // DB CHECK on scores.score

const BOUNCE_SRC = "/games/arkanoid/ball-bounce.mp3";
const BREAK_SRC = "/games/arkanoid/break-sound.mp3";

// Keys whose default browser action (scrolling) is blocked while the game is mounted.
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);

// ── Levels (port of levels.js) ────────────────────────────────────────────────
const LEVELS: Level[] = (() => {
  const rowColors1: BrickColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BrickColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BrickColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];

  // 1 — full grid
  const l1: LevelBrick[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      l1.push({ col, row, color: rowColors1[row] });

  // 2 — pyramid
  const l2: LevelBrick[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  // 3 — checkerboard
  const l3: LevelBrick[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  // 4 — gapped rows
  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBrick[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  // 5 — frame + cross
  const l5: LevelBrick[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

// ── Pure helpers ──────────────────────────────────────────────────────────────
function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function createArkanoid(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Arkanoid: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── State ───────────────────────────────────────────────────────────────────
  const paddle: Rect = { x: 0, y: 560, w: 81, h: 14 };
  const ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  const keys = { left: false, right: false };
  let state: GameState = "playing";
  let stateBeforePause: GameState = "playing";
  let lastHud: GameHud | null = null;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;

  // ── Sound ───────────────────────────────────────────────────────────────────
  // Each effect plays on a clone so overlapping hits don't cut each other off.
  // Live clones are tracked so pause and destroy can silence them.
  const bounceSound = new Audio(BOUNCE_SRC);
  const breakSound = new Audio(BREAK_SRC);
  const playing = new Set<HTMLAudioElement>();

  function play(sound: HTMLAudioElement) {
    if (state !== "playing") return;
    const clone = sound.cloneNode() as HTMLAudioElement;
    playing.add(clone);
    clone.addEventListener("ended", () => playing.delete(clone));
    // Autoplay can be blocked before the first user gesture; stay silent then.
    clone.play().catch(() => playing.delete(clone));
  }

  function stopSounds() {
    for (const clone of playing) clone.pause();
    playing.clear();
  }

  // ── Game logic ──────────────────────────────────────────────────────────────
  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }

  function initPaddle() {
    paddle.x = (W - paddle.w) / 2;
  }

  // Ball restarts on top of the paddle, moving up-right at the level's speed.
  function initBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    initBall();
  }

  function initGame() {
    score = 0;
    lives = START_LIVES;
    keys.left = false;
    keys.right = false;
    state = "playing";
    initPaddle();
    loadLevel(1);
  }

  function gameOver() {
    state = "gameover";
    keys.left = false;
    keys.right = false;
    stopSounds();
    emitHud();
    callbacks.onGameOver(score);
  }

  function movePaddleTo(x: number) {
    paddle.x = Math.max(0, Math.min(W - paddle.w, x));
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dtMs: number) {
    if (state !== "playing") return;
    const dt = dtMs / 1000;

    // Paddle
    if (keys.left) movePaddleTo(paddle.x - PADDLE_SPEED * dt);
    if (keys.right) movePaddleTo(paddle.x + PADDLE_SPEED * dt);

    // Ball movement
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall bounces (left, right, top)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      play(bounceSound);
    }

    // Paddle bounce: only while falling, with an 8 px catch zone below the top.
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      play(bounceSound);
    }

    // Brick collisions — at most one brick per frame.
    for (const block of blocks) {
      if (!block.alive || !overlaps(ball, block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      addScore(BRICK_POINTS);
      ball.vy = -ball.vy;
      play(breakSound);
      if (blocks.every((b) => !b.alive)) {
        // Clearing level 5 is the reference's win screen: the run ends.
        if (level < LEVELS.length) loadLevel(level + 1);
        else return gameOver();
      }
      break;
    }

    // Explosions
    for (const exp of explosions) exp.elapsed += dtMs;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Ball lost: one life down, relaunch from the paddle right away.
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameOver();
      } else {
        initBall();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  // No HUD or overlay text: score, lives, level, pause, and game over live in React.
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const block of blocks) {
      if (!block.alive) continue;
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
    }

    for (const exp of explosions) {
      const step = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * EXPLOSION_STEPS),
        EXPLOSION_STEPS - 1,
      );
      ctx.strokeStyle = exp.color;
      ctx.globalAlpha = 1 - step / EXPLOSION_STEPS;
      ctx.strokeRect(
        exp.x - step * 2,
        exp.y - step * 2,
        exp.w + step * 4,
        exp.h + step * 4,
      );
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#fff";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillRect(ball.x, ball.y, ball.w, ball.h);
  }

  // ── HUD reporting ───────────────────────────────────────────────────────────
  function emitHud() {
    if (
      lastHud &&
      lastHud.score === score &&
      lastHud.lives === lives &&
      lastHud.level === level
    )
      return;
    lastHud = { score, lives, level };
    callbacks.onHud(lastHud);
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    draw();
    emitHud();
    rafId = requestAnimationFrame(loop);
  }

  // ── Pause ───────────────────────────────────────────────────────────────────
  function pause() {
    if (state !== "playing") return;
    stateBeforePause = state;
    state = "paused";
    keys.left = false;
    keys.right = false;
    stopSounds();
    callbacks.onPauseChange(true);
  }

  function resume() {
    if (state !== "paused") return;
    state = stateBeforePause;
    callbacks.onPauseChange(false);
  }

  // ── Listeners ───────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    // Game over (modal open) or typing in a field: leave the key alone.
    if (state === "gameover" || isTypingTarget(e.target)) return;

    if (e.code === "KeyP" || e.code === "Escape") {
      if (!e.repeat) {
        if (state === "paused") resume();
        else pause();
      }
      return;
    }

    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (state !== "playing") return;
    if (e.code === "ArrowLeft") keys.left = true;
    else keys.right = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft") keys.left = false;
    else if (e.code === "ArrowRight") keys.right = false;
  }

  // Mouse move and touch drag: the paddle's center follows the pointer's x.
  // Ignored while paused or after game over, so a resume shot can't be set up for free.
  function onPointer(e: PointerEvent) {
    if (state !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((e.clientX - rect.left) * W) / rect.width;
    movePaddleTo(x - paddle.w / 2);
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
  }

  function onBlur() {
    pause();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerdown", onPointer);

  // ── Start ───────────────────────────────────────────────────────────────────
  initGame();
  emitHud();
  rafId = requestAnimationFrame(loop);

  return {
    pause,
    resume,
    end() {
      if (state === "gameover") return;
      gameOver();
    },
    restart() {
      if (destroyed) return;
      initGame();
      // The shell resets its HUD on PLAY AGAIN, so always send a fresh one.
      lastHud = null;
      emitHud();
    },
    jumpToLevel(n: number) {
      if (destroyed || state === "gameover") return;
      if (!Number.isInteger(n) || n < 1 || n > LEVELS.length) return;
      loadLevel(n);
      emitHud();
      resume();
    },
    destroy() {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      stopSounds();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerdown", onPointer);
    },
  };
}
