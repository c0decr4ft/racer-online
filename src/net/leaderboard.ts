export type LeaderboardEntry = {
  name: string;
  timeMs: number;
  bestLapMs?: number;
  at: number;
};

export type BoardSource = "online" | "server" | "local";

/** New course → new key so old-layout times never show. */
const STORAGE_KEY = "racer-leaderboard-v2";
const LEGACY_STORAGE_KEYS = ["racer-leaderboard-v1"];
const MAX = 10;
/** Max characters for a driver name on the board. */
export const NAME_MAX = 10;

/** Drop previous-course local caches once per page load. */
function clearLegacyLocalBoards() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}
clearLegacyLocalBoards();

/** Trim, allow letters/digits/space/underscore, drop control/weird chars, cap length. */
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

/** Shared public board (JSONBlob). Fresh empty store for the extended circuit. */
const PUBLIC_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019f89b5-c828-7f52-80b7-ca3888e5ae1b";

function localApiBase(): string | null {
  const host = location.hostname || "127.0.0.1";
  if (host === "localhost" || host === "127.0.0.1") return `http://${host}:8787`;
  return null;
}

function readLocal(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: LeaderboardEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX)));
}

/** Same driver + essentially same race time → one row (local+remote / retry merges). */
const TIME_EPS_MS = 15;

function entryKey(e: LeaderboardEntry): string {
  return `${e.name.trim().toLowerCase()}|${Math.round(e.timeMs)}`;
}

function isSameRun(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  if (a.name.trim().toLowerCase() !== b.name.trim().toLowerCase()) return false;
  return Math.abs(a.timeMs - b.timeMs) <= TIME_EPS_MS;
}

/** Prefer earlier submit; keep richer bestLap when tied. */
function pickBetter(a: LeaderboardEntry, b: LeaderboardEntry): LeaderboardEntry {
  const earlier = (a.at || 0) <= (b.at || 0) ? a : b;
  const other = earlier === a ? b : a;
  if (earlier.bestLapMs == null && other.bestLapMs != null) {
    return { ...earlier, bestLapMs: other.bestLapMs };
  }
  return earlier;
}

function normalize(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const cleaned = [...entries]
    .filter((e) => e && typeof e.timeMs === "number" && Number.isFinite(e.timeMs) && e.timeMs > 0)
    .map((e) => ({
      name: sanitizeDriverName(String(e.name || "RACER")),
      timeMs: Math.round(e.timeMs),
      bestLapMs: e.bestLapMs != null ? Math.round(e.bestLapMs) : undefined,
      at: e.at || Date.now(),
    }));

  // Dedupe by name+time (exact key first, then epsilon neighbors from merge races)
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

function parsePayload(data: unknown): LeaderboardEntry[] {
  if (Array.isArray(data)) return normalize(data);
  if (data && typeof data === "object" && Array.isArray((data as { entries?: unknown }).entries)) {
    return normalize((data as { entries: LeaderboardEntry[] }).entries);
  }
  return [];
}

async function fetchLocalServer(): Promise<LeaderboardEntry[] | null> {
  const base = localApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/leaderboard`, { cache: "no-store" });
    if (!res.ok) return null;
    return parsePayload(await res.json());
  } catch {
    return null;
  }
}

async function fetchPublicBlob(): Promise<LeaderboardEntry[]> {
  const res = await fetch(PUBLIC_BLOB_URL, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(String(res.status));
  return parsePayload(await res.json());
}

async function putPublicBlob(entries: LeaderboardEntry[]): Promise<LeaderboardEntry[]> {
  const normalized = normalize(entries);
  const res = await fetch(PUBLIC_BLOB_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ entries: normalized }),
  });
  if (!res.ok) throw new Error(String(res.status));
  // Some hosts echo the body; prefer what we wrote.
  try {
    const data = await res.json();
    const parsed = parsePayload(data);
    return parsed.length || !normalized.length ? parsed : normalized;
  } catch {
    return normalized;
  }
}

/** Fetch worldwide board; falls back to localStorage if offline. */
export async function fetchLeaderboard(): Promise<{ entries: LeaderboardEntry[]; source: BoardSource }> {
  const fromServer = await fetchLocalServer();
  if (fromServer) {
    writeLocal(fromServer);
    return { entries: fromServer, source: "server" };
  }

  try {
    const entries = await fetchPublicBlob();
    writeLocal(entries);
    return { entries, source: "online" };
  } catch {
    return { entries: normalize(readLocal()), source: "local" };
  }
}

export async function wouldQualify(timeMs: number): Promise<boolean> {
  const { entries } = await fetchLeaderboard();
  if (entries.length < MAX) return true;
  return timeMs < entries[entries.length - 1].timeMs;
}

/**
 * Submit a qualifying time with read-modify-write against the public store.
 * Retries once if a concurrent write likely raced.
 */
export async function submitScore(
  name: string,
  timeMs: number,
  bestLapMs?: number,
): Promise<{ entries: LeaderboardEntry[]; source: BoardSource }> {
  const entry: LeaderboardEntry = {
    name: sanitizeDriverName(name),
    timeMs: Math.round(timeMs),
    bestLapMs: bestLapMs != null && Number.isFinite(bestLapMs) ? Math.round(bestLapMs) : undefined,
    at: Date.now(),
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
        const data = await res.json();
        const entries = parsePayload(data);
        writeLocal(entries);
        // Mirror to public board so Pages players see local-dev scores too.
        void putPublicBlob(entries).catch(() => undefined);
        return { entries, source: "server" };
      }
    } catch {
      /* fall through to public / local */
    }
  }

  try {
    // normalize() dedupes — safe if soft-retry re-merges the same run
    let entries = normalize([...(await fetchPublicBlob()), entry]);
    entries = await putPublicBlob(entries);
    // Soft retry: re-read and merge in case another client wrote between GET and PUT.
    try {
      const latest = await fetchPublicBlob();
      const merged = normalize([...latest, entry]);
      if (JSON.stringify(merged) !== JSON.stringify(entries)) {
        entries = await putPublicBlob(merged);
      }
    } catch {
      /* keep first write */
    }
    writeLocal(entries);
    return { entries, source: "online" };
  } catch {
    const merged = normalize([...readLocal(), entry]);
    writeLocal(merged);
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
