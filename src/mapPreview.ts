import * as THREE from "three";
import { getTrackDef, type TrackDef } from "./trackDefs";

type Pt = { x: number; z: number };

/** Sample a closed CatmullRom from control points for 2D silhouette drawing. */
export function sampleTrackOutline(def: TrackDef, samples = 160): Pt[] {
  const pts = def.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const path = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
  const out: Pt[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = path.getPointAt(i / samples);
    out.push({ x: p.x, z: p.z });
  }
  return out;
}

/**
 * Draw a track silhouette in the same visual language as the in-race minimap:
 * dark translucent panel + light course outline stroke.
 */
export function drawTrackPreview(
  canvas: HTMLCanvasElement,
  trackId: string,
  opts: { selected?: boolean; dpr?: number } = {},
) {
  const def = getTrackDef(trackId);
  const dpr = opts.dpr ?? Math.min(devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 96;
  const cssH = canvas.clientHeight || 96;
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const outline = sampleTrackOutline(def, 180);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of outline) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const pad = 10;
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const span = Math.max(maxX - minX, maxZ - minZ, 1) + pad * 2;
  const inset = 11 * dpr;
  const scale = (Math.min(w, h) - inset * 2) / span;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = opts.selected ? "rgba(12, 18, 28, 0.85)" : "rgba(8, 12, 20, 0.72)";
  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!;
    const mx = w * 0.5 + (p.x - cx) * scale;
    const my = h * 0.5 + (p.z - cz) * scale;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.lineTo(mx, my);
  }
  ctx.strokeStyle = opts.selected ? "rgba(255, 59, 46, 0.95)" : "rgba(242, 245, 250, 0.55)";
  ctx.lineWidth = (opts.selected ? 2.4 : 2) * dpr;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // Start/finish tick — small accent like the gantry location
  const start = outline[0]!;
  const next = outline[Math.min(4, outline.length - 1)]!;
  const sx = w * 0.5 + (start.x - cx) * scale;
  const sy = h * 0.5 + (start.z - cz) * scale;
  const tx = next.x - start.x;
  const tz = next.z - start.z;
  const tLen = Math.hypot(tx, tz) || 1;
  const nx = (-tz / tLen) * 5 * dpr;
  const nz = (tx / tLen) * 5 * dpr;
  ctx.beginPath();
  ctx.moveTo(sx - nx, sy - nz);
  ctx.lineTo(sx + nx, sy + nz);
  ctx.strokeStyle = opts.selected ? "#ff3b2e" : "rgba(242, 245, 250, 0.85)";
  ctx.lineWidth = 2.2 * dpr;
  ctx.stroke();
}
