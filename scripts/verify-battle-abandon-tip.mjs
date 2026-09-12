/**
 * Event Battle abandon must custody pending claim tip tokens.
 * Run: node scripts/verify-battle-abandon-tip.mjs
 */
import { planAbandonedBattleShare } from "../server/battleAbandonTip.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// No tip state — full share folds into leftover.
{
  const plan = planAbandonedBattleShare({ claimableSats: 100, tipState: null });
  assert(plan.leftoverAdd === 100, `no-tip leftover=${plan.leftoverAdd}`);
  assert(plan.pendingTipToken === "", "no pending token");
  assert(plan.pendingTipSats === 0, "no pending tip sats");
}

// Tip already in tip wallet — only remainder goes to leftover; no bearer to custody.
{
  const plan = planAbandonedBattleShare({
    claimableSats: 100,
    tipState: { tipSats: 10, tipCollected: true, tipToken: "" },
  });
  assert(plan.leftoverAdd === 90, `collected-tip leftover=${plan.leftoverAdd}`);
  assert(plan.pendingTipToken === "", "collected tip has no token");
  assert(plan.pendingTipSats === 0, "collected tip sats not pending");
}

// BUG repro: failed claim left tipToken in battleClaimTips; old abandon deleted it
// and added full claimable to leftover → tip sats burned (not in pot, token gone).
{
  const plan = planAbandonedBattleShare({
    claimableSats: 100,
    tipState: { tipSats: 10, tipCollected: false, tipToken: "cashuApendingtip" },
  });
  assert(plan.leftoverAdd === 90, `pending-tip leftover=${plan.leftoverAdd}`);
  assert(plan.pendingTipToken === "cashuApendingtip", "must custody tip bearer");
  assert(plan.pendingTipSats === 10, `pending tip sats=${plan.pendingTipSats}`);
}

// 100% tip pending — leftover add is 0; entire amount is tip custody.
{
  const plan = planAbandonedBattleShare({
    claimableSats: 50,
    tipState: { tipSats: 50, tipCollected: false, tipToken: "cashuAalltip" },
  });
  assert(plan.leftoverAdd === 0, `all-tip leftover=${plan.leftoverAdd}`);
  assert(plan.pendingTipToken === "cashuAalltip", "all-tip custody");
  assert(plan.pendingTipSats === 50, "all-tip sats");
}

// Whitespace-only token is not custody-worthy.
{
  const plan = planAbandonedBattleShare({
    claimableSats: 40,
    tipState: { tipSats: 5, tipCollected: false, tipToken: "   " },
  });
  assert(plan.leftoverAdd === 40, "blank token does not reduce leftover");
  assert(plan.pendingTipToken === "", "blank token ignored");
}

console.log("verify-battle-abandon-tip: ok");
