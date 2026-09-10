/**
 * Reconcile Event Battle leftover tip accounting after an async collect/redeem.
 *
 * `collectBattleLeftover` snapshots `wantedAtStart` then awaits mint I/O. During
 * that window `abandonBattleClaimShare` may add sats to `battleLeftoverSats`.
 * Replacing leftover with this attempt's tip amount would seal those abandoned
 * shares as "collected" while they still sit in the pot file.
 *
 * @param {{
 *   leftoverSatsNow: number,
 *   wantedAtStart: number,
 *   applied: number,
 *   tipCollected: boolean,
 * }} s
 * @returns {{ leftoverSats: number, collected: boolean }}
 */
export function reconcileBattleLeftoverAfterAttempt(s) {
  const now = Math.max(0, Math.round(Number(s.leftoverSatsNow) || 0));
  const start = Math.max(0, Math.round(Number(s.wantedAtStart) || 0));
  const applied = Math.max(0, Math.round(Number(s.applied) || 0));
  const growth = Math.max(0, now - start);
  const unappliedStart = Math.max(0, start - applied);
  if (s.tipCollected === true) {
    const leftoverSats = growth + unappliedStart;
    return { leftoverSats, collected: leftoverSats <= 0 };
  }
  // Bearer token still holds `applied` — keep it owed until redeem succeeds.
  const leftoverSats = growth + unappliedStart + applied;
  return { leftoverSats, collected: false };
}
