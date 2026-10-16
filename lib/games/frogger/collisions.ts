// Pure collision and support checks for Frogger. Positions are in cells; the
// frog occupies [col, col + 1) and is tested a little smaller than its cell.

import {
  GOAL_COLS,
  GOAL_WIDTH,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  type Entity,
  type Frog,
  type Lane,
} from "./constants";

type Pos = Pick<Frog, "col" | "row">;

const FROG_INSET = 0.15; // a graze on the edge of a vehicle does not kill

export function isRoadRow(row: number): boolean {
  return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
}

export function isRiverRow(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}

// True when a car or truck in the frog's road lane overlaps the frog.
export function checkRoadCollision(frog: Pos, lanes: Lane[]): boolean {
  if (!isRoadRow(frog.row)) return false;
  const left = frog.col + FROG_INSET;
  const right = frog.col + 1 - FROG_INSET;
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    for (const e of lane.entities)
      if (left < e.col + e.width && right > e.col) return true;
  }
  return false;
}

export interface Support {
  lane: Lane;
  entity: Entity;
}

// The log or visible turtle group under the frog's center, or null in the water.
export function getSupport(frog: Pos, lanes: Lane[]): Support | null {
  if (!isRiverRow(frog.row)) return null;
  const center = frog.col + 0.5;
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    for (const entity of lane.entities) {
      if (entity.type === "turtle" && entity.submerged) continue;
      if (center >= entity.col && center < entity.col + entity.width)
        return { lane, entity };
    }
  }
  return null;
}

export type GoalResult =
  | { kind: "none" } // not on the goal row
  | { kind: "miss" } // on the goal row but not in a mouth: the bank is lethal
  | { kind: "taken"; index: number } // mouth already occupied
  | { kind: "free"; index: number };

// Which mouth, if any, the frog reached. Does not change `goals`.
export function checkGoal(frog: Pos, goals: boolean[]): GoalResult {
  if (frog.row !== ROW_GOALS) return { kind: "none" };
  const col = Math.round(frog.col);
  const index = GOAL_COLS.findIndex((c) => col >= c && col < c + GOAL_WIDTH);
  if (index === -1) return { kind: "miss" };
  return goals[index] ? { kind: "taken", index } : { kind: "free", index };
}
