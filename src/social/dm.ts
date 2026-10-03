/**
 * NIP-17 private DMs (gift wrap): rumor kind 14 → seal kind 13 → wrap kind 1059.
 * Uses signer NIP-44 (extension / local / NIP-46). Relays only see gift wraps.
 */
import type { NostrEvent, UnsignedEvent } from "nostr-tools";
import { getEventHash, verifyEvent } from "nostr-tools";
import { createWrap } from "nostr-tools/nip59";
import { getSession } from "../nostr/session";
import { pool } from "../nostr/relays";
import type { Subscription } from "rxjs";

export const GIFT_WRAP_KIND = 1059;
export const SEAL_KIND = 13;
export const RUMOR_KIND = 14;
/** @deprecated legacy NIP-04 — kept only for optional dual-read of old mail */
export const DM_KIND = 4;
export const INVITE_TAG = "sats-racer-invite";

/** Relays that accept gift-wrapped DMs. */
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

type Nip44 = {
  encrypt: (pubkey: string, plaintext: string) => Promise<string>;
  decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
};

function normalizePubkey(raw: string): string {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

/**
 * NIP-17: the kind:13 seal signer MUST match the unsigned kind:14 rumor author.
 * Without this check, any sender can impersonate any pubkey by rewriting rumor.pubkey.
 */
export function nip17SealMatchesRumor(sealPubkey: string, rumorPubkey: string): boolean {
  const seal = normalizePubkey(sealPubkey);
  const rumor = normalizePubkey(rumorPubkey);
  return !!seal && seal === rumor;
}

function sessionNip44(): Nip44 {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to chat");
  const nip44 = (session.signer as { nip44?: Nip44 }).nip44;
  if (!nip44?.encrypt || !nip44?.decrypt) {
    throw new Error("This signer cannot encrypt DMs — try a local key or an extension with NIP-44");
  }
  return nip44;
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

function toDmMessage(id: string, from: string, to: string, createdAtSec: number, plaintext: string): DmMessage {
  return {
    id,
    from,
    to,
    createdAt: createdAtSec * 1000,
    plaintext,
    invite: parseInvitePayload(plaintext),
    friendRequest: isFriendRequestPayload(plaintext),
    friendAccept: isFriendAcceptPayload(plaintext),
  };
}

function rumorExtraTags(text: string): string[][] {
  const tags: string[][] = [];
  if (parseInvitePayload(text)) tags.push(["t", INVITE_TAG]);
  if (isFriendRequestPayload(text)) tags.push(["t", "sats-racer-friend-request"]);
  if (isFriendAcceptPayload(text)) tags.push(["t", "sats-racer-friend-accept"]);
  return tags;
}

function randomSkewedNow(): number {
  return Math.round(Date.now() / 1000 - Math.random() * 2 * 24 * 60 * 60);
}

/** Serialize decrypts so Alby/Amber never get a permission storm. */
let decryptQueue: Promise<unknown> = Promise.resolve();
function enqueueDecrypt<T>(fn: () => Promise<T>): Promise<T> {
  const next = decryptQueue.then(fn, fn);
  decryptQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function unwrapGiftWrap(event: NostrEvent, myPubkey: string): Promise<DmMessage | null> {
  if (event.kind !== GIFT_WRAP_KIND) return null;
  const pTag = event.tags.find((t) => Array.isArray(t) && t[0] === "p")?.[1];
  const addressed = normalizePubkey(pTag || "");
  if (addressed && addressed !== myPubkey) return null;

  const nip44 = sessionNip44();
  let seal: NostrEvent;
  try {
    const sealJson = await nip44.decrypt(event.pubkey, event.content);
    seal = JSON.parse(sealJson) as NostrEvent;
  } catch {
    return null;
  }
  if (!seal || seal.kind !== SEAL_KIND || typeof seal.content !== "string" || typeof seal.pubkey !== "string") {
    return null;
  }
  // Reject forged seals before attributing authorship.
  try {
    if (!verifyEvent(seal)) return null;
  } catch {
    return null;
  }

  let rumor: {
    id?: string;
    kind?: number;
    pubkey?: string;
    created_at?: number;
    content?: string;
    tags?: string[][];
  };
  try {
    const rumorJson = await nip44.decrypt(seal.pubkey, seal.content);
    rumor = JSON.parse(rumorJson) as typeof rumor;
  } catch {
    return null;
  }
  if (!rumor || rumor.kind !== RUMOR_KIND || typeof rumor.content !== "string" || typeof rumor.pubkey !== "string") {
    return null;
  }
  // Spec-required: seal.pubkey === rumor.pubkey — otherwise any sender can impersonate.
  if (!nip17SealMatchesRumor(seal.pubkey, rumor.pubkey)) return null;

  const from = normalizePubkey(seal.pubkey);
  const toTag = rumor.tags?.find((t) => Array.isArray(t) && t[0] === "p")?.[1];
  const to = normalizePubkey(toTag || "") || myPubkey;
  if (!from) return null;
  if (from !== myPubkey && to !== myPubkey) return null;

  const id = typeof rumor.id === "string" && rumor.id ? rumor.id : event.id;
  const created = typeof rumor.created_at === "number" ? rumor.created_at : event.created_at;
  return toDmMessage(id, from, to, created, rumor.content);
}

async function decryptEvent(event: NostrEvent, myPubkey: string): Promise<DmMessage | null> {
  if (event.kind === GIFT_WRAP_KIND) {
    return unwrapGiftWrap(event, myPubkey);
  }
  return null;
}

/** Send a NIP-17 gift-wrapped DM (also wraps a copy to yourself for thread history). */
export async function sendDm(peerPubkey: string, plaintext: string): Promise<DmMessage> {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to chat");
  const to = normalizePubkey(peerPubkey);
  const me = normalizePubkey(session.pubkey);
  if (!to || !me) throw new Error("Invalid friend pubkey");
  const text = String(plaintext || "").trim().slice(0, 1_500);
  if (!text) throw new Error("Message is empty");

  const nip44 = sessionNip44();
  const createdAt = Math.floor(Date.now() / 1000);
  const rumorTags: string[][] = [["p", to], ...rumorExtraTags(text)];
  const rumorUnsigned: UnsignedEvent & { pubkey: string } = {
    kind: RUMOR_KIND,
    created_at: createdAt,
    content: text,
    tags: rumorTags,
    pubkey: me,
  };
  const rumor = {
    ...rumorUnsigned,
    id: getEventHash(rumorUnsigned),
  };

  let sealedForPeer: string;
  let sealedForSelf: string;
  try {
    sealedForPeer = await nip44.encrypt(to, JSON.stringify(rumor));
    sealedForSelf = await nip44.encrypt(me, JSON.stringify(rumor));
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Could not encrypt message");
  }

  const sealToPeer = (await session.signer.signEvent({
    kind: SEAL_KIND,
    created_at: randomSkewedNow(),
    content: sealedForPeer,
    tags: [],
  })) as NostrEvent;
  const sealToSelf = (await session.signer.signEvent({
    kind: SEAL_KIND,
    created_at: randomSkewedNow(),
    content: sealedForSelf,
    tags: [],
  })) as NostrEvent;

  const wrapToPeer = createWrap(sealToPeer, to) as NostrEvent;
  const wrapToSelf = createWrap(sealToSelf, me) as NostrEvent;

  try {
    await Promise.race([
      Promise.all([pool.publish(DM_RELAYS, wrapToPeer), pool.publish(DM_RELAYS, wrapToSelf)]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Relay publish timed out")), 8_000)),
    ]);
  } catch (err) {
    console.warn("[dm] publish issue", err);
  }

  return toDmMessage(rumor.id, me, to, createdAt, text);
}

export type DmInboxHandlers = {
  onMessage: (msg: DmMessage) => void;
  onError?: (err: unknown) => void;
};

function watchFilters(
  filters: { kinds: number[]; authors?: string[]; "#p"?: string[]; limit?: number; since?: number }[],
  myPubkey: string,
  handlers: DmInboxHandlers,
  seen: Set<string>,
  peerFilter?: string,
): () => void {
  const handle = (event: NostrEvent) => {
    if (!event?.id || seen.has(event.id)) return;
    seen.add(event.id);
    void enqueueDecrypt(async () => {
      const msg = await decryptEvent(event, myPubkey);
      if (!msg) return;
      if (peerFilter) {
        const peer = peerFilter;
        if (msg.from !== peer && msg.to !== peer) return;
      }
      // Dedupe by rumor id across self-wrap + peer-wrap
      if (seen.has(`rumor:${msg.id}`)) return;
      seen.add(`rumor:${msg.id}`);
      handlers.onMessage(msg);
    });
  };

  const subs: Subscription[] = [];
  subs.push(
    pool.request(DM_RELAYS, filters).subscribe({
      next: handle,
      error: (err) => handlers.onError?.(err),
    }),
  );
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

/** Live inbox: gift wraps addressed to me. Small history window to avoid decrypt storms. */
export function subscribeInbox(handlers: DmInboxHandlers): () => void {
  const session = getSession();
  if (!session) return () => undefined;
  const me = normalizePubkey(session.pubkey);
  if (!me) return () => undefined;
  const since = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;
  return watchFilters([{ kinds: [GIFT_WRAP_KIND], "#p": [me], limit: 40, since }], me, handlers, new Set());
}

/** Load + subscribe to a 1:1 thread (unwraps wraps to me that involve this peer). */
export function subscribeThread(peerPubkey: string, handlers: DmInboxHandlers): () => void {
  const session = getSession();
  if (!session) return () => undefined;
  const me = normalizePubkey(session.pubkey);
  const peer = normalizePubkey(peerPubkey);
  if (!me || !peer) return () => undefined;
  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  return watchFilters(
    [{ kinds: [GIFT_WRAP_KIND], "#p": [me], limit: 60, since }],
    me,
    handlers,
    new Set(),
    peer,
  );
}
