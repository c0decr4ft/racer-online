import * as THREE from "three";

function mat(
  color: number,
  opts: { metal?: number; rough?: number; emissive?: number; emit?: number } = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metal ?? 0.7,
    roughness: opts.rough ?? 0.35,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emit ?? 0,
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
  m.receiveShadow = true;
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

function wheel(radius: number, width: number) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 24),
    mat(0x0c0c0e, { metal: 0.08, rough: 0.92 }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const sidewall = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.72, radius * 0.08, 8, 24),
    mat(0x1a1a1e, { metal: 0.1, rough: 0.85 }),
  );
  sidewall.rotation.y = Math.PI / 2;
  g.add(sidewall);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width * 0.42, 20),
    mat(0xd0d8e2, { metal: 0.98, rough: 0.18 }),
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, width * 0.55, 12),
    mat(0xf0f4f8, { metal: 1, rough: 0.12 }),
  );
  hub.rotation.z = Math.PI / 2;
  g.add(hub);

  const spokeMat = mat(0xc5ced8, { metal: 0.95, rough: 0.22 });
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.06, radius * 0.92, width * 0.08), spokeMat);
    spoke.rotation.z = (i / 8) * Math.PI;
    g.add(spoke);
  }
  return g;
}

/** GT coupe matching the wireframe reference silhouette. */
export function createCar(bodyColor = 0xd0d7e0, raceNumber = 7): THREE.Group {
  const car = new THREE.Group();
  const body = mat(bodyColor, { metal: 0.86, rough: 0.26 });
  const dark = mat(0x12161c, { metal: 0.55, rough: 0.42 });
  const carbon = mat(0x1c222b, { metal: 0.4, rough: 0.55 });
  const glass = mat(0x0e1824, { metal: 0.15, rough: 0.08 });
  const lite = mat(0xf7fafc, { metal: 0.15, rough: 0.25, emissive: 0xf7fafc, emit: 0.85 });
  const tail = mat(0xff2418, { metal: 0.25, rough: 0.35, emissive: 0xff2418, emit: 0.65 });
  const chrome = mat(0xb0b8c2, { metal: 1, rough: 0.15 });
  const accent = mat(0xff3b2e, { metal: 0.35, rough: 0.4, emissive: 0xff3b2e, emit: 0.2 });

  // Lower chassis with slight taper via scaled boxes
  box(car, 1.92, 0.36, 4.35, body, 0, 0.46, 0.02);
  box(car, 2.02, 0.12, 4.15, carbon, 0, 0.24, 0.02);
  box(car, 1.75, 0.22, 3.9, dark, 0, 0.38, 0.02);

  // Nose / front fascia
  const nose = add(car, new THREE.BoxGeometry(1.88, 0.28, 0.55), body, 0, 0.5, 2.05);
  nose.scale.set(1, 1, 1);
  box(car, 2.08, 0.08, 0.5, carbon, 0, 0.18, 2.18); // splitter
  box(car, 1.7, 0.16, 0.22, dark, 0, 0.34, 2.32);
  // Headlight clusters
  box(car, 0.42, 0.1, 0.08, lite, -0.68, 0.54, 2.34);
  box(car, 0.42, 0.1, 0.08, lite, 0.68, 0.54, 2.34);
  box(car, 0.12, 0.06, 0.05, accent, -0.9, 0.42, 2.3);
  box(car, 0.12, 0.06, 0.05, accent, 0.9, 0.42, 2.3);

  // Hood with power bulge + cooling vents
  box(car, 1.82, 0.1, 1.45, body, 0, 0.68, 1.28);
  box(car, 0.55, 0.06, 0.9, body, 0, 0.74, 1.2);
  box(car, 0.28, 0.035, 0.55, dark, -0.48, 0.75, 1.15);
  box(car, 0.28, 0.035, 0.55, dark, 0.48, 0.75, 1.15);
  for (let i = 0; i < 4; i++) {
    box(car, 0.04, 0.02, 0.5, carbon, -0.48 + i * 0.08, 0.77, 1.15);
    box(car, 0.04, 0.02, 0.5, carbon, 0.24 + i * 0.08, 0.77, 1.15);
  }

  // Fastback cabin — stepped roof for silhouette
  box(car, 1.58, 0.38, 1.55, body, 0, 0.98, -0.05);
  box(car, 1.42, 0.18, 1.35, body, 0, 1.22, -0.2);
  box(car, 1.35, 0.08, 1.2, dark, 0, 1.34, -0.25);

  // Glass
  box(car, 1.38, 0.045, 0.85, glass, 0, 1.02, 0.72, -0.48);
  box(car, 1.32, 0.045, 0.78, glass, 0, 1.02, -0.95, 0.38);
  box(car, 0.045, 0.32, 1.05, glass, -0.8, 0.98, -0.08);
  box(car, 0.045, 0.32, 1.05, glass, 0.8, 0.98, -0.08);
  // Rear window braces
  for (const x of [-0.38, 0, 0.38]) {
    box(car, 0.03, 0.03, 0.72, dark, x, 1.04, -0.95, 0.38);
  }

  // Flared arches
  for (const s of [-1, 1] as const) {
    box(car, 0.32, 0.44, 0.95, body, s * 1.02, 0.52, 1.32);
    box(car, 0.32, 0.44, 1.05, body, s * 1.02, 0.52, -1.22);
    box(car, 0.12, 0.2, 0.7, carbon, s * 1.12, 0.35, 1.32);
    box(car, 0.12, 0.2, 0.8, carbon, s * 1.12, 0.35, -1.22);
  }

  // Side skirts + side-exit exhausts (signature detail)
  box(car, 2.12, 0.09, 2.3, carbon, 0, 0.2, 0.05);
  box(car, 0.18, 0.12, 0.38, chrome, 1.08, 0.3, -0.48);
  box(car, 0.18, 0.12, 0.38, chrome, -1.08, 0.3, -0.48);
  box(car, 0.1, 0.08, 0.18, dark, 1.08, 0.3, -0.72);
  box(car, 0.1, 0.08, 0.18, dark, -1.08, 0.3, -0.72);

  // Ducktail spoiler + Gurney flap
  box(car, 1.95, 0.07, 0.55, body, 0, 0.88, -2.02, -0.12);
  box(car, 1.95, 0.14, 0.045, carbon, 0, 1.0, -2.26);
  box(car, 0.07, 0.3, 0.35, dark, -0.85, 0.76, -1.92);
  box(car, 0.07, 0.3, 0.35, dark, 0.85, 0.76, -1.92);

  // Diffuser fins
  box(car, 1.78, 0.07, 0.52, carbon, 0, 0.17, -2.18);
  for (let i = -2; i <= 2; i++) {
    box(car, 0.035, 0.22, 0.45, dark, i * 0.3, 0.24, -2.22);
  }

  // Tail lights
  box(car, 0.55, 0.09, 0.05, tail, -0.55, 0.6, -2.26);
  box(car, 0.55, 0.09, 0.05, tail, 0.55, 0.6, -2.26);
  box(car, 0.2, 0.06, 0.04, lite, 0, 0.6, -2.26);

  // Center racing stripe + number plate
  box(car, 0.08, 0.28, 3.7, accent, 0, 0.58, 0.05);
  const numMat = mat(0xffffff, { metal: 0.1, rough: 0.6 });
  box(car, 0.55, 0.35, 0.02, numMat, 0, 0.72, -1.55);
  // Simple number bars (readable at distance)
  const n = Math.max(1, Math.min(99, raceNumber));
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens > 0) box(car, 0.08, 0.22, 0.03, dark, -0.12, 0.72, -1.54);
  for (let i = 0; i < Math.min(ones, 5); i++) {
    box(car, 0.06, 0.04, 0.03, dark, 0.1, 0.62 + i * 0.05, -1.54);
  }

  // Shark-fin + roof sensor + whip antenna
  box(car, 0.05, 0.28, 0.34, dark, 0, 1.42, -0.4, 0.2);
  box(car, 0.22, 0.07, 0.28, dark, 0, 1.32, 0.12);
  box(car, 0.02, 0.38, 0.02, dark, 0.14, 1.45, -0.55);

  // Mirrors
  box(car, 0.18, 0.08, 0.12, dark, -0.95, 0.95, 0.55);
  box(car, 0.18, 0.08, 0.12, dark, 0.95, 0.95, 0.55);

  // Wheels
  const r = 0.37;
  const steers: THREE.Group[] = [];
  const spinners: THREE.Group[] = [];
  for (const [x, y, z] of [
    [-0.92, r, 1.38],
    [0.92, r, 1.38],
    [-0.92, r, -1.3],
    [0.92, r, -1.3],
  ] as const) {
    const steer = new THREE.Group();
    steer.position.set(x, y, z);
    const spin = wheel(r, 0.32);
    steer.add(spin);
    car.add(steer);
    steers.push(steer);
    spinners.push(spin);
  }
  car.userData.steers = steers;
  car.userData.spinners = spinners;
  car.userData.wheelRadius = r;
  car.userData.bodyMaterial = body;
  car.userData.bodyColor = bodyColor;
  return car;
}

export const CAR_PALETTE = {
  player: 0xe4eaf2,
  rivals: [0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff],
};
