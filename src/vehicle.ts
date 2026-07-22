import * as THREE from "three";
import type { Gear, InputState } from "./input";
import { projectOnTrack, projectOnTrackNear } from "./track";

export type VehicleState = {
  position: THREE.Vector3;
  heading: number;
  speed: number;
  steerAngle: number;
  gear: Gear;
  rpm: number;
};

/**
 * Real-car style progressive gears:
 * 1st = launch only (strong pull, low ceiling). Each upshift unlocks top speed.
 * Wrong gear hurts — lug below pullFrom, rev limiter pins speed at each gear's max.
 *
 * NOTE: DRAG must stay small relative to engine force. A large quadratic drag
 * previously capped EVERY gear at ~60 km/h, making shifts feel like they did
 * nothing. The per-gear rev limiter (not drag) is the intended speed cap.
 */
const GEAR_STATS: Record<Exclude<Gear, "N">, { max: number; accel: number; pullFrom: number }> = {
  R: { max: 11, accel: 1.5, pullFrom: 0 }, // ~40 km/h backing up
  1: { max: 15.5, accel: 2.2, pullFrom: 0 }, // ~56 km/h — launch only
  2: { max: 31, accel: 1.6, pullFrom: 7 }, // ~112 km/h
  3: { max: 48, accel: 1.2, pullFrom: 16 }, // ~173 km/h
  4: { max: 66, accel: 0.95, pullFrom: 28 }, // ~238 km/h
  5: { max: 86, accel: 0.75, pullFrom: 42 }, // ~310 km/h
};

const BRAKE = 62;
const DRAG = 0.002;
const ROLL = 1.1;
const ENGINE_BRAKE = 0.4;
const MAX_STEER = 0.68;
const STEER_SPEED = 4.0;
const SHIFT_COOLDOWN = 0.1;
const ACCEL_BASE = 46;

const GEAR_SEQUENCE: Gear[] = ["R", "N", 1, 2, 3, 4, 5];

export class Vehicle {
  state: VehicleState;
  mesh: THREE.Group;
  private manual: boolean;
  private shiftTimer = 0;
  /** Extra drive multiplier (AI boost / catch-up). */
  powerMul = 1;

  constructor(mesh: THREE.Group, position: THREE.Vector3, heading: number, manual = false) {
    this.mesh = mesh;
    this.manual = manual;
    this.state = {
      position: position.clone(),
      heading,
      speed: 0,
      steerAngle: 0,
      gear: 1,
      rpm: 1200,
    };
    this.syncMesh();
  }

  reset(position: THREE.Vector3, heading: number) {
    this.state.position.copy(position);
    this.state.heading = heading;
    this.state.speed = 0;
    this.state.steerAngle = 0;
    this.state.gear = 1;
    this.state.rpm = 1200;
    this.shiftTimer = 0;
    this.powerMul = 1;
    this.syncMesh();
  }

  setGear(gear: Gear) {
    if (this.shiftTimer > 0 && gear === this.state.gear) return;
    // Reverse only near standstill; forward gears only when not rolling backward
    if (gear === "R" && this.state.speed > 2) return;
    if (gear !== "R" && gear !== "N" && this.state.speed < -2) return;
    if (gear !== this.state.gear) {
      this.state.gear = gear;
      this.shiftTimer = SHIFT_COOLDOWN;
    }
  }

  update(dt: number, input: InputState) {
    const s = this.state;
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);

    if (this.manual && input.gear != null) {
      this.setGear(input.gear);
    }

    if (this.manual && input.shiftDelta !== 0) {
      const idx = GEAR_SEQUENCE.indexOf(s.gear) + input.shiftDelta;
      if (idx >= 0 && idx < GEAR_SEQUENCE.length) {
        this.setGear(GEAR_SEQUENCE[idx]);
      }
    }

    if (this.manual && s.gear === "N" && input.throttle > 0 && input.brake === 0) {
      this.setGear(1);
    }

    const targetSteer = input.steer * MAX_STEER;
    s.steerAngle += (targetSteer - s.steerAngle) * Math.min(1, STEER_SPEED * dt * 3);

    const gear = s.gear;
    if (gear === "N") {
      if (input.brake > 0) {
        s.speed -= Math.sign(s.speed || 1) * BRAKE * input.brake * dt;
      }
    } else {
      const stats = GEAR_STATS[gear];
      const forward = gear !== "R";
      const absSpeed = Math.abs(s.speed);
      const cap = stats.max * this.powerMul;

      if (input.throttle > 0 && absSpeed < cap) {
        // Lug when the gear is too high for current speed (weak, chuggy pull)
        const belowBand = absSpeed < stats.pullFrom;
        const lug = belowBand
          ? THREE.MathUtils.clamp(absSpeed / Math.max(1, stats.pullFrom), 0.08, 0.35)
          : 1;
        // Power softens near redline; the hard cut below is the rev limiter
        const nearLimit = absSpeed / cap;
        const taper = nearLimit > 0.85 ? Math.max(0.55, 1 - (nearLimit - 0.85) * 3) : 1;
        // 1st gets extra launch punch from standstill
        const launch = gear === 1 && absSpeed < 5 ? 1.3 : 1;
        const force = ACCEL_BASE * stats.accel * this.powerMul * input.throttle * lug * taper * launch;
        s.speed += (forward ? 1 : -1) * force * dt;
        // Rev limiter cut: engine never powers past the gear ceiling
        if (forward) s.speed = Math.min(s.speed, cap);
        else s.speed = Math.max(s.speed, -cap);
      } else if (input.throttle === 0 && absSpeed > 0.5) {
        // Engine braking when coasting in gear
        s.speed -= Math.sign(s.speed) * ENGINE_BRAKE * absSpeed * dt;
      }

      if (input.brake > 0) {
        if (absSpeed > 0.4) {
          s.speed -= Math.sign(s.speed) * BRAKE * input.brake * dt;
        } else {
          s.speed = 0;
        }
      }

      // Rev limiter: hard per-gear ceiling. Holding throttle in a low gear pins
      // speed here (engine choke); after a downshift, speed bleeds down to it.
      if (forward && s.speed > cap) {
        s.speed = Math.max(cap, s.speed - (30 + (s.speed - cap) * 2.5) * dt);
      }
      if (!forward && s.speed < -stats.max) {
        s.speed = Math.min(-stats.max, s.speed + (30 + (-stats.max - s.speed) * 2.5) * dt);
      }
    }

    const drag = DRAG * s.speed * Math.abs(s.speed);
    const roll = ROLL * Math.sign(s.speed || 0);
    s.speed -= (drag + roll) * dt;
    if (Math.abs(s.speed) < 0.1 && input.throttle === 0) s.speed = 0;

    if (gear === "N") {
      s.rpm = THREE.MathUtils.lerp(s.rpm, 800 + input.throttle * 1400, 0.12);
    } else {
      const stats = GEAR_STATS[gear];
      const ratio = Math.min(1, Math.abs(s.speed) / stats.max);
      s.rpm = 1000 + ratio * 5500;
    }

    const speedFactor = THREE.MathUtils.clamp(0.4 + Math.abs(s.speed) / 36, 0.4, 1.2);
    const turnRate = s.steerAngle * speedFactor * (s.speed >= 0 ? 1 : -1) * 1.9;
    s.heading += turnRate * dt;

    s.position.x += Math.sin(s.heading) * s.speed * dt;
    s.position.z += Math.cos(s.heading) * s.speed * dt;
    s.position.y = 0;

    this.syncMesh();
    this.animateWheels(dt);
  }

  autoShift(dt: number) {
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    if (this.shiftTimer > 0) return;
    const kmh = this.kmh;
    // Shift ~85% into each gear's band (matches GEAR_STATS max * 3.6)
    let next: Gear = 1;
    if (kmh < 47) next = 1;
    else if (kmh < 95) next = 2;
    else if (kmh < 147) next = 3;
    else if (kmh < 202) next = 4;
    else next = 5;
    if (next !== this.state.gear) {
      this.state.gear = next;
      this.shiftTimer = SHIFT_COOLDOWN * 0.4;
    }
  }

  /** Re-sync mesh after external position/speed changes (collisions). */
  syncCollision() {
    this.syncMesh();
  }

  private syncMesh() {
    const s = this.state;
    this.mesh.position.copy(s.position);
    this.mesh.rotation.order = "YXZ";
    this.mesh.rotation.y = s.heading;
    this.mesh.rotation.z = THREE.MathUtils.clamp(-s.steerAngle * (Math.abs(s.speed) / 50), -0.14, 0.14);
    this.mesh.rotation.x = THREE.MathUtils.clamp(-s.speed * 0.00055, -0.045, 0.03);
  }

  private animateWheels(dt: number) {
    const steers = this.mesh.userData.steers as THREE.Group[] | undefined;
    const spinners = this.mesh.userData.spinners as THREE.Group[] | undefined;
    const radius = (this.mesh.userData.wheelRadius as number) ?? 0.38;
    if (!steers || !spinners) return;
    const spin = (this.state.speed * dt) / radius;
    steers.forEach((steer, i) => {
      steer.rotation.y = i < 2 ? this.state.steerAngle * 0.85 : 0;
    });
    spinners.forEach((spinner) => spinner.rotateX(-spin));
  }

  get kmh() {
    return Math.abs(this.state.speed) * 3.6;
  }

  get gearLabel(): string {
    return String(this.state.gear);
  }
}

/** Competitive AI: curvature braking, racing line, catch-up. */
export class RivalAI {
  vehicle: Vehicle;
  /** Completed laps — forward SF crossings minus backward ones. */
  laps = 0;
  private baseOffset: number;
  private skill: number;
  private aggression: number;
  private linePhase: number;
  /** Sticky track progress — avoids snapping to a nearby wrong section. */
  private lastT: number | null = null;
  private stuckTimer = 0;
  private recoverTimer = 0;

  constructor(vehicle: Vehicle, offset: number, skill: number) {
    this.vehicle = vehicle;
    this.baseOffset = offset;
    this.skill = skill;
    this.aggression = 0.85 + skill * 0.25;
    this.linePhase = Math.random() * Math.PI * 2;
  }

  /** Total race progress (laps + track fraction) for standings. */
  get progress() {
    return this.laps + (this.lastT ?? 0);
  }

  /** Call after teleporting/resetting the vehicle (fresh global projection). */
  resetProgress() {
    this.lastT = null;
    this.laps = 0;
    this.stuckTimer = 0;
    this.recoverTimer = 0;
  }

  update(
    dt: number,
    path: THREE.CatmullRomCurve3,
    playerT: number,
    time: number,
    neighbors: Vehicle[] = [],
  ) {
    const pos = this.vehicle.state.position;
    const prevT = this.lastT;
    const bestT =
      prevT == null
        ? projectOnTrack(path, pos).t
        : projectOnTrackNear(path, pos, prevT).t;
    this.lastT = bestT;

    // One-shot lap counting on start/finish wrap (mirrors player logic);
    // backward wraps subtract so a shove across the line can't double-count
    if (prevT != null) {
      if (prevT > 0.85 && bestT < 0.15) this.laps += 1;
      else if (prevT < 0.15 && bestT > 0.85) this.laps -= 1;
    }

    const pathLen = path.getLength();
    const speed = Math.max(8, this.vehicle.state.speed);
    const lookDist = THREE.MathUtils.clamp(12 + speed * 0.55, 16, 42);
    const lookT = lookDist / pathLen;

    // Path tangent at car — race direction (increasing t)
    const pathTan = path.getTangentAt(bestT).normalize();
    const pathHeading = Math.atan2(pathTan.x, pathTan.z);

    let facingErr = pathHeading - this.vehicle.state.heading;
    while (facingErr > Math.PI) facingErr -= Math.PI * 2;
    while (facingErr < -Math.PI) facingErr += Math.PI * 2;

    // Wedged (near-zero speed for a while): back out gently, rotating the
    // nose toward the race direction, then resume normal driving
    if (Math.abs(this.vehicle.state.speed) < 2) this.stuckTimer += dt;
    else this.stuckTimer = 0;
    if (this.recoverTimer <= 0 && this.stuckTimer > 2) {
      this.recoverTimer = 1.4;
      this.stuckTimer = 0;
    }
    if (this.recoverTimer > 0) {
      this.recoverTimer -= dt;
      this.vehicle.setGear("R");
      // Reverse flips turn response, so negative gain still aims at the path
      const steer = THREE.MathUtils.clamp(-facingErr * 1.5, -1, 1);
      this.vehicle.update(dt, { throttle: 0.7, brake: 0, steer, reset: false, pause: false, gear: null, shiftDelta: 0 });
      return;
    }

    this.vehicle.autoShift(dt);

    // If facing more than ~90° off race direction, snap toward path heading
    // (prevents wrong-way / reverse progress after collisions or bad steers)
    if (Math.abs(facingErr) > Math.PI * 0.55) {
      this.vehicle.state.heading += Math.sign(facingErr) * Math.min(Math.abs(facingErr), 2.8 * dt);
      if (this.vehicle.state.speed < 0) this.vehicle.state.speed = Math.abs(this.vehicle.state.speed) * 0.3;
    }

    let maxBend = 0;
    for (let k = 1; k <= 5; k++) {
      const tA = (bestT + lookT * (k / 5) + 1) % 1;
      const tB = (bestT + lookT * ((k + 0.5) / 5) + 1) % 1;
      const tanA = path.getTangentAt(tA).normalize();
      const tanB = path.getTangentAt(tB).normalize();
      maxBend = Math.max(maxBend, 1 - Math.max(-1, Math.min(1, tanA.dot(tanB))));
    }

    // Persistent per-rival line (no corner-cut toward the apex — that made
    // every AI converge and wedge on the inside of each curve). Kept well
    // inside the 7-unit half-width so the line never grazes the wall.
    const weave = Math.sin(time * 0.7 + this.linePhase) * 0.35;
    const lineOffset = THREE.MathUtils.clamp(this.baseOffset * 2.4 + weave, -3, 3);

    // Steer primarily by path tangent (race direction). Pure point-pursuit was
    // unstable from lateral offset and flipped cars the wrong way on the circuit.
    const aheadT = (bestT + lookT + 1) % 1;
    const lookTan = path.getTangentAt(aheadT).normalize();
    const lookN = new THREE.Vector3(-lookTan.z, 0, lookTan.x);
    const linePoint = path.getPointAt(aheadT).addScaledVector(lookN, lineOffset);
    const tanHeading = Math.atan2(lookTan.x, lookTan.z);
    const pointHeading = Math.atan2(linePoint.x - pos.x, linePoint.z - pos.z);
    const desiredHeading = Math.atan2(
      Math.sin(tanHeading) * 0.72 + Math.sin(pointHeading) * 0.28,
      Math.cos(tanHeading) * 0.72 + Math.cos(pointHeading) * 0.28,
    );

    let headingError = desiredHeading - this.vehicle.state.heading;
    while (headingError > Math.PI) headingError -= Math.PI * 2;
    while (headingError < -Math.PI) headingError += Math.PI * 2;

    // Neighbor avoidance: if a car sits close ahead, steer around it and lift
    // slightly so rivals fan out instead of stacking nose-to-tail in corners
    let avoidSteer = 0;
    let avoidLift = 1;
    const fwdX = Math.sin(this.vehicle.state.heading);
    const fwdZ = Math.cos(this.vehicle.state.heading);
    for (const other of neighbors) {
      if (other === this.vehicle) continue;
      const dx = other.state.position.x - pos.x;
      const dz = other.state.position.z - pos.z;
      const ahead = dx * fwdX + dz * fwdZ;
      if (ahead < 0.5 || ahead > 6) continue;
      const lateral = dx * fwdZ - dz * fwdX; // + means other is to the left
      if (Math.abs(lateral) > 3.2) continue;
      const urgency = 1 - ahead / 6;
      // Steer toward whichever side the other car is NOT on
      avoidSteer += (lateral >= 0 ? -1 : 1) * urgency * 0.8;
      avoidLift = Math.min(avoidLift, 1 - urgency * 0.45);
    }

    // Positive steer increases heading (same convention as player A = +1)
    const steerGain = 2.4 + this.skill * 0.7;
    const steer = THREE.MathUtils.clamp(headingError * steerGain + avoidSteer, -1, 1);
    const cornering = Math.abs(headingError);

    const bendThreat = maxBend * (0.7 + this.vehicle.kmh / 220);
    let brake = 0;
    if (bendThreat > 0.08 && this.vehicle.kmh > 100) brake = Math.max(brake, 0.35 + bendThreat * 2.5);
    if (cornering > 0.55 && this.vehicle.kmh > 90) brake = Math.max(brake, 0.45);
    if (cornering > 0.85 && this.vehicle.kmh > 70) brake = Math.max(brake, 0.75);
    brake = Math.min(1, brake * (1.15 - this.skill * 0.15));

    let throttle = this.aggression * avoidLift;
    if (brake > 0.4) throttle *= 0.15;
    else if (cornering > 0.4) throttle *= 0.55;
    else if (bendThreat > 0.05) throttle *= 0.75;

    let gap = bestT - playerT;
    if (gap > 0.5) gap -= 1;
    if (gap < -0.5) gap += 1;
    if (gap < -0.04) {
      this.vehicle.powerMul = 1.08 + Math.min(0.22, -gap * 1.4);
      throttle = Math.min(1, throttle + 0.15);
    } else if (gap > 0.12) {
      this.vehicle.powerMul = 0.9;
      throttle *= 0.85;
    } else {
      this.vehicle.powerMul = 0.98 + this.skill * 0.08;
    }

    this.vehicle.update(dt, { throttle, brake, steer, reset: false, pause: false, gear: null, shiftDelta: 0 });
  }
}
