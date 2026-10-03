/**
 * Instant game invites: post one lobby invite per selected friend to the game
 * server (never fan-out to the whole friends list). Recipients poll GET with a
 * registered inbox key (passwords are never returned without that key).
 * Deep-link join still uses ?room=&pass=.
 */
import { getSession, type NostrSession } from "../nostr/session";
import { apiUrl } from "../net/apiBase";
import { parseInvitePayload, type RaceInvitePayload } from "./dm";
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
  /** Explicit friend pubkeys to invite — never defaults to everyone. */
  friendPubkeys: string[];
};

export type LobbyInviteRow = {
  id: string;
  from: string;
  fromName: string;
  room: string;
  password: string;
  trackId?: string;
  at: number;
};

export const LOBBY_AUTH_KIND = 30078;
export const LOBBY_AUTH_D_TAG = "racer-online:lobby-invites";

const INBOX_KEY_STORAGE = "racer-lobby-inbox-key-v1";

/** Avoid re-signing register on every 12s poll once this browser is bound. */
const registeredPubkeys = new Set<string>();

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

function randomInboxKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Durable per-browser inbox key — proves GET/ack ownership without per-poll signing. */
export function getOrCreateLobbyInboxKey(): string {
  try {
    const existing = localStorage.getItem(INBOX_KEY_STORAGE);
    if (existing && /^[0-9a-f]{64}$/i.test(existing.trim())) {
      return existing.trim().toLowerCase();
    }
  } catch {
    /* ignore */
  }
  const key = randomInboxKey();
  try {
    localStorage.setItem(INBOX_KEY_STORAGE, key);
  } catch {
    /* ignore */
  }
  return key;
}

function lobbyAuthTemplate(action: string) {
  return {
    kind: LOBBY_AUTH_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({ action, at: Date.now() }),
    tags: [
      ["d", LOBBY_AUTH_D_TAG],
      ["t", "racer-online"],
    ],
  };
}

async function signLobbyAuth(session: NostrSession, action: string): Promise<unknown> {
  return session.signer.signEvent(lobbyAuthTemplate(action));
}

/** Bind this browser's inbox key to the signed-in pubkey (one signature). */
export async function registerLobbyInbox(session?: NostrSession | null): Promise<boolean> {
  const s = session ?? getSession();
  if (!s) return false;
  const pk = normalizePubkey(s.pubkey);
  if (!pk) return false;
  if (registeredPubkeys.has(pk)) return true;
  const url = apiUrl("/lobby-invites");
  if (!url) return false;
  const inboxKey = getOrCreateLobbyInboxKey();
  try {
    const event = await signLobbyAuth(s, "register");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "register", from: pk, inboxKey, event }),
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { ok?: unknown } | null;
    if (data?.ok !== true) return false;
    registeredPubkeys.add(pk);
    return true;
  } catch {
    return false;
  }
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

/** Send lobby invites to exactly the listed friends (server-targeted). */
export async function sendGameInvites(input: SendGameInvitesInput): Promise<{
  sent: number;
  failed: string[];
  invite: GameInvite;
}> {
  const session = getSession();
  if (!session) throw new Error("Sign in with Nostr to invite");
  const room = sanitizeRoom(input.room);
  const me = session.pubkey.toLowerCase();
  const known = new Set(listFriends(session.pubkey).map((f) => f.pubkey));
  // Exact picks only — never expand to the full friends list.
  const targets = [...new Set((input.friendPubkeys || []).map(normalizePubkey).filter(Boolean))].filter(
    (pk) => pk !== me && known.has(pk),
  );
  if (!targets.length) throw new Error("Pick at least one friend");

  const password = String(input.password || "").slice(0, 32);
  const url = apiUrl("/lobby-invites");
  if (!url) throw new Error("Game server unavailable — cannot send invites");

  const event = await signLobbyAuth(session, "send");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      action: "send",
      from: me,
      fromName: String(input.fromName || "RACER").slice(0, 24),
      room,
      password,
      trackId: input.trackId,
      // Server accepts only this array — no "all friends" path.
      to: targets,
      friendPubkeys: targets,
      event,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const msg =
      err && typeof err === "object" && typeof (err as { error?: unknown }).error === "string"
        ? (err as { error: string }).error
        : "Could not send invites";
    throw new Error(msg);
  }
  const data = (await res.json()) as { sent?: unknown; created?: unknown };
  const sent = typeof data.sent === "number" ? data.sent : targets.length;
  const created = Array.isArray(data.created) ? data.created : [];
  const delivered = new Set(
    created
      .map((row) =>
        row && typeof row === "object" ? normalizePubkey(String((row as { to?: unknown }).to || "")) : "",
      )
      .filter(Boolean),
  );
  const failed = targets.filter((pk) => delivered.size > 0 && !delivered.has(pk));

  return {
    sent,
    failed,
    invite: {
      room,
      password,
      trackId: input.trackId,
      fromName: input.fromName,
      fromPubkey: me,
    },
  };
}

export async function fetchLobbyInvites(pubkey: string): Promise<LobbyInviteRow[]> {
  const pk = normalizePubkey(pubkey);
  const url = apiUrl(`/lobby-invites?pubkey=${encodeURIComponent(pk)}`);
  if (!url || !pk) return [];
  const inboxKey = getOrCreateLobbyInboxKey();
  const ok = await registerLobbyInbox();
  if (!ok) return [];
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Lobby-Inbox-Key": inboxKey,
      },
    });
    if (res.status === 401) {
      registeredPubkeys.delete(pk);
      const retried = await registerLobbyInbox();
      if (!retried) return [];
      const res2 = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "X-Lobby-Inbox-Key": inboxKey,
        },
      });
      if (!res2.ok) return [];
      return parseInviteRows(await res2.json());
    }
    if (!res.ok) return [];
    return parseInviteRows(await res.json());
  } catch {
    return [];
  }
}

function parseInviteRows(data: unknown): LobbyInviteRow[] {
  if (!data || typeof data !== "object") return [];
  const invites = (data as { invites?: unknown }).invites;
  if (!Array.isArray(invites)) return [];
  const out: LobbyInviteRow[] = [];
  for (const row of invites) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id || "").trim();
    const from = normalizePubkey(String(r.from || ""));
    const room = sanitizeRoom(String(r.room || ""));
    if (!id || !from || !room) continue;
    out.push({
      id,
      from,
      fromName: String(r.fromName || "RACER").slice(0, 24),
      room,
      password: String(r.password || "").slice(0, 32),
      trackId: typeof r.trackId === "string" ? r.trackId : undefined,
      at: typeof r.at === "number" && Number.isFinite(r.at) ? Math.round(r.at) : Date.now(),
    });
  }
  return out;
}

export async function ackLobbyInvite(pubkey: string, id: string): Promise<void> {
  const pk = normalizePubkey(pubkey);
  const url = apiUrl("/lobby-invites");
  if (!url || !pk || !id) return;
  const inboxKey = getOrCreateLobbyInboxKey();
  await registerLobbyInbox();
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "ack", from: pk, id, inboxKey }),
    });
  } catch {
    /* ignore */
  }
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
