export const materials=[
 {id:'cloth',name:'织物',subtitle:'经纬交织',colors:[['玄织','#20251f'],['绛纱','#672d32'],['黛蓝','#233b4b'],['松烟','#354c40'],['素绢','#c8b894'],['赭缎','#80533d']]},
 {id:'bronze',name:'青铜',subtitle:'斑驳金属',colors:[['铜绿','#3d594b'],['古铜','#796846'],['黝铜','#272c28'],['锈褐','#714e39'],['灰青','#627670'],['暗金','#918052']]},
 {id:'ceramic',name:'瓷器',subtitle:'温润釉面',colors:[['粉青','#a3b8a6'],['月白','#d5d8c8'],['墨釉','#242c2d'],['霁蓝','#253e66'],['梅子青','#486758'],['胭脂','#743b43']]},
 {id:'lacquer',name:'漆器',subtitle:'木理与漆光',colors:[['朱漆','#84392f'],['黑漆','#191d1b'],['绛漆','#542d39'],['赭漆','#664632'],['墨绿','#2b4234'],['黄漆','#9e7b3b']]},
 {id:'jade',name:'玉石',subtitle:'流动石理',colors:[['青玉','#788e76'],['白玉','#c3c8ae'],['碧玉','#355647'],['墨玉','#2e3d37'],['黄玉','#b39a69'],['烟紫','#787582']]}
];
export const crafts=[
 {id:'cast',name:'范铸',icon:'◉',materials:['bronze'],summary:'用陶范与陶芯围出器物的形状，金属液凝固后留下纹饰。',steps:['先塑制模型，翻出泥范与泥芯。','晾干、焙烧后组合铸型，浇入金属液。','冷却后脱范，清理并修整器表。'],image:'craft-images/casting-process.png',caption:'泥范铸造的基本流程 · 河南博物院《窄流平底爵》图 1',imageSource:'https://www.chnmus.net/ch/collection/appraise/details.html?id=512157050323636290',source:'https://www.chnmus.net/ch/collection/appraise/details.html?id=512157050323636290',sourceTitle:'河南博物院 · 窄流平底爵（范铸流程）',effect:'让纹样带有金属浮起的明暗边缘。',incompatible:'范铸需要金属与铸型。在这里先换成青铜底材。'},
 {id:'embroider',name:'刺绣',icon:'╳',materials:['cloth'],summary:'以针引线，在织物上依纹样组织针脚，用线的走向与疏密表现层次。',steps:['将纹样安排在绣底上，选择绣线与配色。','按纹样运针，平针、套针等针法组合成形。','调整线的方向与密度，收针完成。'],image:'cutouts/jz-358.webp',caption:'凤鸟花卉纹绣浅黄绢面绵袍 · 荆州博物馆',imageSource:'http://www.jzmsm.org/news-358.html',source:'https://www.dpm.org.cn/collection/embroider/229675.html',sourceTitle:'故宫博物院 · 顾绣渔樵耕读图轴与针法释义',effect:'加入细密针脚和绣线光泽。',incompatible:'刺绣以可穿针的织物为绣底。先选择织物材质。'},
 {id:'underglaze',name:'釉下彩',icon:'◌',materials:['ceramic'],summary:'先在瓷坯上绘画，再罩透明釉入窑烧成，纹样留在釉层之下。',steps:['成型的瓷坯上，用色料描绘纹饰。','覆盖透明釉，让纹样位于釉下。','经高温烧成；青花与釉里红使用不同呈色材料。'],image:'cutouts/hb-4696.webp',caption:'元青花四爱图梅瓶 · 湖北省博物馆',imageSource:'https://www.hbww.org.cn/zgzb/p/4696.html',source:'https://www.dpm.org.cn/lemmas/239391.html',sourceTitle:'故宫博物院 · 青花',effect:'让纹样边缘轻柔晕染，叠加釉面微光。配色为自由创作，不模拟实际烧成色。',incompatible:'釉下彩需要瓷坯和釉层。先选择瓷器底材。'},
 {id:'carve',name:'雕琢',icon:'⋄',materials:['jade'],summary:'工具带动比玉料更硬的解玉砂，逐步研磨出造型与纹饰。',steps:['依玉料形状安排图案，切磨出大体轮廓。','借助工具与解玉砂，琢出线条和凹凸。','细磨抛光，使器表温润。'],image:'cutouts/jz-469.webp',caption:'人执龙形玉佩 · 荆州博物馆',imageSource:'http://www.jzmsm.org/news-469.html',source:'https://www.dpm.org.cn/lemmas/239468.html',sourceTitle:'故宫博物院 · 解玉砂',effect:'把纹样压入玉面，形成内凹线刻的观感。',incompatible:'织物等柔软表面无法按玉雕方式雕琢。这里的雕琢示例适用于玉石底材。'},
 {id:'lacquer-carve',name:'雕漆',icon:'≋',materials:['lacquer'],summary:'在胎体上反复髹漆，积成一定厚度，再在漆层上雕出纹样。',steps:['逐层髹涂，积出可雕刻的漆层。','安排画稿，在漆层上剔刻纹样。','修整轮廓与细部，形成有层次的漆面。'],image:'craft-images/carved-lacquer.jpg',caption:'剔红献花图菱花式盘（明永乐）· 故宫博物院',imageSource:'https://www.dpm.org.cn/collection/lacquerware/232897.html',source:'https://www.dpm.org.cn/collection/lacquerware/232897.html',sourceTitle:'故宫博物院 · 剔红献花图菱花式盘 / 剔红释义',effect:'叠加漆层厚度和雕刻边缘的阴影。',incompatible:'雕漆刻的是积累的漆层。先选择漆器底材。'}
];
export const layouts=[['single','单独一组'],['grid','齐列铺满'],['stagger','错位铺满'],['mirror','交替镜像']];
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
export const compatible=(material,craft)=>!craft||crafts.find(c=>c.id===craft)?.materials.includes(material)||false;
export function defaultProject(){return {version:1,material:'cloth',background:'#354c40',layout:'stagger',size:225,gapX:20,gapY:20,format:'square',craft:null,layers:[{id:'one',rubbing:'hb-4781-1',x:0,y:0,size:.9,rotation:0,flip:false,color:'#d1bf87',opacity:1,weight:1.5}]}}
export function sanitizeProject(raw,entries){
 if(!raw||raw.version!==1)throw new Error('这不是可读取的工坊设计文件。');
 const allowed=new Set(entries.filter(e=>e.available).map(e=>e.id)),base=defaultProject(),hex=v=>/^#[0-9a-f]{6}$/i.test(v||'');
 base.material=materials.some(m=>m.id===raw.material)?raw.material:'cloth';base.background=hex(raw.background)?raw.background:base.background;
 base.layout=layouts.some(([k])=>k===raw.layout)?raw.layout:'single';base.size=clamp(raw.size,90,430);base.gapX=clamp(raw.gapX,-65,130);base.gapY=clamp(raw.gapY,-65,130);base.format=['square','bookmark','landscape'].includes(raw.format)?raw.format:'square';base.craft=compatible(base.material,raw.craft)?raw.craft:null;
 base.layers=(Array.isArray(raw.layers)?raw.layers:[]).filter(l=>l&&allowed.has(l.rubbing)).slice(0,8).map((l,i)=>({id:'layer-'+i,rubbing:l.rubbing,x:clamp(l.x,-.7,.7),y:clamp(l.y,-.7,.7),size:clamp(l.size,.15,1.6),rotation:clamp(l.rotation,-180,180),flip:!!l.flip,color:hex(l.color)?l.color:'#d1bf87',opacity:clamp(l.opacity,.1,1),weight:clamp(l.weight||1.5,1,3)}));return base;
}
export function tilePositions(project,w,h){
 if(project.layout==='single')return [{x:w/2,y:h/2,flip:false}];
 const size=project.size,stepX=Math.max(55,size+project.gapX),stepY=Math.max(55,size+project.gapY),cols=Math.ceil(w/stepX)+2,rows=Math.ceil(h/stepY)+2,result=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)result.push({x:(w-(cols-1)*stepX)/2+col*stepX+(project.layout==='stagger'&&row%2?stepX/2:0),y:(h-(rows-1)*stepY)/2+row*stepY,flip:project.layout==='mirror'&&(col+row)%2===1});return result;
}
export const dimensions=format=>format==='bookmark'?[480,1440]:format==='landscape'?[1200,800]:[1000,1000];
