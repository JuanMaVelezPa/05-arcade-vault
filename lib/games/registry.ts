import { createAsteroids } from "./asteroids/engine";
import { createTetris } from "./tetris/engine";
import type { CreateGame } from "./types";

export type ControlKey = "←" | "→" | "↑" | "↓" | "SPACE";

export interface GameEntry {
  create: CreateGame;
  width: number; // logical canvas resolution
  height: number;
  input: "keyboard" | "pointer"; // "keyboard" shows the touch-only notice
  ariaLabel: string; // canvas label, includes the controls
  controls: { keys: ControlKey[]; text: string }; // content of the notice
  levels?: number; // shows the pause-overlay level selector when set
}

// Real canvas games by catalog id. Ids with no entry keep the simulated arena.
export const GAME_REGISTRY: Record<string, GameEntry> = {
  asteroids: {
    create: createAsteroids,
    width: 800,
    height: 600,
    input: "keyboard",
    ariaLabel:
      "Asteroids game. Arrow keys rotate and thrust, Space fires, P pauses.",
    controls: {
      keys: ["←", "→", "↑", "SPACE"],
      text: "Asteroids is played with the arrow keys and Space. Open this page on a computer to play.",
    },
  },
  tetris: {
    create: createTetris,
    width: 450,
    height: 600,
    input: "keyboard",
    ariaLabel:
      "Tetris game. Left and right arrows move, Up or X rotates, Down soft drops, Space hard drops, P pauses.",
    controls: {
      keys: ["←", "→", "↑", "↓", "SPACE"],
      text: "Tetris is played with the arrow keys and Space. Open this page on a computer to play.",
    },
  },
};
