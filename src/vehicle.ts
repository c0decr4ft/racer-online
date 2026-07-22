import * as THREE from "three";
import type { Gear, InputState } from "./input";

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
 * Wrong gear hurts — lug below pullFrom, choke near redline.
 */
const GEAR_STATS: Record<Exclude<Gear, "N">, { max: number; accel: number; pullFrom: number }> = {
  R: { max: 12, accel: 0.65, pullFrom: 0 },
  1: { max: 12, accel: 1.9, pullFrom: 0 }, // ~43 km/h — launch only
  2: { max: 26, accel: 1.55, pullFrom: 8 }, // ~94 km/h
  3: { max: 44, accel: 1.4, pullFrom: 18 }, // ~158 km/h
  4: { max: 64, accel: 1.28, pullFrom: 32 }, // ~230 km/h
  5: { max: 88, accel: 1.15, pullFrom: 48 }, // ~317 km/h
};

const BRAKE = 62;
const DRAG = 0.16;
const ROLL = 1.1;
const MAX_STEER = 0.68;
const STEER_SPEED = 4.0;
const SHIFT_COOLDOWN = 0.1;
const ACCEL_BASE = 46;

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
    if (gear === "R" && this.state.speed > 6) return;
    if (gear !== "R" && gear !== "N" && this.state.speed < -6) return;
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

      if (input.throttle > 0) {
        const belowBand = absSpeed < stats.pullFrom;
        const overRev = absSpeed > stats.max * 0.9;
        // Lug in too-high gear; choke hard near redline in too-low gear
        const lug = belowBand
          ? THREE.MathUtils.clamp(absSpeed / Math.max(1, stats.pullFrom), 0.06, 0.38)
          : 1;
        const choke = overRev ? THREE.MathUtils.clamp(1 - (absSpeed / stats.max - 0.9) * 8, 0.08, 0.35) : 1;
        const headroom = Math.max(0.06, 1 - absSpeed / (stats.max * this.powerMul));
        // 1st gets extra launch punch from standstill
        const launch = gear === 1 && absSpeed < 4 ? 1.25 : 1;
        const force =
          ACCEL_BASE *
          stats.accel *
          this.powerMul *
          input.throttle *
          lug *
          choke *
          launch *
          (0.45 + headroom * 0.55);
        s.speed += (forward ? 1 : -1) * force * dt;
      }

      if (input.brake > 0) {
        if (absSpeed > 0.4) {
          s.speed -= Math.sign(s.speed) * BRAKE * input.brake * dt;
        } else {
          s.speed = 0;
        }
      }

      const cap = stats.max * this.powerMul;
      if (forward && s.speed > cap) s.speed = THREE.MathUtils.lerp(s.speed, cap, 0.18);
      if (!forward && s.speed < -stats.max) s.speed = THREE.MathUtils.lerp(s.speed, -stats.max, 0.18);
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
    if (kmh < 36) next = 1;
    else if (kmh < 80) next = 2;
    else if (kmh < 135) next = 3;
    else if (kmh < 200) next = 4;
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
  private baseOffset: number;
  private skill: number;
  private aggression: number;
  private linePhase: number;

  constructor(vehicle: Vehicle, offset: number, skill: number) {
    this.vehicle = vehicle;
    this.baseOffset = offset;
    this.skill = skill;
    this.aggression = 0.85 + skill * 0.25;
    this.linePhase = Math.random() * Math.PI * 2;
  }

  update(dt: number, path: THREE.CatmullRomCurve3, playerT: number, time: number) {
    this.vehicle.autoShift(dt);

    const pos = this.vehicle.state.position;
    let bestT = 0;
    let bestD = Infinity;
    const samples = 180;
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const d = path.getPointAt(t).distanceToSquared(pos);
      if (d < bestD) {
        bestD = d;
        bestT = t;
      }
    }

    const pathLen = path.getLength();
    const speed = Math.max(8, this.vehicle.state.speed);
    const lookDist = THREE.MathUtils.clamp(12 + speed * 0.55, 16, 42);
    const lookT = lookDist / pathLen;

    // Path tangent at car — race direction (increasing t)
    const pathTan = path.getTangentAt(bestT).normalize();
    const pathHeading = Math.atan2(pathTan.x, pathTan.z);

    // If facing more than ~90° off race direction, snap toward path heading
    // (prevents wrong-way / reverse progress after collisions or bad steers)
    let facingErr = pathHeading - this.vehicle.state.heading;
    while (facingErr > Math.PI) facingErr -= Math.PI * 2;
    while (facingErr < -Math.PI) facingErr += Math.PI * 2;
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

    const weave = Math.sin(time * 0.7 + this.linePhase) * 0.6;
    const cornerCut = -Math.sign(this.baseOffset || 1) * maxBend * 2.2 * this.skill;
    const lineOffset = THREE.MathUtils.clamp(this.baseOffset * 0.35 + weave + cornerCut, -5.5, 5.5);

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

    // Positive steer increases heading (same convention as player A = +1)
    const steerGain = 2.4 + this.skill * 0.7;
    const steer = THREE.MathUtils.clamp(headingError * steerGain, -1, 1);
    const cornering = Math.abs(headingError);

    const bendThreat = maxBend * (0.7 + this.vehicle.kmh / 220);
    let brake = 0;
    if (bendThreat > 0.08 && this.vehicle.kmh > 100) brake = Math.max(brake, 0.35 + bendThreat * 2.5);
    if (cornering > 0.55 && this.vehicle.kmh > 90) brake = Math.max(brake, 0.45);
    if (cornering > 0.85 && this.vehicle.kmh > 70) brake = Math.max(brake, 0.75);
    brake = Math.min(1, brake * (1.15 - this.skill * 0.15));

    let throttle = this.aggression;
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

    this.vehicle.update(dt, { throttle, brake, steer, reset: false, pause: false, gear: null });
  }
}
