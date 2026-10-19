"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from "@/app/actions/auth";
import OAuthButtons from "@/components/OAuthButtons";

type Mode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<
  Mode,
  { title: string; sub: string; submit: string; busy: string }
> = {
  login: {
    title: "WELCOME BACK",
    sub: "SIGN IN TO KEEP YOUR NAME ON THE BOARD",
    submit: "ENTER THE VAULT",
    busy: "SIGNING IN…",
  },
  signup: {
    title: "NEW PLAYER",
    sub: "PICK A NAME, CLAIM YOUR SPOT",
    submit: "CREATE ACCOUNT",
    busy: "CREATING…",
  },
  forgot: {
    title: "RESET PASSWORD",
    sub: "WE'LL EMAIL YOU A LINK TO GET BACK IN",
    submit: "SEND RESET LINK",
    busy: "SENDING…",
  },
  reset: {
    title: "NEW PASSWORD",
    sub: "CHOOSE A PASSWORD YOU HAVEN'T USED HERE BEFORE",
    submit: "SAVE PASSWORD",
    busy: "SAVING…",
  },
};

export default function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: Mode;
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(initialError ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    confirm: "",
  });

  const copy = COPY[mode];
  const query = next === "/games" ? "" : `?next=${encodeURIComponent(next)}`;
  const hasTabs = mode === "login" || mode === "signup";
  const hasEmail = mode !== "reset";
  const hasPassword = mode !== "forgot";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError("");

    startTransition(async () => {
      if (mode === "forgot") {
        const res = await requestPasswordReset({ email: form.email });
        if (!res.ok) return setError(res.error);
        setSentTo(form.email.trim());
        return;
      }
      if (mode === "signup") {
        const res = await signUp({ ...form, next });
        if (!res.ok) return setError(res.error);
        setSentTo(form.email.trim());
        return;
      }
      const res =
        mode === "login"
          ? await signIn({ ...form, next })
          : await updatePassword(form);
      if (!res.ok) return setError(res.error);
      router.replace(res.redirectTo);
      router.refresh();
    });
  }

  if (sentTo) {
    const isReset = mode === "forgot";
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card" role="status">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-green">
              {isReset ? "CHECK YOUR EMAIL" : "CHECK YOUR INBOX"}
            </h2>
          </div>
          {isReset ? (
            <p className="auth-note">
              If <strong>{sentTo}</strong> has an account, a reset link is on
              its way. The link works once and expires.
            </p>
          ) : (
            <p className="auth-note">
              We sent a confirmation link to <strong>{sentTo}</strong>. Open it
              to finish creating your account.
            </p>
          )}
          <p className="auth-note dim">
            Nothing after a few minutes? Check your spam folder.
          </p>
          <Link
            className="btn ghost"
            href={`/login${query}`}
            style={{ width: "100%", marginTop: 8 }}
          >
            BACK TO LOGIN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h1 className="neon-cyan">{copy.title}</h1>
          <div className="auth-sub">{copy.sub}</div>
        </div>

        {hasTabs && (
          <nav className="auth-tabs" aria-label="Account">
            <Link
              href={`/login${query}`}
              className={mode === "login" ? "on" : ""}
              aria-current={mode === "login" ? "page" : undefined}
            >
              LOG IN
            </Link>
            <Link
              href={`/signup${query}`}
              className={mode === "signup" ? "on" : ""}
              aria-current={mode === "signup" ? "page" : undefined}
            >
              SIGN UP
            </Link>
          </nav>
        )}

        <form onSubmit={onSubmit} noValidate>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor={`${uid}-username`}>Username</label>
              <input
                id={`${uid}-username`}
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value.toUpperCase() })
                }
                placeholder="PX_KAI"
                maxLength={10}
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={pending}
                aria-describedby={`${uid}-username-hint`}
              />
              <span className="field-hint" id={`${uid}-username-hint`}>
                1-10 letters, digits, _ or space. It appears on the
                leaderboards.
              </span>
            </div>
          )}
          {hasEmail && (
            <div className="field">
              <label htmlFor={`${uid}-email`}>Email</label>
              <input
                id={`${uid}-email`}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="player@vault.gg"
                autoComplete="email"
                disabled={pending}
              />
            </div>
          )}
          {hasPassword && (
            <div className="field">
              <label htmlFor={`${uid}-password`}>
                {mode === "reset" ? "New password" : "Password"}
              </label>
              <input
                id={`${uid}-password`}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                disabled={pending}
              />
              {mode === "login" ? (
                <Link
                  className="field-link"
                  href={`/forgot-password${query}`}
                  prefetch={false}
                >
                  Forgot password?
                </Link>
              ) : (
                <span className="field-hint">
                  8 to 72 characters with uppercase, lowercase, a digit and a
                  symbol.
                </span>
              )}
            </div>
          )}
          {mode === "reset" && (
            <div className="field">
              <label htmlFor={`${uid}-confirm`}>Repeat new password</label>
              <input
                id={`${uid}-confirm`}
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={pending}
              />
            </div>
          )}

          <div className="auth-error" role="alert" aria-live="polite">
            {error}
          </div>

          <button
            className="btn lg press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? copy.busy : copy.submit}
          </button>
        </form>

        {hasTabs && (
          <>
            <div className="auth-divider">OR CONTINUE WITH</div>
            <OAuthButtons next={next} onError={setError} />
          </>
        )}

        <div className="auth-switch">
          {mode === "login" && (
            <>
              New here? <Link href={`/signup${query}`}>Create an account</Link>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <Link href={`/login${query}`}>Log in</Link>
            </>
          )}
          {mode === "forgot" && (
            <>
              Remembered it? <Link href={`/login${query}`}>Back to login</Link>
            </>
          )}
          {mode === "reset" && (
            <>
              Link expired? <Link href="/forgot-password">Get a new one</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
