# 06 — Games and Scores Tables

**State:** Implemented
**Depends on:** 01-mvp-screens, 02-home-landing-and-games-route, 04-supabase-connection, 05-asteroids-game
**Date:** 2026-09-23

**Objective:** Move the game catalog and the leaderboards to Supabase. A `games` table becomes the only source of the catalog. A `scores` table stores one row per saved run and feeds the `/game/[id]` leaderboards and the `/hall-of-fame` page, which has a general ALL GAMES champions view plus one tab per game. The GAME OVER modal saves to that table through a Server Action.

## Scope

### In scope

- A versioned SQL migration at `supabase/migrations/0001_games_and_scores.sql`, applied to the hosted project (`bawmqxekwcabsuhdyxes`) with the Supabase MCP `apply_migration` tool. It creates:
  - the `games` table, seeded with the 9 current entries from `lib/data.ts` (same ids, titles, copy, category, cover, color, in the current order);
  - the `scores` table (one row per saved run);
  - the `game_stats` view (`best` and `plays` per game, derived from `scores`);
  - the `game_champions` view (the #1 score row of each game, for the ALL GAMES tab);
  - RLS policies and grants. Anyone can read `games`, `scores`, `game_stats`, and `game_champions`. Anyone can insert into `scores`, but only the `game_id`, `player_name`, and `score` columns. Nobody can update or delete through the API.
- Generated TypeScript types at `lib/supabase/database.types.ts` (Supabase MCP `generate_typescript_types`). `getSupabase()` and `getSupabaseBrowser()` are typed with `Database`.
- A server-only data module at `lib/catalog.ts` (`import "server-only"`) with `getGames()`, `getGame(id)`, `getTopScores(gameId, limit)`, and `getChampions()`. It maps DB rows to the app's `Game` and `ScoreRow` types.
- A Server Action at `app/actions/scores.ts` (`"use server"`) that exports `submitScore()`. It validates the input and inserts with `getSupabase()`. Then it calls `revalidatePath` for `/game/[id]` and `/hall-of-fame`.
- Every page that reads the catalog reads it from Supabase:
  - `/` (home): `app/page.tsx` becomes a server component that fetches the games and renders the current client landing, moved to `components/HomeLanding.tsx`, passing `games` as a prop. The landing looks the same.
  - `/games`: `app/games/page.tsx` becomes a server component that fetches the games. The current filter UI moves to `components/GamesBrowser.tsx` (client) and receives `games` as a prop.
  - `/game/[id]` and `/player/[id]`: `getGame(id)`. `notFound()` still fires when the game doesn't exist.
  - `/hall-of-fame`: becomes a server component. The selected tab comes from `?game=<id>`. With no `?game`, or with an unknown id, the page shows the ALL GAMES tab. The tab chips become `<Link>`s, and `ALL GAMES` is the first chip (`/hall-of-fame`).
- `best` and `plays` shown in `GameCard` and on `/game/[id]` come from `game_stats`. A game with no scores shows `0` for Global Best and `NEW` for Plays. Otherwise, Plays shows the count formatted with `toLocaleString("en-US")`.
- Real leaderboards:
  - `/game/[id]` TOP SCORES shows the top 10 rows for that game. With no rows, it shows `NO SCORES YET — BE THE FIRST`.
  - `/hall-of-fame` (ALL GAMES tab, the default) shows the champions table: one row per game in `sort_order`, with the columns GAME, PLAYER, SCORE, and DATE. The GAME cell links to `/hall-of-fame?game=<id>`. A game with no scores shows `---` for player and score, with no date. This tab has no podium. A game's raw score is only compared against scores of the same game, never across games.
  - `/hall-of-fame?game=<id>` shows the top 12 rows for that game. Podium slots with no row show `---` for the name and score, with no date. With no rows at all, the table shows the same `NO SCORES YET — BE THE FIRST` line.
  - Ranking order: `score` desc, then `created_at` asc (whoever got there first ranks higher). The date shows as `DD/MM/YYYY` from `created_at` in UTC.
- The GAME OVER modal in `components/GamePlayer.tsx` calls `submitScore({ gameId, playerName, score })`:
  - The SAVE SCORE button is disabled and shows `SAVING…` while the action is pending.
  - If the input is invalid or the insert fails, it shows an inline error line under the input and the button becomes `RETRY`. Already-typed initials are kept.
  - On success it shows the existing `▸ SCORE SAVED_` toast.
  - Initials are required: trimmed, 1–10 characters, `A–Z`, `0–9`, `_`, or space. The input already uppercases and cuts at 10 characters.
- An `app/error.tsx` boundary that renders a styled `VAULT OFFLINE` panel with a `TRY AGAIN` button (`reset()`) and a `BACK TO VAULT` link. It shows up when a catalog or leaderboard query throws.
- Removals: `GAMES`, `PLAYERS`, and `seededScores()` from `lib/data.ts` (`CATEGORIES` stays there). Also `lib/scores.ts` (localStorage `saveScore`, `av_scores` key) and the `SavedScore` type.

### Not in scope

- Auth, user accounts, or tying scores to a user id. Scores are anonymous initials, as they are today.
- Anti-cheat, server-side score verification, rate limiting, or CAPTCHA. The publishable key can insert any score that passes the constraints (see Identified risks).
- Moderation tools: editing, hiding, or deleting scores from the UI.
- Realtime leaderboard updates. Boards refresh when the page loads.
- Cross-game rankings that mix raw scores from different games, player point rankings, per-player profiles, or pagination past the top 10 or 12.
- The home page's static copy: the `12+ GAMES` stat, the hero, and the activity feed stay hard-coded.
- Migrating existing `localStorage` `av_scores` entries. They are ignored, and nothing reads the key anymore.
- A bundled offline copy of the catalog.
- The Supabase CLI or a local stack. Migrations are applied through MCP.
- A `categories` table. `CATEGORIES` stays a constant in `lib/data.ts`, and the DB enforces it with a CHECK constraint.

## Data model

### `supabase/migrations/0001_games_and_scores.sql`

```sql
create table public.games (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  title       text not null,
  tagline     text not null,          -- was Game.short
  description text not null,          -- was Game.long
  category    text not null check (category in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover       text not null,          -- CSS class, e.g. 'cover-asteroids'
  color       text not null,          -- 'cyan' | 'magenta' | 'green' | ...
  sort_order  integer not null unique,
  created_at  timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null check (player_name ~ '^[A-Z0-9_ ]{1,10}$' and player_name = btrim(player_name)),
  score       integer not null check (score between 0 and 10000000),
  created_at  timestamptz not null default now()
);

create index scores_leaderboard_idx on public.scores (game_id, score desc, created_at asc);

create view public.game_stats
with (security_invoker = true) as
select g.id as game_id,
       coalesce(max(s.score), 0)::integer as best,
       count(s.id)::integer               as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games are public"  on public.games  for select to anon, authenticated using (true);
create policy "scores are public" on public.scores for select to anon, authenticated using (true);
create policy "anyone can submit a score" on public.scores for insert to anon, authenticated with check (true);

revoke insert, update, delete on public.scores from anon, authenticated;
grant  insert (game_id, player_name, score) on public.scores to anon, authenticated;
revoke insert, update, delete on public.games from anon, authenticated;
grant  select on public.game_stats to anon, authenticated;

create view public.game_champions
with (security_invoker = true) as
select distinct on (s.game_id)
       s.game_id, s.player_name, s.score, s.created_at
from public.scores s
order by s.game_id, s.score desc, s.created_at asc;

grant  select on public.game_champions to anon, authenticated;

-- seed: the 9 current entries from lib/data.ts, sort_order 1..9 in current order
insert into public.games (id, title, tagline, description, category, cover, color, sort_order) values
  ('bloque-buster', 'BLOCK BUSTER', '…', '…', 'ARCADE', 'cover-bricks', 'cyan', 1),
  -- … the other 8, copied verbatim from lib/data.ts (asteroids = 9)
  ;
```

Because the grant only covers `game_id`, `player_name`, and `score`, clients can't set `id` or `created_at`.

### App types (`lib/types.ts`)

```ts
export interface Game {
  id: string;
  title: string;
  short: string; // from games.tagline
  long: string; // from games.description
  category: string;
  cover: string;
  color: string;
  best: number; // game_stats.best
  plays: number; // game_stats.plays (was a string like "12.4K")
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // DD/MM/YYYY, UTC
}

export interface Champion {
  game: Pick<Game, "id" | "title" | "color">;
  champion: Omit<ScoreRow, "rank"> | null;
}
// SavedScore is removed.
```

### `lib/catalog.ts` (server-only)

```ts
export async function getGames(): Promise<Game[]>; // ordered by sort_order; throws on Supabase error
export async function getGame(id: string): Promise<Game | null>; // null when not found; throws on Supabase error
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>; // throws on Supabase error
export async function getChampions(): Promise<Champion[]>; // one entry per game in sort_order; champion is null when the game has no scores
```

`getGames()`/`getGame()` read `games` and `game_stats` (two queries or an embedded select) and merge them by id.

### `app/actions/scores.ts`

```ts
"use server";

export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

export async function submitScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SubmitScoreResult>;
```

Validation happens before the insert: `playerName` is trimmed and must match `^[A-Z0-9_ ]{1,10}$` (otherwise `"ENTER 1-10 LETTERS, DIGITS OR _"`). `score` must be an integer from 0 to 10,000,000 (otherwise `"INVALID SCORE"`). If the insert fails, the result is `"SAVE FAILED — TRY AGAIN"`. The raw Supabase error is logged on the server and never returned.

## Implementation plan

1. **Migration and seed.** Write `supabase/migrations/0001_games_and_scores.sql`, copying the 9 entries from `lib/data.ts` verbatim. Apply it with MCP `apply_migration`. Check it with `list_tables` and `get_advisors` (security), and fix any advisor warning about RLS or the view. Generate `lib/supabase/database.types.ts` and type both Supabase clients with `Database`. The app still runs from `lib/data.ts`.
2. **Data module.** Add `lib/catalog.ts` with `getGames`, `getGame`, and `getTopScores`. Change `Game.plays` to `number` in `lib/types.ts` and update `GameCard` and `/game/[id]` to show `NEW` for `0`. Temporarily map the static `plays` strings so the app still builds. Nothing reads the new module yet.
3. **Catalog from the DB.** Read `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` and `10-error-handling.md` first. Then switch `/player/[id]` and `/game/[id]` (game info only) to `getGame()`. Split `/` into server `app/page.tsx` + `components/HomeLanding.tsx`. Split `/games` into server `app/games/page.tsx` + `components/GamesBrowser.tsx`. Add `app/error.tsx`. Remove `GAMES` from `lib/data.ts`. Every page looks the same, but the data comes from Supabase.
4. **Real leaderboards.** Switch the `/game/[id]` TOP SCORES list to `getTopScores(id, 10)` and add its empty state. Convert `/hall-of-fame` to a server component driven by `?game=`. With no `?game`, it renders the ALL GAMES champions table from `getChampions()`. With a game, it uses `getTopScores(game, 12)`, with the `---` podium placeholders and the empty state. Remove `seededScores` and `PLAYERS`. The boards are empty for now.
5. **Save through the Server Action.** Read `07-mutating-data.md` first. Add `app/actions/scores.ts`. Wire the GAME OVER modal to `submitScore` with the pending, error/RETRY, and saved states. Delete `lib/scores.ts` and `SavedScore`. Saved scores now show up on the boards.
6. **QA.** Run `npm run dev` and use the Playwright MCP tools (screenshots in `.playwright-screenshots/`). Check that `/`, `/games`, `/game/asteroids`, `/player/asteroids`, and `/hall-of-fame` render. Check that the empty states show. Play ASTEROIDS and save a score, then check that the score shows on `/game/asteroids` and `/hall-of-fame?game=asteroids`, that it shows as the ASTEROIDS champion on `/hall-of-fame`, and that Global Best and Plays update. Check that an empty name shows the validation error. Check that a simulated game (`/player/bloque-buster`) → END → SAVE also works. Blank `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`, restart the server, and check the `VAULT OFFLINE` panel, then restore the key. Use `curl` against the REST API with the publishable key to confirm that UPDATE and DELETE on `scores`, and INSERT on `games`, are rejected. Delete the QA score rows with `execute_sql` at the end. Run `npm run build` and `npm run lint`.

## Acceptance criteria

- [x] `supabase/migrations/0001_games_and_scores.sql` exists in the repo and is applied: `list_tables` shows `games` (9 rows) and `scores`, both with RLS enabled.
- [x] `get_advisors` (security) reports no errors for `games`, `scores`, or `game_stats`.
- [x] `lib/supabase/database.types.ts` exists, and both Supabase clients are typed with `Database`.
- [x] `lib/data.ts` no longer exports `GAMES`, `PLAYERS`, or `seededScores`. `lib/scores.ts` and the `SavedScore` type no longer exist. No code references `av_scores`.
- [x] `/`, `/games`, `/game/[id]`, `/player/[id]`, and `/hall-of-fame` render the 9 games from Supabase in `sort_order`. Titles, copy, and covers are identical to before.
- [x] `/game/unknown-id` and `/player/unknown-id` still return the 404 page.
- [x] With no scores for a game, `/game/<id>` shows `NO SCORES YET — BE THE FIRST`, Global Best `0`, and Plays `NEW`.
- [x] With no scores for the selected game, `/hall-of-fame?game=<id>` shows `---` in all three podium slots and the empty-state line.
- [x] Saving a score from the GAME OVER modal inserts one `scores` row with the right `game_id`, `player_name`, and `score`. After the save, `/game/<id>` and `/hall-of-fame?game=<id>` list it with today's date, it becomes that game's champion on `/hall-of-fame` if it is the top score, and Global Best and Plays reflect it.
- [x] `/hall-of-fame` with no `?game` shows the ALL GAMES tab selected: one row per game (9) in `sort_order`, each game's #1 score, `---` for games with no scores, and no podium.
- [x] A champion's GAME cell links to `/hall-of-fame?game=<id>`. An unknown `?game` value falls back to ALL GAMES.
- [x] Leaderboards order by score desc. When scores tie, the earlier row ranks higher. `/game/[id]` shows at most 10 rows, and `/hall-of-fame` shows at most 12.
- [x] The Hall of Fame tabs are links that change `?game=`, and loading `/hall-of-fame?game=asteroids` directly selects the ASTEROIDS tab.
- [ ] SAVE SCORE with empty initials shows an inline error and inserts nothing. While saving, the button is disabled and shows `SAVING…`.
- [x] When the insert fails, the modal shows `SAVE FAILED — TRY AGAIN` and a `RETRY` button, and it keeps the typed initials.
- [ ] Using the publishable key against the REST API, an UPDATE or DELETE on `scores` and an INSERT on `games` are rejected. An INSERT on `scores` that sets `created_at` is rejected.
- [x] With the publishable key blanked, catalog pages show the `VAULT OFFLINE` panel instead of crashing.
- [x] QA rows are deleted from `scores` at the end, and `scores` is empty on handoff.
- [x] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: `games` table as the single catalog source.** Explicit user decision. `lib/data.ts` keeps only `CATEGORIES`.
- **No: an FK-only reference table, or a mirror synced from `lib/data.ts`.** Either one leaves two catalogs that can drift apart.
- **Yes: one `scores` row per saved run.** Explicit user decision. It matches arcade-cabinet boards, where the same initials can show up more than once.
- **No: best-per-player upsert.** With no auth, anyone can claim someone else's initials, so "one row per player" is meaningless.
- **Yes: writes go through a Server Action with an RLS insert policy.** Explicit user decision. Validation runs on the server and again in DB constraints, and there's no public JSON endpoint to maintain.
- **No: direct browser-client insert, or a `POST /api/scores` route.** The first puts validation only in the DB. The second adds API surface that nothing else needs.
- **Yes: column-level insert grant (`game_id`, `player_name`, `score`).** Clients can't backdate `created_at` to win ties.
- **Yes: remove the localStorage `av_scores` save.** Explicit user decision. Nothing ever read it.
- **Yes: `best` and `plays` derived from `scores` through the `game_stats` view.** Explicit user decision. Real numbers replace the fake `12.4K` values. `plays` counts saved runs, not started runs.
- **No: static `best`/`plays` columns.** They would stay fake forever.
- **Yes: empty states, no seeded fake scores.** Explicit user decision. `seededScores` and `PLAYERS` are deleted.
- **Yes: SQL migration files in the repo, applied via MCP, with generated types.** Explicit user decision. The schema is versioned in git without needing Docker in WSL2.
- **Yes: an `app/error.tsx` `VAULT OFFLINE` panel when Supabase fails.** Explicit user decision.
- **No: a bundled fallback catalog.** It would bring back a second source of truth.
- **Yes (default): `tagline`/`description` column names, mapped to `short`/`long` in `lib/catalog.ts`.** The DB gets descriptive names, and the UI components don't change.
- **Yes (default): `sort_order` column.** It keeps the current catalog order, which the home mini-rail (`slice(0, 6)`) depends on.
- **Yes: the Hall of Fame has a general ALL GAMES view (the default) and per-game tabs.** Explicit user decision. The general view lists each game's champion, so games with very different score scales stay fair.
- **Yes: one shared `scores` table with a `game_id` column, not one table per game.** Each leaderboard is a filtered query, and adding a game only needs a row in `games`.
- **No: a mixed raw top 12 across games.** High-scoring games like DROP would fill the whole list.
- **No: a player point ranking.** It needs a player identity, which doesn't exist without auth. It belongs in a future spec.
- **Yes (default): the Hall of Fame tab lives in `?game=`.** It lets the page be a server component, and tabs become shareable links.
- **Yes (default): ties break by earlier `created_at`.** That's the classic arcade rule.
- **Yes (default): server/client split for `/` and `/games`.** Both pages are client components today. A server `page.tsx` fetches the data and passes it to the moved client component, so the UI code stays the same.
- **Yes (default): pages render dynamically per request.** They already are dynamic, since `getSupabase()` reads cookies. `revalidatePath` after an insert keeps the client router cache fresh.

## Identified risks

| Risk                                                                                                                   | Mitigation                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anyone with the publishable key (it's public) can insert fake high scores straight through the REST API                | CHECK constraints cap the score and name format, and the column grant blocks backdating. Real anti-cheat and rate limiting are out of scope; any cleanup meanwhile is manual SQL. |
| Every catalog page now depends on Supabase, so an outage or a paused free-tier project takes the site down             | The `app/error.tsx` `VAULT OFFLINE` panel with retry. The health route from spec 04 still diagnoses the connection.                                                               |
| `security_invoker` view or missing grants make `game_stats` return nothing for anon                                    | `get_advisors` in step 1, plus a QA check that Global Best and Plays update after a save.                                                                                         |
| Seed copy drifts from `lib/data.ts` during the move (typos, lost accents)                                              | Copy verbatim in step 1, then compare `/games` and `/game/[id]` visually against screenshots from before the change.                                                              |
| Converting `/` and `/games` to server components breaks client-only behavior (`useRouter`, reveal animations, filters) | Keep all interactive code in the moved client components unchanged. Only the data source changes, and it arrives as a prop.                                                       |
| QA leaves test scores in the production table                                                                          | The last QA step deletes them with `execute_sql`, and an acceptance criterion requires `scores` to be empty.                                                                      |

## What is **not** in this spec

- Auth and user-linked scores.
- Anti-cheat, rate limiting, and moderation.
- Realtime leaderboards.
- Migrating old `localStorage` scores.

Each one of those, if it lands, goes in its own spec.
