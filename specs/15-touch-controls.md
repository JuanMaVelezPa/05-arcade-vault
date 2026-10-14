# 15 — Touch controls (D-pad + A/B buttons)

**State:** Implemented
**Depends on:** 05-asteroids-game, 08-tetris-game, 09-arkanoid-game, 11-snake-game, 13-game-skins, 14-mobile-responsive-and-hydration-fix
**Date:** 2026-10-14

**Objective:** Let players play all four games on a touchscreen phone or tablet with one shared on-screen pad (a 4-way D-pad and two action buttons, A and B) shown below the canvas.

**Numbering:** 12 is taken by the PONG game-jam drafts in `specs/game-jam/pong/`, which are not promoted yet, so this spec is 15.

## Why this spec exists

SPEC 14 made every page fit phone widths, but left touch controls out of scope. Today Asteroids, Tetris and Snake show a "KEYBOARD REQUIRED" notice on touch-only devices (`components/games/GameCanvas.tsx`), and only Arkanoid works by finger drag. The user wants the same simple control in every game: one movement control and two action buttons.

All four engines already read `keydown`/`keyup` on `window` by `e.code`. The pad can therefore drive them by dispatching synthetic keyboard events, with no change to any engine and no change to the `GameEngine` contract.

## Scope

**In:**

- `components/games/TouchPad.tsx`: a client component with a 4-way D-pad (left side) and two buttons, A and B (right side).
  - Press-and-hold: `pointerdown` dispatches `keydown` on `window`, and `pointerup`, `pointercancel` and losing capture dispatch `keyup`. The component uses `setPointerCapture`, so a finger sliding off the button still releases it.
  - D-pad buttons emulate keyboard auto-repeat: after 250 ms they dispatch `keydown` with `repeat: true` every 60 ms while held. Tetris relies on this for left, right and soft drop. A and B do not repeat.
  - Releases every held key on unmount, on `blur` and on `visibilitychange`, so no key stays stuck.
  - Multi-touch works: one thumb on the D-pad and one on A or B at the same time, each with its own pointer id.
  - `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` and a `contextmenu` guard on the pad, so there is no scroll, zoom, text selection or long-press menu on it.
  - Every button is at least 44 px (same rule as SPEC 14).
- Registry config: a `touch` field on `GameEntry` in `lib/games/registry.ts` describing which D-pad directions and which A/B actions each game uses (see Data model).
- `GameCanvas` renders `<TouchPad>` right below the canvas **only on mobile (touch-only) devices**, using the existing input check (`pointer: coarse` and no `any-pointer: fine`), for all four games, including Arkanoid, which keeps its finger drag on the canvas. On desktop, laptops (including touch laptops with a mouse or trackpad) and any device with a fine pointer, nothing is rendered or changed: no pad, no extra markup, no new listeners.
- Games that do not use a control show it dimmed and disabled, so the pad looks the same in every game.
- Remove the touch-only notice: the `KeyboardRequired` component and its `.kbd-*` CSS in `app/globals.css`, the `blocked` branch in `GameCanvas`, and the `controls` field in the registry.
- Compact play layout on touch-only devices (only while the pad is rendered): the site nav and footer are hidden on the player page, and the HUD, CRT bezel and caption are tightened, so HUD, screen and pad fit on one phone screen without scrolling. A MENU button in the HUD bar (touch-only) shows or hides the nav again, and EXIT still returns to the game page.
- On every device the CRT is sized to the window height (`max-width` from `100dvh`, never below 480 px), so the whole game screen is visible without scrolling on a laptop (user request). This is the only change visible on desktop.
- Styling uses `/frontend-design` and the neon theme tokens (`--cyan`, `--magenta`, ...). It works at 360, 390 and 768 px wide in portrait.

**Out of scope (for future specs):**

- Landscape-specific layout or overlaying the pad on top of the canvas.
- Virtual joystick, swipe or tap gestures.
- Haptic feedback (`navigator.vibrate`).
- Pause, SOUND, SKIN and EXIT on the pad. They stay in the HUD action bar.
- Changes to engines, sound, skins, Supabase or API routes.
- Gamepad API (Bluetooth controllers), PWA, fullscreen or orientation lock.
- Customizing pad layout, size or position.

## Data model

```ts
// lib/games/registry.ts
export type PadDirection = "up" | "down" | "left" | "right";

export interface PadAction {
  code: "Space" | "ArrowUp"; // KeyboardEvent.code sent to the engine
  label: string; // caption under the button, e.g. "FIRE"
}

export interface TouchConfig {
  dpad: PadDirection[]; // enabled directions, the rest render dimmed
  a?: PadAction; // absent = dimmed and disabled
  b?: PadAction;
}

// GameEntry: add `touch: TouchConfig`, remove `controls`
```

Per game:

| Game      | D-pad enabled         | A                  | B                          |
| --------- | --------------------- | ------------------ | -------------------------- |
| Asteroids | left, right (rotate)  | `Space` — FIRE     | `ArrowUp` — THRUST         |
| Tetris    | left, right, down     | `ArrowUp` — ROTATE | `Space` — DROP (hard drop) |
| Snake     | up, down, left, right | none               | none                       |
| Arkanoid  | left, right           | none               | none                       |

D-pad keys map to `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`. The synthetic event is `new KeyboardEvent(type, { code, key, repeat, bubbles: true })`.

No database, storage or `localStorage` changes.

## Implementation plan

1. **Registry config** — add the `PadDirection`, `PadAction` and `TouchConfig` types and the `touch` field to `GameEntry`, filled for the four games as in the table. Nothing reads it yet; `controls` stays for now.
2. **TouchPad component** — create `components/games/TouchPad.tsx` with press/hold dispatch, auto-repeat for the D-pad, pointer capture and release safety. Plain unstyled buttons. Not mounted yet.
3. **Mount and remove the notice** — in `GameCanvas`, render `<TouchPad config={entry.touch}>` below the canvas in touch mode and stop blocking keyboard games. Delete `KeyboardRequired`, the `blocked` branch, the `.kbd-*` CSS and `controls` from the registry. Verify in an emulated phone that each game receives input from the pad.
4. **Styling** — neon style with `/frontend-design`: D-pad cross, round A/B buttons with captions, dimmed disabled state, pressed state, layout for 360, 390 and 768 px. Patch `app/globals.css` with small Bash edits if the format hook would rewrite a large diff (see project memory).
5. **Compact play layout** (added during implementation, user request: the pad was below the fold) — hide the nav and footer on touch-only devices when the pad is rendered, compact the HUD (smaller stats and a single row of 44 px action buttons), the CRT padding and the CRT caption. Pure CSS (`:has(.touchpad)`), plus an `av-footer` class in `app/layout.tsx`.
6. **QA** — Playwright MCP with a touch/mobile profile, screenshots per game in `.playwright-screenshots/`, then `npm run format:check`, `npm run lint` and `npm run build`.

## Acceptance criteria

- [x] On a touch-only device profile (`pointer: coarse`, no fine pointer), the pad appears below the canvas in Asteroids, Tetris, Arkanoid and Snake, and the "KEYBOARD REQUIRED" notice no longer appears.
- [ ] On a desktop profile (fine pointer), no pad is rendered in any game and keyboard play is unchanged.
- [x] Asteroids: left and right on the pad rotate the ship, A fires, B thrusts, and holding B keeps the thrust.
- [x] Tetris: left, right and down move the piece and keep repeating while held, A rotates, B hard drops, and A and B fire once per tap.
- [x] Snake: the four D-pad directions turn the snake.
- [x] Arkanoid: left and right on the pad move the paddle, and finger drag on the canvas still works.
- [x] In Snake and Arkanoid the A and B buttons are dimmed and `disabled`. Unused D-pad directions are dimmed and `disabled` in all games.
- [x] Holding the D-pad with one pointer and pressing A or B with another works at the same time.
- [x] Sliding a finger off a held button releases it (the game receives `keyup`), and no key stays stuck after pausing, ending the game, switching tabs or leaving the page.
- [x] Long-pressing or double-tapping the pad does not select text, zoom, scroll the page or open a context menu.
- [x] Every pad button is at least 44 px tall and wide at 390 px.
- [x] At 360, 390 and 768 px the page has no horizontal scroll (`scrollWidth <= innerWidth`) and the canvas, HUD bar and pad all fit.
- [x] The pad shows the same layout in all four games.
- [x] On a touch-only device the nav and footer are hidden on the player page, and on a 390×844 phone the HUD, screen and the whole pad are visible without scrolling. At 360×640 the pad is at most one short scroll away. Desktop still shows nav and footer. On touch, MENU toggles the nav. On a 1830×890 and a 1366×650 window the whole CRT fits without scrolling.
- [x] PAUSE, END, EXIT, SOUND and SKIN still work from the HUD bar, and a GAME OVER score can still be submitted from a phone.
- [x] `KeyboardRequired`, the `.kbd-*` CSS and `controls` are gone, with no dangling references.
- [x] No engine file in `lib/games/*/` changes.
- [x] `npm run format:check`, `npm run lint` and `npm run build` complete with no errors.

## Decisions taken and discarded

- **Yes:** one shared pad for every game (user decision), so the control is learned once.
- **Yes:** a 4-way D-pad plus two buttons A and B (user decision).
- **Yes:** A is the main action and B is the secondary one: Asteroids fire and thrust, Tetris rotate and hard drop.
- **Yes:** unused controls render dimmed and disabled instead of hidden, so the layout never changes between games.
- **Yes (user decision):** the controls apply only to mobile. Desktop keeps the keyboard and mouse experience untouched, with no pad and no toggle to show it.
- **Yes:** the pad sits below the canvas in portrait, and Arkanoid gets it too, which keeps finger drag as a bonus.
- **Yes:** synthetic `KeyboardEvent` dispatch on `window`. The engines already listen there, so there is no engine change and the framework-free contract stays intact.
- **Yes (default):** the D-pad emulates auto-repeat (250 ms delay, 60 ms interval), because synthetic events do not repeat on their own and Tetris relies on repeat for DAS.
- **Yes (default):** Asteroids keeps thrust on B only, and Tetris keeps rotate on A only, so the matching D-pad "up" is dimmed and the same action is not on two buttons.
- **Yes (default):** the notice is removed, not kept as a fallback. A touch-only device with no pad config no longer exists, since every registry game has `touch`.
- **Yes (default):** HUD controls (PAUSE, END, EXIT, SOUND, SKIN) stay in the HUD bar. The pad is only for gameplay.
- **No:** a virtual joystick. It needs dead-zone and angle code and is imprecise for Tetris and Snake turns.
- **No:** swipe and tap gestures. They are ambiguous in Asteroids (rotate plus thrust) and tiring in Tetris.
- **No:** a new `setTouchInput()` on `GameEngine`. It would change four engines and the contract for no gain.
- **No:** overlaying the pad on the canvas. Fingers would cover the playfield.
- **No:** haptic feedback in this spec. It is a one-liner and can be added later.

## Identified risks

| Risk                                                                              | Mitigation                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| An engine ignores synthetic events (for example it checks `isTrusted`)            | Step 3 verifies each game in an emulated phone; if one fails, stop and open a follow-up spec.     |
| An engine handles `e.repeat` differently, so Tetris repeat feels too fast or slow | Tune delay and interval in step 3 against the Tetris handler (`lib/games/tetris/engine.ts`).      |
| Pointer events not delivered after the finger leaves the button                   | `setPointerCapture` plus `pointercancel` and `lostpointercapture` handlers that release the key.  |
| Hybrid devices (touch laptop with a mouse) do not get a pad                       | The existing `any-pointer: fine` rule treats them as keyboard devices, as today. Documented only. |
| The pad pushes the canvas and HUD past the viewport height on small phones        | Check 360×640 in QA; the page may scroll vertically, but not horizontally.                        |
| The format hook rewrites the whole of `app/globals.css` on each edit              | Patch the file with small `Bash` edits when the diff would be large (see project memory).         |

## What is **not** in this spec

- Landscape or overlay layouts for the pad.
- Joystick, swipe or tap gestures.
- Haptic feedback.
- Pause, sound, skin or exit buttons on the pad.
- Engine, sound, skin, Supabase or API changes.
- Gamepad API, PWA, fullscreen or orientation lock.

Each one of those, if it lands, goes in its own spec.
