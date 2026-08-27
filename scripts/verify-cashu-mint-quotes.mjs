/**
 * Regression: Lightning mint quotes must survive leave/restart so PAID invoices
 * can still be redeemed into the pot after the lobby buyIn is gone.
 *
 * Before the fix, quoteId lived only in a process-local Map and the settle poll
 * only walked live room.buyIns — both vanish on leave or redeploy, stranding sats.
 *
 * This script remembers a quote, asserts it is on disk, kills the module state by
 * spawning a fresh process, and confirms the pending quote reloads.
 */
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(DIR, "..", "server");
const QUOTES_PATH = join(SERVER_DIR, "cashu-mint-quotes.json");
const MINT = "https://mint.cubabitcoin.org";
const POT_ID = randomUUID();
const PAY_HASH = randomUUID().replaceAll("-", "").slice(0, 24);
const QUOTE_ID = `quote-${randomUUID().slice(0, 8)}`;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function cleanup() {
  try {
    if (existsSync(QUOTES_PATH)) unlinkSync(QUOTES_PATH);
  } catch {
    /* ignore */
  }
}

cleanup();

const paymentsUrl = pathToFileURL(join(SERVER_DIR, "payments.mjs")).href;

const childWrite = `
import {
  __rememberMintQuoteForTests,
  __pendingMintQuoteCountForTests,
} from ${JSON.stringify(paymentsUrl)};
import { existsSync, readFileSync } from "node:fs";

const POT_ID = ${JSON.stringify(POT_ID)};
const PAY_HASH = ${JSON.stringify(PAY_HASH)};
const QUOTE_ID = ${JSON.stringify(QUOTE_ID)};
const QUOTES_PATH = ${JSON.stringify(QUOTES_PATH)};

__rememberMintQuoteForTests(PAY_HASH, {
  quoteId: QUOTE_ID,
  amountSats: 21,
  potId: POT_ID,
  createdAt: Date.now(),
});

if (__pendingMintQuoteCountForTests() !== 1) {
  throw new Error("expected 1 pending quote in memory");
}
if (!existsSync(QUOTES_PATH)) throw new Error("quotes file not written");
const disk = JSON.parse(readFileSync(QUOTES_PATH, "utf8"));
if (!disk[PAY_HASH] || disk[PAY_HASH].quoteId !== QUOTE_ID) {
  throw new Error("quote missing from disk snapshot");
}
if (disk[PAY_HASH].settled) throw new Error("quote should be unsettled");
console.log("ok: mint quote persisted to disk");
`;

const writeResult = spawnSync(process.execPath, ["--input-type=module", "-e", childWrite], {
  env: {
    ...process.env,
    RACER_PAYMENTS_MOCK: "0",
    CASHU_MINT_URL: MINT,
  },
  encoding: "utf8",
});

if (writeResult.status !== 0) {
  cleanup();
  console.error(writeResult.stdout || "");
  console.error(writeResult.stderr || "");
  fail(writeResult.stderr?.trim() || writeResult.stdout?.trim() || `write child exited ${writeResult.status}`);
}
console.log((writeResult.stdout || "").trim());

if (!existsSync(QUOTES_PATH)) {
  cleanup();
  fail("quotes file missing after write child");
}

const childReload = `
import { __pendingMintQuoteCountForTests } from ${JSON.stringify(paymentsUrl)};
import { existsSync, readFileSync } from "node:fs";

const PAY_HASH = ${JSON.stringify(PAY_HASH)};
const POT_ID = ${JSON.stringify(POT_ID)};
const QUOTE_ID = ${JSON.stringify(QUOTE_ID)};
const QUOTES_PATH = ${JSON.stringify(QUOTES_PATH)};

if (__pendingMintQuoteCountForTests() !== 1) {
  throw new Error("fresh process did not reload pending quote (count=" + __pendingMintQuoteCountForTests() + ")");
}
if (!existsSync(QUOTES_PATH)) throw new Error("quotes file vanished");
const disk = JSON.parse(readFileSync(QUOTES_PATH, "utf8"));
if (disk[PAY_HASH]?.quoteId !== QUOTE_ID || disk[PAY_HASH]?.potId !== POT_ID) {
  throw new Error("reloaded quote mismatch");
}
console.log("ok: fresh process reloaded pending quote for pot", POT_ID.slice(0, 8));
`;

const reloadResult = spawnSync(process.execPath, ["--input-type=module", "-e", childReload], {
  env: {
    ...process.env,
    RACER_PAYMENTS_MOCK: "0",
    CASHU_MINT_URL: MINT,
  },
  encoding: "utf8",
});

cleanup();

if (reloadResult.status !== 0) {
  console.error(reloadResult.stdout || "");
  console.error(reloadResult.stderr || "");
  fail(reloadResult.stderr?.trim() || reloadResult.stdout?.trim() || `reload child exited ${reloadResult.status}`);
}
console.log((reloadResult.stdout || "").trim());
console.log("verify-cashu-mint-quotes: PASS");
