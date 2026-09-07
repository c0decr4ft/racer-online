/**
 * Locks Event Battle pickup hit-pose rules.
 * Claim coords may freshen a hit-test within slack, but must never be treated as
 * an authoritative pose write-back (that enabled cube-to-cube teleport hops).
 *
 * Run: node scripts/verify-battle-pickup-pose.mjs
 */
import {
  BATTLE_PICKUP_POSE_SLACK,
  BATTLE_PICKUP_RADIUS,
  buildBattleCubes,
  resolveBattlePickupHitPose,
} from "../shared/battleCubes.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(BATTLE_PICKUP_POSE_SLACK <= 16, `slack ${BATTLE_PICKUP_POSE_SLACK} too large for anti-hop`);
assert(BATTLE_PICKUP_RADIUS > 0, "pickup radius must be positive");

// No claim → use networked pose.
{
  const hit = resolveBattlePickupHitPose({
    poseX: 10,
    poseZ: -4,
    claimX: NaN,
    claimZ: NaN,
  });
  assert(hit.x === 10 && hit.z === -4 && hit.usedClaim === false, "missing claim → pose");
}

// Claim inside slack → freshen hit-test only (caller must not mutate pose).
{
  const hit = resolveBattlePickupHitPose({
    poseX: 0,
    poseZ: 0,
    claimX: 8,
    claimZ: 0,
    slack: 12,
  });
  assert(hit.usedClaim === true && hit.x === 8 && hit.z === 0, "in-slack claim freshened");
}

// Claim outside slack → ignore claim.
{
  const hit = resolveBattlePickupHitPose({
    poseX: 0,
    poseZ: 0,
    claimX: 40,
    claimZ: 0,
    slack: 12,
  });
  assert(hit.usedClaim === false && hit.x === 0 && hit.z === 0, "out-of-slack claim ignored");
}

/**
 * Simulate the old bug: after each award, write hit coords into the authoritative
 * pose. With a large slack that chained across the layout. With current slack and
 * without write-back, a fixed pose cannot vacuum the whole pot.
 */
function maxHopComponent(cubes, slack, mutatePose) {
  let best = 0;
  for (let start = 0; start < cubes.length; start++) {
    const remaining = cubes.map((c, i) => ({ ...c, i }));
    let poseX = cubes[start].x;
    let poseZ = cubes[start].z;
    let got = 0;
    let progress = true;
    while (progress) {
      progress = false;
      for (let k = remaining.length - 1; k >= 0; k--) {
        const c = remaining[k];
        const hit = resolveBattlePickupHitPose({
          poseX,
          poseZ,
          claimX: c.x,
          claimZ: c.z,
          slack,
        });
        const dx = hit.x - c.x;
        const dz = hit.z - c.z;
        if (dx * dx + dz * dz > BATTLE_PICKUP_RADIUS * BATTLE_PICKUP_RADIUS) continue;
        got += 1;
        remaining.splice(k, 1);
        progress = true;
        // Old bug: mutate authoritative pose to the claim / cube.
        if (mutatePose && hit.usedClaim) {
          poseX = hit.x;
          poseZ = hit.z;
        }
      }
    }
    best = Math.max(best, got);
  }
  return best;
}

const layout = buildBattleCubes("forest-loop", 100, "verify-pickup");
assert(layout.length >= 8, "expected a multi-cube layout");

const hopOld = maxHopComponent(layout, 45, true);
const hopFixed = maxHopComponent(layout, BATTLE_PICKUP_POSE_SLACK, false);
assert(hopOld > hopFixed, `expected old hop (${hopOld}) to beat fixed (${hopFixed})`);
assert(
  hopFixed <= 2,
  `fixed policy vacuumed ${hopFixed}/${layout.length} cubes from one pose (slack=${BATTLE_PICKUP_POSE_SLACK})`,
);

console.log(
  `verify-battle-pickup-pose: ok (oldHop=${hopOld} fixedHop=${hopFixed} n=${layout.length} slack=${BATTLE_PICKUP_POSE_SLACK})`,
);
