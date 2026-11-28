#!/usr/bin/env node
/**
 * Regression: stale-tab CREATE ACCOUNT must not burn another tab's local nsec
 * in `racer-nostr-session-v1`.
 *
 * Bug: createAccount() always persist()'d. Tab B (signed out, no storage sync)
 * could CREATE after Tab A already saved a local nsec and overwrite the only
 * copy. PR161 gates extension/bunker/QR but explicitly left createAccount
 * ungated — this is that complementary hole.
 *
 * Usage: node scripts/verify-create-foreign-local.mjs
 */
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sessionSrc = readFileSync(join(ROOT, "src/nostr/session.ts"), "utf8");
const uiSrc = readFileSync(join(ROOT, "src/nostr/ui.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(
  /function foreignLocalNsecInStorage/.test(sessionSrc) && /function assertCanReplaceLocalNsec/.test(sessionSrc),
  "session.ts must detect a foreign local nsec before createAccount persist",
);

assert(
  /export function createAccount[\s\S]*?assertCanReplaceLocalNsec\(\)[\s\S]*?persist\(\{ method: "local", nsec \}\)/.test(
    sessionSrc,
  ),
  "createAccount must assert before persist",
);

assert(/restoreSession/.test(uiSrc), "ui.ts must import/use restoreSession for stale-tab hydrate");
assert(
  /restoreSession\(\)/.test(uiSrc.split("export function openNostrModal")[1]?.slice(0, 1200) ?? ""),
  "openNostrModal must restoreSession when signed out",
);
assert(
  /restoreSession\(\)/.test(uiSrc.split("export async function ensureNostrLogin")[1]?.slice(0, 600) ?? "") ||
    /restoreSession\(\)/.test(uiSrc.split("export function ensureNostrLogin")[1]?.slice(0, 600) ?? ""),
  "ensureNostrLogin must restoreSession before opening modal",
);
assert(
  /createAccount\(\)[\s\S]*?restoreSession\(\)/.test(uiSrc.split("async function handleCreateGo")[1]?.slice(0, 1600) ?? ""),
  "handleCreateGo must adopt via restoreSession when createAccount refuses",
);

/** Mirror of the ownership check createAccount must use. */
function foreignLocalNsecInStorage(saved, current) {
  if (!saved || saved.method !== "local" || typeof saved.nsec !== "string") return false;
  if (current?.method === "local") {
    try {
      const decoded = nip19.decode(saved.nsec);
      if (decoded.type === "nsec" && getPublicKey(decoded.data) === current.pubkey) return false;
    } catch {
      /* foreign */
    }
  }
  return true;
}

function simulateCreate({ current, stored }) {
  if (foreignLocalNsecInStorage(stored, current)) {
    return { ok: false, stored };
  }
  return { ok: true, stored: { method: "local", nsec: "nsec1replacement" } };
}

const skA = generateSecretKey();
const nsecA = nip19.nsecEncode(skA);
const pubA = getPublicKey(skA);
const storedLocalA = { method: "local", nsec: nsecA };

// Stale signed-out tab must not CREATE over Tab A's local nsec.
const stale = simulateCreate({ current: null, stored: storedLocalA });
assert(stale.ok === false && stale.stored?.nsec === nsecA, "stale-tab CREATE must not burn foreign local nsec");

// Empty storage: CREATE ok.
const empty = simulateCreate({ current: null, stored: null });
assert(empty.ok === true, "CREATE into empty storage must succeed");

// Owning local tab may replace its own storage (edge re-create path).
const own = simulateCreate({
  current: { method: "local", pubkey: pubA },
  stored: storedLocalA,
});
assert(own.ok === true, "tab that owns the local nsec may create/replace");

console.log("verify-create-foreign-local: ok");
