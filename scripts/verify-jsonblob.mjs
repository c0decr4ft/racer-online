/**
 * Unit checks for JSONBlob URL helpers + feedback merge (no network).
 * Run: node scripts/verify-jsonblob.mjs
 */

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

const JSONBLOB_API = "https://jsonblob.com/api/jsonBlob";

function jsonBlobUrl(idOrPath) {
  if (/^https?:\/\//i.test(idOrPath)) return idOrPath.replace(/\/?$/, "");
  const id = idOrPath.replace(/^\/api\/jsonBlob\//, "").replace(/^\//, "");
  return `${JSONBLOB_API}/${id}`;
}

function candidateBlobUrls(bootstrapUrl, cached) {
  const out = [];
  const seen = new Set();
  for (const raw of [bootstrapUrl, cached ?? ""]) {
    const url = raw ? jsonBlobUrl(raw) : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function shouldRetryStatus(status) {
  return status === 429 || status === 408 || status >= 500;
}

const FEEDBACK_TEXT_MAX = 500;
const FEEDBACK_NAME_MAX = 24;
const MAX_MESSAGES = 80;

function sanitizeText(raw) {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FEEDBACK_TEXT_MAX);
}

function sanitizeName(raw) {
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

function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const text = sanitizeText(String(raw.text ?? ""));
  if (!text) return null;
  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt) ? Math.round(raw.createdAt) : Date.now();
  const id = String(raw.id ?? "").trim() || `id-${createdAt}`;
  const name = sanitizeName(raw.name);
  return name ? { id, text, createdAt, name } : { id, text, createdAt };
}

function normalizeStore(data) {
  const store = { messages: [] };
  if (!data || typeof data !== "object") return store;
  const list = data.messages;
  if (!Array.isArray(list)) return store;
  const seen = new Set();
  const messages = [];
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

function mergeFeedbackMessages(...lists) {
  return normalizeStore({ messages: lists.flat() }).messages;
}

// --- URL helpers ---
check(
  "jsonBlobUrl keeps absolute URL",
  jsonBlobUrl("https://jsonblob.com/api/jsonBlob/abc") === "https://jsonblob.com/api/jsonBlob/abc",
);
check(
  "jsonBlobUrl builds from id",
  jsonBlobUrl("019fa867-934f-77e1-8322-369891206837") ===
    "https://jsonblob.com/api/jsonBlob/019fa867-934f-77e1-8322-369891206837",
);
check(
  "jsonBlobUrl accepts relative Location",
  jsonBlobUrl("/api/jsonBlob/deadbeef") === "https://jsonblob.com/api/jsonBlob/deadbeef",
);

const bootstrap = "https://jsonblob.com/api/jsonBlob/boot";
const cached = "https://jsonblob.com/api/jsonBlob/cached";
check(
  "candidates prefer bootstrap then cache",
  JSON.stringify(candidateBlobUrls(bootstrap, cached)) === JSON.stringify([bootstrap, cached]),
);
check(
  "candidates dedupe identical bootstrap/cache",
  JSON.stringify(candidateBlobUrls(bootstrap, bootstrap)) === JSON.stringify([bootstrap]),
);
check("candidates skip empty cache", JSON.stringify(candidateBlobUrls(bootstrap, null)) === JSON.stringify([bootstrap]));

check("retry 429", shouldRetryStatus(429) === true);
check("retry 503", shouldRetryStatus(503) === true);
check("no retry 404", shouldRetryStatus(404) === false);
check("no retry 200", shouldRetryStatus(200) === false);

// --- Feedback merge must not wipe local on empty remote ---
const localMsg = { id: "local-1", text: "offline note", createdAt: 100 };
const remoteMsg = { id: "remote-1", text: "online note", createdAt: 200 };
const mergedEmptyRemote = mergeFeedbackMessages([], [localMsg]);
check(
  "merge empty remote keeps local",
  mergedEmptyRemote.length === 1 && mergedEmptyRemote[0].id === "local-1",
);
const mergedBoth = mergeFeedbackMessages([remoteMsg], [localMsg]);
check(
  "merge keeps both sides",
  mergedBoth.length === 2 && mergedBoth.some((m) => m.id === "local-1") && mergedBoth.some((m) => m.id === "remote-1"),
);
const mergedDedupe = mergeFeedbackMessages(
  [{ id: "x", text: "a", createdAt: 1 }],
  [{ id: "x", text: "a", createdAt: 1 }],
);
check("merge dedupes by id", mergedDedupe.length === 1);

// Simulates the old bug: writeLocal(remote) when remote is empty after recreate.
const afterRecreateWipe = normalizeStore({ messages: [] }).messages;
const safe = mergeFeedbackMessages(afterRecreateWipe, [localMsg]);
check("recreate empty remote must not drop local queue", safe.length === 1 && safe[0].text === "offline note");

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nAll checks passed.");
