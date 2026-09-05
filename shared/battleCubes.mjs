/**
 * Event Mode Battle — money cubes along simple track roads.
 * Shared by the game client and the WS server so layout + values stay in sync.
 *
 * ── Pot accounting (important) ─────────────────────────────────────────────
 * `buildBattleCubes(trackId, potSats, seed)` ALWAYS returns a layout whose
 * `sats` values sum exactly to `potSats` (the buy-in pool at race start).
 *
 * During the race:
 *   claimed  = sum of sats on cubes players have picked up (battleEarnings)
 *   leftover = potSats − claimed  (untaken cubes still on the map)
 * On wreck, a player's unclaimed haul returns to untaken cubes (earnings→0,
 * new cubes via buildDroppedBattleCubes) so claimed + leftover stays = potSats.
 *
 * After someone finishes 1st, the server locks claimable shares:
 *   each racer claims their collected cube sats
 *   leftover goes to the developer tip wallet
 * so claimed + leftover = potSats for the whole match.
 *
 * Client pickup roulette may *display* cycling fake amounts for drama, but the
 * locked award is always that cube’s real `sats` from this layout — never an
 * extra mint of value outside the pot.
 * ──────────────────────────────────────────────────────────────────────────
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const POINTS = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "trackPoints.json"), "utf8"),
);

/**
 * How close a racer’s position must be (meters, XZ) to collect a cube.
 * Sized for arcade cars (~2m half-length) glancing the box at race speed —
 * client also sweeps between frames; server accepts a fresher pose on pickup.
 */
export const BATTLE_PICKUP_RADIUS = 8.5;

/** Extra pad the client adds for car extents / visual box size (server stays stricter). */
export const BATTLE_PICKUP_CLIENT_PAD = 2.5;

/**
 * Max distance (m) a pickup’s claimed x/z may drift from the last networked pose.
 * Covers pose-tick lag (~30Hz) + one frame of high speed without allowing teleports.
 */
export const BATTLE_PICKUP_POSE_SLACK = 45;

/**
 * Battle-only asphalt width multiplier applied when the client builds the track.
 * Race / casual modes keep the default width (1×). Does not mutate trackDefs.
 */
export const BATTLE_TRACK_WIDTH_SCALE = 1.45;

/**
 * @typedef {{ id: number, x: number, z: number, sats: number, tier: 'small' | 'medium' | 'large' }} BattleCube
 */

/** @param {string} trackId */
function trackPoints(trackId) {
  return POINTS[trackId] || POINTS["forest-loop"];
}

/** Closed Catmull-Rom sample — matches Three's default tension well enough for roadside props. */
function sampleClosed(points, t) {
  const n = points.length;
  const u = ((t % 1) + 1) % 1;
  const f = u * n;
  const i1 = Math.floor(f) % n;
  const i0 = (i1 - 1 + n) % n;
  const i2 = (i1 + 1) % n;
  const i3 = (i1 + 2) % n;
  const local = f - Math.floor(f);
  const p0 = points[i0];
  const p1 = points[i1];
  const p2 = points[i2];
  const p3 = points[i3];
  const tt = local;
  const tt2 = tt * tt;
  const tt3 = tt2 * tt;
  const x =
    0.5 *
    (2 * p1[0] +
      (-p0[0] + p2[0]) * tt +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * tt2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * tt3);
  const z =
    0.5 *
    (2 * p1[1] +
      (-p0[1] + p2[1]) * tt +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * tt2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * tt3);
  // Tangent for lateral offset
  const dx =
    0.5 *
    (-p0[0] +
      p2[0] +
      (4 * p0[0] - 10 * p1[0] + 8 * p2[0] - 2 * p3[0]) * tt +
      (-3 * p0[0] + 9 * p1[0] - 9 * p2[0] + 3 * p3[0]) * tt2);
  const dz =
    0.5 *
    (-p0[1] +
      p2[1] +
      (4 * p0[1] - 10 * p1[1] + 8 * p2[1] - 2 * p3[1]) * tt +
      (-3 * p0[1] + 9 * p1[1] - 9 * p2[1] + 3 * p3[1]) * tt2);
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  return { x, z, nx, nz };
}

/** Deterministic 0..1 from integer seed. */
function hash01(n) {
  let x = (n | 0) * 374761393;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/**
 * Build a cube layout whose values sum exactly to `potSats`.
 * Cubes sit slightly off the racing line (roadside / near center), spread a
 * bit farther on battle-wide tracks so they use the extra asphalt.
 *
 * @param {string} trackId
 * @param {number} potSats
 * @param {string | number} [seed]
 * @returns {BattleCube[]}
 */
export function buildBattleCubes(trackId, potSats, seed = 1) {
  const pot = Math.max(1, Math.round(Number(potSats) || 1));
  const pts = trackPoints(trackId);
  const seedN = typeof seed === "string" ? [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) : Number(seed) || 1;

  // Tier base values scale with pot size so a 100-sat buy-in still feels juicy.
  const small = Math.max(1, Math.round(pot * 0.04));
  const medium = Math.max(small + 1, Math.round(pot * 0.1));
  const large = Math.max(medium + 1, Math.round(pot * 0.22));

  /** @type {{ tier: 'small' | 'medium' | 'large', sats: number }[]} */
  const plan = [];
  let remaining = pot;
  let i = 0;
  // Prefer many small/medium with a few larges; stop when budget is filled.
  while (remaining > 0 && plan.length < 48) {
    const roll = hash01(seedN * 17 + i * 97);
    let tier = /** @type {'small' | 'medium' | 'large'} */ ("small");
    let sats = small;
    if (roll > 0.82 && remaining >= large) {
      tier = "large";
      sats = large;
    } else if (roll > 0.5 && remaining >= medium) {
      tier = "medium";
      sats = medium;
    }
    if (sats > remaining) sats = remaining;
    plan.push({ tier, sats });
    remaining -= sats;
    i += 1;
  }
  // Exact pot seal: any leftover sats from rounding land on the last cube.
  if (remaining > 0 && plan.length) {
    plan[plan.length - 1].sats += remaining;
  }

  /** @type {BattleCube[]} */
  const cubes = [];
  const count = plan.length;
  // Lateral spread uses the battle width scale so boxes aren't clustered on a
  // fat road — still stays inside asphalt (half-width ≈ 7 * scale).
  const latScale = BATTLE_TRACK_WIDTH_SCALE;
  for (let c = 0; c < count; c++) {
    // Spread evenly, jitter a little, skip the start/finish strip.
    const baseT = (c + 0.5) / count;
    const jitter = (hash01(seedN + c * 31) - 0.5) * (0.7 / Math.max(8, count));
    let t = baseT + jitter;
    if (t < 0.04) t += 0.08;
    if (t > 0.96) t -= 0.08;
    const side = hash01(seedN + c * 53) > 0.5 ? 1 : -1;
    // Keep cubes on asphalt / soft shoulder — readable, not buried in trees.
    const lat = (2.2 + hash01(seedN + c * 71) * 3.4) * latScale;
    const sample = sampleClosed(pts, t);
    const entry = plan[c];
    cubes.push({
      id: c,
      x: sample.x + sample.nx * side * lat,
      z: sample.z + sample.nz * side * lat,
      sats: entry.sats,
      tier: entry.tier,
    });
  }
  return cubes;
}

/** Seed string/number → integer mixer (same family as buildBattleCubes). */
function seedToN(seed) {
  return typeof seed === "string"
    ? [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
    : Number(seed) || 1;
}

/**
 * Split a wrecked racer's haul into new item cubes whose sats sum exactly to
 * `haulSats`. Scattered near the crash site and a bit along the track so others
 * can scoop them (Mario Kart–style drop).
 *
 * @param {string} trackId
 * @param {number} haulSats
 * @param {number} originX — crash / wreck X
 * @param {number} originZ — crash / wreck Z
 * @param {string | number} [seed]
 * @param {number} [startId] — first cube id (server uses max existing + 1)
 * @returns {BattleCube[]}
 */
export function buildDroppedBattleCubes(
  trackId,
  haulSats,
  originX,
  originZ,
  seed = 1,
  startId = 0,
) {
  const haul = Math.max(0, Math.round(Number(haulSats) || 0));
  if (haul <= 0) return [];

  const pts = trackPoints(trackId);
  const seedN = seedToN(seed);
  const id0 = Math.max(0, Math.round(Number(startId) || 0));
  const ox = Number(originX) || 0;
  const oz = Number(originZ) || 0;

  // Tier bases scale with the dropped haul (not the full pot).
  const small = Math.max(1, Math.round(haul * 0.1));
  const medium = Math.max(small + 1, Math.round(haul * 0.25));
  const large = Math.max(medium + 1, Math.round(haul * 0.45));

  /** @type {{ tier: 'small' | 'medium' | 'large', sats: number }[]} */
  const plan = [];
  let remaining = haul;
  let i = 0;
  // Fewer cubes than a full pot layout — readable pile around the wreck.
  while (remaining > 0 && plan.length < 14) {
    const roll = hash01(seedN * 19 + i * 83);
    let tier = /** @type {'small' | 'medium' | 'large'} */ ("small");
    let sats = small;
    if (roll > 0.78 && remaining >= large) {
      tier = "large";
      sats = large;
    } else if (roll > 0.42 && remaining >= medium) {
      tier = "medium";
      sats = medium;
    }
    if (sats > remaining) sats = remaining;
    plan.push({ tier, sats });
    remaining -= sats;
    i += 1;
  }
  if (remaining > 0 && plan.length) {
    plan[plan.length - 1].sats += remaining;
  }

  // Nearest track sample to the crash — anchor for along-track scatter.
  let bestT = 0;
  let bestD = Infinity;
  const samples = 96;
  for (let s = 0; s < samples; s++) {
    const t = s / samples;
    const samp = sampleClosed(pts, t);
    const d = (samp.x - ox) * (samp.x - ox) + (samp.z - oz) * (samp.z - oz);
    if (d < bestD) {
      bestD = d;
      bestT = t;
    }
  }

  const latScale = BATTLE_TRACK_WIDTH_SCALE;
  /** @type {BattleCube[]} */
  const cubes = [];
  for (let c = 0; c < plan.length; c++) {
    const entry = plan[c];
    const placeRoll = hash01(seedN + c * 47);
    let x;
    let z;
    if (placeRoll < 0.55) {
      // Near crash: ring on / beside asphalt around the wreck.
      const ang = hash01(seedN + c * 59) * Math.PI * 2;
      const rad = 3.5 + hash01(seedN + c * 67) * 12;
      const near = sampleClosed(pts, bestT + (hash01(seedN + c * 73) - 0.5) * 0.04);
      const side = hash01(seedN + c * 79) > 0.5 ? 1 : -1;
      const lat = (1.5 + hash01(seedN + c * 89) * 3.2) * latScale;
      // Blend ring offset with track-lateral so boxes stay readable on road.
      x = ox + Math.cos(ang) * rad * 0.55 + near.nx * side * lat * 0.65;
      z = oz + Math.sin(ang) * rad * 0.55 + near.nz * side * lat * 0.65;
    } else {
      // Along track ahead/behind the wreck (±~8% of lap).
      const along = (hash01(seedN + c * 97) - 0.5) * 0.16;
      let t = bestT + along;
      t = ((t % 1) + 1) % 1;
      const side = hash01(seedN + c * 103) > 0.5 ? 1 : -1;
      const lat = (2.0 + hash01(seedN + c * 107) * 3.6) * latScale;
      const sample = sampleClosed(pts, t);
      x = sample.x + sample.nx * side * lat;
      z = sample.z + sample.nz * side * lat;
    }
    cubes.push({
      id: id0 + c,
      x,
      z,
      sats: entry.sats,
      tier: entry.tier,
    });
  }
  return cubes;
}
