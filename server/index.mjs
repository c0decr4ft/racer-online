import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const ON_RENDER = Boolean(process.env.RENDER);
/** When set (or when ../dist exists), serve the built web client from this process. */
const DIST_DIR = process.env.STATIC_DIR
  ? process.env.STATIC_DIR
  : existsSync(join(dirname(fileURLToPath(import.meta.url)), "..", "dist"))
    ? join(dirname(fileURLToPath(import.meta.url)), "..", "dist")
    : null;
// Render builds with Vite base `/` — serve the game at the service root.
// Local/Pages builds use `/racer-online/`.
const STATIC_BASE = (
  process.env.STATIC_BASE !== undefined
    ? process.env.STATIC_BASE
    : ON_RENDER
      ? ""
      : "/racer-online"
).replace(/\/$/, "");
const NET_TICK_MS = 50; // 20 Hz
const MAX_PLAYERS = 8;
const PLAYER_COLORS = [0xe4eaf2, 0xe23b2e, 0x2a66f0, 0xf0c020, 0x1dbf6a, 0xb44dff, 0xff6b9d, 0x00d4ff];
const DIR = dirname(fileURLToPath(import.meta.url));
const LEADERBOARD_PATH = join(DIR, "leaderboard.json");
const PRESENCE_PATH = join(DIR, "presence.json");
const MAX_BOARD = 10;
const NAME_MAX = 10;
const PRESENCE_STALE_MS = 75_000;
const PRESENCE_KEEP_HOURS = 14 * 24;
const PRESENCE_HISTORY_EPOCH = 2;

const TRACK_IDS = [
  "forest-loop",
  "harbor-circuit",
  "summit-pass",
  "meadow-sweep",
  "canyon-cut",
  "oval-circuit",
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

function normalizeKind(raw) {
  return String(raw ?? "").toLowerCase() === "bike" ? "bike" : "car";
}

function normalizeSessionId(raw) {
  const id = String(raw ?? "").trim();
  if (id.length < 8 || id.length > 80) return null;
  if (!/^[A-Za-z0-9_\-:]+$/.test(id)) return null;
  return id;
}

/** @typedef {{ id: string, name: string, color: number, accent: number, kind: string, x: number, z: number, h: number, s: number, g: string, lap: number }} Pose */
/** @typedef {{ id: string, name: string, color: number, room: string, ws: import('ws').WebSocket, pose: Pose, lastPoseAt: number }} Client */
/** @typedef {{ name: string, password: string, maxPlayers: number, trackId: string, kind: string, hostId: string, phase: 'lobby' | 'racing', clients: Map<string, Client> }} Room */
/** @typedef {{ name: string, timeMs: number, bestLapMs?: number, at: number, trackId?: string }} BoardEntry */
/** @typedef {Record<string, BoardEntry[]>} BoardStore */
/** @typedef {{ buckets: Record<string, number>, sessions: Record<string, number>, updatedAt: number, historyEpoch: number }} PresenceStore */

/** @type {Map<string, Room>} */
const rooms = new Map();

const MIN_PLAYERS_CAP = 2;
const DEFAULT_MAX_PLAYERS = 8;

function sanitizeRoomName(raw) {
  return (
    String(raw || "circuit")
      .replace(/[^\w\- ]/g, "")
      .trim()
      .slice(0, 24) || "circuit"
  );
}

function sanitizePassword(raw) {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 32);
}

function clampMaxPlayers(raw) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return DEFAULT_MAX_PLAYERS;
  return Math.max(MIN_PLAYERS_CAP, Math.min(MAX_PLAYERS, n));
}

function normalizeColor(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n) & 0xffffff;
}

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
          if (!Array.isArray(list)) continue;
          // Merge when legacy / unknown ids collapse onto the same track
          store[tid] = sortBoard([...(store[tid] || []), ...list], tid);
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

function hourKey(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}`;
}

function hourKeyToMs(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/.exec(key);
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4]);
}

/** @returns {PresenceStore} */
function emptyPresence() {
  return { buckets: {}, sessions: {}, updatedAt: 0, historyEpoch: PRESENCE_HISTORY_EPOCH };
}

/** @returns {PresenceStore} */
function loadPresence() {
  try {
    if (!existsSync(PRESENCE_PATH)) return emptyPresence();
    const raw = JSON.parse(readFileSync(PRESENCE_PATH, "utf8"));
    return prunePresence(parsePresence(raw));
  } catch {
    return emptyPresence();
  }
}

/** @param {unknown} data @returns {PresenceStore} */
function parsePresence(data) {
  const store = emptyPresence();
  if (!data || typeof data !== "object") return store;
  const obj = /** @type {Partial<PresenceStore>} */ (data);
  const epoch =
    typeof obj.historyEpoch === "number" && Number.isFinite(obj.historyEpoch)
      ? Math.round(obj.historyEpoch)
      : 0;
  store.historyEpoch = epoch;
  if (epoch >= PRESENCE_HISTORY_EPOCH && obj.buckets && typeof obj.buckets === "object") {
    for (const [k, v] of Object.entries(obj.buckets)) {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v >= 0) {
        store.buckets[k] = Math.max(0, Math.round(v));
      }
    }
  }
  if (obj.sessions && typeof obj.sessions === "object") {
    for (const [id, at] of Object.entries(obj.sessions)) {
      if (typeof id === "string" && id.length >= 8 && typeof at === "number" && Number.isFinite(at) && at > 0) {
        store.sessions[id] = Math.round(at);
      }
    }
  }
  if (typeof obj.updatedAt === "number" && Number.isFinite(obj.updatedAt)) {
    store.updatedAt = Math.round(obj.updatedAt);
  }
  return store;
}

/** @param {PresenceStore} store @param {number} [now] */
function prunePresence(store, now = Date.now()) {
  /** @type {Record<string, number>} */
  const sessions = {};
  for (const [id, at] of Object.entries(store.sessions)) {
    if (now - at <= PRESENCE_STALE_MS) sessions[id] = at;
  }
  const cutoff = now - PRESENCE_KEEP_HOURS * 3_600_000;
  /** @type {Record<string, number>} */
  const buckets = {};
  if (store.historyEpoch >= PRESENCE_HISTORY_EPOCH) {
    for (const [k, v] of Object.entries(store.buckets)) {
      const at = hourKeyToMs(k);
      if (at >= cutoff) buckets[k] = v;
    }
  }
  return {
    buckets,
    sessions,
    updatedAt: store.updatedAt,
    historyEpoch: Math.max(store.historyEpoch, PRESENCE_HISTORY_EPOCH),
  };
}

/** @param {PresenceStore} store */
function savePresence(store) {
  const body = prunePresence(store);
  body.historyEpoch = PRESENCE_HISTORY_EPOCH;
  writeFileSync(PRESENCE_PATH, JSON.stringify(body, null, 2));
  return body;
}

/** @param {PresenceStore} store @param {number} [now] */
function activePresenceCount(store, now = Date.now()) {
  let n = 0;
  for (const at of Object.values(store.sessions)) {
    if (now - at <= PRESENCE_STALE_MS) n += 1;
  }
  return n;
}

/** @param {PresenceStore} store @param {number} [now] */
function recordPresencePeak(store, now = Date.now()) {
  const peak = activePresenceCount(store, now);
  const key = hourKey(now);
  store.buckets[key] = Math.max(store.buckets[key] ?? 0, peak);
  store.updatedAt = now;
  store.historyEpoch = PRESENCE_HISTORY_EPOCH;
}

/** @param {PresenceStore} store */
function presenceSnapshot(store) {
  const pruned = prunePresence(store);
  const buckets = Object.entries(pruned.buckets)
    .map(([key, count]) => ({ key, count, at: hourKeyToMs(key) }))
    .filter((b) => b.at > 0)
    .sort((a, b) => a.at - b.at);
  return {
    ok: true,
    now: activePresenceCount(pruned),
    buckets,
    updatedAt: pruned.updatedAt,
    source: "server",
    racing: [...rooms.values()].reduce((n, room) => n + room.clients.size, 0),
    rooms: [...rooms.values()].map((room) => ({
      room: room.name,
      players: room.clients.size,
      phase: room.phase,
      maxPlayers: room.maxPlayers,
    })),
  };
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

/** @param {import('node:http').ServerResponse} res @param {string} filePath */
function sendStaticFile(res, filePath) {
  try {
    const data = readFileSync(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "public, max-age=60" });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

/** Serve Vite `dist` (under STATIC_BASE when set, else from `/`). */
function tryServeStatic(urlPath, res) {
  if (!DIST_DIR) {
    console.warn("[static] dist/ missing — run npm run build before start");
    return false;
  }
  let path = urlPath.split("?")[0] || "/";
  if (STATIC_BASE) {
    if (path === STATIC_BASE || path.startsWith(`${STATIC_BASE}/`)) {
      path = path.slice(STATIC_BASE.length) || "/";
    } else if (path === "/" || path === "") {
      res.writeHead(302, { Location: `${STATIC_BASE}/` });
      res.end();
      return true;
    } else {
      return false;
    }
  }
  if (path === "/" || path.endsWith("/")) path = `${path.replace(/\/$/, "")}/index.html`;
  const rel = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^\//, "");
  const filePath = join(DIST_DIR, rel || "index.html");
  if (!filePath.startsWith(DIST_DIR)) return false;
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return sendStaticFile(res, filePath);
  }
  // SPA fallback for client routes
  const index = join(DIST_DIR, "index.html");
  if (existsSync(index) && !rel.includes(".")) return sendStaticFile(res, index);
  return false;
}

/** @param {import('ws').WebSocket} ws @param {object} msg */
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

/** @param {Room} room */
function roomPlayers(room) {
  return [...room.clients.values()].map((c) => c.pose);
}

/** @param {Room} room @param {object} msg @param {string} [except] */
function broadcast(room, msg, except) {
  const raw = JSON.stringify(msg);
  for (const c of room.clients.values()) {
    if (except && c.id === except) continue;
    if (c.ws.readyState === 1) c.ws.send(raw);
  }
}

/** @param {Room} room */
function pickColor(room) {
  const used = new Set([...room.clients.values()].map((c) => c.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[(Math.random() * PLAYER_COLORS.length) | 0];
}

/** @param {Room} room */
function lobbySnapshot(room) {
  return {
    t: "lobby",
    players: roomPlayers(room),
    trackId: room.trackId,
    kind: room.kind,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
  };
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {object} msg
 * @param {'create' | 'join'} mode
 */
function admitClient(ws, msg, mode) {
  const roomName = sanitizeRoomName(msg.room);
  const password = sanitizePassword(msg.password);
  const name = sanitizeDriverName(msg.name || "Racer");
  const accent = normalizeColor(msg.accent, 0xff3b2e);

  /** @type {Room | undefined} */
  let room = rooms.get(roomName);

  if (mode === "create") {
    if (room && room.clients.size > 0) {
      send(ws, { t: "error", message: "room already exists — pick another name or join it" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    // Replace empty/stale leftover rooms so recreate always works
    room = {
      name: roomName,
      password,
      maxPlayers: clampMaxPlayers(msg.maxPlayers),
      trackId: normalizeTrackId(msg.trackId),
      kind: normalizeKind(msg.kind),
      hostId: "",
      phase: "lobby",
      clients: new Map(),
    };
    rooms.set(roomName, room);
  } else {
    if (!room || room.clients.size === 0) {
      send(ws, { t: "error", message: "room not found" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    if (room.phase === "racing") {
      send(ws, { t: "error", message: "race already started" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    if (password !== room.password) {
      send(ws, { t: "error", message: "wrong password" });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
    if (room.clients.size >= room.maxPlayers) {
      send(ws, { t: "error", message: `room full (max ${room.maxPlayers})` });
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return null;
    }
  }

  // Room vehicle class is host-chosen at create — every racer uses it.
  const kind = room.kind;
  const id = Math.random().toString(36).slice(2, 10);
  const color = normalizeColor(msg.color, pickColor(room));
  const slot = room.clients.size;
  /** @type {Pose} */
  const pose = {
    id,
    name,
    color,
    accent,
    kind,
    x: 8 + (slot % 2 === 0 ? -3.2 : 3.2),
    z: -95 + slot * 2.4,
    h: -Math.PI / 2,
    s: 0,
    g: "1",
    lap: 1,
  };

  /** @type {Client} */
  const client = { id, name, color, room: roomName, ws, pose, lastPoseAt: 0 };
  room.clients.set(id, client);
  if (!room.hostId || mode === "create") room.hostId = id;

  send(ws, {
    t: "welcome",
    id,
    room: roomName,
    players: roomPlayers(room),
    you: pose,
    hostId: room.hostId,
    trackId: room.trackId,
    kind: room.kind,
    maxPlayers: room.maxPlayers,
    phase: room.phase,
  });
  broadcast(room, { t: "join", player: pose }, id);
  broadcast(room, { t: "notice", text: `${name} joined` });
  broadcast(room, lobbySnapshot(room));
  console.log(
    `[${mode}] ${name} (${kind}) → ${roomName} (${room.clients.size}/${room.maxPlayers}) track=${room.trackId}`,
  );
  return client;
}

let presence = loadPresence();

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

  if (url.pathname === "/api/presence" && req.method === "GET") {
    presence = prunePresence(presence);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(presenceSnapshot(presence)));
    return;
  }

  if (url.pathname === "/api/presence" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body || "{}");
      const id = normalizeSessionId(data.id);
      if (!id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "bad session id" }));
        return;
      }
      const now = Date.now();
      presence = prunePresence(presence, now);
      const action = String(data.action || "heartbeat").toLowerCase();
      if (action === "leave") {
        delete presence.sessions[id];
        presence.updatedAt = now;
        presence.historyEpoch = PRESENCE_HISTORY_EPOCH;
      } else {
        presence.sessions[id] = now;
        recordPresencePeak(presence, now);
      }
      presence = savePresence(presence);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(presenceSnapshot(presence)));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "bad json" }));
    }
    return;
  }

  if (url.pathname === "/healthz" || url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  if (url.pathname === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    const stats = [...rooms.values()].map((room) => ({
      room: room.name,
      players: room.clients.size,
      phase: room.phase,
      maxPlayers: room.maxPlayers,
      trackId: room.trackId,
    }));
    res.end(
      JSON.stringify({
        ok: true,
        rooms: stats,
        presence: presenceSnapshot(prunePresence(presence)),
      }),
    );
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    if (tryServeStatic(url.pathname, res)) return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
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

    if (msg.t === "create" || msg.t === "join") {
      if (client) return;
      client = admitClient(ws, msg, msg.t === "create" ? "create" : "join");
      return;
    }

    if (!client) {
      send(ws, { t: "error", message: "join first" });
      return;
    }

    const room = rooms.get(client.room);
    if (!room) {
      send(ws, { t: "error", message: "room gone" });
      return;
    }

    if (msg.t === "start") {
      if (client.id !== room.hostId) {
        send(ws, { t: "error", message: "only the host can start" });
        return;
      }
      if (room.phase === "racing") return;
      if (msg.trackId != null) room.trackId = normalizeTrackId(msg.trackId);
      room.phase = "racing";
      const at = Date.now() + 250;
      broadcast(room, { t: "start", at, trackId: room.trackId, kind: room.kind });
      console.log(`[start] ${room.name} by ${client.name} → ${room.trackId} ${room.kind} (${room.clients.size}p)`);
      return;
    }

    if (msg.t === "pose") {
      if (room.phase !== "racing") return;
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
      // Ignore client kind — room class is locked by the host at create.
      p.kind = room.kind;
      if (Number.isFinite(Number(msg.color)) && Number(msg.color) > 0) {
        p.color = Math.round(Number(msg.color)) & 0xffffff;
        client.color = p.color;
      }
      if (Number.isFinite(Number(msg.accent)) && Number(msg.accent) > 0) {
        p.accent = Math.round(Number(msg.accent)) & 0xffffff;
      }
    }
  });

  ws.on("close", () => {
    if (!client) return;
    const room = rooms.get(client.room);
    if (!room) {
      client = null;
      return;
    }
    room.clients.delete(client.id);
    console.log(`[leave] ${client.name}`);
    if (room.clients.size === 0) {
      rooms.delete(client.room);
    } else {
      if (room.hostId === client.id) {
        room.hostId = room.clients.keys().next().value;
      }
      broadcast(room, { t: "leave", id: client.id, hostId: room.hostId });
      broadcast(room, { t: "notice", text: `${client.name} left` });
      if (room.phase === "lobby") broadcast(room, lobbySnapshot(room));
    }
    client = null;
  });
});

setInterval(() => {
  const serverTime = Date.now();
  for (const room of rooms.values()) {
    if (room.phase !== "racing" || room.clients.size === 0) continue;
    const players = roomPlayers(room);
    const raw = JSON.stringify({ t: "state", players, serverTime });
    for (const c of room.clients.values()) {
      if (c.ws.readyState === 1) c.ws.send(raw);
    }
  }
}, NET_TICK_MS);

// Drop stale presence sessions periodically so GET stays fresh without heartbeats.
setInterval(() => {
  const next = prunePresence(presence);
  if (Object.keys(next.sessions).length !== Object.keys(presence.sessions).length) {
    presence = savePresence(next);
  } else {
    presence = next;
  }
}, 15_000);

httpServer.listen(PORT, HOST, () => {
  console.log(
    `Racer Online http://${HOST}:${PORT} (WS + /api/*${DIST_DIR ? ` + static ${STATIC_BASE || "/"}` : ""})`,
  );
});
