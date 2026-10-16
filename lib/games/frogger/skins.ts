// Frogger palettes. Neon equals the colors the engine drew before skins existed.

import type { Skin } from "../types";

export interface Palette {
  road: string;
  roadLine: string;
  river: string;
  riverWave: string;
  safe: string; // the middle and start banks
  safeDot: string;
  goalBank: string;
  goalMouth: string;
  goalEdge: string;
  frog: string;
  frogDark: string; // legs
  eyeWhite: string;
  eyePupil: string;
  log: string;
  logLine: string;
  turtle: string;
  turtleShell: string;
  turtleDive: string; // ring left by a submerged turtle
  truck: string;
  truckCab: string;
  cars: [string, string, string];
  windscreen: string;
  wheel: string;
  hudStrip: string; // band behind the in-canvas HUD
  text: string;
  timeOk: string;
  timeMid: string;
  timeLow: string;
}

export const SKINS: Record<Skin, Palette> = {
  neon: {
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
    turtleDive: "rgba(31, 191, 106, 0.3)",
    truck: "#9aa4b8",
    truckCab: "#ff006e",
    cars: ["#ff3b3b", "#f5ff00", "#00f5ff"],
    windscreen: "rgba(0, 0, 0, 0.35)",
    wheel: "#0a0a0f",
    hudStrip: "rgba(0, 0, 0, 0.55)",
    text: "#e6e9ff",
    timeOk: "#00ff88",
    timeMid: "#f5ff00",
    timeLow: "#ff006e",
  },
  // Original arcade look: black road, blue river, purple banks, flat colors.
  classic: {
    road: "#000000",
    roadLine: "#ffffff",
    river: "#0000a8",
    riverWave: "#2121de",
    safe: "#7a1fa2",
    safeDot: "#9a3fc2",
    goalBank: "#00a800",
    goalMouth: "#000000",
    goalEdge: "#ffff00",
    frog: "#00e000",
    frogDark: "#008000",
    eyeWhite: "#ffffff",
    eyePupil: "#000000",
    log: "#a0522d",
    logLine: "#5c2e12",
    turtle: "#00c000",
    turtleShell: "#006000",
    turtleDive: "#00c000",
    truck: "#c8c8c8",
    truckCab: "#ff0000",
    cars: ["#ff0000", "#ffff00", "#ff7fd0"],
    windscreen: "#000000",
    wheel: "#000000",
    hudStrip: "#000000",
    text: "#ffffff",
    timeOk: "#00e000",
    timeMid: "#ffff00",
    timeLow: "#ff0000",
  },
  // Game Boy: only the four tones #0f380f, #306230, #8bac0f, #9bbc0f.
  retro: {
    road: "#0f380f",
    roadLine: "#306230",
    river: "#306230",
    riverWave: "#8bac0f",
    safe: "#306230",
    safeDot: "#8bac0f",
    goalBank: "#306230",
    goalMouth: "#0f380f",
    goalEdge: "#9bbc0f",
    frog: "#9bbc0f",
    frogDark: "#0f380f",
    eyeWhite: "#9bbc0f",
    eyePupil: "#0f380f",
    log: "#8bac0f",
    logLine: "#306230",
    turtle: "#9bbc0f",
    turtleShell: "#0f380f",
    turtleDive: "#8bac0f",
    truck: "#8bac0f",
    truckCab: "#9bbc0f",
    cars: ["#9bbc0f", "#8bac0f", "#9bbc0f"],
    windscreen: "#0f380f",
    wheel: "#0f380f",
    hudStrip: "#0f380f",
    text: "#9bbc0f",
    timeOk: "#9bbc0f",
    timeMid: "#8bac0f",
    timeLow: "#306230",
  },
};
