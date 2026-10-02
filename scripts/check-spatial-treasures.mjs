import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hsv,photoHue,xyzLayout,chooseRandom} from '../dist/spatial-model.js';
import {structuralVolume,volumeRecipe} from '../dist/pointcloud-volume.js';
import {treasures,fourLoves} from '../dist/treasure-data.js';
const root=new URL('../dist/',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('data/artifacts.json',root)));
assert.equal(hsv('#ff0000').h,0);assert.equal(hsv('#00ff00').h,120);assert.equal(hsv('#0000ff').h,240);
assert.equal(photoHue({palette:[{hex:'#444444',share:99},{hex:'#ff0000',share:1}]}).h,null,'tiny color flecks cannot give neutral objects a hue');
assert.equal(photoHue({palette:[{hex:'#000000',share:90},{hex:'#ff0000',share:10}]}).h,0,'the background/black does not swamp observed chromatic hue');
assert.equal(photoHue({palette:[{hex:'#ff0000',share:60},{hex:'#00ff00',share:40}]}).h,0,'do not average opposite hues into an unobserved yellow');
const layout=xyzLayout(data,[...new Set(data.map(a=>a.city))]);assert.equal(layout.records.length,data.length);
for(const p of layout.records){assert(p.position.every(Number.isFinite));assert(p.anchor.every(Number.isFinite));assert(p.hue.h===null||p.hue.h>=0&&p.hue.h<360)}
for(const era of layout.eras){assert.equal(new Set(layout.records.filter(r=>r.era===era).map(r=>r.anchor[0])).size,1,'same era keeps the same time coordinate')}
for(const city of layout.cities){assert.equal(new Set(layout.records.filter(r=>r.city===city).map(r=>r.anchor[1])).size,1,'same city keeps the same location coordinate')}
const pix=new Uint8ClampedArray(64*64*4);for(let y=5;y<59;y++)for(let x=18;x<46;x++)pix.set([150,60,25,255],(y*64+x)*4);
for(const kind of ['lathe','sculpture','frame-drum','tripod','sword','box','relief','cloth']){const spec={kind,depth:1,label:kind},cloud=structuralVolume(pix,64,64,4096,42,spec);assert(cloud.position.every(Number.isFinite));assert(cloud.normal.every(Number.isFinite));assert(cloud.color.every(v=>v>=0&&v<=1));const spans=[0,1,2].map(k=>{const values=cloud.position.filter((_,i)=>i%3===k);return Math.max(...values)-Math.min(...values)});assert(spans[2]>1,'every shape occupies depth');if(['lathe','sculpture','tripod','box'].includes(kind))assert(spans[2]/spans[0]>.4,'volumetric forms cannot collapse into a photo sheet');if(kind==='tripod')assert(spans[2]/spans[1]>.3,'three feet and belly occupy depth');assert.deepEqual(cloud.position,structuralVolume(pix,64,64,4096,42,spec).position,'sampling is reproducible');for(let i=0;i<cloud.normal.length;i+=3)assert(Math.abs(Math.hypot(...cloud.normal.slice(i,i+3))-1)<.0001,'surface normals must be unit length')}
assert.equal(volumeRecipe({title:'漆木扁壶'}).depth,.48);assert.equal(volumeRecipe({title:'越王勾践剑'}).kind,'sword');assert.equal(volumeRecipe({title:'元青花四爱图梅瓶'}).kind,'lathe');assert.equal(volumeRecipe({title:'铜升鼎'}).kind,'tripod');assert.equal(volumeRecipe({id:'drum'}).kind,'frame-drum');
assert.throws(()=>structuralVolume(new Uint8ClampedArray(16),2,2,2));assert.equal(chooseRandom([],'a'),null);assert.equal(chooseRandom([{id:'a'}],'a').id,'a');assert.equal(chooseRandom([{id:'a'},{id:'b'}],'a').id,'b');
assert.equal(treasures.length,10);assert.equal(new Set(treasures.map(t=>t.id)).size,10);assert.equal(fourLoves.length,4);
for(const t of treasures){const a=data.find(a=>a.id===t.id);assert(a||t.image);assert(fs.existsSync(new URL(t.image||a.displayImage,root)));assert(/^https:\/\/(www.hbww.org.cn|hbsbwg.cjyun.org)\//.test(t.source));for(const c of t.chapters){assert(c.rect.every(Number.isFinite));assert(c.rect[0]>=0&&c.rect[1]>=0&&c.rect[0]+c.rect[2]<=1.00001&&c.rect[1]+c.rect[3]<=1.00001);if(c.answers)assert(c.correct>=0&&c.correct<c.answers.length)}}
const models=JSON.parse(fs.readFileSync(new URL('data/pointcloud-models.json',root)));for(const [id,m] of Object.entries(models)){assert(data.some(a=>a.id===id));assert(/^(models\/|chimes\/assets\/)[\w./-]+\.(glb|gltf)$/.test(m.url));assert(fs.existsSync(new URL(m.url,root)))}
for(const name of ['sword-wide.jpg','sword-detail.jpg','yunxian-skulls.jpeg'])assert(fs.statSync(new URL('treasure-assets/'+name,root)).size>10000);
for(const f of ['pointcloud-volume.js','spatial-model.js','spatial-stage.js','xyz-atlas.js','particle-cloud.js','treasure-data.js','treasure-audio.js','treasures.js','app.js','object.js'])execFileSync(process.execPath,['--check',fileURLToPath(new URL(f,root))]);
console.log(JSON.stringify({passed:true,xyzObjects:layout.records.length,eras:layout.eras.length,neutralHueSeparation:true,volumetricPointSampling:true,shapeFamilies:8,sideDepthAndNormals:true,treasures:treasures.length,availableModel:Object.keys(models)}));
