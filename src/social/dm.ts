/**
 * NIP-04 end-to-end DMs via the active Nostr session signer.
 * Ciphertext only ever touches relays — never the game server.
 */
import type { NostrEvent } from "nostr-tools";
import { getSession } from "../nostr/session";
import { DEFAULT_RELAYS, pool } from "../nostr/relays";
import type { Subscription } from "rxjs";

export const DM_KIND = 4;
export const INVITE_TAG = "sats-racer-invite";

export type DmMessage = {
  id: string;
  from: string;
  to: string;
  createdAt: number;
  plaintext: string;
  invite?: RaceInvitePayload | null;
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
    throw new Error("This signer cannot encrypt DMs (needs NIP-04)");
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
    return {
      id: event.id,
      from,
      to,
      createdAt: event.created_at * 1000,
      plaintext,
      invite: parseInvitePayload(plaintext),
    };
  } catch {
    return null;
  }
}

/** Send a NIP-04 DM to a friend's pubkey. */
export async function sendDm(peerPubkey: string, plaintext: string): Promise<DmMessage> {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to chat");
  const to = normalizePubkey(peerPubkey);
  if (!to) throw new Error("Invalid friend pubkey");
  const text = String(plaintext || "").trim().slice(0, 1_500);
  if (!text) throw new Error("Message is empty");

  const nip04 = sessionNip04();
  const content = await nip04.encrypt(to, text);
  const tags: string[][] = [["p", to]];
  if (parseInvitePayload(text)) tags.push(["t", INVITE_TAG]);

  const signed = (await session.signer.signEvent({
    kind: DM_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags,
  })) as NostrEvent;

  await Promise.race([
    pool.publish(DEFAULT_RELAYS, signed),
    new Promise((r) => setTimeout(r, 5_000)),
  ]);

  return {
    id: signed.id,
    from: session.pubkey,
    to,
    createdAt: signed.created_at * 1000,
    plaintext: text,
    invite: parseInvitePayload(text),
  };
}

export type DmInboxHandlers = {
  onMessage: (msg: DmMessage) => void;
  onError?: (err: unknown) => void;
};

/** Live inbox: all kind-4 events addressed to the signed-in pubkey. */
export function subscribeInbox(handlers: DmInboxHandlers): () => void {
  const session = getSession();
  if (!session) return () => undefined;
  const me = normalizePubkey(session.pubkey);
  if (!me) return () => undefined;

  const seen = new Set<string>();
  const sub: Subscription = pool
    .subscription(DEFAULT_RELAYS, {
      kinds: [DM_KIND],
      "#p": [me],
      limit: 80,
    })
    .subscribe({
      next: (event) => {
        if (!event?.id || seen.has(event.id)) return;
        seen.add(event.id);
        void decryptEvent(event, me).then((msg) => {
          if (msg) handlers.onMessage(msg);
        });
      },
      error: (err) => handlers.onError?.(err),
    });

  return () => {
    try {
      sub.unsubscribe();
    } catch {
      /* ignore */
    }
  };
}

/** Load + subscribe to a 1:1 thread with a friend. */
export function subscribeThread(
  peerPubkey: string,
  handlers: DmInboxHandlers,
): () => void {
  const session = getSession();
  if (!session) return () => undefined;
  const me = normalizePubkey(session.pubkey);
  const peer = normalizePubkey(peerPubkey);
  if (!me || !peer) return () => undefined;

  const seen = new Set<string>();
  const handle = (event: NostrEvent) => {
    if (!event?.id || seen.has(event.id)) return;
    seen.add(event.id);
    void decryptEvent(event, me).then((msg) => {
      if (msg) handlers.onMessage(msg);
    });
  };

  const filters = [
    { kinds: [DM_KIND], authors: [me], "#p": [peer], limit: 60 },
    { kinds: [DM_KIND], authors: [peer], "#p": [me], limit: 60 },
  ];

  const sub: Subscription = pool.subscription(DEFAULT_RELAYS, filters).subscribe({
    next: handle,
    error: (err) => handlers.onError?.(err),
  });

  return () => {
    try {
      sub.unsubscribe();
    } catch {
      /* ignore */
    }
  };
}
