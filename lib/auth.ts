import "server-only";

import { unstable_rethrow } from "next/navigation";

import { getSupabase } from "./supabase/server";

export interface CurrentUser {
  id: string; // auth.users.id
  email: string;
  username: string; // profiles.username
}

export { safeNext } from "./safe-next";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // The layout calls this on every page, so a Supabase outage or missing env
  // must read as "signed out" instead of taking the whole site down
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", claims.sub)
      .maybeSingle();
    if (!profile) return null;

    return {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      username: profile.username,
    };
  } catch (err) {
    // Next signals dynamic rendering through thrown errors; never swallow them
    unstable_rethrow(err);
    console.error("getCurrentUser failed", err);
    return null;
  }
}
