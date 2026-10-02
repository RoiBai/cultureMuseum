#!/usr/bin/env python3
"""Resize embedded Tripo textures without changing texture roles or UVs.

Requires Pillow 11.3.0 and numpy 1.26.4. Inputs are data, never executable.
"""
import io
import json
from pathlib import Path
import struct
import sys

import numpy as np
from PIL import Image

source, destination = map(Path, sys.argv[1:3])
size = int(sys.argv[3]) if len(sys.argv) > 3 else 2048
raw = source.read_bytes()
json_length = struct.unpack_from('<I', raw, 12)[0]
document = json.loads(raw[20:20 + json_length])
bin_offset = 28 + json_length
normal_sources = {
    document['textures'][material['normalTexture']['index']]['source']
    for material in document.get('materials', []) if 'normalTexture' in material
}
destination.mkdir(parents=True, exist_ok=True)
report = []
for index, image in enumerate(document.get('images', [])):
    view = document['bufferViews'][image['bufferView']]
    start = bin_offset + view.get('byteOffset', 0)
    data = raw[start:start + view['byteLength']]
    original = Image.open(io.BytesIO(data))
    original.load()
    resized = original.convert('RGB')
    resized.thumbnail((size, size), Image.Resampling.LANCZOS)
    is_normal = index in normal_sources
    if is_normal:
        # The normal channels encode vectors, so normalize after filtering.
        normals = np.asarray(resized, dtype=np.float32) / 127.5 - 1.0
        normals /= np.maximum(np.linalg.norm(normals, axis=2, keepdims=True), 1e-8)
        resized = Image.fromarray(np.rint(np.clip((normals + 1) * 127.5, 0, 255)).astype(np.uint8))
        extension, mime = 'png', 'image/png'
        target = destination / f'{index}.{extension}'
        resized.save(target, optimize=True, compress_level=9)
    else:
        extension, mime = 'jpg', 'image/jpeg'
        target = destination / f'{index}.{extension}'
        resized.save(target, quality=92, subsampling=0, optimize=True)
    report.append({
        'index': index, 'file': str(target), 'mimeType': mime,
        'sourceSize': list(original.size), 'size': list(resized.size),
        'sourceBytes': len(data), 'bytes': target.stat().st_size,
        'normalVectorsRenormalized': is_normal,
    })
print(json.dumps(report))
