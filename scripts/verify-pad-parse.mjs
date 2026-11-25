/**
 * Regression: phone QR parsePad must not navigate to javascript:/data:/blob:
 * URLs. Attacker QR `javascript:…//?pad=ABCDEF` previously assigned location.href
 * and ran in-page, reading racer-nostr-session-v1 (local nsec).
 *
 * Run: node scripts/verify-pad-parse.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src/pad/phone.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(/export function parsePad/.test(src), "parsePad must be exported");
assert(
  /url\.protocol === "http:" \|\| url\.protocol === "https:"/.test(src),
  "parsePad must gate cross-origin redirects to http(s) only",
);
assert(
  /location\.href = url\.href/.test(src),
  "parsePad still navigates http(s) cross-origin (LAN → prod)",
);

/** Pure mirror of the allowlist decision (no location.href side effect). */
function wouldNavigate(text, pageOrigin = "https://satsracer.example") {
  try {
    const url = new URL(text);
    const pad = url.searchParams.get("pad") || "";
    if (!/^[A-Z0-9]{6}$/i.test(pad)) return { navigate: false, reason: "no-pad" };
    if (url.origin === pageOrigin) return { navigate: false, reason: "same-origin", pad: pad.toUpperCase() };
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { navigate: true, href: url.href, protocol: url.protocol };
    }
    return { navigate: false, reason: "blocked-scheme", protocol: url.protocol };
  } catch {
    return { navigate: false, reason: "not-url" };
  }
}

const cases = [
  ["javascript:void(document.title=localStorage.getItem('x'))//?pad=ABCDEF", false, "javascript:"],
  ["javascript:alert(1)?pad=ABCDEF", false, "javascript:"],
  ["data:text/html,hi?pad=ABCDEF", false, "data:"],
  ["blob:https://evil.com/abc?pad=ABCDEF", false, "blob:"],
  ["file:///tmp/x?pad=ABCDEF", false, "file:"],
  ["https://evil.com/?pad=ABCDEF", true, "https:"],
  ["http://192.168.1.2:5173/?pad=ABCDEF", true, "http:"],
  ["https://satsracer.example/?pad=ABCDEF", false, "same"],
  ["ABCDEF", false, "bare"],
];

for (const [text, expectNav, label] of cases) {
  const got = wouldNavigate(text);
  assert(got.navigate === expectNav, `${label}: navigate=${got.navigate} expected ${expectNav} (${JSON.stringify(got)})`);
}

// Live Chrome: fixed parsePad must NOT execute javascript: payload.
const html = `<!DOCTYPE html><html><body><pre id="out">starting</pre>
<script type="module">
localStorage.setItem("racer-nostr-session-v1", JSON.stringify({method:"local",nsec:"nsec1testsecret"}));
window.__xss = false;
export function parsePad(text, pageOrigin = location.origin) {
  if (!text) return null;
  try {
    const url = new URL(text);
    const pad = url.searchParams.get("pad") || "";
    if (/^[A-Z0-9]{6}$/i.test(pad)) {
      if (url.origin !== pageOrigin) {
        if (url.protocol === "http:" || url.protocol === "https:") {
          location.href = url.href;
        }
        return null;
      }
      return pad.toUpperCase();
    }
  } catch {}
  const bare = text.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(bare) ? bare : null;
}
const payload = "javascript:void((window.__xss=true),(document.title=localStorage.getItem('racer-nostr-session-v1')))//?pad=ABCDEF";
parsePad(payload);
setTimeout(() => {
  document.getElementById("out").textContent = JSON.stringify({
    xss: window.__xss,
    title: document.title,
  });
}, 300);
</script></body></html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const t = document.getElementById("out")?.textContent || "";
    return t.startsWith("{");
  });
  const out = JSON.parse(await page.textContent("#out"));
  assert(out.xss === false, `javascript payload must not execute (got ${JSON.stringify(out)})`);
  assert(
    !String(out.title || "").includes("nsec1"),
    `document.title must not hold nsec (got ${JSON.stringify(out.title)})`,
  );
} finally {
  await browser.close();
  server.close();
}

console.log("ok: parsePad blocks javascript:/data:/blob: nsec XSS; http(s) cross-origin still allowed");
