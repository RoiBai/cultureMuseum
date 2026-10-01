import * as THREE from './vendor/three.module.js';
import {arrangeArchive, arrangeLift, CARD, LIFT} from './atlas3d-layout.js';
import {filterSample, materialSpec} from './visual-language.js';
import {VIEW, positionCamera, DepthOfField} from './atlas3d-camera.js';

const PAPER = '#f3efe4', INK = '#696151', RED = '#9c3c30';
const clamp = THREE.MathUtils.clamp;
const ease = t => t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dimensionNames = {colors:'色彩', motifs:'纹样', crafts:'工艺', materialGroup:'材质', city:'出土地'};

export class Atlas3D {
  constructor(host, {artifacts, eraDefs, cities, paletteColors, onDetail, onEra}) {
    Object.assign(this, {host, artifacts, eraDefs, cities, paletteColors, onDetail, onEra});
    this.archive = arrangeArchive(artifacts, eraDefs);
    this.cards = new Map(); this.labels = []; this.active = false; this.filtered = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(PAPER);
    this.camera = new THREE.PerspectiveCamera(VIEW.fov,1,.1,700);
    this.orbit={yaw:VIEW.yaw,pitch:VIEW.pitch};this.orbitTarget={...this.orbit};this.viewingLift=false;
    this.scene.fog=new THREE.Fog(PAPER,35,115);
    this.parallax=new THREE.Vector3();this.parallaxTarget=new THREE.Vector3();
    this.focus = new THREE.Vector3(8,1.1,0); this.focusTarget = this.focus.clone();
    this.viewHeight = 18; this.zoomTarget = 18;
    this.renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.dof=new DepthOfField(this.renderer);
    this.renderer.domElement.setAttribute('aria-label','三维器物展卷：左右漫游；切换转动视角后拖动观察前后层次；悬停对焦，点击查看档案');
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.className = 'three-canvas';
    this.stage = host.querySelector('.three-stage'); this.stage.prepend(this.renderer.domElement);
    this.overlay = host.querySelector('.three-labels');
    this.leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');this.leaders.classList.add('three-caption-leaders');this.leaders.setAttribute('aria-hidden','true');this.overlay.append(this.leaders);
    this.tip = host.querySelector('.three-object-tip');
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.paperGeometry = new THREE.PlaneGeometry(CARD.width,CARD.height);
    this.restQuaternion = new THREE.Quaternion();
    this.archiveGuides = new THREE.Group(); this.liftGuides = new THREE.Group();
    this.scene.add(this.archiveGuides, this.liftGuides);
    this.baseLines = []; this.upperLabels = [];
    this.createArchive(); this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.stage);
    this.host.dataset.projection='perspective';this.host.dataset.depthOfField='enabled';
    this.host.dataset.renderer = 'threejs';this.host.dataset.captionMode='upright'; this.host.dataset.cards = artifacts.length;
    this.host.dataset.textureStatus = 'loading';
    this.loadCards();
  }

  line(points, color=INK, opacity=.35, group=this.archiveGuides) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
    const material = new THREE.LineBasicMaterial({color,transparent:true,opacity});
    const line = new THREE.Line(geometry,material); group.add(line); return line;
  }


  label(html, point, className, upper=false) {
    const el=document.createElement('div'); el.className='three-label '+className; el.innerHTML=html;
    this.overlay.append(el);
    const record={el,point:new THREE.Vector3(...point),upper}; this.labels.push(record);
    if(upper)this.upperLabels.push(record); return record;
  }

  createArchive() {
    for(const era of this.archive.eras) {
      const z=-era.depth/2;
      this.line([[era.start+.2,-2,z],[era.start+.2,6.8,z]],'#a69a7e',.24);
      this.line([[era.start-.2,-2,z],[era.start+.6,-2,z]],'#a69a7e',.3);
      this.label(`<span class="three-era-number">${era.number} / ${era.count} 件</span><button data-three-era="${era.id}">${era.title}<span>↗</span></button>`,[era.start+.2,6.6,z],'three-era-label');
    }
    const skeletonTexture=this.cardTexture(null,null);
    for(const a of this.artifacts) {
      const base=new THREE.Mesh(this.paperGeometry,new THREE.MeshBasicMaterial({map:skeletonTexture,side:THREE.DoubleSide,transparent:true,alphaTest:.03,depthWrite:true}));
      const p=this.archive.positions.get(a.id); base.position.set(p.x,p.y,p.z); base.quaternion.copy(this.restQuaternion);
      base.userData={artifact:a,layer:'base'};
      const lift=new THREE.Mesh(this.paperGeometry,base.material.clone()); lift.position.copy(base.position); lift.quaternion.copy(this.restQuaternion);
      lift.userData={artifact:a,layer:'lift'}; lift.visible=false;
      this.scene.add(base,lift);
      const accessible=document.createElement('button');accessible.className='three-object-label';
      accessible.dataset.object=a.id;
      accessible.innerHTML=`<span class="three-object-name">${esc(a.title)}</span><span class="three-object-place">${esc(a.city)}</span>`;
      accessible.style.setProperty('--object-tone',this.cities.find(c=>c.name===a.city)?.color||'#a49373');
      accessible.setAttribute('aria-label',`${a.title}，${a.period}，查看档案`);
      const currentMesh=()=>this.viewingLift&&lift.visible?lift:base;
      accessible.addEventListener('focus',()=>this.setHover(currentMesh()));
      accessible.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')this.setHover(currentMesh())});
      accessible.addEventListener('pointerleave',()=>this.setHover(null));
      accessible.addEventListener('blur',()=>this.setHover(null));accessible.addEventListener('click',()=>this.onDetail(a));
      this.overlay.append(accessible);
      const leader=document.createElementNS('http://www.w3.org/2000/svg','path');this.leaders.append(leader);
      // Fixed orientations in world space; only the hovered object turns to face
      // the viewer. Camera movement must reveal real parallax and occlusion.
      const localTilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-.46+(p.row===0?-.1:.1),0));
      this.cards.set(a.id,{a,base,lift,accessible,leader,localTilt,origin:base.position.clone(),hoverMix:0,opacity:1});
    }
  }

  cardTexture(a, image) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const ctx=canvas.getContext('2d');
    if(image){
      const scale=Math.min(488/image.width,488/image.height);
      ctx.drawImage(image,(512-image.width*scale)/2,(512-image.height*scale)/2,image.width*scale,image.height*scale);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;return texture;
  }

  async loadCards() {
    const queue=[...this.cards.values()];let loaded=0,failed=0;
    const load=async()=>{while(queue.length){const card=queue.shift();try{
      const image=new Image();image.src=card.a.displayImage||card.a.image;await image.decode();
      // Local cutouts already contain alpha. Trim their transparent margin for
      // equal display boxes without changing the source photographs or palette.
      const canvas=document.createElement('canvas');const scale=Math.min(1,600/Math.max(image.width,image.height));
      canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let minX=canvas.width,minY=canvas.height,maxX=0,maxY=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>24){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
      let trimmed=canvas;
      if(maxX>=minX&&maxY>=minY){trimmed=document.createElement('canvas');trimmed.width=maxX-minX+1;trimmed.height=maxY-minY+1;trimmed.getContext('2d').drawImage(canvas,minX,minY,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height)}
      card.imageWidth=CARD.width*Math.min(488,488*trimmed.width/trimmed.height)/512;
      card.imageHeight=CARD.height*Math.min(488,488*trimmed.height/trimmed.width)/512;
      const texture=this.cardTexture(card.a,trimmed);card.base.material.map=texture;card.lift.material.map=texture;
      card.base.material.needsUpdate=true;card.lift.material.needsUpdate=true;loaded++;
    }catch(error){failed++;card.accessible.dataset.imageError='true';console.warn('3D image unavailable',card.a.id,error)}
    this.host.dataset.loaded=loaded;this.host.dataset.failed=failed;
    }};
    await Promise.all(Array.from({length:6},load));this.host.dataset.textureStatus=failed?'partial':'ready';
  }

  navigationState(){return {focus:this.focusTarget.toArray(),zoom:this.zoomTarget,orbit:{...this.orbitTarget},viewingLift:this.viewingLift,savedArchiveX:this.savedArchiveX}}
  restoreNavigation(state){
    if(!state||!Array.isArray(state.focus)||state.focus.length!==3||!state.focus.every(Number.isFinite))return;
    this.viewingLift=Boolean(state.viewingLift&&this.filtered&&this.liftLayout.positions.size);
    this.focusTarget.fromArray(state.focus);this.focus.copy(this.focusTarget);
    if(Number.isFinite(state.savedArchiveX))this.savedArchiveX=state.savedArchiveX;
    this.zoomTarget=clamp(Number(state.zoom)||this.defaultHeight(),10,40);this.viewHeight=this.zoomTarget;
    if(state.orbit){this.orbitTarget={yaw:clamp(Number(state.orbit.yaw)||VIEW.yaw,VIEW.minYaw,VIEW.maxYaw),pitch:clamp(Number(state.orbit.pitch)||VIEW.pitch,VIEW.minPitch,VIEW.maxPitch)};this.orbit={...this.orbitTarget}}
    if(this.transition){this.transition.duration=1;this.transition.cameraFrom.copy(this.focus)}
    this.updateLayerControls();this.setHover(null);
  }

  setVisible(active) {
    this.active=active;this.setHover(null);
    if(active){this.resize();this.lastFrame=performance.now();if(!this.frameId)this.frameId=requestAnimationFrame(t=>this.frame(t))}
    else {cancelAnimationFrame(this.frameId);this.frameId=0}
  }

  setFilter({selected,matchedIds,dimension}) {
    const filtered=Object.values(selected).some(s=>s.size);
    const signature=JSON.stringify([dimension,...Object.entries(selected).map(([k,v])=>[k,[...v]])]);
    if(this.signature===signature)return;this.signature=signature;this.filtered=filtered;this.dimension=dimension;
    this.setHover(null);
    this.liftLayout=arrangeLift(this.artifacts,this.eraDefs,matchedIds,selected,dimension);
    this.clearUpper();
    if(filtered)for(const shelf of this.liftLayout.shelves){
      const color=dimension==='colors'?this.paletteColors[shelf.value]:dimension==='materialGroup'?materialSpec(shelf.value).color:dimension==='city'?this.cities.find(c=>c.name===shelf.value)?.color:RED;
      this.line([[shelf.start,LIFT-2,-8.5],[shelf.start,LIFT+6.5,-8.5]],color||RED,.35,this.liftGuides);
      this.label(`${filterSample(dimension,shelf.value,this.paletteColors)}<span>${esc(shelf.value)}</span><small>${shelf.count} 件 · 由古至今 ↗</small>`,[shelf.start,LIFT+6.6,-8.5],'three-feature-label',true);
      for(const era of this.liftLayout.eras.filter(e=>e.value===shelf.value)){
        this.line([[era.start,LIFT+.8,3.4],[era.start,LIFT+2.2,3.4]],color||RED,.4,this.liftGuides);
        this.label(`<button data-three-era="${era.id}">${era.title}</button>`,[era.start+.25,LIFT+.9,3.4],'three-lift-era',true);
      }
    }
    this.liftGuides.traverse(o=>{if(o.material){o.userData.opacity=o.material.opacity;o.material.opacity=0}});
    this.transition={start:performance.now(),duration:this.reduced.matches?1:1450,cameraFrom:this.focus.clone()};
    let index=0;
    for(const [id,c] of this.cards){
      const destination=filtered?this.liftLayout.positions.get(id):null;
      const wasVisible=c.lift.visible;
      if(destination&&!wasVisible){c.lift.position.copy(c.base.position);c.lift.material.opacity=.95;c.lift.visible=true}
      c.motion={from:c.lift.position.clone(),to:destination?new THREE.Vector3(destination.x,destination.y,destination.z):c.base.position.clone(),
        entering:!!destination,fromOpacity:c.lift.material.opacity,delay:destination?Math.min(index++*9,210):0};
      c.destination=destination;
    }
    this.viewingLift=filtered&&matchedIds.size>0;
    this.focusTarget.set(this.focusTarget.x,this.viewingLift?LIFT+1.1:1.1,0);
    const length=filtered&&matchedIds.size?this.liftLayout.length:this.archive.length;
    this.focusTarget.x=filtered?(this.readingGroups(this.liftLayout)[0]?.x??this.homeX()):this.savedArchiveX??this.homeX();
    this.alignMobileCamera();
    this.host.dataset.layer=filtered&&matchedIds.size?'lift':'archive';this.host.dataset.matches=matchedIds.size;
    this.host.dataset.groupBy=dimension;this.host.dataset.motion=this.reduced.matches?'reduced':'lifting';
    this.host.querySelector('.three-layer-title').textContent=filtered?`${dimensionNames[dimension]}浮层`:'器物全谱';
    this.host.querySelector('.three-layer-meta').textContent=filtered?`${matchedIds.size} 件提取 · 下层保留 ${this.artifacts.length} 件`:`${this.archive.eras.length} 个时代 · ${this.artifacts.length} 件器物`;
    this.host.querySelector('.three-empty').hidden=!(filtered&&!matchedIds.size);
    this.host.querySelector('[data-three="ground"]').hidden=!filtered||!matchedIds.size;
    this.host.querySelector('[data-three="ground"]').textContent='俯看全谱 ↓';
    this.host.querySelector('.three-range').max=Math.max(1,length);
  }

  clearUpper() {
    this.liftGuides.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});this.liftGuides.clear();
    for(const label of this.upperLabels)label.el.remove();this.labels=this.labels.filter(l=>!l.upper);this.upperLabels=[];
  }

  jumpEra(id) {
    let layout=this.viewingLift?this.liftLayout:this.archive;
    if(!layout.eras.some(e=>e.id===id)){layout=this.archive;this.viewingLift=false}
    const group=this.readingGroups(layout).find(g=>g.id===id);
    if(group)this.focusGroup(group);
    this.setHover(null);this.updateLayerControls();
  }

  defaultHeight(){return this.w<650?15:this.h<560?18:20}
  homeX(){return this.readingGroups(this.archive)[0]?.x??5.7}

  readingGroups(layout=this.viewingLift?this.liftLayout:this.archive){
    if(this.w>=650||!this.w)return layout.groups;
    if(this.mobileStops?.source===layout)return this.mobileStops.groups;
    const totals=new Map(),counts=new Map();
    const items=[...layout.positions.entries()].map(([id,p])=>({key:`${p.value||''}:${p.era}`,artifact:id,id:p.era,
      title:this.eraDefs.find(e=>e[0]===p.era)?.[1]||p.era,x:p.x,focusY:p.y-.6,focusZ:p.z,value:p.value}));
    for(const item of items)totals.set(item.key,(totals.get(item.key)||0)+1);
    for(const item of items){item.index=counts.get(item.key)||0;item.total=totals.get(item.key);counts.set(item.key,item.index+1)}
    this.mobileStops={source:layout,groups:items};return items;
  }

  nearestGroup(groups=this.readingGroups()){
    return groups.reduce((best,g,i)=>{
      const distance=g=>Math.abs(g.x-this.focusTarget.x)+Math.abs((g.focusZ||0)-this.focusTarget.z)*.25;
      return distance(g)<distance(groups[best])?i:best;
    },0);
  }

  focusGroup(group){
    this.focusTarget.set(group.x,group.focusY??(this.viewingLift?LIFT+1.1:1.1),group.focusZ||0);
    if(!this.viewingLift)this.savedArchiveX=group.x;
  }

  stepGroup(direction){
    const groups=this.readingGroups();if(!groups.length)return;
    this.focusGroup(groups[clamp(this.nearestGroup(groups)+direction,0,groups.length-1)]);this.setHover(null);
  }

  alignMobileCamera(){
    if(this.w>=650)return;
    const groups=this.readingGroups();if(groups.length){const group=groups[this.nearestGroup(groups)];this.focusTarget.y=group.focusY;this.focusTarget.z=group.focusZ}
  }

  pan(amount) {
    const layout=this.viewingLift?this.liftLayout:this.archive;
    this.focusTarget.x=clamp(this.focusTarget.x+amount,0,layout.length);
    this.alignMobileCamera();if(!this.viewingLift)this.savedArchiveX=this.focusTarget.x;
  }

  updateLayerControls(){
    this.host.querySelector('[data-three="ground"]').textContent=this.viewingLift?'俯看全谱 ↓':'返回浮层 ↑';
    this.host.querySelector('.three-range').max=(this.viewingLift?this.liftLayout:this.archive).length;
    this.host.dataset.layer=this.viewingLift?'lift':'archive';
  }

  bindControls() {
    const canvas=this.renderer.domElement;
    this.host.addEventListener('click',e=>{
      const era=e.target.closest('[data-three-era]');if(era){this.jumpEra(era.dataset.threeEra);return}
      const action=e.target.closest('[data-three]')?.dataset.three;
      if(action==='previous')this.stepGroup(-1);
      if(action==='next')this.stepGroup(1);
      if(action==='closer')this.zoomTarget=clamp(this.zoomTarget*.8,10,40);
      if(action==='farther')this.zoomTarget=clamp(this.zoomTarget*1.25,10,40);
      if(action==='home'){this.focusGroup(this.readingGroups()[0]);this.zoomTarget=this.defaultHeight();this.orbitTarget={yaw:VIEW.yaw,pitch:VIEW.pitch}}
      if(action==='orbit'){this.orbitMode=!this.orbitMode;this.host.querySelector('[data-three=orbit]').setAttribute('aria-pressed',String(this.orbitMode));this.host.dataset.dragMode=this.orbitMode?'orbit':'travel';this.setHover(null)}
      if(action==='ground'){
        this.viewingLift=!this.viewingLift;this.focusTarget.y=this.viewingLift?LIFT+1.1:1.1;this.focusTarget.z=0;
        this.updateLayerControls();this.alignMobileCamera();this.setHover(null);
      }
    });
    this.host.querySelector('.three-range').addEventListener('input',e=>{this.focusTarget.x=+e.target.value;this.alignMobileCamera();this.setHover(null);if(!this.filtered)this.savedArchiveX=this.focusTarget.x});
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,startX:this.focusTarget.x,yaw:this.orbitTarget.yaw,pitch:this.orbitTarget.pitch,orbit:this.orbitMode||e.shiftKey,moved:false,id:e.pointerId};canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{
      if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>5)this.drag.moved=true;
        if(this.drag.moved){if(this.drag.orbit){this.orbitTarget.yaw=clamp(this.drag.yaw-dx*.004,VIEW.minYaw,VIEW.maxYaw);this.orbitTarget.pitch=clamp(this.drag.pitch+dy*.003,VIEW.minPitch,VIEW.maxPitch)}
          else{this.focusTarget.x=this.drag.startX;this.pan(-dx*this.viewHeight/Math.max(1,this.stage.clientHeight)/.9)}this.setHover(null);canvas.classList.add('dragging');return}}
      if(e.pointerType!=='touch'){this.setHover(this.pick(e));if(!this.reduced.matches)this.parallaxTarget.set(this.pointer.x*1.25,this.pointer.y*.5,0)}
    });
    canvas.addEventListener('pointerup',e=>{const drag=this.drag;if(!drag)return;
      if(!drag.moved){const card=this.pick(e);if(card){this.setHover(card);this.onDetail(card.userData.artifact)}}
      this.drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointercancel',()=>{this.drag=null;canvas.classList.remove('dragging');this.setHover(null)});
    canvas.addEventListener('pointerleave',()=>{if(!this.drag)this.setHover(null);this.parallaxTarget.set(0,0,0)});
    this.stage.addEventListener('wheel',e=>{e.preventDefault();this.setHover(null);
      if(e.ctrlKey||e.metaKey)this.zoomTarget=clamp(this.zoomTarget*Math.exp(e.deltaY*.008),10,40);
      else this.pan((Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*.025);
    },{passive:false});
    canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','+','-'].includes(e.key))e.preventDefault();
      if(e.key==='ArrowLeft')this.stepGroup(-1);if(e.key==='ArrowRight')this.stepGroup(1);if(e.key==='Home')this.jumpEra('neolithic');
      if(e.key==='+')this.zoomTarget=clamp(this.zoomTarget*.8,10,40);if(e.key==='-')this.zoomTarget=clamp(this.zoomTarget*1.25,10,40);
    });
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.setVisible(false);this.host.querySelector('.three-error').hidden=false});
  }

  pick(event) {
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const meshes=[...this.cards.values()].flatMap(c=>this.viewingLift?(c.destination&&c.lift.visible?[c.lift]:[]):[c.base]);
    return this.raycaster.intersectObjects(meshes,false)[0]?.object||null;
  }

  setHover(mesh) {
    if(this.hover===mesh)return;this.hover=mesh;this.host.dataset.hovered=mesh?.userData.artifact.id||'';
    this.renderer.domElement.style.cursor=mesh?'pointer':'';
    if(mesh){const a=mesh.userData.artifact;this.tip.innerHTML=`<span>${esc(a.period)} / ${esc(a.city)}</span><strong>${esc(a.title)}</strong><small>点击查看器物档案 ↗</small>`;this.tip.hidden=false}
    else this.tip.hidden=true;
  }

  resize() {
    if(!this.active)return;
    const previousWidth=this.w;
    this.w=this.stage.clientWidth;this.h=this.stage.clientHeight;if(!this.w||!this.h)return;
    if(previousWidth&&(previousWidth<650)!==(this.w<650)){this.focusTarget.set(this.focusTarget.x,this.viewingLift?LIFT+1.1:1.1,0);this.zoomTarget=this.defaultHeight();this.alignMobileCamera()}
    this.leaders.setAttribute('viewBox',`0 0 ${this.w} ${this.h}`);
    this.renderer.setSize(this.w,this.h,false);
    this.dof.resize(Math.round(this.w*this.renderer.getPixelRatio()),Math.round(this.h*this.renderer.getPixelRatio()));
    if(!this.signature){this.focus.x=this.homeX();this.focusTarget.x=this.homeX();this.viewHeight=this.defaultHeight();this.zoomTarget=this.viewHeight}
    this.updateCamera();
  }

  updateCamera() {
    this.camera.aspect=(this.w||1)/(this.h||1);
    this.cameraDistance=positionCamera(this.camera,this.focus.clone().add(new THREE.Vector3(this.w<650?0:3.5,this.w<650?0:-1.8,0)),this.viewHeight,this.orbit.yaw,this.orbit.pitch,this.parallax);
    this.scene.fog.near=this.cameraDistance+10;this.scene.fog.far=this.cameraDistance+90;
    this.host.dataset.viewAngle=`${Math.round(this.orbit.yaw*180/Math.PI)} / ${Math.round(this.orbit.pitch*180/Math.PI)}`;
  }

  projectedBounds(mesh,height=CARD.height,width=CARD.width){
    mesh.updateMatrixWorld();
    const points=[[-width/2,-height/2],[width/2,-height/2],[-width/2,height/2],[width/2,height/2]]
      .map(([x,y])=>new THREE.Vector3(x,y,0).applyMatrix4(mesh.matrixWorld).project(this.camera))
      .map(p=>({x:(p.x*.5+.5)*this.w,y:(-p.y*.5+.5)*this.h}));
    return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y)),top:Math.min(...points.map(p=>p.y))};
  }

  frame(now) {
    this.frameId=0;if(!this.active)return;
    const dt=Math.min(.06,(now-this.lastFrame)/1000||.016);this.lastFrame=now;
    const damping=this.reduced.matches?1:1-Math.exp(-dt*6);
    if(this.transition){const t=clamp((now-this.transition.start)/this.transition.duration,0,1);this.focus.lerpVectors(this.transition.cameraFrom,this.focusTarget,ease(t))}
    else this.focus.lerp(this.focusTarget,damping);
    this.orbit.yaw+=(this.orbitTarget.yaw-this.orbit.yaw)*damping;this.orbit.pitch+=(this.orbitTarget.pitch-this.orbit.pitch)*damping;
    this.viewHeight+=(this.zoomTarget-this.viewHeight)*damping;this.parallax.lerp(this.parallaxTarget,damping*.6);this.updateCamera();
    let progress=1;
    if(this.transition){progress=clamp((now-this.transition.start)/this.transition.duration,0,1);
      this.liftGuides.traverse(o=>{if(o.material)o.material.opacity=(o.userData.opacity||0)*ease(progress)});
      for(const c of this.cards.values()){
        const m=c.motion;if(!m||!c.lift.visible)continue;
        const p=this.reduced.matches?1:clamp((now-this.transition.start-m.delay)/Math.max(1,this.transition.duration-m.delay),0,1);
        c.lift.position.lerpVectors(m.from,m.to,ease(p));
        c.lift.position.y+=Math.sin(p*Math.PI)*.7;
        c.lift.material.opacity=m.entering?.96:m.fromOpacity*(1-ease(p));
        if(p===1&&!m.entering)c.lift.visible=false;
      }
      if(progress===1){this.transition=null;this.host.dataset.motion='settled'}
    }
    const dimmed=this.viewingLift;
    const group=this.readingGroups()[this.nearestGroup()];
    const captionCandidates=[],imageBounds=[];
    const groupIds=new Set(group?.ids||[group?.artifact]);
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(this.camera.quaternion);
    for(const c of this.cards.values()){
      c.hoverMix+=((this.hover?.userData.artifact.id===c.a.id?1:0)-c.hoverMix)*damping;
      const focusAlpha=this.hover?(this.hover.userData.artifact.id===c.a.id?1:.75):1;
      const alpha=dimmed ? .16 : focusAlpha;c.base.material.opacity+=(alpha-c.base.material.opacity)*damping;
      if(!this.transition&&c.destination)c.lift.material.opacity+=(focusAlpha-c.lift.material.opacity)*damping;
      c.base.position.copy(c.origin);
      if(!this.transition&&c.destination)c.lift.position.set(c.destination.x,c.destination.y,c.destination.z);
      for(const mesh of [c.base,c.lift])if(mesh.visible){
        const target=this.hover===mesh?this.camera.quaternion:c.localTilt;
        mesh.quaternion.slerp(target,this.reduced.matches?1:1-Math.exp(-dt*10));
        mesh.position.addScaledVector(forward,c.hoverMix*.4);
        mesh.scale.setScalar(1+c.hoverMix*.08);
      }
      const mesh=dimmed&&c.destination?c.lift:c.base;
      const p=mesh.position.clone().project(this.camera);
      const cx=(p.x*.5+.5)*this.w,cy=(-p.y*.5+.5)*this.h;
      const bounds=this.projectedBounds(mesh,c.imageHeight||CARD.height,c.imageWidth||CARD.width);
      const captionY=bounds.bottom+10;
      if(p.z>-1&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1&&(!dimmed||!!c.destination))imageBounds.push({x:bounds.left+4,y:bounds.top+4,w:bounds.right-bounds.left-8,h:bounds.bottom-bounds.top-8});
      const visible=p.z>-1&&p.z<1&&cx>65&&cx<this.w-65&&captionY>75&&captionY<this.h-65&&bounds.bottom-bounds.top>42&&(!dimmed||!!c.destination);
      c.accessible.classList.toggle('is-current',this.hover?.userData.artifact.id===c.a.id);
      c.accessible.style.opacity=focusAlpha;
      if(visible||this.hover===mesh){
        const labelWidth=clamp(Math.max(bounds.right-bounds.left+25,c.a.title.length>8?184:144),144,this.w<700?152:184);
        c.accessible.style.width=labelWidth+'px';c.accessible.style.left=cx+'px';c.accessible.style.top=captionY+'px';
        captionCandidates.push({c,bounds,x:cx-labelWidth/2,y:captionY,w:labelWidth,priority:this.hover===mesh?0:groupIds.has(c.a.id)?1:2,depth:mesh.position.distanceTo(this.camera.position)});
      }
    }
    // Keep readable captions horizontal, omitting distant overlaps instead of
    // shrinking the font. Every object stays reachable through group navigation.
    const shownCaptions=new Set();
    const occupied=[{x:12,y:12,w:180,h:55},{x:this.w-115,y:12,w:103,h:45}];
    for(const item of captionCandidates.sort((a,b)=>a.priority-b.priority||a.depth-b.depth)){
      const {c,x,y,w,bounds}=item,h=Math.ceil(c.a.title.length/Math.floor((w-10)/16))*23+30;
      const alternatives=[{x,y,w,h},{x:bounds.right+12,y:bounds.top+Math.min(25,(bounds.bottom-bounds.top)*.2),w,h},
        {x:bounds.left-w-12,y:bounds.top+Math.min(25,(bounds.bottom-bounds.top)*.2),w,h},
        {x,y:bounds.top-h-12,w,h}];
      const rect=(item.priority===0&&c.captionRect)||alternatives.find(r=>r.x>12&&r.x+r.w<this.w-12&&r.y>12&&r.y+r.h<this.h-10&&
        ![...occupied,...imageBounds].some(b=>r.x<b.x+b.w+6&&r.x+r.w>b.x-6&&r.y<b.y+b.h+5&&r.y+r.h>b.y-5));
      if(!rect)continue;
      occupied.push(rect);shownCaptions.add(c.a.id);c.captionRect=rect;
      c.accessible.style.left=(rect.x+w/2)+'px';c.accessible.style.top=rect.y+'px';
      const moved=Math.abs(rect.x-x)>15||Math.abs(rect.y-y)>15;
      let sx=(bounds.left+bounds.right)/2,sy=rect.y<bounds.top?bounds.top-4:bounds.bottom+4;
      let ex=rect.x+w/2,ey=rect.y<bounds.top?rect.y+rect.h-4:rect.y-4;
      if(rect.x>=bounds.right){sx=bounds.right+4;sy=(bounds.top+bounds.bottom)/2;ex=rect.x-5;ey=rect.y+12}
      else if(rect.x+w<=bounds.left){sx=bounds.left-4;sy=(bounds.top+bounds.bottom)/2;ex=rect.x+w+5;ey=rect.y+12}
      c.leader.setAttribute('d',moved?`M ${sx} ${sy} L ${ex} ${ey}`:'');
    }
    for(const c of this.cards.values()){const visible=shownCaptions.has(c.a.id);c.accessible.hidden=!visible;c.accessible.tabIndex=visible?0:-1;c.leader.style.display=visible?'':'none'}
    for(const l of this.labels){
      const p=l.point.clone().project(this.camera);const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<.92&&Math.abs(p.y)<.8&&(!dimmed||l.upper);
      l.el.hidden=!visible;if(!visible)continue;
      l.el.style.transform=`translate(${(p.x*.5+.5)*this.w}px,${(-p.y*.5+.5)*this.h}px)`;
      l.el.style.opacity=l.upper?ease(progress):dimmed?0:1;
      l.el.style.pointerEvents=!l.upper&&dimmed?'none':'';
    }
    const eraList=this.viewingLift?this.liftLayout.eras:this.archive.eras;
    const current=eraList.find(e=>this.focus.x>=e.start&&this.focus.x<=e.end)||eraList.reduce((best,e)=>Math.min(Math.abs(e.start-this.focus.x),Math.abs(e.end-this.focus.x))<Math.min(Math.abs((best?.start??Infinity)-this.focus.x),Math.abs((best?.end??Infinity)-this.focus.x))?e:best,null);
    this.host.dataset.facing=this.hover&&this.hover.quaternion.angleTo(this.camera.quaternion)<.03?'front':'shelved';
    if(current?.id!==this.currentEra){this.currentEra=current?.id;this.onEra?.(current?.id);this.host.querySelector('.three-current-era').textContent=current?.title||''}

    const groupText=group?`${String(group.index+1).padStart(2,'0')} / ${String(group.total).padStart(2,'0')}`:'';
    this.host.querySelector('.three-group-index').textContent=groupText;
    this.host.dataset.readingGroup=group?`${group.id}:${group.index}`:'';
    this.host.querySelector('.three-group-index').title=group?`${group.title}，第 ${group.index+1} 组，共 ${group.total} 组`:'';
    const range=this.host.querySelector('.three-range');range.value=this.focus.x;range.setAttribute('aria-valuetext',`${current?.title||'时间轴'}，${Math.round(this.focus.x/(+range.max)*100)}%`);
    this.host.dataset.cameraLevel=this.viewingLift?'upper':'lower';
    if(this.hover){
      const p=this.hover.position.clone().project(this.camera);
      const cx=(p.x*.5+.5)*this.w,cy=(-p.y*.5+.5)*this.h;
      const bounds=this.projectedBounds(this.hover);const offset=(bounds.right-bounds.left)/2+15;
      const tipWidth=this.tip.offsetWidth,tipHeight=this.tip.offsetHeight;
      const left=cx+offset+tipWidth<this.w-14?cx+offset:cx-offset-tipWidth;
      this.tip.style.left=clamp(left,12,Math.max(12,this.w-tipWidth-12))+'px';
      this.tip.style.top=clamp(cy-tipHeight/2,12,Math.max(12,this.h-tipHeight-12))+'px';
    }
    const focusDistance=this.hover?-this.hover.position.clone().applyMatrix4(this.camera.matrixWorldInverse).z:this.cameraDistance;
    this.dofFocus=(this.dofFocus??focusDistance)+(focusDistance-(this.dofFocus??focusDistance))*damping;
    this.dof.render(this.scene,this.camera,this.dofFocus);this.frameId=requestAnimationFrame(t=>this.frame(t));
  }
}
