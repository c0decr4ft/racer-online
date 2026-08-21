import type { Gear, InputState } from "../input";
import { getSurfaceGrip } from "../weather";
import {
  ACCEL_BASE,
  BRAKE,
  DRAG,
  DRIFT_SLIP,
  DRIFT_YAW,
  ENGINE_BRAKE,
  GEAR_STATS,
  HANDBRAKE,
  MAX_STEER,
  ROLL,
  STEER_SPEED,
} from "./vehicleTuning";

export type PhysicsVehicleState = {
  position: {
    x: number;
    y: number;
    z: number;
    set?: (x: number, y: number, z: number) => unknown;
  };
  heading: number;
  speed: number;
  steerAngle: number;
  gear: Gear;
  /** Body vs travel heading while drifting — eases in/out, never unbounded. */
  driftSlip?: number;
};

type VehicleCoreExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  vehicle_step: (
    dt: number,
    x: number,
    z: number,
    heading: number,
    speed: number,
    steerAngle: number,
    gear: number,
    powerMultiplier: number,
    throttle: number,
    brake: number,
    steer: number,
  ) => void;
  vehicle_result_ptr: () => number;
  _initialize?: () => void;
};

let core: VehicleCoreExports | null = null;
let result: Float64Array | null = null;
let initPromise: Promise<boolean> | null = null;

function gearCode(gear: Gear): number {
  if (gear === "R") return -1;
  if (gear === "N") return 0;
  return gear;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Load the C++ simulation core. A JS fallback keeps old browsers playable. */
export function initVehiclePhysics(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (typeof WebAssembly === "undefined") return false;
    try {
      const url = `${import.meta.env.BASE_URL}wasm/vehicle_core.wasm`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const module = await WebAssembly.instantiate(await response.arrayBuffer(), {});
      const exports = module.instance.exports as VehicleCoreExports;
      exports._initialize?.();
      const ptr = exports.vehicle_result_ptr();
      core = exports;
      result = new Float64Array(exports.memory.buffer, ptr, 5);
      return true;
    } catch (error) {
      console.warn("[physics] C++ WebAssembly unavailable; using TypeScript fallback", error);
      return false;
    }
  })();
  return initPromise;
}

export function vehiclePhysicsBackend(): "cpp-wasm" | "typescript" {
  return core && result ? "cpp-wasm" : "typescript";
}

/** Scale controls for wet/night grip without rebuilding Wasm. */
function gripAdjustedInput(input: InputState, grip: number): {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: number;
  powerScale: number;
} {
  const g = clamp(grip, 0.55, 1);
  return {
    throttle: input.throttle,
    brake: input.brake * (0.62 + 0.38 * g),
    steer: input.steer * (0.7 + 0.3 * g),
    handbrake: input.handbrake || 0,
    powerScale: 0.82 + 0.18 * g,
  };
}

function stepWithWasm(
  state: PhysicsVehicleState,
  dt: number,
  input: InputState,
  powerMultiplier: number,
): boolean {
  if (!core || !result) return false;
  const wet = gripAdjustedInput(input, getSurfaceGrip());
  core.vehicle_step(
    dt,
    state.position.x,
    state.position.z,
    state.heading,
    state.speed,
    state.steerAngle,
    gearCode(state.gear),
    powerMultiplier * wet.powerScale,
    wet.throttle,
    wet.brake,
    wet.steer,
  );
  state.position.set ? state.position.set(result[0], 0, result[1]) : Object.assign(state.position, {
    x: result[0],
    y: 0,
    z: result[1],
  });
  state.heading = result[2];
  state.speed = result[3];
  state.steerAngle = result[4];
  return true;
}

function stepWithTypeScript(
  state: PhysicsVehicleState,
  dt: number,
  input: InputState,
  powerMultiplier: number,
) {
  const wet = gripAdjustedInput(input, getSurfaceGrip());
  const power = powerMultiplier * wet.powerScale;
  const targetSteer = wet.steer * MAX_STEER;
  state.steerAngle +=
    (targetSteer - state.steerAngle) * Math.min(1, STEER_SPEED * dt * 3);

  const gear = state.gear;
  if (gear === "N") {
    if (wet.brake > 0) {
      state.speed -= Math.sign(state.speed || 1) * BRAKE * wet.brake * dt;
    }
  } else {
    const stats = GEAR_STATS[gear];
    const forward = gear !== "R";
    const absSpeed = Math.abs(state.speed);
    const cap = stats.max * power;

    if (wet.throttle > 0 && absSpeed < cap) {
      const belowBand = absSpeed < stats.pullFrom;
      const lug = belowBand
        ? clamp(absSpeed / Math.max(1, stats.pullFrom), 0.08, 0.35)
        : 1;
      const nearLimit = absSpeed / cap;
      const taper =
        nearLimit > 0.85 ? Math.max(0.55, 1 - (nearLimit - 0.85) * 3) : 1;
      const launch = gear === 1 && absSpeed < 5 ? 1.3 : 1;
      const force =
        ACCEL_BASE * stats.accel * power * wet.throttle * lug * taper * launch;
      state.speed += (forward ? 1 : -1) * force * dt;
      state.speed = forward ? Math.min(state.speed, cap) : Math.max(state.speed, -cap);
    } else if (wet.throttle === 0 && absSpeed > 0.5) {
      state.speed -= Math.sign(state.speed) * ENGINE_BRAKE * absSpeed * dt;
    }

    if (wet.brake > 0) {
      if (absSpeed > 0.4) {
        state.speed -= Math.sign(state.speed) * BRAKE * wet.brake * dt;
      } else {
        state.speed = 0;
      }
    }

    if (forward && state.speed > cap) {
      state.speed = Math.max(
        cap,
        state.speed - (30 + (state.speed - cap) * 2.5) * dt,
      );
    }
    if (!forward && state.speed < -stats.max) {
      state.speed = Math.min(
        -stats.max,
        state.speed + (30 + (-stats.max - state.speed) * 2.5) * dt,
      );
    }
  }

  const drag = DRAG * state.speed * Math.abs(state.speed);
  const roll = ROLL * Math.sign(state.speed || 0);
  state.speed -= (drag + roll) * dt;
  if (Math.abs(state.speed) < 0.1 && input.throttle === 0) state.speed = 0;

  const speedFactor = clamp(0.4 + Math.abs(state.speed) / 36, 0.4, 1.2);
  const turnRate =
    state.steerAngle * speedFactor * (state.speed >= 0 ? 1 : -1) * 1.9;
  state.heading += turnRate * dt;
  state.position.x += Math.sin(state.heading) * state.speed * dt;
  state.position.z += Math.cos(state.heading) * state.speed * dt;
  state.position.y = 0;
}

/**
 * Space + steer: grippy slide. The car rotates a little extra into the
 * corner (capped) so you can drift the line; a tiny outward slip keeps it
 * loose. No full-lock snap and no unbounded spin into the wall.
 */
function applyHandbrakeDrift(
  state: PhysicsVehicleState,
  dt: number,
  handbrake: number,
  steer: number,
) {
  const hb = clamp(handbrake || 0, 0, 1);
  const absSpeed = Math.abs(state.speed);
  if (hb > 0 && absSpeed > 0.4) {
    state.speed -= Math.sign(state.speed) * HANDBRAKE * hb * dt;
  }

  const commit = clamp((Math.abs(steer) - 0.14) / 0.7, 0, 1);
  const sliding = hb > 0.35 && commit > 0 && absSpeed > 7;
  const speedScale = clamp(absSpeed / 42, 0.4, 1);
  const target = sliding
    ? Math.sign(steer) * (state.speed >= 0 ? 1 : -1) * commit * hb * DRIFT_SLIP * speedScale
    : 0;

  const prev = state.driftSlip || 0;
  const rate = sliding ? 9 : 6;
  const k = 1 - Math.exp(-rate * dt);
  const slip = prev + (target - prev) * k;
  state.driftSlip = Math.abs(slip) < 0.002 ? 0 : slip;

  const live = state.driftSlip || 0;
  if (Math.abs(live) < 0.004 || absSpeed < 1) return;

  const sign = Math.sign(live);
  const grip = clamp(Math.abs(live) / 0.12, 0, 1);
  // A bit more yaw when slower so the handbrake still makes the corner.
  const yaw =
    sign *
    grip *
    commit *
    hb *
    DRIFT_YAW *
    clamp(1.05 - absSpeed / 95, 0.55, 1.05);
  state.heading += yaw * dt;

  const h = state.heading;
  const push = absSpeed * dt * live * 0.08;
  state.position.x -= Math.cos(h) * push;
  state.position.z += Math.sin(h) * push;
}

export function stepVehiclePhysics(
  state: PhysicsVehicleState,
  dt: number,
  input: InputState,
  powerMultiplier: number,
) {
  if (!stepWithWasm(state, dt, input, powerMultiplier)) {
    stepWithTypeScript(state, dt, input, powerMultiplier);
  }
  const wet = gripAdjustedInput(input, getSurfaceGrip());
  applyHandbrakeDrift(state, dt, wet.handbrake, wet.steer);
}
