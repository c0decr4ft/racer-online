import * as THREE from "three";
import type { Gear, InputState } from "./input";
import { stepVehiclePhysics } from "./physics/vehiclePhysics";
import { GEAR_STATS } from "./physics/vehicleTuning";
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
};

/**
 * Real-car style progressive gears (shared by player + AI — same ceilings):
 * 1st = launch only (strong pull, low ceiling). Each upshift unlocks top speed.
 * Wrong gear hurts — lug below pullFrom, rev limiter pins speed at each gear's max.
 *
 * NOTE: DRAG must stay small relative to engine force. A large quadratic drag
 * previously capped EVERY gear at ~60 km/h, making shifts feel like they did
 * nothing. The per-gear rev limiter (not drag) is the intended speed cap.
 */
export { GEAR_STATS };

/** Gear ceiling in km/h — identical for player and AI. */
export function gearMaxKmh(gear: Exclude<Gear, "N" | "R">): number {
  return GEAR_STATS[gear].max * 3.6;
}

const SHIFT_COOLDOWN = 0.1;

const GEAR_SEQUENCE: Gear[] = ["R", "N", 1, 2, 3, 4, 5];

export class Vehicle {
  state: VehicleState;
  mesh: THREE.Group;
  private manual: boolean;
  private shiftTimer = 0;
  /** Drive multiplier — must stay 1 for fair AI (same gear ceilings as player). */
  powerMul = 1;
  /**
   * Seconds of post–animal-hit drive cut. Player and AI both use this so a
   * wildlife collision actually sticks instead of full-throttle recovery.
   */
  animalHitPenalty = 0;

  constructor(mesh: THREE.Group, position: THREE.Vector3, heading: number, manual = false) {
    this.mesh = mesh;
    this.manual = manual;
    this.state = {
      position: position.clone(),
      heading,
      speed: 0,
      steerAngle: 0,
      gear: 1,
    };
    this.syncMesh();
  }

  reset(position: THREE.Vector3, heading: number) {
    this.state.position.copy(position);
    this.state.heading = heading;
    this.state.speed = 0;
    this.state.steerAngle = 0;
    this.state.gear = 1;
    this.shiftTimer = 0;
    this.powerMul = 1;
    this.animalHitPenalty = 0;
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

    let physicsInput = input;
    if (this.animalHitPenalty > 0) {
      this.animalHitPenalty = Math.max(0, this.animalHitPenalty - dt);
      physicsInput = {
        ...input,
        throttle: input.throttle * 0.12,
        brake: Math.max(input.brake, 0.18),
      };
    }

    stepVehiclePhysics(s, dt, physicsInput, this.powerMul);

    this.syncMesh();
    this.animateWheels(dt);
  }

  /**
   * AI gear selection using the same GEAR_STATS / setGear path as the player.
   * Commit to 4–5 early so gear-5 cruise (~310) is reachable; 2nd only for hairpins / launch.
   */
  aiShift(opts: { maxKappa: number; nearKappa: number; turnAngle: number; cornerKmh: number }) {
    if (this.shiftTimer > 0) return;

    const kmh = this.kmh;
    const peakKappa = Math.max(opts.maxKappa, opts.nearKappa);
    const tightTurn =
      peakKappa > 0.024 ||
      opts.turnAngle > 0.82 ||
      (opts.cornerKmh < 95 && opts.turnAngle > 0.5 && peakKappa > 0.016);
    const openFast =
      peakKappa < 0.012 && opts.turnAngle < 0.4 && opts.cornerKmh > gearMaxKmh(3) * 0.85;

    let next: Exclude<Gear, "N" | "R"> = 3;
    if (kmh < 42) {
      next = 1;
    } else if (kmh < 72 || tightTurn) {
      // 2nd for launch pull-through and hairpins (gear 2 ceiling ~112)
      next = 2;
    } else if (openFast && kmh > gearMaxKmh(3) * 0.68) {
      // Long/open sections — unlock 4th early, then 5th once rolling
      next = kmh > gearMaxKmh(4) * 0.62 ? 5 : 4;
    } else if (!tightTurn && kmh > gearMaxKmh(3) * 0.78) {
      // Push into 4th sooner; upshift to 5th once past mid-4th
      next = kmh > gearMaxKmh(4) * 0.7 ? 5 : 4;
    } else {
      next = 3;
    }

    // Don't upshift into a lug band (same pullFrom limits the player feels)
    while (next > 1 && kmh < GEAR_STATS[next].pullFrom * 3.6 * 0.92) {
      next = (next - 1) as 1 | 2 | 3 | 4 | 5;
    }

    if (next !== this.state.gear) this.setGear(next);
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
    const isBike = this.mesh.userData.kind === "bike";
    const leanLimit = isBike ? 0.42 : 0.14;
    const leanSpeed = isBike ? 34 : 50;
    this.mesh.rotation.z = THREE.MathUtils.clamp(
      -s.steerAngle * (Math.abs(s.speed) / leanSpeed),
      -leanLimit,
      leanLimit,
    );
    this.mesh.rotation.x = THREE.MathUtils.clamp(-s.speed * 0.00055, -0.045, 0.03);
  }

  private animateWheels(dt: number) {
    const steers = this.mesh.userData.steers as THREE.Group[] | undefined;
    const spinners = this.mesh.userData.spinners as THREE.Group[] | undefined;
    const radius = (this.mesh.userData.wheelRadius as number) ?? 0.38;
    if (!steers || !spinners) return;
    const spin = (this.state.speed * dt) / radius;
    const steerCount =
      typeof this.mesh.userData.steerCount === "number"
        ? Math.max(0, this.mesh.userData.steerCount as number)
        : Math.min(2, steers.length);
    steers.forEach((steer, i) => {
      steer.rotation.y = i < steerCount ? this.state.steerAngle * 0.85 : 0;
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
  /** True after completing the race distance (race mode only). */
  raceDone = false;
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
  private readonly _tmp = new THREE.Vector3();
  /** Reused AI control input — avoid allocating a new object every frame. */
  private readonly _driveInput: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    reset: false,
    pause: false,
    gear: null,
    shiftDelta: 0,
  };

  constructor(vehicle: Vehicle, laneOffset: number, skill: number, gridIndex = 0) {
    this.vehicle = vehicle;
    this.laneOffset = THREE.MathUtils.clamp(laneOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET);
    this.skill = skill;
    // Playable pack — firm throttle without pinning WOT
    this.aggression = Math.min(1.22, 0.98 + skill * 0.08);
    // Deterministic — same groove / look-ahead every race for this slot
    this.lookAheadBias = 0.92 + (gridIndex % 5) * 0.03 + skill * 0.035;
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
    this.raceDone = false;
  }

  /** Mark as finished — coasts out of the way; no more lap scoring. */
  markRaceDone() {
    this.raceDone = true;
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
    // Soft launch: ~0.65s ramp — snappy into race pace, brief scrub into T1 only
    const launch = Math.min(1, this.raceAge / 0.65);
    const launchEase = launch * launch * (3 - 2 * launch); // smootherstep — snappier mid-ramp

    const line = this.ensureLine(path);
    const pos = this.vehicle.state.position;
    const prevT = this.lastT;
    const bestT =
      prevT == null
        ? projectOnTrack(path, pos).t
        : projectOnTrackNear(path, pos, prevT).t;
    this.lastT = bestT;

    if (prevT != null && !this.raceDone) {
      this.gates.update(prevT, bestT);
      if (prevT > 0.85 && bestT < 0.15 && this.gates.readyForFinish) {
        this.laps += 1;
        this.gates.reset();
      }
    }

    // Finished race cars: soft coast along their line so they clear the pack
    if (this.raceDone) {
      this.coastFinished(dt, line, bestT);
      return;
    }

    const absSpeed = Math.abs(this.vehicle.state.speed);
    const speed = Math.max(6, absSpeed);

    // Lateral error vs THIS car's re-traced line (positive = line is to the left)
    line.tangentAtT(bestT, this._tan);
    this._n.set(-this._tan.z, 0, this._tan.x);
    line.pointAtT(bestT, this._aim);
    const lateralFromLine =
      (pos.x - this._aim.x) * this._n.x + (pos.z - this._aim.z) * this._n.z;
    // CTE: positive → need left steer (toward line). Car left of line → negative.
    const laneErr = -lateralFromLine;

    const pathHeading = Math.atan2(this._tan.x, this._tan.z);
    let facingErr = pathHeading - this.vehicle.state.heading;
    while (facingErr > Math.PI) facingErr -= Math.PI * 2;
    while (facingErr < -Math.PI) facingErr += Math.PI * 2;

    // Stuck / wall: rare snap onto the re-traced line — never continuous sideways yank
    path.getTangentAt(bestT, this._tmp).normalize();
    const cNx = -this._tmp.z;
    const cNz = this._tmp.x;
    path.getPointAt(bestT, this._tmp);
    const lateralFromCenter = (pos.x - this._tmp.x) * cNx + (pos.z - this._tmp.z) * cNz;
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

    // Wrong-way after a hit: rotate toward race direction
    if (Math.abs(facingErr) > Math.PI * 0.55) {
      this.vehicle.state.heading += Math.sign(facingErr) * Math.min(Math.abs(facingErr), 3.2 * dt);
      if (this.vehicle.state.speed < 0) this.vehicle.state.speed = Math.abs(this.vehicle.state.speed) * 0.2;
    }

    // Look-ahead along the OFFSET line: longer at speed, shorter when correcting CTE
    let lookDist = THREE.MathUtils.clamp((18 + speed * 0.85) * this.lookAheadBias, 20, 78);
    if (Math.abs(laneErr) > 1.2) lookDist *= THREE.MathUtils.clamp(1.15 - Math.abs(laneErr) * 0.18, 0.55, 1);
    if (launchEase < 0.45) lookDist = Math.min(lookDist, 32);

    // Curvature on the re-traced line (rad/m) — detects smooth T1, not just kinks
    const { maxKappa, nearKappa, turnAngle } = line.curvatureAhead(bestT, Math.max(lookDist, 42));
    const kmh = this.vehicle.kmh;
    // Target corner speed from kappa: higher a → carry more mid-corner pace.
    const peakKappa = Math.max(maxKappa, nearKappa, 1e-4);
    const cornerKmh = Math.sqrt(88 / peakKappa) * 3.6;

    // Mild powerMul — raceable vs the player (~1.2–1.5 band).
    const g3 = gearMaxKmh(3);
    const g5 = gearMaxKmh(5);
    const driveMul = 1.15 + Math.max(0, this.skill - 1.4) * 0.28;
    const g5Eff = g5 * driveMul;
    const openStraight = peakKappa < 0.011 && turnAngle < 0.35 && cornerKmh > g3;
    let cruiseKmh: number;
    if (openStraight) {
      // Skill ~1.55–2.35 → ~220–255 on open track
      cruiseKmh = Math.min(g5Eff * 0.58, g5 * 0.72 + this.skill * 10);
    } else {
      // Default race pace: ~200–235
      cruiseKmh = Math.min(g5Eff * 0.52, g5 * 0.62 + this.skill * 12);
    }
    // On open track hold cruise; in bends the corner target wins
    const targetKmh = Math.min(cruiseKmh, cornerKmh);

    // Fair gears only — shift after we know curvature / corner target
    this.vehicle.aiShift({ maxKappa, nearKappa, turnAngle, cornerKmh });

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

    // Brake for curvature EARLY — but only when truly overspeed for a real bend.
    // Mild kinks no longer pin the pack well below cruise.
    let brake = avoidBrake;
    const overspeed = kmh - targetKmh;
    if (overspeed > 18 && turnAngle > 0.36) {
      brake = Math.max(brake, THREE.MathUtils.clamp(0.18 + overspeed / 90, 0.18, 0.85));
    }
    if (nearKappa > 0.017 && overspeed > 14) brake = Math.max(brake, 0.24 + nearKappa * 12);
    if (maxKappa > 0.024 && overspeed > 16) brake = Math.max(brake, 0.28 + maxKappa * 12);
    if (turnAngle > 0.7 && overspeed > 12) brake = Math.max(brake, 0.34 + Math.min(0.38, turnAngle * 0.28));
    if (cornering > 0.55 && kmh > 110 && overspeed > 6) brake = Math.max(brake, 0.28);
    if (cornering > 0.9 && kmh > 90) brake = Math.max(brake, 0.55);
    if (Math.abs(laneErr) > 2.2 && kmh > 100) {
      brake = Math.max(brake, 0.16 + Math.min(0.32, (Math.abs(laneErr) - 2.2) * 0.16));
    }
    // Soft launch into first bend: scrub only if already fast into a real turn
    if (launchEase < 0.35 && turnAngle > 0.55 && kmh > 120) {
      brake = Math.max(brake, 0.28);
    }
    // Higher skill = carry more speed into bends
    brake = Math.min(1, brake * (0.85 - this.skill * 0.1));

    let throttle = this.aggression * avoidLift * (0.9 + 0.1 * launchEase);
    if (kmh < 35) throttle *= 0.85 + 0.15 * (kmh / 35);
    // Hold cruise / don't full-throttle when overspeed for bend or top-end
    if (overspeed > 14) throttle *= THREE.MathUtils.clamp(1 - overspeed / 130, 0.18, 1);
    // On open track, ease onto cruise late so they keep climbing hard
    if (cornerKmh > cruiseKmh && kmh > cruiseKmh - 28) {
      throttle *= THREE.MathUtils.clamp((cruiseKmh + 22 - kmh) / 40, 0.35, 1);
    }
    if (brake > 0.5) throttle *= 0.16;
    else if (cornering > 0.6) throttle *= 0.82;
    else if (maxKappa > 0.024 && overspeed > 8) throttle *= 0.92;
    if (Math.abs(laneErr) > 2.4) throttle *= 0.92;

    let gap = bestT - playerT;
    if (gap > 0.5) gap -= 1;
    if (gap < -0.5) gap += 1;
    this.vehicle.powerMul = driveMul;
    if (gap < -0.10) {
      throttle = Math.min(1, throttle + (0.08 + Math.min(0.1, -gap * 0.4)) * launchEase);
    } else if (gap > 0.45) {
      throttle *= 0.95;
    }

    const input = this._driveInput;
    input.throttle = throttle;
    input.brake = brake;
    input.steer = steer;
    this.vehicle.update(dt, input);
  }

  /** Slow cruise along the groove after finishing — clears racing lines. */
  private coastFinished(dt: number, line: OffsetRacingLine, bestT: number) {
    const pos = this.vehicle.state.position;
    line.sampleAhead(bestT, 18, this._far, this._tan);
    const desired = Math.atan2(this._far.x - pos.x, this._far.z - pos.z);
    let headingError = desired - this.vehicle.state.heading;
    while (headingError > Math.PI) headingError -= Math.PI * 2;
    while (headingError < -Math.PI) headingError += Math.PI * 2;
    const kmh = this.vehicle.kmh;
    const cruise = 48;
    let throttle = kmh < cruise - 4 ? 0.35 : 0.08;
    let brake = kmh > cruise + 8 ? 0.35 : 0;
    this.vehicle.powerMul = 1;
    if (this.vehicle.state.gear !== 2 && this.vehicle.state.gear !== 1) {
      this.vehicle.setGear(2);
    }
    const input = this._driveInput;
    input.throttle = throttle;
    input.brake = brake;
    input.steer = THREE.MathUtils.clamp(headingError * 2.2, -1, 1);
    this.vehicle.update(dt, input);
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
