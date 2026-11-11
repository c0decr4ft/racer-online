/**
 * Regression: a late Amber QR / bunker / extension approval must not overwrite
 * a session committed by CREATE ACCOUNT while that async login was still
 * outstanding — that wiped `racer-nostr-session-v1` and burned the local nsec.
 *
 * Mirrors the loginGeneration gates in src/nostr/session.ts for
 * `startConnectLogin`, `loginWithBunker`, and `loginWithExtension`.
 *
 * Usage: node scripts/verify-login-session-race.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sessionSrc = readFileSync(join(ROOT, "src/nostr/session.ts"), "utf8");
const uiSrc = readFileSync(join(ROOT, "src/nostr/ui.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(/let loginGeneration = 0/.test(sessionSrc), "session.ts must track loginGeneration");
assert(/function bumpLoginGeneration/.test(sessionSrc), "session.ts must bumpLoginGeneration");
assert(
  /bumpLoginGeneration\(\)/.test(sessionSrc.split("export function createAccount")[1] ?? ""),
  "createAccount must bumpLoginGeneration before persist",
);

const extensionFn = sessionSrc.split("export async function loginWithExtension")[1] ?? "";
assert(
  /generationAtStart !== loginGeneration/.test(extensionFn.split("export function createAccount")[0] ?? ""),
  "loginWithExtension must refuse persist when loginGeneration advanced",
);

const bunkerFn = sessionSrc.split("export async function loginWithBunker")[1] ?? "";
assert(
  /generationAtStart !== loginGeneration/.test(bunkerFn.split("export function startConnectLogin")[0] ?? ""),
  "loginWithBunker must refuse persist when loginGeneration advanced",
);

assert(
  /generationAtStart !== loginGeneration/.test(sessionSrc),
  "startConnectLogin must refuse persist when loginGeneration advanced",
);
assert(
  /cancelled = true;\s*\n\s*bumpLoginGeneration\(\);/.test(sessionSrc),
  "startConnectLogin cancel must set cancelled and bump generation",
);

assert(/function cancelConnectWait/.test(uiSrc), "ui.ts must cancelConnectWait");
assert(
  /cancelConnectWait\(\)/.test(uiSrc.split("async function handleCreateGo")[1]?.slice(0, 900) ?? ""),
  "handleCreateGo must cancelConnectWait before createAccount",
);
assert(
  /cancelConnectWait\(\)/.test(uiSrc.split("function onLoginSuccess")[1]?.slice(0, 300) ?? ""),
  "onLoginSuccess must cancelConnectWait",
);
assert(
  /closed\|abort\|cancel/i.test(uiSrc.split("async function handleBunkerLogin")[1]?.slice(0, 1200) ?? ""),
  "handleBunkerLogin must swallow cancelled errors after CREATE ACCOUNT wins",
);
assert(
  /closed\|abort\|cancel/i.test(uiSrc.split("async function handleExtensionLogin")[1]?.slice(0, 900) ?? ""),
  "handleExtensionLogin must swallow cancelled errors after CREATE ACCOUNT wins",
);

/** Behavioral stand-in for an async login that captures generation at start. */
function simulateAsyncLoginRace({ createBeforeCommit, path }) {
  let loginGeneration = 0;
  let stored = null;
  const bump = () => {
    loginGeneration += 1;
    return loginGeneration;
  };

  const generationAtStart = loginGeneration;
  let cancelled = false;

  const cancelQr = () => {
    cancelled = true;
    bump();
  };

  if (createBeforeCommit) {
    // CREATE ACCOUNT (and UI cancel of QR) while remote/extension has not yet approved.
    if (path === "qr") cancelQr();
    bump(); // createAccount
    stored = { method: "local", nsec: "nsec1local-secret" };
  }

  // Late approval attempts to commit.
  const canCommit =
    path === "qr"
      ? !cancelled && generationAtStart === loginGeneration
      : generationAtStart === loginGeneration;
  if (canCommit) {
    bump();
    stored =
      path === "extension"
        ? { method: "nip07", pubkey: "hexpubkey" }
        : { method: "nip46", nbunksec: "nbunk1late-amber" };
  }

  return stored;
}

for (const path of ["qr", "bunker", "extension"]) {
  const alone = simulateAsyncLoginRace({ createBeforeCommit: false, path });
  assert(
    alone?.method === (path === "extension" ? "nip07" : "nip46"),
    `${path}-only path still commits`,
  );

  const kept = simulateAsyncLoginRace({ createBeforeCommit: true, path });
  assert(kept?.method === "local", `local nsec must survive late ${path} approval`);
  assert(kept?.nsec === "nsec1local-secret", `local nsec value must be unchanged after late ${path}`);
  assert(kept?.method !== "nip46" && kept?.method !== "nip07", `late ${path} must not overwrite local session`);
}

console.log("verify-login-session-race: ok");
