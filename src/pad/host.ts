import { clearPadFocus, type PadMenuKey } from "./menu";
import { gameWsUrl } from "./wsUrl";

export type PhoneDrive = {
  steer: number;
  throttle: number;
  brake: number;
  handbrake: number;
  shift: -1 | 0 | 1;
  pause: boolean;
};

type PadHandlers = {
  onDrive: (drive: PhoneDrive) => void;
  onMenu: (key: PadMenuKey) => void;
  onStatus: (text: string) => void;
};

const MENU_KEYS = new Set(["up", "down", "left", "right", "ok", "back", "race", "garage"]);

/**
 * Desktop side of the phone controller. A separate socket from the race
 * connection, opened when the player asks for a QR code.
 */
export class PadHost {
  private ws: WebSocket | null = null;
  private screen: "menu" | "drive" = "menu";
  private linked = false;
  private wantOpen = false;
  private ping: ReturnType<typeof setInterval> | null = null;
  private code = "";
  private readonly handlers: PadHandlers;

  constructor(handlers: PadHandlers) {
    this.handlers = handlers;
    this.attach();
  }

  private attach() {
    const open = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element) || !target.closest("#phone-pad-btn")) return;
      e.preventDefault();
      e.stopPropagation();
      this.showModal();
    };
    document.addEventListener("click", open);
    document.getElementById("phone-link-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hideModal();
    });
    document.getElementById("phone-link-unlink")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.unlink();
    });
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape") return;
        const modal = document.getElementById("phone-link");
        if (!modal || modal.classList.contains("hidden")) return;
        e.preventDefault();
        e.stopPropagation();
        this.hideModal();
      },
      true,
    );
  }

  /** Tell the phone whether to show the menu pad or the steering wheel. */
  setScreen(screen: "menu" | "drive") {
    const changed = screen !== this.screen;
    this.screen = screen;
    if (changed && this.linked) this.send({ t: "pad-screen", screen });
    if (screen === "drive") this.hideModal();
  }

  private showModal() {
    document.getElementById("phone-link")?.classList.remove("hidden");
    this.wantOpen = true;
    if (!this.ws || this.ws.readyState > 1) this.connect();
    else this.paint();
  }

  /** Phone dropped or the socket died. QR screen again, button no longer "linked". */
  private showConnectScreen() {
    this.linked = false;
    this.setLinked(false);
    clearPadFocus();
    this.wantOpen = true;
    document.getElementById("phone-link")?.classList.remove("hidden");
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.code) {
      const codeEl = document.getElementById("phone-link-code");
      if (codeEl) codeEl.textContent = this.code;
      this.setStatus("Scan to play");
      return;
    }
    this.code = "";
    if (!this.ws || this.ws.readyState > 1) this.connect();
    else this.paint();
  }

  hideModal() {
    document.getElementById("phone-link")?.classList.add("hidden");
  }

  private unlink() {
    this.wantOpen = false;
    this.linked = false;
    this.code = "";
    this.stopPing();
    this.ws?.close();
    this.ws = null;
    clearPadFocus();
    this.setLinked(false);
    this.setStatus("Phone unlinked");
    const img = document.getElementById("phone-link-qr");
    if (img instanceof HTMLImageElement) img.removeAttribute("src");
    this.hideModal();
  }

  private connect() {
    const url = gameWsUrl();
    if (!url) {
      this.setStatus("Game server isn’t running — start it, then open this again");
      return;
    }
    this.setStatus("Connecting…");
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.addEventListener("open", () => {
      if (this.ws !== ws) return;
      this.send({ t: "pad-host" });
      this.stopPing();
      this.ping = setInterval(() => this.send({ t: "ping", n: Date.now() }), 8000);
    });
    ws.addEventListener("message", (ev) => {
      if (this.ws !== ws || typeof ev.data !== "string") return;
      this.onMessage(ev.data);
    });
    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.stopPing();
      const was = this.linked;
      const reopen = was || this.wantOpen;
      this.linked = false;
      this.code = "";
      this.setLinked(false);
      clearPadFocus();
      if (reopen) this.showConnectScreen();
      if (was) this.handlers.onStatus("Phone disconnected");
    });
    ws.addEventListener("error", () => {
      if (this.ws !== ws) return;
      this.setStatus("Can’t reach the game server");
    });
  }

  private onMessage(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (msg.t === "pad-ready" && typeof msg.code === "string") {
      this.code = msg.code;
      const lan = typeof msg.lanHost === "string" ? msg.lanHost : null;
      void this.paintQr(this.pageUrl(this.code, lan));
      this.setStatus("Scan to play");
      return;
    }
    if (msg.t === "pad-linked") {
      this.linked = true;
      this.setLinked(true);
      this.setStatus("Phone linked");
      this.handlers.onStatus("Phone linked — tilt it to steer");
      this.send({ t: "pad-screen", screen: this.screen });
      return;
    }
    if (msg.t === "pad-unlinked" || msg.t === "pad-end") {
      const was = this.linked;
      this.showConnectScreen();
      if (was) this.handlers.onStatus("Phone disconnected");
      return;
    }
    if (msg.t === "pad-menu" && typeof msg.key === "string" && MENU_KEYS.has(msg.key)) {
      this.handlers.onMenu(msg.key as PadMenuKey);
      return;
    }
    if (msg.t === "pad-drive") {
      const shift = msg.shift === 1 || msg.shift === -1 ? msg.shift : 0;
      this.handlers.onDrive({
        steer: axis(msg.steer, -1, 1),
        throttle: axis(msg.throttle, 0, 1),
        brake: axis(msg.brake, 0, 1),
        handbrake: axis(msg.handbrake, 0, 1),
        shift,
        pause: msg.pause === true,
      });
    }
  }

  private pageUrl(code: string, lanHost: string | null): string {
    const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const origin =
      local && lanHost
        ? `${location.protocol}//${lanHost}${location.port ? `:${location.port}` : ""}`
        : location.origin;
    const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
    return `${origin}${base}?pad=${encodeURIComponent(code)}`;
  }

  private async paintQr(url: string) {
    const img = document.getElementById("phone-link-qr");
    const codeEl = document.getElementById("phone-link-code");
    if (codeEl) codeEl.textContent = this.code;
    if (!(img instanceof HTMLImageElement)) return;
    try {
      const QRCode = await import("qrcode");
      img.src = await QRCode.toDataURL(url, { width: 280, margin: 1, errorCorrectionLevel: "M" });
      img.classList.remove("hidden");
    } catch {
      this.setStatus(url);
    }
  }

  private paint() {
    const codeEl = document.getElementById("phone-link-code");
    if (codeEl && this.code) codeEl.textContent = this.code;
    this.setStatus(this.linked ? "Phone linked" : this.code ? "Scan to play" : "Connecting…");
  }

  private setLinked(on: boolean) {
    document.getElementById("phone-pad-btn")?.classList.toggle("is-linked", on);
    document.getElementById("phone-link-unlink")?.classList.toggle("hidden", !on);
  }

  private setStatus(text: string) {
    const el = document.getElementById("phone-link-status");
    if (el) el.textContent = text;
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private stopPing() {
    if (this.ping != null) clearInterval(this.ping);
    this.ping = null;
  }
}

function axis(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}
