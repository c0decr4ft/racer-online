/**
 * Prefer-local merge for friend-request Nostr hydrate.
 *
 * The mirror key historically shipped as a committed default. Anyone who can
 * publish the replaceable `racer-online:friend-requests` event can flood
 * newest-wins friendships or inject `severed` rows; a naive union+normalize
 * then drops real bonds and client heal-sync wipes local friend lists.
 */

export const FRIEND_REQUEST_MAX = 2_000;
export const FRIEND_ACCEPT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const FRIEND_SEVERED_TTL_MS = 90 * 24 * 60 * 60 * 1000;
/** Allow small clock skew; reject MAX_SAFE_INTEGER poison stamps. */
export const FRIEND_AT_FUTURE_SKEW_MS = 10 * 60 * 1000;

/** Formerly hardcoded FEEDBACK_NOSTR_NSEC — public, must never hydrate/mirror. */
export const BURNED_FEEDBACK_NOSTR_NSEC =
  "2c9e8cbeee3f50bdd1cfe386babc361a7b68a76f2ce4aae111deef78f2df761d";

export function emptyFriendRequests() {
  return { pending: [], accepts: [], friendships: [], severed: [] };
}

export function friendshipKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function normalizePubkeyHex(raw) {
  const hex = String(raw ?? "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function sanitizePlayerName(raw) {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .trim();
  return cleaned || "RACER";
}

function clampAt(raw, now) {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : now;
  if (n > now + FRIEND_AT_FUTURE_SKEW_MS) return now;
  return n;
}

/**
 * @param {any} data
 * @param {number} [now]
 */
export function normalizeFriendRequests(data, now = Date.now()) {
  const store = emptyFriendRequests();
  if (!data || typeof data !== "object") return store;
  const pending = Array.isArray(data.pending) ? data.pending : [];
  const accepts = Array.isArray(data.accepts) ? data.accepts : [];
  const friendships = Array.isArray(data.friendships) ? data.friendships : [];
  const severed = Array.isArray(data.severed) ? data.severed : [];

  for (const row of pending) {
    if (!row || typeof row !== "object") continue;
    const from = normalizePubkeyHex(row.from);
    const to = normalizePubkeyHex(row.to);
    if (!from || !to || from === to) continue;
    store.pending.push({
      from,
      to,
      fromName: sanitizePlayerName(row.fromName),
      at: clampAt(row.at, now),
    });
  }
  for (const row of accepts) {
    if (!row || typeof row !== "object") continue;
    const from = normalizePubkeyHex(row.from);
    const to = normalizePubkeyHex(row.to);
    if (!from || !to || from === to) continue;
    const at = clampAt(row.at, now);
    if (now - at > FRIEND_ACCEPT_TTL_MS) continue;
    store.accepts.push({
      from,
      to,
      fromName: sanitizePlayerName(row.fromName),
      at,
    });
  }
  for (const row of friendships) {
    if (!row || typeof row !== "object") continue;
    const a = normalizePubkeyHex(row.a);
    const b = normalizePubkeyHex(row.b);
    if (!a || !b || a === b) continue;
    store.friendships.push({
      a,
      b,
      aName: sanitizePlayerName(row.aName),
      bName: sanitizePlayerName(row.bName),
      at: clampAt(row.at, now),
    });
  }
  for (const row of severed) {
    if (!row || typeof row !== "object") continue;
    const a = normalizePubkeyHex(row.a);
    const b = normalizePubkeyHex(row.b);
    if (!a || !b || a === b) continue;
    const at = clampAt(row.at, now);
    if (now - at > FRIEND_SEVERED_TTL_MS) continue;
    store.severed.push({ a, b, at });
  }

  const pendMap = new Map();
  for (const row of store.pending.sort((a, b) => a.at - b.at)) {
    pendMap.set(`${row.from}:${row.to}`, row);
  }
  store.pending = [...pendMap.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, FRIEND_REQUEST_MAX);
  store.accepts = store.accepts.sort((a, b) => b.at - a.at).slice(0, FRIEND_REQUEST_MAX);

  const friendMap = new Map();
  for (const row of store.friendships.sort((a, b) => a.at - b.at)) {
    friendMap.set(friendshipKey(row.a, row.b), row);
  }
  store.friendships = [...friendMap.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, FRIEND_REQUEST_MAX);

  const severMap = new Map();
  for (const row of store.severed.sort((a, b) => a.at - b.at)) {
    severMap.set(friendshipKey(row.a, row.b), row);
  }
  store.friendships = store.friendships.filter((r) => !severMap.has(friendshipKey(r.a, r.b)));
  store.severed = [...severMap.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, FRIEND_REQUEST_MAX);
  return store;
}

/** Naive union (legacy hydrate) — used only in regression fixtures. */
export function mergeFriendRequestStores(local, remote, now = Date.now()) {
  return normalizeFriendRequests(
    {
      pending: [...(local?.pending || []), ...(remote?.pending || [])],
      accepts: [...(local?.accepts || []), ...(remote?.accepts || [])],
      friendships: [...(local?.friendships || []), ...(remote?.friendships || [])],
      severed: [...(local?.severed || []), ...(remote?.severed || [])],
    },
    now,
  );
}

/**
 * Keep disk-local bonds through hydrate. Remote `severed` cannot delete an
 * active local friendship; caps fill local rows first, then remote-only.
 *
 * @param {any} local
 * @param {any} remote
 * @param {number} [now]
 */
export function mergeFriendRequestStoresPreferLocal(local, remote, now = Date.now()) {
  const localN = normalizeFriendRequests(local, now);
  const remoteN = normalizeFriendRequests(remote, now);

  const localFriendKeys = new Set(localN.friendships.map((r) => friendshipKey(r.a, r.b)));
  const localSeverKeys = new Set(localN.severed.map((r) => friendshipKey(r.a, r.b)));

  // Remote REMOVE cannot clobber a bond that still exists on disk locally.
  const remoteSeverSafe = remoteN.severed.filter(
    (r) => !localFriendKeys.has(friendshipKey(r.a, r.b)),
  );
  const remoteFriendsSafe = remoteN.friendships.filter(
    (r) => !localSeverKeys.has(friendshipKey(r.a, r.b)),
  );

  const friendMap = new Map();
  for (const r of localN.friendships) friendMap.set(friendshipKey(r.a, r.b), r);
  for (const r of remoteFriendsSafe.sort((a, b) => b.at - a.at)) {
    if (friendMap.size >= FRIEND_REQUEST_MAX) break;
    const k = friendshipKey(r.a, r.b);
    if (!friendMap.has(k)) friendMap.set(k, r);
  }

  const severMap = new Map();
  for (const r of localN.severed) severMap.set(friendshipKey(r.a, r.b), r);
  for (const r of remoteSeverSafe.sort((a, b) => b.at - a.at)) {
    if (severMap.size >= FRIEND_REQUEST_MAX) break;
    const k = friendshipKey(r.a, r.b);
    if (!severMap.has(k)) severMap.set(k, r);
  }

  const pendMap = new Map();
  for (const r of localN.pending) pendMap.set(`${r.from}:${r.to}`, r);
  for (const r of remoteN.pending.sort((a, b) => b.at - a.at)) {
    if (pendMap.size >= FRIEND_REQUEST_MAX) break;
    const k = `${r.from}:${r.to}`;
    if (!pendMap.has(k)) pendMap.set(k, r);
  }

  const acceptMap = new Map();
  for (const r of localN.accepts) acceptMap.set(`${r.from}:${r.to}`, r);
  for (const r of remoteN.accepts.sort((a, b) => b.at - a.at)) {
    if (acceptMap.size >= FRIEND_REQUEST_MAX) break;
    const k = `${r.from}:${r.to}`;
    if (!acceptMap.has(k)) acceptMap.set(k, r);
  }

  // Apply merged severed to friendships (local sever still wins).
  const friendships = [...friendMap.values()].filter(
    (r) => !severMap.has(friendshipKey(r.a, r.b)),
  );

  return normalizeFriendRequests(
    {
      pending: [...pendMap.values()],
      accepts: [...acceptMap.values()],
      friendships,
      severed: [...severMap.values()],
    },
    now,
  );
}

export function isBurnedFeedbackNostrKey(hex) {
  return String(hex || "").trim().toLowerCase() === BURNED_FEEDBACK_NOSTR_NSEC;
}
