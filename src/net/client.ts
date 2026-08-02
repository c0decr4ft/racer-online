import * as THREE from "three";
import { createVehicle } from "../car";
import type { VehicleKind } from "../garage";
import {
  NET_TICK_MS,
  type LobbyPhase,
  type NetVehicleKind,
  type PlayerPose,
  type ServerMsg,
} from "./protocol";
import { configuredApiBase, configuredWsUrl, sameOriginOnline } from "./onlineConfig";

type Snapshot = { at: number; pose: PlayerPose };

function poseKind(pose: PlayerPose): VehicleKind {
  return pose.kind === "bike" ? "bike" : "car";
}

/** Remote racer — render-interpolated, never blocks the local sim. */
export class RemotePlayer {
  readonly id: string;
  name: string;
  kind: VehicleKind;
  mesh: THREE.Group;
  private from: Snapshot | null = null;
  private to: Snapshot | null = null;
  label: HTMLDivElement;
  private scene: THREE.Scene;
  private color: number;
  private accent: number;

  constructor(pose: PlayerPose, scene: THREE.Scene, labelRoot: HTMLElement) {
    this.id = pose.id;
    this.name = pose.name;
    this.kind = poseKind(pose);
    this.color = pose.color;
    this.accent = pose.accent ?? 0xff3b2e;
    this.scene = scene;
    this.mesh = createVehicle(
      this.kind,
      pose.color,
      Math.abs(pose.id.charCodeAt(0) % 90) + 10,
      this.accent,
    );
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

  private rebuildMesh(kind: VehicleKind, color: number, accent: number) {
    this.scene.remove(this.mesh);
    this.mesh = createVehicle(kind, color, Math.abs(this.id.charCodeAt(0) % 90) + 10, accent);
    this.scene.add(this.mesh);
    this.kind = kind;
    this.color = color;
    this.accent = accent;
  }

  push(pose: PlayerPose, at = performance.now()) {
    this.name = pose.name;
    this.label.textContent = pose.name;
    const nextKind = poseKind(pose);
    const nextColor = pose.color ?? this.color;
    const nextAccent = pose.accent ?? this.accent;
    if (nextKind !== this.kind || nextColor !== this.color || nextAccent !== this.accent) {
      this.rebuildMesh(nextKind, nextColor, nextAccent);
    }
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

export type WelcomeInfo = {
  id: string;
  room: string;
  players: PlayerPose[];
  you: PlayerPose;
  hostId: string;
  trackId: string;
  kind: NetVehicleKind;
  maxPlayers: number;
  phase: LobbyPhase;
};

export type NetHandlers = {
  onWelcome: (info: WelcomeInfo) => void;
  onJoin: (player: PlayerPose) => void;
  onLeave: (id: string, hostId?: string) => void;
  onNotice: (text: string) => void;
  onLobby: (info: {
    players: PlayerPose[];
    trackId: string;
    kind: NetVehicleKind;
    hostId: string;
    maxPlayers: number;
  }) => void;
  onStart: (at: number, trackId: string, kind: NetVehicleKind) => void;
  onState: (players: PlayerPose[]) => void;
  onError: (message: string) => void;
  onStatus: (text: string) => void;
};

export type RoomConnectOpts = {
  name: string;
  room: string;
  password?: string;
  /** Host-only on create — ignored for join (server forces room kind). */
  kind?: NetVehicleKind;
  color?: number;
  accent?: number;
  maxPlayers?: number;
  trackId?: string;
  mode: "create" | "join";
};

export class NetClient {
  private ws: WebSocket | null = null;
  private myId = "";
  private sendAcc = 0;
  private pingAt = 0;
  private handlers: NetHandlers;
  private pending: RoomConnectOpts | null = null;
  latency = 0;
  connected = false;
  room = "";
  hostId = "";
  trackId = "";
  /** Room vehicle class — set by host at create, forced for everyone. */
  kind: NetVehicleKind = "car";
  maxPlayers = 8;
  phase: LobbyPhase | "" = "";
  /** Bumps on each connect/disconnect so stale socket handlers are ignored. */
  private connGen = 0;

  constructor(handlers: NetHandlers) {
    this.handlers = handlers;
  }

  createRoom(opts: Omit<RoomConnectOpts, "mode">) {
    this.connect({ ...opts, mode: "create" });
  }

  joinRoom(opts: Omit<RoomConnectOpts, "mode" | "maxPlayers" | "trackId" | "kind">) {
    this.connect({ ...opts, mode: "join" });
  }

  private connect(opts: RoomConnectOpts) {
    this.disconnect();
    this.pending = opts;
    const gen = ++this.connGen;

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const local =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    // Prefer dedicated WS port in local dev (avoids flaky Vite HMR proxy upgrades)
    const direct = local ? `${proto}://${location.hostname}:8787` : null;
    const proxied = local ? `${proto}://${location.host}/ws` : null;
    const hosted = configuredWsUrl();
    // Derive WS from API host when only apiBase is configured (Pages → cloud server).
    let fromApi: string | null = null;
    const api = configuredApiBase() || sameOriginOnline()?.apiBase || null;
    if (!hosted && api) {
      try {
        const u = new URL(api, location.href);
        fromApi = `${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}`;
      } catch {
        fromApi = null;
      }
    }
    const sameOrigin = sameOriginOnline()?.wsUrl ?? null;
    const url = hosted || fromApi || sameOrigin || direct || proxied;
    if (!url) {
      this.handlers.onStatus("Online server not configured — multiplayer needs a hosted game server");
      this.handlers.onError("Online server not configured");
      return;
    }

    this.handlers.onStatus(opts.mode === "create" ? "Creating room…" : "Joining room…");
    this.openSocket(url, opts, proxied && proxied !== url ? proxied : null, gen);
  }

  private openSocket(
    url: string,
    opts: RoomConnectOpts,
    fallback: string | null,
    gen: number,
  ) {
    if (gen !== this.connGen) return;
    const ws = new WebSocket(url);
    this.ws = ws;
    let settled = false;

    ws.onopen = () => {
      if (gen !== this.connGen || this.ws !== ws) {
        ws.close();
        return;
      }
      settled = true;
      this.connected = true;
      this.handlers.onStatus(opts.mode === "create" ? "Creating room…" : "Joining room…");
      const payload =
        opts.mode === "create"
          ? {
              t: "create" as const,
              name: opts.name,
              room: opts.room || "circuit",
              password: opts.password ?? "",
              maxPlayers: opts.maxPlayers,
              trackId: opts.trackId,
              kind: opts.kind === "bike" ? "bike" : "car",
              color: opts.color,
              accent: opts.accent,
            }
          : {
              t: "join" as const,
              name: opts.name,
              room: opts.room || "circuit",
              password: opts.password ?? "",
              color: opts.color,
              accent: opts.accent,
            };
      ws.send(JSON.stringify(payload));
      this.pingAt = performance.now();
      ws.send(JSON.stringify({ t: "ping", n: this.pingAt }));
    };

    ws.onmessage = (ev) => {
      if (gen !== this.connGen || this.ws !== ws) return;
      let msg: ServerMsg;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMsg;
      } catch {
        return;
      }

      if (msg.t === "welcome") {
        this.myId = msg.id;
        this.room = msg.room;
        this.hostId = msg.hostId;
        this.trackId = msg.trackId;
        this.kind = msg.kind === "bike" ? "bike" : "car";
        this.maxPlayers = msg.maxPlayers;
        this.phase = msg.phase;
        this.pending = null;
        this.handlers.onStatus(`Lobby · ${msg.room}`);
        this.handlers.onWelcome({
          id: msg.id,
          room: msg.room,
          players: msg.players,
          you: msg.you,
          hostId: msg.hostId,
          trackId: msg.trackId,
          kind: this.kind,
          maxPlayers: msg.maxPlayers,
          phase: msg.phase,
        });
      } else if (msg.t === "join") {
        this.handlers.onJoin(msg.player);
      } else if (msg.t === "leave") {
        if (msg.hostId) this.hostId = msg.hostId;
        this.handlers.onLeave(msg.id, msg.hostId);
      } else if (msg.t === "notice") {
        this.handlers.onNotice(msg.text);
      } else if (msg.t === "lobby") {
        this.hostId = msg.hostId;
        this.trackId = msg.trackId;
        this.kind = msg.kind === "bike" ? "bike" : "car";
        this.maxPlayers = msg.maxPlayers;
        this.handlers.onLobby(msg);
      } else if (msg.t === "start") {
        this.phase = "racing";
        this.trackId = msg.trackId;
        this.kind = msg.kind === "bike" ? "bike" : "car";
        this.handlers.onStart(msg.at, msg.trackId, this.kind);
      } else if (msg.t === "state") {
        this.handlers.onState(msg.players);
      } else if (msg.t === "pong") {
        this.latency = Math.max(0, performance.now() - msg.n);
      } else if (msg.t === "error") {
        this.handlers.onError(msg.message);
        this.handlers.onStatus(msg.message);
        // Drop the dead socket without a misleading "Disconnected" status.
        this.softClose(ws, gen);
      }
    };

    ws.onclose = () => {
      if (gen !== this.connGen || this.ws !== ws) return;
      this.connected = false;
      this.ws = null;
      if (!settled && fallback && this.pending) {
        this.handlers.onStatus("Retrying via proxy…");
        this.openSocket(fallback, this.pending, null, gen);
        return;
      }
      // Intentional leave / softClose already cleared pending + ids
      if (!this.myId && !this.pending) return;
      this.myId = "";
      this.hostId = "";
      this.phase = "";
      this.pending = null;
      this.handlers.onStatus("Disconnected");
    };

    ws.onerror = () => {
      if (gen !== this.connGen || this.ws !== ws) return;
      if (!settled && fallback) return; // onclose will retry
      this.handlers.onStatus("Connection failed — run npm start");
    };
  }

  /** Close a failed admit without bumping connGen or shouting Disconnected. */
  private softClose(ws: WebSocket, gen: number) {
    if (gen !== this.connGen || this.ws !== ws) return;
    this.connected = false;
    this.ws = null;
    this.pending = null;
    this.myId = "";
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }

  disconnect() {
    this.connGen++;
    const ws = this.ws;
    this.ws = null;
    this.connected = false;
    this.myId = "";
    this.hostId = "";
    this.trackId = "";
    this.kind = "car";
    this.maxPlayers = 8;
    this.phase = "";
    this.pending = null;
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
  }

  get id() {
    return this.myId;
  }

  get isHost() {
    return !!this.myId && this.myId === this.hostId;
  }

  /** Host-only: begin the race for everyone in the lobby. */
  startRace() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.myId) return;
    this.ws.send(JSON.stringify({ t: "start" }));
  }

  /** Call from render loop; only sends at ~20Hz during a live race. */
  maybeSendPose(
    dt: number,
    pose: {
      x: number;
      z: number;
      h: number;
      s: number;
      g: string;
      lap: number;
      kind?: NetVehicleKind;
      color?: number;
      accent?: number;
    },
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.myId) return;
    if (this.phase !== "racing") return;
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
        kind: pose.kind,
        color: pose.color,
        accent: pose.accent,
      }),
    );
  }

  ping() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const n = performance.now();
    this.ws.send(JSON.stringify({ t: "ping", n }));
  }
}
