/**
 * Resolve the HTTP API base for leaderboard / presence / feedback.
 *
 * Order:
 * 1. VITE_API_BASE (deployed backend origin or …/api)
 * 2. Same-origin Vite proxy `/api` in local dev
 * 3. Direct local game server :8787/api
 */

export function apiBase(): string | null {
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
  const configured = (env.VITE_API_BASE || "").trim().replace(/\/$/, "");
  if (configured) return configured;

  const host = typeof location !== "undefined" ? location.hostname || "" : "";
  if (host === "localhost" || host === "127.0.0.1") {
    // Prefer Vite proxy so one origin covers REST during `npm start`
    if (typeof location !== "undefined" && (location.port === "5173" || location.port === "4173")) {
      return `${location.protocol}//${location.host}/api`;
    }
    return `http://${host || "127.0.0.1"}:8787/api`;
  }
  return null;
}

/** Build a full URL for an API path like `/leaderboard` or `/api/presence`. */
export function apiUrl(path: string): string | null {
  const base = apiBase();
  if (!base) return null;
  let p = path.startsWith("/") ? path : `/${path}`;
  if (!p.startsWith("/api/")) p = `/api${p}`;

  if (base.endsWith("/api")) return `${base}${p.slice(4)}`;
  return `${base}${p}`;
}
