import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const code = await readFile('dist/chimes/music-player.js', 'utf8');
const { pitchToMidi, buildScore, createMelodyPlayer } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const piece = JSON.parse(await readFile('dist/chimes/data/ancient-piece.json', 'utf8'));
const pitches = JSON.parse(await readFile('dist/chimes/data/recorded-pitches.json', 'utf8'));
const audio = JSON.parse(await readFile('dist/chimes/data/audio.json', 'utf8'));
const score = buildScore(piece, pitches);
assert.equal(pitchToMidi('Bb4'), pitchToMidi('A#4'));
assert.equal(score.cues.length, piece.notes.filter(note => note.pitch && !['R', 'REST', 'rest'].includes(note.pitch)).length);
assert(score.duration > 20 && score.duration < 90);
for (const cue of score.cues) {
  assert.equal(cue.url, audio.bells[cue.id].url);
  assert.equal(pitches.bells[cue.id].midi, pitchToMidi(cue.pitch));
  assert(Math.abs(pitches.bells[cue.id].centsFromEqualTemperament) < 45, 'Recording pitch too far from score');
}
const tinyScore = buildScore({ title: 'test', bpm: 120, notes: [{pitch:'C4',beats:1},{pitch:'REST',beats:1},{pitch:'C4',beats:1}] },
  { bells: { a: {id:'a',url:'a.m4a',midi:60,centsFromEqualTemperament:0} } });
assert.deepEqual(tinyScore.cues.map(cue => cue.time), [0, 1], 'Rest must preserve musical time');
const sources = [], cues = [], states = [];
let frameId = 0;
const frames = new Map();
const context = {
  currentTime: 0, resume: async () => {},
  createGain: () => ({connect(){},disconnect(){},gain:{cancelScheduledValues(){},setTargetAtTime(){}}}),
  createBufferSource: () => {
    const source = { playbackRate: {value:1}, connect(){},disconnect(){},start(time){this.startTime=time;},stop(time){this.stopTime=time;} };
    sources.push(source); return source;
  }
};
const options = {getContext:()=>context,getOutput:()=>({}),loadBuffer:async()=>({duration:2}),onCue:(cue,count)=>cues.push({cue,count}),onState:state=>states.push(state),onProgress(){},
  requestFrame: fn => { const id = ++frameId; frames.set(id,fn); return id; }, cancelFrame: id => frames.delete(id) };
const player = createMelodyPlayer(options);
await player.start(tinyScore);
assert.equal(sources.length, 2);
assert.deepEqual(sources.map(source => source.startTime), [0.12, 1.12]);
assert(sources.every(source => source.playbackRate.value === 1));
function tick(time) { context.currentTime = time; const callbacks=[...frames.values()];frames.clear(); callbacks.forEach(fn=>fn()); }
tick(0.11); assert.equal(cues.length,0);
tick(0.13); assert.equal(cues.length,1);
tick(0.8); assert.equal(cues.length,1, 'No strike during rest');
const staleCallback = [...frames.values()][0];
player.stop(); assert(!player.busy); assert.equal(frames.size,0);
assert(sources.every(source => Number.isFinite(source.stopTime)), 'Stop cancels all queued sounds');
context.currentTime=2; staleCallback(); assert.equal(cues.length,1,'Canceled visual callbacks cannot strike');
let releaseBuffer;
const pending = createMelodyPlayer({...options,loadBuffer:()=>new Promise(resolve=>{releaseBuffer=resolve;})});
const before=sources.length, promise=pending.start(tinyScore);
await Promise.resolve(); pending.stop(); releaseBuffer({duration:2}); await promise;
assert.equal(sources.length,before,'Stop during decode must prevent late playback');
await player.start(tinyScore); tick(context.currentTime+4);
assert.equal(states.at(-1),'complete'); assert(!player.busy);
console.log(JSON.stringify({ title:piece.title, durationSeconds:score.duration, strikes:score.cues.length, distinctBells:new Set(score.cues.map(cue=>cue.id)).size, originalPitches:true, restsAndCancellationChecked:true }));
