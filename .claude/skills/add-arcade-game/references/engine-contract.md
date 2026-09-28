# Engine contract and registry

Shared shapes every real game follows. The Asteroids engine
(`lib/games/asteroids/engine.ts`) is the reference implementation.

## `lib/games/types.ts`

```ts
export interface HudExtra {
  label: string; // short, uppercase, e.g. "3X", "LINES", "NEXT"
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
}

export type CreateGame = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
```

## `lib/games/registry.ts`

```ts
import { createAsteroids } from "./asteroids/engine";
import type { CreateGame } from "./types";

export interface GameEntry {
  create: CreateGame;
  width: number; // logical canvas resolution
  height: number;
  input: "keyboard" | "pointer"; // "keyboard" shows the touch-only notice
  ariaLabel: string; // canvas label, includes the controls
  controls: { keys: string[]; text: string }; // content of the notice
}

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
};
```

The registry is imported by client code only (`GamePlayer` is a client
component). If bundle size grows with many games, switch `create` to a lazy
`() => import("./<id>/engine")` loader.

## `components/games/GameCanvas.tsx`

Generalized from `AsteroidsCanvas.tsx`. Props: `entry: GameEntry`, `ref`, and the
three callbacks. It keeps:

- `useSyncExternalStore` input mode (`pending` on the server, `touch` when
  `(pointer: coarse)` and no `(any-pointer: fine)`, else `keyboard`);
- the touch-only notice when `entry.input === "keyboard"` and mode is `touch`;
- `useEffectEvent` wrappers so parent re-renders never recreate the engine;
- engine creation in `useEffect`, `destroy()` in the cleanup;
- a `useImperativeHandle` handle with `pause`, `resume`, `end`, `restart`;
- `<canvas className="game-canvas" width={entry.width} height={entry.height}>`.

The `.crt-screen` is 4:3. A game with another aspect ratio (Tetris is tall)
letterboxes inside it: set `object-fit: contain`-like sizing on `.game-canvas`
(`width/height: 100%` plus `aspect-ratio` and `margin: auto`), and keep the
canvas non-positioned so the scanline overlay paints on top.

## Porting checklist for `game.js`

- [ ] Wrap everything in `create<Name>(canvas, callbacks)`. Module scope holds only
      constants and pure helpers.
- [ ] Replace `document.getElementById("canvas")` and global `ctx` with the passed canvas.
- [ ] Replace `setInterval`/`setTimeout` game ticks with the rAF loop and `dt`
      (cap at 0.05 s). Tick-based games (Tetris gravity) accumulate `dt`.
- [ ] Register `keydown`, `keyup`, `blur`, and `visibilitychange` (and mouse
      listeners on the canvas if used). Remove each one in `destroy()`.
- [ ] Mouse input: convert client coordinates to logical coordinates with
      `canvas.getBoundingClientRect()` and the width/height scale.
- [ ] States: at least `playing | paused | gameover`. Keep `stateBeforePause`.
- [ ] Remove all HUD and overlay text drawing (score, lives, "GAME OVER",
      "PAUSED", "press space to restart"). React owns them.
- [ ] A win or completion screen in the reference ends the run with `onGameOver`.
- [ ] Remove the reference's own restart keys. PLAY AGAIN calls `restart()`.
- [ ] Emit HUD by comparing with the last emitted value. Round timers to 0.1 s.
- [ ] Sounds (only if the spec keeps them): `new Audio("/games/<id>/…")` created
      inside the closure, played only on user-initiated runs, muted when paused.
- [ ] Sprites: load `Image` inside the closure. Draw nothing until loaded.
- [ ] Neon restyle: colors from `app/globals.css` tokens, glow with
      `shadowBlur`, `save()`/`restore()` around every glow.
- [ ] Types: no `any`. ESLint must pass (the hook reports remaining errors).
