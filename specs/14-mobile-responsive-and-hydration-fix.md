# 14 — Mobile responsive layout, hydration fix and README tunnel docs

**State:** Implemented
**Depends on:** 01-mvp-screens, 02-home-landing-and-games-route, 03-about-page-and-contact-email, 10-sound-mute-toggle, 13-game-skins
**Date:** 2026-10-14

**Objective:** Make every page of Arcade Vault display correctly on phone widths, remove the React hydration mismatch warning, and document the phone-over-tunnel workflow cleanly in the README.

## Why this spec exists

The user is testing the app from a phone through a `localtunnel` URL (WSL without admin rights). That exposed layout problems on small screens and a console warning: "A tree hydrated but some attributes of the server-rendered HTML didn't match the client's properties". The README block describing the tunnel was added by hand: the file is saved as Windows-1252 (invalid UTF-8, accents are corrupted) and the block has no Markdown formatting. `next.config.ts` has an uncommitted `allowedDevOrigins: ["*.loca.lt"]` that the tunnel needs.

## Scope

**In:**

- **Responsive audit and fixes** for `/`, `/games`, `/game/[id]`, `/player/[id]`, `/hall-of-fame` and `/about` at 360, 390 and 768 px wide:
  - No horizontal page scroll at any of those widths.
  - Touch targets in nav, filters, HUD action bar, pause overlay and GAME OVER modal are at least 44 px tall.
  - Text stays readable (no clipped or overlapping labels), tables and grids collapse or wrap.
  - The game canvas scales down to the viewport width keeping its aspect ratio.
  - The `viewport` meta is correct (`width=device-width, initial-scale=1`), exported through Next's `viewport` API only if not already emitted by default.
  - Fixes go in `app/globals.css` (existing `@media` blocks first) and component markup; use `/frontend-design` for any visual change.
- **Hydration mismatch fix:**
  - Reproduce the warning in the dev server and identify the exact SSR-ed client component and attribute that differ between server and client. Candidates to check first: `components/games/GameCanvas.tsx` (input mode via `matchMedia`), `components/GamePlayer.tsx` (skin and mute preferences from `localStorage`, `Math.random`), `components/Nav.tsx`, and anything using `window`, `Date`, or locale formatting during render.
  - Make the first client render equal the server render (server snapshot or a post-mount effect), keeping the existing `useSyncExternalStore` pattern for `localStorage` preferences.
  - If the cause turns out to be a browser extension that injects attributes into `<html>`/`<body>` (not app code), say so in the Decisions section and do not mask it with `suppressHydrationWarning` on app components.
- **README:**
  - Re-encode `README.md` to UTF-8 and fix the corrupted characters (for example `aquí`, `pestaña`).
  - Close the code block formatting around the commands list and move the tunnel block under its own heading (for example `## Test on a phone (WSL + localtunnel)`) with numbered steps, fenced `bash` blocks, and a note about the Tunnel Password being the public IP from `curl ifconfig.me`.
  - Write the README in English, short and simple (KISS); all project documentation is English (user decision during Step 6).
  - Mention that `next.config.ts` needs `allowedDevOrigins` for `*.loca.lt`.
- **`next.config.ts`:** keep `allowedDevOrigins: ["*.loca.lt"]` and format it with Prettier (2-space indent) via `npm run format`.

**Out of scope (for future specs):**

- On-screen touch controls (D-pad, buttons) for keyboard-only games. They keep the existing touch-only notice.
- Redesigning layouts, new components, new breakpoints system or changing the neon theme.
- Changes to engines in `lib/games/`, sound, skins, Supabase, or API routes.
- PWA, orientation lock, or fullscreen mode.
- Landscape-specific layouts for the player page.

## Data model

No new data. No database, type, or storage changes.

## Implementation plan

1. **Branch and baseline** — `/spec-impl` creates `spec-14-mobile-responsive-and-hydration-fix`. Run `npm run dev` and capture baseline Playwright screenshots of the six routes at 360, 390 and 768 px into `.playwright-screenshots/`, and record the console warnings.
2. **Hydration root cause** — reproduce the warning with Playwright (console messages), identify the component and attribute, fix it so the first client render matches the server HTML. Reload every route and confirm a clean console.
3. **Responsive fixes, public pages** — home, `/games`, `/hall-of-fame`, `/about` (nav, cards, tables, contact form).
4. **Responsive fixes, game pages** — `/game/[id]` and `/player/[id]`: canvas scaling, HUD action bar wrapping, pause overlay, level selector, GAME OVER modal and initials input.
5. **README and config** — convert `README.md` to UTF-8, restructure the tunnel block, format `next.config.ts`.
6. **QA** — repeat screenshots at the three widths, check no horizontal scroll with `document.documentElement.scrollWidth <= innerWidth`, check the console is clean, then `npm run format:check`, `npm run lint` and `npm run build`.

## Acceptance criteria

- [x] At 360, 390 and 768 px, none of the six routes has horizontal scroll (`scrollWidth <= innerWidth`).
- [x] At 360 px the game canvas fits inside the viewport width with its aspect ratio kept, and the HUD action bar (SOUND, SKIN, PAUSE, END, EXIT) wraps without clipping.
- [x] Interactive controls in the nav, games filter, HUD bar, pause overlay and GAME OVER modal measure at least 44 px in height at 390 px.
- [x] The GAME OVER modal and the initials input are fully visible and usable at 360 px.
- [x] The contact form on `/about` is usable at 360 px and still submits.
- [x] Loading each of the six routes in dev shows no hydration mismatch warning in the browser console, with `localStorage` empty and with `arcade-vault:skin:v1` and `arcade-vault:muted:v1` set to non-default values.
- [x] The root cause of the mismatch is named in the PR description (component, attribute, fix).
- [x] `suppressHydrationWarning` is not added to app components to silence the warning.
- [x] `README.md` is valid UTF-8 (`file README.md` reports UTF-8 or ASCII) with no `�` characters.
- [x] The README tunnel instructions render as a headed section with numbered steps and fenced `bash` blocks, and mention `allowedDevOrigins`.
- [x] `next.config.ts` passes `npm run format:check` and still contains `allowedDevOrigins: ["*.loca.lt"]`.
- [x] Desktop layouts (1280 px) look unchanged in side-by-side screenshots.
- [x] `npm run lint`, `npm run format:check` and `npm run build` complete with no errors.

## Decisions taken and discarded

- **Yes (default):** audit all six pages at 360/390/768 px and fix defects, without redesigning.
- **Yes (default):** layout only for games on mobile; no new touch controls. Keyboard games keep the touch notice from SPEC 05 and later specs.
- **Yes (default):** reuse the existing `@media` blocks in `app/globals.css` before adding new ones; no Tailwind config changes.
- **Yes (default):** keep the `useSyncExternalStore` pattern with a server snapshot for `localStorage` preferences, as in `lib/sound-pref.ts`.
- **No:** `suppressHydrationWarning` as a fix. It hides the symptom; it is acceptable only on `<html>`/`<body>` if the cause is proven to be a browser extension.
- **Changed (Step 6):** README is rewritten in English, short and simple, because all documentation must be English. It is UTF-8, with the tunnel block under its own heading.
- **Yes (default):** `next.config.ts` change is included in this spec as tunnel support, formatted with Prettier.
- **Yes (default):** one spec for responsive, hydration and README, since all three came from the same phone-over-tunnel testing session.
- **Finding (Step 2, 2026-10-14):** the hydration warning was not reproducible in a clean Playwright profile on `localhost:3000`. Tested all routes with empty `localStorage`, with `arcade-vault:skin:v1=retro` and `arcade-vault:muted:v1=1`, and in an emulated touch/coarse-pointer iPhone profile: no hydration warnings, other warnings or errors. App code is already hydration-safe (`useSyncExternalStore` with server snapshots in `lib/skin-pref.ts`, `lib/sound-pref.ts` and `components/games/GameCanvas.tsx`; UTC dates; `en-US` number formatting; `<html>`/`<body>` carry only `lang` and `class`). The likely cause is a browser extension (or the tunnel layer) injecting attributes into `<html>`/`<body>`. No app code was changed and `suppressHydrationWarning` was not added.

## Identified risks

| Risk                                                                   | Mitigation                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The warning comes from a browser extension, not the app                | Test in a clean Playwright profile first; document the finding instead of changing app code. |
| The warning only appears through the tunnel (extra proxy headers)      | Reproduce on both `localhost:3000` and the `*.loca.lt` URL.                                  |
| Responsive CSS regresses the desktop layout                            | Compare 1280 px screenshots before and after.                                                |
| The `format` hook rewrites the whole of `app/globals.css` on each edit | Patch the file with small `Bash` edits when the diff would be large (see project memory).    |
| Re-encoding the README damages other characters                        | Convert with `iconv -f WINDOWS-1252 -t UTF-8` and review the diff.                           |

## What is **not** in this spec

- On-screen touch controls for games.
- A mobile redesign or new breakpoint system.
- Engine, sound, skin, Supabase or API changes.
- PWA, fullscreen or orientation features.

Each one of those, if it lands, goes in its own spec.
