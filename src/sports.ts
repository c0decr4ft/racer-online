/** Multi-sport hub — driving is the original racer; the rest are trick/run sports. */

export type SportId = "driving" | "skiing" | "motocross" | "biking" | "skate";

export type SportDef = {
  id: SportId;
  /** Button label on the hub. */
  label: string;
  /** Short hub blurb. */
  blurb: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  tagline: string;
  startLabel: string;
  testLabel: string;
  soloLabel: string;
  garageHint: string;
  garageKindLabel: string;
  /** Leaderboard / room track id (not a racing circuit). */
  boardId: string;
  /** Hub card accent. */
  color: string;
  /** Hub card wash. */
  wash: string;
};

export const SPORTS: readonly SportDef[] = [
  {
    id: "driving",
    label: "DRIVING",
    blurb: "Cars, bikes, circuits",
    eyebrow: "READY TO RACE",
    title: "SATS",
    titleAccent: "RACER",
    tagline: "Cars & bikes · AI rivals · sats racer rooms",
    startLabel: "START RACE",
    testLabel: "TEST DRIVE",
    soloLabel: "SOLO RACE",
    garageHint: "Cars race cars · bikes race bikes",
    garageKindLabel: "RIDE",
    boardId: "",
    color: "#ff3b2e",
    wash: "rgba(255, 59, 46, 0.55)",
  },
  {
    id: "skiing",
    label: "SKIING",
    blurb: "Carve, jump, trick",
    eyebrow: "FRESH TRACKS",
    title: "SATS",
    titleAccent: "SKI",
    tagline: "Sweep the slope · land tricks · climb the board",
    startLabel: "START RUN",
    testLabel: "FREE SKI",
    soloLabel: "SOLO RUN",
    garageHint: "Paint your suit and skis",
    garageKindLabel: "SKIS",
    boardId: "sport-ski",
    color: "#5ad7ff",
    wash: "rgba(70, 180, 255, 0.5)",
  },
  {
    id: "motocross",
    label: "MOTOCROSS",
    blurb: "Whoops, jumps, dirt",
    eyebrow: "GATES UP",
    title: "SATS",
    titleAccent: "MX",
    tagline: "Dirt jumps · air time · first to the finish",
    startLabel: "START MOTO",
    testLabel: "PRACTICE",
    soloLabel: "SOLO MOTO",
    garageHint: "Paint your motocross bike",
    garageKindLabel: "MX BIKE",
    boardId: "sport-mx",
    color: "#ff8a1a",
    wash: "rgba(255, 120, 20, 0.5)",
  },
  {
    id: "biking",
    label: "BIKING",
    blurb: "Pedal, jump, whip",
    eyebrow: "PEDAL TO WIN",
    title: "SATS",
    titleAccent: "BIKE",
    tagline: "Downhill BMX · manuals · big-air tricks",
    startLabel: "START RIDE",
    testLabel: "TEST RIDE",
    soloLabel: "SOLO RIDE",
    garageHint: "Paint your BMX",
    garageKindLabel: "BMX",
    boardId: "sport-bike",
    color: "#3dff8a",
    wash: "rgba(40, 220, 110, 0.48)",
  },
  {
    id: "skate",
    label: "SKATE",
    blurb: "Ollie, flip, grind",
    eyebrow: "DROP IN",
    title: "SATS",
    titleAccent: "SKATE",
    tagline: "Park lines · flips · rails · points for style",
    startLabel: "START SESSION",
    testLabel: "FREE SKATE",
    soloLabel: "SOLO SESSION",
    garageHint: "Paint your deck and fit",
    garageKindLabel: "DECK",
    boardId: "sport-skate",
    color: "#ff4ad8",
    wash: "rgba(255, 70, 200, 0.48)",
  },
] as const;

export const SPORT_BOARD_IDS = SPORTS.map((s) => s.boardId).filter(Boolean);

export function isSportId(raw: unknown): raw is SportId {
  return SPORTS.some((s) => s.id === raw);
}

export function sportById(id: SportId): SportDef {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0]!;
}

export function isPointsBoard(trackId: string): boolean {
  return SPORT_BOARD_IDS.includes(trackId);
}

export function boardIdForSport(id: SportId): string {
  const def = sportById(id);
  return def.boardId || "forest-loop";
}

const STORAGE_KEY = "sats-active-sport";

export function loadActiveSport(): SportId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isSportId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveActiveSport(id: SportId | null) {
  try {
    if (!id) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
