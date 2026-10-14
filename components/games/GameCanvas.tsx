"use client";

import { createPortal } from "react-dom";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type Ref,
} from "react";
import type { GameEntry } from "@/lib/games/registry";
import TouchPad from "@/components/games/TouchPad";
import type { GameEngine, GameHud, Skin } from "@/lib/games/types";

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
  muted: boolean;
  skin: Skin;
  padSlot: HTMLElement | null; // where the touch pad is portaled, below the CRT
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
  muted,
  skin,
  padSlot,
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

  // Latest callbacks without recreating the engine when the parent re-renders.
  const handleHud = useEffectEvent((hud: GameHud) => onHud(hud));
  const handleGameOver = useEffectEvent((score: number) => onGameOver(score));
  const handlePauseChange = useEffectEvent((p: boolean) => onPauseChange(p));
  const getMuted = useEffectEvent(() => muted);
  const getSkin = useEffectEvent(() => skin);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (mode === "pending" || !canvas) return;
    const engine = create(canvas, {
      onHud: (hud) => handleHud(hud),
      onGameOver: (score) => handleGameOver(score),
      onPauseChange: (p) => handlePauseChange(p),
    });
    // Every new engine starts with the current preference, not only on changes.
    engine.setMuted?.(getMuted());
    engine.setSkin?.(getSkin());
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [mode, create]);

  useEffect(() => {
    engineRef.current?.setMuted?.(muted);
  }, [muted]);

  useEffect(() => {
    engineRef.current?.setSkin?.(skin);
  }, [skin]);

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

  return (
    <>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={entry.width}
        height={entry.height}
        aria-label={entry.ariaLabel}
        // Pointer games: a touch drag steers the game instead of scrolling the page.
        style={needsKeyboard ? undefined : { touchAction: "none" }}
      />
      {mode === "touch" &&
        padSlot &&
        createPortal(<TouchPad config={entry.touch} />, padSlot)}
    </>
  );
}
