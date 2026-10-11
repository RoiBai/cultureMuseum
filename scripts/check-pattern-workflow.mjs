import assert from 'node:assert/strict';
import fs from 'node:fs';
import {defaultProject,sanitizeProject,patternPresets,presetProject} from '../dist/workshop-model.js';
import {relatedRubbings,readingForRubbing,workflowURL} from '../dist/pattern-workflow.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url),'utf8'));
const {motifs}=read('book-index.json'),{entries}=read('rubbings.json');
const defaultDesign=defaultProject();
const currentIds=new Set(entries.filter(e=>e.available).map(e=>e.id));
assert(defaultDesign.layers.every(l=>currentIds.has(l.rubbing)),'Fresh designs must use a current available crop');
for(const preset of patternPresets){
 const design=presetProject(preset.id,entries,defaultDesign);
 assert(design.layers.length>0&&design.layers.every(l=>currentIds.has(l.rubbing)),preset.name+' must only use available crops');
 const withoutPreferred=entries.filter(e=>e.id!==preset.rubbing),alternatives=withoutPreferred.filter(e=>e.available&&e.motif===preset.motif);
 if(alternatives.length){const fallback=presetProject(preset.id,withoutPreferred,defaultDesign);assert(fallback.layers.every(l=>alternatives.some(e=>e.id===l.rubbing)),'Removed defaults must fall back within the same motif family');}
 assert.throws(()=>presetProject(preset.id,[],defaultDesign),/暂时没有可用/,'Missing motif families must fail safely before changing the design');
}
const legacy=sanitizeProject({...defaultDesign,layers:[{...defaultDesign.layers[0],rubbing:'removed-catalogue-crop'}]},entries);
assert.equal(legacy.layers.length,0,'Saved designs may lose removed crops without dereferencing missing images');
const phoenix=motifs.find(m=>m.name==='凤鸟纹');
const selected=relatedRubbings(phoenix,entries);
assert(selected.length>0,'A reader must be able to select an existing phoenix rubbing');
assert(selected.every(e=>e.available),'Unavailable photographs must not become usable designs');
const tiger=entries.find(e=>e.objectId==='jz-459'&&e.motif==='虎豹');
assert(!selected.includes(tiger),'A phoenix in an object title or context must not mislabel its tiger crop');
assert(selected.some(e=>e.objectId==='hb-5459'&&e.motif==='凤鸟'),'A documented painted phoenix surface crop is available');
assert(!entries.some(e=>e.available&&e.view!=='detail'),'Sculpted animal outlines must not be available motifs');
assert(entries.filter(e=>e.available).every(e=>e.surfaceVerified),'Every usable rubbing is reviewed as surface decoration');
const selectedReading=readingForRubbing(selected[0],motifs);
assert(selectedReading&&motifs.includes(selectedReading));
const next=new URL(workflowURL('library',{motifId:phoenix.id}),'https://museum.test/');
assert.equal(next.searchParams.get('reading'),phoenix.id);
const back=new URL(workflowURL('reading',{motifId:next.searchParams.get('reading')}),'https://museum.test/');
assert.equal(back.searchParams.get('motif'),phoenix.id,'Returning from a design restores the exact source reading');
assert.equal(back.pathname,'/book.html');
for(const file of ['book.html','workshop.html']){
 const html=fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
 assert(!html.includes('<iframe'));
 assert(html.includes('data-pattern-workflow'));
 assert(!/全书页码核读记录|READING INDEX|让一条纹样，带回它的文字与语境。|循着纹样，/.test(html));
}
console.log(JSON.stringify({passed:true,phoenixRubbings:selected.length,roundTrip:'reading → related rubbing → design → source reading'}));
