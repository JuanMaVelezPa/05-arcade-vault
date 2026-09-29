// Snake engine — original five-level SNAKE (specs/11-snake-game.md).
// Framework-free: owns the canvas, the rAF loop, and its keyboard listeners.
// All state lives inside createSnake().

import type { GameCallbacks, GameEngine, GameHud } from "../types";

type GameState = "playing" | "paused" | "gameover";

interface Cell {
  x: number;
  y: number;
}

interface Fruit extends Cell {
  sprite: number; // index into the fruit atlas
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 32;
const ROWS = 24;
const CELL = 25; // 800 × 600
const W = COLS * CELL;
const H = ROWS * CELL;

const START: Cell = { x: 8, y: 12 };
const START_LENGTH = 4;
const START_LIVES = 3;
const FRUITS_PER_LEVEL = 10;
const COMPLETION_BONUS = 500;
const BLINK_MS = 600; // respawn freeze after a crash or a level change
const FRUIT_SPRITES = 22;
const MAX_TURNS = 2; // turns buffered per tick
const MAX_DT = 50; // ms
const MAX_SCORE = 10_000_000; // DB CHECK on scores.score

const GREEN = "#00ff88";
const MAGENTA = "#ff006e";

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const;

type Dir = (typeof DIRS)[keyof typeof DIRS];

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: DIRS.up,
  ArrowDown: DIRS.down,
  ArrowLeft: DIRS.left,
  ArrowRight: DIRS.right,
  KeyW: DIRS.up,
  KeyS: DIRS.down,
  KeyA: DIRS.left,
  KeyD: DIRS.right,
};

// Keys whose default browser action (scrolling) is blocked while the game is mounted.
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

// ── Levels ────────────────────────────────────────────────────────────────────
// Walls are [x, y] cells. Row 12 from x = 3 to x = 14 stays clear on every
// level, so the respawn at (8, 12) is always safe.
interface Level {
  tickMs: number;
  walls: [number, number][];
}

function hBar(y: number, x0: number, x1: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let x = x0; x <= x1; x++) cells.push([x, y]);
  return cells;
}

function vBar(x: number, y0: number, y1: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let y = y0; y <= y1; y++) cells.push([x, y]);
  return cells;
}

// An L of two 4-cell arms that share the corner cell and point inward.
function cornerL(x: number, y: number, dx: 1 | -1, dy: 1 | -1) {
  const cells: [number, number][] = [];
  for (let i = 0; i < 4; i++) cells.push([x + dx * i, y]);
  for (let i = 1; i < 4; i++) cells.push([x, y + dy * i]);
  return cells;
}

const LEVELS: Level[] = [
  // 1 — open field
  { tickMs: 140, walls: [] },
  // 2 — four corner L-blocks
  {
    tickMs: 120,
    walls: [
      ...cornerL(3, 3, 1, 1),
      ...cornerL(28, 3, -1, 1),
      ...cornerL(3, 20, 1, -1),
      ...cornerL(28, 20, -1, -1),
    ],
  },
  // 3 — two horizontal bars
  { tickMs: 105, walls: [...hBar(6, 8, 23), ...hBar(17, 8, 23)] },
  // 4 — box with a 4-cell gap in the middle of each side
  {
    tickMs: 90,
    walls: [
      ...hBar(4, 6, 13),
      ...hBar(4, 18, 25),
      ...hBar(19, 6, 13),
      ...hBar(19, 18, 25),
      ...vBar(6, 5, 9),
      ...vBar(6, 14, 18),
      ...vBar(25, 5, 9),
      ...vBar(25, 14, 18),
    ],
  },
  // 5 — the maze
  {
    tickMs: 75,
    walls: [
      ...vBar(10, 3, 9),
      ...vBar(10, 15, 20),
      ...vBar(21, 3, 9),
      ...vBar(21, 15, 20),
      ...hBar(6, 13, 18),
      ...hBar(18, 13, 18),
    ],
  },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function cellKey(x: number, y: number): number {
  return y * COLS + x;
}

export function createSnake(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Snake: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── State ───────────────────────────────────────────────────────────────────
  let snake: Cell[] = []; // head first
  let dir: Dir = DIRS.right;
  let turnQueue: Dir[] = [];
  let fruit: Fruit | null = null;
  let wallSet = new Set<number>(); // cellKey of the current level's walls
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let fruitsEaten = 0; // on the current level
  let tickAcc = 0; // ms
  let blinkMs = 0; // respawn freeze left; the snake blinks and does not move
  let state: GameState = "playing";
  let stateBeforePause: GameState = "playing";
  let lastHud: GameHud | null = null;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;

  // ── Game logic ──────────────────────────────────────────────────────────────
  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }

  // Length 4 at the start cell, body to the left, heading right.
  function resetSnake() {
    snake = [];
    for (let i = 0; i < START_LENGTH; i++)
      snake.push({ x: START.x - i, y: START.y });
    dir = DIRS.right;
    turnQueue = [];
    tickAcc = 0;
  }

  // Fresh snake that blinks in place before it moves (crash or level change).
  function respawn() {
    resetSnake();
    blinkMs = BLINK_MS;
  }

  // One fruit on a random free cell (not on the snake or a wall).
  // Returns false when no free cell is left.
  function placeFruit(): boolean {
    const taken = new Set(wallSet);
    for (const s of snake) taken.add(cellKey(s.x, s.y));
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (!taken.has(cellKey(x, y))) free.push({ x, y });
    if (free.length === 0) {
      fruit = null;
      return false;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    fruit = { ...cell, sprite: Math.floor(Math.random() * FRUIT_SPRITES) };
    return true;
  }

  // Walls, a fresh snake, and a fruit for level n. The fruit count starts at 0.
  function loadLevel(n: number) {
    level = n;
    wallSet = new Set(LEVELS[n - 1].walls.map(([x, y]) => cellKey(x, y)));
    fruitsEaten = 0;
    respawn();
    placeFruit();
  }

  function initGame() {
    score = 0;
    lives = START_LIVES;
    state = "playing";
    loadLevel(1);
    blinkMs = 0; // a new run starts moving right away
  }

  function gameOver() {
    state = "gameover";
    turnQueue = [];
    emitHud();
    callbacks.onGameOver(score);
  }

  // Clearing level 5 adds the completion bonus and ends the run, as in ARKANOID.
  function levelCleared() {
    if (level < LEVELS.length) return loadLevel(level + 1);
    addScore(COMPLETION_BONUS);
    gameOver();
  }

  // One life down; with lives left the snake respawns and the fruit count stays.
  function crash() {
    lives--;
    if (lives <= 0) {
      lives = 0;
      gameOver();
      return;
    }
    respawn();
    if (!placeFruit()) levelCleared();
  }

  // One move: take a queued turn, step the head, then check collisions.
  function tick() {
    const turn = turnQueue.shift();
    if (turn) dir = turn;

    const head = snake[0];
    const next = { x: head.x + dir.x, y: head.y + dir.y };

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS)
      return crash();
    if (wallSet.has(cellKey(next.x, next.y))) return crash();

    const eats = fruit !== null && next.x === fruit.x && next.y === fruit.y;
    // The tail moves away this tick unless the snake grows, so it is not a hit.
    const body = eats ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === next.x && s.y === next.y)) return crash();

    snake.unshift(next);
    if (!eats) {
      snake.pop();
      return;
    }

    addScore(10 * level);
    fruitsEaten++;
    if (fruitsEaten >= FRUITS_PER_LEVEL) return levelCleared();
    // A snake that fills every free cell also clears the level.
    if (!placeFruit()) levelCleared();
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  // Each tick runs its own move and collision check, so a slow frame can't skip one.
  function update(dtMs: number) {
    if (state !== "playing") return;
    if (blinkMs > 0) {
      blinkMs = Math.max(0, blinkMs - dtMs);
      return;
    }
    tickAcc += dtMs;
    while (state === "playing" && blinkMs === 0) {
      const tickMs = LEVELS[level - 1].tickMs;
      if (tickAcc < tickMs) break;
      tickAcc -= tickMs;
      tick();
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  // No HUD or overlay text: score, lives, level, pause, and game over live in React.
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = MAGENTA;
    for (const [x, y] of LEVELS[level - 1].walls)
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);

    if (fruit) {
      ctx.fillStyle = MAGENTA;
      ctx.beginPath();
      ctx.arc(
        fruit.x * CELL + CELL / 2,
        fruit.y * CELL + CELL / 2,
        CELL / 2 - 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // The snake blinks every 100 ms while it waits to move.
    if (blinkMs > 0 && Math.floor(blinkMs / 100) % 2 === 1) return;
    ctx.fillStyle = GREEN;
    for (const s of snake)
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
  }

  // ── HUD reporting ───────────────────────────────────────────────────────────
  let lastFruits = -1;

  function emitHud() {
    if (
      lastHud &&
      lastHud.score === score &&
      lastHud.lives === lives &&
      lastHud.level === level &&
      lastFruits === fruitsEaten
    )
      return;
    lastFruits = fruitsEaten;
    lastHud = {
      score,
      lives,
      level,
      extras: [{ label: "FRUIT", value: `${fruitsEaten}/${FRUITS_PER_LEVEL}` }],
    };
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
    turnQueue = [];
    callbacks.onPauseChange(true);
  }

  function resume() {
    if (state !== "paused") return;
    state = stateBeforePause;
    callbacks.onPauseChange(false);
  }

  // ── Listeners ───────────────────────────────────────────────────────────────
  // A turn is compared with the last queued direction (or the current one),
  // so ↑ then ← within one tick both land and a 180° reversal is dropped.
  function queueTurn(next: Dir) {
    const last = turnQueue.length ? turnQueue[turnQueue.length - 1] : dir;
    if (next === last) return;
    if (next.x === -last.x && next.y === -last.y) return;
    if (turnQueue.length < MAX_TURNS) turnQueue.push(next);
  }

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

    const next = KEY_DIRS[e.code];
    if (!next) return;
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    if (state !== "playing") return;
    queueTurn(next);
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
  }

  function onBlur() {
    pause();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
