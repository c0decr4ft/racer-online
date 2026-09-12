/**
 * Feedback inbox normalize / merge helpers (disk + Nostr hydrate).
 * Kept separate from index.mjs so regression tests can import without booting the server.
 */

export const MAX_FEEDBACK = 80;
export const FEEDBACK_TEXT_MAX = 500;
export const FEEDBACK_NAME_MAX = 24;
/** Drop timestamps more than this far ahead of wall clock (flood / poison). */
export const FEEDBACK_CREATED_AT_SKEW_MS = 60_000;

export function sanitizeFeedbackText(raw) {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FEEDBACK_TEXT_MAX);
}

export function sanitizeFeedbackName(raw) {
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

/**
 * @param {unknown} raw
 * @param {number} [now]
 */
export function normalizeFeedbackMessage(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object") return null;
  const text = sanitizeFeedbackText(/** @type {{ text?: unknown }} */ (raw).text);
  if (!text) return null;
  const row = /** @type {{ createdAt?: unknown, id?: unknown, name?: unknown, readAt?: unknown }} */ (
    raw
  );
  let createdAt =
    typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
      ? Math.round(row.createdAt)
      : now;
  // Clamp future / negative stamps so a poisoned Nostr mirror cannot sort-displace real rows.
  if (createdAt > now + FEEDBACK_CREATED_AT_SKEW_MS) createdAt = now;
  if (createdAt < 0) createdAt = now;
  const id = String(row.id ?? "").trim() || `fb-${now.toString(36)}`;
  const name = sanitizeFeedbackName(row.name);
  const readAt =
    typeof row.readAt === "number" && Number.isFinite(row.readAt) && row.readAt > 0
      ? Math.round(row.readAt)
      : undefined;
  const msg = name ? { id, text, createdAt, name } : { id, text, createdAt };
  if (readAt !== undefined) msg.readAt = readAt;
  return msg;
}

/** @param {unknown} raw @param {number} [now] */
export function normalizeFeedbackStore(raw, now = Date.now()) {
  const list = Array.isArray(/** @type {{ messages?: unknown }} */ (raw)?.messages)
    ? /** @type {{ messages: unknown[] }} */ (raw).messages
    : Array.isArray(raw)
      ? raw
      : [];
  const seen = new Set();
  const messages = [];
  for (const row of list) {
    const msg = normalizeFeedbackMessage(row, now);
    if (!msg || seen.has(msg.id)) continue;
    seen.add(msg.id);
    messages.push(msg);
  }
  messages.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  return { messages: messages.slice(0, MAX_FEEDBACK) };
}

/** Union two stores by id — keep readAt if either side has it. Newest-first, cap MAX. */
export function mergeFeedbackStores(a, b, now = Date.now()) {
  const byId = new Map();
  for (const row of [...(a?.messages || []), ...(b?.messages || [])]) {
    const msg = normalizeFeedbackMessage(row, now);
    if (!msg) continue;
    const prev = byId.get(msg.id);
    if (!prev) {
      byId.set(msg.id, msg);
      continue;
    }
    const readAt = [prev.readAt, msg.readAt].find((n) => Number.isFinite(Number(n)));
    const newer = msg.createdAt >= prev.createdAt ? msg : prev;
    if (readAt !== undefined) newer.readAt = Math.round(Number(readAt));
    byId.set(msg.id, newer);
  }
  const messages = [...byId.values()].sort(
    (x, y) => y.createdAt - x.createdAt || x.id.localeCompare(y.id),
  );
  return { messages: messages.slice(0, MAX_FEEDBACK) };
}

/**
 * Boot hydrate merge: never drop disk-local rows to make room for remote-only
 * poison (public nsec / compromised mirror). Local ids are kept first up to MAX;
 * remote-only fills remaining slots.
 *
 * @param {{ messages?: object[] } | null | undefined} local
 * @param {{ messages?: object[] } | null | undefined} remote
 * @param {number} [now]
 */
export function mergeFeedbackStoresPreferLocal(local, remote, now = Date.now()) {
  const localNorm = normalizeFeedbackStore(local, now);
  const remoteNorm = normalizeFeedbackStore(remote, now);
  const byId = new Map();
  for (const msg of remoteNorm.messages) byId.set(msg.id, { ...msg });
  for (const msg of localNorm.messages) {
    const prev = byId.get(msg.id);
    if (!prev) {
      byId.set(msg.id, { ...msg });
      continue;
    }
    const readAt = [prev.readAt, msg.readAt].find((n) => Number.isFinite(Number(n)));
    // Local body wins; preserve readAt from either side.
    const out = { ...msg };
    if (readAt !== undefined) out.readAt = Math.round(Number(readAt));
    byId.set(msg.id, out);
  }
  const localIds = new Set(localNorm.messages.map((m) => m.id));
  const all = [...byId.values()];
  const sortFn = (x, y) => y.createdAt - x.createdAt || x.id.localeCompare(y.id);
  const localRows = all.filter((m) => localIds.has(m.id)).sort(sortFn);
  const remoteOnly = all.filter((m) => !localIds.has(m.id)).sort(sortFn);
  const kept = localRows.slice(0, MAX_FEEDBACK);
  const room = MAX_FEEDBACK - kept.length;
  if (room > 0) kept.push(...remoteOnly.slice(0, room));
  return { messages: kept };
}
