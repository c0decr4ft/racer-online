#!/usr/bin/env node
/**
 * Regression: stale-tab extension/bunker/QR persist must not burn another
 * tab's local nsec in `racer-nostr-session-v1`.
 *
 * Bug: loginWithExtension / loginWithBunker / startConnectLogin always
 * persist()'d on success. Tab B (signed out, no storage sync) could SIGN IN
 * after Tab A CREATE ACCOUNT and overwrite the only copy of A's nsec.
 * loginGeneration (PR154) is per-tab and does not stop this.
 *
 * Usage: node scripts/verify-login-persist-foreign-local.mjs
 */
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sessionSrc = readFileSync(join(ROOT, "src/nostr/session.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(
  /function foreignLocalNsecInStorage/.test(sessionSrc) && /function assertCanReplacePersisted/.test(sessionSrc),
  "session.ts must detect a foreign local nsec before non-create persist",
);

assert(
  /export async function loginWithExtension[\s\S]*?assertCanReplacePersisted\(\)[\s\S]*?persist\(\{ method: "nip07"/.test(
    sessionSrc,
  ),
  "loginWithExtension must assert before persist",
);

assert(
  /export async function loginWithBunker[\s\S]*?assertCanReplacePersisted\(\)[\s\S]*?persist\(\{ method: "nip46"/.test(
    sessionSrc,
  ),
  "loginWithBunker must assert before persist",
);

assert(
  /startConnectLogin[\s\S]*?assertCanReplacePersisted\(\)[\s\S]*?persist\(\{ method: "nip46"/.test(sessionSrc),
  "startConnectLogin wait must assert before persist",
);

assert(
  /export function createAccount[\s\S]*?persist\(\{ method: "local", nsec \}\)/.test(sessionSrc) &&
    !/export function createAccount[\s\S]*?assertCanReplacePersisted[\s\S]*?persist\(\{ method: "local"/.test(
      sessionSrc,
    ),
  "createAccount must still be allowed to replace storage (explicit new local key)",
);

/** Mirror of the ownership check login persist must use. */
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

function simulateRemotePersist({ current, stored }) {
  if (foreignLocalNsecInStorage(stored, current)) {
    return { ok: false, stored };
  }
  return { ok: true, stored: { method: "nip07", pubkey: "replacement" } };
}

const skA = generateSecretKey();
const skB = generateSecretKey();
const nsecA = nip19.nsecEncode(skA);
const nsecB = nip19.nsecEncode(skB);
const pubA = getPublicKey(skA);
const pubB = getPublicKey(skB);

const storedLocalA = { method: "local", nsec: nsecA };

// Stale signed-out tab must not overwrite Tab A's local nsec.
const stale = simulateRemotePersist({ current: null, stored: storedLocalA });
assert(stale.ok === false && stale.stored?.nsec === nsecA, "stale-tab login must not burn foreign local nsec");

// Owning local tab may replace its own storage (e.g. rare re-login path).
const own = simulateRemotePersist({
  current: { method: "local", pubkey: pubA },
  stored: storedLocalA,
});
assert(own.ok === true, "tab that owns the local nsec may replace persist");

// Empty storage: extension login ok.
const empty = simulateRemotePersist({ current: null, stored: null });
assert(empty.ok === true, "login into empty storage must succeed");

// Other local nsec in storage while this tab holds a different local session.
const other = simulateRemotePersist({
  current: { method: "local", pubkey: pubB },
  stored: storedLocalA,
});
assert(other.ok === false && other.stored?.nsec === nsecA, "must not overwrite a mismatched local nsec");

void nsecB;
console.log("verify-login-persist-foreign-local: ok");
