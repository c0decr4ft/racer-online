import * as THREE from "three";

export type TrackData = {
  group: THREE.Group;
  path: THREE.CatmullRomCurve3;
  startPosition: THREE.Vector3;
  startHeading: number;
  width: number;
};

function yawFromTangent(tangent: THREE.Vector3) {
  return Math.atan2(tangent.x, tangent.z);
}

/**
 * Hand-designed closed circuit (~200x140 footprint), raced counter-clockwise
 * on the map (+X right, +Z up). Flow, starting at SF on the bottom straight:
 *  - long main straight heading +X (SF line + gantry)
 *  - T1: fast sweeping left onto the right side
 *  - short run north with a slight approach kink
 *  - T2: 180° hairpin at top-right
 *  - flowing downhill right-hander through the infield
 *  - long climbing right sweeper up to the top arc
 *  - fast top-left sweeper down the far side
 *  - left-right chicane on the left descent
 *  - smooth final left onto the main straight
 * Control points are well spaced (~14-20 apart) so the CatmullRom loop stays
 * smooth and the road never self-overlaps (min corner radius ≈ 13).
 */
function buildCircuitPoints(): THREE.Vector3[] {
  const raw: [number, number][] = [
    // main straight (heading +X), SF at first point
    [-10, -58], [10, -58], [30, -58], [50, -58],
    // T1: fast sweeping left up the right side
    [68, -54], [82, -42], [88, -24],
    // run north, slight kink into hairpin approach
    [88, -6], [82, 12],
    // T2: hairpin (180° left)
    [78, 24], [76, 42], [63, 49], [50, 42], [48, 26],
    // downhill run + right sweep into the infield (heading -X)
    [46, 12], [38, 0], [24, -8], [8, -8],
    // long climbing right-hander
    [-6, -2], [-16, 10], [-24, 24],
    // sweep up to the top arc (heading -X)
    [-32, 38], [-44, 52], [-60, 60], [-74, 60],
    // top-left sweeper turning south
    [-86, 52], [-93, 38],
    // chicane on the left descent (right-left flick)
    [-96, 24], [-86, 10], [-96, -6], [-94, -22],
    // final smooth left onto the main straight
    [-88, -38], [-80, -50], [-70, -58],
    [-50, -58], [-30, -58],
  ];
  // Stretch to ~200x140 world units
  return raw.map(([x, z]) => new THREE.Vector3(x * 1.07, 0, z * 1.15));
}

function buildRibbon(
  path: THREE.CatmullRomCurve3,
  halfW: number,
  y: number,
  segments: number,
) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) % 1;
    const p = path.getPointAt(u);
    const tan = path.getTangentAt(u).normalize();
    const n = new THREE.Vector3(-tan.z, 0, tan.x);
    const L = p.clone().addScaledVector(n, -halfW);
    const R = p.clone().addScaledVector(n, halfW);
    positions.push(L.x, y, L.z, R.x, y, R.z);
    normals.push(0, 1, 0, 0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

function addTree(group: THREE.Group, x: number, z: number, scale = 1) {
  const treeGreen = new THREE.MeshStandardMaterial({ color: 0x2a8a32, roughness: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 1.2 * scale, 6), trunkMat);
  trunk.position.y = 0.6 * scale;
  tree.add(trunk);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.35 * scale + Math.random() * 0.35, 8, 8),
    treeGreen,
  );
  canopy.position.y = 2.0 * scale;
  canopy.castShadow = true;
  tree.add(canopy);
  tree.position.set(x, 0, z);
  group.add(tree);
}

function addBuilding(
  group: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  rot: number,
  roofColor = 0x8a9098,
) {
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.82 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
  const b = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  b.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 0.22, d * 1.08), roofMat);
  roof.position.y = h + 0.1;
  b.add(roof);
  b.position.set(x, 0, z);
  b.rotation.y = rot;
  group.add(b);
}

export function createTrack(): TrackData {
  const group = new THREE.Group();
  const width = 14;
  const half = width / 2;

  const pts = buildCircuitPoints();
  const path = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.35);

  // Bright map-style grass
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshStandardMaterial({ color: 0x4aa83a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  group.add(ground);

  // Tan sand / gravel runoff
  const runoff = new THREE.Mesh(
    buildRibbon(path, half + 4.8, -0.02, 560),
    new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 1, metalness: 0 }),
  );
  runoff.receiveShadow = true;
  group.add(runoff);

  // Medium-gray asphalt
  const road = new THREE.Mesh(
    buildRibbon(path, half, 0.035, 560),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.92, metalness: 0.04 }),
  );
  road.receiveShadow = true;
  group.add(road);

  // Thin white edge lines
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.7, metalness: 0.05 });
  for (const side of [-1, 1] as const) {
    const samples = 420;
    for (let i = 0; i < samples; i++) {
      const u0 = i / samples;
      const u1 = (i + 1) / samples;
      const p0 = path.getPointAt(u0);
      const p1 = path.getPointAt(u1);
      const tan = path.getTangentAt(u0).normalize();
      const n = new THREE.Vector3(-tan.z, 0, tan.x);
      const mid = p0.clone().lerp(p1, 0.5).addScaledVector(n, side * (half - 0.18));
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, p0.distanceTo(p1) * 1.08), edgeMat);
      seg.position.set(mid.x, 0.055, mid.z);
      seg.rotation.y = yawFromTangent(tan);
      group.add(seg);
    }
  }

  // Start/finish checkered + gantry
  const startP = path.getPointAt(0);
  const startTan = path.getTangentAt(0).normalize();
  const startN = new THREE.Vector3(-startTan.z, 0, startTan.x);
  const yaw0 = yawFromTangent(startTan);

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 2; j++) {
      const col = (i + j) % 2 === 0 ? 0x111111 : 0xffffff;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(width / 10, 0.05, 0.7),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }),
      );
      tile.position
        .copy(startP)
        .addScaledVector(startN, -half + (i + 0.5) * (width / 10))
        .addScaledVector(startTan, (j - 0.5) * 0.7);
      tile.position.y = 0.07;
      tile.rotation.y = yaw0;
      group.add(tile);
    }
  }

  const gantry = new THREE.Group();
  gantry.position.copy(startP);
  gantry.rotation.y = yaw0;
  for (const x of [-half - 1.2, half + 1.2]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 5.5, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x8a909a, metalness: 0.5, roughness: 0.4 }),
    );
    post.position.set(x, 2.75, 0);
    gantry.add(post);
  }
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(width + 4, 0.45, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xff3b2e, metalness: 0.25, roughness: 0.5 }),
  );
  beam.position.set(0, 5.4, 0);
  gantry.add(beam);
  group.add(gantry);

  // Pond in the upper infield, framed by the climbing sweep and the hairpin
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3a9fd8,
    metalness: 0.3,
    roughness: 0.25,
    transparent: true,
    opacity: 0.92,
  });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 7), waterMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(12, 0.02, 28);
  pond.scale.set(9, 7, 1);
  group.add(pond);

  // Trees — around pond, infield clusters, outer perimeter
  const treeSpots: [number, number, number?][] = [
    // around pond
    [4, 34], [22, 22], [20, 36], [2, 20],
    // lower infield (between infield leg and main straight)
    [10, -35, 0.85], [30, -30, 0.8], [-15, -30, 0.9], [40, -42, 0.75],
    // upper infield
    [5, 48, 0.85], [-5, 12, 0.75],
    // perimeter
    [-122, -52], [-126, 55], [-92, 88], [-42, 94], [20, 94],
    [72, 88], [116, 58], [122, -12], [112, -52], [62, -92],
    [2, -94], [-48, -92], [-96, -80],
  ];
  for (const [x, z, s] of treeSpots) {
    addTree(group, x + (Math.random() - 0.5) * 4, z + (Math.random() - 0.5) * 4, s ?? 1);
    if (Math.random() > 0.45) {
      addTree(group, x + (Math.random() - 0.5) * 8, z + (Math.random() - 0.5) * 8, 0.7 + Math.random() * 0.4);
    }
  }

  // Pit building south of SF straight + small buildings outside the loop
  addBuilding(group, 8, -84, 22, 5.5, 2.4, 0, 0x6a7078); // long pit / garage
  addBuilding(group, -62, -86, 6, 4, 2.0, 0.15);
  addBuilding(group, 72, -84, 5, 4, 1.8, -0.2);
  addBuilding(group, 116, 22, 5.5, 4, 2.0, 0.6);
  addBuilding(group, -124, 12, 5, 4, 1.9, -0.5);
  addBuilding(group, -18, 92, 4.5, 3.5, 1.7, 0.3);

  // Small parked cars near the pit and right-side buildings
  const parkColors = [0xe23b2e, 0xf0c020, 0x2a66f0, 0xe8ecf0, 0x888888];
  for (const [x, z, rot, ci] of [
    [112, 34, 0.4, 0],
    [118, 38, 0.5, 1],
    [114, 44, 0.3, 3],
    [-8, -90, 0.1, 0],
    [0, -91, -0.2, 1],
    [26, -90, 0.15, 2],
  ] as const) {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.55, 3.2),
      new THREE.MeshStandardMaterial({ color: parkColors[ci], metalness: 0.4, roughness: 0.5 }),
    );
    car.position.set(x, 0.35, z);
    car.rotation.y = rot;
    car.castShadow = true;
    group.add(car);
  }

  const heading = yawFromTangent(startTan);

  return {
    group,
    path,
    startPosition: startP.clone().addScaledVector(startN, -2.8),
    startHeading: heading,
    width,
  };
}

export function projectOnTrack(
  path: THREE.CatmullRomCurve3,
  position: THREE.Vector3,
  samples = 220,
) {
  let bestT = 0;
  let bestDist = Infinity;
  let bestPoint = new THREE.Vector3();

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const p = path.getPointAt(t);
    const d = p.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      bestPoint.copy(p);
    }
  }

  const step = 1 / samples;
  for (let k = -6; k <= 6; k++) {
    const t = (bestT + k * step * 0.2 + 1) % 1;
    const p = path.getPointAt(t);
    const d = p.distanceToSquared(position);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      bestPoint.copy(p);
    }
  }

  const tangent = path.getTangentAt(bestT).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
  const distanceFromCenter = position.clone().sub(bestPoint).dot(normal);
  return { t: bestT, point: bestPoint, distanceFromCenter, tangent };
}
