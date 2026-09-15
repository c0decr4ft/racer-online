/**
 * Regression: POST /api/feedback must not echo the private inbox.
 * GET already returns a count only; submit must match that contract.
 *
 * Run: node scripts/verify-feedback-post-privacy.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

const server = readFileSync(join(root, "server/index.mjs"), "utf8");
const client = readFileSync(join(root, "src/net/feedback.ts"), "utf8");

const postHandler = server.match(
  /url\.pathname === "\/api\/feedback" && req\.method === "POST"[\s\S]*?(?=if \(url\.pathname === "\/healthz")/,
)?.[0];

check("located POST /api/feedback handler", Boolean(postHandler));
check(
  "POST response returns count, not messages",
  Boolean(postHandler) &&
    /count:\s*saved\.messages\.length/.test(postHandler) &&
    !/messages:\s*saved\.messages/.test(postHandler),
);
check(
  "client POST parser ignores message lists",
  /Promise<\{ emailed: boolean \} \| null>/.test(client) &&
    !/store:\s*normalizeStore\(data\)/.test(client),
);
check(
  "client local cache bumped past leaky v1",
  /racer-feedback-local-v2/.test(client) &&
    /LEGACY_LOCAL_KEYS/.test(client) &&
    /racer-feedback-local-v1/.test(client),
);
check(
  "submitFeedback writes only local messages",
  /normalizeStore\(\{ messages: \[msg, \.\.\.readLocal\(\)\] \}\)/.test(client) &&
    !/writeLocal\(fromServer\.store\.messages\)/.test(client),
);

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nverify-feedback-post-privacy: ok");
