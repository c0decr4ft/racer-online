/**
 * Harbor Circuit — asymmetrical four-lobe clover / X from Screenshot 5.57.05.
 * Non-crossing closed loop; lobes spaced for ≥30m clearance after scale.
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
      if (out.length && Math.hypot(pt[0] - out.at(-1)[0], pt[1] - out.at(-1)[1]) < 0.7) continue;
      out.push(pt);
    }
  }
  while (out.length > 10) {
    const d = Math.hypot(out.at(-1)[0] - out[0][0], out.at(-1)[1] - out[0][1]);
    if (d < 14) out.pop(); else break;
  }
  return out;
}
function scalePts(pts, s) {
  return pts.map(([x, z]) => [+(x * s).toFixed(2), +(z * s).toFixed(2)]);
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
        if (crossAt.length<4) crossAt.push([a.x,a.z]);
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
  const len = path.getLength();
  const ok = crosses===0 && minClear>=MIN_CLEARANCE && minR>=MIN_RADIUS && joinDeg<=12;
  console.log(`${ok?"PASS":"FAIL"} ${id} len=${len.toFixed(0)} ctrl=${points.length} crosses=${crosses} clear=${minClear.toFixed(1)} minR=${minR.toFixed(1)} @(${minRAt?.x.toFixed(0)},${minRAt?.z.toFixed(0)}) join=${joinDeg.toFixed(1)}`);
  if (crossAt.length) console.log("  cross", crossAt.map(p=>`(${p[0].toFixed(0)},${p[1].toFixed(0)})`).join(" "));
  if (minClear < MIN_CLEARANCE && clearPt) console.log(`  near (${clearPt[0].x.toFixed(0)},${clearPt[0].z.toFixed(0)})-(${clearPt[1].x.toFixed(0)},${clearPt[1].z.toFixed(0)})`);
  return { ok, crosses, minClear, minR, joinDeg, len };
}

/**
 * Coordinate plan (raw units, before scale):
 * Center ~ (0, 10). SF runs NE from ~(-90,-70) toward center hairpin.
 * Parallel return after hairpin is ~38 units "outside" (SW of SF).
 * Four lobes at: BL (-95,-85), TL (-95,85), TR (95,90), BR (100,-70).
 * Lobe radius ~42. Connecting arms keep ≥38 gap.
 *
 * Flow (CCW as in image description):
 * SF NE → center hairpin R → SW parallel → BL lobe → north → TL lobe →
 * SE toward center → TR lobe → SW with S-chicane → BR lobe → NW diagonal → SF.
 */
function buildClover(v = 1) {
  // Tunable spacing
  const armGap = 40;      // between SF and parallel return
  const lobeR = 44;
  const hairpinR = 22;

  // SF diagonal: from SW toward center (NE). Direction vector ~ (1, 0.85) normalized
  const sfx0 = -88, sfz0 = -62;
  const sfx1 = -18, sfz1 = 2; // approach hairpin

  // Parallel return after hairpin (offset perpendicular to SF dir, "below")
  // SF dir = (70, 64), perp outward SW-ish = (-64, 70) norm... we want the return
  // on the SE side of SF (image: "slightly below" the SF when heading NE).
  // Perp to (70,64) rotated 90° CW (right for NE travel): (64, -70) → normalize
  const dx = sfx1 - sfx0, dz = sfz1 - sfz0;
  const len = Math.hypot(dx, dz);
  const px = (dz / len) * armGap;  // right-hand offset
  const pz = (-dx / len) * armGap;

  const retx0 = sfx1 + px, retz0 = sfz1 + pz; // near hairpin on return
  const retx1 = sfx0 + px - 8, retz1 = sfz0 + pz - 12; // toward BL lobe entry

  // Hairpin center: slightly past sfx1 along SF, offset toward return side
  const hcx = sfx1 + dx / len * 8 + px * 0.5;
  const hcz = sfz1 + dz / len * 8 + pz * 0.5;

  // Angles for hairpin: enter from SW (heading NE), exit heading SW along return.
  // Enter angle from hairpin center to sfx1, exit to retx0.
  const aEnter = Math.atan2(sfz1 - hcz, sfx1 - hcx) * 180 / Math.PI;
  const aExit = Math.atan2(retz0 - hcz, retx0 - hcx) * 180 / Math.PI;
  // Right-hand hairpin: from aEnter decreasing to aExit (CW). Ensure sweep ~160-200°.
  let sweep = aEnter - aExit;
  while (sweep < 0) sweep += 360;
  while (sweep > 360) sweep -= 360;
  // Prefer CW ~160-220
  let a0 = aEnter, a1 = aEnter - (sweep < 100 ? sweep + 180 : sweep);
  if (Math.abs(a1 - a0) < 100) a1 = a0 - 170;

  // Lobe centers
  const bl = { x: -105, z: -95 };
  const tl = { x: -100, z: 95 };
  const tr = { x: 100, z: 100 };
  const br = { x: 110, z: -85 };

  // Build path
  // 1. SF NE
  const sf = line(sfx0, sfz0, sfx1, sfz1, 5);

  // 2. Hairpin CW (right)
  // Compute proper angles from geometry
  const angIn = Math.atan2(sfz1 - hcz, sfx1 - hcx) * 180 / Math.PI;
  const angOut = Math.atan2(retz0 - hcz, retx0 - hcx) * 180 / Math.PI;
  // CW from angIn to angOut
  let cw = angIn;
  let cwEnd = angOut;
  // normalize so we go CW (decreasing) by ~170°
  while (cwEnd > cw) cwEnd -= 360;
  if (cw - cwEnd < 140) cwEnd = cw - 170;
  if (cw - cwEnd > 220) cwEnd = cw - 175;
  const hp = arc(hcx, hcz, hairpinR, cw, cwEnd, 10);

  // 3. Return SW toward BL lobe
  const ret = line(retx0, retz0, retx1, retz1, 4);

  // 4. BL lobe — enter from NE of lobe, go around CW (outer), exit north
  // Entry near (bl.x + lobeR*0.7, bl.z + lobeR*0.7), exit (bl.x, bl.z + lobeR)
  // Sweep from ~45° (NE) CW to ~90° (N) going the long way: 45 → 0 → -90 → -180 → 90? 
  // Outer lobe going around bottom-left: enter heading SW into lobe, travel S-W-N, exit N.
  // From angle ~40° (NE entry on lobe circle) CW through E,S,W to N (90°)... 
  // Enter at NE of lobe (~45°), CW means 45→0→-90→-180/180→90 — that's going the wrong way for outer.
  // For outer BL lobe traveling: come from center-ish heading SW, hit lobe at NE side,
  // then go clockwise around: NE→SE→S→SW→W→NW→N exit. That's CW from 45° to 90° the long way = 45 down to 90-360 = -270, sweep 315°.
  // Simpler: arc from 50° to -250° (CW = decreasing): 50 → -250 = 300° sweep. Exit at -250+360=110° ≈ NNW.
  const blArc = arc(bl.x, bl.z, lobeR, 55, -250, 16);

  // 5. Connector BL→TL (north along left)
  const leftConn = line(bl.x + Math.cos((-250)*Math.PI/180)*lobeR,
                        bl.z + Math.sin((-250)*Math.PI/180)*lobeR,
                        tl.x + Math.cos(-100*Math.PI/180)*lobeR,
                        tl.z + Math.sin(-100*Math.PI/180)*lobeR, 3);

  // 6. TL lobe — enter from S, around W-N-E, exit SE
  // Enter ~ -100° (SSW), CW to ~ -20° (ESE) long way... 
  // Outer TL: enter heading N, around W then N then E, exit SE.
  // From ~-80° (S) CW: -80 → -180 → 90 → 0 → -20. Sweep from -80 to -20-360=-380, = 300°.
  const tlArc = arc(tl.x, tl.z, lobeR, -85, -380, 16);

  // 7. Across toward TR (SE then curve to TR entry)
  const midConn = join(
    [tl.x + Math.cos((-380)*Math.PI/180)*lobeR, tl.z + Math.sin((-380)*Math.PI/180)*lobeR],
    [10, 45],
    [45, 55],
    [tr.x + Math.cos(200*Math.PI/180)*lobeR, tr.z + Math.sin(200*Math.PI/180)*lobeR],
  );

  // 8. TR lobe — enter from SW, around N-E-S, exit SW
  // From ~200° (SW) CW to ~-120°: 200 → -120 = need 200 down to -120 = 320°? 
  // Outer TR: enter heading NE-ish, go N-E-S, exit SW.
  // Enter ~210°, CW to -130° (230° sweep? 210 to -130 decreasing = 340°). Use 210 → -140.
  const trArc = arc(tr.x, tr.z, lobeR, 210, -150, 16);

  // 9. S-chicane east/south then into BR
  const chicane = join(
    [tr.x + Math.cos((-150)*Math.PI/180)*lobeR, tr.z + Math.sin((-150)*Math.PI/180)*lobeR],
    [70, 20],   // heading SW
    [85, -5],   // right jab east
    [60, -25],  // left jab SW
    [br.x + Math.cos(120*Math.PI/180)*lobeR, br.z + Math.sin(120*Math.PI/180)*lobeR],
  );

  // 10. BR lobe — enter from NW, around E-S-W, exit NW toward SF
  // From ~120° CW to ~160° long way: 120 → -200 (320°). Exit ~ -200+360=160° NW.
  const brArc = arc(br.x, br.z, lobeR, 130, -200, 16);

  // 11. Return diagonal NW to SF start
  const home = line(
    br.x + Math.cos((-200)*Math.PI/180)*lobeR,
    br.z + Math.sin((-200)*Math.PI/180)*lobeR,
    sfx0, sfz0, 5,
  );

  return join(sf, hp, ret, blArc, leftConn, tlArc, midConn, trArc, chicane, brArc, home);
}

// Try a few geometry variants
const variants = [];
for (const gap of [38, 42, 46]) {
  for (const lr of [42, 46, 50]) {
    // rebuild with params by editing inline — simpler: just run main build and fix
  }
}

let clover = buildClover();
let r = analyze("clover-raw", clover);

// If crosses, try alternate more open clover (larger lobe spacing, simpler connectors)
if (!r.ok && r.crosses > 0) {
  console.log("\n--- trying open clover variant ---\n");
  // Simpler explicit clover — four petals on a plus, connected by rounded diamond center
  clover = join(
    // SF bottom-left → center (NE)
    line(-95, -70, -25, -5, 6),
    // Center hairpin (right / CW) — soft
    arc(-5, 5, 24, 220, 40, 12), // from SW entry around to SE exit... adjust
  );
}

// Better: fully explicit non-crossing clover path with known-good topology
// Topology: like a rounded X outline traveling lobe-to-lobe without crossing.
// 
// Imagine four circles at corners of a square. Path goes:
// into center on SE arm of BL-TR diagonal, hairpins onto NW arm going to BL,
// around BL outer, up left side outer to TL, around TL outer, 
// across top-center (north of center) to TR, around TR outer,
// S down east side, around BR outer, then along SW diagonal back to SF.
//
// Critical: the "across top-center" and "return diagonal" and "SF/hairpin pair"
// must not cross. SF+hairpin are in the bottom-left quadrant of the center.
// Top connector stays at z≥50. Return from BR stays at z≤-30 until SF.

function buildOpenClover() {
  const R = 48; // lobe radius
  // Lobe centers — spread far apart
  const BL = [-110, -100];
  const TL = [-110, 105];
  const TR = [115, 105];
  const BR = [115, -100];

  return join(
    // === SF: diagonal NE toward center, several pts for soft join ===
    line(-78, -55, -22, -8, 6),

    // === Central hairpin RIGHT (CW): enter NE-bound, exit SW-bound parallel ===
    // Center of hairpin ~ (-8, 8), r=24
    // Enter from (-22,-8): angle from hp center
    // We'll place hairpin so entry is west-side, exit south-side of small U
    arc(-2, 12, 26, -140, 40, 12), // CW from SW (~-140) to NE? wait need CW decreasing
    // Fix: heading into hairpin is NE (~40°). Right turn CW to head SW (~220°).
    // Point on circle at entry: west of center. 
    // Redo hairpin more carefully:
  );
}

// Explicit carefully-ordered points (no auto arc angle confusion)
function buildExplicit() {
  // All points hand-placed for a clear 4-lobe clover, CCW overall around exterior.
  // SF at BL quadrant going toward center.
  return join(
    // SF straight (NE) — soft join region
    [-85, -58],
    [-70, -48],
    [-55, -38],
    [-40, -28],
    [-28, -18],
    [-18, -8],

    // Central hairpin (soft right ~160°): curl CW
    [-8, 2],
    [2, 8],
    [8, 0],
    [2, -12],
    [-10, -22],
    [-22, -32],

    // Out to bottom-left lobe (SW)
    [-40, -48],
    [-58, -68],
    [-78, -88],

    // BL lobe CW (outer): S → W → N
    [-95, -105],
    [-115, -110],
    [-132, -100],
    [-138, -80],
    [-132, -58],
    [-115, -45],
    [-95, -42],

    // Up left side to TL lobe
    [-95, -20],
    [-98, 10],
    [-100, 40],
    [-105, 70],

    // TL lobe CW: W → N → E
    [-120, 85],
    [-135, 100],
    [-130, 120],
    [-110, 132],
    [-88, 128],
    [-72, 112],
    [-65, 92],

    // Across upper center toward TR (stay north of hairpin zone)
    [-40, 78],
    [-10, 72],
    [25, 78],
    [55, 90],

    // TR lobe CW: N → E → S
    [75, 110],
    [95, 128],
    [118, 130],
    [138, 115],
    [142, 90],
    [130, 70],
    [110, 58],

    // Eastern S-chicane (right then left) heading SW/S
    [95, 40],
    [105, 22],   // right jab
    [88, 5],     // left
    [100, -15],  // right-ish
    [90, -35],

    // Into BR lobe
    [100, -55],
    [115, -75],

    // BR lobe CW: E → S → W
    [130, -90],
    [140, -110],
    [125, -128],
    [100, -135],
    [78, -128],
    [65, -110],
    [60, -88],

    // Long return diagonal NW to SF
    [40, -75],
    [15, -68],
    [-15, -62],
    [-45, -58],
    [-70, -56],
  );
}

clover = buildExplicit();
r = analyze("explicit", clover);

function fit(pts) {
  let cur = pts;
  let rr = analyze("fit0", cur);
  let s = 1;
  for (let i = 0; i < 18 && !rr.ok; i++) {
    if (rr.crosses > 0) {
      console.log("cannot scale away crosses");
      return { pts: cur, r: rr };
    }
    let f = 1.12;
    if (rr.minR < MIN_RADIUS) f = Math.max(f, (MIN_RADIUS / Math.max(rr.minR, 0.5)) * 1.15);
    if (rr.minClear < MIN_CLEARANCE) f = Math.max(f, (MIN_CLEARANCE / Math.max(rr.minClear, 1)) * 1.15);
    s *= f;
    cur = scalePts(pts, s);
    rr = analyze(`fit@${s.toFixed(2)}`, cur);
  }
  // Prefer length ~850-1100 if still ok
  if (rr.ok && rr.len < 800) {
    const cur2 = scalePts(cur, 900 / rr.len);
    const rr2 = analyze("len", cur2);
    if (rr2.ok) return { pts: cur2, r: rr2 };
  }
  return { pts: cur, r: rr };
}

const fitted = fit(clover);

// SVG
{
  const pts = fitted.pts;
  const vecs = pts.map(([x,z]) => new THREE.Vector3(x,0,z));
  const path = new THREE.CatmullRomCurve3(vecs, true, "catmullrom", 0.5);
  let d = "";
  for (let i = 0; i <= 500; i++) {
    const p = path.getPointAt(i / 500);
    d += `${i ? "L" : "M"}${p.x.toFixed(1)} ${(-p.z).toFixed(1)} `;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="-200 -200 400 400">
    <rect x="-200" y="-200" width="400" height="400" fill="#1a5"/>
    <path d="${d}Z" fill="none" stroke="#333" stroke-width="8" stroke-linejoin="round"/>
    <path d="${d}Z" fill="none" stroke="#888" stroke-width="5"/>
    <circle cx="${pts[0][0]}" cy="${-pts[0][1]}" r="4" fill="#f00"/>
    <text x="${pts[0][0]+6}" y="${-pts[0][1]}" fill="#fff" font-size="8">SF</text>
  </svg>`;
  fs.writeFileSync("/tmp/clover.svg", svg);
}

fs.writeFileSync("/tmp/clover-harbor.json", JSON.stringify(fitted.pts));
console.log("\nFINAL", fitted.r.ok ? "OK" : "FAIL", "svg=/tmp/clover.svg", "ctrl", fitted.pts.length);
