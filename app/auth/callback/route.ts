import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/server";

// Single code-exchange path for OAuth, email confirmation and password recovery
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    } catch {
      // Falls through to the error redirect below
    }
  }

  // A failed or expired reset link goes back to where a new one can be requested
  const failure = next.startsWith("/reset-password")
    ? "/forgot-password"
    : "/login";
  return NextResponse.redirect(`${origin}${failure}?error=auth`);
}
