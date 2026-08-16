import * as THREE from "three";
import { createVehicle, disposeVehicleGroup, stripVehicleSpotLights } from "../car";
import type { VehicleKind } from "../garage";
import { VISUAL_RIDE_Y } from "../vehicle";
import {
  MAX_EXTRAPOLATE_MS,
  NET_TICK_MS,
  decodeStateBinary,
  type EventRoomInfo,
  type LobbyPhase,
  type NetVehicleKind,
  type NetWeatherMode,
  type PlayerPose,
  type PoseMotion,
  type ServerMsg,
} from "./protocol";
import { applyWireWeather, normalizeWeatherMode } from "../weather";
import { configuredApiBase, configuredWsUrl, sameOriginOnline } from "./onlineConfig";

type Snapshot = { at: number; pose: PlayerPose };

function poseKind(pose: PlayerPose): VehicleKind {
  return pose.kind === "bike" ? "bike" : "car";
}

function wrapPi(dh: number): number {
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return dh;
}

/** Remote racer — buffered snapshot lerp for every lobby size (2–8). */
export class RemotePlayer {
  readonly id: string;
  name: string;
  kind: VehicleKind;
  mesh: THREE.Group;
  private buffer: Snapshot[] = [];
  private latest: Snapshot | null = null;
  /** EMA of arrival-gap deviation — drives the adaptive render delay. */
  private jitterMs = 0;
  private lastArrivalAt = 0;
  label: HTMLDivElement;
  private scene: THREE.Scene;
  private color: number;
  private accent: number;
  private readonly labelPoint = new THREE.Vector3();
  private labelX = Number.NaN;
  private labelY = Number.NaN;
  private labelVisible = true;
  private lean = 0;
  private lastUpdateAt = 0;
  /** Correction smoothing — display state + decaying error offset (anti-jerk). */
  private hasDisplay = false;
  private prevTX = 0;
  private prevTZ = 0;
  private prevTH = 0;
  private errX = 0;
  private errZ = 0;
  private errH = 0;

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
    return this.latest?.pose.lap;
  }

  /** Measured snapshot arrival jitter (EMA, ms) — net-smoothness diagnostic. */
  get jitter(): number {
    return this.jitterMs;
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

  private applyMeta(pose: PlayerPose) {
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
  }

  push(pose: PlayerPose, at = performance.now()) {
    this.applyMeta(pose);
    // Measure arrival jitter for the adaptive render delay (push ≈ receipt time)
    const now = performance.now();
    if (this.lastArrivalAt > 0) {
      const dev = Math.abs(now - this.lastArrivalAt - NET_TICK_MS);
      this.jitterMs += (dev - this.jitterMs) * 0.15;
    }
    this.lastArrivalAt = now;
    const snap: Snapshot = { at, pose: { ...pose } };
    this.latest = snap;
    const buf = this.buffer;
    const last = buf[buf.length - 1];
    if (last) {
      if (at < last.at - 1) return; // stale / out-of-order
      if (at <= last.at) {
        last.at = at;
        last.pose = snap.pose;
        return;
      }
    }
    buf.push(snap);
    // ~0.6s at 60Hz — enough history for jitter without unbounded growth.
    const cutoff = at - 1000;
    while (buf.length > 40 || (buf.length > 2 && buf[0]!.at < cutoff)) buf.shift();
  }

  /** Immediately place a remote (used once for the synchronized starting grid). */
  snap(pose: PlayerPose, at = performance.now()) {
    this.applyMeta(pose);
    const snap: Snapshot = { at, pose: { ...pose } };
    this.buffer = [snap];
    this.latest = snap;
    this.hasDisplay = false;
    this.errX = this.errZ = this.errH = 0;
    this.mesh.position.set(pose.x, VISUAL_RIDE_Y, pose.z);
    this.mesh.rotation.y = pose.h;
    this.mesh.rotation.z = 0;
  }

  /**
   * Lerp between buffered server snapshots (same path for 2–8 players).
   * Renders slightly in the past; extrapolates along heading/speed when late.
   */
  update(now: number, camera: THREE.Camera, viewportWidth: number, viewportHeight: number) {
    const buf = this.buffer;
    if (buf.length === 0) return;

    const dt = this.lastUpdateAt > 0 ? Math.min(0.05, (now - this.lastUpdateAt) / 1000) : 0;
    this.lastUpdateAt = now;

    // Adaptive jitter buffer: render delay scales with measured arrival jitter.
    // Floor ≈ 2.2 ticks so we almost always lerp between two snapshots; the cap
    // (300ms) absorbs cellular/Wi-Fi spikes without a visible freeze → teleport.
    const minDelay = NET_TICK_MS * 2.2;
    const interpDelay = THREE.MathUtils.clamp(minDelay + this.jitterMs * 2.5, minDelay, 300);
    const renderAt = now - interpDelay;
    let x: number;
    let z: number;
    let h: number;
    let s: number;
    let turnRate = 0;

    if (buf.length === 1) {
      const only = buf[0]!;
      x = only.pose.x;
      z = only.pose.z;
      h = only.pose.h;
      s = only.pose.s;
    } else if (renderAt <= buf[0]!.at) {
      const a = buf[0]!;
      x = a.pose.x;
      z = a.pose.z;
      h = a.pose.h;
      s = a.pose.s;
    } else {
      const newest = buf[buf.length - 1]!;
      if (renderAt >= newest.at) {
        const prev = buf[buf.length - 2]!;
        const span = Math.max(1, newest.at - prev.at);
        const extrapMs = Math.min(MAX_EXTRAPOLATE_MS, renderAt - newest.at);
        const extrapSec = extrapMs / 1000;
        const spanSec = span / 1000;
        const dh = wrapPi(newest.pose.h - prev.pose.h);
        // Clamp to plausible car motion — a stale/corrupt pair would otherwise
        // spin the extrapolated heading (cars "driving sideways") or fling the
        // position off the track after a respawn.
        turnRate = THREE.MathUtils.clamp(dh / spanSec, -2.4, 2.4);
        // Prefer reported heading×speed; blend a little measured delta to keep coasting honest.
        const maxV = 55; // m/s ≈ 200 km/h — beyond that it's a teleport, not motion
        const measuredVx = THREE.MathUtils.clamp((newest.pose.x - prev.pose.x) / spanSec, -maxV, maxV);
        const measuredVz = THREE.MathUtils.clamp((newest.pose.z - prev.pose.z) / spanSec, -maxV, maxV);
        const reportBlend = Math.abs(newest.pose.s) < 0.5 ? 0.15 : 0.85;
        const baseVx = THREE.MathUtils.lerp(measuredVx, Math.sin(newest.pose.h) * newest.pose.s, reportBlend);
        const baseVz = THREE.MathUtils.lerp(measuredVz, Math.cos(newest.pose.h) * newest.pose.s, reportBlend);
        // Curve the coast with turn rate so late packets don't skate straight through corners.
        const midH = newest.pose.h + turnRate * extrapSec * 0.5;
        const speed = newest.pose.s;
        const curvedVx = Math.sin(midH) * speed;
        const curvedVz = Math.cos(midH) * speed;
        const vx = THREE.MathUtils.lerp(baseVx, curvedVx, 0.65);
        const vz = THREE.MathUtils.lerp(baseVz, curvedVz, 0.65);
        x = newest.pose.x + vx * extrapSec;
        z = newest.pose.z + vz * extrapSec;
        h = newest.pose.h + turnRate * extrapSec;
        s = newest.pose.s;
      } else {
        let i = 0;
        while (i < buf.length - 2 && buf[i + 1]!.at < renderAt) i++;
        const a = buf[i]!;
        const b = buf[i + 1]!;
        const span = Math.max(1, b.at - a.at);
        const t = THREE.MathUtils.clamp((renderAt - a.at) / span, 0, 1);
        // Linear in time — keeps constant-speed coasts even; 60Hz keeps turns smooth.
        x = a.pose.x + (b.pose.x - a.pose.x) * t;
        z = a.pose.z + (b.pose.z - a.pose.z) * t;
        const dh = wrapPi(b.pose.h - a.pose.h);
        h = a.pose.h + dh * t;
        s = a.pose.s + (b.pose.s - a.pose.s) * t;
        turnRate = dh / (span / 1000);
      }
    }

    // Correction smoothing: when a fresh snapshot arrives after an extrapolation
    // underrun, the target track snaps back — absorb that jump in a decaying
    // error offset so the correction glides instead of jerking. Huge jumps are
    // real teleports (crash reset): snap cleanly, no offset.
    if (!this.hasDisplay) {
      this.prevTX = x;
      this.prevTZ = z;
      this.prevTH = h;
      this.hasDisplay = true;
    } else {
      const stepX = x - this.prevTX;
      const stepZ = z - this.prevTZ;
      const step = Math.hypot(stepX, stepZ);
      const stepH = wrapPi(h - this.prevTH);
      const expectStep = Math.max(0.4, Math.abs(s) * dt * 2.5 + 0.2);
      if (step > 12 || Math.abs(stepH) > 1.4) {
        this.errX = this.errZ = this.errH = 0;
      } else {
        if (step > expectStep) {
          this.errX -= stepX;
          this.errZ -= stepZ;
          const cap = 4;
          this.errX = THREE.MathUtils.clamp(this.errX, -cap, cap);
          this.errZ = THREE.MathUtils.clamp(this.errZ, -cap, cap);
        }
        if (Math.abs(stepH) > Math.max(0.15, 6 * dt)) {
          this.errH -= stepH;
          this.errH = THREE.MathUtils.clamp(this.errH, -0.6, 0.6);
        }
      }
      this.prevTX = x;
      this.prevTZ = z;
      this.prevTH = h;
    }
    if (dt > 0) {
      const decay = Math.exp(-dt / 0.14);
      this.errX *= decay;
      this.errZ *= decay;
      this.errH *= decay;
      if (Math.abs(this.errX) < 0.005) this.errX = 0;
      if (Math.abs(this.errZ) < 0.005) this.errZ = 0;
      if (Math.abs(this.errH) < 0.002) this.errH = 0;
    }
    const dispX = x + this.errX;
    const dispZ = z + this.errZ;
    const dispH = h + this.errH;

    const targetLean =
      this.kind === "bike"
        ? THREE.MathUtils.clamp(-Math.atan((Math.abs(s) * turnRate) / 9.81) * 0.72, -0.42, 0.42)
        : 0;
    if (dt > 0) {
      const k = 1 - Math.exp(-14 * dt);
      this.lean += (targetLean - this.lean) * k;
    } else {
      this.lean = targetLean;
    }

    // Direct sample — no exponential chase on pose (that read as laggy remotes).
    this.mesh.position.set(dispX, VISUAL_RIDE_Y, dispZ);
    this.mesh.rotation.y = dispH;
    this.mesh.rotation.z = this.lean;

    // Spin wheels from interpolated speed so remotes don't look frozen/stuttery.
    if (dt > 0 && Math.abs(s) > 0.05) {
      const spinners = this.mesh.userData.spinners as THREE.Group[] | undefined;
      const radius = (this.mesh.userData.wheelRadius as number) || 0.38;
      if (spinners) {
        const spin = (s * dt) / radius;
        for (const spinner of spinners) spinner.rotateX(-spin);
      }
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
      const lx = Math.round((v.x * 0.5 + 0.5) * viewportWidth);
      const ly = Math.round((-v.y * 0.5 + 0.5) * viewportHeight);
      if (lx !== this.labelX || ly !== this.labelY) {
        this.label.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly}px)`;
        this.labelX = lx;
        this.labelY = ly;
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
  /** Event Mode — your buy-in payment request (creq) arrived from the server. */
  onEventInvoice: (
    paymentRequest: string,
    amountSats: number,
    mock: boolean,
    buyInSats?: number,
    feeSats?: number,
  ) => void;
  /** Event Mode — pot claim result; `token` is the cashuA payout to claim in cashu.me. */
  onPayoutResult: (result: {
    ok: boolean;
    token?: string;
    winnerSats?: number;
    tipSats?: number;
    feeSats?: number;
    mock?: boolean;
    error?: string;
  }) => void;
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
  /** `at` is local performance.now()-space time for the snapshot (clock-synced). */
  onState: (players: PlayerPose[], at: number) => void;
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
  /** Nostr identity (64-hex pubkey) — rides along to lobbies/leaderboards. */
  pubkey?: string;
  /** Event Mode (host, on create): buy-in per racer in sats. */
  eventBuyInSats?: number;
  /** True when joining via Event Mode — server rejects cross-type joins. */
  eventMode?: boolean;
  mode: "create" | "join";
};

export class NetClient {
  private ws: WebSocket | null = null;
  private myId = "";
  private sendAcc = 0;
  private pingAt = 0;
  private handlers: NetHandlers;
  private pending: RoomConnectOpts | null = null;
  /** Identity/cosmetics for binary state frames (motion-only downlink). */
  private roster = new Map<string, PlayerPose>();
  /** localNow ≈ serverAt + clockOffset (EMA). */
  private clockOffset = 0;
  private clockReady = false;
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
  /** Event Mode room state — null in normal rooms. */
  event: EventRoomInfo | null = null;
  /** Event Mode — this client's own buy-in payment request (creq). */
  myBuyIn: { paymentRequest: string; amountSats: number; buyInSats?: number; feeSats?: number } | null = null;
  /** Bumps on each connect/disconnect so stale socket handlers are ignored. */
  private connGen = 0;
  /** Lobby/race ping loop — keeps a live latency reading even outside races. */
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private finishSent = false;

  constructor(handlers: NetHandlers) {
    this.handlers = handlers;
  }

  private rememberPlayers(players: PlayerPose[]) {
    for (const p of players) this.roster.set(p.id, { ...p });
  }

  private rememberPlayer(player: PlayerPose) {
    this.roster.set(player.id, { ...player });
  }

  /** Map server wall-clock `at` into performance.now() space. */
  private localStamp(serverAt: number, recvNow: number): number {
    if (!Number.isFinite(serverAt) || serverAt <= 0) return recvNow;
    const sample = recvNow - serverAt;
    if (!this.clockReady) {
      this.clockOffset = sample;
      this.clockReady = true;
    } else {
      // Faster lock so jitter doesn't starve the interp buffer (underrun → extrap stutter).
      const err = sample - this.clockOffset;
      this.clockOffset += err * (Math.abs(err) > 40 ? 0.25 : 0.08);
    }
    return serverAt + this.clockOffset;
  }

  private posesFromMotions(motions: PoseMotion[]): PlayerPose[] {
    const kind = this.kind;
    const out: PlayerPose[] = [];
    for (const m of motions) {
      const meta = this.roster.get(m.id);
      const pose: PlayerPose = {
        id: m.id,
        name: meta?.name ?? "RACER",
        color: meta?.color ?? 0xe4eaf2,
        accent: meta?.accent,
        kind: meta?.kind ?? kind,
        pubkey: meta?.pubkey,
        x: m.x,
        z: m.z,
        h: m.h,
        s: m.s,
        g: m.g,
        lap: m.lap,
      };
      this.roster.set(m.id, pose);
      out.push(pose);
    }
    return out;
  }

  private emitState(players: PlayerPose[], at: number) {
    this.rememberPlayers(players);
    this.handlers.onState(players, at);
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
    ws.binaryType = "arraybuffer";
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
              pubkey: opts.pubkey,
              event: opts.eventBuyInSats ? { buyInSats: opts.eventBuyInSats } : undefined,
            }
          : {
              t: "join" as const,
              name: opts.name,
              room: opts.room || "circuit",
              password: opts.password ?? "",
              color: opts.color,
              accent: opts.accent,
              pubkey: opts.pubkey,
              event: opts.eventMode || undefined,
            };
      ws.send(JSON.stringify(payload));
      this.pingAt = performance.now();
      ws.send(JSON.stringify({ t: "ping", n: this.pingAt }));
      // Keep pinging while connected so the lobby shows a live ping, not just races.
      this.startPingLoop(ws, gen);
    };

    ws.onmessage = (ev) => {
      if (gen !== this.connGen || this.ws !== ws) return;
      const recvNow = performance.now();

      // Hot path: compact binary state (2–8 players, same encoder).
      if (ev.data instanceof ArrayBuffer) {
        const decoded = decodeStateBinary(ev.data);
        if (!decoded) return;
        const at = this.localStamp(decoded.at, recvNow);
        this.emitState(this.posesFromMotions(decoded.motions), at);
        return;
      }

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
        this.event = msg.event ?? null;
        this.myBuyIn = null;
        this.pending = null;
        this.roster.clear();
        this.clockReady = false;
        this.rememberPlayers(msg.players);
        this.rememberPlayer(msg.you);
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
        this.rememberPlayer(msg.player);
        this.handlers.onJoin(msg.player);
      } else if (msg.t === "leave") {
        if (msg.hostId) this.hostId = msg.hostId;
        this.roster.delete(msg.id);
        this.handlers.onLeave(msg.id, msg.hostId);
      } else if (msg.t === "notice") {
        this.handlers.onNotice(msg.text);
      } else if (msg.t === "lobby") {
        this.hostId = msg.hostId;
        this.trackId = msg.trackId;
        this.kind = msg.kind === "bike" ? "bike" : "car";
        this.weather = applyWireWeather(msg.weather, this.weather);
        this.maxPlayers = msg.maxPlayers;
        this.event = msg.event ?? null;
        this.roster.clear();
        this.rememberPlayers(msg.players);
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
        if (msg.event !== undefined) this.event = msg.event;
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
        // Legacy JSON state fallback (older servers).
        const at = this.localStamp(msg.at ?? 0, recvNow);
        this.emitState(msg.players, at);
      } else if (msg.t === "eventInvoice") {
        this.myBuyIn = {
          paymentRequest: msg.paymentRequest,
          amountSats: msg.amountSats,
          buyInSats: msg.buyInSats,
          feeSats: msg.feeSats,
        };
        // The invoice carries the room's per-buy-in mint fee — keep the shared
        // event state in sync so the lobby banner can show it immediately.
        if (this.event && msg.feeSats != null) this.event.feeSats = msg.feeSats;
        this.handlers.onEventInvoice(
          msg.paymentRequest,
          msg.amountSats,
          !!msg.mock,
          msg.buyInSats,
          msg.feeSats,
        );
      } else if (msg.t === "payoutResult") {
        this.handlers.onPayoutResult({
          ok: msg.ok,
          token: msg.token,
          winnerSats: msg.winnerSats,
          tipSats: msg.tipSats,
          feeSats: msg.feeSats,
          mock: msg.mock,
          error: msg.error,
        });
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
    if (gen !== this.connGen) return;
    this.stopPingLoop();
    this.connected = false;
    this.ws = null;
    this.pending = null;
    this.myId = "";
    this.roster.clear();
    this.clockReady = false;
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }

  disconnect() {
    this.connGen++;
    this.stopPingLoop();
    const ws = this.ws;
    this.ws = null;
    this.connected = false;
    this.myId = "";
    this.hostId = "";
    this.trackId = "";
    this.kind = "car";
    this.maxPlayers = 8;
    this.phase = "";
    this.event = null;
    this.myBuyIn = null;
    this.finishSent = false;
    this.pending = null;
    this.roster.clear();
    this.clockReady = false;
    this.clockOffset = 0;
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

  /** Event Mode — manual buy-in: submit a pasted cashuA token. */
  submitToken(token: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.myId) return;
    const trimmed = token.trim();
    if (!trimmed) return;
    this.ws.send(JSON.stringify({ t: "submitToken", token: trimmed }));
  }

  /** Event Mode — winner claims the pot; tip 0–100 goes to the dev. */
  claimPot(tipPercent: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.myId) return;
    if (this.phase !== "finished" || !this.event) return;
    this.ws.send(
      JSON.stringify({
        t: "claimPot",
        tipPercent: Math.max(0, Math.min(100, Math.round(tipPercent))),
      }),
    );
  }

  /** Call from render loop; sends at ~60Hz during a live race. */
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
    this.pingAt = n;
    this.ws.send(JSON.stringify({ t: "ping", n }));
  }

  /** 2s ping loop for the lifetime of a socket — self-stops when it goes stale. */
  private startPingLoop(ws: WebSocket, gen: number) {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      if (gen !== this.connGen || this.ws !== ws || ws.readyState !== WebSocket.OPEN) {
        this.stopPingLoop();
        return;
      }
      this.ping();
    }, 2000);
  }

  private stopPingLoop() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
