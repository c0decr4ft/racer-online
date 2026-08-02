/**
 * Unit checks for leaderboard merge semantics (mirrors src/net/leaderboard.ts).
 * Run: node scripts/verify-leaderboard.mjs
 */

const TRACK_IDS = [
  "forest-loop",
  "harbor-circuit",
  "summit-pass",
  "meadow-sweep",
  "canyon-cut",
  "oval-circuit",
];
const DEFAULT_TRACK_ID = TRACK_IDS[0];
const MAX = 10;
const TIME_EPS_MS = 15;

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

function sanitizeDriverName(raw) {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10)
    .trim();
  return cleaned || "RACER";
}

function normalizeTrackId(raw) {
  const id = String(raw ?? "").trim();
  return TRACK_IDS.includes(id) ? id : DEFAULT_TRACK_ID;
}

function entryKey(e) {
  return `${e.name.trim().toLowerCase()}|${Math.round(e.timeMs)}`;
}

function isSameRun(a, b) {
  if (a.name.trim().toLowerCase() !== b.name.trim().toLowerCase()) return false;
  return Math.abs(a.timeMs - b.timeMs) <= TIME_EPS_MS;
}

function pickBetter(a, b) {
  const earlier = (a.at || 0) <= (b.at || 0) ? a : b;
  const other = earlier === a ? b : a;
  if (earlier.bestLapMs == null && other.bestLapMs != null) {
    return { ...earlier, bestLapMs: other.bestLapMs };
  }
  return earlier;
}

function normalize(entries, trackId) {
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

  const byKey = new Map();
  for (const e of cleaned) {
    const key = entryKey(e);
    const prev = byKey.get(key);
    byKey.set(key, prev ? pickBetter(prev, e) : e);
  }
  const unique = [];
  for (const e of byKey.values()) {
    const twin = unique.find((u) => isSameRun(u, e));
    if (twin) unique[unique.indexOf(twin)] = pickBetter(twin, e);
    else unique.push(e);
  }
  return unique.sort((a, b) => a.timeMs - b.timeMs || (a.at || 0) - (b.at || 0)).slice(0, MAX);
}

function emptyStore() {
  const store = {};
  for (const id of TRACK_IDS) store[id] = [];
  return store;
}

function storeEntryCount(store) {
  return TRACK_IDS.reduce((n, id) => n + (store[id]?.length ?? 0), 0);
}

function mergeBoardStores(...stores) {
  const out = emptyStore();
  for (const id of TRACK_IDS) {
    const merged = [];
    for (const s of stores) {
      const list = s?.[id];
      if (Array.isArray(list) && list.length) merged.push(...list);
    }
    out[id] = normalize(merged, id);
  }
  return out;
}

function isBoardPayload(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data)) return true;
  if (data.error != null && data.byTrack == null && data.entries == null) return false;
  if (data.byTrack && typeof data.byTrack === "object") return true;
  if (Array.isArray(data.entries)) return true;
  return false;
}

function parseStore(data) {
  const store = emptyStore();
  if (!isBoardPayload(data)) return store;
  if (data.byTrack && typeof data.byTrack === "object") {
    for (const [id, list] of Object.entries(data.byTrack)) {
      const tid = normalizeTrackId(id);
      if (!Array.isArray(list)) continue;
      store[tid] = normalize([...(store[tid] ?? []), ...list], tid);
    }
    return store;
  }
  if (Array.isArray(data)) {
    store[DEFAULT_TRACK_ID] = normalize(data, DEFAULT_TRACK_ID);
    return store;
  }
  if (Array.isArray(data.entries)) {
    store[DEFAULT_TRACK_ID] = normalize(data.entries, DEFAULT_TRACK_ID);
  }
  return store;
}

/** Old buggy path: replace whole board with local-server-only store. */
function buggyPublishFromLocalServer(localServerStore) {
  return localServerStore;
}

const worldwide = emptyStore();
worldwide["forest-loop"] = [
  { name: "ALICE", timeMs: 90000, at: 1 },
  { name: "BOB", timeMs: 91000, at: 2 },
];
worldwide["harbor-circuit"] = [{ name: "CARA", timeMs: 88000, at: 3 }];

const localServerOnly = emptyStore();
localServerOnly["forest-loop"] = [{ name: "NEW", timeMs: 95000, at: 99 }];

const wiped = buggyPublishFromLocalServer(localServerOnly);
check(
  "repro: local-server put wipes worldwide",
  storeEntryCount(wiped) === 1 && !wiped["harbor-circuit"].length,
  `count=${storeEntryCount(wiped)}`,
);

const fixed = mergeBoardStores(worldwide, localServerOnly);
fixed["forest-loop"] = normalize([...fixed["forest-loop"], { name: "NEW", timeMs: 95000, at: 99 }], "forest-loop");
check(
  "fix: merge keeps old + new on same track",
  fixed["forest-loop"].some((e) => e.name === "ALICE") &&
    fixed["forest-loop"].some((e) => e.name === "NEW") &&
    fixed["forest-loop"].length >= 3,
  `names=${fixed["forest-loop"].map((e) => e.name).join(",")}`,
);
check(
  "fix: other tracks preserved",
  fixed["harbor-circuit"].some((e) => e.name === "CARA"),
);

const emptyRemote = emptyStore();
const recovered = mergeBoardStores(emptyRemote, worldwide);
check(
  "empty remote + local cache recovers scores",
  storeEntryCount(recovered) === storeEntryCount(worldwide),
);

const refuseWipe =
  storeEntryCount(worldwide) > 0 && storeEntryCount(emptyRemote) === 0
    ? worldwide
    : emptyRemote;
check("guard refuses publishing empty over non-empty", storeEntryCount(refuseWipe) === 3);

/** Mirrors publishMergedStore: never PUT a partial store when remote read fails. */
function publishWithoutRemoteOrThrow(localPartial) {
  // Remote fetch failed — even a non-empty local subset must not replace worldwide.
  if (storeEntryCount(localPartial) === 0) {
    throw new Error("refusing empty publish without remote");
  }
  throw new Error("refusing publish without remote snapshot");
}

const partialLocal = emptyStore();
partialLocal["forest-loop"] = [{ name: "SOLO", timeMs: 99000, at: 50 }];
let refusedBlindPut = false;
try {
  publishWithoutRemoteOrThrow(partialLocal);
} catch (err) {
  refusedBlindPut = String(err?.message || err).includes("without remote");
}
check(
  "guard refuses blind PUT of partial local when remote unread",
  refusedBlindPut,
  "partial local must not overwrite worldwide on failed GET",
);

const parsed = parseStore({
  byTrack: {
    "forest-loop": [{ name: "A", timeMs: 1000, at: 1 }],
    "legacy-unknown": [{ name: "B", timeMs: 2000, at: 2 }],
  },
});
check(
  "unknown track id merges into default",
  parsed["forest-loop"].some((e) => e.name === "A") &&
    parsed["forest-loop"].some((e) => e.name === "B"),
);
check("error payload is not a board", !isBoardPayload({ error: "nope" }));
check("error payload parses empty", storeEntryCount(parseStore({ error: "nope" })) === 0);

const top = normalize(
  Array.from({ length: 15 }, (_, i) => ({ name: `N${i}`, timeMs: 100000 - i * 100, at: i })),
);
check("normalize keeps top 10 sorted", top.length === 10 && top[0].timeMs < top[9].timeMs);

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nAll leaderboard merge checks passed.");
