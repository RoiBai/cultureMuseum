"""Prepare a reviewed candidate manifest, without mutating the live rubbing library.
Requires Pillow, NumPy and OpenCV. This extracts photographed surface lines only;
there is no hand drawing, generative reconstruction or completion of missing marks.
"""
from pathlib import Path
import json, hashlib
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[1]; D=ROOT/'dist'; OUT=ROOT.parent/'output/rubbing-additions-20261018'
OUT.mkdir(parents=True,exist_ok=True)
A={a['id']:a for a in json.loads((D/'data/artifacts.json').read_text())}
configs=[
 dict(id='hb-5537-phoenix-line-20261018',objectId='hb-5537',motif='凤鸟',label='漆卮器壁变形凤鸟纹',rect=[.08867,.20,.46305,.16279],method='pigment-outline',note='重新提取器壁上部凤鸟纹的头部、回旋躯体与尾端线条，未加入漆卮器形轮廓。',replaces='hb-5537-surface-phoenix'),
 dict(id='hb-5458-wave-line-20261018',objectId='hb-5458',motif='几何',label='漆圆盒器腹波折纹带',rect=[.32468,.65158,.24242,.08145],method='pigment-line',componentRule='excludeTopBand',note='器腹红漆连续波折线及点饰，保留器表弧度；明确可见的几何纹带，不作凤鸟纹推断。',replaces='hb-5458-surface-geometry'),
 dict(id='jz-470-cloud-line-20261018',objectId='jz-470',motif='云气',label='玉佩器表卷云刻线',rect=[.20,.592,.11,.052],method='incised',note='仅取玉佩器表的一组卷云刻线，不把龙凤透雕的整体外形作为纹样。'),
 dict(id='hb-6914-horses-line-20261018',objectId='hb-6914',motif='车马',label='漆画中的并行双马',photo='assets/hb-6914-unwrapped-cccsingapore.png',rect=[.675,.055,.19,.116],method='edge',note='从漆奁器壁展开图中提取两匹马的彩绘线条；保留叠置关系、腿部与缰绳，不补绘磨损。'),
 dict(id='hb-6914-carriage-line-20261018',objectId='hb-6914',motif='车马',label='漆画中的马车与御者',photo='assets/hb-6914-unwrapped-cccsingapore.png',rect=[.32,.438,.34,.129],method='edge',note='取展开图的乘车画段，保留马、车轮、人物之间的相对关系；是器表绘画局部，不是器物轮廓。'),
 dict(id='hb-6914-figure-line-20261018',objectId='hb-6914',motif='车马',label='迎宾画段的长衣人物',photo='assets/hb-6914-unwrapped-cccsingapore.png',rect=[.52,.675,.09,.09],method='edge',note='从迎宾画段提取长衣人物的彩绘轮廓与衣襟，保留原画残损；归入车马出行叙事画。'),
 dict(id='jz-353-fourleaf-line-20261018',objectId='jz-353',motif='花卉',label='耳杯内底四叶纹',rect=[.31,.34,.38,.36],method='paint',polygon=[[.24,0],[.80,0],[.84,.20],[.90,.36],[.86,.57],[.73,.65],[.68,.90],[.40,.94],[.18,.84],[.20,.66],[.12,.52],[.14,.29],[.22,.20]],note='重新从高清馆藏照片分离四叶纹的外缘、花心与叶内小圆纹；周围鱼纹不并入，未补绘反光遮蔽处。',replaces='jz-353-2'),
]
entries=[];regions=[];previews=[]
for c in configs:
 a=A[c['objectId']];photo=c.get('photo',a['displayImage']);path=D/photo
 im=Image.open(path).convert('RGBA');w,h=im.size;x,y,rw,rh=c['rect'];bounds=[round(x*w),round(y*h),round((x+rw)*w),round((y+rh)*h)]
 crop=im.crop(bounds); original_size=list(crop.size); work=crop.copy();work.thumbnail((600,600))
 rgb=np.array(work)[:,:,:3];gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY);valid=np.array(work)[:,:,3]>220
 if c['method']=='incised':
  mask=cv2.adaptiveThreshold(cv2.GaussianBlur(gray,(5,5),0),255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY_INV,41,4)
  mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
 elif c['method'].startswith('pigment'):
  f=rgb.astype(float);r,g,b=f[:,:,0],f[:,:,1],f[:,:,2]
  mask=np.uint8((r-np.maximum(g,b)>15)&(r>60))*255
 else:
  # Smooth compression/photographic texture before detecting actual line edges.
  smooth=cv2.bilateralFilter(gray,5,30,30);mask=cv2.Canny(smooth,30,60)
  if c['method']=='paint':
   f=rgb.astype(float);r,g,b=f[:,:,0],f[:,:,1],f[:,:,2]
   pigment=np.uint8((r-np.minimum(g,b)>12)&(r>60))*255
   pigment=cv2.medianBlur(pigment,3);pigment=cv2.morphologyEx(pigment,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
   contour,_=cv2.findContours(pigment,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
   for curve in contour:
    if cv2.arcLength(curve,True)>min(work.size)*.13:cv2.drawContours(mask,[cv2.approxPolyDP(curve,.55,True)],-1,255,1,lineType=cv2.LINE_AA)
   # Preserve only edges adjacent to real painted pigment, not reflected light.
   nearby=cv2.dilate(pigment,np.ones((3,3),np.uint8));mask[nearby==0]=0
 if c.get('polygon'):
  region=np.zeros_like(mask);cv2.fillPoly(region,[np.array([[round(px*work.width),round(py*work.height)] for px,py in c['polygon']],np.int32)],255);mask[region==0]=0
 mask[~valid]=0;mask[:1]=0;mask[-1:]=0;mask[:,:1]=0;mask[:,-1:]=0
 # Suppress isolated photographic flecks, preserving all meaningful connected strokes.
 n,labels,stats,_=cv2.connectedComponentsWithStats(mask,8);clean=np.zeros_like(mask)
 for i in range(1,n):
  if c.get('componentRule')=='excludeTopBand' and stats[i,cv2.CC_STAT_TOP]+stats[i,cv2.CC_STAT_HEIGHT]/2<work.height*.22:continue
  if stats[i,cv2.CC_STAT_AREA]>=max(6,min(work.size)*.045):clean[labels==i]=255
 if c['method']=='paint':clean=cv2.dilate(clean,np.ones((2,2),np.uint8))
 # Smooth traced pixel contours without generating or joining absent lines.
 factor=720/max(clean.shape);target=np.zeros((round(clean.shape[0]*factor),round(clean.shape[1]*factor)),np.uint8)
 contours,_=cv2.findContours(clean,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE);smooth_curves=[]
 for curve in contours:
  points=cv2.approxPolyDP(curve,.35,True).reshape(-1,2).astype(float)
  if len(points)<3:continue
  for _ in range(3):
   following=np.roll(points,-1,axis=0);points=np.stack((points*.75+following*.25,points*.25+following*.75),axis=1).reshape(-1,2)
  smooth_curves.append(np.round(points*factor).astype(np.int32).reshape(-1,1,2))
 cv2.drawContours(target,smooth_curves,-1,255,cv2.FILLED,lineType=cv2.LINE_AA)
 if c['method']=='edge':target=cv2.dilate(target,np.ones((3,3),np.uint8))
 if c['method']=='pigment-outline':target=cv2.morphologyEx(target,cv2.MORPH_GRADIENT,np.ones((4,4),np.uint8))
 alpha=Image.fromarray(target).filter(ImageFilter.GaussianBlur(.45))
 alpha=alpha.point(lambda v: min(255,round(v*1.2)))
 result=Image.new('RGBA',(alpha.width+40,alpha.height+40),(237,228,212,0));ink=Image.new('RGBA',alpha.size,(237,228,212,0));ink.putalpha(alpha);result.alpha_composite(ink,(20,20))
 result.save(D/'rubbings'/(c['id']+'.png'),optimize=True)
 basis='馆方记述与照片局部对照' if c['objectId']!='jz-470' else '高清照片观察：器表可见连续卷云刻线；与龙凤形制分开记录'
 source=a['source'];photoSource='https://cccsingapore.org/2023/08/2107/' if c['objectId']=='hb-6914' else a.get('imageCredit',{}).get('page',source)
 method='馆藏照片局部线纹分离、去除孤立噪点与平滑边缘；仅保留可见线条，不补绘、不重构缺失纹样；非实物拓片。'
 e=dict(id=c['id'],objectId=a['id'],title=a['title'],motif=c['motif'],label=c['label'],note=c['note'],view='detail',rect=c['rect'],source=source,photo=photo,photoSource=photoSource,credit=a.get('imageCredit'),era=a['period'],material=a['materialGroup'],catalogueAdded=bool(a.get('catalogueReview')),available=True,kind='纹样拓影',surfaceVerified=True,evidence=basis,reviewed='2026-10-18',image='rubbings/'+c['id']+'.png',width=result.width,height=result.height,sourcePixels=original_size,sourceSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),method=method,qualityReview='逐张对照原图核验；线纹可辨，去除器物外轮廓及相邻无关图案。',regionId='motif-'+c['id'])
 if c.get('polygon'):e['sourcePolygon']=c['polygon']
 if c.get('replaces'):e['replaces']=c['replaces']
 entries.append(e)
 r=dict(id=e['regionId'],dimension='motifs',value=c['motif'],rect=c['rect'],label=c['label'],note=c['note'],view='detail',basis=basis,source=source,sourceImage=photo,rubbingEligible=True,rubbingMethod='reviewed-line-20261018',revision=5)
 if c.get('polygon'):r['sourcePolygon']=c['polygon']
 regions.append(dict(objectId=a['id'],region=r,addMotif=c['motif'] if c['motif'] not in a['motifs'] else None))
 previews.append((e,crop,result))
manifest=dict(reviewed='2026-10-18',method='现有馆藏照片器表纹饰再提取；先核实照片中的具体线条，再作局部分离。',entries=entries,detailUpdates=regions)
(OUT/'candidates.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',18)
for offset in range(0,len(previews),6):
 sheet=Image.new('RGB',(1800,1300),'#242123');draw=ImageDraw.Draw(sheet)
 for i,(e,crop,result) in enumerate(previews[offset:offset+6]):
  x=i%3*600;y=i//3*650
  for pic,dy in [(crop,0),(result,290)]:
   pic=pic.copy();scale=min(540/pic.width,270/pic.height);pic=pic.resize((int(pic.width*scale),int(pic.height*scale)),Image.Resampling.LANCZOS);sheet.paste(pic,(x+(600-pic.width)//2,y+dy),pic)
  draw.text((x+15,y+578),e['label'],font=font,fill='#eee');draw.text((x+15,y+608),e['id'],font=font,fill='#baaba3')
 sheet.save(OUT/f'final-review-{offset}.jpg')
print(json.dumps({'candidateCount':len(entries),'objects':len(set(e['objectId'] for e in entries)),'manifest':str(OUT/'candidates.json')},ensure_ascii=False))
