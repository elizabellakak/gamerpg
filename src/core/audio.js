// Procedural WebAudio SFX + generative pentatonic BGM (no audio files needed)
class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sfxVol = 0.55;
    this.musicVol = 0.28;
    this.bgmOn = false;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master.connect(this.comp).connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
    this.music = this.ctx.createGain(); this.music.gain.value = this.musicVol; this.music.connect(this.master);
    // reverb send
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.4, 2.5);
    const rv = this.ctx.createGain(); rv.gain.value = 0.35;
    this.reverb.connect(rv).connect(this.master);
    this.noiseBuf = this.makeNoise();
  }

  resume() { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 1; }

  impulse(dur, decay) {
    const rate = this.ctx.sampleRate, len = rate * dur;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  env(g, t, a, peak, d, sustain = 0.0001) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }

  osc(type, freq, t, dur, vol, { to = null, dest = null, rev = 0, attack = 0.005 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    this.env(g, t, attack, vol, dur);
    o.connect(g).connect(dest || this.sfx);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s).connect(this.reverb); }
    o.start(t); o.stop(t + attack + dur + 0.05);
    return o;
  }

  noise(t, dur, vol, { type = 'bandpass', freq = 1000, to = null, q = 1, rev = 0, attack = 0.003, dest = null } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    this.env(g, t, attack, vol, dur);
    src.connect(f).connect(g).connect(dest || this.sfx);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s).connect(this.reverb); }
    src.start(t, Math.random()); src.stop(t + attack + dur + 0.05);
  }

  play(name, opt = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.005;
    const p = opt.pitch || 1;
    switch (name) {
      case 'swing':
        this.noise(t, 0.16, 0.35, { freq: 2400 * p, to: 700, q: 1.2 });
        break;
      case 'swingHeavy':
        this.noise(t, 0.28, 0.5, { freq: 1600 * p, to: 300, q: 0.9 });
        this.osc('sine', 120, t, 0.25, 0.25, { to: 60 });
        break;
      case 'hit':
        this.noise(t, 0.08, 0.5, { type: 'lowpass', freq: 3000, to: 400 });
        this.osc('triangle', 180 * p, t, 0.12, 0.4, { to: 70 });
        break;
      case 'crit':
        this.noise(t, 0.12, 0.6, { type: 'highpass', freq: 3000, to: 1500 });
        this.osc('square', 880, t, 0.1, 0.12, { to: 440 });
        this.osc('triangle', 160, t, 0.2, 0.5, { to: 50 });
        break;
      case 'slashWave':
        this.noise(t, 0.4, 0.45, { freq: 4000, to: 500, q: 2, rev: 0.4 });
        this.osc('sawtooth', 300, t, 0.35, 0.08, { to: 900 });
        break;
      case 'whirl':
        for (let i = 0; i < 6; i++) this.noise(t + i * 0.12, 0.14, 0.25, { freq: 1500 + i * 200, to: 600, q: 2 });
        break;
      case 'thunder':
        this.noise(t, 0.05, 0.8, { type: 'highpass', freq: 2000 });
        this.noise(t + 0.02, 0.9, 0.7, { type: 'lowpass', freq: 1200, to: 80, rev: 0.6 });
        this.osc('sawtooth', 90, t, 0.4, 0.2, { to: 40 });
        break;
      case 'boom':
        this.noise(t, 1.4, 0.9, { type: 'lowpass', freq: 900, to: 40, rev: 0.7 });
        this.osc('sine', 80, t, 1.0, 0.8, { to: 25 });
        break;
      case 'charge':
        this.osc('sawtooth', 110, t, 1.4, 0.12, { to: 880, attack: 0.6, rev: 0.5 });
        this.osc('sine', 220, t, 1.4, 0.18, { to: 1760, attack: 0.6, rev: 0.5 });
        this.noise(t, 1.4, 0.15, { freq: 500, to: 5000, q: 3, attack: 0.8 });
        break;
      case 'choir': {
        const notes = [261.6, 329.6, 392, 523.2, 659.3];
        notes.forEach((f) => { this.osc('sawtooth', f, t, 2.2, 0.04, { attack: 0.3, rev: 1 }); this.osc('sine', f * 2, t, 2.2, 0.05, { attack: 0.3, rev: 1 }); });
        break;
      }
      case 'dash':
        this.noise(t, 0.22, 0.4, { freq: 800, to: 3000, q: 1.5 });
        break;
      case 'hurt':
        this.osc('square', 200, t, 0.15, 0.15, { to: 90 });
        this.noise(t, 0.1, 0.3, { type: 'lowpass', freq: 1500 });
        break;
      case 'roar':
        this.noise(t, 1.6, 0.8, { type: 'bandpass', freq: 300, to: 120, q: 0.8, rev: 0.5, attack: 0.1 });
        this.osc('sawtooth', 70, t, 1.6, 0.35, { to: 45, attack: 0.1 });
        this.osc('sawtooth', 105, t, 1.6, 0.2, { to: 60, attack: 0.1 });
        break;
      case 'fire':
        this.noise(t, 0.9, 0.5, { type: 'lowpass', freq: 2500, to: 600, attack: 0.08 });
        break;
      case 'coin':
        this.osc('square', 988, t, 0.06, 0.08); this.osc('square', 1319, t + 0.07, 0.2, 0.08);
        break;
      case 'pickup':
        this.osc('sine', 660, t, 0.1, 0.2, { to: 1320 });
        break;
      case 'levelup': {
        const s = [523.2, 659.3, 784, 1046.5, 1318.5];
        s.forEach((f, i) => this.osc('triangle', f, t + i * 0.09, 0.5, 0.2, { rev: 0.6 }));
        this.osc('sine', 130, t, 1.2, 0.3, { rev: 0.5 });
        break;
      }
      case 'anvil':
        [1, 2.76, 5.4, 8.93].forEach((m, i) => this.osc('sine', 520 * m * p, t, 0.9 / (i + 1), 0.25 / (i + 1), { rev: 0.5 }));
        this.noise(t, 0.05, 0.5, { type: 'highpass', freq: 3000 });
        break;
      case 'success': {
        const s = [523.2, 659.3, 784, 1046.5];
        s.forEach((f, i) => { this.osc('triangle', f, t + i * 0.08, 0.6, 0.18, { rev: 0.7 }); this.osc('sine', f * 2, t + i * 0.08, 0.6, 0.06, { rev: 0.7 }); });
        this.noise(t, 1.2, 0.12, { type: 'highpass', freq: 6000, rev: 0.8, attack: 0.05 });
        break;
      }
      case 'bigSuccess': {
        const s = [392, 523.2, 659.3, 784, 1046.5, 1318.5, 1568];
        s.forEach((f, i) => this.osc('triangle', f, t + i * 0.07, 1.2, 0.16, { rev: 0.9 }));
        [261.6, 329.6, 392].forEach((f) => this.osc('sawtooth', f, t + 0.5, 2.5, 0.05, { attack: 0.2, rev: 1 }));
        this.play('boom');
        break;
      }
      case 'fail':
        this.osc('triangle', 392, t, 0.25, 0.2, { rev: 0.4 });
        this.osc('triangle', 311, t + 0.22, 0.3, 0.2, { rev: 0.4 });
        this.osc('triangle', 233, t + 0.46, 0.6, 0.2, { rev: 0.4 });
        break;
      case 'crash':
        this.noise(t, 0.8, 0.8, { type: 'highpass', freq: 1800, to: 500, rev: 0.6 });
        for (let i = 0; i < 8; i++) this.osc('sine', 1500 + Math.random() * 3000, t + Math.random() * 0.3, 0.3, 0.06);
        this.osc('sawtooth', 110, t, 0.8, 0.25, { to: 40 });
        break;
      case 'summon':
        this.osc('sine', 220, t, 2.5, 0.2, { to: 880, attack: 1.2, rev: 0.8 });
        this.osc('triangle', 330, t, 2.5, 0.1, { to: 1320, attack: 1.2, rev: 0.8 });
        this.noise(t, 2.5, 0.2, { freq: 300, to: 6000, q: 4, attack: 1.5, rev: 0.6 });
        break;
      case 'reveal':
        this.osc('triangle', 784 * p, t, 0.4, 0.2, { rev: 0.6 });
        this.osc('sine', 1568 * p, t, 0.5, 0.1, { rev: 0.6 });
        break;
      case 'meteor':
        this.noise(t, 0.6, 0.4, { freq: 4000, to: 300, q: 1.5 });
        break;
      case 'click':
        this.osc('sine', 1200, t, 0.04, 0.12);
        break;
      case 'open':
        this.osc('sine', 600, t, 0.12, 0.15, { to: 900 });
        break;
      default: break;
    }
  }

  // ---------- BGM ----------
  startBgm(mode = 'field') {
    if (!this.ctx) return;
    this.bgmMode = mode;
    if (this.bgmOn) return;
    this.bgmOn = true;
    this.nextNote = this.ctx.currentTime + 0.2;
    this.step = 0;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const chords = [[0, 7, 12], [-3, 4, 9], [-7, 0, 5], [-5, 2, 7]];
    const base = 220 * Math.pow(2, -5 / 12); // E
    const fq = (s) => base * Math.pow(2, s / 12);
    let melodyPos = 4;
    const sched = () => {
      if (!this.bgmOn) return;
      while (this.nextNote < this.ctx.currentTime + 0.3) {
        const t = this.nextNote;
        const beat = 60 / (this.bgmMode === 'boss' ? 132 : 84) / 2;
        const bar = Math.floor(this.step / 16) % chords.length;
        if (this.step % 16 === 0) {
          for (const n of chords[bar]) {
            this.osc('sawtooth', fq(n - 12), t, beat * 16, 0.018, { attack: 0.8, dest: this.music, rev: 0.6 });
            this.osc('sine', fq(n), t, beat * 16, 0.03, { attack: 0.8, dest: this.music, rev: 0.6 });
          }
          this.osc('sine', fq(chords[bar][0] - 24), t, beat * 8, 0.12, { attack: 0.05, dest: this.music });
        }
        if (this.bgmMode === 'boss') {
          if (this.step % 4 === 0) { this.osc('sine', 60, t, 0.2, 0.35, { to: 35, dest: this.music }); }
          if (this.step % 8 === 4) this.noise(t, 0.12, 0.15, { type: 'highpass', freq: 2000, dest: this.music });
        } else if (this.step % 8 === 4) {
          this.noise(t, 0.05, 0.03, { type: 'highpass', freq: 7000, dest: this.music });
        }
        // koto-like pluck melody
        if (Math.random() < (this.bgmMode === 'boss' ? 0.55 : 0.4) && this.step % 2 === 0) {
          melodyPos = Math.max(0, Math.min(scale.length - 1, melodyPos + Math.floor(Math.random() * 5) - 2));
          const f = fq(scale[melodyPos] + chords[bar][0] + 12);
          this.osc('triangle', f, t, beat * 3, 0.07, { attack: 0.003, dest: this.music, rev: 0.7 });
          this.osc('sine', f * 2, t, beat * 1.5, 0.025, { attack: 0.003, dest: this.music, rev: 0.7 });
        }
        this.nextNote += beat;
        this.step++;
      }
      this.bgmTimer = setTimeout(sched, 100);
    };
    sched();
  }
  stopBgm() { this.bgmOn = false; clearTimeout(this.bgmTimer); }
}

export const audio = new Audio();
