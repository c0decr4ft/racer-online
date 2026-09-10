/**
 * Event Battle leftover: abandon-during-collect must not seal stranded sats.
 * Run: node scripts/verify-battle-leftover-reconcile.mjs
 */
import { reconcileBattleLeftoverAfterAttempt } from "../server/battleLeftoverReconcile.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Happy path: collected exact leftover, no growth.
{
  const next = reconcileBattleLeftoverAfterAttempt({
    leftoverSatsNow: 20,
    wantedAtStart: 20,
    applied: 20,
    tipCollected: true,
  });
  assert(next.leftoverSats === 0, `happy leftover=${next.leftoverSats}`);
  assert(next.collected === true, "happy collected");
}

// BUG repro: finish collectTip(20) in flight; disconnect abandons +40 into leftover.
// Old code set leftoverSats=20, collected=true → 40 sats stranded in pot forever.
{
  const next = reconcileBattleLeftoverAfterAttempt({
    leftoverSatsNow: 60, // 20 + 40 abandoned during await
    wantedAtStart: 20,
    applied: 20,
    tipCollected: true,
  });
  assert(next.leftoverSats === 40, `abandon growth leftover=${next.leftoverSats}`);
  assert(next.collected === false, "must not seal while abandoned share still owed");
}

// Partial tipCap < wanted (fees / reserved claim shares) must leave remainder owed.
{
  const next = reconcileBattleLeftoverAfterAttempt({
    leftoverSatsNow: 50,
    wantedAtStart: 50,
    applied: 30,
    tipCollected: true,
  });
  assert(next.leftoverSats === 20, `partial leftover=${next.leftoverSats}`);
  assert(next.collected === false, "partial not sealed");
}

// Pending bearer token: applied sats stay owed until redeem.
{
  const next = reconcileBattleLeftoverAfterAttempt({
    leftoverSatsNow: 20,
    wantedAtStart: 20,
    applied: 20,
    tipCollected: false,
  });
  assert(next.leftoverSats === 20, `pending token leftover=${next.leftoverSats}`);
  assert(next.collected === false, "pending token not collected");
}

// Pending token + abandon growth during collectTip await.
{
  const next = reconcileBattleLeftoverAfterAttempt({
    leftoverSatsNow: 55,
    wantedAtStart: 20,
    applied: 20,
    tipCollected: false,
  });
  assert(next.leftoverSats === 55, `pending+growth leftover=${next.leftoverSats}`);
  assert(next.collected === false, "pending+growth not collected");
}

// Redeem path: token burns, growth during redeem stays owed.
{
  const next = reconcileBattleLeftoverAfterAttempt({
    leftoverSatsNow: 45,
    wantedAtStart: 20,
    applied: 20,
    tipCollected: true,
  });
  assert(next.leftoverSats === 25, `redeem growth leftover=${next.leftoverSats}`);
  assert(next.collected === false, "redeem growth not sealed");
}

console.log("verify-battle-leftover-reconcile: ok");
