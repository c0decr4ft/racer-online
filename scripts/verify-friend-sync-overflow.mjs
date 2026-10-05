/**
 * Regression: unsigned friend sync must not mass-wipe friendships via the
 * global FRIEND_REQUEST_MAX cap + client heal-on-absence.
 *
 * Run: node scripts/verify-friend-sync-overflow.mjs
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FRIEND_REQUEST_MAX,
  applyFriendSync,
  emptyFriendRequests,
  friendRequestsForPubkey,
  normalizeFriendRequests,
  severFriendship,
  upsertFriendship,
} from "../server/friendRequests.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function pk() {
  return randomBytes(32).toString("hex");
}

{
  // Established bond survives a flood of newer forged pairs under the global cap.
  const alice = pk();
  const bob = pk();
  let store = emptyFriendRequests();
  store = upsertFriendship(store, alice, bob, "ALICE", "BOB", Date.now() - 60_000);
  assert.equal(store.friendships.length, 1);

  // Many distinct attacker identities (per-pubkey cap would stop a single key).
  for (let i = 0; i < FRIEND_REQUEST_MAX + 50; i++) {
    store = upsertFriendship(store, pk(), pk(), "ATK", `P${i}`, Date.now());
  }
  store = normalizeFriendRequests(store);
  assert.ok(store.friendships.length <= FRIEND_REQUEST_MAX);
  const stillFriends = store.friendships.some(
    (r) =>
      (r.a === alice && r.b === bob) || (r.a === bob && r.b === alice),
  );
  assert.equal(stillFriends, true, "legitimate older friendship must survive flood");
}

{
  // Unsigned sync cannot mint new friendships — only refresh existing names.
  const alice = pk();
  const bob = pk();
  const eve = pk();
  let store = emptyFriendRequests();
  store = upsertFriendship(store, alice, bob, "ALICE", "BOB", Date.now() - 10_000);
  store = applyFriendSync(store, {
    from: alice,
    fromName: "ALICE",
    outgoing: [],
    incoming: [],
    friends: [
      { pubkey: bob, name: "BOBBY", at: Date.now() },
      { pubkey: eve, name: "EVE", at: Number.MAX_SAFE_INTEGER },
    ],
  });
  const snap = friendRequestsForPubkey(store, alice);
  assert.equal(snap.friends.length, 1);
  assert.equal(snap.friends[0].pubkey, bob);
  assert.equal(snap.friends[0].name, "BOBBY");
  assert.equal(
    store.friendships.some((r) => r.a === eve || r.b === eve),
    false,
    "sync must not invent alice↔eve",
  );
}

{
  // Snapshot exposes severed so clients can wipe only real REMOVEs.
  const alice = pk();
  const bob = pk();
  let store = emptyFriendRequests();
  store = upsertFriendship(store, alice, bob, "ALICE", "BOB", Date.now());
  store = severFriendship(store, alice, bob, Date.now());
  const snap = friendRequestsForPubkey(store, alice);
  assert.equal(snap.friends.length, 0);
  assert.equal(snap.severed.length, 1);
  assert.equal(snap.severed[0].pubkey, bob);
}

{
  // Client + server wiring.
  const indexSrc = readFileSync(join(ROOT, "server/index.mjs"), "utf8");
  assert.match(indexSrc, /applyFriendSync/);
  assert.match(indexSrc, /from "\.\/friendRequests\.mjs"/);

  const ui = readFileSync(join(ROOT, "src/social/ui.ts"), "utf8");
  assert.match(ui, /snap\.severed/);
  assert.doesNotMatch(
    ui,
    /drop local friends the server no longer lists/,
    "must not wipe on mere absence",
  );

  const api = readFileSync(join(ROOT, "src/social/friendRequestsApi.ts"), "utf8");
  assert.match(api, /severed:/);
}

console.log("verify-friend-sync-overflow: ok");
