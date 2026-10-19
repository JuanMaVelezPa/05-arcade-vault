import "server-only";

import { unstable_rethrow } from "next/navigation";

import { getSupabase } from "./supabase/server";

export interface CurrentUser {
  id: string; // auth.users.id
  email: string;
  username: string; // profiles.username
}

const DEFAULT_NEXT = "/games";

// Only same-origin relative paths are allowed; anything else is an open redirect
export function safeNext(next: string | null | undefined): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f]/.test(next)
  ) {
    return DEFAULT_NEXT;
  }
  return next;
}

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
