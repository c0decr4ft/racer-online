/**
 * Regression: claim tip bearer tokens must land in payouts.json immediately,
 * not only after a successful winner sendToken / final recordPayout.
 *
 * Simulates the collectTip → { collected:false, token } path and asserts
 * custody + final-row accounting stay single-ledger for tip sats.
 */
import assert from "node:assert/strict";
import {
  needsPendingTipCustody,
  persistPendingClaimTip,
  markClaimTipTokenCollected,
  finalClaimPayoutFields,
  pendingClaimTipRecord,
} from "../server/claimTipCustody.mjs";

function makeStore(seed = []) {
  let list = seed.map((r) => ({ ...r }));
  return {
    load: () => list.map((r) => ({ ...r })),
    save: (next) => {
      list = (Array.isArray(next) ? next : []).map((r) => ({ ...r }));
    },
    snapshot: () => list.map((r) => ({ ...r })),
  };
}

assert.equal(needsPendingTipCustody({ collected: true, tipSats: 5, tipToken: "x" }), false);
assert.equal(needsPendingTipCustody({ collected: false, tipSats: 5, tipToken: "" }), false);
assert.equal(needsPendingTipCustody({ collected: false, tipSats: 5, tipToken: "cashuA..." }), true);
assert.equal(needsPendingTipCustody({ sats: 3, token: "tok", collected: false }), true);

const store = makeStore();
const token = "cashuA-pending-tip-token";
const wrote = persistPendingClaimTip(store.load, store.save, {
  room: "event-1",
  potId: "pot-uuid",
  winnerId: "winner-1",
  potSats: 100,
  tipSats: 10,
  tipPercent: 10,
  tipToken: token,
  mock: false,
  kind: "claim-tip-pending",
});
assert.equal(wrote, true);
assert.equal(store.snapshot().length, 1);
assert.equal(store.snapshot()[0].tipToken, token);
assert.equal(store.snapshot()[0].collected, false);

// Idempotent — same token must not duplicate.
const wroteAgain = persistPendingClaimTip(store.load, store.save, {
  room: "event-1",
  potId: "pot-uuid",
  winnerId: "winner-1",
  potSats: 100,
  tipSats: 10,
  tipPercent: 10,
  tipToken: token,
  mock: false,
});
assert.equal(wroteAgain, false);
assert.equal(store.snapshot().length, 1);

// Final claim row after custody: no second tipToken / tipSats ledger entry.
const finalRow = finalClaimPayoutFields(
  {
    room: "event-1",
    potId: "pot-uuid",
    winnerId: "winner-1",
    potSats: 100,
    winnerSats: 88,
    tipPercent: 10,
    feeSats: 2,
    mock: false,
  },
  { tipCustodyPersisted: true, tipCollected: false, tipSats: 10, tipToken: token },
);
assert.equal(finalRow.tipToken, null);
assert.equal(finalRow.tipSats, 0);
assert.equal(finalRow.collected, true);
assert.equal(finalRow.winnerSats, 88);

// Tip-wallet receive clears the custody row for sweep.
const marked = markClaimTipTokenCollected(store.load, store.save, token, 10);
assert.equal(marked, true);
assert.equal(store.snapshot()[0].collected, true);
assert.equal(store.snapshot()[0].tipToken, undefined);

// Old bug shape: tip only on room RAM → empty payouts after "crash".
const buggy = makeStore();
const roomOnly = { payoutTipToken: token, payoutTipSats: 10, payoutTipCollected: false };
assert.equal(buggy.snapshot().length, 0);
assert.ok(needsPendingTipCustody({
  tipSats: roomOnly.payoutTipSats,
  tipToken: roomOnly.payoutTipToken,
  collected: roomOnly.payoutTipCollected,
}));
persistPendingClaimTip(buggy.load, buggy.save, pendingClaimTipRecord({
  room: "gone",
  potId: "pot",
  tipSats: roomOnly.payoutTipSats,
  tipToken: roomOnly.payoutTipToken,
}));
assert.equal(buggy.snapshot().length, 1, "flush before rooms.delete must keep tipToken on disk");

console.log("verify-claim-tip-custody: ok");
