import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=new URL('../dist/',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('data/artifacts.json',root),'utf8'));
const failures=[];const assert=(ok,message)=>{if(!ok)failures.push(message)};
const allowedEras=new Set(['neolithic','shang','zhou','spring','warring','qin','han','jin','northsouth','sui','tang','five','song','yuan','ming','qing','modern']);
assert(data.length>=100,'Dataset must expand substantially beyond original 44 records');
assert(new Set(data.map(a=>a.id)).size===data.length,'Artifact IDs are unique');
for(const a of data){
  assert(allowedEras.has(a.era),a.id+' has a supported era');
  for(const k of ['title','period','city','place','collection','source','material','paletteMethod'])assert(a[k],a.id+' missing '+k);
  assert(/^https?:\/\/(www\.)?(hbww\.org\.cn|jzmsm\.org|hbsbwg\.cjyun\.org)\//.test(a.source),a.id+' has primary museum source');
  assert(fs.existsSync(new URL(a.image,root)),a.id+' image exists');
  assert(a.displayImage&&fs.existsSync(new URL(a.displayImage,root)),a.id+' transparent foreground exists');
  if(a.mask)assert(fs.existsSync(new URL(a.mask,root)),a.id+' mask exists');
  assert(a.palette.length>0&&a.palette.every(c=>/^#[a-f0-9]{6}$/i.test(c.hex)),a.id+' measured photo palette');
  assert(a.crafts.length&&a.craftEvidence.length===a.crafts.length,a.id+' craft provenance');
  assert(Array.isArray(a.motifs),a.id+' motif metadata');
}
const dou=data.find(a=>a.id==='dou');for(const c of ['浮雕','圆雕','透雕'])assert(dou.crafts.includes(c),'Lotus vessel includes documented '+c);
assert(data.find(a=>a.id==='jz-463').city==='荆门','Preserve corrected Cheqiao geography');
assert(data.find(a=>a.id==='jz-352').city==='出土地待核','Do not invent a city for unlocated Xinqiao record');
const names=['app.js','foreground.js','layout.js','visual-language.js','atlas3d.js','atlas3d-layout.js','atlas3d-camera.js'];for(const file of names)execFileSync(process.execPath,['--check',fileURLToPath(new URL(file,root))]);
const report={records:data.length,eras:[...new Set(data.map(a=>a.era))].length,cities:[...new Set(data.map(a=>a.city))].length,unlocated:data.filter(a=>a.city==='出土地待核').length,failures};
fs.writeFileSync(new URL('../docs/verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
