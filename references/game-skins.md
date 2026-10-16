# Game Skins

Audit log kept by `@skin-designer`. Required skins: neon (default) · classic · retro. Statuses: OK · Partial · Missing.

| Date | Game id | neon | classic | retro | Spec | Notes |
| 2026-10-02 | asteroids | OK | OK | OK | — | Fixed by specs/13-game-skins.md. Palette read at draw time (asteroid and particle colors are live getters); setSkin rebuilds the background; no engine hex; scanlines last for retro; shadowBlur gated by palette.glow. |
| 2026-10-02 | tetris | OK | OK | OK | — | Fixed by specs/13-game-skins.md. setSkin rebuilds the background and marks boardDirty; scanlines last for retro; shadowBlur 0 on classic and retro. |
| 2026-10-02 | arkanoid | OK | OK | OK | — | Fixed by specs/13-game-skins.md. setSkin rebuilds the background and marks bricksDirty; brick names map to palette entries; scanlines last for retro; shadowBlur 0 on classic and retro. |
| 2026-10-02 | snake | OK | OK | OK | — | Fixed by specs/13-game-skins.md. setSkin marks fieldDirty; scanlines last for retro; shadowBlur 0 on classic and retro. Sprite not skinned: fruits.png atlas, so retro is not a pure 4-tone screen (suggest a follow-up spec for per-skin fruit assets). |
| 2026-10-16 | frogger | Missing | Missing | Missing | specs/18-frogger-skins.md | No `skins.ts`; engine hardcodes ~30 colors in `C` plus inline literals (windscreen, wheels, turtle ring, HUD strip); no `setSkin`; no `skins: true` in registry; no scanlines. No sprites (canvas shapes only). Infrastructure from specs/13-game-skins.md already exists. |
