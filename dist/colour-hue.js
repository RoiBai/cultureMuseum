import {palette,hsv,oklab} from './colour-model.js?v=20261011-review';
const FIELD_TOP=44;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const hueBands=[
 {id:'red',label:'红',range:'345–15°',colour:'#b96660',hues:[345,0,15]},
 {id:'orange',label:'橙 · 赭',range:'15–45°',colour:'#bd8a59',hues:[15,30,45]},
 {id:'yellow',label:'黄',range:'45–75°',colour:'#c9b36c',hues:[45,60,75]},
 {id:'green',label:'绿',range:'75–165°',colour:'#7e9e79',hues:[75,120,165]},
 {id:'cyan',label:'青',range:'165–210°',colour:'#739b9c',hues:[165,187.5,210]},
 {id:'blue',label:'蓝',range:'210–270°',colour:'#7b8dad',hues:[210,240,270]},
 {id:'purple',label:'紫',range:'270–345°',colour:'#a083a6',hues:[270,307.5,345]},
 {id:'neutral',label:'无彩色',range:'低饱和',colour:'#aaa6a5'}
];
export function hueBand(hex){
 const {h,s}=hsv(hex);
 if(s<.11)return 'neutral';
 return h<15||h>=345?'red':h<45?'orange':h<75?'yellow':h<165?'green':h<210?'cyan':h<270?'blue':'purple';
}
// A band can gain rows (or a second shelf), never borrow space from a different hue.
// Layout uses the complete collection, so filtering cannot move an object's colour position.
export function hueLayout(artifacts,{width=960,height=600}={}){
 const entries=artifacts.filter(a=>palette(a).length).map(a=>{const p=palette(a);return {a,palette:p,dominant:p[0].hex,hsv:hsv(p[0].hex),band:hueBand(p[0].hex)}});
 const groups=hueBands.map(b=>({...b,entries:entries.filter(n=>n.band===b.id)}));
 for(const group of groups){
  group.entries.sort((a,b)=>b.hsv.v-a.hsv.v||b.hsv.s-a.hsv.s||a.hsv.h-b.hsv.h||String(a.a.id).localeCompare(String(b.a.id)));
  group.slots=group.entries.length>80?2:1;
 }
 const slotCount=groups.reduce((sum,g)=>sum+g.slots,0),boardWidth=Math.max(720,width),slotWidth=(boardWidth-24)/slotCount,rowHeight=Math.max(112,Math.min(150,slotWidth+40)),maxRows=Math.max(1,...groups.map(g=>Math.ceil(g.entries.length/g.slots))),boardHeight=Math.max(height,maxRows*rowHeight+80);
 let offset=12;
 for(const [index,group]of groups.entries()){
  group.entries.forEach((n,i)=>Object.assign(n,{column:index,row:Math.floor(i/group.slots),slot:i%group.slots,x:offset+(i%group.slots+.5)*slotWidth,y:FIELD_TOP+14+Math.floor(i/group.slots)*rowHeight,width:boardWidth,height:boardHeight,cellWidth:slotWidth,cellHeight:rowHeight,bandLeft:offset,bandWidth:slotWidth*group.slots,bandCount:group.entries.length,bandSlots:group.slots,neutral:group.id==='neutral'}));
  offset+=slotWidth*group.slots;
 }
 return entries;
}

// The field follows the actual band widths, including the extra shelves in dense hues.
// Hue boundaries stay aligned with the object columns; no displaced colour anchors are used.
export function hueFieldGradient(groups,width){
 const stops=[];
 for(const group of groups){
  const start=(group.left-12)/width*100,end=(group.left-12+group.width)/width*100;
  if(group.id==='neutral'){stops.push(`#979692 ${start}%`,`#979692 ${end}%`);continue}
  for(let i=0;i<3;i++)stops.push(`hsl(${group.hues[i]} 43% 45%) ${start+(end-start)*i/2}%`);
 }
 return `linear-gradient(90deg,${stops.join(',')})`;
}
export class ColourHue{
 constructor(host,{artifacts,onDetail}){
  this.host=host;this.artifacts=artifacts;this.onDetail=onDetail;this.items=hueLayout(artifacts);this.itemMap=new Map(this.items.map(n=>[n.a.id,n]));this.matches=new Set(artifacts.map(a=>a.id));this.zoom=1;this.pan={x:0,y:0};this.selected=null;this.visible=false;
  host.innerHTML=`<header class="hue-heading"><div><span class="spatial-kicker">HUE / 器物主色</span><h2>器物色相分布</h2><p>器物按主色陈列，停留查看下方配色。</p></div><div class="hue-tools"><button data-hue="out" aria-label="缩小器物">−</button><output class="hue-zoom">100%</output><button data-hue="in" aria-label="放大器物">＋</button><button data-hue="home">回到开头</button></div></header><div class="hue-viewport" tabindex="0" aria-label="按主色色相分列的器物图谱，可上下滚动，Tab 键逐件探索"><div class="hue-board"><div class="hue-field" aria-hidden="true"><div class="hue-field-gradient"></div></div><div class="hue-axis"></div><div class="hue-objects">${[...this.items].sort((a,b)=>a.y-b.y||a.x-b.x).map(n=>`<button class="hue-object" data-object="${esc(n.a.id)}" aria-label="${esc(n.a.title)}，主色 ${n.dominant.toUpperCase()}"><span class="hue-object-photo"><img src="${esc(n.a.displayImage||n.a.image)}" alt="" loading="lazy" decoding="async"></span><span class="hue-object-label">${esc(n.a.title)}</span><i class="hue-object-swatch" style="background:${n.dominant}" aria-hidden="true"></i></button>`).join('')}</div></div></div><section class="hue-selection" aria-label="器物配色" aria-live="polite"><div class="hue-selection-caption"><strong>器物的颜色，在这里展开</strong><span>将鼠标停在器物上，或用 Tab 键选中它</span></div><div class="hue-palette-strip is-empty" aria-hidden="true"></div></section><footer class="hue-footer"><span class="hue-status"></span><span>上下滚动 · 点击查看器物</span><details><summary>排列依据</summary><p>使用照片去除背景后占比最高的颜色，按 HSV 色相分列。同列由亮到暗排列；器物较多的色相增加行数，不挤入相邻颜色。饱和度低于 11% 的颜色单列为无彩色。背景色相与各列范围对应；明暗渐变是可见板面的色彩参照，不代表器物的精确明度坐标。色条宽度表示前景取色的相对占比，照片颜色不等同于古代颜料的原始色值。</p></details></footer>`;
  this.viewport=host.querySelector('.hue-viewport');this.board=host.querySelector('.hue-board');this.buttons=new Map([...host.querySelectorAll('[data-object]')].map(b=>[b.dataset.object,b]));
  this.bind();this.resizeObserver=new ResizeObserver(()=>{const r=this.viewport.getBoundingClientRect();if(this.visible&&(r.width!==this.lastLayoutWidth||r.height!==this.lastLayoutHeight))this.reflow()});this.resizeObserver.observe(this.viewport);this.setFilter({matchedIds:this.matches});host.dataset.ready='true';
 }
 setVisible(v){this.visible=v;if(v){this.reflow();if(this.pendingRestore){const saved=this.pendingRestore;this.pendingRestore=null;this.restore(saved)}}else this.show(null)}
 setFilter({matchedIds}){
  this.matches=new Set(matchedIds);
  for(const [id,b]of this.buttons){const active=this.matches.has(id);b.classList.toggle('is-muted',!active);b.tabIndex=active?0:-1;b.setAttribute('aria-disabled',String(!active))}
  this.host.querySelector('.hue-status').textContent=`${this.items.filter(n=>this.matches.has(n.a.id)).length} / ${this.items.length} 件器物`;
  if(this.selected&&!this.matches.has(this.selected.a.id))this.show(null);
 }
 reflow(){
  const r=this.viewport.getBoundingClientRect();if(!r.width||!r.height)return;
  const top=this.viewport.scrollTop,left=this.viewport.scrollLeft,oldHeight=this.boardHeight||0;this.lastLayoutWidth=r.width;this.lastLayoutHeight=r.height;
  const layout=hueLayout(this.artifacts,{width:Math.max(720,r.width-2)*this.zoom,height:r.height});if(!layout.length)return;
  this.boardWidth=layout[0].width;this.boardHeight=layout[0].height;this.board.style.width=this.boardWidth+'px';this.board.style.height=this.boardHeight+'px';
  for(const n of layout){Object.assign(this.itemMap.get(n.a.id),n);const b=this.buttons.get(n.a.id);b.style.left=n.x+'px';b.style.top=n.y+'px';b.style.width=(n.cellWidth-8)+'px';b.style.height=(n.cellHeight-14)+'px'}
  const totalSlots=hueBands.reduce((sum,band)=>sum+(layout.find(n=>n.band===band.id)?.bandSlots||1),0),slotWidth=(this.boardWidth-24)/totalSlots;let start=12;
  const groups=hueBands.map(band=>{const entries=layout.filter(n=>n.band===band.id),width=slotWidth*(entries[0]?.bandSlots||1),group={...band,left:start,width,count:entries.length};start+=width;return group});
  this.host.querySelector('.hue-axis').innerHTML=groups.map(g=>`<div style="left:${g.left}px;width:${g.width}px;--band-colour:${g.colour}"><span>${g.label}<small>${g.count}</small></span><em>${g.range}</em></div>`).join('');
  const field=this.host.querySelector('.hue-field-gradient');field.style.setProperty('--hue-spectrum',hueFieldGradient(groups,this.boardWidth-24));field.style.setProperty('--hue-field-height',Math.max(190,r.height-FIELD_TOP)+'px');
  this.viewport.scrollTop=oldHeight?top*this.boardHeight/oldHeight:top;this.viewport.scrollLeft=left;this.applyTransform();
 }
 // Native scrolling leaves object images at a readable size and avoids wheel-zoom flicker.
 applyTransform(){this.host.querySelector('.hue-zoom').textContent=Math.round(this.zoom*100)+'%';this.pan={x:-this.viewport.scrollLeft,y:-this.viewport.scrollTop}}
 home(){this.zoom=1;this.reflow();this.viewport.scrollTo({left:0,top:0,behavior:'instant'});this.applyTransform();this.show(null)}
 zoomTo(z){this.zoom=Math.max(.85,Math.min(1.6,z));this.reflow()}
 show(n){
  if(n===this.selected)return;this.selected=n;
  this.buttons.forEach((b,id)=>b.classList.toggle('is-selected',id===n?.a.id));
  const caption=this.host.querySelector('.hue-selection-caption'),strip=this.host.querySelector('.hue-palette-strip');
  if(!n){caption.innerHTML='<strong>器物的颜色，在这里展开</strong><span>将鼠标停在器物上，或用 Tab 键选中它</span>';strip.classList.add('is-empty');strip.innerHTML='';strip.setAttribute('aria-hidden','true');return}
  caption.innerHTML=`<strong>${esc(n.a.title)}</strong><span>${esc(n.a.period)} · ${esc(n.a.city)}</span>`;strip.classList.remove('is-empty');strip.removeAttribute('aria-hidden');
  strip.innerHTML=n.palette.map(c=>`<div style="flex-grow:${Math.max(.025,c.weight)};background:${c.hex};color:${oklab(c.hex)[0]>.65?'#191519':'#fff5ef'}" title="${c.hex.toUpperCase()} · ${Math.round(c.weight*100)}%"><code>${c.hex.toUpperCase()}</code><small>${Math.round(c.weight*100)}%</small></div>`).join('');
 }
 focusItem(a){const n=this.itemMap.get(a.id);if(!n)return;if(this.visible&&!this.boardWidth)this.reflow();this.viewport.scrollTo({left:Math.max(0,n.x-this.viewport.clientWidth/2),top:Math.max(0,n.y-this.viewport.clientHeight*.3),behavior:'instant'});this.applyTransform();this.show(n);this.buttons.get(a.id)?.focus({preventScroll:true})}
 jumpEra(id){const n=this.items.find(n=>n.a.era===id&&this.matches.has(n.a.id));if(n)this.focusItem(n.a)}
 navigationState(){return {zoom:this.zoom,scrollLeft:this.viewport.scrollLeft,scrollTop:this.viewport.scrollTop,pan:{x:-this.viewport.scrollLeft,y:-this.viewport.scrollTop}}}
 restore(s){if(!s||!Number.isFinite(s.zoom))return;if(!this.visible){this.pendingRestore=s;return}this.zoom=Math.max(.85,Math.min(1.6,s.zoom));this.reflow();this.viewport.scrollTo({left:Math.max(0,Number.isFinite(s.scrollLeft)?s.scrollLeft:-(s.pan?.x||0)),top:Math.max(0,Number.isFinite(s.scrollTop)?s.scrollTop:-(s.pan?.y||0)),behavior:'instant'});this.applyTransform()}
 bind(){
  this.buttons.forEach((b,id)=>{const n=this.itemMap.get(id);b.addEventListener('pointerenter',()=>{if(this.matches.has(id))this.show(n)});b.addEventListener('focus',()=>{if(this.matches.has(id)){const br=b.getBoundingClientRect(),vr=this.viewport.getBoundingClientRect();if(br.left<vr.left||br.right>vr.right||br.top<vr.top+FIELD_TOP||br.bottom>vr.bottom)this.focusItem(n.a);else this.show(n)}});b.addEventListener('click',()=>{if(this.matches.has(id))this.onDetail(n.a)})});
  // Keep the last inspected palette in its reserved strip; pointer movement never flashes the page.
  this.viewport.addEventListener('scroll',()=>this.applyTransform(),{passive:true});
  this.viewport.addEventListener('keydown',e=>{if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoomTo(this.zoom*(e.key==='-'?.9:1.1))}});
  let drag=null;this.viewport.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:this.viewport.scrollLeft,top:this.viewport.scrollTop};this.viewport.setPointerCapture(e.pointerId);this.viewport.classList.add('is-dragging')});this.viewport.addEventListener('pointermove',e=>{if(!drag)return;this.viewport.scrollLeft=drag.left+drag.x-e.clientX;this.viewport.scrollTop=drag.top+drag.y-e.clientY});const stop=()=>{drag=null;this.viewport.classList.remove('is-dragging')};this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);
  this.host.querySelectorAll('[data-hue]').forEach(b=>b.onclick=()=>b.dataset.hue==='home'?this.home():this.zoomTo(this.zoom*(b.dataset.hue==='in'?1.1:.9)));
 }
}
