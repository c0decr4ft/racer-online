/**
 * Regression: when the Event Mode host leaves after the race finishes, the room
 * must stay open so the winner (still connected) can claimPot.
 *
 * Before the fix, host leave force-closed every remaining client and deleted the
 * room — the pot stayed in cashu-pots/<id>.json with no claim path.
 *
 * Usage: RACER_PAYMENTS_MOCK=1 node scripts/verify-host-leave-event-claim.mjs
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8799;
const HOST = "127.0.0.1";
const ROOM = "hostleave";

process.env.RACER_PAYMENTS_MOCK = "1";
process.env.HOST = HOST;
process.env.PORT = String(PORT);
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "racer-hostleave-"));
process.env.PUBLIC_BASE_URL = `http://${HOST}:${PORT}`;

await import("../server/index.mjs");
await delay(400);

const failures = [];
function check(ok, what) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${what}`);
  if (!ok) failures.push(what);
}

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
    saw(pred) {
      return messages.some(pred);
    },
  };
}

// --- Event Mode: host leaves after finish → winner still claims ---
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
  event: { mode: "race", buyInSats: 100 },
});
check(!!(await host.waitFor((m) => m.t === "welcome")), "host welcomed");

const guest = await connect("guest");
guest.send({
  t: "join",
  name: "GUEST",
  room: ROOM,
  password: "pw",
  event: true,
});
const guestWelcome = await guest.waitFor((m) => m.t === "welcome");
check(!!guestWelcome, "guest welcomed");
const guestId = guestWelcome.id;

check(
  !!(await host.waitFor((m) => m.t === "notice" && /paid the buy-in/i.test(m.text || ""))),
  "host mock buy-in paid",
);
check(
  !!(await guest.waitFor((m) => m.t === "notice" && /GUEST paid the buy-in/i.test(m.text || ""))),
  "guest mock buy-in paid",
);

host.send({ t: "start", trackId: "forest-loop" });
check(!!(await guest.waitFor((m) => m.t === "start")), "race started for guest");

guest.send({ t: "finish", timeMs: 55_000 });
check(
  !!(await guest.waitFor((m) => m.t === "raceResult" && m.winnerId === guestId)),
  "guest won the event race",
);

host.send({ t: "leave" });
await delay(500);

check(!guest.saw((m) => m.t === "closed"), "guest was NOT force-closed when event host left");
check(
  !!(await guest.waitFor((m) => m.t === "leave" || (m.t === "notice" && /HOST left/i.test(m.text || "")))),
  "guest saw host leave (room stayed up)",
);

const status = await fetch(`http://${HOST}:${PORT}/api/status`).then((r) => r.json());
check(
  status.rooms.some((r) => r.room === ROOM),
  "finished event room still registered after host leave",
);

guest.send({ t: "claimPot", tipPercent: 0 });
const payout = await guest.waitFor((m) => m.t === "payoutResult");
check(!!payout?.ok, `winner claimed pot after host leave${payout?.error ? ` (${payout.error})` : ""}`);
check(!!payout?.token, "claim returned a Cashu token");

guest.ws.close();
host.ws.close();
await delay(200);

// --- Casual multiplayer: host leave still closes the room ---
const casualRoom = "casualhost";
const cHost = await connect("casual-host");
cHost.send({
  t: "create",
  name: "CHOST",
  room: casualRoom,
  password: "",
  maxPlayers: 4,
  trackId: "forest-loop",
  kind: "car",
  weather: "dry",
});
check(!!(await cHost.waitFor((m) => m.t === "welcome")), "casual host welcomed");

const cGuest = await connect("casual-guest");
cGuest.send({
  t: "join",
  name: "CGUEST",
  room: casualRoom,
  password: "",
});
check(!!(await cGuest.waitFor((m) => m.t === "welcome")), "casual guest welcomed");

cHost.send({ t: "leave" });
check(
  !!(await cGuest.waitFor((m) => m.t === "closed")),
  "casual guest force-closed when host left",
);

cHost.ws.close();
cGuest.ws.close();
await delay(100);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll host-leave event claim checks passed.");
process.exit(0);
