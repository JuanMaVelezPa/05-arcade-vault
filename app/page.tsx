export default function Home() {
  return (
    <main className="av-main av-hero fade-in">
      <h1 className="flicker">Arcade Vault</h1>
      <p className="sub">
        Insert coin<span className="blink">_</span>
      </p>
      <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn pulse">
          Play
        </button>
        <button type="button" className="btn magenta">
          Leaderboard
        </button>
      </div>
    </main>
  );
}
