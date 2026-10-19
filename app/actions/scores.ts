"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

// Same rule as the scores table CHECK constraint; the DB enforces it again
const MAX_SCORE = 10_000_000;

export async function submitScore(input: {
  gameId: string;
  score: number;
}): Promise<SubmitScoreResult> {
  // Server Actions are reachable by direct POST, so don't trust the declared types
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN IN TO SAVE YOUR SCORE" };

  const { score, gameId } = input ?? {};
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "INVALID SCORE" };
  }
  if (typeof gameId !== "string") {
    return { ok: false, error: "SAVE FAILED — TRY AGAIN" };
  }

  try {
    const supabase = await getSupabase();
    // user_id comes from the session and player_name from a DB trigger, so the
    // generated Insert type (which still lists player_name) is cast
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, score } as TablesInsert<"scores">);
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
