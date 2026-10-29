/**
 * Regression: a late Amber / NIP-46 QR approval must not overwrite a session
 * committed by CREATE ACCOUNT (or extension / bunker) while the QR wait was
 * still outstanding — that wiped `racer-nostr-session-v1` and burned the local nsec.
 *
 * Mirrors the loginGeneration gate in src/nostr/session.ts `startConnectLogin`.
 *
 * Usage: node scripts/verify-amber-qr-session-race.mjs
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
assert(
  /generationAtStart !== loginGeneration/.test(sessionSrc),
  "startConnectLogin must refuse persist when loginGeneration advanced",
);
assert(/cancelled = true;\s*\n\s*bumpLoginGeneration\(\);/.test(sessionSrc), "startConnectLogin cancel must set cancelled and bump generation");

assert(/function cancelConnectWait/.test(uiSrc), "ui.ts must cancelConnectWait");
assert(
  /cancelConnectWait\(\)/.test(uiSrc.split("async function handleCreateGo")[1]?.slice(0, 800) ?? ""),
  "handleCreateGo must cancelConnectWait before createAccount",
);
assert(
  /cancelConnectWait\(\)/.test(uiSrc.split("function onLoginSuccess")[1]?.slice(0, 300) ?? ""),
  "onLoginSuccess must cancelConnectWait",
);

/** Behavioral stand-in for the generation gate (no Amber / network). */
function simulateConnectRace({ createBeforeCommit }) {
  let loginGeneration = 0;
  let stored = null;
  const bump = () => {
    loginGeneration += 1;
    return loginGeneration;
  };

  const generationAtStart = loginGeneration;
  let cancelled = false;

  // User showed QR — wait is outstanding.
  const cancel = () => {
    cancelled = true;
    bump();
  };

  if (createBeforeCommit) {
    // CREATE ACCOUNT (and UI cancel) while Amber has not yet approved.
    cancel();
    bump(); // createAccount
    stored = { method: "local", nsec: "nsec1local-secret" };
  }

  // Late Amber approval attempts to commit.
  const canCommit = !cancelled && generationAtStart === loginGeneration;
  if (canCommit) {
    bump();
    stored = { method: "nip46", nbunksec: "nbunk1late-amber" };
  }

  return stored;
}

const wiped = simulateConnectRace({ createBeforeCommit: false });
assert(wiped?.method === "nip46", "Amber-only path still commits nip46");

const kept = simulateConnectRace({ createBeforeCommit: true });
assert(kept?.method === "local", "local nsec must survive late Amber approval");
assert(kept?.nsec === "nsec1local-secret", "local nsec value must be unchanged");
assert(kept?.method !== "nip46", "late Amber must not overwrite local session");

console.log("verify-amber-qr-session-race: ok");
