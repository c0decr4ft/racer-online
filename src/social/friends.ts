/** Local friends list keyed by the signed-in player's pubkey. */

export type Friend = {
  pubkey: string;
  name: string;
  addedAt: number;
};

const STORAGE_PREFIX = "racer-friends-v1:";

function storageKey(ownerPubkey: string): string {
  return `${STORAGE_PREFIX}${ownerPubkey.toLowerCase()}`;
}

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

function readList(ownerPubkey: string): Friend[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  try {
    const raw = localStorage.getItem(storageKey(owner));
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: Friend[] = [];
    const seen = new Set<string>();
    for (const row of data) {
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
  } catch {
    return [];
  }
}

function writeList(ownerPubkey: string, friends: Friend[]): Friend[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  const cleaned = friends
    .filter((f) => f.pubkey && f.pubkey !== owner)
    .sort((a, b) => a.name.localeCompare(b.name) || a.pubkey.localeCompare(b.pubkey));
  try {
    localStorage.setItem(storageKey(owner), JSON.stringify(cleaned));
  } catch {
    /* ignore quota */
  }
  return cleaned;
}

export function listFriends(ownerPubkey: string): Friend[] {
  return readList(ownerPubkey);
}

export function isFriend(ownerPubkey: string, peerPubkey: string): boolean {
  const peer = normalizePubkey(peerPubkey);
  if (!peer) return false;
  return readList(ownerPubkey).some((f) => f.pubkey === peer);
}

export function addFriend(ownerPubkey: string, peer: { pubkey: string; name?: string }): Friend[] {
  const owner = normalizePubkey(ownerPubkey);
  const pubkey = normalizePubkey(peer.pubkey);
  if (!owner || !pubkey || owner === pubkey) return readList(ownerPubkey);
  const list = readList(owner);
  const existing = list.find((f) => f.pubkey === pubkey);
  if (existing) {
    if (peer.name) existing.name = sanitizeName(peer.name);
    return writeList(owner, list);
  }
  list.push({
    pubkey,
    name: sanitizeName(peer.name || ""),
    addedAt: Date.now(),
  });
  return writeList(owner, list);
}

export function removeFriend(ownerPubkey: string, peerPubkey: string): Friend[] {
  const peer = normalizePubkey(peerPubkey);
  if (!peer) return readList(ownerPubkey);
  return writeList(
    ownerPubkey,
    readList(ownerPubkey).filter((f) => f.pubkey !== peer),
  );
}

export function updateFriendName(ownerPubkey: string, peerPubkey: string, name: string): Friend[] {
  const peer = normalizePubkey(peerPubkey);
  if (!peer) return readList(ownerPubkey);
  const list = readList(ownerPubkey);
  const row = list.find((f) => f.pubkey === peer);
  if (!row) return list;
  row.name = sanitizeName(name);
  return writeList(ownerPubkey, list);
}
