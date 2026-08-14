/** Kind-0 profile lookup + display helpers. */
import { nip19 } from "nostr-tools";
import { DEFAULT_RELAYS, pool } from "./relays";

export type NostrProfile = {
  name?: string;
  displayName?: string;
  picture?: string;
  nip05?: string;
};

const cache = new Map<string, NostrProfile | null>();

function parseProfileContent(raw: string): NostrProfile | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const displayName =
      typeof data.display_name === "string"
        ? data.display_name.trim()
        : typeof data.displayName === "string"
          ? data.displayName.trim()
          : "";
    const picture = typeof data.picture === "string" ? data.picture.trim() : "";
    const nip05 = typeof data.nip05 === "string" ? data.nip05.trim() : "";
    const profile: NostrProfile = {};
    if (name) profile.name = name;
    if (displayName) profile.displayName = displayName;
    if (picture && /^https:\/\//.test(picture)) profile.picture = picture;
    if (nip05) profile.nip05 = nip05;
    return profile;
  } catch {
    return null;
  }
}

/** Fetch the newest kind-0 metadata for a pubkey; null when nothing found. */
export function fetchProfile(pubkey: string, timeoutMs = 6_000): Promise<NostrProfile | null> {
  const cached = cache.get(pubkey);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve) => {
    let newest: { created_at: number; content: string } | null = null;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        sub.unsubscribe();
      } catch {
        /* ignore */
      }
      const profile = newest ? parseProfileContent(newest.content) : null;
      cache.set(pubkey, profile);
      resolve(profile);
    };
    const sub = pool.request(DEFAULT_RELAYS, { kinds: [0], authors: [pubkey] }).subscribe({
      next: (event) => {
        if (!newest || event.created_at > newest.created_at) newest = event;
      },
      complete: finish,
      error: finish,
    });
    setTimeout(finish, timeoutMs);
  });
}

export function shortNpub(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 12)}…${npub.slice(-4)}`;
  } catch {
    return `${pubkey.slice(0, 12)}…`;
  }
}

/** Human label for UI/leaderboards: display name → name → short npub. */
export function profileLabel(pubkey: string, profile: NostrProfile | null | undefined): string {
  return profile?.displayName || profile?.name || shortNpub(pubkey);
}

/**
 * Publish a kind-0 profile with the chosen name (used right after account
 * creation) and prime the local cache so the UI shows it immediately.
 */
export async function publishProfileName(
  signer: { signEvent: (template: { kind: number; created_at: number; content: string; tags: string[][] }) => Promise<unknown> },
  name: string,
): Promise<void> {
  const event = (await signer.signEvent({
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({ name, display_name: name }),
    tags: [],
  })) as Parameters<typeof pool.publish>[1];
  try {
    // Relay acks can be slow — never let them stall account creation.
    await Promise.race([pool.publish(DEFAULT_RELAYS, event), new Promise((r) => setTimeout(r, 4_000))]);
  } catch {
    /* best-effort — relays can be re-published to later */
  }
  if (typeof event.pubkey === "string") {
    cache.set(event.pubkey, { name, displayName: name });
  }
}
