import type { Metadata } from "next";

import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Reset password · Arcade Vault" };

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const { next, error } = await searchParams;
  return (
    <main className="av-main">
      <AuthForm
        mode="forgot"
        next={safeNext(typeof next === "string" ? next : null)}
        initialError={
          error === "auth" ? "THAT RESET LINK EXPIRED — REQUEST A NEW ONE" : ""
        }
      />
    </main>
  );
}
