/**
 * OS / browser notifications for lobby invites when the game tab is in the background.
 * Requires a prior user gesture to grant permission (Friends / Multiplayer click).
 */

const askedKey = "racer-notify-asked-v1";

export function browserNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Ask once after a user gesture (opening Friends / Multiplayer). */
export function ensureBrowserNotifyPermission(): void {
  if (!browserNotifySupported()) return;
  if (Notification.permission !== "default") return;
  try {
    if (sessionStorage.getItem(askedKey) === "1") return;
    sessionStorage.setItem(askedKey, "1");
  } catch {
    /* private mode */
  }
  void Notification.requestPermission().catch(() => undefined);
}

export function notifyLobbyInvite(opts: {
  who: string;
  room: string;
  tag: string;
}): void {
  if (!browserNotifySupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification("SATS RACER — Lobby invite", {
      body: `${opts.who} invited you to ${opts.room}`,
      tag: opts.tag,
      requireInteraction: true,
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();
    };
  } catch {
    /* Safari / blocked */
  }
}
