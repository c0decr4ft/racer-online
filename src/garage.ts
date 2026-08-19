/** Player garage — vehicle kind + paint saved locally. */

export type VehicleKind = "car" | "bike" | "truck" | "tank";

export type GarageLoadout = {
  kind: VehicleKind;
  /** Primary body / fairing color (0xRRGGBB). */
  primary: number;
  /** Accent stripe / number-plate trim. */
  accent: number;
};

const STORAGE_KEY = "racer-garage-v1";

/** Distinct single-channel swatches for left-click body/line pickers. */
export const GARAGE_SWATCHES: number[] = [
  0xe4eaf2, 0xc8d0dc, 0x8a93a3, 0x1a1f28, 0x0c1218, 0x12161c,
  0xff3b2e, 0xe23b2e, 0xff6a45, 0xff6b9d, 0xb44dff, 0x2a66f0,
  0x00d4ff, 0x1dbf6a, 0xf0c020, 0xf7fafc, 0x5c6b7a, 0x3d4654,
  0x8b1e1a, 0x0a3d7a, 0x0a5c3a, 0x7a4a00, 0x4a1a6a, 0x1a3a4a,
];

const DEFAULT_LOADOUT: GarageLoadout = {
  kind: "car",
  primary: 0xe4eaf2,
  accent: 0xff3b2e,
};

function clampColor(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_LOADOUT.primary;
  return Math.round(n) & 0xffffff;
}

export function normalizeKind(raw: unknown): VehicleKind {
  const kind = String(raw ?? "").toLowerCase();
  // Monster truck + tank are dev-profile garage extras (UI-gated in game.ts).
  if (kind === "bike" || kind === "truck" || kind === "tank") return kind;
  return "car";
}

export function loadGarage(): GarageLoadout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOADOUT };
    const parsed = JSON.parse(raw) as Partial<GarageLoadout>;
    return {
      kind: normalizeKind(parsed.kind),
      primary: clampColor(Number(parsed.primary)),
      accent: clampColor(Number(parsed.accent ?? DEFAULT_LOADOUT.accent)),
    };
  } catch {
    return { ...DEFAULT_LOADOUT };
  }
}

export function saveGarage(loadout: GarageLoadout): GarageLoadout {
  const next: GarageLoadout = {
    kind: normalizeKind(loadout.kind),
    primary: clampColor(loadout.primary),
    accent: clampColor(loadout.accent),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export function hexColor(n: number): string {
  return `#${clampColor(n).toString(16).padStart(6, "0")}`;
}

export function parseHexColor(raw: string, fallback: number): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(raw || "").trim());
  if (!m) return clampColor(fallback);
  return parseInt(m[1]!, 16);
}
