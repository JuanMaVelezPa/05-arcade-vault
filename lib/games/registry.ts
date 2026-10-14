import { createArkanoid } from "./arkanoid/engine";
import { createAsteroids } from "./asteroids/engine";
import { createSnake } from "./snake/engine";
import { createTetris } from "./tetris/engine";
import type { CreateGame } from "./types";

export type PadDirection = "up" | "down" | "left" | "right";

export interface PadAction {
  code: "Space" | "ArrowUp"; // KeyboardEvent.code sent to the engine
  label: string; // caption under the button, e.g. "FIRE"
}

export interface TouchConfig {
  dpad: PadDirection[]; // enabled directions, the rest render dimmed
  a?: PadAction; // absent = dimmed and disabled
  b?: PadAction;
}

export interface GameEntry {
  create: CreateGame;
  width: number; // logical canvas resolution
  height: number;
  input: "keyboard" | "pointer"; // "keyboard" = no touch-drag steering
  ariaLabel: string; // canvas label, includes the controls
  touch: TouchConfig; // on-screen pad layout for touch-only devices
  levels?: number; // shows the pause-overlay level selector when set
  sound?: boolean; // shows the HUD mute toggle when true
  skins?: true; // shows the HUD skin button
}

// Real canvas games by catalog id. Ids with no entry keep the simulated arena.
export const GAME_REGISTRY: Record<string, GameEntry> = {
  asteroids: {
    create: createAsteroids,
    width: 800,
    height: 600,
    input: "keyboard",
    skins: true,
    ariaLabel:
      "Asteroids game. Arrow keys rotate and thrust, Space fires, P pauses.",
    touch: {
      dpad: ["left", "right"],
      a: { code: "Space", label: "FIRE" },
      b: { code: "ArrowUp", label: "THRUST" },
    },
  },
  tetris: {
    create: createTetris,
    width: 450,
    height: 600,
    input: "keyboard",
    skins: true,
    ariaLabel:
      "Tetris game. Left and right arrows move, Up or X rotates, Down soft drops, Space hard drops, P pauses.",
    touch: {
      dpad: ["left", "right", "down"],
      a: { code: "ArrowUp", label: "ROTATE" },
      b: { code: "Space", label: "DROP" },
    },
  },
  arkanoid: {
    create: createArkanoid,
    width: 800,
    height: 600,
    input: "pointer",
    levels: 5,
    sound: true,
    skins: true,
    ariaLabel:
      "Arkanoid game. Move the mouse, drag a finger, or use the left and right arrows to move the paddle. P pauses.",
    touch: { dpad: ["left", "right"] },
  },
  snake: {
    create: createSnake,
    width: 800,
    height: 600,
    input: "keyboard",
    levels: 5,
    skins: true,
    ariaLabel: "Snake game. Arrow keys or W, A, S, D turn the snake, P pauses.",
    touch: { dpad: ["up", "down", "left", "right"] },
  },
};
