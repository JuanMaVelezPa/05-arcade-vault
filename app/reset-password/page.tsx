import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AuthForm from "@/components/AuthForm";
import { getSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New password · Arcade Vault" };

export default async function ResetPasswordPage() {
  // The reset link leaves a session behind; without one there is nothing to update
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/forgot-password");

  return (
    <main className="av-main">
      <AuthForm mode="reset" next="/games" />
    </main>
  );
}
