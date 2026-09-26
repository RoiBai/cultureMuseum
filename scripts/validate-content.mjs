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

const catalogue = [...data.artifacts, ...(data.relatedArtifacts || [])];
const records = new Map();
for (const item of catalogue) {
 if (records.has(item.id)) fail('Duplicate catalogue ID: '+item.id);
 records.set(item.id,item);
 if (!item.comparison) fail('Missing comparison reading: '+item.id);
 for (const key of ['position','form','color']) if (!item.comparison[key]) fail('Missing '+key+' reading: '+item.id);
 const focus=item.comparison.focus;
 if (!focus || !['x','y'].every(k=>Number.isFinite(focus[k])&&focus[k]>=0&&focus[k]<=1) || focus.scale<1 || focus.scale>2) fail('Invalid photo focus: '+item.id);
 if (!fs.existsSync(path.join('dist',item.image.src))) fail('Missing catalogue image: '+item.id);
 if (!item.image.rights || !item.image.sourceUrl || item.image.width<=0 || item.image.height<=0) fail('Missing image provenance: '+item.id);
 for (const id of item.comparison.sourceIds) if (!item.sources.some(s=>s.id===id)) fail('Missing reading source: '+item.id);
}
const groupIds=new Set();
for (const group of data.motifGroups || []) {
 if (groupIds.has(group.id)) fail('Duplicate motif: '+group.id);groupIds.add(group.id);
 if (group.artifactIds.length<2 || new Set(group.artifactIds).size!==group.artifactIds.length) fail('Invalid motif membership');
 for (const id of group.artifactIds) if (!records.has(id)) fail('Unknown motif member: '+id);
}
const edgeIds=new Set(), pairs=new Set();
for (const edge of data.comparisons || []) {
 if (edgeIds.has(edge.id)) fail('Duplicate comparison: '+edge.id);edgeIds.add(edge.id);
 if (edge.from===edge.to || !records.has(edge.from) || !records.has(edge.to)) fail('Invalid comparison endpoints');
 const pair=[edge.from,edge.to].sort().join('|');if(pairs.has(pair))fail('Duplicate comparison pair');pairs.add(pair);
 for (const id of edge.motifIds) {
  if (!groupIds.has(id)) fail('Unknown comparison motif');
  const group=data.motifGroups.find(g=>g.id===id);
  if (![edge.from,edge.to].every(a=>group.artifactIds.includes(a))) fail('Comparison outside motif group');
 }
 if (!edge.shared || !edge.difference) fail('Missing comparison reasoning');
 for (const ref of edge.sourceRefs) if (![edge.from,edge.to].includes(ref.artifactId) || !records.get(ref.artifactId)?.sources.some(s=>s.id===ref.sourceId)) fail('Invalid comparison evidence');
 for (const id of [edge.from,edge.to]) if(!edge.sourceRefs.some(ref=>ref.artifactId===id))fail('Comparison must cite both objects');
}
for (const group of data.motifGroups || []) {
 for (let i=0;i<group.artifactIds.length;i++) for(let j=i+1;j<group.artifactIds.length;j++) {
  if(!pairs.has([group.artifactIds[i],group.artifactIds[j]].sort().join('|')))fail('Missing comparison between motif members');
 }
}
console.log(`Validated ${records.size} catalogue records, ${groupIds.size} motif group and ${edgeIds.size} comparisons with evidence for both objects.`);
