/**
 * Regression: anonymous POST /api/feedback must not replace existing inbox rows
 * by client-supplied id.
 * Run: node scripts/verify-feedback-id.mjs
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const DATA_DIR = mkdtempSync(join(tmpdir(), "racer-fb-id-"));
const PORT = 18791;
const BASE = `http://127.0.0.1:${PORT}`;

const SECRET_ID = "secret-alice-row";
const SECRET_TEXT = "my private bug report with my email alice@example.com";

writeFileSync(
  join(DATA_DIR, "feedback.json"),
  JSON.stringify(
    {
      messages: [
        {
          id: SECRET_ID,
          text: SECRET_TEXT,
          createdAt: 1_700_000_000_000,
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
    // Disable Nostr hydrate/mirror so this test owns the inbox file.
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
      id: SECRET_ID,
      text: "wiped",
      name: "Mallory",
      createdAt: Date.now() + 86_400_000,
    }),
  });
  assert.equal(attack.ok, true, `overwrite POST status ${attack.status}`);
  const attackBody = await attack.json();
  assert.equal(attackBody.ok, true);

  const after = loadInbox();
  const alice = (after.messages || []).find((m) => m.id === SECRET_ID);
  assert.ok(alice, "secret row still present");
  assert.equal(alice.text, SECRET_TEXT, "anonymous POST must not rewrite inbox text");
  assert.equal(alice.name, "Alice");

  const create = await fetch(`${BASE}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      id: "mallory-own",
      text: "hello from mallory",
      name: "Mallory",
    }),
  });
  assert.equal(create.ok, true, `append POST status ${create.status}`);
  const created = loadInbox();
  assert.ok(
    (created.messages || []).some((m) => m.id === "mallory-own" && m.text.includes("mallory")),
    "new ids still append",
  );
  assert.ok(
    (created.messages || []).some((m) => m.id === SECRET_ID && m.text === SECRET_TEXT),
    "append must leave the original row",
  );

  console.log("verify-feedback-id: ok");
} finally {
  killServer();
  await new Promise((r) => {
    const t = setTimeout(r, 1500);
    child.once("exit", () => {
      clearTimeout(t);
      r();
    });
  });
}
