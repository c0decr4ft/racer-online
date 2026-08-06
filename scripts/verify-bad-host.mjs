/**
 * Regression: malformed Host headers must not kill the game server process.
 * Usage: node scripts/verify-bad-host.mjs
 */
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..");
const PORT = 8791;
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

function sendMalformedHost() {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ port: PORT, host: "127.0.0.1" });
    let body = "";
    sock.on("data", (chunk) => {
      body += chunk;
    });
    sock.on("error", reject);
    sock.on("connect", () => {
      sock.write("GET /healthz HTTP/1.1\r\nHost: [\r\nConnection: close\r\n\r\n");
    });
    sock.on("close", () => resolve(body));
  });
}

async function main() {
  const child = spawn(process.execPath, [join(ROOT, "server/index.mjs")], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let bootErr = "";
  child.stderr.on("data", (d) => {
    bootErr += String(d);
  });

  for (let i = 0; i < 50; i++) {
    if (await health()) break;
    if (child.exitCode != null) {
      throw new Error(`server exited during boot: ${bootErr || child.exitCode}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!(await health())) throw new Error("server failed to become healthy");

  const raw = await sendMalformedHost();
  if (!/HTTP\/1\.1 400/.test(raw)) {
    throw new Error(`expected HTTP 400 for malformed Host, got:\n${raw.slice(0, 300)}`);
  }
  console.log("ok  malformed Host → 400");

  await new Promise((r) => setTimeout(r, 200));
  if (child.exitCode != null) {
    throw new Error(`server died after malformed Host (exit ${child.exitCode})\n${bootErr}`);
  }
  const alive = await health();
  if (!alive?.ok) throw new Error("server unhealthy after malformed Host");
  console.log("ok  server still healthy after malformed Host");

  // Normal API still works.
  const res = await fetch(`${BASE}/api/presence`);
  const data = await res.json();
  if (!res.ok || typeof data.now !== "number") {
    throw new Error(`presence GET failed after bad Host: ${JSON.stringify(data)}`);
  }
  console.log("ok  /api/presence after malformed Host");

  child.kill("SIGTERM");
  await once(child, "exit").catch(() => undefined);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
