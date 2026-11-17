import { gameWsUrl } from "./wsUrl";

type Screen = "scan" | "menu" | "drive";

const held = { throttle: 0, brake: 0, handbrake: 0, shift: 0 as -1 | 0 | 1, pause: false };
let steer = 0;
let steerTarget = 0;
let ws: WebSocket | null = null;
let driveTimer: ReturnType<typeof setInterval> | null = null;
let scanTimer = 0;
let scanStream: MediaStream | null = null;
let ping: ReturnType<typeof setInterval> | null = null;
let code = "";
let endNote = "";

/** Phone page. No game engine — this device is the controller. */
export function startPhonePad(initialCode: string) {
  document.documentElement.classList.add("phone-pad");
  wireScan();
  wireMenu();
  wireDrive();
  const next = initialCode.trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(next)) join(next);
  else show("scan");
}

function show(next: Screen) {
  for (const id of ["phone-scan", "phone-menu", "phone-drive"] as const) {
    document.getElementById(id)?.classList.toggle("hidden", id !== `phone-${next}`);
  }
  if (next === "drive") startDriveLoop();
  else stopDriveLoop();
}

function setStatus(text: string) {
  for (const id of ["phone-scan-status", "phone-menu-status", "phone-drive-status"]) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

function join(next: string) {
  code = next;
  stopScan();
  const url = gameWsUrl();
  if (!url) {
    show("scan");
    setStatus("Can’t reach the game server");
    return;
  }
  show("menu");
  setStatus("Linking…");
  ws?.close();
  const socket = new WebSocket(url);
  ws = socket;
  socket.addEventListener("open", () => {
    if (ws !== socket) return;
    send({ t: "pad-join", code });
    if (ping) clearInterval(ping);
    ping = setInterval(() => send({ t: "ping", n: Date.now() }), 8000);
  });
  socket.addEventListener("message", (ev) => {
    if (ws !== socket || typeof ev.data !== "string") return;
    onMessage(ev.data);
  });
  socket.addEventListener("close", () => {
    if (ws !== socket) return;
    ws = null;
    if (ping) clearInterval(ping);
    ping = null;
    stopDriveLoop();
    show("scan");
    setStatus(endNote || "Link closed — scan again");
    endNote = "";
  });
  socket.addEventListener("error", () => {
    if (ws === socket) setStatus("Can’t reach the game server");
  });
}

function onMessage(raw: string) {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }
  if (msg.t === "pad-joined") {
    setStatus("Linked");
    show("menu");
    return;
  }
  if (msg.t === "pad-screen") {
    show(msg.screen === "drive" ? "drive" : "menu");
    setStatus(msg.screen === "drive" ? "Tilt to steer" : "Linked");
    return;
  }
  if (msg.t === "pad-error" || msg.t === "pad-end") {
    endNote = typeof msg.message === "string" ? msg.message : "Link closed";
    ws?.close();
    return;
  }
}

function send(msg: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function wireMenu() {
  document.querySelectorAll<HTMLButtonElement>("#phone-menu [data-pad]").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const key = btn.dataset.pad;
      if (!key) return;
      send({ t: "pad-menu", key });
    });
  });
}

function wireDrive() {
  hold(document.getElementById("phone-gas"), (on) => {
    held.throttle = on ? 1 : 0;
  });
  hold(document.getElementById("phone-brake"), (on) => {
    held.brake = on ? 1 : 0;
  });
  hold(document.getElementById("phone-drift"), (on) => {
    held.handbrake = on ? 1 : 0;
  });
  document.getElementById("phone-shift")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    held.shift = 1;
  });
  document.getElementById("phone-shift-down")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    held.shift = -1;
  });
  document.getElementById("phone-pause")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    held.pause = true;
  });
  document.getElementById("phone-tilt-btn")?.addEventListener("click", () => {
    void enableTilt();
  });
  listenTilt();
}

function hold(el: HTMLElement | null, set: (on: boolean) => void) {
  if (!el) return;
  const down = (e: PointerEvent) => {
    e.preventDefault();
    el.classList.add("is-held");
    set(true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* already gone */
    }
  };
  const up = () => {
    el.classList.remove("is-held");
    set(false);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}

function listenTilt() {
  window.addEventListener("deviceorientation", (e) => {
    const next = steerFromTilt(e);
    if (next == null) return;
    steerTarget = next;
    document.getElementById("phone-tilt-btn")?.classList.add("hidden");
  });
}

async function enableTilt() {
  const ask = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  try {
    if (typeof ask.requestPermission === "function") {
      const result = await ask.requestPermission();
      if (result !== "granted") {
        setStatus("Tilt stays off until you allow motion");
        return;
      }
    }
    document.getElementById("phone-tilt-btn")?.classList.add("hidden");
    setStatus("Tilt to steer");
  } catch {
    setStatus("This phone blocked tilt");
  }
}

function steerFromTilt(e: DeviceOrientationEvent): number | null {
  if (e.gamma == null && e.beta == null) return null;
  const gamma = e.gamma ?? 0;
  const beta = e.beta ?? 0;
  const type = screenOrientation();
  let tilt: number;
  if (type === "landscape-primary") tilt = -beta;
  else if (type === "landscape-secondary") tilt = beta;
  else tilt = -gamma;
  const dead = 5;
  const full = 30;
  const mag = Math.abs(tilt);
  if (mag <= dead) return 0;
  const n = Math.min(1, (mag - dead) / (full - dead));
  return Math.sign(tilt) * n * n;
}

function screenOrientation(): string {
  return globalThis.screen.orientation?.type ?? "";
}

function startDriveLoop() {
  if (driveTimer != null) return;
  const needsAsk = typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
    .requestPermission === "function";
  document.getElementById("phone-tilt-btn")?.classList.toggle("hidden", !needsAsk);
  driveTimer = setInterval(() => {
    steer += (steerTarget - steer) * 0.45;
    const puck = document.getElementById("phone-wheel-puck");
    if (puck) puck.style.transform = `translateX(${steer * 72}px)`;
    send({
      t: "pad-drive",
      steer,
      throttle: held.throttle,
      brake: held.brake,
      handbrake: held.handbrake,
      shift: held.shift,
      pause: held.pause,
    });
    held.shift = 0;
    held.pause = false;
  }, 33);
}

function stopDriveLoop() {
  if (driveTimer != null) clearInterval(driveTimer);
  driveTimer = null;
  held.throttle = 0;
  held.brake = 0;
  held.handbrake = 0;
  held.shift = 0;
  held.pause = false;
  steer = 0;
  steerTarget = 0;
}

function wireScan() {
  document.getElementById("phone-scan-btn")?.addEventListener("click", () => {
    void startScan();
  });
  document.getElementById("phone-code-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("phone-code-input");
    const typed = input instanceof HTMLInputElement ? input.value : "";
    const next = typed.trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(next)) join(next);
    else setStatus("Enter the 6-character code under the QR");
  });
}

async function startScan() {
  stopScan();
  const video = document.getElementById("phone-scan-video");
  if (!(video instanceof HTMLVideoElement)) return;
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch {
    setStatus("Camera blocked — type the code instead");
    return;
  }
  video.srcObject = scanStream;
  video.classList.remove("hidden");
  await video.play().catch(() => undefined);
  setStatus("Point the camera at the QR code");

  const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  let detector: { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null = null;
  if (Detector) {
    try {
      detector = new Detector({ formats: ["qr_code"] });
    } catch {
      detector = null;
    }
  }
  let decode: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;
  if (!detector) {
    try {
      const mod = await import("jsqr");
      decode = mod.default;
    } catch {
      decode = null;
    }
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const tick = async () => {
    if (!scanStream) return;
    await readFrame();
    if (scanStream) scanTimer = requestAnimationFrame(() => void tick());
  };
  const readFrame = async () => {
    if (!scanStream) return;
    let text = "";
    if (detector) {
      try {
        const hits = await detector.detect(video);
        text = hits[0]?.rawValue ?? "";
      } catch {
        text = "";
      }
    } else if (decode && ctx && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      text = decode(frame.data, frame.width, frame.height)?.data ?? "";
    }
    const found = parsePad(text);
    if (found) join(found);
  };
  scanTimer = requestAnimationFrame(tick);
}

function stopScan() {
  if (scanTimer) cancelAnimationFrame(scanTimer);
  scanTimer = 0;
  scanStream?.getTracks().forEach((track) => track.stop());
  scanStream = null;
  const video = document.getElementById("phone-scan-video");
  if (video instanceof HTMLVideoElement) {
    video.classList.add("hidden");
    video.srcObject = null;
  }
}

function parsePad(text: string): string | null {
  if (!text) return null;
  try {
    const url = new URL(text);
    const pad = url.searchParams.get("pad") || "";
    if (/^[A-Z0-9]{6}$/i.test(pad)) {
      if (url.origin !== location.origin) {
        location.href = url.href;
        return null;
      }
      return pad.toUpperCase();
    }
  } catch {
    /* a bare code, not a URL */
  }
  const bare = text.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(bare) ? bare : null;
}
