export interface Game {
  id: string;
  title: string;
  short: string; // from games.tagline
  long: string; // from games.description
  category: string;
  cover: string;
  color: string;
  best: number; // game_stats.best
  plays: number; // game_stats.plays (saved runs)
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // DD/MM/YYYY, UTC
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
