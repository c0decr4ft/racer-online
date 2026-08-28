import { WebSocketServer } from "ws";
import { verifyEvent } from "nostr-tools";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { payments, depositProofs, recordPayout, loadPayouts, savePayouts } from "./payments.mjs";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const ON_RENDER = Boolean(process.env.RENDER);
/** Public base URL for NUT-18 payment-request transports (Render sets RENDER_EXTERNAL_URL). */
function lanBaseUrl() {
  // Phone wallets can't reach 127.0.0.1 — use this machine's LAN address by default
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info && info.family === "IPv4" && !info.internal) return `http://${info.address}:${PORT}`;
    }
  }
  return `http://127.0.0.1:${PORT}`;
}
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  lanBaseUrl()
).replace(/\/+$/, "");
/** When set (or when ../dist exists), serve the built web client from this process. */
const DIST_DIR = process.env.STATIC_DIR
  ? process.env.STATIC_DIR
  : existsSync(join(dirname(fileURLToPath(import.meta.url)), "..", "dist"))
    ? join(dirname(fileURLToPath(import.meta.url)), "..", "dist")
    : null;
// Render builds with Vite base `/` — serve the game at the service root.
// Local/Pages builds use `/racer-online/`.
const STATIC_BASE = (
  process.env.STATIC_BASE !== undefined
    ? process.env.STATIC_BASE
    : ON_RENDER
      ? ""
      : "/racer-online"
).replace(/\/$/, "");
const NET_TICK_MS = 1000 / 30;
/** Binary state frame type — must match src/net/protocol.ts STATE_BIN_TYPE. */
const STATE_BIN_TYPE = 1;
const MAP_VOTE_MS = 20_000;
const MAX_PLAYERS = 6;
const PLAYER_COLORS = [0xe4eaf2, 0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff, 0xff6b9d, 0x00d4ff];
const DIR = dirname(fileURLToPath(import.meta.url));
const LEADERBOARD_PATH = join(DIR, "leaderboard.json");
const PRESENCE_PATH = join(DIR, "presence.json");
const FEEDBACK_PATH = join(DIR, "feedback.json");
/** Where player feedback is emailed (FormSubmit relay — free, no SMTP creds needed). */
const FEEDBACK_EMAIL = (process.env.FEEDBACK_EMAIL || "c0decr4ft.fr@gmail.com").trim();
/**
 * Dev dashboard access — only this Nostr pubkey may read tip stats / withdraw
 * the tip wallet. Default: the DEV_c0decr4ft account (npub1nratkqj…aud4).
 * Override with the DEV_PUBKEY env var.
 */
const DEV_PUBKEY = (
  process.env.DEV_PUBKEY || "98fabb025fc826ca032733ddd18a08f323061ea9c2ff8f9af41c50a07e3d905b"
).trim().toLowerCase();
const DEV_EVENT_KIND = 30078;
const DEV_D_TAG = "racer-online:dev";
const DEV_EVENT_MAX_AGE_S = 600;
const FEEDBACK_RELAY_URL = (
  process.env.FEEDBACK_RELAY_URL || `https://formsubmit.co/ajax/${encodeURIComponent(FEEDBACK_EMAIL)}`
).trim();
/**
 * Resend API key (resend.com — free tier, no domain verification needed when
 * sending to your own account email from onboarding@resend.dev). When set,
 * feedback is delivered through it instead of the flaky FormSubmit relay.
 */
const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const GAME_VERSION_LABEL = (() => {
  try {
    return JSON.parse(readFileSync(join(DIR, "..", "package.json"), "utf8")).version || "unknown";
  } catch {
    return "unknown";
  }
})();

/** Forward one feedback message to the inbox. Throws on relay failure (caller logs). */
async function sendFeedbackEmailOnce(msg) {
  const subject = `Sats Racer feedback${msg.name ? ` — ${msg.name}` : ""}`;
  // Preferred path: Resend (real email API — reliable, server-side, free tier).
  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sats Racer <onboarding@resend.dev>",
        to: [FEEDBACK_EMAIL],
        subject,
        text:
          `From: ${msg.name || "anonymous"}\n` +
          `Game version: ${GAME_VERSION_LABEL}\n` +
          `At: ${new Date(msg.createdAt || Date.now()).toISOString()}\n\n` +
          msg.text,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(String(data?.message || `resend ${res.status}`).slice(0, 140));
    }
    return;
  }
  // Fallback: FormSubmit (needs one-time email activation; rate-limits bursts).
  const res = await fetch(FEEDBACK_RELAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // FormSubmit rejects requests without a Referer (its "web server" anti-spam check)
      Referer: `${PUBLIC_BASE_URL}/`,
    },
    body: JSON.stringify({
      _subject: `Sats Racer feedback${msg.name ? ` — ${msg.name}` : ""}`,
      _template: "box",
      _captcha: "false",
      name: msg.name || "anonymous",
      message: msg.text,
      game_version: GAME_VERSION_LABEL,
      received_at: new Date(msg.createdAt || Date.now()).toISOString(),
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`email relay ${res.status}`);
  // FormSubmit answers HTTP 200 even for rejections — inspect the payload
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no JSON body */
  }
  if (data && String(data.success) !== "true") {
    throw new Error(String(data.message || "relay rejected").slice(0, 140));
  }
}

/**
 * Forward feedback to the inbox with one retry — FormSubmit rate-limits bursts
 * (429), and a single retry rides out almost all of them.
 */
async function sendFeedbackEmail(msg) {
  try {
    await sendFeedbackEmailOnce(msg);
  } catch (err) {
    console.warn(`[feedback] email relay failed, retrying in 2.5s:`, err?.message || err);
    await new Promise((r) => setTimeout(r, 2500));
    await sendFeedbackEmailOnce(msg);
  }
}
const MAX_BOARD = 10;
const MAX_FEEDBACK = 80;
const FEEDBACK_TEXT_MAX = 500;
const FEEDBACK_NAME_MAX = 24;
const NAME_MAX = 15;
const PRESENCE_STALE_MS = 75_000;
const PRESENCE_KEEP_HOURS = 14 * 24;
const PRESENCE_HISTORY_EPOCH = 2;
const PRESENCE_MAX_SAMPLES = 2_000;

const TRACK_IDS = [
  "forest-loop",
  "harbor-circuit",
  "summit-pass",
  "meadow-sweep",
  "canyon-cut",
  "oval-circuit",
];
const DEFAULT_TRACK_ID = TRACK_IDS[0];

/** Letters, digits, space, underscore — trim, strip control/weird chars, cap length. */
function sanitizeDriverName(raw) {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return cleaned || "RACER";
}

function normalizeTrackId(raw) {
  const id = String(raw ?? "").trim();
  return TRACK_IDS.includes(id) ? id : DEFAULT_TRACK_ID;
}

function normalizeKind(raw) {
  return String(raw ?? "").toLowerCase() === "bike" ? "bike" : "car";
}

function normalizeWeather(raw) {
  const m = String(raw ?? "").toLowerCase();
  return m === "night" || m === "rain" ? m : "dry";
}

function normalizeSessionId(raw) {
  const id = String(raw ?? "").trim();
  if (id.length < 8 || id.length > 80) return null;
  if (!/^[A-Za-z0-9_\-:]+$/.test(id)) return null;
  return id;
}

/** @typedef {{ id: string, name: string, color: number, accent: number, kind: string, pubkey?: string, x: number, z: number, h: number, s: number, g: string, lap: number }} Pose */
/** @typedef {{ id: string, name: string, color: number, room: string, ws: import('ws').WebSocket, pose: Pose, lastPoseAt: number }} Client */
/** @typedef {{ trackId: string, order: number }} TrackVote */
/** @typedef {{ paymentHash: string, paymentRequest: string, bolt11?: string, paidAt: number, netSats?: number }} BuyIn */
/** @typedef {{ at: number, level: 'info' | 'warn' | 'error', msg: string }} PotLogEntry */
/** @typedef {{ name: string, password: string, maxPlayers: number, trackId: string, kind: string, weather: string, hostId: string, phase: 'lobby' | 'racing' | 'finished' | 'starting', winnerId: string, voteOptions: string[], votes: Map<string, TrackVote>, voteOrder: number, voteEndsAt: number, lastCrashAt: number, clients: Map<string, Client>, isEvent: boolean, buyInSats: number, buyInFeeSats: number, buyIns: Map<string, BuyIn>, potSats: number, potId: string, potClaimed: boolean, potLogs: PotLogEntry[] }} Room */

/** Persist a debug line on the event pot (disk + in-memory) so the DEV table can show it. */
function potLog(room, level, msg) {
  if (!room?.isEvent || !room.potId) return;
  const entry = {
    at: Date.now(),
    level: level === "warn" || level === "error" ? level : "info",
    msg: String(msg || "").slice(0, 240),
  };
  if (!entry.msg) return;
  room.potLogs = [...(room.potLogs || []), entry].slice(-80);
  void payments.appendPotLog?.(room.potId, entry, { roomName: room.name }).catch((err) => {
    console.warn("[event] pot log failed:", err?.message || err);
  });
}

function mergePotLogs(a, b) {
  const seen = new Set();
  const out = [];
  for (const e of [...(a || []), ...(b || [])]) {
    if (!e?.msg) continue;
    const key = `${e.at}|${e.msg}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      at: Number(e.at) || 0,
      level: e.level === "warn" || e.level === "error" ? e.level : "info",
      msg: String(e.msg).slice(0, 240),
    });
  }
  return out.sort((x, y) => x.at - y.at).slice(-24);
}

/** @typedef {{ name: string, timeMs: number, bestLapMs?: number, at: number, trackId?: string, pubkey: string, eventId?: string }} BoardEntry */
/** @typedef {Record<string, BoardEntry[]>} BoardStore */
/** @typedef {{ at: number, count: number }} PresenceSample */
/** @typedef {{ buckets: Record<string, number>, samples: PresenceSample[], sessions: Record<string, number>, updatedAt: number, historyEpoch: number }} PresenceStore */

/** @type {Map<string, Room>} */
const rooms = new Map();

const MIN_PLAYERS_CAP = 2;
const DEFAULT_MAX_PLAYERS = 6;

function sanitizeRoomName(raw) {
  return (
    String(raw || "circuit")
      .replace(/[^\w\- ]/g, "")
      .trim()
      .slice(0, 24) || "circuit"
  );
}

function sanitizePassword(raw) {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 32);
}

function clampMaxPlayers(raw) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return DEFAULT_MAX_PLAYERS;
  return Math.max(MIN_PLAYERS_CAP, Math.min(MAX_PLAYERS, n));
}

const MIN_BUYIN_SATS = 1;
const MAX_BUYIN_SATS = 1_000_000;

function clampBuyIn(raw) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < MIN_BUYIN_SATS) return 0;
  return Math.min(MAX_BUYIN_SATS, n);
}

function normalizeColor(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n) & 0xffffff;
}

/** Lowercased 64-hex Nostr pubkey, or null. */
function normalizePubkey(raw) {
  const pk = String(raw ?? "").trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(pk) ? pk : null;
}

const SCORE_EVENT_KIND = 30078;
const SCORE_D_PREFIX = "racer-online:";
/** Reject sub-15s totals — real 3-lap runs are slower; blocks e2e spam (~6.8s). */
const SCORE_MIN_TIME_MS = 15_000;
const SCORE_MAX_TIME_MS = 3_600_000;
const SCORE_FUTURE_SKEW_S = 900;
const SCORE_MAX_AGE_S = 365 * 24 * 3600;
/** Public relays the client already publishes signed scores to — the durable
 * board store. leaderboard.json on disk is only a cache: any fresh instance
 * (redeploy) rebuilds its board from these. */
const SCORE_RELAYS = ["wss://nos.lol", "wss://relay.primal.net"];
const BOARD_RELAY_REFRESH_MS = 15 * 60_000;

/**
 * Verify a signed dev-auth event (kind 30078, d = racer-online:dev, fresh,
 * signed by DEV_PUBKEY). Returns true or throws { status, message }.
 */
function verifyDevEvent(event) {
  if (!/^[0-9a-f]{64}$/.test(DEV_PUBKEY)) {
    throw { status: 503, message: "dev dashboard not configured on this server" };
  }
  if (!event || typeof event !== "object") throw { status: 400, message: "signed auth event required" };
  if (event.kind !== DEV_EVENT_KIND) throw { status: 400, message: "wrong event kind" };
  const pubkey = normalizePubkey(event.pubkey);
  if (!pubkey || pubkey !== DEV_PUBKEY) throw { status: 403, message: "not the dev account" };
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const d = tags.find((t) => Array.isArray(t) && t[0] === "d")?.[1] ?? "";
  if (d !== DEV_D_TAG) throw { status: 400, message: "wrong auth tag" };
  const createdAt = Number(event.created_at);
  const nowS = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(createdAt) || Math.abs(nowS - createdAt) > DEV_EVENT_MAX_AGE_S) {
    throw { status: 400, message: "stale auth event — retry" };
  }
  try {
    if (!verifyEvent(event)) throw new Error("bad sig");
  } catch {
    throw { status: 400, message: "invalid signature" };
  }
  return true;
}

/**
 * Sweep leftover bearer tip tokens into the tip wallet. The mint swap burns
 * those secrets so they can't be double-spent. Tokens never leave the server.
 */
async function sweepPendingTipTokens() {
  if (payments.mock) return 0;
  const list = loadPayouts();
  let swept = 0;
  let dirty = false;
  for (const r of list) {
    if (!r || r.mock || r.collected || r.claimedAt || !r.tipToken || !(Number(r.tipSats) > 0)) continue;
    try {
      const net = await payments.receiveTipToken(r.tipToken, Number(r.tipSats));
      r.collected = true;
      r.collectedAt = Date.now();
      r.tipSats = Number.isFinite(net) && net > 0 ? net : r.tipSats;
      delete r.tipToken;
      swept += 1;
      dirty = true;
    } catch (err) {
      // Persist failed after mint swap — replace spent bearer so a later sweep can retry.
      if (err?.emergencyToken) {
        r.tipToken = err.emergencyToken;
        dirty = true;
      }
      console.warn(`[dev] tip sweep failed (${r.room}):`, err?.message || err);
    }
  }
  if (dirty) savePayouts(list);
  return swept;
}

/** After the withdraw token is copied, those tips have left the server wallet. */
function markCollectedTipsClaimed() {
  const list = loadPayouts();
  const now = Date.now();
  let changed = false;
  for (const r of list) {
    if (!r || r.mock || r.claimedAt) continue;
    if (r.collected === true || Number.isFinite(Number(r.collectedAt))) {
      r.claimedAt = now;
      changed = true;
    }
  }
  if (changed) savePayouts(list);
}

/** Tip stats + history for the dev dashboard (live tips only; mock = test money). */
async function devTipsSummary() {
  await sweepPendingTipTokens().catch((err) =>
    console.warn("[dev] tip sweep skipped:", err?.message || err),
  );
  const walletSats = Math.max(0, Math.round(Number(await payments.tipBalanceSats()) || 0));
  const withdrawnSats = Math.max(0, Math.round(Number(payments.withdrawnSats()) || 0));
  const pendingWithdraw = payments.pendingWithdraw();
  const walletEmpty = walletSats === 0 && !pendingWithdraw;
  const list = loadPayouts()
    .filter((r) => r && Number.isFinite(Number(r.tipSats)))
    .map((r) => {
      const collected =
        r.collected === true || Number.isFinite(Number(r.collectedAt)) || Number.isFinite(Number(r.claimedAt));
      const claimed = Number.isFinite(Number(r.claimedAt)) || (walletEmpty && collected && r.mock !== true);
      return {
        at: Number(r.at) || 0,
        room: String(r.room || ""),
        potSats: Number(r.potSats) || 0,
        tipSats: Math.max(0, Math.round(Number(r.tipSats))),
        tipPercent: Number(r.tipPercent) || 0,
        mock: r.mock === true,
        collected,
        claimed,
      };
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, 50);
  const live = list.filter((t) => !t.mock);
  const sum = (rows) => rows.reduce((a, t) => a + t.tipSats, 0);
  const failed = live.filter((t) => !t.collected && t.tipSats > 0);
  let custody = { mock: payments.mock, mintUrl: payments.mintUrl, pot: null, tip: null, error: null };
  try {
    custody = await payments.auditCustody();
  } catch (err) {
    custody.error = String(err?.message || err).slice(0, 160);
  }
  const potAudits = Array.isArray(custody.pots) ? custody.pots : [];
  const auditByPot = new Map(potAudits.map((p) => [String(p.potId || p.label || ""), p]));
  const seenPots = new Set();
  const events = [];
  for (const room of rooms.values()) {
    if (!room.isEvent) continue;
    const audit = auditByPot.get(room.potId) || null;
    if (room.potId) seenPots.add(room.potId);
    const remaining =
      (audit?.unspentSats || 0) > 0 || (audit?.localSats || 0) > 0 || (audit?.proofs || 0) > 0;
    // Claimed empty pots drop off the table — leftover money still shows.
    if (room.potClaimed && !remaining) continue;
    events.push({
      potId: room.potId || "",
      name: room.name,
      live: true,
      leftover: false,
      phase: room.phase,
      players: room.clients.size,
      paid: [...room.buyIns.values()].filter((b) => b.paidAt > 0).length,
      buyInSats: room.buyInSats || 0,
      potSats: room.potSats || 0,
      potClaimed: room.potClaimed === true,
      localSats: audit?.localSats ?? 0,
      unspentSats: audit?.unspentSats ?? 0,
      spentSats: audit?.spentSats ?? 0,
      pendingSats: audit?.pendingSats ?? 0,
      proofs: audit?.proofs ?? 0,
      mintUrl: audit?.mintUrl || payments.mintUrl,
      orphaned: audit?.orphaned === true,
      error: audit?.error || null,
      rescueToken: audit?.rescueToken || null,
      logs: mergePotLogs(room.potLogs, audit?.logs),
    });
  }
  for (const audit of potAudits) {
    const id = String(audit.potId || audit.label || "");
    if (!id || seenPots.has(id)) continue;
    const hasMoney = (audit.localSats || 0) > 0 || (audit.unspentSats || 0) > 0 || (audit.proofs || 0) > 0;
    if (!hasMoney) continue;
    const claimed = (audit.logs || []).some((e) => /\bclaimed\b/i.test(String(e?.msg || "")));
    events.push({
      potId: id,
      name: audit.roomName || (id === "legacy" ? "legacy pot" : "offline event"),
      live: false,
      leftover: true,
      phase: "offline",
      players: 0,
      paid: 0,
      buyInSats: 0,
      potSats: 0,
      potClaimed: claimed,
      localSats: audit.localSats || 0,
      unspentSats: audit.unspentSats || 0,
      spentSats: audit.spentSats || 0,
      pendingSats: audit.pendingSats || 0,
      proofs: audit.proofs || 0,
      mintUrl: audit.mintUrl || payments.mintUrl,
      orphaned: audit.orphaned === true,
      error: audit.error || null,
      rescueToken: audit.rescueToken || null,
      logs: mergePotLogs([], audit.logs),
    });
  }
  events.sort((a, b) => Number(b.live) - Number(a.live) || String(a.name).localeCompare(String(b.name)));
  return {
    ok: true,
    mint: payments.mintUrl,
    count: live.length,
    earnedSats: sum(live.filter((t) => t.collected)),
    pendingSats: walletSats,
    walletSats,
    pendingCount: failed.length,
    claimedSats: withdrawnSats,
    withdrawnSats,
    pendingWithdraw: pendingWithdraw
      ? { amountSats: pendingWithdraw.amountSats, at: pendingWithdraw.at, token: pendingWithdraw.token }
      : null,
    tips: list,
    custody,
    events,
  };
}

/** Dev feedback inbox: newest first, with read state (read = dismissed from view). */
function devFeedbackList() {
  const store = loadFeedback();
  return store.messages.map((m) => ({
    id: m.id,
    text: m.text,
    name: m.name,
    createdAt: m.createdAt,
    read: Number.isFinite(Number(m.readAt)),
  }));
}

/** Mark one feedback message read (dismissed). Returns updated inbox. */
function markFeedbackRead(id) {
  const store = loadFeedback();
  let changed = false;
  for (const m of store.messages) {
    if (m.id === id && !Number.isFinite(Number(m.readAt))) {
      m.readAt = Date.now();
      changed = true;
    }
  }
  if (changed) saveFeedback(store);
  return devFeedbackList();
}

/** Permanently delete one feedback message. Returns updated inbox. */
function deleteFeedback(id) {
  const store = loadFeedback();
  const before = store.messages.length;
  store.messages = store.messages.filter((m) => m.id !== id);
  if (store.messages.length !== before) saveFeedback(store);
  return devFeedbackList();
}

/**
 * Validate + verify a signed leaderboard score event (kind 30078).
 * Returns { name, timeMs, bestLapMs, at, trackId, pubkey, eventId } or null.
 */
function verifyScoreEvent(event) {
  if (!event || typeof event !== "object") return null;
  if (event.kind !== SCORE_EVENT_KIND) return null;
  const pubkey = normalizePubkey(event.pubkey);
  if (!pubkey) return null;
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const dTag = tags.find((t) => Array.isArray(t) && t[0] === "d");
  const d = dTag && typeof dTag[1] === "string" ? dTag[1] : "";
  if (!d.startsWith(SCORE_D_PREFIX)) return null;
  const trackId = d.slice(SCORE_D_PREFIX.length);
  if (!TRACK_IDS.includes(trackId)) return null;

  let content;
  try {
    content = JSON.parse(typeof event.content === "string" ? event.content : "{}");
  } catch {
    return null;
  }
  const timeMs = Math.round(Number(content.timeMs));
  if (!Number.isFinite(timeMs) || timeMs < SCORE_MIN_TIME_MS || timeMs > SCORE_MAX_TIME_MS) return null;
  const createdAt = Number(event.created_at);
  const nowS = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(createdAt) || createdAt > nowS + SCORE_FUTURE_SKEW_S || createdAt < nowS - SCORE_MAX_AGE_S) {
    return null;
  }
  try {
    if (!verifyEvent(event)) return null;
  } catch {
    return null;
  }

  const bestRaw = content.bestLapMs != null ? Math.round(Number(content.bestLapMs)) : undefined;
  return {
    name: typeof content.name === "string" ? content.name : "",
    timeMs,
    bestLapMs: bestRaw != null && Number.isFinite(bestRaw) && bestRaw > 0 ? bestRaw : undefined,
    at: createdAt * 1000,
    trackId,
    pubkey,
    eventId: typeof event.id === "string" ? event.id : undefined,
  };
}

/** @returns {BoardStore} */
function emptyStore() {
  /** @type {BoardStore} */
  const store = {};
  for (const id of TRACK_IDS) store[id] = [];
  return store;
}

/** @returns {BoardStore} */
function loadStore() {
  try {
    if (!existsSync(LEADERBOARD_PATH)) return emptyStore();
    const raw = JSON.parse(readFileSync(LEADERBOARD_PATH, "utf8"));
    const store = emptyStore();
    if (Array.isArray(raw)) {
      store[DEFAULT_TRACK_ID] = sortBoard(raw, DEFAULT_TRACK_ID);
      return store;
    }
    if (raw && typeof raw === "object") {
      if (raw.byTrack && typeof raw.byTrack === "object") {
        for (const [id, list] of Object.entries(raw.byTrack)) {
          const tid = normalizeTrackId(id);
          if (!Array.isArray(list)) continue;
          // Merge when legacy / unknown ids collapse onto the same track
          store[tid] = sortBoard([...(store[tid] || []), ...list], tid);
        }
        return store;
      }
      if (Array.isArray(raw.entries)) {
        store[DEFAULT_TRACK_ID] = sortBoard(raw.entries, DEFAULT_TRACK_ID);
      }
    }
    return store;
  } catch {
    return emptyStore();
  }
}

/** @param {BoardStore} store */
function saveStore(store) {
  /** @type {BoardStore} */
  const byTrack = {};
  for (const id of TRACK_IDS) byTrack[id] = sortBoard(store[id] || [], id);
  writeFileSync(LEADERBOARD_PATH, JSON.stringify({ byTrack }, null, 2));
}

/**
 * Merge signed score events from the public relays into the local board.
 * The relays are the durable store — a redeployed instance rebuilds here.
 * Merge keeps each racer's fastest time per track (sortBoard dedupe), so a
 * sync can never downgrade a local best.
 */
async function syncBoardFromRelays() {
  try {
    const { SimplePool } = await import("nostr-tools");
    const pool = new SimplePool();
    let events = [];
    try {
      events = await pool.querySync(
        SCORE_RELAYS,
        { kinds: [SCORE_EVENT_KIND], "#t": ["racer-online"], limit: 300 },
      );
    } finally {
      pool.close(SCORE_RELAYS);
    }
    const store = loadStore();
    let merged = 0;
    for (const ev of events) {
      const score = verifyScoreEvent(ev);
      if (!score) continue;
      store[score.trackId] = sortBoard([...(store[score.trackId] || []), score], score.trackId);
      merged++;
    }
    if (merged > 0) saveStore(store);
    console.log(`[board] relay sync — ${merged} signed scores merged, ${events.length} events seen`);
  } catch (err) {
    console.warn("[board] relay sync failed:", err?.message || err);
  }
}

/**
 * Normalize + rank a track board. Verified-era entries only: every entry must
 * carry a Nostr pubkey (legacy unsigned entries are dropped here), one best
 * time per racer (pubkey), fastest first, top MAX_BOARD.
 * @param {BoardEntry[]} entries @param {string} [trackId]
 */
function sortBoard(entries, trackId) {
  const tid = trackId ? normalizeTrackId(trackId) : undefined;
  const cleaned = [...entries]
    .filter((e) => e && Number.isFinite(e.timeMs) && e.timeMs > 0 && normalizePubkey(e.pubkey))
    .map((e) => ({
      name: sanitizeDriverName(e.name),
      timeMs: Math.round(e.timeMs),
      bestLapMs: e.bestLapMs != null ? Math.round(e.bestLapMs) : undefined,
      at: e.at || Date.now(),
      trackId: tid || (e.trackId ? normalizeTrackId(e.trackId) : undefined),
      pubkey: normalizePubkey(e.pubkey),
      eventId: typeof e.eventId === "string" ? e.eventId : undefined,
    }));

  /** @type {Map<string, BoardEntry>} */
  const byPubkey = new Map();
  for (const e of cleaned) {
    const prev = byPubkey.get(e.pubkey);
    if (!prev || e.timeMs < prev.timeMs || (e.timeMs === prev.timeMs && (e.at || 0) < (prev.at || 0))) {
      byPubkey.set(e.pubkey, e);
    }
  }

  return [...byPubkey.values()]
    .sort((a, b) => a.timeMs - b.timeMs || (a.at || 0) - (b.at || 0))
    .slice(0, MAX_BOARD);
}

function hourKey(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}`;
}

function hourKeyToMs(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/.exec(key);
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4]);
}

/** @returns {PresenceStore} */
function emptyPresence() {
  return { buckets: {}, samples: [], sessions: {}, updatedAt: 0, historyEpoch: PRESENCE_HISTORY_EPOCH };
}

/** @returns {PresenceStore} */
function loadPresence() {
  try {
    if (!existsSync(PRESENCE_PATH)) return emptyPresence();
    const raw = JSON.parse(readFileSync(PRESENCE_PATH, "utf8"));
    return prunePresence(parsePresence(raw));
  } catch {
    return emptyPresence();
  }
}

/** @param {unknown} data @returns {PresenceStore} */
function parsePresence(data) {
  const store = emptyPresence();
  if (!data || typeof data !== "object") return store;
  const obj = /** @type {Partial<PresenceStore>} */ (data);
  const epoch =
    typeof obj.historyEpoch === "number" && Number.isFinite(obj.historyEpoch)
      ? Math.round(obj.historyEpoch)
      : 0;
  store.historyEpoch = epoch;
  if (epoch >= PRESENCE_HISTORY_EPOCH && obj.buckets && typeof obj.buckets === "object") {
    for (const [k, v] of Object.entries(obj.buckets)) {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v >= 0) {
        store.buckets[k] = Math.max(0, Math.round(v));
      }
    }
  }
  if (Array.isArray(obj.samples)) {
    for (const row of obj.samples) {
      if (
        row &&
        typeof row.at === "number" &&
        Number.isFinite(row.at) &&
        row.at > 0 &&
        typeof row.count === "number" &&
        Number.isFinite(row.count) &&
        row.count >= 0
      ) {
        store.samples.push({ at: Math.round(row.at), count: Math.round(row.count) });
      }
    }
    store.samples.sort((a, b) => a.at - b.at);
    store.samples = store.samples.slice(-PRESENCE_MAX_SAMPLES);
  }
  if (obj.sessions && typeof obj.sessions === "object") {
    for (const [id, at] of Object.entries(obj.sessions)) {
      if (typeof id === "string" && id.length >= 8 && typeof at === "number" && Number.isFinite(at) && at > 0) {
        store.sessions[id] = Math.round(at);
      }
    }
  }
  if (typeof obj.updatedAt === "number" && Number.isFinite(obj.updatedAt)) {
    store.updatedAt = Math.round(obj.updatedAt);
  }
  return store;
}

/** @param {PresenceStore} store @param {number} [now] */
function prunePresence(store, now = Date.now()) {
  /** @type {Record<string, number>} */
  const sessions = {};
  for (const [id, at] of Object.entries(store.sessions)) {
    if (now - at <= PRESENCE_STALE_MS) sessions[id] = at;
  }
  const cutoff = now - PRESENCE_KEEP_HOURS * 3_600_000;
  /** @type {Record<string, number>} */
  const buckets = {};
  if (store.historyEpoch >= PRESENCE_HISTORY_EPOCH) {
    for (const [k, v] of Object.entries(store.buckets)) {
      const at = hourKeyToMs(k);
      if (at >= cutoff) buckets[k] = v;
    }
  }
  return {
    buckets,
    samples: store.samples
      .filter((sample) => sample.at >= cutoff)
      .slice(-PRESENCE_MAX_SAMPLES),
    sessions,
    updatedAt: store.updatedAt,
    historyEpoch: Math.max(store.historyEpoch, PRESENCE_HISTORY_EPOCH),
  };
}

/** @param {PresenceStore} store */
function savePresence(store) {
  const body = prunePresence(store);
  body.historyEpoch = PRESENCE_HISTORY_EPOCH;
  writeFileSync(PRESENCE_PATH, JSON.stringify(body, null, 2));
  return body;
}

function sanitizeFeedbackText(raw) {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FEEDBACK_TEXT_MAX);
}

function sanitizeFeedbackName(raw) {
  if (raw == null) return undefined;
  const cleaned = String(raw)
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FEEDBACK_NAME_MAX)
    .trim();
  return cleaned || undefined;
}

function normalizeFeedbackMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const text = sanitizeFeedbackText(raw.text);
  if (!text) return null;
  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? Math.round(raw.createdAt)
      : Date.now();
  const id = String(raw.id ?? "").trim() || `fb-${Date.now().toString(36)}`;
  const name = sanitizeFeedbackName(raw.name);
  const readAt =
    typeof raw.readAt === "number" && Number.isFinite(raw.readAt) && raw.readAt > 0
      ? Math.round(raw.readAt)
      : undefined;
  const msg = name ? { id, text, createdAt, name } : { id, text, createdAt };
  if (readAt !== undefined) msg.readAt = readAt;
  return msg;
}

function loadFeedback() {
  try {
    if (!existsSync(FEEDBACK_PATH)) return { messages: [] };
    const raw = JSON.parse(readFileSync(FEEDBACK_PATH, "utf8"));
    const list = Array.isArray(raw?.messages) ? raw.messages : [];
    const seen = new Set();
    const messages = [];
    for (const row of list) {
      const msg = normalizeFeedbackMessage(row);
      if (!msg || seen.has(msg.id)) continue;
      seen.add(msg.id);
      messages.push(msg);
    }
    messages.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
    return { messages: messages.slice(0, MAX_FEEDBACK) };
  } catch {
    return { messages: [] };
  }
}

/** @param {{ messages: object[] }} store */
function saveFeedback(store) {
  const seen = new Set();
  const messages = [];
  for (const row of store.messages || []) {
    const msg = normalizeFeedbackMessage(row);
    if (!msg || seen.has(msg.id)) continue;
    seen.add(msg.id);
    messages.push(msg);
  }
  messages.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  const body = { messages: messages.slice(0, MAX_FEEDBACK) };
  writeFileSync(FEEDBACK_PATH, JSON.stringify(body, null, 2));
  return body;
}

/** @param {PresenceStore} store @param {number} [now] */
function activePresenceCount(store, now = Date.now()) {
  let n = 0;
  for (const at of Object.values(store.sessions)) {
    if (now - at <= PRESENCE_STALE_MS) n += 1;
  }
  return n;
}

/** @param {PresenceStore} store @param {number} [now] */
function recordPresencePeak(store, now = Date.now()) {
  const peak = activePresenceCount(store, now);
  const key = hourKey(now);
  store.buckets[key] = Math.max(store.buckets[key] ?? 0, peak);
  recordPresenceSample(store, now, peak);
  store.updatedAt = now;
  store.historyEpoch = PRESENCE_HISTORY_EPOCH;
}

/** Record changes rather than hourly peaks so the graph can move down and back up. */
function recordPresenceSample(store, now = Date.now(), count = activePresenceCount(store, now)) {
  const last = store.samples.at(-1);
  if (!last || last.count !== count) {
    store.samples.push({ at: now, count });
    if (store.samples.length > PRESENCE_MAX_SAMPLES) {
      store.samples.splice(0, store.samples.length - PRESENCE_MAX_SAMPLES);
    }
  }
}

/** @param {PresenceStore} store */
function presenceSnapshot(store) {
  const pruned = prunePresence(store);
  const buckets = Object.entries(pruned.buckets)
    .map(([key, count]) => ({ key, count, at: hourKeyToMs(key) }))
    .filter((b) => b.at > 0)
    .sort((a, b) => a.at - b.at);
  const nowAt = Date.now();
  const now = activePresenceCount(pruned, nowAt);
  const samples = pruned.samples.slice();
  const last = samples.at(-1);
  if (!last || last.count !== now || nowAt - last.at > 1_000) {
    samples.push({ at: nowAt, count: now });
  }
  return {
    ok: true,
    now,
    buckets,
    samples,
    updatedAt: pruned.updatedAt,
    source: "server",
    racing: [...rooms.values()].reduce((n, room) => n + room.clients.size, 0),
    rooms: [...rooms.values()].map((room) => ({
      room: room.name,
      players: room.clients.size,
      phase: room.phase,
      maxPlayers: room.maxPlayers,
    })),
  };
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Access-Control-Max-Age", "86400");
}

/* ── Abuse guards ─────────────────────────────────────────────── */
/** Per-IP sliding-window rate limiter (in-memory; per-endpoint limits below). */
const rateBuckets = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, b);
  }
  b.count += 1;
  return b.count <= limit;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of rateBuckets) if (now > b.resetAt) rateBuckets.delete(k);
}, 60_000).unref();

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function tooMany(res, req, bucket, limit, windowMs) {
  if (rateLimit(`${bucket}:${clientIp(req)}`, limit, windowMs)) return false;
  res.writeHead(429, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "rate limited — slow down" }));
  return true;
}

/** Read a request body with a hard size cap; null when exceeded. */
async function readBody(req, limitBytes) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limitBytes) return null;
  }
  return body;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

/** @param {import('node:http').ServerResponse} res @param {string} filePath */
function sendStaticFile(res, filePath) {
  try {
    const data = readFileSync(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "public, max-age=60" });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

/** Serve Vite `dist` (under STATIC_BASE when set, else from `/`). */
function tryServeStatic(urlPath, res) {
  if (!DIST_DIR) {
    console.warn("[static] dist/ missing — run npm run build before start");
    return false;
  }
  let path = urlPath.split("?")[0] || "/";
  if (STATIC_BASE) {
    if (path === STATIC_BASE || path.startsWith(`${STATIC_BASE}/`)) {
      path = path.slice(STATIC_BASE.length) || "/";
    } else if (path === "/" || path === "") {
      res.writeHead(302, { Location: `${STATIC_BASE}/` });
      res.end();
      return true;
    } else {
      return false;
    }
  }
  if (path === "/" || path.endsWith("/")) path = `${path.replace(/\/$/, "")}/index.html`;
  const rel = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^\//, "");
  const filePath = join(DIST_DIR, rel || "index.html");
  if (!filePath.startsWith(DIST_DIR)) return false;
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return sendStaticFile(res, filePath);
  }
  // SPA fallback for client routes
  const index = join(DIST_DIR, "index.html");
  if (existsSync(index) && !rel.includes(".")) return sendStaticFile(res, index);
  return false;
}

/** @param {import('ws').WebSocket} ws @param {object} msg */
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

/** @param {Room} room */
function roomPlayers(room) {
  return [...room.clients.values()].map((c) => c.pose);
}

/**
 * Compact binary racing state for any lobby size (2–6).
 * Layout: u8 type | f64 at | u8 count | count × (8-byte id | 4×f32 xzh s | u8 gear | u8 lap)
 * @param {Pose[]} players
 * @param {number} at
 */
function encodeStateBinary(players, at) {
  const n = Math.min(MAX_PLAYERS, players.length);
  const buf = Buffer.allocUnsafe(10 + n * 26);
  let o = 0;
  buf.writeUInt8(STATE_BIN_TYPE, o++);
  buf.writeDoubleLE(at, o);
  o += 8;
  buf.writeUInt8(n, o++);
  for (let i = 0; i < n; i++) {
    const p = players[i];
    const id = String(p.id || "").slice(0, 8);
    buf.fill(0, o, o + 8);
    buf.write(id, o, "ascii");
    o += 8;
    buf.writeFloatLE(+p.x || 0, o);
    o += 4;
    buf.writeFloatLE(+p.z || 0, o);
    o += 4;
    buf.writeFloatLE(+p.h || 0, o);
    o += 4;
    buf.writeFloatLE(+p.s || 0, o);
    o += 4;
    buf.writeUInt8(String(p.g || "1").charCodeAt(0) & 0xff, o++);
    buf.writeUInt8(Math.max(1, Math.min(99, p.lap | 0)), o++);
  }
  return buf.subarray(0, o);
}

/** @param {Room} room @param {object} msg @param {string} [except] */
function broadcast(room, msg, except) {
  const raw = JSON.stringify(msg);
  for (const c of room.clients.values()) {
    if (except && c.id === except) continue;
    if (c.ws.readyState === 1) c.ws.send(raw);
  }
}

function shuffledVoteTracks() {
  const options = [...TRACK_IDS];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

/** @param {Room} room */
function broadcastVoteState(room) {
  const votes = Object.fromEntries(room.voteOptions.map((id) => [id, 0]));
  for (const vote of room.votes.values()) {
    if (vote.trackId in votes) votes[vote.trackId] += 1;
  }
  broadcast(room, {
    t: "voteUpdate",
    votes,
    received: room.votes.size,
    total: room.clients.size,
  });
}

/** Select highest votes; equal counts go to the map that received its first vote first. */
function resolveMapVote(room) {
  if (room.phase !== "finished" || room.clients.size === 0) return;
  const ranked = room.voteOptions.map((trackId, optionIndex) => {
    let count = 0;
    let firstOrder = Infinity;
    for (const vote of room.votes.values()) {
      if (vote.trackId !== trackId) continue;
      count += 1;
      firstOrder = Math.min(firstOrder, vote.order);
    }
    return { trackId, count, firstOrder, optionIndex };
  });
  ranked.sort(
    (a, b) =>
      b.count - a.count ||
      a.firstOrder - b.firstOrder ||
      a.optionIndex - b.optionIndex,
  );
  const selected = ranked[0]?.trackId;
  if (!selected) return;

  room.phase = "starting";
  room.trackId = selected;
  broadcast(room, { t: "voteResult", trackId: selected });

  setTimeout(() => {
    if (rooms.get(room.name) !== room || room.phase !== "starting") {
      console.log(`[next-skip] ${room.name} exists=${rooms.get(room.name) === room} phase=${room.phase} clients=${room.clients.size}`);
      return;
    }
    room.phase = "racing";
    room.winnerId = "";
    room.voteOptions = [];
    room.votes.clear();
    room.voteOrder = 0;
    room.voteEndsAt = 0;
    for (const client of room.clients.values()) {
      client.pose.s = 0;
      client.pose.g = "1";
      client.pose.lap = 1;
      client.lastPoseAt = 0;
    }
    const at = Date.now() + 250;
    broadcast(room, { t: "start", at, trackId: room.trackId, kind: room.kind, weather: room.weather });
    console.log(`[next] ${room.name} → ${room.trackId} ${room.weather} (${room.clients.size}p)`);
  }, 1800);
}

/** @param {Room} room */
function pickColor(room) {
  const used = new Set([...room.clients.values()].map((c) => c.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[(Math.random() * PLAYER_COLORS.length) | 0];
}

/** @param {Room} room */
function lobbySnapshot(room) {
  return {
    t: "lobby",
    players: roomPlayers(room),
    trackId: room.trackId,
    kind: room.kind,
    weather: room.weather || "dry",
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    event: eventInfo(room),
  };
}

/** @param {Room} room — Event Mode state for lobby/UI, or null for normal rooms. */
function eventInfo(room) {
  if (!room.isEvent) return null;
  const paidIds = [];
  for (const [id, b] of room.buyIns) if (b.paidAt > 0) paidIds.push(id);
  return {
    buyInSats: room.buyInSats,
    feeSats: room.buyInFeeSats || 0,
    paidIds,
    potSats: room.potSats,
    mock: payments.mock,
  };
}

/** Create a buy-in payment request (NUT-18 creq) for a freshly joined event-room racer. */
async function createBuyInInvoice(room, client) {
  try {
    // Invoice the advertised buy-in only. Mint receive fees come out of the pot
    // after the swap — payers should see 10 sats, not 11.
    room.buyInFeeSats = 0;
    const inv = await payments.createPaymentRequest({
      amountSats: room.buyInSats,
      memo: `Sats Racer event ${room.name} — buy-in ${room.buyInSats} sats`,
      baseUrl: PUBLIC_BASE_URL,
      potId: room.potId,
    });
    // Room may have been replaced/deleted or the racer left while awaiting
    if (rooms.get(room.name) !== room || !room.clients.has(client.id)) return;
    room.buyIns.set(client.id, {
      paymentHash: inv.paymentHash,
      paymentRequest: inv.paymentRequest,
      bolt11: inv.bolt11 || "",
      paidAt: 0,
    });
    send(client.ws, {
      t: "eventInvoice",
      paymentRequest: inv.paymentRequest,
      bolt11: inv.bolt11 || "",
      amountSats: room.buyInSats,
      buyInSats: room.buyInSats,
      feeSats: 0,
      mock: payments.mock,
    });
    potLog(room, "info", `buy-in request for ${client.name} · ${room.buyInSats} sats`);
  } catch (err) {
    console.warn(`[event] payment request failed for ${client.name}:`, err?.message || err);
    potLog(room, "error", `buy-in request failed for ${client.name}: ${String(err?.message || err).slice(0, 160)}`);
    send(client.ws, { t: "error", message: "could not create buy-in request — try rejoining" });
  }
}

/** Mark a racer's buy-in as paid (from /api/ecash/pay or a pasted token). */
function markBuyInPaid(room, clientId, netSats) {
  const buyIn = room.buyIns.get(clientId);
  if (!buyIn || buyIn.paidAt) return false;
  buyIn.paidAt = Date.now();
  // What actually landed in the pot wallet after mint fees (fallback: full buy-in)
  buyIn.netSats = Number.isFinite(netSats) ? Math.max(0, Math.round(netSats)) : room.buyInSats;
  const client = room.clients.get(clientId);
  console.log(`[event] ${room.name} buy-in paid by ${client?.name || clientId} (net ${buyIn.netSats})`);
  potLog(room, "info", `${client?.name || clientId} paid · net ${buyIn.netSats} sats`);
  if (client) broadcast(room, { t: "notice", text: `${client.name} paid the buy-in` });
  broadcast(room, lobbySnapshot(room));
  return true;
}

/** Find (room, clientId) for a payment-request id across event rooms. */
function findBuyInByHash(paymentHash) {
  for (const room of rooms.values()) {
    if (!room.isEvent) continue;
    for (const [clientId, buyIn] of room.buyIns) {
      if (buyIn.paymentHash === paymentHash) return { room, clientId };
    }
  }
  return null;
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {object} msg
 * @param {'create' | 'join'} mode
 */
function admitClient(ws, msg, mode) {
  const roomName = sanitizeRoomName(msg.room);
  const password = sanitizePassword(msg.password);
  const name = sanitizeDriverName(msg.name || "Racer");
  const accent = normalizeColor(msg.accent, 0xff3b2e);

  /** @type {Room | undefined} */
  let room = rooms.get(roomName);

  if (mode === "create") {
    if (room && room.clients.size > 0) {
      send(ws, { t: "error", message: "room already exists — pick another name or join it" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    // Replace empty/stale leftover rooms so recreate always works
    room = {
      name: roomName,
      password,
      maxPlayers: clampMaxPlayers(msg.maxPlayers),
      trackId: normalizeTrackId(msg.trackId),
      kind: normalizeKind(msg.kind),
      weather: normalizeWeather(msg.weather),
      hostId: "",
      phase: "lobby",
      winnerId: "",
      voteOptions: [],
      votes: new Map(),
      voteOrder: 0,
      voteEndsAt: 0,
      lastCrashAt: 0,
      clients: new Map(),
      // Event Mode: buy-in gate + winner-takes-the-pot
      isEvent: !!msg.event,
      buyInSats: clampBuyIn(msg.event?.buyInSats),
      buyInFeeSats: 0,
      buyIns: new Map(),
      potSats: 0,
      potId: msg.event ? randomUUID() : "",
      potClaimed: false,
      potLogs: [],
      payoutTipSats: 0,
      payoutTipCollected: false,
      payoutTipToken: "",
    };
    rooms.set(roomName, room);
    if (room.isEvent) {
      potLog(room, "info", `created · buy-in ${room.buyInSats} sats`);
    }
  } else {
    if (!room || room.clients.size === 0) {
      send(ws, { t: "error", message: "room not found" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    if (room.phase !== "lobby") {
      send(ws, { t: "error", message: "race already started" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    // Room types stay separate — event rooms join from Event Mode, normal rooms from Multiplayer
    if (room.isEvent !== !!msg.event) {
      send(ws, {
        t: "error",
        message: room.isEvent
          ? "that's an event room — join it from Event Mode"
          : "not an event room — join it from Multiplayer",
      });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    if (password !== room.password) {
      send(ws, { t: "error", message: "wrong password" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    if (room.clients.size >= room.maxPlayers) {
      send(ws, { t: "error", message: `room full (max ${room.maxPlayers})` });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
  }

  // Room vehicle class is host-chosen at create — every racer uses it.
  const kind = room.kind;
  const id = Math.random().toString(36).slice(2, 10);
  const color = normalizeColor(msg.color, pickColor(room));
  const pubkey = normalizePubkey(msg.pubkey) ?? undefined;
  // Placeholder pose — clients snap everyone to a shared start-line grid on race start.
  const slot = room.clients.size;
  /** @type {Pose} */
  const pose = {
    id,
    name,
    color,
    accent,
    kind,
    pubkey,
    x: (slot % 4) * 2.3 - 3.4,
    z: -2 - Math.floor(slot / 4) * 3.5,
    h: 0,
    s: 0,
    g: "1",
    lap: 1,
  };

  /** @type {Client} */
  const client = { id, name, color, room: roomName, ws, pose, lastPoseAt: 0 };
  room.clients.set(id, client);
  if (!room.hostId || mode === "create") room.hostId = id;

  send(ws, {
    t: "welcome",
    id,
    room: roomName,
    players: roomPlayers(room),
    you: pose,
    hostId: room.hostId,
    trackId: room.trackId,
    kind: room.kind,
    weather: room.weather || "dry",
    maxPlayers: room.maxPlayers,
    phase: room.phase,
    event: eventInfo(room),
  });
  broadcast(room, { t: "join", player: pose }, id);
  broadcast(room, { t: "notice", text: `${name} joined` });
  broadcast(room, lobbySnapshot(room));
  // Event Mode: every racer gets their own buy-in invoice
  if (room.isEvent) void createBuyInInvoice(room, client);
  console.log(
    `[${mode}] ${name} (${kind}) → ${roomName} (${room.clients.size}/${room.maxPlayers}) track=${room.trackId} weather=${room.weather || "dry"}`,
  );
  return client;
}

let presence = loadPresence();

const httpServer = createServer(async (req, res) => {
  cors(res);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/api/leaderboard" && req.method === "GET") {
    const store = loadStore();
    const trackQ = url.searchParams.get("track");
    res.writeHead(200, { "Content-Type": "application/json" });
    if (trackQ) {
      const tid = normalizeTrackId(trackQ);
      res.end(JSON.stringify({ ok: true, trackId: tid, entries: sortBoard(store[tid] || [], tid), byTrack: store }));
    } else {
      res.end(JSON.stringify({ ok: true, byTrack: store }));
    }
    return;
  }

  if (url.pathname === "/api/leaderboard" && req.method === "POST") {
    if (tooMany(res, req, "board", 12, 60_000)) return;
    const body = await readBody(req, 64 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    try {
      const data = JSON.parse(body || "{}");
      // Verified-only board: submissions must be signed Nostr score events.
      const score = verifyScoreEvent(data.event);
      if (!score) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "valid signed score event required" }));
        return;
      }
      const tid = normalizeTrackId(score.trackId);
      /** @type {BoardEntry} */
      const entry = {
        name: sanitizeDriverName(score.name),
        timeMs: score.timeMs,
        bestLapMs: score.bestLapMs,
        at: score.at,
        trackId: tid,
        pubkey: score.pubkey,
        eventId: score.eventId,
      };
      const store = loadStore();
      store[tid] = sortBoard([...(store[tid] || []), entry], tid);
      saveStore(store);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, trackId: tid, entries: store[tid], byTrack: store }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "bad json" }));
    }
    return;
  }

  if (url.pathname === "/api/presence" && req.method === "GET") {
    presence = prunePresence(presence);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(presenceSnapshot(presence)));
    return;
  }

  // NUT-18 payment-request transport: payer wallets POST {id, mint, unit, proofs} here.
  if (url.pathname === "/api/ecash/pay" && req.method === "POST") {
    if (tooMany(res, req, "ecash", 20, 60_000)) return;
    const body = await readBody(req, 256 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    let found = null;
    try {
      if (payments.mock) throw new Error("mock mode");
      const raw = JSON.parse(body || "{}");
      const payload = raw?.payload && typeof raw.payload === "object" ? raw.payload : raw;
      found = findBuyInByHash(
        String(payload.id || raw.id || payload.paymentId || raw.payment_id || payload.i || ""),
      );
      if (!found) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "unknown payment id" }));
        return;
      }
      const buyIn = found.room.buyIns.get(found.clientId);
      // Idempotent: a timeout after a successful mint-swap looks like a failure
      // in the wallet, which then retries. 409 made that retry look like a
      // second error even though the sats were already in the pot.
      if (buyIn.paidAt) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      const fresh = await payments.receivePayload({
        paymentHash: buyIn.paymentHash,
        amountSats: found.room.buyInSats,
        payload,
        potId: found.room.potId,
      });
      const netSats = Array.isArray(fresh) && fresh.length
        ? fresh.reduce((a, p) => a + Number(p.amount), 0)
        : found.room.buyInSats;
      markBuyInPaid(found.room, found.clientId, netSats);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      const buyIn = found?.clientId ? found.room.buyIns.get(found.clientId) : null;
      if (found?.room && buyIn && payments.alreadyReceived?.(buyIn.paymentHash, found.room.potId)) {
        markBuyInPaid(found.room, found.clientId, found.room.buyInSats);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (found?.room) {
        potLog(found.room, "error", `Cashu receive failed: ${String(err?.message || err).slice(0, 160)}`);
      }
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 140) }));
    }
    return;
  }

  // Dev dashboard: tip stats + pending tip tokens (signed dev auth event required).
  if (url.pathname === "/api/dev/tips" && req.method === "POST") {
    if (tooMany(res, req, "dev", 30, 60_000)) return;
    const body = await readBody(req, 64 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    try {
      const data = JSON.parse(body || "{}");
      verifyDevEvent(data.event);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(await devTipsSummary()));
    } catch (err) {
      const status = Number(err?.status) || 400;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 120) }));
    }
    return;
  }

  // Dev dashboard: retry a failed tip collect, or mark a withdraw as copied.
  if (url.pathname === "/api/dev/claim" && req.method === "POST") {
    if (tooMany(res, req, "dev", 30, 60_000)) return;
    const body = await readBody(req, 64 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    try {
      const data = JSON.parse(body || "{}");
      verifyDevEvent(data.event);
      // Retry a failed tip collect (never landed in the tip wallet).
      if (data.retryAt != null) {
        const retryAt = Math.round(Number(data.retryAt));
        const list = loadPayouts();
        const rec = list.find(
          (r) => r && Number(r.at) === retryAt && !r.collected && Number(r.tipSats) > 0 && !r.mock,
        );
        if (!rec) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "tip not found (or already collected)" }));
          return;
        }
        try {
          if (rec.tipToken) {
            // Leftover bearer token — swap it into the tip wallet (burns the token).
            try {
              const net = await payments.receiveTipToken(rec.tipToken, Math.round(Number(rec.tipSats)));
              rec.tipSats = Number.isFinite(net) && net > 0 ? net : rec.tipSats;
            } catch (err) {
              if (err?.emergencyToken) {
                rec.tipToken = err.emergencyToken;
                savePayouts(list);
              }
              throw err;
            }
          } else {
            // Never left the pot — collect now.
            const result = await payments.collectTip(Math.round(Number(rec.tipSats)), rec.potId);
            rec.tipSats = result.sats;
            if (!result.collected) {
              rec.tipToken = result.token || rec.tipToken;
              savePayouts(list);
              throw new Error("tip swapped from pot but receive into tip wallet failed — retry again");
            }
          }
          rec.collected = true;
          rec.collectedAt = Date.now();
          delete rec.tipToken;
          savePayouts(list);
          console.log(`[dev] tip collected — ${rec.tipSats} sats (room ${rec.room})`);
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: `retry failed — ${String(err?.message || err).slice(0, 100)}`,
            }),
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(await devTipsSummary()));
        return;
      }
      // Mark the pending withdraw as copied (token already left the tip wallet).
      const marked = payments.markWithdrawCopied();
      if (marked > 0) markCollectedTipsClaimed();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...(await devTipsSummary()), marked }));
    } catch (err) {
      const status = Number(err?.status) || 400;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 120) }));
    }
    return;
  }

  // Dev dashboard: export the tip wallet as a cashuA token (paste into cashu.me).
  if (url.pathname === "/api/dev/withdraw" && req.method === "POST") {
    if (tooMany(res, req, "dev", 10, 60_000)) return;
    const body = await readBody(req, 64 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    try {
      const data = JSON.parse(body || "{}");
      verifyDevEvent(data.event);
      const walletSats = Math.max(0, Math.round(Number(await payments.tipBalanceSats()) || 0));
      const existing = payments.pendingWithdraw();
      const amountSats = existing
        ? existing.amountSats
        : Math.max(0, Math.round(Number(data.amountSats) || walletSats));
      if (!existing && amountSats <= 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "tip wallet is empty" }));
        return;
      }
      await payments.withdrawTip(amountSats);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(await devTipsSummary()));
    } catch (err) {
      const status = Number(err?.status) || 400;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 120) }));
    }
    return;
  }

  // Dev dashboard: feedback inbox — list (default), mark read, or delete.
  if (url.pathname === "/api/dev/feedback" && req.method === "POST") {
    if (tooMany(res, req, "dev", 30, 60_000)) return;
    const body = await readBody(req, 64 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    try {
      const data = JSON.parse(body || "{}");
      verifyDevEvent(data.event);
      const action = String(data.action || "list").toLowerCase();
      const id = String(data.id || "");
      let messages;
      if (action === "read" && id) {
        messages = markFeedbackRead(id);
      } else if (action === "delete" && id) {
        messages = deleteFeedback(id);
      } else {
        messages = devFeedbackList();
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, messages }));
    } catch (err) {
      const status = Number(err?.status) || 400;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 120) }));
    }
    return;
  }

  if (url.pathname === "/api/presence" && req.method === "POST") {
    if (tooMany(res, req, "presence", 30, 60_000)) return;
    const body = await readBody(req, 8 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    try {
      const data = JSON.parse(body || "{}");
      const id = normalizeSessionId(data.id);
      if (!id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "bad session id" }));
        return;
      }
      const now = Date.now();
      presence = prunePresence(presence, now);
      const action = String(data.action || "heartbeat").toLowerCase();
      if (action === "leave") {
        delete presence.sessions[id];
        recordPresenceSample(presence, now);
        presence.updatedAt = now;
        presence.historyEpoch = PRESENCE_HISTORY_EPOCH;
      } else {
        presence.sessions[id] = now;
        recordPresencePeak(presence, now);
      }
      presence = savePresence(presence);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(presenceSnapshot(presence)));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "bad json" }));
    }
    return;
  }

  if (url.pathname === "/api/feedback" && req.method === "GET") {
    // Inbox contents are private to the owner (emailed) — only expose a count.
    const store = loadFeedback();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, count: store.messages.length, source: "server" }));
    return;
  }

  if (url.pathname === "/api/feedback" && req.method === "POST") {
    if (tooMany(res, req, "feedback", 5, 60_000)) return;
    const body = await readBody(req, 16 * 1024);
    if (body === null) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "payload too large" }));
      return;
    }
    try {
      const data = JSON.parse(body || "{}");
      const msg = normalizeFeedbackMessage({
        id: data.id,
        text: data.text,
        createdAt: data.createdAt ?? Date.now(),
        name: data.name,
      });
      if (!msg) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "bad feedback" }));
        return;
      }
      const store = loadFeedback();
      store.messages = [msg, ...store.messages.filter((m) => m.id !== msg.id)];
      const saved = saveFeedback(store);
      // Forward to the feedback inbox (best-effort — local log is the backup)
      let emailed = false;
      try {
        await sendFeedbackEmail(msg);
        emailed = true;
      } catch (err) {
        console.warn(`[feedback] email relay failed:`, err?.message || err);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, messages: saved.messages, source: "server", emailed }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "bad json" }));
    }
    return;
  }

  if (url.pathname === "/healthz" || url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  if (url.pathname === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    const stats = [...rooms.values()].map((room) => ({
      room: room.name,
      players: room.clients.size,
      phase: room.phase,
      maxPlayers: room.maxPlayers,
      trackId: room.trackId,
    }));
    res.end(
      JSON.stringify({
        ok: true,
        rooms: stats,
        presence: presenceSnapshot(prunePresence(presence)),
        payments: payments.mock ? "mock" : "live",
        mint: payments.mintUrl,
        devPubkey: /^[0-9a-f]{64}$/.test(DEV_PUBKEY) ? DEV_PUBKEY : null,
      }),
    );
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    if (tryServeStatic(url.pathname, res)) return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  // Disable Nagle: 30Hz pose frames are tiny — buffering them for ACKs clumps
  // delivery into freeze-then-burst (the classic "everyone teleports" jank).
  ws._socket?.setNoDelay?.(true);
  /** @type {Client | null} */
  let client = null;

  ws.on("message", (data) => {
    // Hard cap: legit messages are ≤ a few KB (claimPot carries a token).
    if (data.length > 16_384) {
      send(ws, { t: "error", message: "message too large" });
      return;
    }
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      send(ws, { t: "error", message: "bad json" });
      return;
    }

    if (msg.t === "ping") {
      send(ws, { t: "pong", n: msg.n });
      return;
    }

    if (msg.t === "create" || msg.t === "join") {
      if (client) return;
      client = admitClient(ws, msg, msg.t === "create" ? "create" : "join");
      return;
    }

    if (!client) {
      send(ws, { t: "error", message: "join first" });
      return;
    }

    const room = rooms.get(client.room);
    if (!room) {
      send(ws, { t: "error", message: "room gone" });
      return;
    }

    if (msg.t === "start") {
      if (client.id !== room.hostId) {
        send(ws, { t: "error", message: "only the host can start" });
        return;
      }
      if (room.phase !== "lobby") return;
      // Event Mode: the pot must be fully bought in before the race can start
      if (room.isEvent) {
        const unpaid = [...room.clients.values()].filter((c) => !room.buyIns.get(c.id)?.paidAt);
        if (unpaid.length > 0) {
          send(ws, { t: "error", message: `waiting for buy-ins: ${unpaid.map((c) => c.name).join(", ")}` });
          return;
        }
        // Pot = what actually landed (mint fees absorbed by the house)
        room.potSats = [...room.clients.values()].reduce(
          (sum, c) => sum + (room.buyIns.get(c.id)?.netSats ?? room.buyInSats),
          0,
        );
        potLog(room, "info", `race start · pot ${room.potSats} sats · ${room.clients.size} paid`);
      }
      if (msg.trackId != null) room.trackId = normalizeTrackId(msg.trackId);
      // Host may re-assert create-room weather on play (belt-and-suspenders).
      if (msg.weather != null && msg.weather !== "") {
        room.weather = normalizeWeather(msg.weather);
      }
      room.phase = "racing";
      room.winnerId = "";
      room.voteOptions = [];
      room.votes.clear();
      room.voteOrder = 0;
      room.voteEndsAt = 0;
      const at = Date.now() + 250;
      broadcast(room, {
        t: "start",
        at,
        trackId: room.trackId,
        kind: room.kind,
        weather: room.weather || "dry",
      });
      console.log(`[start] ${room.name} by ${client.name} → ${room.trackId} ${room.kind} ${room.weather || "dry"} (${room.clients.size}p)`);
      return;
    }

    if (msg.t === "pose") {
      // Keep poses flowing while finished too — the finisher's car coasts to a
      // stop and remotes must see it settle, not freeze mid-corner.
      if (room.phase !== "racing" && room.phase !== "finished") return;
      const now = Date.now();
      // Accept jitter around the 90Hz client cadence (drops ~2× tick-rate senders).
      if (now - client.lastPoseAt < NET_TICK_MS * 0.55) return;
      client.lastPoseAt = now;
      const p = client.pose;
      // Sanity clamps — the client is untrusted; keep poses inside plausible bounds.
      p.x = Math.max(-20_000, Math.min(20_000, +msg.x || 0));
      p.z = Math.max(-20_000, Math.min(20_000, +msg.z || 0));
      p.h = Math.max(-10, Math.min(10, +msg.h || 0));
      p.s = Math.max(-150, Math.min(150, +msg.s || 0)); // ±540 km/h ceiling
      p.g = String(msg.g || "1").slice(0, 2);
      p.lap = Math.max(1, Math.min(99, msg.lap | 0));
      // Ignore client kind — room class is locked by the host at create.
      p.kind = room.kind;
      if (Number.isFinite(Number(msg.color)) && Number(msg.color) > 0) {
        p.color = Math.round(Number(msg.color)) & 0xffffff;
        client.color = p.color;
      }
      if (Number.isFinite(Number(msg.accent)) && Number(msg.accent) > 0) {
        p.accent = Math.round(Number(msg.accent)) & 0xffffff;
      }
    }

    if (msg.t === "crash") {
      if (room.phase !== "racing" || room.winnerId) return;
      const now = Date.now();
      // Debounce so multiple near-simultaneous explodes don't spam resets
      if (room.lastCrashAt && now - room.lastCrashAt < 2_000) return;
      room.lastCrashAt = now;
      for (const c of room.clients.values()) {
        c.pose.s = 0;
        c.pose.lap = 1;
        c.pose.g = "1";
      }
      broadcast(room, {
        t: "crashReset",
        byId: client.id,
        byName: client.name,
      });
      broadcast(room, { t: "notice", text: `${client.name} crashed — restarting` });
      console.log(`[crash] ${room.name} by ${client.name} → reset grid`);
      return;
    }

    if (msg.t === "finish") {
      if (room.phase !== "racing" || room.winnerId) return;
      const timeMs = Math.max(1_000, Math.min(3_600_000, Math.round(Number(msg.timeMs) || 0)));
      room.winnerId = client.id;
      room.phase = "finished";
      // Event Mode: one race, winner takes the pot — no map vote / next round
      if (room.isEvent) {
        void (async () => {
          // Attach the payout fee budget (both sends: winner + tip) so the
          // winner's checkout shows the real split.
          const info = eventInfo(room);
          if (info) {
            const perSend = Math.max(0, await payments.sendFeeSats(room.potId).catch(() => 0));
            info.potFeeSats = perSend * 2;
          }
          if (rooms.get(room.name) !== room) return;
          broadcast(room, {
            t: "raceResult",
            winnerId: client.id,
            winnerName: client.name,
            timeMs,
            trackOptions: [],
            voteEndsAt: 0,
            event: info,
          });
        })();
        potLog(room, "info", `finished · ${client.name} won · accounted ${room.potSats} sats`);
        console.log(`[event] ${room.name} won by ${client.name} — pot ${room.potSats} sats`);
        return;
      }
      room.voteOptions = shuffledVoteTracks();
      room.votes.clear();
      room.voteOrder = 0;
      room.voteEndsAt = Date.now() + MAP_VOTE_MS;
      broadcast(room, {
        t: "raceResult",
        winnerId: client.id,
        winnerName: client.name,
        timeMs,
        trackOptions: room.voteOptions,
        voteEndsAt: room.voteEndsAt,
      });
      console.log(`[finish] ${room.name} won by ${client.name} in ${timeMs}ms`);
      broadcastVoteState(room);
      setTimeout(() => resolveMapVote(room), MAP_VOTE_MS);
      return;
    }

    if (msg.t === "vote") {
      if (room.phase !== "finished" || room.votes.has(client.id)) return;
      const trackId = String(msg.trackId || "");
      if (!room.voteOptions.includes(trackId)) return;
      room.votes.set(client.id, { trackId, order: ++room.voteOrder });
      broadcastVoteState(room);
      return;
    }

    if (msg.t === "submitToken") {
      // Manual fallback: player pastes a cashuA token instead of scanning the request.
      if (!room.isEvent || room.phase !== "lobby" || payments.mock) return;
      const buyIn = room.buyIns.get(client.id);
      if (!buyIn || buyIn.paidAt) return;
      void (async () => {
        try {
          const fresh = await payments.receiveToken({
            amountSats: room.buyInSats,
            token: String(msg.token || ""),
          });
          await depositProofs(fresh, room.potId);
          markBuyInPaid(room, client.id, fresh.reduce((a, p) => a + Number(p.amount), 0));
        } catch (err) {
          potLog(room, "error", `pasted token rejected for ${client.name}: ${String(err?.message || err).slice(0, 160)}`);
          send(ws, { t: "error", message: `token rejected — ${String(err?.message || err).slice(0, 100)}` });
        }
      })();
      return;
    }

    if (msg.t === "claimPot") {
      if (!room.isEvent || room.phase !== "finished") return;
      if (client.id !== room.winnerId) return;
      if (room.potClaimed || room.potSats <= 0) {
        send(ws, { t: "payoutResult", ok: false, error: "pot already claimed" });
        return;
      }
      const tipPercent = Math.max(0, Math.min(100, Math.round(Number(msg.tipPercent) || 0)));
      room.potClaimed = true; // lock before paying — no double claims
      potLog(room, "info", `claim started by ${client.name} · tip ${tipPercent}%`);
      void (async () => {
        try {
          // Fee comes OUT OF THE POT, never out of the dev tip. The tip is paid
          // FIRST and whole at the chosen percent, then swapped into the tip
          // wallet at the mint so the bearer token never sits around to be
          // double-spent. The winner then gets what's left minus their send fee.
          const perSendFee = Math.max(0, await payments.sendFeeSats(room.potId).catch(() => 0));
          const balanceNow = async () =>
            Promise.resolve()
              .then(() => payments.potBalanceSats?.(room.potId))
              .then((v) => (Number.isFinite(v) ? v : 0))
              .catch(() => 0);

          // 1) Dev tip first — collect into the tip wallet. Skip if a previous
          //    attempt already moved it (winner send may have failed after).
          let tipSats = room.payoutTipSats || 0;
          let tipCollected = room.payoutTipCollected === true;
          if (!tipCollected && room.payoutTipToken) {
            try {
              const net = await payments.receiveTipToken(room.payoutTipToken, tipSats);
              tipSats = Number.isFinite(net) && net > 0 ? net : tipSats;
              tipCollected = true;
              room.payoutTipCollected = true;
              room.payoutTipSats = tipSats;
              room.payoutTipToken = "";
            } catch (err) {
              // Mint swap burned the old bearer — keep the re-encoded secrets for retry.
              if (err?.emergencyToken) room.payoutTipToken = err.emergencyToken;
              console.warn(`[event] leftover tip token collect failed:`, err?.message || err);
              potLog(room, "warn", `leftover tip token collect failed: ${String(err?.message || err).slice(0, 160)}`);
            }
          }
          if (!tipCollected && !room.payoutTipToken) {
            const tipWanted = Math.floor((room.potSats * tipPercent) / 100);
            const tipCap = Math.min(tipWanted, Math.max(0, (await balanceNow()) - perSendFee));
            if (tipCap > 0) {
              const result = await payments.collectTip(tipCap, room.potId);
              tipSats = result.sats;
              tipCollected = result.collected === true;
              room.payoutTipSats = tipSats;
              room.payoutTipCollected = tipCollected;
              room.payoutTipToken = result.token || "";
              if (!tipCollected) {
                potLog(room, "warn", `tip ${tipSats} swapped from pot but tip-wallet receive failed`);
              }
            } else {
              room.payoutTipSats = 0;
              room.payoutTipCollected = true;
            }
          }

          // 2) Winner gets everything left in THIS event's pot, minus send fee.
          const remaining = await balanceNow();
          const winnerSats = Math.max(0, remaining - perSendFee);
          if (winnerSats <= 0 && tipSats <= 0) throw new Error("pot too small to pay out");
          let winnerToken = "";
          if (winnerSats > 0) {
            const sent = await payments.sendToken(winnerSats, { includeFees: true, potId: room.potId });
            winnerToken = sent.token;
          }

          const feeSats = Math.max(0, room.potSats - winnerSats - tipSats);
          recordPayout({
            room: room.name,
            potId: room.potId,
            winnerId: client.id,
            winnerPubkey: client.pose.pubkey || null,
            potSats: room.potSats,
            winnerSats,
            tipSats,
            tipPercent,
            feeSats,
            collected: tipCollected,
            collectedAt: tipCollected ? Date.now() : null,
            // Leftover bearer token stays on disk for a server-side retry only.
            tipToken: tipCollected ? null : room.payoutTipToken || null,
            mock: payments.mock,
          });
          send(ws, {
            t: "payoutResult",
            ok: true,
            token: winnerToken,
            winnerSats,
            tipSats,
            tipCollected,
            feeSats,
            mock: payments.mock,
          });
          broadcast(room, { t: "notice", text: `${client.name} claimed the pot — ${winnerSats} sats` });
          potLog(
            room,
            tipCollected ? "info" : "warn",
            `claimed · ${client.name} ${winnerSats} · tip ${tipSats}${tipCollected ? "" : " pending"} · fee ${feeSats}`,
          );
          console.log(
            `[event] ${room.name} pot ${room.potSats} sats → ${client.name} ${winnerSats} · tip ${tipSats}${tipCollected ? " collected" : " pending"} · fee ${feeSats}`,
          );
        } catch (err) {
          room.potClaimed = false; // payment failed — allow retry (tip already collected is skipped)
          potLog(room, "error", `claim failed: ${String(err?.message || err).slice(0, 160)}`);
          send(ws, { t: "payoutResult", ok: false, error: String(err?.message || err).slice(0, 140) });
        }
      })();
      return;
    }
  });

  ws.on("close", () => {
    if (!client) return;
    const room = rooms.get(client.room);
    if (!room) {
      client = null;
      return;
    }
    room.clients.delete(client.id);
    room.votes.delete(client.id);
    room.buyIns.delete(client.id); // event: drop their buy-in record (v1 — paid buy-ins are not refunded)
    console.log(`[leave] ${client.name}`);
    if (room.clients.size === 0) {
      potLog(room, "info", "last player left — room closed (pot file kept)");
      rooms.delete(client.room);
    } else {
      if (room.hostId === client.id) {
        room.hostId = room.clients.keys().next().value;
      }
      broadcast(room, { t: "leave", id: client.id, hostId: room.hostId });
      broadcast(room, { t: "notice", text: `${client.name} left` });
      if (room.phase === "lobby") broadcast(room, lobbySnapshot(room));
      if (room.phase === "finished") {
        broadcastVoteState(room);
      }
    }
    client = null;
  });
});

setInterval(() => {
  const at = Date.now();
  for (const room of rooms.values()) {
    // Same 30Hz binary state for every room size (2 through 6) — keeps flowing
    // through the finished phase so remotes see finishers park instead of freezing.
    // ~218 B/frame × 30 × 6 clients ≈ 39 KB/s/room — fine for small lobbies.
    if ((room.phase !== "racing" && room.phase !== "finished") || room.clients.size === 0) continue;
    const raw = encodeStateBinary(roomPlayers(room), at);
    for (const c of room.clients.values()) {
      if (c.ws.readyState === 1) c.ws.send(raw);
    }
  }
}, NET_TICK_MS);

// Event Mode: mock auto-pays after ~3s; live mode also polls Lightning mint
// quotes (Cashu POSTs land via /api/ecash/pay without polling).
setInterval(() => {
  if (!payments.settleIfPaid) return;
  for (const room of rooms.values()) {
    if (!room.isEvent || room.phase !== "lobby") continue;
    for (const [id, buyIn] of room.buyIns) {
      if (buyIn.paidAt > 0) continue;
      void payments.settleIfPaid(buyIn.paymentHash).then((settled) => {
        if (!settled || rooms.get(room.name) !== room) return;
        if (buyIn.paidAt > 0) return;
        markBuyInPaid(room, id, settled.netSats);
      }).catch((err) => {
        console.warn("[event] settleIfPaid failed:", err?.message || err);
        potLog(room, "warn", `Lightning settle poll failed: ${String(err?.message || err).slice(0, 160)}`);
      });
    }
  }
}, 2_000);

// Drop stale presence sessions periodically so GET stays fresh without heartbeats.
setInterval(() => {
  const next = prunePresence(presence);
  if (Object.keys(next.sessions).length !== Object.keys(presence.sessions).length) {
    recordPresenceSample(next);
    presence = savePresence(next);
  } else {
    presence = next;
  }
}, 15_000);

httpServer.listen(PORT, HOST, () => {
  console.log(
    `Sats Racer http://${HOST}:${PORT} (WS + /api/*${DIST_DIR ? ` + static ${STATIC_BASE || "/"}` : ""})`,
  );
  // Rebuild the board from the relays on boot (redeploys wipe the disk cache),
  // then keep merging every 15 min so instances converge.
  void syncBoardFromRelays();
  setInterval(() => void syncBoardFromRelays(), BOARD_RELAY_REFRESH_MS).unref();
});
