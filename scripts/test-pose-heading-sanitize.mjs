/**
 * Regression: a crafted pose with non-finite / huge heading must not poison
 * 60Hz binary state (IEEE Infinity) or hang peer remotes in wrapPi while-loops.
 *
 * Usage: node scripts/test-pose-heading-sanitize.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8793;
const WS_URL = `ws://127.0.0.1:${PORT}`;

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

function client() {
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

/** Send raw JSON so `1e309` becomes Infinity (JSON.stringify would emit null). */
function sendRaw(state, raw) {
  state.ws.send(raw);
}

async function until(pred, ms = 3000, label = "condition") {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (pred()) return;
    await sleep(20);
  }
  throw new Error(`timeout waiting for ${label}`);
}

/** Old while-loop form — hangs on Infinity / huge dh. */
function wrapPiLegacy(dh) {
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return dh;
}

function wrapPiSafe(dh) {
  if (!Number.isFinite(dh)) return 0;
  return Math.atan2(Math.sin(dh), Math.cos(dh));
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
  const host = await client();
  const peer = await client();

  send(host, {
    t: "create",
    name: "HOST",
    room: "HEADING",
    maxPlayers: 4,
    trackId: "meadow",
    kind: "car",
  });
  await until(() => !!host.id, 3000, "host welcome");

  send(peer, {
    t: "join",
    name: "PEER",
    room: "HEADING",
  });
  await until(() => !!peer.id, 3000, "peer welcome");

  send(host, { t: "start" });
  await until(() => host.motions.length >= 2, 3000, "binary state after start");

  // Crafted wire JSON: 1e309 parses as Infinity in JS. Old server did
  // `p.h = +msg.h || 0` (keeps Infinity) and float32-broadcast it to peers.
  sendRaw(host, `{"t":"pose","x":10,"z":20,"h":1e309,"s":12,"g":"3","lap":1}`);

  let afterInf = null;
  await until(() => {
    afterInf = peer.motions.find((m) => m.id === host.id) || null;
    // Wait until a sample arrives that is finite (sanitized) — never Infinity.
    return afterInf != null && Number.isFinite(afterInf.h);
  }, 3000, "finite heading after Infinity pose");

  assert(
    "server binary heading is finite after Infinity pose",
    afterInf != null && Number.isFinite(afterInf.h) && afterInf.h !== Infinity,
    `h=${afterInf?.h}`,
  );
  assert(
    "Infinity pose does not survive as IEEE Inf on the wire",
    peer.motions.every((m) => Number.isFinite(m.h)),
    peer.motions.map((m) => m.h).join(","),
  );

  // Clear rate-limit window, then send a known wrap candidate (7.5 → ~7.5-2π).
  await sleep(20);
  sendRaw(host, `{"t":"pose","x":11,"z":21,"h":7.5,"s":12,"g":"3","lap":1}`);
  const expected = Math.atan2(Math.sin(7.5), Math.cos(7.5));
  let afterWrap = null;
  await until(() => {
    afterWrap = peer.motions.find((m) => m.id === host.id) || null;
    return afterWrap != null && Math.abs(afterWrap.h - expected) < 1e-3;
  }, 3000, "wrapped ordinary out-of-range heading");
  assert(
    "server wraps 7.5 rad into (-π, π]",
    afterWrap != null && Math.abs(afterWrap.h - expected) < 1e-3,
    `h=${afterWrap?.h} expected=${expected}`,
  );

  // Huge finite heading: float32 can store ~1e20; must stay finite + bounded.
  await sleep(20);
  const expectedHuge = Math.atan2(Math.sin(1e20), Math.cos(1e20));
  sendRaw(host, `{"t":"pose","x":12,"z":22,"h":1e20,"s":12,"g":"3","lap":1}`);
  let afterHuge = null;
  await until(() => {
    afterHuge = peer.motions.find((m) => m.id === host.id) || null;
    return afterHuge != null && Math.abs(afterHuge.h - expectedHuge) < 1e-3;
  }, 3000, "bounded heading after 1e20 pose");
  assert(
    "server keeps 1e20 heading finite and in (-π, π]",
    afterHuge != null &&
      Number.isFinite(afterHuge.h) &&
      Math.abs(afterHuge.h) <= Math.PI + 1e-3 &&
      Math.abs(afterHuge.h - expectedHuge) < 1e-3,
    `h=${afterHuge?.h} expected=${expectedHuge}`,
  );

  // Unit-level: safe wrap must finish instantly on the values that hung remotes.
  const t0 = Date.now();
  const safeInf = wrapPiSafe(Infinity);
  const safeHuge = wrapPiSafe(1e20);
  const elapsed = Date.now() - t0;
  assert("safe wrapPi handles Infinity", safeInf === 0, `got ${safeInf}`);
  assert(
    "safe wrapPi handles 1e20 quickly",
    Number.isFinite(safeHuge) && elapsed < 50,
    `h=${safeHuge} ms=${elapsed}`,
  );

  // Old failure mode: subtracting 2π from Infinity never progresses.
  let dh = Infinity;
  dh -= Math.PI * 2;
  assert("legacy wrapPi cannot make progress on Infinity", dh === Infinity);

  // Sanity: normal heading still wraps as expected.
  const quarter = wrapPiSafe(Math.PI / 2);
  assert("safe wrapPi preserves π/2", Math.abs(quarter - Math.PI / 2) < 1e-9, `got ${quarter}`);

  // Keep a reference so tree-shaking / lint doesn't flag the legacy helper as unused.
  assert("legacy helper retained for documentation", typeof wrapPiLegacy === "function");
} catch (err) {
  failed++;
  console.error("FAIL  suite error —", err instanceof Error ? err.message : err);
  if (serverLog.length) console.error(serverLog.join(""));
} finally {
  try {
    server.kill("SIGTERM");
  } catch {
    /* ignore */
  }
}

process.exit(failed ? 1 : 0);
