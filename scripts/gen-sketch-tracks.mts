/**
 * Generate sketch-based control points and validate.
 * Usage: node --experimental-strip-types scripts/gen-sketch-tracks.mts [--dump]
 */
import * as THREE from "three";

const SAMPLES = 720;
const MIN_CLEARANCE = 30;
const MIN_RADIUS = 13.5;
const ADJACENT_SKIP = Math.floor(SAMPLES * 0.08);

type Pt = [number, number];

function segIntersect(
  a: { x: number; z: number },
  b: { x: number; z: number },
  c: { x: number; z: number },
  d: { x: number; z: number },
): boolean {
  const den = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
  if (Math.abs(den) < 1e-12) return false;
  const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function clusterCrossings(path: THREE.CatmullRomCurve3) {
  const N = 520;
  const samp: { t: number; x: number; z: number }[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p = path.getPointAt(t);
    samp.push({ t, x: p.x, z: p.z });
  }
  const minGap = Math.floor(N * 0.1);
  const raw: { x: number; z: number; tA: number; tB: number }[] = [];
  for (let i = 0; i < N; i++) {
    const a = samp[i]!;
    const b = samp[(i + 1) % N]!;
    for (let j = i + minGap; j < N - minGap; j++) {
      if (Math.min(Math.abs(i - j), N - Math.abs(i - j)) < minGap) continue;
      const c = samp[j]!;
      const d = samp[(j + 1) % N]!;
      const d1x = b.x - a.x,
        d1z = b.z - a.z,
        d2x = d.x - c.x,
        d2z = d.z - c.z;
      const den = d1x * d2z - d1z * d2x;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((c.x - a.x) * d2z - (c.z - a.z) * d2x) / den;
      const u = ((c.x - a.x) * d1z - (c.z - a.z) * d1x) / den;
      if (t <= 0.002 || t >= 0.998 || u <= 0.002 || u >= 0.998) continue;
      raw.push({ x: a.x + t * d1x, z: a.z + t * d1z, tA: a.t, tB: c.t });
    }
  }
  const clusters: typeof raw = [];
  for (const h of raw) {
    if (clusters.some((c) => Math.hypot(c.x - h.x, c.z - h.z) < 16)) continue;
    clusters.push(h);
  }
  return clusters;
}

function analyze(id: string, points: Pt[], expectCross = false, minRReq = MIN_RADIUS) {
  const path = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    "catmullrom",
    0.5,
  );
  const len = path.getLength();
  const samples: { x: number; z: number }[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const p = path.getPointAt(i / SAMPLES);
    samples.push({ x: p.x, z: p.z });
  }
  let crosses = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const a = samples[i]!;
    const b = samples[(i + 1) % SAMPLES]!;
    for (let j = i + 2; j < SAMPLES; j++) {
      if (i === 0 && j === SAMPLES - 1) continue;
      const circGap = Math.min(j - i, SAMPLES - (j - i));
      if (circGap <= 1) continue;
      if (segIntersect(a, b, samples[j]!, samples[(j + 1) % SAMPLES]!)) crosses++;
    }
  }
  const clusters = clusterCrossings(path);
  let minClear = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = i + ADJACENT_SKIP; j < SAMPLES; j++) {
      const circGap = Math.min(j - i, SAMPLES - (j - i));
      if (circGap < ADJACENT_SKIP) continue;
      const d = Math.hypot(samples[i]!.x - samples[j]!.x, samples[i]!.z - samples[j]!.z);
      if (d < minClear) minClear = d;
    }
  }
  let minR = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    const ta = path.getTangentAt(t).normalize();
    const tb = path.getTangentAt(((i + 1) % SAMPLES) / SAMPLES).normalize();
    const ds = Math.hypot(
      samples[i]!.x - samples[(i + 1) % SAMPLES]!.x,
      samples[i]!.z - samples[(i + 1) % SAMPLES]!.z,
    );
    const dAng = Math.acos(Math.max(-1, Math.min(1, ta.dot(tb))));
    if (ds > 1e-6) minR = Math.min(minR, 1 / (dAng / ds));
  }
  const t0 = path.getTangentAt(0).normalize();
  const t1 = path.getTangentAt(1 - 1e-6).normalize();
  const joinDeg = (Math.acos(Math.max(-1, Math.min(1, t0.dot(t1)))) * 180) / Math.PI;

  const okCross = expectCross ? clusters.length >= 1 : crosses === 0;
  const okClear = expectCross ? true : minClear >= MIN_CLEARANCE;
  const ok = okCross && okClear && minR >= minRReq && joinDeg <= 12;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${id} len=${len.toFixed(0)} ctrl=${points.length} ` +
      `segCross=${crosses} clusters=${clusters.length} minClear=${minClear.toFixed(1)} ` +
      `minR=${minR.toFixed(1)} join=${joinDeg.toFixed(1)}`,
  );
  return { ok, points, clusters: clusters.length };
}

function roundPts(pts: Pt[], dec = 2): Pt[] {
  const f = 10 ** dec;
  return pts.map(([x, z]) => [Math.round(x * f) / f, Math.round(z * f) / f]);
}

/** Star-shaped polar loop. rot shifts SF; startAngle picks SF bearing. */
function polar(n: number, rFn: (th: number) => number, startAngle = -Math.PI / 2): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const th = startAngle + (i / n) * Math.PI * 2;
    const r = rFn(th);
    pts.push([Math.cos(th) * r, Math.sin(th) * r]);
  }
  return roundPts(pts);
}

function bump(th: number, center: number, width: number, amp: number) {
  const d = Math.atan2(Math.sin(th - center), Math.cos(th - center));
  const u = d / width;
  return amp * Math.exp(-u * u);
}

/** 1 tower+bulb — SF north, going east (CCW in standard = east from north). */
function sketch1(): Pt[] {
  return polar(56, (th) => {
    let r = 100;
    r += bump(th, 0.25, 0.38, 48); // NE tower
    r += bump(th, -0.15, 0.28, 22); // SE down tower
    r += bump(th, Math.PI * 0.92, 0.55, 42); // SW bulb
    r += bump(th, Math.PI * 0.7, 0.28, 18); // west nose
    return r;
  }, -Math.PI / 2);
}

/**
 * 2 humps / neon underpasses — elongated 4-crossing braid
 * (spine-through-lobes topology; first visit at each X = under).
 */
function sketch2(): Pt[] {
  const pts: Pt[] = [
    // SF west bulb
    [-175, -45],
    [-160, -60],
    [-130, -70],
    [-100, -60],
    [-80, -35],
    [-65, -10],
    // cross 1 under
    [-45, 0],
    [-25, 22],
    [0, 48],
    [25, 58],
    [50, 48],
    [65, 20],
    // cross 2 under
    [85, 0],
    [100, -22],
    [125, -48],
    [150, -58],
    [175, -48],
    [190, -18],
    // cross 3 under
    [210, 0],
    [225, 24],
    [250, 52],
    [275, 60],
    [300, 48],
    [315, 18],
    // cross 4 under
    [335, 0],
    [350, -24],
    [375, -52],
    [405, -58],
    [430, -40],
    [440, -10],
    [435, 25],
    [410, 50],
    [380, 55],
    [355, 35],
    // return cross 4 bridge
    [335, 0],
    [320, -24],
    [295, -52],
    [270, -58],
    [245, -42],
    [230, -15],
    // return cross 3 bridge
    [210, 0],
    [195, 24],
    [170, 52],
    [145, 58],
    [120, 42],
    [105, 15],
    // return cross 2 bridge
    [85, 0],
    [70, -24],
    [45, -52],
    [20, -58],
    [-5, -40],
    [-20, -12],
    // return cross 1 bridge
    [-45, 0],
    [-60, 25],
    [-90, 55],
    [-125, 65],
    [-155, 50],
    [-175, 20],
    [-180, -10],
  ];
  return roundPts(pts);
}

/** 3 hairpins — elongated with east scallops (scaled for corner radius). */
function sketch3(): Pt[] {
  return polar(60, (th) => {
    let r = 115;
    r += bump(th, Math.PI, 0.85, 40);
    // wider fingers → larger corner radii
    r += bump(th, 0.2, 0.34, 42);
    r += bump(th, -0.3, 0.34, 42);
    r += bump(th, -0.8, 0.34, 38);
    r += bump(th, Math.PI / 2, 1.0, 10);
    return r * 1.15;
  }, Math.PI);
}

/**
 * 4 braid — chain of figure-8 lobes (yard-drift style ×3).
 * Wide lobes so non-crossing parts stay clear; crossings intentional.
 */
function sketch4(): Pt[] {
  // Scaled / extended yard-drift pattern
  const pts: Pt[] = [
    // SF west bulb, eastbound along south then through crosses
    [-160, -40],
    [-145, -55],
    [-120, -65],
    [-90, -60],
    [-70, -40],
    [-55, -15],
    // cross 1 under
    [-35, 0],
    [-15, 18],
    [5, 40],
    [25, 50],
    [50, 40],
    [65, 15],
    // cross 2 under
    [80, 0],
    [95, -18],
    [115, -40],
    [140, -50],
    [165, -40],
    [180, -15],
    // cross 3 under
    [195, 0],
    [210, 20],
    [230, 45],
    [255, 55],
    [280, 45],
    [295, 20],
    [300, -5],
    // right terminal
    [295, -35],
    [275, -55],
    [245, -60],
    [220, -45],
    [205, -20],
    // return cross 3 bridge
    [195, 0],
    [180, 22],
    [160, 45],
    [135, 55],
    [110, 45],
    [95, 20],
    // return cross 2 bridge
    [80, 0],
    [65, -20],
    [45, -45],
    [20, -55],
    [-5, -45],
    [-20, -20],
    // return cross 1 bridge
    [-35, 0],
    [-50, 22],
    [-75, 50],
    [-105, 60],
    [-135, 50],
    [-155, 25],
    [-160, -5],
  ];
  return roundPts(pts);
}

/** 5 blocky arch — polar with south indent + top plateau. */
function sketch5(): Pt[] {
  return polar(56, (th) => {
    let r = 110;
    r += bump(th, Math.PI / 2, 0.7, 20);
    r += bump(th, 0.45, 0.45, 14);
    r += bump(th, Math.PI - 0.45, 0.45, 14);
    // gentler south indent
    r -= bump(th, -Math.PI / 2, 0.75, 40);
    r += bump(th, -Math.PI / 2 + 0.95, 0.4, 22);
    r += bump(th, -Math.PI / 2 - 0.95, 0.4, 22);
    return Math.max(60, r) * 1.25;
  }, Math.PI);
}

/** 6 three peaks — polar with three northern bumps. */
function sketch6(): Pt[] {
  return polar(56, (th) => {
    let r = 95;
    r += bump(th, Math.PI / 2 - 0.9, 0.42, 50);
    r += bump(th, Math.PI / 2, 0.42, 52);
    r += bump(th, Math.PI / 2 + 0.9, 0.42, 50);
    r += bump(th, -Math.PI / 2, 1.1, 14);
    return r * 1.2;
  }, 0);
}

/** 7 oval. */
function sketch7(): Pt[] {
  return polar(40, () => 1, Math.PI).map(([x, z]) => [
    Math.round(x * 130 * 100) / 100,
    Math.round(z * 72 * 100) / 100,
  ]);
}

/** 8 horseshoe — deep south indent. */
function sketch8(): Pt[] {
  return polar(52, (th) => {
    let r = 115;
    r -= bump(th, -Math.PI / 2, 0.85, 50);
    r += bump(th, -Math.PI / 2 + 1.05, 0.5, 24);
    r += bump(th, -Math.PI / 2 - 1.05, 0.5, 24);
    return Math.max(55, r) * 1.2;
  }, -Math.PI / 2);
}

/**
 * 9 kidney underpass — yard-drift topology, stretched ~1.35×.
 * First visit through X = under; second = bridge.
 */
function sketch9(): Pt[] {
  // YARD_DRIFT control points scaled + rotated so SF is top-left-ish
  const raw: Pt[] = [
    [48, -52],
    [58, -52],
    [68, -50],
    [78, -44],
    [88, -34],
    [94, -20],
    [96, -6],
    [94, 10],
    [88, 24],
    [78, 36],
    [64, 44],
    [48, 46],
    [34, 42],
    [22, 34],
    [12, 20],
    [6, 10],
    [0, 0],
    [-6, -10],
    [-12, -20],
    [-22, -34],
    [-34, -42],
    [-48, -46],
    [-62, -44],
    [-76, -36],
    [-88, -24],
    [-96, -10],
    [-98, 6],
    [-94, 22],
    [-84, 36],
    [-70, 44],
    [-54, 46],
    [-40, 40],
    [-28, 30],
    [-16, 18],
    [-8, 8],
    [0, 0],
    [8, -8],
    [16, -18],
    [26, -32],
    [36, -44],
    [42, -50],
  ];
  const s = 1.45;
  // Rotate so original eastbound SF sits near top-left of kidney
  const rot = -Math.PI * 0.65;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  return roundPts(raw.map(([x, z]) => [ (x * c - z * sn) * s, (x * sn + z * c) * s ]));
}

/** 10 peanut prairie. */
function sketch10(): Pt[] {
  return polar(48, (th) => 90 + 32 * Math.cos(2 * th), -Math.PI / 2).map(([x, z]) => [
    Math.round(x * 1.35 * 100) / 100,
    Math.round(z * 0.78 * 100) / 100,
  ]);
}

const tracks: { id: string; expectCross: boolean; minR: number; pts: () => Pt[] }[] = [
  { id: "1-tower", expectCross: false, minR: MIN_RADIUS, pts: sketch1 },
  { id: "2-humps", expectCross: true, minR: 8, pts: sketch2 },
  { id: "3-hairpins", expectCross: false, minR: MIN_RADIUS, pts: sketch3 },
  { id: "4-braid", expectCross: true, minR: 8, pts: sketch4 },
  { id: "5-arch", expectCross: false, minR: MIN_RADIUS, pts: sketch5 },
  { id: "6-peaks", expectCross: false, minR: MIN_RADIUS, pts: sketch6 },
  { id: "7-oval", expectCross: false, minR: MIN_RADIUS, pts: sketch7 },
  { id: "8-horseshoe", expectCross: false, minR: MIN_RADIUS, pts: sketch8 },
  { id: "9-kidney", expectCross: true, minR: 8, pts: sketch9 },
  { id: "10-peanut", expectCross: false, minR: MIN_RADIUS, pts: sketch10 },
];

let fail = 0;
const dump = process.argv.includes("--dump");
for (const t of tracks) {
  const pts = t.pts();
  const r = analyze(t.id, pts, t.expectCross, t.minR);
  if (!r.ok) fail++;
  if (dump && r.ok) {
    console.log(`\n// ${t.id} clusters=${r.clusters}`);
    console.log(JSON.stringify(pts));
  }
}
console.log(fail === 0 ? "\nALL OK" : `\n${fail} need fixes`);
process.exit(fail === 0 ? 0 : 1);
