# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Arcade Vault** is a Next.js 16 (App Router) project for an online arcade platform where users play retro-style games and compete on score leaderboards. The `app/` directory is currently the untouched `create-next-app` scaffold (default `page.tsx`, Geist fonts, Tailwind v4) — no real screens or logic have been built yet. The actual product spec lives in `resources/resources/templates/` as a static HTML/React prototype (see below); treat that as the design/behavior reference to implement against, not as code to reuse directly.

This is not yet a git repository.

There is no test runner configured in `package.json` yet.

## Spec-driven workflow

Per `README.md`, this project follows a spec-driven design workflow using `/spec` and `/spec-impl` commands from the `Klerith/fernando-skills` skill package:

```bash
npx skills@latest add Klerith/fernando-skills
```

These skills are not currently installed in this environment. If asked to implement a feature and this workflow is in use, check whether `/spec` / `/spec-impl` are available before free-styling an implementation approach.

## Styles
Use always /frontend-design to make user interfaces

## Architecture

- **App Router**: everything lives under `app/`. `app/layout.tsx` is the root layout (Geist Sans/Mono via `next/font/google`, wraps `<body>` in a flex column). `app/globals.css` defines Tailwind v4 theme tokens (`--background`, `--foreground`) via `@theme inline` and a `prefers-color-scheme: dark` override — there is no separate `tailwind.config`, theme customization happens in this CSS file.
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`); no CSS-in-JS.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
