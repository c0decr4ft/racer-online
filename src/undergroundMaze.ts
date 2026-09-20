import * as THREE from "three";

/** Horizontal wall slab for walking collision (Y spans floor→ceiling). */
export type MazeWall = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type UndergroundMaze = {
  /** World-space volume that triggers bird↔human. */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  floorY: number;
  ceilingY: number;
  /** Entrance shaft (fly in / climb out). */
  shaft: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Exit / ending shaft — climb out after reaching the goal chamber. */
  exitShaft: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Goal chamber center (ending). */
  goal: { x: number; z: number; radius: number };
  walls: MazeWall[];
  /** Spawn human here when transforming from bird. */
  spawn: { x: number; y: number; z: number };
};

type Cell = { n: boolean; e: boolean; s: boolean; w: boolean; visited: boolean };

/** Deterministic maze (recursive backtracker). */
function carveMaze(cols: number, rows: number, seed: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ n: true, e: true, s: true, w: true, visited: false });
    }
    grid.push(row);
  }
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const stack: { c: number; r: number }[] = [{ c: 0, r: 0 }];
  grid[0]![0]!.visited = true;
  while (stack.length) {
    const cur = stack[stack.length - 1]!;
    const neighbors: { c: number; r: number; dir: "n" | "e" | "s" | "w" }[] = [];
    const push = (c: number, r: number, dir: "n" | "e" | "s" | "w") => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return;
      if (grid[r]![c]!.visited) return;
      neighbors.push({ c, r, dir });
    };
    push(cur.c, cur.r - 1, "n");
    push(cur.c + 1, cur.r, "e");
    push(cur.c, cur.r + 1, "s");
    push(cur.c - 1, cur.r, "w");
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    const pick = neighbors[Math.floor(rand() * neighbors.length)]!;
    const a = grid[cur.r]![cur.c]!;
    const b = grid[pick.r]![pick.c]!;
    if (pick.dir === "n") {
      a.n = false;
      b.s = false;
    } else if (pick.dir === "e") {
      a.e = false;
      b.w = false;
    } else if (pick.dir === "s") {
      a.s = false;
      b.n = false;
    } else {
      a.w = false;
      b.e = false;
    }
    b.visited = true;
    stack.push({ c: pick.c, r: pick.r });
  }
  return grid;
}

function buildShaft(
  root: THREE.Group,
  localX: number,
  localZ: number,
  shaftHalf: number,
  wallT: number,
  ceilingY: number,
  stone: THREE.Material,
  floorMat: THREE.Material,
  rimColor: number,
) {
  const shaftTop = 1.35;
  const shaftBottom = ceilingY;
  const shaftH = shaftTop - shaftBottom;
  const shaftMidY = (shaftTop + shaftBottom) * 0.5;

  const collar = (dx: number, dz: number, w: number, d: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, shaftH, d), stone);
    m.position.set(localX + dx, shaftMidY, localZ + dz);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  };
  collar(0, -shaftHalf - wallT * 0.5, shaftHalf * 2 + wallT * 2, wallT);
  collar(0, shaftHalf + wallT * 0.5, shaftHalf * 2 + wallT * 2, wallT);
  collar(-shaftHalf - wallT * 0.5, 0, wallT, shaftHalf * 2);
  collar(shaftHalf + wallT * 0.5, 0, wallT, shaftHalf * 2);

  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.9,
    metalness: 0.08,
    flatShading: true,
  });
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(shaftHalf * 2 + 2.4, 0.5, shaftHalf * 2 + 2.4),
    rimMat,
  );
  rim.position.set(localX, 0.25, localZ);
  rim.receiveShadow = true;
  root.add(rim);
  const pit = new THREE.Mesh(
    new THREE.BoxGeometry(shaftHalf * 2, 0.22, shaftHalf * 2),
    floorMat,
  );
  pit.position.set(localX, 0.06, localZ);
  root.add(pit);
}

/**
 * Large stone labyrinth under Canyon Cut.
 * Entrance shaft → human walk → goal chamber / exit shaft → bird again.
 */
export function plantUndergroundMaze(
  group: THREE.Group,
  originX: number,
  originZ: number,
): UndergroundMaze {
  const COLS = 15;
  const ROWS = 15;
  const CELL = 4.6;
  const WALL_T = 0.6;
  const floorY = -12.5;
  const roomH = 3.8;
  const ceilingY = floorY + roomH;
  const maze = carveMaze(COLS, ROWS, 0xc4a70a1);
  const goalC = COLS - 1;
  const goalR = ROWS - 1;

  const root = new THREE.Group();
  root.name = "underground-maze";
  const totalW = COLS * CELL;
  const totalD = ROWS * CELL;
  root.position.set(originX - totalW * 0.5, 0, originZ - totalD * 0.5);

  const stone = new THREE.MeshStandardMaterial({
    color: 0x6a6358,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });
  const stoneDark = new THREE.MeshStandardMaterial({
    color: 0x3f3a34,
    roughness: 0.95,
    metalness: 0.04,
    flatShading: true,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x35302a,
    roughness: 0.98,
    metalness: 0.02,
    flatShading: true,
  });
  const torchMat = new THREE.MeshStandardMaterial({
    color: 0xffc070,
    emissive: 0xff8a30,
    emissiveIntensity: 3.5,
    roughness: 0.35,
    metalness: 0.1,
  });
  torchMat.userData.nightLamp = true;
  torchMat.userData.emissiveDay = 3.5;
  torchMat.userData.emissiveNight = 5;
  const goalMat = new THREE.MeshStandardMaterial({
    color: 0xffd060,
    emissive: 0xffb020,
    emissiveIntensity: 4.5,
    roughness: 0.3,
    metalness: 0.25,
  });
  goalMat.userData.nightLamp = true;
  goalMat.userData.emissiveDay = 4.5;
  goalMat.userData.emissiveNight = 6;

  const walls: MazeWall[] = [];
  const addWall = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    const wx = root.position.x + x;
    const wz = root.position.z + z;
    walls.push({
      minX: wx - w * 0.5,
      maxX: wx + w * 0.5,
      minZ: wz - d * 0.5,
      maxZ: wz + d * 0.5,
    });
    return m;
  };

  // Soft fill so corridors aren't pitch black between torches.
  const fill = new THREE.AmbientLight(0xffc090, 0.55);
  root.add(fill);
  const hemi = new THREE.HemisphereLight(0xffe0b0, 0x1a1210, 0.7);
  hemi.position.set(totalW * 0.5, floorY + 6, totalD * 0.5);
  root.add(hemi);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(totalW + 1.4, 0.4, totalD + 1.4),
    floorMat,
  );
  floor.position.set(totalW * 0.5, floorY - 0.18, totalD * 0.5);
  floor.receiveShadow = true;
  root.add(floor);

  const ceilY = ceilingY + 0.22;
  const ceilThickness = 0.55;
  const cellCenter = (c: number, r: number) => ({
    x: (c + 0.5) * CELL,
    z: (r + 0.5) * CELL,
  });

  // Outer shell
  addWall(root, totalW + WALL_T * 2, roomH, WALL_T, stoneDark, totalW * 0.5, floorY + roomH * 0.5, -WALL_T * 0.5);
  addWall(root, totalW + WALL_T * 2, roomH, WALL_T, stoneDark, totalW * 0.5, floorY + roomH * 0.5, totalD + WALL_T * 0.5);
  addWall(root, WALL_T, roomH, totalD + WALL_T * 2, stoneDark, -WALL_T * 0.5, floorY + roomH * 0.5, totalD * 0.5);
  addWall(root, WALL_T, roomH, totalD + WALL_T * 2, stoneDark, totalW + WALL_T * 0.5, floorY + roomH * 0.5, totalD * 0.5);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = maze[r]![c]!;
      const cx = (c + 0.5) * CELL;
      const cz = (r + 0.5) * CELL;
      if (cell.e && c < COLS - 1) {
        addWall(root, WALL_T, roomH, CELL, stone, (c + 1) * CELL, floorY + roomH * 0.5, cz);
      }
      if (cell.s && r < ROWS - 1) {
        addWall(root, CELL, roomH, WALL_T, stone, cx, floorY + roomH * 0.5, (r + 1) * CELL);
      }
    }
  }

  // Ceiling — holes at entrance (0,0) and exit/goal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((c === 0 && r === 0) || (c === goalC && r === goalR)) continue;
      const { x, z } = cellCenter(c, r);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(CELL + 0.06, ceilThickness, CELL + 0.06),
        stoneDark,
      );
      panel.position.set(x, ceilY, z);
      panel.receiveShadow = true;
      root.add(panel);
    }
  }

  const shaftHalf = CELL * 0.36;
  const enterLocal = cellCenter(0, 0);
  const exitLocal = cellCenter(goalC, goalR);

  buildShaft(
    root,
    enterLocal.x,
    enterLocal.z,
    shaftHalf,
    WALL_T,
    ceilingY,
    stone,
    floorMat,
    0x4a4540,
  );
  buildShaft(
    root,
    exitLocal.x,
    exitLocal.z,
    shaftHalf,
    WALL_T,
    ceilingY,
    stone,
    floorMat,
    0x8a6a20,
  );

  // Goal chamber marker — glowing pedestal (the ending)
  const goalPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), goalMat);
  goalPedestal.position.set(exitLocal.x, floorY + 0.55, exitLocal.z);
  root.add(goalPedestal);
  const goalOrb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), goalMat);
  goalOrb.position.set(exitLocal.x, floorY + 1.45, exitLocal.z);
  root.add(goalOrb);
  const goalLight = new THREE.PointLight(0xffc040, 55, 28, 1.6);
  goalLight.position.set(exitLocal.x, floorY + 2.4, exitLocal.z);
  root.add(goalLight);

  // Torches every other cell — enough fill for a big maze
  const torchAt = (c: number, r: number) => {
    const { x, z } = cellCenter(c, r);
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), torchMat);
    flame.position.set(x, floorY + 2.25, z);
    root.add(flame);
    const light = new THREE.PointLight(0xff9a40, 38, 18, 1.7);
    light.position.set(x, floorY + 2.35, z);
    root.add(light);
  };
  for (let r = 0; r < ROWS; r += 2) {
    for (let c = 0; c < COLS; c += 2) {
      torchAt(c, r);
    }
  }
  torchAt(0, 0);
  torchAt(goalC, goalR);

  group.add(root);

  const worldShaft = (lx: number, lz: number) => ({
    minX: root.position.x + lx - shaftHalf,
    maxX: root.position.x + lx + shaftHalf,
    minZ: root.position.z + lz - shaftHalf,
    maxZ: root.position.z + lz + shaftHalf,
  });

  const pad = 1.0;
  const data: UndergroundMaze = {
    bounds: {
      minX: root.position.x - pad,
      maxX: root.position.x + totalW + pad,
      minY: floorY - 0.5,
      maxY: 0.95,
      minZ: root.position.z - pad,
      maxZ: root.position.z + totalD + pad,
    },
    floorY,
    ceilingY,
    shaft: worldShaft(enterLocal.x, enterLocal.z),
    exitShaft: worldShaft(exitLocal.x, exitLocal.z),
    goal: {
      x: root.position.x + exitLocal.x,
      z: root.position.z + exitLocal.z,
      radius: CELL * 0.55,
    },
    walls,
    spawn: {
      x: root.position.x + enterLocal.x,
      y: floorY + 0.05,
      z: root.position.z + enterLocal.z,
    },
  };

  group.userData.undergroundMaze = data;
  return data;
}

export function pointInMazeBounds(
  maze: UndergroundMaze,
  x: number,
  y: number,
  z: number,
): boolean {
  const b = maze.bounds;
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ;
}

export function pointInShaft(maze: UndergroundMaze, x: number, z: number): boolean {
  const shafts = [maze.shaft, maze.exitShaft];
  for (const s of shafts) {
    if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) return true;
  }
  return false;
}

export function pointInGoal(maze: UndergroundMaze, x: number, z: number): boolean {
  const dx = x - maze.goal.x;
  const dz = z - maze.goal.z;
  return dx * dx + dz * dz <= maze.goal.radius * maze.goal.radius;
}

/** Resolve horizontal slide against maze wall AABBs. */
export function collideMazeWalls(
  maze: UndergroundMaze,
  x: number,
  z: number,
  radius: number,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const w of maze.walls) {
    const nearestX = Math.max(w.minX, Math.min(px, w.maxX));
    const nearestZ = Math.max(w.minZ, Math.min(pz, w.maxZ));
    const dx = px - nearestX;
    const dz = pz - nearestZ;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius || d2 < 1e-8) continue;
    const d = Math.sqrt(d2);
    const push = (radius - d) / d;
    px += dx * push;
    pz += dz * push;
  }
  return { x: px, z: pz };
}
