import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getTopScores } from "@/lib/catalog";
import { formatPlays } from "@/lib/format";

export default async function GameDetailPage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  const [game, scores] = await Promise.all([getGame(id), getTopScores(id, 10)]);
  if (!game) notFound();

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.category}</span>
            <span>1 PLAYER</span>
            <span>KEYBOARD / TOUCH</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Plays</div>
              <div className="v">{formatPlays(game.plays)}</div>
            </div>
            <div>
              <div className="l">Global Best</div>
              <div className="v" style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}>
                {game.best.toLocaleString("en-US")}
              </div>
            </div>
            <div>
              <div className="l">Difficulty</div>
              <div className="v" style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}>
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/player/${game.id}`} className="btn xl pulse">
              ▶ PLAY NOW
            </Link>
            <Link href="/" className="btn ghost lg">
              BACK TO VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>TOP SCORES</h3>
          {scores.length === 0 && <div className="lb-empty pixel">NO SCORES YET — BE THE FIRST</div>}
          {scores.map((r, i) => (
            <div key={r.rank} className={"lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}>
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>{r.date}</div>
              </div>
              <div className="sc">{r.score.toLocaleString("en-US")}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
