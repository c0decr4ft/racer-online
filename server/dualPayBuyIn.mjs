/**
 * Event Mode: two payment paths for the same lobby seat (paste Cashu + Lightning,
 * double paste, or NUT-18 + paste) can both land proofs in cashu-pots/<uuid>.json
 * while markBuyInPaid only credits once.
 *
 * The uncredited deposit becomes claim surplus (race claim pays raw wallet balance)
 * or sits stranded. Plan a surplus refund so the second payment returns to the payer.
 */

/** Payout kind for dual-pay surplus refunds — must not be tip-swept into the DEV wallet. */
export const DUAL_PAY_SURPLUS_REFUND_KIND = "buy-in-dual-pay-surplus";

/**
 * After a successful deposit, decide whether the seat still needs credit or the
 * proofs are surplus (already paid / seat gone) and must leave the pot.
 * @param {{ credited: boolean, netSats?: number }} args
 */
export function planDualPaySurplusRefund({ credited, netSats }) {
  const sats = Math.max(0, Math.round(Number(netSats) || 0));
  if (credited || sats <= 0) {
    return { refund: false, refundSats: 0 };
  }
  return { refund: true, refundSats: sats };
}

/**
 * Tip auto-sweep must ignore player buy-in refund custody rows.
 * @param {{ kind?: string } | null | undefined} record
 */
export function isTipSweepablePayout(record) {
  const kind = String(record?.kind || "");
  if (!kind) return true; // legacy claim tips have no kind
  if (kind.startsWith("buy-in-")) return false;
  return true;
}
