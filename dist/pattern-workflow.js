import {esc} from './study-data.js?v=20261011-review';

// These links describe a motif family, not an assertion that every photograph
// illustrates the precise historical variant discussed in the book.
const families={
 '凤鸟纹':'凤鸟','龙蛇复合形态':'龙蛇','龙纹':'龙蛇',
 '云雷纹':'云雷','兽面纹':'兽面','饕餮':'兽面',
 '花卉纹':'花卉','花卉藤蔓':'花卉','几何纹':'几何',
 '鹿角':'鹿角','虎':'虎豹','鸟形意象':'禽鸟','车马出行图':'车马'
};
const clean=value=>String(value||'').replace(/\s/g,'');
function matchScore(motif,entry){
 if(!entry.available)return 0;
 const terms=[motif.name,...motif.aliases||[]].map(clean).filter(t=>t.length>=2);
 // Match the extracted region, not the whole object's title: a phoenix vessel
 // may also have a separate flower or tiger crop.
 const description=clean(entry.label);
 if(terms.some(term=>description.includes(term)))return 2;
 return families[motif.name]===entry.motif?1:0;
}
export function relatedRubbings(motif,entries){
 if(!motif)return [];
 return entries.map(entry=>({entry,score:matchScore(motif,entry)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).map(x=>x.entry);
}
export function readingForRubbing(entry,motifs){
 if(!entry)return null;
 return motifs.map(motif=>({motif,score:matchScore(motif,entry)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).at(0)?.motif||null;
}
export function workflowURL(view,{motifId,objectId}={}){
 const q=new URLSearchParams();
 if(view==='reading'){
  if(motifId)q.set('motif',motifId);
  return 'book.html'+(q.size?'?'+q:'');
 }
 q.set('view',view==='library'?'library':'studio');
 if(motifId)q.set('reading',motifId);
 if(objectId)q.set('object',objectId);
 return 'workshop.html?'+q;
}
export function mountPatternWorkflow({view='reading',motif=null,objectId=null,onView}={}){
 const nav=document.querySelector('[data-pattern-workflow]');if(!nav)return;
 const context={motifId:motif?.id,objectId};
 nav.innerHTML=[['reading','读纹样'],['library','选拓影'],['studio','做设计']].map(([key,label],i)=>`<a href="${esc(workflowURL(key,context))}" data-workflow-view="${key}"${key===view?' aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span>${label}</a>`).join('');
 if(onView)nav.querySelectorAll('[data-workflow-view]').forEach(a=>{if(a.dataset.workflowView!=='reading')a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();onView(a.dataset.workflowView)})});
 const box=document.getElementById('pattern-context');
 if(box){box.hidden=!motif;box.innerHTML=motif?`<span>当前纹样 <strong>${esc(motif.name)}</strong></span><a href="${esc(workflowURL('reading',context))}">阅读来历与书中出处 ↗</a>`:'';}
}
