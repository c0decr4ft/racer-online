#!/usr/bin/env node
/**
 * Regression: re-entrant CREATE ACCOUNT must not burn / mismatch nsec.
 *
 * Bug: handleCreateGo called createAccount() (immediate persist) then awaited
 * publishProfileName (~4s). CREATE / BACK / Enter stayed live. A second create
 * overwrote racer-nostr-session-v1 with nsec₂ while the first completion painted
 * closed-over nsec₁ on the backup screen — user copies the orphaned key.
 *
 * Fix (src/nostr/ui.ts):
 * - createInFlight + disabled controls while creating
 * - backup UI uses getLocalSecret() and skips paint if session pubkey changed
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/nostr/ui.ts"), "utf8");

function extractFunction(name) {
  const start = src.indexOf(`async function ${name}(`);
  if (start < 0) throw new Error(`missing function ${name}`);
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

const body = extractFunction("handleCreateGo");

const checks = [
  {
    ok: /let createInFlight = false/.test(src) && /if \(createInFlight\) return/.test(body),
    msg: "handleCreateGo must early-return while createInFlight",
  },
  {
    ok: /setCreateControlsEnabled\(false\)/.test(body) && /createInFlight = true/.test(body),
    msg: "handleCreateGo must lock controls before createAccount",
  },
  {
    ok: /getSession\(\)\?\.pubkey !== session\.pubkey/.test(body),
    msg: "handleCreateGo must skip backup paint when session was replaced",
  },
  {
    ok: /getLocalSecret\(\)/.test(body),
    msg: "backup nsec must come from getLocalSecret (live storage), not only closed-over nsec",
  },
  {
    ok: /finally[\s\S]*createInFlight = false[\s\S]*setCreateControlsEnabled\(true\)/.test(body),
    msg: "handleCreateGo must unlock controls in finally",
  },
];

/** Minimal state machine: second create while publishing must be ignored. */
function simulateReentryGuard() {
  let createInFlight = false;
  let storageNsec = "";
  let backupShown = "";
  let creates = 0;

  async function handleCreateGo(label) {
    if (createInFlight) return;
    createInFlight = true;
    try {
      creates += 1;
      storageNsec = label;
      await new Promise((r) => setTimeout(r, 20)); // publishProfileName
      if (storageNsec !== label) return; // session replaced
      backupShown = storageNsec;
    } finally {
      createInFlight = false;
    }
  }

  const a = handleCreateGo("nsec1");
  const b = handleCreateGo("nsec2"); // must no-op
  return Promise.all([a, b]).then(() => {
    if (creates !== 1) throw new Error(`expected 1 create, got ${creates}`);
    if (storageNsec !== "nsec1") throw new Error(`storage drifted to ${storageNsec}`);
    if (backupShown !== "nsec1") throw new Error(`backup showed ${backupShown}`);
  });
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
  await simulateReentryGuard();
  console.log("ok: re-entrant create state machine keeps a single live nsec");
} catch (err) {
  console.error(`FAIL: ${err.message || err}`);
  failed++;
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-create-account-reentry: PASS");
