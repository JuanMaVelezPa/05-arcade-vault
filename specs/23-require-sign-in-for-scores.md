# 23 — Require sign-in to submit scores

**State:** Implemented
**Depends on:** 06-games-and-scores-tables, 22-auth-sign-in-sign-up
**Date:** 2026-10-19

**Objective:** Only signed-in players can submit a score, each score is stored with the account that earned it and is named after that account's `profiles.username`, and signed-out players get a login/sign-up prompt at GAME OVER instead of the initials field.

## Why this spec exists

Spec 22 shipped accounts and left score submission anonymous on purpose. This is the follow-up it announced. Today `submitScore` trusts a client-supplied `playerName` and the `scores` table accepts inserts from `anon` with any name, so anyone can post as anyone. Authorization here means only one thing: the database and the server action decide who a score belongs to, never the client.

Current state read in the repo:

- `app/actions/scores.ts` validates `playerName` and `score`, inserts `game_id, player_name, score` with the publishable-key client.
- `0001_games_and_scores.sql`: policy "anyone can submit a score" (`to anon, authenticated with check (true)`) and `grant insert (game_id, player_name, score)`.
- `components/GamePlayer.tsx` shows an initials input plus SAVE SCORE in the GAME OVER modal and also uses `name` in the HUD "Player" stat.
- `lib/auth.ts` already has `getCurrentUser()`; `app/player/[id]/page.tsx` is a server component that renders `<GamePlayer game={game} />`.
- Next migration number is `0009` (`0008_profiles.sql` exists).

## Scope

**In:**

- Migration `supabase/migrations/0009_scores_require_user.sql` (applied through the Supabase MCP):
  - Delete all existing rows in `public.scores` (they have no owner).
  - Add `scores.user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`.
  - A `BEFORE INSERT` trigger `public.set_score_player_name()` that overwrites `new.player_name` with `profiles.username` for `new.user_id` (so the name cannot be spoofed); it raises an error if the profile does not exist.
  - Drop policy "anyone can submit a score"; create "signed-in users submit their own score" `for insert to authenticated with check (user_id = auth.uid())`.
  - `revoke insert on public.scores from anon, authenticated`, then `grant insert (game_id, score) on public.scores to authenticated`. `player_name` and `user_id` are not client-writable.
  - Index `scores_user_id_idx` on `(user_id)`.
  - Regenerate `lib/supabase/database.types.ts`; run `get_advisors`.
- `app/actions/scores.ts`: `submitScore({ gameId, score })` drops `playerName`. It requires a session (`getCurrentUser()`), returns `{ ok: false, error: "SIGN IN TO SAVE YOUR SCORE" }` otherwise, re-validates `gameId` and `score` (integer 0..10,000,000), inserts only `game_id` and `score`, then revalidates `/game/[id]` and `/hall-of-fame` as today.
- `app/player/[id]/page.tsx`: calls `getCurrentUser()` and passes `username: string | null` to `GamePlayer` (new optional prop).
- `components/GamePlayer.tsx`:
  - Remove the initials input and the `name` state. The HUD "Player" stat shows `username`, or `GUEST` when signed out.
  - GAME OVER modal, signed in: final score plus SAVE SCORE (no input), with the existing saving, error/RETRY and "SCORE SAVED" states, plus a line `SAVING AS <USERNAME>`.
  - GAME OVER modal, signed out: final score plus the message `SIGN IN TO SAVE YOUR SCORE` and two buttons, LOGIN and SIGN UP, linking to `/login?next=/player/<id>` and `/signup?next=/player/<id>`. PLAY AGAIN and BACK TO VAULT stay in both states. The score is not kept across the login redirect.
  - Playing stays open to everyone; only saving is gated.
- Account-aware home page and game detail (signed-in vs signed-out):
  - `app/page.tsx` calls `getCurrentUser()` and passes `user: CurrentUser | null` to `HomeLanding`.
  - Hero: "✦ CREATE ACCOUNT" goes to `/signup` instead of `/games` (leftover from before accounts existed; already applied in the working tree on 2026-10-19) and is not rendered when signed in, leaving only "▶ EXPLORE GAMES".
  - Pricing card: the "START FREE →" button goes to `/signup` when signed out and keeps going to `/games`, labeled "PLAY NOW →", when signed in.
  - FAQ "DO I NEED TO CREATE AN ACCOUNT?" answer updated to the new rule: you can play as a guest, but you need a free account to save your score and appear on the ranking.
  - `app/game/[id]/page.tsx`: when signed out, a line under TOP SCORES, `SIGN IN TO APPEAR ON THE RANKING`, with LOGIN and SIGN UP links carrying `?next=/game/<id>`; not shown when signed in.
  - Home/detail copy changes only; no new data, no new routes.
- Modal styles in `app/globals.css` only if the new prompt needs a class that does not exist yet; reuse `.btn`, `.save-error`, `.toast-saved`.
- Manual QA with Playwright (signed out, signed in, direct POST), screenshots in `.playwright-screenshots/`.
- Update `CLAUDE.md` (Architecture: score submission, Auth sentence "Playing and score submission are still anonymous", Database section) and mark the spec `Implemented`.

**Out of scope (for future specs):**

- Keeping an unsaved score and auto-submitting it after login.
- A "my scores" view, highlighting the player's own rows, profile pages.
- Deleting or editing a score, one-score-per-game limits, roles, admin, moderation.
- Editing the username (the denormalized `player_name` assumes the username is final, as decided in spec 22).
- Rate limiting beyond Supabase defaults, CAPTCHA, anti-cheat on the score value.
- Showing the user's name differently on leaderboards (`game_stats` and `game_champions` keep using `player_name`).
- Gating `/player/[id]` or any other route.
- Personalizing the home page beyond hiding sign-up CTAs (greeting, "welcome back", the user's stats).

## Data model

```sql
-- supabase/migrations/0009_scores_require_user.sql (shape, not final SQL)
delete from public.scores;

alter table public.scores
  add column user_id uuid not null default auth.uid()
  references auth.users (id) on delete cascade;

create index scores_user_id_idx on public.scores (user_id);

-- trigger public.set_score_player_name() (fixed search_path), BEFORE INSERT:
--   new.player_name := (select username from public.profiles where user_id = new.user_id);
--   raise exception if null

drop policy "anyone can submit a score" on public.scores;
create policy "signed-in users submit their own score" on public.scores
  for insert to authenticated with check (user_id = auth.uid());

revoke insert on public.scores from anon, authenticated;
grant  insert (game_id, score) on public.scores to authenticated;
```

```ts
// app/actions/scores.ts
export async function submitScore(input: {
  gameId: string;
  score: number;
}): Promise<SubmitScoreResult>; // { ok: true } | { ok: false; error: string }

// components/GamePlayer.tsx
interface GamePlayerProps {
  game: Game;
  username?: string | null; // from getCurrentUser(); null/undefined = signed out
}
```

Conventions:

- `scores.player_name` stays (views and leaderboards read it) but is written only by the trigger, from `profiles.username`.
- `user_id` is never sent by the client; its default is `auth.uid()` and the policy checks it.
- The `player_name` CHECK constraint still holds because `profiles.username` uses the same rule.
- `game_stats` and `game_champions` are unchanged; they start empty after the delete.

## Implementation plan

1. Migration `0009`: delete rows, add `user_id`, trigger, policy, grants, index. Apply through the Supabase MCP, run `get_advisors`, regenerate `database.types.ts`. Check with `execute_sql` using a test user (set `request.jwt.claims` / `role authenticated`): insert gets the profile username as `player_name`; insert as `anon` fails; insert with another `user_id` fails; then delete the test data. The app still builds; the old action now fails to insert (expected until step 2), so do steps 1 and 2 in the same working session.
2. `app/actions/scores.ts`: new `submitScore({ gameId, score })` with the session check and the new error text. Manual test: direct POST signed out returns the sign-in error and writes nothing.
3. `app/player/[id]/page.tsx` and `GamePlayer`: add the `username` prop, remove initials input and `name` state, HUD shows username or `GUEST`, call the new `submitScore`. Manual test: signed in, finish a game, SAVE SCORE stores one row named after the username.
4. GAME OVER modal signed-out state: message plus LOGIN and SIGN UP links with `?next=/player/<id>`. Use `/frontend-design` for the layout. Manual test at 360, 390 and 768 px wide and landscape 667x375.
5. Account-aware UI: `app/page.tsx` passes `user` to `HomeLanding`; hero CREATE ACCOUNT (to `/signup`, hidden when signed in), pricing button and FAQ copy as in Scope; sign-in hint under TOP SCORES in `app/game/[id]/page.tsx`. Manual test: `/` and `/game/asteroids` signed out and signed in.
6. QA with Playwright (signed out, signed in, error and retry states), screenshots in `.playwright-screenshots/`, then `format:check`, `lint`, `build`. Update `CLAUDE.md` and mark the spec `Implemented`.

## Acceptance criteria

- [x] After the migration, `select count(*) from scores` is 0, `scores.user_id` is `NOT NULL` with a FK to `auth.users`, and `game_stats.plays` is 0 for every game.
- [x] A client using the publishable key without a session cannot insert into `scores` (permission or RLS error).
- [x] A signed-in client cannot insert a row with another user's `user_id`, and cannot set `player_name` (column not granted).
- [x] An insert by a signed-in user stores `player_name` equal to that user's `profiles.username`, whatever the client sends.
- [x] A direct POST to `submitScore` without a session returns `SIGN IN TO SAVE YOUR SCORE` and writes nothing.
- [x] A direct POST with a non-integer, negative or over-10,000,000 score, or a non-string `gameId`, returns an error and writes nothing.
- [x] Signed out, a game can be played to GAME OVER and the modal shows the score, the sign-in message, LOGIN, SIGN UP, PLAY AGAIN and BACK TO VAULT, with no initials input.
- [x] LOGIN and SIGN UP in the modal link to `/login?next=/player/<id>` and `/signup?next=/player/<id>`, and after signing in the user lands on that player page.
- [x] Signed in, the modal has no initials input, shows `SAVING AS <USERNAME>`, and SAVE SCORE stores exactly one row and then shows `SCORE SAVED`.
- [x] The saved score appears on `/game/<id>` and, if it is the best, on `/hall-of-fame` under the account's username.
- [x] A failed save shows the inline error and the button reads RETRY (same behavior as before).
- [x] The HUD "Player" stat shows the username when signed in and `GUEST` when signed out.
- [x] Deleting the auth user deletes their scores (cascade).
- [x] Signed out, clicking "CREATE ACCOUNT" in the home hero navigates to `/signup`.
- [x] Signed in, the home hero has no "CREATE ACCOUNT" button.
- [x] Pricing button: signed out it reads "START FREE →" and opens `/signup`; signed in it reads "PLAY NOW →" and opens `/games`.
- [x] The FAQ account answer says an account is needed to save scores and no longer says anyone can save as a guest.
- [x] `/game/<id>` shows `SIGN IN TO APPEAR ON THE RANKING` with LOGIN and SIGN UP links (`?next=/game/<id>`) only when signed out.
- [x] `scrollWidth <= innerWidth` on `/player/asteroids` with the GAME OVER modal open at 360x640, 390x844 and 667x375; clean console.
- [x] `get_advisors` reports no new security warning for `scores`.
- [ ] `npm run format:check`, `npm run lint` and `npm run build` pass. (lint and build pass; format:check only flags two untouched specs, `18-frogger-skins.md` and `game-jam/frogger/01-frogger-core.md`)

## Decisions taken and discarded

- **Yes:** signed-out GAME OVER shows a LOGIN / SIGN UP prompt with `?next=` back to the player (user choice). Reuses spec 22's `safeNext` rule, no new redirect code.
- **No:** keeping the pending score and auto-submitting after login. Needs client storage of an unauthenticated score and a second submit path; it goes in its own spec if wanted.
- **No:** a disabled SAVE button with only a hint. Worse UX for the same code.
- **Yes:** player name locked to `profiles.username` (user choice, recommended). The name is set by a DB trigger, not by the action, so a direct insert cannot spoof it either.
- **No:** prefilled but editable initials. Names would stop mapping to accounts.
- **Yes:** delete all existing anonymous scores and make `user_id` `NOT NULL` (user choice). Leaderboards restart clean; the cost is losing current scores, which is why this is flagged here before `/spec-impl`.
- **No:** nullable `user_id` with old rows kept. Rejected by the user; it would also leave ownerless rows forever.
- **Yes:** `user_id` defaults to `auth.uid()` and the client has no grant on it, plus an RLS `with check`. Two layers: the grant and the policy.
- **Yes:** keep `player_name` as a denormalized column filled by trigger. Views and queries keep working unchanged, and no join is needed on leaderboards.
- **Yes:** authorization limited to ownership of inserts (user choice). Roles, delete-own-score and "my scores" are later specs.
- **Yes (default):** playing stays open to signed-out players; only saving is gated.
- **Yes:** home "CREATE ACCOUNT" button points to `/signup` and is hidden for signed-in users (user request). Included here because these are the entry points to the account the score gate now requires.
- **Yes:** other sign-in-related surfaces get the same treatment (user request): pricing button, FAQ copy and the sign-in hint on the game detail leaderboard. All driven by `getCurrentUser()`, no new data.
- **No:** other pages (About, Hall of Fame, Games browser) are unchanged; they have no sign-up CTA or score-saving copy.
- **No:** a greeting or user stats on the home page; separate spec if wanted.
- **Yes (default):** no change to `game_stats` / `game_champions` / `lib/catalog.ts`.

## Identified risks

| Risk                                                            | Mitigation                                                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Deleting scores is irreversible                                 | Stated in Decisions; the migration is applied only when `/spec-impl` runs, after the user approves this spec.        |
| App broken between migration and action change                  | Plan steps 1 and 2 are done in the same session on the spec branch; nothing is deployed in between.                  |
| Trigger fails and blocks every score                            | Trigger raises a clear error if the profile is missing; tested with a user that has a profile and one that does not. |
| Username later becomes editable, making `player_name` stale     | Out of scope here; spec that adds username editing must update `scores.player_name` or switch to a join.             |
| Session expires while the GAME OVER modal is open               | The action re-checks the session and returns the sign-in error; the modal shows it inline.                           |
| Score value is still client-reported (anyone signed in can lie) | Accepted, same as before; anti-cheat is out of scope. Ownership is enforced, truthfulness is not.                    |

## What is **not** in this spec

Keeping an unsaved score across login, "my scores" or profile pages, editing or deleting scores, one-score-per-game limits, roles or admin, username editing, rate limiting, CAPTCHA, anti-cheat, protecting any route. Each goes in its own spec.
