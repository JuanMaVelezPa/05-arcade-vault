# 25 — Security audit fixes (2026-10-19)

**State:** Implemented
**Depends on:** 22-auth-sign-in-sign-up, 23-require-sign-in-for-scores, 24-security-hardening
**Date:** 2026-10-19

**Objective:** Close the Medium findings of the 2026-10-19 audit (`references/security/security-audit.md`): unbounded contact form input, error text leaked by the health route, the `scores` insert policy advisor WARN, migration history drift (0009) and the leaked-password-protection WARN.

## Scope

- `app/api/contact/route.ts`: limit `name` (100), `email` (254) and `message` (5000) characters; reject control characters in `name` and `email` (the name goes into the email subject); same generic error responses as today.
- `app/api/health/supabase/route.ts`: return `{ ok: false }` with status 500 and log the error server-side instead of returning `error.message`.
- New migration `0011_scores_policy_initplan.sql`: recreate the `scores` insert policy with `(select auth.uid())`.
- Migration history: register `0009_scores_require_user` in the Supabase migration history (schema is already applied, do not re-run it: it contains `delete from public.scores`).
- Manual (dashboard): enable leaked password protection.

## Data model

```sql
-- shape only
drop policy "signed-in users submit their own score" on public.scores;
create policy "signed-in users submit their own score" on public.scores
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (...published game...));
```

## Acceptance criteria

- [x] `POST /api/contact` with a `message` over 5000 characters, a `name` over 100, an `email` over 254 or a newline in `name` returns 400 and sends nothing.
- [x] `GET /api/health/supabase` never returns provider or exception text; failures return `{ ok: false }`.
- [x] `get_advisors` performance no longer lists `auth_rls_initplan` for `public.scores`.
- [x] A signed-in user can still submit a score; a signed-out POST to `submitScore` still fails.
- [x] `list_migrations` and `supabase/migrations/` match (0009 recorded, no re-run).
- [ ] `get_advisors` security no longer lists `auth_leaked_password_protection` (dashboard, Authentication > Providers > Email).

## Decisions

- Limits of 100 / 254 / 5000 characters. Yes (default)
- Health route stays public but opaque. Yes (default)
- 0009 is recorded in history without re-running its SQL. Yes (default)
- CSP, CAPTCHA and rate limiting of the contact form and `submitScore` stay out of scope (spec 24). Yes (default)
- Revoking TRUNCATE/REFERENCES/TRIGGER and view write grants stays out (Low, not reachable through PostgREST). Yes (default)

## Identified risks

| Risk | Mitigation |
| ---- | ---------- |
| Contact form used to send huge or header-injected mail | Length and control-character checks before calling Resend |
| Policy rewrite leaves a window with no insert policy | Drop and create in one transaction |
| Re-running 0009 deletes all scores | Register history only, never re-apply |
