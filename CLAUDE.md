# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Arcade Vault** is a Next.js 16 (App Router, React 19) online arcade where users play retro-style canvas games and compete on per-game score leaderboards. Data lives in Supabase; the contact form sends email through Resend.

Built so far (see `specs/`): home landing, games browser, game detail with leaderboard, player page with HUD and score submission, Hall of Fame, About page with contact form, five real games (Asteroids, Tetris, Arkanoid, Snake, Frogger), a global sound mute toggle, global game skins (neon, classic, retro), mobile-responsive and landscape player with on-screen touch pad, per-game performance passes, and accounts (email + password, Google, GitHub, password reset).

`references/implemented-games.md` lists the published games (id, title, category, short description, color). Keep it in sync with the `games` table when a game is added or removed.

Agent logs live in `references/`: `game-suggestions-todo.md` (planner), `game-skins.md` (skins), `game-mobile.md` (mobile), `game-performance.md` (FPS), `security/security-audit.md` (security). `references/gamepad-assets/` and `references/source-assets/` hold art sources. `references/production-migration.md` is the runbook to rebuild Dev in a Production Supabase project (spec 27); verify with `supabase/verify-production.sql`.

The original design prototype lives in `references/templates/` (static HTML/JSX + `styles.css`). Treat it as the visual/behavior reference, not code to reuse. `references/started-games/` holds standalone reference games to port into the app (see the `add-arcade-game` skill).

There is no test runner. QA is done manually in the browser (Playwright MCP); save screenshots to `.playwright-screenshots/`.

## Commands

```bash
npm run dev           # dev server (Turbopack)
npm run build         # production build
npm run start         # run production build
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check
```

## Environment

All local secrets live in `.env.local` (gitignored by `.env*`). `.env.example` lists the required keys:

- `RESEND_API_KEY` — used by `app/api/contact/route.ts`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — read by `lib/supabase/env.ts` (referenced literally so Next.js inlines them in browser code).

## Spec-driven workflow

Features follow the `/spec` and `/spec-impl` skills (`Klerith/fernando-skills`, installed in `~/.claude/skills/`):

- `/spec` writes `specs/NN-slug.md` (State, Depends on, Objective, Scope, Decisions, acceptance criteria). Wait for approval before implementing.
- `/spec-impl` implements an approved spec on a `spec-NN-slug` branch (`specs/.spec-config.yml` → `AutoCreateBranch: true`), then marks the spec `Implemented`.
- Keep specs to a narrow slice with sensible defaults; record defaults in the Decisions section instead of asking broad scope questions.

### Project skills (`.claude/skills/`)

- `/add-arcade-game <folder>` — ports a `references/started-games/<folder>` game into the app: spec, engine, registry, cover art, `games` row, QA.
- `/game-jam <idea>` — runs two `game-jam` agents in parallel and judges both drafts in `specs/game-jam/<game-id>/`; promote the winner to `specs/NN-slug.md` yourself.
- `/spec-impl-game <spec>` — `/spec-impl` for a game spec, then `@skin-designer` and after it `@mobile-porter` (sequentially, never in parallel).

### Project agents (`.claude/agents/`)

Each agent file holds the full process; read it for details.

- `@game-planner` — ranks the next game to add against the catalog; logs in `references/game-suggestions-todo.md`. See `.claude/agents/game-planner.md`.
- `@skin-designer` — audits every game for the three skins and drafts a spec for any gap; logs in `references/game-skins.md`. See `.claude/agents/skin-designer.md`.
- `@mobile-porter` — checks a game on mobile (portrait, landscape) and desktop against spec 15; logs in `references/game-mobile.md`. Needs the dev server. See `.claude/agents/mobile-porter.md`.
- `@game-optimizer <game-id>` — measures FPS on a production build and fixes only the costs the numbers support; logs in `references/game-performance.md`, never commits. See `.claude/agents/game-optimizer.md`.
- `@security-auditor` — audits app and database security against specs 22-24 (read-only SQL, no fixes); logs in `references/security/security-audit.md` and drafts a spec for High/Medium gaps. See `.claude/agents/security-auditor.md`.
- `@game-jam` — writes one spec draft for a game idea; normally spawned in pairs by `/game-jam`. See `.claude/agents/game-jam.md`.

## Styles

Always use `/frontend-design` to build user interfaces.

## Architecture

- **Routes** (`app/`): `/` (home landing), `/games` (browser with category filter), `/game/[id]` (detail + top scores), `/player/[id]` (play), `/hall-of-fame` (per-game champions), `/about` (contact form), `/login`, `/signup`, `/forgot-password`, `/reset-password` (auth; see Auth below). API routes: `app/auth/callback` (code exchange for OAuth, email confirmation and password recovery), `app/api/contact` (Resend), `app/api/health/supabase` (connectivity check). `app/error.tsx` is the error boundary.
- **Server data** (`lib/catalog.ts`, `server-only`): `getGames`, `getGame`, `getTopScores`, `getChampions`. Queries only return rows with `is_published = true`. Maps DB rows to the UI types in `lib/types.ts` (`games.tagline` → `short`, `games.description` → `long`). `lib/data.ts` only holds the `CATEGORIES` list; `lib/format.ts` has the play-count and score-date formatters.
- **Score submission** (spec 23): server action `app/actions/scores.ts` (`submitScore({ gameId, score })`). It needs a session (`getCurrentUser()`, else `SIGN IN TO SAVE YOUR SCORE`) and re-validates input (integer score 0..10,000,000, string `gameId`) because server actions accept direct POSTs, then inserts only `game_id` and `score` and revalidates `/game/[id]` and `/hall-of-fame`. The client never sends the name: `scores.user_id` defaults to `auth.uid()` and the `set_score_player_name` trigger overwrites `player_name` with `profiles.username`. `/player/[id]` passes `username` to `GamePlayer`; signed-out players can play but get a LOGIN / SIGN UP prompt at GAME OVER (`?next=/player/<id>`).
- **Auth** (spec 22): Supabase Auth with `@supabase/ssr` cookies. Server actions in `app/actions/auth.ts` (`signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`) re-validate input and return `{ ok, error }` or `{ ok, redirectTo }`. `lib/auth.ts` (`server-only`) has `getCurrentUser()` (claims + `profiles.username`, `null` on any failure; `app/layout.tsx` passes it to `Nav`, so every page renders per request) and `safeNext()` (the `?next=` rule: same-origin `/` paths only, else `/games`). UI is `components/AuthForm.tsx` (modes `login`, `signup`, `forgot`, `reset`) and `OAuthButtons.tsx`. Email confirmation is required; the Supabase dashboard and provider setup is manual (see `specs/22-auth-sign-in-sign-up.md`). Playing is open to everyone, saving a score requires an account (spec 23). `app/page.tsx` and `app/game/[id]/page.tsx` also use `getCurrentUser()` to hide sign-up CTAs and show the sign-in hint under TOP SCORES.
- **Supabase** (`lib/supabase/`): `server.ts` creates a new `@supabase/ssr` client per request (never cache at module level); `client.ts` is the browser client; `proxy.ts` + root `proxy.ts` refresh the session (Next 16 renamed `middleware` to `proxy`). `database.types.ts` is generated — regenerate it with the Supabase MCP `generate_typescript_types` after schema changes.
- **Database** (`supabase/migrations/`): tables `games` (text id, category, cover CSS class, color, `sort_order`, `is_published`) `scores` (`user_id` → `auth.users`, cascade) and `profiles` (`user_id` → `auth.users`, unique `username` with the `player_name` rule; only the `handle_new_user` trigger writes it); views `game_stats` (best, plays) and `game_champions`. RLS: public select, insert on `scores` only for `authenticated` with `user_id = auth.uid()` on a published game and column grant `game_id, score` (`player_name` comes from the trigger), `profiles` read-only for clients; DB CHECK constraints mirror the server action rules. Apply new migrations as numbered files (`000N_*.sql`) through the Supabase MCP (`.mcp.json`).
- **Security** (spec 24): `next.config.ts` sends `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Strict-Transport-Security` (no preload) and `Permissions-Policy` on every route; there is no CSP yet. `lib/supabase/proxy.ts` also does optimistic path redirects (signed-out `/reset-password` → `/forgot-password`, signed-in `/login` and `/signup` → `safeNext(?next)`); real checks stay in pages, server actions and RLS. `safeNext` lives in `lib/safe-next.ts` (re-exported by `lib/auth.ts`) so the proxy can import it. Passwords need 8-72 characters with lowercase, uppercase, a digit and a symbol (`validPassword` in `app/actions/auth.ts`, mirrored in the Supabase Auth dashboard settings). Migration `0010` revokes EXECUTE on `public.rls_auto_enable()` from `anon` and `authenticated`.
- **Games** (`lib/games/`): each engine is framework-free TypeScript implementing the contract in `types.ts` (`CreateGame(canvas, callbacks) → GameEngine` with pause/resume/end/restart/destroy, optional `jumpToLevel`, `setMuted`, `setSkin`; callbacks `onHud` (with optional `extras`), `onGameOver`, `onPauseChange`). Skins are `neon`, `classic` and `retro` (`lib/games/scanlines.ts` draws the retro CRT overlay). `registry.ts` maps catalog ids to canvas size, input mode (`keyboard` shows a touch-only notice, `pointer` works on touch), `ariaLabel`, the on-screen `touch` pad layout (d-pad directions plus A/B actions), optional `levels`, `sound` and `skins`. Catalog ids without a registry entry fall back to the simulated arena in `components/GamePlayer.tsx`.
- **Components**: `GamePlayer` (HUD, pause overlay, level selector, mute and skin toggles, GAME OVER modal with initials), `games/GameCanvas` (mounts the engine, detects input mode), `games/TouchPad` (on-screen pad that sends synthetic key events to the engine), `GamesBrowser`, `GameCard`, `HomeLanding`, `Nav`.
- **Preferences**: `lib/sound-pref.ts` (mute, `arcade-vault:muted:v1`) and `lib/skin-pref.ts` (skin, `arcade-vault:skin:v1`) store state in `localStorage` with an in-memory fallback, exposed via `useSyncExternalStore`.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`; no `tailwind.config`. `app/globals.css` holds the neon theme tokens (`--bg`, `--ink`, `--cyan`, `--magenta`, ...) mapped into `@theme inline`, plus the ported prototype classes (`.av-bg`, `.btn`, `.hud-*`, `cover-*`). Fonts are self-hosted in `public/fonts/` via `next/font/local` (Press Start 2P, JetBrains Mono, Courier Prime).
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`).
- **Formatting/linting**: Prettier (defaults, `.prettierrc.json`) + ESLint (`eslint-config-prettier` last in `eslint.config.mjs`). A `PostToolUse` hook on `Write|Edit` (`.claude/settings.json` → `.claude/hooks/format-and-lint.mjs`) runs Prettier on the whole touched file and `eslint --fix` on JS/TS; remaining ESLint errors are fed back (exit 2) and must be fixed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
