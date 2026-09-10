/**
 * Internal render quality tiers for weak GPUs (old Linux iGPUs, software Mesa, etc.).
 * Looks and feel stay the same — only shadow resolution, MSAA, and light budgets change.
 */

export type PerfTier = "high" | "mid" | "low";

export type PerfSettings = {
  tier: PerfTier;
  antialias: boolean;
  /** Soft PCF vs hard Basic — Soft is costly on iGPUs. */
  softShadows: boolean;
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
};

const HIGH: PerfSettings = {
  tier: "high",
  antialias: true,
  softShadows: true,
  shadowMapSize: 2048,
  shadowFrustum: 70,
  nightLampRange: 85,
  maxNightLamps: 18,
  headlightBeams: true,
  engineSmoke: true,
  wildlifeHalfRate: false,
  cameraFar: 700,
};

const MID: PerfSettings = {
  tier: "mid",
  antialias: false,
  softShadows: true,
  shadowMapSize: 1024,
  shadowFrustum: 60,
  nightLampRange: 60,
  maxNightLamps: 8,
  headlightBeams: true,
  engineSmoke: true,
  wildlifeHalfRate: false,
  cameraFar: 560,
};

const LOW: PerfSettings = {
  tier: "low",
  antialias: false,
  softShadows: false,
  shadowMapSize: 512,
  shadowFrustum: 50,
  nightLampRange: 42,
  maxNightLamps: 4,
  headlightBeams: false,
  engineSmoke: false,
  wildlifeHalfRate: true,
  cameraFar: 450,
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

    if (
      /llvmpipe|softpipe|swrast|swiftshader|basic render|microsoft basic|mesa offscreen|virtualbox|vmware|chromium embedded/.test(
        renderer,
      )
    ) {
      return "low";
    }
    if (maxTex > 0 && maxTex < 4096) return "low";

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
        return "mid";
      }
      return "mid";
    }

    if (
      /radeon r[245]\b|radeon hd |vega [0-9]\b|graphics \(radeon|amd ryzen.*graphics/.test(renderer) &&
      !/radeon rx |rx \d{3,4}/.test(renderer)
    ) {
      return "mid";
    }

    return "high";
  } catch {
    return "mid";
  }
}
