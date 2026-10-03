import {VIEW,positionCamera} from '../dist/atlas3d-camera.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {arrangeArchive, arrangeLift, CARD, LIFT, featureValues} from '../dist/atlas3d-layout.js';
import {PerspectiveCamera, Vector3} from '../dist/vendor/three.module.js';

const data=JSON.parse(fs.readFileSync(new URL('../dist/data/artifacts.json',import.meta.url)));
const eraIds=['neolithic','shang','zhou','spring','warring','qin','han','jin','northsouth','sui','tang','five','song','yuan','ming','qing','modern'];
const eras=eraIds.map(id=>[id,id,id,id]);
const archive=arrangeArchive(data,eras);
assert.equal(archive.positions.size,data.length);
assert.equal(archive.eras.length,15,'Omit eras without records');
assert(archive.groups.every(g=>g.ids.length>0&&g.ids.length<=4),'Reading groups contain at most four artifacts');
assert.equal(new Set(archive.groups.flatMap(g=>g.ids)).size,data.length,'Every record belongs to one reading group');
assert.equal(archive.groups.flatMap(g=>g.ids).length,data.length,'Reading groups never duplicate records');
assert(archive.eras.find(e=>e.id==='warring').groupCount>1);
assert(archive.eras.find(e=>e.id==='qing').groupCount>1);
const camera=new PerspectiveCamera(VIEW.fov,1.6,.1,700);
positionCamera(camera,new Vector3(),18);
const projectedSize=p=>{const a=p.clone().project(camera),b=p.clone().add(new Vector3(0,CARD.height,0)).project(camera);return a.distanceTo(b)};
const nearSize=projectedSize(new Vector3(0,0,5.4)),farSize=projectedSize(new Vector3(0,0,-5.4));
assert(nearSize>farSize*1.2,'Equal world-size objects have a perceptible near/far size difference');
for(const yaw of [VIEW.minYaw,VIEW.maxYaw])for(const pitch of [VIEW.minPitch,VIEW.maxPitch]){
  positionCamera(camera,new Vector3(),18,yaw,pitch);
  const early=new Vector3(0,0,0).project(camera),late=new Vector3(10,0,0).project(camera);
  assert(late.x>early.x&&late.y>early.y,'Orbit retains the chronology direction');
}
positionCamera(camera,new Vector3(),18);
let previous;
for(const era of archive.eras){
  const projected=new Vector3(era.x,0,0).project(camera);
  if(previous){assert(projected.x>previous.x,'Later eras project right');assert(projected.y>previous.y,'Later eras project upward')}
  previous=projected;
  const peers=data.filter(a=>a.era===era.id).map(a=>archive.positions.get(a.id));
  for(const p of peers){assert(p.x-CARD.width/2>=era.start);assert(p.x+CARD.width/2<=era.end);assert(Math.abs(p.z)<era.depth/2)}
  for(let i=0;i<peers.length;i++)for(let j=i+1;j<peers.length;j++){
    assert(Math.abs(peers[i].x-peers[j].x)>=CARD.width||Math.abs(peers[i].z-peers[j].z)>=CARD.width,'Equal-size cards have separate slots');
  }
}
const empty=()=>Object.fromEntries(['colors','crafts','motifs','materialGroup','city'].map(k=>[k,new Set()]));
let combinations=0;
for(const dimension of Object.keys(empty())){
  for(const value of new Set(data.flatMap(a=>featureValues(a,dimension)))){
    const selected=empty();selected[dimension].add(value);
    const matching=data.filter(a=>featureValues(a,dimension).includes(value));
    const ids=new Set(matching.map(a=>a.id));
    const lifted=arrangeLift(data,eras,ids,selected,dimension);
    assert.deepEqual([...lifted.positions.keys()].sort(),[...ids].sort(),'Only matches lifted, exactly once');
    assert.deepEqual(lifted.groups.flatMap(g=>g.ids).sort(),[...ids].sort(),'Every filtered record remains reachable by group navigation');
    for(const a of matching){const p=lifted.positions.get(a.id);assert(p.y>LIFT+1&&p.y<LIFT+4);assert.equal(p.value,value)}
    for(const shelf of lifted.shelves){
      const placed=matching.filter(a=>lifted.positions.get(a.id).value===shelf.value).sort((a,b)=>lifted.positions.get(a.id).x-lifted.positions.get(b.id).x);
      for(let i=1;i<placed.length;i++)assert(eraIds.indexOf(placed[i].era)>=eraIds.indexOf(placed[i-1].era),'Chronology retained within a feature group');
    }
    combinations++;
  }
}
const selected=empty();selected.colors=new Set(['赤红','漆黑']);selected.materialGroup.add('漆木');
const intersection=new Set(data.filter(a=>a.colors.some(c=>selected.colors.has(c))&&a.materialGroup==='漆木').map(a=>a.id));
for(const dimension of ['colors','materialGroup','motifs']){
  const lifted=arrangeLift(data,eras,intersection,selected,dimension);
  const known=[...intersection].filter(id=>featureValues(data.find(a=>a.id===id),dimension).length);
  assert.deepEqual([...lifted.positions.keys()].sort(),known.sort(),'Only records with a known grouping feature rise; others remain in the complete archive');
  assert.equal(lifted.shelves.reduce((sum,s)=>sum+s.count,0),known.length,'Multi-feature artifacts never duplicate');
}
assert.equal(arrangeLift(data,eras,new Set(),empty(),'colors').length,0);
assert.equal(arrangeLift(data,eras,new Set(),empty(),'colors').positions.size,0);
const report={passed:true,records:data.length,eras:archive.eras.length,featureCases:combinations,diagonal:'earliest lower-left to latest upper-right',warringGroups:archive.eras.find(e=>e.id==='warring').groupCount,qingGroups:archive.eras.find(e=>e.id==='qing').groupCount,maxGroupSize:4,projection:'perspective',nearFarSizeRatio:+(nearSize/farSize).toFixed(2),orbitLimitsVerified:true};
fs.writeFileSync(new URL('../docs/3d-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
