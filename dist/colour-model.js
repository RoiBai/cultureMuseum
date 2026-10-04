// Photo colours are observations, not historic pigment measurements.
export const families=[
 {id:'red',name:'红',hex:'#ba5348'}, {id:'ochre',name:'赭褐',hex:'#947151'},
 {id:'yellow',name:'黄',hex:'#ccae61'}, {id:'green',name:'绿',hex:'#78917b'},
 {id:'blue',name:'蓝',hex:'#6a90a7'}, {id:'purple',name:'紫',hex:'#96728b'},
 {id:'black',name:'黑',hex:'#4d4946'}, {id:'grey',name:'灰',hex:'#96978e'},
 {id:'white',name:'白',hex:'#d9d3c5'}
];
export function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
export function hsv(hex){const [r,g,b]=rgb(hex).map(x=>x/255),v=Math.max(r,g,b),m=Math.min(r,g,b),d=v-m;let h=d===0?0:v===r?((g-b)/d)%6:v===g?(b-r)/d+2:(r-g)/d+4;return {h:(h*60+360)%360,s:v?d/v:0,v}}
export function oklab(hex){
 const [r,g,b]=rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
export function family(hex){const {h,s,v}=hsv(hex),[l,a,b]=oklab(hex),c=Math.hypot(a,b);if(l<.29)return 'black';if(c<.025||s<.10)return l>.77?'white':l<.43?'black':'grey';if(h<18||h>=345)return 'red';if(h<49)return 'ochre';if(h<77)return 'yellow';if(h<177)return 'green';if(h<265)return 'blue';if(h<345)return 'purple';return 'grey'}
export function palette(a){const p=(a.palette||[]).filter(c=>/^#[0-9a-f]{6}$/i.test(c.hex)),sum=p.reduce((s,c)=>s+Math.max(0,Number(c.share)||0),0);return p.map(c=>({...c,weight:sum?Math.max(0,Number(c.share)||0)/sum:1/p.length})).sort((a,b)=>b.weight-a.weight)}
export function colourPosition(hex){const [l,a,b]=oklab(hex);return [a*1000,(l-.55)*150,b*1000]}
export function palettePosition(a){return palette(a).reduce((p,c)=>{const q=colourPosition(c.hex);return p.map((v,i)=>v+q[i]*c.weight)},[0,0,0])}
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
export function clusterLayout(artifacts){
 // Weighted perceptual colour centroid; small deterministic separation reveals overlaps.
 const out=artifacts.filter(a=>palette(a).length).map(a=>{const base=palettePosition(a),h=hash(a.id);return {a,base,p:base.map((x,i)=>x+(((h>>>(i*8))&255)/255-.5)*8),palette:palette(a)}});
 for(let k=0;k<55;k++){for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++){const v=out[i].p.map((x,d)=>x-out[j].p[d]),len=Math.hypot(...v),gap=6.3;if(len>gap)continue;const force=(gap-len)*.22/(len||1);for(let d=0;d<3;d++){const delta=len?v[d]*force:(d===0?.3:0);out[i].p[d]+=delta;out[j].p[d]-=delta}}for(const n of out)n.p=n.p.map((x,d)=>x+(n.base[d]-x)*.006)}
 return out;
}
export function materialLabel(a){return ({漆木:'漆器',水晶:'玉石'})[a.materialGroup]||a.materialGroup}
// Conservative semantic associations. No made-up canonical HEX is assigned to an ancient name.
export function traditionalId(hex){const {h,s,v}=hsv(hex),[l,a,b]=oklab(hex),c=Math.hypot(a,b);
 if(l<.30)return s>.18&&(h<25||h>345)?'xuan':'hei';
 if(c<.023||s<.11)return l>.80?'bai':null;
 if(h<18||h>=345){if(s<.22)return null;return l>.69?'hong':l<.49?'jiang':'zhu'}
 if(h<44&&s>.28)return l<.64?'zhe':'ti';
 if(h>=44&&h<69&&s>.30&&v>.56)return 'huang';
 if(h>=75&&h<170&&s>.22)return 'lv';
 if(h>=180&&h<251&&s>.18&&l>.63)return 'piao';
 if(h>=235&&h<277&&s>.28&&l<.52)return 'gan';
 if(h>=277&&h<345&&s>.24)return 'zi';return null;
}
export function swatchRecords(artifacts){return artifacts.flatMap(a=>palette(a).map((c,i)=>({...c,id:a.id+':'+i,artifact:a,family:family(c.hex),traditional:traditionalId(c.hex)})))}

export function nearestTraditional(hex,colours){const q=oklab(hex);let best=null,distance=Infinity;for(const c of colours){const p=oklab(c.hex),d=Math.hypot(...p.map((v,i)=>v-q[i]));if(d<distance){distance=d;best=c}}return best?{...best,distance}:null}
