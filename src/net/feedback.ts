/**
 * Player feedback — durable on the game server (`/api/feedback` → feedback.json),
 * not keyed by GAME_VERSION. Client version bumps do not change the inbox.
 *
 * When the server is unreachable, messages stay in localStorage only (DEV inbox
 * is server-side). The server also mirrors the inbox to public Nostr relays so
 * Render free-disk redeploys can hydrate on boot.
 */

import { apiUrl } from "./apiBase";

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
  source: "server" | "local";
  /** True when the server also forwarded the message to the dev's email inbox. */
  emailed?: boolean;
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

/**
 * Public GET only exposes a count (inbox is private). Returns null unless the
 * body includes a messages array (POST responses / older servers).
 */
async function fetchServerFeedback(): Promise<FeedbackStore | null> {
  const url = apiUrl("/feedback");
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object" || !Array.isArray((data as { messages?: unknown }).messages)) {
      return null;
    }
    return normalizeStore(data);
  } catch {
    return null;
  }
}

async function postServerFeedback(msg: FeedbackMessage): Promise<{ store: FeedbackStore; emailed: boolean } | null> {
  const url = apiUrl("/feedback");
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { store: normalizeStore(data), emailed: data?.emailed === true };
  } catch {
    return null;
  }
}

/** Version-agnostic local cache — never include GAME_VERSION in the key. */
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
  return { messages: readLocal(), source: "local" };
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

  // Prefer durable game-server file (same store the DEV inbox reads).
  const fromServer = await postServerFeedback(msg);
  if (fromServer) {
    writeLocal(fromServer.store.messages);
    return { messages: fromServer.store.messages, source: "server", emailed: fromServer.emailed };
  }

  const merged = normalizeStore({ messages: [msg, ...readLocal()] }).messages;
  writeLocal(merged);
  return { messages: merged, source: "local" };
}
