/**
 * Lobby buy-in refund delivery / custody decisions.
 *
 * On disconnect the WebSocket is already closed when `refundLobbyBuyIn` runs.
 * Minting a Cashu bearer then only `console.error`-ing it burns pot sats — logs
 * are not durable custody. Prefer leaving sats in the pot file, or redepositing
 * if a mint raced the close.
 */

/** WebSocket.OPEN — only mint a player-facing refund when we can deliver it. */
export const WS_OPEN = 1;

/**
 * @param {number} readyState
 * @returns {boolean}
 */
export function canDeliverBuyInRefund(readyState) {
  return readyState === WS_OPEN;
}

/**
 * Last-resort custody when a refund token was minted but neither WS delivery
 * nor pot redeposit succeeded.
 *
 * @param {{ token?: string, refundSats?: number }} args
 * @returns {{ custody: boolean, tipToken: string, tipSats: number }}
 */
export function planUndeliveredBuyInRefundCustody({ token, refundSats }) {
  const tipToken = typeof token === "string" ? token.trim() : "";
  const tipSats = Math.max(0, Math.round(Number(refundSats) || 0));
  if (!tipToken || tipSats <= 0) {
    return { custody: false, tipToken: "", tipSats: 0 };
  }
  return { custody: true, tipToken, tipSats };
}
