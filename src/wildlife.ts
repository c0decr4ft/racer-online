/**
 * Track wildlife — per-track herds that wander a habitat and occasionally
 * cross the road. Hits = small burst + speed slowdown for player AND AI.
 *
 * meadow-sweep → cows (infield)
 * summit-pass → goats (outfield / trees)
 * oval-circuit → pigeons (sidewalk / building edges)
 * forest-loop → deer (outfield / trees)
 * harbor-circuit → crabs (shore / sand edges)
 * canyon-cut → snakes (sand shoulder + rock outfield)
 */
import * as THREE from "three";

const MEADOW_TRACK_ID = "meadow-sweep";
const SUMMIT_TRACK_ID = "summit-pass";
const CITY_TRACK_ID = "oval-circuit";
const FOREST_TRACK_ID = "forest-loop";
const HARBOR_TRACK_ID = "harbor-circuit";
const CANYON_TRACK_ID = "canyon-cut";

const WANDER_COUNT = 15;
const ANIMAL_RADIUS = 1.15;
const SMALL_RADIUS = 0.55;
const CAR_RADIUS = 1.7;
const HIT_DIST = ANIMAL_RADIUS + CAR_RADIUS;
const SMALL_HIT_DIST = SMALL_RADIUS + CAR_RADIUS;

/** Noticeable hit, not a full crash — keep ~40% of speed. */
const HIT_SPEED_KEEP = 0.4;
const HIT_SPEED_FLOOR = 4;
/** Sticky throttle cut after a hit (player + AI). */
const HIT_DRIVE_PENALTY = 0.9;

const WANDER_SPEED = 1.15;
const CROSS_SPEED = 1.85;
const APPROACH_SPEED = 1.45;

/**
 * Cross often enough that dodging is a real challenge — still not constant spam.
 * Up to three at once, spaced along the circuit.
 */
const CROSS_GAP_MIN = 4;
const CROSS_GAP_MAX = 8;
const MAX_CROSSINGS = 3;
/** Min wrapped path-T distance between simultaneous crossings. */
const CROSS_SEP_T = 0.28;

/**
 * Animal meshes face local +X (nose/beak along +X). Heading uses the usual
 * Three.js +Z-forward yaw (`atan2(dx, dz)`), so mesh yaw needs −π/2.
 */
const MESH_YAW_OFFSET = -Math.PI / 2;

/** Quick respawn so herds stay near full strength after hits. */
const RESPAWN_DELAY = 1.6;

/** Clear of asphalt centerline for zone wandering (road half 7 + runoff + pad). */
const ZONE_CLEAR = 14;
const ROAD_EDGE = 7.2;
/** Default outfield fringe (trees / rocks). */
const OUTFIELD_FAR = 34;
/** Urban pigeons hug sidewalks / building edges closer to the curb. */
const CITY_OUTFIELD_FAR = 26;
/** Harbor crabs stay near the sand/shore fringe. */
const SHORE_OUTFIELD_FAR = 28;
/**
 * Canyon snakes sit on sand runoff (just past asphalt) and also hang out
 * farther in the rock outfield — not only deep scenery.
 */
const SNAKE_SHOULDER_NEAR = 8.2;
const SNAKE_OUTFIELD_FAR = 38;

type Habitat = "infield" | "outfield";

type AnimalMode = "wander" | "approach" | "cross" | "return" | "dead";

type Animal = {
  mesh: THREE.Group;
  mode: AnimalMode;
  x: number;
  z: number;
  heading: number;
  targetX: number;
  targetZ: number;
  /** Path t for the chosen crossing. */
  crossT: number;
  /** Lateral sign: +1 / -1 world normal — positive * crossSign points infield. */
  crossSign: number;
  /**
   * Lateral progress along crossSign normal:
   * +1 = infield shoulder, −1 = outfield shoulder.
   */
  crossLat: number;
  /** Seconds until this dead animal respawns as a wanderer. */
  respawnIn: number;
  walkPhase: number;
  seed: number;
  /** Optional wing meshes for aerial flap (pigeons). */
  wings: THREE.Object3D[];
};

type BurstPart = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
};

export type AnimalHitTarget = {
  state: { position: THREE.Vector3; speed: number };
  syncCollision: () => void;
  /** Sticky post-hit drive cut — shared by player and AI vehicles. */
  animalHitPenalty: number;
};

/** @deprecated Prefer AnimalHitTarget */
export type CowHitTarget = AnimalHitTarget;

type HerdSpec = {
  trackId: string;
  habitat: Habitat;
  groupName: string;
  /** Display name for hit banner, e.g. "COW", "PIGEON". */
  hitName: string;
  createMesh: (seed: number) => THREE.Group;
  burstColors: number[];
  /** Flight arc on road approach/cross/return (pigeons). */
  aerial?: boolean;
  /** Lateral undulation while moving (snakes). */
  slither?: boolean;
  hitDist?: number;
  wanderSpeed?: number;
  approachSpeed?: number;
  crossSpeed?: number;
  /** Min outfield lateral distance from centerline (default ZONE_CLEAR). */
  outfieldNear?: number;
  outfieldFar?: number;
};

/** Hit feedback payload — who got hit and which species. */
export type AnimalHitInfo = {
  name: string;
  target: AnimalHitTarget;
};

function hash2(ix: number, iz: number) {
  let n = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function mat(color: number) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });
}

function matLit(color: number, emissive: number, emissiveIntensity: number) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness: 0.86,
    metalness: 0.02,
    flatShading: true,
  });
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = false;
  parent.add(m);
  return m;
}

/** Simple low-poly cow — boxes only, matches meadow farm props. */
function createCowMesh(seed: number): THREE.Group {
  const root = new THREE.Group();
  const white = seed % 3 !== 1;
  const bodyMat = mat(white ? 0xefefe8 : 0x6a4a32);
  const spotMat = mat(0x2c241c);
  const snoutMat = mat(0xd4a090);
  const hoofMat = mat(0x1a1816);

  addBox(root, 1.35, 0.72, 0.7, bodyMat, 0, 0.78, 0);
  if (white) {
    addBox(root, 0.42, 0.5, 0.72, spotMat, -0.28, 0.82, 0);
    addBox(root, 0.32, 0.38, 0.72, spotMat, 0.38, 0.86, 0);
  }

  addBox(root, 0.48, 0.42, 0.42, bodyMat, 0.82, 1.05, 0);
  addBox(root, 0.28, 0.22, 0.28, snoutMat, 1.12, 0.92, 0);
  addBox(root, 0.12, 0.18, 0.08, bodyMat, 0.72, 1.28, 0.22);
  addBox(root, 0.12, 0.18, 0.08, bodyMat, 0.72, 1.28, -0.22);

  const legY = 0.28;
  for (const [lx, lz] of [
    [0.42, 0.22],
    [0.42, -0.22],
    [-0.42, 0.22],
    [-0.42, -0.22],
  ] as const) {
    addBox(root, 0.14, 0.52, 0.14, bodyMat, lx, legY, lz);
    addBox(root, 0.16, 0.1, 0.16, hoofMat, lx, 0.05, lz);
  }

  addBox(root, 0.5, 0.08, 0.08, spotMat, -0.85, 0.95, 0);

  root.rotation.order = "YXZ";
  return root;
}

/** Stylized low-poly mountain goat — horns + alpine gray/cream/brown coats. */
function createGoatMesh(seed: number): THREE.Group {
  const root = new THREE.Group();
  const coat =
    seed % 3 === 0 ? 0xc8c4bc : seed % 3 === 1 ? 0x8a8680 : 0x6b5344;
  const belly = seed % 3 === 1 ? 0xd8d4cc : 0xe8e4dc;
  const bodyMat = mat(coat);
  const bellyMat = mat(belly);
  const hornMat = mat(0xd9cfc0);
  const hoofMat = mat(0x2a2420);
  const faceMat = mat(0xb8b0a4);

  addBox(root, 1.05, 0.58, 0.52, bodyMat, 0, 0.72, 0);
  addBox(root, 0.7, 0.28, 0.48, bellyMat, 0.05, 0.52, 0);

  addBox(root, 0.28, 0.32, 0.28, bodyMat, 0.58, 0.95, 0);
  addBox(root, 0.38, 0.34, 0.34, faceMat, 0.82, 1.08, 0);
  addBox(root, 0.22, 0.16, 0.22, bellyMat, 1.05, 0.96, 0);

  addBox(root, 0.1, 0.14, 0.06, bodyMat, 0.72, 1.28, 0.16);
  addBox(root, 0.1, 0.14, 0.06, bodyMat, 0.72, 1.28, -0.16);

  for (const side of [0.12, -0.12] as const) {
    addBox(root, 0.08, 0.22, 0.08, hornMat, 0.78, 1.38, side);
    addBox(root, 0.07, 0.16, 0.07, hornMat, 0.72, 1.52, side * 1.15);
  }

  const legY = 0.26;
  for (const [lx, lz] of [
    [0.34, 0.16],
    [0.34, -0.16],
    [-0.34, 0.16],
    [-0.34, -0.16],
  ] as const) {
    addBox(root, 0.12, 0.46, 0.12, bodyMat, lx, legY, lz);
    addBox(root, 0.14, 0.08, 0.14, hoofMat, lx, 0.04, lz);
  }

  addBox(root, 0.18, 0.12, 0.1, bodyMat, -0.58, 0.78, 0);

  root.rotation.order = "YXZ";
  return root;
}

/**
 * City pigeon — larger, high-contrast charcoal + white so they read on grey
 * asphalt and in rain (pure black washed out before).
 */
function createPigeonMesh(seed: number): THREE.Group {
  const root = new THREE.Group();
  const body = matLit(0x2c2c30, 0x101018, 0.08);
  const belly = matLit(0xe8e4dc, 0xc8c4bc, 0.22);
  const wingBar = matLit(0xf4f2ee, 0xe8e4dc, 0.28);
  const neck =
    seed % 2 === 0
      ? matLit(0x3a5a52, 0x1a3028, 0.12)
      : matLit(0x4a4a5a, 0x202030, 0.1);
  const beakMat = mat(0xd4883a);
  const eyeMat = matLit(0xfff8e8, 0xffe8a0, 0.35);
  const legMat = mat(0xc87868);

  // ~1.9× prior footprint — still small vs cars, but readable from the cam.
  addBox(root, 0.72, 0.38, 0.42, body, 0, 0.36, 0);
  addBox(root, 0.5, 0.2, 0.36, belly, 0.04, 0.24, 0);
  addBox(root, 0.32, 0.28, 0.28, neck, 0.42, 0.5, 0);
  addBox(root, 0.28, 0.24, 0.24, body, 0.62, 0.56, 0);
  addBox(root, 0.16, 0.1, 0.1, beakMat, 0.82, 0.52, 0);
  addBox(root, 0.07, 0.07, 0.07, eyeMat, 0.66, 0.64, 0.1);
  addBox(root, 0.07, 0.07, 0.07, eyeMat, 0.66, 0.64, -0.1);

  addBox(root, 0.36, 0.08, 0.24, body, -0.48, 0.36, 0);
  addBox(root, 0.18, 0.06, 0.2, belly, -0.42, 0.3, 0);

  addBox(root, 0.05, 0.2, 0.05, legMat, 0.06, 0.1, 0.09);
  addBox(root, 0.05, 0.2, 0.05, legMat, 0.06, 0.1, -0.09);

  const leftWing = new THREE.Group();
  leftWing.name = "wing";
  addBox(leftWing, 0.5, 0.06, 0.32, body, 0, 0, 0.2);
  addBox(leftWing, 0.36, 0.05, 0.14, wingBar, -0.02, 0.02, 0.26);
  leftWing.position.set(0, 0.4, 0);
  root.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.name = "wing";
  addBox(rightWing, 0.5, 0.06, 0.32, body, 0, 0, -0.2);
  addBox(rightWing, 0.36, 0.05, 0.14, wingBar, -0.02, 0.02, -0.26);
  rightWing.position.set(0, 0.4, 0);
  root.add(rightWing);

  root.userData.wings = [leftWing, rightWing];
  root.rotation.order = "YXZ";
  return root;
}

/** Forest deer — slender body, long legs, imposing antler rack. */
function createDeerMesh(seed: number): THREE.Group {
  const root = new THREE.Group();
  const coat =
    seed % 3 === 0 ? 0x8a6238 : seed % 3 === 1 ? 0x6e4a2c : 0xa07848;
  const bodyMat = mat(coat);
  const bellyMat = mat(0xd4c4a8);
  const antlerMat = mat(0xc8b898);
  const hoofMat = mat(0x2a2018);
  const noseMat = mat(0x3a3028);

  addBox(root, 1.15, 0.55, 0.48, bodyMat, 0, 0.95, 0);
  addBox(root, 0.75, 0.28, 0.42, bellyMat, 0.05, 0.78, 0);

  addBox(root, 0.22, 0.42, 0.22, bodyMat, 0.62, 1.2, 0);
  addBox(root, 0.36, 0.32, 0.32, bodyMat, 0.88, 1.38, 0);
  addBox(root, 0.18, 0.12, 0.16, noseMat, 1.12, 1.3, 0);
  addBox(root, 0.08, 0.14, 0.05, bodyMat, 0.78, 1.55, 0.14);
  addBox(root, 0.08, 0.14, 0.05, bodyMat, 0.78, 1.55, -0.14);

  // Antler forks — scaled ~2.5× for a much bigger rack
  for (const side of [0.14, -0.14] as const) {
    addBox(root, 0.12, 0.7, 0.12, antlerMat, 0.78, 1.9, side);
    addBox(root, 0.42, 0.1, 0.1, antlerMat, 0.92, 2.18, side * 1.6);
    addBox(root, 0.1, 0.28, 0.1, antlerMat, 1.08, 2.32, side * 1.85);
  }

  const legY = 0.38;
  for (const [lx, lz] of [
    [0.36, 0.14],
    [0.36, -0.14],
    [-0.38, 0.14],
    [-0.38, -0.14],
  ] as const) {
    addBox(root, 0.1, 0.72, 0.1, bodyMat, lx, legY, lz);
    addBox(root, 0.12, 0.08, 0.12, hoofMat, lx, 0.04, lz);
  }

  addBox(root, 0.28, 0.1, 0.08, bodyMat, -0.68, 1.02, 0);

  root.rotation.order = "YXZ";
  return root;
}

/** Harbor shore crab — wide body, claws forward, stubby legs. */
function createCrabMesh(seed: number): THREE.Group {
  const root = new THREE.Group();
  const shell =
    seed % 3 === 0 ? 0xc45a2e : seed % 3 === 1 ? 0xa84828 : 0xd47840;
  const shellMat = mat(shell);
  const clawMat = mat(seed % 2 === 0 ? 0xb05028 : 0x8a3c20);
  const eyeMat = mat(0x1a1816);
  const legMat = mat(0x8a4030);

  addBox(root, 0.55, 0.18, 0.42, shellMat, 0, 0.16, 0);
  addBox(root, 0.4, 0.1, 0.32, shellMat, 0.02, 0.26, 0);

  // Claws (forward = +X)
  addBox(root, 0.22, 0.1, 0.14, clawMat, 0.38, 0.18, 0.22);
  addBox(root, 0.16, 0.12, 0.16, clawMat, 0.52, 0.2, 0.24);
  addBox(root, 0.22, 0.1, 0.14, clawMat, 0.38, 0.18, -0.22);
  addBox(root, 0.16, 0.12, 0.16, clawMat, 0.52, 0.2, -0.24);

  addBox(root, 0.06, 0.08, 0.06, eyeMat, 0.22, 0.3, 0.1);
  addBox(root, 0.06, 0.08, 0.06, eyeMat, 0.22, 0.3, -0.1);

  for (const [lx, lz] of [
    [-0.08, 0.28],
    [0.08, 0.3],
    [-0.08, -0.28],
    [0.08, -0.3],
    [-0.22, 0.18],
    [-0.22, -0.18],
  ] as const) {
    addBox(root, 0.06, 0.08, 0.18, legMat, lx, 0.06, lz);
  }

  root.rotation.order = "YXZ";
  return root;
}

/** Canyon rattlesnake — long segmented body, wedge head, ground-hugging. */
function createSnakeMesh(seed: number): THREE.Group {
  const root = new THREE.Group();
  const coat =
    seed % 3 === 0 ? 0x8a7a48 : seed % 3 === 1 ? 0x6a5a38 : 0xa09058;
  const band =
    seed % 3 === 0 ? 0x4a4030 : seed % 3 === 1 ? 0x3a3020 : 0x5a4830;
  const belly = 0xc8b888;
  const bodyMat = mat(coat);
  const bandMat = mat(band);
  const bellyMat = mat(belly);
  const eyeMat = mat(0x1a1810);
  const tongueMat = mat(0xc04040);

  const segments: THREE.Object3D[] = [];
  // Body runs along +X (nose forward). Tail toward −X.
  // ~11 segments spanning ~2.0 units (was 8 / ~1.4).
  const segs: { x: number; w: number; h: number; d: number; band: boolean }[] = [
    { x: 1.05, w: 0.28, h: 0.16, d: 0.22, band: false }, // head
    { x: 0.82, w: 0.22, h: 0.14, d: 0.18, band: true },
    { x: 0.6, w: 0.24, h: 0.15, d: 0.2, band: false },
    { x: 0.38, w: 0.22, h: 0.14, d: 0.18, band: true },
    { x: 0.16, w: 0.22, h: 0.14, d: 0.18, band: false },
    { x: -0.06, w: 0.2, h: 0.13, d: 0.16, band: true },
    { x: -0.28, w: 0.19, h: 0.125, d: 0.15, band: false },
    { x: -0.48, w: 0.17, h: 0.115, d: 0.14, band: true },
    { x: -0.66, w: 0.14, h: 0.1, d: 0.12, band: false },
    { x: -0.82, w: 0.11, h: 0.085, d: 0.1, band: true },
    { x: -0.95, w: 0.08, h: 0.07, d: 0.08, band: false }, // tip
  ];

  for (const s of segs) {
    const g = new THREE.Group();
    const baseY = s.h * 0.5 + 0.02;
    g.position.set(s.x, baseY, 0);
    g.userData.baseY = baseY;
    addBox(g, s.w, s.h, s.d, s.band ? bandMat : bodyMat, 0, 0, 0);
    addBox(g, s.w * 0.7, s.h * 0.35, s.d * 0.85, bellyMat, 0, -s.h * 0.28, 0);
    root.add(g);
    segments.push(g);
  }

  // Eyes + forked tongue on head (first segment)
  const head = segments[0]!;
  addBox(head, 0.04, 0.04, 0.04, eyeMat, 0.08, 0.06, 0.1);
  addBox(head, 0.04, 0.04, 0.04, eyeMat, 0.08, 0.06, -0.1);
  addBox(head, 0.12, 0.03, 0.03, tongueMat, 0.2, -0.02, 0);
  addBox(head, 0.06, 0.02, 0.02, tongueMat, 0.28, -0.02, 0.03);
  addBox(head, 0.06, 0.02, 0.02, tongueMat, 0.28, -0.02, -0.03);

  root.userData.segments = segments;
  root.rotation.order = "YXZ";
  return root;
}

const COW_SPEC: HerdSpec = {
  trackId: MEADOW_TRACK_ID,
  habitat: "infield",
  groupName: "meadow-cows",
  hitName: "COW",
  createMesh: createCowMesh,
  burstColors: [0xff6a2e, 0xffc857, 0xff3b2e, 0xffeeaa, 0x888888, 0xefefe8],
};

const GOAT_SPEC: HerdSpec = {
  trackId: SUMMIT_TRACK_ID,
  habitat: "outfield",
  groupName: "summit-goats",
  hitName: "GOAT",
  createMesh: createGoatMesh,
  burstColors: [0xff6a2e, 0xffc857, 0xff3b2e, 0xffeeaa, 0x9a9690, 0xc8c4bc],
};

const PIGEON_SPEC: HerdSpec = {
  trackId: CITY_TRACK_ID,
  habitat: "outfield",
  groupName: "city-pigeons",
  hitName: "PIGEON",
  createMesh: createPigeonMesh,
  burstColors: [0xff6a2e, 0xffc857, 0xff3b2e, 0xffeeaa, 0x2c2c30, 0xf4f2ee, 0xe8e4dc],
  aerial: true,
  hitDist: SMALL_HIT_DIST,
  wanderSpeed: 1.85,
  approachSpeed: 3.2,
  crossSpeed: 3.8,
  outfieldFar: CITY_OUTFIELD_FAR,
};

const DEER_SPEC: HerdSpec = {
  trackId: FOREST_TRACK_ID,
  habitat: "outfield",
  groupName: "forest-deer",
  hitName: "DEER",
  createMesh: createDeerMesh,
  burstColors: [0xff6a2e, 0xffc857, 0xff3b2e, 0xffeeaa, 0x8a6238, 0xd4c4a8],
  wanderSpeed: 1.35,
  approachSpeed: 1.7,
  crossSpeed: 2.2,
};

const CRAB_SPEC: HerdSpec = {
  trackId: HARBOR_TRACK_ID,
  habitat: "outfield",
  groupName: "harbor-crabs",
  hitName: "CRAB",
  createMesh: createCrabMesh,
  burstColors: [0xff6a2e, 0xffc857, 0xff3b2e, 0xffeeaa, 0xc45a2e, 0xd47840],
  hitDist: SMALL_HIT_DIST,
  wanderSpeed: 0.85,
  approachSpeed: 1.15,
  crossSpeed: 1.45,
  outfieldFar: SHORE_OUTFIELD_FAR,
};

const SNAKE_SPEC: HerdSpec = {
  trackId: CANYON_TRACK_ID,
  habitat: "outfield",
  groupName: "canyon-snakes",
  hitName: "SNAKE",
  createMesh: createSnakeMesh,
  burstColors: [0xff6a2e, 0xffc857, 0xff3b2e, 0xffeeaa, 0x8a7a48, 0xc8b888],
  slither: true,
  hitDist: SMALL_HIT_DIST,
  wanderSpeed: 0.95,
  approachSpeed: 1.25,
  crossSpeed: 1.65,
  outfieldNear: SNAKE_SHOULDER_NEAR,
  outfieldFar: SNAKE_OUTFIELD_FAR,
};

const ALL_SPECS: HerdSpec[] = [
  COW_SPEC,
  GOAT_SPEC,
  PIGEON_SPEC,
  DEER_SPEC,
  CRAB_SPEC,
  SNAKE_SPEC,
];

type PathQuery = {
  path: THREE.CatmullRomCurve3;
  samples: THREE.Vector3[];
  insideLoop: (x: number, z: number) => boolean;
  minDist2: (x: number, z: number) => number;
  nearestT: (x: number, z: number) => number;
  pointAt: (t: number) => THREE.Vector3;
  normalAt: (t: number) => THREE.Vector3;
};

function buildPathQuery(path: THREE.CatmullRomCurve3): PathQuery {
  const sampleN = 640;
  const samples: THREE.Vector3[] = [];
  for (let i = 0; i < sampleN; i++) samples.push(path.getPointAt(i / sampleN));

  const BIN = 16;
  const bins = new Map<string, number[]>();
  for (let i = 0; i < sampleN; i++) {
    const p = samples[i]!;
    const key = `${Math.floor(p.x / BIN)},${Math.floor(p.z / BIN)}`;
    let list = bins.get(key);
    if (!list) {
      list = [];
      bins.set(key, list);
    }
    list.push(i);
  }

  const minDist2 = (x: number, z: number) => {
    const bx = Math.floor(x / BIN);
    const bz = Math.floor(z / BIN);
    let best = Infinity;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const list = bins.get(`${bx + dx},${bz + dz}`);
        if (!list) continue;
        for (const i of list) {
          const p = samples[i]!;
          const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
          if (d < best) best = d;
        }
      }
    }
    return best;
  };

  const insideLoop = (x: number, z: number) => {
    let inside = false;
    for (let i = 0, j = sampleN - 1; i < sampleN; j = i++) {
      const pi = samples[i]!;
      const pj = samples[j]!;
      const zi = pi.z;
      const zj = pj.z;
      if (zi > z === zj > z) continue;
      const xHit = ((pj.x - pi.x) * (z - zi)) / (zj - zi + 1e-12) + pi.x;
      if (x < xHit) inside = !inside;
    }
    return inside;
  };

  const nearestT = (x: number, z: number) => {
    let bestI = 0;
    let best = Infinity;
    const bx = Math.floor(x / BIN);
    const bz = Math.floor(z / BIN);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const list = bins.get(`${bx + dx},${bz + dz}`);
        if (!list) continue;
        for (const i of list) {
          const p = samples[i]!;
          const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
          if (d < best) {
            best = d;
            bestI = i;
          }
        }
      }
    }
    return bestI / sampleN;
  };

  const _pt = new THREE.Vector3();
  const _tan = new THREE.Vector3();
  const _nrm = new THREE.Vector3();

  return {
    path,
    samples,
    insideLoop,
    minDist2,
    nearestT,
    pointAt: (t) => path.getPointAt(((t % 1) + 1) % 1, _pt).clone(),
    normalAt: (t) => {
      const tan = path.getTangentAt(((t % 1) + 1) % 1, _tan).normalize();
      return _nrm.set(-tan.z, 0, tan.x).clone();
    },
  };
}

function infieldOk(q: PathQuery, x: number, z: number) {
  return q.insideLoop(x, z) && q.minDist2(x, z) >= ZONE_CLEAR * ZONE_CLEAR;
}

function outfieldOk(
  q: PathQuery,
  x: number,
  z: number,
  far = OUTFIELD_FAR,
  near = ZONE_CLEAR,
) {
  if (q.insideLoop(x, z)) return false;
  const d2 = q.minDist2(x, z);
  return d2 >= near * near && d2 <= far * far;
}

function zoneOk(
  q: PathQuery,
  habitat: Habitat,
  x: number,
  z: number,
  outfieldFar = OUTFIELD_FAR,
  outfieldNear = ZONE_CLEAR,
) {
  return habitat === "infield"
    ? infieldOk(q, x, z)
    : outfieldOk(q, x, z, outfieldFar, outfieldNear);
}

function collectInfieldSpawns(q: PathQuery, count: number): { x: number; z: number }[] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of q.samples) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const step = 9;
  const cand: { x: number; z: number; i: number }[] = [];
  let attempt = 0;
  for (let gx = minX; gx <= maxX; gx += step) {
    for (let gz = minZ; gz <= maxZ; gz += step) {
      attempt += 1;
      const x = gx + (hash2(attempt, 3) - 0.5) * step * 0.8;
      const z = gz + (hash2(attempt, 5) - 0.5) * step * 0.8;
      if (!infieldOk(q, x, z)) continue;
      cand.push({ x, z, i: attempt });
    }
  }
  return pickSpawns(cand, count);
}

/** Spawn along the outer fringe — trees / sidewalks / shore / rocks / shoulder. */
function collectOutfieldSpawns(
  q: PathQuery,
  count: number,
  far = OUTFIELD_FAR,
  near = ZONE_CLEAR,
): { x: number; z: number }[] {
  const cand: { x: number; z: number; i: number }[] = [];
  const step = 8;
  let attempt = 0;
  for (let i = 0; i < q.samples.length; i += step) {
    const t = i / q.samples.length;
    const p = q.samples[i]!;
    const n = q.normalAt(t);
    const inProbe = q.insideLoop(p.x + n.x * 4, p.z + n.z * 4);
    const outSign = inProbe ? -1 : 1;
    for (let k = 0; k < 4; k++) {
      attempt += 1;
      // Mix shoulder-huggers (near sand runoff) with deeper rock/fringe sitters.
      const shoulderBias = near < ZONE_CLEAR - 0.5;
      const useShoulder = shoulderBias && hash2(attempt, 47) < 0.5;
      const lat = useShoulder
        ? near + 0.4 + hash2(attempt, 41) * Math.max(2.5, Math.min(5, ZONE_CLEAR - near))
        : near +
          (shoulderBias ? 6 : 3) +
          hash2(attempt, 41) * Math.max(4, far - near - (shoulderBias ? 10 : 6));
      const along = (hash2(attempt, 43) - 0.5) * 10;
      const tanX = -n.z;
      const tanZ = n.x;
      const x = p.x + n.x * outSign * lat + tanX * along;
      const z = p.z + n.z * outSign * lat + tanZ * along;
      if (!outfieldOk(q, x, z, far, near)) continue;
      cand.push({ x, z, i: attempt });
    }
  }
  return pickSpawns(cand, count);
}

function pickSpawns(
  cand: { x: number; z: number; i: number }[],
  count: number,
): { x: number; z: number }[] {
  if (!cand.length) return [];
  const out: { x: number; z: number }[] = [];
  const minSep2 = 12 * 12;
  const pool = cand.slice();
  for (let n = 0; n < count && pool.length; n++) {
    const idx = Math.floor(hash2(n + 11, 19) * pool.length) % pool.length;
    const pick = pool.splice(idx, 1)[0]!;
    let ok = true;
    for (const p of out) {
      const dx = p.x - pick.x;
      const dz = p.z - pick.z;
      if (dx * dx + dz * dz < minSep2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    out.push({ x: pick.x, z: pick.z });
  }
  let guard = 0;
  while (out.length < count && pool.length && guard++ < 64) {
    const pick = pool.pop()!;
    out.push({ x: pick.x, z: pick.z });
  }
  guard = 0;
  while (out.length < count && cand.length && guard++ < 64) {
    const pick = cand[out.length % cand.length]!;
    out.push({ x: pick.x, z: pick.z });
  }
  return out;
}

function collectSpawns(
  q: PathQuery,
  habitat: Habitat,
  count: number,
  outfieldFar = OUTFIELD_FAR,
  outfieldNear = ZONE_CLEAR,
): { x: number; z: number }[] {
  return habitat === "infield"
    ? collectInfieldSpawns(q, count)
    : collectOutfieldSpawns(q, count, outfieldFar, outfieldNear);
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number) {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

/** Shortest wrapped distance on the unit path interval [0, 1). */
function pathDeltaT(a: number, b: number) {
  let d = Math.abs((((a - b) % 1) + 1) % 1);
  if (d > 0.5) d = 1 - d;
  return d;
}

function isRoadActive(mode: AnimalMode) {
  return mode === "approach" || mode === "cross" || mode === "return";
}

function readWings(mesh: THREE.Group): THREE.Object3D[] {
  const w = mesh.userData.wings;
  return Array.isArray(w) ? (w as THREE.Object3D[]) : [];
}

function specForTrack(trackId: string): HerdSpec | null {
  return ALL_SPECS.find((s) => s.trackId === trackId) ?? null;
}

export class WildlifeHerd {
  readonly group = new THREE.Group();
  private readonly q: PathQuery;
  private readonly spec: HerdSpec;
  private readonly animals: Animal[] = [];
  private crossCooldown = CROSS_GAP_MIN + Math.random() * (CROSS_GAP_MAX - CROSS_GAP_MIN);
  private readonly bursts: BurstPart[] = [];
  private readonly burstGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  private burstLight: THREE.PointLight | null = null;

  private constructor(path: THREE.CatmullRomCurve3, spec: HerdSpec) {
    this.spec = spec;
    this.group.name = spec.groupName;
    this.q = buildPathQuery(path);
    const far = spec.outfieldFar ?? OUTFIELD_FAR;
    const near = spec.outfieldNear ?? ZONE_CLEAR;
    const spawns = collectSpawns(this.q, spec.habitat, WANDER_COUNT, far, near);
    for (let i = 0; i < spawns.length; i++) {
      const s = spawns[i]!;
      const mesh = spec.createMesh(i);
      const heading = hash2(i, 7) * Math.PI * 2;
      mesh.position.set(s.x, 0, s.z);
      mesh.rotation.y = heading + MESH_YAW_OFFSET;
      this.group.add(mesh);
      this.animals.push({
        mesh,
        mode: "wander",
        x: s.x,
        z: s.z,
        heading,
        targetX: s.x,
        targetZ: s.z,
        crossT: 0,
        crossSign: 1,
        crossLat: spec.habitat === "infield" ? 1 : -1,
        respawnIn: 0,
        walkPhase: hash2(i, 13) * Math.PI * 2,
        seed: i,
        wings: readWings(mesh),
      });
      this.pickWanderTarget(this.animals[i]!);
    }
  }

  static createForTrack(
    trackId: string,
    path: THREE.CatmullRomCurve3,
  ): WildlifeHerd | null {
    const spec = specForTrack(trackId);
    if (!spec) return null;
    const herd = new WildlifeHerd(path, spec);
    if (!herd.animals.length) return null;
    return herd;
  }

  update(
    dt: number,
    vehicles: AnimalHitTarget[],
    onHit?: (info: AnimalHitInfo) => void,
  ) {
    this.updateBursts(dt);
    if (this.activeCrossingCount() < MAX_CROSSINGS) {
      this.crossCooldown -= dt;
      if (this.crossCooldown <= 0) this.tryStartCrossing();
    }

    for (let i = 0; i < this.animals.length; i++) {
      const animal = this.animals[i]!;
      if (animal.mode === "dead") {
        animal.respawnIn -= dt;
        if (animal.respawnIn <= 0) this.respawnAnimal(animal);
        continue;
      }
      this.stepAnimal(animal, dt);
      this.syncMesh(animal, dt);

      if (
        animal.mode === "approach" ||
        animal.mode === "cross" ||
        animal.mode === "return"
      ) {
        for (const v of vehicles) {
          if (this.tryHit(animal, v, onHit)) break;
        }
      }
    }
  }

  dispose() {
    this.clearBursts();
    this.burstGeo.dispose();
    this.group.removeFromParent();
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of list) m?.dispose();
    });
    this.animals.length = 0;
  }

  private farLimit() {
    return this.spec.outfieldFar ?? OUTFIELD_FAR;
  }

  private nearLimit() {
    return this.spec.outfieldNear ?? ZONE_CLEAR;
  }

  private wanderSpeed() {
    return this.spec.wanderSpeed ?? WANDER_SPEED;
  }

  private approachSpeed() {
    return this.spec.approachSpeed ?? APPROACH_SPEED;
  }

  private crossSpeed() {
    return this.spec.crossSpeed ?? CROSS_SPEED;
  }

  private hitDist() {
    return this.spec.hitDist ?? HIT_DIST;
  }

  private pickWanderTarget(animal: Animal) {
    const t = this.q.nearestT(animal.x, animal.z);
    const habitat = this.spec.habitat;
    const far = this.farLimit();
    const near = this.nearLimit();
    // Pigeons walk between nearby sidewalk spots; others roam farther.
    const aerial = !!this.spec.aerial;
    for (let tries = 0; tries < 24; tries++) {
      const ang = hash2(animal.seed * 17 + tries, 29) * Math.PI * 2;
      const dist = aerial
        ? 2.5 + hash2(animal.seed + tries, 31) * 7
        : 8 + hash2(animal.seed + tries, 31) * 18;
      const x = animal.x + Math.sin(ang) * dist;
      const z = animal.z + Math.cos(ang) * dist;
      if (!zoneOk(this.q, habitat, x, z, far, near)) continue;
      // Stay off asphalt; shoulder sitters may go closer than ZONE_CLEAR.
      if (this.q.minDist2(x, z) < (near + 0.5) ** 2) continue;
      animal.targetX = x;
      animal.targetZ = z;
      return;
    }
    const p = this.q.pointAt((t + 0.15) % 1);
    const n = this.q.normalAt((t + 0.15) % 1);
    const inProbe = this.q.insideLoop(p.x + n.x * 4, p.z + n.z * 4);
    const inSign = inProbe ? 1 : -1;
    // Prefer a mix: sometimes return to sand shoulder, sometimes deeper rocks.
    const shoulder = near < ZONE_CLEAR - 0.5 && hash2(animal.seed, 61) < 0.55;
    const lat =
      habitat === "infield"
        ? inSign * (ZONE_CLEAR + 8)
        : -inSign * (shoulder ? near + 2.5 : near + 12);
    animal.targetX = p.x + n.x * lat;
    animal.targetZ = p.z + n.z * lat;
  }

  private activeCrossingCount() {
    let n = 0;
    for (const a of this.animals) if (isRoadActive(a.mode)) n++;
    return n;
  }

  private activeCrossingTs(): number[] {
    const ts: number[] = [];
    for (const a of this.animals) if (isRoadActive(a.mode)) ts.push(a.crossT);
    return ts;
  }

  private tryStartCrossing() {
    if (this.activeCrossingCount() >= MAX_CROSSINGS) {
      this.crossCooldown = 2;
      return;
    }
    const live = this.animals.filter((a) => a.mode === "wander");
    if (!live.length) {
      this.crossCooldown = 3;
      return;
    }

    const activeTs = this.activeCrossingTs();
    const scored = live.map((a) => {
      const t = this.q.nearestT(a.x, a.z);
      const sep =
        activeTs.length === 0
          ? 1
          : Math.min(...activeTs.map((at) => pathDeltaT(t, at)));
      return { a, t, sep, nearRoad: this.q.minDist2(a.x, a.z) };
    });

    let pool = scored.filter(
      (c) => activeTs.length === 0 || c.sep >= CROSS_SEP_T,
    );

    // Steer a second/third crossing toward an open path-T slot when needed.
    if (!pool.length && activeTs.length > 0) {
      const targetT = (activeTs[0]! + 0.5) % 1;
      const pOpp = this.q.pointAt(targetT);
      let best = scored[0]!;
      let bestD = Infinity;
      for (const c of scored) {
        const d =
          (c.a.x - pOpp.x) * (c.a.x - pOpp.x) +
          (c.a.z - pOpp.z) * (c.a.z - pOpp.z);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      pool = [{ ...best, t: targetT, sep: 0.5 }];
    }

    if (!pool.length) {
      this.crossCooldown = 2.5;
      return;
    }

    pool.sort((a, b) => a.nearRoad - b.nearRoad);
    const pickEntry =
      pool[
        Math.min(pool.length - 1, Math.floor(Math.random() * Math.min(3, pool.length)))
      ]!;
    const pick = pickEntry.a;
    const t = pickEntry.t;
    const p = this.q.pointAt(t);
    const n = this.q.normalAt(t);
    const inProbe = this.q.insideLoop(p.x + n.x * 4, p.z + n.z * 4);
    const sign = inProbe ? 1 : -1;
    const fromOutfield = this.spec.habitat === "outfield";
    const startLat = fromOutfield ? -1 : 1;
    const edgeX = p.x + n.x * sign * startLat * ROAD_EDGE;
    const edgeZ = p.z + n.z * sign * startLat * ROAD_EDGE;

    pick.mode = "approach";
    pick.crossT = t;
    pick.crossSign = sign;
    pick.crossLat = startLat;
    pick.targetX = edgeX;
    pick.targetZ = edgeZ;
    this.crossCooldown =
      CROSS_GAP_MIN + Math.random() * (CROSS_GAP_MAX - CROSS_GAP_MIN);
  }

  private stepAnimal(animal: Animal, dt: number) {
    const wanderSpd = this.wanderSpeed();
    const aerial = !!this.spec.aerial;
    if (animal.mode === "wander") {
      this.moveToward(animal, animal.targetX, animal.targetZ, wanderSpd, dt);
      const dx = animal.targetX - animal.x;
      const dz = animal.targetZ - animal.z;
      const arrive = aerial ? 1.1 : 2.5;
      if (dx * dx + dz * dz < arrive * arrive) this.pickWanderTarget(animal);
      if (!zoneOk(this.q, this.spec.habitat, animal.x, animal.z, this.farLimit(), this.nearLimit())) {
        this.pickWanderTarget(animal);
        this.moveToward(
          animal,
          animal.targetX,
          animal.targetZ,
          wanderSpd * 1.4,
          dt,
        );
      }
      return;
    }

    if (animal.mode === "approach") {
      this.moveToward(
        animal,
        animal.targetX,
        animal.targetZ,
        this.approachSpeed(),
        dt,
      );
      const dx = animal.targetX - animal.x;
      const dz = animal.targetZ - animal.z;
      if (dx * dx + dz * dz < 1.2) {
        animal.mode = "cross";
        animal.crossLat = this.spec.habitat === "outfield" ? -1 : 1;
      }
      return;
    }

    if (animal.mode === "cross" || animal.mode === "return") {
      const base = this.crossSpeed();
      const speed = animal.mode === "cross" ? base : base * 0.9;
      const fromOutfield = this.spec.habitat === "outfield";
      const crossDir = fromOutfield ? 1 : -1;
      const dir = animal.mode === "cross" ? crossDir : -crossDir;
      const span = ROAD_EDGE * 2 + 2.5;
      animal.crossLat += dir * ((speed * dt) / (span * 0.5));
      const p = this.q.pointAt(animal.crossT);
      const n = this.q.normalAt(animal.crossT);
      const lat = animal.crossLat * (ROAD_EDGE + 1.2);
      animal.x = p.x + n.x * animal.crossSign * lat;
      animal.z = p.z + n.z * animal.crossSign * lat;
      animal.heading = yawToward(
        animal.x,
        animal.z,
        animal.x + n.x * animal.crossSign * dir,
        animal.z + n.z * animal.crossSign * dir,
      );

      const crossed =
        animal.mode === "cross" &&
        (fromOutfield ? animal.crossLat >= 1 : animal.crossLat <= -1);
      const returned =
        animal.mode === "return" &&
        (fromOutfield ? animal.crossLat <= -1 : animal.crossLat >= 1);

      if (crossed) {
        animal.mode = "return";
        animal.crossLat = fromOutfield ? 1 : -1;
      } else if (returned) {
        animal.mode = "wander";
        const deep = this.q.pointAt(animal.crossT);
        const nn = this.q.normalAt(animal.crossT);
        const near = this.nearLimit();
        // Snakes often settle back on the sand shoulder; others go deeper.
        const shoulderHome =
          near < ZONE_CLEAR - 0.5 && hash2(animal.seed + 3, 71) < 0.6;
        const homeLat = fromOutfield
          ? -(shoulderHome ? near + 2 : ZONE_CLEAR + 6)
          : ZONE_CLEAR + 4;
        animal.x = deep.x + nn.x * animal.crossSign * homeLat;
        animal.z = deep.z + nn.z * animal.crossSign * homeLat;
        this.pickWanderTarget(animal);
      }
    }
  }

  private moveToward(
    animal: Animal,
    tx: number,
    tz: number,
    speed: number,
    dt: number,
  ) {
    const dx = tx - animal.x;
    const dz = tz - animal.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return;
    const step = Math.min(dist, speed * dt);
    animal.x += (dx / dist) * step;
    animal.z += (dz / dist) * step;
    const want = Math.atan2(dx, dz);
    let dh = want - animal.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    animal.heading += THREE.MathUtils.clamp(dh, -2.4 * dt, 2.4 * dt);
  }

  private syncMesh(animal: Animal, dt: number) {
    const onRoad = isRoadActive(animal.mode);
    const aerial = !!this.spec.aerial;
    const slither = !!this.spec.slither;
    animal.walkPhase +=
      dt *
      (slither
        ? onRoad
          ? 7.5
          : 5.2
        : aerial && onRoad
          ? 14
          : animal.mode === "wander"
            ? 4.2
            : 5.5);

    let y = Math.sin(animal.walkPhase) * (slither ? 0.01 : aerial ? 0.03 : 0.04);
    let pitch = 0;
    if (aerial && onRoad) {
      // Fly: rise on approach, arc peaking mid-road, then descend off asphalt.
      if (animal.mode === "approach") {
        const dist = Math.hypot(
          animal.targetX - animal.x,
          animal.targetZ - animal.z,
        );
        const rise = THREE.MathUtils.clamp(1 - dist / 18, 0.25, 1);
        y = 0.55 + rise * 0.95 + Math.sin(animal.walkPhase * 2.1) * 0.15;
        pitch = -0.18 * rise;
      } else {
        // |crossLat| 1 → road edge, 0 → centerline.
        const edgeProx = Math.min(1, Math.abs(animal.crossLat));
        const arc = 1 - edgeProx * edgeProx;
        y = 0.7 + arc * 1.35 + Math.sin(animal.walkPhase * 2.4) * 0.16;
        pitch = animal.mode === "return" ? 0.12 : -0.1;
      }
    }

    animal.mesh.position.set(animal.x, y, animal.z);
    animal.mesh.rotation.y = animal.heading + MESH_YAW_OFFSET;
    animal.mesh.rotation.x = pitch;
    animal.mesh.rotation.z = Math.sin(animal.walkPhase) * (aerial ? 0.1 : slither ? 0.12 : 0.05);
    animal.mesh.visible = true;

    if (animal.wings.length) {
      let flap = 0;
      if (aerial && onRoad) {
        flap = Math.sin(animal.walkPhase * 2.8) * 0.95;
      } else if (aerial) {
        // Folded while walking the sidewalk.
        flap = 0.06;
      } else {
        flap = Math.sin(animal.walkPhase * 1.2) * 0.25;
      }
      animal.wings[0]!.rotation.x = flap;
      if (animal.wings[1]) animal.wings[1]!.rotation.x = -flap;
    }

    const segs = animal.mesh.userData.segments as THREE.Object3D[] | undefined;
    if (slither && Array.isArray(segs)) {
      const amp = onRoad ? 0.1 : 0.06;
      // Head up while slithering; low when nearly idle near a wander target.
      const toTarget2 =
        (animal.targetX - animal.x) ** 2 + (animal.targetZ - animal.z) ** 2;
      const walking =
        onRoad || (animal.mode === "wander" && toTarget2 > 1.0);
      const headUp = onRoad ? 1 : walking ? 0.7 : 0.08;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i]!;
        const baseY = (s.userData.baseY as number) ?? s.position.y;
        s.position.z = Math.sin(animal.walkPhase + i * 0.85) * amp;
        // Neck cascade: head + next two segments lift / pitch up.
        const neckT = i < 3 ? (1 - i / 3) * headUp : 0;
        s.position.y = baseY + neckT * 0.14;
        // +Z rotation tips local +X (nose) toward +Y.
        s.rotation.z = neckT * (i === 0 ? 0.42 : 0.18);
      }
    }
  }

  private tryHit(
    animal: Animal,
    v: AnimalHitTarget,
    onHit?: (info: AnimalHitInfo) => void,
  ): boolean {
    const dist = this.hitDist();
    const dx = v.state.position.x - animal.x;
    const dz = v.state.position.z - animal.z;
    if (dx * dx + dz * dz > dist * dist) return false;
    if (Math.abs(v.state.speed) < 2.5) return false;

    this.explodeAnimal(animal);
    const keep =
      Math.sign(v.state.speed || 1) *
      Math.max(HIT_SPEED_FLOOR, Math.abs(v.state.speed) * HIT_SPEED_KEEP);
    v.state.speed = keep;
    v.animalHitPenalty = Math.max(v.animalHitPenalty, HIT_DRIVE_PENALTY);
    v.syncCollision();
    onHit?.({ name: this.spec.hitName, target: v });
    return true;
  }

  private explodeAnimal(animal: Animal) {
    const ox = animal.x;
    const oz = animal.z;
    animal.mode = "dead";
    animal.mesh.visible = false;
    animal.respawnIn = RESPAWN_DELAY;

    const colors = this.spec.burstColors;
    for (let i = 0; i < 16; i++) {
      const m = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length]!,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.burstGeo, m);
      mesh.position.set(
        ox + (Math.random() - 0.5) * 0.7,
        0.4 + Math.random() * 0.5,
        oz + (Math.random() - 0.5) * 0.7,
      );
      mesh.scale.setScalar(0.55 + Math.random() * 0.35);
      const speed = 5 + Math.random() * 9;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        3 + Math.random() * 7,
        (Math.random() - 0.5) * speed,
      );
      this.group.add(mesh);
      this.bursts.push({ mesh, vel, life: 0.35 + Math.random() * 0.4 });
    }
    if (this.burstLight) {
      this.group.remove(this.burstLight);
      this.burstLight = null;
    }
    const light = new THREE.PointLight(0xff7a3a, 4.5, 16);
    light.position.set(ox, 1.6, oz);
    this.group.add(light);
    this.burstLight = light;
  }

  private respawnAnimal(animal: Animal) {
    // Habitat-correct respawn: cows → infield middle; all others → outfield fringe.
    const spawns = collectSpawns(
      this.q,
      this.spec.habitat,
      8,
      this.farLimit(),
      this.nearLimit(),
    );
    const s = spawns[animal.seed % Math.max(1, spawns.length)] ?? {
      x: animal.x,
      z: animal.z,
    };
    let best = s;
    let bestScore = -1;
    for (const cand of spawns) {
      let minD = Infinity;
      for (const other of this.animals) {
        if (other === animal || other.mode === "dead") continue;
        const d = (other.x - cand.x) ** 2 + (other.z - cand.z) ** 2;
        if (d < minD) minD = d;
      }
      if (minD > bestScore) {
        bestScore = minD;
        best = cand;
      }
    }
    animal.x = best.x;
    animal.z = best.z;
    animal.mode = "wander";
    animal.mesh.visible = true;
    this.pickWanderTarget(animal);
    this.syncMesh(animal, 0);
  }

  private updateBursts(dt: number) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const p = this.bursts[i]!;
      p.life -= dt;
      p.vel.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.z += dt * 4;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life * 2.2);
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        mat.dispose();
        this.bursts.splice(i, 1);
      }
    }
    if (this.burstLight) {
      this.burstLight.intensity = Math.max(
        0,
        this.burstLight.intensity - dt * 8,
      );
      if (this.burstLight.intensity <= 0.05) {
        this.group.remove(this.burstLight);
        this.burstLight = null;
      }
    }
  }

  private clearBursts() {
    for (const p of this.bursts) {
      this.group.remove(p.mesh);
      (p.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.bursts.length = 0;
    if (this.burstLight) {
      this.group.remove(this.burstLight);
      this.burstLight = null;
    }
  }
}

/** Back-compat alias used by older call sites. */
export { WildlifeHerd as MeadowCowHerd };
