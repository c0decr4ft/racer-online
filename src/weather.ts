import * as THREE from "three";
import { setVehicleHeadlights } from "./car";

export type WeatherMode = "dry" | "night" | "rain";

type Atmosphere = {
  clear: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  exposure: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  ambient: number;
  sunColor: number;
  sunIntensity: number;
  sunPos: [number, number, number];
  asphalt: number;
  asphaltRough: number;
  grass: number;
  runoff: number;
  /** 1 = dry grip, lower = wetter / looser. */
  grip: number;
};

const PRESETS: Record<WeatherMode, Atmosphere> = {
  dry: {
    clear: 0x87a0bc,
    fog: 0x87a0bc,
    fogNear: 160,
    fogFar: 520,
    exposure: 1.2,
    hemiSky: 0xffffff,
    hemiGround: 0x4a6040,
    hemiIntensity: 0.9,
    ambient: 0.4,
    sunColor: 0xfff5e6,
    sunIntensity: 1.85,
    sunPos: [40, 80, 20],
    asphalt: 0x6a6e74,
    asphaltRough: 0.92,
    grass: 0x4aa83a,
    runoff: 0xd4b896,
    grip: 1,
  },
  night: {
    clear: 0x070b14,
    fog: 0x0a1220,
    fogNear: 110,
    fogFar: 480,
    exposure: 0.95,
    hemiSky: 0x3a4a6a,
    hemiGround: 0x101820,
    hemiIntensity: 0.35,
    ambient: 0.18,
    sunColor: 0xb0c4e8,
    sunIntensity: 0.65,
    sunPos: [-30, 55, 40],
    asphalt: 0x3a3e46,
    asphaltRough: 0.88,
    grass: 0x1e3a22,
    runoff: 0x5a4a38,
    grip: 0.96,
  },
  rain: {
    clear: 0x5a6574,
    fog: 0x6a7380,
    fogNear: 70,
    fogFar: 320,
    exposure: 1.05,
    hemiSky: 0xc0c8d4,
    hemiGround: 0x3a4840,
    hemiIntensity: 0.55,
    ambient: 0.32,
    sunColor: 0xd8dde8,
    sunIntensity: 0.7,
    sunPos: [20, 90, 10],
    asphalt: 0x4a5058,
    asphaltRough: 0.35,
    grass: 0x2f6a34,
    runoff: 0x8a7a62,
    grip: 0.78,
  },
};

const WEATHER_POOL: WeatherMode[] = ["dry", "night", "rain"];

let surfaceGrip = 1;

export function getSurfaceGrip(): number {
  return surfaceGrip;
}

/** Coerce wire / UI values to a known mode (default dry). */
export function normalizeWeatherMode(raw: unknown): WeatherMode {
  const m = String(raw ?? "").toLowerCase();
  return m === "night" || m === "rain" ? m : "dry";
}

/**
 * Apply a wire weather field only when present.
 * Missing/empty values keep `prior` so a start packet without weather
 * cannot wipe the room choice already stored from welcome/lobby.
 */
export function applyWireWeather(raw: unknown, prior: WeatherMode): WeatherMode {
  if (raw == null || raw === "") return prior;
  return normalizeWeatherMode(raw);
}

/** Solo/practice: random (or seeded) dry / night / rain. Online uses host choice. */
export function pickWeather(seed?: string): WeatherMode {
  if (!seed) {
    return WEATHER_POOL[Math.floor(Math.random() * WEATHER_POOL.length)]!;
  }
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return WEATHER_POOL[Math.abs(h) % WEATHER_POOL.length]!;
}

/**
 * Owns scene lights, fog, rain particles, and surface tinting.
 * Call attach from buildWorld, then setMode() when a race starts.
 */
export class WeatherController {
  mode: WeatherMode = "dry";
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private hemi: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;
  private rain: THREE.Points | null = null;
  private rainVel: Float32Array | null = null;
  private trackRoot: THREE.Object3D | null = null;
  /** Cached street PointLights — toggled by night + distance (not full traverse each frame). */
  private nightLamps: THREE.PointLight[] = [];
  private lastHeadlightsOn: boolean | null = null;
  private lastHeadlightMesh: THREE.Group | null = null;
  private lastNightLampActive: boolean | null = null;
  /** Light camera-local rain (~320 pts) — visible without the old 900–1400 hitch. */
  private particlesEnabled = true;
  private static readonly RAIN_COUNT = 320;
  private static readonly RAIN_SPREAD = 48;
  /** Only street PointLights near the camera contribute (emissive bulbs stay on). */
  private static readonly NIGHT_LAMP_RANGE_SQ = 85 * 85;
  private readonly _tintScratch = new THREE.Color();
  private readonly _tintMix = new THREE.Color();
  /** Continuous follow aim (lerped); quantized only when writing the light. */
  private readonly _sunFollow = new THREE.Vector3();
  private _sunFollowReady = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    lights: {
      hemi: THREE.HemisphereLight;
      ambient: THREE.AmbientLight;
      sun: THREE.DirectionalLight;
    },
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.hemi = lights.hemi;
    this.ambient = lights.ambient;
    this.sun = lights.sun;
    // Target must live in the scene so shadow-camera matrixWorld updates.
    if (!this.sun.target.parent) this.scene.add(this.sun.target);
  }

  setTrackRoot(root: THREE.Object3D | null) {
    this.trackRoot = root;
    this.nightLamps = [];
    this.lastNightLampActive = null;
    if (root) {
      root.traverse((obj) => {
        if (obj instanceof THREE.PointLight && obj.userData.nightLamp) {
          this.nightLamps.push(obj);
        }
      });
    }
    this.tintSurfaces(PRESETS[this.mode]);
    this.applyNightLamps(this.mode === "night");
  }

  setMode(mode: WeatherMode) {
    this.mode = mode === "night" || mode === "rain" ? mode : "dry";
    surfaceGrip = PRESETS[this.mode].grip;
    this.lastHeadlightsOn = null;
    this.lastNightLampActive = null;
    this.applyAtmosphere();
  }

  setParticlesEnabled(on: boolean) {
    this.particlesEnabled = on;
    if (!on) {
      if (this.rain) this.rain.visible = false;
      return;
    }
    if (this.mode === "rain") this.ensureRain(true);
  }

  /**
   * Rain particles + night headlights.
   * Player gets SpotLight beams; `lampMeshes` (AI/remotes) get emissive lamps only.
   * `preview` (create-room / lobby): atmosphere rain + night lamps.
   */
  update(
    dt: number,
    playerPos: THREE.Vector3,
    _playerHeading: number,
    active: boolean,
    playerMesh?: THREE.Group,
    opts?: {
      particles?: boolean;
      lampMeshes?: THREE.Group[];
      /** Menu preview — animate rain / night look while not racing. */
      preview?: boolean;
    },
  ) {
    const preview = !!opts?.preview;
    // Night only: on for live sessions (incl. pause) and create-room / lobby preview.
    const lightsOn = this.mode === "night" && (active || preview);
    if (playerMesh) {
      const meshChanged = this.lastHeadlightMesh !== playerMesh;
      if (meshChanged || this.lastHeadlightsOn !== lightsOn) {
        setVehicleHeadlights(playerMesh, lightsOn);
        this.lastHeadlightsOn = lightsOn;
        this.lastHeadlightMesh = playerMesh;
      }
      // SpotLight targets are parented under the car — scene matrixWorld covers them.
    } else if (this.lastHeadlightsOn) {
      // Player mesh gone — clear cache so the next mesh is forced to sync.
      if (this.lastHeadlightMesh) setVehicleHeadlights(this.lastHeadlightMesh, false);
      this.lastHeadlightsOn = false;
      this.lastHeadlightMesh = null;
    }

    // Emissive lamps on field cars — no SpotLights (GPU). Re-apply when a mesh joins mid-race.
    const peers = opts?.lampMeshes;
    if (peers) {
      for (const mesh of peers) {
        if (mesh.userData.headlightsOn !== lightsOn) {
          setVehicleHeadlights(mesh, lightsOn);
        }
      }
    }

    // Street PointLights: only near the player (far poles keep emissive bulbs only).
    if (lightsOn !== this.lastNightLampActive || lightsOn) {
      this.cullNightLamps(lightsOn, playerPos);
      this.lastNightLampActive = lightsOn;
    }

    const wantParticles = this.particlesEnabled && opts?.particles !== false;
    if (this.mode === "rain" && wantParticles && (active || preview)) this.tickRain(dt, playerPos);
    else if (this.rain) this.rain.visible = false;

    // Home/idle menu: leave the sun frustum still (orbit cam doesn't need follow).
    // Live race + lobby weather preview keep the ortho shadow camera on the car.
    if (active || preview) this.placeSun(playerPos, { dt });
  }

  /**
   * Aim the directional light at `at` using the current preset's sunPos as a
   * **fixed world-space** offset (not car-relative). Turning puts the shadow on
   * the sun-lit side of the car — never "trailing behind" the rear.
   *
   * The shadow camera recenters on the player for coverage, but the follow point
   * is smoothed + quantized to shadow-map texels so the frustum doesn't jump.
   */
  placeSun(at: THREE.Vector3, opts?: { dt?: number; snap?: boolean }) {
    const p = PRESETS[this.mode];
    const [ox, oy, oz] = p.sunPos;
    const cam = this.sun.shadow.camera;
    const mapSize = Math.max(1, this.sun.shadow.mapSize.x);
    const halfExtent =
      Math.max(Math.abs(cam.right - cam.left), Math.abs(cam.top - cam.bottom)) * 0.5;
    const texel = (halfExtent * 2) / mapSize;
    const dt = opts?.dt ?? 1 / 60;

    // Smooth toward the player (frame-rate independent), then snap to texel grid.
    // Direction stays world-stable: light = follow + sunPos, target = follow.
    if (opts?.snap || !this._sunFollowReady) {
      this._sunFollow.set(at.x, 0, at.z);
      this._sunFollowReady = true;
    } else {
      // ~12 Hz settle — snappy enough to keep the car in-frustum, soft enough
      // to avoid per-frame ortho pops when the player jerks.
      const alpha = 1 - Math.exp(-Math.max(0, dt) * 12);
      this._sunFollow.x += (at.x - this._sunFollow.x) * alpha;
      this._sunFollow.z += (at.z - this._sunFollow.z) * alpha;
      this._sunFollow.y = 0;
    }

    const qx = Math.round(this._sunFollow.x / texel) * texel;
    const qz = Math.round(this._sunFollow.z / texel) * texel;

    this.sun.target.position.set(qx, 0, qz);
    this.sun.position.set(qx + ox, oy, qz + oz);
    this.sun.target.updateMatrixWorld();
  }

  /** Enable only nearby night PointLights so NUM_POINT_LIGHTS stays small in-shader. */
  private cullNightLamps(on: boolean, playerPos: THREE.Vector3) {
    const rangeSq = WeatherController.NIGHT_LAMP_RANGE_SQ;
    const px = playerPos.x;
    const pz = playerPos.z;
    for (const lamp of this.nightLamps) {
      if (!on) {
        if (lamp.visible || lamp.intensity !== 0) {
          lamp.intensity = 0;
          lamp.visible = false;
        }
        continue;
      }
      const dx = lamp.position.x - px;
      const dz = lamp.position.z - pz;
      const near = dx * dx + dz * dz <= rangeSq;
      const intensity =
        typeof lamp.userData.nightIntensity === "number"
          ? (lamp.userData.nightIntensity as number)
          : 1.6;
      if (near) {
        if (!lamp.visible || lamp.intensity !== intensity) {
          lamp.intensity = intensity;
          lamp.visible = true;
        }
      } else if (lamp.visible || lamp.intensity !== 0) {
        lamp.intensity = 0;
        lamp.visible = false;
      }
    }
  }

  private applyAtmosphere() {
    const p = PRESETS[this.mode];
    this.renderer.setClearColor(p.clear, 1);
    this.renderer.toneMappingExposure = p.exposure;
    this.scene.background = new THREE.Color(p.clear);
    this.scene.fog = new THREE.Fog(p.fog, p.fogNear, p.fogFar);

    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.ambient.intensity = p.ambient;
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    // Re-place with the last follow point (or origin) using the new offset.
    this.placeSun(this._sunFollow);

    this.tintSurfaces(p);
    this.applyNightLamps(this.mode === "night");
    this.ensureRain(this.mode === "rain");
  }

  /**
   * Streetlamps / facade glow: emissive + PointLights tagged in track scenery.
   * Day keeps a faint bulb; night punches them up like vehicle headlights.
   */
  private applyNightLamps(on: boolean) {
    if (!this.trackRoot) return;
    // PointLights are distance-culled in update(); force them off here on day / mode change.
    if (!on) {
      for (const lamp of this.nightLamps) {
        lamp.intensity = 0;
        lamp.visible = false;
      }
      this.lastNightLampActive = false;
    } else {
      // Force a cull pass on the next update (player position known there).
      this.lastNightLampActive = null;
    }
    this.trackRoot.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const raw of mats) {
        if (!(raw instanceof THREE.MeshStandardMaterial)) continue;
        if (!raw.userData.nightLamp) continue;
        const day =
          typeof raw.userData.emissiveDay === "number"
            ? (raw.userData.emissiveDay as number)
            : 0.35;
        const night =
          typeof raw.userData.emissiveNight === "number"
            ? (raw.userData.emissiveNight as number)
            : 5.5;
        raw.emissiveIntensity = on ? night : day;
      }
    });
  }

  /**
   * Wet/night look: prefer mesh userData.baseColor (biome) so weather never
   * flattens course palette to absolute preset greens/greys.
   */
  private tintSurfaces(p: Atmosphere) {
    if (!this.trackRoot) return;
    const mode = this.mode;
    this.trackRoot.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const kind = obj.userData.surface as string | undefined;
      const mat = obj.material;
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;

      const base =
        typeof obj.userData.baseColor === "number"
          ? (obj.userData.baseColor as number)
          : undefined;

      if (kind === "asphalt") {
        mat.color.copy(this.weatherTint(base ?? p.asphalt, mode, "asphalt"));
        mat.roughness = p.asphaltRough;
        mat.metalness = p.asphaltRough < 0.5 ? 0.22 : 0.04;
      } else if (kind === "grass") {
        mat.color.copy(this.weatherTint(base ?? p.grass, mode, "ground"));
      } else if (kind === "runoff") {
        mat.color.copy(this.weatherTint(base ?? p.runoff, mode, "ground"));
      }
    });
  }

  /** Darken / cool a biome base for night & rain; dry leaves base alone. */
  private weatherTint(
    baseHex: number,
    mode: WeatherMode,
    kind: "asphalt" | "ground",
  ): THREE.Color {
    const c = this._tintScratch.setHex(baseHex);
    if (mode === "dry") return c;
    if (mode === "night") {
      c.multiplyScalar(kind === "asphalt" ? 0.52 : 0.42);
      c.lerp(this._tintMix.setHex(0x1a2434), 0.18);
      return c;
    }
    // rain — glossy wet darkening, keep hue from biome
    c.multiplyScalar(kind === "asphalt" ? 0.7 : 0.78);
    c.lerp(this._tintMix.setHex(0x4a5560), kind === "asphalt" ? 0.22 : 0.12);
    return c;
  }

  private ensureRain(on: boolean) {
    if (!on || !this.particlesEnabled) {
      if (this.rain) this.rain.visible = false;
      return;
    }
    if (this.rain) {
      this.rain.visible = true;
      return;
    }
    const count = WeatherController.RAIN_COUNT;
    const spread = WeatherController.RAIN_SPREAD;
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      vel[i] = 16 + Math.random() * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xc5d0dc,
      size: 0.16,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 2;
    this.rainVel = vel;
    this.scene.add(this.rain);
  }

  private tickRain(dt: number, playerPos: THREE.Vector3) {
    if (!this.rain || !this.rainVel) {
      if (this.particlesEnabled) this.ensureRain(true);
      if (!this.rain || !this.rainVel) return;
    }
    this.rain.visible = true;
    this.rain.position.set(playerPos.x, 0, playerPos.z);
    const pos = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const vel = this.rainVel;
    const spread = WeatherController.RAIN_SPREAD;
    const dtClamped = Math.min(dt, 0.05);
    for (let i = 0; i < vel.length; i++) {
      arr[i * 3 + 1]! -= vel[i]! * dtClamped;
      arr[i * 3]! -= 7 * dtClamped;
      if (arr[i * 3 + 1]! < 0) {
        arr[i * 3]! = (Math.random() - 0.5) * spread;
        arr[i * 3 + 1]! = 16 + Math.random() * 12;
        arr[i * 3 + 2]! = (Math.random() - 0.5) * spread;
      }
    }
    pos.needsUpdate = true;
  }
}
