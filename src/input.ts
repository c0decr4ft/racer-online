export type Gear = "R" | "N" | 1 | 2 | 3 | 4 | 5;

export type InputState = {
  throttle: number;
  brake: number;
  steer: number;
  reset: boolean;
  pause: boolean;
  gear: Gear | null;
  /** Sequential shift request: +1 = up, -1 = down. Consumed once per frame. */
  shiftDelta: -1 | 0 | 1;
};

export class Input {
  private keys = new Set<string>();
  resetPressed = false;
  pausePressed = false;
  private gearPress: Gear | null = null;
  private shiftPress: -1 | 0 | 1 = 0;

  constructor() {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);

      if (e.code === "Backspace") {
        this.resetPressed = true;
        e.preventDefault();
      }

      if (e.code === "Escape" || e.code === "KeyP") {
        this.pausePressed = true;
        e.preventDefault();
      }

      const gearMap: Record<string, Gear> = {
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
      if (e.code in gearMap) {
        this.gearPress = gearMap[e.code];
        e.preventDefault();
      }

      if (e.code === "ArrowUp" && !e.repeat) this.shiftPress = 1;
      if (e.code === "ArrowDown" && !e.repeat) this.shiftPress = -1;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });
  }

  /** Clear held drive keys so resume doesn't surge. */
  clearDriveKeys() {
    for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowLeft", "ArrowRight", "Space"]) {
      this.keys.delete(code);
    }
  }

  getState(): InputState {
    // ArrowUp/ArrowDown are dedicated to sequential shifting (not throttle/brake)
    const up = this.keys.has("KeyW");
    const down = this.keys.has("KeyS");
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
    const space = this.keys.has("Space");

    const reset = this.resetPressed;
    this.resetPressed = false;
    const pause = this.pausePressed;
    this.pausePressed = false;
    const gear = this.gearPress;
    this.gearPress = null;
    const shiftDelta = this.shiftPress;
    this.shiftPress = 0;

    return {
      throttle: up ? 1 : 0,
      brake: down || space ? 1 : 0,
      // Positive steer increases heading, which turns the car LEFT
      // (heading: x += sin(h), z += cos(h); +h rotates forward toward +x,
      // and +x is screen-left with the chase cam). So A = +1, D = -1.
      steer: (left ? 1 : 0) + (right ? -1 : 0),
      reset,
      pause,
      gear,
      shiftDelta,
    };
  }
}
