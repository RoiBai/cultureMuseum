"""Build a map index from cited findspots; never use museum addresses as findspots."""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
artifacts=json.loads((DIST/'data/artifacts.json').read_text())
legacy_path=ROOT/'sources/excavation-sites.json'
legacy=json.loads(legacy_path.read_text())['sites']
by_id={id:s for s in legacy for id in s['artifactIds']}
patterns=[('肖家屋脊','xiaojiawuji'),('石家河','shijiahe'),('曾侯乙|擂鼓墩','zenghouyi-leigudun'),('望山','wangshan'),('包山','baoshan'),('天星观','tianxingguan'),('马山','mashan'),('熊家冢','xiongjiazhong'),('九连墩','jiuliandun'),('睡虎地','shuihudi'),('盘龙城','panlongcheng'),('九店','jiudian-yutai'),('秦家咀|秦家嘴','qinjiazui')]
groups={};records={};unlocated=[]
for a in artifacts:
    t=a.get('sourceExtract','')+' '+a['place']
    # The year must be directly tied to excavation/discovery in the record.
    m=re.search(r'((?:18|19|20)\d{2})(?:\s*[-—至]\s*((?:18|19|20)\d{2}))?年[^。；\n]{0,35}?(?:出土|发掘|发现)',t)
    date=None
    if m:
        start,end=int(m[1]),int(m[2] or m[1]);date={'from':start,'to':end,'label':str(start)+(('—'+str(end)) if end!=start else '')+'年','evidence':m[0],'source':a['source']}
    site=by_id.get(a['id'])
    if not site:
        match=next((sid for pattern,sid in patterns if re.search(pattern,a['place'])),None)
        site=next((s for s in legacy if s['id']==match),None)
    if a['city']=='出土地待核':
        unlocated.append(a['id']);records[a['id']]={'siteId':None,'excavation':date};continue
    if site:
        key=site['id']
        if key not in groups:groups[key]={k:v for k,v in site.items() if k!='artifactIds'};groups[key]['artifactIds']=[]
    else:
        # Distinct named sites retain their own records even at city-level precision.
        name=re.sub(r'^(?:湖北)?(?:荆州|江陵|随州|武汉|荆门|枣阳|云梦|鄂州|黄冈)','',a['place'])
        key='record-'+hashlib.sha1((a['city']+name).encode()).hexdigest()[:10]
        if key not in groups:groups[key]={'id':key,'name':a['place'],'city':a['city'],'coordinate':None,'positionAccuracy':'city-range','positionNote':'现有资料仅定位到出土城市；地图使用城市范围点，不表示具体遗址或墓坑。','sources':[{'title':a['title']+' · 馆方出土记录','url':a['source']}],'artifactIds':[]}
    groups[key]['artifactIds'].append(a['id']);records[a['id']]={'siteId':key,'excavation':date}
geo=json.loads((DIST/'map-data/hubei.geojson').read_text())
anchors=json.loads((DIST/'map-data/geography-sources.json').read_text())['anchors']
for site in groups.values():
    if site['coordinate']:
        site['displayCoordinate']=site['coordinate'];site['displayCoordinateSystem']='WGS84'
    else:
        anchor=next((x for x in anchors if x['name'].startswith(site['city'])),None)
        feature=next((x for x in geo['features'] if x['properties']['name'].startswith(site['city'])),None)
        coordinate=anchor['coordinates'] if anchor else feature['properties']['center'] if feature else None
        site.update(displayCoordinate=coordinate,displayCoordinateSystem='GCJ-02',positionAccuracy='city-range',positionNote='仅定位到'+site['city']+'范围；光点不代表具体墓坑位置。')
        if coordinate:site['sources'].append({'title':'DataV 现代行政区城市范围参考','url':'https://geo.datav.aliyun.com/areas_v3/bound/420000_full.json'})
data={'version':1,'coordinateNote':'现代湖北地形用于定位，不表示历史楚国疆域。实心点为遗址/乡镇范围，空心点仅到城市。','sites':list(groups.values()),'records':records,'unlocated':unlocated}
(DIST/'map-data/excavations.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sites':len(groups),'locatedObjects':len(artifacts)-len(unlocated),'unlocated':len(unlocated),'datedObjects':sum(bool(r['excavation']) for r in records.values())}))
