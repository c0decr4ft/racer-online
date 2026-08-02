import * as THREE from "three";
import { createVehicle, CAR_PALETTE } from "./car";
import {
  createTrack,
  disposeTrack,
  LapGateProgress,
  projectOnTrack,
  projectOnTrackNear,
  TRACKS,
  randomTrackId,
  DEFAULT_TRACK_ID,
  getTrackDef,
} from "./track";
import { drawTrackPreview } from "./mapPreview";
import { Input } from "./input";
import { isTouchPrimary, TouchControls, viewportSize } from "./touch";
import { Vehicle, RivalAI } from "./vehicle";
import { NetClient, RemotePlayer, type WelcomeInfo } from "./net/client";
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
import {
  GARAGE_SWATCHES,
  hexColor,
  loadGarage,
  parseHexColor,
  saveGarage,
  type GarageLoadout,
  type VehicleKind,
} from "./garage";
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

/** Multiplayer start-line lanes (lateral). Rows sit just behind the SF line. */
const ONLINE_LANE_OFFSETS = [-3.4, -1.15, 1.15, 3.4];
/** Track-t of the front row — behind start/finish, facing race direction. */
const ONLINE_START_T = -0.016;
const ONLINE_ROW_GAP_T = 0.011;

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  /** Roof-mounted look-behind cam for the always-on rearview inset. */
  private rearCamera: THREE.PerspectiveCamera;
  input = new Input();
  private touch = new TouchControls(this.input);
  private touchMode = false;
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
  /** Player garage loadout — bots always match `kind`. */
  private garage: GarageLoadout = loadGarage();
  /** Waiting in multiplayer lobby (connected, race not started). */
  private inLobby = false;
  /** True after create/join until welcome, leave, or cancel — blocks late welcomes. */
  private expectingLobby = false;
  private lobbyPlayers: PlayerPose[] = [];
  private mpCreateTrackId = DEFAULT_TRACK_ID;
  private mpCreateKind: VehicleKind = "car";

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
    garage: document.getElementById("garage")!,
    multiplayer: document.getElementById("multiplayer")!,
    garagePrimary: document.getElementById("garage-primary") as HTMLInputElement,
    garageAccent: document.getElementById("garage-accent") as HTMLInputElement,
    mpEntry: document.getElementById("mp-entry")!,
    mpCreate: document.getElementById("mp-create")!,
    mpJoin: document.getElementById("mp-join")!,
    mpLobby: document.getElementById("mp-lobby")!,
    mpCreateName: document.getElementById("mp-create-name") as HTMLInputElement,
    mpCreateRoom: document.getElementById("mp-create-room") as HTMLInputElement,
    mpCreatePass: document.getElementById("mp-create-pass") as HTMLInputElement,
    mpCreateMax: document.getElementById("mp-create-max") as HTMLInputElement,
    mpCreateStatus: document.getElementById("mp-create-status")!,
    mpCreateTrackGrid: document.getElementById("mp-create-track-grid")!,
    mpJoinName: document.getElementById("mp-join-name") as HTMLInputElement,
    mpJoinRoom: document.getElementById("mp-join-room") as HTMLInputElement,
    mpJoinPass: document.getElementById("mp-join-pass") as HTMLInputElement,
    mpJoinStatus: document.getElementById("mp-join-status")!,
    mpLobbyTitle: document.getElementById("mp-lobby-title")!,
    mpLobbyMeta: document.getElementById("mp-lobby-meta")!,
    mpLobbyPlayers: document.getElementById("mp-lobby-players")!,
    mpLobbyFeed: document.getElementById("mp-lobby-feed")!,
    mpStatus: document.getElementById("mp-status")!,
    mpStartBtn: document.getElementById("mp-start-btn") as HTMLButtonElement,
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
    const boot = viewportSize();
    this.renderer.setSize(boot.w, boot.h);
    this.renderer.setClearColor(0x87a0bc, 1);
    this.renderer.shadowMap.enabled = true;
    // Keep default PCFShadowMap type; rebuild once per frame before the main
    // pass so the rearview inset does not re-render the shadow map.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(55, boot.w / boot.h, 0.1, 700);
    this.rearCamera = new THREE.PerspectiveCamera(70, 1.6, 0.2, 400);
    this.scene.background = new THREE.Color(0x87a0bc);
    this.scene.fog = new THREE.Fog(0x87a0bc, 160, 520);

    this.net = new NetClient({
      onWelcome: (info) => this.onNetWelcome(info),
      onJoin: (p) => {
        if (this.inLobby) this.upsertLobbyPlayer(p);
        else if (this.running) this.spawnRemote(p);
      },
      onLeave: (id, hostId) => {
        if (this.inLobby) {
          this.lobbyPlayers = this.lobbyPlayers.filter((p) => p.id !== id);
          if (hostId) this.net.hostId = hostId;
          this.renderLobby();
        } else {
          this.removeRemote(id);
        }
      },
      onNotice: (text) => this.pushLobbyNotice(text),
      onLobby: (info) => {
        if (!this.inLobby) return;
        this.lobbyPlayers = info.players;
        this.net.hostId = info.hostId;
        this.net.trackId = info.trackId;
        this.net.kind = info.kind === "bike" ? "bike" : "car";
        this.net.maxPlayers = info.maxPlayers;
        this.renderLobby();
      },
      onStart: (_at, trackId, kind) => this.beginOnlineRace(trackId, kind),
      onState: (players) => this.onNetState(players),
      onError: (message) => {
        this.setNetStatus(message, "bad");
        this.setMpFormStatus(message);
        this.el.mpStatus.textContent = message;
        if (!this.running && !this.inLobby && !this.el.multiplayer.classList.contains("hidden")) {
          this.online = false;
        }
      },
      onStatus: (text) => {
        const bad = /fail|Disconnect|full|error|wrong|not found|already/i.test(text);
        this.setNetStatus(text, bad ? "bad" : "ok");
        if (!this.running && !this.el.multiplayer.classList.contains("hidden")) {
          this.setMpFormStatus(text);
          if (this.inLobby) this.el.mpStatus.textContent = text;
        }
        // Only leave the lobby on a real drop — ignore stale closes from reconnects.
        if (
          /Disconnect/i.test(text) &&
          this.inLobby &&
          !this.running &&
          !this.net.connected &&
          !this.net.id
        ) {
          this.closeMultiplayer();
        }
      },
    });

    this.buildWorld();
    this.spawnVehicles();
    this.snapCamera();
    this.bindUi();
    this.refreshTouchMode();

    addEventListener("resize", () => this.onResize());
    addEventListener("orientationchange", () => {
      // Wait a tick for mobile browsers to settle the visual viewport
      setTimeout(() => {
        this.refreshTouchMode();
        this.onResize();
      }, 120);
    });
    window.visualViewport?.addEventListener("resize", () => this.onResize());
    window.matchMedia("(pointer: coarse)").addEventListener("change", () => this.refreshTouchMode());
    window.matchMedia("(hover: none)").addEventListener("change", () => this.refreshTouchMode());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Detect phone/tablet touchscreens; hide pads on desktop/laptops. */
  private refreshTouchMode() {
    this.touchMode = isTouchPrimary();
    this.touch.syncMode(this.touchMode);
    this.syncTouchControls();
  }

  /** On-screen drive pads only while racing on a touch-primary device. */
  private syncTouchControls() {
    const racing =
      this.touchMode &&
      this.running &&
      !this.paused &&
      !this.finished &&
      !this.exploding;
    this.touch.setVisible(racing);
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
    document.getElementById("multiplayer-btn")!.onclick = () => {
      void this.unlockAndMaybeMenuMusic().then(() => this.openMultiplayer());
    };
    document.getElementById("map-select-back")!.onclick = () => this.closeMapSelect();
    document.getElementById("restart-btn")!.onclick = () => {
      void this.audio.unlock().then(() => {
        this.audio.stopMusic();
        // AI race again → new random map; solo/online keep chosen course
        const trackId =
          this.online || this.solo || this.practice ? this.trackId : randomTrackId();
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
    document.getElementById("home-garage-btn")!.onclick = () => {
      void this.unlockAndMaybeMenuMusic().then(() => this.openGarage());
    };
    document.getElementById("board-close-btn")!.onclick = () => {
      this.el.leaderboard.classList.add("hidden");
      this.audio.playMenuMusic();
    };
    document.getElementById("garage-back-btn")!.onclick = () => this.closeGarage(false);
    document.getElementById("garage-save-btn")!.onclick = () => this.closeGarage(true);
    document.getElementById("garage-kind-car")!.onclick = () => this.setGarageKind("car");
    document.getElementById("garage-kind-bike")!.onclick = () => this.setGarageKind("bike");
    this.el.garagePrimary.addEventListener("input", () => {
      this.setGarageChannel("primary", parseHexColor(this.el.garagePrimary.value, this.garage.primary));
    });
    this.el.garageAccent.addEventListener("input", () => {
      this.setGarageChannel("accent", parseHexColor(this.el.garageAccent.value, this.garage.accent));
    });
    this.bindGarageColorPickers();

    document.getElementById("mp-back-btn")!.onclick = () => this.closeMultiplayer();
    document.getElementById("mp-goto-create")!.onclick = () => this.showMpView("create");
    document.getElementById("mp-goto-join")!.onclick = () => this.showMpView("join");
    document.getElementById("mp-create-back")!.onclick = () => this.cancelMpConnect("entry");
    document.getElementById("mp-join-back")!.onclick = () => this.cancelMpConnect("entry");
    document.getElementById("mp-lobby-leave")!.onclick = () => this.leaveLobby();
    this.el.mpStartBtn.onclick = () => {
      if (this.net.isHost) this.net.startRace();
    };
    document.getElementById("mp-create-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.createMultiplayerRoom();
    });
    document.getElementById("mp-join-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.joinMultiplayerRoom();
    });
    document.getElementById("mp-create-kind-car")!.onclick = () => this.setMpCreateKind("car");
    document.getElementById("mp-create-kind-bike")!.onclick = () => this.setMpCreateKind("bike");
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

  /** Homepage overlay visible (incl. BOARD / garage / multiplayer / map picker). */
  private onHomeOrBoard(): boolean {
    const mapOpen = !this.el.mapSelect.classList.contains("hidden");
    const boardOpen = !this.el.leaderboard.classList.contains("hidden");
    const garageOpen = !this.el.garage.classList.contains("hidden");
    const mpOpen = !this.el.multiplayer.classList.contains("hidden");
    return (
      !this.running &&
      !this.finished &&
      !this.paused &&
      (!this.el.overlay.classList.contains("hidden") || mapOpen || boardOpen || garageOpen || mpOpen)
    );
  }

  private openGarage() {
    this.el.mapSelect.classList.add("hidden");
    this.el.leaderboard.classList.add("hidden");
    this.el.multiplayer.classList.add("hidden");
    this.garage = loadGarage();
    this.closeGarageSwatchPalettes();
    this.syncGarageUi();
    this.el.garage.classList.remove("hidden");
    this.syncMuteBtn();
  }

  private closeGarage(save: boolean) {
    this.closeGarageSwatchPalettes();
    if (save) {
      this.garage = saveGarage({
        kind: this.garage.kind,
        primary: parseHexColor(this.el.garagePrimary.value, this.garage.primary),
        accent: parseHexColor(this.el.garageAccent.value, this.garage.accent),
      });
      this.applyGarageToWorld(true);
    } else {
      this.garage = loadGarage();
    }
    this.el.garage.classList.add("hidden");
    this.audio.playMenuMusic();
    this.syncMuteBtn();
  }

  private setGarageKind(kind: VehicleKind) {
    this.garage.kind = kind;
    this.syncGarageUi();
  }

  private syncGarageUi() {
    document.getElementById("garage-kind-car")?.classList.toggle("is-active", this.garage.kind === "car");
    document.getElementById("garage-kind-bike")?.classList.toggle("is-active", this.garage.kind === "bike");
    this.el.garagePrimary.value = hexColor(this.garage.primary);
    this.el.garageAccent.value = hexColor(this.garage.accent);
    this.syncGarageSwatches();
    const hint = document.getElementById("garage-hint");
    if (hint) {
      hint.textContent =
        this.garage.kind === "bike"
          ? "Bike selected — all AI rivals become bikes"
          : "Car selected — all AI rivals become cars";
    }
    this.syncGarageSwatchPaletteActive();
  }

  private garageSwatchBtn(channel: "primary" | "accent"): HTMLButtonElement | null {
    const el = document.getElementById(channel === "primary" ? "garage-primary-swatch" : "garage-accent-swatch");
    return el instanceof HTMLButtonElement ? el : null;
  }

  private garageSwatchPalette(channel: "primary" | "accent"): HTMLElement | null {
    const el = document.getElementById(
      channel === "primary" ? "garage-primary-palette" : "garage-accent-palette",
    );
    return el instanceof HTMLElement ? el : null;
  }

  private syncGarageSwatches() {
    const primaryBtn = this.garageSwatchBtn("primary");
    const accentBtn = this.garageSwatchBtn("accent");
    if (primaryBtn) primaryBtn.style.background = hexColor(this.garage.primary);
    if (accentBtn) accentBtn.style.background = hexColor(this.garage.accent);
  }

  private setGarageChannel(channel: "primary" | "accent", color: number) {
    if (channel === "primary") this.garage.primary = color;
    else this.garage.accent = color;
    this.el.garagePrimary.value = hexColor(this.garage.primary);
    this.el.garageAccent.value = hexColor(this.garage.accent);
    this.syncGarageSwatches();
    this.syncGarageSwatchPaletteActive();
  }

  private closeGarageSwatchPalettes() {
    for (const channel of ["primary", "accent"] as const) {
      const palette = this.garageSwatchPalette(channel);
      const btn = this.garageSwatchBtn(channel);
      palette?.classList.add("hidden");
      btn?.setAttribute("aria-expanded", "false");
    }
  }

  private openGarageSwatchPalette(channel: "primary" | "accent") {
    for (const other of ["primary", "accent"] as const) {
      const palette = this.garageSwatchPalette(other);
      const btn = this.garageSwatchBtn(other);
      const open = other === channel;
      palette?.classList.toggle("hidden", !open);
      btn?.setAttribute("aria-expanded", open ? "true" : "false");
    }
    this.syncGarageSwatchPaletteActive();
  }

  private openNativeGarageColor(channel: "primary" | "accent") {
    this.closeGarageSwatchPalettes();
    const input = channel === "primary" ? this.el.garagePrimary : this.el.garageAccent;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    // Temporarily enable hit-testing so click()/showPicker can open the OS chooser.
    input.style.pointerEvents = "auto";
    try {
      if (typeof picker.showPicker === "function") picker.showPicker();
      else input.click();
    } catch {
      input.click();
    } finally {
      requestAnimationFrame(() => {
        input.style.pointerEvents = "";
      });
    }
  }

  private bindGarageColorPickers() {
    for (const channel of ["primary", "accent"] as const) {
      const btn = this.garageSwatchBtn(channel);
      const palette = this.garageSwatchPalette(channel);
      if (!btn || !palette) continue;

      palette.replaceChildren();
      for (const color of GARAGE_SWATCHES) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "garage-swatch-chip";
        chip.style.background = hexColor(color);
        chip.dataset.color = String(color);
        chip.title = hexColor(color);
        chip.setAttribute("role", "option");
        chip.onclick = (e) => {
          e.stopPropagation();
          this.setGarageChannel(channel, color);
          this.closeGarageSwatchPalettes();
        };
        palette.appendChild(chip);
      }

      btn.setAttribute("aria-expanded", "false");
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = palette.classList.contains("hidden");
        if (open) this.openGarageSwatchPalette(channel);
        else this.closeGarageSwatchPalettes();
      };
      btn.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openNativeGarageColor(channel);
      };
    }

    this.el.garage.addEventListener("pointerdown", (e) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (t instanceof Element && t.closest(".garage-color-field")) return;
      this.closeGarageSwatchPalettes();
    });
  }

  private syncGarageSwatchPaletteActive() {
    for (const channel of ["primary", "accent"] as const) {
      const palette = this.garageSwatchPalette(channel);
      if (!palette) continue;
      const current = channel === "primary" ? this.garage.primary : this.garage.accent;
      for (const el of palette.querySelectorAll(".garage-swatch-chip")) {
        if (!(el instanceof HTMLElement)) continue;
        el.classList.toggle("is-active", Number(el.dataset.color) === current);
      }
    }
  }

  private openMultiplayer() {
    this.el.mapSelect.classList.add("hidden");
    this.el.leaderboard.classList.add("hidden");
    this.el.garage.classList.add("hidden");
    this.garage = loadGarage();
    this.mpCreateKind = this.garage.kind;
    this.mpCreateTrackId = DEFAULT_TRACK_ID;
    // Always start blank — don't autofill a previous name (e.g. "Luca").
    this.el.mpCreateName.value = "";
    this.el.mpJoinName.value = "";
    this.el.mpCreatePass.value = "";
    this.el.mpJoinPass.value = "";
    if (!this.el.mpCreateRoom.value.trim()) this.el.mpCreateRoom.value = "circuit";
    if (!this.el.mpJoinRoom.value.trim()) this.el.mpJoinRoom.value = "circuit";
    this.el.mpCreateStatus.textContent = "Your vehicle class applies to everyone in the room";
    this.el.mpJoinStatus.textContent = "Vehicle class is set by the host · garage paint still applies";
    this.showMpView("entry");
    this.el.multiplayer.classList.remove("hidden");
    this.syncMuteBtn();
  }

  private closeMultiplayer() {
    this.expectingLobby = false;
    this.inLobby = false;
    this.online = false;
    this.lobbyPlayers = [];
    this.net.disconnect();
    this.clearRemotes();
    this.el.netStatus.classList.add("hidden");
    this.el.mpLobbyFeed.innerHTML = "";
    this.el.multiplayer.classList.add("hidden");
    this.showMpView("entry");
    // Lobby flow hides the home overlay — always restore it when leaving MP.
    this.el.overlay.classList.remove("hidden");
    this.audio.playMenuMusic();
    this.syncMuteBtn();
  }

  /** Back from create/join while connecting — drop the socket so a late welcome can't yank you in. */
  private cancelMpConnect(view: "entry" | "create" | "join") {
    this.expectingLobby = false;
    this.inLobby = false;
    this.online = false;
    this.net.disconnect();
    this.clearRemotes();
    this.el.netStatus.classList.add("hidden");
    this.showMpView(view);
    this.syncMuteBtn();
  }

  private showMpView(view: "entry" | "create" | "join" | "lobby") {
    this.el.mpEntry.classList.toggle("hidden", view !== "entry");
    this.el.mpCreate.classList.toggle("hidden", view !== "create");
    this.el.mpJoin.classList.toggle("hidden", view !== "join");
    this.el.mpLobby.classList.toggle("hidden", view !== "lobby");
    if (view === "create") {
      this.syncMpCreateKindUi();
      this.renderMpCreateTracks();
    }
    this.syncMuteBtn();
  }

  private setMpCreateKind(kind: VehicleKind) {
    this.mpCreateKind = kind;
    this.syncMpCreateKindUi();
  }

  private syncMpCreateKindUi() {
    document.getElementById("mp-create-kind-car")?.classList.toggle("is-active", this.mpCreateKind === "car");
    document.getElementById("mp-create-kind-bike")?.classList.toggle("is-active", this.mpCreateKind === "bike");
  }

  private renderMpCreateTracks() {
    this.renderMapGrid(this.el.mpCreateTrackGrid, this.mpCreateTrackId, (trackId) => {
      this.mpCreateTrackId = trackId;
      this.renderMpCreateTracks();
    });
  }

  private setMpFormStatus(text: string) {
    if (!this.el.mpCreate.classList.contains("hidden")) this.el.mpCreateStatus.textContent = text;
    if (!this.el.mpJoin.classList.contains("hidden")) this.el.mpJoinStatus.textContent = text;
  }

  private sanitizeRoomName(raw: string): string {
    return raw.replace(/[^\w\- ]/g, "").trim().slice(0, 24) || "circuit";
  }

  private async createMultiplayerRoom() {
    const typed = this.el.mpCreateName.value.trim();
    if (!typed) {
      this.el.mpCreateStatus.textContent = "Enter a racer name";
      this.el.mpCreateName.focus();
      return;
    }
    const name = sanitizeDriverName(typed);
    this.el.mpCreateName.value = name;
    saveLocalDriverName(name);
    const room = this.sanitizeRoomName(this.el.mpCreateRoom.value);
    this.el.mpCreateRoom.value = room;
    const password = this.el.mpCreatePass.value.slice(0, 32);
    const maxPlayers = Math.max(2, Math.min(8, Number(this.el.mpCreateMax.value) || 4));
    this.el.mpCreateMax.value = String(maxPlayers);
    this.el.mpCreateStatus.textContent = "Creating room…";
    await this.audio.unlock();
    this.audio.stopMenuMusic();
    this.garage = { ...loadGarage(), kind: this.mpCreateKind };
    this.solo = false;
    this.practice = false;
    this.clearRemotes();
    this.expectingLobby = true;
    this.el.netStatus.classList.remove("hidden");
    this.setNetStatus("Creating room…", "ok");
    this.net.createRoom({
      name,
      room,
      password,
      maxPlayers,
      trackId: this.mpCreateTrackId,
      kind: this.mpCreateKind,
      color: this.garage.primary,
      accent: this.garage.accent,
    });
  }

  private async joinMultiplayerRoom() {
    const typed = this.el.mpJoinName.value.trim();
    if (!typed) {
      this.el.mpJoinStatus.textContent = "Enter a racer name";
      this.el.mpJoinName.focus();
      return;
    }
    const name = sanitizeDriverName(typed);
    this.el.mpJoinName.value = name;
    saveLocalDriverName(name);
    const room = this.sanitizeRoomName(this.el.mpJoinRoom.value);
    this.el.mpJoinRoom.value = room;
    const password = this.el.mpJoinPass.value.slice(0, 32);
    this.el.mpJoinStatus.textContent = "Joining room…";
    await this.audio.unlock();
    this.audio.stopMenuMusic();
    // Colors from garage; vehicle kind is forced by the host/room on welcome.
    this.garage = loadGarage();
    this.solo = false;
    this.practice = false;
    this.clearRemotes();
    this.expectingLobby = true;
    this.el.netStatus.classList.remove("hidden");
    this.setNetStatus("Joining room…", "ok");
    this.net.joinRoom({
      name,
      room,
      password,
      color: this.garage.primary,
      accent: this.garage.accent,
    });
  }

  private leaveLobby() {
    // Leave room → back to the main home menu (not a blank overlay).
    this.closeMultiplayer();
  }

  private upsertLobbyPlayer(player: PlayerPose) {
    const i = this.lobbyPlayers.findIndex((p) => p.id === player.id);
    if (i >= 0) this.lobbyPlayers[i] = player;
    else this.lobbyPlayers.push(player);
    this.renderLobby();
  }

  private pushLobbyNotice(text: string) {
    if (!this.inLobby) return;
    const line = document.createElement("div");
    line.className = "mp-feed-line";
    line.textContent = text;
    this.el.mpLobbyFeed.appendChild(line);
    this.el.mpLobbyFeed.scrollTop = this.el.mpLobbyFeed.scrollHeight;
    while (this.el.mpLobbyFeed.children.length > 12) {
      this.el.mpLobbyFeed.firstElementChild?.remove();
    }
  }

  private renderLobby() {
    const trackName = getTrackDef(this.net.trackId || this.mpCreateTrackId).name;
    const vehicle = this.net.kind === "bike" ? "BIKES" : "CARS";
    this.el.mpLobbyTitle.textContent = this.net.room.toUpperCase();
    this.el.mpLobbyMeta.textContent = `${trackName} · ${vehicle} · ${this.lobbyPlayers.length}/${this.net.maxPlayers}`;
    this.el.mpLobbyPlayers.innerHTML = this.lobbyPlayers
      .map((p) => {
        const host = p.id === this.net.hostId ? "HOST" : "RACER";
        const you = p.id === this.net.id ? " (you)" : "";
        const color = `#${(p.color >>> 0).toString(16).padStart(6, "0")}`;
        return `<li><span class="mp-name-row"><span class="mp-swatch" style="background:${color}"></span><span>${escapeHtml(p.name)}${you}</span></span><span class="mp-role">${host}</span></li>`;
      })
      .join("");
    const host = this.net.isHost;
    this.el.mpStartBtn.classList.toggle("hidden", !host);
    this.el.mpStartBtn.disabled = !host;
    this.el.mpStatus.textContent = host
      ? "You are the host — start when ready"
      : "Waiting for host to start the race…";
  }

  private async unlockAndMaybeMenuMusic() {
    await this.audio.unlock();
    if (this.onHomeOrBoard()) this.audio.playMenuMusic();
  }

  /** Silhouette course picker for Test Drive / Solo — no text map names. */
  private openMapSelect(mode: "practice" | "solo") {
    this.el.leaderboard.classList.add("hidden");
    this.el.garage.classList.add("hidden");
    this.el.multiplayer.classList.add("hidden");
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
    this.el.garage.classList.add("hidden");
    this.el.multiplayer.classList.add("hidden");
    this.startRace(opts);
  }

  private goHome() {
    this.running = false;
    this.finished = false;
    this.paused = false;
    this.practice = false;
    this.solo = false;
    this.online = false;
    this.inLobby = false;
    this.expectingLobby = false;
    this.lobbyPlayers = [];
    this.net.disconnect();
    this.clearRemotes();
    this.el.netStatus.classList.add("hidden");
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
    this.el.garage.classList.add("hidden");
    this.el.multiplayer.classList.add("hidden");
    this.el.mpLobbyFeed.innerHTML = "";
    this.el.minimap.classList.add("hidden");
    this.el.rearview.classList.add("hidden");
    this.syncTouchControls();
    this.el.overlay.classList.remove("hidden");
    this.applyGarageToWorld();
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
    this.el.garage.classList.add("hidden");
    this.el.multiplayer.classList.add("hidden");
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

  private onNetWelcome(info: WelcomeInfo) {
    // User hit Back/Leave before the server replied — drop the late welcome.
    if (!this.expectingLobby) {
      this.net.disconnect();
      return;
    }
    this.expectingLobby = false;
    this.online = true;
    this.inLobby = true;
    this.lobbyPlayers = [...info.players];
    // Room kind is host-locked — personal garage paint/name still apply.
    const kind: VehicleKind = info.kind === "bike" || info.you.kind === "bike" ? "bike" : "car";
    this.garage = {
      ...loadGarage(),
      kind,
      primary: info.you.color || this.garage.primary,
      accent: info.you.accent ?? this.garage.accent,
    };
    this.net.kind = kind;
    this.setNetStatus(`Lobby · ${info.room}`, "ok");
    this.el.overlay.classList.add("hidden");
    this.el.mpLobbyFeed.innerHTML = "";
    this.showMpView("lobby");
    this.el.multiplayer.classList.remove("hidden");
    this.renderLobby();
    this.pushLobbyNotice(`Welcome to ${info.room}`);
    this.syncMuteBtn();
  }

  /** Host pressed Start Race (or we received the shared start). */
  private beginOnlineRace(trackId: string, kindHint?: VehicleKind) {
    if (!this.online) return;
    this.inLobby = false;
    this.el.multiplayer.classList.add("hidden");
    this.el.overlay.classList.add("hidden");

    const kind: VehicleKind =
      kindHint === "bike" || this.net.kind === "bike" || this.garage.kind === "bike" ? "bike" : "car";
    this.garage = { ...this.garage, kind };
    this.net.kind = kind;
    this.disposeVehicleMesh(this.player);
    const mesh = createVehicle(kind, this.garage.primary, 7, this.garage.accent);
    this.scene.add(mesh);
    this.player = new Vehicle(mesh, this.track.startPosition.clone(), this.track.startHeading, true);
    this.setAiVisible(false);
    this.clearRemotes();
    for (const p of this.lobbyPlayers) {
      if (p.id === this.net.id) continue;
      // Force remotes onto the host-chosen class (personal colors preserved).
      this.spawnRemote({ ...p, kind });
    }
    this.setNetStatus(`Racing · ${this.net.room}`, "ok");
    this.startRace({ trackId: trackId || this.net.trackId || this.trackId });
  }

  private onNetState(players: PlayerPose[]) {
    const now = performance.now();
    const seen = new Set<string>();
    const roomKind: VehicleKind = this.net.kind === "bike" ? "bike" : "car";
    for (const p of players) {
      if (p.id === this.net.id) continue;
      seen.add(p.id);
      const pose = { ...p, kind: roomKind };
      const remote = this.remotes.get(p.id);
      if (remote) remote.push(pose, now);
      else this.spawnRemote(pose);
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

  /** Stable order shared by every client — same grid for everyone. */
  private sortedOnlineIds(): string[] {
    const ids = this.lobbyPlayers.map((p) => p.id);
    if (this.net.id && !ids.includes(this.net.id)) ids.push(this.net.id);
    return [...new Set(ids)].sort();
  }

  private onlineGridSlot(index: number): { t: number; offset: number } {
    const cols = ONLINE_LANE_OFFSETS.length;
    const col = ((index % cols) + cols) % cols;
    const row = Math.floor(Math.max(0, index) / cols);
    return {
      t: ONLINE_START_T - row * ONLINE_ROW_GAP_T,
      offset: ONLINE_LANE_OFFSETS[col]!,
    };
  }

  /**
   * Place every racer on the start line in a neat grid (not smashed / not mid-track).
   * Call on race start and each countdown frame so late pose packets can't drag people away.
   */
  private snapOnlineStartingGrid() {
    if (!this.online || !this.player) return;
    const ids = this.sortedOnlineIds();
    const now = performance.now();

    const myIndex = ids.indexOf(this.net.id);
    if (myIndex >= 0) {
      const slot = this.onlineGridSlot(myIndex);
      const { pos, heading } = this.spawnPose(slot.t, slot.offset);
      this.player.reset(pos, heading);
      this.player.state.speed = 0;
      this.player.state.steerAngle = 0;
      this.player.syncCollision();
      this.resetSticky(this.player);
      this.lastT = this.projectSticky(this.player, this.player.state.position).t;
    }

    for (const [id, remote] of this.remotes) {
      const idx = ids.indexOf(id);
      if (idx < 0) continue;
      const lobby = this.lobbyPlayers.find((p) => p.id === id);
      const slot = this.onlineGridSlot(idx);
      const { pos, heading } = this.spawnPose(slot.t, slot.offset);
      remote.push(
        {
          id,
          name: remote.name,
          color: lobby?.color ?? 0xe4eaf2,
          accent: lobby?.accent,
          kind: this.net.kind === "bike" ? "bike" : "car",
          x: pos.x,
          z: pos.z,
          h: heading,
          s: 0,
          g: "1",
          lap: 1,
        },
        now,
      );
      // Lock interpolation on the grid pose for this frame
      remote.push(
        {
          id,
          name: remote.name,
          color: lobby?.color ?? 0xe4eaf2,
          accent: lobby?.accent,
          kind: this.net.kind === "bike" ? "bike" : "car",
          x: pos.x,
          z: pos.z,
          h: heading,
          s: 0,
          g: "1",
          lap: 1,
        },
        now + 1,
      );
    }
  }

  private disposeVehicleMesh(vehicle: Vehicle | undefined) {
    if (!vehicle) return;
    this.scene.remove(vehicle.mesh);
    vehicle.mesh.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }

  /** Rebuild player + AI meshes from garage (bots match player kind; keep own paint). */
  private applyGarageToWorld(force = false) {
    const next = loadGarage();
    const currentKind = (this.player?.mesh.userData.kind as VehicleKind | undefined) ?? null;
    const currentPrimary = (this.player?.mesh.userData.bodyColor as number | undefined) ?? null;
    const currentAccent = (this.player?.mesh.userData.accentColor as number | undefined) ?? null;
    const unchanged =
      !force &&
      this.player &&
      this.rivals.length === CAR_PALETTE.rivals.length &&
      currentKind === next.kind &&
      currentPrimary === next.primary &&
      currentAccent === next.accent;
    this.garage = next;
    if (unchanged) return;

    const kind = this.garage.kind;
    const playerPos = this.player?.state.position.clone() ?? this.track.startPosition.clone();
    const playerHeading = this.player?.state.heading ?? this.track.startHeading;

    this.disposeVehicleMesh(this.player);
    for (const r of this.rivals) this.disposeVehicleMesh(r.vehicle);

    const playerMesh = createVehicle(kind, this.garage.primary, 7, this.garage.accent);
    this.scene.add(playerMesh);
    this.player = new Vehicle(playerMesh, playerPos, playerHeading, true);

    this.rivals = CAR_PALETTE.rivals.map((color, i) => {
      const slot = GRID[i + 1] ?? GRID[GRID.length - 1];
      const accent = CAR_PALETTE.rivalAccents[i] ?? 0xf0f4f8;
      const mesh = createVehicle(kind, color, 11 + i * 3, accent);
      this.scene.add(mesh);
      const { pos, heading } = this.spawnPose(slot.t, slot.offset);
      return new RivalAI(new Vehicle(mesh, pos, heading, false), slot.offset, slot.skill, i);
    });
  }

  private spawnVehicles() {
    this.applyGarageToWorld();
  }

  /** @param opts.practice Test Drive — same world, no finish / podium.
   *  @param opts.solo Timed race with no AI rivals.
   *  @param opts.trackId Course to load; AI Start Race should pass a random id. */
  startRace(opts: { practice?: boolean; solo?: boolean; trackId?: string } = {}) {
    this.practice = !!opts.practice;
    this.solo = !!opts.solo && !this.practice;
    const nextId = opts.trackId ?? this.trackId ?? DEFAULT_TRACK_ID;
    this.setActiveTrack(nextId);
    if (!this.online) this.applyGarageToWorld();
    this.setAiVisible(!this.solo && !this.online);
    this.el.overlay.classList.add("hidden");
    this.el.mapSelect.classList.add("hidden");
    this.el.multiplayer.classList.add("hidden");
    this.el.garage.classList.add("hidden");
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
    this.syncTouchControls();
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

    if (this.online) {
      // Shared start-line grid for every human (sorted ids → same slots on all clients)
      this.snapOnlineStartingGrid();
    } else {
      const gridSlot = GRID[0]!;
      const { pos: spawn, heading } = this.spawnPose(gridSlot.t, gridSlot.offset);
      this.player.reset(spawn, heading);
      this.resetSticky(this.player);
      this.lastT = this.projectSticky(this.player, this.player.state.position).t;
    }
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
    this.syncTouchControls();
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
    this.syncTouchControls();
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
    const { w, h } = viewportSize();
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
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
          // Frozen on grid through 3-2-1 — keep online racers on the start line
          if (this.online) {
            this.snapOnlineStartingGrid();
            // Re-apply mesh after snap (remote.update already ran with stale poses)
            for (const remote of this.remotes.values()) {
              remote.update(now, this.camera, this.renderer);
            }
          }
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
              kind: this.net.kind || this.garage.kind,
              color: this.garage.primary,
              accent: this.garage.accent,
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
    const { w, h } = viewportSize();
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
    // Clear speed HUD; on touch, also clear the on-screen pedals
    const bottomPad = Math.floor(
      Math.min(this.touchMode ? 200 : 118, h * (this.touchMode ? 0.28 : 0.155)),
    );
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
    this.syncTouchControls();
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
    this.syncTouchControls();
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
