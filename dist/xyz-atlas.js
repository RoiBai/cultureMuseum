import {SpatialStage,THREE,line} from './spatial-stage.js';
import {xyzLayout} from './spatial-model.js';
import {esc} from './study-data.js';
export class XYZAtlas extends SpatialStage{
 constructor(host,{artifacts,eraDefs,cities,onDetail,onEra}){
  host.innerHTML=`<div class="spatial-canvas"></div><div class="xyz-labels"></div><div class="spatial-heading"><span class="spatial-kicker">THREE DIMENSIONS / 器物坐标</span><h2>时间，地域，色相。</h2><p>X 时代 · Y 出土地 · Z 照片色相</p></div><div class="spatial-tools"><button data-xyz="home">全景 ⤢</button><button data-xyz="front">正视 XY</button><button data-xyz="top">俯视 XZ</button><button data-xyz="rotate" aria-pressed="false">缓慢旋转</button></div><div class="xyz-tip" hidden></div><div class="xyz-legend"><span><i style="background:#b2a17b"></i>X · 时代分段</span><span><i style="background:#8eaa99"></i>Y · 城市分类</span><span class="hue-scale">Z · HUE <i></i> 0–360°</span></div><div class="spatial-bottom"><p class="spatial-status" role="status">拖动旋转 · 滚轮缩放 · 右键 / 双指平移</p><details><summary>坐标怎么读</summary><p>时代分段等距陈列，不代表真实年份间距；出土地按城市分类，不代表地理距离。色相取照片前景的主要有彩色，无明显色相的器物在独立灰阶列。小幅错位用于避免同坐标重叠，细线指向原始坐标。</p></details></div>`;
  super(host);this.artifacts=artifacts;this.onDetail=onDetail;this.onEra=onEra;this.layout=xyzLayout(artifacts,cities.map(c=>c.name));this.items=[];this.labels=[];this.matched=new Set(artifacts.map(a=>a.id));this.ray=new THREE.Raycaster();this.mouse=new THREE.Vector2();this.hover=null;this.era=null;
  this.home();this.createAxes(eraDefs);this.createObjects();
  host.querySelectorAll('[data-xyz]').forEach(b=>b.onclick=()=>{const type=b.dataset.xyz;if(type==='home'){this.era=null;this.home();this.setFilter({matchedIds:this.matched})}if(type==='front')this.resetCamera([0,0,265]);if(type==='top')this.resetCamera([0,265,.01]);if(type==='rotate'){this.controls.autoRotate=!this.controls.autoRotate;b.setAttribute('aria-pressed',this.controls.autoRotate)}});
  const canvas=this.renderer.domElement;canvas.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];this.hideTip()});canvas.addEventListener('pointermove',e=>{if(e.buttons)return;this.pick(e)});canvas.addEventListener('pointerleave',()=>this.hideTip());
  canvas.addEventListener('pointerup',e=>{if(this.down&&Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])<6){const item=this.hit(e);if(item){this.controls.autoRotate=false;this.onDetail(item.a)}}this.down=null});
  this.tip=host.querySelector('.xyz-tip');this.tip.addEventListener('click',e=>{if(e.target.closest('[data-open-xyz]')&&this.hover)this.onDetail(this.hover.a)});
  this.controls.addEventListener('start',()=>this.hideTip());host.dataset.ready='true';
 }
 home(){const narrow=(this.stage.clientWidth||900)<600;this.resetCamera(narrow?[265,165,325]:[125,64,155])}
 createAxes(eraDefs){
  const {eras,cities}=this.layout,origin=[-86,-49,-58];
  // A sparse wire volume keeps the open space legible without a solid floor.
  for(let i=0;i<=4;i++){const x=-78+i*39;line(this.scene,[[x,-42,-42],[x,42,-42],[x,42,42]],'#7b866f',.10)}
  for(let z=-42;z<=42;z+=21)line(this.scene,[[-78,-42,z],[78,-42,z],[78,42,z]],'#7b866f',.08);
  line(this.scene,[origin,[89,-49,-58]],'#b2a17b',.85);line(this.scene,[origin,[-86,52,-58]],'#91b6a0',.85);
  line(this.scene,[[-86,-49,-58],[-86,-49,-42]],'#9e9d8d',.5);
  for(let i=0;i<36;i++){const c=new THREE.Color().setHSL(i/36,.38,.5);line(this.scene,[[-86,-49,-42+i*84/36],[-86,-49,-42+(i+1)*84/36]],c,.85)}
  eras.forEach((era,i)=>{const x=-78+156*i/(eras.length-1);line(this.scene,[[x,-49,-58],[x,-47.5,-58]],'#b2a17b',.5);this.addLabel(eraDefs.find(e=>e[0]===era)?.[1]||era,[x,-54,-58],'era',()=>this.jumpEra(era))});
  cities.forEach((city,i)=>{const y=-42+84*i/(cities.length-1);this.addLabel(city,[-93,y,-58],'city')});
  [[0,-42],[60,-28],[120,-14],[180,0],[240,14],[300,28],[360,42]].forEach(([h,z])=>this.addLabel(h+'°',[-93,-49,z],'hue'));
  this.addLabel('灰阶',[-86,-49,-65],'hue');this.addLabel('X · 时间',[97,-49,-58],'axis');this.addLabel('Y · 出土地',[-86,59,-58],'axis');this.addLabel('Z · 色相',[-86,-49,51],'axis');
 }
 addLabel(text,p,type,onclick){const b=document.createElement(onclick?'button':'span');b.className='xyz-label xyz-label-'+type;b.textContent=text;if(onclick)b.onclick=onclick;this.host.querySelector('.xyz-labels').append(b);this.labels.push({el:b,p:new THREE.Vector3(...p)})}
 createObjects(){
  const loader=new THREE.TextureLoader();for(const record of this.layout.records){const a=this.artifacts.find(a=>a.id===record.id),p=new THREE.Vector3(...record.position),material=new THREE.SpriteMaterial({color:'#b2a17b',transparent:true,opacity:.7,depthTest:true,alphaTest:.10}),sprite=new THREE.Sprite(material);sprite.position.copy(p);sprite.visible=false;sprite.scale.set(8,8,1);this.scene.add(sprite);
   const dot=new THREE.Mesh(new THREE.SphereGeometry(.42,8,6),new THREE.MeshBasicMaterial({color:record.hue.hex}));dot.position.fromArray(record.anchor);this.scene.add(dot);line(this.scene,[record.anchor,record.position],record.hue.hex,.22);
   const item={a,record,sprite,p,size:[8,8],dot};sprite.userData.item=item;this.items.push(item);
   loader.load(a.displayImage,t=>{t.colorSpace=THREE.SRGBColorSpace;sprite.visible=true;const mask=document.createElement('canvas');mask.width=64;mask.height=64;const ctx=mask.getContext('2d',{willReadFrequently:true});ctx.drawImage(t.image,0,0,64,64);item.alpha=ctx.getImageData(0,0,64,64).data;material.map=t;material.color.set('#ffffff');material.needsUpdate=true;const ratio=t.image.width/t.image.height;item.size=ratio>1?[11,11/ratio]:[11*ratio,11];sprite.scale.set(...item.size,1)},undefined,()=>{item.failed=true});
  }
 }
 setFilter({matchedIds}){this.matched=new Set(matchedIds);for(const item of this.items){item.active=this.matched.has(item.a.id)&&(!this.era||item.a.era===this.era);item.sprite.material.opacity=item.active?1:.055;item.dot.material.opacity=item.active?1:.08;item.dot.material.transparent=true}this.host.querySelector('.spatial-status').textContent=`${this.items.filter(i=>i.active).length} 件高亮 · 拖动旋转 · 滚轮缩放 · 点击器物查看`;this.hideTip()}
 jumpEra(id){this.era=id;const items=this.items.filter(i=>i.a.era===id);if(!items.length)return;const x=items[0].record.anchor[0];this.resetCamera([x+65,35,140],[x,0,0]);this.setFilter({matchedIds:this.matched});this.onEra?.(id)}
 focusItem(item){this.onEra?.(item.a.era)}
 hit(e){const r=this.renderer.domElement.getBoundingClientRect();this.mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);return this.ray.intersectObjects(this.items.filter(i=>i.active!==false&&i.sprite.visible).map(i=>i.sprite)).find(hit=>{const item=hit.object.userData.item;if(!item.alpha||!hit.uv)return true;const x=Math.max(0,Math.min(63,Math.floor(hit.uv.x*64))),y=Math.max(0,Math.min(63,Math.floor((1-hit.uv.y)*64)));return item.alpha[(y*64+x)*4+3]>90})?.object.userData.item}
 pick(e){const item=this.hit(e);this.renderer.domElement.style.cursor=item?'pointer':'grab';if(item)this.showTip(item,false);else this.hideTip()}
 showTip(item,pinned){if(this.hover!==item){this.hover=item;this.tip.innerHTML=`<span class="spatial-kicker">${esc(item.a.period)} · ${esc(item.a.city)}</span><strong>${esc(item.a.title)}</strong><span class="xyz-value"><i style="background:${item.record.hue.hex}"></i>照片色相 ${item.record.hue.label}</span><button data-open-xyz>打开器物档案 ↗</button>`}this.tip.hidden=false;this.pinned=pinned}
 hideTip(){this.hover=null;if(this.tip)this.tip.hidden=true}
 navigationState(){return {...super.navigationState(),era:this.era}}
 restore(s){super.restore(s);if(s?.era&&this.layout.eras.includes(s.era)){this.era=s.era;this.setFilter({matchedIds:this.matched})}}
 frame(){this.camera.updateMatrixWorld();for(const label of this.labels){const p=this.project(label.p);label.el.style.transform=`translate(${p.x}px,${p.y}px)`;label.el.hidden=!p.visible}for(const item of this.items){const scale=this.hover===item?1.9:1;item.sprite.scale.lerp(new THREE.Vector3(item.size[0]*scale,item.size[1]*scale,1),.16)}if(this.hover){const p=this.project(this.hover.p);this.tip.style.left=Math.max(10,Math.min(this.w-244,p.x+22))+'px';this.tip.style.top=Math.max(90,Math.min(this.h-180,p.y-55))+'px';this.tip.hidden=!p.visible}}
}
