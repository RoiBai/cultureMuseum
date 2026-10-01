export const ERA_ORDER=['neolithic','shang','zhou','spring','warring','qin','han','jin','northsouth','sui','tang','five','song','yuan','ming','qing','modern'];
export function tourItems(artifacts,index,matchedIds,order='era'){
 const located=new Set(index.sites.filter(s=>s.displayCoordinate).flatMap(s=>s.artifactIds));
 return artifacts.filter(a=>located.has(a.id)&&matchedIds.has(a.id)&&(order!=='excavation'||index.records[a.id]?.excavation)).sort((a,b)=>{
  const delta=order==='excavation'?index.records[a.id].excavation.from-index.records[b.id].excavation.from:ERA_ORDER.indexOf(a.era)-ERA_ORDER.indexOf(b.era);
  return delta||a.id.localeCompare(b.id);
 });
}
export function exhibitPhase(progress,reduced=false){
 const p=Math.max(0,Math.min(1,progress));if(reduced)return {beam:1,scale:1,opacity:1};
 const smooth=t=>t*t*(3-2*t),reveal=smooth(Math.min(1,p/.22)),fade=smooth(Math.min(1,(1-p)/.2));
 return {beam:reveal*fade,scale:.18+.82*reveal*fade,opacity:Math.min(1,reveal*1.8)*fade};
}
