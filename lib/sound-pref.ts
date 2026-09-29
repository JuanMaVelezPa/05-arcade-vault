// Global sound preference for every game, persisted per device in localStorage.

import { useSyncExternalStore } from "react";

export const MUTED_KEY = "arcade-vault:muted:v1"; // "1" | "0"

// Fallback when localStorage throws (privacy mode, blocked storage).
let memoryMuted = false;
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    const value = window.localStorage.getItem(MUTED_KEY);
    return value === "1"; // missing or unknown values mean unmuted
  } catch {
    return memoryMuted;
  }
}

function writeMuted(muted: boolean) {
  memoryMuted = muted;
  try {
    window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // keep the in-memory value for this session
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === MUTED_KEY || e.key === null) onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerMuted(): boolean {
  return false;
}

export function useMuted(): [muted: boolean, setMuted: (m: boolean) => void] {
  const muted = useSyncExternalStore(subscribe, readMuted, getServerMuted);
  return [muted, writeMuted];
}
