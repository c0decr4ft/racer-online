/**
 * Regression: Elimination Mode must not revive OUT players on all-wreck field reset.
 *
 * Concrete trigger (v6.9 bug):
 *   1. 3-player elimination race
 *   2. Two reach lap 2 → last place is eliminated
 *   3. Both survivors crash → fieldReset
 *   4. Before fix: eliminatedIds cleared → OUT player could race (and win Event pots)
 *   5. After fix: eliminatedIds kept; OUT finish rejected; sole survivor can win
 *
 * Usage: node scripts/verify-elim-field-reset.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..");
const PORT = 18787 + Math.floor(Math.random() * 1000);
const WS_URL = `ws://127.0.0.1:${PORT}`;
const ROOM = `elim-reset-${Date.now().toString(36)}`;

function fail(msg) {
  console.error(`FAIL  ${msg}`);
  process.exitCode = 1;
}
function pass(msg) {
  console.log(`PASS  ${msg}`);
}

function connect() {
  const ws = new WebSocket(WS_URL);
  /** @type {any[]} */
  const inbox = [];
  ws.on("message", (raw) => {
    try {
      inbox.push(JSON.parse(String(raw)));
    } catch {
      /* binary state — ignore */
    }
  });
  const api = {
    ws,
    inbox,
    send(msg) {
      ws.send(JSON.stringify(msg));
    },
    async waitOpen() {
      if (ws.readyState === WebSocket.OPEN) return;
      await new Promise((resolve, reject) => {
        ws.once("open", resolve);
        ws.once("error", reject);
      });
    },
    async waitFor(pred, ms = 5000) {
      const start = Date.now();
      while (Date.now() - start < ms) {
        const hit = inbox.find(pred);
        if (hit) return hit;
        await delay(25);
      }
      throw new Error(`timeout waiting for message (${ms}ms)`);
    },
    take(pred) {
      const i = inbox.findIndex(pred);
      if (i < 0) return null;
      return inbox.splice(i, 1)[0];
    },
  };
  return api;
}

async function main() {
  const child = spawn(process.execPath, [join(ROOT, "server/index.mjs")], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let boot = "";
  child.stdout.on("data", (d) => {
    boot += d.toString();
  });
  child.stderr.on("data", (d) => {
    boot += d.toString();
  });

  try {
    for (let i = 0; i < 80 && !boot.includes("Sats Racer"); i++) await delay(50);
    if (!boot.includes("Sats Racer")) throw new Error(`server failed to boot:\n${boot}`);

    const host = connect();
    const p2 = connect();
    const p3 = connect();
    await Promise.all([host.waitOpen(), p2.waitOpen(), p3.waitOpen()]);

    host.send({
      t: "create",
      room: ROOM,
      name: "Alpha",
      kind: "car",
      trackId: "forest-loop",
      raceMode: "elimination",
      maxPlayers: 6,
    });
    const welcome = await host.waitFor((m) => m.t === "welcome");
    const hostId = welcome.id;

    p2.send({ t: "join", room: ROOM, name: "Bravo", kind: "car" });
    p3.send({ t: "join", room: ROOM, name: "Charlie", kind: "car" });
    await p2.waitFor((m) => m.t === "welcome");
    await p3.waitFor((m) => m.t === "welcome");
    const id2 = p2.inbox.find((m) => m.t === "welcome").id;
    const id3 = p3.inbox.find((m) => m.t === "welcome").id;

    host.send({ t: "start", trackId: "forest-loop" });
    await host.waitFor((m) => m.t === "start");
    pass("elimination room started with 3 players");

    // Pose: Alpha+Bravo reach lap 2, Charlie stays on lap 1 → Charlie OUT
    const pose = (client, lap) =>
      client.send({ t: "pose", x: 0, z: 0, h: 0, s: 10, g: "1", lap });
    pose(host, 2);
    pose(p2, 2);
    pose(p3, 1);
    const elim = await host.waitFor((m) => m.t === "eliminated" && m.name === "Charlie");
    if (elim.id !== id3) throw new Error(`expected Charlie eliminated, got ${elim.id}`);
    pass("Charlie eliminated after lap-1 cut");

    // Both survivors crash → all remaining wrecked → fieldReset (OUT stays OUT)
    host.send({ t: "crash" });
    p2.send({ t: "crash" });
    // Must NOT get an instant raceResult from "last unburned wins" — wreck is temporary.
    await delay(400);
    if (host.inbox.some((m) => m.t === "raceResult")) {
      fail("opponent wreck incorrectly crowned a winner before fieldReset");
    }
    await host.waitFor((m) => m.t === "fieldReset", 5000);
    pass("fieldReset after survivors burned (no premature winner)");

    // Give server a tick; Charlie must still be OUT (finish rejected, no raceResult for Charlie)
    host.inbox.length = 0;
    p2.inbox.length = 0;
    p3.inbox.length = 0;
    p3.send({ t: "finish", timeMs: 12_000 });
    await delay(300);
    if (p3.inbox.some((m) => m.t === "raceResult" && m.winnerId === id3)) {
      fail("eliminated Charlie became winner after fieldReset (revival bug)");
    } else {
      pass("eliminated Charlie cannot win after fieldReset");
    }

    // Survivors resume: Alpha reaches lap 2 alone with Bravo still lagging → cut Bravo → Alpha wins
    // After fieldReset laps were reset to 1 for survivors only.
    pose(host, 2);
    pose(p2, 1);
    // Charlie may still send stale lap — must not matter
    pose(p3, 99);
    const result = await host.waitFor(
      (m) => m.t === "raceResult" || (m.t === "eliminated" && m.id === id2),
      4000,
    );
    if (result.t === "eliminated") {
      const win = await host.waitFor((m) => m.t === "raceResult", 2000);
      if (win.winnerId !== hostId) {
        fail(`expected Alpha win after second cut, got ${win.winnerId}`);
      } else {
        pass("Alpha won after post-reset elimination cut (Charlie stayed OUT)");
      }
    } else if (result.winnerId === hostId) {
      pass("Alpha won after post-reset elimination cut (Charlie stayed OUT)");
    } else {
      fail(`unexpected raceResult winner ${result.winnerId}`);
    }

    // Sanity: host was never eliminated
    if (host.inbox.some((m) => m.t === "eliminated" && m.id === hostId)) {
      fail("host was incorrectly eliminated");
    }
  } catch (err) {
    fail(err?.message || String(err));
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    await delay(200);
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }

  if (process.exitCode) {
    console.error("\nverify-elim-field-reset: FAILED");
    process.exit(1);
  }
  console.log("\nverify-elim-field-reset: OK");
}

main();
