/**
 * Regression for the online countdown pose silence bug:
 * after start, clients must be able to upload grid x/z/h so binary state no
 * longer carries lobby placeholders into GO.
 *
 * Usage: node scripts/test-grid-pose-hold.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8791;
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
    poses: new Map(),
    /** @type {object[]} */
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
        const x = view.getFloat32(o, true);
        o += 4;
        const z = view.getFloat32(o, true);
        o += 4;
        const h = view.getFloat32(o, true);
        o += 4;
        o += 4; // s
        o += 2; // gear + lap
        motions.push({ id, x, z, h });
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
    if (msg.t === "welcome") {
      state.id = msg.id;
      for (const p of msg.players) state.poses.set(p.id, p);
      state.poses.set(msg.you.id, msg.you);
    } else if (msg.t === "join") {
      state.poses.set(msg.player.id, msg.player);
    } else if (msg.t === "lobby") {
      for (const p of msg.players) state.poses.set(p.id, p);
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
  const room = `grid-hold-${Date.now().toString(36)}`;
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
  await until(() => host.poses.has(guest.id), 3000, "host sees guest");

  const lobbyGuest = host.poses.get(guest.id);
  assert("lobby-placeholder-near-origin", Math.hypot(lobbyGuest.x, lobbyGuest.z) < 12);

  send(host, { t: "start", weather: "dry" });
  await sleep(50);

  // Emulate game.ts gridHeld uploads from both racers.
  for (let i = 0; i < 12; i++) {
    send(host, { t: "pose", x: 42.5, z: -18.25, h: 1.2, s: 0, g: "1", lap: 1 });
    send(guest, { t: "pose", x: 40.1, z: -16.8, h: 1.15, s: 0, g: "1", lap: 1 });
    await sleep(20);
  }

  await until(
    () =>
      guest.motions.some((m) => m.id === guest.id && Math.hypot(m.x - 40.1, m.z - -16.8) < 0.05) &&
      guest.motions.some((m) => m.id === host.id && Math.hypot(m.x - 42.5, m.z - -18.25) < 0.05),
    3000,
    "binary state with grid poses",
  );

  const guestMotion = guest.motions.find((m) => m.id === guest.id);
  const hostMotion = guest.motions.find((m) => m.id === host.id);
  assert(
    "host-grid-uploaded",
    !!hostMotion && Math.hypot(hostMotion.x - 42.5, hostMotion.z - -18.25) < 0.05,
    hostMotion ? `x=${hostMotion.x.toFixed(2)} z=${hostMotion.z.toFixed(2)}` : "",
  );
  assert(
    "guest-grid-uploaded",
    !!guestMotion && Math.hypot(guestMotion.x - 40.1, guestMotion.z - -16.8) < 0.05,
    guestMotion ? `x=${guestMotion.x.toFixed(2)} z=${guestMotion.z.toFixed(2)}` : "",
  );
  assert(
    "not-lobby-placeholder",
    !!guestMotion && Math.hypot(guestMotion.x, guestMotion.z) > 10,
  );
  console.log("grid-pose-hold: ok");
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
