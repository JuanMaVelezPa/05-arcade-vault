"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { submitScore } from "@/app/actions/scores";
import GameCanvas, { type GameHandle } from "@/components/games/GameCanvas";
import { GAME_REGISTRY, type GameEntry } from "@/lib/games/registry";
import type { GameHud, HudExtra } from "@/lib/games/types";
import { useMuted } from "@/lib/sound-pref";
import { useSkin } from "@/lib/skin-pref";
import type { Skin } from "@/lib/games/types";
import type { Game } from "@/lib/types";

interface GamePlayerProps {
  game: Game;
  username?: string | null; // from getCurrentUser(); null/undefined = signed out
}

const SKIN_ORDER: readonly Skin[] = ["neon", "classic", "retro"];
const nextSkin = (s: Skin): Skin =>
  SKIN_ORDER[(SKIN_ORDER.indexOf(s) + 1) % SKIN_ORDER.length];

export default function GamePlayer({ game, username }: GamePlayerProps) {
  const router = useRouter();
  // Real canvas games come from the registry; every other id keeps the simulated arena.
  const entry: GameEntry | undefined = Object.hasOwn(GAME_REGISTRY, game.id)
    ? GAME_REGISTRY[game.id]
    : undefined;
  const isReal = entry !== undefined;
  const gameRef = useRef<GameHandle>(null);
  // Simulated games: running score, so the interval can bump the level without an effect on `score`.
  const simScoreRef = useRef(0);
  const [padSlot, setPadSlot] = useState<HTMLDivElement | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [extras, setExtras] = useState<HudExtra[]>([]);
  // Global, per-device preference; the toggle and M key only exist for games with sound.
  const [muted, setMuted] = useMuted();
  const [skin, setSkin] = useSkin();
  const hasSound = entry?.sound === true;

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

  // M toggles mute while playing or paused; never while the GAME OVER modal is open or typing.
  const toggleMute = useEffectEvent(() => setMuted(!muted));
  useEffect(() => {
    if (!hasSound || over) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyM" || e.repeat || e.ctrlKey || e.metaKey || e.altKey)
        return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      )
        return;
      toggleMute();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasSound, over]);

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
  // Engine loads the level's bricks and resumes; score and lives carry over.
  const jumpToLevel = (n: number) => gameRef.current?.jumpToLevel?.(n);
  const endGame = () => {
    if (isReal) gameRef.current?.end();
    else setOver(true);
  };
  const save = () =>
    startSaving(async () => {
      try {
        const result = await submitScore({ gameId: game.id, score });
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
    <div className={`av-player fade-in${showNav ? " show-nav" : ""}`}>
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Player</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {username ?? "GUEST"}
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
          {hasSound && (
            <button
              type="button"
              className={`btn sound-toggle${muted ? " off" : ""}`}
              aria-pressed={muted}
              aria-label="Mute sound"
              title="Mute sound (M)"
              onClick={() => setMuted(!muted)}
            >
              <span className="sound-led" aria-hidden="true"></span>
              {muted ? "SOUND OFF" : "SOUND ON"}
            </button>
          )}
          {entry?.skins && (
            <button
              type="button"
              className={`btn skin-toggle skin-${skin}`}
              aria-label={`Change skin, current ${skin}`}
              title="Change skin"
              onClick={() => setSkin(nextSkin(skin))}
            >
              SKIN: {skin.toUpperCase()}
            </button>
          )}
          <button
            type="button"
            className="btn hud-menu"
            aria-pressed={showNav}
            onClick={() => setShowNav(!showNav)}
          >
            {showNav ? "HIDE MENU" : "MENU"}
          </button>
          <button type="button" className="btn yellow" onClick={togglePause}>
            {paused ? "RESUME" : "PAUSE"}
          </button>
          <button type="button" className="btn magenta" onClick={endGame}>
            END
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => router.push(`/game/${game.id}`)}
          >
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
              muted={muted}
              skin={skin}
              padSlot={padSlot}
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
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  PAUSED
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  {isReal
                    ? "PRESS P OR RESUME TO CONTINUE"
                    : "PRESS RESUME TO CONTINUE"}
                </div>
                {entry?.levels && (
                  <div className="level-jump">
                    <div className="level-jump-label">JUMP TO LEVEL</div>
                    <div className="level-jump-buttons">
                      {Array.from(
                        { length: entry.levels },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`btn level-jump-btn${n === level ? " current" : ""}`}
                          aria-label={`Jump to level ${n}`}
                          aria-current={n === level ? "step" : undefined}
                          onClick={() => jumpToLevel(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SIGNAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>LOAD · 1MB</span>
        </div>
      </div>

      {entry && <div ref={setPadSlot} className="touchpad-slot" />}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>GAME OVER</h2>
            <div className="final-label">FINAL SCORE</div>
            <div className="final">{score.toLocaleString("en-US")}</div>
            {username &&
              (!saved ? (
                <>
                  <div className="final-label">SAVING AS {username}</div>
                  <div className="input-row">
                    <button
                      type="button"
                      className="btn yellow"
                      onClick={save}
                      disabled={saving}
                      aria-describedby={saveError ? "save-error" : undefined}
                    >
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
              ))}
            {!username && (
              <>
                <div className="save-gate">SIGN IN TO SAVE YOUR SCORE</div>
                <div className="gate-row">
                  <Link href={`/login?next=/player/${game.id}`} className="btn">
                    LOGIN
                  </Link>
                  <Link
                    href={`/signup?next=/player/${game.id}`}
                    className="btn yellow"
                  >
                    SIGN UP
                  </Link>
                </div>
              </>
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
