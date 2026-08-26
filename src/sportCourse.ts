import * as THREE from "three";
import type { SportId } from "./sports";
import { disposeSportGroup } from "./sportActors";

export type SportCourse = {
  sport: SportId;
  group: THREE.Group;
  length: number;
  halfWidth: number;
  startY: number;
  drop: number;
  fog: number;
  sky: number;
  heightAt: (x: number, z: number) => number;
  /** Extra launch vy when riding a kicker. */
  kickAt: (z: number) => number;
  /** Rail/grind band: 0 = none, 1 = on a rail. */
  grindAt: (x: number, z: number) => number;
  dispose: () => void;
};

const LENGTH = 380;

function mat(
  color: number,
  opts: { metal?: number; rough?: number; emit?: number } = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metal ?? 0.08,
    roughness: opts.rough ?? 0.86,
    emissive: color,
    emissiveIntensity: opts.emit ?? 0.03,
  });
}

function addMesh(
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
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function ribbonHeight(sport: SportId, z: number): number {
  const t = THREE.MathUtils.clamp(z / LENGTH, 0, 1);
  const drop = sport === "skate" ? 28 : sport === "skiing" ? 92 : 54;
  let y = -t * drop;
  if (sport === "skiing") {
    y += Math.sin(z * 0.035) * 1.4 + Math.sin(z * 0.09) * 0.45;
  } else if (sport === "motocross" || sport === "biking") {
    const whoop = Math.sin(z * 0.22) * (sport === "motocross" ? 1.15 : 0.85);
    const table = tableKick(z);
    y += whoop + table;
  } else {
    // Skate park bowls + hips
    y += Math.sin(z * 0.048) * 3.2 + Math.abs(Math.sin(z * 0.11)) * 1.1;
  }
  return y;
}

function tableKick(z: number): number {
  let extra = 0;
  for (const kz of [55, 120, 185, 250, 310]) {
    const d = z - kz;
    if (d > 0 && d < 18) extra += Math.sin((d / 18) * Math.PI) * 4.2;
    else if (d >= 18 && d < 28) extra += Math.sin(((d - 18) / 10) * Math.PI) * 1.1;
  }
  return extra;
}

function kickBoost(sport: SportId, z: number): number {
  if (sport === "skiing") {
    for (const kz of [90, 170, 260]) {
      const d = z - kz;
      if (d > 0 && d < 10) return 6.5 * Math.sin((d / 10) * Math.PI);
    }
    return 0;
  }
  if (sport === "skate") {
    for (const kz of [40, 110, 200, 280]) {
      const d = z - kz;
      if (d > 2 && d < 12) return 7.2 * Math.sin(((d - 2) / 10) * Math.PI);
    }
    return 0;
  }
  for (const kz of [55, 120, 185, 250, 310]) {
    const d = z - kz;
    if (d > 0 && d < 14) return 9.5 * Math.sin((d / 14) * Math.PI);
  }
  return 0;
}

function pine(parent: THREE.Group, x: number, y: number, z: number, scale: number) {
  const trunk = mat(0x4a3020, { rough: 0.95, emit: 0 });
  const leaf = mat(0x1d5c3a, { rough: 0.85, emit: 0.02 });
  addMesh(parent, new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 1.1 * scale, 6), trunk, x, y + 0.55 * scale, z);
  addMesh(parent, new THREE.ConeGeometry(1.15 * scale, 2.4 * scale, 7), leaf, x, y + 2.0 * scale, z);
  addMesh(parent, new THREE.ConeGeometry(0.85 * scale, 1.7 * scale, 7), leaf, x, y + 3.15 * scale, z);
}

function banner(parent: THREE.Group, z: number, y: number, color: number, halfW: number) {
  const pole = mat(0xf7fafc, { metal: 0.2, rough: 0.4, emit: 0.04 });
  const cloth = mat(color, { metal: 0.1, rough: 0.55, emit: 0.12 });
  addMesh(parent, new THREE.CylinderGeometry(0.08, 0.1, 6.2, 6), pole, -halfW - 0.4, y + 3.1, z);
  addMesh(parent, new THREE.CylinderGeometry(0.08, 0.1, 6.2, 6), pole, halfW + 0.4, y + 3.1, z);
  addMesh(parent, new THREE.BoxGeometry(halfW * 2 + 1.2, 0.9, 0.08), cloth, 0, y + 5.6, z);
}

export function createSportCourse(sport: SportId): SportCourse {
  const group = new THREE.Group();
  group.name = `sport-${sport}`;
  const halfWidth = sport === "skate" ? 11 : sport === "skiing" ? 14 : 9.5;
  const segs = 90;
  const widthSegs = 8;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const z = (i / segs) * LENGTH;
    const y0 = ribbonHeight(sport, z);
    for (let j = 0; j <= widthSegs; j++) {
      const x = -halfWidth + (j / widthSegs) * halfWidth * 2;
      const dish = sport === "skate" ? (x * x) / (halfWidth * halfWidth) * 1.6 : 0;
      positions.push(x, y0 + dish, z);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < widthSegs; j++) {
      const a = i * (widthSegs + 1) + j;
      const b = a + widthSegs + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const groundColor =
    sport === "skiing" ? 0xeef6ff : sport === "skate" ? 0x8a9098 : sport === "motocross" ? 0x6a4a28 : 0x4a6a38;
  const ground = new THREE.Mesh(geo, mat(groundColor, { rough: sport === "skate" ? 0.55 : 0.95, emit: 0.02 }));
  ground.receiveShadow = true;
  group.add(ground);

  const sideColor =
    sport === "skiing" ? 0xd8e8f8 : sport === "skate" ? 0x5c6370 : sport === "motocross" ? 0x3d2a16 : 0x2d4a24;
  const berm = mat(sideColor, { rough: 0.92, emit: 0 });
  for (const side of [-1, 1] as const) {
    addMesh(
      group,
      new THREE.BoxGeometry(2.4, 1.6, LENGTH),
      berm,
      side * (halfWidth + 1.1),
      ribbonHeight(sport, LENGTH * 0.5) + 0.2,
      LENGTH * 0.5,
    );
  }

  // Distant ground plane so the drop doesn't look like a floating ribbon
  const pad = mat(
    sport === "skiing" ? 0xcfe4f7 : sport === "skate" ? 0x3a4048 : sport === "motocross" ? 0x4a331c : 0x2a4a28,
    { rough: 0.98, emit: 0 },
  );
  addMesh(group, new THREE.PlaneGeometry(420, 520), pad, 0, ribbonHeight(sport, LENGTH) - 8, LENGTH * 0.45, -Math.PI / 2);

  if (sport === "skiing") {
    for (let i = 0; i < 48; i++) {
      const z = 12 + (i / 47) * (LENGTH - 24);
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (halfWidth * 0.55 + (i % 5) * 0.7);
      pine(group, x, ribbonHeight(sport, z), z, 0.85 + (i % 4) * 0.18);
    }
    const gate = mat(0xff3b2e, { emit: 0.16 });
    const gateB = mat(0x2a66f0, { emit: 0.16 });
    for (let i = 0; i < 14; i++) {
      const z = 30 + i * 24;
      const sway = Math.sin(i * 1.3) * (halfWidth * 0.35);
      const m = i % 2 === 0 ? gate : gateB;
      addMesh(group, new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), m, sway, ribbonHeight(sport, z) + 0.8, z);
    }
    banner(group, LENGTH - 4, ribbonHeight(sport, LENGTH - 4), 0xff3b2e, halfWidth);
  } else if (sport === "motocross" || sport === "biking") {
    const hay = mat(0xc9a227, { rough: 0.9, emit: 0.04 });
    const wood = mat(0x6a4a28, { rough: 0.85, emit: 0 });
    for (const kz of [55, 120, 185, 250, 310]) {
      const y = ribbonHeight(sport, kz) + tableKick(kz);
      addMesh(group, new THREE.BoxGeometry(halfWidth * 1.6, 0.35, 6), wood, 0, y + 0.1, kz + 3);
    }
    for (let i = 0; i < 18; i++) {
      const z = 20 + i * 20;
      addMesh(
        group,
        new THREE.BoxGeometry(1.1, 0.7, 0.7),
        hay,
        (i % 2 === 0 ? -1 : 1) * (halfWidth - 0.6),
        ribbonHeight(sport, z) + 0.4,
        z,
      );
    }
    banner(group, LENGTH - 4, ribbonHeight(sport, LENGTH - 4), sport === "motocross" ? 0xff8a1a : 0x3dff8a, halfWidth);
  } else {
    const conc = mat(0x9aa0a8, { metal: 0.15, rough: 0.5, emit: 0.02 });
    const paint = mat(0xff4ad8, { metal: 0.1, rough: 0.4, emit: 0.14 });
    const rail = mat(0xc8d0dc, { metal: 0.8, rough: 0.25, emit: 0.05 });
    for (const kz of [40, 110, 200, 280]) {
      addMesh(
        group,
        new THREE.BoxGeometry(halfWidth * 1.5, 2.4, 0.5),
        conc,
        0,
        ribbonHeight(sport, kz) + 1.1,
        kz,
        0.45,
      );
    }
    for (const rz of [80, 160, 240]) {
      addMesh(group, new THREE.BoxGeometry(0.12, 0.12, 14), rail, 3.2, ribbonHeight(sport, rz) + 0.55, rz);
    }
    addMesh(group, new THREE.BoxGeometry(6, 0.04, LENGTH), paint, 0, 0.02, LENGTH * 0.5);
    banner(group, LENGTH - 4, ribbonHeight(sport, LENGTH - 4), 0xff4ad8, halfWidth);
  }

  const sky =
    sport === "skiing" ? 0x7ec8ff : sport === "motocross" ? 0xffb068 : sport === "biking" ? 0x6adf9a : 0xf48cff;
  const fog =
    sport === "skiing" ? 0xb9dcff : sport === "motocross" ? 0xe8a060 : sport === "biking" ? 0x7edc98 : 0xe090d0;

  const heightAt = (x: number, z: number) => {
    const zz = THREE.MathUtils.clamp(z, 0, LENGTH);
    const dish = sport === "skate" ? (x * x) / (halfWidth * halfWidth) * 1.6 : 0;
    return ribbonHeight(sport, zz) + dish;
  };

  const grindAt = (x: number, z: number) => {
    if (sport !== "skate") return 0;
    for (const rz of [80, 160, 240]) {
      if (Math.abs(z - rz) < 7 && Math.abs(x - 3.2) < 0.55) return 1;
    }
    return 0;
  };

  return {
    sport,
    group,
    length: LENGTH,
    halfWidth,
    startY: 0,
    drop: sport === "skate" ? 28 : sport === "skiing" ? 92 : 54,
    fog,
    sky,
    heightAt,
    kickAt: (z) => kickBoost(sport, z),
    grindAt,
    dispose: () => disposeSportGroup(group),
  };
}
