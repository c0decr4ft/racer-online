import { DEFAULT_TRACK_ID, isTrackId, TRACKS } from "../trackDefs";
import { apiUrl } from "./apiBase";

export type LeaderboardEntry = {
  name: string;
  timeMs: number;
  bestLapMs?: number;
  at: number;
  trackId?: string;
};

export type BoardSource = "online" | "server" | "local";

/**
 * Per-track local cache schema revision — NOT the game display version (GAME_VERSION).
 * Keys and the shared JSONBlob URL stay game-version-agnostic so all releases share one board.
 * Bump only to wipe/migrate local score shape — never scope by release.
 */
const BOARD_STORAGE_VERSION = 4;

function storageKey(trackId: string) {
  return `racer-leaderboard-v${BOARD_STORAGE_VERSION}-${trackId}`;
}

const LEGACY_STORAGE_KEYS = ["racer-leaderboard-v1", "racer-leaderboard-v2", "racer-leaderboard-v3"];
const LEGACY_TRACK_PREFIXES = ["racer-leaderboard-v2-", "racer-leaderboard-v3-"];
const DRIVER_NAME_KEY = "racer-driver-name";
const MAX = 10;
export const NAME_MAX = 10;

function clearLegacyLocalBoards() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    for (const prefix of LEGACY_TRACK_PREFIXES) {
      for (const t of TRACKS) localStorage.removeItem(`${prefix}${t.id}`);
      localStorage.removeItem(`${prefix}twin-lakes`);
    }
    // Sweep any leftover older board keys (v1–v3)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("racer-leaderboard-v")) continue;
      if (key.startsWith(`racer-leaderboard-v${BOARD_STORAGE_VERSION}-`)) continue;
      localStorage.removeItem(key);
    }
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

/**
 * Public worldwide board (JSONBlob). Best-effort sync when no game server is available.
 *
 * Recreated 2026-08-01 after prior blob returned 403 (expired).
 * Note: jsonblob.com currently issues ~24h TTLs on create. Prefer the durable
 * Node server (`npm run server` / `npm start`) — scores persist in server/leaderboard.json.
 * Set VITE_API_BASE to a hosted server for production Pages deploys.
 */
export const PUBLIC_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019fbe1c-6b22-7df1-9007-59a04ae0df4c";

const BLOB_ATTEMPTS = 4;
const BLOB_RETRY_BASE_MS = 250;

export type BoardStore = Record<string, LeaderboardEntry[]>;

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
  try {
    localStorage.setItem(storageKey(trackId), JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* ignore quota / private mode */
  }
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

/** Normalize, dedupe near-identical runs, keep top N. */
export function normalize(entries: LeaderboardEntry[], trackId?: string): LeaderboardEntry[] {
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

export function emptyStore(): BoardStore {
  const store: BoardStore = {};
  for (const t of TRACKS) store[t.id] = [];
  return store;
}

export function storeEntryCount(store: BoardStore): number {
  let n = 0;
  for (const t of TRACKS) n += store[t.id]?.length ?? 0;
  return n;
}

/** Union all per-track lists, then normalize/top-N each track. */
export function mergeBoardStores(...stores: BoardStore[]): BoardStore {
  const out = emptyStore();
  for (const t of TRACKS) {
    const merged: LeaderboardEntry[] = [];
    for (const s of stores) {
      const list = s?.[t.id];
      if (Array.isArray(list) && list.length) merged.push(...list);
    }
    out[t.id] = normalize(merged, t.id);
  }
  return out;
}

function isBoardPayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data)) return true;
  const obj = data as { byTrack?: unknown; entries?: unknown; error?: unknown };
  if (obj.error != null && obj.byTrack == null && obj.entries == null) return false;
  if (obj.byTrack && typeof obj.byTrack === "object") return true;
  if (Array.isArray(obj.entries)) return true;
  return false;
}

export function parseStore(data: unknown): BoardStore {
  const store = emptyStore();
  if (!isBoardPayload(data)) return store;

  const obj = data as { byTrack?: unknown; entries?: unknown };
  if (obj.byTrack && typeof obj.byTrack === "object") {
    for (const [id, list] of Object.entries(obj.byTrack as Record<string, unknown>)) {
      const tid = normalizeTrackId(id);
      if (!Array.isArray(list)) continue;
      // Merge when legacy / unknown ids collapse onto the same track
      store[tid] = normalize([...(store[tid] ?? []), ...(list as LeaderboardEntry[])], tid);
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

function readLocalStore(): BoardStore {
  const store = emptyStore();
  for (const t of TRACKS) store[t.id] = normalize(readLocal(t.id), t.id);
  return store;
}

/** Cache a store locally without dropping any scores already cached. */
function cacheStoreLocally(store: BoardStore) {
  const merged = mergeBoardStores(readLocalStore(), store);
  for (const t of TRACKS) writeLocal(t.id, merged[t.id] ?? []);
}

function writeStoreLocally(store: BoardStore) {
  for (const t of TRACKS) writeLocal(t.id, normalize(store[t.id] ?? [], t.id));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryBlobStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

/** Fetch JSONBlob with backoff on transient network / rate-limit / 5xx failures. */
async function fetchBlobResponse(init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < BLOB_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(PUBLIC_BLOB_URL, {
        cache: "no-store",
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.headers ?? {}),
        },
      });
      if (shouldRetryBlobStatus(res.status) && attempt < BLOB_ATTEMPTS - 1) {
        await sleep(BLOB_RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < BLOB_ATTEMPTS - 1) {
        await sleep(BLOB_RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("blob fetch failed");
}

async function fetchLocalServerStore(): Promise<BoardStore | null> {
  const url = apiUrl("/leaderboard");
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!isBoardPayload(data)) return null;
    return parseStore(data);
  } catch {
    return null;
  }
}

async function fetchPublicBlobStore(): Promise<BoardStore> {
  const res = await fetchBlobResponse();
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  if (!isBoardPayload(data)) throw new Error("unrecognized board payload");
  return parseStore(data);
}

function storeToPayload(store: BoardStore): { byTrack: BoardStore } {
  const byTrack: BoardStore = emptyStore();
  for (const t of TRACKS) {
    byTrack[t.id] = normalize(store[t.id] ?? [], t.id);
  }
  return { byTrack };
}

async function putPublicBlobStore(store: BoardStore): Promise<BoardStore> {
  const payload = storeToPayload(store);
  const res = await fetchBlobResponse({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(String(res.status));
  try {
    const data = await res.json();
    if (isBoardPayload(data)) return parseStore(data);
  } catch {
    /* some hosts omit a JSON body on PUT */
  }
  return payload.byTrack;
}

/**
 * Write store to the public blob after merging with the latest remote.
 * Never replaces a non-empty remote track with an empty list.
 */
async function publishMergedStore(store: BoardStore): Promise<BoardStore> {
  let latest: BoardStore;
  try {
    latest = await fetchPublicBlobStore();
  } catch {
    // If we cannot read remote, only write when we actually have scores to preserve.
    if (storeEntryCount(store) === 0) throw new Error("refusing empty publish without remote");
    return putPublicBlobStore(store);
  }

  const merged = mergeBoardStores(latest, store);
  for (const t of TRACKS) {
    const remoteList = latest[t.id] ?? [];
    const nextList = merged[t.id] ?? [];
    if (remoteList.length > 0 && nextList.length === 0) {
      merged[t.id] = remoteList;
    }
  }

  // Refuse a full wipe of a previously non-empty worldwide board.
  if (storeEntryCount(latest) > 0 && storeEntryCount(merged) === 0) {
    return latest;
  }

  let written = await putPublicBlobStore(merged);

  // Second pass: absorb concurrent submits that landed between fetch and put.
  try {
    const againRemote = await fetchPublicBlobStore();
    const again = mergeBoardStores(againRemote, written, store);
    if (
      storeEntryCount(again) > storeEntryCount(written) ||
      JSON.stringify(again) !== JSON.stringify(written)
    ) {
      written = await putPublicBlobStore(again);
    }
  } catch {
    /* keep first write */
  }

  return written;
}

function insertEntry(store: BoardStore, entry: LeaderboardEntry, trackId: string): BoardStore {
  const tid = normalizeTrackId(trackId);
  const next = mergeBoardStores(store);
  next[tid] = normalize([...(next[tid] ?? []), entry], tid);
  return next;
}

export async function fetchLeaderboard(
  trackId: string = DEFAULT_TRACK_ID,
): Promise<{ entries: LeaderboardEntry[]; source: BoardSource }> {
  const tid = normalizeTrackId(trackId);
  const local = readLocalStore();

  // Durable game server first, then public blob, then local cache.
  const fromServer = await fetchLocalServerStore();

  let fromPublic: BoardStore | null = null;
  try {
    fromPublic = await fetchPublicBlobStore();
  } catch {
    fromPublic = null;
  }

  // Merge every source so an empty server never hides / wipes worldwide scores.
  const merged = mergeBoardStores(local, fromServer ?? emptyStore(), fromPublic ?? emptyStore());
  cacheStoreLocally(merged);

  if (fromServer) {
    return { entries: entriesFor(merged, tid), source: "server" };
  }

  if (fromPublic) {
    // Heal a wiped/empty remote from local or server scores when we have more.
    if (storeEntryCount(merged) > storeEntryCount(fromPublic)) {
      void publishMergedStore(merged).catch(() => undefined);
    }
    return { entries: entriesFor(merged, tid), source: "online" };
  }

  return { entries: entriesFor(merged, tid), source: "local" };
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

  const local = readLocalStore();
  let fromServer: BoardStore | null = null;
  let fromPublic: BoardStore | null = null;

  // Persist on game server when available — but never treat that as the sole worldwide truth.
  const serverUrl = apiUrl("/leaderboard");
  if (serverUrl) {
    try {
      const res = await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const data = await res.json();
        if (isBoardPayload(data)) fromServer = parseStore(data);
      }
    } catch {
      /* fall through — local server is optional */
    }
  }

  try {
    fromPublic = await fetchPublicBlobStore();
  } catch {
    fromPublic = null;
  }

  let store = insertEntry(
    mergeBoardStores(local, fromServer ?? emptyStore(), fromPublic ?? emptyStore()),
    entry,
    tid,
  );
  writeStoreLocally(store);

  if (fromServer) {
    // Best-effort mirror to public blob when available.
    void publishMergedStore(store).then((written) => cacheStoreLocally(written)).catch(() => undefined);
    return { entries: entriesFor(store, tid), source: "server" };
  }

  try {
    store = insertEntry(await publishMergedStore(store), entry, tid);
    cacheStoreLocally(store);
    return { entries: entriesFor(store, tid), source: "online" };
  } catch {
    return { entries: entriesFor(store, tid), source: "local" };
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
  if (source === "server") {
    return saved ? "Saved to online board" : "Live online board";
  }
  if (source === "online") {
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
