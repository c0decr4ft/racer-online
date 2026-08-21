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
  // Vehicles don't need to sample the sun shadow map on every panel.
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
  tire.receiveShadow = false;
  g.add(tire);

  const sidewall = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.72, radius * 0.075, 8, 28),
    mat(0x1a1a1e, { metal: 0.1, rough: 0.85 }),
  );
  sidewall.rotation.y = Math.PI / 2;
  sidewall.castShadow = true;
  sidewall.receiveShadow = false;
  g.add(sidewall);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width * 0.42, 22),
    mat(0xd0d8e2, { metal: 0.98, rough: 0.18 }),
  );
  rim.rotation.z = Math.PI / 2;
  rim.castShadow = true;
  rim.receiveShadow = false;
  g.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, width * 0.55, 12),
    mat(0xf0f4f8, { metal: 1, rough: 0.12 }),
  );
  hub.rotation.z = Math.PI / 2;
  hub.castShadow = true;
  hub.receiveShadow = false;
  g.add(hub);

  const spokeMat = mat(0xc5ced8, { metal: 0.95, rough: 0.22 });
  for (let i = 0; i < spokeCount; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.05, radius * 0.92, width * 0.07), spokeMat);
    spoke.rotation.z = (i / spokeCount) * Math.PI;
    spoke.castShadow = true;
    spoke.receiveShadow = false;
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

/**
 * Optional shared bit with asphalt (track.ts).
 * SpotLights MUST stay on layer 0 — WebGLRenderer only collects lights that
 * share a layer with the camera. Masking beams to layer 1 alone made them invisible.
 * (three.js layers do not selectively illuminate meshes; they gate camera/light discovery.)
 */
export const HEADLIGHT_LAYER = 1;

/** Night driving beams — candela (physically correct); aimed at asphalt ahead. */
const HEAD_BEAM_INTENSITY = 280;
const HEAD_BEAM_DISTANCE = 90;
const HEAD_BEAM_ANGLE = 0.62;
const HEAD_BEAM_PENUMBRA = 0.38;
const HEAD_BEAM_DECAY = 1.15;
const HEAD_LAMP_EMIT_ON = 14;
const HEAD_LAMP_EMIT_IDLE_CAR = 0.9;
const HEAD_LAMP_EMIT_IDLE_BIKE = 0.85;

/** Spot beams — local player only. Remotes/AI must not get these (GPU cost). */
function attachHeadBeams(
  root: THREE.Group,
  mounts: { x: number; y: number; z: number }[],
) {
  const beams: THREE.SpotLight[] = [];
  for (const m of mounts) {
    const light = new THREE.SpotLight(
      0xfff1c0,
      0,
      HEAD_BEAM_DISTANCE,
      HEAD_BEAM_ANGLE,
      HEAD_BEAM_PENUMBRA,
      HEAD_BEAM_DECAY,
    );
    light.position.set(m.x, m.y, m.z);
    light.castShadow = false;
    // Off lights must be invisible — intensity 0 still hits the fragment shader.
    light.visible = false;
    // Stay on default layer 0 so the chase/rear cameras collect these lights.
    light.layers.enable(HEADLIGHT_LAYER);
    const target = new THREE.Object3D();
    // Aim down onto the asphalt well ahead of the nose
    target.position.set(m.x * 0.08, -0.65, m.z + 32);
    root.add(target);
    light.target = target;
    root.add(light);
    beams.push(light);
  }
  root.userData.headBeams = beams;
}

/** Ensure cameras can discover headlight SpotLights if they ever leave layer 0. */
export function enableHeadlightCameras(...cameras: THREE.Camera[]) {
  for (const cam of cameras) cam.layers.enable(HEADLIGHT_LAYER);
}

/**
 * Strip SpotLight beams from a vehicle mesh (AI / remotes).
 * Emissive lamp materials stay — other clients still see glowing lenses.
 */
export function stripVehicleSpotLights(root: THREE.Group) {
  const beams = root.userData.headBeams as THREE.SpotLight[] | undefined;
  if (beams) {
    for (const b of beams) {
      b.target.removeFromParent();
      b.removeFromParent();
      b.dispose();
    }
    root.userData.headBeams = undefined;
  }
  // Safety: remove any orphan SpotLights (should not exist without headlights opts).
  const doomed: THREE.SpotLight[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.SpotLight) doomed.push(obj);
  });
  for (const b of doomed) {
    b.target.removeFromParent();
    b.removeFromParent();
    b.dispose();
  }
}

/** Free GPU resources for a vehicle group (player, AI, or remote). */
export function disposeVehicleGroup(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Light) {
      obj.dispose();
      return;
    }
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry?.dispose();
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

/** Toggle lamp glow + beams (night driving). Safe on AI/remotes (emissive only). */
export function setVehicleHeadlights(root: THREE.Group | undefined, on: boolean) {
  if (!root) return;
  root.userData.headlightsOn = on;
  const beams = root.userData.headBeams as THREE.SpotLight[] | undefined;
  if (beams) {
    for (const b of beams) {
      b.intensity = on ? HEAD_BEAM_INTENSITY : 0;
      b.visible = on;
    }
  }
  const heads = root.userData.headLightMaterials as THREE.MeshStandardMaterial[] | undefined;
  const headIdle = root.userData.kind === "bike" ? HEAD_LAMP_EMIT_IDLE_BIKE : HEAD_LAMP_EMIT_IDLE_CAR;
  if (heads) {
    for (const m of heads) {
      m.emissiveIntensity = on ? HEAD_LAMP_EMIT_ON : headIdle;
      m.emissive.setHex(on ? 0xfff2c4 : 0xf7fafc);
      m.color.setHex(on ? 0xfffae8 : 0xf7fafc);
    }
  }
  const tails = root.userData.tailLightMaterials as THREE.MeshStandardMaterial[] | undefined;
  const tailIdle = root.userData.kind === "bike" ? 0.65 : 0.7;
  if (tails) {
    for (const m of tails) m.emissiveIntensity = on ? 2.6 : tailIdle;
  }
}

export type CreateVehicleOpts = {
  /** Real SpotLight beams — only for the local player. */
  headlights?: boolean;
};

/** Sleeker GT coupe — lower stance, clearer cabin glass, richer detailing. */
export function createCar(
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
  opts?: CreateVehicleOpts,
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

  // Chassis / rocker — kept slightly above wheel contact so pitch/lean never buries them
  box(car, 1.95, 0.34, 4.4, body, 0, 0.46, 0.02);
  box(car, 2.08, 0.1, 4.2, carbon, 0, 0.26, 0.02);
  box(car, 1.72, 0.2, 3.95, dark, 0, 0.38, 0.02);

  // Nose + splitter — front stack pushed forward so the steered tire's swept
  // envelope (visual yaw is capped in vehicle.ts) can never reach the nose.
  box(car, 1.9, 0.26, 0.58, body, 0, 0.5, 2.16);
  box(car, 2.12, 0.07, 0.52, carbon, 0, 0.22, 2.28);
  box(car, 1.55, 0.12, 0.18, dark, 0, 0.34, 2.42);
  // Headlights (angled pods + bright projector lenses)
  box(car, 0.48, 0.1, 0.08, head, -0.7, 0.52, 2.44, 0, 0.08);
  box(car, 0.48, 0.1, 0.08, head, 0.7, 0.52, 2.44, 0, -0.08);
  box(car, 0.22, 0.07, 0.04, head, -0.7, 0.52, 2.5, 0, 0.08);
  box(car, 0.22, 0.07, 0.04, head, 0.7, 0.52, 2.5, 0, -0.08);
  box(car, 0.1, 0.05, 0.05, accent, -0.96, 0.4, 2.36);
  box(car, 0.1, 0.05, 0.05, accent, 0.96, 0.4, 2.36);

  // Hood + vents (named panel — wall damage skews it loose)
  box(car, 1.84, 0.09, 1.5, body, 0, 0.66, 1.28).name = "panel-hood";
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
  // Glass (rx: + drops +Z edge — correct front rake / rear hatch slope)
  box(car, 1.36, 0.04, 0.88, glass, 0, 1.0, 0.7, 0.5).name = "glass-front";
  box(car, 1.28, 0.04, 0.82, glass, 0, 1.0, -0.98, -0.4);
  box(car, 0.04, 0.3, 1.08, glass, -0.78, 0.96, -0.1);
  box(car, 0.04, 0.3, 1.08, glass, 0.78, 0.96, -0.1);
  for (const x of [-0.36, 0, 0.36]) {
    box(car, 0.025, 0.025, 0.7, dark, x, 1.02, -0.98, -0.4);
  }

  // Flared arches — front flares wide enough to fully hide the capped-yaw
  // sweep of the steered tires (max outboard reach ~1.20 at 0.31 rad).
  for (const s of [-1, 1] as const) {
    box(car, 0.34, 0.42, 0.98, body, s * 1.11, 0.5, 1.34);
    box(car, 0.34, 0.42, 1.08, body, s * 1.04, 0.5, -1.24);
    box(car, 0.1, 0.18, 0.72, carbon, s * 1.19, 0.34, 1.34);
    box(car, 0.1, 0.18, 0.82, carbon, s * 1.16, 0.34, -1.24);
  }

  // Side skirts + exits
  box(car, 2.16, 0.08, 2.35, carbon, 0, 0.24, 0.04);
  box(car, 0.16, 0.1, 0.36, chrome, 1.1, 0.3, -0.5);
  box(car, 0.16, 0.1, 0.36, chrome, -1.1, 0.3, -0.5);

  // Ducktail + diffuser (named panel — wall damage skews it loose)
  box(car, 1.98, 0.06, 0.56, body, 0, 0.86, -2.04, -0.14).name = "panel-tail";
  box(car, 1.98, 0.12, 0.04, carbon, 0, 0.98, -2.28);
  box(car, 0.06, 0.28, 0.32, dark, -0.86, 0.74, -1.94);
  box(car, 0.06, 0.28, 0.32, dark, 0.86, 0.74, -1.94);
  box(car, 1.8, 0.06, 0.5, carbon, 0, 0.22, -2.2);
  for (let i = -2; i <= 2; i++) {
    box(car, 0.03, 0.2, 0.42, dark, i * 0.28, 0.26, -2.24);
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
  if (opts?.headlights) {
    attachHeadBeams(car, [
      { x: -0.7, y: 0.52, z: 2.44 },
      { x: 0.7, y: 0.52, z: 2.44 },
    ]);
  }
  return car;
}

/** Visual-only scale — physics / collision stay identical to cars. */
const BIKE_VISUAL_SCALE = 1.1;

/** Tucked superbike rider — light grey leathers, helmet matches the bike paint. */
function addRider(bike: THREE.Group, bodyColor: number, suitAccent: number) {
  const rider = new THREE.Group();
  rider.name = "rider";
  rider.position.set(0, 0.84, -0.32);
  rider.rotation.x = 0.48;

  const suit = mat(0xd4d8de, { metal: 0.12, rough: 0.76 });
  const trim = paintMat(suitAccent, { metal: 0.3, rough: 0.42, emit: 0.16 });
  const lid = paintMat(bodyColor, { metal: 0.32, rough: 0.3, emit: 0.12 });
  const lidShade = mat(0xb0b6be, { metal: 0.28, rough: 0.38 });
  const visor = mat(0x070d14, { metal: 0.85, rough: 0.04 });
  const visorTint = mat(0x1a3048, { metal: 0.7, rough: 0.08, emissive: 0x152030, emit: 0.15 });
  const gloves = mat(0xa8aeb6, { metal: 0.1, rough: 0.82 });
  const boots = mat(0x6a7078, { metal: 0.18, rough: 0.7 });

  box(rider, 0.32, 0.16, 0.28, suit, 0, 0.0, 0.0);
  box(rider, 0.34, 0.26, 0.44, suit, 0, 0.26, 0.18, 0.22);
  box(rider, 0.28, 0.08, 0.38, trim, 0, 0.36, 0.2, 0.22);
  box(rider, 0.48, 0.11, 0.18, suit, 0, 0.4, 0.32);

  // Closed-face racing helmet (shell + chin bar + smoked visor).
  const helm = new THREE.Group();
  helm.name = "helmet";
  helm.position.set(0, 0.64, 0.4);
  helm.rotation.x = 0.12;
  add(helm, new THREE.SphereGeometry(0.175, 16, 12), lid, 0, 0.02, 0);
  box(helm, 0.22, 0.12, 0.16, lid, 0, -0.08, 0.08);
  box(helm, 0.2, 0.1, 0.08, lidShade, 0, -0.1, 0.14);
  box(helm, 0.24, 0.11, 0.06, visor, 0, 0.0, 0.15);
  box(helm, 0.22, 0.04, 0.04, visorTint, 0, 0.03, 0.175);
  box(helm, 0.04, 0.16, 0.22, lid, 0, 0.08, -0.02);
  box(helm, 0.18, 0.03, 0.16, trim, 0, 0.14, -0.02);
  rider.add(helm);
  box(rider, 0.16, 0.06, 0.12, suit, 0, 0.48, 0.32);

  for (const side of [-1, 1] as const) {
    box(rider, 0.09, 0.09, 0.36, suit, side * 0.2, 0.34, 0.5, -0.48, 0, side * 0.3);
    box(rider, 0.08, 0.08, 0.28, suit, side * 0.27, 0.24, 0.82, -0.18, 0, side * 0.08);
    box(rider, 0.09, 0.07, 0.12, gloves, side * 0.28, 0.2, 1.02);
  }

  for (const side of [-1, 1] as const) {
    box(rider, 0.12, 0.13, 0.42, suit, side * 0.17, -0.1, 0.16, 0.38, 0, side * 0.12);
    box(rider, 0.1, 0.11, 0.32, suit, side * 0.22, -0.3, 0.4, -0.38, 0, side * 0.05);
    box(rider, 0.1, 0.09, 0.2, boots, side * 0.24, -0.44, 0.58, -0.12);
  }

  bike.add(rider);
}

/** Racing superbike — pointed nose, belly pan, tall tail, tucked rider. */
export function createBike(
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
  opts?: CreateVehicleOpts,
): THREE.Group {
  const bike = new THREE.Group();
  const body = paintMat(bodyColor, { metal: 0.28, rough: 0.36, emit: 0.12 });
  const dark = mat(0x10141a, { metal: 0.55, rough: 0.4 });
  const carbon = mat(0x161b22, { metal: 0.42, rough: 0.5 });
  const chrome = mat(0xc4ccd6, { metal: 1, rough: 0.14 });
  const gold = mat(0xb08948, { metal: 0.95, rough: 0.22 });
  const glass = mat(0x081018, { metal: 0.25, rough: 0.05 });
  const head = mat(0xf7fafc, { metal: 0.15, rough: 0.22, emissive: 0xf7fafc, emit: 0.95 });
  const tail = mat(0xff2418, { metal: 0.25, rough: 0.32, emissive: 0xff2418, emit: 0.75 });
  const accent = paintMat(accentColor, { metal: 0.32, rough: 0.38, emit: 0.2 });
  const seat = mat(0x121014, { metal: 0.12, rough: 0.88 });
  const rubber = mat(0x0a0a0c, { metal: 0.08, rough: 0.92 });

  // Spine sits between the wheel rings (front tire z≈0.74–1.54, rear ≈-1.60–-0.80).
  box(bike, 0.12, 0.1, 1.28, carbon, 0, 0.54, 0.02);
  box(bike, 0.08, 0.07, 1.1, chrome, 0, 0.44, 0.06);

  // Inline-four cases + sump (kept above the deck so lean doesn't bury them).
  box(bike, 0.4, 0.3, 0.48, dark, 0, 0.42, 0.1);
  box(bike, 0.34, 0.08, 0.4, chrome, 0, 0.26, 0.1);
  box(bike, 0.12, 0.16, 0.36, dark, 0.18, 0.4, 0.08);
  box(bike, 0.12, 0.16, 0.36, dark, -0.18, 0.4, 0.08);
  for (const z of [0.22, 0.08, -0.06] as const) {
    cyl(bike, 0.028, 0.028, 0.22, chrome, 0.16, 0.34, z, 0.55, 0, 0.4, 8);
    cyl(bike, 0.028, 0.028, 0.22, chrome, -0.16, 0.34, z, 0.55, 0, -0.4, 8);
  }

  // Belly pan
  box(bike, 0.5, 0.09, 0.9, body, 0, 0.2, 0.12);
  box(bike, 0.4, 0.07, 0.42, carbon, 0, 0.16, -0.38);
  box(bike, 0.22, 0.05, 0.28, carbon, 0, 0.14, 0.52);

  // Side fairings + ram-air scoops
  for (const side of [-1, 1] as const) {
    box(bike, 0.07, 0.42, 0.95, body, side * 0.26, 0.5, 0.22);
    box(bike, 0.08, 0.2, 0.32, carbon, side * 0.3, 0.58, 0.62, 0, 0, side * 0.18);
    box(bike, 0.05, 0.12, 0.55, accent, side * 0.3, 0.62, 0.18);
  }

  // Peaked tank (named panel — wall damage skews it loose)
  box(bike, 0.44, 0.22, 0.58, body, 0, 0.8, 0.1).name = "panel-hood";
  box(bike, 0.3, 0.12, 0.36, body, 0, 0.96, 0.06);
  box(bike, 0.26, 0.08, 0.22, body, 0, 0.9, 0.32, 0.28);
  box(bike, 0.07, 0.16, 0.52, accent, 0, 0.9, 0.08);

  // Pointed nose — above the front tire (top ≈ y 0.8) so the wheel never clips it.
  box(bike, 0.5, 0.3, 0.5, body, 0, 0.98, 1.02);
  box(bike, 0.36, 0.2, 0.32, body, 0, 0.9, 1.3, -0.18);
  box(bike, 0.22, 0.12, 0.18, body, 0, 0.86, 1.46, -0.22);
  box(bike, 0.48, 0.07, 0.22, carbon, 0, 0.84, 1.22);
  box(bike, 0.4, 0.24, 0.05, glass, 0, 1.22, 1.16, -0.52).name = "glass-front";
  box(bike, 0.28, 0.1, 0.06, head, 0, 0.9, 1.52);
  box(bike, 0.12, 0.05, 0.04, head, -0.1, 0.9, 1.55);
  box(bike, 0.12, 0.05, 0.04, head, 0.1, 0.9, 1.55);
  box(bike, 0.05, 0.04, 0.04, accent, 0, 0.84, 1.5);

  // Seat + tall race tail (named panel)
  box(bike, 0.34, 0.08, 0.58, seat, 0, 0.76, -0.52);
  box(bike, 0.36, 0.18, 0.78, body, 0, 0.9, -1.12).name = "panel-tail";
  box(bike, 0.26, 0.12, 0.4, body, 0, 1.02, -1.48);
  box(bike, 0.14, 0.08, 0.22, body, 0, 1.08, -1.7);
  box(bike, 0.06, 0.12, 0.7, accent, 0, 0.96, -1.2);
  box(bike, 0.18, 0.06, 0.05, tail, 0, 0.86, -1.82);
  box(bike, 0.08, 0.04, 0.04, tail, -0.08, 0.86, -1.82);
  box(bike, 0.08, 0.04, 0.04, tail, 0.08, 0.86, -1.82);

  // Swingarm + hugger (hugger stays above the rear tire).
  box(bike, 0.08, 0.08, 0.82, chrome, 0.13, 0.38, -0.86);
  box(bike, 0.08, 0.08, 0.82, chrome, -0.13, 0.38, -0.86);
  box(bike, 0.16, 0.06, 0.16, dark, 0, 0.38, -0.48);
  box(bike, 0.42, 0.06, 0.28, carbon, 0, 0.86, -1.28);

  // Under-tail race cans
  cyl(bike, 0.055, 0.06, 0.42, carbon, 0.12, 0.58, -1.42, Math.PI / 2, 0, 0.12, 10);
  cyl(bike, 0.055, 0.06, 0.42, carbon, -0.12, 0.58, -1.42, Math.PI / 2, 0, -0.12, 10);
  cyl(bike, 0.045, 0.045, 0.06, chrome, 0.12, 0.58, -1.64, Math.PI / 2, 0, 0.12, 8);
  cyl(bike, 0.045, 0.045, 0.06, chrome, -0.12, 0.58, -1.64, Math.PI / 2, 0, -0.12, 8);

  // Triple clamp + clip-ons
  box(bike, 0.42, 0.05, 0.08, dark, 0, 1.08, 0.82);
  box(bike, 0.62, 0.04, 0.04, dark, 0, 1.0, 0.88);
  box(bike, 0.08, 0.05, 0.12, rubber, 0.28, 1.0, 0.88);
  box(bike, 0.08, 0.05, 0.12, rubber, -0.28, 1.0, 0.88);

  addRider(bike, bodyColor, accentColor);

  const numMat = mat(0xffffff, { metal: 0.1, rough: 0.55 });
  box(bike, 0.24, 0.18, 0.02, numMat, 0, 0.92, -1.52);
  const n = Math.max(1, Math.min(99, raceNumber));
  if (Math.floor(n / 10) > 0) box(bike, 0.045, 0.12, 0.03, dark, -0.055, 0.92, -1.51);
  for (let i = 0; i < Math.min(n % 10, 4); i++) {
    box(bike, 0.035, 0.028, 0.03, dark, 0.055, 0.865 + i * 0.032, -1.51);
  }

  // Rear-sets
  box(bike, 0.18, 0.03, 0.05, chrome, 0.28, 0.32, -0.18);
  box(bike, 0.18, 0.03, 0.05, chrome, -0.28, 0.32, -0.18);

  const r = 0.4;
  const steers: THREE.Group[] = [];
  const spinners: THREE.Group[] = [];
  for (const spec of [
    { z: 1.14, width: 0.12, spokes: 5 },
    { z: -1.2, width: 0.22, spokes: 5 },
  ] as const) {
    const steer = new THREE.Group();
    steer.position.set(0, r, spec.z);
    const spin = wheel(r, spec.width, spec.spokes);
    steer.add(spin);
    bike.add(steer);
    steers.push(steer);
    spinners.push(spin);
  }
  bike.userData.steers = steers;
  bike.userData.spinners = spinners;
  bike.userData.steerCount = 1;

  const frontSteer = steers[0];
  if (frontSteer) {
    box(frontSteer, 0.05, 0.62, 0.05, gold, 0.1, 0.32, -0.08, 0.18);
    box(frontSteer, 0.05, 0.62, 0.05, gold, -0.1, 0.32, -0.08, 0.18);
    box(frontSteer, 0.28, 0.04, 0.08, dark, 0, 0.58, -0.06);
    box(frontSteer, 0.2, 0.045, 0.3, body, 0, 0.4, 0.16);
  }

  bike.scale.setScalar(BIKE_VISUAL_SCALE);
  bike.userData.wheelRadius = r * BIKE_VISUAL_SCALE;

  paintable(bike, body, accent);
  bike.userData.kind = "bike";
  bike.userData.headLightMaterials = [head];
  bike.userData.tailLightMaterials = [tail];
  if (opts?.headlights) {
    attachHeadBeams(bike, [
      { x: -0.1, y: 0.9, z: 1.52 },
      { x: 0.1, y: 0.9, z: 1.52 },
    ]);
  }
  return bike;
}

/** Dev garage extra — jacked-up stadium monster truck (clearance + cage + flares). */
export function createMonsterTruck(
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
  opts?: CreateVehicleOpts,
): THREE.Group {
  const truck = new THREE.Group();
  const body = paintMat(bodyColor, { metal: 0.26, rough: 0.4, emit: 0.12 });
  const dark = mat(0x10141a, { metal: 0.55, rough: 0.42 });
  const carbon = mat(0x181e26, { metal: 0.4, rough: 0.58 });
  const chrome = mat(0xc8d0da, { metal: 1, rough: 0.14 });
  const rubber = mat(0x0a0a0c, { metal: 0.05, rough: 0.95 });
  const glass = mat(0x08121c, { metal: 0.15, rough: 0.05 });
  const head = mat(0xf7fafc, { metal: 0.15, rough: 0.25, emissive: 0xf7fafc, emit: 0.95 });
  const tail = mat(0xff2418, { metal: 0.25, rough: 0.35, emissive: 0xff2418, emit: 0.75 });
  const accent = paintMat(accentColor, { metal: 0.3, rough: 0.38, emit: 0.18 });

  // Ladder chassis + crossmembers — daylight under the tub is the silhouette.
  box(truck, 0.16, 0.22, 3.7, dark, -0.52, 1.02, 0);
  box(truck, 0.16, 0.22, 3.7, dark, 0.52, 1.02, 0);
  for (const z of [-1.45, -0.55, 0.35, 1.25]) {
    box(truck, 1.2, 0.1, 0.14, dark, 0, 1.02, z);
  }
  // Axles, diffs, long-travel coilovers (splayed)
  for (const z of [1.38, -1.38] as const) {
    box(truck, 2.35, 0.16, 0.16, chrome, 0, 0.62, z);
    box(truck, 0.36, 0.3, 0.28, dark, 0, 0.62, z);
    for (const s of [-1, 1] as const) {
      box(truck, 0.1, 0.72, 0.1, chrome, s * 0.82, 0.95, z, 0, 0, s * -0.38);
      box(truck, 0.06, 0.58, 0.06, dark, s * 0.48, 0.9, z, 0, 0, s * 0.42);
      cyl(truck, 0.09, 0.09, 0.22, rubber, s * 0.82, 0.58, z, 0, 0, Math.PI / 2, 10);
    }
  }

  // Main tub — high floor clears the tire crowns
  box(truck, 2.05, 0.5, 4.05, body, 0, 1.62, 0.05);
  box(truck, 1.9, 0.08, 3.9, carbon, 0, 1.34, 0.05);
  // Nose / grille face
  box(truck, 1.95, 0.55, 0.28, body, 0, 1.68, 2.12);
  box(truck, 1.55, 0.42, 0.08, dark, 0, 1.66, 2.28);
  for (const y of [1.52, 1.64, 1.76]) {
    box(truck, 1.35, 0.035, 0.04, chrome, 0, y, 2.32);
  }
  // Hood with scoop (damage panel)
  box(truck, 1.78, 0.14, 1.15, body, 0, 1.95, 1.35).name = "panel-hood";
  box(truck, 0.72, 0.14, 0.55, carbon, 0, 2.08, 1.38);
  box(truck, 0.55, 0.04, 0.4, dark, 0, 2.16, 1.38);
  box(truck, 0.12, 0.05, 1.05, accent, -0.55, 2.04, 1.35);
  box(truck, 0.12, 0.05, 1.05, accent, 0.55, 2.04, 1.35);

  // Cab — short roof, thick pillars, readable glasshouse
  box(truck, 1.78, 0.62, 1.45, body, 0, 2.18, -0.2);
  box(truck, 1.82, 0.1, 1.5, body, 0, 2.52, -0.22);
  box(truck, 0.14, 0.55, 0.14, dark, -0.82, 2.2, 0.42);
  box(truck, 0.14, 0.55, 0.14, dark, 0.82, 2.2, 0.42);
  box(truck, 0.12, 0.5, 0.12, dark, -0.82, 2.18, -0.88);
  box(truck, 0.12, 0.5, 0.12, dark, 0.82, 2.18, -0.88);
  box(truck, 1.52, 0.06, 0.72, glass, 0, 2.22, 0.55, 0.48).name = "glass-front";
  box(truck, 1.48, 0.05, 0.55, glass, 0, 2.22, -0.95, -0.32);
  box(truck, 0.05, 0.38, 1.15, glass, -0.9, 2.2, -0.2);
  box(truck, 0.05, 0.38, 1.15, glass, 0.9, 2.2, -0.2);

  // Roll cage over cab + bed
  for (const s of [-1, 1] as const) {
    box(truck, 0.07, 0.55, 0.07, chrome, s * 0.72, 2.75, 0.35);
    box(truck, 0.07, 0.7, 0.07, chrome, s * 0.72, 2.7, -0.95);
    box(truck, 0.07, 0.07, 1.4, chrome, s * 0.72, 3.0, -0.3);
  }
  box(truck, 1.5, 0.07, 0.07, chrome, 0, 3.0, 0.35);
  box(truck, 1.5, 0.07, 0.07, chrome, 0, 3.0, -0.95);

  // Roof light bar
  box(truck, 1.35, 0.08, 0.12, dark, 0, 2.62, 0.45);
  for (const x of [-0.5, -0.17, 0.17, 0.5]) {
    box(truck, 0.18, 0.1, 0.08, head, x, 2.62, 0.52);
  }

  // Bed walls + floor + tailgate
  box(truck, 1.7, 0.06, 1.55, carbon, 0, 1.88, -1.35);
  box(truck, 0.1, 0.42, 1.55, body, -0.95, 2.08, -1.35);
  box(truck, 0.1, 0.42, 1.55, body, 0.95, 2.08, -1.35);
  box(truck, 1.95, 0.42, 0.12, body, 0, 2.08, -2.12).name = "panel-tail";
  box(truck, 1.7, 0.05, 0.08, accent, 0, 2.28, -2.18);
  // Bed rail stakes + wing
  for (const s of [-1, 1] as const) {
    box(truck, 0.07, 0.48, 0.07, dark, s * 0.85, 2.4, -2.05);
  }
  box(truck, 2.15, 0.07, 0.55, accent, 0, 2.68, -2.08, -0.18);
  box(truck, 0.08, 0.2, 0.4, dark, -1.02, 2.55, -2.0);
  box(truck, 0.08, 0.2, 0.4, dark, 1.02, 2.55, -2.0);

  // Wheel-arch flares (reads as stadium truck from chase cam)
  for (const z of [1.38, -1.38] as const) {
    for (const s of [-1, 1] as const) {
      box(truck, 0.28, 0.55, 1.05, body, s * 1.12, 1.55, z);
      box(truck, 0.08, 0.2, 0.9, accent, s * 1.24, 1.72, z);
    }
  }

  // Front bumper / brush guard + headlights
  box(truck, 2.25, 0.22, 0.24, chrome, 0, 1.18, 2.2);
  box(truck, 0.1, 0.65, 0.1, chrome, -0.55, 1.55, 2.32);
  box(truck, 0.1, 0.65, 0.1, chrome, 0.55, 1.55, 2.32);
  box(truck, 1.2, 0.1, 0.1, chrome, 0, 1.88, 2.32);
  for (const y of [1.45, 1.62, 1.78]) {
    box(truck, 1.05, 0.04, 0.05, chrome, 0, y, 2.36);
  }
  box(truck, 0.36, 0.18, 0.08, head, -0.68, 1.78, 2.22);
  box(truck, 0.36, 0.18, 0.08, head, 0.68, 1.78, 2.22);
  box(truck, 0.16, 0.1, 0.05, head, -0.68, 1.78, 2.28);
  box(truck, 0.16, 0.1, 0.05, head, 0.68, 1.78, 2.28);
  // Rear bumper + lights
  box(truck, 2.15, 0.2, 0.2, chrome, 0, 1.2, -2.18);
  box(truck, 0.32, 0.14, 0.06, tail, -0.72, 2.08, -2.2);
  box(truck, 0.32, 0.14, 0.06, tail, 0.72, 2.08, -2.2);

  // Side rockers / steps + accent belt
  box(truck, 0.05, 0.2, 3.7, accent, -1.05, 1.7, 0);
  box(truck, 0.05, 0.2, 3.7, accent, 1.05, 1.7, 0);
  box(truck, 0.32, 0.07, 1.2, carbon, -1.15, 1.28, -0.15);
  box(truck, 0.32, 0.07, 1.2, carbon, 1.15, 1.28, -0.15);

  // Dual exhaust stacks behind cab
  for (const s of [-1, 1] as const) {
    cyl(truck, 0.07, 0.07, 1.15, chrome, s * 0.55, 2.35, -0.95, 0, 0, 0, 12);
    cyl(truck, 0.09, 0.09, 0.12, dark, s * 0.55, 2.95, -0.95, 0, 0, 0, 10);
  }
  // Whip + flag
  cyl(truck, 0.018, 0.018, 1.35, dark, 0.92, 2.75, -2.0, 0, 0, 0, 6);
  box(truck, 0.48, 0.28, 0.03, accent, 0.72, 3.35, -2.0);

  // Race number on tailgate
  const numMat = mat(0xffffff, { metal: 0.1, rough: 0.55 });
  box(truck, 0.52, 0.3, 0.02, numMat, 0, 2.08, -2.2);
  const n = Math.max(1, Math.min(99, raceNumber));
  if (Math.floor(n / 10) > 0) box(truck, 0.06, 0.18, 0.03, dark, -0.1, 2.08, -2.21);
  for (let i = 0; i < Math.min(n % 10, 5); i++) {
    box(truck, 0.05, 0.032, 0.03, dark, 0.1, 1.99 + i * 0.04, -2.21);
  }

  const r = 0.72;
  attachWheels(
    truck,
    [
      [-1.22, r, 1.38],
      [1.22, r, 1.38],
      [-1.22, r, -1.38],
      [1.22, r, -1.38],
    ],
    r,
    0.62,
    5,
  );
  paintable(truck, body, accent);
  truck.userData.kind = "truck";
  truck.userData.headLightMaterials = [head];
  truck.userData.tailLightMaterials = [tail];
  if (opts?.headlights) {
    attachHeadBeams(truck, [
      { x: -0.68, y: 1.78, z: 2.22 },
      { x: 0.68, y: 1.78, z: 2.22 },
    ]);
  }
  return truck;
}

/** Dev garage extra — modern MBT silhouette; steerCount 0 (treads don't yaw). */
export function createTank(
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
  opts?: CreateVehicleOpts,
): THREE.Group {
  const tank = new THREE.Group();
  const body = paintMat(bodyColor, { metal: 0.35, rough: 0.52, emit: 0.09 });
  const dark = mat(0x101418, { metal: 0.55, rough: 0.48 });
  const carbon = mat(0x181e26, { metal: 0.4, rough: 0.58 });
  const tread = mat(0x0e1014, { metal: 0.25, rough: 0.9 });
  const steel = mat(0x3e464e, { metal: 0.75, rough: 0.36 });
  const rubber = mat(0x12141a, { metal: 0.15, rough: 0.88 });
  const glass = mat(0x08121c, { metal: 0.15, rough: 0.05 });
  const head = mat(0xf7fafc, { metal: 0.15, rough: 0.25, emissive: 0xf7fafc, emit: 0.95 });
  const tail = mat(0xff2418, { metal: 0.25, rough: 0.35, emissive: 0xff2418, emit: 0.75 });
  const accent = paintMat(accentColor, { metal: 0.28, rough: 0.42, emit: 0.15 });

  // Continuous tracks + road wheels / sprockets — planted on the ground plane.
  const roadWheels = [-1.55, -0.95, -0.35, 0.25, 0.85, 1.4];
  for (const s of [-1, 1] as const) {
    // Outer tread band + inner face
    box(tank, 0.52, 0.78, 4.25, tread, s * 1.05, 0.4, 0.02);
    box(tank, 0.38, 0.62, 4.0, rubber, s * 1.05, 0.4, 0.02);
    // Road wheels
    for (const z of roadWheels) {
      cyl(tank, 0.34, 0.34, 0.48, steel, s * 1.05, 0.38, z, 0, 0, Math.PI / 2, 16);
      cyl(tank, 0.14, 0.14, 0.5, dark, s * 1.05, 0.38, z, 0, 0, Math.PI / 2, 10);
    }
    // Drive sprocket (rear) + idler (front)
    cyl(tank, 0.38, 0.38, 0.5, dark, s * 1.05, 0.44, -1.95, 0, 0, Math.PI / 2, 14);
    cyl(tank, 0.36, 0.36, 0.5, dark, s * 1.05, 0.42, 1.95, 0, 0, Math.PI / 2, 14);
    // Return rollers
    for (const z of [-0.8, 0.1, 1.0]) {
      cyl(tank, 0.12, 0.12, 0.48, dark, s * 1.05, 0.74, z, 0, 0, Math.PI / 2, 10);
    }
    // Grouser pads on the top run
    for (let i = -8; i <= 8; i++) {
      box(tank, 0.5, 0.05, 0.18, steel, s * 1.05, 0.82, i * 0.24);
    }
    // Side skirt armor
    box(tank, 0.1, 0.55, 4.0, body, s * 1.32, 0.72, 0.02, 0, 0, s * 0.1);
    box(tank, 0.04, 0.12, 3.6, accent, s * 1.38, 0.85, 0.02);
  }

  // Lower hull + wedge glacis (damage panel) + rear plate
  box(tank, 1.7, 0.48, 3.95, body, 0, 0.72, 0.02);
  box(tank, 1.68, 0.12, 1.55, body, 0, 0.92, 1.55, 0.38).name = "panel-hood";
  box(tank, 1.55, 0.08, 0.9, dark, 0, 0.98, 1.7, 0.38);
  box(tank, 1.68, 0.42, 0.14, body, 0, 0.82, -1.98).name = "panel-tail";
  // Upper deck / turret ring
  box(tank, 1.55, 0.16, 2.35, body, 0, 1.0, -0.25);
  box(tank, 1.4, 0.08, 1.8, carbon, 0, 1.1, -0.3);
  // Driver hatch + vision block
  box(tank, 0.38, 0.1, 0.48, dark, 0.4, 1.08, 1.05);
  box(tank, 0.3, 0.05, 0.05, glass, 0.4, 1.14, 1.18).name = "glass-front";
  box(tank, 0.28, 0.08, 0.35, dark, -0.35, 1.08, 1.0);
  // Tow hooks
  cyl(tank, 0.055, 0.055, 0.14, steel, -0.55, 0.65, 2.15, Math.PI / 2, 0, 0, 8);
  cyl(tank, 0.055, 0.055, 0.14, steel, 0.55, 0.65, 2.15, Math.PI / 2, 0, 0, 8);

  // Turret — low wedge profile with bustle
  box(tank, 1.35, 0.42, 1.25, body, 0, 1.3, -0.2);
  box(tank, 1.15, 0.36, 0.85, body, 0, 1.28, 0.55, -0.1);
  box(tank, 1.0, 0.32, 0.55, body, 0, 1.26, -0.95);
  box(tank, 0.95, 0.07, 1.7, dark, 0, 1.52, -0.15);
  box(tank, 0.08, 0.1, 1.35, accent, 0, 1.56, -0.1);
  // Gun mantlet
  box(tank, 0.58, 0.36, 0.42, dark, 0, 1.3, 0.95);
  box(tank, 0.42, 0.28, 0.2, steel, 0, 1.3, 1.15);

  // Main gun — stepped tube + thermal jacket rings + muzzle brake
  cyl(tank, 0.11, 0.13, 0.55, dark, 0, 1.3, 1.35, Math.PI / 2, 0, 0, 14);
  cyl(tank, 0.075, 0.09, 2.05, steel, 0, 1.3, 2.55, Math.PI / 2, 0, 0, 14);
  for (const z of [1.75, 2.15, 2.55, 2.95]) {
    cyl(tank, 0.1, 0.1, 0.1, dark, 0, 1.3, z, Math.PI / 2, 0, 0, 12);
  }
  cyl(tank, 0.13, 0.13, 0.38, dark, 0, 1.3, 3.45, Math.PI / 2, 0, 0, 12);
  cyl(tank, 0.12, 0.12, 0.1, accent, 0, 1.3, 3.3, Math.PI / 2, 0, 0, 12);

  // Roof kit: commander cupola, loader hatch, coax MG, antennas
  cyl(tank, 0.28, 0.32, 0.14, dark, 0.35, 1.58, -0.35, 0, 0, 0, 14);
  box(tank, 0.2, 0.035, 0.22, glass, 0.35, 1.66, -0.35);
  cyl(tank, 0.2, 0.2, 0.1, dark, -0.38, 1.58, -0.4, 0, 0, 0, 12);
  box(tank, 0.05, 0.05, 0.55, dark, 0.35, 1.72, -0.55, -0.15);
  box(tank, 0.07, 0.07, 0.14, dark, 0.35, 1.68, -0.82);
  cyl(tank, 0.012, 0.012, 1.4, dark, -0.55, 2.2, -0.65, 0.08, 0, 0, 5);
  cyl(tank, 0.012, 0.012, 1.15, dark, -0.4, 2.05, -0.65, -0.1, 0, 0, 5);

  // Bustle rack + rear stowage
  for (const s of [-1, 1] as const) {
    box(tank, 0.05, 0.22, 0.9, dark, s * 0.62, 1.48, -0.95);
  }
  box(tank, 1.28, 0.05, 0.05, dark, 0, 1.58, -1.4);
  box(tank, 1.28, 0.05, 0.05, dark, 0, 1.38, -1.4);
  box(tank, 0.55, 0.22, 0.4, dark, -0.48, 1.05, -1.7);
  box(tank, 0.55, 0.22, 0.4, dark, 0.48, 1.05, -1.7);
  cyl(tank, 0.11, 0.11, 1.4, tread, 0, 1.05, -1.75, 0, 0, Math.PI / 2, 10);

  // Engine deck vents + exhausts
  for (const x of [-0.35, 0, 0.35]) {
    box(tank, 0.28, 0.04, 0.55, dark, x, 1.12, -1.35);
  }
  cyl(tank, 0.08, 0.08, 0.55, steel, -0.5, 0.88, -1.85, Math.PI / 2.5, 0, 0, 10);
  cyl(tank, 0.08, 0.08, 0.55, steel, 0.5, 0.88, -1.85, Math.PI / 2.5, 0, 0, 10);

  // Fender lights
  box(tank, 0.22, 0.1, 0.08, head, -0.48, 0.92, 2.05);
  box(tank, 0.22, 0.1, 0.08, head, 0.48, 0.92, 2.05);
  box(tank, 0.18, 0.08, 0.06, tail, -0.6, 0.85, -2.05);
  box(tank, 0.18, 0.08, 0.06, tail, 0.6, 0.85, -2.05);

  // Turret number plate
  const numMat = mat(0xffffff, { metal: 0.1, rough: 0.55 });
  box(tank, 0.42, 0.26, 0.02, numMat, 0, 1.32, -0.95);
  const n = Math.max(1, Math.min(99, raceNumber));
  if (Math.floor(n / 10) > 0) box(tank, 0.05, 0.16, 0.03, dark, -0.08, 1.32, -0.96);
  for (let i = 0; i < Math.min(n % 10, 4); i++) {
    box(tank, 0.04, 0.028, 0.03, dark, 0.08, 1.25 + i * 0.035, -0.96);
  }

  const r = 0.34;
  attachWheels(
    tank,
    [
      [-1.05, r, 1.55],
      [1.05, r, 1.55],
      [-1.05, r, 0.55],
      [1.05, r, 0.55],
      [-1.05, r, -0.45],
      [1.05, r, -0.45],
      [-1.05, r, -1.45],
      [1.05, r, -1.45],
    ],
    r,
    0.36,
    5,
  );
  // Treads never yaw — suppress steering animation on all wheels.
  tank.userData.steerCount = 0;
  paintable(tank, body, accent);
  tank.userData.kind = "tank";
  tank.userData.headLightMaterials = [head];
  tank.userData.tailLightMaterials = [tail];
  if (opts?.headlights) {
    attachHeadBeams(tank, [
      { x: -0.48, y: 0.92, z: 2.05 },
      { x: 0.48, y: 0.92, z: 2.05 },
    ]);
  }
  return tank;
}

export function createVehicle(
  kind: VehicleKind,
  bodyColor = 0xd0d7e0,
  raceNumber = 7,
  accentColor = 0xff3b2e,
  opts?: CreateVehicleOpts,
): THREE.Group {
  if (kind === "bike") return createBike(bodyColor, raceNumber, accentColor, opts);
  if (kind === "truck") return createMonsterTruck(bodyColor, raceNumber, accentColor, opts);
  if (kind === "tank") return createTank(bodyColor, raceNumber, accentColor, opts);
  return createCar(bodyColor, raceNumber, accentColor, opts);
}

export const CAR_PALETTE = {
  player: 0xe4eaf2,
  rivals: [0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff],
  /** Per-rival stripe/trim — independent of the player's garage accent. */
  rivalAccents: [0xf0f4f8, 0xf0c020, 0x1a1f28, 0x0c1218, 0xe4eaf2],
};
