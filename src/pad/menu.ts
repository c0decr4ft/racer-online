const FOCUS = "pad-focus";

export type PadMenuKey = "up" | "down" | "left" | "right" | "ok" | "back" | "race" | "garage";

function shown(el: HTMLElement): boolean {
  if (el.closest(".hidden")) return false;
  const box = el.getBoundingClientRect();
  return box.width > 2 && box.height > 2;
}

function rows(): HTMLButtonElement[][] {
  const roots = [...document.querySelectorAll<HTMLElement>(".overlay, [role='dialog']")].filter((el) => {
    if (el.id === "phone-link" || el.id === "mobile-gate") return false;
    return shown(el);
  });
  const root = roots.at(-1);
  if (!root) return [];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>("button")].filter((btn) => {
    if (btn.disabled || btn.getAttribute("aria-hidden") === "true") return false;
    if (btn.closest("#phone-link, #mobile-gate")) return false;
    return shown(btn);
  });
  buttons.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (Math.abs(ra.top - rb.top) > 22) return ra.top - rb.top;
    return ra.left - rb.left;
  });
  const grouped: HTMLButtonElement[][] = [];
  for (const btn of buttons) {
    const top = btn.getBoundingClientRect().top;
    const row = grouped[grouped.length - 1];
    if (row && Math.abs(row[0]!.getBoundingClientRect().top - top) <= 22) row.push(btn);
    else grouped.push([btn]);
  }
  return grouped;
}

let current: HTMLButtonElement | null = null;

function setFocus(btn: HTMLButtonElement) {
  document.querySelectorAll(`.${FOCUS}`).forEach((el) => el.classList.remove(FOCUS));
  current = btn;
  btn.classList.add(FOCUS);
}

export function clearPadFocus() {
  document.querySelectorAll(`.${FOCUS}`).forEach((el) => el.classList.remove(FOCUS));
  current = null;
}

function clickIfShown(id: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLButtonElement && shown(el)) el.click();
}

export function handlePadMenu(key: PadMenuKey) {
  if (key === "race") {
    clickIfShown("start-btn");
    return;
  }
  if (key === "garage") {
    clickIfShown("home-garage-btn");
    return;
  }
  if (key === "back") {
    const back = rows()
      .flat()
      .find((btn) => /back/i.test(btn.textContent || "") || /back/i.test(btn.id));
    back?.click();
    return;
  }
  if (key === "ok") {
    const live = current && document.contains(current) && shown(current) ? current : rows()[0]?.[0];
    if (!live) return;
    setFocus(live);
    live.click();
    return;
  }
  const grid = rows();
  if (!grid.length) return;
  if (!current || !document.contains(current)) {
    const first = grid[0]?.[0];
    if (first) setFocus(first);
    return;
  }
  let r = 0;
  let c = 0;
  for (let i = 0; i < grid.length; i++) {
    const j = grid[i]!.indexOf(current);
    if (j >= 0) {
      r = i;
      c = j;
      break;
    }
  }
  if (key === "left") c -= 1;
  if (key === "right") c += 1;
  if (key === "up") r -= 1;
  if (key === "down") r += 1;
  r = Math.max(0, Math.min(grid.length - 1, r));
  const row = grid[r]!;
  c = Math.max(0, Math.min(row.length - 1, c));
  const next = row[c];
  if (next) setFocus(next);
}
