# Game Mobile Audit

Audit log kept by `@mobile-porter`. Reference: `specs/15-touch-controls.md`. Statuses: OK · Partial · Missing · Not verified.

| Date | Game id | Portrait | Landscape | Desktop | Spec | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-16 | frogger | OK | OK | OK | — | D-pad only (`touchpad--dpad-only`), A/B dimmed. Engine reads arrows/WASD plus P/Escape (pause, no pad key needed; GamePlayer has the pause button). Pad buttons 47-50 px, no h-scroll, console clean. Engine ignores `repeat`, so holding a D-pad direction gives one hop per press (by design). GAME OVER initials modal at 375 px tall not verified. |
