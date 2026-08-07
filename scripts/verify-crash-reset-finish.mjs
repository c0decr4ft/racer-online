/**
 * Regression: finish messages during the post-crashReset 3-2-1-GO hold must not crown a winner.
 * Usage: node scripts/verify-crash-reset-finish.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..");
const PORT = 8798;
const BASE = `http://127.0.0.1:${PORT}`;
const COUNTDOWN_MS = 3_000;

async function health() {
  try {
    const res = await fetch(`${BASE}/healthz`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function waitFor(ws, type, ms = 2_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      resolve(null);
    }, ms);
    const onMessage = (data) => {
      try {
        const msg = JSON.parse(String(data));
        if (msg.t === type) {
          clearTimeout(timer);
          ws.off("message", onMessage);
          resolve(msg);
        }
      } catch {
        /* ignore */
      }
    };
    ws.on("message", onMessage);
  });
}

function openSocket() {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

async function main() {
  let child = null;
  if (!(await health())) {
    child = spawn(process.execPath, [join(ROOT, "server/index.mjs")], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (await health()) break;
      if (child.exitCode != null) throw new Error("server exited during boot");
    }
    if (!(await health())) throw new Error("server failed to become healthy");
  }

  const room = `crash-reset-finish-${Date.now().toString(36)}`;
  const host = await openSocket();
  const guest = await openSocket();

  host.send(
    JSON.stringify({
      t: "create",
      name: "Host",
      room,
      password: "pw",
      maxPlayers: 4,
      trackId: "oval-circuit",
      kind: "car",
      color: 1,
      accent: 2,
    }),
  );
  const welcome = await waitFor(host, "welcome");
  if (!welcome?.id) throw new Error("host welcome missing");

  guest.send(
    JSON.stringify({
      t: "join",
      name: "Guest",
      room,
      password: "pw",
      color: 3,
      accent: 4,
    }),
  );
  if (!(await waitFor(guest, "welcome"))) throw new Error("guest welcome missing");

  host.send(JSON.stringify({ t: "start" }));
  if (!(await waitFor(guest, "start"))) throw new Error("start missing");

  // Let the initial start countdown expire so this test isolates crashReset only.
  await new Promise((r) => setTimeout(r, COUNTDOWN_MS + 150));

  const resetHost = waitFor(host, "crashReset", 2_000);
  const resetGuest = waitFor(guest, "crashReset", 2_000);
  guest.send(JSON.stringify({ t: "crash" }));
  const [resetA, resetB] = await Promise.all([resetHost, resetGuest]);
  if (!resetA || !resetB) throw new Error("crashReset missing after crash");

  const earlyHost = waitFor(host, "raceResult", 800);
  const earlyGuest = waitFor(guest, "raceResult", 800);
  host.send(JSON.stringify({ t: "finish", timeMs: 1000 }));
  const [earlyA, earlyB] = await Promise.all([earlyHost, earlyGuest]);
  if (earlyA || earlyB) {
    throw new Error("finish during crashReset countdown incorrectly crowned a winner");
  }
  console.log("ok  finish rejected during crashReset countdown");

  await new Promise((r) => setTimeout(r, COUNTDOWN_MS + 150));
  const lateHost = waitFor(host, "raceResult", 2_000);
  const lateGuest = waitFor(guest, "raceResult", 2_000);
  host.send(JSON.stringify({ t: "finish", timeMs: 65432 }));
  const [a, b] = await Promise.all([lateHost, lateGuest]);
  if (!a || !b || a.winnerId !== welcome.id || b.winnerId !== welcome.id) {
    throw new Error(`finish after crashReset countdown failed: ${JSON.stringify({ a, b })}`);
  }
  console.log("ok  finish accepted after crashReset countdown");

  try {
    host.close();
  } catch {
    /* ignore */
  }
  try {
    guest.close();
  } catch {
    /* ignore */
  }
  if (child) child.kill();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
