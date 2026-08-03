import type { Gear, InputState } from "../input";
import {
  ACCEL_BASE,
  BRAKE,
  DRAG,
  ENGINE_BRAKE,
  GEAR_STATS,
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

function stepWithWasm(
  state: PhysicsVehicleState,
  dt: number,
  input: InputState,
  powerMultiplier: number,
): boolean {
  if (!core || !result) return false;
  core.vehicle_step(
    dt,
    state.position.x,
    state.position.z,
    state.heading,
    state.speed,
    state.steerAngle,
    gearCode(state.gear),
    powerMultiplier,
    input.throttle,
    input.brake,
    input.steer,
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
  const targetSteer = input.steer * MAX_STEER;
  state.steerAngle +=
    (targetSteer - state.steerAngle) * Math.min(1, STEER_SPEED * dt * 3);

  const gear = state.gear;
  if (gear === "N") {
    if (input.brake > 0) {
      state.speed -= Math.sign(state.speed || 1) * BRAKE * input.brake * dt;
    }
  } else {
    const stats = GEAR_STATS[gear];
    const forward = gear !== "R";
    const absSpeed = Math.abs(state.speed);
    const cap = stats.max * powerMultiplier;

    if (input.throttle > 0 && absSpeed < cap) {
      const belowBand = absSpeed < stats.pullFrom;
      const lug = belowBand
        ? clamp(absSpeed / Math.max(1, stats.pullFrom), 0.08, 0.35)
        : 1;
      const nearLimit = absSpeed / cap;
      const taper =
        nearLimit > 0.85 ? Math.max(0.55, 1 - (nearLimit - 0.85) * 3) : 1;
      const launch = gear === 1 && absSpeed < 5 ? 1.3 : 1;
      const force =
        ACCEL_BASE * stats.accel * powerMultiplier * input.throttle * lug * taper * launch;
      state.speed += (forward ? 1 : -1) * force * dt;
      state.speed = forward ? Math.min(state.speed, cap) : Math.max(state.speed, -cap);
    } else if (input.throttle === 0 && absSpeed > 0.5) {
      state.speed -= Math.sign(state.speed) * ENGINE_BRAKE * absSpeed * dt;
    }

    if (input.brake > 0) {
      if (absSpeed > 0.4) {
        state.speed -= Math.sign(state.speed) * BRAKE * input.brake * dt;
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

export function stepVehiclePhysics(
  state: PhysicsVehicleState,
  dt: number,
  input: InputState,
  powerMultiplier: number,
) {
  if (!stepWithWasm(state, dt, input, powerMultiplier)) {
    stepWithTypeScript(state, dt, input, powerMultiplier);
  }
}
