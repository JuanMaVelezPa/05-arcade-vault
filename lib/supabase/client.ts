import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

export function getSupabaseBrowser(): SupabaseClient {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}
