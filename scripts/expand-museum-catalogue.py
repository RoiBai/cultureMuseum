"""Conservative import of the audited public catalogue (local output only).
New records require explicit period and findspot evidence. Photographs keep
original RGB; derived display files alter alpha only. A contact-sheet audit
and machine image checks are required after running this importer.
"""
from pathlib import Path
import re,json,hashlib,urllib.request,concurrent.futures,sys,collections,subprocess
from PIL import Image,ImageFilter,ImageDraw,ImageFont
import numpy as np
sys.path.insert(0,'/tmp/jingchu-image-deps');import cv2
from artifact_palette import measured_palette
import importlib.util
_spec=importlib.util.spec_from_file_location('catalogue_masks',Path(__file__).with_name('catalogue-mask-overrides.py'));_overrides=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_overrides)
cv2.setNumThreads(1)
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist';OUT=Path('/tmp/jingchu-catalogue-review');OUT.mkdir(exist_ok=True)
# Keep a stable audited starting catalogue for repeatable rebuilds.
BASELINE_REF='c944d0a21dd80cf3cc5c02748f9c4111bfb226f3'
records=json.loads(subprocess.check_output(['git','show',BASELINE_REF+':dist/data/artifacts.json'],cwd=ROOT));original=list(records);crawled=json.loads((ROOT/'sources/museum-catalogue-20261011.json').read_text())
removed=[a for a in records if '待核' in a['city'] or '待核' in a['place'] or '未列出土' in a['place']]
records=[a for a in records if a not in removed]
existing_ids={a['id'] for a in original};existing_pages={re.sub(r'^https?://(?:www\.hbww\.org\.cn|hbsbwg\.cjyun\.org)','',a['source']).split('?')[0]:a for a in original}
rejected=[];accepted=[];signature={}
ERAS=[('neolithic',r'新石器[^（，。\n]*|石家河文化[^（，。\n]*'),('shang',r'商代|商朝|商(?=[（(，。\n])'),('zhou',r'西周[^（，。\n]*|东周[^（，。\n]*'),('spring',r'春秋[^（，。\n]*'),('warring',r'战国[^（，。\n]*'),('qin',r'秦代|秦(?=[（(，。\n])'),('han',r'(?:西|东)?汉(?:代|朝|时期|初期|早期|晚期|中期)?'),('jin',r'(?:东|西)?晋(?:代|朝)?'),('northsouth',r'南北朝|北魏|南朝|北朝|北齐'),('sui',r'隋代|隋(?=[（(，。\n])'),('tang',r'唐代|唐(?=[（(，。\n])'),('five',r'五代[^（，。\n]*'),('song',r'(?:北|南)?宋(?:代|朝)?'),('yuan',r'元代|元(?=[（(，。\n])'),('ming',r'明代[^（，。\n]*|明(?=[（(，。\n])'),('qing',r'清代[^（，。\n]*|清(?=[（(，。\n])')]
CITY_PATTERNS=[('荆州','荆州|江陵|沙市|松滋|石首|公安|洪湖|监利'),('随州','随州|随县|曾侯乙|擂鼓墩'),('枣阳','枣阳|九连墩'),('荆门','荆门|包山|郭店'),('钟祥','钟祥'),('天门','天门|石家河|肖家屋脊|邓家湾'),('武汉','武汉|武昌|汉阳|黄陂|盘龙城'),('云梦','云梦|睡虎地'),('襄阳','襄阳|襄樊|宜城|谷城|南漳|老河口'),('宜昌','宜昌|宜都|枝江|当阳|秭归'),('十堰','十堰|郧县|郧阳|郧西|丹江口'),('鄂州','鄂州|鄂城'),('黄冈','黄冈|黄梅|蕲春|麻城|红安|罗田|浠水|武穴'),('孝感','孝感|安陆|大悟|孝昌|应城|汉川'),('咸宁','咸宁|通山|通城|嘉鱼|赤壁|蒲圻'),('崇阳','崇阳'),('京山','京山'),('黄石','黄石|大冶|阳新')]
def period_of(r):
 if r['id']=='hb-4693':return 'neolithic','旧石器时代','湖北省文物考古研究院将学堂梁子列为旧石器时代遗址；该院记录明确联系1989、1990年发现的两具头骨化石。'
 t=r['text'];lead=t.split('\n')[0]
 if r['category']=='jz':
  m=re.search(r'时代[：:]([^\n]+)',t);lead=m[1] if m else lead
 # Explicit chronological line only. Do not infer era from excavation year/site.
 for era,p in ERAS:
  m=re.search(p,lead)
  if m:return era,m[0].replace('�','—'),lead
 return None,None,lead
def place_of(r):
 if r['id']=='hb-4693':return '湖北省郧县青曲镇曲远河口学堂梁子','十堰'
 t=r['text'];m=re.search(r'(?:来源[：:])?([^，,\n。；：:]{1,70})出土',t)
 if not m:return None,None
 clause=m[1];clause=re.sub(r'^.*[）)]','',clause);clause=re.sub(r'^(?:左|右|中)[：:]?','',clause);clause=re.sub(r'^(?:\d{2,4})年?\s*','',clause).strip();clause=clause.replace('金陵包山','荆门包山').replace('号幕','号墓')
 city=next((city for city,pattern in CITY_PATTERNS if re.search(pattern,clause)),None)
 # Locations whose short site names already have a reviewed record.
 if city is None:
  for a in records:
   if clause and len(clause)>=4 and (clause==a['place'] or clause in a['place']):city=a['city'];break
 return clause,city
# Skip catalogue duplicates of existing objects under different article IDs.
ALIASES={'hb-5418':'hb-5452','hb-5420':'hb-5454','hb-4689':'hb-4694','hb-4692':'hb-4696','hb-4966':'drum','hb-4983':'hb-6914','hb-4732':'hb-4734','hb-4728':'hb-5369','hb-4726':'hb-5375','hb-5373':'hb-5379'}
# Last pair is NOT duplicate: whole-book edition vs distinct text leaf retained as separate catalogue record.
ALIASES.pop('hb-5373',None)
for r in sorted(crawled['records'],key=lambda r:(r['category'],r['id'])):
 reason=None;page=re.sub(r'^https?://(?:www\.hbww\.org\.cn|hbsbwg\.cjyun\.org)','',r['source'])
 if r['id'] in existing_ids or page in existing_pages:reason='existing record (or explicitly removed unknown findspot)'
 elif r['id']=='hb-4731':reason='museum photo mismatches title (spoon image on ding page)'
 elif r['id'] in ALIASES:reason='duplicate object; retained '+ALIASES[r['id']]
 era,period,period_evidence=period_of(r);place,city=place_of(r)
 if not reason and (not place or not city):reason='no unambiguous excavated location'
 if not reason and not era:reason='no explicit object-era evidence'
 if not reason and not r['images']:reason='no object photograph'
 if not reason and not r['title']:reason='not an object catalogue detail'
 sig=re.sub(r'\s|[，,。；：:（）()]','',r['title']+r['text'])
 if not reason and sig in signature:reason='duplicate catalogue text; retained '+signature[sig]
 if reason:rejected.append({'id':r['id'],'title':r['title'],'source':r['source'],'reason':reason});continue
 signature[sig]=r['id'];accepted.append({**r,'era':era,'period':period,'periodEvidence':period_evidence,'place':place,'city':city})
# Stable article ID ordering, no artificial splitting of group photographs.
# Import every eligible unique record; no numeric cap or sampling.
print('retained',len(records),'deleted',len(removed),'eligible additions',len(accepted),'total',len(records)+len(accepted),flush=True)
(OUT/'eligible.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2))
if '--inspect' in sys.argv:sys.exit()
def download(r):
 url=r['images'][0];suffix=Path(urllib.parse.urlsplit(url).path).suffix.lower();suffix=suffix if suffix in ['.jpg','.jpeg','.png','.webp'] else '.jpg';p=DIST/'assets'/('catalogue-'+r['id']+suffix)
 try:
  if not p.exists():
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':r['source']});p.write_bytes(urllib.request.urlopen(req,timeout=30).read())
  photo=Image.open(p);photo.verify();return r,p,None
 except Exception as e:return r,p,str(e)
GRADIENT_IDS=set('jz-477 jz-478 hb-4782 hb-4977 hb-4987 hb-4721 hb-4723 hb-4724 hb-5078 hb-5093 hb-5108 hb-5136 hb-5152 hb-5188'.split())
LIGHT_FLOOR_IDS=set('hb-5536 hb-4719 hb-4730 hb-4737 hb-4739 hb-4740 hb-4745 hb-4752 hb-4753 hb-4756 hb-4763 hb-5070 hb-5071 hb-5101 hb-5103 hb-5105 hb-5117 hb-5119 hb-5120 hb-5469'.split())
def alpha_for(photo,rid):
 reviewed=_overrides.reviewed_alpha(rid,photo)
 if reviewed is not None:return reviewed,[]
 # Learn the studio background from the perimeter; keep RGB intact.
 rgb=np.asarray(photo.convert('RGB'));h0,w0=rgb.shape[:2];scale=min(1,900/max(w0,h0));small=cv2.resize(rgb,(round(w0*scale),round(h0*scale)),interpolation=cv2.INTER_AREA);h,w=small.shape[:2]
 f=small.astype(float);border=np.concatenate([f[:2].reshape(-1,3),f[-2:].reshape(-1,3),f[:,:2].reshape(-1,3),f[:,-2:].reshape(-1,3)])
 bg=np.median(border,axis=0);distance=np.linalg.norm(f-bg,axis=2);neutral=f.max(2)-f.min(2)
 mask=np.full((h,w),cv2.GC_PR_FGD,np.uint8)
 lightbg=bg.min()>200
 if lightbg:
  mask[(f.min(2)>235)&(neutral<23)]=cv2.GC_PR_BGD
  near=((distance<20)&(neutral<28)).astype('uint8')
 else:near=(distance<18).astype('uint8')
 n,labels=cv2.connectedComponents(near);edgeids=np.unique(np.concatenate([labels[0],labels[-1],labels[:,0],labels[:,-1]]))
 for v in edgeids:
  if v:mask[labels==v]=cv2.GC_BGD
 if rid in LIGHT_FLOOR_IDS:
  mask[(f.min(2)>215)&(neutral<28)]=cv2.GC_BGD
 if rid in GRADIENT_IDS:
  nonwhite=f.min(2)<240
  columns=np.where(nonwhite.mean(0)>.56)[0]
  # Crop only the background model: the source canvas and all object RGB stay.
  lo,hi=(int(columns[0]),int(columns[-1])+1) if len(columns)>8 else (0,w)
  band=max(2,round((hi-lo)*.02));left=np.median(f[:,lo:lo+band],axis=1);right=np.median(f[:,hi-band:hi],axis=1)
  t=np.clip((np.arange(w)-lo)/max(1,hi-lo-1),0,1)[None,:,None];rowbg=left[:,None,:]*(1-t)+right[:,None,:]*t
  rd=np.linalg.norm(f-rowbg,axis=2)
  mask[rd<42]=cv2.GC_PR_BGD;mask[rd<22]=cv2.GC_BGD
  # Bright studio paper/gradient floor, only on bronze/dark wood photos.
  if rid not in {'jz-477','jz-478'}:mask[(f.min(2)>226)&(neutral<22)]=cv2.GC_BGD
 if rid in {'hb-4723','hb-5418','hb-5419'}:
  mask[round(h*.83):,round(w*.60):]=cv2.GC_BGD
 if rid=='hb-4724':cv2.ellipse(mask,(round(w*.50),round(h*.51)),(round(w*.26),round(h*.17)),0,0,360,cv2.GC_FGD,-1)
 if rid=='hb-4745':
  cv2.ellipse(mask,(round(w*.52),round(h*.19)),(round(w*.13),round(h*.13)),0,0,360,cv2.GC_FGD,-1)
 if rid in {'hb-4753','hb-5119','hb-5120','hb-5469'}:
  mask[(f.min(2)>180)&(neutral<18)]=cv2.GC_BGD
 if rid=='hb-5136':mask[round(h*.85):]=cv2.GC_BGD
 mask[0]=0;mask[-1]=0;mask[:,0]=0;mask[:,-1]=0
 cv2.setRNGSeed(13)
 try:cv2.grabCut(small,mask,None,np.zeros((1,65)),np.zeros((1,65)),5,cv2.GC_INIT_WITH_MASK)
 except cv2.error:pass
 binary=((mask==1)|(mask==3)).astype('uint8')
 # Remove detached single-pixel noise; retain all substantive object components.
 n,l,stats,_=cv2.connectedComponentsWithStats(binary,8);out=np.zeros_like(binary)
 for v in range(1,n):
  if stats[v,cv2.CC_STAT_AREA]>=max(5,h*w*.00004):out[l==v]=255
 alpha=Image.fromarray(out).resize((w0,h0),Image.Resampling.LANCZOS)
 return alpha,bg.tolist()
def features(r):
 if r['id']=='hb-4693':return '化石','化石',[],[],[]
 title=r['title'];feature_text=re.sub(r'[^，,。；\n]*出土[^，,。；\n]*[，,。；\n]?', '', r['text']);t=title+' '+feature_text;cat=r['category'];crafts=[];evidence=[];motifs=[]
 material={'qtq':'青铜','yuqi':'玉','jyq':'金银','tcq':'陶瓷','zhujian':'竹简','qmq':'漆木'}.get(cat,'')
 if re.search('琉璃|玻璃',title):material='玻璃'
 elif '玛瑙' in title:material='玛瑙'
 elif '水晶' in title:material='水晶'
 elif '竹' in title and cat=='qmq':material='竹'
 elif '木' in title and cat=='qmq' and '漆' not in t:material='木'
 if cat=='jz':material='陶' if '陶' in title else '玉' if '玉' in title else '青铜' if '铜' in title else '丝' if re.search('绣|绢|罗|锦',title) else '漆木'
 group={'玉':'玉石','玛瑙':'玉石','金银':'金银','陶':'陶瓷','漆木':'漆器','木':'木器','竹':'竹木','丝':'丝织'}.get(material,material)
 for name,p in [('彩绘','彩绘|彩漆'),('髹漆','髹|漆'),('浮雕','浮雕'),('透雕','透雕|镂空|镂孔'),('圆雕','圆雕'),('错金银','错金|错银|错金银'),('镶嵌','镶嵌|嵌红铜|嵌地|嵌玉'),('雕琢','雕刻|雕制|雕琢|琢'),('卷制','卷制'),('旋制','旋制'),('刻划','刻划|针刻|阴刻|锥画'),('烧造','烧造|烧制'),('捏塑','捏塑'),('织造','织造'),('刺绣','刺绣|纹绣'),('铸造','铸造|铸范|铸纹|失蜡')]:
  m=re.search(p,t)
  if m:crafts.append(name);evidence.append({'name':name,'kind':'馆方记录','basis':m[0]+'；见馆方题名/说明。','source':r['source']})
 for name,p in [('凤鸟','凤(?:鸟纹|纹|鱼纹|舞.*纹)|龙凤纹|云凤纹'),('禽鸟','(?<!凤)鸟纹|鸟兽纹'),('龙蛇','龙纹|蟠螭纹|蟠虺纹|夔龙纹|龙凤纹|云龙纹|龙云纹|蛇纹'),('云雷','云雷'),('云气','云纹|云气|连云'),('花卉','花卉|牡丹|菊花|莲纹|莲花|莲瓣|缠枝|草叶|植物纹'),('几何','几何|菱形|方格|点格|三角形|波折|网格|篮纹'),('兽面','兽面|饕餮'),('虎兽','虎纹|豹纹|兽纹'),('人像','人物.*(?:纹|图)|人像纹'),('铭文','铭文|刻字|墨书|烙印文字|针刻文字')]:
  if re.search(p,t) and not (name=='铭文' and cat=='zhujian'):motifs.append(name)
 return material,group,crafts,evidence,motifs
report=json.loads((ROOT/'docs/background-removal.json').read_text());details=json.loads((DIST/'data/detail-regions.json').read_text());contact=[];failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 downloaded=list(ex.map(download,accepted))
for ix,(r,path,error) in enumerate(downloaded):
 if error:failures.append({'id':r['id'],'reason':'image download failed','error':error});continue
 photo=Image.open(path).convert('RGB');alpha,bg=alpha_for(photo,r['id']);rgb=photo.convert('RGBA');rgb.putalpha(alpha);box=alpha.getbbox()
 if not box or (np.asarray(alpha)>100).mean()<(.002 if r['id'] in {'hb-5134','hb-5384','hb-4723','hb-5418'} else .015):
  failures.append({'id':r['id'],'reason':'foreground segmentation requires manual review'});continue
 # Trim only transparent canvas. Original source file is kept byte-for-byte.
 margin=4;box=(max(0,box[0]-margin),max(0,box[1]-margin),min(photo.width,box[2]+margin),min(photo.height,box[3]+margin));rgb=rgb.crop(box)
 display=f'cutouts/{r["id"]}-catalogue.webp';rgb.save(DIST/display,'WEBP',lossless=True,exact=True,method=6)
 material,group,crafts,evidence,motifs=features(r)
 desc=re.sub(r'\n\.\s*$','',r['text']).strip();fact='馆方记录：'+r['period']+'；'+r['place']+'出土。'
 a={'id':r['id'],'title':r['title'],'short':r['title'],'period':r['period'],'dateLabel':r['period'],'era':r['era'],'place':r['place'],'city':r['city'],'collection':'荆州博物馆' if r['category']=='jz' else '湖北省博物馆','material':material,'materialGroup':group,'source':r['source'],'sourceExtract':desc,'description':fact,'fact':fact,'evidence':desc,'observation':'对照器物整体轮廓与器表细节；照片色彩受拍摄光线和保存状态影响。','crafts':crafts,'craftEvidence':evidence,'motifs':motifs,'image':str(path.relative_to(DIST)),'original':r['images'][0],'displayImage':display,'displayForeground':True,'backgroundRemoval':'catalogue-alpha-only-v1','paletteMethod':'透明前景内采样；排除背景、半透明边缘与轮廓内侧 1 像素；色名综合色相、明度与饱和度判定','imageCredit':{'author':'荆州博物馆' if r['category']=='jz' else '湖北省博物馆','provider':'馆方公开典藏','page':r['source'],'changes':'仅去除摄影背景并裁切透明留白；保留原始照片及器物RGB，未重绘。','retrieved':'2026-10-11'},'catalogueReview':{'eraEvidence':r['periodEvidence'],'findspotEvidence':r['place']+'出土','source':r['source'],'reviewed':'2026-10-11'}}
 a['palette']=measured_palette(a,DIST);a['colors']=[p['name'] for p in a['palette']];records.append(a)
 if r['id']=='hb-4693':
  a.update(objectType='古人类化石',observation='古人类化石标本；馆方记录提及两具头骨，按一条馆藏记录收录。',description='旧石器时代古人类化石，1989年和1990年在学堂梁子发现。',fact='古人类化石标本，非人工制作器物；馆方记录提及两具头骨，照片按原图展示。')
  a['catalogueReview']['eraSource']='https://hbsbwg.cjyun.org/yjy_mtbd/p/7777.html'
  a['catalogueReview']['findspotEvidence']='1989年和1990年，先后在湖北省郧县青曲镇曲远河口的学堂梁子发现两具头骨化石。'
  a['imageCredit']['description']='馆方收藏的郧县人头骨化石照片。'
 report[a['id']]={'source':a['image'],'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'status':'foreground-ready','displayImage':display,'method':a['backgroundRemoval'],'crop':list(box),'removedFraction':round(float((np.asarray(alpha)==0).mean()),4),'backgroundSample':bg,'imageRepresentation':'object-photo'}
 regions=[{'id':'form','dimension':'form','value':'形制','rect':[0,0,1,1],'label':'器物整体','note':'馆方照片仅去除背景，保留器物整体形制；来源链接提供原始记录。','view':'form','basis':'馆方照片','source':r['source']}]
 # Do not invent cropped motif coordinates; a whole-object region is honest.
 for motif in motifs:regions.append({'id':'motif-'+motif,'dimension':'motifs','value':motif,'rect':[0,0,1,1],'label':motif+'所在器面','note':'纹样名称依据馆方文字；请在完整照片中放大观察，不重绘无法辨清的线条。','view':'context','basis':'馆方记录','source':r['source']})
 # Select a photograph-surface crop centred on real foreground. This is
 # explicitly an observation region, not a claimed isolated motif.
 am=np.asarray(rgb.getchannel('A'));sm=cv2.resize(am,(120,120),interpolation=cv2.INTER_AREA);density=cv2.boxFilter((sm>220).astype(float),-1,(25,25));density[:16]=0;density[-16:]=0;density[:,:16]=0;density[:,-16:]=0;cy,cx=np.unravel_index(density.argmax(),density.shape);cw=ch=.36;x=max(0,min(.64,cx/120-cw/2));y=max(0,min(.64,cy/120-ch/2))
 regions.append({'id':'surface','dimension':'surface','value':group,'rect':[round(x,4),round(y,4),cw,ch],'label':'器表观察','note':'放大观察照片中的表面、色差与保存状态；不据此推断未获文字确认的工艺或纹样。','view':'surface','basis':'照片观察','source':r['source']})
 details['artifacts'][a['id']]=regions;contact.append((a,rgb.copy()))
 if r['id']=='hb-4693':
  regions[0].update(label='化石全貌',note='馆方记录提及两具古人类头骨化石；本照片按原图展示，不拆分为多条记录。')
  regions[-1].update(label='化石表面观察',note='放大观察化石表面与保存状态，不附加工艺或纹样解释。')
 if ix%25==0:print('processed',ix+1,'/',len(downloaded),flush=True)
removed_ids={a['id'] for a in removed};details['artifacts']={k:v for k,v in details['artifacts'].items() if k in {a['id'] for a in records}}
report={k:v for k,v in report.items() if k in {a['id'] for a in records}}
records.sort(key=lambda a:([x[0] for x in ERAS].index(a['era']) if a['era']!='modern' else 99,a['city'],a['id']))
(DIST/'data/artifacts.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');(DIST/'data/detail-regions.json').write_text(json.dumps(details,ensure_ascii=False,indent=2)+'\n');(ROOT/'docs/background-removal.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
rubbings=json.loads((DIST/'data/rubbings.json').read_text());rubbings['entries']=[e for e in rubbings['entries'] if e['objectId'] not in removed_ids];(DIST/'data/rubbings.json').write_text(json.dumps(rubbings,ensure_ascii=False,indent=2)+'\n')
# Existing book objects do not reference removed records; fail rather than break links.
book=json.loads((DIST/'data/book-index.json').read_text());assert not any(o.get('existingId') in removed_ids for o in book['objects'])
for offset in range(0,len(contact),48):
 sheet=Image.new('RGB',(1440,1080),'#19171a');d=ImageDraw.Draw(sheet)
 for n,(a,im) in enumerate(contact[offset:offset+48]):
  im.thumbnail((162,135));x=(n%8)*180;y=(n//8)*180;sheet.paste(im,(x+(180-im.width)//2,y+(140-im.height)//2),im);d.text((x+8,y+145),a['id'],fill='#eeeeee');d.text((x+8,y+159),str(round(report[a['id']]['removedFraction']*100))+'% background',fill='#aaa')
 sheet.save(OUT/f'cutouts-{offset//48+1}.jpg')
audit={'date':'2026-10-11','scope':['荆州博物馆馆藏精品','湖北省博物馆10类典藏'],'cataloguePages':len(crawled['listPages']),'catalogueRecords':len(crawled['records']),'priorRecords':len(original),'removedUnlocated':[{k:a[k] for k in ['id','title','place','source']} for a in removed],'retainedPrior':len(original)-len(removed),'added':len(records)-(len(original)-len(removed)),'finalRecords':len(records),'rejected':rejected,'imageFailures':failures,'newIds':[a['id'] for a in records if a['id'] not in existing_ids],'notes':['物件组合及竹简组按原馆方条目保留，不拆成多件凑数。','同一博物馆的域名镜像按页面ID去重；同一器物重复文章合并。','缺年代或明确出土地者不进入图谱。','候选页面量不等于满足条件的独立馆藏量。']}
audit['categoryCatalogueRecords']=sum(r['category']!='zgzb' for r in crawled['records'])
audit['supplementaryTreasurePages']=sum(r['category']=='zgzb' for r in crawled['records'])
audit['scope'].append('湖北省博物馆镇馆之宝补查')
audit['outcomes']={'added':audit['added'],'existingRetainedPages':0,'existingUnknownFindspotRemovedPages':0,'noClearFindspot':0,'noEra':0,'duplicate':0,'wrongPhotograph':0,'other':0,'imageFailure':len(failures)}
for r in rejected:
 reason=r['reason']
 if reason.startswith('existing record'):
  key='existingUnknownFindspotRemovedPages' if r['id'] in removed_ids else 'existingRetainedPages'
 elif reason.startswith('no unambiguous'):key='noClearFindspot'
 elif reason.startswith('no explicit'):key='noEra'
 elif reason.startswith('duplicate'):key='duplicate'
 elif reason.startswith('museum photo'):key='wrongPhotograph'
 else:key='other'
 r['outcome']=key;audit['outcomes'][key]+=1
audit['retainedPriorOutsideCurrentListings']=audit['retainedPrior']-audit['outcomes']['existingRetainedPages']
audit['supplementaryEvidence']=[{'id':'hb-4693','source':'https://hbsbwg.cjyun.org/yjy_mtbd/p/7777.html','publisher':'湖北省文物考古研究院','basis':'学堂梁子为旧石器时代遗址；记录明确联系1989、1990年发现的两具头骨化石。','note':'仅采用时代分类，不将旧报道的具体数值作为最新测年结论。'}]
assert sum(audit['outcomes'].values())==audit['catalogueRecords']
(ROOT/'docs/catalogue-expansion-20261011.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n');print('DONE',audit['added'],'added;',audit['finalRecords'],'total;',len(failures),'image failures',flush=True)
