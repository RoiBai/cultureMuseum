const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>String(value??'').normalize('NFKC').replace(/\s+/g,'').toLocaleLowerCase('zh-CN');
const motifGroups=[['all','全部线索'],['纹样','纹样'],['形象','造型与意象'],['色彩','色彩'],['工艺','工艺']];
const objectGroups=[['all','全部对象'],['artifact','文物'],['object-family','器物类别'],['contemporary','文创与当代'],['places','遗址与建筑'],['document','文献']];
const kindLabels={artifact:'文物','object-family':'器物类别',contemporary:'文创与当代',site:'遗址',architecture:'建筑',document:'文献'};
const query=new URLSearchParams(location.search);
const state={tab:query.get('tab')==='objects'?'objects':'motifs',category:query.get('category')||'all',search:query.get('q')||'',page:Number(query.get('page'))||null,limit:36};
let data,passages,objects,motifs,searchIndex=new Map();

function getPassages(record){return [...new Set(record.passageIds||[])].map(id=>passages.get(id)).filter(Boolean).sort((a,b)=>a.pdfPage-b.pdfPage);}
function sourcePages(p){return [...new Set((p.sourcePages?.length?p.sourcePages:[p.pdfPage]).map(Number).filter(Number.isFinite))];}
function rangeLabel(values){const list=[...new Set(values)].sort((a,b)=>a-b);if(!list.length)return'';const groups=[];let start=list[0],end=start;for(const n of list.slice(1)){if(n===end+1){end=n;continue;}groups.push(start===end?String(start):`${start}–${end}`);start=end=n;}groups.push(start===end?String(start):`${start}–${end}`);return groups.join('、');}
function pageLabel(p){const pdf=sourcePages(p),offset=(Number(data.source.bodyStart)||7)-1;const printed=pdf.map(n=>n-offset).filter(n=>n>0);if(pdf.length===1&&p.printedPage!=null)return `书内第 ${esc(p.printedPage)} 页 · PDF 第 ${esc(p.pdfPage)} 页`;return `${printed.length?`书内第 ${rangeLabel(printed)} 页`:'封面与目录等'} · PDF 第 ${rangeLabel(pdf)} 页`;}
function passageHTML(p){const label=p.context==='reference-only'||p.referenceOnly?'参考文献条目':p.quoteSource==='visual-transcription'?'图中标注':p.quoteSource==='figure-caption'?'书中图注':'书中原文';return `<article class="original-passage" id="quote-${esc(p.id)}"><span class="passage-badge">${label}</span><blockquote>${esc(p.quote)}</blockquote><p class="passage-source"><cite>《${esc(data.source.title)}》</cite><span class="source-pages">${pageLabel(p)}</span></p></article>`;}
function objectURL(o){const url=String(o.url||'');return /^(?:object|book-object)\.html\?id=[\w%.-]+$/.test(url)?url:`book-object.html?id=${encodeURIComponent(o.id)}`;}
function imageURL(o){const url=typeof o.image==='string'?o.image:o.image?.src;return typeof url==='string'&&!/^(?:javascript|data):/i.test(url)?url:null;}
function kindLabel(o){return kindLabels[o.kind]||'书中对象';}
function groupFor(record){if(state.tab==='objects')return ['site','architecture'].includes(record.kind)?'places':record.kind;return ['造型','自然意象','意象','符号'].includes(record.category)?'形象':record.category;}
function matches(record,category=state.category){if(category!=='all'&&groupFor(record)!==category)return false;if(state.search&&!searchIndex.get(record.id)?.includes(normalize(state.search)))return false;if(state.page&&!getPassages(record).some(p=>sourcePages(p).includes(state.page)))return false;return true;}
function records(){return state.tab==='objects'?data.objects:data.motifs;}
function rememberURL(){const q=new URLSearchParams(location.search);q.delete('motif');if(state.tab==='objects')q.set('tab','objects');else q.delete('tab');if(state.category!=='all')q.set('category',state.category);else q.delete('category');if(state.search)q.set('q',state.search);else q.delete('q');if(state.page)q.set('page',state.page);else q.delete('page');history.replaceState({},'',`${location.pathname}${q.size?'?'+q:''}${location.hash}`);}

function renderFilters(){const groups=state.tab==='objects'?objectGroups:motifGroups;if(!groups.some(([id])=>id===state.category))state.category='all';$('category-filters').innerHTML=groups.map(([id,label])=>`<button type="button" data-category="${esc(id)}" aria-pressed="${id===state.category}"><span>${label}</span><small>${records().filter(r=>matches(r,id)).length}</small></button>`).join('');}
function motifCard(m,index){const count=getPassages(m).length;return `<details class="motif-card" data-motif="${esc(m.id)}" id="${esc(m.id)}"><summary><span class="motif-kicker"><span>${esc(m.category)}</span><span>${String(index+1).padStart(3,'0')}</span></span><h3>${esc(m.name)}</h3><p class="motif-aliases">${esc((m.aliases||[]).filter(a=>a!==m.name).join(' · ')||'从书中的文字，读它的来处。')}</p><span class="open-hint"><span>展开 ${count} 段原文</span><b aria-hidden="true">＋</b></span></summary><div class="motif-reading"></div></details>`;}
function objectCard(o){const pic=imageURL(o),ps=getPassages(o),first=ps[0];return `<a class="book-object" href="${esc(objectURL(o))}"><div class="object-visual ${pic?'':'no-image'}">${pic?`<img src="${esc(pic)}" alt="${esc(o.name)}" loading="lazy" decoding="async">`:`<span class="object-character" aria-hidden="true">${esc(({artifact:'器','object-family':'类',contemporary:'今',site:'址',architecture:'筑',document:'文'})[o.kind]||'物')}</span><span class="image-note">书中文字记录</span>`}</div><div class="object-copy"><span class="object-kind">${kindLabel(o)}</span><h3>${esc(o.name)}</h3><p class="object-period">${esc(o.period||'书中未明确纪年')}${o.place?`<br>${esc(o.place)}`:''}</p><p class="object-meta"><span>${first?.printedPage?`书内第 ${esc(first.printedPage)} 页起`:`${ps.length} 段相关原文`}</span><span>查看记录 ↗</span></p></div></a>`;}

function render(){
  if(!data||!passages||!objects||!motifs)return;
  renderFilters();
  for(const b of document.querySelectorAll('[data-tab]')){const active=b.dataset.tab===state.tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
  $('catalog-panel').setAttribute('aria-labelledby',`tab-${state.tab}`);
  $('book-search').value=state.search;
  $('book-search').placeholder=state.tab==='objects'?'搜器物、器类、年代或地点':'搜纹样、意象或别名';
  $('search-label').textContent=state.tab==='objects'?'检索书中器物':'检索纹样与文化线索';
  $('category-title').textContent=state.tab==='objects'?'按对象阅读':'循一条线索';
  $('sidebar-note').innerHTML=state.tab==='objects'?'有纪年与未明确纪年的<br>对象一同保留。<br>器类、文献与单件分别呈现。':'每条原文保留书中措辞，<br>页码随文标注。';
  $('clear-search').hidden=!state.search;
  $('reset-filters').hidden=state.category==='all'&&!state.search&&!state.page;
  const all=records().filter(r=>matches(r)),shown=all.slice(0,state.limit),unit=state.tab==='objects'?'条书中对象':'条纹样与文化线索';
  $('result-count').innerHTML=`<strong>${all.length}</strong>${unit}${state.page?` · PDF 第 ${state.page} 页相关` : ''}${all.length>shown.length?` · 当前显示 ${shown.length} 条`:''}`;
  const host=$('catalog-results');host.className=state.tab==='objects'?'object-grid':'motif-grid';
  host.innerHTML=shown.length?shown.map(state.tab==='objects'?objectCard:motifCard).join(''):'<div class="empty-state"><h3>暂未找到这条线索</h3><p>可以换一个名称，或减少筛选条件。</p><button type="button" data-reset>查看全部</button></div>';
  host.setAttribute('aria-busy','false');
  $('load-more').hidden=all.length<=shown.length;
  $('load-more').textContent=`再看 ${Math.min(36,all.length-shown.length)} 条 · 还有 ${all.length-shown.length} 条`;
}

function fillReading(detail){
  if(!motifs||detail.dataset.filled)return;
  const m=motifs.get(detail.dataset.motif);if(!m)return;
  const ps=getPassages(m),related=(m.objectIds||[]).map(id=>objects.get(id)).filter(Boolean);
  detail.querySelector('.motif-reading').innerHTML=`<p class="reading-intro">${ps.length} 段原文 · 按书中出现次序阅读</p>${ps.map(passageHTML).join('')}${related.length?`<h4 class="related-title">同段提及的器物与对象</h4><div class="related-objects">${related.map(o=>`<a href="${esc(objectURL(o))}">${esc(o.name)}<small>${kindLabel(o)} ↗</small></a>`).join('')}</div>`:''}`;
  detail.dataset.filled='true';
}

function renderCoverage(){
  const audit=data.coverage?.pages||data.pages||[];
  const reviewed=Array.isArray(data.coverage?.reviewedPages)?data.coverage.reviewedPages.length:Number(data.coverage?.reviewedPages)||audit.filter(p=>p.reviewed).length;
  $('page-total').textContent=String(reviewed);
  $('coverage-status').textContent=`${reviewed} / ${data.source.pdfPages||audit.length} 页已核读`;
  if(!audit.length){$('page-index').innerHTML='<p class="loading">逐页记录暂未载入。</p>';return;}
  const labels={body:'正文',references:'参考文献',cover:'封面',blank:'空白页',contents:'目录',toc:'目录',frontmatter:'卷首'};
  $('page-index').innerHTML=audit.map(p=>{const front=p.printedPage==null,ref=p.kind==='references',status=p.reviewed?'已核读':'待核读',title=`PDF 第 ${p.pdfPage} 页 · ${front?(labels[p.kind]||'卷首'): `书内第 ${p.printedPage} 页`} · ${labels[p.kind]||'正文'} · ${status}`;return `<span class="page-marker ${ref?'reference':front?'frontmatter':''} ${p.reviewed?'':'unreviewed'}" tabindex="0" title="${esc(title)}" aria-label="${esc(title)}">${p.pdfPage}</span>`;}).join('');
}

function reset(){state.category='all';state.search='';state.page=null;state.limit=36;rememberURL();render();}
$('book-search').addEventListener('input',e=>{state.search=e.target.value;state.limit=36;rememberURL();render();});
$('clear-search').addEventListener('click',()=>{state.search='';state.limit=36;rememberURL();render();$('book-search').focus();});
$('reset-filters').addEventListener('click',reset);
$('category-filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;state.category=b.dataset.category;state.limit=36;rememberURL();render();[...$('category-filters').querySelectorAll('button')].find(x=>x.dataset.category===state.category)?.focus({preventScroll:true});});
document.querySelector('.catalog-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;state.tab=b.dataset.tab;state.category='all';state.limit=36;rememberURL();render();});
document.querySelector('.catalog-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=e.key==='Home'?'motifs':e.key==='End'?'objects':state.tab==='motifs'?'objects':'motifs';$(`tab-${target}`).click();$(`tab-${target}`).focus();});
$('load-more').addEventListener('click',()=>{if(!passages)return;const firstNew=state.limit;state.limit+=36;render();const next=$('catalog-results').children[firstNew];(next?.querySelector('summary')||next)?.focus({preventScroll:true});});
$('catalog-results').addEventListener('click',e=>{if(e.target.closest('[data-reset]'))reset();});
$('catalog-results').addEventListener('toggle',e=>{if(e.target.matches('details[data-motif]')&&e.target.open)fillReading(e.target);},true);

try{
  const response=await fetch('data/book-index.json',{cache:'no-cache'});if(!response.ok)throw new Error(`资料未能读取（${response.status}）`);data=await response.json();
  if(!Array.isArray(data.passages)||!Array.isArray(data.objects)||!Array.isArray(data.motifs))throw new Error('资料格式暂不可用');
  passages=new Map(data.passages.map(p=>[p.id,p]));objects=new Map(data.objects.map(o=>[o.id,o]));motifs=new Map(data.motifs.map(m=>[m.id,m]));
  for(const record of [...data.motifs,...data.objects])searchIndex.set(record.id,normalize([record.name,...record.aliases||[],record.period,record.place].filter(Boolean).join(' ')));
  const title=String(data.source.title||'荆楚有色'),split=title.indexOf('：');$('source-title').textContent=split<0?title:title.slice(0,split);$('source-subtitle').textContent=split<0?'':title.slice(split+1);
  $('motif-total').textContent=data.motifs.length;$('object-total').textContent=data.objects.length;$('motif-tab-count').textContent=data.motifs.length;$('object-tab-count').textContent=data.objects.length;
  renderCoverage();render();
  const selected=query.get('motif')||location.hash.slice(1);
  if(selected&&motifs.has(selected)&&state.tab==='motifs'){
    const visible=records().filter(r=>matches(r)),index=visible.findIndex(m=>m.id===selected);
    if(index>=0){if(index>=state.limit){state.limit=Math.ceil((index+1)/36)*36;render();}const detail=document.getElementById(selected);detail.open=true;fillReading(detail);detail.scrollIntoView({block:'start'});}
  }
  document.body.dataset.ready='true';
}catch(error){
  $('catalog-results').className='motif-grid';$('catalog-results').innerHTML=`<div class="empty-state"><h3>书中线索暂未展开</h3><p>${esc(error.message)}</p><button type="button" id="retry-book">重新读取</button></div>`;$('catalog-results').setAttribute('aria-busy','false');$('result-count').textContent='资料未能读取';$('retry-book').onclick=()=>location.reload();document.body.dataset.error='true';console.error(error);
}
