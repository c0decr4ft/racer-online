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

/** Explicit directory write — more reliable than waiting for the next presence heartbeat. */
export async function registerPlayer(pubkey: string, name: string): Promise<boolean> {
  const url = apiUrl("/players");
  const pk = normalizePubkey(pubkey);
  if (!url || !pk) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ pubkey: pk, name: sanitizeName(name) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function playersFromLeaderboard(query: string): Promise<DirectoryPlayer[]> {
  const url = apiUrl("/leaderboard");
  if (!url) return [];
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as { byTrack?: Record<string, unknown> };
    const byTrack = data.byTrack && typeof data.byTrack === "object" ? data.byTrack : {};
    const map = new Map<string, DirectoryPlayer>();
    for (const entries of Object.values(byTrack)) {
      if (!Array.isArray(entries)) continue;
      for (const row of entries) {
        if (!row || typeof row !== "object") continue;
        const r = row as { pubkey?: unknown; name?: unknown; at?: unknown };
        const pubkey = normalizePubkey(r.pubkey);
        if (!pubkey) continue;
        const lastSeen =
          typeof r.at === "number" && Number.isFinite(r.at) ? Math.round(r.at) : 0;
        const prev = map.get(pubkey);
        if (!prev || lastSeen >= prev.lastSeen) {
          map.set(pubkey, { pubkey, name: sanitizeName(r.name), lastSeen });
        }
      }
    }
    const q = query.trim().toLowerCase();
    let rows = [...map.values()];
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.pubkey.startsWith(q) ||
          r.pubkey.includes(q),
      );
    }
    return rows.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 40);
  } catch {
    return [];
  }
}

export async function searchPlayers(query = ""): Promise<DirectoryResult> {
  const url = apiUrl(`/players?q=${encodeURIComponent(query.trim().slice(0, 64))}`);
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
    // After a redeploy the directory can be empty until relay board sync finishes —
    // fall back to the leaderboard so Find still works for known racers.
    if (!players.length) {
      const fromBoard = await playersFromLeaderboard(query);
      if (fromBoard.length) return { players: fromBoard, online, source: "server" };
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
