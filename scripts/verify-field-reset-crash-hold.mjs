/**
 * Regression: after all-wreck fieldReset, crash must wait for the client
 * 3-2-1-GO hold (raceOpenAt). Otherwise one crash re-ignites peers whose
 * server poses still sit at the wreck pile-up (clients are frozen on the
 * grid and do not upload poses), scheduling another fieldReset forever.
 *
 * Concrete trigger (pre-fix):
 *   1. Casual MP ≥2 → place both near each other → both crash → fieldReset
 *   2. During local countdown, send {t:"crash"} from one client
 *   3. Peer ignites via tickWreckFire on stale co-located poses → fieldReset loop
 *
 * Usage: node scripts/verify-field-reset-crash-hold.mjs
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8817 + Math.floor(Math.random() * 200);
const HOST = "127.0.0.1";
const COUNTDOWN_MS = 900;
const WRECK_RESET_MS = 200;

process.env.RACER_RACE_COUNTDOWN_MS = String(COUNTDOWN_MS);
process.env.RACER_ALL_WRECK_RESET_MS = String(WRECK_RESET_MS);
process.env.HOST = HOST;
process.env.PORT = String(PORT);
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "racer-field-reset-crash-"));
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

const ROOM = `fieldreset-crash-${Date.now().toString(36)}`;
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
check(!!(await host.waitFor((m) => m.t === "start")), "race started");
check(!!(await guest.waitFor((m) => m.t === "start")), "guest saw start");

// Place both cars in a fire-spread pile-up, then all-wreck → fieldReset.
host.send({ t: "pose", x: 10, z: 10, h: 0, s: 0, g: "1", lap: 1 });
guest.send({ t: "pose", x: 12, z: 10, h: 0, s: 0, g: "1", lap: 1 });
await delay(80);

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
// During the post-fieldReset countdown hold, crash must be ignored — otherwise
// the peer still sitting at the pile-up on the server re-ignites.
host.send({ t: "crash" });
await delay(Math.max(80, Math.floor(COUNTDOWN_MS * 0.5)));
check(
  !host.messages.some((m) => m.t === "wrecked" && m.id === hostId) &&
    !guest.messages.some((m) => m.t === "wrecked" && m.id === hostId),
  "crash rejected during fieldReset countdown",
);
check(
  !host.messages.some((m) => m.t === "fieldReset") &&
    !guest.messages.some((m) => m.t === "fieldReset"),
  "no second fieldReset during hold",
);

await delay(COUNTDOWN_MS + 200);
host.clearMessages();
guest.clearMessages();
// After the hold, crash is accepted again (normal wreck path).
host.send({ t: "crash" });
const wrecked = await host.waitFor(
  (m) => m.t === "wrecked" && m.id === hostId,
  3_000,
);
check(!!wrecked, "crash accepted after fieldReset countdown");
check(
  !host.messages.some((m) => m.t === "wrecked" && m.id === guestId),
  "peer not auto-ignited immediately after post-hold crash",
);

host.ws.close();
guest.ws.close();
await delay(150);

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nok");
process.exit(0);
