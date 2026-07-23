import { GAME_VERSION } from "./version";

/** Site root on GitHub Pages (also Vite `base` for the live build). */
export const PAGES_ROOT = "/racer-online/";

/** Client-side gate for the version switcher (not a real security boundary). */
const VERSION_SWITCH_PASSWORD = "ubVNyw8hge8i*QUiG2Ym";

export type PlayableVersion = {
  /** Two-part id matching GAME_VERSION, e.g. `1.4` */
  id: string;
  /** Absolute path under the host, e.g. `/racer-online/` or `/racer-online/v1.4/` */
  path: string;
};

type VersionsManifest = {
  versions?: Array<{ id?: unknown; path?: unknown; url?: unknown }>;
};

function normalizePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return PAGES_ROOT;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).pathname.replace(/\/?$/, "/") || "/";
    }
  } catch {
    /* treat as path */
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/?$/, "/") || "/";
}

function parseManifest(data: unknown): PlayableVersion[] {
  if (!data || typeof data !== "object") return [];
  const list = (data as VersionsManifest).versions;
  if (!Array.isArray(list)) return [];
  const out: PlayableVersion[] = [];
  const seen = new Set<string>();
  for (const row of list) {
    const id = String(row?.id ?? "").trim();
    const pathRaw = String(row?.path ?? row?.url ?? "").trim();
    if (!id || !pathRaw || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, path: normalizePath(pathRaw) });
  }
  return out;
}

/** Ensure the build running now is always listed, even if the manifest is stale. */
export function ensureCurrentVersion(versions: PlayableVersion[]): PlayableVersion[] {
  const base = normalizePath(import.meta.env.BASE_URL || PAGES_ROOT);
  if (versions.some((v) => v.id === GAME_VERSION)) return versions;
  return [{ id: GAME_VERSION, path: base }, ...versions];
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Load playable builds from the shared registry.
 * Prefers the live site root manifest so older `/vX.Y/` snapshots still see new releases.
 */
export async function loadPlayableVersions(): Promise<PlayableVersion[]> {
  const base = normalizePath(import.meta.env.BASE_URL || PAGES_ROOT);
  const candidates = [
    `${PAGES_ROOT}versions.json`,
    `${base}versions.json`,
    new URL("versions.json", location.href).href,
  ];

  for (const url of candidates) {
    const data = await fetchJson(url);
    const parsed = parseManifest(data);
    if (parsed.length) return ensureCurrentVersion(parsed);
  }

  return ensureCurrentVersion([]);
}

export function versionHref(path: string): string {
  return new URL(normalizePath(path), location.origin).href;
}

export function isCurrentVersion(v: PlayableVersion): boolean {
  return v.id === GAME_VERSION;
}

/**
 * Wire: badge click → password modal → on success → version menu → navigate on pick.
 * Escape / cancel closes without switching. Wrong password stays on the gate.
 */
export function initVersionSwitcher(): void {
  const badge = document.getElementById("version-badge");
  const menu = document.getElementById("version-menu");
  const gate = document.getElementById("version-gate");
  const form = document.getElementById("version-gate-form");
  const input = document.getElementById("version-gate-input");
  const errorEl = document.getElementById("version-gate-error");
  const cancelBtn = document.getElementById("version-gate-cancel");

  if (
    !(badge instanceof HTMLButtonElement) ||
    !(menu instanceof HTMLElement) ||
    !(gate instanceof HTMLElement) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLInputElement) ||
    !(errorEl instanceof HTMLElement) ||
    !(cancelBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  badge.textContent = `v${GAME_VERSION}`;
  badge.setAttribute("aria-expanded", "false");

  let unlocked = false;

  const closeMenu = () => {
    menu.classList.add("hidden");
    badge.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    menu.classList.remove("hidden");
    badge.setAttribute("aria-expanded", "true");
  };

  const closeGate = () => {
    gate.classList.add("hidden");
    input.value = "";
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  };

  const openGate = () => {
    closeMenu();
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    input.value = "";
    gate.classList.remove("hidden");
    requestAnimationFrame(() => input.focus());
  };

  const render = (versions: PlayableVersion[]) => {
    menu.replaceChildren();
    for (const v of versions) {
      const current = isCurrentVersion(v);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "version-menu-item" + (current ? " is-current" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", current ? "true" : "false");
      btn.dataset.versionId = v.id;
      btn.textContent = current ? `v${v.id} · playing` : `v${v.id}`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (current) {
          closeMenu();
          return;
        }
        location.assign(versionHref(v.path));
      });
      menu.appendChild(btn);
    }
  };

  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!unlocked) {
      openGate();
      return;
    }
    if (menu.classList.contains("hidden")) openMenu();
    else closeMenu();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === VERSION_SWITCH_PASSWORD) {
      unlocked = true;
      closeGate();
      openMenu();
      return;
    }
    unlocked = false;
    errorEl.textContent = "Wrong password";
    errorEl.classList.remove("hidden");
    input.select();
  });

  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeGate();
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Node)) return;

    if (!gate.classList.contains("hidden")) {
      const panel = gate.querySelector(".version-gate-panel");
      if (panel instanceof HTMLElement && !panel.contains(t) && !badge.contains(t)) {
        closeGate();
      }
      return;
    }

    if (menu.classList.contains("hidden")) return;
    if (menu.contains(t) || badge.contains(t)) return;
    closeMenu();
  });

  // Capture so Escape closes gate/menu without toggling pause.
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      if (!gate.classList.contains("hidden")) {
        e.stopPropagation();
        e.preventDefault();
        closeGate();
        badge.focus();
        return;
      }
      if (!menu.classList.contains("hidden")) {
        e.stopPropagation();
        e.preventDefault();
        closeMenu();
        badge.focus();
      }
    },
    true,
  );

  void loadPlayableVersions().then(render);
}
