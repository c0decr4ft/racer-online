/**
 * Named closed-circuit control points (XZ meters). First point ≈ start/finish;
 * CatmullRom closed=true closes the loop. Keep self-clearance ≳30m and corner
 * radii ≳13.5 so a 14m road never overlaps.
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
 * Harbor Circuit — long east–west oval with a southern dock chicane (~725m).
 */
const HARBOR_CIRCUIT = scalePts(
  [
    [-95, -42],
    [-60, -42],
    [-20, -42],
    [20, -42],
    [55, -42],
    [78, -40],
    [95, -32],
    [104, -18],
    [106, 0],
    [104, 18],
    [95, 32],
    [78, 40],
    [55, 42],
    [20, 42],
    [-20, 42],
    [-55, 42],
    [-78, 40],
    [-95, 32],
    [-104, 18],
    [-106, 0],
    [-104, -18],
    [-100, -30],
    [-92, -38],
    [-85, -44],
    [-78, -48],
    [-70, -46],
    [-65, -42],
  ],
  1.2,
  1.25,
);

/**
 * Summit Pass — elongated paperclip with twin hairpins + east kink (~700m).
 */
const SUMMIT_PASS = scalePts(
  [
    [55, -95],
    [55, -55],
    [55, -25],
    [62, -10],
    [70, 5],
    [62, 20],
    [55, 40],
    [55, 65],
    [45, 82],
    [22, 95],
    [-5, 98],
    [-32, 92],
    [-50, 75],
    [-58, 55],
    [-58, 20],
    [-58, -20],
    [-58, -55],
    [-58, -75],
    [-48, -95],
    [-22, -108],
    [5, -112],
    [32, -105],
    [50, -90],
    [55, -75],
  ],
  1.12,
  1.12,
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
 * Canyon Cut — angular stepped circuit with western inset (~740m).
 */
const CANYON_CUT = scalePts(
  [
    [-90, -55],
    [-40, -55],
    [10, -55],
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
    [-45, -10],
    [-60, -20],
    [-80, -15],
    [-95, 0],
    [-100, 22],
    [-92, 42],
    [-110, 50],
    [-125, 38],
    [-132, 15],
    [-130, -10],
    [-118, -35],
    [-95, -50],
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
