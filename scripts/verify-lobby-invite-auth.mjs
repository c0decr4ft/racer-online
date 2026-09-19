/**
 * Regression: lobby invite passwords must not leak without an inbox key.
 * Run: node scripts/verify-lobby-invite-auth.mjs
 */
import assert from "node:assert/strict";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import {
  emptyLobbyInvites,
  hashInboxKey,
  inboxKeyAuthorized,
  lobbyInvitesForPubkey,
  normalizeLobbyInvites,
  upsertInboxKey,
  verifyLobbyAuthEvent,
  LOBBY_AUTH_KIND,
  LOBBY_AUTH_D_TAG,
  generateInboxKey,
} from "../server/lobbyInvites.mjs";

function authTemplate(action = "register") {
  return {
    kind: LOBBY_AUTH_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({ action, at: Date.now() }),
    tags: [
      ["d", LOBBY_AUTH_D_TAG],
      ["t", "racer-online"],
    ],
  };
}

{
  // Hash is deterministic and not reversible to the key.
  const key = generateInboxKey();
  const h1 = hashInboxKey(key);
  const h2 = hashInboxKey(key);
  assert.equal(h1.length, 64);
  assert.equal(h1, h2);
  assert.notEqual(h1, key);
}

{
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const peer = getPublicKey(generateSecretKey());
  let store = emptyLobbyInvites();
  store.invites.push({
    id: "inv-1",
    from: peer,
    to: pk,
    fromName: "HOST",
    room: "secretpot",
    password: "s3cretPASS",
    trackId: "",
    at: Date.now(),
  });
  store = normalizeLobbyInvites(store);

  const rows = lobbyInvitesForPubkey(store, pk);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].password, "s3cretPASS");

  // Without registered inbox key → unauthorized (HTTP layer must 401).
  assert.equal(inboxKeyAuthorized(store, pk, generateInboxKey()), false);

  const inboxKey = generateInboxKey();
  store = upsertInboxKey(store, pk, inboxKey);
  assert.equal(inboxKeyAuthorized(store, pk, inboxKey), true);
  assert.equal(inboxKeyAuthorized(store, pk, generateInboxKey()), false);
  // Attacker pubkey cannot use victim's key binding.
  assert.equal(inboxKeyAuthorized(store, peer, inboxKey), false);
}

{
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const event = finalizeEvent(authTemplate("register"), sk);
  assert.equal(verifyLobbyAuthEvent(event, pk), true);

  const other = getPublicKey(generateSecretKey());
  assert.throws(() => verifyLobbyAuthEvent(event, other), (err) => err?.status === 403);

  const stale = finalizeEvent(
    { ...authTemplate("send"), created_at: Math.floor(Date.now() / 1000) - 10_000 },
    sk,
  );
  assert.throws(() => verifyLobbyAuthEvent(stale, pk), (err) => err?.message?.includes("stale"));
}

{
  // Persist round-trip keeps inbox hashes (not raw keys) and invite passwords on disk.
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const peer = getPublicKey(generateSecretKey());
  const inboxKey = generateInboxKey();
  let store = upsertInboxKey(emptyLobbyInvites(), pk, inboxKey);
  store.invites.push({
    id: "inv-2",
    from: peer,
    to: pk,
    fromName: "HOST",
    room: "pots",
    password: "pw",
    trackId: "forest-loop",
    at: Date.now(),
  });
  const json = JSON.stringify(normalizeLobbyInvites(store));
  assert.ok(!json.includes(inboxKey), "raw inbox key must never be persisted");
  assert.ok(json.includes("pw"), "password still stored server-side for authorized GET");
  const reloaded = normalizeLobbyInvites(JSON.parse(json));
  assert.equal(inboxKeyAuthorized(reloaded, pk, inboxKey), true);
  assert.equal(lobbyInvitesForPubkey(reloaded, pk)[0]?.password, "pw");
}

console.log("verify-lobby-invite-auth: ok");
