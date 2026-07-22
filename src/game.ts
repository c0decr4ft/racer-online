import * as THREE from "three";
import { createCar, CAR_PALETTE } from "./car";
import { createTrack, LapGateProgress, projectOnTrack, projectOnTrackNear } from "./track";
import { Input } from "./input";
import { Vehicle, RivalAI } from "./vehicle";
import { NetClient, RemotePlayer } from "./net/client";
import type { PlayerPose } from "./net/protocol";

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "--:--.---";
  const total = Math.floor(ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const milli = total % 1000;
  return `${m}:${s.toString().padStart(2, "0")}.${milli.toString().padStart(3, "0")}`;
}

const TOTAL_LAPS = 3;
const COUNTDOWN_STEPS = ["3", "2", "1", "GO"] as const;
const COUNTDOWN_STEP_MS = 1000;

/**
 * Skill tiers + fixed racing-line offsets (same every race). Player is slot 0.
 * Each AI owns one offset forever: centerline + lateralNormal * offset.
 * Road half≈7, walls≈6.45, car≈1.0 wide → |offset| ≤ 2.8 keeps grooves
 * clear of barriers. Each rival re-traces center+normal*offset densely.
 *
 * Pace tiers by spawn order (rivals = slots 1–5): higher t = further ahead.
 * Skill + mild powerMul → cruise ~200–250 (fast but playable pack).
 */
const GRID = [
  { offset: -2.55, t: 0.0, skill: 1.0 }, // player (unused by RivalAI)
  { offset: 2.35, t: 0.01, skill: 1.55 }, // back
  { offset: -1.15, t: 0.018, skill: 1.72 }, // back
  { offset: 0.85, t: 0.026, skill: 1.92 }, // mid
  { offset: -2.75, t: 0.034, skill: 2.12 }, // front
  { offset: 2.6, t: 0.042, skill: 2.35 }, // front — pace setter
];

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  /** Roof-mounted look-behind cam for the always-on rearview inset. */
  private rearCamera: THREE.PerspectiveCamera;
  input = new Input();
  track = createTrack();
  player!: Vehicle;
  rivals: RivalAI[] = [];
  /** Show picture-in-picture rearview while driving (hidden on pause/home/finish). */
  private wantRearview = false;

  running = false;
  finished = false;
  paused = false;
  /** Infinite practice — same track/AI, no race finish. */
  practice = false;
  online = false;
  private remotes = new Map<string, RemotePlayer>();
  private net: NetClient;
  private pingTimer = 0;
  private labelRoot = document.getElementById("player-tags")!;

  private lap = 1;
  private lastT = 0;
  private crossedOnce = false;
  /** Mid-lap progress gates — SF wrap only scores when these are complete. */
  private gates = new LapGateProgress();
  private raceStart = 0;
  private lapStart = 0;
  private bestLap = Infinity;
  private pauseTotal = 0;
  private pauseBegan = 0;
  private lastFrame = performance.now();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  /** Last known track-t per vehicle/remote — keeps projection sticky so it
   *  never snaps to a different section of the circuit that passes nearby. */
  private stickyT = new WeakMap<object, number>();

  private el = {
    speed: document.getElementById("speed")!,
    gear: document.getElementById("gear")!,
    lap: document.getElementById("lap")!,
    time: document.getElementById("time")!,
    best: document.getElementById("best")!,
    overlay: document.getElementById("overlay")!,
    finish: document.getElementById("finish")!,
    pause: document.getElementById("pause")!,
    pauseBtn: document.getElementById("pause-btn")!,
    finalTime: document.getElementById("final-time")!,
    finalBest: document.getElementById("final-best")!,
    finishEyebrow: document.getElementById("finish-eyebrow")!,
    finishTitle: document.getElementById("finish-title")!,
    finalPlace: document.getElementById("final-place")!,
    position: document.getElementById("position"),
    netStatus: document.getElementById("net-status")!,
    wrongWay: document.getElementById("wrong-way")!,
    bestFlash: document.getElementById("best-flash")!,
    bestFlashTime: document.getElementById("best-flash-time")!,
    countdown: document.getElementById("countdown")!,
    rearview: document.getElementById("rearview-frame")!,
    minimap: document.getElementById("minimap") as HTMLCanvasElement,
  };

  private pendingFinishMs = 0;
  private bestFlashUntil = 0;

  /** Cached centerline samples for the 2D minimap (rebuilt if path changes). */
  private minimapPath: THREE.CatmullRomCurve3 | null = null;
  private minimapPts: { x: number; z: number }[] = [];
  private minimapBounds = { cx: 0, cz: 0, span: 1 };
  private minimapCtx: CanvasRenderingContext2D | null = null;

  /** Grid hold: -1 idle, 0..3 = 3/2/1/GO. Cars frozen until GO releases. */
  private countdownIndex = -1;
  private countdownStepAt = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Cap DPR for stable FPS on retina displays
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearColor(0x87a0bc, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 700);
    this.rearCamera = new THREE.PerspectiveCamera(70, 1.6, 0.2, 400);
    this.scene.background = new THREE.Color(0x87a0bc);
    this.scene.fog = new THREE.Fog(0x87a0bc, 160, 520);

    this.net = new NetClient({
      onWelcome: (id, room, players, you) => this.onNetWelcome(id, room, players, you),
      onJoin: (p) => this.spawnRemote(p),
      onLeave: (id) => this.removeRemote(id),
      onState: (players) => this.onNetState(players),
      onError: (message) => this.setNetStatus(message, "bad"),
      onStatus: (text) => this.setNetStatus(text, text.includes("fail") || text.includes("Disconnect") ? "bad" : "ok"),
    });

    this.buildWorld();
    this.spawnVehicles();
    this.snapCamera();
    this.bindUi();

    addEventListener("resize", () => this.onResize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private bindUi() {
    document.getElementById("start-btn")!.onclick = () => {
      this.online = false;
      this.net.disconnect();
      this.clearRemotes();
      this.setAiVisible(true);
      this.el.netStatus.classList.add("hidden");
      this.startRace(false);
    };
    document.getElementById("test-drive-btn")!.onclick = () => {
      this.online = false;
      this.net.disconnect();
      this.clearRemotes();
      this.setAiVisible(true);
      this.el.netStatus.classList.add("hidden");
      this.startRace(true);
    };
    document.getElementById("restart-btn")!.onclick = () => this.startRace(false);
    document.getElementById("resume-btn")!.onclick = () => this.resume();
    document.getElementById("pause-restart-btn")!.onclick = () => this.startRace(this.practice);
    document.getElementById("pause-home-btn")!.onclick = () => this.goHome();
    document.getElementById("finish-home-btn")!.onclick = () => this.goHome();
    this.el.pauseBtn.onclick = () => this.pause();
  }

  private goHome() {
    this.running = false;
    this.finished = false;
    this.paused = false;
    this.practice = false;
    this.pauseTotal = 0;
    this.pauseBegan = 0;
    this.bestFlashUntil = 0;
    this.clearCountdown();
    this.input.clearDriveKeys();
    this.el.pause.classList.add("hidden");
    this.el.finish.classList.add("hidden");
    this.el.pauseBtn.classList.add("hidden");
    this.el.wrongWay.classList.add("hidden");
    this.el.bestFlash.classList.add("hidden");
    this.el.minimap.classList.add("hidden");
    this.el.rearview.classList.add("hidden");
    this.el.overlay.classList.remove("hidden");
    this.setAiVisible(true);
  }

  private onNetWelcome(_id: string, room: string, players: PlayerPose[], you: PlayerPose) {
    this.setNetStatus(`Joined “${room}”`, "ok");
    // Tint local car to assigned color
    this.scene.remove(this.player.mesh);
    const mesh = createCar(you.color, 7);
    this.scene.add(mesh);
    this.player = new Vehicle(mesh, this.track.startPosition.clone(), this.track.startHeading, true);

    for (const p of players) {
      if (p.id !== this.net.id) this.spawnRemote(p);
    }
    this.startRace();
  }

  private onNetState(players: PlayerPose[]) {
    const now = performance.now();
    const seen = new Set<string>();
    for (const p of players) {
      if (p.id === this.net.id) continue;
      seen.add(p.id);
      const remote = this.remotes.get(p.id);
      if (remote) remote.push(p, now);
      else this.spawnRemote(p);
    }
    for (const id of [...this.remotes.keys()]) {
      if (!seen.has(id)) this.removeRemote(id);
    }
  }

  private spawnRemote(pose: PlayerPose) {
    if (pose.id === this.net.id || this.remotes.has(pose.id)) return;
    const remote = new RemotePlayer(pose, this.scene, this.labelRoot);
    // Skip shadows on remotes for FPS
    remote.mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    this.remotes.set(pose.id, remote);
  }

  private removeRemote(id: string) {
    const r = this.remotes.get(id);
    if (!r) return;
    r.dispose(this.scene);
    this.remotes.delete(id);
  }

  private clearRemotes() {
    for (const id of [...this.remotes.keys()]) this.removeRemote(id);
  }

  private setAiVisible(visible: boolean) {
    for (const r of this.rivals) {
      r.vehicle.mesh.visible = visible;
    }
  }

  private setNetStatus(text: string, kind: "ok" | "warn" | "bad" = "ok") {
    this.el.netStatus.textContent =
      this.net.latency > 0 ? `${text} · ${Math.round(this.net.latency)}ms` : text;
    this.el.netStatus.classList.remove("hidden", "warn", "bad");
    if (kind === "warn") this.el.netStatus.classList.add("warn");
    if (kind === "bad") this.el.netStatus.classList.add("bad");
  }

  private buildWorld() {
    this.scene.add(this.track.group);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x4a6040, 0.9));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.85);
    sun.position.set(40, 80, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -160;
    sun.shadow.camera.right = 160;
    sun.shadow.camera.top = 160;
    sun.shadow.camera.bottom = -160;
    this.scene.add(sun);
  }

  private spawnPose(t: number, offset: number) {
    const p = this.track.path.getPointAt(t);
    const tan = this.track.path.getTangentAt(t).normalize();
    const n = new THREE.Vector3(-tan.z, 0, tan.x);
    // Heading must match path tangent (race direction)
    const heading = Math.atan2(tan.x, tan.z);
    return {
      pos: p.clone().addScaledVector(n, offset),
      heading,
      tan,
    };
  }

  private spawnVehicles() {
    const playerMesh = createCar(CAR_PALETTE.player, 7);
    this.scene.add(playerMesh);
    this.player = new Vehicle(playerMesh, this.track.startPosition.clone(), this.track.startHeading, true);

    this.rivals = CAR_PALETTE.rivals.map((color, i) => {
      const slot = GRID[i + 1] ?? GRID[GRID.length - 1];
      const mesh = createCar(color, 11 + i * 3);
      this.scene.add(mesh);
      const { pos, heading } = this.spawnPose(slot.t, slot.offset);
      return new RivalAI(new Vehicle(mesh, pos, heading, false), slot.offset, slot.skill, i);
    });
  }

  /** @param practice Test Drive — same world, no finish / podium. */
  startRace(practice = false) {
    this.practice = practice;
    this.el.overlay.classList.add("hidden");
    this.el.finish.classList.add("hidden");
    this.el.pause.classList.add("hidden");
    this.el.bestFlash.classList.add("hidden");
    this.el.pauseBtn.classList.remove("hidden");
    this.el.finishEyebrow.textContent = "SESSION COMPLETE";
    this.el.finishTitle.textContent = "FINISH";
    this.el.finalPlace.textContent = "1/6";
    this.finished = false;
    this.paused = false;
    this.running = true;
    this.lap = 1;
    this.bestLap = Infinity;
    this.bestFlashUntil = 0;
    this.pauseTotal = 0;
    this.pauseBegan = 0;
    // Timer starts when countdown hits GO — hold at zero until then
    this.raceStart = 0;
    this.lapStart = 0;
    this.input.clearDriveKeys();

    const slotIndex = this.online ? Math.min(this.remotes.size, 5) : 0;
    const startT = this.online ? slotIndex * 0.008 : 0;
    const offset = this.online ? (slotIndex % 2 === 0 ? -3.2 : 3.2) : -3.5;
    const { pos: spawn, heading } = this.spawnPose(startT, offset);

    this.player.reset(spawn, heading);
    this.resetSticky(this.player);
    this.lastT = this.projectSticky(this.player, this.player.state.position).t;
    // Already on SF facing race direction — first forward wrap completes lap 1
    this.crossedOnce = true;
    this.gates.reset();
    this.el.wrongWay.classList.add("hidden");
    this.snapCamera();

    if (!this.online) {
      this.rivals.forEach((r, i) => {
        const slot = GRID[i + 1] ?? GRID[GRID.length - 1];
        // Spawn already on their fixed invisible line, facing race direction
        const { pos, heading: h } = this.spawnPose(slot.t, r.racingOffset);
        r.vehicle.reset(pos, h);
        r.vehicle.state.speed = 0; // held on grid until GO
        this.resetSticky(r.vehicle);
        r.resetProgress();
      });
    }

    this.el.lap.innerHTML = practice ? "1" : `1<span>/${TOTAL_LAPS}</span>`;
    this.el.best.textContent = "--:--.---";
    this.el.gear.textContent = "1";
    this.el.time.textContent = formatTime(0);

    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.focus({ preventScroll: true });

    this.beginCountdown();
  }

  private beginCountdown() {
    this.countdownIndex = 0;
    this.countdownStepAt = performance.now();
    this.showCountdownStep(COUNTDOWN_STEPS[0]);
  }

  private clearCountdown() {
    this.countdownIndex = -1;
    this.el.countdown.classList.add("hidden");
    this.el.countdown.classList.remove("go");
    this.el.countdown.textContent = "";
  }

  private showCountdownStep(label: (typeof COUNTDOWN_STEPS)[number]) {
    const el = this.el.countdown;
    el.classList.toggle("go", label === "GO");
    el.textContent = label;
    el.classList.remove("hidden");
    // Retrigger CSS pulse on each digit
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }

  /** Advance 3→2→1→GO; release controls when GO appears. */
  private tickCountdown(now: number) {
    if (this.countdownIndex < 0) return;
    if (now - this.countdownStepAt < COUNTDOWN_STEP_MS) return;

    this.countdownIndex += 1;
    this.countdownStepAt = now;

    if (this.countdownIndex >= COUNTDOWN_STEPS.length) {
      this.clearCountdown();
      return;
    }

    const label = COUNTDOWN_STEPS[this.countdownIndex]!;
    this.showCountdownStep(label);
    if (label === "GO") this.releaseGrid();
  }

  private releaseGrid() {
    this.raceStart = this.raceNow();
    this.lapStart = this.raceStart;
    if (!this.online) {
      for (const r of this.rivals) {
        r.vehicle.state.speed = 5; // modest roll — soft launch still ramps throttle
      }
    }
  }

  private get countingDown() {
    return this.countdownIndex >= 0;
  }

  /** True while cars are held (before GO). GO itself has released controls. */
  private get gridHeld() {
    return this.countdownIndex >= 0 && this.countdownIndex < COUNTDOWN_STEPS.length - 1;
  }

  pause() {
    if (!this.running || this.finished || this.paused) return;
    this.paused = true;
    this.pauseBegan = performance.now();
    this.input.clearDriveKeys();
    this.el.pause.classList.remove("hidden");
    this.el.pauseBtn.classList.add("hidden");
  }

  resume() {
    if (!this.paused) return;
    const pausedFor = performance.now() - this.pauseBegan;
    this.pauseTotal += pausedFor;
    if (this.countingDown) this.countdownStepAt += pausedFor;
    this.paused = false;
    this.el.pause.classList.add("hidden");
    this.el.pauseBtn.classList.remove("hidden");
    this.lastFrame = performance.now();
    this.input.clearDriveKeys();
    this.renderer.domElement.focus({ preventScroll: true });
  }

  /** Sticky track projection: global search only on first use (spawn/reset),
   *  then a narrow window around the last known t. */
  private projectSticky(key: object, position: THREE.Vector3) {
    const prev = this.stickyT.get(key);
    const proj =
      prev === undefined
        ? projectOnTrack(this.track.path, position)
        : projectOnTrackNear(this.track.path, position, prev);
    this.stickyT.set(key, proj.t);
    return proj;
  }

  private resetSticky(key: object) {
    this.stickyT.delete(key);
  }

  private raceNow() {
    const extra = this.paused ? performance.now() - this.pauseBegan : 0;
    return performance.now() - this.pauseTotal - extra;
  }

  private onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  private frame() {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;

    // Always interpolate remotes (cheap) even if paused locally
    for (const remote of this.remotes.values()) {
      remote.update(now, this.camera, this.renderer);
    }

    const inputPeek = this.input.getState();
    this.wantRearview = this.running && !this.paused && !this.finished;
    if (inputPeek.pause) {
      if (this.paused) this.resume();
      else if (this.running && !this.finished) this.pause();
    }

    if (this.running && !this.finished && !this.paused) {
      if (this.countingDown) this.tickCountdown(now);

      if (this.gridHeld) {
        // Frozen on grid through 3-2-1 — HUD/camera only (held throttle launches on GO)
        this.updateHud();
        this.updateCamera(dt);
      } else {
        const input = inputPeek;
        if (input.reset) {
          this.player.reset(this.track.startPosition.clone(), this.track.startHeading);
          this.resetSticky(this.player);
          this.lastT = this.projectSticky(this.player, this.player.state.position).t;
          this.gates.reset();
          this.el.wrongWay.classList.add("hidden");
          this.snapCamera();
        }
        this.player.update(dt, input);
        this.keepOnTrack(this.player);

        if (!this.online) {
          const playerT = this.projectSticky(this.player, this.player.state.position).t;
          const cars = [this.player, ...this.rivals.map((r) => r.vehicle)];
          this.rivals.forEach((r) => r.update(dt, this.track.path, playerT, now * 0.001, cars));
          this.rivals.forEach((r) => this.keepOnTrack(r.vehicle));
          // Race mode: AI that complete TOTAL_LAPS finish ahead; practice never ends for them
          if (!this.practice) {
            for (const r of this.rivals) {
              if (!r.raceDone && r.laps >= TOTAL_LAPS) r.markRaceDone();
            }
          }
          this.resolveCollisions();
        } else {
          this.net.maybeSendPose(dt, {
            x: this.player.state.position.x,
            z: this.player.state.position.z,
            h: this.player.state.heading,
            s: this.player.state.speed,
            g: this.player.gearLabel,
            lap: this.lap,
          });
          this.resolveRemoteCollisions();
          this.pingTimer += dt;
          if (this.pingTimer > 2) {
            this.pingTimer = 0;
            this.net.ping();
            if (this.net.connected) {
              this.setNetStatus(`Online · ${this.net.room}`, "ok");
            }
          }
        }

        this.updateLaps();
        this.updateHud();
        this.updateCamera(dt);
      }
    } else if (this.paused) {
      this.updateCamera(0);
    } else if (!this.running && !this.finished) {
      const t = now * 0.0002;
      const p = this.track.startPosition;
      this.camera.position.set(p.x + Math.cos(t) * 18, 7, p.z + Math.sin(t) * 18);
      this.camera.lookAt(p.x, 1.2, p.z);
    } else if (this.finished) {
      this.updateCamera(dt);
    }

    this.renderViews();
  }

  /** Main chase cam + always-on bottom-right rearview mirror inset while driving. */
  private renderViews() {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);

    if (!this.wantRearview || !this.player) {
      this.el.rearview.classList.add("hidden");
      return;
    }

    // Bottom-right corner — mirrors minimap’s bottom inset, opposite side
    const mw = Math.floor(Math.min(260, w * 0.22));
    const mh = Math.floor(mw * 0.52);
    const rightPad = Math.floor(Math.min(22, w * 0.02));
    const bottomPad = Math.floor(Math.min(118, h * 0.155)); // clear speed HUD
    const mx = w - mw - rightPad;
    const my = bottomPad; // WebGL origin is bottom-left

    this.updateRearCamera();
    this.rearCamera.aspect = mw / mh;
    this.rearCamera.updateProjectionMatrix();

    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(mx, my, mw, mh);
    this.renderer.setViewport(mx, my, mw, mh);
    this.renderer.render(this.scene, this.rearCamera);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.autoClear = true;

    const frame = this.el.rearview;
    frame.classList.remove("hidden");
    frame.style.width = `${mw}px`;
    frame.style.height = `${mh}px`;
    frame.style.left = `${mx}px`;
    frame.style.top = `${h - mh - bottomPad}px`;
    frame.style.right = "auto";
    frame.style.bottom = "auto";
  }

  /** Look behind the car from just above the roof. */
  private updateRearCamera() {
    const s = this.player.state;
    const hx = Math.sin(s.heading);
    const hz = Math.cos(s.heading);
    this.rearCamera.position.set(
      s.position.x - hx * 0.35,
      1.95,
      s.position.z - hz * 0.35,
    );
    this.rearCamera.lookAt(
      s.position.x - hx * 28,
      1.1,
      s.position.z - hz * 28,
    );
  }

  /** Track edges are invisible walls: clamp lateral position at the edge and
   *  scrub only the velocity component pressing into the wall, so the car
   *  slides along it instead of bouncing or teleporting. */
  private keepOnTrack(v: Vehicle) {
    const proj = this.projectSticky(v, v.state.position);
    const wall = this.track.width / 2 - 0.55;
    const d = proj.distanceFromCenter;
    if (Math.abs(d) <= wall) return;

    const side = Math.sign(d);
    const normal = new THREE.Vector3(-proj.tangent.z, 0, proj.tangent.x);
    // Remove only the lateral excess — tangential motion is untouched
    v.state.position.addScaledVector(normal, side * wall - d);

    const s = v.state;
    const intoWall = (Math.sin(s.heading) * normal.x + Math.cos(s.heading) * normal.z) * side;
    if (s.speed * intoWall > 0) {
      s.speed *= 1 - intoWall * intoWall;
    }
    v.syncCollision();
  }

  /** Solid car bodies — separate overlap (capped per frame) and cancel only
   *  the closing velocity along the contact normal. No bounce, no fling. */
  private resolveCollisions() {
    const all = [this.player, ...this.rivals.map((r) => r.vehicle)];
    const radius = 1.7;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        this.bumpVehicles(all[i], all[j], radius);
      }
    }
  }

  private resolveRemoteCollisions() {
    const radius = 1.7;
    const maxSep = 0.5;
    for (const remote of this.remotes.values()) {
      const dx = remote.mesh.position.x - this.player.state.position.x;
      const dz = remote.mesh.position.z - this.player.state.position.z;
      const dist = Math.hypot(dx, dz);
      const min = radius * 2;
      if (dist >= min || dist < 0.001) continue;
      const nx = dx / dist;
      const nz = dz / dist;
      // Local player only — remotes are remote-authoritative for their own pose
      const sep = Math.min(min - dist, maxSep);
      this.player.state.position.x -= nx * sep;
      this.player.state.position.z -= nz * sep;
      const s = this.player.state;
      const into = Math.sin(s.heading) * nx + Math.cos(s.heading) * nz;
      // Scrub only the component driving into the other car (wall-style)
      if (s.speed * into > 0) s.speed *= 1 - into * into;
      this.player.syncCollision();
    }
  }

  private bumpVehicles(a: Vehicle, b: Vehicle, radius: number) {
    const dx = b.state.position.x - a.state.position.x;
    const dz = b.state.position.z - a.state.position.z;
    const dist = Math.hypot(dx, dz);
    const min = radius * 2;
    if (dist >= min || dist < 0.001) return;

    const nx = dx / dist;
    const nz = dz / dist;
    // Separate overlap symmetrically, capped so a deep overlap can never
    // launch a car across the map in a single frame
    const push = Math.min(min - dist, 0.5) * 0.5;
    a.state.position.x -= nx * push;
    a.state.position.z -= nz * push;
    b.state.position.x += nx * push;
    b.state.position.z += nz * push;

    const va = a.state.speed;
    const vb = b.state.speed;
    const aIn = Math.sin(a.state.heading) * nx + Math.cos(a.state.heading) * nz;
    const bIn = Math.sin(b.state.heading) * nx + Math.cos(b.state.heading) * nz;
    const pA = va * aIn; // a's velocity toward b
    const pB = -vb * bIn; // b's velocity toward a
    const rel = pA + pB; // closing speed along the normal
    if (rel > 0) {
      // Cancel just the closing component, split by contribution — the car
      // driving in loses its closing speed, the other car is never flung
      const total = Math.max(0, pA) + Math.max(0, pB);
      if (total > 1e-4) {
        const shareA = (rel * Math.max(0, pA)) / total;
        const shareB = (rel * Math.max(0, pB)) / total;
        a.state.speed -= shareA * aIn;
        b.state.speed += shareB * bIn;
      }
    }
    a.syncCollision();
    b.syncCollision();
  }

  private raceProgress(v: Vehicle) {
    return this.projectSticky(v, v.state.position).t;
  }

  private trackAlign(heading: number, tangent: THREE.Vector3) {
    return Math.sin(heading) * tangent.x + Math.cos(heading) * tangent.z;
  }

  private updateWrongWay(align: number, speed: number) {
    // Wrong way when moving meaningfully against race direction
    const wrong = Math.abs(speed) > 4 && align < -0.25;
    this.el.wrongWay.classList.toggle("hidden", !wrong);
  }

  private updateLaps() {
    const { t, tangent } = this.projectSticky(this.player, this.player.state.position);
    const speed = this.player.state.speed;
    const align = this.trackAlign(this.player.state.heading, tangent);
    // Travel direction along the path (reverse gear / negative speed flips)
    const travelAlign = speed >= 0 ? align : -align;

    this.updateWrongWay(travelAlign, speed);
    this.gates.update(this.lastT, t);

    // Forward wrap across start/finish only
    const wrappedForward = this.lastT > 0.78 && t < 0.22 && travelAlign > 0.2;
    // Backward wrap — ignore for scoring, still update lastT below
    const wrappedBackward = this.lastT < 0.22 && t > 0.78 && travelAlign < -0.15;

    if (wrappedForward && !wrappedBackward && this.gates.readyForFinish) {
      const now = this.raceNow();
      const lapTime = now - this.lapStart;
      // Ignore jitter / spawn-line false positives
      if (this.crossedOnce && lapTime > 8000) {
        if (lapTime < this.bestLap) {
          this.bestLap = lapTime;
          this.el.best.textContent = formatTime(this.bestLap);
        }
        this.lapStart = now;
        this.lap += 1;
        this.gates.reset();
        if (this.practice) {
          // Practice: time laps forever — never finish the session
          this.el.lap.textContent = String(this.lap);
          this.showBestFlash(this.bestLap);
        } else if (this.lap > TOTAL_LAPS) {
          this.finishRace();
        } else {
          this.el.lap.innerHTML = `${this.lap}<span>/${TOTAL_LAPS}</span>`;
        }
      } else if (!this.crossedOnce) {
        this.crossedOnce = true;
        this.lapStart = now;
        this.gates.reset();
      }
    }

    this.lastT = t;
  }

  private showBestFlash(ms: number) {
    this.el.bestFlashTime.textContent = formatTime(ms);
    this.el.bestFlash.classList.remove("hidden");
    // Retrigger CSS enter animation
    this.el.bestFlash.style.animation = "none";
    void this.el.bestFlash.offsetWidth;
    this.el.bestFlash.style.animation = "";
    this.bestFlashUntil = performance.now() + 2000;
  }

  private updateBestFlash() {
    if (this.bestFlashUntil <= 0) return;
    if (performance.now() >= this.bestFlashUntil) {
      this.bestFlashUntil = 0;
      this.el.bestFlash.classList.add("hidden");
    }
  }

  private finishRace() {
    this.finished = true;
    this.running = false;
    this.paused = false;
    this.clearCountdown();
    this.el.wrongWay.classList.add("hidden");
    this.el.pause.classList.add("hidden");
    this.el.pauseBtn.classList.add("hidden");
    this.el.minimap.classList.add("hidden");
    this.pendingFinishMs = this.raceNow() - this.raceStart;
    this.el.finalTime.textContent = formatTime(this.pendingFinishMs);
    this.el.finalBest.textContent = formatTime(this.bestLap);

    const place = this.playerFinishPlace();
    const field = this.online ? this.remotes.size + 1 : this.rivals.length + 1;
    this.el.finalPlace.textContent = `${place}/${field}`;
    if (place === 1) {
      this.el.finishEyebrow.textContent = "RACE WINNER";
      this.el.finishTitle.textContent = "YOU WIN";
    } else {
      this.el.finishEyebrow.textContent = "RACE COMPLETE";
      this.el.finishTitle.textContent = `P${place}`;
    }

    this.el.finish.classList.remove("hidden");
  }

  /**
   * Place when the player completes TOTAL_LAPS.
   * Offline: 1 + AI that already finished 3 laps. Online: live progress rank.
   */
  private playerFinishPlace(): number {
    if (this.online) {
      const playerProgress = this.lap - 1 + this.raceProgress(this.player);
      let place = 1;
      for (const remote of this.remotes.values()) {
        const rt = this.projectSticky(remote, remote.mesh.position).t;
        const rp = (remote.lap ?? 1) - 1 + rt;
        if (rp > playerProgress + 0.002) place += 1;
      }
      return place;
    }
    // Finished AI count as ahead; unfinished pack is behind the player
    return 1 + this.rivals.filter((r) => r.raceDone).length;
  }

  private updateHud() {
    this.el.speed.textContent = String(Math.round(this.player.kmh));
    this.el.gear.textContent = this.player.gearLabel;
    // Practice: current lap clock; race: total race time — frozen at 0 during grid hold
    const clockMs =
      this.gridHeld || this.raceStart === 0
        ? 0
        : this.practice
          ? this.raceNow() - this.lapStart
          : this.raceNow() - this.raceStart;
    this.el.time.textContent = formatTime(clockMs);
    this.updateBestFlash();
    this.updateMinimap();

    if (this.el.position) {
      // Finished AI sit at race distance; otherwise laps + track fraction.
      // Player: completed laps = lap - 1.
      const playerProgress = this.lap - 1 + this.raceProgress(this.player);
      let place = 1;
      if (this.online) {
        const total = this.remotes.size + 1;
        for (const remote of this.remotes.values()) {
          const rt = this.projectSticky(remote, remote.mesh.position).t;
          const rp = (remote.lap ?? 1) - 1 + rt;
          if (rp > playerProgress + 0.002) place += 1;
        }
        this.el.position.textContent = `${place}/${total}`;
      } else {
        for (const r of this.rivals) {
          const rp = r.raceDone ? TOTAL_LAPS + 0.001 : r.progress;
          if (rp > playerProgress + 0.002) place += 1;
        }
        this.el.position.textContent = `${place}/${this.rivals.length + 1}`;
      }
    }
  }

  /** Sample live track path into 2D bounds — stays correct if the circuit changes. */
  private ensureMinimapTrack() {
    const path = this.track.path;
    if (this.minimapPath === path && this.minimapPts.length > 0) return;
    this.minimapPath = path;
    const n = 256;
    const pts: { x: number; z: number }[] = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      const p = path.getPointAt(i / n);
      pts.push({ x: p.x, z: p.z });
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    // Close the loop
    const first = pts[0];
    pts.push({ x: first.x, z: first.z });
    this.minimapPts = pts;
    const pad = 8;
    this.minimapBounds = {
      cx: (minX + maxX) * 0.5,
      cz: (minZ + maxZ) * 0.5,
      span: Math.max(maxX - minX, maxZ - minZ, 1) + pad * 2,
    };
  }

  private worldToMinimap(x: number, z: number, w: number, h: number): [number, number] {
    const { cx, cz, span } = this.minimapBounds;
    const inset = 10;
    const scale = (Math.min(w, h) - inset * 2) / span;
    return [w * 0.5 + (x - cx) * scale, h * 0.5 + (z - cz) * scale];
  }

  private hexCss(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
  }

  /** Bottom-left track map: course outline + player + rivals (race & Test Drive). */
  private updateMinimap() {
    const canvas = this.el.minimap;
    if (!canvas) return;
    if (!this.running || this.finished) {
      canvas.classList.add("hidden");
      return;
    }
    canvas.classList.remove("hidden");
    this.ensureMinimapTrack();

    const dpr = Math.min(devicePixelRatio, 2);
    const cssW = canvas.clientWidth || 148;
    const cssH = canvas.clientHeight || 148;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    if (!this.minimapCtx) this.minimapCtx = canvas.getContext("2d");
    const ctx = this.minimapCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8, 12, 20, 0.55)";
    ctx.fillRect(0, 0, w, h);

    // Course outline
    ctx.beginPath();
    for (let i = 0; i < this.minimapPts.length; i++) {
      const p = this.minimapPts[i];
      const [mx, my] = this.worldToMinimap(p.x, p.z, w, h);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.strokeStyle = "rgba(242, 245, 250, 0.55)";
    ctx.lineWidth = 2 * dpr;
    ctx.lineJoin = "round";
    ctx.stroke();

    const drawDot = (x: number, z: number, fill: string, r: number) => {
      const [mx, my] = this.worldToMinimap(x, z, w, h);
      ctx.beginPath();
      ctx.arc(mx, my, r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    };

    if (this.online) {
      for (const remote of this.remotes.values()) {
        drawDot(remote.mesh.position.x, remote.mesh.position.z, "#7ec8ff", 3.2);
      }
    } else {
      this.rivals.forEach((r, i) => {
        const color = CAR_PALETTE.rivals[i] ?? 0xe23b2e;
        const pos = r.vehicle.state.position;
        drawDot(pos.x, pos.z, this.hexCss(color), 3.2);
      });
    }

    // Player on top — bright accent so it reads clearly
    const pp = this.player.state.position;
    drawDot(pp.x, pp.z, "#ffffff", 4.2);
    drawDot(pp.x, pp.z, "#ff3b2e", 2.6);
  }

  private snapCamera() {
    const s = this.player.state;
    this.camPos.set(
      s.position.x - Math.sin(s.heading) * 12,
      4.5,
      s.position.z - Math.cos(s.heading) * 12,
    );
    this.camLook.set(
      s.position.x + Math.sin(s.heading) * 8,
      1.2,
      s.position.z + Math.cos(s.heading) * 8,
    );
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  private updateCamera(dt: number) {
    const s = this.player.state;
    const back = 12 + Math.min(Math.abs(s.speed) * 0.07, 6);
    const height = 4.4 + Math.min(Math.abs(s.speed) * 0.028, 1.8);
    const ideal = new THREE.Vector3(
      s.position.x - Math.sin(s.heading) * back,
      height,
      s.position.z - Math.cos(s.heading) * back,
    );
    const k = dt <= 0 ? 1 : 1 - Math.exp(-6 * dt);
    this.camPos.lerp(ideal, k);
    this.camera.position.copy(this.camPos);

    const look = new THREE.Vector3(
      s.position.x + Math.sin(s.heading) * 10,
      1.4,
      s.position.z + Math.cos(s.heading) * 10,
    );
    this.camLook.lerp(look, dt <= 0 ? 1 : 1 - Math.exp(-8 * dt));
    this.camera.lookAt(this.camLook);
  }
}
