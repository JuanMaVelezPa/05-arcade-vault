import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  }

  // No user session on the server in this spec
  return createClient(url, key, { auth: { persistSession: false } });
}
