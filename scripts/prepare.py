"""Rebuild photo palettes from the committed, reviewed foreground images.

The museum metadata in artifacts.json is the maintained source of truth.
This script needs no sibling repositories or network requests.
"""
from pathlib import Path
import json
from PIL import Image, ImageFilter
from photo_colors import summarize_colors

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
path=DIST/'data/artifacts.json'
records=json.loads(path.read_text())
for artifact in records:
    photo=Image.open(DIST/artifact['displayImage']).convert('RGBA')
    photo.thumbnail((220,220))
    valid=photo.getchannel('A').filter(ImageFilter.MinFilter(3))
    pixels=[p for p,m in zip(photo.convert('RGB').getdata(),valid.getdata()) if m>=250]
    if not pixels:raise ValueError('No foreground samples: '+artifact['id'])
    artifact['palette']=summarize_colors(pixels)
    artifact['paletteMethod']='透明前景内采样；排除背景、半透明边缘与轮廓内侧 1 像素；色名综合色相、明度与饱和度判定'
    artifact['colors']=[swatch['name'] for swatch in artifact['palette']]
path.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(f'Rebuilt foreground-only photo palettes for {len(records)} records.')
