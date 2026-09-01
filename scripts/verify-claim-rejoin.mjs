/**
 * Regression: Event Mode winner disconnect before claim must not permanently
 * lock the pot. The room stays held with a claimSecret; rejoining with that
 * secret remaps winnerId so claimPot can proceed.
 *
 * Run: RACER_PAYMENTS_MOCK=1 node scripts/verify-claim-rejoin.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 8791;
const HOST = "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;
const WS_URL = `ws://${HOST}:${PORT}`;

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

function ok(msg) {
  console.log("ok:", msg);
}

function onceMessage(ws, pred, ms = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for message")), ms);
    const onMsg = (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!pred(msg)) return;
      clearTimeout(timer);
      ws.off("message", onMsg);
      resolve(msg);
    };
    ws.on("message", onMsg);
  });
}

async function main() {
  const child = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST,
      RACER_PAYMENTS_MOCK: "1",
      PUBLIC_BASE_URL: BASE,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let boot = "";
  child.stdout.on("data", (d) => {
    boot += d.toString();
  });
  child.stderr.on("data", (d) => {
    boot += d.toString();
  });

  for (let i = 0; i < 40; i++) {
    if (/Sats Racer http/.test(boot)) break;
    await sleep(100);
  }
  if (!/Sats Racer http/.test(boot)) {
    child.kill();
    fail(`server did not start:\n${boot}`);
  }

  const { default: WebSocket } = await import("ws");

  const room = `reclaim-${Date.now().toString(36).slice(-6)}`;
  const password = "test";

  const host = new WebSocket(WS_URL);
  await new Promise((resolve, reject) => {
    host.once("open", resolve);
    host.once("error", reject);
  });
  host.send(
    JSON.stringify({
      t: "create",
      name: "Host",
      room,
      password,
      maxPlayers: 2,
      trackId: "forest-loop",
      kind: "car",
      weather: "dry",
      event: { buyInSats: 10 },
    }),
  );
  const welcomeHost = await onceMessage(host, (m) => m.t === "welcome");
  const hostId = welcomeHost.id;

  const guest = new WebSocket(WS_URL);
  await new Promise((resolve, reject) => {
    guest.once("open", resolve);
    guest.once("error", reject);
  });
  guest.send(
    JSON.stringify({
      t: "join",
      name: "Guest",
      room,
      password,
      event: true,
    }),
  );
  const welcomeGuest = await onceMessage(guest, (m) => m.t === "welcome");
  const guestId = welcomeGuest.id;

  // Wait for mock auto-pay (~3s) + lobby settle poll (2s).
  await sleep(4500);

  host.send(JSON.stringify({ t: "start" }));
  await onceMessage(host, (m) => m.t === "start");
  await onceMessage(guest, (m) => m.t === "start");

  host.send(JSON.stringify({ t: "finish", timeMs: 60_000, bestLapMs: 20_000 }));
  const result = await onceMessage(host, (m) => m.t === "raceResult" && m.claimSecret);
  if (!result.claimSecret || result.claimSecret.length < 16) fail("winner did not receive claimSecret");
  ok(`claimSecret issued (${result.claimSecret.slice(0, 8)}…)`);

  // Winner drops before claiming.
  host.close();
  await sleep(300);

  // Guest also leaves so the room is empty but held open.
  guest.close();
  await sleep(400);

  // Rejoin with the secret — must remap winnerId.
  const reclaim = new WebSocket(WS_URL);
  await new Promise((resolve, reject) => {
    reclaim.once("open", resolve);
    reclaim.once("error", reject);
  });
  reclaim.send(
    JSON.stringify({
      t: "join",
      name: "Host",
      room,
      password,
      event: true,
      claimSecret: result.claimSecret,
    }),
  );
  const welcomeBack = await onceMessage(reclaim, (m) => m.t === "welcome");
  if (welcomeBack.phase !== "finished") fail(`expected phase finished, got ${welcomeBack.phase}`);
  if (welcomeBack.claimSecret !== result.claimSecret) fail("welcome missing claimSecret");
  ok(`rejoined as ${welcomeBack.id} (was ${hostId})`);

  reclaim.send(JSON.stringify({ t: "claimPot", tipPercent: 0 }));
  const payout = await onceMessage(reclaim, (m) => m.t === "payoutResult");
  if (!payout.ok) fail(`claim failed: ${payout.error}`);
  if (!payout.token) fail("claim returned no token");
  ok(`pot claimed after reclaim (${payout.winnerSats} sats)`);

  // Wrong secret must not join a finished room.
  const spoof = new WebSocket(WS_URL);
  await new Promise((resolve, reject) => {
    spoof.once("open", resolve);
    spoof.once("error", reject);
  });
  const spoofErr = onceMessage(spoof, (m) => m.t === "error");
  spoof.send(
    JSON.stringify({
      t: "join",
      name: "Thief",
      room,
      password,
      event: true,
      claimSecret: "deadbeefdeadbeefdeadbeefdeadbeef",
    }),
  );
  const err = await spoofErr;
  if (!/race already started|room not found/i.test(err.message || "")) {
    fail(`expected reject for wrong secret, got: ${err.message}`);
  }
  ok("wrong claimSecret rejected");

  reclaim.close();
  spoof.close();
  child.kill();
  ok("all claim-rejoin checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
