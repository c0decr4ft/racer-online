/** Server-mediated friend requests (no extension encrypt/sign prompts). */

import { apiUrl } from "../net/apiBase";

export type FriendRequestRow = {
  pubkey: string;
  name: string;
  at: number;
};

export type FriendRequestSnapshot = {
  incoming: FriendRequestRow[];
  outgoing: FriendRequestRow[];
  accepted: FriendRequestRow[];
  friends: FriendRequestRow[];
};

function normalizePubkey(raw: unknown): string {
  const hex = String(raw ?? "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function sanitizeName(raw: unknown): string {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .trim();
  return cleaned || "RACER";
}

function parseRows(raw: unknown): FriendRequestRow[] {
  if (!Array.isArray(raw)) return [];
  const out: FriendRequestRow[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as { pubkey?: unknown; name?: unknown; at?: unknown };
    const pubkey = normalizePubkey(r.pubkey);
    if (!pubkey || seen.has(pubkey)) continue;
    seen.add(pubkey);
    out.push({
      pubkey,
      name: sanitizeName(r.name),
      at: typeof r.at === "number" && Number.isFinite(r.at) ? Math.round(r.at) : Date.now(),
    });
  }
  return out;
}

function parseSnapshot(data: {
  incoming?: unknown;
  outgoing?: unknown;
  accepted?: unknown;
  friends?: unknown;
}): FriendRequestSnapshot {
  return {
    incoming: parseRows(data.incoming),
    outgoing: parseRows(data.outgoing),
    accepted: parseRows(data.accepted),
    friends: parseRows(data.friends),
  };
}

export async function fetchFriendRequests(pubkey: string): Promise<FriendRequestSnapshot | null> {
  const pk = normalizePubkey(pubkey);
  const url = apiUrl(`/friend-requests?pubkey=${encodeURIComponent(pk)}`);
  if (!url || !pk) return null;
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return parseSnapshot((await res.json()) as Parameters<typeof parseSnapshot>[0]);
  } catch {
    return null;
  }
}

/**
 * Push this browser's local inbox/friends up to the server so a redeploy wipe
 * cannot erase pending requests — then the GET snapshot is the merge result.
 */
export async function syncLocalFriendState(input: {
  from: string;
  fromName: string;
  outgoing: FriendRequestRow[];
  incoming: FriendRequestRow[];
  friends: FriendRequestRow[];
}): Promise<FriendRequestSnapshot | null> {
  const url = apiUrl("/friend-requests");
  const me = normalizePubkey(input.from);
  if (!url || !me) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        action: "sync",
        from: me,
        fromName: sanitizeName(input.fromName),
        outgoing: input.outgoing.slice(0, 80),
        incoming: input.incoming.slice(0, 80),
        friends: input.friends.slice(0, 80),
      }),
    });
    if (!res.ok) return null;
    return parseSnapshot((await res.json()) as Parameters<typeof parseSnapshot>[0]);
  } catch {
    return null;
  }
}

async function postFriendAction(
  action: "request" | "accept" | "decline" | "clear-accept",
  from: string,
  to: string,
  fromName: string,
): Promise<FriendRequestSnapshot | null> {
  const url = apiUrl("/friend-requests");
  const me = normalizePubkey(from);
  const peer = normalizePubkey(to);
  if (!url || !me || !peer) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        action,
        from: me,
        to: peer,
        fromName: sanitizeName(fromName),
      }),
    });
    if (!res.ok) return null;
    return parseSnapshot((await res.json()) as Parameters<typeof parseSnapshot>[0]);
  } catch {
    return null;
  }
}

export function postFriendRequest(from: string, to: string, fromName: string) {
  return postFriendAction("request", from, to, fromName);
}

export function postFriendAccept(from: string, to: string, fromName: string) {
  return postFriendAction("accept", from, to, fromName);
}

export function postFriendDecline(from: string, to: string, fromName: string) {
  return postFriendAction("decline", from, to, fromName);
}

export function clearFriendAccept(from: string, accepterPubkey: string, fromName: string) {
  return postFriendAction("clear-accept", from, accepterPubkey, fromName);
}
