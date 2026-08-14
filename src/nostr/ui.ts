/**
 * Nostr login modal + home-screen chip.
 *
 * `ensureNostrLogin(reason)` is the main entry point for gating features:
 * resolves with the active session (existing or freshly logged-in), or null
 * when the user cancels.
 */
import QRCode from "qrcode";
import {
  createAccount,
  getLocalSecret,
  getSession,
  loginWithBunker,
  loginWithExtension,
  logout,
  onSessionChange,
  startConnectLogin,
  type NostrSession,
} from "./session";
import { fetchProfile, profileLabel, publishProfileName, shortNpub, type NostrProfile } from "./profile";

let currentProfile: NostrProfile | null = null;
export function getCurrentProfile(): NostrProfile | null {
  return currentProfile;
}

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function showStatus(text: string, isError = false) {
  const status = el<HTMLParagraphElement>("nostr-login-status");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("nostr-error", isError);
  status.classList.toggle("hidden", !text);
}

let connectCancel: (() => void) | null = null;
let pendingResolver: ((session: NostrSession | null) => void) | null = null;

function resolvePending(session: NostrSession | null) {
  const resolver = pendingResolver;
  pendingResolver = null;
  resolver?.(session);
}

async function refreshIdentityViews() {
  const session = getSession();
  const chip = el<HTMLButtonElement>("nostr-btn");
  const chipLabel = el<HTMLSpanElement>("nostr-btn-label");
  if (chipLabel) chipLabel.textContent = session ? "RACER ID" : "SIGN IN";
  chip?.classList.toggle("is-signed-in", !!session);

  if (!session) {
    currentProfile = null;
    return;
  }

  // Fill identity synchronously from the session; refine once the profile lands.
  const nameEl = el<HTMLParagraphElement>("nostr-display-name");
  if (nameEl) nameEl.textContent = currentProfile?.displayName || currentProfile?.name || "NOSTR RACER";
  const npub = el<HTMLParagraphElement>("nostr-npub");
  if (npub) npub.textContent = shortNpub(session.pubkey);

  const profile = await fetchProfile(session.pubkey);
  if (getSession()?.pubkey !== session.pubkey) return; // logged out / switched mid-fetch
  currentProfile = profile;
  // Profile-less accounts: friendly placeholder instead of duplicating the npub.
  const displayName = profile?.displayName || profile?.name || "NOSTR RACER";
  if (chipLabel) chipLabel.textContent = profileLabel(session.pubkey, profile).toUpperCase().slice(0, 16);
  if (nameEl) nameEl.textContent = displayName;
  // Local accounts get a backup-key reveal (extension/remote sessions hold no secret here)
  el<HTMLDivElement>("nostr-backup-box")?.classList.toggle("hidden", session.method !== "local");
  const avatar = el<HTMLImageElement>("nostr-avatar");
  if (avatar) {
    if (profile?.picture) {
      avatar.src = profile.picture;
      avatar.classList.remove("hidden");
    } else {
      avatar.classList.add("hidden");
    }
  }
}

type NostrView = "out" | "in" | "create" | "backup";

function showView(view: NostrView) {
  el<HTMLDivElement>("nostr-out-view")?.classList.toggle("hidden", view !== "out");
  el<HTMLDivElement>("nostr-in-view")?.classList.toggle("hidden", view !== "in");
  el<HTMLDivElement>("nostr-create-view")?.classList.toggle("hidden", view !== "create");
  el<HTMLDivElement>("nostr-backup-view")?.classList.toggle("hidden", view !== "backup");
}

export function closeNostrModal() {
  connectCancel?.();
  connectCancel = null;
  el<HTMLDivElement>("nostr-login")?.classList.add("hidden");
  resolvePending(null);
}

export function openNostrModal(reason?: string) {
  const modal = el<HTMLDivElement>("nostr-login");
  if (!modal) return;
  const reasonEl = el<HTMLParagraphElement>("nostr-reason");
  if (reasonEl) {
    reasonEl.textContent = reason ?? "";
    reasonEl.classList.toggle("hidden", !reason);
  }
  showStatus("");
  showView(getSession() ? "in" : "out");
  void refreshIdentityViews();
  modal.classList.remove("hidden");
}

/**
 * Resolve with the active Nostr session — opens the login modal when signed
 * out; resolves null if the user cancels.
 */
export function ensureNostrLogin(reason: string): Promise<NostrSession | null> {
  const session = getSession();
  if (session) return Promise.resolve(session);
  return new Promise((resolve) => {
    pendingResolver = resolve;
    openNostrModal(reason);
  });
}

function onLoginSuccess(session: NostrSession) {
  showStatus("");
  el<HTMLDivElement>("nostr-login")?.classList.add("hidden");
  void refreshIdentityViews();
  resolvePending(session);
}

async function handleExtensionLogin() {
  showStatus("Contacting extension…");
  try {
    const session = await loginWithExtension();
    onLoginSuccess(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showStatus(
      /missing|no extension|not found/i.test(message)
        ? "No Nostr extension found — install Alby or nos2x, then retry"
        : `Extension login failed — ${message}`,
      true,
    );
  }
}

async function handleBunkerLogin() {
  const input = el<HTMLInputElement>("nostr-bunker-input");
  const uri = input?.value.trim() ?? "";
  if (!uri.startsWith("bunker://")) {
    showStatus("Paste a bunker:// URI from your remote signer", true);
    input?.focus();
    return;
  }
  showStatus("Connecting to remote signer…");
  try {
    const session = await loginWithBunker(uri);
    onLoginSuccess(session);
  } catch (err) {
    showStatus(`Connection failed — ${err instanceof Error ? err.message : String(err)}`, true);
  }
}

function handleQrFlow() {
  const box = el<HTMLDivElement>("nostr-qr-box");
  if (!box) return;
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
    connectCancel?.();
    connectCancel = null;
    return;
  }
  box.classList.remove("hidden");
  showStatus("Waiting for remote signer… scan the QR or open the link");
  const { uri, wait, cancel } = startConnectLogin();
  connectCancel = cancel;
  const img = el<HTMLImageElement>("nostr-qr-img");
  if (img) {
    void QRCode.toDataURL(uri, { width: 224, margin: 1 })
      .then((dataUrl) => {
        img.src = dataUrl;
      })
      .catch(() => undefined);
  }
  const uriInput = el<HTMLInputElement>("nostr-connect-uri");
  if (uriInput) uriInput.value = uri;
  wait.then(onLoginSuccess).catch((err) => {
    connectCancel = null;
    showStatus(`QR login failed — ${err instanceof Error ? err.message : String(err)}`, true);
  });
}

/** Expand/collapse the remote-signer sub-panel (bunker URI + QR). */
function handleRemoteToggle() {
  const box = el<HTMLDivElement>("nostr-remote-box");
  const toggle = el<HTMLButtonElement>("nostr-remote-toggle");
  if (!box || !toggle) return;
  const open = box.classList.toggle("hidden");
  toggle.setAttribute("aria-expanded", String(!open));
  if (open) {
    // Collapsing also stops any pending QR wait
    connectCancel?.();
    connectCancel = null;
    el<HTMLDivElement>("nostr-qr-box")?.classList.add("hidden");
  }
}

/** Username step → create the account, publish the name, show key backup. */
async function handleCreateGo() {
  const input = el<HTMLInputElement>("nostr-username");
  const status = el<HTMLParagraphElement>("nostr-create-status");
  const name = (input?.value ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
  const setStatus = (text: string, isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("nostr-error", isError);
    status.classList.toggle("hidden", !text);
  };
  if (!name) {
    setStatus("Pick a username first", true);
    input?.focus();
    return;
  }
  setStatus("Generating your keys…");
  const { session, nsec } = createAccount();
  setStatus("Publishing your profile…");
  try {
    await publishProfileName(session.signer, name);
  } catch {
    /* name publish is best-effort — the account still works */
  }
  const out = el<HTMLInputElement>("nostr-nsec-out");
  if (out) out.value = nsec;
  setStatus("");
  showView("backup");
  void refreshIdentityViews();
}

async function handleCopyNsec(e: MouseEvent) {
  const btn = e.currentTarget as HTMLButtonElement;
  const input = el<HTMLInputElement>("nostr-nsec-out");
  const value = input?.value ?? "";
  try {
    await navigator.clipboard.writeText(value);
    btn.textContent = "COPIED ✓";
  } catch {
    input?.select();
    btn.textContent = "SELECT + COPY";
  }
  setTimeout(() => {
    btn.textContent = "COPY KEY";
  }, 1500);
}

/** Bind all Nostr UI events once at boot. */
export function initNostrUi() {
  el<HTMLButtonElement>("nostr-btn")?.addEventListener("click", () => openNostrModal());
  el<HTMLButtonElement>("nostr-ext-btn")?.addEventListener("click", () => void handleExtensionLogin());
  el<HTMLButtonElement>("nostr-bunker-btn")?.addEventListener("click", () => void handleBunkerLogin());
  el<HTMLInputElement>("nostr-bunker-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleBunkerLogin();
    }
  });
  el<HTMLButtonElement>("nostr-remote-toggle")?.addEventListener("click", handleRemoteToggle);
  el<HTMLButtonElement>("nostr-qr-toggle")?.addEventListener("click", handleQrFlow);
  el<HTMLButtonElement>("nostr-create-btn")?.addEventListener("click", () => {
    showView("create");
    el<HTMLInputElement>("nostr-username")?.focus();
  });
  el<HTMLButtonElement>("nostr-create-go")?.addEventListener("click", () => void handleCreateGo());
  el<HTMLInputElement>("nostr-username")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleCreateGo();
    }
  });
  el<HTMLButtonElement>("nostr-create-back")?.addEventListener("click", () => showView("out"));
  el<HTMLButtonElement>("nostr-backup-toggle")?.addEventListener("click", () => {
    const secret = el<HTMLDivElement>("nostr-backup-secret");
    const input = el<HTMLInputElement>("nostr-backup-nsec");
    if (!secret || !input) return;
    const opening = secret.classList.contains("hidden");
    if (opening) input.value = getLocalSecret() ?? "";
    else input.value = "";
    secret.classList.toggle("hidden", !opening);
    el<HTMLButtonElement>("nostr-backup-toggle")!.textContent = opening ? "HIDE BACKUP KEY" : "SHOW BACKUP KEY";
  });
  el<HTMLButtonElement>("nostr-nsec-copy")?.addEventListener("click", (e) => void handleCopyNsec(e));
  el<HTMLButtonElement>("nostr-new-done")?.addEventListener("click", () => {
    const session = getSession();
    if (session) onLoginSuccess(session);
    else closeNostrModal();
  });
  el<HTMLButtonElement>("nostr-login-cancel")?.addEventListener("click", closeNostrModal);
  el<HTMLButtonElement>("nostr-in-close")?.addEventListener("click", closeNostrModal);
  el<HTMLButtonElement>("nostr-logout-btn")?.addEventListener("click", () => {
    void logout().then(() => {
      showView("out");
      void refreshIdentityViews();
    });
  });
  onSessionChange(() => void refreshIdentityViews());
}
