# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Arcade Vault** is a Next.js 16 (App Router, React 19) online arcade where users play retro-style canvas games and compete on per-game score leaderboards. Data lives in Supabase; the contact form sends email through Resend.

Built so far (see `specs/01`–`11`): home landing, games browser, game detail with leaderboard, player page with HUD and score submission, Hall of Fame, About page with contact form, and four real games (Asteroids, Tetris, Arkanoid, Snake) plus a global sound mute toggle.

`references/implemented-games.md` lists the published games (id, title, category, short description, color). Keep it in sync with the `games` table when a game is added or removed.

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

To add a new game from `references/started-games/<folder>`, use the project skill `/add-arcade-game <folder>` (`.claude/skills/add-arcade-game/`). It writes the spec, ports the engine, registers it, adds cover art, inserts and publishes the `games` row, and runs QA.

To decide which game to add next, ask the project agent `@game-planner` (`.claude/agents/game-planner.md`). It ranks candidates against the catalog and logs every suggestion and its status in `references/game-suggestions-todo.md`; its pick then feeds `/add-arcade-game`.

To compare two spec ideas for one game, use the project skill `/game-jam <idea>` (`.claude/skills/game-jam/`). It runs two `game-jam` agents (`.claude/agents/game-jam.md`) in parallel, writes `NN-<game-id>-option-a.md` and `NN-<game-id>-option-b.md` (NN = next spec number) in `specs/game-jam/<game-id>/`, then judges them and writes `NN-<game-id>-verdict.md`. Promote the winner to `specs/NN-slug.md` yourself.

## Styles

Always use `/frontend-design` to build user interfaces.

## Architecture

- **Routes** (`app/`): `/` (home landing), `/games` (browser with category filter), `/game/[id]` (detail + top scores), `/player/[id]` (play), `/hall-of-fame` (per-game champions), `/about` (contact form). API routes: `app/api/contact` (Resend), `app/api/health/supabase` (connectivity check). `app/error.tsx` is the error boundary.
- **Server data** (`lib/data.ts`, `server-only`): `getGames`, `getGame`, `getTopScores`, `getChampions`. Queries only return rows with `is_published = true`. Maps DB rows to the UI types in `lib/types.ts` (`games.tagline` → `short`, `games.description` → `long`).
- **Score submission**: server action `app/actions/scores.ts` (`submitScore`). It re-validates input (player name `^[A-Z0-9_ ]{1,10}$`, integer score 0..10,000,000) because server actions accept direct POSTs, then revalidates `/game/[id]` and `/hall-of-fame`.
- **Supabase** (`lib/supabase/`): `server.ts` creates a new `@supabase/ssr` client per request (never cache at module level); `client.ts` is the browser client; `proxy.ts` + root `proxy.ts` refresh the session (Next 16 renamed `middleware` to `proxy`). `database.types.ts` is generated — regenerate it with the Supabase MCP `generate_typescript_types` after schema changes.
- **Database** (`supabase/migrations/`): tables `games` (text id, category, cover CSS class, color, `sort_order`, `is_published`) and `scores`; views `game_stats` (best, plays) and `game_champions`. RLS: public select, anon insert limited to `game_id, player_name, score`; DB CHECK constraints mirror the server action rules. Apply new migrations as numbered files (`000N_*.sql`) through the Supabase MCP (`.mcp.json`).
- **Games** (`lib/games/`): each engine is framework-free TypeScript implementing the contract in `types.ts` (`CreateGame(canvas, callbacks) → GameEngine` with pause/resume/end/restart/destroy, optional `jumpToLevel`, `setMuted`; callbacks `onHud`, `onGameOver`, `onPauseChange`). `registry.ts` maps catalog ids to canvas size, input mode (`keyboard` shows a touch-only notice, `pointer` works on touch), controls text, optional `levels` and `sound`. Catalog ids without a registry entry fall back to the simulated arena in `components/GamePlayer.tsx`.
- **Components**: `GamePlayer` (HUD, pause overlay, level selector, mute toggle, GAME OVER modal with initials), `games/GameCanvas` (mounts the engine, detects input mode), `GamesBrowser`, `GameCard`, `HomeLanding`, `Nav`.
- **Sound preference**: `lib/sound-pref.ts` stores mute state in `localStorage` (`arcade-vault:muted:v1`) with an in-memory fallback, exposed via `useSyncExternalStore`.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`; no `tailwind.config`. `app/globals.css` holds the neon theme tokens (`--bg`, `--ink`, `--cyan`, `--magenta`, ...) mapped into `@theme inline`, plus the ported prototype classes (`.av-bg`, `.btn`, `.hud-*`, `cover-*`). Fonts are self-hosted in `public/fonts/` via `next/font/local` (Press Start 2P, JetBrains Mono, Courier Prime).
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`).
- **Formatting/linting**: Prettier (defaults, `.prettierrc.json`) + ESLint (`eslint-config-prettier` last in `eslint.config.mjs`). A `PostToolUse` hook on `Write|Edit` (`.claude/settings.json` → `.claude/hooks/format-and-lint.mjs`) runs Prettier on the whole touched file and `eslint --fix` on JS/TS; remaining ESLint errors are fed back (exit 2) and must be fixed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
