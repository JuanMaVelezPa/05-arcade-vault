"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitScore } from "@/app/actions/scores";
import GameCanvas, { type GameHandle } from "@/components/games/GameCanvas";
import { GAME_REGISTRY, type GameEntry } from "@/lib/games/registry";
import type { GameHud, HudExtra } from "@/lib/games/types";
import type { Game } from "@/lib/types";

interface GamePlayerProps {
  game: Game;
}

export default function GamePlayer({ game }: GamePlayerProps) {
  const router = useRouter();
  // Real canvas games come from the registry; every other id keeps the simulated arena.
  const entry: GameEntry | undefined = Object.hasOwn(GAME_REGISTRY, game.id) ? GAME_REGISTRY[game.id] : undefined;
  const isReal = entry !== undefined;
  const gameRef = useRef<GameHandle>(null);
  // Simulated games: running score, so the interval can bump the level without an effect on `score`.
  const simScoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("GUEST");
  const [saved, setSaved] = useState(false);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [extras, setExtras] = useState<HudExtra[]>([]);

  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(() => {
      const next = simScoreRef.current + Math.floor(10 + Math.random() * 90);
      simScoreRef.current = next;
      setScore(next);
      if (next % 2500 < 100) setLevel((l) => l + 1);
    }, 220);
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  // Real games: the engine owns pause and game over; React mirrors it via callbacks.
  const handleHud = (hud: GameHud) => {
    setScore(hud.score);
    setLives(hud.lives);
    setLevel(hud.level);
    setExtras(hud.extras ?? []);
  };
  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  };

  const togglePause = () => {
    if (!isReal) return setPaused((p) => !p);
    if (paused) gameRef.current?.resume();
    else gameRef.current?.pause();
  };
  const endGame = () => {
    if (isReal) gameRef.current?.end();
    else setOver(true);
  };
  const save = () =>
    startSaving(async () => {
      try {
        const result = await submitScore({ gameId: game.id, playerName: name, score });
        if (result.ok) {
          setSaveError(null);
          setSaved(true);
        } else {
          setSaveError(result.error);
        }
      } catch {
        // Network failure reaching the action; keep it inline instead of hitting the error boundary
        setSaveError("SAVE FAILED — TRY AGAIN");
      }
    });
  const restart = () => {
    simScoreRef.current = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
    setExtras([]);
    if (isReal) gameRef.current?.restart();
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Player</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Score</div>
            <div className="v">{score.toLocaleString("en-US")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Lives</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Level</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          {extras.map((x) => (
            <div key={x.label} className="hud-stat">
              <div className="l">{x.label}</div>
              <div className="v">{x.value}</div>
            </div>
          ))}
        </div>
        <div className="hud-actions">
          <button type="button" className="btn yellow" onClick={togglePause}>
            {paused ? "RESUME" : "PAUSE"}
          </button>
          <button type="button" className="btn magenta" onClick={endGame}>
            END
          </button>
          <button type="button" className="btn ghost" onClick={() => router.push(`/game/${game.id}`)}>
            EXIT
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {entry ? (
            <GameCanvas
              entry={entry}
              ref={gameRef}
              onHud={handleHud}
              onGameOver={handleGameOver}
              onPauseChange={setPaused}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  PAUSED
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>
                  {isReal ? "PRESS P OR RESUME TO CONTINUE" : "PRESS RESUME TO CONTINUE"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SIGNAL OK</span>
          <span>
            {game.title} · CRT-83 · 60 HZ
          </span>
          <span>LOAD · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>GAME OVER</h2>
            <div className="final-label">FINAL SCORE</div>
            <div className="final">{score.toLocaleString("en-US")}</div>
            {!saved ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="YOUR INITIALS"
                    aria-label="Your initials"
                    aria-describedby={saveError ? "save-error" : undefined}
                  />
                  <button type="button" className="btn yellow" onClick={save} disabled={saving}>
                    {saving ? "SAVING…" : saveError ? "RETRY" : "SAVE SCORE"}
                  </button>
                </div>
                {saveError && (
                  <div id="save-error" className="save-error" role="alert">
                    {saveError}
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ SCORE SAVED_</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                PLAY AGAIN
              </button>
              <Link href="/" className="btn magenta">
                BACK TO VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
