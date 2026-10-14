// Snake palettes. Neon equals the colors the engine drew before skins existed.

import type { Skin } from "../types";

export interface Palette {
  bg: string; // playfield, center of the radial gradient
  bg2: string; // playfield, outer edge; equals bg on flat skins
  grid: string;
  fruit: string; // fruit fallback circle and wall blocks
  fruitHighlight: string;
  fruitShade: string;
  body: string;
  head: string;
  headCrash: string; // head during a post-crash blink
  eye: string;
  glowFruit: string | null; // null: no shadowBlur
  glowSnake: string | null;
}

export const SKINS: Record<Skin, Palette> = {
  neon: {
    bg: "#0a0030",
    bg2: "#000000",
    grid: "rgba(0, 245, 255, 0.18)",
    fruit: "#ff006e",
    fruitHighlight: "rgba(255, 255, 255, 0.4)",
    fruitShade: "rgba(0, 0, 0, 0.28)",
    body: "#00ff88",
    head: "#b3ffd9",
    headCrash: "#ff006e",
    eye: "#0a0a0f",
    glowFruit: "#ff006e",
    glowSnake: "#00ff88",
  },
  // Nokia-style monochrome.
  classic: {
    bg: "#9ead86",
    bg2: "#9ead86",
    grid: "#8a9874",
    fruit: "#2b3320",
    fruitHighlight: "#9ead86",
    fruitShade: "#2b3320",
    body: "#2b3320",
    head: "#2b3320",
    headCrash: "#9ead86",
    eye: "#9ead86",
    glowFruit: null,
    glowSnake: null,
  },
  // Game Boy greens.
  retro: {
    bg: "#9bbc0f",
    bg2: "#9bbc0f",
    grid: "#8bac0f",
    fruit: "#0f380f",
    fruitHighlight: "#8bac0f",
    fruitShade: "#306230",
    body: "#306230",
    head: "#0f380f",
    headCrash: "#8bac0f",
    eye: "#9bbc0f",
    glowFruit: null,
    glowSnake: null,
  },
};
