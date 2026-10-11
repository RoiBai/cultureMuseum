"""Separate surface decoration from object shape; annotate only visible photo crops.
No outline of a figurine, animal-shaped handle or jade silhouette is a motif.
This audit is intentionally independent from photo/colour fields.
"""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'dist';DATA=D/'data'
def load(p):return json.loads(p.read_text())
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
a=load(DATA/'artifacts.json'); details=load(DATA/'detail-regions.json'); sources={r['id']:r for r in load(ROOT/'sources/museum-catalogue-20261011.json')['records']}
# Definite shape-only / place-name / script-form misclassifications.
remove={
'hb-6915':['人像'],'jz-474':['禽鸟'],'jz-475':['人像'],'jz-478':['人像'],'hb-5517':['龙蛇'],'hb-5520':['龙蛇'],
'jz-473':['禽鸟'],'jz-472':['禽鸟'],'wangziwu-ding':['龙蛇'],'hb-4694':['禽鸟'],'hb-5113':['龙蛇'],
'drum':['凤鸟','虎豹','禽鸟'],'hb-4782':['龙蛇'],'hb-4860':['虎兽'],'hb-4861':['龙蛇'],'hb-4865':['龙蛇'],'hb-4866':['人像'],'hb-4867':['龙蛇'],'hb-4870':['龙蛇'],'hb-5099':['禽鸟'],
'hb-5422':['龙蛇'],'hb-5423':['龙蛇'],'hb-5424':['龙蛇'],'hb-5425':['虎兽'],'hb-5426':['龙蛇'],'hb-5428':['龙蛇'],'hb-5429':['龙蛇'],'hb-5430':['龙蛇'],'hb-5431':['龙蛇'],
'dou':['凤鸟','龙蛇','花卉','禽鸟'],'guardian':['鹿角'],'hb-4756':['龙蛇'],'hb-4978':['虎兽'],
'hb-5181':['龙蛇'],'hb-5182':['龙蛇'],'hb-5183':['龙蛇'],'hb-5184':['龙蛇'],'hb-5186':['龙蛇'],
'jz-359':['虎豹'],'jz-459':['凤鸟','禽鸟'],'jz-462':['禽鸟'],'jz-468':['人像'],'jz-469':['凤鸟','龙蛇','人像','禽鸟'],'jz-470':['凤鸟','龙蛇','禽鸟'],'jz-471':['龙蛇'],
'winged':['凤鸟','人像','禽鸟'],'hb-4981':['凤鸟'],'hb-5143':['禽鸟'],'hb-5146':['禽鸟'],'hb-4753':['龙蛇'],'crane':['鹿角','禽鸟'],'hb-5180':['鱼纹'],'hb-5185':['龙蛇'],'hb-6911':['虎豹'],'spoon':['凤鸟','虎豹','禽鸟'],'hb-5483':['凤鸟'],'hb-5024':['龙蛇'],'hb-5026':['禽鸟'],
'hb-5377':['铭文'],'hb-5382':['铭文'],'hb-5383':['铭文']}
# Gallery evidence: exact crop locations in the existing transparent display image.
# Method pigment extracts lacquer pigment only; line extracts photographed surface relief.
# No silhouettes or invented/redrawn strokes are added.
C=[]
def crop(id,m,rect,label,method='line',basis='馆方题名或说明明确纹饰；局部与照片核对'):
 C.append(dict(objectId=id,motif=m,rect=rect,label=label,method=method,basis=basis))
crop('jz-476','几何',[.45,.30,.40,.46],'陶罐肩腹篮纹')
crop('hb-4752','云气',[.16,.24,.66,.18],'铜敦盖面几何云纹')
crop('hb-4752','几何',[.13,.60,.70,.16],'铜敦腹部几何纹带')
crop('hb-5156','几何',[.12,.14,.30,.29],'镜背菱形纹单元')
crop('hb-4857','凤鸟',[.22,.18,.54,.65],'玉佩器表双凤纹')
crop('hb-4862','龙蛇',[.22,.14,.56,.73],'玉佩器表蟠龙纹')
crop('hb-4863','云气',[.37,.08,.29,.26],'玉璜卷云纹单元')
crop('hb-4987','几何',[.04,.04,.84,.13],'耳杯耳部菱形纹')
crop('hb-4996','禽鸟',[.13,.36,.29,.48],'面板左侧鸟纹')
crop('hb-4996','虎兽',[.05,.06,.86,.26],'面板上缘兽纹')
crop('hb-5142','凤鸟',[.22,.52,.46,.20],'铜樽器腹错银凤纹')
crop('hb-5150','龙蛇',[.10,.15,.75,.56],'带钩错金银龙凤纹组合')
crop('hb-5150','凤鸟',[.10,.15,.75,.56],'带钩错金银龙凤纹组合')
crop('hb-5152','花卉',[.58,.54,.18,.19],'铜镜花叶纹单元')
crop('hb-5152','几何',[.26,.47,.19,.25],'铜镜山字纹单元')
crop('hb-5153','凤鸟',[.45,.50,.32,.29],'镜背右下凤纹')
crop('hb-5174','云气',[.34,.05,.28,.22],'玉璧器表卷云纹')
crop('hb-4976','几何',[.08,.26,.76,.17],'酒具盒方格装饰带')
crop('hb-4984','凤鸟',[.14,.38,.54,.27],'杯壁彩绘凤纹')
crop('hb-4994','凤鸟',[.15,.05,.70,.83],'漆盾龙凤纹组合')
crop('hb-4994','龙蛇',[.15,.05,.70,.83],'漆盾龙凤纹组合')
crop('hb-5145','凤鸟',[.24,.24,.48,.54],'熏杯器壁凤纹镂空')
crop('hb-5154','龙蛇',[.24,.19,.49,.49],'夹层铜镜龙纹')
crop('hb-4753','几何',[.26,.40,.43,.16],'铜敦盖面几何纹')
crop('hb-4975','凤鸟',[.24,.30,.51,.13],'盖豆上沿彩绘纹带','pigment')
crop('hb-5179','云气',[.60,.50,.18,.36],'玉玦表面卷云纹')
crop('hb-5460','凤鸟',[.16,.08,.69,.22],'盂内壁凤鱼纹局部','pigment')
crop('hb-5461','凤鸟',[.26,.66,.48,.18],'盂内底彩绘凤纹','dark')
crop('hb-5462','凤鸟',[.21,.11,.56,.21],'盂内壁变形凤鱼纹','pigment')
crop('hb-5484','几何',[.65,.07,.27,.35],'漆匕点格纹','pigment')
crop('hb-5523','凤鸟',[.03,.11,.20,.51],'漆匕勺部云凤纹','pigment')
crop('hb-5528','凤鸟',[.29,.09,.42,.29],'奁盖云凤纹','pigment')
crop('hb-5529','凤鸟',[.46,.06,.29,.24],'奁盖云凤纹','pigment')
crop('hb-5530','凤鸟',[.27,.22,.39,.37],'圆奁内壁云凤纹','pigment')
crop('hb-5533','云气',[.24,.04,.51,.22],'椭圆奁盖云气纹','pigment')
crop('hb-5537','凤鸟',[.21,.12,.57,.17],'漆卮变形凤鸟纹单元','pigment')
crop('hb-5459','凤鸟',[.23,.21,.54,.53],'盒盖变形凤鸟纹','pigment')
crop('hb-5463','虎兽',[.23,.56,.51,.18],'漆盂外壁云兽纹','pigment')
crop('hb-5464','凤鸟',[.27,.40,.46,.25],'漆盂内底云凤纹','pigment')
crop('hb-5531','云气',[.22,.14,.53,.30],'奁盖云气纹','pigment')
crop('hb-5030','花卉',[.21,.30,.48,.46],'瓷钵外壁莲瓣纹')
crop('hb-4855','凤鸟',[.34,.11,.33,.15],'漆壶颈部云凤纹','pigment')
crop('hb-5457','凤鸟',[.23,.09,.48,.20],'耳杯内沿凤鸟纹','pigment')
crop('hb-5458','几何',[.17,.51,.63,.16],'漆盒外壁波折纹','pigment', '照片观察：器腹可辨认连续波折线；不将其误称凤鸟纹')
crop('hb-5465','凤鸟',[.27,.59,.40,.19],'漆盂外壁变形凤鸟纹','pigment')
crop('hb-5466','凤鸟',[.24,.60,.49,.19],'漆盂外壁变形凤鸟纹','pigment')
crop('hb-5478','凤鸟',[.35,.39,.30,.33],'圆盘内底云凤纹','pigment')
crop('hb-5480','凤鸟',[.31,.36,.41,.17],'圆盘内底凤鸟云龙组合','dark')
crop('hb-5534','虎兽',[.24,.14,.43,.30],'漆盒盖顶斑豹纹')
crop('hb-5536','几何',[.17,.17,.65,.43],'漆案面圆形与线框装饰','pigment','照片观察：案面明确可见重复圆形与线框，不推断动物类别')
crop('hb-5053','龙蛇',[.15,.29,.69,.28],'梅瓶腹部龙纹','blue')
crop('hb-5051','花卉',[.21,.60,.59,.17],'玉壶春瓶青花莲纹','blue')
crop('hb-5052','花卉',[.17,.48,.64,.21],'塔式盖瓶牡丹纹','line')
# These details are documented but absent, too small or too worn in this photograph.
unready={
'hb-4982':'漆面破损严重，现有照片不足以分辨勾边连云纹的完整线条。','hb-4985':'器壁反光与磨损遮盖龙纹，无法可靠分离。','hb-5000':'图中器身太小，龙云纹不可辨清。','hb-5157':'两件器盖纹饰像素过少，腐蚀纹理容易被当作纹样。','hb-5175':'兽面纹刻线淡且有反光，不能生成可辨认拓影。','hb-5473':'盘心已明显残损，未把斑驳漆面当作凤鸟纹。','hb-5476':'照片为低视角侧面，盘心凤纹不可见。','hb-5484':'草叶过小；本次只提取可辨认的点格纹。','hb-5458':'云凤纹未能可靠分离，只取可见波折纹。','hb-5480':'凤鸟与云龙在当前照片互相交叠，保留明确标识的组合局部，不虚构独立龙纹。'}
new_by={}
for c in C:new_by.setdefault(c['objectId'],[]).append(c)
fix_cloud={'jz-458','hb-4988','hb-6173','hb-6174','jz-354'}
poor_photo={'jz-476','hb-5529','hb-4752','hb-5156','hb-5142','hb-5153','hb-5154','hb-4976','hb-4984','hb-4753','hb-4975','hb-5030','hb-5534'}
corrections=[];audits=[]
for o in a:
 id=o['id'];old=list(o['motifs']);m=[x for x in old if x not in remove.get(id,[])]
 if id in fix_cloud:m=['云气' if x=='云雷' else x for x in m]
 # 凤鸟 is already a bird family; a second generic 禽鸟 tag was often redundant.
 if '凤鸟' in m and '禽鸟' in m:m.remove('禽鸟')
 if id=='hb-4996' and '禽鸟' not in m:m.append('禽鸟')
 if id=='hb-5000' and '龙蛇' not in m:m.append('龙蛇')
 if id in ('hb-5468','hb-5471') and '虎兽' not in m:m.append('虎兽')
 for c in new_by.get(id,[]):
  if c['motif'] not in m:m.append(c['motif'])
 o['motifs']=m
 if old!=m:corrections.append({'id':id,'title':o['title'],'before':old,'after':m,'source':o['source'],'reason':'剔除整体造型、地名、鸟篆及重复泛鸟类标签；只保留题名、说明或照片可证实的器表装饰。'})
 regions=details['artifacts'][id];updated=[]
 for r in regions:
  if r['dimension']!='motifs':updated.append(r);continue
  if id in fix_cloud and r['value']=='云雷':r['value']='云气';r['id']='motif-云气'
  if r['value'] not in m:
   # Retain useful shape observations in the object page, outside motif comparisons.
   if r['view']=='form' or re.search('造型|形柄|形流|轮廓|底座|鹿角|凤鸟柄|豆座|豆盘|附壁|鸟形',r.get('label','')+' '+r.get('note','')):
    r.update(dimension='form',value='形制',view='form',id='shape-'+r['id'],rubbingEligible=False)
    updated.append(r)
   continue
  if r['view']=='form':
   r.update(dimension='form',value='形制',id='shape-'+r['id'],rubbingEligible=False)
   updated.append(r);continue
  r['rubbingEligible']=r['view']=='detail' and not re.search('造型|虎首|攀附器壁|鸟首|鸟形|衣缘与交领',r['label'])
  if not r['rubbingEligible']:r['rubbingReason']='当前局部用于定位或形制观察，不能作为可独立辨认的纹样拓影。'
  updated.append(r)
 for motif in m:
  if not any(r['dimension']=='motifs' and r['value']==motif for r in updated):updated.append({'id':'motif-'+motif,'dimension':'motifs','value':motif,'rect':[0,0,1,1],'label':motif+'纹饰记录','note':unready.get(id,'馆方文字提及该纹饰，当前照片未能单独辨清，不绘制或补全纹样。'),'view':'unseen','basis':'馆方题名或说明','source':o['source'],'rubbingEligible':False})
 for c in new_by.get(id,[]):
  r=next((r for r in updated if r['dimension']=='motifs' and r['value']==c['motif']),None)
  r.update(rect=c['rect'],label=c['label'],view='detail',note='仅从照片中此处可见的器表纹饰提取线条，保留磨损与局部组合，不加入器物外轮廓，不补绘。',basis=c['basis'],rubbingEligible=True,rubbingMethod=c['method'],revision=4)
  r.pop('rubbingReason',None)
  if id in poor_photo:r.update(rubbingEligible=False,rubbingReason='已核对照片并试提取；源图分辨率、磨损或锈蚀使装饰线与表面噪声混淆，本次不提供拓影。')
 # All clear crop definitions refer to existing displayImage coordinates.
 details['artifacts'][id]=updated
 text=sources.get(id,{}).get('text',o.get('sourceExtract',''))
 o['motifReview']={'reviewed':'2026-10-11','scope':'器表纹饰；排除单纯器形、陶塑动物、文字书体与地名','source':o['source'],'motifs':m,'photoBased':any('照片观察' in c['basis'] for c in new_by.get(id,[]))}
 audits.append({'id':id,'title':o['title'],'newCatalogue':bool(o.get('catalogueReview')),'motifs':m,'source':o['source'],'sourceText':text,'readyCrops':[r['label'] for r in updated if r.get('rubbingEligible')],'unmade':[{'motif':r['value'],'reason':unready.get(id,r.get('rubbingReason',r['note']))} for r in updated if r['dimension']=='motifs' and not r.get('rubbingEligible')]})
save(DATA/'artifacts.json',a);save(DATA/'detail-regions.json',details)
prior_report=ROOT/'docs/pattern-surface-audit-20261011.json'
if prior_report.exists():
 prior=load(prior_report).get('corrections',[])
 corrections=prior+[c for c in corrections if not any(p['id']==c['id'] for p in prior)]
save(ROOT/'docs/pattern-surface-audit-20261011.json',{'reviewed':'2026-10-11','policy':'只有器表纹饰进入纹样分类；整体人物、动物形制不作纹样。仅有文献记载但当前照片不可辨识的，不提供拓影。','objectsAudited':len(a),'newObjectsAudited':sum(bool(o.get('catalogueReview')) for o in a),'corrections':corrections,'records':audits})
print(json.dumps({'audited':len(a),'new':sum(bool(o.get('catalogueReview')) for o in a),'corrected':len(corrections),'newCropDefinitions':len(C)},ensure_ascii=False))
