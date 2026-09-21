/**
 * Guard: dual Cashu paste + Lightning (or double paste) must refund the
 * uncredited deposit out of the pot — not leave it as claim surplus.
 *
 * Run: node scripts/verify-dual-pay-surplus.mjs
 */
import {
  planDualPaySurplusRefund,
  DUAL_PAY_SURPLUS_REFUND_KIND,
  isTipSweepablePayout,
} from "../server/dualPayBuyIn.mjs";
import { readFileSync } from "node:fs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

{
  assert(planDualPaySurplusRefund({ credited: true, netSats: 50 }).refund === false, "credited no refund");
  const surplus = planDualPaySurplusRefund({ credited: false, netSats: 50 });
  assert(surplus.refund === true && surplus.refundSats === 50, "surplus refunds net");
  assert(planDualPaySurplusRefund({ credited: false, netSats: 0 }).refund === false, "zero sats");
  assert(planDualPaySurplusRefund({ credited: false, netSats: -3 }).refund === false, "negative sats");
}

{
  assert(isTipSweepablePayout({ kind: "battle-leftover" }) === true, "leftover tip sweepable");
  assert(isTipSweepablePayout({}) === true, "legacy tip sweepable");
  assert(isTipSweepablePayout({ kind: DUAL_PAY_SURPLUS_REFUND_KIND }) === false, "dual-pay not tip-swept");
  assert(isTipSweepablePayout({ kind: "buy-in-orphan-refund" }) === false, "orphan not tip-swept");
}

{
  const src = readFileSync(new URL("../server/index.mjs", import.meta.url), "utf8");
  assert(src.includes("creditBuyInOrRefundSurplus"), "index wires creditBuyInOrRefundSurplus");
  assert(src.includes("refundDualPaySurplusDeposit"), "index wires refundDualPaySurplusDeposit");
  assert(src.includes("isTipSweepablePayout"), "tip sweep skips buy-in custody");
  assert(src.includes("lnSurplusRefunded"), "LN surplus refund is one-shot");
  assert(src.includes("buyIn.receiving"), "paste serializes with receiving flag");
  // Must not drop LN surplus on the floor when paste already credited the seat.
  assert(
    !/if \(buyIn\.paidAt > 0\) return;\s*markBuyInPaid/.test(src),
    "settle must not early-return after paidAt without surplus refund",
  );
  assert(src.includes("dual-pay surplus refund"), "surplus refund is logged");
}

console.log("verify-dual-pay-surplus: ok");
