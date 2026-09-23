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

export interface Champion {
  game: Pick<Game, "id" | "title" | "color">;
  champion: Omit<ScoreRow, "rank"> | null; // null when the game has no scores
}
