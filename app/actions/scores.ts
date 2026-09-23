"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase/server";

export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

// Same rules as the scores table CHECK constraints; the DB enforces them again
const PLAYER_NAME = /^[A-Z0-9_ ]{1,10}$/;
const MAX_SCORE = 10_000_000;

export async function submitScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SubmitScoreResult> {
  // Server Actions are reachable by direct POST, so don't trust the declared types
  const playerName =
    typeof input?.playerName === "string" ? input.playerName.trim() : "";
  if (!PLAYER_NAME.test(playerName)) {
    return { ok: false, error: "ENTER 1-10 LETTERS, DIGITS OR _" };
  }
  const { score, gameId } = input;
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "INVALID SCORE" };
  }
  if (typeof gameId !== "string") {
    return { ok: false, error: "SAVE FAILED — TRY AGAIN" };
  }

  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: playerName, score });
    if (error) {
      console.error("submitScore insert failed", error);
      return { ok: false, error: "SAVE FAILED — TRY AGAIN" };
    }
  } catch (err) {
    // e.g. missing env or network failure before Supabase answers
    console.error("submitScore failed", err);
    return { ok: false, error: "SAVE FAILED — TRY AGAIN" };
  }

  revalidatePath(`/game/${gameId}`);
  revalidatePath("/hall-of-fame");
  return { ok: true };
}
