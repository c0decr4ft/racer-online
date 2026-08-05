/**
 * Player feedback — prefers the durable Render/game server (`/api/feedback`),
 * then JSONBlob, then local cache.
 */

import { apiUrl } from "./apiBase";

const PUBLIC_BLOB_URL =
  "https://jsonblob.com/api/jsonBlob/019fbe1c-6eab-7997-bff4-46ce4bfc7d97";

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
  source: "server" | "online" | "local";
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

async function fetchBlobStore(): Promise<FeedbackStore> {
  const res = await fetch(PUBLIC_BLOB_URL, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(String(res.status));
  return normalizeStore(await res.json());
}

async function putBlobStore(store: FeedbackStore): Promise<FeedbackStore> {
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

/** Union message lists by id (newest-first order preserved by normalizeStore). */
export function mergeFeedbackStores(...stores: FeedbackStore[]): FeedbackStore {
  const messages: FeedbackMessage[] = [];
  for (const store of stores) {
    if (Array.isArray(store?.messages) && store.messages.length) {
      messages.push(...store.messages);
    }
  }
  return normalizeStore({ messages });
}

/**
 * Mirror a store to the public blob after merging with the latest remote.
 * Prevents a freshly restarted empty game server from wiping worldwide feedback.
 */
async function publishMergedFeedback(store: FeedbackStore): Promise<FeedbackStore> {
  let latest: FeedbackStore;
  try {
    latest = await fetchBlobStore();
  } catch {
    if (store.messages.length === 0) {
      throw new Error("refusing empty feedback publish without remote");
    }
    return putBlobStore(store);
  }

  const merged = mergeFeedbackStores(latest, store);
  if (latest.messages.length > 0 && merged.messages.length === 0) {
    return latest;
  }
  return putBlobStore(merged);
}

async function fetchServerFeedback(): Promise<FeedbackStore | null> {
  const url = apiUrl("/feedback");
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return normalizeStore(await res.json());
  } catch {
    return null;
  }
}

async function postServerFeedback(msg: FeedbackMessage): Promise<FeedbackStore | null> {
  const url = apiUrl("/feedback");
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) return null;
    return normalizeStore(await res.json());
  } catch {
    return null;
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
  const fromServer = await fetchServerFeedback();
  if (fromServer) {
    writeLocal(fromServer.messages);
    return { messages: fromServer.messages, source: "server" };
  }
  try {
    const store = await fetchBlobStore();
    writeLocal(store.messages);
    return { messages: store.messages, source: "online" };
  } catch {
    return { messages: readLocal(), source: "local" };
  }
}

export async function submitFeedback(text: string, name?: string): Promise<FeedbackSnapshot> {
  const msg = normalizeMessage({
    id: newId(),
    text,
    createdAt: Date.now(),
    name,
  });
  if (!msg) {
    return fetchFeedback();
  }

  const fromServer = await postServerFeedback(msg);
  if (fromServer) {
    writeLocal(fromServer.messages);
    // Merge with the public blob — never replace a fuller worldwide history with a
    // sparse post-restart server store.
    void publishMergedFeedback(fromServer).catch(() => undefined);
    return { messages: fromServer.messages, source: "server" };
  }

  try {
    const remote = await fetchBlobStore();
    const store = await publishMergedFeedback(
      normalizeStore({ messages: [msg, ...remote.messages] }),
    );
    writeLocal(store.messages);
    return { messages: store.messages, source: "online" };
  } catch {
    const merged = normalizeStore({ messages: [msg, ...readLocal()] }).messages;
    writeLocal(merged);
    return { messages: merged, source: "local" };
  }
}

export const FEEDBACK_BLOB_URL = PUBLIC_BLOB_URL;
