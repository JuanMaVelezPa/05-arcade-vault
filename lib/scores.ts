import type { SavedScore } from "./types";

const STORAGE_KEY = "av_scores";

export function saveScore(entry: Omit<SavedScore, "at">): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: SavedScore[] = raw ? JSON.parse(raw) : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage may be unavailable (e.g. private mode) — score save is best-effort
  }
}
