import "server-only";

import { formatScoreDate } from "./format";
import type { Database } from "./supabase/database.types";
import { getSupabase } from "./supabase/server";
import type { Champion, Game, ScoreRow } from "./types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type StatsRow = Database["public"]["Views"]["game_stats"]["Row"];

function toGame(row: GameRow, stats: StatsRow | undefined): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.tagline,
    long: row.description,
    category: row.category,
    cover: row.cover,
    color: row.color,
    best: stats?.best ?? 0,
    plays: stats?.plays ?? 0,
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = await getSupabase();
  const [games, stats] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .eq("is_published", true)
      .order("sort_order"),
    supabase.from("game_stats").select("*"),
  ]);
  if (games.error)
    throw new Error(`games query failed: ${games.error.message}`);
  if (stats.error)
    throw new Error(`game_stats query failed: ${stats.error.message}`);

  const statsById = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((row) => toGame(row, statsById.get(row.id)));
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await getSupabase();
  const [game, stats] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle(),
    supabase.from("game_stats").select("*").eq("game_id", id).maybeSingle(),
  ]);
  if (game.error) throw new Error(`games query failed: ${game.error.message}`);
  if (stats.error)
    throw new Error(`game_stats query failed: ${stats.error.message}`);

  return game.data ? toGame(game.data, stats.data ?? undefined) : null;
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`scores query failed: ${error.message}`);

  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: r.score,
    date: formatScoreDate(r.created_at),
  }));
}

// One entry per game in catalog order; each game's #1 is only ever compared within its own game
export async function getChampions(): Promise<Champion[]> {
  const supabase = await getSupabase();
  const [games, champions] = await Promise.all([
    supabase
      .from("games")
      .select("id, title, color")
      .eq("is_published", true)
      .order("sort_order"),
    supabase.from("game_champions").select("*"),
  ]);
  if (games.error)
    throw new Error(`games query failed: ${games.error.message}`);
  if (champions.error)
    throw new Error(`game_champions query failed: ${champions.error.message}`);

  const byGame = new Map(champions.data.map((c) => [c.game_id, c]));
  return games.data.map((game) => {
    const c = byGame.get(game.id);
    return {
      game,
      champion:
        c?.player_name != null && c.score != null && c.created_at != null
          ? {
              name: c.player_name,
              score: c.score,
              date: formatScoreDate(c.created_at),
            }
          : null,
    };
  });
}
