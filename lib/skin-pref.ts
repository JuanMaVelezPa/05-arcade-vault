// Global skin preference for every game, persisted per device in localStorage.

import { useSyncExternalStore } from "react";
import type { Skin } from "@/lib/games/types";

export const SKIN_KEY = "arcade-vault:skin:v1"; // "neon" | "classic" | "retro"

const SKINS: readonly Skin[] = ["neon", "classic", "retro"];

// Fallback when localStorage throws (privacy mode, blocked storage).
let memorySkin: Skin = "neon";
const listeners = new Set<() => void>();

function readSkin(): Skin {
  try {
    const value = window.localStorage.getItem(SKIN_KEY);
    return SKINS.find((s) => s === value) ?? "neon"; // missing or unknown means neon
  } catch {
    return memorySkin;
  }
}

function writeSkin(skin: Skin) {
  memorySkin = skin;
  try {
    window.localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // keep the in-memory value for this session
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SKIN_KEY || e.key === null) onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSkin(): Skin {
  return "neon";
}

export function useSkin(): [skin: Skin, setSkin: (s: Skin) => void] {
  const skin = useSyncExternalStore(subscribe, readSkin, getServerSkin);
  return [skin, writeSkin];
}
