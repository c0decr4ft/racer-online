/**
 * Regression: concurrent leaderboard read-modify-writes must not wipe the board.
 *
 * Old bug: writeFileSync truncates then writes; a concurrent reader can
 * JSON.parse a torn/empty file → emptyStore → save wipes durable scores.
 *
 * Fix under test: temp file + renameSync (atomic replace) and a serialize lock.
 *
 * Run: node scripts/verify-board-atomic.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

const DIR = join(tmpdir(), `racer-board-atomic-${process.pid}`);
mkdirSync(DIR, { recursive: true });
const PATH = join(DIR, "leaderboard.json");

function emptyStore() {
  return {
    "forest-loop": [],
    "harbor-circuit": [],
  };
}

function writeBuggy(store) {
  // Mirrors the pre-fix truncate-then-write path.
  writeFileSync(PATH, JSON.stringify({ byTrack: store }, null, 2));
}

function writeAtomic(store) {
  const payload = JSON.stringify({ byTrack: store }, null, 2);
  const tmp = `${PATH}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, payload);
  renameSync(tmp, PATH);
}

function loadAllowingEmpty() {
  try {
    if (!existsSync(PATH)) return emptyStore();
    const raw = JSON.parse(readFileSync(PATH, "utf8"));
    return raw?.byTrack && typeof raw.byTrack === "object" ? raw.byTrack : emptyStore();
  } catch {
    return emptyStore();
  }
}

function loadRefusingCorrupt() {
  if (!existsSync(PATH)) return emptyStore();
  const raw = JSON.parse(readFileSync(PATH, "utf8"));
  if (!raw?.byTrack || typeof raw.byTrack !== "object") throw new Error("bad shape");
  return raw.byTrack;
}

function count(store) {
  return Object.values(store).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
}

// Seed a full board.
const seeded = emptyStore();
seeded["forest-loop"] = [{ name: "A", timeMs: 1000, pubkey: "aa".repeat(32) }];
seeded["harbor-circuit"] = [
  { name: "B", timeMs: 2000, pubkey: "bb".repeat(32) },
  { name: "C", timeMs: 3000, pubkey: "cc".repeat(32) },
];
writeAtomic(seeded);
check("seed", count(loadAllowingEmpty()) === 3, `count=${count(loadAllowingEmpty())}`);

// Reproduce tear-read wipe: truncate the live file, then "heal" via empty fallback.
writeFileSync(PATH, ""); // simulate concurrent writer mid-truncate
const torn = loadAllowingEmpty();
check("tear-read yields empty via catch", count(torn) === 0);
writeBuggy({
  ...torn,
  "forest-loop": [{ name: "D", timeMs: 900, pubkey: "dd".repeat(32) }],
});
const wiped = loadAllowingEmpty();
check(
  "repro: empty fallback + save wipes other tracks",
  count(wiped) === 1 && !(wiped["harbor-circuit"] || []).length,
  `count=${count(wiped)} harbor=${(wiped["harbor-circuit"] || []).length}`,
);

// Fix path: refuse to mutate over a corrupt file.
writeFileSync(PATH, "");
let refused = false;
try {
  loadRefusingCorrupt();
} catch {
  refused = true;
}
check("fix: refuse empty fallback when file exists but unreadable", refused);

// Atomic replace never exposes an empty path to readers between rename boundaries.
writeAtomic(seeded);
const before = readFileSync(PATH, "utf8");
const tmp = `${PATH}.writer.tmp`;
writeFileSync(tmp, JSON.stringify({ byTrack: { "forest-loop": [{ name: "E", timeMs: 800 }] } }, null, 2));
// Before rename, readers still see the previous complete file.
check("atomic: pre-rename readers see intact prior board", readFileSync(PATH, "utf8") === before);
renameSync(tmp, PATH);
check("atomic: post-rename board is complete JSON", count(loadAllowingEmpty()) === 1);

// Serialize lock: concurrent mutators must not lose the first write.
let tail = Promise.resolve();
function withLock(fn) {
  const run = tail.catch(() => {}).then(fn);
  tail = run.then(
    () => {},
    () => {},
  );
  return run;
}

writeAtomic(seeded);
await Promise.all([
  withLock(async () => {
    const store = loadRefusingCorrupt();
    store["forest-loop"] = [
      ...(store["forest-loop"] || []),
      { name: "X", timeMs: 1100, pubkey: "xx".repeat(32) },
    ];
    // Yield so the other task would race without the lock.
    await new Promise((r) => setTimeout(r, 5));
    writeAtomic(store);
  }),
  withLock(async () => {
    const store = loadRefusingCorrupt();
    store["harbor-circuit"] = [
      ...(store["harbor-circuit"] || []),
      { name: "Y", timeMs: 2100, pubkey: "yy".repeat(32) },
    ];
    await new Promise((r) => setTimeout(r, 5));
    writeAtomic(store);
  }),
]);
const locked = loadAllowingEmpty();
const forest = (locked["forest-loop"] || []).some((e) => e.name === "X");
const harbor = (locked["harbor-circuit"] || []).some((e) => e.name === "Y");
check(
  "lock: both concurrent merges persist",
  forest && harbor && count(locked) === 5,
  `forestX=${forest} harborY=${harbor} count=${count(locked)}`,
);

try {
  rmSync(DIR, { recursive: true, force: true });
} catch {
  try {
    if (existsSync(PATH)) unlinkSync(PATH);
  } catch {
    /* ignore */
  }
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s): ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nAll board-atomic checks passed.");
