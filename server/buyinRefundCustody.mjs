/**
 * Plan durable custody when a lobby buy-in refund Cashu token cannot be
 * delivered over the WebSocket (tab close, leave timeout → disconnect, etc.).
 *
 * The mint send already burned pot proofs into a bearer token. Without disk
 * custody that token only exists in ephemeral stdout — log rotation / restart
 * permanently strands the player's sats.
 */

/**
 * @param {{
 *   delivered: boolean,
 *   token?: string | null,
 *   refundSats?: number,
 * }} args
 * @returns {{
 *   needsCustody: boolean,
 *   refundToken: string,
 *   refundSats: number,
 * }}
 */
export function planUndeliveredBuyInRefund({ delivered, token, refundSats }) {
  const refundToken = typeof token === "string" ? token.trim() : "";
  const sats = Math.max(0, Math.round(Number(refundSats) || 0));
  const needsCustody = delivered !== true && refundToken.length > 0 && sats > 0;
  return {
    needsCustody,
    refundToken: needsCustody ? refundToken : "",
    refundSats: needsCustody ? sats : 0,
  };
}

/**
 * Tip-wallet sweep must never redeem player refund bearer tokens.
 * @param {object | null | undefined} record
 */
export function isBuyInRefundCustodyRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (record.kind === "buyin-refund-undelivered") return true;
  return typeof record.refundToken === "string" && record.refundToken.trim().length > 0;
}
