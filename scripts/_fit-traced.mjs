import fs from "fs";
import * as THREE from "three";

const traced = JSON.parse(fs.readFileSync("/tmp/traced-tracks.json", "utf8"));

const SAMPLES = 720;
const MIN_CLEARANCE = 30;
const MIN_RADIUS = 13.5;
const ADJACENT_SKIP = Math.floor(SAMPLES * 0.08);

function segIntersect(a,b,c,d){
  const den=(b.x-a.x)*(d.z-c.z)-(b.z-a.z)*(d.x-c.x);
  if(Math.abs(den)<1e-12)return null;
  const t=((c.x-a.x)*(d.z-c.z)-(c.z-a.z)*(d.x-c.x))/den;
  const u=((c.x-a.x)*(b.z-a.z)-(c.z-a.z)*(b.x-a.x))/den;
  if(t<0||t>1||u<0||u>1)return null;
  return true;
}

function analyze(id, points) {
  const vecs = points.map(([x,z]) => new THREE.Vector3(x,0,z));
  const path = new THREE.CatmullRomCurve3(vecs, true, "catmullrom", 0.5);
  const samples = [];
  for (let i=0;i<SAMPLES;i++){ const p=path.getPointAt(i/SAMPLES); samples.push({x:p.x,z:p.z}); }
  let crosses=0;
  for(let i=0;i<SAMPLES;i++){
    const a=samples[i], b=samples[(i+1)%SAMPLES];
    for(let j=i+2;j<SAMPLES;j++){
      if(i===0&&j===SAMPLES-1)continue;
      if(Math.min(j-i,SAMPLES-(j-i))<=1)continue;
      if(segIntersect(a,b,samples[j],samples[(j+1)%SAMPLES])) crosses++;
    }
  }
  let minClear=Infinity;
  for(let i=0;i<SAMPLES;i++){
    for(let j=i+ADJACENT_SKIP;j<SAMPLES-(i===0?ADJACENT_SKIP:0);j++){
      if(Math.min(j-i,SAMPLES-(j-i))<ADJACENT_SKIP)continue;
      const d=Math.hypot(samples[i].x-samples[j].x,samples[i].z-samples[j].z);
      if(d<minClear)minClear=d;
    }
  }
  const t0=path.getTangentAt(0).normalize();
  const t1=path.getTangentAt(1-1e-6).normalize();
  const joinDeg=(Math.acos(Math.max(-1,Math.min(1,t0.dot(t1))))*180)/Math.PI;
  let minR=Infinity;
  for(let i=0;i<SAMPLES;i++){
    const ta=path.getTangentAt(i/SAMPLES).normalize();
    const tb=path.getTangentAt(((i+1)%SAMPLES)/SAMPLES).normalize();
    const ds=Math.hypot(samples[i].x-samples[(i+1)%SAMPLES].x,samples[i].z-samples[(i+1)%SAMPLES].z);
    const dAng=Math.acos(Math.max(-1,Math.min(1,ta.dot(tb))));
    if(ds>1e-6){ const R=1/(dAng/ds); if(R<minR)minR=R; }
  }
  const len = path.getLength();
  const ok=crosses===0&&minClear>=MIN_CLEARANCE&&minR>=MIN_RADIUS&&joinDeg<=12;
  console.log(`${ok?"PASS":"FAIL"} ${id} len=${len.toFixed(0)} ctrl=${points.length} crosses=${crosses} clear=${minClear.toFixed(1)} minR=${minR.toFixed(1)} join=${joinDeg.toFixed(1)}`);
  return { ok, crosses, minClear, minR, joinDeg, len };
}

function resampleEven(pts, n) {
  // build polyline length and sample n points
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const d = Math.hypot(b[0]-a[0], b[1]-a[1]);
    seg.push(d); total += d;
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let target = (i / n) * total;
    let acc = 0;
    for (let j = 0; j < pts.length; j++) {
      if (acc + seg[j] >= target || j === pts.length - 1) {
        const t = seg[j] < 1e-9 ? 0 : (target - acc) / seg[j];
        const a = pts[j], b = pts[(j + 1) % pts.length];
        out.push([a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t]);
        break;
      }
      acc += seg[j];
    }
  }
  return out.map(([x,z]) => [+x.toFixed(2), +z.toFixed(2)]);
}

function chaikin(pts, iters=2) {
  let cur = pts;
  for (let k=0;k<iters;k++) {
    const next = [];
    for (let i=0;i<cur.length;i++) {
      const a = cur[i], b = cur[(i+1)%cur.length];
      next.push([a[0]*0.75+b[0]*0.25, a[1]*0.75+b[1]*0.25]);
      next.push([a[0]*0.25+b[0]*0.75, a[1]*0.25+b[1]*0.75]);
    }
    cur = next;
  }
  return cur;
}

function scalePts(pts, s) {
  return pts.map(([x,z]) => [+(x*s).toFixed(2), +(z*s).toFixed(2)]);
}

function densifyNearSF(pts, count=5, span=4) {
  // ensure even spacing near index 0 wrapping
  return pts;
}

function fitTrack(id, pts, targetCtrl = 64) {
  // smooth a bit, resample, then scale up until pass
  let cur = resampleEven(chaikin(pts, 1), targetCtrl);
  let r = analyze(`raw:${id}`, cur);
  let s = 1;
  // first fix minR and clearance by uniform scale
  for (let iter = 0; iter < 20; iter++) {
    if (r.ok) break;
    let factor = 1.08;
    if (r.minR < MIN_RADIUS) factor = Math.max(factor, (MIN_RADIUS / Math.max(r.minR, 0.5)) * 1.08);
    if (r.minClear < MIN_CLEARANCE) factor = Math.max(factor, (MIN_CLEARANCE / Math.max(r.minClear, 1)) * 1.1);
    if (r.crosses > 0) {
      // scaling won't fix crosses — try more smoothing / fewer ctrl
      cur = resampleEven(chaikin(pts, 2), Math.max(40, targetCtrl - 8));
      targetCtrl = Math.max(40, targetCtrl - 8);
      r = analyze(`smooth:${id}`, cur);
      if (r.crosses > 0) {
        console.log(`  still crosses for ${id}, need manual fix`);
        break;
      }
      continue;
    }
    s *= factor;
    cur = scalePts(resampleEven(chaikin(pts, 1), targetCtrl), s);
    r = analyze(`s${s.toFixed(2)}:${id}`, cur);
  }
  // stretch length toward ~750 if short
  if (r.ok && r.len < 680) {
    const s2 = 720 / r.len;
    const cur2 = scalePts(cur, s2);
    const r2 = analyze(`len:${id}`, cur2);
    if (r2.ok) { cur = cur2; r = r2; }
  }
  return { pts: cur, r };
}

// SVG of raw traces
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="-200 -160 400 320"><rect width="100%" height="100%" x="-200" y="-160" fill="#142"/>`;
const colors = ["#f66","#6cf","#fc6","#c9f"];
let ci=0;
for (const [id, pts] of Object.entries(traced)) {
  let d="";
  for (let i=0;i<pts.length;i++) d += `${i?"L":"M"}${pts[i][0]} ${-pts[i][1]} `;
  d += "Z";
  svg += `<path d="${d}" fill="none" stroke="${colors[ci++]}" stroke-width="1.2" opacity="0.9"/>`;
  svg += `<circle cx="${pts[0][0]}" cy="${-pts[0][1]}" r="2" fill="${colors[ci-1]}"/>`;
  svg += `<text x="${pts[0][0]+3}" y="${-pts[0][1]}" fill="#fff" font-size="5">${id}</text>`;
}
svg += `</svg>`;
fs.writeFileSync("/tmp/traced-raw.svg", svg);

const final = {};
for (const [id, pts] of Object.entries(traced)) {
  console.log("\n===", id, "raw ctrl", pts.length);
  const { pts: fitted, r } = fitTrack(id, pts, id === "canyon-cut" ? 72 : 60);
  final[id] = fitted;
}
fs.writeFileSync("/tmp/fitted-tracks.json", JSON.stringify(final));
console.log("\n=== FINAL ===");
for (const [id, pts] of Object.entries(final)) analyze(id, pts);
