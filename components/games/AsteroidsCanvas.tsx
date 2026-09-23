"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type Ref,
} from "react";
import {
  createAsteroids,
  type AsteroidsEngine,
  type AsteroidsHud,
} from "@/lib/games/asteroids/engine";

export interface AsteroidsHandle {
  pause(): void;
  resume(): void;
  end(): void;
  restart(): void;
}

interface AsteroidsCanvasProps {
  ref?: Ref<AsteroidsHandle>;
  onHud: (hud: AsteroidsHud) => void;
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
export default function AsteroidsCanvas({
  ref,
  onHud,
  onGameOver,
  onPauseChange,
}: AsteroidsCanvasProps) {
  const mode = useSyncExternalStore(
    subscribeInputMode,
    getInputMode,
    getServerInputMode,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);

  // Latest callbacks without recreating the engine when the parent re-renders.
  const handleHud = useEffectEvent((hud: AsteroidsHud) => onHud(hud));
  const handleGameOver = useEffectEvent((score: number) => onGameOver(score));
  const handlePauseChange = useEffectEvent((p: boolean) => onPauseChange(p));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (mode !== "keyboard" || !canvas) return;
    const engine = createAsteroids(canvas, {
      onHud: (hud) => handleHud(hud),
      onGameOver: (score) => handleGameOver(score),
      onPauseChange: (p) => handlePauseChange(p),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [mode]);

  useImperativeHandle(
    ref,
    () => ({
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      end: () => engineRef.current?.end(),
      restart: () => engineRef.current?.restart(),
    }),
    [],
  );

  if (mode === "pending") return null;
  if (mode === "touch") return <KeyboardRequired />;

  return (
    <canvas
      ref={canvasRef}
      className="asteroids-canvas"
      width={800}
      height={600}
      aria-label="Asteroids game. Arrow keys rotate and thrust, Space fires, P pauses."
    />
  );
}

function KeyboardRequired() {
  return (
    <div className="kbd-required" role="status">
      <div className="kbd-cluster" aria-hidden="true">
        <span className="kbd-key on kbd-up">↑</span>
        <span className="kbd-key on kbd-left">←</span>
        <span className="kbd-key kbd-down">↓</span>
        <span className="kbd-key on kbd-right">→</span>
        <span className="kbd-key on kbd-space">SPACE</span>
      </div>
      <div className="kbd-title pixel">KEYBOARD REQUIRED</div>
      <p className="kbd-text">
        Asteroids is played with the arrow keys and Space. Open this page on a
        computer to play.
      </p>
    </div>
  );
}
