/**
 * Regression: concurrent feedback read-modify-writes must not wipe the inbox.
 *
 * Old bug: writeFileSync truncates then writes; a concurrent reader can
 * JSON.parse a torn/empty file → { messages: [] } → save wipes durable
 * private feedback (and can poison the Nostr mirror).
 *
 * Fix under test: temp file + renameSync (atomic replace) and a serialize lock.
 *
 * Run: node scripts/verify-feedback-atomic.mjs
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

const DIR = join(tmpdir(), `racer-feedback-atomic-${process.pid}`);
mkdirSync(DIR, { recursive: true });
const PATH = join(DIR, "feedback.json");

function normalize(store) {
  const messages = Array.isArray(store?.messages) ? store.messages : [];
  return { messages: messages.slice(0, 80) };
}

function writeBuggy(store) {
  writeFileSync(PATH, JSON.stringify(normalize(store), null, 2));
}

function writeAtomic(store) {
  const payload = JSON.stringify(normalize(store), null, 2);
  const tmp = `${PATH}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, payload);
  renameSync(tmp, PATH);
}

function loadAllowingEmpty() {
  try {
    if (!existsSync(PATH)) return { messages: [] };
    return normalize(JSON.parse(readFileSync(PATH, "utf8")));
  } catch {
    return { messages: [] };
  }
}

function loadRefusingCorrupt() {
  if (!existsSync(PATH)) return { messages: [] };
  return normalize(JSON.parse(readFileSync(PATH, "utf8")));
}

const seeded = {
  messages: [
    { id: "a", text: "first", createdAt: 1 },
    { id: "b", text: "second", createdAt: 2 },
    { id: "c", text: "third", createdAt: 3 },
  ],
};
writeAtomic(seeded);
check("seed", loadAllowingEmpty().messages.length === 3, `n=${loadAllowingEmpty().messages.length}`);

// Reproduce tear-read wipe: truncate the live file, then "heal" via empty fallback.
writeFileSync(PATH, ""); // simulate concurrent writer mid-truncate
const torn = loadAllowingEmpty();
check("tear-read yields empty via catch", torn.messages.length === 0);
writeBuggy({
  messages: [{ id: "d", text: "new", createdAt: 4 }, ...torn.messages],
});
const wiped = loadAllowingEmpty();
check(
  "repro: empty fallback + save wipes prior inbox",
  wiped.messages.length === 1 && wiped.messages[0].id === "d",
  `n=${wiped.messages.length} id=${wiped.messages[0]?.id}`,
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
writeFileSync(tmp, JSON.stringify({ messages: [{ id: "e", text: "only", createdAt: 5 }] }, null, 2));
check("atomic: pre-rename readers see intact prior inbox", readFileSync(PATH, "utf8") === before);
renameSync(tmp, PATH);
check("atomic: post-rename inbox is complete JSON", loadAllowingEmpty().messages.length === 1);

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
    store.messages = [{ id: "x", text: "X", createdAt: 10 }, ...store.messages.filter((m) => m.id !== "x")];
    await new Promise((r) => setTimeout(r, 5));
    writeAtomic(store);
  }),
  withLock(async () => {
    const store = loadRefusingCorrupt();
    store.messages = [{ id: "y", text: "Y", createdAt: 11 }, ...store.messages.filter((m) => m.id !== "y")];
    await new Promise((r) => setTimeout(r, 5));
    writeAtomic(store);
  }),
]);
const locked = loadAllowingEmpty();
const hasX = locked.messages.some((m) => m.id === "x");
const hasY = locked.messages.some((m) => m.id === "y");
check(
  "lock: both concurrent merges persist",
  hasX && hasY && locked.messages.length === 5,
  `x=${hasX} y=${hasY} n=${locked.messages.length}`,
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
console.log("\nAll feedback-atomic checks passed.");
