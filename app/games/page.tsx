"use client";

import { useMemo, useState } from "react";
import GameCard from "@/components/GameCard";
import { CATEGORIES, GAMES } from "@/lib/data";

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");

  const filtered = useMemo(() => {
    return GAMES.filter(
      (g) => (category === "ALL" || g.category === category) && g.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, category]);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERT COIN TO PLAY <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a game by name…" />
        </div>
        <div className="av-chips">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={"chip" + (category === c ? " active" : "")}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 80, color: "var(--ink-faint)" }}>
            <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
              NO RESULTS
            </div>
            <div>Try a different search or category.</div>
          </div>
        )}
      </div>
    </div>
  );
}
