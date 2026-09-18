/** Player settings — manual graphics / effects / sound (no auto GPU detect). */

import type { PerfTier } from "./perfQuality";

export type QualityLevel = "low" | "mid" | "high";

export type GameSettings = {
  /** Shadows, MSAA, draw distance, night lights. */
  graphics: QualityLevel;
  /** Explosions, smoke, particle density. */
  effects: QualityLevel;
  /** Master volume 0–100 (mute button still silences everything). */
  sound: number;
};

const STORAGE_KEY = "racer-settings-v1";

const DEFAULTS: GameSettings = {
  graphics: "high",
  effects: "high",
  sound: 100,
};

function clampSound(n: number): number {
  if (!Number.isFinite(n)) return DEFAULTS.sound;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeLevel(raw: unknown, fallback: QualityLevel): QualityLevel {
  const v = String(raw ?? "").toLowerCase();
  if (v === "low" || v === "mid" || v === "high") return v;
  return fallback;
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      graphics: normalizeLevel(parsed.graphics, DEFAULTS.graphics),
      effects: normalizeLevel(parsed.effects, DEFAULTS.effects),
      sound: clampSound(Number(parsed.sound ?? DEFAULTS.sound)),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(next: GameSettings): GameSettings {
  const clean: GameSettings = {
    graphics: normalizeLevel(next.graphics, DEFAULTS.graphics),
    effects: normalizeLevel(next.effects, DEFAULTS.effects),
    sound: clampSound(next.sound),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* private mode */
  }
  return clean;
}

/** Map UI graphics level → internal render tier. */
export function graphicsToTier(level: QualityLevel): PerfTier {
  return level;
}

export function effectsParticleCount(level: QualityLevel): number {
  if (level === "low") return 6;
  if (level === "mid") return 12;
  return 24;
}

export function effectsFlashIntensity(level: QualityLevel): number {
  if (level === "low") return 3;
  if (level === "mid") return 5;
  return 8;
}

export function soundGain(levelOrPct: number): number {
  return clampSound(levelOrPct) / 100;
}
