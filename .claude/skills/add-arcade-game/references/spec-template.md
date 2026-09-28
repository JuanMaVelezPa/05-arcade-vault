# NN — <TITLE> Game

**State:** Draft
**Depends on:** 05-asteroids-game, 06-games-and-scores-tables, 07-published-games-only
**Date:** <YYYY-MM-DD>

**Objective:** Port `references/started-games/<folder>/game.js` to a TypeScript canvas engine, restyled in the app's neon palette, that runs inside the `GamePlayer` shell at `/player/<id>`. <TITLE> is added to the catalog as a new, published `games` row, so its scores go to the existing leaderboards.

## Scope

### In scope

- A TypeScript port at `lib/games/<id>/engine.ts` that follows the shared engine contract (`lib/games/types.ts`). It keeps the reference gameplay as-is: <list the mechanics, scoring, lives, levels, speed rules>.
- Fixed logical resolution of <W> × <H>, scaled by CSS inside `.crt-screen` <and letterboxed if not 4:3>.
- Neon restyle: <which objects get which palette colors>, glow via `shadowBlur`.
- The canvas draws no HUD and no overlay text. Score, lives, and level go to the React HUD. Extra HUD stats: <none | list with label and when shown>.
- Controls: <keys / mouse>. P and Escape pause. Auto-pause on hidden tab.
- <Touch-only viewports show the controls notice | pointer input works on touch>.
- A registry entry in `lib/games/registry.ts`.
- <One-time: shared engine contract, `GameCanvas`, and registry; Asteroids migrated onto them.> (remove if the registry already exists)
- New `cover-<id>` cover art in `app/globals.css`, CSS-only, distinct from every existing cover.
- Migration `supabase/migrations/NNNN_<id>_game.sql` that inserts a new `games` row and publishes it:
  `id: "<id>"`, `title: "<TITLE>"`, `tagline: "<…>"`, `description: "<…>"`, `category: "<CATEGORY>"`, `color: "<color>"`, `cover: "cover-<id>"`, `sort_order: <n>`, `is_published: true`.
- All copy in English.

### Not in scope

- Reusing or publishing the seeded row <similar-id> (<SIMILAR TITLE>). It stays unpublished.
- Sound effects or music <unless kept on purpose>.
- On-screen touch controls.
- Gameplay not present in the reference.
- Changes to leaderboard code, views, or RLS. They already support any published game.
- High-DPI canvas rendering.

## Data model

No schema change. One new `games` row (see Scope).

```ts
export function create<Name>(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
```

Internal state: <classes / board model>, state `'playing' | 'paused' | 'gameover'` <plus others>, `dt` capped at 50 ms, all inside the closure.

## Implementation plan

1. <Registry step, if needed.> Add `lib/games/types.ts`, `lib/games/registry.ts`, and `components/games/GameCanvas.tsx`; migrate Asteroids; QA `/player/asteroids`.
2. **Port the engine** — `lib/games/<id>/engine.ts`. Nothing imports it yet.
3. **Apply the neon palette.**
4. **Register** — entry in `lib/games/registry.ts`.
5. **Cover art** — `cover-<id>` in `app/globals.css` (`/frontend-design`).
6. **Migration** — write, apply with MCP `apply_migration`, verify with `execute_sql`, run `get_advisors`.
7. **QA** — Playwright MCP (screenshots in `.playwright-screenshots/`), delete QA score rows, `npm run lint`, `npm run build`.

## Acceptance criteria

- [ ] `/games` lists <TITLE> with its `cover-<id>` art and its category chip, linking to `/game/<id>`.
- [ ] `/game/<id>` shows the new copy, Global Best `0`, Plays `NEW`, and `NO SCORES YET — BE THE FIRST` before any save.
- [ ] `/player/<id>` renders a <W> × <H> logical canvas inside the CRT screen, with the scanline overlay on top.
- [ ] <One criterion per core mechanic: controls, scoring values, level progression, lives.>
- [ ] The React HUD shows live score, lives, and level <and extras>; the canvas draws no HUD or overlay text.
- [ ] PAUSE/RESUME, P, and Escape pause and resume, and the button label stays in sync. Switching tabs leaves the game paused.
- [ ] Losing the last life <or completing the game>, or pressing END, opens GAME OVER with the real final score.
- [ ] Typing initials in the modal does not control the game.
- [ ] SAVE SCORE inserts a `scores` row with `game_id: "<id>"`; it shows on `/game/<id>`, on `/hall-of-fame?game=<id>`, and as the <TITLE> champion on `/hall-of-fame`.
- [ ] PLAY AGAIN starts a fresh run.
- [ ] Game keys do not scroll the page. Leaving the page stops the loop with no console errors.
- [ ] <Touch-only viewport shows the controls notice.>
- [ ] `/player/asteroids` still works as before.
- [ ] The migration file exists and is applied; `get_advisors` (security) reports no new errors.
- [ ] QA score rows are deleted.
- [ ] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: a new `games` row, appended last and published.** New game, new id; seeded look-alike rows stay hidden.
- **Yes: React shell owns HUD, pause, and game over** — same as spec 05.
- **Yes: framework-free engine behind the shared contract** — same as spec 05.
- <Defaults taken for this game, each with a one-line reason.>

## Identified risks

| Risk | Mitigation |
| ---- | ---------- |
| <Risk> | <Mitigation> |

## What is **not** in this spec

- <Repeat the out-of-scope items in short form.>

Each one of those, if it lands, goes in its own spec.
