/**
 * Sample each closed CatmullRom track and report:
 * - self-intersections (non-adjacent segment crossings)
 * - min clearance between non-adjacent centerline samples
 * - SF join tangent mismatch
 * - local kink / curvature spikes
 *
 * Usage: node --experimental-strip-types scripts/verify-tracks.mts
 */
import * as THREE from "three";
import { TRACKS } from "../src/trackDefs.ts";

const SAMPLES = 720;
const ROAD_WIDTH = 14;
const MIN_CLEARANCE = 30; // centerlines: keep ≳30m between non-adjacent parts (road 14m)
const MIN_RADIUS = 13.5; // corner radii ≳13.5 so a 14m road never folds onto itself
const ADJACENT_SKIP = Math.floor(SAMPLES * 0.08); // ignore nearby samples along path (~8% of loop)
const JOIN_TANGENT_MAX_DEG = 12;
const KINK_TURN_DEG = 28; // sharp local heading change over a short window
const UNDERPASS_MIN_RADIUS = 8;

type Pt = { x: number; z: number };

function segIntersect(
  a: Pt,
  b: Pt,
  c: Pt,
  d: Pt,
): { x: number; z: number } | null {
  const den = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z) };
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function heading(a: Pt, b: Pt) {
  return Math.atan2(b.x - a.x, b.z - a.z);
}

function angDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function analyze(id: string, points: readonly (readonly [number, number])[]) {
  const vecs = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const path = new THREE.CatmullRomCurve3(vecs, true, "catmullrom", 0.5);
  const len = path.getLength();
  const samples: Pt[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const p = path.getPointAt(i / SAMPLES);
    samples.push({ x: p.x, z: p.z });
  }

  // Self-intersections of polyline segments (skip adjacent + wrap neighbors)
  const crosses: { i: number; j: number; x: number; z: number }[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const a = samples[i]!;
    const b = samples[(i + 1) % SAMPLES]!;
    for (let j = i + 2; j < SAMPLES; j++) {
      // skip wrap-adjacent pair (last seg vs first)
      if (i === 0 && j === SAMPLES - 1) continue;
      const circGap = Math.min(j - i, SAMPLES - (j - i));
      if (circGap <= 1) continue;
      const c = samples[j]!;
      const d = samples[(j + 1) % SAMPLES]!;
      const hit = segIntersect(a, b, c, d);
      if (hit) crosses.push({ i, j, ...hit });
    }
  }

  // Min clearance between non-adjacent samples
  let minClear = Infinity;
  let clearAt: { i: number; j: number } | null = null;
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = i + ADJACENT_SKIP; j < SAMPLES - (i === 0 ? ADJACENT_SKIP : 0); j++) {
      const circGap = Math.min(j - i, SAMPLES - (j - i));
      if (circGap < ADJACENT_SKIP) continue;
      const d = dist(samples[i]!, samples[j]!);
      if (d < minClear) {
        minClear = d;
        clearAt = { i, j };
      }
    }
  }

  // SF join: tangent at t≈0 vs t≈1
  const t0 = path.getTangentAt(0).normalize();
  const t1 = path.getTangentAt(1 - 1e-6).normalize();
  const joinDeg =
    (Math.acos(Math.max(-1, Math.min(1, t0.dot(t1)))) * 180) / Math.PI;

  // Local kinks: heading change over a short arc
  const win = 4;
  const kinks: { i: number; deg: number }[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const h0 = heading(samples[i]!, samples[(i + 1) % SAMPLES]!);
    const h1 = heading(samples[(i + win) % SAMPLES]!, samples[(i + win + 1) % SAMPLES]!);
    const deg = (Math.abs(angDiff(h0, h1)) * 180) / Math.PI;
    if (deg >= KINK_TURN_DEG) kinks.push({ i, deg });
  }
  kinks.sort((a, b) => b.deg - a.deg);

  // Min local radius of curvature
  let minR = Infinity;
  let minRAt: { i: number; x: number; z: number } | null = null;
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    const ta = path.getTangentAt(t).normalize();
    const tb = path.getTangentAt(((i + 1) % SAMPLES) / SAMPLES).normalize();
    const ds = dist(samples[i]!, samples[(i + 1) % SAMPLES]!);
    const dAng = Math.acos(Math.max(-1, Math.min(1, ta.dot(tb))));
    if (ds > 1e-6) {
      const R = 1 / (dAng / ds);
      if (R < minR) {
        minR = R;
        minRAt = { i, x: samples[i]!.x, z: samples[i]!.z };
      }
    }
  }

  // Control-point spacing (very tight clusters can cause wiggles)
  const cpGaps: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    cpGaps.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
  }

  return {
    id,
    nCtrl: points.length,
    length: len,
    crosses: crosses.length,
    crossSample: crosses.slice(0, 5),
    minClear,
    clearAt,
    minR,
    minRAt,
    joinDeg,
    kinkCount: kinks.length,
    topKinks: kinks.slice(0, 5),
    minCpGap: Math.min(...cpGaps),
    maxCpGap: Math.max(...cpGaps),
    ok:
      crosses.length === 0 &&
      minClear >= MIN_CLEARANCE &&
      minR >= MIN_RADIUS &&
      joinDeg <= JOIN_TANGENT_MAX_DEG,
  };
}

function analyzeUnderpass(id: string, points: readonly (readonly [number, number])[]) {
  const base = analyze(id, points);
  const ok =
    base.crosses >= 1 &&
    base.minR >= UNDERPASS_MIN_RADIUS &&
    base.joinDeg <= JOIN_TANGENT_MAX_DEG;
  return { ...base, ok };
}

const ROAD_NOTE = `road=${ROAD_WIDTH}m, minClear≥${MIN_CLEARANCE}m, minR≥${MIN_RADIUS}m, join≤${JOIN_TANGENT_MAX_DEG}°, kink≥${KINK_TURN_DEG}°`;
console.log(`verify-tracks (${SAMPLES} samples, ${ROAD_NOTE})\n`);

let fail = 0;
for (const t of TRACKS) {
  const r = t.underpass ? analyzeUnderpass(t.id, t.points) : analyze(t.id, t.points);
  const status = r.ok ? "PASS" : "FAIL";
  if (!r.ok) fail++;
  console.log(
    `${status}  ${r.id}${t.underpass ? " [underpass]" : ""}  len=${r.length.toFixed(0)}m  ctrl=${r.nCtrl}  ` +
      `crosses=${r.crosses}  minClear=${r.minClear.toFixed(1)}m  ` +
      `minR=${r.minR.toFixed(1)}m  join=${r.joinDeg.toFixed(1)}°  kinks=${r.kinkCount}  ` +
      `cpGap=${r.minCpGap.toFixed(1)}–${r.maxCpGap.toFixed(1)}`,
  );
  if (r.crossSample.length) {
    for (const c of r.crossSample) {
      console.log(`       cross @ (${c.x.toFixed(1)}, ${c.z.toFixed(1)}) segs ${c.i}/${c.j}`);
    }
  }
  if (r.minClear < MIN_CLEARANCE && r.clearAt) {
    console.log(
      `       near-overlap samples ${r.clearAt.i}/${r.clearAt.j} d=${r.minClear.toFixed(1)}m`,
    );
  }
  if (r.minR < MIN_RADIUS && r.minRAt) {
    console.log(
      `       tight radius ${r.minR.toFixed(1)}m @ (${r.minRAt.x.toFixed(0)}, ${r.minRAt.z.toFixed(0)})`,
    );
  }
  if (r.topKinks.length) {
    console.log(
      `       top kinks: ${r.topKinks.map((k) => `i=${k.i}@${k.deg.toFixed(0)}°`).join(", ")}`,
    );
  }
}

console.log(`\n${fail === 0 ? "ALL OK" : `${fail} track(s) need fixes`}`);
process.exit(fail === 0 ? 0 : 1);
