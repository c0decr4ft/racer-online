/**
 * Append-only player feedback store (JSONBlob), same pattern as the leaderboard.
 *
 * Bootstrap blob (recreated 2026-07-28 after TTL expiry 404):
 *   https://jsonblob.com/api/jsonBlob/019fa867-934f-77e1-8322-369891206837
 *
 * Shape: { messages: [{ id, text, createdAt, name? }] }
 * Newest-first; capped at MAX_MESSAGES.
 *
 * When the bootstrap URL 404s (jsonblob ~24h TTL), clients POST a fresh blob
 * seeded from the local queue and cache the new URL — so feedback stays online
 * instead of silently dying forever.
 */

import { getJsonBlob, putJsonBlob } from "./jsonBlob";

const BOOTSTRAP_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019fa867-934f-77e1-8322-369891206837";
const BLOB_URL_CACHE_KEY = "racer-feedback-blob-url-v1";

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

/** Normalize + dedupe by id; newest-first; cap length. */
export function normalizeStore(data: unknown): FeedbackStore {
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

/** Union message lists without dropping either side (by id). */
export function mergeFeedbackMessages(...lists: FeedbackMessage[][]): FeedbackMessage[] {
  return normalizeStore({ messages: lists.flat() }).messages;
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

function seedFromLocal(): FeedbackStore {
  return { messages: readLocal() };
}

async function fetchStore(): Promise<FeedbackStore> {
  const local = readLocal();
  const { data, recreated } = await getJsonBlob<unknown>(
    BOOTSTRAP_BLOB_URL,
    BLOB_URL_CACHE_KEY,
    seedFromLocal(),
  );
  const remote = normalizeStore(data);
  // Always merge with local so a freshly recreated empty blob cannot wipe the offline queue.
  const merged = mergeFeedbackMessages(remote.messages, local);
  if (recreated || merged.length > remote.messages.length) {
    // Push merged queue up so other clients (and the developer inbox) see offline notes.
    try {
      const put = await putJsonBlob(BOOTSTRAP_BLOB_URL, BLOB_URL_CACHE_KEY, { messages: merged });
      return normalizeStore(put.data);
    } catch {
      return { messages: merged };
    }
  }
  return { messages: merged };
}

async function putStore(store: FeedbackStore): Promise<FeedbackStore> {
  const body = normalizeStore(store);
  const { data } = await putJsonBlob(BOOTSTRAP_BLOB_URL, BLOB_URL_CACHE_KEY, body);
  return normalizeStore(data);
}

export async function fetchFeedback(): Promise<FeedbackSnapshot> {
  try {
    const store = await fetchStore();
    // Merge-before-write: never replace a richer local queue with a poorer remote.
    const merged = mergeFeedbackMessages(store.messages, readLocal());
    writeLocal(merged);
    return { messages: merged, source: "online" };
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

  // Park locally first so a mid-flight failure never loses the note.
  writeLocal(mergeFeedbackMessages([msg], readLocal()));

  try {
    let store = await fetchStore();
    store.messages = mergeFeedbackMessages([msg], store.messages);
    store = await putStore(store);
    try {
      const latest = await fetchStore();
      if (!latest.messages.some((m) => m.id === msg.id)) {
        latest.messages = mergeFeedbackMessages([msg], latest.messages);
        store = await putStore(latest);
      }
    } catch {
      /* keep first write */
    }
    writeLocal(mergeFeedbackMessages(store.messages, readLocal()));
    return { messages: store.messages, source: "online" };
  } catch {
    const merged = mergeFeedbackMessages([msg], readLocal());
    writeLocal(merged);
    return { messages: merged, source: "local" };
  }
}

export const FEEDBACK_BLOB_URL = BOOTSTRAP_BLOB_URL;

export const __feedbackTest = {
  normalizeStore,
  mergeFeedbackMessages,
  MAX_MESSAGES,
};
