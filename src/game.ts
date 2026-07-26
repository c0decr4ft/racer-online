import * as THREE from "three";
import { createCar, CAR_PALETTE } from "./car";
import {
  createTrack,
  disposeTrack,
  LapGateProgress,
  projectOnTrack,
  projectOnTrackNear,
  TRACKS,
  randomTrackId,
  DEFAULT_TRACK_ID,
} from "./track";
import { drawTrackPreview } from "./mapPreview";
import { Input } from "./input";
import { Vehicle, RivalAI } from "./vehicle";
import { NetClient, RemotePlayer } from "./net/client";
import type { PlayerPose } from "./net/protocol";
import {
  boardSourceLabel,
  fetchLeaderboard,
  formatBoardTime,
  sanitizeDriverName,
  saveLocalDriverName,
  submitScore,
  wouldQualify,
  type LeaderboardEntry,
} from "./net/leaderboard";
import { GameAudio } from "./audio";
import { setFeedbackBtnVisible } from "./feedbackCompose";
import { setVersionSwitcherVisible } from "./versions";

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
/** Distinct wall hits before the player car explodes and the race restarts. */
const WALL_HIT_LIMIT = 10;
/** Min seconds between counted wall hits (sliding shouldn't rack them up). */
const WALL_HIT_COOLDOWN = 0.4;
/** Brief DESTROYED hold before auto-restart. */
const EXPLODE_RESTART_MS = 1600;

/**
 * Skill tiers + fixed racing-line offsets (same every race). Player is slot 0.
 * Each AI owns one offset forever: centerline + lateralNormal * offset.
 * Road half≈7, walls≈6.45, car≈1.0 wide → |offset| ≤ 2.8 keeps grooves
 * clear of barriers. Each rival re-traces center+normal*offset densely.
 *
 * Path t is race direction; SF checkers sit at t=0. Negative t (wrapped) keeps
 * every nose behind the line — player rearmost, pace setter closest to SF.
 * Skill + mild powerMul → cruise ~200–250 (fast but playable pack).
 */
const GRID = [
  { offset: -2.55, t: -0.048, skill: 1.0 }, // player — rearmost
  { offset: 2.35, t: -0.038, skill: 1.55 }, // back
  { offset: -1.15, t: -0.030, skill: 1.72 }, // back
  { offset: 0.85, t: -0.022, skill: 1.92 }, // mid
  { offset: -2.75, t: -0.014, skill: 2.12 }, // front
  { offset: 2.6, t: -0.006, skill: 2.35 }, // front — pace setter, still behind SF
];

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  /** Roof-mounted look-behind cam for the always-on rearview inset. */
  private rearCamera: THREE.PerspectiveCamera;
  input = new Input();
  track = createTrack(DEFAULT_TRACK_ID);
  /** Active course id — rebuilt when starting a mode or Race Again (random). */
  private trackId = DEFAULT_TRACK_ID;
  /** Board panel currently showing this course. */
  private boardTrackId = DEFAULT_TRACK_ID;
  player!: Vehicle;
  rivals: RivalAI[] = [];
  private audio = new GameAudio();
  /** Show picture-in-picture rearview while driving (hidden on pause/home/finish). */
  private wantRearview = false;
  /** One-shot shadow rebuild after home/track transitions (menu orbit is static-lit). */
  private shadowNeedsWarmup = true;

  running = false;
  finished = false;
  paused = false;
  /** Infinite practice — same track/AI, no race finish. */
  practice = false;
  /** Timed race with no AI rivals — empty track, wall explode on. */
  solo = false;
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
    leaderboard: document.getElementById("leaderboard")!,
    boardList: document.getElementById("board-list")!,
    boardSource: document.getElementById("board-source")!,
    nameEntry: document.getElementById("name-entry")!,
    driverName: document.getElementById("driver-name") as HTMLInputElement,
    countdown: document.getElementById("countdown")!,
    rearview: document.getElementById("rearview-frame")!,
    minimap: document.getElementById("minimap") as HTMLCanvasElement,
    wallHits: document.getElementById("wall-hits")!,
    explodeFlash: document.getElementById("explode-flash")!,
    mapSelect: document.getElementById("map-select")!,
    mapGrid: document.getElementById("map-grid")!,
    mapSelectTitle: document.getElementById("map-select-title")!,
    mapSelectTagline: document.getElementById("map-select-tagline")!,
    boardTrackGrid: document.getElementById("board-track-grid")!,
  };

  private pendingFinishMs = 0;
  private scoreSaveInFlight = false;
  private bestFlashUntil = 0;
  /** Ignore stale async board fetches when switching maps quickly. */
  private boardLoadGen = 0;

  /** Player wall-hit explode — counted distinct contacts only. */
  private wallHits = 0;
  private wallTouching = false;
  private wallHitCooldown = 0;
  private exploding = false;
  private explodeRestartAt = 0;
  private explodeParts: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private explodeFlashLight: THREE.PointLight | null = null;

  /** Cached centerline samples for the 2D minimap (rebuilt if path changes). */
  private minimapPath: THREE.CatmullRomCurve3 | null = null;
  private minimapPts: { x: number; z: number }[] = [];
  private minimapBounds = { cx: 0, cz: 0, span: 1 };
  private minimapCtx: CanvasRenderingContext2D | null = null;
  /** Baked track outline — redrawn only when canvas size/path changes. */
  private minimapTrackCanvas: HTMLCanvasElement | null = null;
  private minimapTrackKey = "";
  /** Avoid rewriting rearview frame CSS every frame when layout is unchanged. */
  private rearLayoutKey = "";

  /** Grid hold: -1 idle, 0..3 = 3/2/1/GO. Cars frozen until GO releases. */
  private countdownIndex = -1;
  private countdownStepAt = 0;

  private readonly _camIdeal = new THREE.Vector3();
  private readonly _camLookTarget = new THREE.Vector3();
  private readonly _wallN = new THREE.Vector3();
  private readonly _explodeGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  /** Reused pack list for AI update + local collisions (no per-frame alloc). */
  private readonly _pack: Vehicle[] = [];
  /** Cached rival minimap CSS colors — avoid hex string alloc every HUD frame. */
  private readonly _rivalCss = CAR_PALETTE.rivals.map(
    (c) => `#${c.toString(16).padStart(6, "0")}`,
  );
  private _rearAspect = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Cap DPR for stable FPS on retina displays
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearColor(0x87a0bc, 1);
    this.renderer.shadowMap.enabled = true;
    // Keep default PCFShadowMap type; rebuild once per frame before the main
    // pass so the rearview inset does not re-render the shadow map.
    this.renderer.shadowMap.autoUpdate = false;
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
    // Bind menu actions first — syncMuteBtn/onHomeOrBoard must not abort handler wiring
    // if a removed overlay ref throws (that previously left every homepage button dead).
    document.getElementById("start-btn")!.onclick = () => {
      // Start Race with AI — random course, no picker
      void this.bootFromMenu({ trackId: randomTrackId() });
    };
    document.getElementById("test-drive-btn")!.onclick = () => {
      void this.unlockAndMaybeMenuMusic().then(() => this.openMapSelect("practice"));
    };
    document.getElementById("solo-race-btn")!.onclick = () => {
      void this.unlockAndMaybeMenuMusic().then(() => this.openMapSelect("solo"));
    };
    document.getElementById("map-select-back")!.onclick = () => this.closeMapSelect();
    document.getElementById("restart-btn")!.onclick = () => {
      void this.audio.unlock().then(() => {
        this.audio.stopMusic();
        // AI race again → new random map; solo keeps chosen course
        const trackId = !this.solo && !this.practice ? randomTrackId() : this.trackId;
        this.startRace({ solo: this.solo, trackId });
      });
    };
    document.getElementById("resume-btn")!.onclick = () => this.resume();
    document.getElementById("pause-restart-btn")!.onclick = () => {
      void this.audio.unlock().then(() => {
        this.audio.stopMusic();
        this.startRace({ practice: this.practice, solo: this.solo, trackId: this.trackId });
      });
    };
    document.getElementById("pause-home-btn")!.onclick = () => this.goHome();
    document.getElementById("finish-home-btn")!.onclick = () => this.goHome();
    this.el.pauseBtn.onclick = () => this.pause();

    document.getElementById("home-board-btn")!.onclick = () => {
      void this.unlockAndMaybeMenuMusic().then(() => this.openLeaderboard());
    };
    document.getElementById("board-close-btn")!.onclick = () => {
      this.el.leaderboard.classList.add("hidden");
      this.audio.playMenuMusic();
    };
    this.el.overlay.addEventListener("pointerdown", () => {
      void this.unlockAndMaybeMenuMusic();
    });
    this.el.mapSelect.addEventListener("pointerdown", () => {
      void this.unlockAndMaybeMenuMusic();
    });
    document.getElementById("submit-score-btn")!.onclick = () => void this.saveDriverScore();
    this.el.driverName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void this.saveDriverScore();
    });
    this.el.driverName.addEventListener("input", () => {
      const cleaned = this.el.driverName.value
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N} _]/gu, "")
        .slice(0, 10);
      if (cleaned !== this.el.driverName.value) this.el.driverName.value = cleaned;
    });

    this.bindMuteBtn();
  }

  private bindMuteBtn() {
    const btn = document.getElementById("mute-btn")!;
    this.syncMuteBtn();
    btn.onclick = () => {
      void this.audio.unlock().then(() => {
        this.audio.toggleUserMute();
        this.syncMuteBtn();
        // If unmuted on home/board, ensure menu track is running
        if (!this.audio.isUserMuted && this.onHomeOrBoard()) {
          this.audio.playMenuMusic();
        }
      });
    };
  }

  /** Speaker icons + visibility: home/board + pause only (hidden while racing). */
  private syncMuteBtn() {
    const btn = document.getElementById("mute-btn")!;
    const muted = this.audio.isUserMuted;
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    btn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
    btn.querySelector(".mute-icon-on")!.classList.toggle("hidden", muted);
    btn.querySelector(".mute-icon-off")!.classList.toggle("hidden", !muted);
    // Homepage (incl. BOARD) or pause overlay — not mid-race / countdown / finish
    const visible = this.onHomeOrBoard() || this.paused;
    btn.classList.toggle("hidden", !visible);
    // Version: home + finish/results (hidden while racing / countdown / pause)
    // Feedback: homepage/menu only
    const onHome = this.onHomeOrBoard();
    setVersionSwitcherVisible(onHome || this.finished);
    setFeedbackBtnVisible(onHome);
  }

  /** Homepage overlay visible (incl. BOARD / map picker over it). */
  private onHomeOrBoard(): boolean {
    const mapOpen = !this.el.mapSelect.classList.contains("hidden");
    const boardOpen = !this.el.leaderboard.classList.contains("hidden");
    return (
      !this.running &&
      !this.finished &&
      !this.paused &&
      (!this.el.overlay.classList.contains("hidden") || mapOpen || boardOpen)
    );
  }

  private async unlockAndMaybeMenuMusic() {
    await this.audio.unlock();
    if (this.onHomeOrBoard()) this.audio.playMenuMusic();
  }

  /** Silhouette course picker for Test Drive / Solo — no text map names. */
  private openMapSelect(mode: "practice" | "solo") {
    this.el.leaderboard.classList.add("hidden");
    this.el.mapSelectTitle.textContent = mode === "practice" ? "TEST DRIVE" : "SOLO RACE";
    this.el.mapSelectTagline.textContent = "Choose a circuit";
    this.renderMapGrid(this.el.mapGrid, null, (trackId) => {
      void this.bootFromMenu({
        practice: mode === "practice",
        solo: mode === "solo",
        trackId,
      });
    });
    this.el.overlay.classList.add("hidden");
    this.el.mapSelect.classList.remove("hidden");
    this.syncMuteBtn();
  }

  private closeMapSelect() {
    this.el.mapSelect.classList.add("hidden");
    this.el.overlay.classList.remove("hidden");
    this.syncMuteBtn();
  }

  /**
   * Fill a grid with minimap-style route thumbnails (outline only, no labels).
   * Clicking a thumb starts / selects that course.
   */
  private renderMapGrid(
    grid: HTMLElement,
    selectedId: string | null,
    onPick: (trackId: string) => void,
  ) {
    const asTabs = grid.getAttribute("role") === "tablist";
    grid.innerHTML = "";
    for (const def of TRACKS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "map-thumb";
      btn.setAttribute("role", asTabs ? "tab" : "option");
      // aria-label only — never shown as visible text on the picker
      btn.setAttribute("aria-label", def.name);
      btn.setAttribute("aria-selected", selectedId === def.id ? "true" : "false");
      if (asTabs) btn.tabIndex = selectedId === def.id ? 0 : -1;
      if (selectedId === def.id) btn.classList.add("selected");
      const canvas = document.createElement("canvas");
      btn.appendChild(canvas);
      btn.onclick = () => onPick(def.id);
      grid.appendChild(btn);
      // Draw after layout so clientWidth is valid
      requestAnimationFrame(() => {
        drawTrackPreview(canvas, def.id, { selected: selectedId === def.id });
      });
    }
  }

  /** Dispose current track mesh and rebuild from a named path definition. */
  private setActiveTrack(trackId: string) {
    if (this.trackId === trackId && this.track.id === trackId) return;
    disposeTrack(this.track);
    this.track = createTrack(trackId);
    this.trackId = this.track.id;
    this.boardTrackId = this.track.id;
    this.scene.add(this.track.group);
    // Invalidate minimap bake — new path reference
    this.minimapPath = null;
    this.minimapPts = [];
    this.minimapTrackKey = "";
    this.stickyT = new WeakMap();
  }

  /** Menu Start / Test Drive / Solo — unlock audio, leave online, start session. */
  private async bootFromMenu(
    opts: { practice?: boolean; solo?: boolean; trackId?: string } = {},
  ) {
    await this.audio.unlock();
    this.audio.stopMenuMusic();
    this.online = false;
    this.net.disconnect();
    this.clearRemotes();
    this.el.netStatus.classList.add("hidden");
    this.el.leaderboard.classList.add("hidden");
    this.el.mapSelect.classList.add("hidden");
    this.startRace(opts);
  }

  private goHome() {
    this.running = false;
    this.finished = false;
    this.paused = false;
    this.practice = false;
    this.solo = false;
    this.pauseTotal = 0;
    this.pauseBegan = 0;
    this.bestFlashUntil = 0;
    this.clearCountdown();
    this.clearExplode(true);
    this.resetWallHits();
    this.audio.mute();
    this.audio.stopDriveMusic();
    this.audio.resetGear();
    this.input.clearDriveKeys();
    this.el.pause.classList.add("hidden");
    this.el.finish.classList.add("hidden");
    this.el.pauseBtn.classList.add("hidden");
    this.el.wrongWay.classList.add("hidden");
    this.el.bestFlash.classList.add("hidden");
    this.el.explodeFlash.classList.add("hidden");
    this.el.nameEntry.classList.add("hidden");
    this.el.leaderboard.classList.add("hidden");
    this.el.mapSelect.classList.add("hidden");
    this.el.minimap.classList.add("hidden");
    this.el.rearview.classList.add("hidden");
    this.el.overlay.classList.remove("hidden");
    this.setAiVisible(true);
    this.shadowNeedsWarmup = true;
    this.audio.playMenuMusic();
    this.syncMuteBtn();
  }

  private renderBoardList(entries: LeaderboardEntry[]) {
    if (!entries.length) {
      this.el.boardList.innerHTML = `<li class="empty">No times yet — be the first</li>`;
      return;
    }
    this.el.boardList.innerHTML = entries
      .map((e, i) => {
        const cls = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
        return `<li class="${cls}"><span class="rank">${i + 1}</span><span class="name">${escapeHtml(e.name)}</span><span class="time">${formatBoardTime(e.timeMs)}</span></li>`;
      })
      .join("");
  }

  private async openLeaderboard() {
    this.el.mapSelect.classList.add("hidden");
    this.el.leaderboard.classList.remove("hidden");
    const boardEyebrow = document.getElementById("board-eyebrow");
    if (boardEyebrow) {
      boardEyebrow.textContent = `WORLDWIDE · ${new Date().getFullYear()}`;
    }
    // Last-played course if set, otherwise first map
    this.boardTrackId = this.trackId || DEFAULT_TRACK_ID;
    this.el.boardSource.textContent = "Loading…";
    this.el.boardList.innerHTML = "";
    this.renderBoardTrackPicker();
    await this.loadBoardForTrack(this.boardTrackId);
    this.syncMuteBtn();
  }

  private renderBoardTrackPicker() {
    this.renderMapGrid(this.el.boardTrackGrid, this.boardTrackId, (trackId) => {
      if (trackId === this.boardTrackId) return;
      this.boardTrackId = trackId;
      this.renderBoardTrackPicker();
      void this.loadBoardForTrack(trackId);
    });
  }

  private async loadBoardForTrack(trackId: string) {
    const gen = ++this.boardLoadGen;
    this.el.boardSource.textContent = "Loading…";
    const { entries, source } = await fetchLeaderboard(trackId);
    if (gen !== this.boardLoadGen || trackId !== this.boardTrackId) return;
    this.el.boardSource.textContent = boardSourceLabel(source);
    this.renderBoardList(entries);
  }

  private async saveDriverScore() {
    if (this.solo) return;
    if (this.scoreSaveInFlight) return;
    if (!this.el.driverName.value.trim()) {
      this.el.driverName.focus();
      return;
    }
    const name = sanitizeDriverName(this.el.driverName.value);
    this.el.driverName.value = name;
    const btn = document.getElementById("submit-score-btn") as HTMLButtonElement;
    this.scoreSaveInFlight = true;
    btn.disabled = true;
    try {
      const { entries, source } = await submitScore(
        name,
        this.pendingFinishMs,
        this.bestLap,
        this.trackId,
      );
      saveLocalDriverName(name);
      this.el.nameEntry.classList.add("hidden");
      this.boardTrackId = this.trackId;
      this.el.leaderboard.classList.remove("hidden");
      this.renderBoardTrackPicker();
      this.el.boardSource.textContent = boardSourceLabel(source, true);
      this.renderBoardList(entries);
    } finally {
      this.scoreSaveInFlight = false;
      btn.disabled = false;
    }
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
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 280;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    this.scene.add(sun);
  }

  private spawnPose(t: number, offset: number) {
    // Wrap so negative t (behind SF) maps onto the closed path
    const tt = ((t % 1) + 1) % 1;
    const p = this.track.path.getPointAt(tt);
    const tan = this.track.path.getTangentAt(tt).normalize();
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

  /** @param opts.practice Test Drive — same world, no finish / podium.
   *  @param opts.solo Timed race with no AI rivals.
   *  @param opts.trackId Course to load; AI Start Race should pass a random id. */
  startRace(opts: { practice?: boolean; solo?: boolean; trackId?: string } = {}) {
    this.practice = !!opts.practice;
    this.solo = !!opts.solo && !this.practice;
    const nextId = opts.trackId ?? this.trackId ?? DEFAULT_TRACK_ID;
    this.setActiveTrack(nextId);
    this.setAiVisible(!this.solo && !this.online);
    this.el.overlay.classList.add("hidden");
    this.el.mapSelect.classList.add("hidden");
    this.el.finish.classList.add("hidden");
    this.el.pause.classList.add("hidden");
    this.el.leaderboard.classList.add("hidden");
    this.el.nameEntry.classList.add("hidden");
    this.el.bestFlash.classList.add("hidden");
    this.el.pauseBtn.classList.remove("hidden");
    this.el.finishEyebrow.textContent = "SESSION COMPLETE";
    this.el.finishTitle.textContent = "FINISH";
    this.el.finalPlace.textContent = this.solo ? "1/1" : "1/6";
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
    this.clearExplode(true);
    this.resetWallHits();

    const slotIndex = this.online ? Math.min(this.remotes.size, 5) : 0;
    const gridSlot = GRID[0]!;
    // Offline: player rearmost on GRID. Online: stagger further behind SF.
    const startT = this.online ? gridSlot.t - slotIndex * 0.008 : gridSlot.t;
    const offset = this.online ? (slotIndex % 2 === 0 ? -3.2 : 3.2) : gridSlot.offset;
    const { pos: spawn, heading } = this.spawnPose(startT, offset);

    this.player.reset(spawn, heading);
    this.resetSticky(this.player);
    this.lastT = this.projectSticky(this.player, this.player.state.position).t;
    // Spawned behind SF facing race direction — first armed wrap after a full lap
    this.crossedOnce = true;
    this.gates.reset();
    this.el.wrongWay.classList.add("hidden");
    this.snapCamera();

    if (!this.online && !this.solo) {
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

    this.el.lap.innerHTML = this.practice ? "1" : `1<span>/${TOTAL_LAPS}</span>`;
    this.el.best.textContent = "--:--.---";
    this.el.gear.textContent = "1";
    this.el.time.textContent = formatTime(0);

    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.focus({ preventScroll: true });

    this.audio.resetGear();
    this.audio.stopMusic();
    this.audio.unmute();
    this.syncMuteBtn();
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
    this.audio.playCountdown(label);
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
    this.audio.playDriveMusic();
    if (!this.online && !this.solo) {
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
    this.audio.mute();
    this.audio.stopDriveMusic();
    this.el.pause.classList.remove("hidden");
    this.el.pauseBtn.classList.add("hidden");
    this.syncMuteBtn();
  }

  resume() {
    if (!this.paused) return;
    const pausedFor = performance.now() - this.pauseBegan;
    this.pauseTotal += pausedFor;
    if (this.countingDown) this.countdownStepAt += pausedFor;
    this.paused = false;
    this.audio.unmute();
    // Drive music only after GO (gridHeld covers 3-2-1)
    if (!this.gridHeld) this.audio.playDriveMusic();
    this.el.pause.classList.add("hidden");
    this.el.pauseBtn.classList.remove("hidden");
    this.syncMuteBtn();
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
    this.rearLayoutKey = "";
  }

  private frame() {
    const now = performance.now();
    // Hidden tab: skip sim + both scene passes (no GPU work, no dt spike on return)
    if (document.visibilityState === "hidden") {
      this.lastFrame = now;
      return;
    }
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;

    // Always interpolate remotes (cheap) even if paused locally
    for (const remote of this.remotes.values()) {
      remote.update(now, this.camera, this.renderer);
    }

    const inputPeek = this.input.getState();
    this.wantRearview = this.running && !this.paused && !this.finished && !this.exploding;
    if (inputPeek.pause) {
      if (this.paused) this.resume();
      else if (this.running && !this.finished && !this.exploding) this.pause();
    }

    if (this.running && !this.finished && !this.paused) {
      if (this.exploding) {
        this.updateExplode(dt);
        this.updateCamera(dt);
        this.syncAudio(inputPeek, false);
        if (performance.now() >= this.explodeRestartAt) {
          this.startRace({ practice: this.practice, solo: this.solo, trackId: this.trackId });
        }
      } else {
        if (this.countingDown) this.tickCountdown(now);

        if (this.gridHeld) {
          // Frozen on grid through 3-2-1 — HUD/camera only (held throttle launches on GO)
          this.updateHud();
          this.updateCamera(dt);
          this.syncAudio(inputPeek, true);
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
          const onWall = this.keepOnTrack(this.player);
          this.notePlayerWallHit(onWall, dt);

          if (!this.online && !this.solo) {
            // keepOnTrack already refreshed sticky t — reuse instead of projecting again
            const playerT = this.stickyT.get(this.player) ?? this.projectSticky(this.player, this.player.state.position).t;
            const cars = this.fillPack();
            for (const r of this.rivals) r.update(dt, this.track.path, playerT, now * 0.001, cars);
            for (const r of this.rivals) this.keepOnTrack(r.vehicle);
            // Race mode: AI that complete TOTAL_LAPS finish ahead; practice never ends for them
            if (!this.practice) {
              for (const r of this.rivals) {
                if (!r.raceDone && r.laps >= TOTAL_LAPS) r.markRaceDone();
              }
            }
            this.resolveCollisions();
          } else if (this.online) {
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

          if (!this.exploding) {
            this.updateLaps();
            this.updateHud();
            this.updateCamera(dt);
            this.syncAudio(input, true);
          } else {
            this.updateCamera(dt);
            this.syncAudio(input, false);
          }
        }
      }
    } else if (this.paused) {
      this.updateCamera(0);
      this.syncAudio(inputPeek, false);
    } else if (!this.running && !this.finished) {
      const t = now * 0.0002;
      const p = this.track.startPosition;
      this.camera.position.set(p.x + Math.cos(t) * 18, 7, p.z + Math.sin(t) * 18);
      this.camera.lookAt(p.x, 1.2, p.z);
      this.syncAudio(inputPeek, false);
    } else if (this.finished) {
      this.updateCamera(dt);
      this.syncAudio(inputPeek, false);
    }

    this.renderViews();
  }

  /** Push vehicle telemetry into the synth; silent when not driving. */
  private syncAudio(input: { throttle: number }, active: boolean) {
    if (!this.player) {
      this.audio.updateEngine({ rpm: 800, speed: 0, throttle: 0, gear: 1 }, false);
      return;
    }
    // On the grid cars are frozen — still allow throttle to rev the synth
    const rpm = this.gridHeld
      ? 1200 + input.throttle * 2800
      : this.player.state.rpm;
    this.audio.updateEngine(
      {
        rpm,
        speed: this.gridHeld ? 0 : this.player.state.speed,
        throttle: input.throttle,
        gear: this.player.state.gear,
      },
      active,
    );
  }

  /** Player + rivals into reused `_pack` (AI neighbors + collision pairs). */
  private fillPack(): Vehicle[] {
    const pack = this._pack;
    pack.length = 0;
    pack.push(this.player);
    for (const r of this.rivals) pack.push(r.vehicle);
    return pack;
  }

  /** Main chase cam + always-on bottom-right rearview mirror inset while driving. */
  private renderViews() {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.autoClear = true;
    // Live race: one shadow rebuild per frame; rearview reuses the same maps.
    // Home/pause/finish: casters are still — skip rebuilds after a warmup.
    const liveShadows = this.running && !this.paused && !this.finished;
    this.renderer.shadowMap.needsUpdate = liveShadows || this.shadowNeedsWarmup;
    if (this.shadowNeedsWarmup) this.shadowNeedsWarmup = false;
    this.renderer.render(this.scene, this.camera);

    if (!this.wantRearview || !this.player) {
      this.el.rearview.classList.add("hidden");
      this.rearLayoutKey = "";
      return;
    }

    // Bottom-right corner — mirrors minimap’s bottom inset, opposite side
    const mw = Math.floor(Math.min(220, w * 0.18));
    const mh = Math.floor(mw * 0.52);
    const rightPad = Math.floor(Math.min(22, w * 0.02));
    const bottomPad = Math.floor(Math.min(118, h * 0.155)); // clear speed HUD
    const mx = w - mw - rightPad;
    const my = bottomPad; // WebGL origin is bottom-left

    this.updateRearCamera();
    const aspect = mw / mh;
    if (aspect !== this._rearAspect) {
      this._rearAspect = aspect;
      this.rearCamera.aspect = aspect;
      this.rearCamera.updateProjectionMatrix();
    }

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
    const layoutKey = `${mw}x${mh}@${mx},${h - mh - bottomPad}`;
    if (this.rearLayoutKey !== layoutKey) {
      this.rearLayoutKey = layoutKey;
      frame.style.width = `${mw}px`;
      frame.style.height = `${mh}px`;
      frame.style.left = `${mx}px`;
      frame.style.top = `${h - mh - bottomPad}px`;
      frame.style.right = "auto";
      frame.style.bottom = "auto";
    }
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
   *  slides along it instead of bouncing or teleporting.
   *  @returns true while the vehicle is contacting / clamped to a wall. */
  private keepOnTrack(v: Vehicle): boolean {
    const proj = this.projectSticky(v, v.state.position);
    const wall = this.track.width / 2 - 0.55;
    const d = proj.distanceFromCenter;
    if (Math.abs(d) <= wall) return false;

    const side = Math.sign(d);
    this._wallN.set(-proj.tangent.z, 0, proj.tangent.x);
    // Remove only the lateral excess — tangential motion is untouched
    v.state.position.addScaledVector(this._wallN, side * wall - d);

    const s = v.state;
    const intoWall = (Math.sin(s.heading) * this._wallN.x + Math.cos(s.heading) * this._wallN.z) * side;
    if (s.speed * intoWall > 0) {
      s.speed *= 1 - intoWall * intoWall;
    }
    v.syncCollision();
    return true;
  }

  /** Edge-trigger + cooldown: count a hit when contact starts, not every scrape frame. */
  private notePlayerWallHit(touching: boolean, dt: number) {
    // Test Drive: walls still bounce, but no hit count / explode.
    if (this.practice) {
      this.wallTouching = touching;
      return;
    }
    if (this.exploding || this.gridHeld) {
      this.wallTouching = touching;
      return;
    }
    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - dt);
    if (touching && !this.wallTouching && this.wallHitCooldown <= 0) {
      this.wallHits += 1;
      this.wallHitCooldown = WALL_HIT_COOLDOWN;
      this.updateWallHitsHud();
      if (this.wallHits >= WALL_HIT_LIMIT) {
        this.triggerExplode();
      }
    }
    this.wallTouching = touching;
  }

  private resetWallHits() {
    this.wallHits = 0;
    this.wallTouching = false;
    this.wallHitCooldown = 0;
    this.updateWallHitsHud();
  }

  private updateWallHitsHud() {
    const el = this.el.wallHits;
    const block = el.parentElement;
    // Hide WALL n/10 in Test Drive; show + reset for real races.
    block?.classList.toggle("hidden", this.practice);
    if (this.practice) return;
    el.textContent = `${this.wallHits}/${WALL_HIT_LIMIT}`;
    el.classList.toggle("warn", this.wallHits >= 6 && this.wallHits < 9);
    el.classList.toggle("danger", this.wallHits >= 9);
  }

  private triggerExplode() {
    if (this.exploding) return;
    this.exploding = true;
    this.explodeRestartAt = performance.now() + EXPLODE_RESTART_MS;
    this.player.state.speed = 0;
    this.player.state.steerAngle = 0;
    this.player.syncCollision();
    this.player.mesh.visible = false;
    this.input.clearDriveKeys();
    this.el.wrongWay.classList.add("hidden");
    this.el.explodeFlash.classList.remove("hidden");
    this.audio.stopDriveMusic();
    this.audio.playBoom();
    this.spawnExplodeFx();
  }

  private spawnExplodeFx() {
    this.clearExplodeParticles();
    const origin = this.player.state.position;
    const colors = [0xff6a2e, 0xffc857, 0xff3b2e, 0xffeeaa, 0x888888];
    for (let i = 0; i < 36; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length]!,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this._explodeGeo, mat);
      mesh.position.set(
        origin.x + (Math.random() - 0.5) * 1.2,
        0.6 + Math.random() * 0.8,
        origin.z + (Math.random() - 0.5) * 1.2,
      );
      const speed = 8 + Math.random() * 14;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        4 + Math.random() * 10,
        (Math.random() - 0.5) * speed,
      );
      this.scene.add(mesh);
      this.explodeParts.push({ mesh, vel, life: 0.55 + Math.random() * 0.55 });
    }
    const light = new THREE.PointLight(0xff7a3a, 8, 28);
    light.position.set(origin.x, 2.2, origin.z);
    this.scene.add(light);
    this.explodeFlashLight = light;
  }

  private updateExplode(dt: number) {
    for (let i = this.explodeParts.length - 1; i >= 0; i--) {
      const p = this.explodeParts[i]!;
      p.life -= dt;
      p.vel.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.z += dt * 4;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life * 1.6);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        mat.dispose();
        this.explodeParts.splice(i, 1);
      }
    }
    if (this.explodeFlashLight) {
      this.explodeFlashLight.intensity = Math.max(0, this.explodeFlashLight.intensity - dt * 10);
    }
  }

  private clearExplodeParticles() {
    for (const p of this.explodeParts) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.explodeParts.length = 0;
    if (this.explodeFlashLight) {
      this.scene.remove(this.explodeFlashLight);
      this.explodeFlashLight = null;
    }
  }

  /** @param restoreCar show player mesh again (race restart / home). */
  private clearExplode(restoreCar: boolean) {
    this.clearExplodeParticles();
    this.el.explodeFlash.classList.add("hidden");
    this.exploding = false;
    this.explodeRestartAt = 0;
    if (restoreCar && this.player) {
      this.player.mesh.visible = true;
    }
  }

  /** Solid car bodies — separate overlap (capped per frame) and cancel only
   *  the closing velocity along the contact normal. No bounce, no fling. */
  private resolveCollisions() {
    const all = this.fillPack();
    const radius = 1.7;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        this.bumpVehicles(all[i]!, all[j]!, radius);
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
    this.clearExplode(true);
    this.audio.mute();
    this.audio.stopDriveMusic();
    this.audio.resetGear();
    this.el.wrongWay.classList.add("hidden");
    this.el.explodeFlash.classList.add("hidden");
    this.el.pause.classList.add("hidden");
    this.el.pauseBtn.classList.add("hidden");
    this.el.minimap.classList.add("hidden");
    this.syncMuteBtn();
    this.pendingFinishMs = this.raceNow() - this.raceStart;
    this.el.finalTime.textContent = formatTime(this.pendingFinishMs);
    this.el.finalBest.textContent = formatTime(this.bestLap);
    this.el.nameEntry.classList.add("hidden");
    this.el.driverName.value = "";

    const place = this.playerFinishPlace();
    const field = this.online
      ? this.remotes.size + 1
      : this.solo
        ? 1
        : this.rivals.length + 1;
    this.el.finalPlace.textContent = `${place}/${field}`;
    if (place === 1) {
      this.el.finishEyebrow.textContent = "RACE WINNER";
      this.el.finishTitle.textContent = "YOU WIN";
    } else {
      this.el.finishEyebrow.textContent = "RACE COMPLETE";
      this.el.finishTitle.textContent = `P${place}`;
    }

    this.el.finish.classList.remove("hidden");
    // Solo Race: finish UI only — no leaderboard qualify / name entry
    if (!this.solo) void this.checkLeaderboardQualify();
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
    if (this.solo) return 1;
    return 1 + this.rivals.filter((r) => r.raceDone).length;
  }

  private async checkLeaderboardQualify() {
    if (this.solo) return;
    const qualifies = await wouldQualify(this.pendingFinishMs, this.trackId);
    if (!qualifies) return;
    this.el.nameEntry.classList.remove("hidden");
    this.el.driverName.focus();
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
      if (this.solo) {
        this.el.position.textContent = "1/1";
      } else {
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
  }

  /** Sample live track path into 2D bounds — stays correct if the circuit changes. */
  private ensureMinimapTrack() {
    const path = this.track.path;
    if (this.minimapPath === path && this.minimapPts.length > 0) return;
    this.minimapPath = path;
    const n = 180;
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

    this.ensureMinimapTrackBitmap(w, h, dpr);
    if (this.minimapTrackCanvas) {
      ctx.drawImage(this.minimapTrackCanvas, 0, 0);
    } else {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(8, 12, 20, 0.55)";
      ctx.fillRect(0, 0, w, h);
    }

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
    } else if (!this.solo) {
      for (let i = 0; i < this.rivals.length; i++) {
        const pos = this.rivals[i]!.vehicle.state.position;
        drawDot(pos.x, pos.z, this._rivalCss[i] ?? "#e23b2e", 3.2);
      }
    }

    // Player on top — bright accent so it reads clearly
    const pp = this.player.state.position;
    drawDot(pp.x, pp.z, "#ffffff", 4.2);
    drawDot(pp.x, pp.z, "#ff3b2e", 2.6);
  }

  /** Bake fill + course stroke once per size; only car dots redraw each frame. */
  private ensureMinimapTrackBitmap(w: number, h: number, dpr: number) {
    const key = `${w}x${h}@${dpr}:${this.minimapPts.length}`;
    if (this.minimapTrackCanvas && this.minimapTrackKey === key) return;
    this.minimapTrackKey = key;
    if (!this.minimapTrackCanvas) this.minimapTrackCanvas = document.createElement("canvas");
    const off = this.minimapTrackCanvas;
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8, 12, 20, 0.55)";
    ctx.fillRect(0, 0, w, h);
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
    this._camIdeal.set(
      s.position.x - Math.sin(s.heading) * back,
      height,
      s.position.z - Math.cos(s.heading) * back,
    );
    const k = dt <= 0 ? 1 : 1 - Math.exp(-6 * dt);
    this.camPos.lerp(this._camIdeal, k);
    this.camera.position.copy(this.camPos);

    this._camLookTarget.set(
      s.position.x + Math.sin(s.heading) * 10,
      1.4,
      s.position.z + Math.cos(s.heading) * 10,
    );
    this.camLook.lerp(this._camLookTarget, dt <= 0 ? 1 : 1 - Math.exp(-8 * dt));
    this.camera.lookAt(this.camLook);
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
