
## Audit 2026-10-19 (full, commit 55e1a6e)

| Area | Check | Source | Status | Severity | Notes |
| ---- | ----- | ------ | ------ | -------- | ----- |
| Actions | Input re-validation, generic errors, password rule 8..72 | app/actions/auth.ts | OK | - | `updatePassword` checks claims; reset always `ok` |
| Actions | `submitScore` session + only `game_id`, `score` | app/actions/scores.ts | OK | - | Range 0..10M checked, RLS re-checks game |
| Redirects | `safeNext` on all user targets incl. callback | lib/safe-next.ts, app/auth/callback/route.ts | OK | - | Probes `?next=` on /login signed out: 200, no redirect |
| Proxy | `getClaims()`, cookies kept on redirect | lib/supabase/proxy.ts | OK | - | `/reset-password` signed out -> 307 `/forgot-password` |
| Clients | Per-request server client, no service role, `server-only` | lib/supabase/server.ts | OK | - | No service_role refs; only `NEXT_PUBLIC_SUPABASE_*` in client |
| API | Contact input has no length limits, no control-char check on name used in subject | app/api/contact/route.ts:25-40 | Gap | Medium | Text body not HTML, so no XSS; API key not returned |
| API | Health route returns `error.message` / exception text | app/api/health/supabase/route.ts:15,26 | Gap | Medium | Public, unauthenticated |
| API | Contact and `submitScore` rate limiting | app/api/contact/route.ts | Known | Low | Unchanged, out of scope (spec 24) |
| Headers | Spec 24 headers present (probe /games) | next.config.ts | OK | - | `X-Powered-By` still sent (Low) |
| Headers | No CSP | next.config.ts | Known | Low | Out of scope (spec 24) |
| XSS | dangerouslySetInnerHTML, innerHTML, eval, document.write | app, components, lib | OK | - | No matches |
| Client trust | No name or user id sent from client | components/ | OK | - | Scores only via `submitScore` |
| Secrets | `.env*` ignored, `.env.example` empty values | .gitignore | OK | - | Only `.env.example` tracked |
| Auth | `getOrigin()` trusts `Origin` header for email redirect | app/actions/auth.ts:42 | Mitigated | Low | Supabase redirect allowlist must be set (Manual) |
| DB | RLS on games, profiles, scores | pg_class | OK | - | Views use `security_invoker=true`, no auth.users columns |
| DB | Policies match spec 22/23 | pg_policies | OK | - | scores insert: authenticated, `user_id = auth.uid()`, published game |
| DB | Grants: anon no write; authenticated insert only `game_id, score` | column_privileges | OK | - | |
| DB | anon/authenticated hold TRUNCATE, REFERENCES, TRIGGER on tables; INSERT/UPDATE/DELETE on views | role_table_grants | Gap | Low | Not exposed by PostgREST, views not updatable |
| DB | Functions search_path fixed; rls_auto_enable not executable by anon/authenticated | pg_proc | OK | - | `set_score_player_name` is not SECURITY DEFINER |
| DB | Triggers, CHECKs, `user_id` NOT NULL cascade FK | pg_trigger, pg_constraint | OK | - | |
| DB | scores insert policy re-evaluates `auth.uid()` per row | pg_policies | Gap | Medium | Advisor `auth_rls_initplan` |
| DB | Migration 0009 missing from applied history | list_migrations | Gap | Medium | Schema is applied; history lacks it. Names for 0007/0008/0010 also differ (cosmetic) |
| Dashboard | Leaked password protection disabled | advisor | Gap | Medium | Manual, verify in dashboard |

### Advisors

- security WARN `auth_leaked_password_protection`
- performance WARN `auth_rls_initplan` (`public.scores`, policy `signed-in users submit their own score`)
- performance INFO `unused_index` `scores_user_id_idx` (ignored, needed for the cascade FK)

### Not verified

- Dashboard: minimum password length / requirements, sign-up rate limit, redirect URL allowlist, provider secrets (Manual, verify in dashboard).
- Signed-in redirect of `/login` and `/signup` (no credentials allowed).
- Server answered on localhost:3000, so header and signed-out probes ran.

### Spec drafted

specs/25-security-audit-fixes.md
