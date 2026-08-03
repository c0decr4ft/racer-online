import type { Input } from "./input";

/** Primary input is a touchscreen (phone/tablet) — not a mouse/trackpad laptop. */
export function isTouchPrimary(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  // Phones/tablets: coarse pointer + no hover. Exclude touch laptops (fine pointer + hover).
  return hasTouch && coarse && noHover;
}

/** CSS-pixel viewport — prefers visualViewport so mobile browser chrome is accounted for. */
export function viewportSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { w: Math.round(vv.width), h: Math.round(vv.height) };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

type TouchAction = "left" | "right" | "gas" | "brake" | "shift-up" | "shift-down";

/**
 * Binds on-screen race pads into Input. Only active when touch-primary devices
 * show `#touch-controls` during a race — desktop stays keyboard-only.
 */
export class TouchControls {
  private readonly root: HTMLElement | null;
  private readonly input: Input;
  private bound = false;
  private active = false;
  private left = false;
  private right = false;
  private gas = false;
  private brake = false;
  private readonly pointers = new Map<number, TouchAction>();

  constructor(input: Input) {
    this.input = input;
    this.root = document.getElementById("touch-controls");
  }

  /** Apply `touch-mode` on <html> and bind pads once. Call on boot + orientation. */
  syncMode(enabled: boolean) {
    document.documentElement.classList.toggle("touch-mode", enabled);
    if (enabled && !this.bound) this.bind();
    if (!enabled) {
      this.setVisible(false);
      this.clearAll();
    }
  }

  setVisible(visible: boolean) {
    this.active = visible;
    if (!this.root) return;
    this.root.classList.toggle("hidden", !visible);
    this.root.setAttribute("aria-hidden", visible ? "false" : "true");
    if (!visible) this.clearAll();
  }

  private bind() {
    if (!this.root || this.bound) return;
    this.bound = true;

    this.root.querySelectorAll<HTMLElement>("[data-touch]").forEach((el) => {
      const action = el.dataset.touch as TouchAction | undefined;
      if (!action) return;

      const onDown = (e: PointerEvent) => {
        if (!this.active) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        this.pointers.set(e.pointerId, action);
        el.classList.add("is-active");
        this.applyAction(action, true);
      };

      const onUp = (e: PointerEvent) => {
        const tracked = this.releasePointer(e.pointerId);
        if (!tracked) return;
        e.preventDefault();
      };

      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
      el.addEventListener("lostpointercapture", onUp);
      // Block context menu / callout on long-press
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    });

    // Mobile browsers can release a pointer outside its button or interrupt the
    // page without delivering pointerup to the captured element.
    window.addEventListener("pointerup", (e) => this.releasePointer(e.pointerId));
    window.addEventListener("pointercancel", (e) => this.releasePointer(e.pointerId));
    window.addEventListener("blur", () => this.clearAll());
    window.addEventListener("pagehide", () => this.clearAll());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clearAll();
    });
  }

  private releasePointer(pointerId: number): TouchAction | undefined {
    const action = this.pointers.get(pointerId);
    if (!action) return undefined;
    this.pointers.delete(pointerId);
    for (const held of this.pointers.values()) {
      if (held === action) return action;
    }
    this.root
      ?.querySelectorAll<HTMLElement>(`[data-touch="${action}"]`)
      .forEach((el) => el.classList.remove("is-active"));
    this.applyAction(action, false);
    return action;
  }

  private applyAction(action: TouchAction, down: boolean) {
    switch (action) {
      case "left":
        this.left = down;
        break;
      case "right":
        this.right = down;
        break;
      case "gas":
        this.gas = down;
        break;
      case "brake":
        this.brake = down;
        break;
      case "shift-up":
        if (down) this.input.requestShift(1);
        return;
      case "shift-down":
        if (down) this.input.requestShift(-1);
        return;
    }
    this.pushAxes();
  }

  private pushAxes() {
    this.input.setTouchDrive({
      throttle: this.gas ? 1 : 0,
      brake: this.brake ? 1 : 0,
      steer: (this.left ? 1 : 0) + (this.right ? -1 : 0),
    });
  }

  private clearAll() {
    this.left = this.right = this.gas = this.brake = false;
    this.pointers.clear();
    this.root
      ?.querySelectorAll<HTMLElement>("[data-touch].is-active")
      .forEach((el) => el.classList.remove("is-active"));
    this.input.clearTouchDrive();
  }
}
