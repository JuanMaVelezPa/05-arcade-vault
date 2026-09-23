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
