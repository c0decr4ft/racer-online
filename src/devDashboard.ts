import { fetchFeedback, type FeedbackMessage } from "./net/feedback";
import { fetchPresence, type PresenceBucket, type PresenceSnapshot } from "./net/presence";
import {
  isCurrentVersion,
  loadPlayableVersions,
  type PlayableVersion,
  versionHref,
} from "./versions";

const POLL_MS = 8_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let versionsLoaded = false;

function formatWhen(ms: number): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatBucketLabel(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/.exec(key);
  if (!m) return key;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}h`;
}

/** Simple SVG line chart — no chart library. */
function renderActivityChart(svg: SVGSVGElement, buckets: PresenceBucket[]): void {
  const W = 560;
  const H = 160;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(W));
  bg.setAttribute("height", String(H));
  bg.setAttribute("fill", "rgba(255,255,255,0.03)");
  svg.appendChild(bg);

  if (!buckets.length) {
    const empty = document.createElementNS("http://www.w3.org/2000/svg", "text");
    empty.setAttribute("x", String(W / 2));
    empty.setAttribute("y", String(H / 2));
    empty.setAttribute("text-anchor", "middle");
    empty.setAttribute("fill", "rgba(168,180,196,0.9)");
    empty.setAttribute("font-size", "13");
    empty.setAttribute("font-family", "Rajdhani, sans-serif");
    empty.textContent = "No human activity yet — browser heartbeats will fill this in";
    svg.appendChild(empty);
    return;
  }

  // Prefer last 48 hours if we have more; otherwise all kept buckets
  const cutoff = Date.now() - 48 * 3_600_000;
  let series = buckets.filter((b) => b.at >= cutoff);
  if (series.length < 2) series = buckets.slice(-48);

  const maxY = Math.max(1, ...series.map((b) => b.count));
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xAt = (i: number) => padL + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
  const yAt = (v: number) => padT + plotH - (v / maxY) * plotH;

  // Grid + y labels
  for (const frac of [0, 0.5, 1]) {
    const y = yAt(maxY * frac);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(padL));
    line.setAttribute("x2", String(W - padR));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "rgba(255,255,255,0.08)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(padL - 6));
    label.setAttribute("y", String(y + 3));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("fill", "rgba(168,180,196,0.85)");
    label.setAttribute("font-size", "10");
    label.setAttribute("font-family", "Rajdhani, sans-serif");
    label.textContent = String(Math.round(maxY * frac));
    svg.appendChild(label);
  }

  const points = series.map((b, i) => `${xAt(i).toFixed(1)},${yAt(b.count).toFixed(1)}`).join(" ");

  const area = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  area.setAttribute(
    "points",
    `${xAt(0).toFixed(1)},${(padT + plotH).toFixed(1)} ${points} ${xAt(series.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)}`,
  );
  area.setAttribute("fill", "rgba(255, 59, 46, 0.14)");
  area.setAttribute("stroke", "none");
  svg.appendChild(area);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  path.setAttribute("points", points);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#ff3b2e");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);

  // Sparse x labels
  const labelIdx = new Set<number>([0, series.length - 1]);
  if (series.length > 4) {
    labelIdx.add(Math.floor(series.length / 2));
    labelIdx.add(Math.floor(series.length / 4));
    labelIdx.add(Math.floor((3 * series.length) / 4));
  }
  for (const i of labelIdx) {
    const b = series[i];
    if (!b) continue;
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(xAt(i)));
    label.setAttribute("y", String(H - 8));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "rgba(168,180,196,0.85)");
    label.setAttribute("font-size", "9");
    label.setAttribute("font-family", "Rajdhani, sans-serif");
    label.textContent = formatBucketLabel(b.key);
    svg.appendChild(label);
  }
}

function renderFeedbackList(list: HTMLElement, messages: FeedbackMessage[]): void {
  list.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement("li");
    empty.className = "dev-feedback-empty";
    empty.textContent = "No feedback yet";
    list.appendChild(empty);
    return;
  }
  for (const msg of messages) {
    const li = document.createElement("li");
    li.className = "dev-feedback-item";

    const meta = document.createElement("div");
    meta.className = "dev-feedback-meta";
    const who = document.createElement("span");
    who.className = "dev-feedback-who";
    who.textContent = msg.name || "Anonymous";
    const when = document.createElement("span");
    when.className = "dev-feedback-when";
    when.textContent = formatWhen(msg.createdAt);
    meta.append(who, when);

    const body = document.createElement("p");
    body.className = "dev-feedback-text";
    body.textContent = msg.text;

    li.append(meta, body);
    list.appendChild(li);
  }
}

function renderVersions(root: HTMLElement, versions: PlayableVersion[]): void {
  root.replaceChildren();
  for (const v of versions) {
    const current = isCurrentVersion(v);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dev-version-btn" + (current ? " is-current" : "");
    btn.textContent = current ? `v${v.id} · playing` : `v${v.id}`;
    btn.disabled = current;
    if (!current) {
      btn.addEventListener("click", () => {
        location.assign(versionHref(v.path));
      });
    }
    root.appendChild(btn);
  }
}

function applyPresence(snap: PresenceSnapshot): void {
  const nowEl = document.getElementById("dev-players-now");
  const sourceEl = document.getElementById("dev-activity-source");
  const svg = document.getElementById("dev-activity-chart");
  if (nowEl) nowEl.textContent = String(snap.now);
  if (sourceEl instanceof HTMLElement) {
    if (snap.source === "local") {
      sourceEl.textContent = "Offline — start the game server (npm start) for live counts";
    } else {
      const racing =
        snap.racing != null && snap.racing > 0 ? ` · ${snap.racing} in multiplayer rooms` : "";
      const via = snap.source === "server" ? "game server" : "worldwide store";
      sourceEl.textContent = `Updated ${formatWhen(snap.updatedAt || Date.now())} via ${via} · humans only (1 tab = 1) · AI never counted${racing}`;
    }
  }
  if (svg instanceof SVGSVGElement) renderActivityChart(svg, snap.buckets);
}

async function refreshDashboard(): Promise<void> {
  const [presence, feedback] = await Promise.all([fetchPresence(), fetchFeedback()]);
  applyPresence(presence);
  const list = document.getElementById("dev-feedback-list");
  const fbSource = document.getElementById("dev-feedback-source");
  if (list instanceof HTMLElement) renderFeedbackList(list, feedback.messages);
  if (fbSource instanceof HTMLElement) {
    fbSource.textContent =
      feedback.source === "online"
        ? `${feedback.messages.length} message${feedback.messages.length === 1 ? "" : "s"} · live`
        : `${feedback.messages.length} message${feedback.messages.length === 1 ? "" : "s"} · local cache`;
  }
}

function stopPolling(): void {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(): void {
  stopPolling();
  pollTimer = setInterval(() => {
    if (document.getElementById("dev-dashboard")?.classList.contains("hidden")) {
      stopPolling();
      return;
    }
    void refreshDashboard();
  }, POLL_MS);
}

export function closeDevDashboard(): void {
  const dash = document.getElementById("dev-dashboard");
  dash?.classList.add("hidden");
  document.getElementById("version-badge")?.setAttribute("aria-expanded", "false");
  stopPolling();
}

export function isDevDashboardOpen(): boolean {
  const dash = document.getElementById("dev-dashboard");
  return !!dash && !dash.classList.contains("hidden");
}

/** Open the developer screen and start polling presence + feedback. */
export function openDevDashboard(): void {
  const dash = document.getElementById("dev-dashboard");
  if (!(dash instanceof HTMLElement)) return;
  dash.classList.remove("hidden");
  void refreshDashboard();
  startPolling();

  if (!versionsLoaded) {
    versionsLoaded = true;
    const root = document.getElementById("dev-version-list");
    if (root instanceof HTMLElement) {
      void loadPlayableVersions().then((versions) => renderVersions(root, versions));
    }
  }
}

export function initDevDashboard(): void {
  const closeBtn = document.getElementById("dev-dashboard-close");
  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeDevDashboard();
  });

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      if (!isDevDashboardOpen()) return;
      // Let version gate / feedback modal handle Escape first if they are open
      const gate = document.getElementById("version-gate");
      const compose = document.getElementById("feedback-compose");
      if (gate && !gate.classList.contains("hidden")) return;
      if (compose && !compose.classList.contains("hidden")) return;
      e.stopPropagation();
      e.preventDefault();
      closeDevDashboard();
    },
    true,
  );
}
