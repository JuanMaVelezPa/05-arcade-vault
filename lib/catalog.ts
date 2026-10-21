import "server-only";

import { cache } from "react";

import { formatScoreDate } from "./format";
import type { Database } from "./supabase/database.types";
import { getSupabase } from "./supabase/server";
import type { Champion, Game, RecentScore, ScoreRow, TopPlayer } from "./types";

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

// cache() lets generateMetadata and the page share one query per render
export const getGame = cache(async (id: string): Promise<Game | null> => {
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
});

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

// Published games only: rows are fetched first, then joined to games in code, so unpublished rows are dropped
async function getPublishedGames(): Promise<
  Map<string, { title: string; color: string }>
> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, color")
    .eq("is_published", true);
  if (error) throw new Error(`games query failed: ${error.message}`);
  return new Map(data.map((g) => [g.id, g]));
}

// Newest scores across published games, newest first
export async function getRecentScores(limit: number): Promise<RecentScore[]> {
  const supabase = await getSupabase();
  const [scores, games] = await Promise.all([
    supabase
      .from("scores")
      .select("player_name, game_id, score, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    getPublishedGames(),
  ]);
  if (scores.error)
    throw new Error(`scores query failed: ${scores.error.message}`);

  return scores.data.flatMap((r) => {
    const game = games.get(r.game_id);
    if (!game) return [];
    return {
      player: r.player_name,
      gameId: r.game_id,
      gameTitle: game.title,
      gameColor: game.color,
      score: r.score,
      createdAt: r.created_at,
    };
  });
}

const TOP_PLAYERS_WINDOW_MS = 24 * 60 * 60 * 1000;
const TOP_PLAYERS_SCAN = 200;

// Best single score per player in the last 24 hours (rolling, UTC)
export async function getTopPlayers(limit: number): Promise<TopPlayer[]> {
  const supabase = await getSupabase();
  const since = new Date(Date.now() - TOP_PLAYERS_WINDOW_MS).toISOString();
  const [scores, games] = await Promise.all([
    supabase
      .from("scores")
      .select("player_name, game_id, score")
      .gte("created_at", since)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(TOP_PLAYERS_SCAN),
    getPublishedGames(),
  ]);
  if (scores.error)
    throw new Error(`scores query failed: ${scores.error.message}`);

  // Rows arrive best-first, so the first row seen per player is their best
  const best = new Map<string, number>();
  for (const r of scores.data) {
    if (!games.has(r.game_id) || best.has(r.player_name)) continue;
    best.set(r.player_name, r.score);
  }

  return [...best]
    .slice(0, limit)
    .map(([player, score], i) => ({ rank: i + 1, player, score }));
}
