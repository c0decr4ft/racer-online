/**
 * Regression: after all-wreck fieldReset, finish must wait for the client
 * 3-2-1-GO hold (raceOpenAt). Otherwise any client can crown themselves while
 * peers are still frozen on the grid.
 *
 * Concrete trigger (pre-fix):
 *   1. Casual MP ≥2 → both crash → fieldReset
 *   2. During local countdown, send {t:"finish"}
 *   3. Server accepted → raceResult / map vote while others held
 *
 * Usage: node scripts/verify-field-reset-finish.mjs
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8807 + Math.floor(Math.random() * 200);
const HOST = "127.0.0.1";
const COUNTDOWN_MS = 400;
const WRECK_RESET_MS = 200;

process.env.RACER_RACE_COUNTDOWN_MS = String(COUNTDOWN_MS);
process.env.RACER_ALL_WRECK_RESET_MS = String(WRECK_RESET_MS);
process.env.HOST = HOST;
process.env.PORT = String(PORT);
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "racer-field-reset-finish-"));
process.env.PUBLIC_BASE_URL = `http://${HOST}:${PORT}`;
process.env.RACER_PAYMENTS_MOCK = "1";

await import("../server/index.mjs");
await delay(400);

const failures = [];
function check(ok, what) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${what}`);
  if (!ok) failures.push(what);
}

async function connect(label) {
  const ws = new WebSocket(`ws://${HOST}:${PORT}`);
  /** @type {any[]} */
  const messages = [];
  ws.on("message", (raw, isBinary) => {
    if (isBinary) return;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    if (buf[0] === 1) return; // binary state
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
    send: (msg) => ws.send(JSON.stringify(msg)),
    async waitFor(pred, timeoutMs = 8_000) {
      const until = Date.now() + timeoutMs;
      for (;;) {
        const hit = messages.find(pred);
        if (hit) return hit;
        if (Date.now() > until) return null;
        await delay(25);
      }
    },
    clearMessages() {
      messages.length = 0;
    },
  };
}

const ROOM = `fieldreset-finish-${Date.now().toString(36)}`;
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

host.send({ t: "start", trackId: "forest-loop", weather: "dry" });
check(!!(await host.waitFor((m) => m.t === "start")), "race started");
check(!!(await guest.waitFor((m) => m.t === "start")), "guest saw start");

host.clearMessages();
guest.clearMessages();
host.send({ t: "crash" });
guest.send({ t: "crash" });
check(!!(await host.waitFor((m) => m.t === "wrecked")), "first wreck seen");
check(
  !!(await host.waitFor((m) => m.t === "fieldReset", 4_000)),
  "fieldReset after all wrecked",
);
check(
  !!(await guest.waitFor((m) => m.t === "fieldReset", 2_000)),
  "guest saw fieldReset",
);

host.clearMessages();
guest.clearMessages();
// During the post-fieldReset countdown hold, finish must be ignored.
host.send({ t: "finish", timeMs: 12_000, bestLapMs: 4_000 });
await delay(Math.max(50, Math.floor(COUNTDOWN_MS * 0.4)));
check(
  !host.messages.some((m) => m.t === "raceResult") &&
    !guest.messages.some((m) => m.t === "raceResult"),
  "finish rejected during fieldReset countdown",
);

await delay(COUNTDOWN_MS + 150);
host.clearMessages();
guest.clearMessages();
host.send({ t: "finish", timeMs: 55_000, bestLapMs: 16_000 });
const win = await host.waitFor(
  (m) => m.t === "raceResult" && m.winnerId === hostId,
  4_000,
);
check(!!win, "finish accepted after fieldReset countdown");

host.ws.close();
guest.ws.close();
await delay(150);

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nok");
process.exit(0);
