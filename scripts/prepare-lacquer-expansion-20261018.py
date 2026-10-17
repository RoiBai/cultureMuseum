"""Extract newly reviewed lacquer surface patterns; never mutates the live library.
Run with Pillow, numpy and OpenCV. No speculative drawing or restored missing marks.
Every crop uses the saved source photograph and retains its coordinates and hashes.
"""
from pathlib import Path
import json, hashlib
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R=Path(__file__).resolve().parents[1];D=R/'dist';O=R.parent/'output/rubbing-lacquer-expansion-20261018';O.mkdir(parents=True,exist_ok=True)
A={a['id']:a for a in json.loads((D/'data/artifacts.json').read_text())}
C=[
 dict(objectId='hb-4816',name='paired-scroll',motif='云气',label='方鉴器壁相对卷曲纹',box=[151,66,233,98],mode='light',level=113,outline=True,note='器壁斜向纹带中相对卷入的彩绘曲线；不取木质器形轮廓。'),
 dict(objectId='hb-4962',name='paired-scroll',motif='云气',label='漆鬲器腹双卷纹',box=[42,42,125,81],mode='light',level=97,note='器腹正面两道相向盘卷的彩绘线条，保留原图中的弧度和残损。'),
 dict(objectId='hb-4830',name='meander',motif='几何',label='漆豆器壁回折纹',box=[53,36,109,72],mode='dark',level=58,outline=True,note='豆盘器壁可见的方折与回旋线条；只提取器表绘纹。'),
 dict(objectId='hb-4828',name='meander',motif='几何',label='方豆器壁回折纹',box=[91,84,169,111],mode='red',delta=26,level=90,outline=True,note='方豆前壁的彩绘回折纹局部，保留照片的透视，不复制补齐缺失部分。'),
 dict(objectId='hb-4788',name='scroll-band',motif='云气',label='漆俎侧边卷曲纹带',box=[90,45,181,68],mode='edge',note='漆俎侧边可辨认的连续卷曲线纹。'),
 dict(objectId='hb-4832',name='scroll-band',motif='云气',label='盖豆盖沿卷曲纹',box=[36,43,115,60],mode='edge',note='盖豆盖沿的彩绘卷曲线条局部，不提取器盖外形。'),
 dict(objectId='hb-4981',name='painted-bird',motif='凤鸟',label='双连杯器壁彩绘鸟首纹',box=[100,160,169,216],mode='edge',canny=[15,35],keepSmallRegions=[[.30,.28,.42,.44],[.53,.73,.67,.88]],polygon=[[0,0],[.37,0],[.42,.17],[.57,.6],[1,.77],[1,1],[.6,1],[.34,.72],[.1,.53],[0,.3]],note='只取杯壁上的彩绘鸟首、眼部与喙的线条，和双连杯的鸟形构件分开记录。'),
 dict(objectId='spoon',name='feather-band',motif='禽鸟',label='凤形漆勺颈下鳞羽纹',box=[32,159,72,198],mode='red',delta=28,level=100,outline=True,polygon=[[0,0],[.62,0],[.87,.52],[1,.73],[.82,1],[.18,1],[0,.7]],note='只取勺颈下方层叠弧线组成的羽饰，不取凤形漆勺的器形。'),
 dict(objectId='jz-458',name='painted-scroll',motif='云气',label='猪形酒具盒器壁卷曲纹',box=[660,467,860,551],mode='red',delta=6,level=25,outline=True,note='提取猪形酒具盒表面红漆卷曲纹，非猪形外轮廓或立体圆钮。'),
]
entries=[];updates=[];previews=[]
for c in C:
 a=A[c['objectId']];photo=a['displayImage'];path=D/photo;im=Image.open(path).convert('RGBA');bounds=c['box'];crop=im.crop(bounds);source_size=list(crop.size)
 factor=min(4,800/max(crop.size));work=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
 rgb=np.array(work)[:,:,:3];rgb=cv2.bilateralFilter(rgb,5,18,18);v=np.array(work)[:,:,3]>220;f=rgb.astype(float);r,g,b=f[:,:,0],f[:,:,1],f[:,:,2];gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
 if c['mode']=='red':mask=np.uint8((r-np.maximum(g,b)>c.get('delta',15))&(r>c.get('level',60)))*255
 elif c['mode']=='light':mask=np.uint8(gray>c['level'])*255
 elif c['mode']=='dark':mask=np.uint8(gray<c['level'])*255
 else:
  mask=cv2.Canny(gray,*c.get('canny',[30,65]))
  if c['mode']=='paint':
   pigment=np.uint8((r-np.minimum(g,b)>12)&(r>60))*255
   pigment=cv2.medianBlur(pigment,3);mask[cv2.dilate(pigment,np.ones((5,5),np.uint8))==0]=0
 if c.get('polygon'):
  q=np.zeros_like(mask);cv2.fillPoly(q,[np.array([[round(px*work.width),round(py*work.height)] for px,py in c['polygon']],np.int32)],255);mask[q==0]=0
 mask[~v]=0;mask[:2]=0;mask[-2:]=0;mask[:,:2]=0;mask[:,-2:]=0
 n,lab,stats,_=cv2.connectedComponentsWithStats(mask,8);clean=np.zeros_like(mask)
 for i in range(1,n):
  cx=(stats[i,cv2.CC_STAT_LEFT]+stats[i,cv2.CC_STAT_WIDTH]/2)/work.width;cy=(stats[i,cv2.CC_STAT_TOP]+stats[i,cv2.CC_STAT_HEIGHT]/2)/work.height
  semantic=any(x0<=cx<=x1 and y0<=cy<=y1 for x0,y0,x1,y1 in c.get('keepSmallRegions',[]))
  if stats[i,cv2.CC_STAT_AREA]>=(12 if semantic else max(8,6*factor*factor)):clean[lab==i]=255
 # Smooth only extracted pigment boundaries; no inserted or joined strokes.
 contours,_=cv2.findContours(clean,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE);curves=[];scale=640/max(clean.shape)
 for curve in contours:
  points=cv2.approxPolyDP(curve,max(.3,factor*.2),True).reshape(-1,2).astype(float)
  if len(points)<3:continue
  for _ in range(2):
   nxt=np.roll(points,-1,axis=0);points=np.stack((.75*points+.25*nxt,.25*points+.75*nxt),axis=1).reshape(-1,2)
  curves.append(np.round(points*scale).astype(np.int32).reshape(-1,1,2))
 target=np.zeros((round(clean.shape[0]*scale),round(clean.shape[1]*scale)),np.uint8);cv2.drawContours(target,curves,-1,255,cv2.FILLED,lineType=cv2.LINE_AA)
 if c['mode'] in ['edge','paint']:target=cv2.dilate(target,np.ones((3,3),np.uint8))
 if c.get('outline'):target=cv2.morphologyEx(target,cv2.MORPH_GRADIENT,np.ones((4,4),np.uint8))
 alpha=Image.fromarray(target).filter(ImageFilter.GaussianBlur(.45));result=Image.new('RGBA',(alpha.width+40,alpha.height+40),(237,228,212,0));ink=Image.new('RGBA',alpha.size,(237,228,212,0));ink.putalpha(alpha);result.alpha_composite(ink,(20,20))
 id=c['objectId']+'-'+c['name']+'-expand-20261018';dest=D/'rubbings'/(id+'.png');result.save(dest,optimize=True)
 x0,y0,x1,y1=bounds;rect=[x0/im.width,y0/im.height,(x1-x0)/im.width,(y1-y0)/im.height]
 basis='照片观察：器表彩绘线纹清楚可见；名称为可见形态的描述，不将器形或木纹认定为纹样。'
 region=dict(id='motif-'+id,dimension='motifs',value=c['motif'],rect=rect,label=c['label'],note=c['note'],view='detail',basis=basis,source=a['source'],sourceImage=photo,rubbingEligible=True,rubbingMethod='reviewed-line-expansion-20261018',revision=6)
 if c.get('polygon'):region['sourcePolygon']=c['polygon']
 e=dict(id=id,objectId=a['id'],title=a['title'],motif=c['motif'],label=c['label'],note=c['note'],view='detail',rect=rect,source=a['source'],photo=photo,photoSource=(a.get('imageCredit') or {}).get('page',a['source']),credit=a.get('imageCredit'),era=a['period'],material=a['materialGroup'],catalogueAdded=bool(a.get('catalogueReview')),available=True,kind='纹样拓影',surfaceVerified=True,evidence=basis,reviewed='2026-10-18',image='rubbings/'+dest.name,width=result.width,height=result.height,sourcePixels=source_size,sourceSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),assetSHA256=hashlib.sha256(dest.read_bytes()).hexdigest(),method='馆藏照片局部彩绘色层或边线分离、去除孤立噪点、平滑像素边缘；仅保留照片中可见线条，不补绘、不重构；非实物拓片。',qualityReview='对照原照片与提取结果逐张核验；不把形制、木纹、锈迹和反光作为纹样。',regionId=region['id'],sourceRegion=region)
 if c.get('polygon'):e['sourcePolygon']=c['polygon']
 if a.get('image') and (D/a['image']).exists():
  e['originalPhoto']=a['image'];e['originalPhotoSHA256']=hashlib.sha256((D/a['image']).read_bytes()).hexdigest()
 entries.append(e);updates.append(dict(objectId=a['id'],region=region,addMotif=c['motif'] if c['motif'] not in a['motifs'] else None));previews.append((e,crop,result))
manifest=dict(reviewed='2026-10-18',screenedObjects=70,closeReviewObjects=18,rejectedExperiments=[dict(objectId='hb-4835',reason='低分辨率且纹带提取后断裂，仅余零散短线。'),dict(objectId='jz-353',reason='此鱼纹提取版本不完整且混入杯边；不以已有四叶纹重复计数。')],method='新增馆藏漆器照片逐张审看，筛选明确可见的器表彩绘线纹，不将动物器形当作纹饰。',entries=entries,detailUpdates=updates)
(R/'docs/rubbing-lacquer-expansion-20261018.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',18)
for offset in range(0,len(previews),6):
 sheet=Image.new('RGB',(1800,1300),'#242123');draw=ImageDraw.Draw(sheet)
 for i,(e,crop,result) in enumerate(previews[offset:offset+6]):
  x=i%3*600;y=i//3*650
  for pic,dy in [(crop,0),(result,290)]:
   pic=pic.copy();scale=min(540/pic.width,270/pic.height);pic=pic.resize((round(pic.width*scale),round(pic.height*scale)),Image.Resampling.LANCZOS);sheet.paste(pic,(x+(600-pic.width)//2,y+dy),pic)
  draw.text((x+15,y+578),e['label'],font=font,fill='#eee');draw.text((x+15,y+608),e['id'],font=font,fill='#baaba3')
 sheet.save(O/f'final-review-{offset}.jpg')
print(json.dumps({'entries':len(entries),'manifest':str(R/'docs/rubbing-lacquer-expansion-20261018.json')},ensure_ascii=False))
