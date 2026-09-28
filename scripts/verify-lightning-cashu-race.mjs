/**
 * Regression: Lightning mint quotes must still custody proofs when Cashu already
 * recorded the same paymentHash (Event Mode offers both pay methods per buy-in).
 *
 * Without force-persist, persistPotProofs early-returns on receivedIds and the
 * freshly minted Lightning secrets are GC'd — real sats lost.
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(DIR, "..", "server");
const POTS_DIR = join(SERVER_DIR, "cashu-pots");
const POT_ID = randomUUID();
const POT_PATH = join(POTS_DIR, `${POT_ID}.json`);
const PAYMENT_HASH = `pay-${Date.now().toString(36)}`;
const MINT = process.env.CASHU_MINT_URL || "https://mint.cubabitcoin.org";

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function sum(proofs) {
  return (proofs || []).reduce((a, p) => a + Number(p.amount), 0);
}

mkdirSync(POTS_DIR, { recursive: true });

// Simulate Cashu landing first: pot already has this paymentHash + 10 sats.
writeFileSync(
  POT_PATH,
  JSON.stringify(
    {
      mintUrl: MINT,
      proofs: [{ id: "cashu-first", amount: "10", secret: "c", C: "c" }],
      withdrawnSats: 0,
      pendingWithdraw: null,
      receivedIds: [PAYMENT_HASH],
      logs: [],
      roomName: "verify-ln-cashu-race",
    },
    null,
    2,
  ),
);

try {
  const { depositLightningProofs, depositBuyInProofs, payments } = await import(
    "../server/payments.mjs"
  );

  // Non-force Cashu retry must NOT double-add when receivedIds already has the hash.
  await depositBuyInProofs(
    [{ id: "cashu-retry", amount: "99", secret: "r", C: "r" }],
    PAYMENT_HASH,
    POT_ID,
  );
  const afterSkip = JSON.parse(readFileSync(POT_PATH, "utf8"));
  if (sum(afterSkip.proofs) !== 10) {
    fail(`idempotent Cashu persist should no-op, got ${sum(afterSkip.proofs)} sats`);
  }
  if (afterSkip.proofs.some((p) => p.id === "cashu-retry")) {
    fail("Cashu retry incorrectly appended proofs for an already-received hash");
  }

  // Force path used by cashuSettleIfPaid — must append Lightning-minted proofs.
  await depositLightningProofs(
    [{ id: "ln-minted", amount: "10", secret: "l", C: "l" }],
    PAYMENT_HASH,
    POT_ID,
  );

  const afterForce = JSON.parse(readFileSync(POT_PATH, "utf8"));
  if (sum(afterForce.proofs) !== 20) {
    fail(`expected 20 sats after forced LN deposit, got ${sum(afterForce.proofs)}`);
  }
  if (!afterForce.proofs.some((p) => p.id === "ln-minted")) {
    fail("Lightning-minted proof missing after forced deposit");
  }
  if (!afterForce.receivedIds.includes(PAYMENT_HASH)) {
    fail("paymentHash dropped from receivedIds");
  }
  if (!payments.alreadyReceived(PAYMENT_HASH, POT_ID)) {
    fail("alreadyReceived should be true after Cashu+LN custody");
  }

  console.log(
    `ok: LN proofs custodied after Cashu receivedIds hit (${PAYMENT_HASH.slice(0, 12)}…)`,
  );
  console.log("verify-lightning-cashu-race: PASS");
} catch (err) {
  fail(String(err?.stack || err));
} finally {
  try {
    if (existsSync(POT_PATH)) unlinkSync(POT_PATH);
  } catch {
    /* ignore */
  }
}
