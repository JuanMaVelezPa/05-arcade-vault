# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Arcade Vault** is a Next.js 16 (App Router) project for an online arcade platform where users play retro-style games and compete on score leaderboards. The `app/` directory is currently the untouched `create-next-app` scaffold (default `page.tsx`, Geist fonts, Tailwind v4) — no real screens or logic have been built yet. The actual product spec lives in `resources/resources/templates/` as a static HTML/React prototype (see below); treat that as the design/behavior reference to implement against, not as code to reuse directly.

This is not yet a git repository.

## Commands

```bash
npm run dev     # start dev server (Next.js, Turbopack)
npm run build   # production build
npm run start   # run production build
npm run lint    # ESLint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured in `package.json` yet.

## Spec-driven workflow

Per `README.md`, this project follows a spec-driven design workflow using `/spec` and `/spec-impl` commands from the `Klerith/fernando-skills` skill package:

```bash
npx skills@latest add Klerith/fernando-skills
```

These skills are not currently installed in this environment. If asked to implement a feature and this workflow is in use, check whether `/spec` / `/spec-impl` are available before free-styling an implementation approach.

## Architecture

- **App Router**: everything lives under `app/`. `app/layout.tsx` is the root layout (Geist Sans/Mono via `next/font/google`, wraps `<body>` in a flex column). `app/globals.css` defines Tailwind v4 theme tokens (`--background`, `--foreground`) via `@theme inline` and a `prefers-color-scheme: dark` override — there is no separate `tailwind.config`, theme customization happens in this CSS file.
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`); no CSS-in-JS.

## Design reference (`resources/resources/templates/`)

A standalone HTML/React prototype (React 18 UMD + Babel-in-browser, no build step — open `Arcade Vault.html` directly in a browser) that defines the intended product. When building real screens under `app/`, use this as the functional/UX spec, adapting it to the App Router (real routes, not hash-based routing; server/client components as appropriate; no `window`/`localStorage` globals at module scope).

Screens (each is one file, loaded as globals via `window.X = X`, wired together in `app.jsx`):
- `nav.jsx` — top nav + mobile slide-out panel (Biblioteca / Salón de la Fama / auth button / credit counter).
- `biblioteca.jsx` — game library/catalog grid with category filtering.
- `detalle.jsx` — a single game's detail page (long description, stats) with a CTA into the player.
- `reproductor.jsx` — the game player screen: HUD (score, lives, level), pause/end controls, a mock "CRT" game arena, and a game-over modal that captures initials and saves the score.
- `auth.jsx` — sign in/up screen.
- `salon.jsx` — hall of fame / leaderboards.
- `data.jsx` — shared mock data: `GAMES` (id, title, short/long description, `cat` category, `cover` art key, accent `color`, `best` score, `plays` count), `CATS` category list, `PLAYERS` name pool, and `seededScores()` — a deterministic PRNG-based leaderboard generator (seed by game so scores are stable per game).
- `app.jsx` — routing shell: route state is JSON-encoded into `location.hash`; session user is persisted to `localStorage` under `av_user`; saved scores accumulate in `localStorage` under `av_scores` as `{ game, score, name, at }`. These are prototype-only persistence choices — a real implementation should use proper routes/state (and eventually a backend) instead of `localStorage`.
- `styles.css` — the neon/CRT/pixel visual language (custom properties for neon colors, pixel/mono fonts, CRT scanline effects) referenced by all the above.

Note: `resources/__MACOSX/` is leftover macOS zip-extraction metadata (all files prefixed `._`) — not part of the design reference, safe to ignore or delete.
