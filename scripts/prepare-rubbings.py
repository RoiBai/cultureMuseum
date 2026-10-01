"""Extract photo-derived ink masks from reviewed detail ROIs, without reconstructing unseen motifs."""
from pathlib import Path
import json,hashlib
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist';OUT=DIST/'rubbings';OUT.mkdir(exist_ok=True)
artifacts=json.loads((DIST/'data/artifacts.json').read_text());details=json.loads((DIST/'data/detail-regions.json').read_text())['artifacts']
entries=[];sheets=[]
for a in artifacts:
    for n,r in enumerate(v for v in details[a['id']] if v['dimension']=='motifs'):
        r=dict(r)
        if a['id']=='hb-4781' and r['value']=='凤鸟':r.update(rect=[.30,.18,.39,.63],label='完整团凤纹')
        if a['id']=='jz-470' and r['value'] in ['凤鸟','禽鸟']:r.update(label='凤首局部',view='form')
        rid=a['id']+'-'+str(n+1);entry={'id':rid,'objectId':a['id'],'title':a['title'],'motif':r['value'],'label':r['label'],'note':r['note'],'view':r['view'],'rect':r['rect'],'source':a['source'],'photo':a['displayImage'],'credit':a.get('imageCredit'),'era':a['period'],'available':r['view']!='unseen','kind':{'detail':'纹样拓影','form':'造型拓影','context':'器表拓影','unseen':'照片未能辨清'}[r['view']]}
        if entry['available']:
            path=DIST/a['displayImage'];im=Image.open(path).convert('RGBA');w,h=im.size;x,y,rw,rh=r['rect'];crop=im.crop((round(x*w),round(y*h),round((x+rw)*w),round((y+rh)*h)));crop.thumbnail((640,640),Image.Resampling.LANCZOS)
            px=np.array(crop);gray=cv2.cvtColor(px[:,:,:3],cv2.COLOR_RGB2GRAY);valid=px[:,:,3]>100
            smooth=cv2.bilateralFilter(gray,7,45,45);contrast=cv2.createCLAHE(clipLimit=1.6,tileGridSize=(5,5)).apply(smooth)
            smooth=cv2.GaussianBlur(contrast,(0,0),1.15)
            edges=cv2.Canny(smooth,42,105)
            # Object boundaries add a readable silhouette; crop boundaries do not.
            boundary=cv2.morphologyEx(np.uint8(valid)*255,cv2.MORPH_GRADIENT,np.ones((3,3),np.uint8))
            edges=np.maximum(edges,boundary);edges[~valid]=0
            if a['id'] in ['hb-4781','hb-4774','hb-4808','jz-351','hb-5063','hb-5062','hb-4696']:
                rgb=px[:,:,:3].astype(float);red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
                pigment=((red-np.maximum(green,blue)>16)&(red>green*1.16))|((blue-red>12)&(blue>green*.95)&(red<150))
                pigment&=valid
                if pigment.sum()>30:edges=np.uint8(pigment)*255
            count,labels,stats,_=cv2.connectedComponentsWithStats(edges,8)
            minimum=max(4,min(gray.shape)*.015)
            cleaned=np.zeros_like(edges)
            for component in range(1,count):
                if stats[component,cv2.CC_STAT_AREA]>=minimum:cleaned[labels==component]=255
            # A clean, opaque line replaces low-opacity photographic shading.
            if min(crop.size)>180:cleaned=cv2.dilate(cleaned,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2,2)))
            ch,cw=gray.shape;yy,xx=np.mgrid[:ch,:cw];feather=np.minimum.reduce([xx+1,cw-xx,yy+1,ch-yy])/max(3,min(cw,ch)*.025)
            ink=cleaned.astype(float)*np.clip(feather,0,1)
            mask=np.uint8(ink);result=Image.new('RGBA',crop.size,(238,228,199,0));result.putalpha(Image.fromarray(mask));box=result.getbbox()
            if box:result=result.crop(box)
            # Consistent asset margins; never upscale the photographic source to claim more detail.
            canvas=Image.new('RGBA',(result.width+24,result.height+24));canvas.alpha_composite(result,(12,12));canvas.save(OUT/(rid+'.png'),optimize=True)
            entry.update(image='rubbings/'+rid+'.png',width=canvas.width,height=canvas.height,sourceSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),method='照片去噪、轮廓线提取与彩绘色区分离；非实物拓片，未补绘缺失纹样')
            if r['view']=='detail':sheets.append((rid,canvas))
        entries.append(entry)
manifest={'version':1,'description':'由馆藏照片生成的数字拓影，包含器表纹样与造型母题；非实物拓片。未能辨清的记录不生成纹样。','entries':entries}
(DIST/'data/rubbings.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',15)
for offset in range(0,len(sheets),24):
    sheet=Image.new('RGB',(1000,780),'#1d251e');draw=ImageDraw.Draw(sheet)
    for i,(name,img) in enumerate(sheets[offset:offset+24]):
        img=img.copy();img.thumbnail((140,145));x=(i%6)*166;y=(i//6)*195;sheet.paste(img,(x+(166-img.width)//2,y+10),img);draw.text((x+10,y+166),name,font=font,fill='#ddd4ad')
    sheet.save('/private/tmp/rubbings-contact-'+str(offset)+'.jpg')
print(json.dumps({'objects':len(set(e['objectId'] for e in entries)),'entries':len(entries),'ready':sum(e['available'] for e in entries)}))
