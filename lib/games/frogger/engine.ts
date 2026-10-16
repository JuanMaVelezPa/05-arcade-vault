// Frogger engine — road, river and five goal mouths (specs/game-jam/frogger/01-frogger-core.md).
// Framework-free: owns the canvas, the rAF loop, and its keyboard listeners.
// All state lives inside createFrogger().

import type { GameCallbacks, GameEngine, GameHud } from "../types";
import {
  BASE_TIME_MS,
  CELL,
  COLS,
  GOAL_COLS,
  GOAL_COUNT,
  POINTS_GOAL,
  POINTS_ROUND,
  POINTS_ROW,
  POINTS_TIME,
  GOAL_WIDTH,
  H,
  HOP_MS,
  MAX_DT,
  MAX_SCORE,
  MIN_TIME_MS,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_SAFE_MID,
  ROW_START,
  START_COL,
  START_LIVES,
  TIME_STEP_MS,
  W,
  type Direction,
  type Entity,
  type Frog,
  type Lane,
} from "./constants";
import { checkGoal, checkRoadCollision, getSupport } from "./collisions";
import { buildLanes, isSubmerged } from "./lanes";

type GameState = "playing" | "paused" | "gameover";

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

const STEP: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

// Keys whose default browser action (scrolling) is blocked while the game is mounted.
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

// ── Palette (neon) ────────────────────────────────────────────────────────────
const C = {
  road: "#0c0c16",
  roadLine: "rgba(230, 233, 255, 0.22)",
  river: "#00203a",
  riverWave: "rgba(0, 245, 255, 0.14)",
  safe: "#0b3a1f",
  safeDot: "rgba(0, 255, 136, 0.22)",
  goalBank: "#0a3d20",
  goalMouth: "#2a9d5c",
  goalEdge: "#ffcf3a",
  frog: "#00ff88",
  frogDark: "#00a85a",
  eyeWhite: "#ffffff",
  eyePupil: "#0a0a0f",
  log: "#8a5a2b",
  logLine: "#5c3a18",
  turtle: "#1fbf6a",
  turtleShell: "#0f7a40",
  truck: "#9aa4b8",
  truckCab: "#ff006e",
  cars: ["#ff3b3b", "#f5ff00", "#00f5ff"],
  text: "#e6e9ff",
  timeOk: "#00ff88",
  timeMid: "#f5ff00",
  timeLow: "#ff006e",
} as const;

const HUD_H = 14; // top strip of row 0 reserved for the in-canvas HUD
const TIME_BAR_H = 6; // bottom strip of the start row

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

// Round timer for a level: 15 s, one second less per level, floor 8 s.
function timeLimitMs(level: number): number {
  return Math.max(MIN_TIME_MS, BASE_TIME_MS - (level - 1) * TIME_STEP_MS);
}

function newFrog(): Frog {
  return {
    col: START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: START_COL,
    targetRow: ROW_START,
  };
}

export function createFrogger(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Frogger: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── State ───────────────────────────────────────────────────────────────────
  let frog: Frog = newFrog();
  let lanes: Lane[] = [];
  let goals: boolean[] = []; // one flag per goal mouth: occupied this round
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let timeLeftMs = BASE_TIME_MS;
  let elapsedMs = 0; // playing time; drives the turtle dive cycle
  let pendingDir: Direction | null = null;
  let bestRow = ROW_START; // highest row (lowest index) reached this life
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

  function resetFrog() {
    frog = newFrog();
    bestRow = ROW_START;
    pendingDir = null;
    timeLeftMs = timeLimitMs(level);
  }

  function initGame() {
    score = 0;
    lives = START_LIVES;
    level = 1;
    elapsedMs = 0;
    goals = Array.from({ length: GOAL_COUNT }, () => false);
    lanes = buildLanes(level);
    state = "playing";
    resetFrog();
  }

  function gameOver() {
    state = "gameover";
    pendingDir = null;
    emitHud();
    callbacks.onGameOver(score);
  }

  // All five mouths filled: bonus, next level (faster lanes, shorter timer),
  // empty mouths, frog back at the start. The HUD reports the new level.
  function completeRound() {
    addScore(POINTS_ROUND);
    level++;
    goals = goals.map(() => false);
    lanes = buildLanes(level);
    resetFrog(); // also resets the timer for the new level
  }

  // Score the landing cell: new rows climbed, then a goal mouth on the top row.
  function resolveLanding() {
    if (frog.row < bestRow) {
      addScore((bestRow - frog.row) * POINTS_ROW);
      bestRow = frog.row;
    }
    const goal = checkGoal(frog, goals);
    if (goal.kind === "none") return;
    if (goal.kind !== "free") return killFrog(); // bank or occupied mouth
    goals[goal.index] = true;
    addScore(POINTS_GOAL + Math.floor(timeLeftMs / 1000) * POINTS_TIME);
    if (goals.every(Boolean)) completeRound();
    else resetFrog();
  }

  // One life down. With lives left the frog respawns at the start with a fresh
  // timer; the mouths already filled stay. At zero lives the run ends.
  function killFrog() {
    if (state !== "playing") return; // the run already ended this frame
    lives--;
    if (lives <= 0) {
      lives = 0;
      gameOver();
      return;
    }
    resetFrog();
  }

  // Wrap an entity around the lane ring once it fully leaves the screen.
  function moveEntity(lane: Lane, e: Entity, dt: number) {
    e.col += (lane.dir * lane.speed * dt) / 1000;
    if (lane.dir > 0 && e.col >= COLS) e.col -= lane.period;
    else if (lane.dir < 0 && e.col + e.width <= 0) e.col += lane.period;
  }

  function startHop(dir: Direction) {
    const { dc, dr } = STEP[dir];
    const targetCol = Math.round(frog.col) + dc;
    const targetRow = frog.row + dr;
    if (targetCol < 0 || targetCol >= COLS) return;
    if (targetRow < ROW_GOALS || targetRow > ROW_START) return;
    frog.animating = true;
    frog.animT = 0;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
  }

  // Frame-by-frame dangers: traffic, open water, a sinking turtle, the river
  // edges. Returns true when the frog died. Only checked while the frog sits on
  // a cell; a hop in flight is safe and is judged when it lands.
  function checkHazards(dt: number): boolean {
    if (checkRoadCollision(frog, lanes)) {
      killFrog();
      return true;
    }
    const support = getSupport(frog, lanes);
    if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
      if (!support) {
        killFrog();
        return true;
      }
      // Ride the log or turtles; drifting off either side is fatal.
      frog.col += (support.lane.dir * support.lane.speed * dt) / 1000;
      if (frog.col < -0.5 || frog.col > COLS - 0.5) {
        killFrog();
        return true;
      }
    }
    return false;
  }

  function update(dt: number) {
    if (state !== "playing") return;
    elapsedMs += dt;

    for (const lane of lanes) {
      for (const e of lane.entities) {
        moveEntity(lane, e, dt);
        if (e.type === "turtle") e.submerged = isSubmerged(e, elapsedMs);
      }
    }

    if (!frog.animating && pendingDir) {
      const dir = pendingDir;
      pendingDir = null;
      startHop(dir);
    }
    if (frog.animating) {
      frog.animT += dt;
      if (frog.animT >= HOP_MS) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        frog.animT = 0;
        resolveLanding();
      }
    }

    if (!frog.animating && checkHazards(dt)) return;

    timeLeftMs -= dt;
    if (timeLeftMs <= 0) killFrog();
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────
  function drawBackground() {
    const band = (r0: number, r1: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, r0 * CELL, W, (r1 - r0 + 1) * CELL);
    };
    band(ROW_GOALS, ROW_GOALS, C.goalBank);
    band(ROW_RIVER_TOP, ROW_RIVER_BOT, C.river);
    band(ROW_SAFE_MID, ROW_SAFE_MID, C.safe);
    band(ROW_ROAD_TOP, ROW_ROAD_BOT, C.road);
    band(ROW_START, ROW_START, C.safe);

    // River ripples.
    ctx.strokeStyle = C.riverWave;
    ctx.lineWidth = 2;
    for (let r = ROW_RIVER_TOP; r <= ROW_RIVER_BOT; r++) {
      for (let x = ((r * 23) % 60) - 30; x < W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, r * CELL + CELL / 2);
        ctx.quadraticCurveTo(
          x + 10,
          r * CELL + CELL / 2 - 5,
          x + 20,
          r * CELL + CELL / 2,
        );
        ctx.stroke();
      }
    }

    // Dashed lane dividers on the road.
    ctx.strokeStyle = C.roadLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 14]);
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(W, r * CELL);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Grass dots on both safe rows.
    ctx.fillStyle = C.safeDot;
    for (const r of [ROW_SAFE_MID, ROW_START]) {
      for (let x = 10; x < W; x += 40) ctx.fillRect(x, r * CELL + 12, 3, 3);
      for (let x = 30; x < W; x += 40) ctx.fillRect(x, r * CELL + 28, 3, 3);
    }
  }

  function drawGoals() {
    for (let i = 0; i < GOAL_COUNT; i++) {
      const x = GOAL_COLS[i] * CELL;
      const y = ROW_GOALS * CELL + HUD_H;
      const w = GOAL_WIDTH * CELL;
      const h = CELL - HUD_H;
      ctx.fillStyle = C.goalMouth;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = C.goalEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (goals[i]) drawFrogShape(x + w / 2, y + h / 2, 0.7, false);
    }
  }

  function drawCar(e: Entity, lane: Lane, index: number) {
    const x = e.col * CELL;
    const y = lane.row * CELL;
    const w = e.width * CELL;
    ctx.fillStyle = C.cars[index % C.cars.length];
    ctx.fillRect(x + 3, y + 8, w - 6, CELL - 16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)"; // windscreen
    const front = lane.dir > 0 ? x + w - 14 : x + 6;
    ctx.fillRect(front, y + 11, 8, CELL - 22);
    ctx.fillStyle = "#0a0a0f"; // wheels
    ctx.fillRect(x + 7, y + 5, 8, 4);
    ctx.fillRect(x + w - 15, y + 5, 8, 4);
    ctx.fillRect(x + 7, y + CELL - 9, 8, 4);
    ctx.fillRect(x + w - 15, y + CELL - 9, 8, 4);
  }

  function drawTruck(e: Entity, lane: Lane) {
    const x = e.col * CELL;
    const y = lane.row * CELL;
    const w = e.width * CELL;
    const cabW = CELL - 6;
    ctx.fillStyle = C.truck;
    ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
    ctx.fillStyle = C.truckCab;
    ctx.fillRect(
      lane.dir > 0 ? x + w - cabW - 2 : x + 2,
      y + 6,
      cabW,
      CELL - 12,
    );
    ctx.fillStyle = "#0a0a0f";
    for (let wx = x + 8; wx < x + w - 10; wx += CELL) {
      ctx.fillRect(wx, y + 3, 8, 4);
      ctx.fillRect(wx, y + CELL - 7, 8, 4);
    }
  }

  function drawLog(e: Entity, lane: Lane) {
    const x = e.col * CELL;
    const y = lane.row * CELL;
    const w = e.width * CELL;
    ctx.fillStyle = C.log;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 6, w - 4, CELL - 12, 8);
    ctx.fill();
    ctx.strokeStyle = C.logLine;
    ctx.lineWidth = 2;
    for (let lx = x + 14; lx < x + w - 8; lx += 16) {
      ctx.beginPath();
      ctx.moveTo(lx, y + 10);
      ctx.lineTo(lx - 4, y + CELL - 10);
      ctx.stroke();
    }
  }

  function drawTurtles(e: Entity, lane: Lane) {
    for (let i = 0; i < e.width; i++) {
      const cx = (e.col + i + 0.5) * CELL;
      const cy = lane.row * CELL + CELL / 2;
      if (e.submerged) {
        ctx.strokeStyle = "rgba(31, 191, 106, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = C.turtle;
      ctx.beginPath();
      ctx.arc(cx + lane.dir * 12, cy, 5, 0, Math.PI * 2); // head
      ctx.fill();
      ctx.fillStyle = C.turtleShell;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.turtle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    }
  }

  function drawLanes() {
    for (const lane of lanes) {
      lane.entities.forEach((e, i) => {
        if (e.type === "car") drawCar(e, lane, i);
        else if (e.type === "truck") drawTruck(e, lane);
        else if (e.type === "log") drawLog(e, lane);
        else drawTurtles(e, lane);
      });
    }
  }

  // Frog centered on (cx, cy); `scale` 1 fills most of a cell. Legs spread while hopping.
  function drawFrogShape(cx: number, cy: number, scale: number, hop: boolean) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = C.frogDark; // legs
    const spread = hop ? 6 : 0;
    ctx.fillRect(-18 - spread / 2, -11 - spread, 8, 8);
    ctx.fillRect(10 + spread / 2, -11 - spread, 8, 8);
    ctx.fillRect(-18 - spread / 2, 4 + spread, 8, 8);
    ctx.fillRect(10 + spread / 2, 4 + spread, 8, 8);
    ctx.fillStyle = C.frog; // body 28 × 24
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const ex of [-6, 6]) {
      ctx.fillStyle = C.eyeWhite;
      ctx.beginPath();
      ctx.arc(ex, -9, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.eyePupil;
      ctx.beginPath();
      ctx.arc(ex, -10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFrog() {
    let col = frog.col;
    let row = frog.row;
    if (frog.animating) {
      const t = Math.min(1, frog.animT / HOP_MS);
      col = frog.col + (frog.targetCol - frog.col) * t;
      row = frog.row + (frog.targetRow - frog.row) * t;
    }
    drawFrogShape((col + 0.5) * CELL, (row + 0.5) * CELL, 1, frog.animating);
  }

  function drawHud() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = C.text;
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score}`, 8, HUD_H / 2 + 1);
    ctx.textAlign = "center";
    ctx.fillText(`LEVEL ${level}`, W / 2, HUD_H / 2 + 1);
    ctx.fillStyle = C.frog;
    for (let i = 0; i < lives; i++) {
      ctx.beginPath();
      ctx.arc(W - 12 - i * 16, HUD_H / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Time bar along the bottom edge of the start row.
    const ratio = Math.max(0, timeLeftMs / timeLimitMs(level));
    ctx.fillStyle =
      ratio > 0.5 ? C.timeOk : ratio > 0.25 ? C.timeMid : C.timeLow;
    ctx.fillRect(0, H - TIME_BAR_H, W * ratio, TIME_BAR_H);
  }

  function draw() {
    drawBackground();
    drawGoals();
    drawLanes();
    drawFrog();
    drawHud();
  }

  // ── HUD reporting ───────────────────────────────────────────────────────────
  let lastSeconds = -1;

  function emitHud() {
    const seconds = Math.max(0, Math.ceil(timeLeftMs / 1000));
    if (
      lastHud &&
      lastHud.score === score &&
      lastHud.lives === lives &&
      lastHud.level === level &&
      lastSeconds === seconds
    )
      return;
    lastSeconds = seconds;
    lastHud = {
      score,
      lives,
      level,
      extras: [{ label: "TIME", value: `${seconds}s` }],
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
    pendingDir = null;
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

    const dir = KEY_DIRS[e.code];
    if (!dir) return;
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    if (state !== "playing" || e.repeat) return;
    pendingDir = dir; // one buffered hop; a newer press replaces it
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
