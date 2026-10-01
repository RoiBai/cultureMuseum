import {museumForeground} from './foreground.js';
import {arrangeArtifacts} from './layout.js';
import {filterSample, glyphBody, materialPattern, materialSpec} from './visual-language.js';
import {featureValues as values,isKnownFeature} from './feature-values.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paletteColors={'赤红':'#a33e30','漆黑':'#302d2a','赭褐':'#80543b','金黄':'#bcaa4f','青绿':'#56786b','灰绿':'#777965','灰褐':'#8b8070','墨灰':'#62615d','灰白':'#b7b4a9','靛蓝':'#45667c','绛紫':'#785469'};
const cityTones=['#8b8750','#a66553','#648d7a','#9d7d49','#76739b','#7e9061','#a58345','#618c91','#687d9a','#ad806b','#659481','#8a7696','#a09254','#a46d78','#8c887d'];
const eraDefs=[
 ['neolithic','史前','新石器时代','01'],['shang','商','含商至西周早期','02'],['zhou','西周','西周时期','03'],['spring','春秋','春秋时期','04'],
 ['warring','战国','含春秋末—战国初','05'],['qin','秦','秦代','06'],['han','汉','两汉时期','07'],['jin','魏晋','三国 · 两晋','08'],
 ['northsouth','南北朝','南北朝时期','09'],['sui','隋','隋代','10'],['tang','唐','唐代','11'],['five','五代十国','五代十国时期','12'],
 ['song','宋','两宋时期','13'],['yuan','元','元代','14'],['ming','明','明代','15'],['qing','清','清代','16'],['modern','近现代','近现代','17']
];
const dims=[
 {key:'crafts',name:'工艺',english:'CRAFT',open:false,preferred:['髹漆','彩绘','铸造','刺绣','透雕','雕琢','釉下彩','鎏金','贴金','镶嵌','错金','圆雕','浮雕','烧造','书写'],note:'虚线串联工艺图标；具体工艺依据见档案。'},
 {key:'colors',name:'色彩',english:'COLOUR',open:true,preferred:Object.keys(paletteColors),note:'仅按照片前景取色；馆方文字颜色另列于档案。'},
 {key:'motifs',name:'纹样 / 母题',english:'MOTIF',open:true,preferred:['凤鸟','龙蛇','虎豹','花卉','云雷','几何','鱼纹','兽面','人像','铭文','鹿角','禽鸟'],note:'同时包含器表纹样与立体造型母题。'},
 {key:'materialGroup',name:'材质',english:'MATERIAL',open:true},
 {key:'city',name:'出土地',english:'PLACE',open:false}
];
let artifacts=[],cities=[],positions=new Map(),eraRows=[],displayRows=[],selected=Object.fromEntries(dims.map(d=>[d.key,new Set()]));
let nodes=new Map(),width=0,height=0,matchIds=new Set(),activePaths=[],imageFailures=[];
let view='2d', atlas3d=null, threeLoading=null, groupDimension='colors';
const photoCache=new Map();
const label=(key,value)=>key==='era'?(eraDefs.find(e=>e[0]===value)?.[1]||value):value;
function matches(a,except){return dims.every(d=>d.key===except||selected[d.key].size===0||values(a,d.key).some(v=>selected[d.key].has(v)))}
function hasFilters(){return dims.some(d=>selected[d.key].size)}

async function picture(a,container){
  if(container.dataset.loading)return;container.dataset.loading='true';
  if(!photoCache.has(a.id))photoCache.set(a.id,(async()=>{
    const photo=new Image();photo.src=a.displayImage||a.image;await photo.decode();
    if(a.displayForeground&&!a.displayImage){return await museumForeground(a,photo)}
    photo.className=a.displayImage?'artifact-object':'fallback-photo';photo.alt=a.title;return photo;
  })().catch(e=>{imageFailures.push({id:a.id,message:e.message});const photo=new Image();photo.src=a.image;photo.className='fallback-photo';photo.alt=a.title;return photo}));
  const original=await photoCache.get(a.id);let rendered;
  if(original.tagName==='CANVAS'){rendered=document.createElement('canvas');rendered.width=original.width;rendered.height=original.height;rendered.getContext('2d').drawImage(original,0,0);rendered.className='artifact-object';rendered.setAttribute('role','img');rendered.setAttribute('aria-label',a.title)}
  else rendered=original.cloneNode();
  container.replaceChildren(rendered);container.dataset.ready='true';
}
let observer;
function renderFilters(){
 $('era-nav').innerHTML=eraRows.map(r=>`<button data-jump="${r.id}" aria-label="跳转到${r.title}" title="${r.count} 件（组）">${r.title}</button>`).join('');
 $('filters').innerHTML=dims.map(d=>{
   let options=[...new Set(artifacts.flatMap(a=>values(a,d.key)))].filter(Boolean);
   const preferred=d.preferred||(d.key==='era'?eraDefs.map(e=>e[0]):d.key==='city'?cities.map(c=>c.name):[]);
   options.sort((a,b)=>(preferred.includes(a)?preferred.indexOf(a):999)-(preferred.includes(b)?preferred.indexOf(b):999));
   return `<details class="filter-section" ${d.open?'open':''}><summary><span class="filter-title">${d.name}<small>${d.english}</small></span></summary><div class="filter-options options-${d.key}">${options.map(v=>`<button class="filter-chip chip-${d.key}" data-filter="${d.key}" data-value="${esc(v)}" aria-pressed="${selected[d.key].has(v)}">${filterSample(d.key,v,paletteColors)}<span>${esc(label(d.key,v))}</span><em>${artifacts.filter(a=>values(a,d.key).includes(v)).length}</em></button>`).join('')}</div>${d.note?`<p class="filter-note">${d.note}</p>`:''}</details>`;
 }).join('');
 updateEraNav();
}
function buildLayout(){
 const cityOrder=['天门','荆州','荆门','钟祥','襄阳','枣阳','随州','云梦','武汉','崇阳','宜昌','鄂州','黄冈','黄石','十堰','咸宁','出土地待核'];
 const cityNames=[...new Set(artifacts.map(a=>a.city||'出土地待核'))];
 cityNames.sort((a,b)=>cityOrder.indexOf(a)-cityOrder.indexOf(b));
 cities=cityNames.map((name,i)=>({name,color:cityTones[i%cityTones.length]}));
 width=$('atlas-scroll').clientWidth;
 const layout=arrangeArtifacts(artifacts,eraDefs,cityNames,width);
 positions=layout.positions;eraRows=layout.eras;displayRows=layout.rows;height=layout.height;
 $('atlas').style.width=width+'px';$('chart').style.height=height+'px';
 $('chart').style.setProperty('--gutter',layout.gutter+'px');
 $('geography').innerHTML=`<div class="geo-label axis-label" style="width:${layout.gutter}px"><strong>时代 ↓</strong></div><div class="geography-guide"><span>同代成组 · 按地域陈列</span></div><span class="geo-direction">出土地 →</span>`;
 $('regions').innerHTML=layout.bands.map(b=>{const city=cities.find(c=>c.name===b.city);return `<div class="place-band" data-city="${esc(b.city)}" style="left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;--city-tone:${city.color};--city-wash:${city.color}16"><span><i></i>${esc(b.city)}</span></div>`}).join('');
 $('eras').innerHTML=eraRows.map(r=>`<section class="era-row ${r.id==='warring'?'featured':''}" id="era-${r.id}" style="top:${r.y}px;height:${r.height}px"><div class="era-label"><span class="era-num">${r.num}</span><h3>${r.title}</h3><span>${r.count} 件（组）</span>${r.rowCount>1?`<small>${r.rowCount} 排陈列</small>`:''}</div>${Array.from({length:r.rowCount-1},(_,i)=>`<span class="era-continuation" style="top:${(i+1)*218+100}px">${r.title}<small>${i+2} / ${r.rowCount}</small></span>`).join('')}</section>`).join('');
 $('objects').innerHTML=artifacts.map(a=>{
   const p=positions.get(a.id);
   return `<button class="artifact-group" id="object-${a.id}" data-artifact="${a.id}" style="left:${p.x}px;top:${p.top}px;width:${p.slot-18}px" aria-label="${esc(a.title)}，${esc(a.period)}，${esc(a.city)}，查看器物档案"><span class="object-picture" data-photo="${a.id}"></span><span class="object-name">${esc(a.short||a.title)}</span><span class="node-anchor"></span></button>`;
 }).join('');nodes=new Map();artifacts.forEach(a=>nodes.set(a.id,$('object-'+a.id)));
 $('paths').setAttribute('viewBox',`0 0 ${width} ${height}`);
 observer?.disconnect();observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){picture(artifacts.find(a=>a.id===e.target.dataset.photo),e.target);observer.unobserve(e.target)}},{root:$('atlas-scroll'),rootMargin:'300px'});
 document.querySelectorAll('#objects [data-photo]').forEach(el=>observer.observe(el));
 $('city-jump').innerHTML='<option value="">全部地域</option>'+cities.filter(c=>isKnownFeature(c.name)).map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
 $('artifact-jump').innerHTML='<option value="">选择器物查看</option>'+artifacts.map(a=>`<option value="${a.id}">${esc(a.title)} · ${esc(a.period)}</option>`).join('');
 updateEraNav();
}

function refresh(){
 const filtered=hasFilters();matchIds=new Set(artifacts.filter(a=>matches(a)).map(a=>a.id));
 $('city-jump').value=selected.city.size===1?[...selected.city][0]:'';
 for(const a of artifacts){const n=nodes.get(a.id);n.classList.toggle('dim',filtered&&!matchIds.has(a.id));n.classList.toggle('lit',filtered&&matchIds.has(a.id))}
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',selected[b.dataset.filter].has(b.dataset.value)));
 const summary=dims.flatMap(d=>[...selected[d.key]].map(v=>`${d.name} · ${label(d.key,v)}`));
 $('selection-summary').innerHTML=filtered?`<span class="selected-label">${esc(summary.join(' + '))}</span>　<b>${matchIds.size}</b> / ${artifacts.length} 件（组）${!matchIds.size?' · 无匹配，试试减少条件':''}`:`全景 · <b>${artifacts.length}</b> 件（组） <span class="summary-help"> / 同代成组，逐件陈列</span>`;
 drawPaths();
 syncThree();
}
function drawPaths(){
 activePaths=[];
 const traces=dims.filter(d=>d.key!=='city').flatMap(d=>[...selected[d.key]].map(value=>({dimension:d.key,value})));
 if(!traces.length||!$('show-paths').checked){$('paths').innerHTML='';$('path-legend').innerHTML='<span>'+(!$('show-paths').checked?'特征路径已隐藏':'选择色彩、纹样、工艺或材质，显现关联路径')+'</span>';return}
 const chunks=[],legends=[];
 traces.forEach(({dimension,value},i)=>{
   const records=artifacts.filter(a=>matches(a)&&values(a,dimension).includes(value));
   const color=dimension==='colors'?paletteColors[value]:dimension==='materialGroup'?materialSpec(value).color:dimension==='motifs'?'#b2a17b':'#acb6a2';
   const offset=(i-(traces.length-1)/2)*7;
   const bands=displayRows.map(row=>({row,points:records.filter(a=>positions.get(a.id).rowKey===row.key).map(a=>({...positions.get(a.id),id:a.id})).sort((a,b)=>a.x-b.x)})).filter(b=>b.points.length);
   const id='route-'+i,pattern='material-'+i;
   if(dimension==='materialGroup')chunks.push(`<defs>${materialPattern(pattern,value)}</defs>`);
   chunks.push(`<g class="route route-${dimension}" data-dimension="${dimension}" data-value="${esc(value)}" style="color:${color}">`);
   let previous;
   const addPath=(d,kind)=>{
     const paint=dimension==='materialGroup'?`url(#${pattern})`:color;
     if(dimension==='materialGroup')chunks.push(`<path class="material-outline" d="${d}" stroke="${color}"/>`);
     chunks.push(`<path class="feature-path ${kind}" data-route="${id}" stroke="${paint}" d="${d}"/>`);
   };
   bands.forEach(({row,points})=>{
     const lo=points[0].x,hi=points.at(-1).x,hub=points[Math.floor((points.length-1)/2)].x+offset,y=row.axis+offset;
     if(previous){
       const bend=(y-previous.y)*.45;
       addPath(`M${previous.x},${previous.y} C${previous.x},${previous.y+bend} ${hub},${y-bend} ${hub},${y}`,previous.era===row.era?'continuation':'link');
     }
     // A short line keeps the visual language visible even for one match.
     addPath(`M${points.length>1?lo:lo-22},${y} H${points.length>1?hi:hi+22}`,'peer');
     points.forEach(p=>{if(offset)chunks.push(`<path class="node-tether" stroke="${color}" d="M${p.x},${p.y} V${y}"/>`);chunks.push(`<circle class="path-node" stroke="${color}" cx="${p.x}" cy="${y}" r="3.5"/>`)});
     previous={x:hub,y,era:row.era};
   });
   chunks.push('</g>');
   activePaths.push({dimension,value,color,ids:records.map(a=>a.id),eras:[...new Set(bands.map(b=>b.row.era))],style:dimension==='colors'?'solid':dimension==='motifs'?'repeated-motif':dimension==='crafts'?'dashed-icons':'material-texture'});
   legends.push(`<span class="legend-item">${filterSample(dimension,value,paletteColors)}${esc(value)}<small>${records.length}</small></span>`);
 });
 $('paths').innerHTML=chunks.join('');
 for(const group of $('paths').querySelectorAll('.route-motifs,.route-crafts')){
   const dimension=group.dataset.dimension,value=group.dataset.value,spacing=dimension==='motifs'?140:104;
   let decoration='';
   group.querySelectorAll('.feature-path').forEach(path=>{
     const length=path.getTotalLength();
     if(dimension==='motifs'&&length<70)return;
     for(let distance=Math.min(length/2,spacing/2);distance<length;distance+=spacing){
       const p=path.getPointAtLength(distance);
       decoration+=`<g class="route-symbol" transform="translate(${p.x-9},${p.y-9})"><rect x="-2" y="-2" width="22" height="22" rx="11" fill="#10120e" opacity="${dimension==='crafts'?'.98':'.86'}"/><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${glyphBody(dimension,value)}</svg></g>`;
     }
   });
   group.insertAdjacentHTML('beforeend',decoration);
 }
 $('path-legend').innerHTML=legends.join('');
}

function choose(key,value,exclusive=false){
 groupDimension=key;$('three-group').value=key;
 if(exclusive){selected=Object.fromEntries(dims.map(d=>[d.key,new Set()]));selected[key].add(value)}else if(selected[key].has(value))selected[key].delete(value);else selected[key].add(value);
 if(!selected[key].size){const active=dims.find(d=>selected[d.key].size);if(active){groupDimension=active.key;$('three-group').value=groupDimension}}
 refresh();
}
function closeDialog(id){$(id).close()}
function detail(a){
 if(!a)return;
 const state={view,selected:Object.fromEntries(dims.map(d=>[d.key,[...selected[d.key]]])),groupDimension,
   scrollTop:$('atlas-scroll').scrollTop,three:atlas3d?.navigationState()};
 try{sessionStorage.setItem('jingchu-atlas-return',JSON.stringify(state))}catch{}
 location.assign('object.html?id='+encodeURIComponent(a.id));
}

function jumpEra(id){if(view==='3d'){atlas3d?.jumpEra(id);$('sidebar').classList.remove('open');return}const row=eraRows.find(r=>r.id===id);if(row){hideHover();$('atlas-scroll').scrollTo({top:row.y,behavior:reducedMotion()?'instant':'smooth'});$('sidebar').classList.remove('open')}}
function updateEraNav(){if(view==='3d')return;const y=$('atlas-scroll').scrollTop+32;const current=[...eraRows].reverse().find(r=>r.y<=y)||eraRows[0];document.querySelectorAll('#era-nav [data-jump]').forEach(b=>{if(b.dataset.jump===current?.id)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')})}
function reducedMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches}


document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.view){switchView(b.dataset.view);return}
 if(b.dataset.filter){choose(b.dataset.filter,b.dataset.value);return}
 if(b.dataset.preset){const [key,val]=b.dataset.preset.split(':');choose(key,val,true);return}

 if(b.dataset.artifact){detail(artifacts.find(a=>a.id===b.dataset.artifact));return}
 if(b.dataset.close){closeDialog(b.dataset.close);return}
 if(b.dataset.jump)jumpEra(b.dataset.jump);
});
$('reset').onclick=()=>{selected=Object.fromEntries(dims.map(d=>[d.key,new Set()]));refresh()};
$('show-paths').onchange=drawPaths;
$('about-open').onclick=()=>$('about-dialog').showModal();
$('filters-open').onclick=()=>{$('sidebar').classList.add('open');$('filters-close').focus()};
$('filters-close').onclick=()=>{$('sidebar').classList.remove('open');$('filters-open').focus()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('sidebar').classList.remove('open')});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
$('city-jump').onchange=e=>{groupDimension='city';$('three-group').value='city';selected.city=new Set(e.target.value?[e.target.value]:[]);refresh()};
$('artifact-jump').onchange=e=>{const a=artifacts.find(a=>a.id===e.target.value);if(a){detail(a);e.target.value=''}};
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(view==='2d'){buildLayout();refresh()}},150)});
let hoveredId=null;
function showHover(a,target){
 if(hoveredId===a.id)return;hoveredId=a.id;
 const tooltip=$('hover-preview');tooltip.innerHTML=`<div class="hover-photo"></div><strong>${esc(a.title)}</strong><span>${esc(a.period)} · ${esc(a.city)}</span><div class="mini-palette">${a.palette.map(c=>`<i style="--swatch:${c.hex}"></i>`).join('')}</div>`;
 tooltip.hidden=false;picture(a,tooltip.querySelector('.hover-photo'));
 const r=target.getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();
 let left=Math.max(main.left+5,Math.min(innerWidth-230,r.left+r.width/2-110));
 let top=r.top-225;if(top<80)top=r.bottom+8;
 tooltip.style.left=left+'px';tooltip.style.top=Math.min(innerHeight-245,top)+'px';
}
function hideHover(){hoveredId=null;$('hover-preview').hidden=true}
$('objects').addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const target=e.target.closest('[data-artifact]');if(target)showHover(artifacts.find(a=>a.id===target.dataset.artifact),target)});
$('objects').addEventListener('pointerout',e=>{if(!e.relatedTarget?.closest?.('[data-artifact]'))hideHover()});
$('objects').addEventListener('focusin',e=>{const target=e.target.closest('[data-artifact]');if(target)showHover(artifacts.find(a=>a.id===target.dataset.artifact),target)});
$('objects').addEventListener('focusout',hideHover);$('objects').addEventListener('click',hideHover);$('atlas-scroll').addEventListener('scroll',()=>{hideHover();updateEraNav()},{passive:true});


function syncThree(){
 if(view==='3d')atlas3d?.setFilter({selected,matchedIds:matchIds,dimension:groupDimension});
}
$('three-group').onchange=e=>{groupDimension=e.target.value;atlas3d?.setFilter({selected,matchedIds:matchIds,dimension:groupDimension})};
async function switchView(next){
 view=next;hideHover();document.body.dataset.view=next;
 document.querySelectorAll('[role="tab"][data-view]').forEach(b=>{const active=b.dataset.view===next;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
 $('atlas-scroll').hidden=next!=='2d';$('atlas-3d').hidden=next!=='3d';
 document.querySelector('.three-group-control').hidden=next!=='3d';
 document.querySelector('.nav-heading small').textContent=next==='3d'?'由古至今 ↗':'由古至今 ↓';
 if(next==='2d'){atlas3d?.setVisible(false);buildLayout();refresh();return}
 if(!threeLoading){
   threeLoading=(async()=>{
     try{
       const {Atlas3D}=await import('./atlas3d.js');
       atlas3d=new Atlas3D($('atlas-3d'),{artifacts,eraDefs,cities,paletteColors,onDetail:detail,onEra:id=>{
         if(view!=='3d')return;
         document.querySelectorAll('#era-nav [data-jump]').forEach(b=>{if(b.dataset.jump===id)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')});
       }});
       $('atlas-3d').querySelector('.three-loading').hidden=true;
     }catch(error){console.error(error);$('atlas-3d').querySelector('.three-loading').hidden=true;$('atlas-3d').querySelector('.three-error').hidden=false}
   })();
 }
 await threeLoading;
 if(view==='3d'){atlas3d?.setVisible(true);syncThree()}
}
document.querySelector('.view-tabs').addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
 const next=e.key==='Home'?'2d':e.key==='End'?'3d':view==='2d'?'3d':'2d';$('view-'+next).focus();switchView(next);
});

try{
 const response=await fetch('data/artifacts.json');if(!response.ok)throw new Error('器物资料读取失败');artifacts=await response.json();
 buildLayout();renderFilters();refresh();
 $('total-count').textContent=artifacts.length;$('date-span').textContent='史前 — '+(artifacts.some(a=>a.era==='qing')?'清代':artifacts.some(a=>a.era==='ming')?'明代':'元代');
 $('archive-count').textContent=artifacts.length;
 $('loading').hidden=true;document.body.dataset.ready='true';
 if(new URLSearchParams(location.search).has('return')){
  try{const saved=JSON.parse(sessionStorage.getItem('jingchu-atlas-return'));
   if(saved){selected=Object.fromEntries(dims.map(d=>[d.key,new Set((saved.selected?.[d.key]||[]).filter(v=>artifacts.some(a=>values(a,d.key).includes(v))))]));groupDimension=dims.some(d=>d.key===saved.groupDimension)?saved.groupDimension:'colors';$('three-group').value=groupDimension;
    refresh();await switchView(saved.view==='3d'?'3d':'2d');if(saved.view==='3d')atlas3d?.restoreNavigation(saved.three);else $('atlas-scroll').scrollTop=saved.scrollTop||0;refresh()}
  }catch(error){console.warn('Could not restore atlas position',error)}
 }

 window.jingchuTimeline={getState:()=>({count:artifacts.length,matchedIds:[...matchIds],filters:Object.fromEntries(dims.map(d=>[d.key,[...selected[d.key]]])),positions:Object.fromEntries(positions),paths:activePaths,imageFailures,cities,width,height,eraRows,displayRows}),artifacts};
}catch(error){$('loading').textContent=error.message+'，请刷新页面重试。';document.body.dataset.error='true';console.error(error)}
