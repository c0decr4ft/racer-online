/** Shared wire protocol — keep payloads tiny for 20Hz sync. */

export const NET_TICK_HZ = 20;
export const NET_TICK_MS = 1000 / NET_TICK_HZ;
export const MAX_PLAYERS = 8;

export type PlayerPose = {
  id: string;
  name: string;
  color: number;
  x: number;
  z: number;
  h: number; // heading
  s: number; // speed m/s
  g: string; // gear label
  lap: number;
};

export type ClientMsg =
  | { t: "join"; name: string; room?: string }
  | { t: "pose"; x: number; z: number; h: number; s: number; g: string; lap: number }
  | { t: "ready" }
  | { t: "ping"; n: number };

export type ServerMsg =
  | { t: "welcome"; id: string; room: string; players: PlayerPose[]; you: PlayerPose }
  | { t: "join"; player: PlayerPose }
  | { t: "leave"; id: string }
  | { t: "state"; players: PlayerPose[]; serverTime: number }
  | { t: "start"; at: number }
  | { t: "pong"; n: number; serverTime: number }
  | { t: "error"; message: string };

export const PLAYER_COLORS = [0xe4eaf2, 0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff, 0xff6b9d, 0x00d4ff];
