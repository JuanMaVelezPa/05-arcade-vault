// Plays counts saved runs; a game nobody has scored on yet reads as NEW
export function formatPlays(plays: number): string {
  return plays === 0 ? "NEW" : plays.toLocaleString("en-US");
}

// DD/MM/YYYY in UTC, so every visitor sees the same date for a score
export function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

// Relative time for the live feed; `now` is passed in so the server computes it once
export function formatTimeAgo(iso: string, now: Date): string {
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
