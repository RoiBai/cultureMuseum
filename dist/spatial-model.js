// Coordinates describe archive categories, not invented dates or geographic distances.
export const ERA_ORDER=['neolithic','shang','zhou','spring','warring','qin','han','jin','northsouth','sui','tang','five','song','yuan','ming','qing','modern'];
export function hsv(hex){
 const rgb=hex.replace('#','').match(/../g).map(n=>parseInt(n,16)/255),hi=Math.max(...rgb),lo=Math.min(...rgb),d=hi-lo;
 let h=d===0?0:hi===rgb[0]?((rgb[1]-rgb[2])/d)%6:hi===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;
 return {h:(h*60+360)%360,s:hi?d/hi:0,v:hi};
}
export function photoHue(a){
 const unit=(a.palette||[]).reduce((sum,c)=>sum+Number(c.share||0),0)>1.01?100:1;
 const swatches=(a.palette||[]).map(c=>({...c,share:Number(c.share)/unit,...hsv(c.hex)})).filter(c=>c.s>=.19&&c.v>=.16&&Number(c.share)>=.025);
 if(!swatches.length)return {h:null,hex:'#92988a',label:'无明显色相'};
 // Pick an observed dominant chromatic swatch; averaging red and green would invent yellow.
 const c=swatches.sort((a,b)=>(b.share*b.s)-(a.share*a.s))[0];
 return {h:c.h,hex:c.hex,label:Math.round(c.h)+'°',share:c.share};
}
export function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
export function random(seed=1){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296}}
export function xyzLayout(artifacts,cityNames){
 const eras=ERA_ORDER.filter(e=>artifacts.some(a=>a.era===e)),occupied=new Map();
 const records=artifacts.map(a=>{
  const hue=photoHue(a),x=-78+156*eras.indexOf(a.era)/Math.max(1,eras.length-1),y=-42+84*cityNames.indexOf(a.city)/Math.max(1,cityNames.length-1),z=hue.h===null?-58:-42+hue.h/360*84;
  const bucket=[a.era,a.city,Math.round(z/8)].join(':'),i=occupied.get(bucket)||0;occupied.set(bucket,i+1);
  const angle=i*2.399963,spread=i?Math.min(13,3.1*Math.sqrt(i)):0;
  return {id:a.id,era:a.era,city:a.city,hue,anchor:[x,y,z],position:[x+Math.cos(angle)*spread,y+Math.sin(angle)*spread,z+(i%5-2)*2.5]};
 });
 return {eras,cities:cityNames,records};
}
export function chooseRandom(items,previous,rng=Math.random){const pool=items.filter(a=>a.id!==previous);return (pool.length?pool:items)[Math.floor(rng()*(pool.length||items.length))]||null}
