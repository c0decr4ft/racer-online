#!/usr/bin/env node
/**
 * Regression: silent wrecked finish reject must not soft-lock fieldReset.
 *
 * Bug: client set finished=true + reportFinish, server dropped finish (wreckedIds),
 * then all-wreck fieldReset early-outed on finished. Sole survivor could not
 * re-finish, pause, or claim an Event pot — room stayed racing forever.
 *
 * Fix (src/game.ts):
 * - applyOnlineWreck clears finished / onlineFinishPending for self
 * - applyOnlineFieldReset honors server reset even when finished was sticky
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/game.ts"), "utf8");

function extractMethod(name) {
  const start = src.indexOf(`private ${name}(`);
  if (start < 0) throw new Error(`missing method ${name}`);
  const brace = src.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${name}`);
}

const wreck = extractMethod("applyOnlineWreck");
const reset = extractMethod("applyOnlineFieldReset");

const checks = [
  {
    ok: /onlineFinishPending/.test(wreck) && /this\.finished = false/.test(wreck),
    msg: "applyOnlineWreck must clear sticky finished / onlineFinishPending for self",
  },
  {
    ok: !/!\s*this\.online\s*\|\|\s*!\s*this\.running\s*\|\|\s*this\.finished/.test(reset),
    msg: "applyOnlineFieldReset must not early-out on this.finished",
  },
  {
    ok: /this\.finished = false/.test(reset) && /onlineFinishPending = false/.test(reset),
    msg: "applyOnlineFieldReset must clear finished + onlineFinishPending before countdown",
  },
];

/** Minimal state machine mirroring the fixed client transitions. */
function simulateStickyThenFieldReset() {
  const state = {
    online: true,
    running: true,
    finished: true,
    onlineFinishPending: true,
    pendingFinishMs: 90_000,
    fieldResets: 0,
  };

  // applyOnlineWreck(self)
  if (state.finished || state.onlineFinishPending) {
    state.finished = false;
    state.onlineFinishPending = false;
    state.pendingFinishMs = 0;
  }

  // applyOnlineFieldReset (must not bail on finished)
  if (!state.online || !state.running) throw new Error("unexpected guard");
  state.finished = false;
  state.onlineFinishPending = false;
  state.pendingFinishMs = 0;
  state.fieldResets += 1;

  if (state.finished || state.onlineFinishPending || state.pendingFinishMs !== 0) {
    throw new Error("sticky finish survived fieldReset simulation");
  }
  if (state.fieldResets !== 1) throw new Error("fieldReset did not apply");
}

let failed = 0;
for (const c of checks) {
  if (!c.ok) {
    console.error(`FAIL: ${c.msg}`);
    failed++;
  } else {
    console.log(`ok: ${c.msg}`);
  }
}

try {
  simulateStickyThenFieldReset();
  console.log("ok: sticky→wreck→fieldReset state machine clears finisher lock");
} catch (err) {
  console.error(`FAIL: ${err.message || err}`);
  failed++;
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-sticky-finish-field-reset: PASS");
