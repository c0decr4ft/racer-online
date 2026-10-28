/**
 * Regression: server loadStore must not remap removed/unknown byTrack keys
 * onto forest-loop (that truncated Forest PBs at MAX_BOARD).
 * Run: node scripts/verify-server-leaderboard-collapse.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

function emptyStore() {
  const store = {};
  for (const id of TRACK_IDS) store[id] = [];
  return store;
}

function sortBoard(entries) {
  return [...entries]
    .filter((e) => e && Number.isFinite(e.timeMs) && e.timeMs > 0)
    .sort((a, b) => a.timeMs - b.timeMs || (a.at || 0) - (b.at || 0))
    .slice(0, MAX);
}

/** Tip e2cac10 loadStore: unknown ids collapse onto forest-loop. */
function buggyLoadStore(raw) {
  const store = emptyStore();
  for (const [id, list] of Object.entries(raw.byTrack)) {
    const tid = TRACK_IDS.includes(id) ? id : DEFAULT_TRACK_ID;
    if (!Array.isArray(list)) continue;
    store[tid] = sortBoard([...(store[tid] || []), ...list]);
  }
  return store;
}

/** Skip unknown/removed keys — do not remap onto Forest. */
function fixedLoadStore(raw) {
  const store = emptyStore();
  for (const [id, list] of Object.entries(raw.byTrack)) {
    if (!TRACK_IDS.includes(id) || !Array.isArray(list)) continue;
    store[id] = sortBoard([...(store[id] || []), ...list]);
  }
  return store;
}

const forest = Array.from({ length: MAX }, (_, i) => ({
  name: `F${i}`,
  timeMs: 50_000 + i,
  at: i,
}));
const learner = Array.from({ length: MAX }, (_, i) => ({
  name: `L${i}`,
  timeMs: 1_000 + i,
  at: i,
}));

const raw = {
  byTrack: {
    "forest-loop": forest,
    "learner-loop": learner,
    "twin-lakes": [{ name: "T0", timeMs: 900, at: 0 }],
  },
};

const buggy = buggyLoadStore(raw);
assert.equal(buggy["forest-loop"].length, MAX);
assert.ok(
  buggy["forest-loop"].every((e) => e.name.startsWith("L") || e.name === "T0"),
  "repro: removed-track times occupy Forest MAX slots",
);
assert.ok(
  !buggy["forest-loop"].some((e) => e.name.startsWith("F")),
  "repro: real Forest PBs truncated away",
);

const fixed = fixedLoadStore(raw);
assert.equal(fixed["forest-loop"].length, MAX);
assert.ok(
  fixed["forest-loop"].every((e) => e.name.startsWith("F")),
  "fix: Forest PBs kept",
);
assert.equal((fixed["learner-loop"] || []).length, 0);
assert.equal((fixed["twin-lakes"] || []).length, 0);
assert.ok(!fixed["forest-loop"].some((e) => e.name.startsWith("L") || e.name === "T0"));

const src = readFileSync(new URL("../server/index.mjs", import.meta.url), "utf8");
assert.match(src, /function knownTrackId\(/);
const loadStore = src.match(/function loadStore\(\) \{[\s\S]*?\n\}/);
assert.ok(loadStore, "loadStore source present");
assert.match(loadStore[0], /knownTrackId\(id\)/);
assert.doesNotMatch(loadStore[0], /normalizeTrackId\(id\)/);
assert.doesNotMatch(
  loadStore[0],
  /Merge when legacy \/ unknown ids collapse/,
);

console.log("All server leaderboard collapse checks passed.");
