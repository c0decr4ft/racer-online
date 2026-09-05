export class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur, type = "square", gain = 0.08, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, gain = 0.12, hp = 800) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t);
  }

  shoot() {
    this.noise(0.05, 0.1, 1200);
    this.tone(180, 0.07, "square", 0.05, -80);
  }

  splat() {
    this.noise(0.12, 0.14, 400);
    this.tone(90, 0.1, "sine", 0.06, -40);
  }

  hit() {
    this.tone(140, 0.18, "sawtooth", 0.09, -90);
    this.noise(0.2, 0.16, 200);
  }

  elim() {
    this.tone(320, 0.12, "square", 0.06, 80);
    this.tone(480, 0.18, "square", 0.04, 40);
  }

  empty() {
    this.tone(90, 0.08, "square", 0.04);
  }

  reload() {
    this.tone(220, 0.08, "triangle", 0.05);
    this.tone(160, 0.12, "triangle", 0.04, -20);
  }
}
