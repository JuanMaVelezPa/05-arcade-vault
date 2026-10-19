import type { Metadata } from "next";

import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up · Arcade Vault" };

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const { next } = await searchParams;
  return (
    <main className="av-main">
      <AuthForm
        mode="signup"
        next={safeNext(typeof next === "string" ? next : null)}
      />
    </main>
  );
}
