"""Generate RGBA display copies and a provenance report; source files are immutable.
Requires Pillow, numpy, OpenCV (the latter only when regenerating cutouts).
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from foreground_masks import segment,legacy_alpha

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist';(DIST/'cutouts').mkdir(exist_ok=True)
data_path=DIST/'data/artifacts.json'
records=json.loads(data_path.read_text());report={};previews=[]
for a in records:
 source=DIST/a['image'];photo=Image.open(source).convert('RGB')
 source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
 if a.get('displayForeground'):
  alpha=legacy_alpha(a,photo,DIST);method='existing-reviewed-alpha'
 elif a['id']=='hb-6914':
  # This is a close-up of the lacquer surface, not an object on a black backdrop.
  # The added red frame is outside the photographed surface.
  alpha=Image.new('L',photo.size);ImageDraw.Draw(alpha).rectangle((0,26,699,570),fill=255);method='surface-detail-crop'
 else:
  alpha=segment(photo,a['id']);method='edge-seeded-grabcut-v2'
  # Keep a very narrow antialiased boundary; never recolour retained pixels.
  hard=np.asarray(alpha);soft=np.asarray(alpha.filter(ImageFilter.GaussianBlur(.35)))
  alpha=Image.fromarray(np.where(hard==0,0,soft).astype('uint8'))
 if not alpha.getbbox():raise ValueError(f'Empty foreground: {a["id"]}')
 rgba=photo.convert('RGBA');rgba.putalpha(alpha)
 left,top,right,bottom=alpha.getbbox();w,h=photo.size
 box=(max(0,left-3),max(0,top-3),min(w,right+3),min(h,bottom+3));rgba=rgba.crop(box)
 dest=a.get('displayImage') or f'cutouts/{a["id"]}.webp';rgba.save(DIST/dest,'WEBP',lossless=True,method=4)
 a['displayImage']=dest;a['backgroundRemoval']=method
 report[a['id']]={'source':a['image'],'sourceSha256':source_hash,'status':'foreground-ready','displayImage':dest,'method':method,'crop':list(box),'removedFraction':round(float((np.asarray(alpha)==0).mean()),4)}
 assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
 if not a.get('displayForeground'):
  pair=Image.new('RGB',(280,160),'#b9ac8f');original=photo.copy();original.thumbnail((130,130));pair.paste(original,((140-original.width)//2,(135-original.height)//2))
  thumb=rgba.copy();thumb.thumbnail((130,130));pair.paste(thumb,(140+(140-thumb.width)//2,(135-thumb.height)//2),thumb);ImageDraw.Draw(pair).text((8,142),a['id'],fill='#24221e');previews.append(pair)

data_path.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/background-removal.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for page in range((len(previews)+23)//24):
 batch=previews[page*24:(page+1)*24];sheet=Image.new('RGB',(1120,160*((len(batch)+3)//4)),'#b9ac8f')
 for i,preview in enumerate(batch):sheet.paste(preview,((i%4)*280,(i//4)*160))
 sheet.save(ROOT/f'docs/cutout-review-{page+1}.jpg',quality=90)
print(json.dumps({'foregroundCopies':len(report),'originalsUnchanged':True}))
