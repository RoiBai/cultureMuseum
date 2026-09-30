// Museum photographs remain untouched. These display mattes change only alpha,
// so the original carving, inscriptions, and colors are retained on the stage.
const matteSettings={
 'hb-4695':{crop:[0,130,350,247],mode:'black',cutoff:25},
 'hb-4694':{crop:[329,20,385,576],mode:'light',cutoff:160},
 'hb-6911':{crop:[43,30,310,273],mode:'white',cutoff:224},
 'hb-4696':{crop:[107,32,248,279],mode:'row',tolerance:27},
 'hb-6915':{crop:[238,162,471,474],mode:'row',tolerance:31},
 'hb-6916':{crop:[173,45,536,550],mode:'white',cutoff:226},
 'hb-6912':{crop:[294,60,394,541],mode:'strips',strips:[[296,307],[317,328],[338,348],[358,371],[379,391]]},
 'jz-469':{crop:[145,245,1460,877],mode:'warm',cutoff:11},
 'jz-459':{mode:'row',tolerance:28},
 'jz-355':{mode:'white',cutoff:231},
 'hb-5520':{crop:[48,52,303,255],mode:'white',cutoff:222},
};
const clamp=v=>Math.min(1,Math.max(0,v));
export async function museumForeground(artifact,photo){
 await photo.decode();
 const w=photo.naturalWidth,h=photo.naturalHeight;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(photo,0,0);
 const pixels=context.getImageData(0,0,w,h),raw=pixels.data;
 if(artifact.mask){
   const matte=new Image();matte.src=artifact.mask;await matte.decode();
   const mc=document.createElement('canvas');mc.width=w;mc.height=h;const mx=mc.getContext('2d',{willReadFrequently:true});mx.drawImage(matte,0,0,w,h);
   const alpha=mx.getImageData(0,0,w,h).data;
   for(let n=0;n<w*h;n++)raw[n*4+3]=Math.min(raw[n*4+3],alpha[n*4]);
 }else{
   const cfg=matteSettings[artifact.id];if(!cfg)throw new Error('No verified display matte');
   const crop=cfg.crop??[0,0,w,h];
   for(let y=0;y<h;y++){
     const left=(y*w+3)*4,right=(y*w+w-4)*4;
     const bg=[0,1,2].map(k=>(raw[left+k]+raw[right+k])/2);
     for(let x=0;x<w;x++){
       const p=(y*w+x)*4,r=raw[p],g=raw[p+1],b=raw[p+2],light=(r+g+b)/3;
       let alpha=1;
       if(x<crop[0]||x>=crop[2]||y<crop[1]||y>=crop[3])alpha=0;
       else if(cfg.mode==='black')alpha=clamp((Math.max(r,g,b)-cfg.cutoff)/12);
       else if(cfg.mode==='light')alpha=clamp((cfg.cutoff-light)/12);
       else if(cfg.mode==='white')alpha=clamp((cfg.cutoff-Math.min(r,g,b))/14);
       else if(cfg.mode==='warm')alpha=clamp((r-b-cfg.cutoff)/12);
       else if(cfg.mode==='strips')alpha=cfg.strips.some(([a,b])=>x>=a&&x<b)?1:0;
       else if(cfg.mode==='row'){
         const distance=Math.sqrt((r-bg[0])**2+(g-bg[1])**2+(b-bg[2])**2);
         alpha=clamp((distance-cfg.tolerance)/18);
       }
       raw[p+3]=Math.round(raw[p+3]*alpha);
     }
   }
 }
 context.putImageData(pixels,0,0);
 let left=w,top=h,right=0,bottom=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>30){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)};
 if(right<=left||bottom<=top)throw new Error('Empty foreground');
 const out=document.createElement('canvas');out.width=right-left+1;out.height=bottom-top+1;out.className='artifact-object';
 out.getContext('2d').drawImage(canvas,left,top,out.width,out.height,0,0,out.width,out.height);
 out.dataset.foreground='ready';out.setAttribute('aria-label',artifact.title);
 return out;
}
