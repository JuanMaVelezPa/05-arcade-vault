# 10 — Sound Mute Toggle

**State:** Implemented
**Depends on:** 05-asteroids-game, 09-arkanoid-game
**Date:** 2026-09-28

**Objective:** Add a SOUND ON/OFF toggle to the `GamePlayer` HUD, plus an M key shortcut, that mutes game sound effects and remembers the choice in `localStorage`.

## Scope

### In scope

- A mute toggle button in the `GamePlayer` HUD, in `.hud-actions` before PAUSE:
  - the label is `SOUND ON` when sound plays and `SOUND OFF` when muted;
  - it has `aria-pressed={muted}` and `aria-label="Mute sound"`;
  - the style reuses an existing `.btn` variant, and the OFF state gets a dimmed look (`/frontend-design`);
  - it renders only for registry entries with `sound: true`. Today that is only `arkanoid`.
- The M key toggles mute while on `/player/[id]`:
  - it works while playing and while paused;
  - it is ignored while the GAME OVER modal is open and while typing in an input (initials field);
  - it ignores `e.repeat`.
- Muting takes effect right away:
  - sounds already playing stop;
  - no new sound plays while muted;
  - unmuting does not replay missed sounds.
- The preference persists in `localStorage` under the key `arcade-vault:muted:v1`, with values `"1"` (muted) and `"0"` (unmuted).
- A missing key, an unknown value, or an unavailable `localStorage` means unmuted (the default).
- The preference applies to every game and survives reloads, PLAY AGAIN, and navigation between games.
- Changing the preference in one tab updates other open tabs (the `storage` event).
- The engine contract gets an optional `setMuted?(muted: boolean): void`. The ARKANOID engine implements it. Engines without sound omit it.
- `GameCanvas` passes the current mute state to each new engine right after `create()`, and again on every change.

### Not in scope

- A volume slider or any level between 0 and 100%.
- A mute control in the global `Nav` or on pages other than `/player/[id]`.
- Storing the preference in Supabase or per player.
- Adding sounds to ASTEROIDS, TETRIS, or the simulated arena.
- Background music.
- Separate toggles for music and effects.
- Auto-muting when the tab is hidden. The engine's auto-pause already silences the game.

## Data model

No schema change. No new `games` columns.

```ts
// lib/games/types.ts — GameEngine (optional, existing engines ignore it)
setMuted?(muted: boolean): void; // true stops live sounds and blocks new ones

// lib/games/registry.ts — GameEntry
sound?: boolean; // shows the HUD mute toggle when true

// components/games/GameCanvas.tsx — new prop
muted: boolean;
```

Preference store, in the new file `lib/sound-pref.ts`:

```ts
export const MUTED_KEY = "arcade-vault:muted:v1"; // "1" | "0"

export function useMuted(): [muted: boolean, setMuted: (m: boolean) => void];
```

- Built on `useSyncExternalStore`. The client snapshot reads `localStorage`, and the server snapshot is `false`.
- It subscribes to the `storage` event (other tabs) and to an in-module listener set (this tab).
- Every `localStorage` read and write is wrapped in `try/catch`. On failure the state is kept in memory for the session.

ARKANOID engine internal state: a `muted` flag in the closure, `false` until `setMuted` is called.

## Implementation plan

1. **Preference store** — add `lib/sound-pref.ts` with `MUTED_KEY` and `useMuted()`. Nothing imports it yet.
2. **Contract** — add the optional `setMuted` to `GameEngine` and `sound` to `GameEntry`. No entry sets `sound` yet, so nothing changes.
3. **ARKANOID engine** — implement `setMuted` in `lib/games/arkanoid/engine.ts`: `play()` returns early while muted, and `setMuted(true)` calls `stopSounds()`. Set `sound: true` on the `arkanoid` registry entry.
4. **GameCanvas wiring** — add the `muted` prop. Call `engine.setMuted?.(muted)` right after `create()` (reading the latest value without recreating the engine), and in an effect on `muted`.
5. **HUD toggle and M key** — in `GamePlayer`, read `useMuted()`, pass `muted` to `GameCanvas`, and render the toggle when `entry?.sound`. Add a `window` keydown listener for `KeyM` with the guards from Scope. Style the button with `/frontend-design`.
6. **QA** — Playwright MCP (screenshots in `.playwright-screenshots/`), then `npm run lint` and `npm run build`.

## Acceptance criteria

- [x] `/player/arkanoid` shows a `SOUND ON` button in the HUD on a first visit (empty `localStorage`).
- [x] `/player/asteroids` and `/player/tetris` show no sound button.
- [x] Clicking the button switches the label to `SOUND OFF`, sets `aria-pressed="true"`, and writes `"1"` to `arcade-vault:muted:v1`.
- [x] While muted, ball bounces and brick breaks play no sound.
- [x] Muting while a sound is playing stops it.
- [x] Clicking again switches back to `SOUND ON`, writes `"0"`, and the next bounce plays its sound.
- [x] Pressing M toggles mute while playing and while paused, and the button label stays in sync.
- [x] Holding M toggles only once.
- [x] Pressing M while typing initials in the GAME OVER modal does not toggle mute.
- [x] Reloading `/player/arkanoid` after muting keeps it muted, and no sound plays in the new run.
- [x] PLAY AGAIN keeps the current mute state.
- [x] Toggling in one tab updates the button label in a second open `/player/arkanoid` tab.
- [x] Setting `arcade-vault:muted:v1` to `"garbage"` loads as `SOUND ON`.
- [x] The page renders with no hydration warning in the console.
- [x] ARKANOID gameplay, pause, END, and save still work.
- [x] `npm run build` and `npm run lint` complete with no errors.

## Decisions taken and discarded

- **Yes: a mute toggle only.** Explicit user decision. There are only two short sound effects today.
- **No: a volume slider.** It adds UI and state for two effects. It can come in its own spec if music lands.
- **Yes: the toggle lives in the player HUD only.** Explicit user decision. The player is the only place sound plays.
- **No: a global `Nav` control.** It would be visible on pages that never play sound.
- **Yes: `localStorage` with a versioned key (`arcade-vault:muted:v1`).** Explicit user decision. It survives reloads, needs no DB change, and the `:v1` suffix allows a later format change.
- **No: session-only state or a Supabase column.** Session-only forgets the choice. Supabase is overkill for a device preference, and players are anonymous.
- **Yes: M shortcut, unmuted by default.** Explicit user decision.
- **Yes (default): one global preference for all games.** It is simpler than per-game settings, and players expect mute to stick.
- **Yes (default): the button shows only for entries with `sound: true`.** A button that does nothing on silent games would mislead.
- **Yes (default): the shell owns the M key, not each engine.** Mute is a shell preference, so engines only receive `setMuted` and need no key handling.
- **Yes (default): `setMuted` as an optional engine method.** This is the same opt-in pattern as `jumpToLevel` in spec 09, so silent engines stay unchanged.
- **Yes (default): cross-tab sync via the `storage` event.** It comes free with `useSyncExternalStore` and avoids two tabs disagreeing.
- **No: muting through `HTMLAudioElement.volume` or `muted`.** Skipping `play()` is simpler, and it also skips the autoplay rejection path.

## Identified risks

| Risk                                                                           | Mitigation                                                                                                                 |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Hydration mismatch, since the server cannot read `localStorage`                | The server snapshot is `false`. `useSyncExternalStore` re-renders with the stored value after hydration without a warning. |
| `localStorage` throws (privacy mode, blocked storage)                          | Reads and writes are in `try/catch`. The toggle still works in memory for the session.                                     |
| The M key collides with a future game control                                  | No current game uses M. A future engine that needs M must be handled in its own spec.                                      |
| A new engine is created (PLAY AGAIN, input-mode change) without the mute state | `GameCanvas` calls `setMuted` right after every `create()`, not only on changes.                                           |

## What is **not** in this spec

- A volume slider.
- A mute control in `Nav` or outside the player.
- Supabase or per-player storage of the preference.
- New sounds or music for any game.

Each one of those, if it lands, goes in its own spec.
