"""Extract photographed non-lacquer ornament into a separate reviewed proposal.
Run with PYTHONPATH=/tmp/jingchu-rubbing-deps python3 scripts/prepare-other-expansion-20261018.py.
No inpainting, reconstruction, or drawing of new historical lines is performed.
"""
from pathlib import Path
import json, hashlib
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[1];D=ROOT/'dist';OUT=ROOT.parent/'output/rubbing-other-expansion-20261018';OUT.mkdir(parents=True,exist_ok=True)
A={a['id']:a for a in json.loads((D/'data/artifacts.json').read_text())}
configs=[
 dict(id='jz-351-phoenix-expand-20261018',objectId='jz-351',motif='凤鸟',label='罐腹凤鸟与缠枝纹',rect=[.234,.52,.418,.246],method='ceramic',note='从罐腹中央提取凤鸟的颈、翼羽、回旋长尾及周围缠枝；不包含罐体外轮廓。'),
 dict(id='jz-351-scroll-expand-20261018',objectId='jz-351',motif='几何',label='罐肩下缘连续卷曲纹带',rect=[.265,.459,.386,.041],method='ceramic',note='罐肩下缘独立环带中的连续卷曲装饰，和腹部凤鸟、花枝区分；保留原曲面透视。'),
 dict(id='chu-manuscript-curl-expand-20261018',objectId='chu-silk-manuscript',motif='人像',label='帛书摹本上边卷尾神异图像',photo='assets/chu-silk-manuscript-book.png',rect=[.145,.014,.15,.14],method='manuscript',note='提取书内摹本上边左侧的红黑神异形象；这是摹本绘画线条，非出土原帛的实物拓片。',polygon=[[.24,.11],[.4,.02],[.58,.15],[.7,.15],[.8,.48],[.96,.48],[1,.68],[.88,.84],[.57,.93],[.29,.82],[.02,.84],[0,.61],[.32,.64],[.49,.49]]),
 dict(id='chu-manuscript-horns-expand-20261018',objectId='chu-silk-manuscript',motif='人像',label='帛书摹本上边展开双臂图像',photo='assets/chu-silk-manuscript-book.png',rect=[.637,.043,.172,.13],method='manuscript',note='提取书内摹本上边右侧展开双臂的神异形象；保留躯干及双臂的红黑线条，不补画身份与细节。',polygon=[[0,.34],[.12,.16],[.3,.20],[.39,0],[.62,0],[.70,.19],[.87,.19],[1,.34],[.91,.48],[.67,.44],[.63,.66],[.75,.78],[.87,.73],[.93,.95],[.64,.98],[.51,.81],[.37,.98],[.14,.98],[.07,.78],[.31,.78],[.38,.60],[.34,.46],[.1,.5]]),
 dict(id='chu-manuscript-longtail-expand-20261018',objectId='chu-silk-manuscript',motif='人像',label='帛书摹本左边长尾神异图像',photo='assets/chu-silk-manuscript-book.png',rect=[.028,.687,.176,.125],method='manuscript',note='提取书内摹本左下边的长尾神异形象；与上边卷尾、展开双臂形象属于不同图像单元。',polygon=[[0,.18],[.32,0],[.66,.05],[.66,.38],[.98,.42],[1,.69],[.79,.82],[.67,.74],[.63,.93],[.29,.88],[.09,.75],[0,.50]]),
]
# Only these five passed side-by-side visual inspection. Rejected trials stay
# in the external QA folder and never re-enter the shipped library on rerun.
accepted_ids={'jz-351-phoenix-expand-20261018','jz-351-scroll-expand-20261018','chu-manuscript-curl-expand-20261018','chu-manuscript-horns-expand-20261018','chu-manuscript-longtail-expand-20261018'}
configs=[c for c in configs if c['id'] in accepted_ids]
for c in configs:
 if c['id']=='chu-manuscript-horns-expand-20261018':
  c['polygon']=[[.37,.05],[.75,.05],[.75,.38],[.88,.38],[.88,.56],[.77,.58],[.81,.72],[.76,.80],[.42,.83],[.37,.76],[.38,.65],[.32,.70],[.28,.61],[.24,.60],[.24,.49],[.43,.48],[.44,.37],[.37,.36]]
  c['keepLargest']=1
 if c['id']=='chu-manuscript-longtail-expand-20261018':c['keepLargest']=1
entries=[];details=[];previews=[]
for c in configs:
 a=A[c['objectId']];photo=c.get('photo',a['displayImage']);path=D/photo;im=Image.open(path).convert('RGBA');w,h=im.size;x,y,rw,rh=c['rect'];crop=im.crop((round(x*w),round(y*h),round((x+rw)*w),round((y+rh)*h)))
 rgb=np.array(crop)[:,:,:3];gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY);valid=np.array(crop)[:,:,3]>220
 if c['method']=='manuscript':
  mask=np.uint8(gray<170)*255
 elif c['method']=='textile':
  smooth=cv2.bilateralFilter(gray,5,30,30);mask=cv2.adaptiveThreshold(smooth,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY_INV,21,8)
 elif c['method']=='sword':
  smooth=cv2.bilateralFilter(gray,5,35,35);mask=cv2.adaptiveThreshold(smooth,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY_INV,25,5)
 else:
  smooth=cv2.GaussianBlur(gray,(3,3),.3);mask=cv2.adaptiveThreshold(smooth,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY_INV,41,2)
 if c.get('polygon'):
  region=np.zeros_like(mask);cv2.fillPoly(region,[np.array([[round(px*crop.width),round(py*crop.height)] for px,py in c['polygon']],np.int32)],255);mask[region==0]=0
 mask[~valid]=0;mask[:1]=0;mask[-1:]=0;mask[:,:1]=0;mask[:,-1:]=0
 n,labels,stats,_=cv2.connectedComponentsWithStats(mask,8);clean=np.zeros_like(mask)
 for i in range(1,n):
  if stats[i,cv2.CC_STAT_AREA]>=max(4,min(crop.size)*.07):clean[labels==i]=255
 if c.get('keepLargest'):
  keep=np.argsort(stats[1:,cv2.CC_STAT_AREA])[::-1][:c['keepLargest']]+1
  clean=np.uint8(np.isin(labels,keep))*255
 # Line outline from the measured pigment mask; no inferred connecting strokes.
 factor=720/max(clean.shape);target=np.zeros((round(clean.shape[0]*factor),round(clean.shape[1]*factor)),np.uint8)
 contours,_=cv2.findContours(clean,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE);curves=[]
 for curve in contours:
  points=cv2.approxPolyDP(curve,.3,True).reshape(-1,2).astype(float)
  if len(points)<3:continue
  for _ in range(2):
   following=np.roll(points,-1,axis=0);points=np.stack((points*.75+following*.25,points*.25+following*.75),axis=1).reshape(-1,2)
  curves.append(np.round(points*factor).astype(np.int32).reshape(-1,1,2))
 cv2.drawContours(target,curves,-1,255,cv2.FILLED,lineType=cv2.LINE_AA)
 if c['method']=='manuscript':
  target=cv2.morphologyEx(target,cv2.MORPH_GRADIENT,np.ones((8,8),np.uint8))
  # Also preserve the actual red/black pigment boundary within each drawing.
  f=rgb.astype(float);red=np.uint8((f[:,:,0]-np.maximum(f[:,:,1],f[:,:,2])>35)&(f[:,:,0]>100))*255
  red[clean==0]=0
  outlines,_=cv2.findContours(red,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
  for curve in outlines:
   if cv2.arcLength(curve,True)<8:continue
   points=cv2.approxPolyDP(curve,.35,True).reshape(-1,2).astype(float)
   if len(points)<3:continue
   for _ in range(3):
    following=np.roll(points,-1,axis=0);points=np.stack((points*.75+following*.25,points*.25+following*.75),axis=1).reshape(-1,2)
   cv2.polylines(target,[np.round(points*factor).astype(np.int32)],True,255,3,cv2.LINE_AA)
 alpha=Image.fromarray(target).filter(ImageFilter.GaussianBlur(.4));out=Image.new('RGBA',(alpha.width+40,alpha.height+40),(237,228,212,0));ink=Image.new('RGBA',alpha.size,(237,228,212,0));ink.putalpha(alpha);out.alpha_composite(ink,(20,20));out.save(D/'rubbings'/(c['id']+'.png'))
 source=a['source'];photoSource=source
 if photo.startswith('assets/book/') or c['method']=='manuscript':photoSource='用户提供《荆楚有色：大江大湖间的符号、色彩与文化记忆》；PDF 第 '+('35 页，印刷第 29 页，图 2-1 摹本配图' if c['method']=='manuscript' else '73 页，印刷第 67 页')
 entry=dict(id=c['id'],objectId=a['id'],title=a['title'],motif=c['motif'],label=c['label'],note=c['note'],view='detail',rect=c['rect'],source=source,photo=photo,photoSource=photoSource,credit=a.get('imageCredit'),era=a['period'],material=a['materialGroup'],catalogueAdded=bool(a.get('catalogueReview')),available=True,kind='纹样拓影',surfaceVerified=True,evidence='馆方题名、书内图像及器表局部对照；只记录可见纹线',reviewed='2026-10-18',image='rubbings/'+c['id']+'.png',width=out.width,height=out.height,sourcePixels=list(crop.size),sourceSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),method='照片局部纹线/颜料分离、去除孤立颗粒、轮廓平滑；不补绘、不生成缺失细节，非实物拓片。',regionId='motif-'+c['id'])
 if c.get('polygon'):entry['sourcePolygon']=c['polygon']
 entry['qualityReview']={'reviewed':'2026-10-18','status':'retain','reason':'逐张对照原照片与新拓影：主体图案连续可辨；排除邻近文字、噪点与器物形制边缘。'}
 entries.append(entry);details.append(dict(objectId=a['id'],addMotif=c['motif'] if c['motif'] not in a['motifs'] else None,region=dict(id=entry['regionId'],dimension='motifs',value=c['motif'],rect=c['rect'],label=c['label'],note=c['note'],view='detail',basis=entry['evidence'],source=source,sourceImage=photo,rubbingEligible=True,rubbingMethod='reviewed-line-20261018',revision=6)))
 previews.append((entry,crop,out))
manifest=dict(reviewed='2026-10-18',entries=entries,detailUpdates=details)
(ROOT/'docs/rubbing-other-expansion-20261018.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',18)
for off in range(0,len(previews),6):
 sheet=Image.new('RGB',(1800,1300),'#242123');draw=ImageDraw.Draw(sheet)
 for i,(e,src,res) in enumerate(previews[off:off+6]):
  x=i%3*600;y=i//3*650
  for pic,dy in [(src,0),(res,290)]:
   scale=min(540/pic.width,270/pic.height);pic=pic.resize((int(pic.width*scale),int(pic.height*scale)),Image.Resampling.LANCZOS);sheet.paste(pic,(x+(600-pic.width)//2,y+dy),pic)
  draw.text((x+12,y+580),e['label'],font=font,fill='#eee');draw.text((x+12,y+610),e['id'],font=font,fill='#aaa')
 sheet.save(OUT/f'qa-{off}.jpg')
print(json.dumps({'candidates':len(entries),'output':str(OUT)},ensure_ascii=False))
