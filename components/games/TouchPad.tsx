"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PadDirection, TouchConfig } from "@/lib/games/registry";

// Synthetic keyboard events on window drive the engines, which already listen there.
const DPAD_KEYS: Record<PadDirection, { code: string; key: string }> = {
  up: { code: "ArrowUp", key: "ArrowUp" },
  down: { code: "ArrowDown", key: "ArrowDown" },
  left: { code: "ArrowLeft", key: "ArrowLeft" },
  right: { code: "ArrowRight", key: "ArrowRight" },
};
const DPAD_LABELS: Record<PadDirection, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};
const DPAD_ORDER: PadDirection[] = ["up", "left", "right", "down"];

// Synthetic events do not auto-repeat, so the D-pad emulates it (Tetris relies on it).
const REPEAT_DELAY_MS = 250;
const REPEAT_INTERVAL_MS = 60;

interface Held {
  code: string;
  key: string;
  pointerId: number;
  delay?: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
}

function fire(
  type: "keydown" | "keyup",
  code: string,
  key: string,
  repeat = false,
) {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key, repeat, bubbles: true }),
  );
}

export default function TouchPad({ config }: { config: TouchConfig }) {
  const held = useRef(new Map<string, Held>());

  const press = useCallback(
    (
      id: string,
      code: string,
      key: string,
      pointerId: number,
      repeat: boolean,
    ) => {
      if (held.current.has(id)) return;
      const entry: Held = { code, key, pointerId };
      held.current.set(id, entry);
      fire("keydown", code, key);
      if (repeat) {
        entry.delay = setTimeout(() => {
          entry.interval = setInterval(
            () => fire("keydown", code, key, true),
            REPEAT_INTERVAL_MS,
          );
        }, REPEAT_DELAY_MS);
      }
    },
    [],
  );

  const release = useCallback((id: string, pointerId?: number) => {
    const entry = held.current.get(id);
    if (!entry) return;
    if (pointerId !== undefined && entry.pointerId !== pointerId) return;
    clearTimeout(entry.delay);
    clearInterval(entry.interval);
    held.current.delete(id);
    fire("keyup", entry.code, entry.key);
  }, []);

  useEffect(() => {
    const heldKeys = held.current;
    const releaseAll = () => {
      for (const id of [...heldKeys.keys()]) release(id);
    };
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onVisibility);
      releaseAll();
    };
  }, [release]);

  const bind = (id: string, code: string, key: string, repeat: boolean) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      press(id, code, key, e.pointerId, repeat);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) =>
      release(id, e.pointerId),
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) =>
      release(id, e.pointerId),
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) =>
      release(id, e.pointerId),
  });

  return (
    <div
      className={`touchpad${config.a || config.b ? "" : " touchpad--dpad-only"}`}
      data-testid="touchpad"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      <div className="touchpad-dpad" role="group" aria-label="Direction pad">
        {DPAD_ORDER.map((dir) => {
          const { code, key } = DPAD_KEYS[dir];
          return (
            <button
              key={dir}
              type="button"
              className={`touchpad-btn touchpad-dir touchpad-${dir}`}
              aria-label={dir}
              disabled={!config.dpad.includes(dir)}
              {...bind(`dpad-${dir}`, code, key, true)}
            >
              {DPAD_LABELS[dir]}
            </button>
          );
        })}
      </div>
      <div
        className="touchpad-actions"
        role="group"
        aria-label="Action buttons"
      >
        {(["b", "a"] as const).map((slot) => {
          const action = config[slot];
          return (
            <div key={slot} className={`touchpad-action touchpad-${slot}`}>
              <button
                type="button"
                className="touchpad-btn touchpad-round"
                aria-label={
                  action
                    ? `${slot.toUpperCase()} ${action.label}`
                    : slot.toUpperCase()
                }
                disabled={!action}
                {...(action
                  ? bind(
                      `action-${slot}`,
                      action.code,
                      action.code === "Space" ? " " : action.code,
                      false,
                    )
                  : {})}
              >
                {slot.toUpperCase()}
              </button>
              <span className="touchpad-caption">{action?.label ?? "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
