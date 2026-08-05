/**
 * Unit checks for feedback merge semantics (mirrors src/net/feedback.ts).
 * Run: node scripts/verify-feedback.mjs
 */

const MAX_MESSAGES = 80;
const FEEDBACK_TEXT_MAX = 500;
const FEEDBACK_NAME_MAX = 24;

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

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
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? Math.round(raw.createdAt)
      : Date.now();
  const id = String(raw.id ?? "").trim() || `fb-${createdAt}`;
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

function mergeFeedbackStores(...stores) {
  const messages = [];
  for (const store of stores) {
    if (Array.isArray(store?.messages) && store.messages.length) {
      messages.push(...store.messages);
    }
  }
  return normalizeStore({ messages });
}

/** Mimic publishMergedFeedback decisioning without network I/O. */
function planMirrorPublish(serverStore, blobStore) {
  const merged = mergeFeedbackStores(blobStore, serverStore);
  if (blobStore.messages.length > 0 && merged.messages.length === 0) {
    return { action: "keep-blob", store: blobStore };
  }
  return { action: "put-merged", store: merged };
}

const older = {
  messages: [
    { id: "a", text: "great game", createdAt: 1_000, name: "Ada" },
    { id: "b", text: "more bikes", createdAt: 2_000, name: "Bob" },
  ],
};
const postRestartServer = {
  messages: [{ id: "c", text: "after redeploy", createdAt: 3_000, name: "Cy" }],
};

const wiped = planMirrorPublish(postRestartServer, older);
check(
  "mirror:post-restart-keeps-blob-history",
  wiped.action === "put-merged" && wiped.store.messages.length === 3,
  `count=${wiped.store.messages.length}`,
);
check(
  "mirror:post-restart-includes-prior-ids",
  wiped.store.messages.some((m) => m.id === "a") &&
    wiped.store.messages.some((m) => m.id === "b") &&
    wiped.store.messages.some((m) => m.id === "c"),
);

const emptyServer = { messages: [] };
const refuseWipe = planMirrorPublish(emptyServer, older);
check(
  "mirror:empty-server-keeps-blob",
  refuseWipe.store.messages.length === 2 &&
    refuseWipe.store.messages.every((m) => m.id === "a" || m.id === "b"),
  `count=${refuseWipe.store.messages.length}`,
);

const deduped = mergeFeedbackStores(older, {
  messages: [{ id: "a", text: "duplicate id ignored", createdAt: 9_999, name: "X" }],
});
check(
  "merge:dedupes-by-id",
  deduped.messages.filter((m) => m.id === "a").length === 1 &&
    deduped.messages.find((m) => m.id === "a")?.text === "great game",
);

const ordered = mergeFeedbackStores(postRestartServer, older);
check(
  "merge:newest-first",
  ordered.messages[0]?.id === "c" && ordered.messages[1]?.id === "b",
  ordered.messages.map((m) => m.id).join(","),
);

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nAll feedback merge checks passed.");
