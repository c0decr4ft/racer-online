/**
 * Ring-buffer activity log for the developer dashboard — games + payments.
 * Persisted to server/activity.json (gitignored). Newest entries last on disk;
 * loadActivity() returns newest-first for the UI.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const ACTIVITY_PATH = join(DIR, "activity.json");
const MAX_ACTIVITY = 300;

/**
 * @typedef {{
 *   at: number,
 *   type: 'game' | 'payment',
 *   kind: string,
 *   room?: string,
 *   detail: string,
 *   level?: 'info' | 'warn' | 'error',
 *   player?: string,
 *   playerId?: string,
 *   sats?: number,
 *   tipSats?: number,
 *   potSats?: number,
 *   ok?: boolean,
 *   mock?: boolean,
 * }} ActivityEntry
 */

/** @type {ActivityEntry[] | null} */
let cache = null;

function readAll() {
  if (cache) return cache;
  try {
    if (!existsSync(ACTIVITY_PATH)) {
      cache = [];
      return cache;
    }
    const raw = JSON.parse(readFileSync(ACTIVITY_PATH, "utf8"));
    cache = Array.isArray(raw) ? raw : Array.isArray(raw?.entries) ? raw.entries : [];
  } catch {
    cache = [];
  }
  return cache;
}

function writeAll(list) {
  cache = list.slice(-MAX_ACTIVITY);
  try {
    writeFileSync(ACTIVITY_PATH, JSON.stringify(cache, null, 2));
  } catch {
    /* ignore disk errors — in-memory still useful */
  }
}

/**
 * Classify a potLog-style message as game vs payment.
 * @param {string} msg
 * @returns {'game' | 'payment'}
 */
export function classifyActivityMsg(msg) {
  if (
    /\b(buy-in|paid|claim|tip|leftover|invoice|Cashu|payout|token|receive|withdraw|sats →)\b/i.test(
      String(msg || ""),
    )
  ) {
    return "payment";
  }
  return "game";
}

/**
 * Infer a short kind slug from a free-form detail line.
 * @param {string} msg
 */
export function inferActivityKind(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("ws handler") || m.includes("ws error")) return "ws-error";
  if (m.includes("room already") || m.includes("room not found") || m.includes("room full") || m.includes("wrong password") || m.includes("room gone")) {
    return "room-error";
  }
  if (m.includes("created")) return "room-created";
  if (m.includes("race start") || m.includes("battle cubes")) return "race-start";
  if (m.includes("finished")) return "race-finish";
  if (m.includes("room closed") || m.includes("last player left")) return "room-closed";
  if (m.includes("buy-in request")) return "buy-in-request";
  if (m.includes("paid")) return "buy-in-paid";
  if (m.includes("battle leftover")) return "battle-leftover";
  if (m.includes("battle claim")) return "battle-claim";
  if (m.includes("claim started") || m.includes("claimed")) return "claim";
  if (m.includes("cashu receive failed") || m.includes("buy-in request failed") || m.includes("invoice")) return "invoice-failed";
  if (m.includes("persist") || m.includes("money at risk") || m.includes("emergency")) return "cashu-persist";
  if (m.includes("rejected") || m.includes("failed") || m.includes("error")) return "payment-failed";
  if (m.includes("joined")) return "player-joined";
  return "note";
}

/** Infer warn/error from free-form text when callers omit level. */
function inferActivityLevel(detail, ok) {
  if (ok === false) return "error";
  const m = String(detail || "").toLowerCase();
  if (/\b(failed|error|rejected|refusing|money at risk|emergency)\b/.test(m)) return "error";
  if (/\b(warn|retry|skipped|holding token)\b/.test(m)) return "warn";
  return "info";
}

/**
 * Append one activity row. Safe to call from hot paths; never throws.
 * @param {Partial<ActivityEntry> & { detail: string, type?: 'game' | 'payment' }} entry
 */
export function appendActivity(entry) {
  try {
    const detail = String(entry?.detail || "").trim().slice(0, 240);
    if (!detail) return;
    const type = entry.type === "payment" || entry.type === "game" ? entry.type : classifyActivityMsg(detail);
    const level =
      entry.level === "warn" || entry.level === "error"
        ? entry.level
        : inferActivityLevel(detail, entry.ok);
    /** @type {ActivityEntry} */
    const row = {
      at: Number(entry.at) || Date.now(),
      type,
      kind: String(entry.kind || inferActivityKind(detail)).slice(0, 40),
      detail,
      level,
    };
    const room = String(entry.room || "").trim().slice(0, 48);
    if (room) row.room = room;
    const player = String(entry.player || "").trim().slice(0, 32);
    if (player) row.player = player;
    const playerId = String(entry.playerId || "").trim().slice(0, 40);
    if (playerId) row.playerId = playerId;
    if (Number.isFinite(Number(entry.sats))) row.sats = Math.round(Number(entry.sats));
    if (Number.isFinite(Number(entry.tipSats))) row.tipSats = Math.round(Number(entry.tipSats));
    if (Number.isFinite(Number(entry.potSats))) row.potSats = Math.round(Number(entry.potSats));
    if (entry.ok === true || entry.ok === false) row.ok = entry.ok;
    if (entry.mock === true) row.mock = true;

    const list = readAll();
    list.push(row);
    writeAll(list);
  } catch {
    /* never break gameplay for logging */
  }
}

/**
 * Newest-first slice for the dashboard.
 * @param {number} [limit]
 * @returns {ActivityEntry[]}
 */
export function loadActivity(limit = 100) {
  const n = Math.max(1, Math.min(MAX_ACTIVITY, Math.round(Number(limit)) || 100));
  return readAll()
    .slice()
    .reverse()
    .slice(0, n)
    .map((e) => ({
      at: Number(e.at) || 0,
      type: e.type === "payment" ? "payment" : "game",
      kind: String(e.kind || "note"),
      detail: String(e.detail || "").slice(0, 240),
      level: e.level === "warn" || e.level === "error" ? e.level : "info",
      ...(e.room ? { room: String(e.room) } : {}),
      ...(e.player ? { player: String(e.player) } : {}),
      ...(e.playerId ? { playerId: String(e.playerId) } : {}),
      ...(Number.isFinite(Number(e.sats)) ? { sats: Math.round(Number(e.sats)) } : {}),
      ...(Number.isFinite(Number(e.tipSats)) ? { tipSats: Math.round(Number(e.tipSats)) } : {}),
      ...(Number.isFinite(Number(e.potSats)) ? { potSats: Math.round(Number(e.potSats)) } : {}),
      ...(e.ok === true || e.ok === false ? { ok: e.ok } : {}),
      ...(e.mock === true ? { mock: true } : {}),
    }));
}
