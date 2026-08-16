/**
 * Dev dashboard API — tip stats + claim tracking, gated by a signed Nostr
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
  claimed: boolean;
  tipToken?: string;
};

export type DevTipsSummary = {
  ok: boolean;
  mint: string;
  count: number;
  earnedSats: number;
  pendingSats: number;
  pendingCount: number;
  claimedSats: number;
  tips: DevTip[];
  marked?: number;
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

/** Tip stats + pending tip tokens (tokens are bearer — dev eyes only). */
export function fetchDevTips(signer: DevSigner): Promise<DevTipsSummary> {
  return postDev("/dev/tips", signer);
}

/** Mark one tip (by `claimAt`) or all pending tips as claimed. */
export function markTipsClaimed(signer: DevSigner, claimAt?: number): Promise<DevTipsSummary> {
  return postDev("/dev/claim", signer, claimAt != null ? { claimAt } : {});
}

/** Retry a failed tip payout (token never formed) — regenerates it from the pot wallet. */
export function retryDevTip(signer: DevSigner, retryAt: number): Promise<DevTipsSummary> {
  return postDev("/dev/claim", signer, { retryAt });
}
