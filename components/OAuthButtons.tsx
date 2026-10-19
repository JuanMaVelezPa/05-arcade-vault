"use client";

import { useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabase/client";

type Provider = "google" | "github";

export default function OAuthButtons({
  next,
  onError,
}: {
  next: string;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState<Provider | null>(null);

  async function start(provider: Provider) {
    setPending(provider);
    try {
      const { error } = await getSupabaseBrowser().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      // On success the browser is already navigating to the provider
      if (error) throw error;
    } catch (err) {
      console.error("OAuth start failed", err);
      onError("COULD NOT START SIGN-IN — TRY AGAIN");
      setPending(null);
    }
  }

  return (
    <div className="social">
      <button
        className="btn ghost"
        type="button"
        disabled={pending !== null}
        onClick={() => start("google")}
      >
        {pending === "google" ? "REDIRECTING…" : "◆  GOOGLE"}
      </button>
      <button
        className="btn ghost"
        type="button"
        disabled={pending !== null}
        onClick={() => start("github")}
      >
        {pending === "github" ? "REDIRECTING…" : "▣  GITHUB"}
      </button>
    </div>
  );
}
