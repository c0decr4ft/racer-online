import * as THREE from "three";
import type { Gear, InputState } from "./input";
import {
  LapGateProgress,
  OffsetRacingLine,
  pointOnOffsetLine,
  projectOnTrack,
  projectOnTrackNear,
} from "./track";

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

/**
 * Competitive AI that steers toward a dedicated invisible racing line
 * re-traced once from the centerline (look-ahead + CTE via yaw —
 * no continuous sideways position snap).
 * Set DEBUG_RACING_LINES to draw each rival's groove.
 */
const DEBUG_RACING_LINES = false;

/**
 * Max |lateral| from centerline for any AI groove.
 * Road half-width ≈ 7m, wall clamp ≈ 6.45, car half-width ≈ 1.0 →
 * keep grooves well inside so line-follow never aims at barriers.
 */
export const MAX_LANE_OFFSET = 2.8;

/** @deprecated Prefer OffsetRacingLine — kept for spawn helpers. */
export function pointOnRacingLine(
  path: THREE.CatmullRomCurve3,
  t: number,
  offset: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  return pointOnOffsetLine(path, t, offset, out);
}

export class RivalAI {
  vehicle: Vehicle;
  /** Completed laps — only after mid-lap progress gates then SF wrap. */
  laps = 0;
  /** Fixed lateral racing line (m from centerline) — never changes mid-race. */
  private laneOffset: number;
  private skill: number;
  private aggression: number;
  /** Per-car look-ahead scale — slight pace variation, still fixed every race. */
  private lookAheadBias: number;
  /** Seconds since last reset — soft launch so they don't spike into traffic. */
  private raceAge = 0;
  /** Sticky track progress — avoids snapping to a nearby wrong section. */
  private lastT: number | null = null;
  private gates = new LapGateProgress();
  private stuckTimer = 0;
  /** Densely re-traced groove for this car (built once per path). */
  private line: OffsetRacingLine | null = null;
  private linePath: THREE.CatmullRomCurve3 | null = null;
  private debugLine: THREE.Line | null = null;
  private readonly _aim = new THREE.Vector3();
  private readonly _near = new THREE.Vector3();
  private readonly _far = new THREE.Vector3();
  private readonly _tan = new THREE.Vector3();
  private readonly _n = new THREE.Vector3();

  constructor(vehicle: Vehicle, laneOffset: number, skill: number, gridIndex = 0) {
    this.vehicle = vehicle;
    this.laneOffset = THREE.MathUtils.clamp(laneOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET);
    this.skill = skill;
    // Tier aggression: back≈1.15–1.19, mid≈1.28, front≈1.51–1.56
    this.aggression = 0.82 + skill * 0.38;
    // Deterministic — same groove / look-ahead every race for this slot
    this.lookAheadBias = 0.84 + (gridIndex % 5) * 0.03 + skill * 0.07;
  }

  /** Total race progress (laps + track fraction) for standings. */
  get progress() {
    return this.laps + (this.lastT ?? 0);
  }

  /** Fixed groove offset used for spawn / recovery (read-only). */
  get racingOffset() {
    return this.laneOffset;
  }

  /** Call after teleporting/resetting the vehicle (fresh global projection). */
  resetProgress() {
    this.lastT = null;
    this.laps = 0;
    this.gates.reset();
    this.stuckTimer = 0;
    this.raceAge = 0;
  }

  /** Build / reuse this car's invisible offset line from the track centerline. */
  private ensureLine(path: THREE.CatmullRomCurve3): OffsetRacingLine {
    if (!this.line || this.linePath !== path) {
      this.line = OffsetRacingLine.trace(path, this.laneOffset, 720);
      this.linePath = path;
    }
    return this.line;
  }

  update(
    dt: number,
    path: THREE.CatmullRomCurve3,
    playerT: number,
    _time: number,
    neighbors: Vehicle[] = [],
  ) {
    this.raceAge += dt;
    // Soft launch: ~5s ramp, cubed so early frames stay gentle into T1
    const launch = Math.min(1, this.raceAge / 5.0);
    const launchEase = launch * launch * launch;

    const line = this.ensureLine(path);
    const pos = this.vehicle.state.position;
    const prevT = this.lastT;
    const bestT =
      prevT == null
        ? projectOnTrack(path, pos).t
        : projectOnTrackNear(path, pos, prevT).t;
    this.lastT = bestT;

    if (prevT != null) {
      this.gates.update(prevT, bestT);
      if (prevT > 0.85 && bestT < 0.15 && this.gates.readyForFinish) {
        this.laps += 1;
        this.gates.reset();
      }
    }

    const absSpeed = Math.abs(this.vehicle.state.speed);
    const speed = Math.max(6, absSpeed);

    // Lateral error vs THIS car's re-traced line (positive = line is to the left)
    line.tangentAtT(bestT, this._tan);
    this._n.set(-this._tan.z, 0, this._tan.x);
    line.pointAtT(bestT, this._aim);
    const lateralFromLine = pos.clone().sub(this._aim).dot(this._n);
    // CTE: positive → need left steer (toward line). Car left of line → negative.
    const laneErr = -lateralFromLine;

    const pathHeading = Math.atan2(this._tan.x, this._tan.z);
    let facingErr = pathHeading - this.vehicle.state.heading;
    while (facingErr > Math.PI) facingErr -= Math.PI * 2;
    while (facingErr < -Math.PI) facingErr += Math.PI * 2;

    // Stuck / wall: rare snap onto the re-traced line — never continuous sideways yank
    const lateralFromCenter = (() => {
      const cTan = path.getTangentAt(bestT).normalize();
      const cN = new THREE.Vector3(-cTan.z, 0, cTan.x);
      return pos.clone().sub(path.getPointAt(bestT)).dot(cN);
    })();
    const nearWall = Math.abs(lateralFromCenter) > 5.0;
    const offLine = Math.abs(laneErr) > 2.4;
    if (absSpeed < 2.5 || (nearWall && absSpeed < 8) || (offLine && nearWall && absSpeed < 14)) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - dt * 0.5);
    }

    if (this.stuckTimer > 0.85) {
      this.snapToLine(path, bestT, line);
      this.stuckTimer = 0;
      return;
    }

    this.vehicle.autoShift(dt);

    // Wrong-way after a hit: rotate toward race direction
    if (Math.abs(facingErr) > Math.PI * 0.55) {
      this.vehicle.state.heading += Math.sign(facingErr) * Math.min(Math.abs(facingErr), 3.2 * dt);
      if (this.vehicle.state.speed < 0) this.vehicle.state.speed = Math.abs(this.vehicle.state.speed) * 0.2;
    }

    // Look-ahead along the OFFSET line: longer at speed, shorter when correcting CTE
    let lookDist = THREE.MathUtils.clamp((16 + speed * 0.72) * this.lookAheadBias, 18, 52);
    if (Math.abs(laneErr) > 1.2) lookDist *= THREE.MathUtils.clamp(1.15 - Math.abs(laneErr) * 0.18, 0.55, 1);
    if (launchEase < 0.55) lookDist = Math.min(lookDist, 28);

    // Curvature on the re-traced line (rad/m) — detects smooth T1, not just kinks
    const { maxKappa, nearKappa, turnAngle } = line.curvatureAhead(bestT, Math.max(lookDist, 42));
    const kmh = this.vehicle.kmh;
    // Straight-line cruise by skill: back≈166, mid≈170, front≈178
    // (gear 3 base ceiling is ~173 km/h; powerMul raises AI rev limit past that)
    const cruiseKmh = 155 + this.skill * 12;
    // Target corner speed from kappa: v ≈ sqrt(a / κ), a≈11.5 m/s² —
    // still brakes for bends, but carries more speed than the old ~9 m/s² target
    const peakKappa = Math.max(maxKappa, nearKappa, 1e-4);
    const cornerKmh = Math.sqrt(11.5 / peakKappa) * 3.6;
    // On open track hold cruise; in bends the corner target wins
    const targetKmh = Math.min(cruiseKmh, cornerKmh);

    // --- Primary steer: pure pursuit on THIS car's re-traced groove ---
    const nearDist = THREE.MathUtils.clamp(lookDist * 0.32, 8, 22);
    const farDist = lookDist;
    line.sampleAhead(bestT, nearDist, this._near, this._tan);
    line.sampleAhead(bestT, farDist, this._far, this._tan);

    // Blend near (CTE correction) + far (path anticipation)
    const nearW = Math.abs(laneErr) > 1.5 ? 0.55 : 0.38;
    const aimX = this._near.x * nearW + this._far.x * (1 - nearW);
    const aimZ = this._near.z * nearW + this._far.z * (1 - nearW);
    const pointHeading = Math.atan2(aimX - pos.x, aimZ - pos.z);

    // Groove tangent at far look-ahead — keeps nose along the line through sweeps
    const tanHeading = Math.atan2(this._tan.x, this._tan.z);
    const lineW = 0.88;
    const desiredHeading = Math.atan2(
      Math.sin(tanHeading) * (1 - lineW) + Math.sin(pointHeading) * lineW,
      Math.cos(tanHeading) * (1 - lineW) + Math.cos(pointHeading) * lineW,
    );

    let headingError = desiredHeading - this.vehicle.state.heading;
    while (headingError > Math.PI) headingError -= Math.PI * 2;
    while (headingError < -Math.PI) headingError += Math.PI * 2;

    // Stanley CTE: positive laneErr (line left of car) → positive steer (left). Verified.
    const cteK = 1.55 + this.skill * 0.4;
    const laneSteer = THREE.MathUtils.clamp(
      Math.atan2(laneErr * cteK, Math.max(5, absSpeed)) * 1.85,
      -1,
      1,
    );

    if (DEBUG_RACING_LINES) this.debugDrawLine(line);

    // --- Avoidance: brake / lift only. Cap steer so it can't override the line. ---
    let avoidLift = 1;
    let avoidBrake = 0;
    let avoidSteer = 0;
    const fwdX = Math.sin(this.vehicle.state.heading);
    const fwdZ = Math.cos(this.vehicle.state.heading);
    for (const other of neighbors) {
      if (other === this.vehicle) continue;
      const dx = other.state.position.x - pos.x;
      const dz = other.state.position.z - pos.z;
      const ahead = dx * fwdX + dz * fwdZ;
      if (ahead < -1.5 || ahead > 14) continue;
      const lateral = dx * fwdZ - dz * fwdX;
      if (Math.abs(lateral) > 4.8) continue;
      const urgency = ahead > 0 ? 1 - ahead / 14 : 0.35;
      const closeLat = 1 - Math.min(1, Math.abs(lateral) / 4.8);

      if (ahead > 0) {
        avoidLift = Math.min(avoidLift, 1 - urgency * (0.6 + closeLat * 0.35));
        if (ahead < 8 && Math.abs(lateral) < 3.4) {
          avoidBrake = Math.max(avoidBrake, urgency * (0.4 + closeLat * 0.55));
        }
      }

      if (Math.abs(lateral) < 3.2 && ahead > -0.5 && ahead < 10) {
        const side = lateral >= 0 ? -1 : 1;
        const proposed = this.laneOffset + side * 0.8;
        if (Math.abs(proposed) <= MAX_LANE_OFFSET) {
          avoidSteer += side * urgency * closeLat * 0.05 * launchEase;
        }
      }
    }
    avoidSteer = THREE.MathUtils.clamp(avoidSteer, -0.07, 0.07);

    const steerGain = 2.55 + this.skill * 0.35;
    const steer = THREE.MathUtils.clamp(
      headingError * steerGain + laneSteer + avoidSteer,
      -1,
      1,
    );
    const cornering = Math.abs(headingError);

    // Brake for curvature EARLY — old metric never fired on smooth T1.
    // Absolute kappa thresholds only fire when actually overspeed for the
    // upcoming bend / cruise — otherwise mild kinks capped AI well below ~170.
    let brake = avoidBrake;
    const overspeed = kmh - targetKmh;
    if (overspeed > 8 && turnAngle > 0.25) {
      brake = Math.max(brake, THREE.MathUtils.clamp(0.25 + overspeed / 55, 0.25, 0.95));
    }
    if (nearKappa > 0.012 && overspeed > 5) brake = Math.max(brake, 0.3 + nearKappa * 18);
    if (maxKappa > 0.018 && overspeed > 8) brake = Math.max(brake, 0.35 + maxKappa * 16);
    if (turnAngle > 0.55 && overspeed > 5) brake = Math.max(brake, 0.4 + Math.min(0.45, turnAngle * 0.35));
    if (cornering > 0.4 && kmh > 70 && overspeed > 0) brake = Math.max(brake, 0.38);
    if (cornering > 0.7 && kmh > 55) brake = Math.max(brake, 0.7);
    if (Math.abs(laneErr) > 1.8 && kmh > 65) {
      brake = Math.max(brake, 0.2 + Math.min(0.4, (Math.abs(laneErr) - 1.8) * 0.2));
    }
    // Soft launch into first bend: insist on braking if still winding up and bend ahead
    if (launchEase < 0.7 && turnAngle > 0.35 && kmh > 55) {
      brake = Math.max(brake, 0.45);
    }
    // Higher skill = carry more speed into bends
    brake = Math.min(1, brake * (1.18 - this.skill * 0.18));

    let throttle = this.aggression * avoidLift * (0.28 + 0.72 * launchEase);
    if (kmh < 35) throttle *= 0.5 + 0.5 * (kmh / 35);
    // Hold cruise / don't full-throttle when overspeed for bend or top-end
    if (overspeed > 2) throttle *= THREE.MathUtils.clamp(1 - overspeed / 45, 0.05, 1);
    // On open track, taper onto cruise so they settle near ~170 instead of runaway
    if (cornerKmh > cruiseKmh && kmh > cruiseKmh - 12) {
      throttle *= THREE.MathUtils.clamp((cruiseKmh + 6 - kmh) / 18, 0.12, 1);
    }
    if (brake > 0.35) throttle *= 0.08;
    else if (cornering > 0.35) throttle *= 0.5;
    else if (maxKappa > 0.015 && overspeed > 0) throttle *= 0.68;
    if (Math.abs(laneErr) > 1.5) throttle *= 0.78;

    let gap = bestT - playerT;
    if (gap > 0.5) gap -= 1;
    if (gap < -0.5) gap += 1;
    // Accel pull by tier: back≈1.22–1.25, mid≈1.34, front≈1.55–1.59 — enough to hit cruise
    const paceMul = 0.92 + this.skill * 0.34;
    // Soft rubber-band only — don't re-pack the field around the player
    if (gap < -0.10) {
      this.vehicle.powerMul = paceMul + (0.025 + Math.min(0.08, -gap * 0.45)) * launchEase;
      throttle = Math.min(1, throttle + 0.06 * launchEase);
    } else if (gap > 0.28) {
      this.vehicle.powerMul = paceMul * 0.95;
      throttle *= 0.92;
    } else {
      this.vehicle.powerMul = paceMul;
    }

    this.vehicle.update(dt, {
      throttle,
      brake,
      steer,
      reset: false,
      pause: false,
      gear: null,
      shiftDelta: 0,
    });
  }

  /** Place the car on its re-traced racing line at track-t, facing forward. */
  private snapToLine(path: THREE.CatmullRomCurve3, t: number, line?: OffsetRacingLine) {
    const groove = line ?? this.ensureLine(path);
    groove.pointAtT(t, this.vehicle.state.position);
    groove.tangentAtT(t, this._tan);
    this.vehicle.state.heading = Math.atan2(this._tan.x, this._tan.z);
    this.vehicle.state.speed = 6;
    this.vehicle.state.steerAngle = 0;
    this.vehicle.setGear(1);
    this.vehicle.syncCollision();
  }

  private debugDrawLine(line: OffsetRacingLine) {
    const parent = this.vehicle.mesh.parent;
    if (!parent) return;
    const pts = line.points.map((p) => p.clone().setY(0.2));
    pts.push(pts[0].clone());
    if (!this.debugLine) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.debugLine = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xff66aa, transparent: true, opacity: 0.45 }),
      );
      parent.add(this.debugLine);
    } else {
      this.debugLine.geometry.setFromPoints(pts);
    }
  }
}
