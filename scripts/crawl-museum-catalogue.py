"""Read-only public museum catalogue crawl; cache responses, canonicalize aliases.
Run with Python 3; only urllib is needed. No user accounts or private endpoints.
"""
from pathlib import Path
import urllib.request,urllib.parse,hashlib,json,re,html,concurrent.futures,time
ROOT=Path(__file__).resolve().parents[1]; CACHE=Path('/tmp/jingchu-museum-crawl-20261011');CACHE.mkdir(exist_ok=True)
CATS=['zgzb','qtq','qmq','jyq','zhujian','yuqi','tcq','shuhua','gjsb','gymsjp']
errors=[]
def read(url):
 key=hashlib.sha256(url.encode()).hexdigest();p=CACHE/(key+'.html')
 if p.exists():return p.read_text()
 for trial in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; CultureMuseum catalogue review)'})
   content=urllib.request.urlopen(req,timeout=30).read().decode('utf-8',errors='replace');p.write_text(content);return content
  except Exception as e:
   if trial==2: errors.append({'url':url,'error':str(e)});return ''
   time.sleep(1+trial)
def text(s):
 s=re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>','',s,flags=re.S|re.I)
 s=re.sub(r'</(?:p|div|h\d)>|<br\s*/?>','\n',s,flags=re.I);s=html.unescape(re.sub('<[^>]+>','',s));return '\n'.join(re.sub(r'[ \t\xa0]+',' ',x).strip() for x in s.splitlines() if x.strip())
def batch(urls):
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:return list(zip(urls,ex.map(read,urls)))
seen=set();pending=['https://www.hbww.org.cn/'+cat+'/index.html' for cat in CATS];items={};lists=[]
while pending:
 for url,s in batch(pending):
  seen.add(url);cat=url.split('/')[3]
  links=set(re.findall(r'/(?:'+ '|'.join(CATS)+r')/p/\d+\.html',s))
  if cat=='zgzb':
   body=s.split('id="list',1)[-1] if 'id="list' in s else s
   links.update('/zgzb'+path for path in re.findall(r'href=["\'](/p/(?:469[3-6]|691[1-6])\.html)',body))
  lists.append({'url':url,'records':len(links)})
  for path in links:items['hb-'+re.search(r'/p/(\d+)',path)[1]]={'source':'https://www.hbww.org.cn'+path,'category':path.split('/')[1]}
  for n in re.findall(r'index_(\d+)\.html',s):
   nxt='https://www.hbww.org.cn/'+cat+'/index_'+n+'.html'
   if nxt not in seen:seen.add(nxt)
 print('listed',len(seen),'pages;',len(items),'Hubei records',flush=True)
 pending=sorted(seen-{x['url'] for x in lists})
for page in [1,2]:
 url='http://www.jzmsm.org/news/index-cate_id-17.html' if page==1 else 'http://www.jzmsm.org/news/index-cate_id-17?page=2'
 s=read(url);links=set(re.findall(r'/news-(\d+)\.html',s));lists.append({'url':url,'records':len(links)})
 for id in links:items['jz-'+id]={'source':'http://www.jzmsm.org/news-'+id+'.html','category':'jz'}
# Catalogue pages, not all news across the website, define the audited scope.
records=[]
for k,(url,s) in zip(items,batch([x['source'] for x in items.values()])):
 meta=items[k];rec={'id':k,**meta}
 if k.startswith('hb'):
  section=s.split('id="mainarticle"',1)[-1].split('article_share',1)[0]
  title=re.search(r'<h2[^>]*>(.*?)</h2>',section,re.S)
  rec['title']=text(title[1]) if title else ''
  content=section.split('article_content m2a',1)[-1];content=content.split('>',1)[-1]
  rec['text']=text(content)
  rec['images']=[html.unescape(x) for x in re.findall(r'<img[^>]+src=["\']([^"\']+)',section)]
 else:
  # The detail article text starts at the object title and ends before pagination/footer.
  section=s.split('class="newsinfo"',1)[-1] if 'class="newsinfo"' in s else s
  plain=text(section);p=re.search(r'【([^】]+)】',plain)
  rec['title']=p[1] if p else ''
  rec['text']=plain[plain.find('【'):].split('上一篇')[0].split('下一篇')[0].split('收藏：')[0] if p else plain
  rec['images']=['http://www.jzmsm.org'+x if x.startswith('/') else x for x in re.findall(r'<img[^>]+src=["\']([^"\']+)',section) if '/upload/' in x]
 records.append(rec)
 if len(records)%50==0:print('details',len(records),flush=True)
report={'retrieved':'2026-10-11','museumCount':2,'aliasNote':'hbsbwg.cjyun.org and www.hbww.org.cn are the same Hubei Provincial Museum catalogue; canonicalized by page ID.','listPages':lists,'records':[r for r in records if r['title']],'nonObjectLinks':[r for r in records if not r['title']],'errors':errors}
(ROOT/'sources/museum-catalogue-20261011.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('DONE',len(records),'records,',len(lists),'listing pages,',len(errors),'errors',flush=True)
