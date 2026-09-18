/**
 * Client copy for Event Mode lobby buy-in refunds.
 * Keep bearer tokens on-screen until the player dismisses — never claim
 * "token copied" unless the clipboard write actually succeeded.
 *
 * Must stay in sync with src/net/buyInRefundUi.ts (verified below).
 */

/**
 * @param {number} sats
 * @param {boolean} hasToken
 * @returns {string}
 */
export function buyInRefundStatusText(sats, hasToken) {
  const n = Math.max(0, Math.round(Number(sats) || 0));
  if (!hasToken) {
    return n > 0 ? `Refunded ${n} sats` : "Buy-in refund complete";
  }
  return `Buy-in refund · ${n} sats — scan the QR or copy the token into cashu.me. Keep this open until you have saved it.`;
}

/**
 * @param {boolean} clipboardOk
 * @returns {string}
 */
export function buyInRefundCopyToast(clipboardOk) {
  return clipboardOk
    ? "Refund token copied"
    : "Clipboard unavailable — copy the token from the refund panel";
}
