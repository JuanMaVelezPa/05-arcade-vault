# 16 — Mobile landscape player layout

**State:** Implemented
**Depends on:** 13-game-skins, 14-mobile-responsive-and-hydration-fix, 15-touch-controls
**Date:** 2026-10-14

**Objective:** Make the player page usable on a phone held in landscape, with the game screen fully visible, the HUD and nav out of the way, and the touch pad split on both sides of the screen so the thumbs reach it.

## Why this spec exists

SPEC 15 built the touch pad for portrait (pad below the CRT) and left landscape out of scope. Rotating a phone breaks that layout: the viewport is only about 360–430 px tall, so the nav/HUD, the 4:3 screen and the pad stacked in a column do not fit. The screen is cut off or the page scrolls, and the pad ends up below the fold, out of reach of the thumbs.

The user also reported that the game screen on laptops "doesn't have UX". After the questions, the laptop issue is about how the buttons and info are organized **before** the game starts (the game detail page). That is a different device, different files and a vague brief, so it is split into its own future spec.

The pad already renders as two independent blocks inside one `.touchpad` (`.touchpad-dpad` and `.touchpad-actions`), portaled into `.touchpad-slot` after `.crt`. With `display: contents` on the slot and on `.touchpad`, those two blocks can become grid items of `.av-player` next to the CRT, so the landscape layout is mostly CSS and needs no engine or contract change.

## Scope

**In:**

- A landscape layout for the player page, active only when the touch pad is rendered (touch-only devices, per SPEC 15) **and** `orientation: landscape`. It lives in `app/globals.css` next to the SPEC 15 `:has(.touchpad)` rules.
  - `.av-player:has(.touchpad)` becomes a 3-column grid: D-pad on the left, CRT in the center, A/B buttons on the right. The HUD bar spans the top row.
  - `.touchpad-slot` and `.touchpad` use `display: contents` so `.touchpad-dpad` and `.touchpad-actions` are direct grid items. The pad's card background, border and shadow are dropped in this layout.
  - The CRT is sized by the available height (`100dvh` minus the HUD row and paddings), keeping 4:3, and is centered. It must never be taller than the viewport.
  - The D-pad and A/B groups are vertically centered and sit close to the screen edges (thumb zone). Button sizes scale with `dvh`, never below 44 px.
- The site nav and footer stay hidden in landscape (SPEC 15 behavior); the `MENU` button still toggles the nav.
- A slim one-row HUD in landscape: stats on the left, action buttons (MENU, SOUND, SKIN, PAUSE, END, EXIT) on the right, 44 px high, no wrapping to a second row at 667×375, 844×390 and 932×430.
- The pause overlay (with the level selector) and the GAME OVER modal fit a 375 px tall viewport without cutting the buttons or the initials input (compact spacing, internal scroll as a fallback).
- Rotating the phone while a game runs keeps the same engine and score, with no remount, and the layout switches between portrait and landscape.
- Side padding uses `max(12px, env(safe-area-inset-left/right))` so the pad is not hidden behind a notch.
- **Amendment (user request):** in **portrait**, when a game has no A and no B action (Arkanoid, Snake), the D-pad is centered in the pad and the empty A/B group is not rendered or laid out. `TouchPad.tsx` only adds a class hook (e.g. `touchpad--dpad-only`) when `config.a` and `config.b` are both undefined; no press/key logic changes. In landscape the same games also hide the empty A/B column, so the D-pad stays on the left and the CRT uses the freed space.
- Styling follows `/frontend-design` and the neon tokens. Otherwise the portrait layout from SPEC 15 stays unchanged (games with A/B keep it exactly).

**Out of scope (for future specs):**

- Laptop/desktop UX, including the organization of buttons and info on the game detail page before playing (its own spec).
- Overlaying the pad on the canvas.
- Orientation lock, fullscreen mode, PWA, `viewport-fit=cover`.
- Auto-pause when the phone rotates.
- Changes to engines, sound, skins, Supabase, API routes or the pad's key mapping and press logic in `TouchPad.tsx` (the class hook above is markup only).
- Customizing pad size or position, haptics, joystick or gestures.

## Data model

This feature introduces no new data structures. It reuses `TouchConfig` and the pad markup from SPEC 15. No database, storage or `localStorage` changes.

## Implementation plan

1. **Baseline** — `/spec-impl` creates `spec-16-mobile-landscape-player`. With Playwright MCP, emulate a touch phone in landscape (667×375, 844×390, 932×430), open `/player/<id>` for each game, and save the "before" screenshots to `.playwright-screenshots/`. Note what is cut off or unreachable.
2. **Grid layout** — add the landscape media block in `app/globals.css`: 3-column grid on `.av-player:has(.touchpad)`, `display: contents` on the slot and pad, pad card styling removed, CRT sized by `dvh`. Portrait rules untouched. Verify the screen is fully visible and the pad flanks it in one game.
3. **Slim HUD and pad sizing** — one-row HUD, `dvh`-based button sizes with a 44 px floor, thumb-zone placement, safe-area padding. Verify all four games.
4. **Overlays** — compact the pause overlay (level selector) and the GAME OVER modal for short heights. Verify a score can be submitted in landscape.
5. **Rotation** — verify rotating mid-game keeps the engine running and the score, and that `TouchPad` releases no stuck key. Patch `components/GamePlayer.tsx` only if a class hook is needed; no logic changes.
6. **D-pad-only centering (amendment)** — add the `touchpad--dpad-only` class hook in `TouchPad.tsx`; in `app/globals.css` center the D-pad in portrait and hide `.touchpad-actions` for that class (portrait and landscape). Verify Snake and Arkanoid at 390×844 and 667×375, and that Asteroids and Tetris are unchanged.
7. **QA** — Playwright screenshots per game and viewport, then `npm run format:check`, `npm run lint` and `npm run build`. Patch `app/globals.css` with small Bash edits if the format hook would rewrite a large diff (see project memory).

## Acceptance criteria

- [x] At 667×375, 844×390 and 932×430 in landscape (touch profile), the full game screen is visible with no vertical scroll in Asteroids, Tetris, Arkanoid and Snake.
- [x] In the same viewports the D-pad is on the left of the screen and A/B on the right, both fully visible and vertically inside the viewport.
- [x] Every pad button measures at least 44 px wide and tall in landscape.
- [x] The pad still works in landscape: D-pad directions, A and B reach the game (verified in Asteroids and Tetris), multi-touch (D-pad plus A/B) works, and no key stays stuck after sliding off a button.
- [x] The nav and footer are hidden in landscape, and `MENU` shows and hides the nav.
- [x] The HUD is a single row at 667×375 with all action buttons at least 44 px high and no horizontal overflow.
- [x] The pause overlay with the level selector and the GAME OVER modal show all their buttons and the initials input at 667×375, and a score can be saved.
- [x] Rotating from portrait to landscape and back during a game keeps the score and the running engine (no restart) and applies the matching layout.
- [x] `scrollWidth <= innerWidth` in landscape and portrait at 360×640, 390×844 and 667×375.
- [x] The portrait layout from SPEC 15 at 390×844 is visually unchanged (before/after screenshots).
- [x] On a desktop profile (fine pointer) no pad is rendered and the layout is unchanged at 1366×650 and 1830×890.
- [x] No file in `lib/games/` and no key-handling code in `components/games/TouchPad.tsx` changes.
- [x] `npm run format:check`, `npm run lint` and `npm run build` complete with no errors.

## Decisions taken and discarded

- **Yes (user decision):** the pad flanks the screen in landscape (D-pad left, A/B right), the Game Boy way, so thumbs rest at the edges and the playfield is never covered.
- **Yes (user decision):** split the work. This spec is phone landscape only; laptop UX is a separate spec.
- **Yes:** the landscape layout is pure CSS with `display: contents` on the pad slot. The portal and pad markup from SPEC 15 stay, so no engine, contract or `TouchPad` logic change.
- **Yes (default):** the landscape rules are gated by the existing `:has(.touchpad)`, so they only apply on touch-only devices, as in SPEC 15. Desktop is untouched.
- **Yes (default):** use `orientation: landscape` as the only trigger, with no height breakpoint. Tablets in landscape get the same flanking layout, which works at larger sizes too.
- **Yes (default):** no auto-pause on rotation. It is a separate behavior and not requested.
- **Yes (default):** safe-area insets via `env()` padding only; no `viewport-fit=cover`, which would change how every page renders.
- **No:** overlaying the pad on the canvas. SPEC 15 already rejected it, and fingers would cover the playfield.
- **Yes (user decision, amendment):** games without A/B center their D-pad in portrait, like Snake should look; the spec's "portrait unchanged" rule now applies only to games with A/B.
- **No:** a second pad component for landscape. It would duplicate the press and release logic.
- **No:** orientation lock or fullscreen. It is unreliable on iOS and was out of scope in SPEC 14 and SPEC 15.
- **Pending, not decided here:** what exactly to reorganize on the laptop pre-game page. The user could not name it yet ("I don't like it"); the laptop spec starts with that question.

## Identified risks

| Risk                                                                      | Mitigation                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `display: contents` drops the pad's box styles or hurts accessibility     | Keep buttons as real `<button>` elements; check the buttons stay in the accessibility tree. |
| Very short viewports (≤ 360 px high) cannot fit HUD, screen and 44 px pad | Test 667×375 as the floor; allow vertical scroll only below that and say so in the PR.      |
| The mobile browser URL bar changes `100vh` while rotating                 | Use `dvh` units; verify in Playwright at the three viewports.                               |
| The pause or GAME OVER overlay overflows the short viewport               | Compact spacing plus an internal `overflow: auto` fallback; checked in step 4.              |
| Rotation remounts `GameCanvas` and resets the game                        | The orientation change only toggles CSS; verify the score survives in step 5.               |
| The format hook rewrites the whole of `app/globals.css` on each edit      | Patch the file with small `Bash` edits when the diff would be large (see project memory).   |

## What is **not** in this spec

- Laptop/desktop UX or the pre-game button and info organization.
- Overlay pad, orientation lock, fullscreen, PWA, auto-pause on rotation.
- Engine, sound, skin, Supabase or API changes.
- Changes to the pad's key mapping or press logic.

Each one of those, if it lands, goes in its own spec.
