import * as THREE from "three";

const SPARK_COUNT = 72;
const FLAME_COUNT = 7;

const _world = new THREE.Vector3();
const _flameGeo = new THREE.ConeGeometry(0.42, 1.55, 6);
_flameGeo.translate(0, 0.78, 0);

/**
 * World-space wreck fire so every client sees the same burning car —
 * not parented to the vehicle (layer / culling / matrix issues hide that).
 */
export class WreckFire {
  private readonly root: THREE.Group;
  private readonly sparks: THREE.Points;
  private readonly light: THREE.PointLight;
  private readonly flames: THREE.Mesh[] = [];
  private readonly flameScale: number[] = [];
  private readonly life: Float32Array;
  private readonly vel: Float32Array;
  private readonly tex: THREE.CanvasTexture;
  private readonly scene: THREE.Scene;
  private readonly anchor: THREE.Object3D;
  private readonly origin: { y: number; spread: number; z: number };
  private time = 0;

  constructor(anchor: THREE.Object3D, scene: THREE.Scene) {
    this.anchor = anchor;
    this.scene = scene;
    const kind = String((anchor as THREE.Object3D & { userData?: { kind?: string } }).userData?.kind ?? "car");
    this.origin = kind === "bike" ? { y: 0.7, spread: 0.42, z: 0.08 } : { y: 0.85, spread: 0.95, z: 0.15 };

    this.root = new THREE.Group();
    this.root.name = "wreck-fire";
    this.root.frustumCulled = false;
    this.scene.add(this.root);

    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff7a22,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < FLAME_COUNT; i++) {
      const mesh = new THREE.Mesh(_flameGeo, flameMat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      this.root.add(mesh);
      this.flames.push(mesh);
      this.flameScale.push(0.7 + Math.random() * 0.7);
    }

    this.tex = fireTexture();
    this.life = new Float32Array(SPARK_COUNT);
    this.vel = new Float32Array(SPARK_COUNT * 3);
    const positions = new Float32Array(SPARK_COUNT * 3);
    for (let i = 0; i < SPARK_COUNT; i++) {
      this.seed(i, positions);
      this.life[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: this.tex,
      color: 0xffc45a,
      size: kind === "bike" ? 0.7 : 1.05,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.sparks = new THREE.Points(geo, mat);
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 6;
    this.root.add(this.sparks);

    this.light = new THREE.PointLight(0xff6a2e, 6.5, kind === "bike" ? 14 : 22);
    this.light.position.set(0, 1.2, 0);
    this.root.add(this.light);

    this.syncRoot();
  }

  update(dt: number) {
    this.time += dt;
    this.syncRoot();
    const dtClamped = Math.min(dt, 0.05);
    const pos = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      this.life[i]! -= dtClamped * (0.8 + Math.random() * 0.5);
      const i3 = i * 3;
      if (this.life[i]! <= 0) {
        this.seed(i, arr);
        continue;
      }
      this.vel[i3]! *= 0.96;
      this.vel[i3 + 1]! += 7.2 * dtClamped;
      this.vel[i3 + 2]! *= 0.96;
      arr[i3]! += this.vel[i3]! * dtClamped;
      arr[i3 + 1]! += this.vel[i3 + 1]! * dtClamped;
      arr[i3 + 2]! += this.vel[i3 + 2]! * dtClamped;
    }
    pos.needsUpdate = true;

    for (let i = 0; i < this.flames.length; i++) {
      const mesh = this.flames[i]!;
      const pulse = 0.82 + Math.sin(this.time * (11 + i * 2.1) + i) * 0.22 + Math.random() * 0.08;
      const s = this.flameScale[i]! * pulse;
      const spread = this.origin.spread;
      mesh.position.set(
        Math.sin(this.time * 3.1 + i * 1.7) * spread * 0.28,
        0.15 + (i % 3) * 0.12,
        Math.cos(this.time * 2.4 + i * 1.3) * spread * 0.28,
      );
      mesh.scale.set(s * 0.85, s * (1.15 + Math.sin(this.time * 14 + i) * 0.2), s * 0.85);
      mesh.rotation.y = this.time * 0.8 + i;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(i % 2 === 0 ? 0xff9a2e : 0xff4a12);
    }
    this.light.intensity = 5.2 + Math.sin(this.time * 16.5) * 1.6 + Math.random() * 0.7;
  }

  dispose() {
    this.scene.remove(this.root);
    this.sparks.geometry.dispose();
    const sparkMat = this.sparks.material as THREE.PointsMaterial;
    sparkMat.map = null;
    sparkMat.dispose();
    this.tex.dispose();
    const flameMat = this.flames[0]?.material as THREE.MeshBasicMaterial | undefined;
    flameMat?.dispose();
    this.light.dispose();
  }

  private syncRoot() {
    this.anchor.updateMatrixWorld();
    this.anchor.getWorldPosition(_world);
    this.root.position.set(_world.x, _world.y + this.origin.y * 0.35, _world.z);
  }

  private seed(i: number, positions: Float32Array) {
    const i3 = i * 3;
    const spread = this.origin.spread;
    positions[i3] = (Math.random() - 0.5) * spread;
    positions[i3 + 1] = Math.random() * 0.35;
    positions[i3 + 2] = this.origin.z + (Math.random() - 0.5) * spread;
    this.vel[i3] = (Math.random() - 0.5) * 0.7;
    this.vel[i3 + 1] = 1.8 + Math.random() * 2.6;
    this.vel[i3 + 2] = (Math.random() - 0.5) * 0.7;
    this.life[i] = 0.4 + Math.random() * 0.55;
  }
}

function fireTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, "rgba(255,245,180,1)");
  g.addColorStop(0.22, "rgba(255,170,40,0.95)");
  g.addColorStop(0.55, "rgba(255,60,16,0.55)");
  g.addColorStop(1, "rgba(40,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
