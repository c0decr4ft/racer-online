/**
 * Durable friend-request / friendship store helpers.
 *
 * Unsigned heal-sync must not invent friendships that push the global cap and
 * evict everyone else's bonds. Client heal-wipe must only drop peers listed in
 * `severed` (real REMOVE), not every friend missing after a cap eviction.
 */
export const FRIEND_REQUEST_MAX = 2_000;
export const FRIENDSHIPS_PER_PUBKEY_MAX = 100;
export const FRIEND_ACCEPT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
/** Keep unfriend blocks long enough that a peer's heal-sync cannot resurrect the bond. */
export const FRIEND_SEVERED_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function normalizePubkeyHex(raw) {
  const hex = String(raw ?? "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

export function sanitizePlayerName(raw) {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .trim();
  return cleaned || "RACER";
}

export function emptyFriendRequests() {
  return { pending: [], accepts: [], friendships: [], severed: [] };
}

export function friendshipKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function clampFriendAt(at, now = Date.now()) {
  const n = typeof at === "number" && Number.isFinite(at) ? Math.round(at) : now;
  if (n < 0) return 0;
  if (n > now) return now;
  return n;
}

function countFriendshipsFor(store, pk) {
  return (store.friendships || []).filter((r) => r.a === pk || r.b === pk).length;
}

export function normalizeFriendRequests(data) {
  const store = emptyFriendRequests();
  if (!data || typeof data !== "object") return store;
  const pending = Array.isArray(data.pending) ? data.pending : [];
  const accepts = Array.isArray(data.accepts) ? data.accepts : [];
  const friendships = Array.isArray(data.friendships) ? data.friendships : [];
  const severed = Array.isArray(data.severed) ? data.severed : [];
  const now = Date.now();
  for (const row of pending) {
    if (!row || typeof row !== "object") continue;
    const from = normalizePubkeyHex(row.from);
    const to = normalizePubkeyHex(row.to);
    if (!from || !to || from === to) continue;
    store.pending.push({
      from,
      to,
      fromName: sanitizePlayerName(row.fromName),
      at: clampFriendAt(row.at, now),
    });
  }
  for (const row of accepts) {
    if (!row || typeof row !== "object") continue;
    const from = normalizePubkeyHex(row.from);
    const to = normalizePubkeyHex(row.to);
    if (!from || !to || from === to) continue;
    const at = clampFriendAt(row.at, now);
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
      at: clampFriendAt(row.at, now),
    });
  }
  for (const row of severed) {
    if (!row || typeof row !== "object") continue;
    const a = normalizePubkeyHex(row.a);
    const b = normalizePubkeyHex(row.b);
    if (!a || !b || a === b) continue;
    const at = clampFriendAt(row.at, now);
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
  // Newer duplicate keys win for the same pair; retention prefers older pairs so
  // a flood of brand-new forged rows cannot evict established friendships.
  for (const row of store.friendships.sort((a, b) => a.at - b.at)) {
    friendMap.set(friendshipKey(row.a, row.b), row);
  }
  store.friendships = [...friendMap.values()]
    .sort((a, b) => a.at - b.at)
    .slice(0, FRIEND_REQUEST_MAX);
  const severMap = new Map();
  for (const row of store.severed.sort((a, b) => a.at - b.at)) {
    severMap.set(friendshipKey(row.a, row.b), row);
  }
  // Drop active friendships that are still marked severed (heal races).
  store.friendships = store.friendships.filter((r) => !severMap.has(friendshipKey(r.a, r.b)));
  store.severed = [...severMap.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, FRIEND_REQUEST_MAX);
  return store;
}

export function mergeFriendRequestStores(local, remote) {
  return normalizeFriendRequests({
    pending: [...(local.pending || []), ...(remote.pending || [])],
    accepts: [...(local.accepts || []), ...(remote.accepts || [])],
    friendships: [...(local.friendships || []), ...(remote.friendships || [])],
    severed: [...(local.severed || []), ...(remote.severed || [])],
  });
}

export function isSeveredFriendship(store, a, b) {
  const key = friendshipKey(a, b);
  return (store.severed || []).some((r) => friendshipKey(r.a, r.b) === key);
}

export function clearSeveredFriendship(store, a, b) {
  const pa = normalizePubkeyHex(a);
  const pb = normalizePubkeyHex(b);
  if (!pa || !pb) return store;
  const key = friendshipKey(pa, pb);
  store.severed = (store.severed || []).filter((r) => friendshipKey(r.a, r.b) !== key);
  return store;
}

export function upsertFriendship(store, a, b, aName, bName, at = Date.now()) {
  const pa = normalizePubkeyHex(a);
  const pb = normalizePubkeyHex(b);
  if (!pa || !pb || pa === pb) return store;
  const key = friendshipKey(pa, pb);
  // Unfriend blocks heal-sync from resurrecting the pair until a fresh accept.
  if (isSeveredFriendship(store, pa, pb)) return store;
  const now = Date.now();
  const safeAt = clampFriendAt(at, now);
  const existing = (store.friendships || []).find((r) => friendshipKey(r.a, r.b) === key);
  if (existing) {
    // Prefer keeping a known real peer label over a weak heal name when callers
    // pass the oriented (aName=from, bName=peer) pair for an existing row that
    // may be stored with swapped a/b. Callers still pass oriented names; we
    // rewrite the whole row in canonical a/b order below only on insert.
    // On update, refresh names in the existing orientation.
    if (existing.a === pa) {
      existing.aName = sanitizePlayerName(aName);
      existing.bName = sanitizePlayerName(bName);
    } else {
      existing.aName = sanitizePlayerName(bName);
      existing.bName = sanitizePlayerName(aName);
    }
    // Keep the original `at` so retention stays stable under spam floods.
    return store;
  }
  if ((store.friendships || []).length >= FRIEND_REQUEST_MAX) return store;
  if (countFriendshipsFor(store, pa) >= FRIENDSHIPS_PER_PUBKEY_MAX) return store;
  if (countFriendshipsFor(store, pb) >= FRIENDSHIPS_PER_PUBKEY_MAX) return store;
  store.friendships = store.friendships || [];
  store.friendships.push({
    a: pa,
    b: pb,
    aName: sanitizePlayerName(aName),
    bName: sanitizePlayerName(bName),
    at: safeAt,
  });
  return store;
}

/** REMOVE friend — drop the bond and block sync from putting it back. */
export function severFriendship(store, a, b, at = Date.now()) {
  const pa = normalizePubkeyHex(a);
  const pb = normalizePubkeyHex(b);
  if (!pa || !pb || pa === pb) return store;
  const key = friendshipKey(pa, pb);
  store.friendships = (store.friendships || []).filter((r) => friendshipKey(r.a, r.b) !== key);
  store.pending = (store.pending || []).filter(
    (r) => !(r.from === pa && r.to === pb) && !(r.from === pb && r.to === pa),
  );
  store.accepts = (store.accepts || []).filter(
    (r) => !(r.from === pa && r.to === pb) && !(r.from === pb && r.to === pa),
  );
  store.severed = (store.severed || []).filter((r) => friendshipKey(r.a, r.b) !== key);
  store.severed.push({ a: pa, b: pb, at: clampFriendAt(at) });
  return store;
}

export function friendRequestsForPubkey(store, pubkey) {
  const pk = normalizePubkeyHex(pubkey);
  if (!pk) return { incoming: [], outgoing: [], accepted: [], friends: [], severed: [] };
  const incoming = (store.pending || [])
    .filter((r) => r.to === pk)
    .map((r) => ({ pubkey: r.from, name: r.fromName, at: r.at }));
  const outgoing = (store.pending || [])
    .filter((r) => r.from === pk)
    .map((r) => ({ pubkey: r.to, name: r.fromName, at: r.at }));
  const accepted = (store.accepts || [])
    .filter((r) => r.to === pk)
    .map((r) => ({ pubkey: r.from, name: r.fromName, at: r.at }));
  const friends = (store.friendships || [])
    .filter((r) => r.a === pk || r.b === pk)
    .map((r) =>
      r.a === pk
        ? { pubkey: r.b, name: r.bName, at: r.at }
        : { pubkey: r.a, name: r.aName, at: r.at },
    )
    .filter((r) => r.pubkey && r.pubkey !== pk);
  const severed = (store.severed || [])
    .filter((r) => r.a === pk || r.b === pk)
    .map((r) => (r.a === pk ? { pubkey: r.b, at: r.at } : { pubkey: r.a, at: r.at }))
    .filter((r) => r.pubkey && r.pubkey !== pk);
  return { incoming, outgoing, accepted, friends, severed };
}

/**
 * Apply an unsigned heal-sync payload for `from`.
 * Pending/outgoing/incoming still merge (redeploy heal). Friendships: refresh
 * names on existing bonds only — never invent new pairs without accept/request.
 */
export function applyFriendSync(store, input) {
  const from = normalizePubkeyHex(input?.from);
  if (!from) return store;
  const fromName = sanitizePlayerName(input?.fromName);
  const now = Date.now();
  const outgoing = Array.isArray(input?.outgoing) ? input.outgoing : [];
  const incoming = Array.isArray(input?.incoming) ? input.incoming : [];
  const friends = Array.isArray(input?.friends) ? input.friends : [];
  let next = store;

  for (const row of outgoing) {
    if (!row || typeof row !== "object") continue;
    const peer = normalizePubkeyHex(row.pubkey || row.to);
    if (!peer || peer === from) continue;
    const at = clampFriendAt(
      typeof row.at === "number" && Number.isFinite(row.at) ? row.at : now,
      now,
    );
    next.pending = next.pending.filter((r) => !(r.from === from && r.to === peer));
    const already = next.friendships.some(
      (r) => friendshipKey(r.a, r.b) === friendshipKey(from, peer),
    );
    if (!already) {
      next.pending.push({ from, to: peer, fromName, at });
    }
  }
  for (const row of incoming) {
    if (!row || typeof row !== "object") continue;
    const peer = normalizePubkeyHex(row.pubkey || row.from);
    if (!peer || peer === from) continue;
    const at = clampFriendAt(
      typeof row.at === "number" && Number.isFinite(row.at) ? row.at : now,
      now,
    );
    const name = sanitizePlayerName(row.name || row.fromName || "RACER");
    next.pending = next.pending.filter((r) => !(r.from === peer && r.to === from));
    const already = next.friendships.some(
      (r) => friendshipKey(r.a, r.b) === friendshipKey(from, peer),
    );
    if (!already) {
      next.pending.push({ from: peer, to: from, fromName: name, at });
    }
  }
  for (const row of friends) {
    if (!row || typeof row !== "object") continue;
    const peer = normalizePubkeyHex(row.pubkey);
    if (!peer || peer === from) continue;
    const existing = next.friendships.find(
      (r) => friendshipKey(r.a, r.b) === friendshipKey(from, peer),
    );
    // Unsigned sync cannot mint new friendships (global-cap eviction wipe).
    if (!existing) continue;
    let peerName = sanitizePlayerName(row.name);
    if (peerName && fromName && peerName.toLowerCase() === fromName.toLowerCase()) {
      peerName = "RACER";
    }
    const knownPeer = existing.a === from ? existing.bName : existing.aName;
    if (knownPeer && knownPeer !== "RACER" && (!peerName || peerName === "RACER")) {
      peerName = knownPeer;
    }
    next = upsertFriendship(next, from, peer, fromName || "RACER", peerName, existing.at);
    next.pending = next.pending.filter(
      (r) => !(r.from === from && r.to === peer) && !(r.from === peer && r.to === from),
    );
  }
  return normalizeFriendRequests(next);
}
