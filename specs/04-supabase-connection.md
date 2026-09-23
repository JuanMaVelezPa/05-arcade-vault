# 04 — Supabase Connection

**State:** Implemented
**Depends on:** none
**Date:** 2026-09-23

**Objective:** Connect the Next.js app to the existing Supabase project (`bawmqxekwcabsuhdyxes`) through a server-only client helper, verified by a health-check API route, without wiring any feature to it yet.

## Scope

### In scope

- Adding the `@supabase/supabase-js` package as a dependency.
- Two environment variables with the `NEXT_PUBLIC_` prefix, the naming Supabase recommends for Next.js. In this spec they are read from `process.env` only in server code:
  - `NEXT_PUBLIC_SUPABASE_URL` — the project API URL.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the project's publishable (anon) key.
- Documenting both variables in the existing `.env.example` (placeholder values, no real key). The real values live in `.env.local`, which is already gitignored by the `.env*` rule in `.gitignore`.
- A server-only client helper at `lib/supabase/server.ts` that exports a `getSupabase()` function. It reads the two env vars, throws a clear error if either one is missing, and returns a `SupabaseClient` created with `createClient()`. The file starts with `import "server-only"` so any accidental import from a client component fails the build.
- A health-check endpoint at `app/api/health/supabase/route.ts` (GET) that uses `getSupabase()` to make one real network round-trip to Supabase and reports whether the connection works.

### Not in scope

- Any database table, migration, or RLS policy. The `public` schema stays empty.
- Replacing the `localStorage` score storage in `lib/scores.ts` (`av_scores` key) or the `seededScores` mock leaderboards with Supabase data — deferred to a future scores spec.
- Supabase Auth, sessions, cookies, `@supabase/ssr`, or a `proxy.ts` session refresher — deferred to a future auth spec.
- A browser-side Supabase client. The variables already carry the `NEXT_PUBLIC_` prefix so a future auth or realtime spec can add one without renaming them.
- The service-role (secret) key. It is not used anywhere in this spec.
- Generated TypeScript database types (`supabase gen types`). There are no tables to type yet.
- The Supabase CLI and a local Supabase stack.
- Any UI change. No page, Nav link, or component references Supabase.

## Data model

This feature introduces no persisted data structures and no database tables.

New in-memory shapes:

- **Env variables** (`.env.example` / `.env.local`):

  ```bash
  # Supabase project settings: https://supabase.com/dashboard/project/_/settings/api
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
  ```

- **`lib/supabase/server.ts`**

  ```ts
  export function getSupabase(): SupabaseClient;
  ```

  Throws `Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")` when an env variable is empty or undefined. Created with `auth: { persistSession: false }`, because there is no user session on the server in this spec.

- **`GET /api/health/supabase`** response bodies:

  ```ts
  // 200
  {
    ok: true;
  }
  // 500
  {
    ok: false;
    error: string;
  }
  ```

  The handler calls `supabase.storage.listBuckets()`. This call needs no tables, goes through the Supabase API gateway, and fails if the URL or key is wrong. A returned `error` or a thrown exception (including the missing-env error) produces the `500` body. The route is marked dynamic so Next.js does not cache it at build time.

## Implementation plan

1. **Add dependency and env scaffolding** — run `npm install @supabase/supabase-js server-only`. Append `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` (with the dashboard comment) to `.env.example`. Put the real URL and publishable key in `.env.local`; get them from the Supabase MCP tools `get_project_url` and `get_publishable_keys`. The app still builds and runs unchanged.
2. **Create the client helper** — add `lib/supabase/server.ts` with `import "server-only"`, env validation, and `getSupabase()` as described in the data model. Nothing imports it yet, so behavior is unchanged.
3. **Create the health-check route** — add `app/api/health/supabase/route.ts` with a GET handler that calls `getSupabase().storage.listBuckets()` and returns the `200` or `500` body. Read the Route Handler guide in `node_modules/next/dist/docs/` first to confirm the Next.js 16 conventions for dynamic route handlers.
4. **Verify manually** — run `npm run dev`, then `curl http://localhost:3000/api/health/supabase`. Check the success case with valid env values. Check the failure case by temporarily blanking `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and restarting the dev server.

## Acceptance criteria

- [x] `@supabase/supabase-js` and `server-only` appear in `package.json` `dependencies`.
- [x] `.env.example` documents `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with empty values.
- [x] No real Supabase URL-key pair or other secret is committed anywhere in the repo.
- [x] `lib/supabase/server.ts` exists, starts with `import "server-only"`, and exports `getSupabase()`.
- [x] With valid values in `.env.local`, `GET /api/health/supabase` returns `200` with `{ "ok": true }`.
- [ ] With `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` empty, `GET /api/health/supabase` returns `500` with `{ "ok": false, "error": "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" }`.
- [x] With an invalid `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` value, `GET /api/health/supabase` returns `500` with `ok: false`.
- [x] No client component imports `lib/supabase/server.ts`. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` use the `NEXT_PUBLIC_` prefix, and no secret or service-role key is defined with it.
- [x] The `public` schema in the Supabase project still has no tables.
- [x] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Quick definition without detailed clarification** — the user asked for the connection plan only and declined the broader question block (scores table, auth, runtime, migrations). The choices below are defaults picked for a connection-only slice. Revisit them in the spec that adds the first real feature.
- **Yes: connection only, no feature wiring** — explicit user decision. Scores, auth, and contact persistence each need their own data-model and RLS decisions, so each gets its own spec.
- **Yes: `@supabase/supabase-js` on the server only** — matches the existing pattern from spec 03, where external services (Resend) are called only from Route Handlers. No client code uses the client yet, so nothing Supabase-related is sent to the browser in this spec.
- **No: `@supabase/ssr` and a browser client now** — only needed for cookie-based Auth sessions. Adding it without Auth means code with no user.
- **Yes: publishable key, not service-role key** — the publishable key respects RLS. If it leaks, the damage is limited to what future RLS policies allow. The service-role key bypasses RLS and is not needed to prove the connection.
- **Yes: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the `NEXT_PUBLIC_` prefix** — this is the naming Supabase recommends for Next.js. Future Auth (`@supabase/ssr`, with a server and a browser client) and Realtime (subscriptions opened from the browser) both need these values in the browser, so the prefix avoids a later rename or a duplicated pair. Both values are public by design: the URL is not a secret, and the publishable key is restricted by RLS. Next.js only inlines them into code that runs in the browser, and no such code exists in this spec.
- **No: `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` without the prefix** — first draft of this spec. It was discarded because Auth and Realtime would force a rename later.
- **Rule for future specs: secret keys never get `NEXT_PUBLIC_`** — the service-role or secret key, if a later spec needs it, must be a server-only variable such as `SUPABASE_SECRET_KEY`.
- **Yes: `import "server-only"` guard** — turns an accidental client import into a build error instead of a silent runtime failure.
- **Yes: `storage.listBuckets()` as the health probe** — it makes a real authenticated request without needing any table. A table-based probe would force a migration into a connection-only spec.
- **No: health check rendered in the UI** — a curl-able API route is enough to verify, and it adds no visual surface to maintain.
- **No: Supabase CLI and local stack** — needs Docker in WSL2 and is not required to reach the hosted project.

## Identified risks

| Risk                                                      | Mitigation                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Env variables not set in a fresh clone or a deploy target | `getSupabase()` throws a named error, and the health route returns it in the `500` body. `.env.example` documents both variables. |
| Health route exposes a public endpoint                    | The route returns only `ok` and an error string. It does not return keys, the project URL, or bucket names.                       |
| `listBuckets()` returns an empty list under RLS           | Success is judged by the absence of `error`, not by the list content.                                                             |
| Free-tier Supabase project paused for inactivity          | The health route returns `500`. Restore the project from the Supabase dashboard.                                                  |

## What is **not** in this spec

- Database tables, migrations, or RLS policies.
- Moving scores or leaderboards from `localStorage` and mock data to Supabase.
- Supabase Auth or any browser-side Supabase client.
- The service-role key.

Each one of those, if it lands, goes in its own spec.
