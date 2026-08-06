import * as THREE from "three";
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

function yawFromTangent(tangent: THREE.Vector3) {
  return Math.atan2(tangent.x, tangent.z);
}

/** Deterministic 0..1 hash from integer coords (stable tree scatter). */
function hash2(ix: number, iz: number) {
  let n = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Shared materials — same look as per-tree meshes, one draw call per chunk. */
const TREE_TRUNK = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
const TREE_CANOPY = [
  new THREE.MeshStandardMaterial({ color: 0x2a8a32, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x247a2c, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0x33963a, roughness: 0.88 }),
];

type TreePose = { x: number; z: number; scale: number; jitter: number };

/** Soft cap so large multi-map circuits don't plant 6k–10k trees per swap. */
const MAX_TREES = 2400;

/**
 * Dense forest on the grass: keep clear of asphalt + runoff (half+4.8) plus a
 * small canopy margin so trunks never sit on the driving surface.
 * InstancedMesh + spatial chunks; density tuned for multi-map FPS.
 */
function plantForest(group: THREE.Group, path: THREE.CatmullRomCurve3, roadHalf: number) {
  const clear = roadHalf + 4.8 + 2.2; // ~14m outside centerline for 14m road
  const clear2 = clear * clear;
  const bounds = pathBounds(path);
  const samples: THREE.Vector3[] = [];
  const sampleN = 480;
  for (let i = 0; i < sampleN; i++) samples.push(path.getPointAt(i / sampleN));

  // Coarse grid of nearby centerline samples — O(1) reject far from road
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

  const minDist2ToPath = (x: number, z: number) => {
    const bx = Math.floor(x / BIN);
    const bz = Math.floor(z / BIN);
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = bins.get(`${bx + dx},${bz + dz}`);
        if (!list) continue;
        for (const i of list) {
          const p = samples[i]!;
          const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
          if (d < best) best = d;
        }
      }
    }
    // Far from all bins → treat as clear of road
    return best;
  };

  const poses: TreePose[] = [];
  const tryPlant = (x: number, z: number, scale: number) => {
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return;
    if (minDist2ToPath(x, z) < clear2) return;
    poses.push({
      x,
      z,
      scale,
      jitter: hash2(Math.round(x * 10), Math.round(z * 10)),
    });
  };

  // 1) Rings along the circuit — dense belts, fewer layers than the old 19×280
  const ringOffsets = [-18, -26, -36, -48, -64, -84, -110, 18, 28, 40, 55];
  const ringSteps = 160;
  const ringTan = new THREE.Vector3();
  const ringN = new THREE.Vector3();
  for (const offset of ringOffsets) {
    for (let i = 0; i < ringSteps; i++) {
      const t = i / ringSteps;
      const p = path.getPointAt(t);
      ringTan.copy(path.getTangentAt(t)).normalize();
      ringN.set(-ringTan.z, 0, ringTan.x);
      const h = hash2(i, Math.round(offset * 10));
      if (h < 0.28) continue;
      const lat = offset + (h - 0.5) * 3.6;
      const along = (hash2(Math.round(offset * 7), i) - 0.5) * 2.8;
      const x = p.x + ringN.x * lat + ringTan.x * along;
      const z = p.z + ringN.z * lat + ringTan.z * along;
      tryPlant(x, z, 0.65 + h * 0.7);
    }
  }

  // 2) Jittered fill — coarser grid keeps look dense without 6k+ instances
  const step = 7.8;
  for (let ix = bounds.minX; ix <= bounds.maxX; ix += step) {
    for (let iz = bounds.minZ; iz <= bounds.maxZ; iz += step) {
      const h = hash2(Math.round(ix * 3), Math.round(iz * 3));
      if (h < 0.22) continue;
      const x = ix + (h - 0.5) * 5.2;
      const z = iz + (hash2(Math.round(iz * 5), Math.round(ix * 5)) - 0.5) * 5.2;
      tryPlant(x, z, 0.55 + h * 0.85);
    }
  }

  // Cap oversized plantings (big meadow / canyon AABB) without changing density feel
  if (poses.length > MAX_TREES) {
    const keep: TreePose[] = [];
    for (let i = 0; i < poses.length; i++) {
      const h = hash2(i * 17, Math.round(poses[i]!.x * 3));
      if (h < MAX_TREES / poses.length) keep.push(poses[i]!);
    }
    // Ensure we don't undershoot too far if hash is unlucky
    if (keep.length < MAX_TREES * 0.85) {
      for (let i = 0; i < poses.length && keep.length < MAX_TREES; i++) {
        if (hash2(i * 31, Math.round(poses[i]!.z * 5)) > 0.55) keep.push(poses[i]!);
      }
    }
    poses.length = 0;
    poses.push(...keep.slice(0, MAX_TREES));
  }

  // Spatial chunks so frustum culling can drop off-screen forest
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

  // Unit geos — slightly lower canopy tessellation (look identical at distance)
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.2, 5);
  const canopyGeo = new THREE.SphereGeometry(1.35, 6, 6);
  const dummy = new THREE.Object3D();

  for (const list of buckets.values()) {
    const n = list.length;
    if (n === 0) continue;

    const trunks = new THREE.InstancedMesh(trunkGeo, TREE_TRUNK, n);
    trunks.castShadow = false;
    trunks.receiveShadow = false;
    trunks.frustumCulled = true;

    const canopyCounts = [0, 0, 0];
    for (const pose of list) {
      canopyCounts[Math.floor(pose.jitter * TREE_CANOPY.length) % TREE_CANOPY.length] += 1;
    }
    const canopies = TREE_CANOPY.map((mat, ci) => {
      const mesh = new THREE.InstancedMesh(canopyGeo, mat, Math.max(1, canopyCounts[ci]));
      // Shadows on thousands of canopies dominate GPU cost — skip for FPS
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
      mesh.count = 0;
      return mesh;
    });

    for (let i = 0; i < n; i++) {
      const { x, z, scale, jitter } = list[i]!;
      dummy.position.set(x, 0.6 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      const ci = Math.floor(jitter * TREE_CANOPY.length) % TREE_CANOPY.length;
      const canopy = canopies[ci]!;
      const cr = (1.35 * scale + jitter * 0.35) / 1.35;
      dummy.position.set(x, 2.0 * scale, z);
      dummy.scale.set(cr, cr, cr);
      dummy.updateMatrix();
      canopy.setMatrixAt(canopy.count++, dummy.matrix);
    }

    trunks.instanceMatrix.needsUpdate = true;
    group.add(trunks);
    for (const canopy of canopies) {
      if (canopy.count === 0) continue;
      canopy.instanceMatrix.needsUpdate = true;
      canopy.computeBoundingSphere();
      group.add(canopy);
    }
    trunks.computeBoundingSphere();
  }

  return poses.length;
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
  const group = new THREE.Group();
  const width = 14;
  const half = width / 2;

  const pts = pointsFromDef(def);
  const path = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
  const bounds = pathBounds(path);

  // Bright map-style grass sized to this circuit
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.spanX, bounds.spanZ),
    new THREE.MeshStandardMaterial({ color: 0x4aa83a, roughness: 1 }),
  );
  ground.userData.surface = "grass";
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(bounds.cx, -0.12, bounds.cz);
  ground.receiveShadow = true;
  group.add(ground);

  // Segment density scales with circuit length so long maps stay smooth
  const pathLen = path.getLength();
  const ribbonSegs = Math.max(480, Math.min(1400, Math.ceil(pathLen / 1.35)));

  // Tan sand / gravel runoff
  const runoff = new THREE.Mesh(
    buildRibbon(path, half + 4.8, -0.02, ribbonSegs),
    new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 1, metalness: 0 }),
  );
  runoff.userData.surface = "runoff";
  runoff.receiveShadow = true;
  group.add(runoff);

  // Clear grey asphalt
  const road = new THREE.Mesh(
    buildRibbon(path, half, 0.035, ribbonSegs),
    new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.92, metalness: 0.04 }),
  );
  road.userData.surface = "asphalt";
  road.receiveShadow = true;
  group.add(road);

  // Continuous white edge stripes — thin ribbons flush with asphalt (no box gaps)
  const stripeHalf = 0.11; // ~22cm painted line
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8,
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

  // Dense forest on the grass — clear of asphalt / runoff / walls
  plantForest(group, path, half);

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
      if (mat === TREE_TRUNK || TREE_CANOPY.includes(mat as THREE.MeshStandardMaterial)) continue;
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
