import { WebSocketServer } from "ws";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 8787);
const NET_TICK_MS = 50; // 20 Hz
const MAX_PLAYERS = 8;
const PLAYER_COLORS = [0xe4eaf2, 0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff, 0xff6b9d, 0x00d4ff];

/** @typedef {{ id: string, name: string, color: number, x: number, z: number, h: number, s: number, g: string, lap: number }} Pose */
/** @typedef {{ id: string, name: string, color: number, room: string, ws: import('ws').WebSocket, pose: Pose, lastPoseAt: number }} Client */

/** @type {Map<string, Map<string, Client>>} */
const rooms = new Map();

/** @param {import('ws').WebSocket} ws @param {object} msg */
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

/** @param {string} room */
function roomPlayers(room) {
  const map = rooms.get(room);
  if (!map) return [];
  return [...map.values()].map((c) => c.pose);
}

/** @param {string} room @param {object} msg @param {string} [except] */
function broadcast(room, msg, except) {
  const map = rooms.get(room);
  if (!map) return;
  const raw = JSON.stringify(msg);
  for (const c of map.values()) {
    if (except && c.id === except) continue;
    if (c.ws.readyState === 1) c.ws.send(raw);
  }
}

/** @param {string} room */
function pickColor(room) {
  const used = new Set([...(rooms.get(room)?.values() ?? [])].map((c) => c.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[(Math.random() * PLAYER_COLORS.length) | 0];
}

/** @param {string} name */
function ensureRoom(name) {
  if (!rooms.has(name)) rooms.set(name, new Map());
  return rooms.get(name);
}

const httpServer = createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  const stats = [...rooms.entries()].map(([name, map]) => ({ room: name, players: map.size }));
  res.end(JSON.stringify({ ok: true, rooms: stats }));
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  /** @type {Client | null} */
  let client = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      send(ws, { t: "error", message: "bad json" });
      return;
    }

    if (msg.t === "ping") {
      send(ws, { t: "pong", n: msg.n, serverTime: Date.now() });
      return;
    }

    if (msg.t === "join") {
      if (client) return;
      const roomName = String(msg.room || "circuit").slice(0, 24);
      const room = ensureRoom(roomName);
      if (room.size >= MAX_PLAYERS) {
        send(ws, { t: "error", message: "room full (max 8)" });
        return;
      }

      const id = Math.random().toString(36).slice(2, 10);
      const color = pickColor(roomName);
      const name = String(msg.name || "Racer").trim().slice(0, 16) || "Racer";
      const slot = room.size;
      /** @type {Pose} */
      const pose = {
        id,
        name,
        color,
        x: 8 + (slot % 2 === 0 ? -3.2 : 3.2),
        z: -95 + slot * 2.4,
        h: -Math.PI / 2,
        s: 0,
        g: "1",
        lap: 1,
      };

      client = { id, name, color, room: roomName, ws, pose, lastPoseAt: 0 };
      room.set(id, client);

      send(ws, { t: "welcome", id, room: roomName, players: roomPlayers(roomName), you: pose });
      broadcast(roomName, { t: "join", player: pose }, id);
      console.log(`[join] ${name} → ${roomName} (${room.size}/${MAX_PLAYERS})`);
      return;
    }

    if (!client) {
      send(ws, { t: "error", message: "join first" });
      return;
    }

    if (msg.t === "pose") {
      const now = Date.now();
      if (now - client.lastPoseAt < 32) return; // ~30Hz max ingest
      client.lastPoseAt = now;
      const p = client.pose;
      p.x = +msg.x || 0;
      p.z = +msg.z || 0;
      p.h = +msg.h || 0;
      p.s = +msg.s || 0;
      p.g = String(msg.g || "1").slice(0, 2);
      p.lap = Math.max(1, Math.min(99, msg.lap | 0));
    }
  });

  ws.on("close", () => {
    if (!client) return;
    const room = rooms.get(client.room);
    room?.delete(client.id);
    broadcast(client.room, { t: "leave", id: client.id });
    console.log(`[leave] ${client.name}`);
    if (room && room.size === 0) rooms.delete(client.room);
    client = null;
  });
});

setInterval(() => {
  const serverTime = Date.now();
  for (const [, map] of rooms) {
    if (map.size === 0) continue;
    const players = [...map.values()].map((c) => c.pose);
    const raw = JSON.stringify({ t: "state", players, serverTime });
    for (const c of map.values()) {
      if (c.ws.readyState === 1) c.ws.send(raw);
    }
  }
}, NET_TICK_MS);

httpServer.listen(PORT, () => {
  console.log(`Racer Online multiplayer :${PORT} @ ${1000 / NET_TICK_MS}Hz (max ${MAX_PLAYERS}/room)`);
});
