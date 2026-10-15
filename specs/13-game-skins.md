# 13 — Game Skins (neon, classic, retro)

**State:** Implemented
**Depends on:** 05-asteroids-game, 08-tetris-game, 09-arkanoid-game, 10-sound-mute-toggle, 11-snake-game
**Date:** 2026-10-02

**Objective:** Give Asteroids, Tetris, Arkanoid and Snake three selectable skins (neon default, classic, retro), chosen at any time from a SKIN button in the `GamePlayer` HUD bar (next to PAUSE, END and EXIT) and remembered in `localStorage`.

**Numbering:** 12 is taken by the PONG game-jam drafts in `specs/game-jam/pong/`, which are not promoted yet, so this spec is 13.

## Why this spec exists

The 2026-10-02 audit found no `lib/games/<id>/skins.ts` and no skin infrastructure. Every engine hardcodes its colors in module constants, so all three skins are `Missing` for all four games. One spec covers the shell plus the four palettes, because the shell alone has no visible effect.

## Scope

**In:**

- Shell infrastructure:
  - `Skin` type and optional `setSkin?(skin: Skin): void` on `GameEngine` in `lib/games/types.ts`.
  - `skins?: true` on `GameEntry` in `lib/games/registry.ts`, set on all four games.
  - `lib/skin-pref.ts`, same pattern as `lib/sound-pref.ts`: key `arcade-vault:skin:v1`, values `"neon" | "classic" | "retro"`, `useSyncExternalStore`, in-memory fallback, `storage` event sync. Missing or unknown value means `neon`.
  - A SKIN button in the `GamePlayer` HUD action bar, next to PAUSE, END and EXIT, shown only when `entry.skins`. One click cycles NEON → CLASSIC → RETRO. It shows the current skin name and a small palette chip, works while playing, paused or before the first input, and does not pause the game. Styled with `/frontend-design`.
  - `GameCanvas` takes a `skin` prop, calls `engine.setSkin?.(skin)` right after `create()` and on every change.
- `lib/games/<id>/skins.ts` for each game, exporting `SKINS: Record<Skin, Palette>` with a full palette of every color the engine draws.
- Each engine reads colors from the active palette and has no hardcoded hex or `rgb(` values left on themed elements.
- Classic and retro set glow (`shadowBlur`) to 0. Neon keeps today's blur values.
- Retro also gets a CRT feel on the canvas: faint scanlines drawn by the engine as `rgba(0,0,0,0.12)` every 3 px, retro only.

**Out of scope (for future specs):**

- New games, sprites, fonts or sound changes per skin.
- Skinning the shell (HUD, nav, pages), which stays neon.
- Per-game skin preference, unlockable skins, or storing the skin in Supabase.
- Skins for the simulated arena fallback.

## Data model

```ts
// lib/games/types.ts
export type Skin = "neon" | "classic" | "retro";
// GameEngine
setSkin?(skin: Skin): void; // repaints with the new palette; no restart

// lib/games/registry.ts — GameEntry
skins?: true; // shows the HUD skin button

// lib/skin-pref.ts
export const SKIN_KEY = "arcade-vault:skin:v1";
export function useSkin(): [skin: Skin, setSkin: (s: Skin) => void];

// lib/games/<id>/skins.ts
export const SKINS: Record<Skin, Palette>; // Palette is typed per game
```

Neon values below equal what the engines draw today. Retro tones: Game Boy `#0f380f` `#306230` `#8bac0f` `#9bbc0f` for Tetris, Arkanoid and Snake; amber `#1a0f00` `#6b4200` `#c27c00` `#ffb000` for Asteroids. `bg` is the playfield fill; neon keeps its `#0a0030` to `#000` vertical gradient (`bg` = top, `bg2` = bottom), the other skins use one flat color (`bg2` = `bg`).

### Asteroids

| Element               | neon                  | classic   | retro     |
| --------------------- | --------------------- | --------- | --------- |
| bg / bg2              | `#0a0030` / `#000000` | `#000000` | `#1a0f00` |
| ship outline          | `#00f5ff`             | `#ffffff` | `#ffb000` |
| bullet                | `#00f5ff`             | `#ffffff` | `#ffb000` |
| ship explosion        | `#00f5ff`             | `#ffffff` | `#ffb000` |
| ship spawn shield     | `#00f5ff`             | `#ffffff` | `#c27c00` |
| thrust flame stroke   | `rgba(255,140,0,0.9)` | `#ffffff` | `#c27c00` |
| thrust flame glow     | `#ff8c00`             | none      | none      |
| asteroid size 1 and 3 | `#ff006e`             | `#ffffff` | `#c27c00` |
| asteroid size 2       | `#f5ff00`             | `#ffffff` | `#ffb000` |
| other white (`WHITE`) | `#ffffff`             | `#ffffff` | `#ffb000` |

### Tetris

| Element              | neon                     | classic (NES-style)      | retro     |
| -------------------- | ------------------------ | ------------------------ | --------- |
| bg / bg2             | `#0a0030` / `#000000`    | `#000000`                | `#9bbc0f` |
| piece I              | `#00f5ff`                | `#00e0e8`                | `#0f380f` |
| piece O              | `#f5ff00`                | `#f8d800`                | `#306230` |
| piece T              | `#ff006e`                | `#b800d8`                | `#0f380f` |
| piece S              | `#00ff88`                | `#00b800`                | `#306230` |
| piece Z              | `#d97a3a`                | `#e83800`                | `#0f380f` |
| piece J              | `#c7d0e0`                | `#0058f8`                | `#306230` |
| piece L              | `#ffcf3a`                | `#f89800`                | `#0f380f` |
| piece N (nut)        | `#8a8fb5`                | `#7c7c7c`                | `#8bac0f` |
| cell highlight       | `rgba(255,255,255,0.35)` | `rgba(255,255,255,0.35)` | `#8bac0f` |
| cell shade           | `rgba(0,0,0,0.28)`       | `rgba(0,0,0,0.28)`       | `#306230` |
| grid lines           | `rgba(0,245,255,0.18)`   | `#303030`                | `#8bac0f` |
| ghost / frame stroke | `rgba(0,245,255,0.55)`   | `#bcbcbc`                | `#0f380f` |
| frame glow (`CYAN`)  | `#00f5ff`                | none                     | none      |

### Arkanoid

| Element                   | neon                     | classic (1986 arcade)    | retro     |
| ------------------------- | ------------------------ | ------------------------ | --------- |
| bg / bg2                  | `#0a0030` / `#000000`    | `#000000`                | `#9bbc0f` |
| brick red                 | `#d97a3a`                | `#e83800`                | `#0f380f` |
| brick yellow              | `#f5ff00`                | `#f8d800`                | `#306230` |
| brick cyan                | `#00f5ff`                | `#00b8f8`                | `#306230` |
| brick magenta             | `#ff006e`                | `#f878f8`                | `#0f380f` |
| brick hotpink (silver)    | `#c7d0e0`                | `#bcbcbc`                | `#8bac0f` |
| brick green               | `#00ff88`                | `#00b800`                | `#306230` |
| brick gray                | `#8a8fb5`                | `#7c7c7c`                | `#0f380f` |
| brick highlight           | `rgba(255,255,255,0.4)`  | `rgba(255,255,255,0.4)`  | `#8bac0f` |
| brick shade               | `rgba(0,0,0,0.28)`       | `rgba(0,0,0,0.28)`       | `#306230` |
| paddle body (`CYAN`)      | `#00f5ff`                | `#bcbcbc`                | `#0f380f` |
| paddle accent (`MAGENTA`) | `#ff006e`                | `#e83800`                | `#306230` |
| paddle sheen              | `rgba(255,255,255,0.45)` | `rgba(255,255,255,0.45)` | `#8bac0f` |
| ball (`INK`)              | `#e6e9ff`                | `#ffffff`                | `#0f380f` |
| ball glow                 | `#00f5ff`                | none                     | none      |

### Snake

| Element              | neon                    | classic (Nokia-style mono) | retro     |
| -------------------- | ----------------------- | -------------------------- | --------- |
| bg / bg2             | `#0a0030` / `#000000`   | `#9ead86`                  | `#9bbc0f` |
| grid lines           | `rgba(0,245,255,0.18)`  | `#8a9874`                  | `#8bac0f` |
| fruit (`MAGENTA`)    | `#ff006e`               | `#2b3320`                  | `#0f380f` |
| fruit highlight      | `rgba(255,255,255,0.4)` | `#9ead86`                  | `#8bac0f` |
| fruit shade          | `rgba(0,0,0,0.28)`      | `#2b3320`                  | `#306230` |
| snake body (`GREEN`) | `#00ff88`               | `#2b3320`                  | `#306230` |
| snake head           | `#b3ffd9`               | `#2b3320`                  | `#0f380f` |
| head on crash flash  | `#ff006e`               | `#9ead86`                  | `#8bac0f` |
| eyes                 | `#0a0a0f`               | `#9ead86`                  | `#9bbc0f` |
| glow (fruit, snake)  | `#ff006e` / `#00ff88`   | none                       | none      |

## Implementation plan

1. **Contract and preference** — add `Skin` and `setSkin?` to `types.ts`, `skins?` to `GameEntry`, and `lib/skin-pref.ts` with `useSkin()`. Nothing imports it yet.
2. **Shell wiring** — `GameCanvas` gets the `skin` prop and calls `setSkin?.` after `create()` and on change. `GamePlayer` reads `useSkin()` and renders the HUD SKIN button when `entry.skins`. Registry flags stay unset, so no UI changes yet.
3. **Snake** — add `lib/games/snake/skins.ts` (neon equals today), switch the engine to `palette.*`, implement `setSkin`, set `skins: true`. Smallest engine, so it proves the pattern.
4. **Arkanoid** — same steps for `lib/games/arkanoid/skins.ts`.
5. **Tetris** — same steps for `lib/games/tetris/skins.ts`.
6. **Asteroids** — same steps for `lib/games/asteroids/skins.ts`. Its `glow()` helper becomes a no-op when the palette has no glow.
7. **Retro CRT overlay** — shared helper `lib/games/scanlines.ts` called at the end of each draw when the skin is `retro`.
8. **QA** — Playwright MCP with a screenshot per game and skin in `.playwright-screenshots/`, then `npm run lint` and `npm run build`.

## Acceptance criteria

- [x] On a first visit (empty `localStorage`) every game renders with the neon look, unchanged from today.
- [x] The HUD bar of each of the four games shows a SKIN button reading NEON by default; each click moves to CLASSIC, then RETRO, then back to NEON, also while the game is running.
- [x] Selecting a skin repaints the canvas right away and keeps score, lives, level and board state.
- [x] The choice is written to `arcade-vault:skin:v1` and survives reload, PLAY AGAIN and navigation between games.
- [x] Setting the key to `"garbage"` loads neon, with no hydration warning.
- [x] Changing the skin in one tab updates a second open player tab.
- [x] `grep` for `#[0-9a-fA-F]{3,8}` and `rgba?\(` in each `engine.ts` finds no themed colors.
- [x] Each `skins.ts` exports `SKINS` with `neon`, `classic` and `retro`, and neon values match the tables above.
- [x] Classic and retro draw with `shadowBlur` 0 everywhere.
- [x] Retro uses only its 4 tones plus the scanline overlay.
- [x] Gameplay, pause, END, restart and score submission work in all three skins.
- [x] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes (default):** one global skin preference for all games, like mute in SPEC 10.
- **Yes (default):** `localStorage` key `arcade-vault:skin:v1` with in-memory fallback.
- **Yes (changed 2026-10-02):** the selector is a SKIN cycle button in the HUD action bar, because the skin is a global preference the player must be able to change at any time, like the SOUND toggle. `setSkin` only repaints, so changing it mid-play is safe.
- **No (changed 2026-10-02):** the pause-overlay selector. It forced the player to pause first. The overlay no longer shows any skin control.
- **No:** a three-button segmented control in the HUD. It is wider than the bar allows next to SOUND, PAUSE, END and EXIT.
- **Yes (default):** neon is the default and its palette copies today's hex values, so nothing changes visually.
- **Yes (default):** Game Boy greens for Tetris, Arkanoid and Snake, amber monochrome for Asteroids, whose vector look suits CRT amber.
- **Yes (default):** retro Tetris and Arkanoid alternate tones for pieces and bricks. Color identity is lost, which matches a 4-tone screen.
- **Yes (default):** classic Snake uses Nokia-style monochrome, since the original home release was a phone game.
- **Yes (default):** `setSkin` is an optional engine method, the same opt-in pattern as `setMuted`.
- **Yes (default):** one spec for the shell and all four games, built one engine per step.
- **No:** reading colors from CSS variables at runtime. Engines are framework-free, and classic and retro are not in the tokens.
- **No:** skinning HUD and pages. They stay neon.

## Identified risks

| Risk                                                                 | Mitigation                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Retro tones make pieces or bricks hard to tell apart                 | Alternating tones plus highlight and shade; verify in QA screenshots. |
| `setSkin` mid-run leaves cached gradients or offscreen sprites stale | Rebuild any cached gradient in `setSkin` and redraw.                  |
| Per-frame `shadowBlur` cost differs by skin                          | Classic and retro skip it, which is cheaper.                          |
| Hydration mismatch from `localStorage`                               | Server snapshot is `neon`, as in `lib/sound-pref.ts`.                 |
| Hex values drift from the engines before implementation              | Re-grep each engine before step 3 to 6 and fix the neon column.       |

## What is **not** in this spec

- New games, sprites, fonts or per-skin sounds.
- Skinning the HUD, nav or pages.
- Per-game or per-player skin storage, or Supabase changes.
- Skins for the simulated arena.

Each one of those, if it lands, goes in its own spec.
