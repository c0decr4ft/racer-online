/**
 * Regression: friend-request mutations (esp. unfriend) require a signed auth
 * event so durable REMOVE cannot be forged by pubkey alone.
 * Run: node scripts/verify-friend-request-auth.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import {
  FRIEND_AUTH_D_TAG,
  FRIEND_AUTH_KIND,
  verifyFriendAuthEvent,
} from "../server/friendAuth.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function authTemplate(action = "unfriend") {
  return {
    kind: FRIEND_AUTH_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({ action, at: Date.now() }),
    tags: [
      ["d", FRIEND_AUTH_D_TAG],
      ["t", "racer-online"],
    ],
  };
}

{
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const event = finalizeEvent(authTemplate("unfriend"), sk);
  assert.equal(verifyFriendAuthEvent(event, pk), true);

  const other = getPublicKey(generateSecretKey());
  assert.throws(() => verifyFriendAuthEvent(event, other), (err) => err?.status === 403);

  assert.throws(() => verifyFriendAuthEvent(null, pk), (err) =>
    String(err?.message || "").includes("signed auth"),
  );

  const stale = finalizeEvent(
    { ...authTemplate("unfriend"), created_at: Math.floor(Date.now() / 1000) - 10_000 },
    sk,
  );
  assert.throws(() => verifyFriendAuthEvent(stale, pk), (err) => err?.message?.includes("stale"));

  const wrongTag = finalizeEvent(
    {
      ...authTemplate("unfriend"),
      tags: [
        ["d", "racer-online:lobby-invites"],
        ["t", "racer-online"],
      ],
    },
    sk,
  );
  assert.throws(() => verifyFriendAuthEvent(wrongTag, pk), (err) =>
    String(err?.message || "").includes("wrong auth tag"),
  );
}

{
  // Server wires auth before request/accept/unfriend (not sync).
  const src = readFileSync(join(ROOT, "server/index.mjs"), "utf8");
  assert.match(src, /import \{ verifyFriendAuthEvent \} from "\.\/friendAuth\.mjs"/);
  assert.match(src, /verifyFriendAuthEvent\(data\.event, from\)/);
  assert.match(src, /action === "unfriend"/);
  // Sync stays unsigned so poll heal does not spam NIP-07 prompts.
  assert.match(
    src,
    /Sync stays unsigned \(poll heal; cannot sever\)/,
    "server comment must document unsigned sync",
  );
  const syncIdx = src.indexOf('if (action === "sync")');
  const authGateIdx = src.indexOf("verifyFriendAuthEvent(data.event, from)");
  assert.ok(syncIdx >= 0 && authGateIdx > syncIdx, "auth gate must follow sync branch");
  const syncBranch = src.slice(syncIdx, authGateIdx);
  assert.ok(!/verifyFriendAuthEvent/.test(syncBranch), "sync branch must not verify auth");
}

{
  // Client signs mutations; unfriend posts the event.
  const api = readFileSync(join(ROOT, "src/social/friendRequestsApi.ts"), "utf8");
  assert.match(api, /FRIEND_AUTH_D_TAG = "racer-online:friend-requests"/);
  assert.match(api, /signFriendAuth\(action\)/);
  assert.match(api, /event,/);
  assert.match(api, /postFriendUnfriend/);
}

console.log("verify-friend-request-auth: ok");
