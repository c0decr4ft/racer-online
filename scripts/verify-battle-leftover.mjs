/**
 * Locks Event Battle leftover tip-collection control flow.
 * Run: node scripts/verify-battle-leftover.mjs
 */
import { nextBattleLeftoverAction } from "../server/battleLeftover.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Already done.
assert(
  nextBattleLeftoverAction({ collected: true, wanted: 50, pendingToken: false, tipCap: 50 }) === "noop",
  "collected → noop",
);

// Nothing left.
assert(
  nextBattleLeftoverAction({ collected: false, wanted: 0, pendingToken: false, tipCap: 0 }) ===
    "mark-collected",
  "wanted 0 → mark-collected",
);

// Pending bearer token must redeem — never fall through to a fresh pot draw.
assert(
  nextBattleLeftoverAction({ collected: false, wanted: 50, pendingToken: true, tipCap: 0 }) ===
    "redeem-token",
  "pending token + tipCap 0 → redeem-token (not collect-fresh / mark-collected)",
);
assert(
  nextBattleLeftoverAction({ collected: false, wanted: 50, pendingToken: true, tipCap: 50 }) ===
    "redeem-token",
  "pending token even when tipCap>0 → redeem-token only",
);

// Transient empty balance must wait, not permanently abandon leftover.
assert(
  nextBattleLeftoverAction({ collected: false, wanted: 50, pendingToken: false, tipCap: 0 }) === "wait",
  "tipCap 0 without token → wait (retry later)",
);

// Normal path.
assert(
  nextBattleLeftoverAction({ collected: false, wanted: 50, pendingToken: false, tipCap: 40 }) ===
    "collect-fresh",
  "tipCap>0 → collect-fresh",
);

console.log("verify-battle-leftover: ok");
