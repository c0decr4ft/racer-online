/**
 * Regression: friend-request Nostr hydrate must not wipe disk-local friendships.
 *
 * Pre-fix mergeFriendRequestStores unioned remote severed / newest-wins floods
 * into the durable store. With the committed default FEEDBACK_NOSTR_NSEC, anyone
 * could publish replaceable kind 30078 (d=racer-online:friend-requests); the
 * 15-minute hydrate then dropped real bonds and client heal-sync wiped lists.
 */
import assert from "node:assert/strict";
import {
  FRIEND_REQUEST_MAX,
  BURNED_FEEDBACK_NOSTR_NSEC,
  normalizeFriendRequests,
  mergeFriendRequestStores,
  mergeFriendRequestStoresPreferLocal,
  isBurnedFeedbackNostrKey,
  friendshipKey,
} from "../server/friendHydrate.mjs";

const now = 1_700_000_000_000;
const pk = (n) => n.toString(16).padStart(64, "0");

function bond(a, b, at = now - 1_000) {
  return { a: pk(a), b: pk(b), aName: `A${a}`, bName: `B${b}`, at };
}

function severed(a, b, at = now - 500) {
  return { a: pk(a), b: pk(b), at };
}

{
  // Future timestamps clamp — MAX_SAFE_INTEGER cannot win newest-wins forever.
  const n = normalizeFriendRequests(
    { friendships: [bond(1, 2, Number.MAX_SAFE_INTEGER)], pending: [], accepts: [], severed: [] },
    now,
  );
  assert.equal(n.friendships[0].at, now);
}

{
  assert.equal(isBurnedFeedbackNostrKey(BURNED_FEEDBACK_NOSTR_NSEC), true);
  assert.equal(isBurnedFeedbackNostrKey("00".repeat(32)), false);
}

{
  // Naive union: remote severed for an active local bond deletes it.
  const local = {
    friendships: [bond(1, 2), bond(3, 4)],
    pending: [],
    accepts: [],
    severed: [],
  };
  const remote = {
    friendships: [],
    pending: [],
    accepts: [],
    severed: [severed(1, 2), severed(3, 4)],
  };
  const naive = mergeFriendRequestStores(local, remote, now);
  assert.equal(naive.friendships.length, 0, "naive merge must reproduce severed wipe");
  assert.equal(naive.severed.length, 2);
}

{
  // Prefer-local: remote severed cannot delete disk-local friendships.
  const local = {
    friendships: [bond(1, 2), bond(3, 4)],
    pending: [],
    accepts: [],
    severed: [],
  };
  const remote = {
    friendships: [],
    pending: [],
    accepts: [],
    severed: [severed(1, 2), severed(3, 4), severed(5, 6)],
  };
  const merged = mergeFriendRequestStoresPreferLocal(local, remote, now);
  assert.equal(merged.friendships.length, 2, "local friendships must survive");
  const keys = new Set(merged.friendships.map((r) => friendshipKey(r.a, r.b)));
  assert.ok(keys.has(friendshipKey(pk(1), pk(2))));
  assert.ok(keys.has(friendshipKey(pk(3), pk(4))));
  // Remote severed for pairs we never knew can still land (cross-instance REMOVE).
  assert.ok(
    merged.severed.some((r) => friendshipKey(r.a, r.b) === friendshipKey(pk(5), pk(6))),
  );
  assert.ok(
    !merged.severed.some((r) => friendshipKey(r.a, r.b) === friendshipKey(pk(1), pk(2))),
    "remote severed must not stick over an active local bond",
  );
}

{
  // Newest-wins flood: naive drops older local bonds; prefer-local keeps them.
  const local = {
    friendships: Array.from({ length: 40 }, (_, i) => bond(i + 1, i + 1000, now - 1_000_000 - i)),
    pending: [],
    accepts: [],
    severed: [],
  };
  const remote = {
    friendships: Array.from({ length: FRIEND_REQUEST_MAX }, (_, i) =>
      bond(i + 10_000, i + 20_000, now - i),
    ),
    pending: [],
    accepts: [],
    severed: [],
  };
  const naive = mergeFriendRequestStores(local, remote, now);
  assert.equal(
    naive.friendships.filter((r) => Number.parseInt(r.a, 16) <= 40).length,
    0,
    "naive newest-wins flood must drop local bonds",
  );

  const merged = mergeFriendRequestStoresPreferLocal(local, remote, now);
  assert.equal(merged.friendships.length, FRIEND_REQUEST_MAX);
  const locals = merged.friendships.filter((r) => Number.parseInt(r.a, 16) <= 40);
  assert.equal(locals.length, 40, "all local friendships must survive hydrate");
}

{
  // Empty disk: remote restores (legitimate redeploy hydrate).
  const merged = mergeFriendRequestStoresPreferLocal(
    emptyLocal(),
    { friendships: [bond(1, 2)], pending: [], accepts: [], severed: [] },
    now,
  );
  assert.equal(merged.friendships.length, 1);
  assert.equal(merged.friendships[0].a, pk(1));
}

function emptyLocal() {
  return { friendships: [], pending: [], accepts: [], severed: [] };
}

console.log("verify-friend-hydrate: ok");
