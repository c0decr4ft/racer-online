/**
 * Nostr login session — NIP-07 (browser extension), NIP-46 (remote signer),
 * or a locally generated key ("local" — created in-app).
 *
 * Persistence: NIP-07 stores just the pubkey (the extension holds the key);
 * NIP-46 stores the nbunksec session token; local accounts store the nsec
 * (a full secret — kept only in this browser's localStorage).
 */
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { ExtensionSigner, NostrConnectSigner, PrivateKeySigner } from "applesauce-signers";
import { DEFAULT_RELAYS } from "./relays";
import { SCORE_EVENT_KIND } from "./scores";

export type NostrMethod = "nip07" | "nip46" | "local";

export type NostrSession = {
  pubkey: string;
  method: NostrMethod;
  signer: ExtensionSigner | NostrConnectSigner | PrivateKeySigner;
};

const STORAGE_KEY = "racer-nostr-session-v1";

function signingPermissions(): string[] {
  // kind 0 = profile; kind 13 = NIP-17 seals; kind 30078 = leaderboard scores.
  // nip44_* so remote signers grant DM crypto once (not per message).
  return [
    ...NostrConnectSigner.buildSigningPermissions([0, 13, SCORE_EVENT_KIND]),
    "nip44_encrypt",
    "nip44_decrypt",
  ];
}

let current: NostrSession | null = null;
const listeners = new Set<(session: NostrSession | null) => void>();

export function getSession(): NostrSession | null {
  return current;
}

export function onSessionChange(cb: (session: NostrSession | null) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setSession(session: NostrSession | null) {
  current = session;
  for (const cb of listeners) cb(session);
}

function persist(raw: unknown) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  } catch {
    /* ignore */
  }
}

function readPersisted(): { method?: unknown; pubkey?: unknown; nbunksec?: unknown; nsec?: unknown } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

/** NIP-07 — sign in with a browser extension (Alby, nos2x, …). */
export async function loginWithExtension(): Promise<NostrSession> {
  const signer = new ExtensionSigner();
  const pubkey = await withTimeout(signer.getPublicKey(), 10_000, "Extension did not respond");
  persist({ method: "nip07", pubkey });
  const session: NostrSession = { pubkey, method: "nip07", signer };
  setSession(session);
  return session;
}

/**
 * Create a brand-new Nostr account in-app: generates a keypair locally and
 * signs in immediately. The returned nsec MUST be shown to the user for
 * backup — it is also persisted (this browser only) so login survives reloads.
 */
export function createAccount(): { session: NostrSession; nsec: string } {
  const secretKey = generateSecretKey();
  const signer = new PrivateKeySigner(secretKey);
  const pubkey = getPublicKey(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  persist({ method: "local", nsec });
  const session: NostrSession = { pubkey, method: "local", signer };
  setSession(session);
  return { session, nsec };
}

/** NIP-46 — paste a bunker:// URI from a remote signer. */
export async function loginWithBunker(uri: string): Promise<NostrSession> {
  let authOpened = false;
  const signer = await withTimeout(
    NostrConnectSigner.fromBunkerURI(uri.trim(), {
      permissions: signingPermissions(),
      onAuth: async (url: string) => {
        if (authOpened) return;
        authOpened = true;
        window.open(url, "sats-racer-auth", "width=420,height=640,noopener,noreferrer");
      },
    }),
    20_000,
    "Remote signer did not respond — check the bunker URI",
  );
  const pubkey = await withTimeout(signer.getPublicKey(), 10_000, "Remote signer did not respond");
  persist({ method: "nip46", nbunksec: signer.getNbunksec(), pubkey });
  const session: NostrSession = { pubkey, method: "nip46", signer };
  setSession(session);
  return session;
}

/**
 * NIP-46 QR / nostrconnect:// flow — we generate a URI, the remote signer
 * (Amber, nsec.app, …) connects to us. `wait` resolves once connected.
 */
export function startConnectLogin(): {
  uri: string;
  wait: Promise<NostrSession>;
  cancel: () => void;
} {
  const signer = new NostrConnectSigner({
    relays: DEFAULT_RELAYS,
    onAuth: async (url: string) => {
      window.open(url, "sats-racer-auth", "width=420,height=640,noopener,noreferrer");
    },
  });
  const uri = signer.getNostrConnectURI({
    name: "Sats Racer",
    url: location.origin,
    permissions: signingPermissions(),
  });
  const wait = (async () => {
    await withTimeout(signer.waitForSigner(), 180_000, "Timed out waiting for the remote signer");
    const pubkey = await withTimeout(signer.getPublicKey(), 10_000, "Remote signer did not respond");
    persist({ method: "nip46", nbunksec: signer.getNbunksec(), pubkey });
    const session: NostrSession = { pubkey, method: "nip46", signer };
    setSession(session);
    return session;
  })();
  return {
    uri,
    wait,
    cancel: () => {
      void signer.close().catch(() => undefined);
    },
  };
}

/** Restore a persisted session on boot without spamming extension/remote prompts. */
export async function restoreSession(): Promise<NostrSession | null> {
  if (current) return current;
  const saved = readPersisted();
  if (!saved) return null;
  try {
    if (saved.method === "nip07" && typeof saved.pubkey === "string") {
      // Use the cached pubkey only — never call window.nostr.getPublicKey() on boot.
      // That Alby/nos2x prompt (often labeled as Bitcoin + Nostr) froze cold loads.
      const signer = new ExtensionSigner();
      (signer as unknown as { pubkey?: string }).pubkey = saved.pubkey;
      const session: NostrSession = { pubkey: saved.pubkey, method: "nip07", signer };
      setSession(session);
      return session;
    }
    if (saved.method === "local" && typeof saved.nsec === "string") {
      const decoded = nip19.decode(saved.nsec);
      if (decoded.type !== "nsec") throw new Error("not an nsec");
      const signer = new PrivateKeySigner(decoded.data);
      const pubkey = await signer.getPublicKey();
      const session: NostrSession = { pubkey, method: "local", signer };
      setSession(session);
      return session;
    }
    if (saved.method === "nip46" && typeof saved.nbunksec === "string") {
      // Do NOT auto-connect bunkers on boot — fromNbunksec() calls connect() and
      // may open many auth windows. User reconnects via Sign In when needed.
      return null;
    }
  } catch {
    clearPersisted();
  }
  return null;
}

/**
 * Activate a live remote (NIP-46) session after an explicit user gesture.
 * Call from Sign In — never from page load.
 */
export async function reconnectRemoteSession(): Promise<NostrSession | null> {
  const saved = readPersisted();
  if (!saved || saved.method !== "nip46" || typeof saved.nbunksec !== "string") return null;
  try {
    let authOpened = false;
    const signer = await withTimeout(
      NostrConnectSigner.fromNbunksec(saved.nbunksec, {
        permissions: signingPermissions(),
        onAuth: async (url: string) => {
          if (authOpened) return;
          authOpened = true;
          window.open(url, "sats-racer-auth", "width=420,height=640,noopener,noreferrer");
        },
      }),
      15_000,
      "stored session unreadable",
    );
    const pubkey = await withTimeout(signer.getPublicKey(), 12_000, "remote signer unreachable");
    persist({ method: "nip46", nbunksec: signer.getNbunksec(), pubkey });
    const session: NostrSession = { pubkey, method: "nip46", signer };
    setSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const session = current;
  clearPersisted();
  setSession(null);
  if (session?.method === "nip46") {
    await (session.signer as NostrConnectSigner).logout().catch(() => undefined);
  }
}

/** The stored nsec for locally created accounts (never for extension/remote sessions). */
export function getLocalSecret(): string | null {
  if (current?.method !== "local") return null;
  const saved = readPersisted();
  return typeof saved?.nsec === "string" ? saved.nsec : null;
}
