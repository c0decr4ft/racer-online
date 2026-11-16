/**
 * Regression: logout in a stale tab must not clear `racer-nostr-session-v1`
 * when another tab has already persisted a different local nsec.
 *
 * Bug: logout() always called clearPersisted(), so:
 *   Tab1 creates local A → Tab2 creates local B (overwrites storage) →
 *   Tab1 Log out → B's nsec is deleted even though Tab1's in-memory session was A.
 *
 * Usage: node scripts/verify-logout-storage-ownership.mjs
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
  /function persistedMatchesSession/.test(sessionSrc) || /storage still belongs/.test(sessionSrc),
  "session.ts must gate clearPersisted on logout against the in-memory session",
);

assert(
  /export async function logout[\s\S]*?clearPersisted\(\)/.test(sessionSrc),
  "logout must still clear when storage matches",
);

/** Mirror of the ownership check logout must use before wiping storage. */
function persistedMatchesSession(saved, session) {
  if (!saved || !session) return false;
  if (saved.method !== session.method) return false;
  if (session.method === "nip07" || session.method === "nip46") {
    return typeof saved.pubkey === "string" && saved.pubkey === session.pubkey;
  }
  if (session.method === "local" && typeof saved.nsec === "string") {
    try {
      const decoded = nip19.decode(saved.nsec);
      if (decoded.type !== "nsec") return false;
      return getPublicKey(decoded.data) === session.pubkey;
    } catch {
      return false;
    }
  }
  return false;
}

function simulateLogout({ tabSession, stored }) {
  // Fixed behavior: only clear when persisted blob belongs to this tab's session.
  if (persistedMatchesSession(stored, tabSession)) {
    return null;
  }
  return stored;
}

const skA = generateSecretKey();
const skB = generateSecretKey();
const nsecA = nip19.nsecEncode(skA);
const nsecB = nip19.nsecEncode(skB);
const pubA = getPublicKey(skA);
const pubB = getPublicKey(skB);

const tab1 = { pubkey: pubA, method: "local" };
const storedAfterB = { method: "local", nsec: nsecB };

// Stale Tab1 logout must keep Tab2's nsec.
const afterStaleLogout = simulateLogout({ tabSession: tab1, stored: storedAfterB });
assert(afterStaleLogout?.nsec === nsecB, "stale-tab logout must not burn the other tab's local nsec");

// Matching logout still clears.
const tab2 = { pubkey: pubB, method: "local" };
const afterOwnLogout = simulateLogout({ tabSession: tab2, stored: storedAfterB });
assert(afterOwnLogout === null, "logout of the owning session must clear storage");

// nip07 mismatch must not clear a newer local nsec.
const afterNip07Logout = simulateLogout({
  tabSession: { pubkey: pubA, method: "nip07" },
  stored: storedAfterB,
});
assert(afterNip07Logout?.nsec === nsecB, "stale nip07 logout must not clear a local nsec");

// Same-pubkey nip07 logout clears.
const nip07Stored = { method: "nip07", pubkey: pubA };
assert(
  simulateLogout({ tabSession: { pubkey: pubA, method: "nip07" }, stored: nip07Stored }) === null,
  "matching nip07 logout clears",
);

void nsecA;
console.log("verify-logout-storage-ownership: ok");
