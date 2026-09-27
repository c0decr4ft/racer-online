/**
 * Regression: Event Mode must reject client-trusted early finishes so a paid
 * racer cannot crown themselves at GO and claimPot the WTA pot.
 *
 * Usage: node scripts/verify-event-fake-finish.mjs
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

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
    const onMessage = (data, isBinary) => {
      if (isBinary) return;
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
      env: {
        ...process.env,
        PORT: String(PORT),
        RACER_PAYMENTS_MOCK: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (await health()) break;
      if (child.exitCode != null) throw new Error("server exited during boot");
    }
    if (!(await health())) throw new Error("server failed to become healthy");
  }

  const room = `fake-finish-${Date.now().toString(36)}`;
  const host = await openSocket();
  const guest = await openSocket();

  const hostWelcomeP = waitFor(host, "welcome", 4000);
  host.send(
    JSON.stringify({
      t: "create",
      name: "Host",
      room,
      password: "pw",
      maxPlayers: 4,
      trackId: "forest-loop",
      kind: "car",
      color: 0xff0000,
      accent: 0xffffff,
      event: { buyInSats: 10, mode: "race" },
    }),
  );
  const hostWelcome = await hostWelcomeP;
  assert(hostWelcome?.id, "host welcome");

  const guestWelcomeP = waitFor(guest, "welcome", 4000);
  guest.send(
    JSON.stringify({
      t: "join",
      name: "Guest",
      room,
      password: "pw",
      color: 0x00ff00,
      accent: 0xffffff,
      event: true,
    }),
  );
  const guestWelcome = await guestWelcomeP;
  assert(guestWelcome?.id, "guest welcome");

  // Mock auto-pays buy-ins ~3s after invoice; settle poll is 2s.
  await new Promise((r) => setTimeout(r, 5_500));

  const startP = waitFor(host, "start", 4000);
  const guestStartP = waitFor(guest, "start", 4000);
  host.send(JSON.stringify({ t: "start" }));
  const started = await startP;
  const guestStarted = await guestStartP;
  assert(started, "host got start");
  assert(guestStarted, "guest got start");

  // 1) Finish during countdown — must NOT crown a winner.
  {
    const early = waitFor(host, "raceResult", 900);
    host.send(JSON.stringify({ t: "finish", timeMs: 1000, bestLapMs: 1000 }));
    assert(!(await early), "finish rejected during countdown");
  }

  // 2) After countdown but without completing 3 laps — still reject.
  await new Promise((r) => setTimeout(r, COUNTDOWN_MS + 200));
  {
    host.send(JSON.stringify({ t: "pose", x: 0, z: 0, h: 0, s: 10, g: "1", lap: 2 }));
    await new Promise((r) => setTimeout(r, 80));
    const early = waitFor(host, "raceResult", 900);
    host.send(JSON.stringify({ t: "finish", timeMs: 5000, bestLapMs: 2000 }));
    assert(!(await early), "finish rejected before lap > 3");
  }

  // 3) Completed lap uplink → finish accepted.
  {
    host.send(JSON.stringify({ t: "pose", x: 1, z: 1, h: 0, s: 10, g: "1", lap: 4 }));
    await new Promise((r) => setTimeout(r, 80));
    const resultP = waitFor(host, "raceResult", 2000);
    host.send(JSON.stringify({ t: "finish", timeMs: 65000, bestLapMs: 20000 }));
    const result = await resultP;
    assert(result?.winnerId === hostWelcome.id, `expected host win, got ${result?.winnerId}`);
    assert(result?.event?.potSats > 0, "event pot present on result");
  }

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
  if (child) {
    child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("verify-event-fake-finish: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
