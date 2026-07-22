import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const NET_TICK_MS = 50; // 20 Hz
const MAX_PLAYERS = 8;
const PLAYER_COLORS = [0xe4eaf2, 0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff, 0xff6b9d, 0x00d4ff];
const LEADERBOARD_PATH = join(dirname(fileURLToPath(import.meta.url)), "leaderboard.json");
const MAX_BOARD = 10;
const NAME_MAX = 10;

const TRACK_IDS = [
  "forest-loop",
  "harbor-circuit",
  "summit-pass",
  "meadow-sweep",
  "canyon-cut",
  "twin-lakes",
];
const DEFAULT_TRACK_ID = TRACK_IDS[0];

/** Letters, digits, space, underscore — trim, strip control/weird chars, cap length. */
function sanitizeDriverName(raw) {
  const cleaned = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return cleaned || "RACER";
}

function normalizeTrackId(raw) {
  const id = String(raw ?? "").trim();
  return TRACK_IDS.includes(id) ? id : DEFAULT_TRACK_ID;
}

/** @typedef {{ id: string, name: string, color: number, x: number, z: number, h: number, s: number, g: string, lap: number }} Pose */
/** @typedef {{ id: string, name: string, color: number, room: string, ws: import('ws').WebSocket, pose: Pose, lastPoseAt: number }} Client */
/** @typedef {{ name: string, timeMs: number, bestLapMs?: number, at: number, trackId?: string }} BoardEntry */
/** @typedef {Record<string, BoardEntry[]>} BoardStore */

/** @type {Map<string, Map<string, Client>>} */
const rooms = new Map();

/** @returns {BoardStore} */
function emptyStore() {
  /** @type {BoardStore} */
  const store = {};
  for (const id of TRACK_IDS) store[id] = [];
  return store;
}

/** @returns {BoardStore} */
function loadStore() {
  try {
    if (!existsSync(LEADERBOARD_PATH)) return emptyStore();
    const raw = JSON.parse(readFileSync(LEADERBOARD_PATH, "utf8"));
    const store = emptyStore();
    if (Array.isArray(raw)) {
      store[DEFAULT_TRACK_ID] = sortBoard(raw, DEFAULT_TRACK_ID);
      return store;
    }
    if (raw && typeof raw === "object") {
      if (raw.byTrack && typeof raw.byTrack === "object") {
        for (const [id, list] of Object.entries(raw.byTrack)) {
          const tid = normalizeTrackId(id);
          if (Array.isArray(list)) store[tid] = sortBoard(list, tid);
        }
        return store;
      }
      if (Array.isArray(raw.entries)) {
        store[DEFAULT_TRACK_ID] = sortBoard(raw.entries, DEFAULT_TRACK_ID);
      }
    }
    return store;
  } catch {
    return emptyStore();
  }
}

/** @param {BoardStore} store */
function saveStore(store) {
  /** @type {BoardStore} */
  const byTrack = {};
  for (const id of TRACK_IDS) byTrack[id] = sortBoard(store[id] || [], id);
  writeFileSync(LEADERBOARD_PATH, JSON.stringify({ byTrack }, null, 2));
}

const TIME_EPS_MS = 15;

/** @param {BoardEntry} a @param {BoardEntry} b */
function sameRun(a, b) {
  if (String(a.name || "").trim().toLowerCase() !== String(b.name || "").trim().toLowerCase()) return false;
  return Math.abs(a.timeMs - b.timeMs) <= TIME_EPS_MS;
}

/** @param {BoardEntry[]} entries @param {string} [trackId] */
function sortBoard(entries, trackId) {
  const tid = trackId ? normalizeTrackId(trackId) : undefined;
  const cleaned = [...entries]
    .filter((e) => e && Number.isFinite(e.timeMs) && e.timeMs > 0)
    .map((e) => ({
      name: sanitizeDriverName(e.name),
      timeMs: Math.round(e.timeMs),
      bestLapMs: e.bestLapMs != null ? Math.round(e.bestLapMs) : undefined,
      at: e.at || Date.now(),
      trackId: tid || (e.trackId ? normalizeTrackId(e.trackId) : undefined),
    }));

  /** @type {BoardEntry[]} */
  const unique = [];
  for (const e of cleaned) {
    const i = unique.findIndex((u) => sameRun(u, e));
    if (i >= 0) {
      const prev = unique[i];
      unique[i] = (prev.at || 0) <= (e.at || 0) ? prev : e;
      if (unique[i].bestLapMs == null && e.bestLapMs != null) {
        unique[i] = { ...unique[i], bestLapMs: e.bestLapMs };
      }
    } else {
      unique.push(e);
    }
  }

  return unique.sort((a, b) => a.timeMs - b.timeMs || (a.at || 0) - (b.at || 0)).slice(0, MAX_BOARD);
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

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

const httpServer = createServer(async (req, res) => {
  cors(res);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/api/leaderboard" && req.method === "GET") {
    const store = loadStore();
    const trackQ = url.searchParams.get("track");
    res.writeHead(200, { "Content-Type": "application/json" });
    if (trackQ) {
      const tid = normalizeTrackId(trackQ);
      res.end(JSON.stringify({ ok: true, trackId: tid, entries: sortBoard(store[tid] || [], tid), byTrack: store }));
    } else {
      res.end(JSON.stringify({ ok: true, byTrack: store }));
    }
    return;
  }

  if (url.pathname === "/api/leaderboard" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body || "{}");
      const tid = normalizeTrackId(data.trackId);
      const entry = {
        name: sanitizeDriverName(data.name),
        timeMs: Math.round(Number(data.timeMs)),
        bestLapMs: data.bestLapMs != null ? Math.round(Number(data.bestLapMs)) : undefined,
        at: Date.now(),
        trackId: tid,
      };
      if (!Number.isFinite(entry.timeMs) || entry.timeMs <= 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "bad time" }));
        return;
      }
      const store = loadStore();
      store[tid] = sortBoard([...(store[tid] || []), entry], tid);
      saveStore(store);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, trackId: tid, entries: store[tid], byTrack: store }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "bad json" }));
    }
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
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
      const name = sanitizeDriverName(msg.name || "Racer");
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
  console.log(`Racer Online :${PORT} (WS + /api/leaderboard)`);
});
