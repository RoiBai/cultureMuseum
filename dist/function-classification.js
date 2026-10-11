// Browsing categories, inferred conservatively from the recorded object name.
// Explicit museum statements can add a use; an excavation in a tomb alone cannot.
export const functionCategories=['礼仪祭祀','饮食酒器','服饰佩饰','乐器','兵器武备','丧葬镇护','书写文书','生活用具','生产工具','交通出行'];
const rules=[
 ['饮食酒器',/(鼎|鬲|甗|簋|簠|豆|敦|尊|罍|觚|觯|爵|斝|卣|觥|酒具|耳杯|盏|碗|盘|盆|壶|勺|匕|筷|匙|铫|食盒|茶具|酒杯|水注|盉|盨|卮|俎|匜|缶|樽|杯|碟|钵|陶锅|茶托|注子|酒注|瓒)/],
 ['服饰佩饰',/(衣|袍|裙|衫|冠|帽|履|鞋|靴|袜|腰带|带钩|带扣|耳环$|耳饰|串饰|挂饰|条形饰|镂空饰|项链|手镯|玉佩|组佩|玉珩|坠饰|玉璜|玉环|玉瑗|玛瑙瑗|玉觽|佩饰|发簪|金簪|银簪|玉簪|凤簪|步摇)/],
 ['乐器',/(编钟|甬钟|钮钟|镈钟|编磬|石磬|鸟架鼓|座鸟鼓|虎座凤架|铜鼓|箎|瑟|古琴|笙|排箫|笛|埙|建鼓|悬鼓)/],
 ['兵器武备',/(剑|戈|戟|矛|铜殳|矢箙|镞|弩|胄|盔|盾|甲胄)/],
 ['丧葬镇护',/(镇墓|棺|椁|俑|魂瓶|明器|冥器)/],
 ['书写文书',/(卜筮祭祷简|竹签牌|遣策|竹简|楚简|秦简|汉简|帛书|木牍|简牍|砚|墨锭|墨条|笔筒|笔架|毛笔|印章|玺印|铜印|玉印|金印|银印)/],
 ['生活用具',/(镜|灯|烛台|枕|席|梳|篦|奁|衣箱|漆箱|漆盒|熏炉|香炉|熨斗|漏壶|提梁卣形盒|酒具盒|盒|箱|漆木案|座屏|漆案|矮足案|面衾|盖罐|梅瓶|葫芦瓶)/],
 ['生产工具',/(纺轮|织机|石斧|石锛|石凿|铜斧|铁斧|铜锛|铜凿|镰|锄|犁|网坠|鱼钩|骨针|尺|木铲|木臼|杵)/],
 ['交通出行',/(车軎|车辖|车马器|车轭|车辕|马衔|马镳|马镫|马鞍|车轮|漆木车)/]
];
export function classifyFunction(a){
 const title=(a.title||'').replace(/《[^》]*》/g,'').replace(/(?:豆|鼎|觚|壶|爵|杯)形/g,''),evidence=[];
 for(const [name,pattern] of rules){const match=title.match(pattern);if(match)evidence.push({name,kind:'器名归类',basis:`依据馆方器名中的“${match[0]}”归入此浏览类别；不代表唯一用途。`});}
 if(/衣箱/.test(title)){const i=evidence.findIndex(e=>e.name==='服饰佩饰');if(i>=0)evidence.splice(i,1);}
 // Containers decorated with weapon/chariot images are not weapons or vehicles.
 if(/纹|图/.test(title)&&/车马|戈|剑/.test(title)&&/(奁|壶|盒|镜|盘)/.test(title)){
  for(let i=evidence.length-1;i>=0;i--)if(['交通出行','兵器武备'].includes(evidence[i].name))evidence.splice(i,1);
 }
 const text=a.sourceExtract||a.description||'';
 const documentedUses=[['饮食酒器',/进食器|供食器|盛食器|陈食器|冰（温）食器|酒器|饮器/],['生活用具',/取暖器|照明用具|梳妆用具/],['服饰佩饰',/形佩|佩饰|腰间佩戴/],['书写文书',/书写工具|书写用具/]];
 for(const [name,pattern] of documentedUses){const sentence=text.split(/[。；\n]/).find(s=>pattern.test(s)&&!/不是|并非|不同于/.test(s));if(sentence&&!evidence.some(e=>e.name===name))evidence.push({name,kind:'馆方用途记述',basis:sentence.trim()});}
 const ritual=text.split(/[。；\n]/).find(s=>/(祭祀用|用于祭祀|祭祀礼器|祭祀的|礼器|礼仪用)/.test(s)&&!/不是|并非|不同于/.test(s));
 if(ritual)evidence.unshift({name:'礼仪祭祀',kind:'馆方用途记述',basis:ritual.trim()});
 return {functionGroup:[...new Set(evidence.map(e=>e.name))],functionEvidence:evidence};
}
export const withFunction=a=>({...a,...classifyFunction(a)});
