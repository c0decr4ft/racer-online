import fs from "fs";
import jpeg from "jpeg-js";

function load(path) {
  const { width, height, data } = jpeg.decode(fs.readFileSync(path), { useTArray: true });
  return { width, height, data };
}

function px(img, x, y) {
  x = Math.max(0, Math.min(img.width - 1, x | 0));
  y = Math.max(0, Math.min(img.height - 1, y | 0));
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

function isRoad1(img, x, y) {
  // dark asphalt on green
  const [r, g, b] = px(img, x, y);
  if (g > r + 20 && g > b + 15 && g > 60) return false; // grass
  const avg = (r + g + b) / 3;
  return avg < 90 && Math.abs(r - g) < 35 && Math.abs(g - b) < 35;
}

function isRoad2(img, x, y) {
  // grey asphalt (+ allow curb edges a bit) on white
  const [r, g, b] = px(img, x, y);
  if (r > 230 && g > 230 && b > 230) return false;
  // curb red/white
  if (r > 150 && g < 80 && b < 100) return true;
  if (r > 200 && g > 200 && b > 200 && (r+g+b)/3 < 250) return true;
  const avg = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return avg >= 40 && avg <= 160 && sat < 45;
}

function isRoad3(img, x, y) {
  // grey road on green with dashed center
  const [r, g, b] = px(img, x, y);
  if (g > r + 25 && g > b + 15 && g > 80) return false;
  if (b > 140 && b > r + 30) return false; // water
  if (r > 180 && g > 160 && b < 140) return false; // sand
  const avg = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  // asphalt grey + white dashes + curbs
  if (r > 160 && g < 90 && b < 110) return true; // curb
  if (avg > 200 && sat < 30) return true; // white dash/curb
  return avg >= 70 && avg <= 170 && sat < 40;
}

function isRoad4(img, x, y) {
  // black/dark line drawing on white
  const [r, g, b] = px(img, x, y);
  const avg = (r + g + b) / 3;
  return avg < 140;
}

function maskRoad(img, isRoad) {
  const m = new Uint8Array(img.width * img.height);
  let count = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (isRoad(img, x, y)) {
        m[y * img.width + x] = 1;
        count++;
      }
    }
  }
  return { m, count };
}

function dilate(m, w, h, r = 1) {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -r; dy <= r && !on; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (m[yy * w + xx]) { on = 1; break; }
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}

function distanceTransform(m, w, h) {
  const INF = 1e9;
  const dist = new Float64Array(w * h);
  for (let i = 0; i < dist.length; i++) dist[i] = m[i] ? INF : 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!m[i]) continue;
      dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - w] + 1, dist[i - w - 1] + 1.4, dist[i - w + 1] + 1.4);
    }
  }
  for (let y = h - 2; y >= 1; y--) {
    for (let x = w - 2; x >= 1; x--) {
      const i = y * w + x;
      if (!m[i]) continue;
      dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + w] + 1, dist[i + w - 1] + 1.4, dist[i + w + 1] + 1.4);
    }
  }
  return dist;
}

function findSeed(m, dist, w, h, prefer) {
  // prefer: {x,y} approx or null → max dist
  let best = { x: 0, y: 0, d: -1 };
  const x0 = prefer?.x ?? w / 2, y0 = prefer?.y ?? h / 2;
  const rad = prefer ? 80 : Math.max(w, h);
  for (let y = Math.max(1, (y0 - rad) | 0); y < Math.min(h - 1, y0 + rad); y++) {
    for (let x = Math.max(1, (x0 - rad) | 0); x < Math.min(w - 1, x0 + rad); x++) {
      const d = dist[y * w + x];
      if (d < INF / 2 && d > best.d) best = { x, y, d };
    }
  }
  const INF = 1e9;
  return best;
}

function walk(m, dist, w, h, sx, sy, initAng) {
  const pts = [];
  let x = sx, y = sy, ang = initAng;
  const seen = new Uint8Array(w * h);
  for (let step = 0; step < 8000; step++) {
    pts.push({ x, y });
    const ix = Math.round(x), iy = Math.round(y);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const yy = iy + dy, xx = ix + dx;
      if (yy >= 0 && xx >= 0 && yy < h && xx < w) seen[yy * w + xx] = 1;
    }
    let best = null;
    for (let rad = 6; rad <= 22; rad++) {
      for (let a = -0.85; a <= 0.85; a += 0.04) {
        const nx = Math.round(x + Math.cos(ang + a) * rad);
        const ny = Math.round(y + Math.sin(ang + a) * rad);
        if (nx < 2 || ny < 2 || nx >= w - 2 || ny >= h - 2) continue;
        const i = ny * w + nx;
        if (!m[i] || seen[i]) continue;
        const score = dist[i] * 6 - Math.abs(a) * 16;
        if (!best || score > best.score) best = { x: nx, y: ny, score };
      }
    }
    if (!best) {
      for (let rad = 8; rad <= 36; rad++) {
        for (let a = -1.8; a <= 1.8; a += 0.07) {
          const nx = Math.round(x + Math.cos(ang + a) * rad);
          const ny = Math.round(y + Math.sin(ang + a) * rad);
          if (nx < 2 || ny < 2 || nx >= w - 2 || ny >= h - 2) continue;
          const i = ny * w + nx;
          if (!m[i] || seen[i]) continue;
          const score = dist[i] * 4 - Math.abs(a) * 8;
          if (!best || score > best.score) best = { x: nx, y: ny, score };
        }
      }
    }
    if (!best) break;
    ang = Math.atan2(best.y - y, best.x - x);
    x = best.x; y = best.y;
    if (step > 200 && Math.hypot(x - sx, y - sy) < 30) break;
  }
  return pts;
}

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

function toWorld(pts, w, h, worldScale) {
  const cx = w / 2, cy = h / 2;
  return pts.map((p) => [
    +(((p.x - cx) * worldScale)).toFixed(2),
    +(((cy - p.y) * worldScale)).toFixed(2),
  ]);
}

function rotateSF(pts) {
  // prefer southernmost eastbound for SF
  let best = 0, bestScore = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const [x2] = pts[(i + 1) % pts.length];
    const score = z * 3 - (x2 - x);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return [...pts.slice(best), ...pts.slice(0, best)];
}

function process(name, path, isRoad, prefer, initAng, minDist, worldScale, dilateR = 0) {
  const img = load(path);
  let { m, count } = maskRoad(img, isRoad);
  console.log(name, "road pixels", count, img.width, "x", img.height);
  if (dilateR) m = dilate(m, img.width, img.height, dilateR);
  const dist = distanceTransform(m, img.width, img.height);
  const INF = 1e9;
  let seed = { x: 0, y: 0, d: -1 };
  const x0 = prefer?.x ?? img.width / 2, y0 = prefer?.y ?? img.height / 2;
  const rad = prefer ? 100 : Math.max(img.width, img.height);
  for (let y = Math.max(1, (y0 - rad) | 0); y < Math.min(img.height - 1, y0 + rad); y++) {
    for (let x = Math.max(1, (x0 - rad) | 0); x < Math.min(img.width - 1, x0 + rad); x++) {
      const d = dist[y * img.width + x];
      if (d < INF / 2 && d > seed.d) seed = { x, y, d };
    }
  }
  console.log(name, "seed", seed);
  const pathPts = walk(m, dist, img.width, img.height, seed.x, seed.y, initAng);
  console.log(name, "walk", pathPts.length);
  const simp = simplify(pathPts, minDist);
  let world = rotateSF(toWorld(simp, img.width, img.height, worldScale));
  // dedup
  const dedup = [world[0]];
  for (let i = 1; i < world.length; i++) {
    const a = dedup.at(-1), b = world[i];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 2) dedup.push(b);
  }
  // drop last if near first
  while (dedup.length > 10 && Math.hypot(dedup.at(-1)[0] - dedup[0][0], dedup.at(-1)[1] - dedup[0][1]) < 12) dedup.pop();
  console.log(name, "ctrl", dedup.length, "first", dedup.slice(0, 3), "last", dedup.slice(-2));
  return { pts: dedup, mask: m, w: img.width, h: img.height, pathPts, img };
}

const img1 = process(
  "harbor",
  "/Users/luca/.cursor/projects/Users-luca-racer-online/assets/Screenshot_2026-07-22_at_5.38.23_PM-d7597ee6-d4d1-48c8-ae6d-564ec9f8c142.png",
  isRoad1,
  { x: 512, y: 480 }, // bottom straight
  0, // east
  14,
  0.28,
);

const img2 = process(
  "summit",
  "/Users/luca/.cursor/projects/Users-luca-racer-online/assets/Screenshot_2026-07-22_at_5.39.13_PM-fae86f4f-8d3d-4f3a-9790-5eb934139b3b.png",
  isRoad2,
  { x: 512, y: 750 },
  Math.PI, // try west along bottom
  16,
  0.22,
  1,
);

const img3 = process(
  "meadow",
  "/tmp/img3.jpg",
  isRoad3,
  { x: 320, y: 450 },
  0,
  12,
  0.35,
);

const img4 = process(
  "canyon",
  "/Users/luca/.cursor/projects/Users-luca-racer-online/assets/Screenshot_2026-07-22_at_5.41.07_PM-39700137-c9f3-4ffc-9443-1085142d3ca4.png",
  isRoad4,
  { x: 200, y: 400 },
  -Math.PI / 2, // north along left SF?
  12,
  0.24,
  2,
);

const out = {
  "harbor-circuit": img1.pts,
  "summit-pass": img2.pts,
  "meadow-sweep": img3.pts,
  "canyon-cut": img4.pts,
};
fs.writeFileSync("/tmp/traced-tracks.json", JSON.stringify(out, null, 2));

// debug overlays
function writeDebug(name, result) {
  const { img, pathPts, w, h } = result;
  const outBuf = Buffer.from(img.data);
  for (const p of pathPts) {
    const i = (Math.round(p.y) * w + Math.round(p.x)) * 4;
    if (i >= 0 && i < outBuf.length - 3) {
      outBuf[i] = 255; outBuf[i+1] = 0; outBuf[i+2] = 0;
    }
  }
  fs.writeFileSync(`/tmp/${name}-debug.jpg`, jpeg.encode({ data: outBuf, width: w, height: h }, 80).data);
}
writeDebug("harbor", img1);
writeDebug("summit", img2);
writeDebug("meadow", img3);
writeDebug("canyon", img4);
console.log("wrote /tmp/traced-tracks.json and debug jpgs");
