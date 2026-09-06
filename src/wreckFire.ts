import * as THREE from "three";

const SPARK_COUNT = 110;
const SMOKE_COUNT = 48;
const FLAME_COUNT = 12;

const _world = new THREE.Vector3();
const _flameGeo = new THREE.ConeGeometry(0.62, 2.35, 7);
_flameGeo.translate(0, 1.15, 0);
const _coreGeo = new THREE.SphereGeometry(0.55, 10, 8);

/**
 * World-space wreck fire so every client sees the same burning car —
 * not parented to the vehicle (layer / culling / matrix issues hide that).
 */
export class WreckFire {
  private readonly root: THREE.Group;
  private readonly sparks: THREE.Points;
  private readonly smoke: THREE.Points;
  private readonly light: THREE.PointLight;
  private readonly lightCore: THREE.PointLight;
  private readonly flames: THREE.Mesh[] = [];
  private readonly flameScale: number[] = [];
  private readonly core: THREE.Mesh;
  private readonly life: Float32Array;
  private readonly vel: Float32Array;
  private readonly smokeLife: Float32Array;
  private readonly smokeVel: Float32Array;
  private readonly tex: THREE.CanvasTexture;
  private readonly smokeTex: THREE.CanvasTexture;
  private readonly scene: THREE.Scene;
  private readonly anchor: THREE.Object3D;
  private readonly origin: { y: number; spread: number; z: number };
  private readonly bike: boolean;
  private time = 0;

  constructor(anchor: THREE.Object3D, scene: THREE.Scene) {
    this.anchor = anchor;
    this.scene = scene;
    const kind = String((anchor as THREE.Object3D & { userData?: { kind?: string } }).userData?.kind ?? "car");
    this.bike = kind === "bike";
    this.origin = this.bike ? { y: 0.7, spread: 0.55, z: 0.08 } : { y: 0.95, spread: 1.35, z: 0.18 };

    this.root = new THREE.Group();
    this.root.name = "wreck-fire";
    this.root.frustumCulled = false;
    this.scene.add(this.root);

    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff7a22,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < FLAME_COUNT; i++) {
      const mesh = new THREE.Mesh(_flameGeo, flameMat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      this.root.add(mesh);
      this.flames.push(mesh);
      this.flameScale.push(0.95 + Math.random() * 1.15);
    }

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.core = new THREE.Mesh(_coreGeo, coreMat);
    this.core.frustumCulled = false;
    this.core.renderOrder = 4;
    this.core.position.set(0, 0.55, 0);
    this.root.add(this.core);

    this.tex = fireTexture();
    this.smokeTex = smokeTexture();
    this.life = new Float32Array(SPARK_COUNT);
    this.vel = new Float32Array(SPARK_COUNT * 3);
    const positions = new Float32Array(SPARK_COUNT * 3);
    for (let i = 0; i < SPARK_COUNT; i++) {
      this.seedSpark(i, positions);
      this.life[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: this.tex,
      color: 0xffc45a,
      size: this.bike ? 0.95 : 1.55,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.sparks = new THREE.Points(geo, mat);
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 6;
    this.root.add(this.sparks);

    this.smokeLife = new Float32Array(SMOKE_COUNT);
    this.smokeVel = new Float32Array(SMOKE_COUNT * 3);
    const smokePos = new Float32Array(SMOKE_COUNT * 3);
    for (let i = 0; i < SMOKE_COUNT; i++) {
      this.seedSmoke(i, smokePos);
      this.smokeLife[i] = Math.random();
    }
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      map: this.smokeTex,
      color: 0x6a6a6a,
      size: this.bike ? 2.4 : 3.6,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.smoke = new THREE.Points(smokeGeo, smokeMat);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 3;
    this.root.add(this.smoke);

    this.light = new THREE.PointLight(0xff6a2e, this.bike ? 9 : 14, this.bike ? 20 : 34);
    this.light.position.set(0, 1.6, 0);
    this.root.add(this.light);

    this.lightCore = new THREE.PointLight(0xffd080, this.bike ? 4 : 7, this.bike ? 10 : 16);
    this.lightCore.position.set(0, 0.7, 0);
    this.root.add(this.lightCore);

    this.syncRoot();
  }

  update(dt: number) {
    this.time += dt;
    this.syncRoot();
    const dtClamped = Math.min(dt, 0.05);
    const pos = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      this.life[i]! -= dtClamped * (0.75 + Math.random() * 0.55);
      const i3 = i * 3;
      if (this.life[i]! <= 0) {
        this.seedSpark(i, arr);
        continue;
      }
      this.vel[i3]! *= 0.965;
      this.vel[i3 + 1]! += 8.5 * dtClamped;
      this.vel[i3 + 2]! *= 0.965;
      arr[i3]! += this.vel[i3]! * dtClamped;
      arr[i3 + 1]! += this.vel[i3 + 1]! * dtClamped;
      arr[i3 + 2]! += this.vel[i3 + 2]! * dtClamped;
    }
    pos.needsUpdate = true;

    const smokePos = this.smoke.geometry.getAttribute("position") as THREE.BufferAttribute;
    const smokeArr = smokePos.array as Float32Array;
    for (let i = 0; i < SMOKE_COUNT; i++) {
      this.smokeLife[i]! -= dtClamped * (0.28 + Math.random() * 0.22);
      const i3 = i * 3;
      if (this.smokeLife[i]! <= 0) {
        this.seedSmoke(i, smokeArr);
        continue;
      }
      this.smokeVel[i3]! *= 0.985;
      this.smokeVel[i3 + 1]! += 2.4 * dtClamped;
      this.smokeVel[i3 + 2]! *= 0.985;
      smokeArr[i3]! += this.smokeVel[i3]! * dtClamped;
      smokeArr[i3 + 1]! += this.smokeVel[i3 + 1]! * dtClamped;
      smokeArr[i3 + 2]! += this.smokeVel[i3 + 2]! * dtClamped;
    }
    smokePos.needsUpdate = true;

    const spread = this.origin.spread;
    for (let i = 0; i < this.flames.length; i++) {
      const mesh = this.flames[i]!;
      const pulse = 0.78 + Math.sin(this.time * (10 + i * 1.9) + i) * 0.28 + Math.random() * 0.1;
      const s = this.flameScale[i]! * pulse;
      const ring = (i / FLAME_COUNT) * Math.PI * 2;
      mesh.position.set(
        Math.sin(this.time * 3.4 + ring) * spread * 0.38 + Math.cos(ring) * spread * 0.22,
        0.12 + (i % 4) * 0.18,
        Math.cos(this.time * 2.7 + ring) * spread * 0.38 + Math.sin(ring) * spread * 0.22,
      );
      mesh.scale.set(s * 0.95, s * (1.35 + Math.sin(this.time * 16 + i) * 0.28), s * 0.95);
      mesh.rotation.y = this.time * 1.1 + i;
      mesh.rotation.z = Math.sin(this.time * 7 + i) * 0.12;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(i % 3 === 0 ? 0xfff0a0 : i % 3 === 1 ? 0xff8a1a : 0xff3a08);
      mat.opacity = 0.78 + Math.sin(this.time * 18 + i) * 0.12;
    }

    const corePulse = 0.85 + Math.sin(this.time * 14) * 0.2 + Math.random() * 0.08;
    this.core.scale.setScalar(corePulse * (this.bike ? 0.85 : 1.25));
    const coreMat = this.core.material as THREE.MeshBasicMaterial;
    coreMat.opacity = 0.55 + Math.sin(this.time * 22) * 0.15;

    this.light.intensity = (this.bike ? 7.5 : 12) + Math.sin(this.time * 18) * 2.8 + Math.random() * 1.4;
    this.lightCore.intensity = (this.bike ? 3.2 : 5.5) + Math.sin(this.time * 24) * 1.2;
  }

  dispose() {
    this.scene.remove(this.root);
    this.sparks.geometry.dispose();
    const sparkMat = this.sparks.material as THREE.PointsMaterial;
    sparkMat.map = null;
    sparkMat.dispose();
    this.smoke.geometry.dispose();
    const smokeMat = this.smoke.material as THREE.PointsMaterial;
    smokeMat.map = null;
    smokeMat.dispose();
    this.tex.dispose();
    this.smokeTex.dispose();
    const flameMat = this.flames[0]?.material as THREE.MeshBasicMaterial | undefined;
    flameMat?.dispose();
    (this.core.material as THREE.Material).dispose();
    this.light.dispose();
    this.lightCore.dispose();
  }

  private syncRoot() {
    this.anchor.updateMatrixWorld();
    this.anchor.getWorldPosition(_world);
    this.root.position.set(_world.x, _world.y + this.origin.y * 0.35, _world.z);
  }

  private seedSpark(i: number, positions: Float32Array) {
    const i3 = i * 3;
    const spread = this.origin.spread;
    positions[i3] = (Math.random() - 0.5) * spread * 1.15;
    positions[i3 + 1] = Math.random() * 0.55;
    positions[i3 + 2] = this.origin.z + (Math.random() - 0.5) * spread * 1.15;
    this.vel[i3] = (Math.random() - 0.5) * 1.4;
    this.vel[i3 + 1] = 2.4 + Math.random() * 4.2;
    this.vel[i3 + 2] = (Math.random() - 0.5) * 1.4;
    this.life[i] = 0.35 + Math.random() * 0.65;
  }

  private seedSmoke(i: number, positions: Float32Array) {
    const i3 = i * 3;
    const spread = this.origin.spread;
    positions[i3] = (Math.random() - 0.5) * spread * 0.9;
    positions[i3 + 1] = 0.4 + Math.random() * 0.8;
    positions[i3 + 2] = this.origin.z + (Math.random() - 0.5) * spread * 0.9;
    this.smokeVel[i3] = (Math.random() - 0.5) * 0.55;
    this.smokeVel[i3 + 1] = 0.9 + Math.random() * 1.6;
    this.smokeVel[i3 + 2] = (Math.random() - 0.5) * 0.55;
    this.smokeLife[i] = 0.9 + Math.random() * 1.4;
  }
}

function fireTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, "rgba(255,250,210,1)");
  g.addColorStop(0.18, "rgba(255,200,70,0.98)");
  g.addColorStop(0.45, "rgba(255,90,20,0.7)");
  g.addColorStop(0.75, "rgba(180,20,0,0.28)");
  g.addColorStop(1, "rgba(40,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function smokeTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, "rgba(70,70,70,0.65)");
  g.addColorStop(0.45, "rgba(40,40,40,0.35)");
  g.addColorStop(1, "rgba(20,20,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
