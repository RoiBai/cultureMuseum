import fs from 'node:fs';
import assert from 'node:assert/strict';
import {arrangeArtifacts} from '../dist/layout.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/artifacts.json',import.meta.url)));
const eraIds=['neolithic','shang','zhou','spring','warring','qin','han','jin','northsouth','sui','tang','five','song','yuan','ming','qing','modern'];
const eras=eraIds.map(id=>[id,id,id,id]);
const cities=[...new Set(data.map(a=>a.city))];
const reports=[];
for(const width of [320,390,580,768,1000,1200,1600]){
 const result=arrangeArtifacts(data,eras,cities,width);
 assert.equal(result.positions.size,data.length,'Every dated record remains visible');
 assert.equal(result.eras.length,new Set(data.map(a=>a.era)).size,'Empty eras are omitted');
 assert(result.eras.find(e=>e.id==='warring').rowCount>1,'Warring States wraps');
 for(const era of result.eras)if(era.count>result.columns)assert(era.rowCount>1,'Crowded eras wrap');
 for(const [id,p] of result.positions){
  assert(p.slot-18>=78,`${id}: normal-sized image slot`);
  assert(p.x-(p.slot-18)/2>=result.gutter,`${id}: within left boundary`);
  assert(p.x+(p.slot-18)/2<=width,`${id}: no horizontal overflow`);
  assert(result.rows.find(r=>r.key===p.rowKey).ids.includes(id));
 }
 for(const row of result.rows){
  const points=row.ids.map(id=>result.positions.get(id));
  for(let i=1;i<points.length;i++)assert(points[i].x-points[i-1].x>=points[i].slot-1,'Images never overlap');
  assert.equal(new Set(points.map(p=>p.y)).size,1,'Same display row shares a baseline');
  assert(points.every(p=>p.slot===result.slot),'Sparse rows keep the same object size as full rows');
  points.forEach((point,index)=>assert.equal(point.x,result.gutter+10+result.slot*(index+.5),'Rows retain the original fixed spacing'));
  const cityBands=result.bands.filter(b=>b.era===row.era&&b.row===row.index);
  for(const point of points){
   const artifact=data.find(a=>result.positions.get(a.id)===point);
   assert(cityBands.some(b=>b.city===artifact.city&&point.x>b.x&&point.x<b.x+b.width),'Each object stays inside its labelled city band');
  }
 }
 reports.push({width,columns:result.columns,imageSlot:result.slot-18,warringRows:result.eras.find(e=>e.id==='warring').rowCount,qingRows:result.eras.find(e=>e.id==='qing')?.rowCount||0});
}
fs.writeFileSync(new URL('../docs/layout-verification.json',import.meta.url),JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify({passed:true,widths:reports},null,2));
