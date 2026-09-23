"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AsteroidsCanvas, { type AsteroidsHandle } from "@/components/games/AsteroidsCanvas";
import type { AsteroidsHud } from "@/lib/games/asteroids/engine";
import { saveScore } from "@/lib/scores";
import type { Game } from "@/lib/types";

interface GamePlayerProps {
  game: Game;
}

export default function GamePlayer({ game }: GamePlayerProps) {
  const router = useRouter();
  // The only real game so far; every other id keeps the simulated arena.
  const isAsteroids = game.id === "rocas";
  const asteroidsRef = useRef<AsteroidsHandle>(null);
  // Simulated games: running score, so the interval can bump the level without an effect on `score`.
  const simScoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("GUEST");
  const [saved, setSaved] = useState(false);
  const [tripleShot, setTripleShot] = useState(0);

  useEffect(() => {
    if (isAsteroids || over || paused) return;
    const t = setInterval(() => {
      const next = simScoreRef.current + Math.floor(10 + Math.random() * 90);
      simScoreRef.current = next;
      setScore(next);
      if (next % 2500 < 100) setLevel((l) => l + 1);
    }, 220);
    return () => clearInterval(t);
  }, [isAsteroids, over, paused]);

  // Asteroids: the engine owns pause and game over; React mirrors it via callbacks.
  const handleHud = (hud: AsteroidsHud) => {
    setScore(hud.score);
    setLives(hud.lives);
    setLevel(hud.level);
    setTripleShot(hud.tripleShot);
  };
  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  };

  const togglePause = () => {
    if (!isAsteroids) return setPaused((p) => !p);
    if (paused) asteroidsRef.current?.resume();
    else asteroidsRef.current?.pause();
  };
  const endGame = () => {
    if (isAsteroids) asteroidsRef.current?.end();
    else setOver(true);
  };
  const restart = () => {
    simScoreRef.current = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setTripleShot(0);
    if (isAsteroids) asteroidsRef.current?.restart();
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
          {isAsteroids && tripleShot > 0 && (
            <div className="hud-stat">
              <div className="l">3X</div>
              <div className="v">{tripleShot.toFixed(1)}s</div>
            </div>
          )}
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
          {isAsteroids ? (
            <AsteroidsCanvas
              ref={asteroidsRef}
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
                  {isAsteroids ? "PRESS P OR RESUME TO CONTINUE" : "PRESS RESUME TO CONTINUE"}
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
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="YOUR INITIALS"
                />
                <button
                  type="button"
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score, name });
                    setSaved(true);
                  }}
                >
                  SAVE SCORE
                </button>
              </div>
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
