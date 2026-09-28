/**
 * Helpers for tip payout row flags in payouts.json.
 *
 * Important: `Number(null) === 0` and `Number.isFinite(0)` is true, so a
 * `collectedAt: null` written by failed tip collects must NOT be treated as a
 * real collection timestamp — otherwise markCollectedTipsClaimed stamps
 * claimedAt onto pending tipToken custody rows and sweepPendingTipTokens
 * skips them forever.
 */

/** True when `v` is a real numeric timestamp (rejects null/undefined/""). */
export function hasFiniteTimestamp(v) {
  return v != null && v !== "" && Number.isFinite(Number(v));
}

/** Tip sats have landed in the tip wallet (not merely pending as tipToken). */
export function tipRowIsCollected(r) {
  if (!r) return false;
  return r.collected === true || hasFiniteTimestamp(r.collectedAt);
}

/**
 * After a tip-wallet withdraw is copied, mark this audit row claimed?
 * Never mark rows that still hold a live tipToken — sweep needs those.
 */
export function tipRowShouldMarkClaimed(r) {
  if (!r || r.mock || r.claimedAt) return false;
  if (r.tipToken) return false;
  return tipRowIsCollected(r);
}
