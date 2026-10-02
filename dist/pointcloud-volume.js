import {random} from './spatial-model.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// These are deliberately labelled shape studies, not photogrammetric reconstructions.
export function volumeRecipe(a={}){
 const t=a.title||'',id=a.id||'';
 if(['drum','jz-459'].includes(id))return {kind:'frame-drum',label:'凤架 · 鼓腔 · 虎座体积推演'};
 if(/剑/.test(t))return {kind:'sword',label:'剑脊 · 剑格 · 剑首体积推演'};
 if(/袍|衾|单衣|绣/.test(t)||a.materialGroup==='丝织')return {kind:'cloth',label:'织物褶面推演'};
 if(/鼎|陶鬲|木鬲/.test(t))return {kind:'tripod',label:'器腹 · 三足 · 双耳体积推演'};
 if(/扁壶/.test(t))return {kind:'lathe',depth:.48,label:'扁壶椭圆器腹推演'};
 if(/瓶|罐|壶|碗|盘|碟|钵|豆|杯|缶|樽|尊|敦|簋|锅|盏|铜鼓|料管|竹筒/.test(t)&&!/形|组合|人物车|尊盘/.test(t))return {kind:'lathe',depth:1,label:'完整回转器形推演',open:/碗|盘|碟|钵|簋|锅|杯|盏/.test(t)};
 if(/镜|佩|璜|瑗|环|玉挂|玉镂|梳|篦|戈|盾|简|册|出行图/.test(t))return {kind:'relief',depth:.12,label:'器片厚度与曲面推演'};
 if(/盒|簠|长方筒|案/.test(t))return {kind:'box',depth:.65,label:'器身四面与盖沿推演'};
 return {kind:'sculpture',depth:1.25,label:'分部环绕器形推演'};
}
export function structuralVolume(pixels,w,h,count=30000,seed=1,recipe={kind:'sculpture',depth:1.25,label:'器形体积推演'}){
 if(recipe.kind==='sword'&&w>h){const turned=new Uint8ClampedArray(pixels.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++)turned.set(pixels.subarray((y*w+x)*4,(y*w+x)*4+4),((w-1-x)*h+y)*4);return structuralVolume(turned,h,w,count,seed,recipe)}
 const rng=random(seed),mask=new Uint8Array(w*h),rows=[],valid=[],nearest=new Int32Array(w*h),queue=new Int32Array(w*h);nearest.fill(-1);let xmin=w,xmax=0,ymin=h,ymax=0,tail=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;if(pixels[p*4+3]>150){mask[p]=1;valid.push(p);nearest[p]=p;queue[tail++]=p;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y)}}
 if(!valid.length)throw new Error('照片没有可提取的前景');
 // Nearest foreground colour prevents the removed photo background being sampled on side walls.
 for(let head=0;head<tail;head++){const p=queue[head],x=p%w,y=Math.floor(p/w);for(const q of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(q>=0&&nearest[q]<0){nearest[q]=nearest[p];queue[tail++]=q}}
 for(let y=0;y<h;y++){const runs=[];for(let x=0;x<w;){if(!mask[y*w+x]){x++;continue}const l=x;while(x<w&&mask[y*w+x])x++;if(x-l>=2)runs.push([l,x-1])}rows.push(runs)}
 const W=xmax-xmin+1,H=ymax-ymin+1,scale=66/Math.max(W,H),cx=(xmin+xmax)/2,cy=(ymin+ymax)/2,worldW=W*scale,worldH=H*scale;
 const position=new Float32Array(count*3),color=new Float32Array(count*3),normal=new Float32Array(count*3),parts=[];let area=0;
 const add=(weight,sample)=>{if(weight>0){area+=weight;parts.push({end:area,sample})}};
 const pixel=(x,y)=>{const q=nearest[clamp(Math.round(y),0,h-1)*w+clamp(Math.round(x),0,w-1)];return q*4};
 const fromWorld=(x,y)=>[x/scale+cx,cy-y/scale];
 const put=(i,p,n,uv)=>{position.set(p,i*3);const length=Math.hypot(...n)||1;normal.set(n.map(v=>v/length),i*3);const k=pixel(...(uv||fromWorld(p[0],p[1])));for(let c=0;c<3;c++)color[i*3+c]=Math.pow(pixels[k+c]/255,.85)};
 const tube=(a,b,ra,rb=ra)=>{const d=b.map((v,k)=>v-a[k]),len=Math.hypot(...d),dir=d.map(v=>v/len);let u=Math.abs(dir[1])<.9?[-dir[2],0,dir[0]]:[dir[1],-dir[0],0];const ul=Math.hypot(...u);u=u.map(v=>v/ul);const v=[dir[1]*u[2]-dir[2]*u[1],dir[2]*u[0]-dir[0]*u[2],dir[0]*u[1]-dir[1]*u[0]];
  add(TAU*(ra+rb)/2*len,()=>{const t=rng(),th=rng()*TAU,r=ra+(rb-ra)*t,n=u.map((k,j)=>k*Math.cos(th)+v[j]*Math.sin(th));return [a.map((k,j)=>k+d[j]*t+n[j]*r),n]});
  for(const [p,r,sign] of [[a,ra,-1],[b,rb,1]])add(Math.PI*r*r,()=>{const th=rng()*TAU,rr=Math.sqrt(rng())*r;return [p.map((k,j)=>k+(u[j]*Math.cos(th)+v[j]*Math.sin(th))*rr),dir.map(k=>k*sign)]});
 };
 const ring=(center,rx,ry,thickness,depth)=>{add(TAU*(rx+ry)/2*TAU*Math.sqrt(thickness*depth),()=>{const t=rng()*TAU,q=rng()*TAU,c=Math.cos(t),s=Math.sin(t);return [[center[0]+(rx+thickness*Math.cos(q))*c,center[1]+(ry+thickness*Math.cos(q))*s,center[2]+depth*Math.sin(q)],[c*Math.cos(q),s*Math.cos(q),Math.sin(q)]]})};
 const ellipsoid=(center,radii)=>{add(4*Math.PI*Math.pow((radii[0]*radii[1]+radii[1]*radii[2]+radii[0]*radii[2])/3,1),()=>{const z=rng()*2-1,t=rng()*TAU,s=Math.sqrt(1-z*z),n=[s*Math.cos(t),z,s*Math.sin(t)];return [center.map((p,k)=>p+radii[k]*n[k]),n.map((p,k)=>p/radii[k])]})};
 const rowShell=(range=[ymin,ymax],depth=1,whole=false)=>{
  for(let y=range[0];y<=range[1];y++){
   const rr=whole&&rows[y]?.length?[[rows[y][0][0],rows[y].at(-1)[1]]]:rows[y]||[];
   for(const [l,r] of rr){const rx=(r-l+1)/2*scale,midx=(l+r)/2,mid=Math.round(midx);let up=y,down=y;while(up>0&&mask[(up-1)*w+mid])up--;while(down<h-1&&mask[(down+1)*w+mid])down++;
    // Complete elliptical rings, with no two parallel photo sheets. Local span keeps holes open.
    const rz=whole?rx*depth:Math.max(scale*.9,Math.min(rx,(down-up+1)*scale*.58)*depth),wx=(midx-cx)*scale,wy=(cy-y)*scale;
    add(TAU*Math.sqrt((rx*rx+rz*rz)/2)*scale,()=>{const t=rng()*TAU,j=(rng()-.5)*scale;return [[wx+rx*Math.cos(t),wy+j,rz*Math.sin(t)],[Math.cos(t)/rx,0,Math.sin(t)/rz],[midx+Math.cos(t)*(r-l)/2,y]]});
   }
  }
 };
 if(recipe.kind==='sword'){
  // The blade is naturally slender: retain it, but give it a diamond ridge and distinct hilt.
  const top=worldH/2,bottom=-worldH/2,guardY=top-worldH*.23,half=worldW*.25,ridge=Math.max(.55,worldW*.13);
  add(worldH*half*3.7,()=>{const t=rng(),section=rng()*4,face=Math.floor(section),q=section-face,y=guardY-(guardY-bottom)*t,width=half*Math.min(1,(1-t)*8),verts=[[width,0],[0,ridge],[-width,0],[0,-ridge]],a=verts[face],b=verts[(face+1)%4];const px=a[0]+(b[0]-a[0])*q,pz=a[1]+(b[1]-a[1])*q;return [[px,y,pz],[face===0||face===3?1:-1,0,face<2?1:-1]]});
  tube([-worldW*.46,guardY,0],[worldW*.46,guardY,0],Math.max(.7,worldW*.13));tube([0,guardY+.7,0],[0,top-worldH*.025,0],worldW*.15);tube([0,top-worldH*.035,0],[0,top,0],worldW*.31);
 }else if(recipe.kind==='tripod'){
  const radius=worldW*.30,bodyTop=worldH*.19,bodyBottom=-worldH*.10,bodyHeight=bodyTop-bodyBottom;
  // Hollow vessel belly, three spatially separated feet and two arched handles.
  add(TAU*radius*bodyHeight,()=>{const t=rng(),th=rng()*TAU,r=radius*(.88+.12*Math.sin(t*Math.PI)),y=bodyBottom+bodyHeight*t;return [[Math.cos(th)*r,y,Math.sin(th)*r],[Math.cos(th),-.1,Math.sin(th)]]});
  add(TAU*radius*bodyHeight*.45,()=>{const t=rng(),th=rng()*TAU,r=radius*(.65+.26*t),y=bodyBottom+bodyHeight*t;return [[Math.cos(th)*r,y,Math.sin(th)*r],[-Math.cos(th),.3,-Math.sin(th)]]});
  for(let k=0;k<3;k++){const t=Math.PI/6+k*TAU/3;const a=[Math.cos(t)*radius*.8,bodyBottom,Math.sin(t)*radius*.8],b=[Math.cos(t)*radius*.92,-worldH*.49,Math.sin(t)*radius*.92];tube(a,b,worldW*.055,worldW*.072)}
  for(const side of [-1,1]){let prev=[side*radius,bodyTop,0];for(let k=1;k<=12;k++){const t=k/12*Math.PI,p=[side*(radius+Math.sin(t)*worldW*.10),bodyTop+Math.sin(t)*worldH*.27,Math.cos(t)*worldW*.11];tube(prev,p,worldW*.025);prev=p}}
 }else if(recipe.kind==='frame-drum'){
  // Preserve the actual photographed phoenix/tiger silhouette, but sweep each component into a closed volume.
  rowShell([ymin,ymax],1.65,false);
  const center=[worldW*(-.02),worldH*.225,0],rx=worldW*.177,ry=worldH*.187;
  // The reference shows the open surviving drum frame. Do not invent a skin across its hole.
  ring(center,rx,ry,worldW*.021,worldW*.16);
  for(const z of [-worldW*.115,worldW*.115])tube([-worldW*.38,-worldH*.30,z],[worldW*.30,-worldH*.30,z],worldW*.025);
 }else if(recipe.kind==='lathe'){
  rowShell([ymin,ymax],recipe.depth||1,true);
  // Close the base; open bowls get an inner wall instead of a filled upper disc.
  const ybase=ymax,base=rows[ybase]?.[0];if(base){const r=(rows[ybase].at(-1)[1]-base[0])/2*scale;add(Math.PI*r*r,()=>{const t=rng()*TAU,rr=Math.sqrt(rng())*r;return [[rr*Math.cos(t),(cy-ybase)*scale,rr*Math.sin(t)*(recipe.depth||1)],[0,-1,0]]})}
  if(recipe.open){let widest=rows.findIndex((r,y)=>y>=ymin&&r.length);for(let y=ymin;y<ymin+H*.55;y++)if((rows[y].at(-1)?.[1]-(rows[y][0]?.[0]||0))>(rows[widest].at(-1)?.[1]-(rows[widest][0]?.[0]||0)))widest=y;
   const rr=rows[widest],r=(rr.at(-1)[1]-rr[0][0])*.46*scale,top=(cy-widest)*scale;
   add(Math.PI*r*r*1.6,()=>{const th=rng()*TAU,t=Math.sqrt(rng()),dep=worldH*.45*(1-t*t);return [[r*t*Math.cos(th),top-dep,r*t*Math.sin(th)],[0,.8,0]]});
  }
 }else if(recipe.kind==='cloth'){
  add(W*H,()=>{const p=valid[Math.floor(rng()*valid.length)],x=(p%w-cx)*scale,y=(cy-Math.floor(p/w))*scale,z=Math.sin(x*.22)*worldW*.065+Math.cos(y*.11)*worldH*.07;return [[x,y,z],[-Math.cos(x*.22)*worldW*.0143,Math.sin(y*.11)*worldH*.0077,1]]});
 }else if(recipe.kind==='relief'){
  const depth=Math.max(.65,Math.min(worldW,worldH)*(recipe.depth||.12));
  add(valid.length*2,()=>{const p=valid[Math.floor(rng()*valid.length)],x=(p%w-cx)*scale,y=(cy-Math.floor(p/w))*scale,side=rng()<.5?1:-1,z=side*depth*(.8+.2*Math.cos(x/Math.max(1,worldW)*Math.PI));return [[x,y,z],[0,0,side]]});
  for(const p of valid){const x=p%w,y=Math.floor(p/w);if(!x||!y||x===w-1||y===h-1||!mask[p-1]||!mask[p+1]||!mask[p-w]||!mask[p+w])add(depth/scale*2,()=>[[(x-cx)*scale,(cy-y)*scale,(rng()*2-1)*depth],[(x-cx)/W,(cy-y)/H,0]])}
 }else if(recipe.kind==='box'){
  // Rectangular section with four textured walls, a visible lid and closed base.
  const d=Math.min(worldW,worldH)*recipe.depth;
  for(let y=ymin;y<=ymax;y++)for(const [l,r] of rows[y]){const left=(l-cx)*scale,right=(r-cx)*scale,yy=(cy-y)*scale,width=right-left;add((width+d*2)*2*scale,()=>{const t=rng()*(width*2+d*4);if(t<width)return [[left+t,yy,d],[0,0,1]];if(t<width*2)return [[right-(t-width),yy,-d],[0,0,-1]];if(t<width*2+d*2)return [[left,yy,-d+t-width*2],[-1,0,0]];return [[right,yy,d-(t-width*2-d*2)],[1,0,0]]})}
  for(const [y,n] of [[ymin,1],[ymax,-1]])add(worldW*d*2,()=>[[(rng()-.5)*worldW,(cy-y)*scale,(rng()*2-1)*d],[0,n,0]]);
 }else{rowShell([ymin,ymax],recipe.depth||1.25,false)}
 if(!parts.length)throw new Error('器形轮廓无法读取');
 for(let i=0;i<count;i++){const v=rng()*area;let lo=0,hi=parts.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(parts[mid].end<v)lo=mid+1;else hi=mid}put(i,...parts[lo].sample())}
 return {position,color,normal,aspect:worldW/worldH,method:recipe.label,kind:recipe.kind,evidence:'依据正面轮廓与器形类别构建完整三维表面，厚度、侧面与背面为结构推演，纹饰采用照片颜色投影；不是文物实测模型。'};
}
