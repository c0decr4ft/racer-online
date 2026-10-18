/**
 * Signed auth for /api/friend-requests mutations.
 *
 * Unfriend + heal-wipe must not be forgeable: without a signature anyone who
 * knows two pubkeys can sever the bond for 90 days and both clients drop it.
 */
import { verifyEvent } from "nostr-tools";

export const FRIEND_AUTH_KIND = 30078;
export const FRIEND_AUTH_D_TAG = "racer-online:friend-requests";
export const FRIEND_AUTH_MAX_AGE_S = 600;

export function normalizePubkeyHex(raw) {
  const hex = String(raw ?? "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

/**
 * Verify a signed friend-auth event for expectedPubkey.
 * Throws { status, message } on failure (same shape as verifyDevEvent).
 */
export function verifyFriendAuthEvent(event, expectedPubkey, nowS = Math.floor(Date.now() / 1000)) {
  const expected = normalizePubkeyHex(expectedPubkey);
  if (!expected) throw { status: 400, message: "bad pubkey" };
  if (!event || typeof event !== "object") throw { status: 400, message: "signed auth event required" };
  if (event.kind !== FRIEND_AUTH_KIND) throw { status: 400, message: "wrong event kind" };
  const pubkey = normalizePubkeyHex(event.pubkey);
  if (!pubkey || pubkey !== expected) throw { status: 403, message: "auth pubkey mismatch" };
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const d = tags.find((t) => Array.isArray(t) && t[0] === "d")?.[1] ?? "";
  if (d !== FRIEND_AUTH_D_TAG) throw { status: 400, message: "wrong auth tag" };
  const createdAt = Number(event.created_at);
  if (!Number.isFinite(createdAt) || Math.abs(nowS - createdAt) > FRIEND_AUTH_MAX_AGE_S) {
    throw { status: 400, message: "stale auth event — retry" };
  }
  try {
    if (!verifyEvent(event)) throw new Error("bad sig");
  } catch {
    throw { status: 400, message: "invalid signature" };
  }
  return true;
}
