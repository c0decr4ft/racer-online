/**
 * Regression: markCollectedTipsClaimed must not stamp claimedAt onto pending
 * tipToken custody rows. Before the fix, `Number.isFinite(Number(null))` was
 * true (Number(null)===0), so every payout row with collectedAt:null was marked
 * claimed when a tip withdraw was copied — then sweepPendingTipTokens skipped
 * those tipTokens forever (silent tip burn).
 */
import {
  hasFiniteTimestamp,
  tipRowIsCollected,
  tipRowShouldMarkClaimed,
} from "../server/tipPayoutFlags.mjs";

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function oldMarkPredicate(r) {
  if (!r || r.mock || r.claimedAt) return false;
  return r.collected === true || Number.isFinite(Number(r.collectedAt));
}

const pending = JSON.parse(
  JSON.stringify({
    at: 1,
    tipSats: 42,
    collected: false,
    collectedAt: null,
    tipToken: "cashuApendingTipToken",
    mock: false,
  }),
);

if (!Number.isFinite(Number(null))) fail("precondition: Number(null) must be finite (0)");
if (!oldMarkPredicate(pending)) {
  fail("expected old Number(null) predicate to mark pending tipToken claimed");
}
if (tipRowShouldMarkClaimed(pending)) {
  fail("pending tipToken row must NOT be marked claimed");
}
if (tipRowIsCollected(pending)) {
  fail("pending tipToken row must NOT count as collected");
}
if (hasFiniteTimestamp(null)) fail("hasFiniteTimestamp(null) must be false");
if (hasFiniteTimestamp(undefined)) fail("hasFiniteTimestamp(undefined) must be false");
if (hasFiniteTimestamp("")) fail('hasFiniteTimestamp("") must be false');
if (!hasFiniteTimestamp(1_700_000_000_000)) fail("hasFiniteTimestamp(epoch ms) must be true");

const collectedOk = {
  at: 2,
  tipSats: 10,
  collected: true,
  collectedAt: Date.now(),
  tipToken: null,
  mock: false,
};
if (!tipRowShouldMarkClaimed(collectedOk)) {
  fail("successfully collected tip (no tipToken) should be markable as claimed");
}

const collectedWithStrayToken = {
  at: 3,
  tipSats: 7,
  collected: true,
  collectedAt: Date.now(),
  tipToken: "cashuAstillHere",
  mock: false,
};
if (tipRowShouldMarkClaimed(collectedWithStrayToken)) {
  fail("collected=true but tipToken still present must wait for sweep");
}

const alreadyClaimed = { ...collectedOk, claimedAt: Date.now() };
if (tipRowShouldMarkClaimed(alreadyClaimed)) {
  fail("already-claimed row must not be re-marked");
}

console.log("verify-tip-claimed-at-null: PASS");
