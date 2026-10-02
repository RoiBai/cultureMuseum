import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/controls/OrbitControls.js';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {RoomEnvironment} from './vendor/environments/RoomEnvironment.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class ObjectLabScene {
 constructor(host,config,events={}) {
  Object.assign(this,{host,config,events,parts:new Map(),pickables:[],ice:[],lift:0,liftTarget:0,cameraLift:0,wine:0,cooling:0,cutaway:false,disposed:false,last:0,highlightUntil:0});
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.abort=new AbortController();this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(39,1,.5,900);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  this.renderer.setClearColor(0,0);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;host.append(this.renderer.domElement);
  this.canvas=this.renderer.domElement;this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label',config.id==='drum'?'可旋转的三维虎座鸟架鼓，点击鼓面敲击，A S D 使用不同击法':'可旋转的三维尊盘，向上拖动内尊，点击外盘放冰');
  this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.enablePan=false;this.controls.minDistance=90;this.controls.maxDistance=370;this.controls.maxPolarAngle=Math.PI*.9;this.controls.rotateSpeed=.65;
  this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.group=new THREE.Group();this.scene.add(this.group);
  this.pmrem=new THREE.PMREMGenerator(this.renderer);const room=new RoomEnvironment();this.environment=this.pmrem.fromScene(room,.04);room.dispose();this.scene.environment=this.environment.texture;
  this.scene.add(new THREE.HemisphereLight('#ebeddb','#3c5432',.95));const key=new THREE.DirectionalLight('#fff3d9',2.5);key.position.set(-70,145,110);this.scene.add(key);const rim=new THREE.DirectionalLight('#b6c3a4',1.8);rim.position.set(100,100,-75);this.scene.add(rim);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.view('home');this.bind();
  this.visibility=()=>{if(document.hidden){this.events.onPause?.();this.renderer.setAnimationLoop(null)}else if(!this.disposed)this.renderer.setAnimationLoop(t=>this.frame(t))};document.addEventListener('visibilitychange',this.visibility,{signal:this.abort.signal});
  this.renderer.setAnimationLoop(t=>this.frame(t));
 }
 async load(){
  const gltf=await new GLTFLoader().loadAsync(this.config.model,e=>this.events.onProgress?.(e.total?e.loaded/e.total:null));
  if(this.disposed){this.release(gltf.scene);return}
  gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=100/Math.max(size.x,size.y,size.z);
  this.height=size.y*scale;this.modelScale=scale;const isDrum=this.config.id==='drum';
  gltf.scene.traverse(original=>{
   if(!original.isMesh)return;
   const g=original.geometry.clone();g.applyMatrix4(original.matrixWorld);g.translate(-center.x,-box.min.y,-center.z);g.scale(scale,scale,scale);
   const pos=g.attributes.position,index=g.index,n=index?index.count:pos.count,groups=new Map();
   for(let i=0;i<n;i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);let x=0,y=0,z=0;for(const id of ids){x+=pos.getX(id)/3;y+=pos.getY(id)/3;z+=pos.getZ(id)/3}
    let part;if(isDrum)part=y<30?'tiger':y>52&&(x*x/(23*23)+(y-77)*(y-77)/(26*26))<1.15?'drum':'phoenix';
    else part=Math.hypot(x,z)<.262*scale&&y>.155*scale?'zun':'pan';
    if(!groups.has(part))groups.set(part,[]);groups.get(part).push(...ids);
   }
   for(const [name,indices] of groups){
    let group=this.parts.get(name);if(!group){group=new THREE.Group();group.name=name;this.parts.set(name,group);this.group.add(group)}
    const geometry=new THREE.BufferGeometry();for(const [name,attr] of Object.entries(g.attributes))geometry.setAttribute(name,attr);geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const material=(Array.isArray(original.material)?original.material[0]:original.material).clone();material.metalness=isDrum?.08:.65;material.roughness=isDrum?.52:.64;material.envMapIntensity=.8;material.side=THREE.DoubleSide;
    const mesh=new THREE.Mesh(geometry,material);mesh.userData.part=name;group.add(mesh);this.pickables.push(mesh);
   }
   original.geometry.dispose();
  });
  if(isDrum)this.makeDrum();else this.makeVessel();
  this.ready=true;this.events.onReady?.();
 }
 makeDrum(){
  this.drumCenter=new THREE.Vector3(-.3,81.5,5.8);this.drumRadius=14.0;
  this.skinMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,uniforms:{uTime:{value:0},uHit:{value:-20},uStrength:{value:0},uPoint:{value:new THREE.Vector2(.5,.5)}},vertexShader:`varying vec2 vUv;uniform float uTime,uHit,uStrength;uniform vec2 uPoint;void main(){vUv=uv;vec3 p=position;float t=max(0.,uTime-uHit);float d=distance(uv,uPoint);p.z+=sin(d*45.-t*31.)*exp(-t*5.)*uStrength*.42*smoothstep(.5,.35,length(uv-.5));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime,uHit,uStrength;uniform vec2 uPoint;float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float d=length(vUv-.5);float ring=sin(distance(vUv,uPoint)*62.-max(0.,uTime-uHit)*18.)*exp(-max(0.,uTime-uHit)*4.)*uStrength;vec3 c=mix(vec3(.33,.27,.16),vec3(.63,.55,.35),smoothstep(.51,.07,d));c+=noise(vUv*400.)*.045;c+=ring*.07;gl_FragColor=vec4(c,.96);}`});
  this.skin=new THREE.Mesh(new THREE.CircleGeometry(this.drumRadius,96),this.skinMaterial);this.skin.position.copy(this.drumCenter);this.skin.scale.y=1.08;this.skin.userData.part='membrane';this.group.add(this.skin);this.pickables.unshift(this.skin);
  this.ripple=new THREE.Mesh(new THREE.RingGeometry(.92,1,64),new THREE.MeshBasicMaterial({color:'#ddcc8e',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));this.ripple.position.copy(this.drumCenter);this.ripple.position.z+=.8;this.group.add(this.ripple);
 }
 makeVessel(){
  // The generated surface is one mesh. Separation and missing inner/base surfaces are teaching aids.
  const bronze=new THREE.MeshStandardMaterial({color:'#666d54',metalness:.58,roughness:.78,side:THREE.DoubleSide});
  this.zunBase=new THREE.Mesh(new THREE.CylinderGeometry(8,7,.65,48),bronze);this.zunBase.position.y=16;this.zunBase.userData.part='zun';this.parts.get('zun').add(this.zunBase);this.pickables.push(this.zunBase);
  this.panLiner=new THREE.Mesh(new THREE.CylinderGeometry(35.5,33,1,80),bronze.clone());this.panLiner.position.y=15.6;this.panLiner.userData.part='pan';this.parts.get('pan').add(this.panLiner);this.pickables.push(this.panLiner);
  this.wineMesh=new THREE.Mesh(new THREE.CylinderGeometry(13.3,9,.8,64),new THREE.MeshPhysicalMaterial({color:'#bba263',metalness:.05,roughness:.22,transparent:true,opacity:.88,side:THREE.DoubleSide}));this.wineMesh.position.y=58;this.wineMesh.visible=false;this.parts.get('zun').add(this.wineMesh);
  this.innerLiquid=new THREE.Mesh(new THREE.CylinderGeometry(12,8,39,64),new THREE.MeshBasicMaterial({color:'#c8af6b',transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false}));this.innerLiquid.position.y=42;this.innerLiquid.visible=false;this.parts.get('zun').add(this.innerLiquid);
  this.iceGroup=new THREE.Group();this.group.add(this.iceGroup);
  this.coolRing=new THREE.Mesh(new THREE.RingGeometry(23,35.5,96),new THREE.MeshBasicMaterial({color:'#91cbc2',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));this.coolRing.rotation.x=-Math.PI/2;this.coolRing.position.y=16.3;this.group.add(this.coolRing);
  this.pourStream=new THREE.Mesh(new THREE.CylinderGeometry(.45,.65,26,12),new THREE.MeshBasicMaterial({color:'#e1c381',transparent:true,opacity:.72}));this.pourStream.position.set(0,84,0);this.pourStream.visible=false;this.group.add(this.pourStream);
  this.pourLip=new THREE.Mesh(new THREE.TorusGeometry(3,.6,10,32,Math.PI*1.6),new THREE.MeshStandardMaterial({color:'#a39a68',metalness:.7,roughness:.5}));this.pourLip.position.set(-2,97,0);this.pourLip.rotation.x=.8;this.pourLip.visible=false;this.group.add(this.pourLip);
 }
 resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.heightPixels=r.height;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix()}
 view(name){
  const drum=this.config.id==='drum',narrow=this.host.clientWidth<520,factor=narrow?1.15:1,target=drum?[0,52,0]:[0,45,0];
  const positions=drum?{home:[32,57,169],front:[0,53,173],side:[175,54,0],top:[0,218,.1]}:{home:[116,103,158],front:[0,94,197],side:[195,86,0],top:[0,239,.1]};
  this.cameraLift=0;this.controls.minDistance=90;this.controls.maxDistance=370;
  this.controls.target.set(...target);this.camera.position.set(...(positions[name]||positions.home).map((v,i)=>i===1?target[1]+(v-target[1])*factor:v*factor));this.controls.update();
 }
 setRay(e){const r=this.canvas.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera)}
 hit(e){if(!this.ready)return null;this.setRay(e);return this.ray.intersectObjects(this.pickables.filter(m=>m.visible),false)[0]||null}
 bind(){
  const signal=this.abort.signal;
  this.canvas.addEventListener('wheel',e=>e.preventDefault(),{passive:false,signal});
  this.canvas.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;if(this.down){this.down.moved=true;return}if(e.isPrimary===false)return;
   const hit=this.hit(e);this.down={pointerId:e.pointerId,x:e.clientX,y:e.clientY,hit,lift:this.liftTarget,moved:false};
   if(hit?.object.userData.part==='zun'){this.dragging=true;this.controls.enabled=false;this.canvas.setPointerCapture(e.pointerId);e.preventDefault()}
  },{capture:true,signal});
  this.canvas.addEventListener('pointermove',e=>{
   if(this.down){if(e.pointerId!==this.down.pointerId)return;if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>=5)this.down.moved=true}
   if(this.dragging&&this.down){this.events.onLift?.(clamp(this.down.lift+(this.down.y-e.clientY)/180,0,1));return}
   if(!this.down&&performance.now()-(this.hoverTime||0)>100){this.hoverTime=performance.now();const hit=this.hit(e);this.canvas.style.cursor=hit?.object.userData.part==='membrane'?'crosshair':hit?.object.userData.part==='zun'?'ns-resize':hit?'pointer':'grab'}
  },{signal});
  const cancel=e=>{if(!this.down||(e?.pointerId!==undefined&&e.pointerId!==this.down.pointerId))return;const pointerId=this.down.pointerId;this.down=null;this.dragging=false;this.controls.enabled=true;if(this.canvas.hasPointerCapture(pointerId))this.canvas.releasePointerCapture(pointerId)};
  const end=e=>{if(!this.down||e.pointerId!==this.down.pointerId)return;const down=this.down,distance=Math.hypot(e.clientX-down.x,e.clientY-down.y);cancel(e);if(!down.moved&&distance<5&&down.hit)this.onTap(down.hit,e)};
  this.canvas.addEventListener('pointerup',end,{signal});this.canvas.addEventListener('pointercancel',cancel,{signal});this.canvas.addEventListener('lostpointercapture',cancel,{signal});this.canvas.addEventListener('blur',cancel,{signal});window.addEventListener('blur',cancel,{signal});
  this.canvas.addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();this.view('home')}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const offset=this.camera.position.clone().sub(this.controls.target),s=new THREE.Spherical().setFromVector3(offset);s.theta+=e.key==='ArrowLeft'?.1:e.key==='ArrowRight'?-.1:0;s.phi+=e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0;s.makeSafe();this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(s));this.controls.update()}},{signal});
 }
 onTap(hit,e){
  const part=hit.object.userData.part;
  if(part==='membrane'){const p=hit.point.clone();this.skin.worldToLocal(p);const radius=clamp(Math.hypot(p.x,p.y)/this.drumRadius,0,1),strength=e.pointerType==='pen'?clamp(e.pressure,.2,1):.75;this.events.onStrike?.(radius,strength,[p.x,p.y]);return}
  if(part==='pan'&&this.liftTarget>=.7){this.setRay(e);const p=this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-18),new THREE.Vector3());this.events.onIce?.(p?Math.atan2(p.z,p.x):undefined);return}
  if(part==='zun')this.events.onLift?.(this.liftTarget>.5?0:1);
  this.events.onPart?.(part);this.highlight(part);
 }
 highlight(part){this.activePart=part;this.highlightUntil=performance.now()+3800;for(const [name,group] of this.parts)group.traverse(mesh=>{if(mesh.isMesh&&mesh.material.emissive){mesh.material.emissive.set(name===part?'#668945':'#000000');mesh.material.emissiveIntensity=name===part?.26:0}})}
 pulse(radius=.3,strength=.7,point){if(!this.skin)return;const t=performance.now()/1000;this.skinMaterial.uniforms.uHit.value=t;this.skinMaterial.uniforms.uStrength.value=strength;const p=point||[radius*this.drumRadius*.9,0];this.skinMaterial.uniforms.uPoint.value.set(p[0]/(this.drumRadius*2)+.5,p[1]/(this.drumRadius*2)+.5);this.ripple.position.copy(this.drumCenter).add(new THREE.Vector3(p[0],p[1],1));this.lastStrike=t;this.ripple.material.opacity=.65;this.highlight('drum')}
 setSkin(v){if(this.skin)this.skin.visible=v}
 setVessel(state){this.liftTarget=state.lift;this.wine=state.wine;this.cooling=state.cooling;while(this.ice.length>state.ice){const m=this.ice.pop();this.iceGroup.remove(m);this.release(m)}while(this.ice.length<state.ice)this.addIce(this.pendingIceAngle);this.pendingIceAngle=undefined;if(this.reduced)this.lift=this.liftTarget}
 addIce(angle){const index=this.ice.length,theta=Number.isFinite(angle)?angle:index*2.4+.35,r=29.8+(index%2)*1.5;
  const ice=new THREE.Group(),geo=new THREE.BoxGeometry(5.5,6.5,5.3),mat=new THREE.MeshPhysicalMaterial({color:'#b8dfda',roughness:.18,metalness:.05,transparent:true,opacity:.86,clearcoat:1});const mesh=new THREE.Mesh(geo,mat);ice.add(mesh);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:'#e1f8e7',transparent:true,opacity:.58}));ice.add(edge);ice.position.set(Math.cos(theta)*r,this.reduced?20:58,Math.sin(theta)*r);ice.rotation.set(.09+index*.1,theta,.18);ice.userData.targetY=20+(index%2)*.8;this.iceGroup.add(ice);this.ice.push(ice)}
 setCutaway(v){this.cutaway=v;for(const part of this.parts.values())part.traverse(mesh=>{if(!mesh.isMesh||mesh===this.wineMesh||mesh===this.innerLiquid)return;mesh.material.transparent=v;mesh.material.opacity=v?.19:1;mesh.material.depthWrite=!v});if(this.innerLiquid)this.innerLiquid.visible=v&&this.wine>0}
 setPouring(v){if(this.pourStream){this.pourStream.visible=v;this.pourLip.visible=v}}
 anchor(part){const points=this.config.id==='drum'?{tiger:[-23,24,4],phoenix:[-29,56,4],drum:[2,81,7]}:{zun:[0,80+this.lift*48,0],pan:[30,29,0]};return new THREE.Vector3(...(points[part]||points[Object.keys(points)[0]]))}
 screenPoint(p){const v=p.clone().project(this.camera);return {x:(v.x+1)*this.width/2+this.host.offsetLeft,y:(1-v.y)*this.heightPixels/2+this.host.offsetTop,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1}}
 frame(now){if(this.disposed)return;const dt=Math.min(.05,Math.max(0,(now-(this.last||now))/1000));this.last=now;this.controls.update();
  if(this.config.id==='drum'&&this.skin){this.skinMaterial.uniforms.uTime.value=now/1000;const age=now/1000-(this.lastStrike||-10);this.ripple.scale.setScalar(1+age*22);this.ripple.material.opacity=age<.8?(.8-age)*.55:0}
  if(this.config.id!=='drum'&&this.ready){this.lift+= (this.liftTarget-this.lift)*Math.min(1,dt*7);
   if(this.lift!==this.cameraLift){const zoom=1+this.lift*.16,ratio=zoom/(1+this.cameraLift*.16),offset=this.camera.position.clone().sub(this.controls.target).multiplyScalar(ratio);this.controls.target.y+=(this.lift-this.cameraLift)*17;this.camera.position.copy(this.controls.target).add(offset);this.controls.minDistance=90*zoom;this.controls.maxDistance=370*zoom;this.cameraLift=this.lift;this.camera.updateMatrixWorld()}
   this.parts.get('zun').position.y=this.lift*48;for(const ice of this.ice){ice.position.y+=(ice.userData.targetY-ice.position.y)*Math.min(1,dt*7);ice.scale.setScalar(1-this.cooling*.13)}this.wineMesh.visible=this.wine>0;this.wineMesh.position.y=23+this.wine*47;this.wineMesh.material.color.set('#bba263').lerp(new THREE.Color('#98b29a'),this.cooling*.65);this.innerLiquid.visible=this.cutaway&&this.wine>0;this.innerLiquid.scale.y=Math.max(.01,this.wine*47/39);this.innerLiquid.position.y=23+this.wine*23.5;this.coolRing.material.opacity=this.cooling*.25;this.pourStream.scale.y=.95+Math.sin(now*.017)*.05;}
  if(this.activePart&&now>this.highlightUntil){this.highlight(null);this.activePart=null}
  this.events.onFrame?.(dt,now);this.renderer.render(this.scene,this.camera);
 }
 release(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse?.(m=>{if(m.geometry)geometries.add(m.geometry);for(const mat of m.material?Array.isArray(m.material)?m.material:[m.material]:[]){materials.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v)}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose())}
 suspend(){this.renderer.setAnimationLoop(null)}
 resume(){if(!this.disposed){this.last=performance.now();this.renderer.setAnimationLoop(t=>this.frame(t))}}
 dispose(){this.disposed=true;this.renderer.setAnimationLoop(null);this.abort.abort();this.controls.dispose();this.resizeObserver.disconnect();this.release(this.group);this.environment.dispose();this.pmrem.dispose();this.renderer.dispose();this.canvas.remove()}
}
