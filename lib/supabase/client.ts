import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export function getSupabaseBrowser(): SupabaseClient<Database> {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
