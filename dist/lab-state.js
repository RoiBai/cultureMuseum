// Interaction state, not a reconstruction of historical temperature or timing.
const clamp = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
export const MAX_ICE = 6;
export const MAX_RECORDING_EVENTS = 32;
export const MAX_RECORDING_SECONDS = 16;

export function createVesselState() {
  return { lift: 0, ice: 0, wine: 0, cooling: 0, phase: 'lift' };
}

export function vesselStep(state) {
  if (state.ice < 3) return state.lift >= .7 ? 1 : 0;
  if (state.lift > .08) return 2;
  return state.wine < .85 ? 3 : 4;
}

export function advanceVessel(state, action = {}) {
  if (action.type === 'reset') return createVesselState();
  const next = { ...state };
  switch (action.type) {
    case 'lift': next.lift = clamp(action.value, state.lift); break;
    case 'ice':
      if (state.lift >= .7) next.ice = Math.min(MAX_ICE, state.ice + 1);
      break;
    case 'wine':
      if (state.ice >= 3 && state.lift <= .08) next.wine = Math.max(state.wine, clamp(action.value, state.wine));
      break;
    case 'tick':
      // Four seconds is a readable interface animation, not measured cooling time.
      if (vesselStep(state) === 4 && Number.isFinite(action.dt) && action.dt > 0) {
        next.cooling = Math.min(1, state.cooling + action.dt / 4);
      }
      break;
  }
  const step = vesselStep(next);
  next.phase = ['lift', 'ice', 'return', 'wine', next.cooling >= 1 ? 'complete' : 'cooling'][step];
  return next;
}

const now = () => globalThis.performance?.now() ?? Date.now();

export class RhythmRecorder {
  constructor() {
    this._events = [];
    this.recording = false;
    this.duration = 0;
    this._startedAt = 0;
  }

  get events() { return this._events.map(event => ({ ...event })); }

  start(nowMs = now()) {
    this._events = [];
    this.duration = 0;
    this._startedAt = Number.isFinite(nowMs) ? nowMs : now();
    this.recording = true;
    return this;
  }

  hit(radius = .3, strength = .7, nowMs = now()) {
    if (!this.recording || !Number.isFinite(nowMs)) return null;
    const time = (nowMs - this._startedAt) / 1000;
    if (time < 0 || time < (this._events.at(-1)?.time ?? 0)) return null;
    if (time > MAX_RECORDING_SECONDS || this._events.length >= MAX_RECORDING_EVENTS) {
      this.stop(nowMs);
      return null;
    }
    const event = { time, radius: clamp(radius, .3), strength: clamp(strength, .7) };
    this._events.push(event);
    this.duration = time;
    if (time === MAX_RECORDING_SECONDS || this._events.length === MAX_RECORDING_EVENTS) this.recording = false;
    return { ...event };
  }

  stop(nowMs = now()) {
    if (this.recording && Number.isFinite(nowMs)) {
      this.duration = Math.min(MAX_RECORDING_SECONDS, Math.max(this.duration, (nowMs - this._startedAt) / 1000));
    }
    this.recording = false;
    return this.events;
  }
}
