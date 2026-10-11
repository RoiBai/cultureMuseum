import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const objects=read('dist/data/artifacts.json'),byId=new Map(objects.map(a=>[a.id,a]));
const regions=read('dist/data/detail-regions.json').artifacts,entries=read('dist/data/rubbings.json').entries;
for(const id of ['jz-478','jz-474','hb-6915','hb-4860','hb-4861','hb-5423','hb-5099','hb-5026','hb-5143','crane'])assert.deepEqual(byId.get(id).motifs,[],id+' must not classify an overall figure as a surface motif');
assert(!byId.get('hb-5517').motifs.includes('龙蛇'),'Panlongcheng is a place, not dragon-pattern evidence');
for(const id of ['jz-462','hb-4694'])assert(!byId.get(id).motifs.includes('禽鸟'),'Bird-seal script is not an independent bird motif');
assert(byId.get('hb-5459').motifs.includes('凤鸟'),'Documented painted phoenix decoration remains');
const available=entries.filter(e=>e.available);
for(const e of available){
 const a=byId.get(e.objectId);assert(a&&a.motifs.includes(e.motif));assert(e.surfaceVerified&&e.view==='detail');assert(e.source===a.source&&e.rect.length===4);
 const r=regions[e.objectId].find(r=>r.dimension==='motifs'&&r.value===e.motif);assert(r?.rubbingEligible);
 assert(fs.existsSync(new URL('../dist/'+e.image,import.meta.url)));
}
assert(available.some(e=>e.catalogueAdded),'Reviewed new museum photos must enter the workshop');
assert(!entries.some(e=>e.view==='form'),'No animal silhouette records in the motif library');
const workshop=fs.readFileSync(new URL('../dist/workshop.js',import.meta.url),'utf8');assert(workshop.includes('e.available&&e.surfaceVerified'));
console.log(JSON.stringify({passed:true,objectsAudited:objects.length,usableSurfaceRubbings:available.length,newRubbings:available.filter(e=>e.catalogueAdded).length}));
