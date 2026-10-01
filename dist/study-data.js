export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const featureNames={motifs:'纹样',crafts:'工艺',colors:'色彩',materialGroup:'材质'};
export const birdMotifs=['凤鸟','禽鸟'];
export const hasFeature=(a,key,value)=>key==='motifs'&&value==='鸟类'?a.motifs.some(v=>birdMotifs.includes(v)):(Array.isArray(a[key])?a[key]:[a[key]]).includes(value);
export const objectURL=id=>'object.html?id='+encodeURIComponent(id);
export const compareURL=(id,key,value)=>`compare.html?id=${encodeURIComponent(id)}&by=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`;
export const wholeRegion={id:'whole',rect:[0,0,1,1],label:'整件器物',note:'保留整体形制、色彩与材质的观感。',view:'form'};
export function regionFor(a,regions,key,value){
 if(key==='colors'||key==='materialGroup')return {...wholeRegion,value};
 const options=regions[a.id].filter(r=>r.dimension===key&&(value==='鸟类'?birdMotifs.includes(r.value):r.value===value));
 return options.find(r=>!['unseen','context'].includes(r.view))||options[0]||wholeRegion;
}
export function comparisonSet(data,regions,id,key,value){
 const current=data.find(a=>a.id===id);if(!current||!featureNames[key]||!hasFeature(current,key,value))return null;
 const matches=data.filter(a=>hasFeature(a,key,value));
 return {current,others:matches.filter(a=>a.id!==id),count:matches.length,region:a=>regionFor(a,regions,key,value)};
}
export async function loadArchive(){
 const responses=await Promise.all([fetch('data/artifacts.json',{cache:'no-cache'}),fetch('data/detail-regions.json',{cache:'no-cache'})]);
 if(responses.some(r=>!r.ok))throw new Error('器物资料暂时无法读取，请刷新重试。');
 const [data,details]=await Promise.all(responses.map(r=>r.json()));return {data,regions:details.artifacts};
}
export function primaryRegions(list){
 const picked=[];const seen=new Set();
 const add=r=>{if(!r||r.view==='unseen'||seen.has(r.rect.join(',')))return;seen.add(r.rect.join(','));picked.push(r)};
 list.filter(r=>r.dimension==='motifs').forEach(add);
 list.filter(r=>r.dimension==='crafts'&&r.view==='detail').forEach(add);
 list.filter(r=>r.dimension==='crafts').forEach(add);
 add(list.find(r=>r.dimension==='surface'));add(list.find(r=>r.dimension==='form'));
 return picked.slice(0,3).sort((a,b)=>(a.rect[1]+a.rect[3]/2)-(b.rect[1]+b.rect[3]/2));
}
export const validRect=r=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[0]>=0&&r[1]>=0&&r[2]>0&&r[3]>0&&r[0]+r[2]<=1.000001&&r[1]+r[3]<=1.000001;
export function cropOverride(id,region){try{const rect=JSON.parse(sessionStorage.getItem(`jingchu-crop:${id}:${region.id}`));return validRect(rect)?rect:region.rect}catch{return region.rect}}
export function saveCrop(id,region,rect){try{sessionStorage.setItem(`jingchu-crop:${id}:${region.id}`,JSON.stringify(rect))}catch{}}
export const viewLabel=r=>r.view==='unseen'?'此角度未呈现':r.view==='context'?'纹样所在器面':r.view==='form'?'造型局部':r.view==='surface'?'器表观察':'局部细节';
