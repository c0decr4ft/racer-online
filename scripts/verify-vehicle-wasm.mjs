import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const wasm = await WebAssembly.instantiate(
  await readFile(resolve(import.meta.dirname, "../public/wasm/vehicle_core.wasm")),
  {},
);
const core = wasm.instance.exports;
core._initialize();
const result = new Float64Array(core.memory.buffer, core.vehicle_result_ptr(), 5);

const stats = {
  [-1]: { max: 11, accel: 1.5, pullFrom: 0 },
  1: { max: 15.5, accel: 2.2, pullFrom: 0 },
  2: { max: 31, accel: 1.6, pullFrom: 7 },
  3: { max: 48, accel: 1.2, pullFrom: 16 },
  4: { max: 66, accel: 0.95, pullFrom: 28 },
  5: { max: 86, accel: 0.75, pullFrom: 42 },
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function stepJs([x, z, heading, speed, steerAngle], dt, gear, power, throttle, brake, steer) {
  steerAngle += (steer * 0.68 - steerAngle) * Math.min(1, 4 * dt * 3);
  if (gear === 0) {
    if (brake > 0) speed -= Math.sign(speed || 1) * 62 * brake * dt;
  } else {
    const gearStats = stats[gear];
    const forward = gear > 0;
    const absSpeed = Math.abs(speed);
    const cap = gearStats.max * power;
    if (throttle > 0 && absSpeed < cap) {
      const lug =
        absSpeed < gearStats.pullFrom
          ? clamp(absSpeed / Math.max(1, gearStats.pullFrom), 0.08, 0.35)
          : 1;
      const nearLimit = absSpeed / cap;
      const taper =
        nearLimit > 0.85 ? Math.max(0.55, 1 - (nearLimit - 0.85) * 3) : 1;
      const launch = gear === 1 && absSpeed < 5 ? 1.3 : 1;
      speed +=
        (forward ? 1 : -1) *
        46 *
        gearStats.accel *
        power *
        throttle *
        lug *
        taper *
        launch *
        dt;
      speed = forward ? Math.min(speed, cap) : Math.max(speed, -cap);
    } else if (throttle === 0 && absSpeed > 0.5) {
      speed -= Math.sign(speed) * 0.4 * absSpeed * dt;
    }
    if (brake > 0) {
      speed = absSpeed > 0.4 ? speed - Math.sign(speed) * 62 * brake * dt : 0;
    }
    if (forward && speed > cap) {
      speed = Math.max(cap, speed - (30 + (speed - cap) * 2.5) * dt);
    }
    if (!forward && speed < -gearStats.max) {
      speed = Math.min(
        -gearStats.max,
        speed + (30 + (-gearStats.max - speed) * 2.5) * dt,
      );
    }
  }
  speed -= (0.002 * speed * Math.abs(speed) + 1.1 * Math.sign(speed || 0)) * dt;
  if (Math.abs(speed) < 0.1 && throttle === 0) speed = 0;
  const speedFactor = clamp(0.4 + Math.abs(speed) / 36, 0.4, 1.2);
  heading += steerAngle * speedFactor * (speed >= 0 ? 1 : -1) * 1.9 * dt;
  x += Math.sin(heading) * speed * dt;
  z += Math.cos(heading) * speed * dt;
  return [x, z, heading, speed, steerAngle];
}

let seed = 0x2f6e2b1;
const random = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const gears = [-1, 0, 1, 2, 3, 4, 5];
let maxError = 0;

for (let index = 0; index < 10_000; index += 1) {
  const state = [
    random() * 500 - 250,
    random() * 500 - 250,
    random() * Math.PI * 2 - Math.PI,
    random() * 180 - 90,
    random() * 1.36 - 0.68,
  ];
  const dt = 1 / (30 + Math.floor(random() * 115));
  const gear = gears[Math.floor(random() * gears.length)];
  const power = 0.85 + random() * 0.3;
  const throttle = random() > 0.25 ? random() : 0;
  const brake = random() > 0.7 ? random() : 0;
  const steer = random() * 2 - 1;
  const expected = stepJs(state, dt, gear, power, throttle, brake, steer);
  core.vehicle_step(dt, ...state, gear, power, throttle, brake, steer);

  for (let value = 0; value < result.length; value += 1) {
    const error = Math.abs(result[value] - expected[value]);
    maxError = Math.max(maxError, error);
    if (!Number.isFinite(result[value]) || error > 1e-9) {
      throw new Error(
        `Vehicle physics mismatch at case ${index}, value ${value}: ` +
          `wasm=${result[value]} js=${expected[value]} error=${error}`,
      );
    }
  }
}

console.log(`vehicle-wasm: 10,000 parity cases passed (max error ${maxError})`);
