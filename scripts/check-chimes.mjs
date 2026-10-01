import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dist = path.resolve('dist/chimes');
const assetRoot = path.join(dist, 'assets');
const readJSON = async file => JSON.parse(await readFile(file, 'utf8'));
const manifest = await readJSON(path.join(assetRoot, 'model-manifest.json'));
assert(manifest.url.endsWith('.gltf'), 'Published model must use split static assets');
const gltf = await readJSON(path.join(assetRoot, manifest.url));
const modelRoot = path.dirname(path.join(assetRoot, manifest.url));
for (const entry of [...gltf.buffers, ...gltf.images]) {
  assert(entry.uri && !entry.uri.includes('://'), 'Model assets must be local');
  const file = path.resolve(modelRoot, decodeURIComponent(entry.uri));
  assert(file.startsWith(assetRoot + path.sep), 'Model asset path must stay inside assets');
  const info = await stat(file);
  assert(info.size <= 25 * 1024 * 1024, 'Model asset exceeds 25 MiB');
  if (entry.byteLength) assert.equal(info.size, entry.byteLength, 'Buffer length mismatch');
}
const meshNames = new Set(gltf.nodes.filter(node => node.mesh !== undefined).map(node => node.name));
const ids = new Set();
for (const bell of manifest.bells) {
  assert(meshNames.has(bell.name), 'Bell mesh missing: ' + bell.name);
  assert(bell.id && !ids.has(bell.id), 'Duplicate bell region');
  assert(bell.label, 'Bell accessible label missing');
  if (bell.pivot) assert(bell.pivot.length === 3 && bell.pivot.every(Number.isFinite), 'Invalid suspension point');
  ids.add(bell.id);
}
assert(ids.size > 0, 'No independent bell regions');
const revision = manifest.model?.regionRevision;
if (revision?.sourceFaceOwnership) assert(revision.sourceFaceOwnership.eachSourceFaceHasOneOwner, 'Source faces have ambiguous ownership');
if (revision?.spatialProbes) for (const probe of revision.spatialProbes) assert(probe.passed && probe.actual === probe.expected, 'Failed region probe: ' + probe.probe);
let triangles = 0;
for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
  assert(gltf.materials[primitive.material], 'Material missing');
  assert(primitive.attributes.POSITION !== undefined && primitive.attributes.TEXCOORD_0 !== undefined,
    'Position and original texture UV must remain');
  assert.equal(gltf.accessors[primitive.indices].count % 3, 0);
  triangles += gltf.accessors[primitive.indices].count / 3;
}
const audio = await readJSON(path.join(dist, 'data/audio.json'));
const sampleURLs = new Set();
for (const [id, entry] of Object.entries(audio.bells)) {
  assert(ids.has(id), 'Unknown bell audio target');
  assert(entry.source && entry.usageBasis, 'Audio source and usage basis must be recorded');
  assert(entry.mode === 'substitute-recording' || (entry.physicalBellId && entry.strikePoint),
    'Recordings must identify physical mapping or explicitly state demonstration substitution');
  const url = entry.front?.url || entry.url;
  assert(url && !url.includes('://'), 'Audio assets must be local');
  const file = path.resolve(dist, url);
  assert(file.startsWith(dist + path.sep), 'Audio asset path must stay inside dist');
  const info = await stat(file);
  assert(info.size > 44 && info.size <= 25 * 1024 * 1024, 'Invalid audio asset size');
  assert(!entry.playbackRate || entry.playbackRate === 1, 'Real recordings must retain original pitch');
  sampleURLs.add(url);
}
if (audio.status === 'substitute-recordings') {
  assert.equal(Object.keys(audio.bells).length, ids.size, 'Every bell must have demonstration sound');
  assert.equal(sampleURLs.size, ids.size, 'Every bell must use a distinct recording');
}
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
assert(html.includes('importmap') && html.includes('id="reset-view"'));
console.log(JSON.stringify({ bellRegions: ids.size, triangles,
  bellsWithAudio: Object.keys(audio.bells).length, distinctRecordings: sampleURLs.size, assetsChecked: true }));
