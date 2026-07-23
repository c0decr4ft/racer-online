/**
 * Image-faithful centerlines (softened for ≥30m clearance / ≥13.5m radius).
 * Harbor/Summit: refined auto-traces from screenshots.
 * Meadow/Canyon: hand waypoints from screenshot silhouettes.
 */
import fs from "fs";
import * as THREE from "three";

function arc(cx, cz, r, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    pts.push([+(cx + Math.cos(a) * r).toFixed(2), +(cz + Math.sin(a) * r).toFixed(2)]);
  }
  return pts;
}
function line(x0, z0, x1, z1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([+(x0 + (x1 - x0) * t).toFixed(2), +(z0 + (z1 - z0) * t).toFixed(2)]);
  }
  return pts;
}
function join(...parts) {
  const out = [];
  for (const p of parts) {
    const arr = Array.isArray(p[0]) ? p : [p];
    for (const pt of arr) {
      if (out.length && Math.hypot(pt[0] - out.at(-1)[0], pt[1] - out.at(-1)[1]) < 0.8) continue;
      out.push(pt);
    }
  }
  while (out.length > 8) {
    const d = Math.hypot(out.at(-1)[0] - out[0][0], out.at(-1)[1] - out[0][1]);
    if (d < 12) out.pop(); else break;
  }
  return out;
}
function scalePts(pts, s) {
  return pts.map(([x, z]) => [+(x * s).toFixed(2), +(z * s).toFixed(2)]);
}
function reverse(pts) {
  return [...pts].reverse();
}

const SAMPLES = 720;
const MIN_CLEARANCE = 30;
const MIN_RADIUS = 13.5;
const ADJ = Math.floor(SAMPLES * 0.08);

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
  let crosses=0, crossAt=[];
  for(let i=0;i<SAMPLES;i++){
    const a=samples[i], b=samples[(i+1)%SAMPLES];
    for(let j=i+2;j<SAMPLES;j++){
      if(i===0&&j===SAMPLES-1)continue;
      if(Math.min(j-i,SAMPLES-(j-i))<=1)continue;
      if(segIntersect(a,b,samples[j],samples[(j+1)%SAMPLES])) {
        crosses++;
        if (crossAt.length<3) crossAt.push([+(a.x.toFixed(0)), +(a.z.toFixed(0))]);
      }
    }
  }
  let minClear=Infinity, clearPt=null;
  for(let i=0;i<SAMPLES;i++){
    for(let j=i+ADJ;j<SAMPLES-(i===0?ADJ:0);j++){
      if(Math.min(j-i,SAMPLES-(j-i))<ADJ)continue;
      const d=Math.hypot(samples[i].x-samples[j].x,samples[i].z-samples[j].z);
      if(d<minClear){minClear=d; clearPt=[samples[i],samples[j]];}
    }
  }
  const t0=path.getTangentAt(0).normalize();
  const t1=path.getTangentAt(1-1e-6).normalize();
  const joinDeg=(Math.acos(Math.max(-1,Math.min(1,t0.dot(t1))))*180)/Math.PI;
  let minR=Infinity, minRAt=null;
  for(let i=0;i<SAMPLES;i++){
    const ta=path.getTangentAt(i/SAMPLES).normalize();
    const tb=path.getTangentAt(((i+1)%SAMPLES)/SAMPLES).normalize();
    const ds=Math.hypot(samples[i].x-samples[(i+1)%SAMPLES].x,samples[i].z-samples[(i+1)%SAMPLES].z);
    const dAng=Math.acos(Math.max(-1,Math.min(1,ta.dot(tb))));
    if(ds>1e-6){ const R=1/(dAng/ds); if(R<minR){minR=R; minRAt=samples[i];} }
  }
  const len=path.getLength();
  const ok=crosses===0&&minClear>=MIN_CLEARANCE&&minR>=MIN_RADIUS&&joinDeg<=12;
  console.log(`${ok?"PASS":"FAIL"} ${id} len=${len.toFixed(0)} ctrl=${points.length} crosses=${crosses} clear=${minClear.toFixed(1)} minR=${minR.toFixed(1)} @(${minRAt?.x.toFixed(0)},${minRAt?.z.toFixed(0)}) join=${joinDeg.toFixed(1)}`);
  if (crossAt.length) console.log("  cross near", crossAt.join(" | "));
  if (minClear < MIN_CLEARANCE && clearPt) console.log(`  near (${clearPt[0].x.toFixed(0)},${clearPt[0].z.toFixed(0)})-(${clearPt[1].x.toFixed(0)},${clearPt[1].z.toFixed(0)})`);
  return { ok, crosses, minClear, minR, joinDeg, len };
}
function fit(name, pts) {
  let r = analyze(`raw:${name}`, pts);
  let s = 1, cur = pts;
  for (let i = 0; i < 20 && !r.ok; i++) {
    if (r.crosses > 0) return { pts: cur, r };
    let f = 1.12;
    if (r.minR < MIN_RADIUS) f = Math.max(f, (MIN_RADIUS / Math.max(r.minR, 0.5)) * 1.12);
    if (r.minClear < MIN_CLEARANCE) f = Math.max(f, (MIN_CLEARANCE / Math.max(r.minClear, 1)) * 1.15);
    s *= f;
    cur = scalePts(pts, s);
    r = analyze(`s${s.toFixed(2)}:${name}`, cur);
  }
  return { pts: cur, r };
}

/**
 * MEADOW — Screenshot 5.39.38
 * Built racing EASTBOUND on SF (reversed from image's westbound race dir):
 * SF → bottom-right big sweeper (pond inside) → up east → central hairpin →
 * top-right approach → top wavy west → left side south with kink → SF.
 * Spaced so parallel arms stay ≥38 apart before scale.
 */
const MEADOW = join(
  // SF bottom eastbound
  line(-50, -88, 55, -88, 7),
  // Bottom-right sweeper (large, pond infield) — from south going east-north-west-ish onto up-arm
  // Enter at (55,-88) heading east. Center (78,-52), r=40. Start ang -90, sweep to +100
  arc(78, -52, 40, -90, 110, 14),
  // Now roughly at NW of sweeper heading west-north. Climb/transition into S:
  // Approach central hairpin from the SE going NW then U-turn
  [48, -8],
  [20, 8],
  // Central hairpin — open to the east, turn 180 from NW entry to SE exit via west
  // Center (-5, 12), r=30. Enter from (20,8) ~ heading west. From ang ~-20 to 200
  arc(-8, 14, 32, -20, 200, 12),
  // Exit heading SE-ish → go toward top-right via east then north
  [22, 30],
  [55, 28],
  [85, 40],
  // Wide right-side climb to top-right (soft left sweeper feel)
  arc(70, 62, 36, -20, 120, 10),
  // Top wavy westbound
  [40, 92],
  [15, 80],
  [-15, 94],
  [-50, 90],
  // Top-left corner ~90–120°
  arc(-70, 68, 30, 90, 200, 8),
  // Left side south with outward bulge then inward kink
  [-95, 40],
  [-100, 10],
  [-88, -20],
  [-78, -50],
  // Bottom-left onto SF
  arc(-65, -72, 22, 160, 270, 6),
);

/**
 * CANYON — Screenshot 5.41.07
 * SF on left (southbound into left hairpin), long NE straight, soft geometric
 * top head, SE diagonal, east sweeper, bottom U, S-curves back to SF.
 * Expanded so no arm comes within ~38 of another.
 */
const CANYON = join(
  // SF left face southbound — several points for soft join
  line(-100, 30, -100, -20, 5),
  // Left hairpin (west hook) — r=28
  arc(-100, -48, 28, 90, 270, 10),
  // Long ENE straight
  line(-100, -76, 40, -45, 7),
  // Soft geometric "head" (boxy zigzags, softened)
  [60, -30],
  [68, -8],
  [50, 12],
  [68, 32],
  [95, 38],
  // Long SE back straight
  line(95, 38, 145, -15, 5),
  // Eastern wide sweeper
  arc(125, -42, 40, 50, -130, 12),
  // Gentle S toward SW
  [95, -78],
  [65, -72],
  [40, -88],
  // Soft kink (was sharp 90-90)
  [18, -98],
  [0, -88],
  [-15, -98],
  // Large south U back north toward center — keep clear of diagonal
  arc(-10, -60, 42, -100, 100, 12),
  // Final S up to SF
  [-5, -18],
  [-30, 0],
  [-55, 12],
  [-80, 22],
  [-95, 30],
);

/**
 * HARBOR — from auto-trace of 5.38.23 (recognizable silhouette),
 * lightly re-smoothed; then scaled in fit().
 */
const auto = JSON.parse(fs.readFileSync("/tmp/fitted-tracks.json", "utf8"));
// Use unscaled-ish: take fitted and downscale to raw then we'll re-fit... 
// Actually use the already-passing fitted harbor/summit, optionally mild downsample.
const HARBOR = auto["harbor-circuit"];
const SUMMIT = auto["summit-pass"];

const OVAL = join(
  line(-55, -45, 55, -45, 5),
  arc(55, 0, 45, -90, 90, 10),
  line(55, 45, -55, 45, 5),
  arc(-55, 0, 45, 90, 270, 10),
);

const results = {
  "harbor-circuit": { pts: HARBOR, r: analyze("harbor-auto", HARBOR) },
  "summit-pass": { pts: SUMMIT, r: analyze("summit-auto", SUMMIT) },
  "meadow-sweep": fit("meadow", MEADOW),
  "canyon-cut": fit("canyon", CANYON),
  "oval-circuit": fit("oval", OVAL),
};

// SVG
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1200" viewBox="-250 -220 500 440"><rect x="-250" y="-220" width="500" height="440" fill="#153"/>`;
const cols = { "harbor-circuit":"#f66", "summit-pass":"#6cf", "meadow-sweep":"#fc6", "canyon-cut":"#c9f", "oval-circuit":"#eee" };
for (const [id, { pts }] of Object.entries(results)) {
  const vecs = pts.map(([x,z]) => new THREE.Vector3(x,0,z));
  const path = new THREE.CatmullRomCurve3(vecs, true, "catmullrom", 0.5);
  let d="";
  for (let i=0;i<=420;i++){ const p=path.getPointAt(i/420); d+=`${i?"L":"M"}${p.x.toFixed(1)} ${(-p.z).toFixed(1)} `; }
  svg += `<path d="${d}Z" fill="none" stroke="${cols[id]}" stroke-width="2.2"/>`;
  svg += `<circle cx="${pts[0][0]}" cy="${-pts[0][1]}" r="3.5" fill="${cols[id]}"/>`;
  svg += `<text x="${pts[0][0]+5}" y="${-pts[0][1]-5}" fill="#fff" font-size="7">${id}</text>`;
}
svg += `</svg>`;
fs.writeFileSync("/tmp/hand-tracks.svg", svg);

const out = {};
let all = true;
console.log("\n=== FINAL ===");
for (const [id, { pts, r }] of Object.entries(results)) {
  out[id] = pts;
  const rr = analyze(id, pts);
  if (!rr.ok) all = false;
}
fs.writeFileSync("/tmp/hand-tracks.json", JSON.stringify(out));
console.log(all ? "ALL OK" : "NEED FIXES");
