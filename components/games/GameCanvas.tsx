"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type Ref,
} from "react";
import type { ControlKey, GameEntry } from "@/lib/games/registry";
import type { GameEngine, GameHud } from "@/lib/games/types";

export interface GameHandle {
  pause(): void;
  resume(): void;
  end(): void;
  restart(): void;
  jumpToLevel?(level: number): void; // no-op when the engine has no levels
}

interface GameCanvasProps {
  entry: GameEntry;
  ref?: Ref<GameHandle>;
  onHud: (hud: GameHud) => void;
  onGameOver: (finalScore: number) => void;
  onPauseChange: (paused: boolean) => void;
}

// ── Input mode ────────────────────────────────────────────────────────────────
// "touch" = coarse primary pointer and no fine pointer anywhere (phones, tablets).
// "pending" is the server snapshot, so nothing game-related renders before hydration.
type InputMode = "keyboard" | "touch" | "pending";

const COARSE = "(pointer: coarse)";
const ANY_FINE = "(any-pointer: fine)";

function subscribeInputMode(onChange: () => void) {
  const queries = [window.matchMedia(COARSE), window.matchMedia(ANY_FINE)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () =>
    queries.forEach((q) => q.removeEventListener("change", onChange));
}

function getInputMode(): InputMode {
  const touchOnly =
    window.matchMedia(COARSE).matches && !window.matchMedia(ANY_FINE).matches;
  return touchOnly ? "touch" : "keyboard";
}

function getServerInputMode(): InputMode {
  return "pending";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GameCanvas({
  entry,
  ref,
  onHud,
  onGameOver,
  onPauseChange,
}: GameCanvasProps) {
  const mode = useSyncExternalStore(
    subscribeInputMode,
    getInputMode,
    getServerInputMode,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { create } = entry;
  const needsKeyboard = entry.input === "keyboard";
  const blocked = needsKeyboard && mode === "touch";

  // Latest callbacks without recreating the engine when the parent re-renders.
  const handleHud = useEffectEvent((hud: GameHud) => onHud(hud));
  const handleGameOver = useEffectEvent((score: number) => onGameOver(score));
  const handlePauseChange = useEffectEvent((p: boolean) => onPauseChange(p));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (mode === "pending" || blocked || !canvas) return;
    const engine = create(canvas, {
      onHud: (hud) => handleHud(hud),
      onGameOver: (score) => handleGameOver(score),
      onPauseChange: (p) => handlePauseChange(p),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [mode, blocked, create]);

  useImperativeHandle(
    ref,
    () => ({
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      end: () => engineRef.current?.end(),
      restart: () => engineRef.current?.restart(),
      jumpToLevel: (level: number) => engineRef.current?.jumpToLevel?.(level),
    }),
    [],
  );

  if (mode === "pending") return null;
  if (blocked) return <KeyboardRequired controls={entry.controls} />;

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={entry.width}
      height={entry.height}
      aria-label={entry.ariaLabel}
      // Pointer games: a touch drag steers the game instead of scrolling the page.
      style={needsKeyboard ? undefined : { touchAction: "none" }}
    />
  );
}

const CLUSTER: { key: ControlKey; className: string }[] = [
  { key: "↑", className: "kbd-up" },
  { key: "←", className: "kbd-left" },
  { key: "↓", className: "kbd-down" },
  { key: "→", className: "kbd-right" },
  { key: "SPACE", className: "kbd-space" },
];

function KeyboardRequired({ controls }: { controls: GameEntry["controls"] }) {
  return (
    <div className="kbd-required" role="status">
      <div className="kbd-cluster" aria-hidden="true">
        {CLUSTER.map(({ key, className }) => (
          <span
            key={key}
            className={`kbd-key ${controls.keys.includes(key) ? "on " : ""}${className}`}
          >
            {key}
          </span>
        ))}
      </div>
      <div className="kbd-title pixel">KEYBOARD REQUIRED</div>
      <p className="kbd-text">{controls.text}</p>
    </div>
  );
}
