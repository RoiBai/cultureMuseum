#!/usr/bin/env node
/**
 * Create ordinary, self-contained GLB files from the two supplied Tripo models.
 * Dependencies remain outside this repository:
 *   npm install --prefix /tmp/jingchu-model-tools meshoptimizer@1.1.1
 *   python3 -m venv /tmp/jingchu-model-python
 *   /tmp/jingchu-model-python/bin/pip install Pillow==11.3.0 numpy==1.26.4
 * Usage:
 *   MESHOPTIMIZER_DIR=/tmp/jingchu-model-tools/node_modules/meshoptimizer \
 *   PYTHON=/tmp/jingchu-model-python/bin/python \
 *   node scripts/optimize-tripo-models.mjs /path/to/source/models
 * Or provide individual paths as the first and second arguments.
 * Meshoptimizer only simplifies/reorders during authoring. No mesh compression,
 * quantization extension, Draco, KTX2, external images or runtime decoder is used.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const meshoptimizer = process.env.MESHOPTIMIZER_DIR || '/tmp/jingchu-model-tools/node_modules/meshoptimizer';
const {MeshoptSimplifier: simplifier} = await import(pathToFileURL(path.join(meshoptimizer, 'meshopt_simplifier.js')));
const {MeshoptEncoder: encoder} = await import(pathToFileURL(path.join(meshoptimizer, 'meshopt_encoder.js')));
await Promise.all([simplifier.ready, encoder.ready]);
const args = process.argv.slice(2);
if (!args.length) throw new Error('Provide the source directory, or the dragon-ring GLB and bronze-vessel GLB paths.');
const sourceNames = ['dragon ring stand 3d model.glb', 'ancient bronze vessel 3d model.glb'];
const inputs = args.length === 1 ? sourceNames.map(name => path.join(args[0], name)) : args;
const ids = ['dragon-ring', 'bronze-vessel'];
const outputDir = path.join(root, 'dist/models');
fs.mkdirSync(outputDir, {recursive: true});
const sha = data => createHash('sha256').update(data).digest('hex');
const components = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4};
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jingchu-tripo-textures-'));

function readGlb(raw) {
  if (raw.readUInt32LE(0) !== 0x46546c67 || raw.readUInt32LE(4) !== 2 || raw.readUInt32LE(8) !== raw.length) throw new Error('Invalid GLB header');
  const jsonLength = raw.readUInt32LE(12);
  if (raw.readUInt32LE(16) !== 0x4e4f534a || raw.readUInt32LE(24 + jsonLength) !== 0x004e4942) throw new Error('Expected JSON and BIN chunks');
  const document = JSON.parse(raw.subarray(20, 20 + jsonLength));
  if (document.meshes?.length !== 1 || document.meshes[0].primitives.length !== 1 || document.nodes?.length !== 1 || document.skins?.length || document.animations?.length) throw new Error('This importer supports these single-mesh Tripo inputs only');
  if ([...(document.buffers || []), ...(document.images || [])].some(item => item.uri)) throw new Error('Embedded buffers and images required');
  return {document, bin: raw.subarray(28 + jsonLength)};
}

function accessorArray(document, bin, index) {
  const accessor = document.accessors[index], view = document.bufferViews[accessor.bufferView];
  const Constructor = {5126: Float32Array, 5125: Uint32Array}[accessor.componentType];
  if (!Constructor || accessor.sparse || view.byteStride) throw new Error('Unsupported source accessor');
  const count = accessor.count * components[accessor.type];
  return new Constructor(bin.buffer, bin.byteOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0), count).slice();
}

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    if (!Number.isFinite(positions[i])) throw new Error('Non-finite position');
    min[i % 3] = Math.min(min[i % 3], positions[i]); max[i % 3] = Math.max(max[i % 3], positions[i]);
  }
  const size = max.map((v, i) => v - min[i]), center = max.map((v, i) => (v + min[i]) / 2), scale = Math.max(...size);
  return {min, max, size, center, normalizationScale: 1 / scale,
    centeredUnitBounds: {min: size.map(v => -v / scale / 2), max: size.map(v => v / scale / 2)},
    groundUnitBounds: {min: [-size[0] / scale / 2, 0, -size[2] / scale / 2], max: [size[0] / scale / 2, size[1] / scale, size[2] / scale / 2]}};
}

function radialProfile(positions, bbox) {
  const bins = Array.from({length: 32}, (_, i) => ({heightFraction: [(i / 32), ((i + 1) / 32)], vertices: 0, maximumRadius: 0}));
  for (let i = 0; i < positions.length; i += 3) {
    const fraction = (positions[i + 1] - bbox.min[1]) / bbox.size[1];
    const bin = bins[Math.min(31, Math.max(0, Math.floor(fraction * 32)))];
    bin.vertices++;
    bin.maximumRadius = Math.max(bin.maximumRadius, Math.hypot(positions[i] - bbox.center[0], positions[i + 2] - bbox.center[2]));
  }
  return bins;
}

function packGlb(document, chunks) {
  const bin = Buffer.concat(chunks), json = Buffer.from(JSON.stringify(document));
  const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonPadded.length + bin.length, 8);
  header.writeUInt32LE(jsonPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonPadded, binHeader, bin]);
}

const report = {
  format: 'glTF 2.0 GLB; float32 attributes, uint32 indices, embedded JPEG/PNG',
  source: 'User-provided Tripo generated models; not measured artifact scans.',
  dependencyVersions: {meshoptimizer: '1.1.1', Pillow: '11.3.0', numpy: '1.26.4'},
  method: {targetTriangles: 200000, maximumRelativeError: 0.01, attributes: ['NORMAL', 'TEXCOORD_0'], attributeWeights: [1, 1, 1, 1, 1], simplificationFlags: [], textureMaximumDimension: 2048,
    notes: 'Preserves attribute seams and connected features using topology-aware attribute simplification; no aggressive component pruning. Normals and UVs retain original values at surviving vertices. Error is the simplifier estimate, not a scan-accuracy metric.'},
  models: [],
};

try {
  for (let modelIndex = 0; modelIndex < 2; modelIndex++) {
    const id = ids[modelIndex], sourcePath = path.resolve(inputs[modelIndex]), original = fs.readFileSync(sourcePath);
    const {document, bin} = readGlb(original), primitive = document.meshes[0].primitives[0];
    if (primitive.mode !== 4 || primitive.targets || Object.keys(primitive.attributes).sort().join() !== 'NORMAL,POSITION,TEXCOORD_0') throw new Error('Unexpected Tripo primitive');
    const positions = accessorArray(document, bin, primitive.attributes.POSITION);
    const normals = accessorArray(document, bin, primitive.attributes.NORMAL);
    const uvs = accessorArray(document, bin, primitive.attributes.TEXCOORD_0);
    const indices = accessorArray(document, bin, primitive.indices);
    const attributes = new Float32Array(positions.length / 3 * 5);
    for (let i = 0; i < positions.length / 3; i++) {
      attributes.set(normals.subarray(i * 3, i * 3 + 3), i * 5);
      attributes.set(uvs.subarray(i * 2, i * 2 + 2), i * 5 + 3);
    }
    const [simplified, relativeError] = simplifier.simplifyWithAttributes(indices, positions, 3, attributes, 5, [1, 1, 1, 1, 1], null, 600000, 0.01);
    const [remap, count] = encoder.reorderMesh(simplified, true, false);
    const remapAttribute = (old, stride) => {
      const out = new Float32Array(count * stride);
      for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) out.set(old.subarray(i * stride, i * stride + stride), remap[i] * stride);
      return out;
    };
    const reducedPositions = remapAttribute(positions, 3), reducedNormals = remapAttribute(normals, 3), reducedUvs = remapAttribute(uvs, 2);
    const bbox = bounds(reducedPositions);
    const textureReport = JSON.parse(execFileSync(process.env.PYTHON || 'python3', [path.join(root, 'scripts/resize-tripo-textures.py'), sourcePath, path.join(temp, id), '2048'], {encoding: 'utf8'}));
    const chunks = [], views = [], accessors = [];
    let byteOffset = 0;
    const addView = (data, target) => {
      const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      const index = views.length;
      views.push({buffer: 0, byteOffset, byteLength: bytes.length, ...(target ? {target} : {})});
      chunks.push(bytes); byteOffset += bytes.length;
      const padding = (4 - byteOffset % 4) % 4;
      if (padding) {chunks.push(Buffer.alloc(padding)); byteOffset += padding;}
      return index;
    };
    const images = textureReport.map(texture => ({name: `${id}-${texture.index}`, bufferView: addView(fs.readFileSync(texture.file)), mimeType: texture.mimeType}));
    const addAccessor = (array, type, target, extra = {}) => {
      const index = accessors.length;
      accessors.push({bufferView: addView(array, target), componentType: array instanceof Float32Array ? 5126 : 5125, count: array.length / components[type], type, ...extra});
      return index;
    };
    const nextPrimitive = {mode: 4, material: primitive.material, attributes: {
      POSITION: addAccessor(reducedPositions, 'VEC3', 34962, {min: bbox.min, max: bbox.max}),
      NORMAL: addAccessor(reducedNormals, 'VEC3', 34962),
      TEXCOORD_0: addAccessor(reducedUvs, 'VEC2', 34962),
    }, indices: addAccessor(simplified, 'SCALAR', 34963)};
    const output = {
      asset: {version: '2.0', generator: 'Tripo; optimized with meshoptimizer 1.1.1 and Pillow', extras: {provenance: 'Image-generated model; not a measured artifact scan.'}},
      scene: document.scene || 0, scenes: document.scenes, nodes: document.nodes.map(node => ({...node, name: id})),
      meshes: [{name: id, primitives: [nextPrimitive]}], materials: document.materials,
      textures: document.textures, samplers: document.samplers, images,
      buffers: [{byteLength: byteOffset}], bufferViews: views, accessors,
    };
    // The source only declares two unused extensions; neither contains payloads.
    // Reject future inputs that need extensions instead of silently removing them.
    if (document.extensionsRequired?.length || JSON.stringify(document).includes('"extensions":')) throw new Error('Unexpected source extension payload');
    const glb = packGlb(output, chunks), target = path.join(outputDir, `${id}.glb`);
    if (glb.length > 12000000 || simplified.length / 3 > 250000) throw new Error(`Output budget exceeded for ${id}`);
    fs.writeFileSync(target, glb);
    const stats = {
      id, sourceFile: path.basename(sourcePath), sourceGenerator: document.asset.generator,
      provenance: 'User-provided Tripo image-generated model; not a measured artifact scan. The filename is not an authenticated artifact identification.',
      outputFile: `models/${id}.glb`,
      sourceSha256: sha(original), outputSha256: sha(glb), sourceBytes: original.length, outputBytes: glb.length,
      sourceTriangles: indices.length / 3, outputTriangles: simplified.length / 3,
      sourceVertices: positions.length / 3, outputVertices: count,
      relativeSimplificationError: relativeError, absoluteSimplificationError: relativeError * simplifier.getScale(positions, 3),
      sourceBounds: bounds(positions), outputBounds: bbox,
      radialProfileByHeight: radialProfile(reducedPositions, bbox),
      textures: textureReport.map(({file, ...texture}) => texture),
    };
    report.models.push(stats);
    console.log(`${id}: ${(glb.length / 1048576).toFixed(2)} MiB; ${stats.outputTriangles} triangles; ${count} vertices; error ${(relativeError * 100).toFixed(4)}%; ${target}`);
  }
  fs.writeFileSync(path.join(outputDir, 'optimization-report.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
