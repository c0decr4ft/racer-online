/**
 * Production online endpoints.
 *
 * Prefer build-time `VITE_API_BASE` / `VITE_WS_URL`. On GitHub Pages those may be
 * empty — then we load `online.json` next to the app (same origin) so the hosted
 * game can talk to a cloud game server without your PC running.
 */

export type OnlineConfig = {
  apiBase: string | null;
  wsUrl: string | null;
};

let loaded: OnlineConfig = { apiBase: null, wsUrl: null };

function envString(key: string): string {
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
  return (env[key] || "").trim();
}

function normalizeApiBase(raw: string): string | null {
  const v = raw.trim().replace(/\/$/, "");
  if (!v) return null;
  return v.endsWith("/api") ? v : `${v}/api`;
}

function normalizeWsUrl(raw: string): string | null {
  const v = raw.trim().replace(/\/$/, "");
  return v || null;
}

/** Sync accessors used by API / WS clients after `loadOnlineConfig()`. */
export function configuredApiBase(): string | null {
  const fromEnv = normalizeApiBase(envString("VITE_API_BASE") || "");
  return fromEnv || loaded.apiBase;
}

export function configuredWsUrl(): string | null {
  const fromEnv = normalizeWsUrl(envString("VITE_WS_URL") || "");
  return fromEnv || loaded.wsUrl;
}

/**
 * Load optional `online.json` from the site root (Vite `base` aware).
 * Safe to call once at boot before constructing `Game`.
 */
export async function loadOnlineConfig(): Promise<OnlineConfig> {
  // Build-time env wins — skip network.
  if (envString("VITE_API_BASE") || envString("VITE_WS_URL")) {
    loaded = {
      apiBase: normalizeApiBase(envString("VITE_API_BASE")),
      wsUrl: normalizeWsUrl(envString("VITE_WS_URL")),
    };
    return loaded;
  }

  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  try {
    const res = await fetch(`${base}online.json`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { apiBase?: string; wsUrl?: string; api?: string; ws?: string };
      loaded = {
        apiBase: normalizeApiBase(String(data.apiBase || data.api || "")),
        wsUrl: normalizeWsUrl(String(data.wsUrl || data.ws || "")),
      };
    }
  } catch {
    /* offline / missing file — local-dev fallbacks still apply */
  }
  return loaded;
}
