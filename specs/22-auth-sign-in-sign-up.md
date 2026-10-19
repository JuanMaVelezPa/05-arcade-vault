# 22 — Auth: sign-in, sign-up, OAuth and password reset

**State:** Implemented
**Depends on:** 04-supabase-connection, 06-games-and-scores-tables
**Date:** 2026-10-19

**Objective:** Let players create an account and sign in with email + password (confirmed by email), Google or GitHub on `/login` and `/signup`, with a `profiles` username, a forgot/reset password flow, a signed-in Nav menu and sign out, without changing how scores are submitted.

## Why this spec exists

The user asked for sign-in, sign-up and authentication, and chose to also require sign-in to submit scores. That touches auth UI, provider setup, a database change, the score flow and the Nav, so it was split in two:

- **Spec 22 (this one):** accounts and sessions only. Playing and score submission stay anonymous exactly as today.
- **Spec 23 (to be written next):** require sign-in to submit scores (`scores.user_id`, RLS, `submitScore`, game-over modal, using `profiles.username` as the player name).

`proxy.ts` and `lib/supabase/proxy.ts` already refresh the session with `getClaims()`, and `lib/supabase/server.ts` and `client.ts` already create `@supabase/ssr` clients, so the session plumbing exists. What is missing is the screens (including password reset), the callback route, the profile and the Nav state.

## Scope

**In:**

- Routes `/login` and `/signup` (`app/login/page.tsx`, `app/signup/page.tsx`) in the neon style, built with `/frontend-design`, working at 360, 390 and 768 px wide.
  - Email + password form, a Google button and a GitHub button on both pages, and a link between the two pages.
  - `/signup` also asks for a username (see Data model).
  - `/login` has a "Forgot password?" link to `/forgot-password`.
- Password reset: `/forgot-password` (`app/forgot-password/page.tsx`) takes an email and sends a reset link; `/reset-password` (`app/reset-password/page.tsx`) lets the user, arriving from that link with a recovery session, set a new password (8..72 characters, entered twice), then signs them in and redirects to `/games`. Without a recovery session `/reset-password` redirects to `/forgot-password`.
- Server actions in `app/actions/auth.ts`: `signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`. They re-validate all input on the server (email format, password 8..72 characters, username rule) because server actions accept direct POSTs.
- OAuth through `supabase.auth.signInWithOAuth` for `google` and `github`, started from a client button using `lib/supabase/client.ts`.
- Email confirmation: after `signUp` the page shows a "CHECK YOUR INBOX" state; the user cannot sign in until the link is opened. Signing in with an unconfirmed email shows a clear error.
- Auth callback route `app/auth/callback/route.ts`: exchanges the `code` for a session (OAuth, email confirmation and password recovery), then redirects to `next`.
- Return to the previous page: links carry `?next=<path>`; `next` is accepted only if it is a same-origin relative path (starts with `/`, not `//`, no scheme), otherwise `/games`.
- Migration `supabase/migrations/0008_profiles.sql` (applied through the Supabase MCP): `public.profiles`, RLS and the trigger that creates a profile on sign-up. Regenerate `lib/supabase/database.types.ts` afterwards.
- `lib/auth.ts` (`server-only`): `getCurrentUser()` returns `{ id, email, username } | null`, reading the claims and the profile.
- `components/Nav.tsx`: signed out shows a LOGIN link (desktop bar and mobile panel); signed in shows the username and a SIGN OUT button. The server layout passes the user to `Nav` as a prop.
- A "Manual setup" checklist (below) for the Supabase dashboard and provider consoles.

**Out of scope (for future specs):**

- Requiring sign-in to submit scores, `scores.user_id`, RLS changes on `scores` and any change to `submitScore` or the game-over modal (spec 23).
- Change password while signed in, change email, delete account.
- Editing the username or a profile page.
- Linking several providers to one account, magic link, phone or other providers.
- Roles, admin features, rate limiting beyond Supabase defaults, CAPTCHA.
- Protecting any existing route: every current page stays public.

## Data model

```sql
-- supabase/migrations/0008_profiles.sql
create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique
             check (username ~ '^[A-Z0-9_ ]{1,10}$' and username = btrim(username)),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.profiles from anon, authenticated;
-- trigger public.handle_new_user() (security definer, fixed search_path) on auth.users
-- insert: creates the profile from raw_user_meta_data.username, or derives one
-- from the OAuth name/email local part (uppercased, invalid chars -> '_', cut to 10,
-- numeric suffix on collision).
```

```ts
// lib/auth.ts
export interface CurrentUser {
  id: string; // auth.users.id
  email: string;
  username: string; // profiles.username
}
```

Conventions:

- Username rule is the same as `scores.player_name` (`^[A-Z0-9_ ]{1,10}$`) so spec 23 can use it directly as the player name. The form uppercases input before validating.
- Clients never write `profiles`; only the trigger does.
- Session cookies are managed by `@supabase/ssr`; no tokens in `localStorage`.

## Implementation plan

1. Migration `0008_profiles.sql`: table, RLS, grants, trigger. Apply through the Supabase MCP, run `get_advisors`, regenerate `database.types.ts`. Check with `execute_sql` that inserting a test user creates a profile, then delete the test user.
2. `lib/auth.ts` with `getCurrentUser()` and a `safeNext()` helper for the `next` rule. The app still behaves as before.
3. `app/auth/callback/route.ts`: exchange `code`, redirect to `safeNext(next)`; on error redirect to `/login?error=auth`.
4. `app/actions/auth.ts`: `signUp` (validates, calls `auth.signUp` with `data.username` and `emailRedirectTo` = callback), `signIn`, `signOut`, `requestPasswordReset` (calls `auth.resetPasswordForEmail` with `redirectTo` = callback with `next=/reset-password`; always returns the same success result, whether or not the email exists) and `updatePassword` (requires a session, validates, calls `auth.updateUser({ password })`). Return `{ ok, error }` objects like `submitScore`; no thrown errors for user mistakes.
5. `/login` and `/signup` pages and a shared `components/AuthForm.tsx` (form, error line, loading state, "CHECK YOUR INBOX" state) and `components/OAuthButtons.tsx`. Use `/frontend-design`. Manual test: invalid input shows an error; a valid sign-up shows the inbox state.
6. `/forgot-password` and `/reset-password` pages reusing `AuthForm`, plus the "Forgot password?" link on `/login`. Manual test: unknown email still shows the neutral "IF THE EMAIL EXISTS, A LINK IS ON ITS WAY" state; `/reset-password` signed out redirects to `/forgot-password`.
7. Nav: pass the user from `app/layout.tsx` into `Nav`; LOGIN link or username + SIGN OUT in the bar and in the mobile panel.
8. QA with Playwright (UI and error states), screenshots in `.playwright-screenshots/`, then `format:check`, `lint`, `build`. Add the new routes and the migration to `CLAUDE.md` (Architecture) and mark the spec `Implemented`.

## Manual setup (before QA of OAuth and email)

Done by the user in dashboards; none of it can be done from the repo.

- Supabase → Authentication → Providers: enable Email with "Confirm email" on (the default "Reset Password" email template must keep the `{{ .ConfirmationURL }}` link), enable Google and GitHub with their client IDs and secrets.
- Supabase → Authentication → URL Configuration: Site URL `http://localhost:3000`, redirect URLs include `http://localhost:3000/auth/callback` (and the production URL when deployed).
- Google Cloud and GitHub OAuth apps: callback URL is the one Supabase shows for each provider.
- Email delivery: the built-in Supabase mailer is rate limited; use custom SMTP if confirmation or reset emails do not arrive.

## Acceptance criteria

- [x] `/login` and `/signup` render with an email field, a password field, a Google button and a GitHub button, and link to each other.
- [x] `/signup` rejects an invalid email, a password shorter than 8 characters and an invalid or taken username, each with an error line.
- [x] A valid sign-up shows "CHECK YOUR INBOX" and creates exactly one `auth.users` row and one `profiles` row with the chosen username.
- [x] Signing in before confirming the email fails with an error that says the email is not confirmed.
- [x] After opening the confirmation link the user is signed in and lands on the `next` path.
- [x] Google and GitHub sign-in create a session and a `profiles` row with a valid username (`^[A-Z0-9_ ]{1,10}$`), including when two users derive the same name.
- [x] `next=https://evil.com`, `next=//evil.com` and `next=javascript:x` all redirect to `/games`; `next=/game/asteroids` redirects there.
- [x] Signed out, the Nav shows LOGIN (bar and mobile panel); signed in, it shows the username and a SIGN OUT button that ends the session and refreshes the Nav.
- [x] The session survives a page reload and a navigation to `/player/asteroids`.
- [x] `/login` links to `/forgot-password`; submitting any valid email there shows the same neutral confirmation, for registered and unregistered emails.
- [x] The reset link opens `/reset-password` with a session; a password shorter than 8 characters or two different entries show an error and change nothing.
- [x] After a valid reset the user is signed in, redirected to `/games`, and the old password no longer works while the new one does.
- [x] `/reset-password` opened without a recovery session redirects to `/forgot-password`, and a direct POST to `updatePassword` without a session returns an error.
- [x] A direct POST to the sign-up action with invalid data returns an error and writes nothing.
- [x] A client using the publishable key cannot insert, update or delete `profiles` rows and can select them.
- [x] Score submission still works for a signed-out user exactly as before (no change in `app/actions/scores.ts`).
- [x] `scrollWidth <= innerWidth` on `/login` and `/signup` at 360x640, 390x844 and 667x375; clean console.
- [x] `get_advisors` reports no new security warning for `profiles`.
- [x] `npm run format:check`, `npm run lint` and `npm run build` pass.

## Decisions taken and discarded

- **Yes:** Supabase Auth with `@supabase/ssr` cookies. Already installed and wired through `proxy.ts`.
- **Yes:** email + password, Google and GitHub (user choice). Magic link and other providers are discarded to keep the slice narrow.
- **Yes:** email confirmation required (user choice). Costs a callback route and an inbox state; needs working SMTP.
- **Yes:** split into spec 22 (auth) and spec 23 (score gating), recommended and accepted. Auth can ship and be verified without touching the leaderboard.
- **Yes:** separate `/login` and `/signup` pages (user choice) over a modal or a single toggled page; easy to link and to QA.
- **Yes:** `profiles` table with a unique username using the `player_name` rule, so spec 23 needs no mapping.
- **Yes:** `?next=` return path with a same-origin check (user choice); open redirects are the main risk.
- **Yes:** dashboard and provider setup is a manual checklist (user choice). OAuth and the confirmation email are verified by the user; Playwright covers UI and error states.
- **Yes (default):** password length 8..72 (72 is the bcrypt limit); no composition rules.
- **Yes (default):** username final after sign-up in this spec; editing it needs its own spec.
- **No:** gating any route or the score flow here.
- **No:** storing the username only in `user_metadata`; it must be unique and queryable.
- **Yes:** password reset by email link (user request, added after the first draft). Without it, email/password users with a forgotten password have no way back in.
- **Yes (default):** the reset link reuses the callback route and lands on `/reset-password` through `next`, so there is one code-exchange path.
- **Yes (default):** neutral response on `/forgot-password` to avoid account enumeration.
- **No:** change password while signed in; needs a settings page, so it goes in its own spec.

## Identified risks

| Risk                                                  | Mitigation                                                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Open redirect through `next`                          | `safeNext()` allows only `/`-prefixed paths not starting with `//`; covered by criteria.                        |
| Trigger failure blocks all sign-ups                   | Trigger derives a fallback username and retries a numeric suffix; tested with a collision.                      |
| Supabase mailer rate limit stalls confirmation emails | Manual setup lists custom SMTP; the inbox state does not claim the email was delivered.                         |
| Account enumeration through sign-up/sign-in errors    | Generic "invalid credentials" message; only the unconfirmed case is called out.                                 |
| Reset link reused or expired                          | Supabase links are single-use and expire; the callback sends failures to `/forgot-password` with an error line. |
| Reset page reachable without a recovery session       | Page and `updatePassword` both check the session server-side.                                                   |

## What is **not** in this spec

Requiring sign-in for scores (spec 23), `scores.user_id`, change password while signed in, username editing, profile pages, account deletion, extra providers, magic link, roles, route protection, CAPTCHA.
