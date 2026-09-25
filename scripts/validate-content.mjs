import fs from 'node:fs';
import path from 'node:path';
const data=JSON.parse(fs.readFileSync('dist/data/artifacts.json','utf8'));
const fail=(message)=>{throw new Error(message)};
const ids=new Set();
for(const a of data.artifacts){
 if(ids.has(a.id))fail('Duplicate artifact '+a.id);ids.add(a.id);
 const sources=new Set(a.sources.map(s=>s.id));
 const points=new Set(a.hotspots.map(h=>h.id));
 for(const img of a.images){if(!fs.existsSync(path.join('dist',img.src)))fail('Missing image '+img.src);if(!sources.has(img.sourceId))fail('Missing image source');}
 for(const h of a.hotspots){if(!sources.has(h.sourceId))fail('Missing hotspot source');for(const n of ['x','y'])if(typeof h.anchor[n]!=='number'||h.anchor[n]<0||h.anchor[n]>1)fail('Invalid anchor '+h.id);if(!h.fact||!h.observation)fail('Missing evidence separation');}
 for(const r of a.relations){if(!points.has(r.from)||!points.has(r.to))fail('Invalid relation '+r.id);for(const sid of r.sourceIds)if(!sources.has(sid))fail('Invalid relation source');}
 for(const l of a.lenses){for(const sid of l.sourceIds)if(!sources.has(sid))fail('Invalid lens source');}
}
console.log(`Validated ${data.artifacts.length} artifact, ${data.artifacts[0].hotspots.length} hotspots, ${data.artifacts[0].relations.length} sourced relations, 5 reading lenses.`);
