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
  /** One-shot fire (dev tank cannon). Consumed once per frame. */
  fire: boolean;
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
  /** Gamepad — polled each getState() and merged like the touch pads. */
  private padIndex: number | null = null;
  private padPrevButtons: boolean[] = [];
  /** Mutated in place by readPad — avoid a new object every frame. */
  private readonly padState = { throttle: 0, brake: 0, handbrake: 0, steer: 0 };
  /** Called once when a gamepad first appears (e.g. to toast the player). */
  onPadConnected?: (name: string) => void;
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

  /** One-shot sequential shift from on-screen pads. */
  requestShift(delta: -1 | 1) {
    this.shiftPress = delta;
  }

  /**
   * Poll the first connected standard-mapping gamepad.
   * Analog stick/triggers merge with keyboard/touch (highest input wins);
   * shoulder buttons shift, Start pauses, Y resets — all edge-triggered.
   */
  private readPad(): { throttle: number; brake: number; handbrake: number; steer: number } {
    const out = this.padState;
    out.throttle = 0;
    out.brake = 0;
    out.handbrake = 0;
    out.steer = 0;
    if (typeof navigator === "undefined" || !navigator.getGamepads) return out;
    const pads = navigator.getGamepads();
    let pad: Gamepad | null = null;
    if (this.padIndex != null && pads[this.padIndex]?.connected) {
      pad = pads[this.padIndex];
    } else {
      for (const p of pads) {
        if (p?.connected) {
          pad = p;
          if (this.padIndex !== p.index) {
            this.padIndex = p.index;
            this.onPadConnected?.(p.id);
          }
          break;
        }
      }
    }
    if (!pad) return out;

    const pressedNow = (i: number) => pad.buttons[i]?.pressed ?? false;
    const value = (i: number) => pad.buttons[i]?.value ?? 0;
    // Edge-triggered buttons — same one-shot fields the keyboard uses
    const prev = this.padPrevButtons;
    const edge = (i: number) => {
      const now = pressedNow(i);
      const was = prev[i] ?? false;
      prev[i] = now;
      return now && !was;
    };
    if (edge(5)) this.shiftPress = 1; // RB
    if (edge(4)) this.shiftPress = -1; // LB
    if (edge(9)) this.pausePressed = true; // Start
    if (edge(3)) this.resetPressed = true; // Y / Triangle
    if (edge(2)) this.firePress = true; // X / Square — tank cannon

    // Positive steer = LEFT (A key). Left stick: left is -x, so flip the sign.
    const ax = pad.axes[0] ?? 0;
    let steer = 0;
    const dz = 0.14;
    if (Math.abs(ax) > dz) {
      const n = (Math.abs(ax) - dz) / (1 - dz);
      steer = -Math.sign(ax) * Math.pow(n, 1.5); // finer control near center
    }
    steer += (pressedNow(14) ? 1 : 0) - (pressedNow(15) ? 1 : 0); // d-pad fallback

    out.throttle = Math.max(value(7), pressedNow(0) ? 1 : 0); // RT, A fallback
    out.brake = value(6); // LT
    out.handbrake = pressedNow(1) ? 1 : 0; // B / Circle — drift
    out.steer = steer;
    return out;
  }

  getState(): InputState {
    const pad = this.readPad();
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

    const s = this.state;
    s.throttle = Math.max(up ? 1 : 0, this.touchThrottle, pad.throttle);
    s.brake = Math.max(down ? 1 : 0, this.touchBrake, pad.brake);
    s.handbrake = Math.max(shift ? 1 : 0, pad.handbrake);
    // Positive steer increases heading, which turns the car LEFT
    // (heading: x += sin(h), z += cos(h); +h rotates forward toward +x,
    // and +x is screen-left with the chase cam). So A = +1, D = -1.
    const keySteer = (left ? 1 : 0) + (right ? -1 : 0);
    const steer = keySteer + this.touchSteer + pad.steer;
    s.steer = Math.max(-1, Math.min(1, steer));
    s.reset = reset;
    s.pause = pause;
    s.gear = gear;
    s.shiftDelta = shiftDelta;
    s.fire = fire;
    return s;
  }
}
