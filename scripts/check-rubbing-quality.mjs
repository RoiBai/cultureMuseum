import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=file=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+file,import.meta.url),'utf8'));
const {entries}=read('rubbings.json');
const review=read('rubbing-quality-review.json');
const byId=new Map(entries.map(entry=>[entry.id,entry]));
const visible=entries.filter(entry=>entry.available);
assert.equal(byId.size,entries.length,'Rubbing IDs must be unique');
assert(visible.length>=30,'The curated workshop must retain at least 30 usable patterns');
assert.equal(review.summary.retained,visible.length);
assert.equal(new Set(review.entries.map(entry=>entry.id)).size,review.entries.length);
for(const record of review.entries){
 const entry=byId.get(record.id);
 assert(entry,record.id+' must preserve its catalogue/provenance record');
 assert.equal(entry.qualityReview?.status,record.status);
 assert(record.reason.trim());
 assert.equal(entry.available,record.status==='retain');
 assert.equal(record.status==='retain'?entry.image:entry.archivedImage,record.asset);
 const asset=fs.readFileSync(new URL('../dist/'+record.asset,import.meta.url));
 assert.equal(createHash('sha256').update(asset).digest('hex'),record.assetSHA256,record.id+' reviewed asset changed');
}
for(const entry of visible){
 assert(entry.surfaceVerified&&entry.view==='detail');
 assert.equal(entry.qualityReview?.status,'retain','Every visible image needs visual quality review');
 assert(review.entries.some(record=>record.id===entry.id&&record.status==='retain'));
}
for(const label of ['重复装饰单元','漆壶颈部云凤纹']){
 assert(!entries.some(entry=>entry.available&&entry.label===label),label+' must not return to the visible library');
}
console.log(JSON.stringify({passed:true,visible:entries.filter(entry=>entry.available).length,reviewed:review.entries.length,archivedAssetsPreserved:true}));
