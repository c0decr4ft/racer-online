import { DEFAULT_TRACK_ID, isTrackId, TRACKS } from "../trackDefs";
import { apiUrl } from "./apiBase";
import { scoreEventTemplate, verifyScoreEvent, publishScoreEvent } from "../nostr/scores";

export type LeaderboardEntry = {
  name: string;
  timeMs: number;
  bestLapMs?: number;
  at: number;
  trackId?: string;
  /** Nostr pubkey (64-hex) of the verified racer who set this time. */
  pubkey?: string;
  /** id of the signed score event this entry came from. */
  eventId?: string;
};

/** Minimal signer surface needed to sign a score (NIP-07 or NIP-46). */
export type ScoreSigner = {
  signEvent: (template: ReturnType<typeof scoreEventTemplate>) => Promise<unknown>;
};

/** Raw signed Nostr event as stored in the public blob. */
type RawEvent = {
  id: string;
  pubkey: string;
  sig: string;
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
};

function isRawEvent(data: unknown): data is RawEvent {
  if (!data || typeof data !== "object") return false;
  const e = data as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.pubkey === "string" &&
    typeof e.sig === "string" &&
    typeof e.kind === "number" &&
    Array.isArray(e.tags)
  );
}

export type BoardSource = "online" | "server" | "local";

/**
 * Per-track local cache schema revision — NOT the game display version (GAME_VERSION).
 * Older builds stored the same times under v1–v4 keys and deleted every other key on
 * startup, so the board vanished or returned depending on which version you opened.
 * This build reads every key, keeps them all, and writes the union back.
 */
const BOARD_STORAGE_VERSION = 5;
/** Survives the v1.4 wipe, which only deletes keys starting with `racer-leaderboard-v`. */
const ARCHIVE_KEY = "racer-board-archive";

function storageKey(trackId: string) {
  return `racer-leaderboard-v${BOARD_STORAGE_VERSION}-${trackId}`;
}

const DRIVER_NAME_KEY = "racer-driver-name";
/** High cap so a full history stays visible. Best time per signed racer, plus legacy rows. */
const MAX = 200;
export const NAME_MAX = 15;

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

function allBoardIds(): string[] {
  return TRACKS.map((t) => t.id);
}

function isPointsBoard(_trackId: string): boolean {
  return false;
}

function normalizeTrackId(raw: unknown): string {
  const id = String(raw ?? "").trim();
  return isTrackId(id) ? id : DEFAULT_TRACK_ID;
}

/**
 * Public worldwide board (JSONBlob). Best-effort sync when no game server is available.
 *
 * Recreated 2026-08-01 after prior blob returned 403 (expired).
 * v1.4 published to LEGACY_BLOB_URL. Both are read so a version switch cannot
 * hide times that only one blob still has.
 * Note: jsonblob.com currently issues ~24h TTLs on create. Prefer the durable
 * Node server (`npm run server` / `npm start`) — scores persist in server/leaderboard.json.
 * Set VITE_API_BASE to a hosted server for production Pages deploys.
 */
export const PUBLIC_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019fbe1c-6b22-7df1-9007-59a04ae0df4c";
const LEGACY_BLOB_URL = "https://jsonblob.com/api/jsonBlob/019f89b5-c828-7f52-80b7-ca3888e5ae1b";
const BLOB_URLS = [PUBLIC_BLOB_URL, LEGACY_BLOB_URL];

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

/** Verified entries key on pubkey (one best time per racer); local guest entries keep legacy name+time keying. */
function entryKey(e: LeaderboardEntry): string {
  if (e.pubkey) return `pk:${e.pubkey}`;
  return `${e.name.trim().toLowerCase()}|${Math.round(e.timeMs)}`;
}

function isSameRun(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  if (a.name.trim().toLowerCase() !== b.name.trim().toLowerCase()) return false;
  return Math.abs(a.timeMs - b.timeMs) <= TIME_EPS_MS;
}

/** Same key: a racer's faster time wins; ties go to the earlier submission; missing bestLap gets filled in. */
function pickBetter(a: LeaderboardEntry, b: LeaderboardEntry): LeaderboardEntry {
  const points = isPointsBoard(a.trackId || "") || isPointsBoard(b.trackId || "");
  let winner = a;
  let loser = b;
  if (points) {
    const sa = a.bestLapMs ?? 0;
    const sb = b.bestLapMs ?? 0;
    if (sa !== sb) {
      winner = sa > sb ? a : b;
      loser = winner === a ? b : a;
    } else if (a.timeMs !== b.timeMs) {
      winner = a.timeMs < b.timeMs ? a : b;
      loser = winner === a ? b : a;
    } else {
      winner = (a.at || 0) <= (b.at || 0) ? a : b;
      loser = winner === a ? b : a;
    }
  } else if (a.pubkey && a.pubkey === b.pubkey) {
    winner = a.timeMs < b.timeMs || (a.timeMs === b.timeMs && (a.at || 0) <= (b.at || 0)) ? a : b;
    loser = winner === a ? b : a;
  } else {
    winner = (a.at || 0) <= (b.at || 0) ? a : b;
    loser = winner === a ? b : a;
  }
  if (winner.bestLapMs == null && loser.bestLapMs != null) {
    return { ...winner, bestLapMs: loser.bestLapMs };
  }
  return winner;
}

/** Normalize, dedupe (best-per-pubkey / legacy near-identical runs), keep top N. */
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
      pubkey: e.pubkey,
      eventId: e.eventId,
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

  return unique
    .sort((a, b) => {
      if (tid && isPointsBoard(tid)) {
        const sa = a.bestLapMs ?? 0;
        const sb = b.bestLapMs ?? 0;
        return sb - sa || a.timeMs - b.timeMs || (a.at || 0) - (b.at || 0);
      }
      return a.timeMs - b.timeMs || (a.at || 0) - (b.at || 0);
    })
    .slice(0, MAX);
}

export function emptyStore(): BoardStore {
  const store: BoardStore = {};
  for (const id of allBoardIds()) store[id] = [];
  return store;
}

/** Union all per-track lists, then normalize/top-N each track. */
export function mergeBoardStores(...stores: BoardStore[]): BoardStore {
  const out = emptyStore();
  for (const id of allBoardIds()) {
    const merged: LeaderboardEntry[] = [];
    for (const s of stores) {
      const list = s?.[id];
      if (Array.isArray(list) && list.length) merged.push(...list);
    }
    out[id] = normalize(merged, id);
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

/**
 * Coerce one stored item into a board entry.
 * - Signed score events: always signature-verified here.
 * - Plain entries: kept when `allowPlain` is set (local caches, older blobs,
 *   and the game server). Missing pubkeys are older unsigned times — dropping
 *   them is what made the board empty on newer builds.
 */
function toEntry(
  item: unknown,
  trackId: string,
  _trusted: boolean,
  allowPlain = false,
): LeaderboardEntry | null {
  if (isRawEvent(item)) {
    const score = verifyScoreEvent(item, trackId);
    if (!score) return null;
    return {
      name: score.name,
      timeMs: score.timeMs,
      bestLapMs: score.bestLapMs,
      at: score.at,
      trackId: score.trackId,
      pubkey: score.pubkey,
      eventId: score.eventId,
    };
  }
  if (!allowPlain) return null;
  if (!item || typeof item !== "object") return null;
  const e = item as LeaderboardEntry;
  if (typeof e.timeMs !== "number" || !Number.isFinite(e.timeMs) || e.timeMs <= 0) return null;
  const pubkey =
    typeof e.pubkey === "string" && /^[0-9a-f]{64}$/.test(e.pubkey) ? e.pubkey.toLowerCase() : undefined;
  return {
    name: typeof e.name === "string" ? e.name : "RACER",
    timeMs: e.timeMs,
    bestLapMs:
      e.bestLapMs != null && Number.isFinite(e.bestLapMs) && e.bestLapMs > 0 ? e.bestLapMs : undefined,
    at: typeof e.at === "number" && Number.isFinite(e.at) ? e.at : Date.now(),
    trackId: e.trackId ? normalizeTrackId(e.trackId) : trackId,
    pubkey,
    eventId: typeof e.eventId === "string" ? e.eventId : undefined,
  };
}

/**
 * Parse a stored board payload.
 * `trusted` = our own game server (verified at write). `allowPlain` keeps
 * unsigned historical rows from local caches and older worldwide blobs.
 */
export function parseStore(data: unknown, trusted = false, allowPlain = trusted): BoardStore {
  const store = emptyStore();
  if (!isBoardPayload(data)) return store;

  const obj = data as { byTrack?: unknown; entries?: unknown };
  const parseList = (list: unknown[], tid: string): LeaderboardEntry[] =>
    list
      .map((item) => toEntry(item, tid, trusted, allowPlain))
      .filter((e): e is LeaderboardEntry => e !== null);

  if (obj.byTrack && typeof obj.byTrack === "object") {
    for (const [id, list] of Object.entries(obj.byTrack as Record<string, unknown>)) {
      const tid = normalizeTrackId(id);
      if (!Array.isArray(list)) continue;
      // Merge when legacy / unknown ids collapse onto the same track
      store[tid] = normalize([...(store[tid] ?? []), ...parseList(list, tid)], tid);
    }
    return store;
  }

  if (Array.isArray(data)) {
    store[DEFAULT_TRACK_ID] = normalize(parseList(data, DEFAULT_TRACK_ID), DEFAULT_TRACK_ID);
    return store;
  }
  if (Array.isArray(obj.entries)) {
    store[DEFAULT_TRACK_ID] = normalize(parseList(obj.entries, DEFAULT_TRACK_ID), DEFAULT_TRACK_ID);
  }
  return store;
}

function entriesFor(store: BoardStore, trackId: string): LeaderboardEntry[] {
  const tid = normalizeTrackId(trackId);
  return normalize(store[tid] ?? [], tid);
}

function readLocalStore(): BoardStore {
  const store = emptyStore();
  for (const id of allBoardIds()) store[id] = normalize(readLocal(id), id);
  return store;
}

function writeStoreLocally(store: BoardStore) {
  for (const id of allBoardIds()) writeLocal(id, normalize(store[id] ?? [], id));
}

function trackFromStorageKey(key: string): string | null {
  const prefixed = /^racer-leaderboard-v\d+-(.+)$/.exec(key);
  if (prefixed) return normalizeTrackId(prefixed[1]);
  if (/^racer-leaderboard-v\d+$/.test(key)) return DEFAULT_TRACK_ID;
  return null;
}

function storeFromEntryList(trackId: string, list: unknown[]): BoardStore {
  const store = emptyStore();
  const tid = normalizeTrackId(trackId);
  store[tid] = list
    .map((item) => toEntry(item, tid, true, true))
    .filter((e): e is LeaderboardEntry => e !== null);
  return store;
}

/** Every local board this browser has ever stored, including older version keys. */
function readEveryLocalStore(): BoardStore {
  const parts: BoardStore[] = [readLocalStore()];
  try {
    const archiveRaw = localStorage.getItem(ARCHIVE_KEY);
    if (archiveRaw) parts.push(parseStore(JSON.parse(archiveRaw), true, true));
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (!key.startsWith("racer-leaderboard-v")) continue;
      if (key.startsWith(`racer-leaderboard-v${BOARD_STORAGE_VERSION}-`)) continue;
      const track = trackFromStorageKey(key);
      if (!track) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) parts.push(storeFromEntryList(track, parsed));
      else parts.push(parseStore(parsed, true, true));
    }
  } catch {
    /* private mode / bad JSON — keep what we already read */
  }
  return mergeBoardStores(...parts);
}

/** Write the union to the current key, the v1.4 key, and a version-proof archive. */
function persistAllLocal(store: BoardStore) {
  const normalized = mergeBoardStores(store);
  writeStoreLocally(normalized);
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify({ byTrack: normalized }));
    for (const id of allBoardIds()) {
      localStorage.setItem(`racer-leaderboard-v4-${id}`, JSON.stringify(normalized[id] ?? []));
    }
  } catch {
    /* quota / private mode */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryBlobStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

/** Fetch one JSONBlob with backoff on transient network / rate-limit / 5xx failures. */
async function fetchBlobAt(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < BLOB_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
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

function fetchBlobResponse(init?: RequestInit): Promise<Response> {
  return fetchBlobAt(PUBLIC_BLOB_URL, init);
}

async function fetchLocalServerStore(): Promise<BoardStore | null> {
  const url = apiUrl("/leaderboard");
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!isBoardPayload(data)) return null;
    // Our server verifies signatures at write time — plain entries are trusted.
    return parseStore(data, true);
  } catch {
    return null;
  }
}

async function fetchPublicBlobStore(url = PUBLIC_BLOB_URL): Promise<BoardStore> {
  const res = await fetchBlobAt(url);
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  if (!isBoardPayload(data)) throw new Error("unrecognized board payload");
  // Signed events are verified. Plain rows are historical times from older builds.
  return parseStore(data, false, true);
}

async function fetchAllPublicBlobs(): Promise<BoardStore> {
  const stores = await Promise.all(
    BLOB_URLS.map(async (url) => {
      try {
        return await fetchPublicBlobStore(url);
      } catch {
        return null;
      }
    }),
  );
  return mergeBoardStores(...stores.filter((s): s is BoardStore => s !== null));
}

/** Max rows kept per track in the public blob. Same cap as the on-screen board. */

/** Extract raw signed events per track from a blob payload (unsigned items skipped). */
function collectBlobEvents(data: unknown): Record<string, RawEvent[]> {
  const out: Record<string, RawEvent[]> = {};
  const obj = data as { byTrack?: unknown } | null;
  const lists: Record<string, unknown[]> = {};
  if (obj && typeof obj === "object" && obj.byTrack && typeof obj.byTrack === "object") {
    for (const [id, list] of Object.entries(obj.byTrack as Record<string, unknown>)) {
      if (Array.isArray(list)) lists[normalizeTrackId(id)] = list;
    }
  } else if (Array.isArray(data)) {
    lists[DEFAULT_TRACK_ID] = data;
  }
  for (const [tid, list] of Object.entries(lists)) {
    out[tid] = list.filter(isRawEvent);
  }
  return out;
}

/**
 * Merge a freshly signed event into the public blob: every candidate is
 * signature-verified, then we keep the fastest event per pubkey per track.
 */
async function publishEventToBlob(event: RawEvent, trackId: string): Promise<void> {
  const tid = normalizeTrackId(trackId);
  let existing: Record<string, RawEvent[]> = {};
  let plainExisting = emptyStore();
  try {
    const res = await fetchBlobResponse();
    if (res.ok) {
      const data = await res.json();
      existing = collectBlobEvents(data);
      plainExisting = parseStore(data, false, true);
    }
  } catch {
    /* unreadable blob — publish just ours */
  }

  const merged: Record<string, unknown[]> = {};
  for (const id of allBoardIds()) {
    const candidates = [...(existing[id] ?? []), ...(id === tid ? [event] : [])];
    const byPubkey = new Map<string, { raw: RawEvent; timeMs: number; at: number; score: number }>();
    for (const raw of candidates) {
      const score = verifyScoreEvent(raw, id);
      if (!score) continue;
      const prev = byPubkey.get(score.pubkey);
      const pts = score.bestLapMs ?? 0;
      const better = isPointsBoard(id)
        ? !prev || pts > prev.score || (pts === prev.score && score.timeMs < prev.timeMs)
        : !prev || score.timeMs < prev.timeMs || (score.timeMs === prev.timeMs && score.at < prev.at);
      if (better) {
        byPubkey.set(score.pubkey, { raw, timeMs: score.timeMs, at: score.at, score: pts });
      }
    }
    const signed = [...byPubkey.values()]
      .sort((a, b) =>
        isPointsBoard(id) ? b.score - a.score || a.timeMs - b.timeMs : a.timeMs - b.timeMs || a.at - b.at,
      )
      .map((v) => v.raw);
    const covered = new Set(byPubkey.keys());
    const plains = (plainExisting[id] ?? []).filter((e) => !e.pubkey || !covered.has(e.pubkey));
    merged[id] = [...signed, ...plains].slice(0, MAX);
  }

  const res = await fetchBlobResponse({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ byTrack: merged }),
  });
  if (!res.ok) throw new Error(String(res.status));
}

function insertEntry(store: BoardStore, entry: LeaderboardEntry, trackId: string): BoardStore {
  const tid = normalizeTrackId(trackId);
  const next = mergeBoardStores(store);
  next[tid] = normalize([...(next[tid] ?? []), entry], tid);
  return next;
}

function storeHasEntries(store: BoardStore | null | undefined): boolean {
  if (!store) return false;
  return allBoardIds().some((id) => (store[id] ?? []).length > 0);
}

export async function fetchLeaderboard(
  trackId: string = DEFAULT_TRACK_ID,
): Promise<{ entries: LeaderboardEntry[]; source: BoardSource }> {
  const tid = normalizeTrackId(trackId);
  const local = readEveryLocalStore();

  // An empty server used to replace the board. Always union it with local history.
  const fromServer = await fetchLocalServerStore();
  if (fromServer) {
    void healServerFromBlob(fromServer).catch(() => undefined);
  }

  const fromPublic = await fetchAllPublicBlobs();
  const merged = mergeBoardStores(local, fromServer ?? emptyStore(), fromPublic);
  persistAllLocal(merged);

  const source: BoardSource = storeHasEntries(fromServer)
    ? "server"
    : storeHasEntries(fromPublic)
      ? "online"
      : "local";
  return { entries: entriesFor(merged, tid), source };
}

/**
 * One-way background sync: re-POST signed blob events the server is missing
 * (server re-verifies each signature and keeps the best time per pubkey).
 */
async function healServerFromBlob(serverStore: BoardStore): Promise<void> {
  const serverUrl = apiUrl("/leaderboard");
  if (!serverUrl) return;
  let raw: Record<string, RawEvent[]>;
  try {
    const res = await fetchBlobResponse();
    if (!res.ok) return;
    raw = collectBlobEvents(await res.json());
  } catch {
    return;
  }
  for (const id of allBoardIds()) {
    const serverBest = new Map((serverStore[id] ?? []).map((e) => [e.pubkey, e]));
    for (const event of raw[id] ?? []) {
      const score = verifyScoreEvent(event, id);
      if (!score) continue;
      const existing = score.pubkey ? serverBest.get(score.pubkey) : undefined;
      if (existing) {
        const better = isPointsBoard(id)
          ? (score.bestLapMs ?? 0) > (existing.bestLapMs ?? 0)
          : existing.timeMs <= score.timeMs;
        if (!better && isPointsBoard(id)) continue;
        if (!isPointsBoard(id) && existing.timeMs <= score.timeMs) continue;
      }
      try {
        await fetch(serverUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event }),
        });
      } catch {
        /* next load heals the rest */
      }
    }
  }
}

export async function wouldQualify(
  timeMs: number,
  trackId: string = DEFAULT_TRACK_ID,
  score?: number,
): Promise<boolean> {
  const { entries } = await fetchLeaderboard(trackId);
  if (entries.length < MAX) return true;
  if (isPointsBoard(trackId) && score != null) {
    return score > (entries[entries.length - 1]!.bestLapMs ?? 0);
  }
  return timeMs < entries[entries.length - 1]!.timeMs;
}

export async function submitScore(
  name: string,
  timeMs: number,
  bestLapMs?: number,
  trackId: string = DEFAULT_TRACK_ID,
  signer?: ScoreSigner | null,
): Promise<{ entries: LeaderboardEntry[]; source: BoardSource }> {
  const tid = normalizeTrackId(trackId);
  const entry: LeaderboardEntry = {
    name: sanitizeDriverName(name),
    timeMs: Math.round(timeMs),
    bestLapMs: bestLapMs != null && Number.isFinite(bestLapMs) ? Math.round(bestLapMs) : undefined,
    at: Date.now(),
    trackId: tid,
  };

  // Personal on-device record — always updated, never published unsigned.
  const local = insertEntry(readLocalStore(), entry, tid);
  writeStoreLocally(local);

  if (!signer) {
    persistAllLocal(local);
    return { entries: entriesFor(local, tid), source: "local" };
  }

  // Sign the run with the racer's Nostr key (kind 30078, one best per track).
  const event = (await signer.signEvent(
    scoreEventTemplate({
      name: entry.name,
      timeMs: entry.timeMs,
      bestLapMs: entry.bestLapMs,
      trackId: tid,
    }),
  )) as RawEvent;

  // Primary: the game server verifies the signature and stores the score.
  const serverUrl = apiUrl("/leaderboard");
  if (serverUrl) {
    try {
      const res = await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isBoardPayload(data)) {
          const store = mergeBoardStores(parseStore(data, true, true), readEveryLocalStore());
          persistAllLocal(store);
          // Best-effort: mirror to the worldwide blob + public Nostr relays.
          void publishEventToBlob(event, tid).catch(() => undefined);
          void publishScoreEvent(event);
          return { entries: entriesFor(store, tid), source: "server" };
        }
      }
    } catch {
      /* fall through to the blob */
    }
  }

  // Fallback: straight into the worldwide blob (still signed + verified).
  try {
    await publishEventToBlob(event, tid);
    void publishScoreEvent(event);
    const store = mergeBoardStores(await fetchPublicBlobStore(), readEveryLocalStore());
    persistAllLocal(store);
    return { entries: entriesFor(store, tid), source: "online" };
  } catch {
    persistAllLocal(local);
    return { entries: entriesFor(local, tid), source: "local" };
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

/** Device-best race time + best lap for a track (from the local personal store). */
export function getLocalBest(trackId: string): { timeMs: number | null; bestLapMs: number | null } {
  const tid = normalizeTrackId(trackId);
  const entries = readEveryLocalStore()[tid] ?? [];
  let timeMs: number | null = null;
  let bestLapMs: number | null = null;
  for (const e of entries) {
    if (Number.isFinite(e.timeMs) && e.timeMs > 0 && (timeMs === null || e.timeMs < timeMs)) {
      timeMs = e.timeMs;
    }
    if (
      e.bestLapMs != null &&
      Number.isFinite(e.bestLapMs) &&
      e.bestLapMs > 0 &&
      (bestLapMs === null || e.bestLapMs < bestLapMs)
    ) {
      bestLapMs = e.bestLapMs;
    }
  }
  return { timeMs, bestLapMs };
}

export function boardSourceLabel(source: BoardSource, saved = false): string {
  if (source === "server") {
    return saved ? "Saved to Sats Racer board" : "Live Sats Racer board";
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

// Fold every older board into the keys this build and v1.4 both read.
persistAllLocal(readEveryLocalStore());
