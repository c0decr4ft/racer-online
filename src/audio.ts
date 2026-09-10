/**
 * Web Audio — countdown / explode / menu music + procedural car & bike engines.
 * Unlocks on first user gesture. Speaker mute persists in localStorage.
 *
 * Engines are synthesized (no loop samples) so car and bike share the same
 * speed→RPM mapping; only timbre differs. Gear shifts play a short mechanical cue.
 *
 * Explode SFX: public/audio/explode.mp3 — Freesound “explosion-42132”.
 * Menu music: public/audio/menu.mp3.
 */

import type { Gear } from "./input";
import { GEAR_STATS } from "./physics/vehicleTuning";

type MusicMode = "off" | "menu";
type EngineKind = "car" | "bike";

const MENU_VOL = 0.28;
const SFX_MASTER_VOL = 0.55;
const EXPLODE_VOL = 0.72;
const CAR_ENGINE_VOL = 0.38;
const BIKE_ENGINE_VOL = 0.36;
const USER_MUTE_KEY = "racer-online-muted";

export class GameAudio {
  private ctx: AudioContext | null = null;
  /** Top-level bus — speaker mute sets this to 0 (all SFX + music). */
  private output: GainNode | null = null;
  private master: GainNode | null = null;
  /** Separate bus so pause/finish SFX mute doesn't stop menu routing. */
  private musicGain: GainNode | null = null;

  private unlocked = false;
  /** SFX muted (pause / home / finish) — does not affect music bus. */
  private muted = true;
  /** User speaker mute — silences everything. */
  private userMuted = false;

  private menuBuffer: AudioBuffer | null = null;
  private explodeBuffer: AudioBuffer | null = null;
  private menuSource: AudioBufferSourceNode | null = null;
  private musicMode: MusicMode = "off";
  private wantedMusic: MusicMode = "off";
  private loadPromise: Promise<void> | null = null;
  private musicSeq = 0;

  /** Procedural drive engine (car or bike). */
  private engineKind: EngineKind | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineOscA: OscillatorNode | null = null;
  private engineOscB: OscillatorNode | null = null;
  private engineOscC: OscillatorNode | null = null;
  private engineNoise: AudioBufferSourceNode | null = null;
  private engineNoiseGain: GainNode | null = null;
  private engineNoiseFilter: BiquadFilterNode | null = null;
  private lastGear: Gear | null = null;
  private noiseBuf: AudioBuffer | null = null;

  constructor() {
    try {
      // First-time visitors start muted; a stored choice always wins.
      this.userMuted = localStorage.getItem(USER_MUTE_KEY) !== "0";
    } catch {
      this.userMuted = true;
    }
  }

  get isUserMuted(): boolean {
    return this.userMuted;
  }

  /** Speaker button — mute/unmute all output (music + countdown + boom). */
  setUserMuted(muted: boolean): void {
    this.userMuted = muted;
    try {
      localStorage.setItem(USER_MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* private mode / blocked storage */
    }
    this.applyUserMuteGain();
  }

  toggleUserMute(): boolean {
    this.setUserMuted(!this.userMuted);
    return this.userMuted;
  }

  /** Resume/create AudioContext — call from a click handler. */
  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* autoplay still blocked — will retry next gesture */
      }
    }
    this.unlocked = ctx.state === "running";
    if (this.unlocked) void this.ensureTracksLoaded();
  }

  /** Mute SFX output (pause / home / finish). Music is controlled separately. */
  mute(): void {
    this.muted = true;
    this.setMasterGain(0, 0.08);
    this.stopDriveEngine();
  }

  /** Unmute SFX while driving / countdown (after unlock). */
  unmute(): void {
    this.muted = false;
    if (!this.unlocked || !this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(SFX_MASTER_VOL, now);
  }

  /** Looping homepage / BOARD music. */
  playMenuMusic(): void {
    void this.setMusic("menu");
  }

  stopMenuMusic(): void {
    if (this.wantedMusic === "menu" || this.musicMode === "menu") {
      void this.setMusic("off");
    }
  }

  /** @deprecated Cars use procedural engines now — kept as a no-op for call sites. */
  playDriveMusic(): void {
    this.stopMenuMusic();
  }

  stopDriveMusic(): void {
    /* drive music removed — engines are procedural */
  }

  /** Stop menu music. Does not stop the drive engine. */
  stopMusic(): void {
    void this.setMusic("off");
  }

  /** Kill drive engine + menu (pause / finish / explode / home). */
  stopRaceAudio(): void {
    this.stopDriveEngine();
  }

  /** @deprecated Use updateDriveEngine — alias kept for older call sites. */
  updateBikeEngine(speedMs: number, throttle: number): void {
    this.updateDriveEngine("bike", speedMs, throttle, 1);
  }

  stopBikeEngine(): void {
    this.stopDriveEngine();
  }

  /**
   * Procedural car/bike engine — same speed→RPM curve for both; timbre differs.
   * Plays a shift clunk when `gear` changes.
   */
  updateDriveEngine(
    kind: EngineKind,
    speedMs: number,
    throttle: number,
    gear: Gear,
  ): void {
    if (!this.ready || !this.ctx || !this.master) {
      this.stopDriveEngine();
      return;
    }
    this.stopMenuMusic();

    if (this.lastGear != null && gear !== this.lastGear && gear !== "N") {
      this.playGearShift(kind);
    }
    this.lastGear = gear;

    if (!this.engineGain || this.engineKind !== kind) {
      this.startDriveEngine(kind);
      if (!this.engineGain) return;
    }

    const kmh = Math.max(0, speedMs) * 3.6;
    const th = Math.max(0, Math.min(1, throttle));
    const gearMax =
      gear === "N" || gear === "R"
        ? gear === "R"
          ? GEAR_STATS.R.max * 3.6
          : 40
        : GEAR_STATS[gear].max * 3.6;
    // Shared RPM feel — identical mapping for car and bike.
    const inGear = Math.max(0, Math.min(1.05, kmh / Math.max(8, gearMax)));
    const idle = kmh < 2 ? 1 : 0;
    const rpm = idle * 0.22 + inGear * 0.78 + th * 0.12;

    const now = this.ctx.currentTime;
    const isBike = kind === "bike";
    // Bike: higher buzz. Car: deeper growl. Same rpm drives both.
    const base = isBike ? 88 : 48;
    const span = isBike ? 210 : 145;
    const f0 = base + rpm * span;
    const f1 = f0 * (isBike ? 2.05 : 1.55);
    const f2 = f0 * (isBike ? 3.1 : 2.35);

    this.engineOscA?.frequency.setTargetAtTime(f0, now, 0.05);
    this.engineOscB?.frequency.setTargetAtTime(f1, now, 0.05);
    this.engineOscC?.frequency.setTargetAtTime(f2, now, 0.06);

    const cutoff = (isBike ? 900 : 520) + rpm * (isBike ? 2800 : 1600) + th * 400;
    this.engineFilter?.frequency.setTargetAtTime(cutoff, now, 0.07);
    this.engineNoiseFilter?.frequency.setTargetAtTime(
      (isBike ? 1400 : 700) + rpm * (isBike ? 2200 : 1100),
      now,
      0.08,
    );

    const peak = isBike ? BIKE_ENGINE_VOL : CAR_ENGINE_VOL;
    const vol =
      peak *
      (0.14 + Math.min(1, kmh / 160) * 0.55 + th * 0.28 + (gear === "N" ? 0.08 : 0));
    this.engineGain.gain.setTargetAtTime(Math.max(0.0001, vol), now, 0.06);
    if (this.engineNoiseGain) {
      this.engineNoiseGain.gain.setTargetAtTime(
        Math.max(0.0001, vol * (isBike ? 0.22 : 0.35) * (0.35 + th * 0.65)),
        now,
        0.08,
      );
    }
  }

  stopDriveEngine(): void {
    for (const osc of [this.engineOscA, this.engineOscB, this.engineOscC]) {
      if (!osc) continue;
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
      try {
        osc.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.engineOscA = null;
    this.engineOscB = null;
    this.engineOscC = null;
    if (this.engineNoise) {
      try {
        this.engineNoise.stop();
      } catch {
        /* already stopped */
      }
      try {
        this.engineNoise.disconnect();
      } catch {
        /* already disconnected */
      }
      this.engineNoise = null;
    }
    for (const node of [
      this.engineNoiseGain,
      this.engineNoiseFilter,
      this.engineFilter,
      this.engineGain,
    ]) {
      if (!node) continue;
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.engineNoiseGain = null;
    this.engineNoiseFilter = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.engineKind = null;
    this.lastGear = null;
  }

  private startDriveEngine(kind: EngineKind): void {
    if (!this.ready || !this.ctx || !this.master) return;
    this.stopDriveEngine();
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = kind === "bike" ? 0.9 : 1.2;
    filter.frequency.value = kind === "bike" ? 1200 : 600;
    filter.connect(gain);

    const mkOsc = (type: OscillatorType, detune: number) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.value = kind === "bike" ? 90 : 50;
      const g = ctx.createGain();
      g.gain.value = type === "sawtooth" ? 0.28 : type === "square" ? 0.12 : 0.18;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return osc;
    };

    this.engineOscA = mkOsc("sawtooth", 0);
    this.engineOscB = mkOsc(kind === "bike" ? "square" : "triangle", 7);
    this.engineOscC = mkOsc(kind === "bike" ? "sawtooth" : "sine", -11);

    // Exhaust / intake noise bed
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = kind === "bike" ? 1600 : 800;
    nFilter.Q.value = 0.7;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.0001;
    nFilter.connect(nGain);
    nGain.connect(gain);
    const noise = ctx.createBufferSource();
    noise.buffer = this.ensureNoiseBuffer(1.2);
    noise.loop = true;
    noise.connect(nFilter);
    noise.start();

    this.engineNoise = noise;
    this.engineNoiseFilter = nFilter;
    this.engineNoiseGain = nGain;
    this.engineFilter = filter;
    this.engineGain = gain;
    this.engineKind = kind;
  }

  /** Mechanical shift — short clutch scrape + engagement click. */
  playGearShift(kind: EngineKind = "car"): void {
    if (!this.ready || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const isBike = kind === "bike";

    // Clutch / chain scrape
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = this.ensureNoiseBuffer(0.08);
    const nF = ctx.createBiquadFilter();
    nF.type = "bandpass";
    nF.frequency.value = isBike ? 2400 : 900;
    nF.Q.value = 1.4;
    const nG = ctx.createGain();
    nG.gain.setValueAtTime(0.0001, now);
    nG.gain.exponentialRampToValueAtTime(isBike ? 0.22 : 0.28, now + 0.004);
    nG.gain.exponentialRampToValueAtTime(0.0001, now + (isBike ? 0.07 : 0.09));
    nSrc.connect(nF);
    nF.connect(nG);
    nG.connect(this.master);
    nSrc.start(now);
    nSrc.stop(now + 0.12);

    // Engagement tick (two stacked tones)
    const click = (freq: number, when: number, peak: number, dur: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, when);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, when + dur);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(when);
      osc.stop(when + dur + 0.02);
    };
    click(isBike ? 520 : 180, now + 0.02, isBike ? 0.14 : 0.18, 0.05);
    click(isBike ? 780 : 260, now + 0.035, isBike ? 0.1 : 0.12, 0.04);
  }

  /**
   * Mario Kart–style race start: three identical short preparatory beeps,
   * then a longer / higher “GO!” cue.
   */
  playCountdown(label: "3" | "2" | "1" | "GO"): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const isGo = label === "GO";

    const freq = isGo ? 1046.5 : 659.25;
    const dur = isGo ? 0.48 : 0.11;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(isGo ? 0.2 : 0.18, now + 0.008);
    if (isGo) {
      gain.gain.setValueAtTime(0.2, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    }

    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    if (isGo) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(freq * 1.5, now);
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain2.gain.setValueAtTime(0.12, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc2.connect(gain2);
      gain2.connect(this.master!);
      osc2.start(now);
      osc2.stop(now + dur + 0.02);
    }
  }

  /** Low boom + noise burst — animal hits (and fallback if explode sample missing). */
  playBoom(): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.55, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    osc.start(now);
    osc.stop(now + 0.58);

    this.playNoiseBurst(0.35, 0.42, 1400);
    this.playNoiseBurst(0.18, 0.28, 420);
  }

  /** Sampled explosion for wall-limit car crash / explode. */
  playExplode(): void {
    if (!this.ready) return;
    if (!this.explodeBuffer) {
      this.playBoom();
      return;
    }
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.explodeBuffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(EXPLODE_VOL, now);
    src.connect(gain);
    gain.connect(this.master!);
    src.start(now);
  }

  private get ready(): boolean {
    return this.unlocked && !this.muted && !!this.ctx && !!this.master;
  }

  private applyUserMuteGain(): void {
    if (!this.output || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.userMuted ? 0 : 1, now);
  }

  private async setMusic(mode: MusicMode): Promise<void> {
    this.wantedMusic = mode;
    const seq = ++this.musicSeq;
    this.ensureContext();
    if (this.ctx!.state === "suspended") {
      try {
        await this.ctx!.resume();
      } catch {
        return;
      }
    }
    this.unlocked = this.ctx!.state === "running";
    if (!this.unlocked) return;

    await this.ensureTracksLoaded();
    if (seq !== this.musicSeq || this.wantedMusic !== mode) return;

    if (mode === this.musicMode) {
      if (mode === "menu" && this.menuSource) return;
      if (mode === "off") return;
    }

    this.stopMusicSources();
    this.musicMode = mode;

    if (mode === "off" || !this.musicGain) return;

    const buffer = this.menuBuffer;
    if (!buffer) return;

    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.musicGain);
    const now = this.ctx!.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(0.0001, now);
    this.musicGain.gain.exponentialRampToValueAtTime(MENU_VOL, now + 0.12);
    src.start(0);
    this.menuSource = src;
  }

  private stopMusicSources(): void {
    if (this.menuSource) {
      try {
        this.menuSource.stop();
      } catch {
        /* already stopped */
      }
      try {
        this.menuSource.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.menuSource = null;
    this.musicMode = "off";
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(0, now);
    }
  }

  private ensureTracksLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadTracks().catch((err) => {
        this.loadPromise = null;
        console.warn("Failed to load audio tracks", err);
      });
    }
    return this.loadPromise;
  }

  private async loadTracks(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    const [menu, explode] = await Promise.all([
      this.fetchBuffer(`${base}audio/menu.mp3`),
      this.fetchBuffer(`${base}audio/explode.mp3`).catch((err) => {
        console.warn("Failed to load explode SFX", err);
        return null;
      }),
    ]);
    this.menuBuffer = menu;
    this.explodeBuffer = explode;
  }

  private async fetchBuffer(url: string): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Audio fetch failed: ${url} (${res.status})`);
    const data = await res.arrayBuffer();
    return ctx.decodeAudioData(data.slice(0));
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctx();

      this.output = this.ctx.createGain();
      this.output.gain.value = this.userMuted ? 0 : 1;
      this.output.connect(this.ctx.destination);

      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.output);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.output);
    }
    return this.ctx;
  }

  private setMasterGain(value: number, tau: number): void {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, tau);
  }

  private ensureNoiseBuffer(seconds: number): AudioBuffer {
    if (this.noiseBuf && this.noiseBuf.duration >= seconds - 0.01) return this.noiseBuf;
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  private playNoiseBurst(duration: number, peak: number, cutoff: number): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.ensureNoiseBuffer(0.12);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }
}
