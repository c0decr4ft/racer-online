/**
 * Targeted lobby invites — durable rows + per-pubkey inbox keys.
 *
 * Room passwords must never be returned without proving inbox ownership.
 * Clients register a random inbox key once with a signed Nostr event, then
 * poll/ack with that key (no per-poll signing / extension prompts).
 */
import { createHash, randomBytes } from "node:crypto";
import { verifyEvent } from "nostr-tools";

export const LOBBY_INVITE_MAX = 2_000;
export const LOBBY_INVITE_TTL_MS = 2 * 60 * 60 * 1000;
export const LOBBY_AUTH_KIND = 30078;
export const LOBBY_AUTH_D_TAG = "racer-online:lobby-invites";
export const LOBBY_AUTH_MAX_AGE_S = 600;

export function normalizePubkeyHex(raw) {
  const hex = String(raw ?? "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

export function normalizeInboxKey(raw) {
  const hex = String(raw ?? "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

export function hashInboxKey(key) {
  const k = normalizeInboxKey(key);
  if (!k) return "";
  return createHash("sha256").update(`lobby-inbox:${k}`).digest("hex");
}

export function generateInboxKey() {
  return randomBytes(32).toString("hex");
}

export function emptyLobbyInvites() {
  return { invites: [], inboxes: {} };
}

function sanitizeRoom(raw) {
  return String(raw || "")
    .replace(/[^\w\- ]/g, "")
    .trim()
    .slice(0, 24);
}

function sanitizeName(raw) {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .trim();
  return cleaned || "RACER";
}

export function normalizeLobbyInvites(data) {
  const store = emptyLobbyInvites();
  if (!data || typeof data !== "object") return store;
  const list = Array.isArray(data.invites) ? data.invites : [];
  const now = Date.now();
  const byId = new Map();
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const from = normalizePubkeyHex(row.from);
    const to = normalizePubkeyHex(row.to);
    if (!from || !to || from === to) continue;
    const room = sanitizeRoom(row.room);
    if (!room) continue;
    const at = typeof row.at === "number" && Number.isFinite(row.at) ? Math.round(row.at) : now;
    if (now - at > LOBBY_INVITE_TTL_MS) continue;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim().slice(0, 80)
        : `${from.slice(0, 8)}-${to.slice(0, 8)}-${at}-${room}`;
    byId.set(id, {
      id,
      from,
      to,
      fromName: sanitizeName(row.fromName),
      room,
      password: String(row.password || "").slice(0, 32),
      trackId: typeof row.trackId === "string" ? row.trackId.slice(0, 40) : "",
      at,
    });
  }
  store.invites = [...byId.values()].sort((a, b) => b.at - a.at).slice(0, LOBBY_INVITE_MAX);

  const inboxes = data.inboxes && typeof data.inboxes === "object" ? data.inboxes : {};
  for (const [pkRaw, row] of Object.entries(inboxes)) {
    const pk = normalizePubkeyHex(pkRaw);
    if (!pk || !row || typeof row !== "object") continue;
    const keyHash =
      typeof row.keyHash === "string" && /^[0-9a-f]{64}$/.test(row.keyHash.trim().toLowerCase())
        ? row.keyHash.trim().toLowerCase()
        : "";
    if (!keyHash) continue;
    const at = typeof row.at === "number" && Number.isFinite(row.at) ? Math.round(row.at) : now;
    store.inboxes[pk] = { keyHash, at };
  }
  return store;
}

/** True when inboxKey matches the registered hash for pubkey. */
export function inboxKeyAuthorized(store, pubkey, inboxKey) {
  const pk = normalizePubkeyHex(pubkey);
  const key = normalizeInboxKey(inboxKey);
  if (!pk || !key) return false;
  const row = store?.inboxes?.[pk];
  if (!row || typeof row.keyHash !== "string") return false;
  return row.keyHash === hashInboxKey(key);
}

export function upsertInboxKey(store, pubkey, inboxKey, at = Date.now()) {
  const pk = normalizePubkeyHex(pubkey);
  const key = normalizeInboxKey(inboxKey);
  const keyHash = hashInboxKey(key);
  if (!pk || !keyHash) return store;
  const next = normalizeLobbyInvites(store);
  next.inboxes[pk] = { keyHash, at };
  return next;
}

export function lobbyInvitesForPubkey(store, pubkey) {
  const pk = normalizePubkeyHex(pubkey);
  if (!pk) return [];
  const body = normalizeLobbyInvites(store);
  return body.invites
    .filter((r) => r.to === pk)
    .map((r) => ({
      id: r.id,
      from: r.from,
      fromName: r.fromName,
      room: r.room,
      password: r.password,
      trackId: r.trackId,
      at: r.at,
    }));
}

/**
 * Verify a signed lobby-auth event for expectedPubkey.
 * Throws { status, message } on failure (same shape as verifyDevEvent).
 */
export function verifyLobbyAuthEvent(event, expectedPubkey, nowS = Math.floor(Date.now() / 1000)) {
  const expected = normalizePubkeyHex(expectedPubkey);
  if (!expected) throw { status: 400, message: "bad pubkey" };
  if (!event || typeof event !== "object") throw { status: 400, message: "signed auth event required" };
  if (event.kind !== LOBBY_AUTH_KIND) throw { status: 400, message: "wrong event kind" };
  const pubkey = normalizePubkeyHex(event.pubkey);
  if (!pubkey || pubkey !== expected) throw { status: 403, message: "auth pubkey mismatch" };
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const d = tags.find((t) => Array.isArray(t) && t[0] === "d")?.[1] ?? "";
  if (d !== LOBBY_AUTH_D_TAG) throw { status: 400, message: "wrong auth tag" };
  const createdAt = Number(event.created_at);
  if (!Number.isFinite(createdAt) || Math.abs(nowS - createdAt) > LOBBY_AUTH_MAX_AGE_S) {
    throw { status: 400, message: "stale auth event — retry" };
  }
  try {
    if (!verifyEvent(event)) throw new Error("bad sig");
  } catch {
    throw { status: 400, message: "invalid signature" };
  }
  return true;
}
