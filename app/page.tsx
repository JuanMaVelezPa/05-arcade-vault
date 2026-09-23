"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GAMES } from "@/lib/data";
import type { Game } from "@/lib/types";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function FloatingSilhouettes() {
  return (
    <div className="home-silos" aria-hidden="true">
      <svg className="silo s1" viewBox="0 0 40 32">
        <g fill="#00f5ff">
          <rect x="6" y="4" width="4" height="4" />
          <rect x="30" y="4" width="4" height="4" />
          <rect x="2" y="8" width="36" height="4" />
          <rect x="2" y="12" width="4" height="4" />
          <rect x="14" y="12" width="4" height="4" />
          <rect x="22" y="12" width="4" height="4" />
          <rect x="34" y="12" width="4" height="4" />
          <rect x="2" y="16" width="36" height="4" />
          <rect x="6" y="20" width="4" height="4" />
          <rect x="30" y="20" width="4" height="4" />
        </g>
      </svg>
      <svg className="silo s2" viewBox="0 0 32 32">
        <g fill="#ff006e">
          <rect x="8" y="0" width="16" height="4" />
          <rect x="4" y="4" width="24" height="4" />
          <rect x="0" y="8" width="32" height="12" />
          <rect x="0" y="20" width="6" height="6" />
          <rect x="10" y="20" width="4" height="6" />
          <rect x="18" y="20" width="4" height="6" />
          <rect x="26" y="20" width="6" height="6" />
        </g>
      </svg>
      <svg className="silo s3" viewBox="0 0 32 32">
        <g fill="#f5ff00">
          <rect x="10" y="0" width="12" height="4" />
          <rect x="6" y="4" width="20" height="4" />
          <rect x="4" y="8" width="6" height="6" />
          <rect x="22" y="8" width="6" height="6" />
          <rect x="2" y="14" width="28" height="10" />
          <rect x="6" y="24" width="4" height="4" />
          <rect x="14" y="24" width="4" height="4" />
          <rect x="22" y="24" width="4" height="4" />
        </g>
      </svg>
      <svg className="silo s4" viewBox="0 0 24 24">
        <g fill="#00ff88">
          <rect x="10" y="0" width="4" height="24" />
          <rect x="0" y="10" width="24" height="4" />
          <rect x="6" y="6" width="12" height="12" fill="none" stroke="#00ff88" strokeWidth="2" />
        </g>
      </svg>
      <svg className="silo s5" viewBox="0 0 36 24">
        <g fill="#aa00ff">
          <rect x="14" y="2" width="8" height="4" />
          <rect x="10" y="6" width="16" height="4" />
          <rect x="4" y="10" width="28" height="4" />
          <rect x="0" y="14" width="36" height="4" />
          <rect x="6" y="18" width="4" height="2" />
          <rect x="16" y="18" width="4" height="2" />
          <rect x="26" y="18" width="4" height="2" />
        </g>
      </svg>
      <svg className="silo s6" viewBox="0 0 20 20">
        <g fill="#ffcf3a">
          <rect x="6" y="0" width="8" height="2" />
          <rect x="2" y="2" width="16" height="2" />
          <rect x="0" y="4" width="20" height="12" />
          <rect x="2" y="16" width="16" height="2" />
          <rect x="6" y="18" width="8" height="2" />
          <rect x="8" y="4" width="4" height="12" fill="#0a0a0f" />
        </g>
      </svg>
      <svg className="silo s7" viewBox="0 0 24 22">
        <g fill="#ff3060">
          <rect x="2" y="2" width="6" height="2" />
          <rect x="16" y="2" width="6" height="2" />
          <rect x="0" y="4" width="10" height="4" />
          <rect x="14" y="4" width="10" height="4" />
          <rect x="0" y="8" width="24" height="4" />
          <rect x="2" y="12" width="20" height="2" />
          <rect x="4" y="14" width="16" height="2" />
          <rect x="6" y="16" width="12" height="2" />
          <rect x="8" y="18" width="8" height="2" />
          <rect x="10" y="20" width="4" height="2" />
        </g>
      </svg>
      <svg className="silo s8" viewBox="0 0 24 24">
        <g fill="#00d4ff">
          <rect x="8" y="2" width="8" height="6" />
          <rect x="2" y="8" width="20" height="8" />
          <rect x="8" y="16" width="8" height="6" />
          <rect x="11" y="6" width="2" height="2" fill="#0a0a0f" />
          <rect x="11" y="16" width="2" height="2" fill="#0a0a0f" />
          <rect x="4" y="11" width="2" height="2" fill="#0a0a0f" />
          <rect x="18" y="11" width="2" height="2" fill="#0a0a0f" />
        </g>
      </svg>
    </div>
  );
}

function FeatureIcon({ kind }: { kind: string }) {
  const C = "currentColor";
  if (kind === "GAMEPAD")
    return (
      <svg className="ft-icon" viewBox="0 0 16 16">
        <g fill={C}>
          <rect x="2" y="6" width="12" height="6" />
          <rect x="0" y="8" width="2" height="4" />
          <rect x="14" y="8" width="2" height="4" />
          <rect x="3" y="8" width="2" height="2" />
          <rect x="2" y="9" width="4" height="0.5" />
          <rect x="11" y="7" width="1.5" height="1.5" />
          <rect x="11" y="10" width="1.5" height="1.5" />
        </g>
      </svg>
    );
  if (kind === "FREE")
    return (
      <svg className="ft-icon" viewBox="0 0 16 16">
        <g fill={C}>
          <rect x="3" y="3" width="10" height="10" fill="none" stroke={C} strokeWidth="1.5" />
          <rect x="5" y="6" width="1.5" height="4" />
          <rect x="5" y="6" width="4" height="1.5" />
          <rect x="5" y="8" width="3" height="1" />
          <rect x="10" y="6" width="1.5" height="4" />
        </g>
      </svg>
    );
  if (kind === "TROPHY")
    return (
      <svg className="ft-icon" viewBox="0 0 16 16">
        <g fill={C}>
          <rect x="3" y="2" width="10" height="2" />
          <rect x="3" y="2" width="2" height="6" />
          <rect x="11" y="2" width="2" height="6" />
          <rect x="5" y="8" width="6" height="2" />
          <rect x="7" y="10" width="2" height="3" />
          <rect x="5" y="13" width="6" height="1.5" />
          <rect x="1" y="3" width="2" height="3" />
          <rect x="13" y="3" width="2" height="3" />
        </g>
      </svg>
    );
  if (kind === "ROCKET")
    return (
      <svg className="ft-icon" viewBox="0 0 16 16">
        <g fill={C}>
          <rect x="7" y="1" width="2" height="2" />
          <rect x="6" y="3" width="4" height="2" />
          <rect x="5" y="5" width="6" height="6" />
          <rect x="4" y="11" width="2" height="2" />
          <rect x="10" y="11" width="2" height="2" />
          <rect x="7" y="6" width="2" height="2" fill="#0a0a0f" />
          <rect x="6" y="13" width="1" height="2" />
          <rect x="9" y="13" width="1" height="2" />
        </g>
      </svg>
    );
  return null;
}

function MiniCard({ game, onClick }: { game: Game; onClick: () => void }) {
  return (
    <div className="mini-card" onClick={onClick}>
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.category}</div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    i: "GAMEPAD",
    t: "CLASSIC GAMES",
    d: "Arkanoid, Tetris, Snake and many more. The best arcade classics all in one place.",
    c: "cyan",
  },
  {
    i: "FREE",
    t: "100% FREE",
    d: "No subscriptions, no hidden fees. All games available for free.",
    c: "yellow",
  },
  {
    i: "TROPHY",
    t: "LEADERBOARDS",
    d: "Compete with players from around the world. Climb the ranking and prove who's the best.",
    c: "magenta",
  },
  {
    i: "ROCKET",
    t: "ALWAYS GROWING",
    d: "We add new games constantly. Come back often, there's always something new to play.",
    c: "green",
  },
];

const STATS = [
  { n: "12+", u: "GAMES", s: "AND COUNTING" },
  { n: "THOUSANDS", u: "OF MATCHES", s: "PLAYED EVERY DAY" },
  { n: "GLOBAL", u: "RANKING", s: "COMPETE WITH THE WORLD" },
];

const RECENT_SCORES = [
  { p: "NEONFOX", g: "DROP", s: 184220, t: "2 min ago", c: "magenta" },
  { p: "PX_KAI", g: "GLUTTON", s: 96400, t: "5 min ago", c: "yellow" },
  { p: "Z3R0COOL", g: "INVADERS", s: 54190, t: "8 min ago", c: "green" },
  { p: "VAULT_07", g: "ROCKS", s: 41200, t: "12 min ago", c: "cyan" },
  { p: "GLITCHA", g: "BLOCK BUSTER", s: 28450, t: "18 min ago", c: "cyan" },
  { p: "ARKADYA", g: "SERPENTINE", s: 7820, t: "24 min ago", c: "green" },
  { p: "CYBER_LU", g: "FROG CROSSING", s: 18900, t: "31 min ago", c: "yellow" },
];

const TOP_PLAYERS = [
  { r: 1, p: "NEONFOX", s: 312840 },
  { r: 2, p: "PX_KAI", s: 248110 },
  { r: 3, p: "M00NRYU", s: 196720 },
  { r: 4, p: "VAULT_07", s: 154300 },
  { r: 5, p: "GLITCHA", s: 138900 },
];

export default function Home() {
  useReveal();
  const router = useRouter();

  return (
    <div className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERT COIN<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">THE CLASSIC</span>
            <span className="line-2">ARCADE IS</span>
            <span className="line-3">BACK</span>
          </h1>
          <p className="home-sub">
            Play the best classics right in your browser.
            <br />
            No downloads. No cost. Just fun.
          </p>
          <div className="home-ctas">
            <button className="btn xl pulse" onClick={() => router.push("/games")}>
              ▶ EXPLORE GAMES
            </button>
            <button className="btn xl magenta" onClick={() => router.push("/games")}>
              ✦ CREATE ACCOUNT
            </button>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>SCROLL</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-magenta">{"// 01"}</div>
          <h2 className="section-title">WHY ARCADE VAULT?</h2>
          <div className="section-rule"></div>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className={"feature-card " + f.c} style={{ transitionDelay: i * 80 + "ms" }}>
              <FeatureIcon kind={f.i} />
              <div className="ft-title pixel">{f.t}</div>
              <div className="ft-desc">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GAMES PREVIEW */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-cyan">{"// 02"}</div>
          <h2 className="section-title">GAMES AVAILABLE NOW</h2>
          <div className="section-rule"></div>
        </div>
        <div className="mini-rail">
          {GAMES.slice(0, 6).map((g) => (
            <MiniCard key={g.id} game={g} onClick={() => router.push(`/game/${g.id}`)} />
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button className="btn lg" onClick={() => router.push("/games")}>
            SEE ALL GAMES →
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="home-stats reveal">
        <div className="stats-inner">
          {STATS.map((st, i) => (
            <div key={i} className="stat-block" style={{ transitionDelay: i * 90 + "ms" }}>
              <div className="stat-n neon-yellow">{st.n}</div>
              <div className="stat-u pixel">{st.u}</div>
              <div className="stat-s">{st.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY / LEADERBOARD */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-yellow">{"// 03"}</div>
          <h2 className="section-title">LIVE ACTIVITY</h2>
          <div className="section-rule"></div>
        </div>
        <div className="activity-grid">
          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel">▸ LATEST SCORES</div>
            </div>
            <div className="ticker">
              {RECENT_SCORES.map((r, i) => (
                <div key={i} className="tick-row" style={{ animationDelay: i * 60 + "ms" }}>
                  <span className={"tk-p neon-" + r.c}>{r.p}</span>
                  <span className="tk-mid">▸ {r.g}</span>
                  <span className="tk-s">+{r.s.toLocaleString("en-US")}</span>
                  <span className="tk-t">{r.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel neon-magenta">▸ TOP PLAYERS · TODAY</div>
              <button className="lb-link" onClick={() => router.push("/hall-of-fame")}>
                SEE HALL OF FAME →
              </button>
            </div>
            <div className="top-list">
              {TOP_PLAYERS.map((r, i) => (
                <div key={i} className={"top-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}>
                  <span className="tp-rk">#{String(r.r).padStart(2, "0")}</span>
                  <span className="tp-bar">
                    <span className="tp-fill" style={{ width: 100 - i * 16 + "%" }}></span>
                  </span>
                  <span className="tp-p">{r.p}</span>
                  <span className="tp-s">{r.s.toLocaleString("en-US")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-green">{"// 04"}</div>
          <h2 className="section-title">PRICING</h2>
          <div className="section-rule"></div>
        </div>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="pc-label pixel">ONE PLAN</div>
            <div className="pc-name pixel">VAULT PLAYER</div>
            <div className="pc-amount">
              <span className="pc-amount-n">$0</span>
              <span className="pc-amount-u">/ FOREVER</span>
            </div>
            <div className="pc-tag">NO TRICKS · NO FINE PRINT</div>
            <ul className="pc-list">
              <li>✔ Access to all games</li>
              <li>✔ Global ranking and hall of fame</li>
              <li>✔ No ads between matches</li>
              <li>✔ Save your scores</li>
              <li>✔ New games every month</li>
              <li>✔ Works in any browser</li>
            </ul>
            <button className="btn xl pulse" style={{ width: "100%" }} onClick={() => router.push("/games")}>
              START FREE →
            </button>
            <div className="pc-foot">We don&apos;t ask for a card. We never will.</div>
            <div className="pc-stamp pixel">
              FREE
              <br />
              PLAY
            </div>
          </div>

          <div className="pricing-faq">
            <div className="faq-item">
              <div className="faq-q pixel">IS IT REALLY FREE?</div>
              <div className="faq-a">
                Yes. Arcade Vault is a non-profit project made out of love for the classics. There&apos;s no hidden
                &quot;premium&quot; version.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q pixel">DO I NEED TO CREATE AN ACCOUNT?</div>
              <div className="faq-a">
                No. You can play as a guest. If you want to save your score and appear on the ranking, sign up in 10
                seconds.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q pixel">HOW DO YOU SURVIVE WITHOUT CHARGING?</div>
              <div className="faq-a">It&apos;s a community project. If you like it, share it. That&apos;s the only currency we accept.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="home-final reveal">
        <h2 className="final-title pixel">READY TO PLAY?</h2>
        <Link href="/games" className="btn xl pulse final-cta">
          INSERT COIN →
        </Link>
        <div className="final-tag">Free. No registration required. Start in seconds.</div>
      </section>
    </div>
  );
}
