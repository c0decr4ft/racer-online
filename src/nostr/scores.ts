/**
 * Signed leaderboard score events (Nostr).
 *
 * Kind 30078 is parameterized-replaceable: the `d` tag pins one event per
 * player per track, so republishing a faster time replaces the old one on
 * relays. Servers/blobs store the raw event; readers verify the signature.
 */
import { verifyEvent } from "nostr-tools";
import { DEFAULT_RELAYS, pool } from "./relays";

export const SCORE_EVENT_KIND = 30078;
export const SCORE_D_PREFIX = "racer-online:";
/** Plausibility window for a race total — keeps junk / e2e spam off the board. */
export const MIN_TIME_MS = 15_000;
export const MAX_TIME_MS = 3_600_000;

export type ScoreEventTemplate = {
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
};

export type VerifiedScore = {
  pubkey: string;
  eventId: string;
  at: number; // ms
  name: string;
  timeMs: number;
  bestLapMs?: number;
  trackId: string;
};

export function scoreEventTemplate(data: {
  name: string;
  timeMs: number;
  bestLapMs?: number;
  trackId: string;
}): ScoreEventTemplate {
  const timeMs = Math.round(data.timeMs);
  const bestLapMs =
    data.bestLapMs != null && Number.isFinite(data.bestLapMs) && data.bestLapMs > 0
      ? Math.round(data.bestLapMs)
      : undefined;
  const tags: string[][] = [
    ["d", SCORE_D_PREFIX + data.trackId],
    ["t", "racer-online"],
    ["track", data.trackId],
    ["time_ms", String(timeMs)],
  ];
  if (bestLapMs != null) tags.push(["best_lap_ms", String(bestLapMs)]);
  return {
    kind: SCORE_EVENT_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({
      name: data.name,
      timeMs,
      bestLapMs: bestLapMs ?? null,
      trackId: data.trackId,
    }),
    tags,
  };
}

type NostrEventLike = {
  id?: unknown;
  pubkey?: unknown;
  kind?: unknown;
  created_at?: unknown;
  content?: unknown;
  tags?: unknown;
  sig?: unknown;
};

/**
 * Validate shape + schnorr signature of a score event.
 * Returns the parsed score, or null when anything is off.
 */
export function verifyScoreEvent(event: NostrEventLike, expectedTrackId?: string): VerifiedScore | null {
  if (!event || typeof event !== "object") return null;
  if (event.kind !== SCORE_EVENT_KIND) return null;
  if (typeof event.pubkey !== "string" || !/^[0-9a-f]{64}$/.test(event.pubkey)) return null;
  const tags = Array.isArray(event.tags) ? (event.tags as string[][]) : [];
  const d = tags.find((t) => Array.isArray(t) && t[0] === "d")?.[1] ?? "";
  if (!d.startsWith(SCORE_D_PREFIX)) return null;
  const trackId = d.slice(SCORE_D_PREFIX.length);
  if (expectedTrackId && trackId !== expectedTrackId) return null;

  let content: { name?: unknown; timeMs?: unknown; bestLapMs?: unknown };
  try {
    content = JSON.parse(typeof event.content === "string" ? event.content : "{}");
  } catch {
    return null;
  }
  const timeMs = Math.round(Number(content.timeMs));
  if (!Number.isFinite(timeMs) || timeMs < MIN_TIME_MS || timeMs > MAX_TIME_MS) return null;
  const createdAt = Number(event.created_at);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;

  try {
    if (!verifyEvent(event as Parameters<typeof verifyEvent>[0])) return null;
  } catch {
    return null;
  }

  const bestRaw = content.bestLapMs != null ? Math.round(Number(content.bestLapMs)) : undefined;
  return {
    pubkey: event.pubkey,
    eventId: typeof event.id === "string" ? event.id : "",
    at: createdAt * 1000,
    name: typeof content.name === "string" ? content.name : "",
    timeMs,
    bestLapMs: bestRaw != null && Number.isFinite(bestRaw) && bestRaw > 0 ? bestRaw : undefined,
    trackId,
  };
}

/** Best-effort publish of a signed score event to the public relays. */
export async function publishScoreEvent(event: Parameters<typeof pool.publish>[1]): Promise<void> {
  try {
    await pool.publish(DEFAULT_RELAYS, event);
  } catch {
    /* best-effort — the game server/blob remain the board's sources */
  }
}
