from pathlib import Path
import json,hashlib,colorsys
import numpy as np
from PIL import Image,ImageFilter
from photo_colors import color_name,summarize_colors
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'dist/data/artifacts.json').read_text());masks=json.loads((root/'docs/background-removal.json').read_text())
assert color_name((84,84,66))=='灰绿'
assert color_name((228,192,69))=='金黄'
details=json.loads((root/'dist/data/detail-regions.json').read_text())['artifacts']
checked_regions=0;lowest_coverage=1.0
for a in data:
 source=root/'dist'/a['image'];info=masks[a['id']]
 assert hashlib.sha256(source.read_bytes()).hexdigest()==info['sourceSha256'],a['id']+' original changed'
 cut=Image.open(root/'dist'/a['displayImage']).convert('RGBA')
 alpha=np.asarray(cut.getchannel('A'))
 assert alpha.max()==255 and alpha.min()==0,a['id']+' must have visible pixels and transparent background'
 # The circular detail lenses use cover-fit. Their central aperture must hit the object,
 # not a ring's hole, a gap between bells, or excess transparent crop padding.
 preview=cut.copy();preview.thumbnail((500,500));mask=np.asarray(preview.getchannel('A'))>64
 yy,xx=np.indices(mask.shape);width,height=preview.size
 for region in details[a['id']]:
  if region['view']=='unseen' or region['rect']==[0,0,1,1]:continue
  x,y,w,h=region['rect'];cx=(x+w/2)*width;cy=(y+h/2)*height;radius=min(w*width,h*height)/2
  aperture=(xx-cx)**2+(yy-cy)**2<=radius**2
  coverage=float(mask[aperture].mean());assert coverage>=.07,a['id']+' / '+region['id']+' detail lens falls on empty space'
  lowest_coverage=min(lowest_coverage,coverage);checked_regions+=1
 rgb=np.asarray(cut)[:,:,:3];original=np.asarray(Image.open(source).convert('RGB').crop(tuple(info['crop'])))
 assert np.array_equal(rgb[alpha==255],original[alpha==255]),a['id']+' visible colour changed'
 cut.thumbnail((220,220));valid=cut.getchannel('A').filter(ImageFilter.MinFilter(3))
 pixels=[p for p,m in zip(cut.convert('RGB').getdata(),valid.getdata()) if m>=250]
 assert summarize_colors(pixels)==a['palette'],a['id']+' stale or background-contaminated palette'
 assert set(a['colors'])=={p['name'] for p in a['palette']},a['id']+' documentary colour mixed into photo filter'
 for p in a['palette']:
  rgb=tuple(int(p['hex'][i:i+2],16) for i in (1,3,5));assert color_name(rgb)==p['name']
  if p['name']=='金黄':
   h,s,v=colorsys.rgb_to_hsv(*(c/255 for c in rgb));assert 40<=h*360<70 and s>=.50 and v>=.74
white=next(a for a in data if a['id']=='hb-5016')
assert any(p['name']=='灰白' and p['share']>70 for p in white['palette']),'White glaze must remain part of the object'
report={'records':len(data),'transparentForegrounds':len(data),'originalHashesUnchanged':True,'opaqueRGBUnchanged':True,'palettesMatchForeground':True,'goldBrightnessAndChromaChecked':True,'whiteGlazePreserved':True,'detailAperturesChecked':checked_regions,'minimumForegroundCoverage':round(lowest_coverage,3)}
(root/'docs/image-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
