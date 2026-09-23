import type { Game, ScoreRow } from "./types";

export const GAMES: Game[] = [
  {
    id: "bloque-buster",
    title: "BLOCK BUSTER",
    short: "Bounce the ball and smash walls of neon.",
    long: "Pilot a paddle-ship and bounce a plasma core to pulverize walls of chromatic blocks. Each level rearranges the grid into impossible patterns. How far will your streak go?",
    category: "ARCADE",
    cover: "cover-bricks",
    color: "cyan",
    best: 28450,
    plays: "12.4K",
  },
  {
    id: "caida",
    title: "DROP",
    short: "Fit the pieces before the ceiling crushes you.",
    long: "Geometric pieces fall from the darkness. Rotate them, lock them in, and clear lines to survive. The speed ramps up mercilessly every 10 lines.",
    category: "PUZZLE",
    cover: "cover-tetro",
    color: "magenta",
    best: 184220,
    plays: "31.8K",
  },
  {
    id: "serpentina",
    title: "SERPENTINE",
    short: "Grow without biting your own tail.",
    long: "A serpent of light roams the grid hunting for magenta cores. Every bite makes it longer and faster. One wrong move and it devours itself.",
    category: "ARCADE",
    cover: "cover-snake",
    color: "green",
    best: 7820,
    plays: "9.1K",
  },
  {
    id: "gloton",
    title: "GLUTTON",
    short: "Devour dots and escape the ghosts.",
    long: "A gluttonous circle patrols a maze collecting glowing dots. Four specters chase it, but every so often a pill appears that reverses the roles.",
    category: "ARCADE",
    cover: "cover-glot",
    color: "yellow",
    best: 96400,
    plays: "27.2K",
  },
  {
    id: "invasores",
    title: "INVADERS",
    short: "Defend the planet from alien rows.",
    long: "Waves of hostile pixels descend formation after formation. Move your cannon horizontally and open fire with precision before they reach the surface.",
    category: "SHOOTER",
    cover: "cover-invaders",
    color: "green",
    best: 54190,
    plays: "18.0K",
  },
  {
    id: "rocas",
    title: "ASTEROIDS",
    short: "Blast asteroids into dust in zero gravity.",
    long: "Your triangular ship drifts through the void. Rotate, thrust, and fire to split asteroids into ever-smaller fragments. Grab the triple-shot power-up to clear the field faster.",
    category: "SHOOTER",
    cover: "cover-rocas",
    color: "yellow",
    best: 41200,
    plays: "15.6K",
  },
  {
    id: "ranaria",
    title: "FROG CROSSING",
    short: "Cross the pixel highway.",
    long: "Hop between lanes of speeding cars and drifting logs on the river. Reach the lily pads before time runs out.",
    category: "ARCADE",
    cover: "cover-rana",
    color: "green",
    best: 18900,
    plays: "6.4K",
  },
  {
    id: "duelo-pixel",
    title: "PIXEL DUEL",
    short: "Two paddles. One ball. Maximum reflexes.",
    long: "The purest duel: two vertical paddles face off to bounce a glowing ball. Solo mode against the CPU or local two-player play.",
    category: "VERSUS",
    cover: "cover-duelo",
    color: "cyan",
    best: 24,
    plays: "4.2K",
  },
];

export const CATEGORIES: string[] = ["ALL", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

export const PLAYERS: string[] = [
  "PX_KAI", "NEONFOX", "Z3R0COOL", "M00NRYU", "VAULT_07", "GLITCHA",
  "ATARI_KID", "CYBER_LU", "MAGENTA88", "SCANLINE", "BIT_LORD", "ARKADYA",
  "DROID_X", "RGB_QUEEN", "PIXEL_DAD", "RETROVIRA", "VECTORX", "JOY_STK",
];

export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);
    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({ rank: i + 1, name, score: Math.max(score, 1000), date: `${day}/${mon}/2026` });
  }
  return rows.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}
