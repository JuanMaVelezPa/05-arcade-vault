# 01 — MVP Screens

**State:** Implemented
**Depends on:** none
**Date:** 2026-09-21

**Objective:** Implement four Arcade Vault screens (Library, Game Detail, Game Player, Hall of Fame) as real Next.js App Router routes that match the reference template's visual design and interaction feel, without building any real game engine, backend, or authentication logic.

## Scope

### In scope

- Four screens as App Router routes, wired together by a shared, persistent Nav:
  - Library — `/` (replaces the current placeholder hero in `app/page.tsx`)
  - Game Detail — `/game/[id]`
  - Game Player — `/player/[id]`
  - Hall of Fame — `/hall-of-fame`
- A persistent Nav (desktop links + mobile hamburger panel) rendered once in `app/layout.tsx`, present on every route, highlighting the active section. No sign-in affordance — every visitor is treated as a guest.
- The mock game catalog and seeded leaderboard generator ported from `references/templates/data.jsx`, translated to English and typed in TypeScript.
- The Game Player screen's simulated score/level progression (`setInterval`-driven, as in `reproductor.jsx`) and its game-over modal, including saving a finished run's score to `localStorage` (`av_scores`).
- All UI copy translated from Spanish to English.
- Responsive behavior at the breakpoints already defined in `app/globals.css` (840px nav, 900px detail, 720px table/hall).
- Visual system: reuse `app/globals.css` and the fonts already wired in `app/layout.tsx` (this design system was already ported from `references/templates/styles.css` in a prior spec/PR) — only additive changes if a selector is missing.

### Not in scope

- The Auth screen (`/auth`) and everything it enables: sign-in/create-account forms, social login buttons, and any session state. There is no way to log in — every visitor is a guest. This is deferred to its own future spec.
- No `SessionProvider`/session Context, no sign-in button in the Nav, no "your best" row in Hall of Fame, no personalized default name in the Player HUD — all of this depended on Auth and is removed along with it.
- A real backend, API, or database. No real authentication, authorization, password handling, or account storage.
- Actual playable game mechanics for any of the 8 games (no canvas, physics, input handling, or collision detection). The Player screen stays a HUD/CRT visual simulation.
- Real leaderboard persistence. Hall of Fame keeps showing seeded/generated mock data; scores saved from the Player screen go to `localStorage` but are **not** read back into the Hall of Fame table.
- A real credits/payment system — the "CREDITS · 03" counter in the Nav stays static and decorative.
- Functional social login (Google/GitHub buttons render but do nothing), same as the template.
- Anything not present in the template: multiplayer, user profile pages, settings, notifications, etc. Any of these would be their own spec.

## Data model

New files under `lib/`:

- **`lib/types.ts`**
  - `Game`: `{ id, title, short, long, category, cover, color, best, plays }`
  - `ScoreRow`: `{ rank, name, score, date }`
  - `SavedScore`: `{ game, score, name, at }`
- **`lib/data.ts`**
  - `GAMES: Game[]` — the 8 games from `data.jsx`, titles/descriptions translated to English, `id`s and `cover`/`color` keys unchanged (they key into existing CSS classes in `globals.css`).
  - `CATEGORIES: string[]` — `["ALL", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]`.
  - `PLAYERS: string[]` — the handle list from `data.jsx`, unchanged (already alphanumeric codes, no translation needed).
  - `seededScores(seed, count): ScoreRow[]` — the deterministic pseudo-random generator, ported as-is.
- **`lib/scores.ts`**
  - `saveScore(entry: Omit<SavedScore, "at">)` — appends to the `av_scores` array in `localStorage`, mirroring `handleSaveScore` in `app.jsx`. The `name` field comes from the initials the player types into the game-over modal (defaulting to `"GUEST"`), not from any session.

## Implementation plan

1. **Types & mock data** — add `lib/types.ts` and `lib/data.ts` (translated `GAMES`/`CATEGORIES`/`PLAYERS` + `seededScores`). System still builds and runs unchanged.
2. **Nav** — add `components/Nav.tsx` (desktop links, static coin counter, mobile hamburger + slide-in panel — no sign-in affordance) and render it in `app/layout.tsx` above `{children}`; translate the footer copy in `app/layout.tsx` to English. Nav renders on every route from this point on.
3. **Library screen** — rewrite `app/page.tsx`: hero, search input, category chips, and a grid of `components/GameCard.tsx` (with the mouse-tilt effect from `biblioteca.jsx`), plus the "no results" empty state. Selecting a card or its Play button routes to `/game/[id]`.
4. **Game Detail screen** — add `app/game/[id]/page.tsx`: cover art, tag row, description, stats strip, and a leaderboard aside built from `seededScores`. "Play Now" routes to `/player/[id]`; "Back to Vault" routes to `/`.
5. **Hall of Fame screen** — add `app/hall-of-fame/page.tsx`: per-game tabs, top-3 podium, and the full ranked table from `seededScores` (no "your best" row — there is no session to derive it from).
6. **Game Player screen** — add `app/player/[id]/page.tsx`: HUD (player name — always `"GUEST"` — score, lives, level), CRT-framed arena with the decorative animated elements from `reproductor.jsx`, Pause/End controls, the `setInterval` score/level simulation, and the game-over modal (initials input, pre-filled with `"GUEST"`, → `saveScore` → "saved" confirmation, Play Again resets state, Back to Vault routes to `/`).
7. **Responsive & visual QA pass** — run `npm run dev`, walk all 4 routes at desktop and mobile widths, and compare against `references/templates/Arcade Vault.html` for visual parity.

## Acceptance criteria

- [x] Visiting `/` shows the Library screen: hero, search box, category chips, and a grid of 8 game cards using the existing neon/CRT design system.
- [x] Typing in the search box filters cards by title; selecting a category chip filters by category; combining both narrows correctly; no matches shows the "no results" empty state.
- [x] Clicking a game card (or its Play button) navigates to `/game/[id]` for that game.
- [x] `/game/[id]` shows the game's cover, tags, description, stats strip, and a 10-row seeded leaderboard; "Play Now" routes to `/player/[id]`; "Back to Vault" routes to `/`.
- [x] `/player/[id]` shows a HUD (player name, score, lives, level) and a CRT-framed arena; score increases automatically over time and level increases at score thresholds, matching the template's pacing.
- [x] Pause toggles the simulation and shows an "on pause" overlay; End opens the game-over modal with the final score.
- [x] Saving initials (pre-filled with "GUEST") in the game-over modal appends an entry to `localStorage`'s `av_scores` array and shows the "score saved" confirmation; Play Again resets the HUD to its initial state; Back to Vault routes to `/`.
- [x] `/hall-of-fame` shows a game-selector tab row, a top-3 podium, and a full ranked table for the selected game.
- [x] The Nav (desktop links + mobile hamburger panel) is present on all 4 routes, highlights the active section, has no sign-in affordance, and the mobile panel opens/closes correctly.
- [x] There is no `/auth` route and no session state anywhere in the app.
- [x] All screens are usable at desktop and mobile widths using the existing breakpoints (840px nav, 900px detail, 720px table/hall).
- [x] All UI copy is in English.
- [x] `npm run build` completes with no type errors.

## Decisions taken and discarded

- **Real Next.js App Router routes**, not the original hash-based SPA router — the project is already scaffolded as Next.js 16 App Router per `CLAUDE.md`; the hash router was discarded as fighting the framework.
- **Reuse `app/globals.css` as the near-verbatim port of `styles.css`**, rather than rebuilding the design in Tailwind utilities — it already contains this port (merged in a prior `01-styles` PR) and preserves pixel-accuracy against the prototype; a Tailwind rebuild was discarded as higher-risk busywork with no visual upside.
- **Game Player keeps the template's fake score/level simulation and `localStorage` score-save** — explicit scope: this MVP implements visuals and their surrounding interaction feel, not real game mechanics; a fully static screen was discarded as misrepresenting the finished product's feel.
- **Hall of Fame keeps using seeded/generated mock data**, not real saved scores — matches the template's own behavior exactly; real score aggregation is deferred to a future spec.
- **All UI copy and route slugs translated to English** (`/game/[id]`, `/player/[id]`, `/hall-of-fame`) — explicit user decision, diverging from the Spanish-language prototype.
- **No backend, auth, or persistence beyond `localStorage`** — explicit scope boundary ("focusing only on visuals, not the logic of the game").
- **Auth screen and all session state removed from this spec** — the user explicitly moved Auth out of scope after the initial draft. Since there is no way to log in without it, `SessionProvider`, the Nav's sign-in button, Hall of Fame's "your best" row, and the Player HUD's personalized name were removed rather than kept as unused/dead infrastructure. Every visitor is a guest; the Player HUD name and the game-over modal's initials both default to `"GUEST"`. Auth and real session state are deferred to a future spec.

## Identified risks

- **Copy-length drift:** translating descriptions to English may produce different text lengths than the Spanish original, which the card layout accounts for with a `min-height` on `.card .desc` — verify English copy doesn't overflow or leave excessive empty space.
