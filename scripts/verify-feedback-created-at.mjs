/**
 * Regression: anonymous POST /api/feedback must not accept far-future createdAt
 * stamps that permanently starve real inbox rows under MAX_FEEDBACK.
 * Run: node scripts/verify-feedback-created-at.mjs
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAX_FEEDBACK,
  FEEDBACK_CREATED_AT_SKEW_MS,
  normalizeFeedbackMessage,
  normalizeFeedbackStore,
} from "../server/feedbackStore.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const now = 1_700_000_000_000;

{
  // Unit: far-future stamps clamp to wall clock.
  const msg = normalizeFeedbackMessage(
    { id: "future", text: "poison", createdAt: now + 86_400_000_000 },
    now,
  );
  assert.ok(msg);
  assert.equal(msg.createdAt, now);
  assert.ok(msg.createdAt <= now + FEEDBACK_CREATED_AT_SKEW_MS);
}

{
  // Unit: 80 far-future unique ids must not permanently outrank later real rows.
  const real = Array.from({ length: 5 }, (_, i) => ({
    id: `real-${i}`,
    text: `real report ${i}`,
    createdAt: now - 60_000 * (i + 1),
    name: "Alice",
  }));
  const fakes = Array.from({ length: MAX_FEEDBACK }, (_, i) => ({
    id: `fake-${i}`,
    text: `fake ${i}`,
    createdAt: now + 9e15 + i,
    name: "Mallory",
  }));
  const flooded = normalizeFeedbackStore({ messages: [...real, ...fakes] }, now);
  assert.equal(flooded.messages.length, MAX_FEEDBACK);
  // After clamp, fakes share `now`; a newer real submission must still fit.
  const later = normalizeFeedbackStore(
    {
      messages: [
        ...flooded.messages,
        { id: "real-new", text: "brand new bug", createdAt: now + 1_000, name: "Bob" },
      ],
    },
    now + 1_000,
  );
  const kept = later.messages.find((m) => m.id === "real-new");
  assert.ok(kept, "later real feedback must not be starved by prior far-future flood");
  assert.equal(kept.text, "brand new bug");
}

// Integration: HTTP POST ignores client createdAt.
const DATA_DIR = mkdtempSync(join(tmpdir(), "racer-fb-created-"));
const PORT = 18792;
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET_ID = "secret-alice-row";
const SECRET_TEXT = "my private bug report";

writeFileSync(
  join(DATA_DIR, "feedback.json"),
  JSON.stringify(
    {
      messages: [
        {
          id: SECRET_ID,
          text: SECRET_TEXT,
          createdAt: now - 10_000,
          name: "Alice",
        },
      ],
    },
    null,
    2,
  ),
);

const child = spawn(process.execPath, [join(ROOT, "server/index.mjs")], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(PORT),
    HOST: "127.0.0.1",
    DATA_DIR,
    FEEDBACK_NOSTR_NSEC: "not-a-key",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk) => {
  stdout += chunk;
});

function killServer() {
  try {
    child.kill("SIGTERM");
  } catch {
    /* already gone */
  }
}

function loadInbox() {
  return JSON.parse(readFileSync(join(DATA_DIR, "feedback.json"), "utf8"));
}

async function waitForHealth() {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/healthz`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server did not start:\n${stdout.slice(-1500)}`);
}

try {
  await waitForHealth();

  const attack = await fetch(`${BASE}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      id: "mallory-future",
      text: "far future poison",
      name: "Mallory",
      createdAt: Date.now() + 86_400_000_000,
    }),
  });
  assert.equal(attack.ok, true, `POST status ${attack.status}`);
  const body = await attack.json();
  assert.equal(body.ok, true);

  const after = loadInbox();
  const poison = (after.messages || []).find((m) => m.id === "mallory-future");
  assert.ok(poison, "attacker row inserted");
  assert.ok(
    poison.createdAt <= Date.now() + FEEDBACK_CREATED_AT_SKEW_MS,
    "POST must not persist far-future createdAt",
  );

  const alice = (after.messages || []).find((m) => m.id === SECRET_ID);
  assert.ok(alice, "existing real row still present");
  assert.equal(alice.text, SECRET_TEXT);

  console.log("verify-feedback-created-at: PASS");
} catch (err) {
  console.error("verify-feedback-created-at: FAIL");
  console.error(err);
  console.error(stdout.slice(-2000));
  killServer();
  process.exit(1);
} finally {
  killServer();
}
