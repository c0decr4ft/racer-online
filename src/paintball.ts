import * as THREE from "three";
import type { InputState } from "./input";

const HALF_X = 18;
const HALF_Z = 24;
const EYE = 1.58;
const SPEED = 8;
const BALL_SPEED = 88;
const BALL_LIFE = 0.8;
const HIT_R = 0.52;
const COOLDOWN = 0.1;
const TAGS_TO_WIN = 5;
const DEATHS_TO_LOSE = 5;
const RESPAWN_S = 3.2;
const LOOK_SENS = 0.00215;
const GRAVITY = 2.8;
const TEAM_BLUE = 0x1e5cff;
const TEAM_RED = 0xe23b2e;

type Aabb = { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };

type Team = "blue" | "red";

type Actor = {
  id: number;
  group: THREE.Group;
  x: number;
  z: number;
  y: number;
  heading: number;
  pitch: number;
  radius: number;
  color: number;
  team: Team;
  tags: number;
  deaths: number;
  downUntil: number;
  shootCd: number;
  burstLeft: number;
  botStrafe: number;
  botCover: { x: number; z: number };
  isBot: boolean;
  moving: boolean;
};

type Ball = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  team: Team;
  color: number;
};

const SPECTATE_BACK = 4.6;
const SPECTATE_HEIGHT = 2.35;
const SPECTATE_LOOK = 1.35;
const ALLY_COUNT = 3;
const ENEMY_COUNT = 5;

function mat(color: number, opts: { metal?: number; rough?: number; emit?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metal ?? 0.12,
    roughness: opts.rough ?? 0.62,
    emissive: opts.emit ? color : 0x000000,
    emissiveIntensity: opts.emit ?? 0,
  });
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
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
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
  segments = 10,
) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function makeMarker(hopperColor: number, firstPerson = false) {
  const g = new THREE.Group();
  g.name = "marker";
  const black = mat(0x171a1f, { metal: 0.58, rough: 0.32 });
  const barrelMat = mat(0x2a2f36, { metal: 0.74, rough: 0.22 });
  const tank = mat(0xd0d4d8, { metal: 0.9, rough: 0.16 });
  const hop = mat(hopperColor, { metal: 0.1, rough: 0.4, emit: 0.2 });
  const s = firstPerson ? 1.28 : 1;
  const f = firstPerson ? -1 : 1;

  box(g, 0.11 * s, 0.13 * s, 0.36 * s, black, 0, 0, 0);
  box(g, 0.09 * s, 0.07 * s, 0.16 * s, mat(0x0c0e12, { metal: 0.4, rough: 0.4 }), 0, 0.06 * s, f * -0.02);
  cyl(g, 0.034 * s, 0.028 * s, 0.62 * s, barrelMat, 0, 0.03 * s, f * 0.42 * s, Math.PI / 2, 0, 0, 8);
  box(g, 0.06 * s, 0.06 * s, 0.1 * s, barrelMat, 0, 0.03 * s, f * 0.72 * s);
  cyl(g, 0.15 * s, 0.11 * s, 0.24 * s, hop, 0, 0.26 * s, f * -0.05 * s, 0, 0, 0, 8);
  box(g, 0.06 * s, 0.12 * s, 0.06 * s, hop, 0, 0.13 * s, f * -0.05 * s);
  cyl(g, 0.055 * s, 0.055 * s, 0.38 * s, tank, 0, -0.05 * s, f * -0.32 * s, Math.PI / 2, 0, 0, 8);
  box(g, 0.065 * s, 0.2 * s, 0.085 * s, black, 0, -0.15 * s, f * -0.02);
  box(g, 0.05 * s, 0.13 * s, 0.05 * s, black, 0, -0.13 * s, f * 0.2 * s);

  const muzzle = new THREE.Object3D();
  muzzle.name = "muzzle";
  muzzle.position.set(0, 0.03 * s, f * 0.78 * s);
  g.add(muzzle);

  const flash = box(
    g,
    0.07 * s,
    0.07 * s,
    0.14 * s,
    mat(0xfff4c8, { metal: 0, rough: 1, emit: 2 }),
    0,
    0.03 * s,
    f * 0.82 * s,
  );
  flash.name = "flash";
  flash.visible = false;
  flash.castShadow = false;
  flash.receiveShadow = false;
  return g;
}

function makeViewmodel(hopperColor: number, jersey: number) {
  const root = new THREE.Group();
  root.name = "paint-viewmodel";
  const gun = makeMarker(hopperColor, true);
  gun.position.set(0, 0.06, 0);
  gun.rotation.set(0.18, 0.42, 0.06);
  root.add(gun);

  const sleeve = mat(jersey, { metal: 0.14, rough: 0.5, emit: 0.05 });
  const glove = mat(0x16181c, { metal: 0.2, rough: 0.55 });
  box(root, 0.1, 0.1, 0.24, sleeve, 0.13, -0.17, 0.12);
  box(root, 0.085, 0.075, 0.11, glove, 0.05, -0.13, 0.02);
  box(root, 0.075, 0.065, 0.09, glove, -0.02, -0.11, -0.17);

  root.scale.setScalar(1.6);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = false;
  });
  return root;
}

function makePlayer(jersey: number, hopperColor: number) {
  const g = new THREE.Group();
  const pants = mat(0x161c24, { metal: 0.08, rough: 0.74 });
  const boot = mat(0x0c0e12, { metal: 0.12, rough: 0.7 });
  const shirt = mat(jersey, { metal: 0.14, rough: 0.48, emit: 0.08 });
  const pad = mat(0x12151a, { metal: 0.3, rough: 0.46 });
  const mask = mat(0x0a0c10, { metal: 0.45, rough: 0.3 });
  const visor = mat(0x081820, { metal: 0.58, rough: 0.06, emit: 0.06 });
  const stripe = mat(0xf7fafc, { metal: 0.05, rough: 0.55 });

  box(g, 0.18, 0.11, 0.32, boot, -0.14, 0.055, 0.03);
  box(g, 0.18, 0.11, 0.32, boot, 0.14, 0.055, 0.03);
  box(g, 0.16, 0.42, 0.18, pants, -0.14, 0.34, 0);
  box(g, 0.16, 0.42, 0.18, pants, 0.14, 0.34, 0);
  box(g, 0.18, 0.14, 0.14, pad, -0.14, 0.52, 0.08);
  box(g, 0.18, 0.14, 0.14, pad, 0.14, 0.52, 0.08);
  box(g, 0.18, 0.32, 0.2, pants, -0.13, 0.72, 0);
  box(g, 0.18, 0.32, 0.2, pants, 0.13, 0.72, 0);
  box(g, 0.44, 0.18, 0.26, pants, 0, 0.9, 0);
  box(g, 0.5, 0.54, 0.3, shirt, 0, 1.22, 0);
  box(g, 0.22, 0.46, 0.07, stripe, 0, 1.22, 0.13);
  box(g, 0.4, 0.32, 0.09, pad, 0, 1.24, 0.16);
  box(g, 0.2, 0.16, 0.24, shirt, -0.32, 1.4, 0);
  box(g, 0.2, 0.16, 0.24, shirt, 0.32, 1.4, 0);
  box(g, 0.14, 0.4, 0.14, shirt, -0.34, 1.1, 0.06);
  box(g, 0.14, 0.4, 0.14, shirt, 0.34, 1.1, 0.06);
  box(g, 0.13, 0.11, 0.15, pad, -0.32, 0.88, 0.2);
  box(g, 0.13, 0.11, 0.15, pad, 0.36, 0.9, 0.24);
  box(g, 0.36, 0.32, 0.34, mask, 0, 1.66, 0.02);
  box(g, 0.32, 0.14, 0.07, visor, 0, 1.68, 0.18);
  box(g, 0.34, 0.07, 0.11, mask, 0, 1.78, 0.15);
  box(g, 0.26, 0.12, 0.2, mask, 0, 1.48, 0.12);
  box(g, 0.09, 0.09, 0.09, mat(jersey, { emit: 0.25 }), 0, 1.84, 0);

  const gun = makeMarker(hopperColor);
  gun.position.set(0.26, 1.08, 0.42);
  gun.rotation.set(-0.16, 0.12, 0.4);
  g.add(gun);
  return g;
}

const ENEMY_PAINT = [0xff3b2e, 0xff8a1a, 0xffe14a, 0xff4ad8, 0xf7fafc];
const ALLY_PAINT = [0x2ad4ff, 0x7cff4a, 0xf0c020, 0xb44dff];

function coverSpots(): { x: number; z: number }[] {
  return [
    { x: -10.5, z: -14 },
    { x: 9, z: -15 },
    { x: 0, z: -15.5 },
    { x: -5, z: -8 },
    { x: 5.5, z: -8.5 },
    { x: -11, z: 0 },
    { x: 11, z: 0 },
    { x: 0, z: 2 },
    { x: 10.5, z: 14 },
    { x: -9, z: 15 },
    { x: 0, z: 15.5 },
    { x: 5, z: 8 },
    { x: -5.5, z: 8.5 },
    { x: -15, z: -7 },
    { x: 15, z: 7 },
  ];
}

export class PaintballMatch {
  readonly group = new THREE.Group();
  finished = false;
  result: "win" | "lose" | null = null;
  readonly practice: boolean;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly paintColor: number;
  private readonly solids: Aabb[] = [];
  private readonly covers = coverSpots();
  private readonly actors: Actor[] = [];
  private readonly balls: Ball[] = [];
  private readonly splats: THREE.Mesh[] = [];
  private readonly ballGeo = new THREE.SphereGeometry(0.055, 8, 6);
  private readonly splatGeo = new THREE.BoxGeometry(0.5, 0.04, 0.34);
  private readonly viewmodel: THREE.Group;
  private readonly muzzleTmp = new THREE.Vector3();
  private readonly aimTmp = new THREE.Vector3();
  private readonly dirTmp = new THREE.Vector3();
  private player!: Actor;
  private yaw = 0;
  private pitch = -0.06;
  private mouseDx = 0;
  private mouseDy = 0;
  private firing = false;
  private locked = false;
  private elapsed = 0;
  private kick = 0;
  private flashUntil = 0;
  private nextActorId = 1;
  /** Living teammate we follow in third person while down. */
  private spectateId: number | null = null;
  private onMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.mouseDx += e.movementX;
    this.mouseDy += e.movementY;
  };
  private onDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (!this.locked) {
      void this.canvas.requestPointerLock();
      return;
    }
    this.firing = true;
  };
  private onUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this.firing = false;
  };
  private onLock = () => {
    this.locked = document.pointerLockElement === this.canvas;
    if (!this.locked) this.firing = false;
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.code !== "Space" || e.repeat) return;
    if (this.player.downUntil <= 0) return;
    e.preventDefault();
    this.cycleSpectate();
  };

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    opts: { practice: boolean; paintColor: number },
  ) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.practice = opts.practice;
    this.paintColor = opts.paintColor;
    this.group.name = "paintball-arena";
    this.buildArena();
    this.spawnActors();
    this.viewmodel = makeViewmodel(this.paintColor, TEAM_BLUE);
    this.camera.add(this.viewmodel);
    if (!this.camera.parent) this.scene.add(this.camera);
    this.scene.add(this.group);
    this.camera.fov = 74;
    this.camera.updateProjectionMatrix();
    this.canvas.addEventListener("mousemove", this.onMove);
    this.canvas.addEventListener("mousedown", this.onDown);
    document.addEventListener("mouseup", this.onUp);
    document.addEventListener("pointerlockchange", this.onLock);
    document.addEventListener("keydown", this.onKey);
  }

  get hud() {
    const enemiesUp = this.actors.filter((a) => a.team === "red" && a.downUntil <= 0).length;
    const alliesUp = this.livingTeammates().length;
    const spectate = this.spectateTarget();
    return {
      tags: this.player.tags,
      goal: TAGS_TO_WIN,
      deaths: this.player.deaths,
      loseAt: DEATHS_TO_LOSE,
      lives: this.player.downUntil > 0 ? 0 : 1,
      bots: enemiesUp,
      allies: alliesUp,
      timeMs: this.elapsed * 1000,
      practice: this.practice,
      tagged: this.player.downUntil > 0,
      spectating: this.player.downUntil > 0 && !!spectate,
      spectateLabel: spectate ? "TEAMMATE" : this.player.downUntil > 0 ? "WIPED" : "",
    };
  }

  setPaused(paused: boolean) {
    if (paused) {
      this.firing = false;
      if (this.locked) document.exitPointerLock();
    }
  }

  requestLook() {
    if (!this.locked) void this.canvas.requestPointerLock();
  }

  update(dt: number, input: InputState) {
    if (this.finished) return;
    this.elapsed += dt;
    this.yaw -= this.mouseDx * LOOK_SENS;
    this.pitch -= this.mouseDy * LOOK_SENS;
    this.pitch = Math.max(-1.15, Math.min(1.05, this.pitch));
    this.mouseDx = 0;
    this.mouseDy = 0;

    this.stepPlayer(dt, input);
    for (const bot of this.actors) {
      if (bot.isBot) this.stepBot(dt, bot);
    }
    this.syncMeshes();
    this.applyCamera();
    this.updateViewmodel(dt);
    if (this.firing || input.fire) this.tryShootPlayer();
    this.stepBalls(dt);

    if (this.practice) return;
    if (this.player.tags >= TAGS_TO_WIN) {
      this.finished = true;
      this.result = "win";
      document.exitPointerLock();
    } else if (this.player.deaths >= DEATHS_TO_LOSE) {
      this.finished = true;
      this.result = "lose";
      document.exitPointerLock();
    }
  }

  dispose() {
    document.exitPointerLock();
    this.canvas.removeEventListener("mousemove", this.onMove);
    this.canvas.removeEventListener("mousedown", this.onDown);
    document.removeEventListener("mouseup", this.onUp);
    document.removeEventListener("pointerlockchange", this.onLock);
    document.removeEventListener("keydown", this.onKey);
    this.camera.remove(this.viewmodel);
    if (this.camera.parent === this.scene) this.scene.remove(this.camera);
    this.disposeTree(this.viewmodel);
    this.group.removeFromParent();
    this.disposeTree(this.group);
    this.ballGeo.dispose();
    this.splatGeo.dispose();
    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();
  }

  private disposeTree(root: THREE.Object3D) {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.geometry !== this.ballGeo && obj.geometry !== this.splatGeo) obj.geometry?.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
  }

  private vinyl(color: number, emit = 0.1) {
    return mat(color, { metal: 0.22, rough: 0.38, emit });
  }

  private buildArena() {
    const turf = mat(0x3b8f42, { metal: 0.03, rough: 0.9 });
    const turfWear = mat(0x2d7434, { metal: 0.03, rough: 0.93 });
    const gravel = mat(0x6c6556, { metal: 0.05, rough: 0.88 });
    const line = mat(0xf4f7f2, { metal: 0.04, rough: 0.58 });
    const net = new THREE.MeshStandardMaterial({
      color: 0x2c3828,
      metalness: 0.08,
      roughness: 0.72,
      transparent: true,
      opacity: 0.42,
    });
    const post = mat(0x2a2e28, { metal: 0.28, rough: 0.5 });
    const inflBlue = this.vinyl(0x2a66f0);
    const inflCyan = this.vinyl(0x2ad4ff);
    const inflRed = this.vinyl(0xff3b2e);
    const inflPink = this.vinyl(0xff4ad8);
    const inflYel = this.vinyl(0xf0c020);
    const inflLime = this.vinyl(0x7cff4a, 0.08);
    const inflOra = this.vinyl(0xff8a1a);
    const rubber = mat(0x3a3228, { metal: 0.06, rough: 0.8 });

    box(this.group, HALF_X * 2 + 14, 0.16, HALF_Z * 2 + 14, gravel, 0, 0.08, 0);
    box(this.group, HALF_X * 2 + 0.8, 0.22, HALF_Z * 2 + 0.8, turf, 0, 0.19, 0);
    box(this.group, 8, 0.03, 10, turfWear, -7, 0.31, -9);
    box(this.group, 9, 0.03, 9, turfWear, 6, 0.31, 8);
    box(this.group, 6, 0.03, 7, turfWear, 0, 0.31, 0);
    box(this.group, 0.16, 0.05, HALF_Z * 2, line, 0, 0.32, 0);
    box(this.group, HALF_X * 2, 0.05, 0.16, line, 0, 0.32, 0);
    box(this.group, HALF_X * 2, 0.05, 0.1, line, 0, 0.32, -HALF_Z + 0.35);
    box(this.group, HALF_X * 2, 0.05, 0.1, line, 0, 0.32, HALF_Z - 0.35);
    box(this.group, 0.1, 0.05, HALF_Z * 2, line, -HALF_X + 0.35, 0.32, 0);
    box(this.group, 0.1, 0.05, HALF_Z * 2, line, HALF_X - 0.35, 0.32, 0);
    box(this.group, 4.6, 0.08, 3.4, rubber, 0, 0.31, -HALF_Z + 1.7);
    box(this.group, 4.6, 0.08, 3.4, rubber, 0, 0.31, HALF_Z - 1.7);

    const wallH = 3.5;
    this.addSolid(box(this.group, HALF_X * 2 + 1.4, wallH, 0.12, net, 0, wallH / 2, -HALF_Z - 0.45), HALF_X * 2 + 1.4, wallH, 0.45);
    this.addSolid(box(this.group, HALF_X * 2 + 1.4, wallH, 0.12, net, 0, wallH / 2, HALF_Z + 0.45), HALF_X * 2 + 1.4, wallH, 0.45);
    this.addSolid(box(this.group, 0.12, wallH, HALF_Z * 2 + 1.4, net, -HALF_X - 0.45, wallH / 2, 0), 0.45, wallH, HALF_Z * 2 + 1.4);
    this.addSolid(box(this.group, 0.12, wallH, HALF_Z * 2 + 1.4, net, HALF_X + 0.45, wallH / 2, 0), 0.45, wallH, HALF_Z * 2 + 1.4);

    for (let x = -HALF_X; x <= HALF_X; x += 3.5) {
      box(this.group, 0.12, 3.8, 0.12, post, x, 1.9, -HALF_Z - 0.45);
      box(this.group, 0.12, 3.8, 0.12, post, x, 1.9, HALF_Z + 0.45);
    }
    for (let z = -HALF_Z; z <= HALF_Z; z += 3.5) {
      box(this.group, 0.12, 3.8, 0.12, post, -HALF_X - 0.45, 1.9, z);
      box(this.group, 0.12, 3.8, 0.12, post, HALF_X + 0.45, 1.9, z);
    }
    box(this.group, HALF_X * 2 + 1.2, 0.1, 0.14, post, 0, 3.7, -HALF_Z - 0.45);
    box(this.group, HALF_X * 2 + 1.2, 0.1, 0.14, post, 0, 3.7, HALF_Z + 0.45);
    box(this.group, 0.14, 0.1, HALF_Z * 2 + 1.2, post, -HALF_X - 0.45, 3.7, 0);
    box(this.group, 0.14, 0.1, HALF_Z * 2 + 1.2, post, HALF_X + 0.45, 3.7, 0);

    box(this.group, 10, 1.2, 2.4, mat(0x4a4338, { metal: 0.08, rough: 0.8 }), 0, 0.7, -HALF_Z - 3.2);
    box(this.group, 10, 1.2, 2.4, mat(0x4a4338, { metal: 0.08, rough: 0.8 }), 0, 0.7, HALF_Z + 3.2);

    this.addInflatable(8.4, 1.6, 1.1, 0, 0.8, -HALF_Z + 0.15, inflBlue);
    this.addInflatable(8.4, 1.6, 1.1, 0, 0.8, HALF_Z - 0.15, inflRed);

    this.addSnake(-10.6, -15, inflCyan);
    this.addSnake(10.6, 15, inflPink);
    this.addDorito(9.2, -15.2, inflYel);
    this.addDorito(-9.2, 15.2, inflOra);
    this.addCan(-2.8, -15.4, 0.68, 1.5, inflLime);
    this.addCan(2.8, 15.4, 0.68, 1.5, inflYel);
    this.addInflatable(2.2, 1.2, 1.15, -5.2, 0.6, -8.2, inflBlue);
    this.addInflatable(2.2, 1.2, 1.15, 5.4, 0.6, -8.6, inflCyan);
    this.addInflatable(2.2, 1.2, 1.15, 5.2, 0.6, 8.2, inflRed);
    this.addInflatable(2.2, 1.2, 1.15, -5.4, 0.6, 8.6, inflPink);
    this.addCan(-11.2, 0, 0.64, 1.5, inflYel);
    this.addCan(11.2, 0, 0.64, 1.5, inflOra);
    this.addTemple(0, 0, inflLime);
    this.addInflatable(1.45, 1.75, 3.6, -15.4, 0.88, -7.5, inflBlue);
    this.addInflatable(1.45, 1.75, 3.6, 15.4, 0.88, 7.5, inflRed);
    this.addInflatable(3.4, 1.05, 1.15, -7.6, 0.53, -19.2, inflYel);
    this.addInflatable(3.4, 1.05, 1.15, 7.6, 0.53, 19.2, inflOra);
    this.addDorito(-8.2, -19, inflPink);
    this.addDorito(8.2, 19, inflCyan);
    this.addCan(-4.6, -10.2, 0.52, 1.2, inflOra);
    this.addCan(4.6, 10.2, 0.52, 1.2, inflBlue);
    this.addCan(0, -6.5, 0.5, 1.15, inflPink);
    this.addCan(0, 6.5, 0.5, 1.15, inflCyan);

    this.stain(-10, 0.35, -14, 0x2a66f0);
    this.stain(9, 0.35, -15, 0xff3b2e);
    this.stain(0, 0.35, 0, 0xf0c020);
    this.stain(11, 0.35, 2, 0xff4ad8);
    this.stain(-6, 0.35, 8, 0x7cff4a);
    this.stain(4, 0.35, -8, 0xff8a1a);
    this.stain(-2, 0.35, 12, 0xff3b2e);
    this.stain(7, 0.35, -4, 0x2ad4ff);
  }

  private addInflatable(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
    const lip = mat(0x101214, { metal: 0.22, rough: 0.52 });
    this.addSolid(box(this.group, w, h, d, material, x, y, z), w, h, d);
    box(this.group, w * 0.92, 0.16, d * 0.92, material, x, y + h / 2 - 0.02, z);
    box(this.group, w + 0.12, 0.12, d + 0.12, lip, x, y - h / 2 + 0.06, z);
  }

  private addSnake(x: number, z: number, material: THREE.Material) {
    const dir = z < 0 ? 1 : -1;
    for (let i = 0; i < 5; i++) {
      const zz = z + dir * i * 1.45;
      const xx = x + Math.sin(i * 0.85) * 0.4;
      this.addInflatable(1.3, 0.68, 1.55, xx, 0.34, zz, material);
    }
  }

  private addDorito(x: number, z: number, material: THREE.Material) {
    box(this.group, 2, 0.52, 1.8, material, x, 0.46, z);
    box(this.group, 1.35, 0.5, 1.2, material, x, 0.95, z);
    box(this.group, 0.75, 0.44, 0.75, material, x, 1.38, z);
    this.solids.push({
      minX: x - 1,
      maxX: x + 1,
      minY: 0.2,
      maxY: 1.6,
      minZ: z - 0.9,
      maxZ: z + 0.9,
    });
  }

  private addCan(x: number, z: number, r: number, h: number, material: THREE.Material) {
    cyl(this.group, r, r, h, material, x, h / 2 + 0.22, z, 0, 0, 0, 12);
    box(this.group, r * 2.15, 0.12, r * 2.15, mat(0x101214, { metal: 0.22, rough: 0.52 }), x, 0.26, z);
    this.solids.push({
      minX: x - r,
      maxX: x + r,
      minY: 0.2,
      maxY: h + 0.22,
      minZ: z - r,
      maxZ: z + r,
    });
  }

  private addTemple(x: number, z: number, material: THREE.Material) {
    this.addInflatable(5, 1.08, 1.3, x, 0.54, z, material);
    this.addInflatable(1.4, 1.6, 1.4, x, 0.8, z, this.vinyl(0xf0c020));
  }

  private stain(x: number, y: number, z: number, color: number) {
    const m = new THREE.Mesh(this.splatGeo, mat(color, { metal: 0.04, rough: 0.78, emit: 0.14 }));
    m.position.set(x, y, z);
    m.rotation.y = Math.random() * Math.PI;
    m.scale.set(1.5 + Math.random(), 1, 1.2 + Math.random());
    m.castShadow = false;
    this.group.add(m);
  }

  private addSolid(mesh: THREE.Mesh, w: number, h: number, d: number) {
    const p = mesh.position;
    this.solids.push({
      minX: p.x - w / 2,
      maxX: p.x + w / 2,
      minY: p.y - h / 2,
      maxY: p.y + h / 2,
      minZ: p.z - d / 2,
      maxZ: p.z + d / 2,
    });
  }

  private spawnActors() {
    this.player = this.makeActor(0, -HALF_Z + 2.4, this.paintColor, false, "blue");
    this.yaw = 0;
    this.actors.push(this.player);

    const allySpots = [
      [-6.2, -HALF_Z + 3.2],
      [6.2, -HALF_Z + 3.2],
      [0, -HALF_Z + 5.4],
    ] as const;
    for (let i = 0; i < ALLY_COUNT; i++) {
      const [x, z] = allySpots[i]!;
      this.actors.push(this.makeActor(x, z, ALLY_PAINT[i]!, true, "blue"));
    }

    const enemySpots = [
      [0, HALF_Z - 2.4],
      [-8, HALF_Z - 4.2],
      [8, HALF_Z - 4.2],
      [-14.2, HALF_Z - 8],
      [14.2, HALF_Z - 8],
    ] as const;
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const [x, z] = enemySpots[i]!;
      this.actors.push(this.makeActor(x, z, ENEMY_PAINT[i]!, true, "red"));
    }
  }

  private makeActor(x: number, z: number, color: number, isBot: boolean, team: Team): Actor {
    const jersey = team === "blue" ? TEAM_BLUE : TEAM_RED;
    const group = isBot ? makePlayer(jersey, color) : new THREE.Group();
    group.position.set(x, 0, z);
    group.visible = isBot;
    if (isBot) group.scale.setScalar(1.18);
    this.group.add(group);
    const cover = this.covers[(Math.abs(Math.round(x + z)) + (isBot ? 3 : 0)) % this.covers.length]!;
    return {
      id: this.nextActorId++,
      group,
      x,
      z,
      y: 0,
      heading: team === "red" ? Math.PI : 0,
      pitch: 0,
      radius: 0.42,
      color,
      team,
      tags: 0,
      deaths: 0,
      downUntil: 0,
      shootCd: 0.5 + Math.random() * 0.7,
      burstLeft: 0,
      botStrafe: Math.random() > 0.5 ? 1 : -1,
      botCover: { ...cover },
      isBot,
      moving: false,
    };
  }

  /** Living same-team bots — preferred death-spectate targets. */
  private livingTeammates(): Actor[] {
    return this.actors.filter(
      (a) => a.isBot && a.team === this.player.team && a.downUntil <= 0,
    );
  }

  private spectateTarget(): Actor | null {
    if (this.player.downUntil <= 0) {
      this.spectateId = null;
      return null;
    }
    const mates = this.livingTeammates();
    if (!mates.length) {
      this.spectateId = null;
      return null;
    }
    let target = mates.find((a) => a.id === this.spectateId) ?? null;
    if (!target) {
      target = mates[0]!;
      this.spectateId = target.id;
    }
    return target;
  }

  /** Pick next living teammate (Space) while wiped. */
  cycleSpectate() {
    if (this.player.downUntil <= 0) return;
    const mates = this.livingTeammates();
    if (!mates.length) {
      this.spectateId = null;
      return;
    }
    const i = mates.findIndex((a) => a.id === this.spectateId);
    this.spectateId = mates[(i + 1) % mates.length]!.id;
  }

  private stepPlayer(dt: number, input: InputState) {
    const p = this.player;
    if (p.downUntil > 0) {
      p.downUntil -= dt;
      this.firing = false;
      // Keep following a living teammate; if they drop, spectateTarget() swaps.
      this.spectateTarget();
      if (p.downUntil <= 0) {
        this.spectateId = null;
        this.respawn(p, 0, -HALF_Z + 2.4, 0);
      }
      p.moving = false;
      p.shootCd = Math.max(0, p.shootCd - dt);
      return;
    }
    this.spectateId = null;
    p.heading = this.yaw;
    p.pitch = this.pitch;
    const fwdX = Math.sin(this.yaw);
    const fwdZ = Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    let mx = 0;
    let mz = 0;
    if (input.throttle > 0.1) {
      mx += fwdX;
      mz += fwdZ;
    }
    if (input.brake > 0.1) {
      mx -= fwdX;
      mz -= fwdZ;
    }
    mx += -input.steer * rightX;
    mz += -input.steer * rightZ;
    const mag = Math.hypot(mx, mz);
    p.moving = mag > 0.01;
    if (p.moving) {
      const k = SPEED / mag;
      this.moveActor(p, mx * k * dt, mz * k * dt);
    }
    p.shootCd = Math.max(0, p.shootCd - dt);
  }

  private tryShootPlayer() {
    const p = this.player;
    if (p.downUntil > 0 || p.shootCd > 0) return;
    p.shootCd = COOLDOWN;
    this.kick = 1;
    this.flashUntil = this.elapsed + 0.045;
    const muzzle = this.viewmodel.getObjectByName("muzzle");
    if (muzzle) muzzle.getWorldPosition(this.muzzleTmp);
    else this.muzzleTmp.set(p.x, EYE, p.z);
    this.camera.getWorldDirection(this.dirTmp);
    this.aimTmp.copy(this.camera.position).addScaledVector(this.dirTmp, 52);
    this.dirTmp.copy(this.aimTmp).sub(this.muzzleTmp).normalize();
    this.spawnBall(this.muzzleTmp, this.dirTmp, p.color, p.team);
  }

  private stepBot(dt: number, bot: Actor) {
    if (bot.downUntil > 0) {
      bot.downUntil -= dt;
      bot.group.visible = bot.downUntil <= 0;
      bot.moving = false;
      if (bot.downUntil <= 0) {
        if (bot.team === "red") {
          const side = Math.random() > 0.5 ? 1 : -1;
          this.respawn(bot, side * (6 + Math.random() * 10), HALF_Z - 2.4 - Math.random() * 3, Math.PI);
        } else {
          const side = Math.random() > 0.5 ? 1 : -1;
          this.respawn(bot, side * (4 + Math.random() * 8), -HALF_Z + 2.8 + Math.random() * 2.5, 0);
        }
      }
      return;
    }

    const foes = this.actors.filter((a) => a.team !== bot.team && a.downUntil <= 0);
    // Prefer the player as a red target; otherwise nearest enemy.
    let target: Actor | null = null;
    if (bot.team === "red" && this.player.downUntil <= 0) target = this.player;
    else if (foes.length) {
      target = foes[0]!;
      let best = Infinity;
      for (const f of foes) {
        const d = (f.x - bot.x) ** 2 + (f.z - bot.z) ** 2;
        if (d < best) {
          best = d;
          target = f;
        }
      }
    }

    const want = bot.botCover;
    const toCx = want.x - bot.x;
    const toCz = want.z - bot.z;
    const cDist = Math.hypot(toCx, toCz);
    if (cDist > 1.3) {
      this.moveActor(bot, (toCx / cDist) * 5.1 * dt, (toCz / cDist) * 5.1 * dt);
      bot.moving = true;
    } else {
      bot.botStrafe *= Math.random() < 0.012 ? -1 : 1;
      const rx = Math.cos(bot.heading);
      const rz = -Math.sin(bot.heading);
      this.moveActor(bot, rx * bot.botStrafe * 2.4 * dt, rz * bot.botStrafe * 2.4 * dt);
      bot.moving = true;
      if (Math.random() < 0.01) bot.botCover = this.covers[(Math.random() * this.covers.length) | 0]!;
    }

    if (target) {
      const toPx = target.x - bot.x;
      const toPz = target.z - bot.z;
      const dist = Math.hypot(toPx, toPz) || 1;
      bot.heading = Math.atan2(toPx, toPz);
      bot.pitch = 0;
      bot.shootCd -= dt;
      const los = this.hasLos(bot.x, EYE, bot.z, target.x, EYE, target.z);
      const canShoot = !this.practice && los && dist < 30 && bot.shootCd <= 0;
      if (canShoot) {
        if (bot.burstLeft <= 0) bot.burstLeft = 2 + ((Math.random() * 3) | 0);
        bot.burstLeft -= 1;
        bot.shootCd = bot.burstLeft > 0 ? 0.11 : 0.55 + Math.random() * 0.45;
        bot.group.position.set(bot.x, bot.y, bot.z);
        bot.group.rotation.y = bot.heading;
        bot.group.updateMatrixWorld(true);
        const muzzle = bot.group.getObjectByName("muzzle");
        if (muzzle) muzzle.getWorldPosition(this.muzzleTmp);
        else this.muzzleTmp.set(bot.x, EYE, bot.z);
        const jitter = (Math.random() - 0.5) * 0.07;
        const yaw = bot.heading + jitter;
        const pitch = 0.03;
        const cy = Math.cos(pitch);
        this.dirTmp.set(Math.sin(yaw) * cy, Math.sin(pitch), Math.cos(yaw) * cy);
        this.spawnBall(this.muzzleTmp, this.dirTmp, bot.color, bot.team);
        const flash = bot.group.getObjectByName("flash") as THREE.Mesh | undefined;
        if (flash) {
          flash.visible = true;
          window.setTimeout(() => {
            flash.visible = false;
          }, 40);
        }
      }
    } else {
      bot.shootCd = Math.max(0, bot.shootCd - dt);
    }
  }

  private spawnBall(origin: THREE.Vector3, dir: THREE.Vector3, color: number, team: Team) {
    const mesh = new THREE.Mesh(this.ballGeo, mat(color, { metal: 0.05, rough: 0.32, emit: 0.55 }));
    mesh.position.copy(origin);
    mesh.castShadow = false;
    this.group.add(mesh);
    this.balls.push({
      mesh,
      vx: dir.x * BALL_SPEED,
      vy: dir.y * BALL_SPEED,
      vz: dir.z * BALL_SPEED,
      life: BALL_LIFE,
      team,
      color,
    });
  }

  private updateViewmodel(dt: number) {
    const down = this.player.downUntil > 0;
    this.viewmodel.visible = !down;
    this.kick = Math.max(0, this.kick - dt * 14);
    const t = this.elapsed;
    const run = this.player.moving ? 1 : 0.35;
    this.viewmodel.position.set(
      0.24 + Math.sin(t * 1.7 * run) * 0.006,
      -0.18 + Math.sin(t * 2.3 * run) * 0.01 + this.kick * 0.02,
      -0.52 + this.kick * 0.055,
    );
    this.viewmodel.rotation.set(0.05 + this.kick * 0.18, 0.1, 0.04);
    const flash = this.viewmodel.getObjectByName("flash") as THREE.Mesh | undefined;
    if (flash) flash.visible = this.elapsed < this.flashUntil;
    const gun = this.viewmodel.getObjectByName("marker");
    if (gun) gun.rotation.z = 0.06 + Math.sin(this.elapsed * 42) * this.kick * 0.07;
  }

  private stepBalls(dt: number) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i]!;
      b.life -= dt;
      const nx = b.mesh.position.x + b.vx * dt;
      const ny = b.mesh.position.y + b.vy * dt;
      const nz = b.mesh.position.z + b.vz * dt;
      b.vy -= GRAVITY * dt;
      if (b.life <= 0 || ny < 0.1) {
        if (ny < 0.1) this.splat(nx, 0.33, nz, b.color);
        this.killBall(i);
        continue;
      }
      let hit = false;
      for (const s of this.solids) {
        if (nx > s.minX && nx < s.maxX && nz > s.minZ && nz < s.maxZ && ny > s.minY && ny < s.maxY) {
          this.splat(nx, ny, nz, b.color);
          hit = true;
          break;
        }
      }
      if (hit) {
        this.killBall(i);
        continue;
      }
      for (const a of this.actors) {
        if (a.downUntil > 0) continue;
        if (a.team === b.team) continue; // friendly fire off
        const dx = nx - a.x;
        const dz = nz - a.z;
        const dy = ny - (EYE - 0.15);
        if (dx * dx + dz * dz + dy * dy * 0.45 < HIT_R * HIT_R) {
          this.tag(a, b.color, b.team);
          this.splat(nx, ny, nz, b.color);
          this.killBall(i);
          hit = true;
          break;
        }
      }
      if (hit) continue;
      b.mesh.position.set(nx, ny, nz);
    }
  }

  private tag(victim: Actor, color: number, byTeam: Team) {
    victim.downUntil = RESPAWN_S;
    victim.deaths += 1;
    this.splat(victim.x, EYE, victim.z, color);
    this.splat(victim.x + 0.2, EYE - 0.2, victim.z, color);
    if (victim.isBot) victim.group.visible = false;
    // Credit the local player for enemy tags (player or ally paint).
    if (victim.team === "red" && byTeam === "blue") this.player.tags += 1;
    // If we were watching this teammate, jump to another living one.
    if (victim.id === this.spectateId) {
      this.spectateId = null;
      this.spectateTarget();
    }
    if (victim === this.player) {
      this.spectateId = null;
      this.spectateTarget();
    }
  }

  private splat(x: number, y: number, z: number, color: number) {
    if (this.splats.length > 110) {
      const old = this.splats.shift();
      old?.removeFromParent();
      if (old && old.material instanceof THREE.Material) old.material.dispose();
    }
    const m = new THREE.Mesh(this.splatGeo, mat(color, { metal: 0.04, rough: 0.7, emit: 0.28 }));
    m.position.set(x, Math.max(0.33, y), z);
    m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.6);
    m.scale.set(0.7 + Math.random() * 1.1, 1, 0.6 + Math.random() * 0.9);
    m.castShadow = false;
    this.group.add(m);
    this.splats.push(m);
  }

  private killBall(i: number) {
    const b = this.balls[i]!;
    b.mesh.removeFromParent();
    (b.mesh.material as THREE.Material).dispose();
    this.balls.splice(i, 1);
  }

  private respawn(a: Actor, x: number, z: number, heading: number) {
    a.x = x;
    a.z = z;
    a.heading = heading;
    a.group.visible = true;
    if (!a.isBot) {
      this.yaw = heading;
      this.pitch = -0.06;
    }
  }

  private moveActor(a: Actor, dx: number, dz: number) {
    const nx = THREE.MathUtils.clamp(a.x + dx, -HALF_X + 1.1, HALF_X - 1.1);
    const nz = THREE.MathUtils.clamp(a.z + dz, -HALF_Z + 1.1, HALF_Z - 1.1);
    if (!this.blocked(nx, a.z, a.radius)) a.x = nx;
    if (!this.blocked(a.x, nz, a.radius)) a.z = nz;
  }

  private blocked(x: number, z: number, r: number) {
    for (const s of this.solids) {
      if (s.maxY < 0.45) continue;
      if (x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ) return true;
    }
    return false;
  }

  private hasLos(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    const steps = 16;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      const z = az + (bz - az) * t;
      for (const s of this.solids) {
        if (x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ && y > s.minY && y < s.maxY) return false;
      }
    }
    return true;
  }

  private syncMeshes() {
    for (const a of this.actors) {
      const bob = a.moving && a.downUntil <= 0 ? Math.abs(Math.sin(this.elapsed * 11)) * 0.05 : 0;
      a.y = bob;
      a.group.position.set(a.x, a.y, a.z);
      a.group.rotation.y = a.heading;
      a.group.visible = a.downUntil <= 0;
    }
    this.player.group.visible = false;
  }

  private applyCamera() {
    const p = this.player;
    if (p.downUntil > 0) {
      this.viewmodel.visible = false;
      const mate = this.spectateTarget();
      if (mate) {
        // Third-person chase cam on a living teammate (same team only).
        const heading = mate.heading;
        const backX = -Math.sin(heading) * SPECTATE_BACK;
        const backZ = -Math.cos(heading) * SPECTATE_BACK;
        this.camera.up.set(0, 1, 0);
        this.camera.position.set(mate.x + backX, SPECTATE_HEIGHT, mate.z + backZ);
        this.camera.lookAt(mate.x, SPECTATE_LOOK, mate.z);
        return;
      }
      // No teammates left — soft death cam at your wipe spot.
      const cy = Math.cos(-0.45);
      this.camera.position.set(p.x, EYE + 1.1, p.z);
      this.camera.lookAt(
        p.x + Math.sin(this.yaw) * cy * 6,
        EYE - 0.4,
        p.z + Math.cos(this.yaw) * cy * 6,
      );
      return;
    }
    const cy = Math.cos(this.pitch);
    const bob = p.moving ? Math.sin(this.elapsed * 11) * 0.04 : 0;
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(p.x, EYE + bob, p.z);
    this.camera.lookAt(
      p.x + Math.sin(this.yaw) * cy * 8,
      EYE + bob + Math.sin(this.pitch) * 8,
      p.z + Math.cos(this.yaw) * cy * 8,
    );
  }
}
