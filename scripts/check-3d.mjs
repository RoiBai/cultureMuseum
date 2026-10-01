import assert from 'node:assert/strict';
import fs from 'node:fs';
import {arrangeArchive, arrangeLift, CARD, LIFT, featureValues} from '../dist/atlas3d-layout.js';
import {OrthographicCamera, Vector3} from '../dist/vendor/three.module.js';

const data=JSON.parse(fs.readFileSync(new URL('../dist/data/artifacts.json',import.meta.url)));
const eraIds=['neolithic','shang','zhou','spring','warring','qin','han','jin','northsouth','sui','tang','five','song','yuan','ming','qing','modern'];
const eras=eraIds.map(id=>[id,id,id,id]);
const archive=arrangeArchive(data,eras);
assert.equal(archive.positions.size,147);
assert.equal(archive.eras.length,15,'Omit eras without records');
assert(new Set([...archive.positions.values()].map(p=>Math.round(p.y*10))).size>12,'Floating heights break the flat shelf grid');
assert(archive.eras.find(e=>e.id==='warring').rows>=4);
assert(archive.eras.find(e=>e.id==='qing').rows>=3);
const camera=new OrthographicCamera(-20,20,10,-10,.1,700);
camera.position.set(-14,16,28);camera.lookAt(0,0,0);camera.updateMatrixWorld();
let previous;
for(const era of archive.eras){
  const projected=new Vector3(era.x,0,0).project(camera);
  if(previous){assert(projected.x>previous.x,'Later eras project right');assert(projected.y>previous.y,'Later eras project upward')}
  previous=projected;
  const peers=data.filter(a=>a.era===era.id).map(a=>archive.positions.get(a.id));
  for(const p of peers){assert(p.x-CARD.width/2>=era.start);assert(p.x+CARD.width/2<=era.end);assert(Math.abs(p.z)<era.depth/2)}
  for(let i=0;i<peers.length;i++)for(let j=i+1;j<peers.length;j++){
    assert(Math.abs(peers[i].x-peers[j].x)>=CARD.width||Math.abs(peers[i].z-peers[j].z)>=CARD.rowStep-1.7,'Equal-size cards have separate slots');
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
  assert.equal(lifted.positions.size,intersection.size,'Changing group dimension preserves the filtered result');
  assert.equal(lifted.shelves.reduce((sum,s)=>sum+s.count,0),intersection.size,'Multi-feature artifacts never duplicate');
}
assert.equal(arrangeLift(data,eras,new Set(),empty(),'colors').length,0);
assert.equal(arrangeLift(data,eras,new Set(),empty(),'colors').positions.size,0);
const report={passed:true,records:data.length,eras:archive.eras.length,featureCases:combinations,diagonal:'earliest lower-left to latest upper-right',warringRows:4,qingRows:3};
fs.writeFileSync(new URL('../docs/3d-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
