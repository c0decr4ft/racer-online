/** Visual environment themes — one per course. */

export type BiomeId =
  | "forest"
  | "coast"
  | "alpine"
  | "meadow"
  | "canyon"
  | "urban"
  | "yard";

export type BiomeStyle = {
  id: BiomeId;
  /** Ground / “grass” plane. */
  ground: number;
  /** Shoulder / runoff ribbon. */
  runoff: number;
  asphalt: number;
  edge: number;
  /** How densely to plant props (0–1). */
  density: number;
  vegetation: "trees" | "pines" | "palms" | "cactus" | "sparse" | "none";
  props: "none" | "water" | "mountains" | "city" | "canyon" | "yard";
  /** Optional dry-weather sky clear color. */
  sky?: number;
  /** Optional fog color (defaults to sky). */
  fog?: number;
  hemiSky?: number;
  hemiGround?: number;
  /** Keep street lamps bright even when weather is dry. */
  lampDayBoost?: boolean;
};

/** Dry-weather sky / lamp overrides derived from a biome. */
export type BiomeAtmosphere = {
  sky: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  /** Multiplier on dry sun intensity. */
  sunScale?: number;
  fogNear?: number;
  fogFar?: number;
  /**
   * 0 = full day palette from sky/hemi; 1 = blend toward night preset.
   * ≥0.45 keeps trackside street lamps lit in dry weather.
   */
  nightBias?: number;
  /** Keep street lamps bright even when weather is dry. */
  lampDayBoost?: boolean;
};

export function atmosphereForBiome(biome: BiomeStyle): BiomeAtmosphere | null {
  if (biome.sky == null && !biome.lampDayBoost) return null;
  const sky = biome.sky ?? 0x87a0bc;
  const nightBias = biome.lampDayBoost ? 0.72 : 0;
  return {
    sky,
    fog: biome.fog ?? sky,
    hemiSky: biome.hemiSky ?? 0xffffff,
    hemiGround: biome.hemiGround ?? 0x4a6040,
    sunColor: biome.lampDayBoost ? 0xb0c4e8 : 0xfff5e6,
    sunScale: biome.lampDayBoost ? 0.45 : 1,
    fogNear: biome.lampDayBoost ? 100 : undefined,
    nightBias,
    lampDayBoost: !!biome.lampDayBoost,
  };
}

export const BIOMES: Record<BiomeId, BiomeStyle> = {
  forest: {
    id: "forest",
    ground: 0x4aa83a,
    runoff: 0xd4b896,
    asphalt: 0x6a6e74,
    edge: 0xf4f6f8,
    density: 1,
    vegetation: "trees",
    props: "none",
  },
  coast: {
    id: "coast",
    ground: 0xc2b280,
    runoff: 0xe8d9b0,
    asphalt: 0x5c636c,
    edge: 0xf0ebe0,
    density: 0.55,
    vegetation: "palms",
    props: "water",
  },
  alpine: {
    id: "alpine",
    ground: 0x5a6e62,
    runoff: 0xa8aeb4,
    asphalt: 0x4e545c,
    edge: 0xf2f6fa,
    density: 0.62,
    vegetation: "pines",
    props: "mountains",
  },
  meadow: {
    id: "meadow",
    ground: 0x8fbc4a,
    runoff: 0xd8c48a,
    asphalt: 0x6a6e74,
    edge: 0xf7f2e4,
    density: 0.28,
    vegetation: "sparse",
    props: "none",
  },
  canyon: {
    id: "canyon",
    ground: 0xb86a32,
    runoff: 0xd9a066,
    asphalt: 0x5a5048,
    edge: 0xf0dcc0,
    density: 0.35,
    vegetation: "cactus",
    props: "canyon",
  },
  urban: {
    id: "urban",
    ground: 0x3a4048,
    runoff: 0x6a7078,
    asphalt: 0x3a3e44,
    edge: 0xf0c020,
    density: 0.15,
    vegetation: "none",
    props: "city",
  },
  yard: {
    id: "yard",
    ground: 0x8a7348,
    runoff: 0xb89a6a,
    asphalt: 0x4a4e54,
    edge: 0xf5a012,
    density: 0.35,
    vegetation: "none",
    props: "yard",
  },
};

/** Map track id → biome. */
export const TRACK_BIOMES: Record<string, BiomeId> = {
  "forest-loop": "forest",
  "harbor-circuit": "coast",
  "summit-pass": "alpine",
  "meadow-sweep": "meadow",
  "canyon-cut": "canyon",
  "oval-circuit": "urban",
  "yard-drift": "yard",
};

export function biomeForTrack(trackIdOrBiome: string): BiomeStyle {
  if (trackIdOrBiome in BIOMES) return BIOMES[trackIdOrBiome as BiomeId];
  const id = TRACK_BIOMES[trackIdOrBiome] ?? "forest";
  return BIOMES[id];
}
