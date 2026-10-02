// Designed timbres, not a recording or acoustic reconstruction of an ancient instrument.
export const drumModes={skin:[1,1.593,2.136,2.296],bronze:[1,1.48,2.09,2.56,3.76,4.71]};
export class DrumAudio{
 constructor(kind='skin'){this.kind=kind;this.nodes=new Set();this.context=null}
 async start(){if(!this.context)this.context=new AudioContext();if(this.context.state==='suspended')await this.context.resume();return this.context}
 strike(type=1,time){const ctx=this.context;if(!ctx||ctx.state!=='running')return;const start=Math.max(ctx.currentTime,time||0),base=this.kind==='bronze'?146:92,duration=this.kind==='bronze'?2.8:1.1,volume=type===1?.20:type===2?.34:.13;
  drumModes[this.kind].forEach((ratio,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(base*ratio*(type===3?1.38:1)*1.06,start);osc.frequency.exponentialRampToValueAtTime(base*ratio*(type===3?1.38:1),start+.07);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume/(i+1),start+.003);gain.gain.exponentialRampToValueAtTime(.0001,start+duration/(1+i*.18));osc.connect(gain).connect(ctx.destination);osc.start(start);osc.stop(start+duration+.05);this.nodes.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();this.nodes.delete(osc)}});
 }
 stop(){for(const n of this.nodes){try{n.stop()}catch{}}this.nodes.clear()}
 dispose(){this.stop();this.context?.close();this.context=null}
}
