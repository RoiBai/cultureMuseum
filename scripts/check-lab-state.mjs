import assert from 'node:assert/strict';
import { createVesselState, advanceVessel, vesselStep, RhythmRecorder } from '../dist/lab-state.js';
import { LabDrumAudio } from '../dist/lab-audio.js';

let state = Object.freeze(createVesselState());
assert.equal(vesselStep(state), 0);
assert.equal(advanceVessel(state, { type: 'ice' }).ice, 0, 'Ice requires room under the lifted vessel');
assert.equal(advanceVessel(state, { type: 'wine', value: 1 }).wine, 0, 'Wine cannot skip the ice operation');
assert.equal(advanceVessel(state, { type: 'tick', dt: 30 }).cooling, 0);
assert.equal(state.lift, 0, 'Transitions do not mutate input');
state = advanceVessel(state, { type: 'lift', value: .699 });
assert.equal(advanceVessel(state, { type: 'ice' }).ice, 0);
state = advanceVessel(state, { type: 'lift', value: .7 });
assert.equal(vesselStep(state), 1);
for (let index = 0; index < 9; index++) state = advanceVessel(state, { type: 'ice' });
assert.equal(state.ice, 6, 'Ice is capped');
assert.equal(vesselStep(state), 2);
assert.equal(advanceVessel(state, { type: 'wine', value: 1 }).wine, 0, 'Raised vessel cannot be filled');
state = advanceVessel(state, { type: 'lift', value: .081 });
assert.equal(advanceVessel(state, { type: 'wine', value: 1 }).wine, 0);
state = advanceVessel(state, { type: 'lift', value: .08 });
assert.equal(vesselStep(state), 3);
state = advanceVessel(state, { type: 'wine', value: .84 });
assert.equal(advanceVessel(state, { type: 'tick', dt: 30 }).cooling, 0, 'Cooling requires enough wine');
state = advanceVessel(state, { type: 'wine', value: .85 });
assert.equal(vesselStep(state), 4);
state = advanceVessel(state, { type: 'tick', dt: 1 });
assert(state.cooling > 0 && state.cooling < 1);
const coolingBeforeLift = state.cooling;
state = advanceVessel(state, { type: 'lift', value: 1 });
state = advanceVessel(state, { type: 'tick', dt: 30 });
assert.equal(state.cooling, coolingBeforeLift, 'Lifting the filled vessel pauses the cooling illustration');
state = advanceVessel(state, { type: 'lift', value: -10 });
assert.equal(state.lift, 0);
state = advanceVessel(state, { type: 'wine', value: 99 });
assert.equal(state.wine, 1);
state = advanceVessel(state, { type: 'wine', value: .2 });
assert.equal(state.wine, 1, 'The pour action only adds liquid');
for (const dt of [-1, NaN, Infinity]) assert.equal(advanceVessel(state, { type: 'tick', dt }).cooling, coolingBeforeLift);
state = advanceVessel(state, { type: 'tick', dt: 30 });
assert.equal(state.cooling, 1);
assert.equal(state.phase, 'complete');
assert.deepEqual(advanceVessel(state, { type: 'reset' }), createVesselState());
let tooLittleIce = advanceVessel(createVesselState(), { type: 'lift', value: 1 });
tooLittleIce = advanceVessel(tooLittleIce, { type: 'ice' });
tooLittleIce = advanceVessel(tooLittleIce, { type: 'ice' });
tooLittleIce = advanceVessel(tooLittleIce, { type: 'lift', value: 0 });
assert.equal(advanceVessel(tooLittleIce, { type: 'wine', value: 1 }).wine, 0, 'Two ice blocks are not the completed step');

const recorder = new RhythmRecorder();
assert.equal(recorder.hit(.5, .5, 1000), null);
recorder.start(1000);
assert.equal(recorder.hit(.3, .7, 999), null, 'Events cannot precede recording');
assert.deepEqual(recorder.hit(-1, 2, 1500), { time: .5, radius: 0, strength: 1 });
assert.equal(recorder.hit(.3, .7, 1200), null, 'Out-of-order clocks cannot reorder the performance');
const snapshot = recorder.events;
snapshot[0].time = 123;
assert.equal(recorder.events[0].time, .5, 'UI snapshots cannot corrupt a performance');
assert.deepEqual(recorder.stop(2000), [{ time: .5, radius: 0, strength: 1 }]);
assert.equal(recorder.duration, 1);
assert.equal(recorder.hit(.3, .7, 2500), null);
recorder.start(0);
for (let index = 0; index < 40; index++) recorder.hit(.5, .5, index * 100);
assert.equal(recorder.events.length, 32);
assert.equal(recorder.recording, false);
recorder.start(500);
assert.equal(recorder.events.length, 0, 'Restart replaces the previous take');
assert.equal(recorder.hit(.5, .5, 16500).time, 16);
assert.equal(recorder.recording, false);
recorder.start(0);
assert.equal(recorder.hit(.5, .5, 16001), null);
assert.equal(recorder.duration, 16);
assert.equal(recorder.recording, false);

// An injectable fake audio clock exercises cancellation without speakers or real waits.
function audioHarness({ suspended = false } = {}) {
  const oscillators = [], gains = [], frames = new Map();
  let frameId = 0, releaseResume, rejectResume, resumeCalls = 0;
  const parameter = () => ({ value: 0, calls: [], setValueAtTime(value, time) { this.value = value; this.calls.push([value, time]); }, exponentialRampToValueAtTime(value, time) { this.calls.push([value, time]); } });
  const context = {
    currentTime: 0, state: suspended ? 'suspended' : 'running', destination: {},
    createGain() {
      const gain = { gain: parameter(), connected: true, connect() {}, disconnect() { this.connected = false; } };
      gains.push(gain); return gain;
    },
    createOscillator() {
      const oscillator = {
        frequency: parameter(), connected: true, stopTimes: [],
        connect() {}, disconnect() { this.connected = false; },
        start(time) { this.startTime = time; }, stop(time) { this.stopTimes.push(time ?? context.currentTime); }
      };
      oscillators.push(oscillator); return oscillator;
    },
    resume() {
      resumeCalls++;
      return new Promise((resolve, reject) => {
        releaseResume = () => { context.state = 'running'; resolve(); };
        rejectResume = reject;
      });
    },
    close() { this.state = 'closed'; return Promise.resolve(); }
  };
  const audio = new LabDrumAudio({ contextFactory: () => context, requestFrame(callback) { frames.set(++frameId, callback); return frameId; }, cancelFrame(id) { frames.delete(id); } });
  return {
    audio, context, oscillators, gains, frames,
    get resumeCalls() { return resumeCalls; },
    release() { releaseResume(); },
    reject() { rejectResume(new Error('Audio context closed while resuming')); },
    tick(time) { context.currentTime = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); }
  };
}

const harness = audioHarness();
const { audio, oscillators, gains, frames } = harness;
await Promise.all([audio.start(), audio.start()]);
assert.equal(gains.length, 1, 'Repeated start shares one output');
audio.setVolume(.2);
assert.equal(gains[0].gain.value, .2);
audio.strike(0, .8);
const centerBase = oscillators[0].frequency.calls[0][0];
audio.strike(1, .8);
assert(oscillators[4].frequency.calls[0][0] > centerBase, 'The edge example sounds brighter');
audio.stop();
assert.equal(audio.nodes.size, 0);
assert(oscillators.every(oscillator => !oscillator.connected && oscillator.stopTimes.length === 2));
const hits = [], ended = [];
await audio.play([{ time: 0, radius: .2, strength: .6 }, { time: 1, radius: .8, strength: .7 }], { onHit: event => hits.push(event), onEnd: () => ended.push(true) });
harness.tick(.02);
assert.equal(hits.length, 0);
harness.tick(.04);
assert.equal(hits.length, 1);
const staleFrame = [...frames.values()][0];
const previousVoices = [...audio.nodes];
await audio.play([{ time: .5, radius: .3, strength: .7 }], { onHit: event => hits.push(event), onEnd: () => ended.push(true) });
assert(previousVoices.every(oscillator => !oscillator.connected), 'Restart immediately silences the old take');
harness.context.currentTime = 4;
staleFrame();
assert.equal(hits.length, 1, 'A canceled callback cannot add old hits');
assert.equal(ended.length, 0);
harness.tick(4);
assert.equal(hits.length, 2);
assert.equal(ended.length, 1);
assert.equal(audio.playing, false);
audio.stop();
assert.equal(frames.size, 0);
assert.equal(audio.nodes.size, 0);

const pending = audioHarness({ suspended: true });
const canceledPlay = pending.audio.play([{ time: 0 }]);
await Promise.resolve();
pending.audio.stop();
pending.release();
assert.equal(await canceledPlay, false);
assert.equal(pending.oscillators.length, 0, 'Stop while audio is locked prevents late playback');

const raced = audioHarness({ suspended: true });
const first = raced.audio.play([{ time: 0 }, { time: 1 }]);
const second = raced.audio.play([{ time: 0 }]);
await Promise.resolve();
assert.equal(raced.resumeCalls, 1, 'Concurrent start shares one resume request');
raced.release();
assert.equal(await first, false);
assert.equal(await second, true);
assert.equal(raced.oscillators.length, 4, 'Only the latest take schedules sound after resume');
const racedFrame = [...raced.frames.values()][0];
await raced.audio.dispose();
racedFrame();
assert.equal(raced.audio.nodes.size, 0);
assert.equal(raced.frames.size, 0);
assert.equal(await raced.audio.start(), null, 'A disposed page cannot resurrect audio');

const disposedPending = audioHarness({ suspended: true });
const doomedPlay = disposedPending.audio.play([{ time: 0 }]);
await Promise.resolve();
await disposedPending.audio.dispose();
disposedPending.release();
assert.equal(await doomedPlay, false);
assert.equal(disposedPending.oscillators.length, 0, 'Disposal during resume prevents late sound');

const rejectedPending = audioHarness({ suspended: true });
const rejectedPlay = rejectedPending.audio.play([{ time: 0 }]);
await rejectedPending.audio.dispose();
rejectedPending.reject();
assert.equal(await rejectedPlay, false, 'Closing while resume rejects is still a clean cancellation');

await audio.dispose();
await pending.audio.dispose();
console.log('Lab checks passed: vessel order/reset, recorder limits, controllable sound, replay replacement, and pending-audio cancellation.');
