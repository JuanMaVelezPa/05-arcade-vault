# 27 — Production migration kit

**State:** Implemented
**Depends on:** 22-auth-sign-in-sign-up, 23-require-sign-in-for-scores, 24-security-hardening, 25-security-audit-fixes
**Date:** 2026-10-20

**Objective:** Give the user everything needed to rebuild the Dev Supabase project (schema, `games` data, configuration) in a new Production project that Claude cannot access: a guarded migration, a read-only verification script and a step-by-step runbook.

## Why this spec exists

There are two Supabase projects. Dev (`.mcp.json`) is the only one Claude can query. Production must end up with the same schema, policies, triggers, grants and catalog, plus the dashboard settings that SQL cannot carry. A fresh project may lack `public.rls_auto_enable()` (created only with automatic RLS), which would make migration `0010` fail.

## Scope

**In:**

- `supabase/migrations/0010_revoke_rls_auto_enable.sql`: the revoke runs only when `to_regprocedure('public.rls_auto_enable()')` is not null. Same effect in Dev.
- `supabase/verify-production.sql`: one read-only query returning RLS flags, policies, view options, function privileges, triggers, table and column grants, `scores` columns, `games` rows, row counts and applied migrations, as JSON to diff between Dev and Production.
- `references/production-migration.md`: runbook (prerequisites, CLI and SQL Editor paths, verification, auth dashboard settings, environment variables, smoke test, ongoing process, rollback).
- `CLAUDE.md`: one line pointing to the runbook.

**Out of scope:**

- Migrating Dev users, profiles and scores (test data; scores depend on `auth.users`).
- Running anything against Production, or changing Dev.
- Setting up hosting, the domain or CI deployment of migrations.
- A CSP header and other new hardening.

## Decisions

- **Yes (default):** schema and `games` rows come from the migration files, not a `pg_dump` of Dev. Same result, no Dev credentials, and the repo stays the source of truth.
- **Yes (default):** no user or score data is migrated; Production starts with empty leaderboards.
- **Yes (default):** Supabase CLI `db push` is the main path, SQL Editor the fallback.
- **Finding:** Dev's `schema_migrations` entry for `0009` is only a stub (`delete from public.scores; -- recorded for history only`). The repo file is authoritative; Dev's live state was checked against it (`user_id` column, insert policy, both triggers, `authenticated` INSERT on `game_id, score` only) and matches. The other ten entries match the repo files with comments stripped.
- **Finding:** the `game_stats` and `game_champions` views carry Supabase's default grants (INSERT, UPDATE, DELETE, TRUNCATE for `anon` and `authenticated`) in Dev. Both views aggregate, so they are not updatable and writes fail; Production gets the same. Revoking them is a separate hardening spec.

## Acceptance criteria

- [x] `0010` is idempotent: in Dev the guard is true, so the revoke still applies; on a project without the function it does nothing.
- [x] `verify-production.sql` runs read-only in Dev and its output matches the expected values listed in the runbook.
- [x] The runbook lists every setting from specs 22 and 24 that lives only in the dashboard, plus SMTP, the second GitHub OAuth App and the Production environment variables.
- [x] (User) `npx supabase db push --dry-run` lists exactly 0001–0011 and `db push` succeeds on Production.
- [x] (User) `verify-production.sql` output is identical in Dev and Production except row counts.
- [x] (User) The smoke test in the runbook passes on the production URL.
