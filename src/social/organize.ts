/**
 * Instant game invites: DM friends a lobby join payload, then host creates the room.
 * Deep-link join still uses ?room=&pass=.
 */
import { getSession } from "../nostr/session";
import { invitePlaintext, parseInvitePayload, sendDm, type RaceInvitePayload } from "./dm";
import { listFriends } from "./friends";

export type GameInvite = {
  room: string;
  password: string;
  trackId?: string;
  fromName?: string;
  fromPubkey?: string;
};

export type SendGameInvitesInput = {
  room: string;
  password: string;
  trackId?: string;
  fromName?: string;
  /** Friend pubkeys to DM; defaults to all friends. */
  friendPubkeys?: string[];
};

function normalizePubkey(raw: string): string {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function sanitizeRoom(raw: string): string {
  return (
    String(raw || "")
      .replace(/[^\w\- ]/g, "")
      .trim()
      .slice(0, 24) || "circuit"
  );
}

export function buildInviteJoinUrl(invite: { room: string; password?: string; event?: boolean }): string {
  const url = new URL(location.href);
  url.searchParams.set("room", sanitizeRoom(invite.room));
  if (invite.password) url.searchParams.set("pass", invite.password.slice(0, 32));
  else url.searchParams.delete("pass");
  if (invite.event) url.searchParams.set("event", "1");
  else url.searchParams.delete("event");
  return url.toString();
}

export function parseInviteQuery(search = location.search): {
  room: string;
  password: string;
  eventMode: boolean;
} | null {
  const params = new URLSearchParams(search);
  const roomRaw = params.get("room");
  if (!roomRaw) return null;
  const room = sanitizeRoom(roomRaw);
  return {
    room,
    password: (params.get("pass") || "").slice(0, 32),
    eventMode: params.get("event") === "1" || params.get("event") === "true",
  };
}

export function clearInviteQuery(): void {
  const url = new URL(location.href);
  if (!url.searchParams.has("room") && !url.searchParams.has("pass") && !url.searchParams.has("event")) {
    return;
  }
  url.searchParams.delete("room");
  url.searchParams.delete("pass");
  url.searchParams.delete("event");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

/** Send immediate lobby invites to friends (no future schedule). */
export async function sendGameInvites(input: SendGameInvitesInput): Promise<{
  sent: number;
  failed: string[];
  invite: GameInvite;
}> {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to invite");
  const room = sanitizeRoom(input.room);
  const friends = listFriends(session.pubkey);
  const targets =
    input.friendPubkeys && input.friendPubkeys.length
      ? input.friendPubkeys.map(normalizePubkey).filter(Boolean)
      : friends.map((f) => f.pubkey);
  if (!targets.length) throw new Error("Pick at least one friend");

  const password = String(input.password || "").slice(0, 32);
  const plaintext = invitePlaintext({
    room,
    password,
    at: Date.now(),
    trackId: input.trackId,
    fromName: input.fromName,
  });

  const failed: string[] = [];
  let sent = 0;
  for (const pk of targets) {
    if (pk === session.pubkey.toLowerCase()) continue;
    try {
      await sendDm(pk, plaintext);
      sent += 1;
    } catch {
      failed.push(pk);
    }
  }

  return {
    sent,
    failed,
    invite: {
      room,
      password,
      trackId: input.trackId,
      fromName: input.fromName,
      fromPubkey: session.pubkey.toLowerCase(),
    },
  };
}

export function inviteFromPlaintext(plaintext: string): RaceInvitePayload | null {
  return parseInvitePayload(plaintext);
}

/** @deprecated kept for deep-link / old reminder payloads */
export type ScheduledRace = GameInvite & {
  id: string;
  at: number;
  notified?: boolean;
};

export function rememberInviteFromDm(
  _ownerPubkey: string,
  invite: RaceInvitePayload,
  fromPubkey?: string,
): ScheduledRace {
  return {
    id: `dm-${sanitizeRoom(invite.room)}-${invite.at}-${(fromPubkey || "").slice(0, 8)}`,
    room: invite.room,
    password: invite.password,
    at: invite.at,
    trackId: invite.trackId,
    fromName: invite.fromName,
    fromPubkey: fromPubkey ? normalizePubkey(fromPubkey) : undefined,
    notified: true,
  };
}

export function armAllSchedules(_ownerPubkey: string): void {
  /* Instant invites only — no local schedule timers. */
}

export function listSchedules(_ownerPubkey: string): ScheduledRace[] {
  return [];
}

export function onInviteJoin(handler: (invite: ScheduledRace) => void): () => void {
  const onCustom = (ev: Event) => {
    const detail = (ev as CustomEvent<ScheduledRace>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener("racer-game-invite", onCustom);
  return () => window.removeEventListener("racer-game-invite", onCustom);
}

export function requestJoin(invite: ScheduledRace): void {
  window.dispatchEvent(new CustomEvent("racer-game-invite", { detail: invite }));
}
