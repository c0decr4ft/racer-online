/**
 * Regression: crash during 3-2-1-GO must not soft-lock the room.
 *
 * Debounce/hold must cover the full client countdown. A shorter window lets a
 * connected client send {t:"crash"} every ~2.1s and restart the hold forever
 * so GO never arrives.
 *
 * Usage: node scripts/test-crash-countdown-softlock.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8792;
const WS_URL = `ws://127.0.0.1:${PORT}`;
/** Must match server RACE_COUNTDOWN_MS. */
const RACE_COUNTDOWN_MS = 3_000;

const server = spawn(process.execPath, ["server/index.mjs"], {
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});

const serverLog = [];
server.stdout.on("data", (b) => serverLog.push(String(b)));
server.stderr.on("data", (b) => serverLog.push(String(b)));

async function waitServer(ms = 5000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.once("open", () => {
          ws.close();
          resolve();
        });
        ws.once("error", reject);
      });
      return;
    } catch {
      await sleep(50);
    }
  }
  throw new Error(`server not ready\n${serverLog.join("")}`);
}

function client() {
  const ws = new WebSocket(WS_URL);
  const state = {
    ws,
    id: "",
    /** @type {object[]} */
    events: [],
  };
  ws.on("message", (data) => {
    if (Buffer.isBuffer(data) && data.length >= 1 && data[0] === 1) return;
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (msg.t === "welcome") state.id = msg.id;
    if (msg.t === "start" || msg.t === "crashReset" || msg.t === "raceResult") {
      state.events.push(msg);
    }
  });
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve(state));
    ws.once("error", reject);
  });
}

function send(state, msg) {
  state.ws.send(JSON.stringify(msg));
}

async function until(pred, ms = 3000, label = "condition") {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (pred()) return;
    await sleep(20);
  }
  throw new Error(`timeout waiting for ${label}`);
}

let failed = 0;
function assert(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

try {
  await waitServer();
  const room = `crash-softlock-${Date.now().toString(36)}`;
  const host = await client();
  send(host, {
    t: "create",
    name: "Host",
    room,
    maxPlayers: 4,
    trackId: "forest-loop",
    kind: "car",
    weather: "dry",
  });
  await until(() => !!host.id, 3000, "host welcome");

  const guest = await client();
  send(guest, { t: "join", name: "Guest", room });
  await until(() => !!guest.id, 3000, "guest welcome");

  send(host, { t: "start", weather: "dry" });
  await until(
    () => host.events.some((e) => e.t === "start") && guest.events.some((e) => e.t === "start"),
    2000,
    "start",
  );

  // Spam crash every 2.1s — the old 2s debounce accepted these and soft-locked GO.
  let sent = 0;
  const spam = setInterval(() => {
    send(guest, { t: "crash" });
    sent += 1;
  }, 2100);
  send(guest, { t: "crash" });
  sent += 1;

  await sleep(RACE_COUNTDOWN_MS + 500);

  const resetsDuringHold = guest.events.filter((e) => e.t === "crashReset").length;
  assert(
    "crash-rejected-during-start-countdown",
    resetsDuringHold === 0,
    `crashReset count=${resetsDuringHold} sent=${sent}`,
  );

  // After GO, one crash should still work, then the hold must reject spam.
  await sleep(200);
  send(guest, { t: "crash" });
  await until(
    () => guest.events.filter((e) => e.t === "crashReset").length === 1,
    2000,
    "post-GO crashReset",
  );

  await sleep(RACE_COUNTDOWN_MS + 400);
  clearInterval(spam);

  const resetsTotal = guest.events.filter((e) => e.t === "crashReset").length;
  assert(
    "crash-spam-cannot-softlock-countdown",
    resetsTotal === 1,
    `crashReset count=${resetsTotal} sent=${sent}`,
  );

  // After the post-crash hold, a fresh crash is accepted again.
  send(guest, { t: "crash" });
  await until(
    () => guest.events.filter((e) => e.t === "crashReset").length === 2,
    2000,
    "second post-hold crashReset",
  );
  assert(
    "crash-accepted-after-hold",
    guest.events.filter((e) => e.t === "crashReset").length === 2,
  );

  console.log("crash-countdown-softlock: ok");
} catch (err) {
  failed++;
  console.log(`FAIL  harness — ${err?.message || err}`);
  if (serverLog.length) console.log(serverLog.join(""));
} finally {
  try {
    server.kill("SIGTERM");
  } catch {
    /* ignore */
  }
}

process.exit(failed ? 1 : 0);
