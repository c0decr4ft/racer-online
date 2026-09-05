/** Close the controls overlay if open. */
export function closeControlsHelp(): void {
  const modal = document.getElementById("controls-help");
  modal?.classList.add("hidden");
}

/** Close the homepage instructions overlay if open. */
export function closeHomeInstructions(): void {
  const modal = document.getElementById("home-instructions");
  modal?.classList.add("hidden");
}

function wireModal(opts: {
  btnId: string;
  modalId: string;
  closeId: string;
  panelSelector: string;
  onOpen?: () => void;
}) {
  const btn = document.getElementById(opts.btnId);
  const modal = document.getElementById(opts.modalId);
  const closeBtn = document.getElementById(opts.closeId);

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
    opts.onOpen?.();
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
    const panel = modal.querySelector(opts.panelSelector);
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

/**
 * Wire bottom-left controls + instructions buttons → help overlays.
 */
export function initControlsHelp(): void {
  wireModal({
    btnId: "controls-btn",
    modalId: "controls-help",
    closeId: "controls-help-close",
    panelSelector: ".controls-help-panel",
    onOpen: () => {
      document.getElementById("feedback-compose")?.classList.add("hidden");
      closeHomeInstructions();
    },
  });

  wireModal({
    btnId: "instructions-btn",
    modalId: "home-instructions",
    closeId: "home-instructions-close",
    panelSelector: ".controls-help-panel",
    onOpen: () => {
      document.getElementById("feedback-compose")?.classList.add("hidden");
      closeControlsHelp();
    },
  });
}
