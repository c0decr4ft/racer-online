/**
 * Web Audio — countdown beeps / explode boom + looping menu/drive music.
 * Unlocks on first user gesture (Start / BOARD / overlay click).
 * Speaker toggle mutes everything via a top-level gain (persisted in localStorage).
 *
 * Explode SFX: public/audio/explode.mp3 — Freesound “explosion-42132” (freesound_community).
 */

type MusicMode = "off" | "menu" | "drive";

const MENU_VOL = 0.28;
const DRIVE_VOL = 0.34;
const SFX_MASTER_VOL = 0.55;
/** Sampled wall-explode crash (separate from synthesized animal-hit boom). */
const EXPLODE_VOL = 0.72;
const USER_MUTE_KEY = "racer-online-muted";

export class GameAudio {
  private ctx: AudioContext | null = null;
  /** Top-level bus — speaker mute sets this to 0 (all SFX + music). */
  private output: GainNode | null = null;
  private master: GainNode | null = null;
  /** Separate bus so pause/finish SFX mute doesn't stop menu/drive routing. */
  private musicGain: GainNode | null = null;

  private unlocked = false;
  /** SFX muted (pause / home / finish) — does not affect music bus. */
  private muted = true;
  /** User speaker mute — silences everything. */
  private userMuted = false;

  private menuBuffer: AudioBuffer | null = null;
  private driveBuffer: AudioBuffer | null = null;
  private explodeBuffer: AudioBuffer | null = null;
  private menuSource: AudioBufferSourceNode | null = null;
  private driveSource: AudioBufferSourceNode | null = null;
  private musicMode: MusicMode = "off";
  private wantedMusic: MusicMode = "off";
  private loadPromise: Promise<void> | null = null;
  private musicSeq = 0;

  constructor() {
    try {
      this.userMuted = localStorage.getItem(USER_MUTE_KEY) === "1";
    } catch {
      this.userMuted = false;
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
  }

  /** Unmute SFX while driving / countdown (after unlock). */
  unmute(): void {
    this.muted = false;
    if (!this.unlocked || !this.master || !this.ctx) return;
    // Snap up so the first countdown beep isn't swallowed by a slow ramp
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

  /** Looping race / Test Drive music (after GO). */
  playDriveMusic(): void {
    void this.setMusic("drive");
  }

  stopDriveMusic(): void {
    if (this.wantedMusic === "drive" || this.musicMode === "drive") {
      void this.setMusic("off");
    }
  }

  /** Stop whichever track is playing. */
  stopMusic(): void {
    void this.setMusic("off");
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

    // Prep: same mid pitch; GO: higher + longer (classic start fanfare)
    const freq = isGo ? 1046.5 : 659.25; // C6 vs E5
    const dur = isGo ? 0.48 : 0.11;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now);

    // Crisp electronic envelope — no weird sweeps on the numbers
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(isGo ? 0.2 : 0.18, now + 0.008);
    if (isGo) {
      // Hold then fade — longer distinctive start cue
      gain.gain.setValueAtTime(0.2, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    }

    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    // GO: second oscillator a fifth up for a simple fanfare (still beep-like)
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
      if (mode === "drive" && this.driveSource) return;
      if (mode === "off") return;
    }

    this.stopMusicSources();
    this.musicMode = mode;

    if (mode === "off" || !this.musicGain) return;

    const buffer = mode === "menu" ? this.menuBuffer : this.driveBuffer;
    if (!buffer) return;

    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.musicGain);
    const vol = mode === "menu" ? MENU_VOL : DRIVE_VOL;
    const now = this.ctx!.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(0.0001, now);
    this.musicGain.gain.exponentialRampToValueAtTime(vol, now + 0.12);
    src.start(0);
    if (mode === "menu") this.menuSource = src;
    else this.driveSource = src;
  }

  private stopMusicSources(): void {
    for (const src of [this.menuSource, this.driveSource]) {
      if (!src) continue;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.menuSource = null;
    this.driveSource = null;
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
        console.warn("Failed to load music tracks", err);
      });
    }
    return this.loadPromise;
  }

  private async loadTracks(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    const [menu, drive, explode] = await Promise.all([
      this.fetchBuffer(`${base}audio/menu.mp3`),
      this.fetchBuffer(`${base}audio/drive.mp3`),
      this.fetchBuffer(`${base}audio/explode.mp3`).catch((err) => {
        console.warn("Failed to load explode SFX", err);
        return null;
      }),
    ]);
    this.menuBuffer = menu;
    this.driveBuffer = drive;
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

      // output (user mute) → destination
      this.output = this.ctx.createGain();
      this.output.gain.value = this.userMuted ? 0 : 1;
      this.output.connect(this.ctx.destination);

      // SFX master → output
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.output);

      // Music → output (independent of pause SFX mute)
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

  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private playNoiseBurst(duration: number, peak: number, cutoff: number): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(0.12);
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
