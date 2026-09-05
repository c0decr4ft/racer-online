import * as THREE from "three";
import type { InputState } from "./input";
import { createSportActor } from "./sportActors";
import { createSportCourse, type SportCourse } from "./sportCourse";
import type { SportId } from "./sports";

export type SportHud = {
  speedKmh: number;
  score: number;
  combo: number;
  trick: string;
  air: boolean;
  progress: number;
  finished: boolean;
};

type Body = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  roll: number;
  spin: number;
  air: boolean;
  airSpin: number;
  grab: boolean;
  score: number;
  combo: number;
  trick: string;
  trickFlash: number;
  grind: number;
  finished: boolean;
  jumpLatch: boolean;
  mesh: THREE.Group;
  ai: boolean;
};

const GRAVITY = 22;
const RIDE = 0.42;

function tuning(sport: SportId) {
  if (sport === "skiing") {
    return { accel: 11, drag: 0.55, brake: 20, steer: 2.4, max: 16, jump: 8.5, spin: 7.2, lean: 0.55 };
  }
  if (sport === "motocross") {
    return { accel: 14, drag: 0.5, brake: 16, steer: 2.1, max: 18, jump: 9.5, spin: 6.4, lean: 0.42 };
  }
  if (sport === "biking") {
    return { accel: 12, drag: 0.52, brake: 14, steer: 2.3, max: 16, jump: 8.8, spin: 7.8, lean: 0.48 };
  }
  return { accel: 10, drag: 0.58, brake: 12, steer: 2.6, max: 13, jump: 7.6, spin: 9.2, lean: 0.38 };
}

function trickName(spin: number, grab: boolean, grind: boolean): { name: string; pts: number } {
  const rev = Math.abs(spin) / (Math.PI * 2);
  if (grind) return { name: "GRIND", pts: 80 };
  if (rev >= 1.4) return { name: grab ? "540 GRAB" : "540", pts: grab ? 900 : 700 };
  if (rev >= 0.85) return { name: grab ? "360 GRAB" : "360", pts: grab ? 520 : 400 };
  if (rev >= 0.4) return { name: grab ? "180 GRAB" : "180", pts: grab ? 260 : 180 };
  if (grab) return { name: "GRAB", pts: 90 };
  if (rev >= 0.12) return { name: "SHIFTY", pts: 70 };
  return { name: "AIR", pts: 40 };
}

export class SportSession {
  readonly sport: SportId;
  readonly course: SportCourse;
  readonly player: Body;
  readonly bots: Body[] = [];
  private readonly tune;
  private readonly _fwd = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    sport: SportId,
    primary: number,
    accent: number,
    opts: { bots?: number } = {},
  ) {
    this.sport = sport;
    this.tune = tuning(sport);
    this.course = createSportCourse(sport);
    scene.add(this.course.group);
    this.player = this.spawnBody(false, primary, accent, 0);
    const n = Math.max(0, opts.bots ?? 0);
    const palette = [0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff];
    for (let i = 0; i < n; i++) {
      const lane = ((i % 5) - 2) * 1.6;
      this.bots.push(this.spawnBody(true, palette[i % palette.length]!, 0xf7fafc, lane));
    }
  }

  private spawnBody(ai: boolean, primary: number, accent: number, lane: number): Body {
    const mesh = createSportActor(this.sport, primary, accent);
    this.course.group.add(mesh);
    const z = ai ? -2 - Math.random() * 4 : 2;
    const x = THREE.MathUtils.clamp(lane, -this.course.halfWidth + 1.4, this.course.halfWidth - 1.4);
    const y = this.course.heightAt(x, z) + RIDE;
    mesh.position.set(x, y, z);
    return {
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: ai ? 6 + Math.random() * 3 : 4,
      yaw: 0,
      roll: 0,
      spin: 0,
      air: false,
      airSpin: 0,
      grab: false,
      score: 0,
      combo: 1,
      trick: "",
      trickFlash: 0,
      grind: 0,
      finished: false,
      jumpLatch: false,
      mesh,
      ai,
    };
  }

  resetPlayer() {
    const b = this.player;
    b.x = 0;
    b.z = 2;
    b.y = this.course.heightAt(0, 2) + RIDE;
    b.vx = 0;
    b.vy = 0;
    b.vz = 4;
    b.yaw = 0;
    b.roll = 0;
    b.spin = 0;
    b.air = false;
    b.airSpin = 0;
    b.grab = false;
    b.score = 0;
    b.combo = 1;
    b.trick = "";
    b.finished = false;
    b.jumpLatch = false;
    this.syncMesh(b);
  }

  update(dt: number, input: InputState, frozen: boolean) {
    if (!frozen) {
      this.stepBody(this.player, dt, input, false);
      for (let i = 0; i < this.bots.length; i++) {
        this.stepBody(this.bots[i]!, dt, this.aiInput(this.bots[i]!, i), false);
      }
    } else {
      this.syncMesh(this.player);
      for (const b of this.bots) this.syncMesh(b);
    }
  }

  private aiInput(b: Body, i: number): InputState {
    const wander = Math.sin(b.z * 0.05 + i) * 0.55;
    const jump = this.course.kickAt(b.z) > 3.5 ? 1 : 0;
    return {
      throttle: 0.82,
      brake: 0,
      handbrake: jump && i % 2 === 0 ? 1 : 0,
      steer: wander,
      reset: false,
      pause: false,
      gear: null,
      shiftDelta: jump ? 1 : 0,
      fire: false,
      jump: 0,
    };
  }

  private stepBody(b: Body, dt: number, input: InputState, _frozen: boolean) {
    if (b.finished) {
      this.syncMesh(b);
      return;
    }
    const t = this.tune;
    const groundY = this.course.heightAt(b.x, b.z);
    const aheadY = this.course.heightAt(b.x, b.z + 1.2);
    const slope = Math.atan2(groundY - aheadY, 1.2);
    const onGround = b.y <= groundY + RIDE + 0.12 && b.vy <= 2.5;
    const jumpPulse = !b.ai && (input.fire || input.shiftDelta !== 0);
    const wantJump = jumpPulse || (!b.ai && this.spaceHeld(input));

    if (onGround) {
      if (b.air && b.airSpin > 0.15) {
        const landed = trickName(b.airSpin, b.grab, false);
        const clean = Math.abs(b.vy) < 14;
        const pts = Math.round(landed.pts * b.combo * (clean ? 1 : 0.45));
        b.score += pts;
        b.trick = `${landed.name} +${pts}`;
        b.trickFlash = 1.4;
        b.combo = clean ? Math.min(8, b.combo + 1) : 1;
      } else if (b.air) {
        b.combo = 1;
      }
      b.air = false;
      b.airSpin = 0;
      b.grab = false;
      b.y = groundY + RIDE;
      b.vy = 0;
      const speed = Math.hypot(b.vx, b.vz);
      const heading = Math.atan2(b.vx, b.vz);
      const steer = THREE.MathUtils.clamp(input.steer, -1, 1);
      const nextH = heading + steer * t.steer * dt * (this.sport === "skiing" ? 1.25 : 1);
      const accel = input.throttle * t.accel + Math.max(0, slope) * 14;
      const brake = input.brake * t.brake;
      let sp = speed + (accel - brake) * dt;
      sp *= Math.exp(-t.drag * dt);
      sp = THREE.MathUtils.clamp(sp, -3, t.max);
      // Gravity on the slope adds downhill even without throttle
      sp += Math.sin(Math.max(0.08, slope)) * (this.sport === "skiing" ? 9 : 6) * dt;
      sp = THREE.MathUtils.clamp(sp, -3, t.max);
      b.vx = Math.sin(nextH) * sp;
      b.vz = Math.max(2.2, Math.cos(nextH) * sp);
      b.yaw = nextH;
      b.roll = THREE.MathUtils.damp(b.roll, steer * t.lean, 8, dt);
      const kick = this.course.kickAt(b.z);
      const grind = this.course.grindAt(b.x, b.z);
      if (grind && speed > 4) {
        b.grind += dt;
        if (b.grind > 0.15) {
          const pts = Math.round(90 * dt * 8);
          b.score += pts;
          b.trick = `GRIND +${pts}`;
          b.trickFlash = 0.4;
        }
      } else {
        b.grind = 0;
      }
      if ((wantJump || kick > 4.5) && !b.jumpLatch) {
        b.air = true;
        b.vy = t.jump + kick * 0.65;
        b.y = groundY + RIDE + 0.2;
        b.jumpLatch = true;
      }
      if (!wantJump && kick <= 4.5) b.jumpLatch = false;
    } else {
      b.air = true;
      b.vy -= GRAVITY * dt;
      const steer = THREE.MathUtils.clamp(input.steer, -1, 1);
      b.airSpin += steer * t.spin * dt;
      b.yaw += steer * t.spin * dt;
      b.grab = input.handbrake > 0.4;
      b.roll = THREE.MathUtils.damp(b.roll, (b.grab ? 0.7 : steer * 0.9) + b.airSpin * 0.15, 6, dt);
      if (this.course.grindAt(b.x, b.z) && b.y < groundY + RIDE + 0.55) {
        b.y = groundY + RIDE + 0.18;
        b.vy = 0;
        b.air = false;
      }
    }

    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.y += b.vy * dt;
    const wall = this.course.halfWidth - 1.15;
    if (b.x > wall) {
      b.x = wall;
      b.vx *= -0.2;
    } else if (b.x < -wall) {
      b.x = -wall;
      b.vx *= -0.2;
    }
    if (b.z < 0) {
      b.z = 0;
      b.vz = Math.max(0, b.vz);
    }
    if (b.z >= this.course.length - 2) {
      b.z = this.course.length - 2;
      b.finished = true;
      b.vx = 0;
      b.vz = 0;
      const timeBonus = 0; // applied by Game from clock
      b.score += timeBonus;
      if (!b.trick) b.trick = "FINISH";
    }
    if (b.trickFlash > 0) b.trickFlash -= dt;
    this.syncMesh(b);
  }

  private spaceHeld(input: InputState): boolean {
    return input.jump > 0.5;
  }

  private syncMesh(b: Body) {
    b.mesh.position.set(b.x, b.y, b.z);
    b.mesh.rotation.set(b.air ? -0.15 : 0.05, b.yaw, -b.roll);
  }

  hud(): SportHud {
    const b = this.player;
    const speed = Math.hypot(b.vx, b.vz);
    return {
      speedKmh: Math.round(speed * 3.6),
      score: Math.round(b.score),
      combo: b.combo,
      trick: b.trickFlash > 0 ? b.trick : b.air ? (b.grab ? "GRAB" : "AIR") : "",
      air: b.air,
      progress: THREE.MathUtils.clamp(b.z / this.course.length, 0, 1),
      finished: b.finished,
    };
  }

  applyCamera(camera: THREE.Camera, camPos: THREE.Vector3, camLook: THREE.Vector3, dt: number) {
    const b = this.player;
    const back = 11 + Math.min(Math.hypot(b.vx, b.vz) * 0.08, 5);
    const height = 3.6 + (b.air ? 1.4 : 0);
    this._fwd.set(Math.sin(b.yaw), 0, Math.cos(b.yaw));
    const ideal = new THREE.Vector3(b.x - this._fwd.x * back, b.y + height, b.z - this._fwd.z * back);
    const k = dt <= 0 ? 1 : 1 - Math.exp(-5.5 * dt);
    camPos.lerp(ideal, k);
    camera.position.copy(camPos);
    const look = new THREE.Vector3(b.x + this._fwd.x * 10, b.y + 1.1, b.z + this._fwd.z * 10);
    camLook.lerp(look, dt <= 0 ? 1 : 1 - Math.exp(-7 * dt));
    camera.lookAt(camLook);
  }

  awardFinishBonus(timeMs: number) {
    const bonus = Math.max(0, Math.round((150_000 - timeMs) / 100));
    this.player.score += bonus;
    if (bonus > 0) {
      this.player.trick = `TIME +${bonus}`;
      this.player.trickFlash = 1.2;
    }
  }

  pose() {
    const b = this.player;
    return { x: b.x, z: b.z, h: b.yaw, s: Math.hypot(b.vx, b.vz), y: b.y };
  }

  liftRemote(mesh: THREE.Object3D, x: number, z: number) {
    const y = this.course.heightAt(x, z) + RIDE;
    mesh.position.y = y;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.course.group);
    this.course.dispose();
  }
}
