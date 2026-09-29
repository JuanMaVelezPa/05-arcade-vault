// Shared contract between framework-free canvas engines and the React shell.

export interface HudExtra {
  label: string; // short, uppercase, e.g. "3X", "LINES"
  value: string; // already formatted, e.g. "4.2s", "12"
}

export interface GameHud {
  score: number; // integer, 0..10_000_000
  lives: number; // games without lives send 0; the HUD then shows "—"
  level: number;
  extras?: HudExtra[]; // extra HUD stats, shown only while present
}

export interface GameCallbacks {
  onHud: (hud: GameHud) => void; // only when a value changes
  onGameOver: (finalScore: number) => void; // final loss, completion, or end()
  onPauseChange: (paused: boolean) => void; // P/Escape, hidden tab, blur
}

export interface GameEngine {
  pause(): void;
  resume(): void;
  end(): void; // stops the run and fires onGameOver with the current score
  restart(): void; // fresh run: score 0, starting lives, level 1
  destroy(): void; // cancels rAF and removes all listeners
  jumpToLevel?(level: number): void; // 1-based; keeps score and lives, resumes
  setMuted?(muted: boolean): void; // true stops live sounds and blocks new ones
}

export type CreateGame = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
