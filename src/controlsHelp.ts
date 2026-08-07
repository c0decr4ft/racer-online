/** Close the controls overlay if open. */
export function closeControlsHelp(): void {
  const modal = document.getElementById("controls-help");
  modal?.classList.add("hidden");
}

/**
 * Wire bottom-left controls button → help overlay (bindings from input.ts).
 */
export function initControlsHelp(): void {
  const btn = document.getElementById("controls-btn");
  const modal = document.getElementById("controls-help");
  const closeBtn = document.getElementById("controls-help-close");

  if (
    !(btn instanceof HTMLButtonElement) ||
    !(modal instanceof HTMLElement) ||
    !(closeBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  const close = () => {
    modal.classList.add("hidden");
  };

  const open = () => {
    document.getElementById("feedback-compose")?.classList.add("hidden");
    modal.classList.remove("hidden");
    requestAnimationFrame(() => closeBtn.focus());
  };

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
    const panel = modal.querySelector(".controls-help-panel");
    if (panel instanceof HTMLElement && !panel.contains(t) && !btn.contains(t)) {
      close();
    }
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
}
