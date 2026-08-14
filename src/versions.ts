import { GAME_VERSION } from "./version";

/** Site root on GitHub Pages (also Vite `base` for the live build). */
export const PAGES_ROOT = "/racer-online/";

export type PlayableVersion = {
  /** Two-part id matching GAME_VERSION, e.g. `1.4` */
  id: string;
  /** Absolute path under the host, e.g. `/racer-online/` or `/racer-online/v1.4/` */
  path: string;
};

type VersionsManifest = {
  versions?: Array<{ id?: unknown; path?: unknown; url?: unknown }>;
};

function normalizePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return PAGES_ROOT;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).pathname.replace(/\/?$/, "/") || "/";
    }
  } catch {
    /* treat as path */
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/?$/, "/") || "/";
}

function parseManifest(data: unknown): PlayableVersion[] {
  if (!data || typeof data !== "object") return [];
  const list = (data as VersionsManifest).versions;
  if (!Array.isArray(list)) return [];
  const out: PlayableVersion[] = [];
  const seen = new Set<string>();
  for (const row of list) {
    const id = String(row?.id ?? "").trim();
    const pathRaw = String(row?.path ?? row?.url ?? "").trim();
    if (!id || !pathRaw || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, path: normalizePath(pathRaw) });
  }
  return out;
}

/** Ensure the build running now is always listed, even if the manifest is stale. */
export function ensureCurrentVersion(versions: PlayableVersion[]): PlayableVersion[] {
  const base = normalizePath(import.meta.env.BASE_URL || PAGES_ROOT);
  if (versions.some((v) => v.id === GAME_VERSION)) return versions;
  return [{ id: GAME_VERSION, path: base }, ...versions];
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Load playable builds from the shared registry.
 * Prefers the live site root manifest so older `/vX.Y/` snapshots still see new releases.
 */
export async function loadPlayableVersions(): Promise<PlayableVersion[]> {
  const base = normalizePath(import.meta.env.BASE_URL || PAGES_ROOT);
  const candidates = [
    `${PAGES_ROOT}versions.json`,
    `${base}versions.json`,
    new URL("versions.json", location.href).href,
  ];

  for (const url of candidates) {
    const data = await fetchJson(url);
    const parsed = parseManifest(data);
    if (parsed.length) return ensureCurrentVersion(parsed);
  }

  return ensureCurrentVersion([]);
}

export function versionHref(path: string): string {
  return new URL(normalizePath(path), location.origin).href;
}

export function isCurrentVersion(v: PlayableVersion): boolean {
  return v.id === GAME_VERSION;
}

/** Show on homepage/menu; hide during a race session. */
export function setVersionSwitcherVisible(visible: boolean): void {
  const switcher = document.getElementById("version-switcher");
  if (switcher instanceof HTMLElement) {
    switcher.classList.toggle("hidden", !visible);
  }
}

/** The version badge is display-only (the secret developer page was removed). */
export function initVersionBadge(): void {
  const badge = document.getElementById("version-badge");
  if (badge instanceof HTMLElement) {
    badge.textContent = `v${GAME_VERSION}`;
  }
}
