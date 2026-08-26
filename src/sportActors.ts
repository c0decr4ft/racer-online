import * as THREE from "three";
import type { SportId } from "./sports";

function mat(
  color: number,
  opts: { metal?: number; rough?: number; emit?: number } = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metal ?? 0.25,
    roughness: opts.rough ?? 0.55,
    emissive: color,
    emissiveIntensity: opts.emit ?? 0.06,
  });
}

function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = false;
  parent.add(m);
  return m;
}

function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  return add(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz);
}

function cyl(
  parent: THREE.Object3D,
  rTop: number,
  rBot: number,
  h: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  seg = 10,
) {
  return add(parent, new THREE.CylinderGeometry(rTop, rBot, h, seg), material, x, y, z, rx, ry, rz);
}

function person(
  group: THREE.Group,
  primary: number,
  accent: number,
  opts: { helmet?: boolean; boots?: number } = {},
) {
  const suit = mat(primary, { metal: 0.12, rough: 0.7, emit: 0.04 });
  const trim = mat(accent, { metal: 0.2, rough: 0.45 });
  const skin = mat(0xc68642, { metal: 0, rough: 0.85, emit: 0 });
  const dark = mat(0x1a1d22, { metal: 0.3, rough: 0.5, emit: 0 });
  box(group, 0.34, 0.48, 0.22, suit, 0, 1.12, 0);
  box(group, 0.36, 0.08, 0.24, trim, 0, 1.28, 0);
  cyl(group, 0.08, 0.09, 0.42, suit, -0.11, 0.68, 0);
  cyl(group, 0.08, 0.09, 0.42, suit, 0.11, 0.68, 0);
  box(group, 0.12, 0.08, 0.22, mat(opts.boots ?? 0x22262c, { metal: 0.1, rough: 0.8, emit: 0 }), -0.11, 0.42, 0.04);
  box(group, 0.12, 0.08, 0.22, mat(opts.boots ?? 0x22262c, { metal: 0.1, rough: 0.8, emit: 0 }), 0.11, 0.42, 0.04);
  cyl(group, 0.055, 0.06, 0.38, suit, -0.24, 1.12, 0, 0, 0, 0.45);
  cyl(group, 0.055, 0.06, 0.38, suit, 0.24, 1.12, 0, 0, 0, -0.45);
  if (opts.helmet !== false) {
    cyl(group, 0.14, 0.15, 0.18, trim, 0, 1.5, 0.02, 0.2, 0, 0, 12);
    box(group, 0.16, 0.06, 0.04, dark, 0, 1.48, 0.12);
  } else {
    cyl(group, 0.12, 0.13, 0.16, skin, 0, 1.5, 0, 0, 0, 0, 10);
  }
}

function skier(primary: number, accent: number) {
  const g = new THREE.Group();
  person(g, primary, accent, { boots: 0x111318 });
  const ski = mat(accent, { metal: 0.35, rough: 0.3, emit: 0.08 });
  box(g, 0.1, 0.04, 1.55, ski, -0.12, 0.36, 0.12);
  box(g, 0.1, 0.04, 1.55, ski, 0.12, 0.36, 0.12);
  const pole = mat(0xc8d0dc, { metal: 0.7, rough: 0.25, emit: 0 });
  cyl(g, 0.015, 0.015, 1.05, pole, -0.38, 0.95, 0.1, 0.55, 0, 0.15, 6);
  cyl(g, 0.015, 0.015, 1.05, pole, 0.38, 0.95, 0.1, 0.55, 0, -0.15, 6);
  return g;
}

function dirtBike(primary: number, accent: number, motocross: boolean) {
  const g = new THREE.Group();
  const body = mat(primary, { metal: 0.28, rough: 0.4, emit: 0.08 });
  const trim = mat(accent, { metal: 0.35, rough: 0.35 });
  const rubber = mat(0x14161a, { metal: 0.05, rough: 0.9, emit: 0 });
  const metal = mat(0x8a93a3, { metal: 0.75, rough: 0.28, emit: 0 });
  const wheelR = motocross ? 0.32 : 0.28;
  cyl(g, wheelR, wheelR, 0.12, rubber, 0, 0.32, 0.62, Math.PI / 2, 0, 0, 12);
  cyl(g, wheelR, wheelR, 0.12, rubber, 0, 0.32, -0.58, Math.PI / 2, 0, 0, 12);
  cyl(g, 0.1, 0.1, 0.05, metal, 0, 0.32, 0.62, Math.PI / 2, 0, 0, 8);
  cyl(g, 0.1, 0.1, 0.05, metal, 0, 0.32, -0.58, Math.PI / 2, 0, 0, 8);
  box(g, 0.22, 0.16, 0.85, body, 0, 0.52, 0.02);
  box(g, 0.18, 0.1, 0.4, trim, 0, 0.64, -0.05);
  box(g, 0.28, 0.08, 0.22, body, 0, 0.72, 0.28);
  box(g, 0.34, 0.04, 0.18, trim, 0, 0.78, 0.42);
  box(g, 0.06, 0.28, 0.06, metal, 0, 0.7, 0.55, 0.45);
  const rider = new THREE.Group();
  rider.position.set(0, 0.42, -0.05);
  rider.rotation.x = 0.35;
  person(rider, primary, accent);
  rider.scale.setScalar(0.72);
  g.add(rider);
  return g;
}

function skater(primary: number, accent: number) {
  const g = new THREE.Group();
  person(g, primary, accent, { helmet: false, boots: 0x111318 });
  const deck = mat(primary, { metal: 0.08, rough: 0.65, emit: 0.05 });
  const grip = mat(0x1a1d22, { metal: 0.05, rough: 0.9, emit: 0 });
  const truck = mat(accent, { metal: 0.7, rough: 0.3, emit: 0.06 });
  box(g, 0.22, 0.03, 0.78, deck, 0, 0.34, 0.02);
  box(g, 0.2, 0.012, 0.74, grip, 0, 0.358, 0.02);
  box(g, 0.2, 0.04, 0.06, truck, 0, 0.3, 0.24);
  box(g, 0.2, 0.04, 0.06, truck, 0, 0.3, -0.2);
  const wheel = mat(0xf7fafc, { metal: 0.1, rough: 0.5, emit: 0 });
  cyl(g, 0.035, 0.035, 0.05, wheel, -0.09, 0.27, 0.24, Math.PI / 2, 0, 0, 8);
  cyl(g, 0.035, 0.035, 0.05, wheel, 0.09, 0.27, 0.24, Math.PI / 2, 0, 0, 8);
  cyl(g, 0.035, 0.035, 0.05, wheel, -0.09, 0.27, -0.2, Math.PI / 2, 0, 0, 8);
  cyl(g, 0.035, 0.035, 0.05, wheel, 0.09, 0.27, -0.2, Math.PI / 2, 0, 0, 8);
  return g;
}

export function createSportActor(sport: SportId, primary: number, accent: number): THREE.Group {
  const g =
    sport === "skiing"
      ? skier(primary, accent)
      : sport === "motocross"
        ? dirtBike(primary, accent, true)
        : sport === "biking"
          ? dirtBike(primary, accent, false)
          : skater(primary, accent);
  g.userData.kind = sport;
  g.userData.sport = sport;
  return g;
}

export function disposeSportGroup(group: THREE.Object3D) {
  group.removeFromParent();
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry) geos.add(mesh.geometry);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of list) if (m) mats.add(m);
  });
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
}
