/**
 * Event Mode: Cashu/Lightning buy-in completed after the payer left the lobby.
 *
 * receivePayload / mintProofs can finish after ws close deleted the buyIn row.
 * markBuyInPaid then no-ops while proofs already sit in cashu-pots/<uuid>.json —
 * either stranded or drained by a later race claim that pays raw wallet balance.
 */

/**
 * True when this client still has an unpaid lobby buy-in we can mark paid.
 * @param {{ phase?: string, clients?: Map<string, unknown>, buyIns?: Map<string, { paidAt?: number }> } | null | undefined} room
 * @param {string} clientId
 */
export function buyInCreditStillLive(room, clientId) {
  if (!room || room.phase !== "lobby") return false;
  if (!room.clients?.has(clientId)) return false;
  const buyIn = room.buyIns?.get(clientId);
  if (!buyIn || buyIn.paidAt) return false;
  return true;
}

/**
 * Decide whether a successful deposit should credit the lobby or be treated as
 * an orphan that must leave the pot (refund) so it cannot pad a later claim.
 * @param {{ credited: boolean, netSats?: number }} args
 */
export function planOrphanBuyInRefund({ credited, netSats }) {
  const sats = Math.max(0, Math.round(Number(netSats) || 0));
  if (credited || sats <= 0) {
    return { refund: false, refundSats: 0 };
  }
  return { refund: true, refundSats: sats };
}

/** Payout kind for orphan refunds — must not be tip-swept into the DEV wallet. */
export const ORPHAN_BUYIN_REFUND_KIND = "buy-in-orphan-refund";

/**
 * Tip auto-sweep must ignore player refund custody rows.
 * @param {{ kind?: string } | null | undefined} record
 */
export function isTipSweepablePayout(record) {
  const kind = String(record?.kind || "");
  if (!kind) return true; // legacy claim tips have no kind
  if (kind.startsWith("buy-in-")) return false;
  return true;
}
