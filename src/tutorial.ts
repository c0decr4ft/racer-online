/** Guided practice coach — Learner Loop, slowed sim, step-by-step prompts. */

export const TUTORIAL_TIME_SCALE = 0.42;

export type TutorialStepId =
  | "welcome"
  | "throttle"
  | "steer"
  | "brake"
  | "shift"
  | "cruise"
  | "done";

type KeyHint = { label: string; active?: boolean };

type StepDef = {
  id: TutorialStepId;
  title: string;
  body: string;
  keys: KeyHint[];
  /** Point DOM arrow at this selector (optional). */
  pointAt?: string;
};

const STEPS: StepDef[] = [
  {
    id: "welcome",
    title: "Learner Loop",
    body: "Welcome! The world runs slowly so you can learn. Follow the arrow.",
    keys: [],
  },
  {
    id: "throttle",
    title: "Accelerate",
    body: "Hold W (or RT on a pad) to give it gas.",
    keys: [{ label: "W", active: true }],
  },
  {
    id: "steer",
    title: "Steer",
    body: "Use A and D (or the stick) to turn into the corners.",
    keys: [
      { label: "A", active: true },
      { label: "D", active: true },
    ],
  },
  {
    id: "brake",
    title: "Brake",
    body: "Tap S (or LT) to slow down before a bend.",
    keys: [{ label: "S", active: true }],
  },
  {
    id: "shift",
    title: "Shift up",
    body: "Press ↑ (or RB) to shift into a higher gear.",
    keys: [{ label: "↑", active: true }],
  },
  {
    id: "cruise",
    title: "Find the flow",
    body: "Keep driving — gas, steer, and shift as you go.",
    keys: [
      { label: "W" },
      { label: "A" },
      { label: "D" },
      { label: "↑" },
    ],
  },
  {
    id: "done",
    title: "You're ready",
    body: "Tutorial complete. Pause and quit when you're done practicing.",
    keys: [{ label: "Esc" }],
    pointAt: "#pause-btn",
  },
];

export type TutorialProgress = {
  step: TutorialStepId;
  /** 0…1 within the current step (for hold-duration checks). */
  fill: number;
};

export class TutorialCoach {
  private root: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private keysEl: HTMLElement | null = null;
  private arrowEl: HTMLElement | null = null;
  private progressEl: HTMLElement | null = null;
  private pointerEl: HTMLElement | null = null;
  private stepIndex = 0;
  private hold = 0;
  private cruiseMs = 0;
  private active = false;
  private finished = false;

  bind(): void {
    this.root = document.getElementById("tutorial-coach");
    this.titleEl = document.getElementById("tutorial-coach-title");
    this.bodyEl = document.getElementById("tutorial-coach-body");
    this.keysEl = document.getElementById("tutorial-coach-keys");
    this.arrowEl = document.getElementById("tutorial-coach-arrow");
    this.progressEl = document.getElementById("tutorial-coach-progress");
    this.pointerEl = document.getElementById("tutorial-coach-pointer");
  }

  get isActive(): boolean {
    return this.active && !this.finished;
  }

  get isRunning(): boolean {
    return this.active;
  }

  /** Full-speed once the lesson is done (still practice on Learner Loop). */
  get timeScale(): number {
    if (!this.active) return 1;
    if (this.finished || this.stepIndex >= STEPS.length - 1) return 1;
    return TUTORIAL_TIME_SCALE;
  }

  start(): void {
    this.bind();
    this.active = true;
    this.finished = false;
    this.stepIndex = 0;
    this.hold = 0;
    this.cruiseMs = 0;
    this.root?.classList.remove("hidden");
    this.render();
  }

  stop(): void {
    this.active = false;
    this.finished = false;
    this.stepIndex = 0;
    this.hold = 0;
    this.cruiseMs = 0;
    this.root?.classList.add("hidden");
    this.pointerEl?.classList.add("hidden");
    document.querySelectorAll(".tutorial-point-target").forEach((el) => {
      el.classList.remove("tutorial-point-target");
    });
  }

  skip(): void {
    if (!this.active) return;
    this.stepIndex = STEPS.length - 1;
    this.finished = true;
    this.hold = 0;
    this.render();
  }

  /**
   * Advance steps from live drive input. Uses real (unscaled) dt so prompts
   * don't drag forever while the sim is slow.
   */
  update(opts: {
    dtReal: number;
    gridHeld: boolean;
    throttle: number;
    brake: number;
    steer: number;
    shiftDelta: number;
    gear: number | string;
    kmh: number;
  }): void {
    if (!this.active || this.finished) {
      this.layoutPointer();
      return;
    }
    if (opts.gridHeld) {
      // Stay on welcome until GO
      if (this.stepIndex !== 0) {
        this.stepIndex = 0;
        this.hold = 0;
        this.render();
      }
      return;
    }

    const step = STEPS[this.stepIndex]!;
    const dt = opts.dtReal;

    switch (step.id) {
      case "welcome":
        this.hold += dt;
        if (this.hold >= 2.2) this.advance();
        break;
      case "throttle":
        if (opts.throttle > 0.45) this.hold += dt;
        else this.hold = Math.max(0, this.hold - dt * 0.6);
        if (this.hold >= 1.1) this.advance();
        break;
      case "steer":
        if (Math.abs(opts.steer) > 0.35) this.hold += dt;
        else this.hold = Math.max(0, this.hold - dt * 0.5);
        if (this.hold >= 0.9) this.advance();
        break;
      case "brake":
        if (opts.brake > 0.4) this.hold += dt;
        else this.hold = Math.max(0, this.hold - dt * 0.4);
        if (this.hold >= 0.55) this.advance();
        break;
      case "shift": {
        const gearNum = typeof opts.gear === "number" ? opts.gear : 0;
        if (opts.shiftDelta > 0 || gearNum >= 2) this.hold += dt;
        if (this.hold >= 0.15) this.advance();
        break;
      }
      case "cruise":
        if (opts.kmh > 28 && opts.throttle > 0.2) this.cruiseMs += dt;
        if (this.cruiseMs >= 6) this.advance();
        break;
      case "done":
        this.finished = true;
        break;
    }

    this.renderFill();
    this.layoutPointer();
  }

  private advance(): void {
    if (this.stepIndex >= STEPS.length - 1) {
      this.finished = true;
      this.render();
      return;
    }
    this.stepIndex += 1;
    this.hold = 0;
    if (STEPS[this.stepIndex]?.id === "done") this.finished = true;
    this.render();
  }

  private render(): void {
    const step = STEPS[this.stepIndex]!;
    if (this.titleEl) this.titleEl.textContent = step.title;
    if (this.bodyEl) this.bodyEl.textContent = step.body;
    if (this.keysEl) {
      this.keysEl.innerHTML = "";
      for (const key of step.keys) {
        const k = document.createElement("span");
        k.className = "tutorial-key" + (key.active ? " is-active" : "");
        k.textContent = key.label;
        this.keysEl.appendChild(k);
      }
      this.keysEl.classList.toggle("hidden", step.keys.length === 0);
    }
    this.arrowEl?.classList.toggle("hidden", step.keys.length === 0 && !step.pointAt);
    if (this.progressEl) {
      this.progressEl.innerHTML = "";
      for (let i = 0; i < STEPS.length; i++) {
        const dot = document.createElement("span");
        dot.className =
          "tutorial-dot" +
          (i < this.stepIndex ? " is-done" : "") +
          (i === this.stepIndex ? " is-current" : "");
        this.progressEl.appendChild(dot);
      }
    }
    this.renderFill();
    this.layoutPointer();
  }

  private renderFill(): void {
    const step = STEPS[this.stepIndex];
    if (!step || !this.root) return;
    let need = 1;
    if (step.id === "welcome") need = 2.2;
    else if (step.id === "throttle") need = 1.1;
    else if (step.id === "steer") need = 0.9;
    else if (step.id === "brake") need = 0.55;
    else if (step.id === "shift") need = 0.15;
    else if (step.id === "cruise") need = 6;
    else need = 1;
    const fill =
      step.id === "cruise" ? this.cruiseMs / need : Math.min(1, this.hold / need);
    this.root.style.setProperty("--tutorial-fill", String(fill));
  }

  private layoutPointer(): void {
    const step = STEPS[this.stepIndex];
    document.querySelectorAll(".tutorial-point-target").forEach((el) => {
      el.classList.remove("tutorial-point-target");
    });
    if (!this.pointerEl || !step?.pointAt || !this.active) {
      this.pointerEl?.classList.add("hidden");
      return;
    }
    const target = document.querySelector(step.pointAt);
    if (!(target instanceof HTMLElement) || target.classList.contains("hidden")) {
      this.pointerEl.classList.add("hidden");
      return;
    }
    target.classList.add("tutorial-point-target");
    const rect = target.getBoundingClientRect();
    this.pointerEl.classList.remove("hidden");
    this.pointerEl.style.left = `${rect.left + rect.width / 2}px`;
    this.pointerEl.style.top = `${rect.bottom + 8}px`;
  }
}
