// Arkanoid palettes. Neon equals the colors the engine drew before skins existed.

import type { Skin } from "../types";

export type BrickColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export interface Palette {
  bg: string; // playfield, center of the radial gradient
  bg2: string; // playfield, outer edge; equals bg on flat skins
  bricks: Record<BrickColor, string>;
  brickHighlight: string;
  brickShade: string;
  paddleBody: string;
  paddleAccent: string; // end caps
  paddleSheen: string;
  ball: string;
  glow: boolean; // bricks, break outline and paddle use shadowBlur
  ballGlow: string | null; // null: no shadowBlur on the ball
}

export const SKINS: Record<Skin, Palette> = {
  neon: {
    bg: "#0a0030",
    bg2: "#000000",
    bricks: {
      red: "#d97a3a",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#ff006e",
      hotpink: "#c7d0e0",
      green: "#00ff88",
      gray: "#8a8fb5",
    },
    brickHighlight: "rgba(255, 255, 255, 0.4)",
    brickShade: "rgba(0, 0, 0, 0.28)",
    paddleBody: "#00f5ff",
    paddleAccent: "#ff006e",
    paddleSheen: "rgba(255, 255, 255, 0.45)",
    ball: "#e6e9ff",
    glow: true,
    ballGlow: "#00f5ff",
  },
  // 1986 arcade.
  classic: {
    bg: "#000000",
    bg2: "#000000",
    bricks: {
      red: "#e83800",
      yellow: "#f8d800",
      cyan: "#00b8f8",
      magenta: "#f878f8",
      hotpink: "#bcbcbc",
      green: "#00b800",
      gray: "#7c7c7c",
    },
    brickHighlight: "rgba(255, 255, 255, 0.4)",
    brickShade: "rgba(0, 0, 0, 0.28)",
    paddleBody: "#bcbcbc",
    paddleAccent: "#e83800",
    paddleSheen: "rgba(255, 255, 255, 0.45)",
    ball: "#ffffff",
    glow: false,
    ballGlow: null,
  },
  // Game Boy greens: alternating tones, so brick color identity is lost.
  retro: {
    bg: "#9bbc0f",
    bg2: "#9bbc0f",
    bricks: {
      red: "#0f380f",
      yellow: "#306230",
      cyan: "#306230",
      magenta: "#0f380f",
      hotpink: "#8bac0f",
      green: "#306230",
      gray: "#0f380f",
    },
    brickHighlight: "#8bac0f",
    brickShade: "#306230",
    paddleBody: "#0f380f",
    paddleAccent: "#306230",
    paddleSheen: "#8bac0f",
    ball: "#0f380f",
    glow: false,
    ballGlow: null,
  },
};
