/**
 * Regression: a room torn down after the last player left must never delete a
 * DIFFERENT room that has since been created under the same name.
 *
 * `removeClientFromRoom` awaits mint I/O (Event Mode buy-in refund / battle
 * leftover collect) before it drops the room from the `rooms` map. A player who
 * leaves a paid lobby and immediately recreates that room name gets a brand new
 * room + pot — and the old teardown used to delete it by name, stranding the new
 * pot and answering every message with "room gone".
 *
 * Usage: node scripts/verify-room-teardown.mjs
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";
import { payments } from "../server/payments.mjs";

const PORT = 8798;
const HOST = "127.0.0.1";
const ROOM = "teardown";

// Mock payouts resolve in a microtask; real mint sends take hundreds of ms.
// Simulate that latency so the teardown await spans a real event-loop turn.
const MINT_LATENCY_MS = 400;
const mockSendToken = payments.sendToken;
payments.sendToken = async (...args) => {
  await delay(MINT_LATENCY_MS);
  return mockSendToken(...args);
};

process.env.HOST = HOST;
process.env.PORT = String(PORT);
// Keep the harness off the dev server's durable stores.
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "racer-teardown-"));
await import("../server/index.mjs");
await delay(400);

const failures = [];
function check(ok, what) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${what}`);
  if (!ok) failures.push(what);
}

/** Minimal WS client that records server messages. */
async function connect(label) {
  const ws = new WebSocket(`ws://${HOST}:${PORT}`);
  const messages = [];
  ws.on("message", (raw) => {
    try {
      messages.push(JSON.parse(String(raw)));
    } catch {
      /* binary state frame */
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
    async waitFor(pred, timeoutMs = 12_000) {
      const until = Date.now() + timeoutMs;
      for (;;) {
        const hit = messages.find(pred);
        if (hit) return hit;
        if (Date.now() > until) return null;
        await delay(50);
      }
    },
  };
}

function createEventRoom(peer, name) {
  peer.send({
    t: "create",
    name,
    room: ROOM,
    password: "",
    maxPlayers: 4,
    trackId: "circuit",
    kind: "car",
    weather: "dry",
    event: { mode: "race", buyInSats: 100 },
  });
}

// 1) Host an Event lobby and let the mock buy-in settle.
const host = await connect("host");
createEventRoom(host, "HOSTA");
check(!!(await host.waitFor((m) => m.t === "welcome")), "host welcomed into event room");
check(
  !!(await host.waitFor((m) => m.t === "notice" && /paid the buy-in/i.test(m.text || ""))),
  "mock buy-in paid",
);

// 2) Leave (refund starts — mint I/O in flight) then immediately recreate the
//    same room name, exactly what a player does after a mistaken lobby.
host.send({ t: "leave" });
await delay(20);
const second = await connect("second");
createEventRoom(second, "HOSTB");
const welcome = await second.waitFor((m) => m.t === "welcome");
check(!!welcome, "recreated room welcomed a new host");

// 3) Wait for the first room's refund to finish, then prove the NEW room is
//    still alive (the stale teardown must not delete it by name).
await delay(MINT_LATENCY_MS + 600);

const status = await fetch(`http://${HOST}:${PORT}/api/status`).then((r) => r.json());
check(
  status.rooms.some((r) => r.room === ROOM),
  "recreated room still registered after the old room finished tearing down",
);

second.send({ t: "start", trackId: "circuit" });
const gone = await second.waitFor((m) => m.t === "error" && /room gone/i.test(m.message || ""), 1_500);
check(!gone, "new host can still talk to their room (no 'room gone')");

host.ws.close();
second.ws.close();
await delay(100);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll room-teardown checks passed.");
process.exit(0);
