/**
 * NIP-04 end-to-end DMs via the active Nostr session signer.
 *
 * Encryption: each message is encrypted with NIP-04 (ECDH shared secret between
 * your key and the recipient's, then AES). Relays only ever see ciphertext.
 */
import type { NostrEvent } from "nostr-tools";
import { getSession } from "../nostr/session";
import { pool } from "../nostr/relays";
import type { Subscription } from "rxjs";

export const DM_KIND = 4;
export const INVITE_TAG = "sats-racer-invite";

/** Relays that tend to accept/serve kind-4 DMs (profile relays alone are often not enough). */
export const DM_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://nostr.mom",
];

export type DmMessage = {
  id: string;
  from: string;
  to: string;
  createdAt: number;
  plaintext: string;
  invite?: RaceInvitePayload | null;
  friendRequest?: boolean;
  friendAccept?: boolean;
};

export type RaceInvitePayload = {
  type: "race-invite";
  room: string;
  password: string;
  at: number;
  trackId?: string;
  fromName?: string;
};

type Nip04 = {
  encrypt: (pubkey: string, plaintext: string) => Promise<string>;
  decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
};

function normalizePubkey(raw: string): string {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function sessionNip04(): Nip04 {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to chat");
  const nip04 = (session.signer as { nip04?: Nip04 }).nip04;
  if (!nip04?.encrypt || !nip04?.decrypt) {
    throw new Error("This signer cannot encrypt DMs — try a local key or an extension with NIP-04");
  }
  return nip04;
}

export function parseInvitePayload(plaintext: string): RaceInvitePayload | null {
  try {
    const data = JSON.parse(plaintext) as Record<string, unknown>;
    if (data.type !== "race-invite") return null;
    const room = String(data.room ?? "")
      .replace(/[^\w\- ]/g, "")
      .trim()
      .slice(0, 24);
    if (!room) return null;
    const at = Number(data.at);
    if (!Number.isFinite(at) || at <= 0) return null;
    return {
      type: "race-invite",
      room,
      password: String(data.password ?? "").slice(0, 32),
      at: Math.round(at),
      trackId: typeof data.trackId === "string" ? data.trackId.slice(0, 40) : undefined,
      fromName: typeof data.fromName === "string" ? data.fromName.slice(0, 24) : undefined,
    };
  } catch {
    return null;
  }
}

export function isFriendRequestPayload(plaintext: string): boolean {
  try {
    const data = JSON.parse(plaintext) as { type?: unknown };
    return data.type === "friend-request";
  } catch {
    return false;
  }
}

export function isFriendAcceptPayload(plaintext: string): boolean {
  try {
    const data = JSON.parse(plaintext) as { type?: unknown };
    return data.type === "friend-accept";
  } catch {
    return false;
  }
}

export function friendRequestName(plaintext: string): string {
  try {
    const data = JSON.parse(plaintext) as { fromName?: unknown };
    return typeof data.fromName === "string" ? data.fromName.slice(0, 24) : "RACER";
  } catch {
    return "RACER";
  }
}

export function invitePlaintext(invite: Omit<RaceInvitePayload, "type">): string {
  const payload: RaceInvitePayload = {
    type: "race-invite",
    room: invite.room,
    password: invite.password,
    at: invite.at,
    trackId: invite.trackId,
    fromName: invite.fromName,
  };
  return JSON.stringify(payload);
}

export function friendRequestPlaintext(fromName: string): string {
  return JSON.stringify({ type: "friend-request", fromName: fromName.slice(0, 24) || "RACER" });
}

export function friendAcceptPlaintext(fromName: string): string {
  return JSON.stringify({ type: "friend-accept", fromName: fromName.slice(0, 24) || "RACER" });
}

function toDmMessage(event: NostrEvent, from: string, to: string, plaintext: string): DmMessage {
  return {
    id: event.id,
    from,
    to,
    createdAt: event.created_at * 1000,
    plaintext,
    invite: parseInvitePayload(plaintext),
    friendRequest: isFriendRequestPayload(plaintext),
    friendAccept: isFriendAcceptPayload(plaintext),
  };
}

async function decryptEvent(event: NostrEvent, myPubkey: string): Promise<DmMessage | null> {
  const from = normalizePubkey(event.pubkey);
  if (!from) return null;
  const pTag = event.tags.find((t) => Array.isArray(t) && t[0] === "p")?.[1];
  const to = normalizePubkey(pTag || "");
  if (!to) return null;
  if (from !== myPubkey && to !== myPubkey) return null;
  const peer = from === myPubkey ? to : from;
  try {
    const nip04 = sessionNip04();
    const plaintext = await nip04.decrypt(peer, event.content);
    return toDmMessage(event, from, to, plaintext);
  } catch {
    return null;
  }
}

/** Send a NIP-04 DM to a pubkey. */
export async function sendDm(peerPubkey: string, plaintext: string): Promise<DmMessage> {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to chat");
  const to = normalizePubkey(peerPubkey);
  if (!to) throw new Error("Invalid friend pubkey");
  const text = String(plaintext || "").trim().slice(0, 1_500);
  if (!text) throw new Error("Message is empty");

  const nip04 = sessionNip04();
  let content: string;
  try {
    content = await nip04.encrypt(to, text);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Could not encrypt message");
  }

  const tags: string[][] = [["p", to]];
  if (parseInvitePayload(text)) tags.push(["t", INVITE_TAG]);
  if (isFriendRequestPayload(text)) tags.push(["t", "sats-racer-friend-request"]);
  if (isFriendAcceptPayload(text)) tags.push(["t", "sats-racer-friend-accept"]);

  const signed = (await session.signer.signEvent({
    kind: DM_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags,
  })) as NostrEvent;

  try {
    await Promise.race([
      pool.publish(DM_RELAYS, signed),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Relay publish timed out")), 8_000)),
    ]);
  } catch (err) {
    // Still return the local message so the sender sees it; warn via thrown soft? Keep going.
    console.warn("[dm] publish issue", err);
  }

  return toDmMessage(signed, normalizePubkey(session.pubkey), to, text);
}

export type DmInboxHandlers = {
  onMessage: (msg: DmMessage) => void;
  onError?: (err: unknown) => void;
};

function watchFilters(
  filters: { kinds: number[]; authors?: string[]; "#p"?: string[]; limit?: number }[],
  myPubkey: string,
  handlers: DmInboxHandlers,
  seen: Set<string>,
): () => void {
  const handle = (event: NostrEvent) => {
    if (!event?.id || seen.has(event.id)) return;
    seen.add(event.id);
    void decryptEvent(event, myPubkey).then((msg) => {
      if (msg) handlers.onMessage(msg);
    });
  };

  const subs: Subscription[] = [];
  // Historical catch-up
  subs.push(
    pool.request(DM_RELAYS, filters).subscribe({
      next: handle,
      error: (err) => handlers.onError?.(err),
    }),
  );
  // Live
  subs.push(
    pool.subscription(DM_RELAYS, filters).subscribe({
      next: handle,
      error: (err) => handlers.onError?.(err),
    }),
  );

  return () => {
    for (const sub of subs) {
      try {
        sub.unsubscribe();
      } catch {
        /* ignore */
      }
    }
  };
}

/** Live inbox: kind-4 events addressed to the signed-in pubkey. */
export function subscribeInbox(handlers: DmInboxHandlers): () => void {
  const session = getSession();
  if (!session) return () => undefined;
  const me = normalizePubkey(session.pubkey);
  if (!me) return () => undefined;
  return watchFilters([{ kinds: [DM_KIND], "#p": [me], limit: 100 }], me, handlers, new Set());
}

/** Load + subscribe to a 1:1 thread with a friend. */
export function subscribeThread(peerPubkey: string, handlers: DmInboxHandlers): () => void {
  const session = getSession();
  if (!session) return () => undefined;
  const me = normalizePubkey(session.pubkey);
  const peer = normalizePubkey(peerPubkey);
  if (!me || !peer) return () => undefined;

  const filters = [
    { kinds: [DM_KIND], authors: [me], "#p": [peer], limit: 80 },
    { kinds: [DM_KIND], authors: [peer], "#p": [me], limit: 80 },
  ];
  return watchFilters(filters, me, handlers, new Set());
}
