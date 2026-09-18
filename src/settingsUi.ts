/** Home Settings modal — graphics / effects / sound. */

import {
  loadSettings,
  saveSettings,
  type GameSettings,
  type QualityLevel,
} from "./settings";
import { closeControlsHelp, closeHomeInstructions } from "./controlsHelp";

export type SettingsApplyFn = (settings: GameSettings) => void;

let applyFn: SettingsApplyFn | null = null;
let current: GameSettings = loadSettings();

export function getUiSettings(): GameSettings {
  return { ...current };
}

export function closeSettings(): void {
  document.getElementById("home-settings")?.classList.add("hidden");
}

function setActive(group: HTMLElement | null, value: string) {
  if (!group) return;
  for (const btn of group.querySelectorAll<HTMLButtonElement>("[data-value]")) {
    btn.classList.toggle("is-active", btn.dataset.value === value);
  }
}

function syncUi(settings: GameSettings) {
  setActive(document.getElementById("settings-graphics"), settings.graphics);
  setActive(document.getElementById("settings-effects"), settings.effects);
  const slider = document.getElementById("settings-sound");
  const label = document.getElementById("settings-sound-value");
  if (slider instanceof HTMLInputElement) slider.value = String(settings.sound);
  if (label) label.textContent = `${settings.sound}%`;
}

function commit(partial: Partial<GameSettings>) {
  current = saveSettings({ ...current, ...partial });
  syncUi(current);
  applyFn?.(current);
}

/**
 * Wire homepage Settings button. Call `onApply` whenever the player changes a value.
 */
export function initSettingsUi(opts: { onApply: SettingsApplyFn }): void {
  applyFn = opts.onApply;
  current = loadSettings();

  const btn = document.getElementById("settings-btn");
  const modal = document.getElementById("home-settings");
  const closeBtn = document.getElementById("settings-close");
  if (
    !(btn instanceof HTMLButtonElement) ||
    !(modal instanceof HTMLElement) ||
    !(closeBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  const open = () => {
    document.getElementById("feedback-compose")?.classList.add("hidden");
    closeControlsHelp();
    closeHomeInstructions();
    current = loadSettings();
    syncUi(current);
    modal.classList.remove("hidden");
    requestAnimationFrame(() => closeBtn.focus());
  };

  const close = () => modal.classList.add("hidden");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (modal.classList.contains("hidden")) open();
    else close();
  });

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });

  document.addEventListener("click", (e) => {
    if (modal.classList.contains("hidden")) return;
    const t = e.target;
    if (!(t instanceof Node)) return;
    const panel = modal.querySelector(".home-settings-panel");
    if (panel instanceof HTMLElement && !panel.contains(t) && !btn.contains(t)) close();
  });

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      if (modal.classList.contains("hidden")) return;
      e.stopPropagation();
      e.preventDefault();
      close();
      btn.focus();
    },
    true,
  );

  const wireGroup = (id: string, key: "graphics" | "effects") => {
    const group = document.getElementById(id);
    if (!group) return;
    group.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLButtonElement)) return;
      const value = t.dataset.value as QualityLevel | undefined;
      if (!value) return;
      commit({ [key]: value });
    });
  };
  wireGroup("settings-graphics", "graphics");
  wireGroup("settings-effects", "effects");

  const slider = document.getElementById("settings-sound");
  if (slider instanceof HTMLInputElement) {
    slider.addEventListener("input", () => {
      commit({ sound: Number(slider.value) });
    });
  }

  // Apply stored settings once at boot (before first race).
  syncUi(current);
  applyFn(current);
}
