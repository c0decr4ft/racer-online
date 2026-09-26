/**
 * Regression: Cashu pot/tip saves must be atomic, and unreadable custody files
 * must never be "healed" by writing emptyStore (that permanently burns sats).
 *
 * Old bug: writeFileSync truncates then writes; a crash/ENOSPC mid-write left
 * torn JSON. peekStore → null → appendPotLog/persist saved emptyStore over it.
 *
 * Run: node scripts/verify-cashu-atomic-save.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readFileSync as readSrc } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const paymentsSrc = readSrc(join(DIR, "..", "server", "payments.mjs"), "utf8");

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

check(
  "payments.mjs defines atomicWriteFileSync",
  /function atomicWriteFileSync\s*\(/.test(paymentsSrc),
);
check(
  "saveStore uses atomicWriteFileSync",
  /atomicWriteFileSync\s*\(\s*path\s*,/.test(paymentsSrc),
);
check(
  "appendPotLog refuses unreadable existing pot file",
  /refusing pot log write — unreadable custody file/.test(paymentsSrc) &&
    /!peeked && existsSync\(path\)/.test(paymentsSrc),
);
check(
  "persistPotProofs refuses corrupt pot file",
  /pot file corrupt — refusing to deposit/.test(paymentsSrc),
);
check(
  "sendTokenFromStore refuses corrupt wallet file",
  /wallet file corrupt — refusing to send/.test(paymentsSrc),
);
check(
  "tip receive paths refuse corrupt tip wallet",
  /tip wallet corrupt — refusing to deposit/.test(paymentsSrc),
);

/** Mirror of the buggy appendPotLog heal. */
function buggyAppendLog(path, peeked) {
  const store = peeked
    ? { mintUrl: "https://mint.example", proofs: peeked.proofs, logs: [] }
    : { mintUrl: "https://mint.example", proofs: [], logs: [] };
  store.logs.push({ at: Date.now(), level: "info", msg: "buy-in paid" });
  writeFileSync(path, JSON.stringify(store, null, 2));
  return store;
}

function fixedAppendLog(path, peeked) {
  if (!peeked && existsSync(path)) {
    return { refused: true };
  }
  const store = peeked
    ? { mintUrl: "https://mint.example", proofs: peeked.proofs, logs: [] }
    : { mintUrl: "https://mint.example", proofs: [], logs: [] };
  store.logs.push({ at: Date.now(), level: "info", msg: "buy-in paid" });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, path);
  return { refused: false, store };
}

const work = join(tmpdir(), `racer-cashu-atomic-${process.pid}`);
mkdirSync(work, { recursive: true });
const potPath = join(work, "pot.json");

try {
  const seeded = {
    mintUrl: "https://mint.example",
    proofs: [{ id: "secret-proof", amount: "250", secret: "s", C: "c" }],
    logs: [],
  };
  writeFileSync(potPath, JSON.stringify(seeded, null, 2));

  // Simulate truncate mid-write (crash after open 'w').
  writeFileSync(potPath, "");
  let peeked = null;
  try {
    const raw = JSON.parse(readFileSync(potPath, "utf8"));
    peeked = Array.isArray(raw?.proofs) ? raw : null;
  } catch {
    peeked = null;
  }
  check("tear-read yields null peek", peeked == null);

  buggyAppendLog(potPath, peeked);
  const wiped = JSON.parse(readFileSync(potPath, "utf8"));
  check(
    "repro: empty peek + appendPotLog wipes proofs",
    Array.isArray(wiped.proofs) && wiped.proofs.length === 0,
    `n=${wiped.proofs?.length}`,
  );

  // Restore torn file and show fixed path refuses.
  writeFileSync(potPath, "{not-json");
  const fixed = fixedAppendLog(potPath, null);
  check("fix: refuse log write over unreadable pot", fixed.refused === true);
  check(
    "fix: corrupt bytes still on disk after refuse",
    readFileSync(potPath, "utf8") === "{not-json",
  );

  // Atomic replace never exposes empty path between rename boundaries.
  writeFileSync(potPath, JSON.stringify(seeded, null, 2));
  const before = readFileSync(potPath, "utf8");
  const tmp = `${potPath}.writer.tmp`;
  writeFileSync(tmp, JSON.stringify({ mintUrl: "https://mint.example", proofs: [], logs: [] }, null, 2));
  check("atomic: pre-rename readers still see prior proofs", readFileSync(potPath, "utf8") === before);
  renameSync(tmp, potPath);
  const after = JSON.parse(readFileSync(potPath, "utf8"));
  check("atomic: post-rename is complete JSON", Array.isArray(after.proofs));
} finally {
  try {
    rmSync(work, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

if (failures.length) {
  console.error(`verify-cashu-atomic-save: FAIL (${failures.length})`);
  process.exitCode = 1;
} else {
  console.log("verify-cashu-atomic-save: PASS");
}
