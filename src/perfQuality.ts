/**
 * Internal render quality tiers for weak GPUs (old Linux iGPUs, software Mesa, etc.).
 * Looks and feel stay the same — only shadow resolution, MSAA, and light budgets change.
 */

import * as THREE from "three";

export type PerfTier = "high" | "mid" | "low";

export type PerfSettings = {
  tier: PerfTier;
  antialias: boolean;
  /** Soft PCF vs hard Basic — Soft is costly on iGPUs. */
  softShadows: boolean;
  /** When false, shadow maps are off (broken/ancient GPUs stay playable). */
  shadows: boolean;
  shadowMapSize: number;
  /** Ortho half-extent of the sun shadow camera. */
  shadowFrustum: number;
  nightLampRange: number;
  /** Cap how many street PointLights can be on at once. */
  maxNightLamps: number;
  /** Player SpotLight beams (emissive lenses still glow). */
  headlightBeams: boolean;
  engineSmoke: boolean;
  /** Skip every other wildlife mesh pose update. */
  wildlifeHalfRate: boolean;
  cameraFar: number;
  /** Cap devicePixelRatio (retina + weak GPU). */
  maxPixelRatio: number;
};

const HIGH: PerfSettings = {
  tier: "high",
  antialias: true,
  softShadows: true,
  shadows: true,
  shadowMapSize: 2048,
  shadowFrustum: 70,
  nightLampRange: 85,
  maxNightLamps: 18,
  headlightBeams: true,
  engineSmoke: true,
  wildlifeHalfRate: false,
  cameraFar: 700,
  maxPixelRatio: 1,
};

const MID: PerfSettings = {
  tier: "mid",
  antialias: false,
  softShadows: true,
  shadows: true,
  shadowMapSize: 1024,
  shadowFrustum: 60,
  nightLampRange: 60,
  maxNightLamps: 8,
  headlightBeams: true,
  engineSmoke: true,
  wildlifeHalfRate: true,
  cameraFar: 560,
  maxPixelRatio: 1,
};

const LOW: PerfSettings = {
  tier: "low",
  antialias: false,
  softShadows: false,
  shadows: false,
  shadowMapSize: 512,
  shadowFrustum: 50,
  nightLampRange: 42,
  maxNightLamps: 4,
  headlightBeams: false,
  engineSmoke: false,
  wildlifeHalfRate: true,
  cameraFar: 450,
  maxPixelRatio: 0.85,
};

export function settingsForTier(tier: PerfTier): PerfSettings {
  if (tier === "low") return LOW;
  if (tier === "mid") return MID;
  return HIGH;
}

/** Worse of two tiers (high < mid < low in cost). */
export function worseTier(a: PerfTier, b: PerfTier): PerfTier {
  const rank = { high: 0, mid: 1, low: 2 };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * Probe WebGL without committing the game canvas context.
 * Software renderers and old Intel HD → low; generic Intel iGPU → mid.
 */
export function probeBootPerfTier(): PerfTier {
  try {
    const c = document.createElement("canvas");
    const gl =
      (c.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) as WebGL2RenderingContext | null) ||
      (c.getContext("webgl", { failIfMajorPerformanceCaveat: false }) as WebGLRenderingContext | null);
    if (!gl) return "low";

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "").toLowerCase()
      : "";
    const vendor = dbg
      ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) ?? "").toLowerCase()
      : "";
    const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;

    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();

    // Host / device memory hints (Chromium only) — small machines start mid/low.
    const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
    const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
    const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;

    if (
      /llvmpipe|softpipe|swrast|swiftshader|basic render|microsoft basic|mesa offscreen|virtualbox|vmware|parallels|chromium embedded|apple software|gdi generic/.test(
        renderer,
      )
    ) {
      return "low";
    }
    if (maxTex > 0 && maxTex < 4096) return "low";
    if (mem > 0 && mem <= 2) return "low";
    if (cores > 0 && cores <= 2) return "low";

    const intel = /intel/.test(renderer) || /intel/.test(vendor);
    if (intel) {
      // Classic HD / early UHD — brutal with 2048 soft shadows + MSAA.
      if (
        /hd graphics ([2-5]\d{2}\b|[2-5]\d{3}\b)|hd graphics 2000|hd graphics 3000|hd graphics 4000|hd graphics 5000|hd graphics 510|hd graphics 515|hd graphics 520|hd graphics 530|iris\(r\) graphics 5[45]0|uhd graphics 6[012]0|uhd graphics 605|uhd graphics 610|uhd graphics 615|uhd graphics 617|uhd graphics 620/.test(
          renderer,
        )
      ) {
        return "low";
      }
      // Newer Arc / Iris Xe / late UHD can stay mid (still skip MSAA).
      if (/arc |iris xe|xe graphics|uhd graphics 7|uhd graphics 8/.test(renderer)) {
        return mem <= 4 || cores <= 4 ? "mid" : "mid";
      }
      return "mid";
    }

    // Mobile / thin SoC GPUs in desktop browsers (rare) — keep mid/low.
    if (/mali-|adreno|powervr|apple gpu/.test(renderer) && mem <= 4) return "mid";

    if (
      /radeon r[245]\b|radeon hd |vega [0-9]\b|graphics \(radeon|amd ryzen.*graphics/.test(renderer) &&
      !/radeon rx |rx \d{3,4}/.test(renderer)
    ) {
      return mem <= 4 ? "low" : "mid";
    }

    if (mem <= 4 || cores <= 4) return "mid";
    return "high";
  } catch {
    return "mid";
  }
}

type RendererOpts = {
  canvas: HTMLCanvasElement;
  antialias: boolean;
};

/**
 * Build a WebGLRenderer that works on dual-GPU / flaky drivers.
 * Prefer high-performance; fall back to default preference if that fails.
 */
export function createGameRenderer(opts: RendererOpts): THREE.WebGLRenderer {
  const attempts: THREE.WebGLRendererParameters[] = [
    {
      canvas: opts.canvas,
      antialias: opts.antialias,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
      alpha: false,
      stencil: false,
      depth: true,
    },
    {
      canvas: opts.canvas,
      antialias: false,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
      alpha: false,
      stencil: false,
      depth: true,
    },
    {
      canvas: opts.canvas,
      antialias: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
      alpha: false,
      stencil: false,
      depth: true,
    },
  ];

  let lastError: unknown;
  for (const params of attempts) {
    try {
      const renderer = new THREE.WebGLRenderer(params);
      // Some drivers report a context that immediately dies — probe once.
      const gl = renderer.getContext();
      if (!gl || gl.isContextLost?.()) {
        renderer.dispose();
        continue;
      }
      return renderer;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("WebGL unavailable — try updating your GPU drivers or use another browser");
}

/** Wire context-lost recovery so a driver hiccup doesn't leave a permanent blue canvas. */
export function bindWebglContextRecovery(
  canvas: HTMLCanvasElement,
  onLost: () => void,
  onRestored: () => void,
): void {
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      onLost();
    },
    false,
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      onRestored();
    },
    false,
  );
}
