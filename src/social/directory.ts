/** Player directory + online list from the game server. */

import { nip19 } from "nostr-tools";
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

function queryPubkeyHint(query: string): string {
  const q = String(query ?? "").trim();
  if (!q) return "";
  if (/^[0-9a-f]{8,64}$/i.test(q)) return q.toLowerCase();
  if (/^npub1[0-9a-z]+$/i.test(q)) {
    try {
      const decoded = nip19.decode(q);
      if (decoded.type === "npub" && typeof decoded.data === "string") {
        return decoded.data.toLowerCase();
      }
    } catch {
      /* ignore */
    }
  }
  return "";
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
    const pkHint = queryPubkeyHint(query);
    let rows = [...map.values()];
    if (q) {
      rows = rows.filter((r) => {
        if (r.name.toLowerCase().includes(q)) return true;
        if (pkHint && (r.pubkey === pkHint || r.pubkey.startsWith(pkHint) || r.pubkey.includes(pkHint))) {
          return true;
        }
        return r.pubkey.startsWith(q) || r.pubkey.includes(q);
      });
    }
    return rows.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 40);
  } catch {
    return [];
  }
}

function mergeDirectoryPlayers(...lists: DirectoryPlayer[][]): DirectoryPlayer[] {
  const map = new Map<string, DirectoryPlayer>();
  for (const list of lists) {
    for (const p of list) {
      const prev = map.get(p.pubkey);
      if (!prev || p.lastSeen >= prev.lastSeen) map.set(p.pubkey, p);
    }
  }
  return [...map.values()].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 40);
}

export async function searchPlayers(query = ""): Promise<DirectoryResult> {
  const q = query.trim().slice(0, 64);
  const url = apiUrl(`/players?q=${encodeURIComponent(q)}`);
  if (!url) {
    const fromBoard = await playersFromLeaderboard(q);
    return { players: fromBoard, online: [], source: fromBoard.length ? "server" : "empty" };
  }
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) {
      const fromBoard = await playersFromLeaderboard(q);
      return { players: fromBoard, online: [], source: fromBoard.length ? "server" : "empty" };
    }
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
    // Always union with board racers so Find works even when the directory is thin.
    const fromBoard = await playersFromLeaderboard(q);
    const merged = mergeDirectoryPlayers(fromBoard, players);
    return { players: merged, online, source: "server" };
  } catch {
    const fromBoard = await playersFromLeaderboard(q);
    return { players: fromBoard, online: [], source: fromBoard.length ? "server" : "empty" };
  }
}

export async function fetchOnlinePlayers(): Promise<OnlinePlayer[]> {
  const result = await searchPlayers("");
  return result.online;
}
