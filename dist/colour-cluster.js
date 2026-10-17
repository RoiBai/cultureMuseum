import {SpatialStage,THREE} from './spatial-stage.js?v=20261011-review';
import {clusterLayout,family,families} from './colour-model.js?v=20261011-review';
import {photoPhase,crossfadeOpacity,approach,breathScale,motionSnapshot,readMotionSnapshot,cycleDuration,advanceMotion,CYCLE_PREFERENCE_KEY,CYCLE_DURATION_MS} from './colour-breathing.js?v=20261018-rhythm';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class ColourCluster extends SpatialStage{
 constructor(host,{artifacts,onDetail}){
  host.innerHTML=`<div class="spatial-canvas"></div><div class="colour-hubs"></div><div class="spatial-heading colour-heading"><span class="spatial-kicker">CHROMATIC CONSTELLATIONS / 三维颜色图谱</span><h2>器物与色彩</h2><p>每一颗主点，都是一件器物。<br>颜色与器物，缓缓交替。</p></div><div class="spatial-tools"><button data-colour="cycle" aria-pressed="false">暂停交替</button><button data-colour="rotate" aria-pressed="false">缓缓旋转</button><button data-colour="home">全景</button><button data-colour="out" aria-label="缩小颜色点云">−</button><button data-colour="in" aria-label="放大颜色点云">＋</button></div><div class="colour-controls"><div class="colour-family-nav" aria-label="聚焦色群">${families.map(f=>`<button data-family="${f.id}" style="--dot:${f.hex}" aria-pressed="false"><i></i>${f.name}</button>`).join('')}</div><div class="colour-rhythm"><label for="colour-cycle-speed">交替节奏 <output for="colour-cycle-speed" data-colour-duration-value>30 秒 / 轮</output></label><input id="colour-cycle-speed" data-colour-duration type="range" min="12" max="60" step="1" value="30" aria-describedby="colour-cycle-hint"><div class="colour-rhythm-ends" id="colour-cycle-hint"><span>12 秒 · 快</span><span>60 秒 · 慢</span></div></div></div><div class="colour-hover" hidden></div><div class="colour-cloud-caption"><span>旋转 · 拖动 · 缩放</span><small>拖动旋转 / 右键或双指平移 / 滚轮缩放 / 点器物进入档案</small></div><div class="spatial-bottom"><p class="spatial-status"></p><details><summary>颜色如何聚合？</summary><p>将器物全部照片色卡按面积占比，计算感知色彩空间 OKLab 的加权中心。红黑兼有的器物会落在两色之间。相邻点稍作三维错开，避免遮挡；位置表示配色相近，不表示历史关系。每个位置在主色圆与器物照片之间柔和交替，一轮默认 30 秒，可用“交替节奏”调整至 12—60 秒；不同位置错开节奏。可以暂停观看，减少动态效果时默认静止。</p><a href="colours.html">逐个查看色号与出处 ↗</a></details></div>`;
  super(host);this.artifacts=artifacts;this.onDetail=onDetail;this.items=clusterLayout(artifacts);this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.cyclePaused=this.reduced;this.cycleTime=0;this.breathTime=0;this.cycleDuration=CYCLE_DURATION_MS;try{this.cycleDuration=cycleDuration(Number(localStorage.getItem(CYCLE_PREFERENCE_KEY))*1000)}catch{};this.lastFrame=null;this.imageQueue=[];this.imageLoads=0;this.pickables=[];this.matches=new Set(artifacts.map(a=>a.id));this.focusedFamily=null;this.hubs=[];
  this.controls.minDistance=28;this.controls.maxDistance=480;this.controls.autoRotateSpeed=.35;
  this.home();this.build();this.bind();this.updateCycleButton();this.updateDurationControl();this.loadImages();host.dataset.ready='true';
 }
 home(){const narrow=this.host.getBoundingClientRect().width<600;this.resetCamera(narrow?[232,140,275]:[125,73,191],narrow?[12,15,30]:[-20,0,25]);this.controls.autoRotate=false;this.host.querySelector('[data-colour=rotate]').setAttribute('aria-pressed','false');this.targetMove=null}
 build(){
  const geometry=new THREE.SphereGeometry(1,14,10);
  for(const n of this.items){const group=new THREE.Group();group.position.fromArray(n.p);this.scene.add(group);n.group=group;const color=n.palette[0].hex;
   n.core=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));n.core.scale.setScalar(1.6);n.core.userData.item=n;group.add(n.core);this.pickables.push(n.core);
   // Neither fading layer writes depth: a half-transparent sphere must never punch a dark hole in its photograph.
   // Photographs are resized before upload: a dense collection does not require full-resolution GPU textures.
   n.photo=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,opacity:0,depthWrite:false}));n.photo.visible=false;n.photo.userData.item=n;group.add(n.photo);this.pickables.push(n.photo);n.phase=(this.items.indexOf(n)*.61803398875)%1;n.photoMix=0;n.pausedMix=0;n.strength=1;n.hoverAmount=0;this.imageQueue.push(n);

  }
  for(const f of families){const entries=this.items.filter(n=>n.palette.some(c=>family(c.hex)===f.id&&c.weight>.08));if(!entries.length){this.host.querySelector(`[data-family=${f.id}]`).disabled=true;continue}const p=new THREE.Vector3();entries.forEach(n=>p.add(n.group.position));p.divideScalar(entries.length);
   const el=document.createElement('span');el.className='colour-hub';el.textContent=f.name+' · '+entries.length;el.style.setProperty('--hub',f.hex);this.host.querySelector('.colour-hubs').append(el);this.hubs.push({f,p,el});
  }
  this.updateOpacity();
 }
 setFilter({matchedIds}){this.matches=matchedIds;this.updateOpacity()}
 updateOpacity(){let count=0;for(const n of this.items){const eligible=this.matches.has(n.a.id),selected=!this.focusedFamily||n.palette.some(c=>family(c.hex)===this.focusedFamily&&c.weight>.08);n.active=eligible&&selected;if(n.active)count++}this.host.querySelector('.spatial-status').textContent=`${count} / ${this.items.length} 件器物亮起 · ${this.items.reduce((s,n)=>s+n.palette.length,0)} 个照片色样`;this.host.querySelectorAll('[data-family]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.family===this.focusedFamily)));if(this.hovered&&!this.hovered.active)this.show(null)}
 hit(e){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);this.ray.setFromCamera(this.pointer,this.camera);return this.ray.intersectObjects(this.pickables).find(h=>h.object.visible&&h.object.material.opacity>.1&&h.object.userData.item.active)?.object.userData.item}
 show(n){if(n===this.hovered)return;this.hovered=n;const tip=this.host.querySelector('.colour-hover');tip.hidden=!n;this.renderer.domElement.style.cursor=n?'pointer':'grab';if(!n)return;tip.innerHTML=`<img src="${esc(n.a.displayImage||n.a.image)}" alt=""><div><span class="spatial-kicker">${esc(n.a.material)} / ${esc(n.a.city)}</span><strong>${esc(n.a.title)}</strong><p>${n.palette.map(c=>`<i style="background:${c.hex}" title="${c.hex}"></i>`).join('')}</p><small>点击器物或色球，打开档案 ↗</small></div>`}
 focusItem(a){const n=this.items.find(x=>x.a.id===a.id);if(!n)return;this.targetMove={target:n.group.position.clone(),camera:n.group.position.clone().add(new THREE.Vector3(45,24,95))};this.show(n)}
 jumpEra(id){const n=this.items.find(x=>x.a.era===id&&x.active);if(n)this.focusItem(n.a)}
 bind(){const canvas=this.renderer.domElement;let down=null;canvas.addEventListener('pointerdown',e=>{down={id:e.pointerId,x:e.clientX,y:e.clientY};this.targetMove=null;this.show(null)});canvas.addEventListener('pointermove',e=>{if(!e.buttons)this.show(this.hit(e))});canvas.addEventListener('pointerup',e=>{if(down&&e.pointerId===down.id&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const n=this.hit(e);if(n)this.onDetail(n.a)}down=null});canvas.addEventListener('pointercancel',()=>down=null);canvas.addEventListener('pointerleave',()=>{if(!this.targetMove)this.show(null)});
  this.host.querySelectorAll('[data-colour]').forEach(b=>b.onclick=()=>{const id=b.dataset.colour;if(id==='cycle'){this.cyclePaused=!this.cyclePaused;if(this.cyclePaused)for(const n of this.items)n.pausedMix=n.photoMix;this.updateCycleButton()}else if(id==='home'){this.home();this.focusedFamily=null;this.updateOpacity();this.show(null)}else if(id==='rotate'){this.controls.autoRotate=!this.controls.autoRotate;b.setAttribute('aria-pressed',String(this.controls.autoRotate))}else{const v=this.camera.position.clone().sub(this.controls.target).multiplyScalar(id==='in'?.8:1.25);v.clampLength(this.controls.minDistance,this.controls.maxDistance);this.camera.position.copy(this.controls.target).add(v)}});
  this.host.querySelector('[data-colour-duration]').addEventListener('input',e=>this.setCycleDuration(Number(e.target.value)*1000));
  this.host.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>{this.focusedFamily=this.focusedFamily===b.dataset.family?null:b.dataset.family;this.updateOpacity();const hub=this.hubs.find(h=>h.f.id===this.focusedFamily);if(hub)this.targetMove={target:hub.p.clone(),camera:hub.p.clone().add(new THREE.Vector3(55,32,140))};else this.home()});
 }
 updateCycleButton(){const b=this.host.querySelector('[data-colour=cycle]');b.textContent=this.cyclePaused?'开始交替':'暂停交替';b.setAttribute('aria-pressed',String(this.cyclePaused))}
 loadImages(){while(this.imageLoads<4&&this.imageQueue.length){const n=this.imageQueue.shift();this.imageLoads++;const img=new Image();const done=()=>{this.imageLoads--;this.loadImages()};img.onload=()=>{const size=160,ratio=img.naturalWidth/img.naturalHeight,c=document.createElement('canvas');c.width=Math.max(1,Math.round(ratio>1?size:size*ratio));c.height=Math.max(1,Math.round(ratio>1?size/ratio:size));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;n.photo.material.map=texture;n.photo.material.needsUpdate=true;n.photo.scale.set(ratio>1?5.8:5.8*ratio,ratio>1?5.8/ratio:5.8,1);n.imageReady=true;done()};img.onerror=done;img.src=n.a.displayImage||n.a.image}}
 updateDurationControl(){const control=this.host.querySelector('[data-colour-duration]'),seconds=this.cycleDuration/1000;control.value=seconds;control.setAttribute('aria-valuetext',`${seconds} 秒一轮，颜色与器物交替`);control.style.setProperty('--rhythm-progress',`${(seconds-12)/48*100}%`);this.host.querySelector('[data-colour-duration-value]').textContent=`${seconds} 秒 / 轮`}
 setCycleDuration(value){this.cycleDuration=cycleDuration(value);this.updateDurationControl();try{localStorage.setItem(CYCLE_PREFERENCE_KEY,String(this.cycleDuration/1000))}catch{}}
 navigationState(){return {...super.navigationState(),family:this.focusedFamily,cyclePaused:this.cyclePaused,...motionSnapshot(this.cycleTime,this.breathTime,this.items,this.cycleDuration)}}
 restore(s){
  super.restore(s);
  if(typeof s?.cyclePaused==='boolean')this.cyclePaused=this.reduced||s.cyclePaused;
  const motion=readMotionSnapshot(s,this.items.map(n=>n.a.id),this.cycleDuration);
  this.setCycleDuration(motion.cycleDuration);
  this.cycleTime=motion.cycleTime;this.breathTime=motion.breathTime;this.lastFrame=null;
  for(const n of this.items)if(Object.hasOwn(motion.mixes,n.a.id)){
   n.pausedMix=motion.mixes[n.a.id];
   // A saved photo never hides the colour before its texture is available.
   n.photoMix=n.imageReady?n.pausedMix:0;
  }
  this.updateCycleButton();if(families.some(f=>f.id===s?.family))this.focusedFamily=s.family;this.updateOpacity();
 }
 frame(t){
  // Clamp elapsed time when returning to this tab so neither the camera nor the images jump.
  const elapsed=this.lastFrame===null?0:Math.max(0,Math.min(64,t-this.lastFrame));this.lastFrame=t;
  const motion=advanceMotion(this.cycleTime,this.breathTime,elapsed,this.cycleDuration,this.cyclePaused,this.reduced);this.cycleTime=motion.cycleTime;this.breathTime=motion.breathTime;
  for(const n of this.items){
   const hovered=n===this.hovered;
   const target=!n.imageReady?0:hovered?1:this.cyclePaused?n.pausedMix:photoPhase(this.cycleTime,n.phase);
   // Texture upload, hover and filter changes all enter through the same smooth transition.
   n.photoMix=approach(n.photoMix,target,elapsed,this.reduced?0:hovered?500:950);
   n.strength=approach(n.strength,n.active?1:.045,elapsed,this.reduced?0:550);
   n.hoverAmount=approach(n.hoverAmount,hovered?1:0,elapsed,this.reduced?0:500);
   const opacity=crossfadeOpacity(n.photoMix);
   n.core.material.opacity=opacity.colour*n.strength;
   n.photo.material.opacity=opacity.photo*n.strength;
   n.core.visible=n.core.material.opacity>.0001;
   n.photo.visible=n.imageReady&&n.photo.material.opacity>.0001;
   // Breathing changes size by only 3%; brightness stays steady, without a ring or halo layer.
   n.core.scale.setScalar(1.6*breathScale(this.breathTime,n.phase,this.reduced)*(1+n.hoverAmount*.08));
  }
  if(this.targetMove){const k=this.reduced?1:.065;this.camera.position.lerp(this.targetMove.camera,k);this.controls.target.lerp(this.targetMove.target,k);if(this.camera.position.distanceTo(this.targetMove.camera)<.1)this.targetMove=null}
  const placed=[];
  for(const h of this.hubs){const q=this.project(h.p);h.el.hidden=!q.visible||h.f.id!==this.focusedFamily;if(h.el.hidden)continue;let y=q.y+26;for(let attempt=0;attempt<12&&placed.some(p=>Math.abs(p.x-q.x)<92&&Math.abs(p.y-y)<26);attempt++)y+=26;placed.push({x:q.x,y});h.el.style.left=q.x+'px';h.el.style.top=Math.min(this.h-92,y)+'px'}
  if(this.hovered){const q=this.project(this.hovered.group.position),tip=this.host.querySelector('.colour-hover');tip.hidden=!q.visible;tip.style.left=Math.max(8,Math.min(this.w-tip.offsetWidth-8,q.x+19))+'px';tip.style.top=Math.max(95,Math.min(this.h-tip.offsetHeight-64,q.y-70))+'px'}
 }

}
