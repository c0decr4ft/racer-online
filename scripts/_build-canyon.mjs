/**
 * Build canyon-cut from hand drawing: fill→contour→mild smooth→dent.
 * node scripts/_build-canyon.mjs
 */
import fs from "fs";
import jpeg from "jpeg-js";
import * as THREE from "three";

const IMG =
  "/Users/luca/.cursor/projects/Users-luca-racer-online/assets/Screenshot_2026-07-22_at_6.13.46_PM-47403798-11b1-4071-b140-e83f3d3a218c.png";

const SAMPLES = 720;
const MIN_CLEARANCE = 30;
const MIN_RADIUS = 13.5;
const ADJ = Math.floor(SAMPLES * 0.08);

function segIntersect(a, b, c, d) {
  const den = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return true;
}

function analyze(id, points, quiet = false) {
  const vecs = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const path = new THREE.CatmullRomCurve3(vecs, true, "catmullrom", 0.5);
  const samples = [];
  for (let i = 0; i < SAMPLES; i++) {
    const p = path.getPointAt(i / SAMPLES);
    samples.push({ x: p.x, z: p.z });
  }
  let crosses = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const a = samples[i],
      b = samples[(i + 1) % SAMPLES];
    for (let j = i + 2; j < SAMPLES; j++) {
      if (i === 0 && j === SAMPLES - 1) continue;
      if (Math.min(j - i, SAMPLES - (j - i)) <= 1) continue;
      if (segIntersect(a, b, samples[j], samples[(j + 1) % SAMPLES])) crosses++;
    }
  }
  let minClear = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = i + ADJ; j < SAMPLES - (i === 0 ? ADJ : 0); j++) {
      if (Math.min(j - i, SAMPLES - (j - i)) < ADJ) continue;
      const d = Math.hypot(
        samples[i].x - samples[j].x,
        samples[i].z - samples[j].z,
      );
      if (d < minClear) minClear = d;
    }
  }
  const t0 = path.getTangentAt(0).normalize();
  const t1 = path.getTangentAt(1 - 1e-6).normalize();
  const joinDeg =
    (Math.acos(Math.max(-1, Math.min(1, t0.dot(t1)))) * 180) / Math.PI;
  let minR = Infinity;
  let minRIdx = null;
  for (let i = 0; i < SAMPLES; i++) {
    const ta = path.getTangentAt(i / SAMPLES).normalize();
    const tb = path.getTangentAt(((i + 1) % SAMPLES) / SAMPLES).normalize();
    const ds = Math.hypot(
      samples[i].x - samples[(i + 1) % SAMPLES].x,
      samples[i].z - samples[(i + 1) % SAMPLES].z,
    );
    const dAng = Math.acos(Math.max(-1, Math.min(1, ta.dot(tb))));
    if (ds > 1e-6) {
      const R = 1 / (dAng / ds);
      if (R < minR) {
        minR = R;
        minRIdx = i;
      }
    }
  }
  const ok =
    crosses === 0 &&
    minClear >= MIN_CLEARANCE &&
    minR >= MIN_RADIUS &&
    joinDeg <= 12;
  if (!quiet) {
    console.log(
      `${ok ? "PASS" : "FAIL"} ${id} len=${path.getLength().toFixed(0)} ctrl=${points.length} crosses=${crosses} clear=${minClear.toFixed(1)} minR=${minR.toFixed(1)} join=${joinDeg.toFixed(1)}`,
    );
  }
  return {
    ok,
    crosses,
    minClear,
    minR,
    joinDeg,
    len: path.getLength(),
    minRIdx,
  };
}

function chaikin(pts, iters = 1) {
  let cur = pts;
  for (let k = 0; k < iters; k++) {
    const next = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i],
        b = cur[(i + 1) % cur.length];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    cur = next;
  }
  return cur;
}

function resample(pts, n) {
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push(d);
    total += d;
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let target = (i / n) * total,
      acc = 0;
    for (let j = 0; j < pts.length; j++) {
      if (acc + seg[j] >= target || j === pts.length - 1) {
        const t = seg[j] < 1e-9 ? 0 : (target - acc) / seg[j];
        const a = pts[j],
          b = pts[(j + 1) % pts.length];
        out.push([
          +(a[0] + (b[0] - a[0]) * t).toFixed(2),
          +(a[1] + (b[1] - a[1]) * t).toFixed(2),
        ]);
        break;
      }
      acc += seg[j];
    }
  }
  return out;
}

function rotateSF(pts) {
  let best = 0,
    bestScore = -Infinity;
  const maxZ = Math.max(...pts.map((p) => p[1]));
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    const dz = z2 - z,
      dx = x2 - x;
    if (z < maxZ * 0.42) continue;
    const score = dz * 20 - Math.abs(dx) * 10 - x * 3;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return [...pts.slice(best), ...pts.slice(0, best)];
}

function mildCornerSmooth(pts, iters = 8, thresh = 0.4) {
  let cur = pts.map((p) => [p[0], p[1]]);
  for (let it = 0; it < iters; it++) {
    const n = cur.length;
    const next = cur.map((p) => [p[0], p[1]]);
    for (let i = 0; i < n; i++) {
      const a = cur[(i - 1 + n) % n],
        b = cur[i],
        c = cur[(i + 1) % n];
      const ax = b[0] - a[0],
        az = b[1] - a[1],
        bx = c[0] - b[0],
        bz = c[1] - b[1];
      const la = Math.hypot(ax, az) || 1,
        lb = Math.hypot(bx, bz) || 1;
      const dot = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb)));
      const turn = Math.acos(dot);
      if (turn < thresh) continue;
      const s = Math.min(0.35, (turn - thresh) * 0.5);
      next[i][0] = b[0] * (1 - s) + ((a[0] + c[0]) / 2) * s;
      next[i][1] = b[1] * (1 - s) + ((a[1] + c[1]) / 2) * s;
    }
    cur = next;
  }
  return cur.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);
}

function relaxTight(pts, maxPasses = 30) {
  let cur = resample(pts, 72);
  for (let pass = 0; pass < maxPasses; pass++) {
    const r = analyze(`relax${pass}`, cur, true);
    if (r.minR >= MIN_RADIUS) return cur;
    if (r.crosses > 0) return cur;
    const ci = Math.round((r.minRIdx / SAMPLES) * cur.length) % cur.length;
    const n = cur.length,
      win = 5;
    const next = cur.map((p) => [p[0], p[1]]);
    for (let k = -win; k <= win; k++) {
      const i = (ci + k + n) % n;
      const a = cur[(i - 1 + n) % n],
        b = cur[i],
        c = cur[(i + 1) % n];
      const s = 0.25 * (1 - Math.abs(k) / win);
      next[i][0] = b[0] * (1 - s) + ((a[0] + c[0]) / 2) * s;
      next[i][1] = b[1] * (1 - s) + ((a[1] + c[1]) / 2) * s;
    }
    cur = next.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);
  }
  return cur;
}

const img = jpeg.decode(fs.readFileSync(IMG), { useTArray: true });
const { width: w, height: h, data } = img;
function lum(x, y) {
  x = Math.max(0, Math.min(w - 1, x | 0));
  y = Math.max(0, Math.min(h - 1, y | 0));
  const i = (y * w + x) * 4;
  return (data[i] + data[i + 1] + data[i + 2]) / 3;
}
function dilate(m, r) {
  const o = new Uint8Array(m.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -r; dy <= r && !on; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) {
            on = 1;
            break;
          }
        }
      o[y * w + x] = on;
    }
  return o;
}
function erode(m, r) {
  const o = new Uint8Array(m.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let on = 1;
      for (let dy = -r; dy <= r && on; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || !m[yy * w + xx]) {
            on = 0;
            break;
          }
        }
      o[y * w + x] = on;
    }
  return o;
}

const white = new Uint8Array(w * h);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) if (lum(x, y) > 140) white[y * w + x] = 1;
const stroke = dilate(white, 3);
const ext = new Uint8Array(w * h);
const q = [0];
ext[0] = 1;
for (let qi = 0; qi < q.length; qi++) {
  const i = q[qi],
    x = i % w,
    y = (i / w) | 0;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const xx = x + dx,
      yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    const j = yy * w + xx;
    if (ext[j] || stroke[j]) continue;
    ext[j] = 1;
    q.push(j);
  }
}
let filled = new Uint8Array(w * h);
for (let i = 0; i < filled.length; i++) filled[i] = !ext[i] ? 1 : 0;
filled = erode(dilate(filled, 14), 3);

function findStart() {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (filled[y * w + x] && (x === 0 || !filled[y * w + x - 1]))
        return { x, y };
}
function contour() {
  const start = findStart();
  const pts = [];
  let x = start.x,
    y = start.y;
  const dx = [1, 1, 0, -1, -1, -1, 0, 1],
    dy = [0, 1, 1, 1, 0, -1, -1, -1];
  let dir = 0;
  for (let step = 0; step < 200000; step++) {
    pts.push({ x, y });
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 6 + k) % 8;
      const nx = x + dx[nd],
        ny = y + dy[nd];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (filled[ny * w + nx]) {
        x = nx;
        y = ny;
        dir = nd;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (step > 30 && x === start.x && y === start.y) break;
  }
  return pts;
}
function simplify(pts, minD) {
  const out = [pts[0]];
  let last = pts[0];
  for (const p of pts) {
    if (Math.hypot(p.x - last.x, p.y - last.y) >= minD) {
      out.push(p);
      last = p;
    }
  }
  return out;
}

const rawC = simplify(contour(), 4);
const cx = w / 2,
  cy = h / 2,
  scale = 0.55;
let world = rawC.map((p) => [
  +((p.x - cx) * scale).toFixed(2),
  +((cy - p.y) * scale).toFixed(2),
]);
world = rotateSF(world);
let cur = resample(chaikin(world, 1), 72);
cur = mildCornerSmooth(cur, 8, 0.4);
cur = relaxTight(resample(cur, 70));
cur = rotateSF(cur);

// Soften left-lobe top dent (recognizable but flowing)
for (let i = 0; i < cur.length; i++) {
  const [x, z] = cur[i];
  if (x > -200 && x < -115 && z > 20 && z < 55) {
    const dent = -12 * Math.exp(-0.5 * ((x + 155) / 28) ** 2);
    cur[i] = [x, +(z + dent).toFixed(2)];
  }
}

const r = analyze("canyon-cut", cur);
fs.writeFileSync(".tmp-canyon-final.json", JSON.stringify(cur));
console.log("wrote .tmp-canyon-final.json", cur.length, r.ok);
