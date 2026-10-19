# 24 — Security hardening from the security checklist

**State:** Implemented
**Depends on:** 06-games-and-scores-tables, 22-auth-sign-in-sign-up, 23-require-sign-in-for-scores
**Date:** 2026-10-19

**Objective:** Close every item in `references/security/security-checklist.md`: confirm RLS on `games` and `scores`, revoke public EXECUTE on `rls_auto_enable()`, add security headers in Next.js, and set the Supabase Auth password and rate-limit settings through a manual checklist.

## Why this spec exists

The checklist lists five basic items plus three Supabase advisor warnings (two for `public.rls_auto_enable()`, one for leaked password protection). Part of it lives in the repo (headers, a migration) and part only in the Supabase dashboard, so the spec separates what code can fix from what the user must set by hand.

State read in the repo and the database on 2026-10-19:

- RLS is already enabled on `games`, `scores` and `profiles` (`pg_class.relrowsecurity = true`). That checklist item is a verification, not a change.
- `app/actions/auth.ts` already validates passwords at 8..72 characters on the server, but the Supabase Auth setting is separate: a direct call to the Auth API with the publishable key bypasses the app, so the dashboard minimum must also be 8.
- `public.rls_auto_enable()` is a `SECURITY DEFINER` event-trigger helper that auto-enables RLS on new `public` tables. It was created by Supabase tooling, not by our migrations, and `anon` and `authenticated` can call it through `/rest/v1/rpc/rls_auto_enable`.
- `next.config.ts` only sets `allowedDevOrigins`; no security headers are sent.
- Next migration number is `0010` (`0009_scores_require_user.sql` exists).

## Scope

**In:**

- RLS verification: a read-only `execute_sql` check that `games` and `scores` (and `profiles`) have RLS enabled, recorded in the QA step. No SQL change unless the check fails.
- Migration `supabase/migrations/0010_revoke_rls_auto_enable.sql` (applied through the Supabase MCP): `revoke execute on function public.rls_auto_enable() from public, anon, authenticated`. The event trigger keeps working because event triggers fire without an EXECUTE grant on the caller. Then run `get_advisors` (security).
- Security headers in `next.config.ts` through `headers()`, source `/(.*)`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains` (browsers ignore it over plain `http://localhost`)
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- Manual setup checklist for the Supabase dashboard (below): minimum password length 8, password requirements (lowercase, uppercase, digits, symbols), leaked password protection, sign-up/sign-in rate limit.
- Password composition rule in the app (added after approval): `validPassword` in `app/actions/auth.ts` also requires at least one lowercase letter, one uppercase letter, one digit and one symbol (non-alphanumeric); `INVALID_PASSWORD` and the sign-up/reset hint in `components/AuthForm.tsx` say so. Login is unchanged so existing accounts can still sign in.
- Update `CLAUDE.md` (Architecture: a line on security headers and the revoked function) and mark the spec `Implemented`.

- Path protection in the Next.js proxy (added after approval, per https://nextjs.org/docs/app/getting-started/proxy): `lib/supabase/proxy.ts` `updateSession` already calls `getClaims()`; it also redirects from that result. Rules, kept in one constant so a new protected path is one line: signed-out on `/reset-password` → `/forgot-password`; signed-in on `/login` and `/signup` → `safeNext(?next)` (default `/games`). Game, score, Hall of Fame, About and `/forgot-password` stay public. Redirects keep the refreshed session cookies. This is an optimistic check only: `/reset-password` keeps its page-level check, `getCurrentUser()`, the server actions and RLS remain the real protection.

**Out of scope (for future specs):**

- Content-Security-Policy. It needs allowlists for Supabase, self-hosted fonts, inline styles/scripts and canvas, and can break pages, so it gets its own spec.
- CAPTCHA (Turnstile/hCaptcha) on sign-up, rate limiting of the contact form or `submitScore`, anti-cheat on score values.
- Protecting game or score routes (playing stays open, spec 23), a role or admin system, an `/account` area.
- MFA, session lifetime changes, forcing existing users to change their password.
- Moving `rls_auto_enable()` out of the `public` schema or dropping the event trigger.
- Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy headers.
- Changing any RLS policy, grant or table (the checklist item is verification only).

## Data model

This feature introduces no new data structures. It adds one migration that changes a privilege and one config export.

```sql
-- supabase/migrations/0010_revoke_rls_auto_enable.sql (shape, not final SQL)
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

```ts
// next.config.ts (shape)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];
// headers: async () => [{ source: "/(.*)", headers: securityHeaders }]
```

Conventions:

- Header values are constants in `next.config.ts`; no runtime configuration.
- The Next.js 16 docs in `node_modules/next/dist/docs/` are read before editing `next.config.ts`, per `CLAUDE.md`.

## Manual setup (Supabase dashboard)

Done by the user; none of it can be done from the repo. Authentication → Sign In / Providers and Rate Limits:

- **Minimum password length:** 8 (Auth → Sign In / Providers → Email → Minimum password length).
- **Password requirements:** "Lowercase, uppercase letters, digits and symbols" (Auth → Sign In / Providers → Email → Password Requirements). Keeps the Auth API in line with the app rule.
- **Leaked password protection:** on (Auth → Sign In / Providers → Email → Prevent use of leaked passwords). This setting needs the Pro plan; if the project is on Free, record it as not applicable in Decisions and leave the advisor warning as accepted.
- **Rate limits:** sign-ups and sign-ins per 5 minutes per IP set to 10 (Auth → Rate Limits).
- After changing them, re-run `get_advisors` (security) to confirm `auth_leaked_password_protection` is gone.

## Implementation plan

1. RLS check: run `select relname, relrowsecurity from pg_class ...` for `public` tables through `execute_sql`; all must be `true`. No file changes.
2. Migration `0010_revoke_rls_auto_enable.sql`: write the file, apply it through the Supabase MCP, confirm with `has_function_privilege` that `anon` and `authenticated` can no longer execute the function, run `get_advisors`. Confirm a throwaway `create table public.zz_rls_test (id int)` still ends with RLS enabled (then drop it).
3. `next.config.ts`: add `securityHeaders` and `headers()`, keeping `allowedDevOrigins`. Manual test: `curl -sI http://localhost:3000/` shows all five headers.
4. Smoke test the app under the new headers: `/`, `/games`, `/game/asteroids`, `/player/asteroids` playing to GAME OVER, `/login`, `/about`, with a clean console.
5. Password composition: add the lowercase/uppercase/digit/symbol check to `validPassword` and update `INVALID_PASSWORD` and the `AuthForm` hint (`app/actions/auth.ts`, `components/AuthForm.tsx`). Manual test on `/signup` and `/reset-password`: `password1`, `PASSWORD1!`, `Password!!` and `Pass1234` are rejected, `Passw0rd!` is accepted.
6. User completes the Manual setup in the dashboard; re-run `get_advisors`.
7. Path protection: add the redirect rules to `updateSession` (`lib/supabase/proxy.ts`), reusing `safeNext` from `lib/auth.ts` (check it is importable from the proxy, it is `server-only`; if not, move the pure `safeNext` to a shared file and say so). Test with `curl -sI` signed out (`/reset-password` → 307 to `/forgot-password`, `/games` and `/player/asteroids` still 200) and in the browser signed in (`/login` and `/signup` redirect to `/games`).
8. `format:check`, `lint`, `build`; update `CLAUDE.md` and mark the spec `Implemented`.

## Acceptance criteria

- [x] `relrowsecurity` is `true` for `games`, `scores` and `profiles`.
- [x] `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')` and the same for `authenticated` return `false`.
- [x] `POST /rest/v1/rpc/rls_auto_enable` with the publishable key and no session is rejected.
- [x] Creating a new table in `public` through SQL still ends with RLS enabled (the event trigger still works); the test table is dropped afterwards.
- [x] `get_advisors` (security) no longer reports `anon_security_definer_function_executable` or `authenticated_security_definer_function_executable`.
- [x] `curl -sI` on `/` returns `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `strict-transport-security` and `permissions-policy` with the values in Scope.
- [x] The same headers are present on `/game/asteroids`, `/player/asteroids` and `/api/health/supabase`.
- [ ] `/player/asteroids` still loads and plays to GAME OVER, and sign-in on `/login` still works, with a clean console.
- [x] A direct Auth API call to sign up with a 7-character password is rejected by Supabase (after the dashboard change).
- [ ] Sign-up and password reset reject passwords missing a lowercase letter, an uppercase letter, a digit or a symbol, with a message that names the rule; `Passw0rd!` is accepted. Login still accepts existing passwords.
- [x] A direct Auth API call to sign up with `password1` (no uppercase or symbol) is rejected by Supabase (after the dashboard change).
- [ ] The Supabase dashboard shows minimum password length 8 and sign-up/sign-in rate limit 10 per 5 minutes.
- [x] Leaked password protection is on and `get_advisors` no longer reports `auth_leaked_password_protection`, or the spec records it as not applicable because of the plan.
- [x] Signed out, `GET /reset-password` redirects to `/forgot-password`; `/`, `/games`, `/game/asteroids`, `/player/asteroids`, `/hall-of-fame`, `/about`, `/login`, `/signup` and `/forgot-password` still return 200.
- [ ] Signed in, `/login` and `/signup` redirect to `/games` (or to a safe `?next=`); an external `?next=` is ignored. Session cookies are still refreshed on redirects.
- [ ] `npm run format:check`, `npm run lint` and `npm run build` pass.

## Decisions taken and discarded

- **Yes:** headers are the checklist three plus HSTS and Permissions-Policy (user choice). Low risk for canvas games, Supabase and Resend; none depends on camera, microphone or geolocation.
- **No:** Content-Security-Policy here. High chance of breaking pages; it deserves its own spec with report-only first.
- **Yes:** dashboard items as a manual checklist (user choice). Same pattern as spec 22; the Management API would need an extra token and tooling for one-time settings.
- **Yes:** rate limit 10 sign-ups/sign-ins per 5 minutes per IP (user choice). Blocks bots, tolerates shared networks.
- **Yes:** revoke EXECUTE on `rls_auto_enable()` from `public`, `anon` and `authenticated` (user choice) instead of moving it out of `public`. It is a Supabase-created event-trigger helper; recreating the event trigger adds risk for no extra protection.
- **No:** `SECURITY INVOKER` for that function. It must run with owner rights to alter tables.
- **Yes:** RLS item is verification only. It is already enabled on all three tables, and policies were reviewed in specs 06, 22 and 23.
- **Yes (default):** `X-Frame-Options: DENY` with no framing exceptions; the app is not meant to be embedded.
- **Yes (default):** HSTS without `preload`, so the domain is not submitted to browser preload lists by accident.
- **Yes:** password composition rules added to this spec after approval (user choice), instead of a separate spec. Enforced in the server action and in the Supabase dashboard; login is not restricted so existing accounts keep working.
- **Yes:** path protection in the proxy added to this spec after approval (user choice), as optimistic redirects only (the Next.js docs say the proxy is not a full authorization solution). Only auth pages are gated; no game or score route is gated because playing is open by design.
- **No:** redirecting signed-in users away from `/forgot-password`; a signed-in user may still want to reset a password.
- **Yes (default):** leaked password protection depends on the Supabase plan; if unavailable it is recorded, not forced.
- **Not applicable:** leaked password protection. The project is on the Supabase Free plan (confirmed 2026-10-19), so `auth_leaked_password_protection` stays as an accepted advisor warning.

## Identified risks

| Risk                                                                  | Mitigation                                                                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Revoking EXECUTE stops the event trigger from enabling RLS            | Event triggers fire without a caller EXECUTE grant; criterion creates a test table and checks RLS.          |
| HSTS locks the production domain to HTTPS                             | Deploy target is HTTPS; no `preload` and `includeSubDomains` only, `max-age` of two years is standard.      |
| Permissions-Policy blocks a feature a future game needs               | Games use canvas, keyboard and gamepad only; a future spec that needs a feature relaxes that one directive. |
| Rate limit of 10 blocks legitimate users behind one IP                | Value chosen to tolerate shared networks; adjustable in the dashboard without a code change.                |
| Leaked password protection unavailable on the Free plan               | Recorded as not applicable; the advisor stays as an accepted warning.                                       |
| Dashboard settings drift or are forgotten because they are not in git | They are listed in Acceptance criteria and checked again with `get_advisors` and a direct Auth API call.    |

## What is **not** in this spec

Content-Security-Policy, CAPTCHA, rate limiting of the contact form or `submitScore`, anti-cheat, MFA, forcing existing users to reset, moving `rls_auto_enable()` out of `public`, COOP/COEP headers, any change to RLS policies or grants. Each goes in its own spec.
