import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {labObjects} from '../dist/lab-data.js';

const root=new URL('../dist/',import.meta.url);
const artifacts=JSON.parse(fs.readFileSync(new URL('data/artifacts.json',root)));
const registry=JSON.parse(fs.readFileSync(new URL('data/pointcloud-models.json',root)));
const report=JSON.parse(fs.readFileSync(new URL('models/optimization-report.json',root)));
for(const [id,object] of Object.entries(labObjects)){
  assert(artifacts.some(a=>a.id===id),'Interactive objects must link to an existing archive');
  assert.equal(registry[id].url,object.model,'The laboratory and particle view share one model');
  const bytes=fs.readFileSync(new URL(object.model,root));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB length matches the complete file');
  assert(bytes.length<12*1024*1024,'Keep each web model within the loading budget');
  assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert(gltf.meshes.length>0&&gltf.scenes.length>0);
  assert(!gltf.extensionsRequired?.length,'No external mesh decoder is required');
  for(const buffer of gltf.buffers)assert(!buffer.uri,'Geometry must be self-contained');
  for(const image of gltf.images)assert(image.bufferView!==undefined&&!image.uri,'Textures must be self-contained');
  const output=report.models.find(m=>m.outputFile===object.model);
  assert(output);assert.equal(createHash('sha256').update(bytes).digest('hex'),output.outputSha256);
  const validation=JSON.parse(fs.readFileSync(new URL(`models/${output.id}-validation.json`,root)));
  assert.equal(validation.issues.numErrors,0,'Official glTF validation must pass');
  for(const mesh of gltf.meshes)for(const p of mesh.primitives){
    const positions=gltf.accessors[p.attributes.POSITION];
    assert.equal(positions.type,'VEC3');assert(positions.count>1000);
    const spans=positions.max.map((v,i)=>v-positions.min[i]);
    assert(spans.every(v=>Number.isFinite(v)&&v>.1),'The model must have genuine depth');
    assert(gltf.accessors[p.indices].count/3<=201000,'Triangle count stays suitable for interaction');
  }
}
for(const name of ['object-lab.js','lab-scene.js','lab-audio.js','lab-state.js','lab-data.js']){
  execFileSync(process.execPath,['--check',fileURLToPath(new URL(name,root))]);
}
console.log('Lab models passed: catalog links, shared particle models, self-contained GLBs, hashes, validation, depth and loading budget.');
