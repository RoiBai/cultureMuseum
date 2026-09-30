"""Deterministic foreground segmentation with visually reviewed background seeds."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image,ImageDraw
gradient={'hb-5069','hb-5176','hb-5189','hb-6197','jz-471','jz-359','jz-352','jz-350','hb-5187','hb-6174','hb-6173','hb-6188','hb-6169','hb-6192','hb-6170'}
cv2.setNumThreads(2)
def segment(photo,id):
 rgb=np.array(photo.convert('RGB'));h,w=rgb.shape[:2]
 if id in {'hb-6197','hb-6174','hb-6173','hb-6188','hb-6169','hb-6192','hb-6170'}:
  nonwhite=(rgb.min(axis=2)<230)
  xx=np.where(nonwhite.mean(axis=0)>.6)[0];yy=np.where(nonwhite.mean(axis=1)>.6)[0]
  box=(int(xx[0]),int(yy[0]),int(xx[-1])+1,int(yy[-1])+1)
  cropped=photo.crop(box)
  # Recursion sentinel prevents repeated trimming.
  result=segment(cropped,id+'-trimmed')
  full=Image.new('L',photo.size);full.paste(result,box[:2]);return full
 small=cv2.resize(rgb,(min(w,700),round(h*min(w,700)/w)),interpolation=cv2.INTER_AREA);rgb=small;h,w=rgb.shape[:2]
 mask=np.full((h,w),cv2.GC_PR_FGD,dtype=np.uint8)
 low=rgb.min(axis=2);neutral=rgb.max(axis=2).astype(float)-low
 mask[(low>230)&(neutral<22)]=cv2.GC_PR_BGD
 if id.removesuffix('-trimmed') in gradient:
  # Studio backgrounds vary vertically; compare to the median side margins.
  f=rgb.astype(float);n=max(2,int(w*.025))
  left=np.median(f[:, :n],axis=1);right=np.median(f[:, -n:],axis=1)
  t=np.linspace(0,1,w)[None,:,None];bg=left[:,None,:]*(1-t)+right[:,None,:]*t
  d=np.sqrt(np.sum((f-bg)**2,axis=2))
  mask[d<27]=cv2.GC_PR_BGD
  mask[d<12]=cv2.GC_BGD
 mask[0,:]=0;mask[-1,:]=0;mask[:,0]=0;mask[:,-1]=0
 # white is certain background only when connected to the perimeter
 threshold={'hb-4742':190,'hb-5073':222,'hb-5189':200,'hb-5069':222,'hb-4986':170,'hb-4973':195,'hb-4974':200,'hb-4969':180,'hb-4956':180}.get(id,246)
 bw=((low>=threshold)&(neutral<22)).astype('uint8')
 count,labels=cv2.connectedComponents(bw)
 border=np.unique(np.concatenate([labels[0],labels[-1],labels[:,0],labels[:,-1]]))
 for lab in border:
  if lab: mask[labels==lab]=0
 if id=='hb-5069':
  mask[244:,240:]=0;mask[291:]=0
 if id=='hb-4964':
  # Museum caption/logo is outside the object; original photo is retained.
  mask[250:,240:]=0
 if id.removesuffix('-trimmed')=='hb-6197':
  # Visually reviewed solid glass body. Its grey centre resembles the studio
  # gradient but is part of the object, including the dark upper opening.
  dx=3 if id.endswith('-trimmed') else 0
  points=np.array([(145-dx,72),(200-dx,73),(223-dx,88),(232-dx,120),(231-dx,176),(219-dx,216),(187-dx,232),(137-dx,228),(121-dx,202),(109-dx,160),(108-dx,120),(123-dx,90)],dtype=np.int32)
  cv2.fillPoly(mask,[points],cv2.GC_FGD)
 cv2.setRNGSeed(7)
 cv2.grabCut(rgb,mask,None,np.zeros((1,65),np.float64),np.zeros((1,65),np.float64),5,cv2.GC_INIT_WITH_MASK)
 alpha=np.where((mask==1)|(mask==3),255,0).astype('uint8')
 return Image.fromarray(alpha).resize(photo.size,Image.Resampling.LANCZOS)

# The 11 legacy settings below mirror dist/foreground.js, so display and colour
# analysis now use the same alpha instead of two different background rules.
LEGACY = {
 'hb-4695':dict(crop=[0,130,350,247],mode='black',cutoff=25),
 'hb-4694':dict(crop=[329,20,385,576],mode='light',cutoff=160),
 'hb-6911':dict(crop=[43,30,310,273],mode='white',cutoff=224),
 'hb-4696':dict(crop=[107,32,248,279],mode='row',tolerance=27),
 'hb-6915':dict(crop=[238,162,471,474],mode='row',tolerance=31),
 'hb-6916':dict(crop=[173,45,536,550],mode='white',cutoff=226),
 'hb-6912':dict(crop=[294,60,394,541],mode='strips',strips=[[296,307],[317,328],[338,348],[358,371],[379,391]]),
 'jz-469':dict(crop=[145,245,1460,877],mode='warm',cutoff=11),
 'jz-459':dict(mode='row',tolerance=28),
 'jz-355':dict(mode='white',cutoff=231),
 'hb-5520':dict(crop=[48,52,303,255],mode='white',cutoff=222),
}
def legacy_alpha(record, photo, dist):
 if record.get('mask'):
  return Image.open(dist/record['mask']).convert('L').resize(photo.size)
 cfg=LEGACY[record['id']];rgb=np.asarray(photo.convert('RGB')).astype(float)
 h,w=rgb.shape[:2];r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];mode=cfg['mode']
 if mode=='black':alpha=(rgb.max(axis=2)-cfg['cutoff'])/12
 elif mode=='light':alpha=(cfg['cutoff']-rgb.mean(axis=2))/12
 elif mode=='white':alpha=(cfg['cutoff']-rgb.min(axis=2))/14
 elif mode=='warm':alpha=(r-b-cfg['cutoff'])/12
 elif mode=='strips':
  alpha=np.zeros((h,w))
  for left,right in cfg['strips']:alpha[:,left:right]=1
 else:
  bg=(rgb[:,3,:]+rgb[:,-4,:])/2
  alpha=(np.sqrt(((rgb-bg[:,None,:])**2).sum(axis=2))-cfg['tolerance'])/18
 alpha=np.clip(alpha,0,1)
 if cfg.get('crop'):
  left,top,right,bottom=cfg['crop'];alpha[:top]=0;alpha[bottom:]=0;alpha[:,:left]=0;alpha[:,right:]=0
 return Image.fromarray(np.round(alpha*255).astype('uint8'))
