/**
 * Repro: after a successful Event Mode claim, a second claimPot from the same
 * winner must resend the bearer token (not "already claimed" with no token).
 *
 * Run: RACER_PAYMENTS_MOCK=1 node scripts/verify-claim-idempotent.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import WebSocket from "ws";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..");
const PORT = 18765 + Math.floor(Math.random() * 1000);

function waitForWsEvent(ws, type, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.off("message", onMsg);
      resolve(null);
    }, ms);
    function onMsg(data) {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg?.t !== type) return;
      clearTimeout(timer);
      ws.off("message", onMsg);
      resolve(msg);
    }
    ws.on("message", onMsg);
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

async function main() {
  process.env.RACER_PAYMENTS_MOCK = "1";
  process.env.PORT = String(PORT);
  process.env.HOST = "127.0.0.1";

  const child = spawn(process.execPath, [join(ROOT, "server/index.mjs")], {
    cwd: ROOT,
    env: { ...process.env, RACER_PAYMENTS_MOCK: "1", PORT: String(PORT), HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let boot = "";
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server boot timeout")), 8000);
    child.stdout.on("data", (chunk) => {
      boot += chunk;
      if (/http:\/\//.test(boot)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (chunk) => {
      boot += chunk;
      if (/http:\/\//.test(boot)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("exit", (code) => reject(new Error(`server exited ${code}: ${boot}`)));
  });

  try {
    const host = await connect();
    const welcome = waitForWsEvent(host, "welcome", 3000);
    host.send(
      JSON.stringify({
        t: "create",
        room: "claim-idem",
        password: "x",
        name: "Winner",
        maxPlayers: 2,
        trackId: "forest-loop",
        kind: "car",
        event: { buyInSats: 100 },
      }),
    );
    const w = await welcome;
    if (!w?.id) throw new Error("no welcome");

    const guest = await connect();
    const gWelcome = waitForWsEvent(guest, "welcome", 3000);
    guest.send(
      JSON.stringify({
        t: "join",
        room: "claim-idem",
        password: "x",
        name: "Loser",
        event: { buyInSats: 100 },
      }),
    );
    if (!(await gWelcome)?.id) throw new Error("guest welcome failed");

    // Mock auto-pays ~3s after each invoice; settle poll runs every 2s.
    await new Promise((r) => setTimeout(r, 6000));

    const startP = waitForWsEvent(host, "start", 4000);
    const errP = waitForWsEvent(host, "error", 4000);
    host.send(JSON.stringify({ t: "start" }));
    const started = await Promise.race([
      startP.then((m) => ({ kind: "start", m })),
      errP.then((m) => ({ kind: "error", m })),
    ]);
    if (started.kind !== "start") throw new Error(`start failed: ${JSON.stringify(started.m)}`);

    const resultP = waitForWsEvent(host, "raceResult", 4000);
    host.send(JSON.stringify({ t: "finish", timeMs: 60000, bestLapMs: 20000 }));
    if (!(await resultP)?.event) throw new Error("no raceResult");

    const payoutP = waitForWsEvent(host, "payoutResult", 5000);
    host.send(JSON.stringify({ t: "claimPot", tipPercent: 2 }));
    const payout = await payoutP;
    if (!payout?.ok || !payout.token) throw new Error(`first claim failed: ${JSON.stringify(payout)}`);

    const againP = waitForWsEvent(host, "payoutResult", 4000);
    host.send(JSON.stringify({ t: "claimPot", tipPercent: 2 }));
    const again = await againP;
    if (!again?.ok) throw new Error(`resend not ok: ${JSON.stringify(again)}`);
    if (again.token !== payout.token) throw new Error("resend token mismatch");
    if (again.winnerSats !== payout.winnerSats) throw new Error("resend sats mismatch");

    // In-flight second click should not say "already claimed" without a path back.
    // (First claim already complete — covered above.)

    console.log("ok: claimPot idempotent resend returns the same winner token");
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
