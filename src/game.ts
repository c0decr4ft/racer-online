import * as THREE from "three";
import { createCar, CAR_PALETTE } from "./car";
import { createTrack, projectOnTrack, projectOnTrackNear } from "./track";
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

const GRID = [
  { offset: -3.5, t: 0.0, skill: 1 },
  { offset: 3.8, t: 0.01, skill: 0.94 },
  { offset: -3.2, t: 0.018, skill: 0.9 },
  { offset: 3.0, t: 0.026, skill: 0.96 },
  { offset: -2.4, t: 0.034, skill: 0.92 },
  { offset: 2.6, t: 0.042, skill: 0.98 },
];

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  input = new Input();
  track = createTrack();
  player!: Vehicle;
  rivals: RivalAI[] = [];

  running = false;
  finished = false;
  paused = false;
  online = false;
  private remotes = new Map<string, RemotePlayer>();
  private net: NetClient;
  private pingTimer = 0;
  private labelRoot = document.getElementById("player-tags")!;

  private lap = 1;
  private lastT = 0;
  private crossedOnce = false;
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
    position: document.getElementById("position"),
    netStatus: document.getElementById("net-status")!,
    wrongWay: document.getElementById("wrong-way")!,
  };

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
      this.startRace();
    };
    document.getElementById("restart-btn")!.onclick = () => this.startRace();
    document.getElementById("resume-btn")!.onclick = () => this.resume();
    document.getElementById("pause-restart-btn")!.onclick = () => this.startRace();
    this.el.pauseBtn.onclick = () => this.pause();
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
      return new RivalAI(new Vehicle(mesh, pos, heading, false), slot.offset * 0.25, slot.skill);
    });
  }

  startRace() {
    this.el.overlay.classList.add("hidden");
    this.el.finish.classList.add("hidden");
    this.el.pause.classList.add("hidden");
    this.el.pauseBtn.classList.remove("hidden");
    this.finished = false;
    this.paused = false;
    this.running = true;
    this.lap = 1;
    this.bestLap = Infinity;
    this.pauseTotal = 0;
    this.pauseBegan = 0;
    this.raceStart = this.raceNow();
    this.lapStart = this.raceStart;
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
    this.el.wrongWay.classList.add("hidden");
    this.snapCamera();

    if (!this.online) {
      this.rivals.forEach((r, i) => {
        const slot = GRID[i + 1] ?? GRID[GRID.length - 1];
        const { pos, heading: h } = this.spawnPose(slot.t, slot.offset);
        r.vehicle.reset(pos, h);
        this.resetSticky(r.vehicle);
        r.resetProgress();
      });
    }

    this.el.lap.innerHTML = `1<span>/${TOTAL_LAPS}</span>`;
    this.el.best.textContent = "--:--.---";
    this.el.gear.textContent = "1";

    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.focus({ preventScroll: true });
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
    this.pauseTotal += performance.now() - this.pauseBegan;
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
    if (inputPeek.pause) {
      if (this.paused) this.resume();
      else if (this.running && !this.finished) this.pause();
    }

    if (this.running && !this.finished && !this.paused) {
      const input = inputPeek;
      if (input.reset) {
        this.player.reset(this.track.startPosition.clone(), this.track.startHeading);
        this.resetSticky(this.player);
        this.lastT = this.projectSticky(this.player, this.player.state.position).t;
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

    this.renderer.render(this.scene, this.camera);
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

    // Forward wrap across start/finish only
    const wrappedForward = this.lastT > 0.78 && t < 0.22 && travelAlign > 0.2;
    // Backward wrap — ignore for scoring, still update lastT below
    const wrappedBackward = this.lastT < 0.22 && t > 0.78 && travelAlign < -0.15;

    if (wrappedForward && !wrappedBackward) {
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
        if (this.lap > TOTAL_LAPS) this.finishRace();
        else this.el.lap.innerHTML = `${this.lap}<span>/${TOTAL_LAPS}</span>`;
      } else if (!this.crossedOnce) {
        this.crossedOnce = true;
        this.lapStart = now;
      }
    }

    this.lastT = t;
  }

  private finishRace() {
    this.finished = true;
    this.running = false;
    this.paused = false;
    this.el.wrongWay.classList.add("hidden");
    this.el.pause.classList.add("hidden");
    this.el.pauseBtn.classList.add("hidden");
    this.el.finalTime.textContent = formatTime(this.raceNow() - this.raceStart);
    this.el.finalBest.textContent = formatTime(this.bestLap);
    this.el.finish.classList.remove("hidden");
  }

  private updateHud() {
    this.el.speed.textContent = String(Math.round(this.player.kmh));
    this.el.gear.textContent = this.player.gearLabel;
    this.el.time.textContent = formatTime(this.raceNow() - this.raceStart);

    if (this.el.position) {
      // Total progress = completed laps + track fraction, so a car a lap
      // ahead ranks ahead even when its current-lap t is smaller
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
          if (r.progress > playerProgress + 0.002) place += 1;
        }
        this.el.position.textContent = `${place}/${this.rivals.length + 1}`;
      }
    }
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
