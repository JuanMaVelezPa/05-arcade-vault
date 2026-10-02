// Tetris palettes. Neon equals the colors the engine drew before skins existed.

import type { Skin } from "../types";

export interface Palette {
  bg: string; // playfield, center of the radial gradient
  bg2: string; // playfield, outer edge; equals bg on flat skins
  // Piece colors by piece index 1–8: I, O, T, S, Z, J, L, N (nut). Index 0 is empty.
  pieces: readonly string[];
  cellHighlight: string;
  cellShade: string;
  grid: string;
  frame: string; // board edge, next-piece frame
  glow: boolean; // cells use shadowBlur
  frameGlow: string | null; // null: no shadowBlur on the frame
}

export const SKINS: Record<Skin, Palette> = {
  neon: {
    bg: "#0a0030",
    bg2: "#000000",
    pieces: [
      "",
      "#00f5ff",
      "#f5ff00",
      "#ff006e",
      "#00ff88",
      "#d97a3a",
      "#c7d0e0",
      "#ffcf3a",
      "#8a8fb5",
    ],
    cellHighlight: "rgba(255, 255, 255, 0.35)",
    cellShade: "rgba(0, 0, 0, 0.28)",
    grid: "rgba(0, 245, 255, 0.18)",
    frame: "rgba(0, 245, 255, 0.55)",
    glow: true,
    frameGlow: "#00f5ff",
  },
  // NES-style.
  classic: {
    bg: "#000000",
    bg2: "#000000",
    pieces: [
      "",
      "#00e0e8",
      "#f8d800",
      "#b800d8",
      "#00b800",
      "#e83800",
      "#0058f8",
      "#f89800",
      "#7c7c7c",
    ],
    cellHighlight: "rgba(255, 255, 255, 0.35)",
    cellShade: "rgba(0, 0, 0, 0.28)",
    grid: "#303030",
    frame: "#bcbcbc",
    glow: false,
    frameGlow: null,
  },
  // Game Boy greens: alternating tones, so piece color identity is lost.
  retro: {
    bg: "#9bbc0f",
    bg2: "#9bbc0f",
    pieces: [
      "",
      "#0f380f",
      "#306230",
      "#0f380f",
      "#306230",
      "#0f380f",
      "#306230",
      "#0f380f",
      "#8bac0f",
    ],
    cellHighlight: "#8bac0f",
    cellShade: "#306230",
    grid: "#8bac0f",
    frame: "#0f380f",
    glow: false,
    frameGlow: null,
  },
};
