import * as THREE from "three";
import { biomeForTrack, type BiomeStyle } from "./biomes";
import {
  DEFAULT_TRACK_ID,
  getTrackDef,
  isDriftTrack,
  type TrackDef,
} from "./trackDefs";

export type { TrackDef };
export { TRACKS, DEFAULT_TRACK_ID, DRIFT_TRACK_ID, getTrackDef, randomTrackId, isTrackId, isDriftTrack } from "./trackDefs";

export type TrackData = {
  id: string;
  name: string;
  group: THREE.Group;
  path: THREE.CatmullRomCurve3;
  startPosition: THREE.Vector3;
  startHeading: number;
  width: number;
  /** Centerline height along t — set on drift parks for the underpass grade. */
  heightAt?: (t: number) => number;
  /** dy/ds along the centerline (for visual pitch). */
  gradeAt?: (t: number) => number;
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

/** Streetlamp bulb — WeatherController boosts emissiveIntensity at night. */
function makeNightLampMaterial(dayEmit = 0.28, nightEmit = 5.8) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfff0c8,
    emissive: 0xffe8a0,
    emissiveIntensity: dayEmit,
    roughness: 0.35,
  });
  mat.userData.nightLamp = true;
  mat.userData.emissiveDay = dayEmit;
  mat.userData.emissiveNight = nightEmit;
  return mat;
}

/** Local warm street glow — intensity 0 until night mode. */
function makeNightPointLight(
  x: number,
  y: number,
  z: number,
  nightIntensity = 1.6,
  distance = 22,
) {
  const light = new THREE.PointLight(0xffe0a8, 0, distance, 2);
  light.position.set(x, y, z);
  light.castShadow = false;
  light.visible = false;
  light.userData.nightLamp = true;
  light.userData.nightIntensity = nightIntensity;
  return light;
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
  // Forest / simple deciduous: one trunk + one canopy green (uniform look)
  trees: makeTreeMats(0x5a3a22, [0x2a8a32]),
  pines: makeTreeMats(0x3a2a18, [0x1a4a28, 0x163e22, 0x245a32]),
  // Sandy trunk + tropical frond greens (deeper / olive, not lawn green)
  palms: makeTreeMats(0xc4a06a, [0x1e7a36, 0x2a9142, 0x3aa850]),
  cactus: makeTreeMats(0x3a6a2a, [0x3a6a2a, 0x458034, 0x2f5a24]),
  // Meadow: single canopy green — darker than meadow ground (0x8fbc4a) so groves read clearly
  sparse: makeTreeMats(0x5a3a22, [0x2f7a24]),
};

/** Shared mats must not be disposed with a track swap. */
const SHARED_VEG_MATS = new Set<THREE.Material>(
  Object.values(VEG_MATS).flatMap((v) => [v.trunk, ...v.canopy]),
);

type TreePose = { x: number; z: number; scale: number; jitter: number };

/** Soft cap so large multi-map circuits don't plant 6k–10k trees per swap. */
const MAX_TREES = 1500;
/** Forest Loop wants a denser stand — higher soft cap for outfield rings. */
const MAX_TREES_FOREST = 2400;
/** Meadow Sweep outfield woods ring — dense park belt around the loop. */
const MAX_TREES_MEADOW = 2000;

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

  // Exact ray-cast on the closed centerline polyline (used to stamp the grid).
  const insideExact = (x: number, z: number) => {
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

  // O(1) infield lookup — coast water / palm filters call this thousands of times.
  let gMinX = Infinity;
  let gMaxX = -Infinity;
  let gMinZ = Infinity;
  let gMaxZ = -Infinity;
  for (let i = 0; i < sampleN; i++) {
    const p = samples[i]!;
    if (p.x < gMinX) gMinX = p.x;
    if (p.x > gMaxX) gMaxX = p.x;
    if (p.z < gMinZ) gMinZ = p.z;
    if (p.z > gMaxZ) gMaxZ = p.z;
  }
  const GCELL = 4;
  const gPad = GCELL * 2;
  gMinX -= gPad;
  gMaxX += gPad;
  gMinZ -= gPad;
  gMaxZ += gPad;
  const gw = Math.max(1, Math.ceil((gMaxX - gMinX) / GCELL));
  const gh = Math.max(1, Math.ceil((gMaxZ - gMinZ) / GCELL));
  const insideGrid = new Uint8Array(gw * gh);
  for (let gz = 0; gz < gh; gz++) {
    for (let gx = 0; gx < gw; gx++) {
      const x = gMinX + (gx + 0.5) * GCELL;
      const z = gMinZ + (gz + 0.5) * GCELL;
      if (insideExact(x, z)) insideGrid[gz * gw + gx] = 1;
    }
  }

  const insideLoop = (x: number, z: number) => {
    const gx = Math.floor((x - gMinX) / GCELL);
    const gz = Math.floor((z - gMinZ) / GCELL);
    if (gx < 0 || gz < 0 || gx >= gw || gz >= gh) return false;
    return insideGrid[gz * gw + gx]! !== 0;
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
  opts?: { forest?: boolean; meadow?: boolean },
): { poses: TreePose[]; bounds: ReturnType<typeof pathBounds>; clearance: PathClearance } {
  const bounds = pathBounds(path);
  const forest = !!opts?.forest;
  const meadow = !!opts?.meadow;

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
  const ringOffsets = forest
    ? [18, 24, 30, 38, 48, 60, 74, 90, 108, 128, 150]
    : meadow
      ? [18, 24, 32, 42, 54, 68, 84, 102, 122, 145]
      : [22, 30, 40, 52, 68, 88, 112, 140];
  const ringSteps = forest ? 220 : meadow ? 200 : 160;
  const ringTan = new THREE.Vector3();
  const ringN = new THREE.Vector3();
  const skipFloor = forest ? 0.04 : meadow ? 0.06 : 0.12;
  const skipChance = 1 - Math.max(skipFloor, Math.min(1, density));
  const ringSkipBase = forest ? 0.12 : meadow ? 0.14 : 0.28;
  for (const offset of ringOffsets) {
    for (let i = 0; i < ringSteps; i++) {
      const t = i / ringSteps;
      const p = path.getPointAt(t);
      ringTan.copy(path.getTangentAt(t)).normalize();
      ringN.set(-ringTan.z, 0, ringTan.x);
      const h = hash2(i, Math.round(offset * 10));
      if (h < ringSkipBase + skipChance * 0.5) continue;
      // Plant both outer laterals (±) but sceneryOk drops any infield hits
      for (const sign of [-1, 1] as const) {
        const lat = sign * (offset + (h - 0.5) * 3.2);
        const along = (hash2(Math.round(offset * 7), i + sign * 17) - 0.5) * 2.4;
        const x = p.x + ringN.x * lat + ringTan.x * along;
        const z = p.z + ringN.z * lat + ringTan.z * along;
        tryPlant(x, z, (meadow ? 0.75 : 0.65) + h * (meadow ? 0.8 : 0.7));
      }
    }
  }

  const step = forest ? 5.2 : meadow ? 6.8 : density > 0.7 ? 8.5 : density > 0.4 ? 11.5 : 15;
  const gridSkipBase = forest ? 0.1 : meadow ? 0.12 : 0.22;
  for (let ix = bounds.minX; ix <= bounds.maxX; ix += step) {
    for (let iz = bounds.minZ; iz <= bounds.maxZ; iz += step) {
      const h = hash2(Math.round(ix * 3), Math.round(iz * 3));
      if (h < gridSkipBase + skipChance * 0.55) continue;
      const x = ix + (h - 0.5) * 5.2;
      const z = iz + (hash2(Math.round(iz * 5), Math.round(ix * 5)) - 0.5) * 5.2;
      tryPlant(x, z, (meadow ? 0.7 : 0.55) + h * (meadow ? 0.9 : 0.85));
    }
  }

  const maxTrees = forest ? MAX_TREES_FOREST : meadow ? MAX_TREES_MEADOW : MAX_TREES;
  // Meadow uses a high effective density so the woods ring isn't starved by biome.density 0.28
  const densForCap = meadow ? Math.max(density, 0.92) : density;
  const cap = Math.max(80, Math.round(maxTrees * densForCap));
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
  sharedGeos?: { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry },
) {
  if (!poses.length) return;

  const TRUNK_H = 3.85;
  const trunkGeo =
    sharedGeos?.trunk ?? new THREE.CylinderGeometry(0.065, 0.28, TRUNK_H, 6);
  const canopyGeo = sharedGeos?.canopy ?? createPalmCanopyGeometry();
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
  const isMeadow = biome.id === "meadow";
  // Meadow biome.density is intentionally low for props feel — outfield trees use a dense park ring
  const vegDensity = isMeadow ? Math.max(biome.density, 0.92) : biome.density;
  const collected = collectPlantPoses(path, roadHalf, vegDensity, clearance, {
    forest: biome.id === "forest",
    meadow: isMeadow,
  });
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
    const palmGeos = {
      trunk: new THREE.CylinderGeometry(0.065, 0.28, 3.85, 6),
      canopy: createPalmCanopyGeometry(),
    };
    for (const list of buckets.values()) {
      if (list.length) plantPalmPoses(group, list, mats, palmGeos);
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
 * Minimum beach width past runoff (meters). Large sand buffer so the sea never
 * reads against the grey shoulder — also cushions strip chords at tight bends.
 */
const COAST_BEACH_MIN = 28;
/**
 * Inland clearance for palms vs local shoreline (meters).
 * Includes slack for Euclidean-vs-lateral path distance on bends.
 */
const COAST_PALM_WATER_CLEAR = 18;
/**
 * Morphological half-window (path samples) for shoreline latitudes.
 * Max-dilate fills concave outer bays so ring-strip chords cannot cut across
 * sand / asphalt (those chords were the dark diagonal artifact lines).
 */
const COAST_SHORE_DILATE_HALF = 40;

/**
 * Beach width past runoff along the coast circuit (meters).
 * Low = nearer sea (still past COAST_BEACH_MIN); high = wide sand.
 * Never returns below COAST_BEACH_MIN (water must stay off runoff / asphalt).
 */
function coastBeachExtra(t: number): number {
  const a = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 2.15);
  const b = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 5.4 + 1.1);
  const c = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.85 + 0.55);
  const i = Math.floor(t * 320) % 320;
  const jagged = hash2(i, 77) * 0.4 + hash2((i + 1) % 320, 77) * 0.6;

  // Soft bays — sea draws a little closer, but never collapses onto the shoulder.
  let inlet = 0;
  const inlets = [0.08, 0.27, 0.49, 0.66, 0.91];
  for (const d of inlets) {
    const dist = Math.min(Math.abs(t - d), 1 - Math.abs(t - d));
    if (dist < 0.055) {
      const w = 1 - dist / 0.055;
      inlet = Math.max(inlet, w * w);
    }
  }

  // Closest stretches keep a wide sand buffer past runoff (~28–40m).
  const near = COAST_BEACH_MIN + jagged * 12;
  const far = 52 + b * 36; // ~52–88m
  const mix = Math.pow(0.2 + 0.8 * (0.5 * c + 0.3 * a + 0.2 * b), 1.25);
  let extra = near * (1 - mix) + far * mix;
  // Inlet pull is capped so soft bays stay outside the hard beach floor.
  extra = extra * (1 - inlet * 0.35) + near * inlet;
  return Math.max(COAST_BEACH_MIN, extra);
}

/** Sliding-window max — fills narrow shoreline concavities that spawn cutting chords. */
function dilateCoastExtras(extras: number[], halfWin: number): number[] {
  const n = extras.length;
  if (n === 0) return [];
  if (halfWin <= 0) return extras.slice();
  // Circular max via padded linear pass — O(n · window) but n≲800, window≲40.
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let k = -halfWin; k <= halfWin; k++) {
      const v = extras[(i + k + n * 8) % n]!;
      if (v > m) m = v;
    }
    out[i] = m;
  }
  return out;
}

/**
 * Inflate path-normal latitudes until shoreline verts clear the beach floor.
 * Binary-search per vertex + morphological dilate (replaces the old 64-pass
 * chord storm that never converged and stalled Harbor load ~4s).
 */
function enforceCoastShoreLatitudes(
  lats: number[],
  anchors: { x: number; z: number }[],
  outDir: { x: number; z: number }[],
  clearance: PathClearance,
  minWaterR2: number,
) {
  const n = lats.length;
  const maxLat = 240;
  const pointBad = (x: number, z: number) =>
    clearance.minDist2(x, z) < minWaterR2 || clearance.insideLoop(x, z);

  for (let i = 0; i < n; i++) {
    const a = anchors[i]!;
    const d = outDir[i]!;
    let lo = lats[i]!;
    const x0 = a.x + d.x * lo;
    const z0 = a.z + d.z * lo;
    if (!pointBad(x0, z0)) continue;

    let hi = Math.min(maxLat, lo + 12);
    while (hi < maxLat && pointBad(a.x + d.x * hi, a.z + d.z * hi)) {
      lo = hi;
      hi = Math.min(maxLat, hi + 12);
    }
    // Binary search the first clear latitude in (lo, hi].
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) * 0.5;
      if (pointBad(a.x + d.x * mid, a.z + d.z * mid)) lo = mid;
      else hi = mid;
    }
    lats[i] = hi;
  }

  // Max-dilate latitudes so chords between neighbors cannot cut sand / asphalt.
  const latDilate = Math.max(2, Math.round(n * 0.012));
  const dilated = dilateCoastExtras(lats, latDilate);
  for (let i = 0; i < n; i++) lats[i] = dilated[i]!;

  // One cheap chord polish — few samples, few passes (dilation does the heavy lift).
  const fracs = [0.35, 0.5, 0.65];
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const a = anchors[i]!;
      const d0 = outDir[i]!;
      const j = (i + 1) % n;
      const b = anchors[j]!;
      const d1 = outDir[j]!;
      const ax = a.x + d0.x * lats[i]!;
      const az = a.z + d0.z * lats[i]!;
      const bx = b.x + d1.x * lats[j]!;
      const bz = b.z + d1.z * lats[j]!;
      let needs = pointBad(ax, az) || pointBad(bx, bz);
      if (!needs) {
        for (const f of fracs) {
          const mx = ax + (bx - ax) * f;
          const mz = az + (bz - az) * f;
          if (pointBad(mx, mz)) {
            needs = true;
            break;
          }
        }
      }
      if (!needs) continue;
      lats[i]! += 5;
      lats[j]! += 5;
      moved = true;
    }
    if (!moved) break;
  }
}

/**
 * Coastal ocean surrounding the full map — irregular shoreline island keeps
 * beach + asphalt + infield dry (ocean never reads as a flood under the ribbon).
 */
function plantCoastWater(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
  groundColor: number,
) {
  // Fully opaque — transparent water + depthWrite was z-fighting sand and
  // drawing dark shoreline-chord seams across beach / asphalt.
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1a6a9a,
    metalness: 0.35,
    roughness: 0.22,
    transparent: false,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const pathLen = path.getLength();
  // Dense enough for an irregular coast; dilation covers local concavities.
  const samples = Math.max(400, Math.min(720, Math.ceil(pathLen / 1.55)));
  const minWaterR = clearance.runoffClear + COAST_BEACH_MIN;
  const minWaterR2 = minWaterR * minWaterR;
  const anchors: { x: number; z: number }[] = [];
  const outDir: { x: number; z: number }[] = [];
  const rawExtra: number[] = [];
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    path.getPointAt(t, pt);
    tan.copy(path.getTangentAt(t)).normalize();
    nrm.set(-tan.z, 0, tan.x);
    const probe = clearance.runoffClear + 2;
    // Outward = opposite of the infield side
    const outSign = clearance.insideLoop(pt.x + nrm.x * probe, pt.z + nrm.z * probe)
      ? -1
      : 1;
    anchors.push({ x: pt.x, z: pt.z });
    outDir.push({ x: nrm.x * outSign, z: nrm.z * outSign });
    rawExtra.push(coastBeachExtra(t));
  }

  // Dilate beach widths so concave outer pockets cannot create shoreline
  // chords that slash across sand and the racing ribbon.
  const dilated = dilateCoastExtras(rawExtra, COAST_SHORE_DILATE_HALF);
  const lats = dilated.map((e) => clearance.runoffClear + e);

  // Single enforce at the beach floor (stricter than ribbon) — ribbon pass was redundant.
  enforceCoastShoreLatitudes(lats, anchors, outDir, clearance, minWaterR2);

  const inner: { x: number; z: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const a = anchors[i]!;
    const d = outDir[i]!;
    const latIn = lats[i]!;
    inner.push({ x: a.x + d.x * latIn, z: a.z + d.z * latIn });
  }

  // Map-sized ocean (past the grass AABB) so sea wraps the whole Harbor view —
  // not a path-normal half-ring that left AABB corners as dry sand.
  const waterPad = 40;
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.spanX + waterPad * 2, bounds.spanZ + waterPad * 2),
    waterMat,
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(bounds.cx, -0.11, bounds.cz);
  ocean.receiveShadow = false;
  ocean.userData.surface = "water";
  ocean.renderOrder = -2;
  group.add(ocean);

  // Dry island fill = beach + ribbon + infield (hides ocean under the circuit).
  const shape = new THREE.Shape();
  shape.moveTo(inner[0]!.x, inner[0]!.z);
  for (let i = 1; i < inner.length; i++) {
    shape.lineTo(inner[i]!.x, inner[i]!.z);
  }
  shape.closePath();
  const islandMat = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: 1,
    metalness: 0,
  });
  const island = new THREE.Mesh(new THREE.ShapeGeometry(shape), islandMat);
  island.rotation.x = -Math.PI / 2;
  island.position.y = -0.105;
  island.receiveShadow = true;
  island.userData.surface = "grass";
  island.userData.baseColor = groundColor;
  island.renderOrder = -1;
  group.add(island);
}

/** Inland clearance for beach umbrellas vs shoreline (meters) — smaller than palms. */
const COAST_UMBRELLA_WATER_CLEAR = 10;

/**
 * Classic low-poly beach umbrellas on Harbor sand — outer beach toward the sea,
 * between runoff and water (never on asphalt, never in the ocean).
 */
function plantCoastBeachUmbrellas(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
) {
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xd8c4a0,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  // Bright solid + pair colors so some read as striped from afar
  const canopyColors = [
    0xe84848, // red
    0xf0f0ee, // white
    0x2f6fd4, // blue
    0xf0c020, // yellow
    0xe86828, // orange
    0x2aa8a0, // teal
    0xe84878, // pink
    0xf0f0ee, // white (pairs with red/blue)
  ];
  const canopyMats = canopyColors.map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.88,
        metalness: 0.02,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
  );

  const poleH = 3.4;
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.06, poleH, 5);
  // Open canopy: wide cone, tip up (classic beach umbrella silhouette)
  const canopyGeo = new THREE.ConeGeometry(1.55, 0.95, 7);
  // Thin wedge for alternating stripe panels on half the umbrellas
  const stripeGeo = new THREE.ConeGeometry(1.58, 0.96, 7, 1, false, 0, Math.PI / 3.5);

  const maxN = 36;
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, maxN);
  poles.count = 0;
  poles.castShadow = false;
  poles.receiveShadow = true;

  const canopies = canopyMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(canopyGeo, mat, maxN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  });
  const stripes = canopyMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(stripeGeo, mat, maxN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  });

  const dummy = new THREE.Object3D();
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const placed: { x: number; z: number }[] = [];
  const minSep2 = 14 * 14;

  // Dense path samples → thin to spaced outer-beach spots
  const samples = 72;
  for (let i = 0; i < samples && poles.count < maxN; i++) {
    const t = (i + 0.37) / samples;
    // Skip most candidates — leave clusters of 1–2 with gaps (beach row feel)
    const keep = hash2(i * 11, 401);
    if (keep < 0.42) continue;

    path.getPointAt(t, pt);
    tan.copy(path.getTangentAt(t)).normalize();
    nrm.set(-tan.z, 0, tan.x);
    const probe = clearance.runoffClear + 2;
    const outSign = clearance.insideLoop(pt.x + nrm.x * probe, pt.z + nrm.z * probe)
      ? -1
      : 1;

    const beachExtra = coastBeachExtra(t);
    const shoreR = clearance.runoffClear + beachExtra;
    // Outer sand toward the sea: past track clear pad, inland of water
    const sandMin = clearance.baseClear + 1.2;
    const sandMax = shoreR - COAST_UMBRELLA_WATER_CLEAR;
    if (sandMax <= sandMin + 2) continue;

    // Bias toward the sea side of the sand band (0.55–0.92 of the way out)
    const frac = 0.55 + hash2(i * 7, 509) * 0.37;
    const lat = sandMin + (sandMax - sandMin) * frac;
    const along = (hash2(i * 3, 613) - 0.5) * 3.2;
    const x = pt.x + nrm.x * outSign * lat + tan.x * along;
    const z = pt.z + nrm.z * outSign * lat + tan.z * along;

    if (clearance.insideLoop(x, z)) continue;
    if (!clearance.outsideRunoff(x, z, 1.6)) continue;
    // Stay on sand: past scenery clear, short of shoreline water floor
    const d2 = clearance.minDist2(x, z);
    if (d2 < sandMin * sandMin) continue;
    if (d2 > sandMax * sandMax) continue;

    let tooClose = false;
    for (const p of placed) {
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < minSep2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const s = 0.88 + hash2(i * 5, 701) * 0.28;
    const yaw = hash2(i * 17, 809) * Math.PI * 2;
    const tipY = poleH * s;

    dummy.position.set(x, tipY * 0.5, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, yaw, 0);
    dummy.updateMatrix();
    poles.setMatrixAt(poles.count++, dummy.matrix);

    const colorI = Math.floor(hash2(i * 23, 907) * canopyMats.length) % canopyMats.length;
    // Canopy sits near the top of the pole (slightly below tip)
    dummy.position.set(x, tipY - 0.15 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, yaw, 0);
    dummy.updateMatrix();
    canopies[colorI]!.setMatrixAt(canopies[colorI]!.count++, dummy.matrix);

    // ~half get a contrasting stripe wedge for a striped beach-umbrella read
    if (hash2(i * 29, 1009) > 0.45) {
      const stripeI = (colorI + 1 + (hash2(i, 1103) > 0.5 ? 1 : 0)) % canopyMats.length;
      dummy.rotation.set(0, yaw + Math.PI / 7, 0);
      dummy.updateMatrix();
      stripes[stripeI]!.setMatrixAt(stripes[stripeI]!.count++, dummy.matrix);
    }

    placed.push({ x, z });
  }

  poles.instanceMatrix.needsUpdate = true;
  poles.computeBoundingSphere();
  group.add(poles);
  for (const mesh of canopies) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  for (const mesh of stripes) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
}

/** Inland clearance for beach balls vs shoreline (meters) — smaller props than umbrellas. */
const COAST_BALL_WATER_CLEAR = 8;

/**
 * A few low-poly striped beach balls on Harbor outer sand — lying around toward
 * the sea (never on asphalt, never in the ocean). Whole map gets exactly 3.
 */
function plantCoastBeachBalls(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
) {
  const targetN = 3;
  const goreN = 6;
  const radius = 0.52;
  const goreAngle = (Math.PI * 2) / goreN;

  // Classic beach-ball palette (same family as umbrella canopies)
  const ballColors = [
    0xe84848, // red
    0xf0f0ee, // white
    0x2f6fd4, // blue
    0xf0c020, // yellow
    0xe86828, // orange
    0x2aa8a0, // teal
  ];
  const goreMats = ballColors.map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.72,
        metalness: 0.04,
        flatShading: true,
      }),
  );
  // One gore wedge — instances rotate around Y to tile a full striped sphere
  const goreGeo = new THREE.SphereGeometry(radius, 3, 5, 0, goreAngle);

  const gores = goreMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(goreGeo, mat, targetN);
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  });

  const dummy = new THREE.Object3D();
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  type BallSpot = { x: number; z: number; i: number };
  const candidates: BallSpot[] = [];

  // Gather valid outer-sand spots, then pick 3 well-spaced ones
  const samples = 96;
  for (let i = 0; i < samples; i++) {
    const t = (i + 0.61) / samples;
    if (hash2(i * 19, 1201) < 0.5) continue;

    path.getPointAt(t, pt);
    tan.copy(path.getTangentAt(t)).normalize();
    nrm.set(-tan.z, 0, tan.x);
    const probe = clearance.runoffClear + 2;
    const outSign = clearance.insideLoop(pt.x + nrm.x * probe, pt.z + nrm.z * probe)
      ? -1
      : 1;

    const beachExtra = coastBeachExtra(t);
    const shoreR = clearance.runoffClear + beachExtra;
    const sandMin = clearance.baseClear + 1.2;
    const sandMax = shoreR - COAST_BALL_WATER_CLEAR;
    if (sandMax <= sandMin + 2) continue;

    // Bias toward the sea side of the sand band (same feel as umbrellas)
    const frac = 0.58 + hash2(i * 7, 1303) * 0.34;
    const lat = sandMin + (sandMax - sandMin) * frac;
    const along = (hash2(i * 3, 1409) - 0.5) * 4.5;
    const x = pt.x + nrm.x * outSign * lat + tan.x * along;
    const z = pt.z + nrm.z * outSign * lat + tan.z * along;

    if (clearance.insideLoop(x, z)) continue;
    if (!clearance.outsideRunoff(x, z, 1.2)) continue;
    const d2 = clearance.minDist2(x, z);
    if (d2 < sandMin * sandMin) continue;
    if (d2 > sandMax * sandMax) continue;

    candidates.push({ x, z, i });
  }

  // Greedy farthest-spread pick so the 3 balls aren't clustered
  const picked: BallSpot[] = [];
  while (picked.length < targetN && candidates.length) {
    let bestIdx = 0;
    let bestScore = -1;
    for (let c = 0; c < candidates.length; c++) {
      const spot = candidates[c]!;
      let nearest = Infinity;
      for (const p of picked) {
        const dx = p.x - spot.x;
        const dz = p.z - spot.z;
        nearest = Math.min(nearest, dx * dx + dz * dz);
      }
      const score = picked.length === 0 ? hash2(spot.i * 31, 2003) : nearest;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = c;
      }
    }
    picked.push(candidates.splice(bestIdx, 1)[0]!);
  }

  const qTumble = new THREE.Quaternion();
  const qGore = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const yAxis = new THREE.Vector3(0, 1, 0);

  for (const spot of picked) {
    const i = spot.i;
    const s = 0.85 + hash2(i * 5, 1511) * 0.35;
    // Casual tumble so stripes read as balls lying around, not planted upright
    euler.set(
      (hash2(i * 11, 1607) - 0.5) * 1.1,
      hash2(i * 17, 1709) * Math.PI * 2,
      (hash2(i * 23, 1811) - 0.5) * 0.9,
    );
    qTumble.setFromEuler(euler);
    const colorShift = Math.floor(hash2(i * 29, 1913) * goreN) % goreN;

    const y = radius * s;
    for (let g = 0; g < goreN; g++) {
      const colorI = (g + colorShift) % goreN;
      qGore.setFromAxisAngle(yAxis, g * goreAngle);
      dummy.position.set(spot.x, y, spot.z);
      dummy.scale.set(s, s, s);
      // tumble ∘ goreYaw so meridian stripes stay watertight under tilt
      dummy.quaternion.copy(qTumble).multiply(qGore);
      dummy.updateMatrix();
      gores[colorI]!.setMatrixAt(gores[colorI]!.count++, dummy.matrix);
    }
  }

  for (const mesh of gores) {
    if (!mesh.count) continue;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
}

/**
 * Keep coast palms on beach sand only — never on asphalt/runoff, never in/over water.
 * Uses the same dilated shoreline extras as the water mesh so planting matches the sea.
 */
function filterPosesToCoastSand(
  poses: TreePose[],
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
): TreePose[] {
  const sampleN = 256;
  const samples: { x: number; z: number }[] = [];
  const rawExtra: number[] = [];
  const pt = new THREE.Vector3();
  for (let i = 0; i < sampleN; i++) {
    const t = i / sampleN;
    path.getPointAt(t, pt);
    samples.push({ x: pt.x, z: pt.z });
    rawExtra.push(coastBeachExtra(t));
  }
  // Match water mesh dilation (scaled to this coarser sample count).
  const halfWin = Math.max(8, Math.round(COAST_SHORE_DILATE_HALF * (sampleN / 900)));
  const dilated = dilateCoastExtras(rawExtra, halfWin);

  // Spatial bins for nearest shoreline sample (avoid O(poses · sampleN)).
  const BIN = 24;
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

  return poses.filter((pose) => {
    // Outfield only — infield palms come from plantInfieldGrove.
    if (clearance.insideLoop(pose.x, pose.z)) return false;
    // Hard reject anything that still sits on the racing ribbon.
    if (!clearance.outsideRunoff(pose.x, pose.z, pose.scale * 1.8)) return false;

    let bestI = 0;
    let bestD = Infinity;
    const bx = Math.floor(pose.x / BIN);
    const bz = Math.floor(pose.z / BIN);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const list = bins.get(`${bx + dx},${bz + dz}`);
        if (!list) continue;
        for (const i of list) {
          const p = samples[i]!;
          const d = (p.x - pose.x) * (p.x - pose.x) + (p.z - pose.z) * (p.z - pose.z);
          if (d < bestD) {
            bestD = d;
            bestI = i;
          }
        }
      }
    }
    // Fallback if bins missed (far scatter) — rare.
    if (!Number.isFinite(bestD) || bestD === Infinity) {
      for (let i = 0; i < sampleN; i++) {
        const p = samples[i]!;
        const d = (p.x - pose.x) * (p.x - pose.x) + (p.z - pose.z) * (p.z - pose.z);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
    }

    const dilatedR = clearance.runoffClear + dilated[bestI]!;
    // Also respect the undilated local beach — dilation fills bays for water
    // chords, but palms should not march into those filled pockets.
    const localR = clearance.runoffClear + coastBeachExtra(bestI / sampleN);
    const shoreR = Math.min(dilatedR, localR + 8);
    // Sand band: past runoff pad, well inland of shoreline (+ trunk footprint).
    const sandMin = clearance.baseClear + pose.scale * 0.8;
    const sandMax = shoreR - COAST_PALM_WATER_CLEAR - pose.scale * 1.5;
    if (sandMax <= sandMin) return false;
    return bestD >= sandMin * sandMin && bestD <= sandMax * sandMax;
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
    plantCoastWater(group, path, clearance, bounds, biome.ground);
    plantCoastBeachUmbrellas(group, path, clearance);
    plantCoastBeachBalls(group, path, clearance);
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
      const along = 40 + hash2(i, 17) * 18;
      const thick = 12 + hash2(i, 19) * 8;
      const h = 18 + hash2(i, 23) * 16;
      const yaw = a + Math.PI / 2;
      // Clearance must cover the whole foothill body, not just its center
      if (!clearance.sceneryOk(x, z, Math.max(24, along * 0.5 + 6))) continue;
      // …and never plant a foothill on top of a pine (trees sinking into mountains)
      const foothillFootprint = Math.max(along, thick) * 0.5 + 4;
      let hitsTree = false;
      for (const p of poses) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz < foothillFootprint * foothillFootprint) {
          hitsTree = true;
          break;
        }
      }
      if (hitsTree) continue;

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

    // Pine grove + small rocks in the infield center (clear of asphalt / runoff)
    const alpineInfieldTrees = plantAlpineInfieldTrees(
      group,
      path,
      clearance,
      dummy,
      bounds,
    );
    plantAlpineInfieldRocks(
      group,
      path,
      clearance,
      dummy,
      bounds,
      alpineInfieldTrees,
    );
  }

  if (biome.props === "lights") {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.6, roughness: 0.4 });
    const lampMat = makeNightLampMaterial(0.3, 5.2);
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
      // Sparse point lights (every other pole) — enough glow without lighting budget blow-up
      if (lamps.count % 2 === 1) {
        group.add(makeNightPointLight(p.x, 6.2, p.z, 1.35, 20));
      }
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

/** Construction yard — doughnut tire walls, steel-frame buildings, crane, site clutter. */
function plantYardSite(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  roadHalf: number,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
  sceneryScale: number,
  inCut?: (x: number, z: number) => boolean,
  heightAt?: (t: number) => number,
  skipTireAt?: (t: number) => boolean,
) {
  const dummy = new THREE.Object3D();
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const n = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const scale = Math.max(0.35, Math.min(1, sceneryScale));
  const pathLen = path.getLength();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    roughness: 0.88,
    metalness: 0.06,
  });
  const sidewall = new THREE.MeshStandardMaterial({
    color: 0x3a3e44,
    roughness: 0.82,
    metalness: 0.08,
  });
  // Torus lies in XY, hole along Z — rotate so the hole faces the road.
  const tireGeo = new THREE.TorusGeometry(0.46, 0.16, 8, 18);
  const tireN = Math.min(900, Math.max(120, Math.floor((pathLen / 1.45) * 2 * 1.2 * scale)));
  const tires = new THREE.InstancedMesh(tireGeo, rubber, tireN);
  tires.count = 0;
  tires.castShadow = true;
  tires.receiveShadow = true;
  const wallGeo = new THREE.TorusGeometry(0.32, 0.055, 6, 14);
  const walls = new THREE.InstancedMesh(wallGeo, sidewall, tireN);
  walls.count = 0;

  const placedX: number[] = [];
  const placedZ: number[] = [];
  const minSep = 1.35;
  const minSep2 = minSep * minSep;
  const onShoulder = (x: number, z: number) => {
    const d = Math.sqrt(clearance.minDist2(x, z));
    return d >= roadHalf + 0.82 && d <= roadHalf + 2.15;
  };
  const farFromPlaced = (x: number, z: number) => {
    for (let p = 0; p < placedX.length; p++) {
      const dx = x - placedX[p]!;
      const dz = z - placedZ[p]!;
      if (dx * dx + dz * dz < minSep2) return false;
    }
    return true;
  };
  const cutBlocked = (x: number, z: number) => !!inCut?.(x, z);

  const step = 1.4;
  const samples = Math.max(80, Math.floor(pathLen / step));
  for (let i = 0; i < samples; i++) {
    const u = (i / samples) % 1;
    if (skipTireAt?.(u)) continue;
    path.getPointAt(u, p);
    path.getTangentAt(u, tan).normalize();
    n.set(-tan.z, 0, tan.x);
    const lat = roadHalf + 1.28;
    const yTire = (heightAt?.(u) ?? 0) + 0.46;
    // Don't plant tires in/near the ditch or on the bridge gap.
    if (yTire < 0.2 || Math.abs((heightAt?.(u) ?? 0)) > 0.12) continue;
    for (const side of [-1, 1] as const) {
      const x = p.x + n.x * side * lat;
      const z = p.z + n.z * side * lat;
      if (cutBlocked(x, z) || !onShoulder(x, z) || !farFromPlaced(x, z) || tires.count >= tireN) continue;
      dummy.quaternion.setFromUnitVectors(zAxis, n);
      dummy.position.set(x, yTire, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tires.setMatrixAt(tires.count++, dummy.matrix);
      walls.setMatrixAt(walls.count++, dummy.matrix);
      placedX.push(x);
      placedZ.push(z);
    }
  }
  tires.instanceMatrix.needsUpdate = true;
  walls.instanceMatrix.needsUpdate = true;
  tires.computeBoundingSphere();
  walls.computeBoundingSphere();
  group.add(tires);
  group.add(walls);

  // Loose tires lying on the gravel (hole facing up)
  const looseN = Math.floor(40 * scale);
  const loose = new THREE.InstancedMesh(tireGeo, rubber, looseN);
  loose.count = 0;
  dummy.quaternion.identity();
  for (let i = 0; i < samples && loose.count < looseN; i++) {
    if (hash2(i, 23) > 0.08) continue;
    const u = (i / samples) % 1;
    path.getPointAt(u, p);
    path.getTangentAt(u, tan).normalize();
    n.set(-tan.z, 0, tan.x);
    const side = hash2(i, 29) < 0.5 ? -1 : 1;
    const lat = roadHalf + 3.2 + hash2(i, 31) * 1.6;
    const x = p.x + n.x * side * lat;
    const z = p.z + n.z * side * lat;
    const d = Math.sqrt(clearance.minDist2(x, z));
    if (cutBlocked(x, z) || d < roadHalf + 2.4 || d > roadHalf + 6) continue;
    dummy.position.set(x, 0.16, z);
    dummy.rotation.set(Math.PI / 2, hash2(i, 37) * 6, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    loose.setMatrixAt(loose.count++, dummy.matrix);
  }
  loose.instanceMatrix.needsUpdate = true;
  loose.computeBoundingSphere();
  group.add(loose);

  const coneMat = new THREE.MeshStandardMaterial({
    color: 0xf26a12,
    roughness: 0.55,
    metalness: 0.08,
  });
  const coneGeo = new THREE.ConeGeometry(0.16, 0.48, 8);
  const startP = path.getPointAt(0);
  const startTan = path.getTangentAt(0).normalize();
  const startN = new THREE.Vector3(-startTan.z, 0, startTan.x);
  for (const side of [-1, 1] as const) {
    for (let k = 0; k < 6; k++) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position
        .copy(startP)
        .addScaledVector(startN, side * (roadHalf + 0.4))
        .addScaledVector(startTan, -4 + k * 1.15);
      cone.position.y = 0.24;
      group.add(cone);
    }
  }

  const dirtMat = new THREE.MeshStandardMaterial({
    color: 0x9a7a48,
    roughness: 1,
    metalness: 0.02,
    flatShading: true,
  });
  const dirtGeo = new THREE.SphereGeometry(1.2, 6, 5);
  const dirtN = Math.floor(22 * scale);
  const dirt = new THREE.InstancedMesh(dirtGeo, dirtMat, dirtN);
  dirt.count = 0;
  if (!inCut) {
    const infield = collectSpacedInfieldPoints(path, clearance, bounds, {
      count: dirtN,
      minSep: 11,
      clearFoot: 2.8,
    });
    for (const { x, z, i } of infield) {
      if (dirt.count >= dirtN) break;
      const s = 1.5 + hash2(i, 41) * 2.4;
      dummy.position.set(x, s * 0.38, z);
      dummy.quaternion.identity();
      dummy.scale.set(s, s * 0.55, s * 0.9);
      dummy.rotation.set(0, hash2(i, 43) * 6, 0);
      dummy.updateMatrix();
      dirt.setMatrixAt(dirt.count++, dummy.matrix);
    }
  }
  dirt.instanceMatrix.needsUpdate = true;
  dirt.computeBoundingSphere();
  group.add(dirt);

  const crateMats = [
    new THREE.MeshStandardMaterial({ color: 0xc45a1c, roughness: 0.55, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0x2e6a9a, roughness: 0.55, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0x2f7a4a, roughness: 0.55, metalness: 0.22 }),
  ];
  const crateN = Math.floor(16 * scale);
  const crates = crateMats.map((mat) => {
    const mesh = new THREE.InstancedMesh(boxGeo, mat, crateN);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  });
  const placeCrate = (x: number, z: number, i: number) => {
    const mesh = crates[i % crates.length]!;
    if (mesh.count >= crateN) return;
    dummy.quaternion.identity();
    dummy.position.set(x, 1.3, z);
    dummy.rotation.set(0, hash2(i, 47) * Math.PI, 0);
    dummy.scale.set(6.1, 2.55, 2.45);
    dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count++, dummy.matrix);
  };
  collectSpacedInfieldPoints(path, clearance, bounds, {
    count: inCut ? 0 : Math.floor(8 * scale),
    minSep: 16,
    clearFoot: 4.4,
  }).forEach(({ x, z, i }) => placeCrate(x, z, i));
  for (let i = 0; i < Math.floor(12 * scale); i++) {
    const u = hash2(i, 53);
    path.getPointAt(u, p);
    path.getTangentAt(u, tan).normalize();
    n.set(-tan.z, 0, tan.x);
    const side = hash2(i, 59) < 0.5 ? -1 : 1;
    const x = p.x + n.x * side * (roadHalf + 14 + hash2(i, 61) * 8);
    const z = p.z + n.z * side * (roadHalf + 14 + hash2(i, 61) * 8);
    if (cutBlocked(x, z) || !clearance.sceneryOk(x, z, 4.5)) continue;
    placeCrate(x, z, i + 40);
  }
  for (const mesh of crates) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  const pickOutfield = (seed: number, dist: number, foot: number) => {
    for (let t = 0; t < 14; t++) {
      const u = (hash2(seed, t + 3) + t * 0.07) % 1;
      path.getPointAt(u, p);
      path.getTangentAt(u, tan).normalize();
      n.set(-tan.z, 0, tan.x);
      const side = hash2(seed, t + 11) < 0.5 ? -1 : 1;
      const x = p.x + n.x * side * dist;
      const z = p.z + n.z * side * dist;
      if (cutBlocked(x, z) || !clearance.sceneryOk(x, z, foot)) continue;
      return { x, z, yaw: Math.atan2(tan.x, tan.z) };
    }
    return null;
  };

  const greenDump = new THREE.MeshStandardMaterial({
    color: 0x2d6b38,
    roughness: 0.55,
    metalness: 0.18,
  });
  const dumpLid = new THREE.MeshStandardMaterial({
    color: 0x1e4a26,
    roughness: 0.5,
    metalness: 0.2,
  });
  const addDumpster = (x: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.15, 1.45), greenDump);
    body.position.y = 0.62;
    g.add(body);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.12, 1.55), dumpLid);
    lip.position.y = 1.22;
    g.add(lip);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.5), dumpLid);
    lid.position.set(-0.55, 1.42, 0);
    lid.rotation.z = -0.45;
    g.add(lid);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    group.add(g);
  };
  for (let i = 0; i < Math.floor(5 * scale); i++) {
    const spot = pickOutfield(200 + i, roadHalf + 12 + i * 0.8, 2.2);
    if (spot) addDumpster(spot.x, spot.z, spot.yaw);
  }

  const pottyBlue = new THREE.MeshStandardMaterial({
    color: 0x3a7ec4,
    roughness: 0.48,
    metalness: 0.12,
  });
  const pottyWhite = new THREE.MeshStandardMaterial({
    color: 0xe8eef4,
    roughness: 0.55,
    metalness: 0.08,
  });
  for (let i = 0; i < Math.floor(4 * scale); i++) {
    const spot = pickOutfield(310 + i, roadHalf + 11, 1.2);
    if (!spot) continue;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.25, 1.05), pottyBlue);
    body.position.y = 1.15;
    g.add(body);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.7, 0.06), pottyWhite);
    door.position.set(0, 1.05, 0.54);
    g.add(door);
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.35), pottyWhite);
    vent.position.y = 2.32;
    g.add(vent);
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  const wood = new THREE.MeshStandardMaterial({
    color: 0xb08948,
    roughness: 0.82,
    metalness: 0.04,
  });
  for (let i = 0; i < Math.floor(5 * scale); i++) {
    const spot = pickOutfield(410 + i, roadHalf + 13, 1.8);
    if (!spot) continue;
    const g = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.18), wood);
      plank.position.set(0, 0.08 + k * 0.12, (k % 2) * 0.04);
      g.add(plank);
    }
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x8a9098,
    roughness: 0.35,
    metalness: 0.7,
  });
  const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8);
  for (let i = 0; i < Math.floor(4 * scale); i++) {
    const spot = pickOutfield(510 + i, roadHalf + 12.5, 1.6);
    if (!spot) continue;
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 0.14 + (k % 2) * 0.22, -0.35 + k * 0.18);
      g.add(pipe);
    }
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  const palletMat = new THREE.MeshStandardMaterial({
    color: 0x9a7a4a,
    roughness: 0.85,
    metalness: 0.05,
  });
  for (let i = 0; i < Math.floor(4 * scale); i++) {
    const spot = pickOutfield(610 + i, roadHalf + 11.5, 1.4);
    if (!spot) continue;
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.1), palletMat);
    deck.position.y = 0.14;
    g.add(deck);
    for (const sx of [-0.5, 0, 0.5]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.1), palletMat);
      slat.position.set(sx, 0.06, 0);
      g.add(slat);
    }
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  // Cement mixer
  const mixerSpot = pickOutfield(700, roadHalf + 16, 3.2);
  if (mixerSpot) {
    const g = new THREE.Group();
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 1.6), new THREE.MeshStandardMaterial({
      color: 0xc8c4b0,
      roughness: 0.55,
      metalness: 0.2,
    }));
    chassis.position.y = 0.85;
    g.add(chassis);
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.85, 2.1, 10),
      new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.4, metalness: 0.35 }),
    );
    drum.rotation.z = 0.55;
    drum.position.set(0.35, 1.85, 0);
    g.add(drum);
    g.position.set(mixerSpot.x, 0, mixerSpot.z);
    g.rotation.y = mixerSpot.yaw;
    group.add(g);
  }

  // Mini excavator
  const digSpot = pickOutfield(740, roadHalf + 17, 3.5);
  if (digSpot) {
    const g = new THREE.Group();
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xf0a020, roughness: 0.45, metalness: 0.22 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.4, metalness: 0.55 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.6), cabMat);
    body.position.y = 1.15;
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.4), new THREE.MeshStandardMaterial({
      color: 0x1a2430,
      roughness: 0.35,
      metalness: 0.15,
    }));
    cab.position.set(-0.35, 2.05, 0);
    g.add(cab);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 0.28), steel);
    boom.position.set(1.6, 1.7, 0);
    boom.rotation.z = -0.45;
    g.add(boom);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.22), steel);
    stick.position.set(2.85, 1.15, 0);
    stick.rotation.z = 0.7;
    g.add(stick);
    const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.8), steel);
    bucket.position.set(3.45, 0.45, 0);
    g.add(bucket);
    g.position.set(digSpot.x, 0, digSpot.z);
    g.rotation.y = digSpot.yaw;
    group.add(g);
  }

  // Floodlight tower
  const lightSpot = pickOutfield(780, roadHalf + 15, 1.5);
  if (lightSpot) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 8.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.4, metalness: 0.6 }),
    );
    pole.position.y = 4.25;
    g.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.35, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xf4f0d8,
        roughness: 0.3,
        emissive: 0xfff2c4,
        emissiveIntensity: 0.35,
      }),
    );
    lamp.position.set(0.4, 8.3, 0);
    g.add(lamp);
    g.position.set(lightSpot.x, 0, lightSpot.z);
    g.rotation.y = lightSpot.yaw;
    group.add(g);
  }

  const jerseyMat = new THREE.MeshStandardMaterial({
    color: 0xc8c4b8,
    roughness: 0.7,
    metalness: 0.05,
  });
  const jerseyN = Math.floor(36 * scale);
  const jersey = new THREE.InstancedMesh(boxGeo, jerseyMat, jerseyN);
  jersey.count = 0;
  for (let i = 0; i < samples && jersey.count < jerseyN; i++) {
    if (hash2(i, 71) > 0.08) continue;
    const u = (i / samples) % 1;
    path.getPointAt(u, p);
    path.getTangentAt(u, tan).normalize();
    n.set(-tan.z, 0, tan.x);
    const side = hash2(i, 73) < 0.5 ? -1 : 1;
    dummy.quaternion.identity();
    dummy.position.set(p.x + n.x * side * (roadHalf + 3.1), 0.45, p.z + n.z * side * (roadHalf + 3.1));
    if (cutBlocked(dummy.position.x, dummy.position.z)) continue;
    dummy.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    dummy.scale.set(1.8, 0.9, 0.42);
    dummy.updateMatrix();
    jersey.setMatrixAt(jersey.count++, dummy.matrix);
  }
  jersey.instanceMatrix.needsUpdate = true;
  jersey.computeBoundingSphere();
  group.add(jersey);

  const steel = new THREE.MeshStandardMaterial({
    color: 0xf0c020,
    roughness: 0.4,
    metalness: 0.55,
  });
  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x3a4048,
    roughness: 0.45,
    metalness: 0.5,
  });
  const craneSpot = pickOutfield(90, roadHalf + 24, 8) ?? {
    x: bounds.cx + 28,
    z: bounds.cz + 22,
    yaw: 0.4,
  };
  const crane = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.1, 32, 1.1), steel);
  mast.position.y = 16;
  crane.add(mast);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(36, 0.7, 0.7), steel);
  jib.position.set(11, 31.2, 0);
  crane.add(jib);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, 0.7), steel);
  counter.position.set(-6, 31.2, 0);
  crane.add(counter);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 2.4), darkSteel);
  cab.position.set(0, 30.2, 0);
  crane.add(cab);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 0.35), darkSteel);
  hook.position.set(24, 28.2, 0);
  crane.add(hook);
  crane.position.set(craneSpot.x, 0, craneSpot.z);
  crane.rotation.y = craneSpot.yaw;
  group.add(crane);

  const scaffoldMat = new THREE.MeshStandardMaterial({
    color: 0xb8bcc2,
    roughness: 0.4,
    metalness: 0.65,
  });
  const addScaffold = (x: number, z: number, yaw: number) => {
    const frame = new THREE.Group();
    for (const hx of [-1.1, 1.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6.2, 0.12), scaffoldMat);
      post.position.set(hx, 3.1, 0);
      frame.add(post);
    }
    for (const hy of [1.9, 3.8, 5.6]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), scaffoldMat);
      bar.position.set(0, hy, 0);
      frame.add(bar);
    }
    frame.position.set(x, 0, z);
    frame.rotation.y = yaw;
    group.add(frame);
  };
  for (let i = 0; i < Math.floor(5 * scale); i++) {
    const spot = pickOutfield(820 + i, roadHalf + 14, 2.4);
    if (spot) addScaffold(spot.x, spot.z, spot.yaw);
  }

  // Large steel-frame buildings + extra yard clutter stay in the outfield
  // (sceneryOk + occupied spacing) so they never sit on the 16m asphalt.
  const frameSteel = new THREE.MeshStandardMaterial({
    color: 0x6e767e,
    roughness: 0.42,
    metalness: 0.58,
  });
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0xc2beb4,
    roughness: 0.9,
    metalness: 0.06,
  });
  const plySheet = new THREE.MeshStandardMaterial({
    color: 0xc4a05a,
    roughness: 0.78,
    metalness: 0.04,
  });
  const safetyNet = new THREE.MeshStandardMaterial({
    color: 0xe85a12,
    roughness: 0.7,
    metalness: 0.05,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  const floodPoleMat = new THREE.MeshStandardMaterial({
    color: 0x8a9098,
    roughness: 0.4,
    metalness: 0.6,
  });
  const floodLampMat = new THREE.MeshStandardMaterial({
    color: 0xf4f0d8,
    roughness: 0.3,
    emissive: 0xfff2c4,
    emissiveIntensity: 0.35,
  });
  const colGeo = new THREE.BoxGeometry(0.28, 1, 0.28);
  const beamGeo = new THREE.BoxGeometry(1, 0.2, 0.2);
  const slabThinGeo = new THREE.BoxGeometry(1, 1, 1);

  const occupied: { x: number; z: number; r: number }[] = [
    { x: craneSpot.x, z: craneSpot.z, r: 10 },
  ];
  const siteClear = (x: number, z: number, r: number) => {
    for (const o of occupied) {
      const dx = x - o.x;
      const dz = z - o.z;
      if (dx * dx + dz * dz < (r + o.r) * (r + o.r)) return false;
    }
    return true;
  };
  const claimSite = (u0: number, dist: number, foot: number) => {
    for (let k = 0; k < 10; k++) {
      const u = (u0 + k * 0.04) % 1;
      path.getPointAt(u, p);
      path.getTangentAt(u, tan).normalize();
      n.set(-tan.z, 0, tan.x);
      for (const side of [-1, 1] as const) {
        for (const extra of [0, 5, 10, 16]) {
          const x = p.x + n.x * side * (dist + extra);
          const z = p.z + n.z * side * (dist + extra);
          if (cutBlocked(x, z) || !clearance.sceneryOk(x, z, foot) || !siteClear(x, z, foot)) continue;
          occupied.push({ x, z, r: foot });
          return { x, z, yaw: Math.atan2(tan.x, tan.z) };
        }
      }
    }
    return null;
  };
  const pickAround = (seed: number, dist: number, foot: number) => {
    for (let t = 0; t < 22; t++) {
      const u = (hash2(seed, t + 3) + t * 0.047) % 1;
      path.getPointAt(u, p);
      path.getTangentAt(u, tan).normalize();
      n.set(-tan.z, 0, tan.x);
      const side = hash2(seed, t + 11) < 0.5 ? -1 : 1;
      const spread = dist + hash2(seed, t + 19) * 6;
      const x = p.x + n.x * side * spread;
      const z = p.z + n.z * side * spread;
      if (cutBlocked(x, z) || !clearance.sceneryOk(x, z, foot) || !siteClear(x, z, foot)) continue;
      occupied.push({ x, z, r: foot });
      return { x, z, yaw: Math.atan2(tan.x, tan.z) };
    }
    return null;
  };

  const addFrameBuilding = (
    x: number,
    z: number,
    yaw: number,
    baysX: number,
    baysZ: number,
    floors: number,
    slabUntil: number,
    clad: boolean,
  ) => {
    const g = new THREE.Group();
    const bay = 4.4;
    const floorH = 3.35;
    const w = baysX * bay;
    const d = baysZ * bay;
    const h = floors * floorH;

    const pad = new THREE.Mesh(slabThinGeo, slabMat);
    pad.position.y = 0.12;
    pad.scale.set(w + 1.4, 0.24, d + 1.4);
    g.add(pad);

    for (let ix = 0; ix <= baysX; ix++) {
      for (let iz = 0; iz <= baysZ; iz++) {
        const col = new THREE.Mesh(colGeo, frameSteel);
        col.position.set(-w * 0.5 + ix * bay, h * 0.5, -d * 0.5 + iz * bay);
        col.scale.set(1, h, 1);
        g.add(col);
      }
    }

    for (let f = 1; f <= floors; f++) {
      const y = f * floorH;
      for (let iz = 0; iz <= baysZ; iz++) {
        const beam = new THREE.Mesh(beamGeo, frameSteel);
        beam.position.set(0, y, -d * 0.5 + iz * bay);
        beam.scale.set(w + 0.2, 1, 1);
        g.add(beam);
      }
      for (let ix = 0; ix <= baysX; ix++) {
        const beam = new THREE.Mesh(beamGeo, frameSteel);
        beam.position.set(-w * 0.5 + ix * bay, y, 0);
        beam.rotation.y = Math.PI / 2;
        beam.scale.set(d + 0.2, 1, 1);
        g.add(beam);
      }
      if (f <= slabUntil) {
        const slab = new THREE.Mesh(slabThinGeo, slabMat);
        slab.position.y = y - 0.1;
        const shrink = f === slabUntil ? 0.82 : 0.96;
        slab.scale.set(w * shrink, 0.16, d * shrink);
        g.add(slab);
      }
    }

    if (clad) {
      const wallH = floorH * 0.92;
      const front = new THREE.Mesh(slabThinGeo, plySheet);
      front.position.set(0, wallH * 0.5, d * 0.5 + 0.08);
      front.scale.set(w * 0.92, wallH, 0.08);
      g.add(front);
      const sideW = new THREE.Mesh(slabThinGeo, plySheet);
      sideW.position.set(-w * 0.5 - 0.08, wallH * 0.5, 0);
      sideW.scale.set(0.08, wallH, d * 0.7);
      g.add(sideW);
      const net = new THREE.Mesh(slabThinGeo, safetyNet);
      net.position.set(w * 0.5 + 0.06, h * 0.42, 0);
      net.scale.set(0.05, h * 0.78, d * 0.9);
      g.add(net);
    } else {
      for (let f = 0; f < Math.min(floors, 3); f++) {
        const brace = new THREE.Mesh(beamGeo, frameSteel);
        brace.position.set(0, f * floorH + floorH * 0.5, -d * 0.5);
        brace.rotation.z = f % 2 === 0 ? 0.55 : -0.55;
        brace.scale.set(bay * 1.15, 0.7, 0.7);
        g.add(brace);
      }
    }

    if (floors >= 4) {
      const core = new THREE.Mesh(slabThinGeo, slabMat);
      core.position.set(-w * 0.5 + bay * 0.5, h * 0.55, -d * 0.5 + bay * 0.5);
      core.scale.set(bay * 0.7, h * 1.1, bay * 0.7);
      g.add(core);
    }

    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    group.add(g);
    return { w, d };
  };

  const buildingSpecs = [
    { u: 0.14, dist: roadHalf + 30, foot: 11, baysX: 3, baysZ: 2, floors: 5, slabUntil: 2, clad: false },
    { u: 0.47, dist: roadHalf + 28, foot: 10, baysX: 3, baysZ: 2, floors: 3, slabUntil: 2, clad: true },
    { u: 0.78, dist: roadHalf + 32, foot: 12, baysX: 4, baysZ: 2, floors: 2, slabUntil: 1, clad: false },
  ];
  const buildingFallbacks = [
    { x: bounds.maxX + 8, z: bounds.cz - 16, yaw: 0.15 },
    { x: bounds.minX - 8, z: bounds.cz + 8, yaw: Math.PI * 0.92 },
    { x: bounds.cx + 12, z: bounds.maxZ + 8, yaw: 1.2 },
  ];
  for (let si = 0; si < buildingSpecs.length; si++) {
    const spec = buildingSpecs[si]!;
    let spot = claimSite(spec.u, spec.dist, spec.foot);
    if (!spot) {
      const fb = buildingFallbacks[si]!;
      if (!cutBlocked(fb.x, fb.z) && clearance.sceneryOk(fb.x, fb.z, spec.foot) && siteClear(fb.x, fb.z, spec.foot)) {
        occupied.push({ x: fb.x, z: fb.z, r: spec.foot });
        spot = fb;
      }
    }
    if (!spot) continue;
    const built = addFrameBuilding(
      spot.x,
      spot.z,
      spot.yaw,
      spec.baysX,
      spec.baysZ,
      spec.floors,
      spec.slabUntil,
      spec.clad,
    );
    const sx = spot.x + Math.sin(spot.yaw) * (built.d * 0.5 + 1.9);
    const sz = spot.z + Math.cos(spot.yaw) * (built.d * 0.5 + 1.9);
    if (!cutBlocked(sx, sz) && clearance.sceneryOk(sx, sz, 2.2) && siteClear(sx, sz, 2.2)) {
      occupied.push({ x: sx, z: sz, r: 2.2 });
      addScaffold(sx, sz, spot.yaw);
    }
  }

  const addFloodTower = (x: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 8.5, 6), floodPoleMat);
    pole.position.y = 4.25;
    g.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.55), floodLampMat);
    lamp.position.set(0.4, 8.3, 0);
    g.add(lamp);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    group.add(g);
  };
  for (let i = 0; i < Math.floor(3 * scale); i++) {
    const spot = pickAround(860 + i, roadHalf + 17 + i * 2, 1.5);
    if (spot) addFloodTower(spot.x, spot.z, spot.yaw);
  }

  for (let i = 0; i < Math.floor(3 * scale); i++) {
    const spot = pickAround(880 + i, roadHalf + 18, 2.2);
    if (spot) addDumpster(spot.x, spot.z, spot.yaw);
  }

  for (let i = 0; i < Math.floor(2 * scale); i++) {
    const spot = pickAround(900 + i, roadHalf + 16, 1.2);
    if (!spot) continue;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.25, 1.05), pottyBlue);
    body.position.y = 1.15;
    g.add(body);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.7, 0.06), pottyWhite);
    door.position.set(0, 1.05, 0.54);
    g.add(door);
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.35), pottyWhite);
    vent.position.y = 2.32;
    g.add(vent);
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  for (let i = 0; i < Math.floor(2 * scale); i++) {
    const spot = pickAround(920 + i, roadHalf + 17, 1.8);
    if (!spot) continue;
    const g = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.18), wood);
      plank.position.set(0, 0.08 + k * 0.12, (k % 2) * 0.04);
      g.add(plank);
    }
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  for (let i = 0; i < Math.floor(2 * scale); i++) {
    const spot = pickAround(940 + i, roadHalf + 16.5, 1.6);
    if (!spot) continue;
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 0.14 + (k % 2) * 0.22, -0.35 + k * 0.18);
      g.add(pipe);
    }
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  for (let i = 0; i < Math.floor(2 * scale); i++) {
    const spot = pickAround(960 + i, roadHalf + 16, 1.4);
    if (!spot) continue;
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.1), palletMat);
    deck.position.y = 0.14;
    g.add(deck);
    for (const sx of [-0.5, 0, 0.5]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.1), palletMat);
      slat.position.set(sx, 0.06, 0);
      g.add(slat);
    }
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.yaw;
    group.add(g);
  }

  for (let i = 0; i < Math.floor(3 * scale); i++) {
    const spot = pickAround(980 + i, roadHalf + 19, 2.4);
    if (spot) addScaffold(spot.x, spot.z, spot.yaw);
  }

  const dirtOutN = Math.floor(6 * scale);
  const dirtOut = new THREE.InstancedMesh(dirtGeo, dirtMat, dirtOutN);
  dirtOut.count = 0;
  dirtOut.castShadow = true;
  dirtOut.receiveShadow = true;
  for (let i = 0; i < 16 && dirtOut.count < dirtOutN; i++) {
    const spot = pickAround(1000 + i, roadHalf + 18 + (i % 3) * 2, 2.6);
    if (!spot) continue;
    const s = 1.6 + hash2(i, 81) * 2.2;
    dummy.position.set(spot.x, s * 0.38, spot.z);
    dummy.quaternion.identity();
    dummy.scale.set(s, s * 0.55, s * 0.9);
    dummy.rotation.set(0, hash2(i, 83) * 6, 0);
    dummy.updateMatrix();
    dirtOut.setMatrixAt(dirtOut.count++, dummy.matrix);
  }
  dirtOut.instanceMatrix.needsUpdate = true;
  dirtOut.computeBoundingSphere();
  group.add(dirtOut);
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
  // Step from target density — do not cap low on large maps (that + early exit
  // filled only the west lobe of Meadow Sweep before hitting `count`).
  const step = Math.max(
    minSep * 0.9,
    Math.sqrt((spanX * spanZ) / Math.max(12, opts.count * 2.2)),
  );
  const out: { x: number; z: number; i: number }[] = [];
  let attempt = 0;
  // Scan the full AABB first, then subsample — left-to-right early exit left
  // eastern / central clear infield empty on wide circuits.
  for (let gx = minX; gx <= maxX; gx += step) {
    for (let gz = minZ; gz <= maxZ; gz += step) {
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
  if (out.length <= opts.count) return out;
  const kept: { x: number; z: number; i: number }[] = [];
  for (let i = 0; i < opts.count; i++) {
    const idx = Math.min(out.length - 1, Math.floor(((i + 0.5) * out.length) / opts.count));
    kept.push(out[idx]!);
  }
  return kept;
}

/** Pine trees in the Summit Pass infield — inside the loop, off the ribbon. */
function plantAlpineInfieldTrees(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  dummy: THREE.Object3D,
  bounds: ReturnType<typeof pathBounds>,
): { x: number; z: number }[] {
  // Dense stand across the clear infield center (was ~48 @ 7.5m, then ~110 @ 5.2m)
  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: 175,
    minSep: 4.4,
    clearFoot: 2.5,
  });
  if (!points.length) return [];

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
  return points;
}

/** Small alpine rocks scattered through the Summit Pass infield (clear of ribbon). */
function plantAlpineInfieldRocks(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  dummy: THREE.Object3D,
  bounds: ReturnType<typeof pathBounds>,
  avoidTrees: readonly { x: number; z: number }[],
) {
  const treeClear2 = 2.8 * 2.8;
  // Slightly denser / tighter than pines so rocks tuck between trunks
  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: 85,
    minSep: 3.6,
    clearFoot: 1.4,
    exclude: (x, z) => {
      for (const t of avoidTrees) {
        const dx = t.x - x;
        const dz = t.z - z;
        if (dx * dx + dz * dz < treeClear2) return true;
      }
      return false;
    },
  });
  if (!points.length) return;

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x8a949e,
    roughness: 0.93,
    metalness: 0.04,
    flatShading: true,
    emissive: 0x303844,
    emissiveIntensity: 0.06,
  });
  const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(boulderGeo, rockMat, points.length);
  rocks.count = 0;
  rocks.castShadow = false;
  rocks.receiveShadow = true;
  rocks.frustumCulled = true;

  for (const { x, z, i } of points) {
    // Smaller than outfield roadside boulders — infield clutter, not walls
    const s = 0.45 + hash2(i, 19) * 1.15;
    dummy.position.set(x, s * 0.38, z);
    dummy.scale.set(s, s * (0.55 + hash2(i, 23) * 0.4), s);
    dummy.rotation.set(hash2(i, 29) * 1.2, hash2(i, 31) * 6, hash2(i, 37) * 0.8);
    dummy.updateMatrix();
    rocks.setMatrixAt(rocks.count++, dummy.matrix);
  }

  if (!rocks.count) return;
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  group.add(rocks);
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
    // Map already carries wall + window colors; keep albedo white so it isn't double-tinted.
    // emissiveMap reuses the facade so lit windows glow at night (dark panes stay dark).
    const dayEmit = s.emissiveIntensity ?? 0;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      roughness: s.roughness,
      metalness: s.metalness,
      emissive: s.emissive ?? 0xffe8a0,
      emissiveMap: map,
      emissiveIntensity: dayEmit,
    });
    mat.userData.nightLamp = true;
    mat.userData.emissiveDay = dayEmit;
    mat.userData.emissiveNight = Math.max(0.85, dayEmit + 0.95);
    return mat;
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
  const lampMat = makeNightLampMaterial(0.28, 6.0);

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

  // Streetlights along the outer curb — emissive bulbs + PointLights (night via WeatherController)
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
    // Sparse PointLights (every other pole) — emissive bulbs remain on every lamp.
    if (lamps.count % 2 === 1) {
      group.add(makeNightPointLight(x, 6.5, z, 1.75, 24));
    }
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
  // Gravel walking ring only — no cross strips (those read as dark lines
  // cutting through the lawn from camera height / slight z-fight with grass).
  const pathRing = new THREE.Mesh(ringStripGeometry(pathInner, pathOuter, -0.02), pathMat);
  pathRing.receiveShadow = true;
  group.add(pathRing);

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
 * Forest Loop infield — dense stand of one simple deciduous tree type
 * (cylinder trunk + sphere canopy). Outfield uses the same via plantVegetation.
 * Clear of asphalt / runoff via PathClearance.
 */
function plantForestInfieldGrove(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
  sceneryScale = 1,
) {
  const countScale = Math.max(0.25, Math.min(1, sceneryScale));
  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: Math.round(260 * countScale),
    minSep: 4.2 / Math.sqrt(countScale),
    clearFoot: 2.5,
  });
  if (!points.length) return;

  const mats = VEG_MATS.trees;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.2, 5);
  const canopyGeo = new THREE.SphereGeometry(1.35, 6, 6);
  const canopyMat = mats.canopy[0]!;
  const dummy = new THREE.Object3D();

  const n = points.length;
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, n);
  trunks.count = 0;
  trunks.castShadow = false;
  trunks.userData.sharedVegMat = true;
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, n);
  canopies.count = 0;
  canopies.castShadow = false;
  canopies.userData.sharedVegMat = true;

  for (const { x, z, i } of points) {
    const scale = 0.85 + hash2(i, 7) * 0.75;
    dummy.position.set(x, 0.6 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, hash2(i, 11) * 6, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(trunks.count++, dummy.matrix);

    const cr = scale * (1.15 + hash2(i, 17) * 0.3);
    dummy.position.set(x, 2.05 * scale, z);
    dummy.scale.set(cr, cr * 1.05, cr);
    dummy.updateMatrix();
    canopies.setMatrixAt(canopies.count++, dummy.matrix);
  }

  if (trunks.count) {
    trunks.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    group.add(trunks);
  }
  if (canopies.count) {
    canopies.instanceMatrix.needsUpdate = true;
    canopies.computeBoundingSphere();
    group.add(canopies);
  }
}

type MeadowFarmPlot = {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  yaw: number;
};

/** Local XZ → world XZ for the meadow farm rect. */
function meadowFarmWorld(
  plot: MeadowFarmPlot,
  lx: number,
  lz: number,
): { x: number; z: number } {
  const c = Math.cos(plot.yaw);
  const s = Math.sin(plot.yaw);
  return {
    x: plot.cx + lx * c - lz * s,
    z: plot.cz + lx * s + lz * c,
  };
}

/** True when (x,z) sits inside the farm clear patch (optional pad). */
function inMeadowFarmPatch(
  x: number,
  z: number,
  plot: MeadowFarmPlot,
  pad = 0,
): boolean {
  const c = Math.cos(plot.yaw);
  const s = Math.sin(plot.yaw);
  const dx = x - plot.cx;
  const dz = z - plot.cz;
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  return Math.abs(lx) <= plot.halfW + pad && Math.abs(lz) <= plot.halfD + pad;
}

function inAnyMeadowFarmPatch(
  x: number,
  z: number,
  plots: MeadowFarmPlot[],
  pad = 0,
): boolean {
  for (const plot of plots) {
    if (inMeadowFarmPatch(x, z, plot, pad)) return true;
  }
  return false;
}

/** Axis-aligned overlap in the shared farm yaw frame, with edge padding. */
function meadowFarmsOverlap(
  a: MeadowFarmPlot,
  b: MeadowFarmPlot,
  pad: number,
): boolean {
  const c = Math.cos(a.yaw);
  const s = Math.sin(a.yaw);
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  return (
    Math.abs(lx) < a.halfW + b.halfW + pad &&
    Math.abs(lz) < a.halfD + b.halfD + pad
  );
}

/** Min distance² from (x,z) to the racing-line samples (for chase-cam visibility scoring). */
function meadowPathDist2(path: THREE.CatmullRomCurve3, x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i <= 80; i++) {
    const p = path.getPointAt(i / 80);
    const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Pick up to four clear infield farm rects — prefer spots visible from the
 * racing line (chase cam). Always returns `target` plots when any infield
 * exists (aggressive size / clearance fallbacks).
 */
function resolveMeadowFarmPlots(
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
  target = 4,
): MeadowFarmPlot[] {
  const yaw = 0.28;
  const baseW = 14;
  const baseD = 11;
  /** Gap between soil pads (and tractor parking margin). */
  const betweenPad = 5;
  type Cand = { x: number; z: number; score: number };
  const candidates: Cand[] = [];

  const scoreCand = (x: number, z: number): number => {
    // Chase cam reads lateral infield best ~18–42m off asphalt; penalize buried deep lobes.
    const d = Math.sqrt(meadowPathDist2(path, x, z));
    const band = d < 16 ? 8 + (16 - d) : d > 48 ? (d - 48) * 1.4 : 0;
    return d + band;
  };

  let centroid: { x: number; z: number } | null = null;
  const outline = sampleInfieldClearOutline(path, clearance, 3.5, 96);
  if (outline.length >= 8) {
    let cx = 0;
    let cz = 0;
    for (const p of outline) {
      cx += p.x;
      cz += p.z;
    }
    centroid = { x: cx / outline.length, z: cz / outline.length };
    candidates.push({ ...centroid, score: scoreCand(centroid.x, centroid.z) });
    // Outline points hug the clear ribbon — best chase-cam sightlines
    for (let i = 0; i < outline.length; i += 3) {
      const p = outline[i]!;
      candidates.push({ x: p.x, z: p.z, score: scoreCand(p.x, p.z) });
    }
  }

  const samples = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: 96,
    minSep: 6,
    clearFoot: 1.6,
  });
  if (samples.length) {
    let ax = 0;
    let az = 0;
    for (const p of samples) {
      ax += p.x;
      az += p.z;
    }
    const mean = { x: ax / samples.length, z: az / samples.length };
    if (
      !centroid ||
      (mean.x - centroid.x) ** 2 + (mean.z - centroid.z) ** 2 > 4
    ) {
      candidates.push({ ...mean, score: scoreCand(mean.x, mean.z) });
    }

    if (centroid) {
      let maxR = 0;
      for (const p of samples) {
        const r = Math.hypot(p.x - centroid.x, p.z - centroid.z);
        if (r > maxR) maxR = r;
      }
      const ring = Math.max(18, maxR * 0.38);
      const dirs = [
        [1, 0],
        [-0.35, 1],
        [-0.35, -1],
        [0.2, 0.85],
        [0.2, -0.85],
        [-1, 0.15],
        [0.7, 0.7],
        [-0.7, 0.7],
      ] as const;
      for (const [dx, dz] of dirs) {
        const len = Math.hypot(dx, dz) || 1;
        const x = centroid.x + (dx / len) * ring;
        const z = centroid.z + (dz / len) * ring;
        candidates.push({ x, z, score: scoreCand(x, z) });
      }
    }

    for (const p of samples) {
      candidates.push({ x: p.x, z: p.z, score: scoreCand(p.x, p.z) });
    }
  }

  // Prefer near-track clear pockets first (visible from chase camera)
  candidates.sort((a, b) => a.score - b.score);

  const probe = [
    [0, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  const fitsClear = (
    cx: number,
    cz: number,
    halfW: number,
    halfD: number,
    foot: number,
    cornersOnly: boolean,
  ) => {
    const plot = { cx, cz, halfW, halfD, yaw };
    if (!clearance.insideLoop(cx, cz)) return false;
    if (!clearance.clearOf(cx, cz, Math.max(0.4, foot * 0.5))) return false;
    const checks = cornersOnly
      ? ([
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ] as const)
      : probe;
    for (const [sx, sz] of checks) {
      const { x, z } = meadowFarmWorld(plot, sx * halfW * 0.92, sz * halfD * 0.92);
      if (!clearance.insideLoop(x, z) || !clearance.clearOf(x, z, foot)) return false;
    }
    return true;
  };

  const plots: MeadowFarmPlot[] = [];
  const tried = new Set<string>();

  const tryPlace = (
    scales: number[],
    foot: number,
    pad: number,
    cornersOnly: boolean,
  ) => {
    for (const c of candidates) {
      if (plots.length >= target) break;
      const key = `${c.x.toFixed(1)},${c.z.toFixed(1)}`;
      if (tried.has(key) && foot > 0.5) continue;
      tried.add(key);

      for (const scale of scales) {
        const halfW = baseW * scale;
        const halfD = baseD * scale;
        if (!fitsClear(c.x, c.z, halfW, halfD, foot, cornersOnly)) continue;
        const plot: MeadowFarmPlot = { cx: c.x, cz: c.z, halfW, halfD, yaw };
        let overlaps = false;
        for (const other of plots) {
          if (meadowFarmsOverlap(plot, other, pad)) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) continue;
        plots.push(plot);
        break;
      }
    }
  };

  // Strict → relaxed until we hit the target (never leave Meadow Sweep farm-less)
  tryPlace([1, 0.9, 0.78, 0.65], 1.2, betweenPad, false);
  if (plots.length < target) {
    tried.clear();
    tryPlace([0.85, 0.7, 0.55, 0.42], 0.55, 3.5, false);
  }
  if (plots.length < target) {
    tried.clear();
    tryPlace([0.7, 0.55, 0.42, 0.32], 0.2, 2.5, true);
  }

  // Last resort: pin shrunk plots on the best clear samples (center only)
  if (plots.length < target) {
    for (const c of candidates) {
      if (plots.length >= target) break;
      if (!clearance.insideLoop(c.x, c.z) || !clearance.clearOf(c.x, c.z, 0.8)) continue;
      const plot: MeadowFarmPlot = {
        cx: c.x,
        cz: c.z,
        halfW: 7,
        halfD: 5.5,
        yaw,
      };
      let overlaps = false;
      for (const other of plots) {
        if (meadowFarmsOverlap(plot, other, 2)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      plots.push(plot);
    }
  }

  return plots;
}

/**
 * Brown soil plot + furrow lines + crop plants + low-poly tractor beside the field.
 * Soil is a raised BoxGeometry (not flatPoly) so FrontSide normals face the sky.
 * Kept inside the clear infield (caller already validated corners).
 */
function plantMeadowFarmPlot(
  group: THREE.Group,
  plot: MeadowFarmPlot,
  clearance: PathClearance,
  farmIndex = 0,
) {
  // Bright plough-brown — reads against meadow ground 0x8fbc4a from chase cam
  const soilColor = 0xb86836;
  const soilMat = new THREE.MeshStandardMaterial({
    color: soilColor,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const furrowMat = new THREE.MeshStandardMaterial({
    color: 0x6e3a14,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const cropMat = new THREE.MeshStandardMaterial({
    color: 0x2f9a28,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const cropLeafMat = new THREE.MeshStandardMaterial({
    color: 0x6ecf3a,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe23a22,
    roughness: 0.65,
    metalness: 0.15,
    flatShading: true,
  });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x2a333c,
    roughness: 0.55,
    metalness: 0.25,
    flatShading: true,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });
  const stackMat = new THREE.MeshStandardMaterial({
    color: 0x4a5058,
    roughness: 0.6,
    metalness: 0.35,
    flatShading: true,
  });

  const farm = new THREE.Group();
  farm.name = `farm-${farmIndex}`;
  farm.position.set(plot.cx, 0, plot.cz);
  farm.rotation.y = plot.yaw;

  // Raised soil slab — clearly above biome ground (-0.12); BoxGeometry = +Y tops
  const soilH = 0.32;
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(plot.halfW * 2, soilH, plot.halfD * 2),
    soilMat,
  );
  soil.name = `farm-${farmIndex}-soil`;
  soil.position.y = 0.06; // top ≈ 0.22 — unmistakable from chase cam
  soil.receiveShadow = true;
  soil.userData.surface = "dirt";
  soil.userData.baseColor = soilColor;
  farm.add(soil);

  // Furrow / crop lines — raised ridges on the soil pad
  const furrowCount = 5;
  const furrowGeo = new THREE.BoxGeometry(plot.halfW * 1.88, 0.12, 0.7);
  for (let i = 0; i < furrowCount; i++) {
    const t = (i + 0.5) / furrowCount;
    const lz = -plot.halfD * 0.8 + t * plot.halfD * 1.6;
    const furrow = new THREE.Mesh(furrowGeo, furrowMat);
    furrow.position.set(0, 0.24, lz);
    furrow.receiveShadow = true;
    farm.add(furrow);
  }

  // Plants growing along each furrow row (taller so they peek past the grove)
  const cropsPerRow = 11;
  const cropN = furrowCount * cropsPerRow;
  const stemGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.55, 4);
  const leafGeo = new THREE.SphereGeometry(0.38, 5, 4);
  const stems = new THREE.InstancedMesh(stemGeo, cropMat, cropN);
  const leaves = new THREE.InstancedMesh(leafGeo, cropLeafMat, cropN);
  stems.count = 0;
  leaves.count = 0;
  stems.castShadow = false;
  leaves.castShadow = false;
  const dummy = new THREE.Object3D();
  let plantI = 0;
  for (let row = 0; row < furrowCount; row++) {
    const tRow = (row + 0.5) / furrowCount;
    const lz = -plot.halfD * 0.8 + tRow * plot.halfD * 1.6;
    for (let col = 0; col < cropsPerRow; col++) {
      const tCol = (col + 0.5) / cropsPerRow;
      const lx = -plot.halfW * 0.84 + tCol * plot.halfW * 1.68;
      const h = 1.05 + hash2(plantI + 3, row * 17 + col) * 0.55;
      dummy.position.set(lx, 0.28 + 0.28 * h, lz);
      dummy.scale.set(h, h, h);
      dummy.rotation.set(0, hash2(col, row + 9) * 6, 0);
      dummy.updateMatrix();
      stems.setMatrixAt(stems.count++, dummy.matrix);
      dummy.position.set(lx, 0.55 + 0.42 * h, lz);
      dummy.scale.set(h * 0.95, h * 0.85, h * 0.95);
      dummy.updateMatrix();
      leaves.setMatrixAt(leaves.count++, dummy.matrix);
      plantI += 1;
    }
  }
  stems.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  stems.computeBoundingSphere();
  leaves.computeBoundingSphere();
  farm.add(stems);
  farm.add(leaves);

  // Tractor parked beside the field (local +Z edge), still in clear infield
  const tractor = new THREE.Group();
  tractor.name = `farm-${farmIndex}-tractor`;
  const parkLz = plot.halfD + 4.2;
  const parkLx = plot.halfW * 0.12;
  const parkWorld = meadowFarmWorld(plot, parkLx, parkLz);
  if (
    clearance.insideLoop(parkWorld.x, parkWorld.z) &&
    clearance.clearOf(parkWorld.x, parkWorld.z, 2.0)
  ) {
    tractor.position.set(parkLx, 0, parkLz);
  } else {
    const alt = meadowFarmWorld(plot, parkLx, -parkLz);
    if (clearance.insideLoop(alt.x, alt.z) && clearance.clearOf(alt.x, alt.z, 2.0)) {
      tractor.position.set(parkLx, 0, -parkLz);
      tractor.rotation.y = Math.PI;
    } else {
      // Park on the soil corner so the red body is never culled off-map
      tractor.position.set(plot.halfW * 0.55, 0, plot.halfD * 0.55);
      tractor.rotation.y = Math.PI / 2;
    }
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.35), bodyMat);
  body.position.set(0.15, 1.05, 0);
  body.castShadow = false;
  tractor.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 1.15), bodyMat);
  hood.position.set(1.05, 0.9, 0);
  tractor.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 1.05), cabinMat);
  cabin.position.set(-0.4, 1.65, 0);
  tractor.add(cabin);

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 5), stackMat);
  stack.position.set(0.7, 1.7, 0.35);
  tractor.add(stack);

  const rearWheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.42, 8);
  const frontWheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.34, 8);
  for (const [x, y, z, geo] of [
    [-0.55, 0.7, 0.78, rearWheelGeo],
    [-0.55, 0.7, -0.78, rearWheelGeo],
    [1.05, 0.4, 0.58, frontWheelGeo],
    [1.05, 0.4, -0.58, frontWheelGeo],
  ] as const) {
    const wheel = new THREE.Mesh(geo, wheelMat);
    // Cylinder axis is +Y; rotate around X so the axle runs left-right (±Z).
    // (rotation.z laid it along the tractor's length — wheels looked twisted.)
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y, z);
    tractor.add(wheel);
  }

  farm.add(tractor);
  group.add(farm);
}

/**
 * Meadow Sweep infield — dense deciduous grove with four farmer's plots
 * (center + offset lobes): brown soil, crop rows, tractor. Clear of asphalt / runoff.
 */
function plantMeadowInfieldGrove(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
) {
  const farms = resolveMeadowFarmPlots(path, clearance, bounds, 4);
  // Keep tree trunks/canopies well clear of each soil pad (canopy radius ~2+)
  const treeClearPad = 7.5;

  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: 220,
    minSep: 5.5,
    clearFoot: 2.4,
    exclude: farms.length
      ? (x, z) => inAnyMeadowFarmPatch(x, z, farms, treeClearPad)
      : undefined,
  });

  if (points.length) {
    const mats = VEG_MATS.sparse;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.2, 5);
    const canopyGeo = new THREE.SphereGeometry(1.5, 6, 6);
    const canopyMat = mats.canopy[0]!;
    const dummy = new THREE.Object3D();

    const n = points.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, mats.trunk, n);
    trunks.count = 0;
    trunks.castShadow = false;
    trunks.userData.sharedVegMat = true;
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, n);
    canopies.count = 0;
    canopies.castShadow = false;
    canopies.userData.sharedVegMat = true;

    for (const { x, z, i } of points) {
      const scale = 0.95 + hash2(i, 7) * 0.85;
      dummy.position.set(x, 0.6 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, hash2(i, 11) * 6, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(trunks.count++, dummy.matrix);

      const cr = scale * (1.2 + hash2(i, 17) * 0.35);
      dummy.position.set(x, 2.1 * scale, z);
      dummy.scale.set(cr, cr * 1.05, cr);
      dummy.updateMatrix();
      canopies.setMatrixAt(canopies.count++, dummy.matrix);
    }

    if (trunks.count) {
      trunks.instanceMatrix.needsUpdate = true;
      trunks.computeBoundingSphere();
      group.add(trunks);
    }
    if (canopies.count) {
      canopies.instanceMatrix.needsUpdate = true;
      canopies.computeBoundingSphere();
      group.add(canopies);
    }
  }

  // Farms after trees so soil/crops/tractors win draw order; always plant all resolved plots
  for (let i = 0; i < farms.length; i++) {
    plantMeadowFarmPlot(group, farms[i]!, clearance, i);
  }
  if (typeof console !== "undefined" && console.info) {
    console.info(`[meadow] planted ${farms.length} farm plot(s)`);
  }
}

/** Grove / props in the circuit infield — clear of asphalt + runoff. */
function plantInfieldGrove(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  clearance: PathClearance,
  bounds: ReturnType<typeof pathBounds>,
  biome: BiomeStyle,
  sceneryScale = 1,
) {
  // City + Summit already plant dedicated infield scenery
  if (biome.props === "city" || biome.props === "mountains" || biome.props === "yard") return;
  if (biome.vegetation === "none") return;

  // Forest Loop — dense simple deciduous grove in the infield
  if (biome.id === "forest") {
    plantForestInfieldGrove(group, path, clearance, bounds, sceneryScale);
    return;
  }

  // Meadow Sweep — dense grove + four farmer's plots (trees cleared from each)
  if (biome.id === "meadow" || biome.vegetation === "sparse") {
    if (sceneryScale < 0.55) return; // menu backdrop: skip heavy meadow park
    plantMeadowInfieldGrove(group, path, clearance, bounds);
    return;
  }

  const isPalm = biome.vegetation === "palms";
  const countScale = Math.max(0.25, Math.min(1, sceneryScale));
  const points = collectSpacedInfieldPoints(path, clearance, bounds, {
    count: Math.round((isPalm ? 56 : 44) * countScale),
    minSep: (isPalm ? 7.8 : 7.5) / Math.sqrt(countScale),
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
  const mats = isPine ? VEG_MATS.pines : isCactus ? VEG_MATS.cactus : VEG_MATS.trees;

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
    const scale = 0.7 + hash2(i, 7) * 0.6;
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
  sceneryScale = 1,
  inCut?: (x: number, z: number) => boolean,
  heightAt?: (t: number) => number,
  skipTireAt?: (t: number) => boolean,
) {
  const scale = Math.max(0.15, Math.min(1, sceneryScale));
  const clearance = makePathClearance(path, roadHalf);
  if (biome.props === "yard") {
    plantYardSite(group, path, roadHalf, clearance, pathBounds(path), scale, inCut, heightAt, skipTireAt);
    return;
  }
  const density =
    biome.props === "city" ? 0 : Math.max(0.2, biome.density * 0.7 * scale);
  const { poses, bounds } = collectPlantPoses(path, roadHalf, density, clearance);
  plantBiomeProps(group, path, biome, clearance, poses, bounds);
  const vegBiome =
    scale < 1 ? { ...biome, density: biome.density * scale } : biome;
  plantVegetation(group, path, roadHalf, vegBiome, clearance);
  plantInfieldGrove(group, path, clearance, bounds, biome, scale);
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

const DRIFT_UNDERPASS_DEPTH = 4.0;
const DRIFT_UNDERPASS_FLAT = 7;
const DRIFT_UNDERPASS_RAMP = 22;
/** Bridge deck sits this far above grade so the overpass reads clearly. */
const DRIFT_BRIDGE_DECK_Y = 0.4;

type DriftGrade = {
  heightAt: (t: number) => number;
  gradeAt: (t: number) => number;
  inCut: (x: number, z: number) => boolean;
  nearBridge: (t: number) => boolean;
  underT: number;
  bridgeT: number;
  crossX: number;
  crossZ: number;
  underHeading: number;
  bridgeHeading: number;
  depth: number;
  bridgeDeckY: number;
  /** Half-length of the upper-deck gap along the path (meters). */
  bridgeGapHalf: number;
  /** Overpass length along the upper path (spans the ditch). */
  deckAlong: number;
  /** Overpass width across the upper path (driving surface + fascia). */
  deckAcross: number;
  /** Ditch half-width from lower centerline to the top of the dirt bank. */
  cutHalf: number;
  /** Half-length of the excavated cut along the underpass (meters). */
  trenchAlong: number;
  /** Outer rim of the cut in world XZ — used to punch the ground hole. */
  holePoly: { x: number; z: number }[];
};

function wrap01(t: number) {
  return ((t % 1) + 1) % 1;
}

function circularDeltaT(a: number, b: number) {
  let d = Math.abs(wrap01(a) - wrap01(b));
  if (d > 0.5) d = 1 - d;
  return d;
}

function xzSegIntersect(
  ax: number, az: number, bx: number, bz: number,
  cx: number, cz: number, dx: number, dz: number,
): { x: number; z: number; t: number; u: number } | null {
  const d1x = bx - ax;
  const d1z = bz - az;
  const d2x = dx - cx;
  const d2z = dz - cz;
  const den = d1x * d2z - d1z * d2x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * d2z - (cz - az) * d2x) / den;
  const u = ((cx - ax) * d1z - (cz - az) * d1x) / den;
  if (t <= 0.002 || t >= 0.998 || u <= 0.002 || u >= 0.998) return null;
  return { x: ax + t * d1x, z: az + t * d1z, t, u };
}

function findPathCrossing(path: THREE.CatmullRomCurve3): { tA: number; tB: number; x: number; z: number } | null {
  const N = 640;
  const samples: { t: number; x: number; z: number }[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p = path.getPointAt(t);
    samples.push({ t, x: p.x, z: p.z });
  }
  const minGap = Math.floor(N * 0.12);
  let best: { tA: number; tB: number; x: number; z: number; score: number } | null = null;
  for (let i = 0; i < N; i++) {
    const a = samples[i]!;
    const b = samples[(i + 1) % N]!;
    for (let j = i + minGap; j < N - minGap; j++) {
      if (Math.min(Math.abs(i - j), N - Math.abs(i - j)) < minGap) continue;
      const c = samples[j]!;
      const d = samples[(j + 1) % N]!;
      const hit = xzSegIntersect(a.x, a.z, b.x, b.z, c.x, c.z, d.x, d.z);
      if (!hit) continue;
      const dt = circularDeltaT(a.t, c.t);
      const score = dt;
      if (!best || score > best.score) {
        best = { tA: a.t, tB: c.t, x: hit.x, z: hit.z, score };
      }
    }
  }
  return best;
}

function makeDriftGrade(path: THREE.CatmullRomCurve3, roadHalf: number): DriftGrade | null {
  const cross = findPathCrossing(path);
  if (!cross) return null;
  const underT = Math.min(cross.tA, cross.tB);
  const bridgeT = Math.max(cross.tA, cross.tB);
  const pathLen = path.getLength();
  const depth = DRIFT_UNDERPASS_DEPTH;
  const halfFlat = DRIFT_UNDERPASS_FLAT;
  const ramp = DRIFT_UNDERPASS_RAMP;
  const bridgeDeckY = DRIFT_BRIDGE_DECK_Y;

  const heightAt = (t: number) => {
    const dBridge = circularDeltaT(t, bridgeT) * pathLen;
    const bridgeRise = halfFlat + 6;
    if (dBridge < bridgeRise) {
      if (dBridge <= halfFlat * 0.65) return bridgeDeckY;
      const u = (dBridge - halfFlat * 0.65) / (bridgeRise - halfFlat * 0.65);
      const s = u * u * (3 - 2 * u);
      return bridgeDeckY * (1 - s);
    }
    const d = circularDeltaT(t, underT) * pathLen;
    if (d <= halfFlat) return -depth;
    if (d >= halfFlat + ramp) return 0;
    const u = (d - halfFlat) / ramp;
    const s = u * u * (3 - 2 * u);
    return -depth * (1 - s);
  };

  const gradeAt = (t: number) => {
    const dt = 0.0025;
    return (heightAt(wrap01(t + dt)) - heightAt(t)) / (pathLen * dt);
  };

  const underTan = path.getTangentAt(underT).normalize();
  const bridgeTan = path.getTangentAt(bridgeT).normalize();
  const crossSin = Math.abs(underTan.x * bridgeTan.z - underTan.z * bridgeTan.x);
  const cutHalf = roadHalf + 3.6;
  const deckAcross = roadHalf * 2 + 2.2;
  const deckAlong = (roadHalf * 2 + 6) / Math.max(0.75, crossSin);
  const bridgeGapHalf = deckAlong * 0.5 + 0.8;
  const trenchAlong = halfFlat + ramp;

  const underAx = underTan.x;
  const underAz = underTan.z;
  const underNx = -underTan.z;
  const underNz = underTan.x;

  // Path-following outer rim of the cut (for ground hole + prop exclusion).
  const holeLeft: { x: number; z: number }[] = [];
  const holeRight: { x: number; z: number }[] = [];
  const holeN = 48;
  const cutSpanT = (trenchAlong + 1.5) / pathLen;
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  for (let i = 0; i <= holeN; i++) {
    const t = wrap01(underT - cutSpanT + (i / holeN) * cutSpanT * 2);
    if (heightAt(t) > -0.04) continue;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan).normalize();
    const nx = -tan.z;
    const nz = tan.x;
    holeLeft.push({ x: p.x + nx * cutHalf, z: p.z + nz * cutHalf });
    holeRight.push({ x: p.x - nx * cutHalf, z: p.z - nz * cutHalf });
  }
  const holePoly: { x: number; z: number }[] = [];
  for (let i = 0; i < holeLeft.length; i++) holePoly.push(holeLeft[i]!);
  for (let i = holeRight.length - 1; i >= 0; i--) holePoly.push(holeRight[i]!);

  const inCut = (x: number, z: number) => {
    const dx = x - cross.x;
    const dz = z - cross.z;
    const along = dx * underAx + dz * underAz;
    const lat = dx * underNx + dz * underNz;
    if (Math.abs(along) < trenchAlong + 3 && Math.abs(lat) < cutHalf + 2.5) return true;
    // Also block anything over the path-following hole (handles curve).
    for (let i = 0; i < holeLeft.length; i++) {
      const L = holeLeft[i]!;
      const R = holeRight[i]!;
      const mx = (L.x + R.x) * 0.5;
      const mz = (L.z + R.z) * 0.5;
      const hx = L.x - R.x;
      const hz = L.z - R.z;
      const halfW = Math.hypot(hx, hz) * 0.5 + 1.2;
      const ddx = x - mx;
      const ddz = z - mz;
      if (ddx * ddx + ddz * ddz < halfW * halfW) return true;
    }
    return false;
  };

  const nearBridge = (t: number) => circularDeltaT(t, bridgeT) * pathLen < bridgeGapHalf + 3;

  return {
    heightAt,
    gradeAt,
    inCut,
    nearBridge,
    underT,
    bridgeT,
    crossX: cross.x,
    crossZ: cross.z,
    underHeading: Math.atan2(underTan.x, underTan.z),
    bridgeHeading: Math.atan2(bridgeTan.x, bridgeTan.z),
    depth,
    bridgeDeckY,
    bridgeGapHalf,
    deckAlong,
    deckAcross,
    cutHalf,
    trenchAlong,
    holePoly,
  };
}

function buildYardGround(
  bounds: ReturnType<typeof pathBounds>,
  color: number,
  grade: DriftGrade | null,
  groundPad: number,
): THREE.Mesh {
  const minX = bounds.minX - groundPad;
  const maxX = bounds.maxX + groundPad;
  const minZ = bounds.minZ - groundPad;
  const maxZ = bounds.maxZ + groundPad;

  if (!grade || grade.holePoly.length < 6) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.spanX + groundPad * 2, bounds.spanZ + groundPad * 2),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(bounds.cx, -0.12, bounds.cz);
    return ground;
  }

  const shape = new THREE.Shape();
  // Shape XY → world XZ via rotateX(-π/2): (sx, sy) → (sx, 0, -sy).
  shape.moveTo(minX, -minZ);
  shape.lineTo(minX, -maxZ);
  shape.lineTo(maxX, -maxZ);
  shape.lineTo(maxX, -minZ);
  shape.closePath();

  const hole = new THREE.Path();
  const poly = grade.holePoly;
  // Reverse so the hole winds opposite the outer path.
  const last = poly[poly.length - 1]!;
  hole.moveTo(last.x, -last.z);
  for (let i = poly.length - 2; i >= 0; i--) {
    const q = poly[i]!;
    hole.lineTo(q.x, -q.z);
  }
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ShapeGeometry(shape, 2);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }),
  );
  ground.position.y = -0.12;
  return ground;
}

function plantDriftUnderpass(
  group: THREE.Group,
  path: THREE.CatmullRomCurve3,
  roadHalf: number,
  grade: DriftGrade,
  asphaltColor: number,
  edgeColor: number,
) {
  const dirt = new THREE.MeshStandardMaterial({
    color: 0x8a6238,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });
  const mud = new THREE.MeshStandardMaterial({
    color: 0x5a4028,
    roughness: 1,
    metalness: 0.02,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xb8b3a6,
    roughness: 0.78,
    metalness: 0.08,
  });
  const soffit = new THREE.MeshStandardMaterial({
    color: 0x6e685c,
    roughness: 0.9,
    metalness: 0.05,
  });
  const rust = new THREE.MeshStandardMaterial({
    color: 0x6a4e32,
    roughness: 0.62,
    metalness: 0.28,
  });
  const asphalt = new THREE.MeshStandardMaterial({
    color: asphaltColor,
    roughness: 0.92,
    metalness: 0.04,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: edgeColor,
    roughness: 0.65,
    metalness: 0.04,
  });

  const underAx = Math.sin(grade.underHeading);
  const underAz = Math.cos(grade.underHeading);
  const underNx = -Math.cos(grade.underHeading);
  const underNz = Math.sin(grade.underHeading);
  const brNx = -Math.cos(grade.bridgeHeading);
  const brNz = Math.sin(grade.bridgeHeading);
  const brAx = Math.sin(grade.bridgeHeading);
  const brAz = Math.cos(grade.bridgeHeading);

  const placeBridge = (mesh: THREE.Mesh, lat: number, y: number, along: number) => {
    mesh.position.set(
      grade.crossX + brNx * lat + brAx * along,
      y,
      grade.crossZ + brNz * lat + brAz * along,
    );
    mesh.rotation.y = grade.bridgeHeading;
    group.add(mesh);
  };

  // ── Path-following cut: sloped banks from road height up to grade ──
  const pathLen = path.getLength();
  const spanT = (grade.trenchAlong + 0.8) / pathLen;
  const samples = 56;
  const innerLat = roadHalf + 0.9;
  const outerLat = grade.cutHalf;
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();

  type Slice = {
    ixL: number; iyL: number; izL: number;
    oxL: number; oyL: number; ozL: number;
    ixR: number; iyR: number; izR: number;
    oxR: number; oyR: number; ozR: number;
    fxL: number; fy: number; fzL: number;
    fxR: number; fzR: number;
  };
  const slices: Slice[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = wrap01(grade.underT - spanT + (i / samples) * spanT * 2);
    const y = grade.heightAt(t);
    if (y > -0.03) continue;
    path.getPointAt(t, p);
    path.getTangentAt(t, tan).normalize();
    const nx = -tan.z;
    const nz = tan.x;
    const lipY = 0.02;
    slices.push({
      ixL: p.x + nx * innerLat, iyL: y - 0.05, izL: p.z + nz * innerLat,
      oxL: p.x + nx * outerLat, oyL: lipY, ozL: p.z + nz * outerLat,
      ixR: p.x - nx * innerLat, iyR: y - 0.05, izR: p.z - nz * innerLat,
      oxR: p.x - nx * outerLat, oyR: lipY, ozR: p.z - nz * outerLat,
      fxL: p.x + nx * (innerLat - 0.15), fy: y - 0.18, fzL: p.z + nz * (innerLat - 0.15),
      fxR: p.x - nx * (innerLat - 0.15), fzR: p.z - nz * (innerLat - 0.15),
    });
  }

  if (slices.length >= 2) {
    const bankPos: number[] = [];
    const bankIdx: number[] = [];
    const floorPos: number[] = [];
    const floorIdx: number[] = [];
    const pushBankQuad = (
      ax: number, ay: number, az: number,
      bx: number, by: number, bz: number,
      cx: number, cy: number, cz: number,
      dx: number, dy: number, dz: number,
    ) => {
      const base = bankPos.length / 3;
      bankPos.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
      bankIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    for (let i = 0; i < slices.length - 1; i++) {
      const a = slices[i]!;
      const b = slices[i + 1]!;
      // Left bank (inner→outer), right bank, and mud floor between inners.
      pushBankQuad(
        a.ixL, a.iyL, a.izL, a.oxL, a.oyL, a.ozL,
        b.oxL, b.oyL, b.ozL, b.ixL, b.iyL, b.izL,
      );
      pushBankQuad(
        a.oxR, a.oyR, a.ozR, a.ixR, a.iyR, a.izR,
        b.ixR, b.iyR, b.izR, b.oxR, b.oyR, b.ozR,
      );
      // Top lip strip so the hole edge meets sand (not a cliff lip).
      pushBankQuad(
        a.oxL, a.oyL, a.ozL,
        a.oxL + (a.oxL - a.ixL) * 0.15, a.oyL + 0.01, a.ozL + (a.ozL - a.izL) * 0.15,
        b.oxL + (b.oxL - b.ixL) * 0.15, b.oyL + 0.01, b.ozL + (b.ozL - b.izL) * 0.15,
        b.oxL, b.oyL, b.ozL,
      );
      pushBankQuad(
        a.oxR, a.oyR, a.ozR,
        b.oxR, b.oyR, b.ozR,
        b.oxR + (b.oxR - b.ixR) * 0.15, b.oyR + 0.01, b.ozR + (b.ozR - b.izR) * 0.15,
        a.oxR + (a.oxR - a.ixR) * 0.15, a.oyR + 0.01, a.ozR + (a.ozR - a.izR) * 0.15,
      );

      const fb = floorPos.length / 3;
      floorPos.push(
        a.fxL, a.fy, a.fzL,
        a.fxR, a.fy, a.fzR,
        b.fxR, b.fy, b.fzR,
        b.fxL, b.fy, b.fzL,
      );
      floorIdx.push(fb, fb + 1, fb + 2, fb, fb + 2, fb + 3);
    }

    const bankGeo = new THREE.BufferGeometry();
    bankGeo.setAttribute("position", new THREE.Float32BufferAttribute(bankPos, 3));
    bankGeo.setIndex(bankIdx);
    bankGeo.computeVertexNormals();
    const banks = new THREE.Mesh(bankGeo, dirt);
    banks.receiveShadow = true;
    banks.castShadow = true;
    group.add(banks);

    const floorGeo = new THREE.BufferGeometry();
    floorGeo.setAttribute("position", new THREE.Float32BufferAttribute(floorPos, 3));
    floorGeo.setIndex(floorIdx);
    floorGeo.computeVertexNormals();
    const floor = new THREE.Mesh(floorGeo, mud);
    floor.receiveShadow = true;
    group.add(floor);
  }

  // ── Bridge deck over the deepest part of the cut ──
  const deckH = 0.5;
  const deckTop = grade.bridgeDeckY;
  const deckBot = deckTop - deckH;

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(grade.deckAcross, deckH, grade.deckAlong),
    concrete,
  );
  placeBridge(deck, 0, (deckTop + deckBot) * 0.5, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;

  const under = new THREE.Mesh(
    new THREE.BoxGeometry(grade.deckAcross - 0.15, 0.08, grade.deckAlong - 0.2),
    soffit,
  );
  placeBridge(under, 0, deckBot - 0.04, 0);
  // Underside is coplanar with the deck in the light view — casting it only
  // adds depth fighting / acne under the overpass, not a useful silhouette.
  under.castShadow = false;

  const roadPad = new THREE.Mesh(
    new THREE.BoxGeometry(roadHalf * 2, 0.1, grade.deckAlong + 0.4),
    asphalt,
  );
  placeBridge(roadPad, 0, deckTop + 0.06, 0);
  roadPad.receiveShadow = true;
  roadPad.layers.enable(HEADLIGHT_LAYER);

  for (const end of [-1, 1] as const) {
    const approach = new THREE.Mesh(
      new THREE.BoxGeometry(roadHalf * 2 + 0.3, 0.1, 3.2),
      asphalt,
    );
    placeBridge(approach, 0, deckTop * 0.5 + 0.03, end * (grade.deckAlong * 0.5 + 1.4));
    approach.receiveShadow = true;
    approach.layers.enable(HEADLIGHT_LAYER);
  }

  for (const side of [-1, 1] as const) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.04, grade.deckAlong + 0.3),
      edge,
    );
    placeBridge(stripe, side * (roadHalf - 0.12), deckTop + 0.12, 0);
    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.75, grade.deckAlong + 0.4),
      rust,
    );
    placeBridge(fascia, side * (grade.deckAcross * 0.5 - 0.12), deckBot - 0.15, 0);
    fascia.castShadow = true;
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.55, grade.deckAlong + 0.15),
      rust,
    );
    placeBridge(rail, side * (roadHalf + 0.35), deckTop + 0.38, 0);
  }

  for (let i = 0; i < 3; i++) {
    const u = (i + 0.5) / 3 - 0.5;
    const girder = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.42, grade.deckAlong - 0.6),
      rust,
    );
    placeBridge(girder, u * (roadHalf * 2 - 1.5), deckBot - 0.28, 0);
    girder.castShadow = true;
  }
  for (let i = 0; i < 4; i++) {
    const u = (i + 0.5) / 4 - 0.5;
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(grade.deckAcross - 0.5, 0.2, 0.28),
      rust,
    );
    placeBridge(brace, 0, deckBot - 0.18, u * (grade.deckAlong - 1.2));
  }

  // Piers beside the underpass road, standing on the cut floor.
  const pierH = grade.depth + deckBot + 0.15;
  const pierY = -grade.depth + pierH * 0.5;
  const pierAlong = Math.max(1.1, grade.deckAcross * 0.18);
  const pierLat = roadHalf + 1.9;
  for (const sAlong of [-1, 1] as const) {
    for (const sLat of [-1, 1] as const) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.1, pierH, 1.2), concrete);
      pier.position.set(
        grade.crossX + underNx * sLat * pierLat + underAx * sAlong * pierAlong,
        pierY,
        grade.crossZ + underNz * sLat * pierLat + underAz * sAlong * pierAlong,
      );
      pier.rotation.y = grade.underHeading;
      pier.castShadow = true;
      pier.receiveShadow = true;
      group.add(pier);
    }
  }
}

function buildRibbon(
  path: THREE.CatmullRomCurve3,
  halfW: number,
  y: number,
  segments: number,
  /** Lateral offset of ribbon center from path (road-half − stripeHalf for edge lines). */
  lateral = 0,
  yAt?: (u: number) => number,
  skip?: (u: number) => boolean,
) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const n = new THREE.Vector3();
  const up = new THREE.Vector3();
  const tan3 = new THREE.Vector3();
  const pathLen = yAt ? path.getLength() : 0;
  const du = 1 / Math.max(1, segments);

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) % 1;
    path.getPointAt(u, p);
    path.getTangentAt(u, tan).normalize();
    n.set(-tan.z, 0, tan.x);
    const nLen = Math.hypot(n.x, n.z) || 1;
    n.x /= nLen;
    n.z /= nLen;
    const yHere = (yAt ? yAt(u) : 0) + y;
    const cx = p.x + n.x * lateral;
    const cz = p.z + n.z * lateral;
    positions.push(
      cx - n.x * halfW, yHere, cz - n.z * halfW,
      cx + n.x * halfW, yHere, cz + n.z * halfW,
    );
    if (yAt) {
      const dy = yAt(wrap01(u + du)) - yAt(u);
      tan3.set(tan.x, dy / (pathLen * du + 1e-6), tan.z).normalize();
      up.copy(n).cross(tan3);
      if (up.y < 0) up.negate();
      const uLen = up.length() || 1;
      up.multiplyScalar(1 / uLen);
      normals.push(up.x, up.y, up.z, up.x, up.y, up.z);
    } else {
      normals.push(0, 1, 0, 0, 1, 0);
    }
  }
  for (let i = 0; i < segments; i++) {
    const u0 = i / segments;
    const u1 = (i + 1) / segments;
    if (skip && (skip(u0) || skip(u1 % 1))) continue;
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

export type CreateTrackOptions = {
  /** Vegetation / grove density multiplier. Use <1 for the home-menu backdrop. */
  sceneryScale?: number;
};

/** Build a full track scene from a named path definition. */
export function createTrack(
  trackId: string = DEFAULT_TRACK_ID,
  opts?: CreateTrackOptions,
): TrackData {
  const def = getTrackDef(trackId);
  const biome = biomeForTrack(def.biome ?? def.id);
  const sceneryScale = opts?.sceneryScale ?? 1;
  const group = new THREE.Group();
  const width = isDriftTrack(def.id) ? 16 : 14;
  const half = width / 2;

  const pts = pointsFromDef(def);
  const path = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
  const bounds = pathBounds(path);
  const grade = isDriftTrack(def.id) ? makeDriftGrade(path, half) : null;
  const yAt = grade ? grade.heightAt : undefined;

  // Biome ground — baseColor preserved so weather tint doesn't flatten the palette.
  // Mountains biome: the horizon rings sit well past the path bounding box — pad
  // the ground out beyond the backdrop ring or there's a see-through void band
  // under the mountains (sky where terrain should be).
  const groundPad =
    biome.props === "mountains"
      ? Math.min(290, Math.max(bounds.spanX, bounds.spanZ) * 0.55 + 180) + 60
      : 0;
  const ground = buildYardGround(bounds, biome.ground, grade, groundPad);
  ground.userData.surface = "grass";
  ground.userData.baseColor = biome.ground;
  ground.receiveShadow = true;
  group.add(ground);

  // Segment density scales with circuit length so long maps stay smooth
  const pathLen = path.getLength();
  const ribbonSegs = Math.max(
    480,
    Math.min(1400, Math.ceil(pathLen / (grade ? 0.95 : 1.35))),
  );
  const skipBridge = grade
    ? (u: number) => circularDeltaT(u, grade.bridgeT) * pathLen < grade.bridgeGapHalf
    : undefined;

  // Shoulder / runoff ribbon
  const runoff = new THREE.Mesh(
    buildRibbon(path, half + RUNOFF_EXTRA, -0.02, ribbonSegs, 0, yAt, skipBridge),
    new THREE.MeshStandardMaterial({
      color: biome.runoff,
      roughness: 1,
      metalness: 0,
    }),
  );
  runoff.userData.surface = "runoff";
  runoff.userData.baseColor = biome.runoff;
  runoff.receiveShadow = true;
  runoff.layers.enable(HEADLIGHT_LAYER);
  group.add(runoff);

  // Asphalt — wet roughness applied later by WeatherController
  const road = new THREE.Mesh(
    buildRibbon(path, half, 0.035, ribbonSegs, 0, yAt, skipBridge),
    new THREE.MeshStandardMaterial({
      color: biome.asphalt,
      roughness: 0.92,
      metalness: 0.04,
    }),
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
      buildRibbon(path, stripeHalf, 0.048, edgeSegs, side * (half - stripeHalf), yAt, skipBridge),
      edgeMat,
    );
    edges.castShadow = false;
    edges.receiveShadow = false;
    edges.layers.enable(HEADLIGHT_LAYER);
    group.add(edges);
  }

  if (grade) plantDriftUnderpass(group, path, half, grade, biome.asphalt, biome.edge);

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
    new THREE.MeshStandardMaterial({
      color: biome.id === "yard" ? 0xf0c020 : 0xff3b2e,
      metalness: 0.25,
      roughness: 0.5,
    }),
  );
  beam.position.set(0, 5.4, 0);
  gantry.add(beam);
  group.add(gantry);

  // Biome vegetation + props — clear of asphalt / runoff / walls
  plantBiomeScenery(
    group,
    path,
    half,
    biome,
    sceneryScale,
    grade?.inCut,
    grade?.heightAt,
    grade ? (t) => grade.nearBridge(t) : undefined,
  );

  // Static scenery — skip per-frame matrix walks (vehicles stay auto-updating).
  group.updateMatrixWorld(true);
  group.traverse((obj) => {
    obj.matrixAutoUpdate = false;
  });

  const heading = yawFromTangent(startTan);

  return {
    id: def.id,
    name: def.name,
    group,
    path,
    startPosition: startP.clone().addScaledVector(startN, -2.8),
    startHeading: heading,
    width,
    heightAt: grade?.heightAt,
    gradeAt: grade?.gradeAt,
  };
}

/** Remove a track group from the scene and free GPU resources (not shared tree mats). */
export function disposeTrack(track: TrackData) {
  track.group.removeFromParent();
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  track.group.traverse((obj) => {
    if (obj instanceof THREE.Light) {
      obj.dispose();
      return;
    }
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
    const dx = _projScratch.x - position.x;
    const dz = _projScratch.z - position.z;
    const d = dx * dx + dz * dz;
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
    const dx = _projScratch.x - position.x;
    const dz = _projScratch.z - position.z;
    const d = dx * dx + dz * dz;
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
    const dx = _projScratch.x - position.x;
    const dz = _projScratch.z - position.z;
    const d = dx * dx + dz * dz;
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
  ): void {
    const i0 = this.indexAtT(t);
    // Walk forward along cum (with wrap)
    let i = i0;
    const n = this.count;
    let guard = 0;
    let remain = distMeters;
    while (remain > 0 && guard++ < n + 2) {
      const iNext = (i + 1) % n;
      const seg =
        iNext === 0
          ? this.length - this.cum[i]!
          : this.cum[iNext]! - this.cum[i]!;
      if (seg <= 1e-6) {
        i = iNext;
        continue;
      }
      if (remain <= seg) {
        const u = remain / seg;
        outPoint.lerpVectors(this.points[i]!, this.points[iNext]!, u);
        outTan
          .copy(this.tangents[iNext]!)
          .multiplyScalar(u)
          .addScaledVector(this.tangents[i]!, 1 - u);
        const tl = Math.hypot(outTan.x, outTan.z) || 1;
        outTan.set(outTan.x / tl, 0, outTan.z / tl);
        return;
      }
      remain -= seg;
      i = iNext;
    }
    outPoint.copy(this.points[i]!);
    outTan.copy(this.tangents[i]!);
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
    // Reused result — callers must read fields before the next curvatureAhead call.
    _curveAheadOut.maxKappa = maxKappa;
    _curveAheadOut.nearKappa = Math.max(nearKappa, bulk * 0.85);
    _curveAheadOut.turnAngle = turnAngle;
    return _curveAheadOut;
  }
}

const _curveAheadOut = { maxKappa: 0, nearKappa: 0, turnAngle: 0 };

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
