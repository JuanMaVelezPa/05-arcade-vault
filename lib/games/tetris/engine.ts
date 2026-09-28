// Tetris engine — TypeScript port of references/started-games/03-tetris/game.js.
// Framework-free: owns the canvas, the rAF loop, and its keyboard listeners.
// All state lives inside createTetris() so several instances never share it.

import type { GameCallbacks, GameEngine, GameHud } from "../types";

type GameState = "playing" | "paused" | "gameover";

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const BOARD_W = COLS * BLOCK; // 300
const W = 450; // board + 150 px next-piece column
const H = ROWS * BLOCK; // 600

// Next-piece frame in the side column: 4 × 4 cells, centered horizontally.
const PREVIEW_SIZE = 4 * BLOCK;
const PREVIEW_X = BOARD_W + (W - BOARD_W - PREVIEW_SIZE) / 2;
const PREVIEW_Y = 30;

// Neon palette — values mirror the tokens in app/globals.css.
// Colors by piece index (1–8).
const COLORS = [
  "",
  "#00f5ff", // I — --cyan
  "#f5ff00", // O — --yellow
  "#ff006e", // T — --magenta
  "#00ff88", // S — --green
  "#d97a3a", // Z — --bronze
  "#c7d0e0", // J — --silver
  "#ffcf3a", // L — --gold
  "#8a8fb5", // N — --ink-dim, metallic like the reference's gray nut
];
const CYAN = "#00f5ff";
const GRID_LINE = "rgba(0, 245, 255, 0.18)"; // --line

const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N — the nut
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const WALL_KICKS = [0, -1, 1, -2, 2];

const START_INTERVAL = 1000; // ms per row at level 1
const MIN_INTERVAL = 100;
const INTERVAL_STEP = 90;
const MAX_DT = 50; // ms
const MAX_SCORE = 10_000_000; // DB CHECK on scores.score

// Keys whose default browser action (scrolling) is blocked while the game is mounted.
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyX",
]);

// ── Pure helpers ──────────────────────────────────────────────────────────────
function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

// Clockwise rotation: transpose + reverse rows.
function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function intervalFor(level: number): number {
  return Math.max(MIN_INTERVAL, START_INTERVAL - (level - 1) * INTERVAL_STEP);
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

export function createTetris(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tetris: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── State ───────────────────────────────────────────────────────────────────
  let board = createBoard();
  let current = randomPiece();
  let next = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = START_INTERVAL;
  let dropAccum = 0;
  let state: GameState = "playing";
  let stateBeforePause: GameState = "playing";
  let lastHud: (GameHud & { lines: number }) | null = null;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;
  let boardDirty = true; // locked cells changed; redraw the cached board layer

  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }

  // ── Board logic ─────────────────────────────────────────────────────────────
  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function tryMove(dx: number) {
    if (!collide(current.shape, current.x + dx, current.y)) current.x += dx;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of WALL_KICKS) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    boardDirty = true;
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      addScore((LINE_SCORES[cleared] ?? 0) * level);
      level = Math.floor(lines / 10) + 1;
      dropInterval = intervalFor(level);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    addScore((gy - current.y) * 2);
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(1);
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    // A new piece that collides right away tops out the well.
    if (collide(current.shape, current.x, current.y)) gameOver();
  }

  function initGame() {
    board = createBoard();
    boardDirty = true;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = START_INTERVAL;
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
  }

  function gameOver() {
    state = "gameover";
    emitHud();
    callbacks.onGameOver(score);
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state !== "playing") return;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  // No HUD or overlay text: score, lines, level, and game over live in React.

  // Same dark radial background as .game-arena in app/globals.css.
  const background = ctx.createRadialGradient(
    W / 2,
    H / 2,
    0,
    W / 2,
    H / 2,
    Math.hypot(W / 2, H / 2) * 0.7,
  );
  background.addColorStop(0, "#0a0030");
  background.addColorStop(1, "#000");

  // Locked cells glow too, and shadowBlur on up to 200 cells per frame is
  // expensive, so they are drawn to an offscreen layer only when they change.
  const boardLayer = canvas.ownerDocument.createElement("canvas");
  boardLayer.width = BOARD_W;
  boardLayer.height = H;
  const boardCtx = boardLayer.getContext("2d");

  // A lit neon cell: glowing fill, the reference's top highlight, darker core.
  function drawBlock(
    c: CanvasRenderingContext2D,
    px: number,
    py: number,
    colorIndex: number,
  ) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex];
    c.save();
    c.shadowColor = color;
    c.shadowBlur = 10;
    c.fillStyle = color;
    c.fillRect(px + 2, py + 2, BLOCK - 4, BLOCK - 4);
    c.shadowBlur = 0;
    c.fillStyle = "rgba(255, 255, 255, 0.35)";
    c.fillRect(px + 2, py + 2, BLOCK - 4, 3);
    c.fillStyle = "rgba(0, 0, 0, 0.28)";
    c.fillRect(px + 8, py + 9, BLOCK - 16, BLOCK - 16);
    c.restore();
  }

  function drawShape(
    c: CanvasRenderingContext2D,
    shape: number[][],
    ox: number,
    oy: number,
  ) {
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock(c, ox + col * BLOCK, oy + r * BLOCK, shape[r][col]);
  }

  // Ghost: a faint outline in the piece's color where it will land.
  function drawGhost(shape: number[][], ox: number, oy: number) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++) {
        const v = shape[r][c];
        if (!v) continue;
        ctx.strokeStyle = COLORS[v];
        ctx.strokeRect(
          ox + c * BLOCK + 3.5,
          oy + r * BLOCK + 3.5,
          BLOCK - 7,
          BLOCK - 7,
        );
      }
    ctx.restore();
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, H);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(BOARD_W, r * BLOCK);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawBoardLayer() {
    if (!boardCtx) return;
    boardCtx.clearRect(0, 0, BOARD_W, H);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(boardCtx, c * BLOCK, r * BLOCK, board[r][c]);
    boardDirty = false;
  }

  // Board edge and next-piece frame: thin cyan lines with a soft glow.
  function drawFrame() {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 245, 255, 0.55)";
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(BOARD_W + 0.75, 0);
    ctx.lineTo(BOARD_W + 0.75, H);
    ctx.stroke();
    ctx.strokeRect(PREVIEW_X, PREVIEW_Y, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.restore();
  }

  function drawNext() {
    const shape = next.shape;
    // Center the piece's filled cells inside the frame.
    const filledRows = shape
      .map((row, r) => (row.some((v) => v) ? r : -1))
      .filter((r) => r >= 0);
    const filledCols = shape[0]
      .map((_, c) => (shape.some((row) => row[c]) ? c : -1))
      .filter((c) => c >= 0);
    const minR = filledRows[0];
    const minC = filledCols[0];
    const h = (filledRows[filledRows.length - 1] - minR + 1) * BLOCK;
    const w = (filledCols[filledCols.length - 1] - minC + 1) * BLOCK;
    const ox = PREVIEW_X + (PREVIEW_SIZE - w) / 2 - minC * BLOCK;
    const oy = PREVIEW_Y + (PREVIEW_SIZE - h) / 2 - minR * BLOCK;
    drawShape(ctx, shape, ox, oy);
  }

  function draw() {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);

    drawGrid();
    drawFrame();

    if (boardDirty) drawBoardLayer();
    if (boardCtx) ctx.drawImage(boardLayer, 0, 0);
    else
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          drawBlock(ctx, c * BLOCK, r * BLOCK, board[r][c]);

    if (state !== "gameover") {
      drawGhost(current.shape, current.x * BLOCK, ghostY() * BLOCK);
    }
    drawShape(ctx, current.shape, current.x * BLOCK, current.y * BLOCK);

    drawNext();
  }

  // ── HUD reporting ───────────────────────────────────────────────────────────
  function emitHud() {
    if (
      lastHud &&
      lastHud.score === score &&
      lastHud.level === level &&
      lastHud.lines === lines
    )
      return;
    const hud: GameHud = {
      score,
      lives: 0,
      level,
      extras: [{ label: "LINES", value: String(lines) }],
    };
    lastHud = { ...hud, lines };
    callbacks.onHud(hud);
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

    switch (e.code) {
      case "ArrowLeft":
        tryMove(-1);
        break;
      case "ArrowRight":
        tryMove(1);
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        // Holding Space would hard-drop piece after piece.
        if (!e.repeat) hardDrop();
        break;
    }
    emitHud();
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
