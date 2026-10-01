import {tilePositions,dimensions} from './workshop-model.js';
const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const shade=(hex,delta)=>'#'+hex.slice(1).match(/../g).map(v=>Math.max(0,Math.min(255,parseInt(v,16)+delta)).toString(16).padStart(2,'0')).join('');
function rng(seed=8291){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}}
export class WorkshopRenderer{
 constructor(entries){this.entries=new Map(entries.map(e=>[e.id,e]));this.images=new Map();this.masks=new Map();this.backgrounds=new Map()}
 async load(project){await Promise.all(project.layers.map(l=>{if(!this.images.has(l.rubbing)){const e=this.entries.get(l.rubbing);this.images.set(l.rubbing,new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{this.images.delete(l.rubbing);reject(new Error('拓影图片未能载入，请重试。'))};i.src=e.image}))}return this.images.get(l.rubbing)}))}
 texture(material,color,w,h){
 const key=[material,color,w,h].join(':');if(this.backgrounds.has(key))return this.backgrounds.get(key);const c=make(w,h),ctx=c.getContext('2d'),random=rng();ctx.fillStyle=color;ctx.fillRect(0,0,w,h);
 const image=ctx.getImageData(0,0,w,h),data=image.data;for(let i=0;i<data.length;i+=4){const n=(random()-.5)*(material==='bronze'?23:material==='cloth'?14:6);data[i]+=n;data[i+1]+=n;data[i+2]+=n}ctx.putImageData(image,0,0);
 if(material==='cloth'){
  for(let y=0;y<h;y+=3){ctx.strokeStyle=y%6?'#00000020':'#ffffff0c';ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(w,y+.5);ctx.stroke()}
  for(let x=0;x<w;x+=3){ctx.strokeStyle=x%6?'#00000016':'#ffffff0c';ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,h);ctx.stroke()}
 }else if(material==='bronze'){
  for(let i=0;i<2100;i++){const x=random()*w,y=random()*h,r=random()*3+1;ctx.fillStyle=i%3?shade(color,-30)+'35':shade(color,42)+'45';ctx.beginPath();ctx.ellipse(x,y,r,r*.6,random()*3,0,Math.PI*2);ctx.fill()}
 }else if(material==='lacquer'){
  for(let i=0;i<90;i++){const y=random()*h;ctx.strokeStyle=i%2?'#00000018':'#ffffff08';ctx.beginPath();ctx.moveTo(-100,y);ctx.bezierCurveTo(w*.3,y-40,w*.6,y+40,w+100,y-10);ctx.stroke()}
 }else if(material==='jade'){
  for(let i=0;i<90;i++){const x=random()*w,y=random()*h;ctx.strokeStyle=i%2?'#dce7bf16':'#182e2320';ctx.lineWidth=random()*8+2;ctx.beginPath();ctx.moveTo(x-180,y-160);ctx.bezierCurveTo(x+90,y-40,x-30,y+40,x+160,y+200);ctx.stroke()}
 }else{
  for(let i=0;i<80;i++){const x=random()*w,y=random()*h;ctx.strokeStyle='#24342c12';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<4;j++)ctx.lineTo(x+(random()-.5)*90,y+j*26);ctx.stroke()}
 }
 const light=ctx.createLinearGradient(0,0,w,h);light.addColorStop(0,'#ffffff12');light.addColorStop(.45,'#ffffff00');light.addColorStop(1,'#00000020');ctx.fillStyle=light;ctx.fillRect(0,0,w,h);this.backgrounds.set(key,c);if(this.backgrounds.size>10)this.backgrounds.delete(this.backgrounds.keys().next().value);return c;
 }
 async mask(layer,craft){
 const key=[layer.rubbing,layer.color,craft,layer.weight||1.5].join(':');if(this.masks.has(key))return this.masks.get(key);const img=await this.images.get(layer.rubbing),c=make(img.width,img.height),ctx=c.getContext('2d');const grow=((layer.weight||1.5)-1)*Math.max(img.width,img.height)/260;if(grow>0)for(let a=0;a<Math.PI*2;a+=Math.PI/4)ctx.drawImage(img,Math.cos(a)*grow,Math.sin(a)*grow);ctx.drawImage(img,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=layer.color;ctx.fillRect(0,0,c.width,c.height);
 if(craft==='embroider'){ctx.globalCompositeOperation='source-atop';ctx.lineWidth=1.25;for(let i=-c.height;i<c.width;i+=6){ctx.strokeStyle=i%12?'#ffffff75':'#00000045';ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+c.height,c.height);ctx.stroke()}}
 ctx.globalCompositeOperation='source-over';this.masks.set(key,c);if(this.masks.size>64)this.masks.delete(this.masks.keys().next().value);return c;
 }
 async draw(canvas,project,{unit=false,guides=false,selected=null}={}){
 await this.load(project);const [w,h]=unit?[600,600]:dimensions(project.format),ctx=canvas.getContext('2d');if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.clearRect(0,0,w,h);ctx.drawImage(this.texture(project.material,project.background,w,h),0,0);
 const size=unit?400:project.size,tiles=unit?[{x:300,y:300,flip:false}]:tilePositions(project,w,h),masks=await Promise.all(project.layers.map(l=>this.mask(l,project.craft)));
 for(const tile of tiles){ctx.save();ctx.translate(tile.x,tile.y);ctx.scale(tile.flip?-1:1,1);for(let i=0;i<project.layers.length;i++){
  const l=project.layers[i],mask=masks[i],ratio=mask.width/mask.height,edge=l.size*size,lw=ratio>1?edge:edge*ratio,lh=ratio>1?edge/ratio:edge;
  ctx.save();ctx.translate(l.x*size,l.y*size);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.flip?-1:1,1);ctx.globalAlpha=l.opacity;
  if(['cast','carve','lacquer-carve'].includes(project.craft)){const direction=project.craft==='carve'?-1:1,depth=project.craft==='lacquer-carve'?2.6:1.6;ctx.shadowColor='#000000bb';ctx.shadowBlur=2;ctx.shadowOffsetX=depth*direction;ctx.shadowOffsetY=depth*direction;ctx.drawImage(mask,-lw/2,-lh/2,lw,lh);ctx.shadowColor='#e9dfb680';ctx.shadowBlur=0;ctx.shadowOffsetX=-direction;ctx.shadowOffsetY=-direction}
  if(project.craft==='underglaze'){ctx.filter='blur(.4px)';ctx.globalAlpha*=.84}ctx.drawImage(mask,-lw/2,-lh/2,lw,lh);ctx.filter='none';ctx.shadowColor='transparent';ctx.globalAlpha=1;
  if(unit&&guides&&l.id===selected){ctx.strokeStyle='#f4df9c';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.strokeRect(-lw/2-8,-lh/2-8,lw+16,lh+16)}ctx.restore();
 }ctx.restore()}
 if(project.craft==='underglaze'){const gloss=ctx.createLinearGradient(0,0,w,h);gloss.addColorStop(0,'#ffffff00');gloss.addColorStop(.35,'#ffffff24');gloss.addColorStop(.6,'#ffffff00');ctx.fillStyle=gloss;ctx.fillRect(0,0,w,h)}
 if(!unit){const margin=Math.max(14,w*.025);ctx.strokeStyle='#ded0a644';ctx.lineWidth=1;ctx.strokeRect(margin,margin,w-margin*2,h-margin*2)}
 }
}
