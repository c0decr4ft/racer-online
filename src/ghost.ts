/**
 * Best-race ghost — local replay of your fastest full race on a track+vehicle.
 * Not best-lap: the whole race clock (GO → finish) must beat the stored timeMs.
 */
import * as THREE from "three";
import {
  applyGhostAppearance,
  createVehicle,
  disposeVehicleGroup,
  stripVehicleSpotLights,
} from "./car";
import type { VehicleKind } from "./garage";
import { VISUAL_RIDE_Y } from "./vehicle";

const STORAGE_PREFIX = "racer-ghost-v1";
const SAMPLE_MS = 50;
/** Cap ~5 minutes @ 20 Hz so localStorage stays sane. */
const MAX_SAMPLES = 6_000;
const GHOST_OPACITY = 0.42;

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
  private visibleWanted = true;

  constructor(
    scene: THREE.Scene,
    kind: GhostKind,
    color: number,
    accent: number,
    recording: GhostRecording,
  ) {
    this.scene = scene;
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

  /** Drive the ghost with ms since GO (same clock as the live race). */
  update(elapsedMs: number) {
    if (!this.visibleWanted || this.samples.length === 0) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    const samples = this.samples;
    const t = Math.max(0, elapsedMs);
    const last = samples[samples.length - 1]!;
    if (t >= last.t) {
      this.mesh.position.set(last.x, VISUAL_RIDE_Y, last.z);
      this.mesh.rotation.y = last.h;
      this.mesh.rotation.z = 0;
      return;
    }
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

  dispose() {
    this.scene.remove(this.mesh);
    disposeVehicleGroup(this.mesh);
    this.samples = [];
  }
}
