/**
 * Append-only player feedback store (JSONBlob), same pattern as the leaderboard.
 *
 * Public blob (read/write):
 *   https://jsonblob.com/api/jsonBlob/019f8e7b-0678-7e10-bbd6-74574f05ea78
 *
 * Shape: { messages: [{ id, text, createdAt, name? }] }
 * Newest-first; capped at MAX_MESSAGES.
 */

const PUBLIC_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019f8e7b-0678-7e10-bbd6-74574f05ea78";

const MAX_MESSAGES = 80;
export const FEEDBACK_TEXT_MAX = 500;
export const FEEDBACK_NAME_MAX = 24;

export type FeedbackMessage = {
  id: string;
  text: string;
  createdAt: number;
  name?: string;
};

export type FeedbackSnapshot = {
  messages: FeedbackMessage[];
  source: "online" | "local";
};

type FeedbackStore = { messages: FeedbackMessage[] };

function emptyStore(): FeedbackStore {
  return { messages: [] };
}

function sanitizeText(raw: string): string {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FEEDBACK_TEXT_MAX);
}

function sanitizeName(raw: string | undefined): string | undefined {
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

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMessage(raw: unknown): FeedbackMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<FeedbackMessage>;
  const text = sanitizeText(String(obj.text ?? ""));
  if (!text) return null;
  const createdAt =
    typeof obj.createdAt === "number" && Number.isFinite(obj.createdAt) ? Math.round(obj.createdAt) : Date.now();
  const id = String(obj.id ?? "").trim() || newId();
  const name = sanitizeName(obj.name);
  return name ? { id, text, createdAt, name } : { id, text, createdAt };
}

function normalizeStore(data: unknown): FeedbackStore {
  const store = emptyStore();
  if (!data || typeof data !== "object") return store;
  const list = (data as { messages?: unknown }).messages;
  if (!Array.isArray(list)) return store;
  const seen = new Set<string>();
  const messages: FeedbackMessage[] = [];
  for (const row of list) {
    const msg = normalizeMessage(row);
    if (!msg || seen.has(msg.id)) continue;
    seen.add(msg.id);
    messages.push(msg);
  }
  messages.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  store.messages = messages.slice(0, MAX_MESSAGES);
  return store;
}

async function fetchStore(): Promise<FeedbackStore> {
  const res = await fetch(PUBLIC_BLOB_URL, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(String(res.status));
  return normalizeStore(await res.json());
}

async function putStore(store: FeedbackStore): Promise<FeedbackStore> {
  const body = normalizeStore(store);
  const res = await fetch(PUBLIC_BLOB_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  try {
    return normalizeStore(await res.json());
  } catch {
    return body;
  }
}

const LOCAL_KEY = "racer-feedback-local-v1";

function readLocal(): FeedbackMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return normalizeStore(JSON.parse(raw)).messages;
  } catch {
    return [];
  }
}

function writeLocal(messages: FeedbackMessage[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ messages: messages.slice(0, MAX_MESSAGES) }));
  } catch {
    /* ignore */
  }
}

export async function fetchFeedback(): Promise<FeedbackSnapshot> {
  try {
    const store = await fetchStore();
    writeLocal(store.messages);
    return { messages: store.messages, source: "online" };
  } catch {
    return { messages: readLocal(), source: "local" };
  }
}

export async function submitFeedback(
  text: string,
  name?: string,
): Promise<FeedbackSnapshot> {
  const msg = normalizeMessage({
    id: newId(),
    text,
    createdAt: Date.now(),
    name,
  });
  if (!msg) {
    return fetchFeedback();
  }

  try {
    let store = await fetchStore();
    store.messages = [msg, ...store.messages];
    store = await putStore(store);
    try {
      const latest = await fetchStore();
      if (!latest.messages.some((m) => m.id === msg.id)) {
        latest.messages = [msg, ...latest.messages];
        store = await putStore(latest);
      }
    } catch {
      /* keep first write */
    }
    writeLocal(store.messages);
    return { messages: store.messages, source: "online" };
  } catch {
    const merged = normalizeStore({ messages: [msg, ...readLocal()] }).messages;
    writeLocal(merged);
    return { messages: merged, source: "local" };
  }
}

export const FEEDBACK_BLOB_URL = PUBLIC_BLOB_URL;
