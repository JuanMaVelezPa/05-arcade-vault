import Link from "next/link";
import { getChampions, getGames, getTopScores } from "@/lib/catalog";
import type { Champion, ScoreRow } from "@/lib/types";

const EMPTY = "NO SCORES YET — BE THE FIRST";

type Tab = { id: string; title: string };

export default async function HallOfFamePage({
  searchParams,
}: PageProps<"/hall-of-fame">) {
  const { game } = await searchParams;
  const selected = typeof game === "string" ? game : null;

  // A game tab needs the game list (to validate ?game) plus that game's board;
  // anything else, including an unknown id, falls back to the ALL GAMES champions
  if (selected) {
    const [games, rows] = await Promise.all([
      getGames(),
      getTopScores(selected, 12),
    ]);
    const current = games.find((g) => g.id === selected);
    if (current) {
      return (
        <HallShell tabs={games} active={current.id}>
          <Podium rows={rows} />
          <ScoresTable rows={rows} />
        </HallShell>
      );
    }
  }

  const champions = await getChampions();
  return (
    <HallShell tabs={champions.map((c) => c.game)} active={null}>
      <ChampionsTable champions={champions} />
    </HallShell>
  );
}

function HallShell({
  tabs,
  active,
  children,
}: {
  tabs: Tab[];
  active: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>HALL OF FAME</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          THE NAMES THAT NEVER FADE FROM THE SCREEN
        </p>
      </div>

      <nav className="hall-tabs" aria-label="Leaderboards">
        <Link
          href="/hall-of-fame"
          className={"chip" + (active === null ? " active" : "")}
          aria-current={active === null ? "page" : undefined}
        >
          ALL GAMES
        </Link>
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/hall-of-fame?game=${t.id}`}
            className={"chip" + (active === t.id ? " active" : "")}
            aria-current={active === t.id ? "page" : undefined}
          >
            {t.title}
          </Link>
        ))}
      </nav>

      {children}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/" className="btn lg">
          BACK TO LIBRARY
        </Link>
      </div>
    </div>
  );
}

function PodiumSlot({
  row,
  tier,
  rank,
}: {
  row: ScoreRow | undefined;
  tier: "gold" | "silver" | "bronze";
  rank: string;
}) {
  const gold = tier === "gold";
  return (
    <div className={"podium-slot " + tier}>
      {gold && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CHAMPION
        </div>
      )}
      <div
        className="rank-num"
        style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {rank}
      </div>
      <div className="name">{row?.name ?? "---"}</div>
      <div className="score" style={gold ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("en-US") : "---"}
      </div>
      {row && <div className="date">{row.date}</div>}
    </div>
  );
}

function Podium({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="podium">
      <PodiumSlot row={rows[1]} tier="silver" rank="02" />
      <PodiumSlot row={rows[0]} tier="gold" rank="01" />
      <PodiumSlot row={rows[2]} tier="bronze" rank="03" />
    </div>
  );
}

function ScoresTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="hall-table">
      <div className="th">
        <div>RANK</div>
        <div>PLAYER</div>
        <div>SCORE</div>
        <div>DATE</div>
      </div>
      {rows.length === 0 && <div className="lb-empty pixel">{EMPTY}</div>}
      {rows.map((r, i) => (
        <div
          key={r.rank}
          className={
            "tr" +
            (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
          }
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">{r.name}</div>
          <div className="sc">{r.score.toLocaleString("en-US")}</div>
          <div className="dt">{r.date}</div>
        </div>
      ))}
    </div>
  );
}

function ChampionsTable({ champions }: { champions: Champion[] }) {
  return (
    <div className="hall-table champions">
      <div className="th">
        <div>GAME</div>
        <div>PLAYER</div>
        <div>SCORE</div>
        <div>DATE</div>
      </div>
      {champions.map(({ game, champion }, i) => (
        <div
          key={game.id}
          className="tr"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="gm">
            <Link
              href={`/hall-of-fame?game=${game.id}`}
              style={{ color: `var(--${game.color})` }}
            >
              {game.title}
            </Link>
          </div>
          <div className="pl">{champion?.name ?? "---"}</div>
          <div className="sc">
            {champion ? champion.score.toLocaleString("en-US") : "---"}
          </div>
          <div className="dt">{champion?.date}</div>
        </div>
      ))}
    </div>
  );
}
