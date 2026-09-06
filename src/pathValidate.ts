/**
 * Closed-loop path quality checks — centerline samples must not cross and must
 * keep enough clearance that a battle-scaled ribbon (~20m) never self-overlaps.
 *
 * Corner radii stay ≳13.5m so a 14m road can take the bend without folding.
 */
import * as THREE from "three";

export const MIN_PATH_CLEARANCE_M = 30;
export const MIN_CORNER_RADIUS_M = 13.5;
/** Battle Event Mode width (14 × 1.45) — clearance must exceed this. */
export const BATTLE_ROAD_WIDTH_M = 14 * 1.45;

type Pt = { x: number; z: number };

function segCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const cross = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

export type PathQuality = {
  lengthM: number;
  crossings: number;
  minClearanceM: number;
  minCornerRadiusM: number;
  ok: boolean;
};

/** Sample a closed Catmull-Rom and measure crossings / clearance / corner radius. */
export function analyzeClosedPath(
  points: readonly (readonly [number, number])[],
  opts?: { samples?: number; minClearance?: number; minRadius?: number },
): PathQuality {
  const samplesN = opts?.samples ?? 480;
  const minClear = opts?.minClearance ?? MIN_PATH_CLEARANCE_M;
  const minRadius = opts?.minRadius ?? MIN_CORNER_RADIUS_M;
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    "catmullrom",
    0.5,
  );
  const samples: Pt[] = [];
  for (let i = 0; i < samplesN; i++) {
    const p = curve.getPointAt(i / samplesN);
    samples.push({ x: p.x, z: p.z });
  }

  let crossings = 0;
  for (let i = 0; i < samplesN; i++) {
    const a = samples[i]!;
    const b = samples[(i + 1) % samplesN]!;
    for (let j = i + 2; j < samplesN; j++) {
      if ((j + 1) % samplesN === i) continue;
      const circ = Math.min(Math.abs(i - j), samplesN - Math.abs(i - j));
      if (circ <= 1) continue;
      if (segCross(a, b, samples[j]!, samples[(j + 1) % samplesN]!)) crossings++;
    }
  }

  let minD = Infinity;
  const gap = Math.floor(samplesN * 0.1);
  for (let i = 0; i < samplesN; i++) {
    for (let j = i + gap; j < samplesN - gap; j++) {
      const dx = samples[i]!.x - samples[j]!.x;
      const dz = samples[i]!.z - samples[j]!.z;
      const d = Math.hypot(dx, dz);
      if (d < minD) minD = d;
    }
  }

  let minR = Infinity;
  for (let i = 0; i < samplesN; i++) {
    const p0 = samples[(i - 1 + samplesN) % samplesN]!;
    const p1 = samples[i]!;
    const p2 = samples[(i + 1) % samplesN]!;
    const ax = p1.x - p0.x;
    const az = p1.z - p0.z;
    const bx = p2.x - p1.x;
    const bz = p2.z - p1.z;
    const la = Math.hypot(ax, az) || 1;
    const lb = Math.hypot(bx, bz) || 1;
    let dot = (ax * bx + az * bz) / (la * lb);
    dot = Math.max(-1, Math.min(1, dot));
    const ang = Math.acos(dot);
    const kappa = ang / ((la + lb) * 0.5);
    if (kappa > 1e-4) minR = Math.min(minR, 1 / kappa);
  }

  return {
    lengthM: curve.getLength(),
    crossings,
    minClearanceM: minD,
    minCornerRadiusM: minR,
    ok: crossings === 0 && minD >= minClear && minR >= minRadius,
  };
}

/**
 * Build a simple closed polar loop (Jordan curve) — guaranteed non-self-intersecting
 * when r(θ) > 0 and varies smoothly. Scale sx/sz for silhouette variety.
 * Start angle −π/2 puts SF near the top of the silhouette map.
 */
export function buildPolarLoop(
  count: number,
  radiusAt: (t01: number) => number,
  sx = 1,
  sz = 1,
  startAngle = -Math.PI / 2,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const a = startAngle + t * Math.PI * 2;
    const r = radiusAt(t);
    out.push([
      Math.round(Math.cos(a) * r * sx * 100) / 100,
      Math.round(Math.sin(a) * r * sz * 100) / 100,
    ]);
  }
  return out;
}

/**
 * Superellipse / rounded-rectangle polar radius — long straights + generous corners
 * without chord crossings (power ≳4 keeps corner radii battle-safe).
 */
export function buildRoundedRectLoop(
  count: number,
  halfLength: number,
  halfWidth: number,
  power = 4.5,
): [number, number][] {
  return buildPolarLoop(count, (t) => {
    const a = -Math.PI / 2 + t * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const term =
      Math.pow(Math.abs(c) / halfLength, power) + Math.pow(Math.abs(s) / halfWidth, power);
    return Math.pow(term, -1 / power);
  });
}
