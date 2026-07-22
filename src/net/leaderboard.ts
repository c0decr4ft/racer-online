import { DEFAULT_TRACK_ID, isTrackId, TRACKS } from "../trackDefs";

export type LeaderboardEntry = {
  name: string;
  timeMs: number;
  bestLapMs?: number;
  at: number;
  trackId?: string;
};

export type BoardSource = "online" | "server" | "local";

/** Per-track local cache — times never mix across courses. */
function storageKey(trackId: string) {
  return `racer-leaderboard-v2-${trackId}`;
}

const LEGACY_STORAGE_KEYS = ["racer-leaderboard-v1", "racer-leaderboard-v2"];
const DRIVER_NAME_KEY = "racer-driver-name";
const MAX = 10;
export const NAME_MAX = 10;

function clearLegacyLocalBoards() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
clearLegacyLocalBoards();

export function sanitizeDriverName(raw: string): string {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return cleaned || "RACER";
}

function normalizeTrackId(raw: unknown): string {
  const id = String(raw ?? "").trim();
  return isTrackId(id) ? id : DEFAULT_TRACK_ID;
}

const PUBLIC_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019f89b5-c828-7f52-80b7-ca3888e5ae1b";

function localApiBase(): string | null {
  const host = location.hostname || "127.0.0.1";
  if (host === "localhost" || host === "127.0.0.1") return `http://${host}:8787`;
  return null;
}

type BoardStore = Record<string, LeaderboardEntry[]>;

function readLocal(trackId: string): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(trackId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(trackId: string, entries: LeaderboardEntry[]) {
  localStorage.setItem(storageKey(trackId), JSON.stringify(entries.slice(0, MAX)));
}

const TIME_EPS_MS = 15;

function entryKey(e: LeaderboardEntry): string {
  return `${e.name.trim().toLowerCase()}|${Math.round(e.timeMs)}`;
}

function isSameRun(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  if (a.name.trim().toLowerCase() !== b.name.trim().toLowerCase()) return false;
  return Math.abs(a.timeMs - b.timeMs) <= TIME_EPS_MS;
}

function pickBetter(a: LeaderboardEntry, b: LeaderboardEntry): LeaderboardEntry {
  const earlier = (a.at || 0) <= (b.at || 0) ? a : b;
  const other = earlier === a ? b : a;
  if (earlier.bestLapMs == null && other.bestLapMs != null) {
    return { ...earlier, bestLapMs: other.bestLapMs };
  }
  return earlier;
}

function normalize(entries: LeaderboardEntry[], trackId?: string): LeaderboardEntry[] {
  const tid = trackId ? normalizeTrackId(trackId) : undefined;
  const cleaned = [...entries]
    .filter((e) => e && typeof e.timeMs === "number" && Number.isFinite(e.timeMs) && e.timeMs > 0)
    .map((e) => ({
      name: sanitizeDriverName(String(e.name || "RACER")),
      timeMs: Math.round(e.timeMs),
      bestLapMs: e.bestLapMs != null ? Math.round(e.bestLapMs) : undefined,
      at: e.at || Date.now(),
      trackId: tid ?? (e.trackId ? normalizeTrackId(e.trackId) : undefined),
    }));

  const byKey = new Map<string, LeaderboardEntry>();
  for (const e of cleaned) {
    const key = entryKey(e);
    const prev = byKey.get(key);
    byKey.set(key, prev ? pickBetter(prev, e) : e);
  }
  const unique: LeaderboardEntry[] = [];
  for (const e of byKey.values()) {
    const twin = unique.find((u) => isSameRun(u, e));
    if (twin) {
      const i = unique.indexOf(twin);
      unique[i] = pickBetter(twin, e);
    } else {
      unique.push(e);
    }
  }

  return unique.sort((a, b) => a.timeMs - b.timeMs || (a.at || 0) - (b.at || 0)).slice(0, MAX);
}

function emptyStore(): BoardStore {
  const store: BoardStore = {};
  for (const t of TRACKS) store[t.id] = [];
  return store;
}

function parseStore(data: unknown): BoardStore {
  const store = emptyStore();
  if (!data || typeof data !== "object") return store;

  const obj = data as { byTrack?: unknown; entries?: unknown };
  if (obj.byTrack && typeof obj.byTrack === "object") {
    for (const [id, list] of Object.entries(obj.byTrack as Record<string, unknown>)) {
      const tid = normalizeTrackId(id);
      if (Array.isArray(list)) store[tid] = normalize(list as LeaderboardEntry[], tid);
    }
    return store;
  }

  if (Array.isArray(data)) {
    store[DEFAULT_TRACK_ID] = normalize(data as LeaderboardEntry[], DEFAULT_TRACK_ID);
    return store;
  }
  if (Array.isArray(obj.entries)) {
    store[DEFAULT_TRACK_ID] = normalize(obj.entries as LeaderboardEntry[], DEFAULT_TRACK_ID);
  }
  return store;
}

function entriesFor(store: BoardStore, trackId: string): LeaderboardEntry[] {
  const tid = normalizeTrackId(trackId);
  return normalize(store[tid] ?? [], tid);
}

async function fetchLocalServerStore(): Promise<BoardStore | null> {
  const base = localApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/leaderboard`, { cache: "no-store" });
    if (!res.ok) return null;
    return parseStore(await res.json());
  } catch {
    return null;
  }
}

async function fetchPublicBlobStore(): Promise<BoardStore> {
  const res = await fetch(PUBLIC_BLOB_URL, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(String(res.status));
  return parseStore(await res.json());
}

async function putPublicBlobStore(store: BoardStore): Promise<BoardStore> {
  const byTrack: BoardStore = emptyStore();
  for (const t of TRACKS) {
    byTrack[t.id] = normalize(store[t.id] ?? [], t.id);
  }
  const res = await fetch(PUBLIC_BLOB_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ byTrack }),
  });
  if (!res.ok) throw new Error(String(res.status));
  try {
    return parseStore(await res.json());
  } catch {
    return byTrack;
  }
}

function cacheStoreLocally(store: BoardStore) {
  for (const t of TRACKS) writeLocal(t.id, store[t.id] ?? []);
}

export async function fetchLeaderboard(
  trackId: string = DEFAULT_TRACK_ID,
): Promise<{ entries: LeaderboardEntry[]; source: BoardSource }> {
  const tid = normalizeTrackId(trackId);
  const fromServer = await fetchLocalServerStore();
  if (fromServer) {
    cacheStoreLocally(fromServer);
    return { entries: entriesFor(fromServer, tid), source: "server" };
  }

  try {
    const store = await fetchPublicBlobStore();
    cacheStoreLocally(store);
    return { entries: entriesFor(store, tid), source: "online" };
  } catch {
    return { entries: normalize(readLocal(tid), tid), source: "local" };
  }
}

export async function wouldQualify(timeMs: number, trackId: string = DEFAULT_TRACK_ID): Promise<boolean> {
  const { entries } = await fetchLeaderboard(trackId);
  if (entries.length < MAX) return true;
  return timeMs < entries[entries.length - 1]!.timeMs;
}

export async function submitScore(
  name: string,
  timeMs: number,
  bestLapMs?: number,
  trackId: string = DEFAULT_TRACK_ID,
): Promise<{ entries: LeaderboardEntry[]; source: BoardSource }> {
  const tid = normalizeTrackId(trackId);
  const entry: LeaderboardEntry = {
    name: sanitizeDriverName(name),
    timeMs: Math.round(timeMs),
    bestLapMs: bestLapMs != null && Number.isFinite(bestLapMs) ? Math.round(bestLapMs) : undefined,
    at: Date.now(),
    trackId: tid,
  };

  const base = localApiBase();
  if (base) {
    try {
      const res = await fetch(`${base}/api/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const store = parseStore(await res.json());
        cacheStoreLocally(store);
        void putPublicBlobStore(store).catch(() => undefined);
        return { entries: entriesFor(store, tid), source: "server" };
      }
    } catch {
      /* fall through */
    }
  }

  try {
    let store = await fetchPublicBlobStore();
    store[tid] = normalize([...(store[tid] ?? []), entry], tid);
    store = await putPublicBlobStore(store);
    try {
      const latest = await fetchPublicBlobStore();
      latest[tid] = normalize([...(latest[tid] ?? []), entry], tid);
      if (JSON.stringify(latest[tid]) !== JSON.stringify(store[tid])) {
        store = await putPublicBlobStore(latest);
      }
    } catch {
      /* keep first write */
    }
    cacheStoreLocally(store);
    return { entries: entriesFor(store, tid), source: "online" };
  } catch {
    const merged = normalize([...readLocal(tid), entry], tid);
    writeLocal(tid, merged);
    return { entries: merged, source: "local" };
  }
}

export function formatBoardTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "--:--.---";
  const total = Math.floor(ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const milli = total % 1000;
  return `${m}:${s.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}

export function boardSourceLabel(source: BoardSource, saved = false): string {
  if (source === "online" || source === "server") {
    return saved ? "Saved to worldwide board" : "Live worldwide board";
  }
  return saved ? "Saved locally · offline" : "Local board · offline";
}

export function saveLocalDriverName(name: string): void {
  try {
    localStorage.setItem(DRIVER_NAME_KEY, sanitizeDriverName(name));
  } catch {
    /* ignore */
  }
}

export function getLocalDriverName(): string | null {
  try {
    const raw = localStorage.getItem(DRIVER_NAME_KEY);
    if (!raw) return null;
    const name = sanitizeDriverName(raw);
    return name || null;
  } catch {
    return null;
  }
}

export function rankForDriver(entries: LeaderboardEntry[], name: string): number | null {
  const key = sanitizeDriverName(name).trim().toLowerCase();
  if (!key) return null;
  let best: number | null = null;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i]!.name.trim().toLowerCase() === key) {
      const place = i + 1;
      if (best == null || place < best) best = place;
    }
  }
  return best;
}

/** Best place across every track board — homepage rank badge. */
export async function bestRankAcrossTracks(name: string): Promise<number | null> {
  let best: number | null = null;
  for (const t of TRACKS) {
    try {
      const { entries } = await fetchLeaderboard(t.id);
      const rank = rankForDriver(entries, name);
      if (rank != null && (best == null || rank < best)) best = rank;
    } catch {
      /* skip */
    }
  }
  return best;
}
