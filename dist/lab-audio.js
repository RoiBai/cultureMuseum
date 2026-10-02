// Synthetic drum demonstration. These modes and envelopes are designed sounds,
// not recordings or a reconstruction of the ancient instrument's acoustics.
const clamp = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const MODES = [1, 1.593, 2.136, 2.296];
const TAIL_SECONDS = 1.15;

export class LabDrumAudio {
  constructor(options = {}) {
    this.context = null;
    this.nodes = new Set();
    this.playing = false;
    this._voices = new Map();
    this._volume = clamp(options.volume ?? .65, .65);
    this._contextFactory = options.contextFactory ?? (() => {
      const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContextClass) throw new Error('This browser does not support Web Audio.');
      return new AudioContextClass();
    });
    this._requestFrame = options.requestFrame ?? (callback => globalThis.requestAnimationFrame(callback));
    this._cancelFrame = options.cancelFrame ?? (id => globalThis.cancelAnimationFrame(id));
    this._generation = 0;
    this._frame = null;
    this._resume = null;
    this._master = null;
    this._disposed = false;
  }

  get volume() { return this._volume; }
  set volume(value) { this.setVolume(value); }

  setVolume(value) {
    this._volume = clamp(value, this._volume);
    if (this._master) this._master.gain.setValueAtTime(this._volume, this.context.currentTime);
    return this._volume;
  }

  async start() {
    if (this._disposed) return null;
    if (!this.context) {
      this.context = this._contextFactory();
      this._master = this.context.createGain();
      this._master.gain.setValueAtTime(this._volume, this.context.currentTime);
      this._master.connect(this.context.destination);
    }
    const context = this.context;
    if (context.state === 'suspended') {
      if (!this._resume) {
        const pending = Promise.resolve(context.resume());
        this._resume = pending;
        try { await pending; } finally { if (this._resume === pending) this._resume = null; }
      } else await this._resume;
    }
    return !this._disposed && this.context === context && context.state === 'running' ? context : null;
  }

  strike(radius = .3, strength = .7, timeSeconds) {
    const context = this.context;
    if (this._disposed || !context || context.state !== 'running') return false;
    radius = clamp(radius, .3);
    strength = clamp(strength, .7);
    if (!strength) return false;
    const start = Math.max(context.currentTime, Number.isFinite(timeSeconds) ? timeSeconds : context.currentTime);
    const fundamental = 83 + radius * 35;
    const duration = .98 - radius * .27;
    MODES.forEach((ratio, index) => {
      // Edge strikes put relatively more energy into the upper modes.
      const amplitude = .27 * strength * (index ? (.42 + radius * .9) / (index + 1) : (1 - radius * .3));
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(fundamental * ratio * 1.07, start);
      oscillator.frequency.exponentialRampToValueAtTime(fundamental * ratio, start + .045);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.00011, amplitude), start + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration / (1 + index * .23));
      oscillator.connect(gain);
      gain.connect(this._master);
      this.nodes.add(oscillator);
      this._voices.set(oscillator, gain);
      oscillator.onended = () => this._disconnectVoice(oscillator);
      oscillator.start(start);
      oscillator.stop(start + duration + .06);
    });
    return true;
  }

  _disconnectVoice(oscillator) {
    const gain = this._voices.get(oscillator);
    oscillator.onended = null;
    try { oscillator.disconnect(); } catch {}
    try { gain?.disconnect(); } catch {}
    this.nodes.delete(oscillator);
    this._voices.delete(oscillator);
  }

  async play(events, { onHit, onEnd } = {}) {
    this.stop();
    const generation = this._generation;
    const score = (Array.isArray(events) ? events : [])
      .filter(event => event && Number.isFinite(event.time) && event.time >= 0 && event.time <= 16)
      .slice(0, 32)
      .map(event => ({ time: event.time, radius: clamp(event.radius, .3), strength: clamp(event.strength, .7) }))
      .sort((a, b) => a.time - b.time);
    if (!score.length || this._disposed) return false;
    let context;
    try { context = await this.start(); } catch (error) {
      if (generation !== this._generation || this._disposed) return false;
      throw error;
    }
    // stop(), another play(), or dispose() may have happened while resume waited.
    if (!context || generation !== this._generation || this._disposed) return false;
    const startedAt = context.currentTime + .035;
    this.playing = true;
    for (const event of score) this.strike(event.radius, event.strength, startedAt + event.time);
    let cursor = 0;
    const finishAt = startedAt + score.at(-1).time + TAIL_SECONDS;
    const frame = () => {
      if (generation !== this._generation || this._disposed) return;
      this._frame = null;
      while (cursor < score.length && context.currentTime >= startedAt + score[cursor].time) {
        const index = cursor++;
        onHit?.({ ...score[index] }, index);
        if (generation !== this._generation || this._disposed) return;
      }
      if (context.currentTime >= finishAt) {
        this.playing = false;
        onEnd?.();
        return;
      }
      this._frame = this._requestFrame(frame);
    };
    this._frame = this._requestFrame(frame);
    return true;
  }

  stop() {
    this._generation++;
    this.playing = false;
    if (this._frame !== null) this._cancelFrame(this._frame);
    this._frame = null;
    for (const oscillator of [...this.nodes]) {
      try { oscillator.stop(); } catch {}
      this._disconnectVoice(oscillator);
    }
  }

  dispose() {
    this._disposed = true;
    this.stop();
    const context = this.context;
    this.context = null;
    this._master?.disconnect();
    this._master = null;
    if (context && context.state !== 'closed') return context.close();
    return Promise.resolve();
  }
}
