import * as THREE from "three";
import { createCar } from "../car";
import { NET_TICK_MS, type PlayerPose, type ServerMsg } from "./protocol";

type Snapshot = { at: number; pose: PlayerPose };

/** Remote racer — render-interpolated, never blocks the local sim. */
export class RemotePlayer {
  readonly id: string;
  name: string;
  mesh: THREE.Group;
  private from: Snapshot | null = null;
  private to: Snapshot | null = null;
  label: HTMLDivElement;

  constructor(pose: PlayerPose, scene: THREE.Scene, labelRoot: HTMLElement) {
    this.id = pose.id;
    this.name = pose.name;
    this.mesh = createCar(pose.color, Math.abs(pose.id.charCodeAt(0) % 90) + 10);
    this.mesh.position.set(pose.x, 0, pose.z);
    this.mesh.rotation.y = pose.h;
    scene.add(this.mesh);

    this.label = document.createElement("div");
    this.label.className = "player-tag";
    this.label.textContent = pose.name;
    labelRoot.appendChild(this.label);

    this.push(pose, performance.now());
  }

  /** Latest reported lap (current lap number, 1-based like the local HUD). */
  get lap(): number | undefined {
    return this.to?.pose.lap;
  }

  push(pose: PlayerPose, at = performance.now()) {
    this.name = pose.name;
    this.label.textContent = pose.name;
    this.from = this.to ?? { at, pose: { ...pose } };
    this.to = { at, pose: { ...pose } };
  }

  /** Interpolate between last two snapshots for smooth 60fps motion. */
  update(now: number, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    if (!this.to) return;
    const prev = this.from ?? this.to;
    const next = this.to;
    const span = Math.max(NET_TICK_MS, next.at - prev.at);
    // Render slightly in the past for smoother interp
    const renderAt = now - NET_TICK_MS * 1.25;
    let t = (renderAt - prev.at) / span;
    t = Math.min(1.25, Math.max(0, t));

    const a = prev.pose;
    const b = next.pose;
    const x = a.x + (b.x - a.x) * Math.min(1, t);
    const z = a.z + (b.z - a.z) * Math.min(1, t);
    let dh = b.h - a.h;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const h = a.h + dh * Math.min(1, t);

    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.order = "YXZ";
    this.mesh.rotation.y = h;
    this.mesh.rotation.z = 0;
    this.mesh.rotation.x = 0;

    // Project name tag
    const v = new THREE.Vector3(x, 2.2, z).project(camera);
    const w = renderer.domElement.clientWidth;
    const ht = renderer.domElement.clientHeight;
    if (v.z > 1) {
      this.label.style.display = "none";
    } else {
      this.label.style.display = "block";
      this.label.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * ht}px)`;
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.label.remove();
  }
}

export type NetHandlers = {
  onWelcome: (id: string, room: string, players: PlayerPose[], you: PlayerPose) => void;
  onJoin: (player: PlayerPose) => void;
  onLeave: (id: string) => void;
  onState: (players: PlayerPose[]) => void;
  onError: (message: string) => void;
  onStatus: (text: string) => void;
};

export class NetClient {
  private ws: WebSocket | null = null;
  private myId = "";
  private sendAcc = 0;
  private pingAt = 0;
  private handlers: NetHandlers;
  latency = 0;
  connected = false;
  room = "";

  constructor(handlers: NetHandlers) {
    this.handlers = handlers;
  }

  connect(name: string, room = "circuit") {
    this.disconnect();
    const proto = location.protocol === "https:" ? "wss" : "ws";
    // Prefer dedicated WS port in local dev (avoids flaky Vite HMR proxy upgrades)
    const direct =
      location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? `${proto}://${location.hostname}:8787`
        : null;
    const proxied = `${proto}://${location.host}/ws`;
    const url =
      (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_WS_URL ||
      direct ||
      proxied;

    this.handlers.onStatus("Connecting…");
    this.openSocket(url, name, room, proxied !== url ? proxied : null);
  }

  private openSocket(url: string, name: string, room: string, fallback: string | null) {
    const ws = new WebSocket(url);
    this.ws = ws;
    let settled = false;

    ws.onopen = () => {
      settled = true;
      this.connected = true;
      this.handlers.onStatus("Joining room…");
      ws.send(JSON.stringify({ t: "join", name, room }));
      this.pingAt = performance.now();
      ws.send(JSON.stringify({ t: "ping", n: this.pingAt }));
    };

    ws.onmessage = (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMsg;
      } catch {
        return;
      }

      if (msg.t === "welcome") {
        this.myId = msg.id;
        this.room = msg.room;
        this.handlers.onStatus(`Online · ${msg.room}`);
        this.handlers.onWelcome(msg.id, msg.room, msg.players, msg.you);
      } else if (msg.t === "join") {
        this.handlers.onJoin(msg.player);
      } else if (msg.t === "leave") {
        this.handlers.onLeave(msg.id);
      } else if (msg.t === "state") {
        this.handlers.onState(msg.players);
      } else if (msg.t === "pong") {
        this.latency = Math.max(0, performance.now() - msg.n);
      } else if (msg.t === "error") {
        this.handlers.onError(msg.message);
        this.handlers.onStatus(msg.message);
      }
    };

    ws.onclose = () => {
      this.connected = false;
      if (!settled && fallback) {
        this.handlers.onStatus("Retrying via proxy…");
        this.openSocket(fallback, name, room, null);
        return;
      }
      this.handlers.onStatus("Disconnected");
    };

    ws.onerror = () => {
      if (!settled && fallback) return; // onclose will retry
      this.handlers.onStatus("Connection failed — run npm run server");
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.myId = "";
  }

  get id() {
    return this.myId;
  }

  /** Call from render loop; only sends at ~20Hz. */
  maybeSendPose(
    dt: number,
    pose: { x: number; z: number; h: number; s: number; g: string; lap: number },
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.myId) return;
    this.sendAcc += dt * 1000;
    if (this.sendAcc < NET_TICK_MS) return;
    this.sendAcc = 0;
    this.ws.send(
      JSON.stringify({
        t: "pose",
        x: +pose.x.toFixed(3),
        z: +pose.z.toFixed(3),
        h: +pose.h.toFixed(4),
        s: +pose.s.toFixed(3),
        g: pose.g,
        lap: pose.lap,
      }),
    );
  }

  ping() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const n = performance.now();
    this.ws.send(JSON.stringify({ t: "ping", n }));
  }
}
