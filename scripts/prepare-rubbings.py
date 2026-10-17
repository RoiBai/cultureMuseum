"""Extract reviewed *surface decoration*, never the silhouette of an object.
Run audit-patterns-20261011.py first. Existing reviewed assets are retained;
new crops use photographed lines only and carry their exact ROI and source.
"""
from pathlib import Path
import json,hashlib
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from rubbing_quality import reviewed_entry,preserve_reviewed
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'dist';OUT=D/'rubbings';OUT.mkdir(exist_ok=True)
a=json.loads((D/'data/artifacts.json').read_text());details=json.loads((D/'data/detail-regions.json').read_text())['artifacts'];old=json.loads((D/'data/rubbings.json').read_text())['entries']
quality_path=D/'data/rubbing-quality-review.json'
reviews={e['id']:e for e in json.loads(quality_path.read_text())['entries']} if quality_path.exists() else {}
previous_by_id={e['id']:e for e in old}
old_by={}
for e in old:old_by[(e['objectId'],e['motif'])]=e
for id in ['jz-458','hb-4988','hb-6173','hb-6174','jz-354']:
 if (id,'云雷') in old_by:old_by[(id,'云气')]=old_by[(id,'云雷')]
slug={'凤鸟':'phoenix','禽鸟':'bird','龙蛇':'dragon','虎豹':'tiger','虎兽':'beast','花卉':'floral','云气':'cloud','云雷':'thunder','几何':'geometry','铭文':'inscription','人像':'figure','车马':'carriage','鱼纹':'fish','兽面':'mask'}
entries=[];new_assets=[];used=set()
for o in a:
 for r in details[o['id']]:
  if r['dimension']!='motifs':continue
  prior=old_by.get((o['id'],r['value']));rid=prior['id'] if prior else o['id']+'-surface-'+slug.get(r['value'],hashlib.sha1(r['value'].encode()).hexdigest()[:8])
  if rid in used:continue
  used.add(rid)
  # A photograph's eligibility is not proof that its extracted lines are legible.
  # Preserve the reviewed image (or withdrawal) before any file can be overwritten.
  if rid in reviews and rid in previous_by_id:
   entries.append(reviewed_entry(previous_by_id[rid],reviews[rid]));continue
  ready=bool(r.get('rubbingEligible')) and r['view']=='detail'
  e={'id':rid,'objectId':o['id'],'title':o['title'],'motif':r['value'],'label':r['label'],'note':r['note'],'view':r['view'],'rect':r['rect'],'source':o['source'],'photo':o['displayImage'],'credit':o.get('imageCredit'),'era':o['period'],'material':o['materialGroup'],'catalogueAdded':bool(o.get('catalogueReview')),'available':ready,'kind':'纹样拓影' if ready else '仅有纹饰记录','surfaceVerified':True,'evidence':r['basis'],'reviewed':'2026-10-11'}
  if not ready:e['unavailableReason']=r.get('rubbingReason','当前照片无法独立辨认该纹饰。');entries.append(e);continue
  # Preserve existing reviewed details; never rerender the previously reviewed collection.
  if prior and prior.get('available') and prior.get('image') and not r.get('rubbingMethod') and prior['view']=='detail':
   for k in ['image','width','height','sourceSHA256','method']:e[k]=prior.get(k)
   e['reviewed']='2026-10-11';entries.append(e);continue
  im=Image.open(D/o['displayImage']).convert('RGBA');w,h=im.size;x,y,rw,rh=r['rect'];crop=im.crop((round(x*w),round(y*h),round((x+rw)*w),round((y+rh)*h)))
  px=np.array(crop);rgb=px[:,:,:3];valid=px[:,:,3]>220;valid=cv2.erode(np.uint8(valid),np.ones((3,3),np.uint8))>0
  gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY);method=r.get('rubbingMethod','line')
  if method in ['pigment','blue','dark']:
   f=rgb.astype(float);red,green,blue=f[:,:,0],f[:,:,1],f[:,:,2]
   pigment=((red-np.maximum(green,blue)>12)&(red>45)) if method=='pigment' else ((blue-red>9)&(blue>green*.98)&(red<180))
   if method=='dark':pigment=(np.max(f,axis=2)<95)
   ink=np.uint8(pigment&valid)*255
   ink=cv2.morphologyEx(ink,cv2.MORPH_CLOSE,np.ones((2,2),np.uint8))
   # Keep real narrow pigment strokes; outline broad pigment fields rather than fill.
   distance=cv2.distanceTransform(ink,cv2.DIST_L2,3);ink[distance>1.8]=0
  else:
   smooth=cv2.bilateralFilter(gray,5,23,23);smooth=cv2.createCLAHE(clipLimit=1.7,tileGridSize=(4,4)).apply(smooth)
   ink=cv2.Canny(smooth,45,100)
  # Exclude crop and object edges, which are not decorative lines.
  ink[~valid]=0;ink[:2]=0;ink[-2:]=0;ink[:,:2]=0;ink[:,-2:]=0
  n,labels,stats,_=cv2.connectedComponentsWithStats(ink,8);clean=np.zeros_like(ink)
  for i in range(1,n):
   if stats[i,cv2.CC_STAT_AREA]>=max(4,min(crop.size)*.06):clean[labels==i]=255
  if np.count_nonzero(clean)<18:
   e.update(available=False,kind='仅有纹饰记录',unavailableReason='当前照片局部的可分离纹样线条不足，未生成拓影。');entries.append(e);continue
  # High-resolution display smooths pixel steps only; it does not synthesize detail.
  mask=Image.fromarray(clean);factor=min(8,800/max(mask.size));mask=mask.resize((max(1,round(mask.width*factor)),max(1,round(mask.height*factor))),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(.8))
  mask=mask.point(lambda p: min(255,round(p*1.4)))
  out=Image.new('RGBA',(mask.width+24,mask.height+24),(237,228,212,0));paint=Image.new('RGBA',mask.size,(237,228,212,0));paint.putalpha(mask);out.alpha_composite(paint,(12,12));out.save(OUT/(rid+'.png'),optimize=True)
  e.update(image='rubbings/'+rid+'.png',width=out.width,height=out.height,sourcePixels=list(crop.size),sourceSHA256=hashlib.sha256((D/o['displayImage']).read_bytes()).hexdigest(),method='馆藏照片局部裁切；'+({'pigment':'彩绘色区分离与窄线提取','blue':'青花色区分离与窄线提取','dark':'深色绘画线条分离','line':'去噪后提取器表刻线/纹饰边缘'}[method])+'；排除器物轮廓，不补绘缺线，非实物拓片。')
  entries.append(e);new_assets.append((e,crop,out))
entries=preserve_reviewed(entries,old,reviews,{o['id'] for o in a})
manifest={'version':2,'description':'只提供已核对、在照片中可辨认的器表纹饰数字拓影；不把动物、人物或器物的整体轮廓当作纹样。非实物拓片。','entries':entries}
(D/'data/rubbings.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',13)
for offset in range(0,len(new_assets),15):
 sheet=Image.new('RGB',(1400,1100),'#211c21');draw=ImageDraw.Draw(sheet)
 for i,(e,src,res) in enumerate(new_assets[offset:offset+15]):
  x=i%5*280;y=i//5*365
  for img,dy in [(src,0),(res,170)]:
   img=img.copy();img.thumbnail((260,150));sheet.paste(img,(x+(280-img.width)//2,y+dy),img)
  draw.text((x+5,y+324),e['objectId']+' '+e['label'],font=font,fill='#eee')
 sheet.save('/tmp/motif-review/extracted-'+str(offset)+'.png')
print(json.dumps({'records':len(entries),'ready':sum(e['available'] for e in entries),'newAssets':len(new_assets),'newObjects':len({e['objectId'] for e,_s,_o in new_assets})},ensure_ascii=False))
