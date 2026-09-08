/**
 * Event Battle: departed mid-race hauls must not lock as dead claimable.
 * Run: node scripts/verify-battle-leave-haul.mjs
 */
import {
  buildDroppedBattleCubes,
  lockBattleClaimShares,
} from "../shared/battleCubes.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Present player keeps their haul; untaken cubes + gap → leftover.
{
  const locked = lockBattleClaimShares({
    potSats: 100,
    earnings: new Map([
      ["a", 40],
      ["b", 35],
    ]),
    cubes: [
      { id: 0, sats: 25, takenBy: "" },
      { id: 1, sats: 40, takenBy: "a" },
      { id: 2, sats: 35, takenBy: "b" },
    ],
    presentIds: new Set(["a", "b"]),
  });
  assert(locked.claimable.get("a") === 40, "a claimable");
  assert(locked.claimable.get("b") === 35, "b claimable");
  assert(locked.leftoverSats === 25, `leftover=${locked.leftoverSats}`);
  assert(locked.stranded === 0, "no stranded");
  assert(locked.collected + locked.leftoverSats === 100, "pot seals");
}

// Departed mid-race haul (still marked taken on old cubes) → leftover, not claimable.
{
  const locked = lockBattleClaimShares({
    potSats: 100,
    earnings: new Map([
      ["gone", 60],
      ["alive", 20],
    ]),
    cubes: [
      { id: 0, sats: 20, takenBy: "" },
      { id: 1, sats: 60, takenBy: "gone" },
      { id: 2, sats: 20, takenBy: "alive" },
    ],
    presentIds: new Set(["alive"]),
  });
  assert(!locked.claimable.has("gone"), "departed must not be claimable");
  assert(locked.claimable.get("alive") === 20, "alive claimable");
  assert(locked.stranded === 60, `stranded=${locked.stranded}`);
  assert(locked.leftoverSats === 80, `leftover=${locked.leftoverSats} (untaken 20 + stranded 60)`);
  assert(locked.collected + locked.leftoverSats === 100, "pot seals after leave");
}

// After dropBattleHaulOnWreck-style spill: earnings zeroed, new untaken cubes.
{
  const haul = 60;
  const dropped = buildDroppedBattleCubes("forest-loop", haul, 0, 0, "seed", 10);
  const droppedSum = dropped.reduce((a, c) => a + c.sats, 0);
  assert(droppedSum === haul, `dropped sum ${droppedSum} !== ${haul}`);
  const locked = lockBattleClaimShares({
    potSats: 100,
    earnings: new Map([
      ["gone", 0],
      ["alive", 20],
    ]),
    cubes: [
      { id: 0, sats: 20, takenBy: "" },
      { id: 1, sats: 60, takenBy: "gone" }, // old taken markers ignored for leftover
      { id: 2, sats: 20, takenBy: "alive" },
      ...dropped.map((c) => ({ ...c, takenBy: "" })),
    ],
    presentIds: new Set(["alive"]),
  });
  assert(!locked.claimable.has("gone"), "zeroed departed not claimable");
  assert(locked.claimable.get("alive") === 20, "alive keeps haul");
  assert(locked.leftoverSats === 80, `post-drop leftover=${locked.leftoverSats}`);
  assert(locked.collected + locked.leftoverSats === 100, "post-drop pot seals");
}

console.log("verify-battle-leave-haul: ok");
