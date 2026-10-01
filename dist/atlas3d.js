import * as THREE from './vendor/three.module.js';
import {arrangeArchive, arrangeLift, CARD, LIFT} from './atlas3d-layout.js';
import {filterSample, materialSpec} from './visual-language.js';

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
    this.camera = new THREE.OrthographicCamera(-15,15,10,-10,.1,700);
    this.cameraOffset = new THREE.Vector3(-14,16,28);
    this.parallax=new THREE.Vector3();this.parallaxTarget=new THREE.Vector3();
    this.focus = new THREE.Vector3(8,2.5,0); this.focusTarget = this.focus.clone();
    this.viewHeight = 17; this.zoomTarget = 17;
    this.renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label','三维器物展卷：左右拖动，悬停翻阅，点击查看档案');
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.className = 'three-canvas';
    this.stage = host.querySelector('.three-stage'); this.stage.prepend(this.renderer.domElement);
    this.overlay = host.querySelector('.three-labels');
    this.tip = host.querySelector('.three-object-tip');
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.paperGeometry = new THREE.PlaneGeometry(CARD.width,CARD.height);
    this.restQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-1.12,0));
    this.archiveGuides = new THREE.Group(); this.liftGuides = new THREE.Group();
    this.scene.add(this.archiveGuides, this.liftGuides);
    this.baseLines = []; this.upperLabels = [];
    this.createArchive(); this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.stage);
    this.host.dataset.renderer = 'threejs'; this.host.dataset.cards = artifacts.length;
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
      const base=new THREE.Mesh(this.paperGeometry,new THREE.MeshBasicMaterial({map:skeletonTexture,side:THREE.DoubleSide,transparent:true,alphaTest:.03,depthWrite:false}));
      const p=this.archive.positions.get(a.id); base.position.set(p.x,p.y,p.z); base.quaternion.copy(this.restQuaternion);
      base.userData={artifact:a,layer:'base'};
      const lift=new THREE.Mesh(this.paperGeometry,base.material.clone()); lift.position.copy(base.position); lift.quaternion.copy(this.restQuaternion);
      lift.userData={artifact:a,layer:'lift'}; lift.visible=false;
      this.scene.add(base,lift);
      const accessible=document.createElement('button'); accessible.className='three-card-access';
      accessible.textContent=a.title; accessible.setAttribute('aria-label',`${a.title}，${a.period}，查看档案`);
      accessible.addEventListener('focus',()=>this.setHover(this.filtered&&lift.visible?lift:base));
      accessible.addEventListener('blur',()=>this.setHover(null)); accessible.addEventListener('click',()=>this.onDetail(a));
      this.overlay.append(accessible);
      let seed=0;for(const char of a.id)seed=(seed*31+char.charCodeAt(0))>>>0;
      const restQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-1.12+(seed%11-5)*.025,(seed%7-3)*.014));
      base.quaternion.copy(restQuaternion);lift.quaternion.copy(restQuaternion);
      this.cards.set(a.id,{a,base,lift,accessible,restQuaternion,opacity:1});
    }
  }

  cardTexture(a, image) {
    const canvas=document.createElement('canvas'); canvas.width=480; canvas.height=604;
    const ctx=canvas.getContext('2d');
    const color=this.cities.find(c=>c.name===a?.city)?.color || '#a49373';
    if(image){
      const scale=Math.min(450/image.width,486/image.height);
      ctx.drawImage(image,15+(450-image.width*scale)/2,8+(486-image.height*scale)/2,image.width*scale,image.height*scale);
    }
    ctx.fillStyle=color;ctx.fillRect(24,512,35,3);
    ctx.fillStyle='#514738';ctx.font='28px "Songti SC", serif';
    const name=a?.short||a?.title||'正在展陈';let line='',lines=[];
    for(const char of name){if(ctx.measureText(line+char).width>432){lines.push(line);line=char}else line+=char}lines.push(line);
    lines.slice(0,2).forEach((text,i)=>ctx.fillText(text,24,552+i*34));
    if(lines.length===1){ctx.fillStyle='#897a63';ctx.font='18px sans-serif';ctx.fillText(a?.city||'',24,584)}
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
      const texture=this.cardTexture(card.a,trimmed);card.base.material.map=texture;card.lift.material.map=texture;
      card.base.material.needsUpdate=true;card.lift.material.needsUpdate=true;loaded++;
    }catch(error){failed++;card.accessible.dataset.imageError='true';console.warn('3D image unavailable',card.a.id,error)}
    this.host.dataset.loaded=loaded;this.host.dataset.failed=failed;
    }};
    await Promise.all(Array.from({length:6},load));this.host.dataset.textureStatus=failed?'partial':'ready';
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
    this.focusTarget.y=filtered&&matchedIds.size?LIFT+2.5:2.5;
    const length=filtered&&matchedIds.size?this.liftLayout.length:this.archive.length;
    this.focusTarget.x=filtered?Math.min(this.homeX(),length/2):this.savedArchiveX??this.homeX();
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
    const candidates=this.filtered?this.liftLayout?.eras: this.archive.eras;
    const era=candidates?.find(e=>e.id===id);
    if(era){this.focusTarget.x=Math.min(era.end-1,era.start+Math.min(7,(era.end-era.start)/2));this.focusTarget.y=this.filtered?LIFT+2.5:2.5}
    else {const base=this.archive.eras.find(e=>e.id===id);if(base){this.focusTarget.x=base.start+Math.min(7,base.width/2);this.focusTarget.y=2.5}}
    if(!this.filtered)this.savedArchiveX=this.focusTarget.x;
    this.setHover(null);
  }

  homeX(){return this.w<700?5.3:8}

  pan(amount) {
    const length=this.focusTarget.y>5?this.liftLayout?.length||this.archive.length:this.archive.length;
    this.focusTarget.x=clamp(this.focusTarget.x+amount,0,length);
    if(!this.filtered)this.savedArchiveX=this.focusTarget.x;
  }

  bindControls() {
    const canvas=this.renderer.domElement;
    this.host.addEventListener('click',e=>{
      const era=e.target.closest('[data-three-era]');if(era){this.jumpEra(era.dataset.threeEra);return}
      const action=e.target.closest('[data-three]')?.dataset.three;
      if(action==='previous')this.pan(-this.viewHeight*.65);
      if(action==='next')this.pan(this.viewHeight*.65);
      if(action==='closer')this.zoomTarget=clamp(this.zoomTarget*.8,10,40);
      if(action==='farther')this.zoomTarget=clamp(this.zoomTarget*1.25,10,40);
      if(action==='home'){const elevated=this.filtered&&this.liftLayout.positions.size>0;this.focusTarget.set(Math.min(this.homeX(),(elevated?this.liftLayout.length:this.archive.length)/2),elevated?LIFT+2.5:2.5,0);this.zoomTarget=17}
      if(action==='ground'){
        const below=this.focusTarget.y>5;this.focusTarget.y=below?2.5:LIFT+2.5;
        this.host.querySelector('[data-three="ground"]').textContent=below?'返回浮层 ↑':'俯看全谱 ↓';
        this.host.querySelector('.three-range').max=below?this.archive.length:this.liftLayout.length;
      }
    });
    this.host.querySelector('.three-range').addEventListener('input',e=>{this.focusTarget.x=+e.target.value;this.setHover(null);if(!this.filtered)this.savedArchiveX=this.focusTarget.x});
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,startX:this.focusTarget.x,moved:false,id:e.pointerId};canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{
      if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>5)this.drag.moved=true;
        if(this.drag.moved){this.focusTarget.x=this.drag.startX;this.pan(-dx*this.viewHeight/Math.max(1,this.stage.clientHeight)/.9);this.setHover(null);canvas.classList.add('dragging');return}}
      if(e.pointerType!=='touch'){this.setHover(this.pick(e));if(!this.reduced.matches)this.parallaxTarget.set(this.pointer.x*1.5,this.pointer.y*.65,0)}
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
      if(e.key==='ArrowLeft')this.pan(-5);if(e.key==='ArrowRight')this.pan(5);if(e.key==='Home')this.jumpEra('neolithic');
      if(e.key==='+')this.zoomTarget=clamp(this.zoomTarget*.8,10,40);if(e.key==='-')this.zoomTarget=clamp(this.zoomTarget*1.25,10,40);
    });
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.setVisible(false);this.host.querySelector('.three-error').hidden=false});
  }

  pick(event) {
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const meshes=[...this.cards.values()].flatMap(c=>this.filtered&&this.focusTarget.y>5?(c.destination&&c.lift.visible?[c.lift]:[]):[c.base]);
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
    this.w=this.stage.clientWidth;this.h=this.stage.clientHeight;if(!this.w||!this.h)return;
    this.renderer.setSize(this.w,this.h,false);
    if(!this.signature){this.focus.x=this.homeX();this.focusTarget.x=this.homeX()}
    this.updateCamera();
  }

  updateCamera() {
    const aspect=(this.w||1)/(this.h||1), half=this.viewHeight/2;
    this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;
    this.camera.position.copy(this.focus).add(this.cameraOffset).add(this.parallax);this.camera.lookAt(this.focus);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  }

  frame(now) {
    this.frameId=0;if(!this.active)return;
    const dt=Math.min(.06,(now-this.lastFrame)/1000||.016);this.lastFrame=now;
    const damping=this.reduced.matches?1:1-Math.exp(-dt*6);
    if(this.transition){const t=clamp((now-this.transition.start)/this.transition.duration,0,1);this.focus.lerpVectors(this.transition.cameraFrom,this.focusTarget,ease(t))}
    else this.focus.lerp(this.focusTarget,damping);
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
    const dimmed=this.filtered&&this.focusTarget.y>5;
    for(const c of this.cards.values()){
      const alpha=dimmed?.2:1;c.base.material.opacity+=(alpha-c.base.material.opacity)*damping;
      for(const mesh of [c.base,c.lift])if(mesh.visible){
        mesh.quaternion.slerp(this.hover===mesh?this.camera.quaternion:c.restQuaternion,this.reduced.matches?1:1-Math.exp(-dt*10));
      }
      const mesh=dimmed&&c.destination?c.lift:c.base;
      const p=mesh.position.clone().project(this.camera);
      const visible=Math.abs(p.x)<.97&&Math.abs(p.y)<.84&&(!dimmed||!!c.destination);
      c.accessible.hidden=!visible;c.accessible.tabIndex=visible?0:-1;
      if(visible){c.accessible.style.left=(p.x*.5+.5)*this.w+'px';c.accessible.style.top=(-p.y*.5+.5)*this.h+'px'}
    }
    for(const l of this.labels){
      const p=l.point.clone().project(this.camera);const visible=Math.abs(p.x)<1.14&&Math.abs(p.y)<1.06&&(!dimmed||l.upper);
      l.el.hidden=!visible;if(!visible)continue;
      l.el.style.transform=`translate(${(p.x*.5+.5)*this.w}px,${(-p.y*.5+.5)*this.h}px)`;
      l.el.style.opacity=l.upper?ease(progress):dimmed?0:1;
      l.el.style.pointerEvents=!l.upper&&dimmed?'none':'';
    }
    const eraList=this.filtered&&this.focusTarget.y>5?this.liftLayout.eras:this.archive.eras;
    const current=eraList.find(e=>this.focus.x>=e.start&&this.focus.x<=e.end)||eraList.reduce((best,e)=>Math.min(Math.abs(e.start-this.focus.x),Math.abs(e.end-this.focus.x))<Math.min(Math.abs((best?.start??Infinity)-this.focus.x),Math.abs((best?.end??Infinity)-this.focus.x))?e:best,null);
    this.host.dataset.facing=this.hover&&this.hover.quaternion.angleTo(this.camera.quaternion)<.03?'front':'shelved';
    if(current?.id!==this.currentEra){this.currentEra=current?.id;this.onEra?.(current?.id);this.host.querySelector('.three-current-era').textContent=current?.title||''}
    const range=this.host.querySelector('.three-range');range.value=this.focus.x;range.setAttribute('aria-valuetext',`${current?.title||'时间轴'}，${Math.round(this.focus.x/(+range.max)*100)}%`);
    this.host.dataset.cameraLevel=this.focus.y>8?'upper':'lower';
    if(this.hover){
      const p=this.hover.position.clone().project(this.camera);
      const cx=(p.x*.5+.5)*this.w,cy=(-p.y*.5+.5)*this.h;
      const offset=CARD.width*this.h/this.viewHeight*.55+15;
      const tipWidth=this.tip.offsetWidth,tipHeight=this.tip.offsetHeight;
      const left=cx+offset+tipWidth<this.w-14?cx+offset:cx-offset-tipWidth;
      this.tip.style.left=clamp(left,12,Math.max(12,this.w-tipWidth-12))+'px';
      this.tip.style.top=clamp(cy-tipHeight/2,12,Math.max(12,this.h-tipHeight-12))+'px';
    }
    this.renderer.render(this.scene,this.camera);this.frameId=requestAnimationFrame(t=>this.frame(t));
  }
}
