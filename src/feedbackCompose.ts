import { closeControlsHelp } from "./controlsHelp";
import {
  FEEDBACK_NAME_MAX,
  FEEDBACK_TEXT_MAX,
  submitFeedback,
} from "./net/feedback";
import { getSession } from "./nostr/session";
import { fetchProfile } from "./nostr/profile";

/** Show on homepage/menu; hide during a race session (same as version badge). */
export function setFeedbackBtnVisible(visible: boolean): void {
  const cluster = document.getElementById("home-corner-btns");
  const btn = document.getElementById("feedback-btn");
  const modal = document.getElementById("feedback-compose");
  if (cluster instanceof HTMLElement) cluster.classList.toggle("hidden", !visible);
  else if (btn instanceof HTMLElement) btn.classList.toggle("hidden", !visible);
  if (!visible) {
    modal?.classList.add("hidden");
    closeControlsHelp();
    const form = document.getElementById("feedback-compose-form");
    if (form instanceof HTMLFormElement) form.reset();
    const status = document.getElementById("feedback-compose-status");
    if (status instanceof HTMLElement) {
      status.textContent = "";
      status.classList.add("hidden");
    }
  }
}

/**
 * Wire bottom-left feedback button → compose modal → submit to shared store.
 */
export function initFeedbackCompose(): void {
  const btn = document.getElementById("feedback-btn");
  const modal = document.getElementById("feedback-compose");
  const form = document.getElementById("feedback-compose-form");
  const textInput = document.getElementById("feedback-text");
  const nameInput = document.getElementById("feedback-name");
  const cancelBtn = document.getElementById("feedback-compose-cancel");
  const status = document.getElementById("feedback-compose-status");
  const submitBtn = document.getElementById("feedback-compose-submit");

  if (
    !(btn instanceof HTMLButtonElement) ||
    !(modal instanceof HTMLElement) ||
    !(form instanceof HTMLFormElement) ||
    !(textInput instanceof HTMLTextAreaElement) ||
    !(nameInput instanceof HTMLInputElement) ||
    !(cancelBtn instanceof HTMLButtonElement) ||
    !(status instanceof HTMLElement) ||
    !(submitBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  textInput.maxLength = FEEDBACK_TEXT_MAX;
  nameInput.maxLength = FEEDBACK_NAME_MAX;

  const close = () => {
    modal.classList.add("hidden");
    form.reset();
    status.textContent = "";
    status.classList.add("hidden");
    submitBtn.disabled = false;
  };

  const open = () => {
    closeControlsHelp();
    status.textContent = "";
    status.classList.add("hidden");
    form.reset();
    submitBtn.disabled = false;
    // Signed in? Pre-fill the name from the Nostr profile (stays editable).
    const session = getSession();
    if (session) {
      void fetchProfile(session.pubkey).then((profile) => {
        const name = profile?.displayName || profile?.name;
        if (name && !nameInput.value.trim()) {
          nameInput.value = name.slice(0, FEEDBACK_NAME_MAX);
        }
      });
    }
    modal.classList.remove("hidden");
    requestAnimationFrame(() => textInput.focus());
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });

  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) {
      status.textContent = "Write a short message first";
      status.classList.remove("hidden");
      textInput.focus();
      return;
    }
    submitBtn.disabled = true;
    status.textContent = "Sending…";
    status.classList.remove("hidden");
    void submitFeedback(text, nameInput.value.trim() || undefined).then((snap) => {
      if (snap.source === "local") {
        status.textContent = "Saved offline — will sync when online";
      } else {
        status.textContent = "Thanks — sent to the developer";
      }
      setTimeout(close, 900);
    });
  });

  document.addEventListener("click", (e) => {
    if (modal.classList.contains("hidden")) return;
    const t = e.target;
    if (!(t instanceof Node)) return;
    const panel = modal.querySelector(".feedback-compose-panel");
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
