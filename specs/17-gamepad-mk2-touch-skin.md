# 17 — Gamepad MK-II look for the touch controls

**State:** Implemented
**Depends on:** 13-game-skins, 15-touch-controls, 16-mobile-landscape-player
**Date:** 2026-10-16

**Objective:** Restyle the existing mobile touch pad (`components/games/TouchPad.tsx`) to match the "Gamepad MK-II" design in `references/gamepad-assets/` (3D D-pad cross with a glowing hub, round neon A/B buttons with a dashed ring), without changing how the pad works.

## Why this spec exists

SPEC 15 built a functional pad with plain neon buttons, and SPEC 16 made it flank the screen in landscape. The design team provided a finished component in `references/gamepad-assets/` (`gamepad.html` + `gamepad-neon.png`) with a more polished look: raised keys with a hard bottom edge, an animated cyan gem in the D-pad center, and glowing round A/B buttons with a magenta (A) and cyan (B) color code.

`gamepad.html` is a standalone page with its own mouse/keyboard script. Per the project rule for `references/`, it is a visual reference, not code to reuse: the press logic stays in `TouchPad.tsx` (synthetic `KeyboardEvent` on `window`, auto-repeat, pointer capture), and only the look and a few decorative markup nodes are ported.

## Scope

**In:**

- **D-pad:** keep the 4 `<button>`s and replace the text arrows (`↑ ↓ ← →`) with the SVG triangle arrows of the reference. Keys are raised (gradient, 1 px border, hard bottom edge `0 4px 0`), and the pressed state sinks the key 3 px with a cyan glow on key and arrow.
- **D-pad hub:** add a decorative `<div class="touchpad-hub" aria-hidden="true">` with the pulsing cyan diamond gem in the center of the cross (`pulse-led` animation). It is not interactive and does not intercept pointer events.
- **A/B buttons:** round buttons with the reference's radial highlight, 2 px colored border, glow and hard bottom edge. A is magenta (`--magenta`), B is cyan (`--cyan`). The letter uses the pixel font (Press Start 2P) with a neon text-shadow. A decorative dashed ring (`.touchpad-ring`, `aria-hidden`) appears around the button while pressed.
- **Pad card:** in portrait the pad container gets the reference body: dark vertical gradient, rounded border `--line`, inner 1 px glow frame (`::before`) and a faint dot texture (`::after`). Landscape keeps SPEC 16 (no card, `display: contents`).
- **Captions:** keep the SPEC 15 caption under each A/B button (`FIRE`, `THRUST`, `ROTATE`, `DROP`), restyled to fit the new look.
- **Disabled state:** unused keys and buttons stay dimmed and `disabled`, reusing the new look at lower opacity and with no glow and no pressed animation.
- **Sizes:** the reference sizes are the maximum: D-pad 156 px with 50 px keys, A/B 74 px. They scale down with the existing portrait and landscape rules (reference mobile sizes 144 / 46 / 64 px as a guide) and never go below 44 px. All sizes from SPEC 15 and 16 that fit the viewport rules (390×844 portrait, 667×375 landscape) are kept or adjusted only as needed to fit.
- **Both orientations:** portrait (SPEC 15 layout) and landscape (SPEC 16 flanking layout) both use the new look. `touchpad--dpad-only` (Snake, Arkanoid) still centers the D-pad and hides the A/B column.
- **Reduced motion:** the gem animation is disabled under `prefers-reduced-motion: reduce`.
- Styling uses `/frontend-design`, the neon tokens already in `app/globals.css`, and the self-hosted pixel font. No Google Fonts link (the reference's `<link>` is not ported).

**Out of scope (for future specs):**

- Any change to key mapping, auto-repeat, pointer capture, release safety or the `TouchConfig` registry data.
- Showing the pad on desktop, or a toggle for it (SPEC 15 decision stays: mobile only).
- Syncing the pressed look with physical keyboard keys (the reference's `.on` class from `keydown`): the pad is touch-only.
- Haptics, sound on press, new buttons (START/SELECT, pause) or a different layout of the pad.
- Using the reference's `gamepad.html` or `gamepad-neon.png` at runtime; they stay in `references/`.
- Changes to engines, skins, Supabase or API routes.

## Data model

This feature introduces no new data structures. It reuses `TouchConfig` and the pad markup from SPEC 15. No database, storage or `localStorage` changes.

## Implementation plan

1. **Baseline** — `/spec-impl` creates `spec-17-gamepad-mk2-touch-skin`. With Playwright MCP (touch profile), take "before" screenshots of Asteroids (A and B) and Snake (D-pad only) at 390×844 portrait and 667×375 landscape, saved to `.playwright-screenshots/`.
2. **Markup** — in `TouchPad.tsx`, replace the text arrow labels with inline SVG arrows (same `aria-label`s), add the decorative hub and the ring nodes (all `aria-hidden`). No change to `press`, `release`, `bind`, effects or event handlers.
3. **Portrait styling** — port the reference styles into `app/globals.css` next to the SPEC 15 `.touchpad-*` rules: card, keys, hub gem, A/B, pressed and disabled states. Verify Asteroids at 390×844 and 360×640 (still fits per SPEC 15 criteria).
4. **Landscape styling** — adapt the same classes inside the SPEC 16 landscape block (no card, `dvh`-based sizes with a 44 px floor, safe-area padding kept). Verify all four games at 667×375, 844×390 and 932×430.
5. **D-pad-only variant and polish** — check Snake and Arkanoid (`touchpad--dpad-only`), the dimmed/disabled states in every game, and `prefers-reduced-motion`.
6. **QA** — Playwright screenshots per game and viewport next to `references/gamepad-assets/gamepad-neon.png`, a functional re-check (D-pad hold repeats in Tetris, A/B fire in Asteroids, multi-touch, no stuck key after sliding off), then `npm run format:check`, `npm run lint` and `npm run build`. Patch `app/globals.css` with small Bash edits if the format hook would rewrite a large diff (see project memory).

## Acceptance criteria

- [x] On a touch-only profile at 390×844, the pad in Asteroids shows a raised 4-key D-pad with SVG arrows and a glowing cyan gem in the center, a magenta A and a cyan B round button, and visually matches `references/gamepad-assets/gamepad-neon.png` (card, colors, glow, hard key edges).
- [x] Pressing a D-pad key sinks it and lights it cyan; pressing A or B sinks it, increases the glow and shows the dashed ring. Releasing (including sliding the finger off) restores the idle look.
- [x] Unused keys and buttons are dimmed, `disabled`, with no glow, no ring and no pressed animation: Asteroids (D-pad up/down), Tetris (D-pad up), Snake and Arkanoid (A and B).
- [x] The gem is decorative: it is `aria-hidden`, it does not receive pointer events, and tapping the D-pad center sends no key.
- [x] The pad still works exactly as in SPEC 15: Asteroids rotate/fire/thrust, Tetris left/right/down repeat while held and A/B fire once per tap, Snake turns in 4 directions, Arkanoid moves the paddle, and multi-touch (D-pad + A or B) works.
- [x] No key stays stuck after sliding off a button, pausing, switching tabs or ending the game.
- [x] In landscape at 667×375, 844×390 and 932×430 the new look applies, the D-pad is on the left and A/B on the right (no card), everything is inside the viewport and the full game screen is visible with no vertical scroll.
- [x] Snake and Arkanoid still center the D-pad in portrait and hide the A/B column in both orientations.
- [x] Every button measures at least 44 px wide and tall in both orientations.
- [x] `scrollWidth <= innerWidth` at 360×640, 390×844 and 667×375, and the SPEC 15 fit rules hold (390×844: HUD, screen and the whole pad visible without scrolling).
- [x] With `prefers-reduced-motion: reduce` the gem does not animate.
- [x] On a desktop profile (fine pointer) no pad is rendered and the layout is unchanged at 1366×650 and 1830×890.
- [x] No file in `lib/games/` changes, and no key-handling code in `TouchPad.tsx` changes (only markup nodes and labels).
- [x] `references/gamepad-assets/` is unchanged and nothing under it is imported by the app.
- [x] `npm run format:check`, `npm run lint` and `npm run build` complete with no errors.

## Decisions taken and discarded

- **Yes:** restyle only. Logic, registry and layout (SPEC 15 and 16) are kept; the reference is a design source, not code to copy (project rule for `references/`).
- **Yes:** keep `TouchPad.tsx` as the single pad component and its synthetic-keyboard approach. The reference script (`data-key` + keyboard sync) is not ported.
- **Yes:** keep the 4 separate D-pad buttons plus a non-interactive hub, as in the reference. The hub makes the cross read as one piece without adding a fifth input.
- **Yes:** B left and A right, in the same order as the reference and as SPEC 15 already renders.
- **Yes (default):** keep the A/B captions from SPEC 15. The reference has none, but players need to know that A is FIRE or ROTATE, and they differ per game.
- **Yes (default):** pressed state uses CSS `:active` plus pointer capture, which already holds while the finger is down; no extra React state or `.on` class.
- **Yes (default):** the reference sizes are caps; the existing SPEC 15 and 16 responsive sizing wins when the viewport is tight, with the 44 px floor kept.
- **Yes (default):** the landscape layout drops the card as in SPEC 16, so the pad still flanks the screen.
- **Yes (default):** the pad look is the same for all three skins (Neon, classic, retro). It is device UI, not game art.
- **No:** copying `gamepad.html` or loading its Google Fonts. The project already self-hosts Press Start 2P.
- **No:** showing the pad on desktop. SPEC 15 decided mobile only.
- **No:** a second pad component or a CSS-only copy of the reference classes (`.gp`, `.dp`, `.ab`). The existing `.touchpad-*` names stay to avoid breaking SPEC 16 selectors.

## Identified risks

| Risk                                                                                  | Mitigation                                                                                                |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The reference sizes (156 px D-pad, 74 px A/B) do not fit 360×640 or 667×375           | Treat them as caps, scale with the existing rules, check the SPEC 15 and 16 fit criteria in step 3 and 4. |
| New hub or ring nodes intercept touches or break the SPEC 16 `display: contents` grid | `pointer-events: none` on decorative nodes; check landscape grid placement in step 4.                     |
| Box-shadow and glow effects cost frame rate on low-end phones while a game runs       | Static shadows only, animate just the gem's `opacity`/`transform`; check play feel in step 6.             |
| The format hook rewrites the whole of `app/globals.css` on each edit                  | Patch the file with small `Bash` edits when the diff would be large (see project memory).                 |
| The SVG arrows change the accessible name of the buttons                              | Keep the existing `aria-label`s and mark the SVGs `aria-hidden`.                                          |

## What is **not** in this spec

- Changes to key mapping, repeat or press logic.
- Desktop pad or toggle, keyboard-synced pressed state.
- Haptics, sound, extra buttons, new layouts.
- Engine, skin, Supabase or API changes.

Each one of those, if it lands, goes in its own spec.
