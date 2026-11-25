#!/usr/bin/env node
/**
 * Regression: mid-CREATE LOG OUT / openNostrModal must not burn the new nsec.
 *
 * Bug (PR159 residual): createInFlight disabled every create control, so Tab
 * left the dialog. Re-opening the identity chip switched to in-view (session
 * already live from createAccount). LOG OUT → clearPersisted wiped the only
 * copy of the nsec; handleCreateGo then skipped backup on pubkey mismatch.
 *
 * Fix (src/nostr/ui.ts):
 * - openNostrModal stays on create view while createInFlight
 * - LOG OUT click no-ops / button disabled while createInFlight
 * - session mismatch after create still paints closed-over nsec on backup
 *
 * Usage: node scripts/verify-create-mid-logout.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uiSrc = readFileSync(join(root, "src/nostr/ui.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function extractFunction(name) {
  const start = uiSrc.search(new RegExp(`(?:export )?(?:async )?function ${name}\\(`));
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = uiSrc.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < uiSrc.length; i++) {
    const ch = uiSrc[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return uiSrc.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${name}`);
}

const openModal = extractFunction("openNostrModal");
const handleCreateGo = extractFunction("handleCreateGo");
const setControls = extractFunction("setCreateControlsEnabled");

assert(
  /if \(createInFlight\) showView\("create"\)/.test(openModal),
  "openNostrModal must keep create view while createInFlight",
);

assert(
  /nostr-logout-btn[\s\S]*createInFlight/.test(uiSrc) ||
    /if \(createInFlight\) return/.test(
      uiSrc.slice(uiSrc.indexOf('nostr-logout-btn")?.addEventListener("click"')),
    ),
  "LOG OUT click must no-op while createInFlight",
);

assert(
  /logoutBtn\.disabled = !on/.test(setControls),
  "setCreateControlsEnabled must disable LOG OUT while creating",
);

assert(
  /getSession\(\)\?\.pubkey !== session\.pubkey[\s\S]*out\.value = nsec[\s\S]*showView\("backup"\)/.test(
    handleCreateGo,
  ),
  "handleCreateGo must still paint closed-over nsec when session was replaced",
);

/** Behavioral stand-in: mid-create logout must not leave the user without a backup key. */
function simulateMidCreateLogout() {
  let createInFlight = false;
  let storage = null;
  let session = null;
  let backup = "";
  let view = "create";

  function openNostrModal() {
    if (createInFlight) view = "create";
    else view = session ? "in" : "out";
  }

  function logout() {
    if (createInFlight) return; // gated
    storage = null;
    session = null;
    view = "out";
  }

  async function handleCreateGo() {
    if (createInFlight) return;
    createInFlight = true;
    try {
      const nsec = "nsec1_new";
      storage = { method: "local", nsec };
      session = { pubkey: "pub_new", method: "local" };
      // Mid-publish: chip reopen + LOG OUT attempt
      openNostrModal();
      logout();
      await Promise.resolve();
      if (!session || session.pubkey !== "pub_new") {
        backup = nsec; // closed-over recovery
        view = "backup";
        return;
      }
      backup = storage?.nsec || nsec;
      view = "backup";
    } finally {
      createInFlight = false;
    }
  }

  return handleCreateGo().then(() => {
    assert(view === "backup", `expected backup view, got ${view}`);
    assert(backup === "nsec1_new", `expected closed-over nsec on backup, got ${backup}`);
    assert(storage?.nsec === "nsec1_new", "gated logout must not clearPersisted mid-create");
  });
}

await simulateMidCreateLogout();
console.log("verify-create-mid-logout: ok");
