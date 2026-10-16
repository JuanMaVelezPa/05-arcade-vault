// Frogger constants and local types (specs/game-jam/frogger/01-frogger-core.md).
// Positions are in grid cells; the engine converts to pixels when drawing.

// ── Grid ──────────────────────────────────────────────────────────────────────
export const COLS = 16;
export const ROWS = 14;
export const CELL = 40; // px
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 560

// Zones (row index, 0 = top)
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;

// ── Rules ─────────────────────────────────────────────────────────────────────
export const START_LIVES = 3;
export const START_COL = COLS / 2; // frog spawn column
export const HOP_MS = 120; // jump animation
export const BASE_TIME_MS = 15_000; // round timer at level 1
export const MIN_TIME_MS = 8_000; // timer floor at high levels
export const TIME_STEP_MS = 1_000; // timer lost per level
export const BASE_SPEED = 0.6; // level 1 runs at 60 % of the lane speeds
export const SPEED_STEP = 0.15; // +15 % entity speed per level
export const TURTLE_VISIBLE_MS = 3_000;
export const TURTLE_SUBMERGED_MS = 1_500;
export const MAX_DT = 50; // ms
export const MAX_SCORE = 10_000_000; // DB CHECK on scores.score

// Goal slots: 5 mouths of 2 columns each on row 0.
export const GOAL_COUNT = 5;
export const GOAL_WIDTH = 2;
export const GOAL_COLS: readonly number[] = [1, 4, 7, 10, 13]; // left column of each mouth

// Scoring
export const POINTS_ROW = 10; // new highest row reached this life
export const POINTS_GOAL = 50;
export const POINTS_ROUND = 200;
export const POINTS_TIME = 10; // per second left, on reaching a goal

// ── Types ─────────────────────────────────────────────────────────────────────
export type Direction = "up" | "down" | "left" | "right";

export type EntityType = "car" | "truck" | "log" | "turtle";

export interface Entity {
  col: number; // left edge, in cells (fractional while moving)
  width: number; // in cells
  type: EntityType;
  submerged?: boolean; // turtles only
  phase?: number; // turtles only: ms offset into the dive cycle
}

export interface Lane {
  row: number;
  speed: number; // cells per second
  dir: 1 | -1;
  entities: Entity[];
  period: number; // ring length in cells (>= COLS + widest entity); entities wrap by it
}

export interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms into the current hop
  targetCol: number;
  targetRow: number;
}
