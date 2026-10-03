/**
 * Best-race ghost — local replay of your fastest full race on a track+vehicle.
 * One recording per map + car/bike, shared across solo / AI / multiplayer.
 * Beating that full-race time replaces it; Settings → RESET clears them.
 */
import * as THREE from "three";
import {
  applyGhostAppearance,
  createVehicle,
  disposeVehicleGroup,
  stripVehicleSpotLights,
} from "./car";
import type { VehicleKind } from "./garage";
import { projectOnTrack } from "./track";
import { VISUAL_RIDE_Y } from "./vehicle";

const STORAGE_PREFIX = "racer-ghost-v1";
const SAMPLE_MS = 50;
/** Cap ~5 minutes @ 20 Hz so localStorage stays sane. */
const MAX_SAMPLES = 6_000;
const GHOST_OPACITY = 0.42;
/** Post-finish cruise (~48 km/h) — same vibe as finished AI cars. */
const COAST_CRUISE_MS = 13.3;
const COAST_DECEL = 9;

export type GhostKind = "car" | "bike";

export type GhostSample = {
  /** ms since GO */
  t: number;
  x: number;
  z: number;
  h: number;
};

export type GhostRecording = {
  v: 1;
  trackId: string;
  kind: GhostKind;
  timeMs: number;
  samples: GhostSample[];
};

function storageKey(trackId: string, kind: GhostKind): string {
  return `${STORAGE_PREFIX}-${trackId}-${kind}`;
}

export function toGhostKind(kind: VehicleKind | string | undefined): GhostKind | null {
  if (kind === "bike") return "bike";
  if (kind === "car") return "car";
  return null;
}

function wrapHeading(h: number): number {
  const twoPi = Math.PI * 2;
  let x = h % twoPi;
  if (x < 0) x += twoPi;
  return x;
}

function wrapPi(dh: number): number {
  let x = dh;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function loadGhostRecording(trackId: string, kind: GhostKind): GhostRecording | null {
  try {
    const raw = localStorage.getItem(storageKey(trackId, kind));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GhostRecording>;
    if (parsed.v !== 1 || parsed.trackId !== trackId || parsed.kind !== kind) return null;
    if (!Number.isFinite(parsed.timeMs) || (parsed.timeMs as number) <= 0) return null;
    if (!Array.isArray(parsed.samples) || parsed.samples.length < 2) return null;
    const samples: GhostSample[] = [];
    for (const row of parsed.samples) {
      if (!row || typeof row !== "object") continue;
      const s = row as Partial<GhostSample>;
      if (
        !Number.isFinite(s.t) ||
        !Number.isFinite(s.x) ||
        !Number.isFinite(s.z) ||
        !Number.isFinite(s.h)
      ) {
        continue;
      }
      samples.push({
        t: Math.max(0, Math.round(s.t as number)),
        x: s.x as number,
        z: s.z as number,
        h: wrapHeading(s.h as number),
      });
    }
    if (samples.length < 2) return null;
    return { v: 1, trackId, kind, timeMs: Math.round(parsed.timeMs as number), samples };
  } catch {
    return null;
  }
}

export function saveGhostRecording(rec: GhostRecording): boolean {
  if (rec.samples.length < 2 || rec.timeMs <= 0) return false;
  try {
    localStorage.setItem(storageKey(rec.trackId, rec.kind), JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

/** Wipe every stored best-race ghost (Settings → RESET). */
export function clearAllGhostRecordings(): number {
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${STORAGE_PREFIX}-`)) keys.push(k);
    }
    for (const k of keys) {
      localStorage.removeItem(k);
      removed += 1;
    }
  } catch {
    /* private mode */
  }
  return removed;
}

/** Keep the recording only when this full-race time beats the stored best. */
export function maybeSaveBestGhost(opts: {
  trackId: string;
  kind: GhostKind;
  timeMs: number;
  samples: GhostSample[];
}): boolean {
  const timeMs = Math.round(opts.timeMs);
  if (!Number.isFinite(timeMs) || timeMs <= 0 || opts.samples.length < 2) return false;
  const prev = loadGhostRecording(opts.trackId, opts.kind);
  if (prev && prev.timeMs <= timeMs) return false;
  return saveGhostRecording({
    v: 1,
    trackId: opts.trackId,
    kind: opts.kind,
    timeMs,
    samples: opts.samples.slice(0, MAX_SAMPLES),
  });
}

/** Live recorder — call `push` after GO while the race clock runs. */
export class GhostRecorder {
  private samples: GhostSample[] = [];
  private lastSampleAt = -SAMPLE_MS;

  reset() {
    this.samples = [];
    this.lastSampleAt = -SAMPLE_MS;
  }

  push(elapsedMs: number, x: number, z: number, h: number) {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return;
    if (this.samples.length >= MAX_SAMPLES) return;
    if (elapsedMs - this.lastSampleAt < SAMPLE_MS && this.samples.length > 0) return;
    this.lastSampleAt = elapsedMs;
    this.samples.push({
      t: Math.round(elapsedMs),
      x,
      z,
      h: wrapHeading(h),
    });
  }

  snapshot(): GhostSample[] {
    return this.samples.slice();
  }

  get length(): number {
    return this.samples.length;
  }
}

/** Semi-transparent vehicle that follows a stored best-race trail by race clock. */
export class GhostPlayer {
  readonly mesh: THREE.Group;
  private samples: GhostSample[] = [];
  private scene: THREE.Scene;
  private path: THREE.CatmullRomCurve3;
  private finishMs: number;
  private visibleWanted = true;
  private coasting = false;
  private coastT = 0;
  private coastSpeed = COAST_CRUISE_MS;
  private lastElapsed = -1;
  private readonly _pos = new THREE.Vector3();
  private readonly _tan = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    kind: GhostKind,
    color: number,
    accent: number,
    recording: GhostRecording,
    path: THREE.CatmullRomCurve3,
  ) {
    this.scene = scene;
    this.path = path;
    this.finishMs = Math.max(1, recording.timeMs);
    this.mesh = createVehicle(kind, color, 13, accent);
    stripVehicleSpotLights(this.mesh);
    applyGhostAppearance(this.mesh, GHOST_OPACITY);
    this.mesh.name = "ghost-racer";
    this.samples = recording.samples;
    const first = this.samples[0]!;
    this.mesh.position.set(first.x, VISUAL_RIDE_Y, first.z);
    this.mesh.rotation.y = first.h;
    this.mesh.rotation.z = 0;
    scene.add(this.mesh);
  }

  setVisible(on: boolean) {
    this.visibleWanted = on;
    this.mesh.visible = on;
  }

  /**
   * Drive the ghost with ms since GO.
   * After the recorded finish, slows and keeps looping the track (no freeze on the line).
   */
  update(elapsedMs: number) {
    if (!this.visibleWanted || this.samples.length === 0) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    const t = Math.max(0, elapsedMs);
    const raceDt =
      this.lastElapsed < 0 ? 0 : Math.min(0.05, Math.max(0, (t - this.lastElapsed) / 1000));
    this.lastElapsed = t;

    const lastSampleT = this.samples[this.samples.length - 1]!.t;
    const pastFinish = t >= this.finishMs || t >= lastSampleT;
    if (pastFinish) {
      this.updateCoast(raceDt);
      return;
    }

    this.coasting = false;
    this.placeFromSamples(t);
  }

  private placeFromSamples(t: number) {
    const samples = this.samples;
    let i = 1;
    while (i < samples.length && samples[i]!.t < t) i += 1;
    const b = samples[i]!;
    const a = samples[i - 1]!;
    const span = Math.max(1, b.t - a.t);
    const u = Math.min(1, Math.max(0, (t - a.t) / span));
    this.mesh.position.set(
      a.x + (b.x - a.x) * u,
      VISUAL_RIDE_Y,
      a.z + (b.z - a.z) * u,
    );
    this.mesh.rotation.y = wrapHeading(a.h + wrapPi(b.h - a.h) * u);
    this.mesh.rotation.z = 0;
  }

  private beginCoast() {
    const last = this.samples[this.samples.length - 1]!;
    const prev = this.samples[this.samples.length - 2] ?? last;
    const dist = Math.hypot(last.x - prev.x, last.z - prev.z);
    const spanSec = Math.max(0.05, (last.t - prev.t) / 1000);
    this.coastSpeed = Math.max(COAST_CRUISE_MS, Math.min(40, dist / spanSec));
    this._pos.set(last.x, 0, last.z);
    this.coastT = projectOnTrack(this.path, this._pos).t;
    this.coasting = true;
  }

  private updateCoast(dt: number) {
    if (!this.coasting) this.beginCoast();
    if (dt <= 0) {
      this.path.getPointAt(this.coastT, this._pos);
      this.path.getTangentAt(this.coastT, this._tan);
      this.mesh.position.set(this._pos.x, VISUAL_RIDE_Y, this._pos.z);
      this.mesh.rotation.y = Math.atan2(this._tan.x, this._tan.z);
      this.mesh.rotation.z = 0;
      return;
    }
    if (this.coastSpeed > COAST_CRUISE_MS) {
      this.coastSpeed = Math.max(COAST_CRUISE_MS, this.coastSpeed - COAST_DECEL * dt);
    } else {
      this.coastSpeed = COAST_CRUISE_MS;
    }
    const len = Math.max(1, this.path.getLength());
    this.coastT = (this.coastT + (this.coastSpeed * dt) / len) % 1;
    if (this.coastT < 0) this.coastT += 1;
    this.path.getPointAt(this.coastT, this._pos);
    this.path.getTangentAt(this.coastT, this._tan);
    this.mesh.position.set(this._pos.x, VISUAL_RIDE_Y, this._pos.z);
    this.mesh.rotation.y = Math.atan2(this._tan.x, this._tan.z);
    this.mesh.rotation.z = 0;
  }

  dispose() {
    this.scene.remove(this.mesh);
    disposeVehicleGroup(this.mesh);
    this.samples = [];
  }
}
