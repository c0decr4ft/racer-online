import * as THREE from "three";
import { setVehicleHeadlights, syncVehicleHeadlights } from "./car";

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
    fogNear: 90,
    fogFar: 380,
    exposure: 0.95,
    hemiSky: 0x3a4a6a,
    hemiGround: 0x101820,
    hemiIntensity: 0.35,
    ambient: 0.18,
    sunColor: 0xb0c4e8,
    sunIntensity: 0.45,
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

/** Game picks dry / night / rain — no player control. */
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
  private lastHeadlightsOn: boolean | null = null;
  private lastHeadlightMesh: THREE.Group | null = null;
  /** Rain Points are expensive — keep fog/grip only unless explicitly enabled. */
  private particlesEnabled = false;

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
  }

  setTrackRoot(root: THREE.Object3D | null) {
    this.trackRoot = root;
    this.tintSurfaces(PRESETS[this.mode]);
  }

  setMode(mode: WeatherMode) {
    this.mode = mode === "night" || mode === "rain" ? mode : "dry";
    surfaceGrip = PRESETS[this.mode].grip;
    this.lastHeadlightsOn = null;
    this.applyAtmosphere();
  }

  setParticlesEnabled(on: boolean) {
    this.particlesEnabled = on;
    if (!on && this.rain) this.rain.visible = false;
  }

  /** Rain particles + night headlights on the player vehicle. */
  update(
    dt: number,
    playerPos: THREE.Vector3,
    _playerHeading: number,
    active: boolean,
    playerMesh?: THREE.Group,
    opts?: { particles?: boolean },
  ) {
    const lightsOn = this.mode === "night" && active;
    if (playerMesh) {
      const meshChanged = this.lastHeadlightMesh !== playerMesh;
      if (meshChanged || this.lastHeadlightsOn !== lightsOn) {
        setVehicleHeadlights(playerMesh, lightsOn);
        this.lastHeadlightsOn = lightsOn;
        this.lastHeadlightMesh = playerMesh;
      } else if (lightsOn) {
        syncVehicleHeadlights(playerMesh);
      }
    } else if (this.lastHeadlightsOn) {
      this.lastHeadlightsOn = false;
      this.lastHeadlightMesh = null;
    }

    const wantParticles = opts?.particles !== false;
    if (this.mode === "rain" && active && wantParticles) this.tickRain(dt, playerPos);
    else if (this.rain) this.rain.visible = false;
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
    this.sun.position.set(...p.sunPos);

    this.tintSurfaces(p);
    this.ensureRain(this.mode === "rain");
  }

  private tintSurfaces(p: Atmosphere) {
    if (!this.trackRoot) return;
    this.trackRoot.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const kind = obj.userData.surface as string | undefined;
      const mat = obj.material;
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      if (kind === "asphalt") {
        mat.color.setHex(p.asphalt);
        mat.roughness = p.asphaltRough;
        mat.metalness = p.asphaltRough < 0.5 ? 0.22 : 0.04;
      } else if (kind === "grass") {
        mat.color.setHex(p.grass);
      } else if (kind === "runoff") {
        mat.color.setHex(p.runoff);
      }
    });
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
    const count = 900;
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      vel[i] = 14 + Math.random() * 18;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xb8c4d4,
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.rainVel = vel;
    this.scene.add(this.rain);
  }

  private tickRain(dt: number, playerPos: THREE.Vector3) {
    if (!this.rain || !this.rainVel) return;
    this.rain.visible = true;
    this.rain.position.set(playerPos.x, 0, playerPos.z);
    const pos = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const vel = this.rainVel;
    for (let i = 0; i < vel.length; i++) {
      arr[i * 3 + 1]! -= vel[i]! * dt;
      arr[i * 3]! -= 6 * dt;
      if (arr[i * 3 + 1]! < 0) {
        arr[i * 3]! = (Math.random() - 0.5) * 60;
        arr[i * 3 + 1]! = 18 + Math.random() * 12;
        arr[i * 3 + 2]! = (Math.random() - 0.5) * 60;
      }
    }
    pos.needsUpdate = true;
  }
}
