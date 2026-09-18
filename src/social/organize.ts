/**
 * Organize-a-race: encrypted invite DMs + local reminders + deep-link join URLs.
 */
import { getSession } from "../nostr/session";
import { invitePlaintext, parseInvitePayload, sendDm, type RaceInvitePayload } from "./dm";
import { listFriends } from "./friends";

const SCHEDULE_PREFIX = "racer-race-schedules-v1:";

export type ScheduledRace = {
  id: string;
  room: string;
  password: string;
  at: number;
  trackId?: string;
  fromName?: string;
  fromPubkey?: string;
  notified?: boolean;
};

export type OrganizeInput = {
  room: string;
  password: string;
  at: number;
  trackId?: string;
  fromName?: string;
  /** Friend pubkeys to DM; defaults to all friends. */
  friendPubkeys?: string[];
};

type JoinHandler = (invite: ScheduledRace) => void;

let joinHandler: JoinHandler | null = null;
const timerIds = new Map<string, number>();

function storageKey(ownerPubkey: string): string {
  return `${SCHEDULE_PREFIX}${ownerPubkey.toLowerCase()}`;
}

function normalizePubkey(raw: string): string {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function sanitizeRoom(raw: string): string {
  return String(raw || "")
    .replace(/[^\w\- ]/g, "")
    .trim()
    .slice(0, 24) || "circuit";
}

function readSchedules(ownerPubkey: string): ScheduledRace[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  try {
    const raw = localStorage.getItem(storageKey(owner));
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: ScheduledRace[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const r = row as Partial<ScheduledRace>;
      const room = sanitizeRoom(String(r.room || ""));
      const at = Number(r.at);
      if (!room || !Number.isFinite(at) || at <= 0) continue;
      out.push({
        id: String(r.id || `${room}-${at}`),
        room,
        password: String(r.password || "").slice(0, 32),
        at: Math.round(at),
        trackId: r.trackId ? String(r.trackId).slice(0, 40) : undefined,
        fromName: r.fromName ? String(r.fromName).slice(0, 24) : undefined,
        fromPubkey: r.fromPubkey ? normalizePubkey(r.fromPubkey) : undefined,
        notified: !!r.notified,
      });
    }
    return out.sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

function writeSchedules(ownerPubkey: string, rows: ScheduledRace[]): ScheduledRace[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  const now = Date.now() - 3_600_000;
  const cleaned = rows.filter((r) => r.at >= now).sort((a, b) => a.at - b.at);
  try {
    localStorage.setItem(storageKey(owner), JSON.stringify(cleaned));
  } catch {
    /* ignore */
  }
  return cleaned;
}

export function listSchedules(ownerPubkey: string): ScheduledRace[] {
  return readSchedules(ownerPubkey);
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

function scheduleTimer(ownerPubkey: string, row: ScheduledRace): void {
  const existing = timerIds.get(row.id);
  if (existing) {
    clearTimeout(existing);
    timerIds.delete(row.id);
  }
  const delay = row.at - Date.now();
  if (delay > 24 * 3_600_000) return; // arm closer when within a day
  if (delay <= 0) {
    void fireReminder(ownerPubkey, row);
    return;
  }
  const id = window.setTimeout(() => {
    void fireReminder(ownerPubkey, row);
  }, delay);
  timerIds.set(row.id, id);
}

async function fireReminder(ownerPubkey: string, row: ScheduledRace): Promise<void> {
  const list = readSchedules(ownerPubkey);
  const current = list.find((r) => r.id === row.id);
  if (!current || current.notified) return;
  current.notified = true;
  writeSchedules(ownerPubkey, list);

  const title = "Race starting";
  const body = `${current.fromName || "Friend"} · room ${current.room}`;
  try {
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        await Notification.requestPermission().catch(() => "denied");
      }
      if (Notification.permission === "granted") {
        const n = new Notification(title, { body, tag: current.id });
        n.onclick = () => {
          window.focus();
          joinHandler?.(current);
          n.close();
        };
      }
    }
  } catch {
    /* ignore */
  }

  // Toast-like in-page banner via custom event for the UI layer.
  window.dispatchEvent(new CustomEvent("racer-race-invite", { detail: current }));
}

export function upsertSchedule(ownerPubkey: string, invite: ScheduledRace): ScheduledRace[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  const list = readSchedules(owner).filter((r) => r.id !== invite.id);
  list.push(invite);
  const next = writeSchedules(owner, list);
  const row = next.find((r) => r.id === invite.id);
  if (row) scheduleTimer(owner, row);
  return next;
}

export function rememberInviteFromDm(
  ownerPubkey: string,
  invite: RaceInvitePayload,
  fromPubkey?: string,
): ScheduledRace[] {
  const id = `dm-${sanitizeRoom(invite.room)}-${invite.at}-${(fromPubkey || "").slice(0, 8)}`;
  return upsertSchedule(ownerPubkey, {
    id,
    room: invite.room,
    password: invite.password,
    at: invite.at,
    trackId: invite.trackId,
    fromName: invite.fromName,
    fromPubkey: fromPubkey ? normalizePubkey(fromPubkey) : undefined,
    notified: false,
  });
}

/** Create invites, DM friends, and schedule a local reminder for the organizer. */
export async function organizeRace(input: OrganizeInput): Promise<{
  sent: number;
  failed: string[];
  schedule: ScheduledRace;
}> {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to organize");
  const room = sanitizeRoom(input.room);
  const at = Math.round(input.at);
  if (!Number.isFinite(at) || at < Date.now() - 30_000) {
    throw new Error("Pick a future time");
  }
  const friends = listFriends(session.pubkey);
  const targets =
    input.friendPubkeys && input.friendPubkeys.length
      ? input.friendPubkeys.map(normalizePubkey).filter(Boolean)
      : friends.map((f) => f.pubkey);
  if (!targets.length) throw new Error("Add friends first");

  const plaintext = invitePlaintext({
    room,
    password: String(input.password || "").slice(0, 32),
    at,
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

  const schedule: ScheduledRace = {
    id: `org-${room}-${at}`,
    room,
    password: String(input.password || "").slice(0, 32),
    at,
    trackId: input.trackId,
    fromName: input.fromName || "You",
    fromPubkey: session.pubkey.toLowerCase(),
    notified: false,
  };
  upsertSchedule(session.pubkey, schedule);

  return { sent, failed, schedule };
}

export function armAllSchedules(ownerPubkey: string): void {
  for (const row of readSchedules(ownerPubkey)) {
    if (!row.notified) scheduleTimer(ownerPubkey, row);
  }
}

export function onInviteJoin(handler: JoinHandler): () => void {
  joinHandler = handler;
  const onCustom = (ev: Event) => {
    const detail = (ev as CustomEvent<ScheduledRace>).detail;
    if (detail) {
      // Show toast path is handled by UI; join only when user clicks notification above.
      void detail;
    }
  };
  window.addEventListener("racer-race-invite", onCustom);
  return () => {
    if (joinHandler === handler) joinHandler = null;
    window.removeEventListener("racer-race-invite", onCustom);
  };
}

export function requestJoin(invite: ScheduledRace): void {
  joinHandler?.(invite);
}

export function inviteFromPlaintext(plaintext: string): RaceInvitePayload | null {
  return parseInvitePayload(plaintext);
}
