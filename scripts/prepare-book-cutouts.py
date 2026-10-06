"""Reviewed alpha-only cutouts for the two newly added book object photos.

Keep the complete source canvas so existing detail-lens coordinates still match.
The display copy changes alpha only; original photographs remain available.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artifact_palette import measured_palette

ROOT=Path(__file__).resolve().parents[1]; DIST=ROOT/'dist'
# Hand-reviewed contours in the original 713 x 487 photograph. The second
# contour preserves the accompanying bronze spoon, excluding its modern stand.
DING_CONTOURS=[
[(89,27),(96,17),(108,17),(121,21),(142,28),(152,40),(164,55),(181,79),(193,97),(203,96),(222,94),(251,90),(285,87),(336,85),(338,65),(343,61),(352,63),(355,70),(355,84),(389,84),(421,86),(456,89),(482,93),(493,77),(510,54),(527,37),(547,24),(566,17),(588,13),(600,15),(606,25),(602,31),(583,40),(568,49),(555,60),(544,76),(535,95),(532,106),(541,104),(548,103),(554,105),(562,102),(569,104),(576,111),(584,113),(587,117),(581,122),(590,123),(591,128),(584,133),(589,138),(583,146),(587,151),(582,162),(575,168),(573,183),(566,196),(557,206),(563,208),(572,208),(575,216),(566,220),(559,218),(558,223),(551,224),(552,231),(560,235),(568,234),(574,228),(578,230),(578,239),(570,247),(559,251),(549,252),(545,261),(538,268),(536,289),(542,304),(548,312),(551,327),(547,335),(544,339),(541,349),(532,357),(522,359),(518,355),(507,362),(503,372),(502,382),(514,391),(521,400),(516,407),(503,412),(485,415),(467,416),(451,408),(452,391),(456,376),(458,354),(457,342),(459,324),(428,330),(397,334),(361,335),(329,337),(295,335),(270,330),(248,326),(248,340),(246,351),(241,365),(241,378),(246,394),(252,408),(250,417),(242,425),(230,431),(213,433),(199,429),(187,421),(182,411),(184,398),(199,387),(201,378),(198,366),(190,352),(175,358),(164,355),(157,349),(155,337),(147,338),(145,331),(153,324),(149,314),(154,307),(157,296),(164,282),(169,266),(166,252),(155,251),(145,248),(139,244),(128,248),(120,245),(116,239),(121,232),(116,231),(117,225),(121,222),(124,227),(128,220),(134,219),(139,224),(147,225),(146,215),(139,205),(135,191),(129,174),(121,165),(125,161),(123,153),(117,148),(121,144),(112,143),(112,137),(118,139),(121,131),(123,128),(119,123),(122,116),(127,119),(129,111),(137,104),(146,105),(151,101),(147,91),(140,79),(127,65),(112,52),(99,44),(88,38)],
[(160,444),(162,440),(179,437),(212,436),(251,438),(286,443),(312,449),(335,453),(359,452),(386,446),(410,436),(432,424),(448,413),(464,407),(487,404),(514,401),(535,402),(552,398),(574,399),(581,402),(580,410),(585,415),(581,422),(557,424),(531,424),(503,427),(478,430),(454,434),(433,443),(411,453),(388,462),(361,468),(335,474),(310,477),(283,477),(258,475),(229,471),(203,465),(182,456),(166,450)]
]

def alpha_for(a,photo):
 if a['id']=='hb-6914':
  rgb=np.asarray(photo); white=(rgb.min(axis=2)>222)&(rgb.max(axis=2).astype(int)-rgb.min(axis=2)<25)
  # Remove only light regions touching the perimeter, preserving light paint.
  mask=Image.fromarray(np.where(white,255,0).astype('uint8')).copy()
  for seed in [(0,0),(photo.width-1,0),(0,photo.height-1),(photo.width-1,photo.height-1)]:
   if mask.getpixel(seed)==255:ImageDraw.floodfill(mask,seed,128)
  hard=Image.fromarray(np.where(np.asarray(mask)==128,0,255).astype('uint8'))
  return hard.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.35))
 scale=4;alpha=Image.new('L',(photo.width*scale,photo.height*scale));draw=ImageDraw.Draw(alpha)
 for contour in DING_CONTOURS:draw.polygon([(x*scale,y*scale) for x,y in contour],fill=255)
 return alpha.resize(photo.size,Image.Resampling.LANCZOS)

records=json.loads((DIST/'data/artifacts.json').read_text());report=json.loads((ROOT/'docs/background-removal.json').read_text());changed={}
for a in records:
 if a['id'] not in {'hb-6914','wangziwu-ding'}:continue
 source=DIST/a['image'];photo=Image.open(source).convert('RGB');alpha=alpha_for(a,photo)
 rgba=photo.convert('RGBA');rgba.putalpha(alpha)
 dest=f'cutouts/{a["id"]}-book-r1.webp';rgba.save(DIST/dest,'WEBP',lossless=True,exact=True,method=6)
 mask_path=f'cutouts/{a["id"]}-book-mask.png';alpha.save(DIST/mask_path)
 a.update(displayImage=dest,displayForeground=True,backgroundRemoval='reviewed-book-alpha-v1',mask=mask_path)
 a.pop('paletteSampleRect',None)
 a['paletteMethod']='透明前景内采样；排除背景、半透明边缘与轮廓内侧 1 像素；色名综合色相、明度与饱和度判定'
 a['paletteNote']='色谱取自去底后的器物前景，排除摄影背景与展台；仅表示照片色貌，不表示原始铜色或颜料。' if a['id']=='wangziwu-ding' else '色谱取自去底后的完整漆奁前景，排除白色摄影背景；旧馆方局部图仍用于已有拓影。'
 a['imageCredit']['changes']='从书内提取照片，展示副本仅将摄影背景透明化，保留器物RGB与原始照片；未重绘或补画。'
 a['palette']=measured_palette(a,DIST);a['colors']=[p['name'] for p in a['palette']]
 if a['id']=='wangziwu-ding':a['observation']='先看腰腹轮廓与立耳，再观察附壁兽形与器表纹带。展示图去除展柜和展台背景，保留鼎与附匕；原始照片可从图片来源查看。'
 report[a['id']]={'source':a['image'],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'status':'foreground-ready','displayImage':dest,'method':a['backgroundRemoval'],'mask':mask_path,'crop':[0,0,*photo.size],'removedFraction':round(float((np.asarray(alpha)==0).mean()),4),'imageRepresentation':'object-photo'}
 changed[a['id']]=a
(ROOT/'docs/background-removal.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(DIST/'data/artifacts.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
# Every book entry and its embedded figure use the reviewed copy. Keep the
# original embedded figure path and attribution for provenance.
index_path=DIST/'data/book-index.json';index=json.loads(index_path.read_text())
fig_path=DIST/'data/book-figures.json';figures=json.loads(fig_path.read_text())
for o in index['objects']:
 if o.get('existingId') not in changed:continue
 a=changed[o['existingId']];o['image']=a['displayImage']
 for figure in [o.get('bookFigure'),figures.get(o['name'])]:
  if not figure:continue
  figure.setdefault('originalSrc',figure['src']);figure['src']=a['displayImage']
  figure['provenance']='从用户提供PDF的嵌入图像提取，展示副本仅背景透明化；原图保留，器物像素未重绘。'
index_path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
fig_path.write_text(json.dumps(figures,ensure_ascii=False,indent=2)+'\n')
regions_path=DIST/'data/detail-regions.json';regions=json.loads(regions_path.read_text())
for id in changed:
 for region in regions['artifacts'][id]:
  if region['id']=='form':region['note']='展示图仅去除摄影背景，保留原始器物细节与相对位置；原图见图片来源。'
  elif id=='hb-6914' and region['id']=='surface':region['label']='器壁漆彩';region['note']='观察器壁漆彩；综合色谱由去底后的完整器物前景取样。'
regions_path.write_text(json.dumps(regions,ensure_ascii=False,indent=2)+'\n')
print('Updated cutouts, palettes and book images:',', '.join(changed))
