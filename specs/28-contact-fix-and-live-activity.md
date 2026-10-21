# 28 — Contact form fix and real Live Activity

**State:** Implemented
**Depends on:** 03-about-page-and-contact-email, 06-games-and-scores-tables, 22-auth-sign-in-sign-up, 23-require-sign-in-for-scores, 26-nextjs-review-quick-wins
**Date:** 2026-10-21

**Objective:** Make the About contact form send messages again (missing `CONTACT_TO_EMAIL`) and replace the placeholder data in the home page's LIVE ACTIVITY and STATS sections with real data from Supabase.

## Why this spec exists

Spec 26 made `CONTACT_TO_EMAIL` mandatory with no fallback. `.env.local` only has `RESEND_API_KEY`, so `app/api/contact/route.ts` logs `CONTACT_TO_EMAIL is not set` and returns 500, and the About form shows its error terminal on every send. The code is correct; the environment is incomplete.

On the home page, `HomeLanding.tsx` still renders hardcoded `RECENT_SCORES`, `TOP_PLAYERS` and `STATS` (fake players, fake games such as `DROP` and `INVADERS`, "THOUSANDS OF MATCHES"). None of it matches the real catalog or `scores` table.

## Scope

**In:**

- **Contact fix (environment):** `CONTACT_TO_EMAIL` is set in `.env.local` by the user, to the email that owns the Resend account (the sandbox sender `onboarding@resend.dev` only delivers there). The same variable goes in the hosting provider's environment before deploying.
- `app/api/contact/route.ts`: when `RESEND_API_KEY` is missing, log `RESEND_API_KEY is not set` and return the same generic 500, so both missing variables are diagnosable from the server log. When Resend returns an `error`, log it server-side (`console.error("Resend error", error)`). Response bodies stay unchanged.
- `app/api/contact/route.ts`: the email also gets an HTML body (`html`) with the neon Arcade Vault look (dark card, cyan/magenta accents, name, email as `mailto:` link, message with preserved line breaks). Inline styles only, no images or external assets. The plain-text `text` body stays as the fallback. Every user-supplied value is HTML-escaped before it goes into the template.
- `lib/catalog.ts` (`server-only`): two new functions.
  - `getRecentScores(limit)`: the newest `limit` rows of `scores` across published games, newest first. Returns `{ player, gameId, gameTitle, gameColor, score, createdAt }`.
  - `getTopPlayers(limit)`: best single score per `player_name` among rows created in the last 24 hours, ordered by score descending, then `created_at` ascending. Returns `{ rank, player, score }`.
- `lib/types.ts`: `RecentScore` and `TopPlayer` types for the above.
- `lib/format.ts`: `formatTimeAgo(iso, now)` returning `just now`, `N min ago`, `N h ago` or `N d ago`.
- `app/page.tsx`: fetches both lists with `getGames()` and `getCurrentUser()` in the same `Promise.all`, computes the "time ago" strings on the server and passes everything to `HomeLanding`.
- `components/HomeLanding.tsx`:
  - delete `RECENT_SCORES`, `TOP_PLAYERS` and `STATS` constants; render from props.
  - LATEST SCORES shows the real rows; player name coloured by `gameColor` (`neon-<color>`), `▸ <GAME TITLE>`, `+score`, time ago.
  - TOP PLAYERS · TODAY shows the real ranking; the `tp-fill` bar width is proportional to the score relative to the #1 score (100%), not the old fixed steps.
  - Empty states: `NO SCORES YET — BE THE FIRST` in the latest card, `NO SCORES IN THE LAST 24 HOURS` in the top card. Sections are never hidden.
  - STATS strip derived from real data: first block `games.length` + `GAMES` + `AND COUNTING`; second block the sum of `games[].plays` (formatted with `toLocaleString("en-US")`, `0` shows `0`) + `RUNS SAVED` + `BY PLAYERS WORLDWIDE`; third block (`GLOBAL` / `RANKING`) stays as static copy because it makes no numeric claim.
- `app/globals.css`: only if the empty-state rows need a small rule (reuse `.tick-row` / `.top-row` tokens first).

**Out of scope (for future specs):**

- Client-side auto-refresh, polling or Supabase Realtime for the feed. The page is dynamic (cookies in the root layout), so each request already reads fresh data.
- A database view or migration for recent scores. This spec adds no migration.
- Verified Resend sending domain, rate limiting changes, CAPTCHA, or storing contact messages.
- Cache Components / `'use cache'` for the home queries.
- Hardcoded numbers elsewhere (About page highlights, footer version, pricing copy).

## Data model

This feature introduces no new persistent data. New in-memory shapes:

```ts
// lib/types.ts
export interface RecentScore {
  player: string; // scores.player_name
  gameId: string;
  gameTitle: string; // games.title
  gameColor: string; // games.color: cyan | yellow | magenta | green
  score: number;
  createdAt: string; // ISO, scores.created_at
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number; // best single score in the last 24h
}
```

Query rules:

- `getRecentScores`: `scores` ordered by `created_at` desc, limit 7, then `games` (published, id/title/color) joined in code by `game_id`. Rows whose game is not published are dropped.
- `getTopPlayers`: `scores` where `created_at >= now() - 24h`, ordered by `score` desc then `created_at` asc, limit 200; keep the first row per `player_name`, take 5. Same `is_published` rule as above.
- Both read through the per-request `getSupabase()` client; `scores` and `games` already allow public select (RLS from spec 06).

## Implementation plan

1. Contact route: add the `RESEND_API_KEY` guard and the Resend error log. Add `CONTACT_TO_EMAIL` to `.env.local` (user step; note in the final message). Manual test: `POST /api/contact` with a valid body returns 200 and the email arrives; with the variable unset it returns 500 and the log names it. Also add the HTML template (`html` next to `text`, values escaped) and check the email in Gmail.
2. About form QA in the browser (Playwright): valid message shows the success terminal; temporarily unset the variable to confirm the error terminal and that "try again" keeps the typed values.
3. Add `RecentScore` and `TopPlayer` to `lib/types.ts` and `formatTimeAgo` to `lib/format.ts`.
4. Add `getRecentScores` and `getTopPlayers` to `lib/catalog.ts`. Check with a temporary log or `execute_sql` that the rows match the DB, then remove the log.
5. `app/page.tsx`: fetch the new lists and pass props. `components/HomeLanding.tsx`: replace the constants with props, add the empty states and the real STATS numbers.
6. QA: home page with the dev data, then submit a score as the QA user and reload `/` to see it at the top of LATEST SCORES. Empty state check by temporarily filtering to a window with no rows. Run `npm run lint`, `npm run format:check` and `npm run build`.

## Acceptance criteria

- [x] With `CONTACT_TO_EMAIL` and `RESEND_API_KEY` set, submitting the About form shows the success terminal and the email arrives at `CONTACT_TO_EMAIL` with `reply-to` set to the submitter.
- [x] The email renders the HTML template (name, `mailto:` email, message with line breaks) and still carries the plain-text body; a message containing `<script>` or `<b>` shows as literal text, not markup.
- [x] With `RESEND_API_KEY` unset, `POST /api/contact` returns 500 `{ error: "Failed to send message. Please try again." }` and the server log says `RESEND_API_KEY is not set`.
- [x] With `CONTACT_TO_EMAIL` unset, behaviour is unchanged from spec 26 (500, nothing sent, log names the variable).
- [x] `HomeLanding.tsx` contains no hardcoded player names, scores or stats numbers.
- [x] LATEST SCORES lists at most 7 rows, newest first, matching `select ... from scores order by created_at desc limit 7` in Dev.
- [x] Each latest row shows the real game title, a `neon-<color>` player name from `games.color`, `+score` and a time-ago label (`just now`, `N min ago`, `N h ago`, `N d ago`).
- [x] TOP PLAYERS · TODAY lists at most 5 distinct players ordered by their best score in the last 24 hours; a player with two scores appears once with the higher one.
- [x] The `tp-fill` width of #1 is 100% and the others scale by `score / topScore`.
- [x] Submitting a new score as a signed-in user and reloading `/` shows it at the top of LATEST SCORES.
- [x] With no scores, the latest card shows `NO SCORES YET — BE THE FIRST` and the top card `NO SCORES IN THE LAST 24 HOURS`; no console errors, no layout break.
- [x] STATS shows the real published-games count and the real sum of saved runs; the third block is unchanged.
- [x] No hydration warning in the console on `/` (time-ago strings are computed on the server).
- [x] `npm run lint`, `npm run format:check` and `npm run build` pass; no new migration file is added.

## Decisions

- **Yes (default):** fix the contact form through the environment, not the code. The route behaves as designed in spec 26; the missing variable is the bug.
- **Yes (default):** keep the Resend sandbox sender. It only delivers to the Resend account owner's email, so `CONTACT_TO_EMAIL` must be that address until a domain is verified.
- **Yes (user request):** HTML email with inline styles and an escaped, hand-written template. No React Email or new dependency; the plain-text body stays for clients that block HTML.
- **No:** fallback recipient in code. It would undo the "fail loudly" decision of spec 26 and hide a misconfigured deploy.
- **Yes:** extra server logs for `RESEND_API_KEY` and Resend errors. Today a bad key and a missing recipient look identical to the user.
- **Yes (default):** top players = best single score per player in the last 24 hours, not total points. The title already says TODAY, and best-score matches how the leaderboards rank.
- **Yes:** rolling 24 hours in UTC, not calendar day. A calendar day would empty the card right after midnight.
- **Yes (default):** query `scores` directly and join `games` in code, no new view or migration. Keeps Production untouched (runbook of spec 27) and fits the existing `catalog.ts` pattern.
- **No:** polling, Realtime or `router.refresh()` timers. "Real" was the ask; the page already renders per request.
- **Yes:** per-player dedupe in code over the top 200 rows of the window. Simple and enough at current volume.
- **Yes:** STATS made real (user decision). Games count and saved runs come from data `getGames()` already returns; the `GLOBAL RANKING` block stays static copy.
- **Yes:** time-ago strings computed server-side. `HomeLanding` is a client component; computing `Date.now()` in it would cause hydration mismatches.

## Identified risks

| Risk                                                                    | Mitigation                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Resend sandbox rejects a recipient that is not the account owner        | Set `CONTACT_TO_EMAIL` to the account email; the new Resend error log shows the reason   |
| Top 200 rows come from fewer than 5 players, so the ranking is short    | Acceptable at current volume; raise the limit if it ever shows fewer than 5 real rows    |
| Player names are public data shown on the home page                     | They are already public on `/game/[id]` and `/hall-of-fame`; no new exposure             |
| Home page does two more Supabase queries per request                    | Both are small, indexed-by-sort reads and run in the same `Promise.all` as existing ones |
| `games.color` outside the four neon names would render an unstyled name | Fall back to `neon-cyan` when the value is not one of the four                           |

## What is **not** in this spec

- Auto-refreshing or Realtime activity feed.
- Database views, new migrations or changes to RLS.
- Verified Resend domain, CAPTCHA, or saving contact messages.
- Cache Components or any caching of the home queries.
- Other hardcoded copy on About, pricing or footer.

Each one, if it lands, goes in its own spec.
