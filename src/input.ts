export type Gear = "R" | "N" | 1 | 2 | 3 | 4 | 5;

export type InputState = {
  throttle: number;
  brake: number;
  steer: number;
  reset: boolean;
  pause: boolean;
  gear: Gear | null;
};

export class Input {
  private keys = new Set<string>();
  resetPressed = false;
  pausePressed = false;
  private gearPress: Gear | null = null;

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
    for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]) {
      this.keys.delete(code);
    }
  }

  getState(): InputState {
    const up = this.keys.has("KeyW") || this.keys.has("ArrowUp");
    const down = this.keys.has("KeyS") || this.keys.has("ArrowDown");
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
    const space = this.keys.has("Space");

    const reset = this.resetPressed;
    this.resetPressed = false;
    const pause = this.pausePressed;
    this.pausePressed = false;
    const gear = this.gearPress;
    this.gearPress = null;

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
    };
  }
}
