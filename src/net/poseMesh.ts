/**
 * Direct car-position channel between racers.
 *
 * Poses ride an unreliable, unordered WebRTC data channel so one late packet
 * cannot freeze the rest (the stall a WebSocket has). The room server only
 * forwards the offer/answer. If the channel never opens, callers keep using
 * the existing WebSocket snapshots.
 */
import type { RtcSignal } from "./protocol";

const POSE_FRESH_MS = 220;
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type DirectPose = {
  id: string;
  x: number;
  z: number;
  h: number;
  s: number;
  g: string;
  lap: number;
};

type Link = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  ice: RTCIceCandidateInit[];
  remoteReady: boolean;
  retry: ReturnType<typeof setTimeout> | null;
  dead: boolean;
};

export class PoseMesh {
  private selfId = "";
  private links = new Map<string, Link>();
  private lastSeqIn = new Map<string, number>();
  private lastAt = new Map<string, number>();
  private seqOut = 0;
  private readonly sendSignal: (to: string, signal: RtcSignal) => void;
  private readonly onPose: (pose: DirectPose, at: number) => void;

  constructor(
    sendSignal: (to: string, signal: RtcSignal) => void,
    onPose: (pose: DirectPose, at: number) => void,
  ) {
    this.sendSignal = sendSignal;
    this.onPose = onPose;
  }

  setSelf(id: string) {
    this.selfId = id;
  }

  /** Open a channel to each other racer. The lower id sends the offer. */
  sync(peerIds: Iterable<string>) {
    if (!this.selfId) return;
    const want = new Set<string>();
    for (const id of peerIds) {
      if (id && id !== this.selfId) want.add(id);
    }
    for (const id of [...this.links.keys()]) {
      if (!want.has(id)) this.drop(id);
    }
    for (const id of want) this.ensure(id);
  }

  handleSignal(from: string, signal: RtcSignal) {
    if (!this.selfId || !from || from === this.selfId) return;
    if (signal.kind === "offer" && this.selfId < from) return;
    const link = this.links.get(from) ?? this.ensure(from);
    if (!link || link.dead) return;
    void this.applySignal(from, link, signal).catch(() => this.scheduleRetry(from));
  }

  sendPose(pose: DirectPose) {
    if (!this.selfId) return;
    const seq = (this.seqOut = (this.seqOut + 1) & 0xffff);
    const bytes = encodeDirectPose(pose, seq);
    for (const link of this.links.values()) {
      const dc = link.dc;
      if (!dc || dc.readyState !== "open" || dc.bufferedAmount > 65536) continue;
      try {
        dc.send(bytes);
      } catch {
        /* channel died — the WebSocket snapshot still carries this pose */
      }
    }
  }

  /** True when a direct pose from this racer arrived recently. */
  fresh(id: string, now: number): boolean {
    const at = this.lastAt.get(id);
    return at != null && now - at < POSE_FRESH_MS;
  }

  close() {
    for (const id of [...this.links.keys()]) this.drop(id);
    this.lastSeqIn.clear();
    this.lastAt.clear();
    this.selfId = "";
  }

  private ensure(id: string): Link | null {
    const existing = this.links.get(id);
    if (existing && !existing.dead) return existing;
    if (!this.selfId || typeof RTCPeerConnection === "undefined") return null;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const link: Link = { pc, dc: null, ice: [], remoteReady: false, retry: null, dead: false };
    this.links.set(id, link);
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || link.dead) return;
      this.sendSignal(id, { kind: "ice", candidate: ev.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (link.dead) return;
      if (state === "failed" || state === "disconnected") this.scheduleRetry(id);
    };
    pc.ondatachannel = (ev) => this.bindChannel(id, link, ev.channel);
    if (this.selfId < id) {
      try {
        const dc = pc.createDataChannel("pose", { ordered: false, maxRetransmits: 0 });
        this.bindChannel(id, link, dc);
        void pc
          .createOffer()
          .then(async (offer) => {
            if (link.dead) return;
            await pc.setLocalDescription(offer);
            this.sendSignal(id, { kind: "offer", sdp: offer.sdp ?? "" });
          })
          .catch(() => this.scheduleRetry(id));
      } catch {
        this.scheduleRetry(id);
      }
    }
    return link;
  }

  private bindChannel(id: string, link: Link, dc: RTCDataChannel) {
    link.dc = dc;
    dc.binaryType = "arraybuffer";
    dc.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      const pose = decodeDirectPose(ev.data);
      if (!pose || pose.id !== id) return;
      const seq = lastSeq(ev.data);
      const prev = this.lastSeqIn.get(id);
      if (prev != null && !isNewerSeq(seq, prev)) return;
      this.lastSeqIn.set(id, seq);
      const now = performance.now();
      this.lastAt.set(id, now);
      this.onPose(pose, now);
    };
  }

  private async applySignal(from: string, link: Link, signal: RtcSignal) {
    if (link.dead) return;
    if (signal.kind === "offer") {
      if (!signal.sdp) return;
      await link.pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
      link.remoteReady = true;
      const answer = await link.pc.createAnswer();
      await link.pc.setLocalDescription(answer);
      this.sendSignal(from, { kind: "answer", sdp: answer.sdp ?? "" });
      await this.flushIce(link);
      return;
    }
    if (signal.kind === "answer") {
      if (!signal.sdp || link.pc.signalingState !== "have-local-offer") return;
      await link.pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
      link.remoteReady = true;
      await this.flushIce(link);
      return;
    }
    if (!signal.candidate) return;
    if (!link.remoteReady) {
      link.ice.push(signal.candidate);
      return;
    }
    await link.pc.addIceCandidate(signal.candidate);
  }

  private async flushIce(link: Link) {
    const queued = link.ice.splice(0);
    for (const candidate of queued) {
      try {
        await link.pc.addIceCandidate(candidate);
      } catch {
        /* a stale candidate just means this attempt retries */
      }
    }
  }

  private scheduleRetry(id: string) {
    const link = this.links.get(id);
    if (!link || link.dead || link.retry) return;
    link.retry = setTimeout(() => {
      if (!this.links.has(id)) return;
      this.drop(id);
      this.ensure(id);
    }, 2000);
  }

  private drop(id: string) {
    const link = this.links.get(id);
    if (!link) return;
    link.dead = true;
    if (link.retry) clearTimeout(link.retry);
    try {
      link.dc?.close();
    } catch {
      /* ignore */
    }
    try {
      link.pc.close();
    } catch {
      /* ignore */
    }
    this.links.delete(id);
    this.lastAt.delete(id);
    this.lastSeqIn.delete(id);
  }
}

function encodeDirectPose(pose: DirectPose, seq: number): ArrayBuffer {
  const buf = new ArrayBuffer(30);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  view.setUint16(0, seq & 0xffff, true);
  const id = pose.id.slice(0, 8);
  for (let i = 0; i < 8; i++) bytes[2 + i] = i < id.length ? id.charCodeAt(i) & 0xff : 0;
  view.setFloat32(10, pose.x, true);
  view.setFloat32(14, pose.z, true);
  view.setFloat32(18, pose.h, true);
  view.setFloat32(22, pose.s, true);
  bytes[26] = (pose.g.charCodeAt(0) || 49) & 0xff;
  bytes[27] = Math.max(1, Math.min(99, pose.lap | 0));
  return buf;
}

function lastSeq(buf: ArrayBuffer): number {
  return new DataView(buf).getUint16(0, true);
}

/** True when `seq` is ahead of `prev` on a 16-bit counter, including wrap. */
function isNewerSeq(seq: number, prev: number): boolean {
  const delta = (seq - prev) & 0xffff;
  return delta > 0 && delta < 0x8000;
}

function decodeDirectPose(buf: ArrayBuffer): DirectPose | null {
  if (buf.byteLength < 28) return null;
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let end = 2;
  while (end < 10 && bytes[end] !== 0) end++;
  const id = String.fromCharCode(...bytes.subarray(2, end));
  if (!id) return null;
  return {
    id,
    x: view.getFloat32(10, true),
    z: view.getFloat32(14, true),
    h: view.getFloat32(18, true),
    s: view.getFloat32(22, true),
    g: String.fromCharCode(bytes[26] || 49),
    lap: bytes[27] || 1,
  };
}
