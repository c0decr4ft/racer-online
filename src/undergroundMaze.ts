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
  /** Open vertical shaft (XZ) — climb out / fly in. */
  shaft: { minX: number; maxX: number; minZ: number; maxZ: number };
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

/**
 * Hollow stone labyrinth under Canyon Cut.
 * Bird flies the surface shaft down; crossing into the volume becomes human.
 */
export function plantUndergroundMaze(
  group: THREE.Group,
  originX: number,
  originZ: number,
): UndergroundMaze {
  const COLS = 7;
  const ROWS = 7;
  const CELL = 4.2;
  const WALL_T = 0.55;
  const floorY = -11.5;
  const roomH = 3.4;
  const ceilingY = floorY + roomH;
  const maze = carveMaze(COLS, ROWS, 0xc4a70a1);

  const root = new THREE.Group();
  root.name = "underground-maze";
  // Center the grid on origin
  const totalW = COLS * CELL;
  const totalD = ROWS * CELL;
  root.position.set(originX - totalW * 0.5, 0, originZ - totalD * 0.5);

  const stone = new THREE.MeshStandardMaterial({
    color: 0x5a5348,
    roughness: 0.94,
    metalness: 0.06,
    flatShading: true,
  });
  const stoneDark = new THREE.MeshStandardMaterial({
    color: 0x3a3530,
    roughness: 0.96,
    metalness: 0.04,
    flatShading: true,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2e2a26,
    roughness: 0.98,
    metalness: 0.02,
    flatShading: true,
  });
  const torchMat = new THREE.MeshStandardMaterial({
    color: 0xffc070,
    emissive: 0xff8a30,
    emissiveIntensity: 2.2,
    roughness: 0.35,
    metalness: 0.1,
  });
  torchMat.userData.nightLamp = true;
  torchMat.userData.emissiveDay = 2.2;
  torchMat.userData.emissiveNight = 3.5;

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
    // Local → world XZ AABB (root is only translated)
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

  // Floor slab
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(totalW + 1.2, 0.35, totalD + 1.2),
    floorMat,
  );
  floor.position.set(totalW * 0.5, floorY - 0.15, totalD * 0.5);
  floor.receiveShadow = true;
  root.add(floor);

  // Ceiling (with shaft hole punched later as gap — we leave cell 0,0 north open upward)
  const ceilY = ceilingY + 0.2;
  const ceilThickness = 0.5;

  const cellCenter = (c: number, r: number) => ({
    x: (c + 0.5) * CELL,
    z: (r + 0.5) * CELL,
  });

  // Outer shell walls
  addWall(root, totalW + WALL_T * 2, roomH, WALL_T, stoneDark, totalW * 0.5, floorY + roomH * 0.5, -WALL_T * 0.5);
  addWall(root, totalW + WALL_T * 2, roomH, WALL_T, stoneDark, totalW * 0.5, floorY + roomH * 0.5, totalD + WALL_T * 0.5);
  addWall(root, WALL_T, roomH, totalD + WALL_T * 2, stoneDark, -WALL_T * 0.5, floorY + roomH * 0.5, totalD * 0.5);
  addWall(root, WALL_T, roomH, totalD + WALL_T * 2, stoneDark, totalW + WALL_T * 0.5, floorY + roomH * 0.5, totalD * 0.5);

  // Interior walls — east & south edges only (avoids double-drawing shared walls)
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

  // Ceiling panels — skip shaft over entrance cell (0,0)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c === 0 && r === 0) continue;
      const { x, z } = cellCenter(c, r);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(CELL + 0.05, ceilThickness, CELL + 0.05),
        stoneDark,
      );
      panel.position.set(x, ceilY, z);
      panel.receiveShadow = true;
      root.add(panel);
    }
  }

  // Vertical shaft from surface down into cell (0,0)
  const shaftLocal = cellCenter(0, 0);
  const shaftHalf = CELL * 0.38;
  const shaftTop = 1.2;
  const shaftBottom = ceilingY;
  const shaftH = shaftTop - shaftBottom;
  const shaftMidY = (shaftTop + shaftBottom) * 0.5;

  // Shaft collar walls (4 sides) from ceiling up to surface
  const collar = (dx: number, dz: number, w: number, d: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, shaftH, d), stone);
    m.position.set(shaftLocal.x + dx, shaftMidY, shaftLocal.z + dz);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  };
  collar(0, -shaftHalf - WALL_T * 0.5, shaftHalf * 2 + WALL_T * 2, WALL_T);
  collar(0, shaftHalf + WALL_T * 0.5, shaftHalf * 2 + WALL_T * 2, WALL_T);
  collar(-shaftHalf - WALL_T * 0.5, 0, WALL_T, shaftHalf * 2);
  collar(shaftHalf + WALL_T * 0.5, 0, WALL_T, shaftHalf * 2);

  // Surface stone ring / hatch
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(shaftHalf * 2 + 2.2, 0.45, shaftHalf * 2 + 2.2),
    stoneDark,
  );
  rim.position.set(shaftLocal.x, 0.22, shaftLocal.z);
  rim.receiveShadow = true;
  root.add(rim);
  // Hollow the rim visually with a darker pit lip
  const pit = new THREE.Mesh(
    new THREE.BoxGeometry(shaftHalf * 2, 0.2, shaftHalf * 2),
    floorMat,
  );
  pit.position.set(shaftLocal.x, 0.05, shaftLocal.z);
  root.add(pit);

  // Torches along a few corridors
  const torchAt = (c: number, r: number) => {
    const { x, z } = cellCenter(c, r);
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), torchMat);
    flame.position.set(x, floorY + 2.1, z);
    root.add(flame);
    const light = new THREE.PointLight(0xff9a40, 1.6, 14, 2);
    light.position.set(x, floorY + 2.2, z);
    root.add(light);
  };
  torchAt(0, 0);
  torchAt(3, 2);
  torchAt(6, 6);
  torchAt(2, 5);
  torchAt(5, 1);

  group.add(root);

  const worldShaft = {
    minX: root.position.x + shaftLocal.x - shaftHalf,
    maxX: root.position.x + shaftLocal.x + shaftHalf,
    minZ: root.position.z + shaftLocal.z - shaftHalf,
    maxZ: root.position.z + shaftLocal.z + shaftHalf,
  };

  const pad = 0.8;
  const data: UndergroundMaze = {
    bounds: {
      minX: root.position.x - pad,
      maxX: root.position.x + totalW + pad,
      minY: floorY - 0.5,
      maxY: 0.85,
      minZ: root.position.z - pad,
      maxZ: root.position.z + totalD + pad,
    },
    floorY,
    ceilingY,
    shaft: worldShaft,
    walls,
    spawn: {
      x: root.position.x + shaftLocal.x,
      y: floorY + 0.95,
      z: root.position.z + shaftLocal.z,
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
  const s = maze.shaft;
  return x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ;
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
