/** Local friends + friend-request inbox keyed by the signed-in player's pubkey. */

export type Friend = {
  pubkey: string;
  name: string;
  addedAt: number;
};

export type FriendRequest = {
  pubkey: string;
  name: string;
  at: number;
};

const FRIENDS_PREFIX = "racer-friends-v1:";
const INCOMING_PREFIX = "racer-friend-incoming-v1:";
const OUTGOING_PREFIX = "racer-friend-outgoing-v1:";

function normalizePubkey(raw: string): string {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function sanitizeName(raw: string): string {
  const cleaned = String(raw || "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .trim();
  return cleaned || "RACER";
}

function readJsonArray(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function friendsKey(owner: string): string {
  return `${FRIENDS_PREFIX}${owner}`;
}
function incomingKey(owner: string): string {
  return `${INCOMING_PREFIX}${owner}`;
}
function outgoingKey(owner: string): string {
  return `${OUTGOING_PREFIX}${owner}`;
}

function readFriends(ownerPubkey: string): Friend[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  const out: Friend[] = [];
  const seen = new Set<string>();
  for (const row of readJsonArray(friendsKey(owner))) {
    if (!row || typeof row !== "object") continue;
    const r = row as { pubkey?: unknown; name?: unknown; addedAt?: unknown };
    const pubkey = normalizePubkey(typeof r.pubkey === "string" ? r.pubkey : "");
    if (!pubkey || seen.has(pubkey) || pubkey === owner) continue;
    seen.add(pubkey);
    out.push({
      pubkey,
      name: sanitizeName(typeof r.name === "string" ? r.name : ""),
      addedAt:
        typeof r.addedAt === "number" && Number.isFinite(r.addedAt) ? Math.round(r.addedAt) : Date.now(),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.pubkey.localeCompare(b.pubkey));
}

function writeFriends(ownerPubkey: string, friends: Friend[]): Friend[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  const cleaned = friends
    .filter((f) => f.pubkey && f.pubkey !== owner)
    .sort((a, b) => a.name.localeCompare(b.name) || a.pubkey.localeCompare(b.pubkey));
  writeJson(friendsKey(owner), cleaned);
  return cleaned;
}

function readRequests(key: string, ownerPubkey: string): FriendRequest[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  const out: FriendRequest[] = [];
  const seen = new Set<string>();
  for (const row of readJsonArray(key)) {
    if (!row || typeof row !== "object") continue;
    const r = row as { pubkey?: unknown; name?: unknown; at?: unknown };
    const pubkey = normalizePubkey(typeof r.pubkey === "string" ? r.pubkey : "");
    if (!pubkey || seen.has(pubkey) || pubkey === owner) continue;
    seen.add(pubkey);
    out.push({
      pubkey,
      name: sanitizeName(typeof r.name === "string" ? r.name : ""),
      at: typeof r.at === "number" && Number.isFinite(r.at) ? Math.round(r.at) : Date.now(),
    });
  }
  return out.sort((a, b) => b.at - a.at);
}

function writeRequests(key: string, ownerPubkey: string, rows: FriendRequest[]): FriendRequest[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  const cleaned = rows
    .filter((r) => r.pubkey && r.pubkey !== owner)
    .sort((a, b) => b.at - a.at);
  writeJson(key, cleaned);
  return cleaned;
}

export function listFriends(ownerPubkey: string): Friend[] {
  return readFriends(ownerPubkey);
}

export function isFriend(ownerPubkey: string, peerPubkey: string): boolean {
  const peer = normalizePubkey(peerPubkey);
  if (!peer) return false;
  return readFriends(ownerPubkey).some((f) => f.pubkey === peer);
}

export function addFriend(ownerPubkey: string, peer: { pubkey: string; name?: string }): Friend[] {
  const owner = normalizePubkey(ownerPubkey);
  const pubkey = normalizePubkey(peer.pubkey);
  if (!owner || !pubkey || owner === pubkey) return readFriends(ownerPubkey);
  const list = readFriends(owner);
  const existing = list.find((f) => f.pubkey === pubkey);
  if (existing) {
    if (peer.name) existing.name = sanitizeName(peer.name);
  } else {
    list.push({
      pubkey,
      name: sanitizeName(peer.name || ""),
      addedAt: Date.now(),
    });
  }
  // Clear pending request rows either direction.
  writeIncomingRequests(
    owner,
    listIncomingRequests(owner).filter((r) => r.pubkey !== pubkey),
  );
  writeOutgoingRequests(
    owner,
    listOutgoingRequests(owner).filter((r) => r.pubkey !== pubkey),
  );
  return writeFriends(owner, list);
}

export function removeFriend(ownerPubkey: string, peerPubkey: string): Friend[] {
  const peer = normalizePubkey(peerPubkey);
  if (!peer) return readFriends(ownerPubkey);
  return writeFriends(
    ownerPubkey,
    readFriends(ownerPubkey).filter((f) => f.pubkey !== peer),
  );
}

export function updateFriendName(ownerPubkey: string, peerPubkey: string, name: string): Friend[] {
  const peer = normalizePubkey(peerPubkey);
  if (!peer) return readFriends(ownerPubkey);
  const list = readFriends(ownerPubkey);
  const row = list.find((f) => f.pubkey === peer);
  if (!row) return list;
  row.name = sanitizeName(name);
  return writeFriends(ownerPubkey, list);
}

export function listIncomingRequests(ownerPubkey: string): FriendRequest[] {
  const owner = normalizePubkey(ownerPubkey);
  return owner ? readRequests(incomingKey(owner), owner) : [];
}

export function listOutgoingRequests(ownerPubkey: string): FriendRequest[] {
  const owner = normalizePubkey(ownerPubkey);
  return owner ? readRequests(outgoingKey(owner), owner) : [];
}

export function hasOutgoingRequest(ownerPubkey: string, peerPubkey: string): boolean {
  const peer = normalizePubkey(peerPubkey);
  if (!peer) return false;
  return listOutgoingRequests(ownerPubkey).some((r) => r.pubkey === peer);
}

export function upsertIncomingRequest(
  ownerPubkey: string,
  peer: { pubkey: string; name?: string },
): FriendRequest[] {
  const owner = normalizePubkey(ownerPubkey);
  const pubkey = normalizePubkey(peer.pubkey);
  if (!owner || !pubkey || owner === pubkey || isFriend(owner, pubkey)) {
    return listIncomingRequests(ownerPubkey);
  }
  const list = listIncomingRequests(owner).filter((r) => r.pubkey !== pubkey);
  list.unshift({
    pubkey,
    name: sanitizeName(peer.name || ""),
    at: Date.now(),
  });
  return writeRequests(incomingKey(owner), owner, list);
}

export function upsertOutgoingRequest(
  ownerPubkey: string,
  peer: { pubkey: string; name?: string },
): FriendRequest[] {
  const owner = normalizePubkey(ownerPubkey);
  const pubkey = normalizePubkey(peer.pubkey);
  if (!owner || !pubkey || owner === pubkey || isFriend(owner, pubkey)) {
    return listOutgoingRequests(ownerPubkey);
  }
  const list = listOutgoingRequests(owner).filter((r) => r.pubkey !== pubkey);
  list.unshift({
    pubkey,
    name: sanitizeName(peer.name || ""),
    at: Date.now(),
  });
  return writeRequests(outgoingKey(owner), owner, list);
}

export function dismissIncomingRequest(ownerPubkey: string, peerPubkey: string): FriendRequest[] {
  const peer = normalizePubkey(peerPubkey);
  const owner = normalizePubkey(ownerPubkey);
  if (!owner || !peer) return listIncomingRequests(ownerPubkey);
  return writeRequests(
    incomingKey(owner),
    owner,
    listIncomingRequests(owner).filter((r) => r.pubkey !== peer),
  );
}

function writeIncomingRequests(owner: string, rows: FriendRequest[]): FriendRequest[] {
  return writeRequests(incomingKey(owner), owner, rows);
}

function writeOutgoingRequests(owner: string, rows: FriendRequest[]): FriendRequest[] {
  return writeRequests(outgoingKey(owner), owner, rows);
}
