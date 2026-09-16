/**
 * Event Mode claim tip custody helpers.
 *
 * `payments.collectTip` can return `{ collected: false, token }` after the pot
 * swap already removed those sats. Claim paths historically kept that bearer
 * token only on the in-memory room until `sendToken` + final `recordPayout`
 * succeeded. Process restart or room teardown before that burned the tip.
 *
 * Mirror `collectBattleLeftover`: persist the tipToken to payouts.json as soon
 * as it appears so `/api/dev/claim` sweep can recover it.
 */

/**
 * @param {{ tipSats?: number, tipToken?: string|null, collected?: boolean }} result
 * @returns {boolean}
 */
export function needsPendingTipCustody(result) {
  if (!result || result.collected === true) return false;
  const tipSats = Math.max(0, Math.round(Number(result.tipSats ?? result.sats) || 0));
  const tipToken = String(result.tipToken ?? result.token ?? "").trim();
  return tipSats > 0 && tipToken.length > 0;
}

/**
 * Build a payouts.json row that holds a claim tip bearer token for sweep.
 * @param {object} fields
 */
export function pendingClaimTipRecord(fields) {
  const tipSats = Math.max(0, Math.round(Number(fields.tipSats) || 0));
  const tipToken = String(fields.tipToken || "").trim();
  return {
    room: String(fields.room || "").slice(0, 48),
    potId: String(fields.potId || ""),
    winnerId: String(fields.winnerId || "developer"),
    winnerPubkey: fields.winnerPubkey ?? null,
    potSats: Math.max(0, Math.round(Number(fields.potSats) || 0)),
    winnerSats: 0,
    tipSats,
    tipPercent: Math.max(0, Math.min(100, Math.round(Number(fields.tipPercent) || 0))),
    feeSats: Math.max(0, Math.round(Number(fields.feeSats) || 0)),
    collected: false,
    collectedAt: null,
    tipToken,
    mock: fields.mock === true,
    kind: String(fields.kind || "claim-tip-pending"),
  };
}

/**
 * Append tip custody once per tipToken (idempotent).
 * @param {() => any[]} loadPayouts
 * @param {(list: any[]) => void} savePayouts
 * @param {object} fields
 * @returns {boolean} true when a new row was written
 */
export function persistPendingClaimTip(loadPayouts, savePayouts, fields) {
  const record = pendingClaimTipRecord(fields);
  if (!needsPendingTipCustody(record)) return false;
  const list = loadPayouts();
  if (!Array.isArray(list)) {
    savePayouts([ { at: Date.now(), ...record } ]);
    return true;
  }
  if (list.some((r) => r && String(r.tipToken || "").trim() === record.tipToken)) {
    return false;
  }
  list.push({ at: Date.now(), ...record });
  savePayouts(list.slice(-200));
  return true;
}

/**
 * After tip-wallet receive succeeds, clear matching tipToken rows.
 * @param {() => any[]} loadPayouts
 * @param {(list: any[]) => void} savePayouts
 * @param {string} tipToken
 * @param {number} [tipSats]
 * @returns {boolean}
 */
export function markClaimTipTokenCollected(loadPayouts, savePayouts, tipToken, tipSats) {
  const token = String(tipToken || "").trim();
  if (!token) return false;
  const list = loadPayouts();
  if (!Array.isArray(list) || !list.length) return false;
  let changed = false;
  for (const r of list) {
    if (!r || String(r.tipToken || "").trim() !== token) continue;
    r.collected = true;
    r.collectedAt = Date.now();
    if (Number.isFinite(tipSats) && tipSats > 0) r.tipSats = Math.round(tipSats);
    delete r.tipToken;
    changed = true;
  }
  if (changed) savePayouts(list);
  return changed;
}

/**
 * Final claim audit row after tip custody was already written.
 * Omits tipToken / tipSats so the pending row remains the single tip ledger entry.
 * @param {object} fields
 * @param {{ tipCustodyPersisted: boolean, tipCollected: boolean, tipSats: number, tipToken?: string }} tip
 */
export function finalClaimPayoutFields(fields, tip) {
  const tipCustodyPersisted = tip?.tipCustodyPersisted === true;
  const tipCollected = tip?.tipCollected === true;
  const tipSats = Math.max(0, Math.round(Number(tip?.tipSats) || 0));
  const tipToken = String(tip?.tipToken || "").trim();
  return {
    ...fields,
    tipSats: tipCustodyPersisted ? 0 : tipSats,
    collected: tipCustodyPersisted ? true : tipCollected,
    collectedAt: tipCustodyPersisted || tipCollected ? Date.now() : null,
    tipToken: tipCustodyPersisted || tipCollected ? null : tipToken || null,
  };
}
