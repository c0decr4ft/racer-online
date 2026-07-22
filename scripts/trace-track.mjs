/**
 * Trace circuit centerline from public/circuit-map.png (JPEG data despite .png name).
 * Writes public/path-debug.jpg and prints world-space [x,z] points for track.ts.
 *
 * Usage: node scripts/trace-track.mjs
 */
import fs from "fs";
import jpeg from "jpeg-js";

const buf = fs.readFileSync("public/circuit-map.png");
const { width, height, data } = jpeg.decode(buf, { useTArray: true });

function px(x, y) {
  const xx = Math.max(0, Math.min(width - 1, x | 0));
  const yy = Math.max(0, Math.min(height - 1, y | 0));
  const i = (yy * width + xx) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function isRoad(x, y) {
  if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return false;
  const [r, g, b] = px(x, y);
  if (g > r + 15 && g > b + 8 && g > 90) return false;
  if (b > 145 && b > r + 25 && b > g + 15) return false;
  if (r > 200 && g > 175 && b < 200 && r - b > 25) return false;
  if (r > 160 && g > 90 && g < 160 && b < 100) return false;
  const avg = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return avg >= 155 && avg <= 200 && sat <= 28 && Math.abs(r - b) < 20;
}

const road = new Uint8Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (isRoad(x, y)) road[y * width + x] = 1;
  }
}

const checks = [];
for (let y = 740; y < 820; y++) {
  for (let x = 300; x <= 430; x++) {
    const [r, g, b] = px(x, y);
    if (r < 40 && g < 40 && b < 40) {
      const [r2, g2, b2] = px(x + 4, y);
      if (r2 > 210 && g2 > 210 && b2 > 210) checks.push({ x, y });
    }
  }
}
const sfx = checks.reduce((s, p) => s + p.x, 0) / checks.length;
const sfy = checks.reduce((s, p) => s + p.y, 0) / checks.length;
console.log("sf", sfx, sfy, checks.length);

function floodKeep(sx, sy) {
  const keep = new Uint8Array(width * height);
  const q = [[sx, sy]];
  keep[sy * width + sx] = 1;
  let qi = 0;
  while (qi < q.length) {
    const [x, y] = q[qi++];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const i = ny * width + nx;
      if (!road[i] || keep[i]) continue;
      keep[i] = 1;
      q.push([nx, ny]);
    }
  }
  return keep;
}

let seedX = 0;
let seedY = 0;
outer: for (let r = 0; r < 50; r++) {
  for (let a = 0; a < Math.PI * 2; a += 0.12) {
    const x = Math.round(sfx + Math.cos(a) * r);
    const y = Math.round(sfy + Math.sin(a) * r);
    if (road[y * width + x]) {
      seedX = x;
      seedY = y;
      break outer;
    }
  }
}

const keep = floodKeep(seedX, seedY);
road.set(keep);

const INF = 1e9;
const dist = new Float64Array(width * height);
for (let i = 0; i < dist.length; i++) dist[i] = road[i] ? INF : 0;
for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    if (!road[i]) continue;
    dist[i] = Math.min(
      dist[i],
      dist[i - 1] + 1,
      dist[i - width] + 1,
      dist[i - width - 1] + 1.4,
      dist[i - width + 1] + 1.4,
    );
  }
}
for (let y = height - 2; y >= 1; y--) {
  for (let x = width - 2; x >= 1; x--) {
    const i = y * width + x;
    if (!road[i]) continue;
    dist[i] = Math.min(
      dist[i],
      dist[i + 1] + 1,
      dist[i + width] + 1,
      dist[i + width - 1] + 1.4,
      dist[i + width + 1] + 1.4,
    );
  }
}

let seed = { x: 0, y: 0, d: -1 };
for (let y = Math.floor(sfy) - 25; y <= sfy + 25; y++) {
  for (let x = Math.floor(sfx) - 40; x <= sfx + 40; x++) {
    const d = dist[y * width + x];
    if (d < INF / 2 && d > seed.d) seed = { x, y, d };
  }
}
console.log("seed", seed);

function walk(sx, sy, initAng) {
  const pts = [];
  let x = sx;
  let y = sy;
  let ang = initAng;
  const seen = new Uint8Array(width * height);
  for (let step = 0; step < 5000; step++) {
    pts.push({ x, y });
    const ix = Math.round(x);
    const iy = Math.round(y);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const yy = iy + dy;
        const xx = ix + dx;
        if (yy >= 0 && xx >= 0 && yy < height && xx < width) seen[yy * width + xx] = 1;
      }
    }
    let best = null;
    for (let rad = 7; rad <= 18; rad++) {
      for (let a = -0.7; a <= 0.7; a += 0.05) {
        const nx = Math.round(x + Math.cos(ang + a) * rad);
        const ny = Math.round(y + Math.sin(ang + a) * rad);
        if (nx < 3 || ny < 3 || nx >= width - 3 || ny >= height - 3) continue;
        const i = ny * width + nx;
        if (!road[i] || seen[i]) continue;
        const score = dist[i] * 5 - Math.abs(a) * 14;
        if (!best || score > best.score) best = { x: nx, y: ny, score };
      }
    }
    if (!best) {
      for (let rad = 8; rad <= 30; rad++) {
        for (let a = -1.6; a <= 1.6; a += 0.08) {
          const nx = Math.round(x + Math.cos(ang + a) * rad);
          const ny = Math.round(y + Math.sin(ang + a) * rad);
          if (nx < 3 || ny < 3 || nx >= width - 3 || ny >= height - 3) continue;
          const i = ny * width + nx;
          if (!road[i] || seen[i]) continue;
          const score = dist[i] * 3 - Math.abs(a) * 6;
          if (!best || score > best.score) best = { x: nx, y: ny, score };
        }
      }
    }
    if (!best) break;
    ang = Math.atan2(best.y - y, best.x - x);
    x = best.x;
    y = best.y;
    if (step > 180 && Math.hypot(x - sx, y - sy) < 28) break;
  }
  return pts;
}

// Walk +X first (stable), then reverse to race CCW (left along SF)
const pathCw = walk(seed.x, seed.y, 0);
console.log("pathCw", pathCw.length);

function simplify(pts, minDist) {
  const out = [pts[0]];
  let last = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (Math.hypot(pts[i].x - last.x, pts[i].y - last.y) >= minDist) {
      out.push(pts[i]);
      last = pts[i];
    }
  }
  return out;
}

const dec = simplify(pathCw, 16);
const target = 90;
const sampled = [];
for (let i = 0; i < target; i++) {
  sampled.push(dec[Math.min(dec.length - 1, Math.floor((i * (dec.length - 1)) / (target - 1)))]);
}

const scale = 200 / width;
const cx = width / 2;
const cy = height / 2;
let world = sampled.map((p) => [+((p.x - cx) * scale).toFixed(1), +((cy - p.y) * scale).toFixed(1)]);

// Drop pit digression south of SF straight
const cleaned = [];
for (const p of world) {
  if (cleaned.length > 20 && p[1] < -56) break;
  cleaned.push(p);
}
const start0 = cleaned[0];
const last = cleaned[cleaned.length - 1];
for (let i = 1; i <= 4; i++) {
  const t = i / 5;
  cleaned.push([
    +(last[0] + (start0[0] - last[0]) * t).toFixed(1),
    +(last[1] + (start0[1] - last[1]) * t).toFixed(1),
  ]);
}

// Reverse → CCW, rotate SF to index 0
const rev = [...cleaned].reverse();
let bestI = 0;
let bestScore = Infinity;
for (let i = 0; i < rev.length; i++) {
  const [x, z] = rev[i];
  const score = Math.abs(z + 53.8) * 2 + Math.abs(x + 5);
  if (score < bestScore) {
    bestScore = score;
    bestI = i;
  }
}
world = [...rev.slice(bestI), ...rev.slice(0, bestI)];
const dedup = [world[0]];
for (let i = 1; i < world.length; i++) {
  const a = dedup[dedup.length - 1];
  const b = world[i];
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 2.5) dedup.push(b);
}
world = dedup;

console.log("first", world.slice(0, 3));
console.log("dir", world[1][0] - world[0][0], world[1][1] - world[0][1]);
console.log("n", world.length);
console.log(JSON.stringify(world));

const out = Buffer.from(data);
for (const p of pathCw) {
  const i = (Math.round(p.y) * width + Math.round(p.x)) * 4;
  out[i] = 255;
  out[i + 1] = 0;
  out[i + 2] = 0;
}
fs.writeFileSync("public/path-debug.jpg", jpeg.encode({ data: out, width, height }, 85).data);
fs.writeFileSync("/tmp/track_points.json", JSON.stringify(world));
