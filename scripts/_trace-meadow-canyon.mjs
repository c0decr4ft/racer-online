import fs from "fs";
import jpeg from "jpeg-js";
import * as THREE from "three";

function load(path) {
  return jpeg.decode(fs.readFileSync(path), { useTArray: true });
}
function px(img, x, y) {
  x = Math.max(0, Math.min(img.width - 1, x | 0));
  y = Math.max(0, Math.min(img.height - 1, y | 0));
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

function isRoad3(img, x, y) {
  const [r, g, b] = px(img, x, y);
  if (g > r + 25 && g > b + 15 && g > 80) return false;
  if (b > 140 && b > r + 30) return false;
  if (r > 180 && g > 150 && b < 130 && r - b > 40) return false;
  const avg = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  if (r > 150 && g < 100 && b < 120) return true;
  if (avg > 190 && sat < 35) return true;
  return avg >= 75 && avg <= 175 && sat < 45;
}

function isRoad4(img, x, y) {
  const [r, g, b] = px(img, x, y);
  return (r + g + b) / 3 < 130;
}

function mask(img, pred) {
  const m = new Uint8Array(img.width * img.height);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (pred(img, x, y)) m[y * img.width + x] = 1;
  return m;
}

function dilate(m, w, h, r) {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 0;
    for (let dy = -r; dy <= r && !on; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) { on = 1; break; }
      }
    out[y * w + x] = on;
  }
  return out;
}

function distTransform(m, w, h) {
  const INF = 1e9, dist = new Float64Array(w * h);
  for (let i = 0; i < dist.length; i++) dist[i] = m[i] ? INF : 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (!m[i]) continue;
    dist[i] = Math.min(dist[i], dist[i-1]+1, dist[i-w]+1, dist[i-w-1]+1.4, dist[i-w+1]+1.4);
  }
  for (let y = h - 2; y >= 1; y--) for (let x = w - 2; x >= 1; x--) {
    const i = y * w + x; if (!m[i]) continue;
    dist[i] = Math.min(dist[i], dist[i+1]+1, dist[i+w]+1, dist[i+w-1]+1.4, dist[i+w+1]+1.4);
  }
  return dist;
}

/** Walk that strongly prefers ridge (high dist) and never turns more than ~90° abruptly. */
function walk(m, dist, w, h, sx, sy, initAng, opts = {}) {
  const seenR = opts.seenR ?? 4;
  const maxStep = opts.maxStep ?? 12000;
  const closeR = opts.closeR ?? 35;
  const pts = [];
  let x = sx, y = sy, ang = initAng;
  const seen = new Uint8Array(w * h);
  for (let step = 0; step < maxStep; step++) {
    pts.push({ x, y });
    const ix = Math.round(x), iy = Math.round(y);
    for (let dy = -seenR; dy <= seenR; dy++) for (let dx = -seenR; dx <= seenR; dx++) {
      const yy = iy + dy, xx = ix + dx;
      if (yy >= 0 && xx >= 0 && yy < h && xx < w) seen[yy * w + xx] = 1;
    }
    let best = null;
    for (let rad = 5; rad <= 18; rad++) {
      for (let a = -0.7; a <= 0.7; a += 0.035) {
        const nx = Math.round(x + Math.cos(ang + a) * rad);
        const ny = Math.round(y + Math.sin(ang + a) * rad);
        if (nx < 2 || ny < 2 || nx >= w - 2 || ny >= h - 2) continue;
        const i = ny * w + nx;
        if (!m[i] || seen[i]) continue;
        // Prefer center of road strongly
        const score = dist[i] * 12 - Math.abs(a) * 20 - (rad - 10) * 0.3;
        if (!best || score > best.score) best = { x: nx, y: ny, score, a };
      }
    }
    if (!best) {
      for (let rad = 6; rad <= 28; rad++) {
        for (let a = -1.2; a <= 1.2; a += 0.05) {
          const nx = Math.round(x + Math.cos(ang + a) * rad);
          const ny = Math.round(y + Math.sin(ang + a) * rad);
          if (nx < 2 || ny < 2 || nx >= w - 2 || ny >= h - 2) continue;
          const i = ny * w + nx;
          if (!m[i] || seen[i]) continue;
          const score = dist[i] * 8 - Math.abs(a) * 14;
          if (!best || score > best.score) best = { x: nx, y: ny, score, a };
        }
      }
    }
    if (!best) break;
    ang = Math.atan2(best.y - y, best.x - x);
    x = best.x; y = best.y;
    if (step > 250 && Math.hypot(x - sx, y - sy) < closeR) break;
  }
  return pts;
}

function simplify(pts, minDist) {
  const out = [pts[0]];
  let last = pts[0];
  for (const p of pts) {
    if (Math.hypot(p.x - last.x, p.y - last.y) >= minDist) { out.push(p); last = p; }
  }
  return out;
}

function toWorld(pts, w, h, scale) {
  const cx = w / 2, cy = h / 2;
  return pts.map((p) => [+((p.x - cx) * scale).toFixed(2), +((cy - p.y) * scale).toFixed(2)]);
}

function rotateSF(pts, mode = "south-east") {
  let best = 0, bestScore = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    let score;
    if (mode === "south-east") score = z * 3 - (x2 - x);
    else if (mode === "west-south") score = -x * 2 + (z2 - z) * 0.5; // leftmost going south
    else score = z;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return [...pts.slice(best), ...pts.slice(0, best)];
}

function dedup(pts, minD = 2.5) {
  const out = [pts[0]];
  for (const p of pts) {
    const a = out.at(-1);
    if (Math.hypot(p[0] - a[0], p[1] - a[1]) > minD) out.push(p);
  }
  while (out.length > 10 && Math.hypot(out.at(-1)[0] - out[0][0], out.at(-1)[1] - out[0][1]) < 10) out.pop();
  return out;
}

// --- MEADOW ---
const img3 = load("/tmp/img3.jpg");
let m3 = mask(img3, isRoad3);
const d3 = distTransform(m3, img3.width, img3.height);
// Seed on SF bottom center - max dist near bottom
let seed3 = { x: 320, y: 450, d: -1 };
for (let y = 430; y < 490; y++) for (let x = 250; x < 400; x++) {
  const d = d3[y * img3.width + x];
  if (d > seed3.d && d < 1e8) seed3 = { x, y, d };
}
console.log("meadow seed", seed3);
// Try both directions; pick longer closed loop
const walkE = walk(m3, d3, img3.width, img3.height, seed3.x, seed3.y, 0, { seenR: 5 });
const walkW = walk(m3, d3, img3.width, img3.height, seed3.x, seed3.y, Math.PI, { seenR: 5 });
console.log("meadow walks", walkE.length, walkW.length);
const use3 = walkE.length >= walkW.length ? walkE : walkW;
const meadow = dedup(rotateSF(toWorld(simplify(use3, 10), img3.width, img3.height, 0.42), "south-east"));

// debug overlay
{
  const outBuf = Buffer.from(img3.data);
  for (const p of use3) {
    const i = (Math.round(p.y) * img3.width + Math.round(p.x)) * 4;
    outBuf[i]=255; outBuf[i+1]=0; outBuf[i+2]=0;
  }
  fs.writeFileSync("/tmp/meadow2-debug.jpg", jpeg.encode({ data: outBuf, width: img3.width, height: img3.height }, 85).data);
}

// --- CANYON ---
const img4 = load("/Users/luca/.cursor/projects/Users-luca-racer-online/assets/Screenshot_2026-07-22_at_5.41.07_PM-39700137-c9f3-4ffc-9443-1085142d3ca4.png");
let m4 = dilate(mask(img4, isRoad4), img4.width, img4.height, 3);
const d4 = distTransform(m4, img4.width, img4.height);
// SF on left - find leftmost road with high dist
let seed4 = { x: 0, y: 0, d: -1 };
for (let y = 200; y < 550; y++) for (let x = 80; x < 280; x++) {
  const d = d4[y * img4.width + x];
  if (d > seed4.d && d < 1e8) seed4 = { x, y, d };
}
console.log("canyon seed", seed4);
const walk4a = walk(m4, d4, img4.width, img4.height, seed4.x, seed4.y, Math.PI / 2, { seenR: 3, closeR: 40 }); // north
const walk4b = walk(m4, d4, img4.width, img4.height, seed4.x, seed4.y, -Math.PI / 2, { seenR: 3, closeR: 40 }); // south
console.log("canyon walks", walk4a.length, walk4b.length);
const use4 = walk4a.length >= walk4b.length ? walk4a : walk4b;
const canyon = dedup(rotateSF(toWorld(simplify(use4, 11), img4.width, img4.height, 0.28), "west-south"));
{
  const outBuf = Buffer.from(img4.data);
  for (const p of use4) {
    const i = (Math.round(p.y) * img4.width + Math.round(p.x)) * 4;
    outBuf[i]=255; outBuf[i+1]=0; outBuf[i+2]=0;
  }
  fs.writeFileSync("/tmp/canyon2-debug.jpg", jpeg.encode({ data: outBuf, width: img4.width, height: img4.height }, 85).data);
}

// verify helper
const SAMPLES=720, MIN_CLEARANCE=30, MIN_RADIUS=13.5, ADJ=Math.floor(SAMPLES*0.08);
function segIntersect(a,b,c,d){const den=(b.x-a.x)*(d.z-c.z)-(b.z-a.z)*(d.x-c.x);if(Math.abs(den)<1e-12)return null;const t=((c.x-a.x)*(d.z-c.z)-(c.z-a.z)*(d.x-c.x))/den;const u=((c.x-a.x)*(b.z-a.z)-(c.z-a.z)*(b.x-a.x))/den;if(t<0||t>1||u<0||u>1)return null;return true;}
function analyze(id, points) {
  const vecs=points.map(([x,z])=>new THREE.Vector3(x,0,z));
  const path=new THREE.CatmullRomCurve3(vecs,true,"catmullrom",0.5);
  const samples=[]; for(let i=0;i<SAMPLES;i++){const p=path.getPointAt(i/SAMPLES);samples.push({x:p.x,z:p.z});}
  let crosses=0;
  for(let i=0;i<SAMPLES;i++){const a=samples[i],b=samples[(i+1)%SAMPLES];for(let j=i+2;j<SAMPLES;j++){if(i===0&&j===SAMPLES-1)continue;if(Math.min(j-i,SAMPLES-(j-i))<=1)continue;if(segIntersect(a,b,samples[j],samples[(j+1)%SAMPLES]))crosses++;}}
  let minClear=Infinity;
  for(let i=0;i<SAMPLES;i++)for(let j=i+ADJ;j<SAMPLES-(i===0?ADJ:0);j++){if(Math.min(j-i,SAMPLES-(j-i))<ADJ)continue;const d=Math.hypot(samples[i].x-samples[j].x,samples[i].z-samples[j].z);if(d<minClear)minClear=d;}
  const t0=path.getTangentAt(0).normalize(), t1=path.getTangentAt(1-1e-6).normalize();
  const joinDeg=(Math.acos(Math.max(-1,Math.min(1,t0.dot(t1))))*180)/Math.PI;
  let minR=Infinity;
  for(let i=0;i<SAMPLES;i++){const ta=path.getTangentAt(i/SAMPLES).normalize();const tb=path.getTangentAt(((i+1)%SAMPLES)/SAMPLES).normalize();const ds=Math.hypot(samples[i].x-samples[(i+1)%SAMPLES].x,samples[i].z-samples[(i+1)%SAMPLES].z);const dAng=Math.acos(Math.max(-1,Math.min(1,ta.dot(tb))));if(ds>1e-6){const R=1/(dAng/ds);if(R<minR)minR=R;}}
  const ok=crosses===0&&minClear>=MIN_CLEARANCE&&minR>=MIN_RADIUS&&joinDeg<=12;
  console.log(`${ok?"PASS":"FAIL"} ${id} len=${path.getLength().toFixed(0)} ctrl=${points.length} crosses=${crosses} clear=${minClear.toFixed(1)} minR=${minR.toFixed(1)} join=${joinDeg.toFixed(1)}`);
  return {ok,crosses,minClear,minR,joinDeg,len:path.getLength()};
}

function chaikin(pts, iters=1) {
  let cur=pts;
  for(let k=0;k<iters;k++){
    const next=[];
    for(let i=0;i<cur.length;i++){
      const a=cur[i],b=cur[(i+1)%cur.length];
      next.push([a[0]*0.75+b[0]*0.25,a[1]*0.75+b[1]*0.25]);
      next.push([a[0]*0.25+b[0]*0.75,a[1]*0.25+b[1]*0.75]);
    }
    cur=next;
  }
  return cur;
}
function resample(pts,n){
  const seg=[]; let total=0;
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const d=Math.hypot(b[0]-a[0],b[1]-a[1]);seg.push(d);total+=d;}
  const out=[];
  for(let i=0;i<n;i++){
    let target=(i/n)*total, acc=0;
    for(let j=0;j<pts.length;j++){
      if(acc+seg[j]>=target||j===pts.length-1){
        const t=seg[j]<1e-9?0:(target-acc)/seg[j];
        const a=pts[j],b=pts[(j+1)%pts.length];
        out.push([+(a[0]+(b[0]-a[0])*t).toFixed(2), +(a[1]+(b[1]-a[1])*t).toFixed(2)]);
        break;
      }
      acc+=seg[j];
    }
  }
  return out;
}
function scalePts(pts,s){return pts.map(([x,z])=>[+(x*s).toFixed(2),+(z*s).toFixed(2)]);}
function fit(id, pts, nCtrl=64) {
  let base = resample(chaikin(pts, 1), nCtrl);
  let r = analyze(`raw:${id}`, base);
  if (r.crosses > 0) {
    base = resample(chaikin(pts, 2), Math.max(48, nCtrl - 8));
    r = analyze(`smooth:${id}`, base);
  }
  let s = 1, cur = base;
  for (let i = 0; i < 18 && !r.ok && r.crosses === 0; i++) {
    let f = 1.1;
    if (r.minR < MIN_RADIUS) f = Math.max(f, (MIN_RADIUS/Math.max(r.minR,0.4))*1.12);
    if (r.minClear < MIN_CLEARANCE) f = Math.max(f, (MIN_CLEARANCE/Math.max(r.minClear,1))*1.12);
    s *= f;
    cur = scalePts(base, s);
    r = analyze(`s${s.toFixed(2)}:${id}`, cur);
  }
  return { pts: cur, r };
}

console.log("meadow ctrl", meadow.length, "first", meadow.slice(0,3));
console.log("canyon ctrl", canyon.length, "first", canyon.slice(0,3));
const mFit = fit("meadow", meadow, 62);
const cFit = fit("canyon", canyon, 68);
fs.writeFileSync("/tmp/meadow-canyon.json", JSON.stringify({ "meadow-sweep": mFit.pts, "canyon-cut": cFit.pts }));
console.log("done", mFit.r.ok, cFit.r.ok);
