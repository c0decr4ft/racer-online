/**
 * Regression: aborted JSON POSTs must not kill the game server process.
 * Usage: node scripts/verify-api-abort.mjs
 * Expects a server already listening on :8787, or starts one.
 */
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..");
const PORT = 8787;
const BASE = `http://127.0.0.1:${PORT}`;

async function health() {
  try {
    const res = await fetch(`${BASE}/healthz`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function abortPost(path) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": 10_000,
        },
      },
      (res) => {
        res.resume();
        resolve({ kind: "response", status: res.statusCode });
      },
    );
    req.on("error", (e) => resolve({ kind: "error", message: e.message }));
    req.write('{"id":"abcdefghij","partial":');
    setTimeout(() => {
      req.destroy();
      resolve({ kind: "destroyed" });
    }, 40);
  });
}

async function main() {
  let child = null;
  const alreadyUp = await health();
  if (!alreadyUp) {
    child = spawn(process.execPath, [join(ROOT, "server/index.mjs")], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let bootErr = "";
    child.stderr.on("data", (d) => {
      bootErr += String(d);
    });
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (await health()) break;
      if (child.exitCode != null) {
        throw new Error(`server exited during boot: ${bootErr || child.exitCode}`);
      }
    }
    if (!(await health())) throw new Error("server failed to become healthy");
  }

  const paths = ["/api/presence", "/api/leaderboard", "/api/feedback"];
  for (const path of paths) {
    await abortPost(path);
    await new Promise((r) => setTimeout(r, 150));
    const alive = await health();
    if (!alive?.ok) {
      throw new Error(`server died after aborted POST ${path}`);
    }
    console.log(`ok  aborted POST ${path} — server still healthy`);
  }

  // Normal heartbeat still works after aborts.
  const res = await fetch(`${BASE}/api/presence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "abort-test-session-01", action: "heartbeat" }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(`presence heartbeat failed after aborts: ${JSON.stringify(data)}`);
  }
  console.log("ok  presence heartbeat after aborts");

  if (child) {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
  }
  console.log("\nAll API abort checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
