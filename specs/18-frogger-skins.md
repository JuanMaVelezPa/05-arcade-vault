# 18 — Frogger Skins (neon, classic, retro)

**State:** Implemented
**Depends on:** 13-game-skins, 17-gamepad-mk2-touch-skin
**Date:** 2026-10-16

**Objective:** Give Frogger the three skins (neon default, classic, retro) using the skin infrastructure from spec 13, so the HUD SKIN button works on `/player/frogger`.

**Numbering:** 18 follows the highest spec number found (17). The Frogger core draft in `specs/game-jam/frogger/01-frogger-core.md` is not numbered in the main sequence.

## Why this spec exists

Audit of 2026-10-16: `lib/games/frogger/` has no `skins.ts`, the engine hardcodes about 30 colors in a `C` object plus four inline literals, there is no `setSkin`, and the registry entry lacks `skins: true`. All three skins are Missing. The infrastructure (`lib/skin-pref.ts`, `Skin` type, `setSkin?` on `GameEngine`, `skins?: true`, HUD SKIN button, `lib/games/scanlines.ts`) already exists, so it is not part of this spec.

## Scope

### In scope

- New `lib/games/frogger/skins.ts` exporting `SKINS: Record<Skin, Palette>` with `neon`, `classic`, `retro`.
- `lib/games/frogger/engine.ts`: replace the `C` constant and the inline colors with the active palette; implement `setSkin`.
- `lib/games/registry.ts`: add `skins: true` to the `frogger` entry.
- Retro draws `drawScanlines` last in `draw()`.

### Out of scope

- Infrastructure changes, sound, new sprites (Frogger draws everything with canvas shapes, so there is no image asset to skin).
- Changing gameplay, lanes, speeds or layout.
- Skinning the React HUD or the touch pad.

## Data model

```ts
// lib/games/frogger/skins.ts
export interface Palette {
  road: string; roadLine: string; river: string; riverWave: string;
  safe: string; safeDot: string; goalBank: string; goalMouth: string; goalEdge: string;
  frog: string; frogDark: string; eyeWhite: string; eyePupil: string;
  log: string; logLine: string; turtle: string; turtleShell: string; turtleDive: string;
  truck: string; truckCab: string; cars: [string, string, string];
  windscreen: string; wheel: string;
  hudStrip: string; text: string;
  timeOk: string; timeMid: string; timeLow: string;
  glow: string | null; // shadowBlur color; null = no shadowBlur
}
export const SKINS: Record<Skin, Palette>;
```

Neon values equal what the engine draws today. Retro uses the 4 tones T0 `#0f380f`, T1 `#306230`, T2 `#8bac0f`, T3 `#9bbc0f` only. Classic is flat arcade color (black road, blue river, no alpha glow).

| Element | neon | classic | retro |
| --- | --- | --- | --- |
| road | `#0c0c16` | `#000000` | `#0f380f` |
| roadLine | `rgba(230, 233, 255, 0.22)` | `#ffffff` | `#306230` |
| river | `#00203a` | `#0000a8` | `#306230` |
| riverWave | `rgba(0, 245, 255, 0.14)` | `#2121de` | `#8bac0f` |
| safe | `#0b3a1f` | `#7a1fa2` | `#8bac0f` |
| safeDot | `rgba(0, 255, 136, 0.22)` | `#9a3fc2` | `#306230` |
| goalBank | `#0a3d20` | `#00a800` | `#306230` |
| goalMouth | `#2a9d5c` | `#000000` | `#0f380f` |
| goalEdge | `#ffcf3a` | `#ffff00` | `#9bbc0f` |
| frog | `#00ff88` | `#00e000` | `#9bbc0f` |
| frogDark | `#00a85a` | `#008000` | `#306230` |
| eyeWhite | `#ffffff` | `#ffffff` | `#9bbc0f` |
| eyePupil | `#0a0a0f` | `#000000` | `#0f380f` |
| log | `#8a5a2b` | `#a0522d` | `#8bac0f` |
| logLine | `#5c3a18` | `#5c2e12` | `#306230` |
| turtle | `#1fbf6a` | `#00c000` | `#9bbc0f` |
| turtleShell | `#0f7a40` | `#006000` | `#306230` |
| turtleDive | `rgba(31, 191, 106, 0.3)` | `#00c000` | `#8bac0f` |
| truck | `#9aa4b8` | `#c8c8c8` | `#8bac0f` |
| truckCab | `#ff006e` | `#ff0000` | `#9bbc0f` |
| cars[0] | `#ff3b3b` | `#ff0000` | `#9bbc0f` |
| cars[1] | `#f5ff00` | `#ffff00` | `#8bac0f` |
| cars[2] | `#00f5ff` | `#ff7fd0` | `#9bbc0f` |
| windscreen | `rgba(0, 0, 0, 0.35)` | `#000000` | `#0f380f` |
| wheel | `#0a0a0f` | `#000000` | `#0f380f` |
| hudStrip | `rgba(0, 0, 0, 0.55)` | `#000000` | `#0f380f` |
| text | `#e6e9ff` | `#ffffff` | `#9bbc0f` |
| timeOk | `#00ff88` | `#00e000` | `#9bbc0f` |
| timeMid | `#f5ff00` | `#ffff00` | `#8bac0f` |
| timeLow | `#ff006e` | `#ff0000` | `#306230` |
| glow | `null` | `null` | `null` |

Neon draws no `shadowBlur` today, so `glow` stays `null` in all skins. The field exists only to keep the shape shared with other games; drop it if unused.

## Implementation plan

1. Create `skins.ts` with the table above.
2. In `engine.ts`, add `let palette = SKINS.neon` and replace every `C.x` and inline literal (windscreen `rgba(0,0,0,0.35)`, wheels `#0a0a0f` in cars and trucks, turtle dive ring `rgba(31,191,106,0.3)`, HUD strip `rgba(0,0,0,0.55)`) with `palette.x`. Read it at draw time, never cache a color in lane or object state.
3. Add `setSkin(skin)` to the returned engine: set `palette = SKINS[skin]` and call `draw()` once so a paused frame repaints. Frogger redraws the whole canvas each frame (no offscreen layer), so nothing else is cached.
4. At the end of `draw()`: `if (skin === "retro") drawScanlines(ctx, W, H)` (import from `lib/games/scanlines.ts`).
5. Add `skins: true` to `GAME_REGISTRY.frogger`.
6. Update `references/game-skins.md` by re-running `@skin-designer frogger`.

## Acceptance criteria

- [x] `lib/games/frogger/skins.ts` exports `SKINS` with `neon`, `classic`, `retro`, each with every field of `Palette`.
- [x] `grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' lib/games/frogger/engine.ts` finds no color literal outside comments.
- [x] `setSkin` exists and a paused game repaints right away with the new palette.
- [x] The SKIN button shows on `/player/frogger` and cycles neon, classic, retro.
- [x] Neon looks identical to today (compare screenshots).
- [x] Retro draws scanlines last; retro uses only the 4 tones; classic and retro have no `shadowBlur` above 0.
- [x] Hops, river carry, hazards, goals and the time bar are unchanged in every skin.
- [x] `npm run lint` and `npm run build` pass.

## Decisions taken and discarded

| Decision | Choice |
| --- | --- |
| Retro palette is Game Boy greens, not amber | Yes (default) |
| Classic follows the original arcade look (black road, blue river, purple banks) | Yes (default) |
| Palette entries are solid colors, no alpha, in classic and retro | Yes (default) |
| `glow` kept as `null` for shape parity | Yes (default) |
| No offscreen layers, so `setSkin` only swaps the palette and redraws | Yes (default) |
| Per-skin sprites | Discarded: Frogger has none |

## Identified risks

- Retro tone collisions: frog (T3) over safe banks (T2) has low contrast; verify visually and swap `safe` to T1 if needed.
- Cars use three colors; in retro two map to T3, so lane colors repeat. Accepted.
- A missed literal would leave a stale color after a skin change; the grep criterion catches it.

## Not in this spec

- Skinning the touch pad or React HUD.
- Per-skin sound.
- New skins beyond neon, classic, retro.
