/**
 * Event Mode Battle — Mario Kart–style item-box meshes (client visuals only).
 * Layout / values come from the server over the wire.
 *
 * Pot split lives in shared/battleCubes.mjs: cube sats sum to the event pot;
 * wreck drops re-emit haul as new cubes (same pot accounting). Roulette UI may
 * cycle decoy amounts but locks to each cube’s real share.
 */
import * as THREE from "three";
import type { BattleCubeWire } from "./net/protocol";

/** Must match shared/battleCubes.mjs */
export const BATTLE_PICKUP_RADIUS = 8.5;
/** Must match shared/battleCubes.mjs */
export const BATTLE_PICKUP_CLIENT_PAD = 2.5;

/** Must match shared/battleCubes.mjs — battle tracks only. */
export const BATTLE_TRACK_WIDTH_SCALE = 1.45;

const TIER_SIZE: Record<BattleCubeWire["tier"], number> = {
  small: 0.95,
  medium: 1.25,
  large: 1.65,
};

const TIER_SPIN: Record<BattleCubeWire["tier"], number> = {
  small: 1.55,
  medium: 1.85,
  large: 2.15,
};

export type BattleCubeVisual = {
  id: number;
  sats: number;
  tier: BattleCubeWire["tier"];
  /** Layout XZ from the server (authoritative for pickup — mesh may bob in Y). */
  x: number;
  z: number;
  /** Root group (box + optional glow shell). */
  mesh: THREE.Object3D;
  taken: boolean;
};

let sharedFaceMap: THREE.CanvasTexture | null = null;

/** Rainbow / ? face — one shared texture for every item box. */
function itemBoxFaceMap(): THREE.CanvasTexture {
  if (sharedFaceMap) return sharedFaceMap;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Diagonal rainbow bands (Mario Kart vibe, SATS RACER palette)
  const bands = ["#ff3b2e", "#ff9a3c", "#ffe566", "#3dff9a", "#3dbbff", "#c45cff", "#ff3b2e"];
  const bandH = size / (bands.length - 1);
  for (let i = 0; i < bands.length - 1; i++) {
    ctx.fillStyle = bands[i]!;
    ctx.beginPath();
    ctx.moveTo(0, i * bandH - 8);
    ctx.lineTo(size, i * bandH - 28);
    ctx.lineTo(size, (i + 1) * bandH - 28);
    ctx.lineTo(0, (i + 1) * bandH - 8);
    ctx.closePath();
    ctx.fill();
  }

  // Soft vignette so the ? pops
  const vignette = ctx.createRadialGradient(size / 2, size / 2, 18, size / 2, size / 2, 70);
  vignette.addColorStop(0, "rgba(255,255,255,0.22)");
  vignette.addColorStop(0.55, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  // White disc + bold ?
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 34, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(12,14,20,0.85)";
  ctx.stroke();

  ctx.fillStyle = "#141820";
  ctx.font = "bold 58px Orbitron, Rajdhani, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", size / 2, size / 2 + 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  sharedFaceMap = tex;
  return tex;
}

function makeItemBoxMaterial(): THREE.MeshStandardMaterial {
  const map = itemBoxFaceMap();
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    emissive: 0xffc857,
    emissiveMap: map,
    emissiveIntensity: 0.55,
    roughness: 0.28,
    metalness: 0.22,
  });
}

/** Build spinning ? item boxes from the server layout. */
export function spawnBattleCubeMeshes(
  scene: THREE.Scene,
  cubes: BattleCubeWire[],
): BattleCubeVisual[] {
  const out: BattleCubeVisual[] = [];
  for (const c of cubes) {
    const size = TIER_SIZE[c.tier] ?? 1;
    const root = new THREE.Group();
    root.position.set(c.x, size * 0.55 + 0.4, c.z);
    root.userData.battleCubeId = c.id;
    root.userData.battleTier = c.tier;

    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = makeItemBoxMaterial();
    const box = new THREE.Mesh(geo, mat);
    box.castShadow = false;
    box.receiveShadow = false;
    root.add(box);

    // Thin bright shell so boxes read at speed (racer neon edge)
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(size * 1.08, size * 1.08, size * 1.08),
      new THREE.MeshBasicMaterial({
        color: 0xffe566,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    root.add(shell);

    scene.add(root);
    out.push({ id: c.id, sats: c.sats, tier: c.tier, x: c.x, z: c.z, mesh: root, taken: false });
  }
  return out;
}

/**
 * Squared distance from point to segment AB in XZ (for tunnel-proof sweeps).
 * @returns squared distance
 */
export function distSqPointToSegmentXZ(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLen2 = abx * abx + abz * abz;
  if (abLen2 < 1e-8) return apx * apx + apz * apz;
  let t = (apx * abx + apz * abz) / abLen2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = ax + abx * t - px;
  const cz = az + abz * t - pz;
  return cx * cx + cz * cz;
}

export function disposeBattleCubes(scene: THREE.Scene, cubes: BattleCubeVisual[]) {
  for (const c of cubes) {
    scene.remove(c.mesh);
    c.mesh.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      // Face map is shared — only dispose non-map materials / unique mats.
      if (Array.isArray(mat)) {
        for (const m of mat) disposeCubeMat(m);
      } else if (mat) {
        disposeCubeMat(mat);
      }
    });
  }
  cubes.length = 0;
}

function disposeCubeMat(mat: THREE.Material) {
  const std = mat as THREE.MeshStandardMaterial;
  // Keep the shared face texture alive for the next battle.
  if (std.map && std.map === sharedFaceMap) {
    std.map = null;
    std.emissiveMap = null;
  }
  mat.dispose();
}

/** Fast spin + bob — item boxes should scream “pick me up”. */
export function animateBattleCubes(cubes: BattleCubeVisual[], nowSec: number) {
  for (const c of cubes) {
    if (c.taken) continue;
    const size = TIER_SIZE[c.tier] ?? 1;
    const spin = TIER_SPIN[c.tier] ?? 1.7;
    c.mesh.rotation.y = nowSec * spin + c.id * 0.4;
    c.mesh.rotation.x = Math.sin(nowSec * 2.1 + c.id) * 0.22;
    c.mesh.rotation.z = Math.cos(nowSec * 1.6 + c.id * 0.5) * 0.12;
    c.mesh.position.y = size * 0.55 + 0.4 + Math.sin(nowSec * 2.8 + c.id * 0.7) * 0.28;
  }
}
