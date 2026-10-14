/**
 * Regression: Event lobby host leave must refund each paid guest once — never
 * mint two Cashu tokens for the same buy-in when a guest also leaves mid-refund.
 *
 * Before the fix, hostLeft kept guests in `clients`/`buyIns` across
 * `await refundLobbyBuyIn`, so a concurrent guest `leave` minted a second token.
 *
 * Usage: RACER_PAYMENTS_MOCK=1 node scripts/verify-host-leave-buyin-refund.mjs
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const PORT = 8801;
const HOST = "127.0.0.1";

process.env.RACER_PAYMENTS_MOCK = "1";
process.env.RACER_REFUND_DELAY_MS = "400";
process.env.HOST = HOST;
process.env.PORT = String(PORT);
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "racer-dblrefund-"));
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
  /** @type {any[]} */
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

async function waitPaid(clients, names) {
  for (const name of names) {
    const re = new RegExp(`${name} paid the buy-in`, "i");
    let ok = false;
    for (const c of clients) {
      if (await c.waitFor((m) => m.t === "notice" && re.test(m.text || ""), 8_000)) {
        ok = true;
        break;
      }
    }
    check(ok, `${name} mock buy-in paid`);
  }
}

{
  // Unit: sync CAS on the shared buy-in object (same shape as server).
  /** @param {{ refundStarted?: boolean } | null | undefined} buyIn */
  function beginLobbyBuyInRefund(buyIn) {
    if (!buyIn || buyIn.refundStarted) return false;
    buyIn.refundStarted = true;
    return true;
  }
  const buyIn = { paymentHash: "x", paymentRequest: "y", paidAt: 1, netSats: 10 };
  check(beginLobbyBuyInRefund(buyIn) === true, "first refund claim wins");
  check(beginLobbyBuyInRefund(buyIn) === false, "second refund claim is rejected");
  check(buyIn.refundStarted === true, "buy-in marked refundStarted");
}

// --- Happy path: host leave delivers exactly one refund per paid guest ---
{
  const ROOM = "refundonce";
  const host = await connect("host1");
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
  check(!!(await host.waitFor((m) => m.t === "welcome")), "host1 welcomed");

  const guestA = await connect("guestA1");
  guestA.send({ t: "join", name: "GUESTA", room: ROOM, password: "pw", event: true });
  check(!!(await guestA.waitFor((m) => m.t === "welcome")), "guestA1 welcomed");

  const guestB = await connect("guestB1");
  guestB.send({ t: "join", name: "GUESTB", room: ROOM, password: "pw", event: true });
  check(!!(await guestB.waitFor((m) => m.t === "welcome")), "guestB1 welcomed");

  await waitPaid([host, guestA, guestB], ["HOST", "GUESTA", "GUESTB"]);

  host.send({ t: "leave" });
  await delay(3_000);

  const aRefunds = guestA.messages.filter((m) => m.t === "buyInRefund" && m.ok === true && m.token);
  const bRefunds = guestB.messages.filter((m) => m.t === "buyInRefund" && m.ok === true && m.token);
  check(aRefunds.length === 1, `guestA1 got exactly one refund token (got ${aRefunds.length})`);
  check(bRefunds.length === 1, `guestB1 got exactly one refund token (got ${bRefunds.length})`);

  host.ws.close();
  guestA.ws.close();
  guestB.ws.close();
  await delay(200);
}

// --- Race: guest leaves while host is refunding them — never two tokens ---
{
  const ROOM = "dblrefund";
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
    event: { mode: "race", buyInSats: 100 },
  });
  check(!!(await host.waitFor((m) => m.t === "welcome")), "host2 welcomed");

  const guestA = await connect("guestA2");
  guestA.send({ t: "join", name: "GUESTA", room: ROOM, password: "pw", event: true });
  check(!!(await guestA.waitFor((m) => m.t === "welcome")), "guestA2 welcomed");

  const guestB = await connect("guestB2");
  guestB.send({ t: "join", name: "GUESTB", room: ROOM, password: "pw", event: true });
  check(!!(await guestB.waitFor((m) => m.t === "welcome")), "guestB2 welcomed");

  await waitPaid([host, guestA, guestB], ["HOST", "GUESTA", "GUESTB"]);

  // During host's in-flight refund of guestA, guestA also leaves.
  host.send({ t: "leave" });
  await delay(500);
  guestA.send({ t: "leave" });
  await delay(3_000);

  const aRefunds = guestA.messages.filter((m) => m.t === "buyInRefund" && m.ok === true && m.token);
  // Must be exactly one: host owns the mint; guest leave must not close early or double-mint.
  check(aRefunds.length === 1, `guestA2 got exactly one refund token despite concurrent leave (got ${aRefunds.length})`);

  const bRefunds = guestB.messages.filter((m) => m.t === "buyInRefund" && m.ok === true && m.token);
  check(bRefunds.length === 1, `guestB2 still got a refund token (got ${bRefunds.length})`);

  host.ws.close();
  guestA.ws.close();
  guestB.ws.close();
  await delay(100);
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll host-leave buy-in refund checks passed.");
process.exit(0);
