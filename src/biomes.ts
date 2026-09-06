/** Visual environment themes — one per course. */

export type BiomeId =
  | "forest"
  | "coast"
  | "alpine"
  | "meadow"
  | "canyon"
  | "urban"
  | "yard"
  | "autumn"
  | "volcano"
  | "swamp"
  | "neon"
  | "rainforest"
  | "docks"
  | "savanna"
  | "arctic";

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
  vegetation:
    | "trees"
    | "pines"
    | "palms"
    | "cactus"
    | "sparse"
    | "autumn"
    | "cypress"
    | "rainforest"
    | "acacia"
    | "none";
  props:
    | "none"
    | "rocks"
    | "mesas"
    | "water"
    | "swamp"
    | "lights"
    | "mountains"
    | "city"
    | "canyon"
    | "yard"
    | "lava"
    | "docks"
    | "neon"
    | "ice";
  /** Optional dry-weather sky clear color. */
  sky?: number;
  /** Optional fog color (defaults to sky). */
  fog?: number;
  hemiSky?: number;
  hemiGround?: number;
  /** Keep street/neon lamps bright even when weather is dry. */
  lampDayBoost?: boolean;
  /** Murky / tinted water (swamp) — defaults to coastal blue. */
  water?: number;
};

/** Dry-weather sky / lamp overrides derived from a biome. */
export type BiomeAtmosphere = {
  sky: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  /** Multiplier on dry sun intensity (neon/arctic dim the sun). */
  sunScale?: number;
  fogNear?: number;
  fogFar?: number;
  /**
   * 0 = full day palette from sky/hemi; 1 = blend toward night preset.
   * ≥0.45 keeps trackside neon/street lamps lit in dry weather.
   */
  nightBias?: number;
  /** Keep street/neon lamps bright even when weather is dry. */
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
    sunScale: biome.lampDayBoost ? 0.45 : biome.id === "volcano" ? 0.7 : 1,
    fogNear: biome.lampDayBoost ? 100 : biome.id === "swamp" ? 90 : undefined,
    fogFar: biome.id === "swamp" ? 380 : undefined,
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
  // Autumn Highlands — golden hour, orange canopy, distant peaks
  autumn: {
    id: "autumn",
    ground: 0x6a7a3a,
    runoff: 0xc4a070,
    asphalt: 0x5a5e64,
    edge: 0xf2e8d8,
    density: 0.85,
    vegetation: "autumn",
    props: "mountains",
    sky: 0xc4a878,
    fog: 0xb8a890,
    hemiSky: 0xffe0b0,
    hemiGround: 0x5a4a30,
  },
  // Volcano Rim — ash ground, lava glow props, hot sky
  volcano: {
    id: "volcano",
    ground: 0x2a2422,
    runoff: 0x4a3a32,
    asphalt: 0x3a3634,
    edge: 0xe8a060,
    density: 0.4,
    vegetation: "none",
    props: "lava",
    sky: 0x3a2824,
    fog: 0x4a3028,
    hemiSky: 0xff8040,
    hemiGround: 0x201010,
  },
  // Swamp Bayou — murky greens, cypress, dark water
  swamp: {
    id: "swamp",
    ground: 0x3a5038,
    runoff: 0x5a6a48,
    asphalt: 0x3a3e42,
    edge: 0xd0c8b0,
    density: 0.7,
    vegetation: "cypress",
    props: "swamp",
    sky: 0x6a7078,
    fog: 0x7a8480,
    hemiSky: 0xa8b0a8,
    hemiGround: 0x2a3828,
    water: 0x1a3a32,
  },
  // Night Neon Strip — magenta/cyan city night
  neon: {
    id: "neon",
    ground: 0x12101a,
    runoff: 0x2a2438,
    asphalt: 0x1a1822,
    edge: 0xff2ec8,
    density: 0.2,
    vegetation: "none",
    props: "neon",
    sky: 0x08061a,
    fog: 0x120e28,
    hemiSky: 0x6040a0,
    hemiGround: 0x100818,
    lampDayBoost: true,
  },
  // Rainforest Canopy — deep greens, dense tropical stand
  rainforest: {
    id: "rainforest",
    ground: 0x2d5a28,
    runoff: 0x4a6a38,
    asphalt: 0x4a4e52,
    edge: 0xe8f0e0,
    density: 1,
    vegetation: "rainforest",
    props: "none",
    sky: 0x88a898,
    fog: 0x7a9888,
    hemiSky: 0xd0e8c8,
    hemiGround: 0x1a3a20,
  },
  // Industrial Docks — slate, containers, cool overcast
  docks: {
    id: "docks",
    ground: 0x3a4248,
    runoff: 0x5a6268,
    asphalt: 0x34383c,
    edge: 0xf0a020,
    density: 0.25,
    vegetation: "none",
    props: "docks",
    sky: 0x5a6574,
    fog: 0x6a7380,
    hemiSky: 0xc0c8d4,
    hemiGround: 0x2a3038,
  },
  // Savanna — golden grass, acacia, warm rock
  savanna: {
    id: "savanna",
    ground: 0xc5a858,
    runoff: 0xd8c078,
    asphalt: 0x5a5854,
    edge: 0xf5f0e0,
    density: 0.32,
    vegetation: "acacia",
    props: "rocks",
    sky: 0xe8b878,
    fog: 0xd8b898,
    hemiSky: 0xffe0a8,
    hemiGround: 0x6a5030,
  },
  // Arctic Night — snow/ice, aurora-ish sky, icy props
  arctic: {
    id: "arctic",
    ground: 0xd8e4f0,
    runoff: 0xb0c4d8,
    asphalt: 0x3a4250,
    edge: 0x60e0ff,
    density: 0.35,
    vegetation: "none",
    props: "ice",
    sky: 0x0a1428,
    fog: 0x102038,
    hemiSky: 0x40c878,
    hemiGround: 0x0a1828,
    lampDayBoost: true,
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
  "autumn-highlands": "autumn",
  "volcano-rim": "volcano",
  "swamp-bayou": "swamp",
  "night-neon-strip": "neon",
  "neon-strip": "neon",
  "rainforest-canopy": "rainforest",
  "industrial-docks": "docks",
  savanna: "savanna",
  "arctic-night": "arctic",
  "cove-crossover": "coast",
  "prairie-ribbon": "meadow",
};

export function biomeForTrack(trackIdOrBiome: string): BiomeStyle {
  if (trackIdOrBiome in BIOMES) return BIOMES[trackIdOrBiome as BiomeId];
  const id = TRACK_BIOMES[trackIdOrBiome] ?? "forest";
  return BIOMES[id];
}
