export type Gear = "R" | "N" | 1 | 2 | 3 | 4 | 5;

const GEAR_BY_KEY: Readonly<Record<string, Gear>> = {
  Digit0: "N",
  Numpad0: "N",
  KeyN: "N",
  Digit1: 1,
  Numpad1: 1,
  Digit2: 2,
  Numpad2: 2,
  Digit3: 3,
  Numpad3: 3,
  Digit4: 4,
  Numpad4: 4,
  Digit5: 5,
  Numpad5: 5,
  KeyR: "R",
};
const DRIVE_KEYS = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
  "CapsLock",
] as const;
const BLOCKED_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyC",
  "KeyV",
  "ShiftLeft",
  "ShiftRight",
  "CapsLock",
]);

/** True when focus is in a text field — don't steal keys for driving/gears. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export type InputState = {
  throttle: number;
  brake: number;
  /** Shift / Caps Lock / pad B — hold with steer to drift. */
  handbrake: number;
  steer: number;
  reset: boolean;
  pause: boolean;
  gear: Gear | null;
  /** Sequential shift request: +1 = up, -1 = down. Consumed once per frame. */
  shiftDelta: -1 | 0 | 1;
  /** One-shot fire (unused — reserved). Consumed once per frame. */
  fire: boolean;
  /** Space / pad A — sports jump, or bird ascend. */
  jump: boolean;
  /** KeyC — bird descend (dev free-fly). */
  descend: boolean;
  /** KeyV — bird look straight down (dev free-fly). */
  lookDown: boolean;
};

export class Input {
  private keys = new Set<string>();
  resetPressed = false;
  pausePressed = false;
  private gearPress: Gear | null = null;
  private shiftPress: -1 | 0 | 1 = 0;
  private firePress = false;
  /** On-screen touch pads (phones) — merged with keyboard in getState. */
  private touchThrottle = 0;
  private touchBrake = 0;
  private touchSteer = 0;
  /** Linked phone. Dropped if a fresh packet doesn't arrive. */
  private phoneThrottle = 0;
  private phoneBrake = 0;
  private phoneSteer = 0;
  private phoneHandbrake = 0;
  private phoneUntil = 0;
  /** Mutated in place by getState — avoid a new object every frame. */
  private readonly state: InputState = {
    throttle: 0,
    brake: 0,
    handbrake: 0,
    steer: 0,
    reset: false,
    pause: false,
    gear: null,
    shiftDelta: 0,
    fire: false,
    jump: false,
    descend: false,
    lookDown: false,
  };

  constructor() {
    window.addEventListener("keydown", (e) => {
      // Let form fields receive digits, R/N, Backspace, Space, etc.
      if (isTypingTarget(e.target)) return;

      this.keys.add(e.code);

      if (e.code === "Backspace") {
        this.resetPressed = true;
        e.preventDefault();
      }

      if (e.code === "Escape" || e.code === "KeyP") {
        this.pausePressed = true;
        e.preventDefault();
      }

      const gear = GEAR_BY_KEY[e.code];
      if (gear !== undefined) {
        this.gearPress = gear;
        e.preventDefault();
      }

      if (e.code === "ArrowUp" && !e.repeat) this.shiftPress = 1;
      if (e.code === "ArrowDown" && !e.repeat) this.shiftPress = -1;
      if (e.code === "KeyF" && !e.repeat) this.firePress = true;

      if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => {
      if (isTypingTarget(e.target)) return;
      this.keys.delete(e.code);
    });
  }

  /** Clear held drive keys so resume doesn't surge. */
  clearDriveKeys() {
    for (const code of DRIVE_KEYS) this.keys.delete(code);
    this.clearTouchDrive();
    this.phoneUntil = 0;
  }

  setTouchDrive(axes: { throttle?: number; brake?: number; steer?: number }) {
    if (axes.throttle !== undefined) this.touchThrottle = axes.throttle;
    if (axes.brake !== undefined) this.touchBrake = axes.brake;
    if (axes.steer !== undefined) this.touchSteer = axes.steer;
  }

  clearTouchDrive() {
    this.touchThrottle = 0;
    this.touchBrake = 0;
    this.touchSteer = 0;
  }

  /** Gas, brake, steer, and drift from the linked phone. */
  setPhoneDrive(axes: { throttle: number; brake: number; steer: number; handbrake: number }) {
    this.phoneThrottle = axes.throttle;
    this.phoneBrake = axes.brake;
    this.phoneSteer = axes.steer;
    this.phoneHandbrake = axes.handbrake;
    this.phoneUntil = performance.now() + 320;
  }

  requestPause() {
    this.pausePressed = true;
  }

  /** One-shot sequential shift from on-screen pads or the linked phone. */
  requestShift(delta: -1 | 1) {
    this.shiftPress = delta;
  }

  getState(): InputState {
    // ArrowUp/ArrowDown are dedicated to sequential shifting (not throttle/brake)
    const up = this.keys.has("KeyW");
    const down = this.keys.has("KeyS");
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
    const shift =
      this.keys.has("ShiftLeft") ||
      this.keys.has("ShiftRight") ||
      this.keys.has("CapsLock");

    const reset = this.resetPressed;
    this.resetPressed = false;
    const pause = this.pausePressed;
    this.pausePressed = false;
    const gear = this.gearPress;
    this.gearPress = null;
    const shiftDelta = this.shiftPress;
    this.shiftPress = 0;
    const fire = this.firePress;
    this.firePress = false;
    const phone = performance.now() < this.phoneUntil;

    const s = this.state;
    s.throttle = Math.max(up ? 1 : 0, this.touchThrottle, phone ? this.phoneThrottle : 0);
    s.brake = Math.max(down ? 1 : 0, this.touchBrake, phone ? this.phoneBrake : 0);
    s.handbrake = Math.max(shift ? 1 : 0, phone ? this.phoneHandbrake : 0);
    // Positive steer increases heading, which turns the car LEFT
    // (heading: x += sin(h), z += cos(h); +h rotates forward toward +x,
    // and +x is screen-left with the chase cam). So A = +1, D = -1.
    const keySteer = (left ? 1 : 0) + (right ? -1 : 0);
    const steer = keySteer + this.touchSteer + (phone ? this.phoneSteer : 0);
    s.steer = Math.max(-1, Math.min(1, steer));
    s.reset = reset;
    s.pause = pause;
    s.gear = gear;
    s.shiftDelta = shiftDelta;
    s.fire = fire;
    s.jump = this.keys.has("Space");
    s.descend = this.keys.has("KeyC");
    s.lookDown = this.keys.has("KeyV");
    return s;
  }
}
