/**
 * Regression: Nostr feedback hydrate must not displace disk-local inbox rows.
 *
 * Pre-fix mergeFeedbackStores sorted by createdAt and sliced to MAX_FEEDBACK,
 * so 80 remote-only rows with newer timestamps wiped real local messages on boot
 * whenever anyone who knew the (formerly hardcoded) mirror nsec published kind 30078.
 */
import assert from "node:assert/strict";
import {
  MAX_FEEDBACK,
  normalizeFeedbackMessage,
  mergeFeedbackStores,
  mergeFeedbackStoresPreferLocal,
} from "../server/feedbackStore.mjs";

const now = 1_700_000_000_000;

function msg(id, createdAt, text = `t-${id}`) {
  return { id, text, createdAt };
}

{
  // Future-dated stamps clamp to `now` (within skew), not Number.MAX_SAFE_INTEGER.
  const n = normalizeFeedbackMessage(msg("x", now + 86_400_000), now);
  assert.equal(n.createdAt, now);
}

{
  // Naive union+slice (old hydrate path): 80 fresher remote fakes drop all local.
  const local = {
    messages: Array.from({ length: 40 }, (_, i) => msg(`real-${i}`, now - 1_000_000 - i)),
  };
  const remote = {
    messages: Array.from({ length: MAX_FEEDBACK }, (_, i) => msg(`fake-${i}`, now - i)),
  };
  const naive = mergeFeedbackStores(local, remote, now);
  assert.equal(naive.messages.length, MAX_FEEDBACK);
  assert.equal(
    naive.messages.filter((m) => m.id.startsWith("real-")).length,
    0,
    "naive merge must reproduce the wipe (regression fixture)",
  );
}

{
  // Prefer-local hydrate: keep every local id; only fill remaining slots from remote.
  const local = {
    messages: Array.from({ length: 40 }, (_, i) => msg(`real-${i}`, now - 1_000_000 - i)),
  };
  const remote = {
    messages: Array.from({ length: MAX_FEEDBACK }, (_, i) => msg(`fake-${i}`, now - i)),
  };
  const merged = mergeFeedbackStoresPreferLocal(local, remote, now);
  assert.equal(merged.messages.length, MAX_FEEDBACK);
  const reals = merged.messages.filter((m) => m.id.startsWith("real-"));
  assert.equal(reals.length, 40, "all local rows must survive hydrate");
  assert.equal(merged.messages.filter((m) => m.id.startsWith("fake-")).length, 40);
}

{
  // Empty disk: remote restores (legitimate redeploy hydrate).
  const merged = mergeFeedbackStoresPreferLocal(
    { messages: [] },
    { messages: [msg("a", now - 1), msg("b", now - 2)] },
    now,
  );
  assert.deepEqual(
    merged.messages.map((m) => m.id),
    ["a", "b"],
  );
}

{
  // Local body wins on id conflict; readAt from either side is kept.
  const merged = mergeFeedbackStoresPreferLocal(
    { messages: [{ id: "1", text: "local", createdAt: now - 10, readAt: undefined }] },
    { messages: [{ id: "1", text: "remote", createdAt: now, readAt: now - 5 }] },
    now,
  );
  assert.equal(merged.messages.length, 1);
  assert.equal(merged.messages[0].text, "local");
  assert.equal(merged.messages[0].readAt, now - 5);
}

console.log("verify-feedback-hydrate: ok");
