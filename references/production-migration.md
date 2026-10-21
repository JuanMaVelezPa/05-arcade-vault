# Production migration runbook (Dev → Production Supabase)

Spec: `specs/27-production-migration.md`. Claude has no access to Production, so you run every step here yourself.

## What gets migrated

| Item                                                                                       | How                                                                        |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Tables, views, functions, triggers, RLS policies, grants                                   | Migrations `supabase/migrations/0001…0011`                                 |
| `games` catalog rows (asteroids, tetris, arkanoid, snake, frogger; `sort_order` 9–13)      | Same migrations (0001–0007 seed and clean up)                              |
| Auth settings, OAuth providers, SMTP, URL config, rate limits                              | Dashboard, by hand (step 3)                                                |
| App environment variables                                                                  | Hosting provider (step 4)                                                  |
| Dev users, profiles, scores (1 / 1 / 4 rows, test data)                                    | **Not migrated.** Production starts with empty leaderboards.               |
| Storage buckets, Edge Functions, extra extensions                                          | Nothing to migrate (Dev has none; only the default extensions are in use). |

## 0. Before you start

- Production project exists. Have at hand: **project ref**, **database password**, and the **URL + publishable key** (Settings → API).
- Production `public` schema is empty (Table Editor shows no tables). If not, stop and ask.
- Node available (`npx supabase` downloads the CLI on first use).

## 1. Schema and games data

Migration `0010` is now guarded: it only revokes on `rls_auto_enable()` when that function exists, so it works on projects created without automatic RLS.

**Option A, CLI (recommended; records the history so later `db push` runs work):**

```bash
npx supabase login
npx supabase link --project-ref <PROD_REF>      # asks for the database password
npx supabase db push --dry-run                  # must list 0001 … 0011, nothing else
npx supabase db push
```

If the CLI asks for `supabase/config.toml`, run `npx supabase init` first and do not commit anything with secrets.

**Option B, SQL Editor:** open each file in `supabase/migrations/` in order (0001 → 0011) and run it, one at a time, stopping at the first error. The history table is not filled this way, so future `db push` would try to re-run everything; use Option A for the long term.

## 2. Verify

1. Run `supabase/verify-production.sql` in the SQL Editor of **Dev** and of **Production**.
2. Compare the two JSON results (paste both into a diff tool). They must be identical except `counts.scores`, `counts.profiles` and, with Option B, `migrations`.
3. Key values to expect in Production:
   - `rls`: `games`, `profiles`, `scores` all `true`
   - `games`: asteroids 9, tetris 10, arkanoid 11, snake 12, frogger 13, all `published: true`
   - `policies`: `published games are public`, `profiles are public`, `scores are public`, `signed-in users submit their own score` (INSERT, `authenticated` only)
   - `column_privileges`: on `scores`, only `authenticated` can INSERT `game_id` and `score`
   - `functions`: `handle_new_user` and `set_score_player_name` have no EXECUTE for `anon` or `authenticated`; `handle_new_user` is `security_definer`
   - `triggers`: `on_auth_user_created` (auth.users, AFTER INSERT) and `scores_set_player_name` (scores, BEFORE INSERT)
   - `views`: `game_stats` and `game_champions` both `{security_invoker=true}`
   - `counts`: games 5, scores 0, profiles 0
4. Dashboard → Advisors (Security and Performance). Expected: only `auth_leaked_password_protection` on the Free plan.

The `table_privileges` and `column_privileges` lists also show Supabase's default grants on the views; they are identical in Dev, so they only matter if the two results differ.

## 3. Auth configuration (Production dashboard)

Copied from specs 22 and 24.

- **Authentication → Sign In / Providers → Email**: enabled; **Confirm email** on; minimum password length **8**; password requirements **lowercase, uppercase, digits and symbols**; **Prevent use of leaked passwords** on (Pro plan only).
- **URL Configuration**: Site URL = the production domain; Redirect URLs include `https://<domain>/auth/callback`.
- **Google**: in Google Cloud, add `https://<PROD_REF>.supabase.co/auth/v1/callback` to the OAuth client's authorized redirect URIs (the Dev client can be reused) and the production domain to authorized JavaScript origins. Paste client ID and secret into Production → Providers → Google.
- **GitHub**: an OAuth App has a single callback URL, so create a **second OAuth App** with `https://<PROD_REF>.supabase.co/auth/v1/callback`, and paste its ID and secret into Production → Providers → GitHub.
- **Email templates**: Confirm signup and Reset password must keep `{{ .ConfirmationURL }}`.
- **Rate Limits**: sign-ups and sign-ins **10 per 5 minutes per IP**.
- **Custom SMTP** (needed in Production; the built-in mailer allows only a few emails per hour). With Resend: host `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key, sender on a domain verified in Resend.

## 4. App environment (hosting provider, Production scope)

| Variable                               | Value                                          |
| -------------------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Production project URL                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production publishable key                     |
| `RESEND_API_KEY`                       | Resend API key (domain verified in Resend)     |
| `CONTACT_TO_EMAIL`                     | Inbox that receives the contact form messages  |

`NEXT_PUBLIC_*` values are inlined at build time, so **redeploy after setting them**. Keep Production keys out of `.env.local`.

## 5. Smoke test on the production URL

- [x] `/` and `/games` list the 5 games; `/game/asteroids` shows an empty TOP SCORES.
- [x] Sign up with email → confirmation email arrives → link signs you in → Nav shows a username (a `profiles` row exists).
- [x] Google and GitHub sign-in both work.
- [x] Play a game, finish it, save the score → it appears on `/game/<id>` and `/hall-of-fame`.
- [x] Signed out, GAME OVER shows LOGIN / SIGN UP.
- [x] Forgot password → email arrives → reset works → signed in.
- [x] Contact form on `/about` delivers an email.
- [x] `curl -sI https://<domain>/` shows `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`.

## 6. From now on

Every new `000N_*.sql` is applied to Dev first (Supabase MCP), then to Production with `npx supabase db push`. Do not change the Production schema by hand in the dashboard.

## Rollback

Production is new, so if step 1 fails partway: fix the cause, reset the Production database (Settings → Database, or drop the objects in `public`), and run step 1 again from the start.
