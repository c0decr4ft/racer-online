#!/usr/bin/env node
/**
 * Regression: CREATE ACCOUNT must not burn / mismatch nsec.
 *
 * Bugs covered:
 * 1) Same-tab re-entry: handleCreateGo called createAccount() (immediate persist)
 *    then awaited publishProfileName (~4s). CREATE / BACK / Enter stayed live. A
 *    second create overwrote racer-nostr-session-v1 with nsec₂ while the first
 *    completion painted closed-over nsec₁ — user copies the orphaned key.
 *    Fix: createInFlight + disabled controls; skip paint if session pubkey changed;
 *    backup prefers getLocalSecret() when it matches the live session.
 *
 * 2) Cross-tab CREATE (PR159 regression): Tab A createAccount → persist nsec_A;
 *    Tab B createAccount → overwrite storage with nsec_B; Tab A's `current` still
 *    A. getLocalSecret() returned any saved.nsec without pubkey bind → backup
 *    painted nsec_B while Tab A still signed as A. Fix: getLocalSecret decodes
 *    and requires getPublicKey(nsec) === current.pubkey (else null → fall back to
 *    closed-over nsec).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uiSrc = readFileSync(join(root, "src/nostr/ui.ts"), "utf8");
const sessionSrc = readFileSync(join(root, "src/nostr/session.ts"), "utf8");

function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing function ${name}`);
  // Prefer async/export variants by scanning back a short distance.
  const bodyStart = src.indexOf("{", start);
  let depth = 0;
  for (let i = bodyStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${name}`);
}

const handleCreateGo = extractFunction(uiSrc, "handleCreateGo");
const getLocalSecret = extractFunction(sessionSrc, "getLocalSecret");

const checks = [
  {
    ok: /let createInFlight = false/.test(uiSrc) && /if \(createInFlight\) return/.test(handleCreateGo),
    msg: "handleCreateGo must early-return while createInFlight",
  },
  {
    ok: /setCreateControlsEnabled\(false\)/.test(handleCreateGo) && /createInFlight = true/.test(handleCreateGo),
    msg: "handleCreateGo must lock controls before createAccount",
  },
  {
    ok: /getSession\(\)\?\.pubkey !== session\.pubkey/.test(handleCreateGo),
    msg: "handleCreateGo must skip backup paint when session was replaced",
  },
  {
    ok: /getLocalSecret\(\)/.test(handleCreateGo),
    msg: "backup nsec must come from getLocalSecret (live storage), not only closed-over nsec",
  },
  {
    ok: /finally[\s\S]*createInFlight = false[\s\S]*setCreateControlsEnabled\(true\)/.test(handleCreateGo),
    msg: "handleCreateGo must unlock controls in finally",
  },
  {
    ok:
      /nip19\.decode\(saved\.nsec\)/.test(getLocalSecret) &&
      /getPublicKey\(decoded\.data\)\s*!==\s*current\.pubkey/.test(getLocalSecret),
    msg: "getLocalSecret must bind stored nsec to current.pubkey (cross-tab CREATE)",
  },
];

/** Minimal state machine: second create while publishing must be ignored. */
function simulateReentryGuard() {
  let createInFlight = false;
  let storageNsec = "";
  let backupShown = "";
  let creates = 0;

  async function handleCreateGoSim(label) {
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

  const a = handleCreateGoSim("nsec1");
  const b = handleCreateGoSim("nsec2"); // must no-op
  return Promise.all([a, b]).then(() => {
    if (creates !== 1) throw new Error(`expected 1 create, got ${creates}`);
    if (storageNsec !== "nsec1") throw new Error(`storage drifted to ${storageNsec}`);
    if (backupShown !== "nsec1") throw new Error(`backup showed ${backupShown}`);
  });
}

/**
 * Cross-tab CREATE: storage holds foreign nsec while this tab's session is local A.
 * getLocalSecret must return null so backup falls back to closed-over nsec_A.
 */
function simulateCrossTabGetLocalSecret() {
  const skA = generateSecretKey();
  const skB = generateSecretKey();
  const nsecA = nip19.nsecEncode(skA);
  const nsecB = nip19.nsecEncode(skB);
  const pubkeyA = getPublicKey(skA);

  // Mimic getLocalSecret after the pubkey-bind fix.
  function getLocalSecretBound(current, savedNsec) {
    if (current?.method !== "local") return null;
    if (typeof savedNsec !== "string") return null;
    try {
      const decoded = nip19.decode(savedNsec);
      if (decoded.type !== "nsec") return null;
      if (getPublicKey(decoded.data) !== current.pubkey) return null;
      return savedNsec;
    } catch {
      return null;
    }
  }

  const current = { method: "local", pubkey: pubkeyA };
  const foreign = getLocalSecretBound(current, nsecB);
  if (foreign !== null) throw new Error("foreign tab nsec must not be returned");
  const liveNsec = foreign ?? nsecA;
  if (liveNsec !== nsecA) throw new Error(`backup would show wrong key`);

  const matching = getLocalSecretBound(current, nsecA);
  if (matching !== nsecA) throw new Error("matching nsec must still be returned");
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

try {
  simulateCrossTabGetLocalSecret();
  console.log("ok: cross-tab CREATE falls back to session nsec (pubkey-bound getLocalSecret)");
} catch (err) {
  console.error(`FAIL: ${err.message || err}`);
  failed++;
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-create-account-reentry: PASS");
