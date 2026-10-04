const cache=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function loadBookSummaries(kind){
 if(!['motif','object'].includes(kind))throw new Error('Unknown reading type');
 if(!cache.has(kind))cache.set(kind,fetch(new URL(`./data/book-${kind}-summaries.json`,import.meta.url),{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('讲解暂时未能载入');return r.json()}).catch(error=>{cache.delete(kind);throw error}));
 return cache.get(kind);
}
export function readingFor(summaries,record,index){
 if(summaries.sourceSHA256!==index.source.sha256)throw new Error('讲解与书籍版本不一致');
 const reading=summaries.summaries[record.id];
 if(!reading?.text?.trim())throw new Error('这条讲解暂时未能载入');
 return reading;
}
export function pageRanges(values){
 const pages=[...new Set(values)].filter(Number.isFinite).sort((a,b)=>a-b),ranges=[];
 for(let i=0;i<pages.length;i++){let start=pages[i],end=start;while(pages[i+1]===end+1)end=pages[++i];ranges.push(start===end?String(start):`${start}–${end}`)}
 return ranges.join('、');
}
export function readingPages(reading,index){
 const ids=new Set(reading.passageIds),passages=index.passages.filter(p=>ids.has(p.id));
 const pdf=passages.flatMap(p=>p.sourcePages?.length?p.sourcePages:[p.pdfPage]);
 return {pdf:pageRanges(pdf),printed:pageRanges(pdf.map(p=>p-index.source.bodyStart+1))};
}
export function readingFigures(reading,index){
 return [...new Set(reading.figureObjectIds||[])].map(id=>index.objects.find(o=>o.id===id)).filter(o=>o?.bookFigure?.src).slice(0,2);
}
export function editorialHTML(reading,index,{figures=false}={}){
 const pages=readingPages(reading,index),images=figures?readingFigures(reading,index):[];
 return `<section class="book-editorial" aria-label="书中内容整理"><p class="editorial-label">书中解读 <span>依据原书整理</span></p><p class="editorial-text">${esc(reading.text)}</p>${images.length?`<div class="editorial-figures">${images.map(o=>{const f=o.bookFigure;return `<figure><img src="${esc(f.src)}" alt="${esc(f.caption||o.name)}" loading="lazy" decoding="async"><figcaption>${esc(f.caption||o.name)}<small>本书配图 · 书内第 ${esc(f.printedPage??f.pdfPage-6)} 页</small></figcaption></figure>`}).join('')}</div>`:''}<p class="editorial-citation">据《${esc(index.source.title)}》${pages.printed?`，书内第 ${esc(pages.printed)} 页`:''}整理。<span>此处为内容总结，非逐字引文。</span></p></section>`;
}
