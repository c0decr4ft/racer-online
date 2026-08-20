/**
 * Dev dashboard API — tip wallet + history, gated by a signed Nostr
 * auth event from the server's configured DEV_PUBKEY (kind 30078, d=…:dev).
 */
import { apiUrl } from "./apiBase";

export const DEV_EVENT_KIND = 30078;
export const DEV_D_TAG = "racer-online:dev";

export type DevTip = {
  at: number;
  room: string;
  potSats: number;
  tipSats: number;
  tipPercent: number;
  mock: boolean;
  /** Swapped into the server tip wallet (mint burned the old secrets). */
  collected: boolean;
  claimed: boolean;
};

export type DevPendingWithdraw = {
  amountSats: number;
  at: number;
  token: string;
};

export type DevWalletAudit = {
  label: string;
  file: boolean;
  mintUrl: string;
  localSats: number;
  proofs: number;
  unspentSats: number;
  spentSats: number;
  pendingSats: number;
  orphaned: boolean;
  receivedIds?: number;
  events?: number;
  error?: string | null;
  rescueToken?: string | null;
};

export type DevCustody = {
  mock?: boolean;
  mintUrl: string;
  pot: DevWalletAudit | null;
  tip: DevWalletAudit | null;
  error?: string | null;
};

export type DevLiveEvent = {
  name: string;
  players: number;
  paid: number;
  potSats: number;
  potClaimed: boolean;
  phase: string;
};

export type DevTipsSummary = {
  ok: boolean;
  mint: string;
  count: number;
  earnedSats: number;
  /** Current tip-wallet balance (auto-collected, not yet withdrawn). */
  pendingSats: number;
  walletSats: number;
  pendingCount: number;
  claimedSats: number;
  withdrawnSats: number;
  pendingWithdraw?: DevPendingWithdraw | null;
  tips: DevTip[];
  marked?: number;
  custody?: DevCustody;
  liveEvents?: DevLiveEvent[];
};

type DevSigner = {
  signEvent: (template: {
    kind: number;
    created_at: number;
    content: string;
    tags: string[][];
  }) => Promise<unknown>;
};

/** The dev pubkey the server trusts (null = dashboard not configured there). */
export async function fetchDevPubkey(): Promise<string | null> {
  const url = apiUrl("/status");
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pk = String(data?.devPubkey || "").toLowerCase();
    return /^[0-9a-f]{64}$/.test(pk) ? pk : null;
  } catch {
    return null;
  }
}

function devAuthTemplate() {
  return {
    kind: DEV_EVENT_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({ action: "dev-tips", at: Date.now() }),
    tags: [
      ["d", DEV_D_TAG],
      ["t", "racer-online"],
    ],
  };
}

async function postDev(path: string, signer: DevSigner, extra?: Record<string, unknown>): Promise<DevTipsSummary> {
  const url = apiUrl(path);
  if (!url) throw new Error("server unreachable");
  const event = await signer.signEvent(devAuthTemplate());
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok !== true) {
    throw new Error(String(data?.error || `server ${res.status}`));
  }
  return data as DevTipsSummary;
}

/** Tip wallet balance + history (tokens never leave the server until you withdraw). */
export function fetchDevTips(signer: DevSigner): Promise<DevTipsSummary> {
  return postDev("/dev/tips", signer);
}

/** Mark the pending withdraw as copied (after pasting into cashu.me). */
export function markTipsClaimed(signer: DevSigner, _claimAt?: number): Promise<DevTipsSummary> {
  return postDev("/dev/claim", signer);
}

/** Retry a failed tip collect — swaps it into the tip wallet at the mint. */
export function retryDevTip(signer: DevSigner, retryAt: number): Promise<DevTipsSummary> {
  return postDev("/dev/claim", signer, { retryAt });
}

/** Export the tip wallet as a cashuA token to paste into cashu.me. */
export function withdrawDevTips(signer: DevSigner, amountSats?: number): Promise<DevTipsSummary> {
  return postDev("/dev/withdraw", signer, amountSats != null ? { amountSats } : {});
}

/* ── Dev feedback inbox ─────────────────────────────────────────── */

export type DevFeedbackMessage = {
  id: string;
  text: string;
  name?: string;
  createdAt: number;
  /** True when dismissed via READ (hidden from the default inbox view). */
  read: boolean;
};

async function postDevFeedback(
  signer: DevSigner,
  action: "list" | "read" | "delete",
  id?: string,
): Promise<DevFeedbackMessage[]> {
  const url = apiUrl("/dev/feedback");
  if (!url) throw new Error("server unreachable");
  const event = await signer.signEvent(devAuthTemplate());
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, action, id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok !== true || !Array.isArray(data?.messages)) {
    throw new Error(String(data?.error || `server ${res.status}`));
  }
  return data.messages as DevFeedbackMessage[];
}

export function fetchDevFeedback(signer: DevSigner): Promise<DevFeedbackMessage[]> {
  return postDevFeedback(signer, "list");
}

export function markDevFeedbackRead(signer: DevSigner, id: string): Promise<DevFeedbackMessage[]> {
  return postDevFeedback(signer, "read", id);
}

export function deleteDevFeedback(signer: DevSigner, id: string): Promise<DevFeedbackMessage[]> {
  return postDevFeedback(signer, "delete", id);
}
