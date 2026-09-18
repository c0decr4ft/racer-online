/**
 * Persist DM / social notification ids so toasts never replay after refresh.
 */
const PREFIX = "racer-dm-notified-v1:";
const MAX_IDS = 400;

function normalizePubkey(raw: string): string {
  const hex = String(raw || "")
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : "";
}

function key(owner: string): string {
  return `${PREFIX}${owner}`;
}

function load(ownerPubkey: string): string[] {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return [];
  try {
    const raw = localStorage.getItem(key(owner));
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function save(ownerPubkey: string, ids: string[]): void {
  const owner = normalizePubkey(ownerPubkey);
  if (!owner) return;
  try {
    localStorage.setItem(key(owner), JSON.stringify(ids.slice(-MAX_IDS)));
  } catch {
    /* ignore quota */
  }
}

/** Returns true the first time this event should notify; false if already shown. */
export function claimNotification(ownerPubkey: string, eventId: string): boolean {
  const owner = normalizePubkey(ownerPubkey);
  const id = String(eventId || "").trim();
  if (!owner || !id) return false;
  const ids = load(owner);
  if (ids.includes(id)) return false;
  ids.push(id);
  save(owner, ids);
  return true;
}

/** Mark as shown without toasting (historical backlog). */
export function markNotificationSeen(ownerPubkey: string, eventId: string): void {
  claimNotification(ownerPubkey, eventId);
}
