import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CYCLE_DURATION_MS,BREATH_DURATION_MS,photoPhase,crossfadeOpacity,approach,breathScale,motionSnapshot,readMotionSnapshot,cycleDuration,advanceMotion} from '../dist/colour-breathing.js';

assert.equal(CYCLE_DURATION_MS,30000);
assert.equal(photoPhase(0),0);
assert.equal(photoPhase(6000),0);
assert.equal(photoPhase(12000),1);
assert.equal(photoPhase(22500),1);
assert.equal(photoPhase(28500),0);
// Both six-second transitions are continuous, including at the wrap to the next cycle.
let previous=photoPhase(0);
for(let ms=16;ms<=CYCLE_DURATION_MS+16;ms+=16){
 const current=photoPhase(ms);
 assert(current>=0&&current<=1);
 assert(Math.abs(current-previous)<.006,'A frame must not abruptly switch representations');
 const alpha=crossfadeOpacity(current);
 const coverage=alpha.photo+(1-alpha.photo)*alpha.colour;
 assert(coverage>.91,'The crossfade must not disappear into a black/dark gap');
 previous=current;
}
// A late image load / hover change enters gradually, never in a single frame.
assert(approach(0,1,16,950)<.02);
assert(approach(0,1,16,500)<.04);
let sixty=0,thirty=0;
for(let i=0;i<60;i++)sixty=approach(sixty,1,1000/60,950);
for(let i=0;i<30;i++)thirty=approach(thirty,1,1000/30,950);
assert(Math.abs(sixty-thirty)<1e-10,'Motion must not depend on refresh rate');
assert.equal(approach(.35,.35,16,950),.35,'A paused transition remains stationary');
assert.equal(approach(0,1,16,0),1,'Reduced motion does not animate hover');
for(let ms=0;ms<=12000;ms+=16){
 assert(breathScale(ms)>=.97&&breathScale(ms)<=1.03);
 assert.equal(breathScale(ms,.25,true),1);
}
const saved=motionSnapshot(CYCLE_DURATION_MS*8+9140,BREATH_DURATION_MS*12+4081,[{a:{id:'duck'},photoMix:.7389211},{a:{id:'drum'},photoMix:1}]);
assert.equal(saved.cycleTime,9140);assert.equal(saved.breathTime,4081);
assert.equal(saved.mixes.duck,.7389);
const restored=readMotionSnapshot(JSON.parse(JSON.stringify(saved)),['duck','drum']);
assert.equal(restored.mixes.duck,.7389);
assert.equal(restored.mixes.drum,1);
assert.equal(restored.cycleTime,9140);assert.equal(restored.breathTime,4081);
assert.equal(restored.cycleDuration,30000);
const bad=readMotionSnapshot({cycleTime:Infinity,breathTime:-1,mixes:{duck:NaN,drum:2,unknown:.5}},['duck','drum']);
assert.equal(bad.cycleTime,0);assert.equal(bad.breathTime,0);assert.equal(Object.keys(bad.mixes).length,0);
assert.equal(readMotionSnapshot({cycleTime:1e20,breathTime:'4000',mixes:['bad']},['duck']).cycleTime,0);
assert.equal(Object.keys(readMotionSnapshot(undefined,['duck']).mixes).length,0,'Old sessions without motion fields remain valid');
// Speed changes preserve both phases; only future clock increments change.
for(const duration of [12000,30000,60000]){
 const start={cycleTime:9140,breathTime:4081};
 assert.deepEqual(advanceMotion(start.cycleTime,start.breathTime,0,duration),start);
 assert.deepEqual(advanceMotion(start.cycleTime,start.breathTime,16,duration,true),start,'Changing speed must not unpause');
 const reduced=advanceMotion(start.cycleTime,start.breathTime,16,duration,false,true);
 assert.equal(reduced.breathTime,start.breathTime,'Reduced motion never adds size breathing');
 let motion={cycleTime:0,breathTime:0};
 for(let elapsed=0;elapsed<duration;elapsed+=20)motion=advanceMotion(motion.cycleTime,motion.breathTime,20,duration);
 assert(Math.min(motion.cycleTime,CYCLE_DURATION_MS-motion.cycleTime)<1e-7,'The selected duration is one full colour/photo cycle');
}
const beforeSpeedChange=photoPhase(9140,.15);
assert.equal(photoPhase(advanceMotion(9140,4081,0,60000).cycleTime,.15),beforeSpeedChange);
assert.equal(cycleDuration(12000),12000);assert.equal(cycleDuration(60000),60000);
for(const invalid of [NaN,Infinity,-1,0,11000,61000,'45000',null])assert.equal(cycleDuration(invalid),30000);
assert.equal(cycleDuration(Number('47')*1000),47000,'Persisted seconds restore the selected speed');
const fastSnapshot=motionSnapshot(9140,4081,[{a:{id:'duck'},photoMix:.7}],12000);
assert.equal(readMotionSnapshot(JSON.parse(JSON.stringify(fastSnapshot)),['duck']).cycleDuration,12000);
assert.equal(readMotionSnapshot({},['duck'],47000).cycleDuration,47000,'Old sessions use the current persisted speed');
assert.equal(readMotionSnapshot({cycleDuration:1e20},['duck'],47000).cycleDuration,47000,'Invalid saved duration cannot produce flashing');
// Delayed texture restore: keep the circle until ready, then enter the saved paused mix gradually.
let current=0;
const pending=restored.mixes.drum;
current=approach(current,0,16,950);
assert.equal(crossfadeOpacity(current).colour,1);
current=approach(current,pending,16,950);
assert(current>0&&current<.02);
const source=fs.readFileSync(new URL('../dist/colour-cluster.js',import.meta.url),'utf8');
assert(/MeshBasicMaterial\(\{color,transparent:true,opacity:1,depthWrite:false\}\)/.test(source),'A fading colour sphere must not mask its photo in the depth buffer');
assert(/SpriteMaterial\(\{transparent:true,opacity:0,depthWrite:false\}\)/.test(source));
assert(!/RingGeometry|AdditiveBlending/.test(source),'The scene must not add luminous halo rings');
console.log('Colour breathing: adjustable 12–60-second cycle, phase-preserving speed changes, pause/return/persistence compatibility, continuous coverage and transparent depth verified.');
