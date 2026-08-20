/**
 * Regression: changing CASHU_MINT_URL must not silently destroy pot proofs.
 *
 * Writes a Coinos-mint pot file, loads payments under Minibits, and asserts
 * the old proofs were backed up (not overwritten without a copy).
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(DIR, "..", "server");
const PROOFS_PATH = join(SERVER_DIR, "cashu-proofs.json");
const OLD_MINT = "https://mint.coinos.io";
const NEW_MINT = "https://mint.minibits.cash/Bitcoin";
const MARKER = `verify-cashu-mint-guard-${Date.now()}`;

function cleanupBackups() {
  for (const name of readdirSync(SERVER_DIR)) {
    if (name.startsWith("cashu-proofs.json.bak-")) {
      try {
        unlinkSync(join(SERVER_DIR, name));
      } catch {
        /* ignore */
      }
    }
  }
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

// Refuse to clobber a live pot on the configured mint.
if (existsSync(PROOFS_PATH)) {
  try {
    const cur = JSON.parse(readFileSync(PROOFS_PATH, "utf8"));
    if (cur?.mintUrl === NEW_MINT && Array.isArray(cur.proofs) && cur.proofs.length > 0) {
      console.log("SKIP: live Minibits pot file present — not touching custody files");
      process.exit(0);
    }
  } catch {
    /* proceed */
  }
}

const previous = existsSync(PROOFS_PATH) ? readFileSync(PROOFS_PATH, "utf8") : null;
cleanupBackups();

writeFileSync(
  PROOFS_PATH,
  JSON.stringify(
    {
      mintUrl: OLD_MINT,
      proofs: [{ id: MARKER, amount: "150", secret: "test", C: "test" }],
      withdrawnSats: 0,
      pendingWithdraw: null,
    },
    null,
    2,
  ),
);

const child = `
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const SERVER_DIR = ${JSON.stringify(SERVER_DIR)};
const PROOFS_PATH = ${JSON.stringify(PROOFS_PATH)};
const MARKER = ${JSON.stringify(MARKER)};
const NEW_MINT = ${JSON.stringify(NEW_MINT)};
const { payments } = await import(${JSON.stringify(pathToFileURL(join(SERVER_DIR, "payments.mjs")).href)});
const bal = await payments.potBalanceSats();
if (bal !== 0) throw new Error("expected empty pot after mint switch, got " + bal);
const cur = JSON.parse(readFileSync(PROOFS_PATH, "utf8"));
if (cur.mintUrl !== NEW_MINT) throw new Error("pot file mint not updated");
if (Array.isArray(cur.proofs) && cur.proofs.length) throw new Error("pot still holds old proofs without backup path");
const backups = readdirSync(SERVER_DIR).filter((n) => n.startsWith("cashu-proofs.json.bak-"));
if (!backups.length) throw new Error("no backup created for mint-mismatched pot");
const bak = JSON.parse(readFileSync(join(SERVER_DIR, backups[0]), "utf8"));
if (!bak.proofs?.some((p) => p.id === MARKER)) throw new Error("backup missing original proofs");
if (bak.mintUrl !== ${JSON.stringify(OLD_MINT)}) throw new Error("backup mint wrong");
console.log("ok: mint-mismatch backed up " + backups[0] + " and reset pot");
`;

const result = spawnSync(
  process.execPath,
  ["--input-type=module", "-e", child],
  {
    env: {
      ...process.env,
      RACER_PAYMENTS_MOCK: "0",
      CASHU_MINT_URL: NEW_MINT,
    },
    encoding: "utf8",
  },
);

try {
  if (previous == null) {
    if (existsSync(PROOFS_PATH)) unlinkSync(PROOFS_PATH);
  } else {
    writeFileSync(PROOFS_PATH, previous);
  }
  cleanupBackups();
} catch (err) {
  console.warn("cleanup warning:", err?.message || err);
}

if (result.status !== 0) {
  console.error(result.stdout || "");
  console.error(result.stderr || "");
  fail(result.stderr?.trim() || result.stdout?.trim() || `child exited ${result.status}`);
}
console.log((result.stdout || "").trim());
console.log("verify-cashu-mint-guard: PASS");
