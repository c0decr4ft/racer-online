import * as THREE from "three";
import { createVehicle, disposeVehicleGroup, stripVehicleSpotLights } from "../car";
import type { VehicleKind } from "../garage";
import { VISUAL_RIDE_Y } from "../vehicle";
import {
  NET_TICK_MS,
  type LobbyPhase,
  type NetVehicleKind,
  type NetWeatherMode,
  type PlayerPose,
  type ServerMsg,
} from "./protocol";
import { applyWireWeather, normalizeWeatherMode } from "../weather";
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
  private readonly labelPoint = new THREE.Vector3();
  private lastVisualAt = 0;
  private labelX = Number.NaN;
  private labelY = Number.NaN;
  private labelVisible = true;

  constructor(pose: PlayerPose, scene: THREE.Scene, labelRoot: HTMLElement) {
    this.id = pose.id;
    this.name = pose.name;
    this.kind = poseKind(pose);
    this.color = pose.color;
    this.accent = pose.accent ?? 0xff3b2e;
    this.scene = scene;
    // No SpotLights — each client only renders its own local beams.
    this.mesh = createVehicle(
      this.kind,
      pose.color,
      Math.abs(pose.id.charCodeAt(0) % 90) + 10,
      this.accent,
    );
    stripVehicleSpotLights(this.mesh);
    this.mesh.position.set(pose.x, VISUAL_RIDE_Y, pose.z);
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
    disposeVehicleGroup(this.mesh);
    this.mesh = createVehicle(kind, color, Math.abs(this.id.charCodeAt(0) % 90) + 10, accent);
    stripVehicleSpotLights(this.mesh);
    this.scene.add(this.mesh);
    this.kind = kind;
    this.color = color;
    this.accent = accent;
  }

  push(pose: PlayerPose, at = performance.now()) {
    if (pose.name !== this.name) {
      this.name = pose.name;
      this.label.textContent = pose.name;
    }
    const nextKind = poseKind(pose);
    const nextColor = pose.color ?? this.color;
    const nextAccent = pose.accent ?? this.accent;
    if (nextKind !== this.kind || nextColor !== this.color || nextAccent !== this.accent) {
      this.rebuildMesh(nextKind, nextColor, nextAccent);
    }
    this.from = this.to ?? { at, pose: { ...pose } };
    this.to = { at, pose: { ...pose } };
  }

  /** Immediately place a remote (used once for the synchronized starting grid). */
  snap(pose: PlayerPose, at = performance.now()) {
    this.from = { at, pose: { ...pose } };
    this.to = { at, pose: { ...pose } };
    this.mesh.position.set(pose.x, VISUAL_RIDE_Y, pose.z);
    this.mesh.rotation.y = pose.h;
    this.lastVisualAt = at;
  }

  /** Predict the latest server snapshot forward so remotes stay near their real position. */
  update(
    now: number,
    camera: THREE.Camera,
    viewportWidth: number,
    viewportHeight: number,
    latencyMs = 0,
  ) {
    if (!this.to) return;
    const prev = this.from ?? this.to;
    const next = this.to;
    const span = Math.max(NET_TICK_MS, next.at - prev.at);
    const a = prev.pose;
    const b = next.pose;
    // A received pose is already old by the server tick plus roughly one network
    // round trip (sender→server→viewer). Advance it to the current render time.
    const leadMs = Math.min(
      200,
      Math.max(0, now - next.at) + NET_TICK_MS * 0.5 + Math.min(150, latencyMs),
    );
    const spanSeconds = span / 1000;
    const measuredVx = (b.x - a.x) / spanSeconds;
    const measuredVz = (b.z - a.z) / spanSeconds;
    const reportedVx = Math.sin(b.h) * b.s;
    const reportedVz = Math.cos(b.h) * b.s;
    const velocityBlend = Math.abs(b.s) < 0.5 ? 1 : 0.55;
    const vx = THREE.MathUtils.lerp(measuredVx, reportedVx, velocityBlend);
    const vz = THREE.MathUtils.lerp(measuredVz, reportedVz, velocityBlend);
    const targetX = b.x + vx * (leadMs / 1000);
    const targetZ = b.z + vz * (leadMs / 1000);
    let dh = b.h - a.h;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const targetH = b.h + dh * Math.min(4, leadMs / span);
    const turnRate = dh / spanSeconds;
    const targetLean =
      this.kind === "bike"
        ? THREE.MathUtils.clamp(
            -Math.atan((Math.abs(b.s) * turnRate) / 9.81) * 0.72,
            -0.42,
            0.42,
          )
        : 0;

    const visualDt = this.lastVisualAt > 0 ? Math.min(0.1, (now - this.lastVisualAt) / 1000) : 0.05;
    this.lastVisualAt = now;
    const alpha = 1 - Math.exp(-visualDt / 0.02);
    const farAway = this.mesh.position.distanceToSquared(this.labelPoint.set(targetX, VISUAL_RIDE_Y, targetZ)) > 36;
    if (farAway) {
      this.mesh.position.set(targetX, VISUAL_RIDE_Y, targetZ);
      this.mesh.rotation.y = targetH;
      this.mesh.rotation.z = targetLean;
    } else {
      this.mesh.position.x += (targetX - this.mesh.position.x) * alpha;
      this.mesh.position.y = VISUAL_RIDE_Y;
      this.mesh.position.z += (targetZ - this.mesh.position.z) * alpha;
      let visualDh = targetH - this.mesh.rotation.y;
      while (visualDh > Math.PI) visualDh -= Math.PI * 2;
      while (visualDh < -Math.PI) visualDh += Math.PI * 2;
      this.mesh.rotation.y += visualDh * alpha;
      this.mesh.rotation.z += (targetLean - this.mesh.rotation.z) * alpha;
    }

    // Project name tag
    const v = this.labelPoint.set(this.mesh.position.x, 2.2, this.mesh.position.z).project(camera);
    if (v.z > 1) {
      if (this.labelVisible) {
        this.label.style.display = "none";
        this.labelVisible = false;
      }
    } else {
      if (!this.labelVisible) {
        this.label.style.display = "block";
        this.labelVisible = true;
      }
      const x = Math.round((v.x * 0.5 + 0.5) * viewportWidth);
      const y = Math.round((-v.y * 0.5 + 0.5) * viewportHeight);
      if (x !== this.labelX || y !== this.labelY) {
        this.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        this.labelX = x;
        this.labelY = y;
      }
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    disposeVehicleGroup(this.mesh);
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
  weather: NetWeatherMode;
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
    weather: NetWeatherMode;
    hostId: string;
    maxPlayers: number;
  }) => void;
  onStart: (at: number, trackId: string, kind: NetVehicleKind, weather: NetWeatherMode) => void;
  /** Another (or local) driver crashed — reset everyone to the start grid. */
  onCrashReset: (byId: string, byName: string) => void;
  onRaceResult: (
    winnerId: string,
    winnerName: string,
    timeMs: number,
    trackOptions: string[],
    voteEndsAt: number,
  ) => void;
  onVoteUpdate: (votes: Record<string, number>, received: number, total: number) => void;
  onVoteResult: (trackId: string) => void;
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
  /** Host-only on create — room weather for every racer. */
  weather?: NetWeatherMode;
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
  /** Room weather — set by host at create, forced for everyone. */
  weather: NetWeatherMode = "dry";
  maxPlayers = 8;
  phase: LobbyPhase | "" = "";
  /** Bumps on each connect/disconnect so stale socket handlers are ignored. */
  private connGen = 0;
  private finishSent = false;

  constructor(handlers: NetHandlers) {
    this.handlers = handlers;
  }

  createRoom(opts: Omit<RoomConnectOpts, "mode">) {
    // Cache host choice immediately — welcome/start must not fall back to dry.
    this.weather = normalizeWeatherMode(opts.weather);
    this.connect({ ...opts, mode: "create" });
  }

  joinRoom(opts: Omit<RoomConnectOpts, "mode" | "maxPlayers" | "trackId" | "kind" | "weather">) {
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
              weather: normalizeWeatherMode(opts.weather),
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
        this.weather = applyWireWeather(msg.weather, this.weather);
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
          weather: this.weather,
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
        this.weather = applyWireWeather(msg.weather, this.weather);
        this.maxPlayers = msg.maxPlayers;
        this.handlers.onLobby({ ...msg, weather: this.weather });
      } else if (msg.t === "start") {
        this.phase = "racing";
        this.finishSent = false;
        this.trackId = msg.trackId;
        this.kind = msg.kind === "bike" ? "bike" : "car";
        this.weather = applyWireWeather(msg.weather, this.weather);
        this.handlers.onStart(msg.at, msg.trackId, this.kind, this.weather);
      } else if (msg.t === "crashReset") {
        this.finishSent = false;
        this.handlers.onCrashReset(msg.byId, msg.byName);
      } else if (msg.t === "raceResult") {
        this.phase = "finished";
        this.handlers.onRaceResult(
          msg.winnerId,
          msg.winnerName,
          msg.timeMs,
          msg.trackOptions,
          msg.voteEndsAt,
        );
      } else if (msg.t === "voteUpdate") {
        this.handlers.onVoteUpdate(msg.votes, msg.received, msg.total);
      } else if (msg.t === "voteResult") {
        this.phase = "starting";
        this.handlers.onVoteResult(msg.trackId);
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
    this.finishSent = false;
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
    // Re-assert room weather so play cannot drift from the create-room choice.
    this.ws.send(JSON.stringify({ t: "start", weather: normalizeWeatherMode(this.weather) }));
  }

  /** Local wall-explode — server tells every racer to reset to the start grid. */
  reportCrash() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.myId) return;
    if (this.phase !== "racing") return;
    this.ws.send(JSON.stringify({ t: "crash" }));
  }

  /** Report a local finish once; the server decides and broadcasts the winner. */
  reportFinish(timeMs: number, bestLapMs: number) {
    if (
      this.finishSent ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.myId ||
      this.phase !== "racing"
    ) {
      return;
    }
    this.finishSent = true;
    this.ws.send(
      JSON.stringify({
        t: "finish",
        timeMs: Math.max(0, Math.round(timeMs)),
        bestLapMs: Number.isFinite(bestLapMs) ? Math.max(0, Math.round(bestLapMs)) : 0,
      }),
    );
  }

  voteForTrack(trackId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.phase !== "finished") return;
    this.ws.send(JSON.stringify({ t: "vote", trackId }));
  }

  /** Call from render loop; sends at ~30Hz during a live race. */
  maybeSendPose(
    dt: number,
    pose: {
      x: number;
      z: number;
      h: number;
      s: number;
      g: string;
      lap: number;
    },
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.myId) return;
    if (this.phase !== "racing") return;
    this.sendAcc += dt * 1000;
    if (this.sendAcc < NET_TICK_MS) return;
    this.sendAcc = Math.min(this.sendAcc - NET_TICK_MS, NET_TICK_MS);
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
