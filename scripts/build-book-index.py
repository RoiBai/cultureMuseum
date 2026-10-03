"""Build the public book index from the three page-by-page reviewed inventories.

Run with Python 3: scripts/build-book-index.py /path/to/research/jingchu-book
No dates, provenances, identities or motif attributions are inferred by fuzzy matching.
"""
import argparse,hashlib,json,re
from pathlib import Path
from collections import Counter
p=argparse.ArgumentParser();p.add_argument('research',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[1];dist=root/'dist';research=args.research
reviews=[json.loads((research/f'review-{r}.json').read_text()) for r in ['001-100','101-200','201-301']]
manifest=json.loads((research/'manifest.json').read_text())
archive=json.loads((dist/'data/artifacts.json').read_text());atlas={a['id']:a for a in archive}
norm=lambda s:re.sub(r'\s+','',s).replace('\b','')
uid=lambda prefix,key:prefix+'-'+hashlib.sha256(key.encode()).hexdigest()[:12]
raw={i:norm((research/'pages'/f'{i:03}.txt').read_text()) for i in range(1,302)}
page_kinds={p['pdfPage']:p['kind'] for r in reviews for p in r['pages']}
reference_regions={};reference_entries=[];current_reference=None
reference_heading=re.compile(r'^\s*(?:本章)?参考文献\s*$')
running_heading=re.compile(r'^\s*(?:第[一二三四五六七八九十]+[章节]|引言)')
reference_number=re.compile(r'^\s*(?:\[\d+\]|\d+[.．])')
for page in range(7,302):
    lines=(research/'pages'/f'{page:03}.txt').read_text().splitlines()
    # A page classified as references can still begin with the chapter's final
    # paragraph. An explicit heading marks the actual boundary on mixed pages.
    in_references=page_kinds.get(page)=='references' and not any(reference_heading.fullmatch(line) for line in lines)
    if not in_references:current_reference=None
    region=[]
    for line in lines:
        if reference_heading.fullmatch(line):
            in_references=True;current_reference=None;continue
        if not in_references or not line.strip() or line.strip().isdigit() or running_heading.match(line):continue
        region.append(line)
        if reference_number.match(line):
            current_reference={'quoteParts':[]};reference_entries.append(current_reference)
        if current_reference is None:continue
        parts=current_reference['quoteParts']
        if not parts or parts[-1]['pdfPage']!=page:parts.append({'pdfPage':page,'quote':''})
        parts[-1]['quote']+=norm(line)
    reference_regions[page]=norm(''.join(region))
for entry in reference_entries:
    entry.update({'pdfPage':entry['quoteParts'][0]['pdfPage'],'quote':''.join(p['quote'] for p in entry['quoteParts']),'context':'reference-only'})
    if len(entry['quoteParts'])>1:entry['sourcePages']=[p['pdfPage'] for p in entry['quoteParts']]
    else:entry.pop('quoteParts')

def is_reference(m):
    if m.get('context')=='reference-only' or 'reference-only' in str(m.get('notes','')):return True
    parts=m.get('quoteParts') or [m]
    return all(norm(part['quote']) and norm(part['quote']) in reference_regions.get(part['pdfPage'],'') for part in parts)

# These are bibliography search terms, not aliases asserting artifact identity.
reference_terms={
    '荆州刘家台楚墓彩绘漆镇墓兽':['彩绘漆镇墓兽'],
    '马山一号楚墓丝织品':['马山一号墓中楚绣'],
}
def reviewed_passages(record,field):
    terms=[norm(x) for x in [record['name'],*record.get('aliases',[]),*reference_terms.get(record['name'],[])]]
    for mention in record[field]:
        if not is_reference(mention):yield mention;continue
        parts=mention.get('quoteParts') or [mention]
        page_quotes={p['pdfPage']:norm(p['quote']) for p in parts}
        matches=[]
        for entry in reference_entries:
            if not any(term in norm(entry['quote']) for term in terms):continue
            entry_parts=entry.get('quoteParts') or [entry]
            if any(p['pdfPage'] in page_quotes and (norm(p['quote']) in page_quotes[p['pdfPage']] or page_quotes[p['pdfPage']] in norm(p['quote'])) for p in entry_parts):matches.append(entry)
        # Retain unmatched reviewed evidence with its correct context rather than
        # guess which reference title was intended by the reviewer.
        yield from matches or [{**mention,'context':'reference-only'}]

body_blocks={}
for i in range(7,302):
    text=(research/'pages'/f'{i:03}.txt').read_text()
    text=re.sub(r'^\s*(?:第[一二三四五六七八九十]+[章节]|引言)[^\n]*$', '\n\n',text,flags=re.M)
    blocks=[]
    if page_kinds.get(i)=='references' and not any(reference_heading.fullmatch(line) for line in text.splitlines()):body_blocks[i]=blocks;continue
    for b in re.split(r'\n\s*\n',text):
        s=norm(b)
        if not s or s.isdigit() or re.match(r'^图\d',s):continue
        if s.startswith(('参考文献','本章参考文献')) or re.match(r'^(?:\[\d+\]|\d+[.．])',s):break
        blocks.append(s)
    body_blocks[i]=blocks
def incomplete(s):
    s=re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹]+$','',s)
    return len(s)>60 and s[-1] not in '。！？；：”）》.]'
def complete_paragraph(m):
    if m.get('quoteParts') or m.get('quoteSource')=='visual-transcription' or m.get('context')=='reference-only':return m
    q=norm(m['quote']);p=m['pdfPage'];parts=[{'pdfPage':p,'quote':m['quote']}]
    blocks=body_blocks.get(p,[])
    if not blocks or len(q)<60 or re.match(r'^(?:图\d|\[\d+\]|\d)',q):return m
    if q==blocks[0] and p>7 and body_blocks.get(p-1) and incomplete(body_blocks[p-1][-1]):
        parts.insert(0,{'pdfPage':p-1,'quote':body_blocks[p-1][-1]})
    if blocks[-1].endswith(q) and incomplete(q) and body_blocks.get(p+1):
        parts.append({'pdfPage':p+1,'quote':body_blocks[p+1][0]})
    if len(parts)==1:return m
    # Every component is validated against its own PDF page below.
    return {**m,'pdfPage':parts[0]['pdfPage'],'quote':''.join(x['quote'] for x in parts),'sourcePages':[x['pdfPage'] for x in parts],'quoteParts':parts}

# Only identities established by the reviewed text or the current catalog.
groups=[
 ('青铜鹿角立鹤',['鹿角立鹤'],'crane'),
 ('龙凤虎纹绣罗单衣',['龙凤虎纹绣罗'],'jz-357'),
 ('楚帛书',['长沙子弹库楚帛书','子弹库楚帛书'],None),
 ('曾侯乙墓彩绘内棺',['曾侯乙墓漆棺','曾侯乙墓漆内棺'],None),
 ('包山二号墓车马纹漆奁',['包山楚墓彩绘人物车马出行图漆奁'],'hb-6914'),
 ('猪形漆酒具盒',['猪形酒具盒'],'jz-458'),
 ('九连墩二号墓虎座鸟架鼓',[],'drum'),
 ('天星观虎座鸟架鼓',[],'jz-459'),
 ('鹿角双头镇墓兽',[],'guardian'),
 ('曾侯乙编钟',[],'hb-4695'),('曾侯乙尊盘',[],'hb-6911'),('越王勾践剑',[],'hb-4694'),
 ('元青花四爱图梅瓶',[],'hb-4696'),('睡虎地秦简',['云梦睡虎地秦简'],'hb-6912'),
 ('战国漆木绘凤鸟莲花盖豆',[],'dou'),
]
names={alias:(name,eid) for name,als,eid in groups for alias in [name,*als]}
for a in archive:
    # New specifically researched catalog entries can provide their book identity.
    catalog_aliases=[a['title'],*a.get('aliases',[])]
    canonical=next((alias for alias in catalog_aliases if alias in ['楚帛书','王子午鼎']),None)
    if canonical:
        # Propagate the established ID through the whole confirmed group so its
        # earlier aliases cannot create a second, unlinked object record.
        for alias,(name,eid) in list(names.items()):
            if name==canonical:names[alias]=(canonical,a['id'])
        for alias in [canonical,*catalog_aliases]:
            if alias not in names or names[alias][0]==canonical:names[alias]=(canonical,a['id'])
motif_names={
 '凤鸟':'凤鸟纹','龙蛇':'龙蛇复合形态','水纹':'水波纹','饕餮纹':'饕餮',
 '赤黑':'赤黑配色','赤黑组合':'赤黑配色','云纹':'云气纹','车马纹':'车马出行图',
 '二方连续':'二方连续纹样','虎形':'虎','棕色':'棕','飞翔':'飞翔与乘御',
}
passages={};passage_keys={};checked=0;visual_checked=0
def add_passage(m):
    global checked,visual_checked
    m=complete_paragraph(m)
    quote=m['quote'];page=m['pdfPage'];source=m.get('quoteSource','text-layer')
    # The three figure labels were transcribed in the visual sweep, not extracted.
    if page==257 and quote in ['晴川阁','户部巷','斗级营']:source='visual-transcription'
    parts=m.get('quoteParts') or [{'pdfPage':page,'quote':quote}]
    assert norm(quote)==''.join(norm(part['quote']) for part in parts),(page,'quoteParts mismatch')
    assert page==parts[0]['pdfPage'],(page,'quoteParts start page mismatch')
    if m.get('sourcePages'):assert m['sourcePages']==list(dict.fromkeys(part['pdfPage'] for part in parts)),(page,'sourcePages mismatch')
    if source=='visual-transcription':visual_checked+=1
    else:
        for part in parts:
            assert norm(part['quote']) in raw[part['pdfPage']],(page,quote[:100])
        checked+=1
    key=(tuple(x['pdfPage'] for x in parts),norm(quote),source,m.get('context',''))
    if key in passage_keys:return passage_keys[key]
    identifier=uid('p',json.dumps(key,ensure_ascii=False))
    item={'id':identifier,'quote':quote,'pdfPage':page,'printedPage':page-6,'quoteSource':source}
    if m.get('sourcePages'):item['sourcePages']=m['sourcePages']
    if m.get('quoteParts'):item['quoteParts']=[{**x,'printedPage':x['pdfPage']-6} for x in m['quoteParts']]
    if m.get('context'):item['context']=m['context']
    passages[identifier]=item;passage_keys[key]=identifier;return identifier
objects={};motifs={}
contemporary_names={'荆州博物馆文创'}
in_products=False
for o in reviews[2]['objects']:
    if o['name']=='凤栖金簪':in_products=True
    if in_products and o['kind'] not in ['site','architecture']:contemporary_names.add(o['name'])
for review in reviews:
    for o in review['objects']:
        kind=o['kind'];name=o['name'];notes=o.get('notes','');existing=o.get('existingId')
        if isinstance(notes,list):notes='；'.join(notes)
        if name in contemporary_names and not (name=='橘颂' and kind=='document'):kind='contemporary'
        if review['range']==[201,301] and name=='虎座鸟架鼓':
            existing=None;kind='object-family'
        # Titles with the same text can refer to a poem, a product, or a generic form.
        if name in names and kind!='contemporary' and not (kind=='object-family' and name=='虎座鸟架鼓'):
            name,eid=names[name];existing=eid or existing
        if existing=='drum':name='九连墩二号墓虎座鸟架鼓';kind='artifact'
        if name=='楚帛书':kind='artifact'
        key=('atlas:'+existing) if existing else kind+':'+name
        if key not in objects:objects[key]={'id':uid('book',key),'name':name,'aliases':[],'kind':kind,'passageIds':[],'motifIds':[],'notes':[]}
        item=objects[key]
        for alias in [o['name'],*o.get('aliases',[])]:
            if alias!=item['name'] and alias not in item['aliases']:item['aliases'].append(alias)
        for k in ['period','place']:
            if o.get(k) and not item.get(k):item[k]=o[k]
        if notes and notes not in item['notes']:item['notes'].append(notes)
        if existing:item['existingId']=existing
        item['passageIds'] += [add_passage(m) for m in reviewed_passages(o,'mentions')]
    for m in review['motifs']:
        name=motif_names.get(m['name'],m['name']);key=name
        if key not in motifs:motifs[key]={'id':uid('motif',name),'name':name,'aliases':[],'category':m['category'],'passageIds':[],'objectIds':[]}
        item=motifs[key]
        for alias in [m['name'],*m.get('aliases',[])]:
            if alias!=name and alias not in item['aliases']:item['aliases'].append(alias)
        item['passageIds'] += [add_passage(q) for q in reviewed_passages(m,'passages')]
def dedupe_refs(ids):
    ordered=sorted(set(ids),key=lambda x:(passages[x]['pdfPage'],passages[x]['id']))
    # Suppress a shorter duplicate excerpt if the very same page is quoted fully.
    return [i for i in ordered if not any(i!=j and passages[i]['pdfPage']==passages[j]['pdfPage'] and passages[i]['quoteSource']==passages[j]['quoteSource'] and passages[i].get('context')==passages[j].get('context') and len(norm(passages[i]['quote']))<len(norm(passages[j]['quote'])) and norm(passages[i]['quote']) in norm(passages[j]['quote']) for j in ordered)]
for x in [*objects.values(),*motifs.values()]:x['passageIds']=dedupe_refs(x['passageIds'])

for o in objects.values():
    eid=o.get('existingId');a=atlas.get(eid)
    if a:
        o.update({'image':a.get('displayImage') or a['image'],'imageLabel':a.get('imageKind') or '现有馆藏档案照片','period':a['period'],'place':a['place'],'collection':a['collection']})
        o['url']='object.html?id='+eid
        o['aliases']=list(dict.fromkeys([*o['aliases'],a['title'],*a.get('aliases',[])]))
    else:o['url']='book-object.html?id='+o['id']
    o['notes']='；'.join(o['notes'])

# Selected book figures retain their own provenance; no inferred reconstruction.
figure_file=dist/'data/book-figures.json'
if figure_file.exists():
    figures=json.loads(figure_file.read_text())
    for o in objects.values():
        figure=figures.get(o['name'])
        if figure:
            o['bookFigure']=figure
            if not o.get('image'):
                o['image']=figure['src'];o['imageLabel']='本书配图 · 正文第'+str(figure['pdfPage']-6)+'页'

# Links mean co-mention in the same source paragraph, never automatic motif tagging.
by_page={}
for o in objects.values():
    for pid in o['passageIds']:
        q=passages[pid]
        if q.get('context')=='reference-only':continue
        by_page.setdefault(q['pdfPage'],[]).append((o,pid))
for m in motifs.values():
    for pid in m['passageIds']:
        q=passages[pid]
        if q.get('context')=='reference-only' or q['quoteSource']=='visual-transcription' or len(q['quote'])<30:continue
        for o,opid in by_page.get(q['pdfPage'],[]):
            oq=passages[opid]
            if len(oq['quote'])<30:continue
            a,b=norm(q['quote']),norm(oq['quote'])
            if a in b or b in a:
                if o['id'] not in m['objectIds']:m['objectIds'].append(o['id'])
                if m['id'] not in o['motifIds']:o['motifIds'].append(m['id'])

pages=sorted([x for r in reviews for x in r['pages']],key=lambda x:x['pdfPage'])
assert [x['pdfPage'] for x in pages]==list(range(1,302)) and all(x['reviewed'] for x in pages)
for x in pages:
    x['objectCount']=len(x.get('objectNames',[]));x['motifCount']=len(x.get('motifNames',[]))
    x['imageCount']=manifest['pages'][x['pdfPage']-1]['imageCount']
    x['figureReviewed']=bool(x['imageCount'])
used={i for x in [*objects.values(),*motifs.values()] for i in x['passageIds']}
output={
 'source':{'title':manifest['title'],'pdfPages':301,'bodyStart':7,'printedBodyPages':295,'sha256':manifest['sha256'],'pageNote':'PDF第7页对应正文第1页。封面、空白页和目录另记，不混用页码。','quotationNote':'原文摘录仅去除版面换行与多余空白；保留原字与标点。书中解释作为本书观点呈现。'},
 'coverage':{'reviewedPages':301,'textEvidenceChecked':checked,'visualEvidenceChecked':visual_checked,'pages':pages,'objectKinds':dict(Counter(o['kind'] for o in objects.values()))},
 'passages':sorted([q for k,q in passages.items() if k in used],key=lambda q:(q['pdfPage'],q['id'])),
 'motifs':list(motifs.values()),'objects':list(objects.values())}
(dist/'data/book-index.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
report={'pages':301,'sourceSHA256':manifest['sha256'],'objects':len(objects),'objectKinds':output['coverage']['objectKinds'],'motifs':len(motifs),'passages':len(used),'textEvidenceChecked':checked,'visualEvidenceChecked':visual_checked,'quoteFailures':0}
(root/'docs/book-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
