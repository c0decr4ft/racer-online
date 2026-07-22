// Headless-browser gear verification via Chrome DevTools Protocol.
// Drives the real game: starts a race, holds W, shifts 1-5, measures speed caps.
import WebSocket from "ws";

const CDP_PORT = process.env.CDP_PORT ?? "9222";

async function getTargetWs() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Chrome CDP not reachable");
}

let msgId = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expr) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error("Page exception: " + JSON.stringify(exceptionDetails));
  return result.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  ws = new WebSocket(await getTargetWs(), { perMessageDeflate: false });
  await new Promise((r) => ws.on("open", r));
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });

  await send("Page.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:5173/" });

  // Wait for the game to boot
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate("typeof window.__game !== 'undefined'");
    if (ready) break;
    await sleep(500);
  }
  if (!(await evaluate("typeof window.__game !== 'undefined'"))) {
    throw new Error("window.__game never appeared");
  }

  // Helpers injected once
  await evaluate(`
    window.__key = (code, type = "keydown") =>
      window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
    window.__snap = () => {
      const g = window.__game;
      return {
        gear: String(g.player.state.gear),
        kmh: Math.round(g.player.kmh),
        hudGear: document.getElementById("gear").textContent,
        hudSpeed: document.getElementById("speed").textContent,
        running: g.running,
      };
    };
    true;
  `);

  await evaluate(`document.getElementById("start-btn").click(); true`);
  await sleep(300);
  // Isolate the drivetrain: the test car drives straight with no steering, so
  // disable wall snap-back and AI collisions which would corrupt speed readings.
  await evaluate(`
    window.__game.keepOnTrack = () => {};
    window.__game.resolveCollisions = () => {};
    true;
  `);
  console.log("after start:", JSON.stringify(await evaluate("window.__snap()")));

  // Keep the player pinned so track geometry / collisions don't interfere with
  // pure drivetrain measurement: re-center position each frame is overkill;
  // instead just neutralize steering and let keepOnTrack recentre.
  await evaluate(`window.__key("KeyW"); true`); // hold throttle (keydown persists in key set)

  const results = [];
  const gearKeys = { 1: "Digit1", 2: "Digit2", 3: "Digit3", 4: "Digit4", 5: "Digit5" };

  for (const [gear, code] of Object.entries(gearKeys)) {
    await evaluate(`window.__key("${code}"); true`);
    await sleep(120);
    const afterShift = await evaluate("window.__snap()");
    // Wait for speed to plateau in this gear
    let last = -1;
    let plateau = null;
    for (let i = 0; i < 50; i++) {
      await sleep(400);
      const s = await evaluate("window.__snap()");
      if (Math.abs(s.kmh - last) <= 1) {
        plateau = s;
        break;
      }
      last = s.kmh;
      plateau = s;
    }
    results.push({ requested: gear, stateGear: plateau.gear, hudGear: plateau.hudGear, capKmh: plateau.kmh });
    console.log(
      `gear ${gear}: state=${plateau.gear} hud=${plateau.hudGear} plateau=${plateau.kmh} km/h (right after shift: ${afterShift.kmh} km/h, gear ${afterShift.gear})`,
    );
  }

  // Reverse test at speed (should be rejected), then at standstill (should work)
  await evaluate(`window.__key("KeyR"); true`);
  await sleep(150);
  const revAtSpeed = await evaluate("window.__snap()");
  console.log("R pressed at speed:", JSON.stringify(revAtSpeed));

  await evaluate(`window.__key("KeyW", "keyup"); window.__key("Space"); true`); // brake to stop
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    const s = await evaluate("window.__snap()");
    if (s.kmh <= 1) break;
  }
  await evaluate(`window.__key("Space", "keyup"); window.__key("KeyR"); true`);
  await sleep(150);
  await evaluate(`window.__key("KeyW"); true`);
  await sleep(2500);
  const revDrive = await evaluate("window.__snap()");
  console.log("R at standstill then throttle 2.5s:", JSON.stringify(revDrive));
  await evaluate(`window.__key("KeyW", "keyup"); true`);

  // Lug test: from standstill in 5th
  await evaluate(`window.__key("Space"); true`);
  await sleep(2500);
  await evaluate(`window.__key("Space", "keyup"); window.__key("Digit5"); window.__key("KeyW"); true`);
  await sleep(3000);
  const lug = await evaluate("window.__snap()");
  console.log("3s full throttle from standstill in 5th (should lug, slow):", JSON.stringify(lug));

  console.log("RESULTS " + JSON.stringify(results));
  ws.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
