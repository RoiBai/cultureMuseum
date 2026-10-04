import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureValues} from '../dist/feature-values.js';
import {createHash} from 'node:crypto';
import {clusterLayout,palettePosition,colourPosition,swatchRecords,nearestTraditional,materialLabel} from '../dist/colour-model.js';
import {createCollectionState,updateCollectionState,seasonAt,surfacePart} from '../dist/collection-lab-data.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../dist/'+f,import.meta.url)));
const a=read('data/artifacts.json'),colours=read('data/traditional-colours.json'),sources=read('data/colour-literature.json');
const records=swatchRecords(a),layout=clusterLayout(a);assert.equal(layout.length,a.length);assert.equal(records.length,a.reduce((n,x)=>n+x.palette.length,0));assert.equal(colours.colors.length,161);
assert.deepEqual(layout.map(n=>n.p),clusterLayout(a).map(n=>n.p));for(const n of layout)assert(n.p.every(Number.isFinite));
// True three-dimensional positions, including brightness depth and palette mixtures.
for(let axis=0;axis<3;axis++)assert(Math.max(...layout.map(n=>n.p[axis]))-Math.min(...layout.map(n=>n.p[axis]))>25);
const mix=palettePosition({palette:[{hex:'#aa2020',share:50},{hex:'#171717',share:50}]});const red=colourPosition('#aa2020'),black=colourPosition('#171717');mix.forEach((v,i)=>assert(Math.abs(v-(red[i]+black[i])/2)<1e-8));
for(const r of records){const match=nearestTraditional(r.hex,colours.colors);assert(match.name&&match.id);assert(colours.colors.some(c=>c.id===match.id&&c.hex===match.hex));assert(Number.isFinite(match.distance))}
for(const c of colours.colors)assert.equal(nearestTraditional(c.hex,colours.colors).distance,0);
assert(!/金|黄/.test(nearestTraditional('#545442',colours.colors).name),'Olive-grey must not acquire a gold/yellow name');
assert.deepEqual(featureValues({materialGroup:['漆木','漆器']},'materialGroup'),['漆器']);assert(!a.some(x=>x.materialGroup==='漆木'));assert.equal(a.filter(x=>materialLabel(x)==='漆器').length,49);for(const n of sources.names)assert(n.quote&&n.url.startsWith('https://')&&n.work);
let s=createCollectionState();s=updateCollectionState(s,{type:'cup',index:0,inside:true});assert.equal(s.cups[0],false,'Closed case prevents cup placement');s=updateCollectionState(s,{type:'lid',value:1});for(let i=0;i<3;i++)s=updateCollectionState(s,{type:'cup',index:i,inside:true});assert.equal(s.cups.filter(Boolean).length,3);const old=s;s=updateCollectionState(s,{type:'cup',index:1,inside:false});assert.equal(old.cups[1],true);assert.equal(s.cups[1],false);assert.deepEqual(updateCollectionState(s,{type:'reset'}),createCollectionState());
assert.deepEqual([0,90,180,270,360,-90].map(seasonAt),[0,1,2,3,0,3]);assert.equal(updateCollectionState(s,{type:'head',value:900}).head,160);
const report=read('models/new-lab-optimization.json');assert.equal(report.models.length,3);
for(const m of report.models){const raw=fs.readFileSync(new URL('../dist/'+m.outputFile,import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),m.outputSha256);assert(raw.length<12000000);assert(m.outputTriangles<=250000);const jl=raw.readUInt32LE(12),g=JSON.parse(raw.subarray(20,20+jl)),bin=raw.subarray(28+jl),p=g.meshes[0].primitives[0],acc=g.accessors[p.attributes.POSITION],v=g.bufferViews[acc.bufferView],pos=new Float32Array(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(acc.byteOffset||0),acc.count*3),iacc=g.accessors[p.indices],iv=g.bufferViews[iacc.bufferView],idx=new Uint32Array(bin.buffer,bin.byteOffset+(iv.byteOffset||0)+(iacc.byteOffset||0),iacc.count),bounds=m.outputBounds,scale=100/Math.max(...bounds.size),counts={};
 const id=({'mandarin-duck':'duck','pig-case':'jz-458','star-chest':'chest'})[m.id];
 for(let k=0;k<idx.length;k+=3){const q=[0,0,0];for(let j=0;j<3;j++)for(let d=0;d<3;d++)q[d]+=(pos[idx[k+j]*3+d]-(d===1?bounds.min[d]:bounds.center[d]))*scale/3;const part=surfacePart(id,...q);counts[part]=(counts[part]||0)+1}
 assert(counts.body>10000&&counts.lid>1000,JSON.stringify(counts));if(id==='duck')assert(counts.head>1000);assert.equal(Object.values(counts).reduce((a,b)=>a+b),m.outputTriangles);
}
console.log(JSON.stringify({passed:true,artifacts:a.length,photoColours:records.length,referenceColours:colours.colors.length,models:report.models.map(m=>m.id),allSwatchesNamed:true,threeDimensionalPaletteCentroids:true}));
