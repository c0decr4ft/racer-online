/** Shared wire protocol — 30Hz pose sync with client-side snapshot interpolation. */

/**
 * 30Hz: at 90Hz over TCP, one lost packet head-of-line-blocks ~90 queued updates
 * then dumps them as a burst — visible as freeze → teleport. 30Hz keeps frames
 * fresh and queues short; the interp buffer hides the 33ms spacing entirely.
 */
export const NET_TICK_HZ = 30;
export const NET_TICK_MS = 1000 / NET_TICK_HZ;
/** Render remotes this far behind local time so we almost always lerp between two snapshots. */
export const INTERP_DELAY_MS = NET_TICK_MS * 1.75;
/** When the buffer runs dry, coast at most this far past the newest sample. */
export const MAX_EXTRAPOLATE_MS = NET_TICK_MS * 3.5;
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

/** Binary WebSocket frame type for racing state (keeps 8-player downlink small). */
export const STATE_BIN_TYPE = 1;

export type NetVehicleKind = "car" | "bike";
/** Host-chosen at room create — same modes as WeatherController. */
export type NetWeatherMode = "dry" | "night" | "rain";
export type LobbyPhase = "lobby" | "racing" | "finished" | "starting";

/** Event Mode room state — buy-in gate + pot. Present only in event rooms. */
export type EventRoomInfo = {
  buyInSats: number;
  /** Mint fee added on top of each buy-in (payers cover it, pot lands whole). */
  feeSats?: number;
  paidIds: string[];
  potSats: number;
  /** Mint fee reserved from the pot at payout (before the winner/tip split). */
  potFeeSats?: number;
  /** True when the server runs the mock payment adapter (dev/testing — fake sats). */
  mock?: boolean;
};

export type PlayerPose = {
  id: string;
  name: string;
  color: number;
  accent?: number;
  kind?: NetVehicleKind;
  /** Nostr pubkey (64-hex) when the racer is signed in — verified at login, display-only here. */
  pubkey?: string;
  x: number;
  z: number;
  h: number; // heading
  s: number; // speed m/s
  g: string; // gear label
  lap: number;
};

/** Motion-only fields carried on the hot state path (identity comes from lobby/join). */
export type PoseMotion = {
  id: string;
  x: number;
  z: number;
  h: number;
  s: number;
  g: string;
  lap: number;
};

export type ClientMsg =
  | {
      t: "create";
      name: string;
      room: string;
      password?: string;
      maxPlayers?: number;
      trackId?: string;
      kind?: NetVehicleKind;
      /** Host-only — room weather for every racer. */
      weather?: NetWeatherMode;
      color?: number;
      accent?: number;
      /** Nostr identity (64-hex pubkey) of the host. */
      pubkey?: string;
      /** Event Mode — buy-in per racer in sats; host cannot start until all paid. */
      event?: { buyInSats: number };
    }
  | {
      t: "join";
      name: string;
      room?: string;
      password?: string;
      color?: number;
      accent?: number;
      /** Nostr identity (64-hex pubkey) of the joining racer. */
      pubkey?: string;
      /** True when joining via Event Mode — must match the room's type. */
      event?: boolean;
    }
  | {
      t: "pose";
      x: number;
      z: number;
      h: number;
      s: number;
      g: string;
      lap: number;
      kind?: NetVehicleKind;
      color?: number;
      accent?: number;
    }
  | { t: "finish"; timeMs: number; bestLapMs: number }
  | { t: "crash" }
  | { t: "vote"; trackId: string }
  /** Event Mode — manual buy-in: paste a cashuA token instead of scanning the request. */
  | { t: "submitToken"; token: string }
  /** Event Mode — winner claims the pot as a Cashu token: tip 0–100% to the dev. */
  | { t: "claimPot"; tipPercent: number }
  /** Host-only. Optional weather re-asserts the room setting on play. */
  | { t: "start"; weather?: NetWeatherMode }
  | { t: "ping"; n: number };

export type ServerMsg =
  | {
      t: "welcome";
      id: string;
      room: string;
      players: PlayerPose[];
      you: PlayerPose;
      hostId: string;
      trackId: string;
      kind: NetVehicleKind;
      weather: NetWeatherMode;
      maxPlayers: number;
      phase: LobbyPhase;
      event?: EventRoomInfo | null;
    }
  | { t: "join"; player: PlayerPose }
  | { t: "leave"; id: string; hostId?: string }
  | { t: "notice"; text: string }
  | {
      t: "lobby";
      players: PlayerPose[];
      trackId: string;
      kind: NetVehicleKind;
      weather: NetWeatherMode;
      hostId: string;
      maxPlayers: number;
      event?: EventRoomInfo | null;
    }
  | { t: "state"; players: PlayerPose[]; at?: number }
  | { t: "start"; at: number; trackId: string; kind: NetVehicleKind; weather: NetWeatherMode }
  /** Event Mode — your personal buy-in request (NUT-18 creq, payable by cashu.me & co). */
  | {
      t: "eventInvoice";
      paymentRequest: string;
      /** Total to pay (buyInSats + feeSats). */
      amountSats: number;
      buyInSats?: number;
      /** Mint fee included in the request on top of the buy-in. */
      feeSats?: number;
      mock?: boolean;
    }
  /** Event Mode — result of a pot claim attempt; `token` is the cashuA payout. */
  | {
      t: "payoutResult";
      ok: boolean;
      token?: string;
      winnerSats?: number;
      tipSats?: number;
      /** Mint fee reserved from the pot for this payout. */
      feeSats?: number;
      /** True when the tip was swapped into the server tip wallet (not a bearer token). */
      tipCollected?: boolean;
      mock?: boolean;
      error?: string;
    }
  /** One driver exploded — everyone resets to the start grid. */
  | { t: "crashReset"; byId: string; byName: string }
  | {
      t: "raceResult";
      winnerId: string;
      winnerName: string;
      timeMs: number;
      trackOptions: string[];
      voteEndsAt: number;
      event?: EventRoomInfo | null;
    }
  | { t: "voteUpdate"; votes: Record<string, number>; received: number; total: number }
  | { t: "voteResult"; trackId: string }
  | { t: "pong"; n: number }
  | { t: "error"; message: string };

export const PLAYER_COLORS = [0xe4eaf2, 0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff, 0xff6b9d, 0x00d4ff];

/** Bytes per player in a binary state frame (8-char id + 4×f32 + gear + lap). */
const STATE_PLAYER_BYTES = 8 + 16 + 2;

/** Decode a binary racing-state frame. Returns null if the buffer is not a state packet. */
export function decodeStateBinary(buf: ArrayBuffer): { at: number; motions: PoseMotion[] } | null {
  if (buf.byteLength < 10) return null;
  const view = new DataView(buf);
  if (view.getUint8(0) !== STATE_BIN_TYPE) return null;
  const at = view.getFloat64(1, true);
  const count = view.getUint8(9);
  const need = 10 + count * STATE_PLAYER_BYTES;
  if (buf.byteLength < need || count > MAX_PLAYERS) return null;
  const motions: PoseMotion[] = [];
  let o = 10;
  const idBytes = new Uint8Array(buf);
  for (let i = 0; i < count; i++) {
    let end = o;
    while (end < o + 8 && idBytes[end] !== 0) end++;
    const id = String.fromCharCode(...idBytes.subarray(o, end));
    o += 8;
    const x = view.getFloat32(o, true);
    o += 4;
    const z = view.getFloat32(o, true);
    o += 4;
    const h = view.getFloat32(o, true);
    o += 4;
    const s = view.getFloat32(o, true);
    o += 4;
    const g = String.fromCharCode(view.getUint8(o++) || 49);
    const lap = view.getUint8(o++) || 1;
    motions.push({ id, x, z, h, s, g, lap });
  }
  return { at, motions };
}
