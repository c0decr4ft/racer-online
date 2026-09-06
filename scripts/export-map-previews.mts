/**
 * Export minimap-style SVG (and optional PNG via sharp if present) for every TRACKS course.
 * Usage: node --experimental-strip-types scripts/export-map-previews.mts
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import * as THREE from "three";
import { TRACKS, DRIFT_TRACK } from "../src/trackDefs.ts";

const OUT = join(process.cwd(), "map-previews");
mkdirSync(OUT, { recursive: true });

function sampleOutline(points: readonly (readonly [number, number])[], samples = 200) {
  const path = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    "catmullrom",
    0.5,
  );
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = path.getPointAt(i / samples);
    out.push({ x: p.x, z: p.z });
  }
  return out;
}

function toSvg(id: string, name: string, points: readonly (readonly [number, number])[], underpass: boolean) {
  const outline = sampleOutline(points);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of outline) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const pad = 14;
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const span = Math.max(maxX - minX, maxZ - minZ, 1) + pad * 2;
  const W = 480;
  const H = 480;
  const inset = 28;
  const scale = (Math.min(W, H) - inset * 2) / span;
  const pts = outline
    .map((p) => {
      const mx = W * 0.5 + (p.x - cx) * scale;
      const my = H * 0.5 + (p.z - cz) * scale;
      return `${mx.toFixed(1)},${my.toFixed(1)}`;
    })
    .join(" ");
  const start = outline[0]!;
  const next = outline[Math.min(4, outline.length - 1)]!;
  const sx = W * 0.5 + (start.x - cx) * scale;
  const sy = H * 0.5 + (start.z - cz) * scale;
  const dx = next.x - start.x;
  const dz = next.z - start.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * 10;
  const nz = (dx / len) * 10;
  const tx1 = sx + nx;
  const ty1 = sy + nz;
  const tx2 = sx - nx;
  const ty2 = sy - nz;
  const stroke = underpass ? "#ff6a45" : "#e8eef6";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0a1018"/>
  <text x="24" y="36" fill="#a8b4c4" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" font-weight="600">${name}</text>
  <text x="24" y="58" fill="#6a7688" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13">${id}${underpass ? " · underpass" : ""}</text>
  <polyline fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>
  <line x1="${tx1.toFixed(1)}" y1="${ty1.toFixed(1)}" x2="${tx2.toFixed(1)}" y2="${ty2.toFixed(1)}" stroke="#ff3b2e" stroke-width="3.5" stroke-linecap="round"/>
</svg>
`;
}

const all = [...TRACKS, DRIFT_TRACK];
const manifest: { id: string; name: string; path: string; underpass: boolean }[] = [];
for (const t of all) {
  const under = !!(t as { underpass?: boolean }).underpass || t.id === "yard-drift";
  const svg = toSvg(t.id, t.name, t.points, under);
  const file = `${t.id}.svg`;
  const path = join(OUT, file);
  writeFileSync(path, svg);
  manifest.push({ id: t.id, name: t.name, path: `map-previews/${file}`, underpass: under });
  console.log("wrote", path);
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} previews → ${OUT}`);
