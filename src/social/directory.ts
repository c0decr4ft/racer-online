/** Player directory + online list from the game server. */

import { apiUrl } from "../net/apiBase";

export type DirectoryPlayer = {
  pubkey: string;
  name: string;
  lastSeen: number;
};

export type OnlinePlayer = {
  pubkey: string;
  name: string;
  at?: number;
};

export type DirectoryResult = {
  players: DirectoryPlayer[];
  online: OnlinePlayer[];
  source: "server" | "empty";
};

function normalizePubkey(raw: unknown): string {
  const hex = String(raw ?? "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function sanitizeName(raw: unknown): string {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .trim();
  return cleaned || "RACER";
}

export async function searchPlayers(query = ""): Promise<DirectoryResult> {
  const url = apiUrl(`/players?q=${encodeURIComponent(query.trim().slice(0, 40))}`);
  if (!url) return { players: [], online: [], source: "empty" };
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return { players: [], online: [], source: "empty" };
    const data = (await res.json()) as {
      players?: unknown;
      online?: unknown;
    };
    const players: DirectoryPlayer[] = [];
    if (Array.isArray(data.players)) {
      for (const row of data.players) {
        if (!row || typeof row !== "object") continue;
        const r = row as { pubkey?: unknown; name?: unknown; lastSeen?: unknown };
        const pubkey = normalizePubkey(r.pubkey);
        if (!pubkey) continue;
        players.push({
          pubkey,
          name: sanitizeName(r.name),
          lastSeen:
            typeof r.lastSeen === "number" && Number.isFinite(r.lastSeen)
              ? Math.round(r.lastSeen)
              : 0,
        });
      }
    }
    const online: OnlinePlayer[] = [];
    if (Array.isArray(data.online)) {
      for (const row of data.online) {
        if (!row || typeof row !== "object") continue;
        const r = row as { pubkey?: unknown; name?: unknown; at?: unknown };
        const pubkey = normalizePubkey(r.pubkey);
        if (!pubkey) continue;
        online.push({
          pubkey,
          name: sanitizeName(r.name),
          at: typeof r.at === "number" && Number.isFinite(r.at) ? Math.round(r.at) : undefined,
        });
      }
    }
    return { players, online, source: "server" };
  } catch {
    return { players: [], online: [], source: "empty" };
  }
}

export async function fetchOnlinePlayers(): Promise<OnlinePlayer[]> {
  const result = await searchPlayers("");
  return result.online;
}
