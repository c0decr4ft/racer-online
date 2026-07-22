/* Headless verification for the invisible-wall / solid-car collision work.
 * Drives the live game at http://127.0.0.1:5173/ through window.__game.
 * Run: node scripts/verify-collisions.mjs
 */
import { chromium } from "playwright-core";

const URL = "http://127.0.0.1:5173/";
const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(URL);
await page.waitForFunction(() => !!window.__game, null, { timeout: 15000 });

// In-page helpers (accessing private members at runtime is fine in JS)
await page.evaluate(() => {
  const g = window.__game;
  window.__test = {
    /** Sample n animation frames of player (and rival[i]) state. */
    async run(n, rivalIdx = 0) {
      const out = [];
      for (let i = 0; i < n; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const p = g.player.state.position;
        const proj = g.projectSticky(g.player, p);
        const rv = g.rivals[rivalIdx].vehicle.state;
        out.push({
          now: performance.now(),
          x: p.x, z: p.z,
          speed: g.player.state.speed,
          t: proj.t, d: proj.distanceFromCenter,
          lap: g.lap,
          rx: rv.position.x, rz: rv.position.z, rs: rv.speed,
        });
      }
      return out;
    },
    /** Teleport player onto the track at param t with lateral offset. */
    teleport(t, offset, speed, gear = 3) {
      const path = g.track.path;
      const p = path.getPointAt(t);
      const tan = path.getTangentAt(t).normalize();
      const s = g.player.state;
      s.position.set(p.x - tan.z * offset, 0, p.z + tan.x * offset);
      s.heading = Math.atan2(tan.x, tan.z);
      s.speed = speed;
      s.steerAngle = 0;
      s.gear = gear;
      g.resetSticky(g.player);
      g.lastT = g.projectSticky(g.player, s.position).t;
    },
    /** Put player just behind rival 0 at given gap, matching heading. */
    placeBehindRival(gap, speed) {
      const r = g.rivals[0].vehicle.state;
      const s = g.player.state;
      s.position.set(
        r.position.x - Math.sin(r.heading) * gap, 0,
        r.position.z - Math.cos(r.heading) * gap,
      );
      s.heading = r.heading;
      s.speed = speed;
      s.gear = 3;
      g.resetSticky(g.player);
      g.lastT = g.projectSticky(g.player, s.position).t;
    },
    slowRival(idx, speed) {
      g.rivals[idx].vehicle.state.speed = speed;
    },
    lap: () => g.lap,
  };
});

const stats = (frames) => {
  let maxDelta = 0;
  let maxExcess = 0; // movement beyond what speed * dt explains (teleport detector)
  for (let i = 1; i < frames.length; i++) {
    const d = Math.hypot(frames[i].x - frames[i - 1].x, frames[i].z - frames[i - 1].z);
    maxDelta = Math.max(maxDelta, d);
    const dt = Math.min((frames[i].now - frames[i - 1].now) / 1000, 0.05);
    const legit = Math.max(Math.abs(frames[i].speed), Math.abs(frames[i - 1].speed)) * dt;
    maxExcess = Math.max(maxExcess, d - legit);
  }
  const maxAbsD = Math.max(...frames.map((f) => Math.abs(f.d)));
  return { maxDelta, maxExcess, maxAbsD, first: frames[0], last: frames[frames.length - 1] };
};

await page.click("#start-btn");
await page.waitForFunction(() => window.__game.running === true);

// --- Test 1: normal driving — t advances, motion bounded -------------------
await page.keyboard.down("KeyW");
let frames = await page.evaluate(() => window.__test.run(300));
let s1 = stats(frames);
let tGain = (s1.last.t - s1.first.t + 1) % 1;
check("drive: per-frame delta bounded", s1.maxExcess < 0.6, `max excess ${s1.maxExcess.toFixed(3)} u/frame (raw ${s1.maxDelta.toFixed(2)})`);
check("drive: track t advances", tGain > 0.01 && tGain < 0.5, `t ${s1.first.t.toFixed(3)} → ${s1.last.t.toFixed(3)}`);

// --- Test 2: wall — steer hard into edge, expect clamp, no bounce/teleport -
await page.keyboard.down("KeyA");
frames = await page.evaluate(() => window.__test.run(400));
await page.keyboard.up("KeyA");
let s2 = stats(frames);
check("wall: never beyond edge", s2.maxAbsD < 6.75, `max |d| ${s2.maxAbsD.toFixed(2)} (wall at 6.45)`);
check("wall: per-frame delta bounded", s2.maxExcess < 0.6, `max excess ${s2.maxExcess.toFixed(3)} u/frame (raw ${s2.maxDelta.toFixed(2)})`);

// --- Test 3: ram a slow AI car from behind — blocked, no fling -------------
await page.evaluate(() => {
  window.__test.slowRival(0, 0);
  window.__test.placeBehindRival(6, 40);
});
frames = await page.evaluate(() => window.__test.run(240));
let s3 = stats(frames);
let minGap = Infinity;
let maxRivalJump = 0;
for (let i = 0; i < frames.length; i++) {
  minGap = Math.min(minGap, Math.hypot(frames[i].x - frames[i].rx, frames[i].z - frames[i].rz));
  if (i > 0) maxRivalJump = Math.max(maxRivalJump, frames[i].rs - frames[i - 1].rs);
}
check("ram: player delta bounded (no teleport)", s3.maxExcess < 0.6, `max excess ${s3.maxExcess.toFixed(3)} u/frame (raw ${s3.maxDelta.toFixed(2)})`);
check("ram: cars stay separated", minGap > 2.3, `min gap ${minGap.toFixed(2)} (contact at 3.4)`);
check("ram: rival not flung", maxRivalJump < 8, `max rival speed jump ${maxRivalJump.toFixed(2)}/frame`);

// --- Test 4: side-by-side overtake — bounded, progress continues -----------
await page.evaluate(() => {
  const g = window.__game;
  const r0 = g.rivals[0].vehicle.state;
  window.__test.slowRival(0, 12);
  // player alongside, 3.0 lateral (slightly overlapping the 3.4 contact dist)
  const tan = { x: Math.sin(r0.heading), z: Math.cos(r0.heading) };
  const s = g.player.state;
  s.position.set(r0.position.x - tan.z * 3.0 - tan.x * 2, 0, r0.position.z + tan.x * 3.0 - tan.z * 2);
  s.heading = r0.heading;
  s.speed = 30;
  s.gear = 3;
  g.resetSticky(g.player);
  g.lastT = g.projectSticky(g.player, s.position).t;
});
frames = await page.evaluate(() => window.__test.run(200));
let s4 = stats(frames);
let t4gain = (s4.last.t - s4.first.t + 1) % 1;
check("overtake: delta bounded", s4.maxExcess < 0.6, `max excess ${s4.maxExcess.toFixed(3)} u/frame (raw ${s4.maxDelta.toFixed(2)})`);
check("overtake: player keeps progressing", t4gain > 0.005 && t4gain < 0.5, `t gain ${t4gain.toFixed(4)}`);

// --- Test 5: lap counting across start/finish ------------------------------
const lapBefore = await page.evaluate(() => window.__test.lap());
await page.evaluate(() => window.__test.teleport(0.97, 0, 30));
frames = await page.evaluate(() => window.__test.run(300));
const lapAfter = await page.evaluate(() => window.__test.lap());
let s5 = stats(frames);
check("lap: crossing SF increments lap", lapAfter === lapBefore + 1, `lap ${lapBefore} → ${lapAfter}`);
check("lap: delta bounded during crossing", s5.maxExcess < 0.6, `max excess ${s5.maxExcess.toFixed(3)} u/frame (raw ${s5.maxDelta.toFixed(2)})`);

await page.keyboard.up("KeyW");
await browser.close();

console.log(failures.length === 0 ? "\nALL CHECKS PASSED" : `\n${failures.length} FAILURES: ${failures.join(", ")}`);
process.exit(failures.length === 0 ? 0 : 1);
