export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  category: string;
  cover: string;
  color: string;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
