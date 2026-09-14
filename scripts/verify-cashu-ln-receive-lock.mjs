/**
 * Regression: Lightning settleIfPaid must share withReceiveLock with Cashu
 * /api/ecash/pay receives for the same paymentHash.
 *
 * Without that lock, LN can write receivedIds while Cashu is inside
 * wallet.receive; persistPotProofs then early-returns and the freshly swapped
 * Cashu secrets are GC'd (silent second-payment burn). Reverse of the
 * Cashu-first / LN-discard race covered by PR #99.
 */
import { payments, runUnderReceiveLock } from "../server/payments.mjs";

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const PAYMENT_HASH = `lock-race-${Date.now().toString(36)}`;
const HOLD_MS = 120;

let cashuReleased = false;
const hold = runUnderReceiveLock(PAYMENT_HASH, async () => {
  await new Promise((r) => setTimeout(r, HOLD_MS));
  cashuReleased = true;
});

const t0 = Date.now();
// No mint quote for this hash → settle returns null, but must still wait for
 // the in-flight Cashu receive lock before observing that.
const settled = await payments.settleIfPaid(PAYMENT_HASH);
const elapsed = Date.now() - t0;

await hold;

if (settled != null) {
  fail(`expected null settle for unknown quote, got ${JSON.stringify(settled)}`);
}
if (!cashuReleased) {
  fail("settleIfPaid returned before the Cashu-side receive lock released");
}
if (elapsed < HOLD_MS - 20) {
  fail(
    `settleIfPaid returned in ${elapsed}ms — did not wait for ${HOLD_MS}ms receive lock ` +
      `(LN can still race Cashu mid-receive)`,
  );
}

console.log(
  `ok: settleIfPaid waited ${elapsed}ms for in-flight Cashu receive lock (${PAYMENT_HASH.slice(0, 16)}…)`,
);
console.log("verify-cashu-ln-receive-lock: PASS");
