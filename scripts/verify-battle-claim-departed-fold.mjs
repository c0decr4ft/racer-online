/**
 * Event Battle: mid-claim disconnect + failed payout must fold the share into
 * leftover (claimedIds blocked abandon while the claim was in flight).
 * Run: node scripts/verify-battle-claim-departed-fold.mjs
 */
import {
  planAbandonedBattleShare,
  shouldFoldDepartedBattleClaim,
} from "../server/battleAbandonTip.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Still in room after fail — keep claimable so they can retry.
{
  const fold = shouldFoldDepartedBattleClaim({
    clientInRoom: true,
    hasClaimable: true,
  });
  assert(fold === false, "in-room fail must not force leftover fold");
}

// Departed mid-claim, fail unlocks claimedIds — must fold (BUG repro).
{
  const fold = shouldFoldDepartedBattleClaim({
    clientInRoom: false,
    hasClaimable: true,
  });
  assert(fold === true, "departed fail must fold claimable into leftover");
}

// Nothing left to fold (success path already deleted claimable).
{
  const fold = shouldFoldDepartedBattleClaim({
    clientInRoom: false,
    hasClaimable: false,
  });
  assert(fold === false, "no claimable → no fold");
}

// Tip already out of pot during failed claim — fold only remainder + custody token.
{
  const plan = planAbandonedBattleShare({
    claimableSats: 100,
    tipState: { tipSats: 10, tipCollected: false, tipToken: "cashuApendingtip" },
  });
  assert(plan.leftoverAdd === 90, `pending-tip leftover=${plan.leftoverAdd}`);
  assert(plan.pendingTipToken === "cashuApendingtip", "must custody tip bearer");
  assert(plan.pendingTipSats === 10, `pending tip sats=${plan.pendingTipSats}`);
}

// tipPercent 0 / no tip — full share folds.
{
  const plan = planAbandonedBattleShare({
    claimableSats: 75,
    tipState: { tipSats: 0, tipCollected: true, tipToken: "" },
  });
  assert(plan.leftoverAdd === 75, `zero-tip leftover=${plan.leftoverAdd}`);
  assert(plan.pendingTipToken === "", "no tip token");
}

console.log("verify-battle-claim-departed-fold: ok");
