import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/controls/OrbitControls.js';
export {THREE};
export class SpatialStage{
 constructor(host){
  this.host=host;this.visible=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.stage=host.querySelector('.spatial-canvas');this.scene=new THREE.Scene();
  this.camera=new THREE.PerspectiveCamera(42,1,.1,1400);this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);this.stage.append(this.renderer.domElement);
  this.renderer.domElement.setAttribute('aria-label','可拖动旋转的三维场景');this.renderer.domElement.tabIndex=0;
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.minDistance=30;this.controls.maxDistance=540;this.controls.enablePan=true;this.controls.autoRotateSpeed=.4;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.stage);
  this.renderer.domElement.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.host.querySelector('.spatial-status').textContent='三维显示已暂停，请刷新页面恢复。'});
  this.renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();const offset=this.camera.position.clone().sub(this.controls.target);if(e.key==='+'||e.key==='-')offset.multiplyScalar(e.key==='+'?.85:1.15);else{const spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=e.key==='ArrowLeft'?.15:e.key==='ArrowRight'?-.15:0;spherical.phi+=e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0;spherical.makeSafe();offset.setFromSpherical(spherical)}this.camera.position.copy(this.controls.target).add(offset);this.controls.update()});
  document.addEventListener('visibilitychange',()=>this.schedule());
 }
 resize(){const r=this.stage.getBoundingClientRect();if(!r.width||!r.height)return;this.w=r.width;this.h=r.height;this.renderer.setSize(this.w,this.h,false);this.camera.aspect=this.w/this.h;this.camera.updateProjectionMatrix()}
 setVisible(v){this.visible=v;this.resize();this.schedule()}
 schedule(){this.renderer.setAnimationLoop(this.visible&&!document.hidden?t=>{this.controls.update();this.frame?.(t);this.renderer.render(this.scene,this.camera)}:null)}
 navigationState(){return {camera:this.camera.position.toArray(),target:this.controls.target.toArray()}}
 restore(s){if(!s)return;const valid=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<600);if(valid(s.camera)&&valid(s.target)){this.camera.position.fromArray(s.camera);this.controls.target.fromArray(s.target);this.controls.update()}}
 project(p){const v=p.clone().project(this.camera);return {x:(v.x+1)*this.w/2,y:(1-v.y)*this.h/2,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1}}
 resetCamera(position,target=[0,0,0]){this.camera.position.fromArray(position);this.controls.target.fromArray(target);this.controls.update()}
}
export function line(scene,points,color='#66725a',opacity=.3){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity}));scene.add(l);return l}
