import * as THREE from "three";
import { biomeForTrack, type BiomeStyle } from "./biomes";
import {
  DEFAULT_TRACK_ID,
  getTrackDef,
  type TrackDef,
} from "./trackDefs";

export type { TrackDef };
export { TRACKS, DEFAULT_TRACK_ID, getTrackDef, randomTrackId, isTrackId } from "./trackDefs";

export type TrackData = {
  id: string;
  name: string;
  group: THREE.Group;
  path: THREE.CatmullRomCurve3;
  startPosition: THREE.Vector3;
  startHeading: number;
  width: number;
};

/** Shared with car headlights — asphalt receives beams; forest stays on layer 0 only. */
const HEADLIGHT_LAYER = 1;

function yawFromTangent(tangent: THREE.Vector3) {
  return Math.atan2(tangent.x, tangent.z);
}

/** Deterministic 0..1 hash from integer coords (stable tree scatter). */
function hash2(ix: number, iz: number) {
  let n = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Shared materials — cloned per biome so colors stay distinct. */
function makeTreeMats(trunk: number, canopies: number[]) {
  return {
    trunk: new THREE.MeshStandardMaterial({ color: trunk, roughness: 0.9 }),
    canopy: canopies.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
    ),
  };
}

const VEG_MATS = {
  trees: makeTreeMats(0x5a3a22, [0x2a8a32, 0x247a2c, 0x33963a]),
  pines: makeTreeMats(0x3a2a18, [0x1a4a28, 0x163e22, 0x245a32]),
  // Sandy trunk + tropical frond greens (deeper / olive, not lawn green)
  palms: makeTreeMats(0xc4a06a, [0x1e7a36, 0x2a9142, 0x3aa850]),
  cactus: makeTreeMats(0x3a6a2a, [0x3a6a2a, 0x458034, 0x2f5a24]),
  // Meadow: single canopy green (no multi-tone variation)
  sparse: makeTreeMats(0x5a3a22, [0x6a9a32]),
};

/** Shared mats must not be disposed with a track swap. */
const SHARED_VEG_MATS = new Set<THREE.Material>(
  Object.values(VEG_MATS).flatMap((v) => [v.trunk, ...v.canopy]),
);

type TreePose = { x: number; z: number; scale: number; jitter: number };

/** Soft cap so large multi-map circuits don't plant 6k–10k trees per swap. */
const MAX_TREES = 1500;

/** Runoff half-width beyond asphalt centerline (matches createTrack ribbon). */
const RUNOFF_EXTRA = 4.8;
/** Extra gap past runoff so vegetation / props never sit on racing surface. */
const TRACK_CLEAR_PAD = 6.5;

type PathClearance = {
  minDist2: (x: number, z: number) => number;
  /** Off asphalt + runoff + safety pad (trees, rocks, stands). */
  clearOf: (x: number, z: number, footprint: number) => boolean;
  /** Off asphalt + runoff only (trackside boards / fences). */
  outsideRunoff: (x: number, z: number, footprint: number) => boolean;
  /** True when inside the closed circuit (infield) — keep empty of scenery. */
  insideLoop: (x: number, z: number) => boolean;
  /** Scenery-safe: outside the loop and clear of the racing ribbon. */
  sceneryOk: (x: number, z: number, footprint: number) => boolean;
  /** Lateral clear distance from path center (road + runoff + pad). */
  baseClear: number;
  runoffClear: number;
};

function makePathClearance(path: THREE.CatmullRomCurve3, roadHalf: number): PathClearance {
  const runoffClear = roadHalf + RUNOFF_EXTRA;
  const baseClear = runoffClear + TRACK_CLEAR_PAD;
  const samples: THREE.Vector3[] = [];
  const sampleN = 960;
  for (let i = 0; i < sampleN; i++) samples.push(path.getPointAt(i / sampleN));

  const BIN = 16;
  const bins = new Map<string, number[]>();
  for (let i = 0; i < sampleN; i++) {
    const p = samples[i]!;
    const key = `${Math.floor(p.x / BIN)},${Math.floor(p.z / BIN)}`;
    let list = bins.get(key);
    if (!list) {
      list = [];
      bins.set(key, list);
    }
    list.push(i);
  }

  const minDist2 = (x: number, z: number) => {
    const bx = Math.floor(x / BIN);
    const bz = Math.floor(z / BIN);
    let best = Infinity;
    // Wider neighborhood so sharp corners don't under-detect the ribbon
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const list = bins.get(`${bx + dx},${bz + dz}`);
        if (!list) continue;
        for (const i of list) {
          const p = samples[i]!;
          const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
          if (d < best) best = d;
        }
      }
    }
    return best;
  };

  // Ray-cast infield test on the closed centerline polyline
  const insideLoop = (x: number, z: number) => {
    let inside = false;
    for (let i = 0, j = sampleN - 1; i < sampleN; j = i++) {
      const pi = samples[i]!;
      const pj = samples[j]!;
      const zi = pi.z;
      const zj = pj.z;
      const crosses = zi > z !== zj > z;
      if (!crosses) continue;
      const xHit = ((pj.x - pi.x) * (z - zi)) / (zj - zi + 1e-12) + pi.x;
      if (x < xHit) inside = !inside;
    }
    return inside;
  };

  const clearOf = (x: number, z: number, footprint: number) =>
    minDist2(x, z) >= (baseClear + Math.max(0, footprint)) ** 2;
  const outsideRunoff = (x: number, z: number, footprint: number) =>
    minDist2(x, z) >= (runoffClear + Math.max(0, footprint)) ** 2;

  return {
    minDist2,
    baseClear,
    runoffClear,
    clearOf,
    outsideRunoff,
    insideLoop,
    sceneryOk: (x, z, footprint) => !insideLoop(x, z) && clearOf(x, z, footprint),
  };
}

function collectPlantPoses(
  path: THREE.CatmullRomCurve3,
  roadHalf: number,
  density: number,
  clearance = makePathClearance(path, roadHalf),
): { poses: TreePose[]; bounds: ReturnType<typeof pathBounds>; clearance: PathClearance } {
  const bounds = pathBounds(path);

  const poses: TreePose[] = [];
  const tryPlant = (x: number, z: number, scale: number) => {
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return;
    // Never plant in the infield or on/near asphalt + runoff
    const footprint = scale * 1.6;
    if (!clearance.sceneryOk(x, z, footprint)) return;
    poses.push({
      x,
      z,
      scale,
      jitter: hash2(Math.round(x * 10), Math.round(z * 10)),
    });
  };

  // Lateral rings — skip the infield (negative offsets) so the middle stays empty
  const ringOffsets = [22, 30, 40, 52, 68, 88, 112, 140];
  const ringSteps = 160;
  const ringTan = new THREE.Vector3();
  const ringN = new THREE.Vector3();
  const skipChance = 1 - Math.max(0.12, Math.min(1, density));
  for (const offset of ringOffsets) {
    for (let i = 0; i < ringSteps; i++) {
      const t = i / ringSteps;
      const p = path.getPointAt(t);
      ringTan.copy(path.getTangentAt(t)).normalize();
      ringN.set(-ringTan.z, 0, ringTan.x);
      const h = hash2(i, Math.round(offset * 10));
      if (h < 0.28 + skipChance * 0.5) continue;
      // Plant both outer laterals (±) but sceneryOk drops any infield hits
      for (const sign of [-1, 1] as const) {
        const lat = sign * (offset + (h - 0.5) * 3.2);
        const along = (hash2(Math.round(offset * 7), i + sign * 17) - 0.5) * 2.4;
        const x = p.x + ringN.x * lat + ringTan.x * along;
        const z = p.z + ringN.z * lat + ringTan.z * along;
        tryPlant(x, z, 0.65 + h * 0.7);
      }
    }
  }

  const step = density > 0.7 ? 8.5 : density > 0.4 ? 11.5 : 15;
  for (let ix = bounds.minX; ix <= bounds.maxX; ix += step) {
    for (let iz = bounds.minZ; iz <= bounds.maxZ; iz += step) {
      const h = hash2(Math.round(ix * 3), Math.round(iz * 3));
      if (h < 0.22 + skipChance * 0.55) continue;
      const x = ix + (h - 0.5) * 5.2;
      const z = iz + (hash2(Math.round(iz * 5), Math.round(ix * 5)) - 0.5) * 5.2;
      tryPlant(x, z, 0.55 + h * 0.85);
    }
  }

  const cap = Math.max(80, Math.round(MAX_TREES * density));
  if (poses.length > cap) {
    const keep: TreePose[] = [];
    for (let i = 0; i < poses.length; i++) {
      const h = hash2(i * 17, Math.round(poses[i]!.x * 3));
      if (h < cap / poses.length) keep.push(poses[i]!);
    }
    if (keep.length < cap * 0.85) {
      for (let i = 0; i < poses.length && keep.length < cap; i++) {
        if (hash2(i * 31, Math.round(poses[i]!.z * 5)) > 0.55) keep.push(poses[i]!);
      }
    }
    poses.length = 0;
    poses.push(...keep.slice(0, cap));
  }

  return { poses, bounds, clearance };
}

/**
 * Low-poly palm crown — layered lanceolate fronds with a clear droop silhouette.
 * Local origin is the crown center (place at top of trunk).
 */
function createPalmCanopyGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const pushTri = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };
  const pushLeaf = (
    rx: number, ry: number, rz: number,
    mlx: number, mly: number, mlz: number,
    mrx: number, mry: number, mrz: number,
    tx: number, ty: number, tz: number,
  ) => {
    // Top + underside so fronds read from both sides
    pushTri(rx, ry, rz, mlx, mly, mlz, tx, ty, tz);
    pushTri(rx, ry, rz, tx, ty, tz, mrx, mry, mrz);
    pushTri(rx, ry, rz, tx, ty, tz, mlx, mly, mlz);
    pushTri(rx, ry, rz, mrx, mry, mrz, tx, ty, tz);
  };

  // Small crown heart / growing tip
  const hr = 0.2;
  pushTri(0, 0.32, 0, hr, 0.06, 0, 0, 0.06, hr);
  pushTri(0, 0.32, 0, 0, 0.06, hr, -hr, 0.06, 0);
  pushTri(0, 0.32, 0, -hr, 0.06, 0, 0, 0.06, -hr);
  pushTri(0, 0.32, 0, 0, 0.06, -hr, hr, 0.06, 0);

  // Upper ring: shorter, slightly upright. Lower ring: longer drooping fronds.
  const rings: {
    count: number;
    yawOff: number;
    tipR: number;
    tipY: number;
    midR: number;
    midY: number;
    halfW: number;
    rootR: number;
    baseY: number;
  }[] = [
    {
      count: 6,
      yawOff: 0.2,
      tipR: 1.55,
      tipY: -0.22,
      midR: 0.82,
      midY: 0.28,
      halfW: 0.34,
      rootR: 0.1,
      baseY: 0.1,
    },
    {
      count: 8,
      yawOff: 0,
      tipR: 2.4,
      tipY: -1.15,
      midR: 1.28,
      midY: -0.12,
      halfW: 0.44,
      rootR: 0.14,
      baseY: 0.02,
    },
  ];

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const a = ((i + ring.yawOff) / ring.count) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Perpendicular for frond width
      const px = -sa;
      const pz = ca;

      const rx = ca * ring.rootR;
      const rz = sa * ring.rootR;
      const tipX = ca * ring.tipR;
      const tipZ = sa * ring.tipR;
      // Mid rib slightly wider — lanceolate palm leaf
      const midX = ca * ring.midR;
      const midZ = sa * ring.midR;
      const mlx = midX + px * ring.halfW;
      const mlz = midZ + pz * ring.halfW;
      const mrx = midX - px * ring.halfW;
      const mrz = midZ - pz * ring.halfW;

      pushLeaf(
        rx, ring.baseY, rz,
        mlx, ring.midY, mlz,
        mrx, ring.midY, mrz,
        tipX, ring.tipY, tipZ,
      );

      // Outer half: narrower segment so the tip tapers cleanly
      const mid2R = ring.midR * 0.55 + ring.tipR * 0.45;
      const mid2Y = ring.midY * 0.4 + ring.tipY * 0.6;
      const hw2 = ring.halfW * 0.42;
      const m2x = ca * mid2R;
      const m2z = sa * mid2R;
      pushLeaf(
        midX, ring.midY, midZ,
        m2x + px * hw2, mid2Y, m2z + pz * hw2,
        m2x - px * hw2, mid2Y, m2z - pz * hw2,
        tipX, ring.tipY, tipZ,
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Low-poly palm: tall tapered trunk + layered drooping frond crown. */
function plantPalmPoses(
  group: THREE.Group,
  poses: TreePose[],
  mats = VEG_MATS.palms,
) {
  if (!poses.length) return;

  const TRUNK_H = 3.85;
  const trunkGeo = new THREE.CylinderGeometry(0.065, 0.28, TRUNK_H, 6);
  const canopyGeo = createPalmCanopyGeometry();
  const dummy = new THREE.Object3D();
  const n = poses.length;

  const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, n);
  trunks.count = 0;
  trunks.castShadow = false;
  trunks.receiveShadow = false;
  trunks.frustumCulled = true;
  trunks.userData.sharedVegMat = true;

  const canopies = mats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(canopyGeo, mat, n);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });
  // Second yaw-offset crown so palms read fuller from the side
  const unders = mats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(canopyGeo, mat, n);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });

  for (let i = 0; i < n; i++) {
    const { x, z, scale, jitter } = poses[i]!;
    const yaw = jitter * Math.PI * 2;
    // Slight coastal lean so palms don't stand like poles
    const leanAmt = 0.06 + jitter * 0.14;
    const leanDir = jitter * Math.PI * 2 + 1.7;
    const leanX = Math.cos(leanDir) * leanAmt;
    const leanZ = Math.sin(leanDir) * leanAmt;
    // Tip drifts with lean (approx. half-height * sin)
    const tipShift = Math.sin(leanAmt) * TRUNK_H * scale * 0.85;
    const tipX = x + Math.cos(leanDir) * tipShift;
    const tipZ = z + Math.sin(leanDir) * tipShift;

    dummy.position.set(x, (TRUNK_H * 0.5) * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(leanX, yaw, leanZ);
    dummy.updateMatrix();
    trunks.setMatrixAt(trunks.count++, dummy.matrix);

    const ci = Math.floor(jitter * mats.canopy.length) % mats.canopy.length;
    const cs = scale * (0.92 + jitter * 0.22);
    const crownY = TRUNK_H * scale;
    dummy.position.set(tipX, crownY, tipZ);
    dummy.scale.set(cs, cs, cs);
    dummy.rotation.set(leanX * 0.65, yaw, leanZ * 0.65);
    dummy.updateMatrix();
    canopies[ci]!.setMatrixAt(canopies[ci]!.count++, dummy.matrix);

    // Lower, slightly smaller under-crown for volume
    dummy.position.set(tipX, crownY - 0.12 * scale, tipZ);
    dummy.scale.set(cs * 0.82, cs * 0.88, cs * 0.82);
    dummy.rotation.set(leanX * 0.5, yaw + 0.52, leanZ * 0.5);
    dummy.updateMatrix();
    unders[ci]!.setMatrixAt(unders[ci]!.count++, dummy.matrix);
  }

  trunks.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  group.add(trunks);
  for (const canopy of [...canopies, ...unders]) {
    if (!canopy.count) continue;
    canopy.instanceMatrix.needsUpdate = true;
    canopy.computeBoundingSphere();
    group.add(canopy);
  }
}

function plantVegetation(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  roadHalf: number,
  biome: BiomeStyle,
  clearance?: PathClearance,
) {
  if (biome.vegetation === "none") return 0;
  const mats =
    biome.vegetation === "pines"
      ? VEG_MATS.pines
      : biome.vegetation === "palms"
        ? VEG_MATS.palms
        : biome.vegetation === "cactus"
          ? VEG_MATS.cactus
          : biome.vegetation === "sparse"
            ? VEG_MATS.sparse
            : VEG_MATS.trees;
  const collected = collectPlantPoses(path, roadHalf, biome.density, clearance);
  const clear = clearance ?? collected.clearance;
  // Coast: keep palms on sand — shoreline dips into the sea past the local beach width
  const poses =
    biome.vegetation === "palms"
      ? filterPosesToCoastSand(collected.poses, path, clear)
      : collected.poses;
  const { bounds } = collected;
  if (!poses.length) return 0;

  const CELL = 72;
  const buckets = new Map<string, TreePose[]>();
  const originX = bounds.minX - 10;
  const originZ = bounds.minZ - 10;
  for (const pose of poses) {
    const cx = Math.floor((pose.x - originX) / CELL);
    const cz = Math.floor((pose.z - originZ) / CELL);
    const key = `${cx},${cz}`;
    let list = buckets.get(key);
    if (!list) {
      list = [];
      buckets.set(key, list);
    }
    list.push(pose);
  }

  // Coast palms use a dedicated frond mesh (not the generic sphere canopy)
  if (biome.vegetation === "palms") {
    for (const list of buckets.values()) {
      if (list.length) plantPalmPoses(group, list, mats);
    }
    return poses.length;
  }

  const isPine = biome.vegetation === "pines";
  const isCactus = biome.vegetation === "cactus";
  const trunkGeo = isCactus
    ? new THREE.CylinderGeometry(0.18, 0.22, 2.4, 5)
    : new THREE.CylinderGeometry(0.22, 0.3, isPine ? 2.2 : 1.2, 5);
  const canopyGeo = isPine
    ? new THREE.ConeGeometry(1.1, 2.6, 6)
    : isCactus
      ? new THREE.SphereGeometry(0.35, 5, 4)
      : new THREE.SphereGeometry(1.35, 6, 6);
  const dummy = new THREE.Object3D();
  const canopyMats = mats.canopy;

  for (const list of buckets.values()) {
    const n = list.length;
    if (n === 0) continue;

    const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, n);
    trunks.castShadow = false;
    trunks.receiveShadow = false;
    trunks.frustumCulled = true;
    trunks.userData.sharedVegMat = true;

    const canopyCounts = canopyMats.map(() => 0);
    for (const pose of list) {
      canopyCounts[Math.floor(pose.jitter * canopyMats.length) % canopyMats.length]! += 1;
    }
    const canopies = canopyMats.map((mat, ci) => {
      const mesh = new THREE.InstancedMesh(canopyGeo, mat, Math.max(1, canopyCounts[ci]!));
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
      mesh.count = 0;
      mesh.userData.sharedVegMat = true;
      return mesh;
    });

    // Extra pine layer mesh (stacked cones) for alpine silhouette
    const pineTops = isPine
      ? canopyMats.map((mat) => {
          const mesh = new THREE.InstancedMesh(canopyGeo, mat, Math.max(1, n));
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.frustumCulled = true;
          mesh.count = 0;
          mesh.userData.sharedVegMat = true;
          return mesh;
        })
      : null;

    for (let i = 0; i < n; i++) {
      const { x, z, scale, jitter } = list[i]!;
      const trunkH = isCactus || isPine ? 1.1 : 0.6;
      dummy.position.set(x, trunkH * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, jitter * Math.PI * 2, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      const ci = Math.floor(jitter * canopyMats.length) % canopyMats.length;
      const canopy = canopies[ci]!;
      const cy = isPine ? 2.2 * scale : isCactus ? 2.5 * scale : 2.0 * scale;
      const cr = isCactus ? 0.9 + jitter * 0.3 : (1.35 * scale + jitter * 0.35) / 1.35;
      dummy.position.set(x, cy, z);
      dummy.scale.set(cr, isPine ? cr * 1.25 : cr, cr);
      dummy.updateMatrix();
      canopy.setMatrixAt(canopy.count++, dummy.matrix);

      if (pineTops) {
        const top = pineTops[ci]!;
        dummy.position.set(x, cy + 1.15 * scale, z);
        dummy.scale.set(cr * 0.62, cr * 0.95, cr * 0.62);
        dummy.updateMatrix();
        top.setMatrixAt(top.count++, dummy.matrix);
      }
    }

    trunks.instanceMatrix.needsUpdate = true;
    group.add(trunks);
    for (const canopy of canopies) {
      if (canopy.count === 0) continue;
      canopy.instanceMatrix.needsUpdate = true;
      canopy.computeBoundingSphere();
      group.add(canopy);
    }
    if (pineTops) {
      for (const top of pineTops) {
        if (top.count === 0) continue;
        top.instanceMatrix.needsUpdate = true;
        top.computeBoundingSphere();
        group.add(top);
      }
    }
    trunks.computeBoundingSphere();
  }

  return poses.length;
}

/**
 * Extruded mountain-range chunk: jagged skyline along X, thickness along Z.
 * Reads as a ridge wall, not a standalone cone/hat.
 */
function createRangeChunkGeometry(
  profile: readonly (readonly [number, number])[],
  halfDepth = 0.55,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const push = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };

  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, h0] = profile[i]!;
    const [x1, h1] = profile[i + 1]!;
    // Front slope (faces -Z)
    push(x0, 0, halfDepth, x1, 0, halfDepth, x1, h1, halfDepth);
    push(x0, 0, halfDepth, x1, h1, halfDepth, x0, h0, halfDepth);
    // Back slope (faces +Z)
    push(x1, 0, -halfDepth, x0, 0, -halfDepth, x0, h0, -halfDepth);
    push(x1, 0, -halfDepth, x0, h0, -halfDepth, x1, h1, -halfDepth);
    // Top ridge
    push(x0, h0, halfDepth, x1, h1, halfDepth, x1, h1, -halfDepth);
    push(x0, h0, halfDepth, x1, h1, -halfDepth, x0, h0, -halfDepth);
  }
  // End caps
  const first = profile[0]!;
  const last = profile[profile.length - 1]!;
  push(first[0], 0, halfDepth, first[0], 0, -halfDepth, first[0], first[1], -halfDepth);
  push(first[0], 0, halfDepth, first[0], first[1], -halfDepth, first[0], first[1], halfDepth);
  push(last[0], 0, -halfDepth, last[0], 0, halfDepth, last[0], last[1], halfDepth);
  push(last[0], 0, -halfDepth, last[0], last[1], halfDepth, last[0], last[1], -halfDepth);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Tall multi-peak range segment (unit X ≈ ±1, peak Y ≈ 1). */
function createMountainRangeGeometry(): THREE.BufferGeometry {
  return createRangeChunkGeometry([
    [-1.0, 0.08],
    [-0.82, 0.32],
    [-0.62, 0.22],
    [-0.4, 0.72],
    [-0.22, 0.48],
    [-0.05, 0.95],
    [0.18, 0.55],
    [0.38, 0.82],
    [0.58, 0.4],
    [0.78, 0.62],
    [1.0, 0.12],
  ], 0.62);
}

/** Lower foothill band — wide and squat. */
function createFoothillGeometry(): THREE.BufferGeometry {
  return createRangeChunkGeometry([
    [-1.0, 0.1],
    [-0.7, 0.45],
    [-0.4, 0.28],
    [-0.1, 0.7],
    [0.25, 0.35],
    [0.55, 0.58],
    [0.8, 0.25],
    [1.0, 0.08],
  ], 0.85);
}

/**
 * Minimum beach width past runoff (meters). Closest shoreline approach must
 * still read as clear sand between water and the grey shoulder — also cushions
 * strip chords that cut inward at tight bends.
 */
const COAST_BEACH_MIN = 16;

/**
 * Beach width past runoff along the coast circuit (meters).
 * Low = sea nearer (still past COAST_BEACH_MIN); high = wide sand.
 * Never returns below COAST_BEACH_MIN (water must stay off runoff / asphalt).
 */
function coastBeachExtra(t: number): number {
  const a = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 2.15);
  const b = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 5.4 + 1.1);
  const c = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.85 + 0.55);
  const i = Math.floor(t * 320) % 320;
  const jagged = hash2(i, 77) * 0.4 + hash2((i + 1) % 320, 77) * 0.6;

  // Soft inlets — sea draws closer, but never collapses onto the shoulder.
  let inlet = 0;
  const inlets = [0.08, 0.27, 0.49, 0.66, 0.91];
  for (const d of inlets) {
    const dist = Math.min(Math.abs(t - d), 1 - Math.abs(t - d));
    if (dist < 0.055) {
      const w = 1 - dist / 0.055;
      inlet = Math.max(inlet, w * w);
    }
  }

  // Closest stretches keep a wide sand buffer past runoff (~16–24m).
  const near = COAST_BEACH_MIN + jagged * 8;
  const far = 36 + b * 28; // ~36–64m
  const mix = Math.pow(0.2 + 0.8 * (0.5 * c + 0.3 * a + 0.2 * b), 1.25);
  let extra = near * (1 - mix) + far * mix;
  // Inlet pull is capped so soft bays stay outside the hard beach floor.
  extra = extra * (1 - inlet * 0.55) + near * inlet;
  return Math.max(COAST_BEACH_MIN, extra);
}

/** Push shoreline vertices outward until every point clears the beach floor. */
function enforceCoastShoreClearance(
  inner: { x: number; z: number }[],
  outDir: { x: number; z: number }[],
  clearance: PathClearance,
  minWaterR2: number,
) {
  const n = inner.length;
  const fracs = [0.15, 0.3, 0.45, 0.5, 0.55, 0.7, 0.85];

  // Per-vertex floor (normals can undershoot on sharp bends).
  for (let i = 0; i < n; i++) {
    const p = inner[i]!;
    const d = outDir[i]!;
    let guard = 0;
    while (clearance.minDist2(p.x, p.z) < minWaterR2 && guard < 48) {
      p.x += d.x * 1.5;
      p.z += d.z * 1.5;
      guard++;
    }
  }

  // Chord / polygon edges cut toward the ribbon on concave bends — sample
  // several points along each edge and push endpoints outward until clear.
  for (let pass = 0; pass < 16; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const a = inner[i]!;
      const b = inner[(i + 1) % n]!;
      const d0 = outDir[i]!;
      const d1 = outDir[(i + 1) % n]!;
      let needsPush = clearance.minDist2(a.x, a.z) < minWaterR2
        || clearance.minDist2(b.x, b.z) < minWaterR2;
      if (!needsPush) {
        for (const f of fracs) {
          const mx = a.x + (b.x - a.x) * f;
          const mz = a.z + (b.z - a.z) * f;
          if (clearance.minDist2(mx, mz) < minWaterR2) {
            needsPush = true;
            break;
          }
        }
      }
      if (!needsPush) continue;
      a.x += d0.x * 2.25;
      a.z += d0.z * 2.25;
      b.x += d1.x * 2.25;
      b.z += d1.z * 2.25;
      moved = true;
    }
    if (!moved) break;
  }
}

/** Far ocean + irregular coastal strip so the sea approaches the track in places. */
function plantCoastWater(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
) {
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1a6a9a,
    metalness: 0.35,
    roughness: 0.22,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  // Far ocean well below sand (−0.12). Kept modestly larger than the AABB so
  // the horizon reads as sea past the shoreline strip — not a cover for the
  // racing ribbon (sand + runoff sit above it).
  const span = Math.max(bounds.spanX, bounds.spanZ) * 1.35;
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(span, span), waterMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(bounds.cx, -0.55, bounds.cz);
  ocean.receiveShadow = false;
  ocean.userData.surface = "water";
  ocean.renderOrder = -2;
  group.add(ocean);

  // Shoreline strip above the sand: inner edge follows a wavy beach width so
  // the water comes nearer in inlets and stays farther on wide beaches.
  // Hard floor: water geometry stays outside runoff + COAST_BEACH_MIN.
  const pathLen = path.getLength();
  const samples = Math.max(480, Math.min(960, Math.ceil(pathLen / 1.25)));
  const minWaterR = clearance.runoffClear + COAST_BEACH_MIN;
  const minWaterR2 = minWaterR * minWaterR;
  // Absolute reject for residual chords that still nick the shoulder ribbon.
  const ribbonR2 = clearance.runoffClear * clearance.runoffClear;
  const inner: { x: number; z: number }[] = [];
  const outer: { x: number; z: number }[] = [];
  const outDir: { x: number; z: number }[] = [];
  const tan = new THREE.Vector3();
  const n = new THREE.Vector3();
  const outerLat = Math.max(bounds.spanX, bounds.spanZ) * 0.72;
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const p = path.getPointAt(t);
    tan.copy(path.getTangentAt(t)).normalize();
    n.set(-tan.z, 0, tan.x);
    const probe = clearance.runoffClear + 2;
    // Outward = opposite of the infield side
    const outSign = clearance.insideLoop(p.x + n.x * probe, p.z + n.z * probe) ? -1 : 1;
    const ox = n.x * outSign;
    const oz = n.z * outSign;
    let latIn = clearance.runoffClear + coastBeachExtra(t);
    // Push past ribbon if lateral offset lands inside hard beach floor
    // (sharp bends / sample aliasing can undershoot).
    let ix = p.x + ox * latIn;
    let iz = p.z + oz * latIn;
    let guard = 0;
    while (clearance.minDist2(ix, iz) < minWaterR2 && guard < 40) {
      latIn += 1.5;
      ix = p.x + ox * latIn;
      iz = p.z + oz * latIn;
      guard++;
    }
    const latOut = Math.max(latIn + 28, outerLat);
    inner.push({ x: ix, z: iz });
    outer.push({
      x: p.x + ox * latOut,
      z: p.z + oz * latOut,
    });
    outDir.push({ x: ox, z: oz });
  }

  enforceCoastShoreClearance(inner, outDir, clearance, minWaterR2);
  // Second pass against runoff itself (stricter than beach floor on bad chords).
  enforceCoastShoreClearance(inner, outDir, clearance, ribbonR2);

  // Keep outer ring outside the cleared inner edge.
  for (let i = 0; i < samples; i++) {
    const inn = inner[i]!;
    const d = outDir[i]!;
    const out = outer[i]!;
    const dx = out.x - inn.x;
    const dz = out.z - inn.z;
    const along = dx * d.x + dz * d.z;
    if (along < 24) {
      out.x = inn.x + d.x * 28;
      out.z = inn.z + d.z * 28;
    }
  }

  // Above sand (−0.12), well below runoff (−0.02) so shoulder always wins if
  // any residual overlap remains.
  const shore = new THREE.Mesh(ringStripGeometry(inner, outer, -0.1), waterMat.clone());
  shore.receiveShadow = false;
  shore.userData.surface = "water";
  shore.renderOrder = -1;
  group.add(shore);
}

/** Keep coast palms on sand — drop any that sit past the local shoreline into the sea. */
function filterPosesToCoastSand(
  poses: TreePose[],
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
): TreePose[] {
  const sampleN = 128;
  const samples: THREE.Vector3[] = [];
  for (let i = 0; i < sampleN; i++) samples.push(path.getPointAt(i / sampleN));

  return poses.filter((pose) => {
    if (clearance.insideLoop(pose.x, pose.z)) return true;
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < sampleN; i++) {
      const p = samples[i]!;
      const d = (p.x - pose.x) * (p.x - pose.x) + (p.z - pose.z) * (p.z - pose.z);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    const beachR = clearance.runoffClear + coastBeachExtra(bestI / sampleN);
    // Keep palms on sand inward of the shoreline; never plant into the sea strip.
    const limit = Math.max(clearance.runoffClear + COAST_BEACH_MIN * 0.5, beachR - pose.scale * 1.2);
    return bestD <= limit * limit;
  });
}

/** Rocks, mesas, mountains, water, city — never on ribbon or infield. */
function plantBiomeProps(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  biome: BiomeStyle,
  clearance: PathClearance,
  poses: TreePose[],
  bounds: ReturnType<typeof pathBounds>,
) {
  const dummy = new THREE.Object3D();

  if (biome.props === "water") {
    plantCoastWater(group, path, clearance, bounds);
  }

  if (biome.props === "rocks" || biome.props === "mesas") {
    const rockMat = new THREE.MeshStandardMaterial({
      color: biome.props === "mesas" ? 0xb86a32 : 0x7a8088,
      roughness: 0.95,
      metalness: 0.05,
    });
    const geo =
      biome.props === "mesas"
        ? new THREE.BoxGeometry(1, 1, 1)
        : new THREE.ConeGeometry(1.2, 2.8, 5);
    const count = Math.min(220, Math.max(40, Math.floor(poses.length * 0.22)));
    const mesh = new THREE.InstancedMesh(geo, rockMat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.count = 0;
    for (let i = 0; i < poses.length && mesh.count < count; i++) {
      if (hash2(i * 13, Math.round(poses[i]!.x)) < 0.62) continue;
      const p = poses[i]!;
      const s =
        biome.props === "mesas"
          ? 4 + p.jitter * 10
          : 2.5 + p.jitter * 6;
      const h = biome.props === "mesas" ? 3 + p.jitter * 14 : 2 + p.jitter * 8;
      const footprint = biome.props === "mesas" ? s * 0.75 : s * 0.65;
      if (!clearance.sceneryOk(p.x, p.z, footprint)) continue;
      dummy.position.set(p.x, biome.props === "mesas" ? h * 0.5 : h * 0.35, p.z);
      dummy.scale.set(
        biome.props === "mesas" ? s : s * 0.7,
        h,
        biome.props === "mesas" ? s * (0.7 + p.jitter * 0.5) : s * 0.7,
      );
      dummy.rotation.set(0, p.jitter * 6, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  // Canyon Cut — continuous cliff walls hugging both sides of the ribbon
  if (biome.props === "canyon") {
    plantCanyonWalls(group, path, clearance, dummy, bounds);
  }

  // Summit Pass — horizon backdrop ring (never beside the track)
  if (biome.props === "mountains") {
    const rockFar = new THREE.MeshStandardMaterial({
      color: 0x7a8694,
      roughness: 0.95,
      metalness: 0.03,
      flatShading: true,
      // Soft fill so the skyline reads under night fog
      emissive: 0x2a3440,
      emissiveIntensity: 0.08,
    });
    const rockMid = new THREE.MeshStandardMaterial({
      color: 0x8a949e,
      roughness: 0.93,
      metalness: 0.04,
      flatShading: true,
      emissive: 0x303844,
      emissiveIntensity: 0.06,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf2f6fa,
      roughness: 0.7,
      metalness: 0.02,
      flatShading: true,
      emissive: 0xa8b4c4,
      emissiveIntensity: 0.2,
    });
    const rangeGeo = createMountainRangeGeometry();
    const hillGeo = createFoothillGeometry();
    const boulderGeo = new THREE.DodecahedronGeometry(1, 0);

    // Continuous skyline around the circuit center
    const backdropN = 32;
    const midN = 20;
    const snowN = backdropN;
    const ranges = new THREE.InstancedMesh(rangeGeo, rockFar, backdropN);
    const mids = new THREE.InstancedMesh(hillGeo, rockMid, midN);
    const snow = new THREE.InstancedMesh(rangeGeo, snowMat, snowN);
    const boulderCount = Math.min(70, Math.max(20, Math.floor(poses.length * 0.1)));
    const boulders = new THREE.InstancedMesh(boulderGeo, rockMid, boulderCount);
    ranges.count = 0;
    mids.count = 0;
    snow.count = 0;
    boulders.count = 0;
    for (const mesh of [ranges, mids, snow, boulders]) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
    }

    const cx = bounds.cx;
    const cz = bounds.cz;
    // Sit past the course — horizon ring (capped so night fog still shows them)
    const backdropR = Math.min(290, Math.max(bounds.spanX, bounds.spanZ) * 0.55 + 180);
    const midR = Math.min(230, Math.max(bounds.spanX, bounds.spanZ) * 0.5 + 120);

    for (let i = 0; i < backdropN; i++) {
      const a = (i / backdropN) * Math.PI * 2;
      const x = cx + Math.cos(a) * backdropR;
      const z = cz + Math.sin(a) * backdropR;
      const along = 55 + hash2(i, 5) * 25;
      const thick = 18 + hash2(i, 7) * 10;
      const h = 45 + hash2(i, 11) * 35;
      // Face the circuit: local X runs along the ring, local Z points inward
      const yaw = a + Math.PI / 2;

      dummy.position.set(x, -4, z);
      dummy.scale.set(along, h, thick);
      dummy.rotation.set(0, yaw + (hash2(i, 13) - 0.5) * 0.08, 0);
      dummy.updateMatrix();
      ranges.setMatrixAt(ranges.count++, dummy.matrix);

      dummy.position.set(x, h * 0.5, z);
      dummy.scale.set(along * 0.48, h * 0.28, thick * 0.48);
      dummy.updateMatrix();
      snow.setMatrixAt(snow.count++, dummy.matrix);
    }

    // Slightly nearer mid-horizon band (still far from the ribbon)
    for (let i = 0; i < midN; i++) {
      const a = ((i + 0.5) / midN) * Math.PI * 2;
      const x = cx + Math.cos(a) * midR;
      const z = cz + Math.sin(a) * midR;
      // Skip if somehow still too close to asphalt
      if (!clearance.sceneryOk(x, z, 20)) continue;
      const along = 40 + hash2(i, 17) * 18;
      const thick = 12 + hash2(i, 19) * 8;
      const h = 18 + hash2(i, 23) * 16;
      const yaw = a + Math.PI / 2;

      dummy.position.set(x, -2.5, z);
      dummy.scale.set(along, h, thick);
      dummy.rotation.set(0, yaw + (hash2(i, 29) - 0.5) * 0.12, 0);
      dummy.updateMatrix();
      mids.setMatrixAt(mids.count++, dummy.matrix);
    }

    // Small rocks only near the course (not mountain walls)
    for (let i = 0; i < poses.length && boulders.count < boulderCount; i++) {
      if (hash2(i * 13, Math.round(poses[i]!.x)) < 0.65) continue;
      const p = poses[i]!;
      const s = 1.1 + p.jitter * 2.8;
      if (!clearance.sceneryOk(p.x, p.z, s * 0.8)) continue;
      dummy.position.set(p.x, s * 0.38, p.z);
      dummy.scale.set(s, s * (0.65 + p.jitter * 0.4), s);
      dummy.rotation.set(p.jitter * 1.2, p.jitter * 6, p.jitter * 0.8);
      dummy.updateMatrix();
      boulders.setMatrixAt(boulders.count++, dummy.matrix);
    }

    for (const mesh of [ranges, mids, snow, boulders]) {
      if (!mesh.count) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }

    // Pine grove in the infield center (clear of asphalt / runoff)
    plantAlpineInfieldTrees(group, path, clearance, dummy, bounds);
  }

  if (biome.props === "lights") {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.6, roughness: 0.4 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff0c8,
      emissive: 0xffe8a0,
      emissiveIntensity: 1.4,
      roughness: 0.35,
    });
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 5);
    const lampGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const lightCount = Math.min(80, Math.max(24, Math.floor(poses.length * 0.08)));
    const posts = new THREE.InstancedMesh(postGeo, postMat, lightCount);
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lightCount);
    posts.count = 0;
    lamps.count = 0;
    posts.castShadow = false;
    lamps.castShadow = false;
    for (let i = 0; i < poses.length && posts.count < lightCount; i++) {
      if (hash2(i * 19, Math.round(poses[i]!.z)) < 0.7) continue;
      const p = poses[i]!;
      if (!clearance.sceneryOk(p.x, p.z, 0.9)) continue;
      dummy.position.set(p.x, 3.25, p.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(posts.count++, dummy.matrix);
      dummy.position.set(p.x, 6.55, p.z);
      dummy.updateMatrix();
      lamps.setMatrixAt(lamps.count++, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();
    lamps.computeBoundingSphere();
    group.add(posts);
    group.add(lamps);
  }

  // City Circuit — downtown outfield + park in the infield
  if (biome.props === "city") {
    plantCity(group, path, clearance, dummy, bounds);
  }
}

/** Red-rock canyon corridor — cliff walls on both sides of the track. */
function plantCanyonWalls(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  dummy: THREE.Object3D,
  bounds: ReturnType<typeof pathBounds>,
) {
  const ringTan = new THREE.Vector3();
  const ringN = new THREE.Vector3();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  const cliffMats = [
    new THREE.MeshStandardMaterial({ color: 0xb86a32, roughness: 0.96, metalness: 0.04, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xc47a3a, roughness: 0.95, metalness: 0.04, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x9a5528, roughness: 0.97, metalness: 0.03, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xd4924a, roughness: 0.94, metalness: 0.05, flatShading: true }),
  ];
  const strataMat = new THREE.MeshStandardMaterial({
    color: 0xe0b070,
    roughness: 0.9,
    metalness: 0.04,
    flatShading: true,
  });

  const segN = 96;
  // near + far wall × both sides, spread across mats
  const cliffs = cliffMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(boxGeo, mat, segN * 4);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  });
  const strata = new THREE.InstancedMesh(boxGeo, strataMat, segN * 2);
  strata.count = 0;
  strata.castShadow = false;

  // Continuous walls left + right of the racing ribbon
  for (let i = 0; i < segN; i++) {
    const t = i / segN;
    const p = path.getPointAt(t);
    ringTan.copy(path.getTangentAt(t)).normalize();
    ringN.set(-ringTan.z, 0, ringTan.x);
    const yaw = Math.atan2(ringTan.x, ringTan.z);

    for (const side of [-1, 1] as const) {
      // Near cliff face — just outside runoff
      const depth = 10 + hash2(i, 3 + side) * 8;
      const along = 14 + hash2(i, 5 + side) * 6;
      const h = 16 + hash2(i, 7 + side) * 22;
      const lat = clearance.runoffClear + 2.2 + depth * 0.5;
      const x = p.x + ringN.x * side * lat;
      const z = p.z + ringN.z * side * lat;
      if (!clearance.outsideRunoff(x, z, depth * 0.5 + 0.6)) continue;

      const mi = Math.floor(hash2(i * 3 + side, 11) * cliffMats.length) % cliffMats.length;
      const mesh = cliffs[mi]!;
      if (mesh.count >= mesh.instanceMatrix.count) continue;
      dummy.position.set(x, h * 0.48, z);
      dummy.scale.set(along, h, depth);
      dummy.rotation.set(0, yaw + (hash2(i, 13) - 0.5) * 0.08, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++, dummy.matrix);

      // Light strata band near the top
      if (strata.count < strata.instanceMatrix.count) {
        dummy.position.set(x, h * 0.78, z);
        dummy.scale.set(along * 0.98, h * 0.1, depth * 0.98);
        dummy.updateMatrix();
        strata.setMatrixAt(strata.count++, dummy.matrix);
      }

      // Outer buttress / second ridge for depth
      const depth2 = 14 + hash2(i, 17 + side) * 12;
      const h2 = 22 + hash2(i, 19 + side) * 28;
      const lat2 = lat + depth * 0.55 + depth2 * 0.45;
      const x2 = p.x + ringN.x * side * lat2;
      const z2 = p.z + ringN.z * side * lat2;
      const mi2 = (mi + 1) % cliffMats.length;
      const mesh2 = cliffs[mi2]!;
      if (mesh2.count >= mesh2.instanceMatrix.count) continue;
      dummy.position.set(x2, h2 * 0.45, z2);
      dummy.scale.set(along * 1.15, h2, depth2);
      dummy.rotation.set(0, yaw + (hash2(i, 23) - 0.5) * 0.12, 0);
      dummy.updateMatrix();
      mesh2.setMatrixAt(mesh2.count++, dummy.matrix);
    }
  }

  for (const mesh of cliffs) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  if (strata.count) {
    strata.instanceMatrix.needsUpdate = true;
    strata.computeBoundingSphere();
    group.add(strata);
  }

  // A few distant mesa buttes outside the canyon rim
  const mesaMat = cliffMats[0]!;
  const mesaN = 28;
  const mesas = new THREE.InstancedMesh(boxGeo, mesaMat, mesaN);
  mesas.count = 0;
  mesas.castShadow = false;
  mesas.receiveShadow = true;
  const cx = bounds.cx;
  const cz = bounds.cz;
  const rimR = Math.max(bounds.spanX, bounds.spanZ) * 0.55 + 40;
  for (let i = 0; i < mesaN; i++) {
    const a = (i / mesaN) * Math.PI * 2 + hash2(i, 29) * 0.4;
    const r = rimR + hash2(i, 31) * 35;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    if (!clearance.sceneryOk(x, z, 12)) continue;
    const w = 8 + hash2(i, 37) * 14;
    const h = 12 + hash2(i, 41) * 20;
    dummy.position.set(x, h * 0.5, z);
    dummy.scale.set(w, h, w * (0.7 + hash2(i, 43) * 0.5));
    dummy.rotation.set(0, hash2(i, 47) * 6, 0);
    dummy.updateMatrix();
    mesas.setMatrixAt(mesas.count++, dummy.matrix);
  }
  if (mesas.count) {
    mesas.instanceMatrix.needsUpdate = true;
    mesas.computeBoundingSphere();
    group.add(mesas);
  }
}

/** Spread points across the infield — full-loop grid + min spacing (not AABB-center only). */
function collectSpacedInfieldPoints(
  _path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
  opts: {
    count: number;
    minSep?: number;
    clearFoot?: number;
    /** Extra reject (e.g. park pond / path). */
    exclude?: (x: number, z: number) => boolean;
  },
): { x: number; z: number; i: number }[] {
  // pathBounds pads by 48 — search the tight path AABB so large pinched circuits
  // (e.g. Meadow Sweep) still fill open lobes when the geometric center sits on asphalt.
  const pad = 48;
  const minX = bounds.minX + pad;
  const maxX = bounds.maxX - pad;
  const minZ = bounds.minZ + pad;
  const maxZ = bounds.maxZ - pad;
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);

  const minSep = opts.minSep ?? 7.5;
  const minSep2 = minSep * minSep;
  const clearFoot = opts.clearFoot ?? 2.4;
  // Aim for ~count candidates across the bbox; insideLoop + clearance thin the set.
  const step = Math.max(
    minSep * 0.9,
    Math.min(18, Math.sqrt((spanX * spanZ) / Math.max(12, opts.count * 2.2))),
  );
  const out: { x: number; z: number; i: number }[] = [];
  let attempt = 0;
  for (let gx = minX; gx <= maxX && out.length < opts.count; gx += step) {
    for (let gz = minZ; gz <= maxZ && out.length < opts.count; gz += step) {
      attempt += 1;
      const x = gx + (hash2(attempt, 3) - 0.5) * step * 0.85;
      const z = gz + (hash2(attempt, 5) - 0.5) * step * 0.85;
      if (!clearance.insideLoop(x, z)) continue;
      if (!clearance.clearOf(x, z, clearFoot)) continue;
      if (opts.exclude?.(x, z)) continue;
      let ok = true;
      for (const p of out) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz < minSep2) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      out.push({ x, z, i: attempt });
    }
  }
  return out;
}

/** Pine trees in the Summit Pass infield — inside the loop, off the ribbon. */
function plantAlpineInfieldTrees(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  dummy: THREE.Object3D,
  bounds: ReturnType<typeof pathBounds>,
) {
  const points = collectSpacedInfieldPoints(path, clearance, bounds, { count: 48, minSep: 7.5 });
  if (!points.length) return;

  const mats = VEG_MATS.pines;
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 2.2, 5);
  const canopyGeo = new THREE.ConeGeometry(1.1, 2.6, 6);
  const treeN = points.length;
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, treeN);
  trunks.count = 0;
  trunks.castShadow = false;
  trunks.userData.sharedVegMat = true;
  const canopies = mats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(canopyGeo, mat, treeN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });
  const tops = mats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(canopyGeo, mat, treeN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });

  for (const { x, z, i } of points) {
    const scale = 0.7 + hash2(i, 7) * 0.65;
    dummy.position.set(x, 1.1 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, hash2(i, 11) * 6, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(trunks.count++, dummy.matrix);

    const ci = Math.floor(hash2(i, 13) * canopies.length) % canopies.length;
    const canopy = canopies[ci]!;
    const cr = scale * (1.05 + hash2(i, 17) * 0.25);
    dummy.position.set(x, 2.2 * scale, z);
    dummy.scale.set(cr, cr * 1.25, cr);
    dummy.updateMatrix();
    canopy.setMatrixAt(canopy.count++, dummy.matrix);

    const top = tops[ci]!;
    dummy.position.set(x, 2.2 * scale + 1.1 * scale, z);
    dummy.scale.set(cr * 0.62, cr * 0.95, cr * 0.62);
    dummy.updateMatrix();
    top.setMatrixAt(top.count++, dummy.matrix);
  }

  trunks.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  group.add(trunks);
  for (const mesh of [...canopies, ...tops]) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
}

/** Procedural low-poly window-grid map for city facades (shared across instances). */
function makeCityFacadeMap(opts: {
  wall: string;
  frame: string;
  lit: string;
  dark: string;
  cols: number;
  rows: number;
  seed: number;
  litChance: number;
}): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = opts.wall;
  ctx.fillRect(0, 0, size, size);

  // Ground-floor band — darker storefront strip
  ctx.fillStyle = opts.frame;
  ctx.fillRect(0, size * 0.86, size, size * 0.14);

  const padX = size * 0.06;
  const padY = size * 0.05;
  const usableW = size - padX * 2;
  const usableH = size * 0.78;
  const cellW = usableW / opts.cols;
  const cellH = usableH / opts.rows;
  const gapX = cellW * 0.22;
  const gapY = cellH * 0.28;

  for (let row = 0; row < opts.rows; row++) {
    for (let col = 0; col < opts.cols; col++) {
      const lit = hash2(opts.seed + row * 17 + col, opts.seed + 41) < opts.litChance;
      ctx.fillStyle = lit ? opts.lit : opts.dark;
      const x = padX + col * cellW + gapX * 0.5;
      const y = padY + row * cellH + gapY * 0.5;
      ctx.fillRect(x, y, cellW - gapX, cellH - gapY);
    }
  }

  // Thin mullion lines for facade depth
  ctx.strokeStyle = opts.frame;
  ctx.lineWidth = 1;
  for (let c = 1; c < opts.cols; c++) {
    const x = padX + c * cellW;
    ctx.beginPath();
    ctx.moveTo(x, padY);
    ctx.lineTo(x, padY + usableH);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

type CityFacadeStyle = {
  roughness: number;
  metalness: number;
  emissive?: number;
  emissiveIntensity?: number;
  map: ReturnType<typeof makeCityFacadeMap>;
  repeatY: number;
};

/** Downtown skyline outside the oval; green park in the center infield. */
function plantCity(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  dummy: THREE.Object3D,
  bounds: ReturnType<typeof pathBounds>,
) {
  const ringTan = new THREE.Vector3();
  const ringN = new THREE.Vector3();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 1, 5);

  const facadeStyles: CityFacadeStyle[] = [
    {
      // Warm limestone mid-rise
      roughness: 0.88,
      metalness: 0.05,
      map: makeCityFacadeMap({
        wall: "#c4b49a",
        frame: "#9a8a72",
        lit: "#ffe8a8",
        dark: "#3a4a58",
        cols: 5,
        rows: 7,
        seed: 11,
        litChance: 0.35,
      }),
      repeatY: 1.2,
    },
    {
      // Terracotta brick
      roughness: 0.92,
      metalness: 0.04,
      map: makeCityFacadeMap({
        wall: "#9a5a48",
        frame: "#6e3e32",
        lit: "#ffd090",
        dark: "#2a3038",
        cols: 4,
        rows: 6,
        seed: 23,
        litChance: 0.28,
      }),
      repeatY: 1,
    },
    {
      // Cool concrete office
      roughness: 0.82,
      metalness: 0.12,
      map: makeCityFacadeMap({
        wall: "#8a929c",
        frame: "#5a626c",
        lit: "#d8ecff",
        dark: "#1e2834",
        cols: 6,
        rows: 8,
        seed: 37,
        litChance: 0.42,
      }),
      repeatY: 1.4,
    },
    {
      // Slate blue tower
      roughness: 0.55,
      metalness: 0.32,
      emissive: 0x1a2838,
      emissiveIntensity: 0.22,
      map: makeCityFacadeMap({
        wall: "#4a5a6e",
        frame: "#2e3a48",
        lit: "#a8d4ff",
        dark: "#121820",
        cols: 5,
        rows: 9,
        seed: 53,
        litChance: 0.5,
      }),
      repeatY: 1.6,
    },
    {
      // Charcoal high-rise with warm lit windows
      roughness: 0.6,
      metalness: 0.28,
      emissive: 0x241810,
      emissiveIntensity: 0.28,
      map: makeCityFacadeMap({
        wall: "#2e343c",
        frame: "#1a1e24",
        lit: "#ffc878",
        dark: "#0c1014",
        cols: 4,
        rows: 10,
        seed: 71,
        litChance: 0.55,
      }),
      repeatY: 1.8,
    },
    {
      // Pale stucco / cream low-rise
      roughness: 0.9,
      metalness: 0.03,
      map: makeCityFacadeMap({
        wall: "#d2c8b4",
        frame: "#a89c88",
        lit: "#fff0c0",
        dark: "#3a4854",
        cols: 4,
        rows: 5,
        seed: 89,
        litChance: 0.3,
      }),
      repeatY: 0.9,
    },
  ];

  const facadeMats = facadeStyles.map((s) => {
    const map = s.map.clone();
    map.repeat.set(1, s.repeatY);
    map.needsUpdate = true;
    // Map already carries wall + window colors; keep albedo white so it isn't double-tinted
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      roughness: s.roughness,
      metalness: s.metalness,
      emissive: s.emissive ?? 0x000000,
      emissiveIntensity: s.emissiveIntensity ?? 0,
    });
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x5eb8d4,
    roughness: 0.18,
    metalness: 0.62,
    transparent: true,
    opacity: 0.55,
    emissive: 0x1a4058,
    emissiveIntensity: 0.15,
  });
  const glassMatTeal = new THREE.MeshStandardMaterial({
    color: 0x3a9a8c,
    roughness: 0.2,
    metalness: 0.58,
    transparent: true,
    opacity: 0.58,
    emissive: 0x0a3028,
    emissiveIntensity: 0.12,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.95, metalness: 0.08 });
  const roofMatWarm = new THREE.MeshStandardMaterial({ color: 0x4a3a32, roughness: 0.92, metalness: 0.06 });
  const mechMat = new THREE.MeshStandardMaterial({ color: 0x5a626c, roughness: 0.7, metalness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x6a7888, roughness: 0.55, metalness: 0.4 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.9, metalness: 0.05 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.55, roughness: 0.45 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c8,
    emissive: 0xffe8a0,
    emissiveIntensity: 1.5,
    roughness: 0.35,
  });

  const outfieldSign = (t: number, lat: number) => {
    const p = path.getPointAt(t);
    ringTan.copy(path.getTangentAt(t)).normalize();
    ringN.set(-ringTan.z, 0, ringTan.x);
    const x1 = p.x + ringN.x * lat;
    const z1 = p.z + ringN.z * lat;
    return clearance.insideLoop(x1, z1) ? -1 : 1;
  };

  // Sidewalk curb strip just outside runoff
  const curbN = 80;
  const curbs = new THREE.InstancedMesh(boxGeo, curbMat, curbN);
  curbs.count = 0;
  for (let i = 0; i < curbN; i++) {
    const t = i / curbN;
    const lat = clearance.runoffClear + 1.1;
    const side = outfieldSign(t, lat);
    const p = path.getPointAt(t);
    ringTan.copy(path.getTangentAt(t)).normalize();
    ringN.set(-ringTan.z, 0, ringTan.x);
    const x = p.x + ringN.x * side * lat;
    const z = p.z + ringN.z * side * lat;
    if (clearance.insideLoop(x, z)) continue;
    if (!clearance.outsideRunoff(x, z, 0.6)) continue;
    dummy.position.set(x, 0.18, z);
    dummy.scale.set(4.2, 0.28, 1.1);
    dummy.rotation.set(0, Math.atan2(ringTan.x, ringTan.z), 0);
    dummy.updateMatrix();
    curbs.setMatrixAt(curbs.count++, dummy.matrix);
  }
  curbs.instanceMatrix.needsUpdate = true;
  curbs.computeBoundingSphere();
  group.add(curbs);

  // Streetlights along the outer curb
  const lightN = 36;
  const posts = new THREE.InstancedMesh(poleGeo, postMat, lightN);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 6, 6), lampMat, lightN);
  posts.count = 0;
  lamps.count = 0;
  for (let i = 0; i < lightN; i++) {
    const t = (i + 0.5) / lightN;
    const lat = clearance.runoffClear + 2.4;
    const side = outfieldSign(t, lat);
    const p = path.getPointAt(t);
    ringTan.copy(path.getTangentAt(t)).normalize();
    ringN.set(-ringTan.z, 0, ringTan.x);
    const x = p.x + ringN.x * side * lat;
    const z = p.z + ringN.z * side * lat;
    if (clearance.insideLoop(x, z) || !clearance.outsideRunoff(x, z, 0.8)) continue;
    dummy.position.set(x, 3.4, z);
    dummy.scale.set(1, 6.8, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    posts.setMatrixAt(posts.count++, dummy.matrix);
    dummy.position.set(x, 6.9, z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lamps.setMatrixAt(lamps.count++, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  posts.computeBoundingSphere();
  lamps.computeBoundingSphere();
  group.add(posts);
  group.add(lamps);

  // City blocks — multi-part low-poly towers in outfield rings
  const buildingCount = 150;
  const perMat = Math.ceil(buildingCount / facadeMats.length) + 8;
  const buildings = facadeMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(boxGeo, mat, perMat);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  });
  // Setbacks / upper volumes reuse facade mats (extra capacity)
  const setbacks = facadeMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(boxGeo, mat, Math.ceil(buildingCount * 0.55));
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  });
  const glassCount = 55;
  const glass = new THREE.InstancedMesh(boxGeo, glassMat, glassCount);
  glass.count = 0;
  glass.castShadow = false;
  const glassTeal = new THREE.InstancedMesh(boxGeo, glassMatTeal, 28);
  glassTeal.count = 0;
  glassTeal.castShadow = false;

  const roofCapN = buildingCount + 20;
  const roofs = new THREE.InstancedMesh(boxGeo, roofMat, roofCapN);
  const roofsWarm = new THREE.InstancedMesh(boxGeo, roofMatWarm, Math.ceil(buildingCount * 0.45));
  roofs.count = 0;
  roofsWarm.count = 0;
  roofs.castShadow = false;
  roofsWarm.castShadow = false;

  const mechN = Math.ceil(buildingCount * 1.4);
  const mech = new THREE.InstancedMesh(boxGeo, mechMat, mechN);
  mech.count = 0;
  mech.castShadow = false;
  const accents = new THREE.InstancedMesh(boxGeo, accentMat, Math.ceil(buildingCount * 0.35));
  accents.count = 0;
  accents.castShadow = false;

  const pushBox = (
    mesh: THREE.InstancedMesh,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    yaw: number,
  ) => {
    if (mesh.count >= mesh.instanceMatrix.count) return false;
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, yaw, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count++, dummy.matrix);
    return true;
  };

  let placed = 0;
  for (let i = 0; i < buildingCount * 3 && placed < buildingCount; i++) {
    const t = (i * 0.271) % 1;
    const row = i % 3; // near / mid / far skyline bands
    const lat = clearance.runoffClear + 14 + row * 16 + hash2(i, 5) * 10;
    const side = outfieldSign(t, lat);
    const p = path.getPointAt(t);
    ringTan.copy(path.getTangentAt(t)).normalize();
    ringN.set(-ringTan.z, 0, ringTan.x);
    const along = (hash2(i, 7) - 0.5) * 12;
    const x = p.x + ringN.x * side * lat + ringTan.x * along;
    const z = p.z + ringN.z * side * lat + ringTan.z * along;

    // Varied footprints: squat slabs, square blocks, slim towers
    const shape = hash2(i, 11);
    let w: number;
    let d: number;
    if (shape < 0.28) {
      // Wide slab / podium
      w = 9 + hash2(i, 12) * 12;
      d = 5 + hash2(i, 13) * 6;
    } else if (shape < 0.55) {
      // Deep warehouse / office wing
      w = 5 + hash2(i, 12) * 6;
      d = 9 + hash2(i, 13) * 11;
    } else if (shape < 0.78) {
      // Square mid-block
      const s = 6 + hash2(i, 12) * 8;
      w = s;
      d = s * (0.85 + hash2(i, 13) * 0.3);
    } else {
      // Slim tower
      w = 4 + hash2(i, 12) * 4;
      d = 4 + hash2(i, 13) * 4;
    }

    const hMax = row === 2 ? 52 : row === 1 ? 36 : 20;
    const hMin = row === 2 ? 14 : row === 1 ? 10 : 6;
    let h = hMin + hash2(i, 17) * (hMax - hMin);
    // Near-track band stays shorter so skyline steps up away from the circuit
    if (row === 0) h *= 0.85;

    const footprint = Math.max(w, d) * 0.55;
    if (clearance.insideLoop(x, z)) continue;
    if (!clearance.sceneryOk(x, z, footprint)) continue;

    const mi = Math.floor(hash2(i, 19) * facadeMats.length) % facadeMats.length;
    const bodyMesh = buildings[mi]!;
    if (bodyMesh.count >= bodyMesh.instanceMatrix.count) continue;
    const yaw = Math.atan2(ringTan.x, ringTan.z) + (hash2(i, 23) > 0.65 ? Math.PI * 0.5 : 0);

    // Split tall buildings into podium + setback tower for silhouette
    const stepped = h > 18 && hash2(i, 31) > 0.38;
    const bodyH = stepped ? h * (0.55 + hash2(i, 33) * 0.18) : h;
    const setH = stepped ? h - bodyH : 0;

    if (!pushBox(bodyMesh, x, bodyH * 0.5, z, w, bodyH, d, yaw)) continue;
    placed += 1;

    let topY = bodyH;
    let topW = w;
    let topD = d;

    if (stepped && setH > 3) {
      const setMesh = setbacks[mi]!;
      const sw = w * (0.55 + hash2(i, 35) * 0.25);
      const sd = d * (0.55 + hash2(i, 37) * 0.25);
      if (pushBox(setMesh, x, bodyH + setH * 0.5, z, sw, setH, sd, yaw)) {
        topY = bodyH + setH;
        topW = sw;
        topD = sd;
      }
    }

    // Thin glass curtain shell on taller / modern styles
    const isGlassStyle = mi === 3 || mi === 4 || hash2(i, 29) > 0.72;
    if (h > 22 && isGlassStyle) {
      const gMesh = hash2(i, 41) > 0.55 ? glass : glassTeal;
      const gH = stepped ? setH * 0.92 || bodyH * 0.65 : bodyH * 0.72;
      const gY = stepped && setH > 3 ? bodyH + gH * 0.5 : gH * 0.55 + bodyH * 0.08;
      const gw = (stepped ? topW : w) * 0.94;
      const gd = (stepped ? topD : d) * 0.94;
      pushBox(gMesh, x, gY, z, gw, gH, gd, yaw);
    }

    // Flat roof cap
    const roofH = 0.35 + hash2(i, 43) * 0.35;
    const roofMesh = hash2(i, 45) > 0.55 ? roofs : roofsWarm;
    pushBox(roofMesh, x, topY + roofH * 0.5, z, topW * 1.02, roofH, topD * 1.02, yaw);

    // Rooftop mechanical boxes / HVAC
    if (h > 12 && mech.count + 1 < mech.instanceMatrix.count && hash2(i, 47) > 0.32) {
      const mw = topW * (0.22 + hash2(i, 49) * 0.28);
      const md = topD * (0.2 + hash2(i, 51) * 0.25);
      const mh = 1.2 + hash2(i, 53) * 2.2;
      const ox = (hash2(i, 55) - 0.5) * topW * 0.35;
      const oz = (hash2(i, 57) - 0.5) * topD * 0.35;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const mx = x + ox * cos + oz * sin;
      const mz = z - ox * sin + oz * cos;
      pushBox(mech, mx, topY + roofH + mh * 0.5, mz, mw, mh, md, yaw);

      // Second smaller unit on larger roofs
      if (topW * topD > 80 && mech.count < mech.instanceMatrix.count && hash2(i, 59) > 0.45) {
        const mw2 = topW * 0.18;
        const md2 = topD * 0.16;
        const mh2 = 0.8 + hash2(i, 61) * 1.4;
        const ox2 = (hash2(i, 63) - 0.5) * topW * 0.4;
        const oz2 = (hash2(i, 65) - 0.5) * topD * 0.4;
        const mx2 = x + ox2 * cos + oz2 * sin;
        const mz2 = z - ox2 * sin + oz2 * cos;
        pushBox(mech, mx2, topY + roofH + mh2 * 0.5, mz2, mw2, mh2, md2, yaw);
      }
    }

    // Spire / antenna on the tallest towers
    if (h > 36 && accents.count < accents.instanceMatrix.count && hash2(i, 67) > 0.55) {
      const ah = 3 + hash2(i, 69) * 5;
      pushBox(accents, x, topY + roofH + ah * 0.5, z, 0.35, ah, 0.35, yaw);
    }
  }

  for (const mesh of [...buildings, ...setbacks]) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  for (const mesh of [glass, glassTeal, roofs, roofsWarm, mech, accents]) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  plantCityPark(group, path, clearance, dummy, bounds);
}

/** Inward offset of the racing line past runoff — follows real infield shape. */
function sampleInfieldClearOutline(
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  margin: number,
  samples = 96,
): { x: number; z: number }[] {
  const tan = new THREE.Vector3();
  const n = new THREE.Vector3();
  const out: { x: number; z: number }[] = [];
  const baseLat = clearance.runoffClear + margin;
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const p = path.getPointAt(t);
    tan.copy(path.getTangentAt(t)).normalize();
    n.set(-tan.z, 0, tan.x);
    const probe = baseLat + 1;
    const sign = clearance.insideLoop(p.x + n.x * probe, p.z + n.z * probe) ? 1 : -1;
    let lat = baseLat;
    let x = p.x + n.x * sign * lat;
    let z = p.z + n.z * sign * lat;
    // Push further in if the first hit still sits on asphalt / runoff
    for (let k = 0; k < 4 && (!clearance.insideLoop(x, z) || !clearance.clearOf(x, z, 0.4)); k++) {
      lat += 1.6;
      x = p.x + n.x * sign * lat;
      z = p.z + n.z * sign * lat;
    }
    out.push({ x, z });
  }
  return out;
}

function scalePolyToward(
  pts: { x: number; z: number }[],
  cx: number,
  cz: number,
  s: number,
): { x: number; z: number }[] {
  return pts.map((p) => ({ x: cx + (p.x - cx) * s, z: cz + (p.z - cz) * s }));
}

/** Flat XZ polygon (y up) from a closed 2D ring. */
function flatPolyGeometry(pts: { x: number; z: number }[], y: number): THREE.BufferGeometry {
  const n = pts.length;
  // Fan from centroid — robust for convex infields (city oval / paperclip)
  let cx = 0;
  let cz = 0;
  for (const p of pts) {
    cx += p.x;
    cz += p.z;
  }
  cx /= n;
  cz /= n;
  // Shoelace in XZ: positive = CCW in the XZ plane, but that yields -Y normals
  // under the right-hand rule. Walk CW in XZ so FrontSide faces +Y (camera above).
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    area2 += a.x * b.z - b.x * a.z;
  }
  const ordered = area2 > 0 ? pts.slice().reverse() : pts;

  const allPos = new Float32Array((n + 1) * 3);
  allPos[0] = cx;
  allPos[1] = y;
  allPos[2] = cz;
  for (let i = 0; i < n; i++) {
    allPos[(i + 1) * 3] = ordered[i]!.x;
    allPos[(i + 1) * 3 + 1] = y;
    allPos[(i + 1) * 3 + 2] = ordered[i]!.z;
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i + 1;
    const b = (i + 1) % n + 1;
    indices.push(0, a, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(allPos, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Annular strip between two corresponding closed rings. */
function ringStripGeometry(
  inner: { x: number; z: number }[],
  outer: { x: number; z: number }[],
  y: number,
): THREE.BufferGeometry {
  const n = Math.min(inner.length, outer.length);
  const positions = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    positions[o] = inner[i]!.x;
    positions[o + 1] = y;
    positions[o + 2] = inner[i]!.z;
    positions[o + 3] = outer[i]!.x;
    positions[o + 4] = y;
    positions[o + 5] = outer[i]!.z;
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    const b = ((i + 1) % n) * 2;
    // Flip winding vs a naive strip so normals face +Y (same XZ right-hand rule)
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Green park filling the circuit infield — shaped to the loop, clear of asphalt / runoff. */
function addCityParkLawnDisc(
  group: THREE.Group,
  cx: number,
  cz: number,
  radius: number,
  y: number,
  mat: THREE.MeshStandardMaterial,
  baseColor: number,
) {
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(Math.max(12, radius), 48), mat);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(cx, y, cz);
  lawn.receiveShadow = true;
  lawn.userData.surface = "grass";
  lawn.userData.baseColor = baseColor;
  group.add(lawn);
}

function plantCityPark(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  dummy: THREE.Object3D,
  bounds: ReturnType<typeof pathBounds>,
) {
  // Bright park lawn — distinct from urban grey biome ground (0x3a4048)
  const parkLawnGreen = 0x58c94a;
  const grassMat = new THREE.MeshStandardMaterial({ color: parkLawnGreen, roughness: 1, metalness: 0 });
  // Above grey biome ground (-0.12); below runoff ribbon (-0.02)
  const lawnY = -0.05;

  // Lawn edge = racing-line inset past runoff (not a fixed AABB-center disc)
  const outline = sampleInfieldClearOutline(path, clearance, 3.2, 96);
  if (outline.length < 8) {
    // Outline failed — still paint a green disc from clear infield samples
    const pts = collectSpacedInfieldPoints(path, clearance, bounds, {
      count: 24,
      minSep: 6,
      clearFoot: 1.5,
    });
    if (!pts.length) return;
    let cx = 0;
    let cz = 0;
    for (const p of pts) {
      cx += p.x;
      cz += p.z;
    }
    cx /= pts.length;
    cz /= pts.length;
    addCityParkLawnDisc(group, cx, cz, 36, lawnY, grassMat, parkLawnGreen);
    return;
  }

  let cx = 0;
  let cz = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of outline) {
    cx += p.x;
    cz += p.z;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  cx /= outline.length;
  cz /= outline.length;
  const halfX = (maxX - minX) * 0.5;
  const halfZ = (maxZ - minZ) * 0.5;
  const minHalf = Math.min(halfX, halfZ);
  if (minHalf < 10) {
    addCityParkLawnDisc(group, cx, cz, Math.max(16, minHalf * 2), lawnY, grassMat, parkLawnGreen);
    return;
  }

  // Confirm centroid sits in clear infield (AABB center can land on asphalt)
  if (!clearance.insideLoop(cx, cz) || !clearance.clearOf(cx, cz, 1)) {
    const fallback = collectSpacedInfieldPoints(path, clearance, bounds, {
      count: 24,
      minSep: 6,
      clearFoot: 1.5,
    });
    if (!fallback.length) {
      addCityParkLawnDisc(group, bounds.cx, bounds.cz, 36, lawnY, grassMat, parkLawnGreen);
      return;
    }
    cx = 0;
    cz = 0;
    for (const p of fallback) {
      cx += p.x;
      cz += p.z;
    }
    cx /= fallback.length;
    cz /= fallback.length;
  }

  const pathMat = new THREE.MeshStandardMaterial({ color: 0xc2b89a, roughness: 0.95, metalness: 0 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2a7aaa,
    roughness: 0.2,
    metalness: 0.35,
    transparent: true,
    opacity: 0.9,
  });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.85, metalness: 0.05 });
  const trunkMat = VEG_MATS.trees.trunk;
  const canopyMats = VEG_MATS.trees.canopy;

  // Lawn fills the clear infield polygon (winding fixed in flatPolyGeometry → +Y)
  const lawn = new THREE.Mesh(flatPolyGeometry(outline, lawnY), grassMat);
  lawn.receiveShadow = true;
  lawn.userData.surface = "grass";
  lawn.userData.baseColor = parkLawnGreen;
  group.add(lawn);

  // Looping gravel path — scaled copy of the infield outline (not a circle)
  const pathInner = scalePolyToward(outline, cx, cz, 0.55);
  const pathOuter = scalePolyToward(outline, cx, cz, 0.68);
  const pathMid = scalePolyToward(outline, cx, cz, 0.615);
  const pathRing = new THREE.Mesh(ringStripGeometry(pathInner, pathOuter, -0.02), pathMat);
  pathRing.receiveShadow = true;
  group.add(pathRing);

  // Cross paths span the real infield extents
  const crossLenX = halfX * 1.05;
  const crossLenZ = halfZ * 1.05;
  for (const [len, rot] of [
    [crossLenX * 2, 0],
    [crossLenZ * 2, Math.PI / 2],
  ] as const) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.6), pathMat);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = rot;
    strip.position.set(cx, -0.015, cz);
    strip.receiveShadow = true;
    group.add(strip);
  }

  // Central pond — sized to the shorter infield axis
  const pondR = Math.min(12, Math.max(5, minHalf * 0.2));
  const pond = new THREE.Mesh(new THREE.CircleGeometry(pondR, 32), waterMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(cx, -0.01, cz);
  pond.userData.surface = "water";
  group.add(pond);
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(pondR, pondR + 0.7, 32),
    new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.85 }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(cx, 0.0, cz);
  group.add(rim);

  // Near-path reject: point is close to the gravel midline ring
  const nearPath = (x: number, z: number) => {
    let best = Infinity;
    for (const p of pathMid) {
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < best) best = d;
    }
    return best < 2.4 * 2.4;
  };

  // Trees — spaced across the full clear infield
  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: 56,
    minSep: 7.5,
    clearFoot: 2.2,
    exclude: (x, z) => {
      if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < (pondR + 3.5) ** 2) return true;
      if (nearPath(x, z)) return true;
      return false;
    },
  });
  const treeN = Math.max(1, points.length);
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.2, 5);
  const canopyGeo = new THREE.SphereGeometry(1.35, 6, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeN);
  trunks.count = 0;
  trunks.castShadow = false;
  trunks.userData.sharedVegMat = true;
  const canopies = canopyMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(canopyGeo, mat, treeN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });

  for (const { x, z, i } of points) {
    const scale = 0.75 + hash2(i, 7) * 0.55;
    dummy.position.set(x, 0.6 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, hash2(i, 11) * 6, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(trunks.count++, dummy.matrix);

    const ci = Math.floor(hash2(i, 13) * canopies.length) % canopies.length;
    const canopy = canopies[ci]!;
    dummy.position.set(x, 2.0 * scale, z);
    dummy.scale.set(scale * 1.15, scale * 1.05, scale * 1.15);
    dummy.updateMatrix();
    canopy.setMatrixAt(canopy.count++, dummy.matrix);
  }
  if (trunks.count) {
    trunks.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    group.add(trunks);
  }
  for (const canopy of canopies) {
    if (!canopy.count) continue;
    canopy.instanceMatrix.needsUpdate = true;
    canopy.computeBoundingSphere();
    group.add(canopy);
  }

  // Benches just outside the gravel path, following the outline
  const benchN = Math.min(20, pathMid.length);
  const benches = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), benchMat, benchN);
  benches.count = 0;
  const step = Math.max(1, Math.floor(pathMid.length / benchN));
  for (let i = 0; i < pathMid.length && benches.count < benchN; i += step) {
    const p = pathMid[i]!;
    const q = pathMid[(i + 1) % pathMid.length]!;
    const tx = q.x - p.x;
    const tz = q.z - p.z;
    const tlen = Math.hypot(tx, tz) || 1;
    // Outward from path toward lawn edge (away from park center)
    const ox = p.x - cx;
    const oz = p.z - cz;
    const olen = Math.hypot(ox, oz) || 1;
    const x = p.x + (ox / olen) * 2.6;
    const z = p.z + (oz / olen) * 2.6;
    if (!clearance.insideLoop(x, z) || !clearance.clearOf(x, z, 1.5)) continue;
    dummy.position.set(x, 0.35, z);
    dummy.scale.set(1.8, 0.55, 0.55);
    dummy.rotation.set(0, Math.atan2(tx / tlen, tz / tlen), 0);
    dummy.updateMatrix();
    benches.setMatrixAt(benches.count++, dummy.matrix);
  }
  if (benches.count) {
    benches.instanceMatrix.needsUpdate = true;
    benches.computeBoundingSphere();
    group.add(benches);
  }
}

/**
 * Forest Loop infield — dense mixed deciduous + pine grove in the middle of
 * the circuit, clear of asphalt / runoff (outfield planting stays outside).
 */
function plantForestInfieldGrove(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
) {
  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: 72,
    minSep: 6.5,
    clearFoot: 2.4,
  });
  if (!points.length) return;

  const decidMats = VEG_MATS.trees;
  const pineMats = VEG_MATS.pines;
  const decidTrunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.2, 5);
  const pineTrunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 2.2, 5);
  const decidCanopyGeo = new THREE.SphereGeometry(1.35, 6, 6);
  const pineCanopyGeo = new THREE.ConeGeometry(1.1, 2.6, 6);

  // ~65% broadleaf / ~35% pine so the infield reads as a real forest stand
  const decidPts = points.filter((_, idx) => hash2(idx, 19) >= 0.35);
  const pinePts = points.filter((_, idx) => hash2(idx, 19) < 0.35);
  const dummy = new THREE.Object3D();

  const decidN = Math.max(1, decidPts.length);
  const decidTrunks = new THREE.InstancedMesh(decidTrunkGeo, decidMats.trunk, decidN);
  decidTrunks.count = 0;
  decidTrunks.castShadow = false;
  decidTrunks.userData.sharedVegMat = true;
  const decidCanopies = decidMats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(decidCanopyGeo, mat, decidN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });

  for (const { x, z, i } of decidPts) {
    const scale = 0.85 + hash2(i, 7) * 0.75;
    dummy.position.set(x, 0.6 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, hash2(i, 11) * 6, 0);
    dummy.updateMatrix();
    decidTrunks.setMatrixAt(decidTrunks.count++, dummy.matrix);

    const ci = Math.floor(hash2(i, 13) * decidCanopies.length) % decidCanopies.length;
    const canopy = decidCanopies[ci]!;
    const cr = scale * (1.15 + hash2(i, 17) * 0.3);
    dummy.position.set(x, 2.05 * scale, z);
    dummy.scale.set(cr, cr * 1.05, cr);
    dummy.updateMatrix();
    canopy.setMatrixAt(canopy.count++, dummy.matrix);
  }

  if (decidTrunks.count) {
    decidTrunks.instanceMatrix.needsUpdate = true;
    decidTrunks.computeBoundingSphere();
    group.add(decidTrunks);
  }
  for (const canopy of decidCanopies) {
    if (!canopy.count) continue;
    canopy.instanceMatrix.needsUpdate = true;
    canopy.computeBoundingSphere();
    group.add(canopy);
  }

  if (!pinePts.length) return;

  const pineN = pinePts.length;
  const pineTrunks = new THREE.InstancedMesh(pineTrunkGeo, pineMats.trunk, pineN);
  pineTrunks.count = 0;
  pineTrunks.castShadow = false;
  pineTrunks.userData.sharedVegMat = true;
  const pineCanopies = pineMats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(pineCanopyGeo, mat, pineN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });
  const pineTops = pineMats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(pineCanopyGeo, mat, pineN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });

  for (const { x, z, i } of pinePts) {
    const scale = 0.8 + hash2(i, 7) * 0.7;
    dummy.position.set(x, 1.1 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, hash2(i, 11) * 6, 0);
    dummy.updateMatrix();
    pineTrunks.setMatrixAt(pineTrunks.count++, dummy.matrix);

    const ci = Math.floor(hash2(i, 13) * pineCanopies.length) % pineCanopies.length;
    const canopy = pineCanopies[ci]!;
    const cr = scale * (1.05 + hash2(i, 17) * 0.25);
    dummy.position.set(x, 2.2 * scale, z);
    dummy.scale.set(cr, cr * 1.25, cr);
    dummy.updateMatrix();
    canopy.setMatrixAt(canopy.count++, dummy.matrix);

    const top = pineTops[ci]!;
    dummy.position.set(x, 2.2 * scale + 1.15 * scale, z);
    dummy.scale.set(cr * 0.62, cr * 0.95, cr * 0.62);
    dummy.updateMatrix();
    top.setMatrixAt(top.count++, dummy.matrix);
  }

  if (pineTrunks.count) {
    pineTrunks.instanceMatrix.needsUpdate = true;
    pineTrunks.computeBoundingSphere();
    group.add(pineTrunks);
  }
  for (const mesh of [...pineCanopies, ...pineTops]) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
}

/** Grove / props in the circuit infield — clear of asphalt + runoff. */
function plantInfieldGrove(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
  biome: BiomeStyle,
) {
  // City + Summit already plant dedicated infield scenery
  if (biome.props === "city" || biome.props === "mountains") return;
  if (biome.vegetation === "none") return;

  // Forest Loop — dedicated mixed grove in the circuit middle
  if (biome.id === "forest") {
    plantForestInfieldGrove(group, path, clearance, bounds);
    return;
  }

  // Meadow (sparse): denser full-tree grove so the infield reads clearly as trees
  const isMeadow = biome.vegetation === "sparse";
  const isPalm = biome.vegetation === "palms";
  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: isMeadow ? 78 : isPalm ? 56 : 44,
    minSep: isMeadow ? 8.5 : isPalm ? 7.8 : 7.5,
    clearFoot: isPalm ? 2.8 : 2.3,
  });
  if (!points.length) return;

  if (isPalm) {
    const poses: TreePose[] = points.map(({ x, z, i }) => ({
      x,
      z,
      scale: 0.9 + hash2(i, 7) * 0.75,
      jitter: hash2(i, 11),
    }));
    plantPalmPoses(group, poses, VEG_MATS.palms);
    return;
  }

  const isPine = biome.vegetation === "pines";
  const isCactus = biome.vegetation === "cactus";
  // Meadow infield must use sparse mats (single canopy) — not forest trees
  const mats = isPine
    ? VEG_MATS.pines
    : isCactus
      ? VEG_MATS.cactus
      : isMeadow
        ? VEG_MATS.sparse
        : VEG_MATS.trees;

  const trunkGeo = isCactus
    ? new THREE.CylinderGeometry(0.18, 0.22, 2.4, 5)
    : new THREE.CylinderGeometry(0.22, 0.3, isPine ? 2.2 : 1.2, 5);
  const canopyGeo = isPine
    ? new THREE.ConeGeometry(1.1, 2.6, 6)
    : isCactus
      ? new THREE.SphereGeometry(0.35, 5, 4)
      : new THREE.SphereGeometry(1.35, 6, 6);

  const treeN = points.length;
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, treeN);
  trunks.count = 0;
  trunks.castShadow = false;
  trunks.userData.sharedVegMat = true;
  const canopies = mats.canopy.map((mat) => {
    const mesh = new THREE.InstancedMesh(canopyGeo, mat, treeN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.userData.sharedVegMat = true;
    return mesh;
  });
  const dummy = new THREE.Object3D();

  for (const { x, z, i } of points) {
    const scale = (isMeadow ? 0.85 : 0.7) + hash2(i, 7) * (isMeadow ? 0.7 : 0.6);
    const trunkH = isCactus || isPine ? 1.1 : 0.6;
    dummy.position.set(x, trunkH * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, hash2(i, 11) * 6, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(trunks.count++, dummy.matrix);

    const ci = Math.floor(hash2(i, 13) * canopies.length) % canopies.length;
    const canopy = canopies[ci]!;
    const cy = isPine ? 2.2 * scale : isCactus ? 2.5 * scale : 2.0 * scale;
    const cr = isCactus ? 0.9 + hash2(i, 17) * 0.3 : scale * (1.05 + hash2(i, 17) * 0.25);
    dummy.position.set(x, cy, z);
    dummy.scale.set(cr, isPine ? cr * 1.2 : cr, cr);
    dummy.updateMatrix();
    canopy.setMatrixAt(canopy.count++, dummy.matrix);
  }

  trunks.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  group.add(trunks);
  for (const canopy of canopies) {
    if (!canopy.count) continue;
    canopy.instanceMatrix.needsUpdate = true;
    canopy.computeBoundingSphere();
    group.add(canopy);
  }
}

/** Biome scenery — outfield props + infield grove/park per course. */
function plantBiomeScenery(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  roadHalf: number,
  biome: BiomeStyle,
) {
  const clearance = makePathClearance(path, roadHalf);
  const density = biome.props === "city" ? 0 : Math.max(0.2, biome.density * 0.7);
  const { poses, bounds } = collectPlantPoses(path, roadHalf, density, clearance);
  plantBiomeProps(group, path, biome, clearance, poses, bounds);
  plantVegetation(group, path, roadHalf, biome, clearance);
  plantInfieldGrove(group, path, clearance, bounds, biome);
}

function pointsFromDef(def: TrackDef): THREE.Vector3[] {
  return def.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
}

/** World AABB pad used for grass / forest planting. */
function pathBounds(path: THREE.CatmullRomCurve3) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const n = 120;
  for (let i = 0; i < n; i++) {
    const p = path.getPointAt(i / n);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const pad = 48;
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minZ: minZ - pad,
    maxZ: maxZ + pad,
    cx: (minX + maxX) * 0.5,
    cz: (minZ + maxZ) * 0.5,
    spanX: maxX - minX + pad * 2,
    spanZ: maxZ - minZ + pad * 2,
  };
}

function buildRibbon(
  path: THREE.CatmullRomCurve3,
  halfW: number,
  y: number,
  segments: number,
  /** Lateral offset of ribbon center from path (road-half − stripeHalf for edge lines). */
  lateral = 0,
) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) % 1;
    path.getPointAt(u, p);
    path.getTangentAt(u, tan).normalize();
    n.set(-tan.z, 0, tan.x);
    const cx = p.x + n.x * lateral;
    const cz = p.z + n.z * lateral;
    positions.push(
      cx - n.x * halfW, y, cz - n.z * halfW,
      cx + n.x * halfW, y, cz + n.z * halfW,
    );
    normals.push(0, 1, 0, 0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    // CCW when viewed from +Y so FrontSide shows asphalt/runoff (not grass through culls)
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

/** Build a full track scene from a named path definition. */
export function createTrack(trackId: string = DEFAULT_TRACK_ID): TrackData {
  const def = getTrackDef(trackId);
  const biome = biomeForTrack(def.biome ?? def.id);
  const group = new THREE.Group();
  const width = 14;
  const half = width / 2;

  const pts = pointsFromDef(def);
  const path = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
  const bounds = pathBounds(path);

  // Biome ground — baseColor preserved so weather tint doesn't flatten the palette
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.spanX, bounds.spanZ),
    new THREE.MeshStandardMaterial({ color: biome.ground, roughness: 1 }),
  );
  ground.userData.surface = "grass";
  ground.userData.baseColor = biome.ground;
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(bounds.cx, -0.12, bounds.cz);
  ground.receiveShadow = true;
  group.add(ground);

  // Segment density scales with circuit length so long maps stay smooth
  const pathLen = path.getLength();
  const ribbonSegs = Math.max(480, Math.min(1400, Math.ceil(pathLen / 1.35)));

  // Shoulder / runoff ribbon
  const runoff = new THREE.Mesh(
    buildRibbon(path, half + RUNOFF_EXTRA, -0.02, ribbonSegs),
    new THREE.MeshStandardMaterial({ color: biome.runoff, roughness: 1, metalness: 0 }),
  );
  runoff.userData.surface = "runoff";
  runoff.userData.baseColor = biome.runoff;
  runoff.receiveShadow = true;
  runoff.layers.enable(HEADLIGHT_LAYER);
  group.add(runoff);

  // Asphalt — wet roughness applied later by WeatherController
  const road = new THREE.Mesh(
    buildRibbon(path, half, 0.035, ribbonSegs),
    new THREE.MeshStandardMaterial({ color: biome.asphalt, roughness: 0.92, metalness: 0.04 }),
  );
  road.userData.surface = "asphalt";
  road.userData.baseColor = biome.asphalt;
  road.receiveShadow = true;
  road.layers.enable(HEADLIGHT_LAYER);
  group.add(road);

  // Continuous edge stripes — thin ribbons flush with asphalt (no box gaps)
  const stripeHalf = 0.11; // ~22cm painted line
  const edgeMat = new THREE.MeshStandardMaterial({
    color: biome.edge,
    roughness: 0.65,
    metalness: 0.04,
  });
  const edgeSegs = Math.max(ribbonSegs, Math.ceil(pathLen / 1.1));
  for (const side of [-1, 1] as const) {
    const edges = new THREE.Mesh(
      buildRibbon(path, stripeHalf, 0.048, edgeSegs, side * (half - stripeHalf)),
      edgeMat,
    );
    edges.castShadow = false;
    edges.receiveShadow = false;
    edges.layers.enable(HEADLIGHT_LAYER);
    group.add(edges);
  }

  // Start/finish checkered + gantry
  const startP = path.getPointAt(0);
  const startTan = path.getTangentAt(0).normalize();
  const startN = new THREE.Vector3(-startTan.z, 0, startTan.x);
  const yaw0 = yawFromTangent(startTan);

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 2; j++) {
      const col = (i + j) % 2 === 0 ? 0x111111 : 0xffffff;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(width / 10, 0.05, 0.7),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }),
      );
      tile.position
        .copy(startP)
        .addScaledVector(startN, -half + (i + 0.5) * (width / 10))
        .addScaledVector(startTan, (j - 0.5) * 0.7);
      tile.position.y = 0.07;
      tile.rotation.y = yaw0;
      group.add(tile);
    }
  }

  const gantry = new THREE.Group();
  gantry.position.copy(startP);
  gantry.rotation.y = yaw0;
  for (const x of [-half - 1.2, half + 1.2]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 5.5, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x8a909a, metalness: 0.5, roughness: 0.4 }),
    );
    post.position.set(x, 2.75, 0);
    gantry.add(post);
  }
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(width + 4, 0.45, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xff3b2e, metalness: 0.25, roughness: 0.5 }),
  );
  beam.position.set(0, 5.4, 0);
  gantry.add(beam);
  group.add(gantry);

  // Biome vegetation + props — clear of asphalt / runoff / walls
  plantBiomeScenery(group, path, half, biome);

  const heading = yawFromTangent(startTan);

  return {
    id: def.id,
    name: def.name,
    group,
    path,
    startPosition: startP.clone().addScaledVector(startN, -2.8),
    startHeading: heading,
    width,
  };
}

/** Remove a track group from the scene and free GPU resources (not shared tree mats). */
export function disposeTrack(track: TrackData) {
  track.group.removeFromParent();
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  track.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh & THREE.InstancedMesh;
    if (!mesh.isMesh && !mesh.isInstancedMesh) return;
    if (mesh.geometry) geos.add(mesh.geometry);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of list) {
      if (!mat) continue;
      if (SHARED_VEG_MATS.has(mat)) continue;
      mats.add(mat);
    }
  });
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
}

export type TrackProjection = {
  t: number;
  distanceFromCenter: number;
  tangent: THREE.Vector3;
};

/** Scratch for projection sample loops — avoid per-sample Vector3 GC. */
const _projScratch = new THREE.Vector3();
const _projTangent = new THREE.Vector3();
const _projPoint = new THREE.Vector3();
const _projResult: TrackProjection = {
  t: 0,
  distanceFromCenter: 0,
  tangent: _projTangent,
};

/**
 * Invisible sequential progress gates along the circuit (fractional path t).
 * A start/finish crossing only counts as a lap after all gates are cleared in order.
 * Prevents awarding a lap from reversing through SF then driving forward again.
 */
export const PROGRESS_GATES = [0.2, 0.4, 0.6, 0.8] as const;

/** Tracks which mid-lap progress gates have been cleared this lap. */
export class LapGateProgress {
  /** Index of the next gate that must be passed (=== length when ready for SF). */
  nextIndex = 0;

  reset() {
    this.nextIndex = 0;
  }

  get readyForFinish() {
    return this.nextIndex >= PROGRESS_GATES.length;
  }

  /** Advance when track-t moves forward past the next required gate(s). */
  update(prevT: number, t: number) {
    // Ignore SF wraps in either direction — gates live mid-lap only
    if ((prevT > 0.7 && t < 0.3) || (prevT < 0.3 && t > 0.7)) return;
    // Only count forward progress along the path
    if (t + 0.001 < prevT) return;

    while (this.nextIndex < PROGRESS_GATES.length) {
      const g = PROGRESS_GATES[this.nextIndex];
      if (prevT < g && t >= g) {
        this.nextIndex += 1;
        continue;
      }
      break;
    }
  }
}

function finishProjection(
  path: THREE.CatmullRomCurve3,
  position: THREE.Vector3,
  bestT: number,
  bestDist: number,
  refineStep: number,
): TrackProjection {
  for (let k = -6; k <= 6; k++) {
    const t = (bestT + k * refineStep * 0.2 + 1) % 1;
    path.getPointAt(t, _projScratch);
    const d = _projScratch.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      _projPoint.copy(_projScratch);
    }
  }

  path.getTangentAt(bestT, _projTangent).normalize();
  const nx = -_projTangent.z;
  const nz = _projTangent.x;
  _projResult.t = bestT;
  _projResult.distanceFromCenter =
    (position.x - _projPoint.x) * nx + (position.z - _projPoint.z) * nz;
  // Result vectors are shared scratch — callers must consume them before the next projection.
  return _projResult;
}

/** Global nearest-point search. Only safe for spawn/reset: on a circuit whose
 *  sections pass near each other it can snap to the wrong part of the track.
 *  During racing use projectOnTrackNear with the vehicle's last known t. */
export function projectOnTrack(
  path: THREE.CatmullRomCurve3,
  position: THREE.Vector3,
  samples = 220,
): TrackProjection {
  let bestT = 0;
  let bestDist = Infinity;

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    path.getPointAt(t, _projScratch);
    const d = _projScratch.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      _projPoint.copy(_projScratch);
    }
  }

  return finishProjection(path, position, bestT, bestDist, 1 / samples);
}

/** Sticky projection: search only a window of the path around tHint so the
 *  result can never jump to a distant section of the circuit. */
export function projectOnTrackNear(
  path: THREE.CatmullRomCurve3,
  position: THREE.Vector3,
  tHint: number,
  window = 0.05,
  samples = 48,
): TrackProjection {
  let bestT = tHint;
  let bestDist = Infinity;
  const step = (2 * window) / samples;

  for (let i = 0; i <= samples; i++) {
    const t = (tHint - window + i * step + 1) % 1;
    path.getPointAt(t, _projScratch);
    const d = _projScratch.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      _projPoint.copy(_projScratch);
    }
  }

  return finishProjection(path, position, bestT, bestDist, step);
}

/**
 * Dense re-trace of one AI's invisible racing line:
 *   point(t) = centerline(t) + continuousLateralNormal(t) * fixedOffset
 *
 * Normals are forced continuous (no mid-lap flips), so the groove stays a
 * smooth parallel of the centerline and never zigzags into a barrier.
 * Safe |offset| is the caller's responsibility (keep well inside road half-width).
 */
export class OffsetRacingLine {
  readonly offset: number;
  readonly count: number;
  /** Closed-loop arc length of the offset groove (meters). */
  readonly length: number;
  /** Path parameter [0,1) per sample. */
  readonly ts: Float64Array;
  /** Cumulative arc length along the OFFSET line (open prefix; wrap uses length). */
  readonly cum: Float64Array;
  readonly points: THREE.Vector3[];
  readonly tangents: THREE.Vector3[];
  readonly normals: THREE.Vector3[];

  private constructor(
    offset: number,
    length: number,
    ts: Float64Array,
    cum: Float64Array,
    points: THREE.Vector3[],
    tangents: THREE.Vector3[],
    normals: THREE.Vector3[],
  ) {
    this.offset = offset;
    this.length = length;
    this.ts = ts;
    this.cum = cum;
    this.points = points;
    this.tangents = tangents;
    this.normals = normals;
    this.count = points.length;
  }

  /** Densely sample the full lap and build a continuous offset groove. */
  static trace(path: THREE.CatmullRomCurve3, offset: number, samples = 640): OffsetRacingLine {
    const n = Math.max(64, samples);
    const ts = new Float64Array(n);
    const cum = new Float64Array(n);
    const points: THREE.Vector3[] = [];
    const tangents: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];

    let prevN: THREE.Vector3 | null = null;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const center = path.getPointAt(t);
      const tan = path.getTangentAt(t).normalize();
      // Left-hand lateral in XZ (matches spawn / projectOnTrack)
      const normal = new THREE.Vector3(-tan.z, 0, tan.x);
      if (prevN && normal.dot(prevN) < 0) normal.negate();
      const nLen = Math.hypot(normal.x, normal.z) || 1;
      normal.x /= nLen;
      normal.z /= nLen;
      prevN = normal.clone();

      ts[i] = t;
      points.push(center.clone().addScaledVector(normal, offset));
      tangents.push(tan.clone());
      normals.push(normal);
    }

    cum[0] = 0;
    for (let i = 1; i < n; i++) {
      cum[i] = cum[i - 1] + points[i].distanceTo(points[i - 1]);
    }
    const length = cum[n - 1] + points[0].distanceTo(points[n - 1]);

    // Tangents from the offset polyline so look-ahead follows THIS groove
    for (let i = 0; i < n; i++) {
      const a = points[(i - 1 + n) % n];
      const b = points[(i + 1) % n];
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      tangents[i].set(tx / len, 0, tz / len);
    }

    return new OffsetRacingLine(offset, length, ts, cum, points, tangents, normals);
  }

  /** Sample index nearest to centerline parameter t. */
  indexAtT(t: number): number {
    const tt = ((t % 1) + 1) % 1;
    let best = 0;
    let bestD = Infinity;
    // Uniform samples → direct index is exact enough; refine ±1
    const approx = Math.round(tt * this.count) % this.count;
    for (let k = -2; k <= 2; k++) {
      const i = (approx + k + this.count) % this.count;
      const d = Math.min(Math.abs(this.ts[i] - tt), 1 - Math.abs(this.ts[i] - tt));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  /** Point on this groove at centerline parameter t. */
  pointAtT(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const i = this.indexAtT(t);
    return out.copy(this.points[i]);
  }

  /** Tangent of the offset line at centerline parameter t. */
  tangentAtT(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const i = this.indexAtT(t);
    return out.copy(this.tangents[i]);
  }

  /** Point / tangent a given arc-length ahead along THIS offset line. */
  sampleAhead(
    t: number,
    distMeters: number,
    outPoint = new THREE.Vector3(),
    outTan = new THREE.Vector3(),
  ): { point: THREE.Vector3; tangent: THREE.Vector3; t: number } {
    const i0 = this.indexAtT(t);
    const target = this.cum[i0] + distMeters;
    // Walk forward along cum (with wrap)
    let i = i0;
    const n = this.count;
    let guard = 0;
    let s = this.cum[i0];
    let remain = distMeters;
    while (remain > 0 && guard++ < n + 2) {
      const iNext = (i + 1) % n;
      const seg =
        iNext === 0
          ? this.length - this.cum[i]
          : this.cum[iNext] - this.cum[i];
      if (seg <= 1e-6) {
        i = iNext;
        continue;
      }
      if (remain <= seg) {
        const u = remain / seg;
        outPoint.lerpVectors(this.points[i], this.points[iNext], u);
        outTan.copy(this.tangents[iNext]).multiplyScalar(u).addScaledVector(this.tangents[i], 1 - u);
        const tl = Math.hypot(outTan.x, outTan.z) || 1;
        outTan.set(outTan.x / tl, 0, outTan.z / tl);
        const tOut = (this.ts[i] * (1 - u) + this.ts[iNext] * u + (iNext === 0 ? 1 : 0)) % 1;
        return { point: outPoint, tangent: outTan, t: tOut };
      }
      remain -= seg;
      i = iNext;
      s += seg;
    }
    void target;
    void s;
    outPoint.copy(this.points[i]);
    outTan.copy(this.tangents[i]);
    return { point: outPoint, tangent: outTan, t: this.ts[i] };
  }

  /**
   * Peak curvature (rad/m) ahead along the offset line over [nearDist, lookDist].
   * Uses chord heading change — works for smooth arcs (unlike tiny adjacent samples).
   */
  curvatureAhead(t: number, lookDist: number): { maxKappa: number; nearKappa: number; turnAngle: number } {
    const i0 = this.indexAtT(t);
    const n = this.count;
    let maxKappa = 0;
    let nearKappa = 0;
    let turnAngle = 0;
    let traveled = 0;
    let prevTan = this.tangents[i0];

    for (let step = 1; step <= n; step++) {
      const i = (i0 + step) % n;
      const iPrev = (i0 + step - 1) % n;
      const seg =
        i === 0 ? this.length - this.cum[iPrev] : this.cum[i] - this.cum[iPrev];
      if (seg < 1e-6) continue;
      traveled += seg;
      if (traveled > lookDist) break;

      const tan = this.tangents[i];
      let dot = prevTan.x * tan.x + prevTan.z * tan.z;
      dot = Math.max(-1, Math.min(1, dot));
      const dAng = Math.acos(dot);
      turnAngle += dAng;
      const kappa = dAng / Math.max(seg, 0.5);

      maxKappa = Math.max(maxKappa, kappa);
      if (traveled <= lookDist * 0.4) nearKappa = Math.max(nearKappa, kappa);
      prevTan = tan;
    }

    // Also measure total heading change / lookDist as a smooth "bend threat"
    const bulk = turnAngle / Math.max(lookDist, 1);
    maxKappa = Math.max(maxKappa, bulk);
    return { maxKappa, nearKappa: Math.max(nearKappa, bulk * 0.85), turnAngle };
  }
}

/** Single-point sample (no continuity cache) — prefer OffsetRacingLine for AI. */
export function pointOnOffsetLine(
  path: THREE.CatmullRomCurve3,
  t: number,
  offset: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const tan = path.getTangentAt(t).normalize();
  const normal = new THREE.Vector3(-tan.z, 0, tan.x);
  return out.copy(path.getPointAt(t)).addScaledVector(normal, offset);
}
