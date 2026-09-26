/**
 * Regression: payouts.json saves must be atomic, and unreadable files must
 * never be "healed" by writing [] (that permanently burns tipToken custody).
 *
 * Old bug: writeFileSync truncates then writes; crash/ENOSPC left torn JSON.
 * recordPayout catch → list=[] → push → write wiped every uncollected tipToken
 * (often the sole copy after room teardown).
 *
 * Run: node scripts/verify-payouts-atomic-save.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const paymentsSrc = readFileSync(join(DIR, "..", "server", "payments.mjs"), "utf8");

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
  "recordPayout uses atomicWriteFileSync",
  /atomicWriteFileSync\s*\(\s*PAYOUTS_PATH/.test(paymentsSrc),
);
check(
  "savePayouts uses atomicWriteFileSync",
  /function savePayouts[\s\S]*?atomicWriteFileSync\s*\(\s*PAYOUTS_PATH/.test(paymentsSrc),
);
check(
  "recordPayout refuses corrupt payouts.json",
  /payouts\.json corrupt — refusing to append/.test(paymentsSrc),
);
check(
  "savePayouts refuses corrupt overwrite",
  /payouts\.json corrupt — refusing savePayouts overwrite/.test(paymentsSrc),
);
check(
  "readPayoutsFile treats non-array as corrupt",
  /function readPayoutsFile[\s\S]*?if\s*\(!Array\.isArray\(list\)\)\s*return\s*\{\s*ok:\s*false,\s*corrupt:\s*true\s*\}/.test(
    paymentsSrc,
  ),
);

/** Mirror of the buggy recordPayout heal. */
function buggyRecordPayout(path, record) {
  let list = [];
  try {
    if (existsSync(path)) list = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  list.push({ at: Date.now(), ...record });
  writeFileSync(path, JSON.stringify(list.slice(-200), null, 2));
  return list;
}

function fixedRecordPayout(path, record) {
  if (existsSync(path)) {
    try {
      const list = JSON.parse(readFileSync(path, "utf8"));
      if (!Array.isArray(list)) return { refused: true };
    } catch {
      return { refused: true };
    }
  }
  let list = [];
  try {
    if (existsSync(path)) list = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { refused: true };
  }
  if (!Array.isArray(list)) return { refused: true };
  list.push({ at: Date.now(), ...record });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(list.slice(-200), null, 2));
  renameSync(tmp, path);
  return { refused: false, list };
}

const work = join(tmpdir(), `racer-payouts-atomic-${process.pid}`);
mkdirSync(work, { recursive: true });
const payoutsPath = join(work, "payouts.json");

try {
  const custody = {
    at: 1,
    room: "old-room",
    tipSats: 21,
    collected: false,
    tipToken: "cashuAsecret-custody-token",
    mock: false,
  };
  writeFileSync(payoutsPath, JSON.stringify([custody], null, 2));

  // Simulate truncate mid-write (crash after open 'w').
  writeFileSync(payoutsPath, "");
  let parsed = null;
  try {
    parsed = JSON.parse(readFileSync(payoutsPath, "utf8"));
  } catch {
    parsed = null;
  }
  check("tear-read yields null parse", parsed == null);

  buggyRecordPayout(payoutsPath, {
    room: "new-room",
    tipSats: 1,
    tipToken: "cashuAnew",
    collected: false,
  });
  const wiped = JSON.parse(readFileSync(payoutsPath, "utf8"));
  check(
    "repro: empty parse + recordPayout wipes prior tipToken",
    Array.isArray(wiped) &&
      wiped.length === 1 &&
      !wiped.some((r) => r.tipToken === custody.tipToken),
    `n=${wiped.length}`,
  );

  // Restore torn file and show fixed path refuses.
  writeFileSync(payoutsPath, "{not-json");
  const fixed = fixedRecordPayout(payoutsPath, {
    room: "new-room",
    tipSats: 1,
    tipToken: "cashuAnew",
    collected: false,
  });
  check("fix: refuse append over unreadable payouts.json", fixed.refused === true);
  check(
    "fix: corrupt bytes still on disk after refuse",
    readFileSync(payoutsPath, "utf8") === "{not-json",
  );

  // Atomic replace never exposes empty path between rename boundaries.
  writeFileSync(payoutsPath, JSON.stringify([custody], null, 2));
  const before = readFileSync(payoutsPath, "utf8");
  const tmp = `${payoutsPath}.writer.tmp`;
  writeFileSync(tmp, JSON.stringify([{ at: 2, tipToken: "cashuAother" }], null, 2));
  check("atomic: pre-rename readers still see prior tipToken", readFileSync(payoutsPath, "utf8") === before);
  renameSync(tmp, payoutsPath);
  const after = JSON.parse(readFileSync(payoutsPath, "utf8"));
  check("atomic: post-rename is complete JSON array", Array.isArray(after));
} finally {
  try {
    rmSync(work, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

if (failures.length) {
  console.error(`verify-payouts-atomic-save: FAIL (${failures.length})`);
  process.exitCode = 1;
} else {
  console.log("verify-payouts-atomic-save: PASS");
}
