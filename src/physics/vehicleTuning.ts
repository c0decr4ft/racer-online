import type { Gear } from "../input";

export const GEAR_STATS: Record<
  Exclude<Gear, "N">,
  { max: number; accel: number; pullFrom: number }
> = {
  R: { max: 11, accel: 1.5, pullFrom: 0 },
  1: { max: 15.5, accel: 2.2, pullFrom: 0 },
  2: { max: 31, accel: 1.6, pullFrom: 7 },
  3: { max: 48, accel: 1.2, pullFrom: 16 },
  4: { max: 66, accel: 0.95, pullFrom: 28 },
  5: { max: 86, accel: 0.75, pullFrom: 42 },
};

export const BRAKE = 62;
export const DRAG = 0.002;
export const ROLL = 1.1;
export const ENGINE_BRAKE = 0.4;
export const MAX_STEER = 0.68;
export const STEER_SPEED = 4;
export const ACCEL_BASE = 46;
