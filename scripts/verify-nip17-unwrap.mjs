/**
 * Regression: NIP-17 gift-wrap unwrap must reject seals whose rumor.pubkey
 * does not match the seal signer (sender impersonation), and must never pass
 * a non-hex rumor.id into chat HTML (invite JOIN attribute XSS → nsec theft).
 *
 * Run: node scripts/verify-nip17-unwrap.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from "nostr-tools";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src/social/dm.ts"), "utf8");
const uiSrc = readFileSync(join(ROOT, "src/social/ui.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function normalizePubkey(raw) {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

/** Mirrors src/social/dm.ts `nip17SealMatchesRumor`. */
function nip17SealMatchesRumor(sealPubkey, rumorPubkey) {
  const seal = normalizePubkey(sealPubkey);
  const rumor = normalizePubkey(rumorPubkey);
  return !!seal && seal === rumor;
}

/** Mirrors src/social/dm.ts `safeEventId`. */
function safeEventId(raw) {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

assert(
  /export function nip17SealMatchesRumor/.test(src),
  "dm.ts must export nip17SealMatchesRumor",
);
assert(/export function safeEventId/.test(src), "dm.ts must export safeEventId");
assert(/verifyEvent\(seal\)/.test(src), "unwrapGiftWrap must verifyEvent(seal)");
assert(
  /nip17SealMatchesRumor\(seal\.pubkey,\s*rumor\.pubkey\)/.test(src),
  "unwrapGiftWrap must require seal.pubkey === rumor.pubkey",
);
assert(
  /const from = normalizePubkey\(seal\.pubkey\)/.test(src),
  "from must be attributed from seal.pubkey (not rumor alone)",
);
assert(
  !/const from = normalizePubkey\(rumor\.pubkey\)/.test(src),
  "must not trust rumor.pubkey alone for from",
);
assert(
  /safeEventId\(rumor\.id\)/.test(src),
  "unwrapGiftWrap must sanitize rumor.id before DmMessage.id",
);
assert(
  /data-invite-id="\$\{escapeHtml\(m\.id\)\}"/.test(uiSrc),
  "chat invite JOIN must escapeHtml message id in the attribute",
);

const aliceSk = generateSecretKey();
const alice = getPublicKey(aliceSk);
const attackerSk = generateSecretKey();
const attacker = getPublicKey(attackerSk);

assert(nip17SealMatchesRumor(alice, alice), "matching pubkeys accepted");
assert(!nip17SealMatchesRumor(attacker, alice), "mismatched pubkeys rejected");
assert(!nip17SealMatchesRumor("", alice), "empty seal rejected");
assert(!nip17SealMatchesRumor(attacker, "not-a-key"), "invalid rumor rejected");

// Attacker signs a valid seal but the inner rumor claims to be Alice.
const spoofRumor = {
  kind: 14,
  created_at: Math.floor(Date.now() / 1000),
  content: JSON.stringify({ type: "friend-accept", fromName: "Alice" }),
  tags: [["p", attacker]],
  pubkey: alice, // impersonation
};
const seal = finalizeEvent(
  {
    kind: 13,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify(spoofRumor), // plaintext stand-in; real path is nip44
    tags: [],
  },
  attackerSk,
);
assert(verifyEvent(seal), "attacker seal signature is valid");
assert(
  !nip17SealMatchesRumor(seal.pubkey, spoofRumor.pubkey),
  "spoofed friend-accept rumor must fail seal↔rumor match",
);

const legitId = "a".repeat(64);
assert(safeEventId(legitId) === legitId, "64-hex event id accepted");
assert(safeEventId(legitId.toUpperCase()) === legitId, "event id lowercased");
assert(
  !safeEventId(`"><img src=x onerror=alert(1)>`),
  "XSS payload must not pass as event id",
);
assert(!safeEventId(""), "empty id rejected");
assert(!safeEventId("abc"), "short id rejected");

console.log("verify-nip17-unwrap: ok");
