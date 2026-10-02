// Asteroids palettes. Neon equals the colors the engine drew before skins existed.

import type { Skin } from "../types";

export interface Palette {
  bg: string; // playfield, center of the radial gradient
  bg2: string; // playfield, outer edge; equals bg on flat skins
  ship: string; // outline
  shipInvincible: string; // outline while the spawn shield blinks
  shipExplosion: string;
  bullet: string; // glow color of the bullet dot
  white: string; // bullet dot fill
  powerUp: string; // triple-shot pickup
  flame: string; // thrust flame stroke
  flameGlow: string | null; // null: the flame uses no glow
  asteroidA: string; // sizes 1 and 3
  asteroidB: string; // size 2
  glow: boolean; // every shadowBlur in the engine
}

export const SKINS: Record<Skin, Palette> = {
  neon: {
    bg: "#0a0030",
    bg2: "#000000",
    ship: "#00f5ff",
    shipInvincible: "#00f5ff",
    shipExplosion: "#00f5ff",
    bullet: "#00f5ff",
    white: "#ffffff",
    powerUp: "#00f5ff",
    flame: "rgba(255, 140, 0, 0.9)",
    flameGlow: "#ff8c00",
    asteroidA: "#ff006e",
    asteroidB: "#f5ff00",
    glow: true,
  },
  classic: {
    bg: "#000000",
    bg2: "#000000",
    ship: "#ffffff",
    shipInvincible: "#ffffff",
    shipExplosion: "#ffffff",
    bullet: "#ffffff",
    white: "#ffffff",
    powerUp: "#ffffff",
    flame: "#ffffff",
    flameGlow: null,
    asteroidA: "#ffffff",
    asteroidB: "#ffffff",
    glow: false,
  },
  // Amber monochrome CRT.
  retro: {
    bg: "#1a0f00",
    bg2: "#1a0f00",
    ship: "#ffb000",
    shipInvincible: "#c27c00",
    shipExplosion: "#ffb000",
    bullet: "#ffb000",
    white: "#ffb000",
    powerUp: "#ffb000",
    flame: "#c27c00",
    flameGlow: null,
    asteroidA: "#c27c00",
    asteroidB: "#ffb000",
    glow: false,
  },
};
