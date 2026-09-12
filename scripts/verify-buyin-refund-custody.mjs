/**
 * Lobby buy-in refund must not mint bearers nobody can receive.
 * Run: node scripts/verify-buyin-refund-custody.mjs
 */
import {
  canDeliverBuyInRefund,
  planUndeliveredBuyInRefundCustody,
  WS_OPEN,
} from "../server/buyInRefund.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(canDeliverBuyInRefund(WS_OPEN) === true, "OPEN can deliver");
assert(canDeliverBuyInRefund(0) === false, "CONNECTING cannot deliver");
assert(canDeliverBuyInRefund(2) === false, "CLOSING cannot deliver");
assert(canDeliverBuyInRefund(3) === false, "CLOSED cannot deliver");

{
  const plan = planUndeliveredBuyInRefundCustody({
    token: "cashuArefund",
    refundSats: 42,
  });
  assert(plan.custody === true, "valid token custodied");
  assert(plan.tipToken === "cashuArefund", "token kept");
  assert(plan.tipSats === 42, "sats kept");
}

{
  const plan = planUndeliveredBuyInRefundCustody({ token: "   ", refundSats: 10 });
  assert(plan.custody === false, "blank token not custodied");
  assert(plan.tipToken === "", "blank cleared");
}

{
  const plan = planUndeliveredBuyInRefundCustody({ token: "cashuAx", refundSats: 0 });
  assert(plan.custody === false, "zero sats not custodied");
}

console.log("verify-buyin-refund-custody: ok");
