/**
 * Regression: a failed disk write after a mint swap / buy-in must not drop proofs.
 *
 * Before the fix, saveStore failures made persistPotProofs throw (or the receive
 * path returned fresh proofs that the HTTP handler discarded after summing), so
 * the lobby could mark a player paid while the pot file stayed empty.
 *
 * This script deposits into a temp pot, makes the primary file unwritable, deposits
 * again, and asserts loadStore/potBalance still see both proof sets via volatile
 * custody (memory + sidecar). A second process then confirms sidecar reload.
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  chmodSync,
  mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(DIR, "..", "server");
const POTS_DIR = join(SERVER_DIR, "cashu-pots");
const POT_ID = randomUUID();
const POT_PATH = join(POTS_DIR, `${POT_ID}.json`);
const VOL_PATH = `${POT_PATH}.volatile`;
const MINT = "https://mint.cubabitcoin.org";

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function cleanup() {
  for (const p of [POT_PATH, VOL_PATH]) {
    try {
      if (existsSync(p)) {
        chmodSync(p, 0o644);
        unlinkSync(p);
      }
    } catch {
      /* ignore */
    }
  }
}

mkdirSync(POTS_DIR, { recursive: true });
cleanup();

const paymentsUrl = pathToFileURL(join(SERVER_DIR, "payments.mjs")).href;

const childDeposit = `
import { chmodSync, existsSync } from "node:fs";
import { depositProofs, payments } from ${JSON.stringify(paymentsUrl)};
const POT_ID = ${JSON.stringify(POT_ID)};
const POT_PATH = ${JSON.stringify(POT_PATH)};
const VOL_PATH = ${JSON.stringify(VOL_PATH)};

function proof(id, amount) {
  return { id, amount: BigInt(amount), secret: "s-" + id, C: "C-" + id };
}

await depositProofs([proof("a", 10)], POT_ID);
let bal = await payments.potBalanceSats(POT_ID);
if (bal !== 10) throw new Error("first deposit balance " + bal);

chmodSync(POT_PATH, 0o444);
await depositProofs([proof("b", 7)], POT_ID);
bal = await payments.potBalanceSats(POT_ID);
if (bal !== 17) throw new Error("expected volatile balance 17 after failed disk write, got " + bal);
if (!existsSync(VOL_PATH)) throw new Error("expected volatile sidecar at " + VOL_PATH);
if (!payments.alreadyReceived("", POT_ID) && false) { /* noop */ }
console.log("ok: in-process volatile custody holds 17 sats");
`;

const result1 = spawnSync(process.execPath, ["--input-type=module", "-e", childDeposit], {
  env: {
    ...process.env,
    RACER_PAYMENTS_MOCK: "0",
    CASHU_MINT_URL: MINT,
  },
  encoding: "utf8",
});

if (result1.status !== 0) {
  cleanup();
  console.error(result1.stdout || "");
  console.error(result1.stderr || "");
  fail(result1.stderr?.trim() || result1.stdout?.trim() || `deposit child exited ${result1.status}`);
}
console.log((result1.stdout || "").trim());

if (!existsSync(VOL_PATH)) {
  cleanup();
  fail("volatile sidecar missing after deposit child");
}

const childReload = `
import { payments } from ${JSON.stringify(paymentsUrl)};
const POT_ID = ${JSON.stringify(POT_ID)};
const bal = await payments.potBalanceSats(POT_ID);
if (bal !== 17) throw new Error("sidecar reload balance " + bal + " (want 17)");
console.log("ok: fresh process reloaded 17 sats from volatile sidecar");
`;

const result2 = spawnSync(process.execPath, ["--input-type=module", "-e", childReload], {
  env: {
    ...process.env,
    RACER_PAYMENTS_MOCK: "0",
    CASHU_MINT_URL: MINT,
  },
  encoding: "utf8",
});

cleanup();

if (result2.status !== 0) {
  console.error(result2.stdout || "");
  console.error(result2.stderr || "");
  fail(result2.stderr?.trim() || result2.stdout?.trim() || `reload child exited ${result2.status}`);
}
console.log((result2.stdout || "").trim());
console.log("verify-cashu-volatile-custody: PASS");
