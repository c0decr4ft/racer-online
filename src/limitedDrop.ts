/**
 * Limited-time home drop — toggle by editing startsAt / endsAt.
 * When live, a sixth home button appears and launches the featured circuit.
 * Ask to open/close a window anytime; dates are UTC ISO strings.
 */
export const LIMITED_DROP_TRACK_ID = "nurburgring";

export type LimitedDropConfig = {
  /** Home menu button label */
  buttonLabel: string;
  /** Short flash line under the button while live */
  tagline: string;
  trackId: string;
  /** Inclusive start (ISO UTC). */
  startsAt: string;
  /** Exclusive end (ISO UTC). After this the button hides. */
  endsAt: string;
};

/**
 * GREEN HELL — Jackie Stewart’s nickname for the Nordschleife.
 * Currently live ~1 month; change the window whenever we run another drop.
 */
export const LIMITED_DROP: LimitedDropConfig = {
  buttonLabel: "GREEN HELL",
  tagline: "Limited Nürburgring GP drop",
  trackId: LIMITED_DROP_TRACK_ID,
  startsAt: "2026-09-20T00:00:00.000Z",
  endsAt: "2026-10-20T00:00:00.000Z",
};

export function isLimitedDropLive(now = Date.now()): boolean {
  const start = Date.parse(LIMITED_DROP.startsAt);
  const end = Date.parse(LIMITED_DROP.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  return now >= start && now < end;
}

export function limitedDropMsRemaining(now = Date.now()): number {
  if (!isLimitedDropLive(now)) return 0;
  return Math.max(0, Date.parse(LIMITED_DROP.endsAt) - now);
}

/** Human countdown for the home hint (e.g. "12d left"). */
export function limitedDropCountdownLabel(now = Date.now()): string {
  const ms = limitedDropMsRemaining(now);
  if (ms <= 0) return "";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days >= 2) return `${days}d left`;
  if (days === 1) return hours > 0 ? `1d ${hours}h left` : "1d left";
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins}m left`;
}
