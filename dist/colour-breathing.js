// Slow colour/photo rhythm. This module is independent of WebGL for motion checks.
export const CYCLE_DURATION_MS=30000;
export const BREATH_DURATION_MS=12000;
export const MIN_CYCLE_DURATION_MS=12000;
export const MAX_CYCLE_DURATION_MS=60000;
export const CYCLE_PREFERENCE_KEY='jingchu-colour-cycle-seconds';
export function cycleDuration(value,fallback=CYCLE_DURATION_MS){
 return Number.isFinite(value)&&value>=MIN_CYCLE_DURATION_MS&&value<=MAX_CYCLE_DURATION_MS?Math.round(value/1000)*1000:fallback;
}
export function advanceMotion(cycleTime,breathTime,elapsed,duration=CYCLE_DURATION_MS,paused=false,reduced=false){
 if(paused)return {cycleTime,breathTime};
 // Clocks stay in the same canonical units. Changing speed never changes the visible phase.
 const delta=Math.max(0,Math.min(64,elapsed))*CYCLE_DURATION_MS/cycleDuration(duration);
 return {cycleTime:(cycleTime+delta)%CYCLE_DURATION_MS,breathTime:reduced?breathTime:(breathTime+delta)%BREATH_DURATION_MS};
}
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10)};
export function photoPhase(elapsed,offset=0){
 const phase=((elapsed/CYCLE_DURATION_MS+offset)%1+1)%1;
 if(phase<.2)return 0;
 if(phase<.4)return ease((phase-.2)/.2);
 if(phase<.75)return 1;
 if(phase<.95)return 1-ease((phase-.75)/.2);
 return 0;
}
export function crossfadeOpacity(mix){
 // Overlapping the fades avoids a dark dip halfway through the transition.
 const angle=clamp(mix)*Math.PI/2;
 return {colour:Math.cos(angle),photo:Math.sin(angle)};
}
export function approach(current,target,elapsed,duration){
 if(!duration)return target;
 return current+(target-current)*(1-Math.exp(-Math.max(0,elapsed)/duration));
}
export function breathScale(elapsed,offset=0,reduced=false){
 return reduced?1:1+.03*Math.sin((elapsed/BREATH_DURATION_MS+offset)*Math.PI*2);
}
export function motionSnapshot(cycleTime,breathTime,items,duration=CYCLE_DURATION_MS){
 // Keep session data small: one bounded cycle and four decimal places per object.
 return {
  cycleTime:cycleTime%CYCLE_DURATION_MS,
  breathTime:breathTime%BREATH_DURATION_MS,
  cycleDuration:cycleDuration(duration),
  mixes:Object.fromEntries(items.map(n=>[n.a.id,Math.round(n.photoMix*10000)/10000]))
 };
}
export function readMotionSnapshot(saved,ids,preferredDuration=CYCLE_DURATION_MS){
 const clock=(value,limit)=>Number.isFinite(value)&&value>=0&&value<limit?value:0;
 const mixes=Object.create(null),stored=saved?.mixes;
 if(stored&&typeof stored==='object'&&!Array.isArray(stored))for(const id of ids){
  if(!Object.hasOwn(stored,id))continue;
  const value=stored[id];
  if(Number.isFinite(value)&&value>=0&&value<=1)mixes[id]=value;
 }
 return {cycleTime:clock(saved?.cycleTime,CYCLE_DURATION_MS),breathTime:clock(saved?.breathTime,BREATH_DURATION_MS),cycleDuration:cycleDuration(saved?.cycleDuration,cycleDuration(preferredDuration)),mixes};
}
