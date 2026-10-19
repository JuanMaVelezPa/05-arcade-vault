import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "../safe-next";
import { getSupabaseEnv } from "./env";

// Optimistic redirects only: pages, server actions and RLS still check the session
const SIGNED_OUT_ONLY = ["/login", "/signup"]; // signed-in users go on to ?next=
const SIGNED_IN_ONLY: Record<string, string> = {
  "/reset-password": "/forgot-password", // path -> where signed-out users go
};

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let env: { url: string; key: string };
  try {
    env = getSupabaseEnv();
  } catch {
    // Missing env must not take down every page; the health route reports it
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims(), or users may be randomly logged out
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const { pathname, searchParams } = request.nextUrl;

  let target: string | null = null;
  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    target = safeNext(searchParams.get("next"));
  } else if (!signedIn && pathname in SIGNED_IN_ONLY) {
    target = SIGNED_IN_ONLY[pathname];
  }
  if (!target) return supabaseResponse;

  // Keep the refreshed session cookies on the redirect
  const redirect = NextResponse.redirect(new URL(target, request.url));
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
