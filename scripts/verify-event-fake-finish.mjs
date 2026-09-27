/**
 * Regression: Event Mode must reject client-trusted early finishes so a paid
 * racer cannot crown themselves and claimPot the WTA pot — including one-shot
 * `pose.lap` spoofs after the countdown.
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
const MIN_LAP_MS = 6_000;

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

function sendPose(ws, lap) {
  ws.send(JSON.stringify({ t: "pose", x: lap, z: lap, h: 0, s: 20, g: "1", lap }));
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
  assert(await startP, "host got start");
  assert(await guestStartP, "guest got start");

  // 1) Finish during countdown — must NOT crown a winner.
  {
    const early = waitFor(host, "raceResult", 900);
    host.send(JSON.stringify({ t: "finish", timeMs: 1000, bestLapMs: 1000 }));
    assert(!(await early), "finish rejected during countdown");
  }

  await new Promise((r) => setTimeout(r, COUNTDOWN_MS + 200));

  // 2) One-shot lap:4 spoof after countdown — still reject (PR130 bypass).
  {
    sendPose(host, 4);
    await new Promise((r) => setTimeout(r, 80));
    const early = waitFor(host, "raceResult", 900);
    host.send(JSON.stringify({ t: "finish", timeMs: 5000, bestLapMs: 2000 }));
    assert(!(await early), "finish rejected for one-shot lap:4 spoof");
  }

  // 3) Stepwise laps without dwell — still reject.
  {
    // Need a fresh race: leave + recreate would be heavy; instead start a new room.
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

  // Fresh room for stepwise / dwell cases (prior host may have polluted lap state).
  const room2 = `fake-finish2-${Date.now().toString(36)}`;
  const host2 = await openSocket();
  const guest2 = await openSocket();
  const hw2P = waitFor(host2, "welcome", 4000);
  host2.send(
    JSON.stringify({
      t: "create",
      name: "Host2",
      room: room2,
      password: "pw",
      maxPlayers: 4,
      trackId: "forest-loop",
      kind: "car",
      color: 0xff0000,
      accent: 0xffffff,
      event: { buyInSats: 10, mode: "race" },
    }),
  );
  const hw2 = await hw2P;
  assert(hw2?.id, "host2 welcome");
  const gw2P = waitFor(guest2, "welcome", 4000);
  guest2.send(
    JSON.stringify({
      t: "join",
      name: "Guest2",
      room: room2,
      password: "pw",
      color: 0x00ff00,
      accent: 0xffffff,
      event: true,
    }),
  );
  assert((await gw2P)?.id, "guest2 welcome");
  await new Promise((r) => setTimeout(r, 5_500));
  const s2 = waitFor(host2, "start", 4000);
  const gs2 = waitFor(guest2, "start", 4000);
  host2.send(JSON.stringify({ t: "start" }));
  assert(await s2, "host2 start");
  assert(await gs2, "guest2 start");
  await new Promise((r) => setTimeout(r, COUNTDOWN_MS + 200));

  // Instant stepwise 1→2→3→4 with no dwell — reject.
  {
    sendPose(host2, 2);
    await new Promise((r) => setTimeout(r, 50));
    sendPose(host2, 3);
    await new Promise((r) => setTimeout(r, 50));
    sendPose(host2, 4);
    await new Promise((r) => setTimeout(r, 50));
    const early = waitFor(host2, "raceResult", 900);
    host2.send(JSON.stringify({ t: "finish", timeMs: 8000, bestLapMs: 2000 }));
    assert(!(await early), "finish rejected for undwelled lap steps");
  }

  // Dwelled stepwise advances — accept.
  {
    // Lap 2 already stamped above without enough dwell from GO; wait out the
    // remaining dwell from GO for lap 2, then restamp by… actually lap 2 is
    // already set and won't re-stamp. Need fresh race.
  }

  try {
    host2.close();
  } catch {
    /* ignore */
  }
  try {
    guest2.close();
  } catch {
    /* ignore */
  }

  const room3 = `fake-finish3-${Date.now().toString(36)}`;
  const host3 = await openSocket();
  const guest3 = await openSocket();
  const hw3P = waitFor(host3, "welcome", 4000);
  host3.send(
    JSON.stringify({
      t: "create",
      name: "Host3",
      room: room3,
      password: "pw",
      maxPlayers: 4,
      trackId: "forest-loop",
      kind: "car",
      color: 0xff0000,
      accent: 0xffffff,
      event: { buyInSats: 10, mode: "race" },
    }),
  );
  const hw3 = await hw3P;
  assert(hw3?.id, "host3 welcome");
  const gw3P = waitFor(guest3, "welcome", 4000);
  guest3.send(
    JSON.stringify({
      t: "join",
      name: "Guest3",
      room: room3,
      password: "pw",
      color: 0x00ff00,
      accent: 0xffffff,
      event: true,
    }),
  );
  assert((await gw3P)?.id, "guest3 welcome");
  await new Promise((r) => setTimeout(r, 5_500));
  const s3 = waitFor(host3, "start", 4000);
  const gs3 = waitFor(guest3, "start", 4000);
  host3.send(JSON.stringify({ t: "start" }));
  assert(await s3, "host3 start");
  assert(await gs3, "guest3 start");
  await new Promise((r) => setTimeout(r, COUNTDOWN_MS + MIN_LAP_MS + 100));

  sendPose(host3, 2);
  await new Promise((r) => setTimeout(r, MIN_LAP_MS + 100));
  sendPose(host3, 3);
  await new Promise((r) => setTimeout(r, MIN_LAP_MS + 100));
  sendPose(host3, 4);
  await new Promise((r) => setTimeout(r, 80));
  const resultP = waitFor(host3, "raceResult", 2000);
  host3.send(JSON.stringify({ t: "finish", timeMs: 65000, bestLapMs: 20000 }));
  const result = await resultP;
  assert(result?.winnerId === hw3.id, `expected host3 win, got ${result?.winnerId}`);
  assert(result?.event?.potSats > 0, "event pot present on result");

  try {
    host3.close();
  } catch {
    /* ignore */
  }
  try {
    guest3.close();
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
