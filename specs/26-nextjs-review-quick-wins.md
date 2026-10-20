# 26 — Next.js review quick wins

**State:** Implemented
**Depends on:** 03-about-page-and-contact-email, 22-auth-sign-in-sign-up, 23-require-sign-in-for-scores, 25-security-audit-fixes
**Date:** 2026-10-20

**Objective:** Apply the low-risk improvements from the Next.js 16 code review (per-render dedupe, page metadata, loading and 404 UI, contact route and `submitScore` hardening, footer cleanup) without changing the rendering model.

## Why this spec exists

A review against the Next.js 16.2 docs (context7) found duplicate Supabase calls per request, generic page titles, no streaming or 404 UI, and a few rough edges in the contact route. The larger Cache Components migration is deliberately left for its own spec.

## Scope

**In:**

- `lib/auth.ts`: wrap `getCurrentUser` in React `cache()`, so the layout and the page share one `getClaims()` + `profiles` lookup per render.
- `lib/catalog.ts`: wrap `getGame` in `cache()`, so `generateMetadata` and the page share one query.
- `generateMetadata` in `app/game/[id]/page.tsx` (title `<Game> · Arcade Vault`, description from `game.short`) and `app/player/[id]/page.tsx` (title `Play <Game> · Arcade Vault`). Unknown id returns `{ title: "Game not found · Arcade Vault" }`.
- `loading.tsx` for `app/games`, `app/game/[id]` and `app/hall-of-fame`, in the neon style (reuse `.av-bg` tokens and `.pixel`; a "LOADING..." line is enough, no skeleton art).
- `app/not-found.tsx`: branded 404 in the neon style with a `BACK TO VAULT` link to `/`.
- `app/api/contact/route.ts`:
  - build `new Resend(...)` inside the `try`.
  - recipient from `process.env.CONTACT_TO_EMAIL`; if missing, respond 500 with the existing generic error and log server-side.
  - best-effort in-memory rate limit per client IP (`x-forwarded-for`, first value): 5 requests per 10 minutes, then 429 `{ error: "Too many requests. Please try again later." }`.
- `.env.example`: add `CONTACT_TO_EMAIL=`.
- `app/actions/scores.ts`: invalid `gameId` (not a string, empty, or over 64 characters) returns `{ ok: false, error: "INVALID GAME" }`; the DB insert error path keeps `SAVE FAILED — TRY AGAIN`.
- `app/layout.tsx`: move the footer inline styles into an `.av-footer` rule in `app/globals.css` (the class already exists on the element).

**Out of scope (for future specs):**

- Cache Components migration: `cacheComponents: true`, `'use cache'`, `cacheLife`/`cacheTag`/`updateTag`, `<Suspense>` around the Nav user, `generateStaticParams` for `/game/[id]`.
- CSP with nonces, `sitemap.ts`, `robots.ts`, `opengraph-image`.
- Distributed rate limiting (Upstash/Redis) or CAPTCHA for the contact form; rate limiting of `submitScore`.

## Data model

This feature introduces no new persistent data.

```ts
// app/api/contact/route.ts — module-level, per server instance
const hits = new Map<string, number[]>(); // ip -> request timestamps (ms) in the window
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
```

## Implementation plan

1. `lib/auth.ts`: wrap `getCurrentUser` in `cache()`. `lib/catalog.ts`: wrap `getGame` in `cache()`. Run `npm run build`; pages still render.
2. Add `generateMetadata` to `/game/[id]` and `/player/[id]`.
3. Add `app/not-found.tsx` and the three `loading.tsx` files, with the needed rules in `app/globals.css`.
4. Contact route: Resend inside `try`, `CONTACT_TO_EMAIL`, rate limit; update `.env.example`.
5. `submitScore`: `INVALID GAME` and the `gameId` length cap; check how `GamePlayer` surfaces the error text.
6. Footer: replace the inline styles with the `.av-footer` rule. Run `npm run lint` and `npm run format:check`.

## Acceptance criteria

- [x] Loading `/game/<id>` while signed in runs the `profiles` lookup once per request (verified by counting Supabase requests in the dev server logs or a temporary `console.count`, removed afterwards).
- [x] `/game/<id>` has `<title>` `<Game> · Arcade Vault`; `/player/<id>` has `Play <Game> · Arcade Vault`.
- [x] `/game/does-not-exist` shows the branded 404 with a link to `/`, and the tab title is not "Arcade Vault".
- [x] `/games`, `/game/<id>` and `/hall-of-fame` show their loading UI during a throttled navigation.
- [x] With `RESEND_API_KEY` unset, `POST /api/contact` with a valid body returns 500 `{ error: "Failed to send message. Please try again." }` instead of throwing.
- [x] With `CONTACT_TO_EMAIL` unset, the contact route returns 500 and sends nothing.
- [x] The 6th contact POST from the same IP within 10 minutes returns 429.
- [x] `submitScore({ gameId: "", score: 10 })` and a `gameId` of 65 characters return `INVALID GAME`.
- [x] A signed-in user can still submit a valid score; a signed-out call still returns `SIGN IN TO SAVE YOUR SCORE`.
- [x] `app/layout.tsx` has no `style={{...}}` on the footer and the footer looks the same.
- [x] `npm run build`, `npm run lint` and `npm run format:check` pass.

## Decisions

- **Yes:** React `cache()` for `getCurrentUser` and `getGame`. It dedupes inside one render, adds no config and cannot serve stale data across requests.
- **No:** `'use cache'` / Cache Components now. It changes how the whole layout renders (cookies in the root layout) and needs its own spec.
- **Yes:** in-memory rate limit. Best-effort only: it resets on restart and is per instance on serverless. It stops casual abuse without a new dependency.
- **No:** Upstash/Redis or CAPTCHA. A new service for a low-traffic contact form.
- **Yes:** `CONTACT_TO_EMAIL` env var with no hardcoded fallback. A missing value fails loudly instead of mailing a stale address. Set it in `.env.local` and the hosting provider before deploying.
- **Yes:** `gameId` cap of 64 characters. Game ids are short slugs; the DB foreign key still rejects unknown ids.
- **Yes:** keep the footer text (`© 2026`, `v2.6.0`) as is. Only the styles move; deriving the version from `package.json` is not worth a build-time import here.
- **Yes:** loading UI is plain text in the neon style. Skeletons for each page are not worth the upkeep.

## Identified risks

| Risk                                                                          | Mitigation                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `x-forwarded-for` is missing or spoofable, so the limit is bypassed or shared | Fall back to a single `"unknown"` bucket; documented as best-effort       |
| `hits` map grows without bound                                                | Drop timestamps outside the window on every request and delete empty keys |
| Deploy without `CONTACT_TO_EMAIL` breaks the contact form                     | Listed in `.env.example`; the route logs the missing variable             |
| `generateMetadata` and the page both query a game                             | `getGame` is wrapped in `cache()`                                         |

## What is **not** in this spec

- Cache Components, `use cache`, tag-based revalidation, `generateStaticParams`.
- CSP, sitemap, robots, Open Graph images.
- Distributed rate limiting or CAPTCHA.
- Any database migration.

Each one, if it lands, goes in its own spec.
