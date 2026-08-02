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

/** Default cloud game server (Render) — used by GitHub Pages and any host without secrets. */
export const DEFAULT_CLOUD_API = "https://racer-online.onrender.com/api";
export const DEFAULT_CLOUD_WS = "wss://racer-online.onrender.com";

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

/** True for static GitHub Pages hosts that cannot run the WebSocket server. */
export function isGitHubPagesHost(): boolean {
  if (typeof location === "undefined") return false;
  return /\.github\.io$/i.test(location.hostname || "");
}

/**
 * When the game is served from the same Node process as the API/WS (Render, Fly, VPS),
 * use this host for `/api` and `wss://…` without needing secrets.
 */
export function sameOriginOnline(): OnlineConfig | null {
  if (typeof location === "undefined") return null;
  const host = location.hostname || "";
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  if (isGitHubPagesHost()) return null;
  const http = location.protocol === "https:" ? "https:" : "http:";
  const ws = location.protocol === "https:" ? "wss:" : "ws:";
  return {
    apiBase: `${http}//${location.host}/api`,
    wsUrl: `${ws}//${location.host}`,
  };
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

  // Pages / any static host: fall back to the Render game server so board,
  // presence, feedback, and multiplayer stay online without a local PC.
  if (!loaded.apiBase && !loaded.wsUrl) {
    const host = typeof location !== "undefined" ? location.hostname || "" : "";
    const local = host === "localhost" || host === "127.0.0.1";
    if (!local) {
      loaded = {
        apiBase: normalizeApiBase(DEFAULT_CLOUD_API),
        wsUrl: normalizeWsUrl(DEFAULT_CLOUD_WS),
      };
    }
  }
  return loaded;
}
