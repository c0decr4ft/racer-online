/** Top-level play mode — hub sits in front of racing / paintball. */

export type PlayMode = "hub" | "racing" | "paintball";

export const MODE_STORAGE_KEY = "sats-play-mode";

export function loadPlayMode(): PlayMode {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY);
    if (raw === "racing" || raw === "paintball") return raw;
  } catch {
    /* ignore */
  }
  return "hub";
}

export function savePlayMode(mode: PlayMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode === "hub" ? "hub" : mode);
  } catch {
    /* ignore */
  }
}
