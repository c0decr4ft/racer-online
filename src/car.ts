import * as THREE from "three";
import type { VehicleKind } from "./garage";

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

/** Body paint — low metal so garage hex reads true under ACES + sun. */
function paintMat(color: number, opts: { metal?: number; rough?: number; emit?: number } = {}) {
  return mat(color, {
    metal: opts.metal ?? 0.22,
    rough: opts.rough ?? 0.45,
    emissive: color,
    emit: opts.emit ?? 0.1,
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
  segments = 16,
) {
  return add(parent, new THREE.CylinderGeometry(rTop, rBot, h, segments), material, x, y, z, rx, ry, rz);
}

function wheel(radius: number, width: number, spokeCount = 8) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 28),
    mat(0x0c0c0e, { metal: 0.08, rough: 0.92 }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const sidewall = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.72, radius * 0.075, 8, 28),
    mat(0x1a1a1e, { metal: 0.1, rough: 0.85 }),
  );
  sidewall.rotation.y = Math.PI / 2;
  g.add(sidewall);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width * 0.42, 22),
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
  for (let i = 0; i < spokeCount; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.05, radius * 0.92, width * 0.07), spokeMat);
    spoke.rotation.z = (i / spokeCount) * Math.PI;
    g.add(spoke);
  }
  return g;
}

function attachWheels(
  root: THREE.Group,
  positions: ReadonlyArray<readonly [number, number, number]>,
  radius: number,
  width: number,
  spokeCount = 8,
) {
  const steers: THREE.Group[] = [];
  const spinners: THREE.Group[] = [];
  for (const [x, y, z] of positions) {
    const steer = new THREE.Group();
    steer.position.set(x, y, z);
    const spin = wheel(radius, width, spokeCount);
    steer.add(spin);
    root.add(steer);
    steers.push(steer);
    spinners.push(spin);
  }
  root.userData.steers = steers;
  root.userData.spinners = spinners;
  root.userData.wheelRadius = radius;
}

function paintable(root: THREE.Group, body: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial) {
  root.userData.bodyMaterial = body;
  root.userData.accentMaterial = accent;
  root.userData.bodyColor = (body.color as THREE.Color).getHex();
  root.userData.accentColor = (accent.color as THREE.Color).getHex();
}

/** Spot beams parented to the vehicle so they steer with the nose. */
function attachHeadBeams(
  root: THREE.Group,
  mounts: { x: number; y: number; z: number }[],
) {
  const beams: THREE.SpotLight[] = [];
  for (const m of mounts) {
    const light = new THREE.SpotLight(0xfff2c8, 0, 55, 0.52, 0.42, 1.05);
    light.position.set(m.x, m.y, m.z);
    light.castShadow = false;
    const target = new THREE.Object3D();
    // Aim down onto the asphalt a short way ahead of the nose
    target.position.set(m.x * 0.15, -0.35, m.z + 10);
    root.add(target);
    light.target = target;
    root.add(light);
    beams.push(light);
  }
  root.userData.headBeams = beams;
}

/** Toggle lamp glow + beams (night driving). */
export function setVehicleHeadlights(root: THREE.Group | undefined, on: boolean) {
  if (!root) return;
  const beams = root.userData.headBeams as THREE.SpotLight[] | undefined;
  if (beams) {
    for (const b of beams) b.intensity = on ? 6.8 : 0;
  }
  const heads = root.userData.headLightMaterials as THREE.MeshStandardMaterial[] | undefined;
  const headIdle = root.userData.kind === "bike" ? 0.85 : 0.9;
  if (heads) {
    for (const m of heads) {
      m.emissiveIntensity = on ? 5.4 : headIdle;
      m.emissive.setHex(on ? 0xffefb0 : 0xf7fafc);
      m.color.setHex(on ? 0xfff6d8 : 0xf7fafc);
    }
  }
  const tails = root.userData.tailLightMaterials as THREE.MeshStandardMaterial[] | undefined;
  const tailIdle = root.userData.kind === "bike" ? 0.65 : 0.7;
  if (tails) {
    for (const m of tails) m.emissiveIntensity = on ? 2.25 : tailIdle;
  }
}

/** Sleeker GT coupe — lower stance, clearer cabin glass, richer detailing. */
export function createCar(
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
): THREE.Group {
  const car = new THREE.Group();
  const body = paintMat(bodyColor, { metal: 0.28, rough: 0.38, emit: 0.11 });
  const dark = mat(0x12161c, { metal: 0.55, rough: 0.42 });
  const carbon = mat(0x1c222b, { metal: 0.42, rough: 0.52 });
  const glass = mat(0x0a1520, { metal: 0.2, rough: 0.05 });
  const head = mat(0xf7fafc, { metal: 0.15, rough: 0.25, emissive: 0xf7fafc, emit: 0.9 });
  const lite = mat(0xf7fafc, { metal: 0.15, rough: 0.25, emissive: 0xf7fafc, emit: 0.55 });
  const tail = mat(0xff2418, { metal: 0.25, rough: 0.35, emissive: 0xff2418, emit: 0.7 });
  const chrome = mat(0xb0b8c2, { metal: 1, rough: 0.14 });
  const accent = paintMat(accentColor, { metal: 0.32, rough: 0.4, emit: 0.16 });

  // Chassis / rocker
  box(car, 1.95, 0.34, 4.4, body, 0, 0.44, 0.02);
  box(car, 2.08, 0.1, 4.2, carbon, 0, 0.22, 0.02);
  box(car, 1.72, 0.2, 3.95, dark, 0, 0.36, 0.02);

  // Nose + splitter
  box(car, 1.9, 0.26, 0.58, body, 0, 0.48, 2.08);
  box(car, 2.12, 0.07, 0.52, carbon, 0, 0.17, 2.2);
  box(car, 1.55, 0.12, 0.18, dark, 0, 0.32, 2.34);
  // Headlights (angled pods)
  box(car, 0.48, 0.1, 0.08, head, -0.7, 0.52, 2.36, 0, 0.08);
  box(car, 0.48, 0.1, 0.08, head, 0.7, 0.52, 2.36, 0, -0.08);
  box(car, 0.1, 0.05, 0.05, accent, -0.96, 0.4, 2.28);
  box(car, 0.1, 0.05, 0.05, accent, 0.96, 0.4, 2.28);

  // Hood + vents
  box(car, 1.84, 0.09, 1.5, body, 0, 0.66, 1.28);
  box(car, 0.52, 0.055, 0.95, body, 0, 0.72, 1.18);
  for (const sx of [-1, 1] as const) {
    box(car, 0.32, 0.03, 0.58, dark, sx * 0.48, 0.74, 1.12);
    for (let i = 0; i < 3; i++) {
      box(car, 0.04, 0.015, 0.48, carbon, sx * 0.48 + (i - 1) * 0.07, 0.76, 1.12);
    }
  }

  // Cabin fastback
  box(car, 1.55, 0.36, 1.52, body, 0, 0.96, -0.08);
  box(car, 1.38, 0.16, 1.28, body, 0, 1.2, -0.22);
  box(car, 1.28, 0.06, 1.1, dark, 0, 1.32, -0.28);
  // Glass
  box(car, 1.36, 0.04, 0.88, glass, 0, 1.0, 0.7, -0.5);
  box(car, 1.28, 0.04, 0.82, glass, 0, 1.0, -0.98, 0.4);
  box(car, 0.04, 0.3, 1.08, glass, -0.78, 0.96, -0.1);
  box(car, 0.04, 0.3, 1.08, glass, 0.78, 0.96, -0.1);
  for (const x of [-0.36, 0, 0.36]) {
    box(car, 0.025, 0.025, 0.7, dark, x, 1.02, -0.98, 0.4);
  }

  // Flared arches
  for (const s of [-1, 1] as const) {
    box(car, 0.34, 0.42, 0.98, body, s * 1.04, 0.5, 1.34);
    box(car, 0.34, 0.42, 1.08, body, s * 1.04, 0.5, -1.24);
    box(car, 0.1, 0.18, 0.72, carbon, s * 1.16, 0.34, 1.34);
    box(car, 0.1, 0.18, 0.82, carbon, s * 1.16, 0.34, -1.24);
  }

  // Side skirts + exits
  box(car, 2.16, 0.08, 2.35, carbon, 0, 0.18, 0.04);
  box(car, 0.16, 0.1, 0.36, chrome, 1.1, 0.28, -0.5);
  box(car, 0.16, 0.1, 0.36, chrome, -1.1, 0.28, -0.5);

  // Ducktail + diffuser
  box(car, 1.98, 0.06, 0.56, body, 0, 0.86, -2.04, -0.14);
  box(car, 1.98, 0.12, 0.04, carbon, 0, 0.98, -2.28);
  box(car, 0.06, 0.28, 0.32, dark, -0.86, 0.74, -1.94);
  box(car, 0.06, 0.28, 0.32, dark, 0.86, 0.74, -1.94);
  box(car, 1.8, 0.06, 0.5, carbon, 0, 0.16, -2.2);
  for (let i = -2; i <= 2; i++) {
    box(car, 0.03, 0.2, 0.42, dark, i * 0.28, 0.22, -2.24);
  }

  // Lights + stripe + plate
  box(car, 0.58, 0.08, 0.05, tail, -0.56, 0.58, -2.28);
  box(car, 0.58, 0.08, 0.05, tail, 0.56, 0.58, -2.28);
  box(car, 0.18, 0.05, 0.04, lite, 0, 0.58, -2.28);
  box(car, 0.16, 0.27, 3.82, accent, 0, 0.565, 0.04);
  const numMat = mat(0xffffff, { metal: 0.1, rough: 0.55 });
  box(car, 0.52, 0.32, 0.02, numMat, 0, 0.7, -1.52);
  const n = Math.max(1, Math.min(99, raceNumber));
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens > 0) box(car, 0.07, 0.2, 0.03, dark, -0.11, 0.7, -1.51);
  for (let i = 0; i < Math.min(ones, 5); i++) {
    box(car, 0.055, 0.035, 0.03, dark, 0.1, 0.6 + i * 0.045, -1.51);
  }

  // Roof kit + mirrors
  box(car, 0.045, 0.26, 0.32, dark, 0, 1.4, -0.42, 0.18);
  box(car, 0.2, 0.06, 0.26, dark, 0, 1.3, 0.1);
  box(car, 0.16, 0.07, 0.1, dark, -0.96, 0.92, 0.52);
  box(car, 0.16, 0.07, 0.1, dark, 0.96, 0.92, 0.52);

  const r = 0.37;
  attachWheels(
    car,
    [
      [-0.94, r, 1.4],
      [0.94, r, 1.4],
      [-0.94, r, -1.32],
      [0.94, r, -1.32],
    ],
    r,
    0.32,
  );
  paintable(car, body, accent);
  car.userData.kind = "car";
  car.userData.headLightMaterials = [head];
  car.userData.tailLightMaterials = [tail];
  attachHeadBeams(car, [
    { x: -0.7, y: 0.52, z: 2.36 },
    { x: 0.7, y: 0.52, z: 2.36 },
  ]);
  return car;
}

/** Visual-only scale — physics / collision stay identical to cars. */
const BIKE_VISUAL_SCALE = 1.1;

/** Crouched sportbike rider — seated on the cowl, readable at chase-cam distance. */
function addRider(bike: THREE.Group, suitAccent: number) {
  const rider = new THREE.Group();
  rider.name = "rider";
  // Anchor on the seat (local bike space before visual scale).
  rider.position.set(0, 0.86, -0.38);
  rider.rotation.x = 0.42;

  const suit = mat(0x171c24, { metal: 0.16, rough: 0.74 });
  const trim = paintMat(suitAccent, { metal: 0.28, rough: 0.45, emit: 0.14 });
  const helmet = mat(0xe8eef6, { metal: 0.4, rough: 0.28 });
  const visor = mat(0x081018, { metal: 0.65, rough: 0.06 });
  const gloves = mat(0x2c2420, { metal: 0.1, rough: 0.82 });
  const boots = mat(0x101014, { metal: 0.22, rough: 0.68 });
  const skin = mat(0xc4a07a, { metal: 0.05, rough: 0.7 });

  // Hips planted on seat
  box(rider, 0.34, 0.18, 0.3, suit, 0, 0.02, 0.02);
  // Torso lean toward bars
  box(rider, 0.36, 0.28, 0.42, suit, 0, 0.28, 0.16, 0.2);
  box(rider, 0.3, 0.1, 0.36, trim, 0, 0.38, 0.18, 0.2);
  // Shoulders
  box(rider, 0.46, 0.12, 0.2, suit, 0, 0.42, 0.28);

  // Helmet + visor (forward of torso)
  cyl(rider, 0.15, 0.16, 0.19, helmet, 0, 0.62, 0.42, 0.15, 0, 0, 14);
  box(rider, 0.2, 0.09, 0.07, visor, 0, 0.6, 0.54, 0.1);
  box(rider, 0.14, 0.05, 0.1, suit, 0, 0.5, 0.34); // collar
  box(rider, 0.1, 0.04, 0.06, skin, 0, 0.52, 0.4); // chin hint

  // Arms reach to clip-ons
  for (const side of [-1, 1] as const) {
    box(rider, 0.09, 0.09, 0.34, suit, side * 0.2, 0.36, 0.48, -0.45, 0, side * 0.28);
    box(rider, 0.08, 0.08, 0.26, suit, side * 0.26, 0.28, 0.78, -0.2, 0, side * 0.1);
    box(rider, 0.09, 0.07, 0.11, gloves, side * 0.27, 0.24, 0.98);
  }

  // Legs tucked along tank / pegs
  for (const side of [-1, 1] as const) {
    box(rider, 0.13, 0.14, 0.4, suit, side * 0.18, -0.08, 0.18, 0.35, 0, side * 0.1);
    box(rider, 0.11, 0.12, 0.34, suit, side * 0.22, -0.28, 0.42, -0.35, 0, side * 0.06);
    box(rider, 0.11, 0.09, 0.2, boots, side * 0.24, -0.42, 0.62, -0.15);
  }

  bike.add(rider);
}

/** Sport motorbike — cleaner fairing silhouette; slight visual scale only. */
export function createBike(
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
): THREE.Group {
  const bike = new THREE.Group();
  const body = paintMat(bodyColor, { metal: 0.26, rough: 0.4, emit: 0.11 });
  const dark = mat(0x12161c, { metal: 0.5, rough: 0.45 });
  const carbon = mat(0x1a1f28, { metal: 0.4, rough: 0.55 });
  const chrome = mat(0xc0c8d2, { metal: 1, rough: 0.16 });
  const glass = mat(0x0a1520, { metal: 0.2, rough: 0.06 });
  const head = mat(0xf7fafc, { metal: 0.15, rough: 0.25, emissive: 0xf7fafc, emit: 0.85 });
  const tail = mat(0xff2418, { metal: 0.25, rough: 0.35, emissive: 0xff2418, emit: 0.65 });
  const accent = paintMat(accentColor, { metal: 0.3, rough: 0.42, emit: 0.18 });
  const seat = mat(0x1a1210, { metal: 0.15, rough: 0.85 });

  // Compact trellis / spine
  box(bike, 0.16, 0.12, 2.2, carbon, 0, 0.58, 0);
  box(bike, 0.1, 0.08, 1.45, chrome, 0, 0.46, 0.12);

  // Engine + exhaust tips
  box(bike, 0.44, 0.36, 0.58, dark, 0, 0.4, 0.08);
  box(bike, 0.38, 0.1, 0.5, chrome, 0, 0.26, 0.08);
  box(bike, 0.2, 0.08, 0.7, dark, 0.16, 0.3, -0.55, 0.12);
  box(bike, 0.2, 0.08, 0.7, dark, -0.16, 0.3, -0.55, 0.12);
  cyl(bike, 0.07, 0.07, 0.36, chrome, 0.2, 0.32, -0.28, 0, 0, Math.PI / 2, 10);
  cyl(bike, 0.07, 0.07, 0.36, chrome, -0.2, 0.32, -0.28, 0, 0, Math.PI / 2, 10);

  // Sculpted tank
  box(bike, 0.5, 0.26, 0.68, body, 0, 0.8, 0.18);
  box(bike, 0.42, 0.14, 0.5, body, 0, 0.96, 0.12);
  box(bike, 0.36, 0.1, 0.28, body, 0, 0.9, 0.42, 0.25);
  box(bike, 0.09, 0.17, 0.65, accent, 0, 0.885, 0.16);

  // Nose fairing + windscreen
  box(bike, 0.58, 0.38, 0.52, body, 0, 0.76, 1.12);
  box(bike, 0.48, 0.22, 0.28, body, 0, 0.92, 1.0, -0.2);
  box(bike, 0.66, 0.1, 0.32, carbon, 0, 0.5, 1.26);
  box(bike, 0.46, 0.2, 0.06, glass, 0, 0.98, 1.28, -0.42);
  box(bike, 0.18, 0.07, 0.05, head, -0.2, 0.7, 1.4);
  box(bike, 0.18, 0.07, 0.05, head, 0.2, 0.7, 1.4);
  box(bike, 0.05, 0.04, 0.04, accent, 0, 0.6, 1.4);

  // Side panels
  for (const side of [-1, 1] as const) {
    box(bike, 0.08, 0.28, 0.7, body, side * 0.28, 0.62, 0.35);
    box(bike, 0.06, 0.18, 0.45, carbon, side * 0.3, 0.48, 0.2);
  }

  // Seat + tall-ish tail cowl
  box(bike, 0.4, 0.12, 0.72, seat, 0, 0.76, -0.62);
  box(bike, 0.4, 0.2, 0.72, body, 0, 0.86, -1.1);
  box(bike, 0.3, 0.14, 0.42, body, 0, 0.98, -1.42);
  box(bike, 0.18, 0.08, 0.22, body, 0, 1.04, -1.62);
  box(bike, 0.2, 0.07, 0.05, tail, 0, 0.88, -1.76);
  box(bike, 0.065, 0.13, 0.61, accent, 0, 0.925, -1.18);

  // Swingarm + hugger
  box(bike, 0.07, 0.07, 0.72, chrome, 0.11, 0.4, -0.88);
  box(bike, 0.07, 0.07, 0.72, chrome, -0.11, 0.4, -0.88);
  box(bike, 0.48, 0.07, 0.32, carbon, 0, 0.52, -1.32);

  // Upside-down forks + clip-ons
  box(bike, 0.055, 0.58, 0.055, chrome, 0.11, 0.7, 1.02, 0.2);
  box(bike, 0.055, 0.58, 0.055, chrome, -0.11, 0.7, 1.02, 0.2);
  box(bike, 0.58, 0.045, 0.045, dark, 0, 1.02, 0.92);
  box(bike, 0.07, 0.07, 0.12, dark, 0.26, 1.02, 0.92);
  box(bike, 0.07, 0.07, 0.12, dark, -0.26, 1.02, 0.92);

  addRider(bike, accentColor);

  // Number plate
  const numMat = mat(0xffffff, { metal: 0.1, rough: 0.55 });
  box(bike, 0.26, 0.2, 0.02, numMat, 0, 0.76, -1.58);
  const n = Math.max(1, Math.min(99, raceNumber));
  if (Math.floor(n / 10) > 0) box(bike, 0.05, 0.13, 0.03, dark, -0.06, 0.76, -1.57);
  for (let i = 0; i < Math.min(n % 10, 4); i++) {
    box(bike, 0.04, 0.03, 0.03, dark, 0.06, 0.7 + i * 0.035, -1.57);
  }

  // Foot pegs
  box(bike, 0.2, 0.035, 0.055, chrome, 0.26, 0.3, -0.12);
  box(bike, 0.2, 0.035, 0.055, chrome, -0.26, 0.3, -0.12);

  const r = 0.4;
  attachWheels(
    bike,
    [
      [0, r, 1.12],
      [0, r, -1.22],
    ],
    r,
    0.17,
    6,
  );
  bike.userData.steerCount = 1; // only front wheel yaws

  // Tiny visual size bump only — shared Vehicle/AI/collision path unchanged.
  bike.scale.setScalar(BIKE_VISUAL_SCALE);
  bike.userData.wheelRadius = r * BIKE_VISUAL_SCALE;

  paintable(bike, body, accent);
  bike.userData.kind = "bike";
  bike.userData.headLightMaterials = [head];
  bike.userData.tailLightMaterials = [tail];
  attachHeadBeams(bike, [
    { x: -0.2, y: 0.7, z: 1.4 },
    { x: 0.2, y: 0.7, z: 1.4 },
  ]);
  return bike;
}

export function createVehicle(
  kind: VehicleKind,
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
): THREE.Group {
  return kind === "bike"
    ? createBike(bodyColor, raceNumber, accentColor)
    : createCar(bodyColor, raceNumber, accentColor);
}

export const CAR_PALETTE = {
  player: 0xe4eaf2,
  rivals: [0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff],
  /** Per-rival stripe/trim — independent of the player's garage accent. */
  rivalAccents: [0xf0f4f8, 0xf0c020, 0x1a1f28, 0x0c1218, 0xe4eaf2],
};
