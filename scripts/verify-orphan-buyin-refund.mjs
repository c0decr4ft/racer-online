/**
 * Guard: Cashu/Lightning buy-ins that finish after the payer left must be
 * refunded out of the pot — not left as claim surplus.
 *
 * Run: node scripts/verify-orphan-buyin-refund.mjs
 */
import {
  buyInCreditStillLive,
  planOrphanBuyInRefund,
  ORPHAN_BUYIN_REFUND_KIND,
  isTipSweepablePayout,
} from "../server/orphanBuyIn.mjs";
import { readFileSync } from "node:fs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

{
  const room = {
    phase: "lobby",
    clients: new Map([["a", {}]]),
    buyIns: new Map([["a", { paidAt: 0 }]]),
  };
  assert(buyInCreditStillLive(room, "a") === true, "live unpaid buy-in");
  room.buyIns.get("a").paidAt = Date.now();
  assert(buyInCreditStillLive(room, "a") === false, "already paid");
  room.buyIns.set("a", { paidAt: 0 });
  room.clients.delete("a");
  assert(buyInCreditStillLive(room, "a") === false, "client left");
  room.clients.set("a", {});
  room.phase = "racing";
  assert(buyInCreditStillLive(room, "a") === false, "race started");
}

{
  assert(planOrphanBuyInRefund({ credited: true, netSats: 50 }).refund === false, "credited no refund");
  const orphan = planOrphanBuyInRefund({ credited: false, netSats: 50 });
  assert(orphan.refund === true && orphan.refundSats === 50, "orphan refunds net");
  assert(planOrphanBuyInRefund({ credited: false, netSats: 0 }).refund === false, "zero sats");
}

{
  assert(isTipSweepablePayout({ kind: "battle-leftover" }) === true, "leftover tip sweepable");
  assert(isTipSweepablePayout({}) === true, "legacy tip sweepable");
  assert(isTipSweepablePayout({ kind: ORPHAN_BUYIN_REFUND_KIND }) === false, "orphan not tip-swept");
  assert(isTipSweepablePayout({ kind: "buy-in-refund-undelivered" }) === false, "buy-in custody not tip-swept");
}

{
  const src = readFileSync(new URL("../server/index.mjs", import.meta.url), "utf8");
  assert(src.includes("creditBuyInOrRefundOrphan"), "index wires creditBuyInOrRefundOrphan");
  assert(src.includes("refundOrphanBuyInDeposit"), "index wires refundOrphanBuyInDeposit");
  assert(src.includes("isTipSweepablePayout"), "tip sweep skips buy-in custody");
  assert(src.includes("payer left the lobby"), "pre-receive leave gate");
}

console.log("verify-orphan-buyin-refund: ok");
