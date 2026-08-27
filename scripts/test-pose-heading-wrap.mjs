/**
 * Regression: client heading accumulates unboundedly across laps. The old
 * pose clamp `Math.max(-10, Math.min(10, h))` froze remotes at ±10 once yaw
 * passed ~10 rad (often mid lap 2 of a 3-lap race). Server must angle-wrap
 * instead so binary state keeps tracking true orientation.
 *
 * Also rejects non-finite headings (Infinity) that used to poison float32 sync.
 *
 * Usage: node scripts/test-pose-heading-wrap.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8794;
const WS_URL = `ws://127.0.0.1:${PORT}`;
const ROOM = `heading-wrap-${Date.now()}`;

const server = spawn(process.execPath, ["server/index.mjs"], {
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", RACER_PAYMENTS_MOCK: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

const serverLog = [];
server.stdout.on("data", (b) => serverLog.push(String(b)));
server.stderr.on("data", (b) => serverLog.push(String(b)));

function shutdown(code) {
  try {
    server.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  process.exit(code);
}

async function waitServer(ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.once("open", () => {
          ws.close();
          resolve(undefined);
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

function connect() {
  const ws = new WebSocket(WS_URL);
  const state = {
    ws,
    id: "",
    /** @type {{ id: string, h: number }[]} */
    motions: [],
  };
  ws.binaryType = "nodebuffer";
  ws.on("message", (data) => {
    if (Buffer.isBuffer(data) && data.length >= 10 && data[0] === 1) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const count = view.getUint8(9);
      const motions = [];
      let o = 10;
      for (let i = 0; i < count; i++) {
        let end = o;
        while (end < o + 8 && data[end] !== 0) end++;
        const id = data.subarray(o, end).toString("ascii");
        o += 8;
        o += 4; // x
        o += 4; // z
        const h = view.getFloat32(o, true);
        o += 4;
        o += 4; // s
        o += 2; // gear + lap
        motions.push({ id, h });
      }
      state.motions = motions;
      return;
    }
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (msg.t === "welcome") state.id = msg.id;
  });
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve(state));
    ws.once("error", reject);
  });
}

function send(state, msg) {
  state.ws.send(JSON.stringify(msg));
}

/** Raw JSON so `1e309` becomes Infinity (JSON.stringify would emit null). */
function sendRaw(state, raw) {
  state.ws.send(raw);
}

async function until(pred, ms = 4000, label = "condition") {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (pred()) return;
    await sleep(20);
  }
  throw new Error(`timeout waiting for ${label}`);
}

function wrapExpected(h) {
  return Math.atan2(Math.sin(h), Math.cos(h));
}

function near(a, b, eps = 1e-3) {
  return Math.abs(a - b) <= eps;
}

let failed = 0;
function assert(name, cond, detail = "") {
  if (cond) console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

try {
  await waitServer();

  const host = await connect();
  const peer = await connect();

  send(host, {
    t: "create",
    name: "HOST",
    room: ROOM,
    maxPlayers: 4,
    trackId: "forest-loop",
    kind: "car",
    weather: "dry",
  });
  await until(() => !!host.id, 3000, "host welcome");

  send(peer, {
    t: "join",
    name: "PEER",
    room: ROOM,
    kind: "car",
  });
  await until(() => !!peer.id, 3000, "peer welcome");

  send(host, { t: "start", weather: "dry" });
  // Wait until binary state is flowing for both
  await until(() => host.motions.length >= 1, 3000, "binary state");

  // Mid-lap-2 style heading: past the old ±10 clamp, still a normal race yaw.
  const liveH = 10.5; // wraps to ≈ -2.066
  send(host, {
    t: "pose",
    x: 1,
    z: 2,
    h: liveH,
    s: 20,
    g: "3",
    lap: 2,
  });

  const expected = wrapExpected(liveH);
  await until(() => {
    const mine = host.motions.find((m) => m.id === host.id);
    return mine && near(mine.h, expected, 0.05);
  }, 4000, "wrapped heading in binary state");

  const hostMotion = host.motions.find((m) => m.id === host.id);
  assert(
    "accumulated heading is angle-wrapped, not clamped to ±10",
    !!hostMotion &&
      near(hostMotion.h, expected, 0.05) &&
      Math.abs(hostMotion.h) < Math.PI + 0.01 &&
      !near(hostMotion.h, 10, 0.05),
    `h=${hostMotion?.h} expected≈${expected}`,
  );

  // Advance to a clearly different wrapped angle — must not stick at ±10
  await sleep(80); // clear pose rate limit
  const laterH = 14.0; // wraps to ≈ +1.434
  send(host, {
    t: "pose",
    x: 3,
    z: 4,
    h: laterH,
    s: 22,
    g: "4",
    lap: 3,
  });
  const laterExpected = wrapExpected(laterH);
  await until(() => {
    const mine = host.motions.find((m) => m.id === host.id);
    return mine && near(mine.h, laterExpected, 0.05);
  }, 4000, "later wrapped heading");

  const laterMotion = host.motions.find((m) => m.id === host.id);
  assert(
    "heading keeps updating after |h|>10 (not frozen at clamp)",
    !!laterMotion &&
      near(laterMotion.h, laterExpected, 0.05) &&
      Math.abs(laterMotion.h - (hostMotion?.h ?? 0)) > 0.5,
    `h=${laterMotion?.h} expected≈${laterExpected} prev=${hostMotion?.h}`,
  );

  // Infinity must not appear in binary float32 — coerced via finiteOr → 0
  await sleep(80);
  sendRaw(
    host,
    `{"t":"pose","x":5,"z":6,"h":1e309,"s":10,"g":"1","lap":1}`,
  );
  await until(() => {
    const mine = host.motions.find((m) => m.id === host.id);
    return mine && Number.isFinite(mine.h) && near(mine.h, 0, 0.05);
  }, 4000, "finite zero heading after Infinity ingest");

  const infMotion = host.motions.find((m) => m.id === host.id);
  assert(
    "non-finite heading coerced to finite wrapped value",
    !!infMotion && Number.isFinite(infMotion.h) && near(infMotion.h, 0, 0.05),
    `h=${infMotion?.h}`,
  );

  host.ws.close();
  peer.ws.close();

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    shutdown(1);
  }
  console.log("\nAll heading-wrap checks passed.");
  shutdown(0);
} catch (err) {
  console.error("TEST ERROR:", err);
  console.error(serverLog.join(""));
  shutdown(1);
}
