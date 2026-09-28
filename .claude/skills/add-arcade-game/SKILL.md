---
name: add-arcade-game
description: >
  Import a reference game from references/started-games/ into Arcade Vault as a
  real, playable canvas game with Supabase leaderboards. Writes a spec first,
  then ports the engine, registers it, adds cover art, inserts and publishes the
  games row, and runs QA. Use for /add-arcade-game <folder>, "import/add/port a
  game", or when a references/started-games folder should become a catalog game.
argument-hint: <reference folder, e.g. 03-tetris>
---

# Add an arcade game

Turn `references/started-games/<folder>` into a published Arcade Vault game whose
scores flow into the existing leaderboards. The recipe comes from specs 05
(Asteroids port), 06 (games and scores tables) and 07 (published games only).
Read those three specs when anything below is unclear; they hold the reasoning.

The argument is the reference folder name (for example `03-tetris`). If it is
missing, list `references/started-games/` and ask which one.

## Ground rules

- **Spec first, with the `/spec` method.** Read the `/spec` skill (Step 4a)
  before creating the spec file. Write `specs/NN-<id>-game.md`, stop, and wait
  for the user's approval before touching app code or the database.
- **Narrow slice with defaults.** Port the reference gameplay as-is. Ask the user
  only about real gaps (sound on/off when the reference has sounds, pointer vs
  keyboard controls). Record defaults in the spec's Decisions section instead of
  asking broad scope menus.
- **Always a new `games` row.** Pick a new id and a new `cover-<id>` class, and
  append the row last. Never reuse or publish an existing seeded row, even when
  one looks similar (for example `caida`/DROP or `bloque-buster`/BLOCK BUSTER).
  Those stay unpublished.
- **Leaderboards need no new code.** `submitScore()` (`app/actions/scores.ts`),
  `getTopScores()` / `getChampions()` (`lib/catalog.ts`), the `game_stats` and
  `game_champions` views, and the RLS insert policy already work for any
  published game. The only DB work is the new row.
- **This is not the Next.js you know.** Read the relevant guide in
  `node_modules/next/dist/docs/` before writing Next.js code.
- **UI work uses `/frontend-design`** (CLAUDE.md rule), for example the cover art.
- **All copy in English.** Do not port Spanish strings from the reference.
- **Formatting hook.** Prettier runs on every Write/Edit and reformats the whole
  file. For small patches to legacy files, prefer Bash edits to keep diffs small.

## Step 1 — Read the reference

Read everything in `references/started-games/<folder>/`: `README.md`,
`CLAUDE.md`, `game.js`, and any `levels.js`, `specs/`, `assets/`, `style.css`.
Note:

- canvas size (logical resolution) and board layout;
- controls (keys, mouse), pause keys, restart keys;
- game states, scoring rules, lives, levels, speed-ups, power-ups;
- anything drawn as HUD or overlay text on the canvas (it moves to React);
- assets (sprites, sounds) and module-level globals (they move into a closure);
- Spanish strings to translate.

## Step 2 — Read the canonical example

- `lib/games/asteroids/engine.ts` — engine shape, input handling, pause, HUD emit.
- `components/games/GameCanvas.tsx` (or `AsteroidsCanvas.tsx` if the registry
  step has not run yet) — React wrapper, input-mode detection, touch notice.
- `components/GamePlayer.tsx` — HUD, PAUSE/END/EXIT, GAME OVER modal, save flow.
- `lib/games/registry.ts` if it exists.
- `supabase/migrations/` — latest number and the `games` columns.
- `app/globals.css` — color tokens and existing `cover-*` classes.

Check the live catalog with Supabase MCP `execute_sql`:
`select id, title, cover, sort_order, is_published from public.games order by sort_order;`

## Step 3 — Choose catalog data

- `id`: new kebab-case slug, `^[a-z0-9-]+$`, not used by any row (published or not).
- `title`: uppercase display name.
- `tagline` (short) and `description` (long): English, describe the real game.
- `category`: one of `ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS` (DB CHECK).
- `color`: an existing token name (`cyan`, `magenta`, `yellow`, `green`, …).
- `cover`: `cover-<id>`, a new CSS-only cover.
- `sort_order`: current max + 1.

## Step 4 — Write the spec with the `/spec` method, then stop

### 4a — Read the `/spec` skill first

Before creating the spec file, read the `/spec` skill from the
`Klerith/fernando-skills` package as the reference for how specs are designed and
saved. Look for it in this order and use the first hit:

1. `.agents/skills/spec/`
2. `~/.agents/skills/spec/`
3. `.claude/skills/spec/`
4. `~/.claude/skills/spec/`

Read both files in that folder:

- `SKILL.md` — the four phases (context, clarifying questions, writing, saving)
  and its hard rules.
- `template.md` — the section shapes and the global writing rules.

If the skill is not installed, tell the user it can be installed with
`npx skills@latest add Klerith/fernando-skills`, and continue with this skill's
template only.

### 4b — Apply the `/spec` phases to this game

- **Phase 1 (context).** Read `CLAUDE.md` and the two most recent specs in
  `specs/`. Match their language, state words, header format, and section
  headings. When the `/spec` template and the repo disagree (for example, the
  blockquote header), the existing specs win.
- **Phase 2 (questions).** Steps 1–3 already answer most questions. Ask only
  about real gaps that the reference and this skill's defaults leave open
  (sound, pointer vs keyboard, completion rules, catalog copy). Ask in one block
  of 3–5 questions with `AskUserQuestion`, with the recommendation first. Do not
  ask broad scope menus. If nothing is open, skip the block and say so.
- **Phase 3 (writing).** Use `references/spec-template.md` (in this skill folder)
  as the concrete skeleton. Fill every placeholder with what Steps 1–3 and the
  answers found. Follow the `/spec` template rules: a one-sentence objective, an
  explicit out-of-scope list, real names, numbered steps that each leave the app
  runnable, boolean acceptance criteria, decisions with reasons, no TODOs.
- **Phase 4 (saving).** Follow the `/spec` saving rules:
  - Take the next two-digit number from `specs/`.
  - Name the file `specs/NN-<id>-game.md`.
  - Read the date from `date +%F`; never guess it.
  - Set the state to `Draft`.
  - Check that every spec in **Depends on** exists.
  - Leave `specs/.spec-config.yml` untouched if it exists.

### 4c — Stop for approval

Show the user the spec path and a short summary (id, title, category, controls,
defaults taken). Remind the user that the spec is in `Draft` state. Do not
continue until the user approves. On approval, set the state to `Approved`.

## Step 5 — One-time registry step

Skip this step if `lib/games/registry.ts` already exists.

Asteroids is wired into `GamePlayer` with a direct `game.id === "asteroids"`
branch. Spec 05 deferred a registry until a second real game landed. That is now.
Follow `references/engine-contract.md` (in this skill folder) to:

1. Add `lib/games/types.ts` with the shared `GameHud`, `GameCallbacks`,
   `GameEngine`, and `CreateGame` types.
2. Adapt the Asteroids engine to the shared contract. `tripleShot` becomes a HUD
   `extras` entry (`{ label: "3X", value: "4.2s" }`), shown only while active.
3. Replace `AsteroidsCanvas.tsx` with a generic `components/games/GameCanvas.tsx`.
   Keep the `useSyncExternalStore` input mode, the `useEffectEvent` callbacks,
   `useImperativeHandle`, and the "KEYBOARD REQUIRED" notice, now fed by the
   registry entry's `controls`.
4. Add `lib/games/registry.ts` with the `asteroids` entry.
5. In `GamePlayer`, replace `isAsteroids` with `const entry = GAME_REGISTRY[game.id]`.
   Ids with no entry keep the simulated arena. Render `extras` as HUD stats.
6. Rename the `.asteroids-canvas` CSS class to `.game-canvas`.
7. QA Asteroids at `/player/asteroids` before adding the new game: movement,
   HUD, 3X stat, pause, END, save score, PLAY AGAIN, no console errors.

## Step 6 — Port the engine

Create `lib/games/<id>/engine.ts` exporting `create<Name>(canvas, callbacks): GameEngine`.
Follow the checklist in `references/engine-contract.md`. Key rules:

- Framework-free: no React import. The engine owns the canvas, the
  `requestAnimationFrame` loop, and its own listeners.
- All state inside the `create<Name>()` closure. No module-level mutable state,
  so React Strict Mode's double mount is safe.
- Fixed logical resolution taken from the reference, scaled by CSS.
- `dt` capped at 50 ms.
- No HUD or overlay text on the canvas. Emit `onHud` only when a value changes.
- `onGameOver(finalScore)` on the final loss, on a win/completion, and on `end()`.
- P and Escape toggle pause. Auto-pause on `visibilitychange` (hidden) and on
  window `blur`. Report every change through `onPauseChange`.
- Ignore input in the `gameover` state and when the event target is a text
  field (`isTypingTarget`). Call `preventDefault()` only for the game's keys.
- `destroy()` cancels the rAF and removes every listener.
- Neon palette from `app/globals.css` tokens, glow via `shadowBlur`/`shadowColor`,
  dark radial background like `.game-arena`.
- Score is a non-negative integer, at most 10,000,000 (DB CHECK).
- Assets go in `public/games/<id>/` and load by absolute URL.

## Step 7 — Register the game

Add the entry to `lib/games/registry.ts`: `create`, `width`, `height`, `input`,
`ariaLabel`, and `controls`. Nothing else in `GamePlayer` changes.

## Step 8 — Cover art

Invoke `/frontend-design`. Add `.cover-<id>` (with `::before`/`::after` as
needed) in `app/globals.css`, next to the other covers. Keep it CSS-only, in the
in-game style, and visually distinct from every existing cover.

## Step 9 — Migration

Create `supabase/migrations/NNNN_<id>_game.sql` (next 4-digit number):

```sql
-- NNNN — <TITLE> catalog entry (spec NN)
insert into public.games
  (id, title, tagline, description, category, cover, color, sort_order, is_published)
values
  ('<id>', '<TITLE>', '<tagline>', '<description>', '<CATEGORY>',
   'cover-<id>', '<color>', <max + 1>, true);
```

Escape single quotes in copy (`''`). Apply it with Supabase MCP
`apply_migration`, verify the row with `execute_sql`, and run `get_advisors`
(security). There is no schema change, so the generated types stay as they are.

To hide a game later, use `update public.games set is_published = false where id = '<id>';`.

## Step 10 — QA

Run `npm run dev` and drive the app with the Playwright MCP tools. Save
screenshots in `.playwright-screenshots/`, never in the project root.

- `/games` shows the new card with its cover and its category chip.
- `/game/<id>` shows the copy, Global Best `0`, Plays `NEW`, and
  `NO SCORES YET — BE THE FIRST`.
- `/player/<id>` plays with the reference controls. The HUD (score, lives,
  level, extras) updates.
- PAUSE/RESUME, P, and Escape pause and resume, and the button label stays in
  sync. Switching tabs leaves the game paused.
- END and losing all lives open the GAME OVER modal with the real score.
- Typing initials in the modal does not control the game.
- SAVE SCORE shows the score on `/game/<id>`, as the champion on
  `/hall-of-fame`, and on `/hall-of-fame?game=<id>`.
- PLAY AGAIN starts a fresh run.
- Game keys do not scroll the page. Leaving the page leaves no console errors.
- A touch-only viewport shows the controls notice if the game needs a keyboard.
- `/player/asteroids` still works.

Delete only the score rows created during QA with `execute_sql`. Run
`npm run lint` and `npm run build`. Mark the spec's acceptance criteria `[x]`
and set `**State:** Implemented`.

Report to the user: what was built, QA results, and any criterion that failed or
was skipped.
