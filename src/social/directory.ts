/** Player directory + online list from the game server, plus Nostr profile names. */

import { nip19 } from "nostr-tools";
import { apiUrl } from "../net/apiBase";
import { getSession } from "../nostr/session";
import { fetchProfile, searchProfilesByName } from "../nostr/profile";
import { listFriends } from "./friends";

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

function compactName(value: string): string {
  return value.toLowerCase().replace(/[.\u2026\u00b7]/g, "");
}

function isWeakName(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n || n === "racer" || n === "nostr racer") return true;
  const compact = compactName(n);
  return /^npub1[0-9a-z]+$/.test(compact) && compact.length <= 32;
}

function matchesQuery(player: { pubkey: string; name: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (player.name.toLowerCase().includes(q)) return true;
  const qCompact = compactName(q);
  if (qCompact && compactName(player.name).includes(qCompact)) return true;
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

async function playersFromLeaderboard(_query: string): Promise<DirectoryPlayer[]> {
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
  return [...map.values()];
}

function mergeDirectoryPlayers(...lists: DirectoryPlayer[][]): DirectoryPlayer[] {
  const map = new Map<string, DirectoryPlayer>();
  for (const list of lists) {
    for (const p of list) {
      const prev = map.get(p.pubkey);
      if (!prev) {
        map.set(p.pubkey, p);
        continue;
      }
      const prevWeak = isWeakName(prev.name);
      const nextWeak = isWeakName(p.name);
      if (prevWeak && !nextWeak) map.set(p.pubkey, p);
      else if (!nextWeak && p.lastSeen >= prev.lastSeen) map.set(p.pubkey, p);
    }
  }
  return [...map.values()].sort((a, b) => b.lastSeen - a.lastSeen);
}

/**
 * Directory rows are often stored as `npub1abcd...wxyz` before a profile loads.
 * That label never contains the friend's display name, so a name search misses
 * them. Look the profile up and match that instead.
 */
async function resolveNames(players: DirectoryPlayer[], query: string): Promise<DirectoryPlayer[]> {
  const q = query.trim();
  const resolved = await Promise.all(
    players.map(async (player) => {
      const nameMatches = matchesQuery(player, q);
      if (!isWeakName(player.name) && (nameMatches || !q)) return nameMatches || !q ? player : null;
      if (!isWeakName(player.name)) return null;
      const profile = await fetchProfile(player.pubkey, 2800);
      const label = sanitizeName(profile?.displayName || profile?.name || "");
      const named = label && !isWeakName(label) ? { ...player, name: label } : player;
      if (!q || matchesQuery(named, q) || matchesQuery(player, q)) return named;
      return null;
    }),
  );
  return resolved.filter((p): p is DirectoryPlayer => p !== null);
}

function friendsMatching(query: string): DirectoryPlayer[] {
  const session = getSession();
  if (!session || !query.trim()) return [];
  return listFriends(session.pubkey)
    .filter((f) => matchesQuery(f, query))
    .map((f) => ({ pubkey: f.pubkey, name: sanitizeName(f.name), lastSeen: f.addedAt }));
}

export async function searchPlayers(query = ""): Promise<DirectoryResult> {
  const q = query.trim().slice(0, 64);
  const playersUrl = apiUrl(`/players?q=${encodeURIComponent(q)}`);
  const browseUrl = q ? apiUrl("/players") : null;
  if (!playersUrl) {
    const friends = friendsMatching(q);
    return { players: friends, online: [], source: friends.length ? "server" : "empty" };
  }

  // Filtered search misses people stored under a short npub. Also load the
  // recent directory and resolve those labels through Nostr profiles.
  const [playersRaw, browseRaw, boardRows, nostrHits] = await Promise.all([
    fetchJson(playersUrl, 8_000),
    browseUrl ? fetchJson(browseUrl, 8_000) : Promise.resolve(null),
    playersFromLeaderboard(q),
    q.length >= 2 ? searchProfilesByName(q) : Promise.resolve([]),
  ]);

  const serverPlayers = [
    ...parseDirectoryRows((playersRaw as { players?: unknown } | null)?.players),
    ...parseDirectoryRows((browseRaw as { players?: unknown } | null)?.players),
  ];
  const online = parseOnlineRows((playersRaw as { online?: unknown } | null)?.online);
  const onlineAsDir: DirectoryPlayer[] = online.map((p) => ({
    pubkey: p.pubkey,
    name: p.name,
    lastSeen: p.at ?? Date.now(),
  }));
  const nostrAsDir: DirectoryPlayer[] = nostrHits.map((hit) => ({
    pubkey: hit.pubkey,
    name: sanitizeName(hit.name),
    lastSeen: hit.lastSeen,
  }));

  const merged = mergeDirectoryPlayers(boardRows, onlineAsDir, serverPlayers, friendsMatching(q), nostrAsDir);
  const players = q ? await resolveNames(merged, q) : merged;
  const serverOk = !!playersRaw && typeof playersRaw === "object";
  if (!serverOk && players.length === 0) {
    return { players: [], online: [], source: "empty" };
  }
  return { players: players.slice(0, 40), online, source: "server" };
}

export async function fetchOnlinePlayers(): Promise<OnlinePlayer[]> {
  const result = await searchPlayers("");
  return result.online;
}
