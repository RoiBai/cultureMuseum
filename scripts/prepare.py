"""Rebuild photo palettes from the committed, reviewed foreground images.

The museum metadata in artifacts.json is the maintained source of truth.
This script needs no sibling repositories or network requests.
"""
from pathlib import Path
import json
from artifact_palette import measured_palette

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
path=DIST/'data/artifacts.json'
records=json.loads(path.read_text())
for artifact in records:
    artifact['palette']=measured_palette(artifact,DIST)
    if artifact.get('paletteSampleRect') is None:
        artifact['paletteMethod']='透明前景内采样；排除背景、半透明边缘与轮廓内侧 1 像素；色名综合色相、明度与饱和度判定'
    else:
        assert artifact.get('paletteMethod'),artifact['id']+' requires a documented sample region'
    artifact['colors']=[swatch['name'] for swatch in artifact['palette']]
path.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(f'Rebuilt reviewed-image palettes for {len(records)} records.')
