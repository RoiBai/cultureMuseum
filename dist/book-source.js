import {loadBookSummaries,readingFor,editorialHTML} from './book-editorial.js';
let indexPromise;
const list=value=>Array.isArray(value)?value:[];
export const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const kindLabel=kind=>({artifact:'文物','object-family':'器物类别',contemporary:'文创与当代设计',architecture:'遗址与建筑',site:'遗址与建筑',document:'文献与作品'}[kind]||'书中对象');
export const motifURL=id=>'book.html?motif='+encodeURIComponent(id);
export const objectURL=object=>object.existingId?'object.html?id='+encodeURIComponent(object.existingId):'book-object.html?id='+encodeURIComponent(object.id);
export function loadBookIndex(){
 if(!indexPromise)indexPromise=fetch(new URL('./data/book-index.json',import.meta.url),{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('书籍索引暂时无法载入');return response.json()}).then(index=>{if(!index.source||!Array.isArray(index.objects)||!Array.isArray(index.passages)||!Array.isArray(index.motifs))throw new Error('书籍索引格式不完整');return index}).catch(error=>{indexPromise=undefined;throw error});
 return indexPromise;
}
function ensureStyles(){if(!document.querySelector('link[data-book-source-styles]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./book-source.css?v=20261004',import.meta.url).href;link.dataset.bookSourceStyles='';document.head.append(link)}}
export function passagePages(passage){const values=list(passage.sourcePages).length?passage.sourcePages:list(passage.quoteParts).length?passage.quoteParts.map(part=>part.pdfPage):[passage.pdfPage];return [...new Set(values.filter(value=>value!==undefined&&value!==null&&value!==''))]}
const pageText=values=>values.length?values.map(String).join('、'):'未标注';
export function pageReference(passage,index){
 const pdf=passagePages(passage),parts=list(passage.quoteParts),bodyStart=Number(index.source.bodyStart),printed=pdf.map(page=>{
  const part=parts.find(item=>String(item.pdfPage)===String(page));
  if(part?.printedPage!==undefined&&part.printedPage!==null&&part.printedPage!=='')return part.printedPage;
  if(String(page)===String(passage.pdfPage)&&passage.printedPage!==undefined&&passage.printedPage!==null&&passage.printedPage!=='')return passage.printedPage;
  return Number.isInteger(+page)&&Number.isInteger(bodyStart)&&+page>=bodyStart?+page-bodyStart+1:null;
 });
 return `书内页 ${pageText(printed.filter(value=>value!==null))} · PDF 页 ${pageText(pdf)}`;
}
export function collectPassages(index,objects){
 const wanted=new Set(objects.flatMap(object=>list(object.passageIds))),ids=new Set(),content=new Set();
 return index.passages.filter(passage=>{if(!wanted.has(passage.id)||ids.has(passage.id))return false;ids.add(passage.id);const key=JSON.stringify([passagePages(passage),passage.quote??list(passage.quoteParts).map(part=>part.quote??'').join('')]);if(content.has(key))return false;content.add(key);return true}).sort((a,b)=>(Number(a.pdfPage)||Infinity)-(Number(b.pdfPage)||Infinity));
}
export function collectMotifs(index,objects){const ids=new Set(objects.flatMap(object=>list(object.motifIds))),objectIds=new Set(objects.map(object=>object.id));return index.motifs.filter(motif=>ids.has(motif.id)||list(motif.objectIds).some(id=>objectIds.has(id)))}
export function motifLinks(motifs){return motifs.map(motif=>`<a class="bk-motif" href="${motifURL(motif.id)}"><span>${esc(motif.name)}</span>${motif.category?`<small>${esc(motif.category)}</small>`:''}<b aria-hidden="true">↗</b></a>`).join('')}
function quoteSource(value){if(!value)return'书籍原文';if(typeof value!=='string')return String(value.label||value.kind||value.type||'书籍摘录');return {'text-layer':'书籍文字摘录','reference-only':'参考文献条目','manual-transcription':'图表转录','visual-transcription':'图表转录','figure-caption':'图注',caption:'图注',table:'表格摘录',body:'书籍正文'}[value]||value}
export function renderPassages(host,passages,index,{openFirst=false}={}){
 const fragment=document.createDocumentFragment();
 passages.forEach((passage,i)=>{
  const details=document.createElement('details');details.className='bk-passage';details.dataset.passageId=passage.id;details.open=openFirst&&i===0;
  const referenceOnly=passage.context==='reference-only';
  const summary=document.createElement('summary');summary.innerHTML=`<span class="bk-passage-number">${String(i+1).padStart(2,'0')}</span><span class="bk-passage-heading"><strong>${esc(quoteSource(referenceOnly?'reference-only':passage.quoteSource))}</strong><small>${esc(pageReference(passage,index))}</small></span><span class="bk-expand" aria-hidden="true">＋</span>`;details.append(summary);
  const content=document.createElement('div');content.className='bk-passage-content';
  const citation=document.createElement('p');citation.className='bk-citation';citation.textContent='《'+index.source.title+'》';content.append(citation);
  const parts=list(passage.quoteParts).filter(part=>typeof part.quote==='string');
  if(referenceOnly){const note=document.createElement('p');note.className='bk-part-note';note.textContent='本条为书内参考文献条目，不作为本书对该对象的正文论述。';content.append(note)}
  const quote=document.createElement('blockquote');quote.textContent=typeof passage.quote==='string'?passage.quote:parts.map(part=>part.quote).join('')||'此条索引未提供原文。';content.append(quote);
  const related=index.motifs.filter(motif=>list(motif.passageIds).includes(passage.id));
  if(related.length){const links=document.createElement('div');links.className='bk-passage-motifs';links.innerHTML='<span>同段文化线索 · 同段提及不等于该对象的纹样实证</span><div class="bk-motifs">'+motifLinks(related)+'</div>';content.append(links)}
  details.append(content);fragment.append(details);
 });
 if(!passages.length){const empty=document.createElement('p');empty.className='bk-empty';empty.textContent='此条索引暂未附可显示的原文摘录。';fragment.append(empty)}
 host.replaceChildren(fragment);return host;
}
export function imageRecord(object,{preferBookFigure=!object.existingId}={}){
 if(preferBookFigure&&object.bookFigure?.src)return {...object.bookFigure,label:'本书配图'};
 if(typeof object.image==='string')return {src:object.image,caption:object.imageLabel||'索引所附图片',label:object.imageLabel||'索引配图'};
 if(object.image&&typeof object.image==='object')return {...object.image,src:object.image.src||object.image.url,label:object.imageLabel||object.image.caption||'索引配图'};
 return object.bookFigure?.src?{...object.bookFigure,label:'本书配图'}:null;
}
export function safeImageURL(value){if(typeof value!=='string'||!value.trim())return null;try{const url=new URL(value,import.meta.url);return ['http:','https:','file:'].includes(url.protocol)?url.href:null}catch{return null}}
export function renderBookFigure(host,object,index,options){
 const image=imageRecord(object,options),src=safeImageURL(image?.src);if(!src)return false;
 const figure=document.createElement('figure');figure.className='bk-figure';const picture=document.createElement('img');picture.src=src;picture.alt=image.alt||image.caption||object.name+' · '+image.label;picture.loading='lazy';picture.decoding='async';
 const caption=document.createElement('figcaption'),title=document.createElement('span');title.textContent=image.caption||image.label;caption.append(title);
 if(image.pdfPage!==undefined){const pages=document.createElement('small');pages.textContent=pageReference(image,index);caption.append(pages)}
 if(image.provenance){const note=document.createElement('small');note.textContent=image.provenance;caption.append(note)}
 picture.addEventListener('error',()=>{picture.remove();const missing=document.createElement('p');missing.className='bk-image-missing';missing.textContent='这张索引配图暂时未能载入。讲解与页码仍可在下方阅读。';figure.prepend(missing)},{once:true});figure.append(picture,caption);host.append(figure);return true;
}
/** Append only this source section; never replace an artifact's existing content. */
export async function renderBookSources(host,artifactId){
 if(!host)return null;ensureStyles();const key=String(artifactId),previous=[...host.children].find(child=>child.dataset?.bookSources===key);previous?.remove();
 const section=document.createElement('section');section.className='book-source';section.dataset.bookSources=key;section.setAttribute('aria-label','书中讲解');section.setAttribute('aria-busy','true');section.innerHTML='<p class="bk-loading" role="status">正在载入书中讲解…</p>';host.append(section);
 try{
  const [index,summaries]=await Promise.all([loadBookIndex(),loadBookSummaries('object')]);if(!host.contains(section))return null;
  const objects=index.objects.filter(object=>String(object.existingId??'')===key);if(!objects.length){section.remove();return {objects:[],passages:[]}}
  const passages=collectPassages(index,objects),motifs=collectMotifs(index,objects);
  const object=objects[0],reading=readingFor(summaries,object,index);
  section.innerHTML=`<header class="bk-section-heading"><div><p class="bk-eyebrow">READING THE BOOK</p><h2>书中讲解</h2></div><a class="bk-explore" href="book.html">继续纹样探索 ↗</a></header>${editorialHTML(reading,index)}<div class="bk-book-figures"></div>`;
  if(object.bookFigure?.src)renderBookFigure(section.querySelector('.bk-book-figures'),object,index,{preferBookFigure:true});

  section.removeAttribute('aria-busy');return {section,objects,passages,motifs};
 }catch(error){if(!host.contains(section))return null;section.removeAttribute('aria-busy');section.innerHTML='<h2>书中讲解</h2><p class="bk-empty">书中讲解暂时未能载入。器物档案的其他内容仍可阅读。</p><button type="button" class="bk-retry">重新载入讲解</button>';section.querySelector('button').addEventListener('click',()=>renderBookSources(host,artifactId),{once:true});console.warn('Book source unavailable',error);return {section,error}}
}
