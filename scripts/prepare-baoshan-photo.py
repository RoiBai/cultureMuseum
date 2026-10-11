"""Upgrade Baoshan photography, changing background alpha only (not RGB)."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artifact_palette import measured_palette

ROOT=Path(__file__).resolve().parents[1]; DIST=ROOT/'dist'
source='assets/hb-6914-object-cccsingapore.png'
photo=Image.open(DIST/source).convert('RGB'); rgb=np.asarray(photo)
white=(rgb.min(axis=2)>222)&(rgb.max(axis=2).astype(int)-rgb.min(axis=2)<25)
flood=Image.fromarray(np.where(white,255,0).astype('uint8')).copy()
for seed in [(0,0),(photo.width-1,0),(0,photo.height-1),(photo.width-1,photo.height-1)]:
    if flood.getpixel(seed)==255: ImageDraw.floodfill(flood,seed,128)
hard=Image.fromarray(np.where(np.asarray(flood)==128,0,255).astype('uint8'))
alpha=hard.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.35))
dest='cutouts/hb-6914-cccsingapore.webp'; mask='cutouts/hb-6914-cccsingapore-mask.png'
rgba=photo.convert('RGBA');rgba.putalpha(alpha)
rgba.save(DIST/dest,'WEBP',lossless=True,exact=True,method=6);alpha.save(DIST/mask)
records=json.loads((DIST/'data/artifacts.json').read_text());a=next(a for a in records if a['id']=='hb-6914')
a.update(image=source,displayImage=dest,displayForeground=True,mask=mask,backgroundRemoval='reviewed-baoshan-alpha-v2',imageKind='实物照片 · 新加坡中国文化中心')
a['imageCredit']={'author':'原文未单独署摄影者','provider':'新加坡中国文化中心《博物馆说》；资料鸣谢湖北省博物馆、文旅之声','page':'https://cccsingapore.org/2023/08/2107/','changes':'保留1080×720原始照片；展示副本仅去除白色摄影背景，器物RGB未改变，未AI补画。','retrieved':'2026-10-11'}
a['dateNote']='战国；馆方记载1987年包山楚墓出土。完整照片据新加坡中国文化中心《博物馆说》；书内图3-2及原馆方局部图继续保留。'
a['observation']='完整实物照片保留盖沿破损及器壁连续叙事；页面另列分段展开资料，便于观察柳树、人物与车马。'
a['paletteNote']='色谱取自新版实物照片的透明前景，不含白色摄影背景；受光照与保存状况影响。'
a['palette']=measured_palette(a,DIST);a['colors']=[c['name'] for c in a['palette']]
a['detailGallery']=[{'image':'assets/hb-6914-unwrapped-cccsingapore.png','title':'器壁漆画分段展开','source':'https://cccsingapore.org/2023/08/2107/','credit':'新加坡中国文化中心《博物馆说》；资料鸣谢湖北省博物馆、文旅之声','width':640,'height':877}]
a['highResolutionOriginal']='https://cccsingapore.org/wp-content/uploads/2023/11/image-419.png'
(DIST/'data/artifacts.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
report=json.loads((ROOT/'docs/background-removal.json').read_text());report[a['id']]={'source':source,'sourceSha256':hashlib.sha256((DIST/source).read_bytes()).hexdigest(),'status':'foreground-ready','displayImage':dest,'method':a['backgroundRemoval'],'mask':mask,'crop':[0,0,*photo.size],'removedFraction':round(float((np.asarray(alpha)==0).mean()),4),'imageRepresentation':'object-photo'}
(ROOT/'docs/background-removal.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
regions=json.loads((DIST/'data/detail-regions.json').read_text())
rects={'motif-车马':[.37,.57,.38,.22],'craft-彩绘':[.21,.14,.59,.30],'surface':[.15,.48,.70,.30]}
for r in regions['artifacts'][a['id']]:
    if r['id'] in rects:r['rect']=rects[r['id']]
    r['source']='https://cccsingapore.org/2023/08/2107/';r['revision']=3
    if r['id']=='craft-彩绘':r['note']='观察盖面回旋图形与环带，实物照片保留原有缺损；未补绘。'
    if r['id'] in ['surface','form']:r['basis']='新加坡中国文化中心实物照片观察'
(DIST/'data/detail-regions.json').write_text(json.dumps(regions,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'id':a['id'],'sourceSize':photo.size,'displayImage':dest,'palette':a['palette']},ensure_ascii=False))
