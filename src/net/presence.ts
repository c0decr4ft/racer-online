/**
 * Lightweight human-presence store.
 *
 * Prefer the durable game server (`/api/presence`) when available. Fall back to
 * JSONBlob for static hosting without a backend (blob TTLs are short ~24h).
 *
 * Shape: { buckets: { "YYYY-MM-DDTHH": peakCount }, sessions: { id: lastSeenMs }, updatedAt, historyEpoch? }
 *
 * Counts unique browser tabs only (one session id per tab). AI / race-grid cars are never written
 * or counted. Clients heartbeat every ~40s while visible; hidden/closed tabs leave immediately.
 * Hourly peak buckets = max concurrent human sessions that hour (never invented, never car counts).
 * Current "online" = non-expired sessions only — never a peak bucket.
 */

import { apiUrl } from "./apiBase";

const PUBLIC_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019fbe1c-6ce6-78a2-b891-3908b5a6b901";

const SESSION_KEY = "racer-presence-session";
const HEARTBEAT_MS = 40_000;
/** Drop sessions that haven't heartbeated within this window (~1 heartbeat miss + margin). */
const STALE_MS = 75_000;
const KEEP_HOURS = 14 * 24;
const WRITE_ATTEMPTS = 4;
/**
 * Bump to discard historically inflated peak buckets (ghost-session races / agent tabs).
 * Live sessions are always pruned by STALE_MS; this only resets the graph series.
 */
const HISTORY_EPOCH = 2;
const STARTED_FLAG = "__racerPresenceHeartbeatStarted";

export type PresenceBucket = { key: string; count: number; at: number };
export type PresenceSnapshot = {
  now: number;
  buckets: PresenceBucket[];
  updatedAt: number;
  source: "online" | "server" | "local";
  racing?: number;
};

type PresenceStore = {
  buckets: Record<string, number>;
  sessions: Record<string, number>;
  updatedAt: number;
  historyEpoch: number;
};

function emptyStore(): PresenceStore {
  return { buckets: {}, sessions: {}, updatedAt: 0, historyEpoch: HISTORY_EPOCH };
}

function hourKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}`;
}

function hourKeyToMs(key: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/.exec(key);
  if (!m) return 0;
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!);
}

function parseStore(data: unknown): PresenceStore {
  const store = emptyStore();
  if (!data || typeof data !== "object") return store;
  const obj = data as Partial<PresenceStore> & { historyEpoch?: unknown };
  const epoch =
    typeof obj.historyEpoch === "number" && Number.isFinite(obj.historyEpoch)
      ? Math.round(obj.historyEpoch)
      : 0;
  store.historyEpoch = epoch;

  // Drop pre-epoch peaks — they mixed ghost sessions into the graph.
  if (epoch >= HISTORY_EPOCH && obj.buckets && typeof obj.buckets === "object") {
    for (const [k, v] of Object.entries(obj.buckets)) {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v >= 0) {
        store.buckets[k] = Math.max(0, Math.round(v));
      }
    }
  }

  if (obj.sessions && typeof obj.sessions === "object") {
    for (const [id, at] of Object.entries(obj.sessions)) {
      if (typeof id === "string" && id.length >= 8 && typeof at === "number" && Number.isFinite(at) && at > 0) {
        store.sessions[id] = Math.round(at);
      }
    }
  }
  if (typeof obj.updatedAt === "number" && Number.isFinite(obj.updatedAt)) {
    store.updatedAt = Math.round(obj.updatedAt);
  }
  return store;
}

function pruneStore(store: PresenceStore, now = Date.now()): PresenceStore {
  const sessions: Record<string, number> = {};
  for (const [id, at] of Object.entries(store.sessions)) {
    if (now - at <= STALE_MS) sessions[id] = at;
  }
  const cutoff = now - KEEP_HOURS * 3_600_000;
  const buckets: Record<string, number> = {};
  // Only keep peaks from the current history epoch (human heartbeats only).
  if (store.historyEpoch >= HISTORY_EPOCH) {
    for (const [k, v] of Object.entries(store.buckets)) {
      const at = hourKeyToMs(k);
      if (at >= cutoff) buckets[k] = v;
    }
  }
  return {
    buckets,
    sessions,
    updatedAt: store.updatedAt,
    historyEpoch: Math.max(store.historyEpoch, HISTORY_EPOCH),
  };
}

function activeCount(store: PresenceStore, now = Date.now()): number {
  let n = 0;
  for (const at of Object.values(store.sessions)) {
    if (now - at <= STALE_MS) n += 1;
  }
  return n;
}

function toBuckets(store: PresenceStore): PresenceBucket[] {
  return Object.entries(store.buckets)
    .map(([key, count]) => ({ key, count, at: hourKeyToMs(key) }))
    .filter((b) => b.at > 0)
    .sort((a, b) => a.at - b.at);
}

/** Max peaks per hour only (sessions are never merged from a stale local snapshot). */
function mergeBucketPeaks(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const buckets: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    buckets[k] = Math.max(buckets[k] ?? 0, v);
  }
  return buckets;
}

function recordPeak(store: PresenceStore, now = Date.now()): void {
  const peak = activeCount(store, now);
  const key = hourKey(now);
  store.buckets[key] = Math.max(store.buckets[key] ?? 0, peak);
  store.updatedAt = now;
  store.historyEpoch = HISTORY_EPOCH;
}

function applyHeartbeat(store: PresenceStore, id: string, now = Date.now()): PresenceStore {
  const next = pruneStore(store, now);
  next.sessions[id] = now;
  recordPeak(next, now);
  return next;
}

function applyLeave(store: PresenceStore, id: string, now = Date.now()): PresenceStore {
  const next = pruneStore(store, now);
  delete next.sessions[id];
  // Do not rewrite hourly peaks on leave — peaks are historical maxima.
  next.updatedAt = now;
  next.historyEpoch = HISTORY_EPOCH;
  return next;
}

function snapshotOf(
  store: PresenceStore,
  source: "online" | "server" | "local",
  racing?: number,
): PresenceSnapshot {
  const pruned = pruneStore(store);
  return {
    now: activeCount(pruned),
    buckets: toBuckets(pruned),
    updatedAt: pruned.updatedAt,
    source,
    racing,
  };
}

function snapshotFromServerPayload(data: unknown): PresenceSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as {
    now?: unknown;
    buckets?: unknown;
    updatedAt?: unknown;
    racing?: unknown;
    ok?: unknown;
  };
  if (typeof obj.now !== "number" || !Number.isFinite(obj.now)) return null;
  const buckets: PresenceBucket[] = [];
  if (Array.isArray(obj.buckets)) {
    for (const row of obj.buckets) {
      if (!row || typeof row !== "object") continue;
      const b = row as { key?: unknown; count?: unknown; at?: unknown };
      if (typeof b.key !== "string" || typeof b.count !== "number") continue;
      buckets.push({
        key: b.key,
        count: Math.max(0, Math.round(b.count)),
        at: typeof b.at === "number" && Number.isFinite(b.at) ? b.at : hourKeyToMs(b.key),
      });
    }
  }
  return {
    now: Math.max(0, Math.round(obj.now)),
    buckets: buckets.filter((b) => b.at > 0).sort((a, b) => a.at - b.at),
    updatedAt:
      typeof obj.updatedAt === "number" && Number.isFinite(obj.updatedAt)
        ? Math.round(obj.updatedAt)
        : Date.now(),
    source: "server",
    racing:
      typeof obj.racing === "number" && Number.isFinite(obj.racing)
        ? Math.max(0, Math.round(obj.racing))
        : undefined,
  };
}

function sessionsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function bucketsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/** Stable per-tab id: memory cache + sessionStorage (never invent a new id each call). */
let cachedSessionId: string | null = null;

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) {
      cachedSessionId = existing;
      return existing;
    }
    const id = newSessionId();
    sessionStorage.setItem(SESSION_KEY, id);
    cachedSessionId = id;
    return id;
  } catch {
    // sessionStorage unavailable — still keep one id for this page lifetime
    cachedSessionId = newSessionId();
    return cachedSessionId;
  }
}

async function fetchStore(): Promise<PresenceStore> {
  const res = await fetch(PUBLIC_BLOB_URL, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(String(res.status));
  return parseStore(await res.json());
}

async function putStore(store: PresenceStore, keepalive = false): Promise<PresenceStore> {
  const body = pruneStore(store);
  body.updatedAt = Date.now();
  body.historyEpoch = HISTORY_EPOCH;
  const res = await fetch(PUBLIC_BLOB_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    keepalive,
  });
  if (!res.ok) throw new Error(String(res.status));
  try {
    return parseStore(await res.json());
  } catch {
    return body;
  }
}

/**
 * Read-modify-write with retries.
 *
 * Important: after a put we re-apply *only* our mutate against the latest remote.
 * We must NOT merge an older local session map back in — that resurrects sessions
 * another tab already removed (leave) and inflates the online count.
 */
async function mutatePresenceOnce(
  mutate: (store: PresenceStore, now: number) => PresenceStore,
  opts: { keepalive?: boolean } = {},
): Promise<PresenceStore> {
  let last = emptyStore();
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
    const now = Date.now();
    const remote = pruneStore(await fetchStore(), now);
    const next = mutate(remote, now);
    // Preserve higher peaks only within the current history epoch.
    next.buckets = mergeBucketPeaks(remote.buckets, next.buckets);
    next.historyEpoch = HISTORY_EPOCH;
    await putStore(next, opts.keepalive);

    const latest = pruneStore(await fetchStore(), Date.now());
    // Re-apply intent on whatever won the race — never merge stale local sessions.
    const reconciled = mutate(latest, Date.now());
    reconciled.buckets = mergeBucketPeaks(latest.buckets, reconciled.buckets);
    reconciled.historyEpoch = HISTORY_EPOCH;

    if (sessionsEqual(reconciled.sessions, latest.sessions) && bucketsEqual(reconciled.buckets, latest.buckets)) {
      return reconciled;
    }

    last = await putStore(reconciled, opts.keepalive);
  }
  return last;
}

/** Serialize all writes from this tab (heartbeat vs leave must not interleave). */
let writeChain: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function fetchServerPresence(): Promise<PresenceSnapshot | null> {
  const url = apiUrl("/presence");
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return snapshotFromServerPayload(await res.json());
  } catch {
    return null;
  }
}

async function postServerPresence(
  id: string,
  action: "heartbeat" | "leave",
  keepalive = false,
): Promise<PresenceSnapshot | null> {
  const url = apiUrl("/presence");
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id, action }),
      keepalive,
    });
    if (!res.ok) return null;
    return snapshotFromServerPayload(await res.json());
  } catch {
    return null;
  }
}

/** Read current activity for the dashboard (does not write a heartbeat). */
export async function fetchPresence(): Promise<PresenceSnapshot> {
  const fromServer = await fetchServerPresence();
  if (fromServer) return fromServer;
  try {
    return snapshotOf(await fetchStore(), "online");
  } catch {
    return { now: 0, buckets: [], updatedAt: 0, source: "local" };
  }
}

/** Ping once — update this tab's session + current hour peak. */
export async function sendHeartbeat(): Promise<PresenceSnapshot | null> {
  const id = sessionId();
  return enqueueWrite(async () => {
    const fromServer = await postServerPresence(id, "heartbeat");
    if (fromServer) {
      // Best-effort mirror to public blob (does not gate the dashboard).
      void mutatePresenceOnce((remote, now) => applyHeartbeat(remote, id, now)).catch(() => undefined);
      return fromServer;
    }
    try {
      const store = await mutatePresenceOnce((remote, now) => applyHeartbeat(remote, id, now));
      return snapshotOf(store, "online");
    } catch {
      return null;
    }
  });
}

/** Best-effort remove this tab from the online set (page hide / unload). */
export async function endPresenceSession(): Promise<void> {
  const id =
    cachedSessionId ??
    (() => {
      try {
        return sessionStorage.getItem(SESSION_KEY);
      } catch {
        return null;
      }
    })();
  if (!id) return;
  await enqueueWrite(async () => {
    await postServerPresence(id, "leave", true);
    try {
      await mutatePresenceOnce((remote, now) => applyLeave(remote, id, now), { keepalive: true });
    } catch {
      /* ignore — session will expire via STALE_MS */
    }
  });
}

let presenceStarted = false;
let heartbeatInFlight = false;

/** Start periodic heartbeats while the page is visible. Safe to call once from main. */
export function startPresenceHeartbeat(): void {
  // Survive Vite HMR so we don't stack intervals (same tab id, but extra write load).
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>)[STARTED_FLAG]) {
    return;
  }
  if (presenceStarted) return;
  presenceStarted = true;
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[STARTED_FLAG] = true;
  }

  const tick = () => {
    if (document.visibilityState === "hidden") return;
    if (heartbeatInFlight) return;
    heartbeatInFlight = true;
    const run = () => {
      void sendHeartbeat().finally(() => {
        heartbeatInFlight = false;
      });
    };
    // Keep JSONBlob RMW off the animation-frame path (menu hitching)
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 0);
    }
  };

  tick();
  setInterval(tick, HEARTBEAT_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      tick();
    } else {
      // Drop immediately so "playing now" doesn't linger until STALE_MS.
      void endPresenceSession();
    }
  });

  // Restore from bfcache — pagehide may have removed us; re-announce.
  addEventListener("pageshow", (ev) => {
    if (ev.persisted) tick();
  });

  // Best-effort remove on close/navigate so count drops sooner than STALE_MS.
  addEventListener("pagehide", () => {
    void endPresenceSession();
  });
}

export const PRESENCE_BLOB_URL = PUBLIC_BLOB_URL;
export const PRESENCE_STALE_MS = STALE_MS;

/** Pure helpers for unit tests (node) — not used by the game UI. */
export const __presenceTest = {
  parseStore,
  pruneStore,
  activeCount,
  applyHeartbeat,
  applyLeave,
  mergeBucketPeaks,
  sessionsEqual,
  STALE_MS,
  HISTORY_EPOCH,
  emptyStore,
};
