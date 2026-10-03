/**
 * Decide how (and whether) to surface a lobby invite this poll tick.
 * Claiming a notification id must only happen AFTER a real delivery path —
 * otherwise mid-race / background polls permanently burn the invite.
 */
export type LobbyInviteDelivery = "defer" | "os-notify" | "banner";

export function lobbyInviteDeliveryMode(opts: {
  racing: boolean;
  tabAway: boolean;
  canOsNotify: boolean;
}): LobbyInviteDelivery {
  // Still racing — leave unclaimed so the banner can fire after the race.
  if (opts.racing) return "defer";
  // Tab in background: OS ping only when permission is already granted.
  // If we cannot notify, defer so an in-page banner can show when focused.
  if (opts.tabAway) return opts.canOsNotify ? "os-notify" : "defer";
  return "banner";
}
