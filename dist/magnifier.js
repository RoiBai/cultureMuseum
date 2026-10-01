const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const cache=new Map();
export function loadImage(src){if(!cache.has(src))cache.set(src,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src}));return cache.get(src)}
export class Magnifier{
 constructor(host,{src,rect=[0,0,1,1],label='',compact=false,onChange}={}){
  Object.assign(this,{host,src,rect:[...rect],onChange,zoom:1,points:new Map()});
  host.classList.add('magnifier');host.innerHTML=`<canvas tabindex="0" aria-label="${label.replace(/[&<>"']/g,'')}；拖动移动，滚轮放大，方向键移动，加减号缩放"></canvas><div class="lens-controls"><button data-lens="out" aria-label="缩小细节">−</button><output aria-live="off">1.0×</output><button data-lens="in" aria-label="放大细节">＋</button><button data-lens="reset" aria-label="恢复观察区域">复位</button></div><span class="lens-loading" role="status">载入照片…</span>`;
  this.canvas=host.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.output=host.querySelector('output');
  this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(this.canvas);
  host.addEventListener('click',e=>{const action=e.target.closest('[data-lens]')?.dataset.lens;if(action==='in')this.setZoom(this.zoom*1.3);if(action==='out')this.setZoom(this.zoom/1.3);if(action==='reset')this.reset()});
  this.canvas.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;e.preventDefault();this.setZoom(this.zoom*Math.exp(-e.deltaY*.002))},{passive:false});
  this.canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!this.image)return;this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});this.drag={x:e.clientX,y:e.clientY,cx:this.cx,cy:this.cy};if(this.points.size===2){const p=[...this.points.values()];this.pinch={distance:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),zoom:this.zoom}}});
  this.canvas.addEventListener('pointermove',e=>{if(!this.points.has(e.pointerId))return;this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.points.size===2){const p=[...this.points.values()];this.setZoom(this.pinch.zoom*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/Math.max(1,this.pinch.distance));return}if(this.drag){this.cx=clamp(this.drag.cx-(e.clientX-this.drag.x)/this.scale,0,this.image.width);this.cy=clamp(this.drag.cy-(e.clientY-this.drag.y)/this.scale,0,this.image.height);this.draw();this.changed()}});
  const end=e=>{this.points.delete(e.pointerId);this.drag=null;this.pinch=null;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId)};
  this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);
  this.canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key)||!this.image)return;e.preventDefault();const step=20/this.scale;if(e.key==='ArrowLeft')this.cx-=step;if(e.key==='ArrowRight')this.cx+=step;if(e.key==='ArrowUp')this.cy-=step;if(e.key==='ArrowDown')this.cy+=step;if(['+','='].includes(e.key))this.setZoom(this.zoom*1.3);if(e.key==='-')this.setZoom(this.zoom/1.3);if(e.key==='Home')this.reset();this.cx=clamp(this.cx,0,this.image.width);this.cy=clamp(this.cy,0,this.image.height);this.draw();this.changed()});
  this.ready=loadImage(src).then(image=>{this.image=image;this.reset();host.querySelector('.lens-loading').hidden=true;host.dataset.ready='true';host.dataset.sourcePixels=image.width+' × '+image.height;return this}).catch(()=>{host.querySelector('.lens-loading').textContent='照片加载失败';host.dataset.error='true'});
 }
 reset(){if(!this.image)return;this.zoom=1;this.cx=(this.rect[0]+this.rect[2]/2)*this.image.width;this.cy=(this.rect[1]+this.rect[3]/2)*this.image.height;this.draw();this.changed()}
 setRect(rect){this.rect=[...rect];this.reset()}
 setZoom(value){this.zoom=clamp(value,.5,8);this.draw();this.changed()}
 visibleRect(){if(!this.image||!this.scale)return this.rect;const rw=Math.min(1,this.w/this.scale/this.image.width),rh=Math.min(1,this.h/this.scale/this.image.height);return [clamp(this.cx/this.image.width-rw/2,0,1-rw),clamp(this.cy/this.image.height-rh/2,0,1-rh),rw,rh]}
 changed(){this.host.dataset.zoom=this.zoom.toFixed(2);this.onChange?.(this)}
 draw(){
  if(!this.image)return;const box=this.canvas.getBoundingClientRect();if(!box.width||!box.height)return;
  const ratio=Math.min(devicePixelRatio||1,2);this.w=box.width;this.h=box.height;
  const width=Math.round(this.w*ratio),height=Math.round(this.h*ratio);if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height}
  this.ctx.setTransform(ratio,0,0,ratio,0,0);this.ctx.clearRect(0,0,this.w,this.h);
  const full=this.rect[2]===1&&this.rect[3]===1, fit=full?Math.min:Math.max;
  this.scale=fit(this.w/(this.image.width*this.rect[2]),this.h/(this.image.height*this.rect[3]))*(full?.92:1)*this.zoom;
  this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';
  this.ctx.drawImage(this.image,this.w/2-this.cx*this.scale,this.h/2-this.cy*this.scale,this.image.width*this.scale,this.image.height*this.scale);
  this.output.textContent=this.zoom.toFixed(1)+'×';
 }
 destroy(){this.resizeObserver.disconnect()}
}
