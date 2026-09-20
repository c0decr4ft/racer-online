/**
 * Regression: lobby invite delivery must not claim ids before a real surface.
 * Mirrors src/social/lobbyInviteDelivery.ts — keep in sync.
 * Run: node scripts/verify-lobby-invite-delivery.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {"defer" | "os-notify" | "banner"} LobbyInviteDelivery */

/**
 * @param {{ racing: boolean, tabAway: boolean, canOsNotify: boolean }} opts
 * @returns {LobbyInviteDelivery}
 */
function lobbyInviteDeliveryMode(opts) {
  if (opts.racing) return "defer";
  if (opts.tabAway) return opts.canOsNotify ? "os-notify" : "defer";
  return "banner";
}

{
  assert.equal(
    lobbyInviteDeliveryMode({ racing: true, tabAway: false, canOsNotify: true }),
    "defer",
    "mid-race must defer (do not burn claim)",
  );
  assert.equal(
    lobbyInviteDeliveryMode({ racing: true, tabAway: true, canOsNotify: true }),
    "defer",
    "mid-race wins over tab-away",
  );
}

{
  assert.equal(
    lobbyInviteDeliveryMode({ racing: false, tabAway: true, canOsNotify: false }),
    "defer",
    "background without OS permission must defer for later banner",
  );
  assert.equal(
    lobbyInviteDeliveryMode({ racing: false, tabAway: true, canOsNotify: true }),
    "os-notify",
    "background with permission → OS notify",
  );
}

{
  assert.equal(
    lobbyInviteDeliveryMode({ racing: false, tabAway: false, canOsNotify: false }),
    "banner",
    "focused + not racing → in-page banner",
  );
}

// Source must still defer before claiming (guards against regressing the poll loop).
const here = dirname(fileURLToPath(import.meta.url));
const ui = readFileSync(join(here, "../src/social/ui.ts"), "utf8");
assert.match(ui, /lobbyInviteDeliveryMode/);
assert.match(ui, /mode === "defer"/);
assert.doesNotMatch(
  ui,
  /if \(!claimNotification\(session\.pubkey, notifId\)\) continue;\s*\n\s*const who/,
  "must not claim lobby: id before delivery mode is chosen",
);

console.log("verify-lobby-invite-delivery: ok");
