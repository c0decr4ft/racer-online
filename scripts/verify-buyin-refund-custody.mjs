/**
 * Regression: undelivered lobby buy-in refund tokens must be flagged for
 * durable custody, and tip sweep must not treat them as tip bearer tokens.
 * Run: node scripts/verify-buyin-refund-custody.mjs
 */
import {
  isBuyInRefundCustodyRecord,
  planUndeliveredBuyInRefund,
} from "../server/buyinRefundCustody.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

{
  const plan = planUndeliveredBuyInRefund({
    delivered: false,
    token: "cashuArefundtoken",
    refundSats: 42,
  });
  assert(plan.needsCustody === true, "closed-socket refund must need custody");
  assert(plan.refundToken === "cashuArefundtoken", "must keep full bearer token");
  assert(plan.refundSats === 42, `sats=${plan.refundSats}`);
}

{
  const plan = planUndeliveredBuyInRefund({
    delivered: true,
    token: "cashuArefundtoken",
    refundSats: 42,
  });
  assert(plan.needsCustody === false, "delivered refund needs no custody");
  assert(plan.refundToken === "", "no custody token when delivered");
}

{
  const plan = planUndeliveredBuyInRefund({
    delivered: false,
    token: "   ",
    refundSats: 10,
  });
  assert(plan.needsCustody === false, "empty token cannot be custodied");
}

assert(
  isBuyInRefundCustodyRecord({
    kind: "buyin-refund-undelivered",
    refundToken: "cashuA…",
  }) === true,
  "kind marks refund custody",
);
assert(
  isBuyInRefundCustodyRecord({
    tipToken: "cashuAtip",
    tipSats: 5,
    kind: "race",
  }) === false,
  "normal tip rows are not refund custody",
);
assert(
  isBuyInRefundCustodyRecord({
    refundToken: "cashuAorphan",
    tipSats: 0,
  }) === true,
  "refundToken alone marks custody",
);

console.log("verify-buyin-refund-custody: ok");
