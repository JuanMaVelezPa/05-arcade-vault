"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { safeNext } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/server";

export type AuthResult = { ok: true } | { ok: false; error: string };
export type RedirectResult =
  { ok: true; redirectTo: string } | { ok: false; error: string };

// Same username rule as scores.player_name and the profiles CHECK constraint
const USERNAME = /^[A-Z0-9_ ]{1,10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt limit

const GENERIC_ERROR = "SOMETHING WENT WRONG — TRY AGAIN";
const INVALID_EMAIL = "ENTER A VALID EMAIL";
const INVALID_PASSWORD = `PASSWORD MUST BE ${MIN_PASSWORD}-${MAX_PASSWORD} CHARACTERS`;

// Server Actions are reachable by direct POST, so don't trust the declared types
function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= MAX_EMAIL && EMAIL.test(email) ? email : null;
}

function validPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD &&
    value.length <= MAX_PASSWORD
  );
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signUp(input: {
  email: string;
  password: string;
  username: string;
  next?: string;
}): Promise<AuthResult> {
  const email = cleanEmail(input?.email);
  if (!email) return { ok: false, error: INVALID_EMAIL };
  if (!validPassword(input.password)) {
    return { ok: false, error: INVALID_PASSWORD };
  }
  const username =
    typeof input.username === "string"
      ? input.username.trim().toUpperCase()
      : "";
  if (!USERNAME.test(username)) {
    return { ok: false, error: "USERNAME: 1-10 LETTERS, DIGITS OR _" };
  }

  try {
    const supabase = await getSupabase();

    // The trigger never blocks a sign-up, it would silently rename a taken
    // username, so check it first. The unique index still guards the race.
    const { data: taken, error: lookupError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();
    if (lookupError) {
      console.error("signUp username lookup failed", lookupError);
      return { ok: false, error: GENERIC_ERROR };
    }
    if (taken) return { ok: false, error: "USERNAME TAKEN" };

    const origin = await getOrigin();
    const { error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { username },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(input.next))}`,
      },
    });
    if (error) {
      console.error("signUp failed", error);
      return { ok: false, error: "SIGN UP FAILED — TRY AGAIN" };
    }
  } catch (err) {
    console.error("signUp failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true };
}

export async function signIn(input: {
  email: string;
  password: string;
  next?: string;
}): Promise<RedirectResult> {
  const email = cleanEmail(input?.email);
  if (!email) return { ok: false, error: INVALID_EMAIL };
  if (typeof input.password !== "string" || input.password.length === 0) {
    return { ok: false, error: "ENTER YOUR PASSWORD" };
  }

  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (error) {
      if (error.code === "email_not_confirmed") {
        return { ok: false, error: "EMAIL NOT CONFIRMED — CHECK YOUR INBOX" };
      }
      // Same message for unknown email and wrong password
      return { ok: false, error: "INVALID EMAIL OR PASSWORD" };
    }
  } catch (err) {
    console.error("signIn failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: safeNext(input.next) };
}

export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("signOut failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("signOut failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function requestPasswordReset(input: {
  email: string;
}): Promise<AuthResult> {
  const email = cleanEmail(input?.email);
  if (!email) return { ok: false, error: INVALID_EMAIL };

  try {
    const supabase = await getSupabase();
    const origin = await getOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    // Never reveal whether the email exists: log and answer the same way
    if (error) console.error("requestPasswordReset failed", error);
  } catch (err) {
    console.error("requestPasswordReset failed", err);
  }

  return { ok: true };
}

export async function updatePassword(input: {
  password: string;
  confirm: string;
}): Promise<RedirectResult> {
  if (!validPassword(input?.password)) {
    return { ok: false, error: INVALID_PASSWORD };
  }
  if (input.password !== input.confirm) {
    return { ok: false, error: "PASSWORDS DO NOT MATCH" };
  }

  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) {
      return { ok: false, error: "RESET LINK EXPIRED — REQUEST A NEW ONE" };
    }
    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (error) {
      console.error("updatePassword failed", error);
      return { ok: false, error: "COULD NOT UPDATE PASSWORD — TRY AGAIN" };
    }
  } catch (err) {
    console.error("updatePassword failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/games" };
}
