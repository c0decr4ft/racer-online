/**
 * Plan leftover fold when an Event Battle claim share is abandoned.
 *
 * A failed `claimPot` may already have moved tip sats out of the pot (into the
 * tip wallet or a pending bearer tipToken) before unlocking `battleClaimedIds`.
 * Abandon must not:
 * 1. Re-add those tip sats to `battleLeftoverSats` (they are no longer in the pot)
 * 2. Drop a pending tip bearer token with no custody (silent fund burn)
 *
 * @param {{
 *   claimableSats: number,
 *   tipState?: { tipSats?: number, tipCollected?: boolean, tipToken?: string } | null,
 * }} args
 * @returns {{
 *   leftoverAdd: number,
 *   pendingTipToken: string,
 *   pendingTipSats: number,
 * }}
 */
export function planAbandonedBattleShare({ claimableSats, tipState }) {
  const sats = Math.max(0, Math.round(Number(claimableSats) || 0));
  const tipSats = Math.max(0, Math.round(Number(tipState?.tipSats) || 0));
  const tipCollected = tipState?.tipCollected === true;
  const tipToken =
    typeof tipState?.tipToken === "string" ? tipState.tipToken.trim() : "";
  const tipLeftPot = tipSats > 0 && (tipCollected || tipToken.length > 0);
  return {
    leftoverAdd: tipLeftPot ? Math.max(0, sats - tipSats) : sats,
    pendingTipToken: !tipCollected && tipToken ? tipToken : "",
    pendingTipSats: !tipCollected && tipToken ? tipSats : 0,
  };
}
