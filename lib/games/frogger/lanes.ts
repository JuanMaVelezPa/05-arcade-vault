// Lane layout for Frogger. Each lane is a ring of `period` cells; entities keep
// their spacing and wrap from one edge to the other (see the engine's update).

import {
  COLS,
  SPEED_STEP,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
  type Entity,
  type EntityType,
  type Lane,
} from "./constants";

// One entry of a lane pattern: an entity and the empty cells that follow it.
type Slot = readonly [type: EntityType, width: number, gap: number];

interface LaneSpec {
  row: number;
  dir: 1 | -1;
  speed: number; // cells per second at level 1
  slots: readonly Slot[];
}

// Rows 8–12 (top to bottom). Gaps are at least 3 cells, so every lane is crossable.
const ROAD: readonly LaneSpec[] = [
  {
    row: 8,
    dir: 1,
    speed: 2.8,
    slots: [
      ["truck", 2, 6],
      ["car", 1, 5],
      ["truck", 2, 4],
    ],
  },
  {
    row: 9,
    dir: -1,
    speed: 1.9,
    slots: [
      ["car", 1, 3],
      ["car", 1, 3],
      ["car", 1, 3],
      ["car", 1, 3],
      ["car", 1, 3],
    ],
  },
  {
    row: 10,
    dir: 1,
    speed: 3.2,
    slots: [
      ["car", 1, 5],
      ["car", 1, 5],
      ["car", 1, 7],
    ],
  },
  {
    row: 11,
    dir: -1,
    speed: 2.4,
    slots: [
      ["truck", 3, 6],
      ["truck", 3, 8],
    ],
  },
  {
    row: 12,
    dir: 1,
    speed: 1.6,
    slots: [
      ["car", 1, 4],
      ["car", 1, 4],
      ["car", 1, 4],
      ["car", 1, 4],
    ],
  },
];

// Rows 1–6 (top to bottom). Gaps are 2–4 cells, so the frog can hop between rafts.
const RIVER: readonly LaneSpec[] = [
  {
    row: 1,
    dir: 1,
    speed: 2.0,
    slots: [
      ["log", 3, 4],
      ["log", 2, 3],
      ["log", 3, 4],
      ["log", 2, 4],
    ],
  },
  {
    row: 2,
    dir: -1,
    speed: 1.4,
    slots: [
      ["log", 4, 3],
      ["log", 3, 4],
      ["log", 4, 3],
    ],
  },
  {
    row: 3,
    dir: 1,
    speed: 2.2,
    slots: [
      ["turtle", 2, 3],
      ["turtle", 2, 3],
      ["turtle", 2, 3],
      ["turtle", 2, 3],
    ],
  },
  {
    row: 4,
    dir: -1,
    speed: 1.5,
    slots: [
      ["log", 2, 3],
      ["log", 2, 3],
      ["log", 2, 3],
      ["log", 2, 3],
    ],
  },
  {
    row: 5,
    dir: 1,
    speed: 1.8,
    slots: [
      ["log", 4, 3],
      ["log", 4, 3],
      ["log", 4, 3],
    ],
  },
  {
    row: 6,
    dir: -1,
    speed: 1.2,
    slots: [
      ["turtle", 3, 2],
      ["turtle", 3, 2],
      ["turtle", 3, 2],
      ["turtle", 3, 2],
    ],
  },
];

export function speedFactor(level: number): number {
  return 1 + SPEED_STEP * (level - 1);
}

function buildLane(spec: LaneSpec, level: number): Lane {
  const entities: Entity[] = [];
  let at = (spec.row * 1.7) % 4; // stagger lanes so they do not line up
  for (const [type, width, gap] of spec.slots) {
    const entity: Entity = { col: at, width, type };
    if (type === "turtle") {
      // Spread the groups over the cycle so they do not dive together.
      entity.phase = entities.length * 1_100;
      entity.submerged = false;
    }
    entities.push(entity);
    at += width + gap;
  }
  const span = spec.slots.reduce((sum, [, w, g]) => sum + w + g, 0);
  // Wrapping at COLS needs room for the widest entity to re-enter off screen.
  const widest = Math.max(...spec.slots.map(([, w]) => w));
  return {
    row: spec.row,
    dir: spec.dir,
    speed: spec.speed * speedFactor(level),
    entities,
    period: Math.max(span, COLS + widest),
  };
}

export function buildLanes(level: number): Lane[] {
  return [...RIVER, ...ROAD].map((spec) => buildLane(spec, level));
}

// A turtle is submerged for the last TURTLE_SUBMERGED_MS of each cycle.
export function isSubmerged(entity: Entity, elapsedMs: number): boolean {
  const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
  return (elapsedMs + (entity.phase ?? 0)) % cycle >= TURTLE_VISIBLE_MS;
}
