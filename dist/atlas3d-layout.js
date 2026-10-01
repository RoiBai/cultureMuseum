// Equal-size objects in small reading groups. Era order is ordinal, not a year scale.
// Within an era, arrangement and depth support reading; neither implies chronology.
export const CARD = {width: 3.6, height: 3.6, step: 5.4, rowStep: 10.8};
export const LIFT = 15;
export const featureValues = (a, key) => (Array.isArray(a[key]) ? a[key] : [a[key]]).filter(Boolean);

function placeGroups(items, start, elevation, context) {
  const positions=new Map(), groups=[];
  let cursor=start;
  for(let offset=0;offset<items.length;offset+=4){
    const batch=items.slice(offset,offset+4),rows=batch.length>2?2:1;
    const columns=Math.ceil(batch.length/rows),width=columns*CARD.step+1.6;
    const group={...context,index:groups.length,count:batch.length,ids:batch.map(a=>a.id),start:cursor,end:cursor+width,
      x:cursor+3+(columns-1)*CARD.step/2,width,rows,depth:rows===2?17:4,
      cities:[...new Set(batch.map(a=>a.city))]};
    batch.forEach((a,i)=>{
      const column=Math.floor(i/rows),row=i%rows;
      // Two staggered depth bands and a small, repeating height rhythm. These
      // offsets leave space for upright screen-space captions beneath each image.
      const y=rows===1?2.6:row===0?3.05:2.05;
      const z=rows===1?0:(row===0?-5.4:5.4)+[0,.7,-.4][column];
      positions.set(a.id,{x:cursor+3+column*CARD.step-(row===1?.65:0),y:elevation+y+[.08,-.28,.3][column],z,
        era:context.id,row,group:groups.length,value:context.value});
    });
    groups.push(group);cursor+=width+2.4;
  }
  return {positions,groups,end:groups.at(-1)?.end??start};
}

export function arrangeArchive(data, eraDefs) {
  const positions=new Map(),eras=[],groups=[];
  const cityOrder=[...new Set(data.map(a=>a.city))];
  let cursor=0;
  for(const [id,title,subtitle,number] of eraDefs){
    const items=data.filter(a=>a.era===id).sort((a,b)=>cityOrder.indexOf(a.city)-cityOrder.indexOf(b.city));
    if(!items.length)continue;
    const placed=placeGroups(items,cursor,0,{id,title});
    placed.positions.forEach((p,key)=>positions.set(key,p));
    const era={id,title,subtitle,number,count:items.length,rows:Math.max(...placed.groups.map(g=>g.rows)),
      groupCount:placed.groups.length,x:(cursor+placed.end)/2,start:cursor,end:placed.end,width:placed.end-cursor,depth:17,y:0};
    placed.groups.forEach(g=>groups.push({...g,total:placed.groups.length}));
    eras.push(era);cursor=placed.end+4;
  }
  return {positions,eras,groups,length:eras.at(-1)?.end||0};
}

// One record, one place: multi-feature matches never duplicate an artifact.
export function arrangeLift(data, eraDefs, matchedIds, selected, dimension) {
  const selectedValues=[...(selected[dimension]||[])],byValue=new Map();
  for(const a of data.filter(a=>matchedIds.has(a.id))){
    const values=featureValues(a,dimension);
    const value=selectedValues.find(v=>values.includes(v))||values[0]||'未归类';
    if(!byValue.has(value))byValue.set(value,[]);
    byValue.get(value).push(a);
  }
  const positions=new Map(),shelves=[],eras=[],groups=[];
  let cursor=0;
  for(const [value,items] of byValue){
    const start=cursor;
    for(const [id,title] of eraDefs){
      const peers=items.filter(a=>a.era===id);if(!peers.length)continue;
      const placed=placeGroups(peers,cursor,LIFT,{id,title,value});
      placed.positions.forEach((p,key)=>positions.set(key,p));
      placed.groups.forEach(g=>groups.push({...g,total:placed.groups.length}));
      eras.push({id,title,x:(cursor+placed.end)/2,start:cursor,end:placed.end,value});
      cursor=placed.end+3;
    }
    const end=eras.at(-1).end;
    shelves.push({value,dimension,count:items.length,start,end,x:(start+end)/2,y:LIFT,width:end-start,depth:17});
    cursor=end+5;
  }
  return {positions,shelves,eras,groups,length:shelves.at(-1)?.end||0};
}
