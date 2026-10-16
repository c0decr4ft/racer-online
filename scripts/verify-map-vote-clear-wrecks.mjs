/**
 * Regression: casual map-vote rematch must clear wreckedIds (same as host start).
 *
 * Before the fix, resolveMapVote's delayed start left last race's wrecked racers
 * frozen (pose ignored), unable to finish, and still marked burning in binary state.
 *
 * Usage: node scripts/verify-map-vote-clear-wrecks.mjs
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8802;
const HOST = "127.0.0.1";
const STATE_BIN_TYPE = 1;
const STATE_PLAYER_BYTES = 8 + 16 + 3;

process.env.RACER_MAP_VOTE_MS = process.env.RACER_MAP_VOTE_MS || "400";
process.env.HOST = HOST;
process.env.PORT = String(PORT);
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "racer-mapvote-wreck-"));
process.env.PUBLIC_BASE_URL = `http://${HOST}:${PORT}`;
process.env.RACER_PAYMENTS_MOCK = "1";

await import("../server/index.mjs");
await delay(400);

const failures = [];
function check(ok, what) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${what}`);
  if (!ok) failures.push(what);
}

/** @param {Buffer} buf */
function decodeStateBinary(buf) {
  if (buf.byteLength < 10 || buf[0] !== STATE_BIN_TYPE) return null;
  const count = buf[9];
  const need = 10 + count * STATE_PLAYER_BYTES;
  if (buf.byteLength < need || count > 8) return null;
  /** @type {{ id: string, x: number, wrecked: boolean }[]} */
  const motions = [];
  let o = 10;
  for (let i = 0; i < count; i++) {
    let end = o;
    while (end < o + 8 && buf[end] !== 0) end++;
    const id = buf.toString("ascii", o, end);
    o += 8;
    const x = buf.readFloatLE(o);
    o += 4;
    o += 4; // z
    o += 4; // h
    o += 4; // s
    o += 1; // gear
    o += 1; // lap
    const wrecked = (buf[o++] & 1) !== 0;
    motions.push({ id, x, wrecked });
  }
  return motions;
}

async function connect(label) {
  const ws = new WebSocket(`ws://${HOST}:${PORT}`);
  /** @type {any[]} */
  const messages = [];
  /** @type {{ id: string, x: number, wrecked: boolean }[][]} */
  const states = [];
  ws.on("message", (raw, isBinary) => {
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    if (isBinary || buf[0] === STATE_BIN_TYPE) {
      const decoded = decodeStateBinary(buf);
      if (decoded) {
        states.push(decoded);
        return;
      }
    }
    try {
      messages.push(JSON.parse(buf.toString("utf8")));
    } catch {
      /* ignore */
    }
  });
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  return {
    label,
    ws,
    messages,
    states,
    send: (msg) => ws.send(JSON.stringify(msg)),
    async waitFor(pred, timeoutMs = 12_000) {
      const until = Date.now() + timeoutMs;
      for (;;) {
        const hit = messages.find(pred);
        if (hit) return hit;
        if (Date.now() > until) return null;
        await delay(40);
      }
    },
    clearMessages() {
      messages.length = 0;
      states.length = 0;
    },
  };
}

{
  const ROOM = "mapvotewreck";
  const host = await connect("host");
  host.send({
    t: "create",
    name: "HOST",
    room: ROOM,
    password: "pw",
    maxPlayers: 4,
    trackId: "forest-loop",
    kind: "car",
    weather: "dry",
  });
  const welcomeHost = await host.waitFor((m) => m.t === "welcome");
  check(!!welcomeHost, "host welcomed");
  const hostId = welcomeHost?.id;

  const guest = await connect("guest");
  guest.send({ t: "join", name: "GUEST", room: ROOM, password: "pw" });
  const welcomeGuest = await guest.waitFor((m) => m.t === "welcome");
  check(!!welcomeGuest, "guest welcomed");
  const guestId = welcomeGuest?.id;

  host.send({ t: "start", trackId: "forest-loop", weather: "dry" });
  check(!!(await host.waitFor((m) => m.t === "start")), "first race started");
  check(!!(await guest.waitFor((m) => m.t === "start")), "guest saw first start");

  guest.send({ t: "crash" });
  check(
    !!(await host.waitFor((m) => m.t === "wrecked" && m.id === guestId)),
    "guest marked wrecked on server",
  );

  // While wrecked, finish must be ignored.
  guest.clearMessages();
  guest.send({ t: "finish", timeMs: 30_000, bestLapMs: 10_000 });
  await delay(400);
  check(
    !guest.messages.some((m) => m.t === "raceResult"),
    "wrecked guest cannot finish during race 1",
  );

  host.clearMessages();
  guest.clearMessages();
  host.send({ t: "finish", timeMs: 45_000, bestLapMs: 14_000 });
  check(!!(await host.waitFor((m) => m.t === "raceResult" && m.winnerId === hostId)), "host won race 1");

  // MAP_VOTE_MS (~400) + 1800ms resolve delay
  const nextStart = await guest.waitFor((m) => m.t === "start", 8_000);
  check(!!nextStart, "map-vote rematch started");

  guest.clearMessages();
  host.clearMessages();
  await delay(300);
  guest.send({ t: "finish", timeMs: 40_000, bestLapMs: 12_000 });
  const guestWin = await guest.waitFor((m) => m.t === "raceResult" && m.winnerId === guestId, 4_000);
  check(!!guestWin, "wrecked guest can finish after map-vote rematch (wreckedIds cleared)");

  host.ws.close();
  guest.ws.close();
  await delay(200);
}

{
  const ROOM = "mapvotewreck2";
  const host = await connect("host2");
  host.send({
    t: "create",
    name: "HOST",
    room: ROOM,
    password: "pw",
    maxPlayers: 4,
    trackId: "forest-loop",
    kind: "car",
    weather: "dry",
  });
  check(!!(await host.waitFor((m) => m.t === "welcome")), "host2 welcomed");

  const guest = await connect("guest2");
  guest.send({ t: "join", name: "GUEST", room: ROOM, password: "pw" });
  const welcomeGuest = await guest.waitFor((m) => m.t === "welcome");
  check(!!welcomeGuest, "guest2 welcomed");
  const guestId = welcomeGuest?.id;

  host.send({ t: "start", trackId: "forest-loop", weather: "dry" });
  check(!!(await guest.waitFor((m) => m.t === "start")), "guest2 saw first start");

  guest.send({ t: "pose", x: 100, z: 200, h: 0.1, s: 20, g: "3", lap: 1 });
  await delay(80);
  guest.send({ t: "crash" });
  check(!!(await host.waitFor((m) => m.t === "wrecked" && m.id === guestId)), "guest2 wrecked");

  guest.clearMessages();
  host.clearMessages();
  host.send({ t: "finish", timeMs: 50_000, bestLapMs: 15_000 });
  check(!!(await guest.waitFor((m) => m.t === "start", 8_000)), "guest2 rematch start");

  guest.clearMessages();
  host.clearMessages();
  await delay(250);
  for (let i = 0; i < 10; i++) {
    guest.send({
      t: "pose",
      x: 900 + i,
      z: 800,
      h: 1.2,
      s: 30,
      g: "4",
      lap: 2,
    });
    await delay(50);
  }
  await delay(250);

  const snapshots = [...host.states, ...guest.states];
  const guestSnapshots = snapshots
    .map((motions) => motions.find((p) => p.id === guestId))
    .filter(Boolean);
  const latest = guestSnapshots[guestSnapshots.length - 1];
  check(!!latest, "binary state includes guest after rematch");
  if (latest) {
    check(
      latest.wrecked !== true,
      `guest wrecked flag cleared after rematch (got wrecked=${latest.wrecked})`,
    );
    check(
      latest.x >= 890,
      `guest pose accepted after rematch (x=${latest.x}, expected ≥890)`,
    );
  }

  host.ws.close();
  guest.ws.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll map-vote clear-wrecks checks passed.");
process.exit(0);
