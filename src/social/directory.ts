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

function matchesQuery(player: { pubkey: string; name: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (player.name.toLowerCase().includes(q)) return true;
  const pkHint = queryPubkeyHint(query);
  if (pkHint && (player.pubkey === pkHint || player.pubkey.startsWith(pkHint) || player.pubkey.includes(pkHint))) {
    return true;
  }
  return player.pubkey.startsWith(q) || player.pubkey.includes(q);
}

async function fetchJson(url: string, ms = 8_000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Explicit directory write — more reliable than waiting for the next presence heartbeat. */
export async function registerPlayer(pubkey: string, name: string): Promise<boolean> {
  const url = apiUrl("/players");
  const pk = normalizePubkey(pubkey);
  if (!url || !pk) return false;
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 6_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ pubkey: pk, name: sanitizeName(name) }),
      signal: ctrl.signal,
    });
    window.clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function parseDirectoryRows(raw: unknown): DirectoryPlayer[] {
  if (!Array.isArray(raw)) return [];
  const out: DirectoryPlayer[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as { pubkey?: unknown; name?: unknown; lastSeen?: unknown; at?: unknown };
    const pubkey = normalizePubkey(r.pubkey);
    if (!pubkey) continue;
    const lastSeenRaw = r.lastSeen ?? r.at;
    out.push({
      pubkey,
      name: sanitizeName(r.name),
      lastSeen:
        typeof lastSeenRaw === "number" && Number.isFinite(lastSeenRaw) ? Math.round(lastSeenRaw) : 0,
    });
  }
  return out;
}

function parseOnlineRows(raw: unknown): OnlinePlayer[] {
  if (!Array.isArray(raw)) return [];
  const out: OnlinePlayer[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as { pubkey?: unknown; name?: unknown; at?: unknown };
    const pubkey = normalizePubkey(r.pubkey);
    if (!pubkey) continue;
    out.push({
      pubkey,
      name: sanitizeName(r.name),
      at: typeof r.at === "number" && Number.isFinite(r.at) ? Math.round(r.at) : undefined,
    });
  }
  return out;
}

async function playersFromLeaderboard(query: string): Promise<DirectoryPlayer[]> {
  const url = apiUrl("/leaderboard");
  if (!url) return [];
  const data = (await fetchJson(url, 6_000)) as { byTrack?: Record<string, unknown> } | null;
  if (!data) return [];
  const byTrack = data.byTrack && typeof data.byTrack === "object" ? data.byTrack : {};
  const map = new Map<string, DirectoryPlayer>();
  for (const entries of Object.values(byTrack)) {
    if (!Array.isArray(entries)) continue;
    for (const row of entries) {
      if (!row || typeof row !== "object") continue;
      const r = row as { pubkey?: unknown; name?: unknown; at?: unknown };
      const pubkey = normalizePubkey(r.pubkey);
      if (!pubkey) continue;
      const lastSeen = typeof r.at === "number" && Number.isFinite(r.at) ? Math.round(r.at) : 0;
      const prev = map.get(pubkey);
      if (!prev || lastSeen >= prev.lastSeen) {
        map.set(pubkey, { pubkey, name: sanitizeName(r.name), lastSeen });
      }
    }
  }
  return [...map.values()].filter((r) => matchesQuery(r, query));
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
  const playersUrl = apiUrl(`/players?q=${encodeURIComponent(q)}`);
  if (!playersUrl) {
    return { players: [], online: [], source: "empty" };
  }

  // Players API first (fast). Board fallback is parallel + timed so a slow
  // empty leaderboard can never leave Find stuck on "Searching…".
  const [playersRaw, boardRows] = await Promise.all([
    fetchJson(playersUrl, 8_000),
    playersFromLeaderboard(q),
  ]);

  if (!playersRaw || typeof playersRaw !== "object") {
    const fromBoard = boardRows;
    return {
      players: fromBoard.slice(0, 40),
      online: [],
      source: fromBoard.length ? "server" : "empty",
    };
  }

  const data = playersRaw as { players?: unknown; online?: unknown };
  const players = parseDirectoryRows(data.players);
  const online = parseOnlineRows(data.online);
  const onlineAsDir: DirectoryPlayer[] = online
    .filter((p) => matchesQuery(p, q))
    .map((p) => ({
      pubkey: p.pubkey,
      name: p.name,
      lastSeen: p.at ?? Date.now(),
    }));

  const merged = mergeDirectoryPlayers(boardRows, onlineAsDir, players);
  return { players: merged, online, source: "server" };
}

export async function fetchOnlinePlayers(): Promise<OnlinePlayer[]> {
  const result = await searchPlayers("");
  return result.online;
}
