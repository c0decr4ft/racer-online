import { configuredWsUrl, sameOriginOnline } from "../net/onlineConfig";

/** Game-server socket. Dev pages (Vite) use port 8787 on the same host, including a LAN IP. */
export function gameWsUrl(): string | null {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const host = location.hostname;
  const dev =
    host === "localhost" ||
    host === "127.0.0.1" ||
    location.port === "5173" ||
    location.port === "4173";
  if (dev) return `${proto}//${host}:8787`;
  return configuredWsUrl() || sameOriginOnline()?.wsUrl || null;
}
