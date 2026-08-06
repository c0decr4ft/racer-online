/** Shared wire protocol — compact 30Hz pose sync for responsive remote racers. */

export const NET_TICK_HZ = 30;
export const NET_TICK_MS = 1000 / NET_TICK_HZ;
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;

export type NetVehicleKind = "car" | "bike";
/** Host-chosen at room create — same modes as WeatherController. */
export type NetWeatherMode = "dry" | "night" | "rain";
export type LobbyPhase = "lobby" | "racing" | "finished" | "starting";

export type PlayerPose = {
  id: string;
  name: string;
  color: number;
  accent?: number;
  kind?: NetVehicleKind;
  x: number;
  z: number;
  h: number; // heading
  s: number; // speed m/s
  g: string; // gear label
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
    }
  | {
      t: "join";
      name: string;
      room?: string;
      password?: string;
      color?: number;
      accent?: number;
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
    }
  | { t: "state"; players: PlayerPose[] }
  | { t: "start"; at: number; trackId: string; kind: NetVehicleKind; weather: NetWeatherMode }
  /** One driver exploded — everyone resets to the start grid. */
  | { t: "crashReset"; byId: string; byName: string }
  | {
      t: "raceResult";
      winnerId: string;
      winnerName: string;
      timeMs: number;
      trackOptions: string[];
      voteEndsAt: number;
    }
  | { t: "voteUpdate"; votes: Record<string, number>; received: number; total: number }
  | { t: "voteResult"; trackId: string }
  | { t: "pong"; n: number }
  | { t: "error"; message: string };

export const PLAYER_COLORS = [0xe4eaf2, 0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff, 0xff6b9d, 0x00d4ff];
