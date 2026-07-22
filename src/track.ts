import * as THREE from "three";

export type TrackData = {
  group: THREE.Group;
  path: THREE.CatmullRomCurve3;
  startPosition: THREE.Vector3;
  startHeading: number;
  width: number;
};

function yawFromTangent(tangent: THREE.Vector3) {
  return Math.atan2(tangent.x, tangent.z);
}

/**
 * Hand-designed closed circuit (~200x130 footprint), raced counter-clockwise
 * on the map (+X right, +Z up). Flow, starting at SF on the bottom straight:
 *  - long main straight heading +X (SF line + gantry)
 *  - T1: fast sweeping 90° left up the right side
 *  - flat-out run north into heavy braking
 *  - T2: 180° hairpin at top-right
 *  - short drop, then a flowing 90° right into the infield
 *  - climbing 90° right-hander that opens onto the top
 *  - long fast left sweeper arcing over the top and down the far side
 *  - right-left chicane on the left descent
 *  - wide final left onto the main straight
 * Corners are built from tangent-continuous arcs sampled every ~8-16 units,
 * so the CatmullRom loop stays smooth: min corner radius ≈ 13.5, min
 * self-clearance ≈ 37 — the 14-wide road (and its runoff) never overlaps.
 */
function buildCircuitPoints(): THREE.Vector3[] {
  const raw: [number, number][] = [
    // main straight (heading +X), SF line at the first point
    [-10, -58], [10, -58], [30, -58], [46, -58],
    // T1: sweeping left, r=30
    [58, -58], [67.3, -56.5], [75.6, -52.3], [82.3, -45.6], [86.5, -37.3], [88, -28],
    // run north
    [88, -8], [88, 10],
    // T2: hairpin, r=20 around (68, 26)
    [88, 26], [86.5, 33.7], [82.1, 40.1], [75.7, 44.5], [68, 46],
    [60.3, 44.5], [53.9, 40.1], [49.5, 33.7], [48, 26],
    // short drop, then 90° right into the infield, r=20
    [48, 18], [48, 10], [47, 3.8], [44.2, -1.8], [39.8, -6.2], [34.2, -9], [28, -10],
    // infield run west
    [16, -10], [8, -10],
    // climbing 90° right, r=22
    [1.2, -8.9], [-4.9, -5.8], [-9.8, -0.9], [-12.9, 5.2], [-14, 12],
    // long left sweeper over the top, r=42 around (-56, 12)
    [-15.8, 24.3], [-21.2, 35.5], [-29.6, 44.6], [-40.3, 50.9], [-52.3, 53.8],
    [-64.7, 53.1], [-76.4, 48.7], [-86.2, 41.2], [-93.4, 31.1], [-97.4, 19.3],
    // right-left chicane on the descent
    [-98, 7], [-94, -3], [-92, -13], [-93.5, -23],
    // wide final left onto the main straight, r=24
    [-94, -34], [-92.2, -43.2], [-87, -51], [-79.2, -56.2], [-70, -58],
    [-56, -58], [-44, -58], [-32, -58],
  ];
  // Stretch to the full ~200x130 world footprint
  return raw.map(([x, z]) => new THREE.Vector3(x * 1.07, 0, z * 1.15));
}

function buildRibbon(
  path: THREE.CatmullRomCurve3,
  halfW: number,
  y: number,
  segments: number,
) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) % 1;
    const p = path.getPointAt(u);
    const tan = path.getTangentAt(u).normalize();
    const n = new THREE.Vector3(-tan.z, 0, tan.x);
    const L = p.clone().addScaledVector(n, -halfW);
    const R = p.clone().addScaledVector(n, halfW);
    positions.push(L.x, y, L.z, R.x, y, R.z);
    normals.push(0, 1, 0, 0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

function addTree(group: THREE.Group, x: number, z: number, scale = 1) {
  const treeGreen = new THREE.MeshStandardMaterial({ color: 0x2a8a32, roughness: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 1.2 * scale, 6), trunkMat);
  trunk.position.y = 0.6 * scale;
  tree.add(trunk);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.35 * scale + Math.random() * 0.35, 8, 8),
    treeGreen,
  );
  canopy.position.y = 2.0 * scale;
  canopy.castShadow = true;
  tree.add(canopy);
  tree.position.set(x, 0, z);
  group.add(tree);
}

function addBuilding(
  group: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  rot: number,
  roofColor = 0x8a9098,
) {
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.82 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
  const b = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  b.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 0.22, d * 1.08), roofMat);
  roof.position.y = h + 0.1;
  b.add(roof);
  b.position.set(x, 0, z);
  b.rotation.y = rot;
  group.add(b);
}

export function createTrack(): TrackData {
  const group = new THREE.Group();
  const width = 14;
  const half = width / 2;

  const pts = buildCircuitPoints();
  const path = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);

  // Bright map-style grass
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshStandardMaterial({ color: 0x4aa83a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  group.add(ground);

  // Tan sand / gravel runoff
  const runoff = new THREE.Mesh(
    buildRibbon(path, half + 4.8, -0.02, 560),
    new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 1, metalness: 0 }),
  );
  runoff.receiveShadow = true;
  group.add(runoff);

  // Medium-gray asphalt
  const road = new THREE.Mesh(
    buildRibbon(path, half, 0.035, 560),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.92, metalness: 0.04 }),
  );
  road.receiveShadow = true;
  group.add(road);

  // Thin white edge lines
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.7, metalness: 0.05 });
  for (const side of [-1, 1] as const) {
    const samples = 420;
    for (let i = 0; i < samples; i++) {
      const u0 = i / samples;
      const u1 = (i + 1) / samples;
      const p0 = path.getPointAt(u0);
      const p1 = path.getPointAt(u1);
      const tan = path.getTangentAt(u0).normalize();
      const n = new THREE.Vector3(-tan.z, 0, tan.x);
      const mid = p0.clone().lerp(p1, 0.5).addScaledVector(n, side * (half - 0.18));
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, p0.distanceTo(p1) * 1.08), edgeMat);
      seg.position.set(mid.x, 0.055, mid.z);
      seg.rotation.y = yawFromTangent(tan);
      group.add(seg);
    }
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

  // Pond in the upper infield, framed by the climbing sweep and the hairpin
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3a9fd8,
    metalness: 0.3,
    roughness: 0.25,
    transparent: true,
    opacity: 0.92,
  });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 7), waterMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(12, 0.02, 28);
  pond.scale.set(9, 7, 1);
  group.add(pond);

  // Trees — around pond, infield clusters, outer perimeter
  const treeSpots: [number, number, number?][] = [
    // around pond
    [4, 34], [22, 22], [20, 36], [2, 20],
    // lower infield (between infield leg and main straight)
    [10, -35, 0.85], [30, -30, 0.8], [-15, -30, 0.9], [40, -42, 0.75],
    // upper infield
    [5, 48, 0.85], [8, 10, 0.75],
    // perimeter
    [-122, -52], [-126, 55], [-92, 88], [-42, 94], [20, 94],
    [72, 88], [116, 58], [122, -12], [112, -52], [62, -92],
    [2, -94], [-48, -92], [-96, -80],
  ];
  for (const [x, z, s] of treeSpots) {
    addTree(group, x + (Math.random() - 0.5) * 4, z + (Math.random() - 0.5) * 4, s ?? 1);
    if (Math.random() > 0.45) {
      addTree(group, x + (Math.random() - 0.5) * 8, z + (Math.random() - 0.5) * 8, 0.7 + Math.random() * 0.4);
    }
  }

  // Pit building south of SF straight + small buildings outside the loop
  addBuilding(group, 8, -84, 22, 5.5, 2.4, 0, 0x6a7078); // long pit / garage
  addBuilding(group, -62, -86, 6, 4, 2.0, 0.15);
  addBuilding(group, 72, -84, 5, 4, 1.8, -0.2);
  addBuilding(group, 116, 22, 5.5, 4, 2.0, 0.6);
  addBuilding(group, -124, 12, 5, 4, 1.9, -0.5);
  addBuilding(group, -18, 92, 4.5, 3.5, 1.7, 0.3);

  // Small parked cars near the pit and right-side buildings
  const parkColors = [0xe23b2e, 0xf0c020, 0x2a66f0, 0xe8ecf0, 0x888888];
  for (const [x, z, rot, ci] of [
    [112, 34, 0.4, 0],
    [118, 38, 0.5, 1],
    [114, 44, 0.3, 3],
    [-8, -90, 0.1, 0],
    [0, -91, -0.2, 1],
    [26, -90, 0.15, 2],
  ] as const) {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.55, 3.2),
      new THREE.MeshStandardMaterial({ color: parkColors[ci], metalness: 0.4, roughness: 0.5 }),
    );
    car.position.set(x, 0.35, z);
    car.rotation.y = rot;
    car.castShadow = true;
    group.add(car);
  }

  const heading = yawFromTangent(startTan);

  return {
    group,
    path,
    startPosition: startP.clone().addScaledVector(startN, -2.8),
    startHeading: heading,
    width,
  };
}

export type TrackProjection = {
  t: number;
  point: THREE.Vector3;
  distanceFromCenter: number;
  tangent: THREE.Vector3;
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
  bestPoint: THREE.Vector3,
  refineStep: number,
): TrackProjection {
  for (let k = -6; k <= 6; k++) {
    const t = (bestT + k * refineStep * 0.2 + 1) % 1;
    const p = path.getPointAt(t);
    const d = p.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      bestPoint.copy(p);
    }
  }

  const tangent = path.getTangentAt(bestT).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
  const distanceFromCenter = position.clone().sub(bestPoint).dot(normal);
  return { t: bestT, point: bestPoint, distanceFromCenter, tangent };
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
  const bestPoint = new THREE.Vector3();

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const p = path.getPointAt(t);
    const d = p.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      bestPoint.copy(p);
    }
  }

  return finishProjection(path, position, bestT, bestDist, bestPoint, 1 / samples);
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
  const bestPoint = new THREE.Vector3();
  const step = (2 * window) / samples;

  for (let i = 0; i <= samples; i++) {
    const t = (tHint - window + i * step + 1) % 1;
    const p = path.getPointAt(t);
    const d = p.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      bestPoint.copy(p);
    }
  }

  return finishProjection(path, position, bestT, bestDist, bestPoint, step);
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
