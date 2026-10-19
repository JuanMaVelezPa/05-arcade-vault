import type { Metadata } from "next";

import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in · Arcade Vault" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <main className="av-main">
      <AuthForm
        mode="login"
        next={safeNext(typeof next === "string" ? next : null)}
        initialError={
          error === "auth" ? "THAT LINK DIDN'T WORK — LOG IN OR TRY AGAIN" : ""
        }
      />
    </main>
  );
}
