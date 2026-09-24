# 07 — Published Games Only

**State:** Implemented
**Depends on:** 05-asteroids-game, 06-games-and-scores-tables
**Date:** 2026-09-24

**Objective:** Add an `is_published` flag to the `games` table so that only published games (for now just ASTEROIDS) are visible anywhere in the app. Unpublished games return 404 and can't receive scores.

## Scope

### In scope

- A versioned SQL migration at `supabase/migrations/0002_games_is_published.sql`, applied to the hosted project (`bawmqxekwcabsuhdyxes`) with the Supabase MCP `apply_migration` tool. It:
  - adds `is_published boolean not null default false` to `public.games`;
  - sets `is_published = true` for `asteroids` only. The other 8 rows stay in the table with `false`;
  - replaces the `"games are public"` select policy with `"published games are public"`: `using (is_published)`;
  - replaces the `"anyone can submit a score"` insert policy so that `with check` requires the `game_id` to be a published game.
- Regenerated `lib/supabase/database.types.ts` (Supabase MCP `generate_typescript_types`), so `GameRow` includes `is_published`.
- `lib/catalog.ts`: `getGames()`, `getGame(id)`, and `getChampions()` also filter with `.eq("is_published", true)` on the `games` query. This is an explicit guard on top of RLS.
- What this looks like in the app, now with only ASTEROIDS:
  - `/` (home) "GAMES AVAILABLE NOW" shows only the ASTEROIDS card.
  - `/games` grid shows only ASTEROIDS.
  - `/game/<unpublished-id>` and `/player/<unpublished-id>` (for example `/game/rocas`) return the 404 page, the same as an unknown id.
  - `/hall-of-fame` ALL GAMES champions table has one row (ASTEROIDS), and the tabs are `ALL GAMES` and `ASTEROIDS`. `?game=<unpublished-id>` falls back to ALL GAMES, as an unknown id already does.
  - `submitScore()` for an unpublished `gameId` is rejected by the RLS insert policy and returns the existing `"SAVE FAILED — TRY AGAIN"` result.
- `/games` category chips: `components/GamesBrowser.tsx` shows `ALL` plus only the categories from `CATEGORIES` that have at least one published game, in the order `CATEGORIES` uses. For now that's `ALL` and `SHOOTER`.

### Not in scope

- Teasers for unpublished games (`COMING SOON` cards, locked tabs, a locked info page). They are fully hidden.
- A `status` column or any state beyond published/unpublished.
- An admin UI to publish games. Publishing a game is a manual `update public.games set is_published = true where id = '…'` through SQL/MCP.
- Removing the simulated arena in `components/GamePlayer.tsx`. It stays, but no published game reaches it for now.
- The home page's hard-coded copy (`12+ GAMES` stat, hero, "All games available", "New games every month"). It stays as it is.
- Deleting the 8 unpublished rows or their scores. They stay in the DB.
- Changes to `game_stats`, `game_champions`, or the `scores` select policy.

## Data model

### `supabase/migrations/0002_games_is_published.sql`

```sql
alter table public.games
  add column is_published boolean not null default false;

update public.games set is_published = true where id = 'asteroids';

drop policy "games are public" on public.games;
create policy "published games are public" on public.games
  for select to anon, authenticated
  using (is_published);

drop policy "anyone can submit a score" on public.scores;
create policy "anyone can submit a score to a published game" on public.scores
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_id and g.is_published
    )
  );
```

Why the views keep working: `game_stats` is `security_invoker` and starts from `games`, so RLS already limits it to published games. `game_champions` reads only `scores`, but `getChampions()` builds its result from the `games` list, so unpublished champions never show.

### `lib/types.ts`

No change. `Game` does not expose `is_published`, because every `Game` the app receives is published.

### `components/GamesBrowser.tsx` (derived chips)

```ts
const categories = useMemo(
  () =>
    CATEGORIES.filter(
      (c) => c === "ALL" || games.some((g) => g.category === c),
    ),
  [games],
);
```

## Implementation plan

1. **Migration.** Write `supabase/migrations/0002_games_is_published.sql` and apply it with MCP `apply_migration`. Check with `execute_sql` that only `asteroids` has `is_published = true`. Run `get_advisors` (security) and fix any new warning. Regenerate `lib/supabase/database.types.ts`. The app now shows only ASTEROIDS, because RLS filters the rows.
2. **Explicit guard in the data module.** Add `.eq("is_published", true)` to the `games` queries in `getGames()`, `getGame()`, and `getChampions()` in `lib/catalog.ts`. The behavior doesn't change, but the filter no longer depends only on RLS.
3. **Category chips.** In `components/GamesBrowser.tsx`, render the derived `categories` list instead of `CATEGORIES`. `/games` now shows `ALL` and `SHOOTER`.
4. **QA.** Run `npm run dev` and use the Playwright MCP tools (screenshots in `.playwright-screenshots/`). Check that `/` and `/games` show only ASTEROIDS and that `/games` shows only the `ALL` and `SHOOTER` chips. Check that `/game/rocas` and `/player/rocas` return 404 and that `/game/asteroids` and `/player/asteroids` still work. Check that `/hall-of-fame` has one champion row and the tabs `ALL GAMES` and `ASTEROIDS`, and that `/hall-of-fame?game=rocas` falls back to ALL GAMES. Play ASTEROIDS, save a score, and check that it shows on the boards. Use `curl` against the REST API with the publishable key to confirm that `GET /games` returns only ASTEROIDS and that `POST /scores` with `game_id: "rocas"` is rejected. With `execute_sql`, delete only the QA score rows created in this step (keep the existing ASTEROIDS row). Run `npm run build` and `npm run lint`.

## Acceptance criteria

- [ ] `supabase/migrations/0002_games_is_published.sql` exists in the repo and is applied. `games` has the `is_published` column, and only `asteroids` is `true`. The other 8 rows still exist.
- [ ] `get_advisors` (security) reports no new errors for `games` or `scores`.
- [ ] `lib/supabase/database.types.ts` includes `is_published` in `games`.
- [ ] `/` and `/games` render exactly one game card: ASTEROIDS.
- [ ] `/games` shows only the `ALL` and `SHOOTER` category chips.
- [ ] `/game/rocas`, `/player/rocas`, and every other unpublished id return the 404 page. `/game/asteroids` and `/player/asteroids` render as before.
- [ ] `/hall-of-fame` ALL GAMES shows exactly one row (ASTEROIDS), and the tab row is `ALL GAMES` and `ASTEROIDS`. `/hall-of-fame?game=rocas` shows ALL GAMES.
- [ ] Saving an ASTEROIDS score from the GAME OVER modal still inserts a row, and the score shows on `/game/asteroids` and `/hall-of-fame?game=asteroids`.
- [ ] With the publishable key, `GET /rest/v1/games` returns only the `asteroids` row, and a `POST /rest/v1/scores` with `game_id: "rocas"` is rejected.
- [ ] Running `update public.games set is_published = true where id = 'rocas'` makes ROCKS show up in `/games` with its chip (`SHOOTER`, already visible) without code changes. Revert it afterward.
- [ ] The QA score rows are deleted at the end, and the ASTEROIDS row that existed before this spec is kept.
- [ ] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: an `is_published boolean` column on `games`.** Explicit user decision. Unpublished rows keep their seeded copy, and publishing a game is a one-line UPDATE.
- **No: deleting the 8 unbuilt games.** They'd have to be seeded again, with their copy, when each game is built.
- **No: a `status` column (`live` / `coming_soon` / `hidden`).** Nobody needs a third state yet.
- **Yes: unpublished game URLs return 404.** Explicit user decision. It reuses the existing `notFound()` path.
- **Yes: unpublished games are fully hidden, with no teasers.** Explicit user decision ("I only should view for now the Asteroid game").
- **Yes: only show category chips that have published games.** Explicit user decision. Chips with no games would only lead to `NO RESULTS`.
- **No: changing the home `12+ GAMES` stat or removing the simulated arena.** Explicit user decision. Both are left as they are.
- **Yes (default): enforce visibility in RLS (`using (is_published)`) and also filter explicitly in `lib/catalog.ts`.** RLS stops the public REST API from listing hidden games. The explicit filter keeps the app correct if a privileged client is ever used.
- **Yes (default): the scores insert policy requires a published game.** Otherwise anyone with the publishable key could fill hidden games' boards before launch.
- **Yes (default): `default false` for new rows.** A newly seeded game stays hidden until someone publishes it on purpose.
- **Yes (default): no change to `lib/types.ts`.** Every `Game` in the app is published, so the flag would always be `true`.

## Identified risks

| Risk                                                                                                  | Mitigation                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dropping and re-creating the policies in the wrong order leaves `games` unreadable or `scores` closed | Everything runs in a single `apply_migration` (one transaction). QA checks `/` and a score save right after.                                                             |
| The `exists` subquery in the scores insert policy is itself subject to `games` RLS                    | That's what we want: an unpublished game isn't visible, so the check fails. The QA `curl` POST for `rocas` confirms it, and an ASTEROIDS save confirms the allowed path. |
| A newly built game is shipped but never published, so it seems to be missing                          | The acceptance criterion on publishing `rocas` shows that a single UPDATE is enough. It's documented in Scope as the publishing method.                                  |
| The home "GAMES AVAILABLE NOW" section and `12+ GAMES` stat look odd with one game                    | Accepted for now (explicit user decision). The copy can be revised in its own spec.                                                                                      |

## What is **not** in this spec

- `COMING SOON` teasers and a status column.
- An admin UI for publishing games.
- Removing the simulated arena.
- Updating the home page's static copy.

Each one of those, if it lands, goes in its own spec.
