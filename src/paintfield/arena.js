import * as THREE from "three";
import {
  cautionTexture,
  chainlinkTexture,
  concreteTexture,
  meshFenceTexture,
  plywoodTexture,
} from "./textures.js";

export const TEAM = {
  blue: 0x2ec8ff,
  red: 0xff4d2e,
};

const HALF_X = 32;
const HALF_Z = 26.5;
const WALL_H = 2.55;
const WALL_T = 0.16;

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.traverse((c) => {
    c.castShadow = true;
    c.receiveShadow = true;
  });
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.08,
    ...extra,
  });
}

export function buildArena(scene) {
  const colliders = [];
  const spawnBlue = new THREE.Vector3(-22.4, 0, 20.7);
  const spawnRed = new THREE.Vector3(26.8, 0, -23.4);

  scene.background = new THREE.Color(0x5eb6f2);
  scene.fog = new THREE.Fog(0x9ed0f5, 58, 145);

  const hemi = new THREE.HemisphereLight(0xd7eeff, 0x8a8a86, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.35);
  sun.position.set(22, 46, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 46;
  sun.shadow.camera.bottom = -46;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb8d4f0, 0.4);
  fill.position.set(-20, 18, -14);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xcfd8e0, 0.22));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 140, 8, 8),
    new THREE.MeshStandardMaterial({
      map: concreteTexture(),
      roughness: 0.94,
      color: 0xcfcfc8,
      envMapIntensity: 0.28,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plyMap = plywoodTexture();
  const caution = cautionTexture();

  function addCollider(mesh) {
    mesh.updateWorldMatrix(true, false);
    colliders.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
  }

  const fenceMat = new THREE.MeshStandardMaterial({
    map: meshFenceTexture(),
    transparent: true,
    roughness: 0.7,
    metalness: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const linkMat = new THREE.MeshStandardMaterial({
    map: chainlinkTexture(),
    transparent: true,
    roughness: 0.4,
    metalness: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const hoardMat = new THREE.MeshStandardMaterial({ map: plyMap, roughness: 0.88, color: 0xc4a468 });
  const fenceH = 3.6;
  const walls = [
    { w: HALF_X * 2, d: 0.16, x: 0, z: HALF_Z },
    { w: HALF_X * 2, d: 0.16, x: 0, z: -HALF_Z },
    { w: 0.16, d: HALF_Z * 2, x: HALF_X, z: 0 },
    { w: 0.16, d: HALF_Z * 2, x: -HALF_X, z: 0 },
  ];
  for (const w of walls) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(w.w, fenceH, w.d), fenceMat);
    fence.position.set(w.x, fenceH / 2, w.z);
    scene.add(fence);
    const link = new THREE.Mesh(new THREE.BoxGeometry(w.w, fenceH, w.d * 0.7), linkMat);
    link.position.set(w.x, fenceH / 2, w.z);
    scene.add(link);
    const hoarding = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(w.w, 0.2), 1.7, Math.max(w.d, 0.18)),
      hoardMat
    );
    hoarding.position.set(w.x, 0.85, w.z);
    addShadow(hoarding);
    scene.add(hoarding);
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(w.w, 0.2), 0.12, Math.max(w.d, 0.2)),
      new THREE.MeshStandardMaterial({ map: caution, roughness: 0.5 })
    );
    tape.position.set(w.x, 1.82, w.z);
    scene.add(tape);
    addCollider(fence);
  }

  const postMat = mat(0x3f4542, { metalness: 0.4, roughness: 0.45 });
  for (let i = -HALF_X; i <= HALF_X; i += 8) {
    for (const [x, z] of [
      [i, HALF_Z],
      [i, -HALF_Z],
    ]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, fenceH + 0.3, 0.2), postMat);
      post.position.set(x, (fenceH + 0.3) / 2, z);
      addShadow(post);
      scene.add(post);
    }
  }
  for (let i = -HALF_Z; i <= HALF_Z; i += 8) {
    for (const [x, z] of [
      [HALF_X, i],
      [-HALF_X, i],
    ]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, fenceH + 0.3, 0.2), postMat);
      post.position.set(x, (fenceH + 0.3) / 2, z);
      addShadow(post);
      scene.add(post);
    }
  }

  function uvX(nx) {
    return -HALF_X + nx * HALF_X * 2;
  }
  function uvZ(ny) {
    return HALF_Z - ny * HALF_Z * 2;
  }

  function sheetUV(nx0, ny0, nx1, ny1) {
    const x0 = uvX(nx0);
    const z0 = uvZ(ny0);
    const x1 = uvX(nx1);
    const z1 = uvZ(ny1);
    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const horizontal = dx >= dz;
    const w = horizontal ? Math.max(dx, 0.45) : WALL_T;
    const d = horizontal ? WALL_T : Math.max(dz, 0.45);
    const tex = plyMap.clone();
    tex.repeat.set(Math.max(w, d) / 2.44, WALL_H / 2.44);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const material = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.86,
      color: 0xe2c07a,
      envMapIntensity: 0.3,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), material);
    mesh.position.set(cx, WALL_H / 2, cz);
    addShadow(mesh);
    scene.add(mesh);
    addCollider(mesh);
    return mesh;
  }

  // Sketch layout (top-down UV). Colliders are the plywood meshes only.
  // Top-left zig-zag cover leaving blue spawn.
  sheetUV(0.225, 0.14, 0.225, 0.3);
  sheetUV(0.225, 0.27, 0.338, 0.27);
  sheetUV(0.305, 0.27, 0.305, 0.435);

  // Short vertical hanging from the top border.
  sheetUV(0.41, 0.0, 0.41, 0.215);

  // Upper-right horizontal, then long vertical near the right border.
  sheetUV(0.6, 0.205, 0.78, 0.205);
  sheetUV(0.885, 0.2, 0.885, 0.47);

  // Center disconnected lanes.
  sheetUV(0.425, 0.365, 0.575, 0.365);
  sheetUV(0.63, 0.395, 0.76, 0.395);
  sheetUV(0.72, 0.395, 0.72, 0.575);

  // Mid-left C / hook opening toward the right.
  sheetUV(0.225, 0.48, 0.32, 0.48);
  sheetUV(0.225, 0.47, 0.225, 0.63);
  sheetUV(0.225, 0.62, 0.385, 0.62);

  // Lower-center vertical + mid-right horizontal.
  sheetUV(0.515, 0.63, 0.515, 0.81);
  sheetUV(0.63, 0.65, 0.75, 0.65);

  // Bottom-left straight near the south border.
  sheetUV(0.22, 0.79, 0.4, 0.79);

  // Bottom-right L nook for red spawn.
  sheetUV(0.81, 0.67, 0.81, 0.88);
  sheetUV(0.69, 0.81, 0.84, 0.81);

  // Extra maze bits — short sheets with gaps so every cluster has multiple ways around.
  sheetUV(0.14, 0.2, 0.2, 0.2);
  sheetUV(0.5, 0.1, 0.5, 0.2);
  sheetUV(0.5, 0.255, 0.58, 0.255);
  sheetUV(0.8, 0.3, 0.86, 0.3);
  sheetUV(0.13, 0.36, 0.13, 0.5);
  sheetUV(0.36, 0.4, 0.36, 0.5);
  sheetUV(0.5, 0.48, 0.58, 0.48);
  sheetUV(0.86, 0.5, 0.86, 0.6);
  sheetUV(0.13, 0.68, 0.13, 0.78);
  sheetUV(0.58, 0.72, 0.58, 0.8);
  sheetUV(0.44, 0.86, 0.56, 0.86);
  sheetUV(0.72, 0.7, 0.78, 0.7);
  sheetUV(0.33, 0.7, 0.4, 0.7);

  function spawnPad(pos, color) {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 28),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        transparent: true,
        opacity: 0.42,
        map: caution,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(pos.x, 0.04, pos.z);
    scene.add(pad);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.07, 8, 28),
      mat(color, { roughness: 0.4, metalness: 0.2 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(pos.x, 0.05, pos.z);
    scene.add(ring);
  }
  spawnPad(spawnBlue, TEAM.blue);
  spawnPad(spawnRed, TEAM.red);

  function blockedXZ(x, z, radius) {
    if (Math.abs(x) > HALF_X - 1.15 || Math.abs(z) > HALF_Z - 1.15) return true;
    for (const c of colliders) {
      const box = c.box;
      const cx = Math.max(box.min.x, Math.min(x, box.max.x));
      const cz = Math.max(box.min.z, Math.min(z, box.max.z));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  const waypoints = [];
  for (let x = -HALF_X + 2.4; x <= HALF_X - 2.4; x += 3.2) {
    for (let z = -HALF_Z + 2.4; z <= HALF_Z - 2.4; z += 3.2) {
      if (!blockedXZ(x, z, 0.9)) waypoints.push(new THREE.Vector3(x, 0, z));
    }
  }

  return {
    colliders,
    spawnBlue,
    spawnRed,
    halfX: HALF_X,
    halfZ: HALF_Z,
    waypoints,
    blockedXZ,
  };
}

export function createFighter(teamColor, isPlayerView = false) {
  const g = new THREE.Group();
  const bodyScale = isPlayerView ? 1 : 0.97 + Math.random() * 0.08;
  g.scale.setScalar(bodyScale);

  const skins = [0xe2b58a, 0xc48a58, 0x8d5524, 0xf0cbb0, 0x6a3d22, 0xd09a6a];
  const skin = new THREE.MeshStandardMaterial({
    color: skins[Math.floor(Math.random() * skins.length)],
    roughness: 0.58,
    metalness: 0.02,
  });
  const fabric = new THREE.MeshStandardMaterial({
    color: teamColor,
    roughness: 0.76,
    metalness: 0.03,
    envMapIntensity: 0.4,
  });
  const pant = new THREE.MeshStandardMaterial({ color: 0x1b2220, roughness: 0.84, envMapIntensity: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101412, roughness: 0.38, metalness: 0.22, envMapIntensity: 0.7 });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0x070d12,
    metalness: 0.9,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.2,
    transparent: true,
    opacity: 0.72,
  });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.5, metalness: 0.12 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x171917, roughness: 0.68 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x2a2e2c, roughness: 0.55, metalness: 0.08 });

  const hips = new THREE.Group();
  hips.position.y = 0.94;
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12), pant);
  pelvis.scale.set(1.42, 0.72, 1.1);
  hips.add(pelvis);

  const torso = new THREE.Group();
  torso.position.y = 0.1;
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.205, 0.4, 8, 16), fabric);
  chest.position.y = 0.3;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), fabric);
  belly.scale.set(1.05, 0.7, 0.85);
  belly.position.y = 0.08;
  torso.add(chest, belly);

  const num = 1 + Math.floor(Math.random() * 98);
  const badge = document.createElement("canvas");
  badge.width = badge.height = 64;
  const btx = badge.getContext("2d");
  btx.fillStyle = "rgba(0,0,0,0)";
  btx.fillRect(0, 0, 64, 64);
  btx.fillStyle = "#f4f7f2";
  btx.font = "bold 42px Barlow, Impact, sans-serif";
  btx.textAlign = "center";
  btx.textBaseline = "middle";
  btx.fillText(String(num), 32, 34);
  const badgeTex = new THREE.CanvasTexture(badge);
  badgeTex.colorSpace = THREE.SRGBColorSpace;
  const patch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.18),
    new THREE.MeshStandardMaterial({ map: badgeTex, transparent: true, roughness: 0.7, depthWrite: false })
  );
  patch.position.set(0, 0.34, 0.215);
  torso.add(patch);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.14, 12), skin);
  neck.position.y = 0.54;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.68;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.168, 22, 18), skin);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin);
  jaw.scale.set(0.92, 0.72, 0.85);
  jaw.position.set(0, -0.09, 0.02);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.182, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.48),
    dark
  );
  helmet.position.y = 0.04;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.04), visorMat);
  visor.position.set(0, 0.02, 0.145);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), skin);
  nose.position.set(0, -0.02, 0.155);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), skin);
  earL.position.set(-0.16, 0.0, 0.0);
  const earR = earL.clone();
  earR.position.x = 0.16;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.04), fabric);
  stripe.position.set(0, 0.12, 0.1);
  head.add(skull, jaw, helmet, visor, nose, earL, earR, stripe);

  const makeLeg = (side) => {
    const thigh = new THREE.Group();
    thigh.position.set(0.115 * side, -0.04, 0);
    const thighMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.32, 6, 12), pant);
    thighMesh.position.y = -0.22;
    const shin = new THREE.Group();
    shin.position.y = -0.42;
    const shinMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.3, 6, 12), pant);
    shinMesh.position.y = -0.2;
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), pad);
    knee.position.y = -0.42;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.075, 0.26), shoe);
    foot.position.set(0, -0.4, 0.055);
    shin.add(shinMesh, foot);
    thigh.add(thighMesh, shin, knee);
    return { thigh, shin };
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const makeArm = (side, holdGun) => {
    const arm = new THREE.Group();
    arm.position.set(0.3 * side, 0.46, 0.02);
    arm.rotation.z = 0.14 * side;
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.24, 6, 12), fabric);
    upper.position.y = -0.16;
    const forearm = new THREE.Group();
    forearm.position.y = -0.3;
    const foreMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.22, 6, 12), fabric);
    foreMesh.position.y = -0.14;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), glove);
    hand.position.y = -0.28;
    forearm.add(foreMesh, hand);
    arm.add(upper, forearm);
    let marker = null;
    if (holdGun) {
      marker = createMarker(0x1a1e1c, true);
      marker.scale.setScalar(0.88);
      marker.position.set(0.02, -0.3, 0.14);
      marker.rotation.set(-1.05, 0.08, 0.18);
      forearm.add(marker);
    }
    return { arm, forearm, marker };
  };

  const leftArm = makeArm(-1, false);
  const rightArm = makeArm(1, true);

  torso.add(head, leftArm.arm, rightArm.arm);
  hips.add(torso, leftLeg.thigh, rightLeg.thigh);
  g.add(hips);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);

  g.userData = {
    hips,
    torso,
    head,
    leftThigh: leftLeg.thigh,
    rightThigh: rightLeg.thigh,
    leftShin: leftLeg.shin,
    rightShin: rightLeg.shin,
    leftArm: leftArm.arm,
    rightArm: rightArm.arm,
    leftForearm: leftArm.forearm,
    rightForearm: rightArm.forearm,
    marker: rightArm.marker,
    shadow,
    teamColor,
  };
  addShadow(g);
  shadow.castShadow = false;
  if (isPlayerView) g.visible = false;
  return g;
}

export function createMarker(bodyColor = 0x1b1f1d, world = false) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.38, metalness: 0.32, envMapIntensity: 0.8 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x2ec8ff, roughness: 0.32, metalness: 0.22, envMapIntensity: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0d0f0e, roughness: 0.42, metalness: 0.4 });
  const silver = new THREE.MeshPhysicalMaterial({
    color: 0x8a938c,
    roughness: 0.22,
    metalness: 0.72,
    clearcoat: 0.4,
    envMapIntensity: 1,
  });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.38), body);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.22), silver);
  receiver.position.set(0, 0.02, -0.08);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.58, 16), black);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.48);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.18, 14), body);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.set(0, 0.02, -0.28);
  const hopper = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), accent);
  hopper.scale.set(0.95, 0.8, 1.25);
  hopper.position.set(0, 0.16, 0.04);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), black);
  lid.position.set(0, 0.24, 0.04);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 14), silver);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, -0.01, 0.3);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.08), body);
  grip.position.set(0, -0.13, 0.1);
  grip.rotation.x = 0.28;
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.03), black);
  trigger.position.set(0, -0.08, 0.02);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.045, 0.09), accent);
  sight.position.set(0, 0.09, -0.16);

  g.add(frame, receiver, barrel, shroud, hopper, lid, tank, grip, trigger, sight);
  g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.78);
  if (!world) {
    g.scale.setScalar(1.9);
    g.position.set(0.34, -0.28, -0.52);
    g.rotation.set(0.06, 0.18, 0.03);
  }
  return g;
}
