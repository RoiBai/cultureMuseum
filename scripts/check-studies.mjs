import fs from 'node:fs';
import assert from 'node:assert/strict';
import {comparisonSet,primaryRegions,regionFor,compareURL,hasFeature,validRect,cropOverride} from '../dist/study-data.js';
const root=new URL('../dist/',import.meta.url);
const data=JSON.parse(fs.readFileSync(new URL('data/artifacts.json',root)));
const details=JSON.parse(fs.readFileSync(new URL('data/detail-regions.json',root)));
const regions=details.artifacts;
assert.equal(details.coordinateSpace,'normalized-displayImage');
assert.equal(Object.keys(regions).length,data.length);
let regionCount=0,comparisons=0;
for(const a of data){
 const list=regions[a.id];assert(list.length>=2,a.id+' needs detail and whole views');
 assert.equal(new Set(list.map(r=>r.id)).size,list.length);
 for(const r of list){
  assert(validRect(r.rect),a.id+' / '+r.id+' invalid crop');
  assert.equal(r.source,a.source);assert(r.note&&r.label&&r.basis);
  if(['motifs','crafts'].includes(r.dimension))assert(a[r.dimension].includes(r.value));
  if(r.view==='unseen')assert.deepEqual(r.rect,[0,0,1,1]);
  regionCount++;
 }
 const primary=primaryRegions(list);assert(primary.length>0&&primary.length<=3);
 assert.equal(new Set(primary.map(r=>r.rect.join(','))).size,primary.length);
 for(let i=1;i<primary.length;i++)assert(primary[i-1].rect[1]+primary[i-1].rect[3]/2<=primary[i].rect[1]+primary[i].rect[3]/2);
 for(const key of ['motifs','crafts','colors','materialGroup'])for(const value of (Array.isArray(a[key])?a[key]:[a[key]])){
  const result=comparisonSet(data,regions,a.id,key,value);
  assert.equal(result.current.id,a.id);assert(!result.others.some(o=>o.id===a.id));
  assert.equal(new Set(result.others.map(o=>o.id)).size,result.others.length);
  assert.equal(result.count,data.filter(o=>hasFeature(o,key,value)).length);
  assert(result.others.every(o=>hasFeature(o,key,value)));
  for(const item of [result.current,...result.others]){
   const region=result.region(item);assert(validRect(region.rect));
   if(['colors','materialGroup'].includes(key))assert.deepEqual(region.rect,[0,0,1,1]);
  }
  comparisons++;
 }
}
const flowers=comparisonSet(data,regions,'dou','motifs','花卉');assert.equal(flowers.count,12);
for(const id of ['hb-6916','hb-4694','hb-6911','jz-356','jz-357','hb-4805','hb-4774'])assert(!hasFeature(data.find(a=>a.id===id),'motifs','花卉'));
const birds=comparisonSet(data,regions,'dou','motifs','鸟类');assert.equal(birds.count,30);
assert.equal(new Set([birds.current,...birds.others].map(a=>a.id)).size,30);
assert(birds.others.some(a=>a.id==='jz-354'),'Recorded birds remain after removing place-name phoenix match');
assert.equal(comparisonSet(data,regions,'missing','motifs','花卉'),null);
assert.equal(comparisonSet(data,regions,'dou','unknown','花卉'),null);
assert.equal(comparisonSet(data,regions,'dou','motifs','蝙蝠'),null);
assert.equal(new URL(compareURL('dou','motifs','花卉'), 'https://example.test/').searchParams.get('value'),'花卉');
const floral=regionFor(data.find(a=>a.id==='dou'),regions,'motifs','花卉');
globalThis.sessionStorage={getItem:()=>'{bad json'};assert.deepEqual(cropOverride('dou',floral),floral.rect);
sessionStorage.getItem=()=>JSON.stringify([0,0,8,8]);assert.deepEqual(cropOverride('dou',floral),floral.rect);
sessionStorage.getItem=()=>JSON.stringify([.2,.1,.3,.3]);assert.deepEqual(cropOverride('dou',floral),[.2,.1,.3,.3]);
delete globalThis.sessionStorage;
const report={artifacts:data.length,regions:regionCount,comparisonCases:comparisons,flowers:flowers.count,birds:birds.count,passed:true};
fs.writeFileSync(new URL('../docs/studies-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
