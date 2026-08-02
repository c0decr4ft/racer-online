/**
 * Full automated UI + FPS + multiplayer suite (no human clicks).
 * Usage: node scripts/full-suite.mjs
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const WebSocket = (await import("ws")).default;

const BASE = "http://127.0.0.1:5173/racer-online/";
const WS = "ws://127.0.0.1:8787";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const results = [];
let failed = 0;

function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failed++;
  results.push({ name, pass: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(name, cond, detail = "") {
  if (cond) ok(name, detail);
  else fail(name, detail || "assertion failed");
}

function visible(page, sel) {
  return page.locator(sel).evaluate((el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return !el.classList.contains("hidden");
  });
}

async function measureFps(page, label, ms = 2000) {
  const stats = await page.evaluate(async (durationMs) => {
    const g = window.__game;
    if (!g?.renderer) return { err: "no game" };
    const r = g.renderer;
    const orig = r.render.bind(r);
    let renders = 0;
    r.render = (...a) => {
      renders++;
      return orig(...a);
    };
    const dts = [];
    let last = performance.now();
    const start = last;
    await new Promise((resolve) => {
      const tick = (t) => {
        dts.push(t - last);
        last = t;
        if (t - start >= durationMs) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    r.render = orig;
    dts.sort((a, b) => a - b);
    const avg = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
    return {
      rafFps: +(dts.length / (durationMs / 1000)).toFixed(1),
      webglFps: +(renders / (durationMs / 1000)).toFixed(1),
      avgFrameMs: +avg.toFixed(2),
      p95FrameMs: +(dts[Math.floor(dts.length * 0.95)] || 0).toFixed(2),
      maxFrameMs: +(dts[dts.length - 1] || 0).toFixed(2),
      running: !!g.running,
      paused: !!g.paused,
      inLobby: !!g.inLobby,
    };
  }, ms);

  if (stats.err) {
    fail(`fps:${label}`, stats.err);
    return stats;
  }
  const pass = stats.rafFps >= 40 && stats.avgFrameMs < 28;
  if (pass) ok(`fps:${label}`, JSON.stringify(stats));
  else fail(`fps:${label}`, JSON.stringify(stats));
  return stats;
}

async function goHomeSafe(page) {
  await page.evaluate(() => {
    const g = window.__game;
    if (g?.goHome) g.goHome();
    else {
      document.getElementById("overlay")?.classList.remove("hidden");
      for (const id of ["garage", "multiplayer", "map-select", "leaderboard", "pause", "finish"]) {
        document.getElementById(id)?.classList.add("hidden");
      }
    }
  });
  await page.waitForTimeout(200);
}

function wsOnce(payload, waitFor = "welcome", timeoutMs = 2500) {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS);
    const events = [];
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* */
      }
      resolve({ events, ok: false, err: "timeout" });
    }, timeoutMs);
    ws.on("open", () => ws.send(JSON.stringify(payload)));
    ws.on("message", (d) => {
      const m = JSON.parse(String(d));
      events.push(m);
      if (m.t === waitFor || m.t === "error") {
        clearTimeout(timer);
        resolve({ events, ok: m.t === waitFor, ws, last: m });
      }
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      resolve({ events, ok: false, err: e.message });
    });
  });
}

function waitForWsEvent(ws, type, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      resolve(null);
    }, timeoutMs);
    function onMessage(data) {
      const msg = JSON.parse(String(data));
      if (msg.t !== type) return;
      clearTimeout(timer);
      ws.off("message", onMessage);
      resolve(msg);
    }
    ws.on("message", onMessage);
  });
}

async function main() {
  console.log("\n=== RACER ONLINE FULL SUITE ===\n");

  // --- API smoke ---
  for (const path of ["/api/leaderboard", "/api/presence", "/api/feedback"]) {
    try {
      const res = await fetch(`http://127.0.0.1:8787${path}`);
      const data = await res.json();
      assert(`api:${path}`, res.ok && data.ok !== false, `status=${res.status}`);
    } catch (e) {
      fail(`api:${path}`, String(e.message || e));
    }
  }

  // --- WS create / join / wrong password / host start ---
  const room = `suite-${Date.now().toString(36)}`;
  const host = await wsOnce({
    t: "create",
    name: "HostBot",
    room,
    password: "pw123",
    maxPlayers: 4,
    trackId: "harbor-circuit",
    kind: "bike",
    color: 0x2244ff,
    accent: 0xff0000,
  });
  assert("ws:create", host.ok, host.err || host.last?.room);

  const bad = await wsOnce({
    t: "join",
    name: "Bad",
    room,
    password: "nope",
    color: 1,
    accent: 2,
  }, "welcome");
  assert("ws:wrong-password", !bad.ok && bad.last?.t === "error", bad.last?.message);

  const guest = await wsOnce({
    t: "join",
    name: "GuestBot",
    room,
    password: "pw123",
    color: 0xffaa00,
    accent: 0x00ffaa,
  });
  assert("ws:join", guest.ok, guest.err || guest.last?.kind);
  assert("ws:host-forced-bike", guest.last?.kind === "bike", `kind=${guest.last?.kind}`);

  if (host.ok && host.ws) {
    host.ws.send(JSON.stringify({ t: "start" }));
    await new Promise((r) => setTimeout(r, 200));
    ok("ws:host-start-sent");
    if (guest.ws) {
      const hostResult = waitForWsEvent(host.ws, "raceResult");
      const guestResult = waitForWsEvent(guest.ws, "raceResult");
      host.ws.send(JSON.stringify({ t: "finish", timeMs: 65432, bestLapMs: 21000 }));
      const [a, b] = await Promise.all([hostResult, guestResult]);
      assert(
        "ws:finish-broadcast",
        a?.winnerId === host.last?.id && b?.winnerId === host.last?.id,
        `host=${a?.winnerName || "none"} guest=${b?.winnerName || "none"}`,
      );
      const options = Array.isArray(a?.trackOptions) ? a.trackOptions : [];
      assert(
        "ws:vote-all-six-tracks",
        options.length === 6 && options.includes("harbor-circuit"),
        JSON.stringify(options),
      );
      if (options.length >= 2) {
        const voteStartedAt = Date.now();
        const hostVoteResult = waitForWsEvent(host.ws, "voteResult", 24000);
        const guestVoteResult = waitForWsEvent(guest.ws, "voteResult", 24000);
        const hostNextStart = waitForWsEvent(host.ws, "start", 26000);
        const guestNextStart = waitForWsEvent(guest.ws, "start", 26000);
        host.ws.send(JSON.stringify({ t: "vote", trackId: options[0] }));
        await new Promise((r) => setTimeout(r, 30));
        guest.ws.send(JSON.stringify({ t: "vote", trackId: options[1] }));
        const [hostChoice, guestChoice, hostStart, guestStart] = await Promise.all([
          hostVoteResult,
          guestVoteResult,
          hostNextStart,
          guestNextStart,
        ]);
        assert(
          "ws:vote-waits-twenty-seconds",
          Date.now() - voteStartedAt >= 19_500,
          `elapsed=${Date.now() - voteStartedAt}ms`,
        );
        assert(
          "ws:vote-tie-first-vote-wins",
          hostChoice?.trackId === options[0] && guestChoice?.trackId === options[0],
          `selected=${hostChoice?.trackId || "none"} first=${options[0]}`,
        );
        assert(
          "ws:voted-next-round-starts",
          hostStart?.trackId === options[0] && guestStart?.trackId === options[0],
          `host=${hostStart?.trackId || "none"} guest=${guestStart?.trackId || "none"}`,
        );
      }
    }
    try {
      host.ws.close();
    } catch {
      /* */
    }
  }
  if (guest.ws) {
    try {
      guest.ws.close();
    } catch {
      /* */
    }
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 15000 });
  assert("boot:game-ready", true);
  await measureFps(page, "home", 1500);

  // --- Mute ---
  await page.click("#mute-btn");
  await page.waitForTimeout(100);
  assert("mute:toggle", await page.locator("#mute-btn").getAttribute("aria-pressed") !== null);

  // --- Garage ---
  await page.click("#home-garage-btn");
  assert("garage:open", await visible(page, "#garage"));
  await page.click("#garage-kind-bike");
  await page.waitForTimeout(150);
  assert(
    "garage:bike",
    await page.locator("#garage-kind-bike").evaluate((el) => el.classList.contains("is-active")),
  );
  await page.click("#garage-kind-car");
  await page.click("#garage-primary-swatch");
  await page.waitForTimeout(100);
  assert("garage:palette-open", await visible(page, "#garage-primary-palette"));
  const chip = page.locator("#garage-primary-palette .garage-swatch-chip").first();
  if (await chip.count()) await chip.click();
  await page.click("#garage-save-btn");
  await page.waitForTimeout(200);
  assert("garage:save-close", !(await visible(page, "#garage")));
  assert("garage:home-restored", await visible(page, "#overlay"));
  await measureFps(page, "home-after-garage", 1000);

  // Garage back path
  await page.click("#home-garage-btn");
  await page.click("#garage-back-btn");
  assert("garage:back", await visible(page, "#overlay") && !(await visible(page, "#garage")));

  // --- Leaderboard ---
  await page.click("#home-board-btn");
  await page.waitForTimeout(500);
  assert("board:open", await visible(page, "#leaderboard"));
  const boardSrc = await page.locator("#board-source").innerText();
  assert("board:loaded", !/Loading/i.test(boardSrc), boardSrc.slice(0, 80));
  const trackBtns = page.locator("#board-track-grid .map-thumb");
  const trackCount = await trackBtns.count();
  assert("board:tracks", trackCount >= 4, `count=${trackCount}`);
  if (trackCount > 1) await trackBtns.nth(1).click();
  await page.click("#board-close-btn");
  assert("board:close", !(await visible(page, "#leaderboard")));

  // --- Feedback ---
  await page.click("#feedback-btn");
  assert("feedback:open", await visible(page, "#feedback-compose"));
  await page.click("#feedback-compose-cancel");
  assert("feedback:cancel", !(await visible(page, "#feedback-compose")));

  // --- Version gate cancel ---
  await page.click("#version-badge");
  await page.waitForTimeout(150);
  if (await visible(page, "#version-gate")) {
    await page.click("#version-gate-cancel");
    assert("version-gate:cancel", !(await visible(page, "#version-gate")));
  } else if (await visible(page, "#dev-dashboard")) {
    await page.click("#dev-dashboard-close");
    ok("dev-dashboard:already-unlocked-close");
  } else {
    ok("version-gate:no-modal");
  }

  // --- Test drive map select ---
  await page.click("#test-drive-btn");
  await page.waitForTimeout(300);
  assert("testdrive:map-open", await visible(page, "#map-select"));
  await page.click("#map-select-back");
  assert("testdrive:map-back", await visible(page, "#overlay"));

  await page.click("#test-drive-btn");
  await page.waitForTimeout(200);
  const maps = page.locator("#map-grid .map-thumb");
  const mapN = await maps.count();
  assert("testdrive:maps", mapN >= 1, `count=${mapN}`);
  await maps.first().click();
  await page.waitForTimeout(4500); // countdown
  assert(
    "testdrive:running",
    await page.evaluate(() => window.__game?.running && window.__game?.practice),
  );
  await measureFps(page, "testdrive-live", 2000);
  await page.click("#pause-btn");
  await page.waitForTimeout(200);
  assert("testdrive:pause", await visible(page, "#pause"));
  await measureFps(page, "testdrive-paused", 1000);
  await page.click("#pause-home-btn");
  await page.waitForTimeout(300);
  assert("testdrive:home", await visible(page, "#overlay"));

  // --- Solo race ---
  await page.click("#solo-race-btn");
  await page.waitForTimeout(200);
  assert("solo:map-open", await visible(page, "#map-select"));
  await page.locator("#map-grid .map-thumb").nth(Math.min(1, mapN - 1)).click();
  await page.waitForTimeout(4500);
  assert(
    "solo:running",
    await page.evaluate(() => window.__game?.running && window.__game?.solo),
  );
  await measureFps(page, "solo-live", 1500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  await page.click("#pause-home-btn");
  await page.waitForTimeout(250);

  // --- Start race (AI) ---
  await page.click("#start-btn");
  await page.waitForTimeout(4500);
  assert(
    "ai-race:running",
    await page.evaluate(() => window.__game?.running && !window.__game?.solo && !window.__game?.online),
  );
  await measureFps(page, "ai-race-live", 2500);
  // Drive briefly
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(800);
  await page.keyboard.up("KeyW");
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyA");
  const speed = await page.locator("#speed").innerText();
  assert("ai-race:throttle", Number(speed) >= 0, `speed=${speed}`);
  await page.click("#pause-btn");
  await page.click("#pause-restart-btn");
  await page.waitForTimeout(4500);
  assert("ai-race:restart", await page.evaluate(() => window.__game?.running));
  await page.keyboard.press("Escape");
  await page.click("#pause-home-btn");
  await page.waitForTimeout(250);

  // --- Multiplayer UI ---
  await page.click("#multiplayer-btn");
  await page.waitForTimeout(200);
  assert("mp:entry", await visible(page, "#mp-entry"));
  const namePrefill = await page.locator("#mp-create-name").inputValue().catch(async () => {
    await page.click("#mp-goto-create");
    return page.locator("#mp-create-name").inputValue();
  });
  // open create
  if (!(await visible(page, "#mp-create"))) await page.click("#mp-goto-create");
  await page.waitForTimeout(150);
  assert("mp:create-view", await visible(page, "#mp-create"));
  const createName = await page.locator("#mp-create-name").inputValue();
  assert("mp:name-not-autofilled", createName === "", `value="${createName}"`);

  // Back from create while idle
  await page.click("#mp-create-back");
  assert("mp:create-back-entry", await visible(page, "#mp-entry"));

  // Join view back
  await page.click("#mp-goto-join");
  assert("mp:join-view", await visible(page, "#mp-join"));
  assert("mp:join-name-empty", (await page.locator("#mp-join-name").inputValue()) === "");
  await page.click("#mp-join-back");
  assert("mp:join-back-entry", await visible(page, "#mp-entry"));

  // Create lobby
  await page.click("#mp-goto-create");
  const roomUi = `ui-${Date.now().toString(36)}`;
  await page.fill("#mp-create-name", "UIHost");
  await page.fill("#mp-create-room", roomUi);
  await page.fill("#mp-create-pass", "secret");
  await page.click("#mp-create-kind-bike");
  const mpTracks = page.locator("#mp-create-track-grid .map-thumb");
  const mpTrackN = await mpTracks.count();
  assert("mp:track-grid", mpTrackN >= 1, `count=${mpTrackN}`);
  if (mpTrackN > 1) await mpTracks.nth(1).click();
  await page.click('#mp-create-form button[type="submit"]');
  await page.waitForTimeout(800);
  assert("mp:lobby-open", await visible(page, "#mp-lobby"));
  assert(
    "mp:in-lobby-flag",
    await page.evaluate(() => window.__game?.inLobby === true),
  );
  assert("mp:start-visible-host", await visible(page, "#mp-start-btn"));
  await measureFps(page, "mp-lobby", 1200);

  // Guest joins via second page
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page2.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page2.waitForFunction(() => window.__game, null, { timeout: 15000 });
  await page2.click("#multiplayer-btn");
  await page2.click("#mp-goto-join");
  await page2.fill("#mp-join-name", "UIGuest");
  await page2.fill("#mp-join-room", roomUi);
  await page2.fill("#mp-join-pass", "secret");
  await page2.click('#mp-join-form button[type="submit"]');
  await page2.waitForTimeout(900);
  assert("mp:guest-lobby", await visible(page2, "#mp-lobby"));
  const guestStartHidden = await page2.locator("#mp-start-btn").evaluate((el) => el.classList.contains("hidden"));
  assert("mp:guest-cannot-start-btn", guestStartHidden);

  // Host sees 2 players
  await page.waitForTimeout(400);
  const lobbyCount = await page.locator("#mp-lobby-players li").count();
  assert("mp:lobby-two-players", lobbyCount >= 2, `count=${lobbyCount}`);

  // Guest back → home restored
  await page2.click("#mp-lobby-leave");
  await page2.waitForTimeout(400);
  assert("mp:guest-back-home", await visible(page2, "#overlay"));
  assert("mp:guest-mp-closed", !(await visible(page2, "#multiplayer")));

  // Host back → home restored (the bug we fixed)
  await page.click("#mp-lobby-leave");
  await page.waitForTimeout(400);
  assert("mp:host-back-home", await visible(page, "#overlay"));
  assert("mp:host-mp-closed", !(await visible(page, "#multiplayer")));
  assert(
    "mp:host-not-stuck-lobby",
    await page.evaluate(() => !window.__game?.inLobby && !window.__game?.online),
  );

  // Recreate + start race
  await page.click("#multiplayer-btn");
  await page.click("#mp-goto-create");
  const room2 = `race-${Date.now().toString(36)}`;
  await page.fill("#mp-create-name", "Racer1");
  await page.fill("#mp-create-room", room2);
  await page.fill("#mp-create-pass", "go");
  await page.click('#mp-create-form button[type="submit"]');
  await page.waitForTimeout(700);
  assert("mp:recreate-lobby", await visible(page, "#mp-lobby"));

  await page2.click("#multiplayer-btn");
  await page2.click("#mp-goto-join");
  await page2.fill("#mp-join-name", "Racer2");
  await page2.fill("#mp-join-room", room2);
  await page2.fill("#mp-join-pass", "go");
  await page2.click('#mp-join-form button[type="submit"]');
  await page2.waitForTimeout(700);

  await page.click("#mp-start-btn");
  await page.waitForTimeout(4500);
  assert(
    "mp:race-host-running",
    await page.evaluate(() => window.__game?.running && window.__game?.online),
  );
  assert(
    "mp:race-guest-running",
    await page2.evaluate(() => window.__game?.running && window.__game?.online),
  );
  await measureFps(page, "mp-race-host", 2000);
  await measureFps(page2, "mp-race-guest", 2000);
  await page2.keyboard.down("KeyW");
  await page2.waitForTimeout(1200);
  await page2.keyboard.up("KeyW");
  await page.waitForTimeout(200);
  const [guestPosition, hostViewOfGuest] = await Promise.all([
    page2.evaluate(() => {
      const p = window.__game?.player?.state?.position;
      return p ? { x: p.x, z: p.z } : null;
    }),
    page.evaluate(() => {
      const remote = window.__game?.remotes?.values?.().next?.().value;
      const p = remote?.mesh?.position;
      return p ? { x: p.x, z: p.z } : null;
    }),
  ]);
  const trackingError =
    guestPosition && hostViewOfGuest
      ? Math.hypot(guestPosition.x - hostViewOfGuest.x, guestPosition.z - hostViewOfGuest.z)
      : Infinity;
  assert("mp:remote-position-current", trackingError < 3, `error=${trackingError.toFixed(2)}m`);

  // Server-announced finish opens all-six-map voting on every client.
  await page.evaluate(() => window.__game?.net?.reportFinish?.(65432, 21000));
  await page.waitForTimeout(400);
  assert("mp:vote-host-visible", await visible(page, "#mp-map-vote"));
  assert("mp:vote-guest-visible", await visible(page2, "#mp-map-vote"));
  assert(
    "mp:vote-six-options",
    (await page.locator("#mp-map-vote-grid .mp-vote-option").count()) === 6,
  );
  const voteThumb = await page.locator("#mp-map-vote-grid .mp-vote-option").first().boundingBox();
  assert("mp:vote-large-previews", (voteThumb?.width ?? 0) >= 100, `width=${voteThumb?.width ?? 0}`);
  assert(
    "mp:vote-timer-visible",
    (await page.locator("#mp-map-vote-status").textContent())?.includes("20s"),
  );
  await page.keyboard.press("Digit1");
  await page.waitForTimeout(40);
  await page2.keyboard.press("Digit2");
  await page.waitForTimeout(22400);
  assert(
    "mp:voted-round-host-running",
    await page.evaluate(() => window.__game?.running && !window.__game?.finished),
  );
  assert(
    "mp:voted-round-guest-running",
    await page2.evaluate(() => window.__game?.running && !window.__game?.finished),
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  if (await visible(page, "#pause")) await page.click("#pause-home-btn");
  else await goHomeSafe(page);
  await page2.evaluate(() => window.__game?.goHome?.());
  await page.waitForTimeout(300);

  // Cancel / leave after create — always ends on a healthy home overlay
  await page.click("#multiplayer-btn");
  await page.click("#mp-goto-create");
  await page.fill("#mp-create-name", "CancelMe");
  await page.fill("#mp-create-room", `cancel-${Date.now().toString(36)}`);
  await page.click('#mp-create-form button[type="submit"]');
  // Fast local server often reaches lobby before create-back is useful — handle both.
  await page.waitForTimeout(200);
  if (await visible(page, "#mp-lobby")) {
    await page.click("#mp-lobby-leave");
  } else if (await visible(page, "#mp-create")) {
    await page.click("#mp-create-back");
    await page.waitForTimeout(100);
    if (await visible(page, "#mp-entry")) await page.click("#mp-back-btn");
  } else if (await visible(page, "#mp-entry")) {
    await page.click("#mp-back-btn");
  }
  await page.waitForTimeout(300);
  assert(
    "mp:cancel-or-back-home",
    await visible(page, "#overlay") && !(await visible(page, "#multiplayer")),
    `overlay=${await visible(page, "#overlay")} mp=${await visible(page, "#multiplayer")}`,
  );

  // Explicit cancel-before-welcome: disconnect expectingLobby via create-back before submit settles
  await page.click("#multiplayer-btn");
  await page.click("#mp-goto-create");
  await page.fill("#mp-create-name", "EarlyBack");
  await page.fill("#mp-create-room", `early-${Date.now().toString(36)}`);
  // Click back without submitting — still healthy
  await page.click("#mp-create-back");
  assert("mp:create-back-no-submit", await visible(page, "#mp-entry"));
  await page.click("#mp-back-btn");
  assert("mp:entry-back-home", await visible(page, "#overlay"));

  // Presence API after traffic
  try {
    const pres = await fetch("http://127.0.0.1:8787/api/presence").then((r) => r.json());
    assert("api:presence-shape", Array.isArray(pres.buckets) || typeof pres.now === "number", JSON.stringify(pres).slice(0, 120));
  } catch (e) {
    fail("api:presence-shape", String(e.message || e));
  }

  assert("pageerrors:none", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

  await page2.close();
  await browser.close();

  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${results.filter((r) => r.pass).length}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${results.length}`);
  if (failed) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.pass)) console.log(` - ${r.name}: ${r.detail}`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
