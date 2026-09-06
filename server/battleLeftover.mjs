/**
 * Pure control-flow for Event Battle leftover → tip-wallet collection.
 *
 * After finish, uncollected cube sats are pulled from the pot into the tip
 * wallet. The first `collectTip` may succeed at the mint but fail the tip-wallet
 * receive, leaving a bearer token that still holds those sats. A later retry
 * must redeem that token — never draw the pot again, and never mark the
 * leftover "collected" just because the pot balance temporarily cannot cover it.
 *
 * @param {{
 *   collected: boolean,
 *   wanted: number,
 *   pendingToken: boolean,
 *   tipCap: number,
 * }} s
 * @returns {"noop" | "mark-collected" | "redeem-token" | "collect-fresh" | "wait"}
 */
export function nextBattleLeftoverAction(s) {
  if (s.collected) return "noop";
  const wanted = Math.max(0, Math.round(Number(s.wanted) || 0));
  if (wanted <= 0) return "mark-collected";
  // Bearer token still holds pot sats that already left the pot file.
  if (s.pendingToken) return "redeem-token";
  const tipCap = Math.max(0, Math.round(Number(s.tipCap) || 0));
  // Balance read can fail open as 0; do not permanently abandon leftover.
  if (tipCap <= 0) return "wait";
  return "collect-fresh";
}
