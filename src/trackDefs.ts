/**
 * Named closed-circuit control points (XZ meters). First point ≈ start/finish;
 * CatmullRom closed=true closes the loop. Keep self-clearance ≳30m and corner
 * radii ≳13.5 so a 14m road never overlaps.
 *
 * SF join rule: put start/finish on a straight (or gentle curve) with several
 * evenly spaced control points wrapping the loop so Catmull-Rom tangents match
 * entering/leaving t≈0 — no reverse-bump or kink at the join.
 */
export type TrackDef = {
  id: string;
  name: string;
  /** Control points as [x, z] pairs in world meters. */
  points: readonly (readonly [number, number])[];
};

/** Original circuit — western lobe + main straight (~710m). */
const FOREST_LOOP_RAW: readonly (readonly [number, number])[] = [
  [-10, -58],
  [10, -58],
  [30, -58],
  [46, -58],
  [58, -58],
  [67.3, -56.5],
  [75.6, -52.3],
  [82.3, -45.6],
  [86.5, -37.3],
  [88, -28],
  [88, -8],
  [88, 10],
  [88, 26],
  [86.5, 33.7],
  [82.1, 40.1],
  [75.7, 44.5],
  [68, 46],
  [60.3, 44.5],
  [53.9, 40.1],
  [49.5, 33.7],
  [48, 26],
  [48, 18],
  [48, 10],
  [47, 3.8],
  [44.2, -1.8],
  [39.8, -6.2],
  [34.2, -9],
  [28, -10],
  [16, -10],
  [8, -10],
  [1.2, -8.9],
  [-4.9, -5.8],
  [-9.8, -0.9],
  [-12.9, 5.2],
  [-14, 12],
  [-15.8, 24.3],
  [-21.2, 35.5],
  [-29.6, 44.6],
  [-40.3, 50.9],
  [-52.3, 53.8],
  [-64.7, 53.1],
  [-76.4, 48.7],
  [-86.2, 41.2],
  [-93.4, 31.1],
  [-97.4, 19.3],
  [-98, 14],
  [-100, 6],
  [-104, -2],
  [-110, -10],
  [-116, -18],
  [-120, -28],
  [-122, -38],
  [-118, -48],
  [-110, -54],
  [-98, -57],
  [-86, -58],
  [-76, -58],
  [-70, -58],
  [-56, -58],
  [-44, -58],
  [-32, -58],
];

function scalePts(
  raw: readonly (readonly [number, number])[],
  sx: number,
  sz: number,
): [number, number][] {
  return raw.map(([x, z]) => [x * sx, z * sz]);
}

/**
 * Harbor Circuit — long east–west oval with a mid-south dock chicane (~755m).
 * SF sits mid-south going east; chicane is east of SF so the loop join stays smooth.
 */
const HARBOR_CIRCUIT = scalePts(
  [
    [-45, -46],
    [-15, -46],
    [15, -46],
    [40, -50],
    [58, -56],
    [78, -54],
    [95, -46],
    [118, -38],
    [138, -24],
    [148, -6],
    [148, 12],
    [138, 28],
    [118, 40],
    [92, 46],
    [60, 48],
    [25, 48],
    [-10, 48],
    [-45, 46],
    [-78, 40],
    [-108, 26],
    [-128, 8],
    [-132, -10],
    [-120, -28],
    [-95, -40],
    [-70, -44],
  ],
  1.15,
  1.2,
);

/**
 * Summit Pass — elongated paperclip with twin hairpins + soft east bulge (~693m).
 * SF mid east straight northbound; south hairpin feeds onto that straight before wrap.
 */
const SUMMIT_PASS = scalePts(
  [
    [50, -45],
    [50, -20],
    [50, 5],
    [54, 28],
    [58, 48],
    [54, 68],
    [42, 88],
    [22, 102],
    [0, 108],
    [-22, 102],
    [-40, 85],
    [-48, 60],
    [-50, 32],
    [-50, 5],
    [-50, -22],
    [-50, -48],
    [-44, -72],
    [-28, -92],
    [-4, -102],
    [20, -98],
    [38, -82],
    [48, -62],
  ],
  1.3,
  1.3,
);

/**
 * Meadow Sweep — big flowing left-handers, open parkland (~700m).
 */
const MEADOW_SWEEP = scalePts(
  [
    [-20, -60],
    [10, -60],
    [40, -58],
    [65, -50],
    [85, -35],
    [95, -15],
    [98, 10],
    [90, 32],
    [72, 48],
    [48, 58],
    [20, 62],
    [-10, 60],
    [-38, 52],
    [-60, 38],
    [-75, 18],
    [-82, -5],
    [-78, -28],
    [-65, -45],
    [-45, -55],
  ],
  1.45,
  1.4,
);

/**
 * Canyon Cut — angular stepped circuit with western inset (~736m).
 * SF on south straight; SW corner settles onto z=-55 before the loop join.
 */
const CANYON_CUT = scalePts(
  [
    [-70, -55],
    [-40, -55],
    [-10, -55],
    [20, -55],
    [50, -52],
    [72, -40],
    [80, -20],
    [80, 5],
    [75, 30],
    [58, 48],
    [30, 58],
    [-5, 60],
    [-35, 52],
    [-50, 35],
    [-52, 10],
    [-48, -8],
    [-62, -20],
    [-82, -18],
    [-98, -2],
    [-102, 20],
    [-95, 40],
    [-110, 50],
    [-126, 40],
    [-134, 18],
    [-132, -8],
    [-122, -28],
    [-112, -42],
    [-102, -50],
    [-90, -54],
    [-80, -55],
  ],
  1.05,
  1.1,
);

/**
 * Twin Lakes — peanut / dual lobe with wide north–south necks (~760m).
 */
const TWIN_LAKES = scalePts(
  [
    [20, -50],
    [40, -52],
    [60, -48],
    [78, -35],
    [88, -15],
    [90, 8],
    [82, 28],
    [65, 42],
    [45, 50],
    [25, 48],
    [5, 42],
    [-15, 42],
    [-35, 48],
    [-55, 50],
    [-75, 42],
    [-90, 25],
    [-95, 5],
    [-90, -18],
    [-75, -38],
    [-55, -48],
    [-35, -50],
    [-15, -48],
    [5, -48],
  ],
  1.55,
  1.55,
);

export const TRACKS: TrackDef[] = [
  {
    id: "forest-loop",
    name: "Forest Loop",
    points: scalePts(FOREST_LOOP_RAW, 1.07, 1.15),
  },
  {
    id: "harbor-circuit",
    name: "Harbor Circuit",
    points: HARBOR_CIRCUIT,
  },
  {
    id: "summit-pass",
    name: "Summit Pass",
    points: SUMMIT_PASS,
  },
  {
    id: "meadow-sweep",
    name: "Meadow Sweep",
    points: MEADOW_SWEEP,
  },
  {
    id: "canyon-cut",
    name: "Canyon Cut",
    points: CANYON_CUT,
  },
  {
    id: "twin-lakes",
    name: "Twin Lakes",
    points: TWIN_LAKES,
  },
];

export const DEFAULT_TRACK_ID = TRACKS[0]!.id;

export function getTrackDef(id: string): TrackDef {
  const found = TRACKS.find((t) => t.id === id);
  return found ?? TRACKS[0]!;
}

export function randomTrackId(): string {
  const i = Math.floor(Math.random() * TRACKS.length);
  return TRACKS[i]!.id;
}

export function isTrackId(id: string): boolean {
  return TRACKS.some((t) => t.id === id);
}
