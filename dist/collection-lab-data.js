export const collectionLabs={
 duck:{name:'鸳鸯形漆盒',model:'models/mandarin-duck.glb',kicker:'04 / TURN · LIFT · DISCOVER',title:'转过头，盒中另有天地。',intro:'试着转动鸟头，再提起背上的小盖。',action:'点鸟头转动 · 点背盖打开',photo:'assets/lab/duck.jpg',photoCredit:'Gary Todd / CC0',photoSource:'https://commons.wikimedia.org/wiki/File:Painted_Lacquered_Wood_Mandarin_Duck-shaped_Case,_Tomb_of_Marquis_Yi_of_Zeng_(10167097453).jpg',source:'https://szb.nmgnews.com.cn/nmgrb/html/2023-11/30/content_44883_221709.htm',sourceLabel:'《内蒙古日报》· 馆藏结构介绍',facts:{
  head:['头为什么能转？','鸟头与身体分开制作，颈下圆榫插入器身卯孔。转动的关键藏在连接处，造型与结构在这里相遇。'],
  lid:['它也是一只盒子','器腹挖空，背部开口并配有小盖。提起盖子，才发现鸟形轮廓里留出了容纳物品的空间。'],
  body:['绕到另一面，再看一次','器身两侧有乐舞图像：一侧表现击鼓起舞，另一侧表现撞钟击磬。模型纹理来自照片生成，细节请对照实物照片。']},note:'使用你选的中间上方一只模型。部件分界、榫与内腔是教学补形；不作为文物测绘。'},
 'jz-458':{name:'猪形酒具盒',model:'models/pig-case.glb',kicker:'05 / OPEN · PLACE · CLOSE',title:'把一席酒具，收进腹中。',intro:'提起盒盖，把三只示意耳杯收好，再合上。',action:'点盖开合 · 拖耳杯入盒 · 空处旋转',photo:'assets/jz-458.png',photoCredit:'荆州博物馆 · 馆藏照片',photoSource:'http://www.jzmsm.org/news-458.html',source:'http://www.jzmsm.org/news-458.html',sourceLabel:'荆州博物馆·猪形酒具盒',detail:'object.html?id=jz-458',facts:{
  lid:['盖与身，分成两半','这件漆木盒由盖和器身组成，两端构成兽首。外观像动物，打开却是一件收纳酒具的容器。'],
  cup:['耳杯，要放得进去','馆方记录说明盒内可容纳耳杯。耳杯两侧的“耳”便于执握；在这里，你可以试着把示意杯逐只收进去。'],
  closed:['收纳，也是一种设计','盖好后，成套酒具被包在一个完整的动物形体里。三只杯是这次互动的练习数量，不表示实际出土杯数。']},note:'盒内腔和三只耳杯为教学示意；杯的尺寸、数量、摆放与动画不代表原物复原。'},
 chest:{detail:'book-object.html?id=book-53894a221c74',name:'二十八宿图衣箱',model:'models/star-chest.glb',kicker:'06 / A SKY ON THE LID',title:'一只衣箱，也装着星空。',intro:'点亮箱盖，让“斗”从器物走向四时。',action:'点箱盖展开星图 · 拖动斗柄 · 旋转观察',photo:'assets/lab/chest-lid.jpg',photoCredit:'湖北省博物馆 / Google 艺术与文化',photoSource:'https://artsandculture.google.com/asset/lacquered-suitcase-with-patterns-of-28-xiu-part1/0wFC39vakIsONQ?hl=zh-cn',source:'https://artsandculture.google.com/asset/lacquered-suitcase-with-patterns-of-28-xiu/iAH4jTSvoyUsxg?hl=zh-cn',sourceLabel:'湖北省博物馆·彩漆二十八宿图衣箱',facts:{
  lid:['先看“斗”，再看周围','箱盖中央写有“斗”字，周围环绕二十八宿名称，两侧绘苍龙与白虎。星空并不只在天上，也进入日常器物的表面。'],
  season:['斗柄所指，四时相随','馆方说明用斗柄方向讲述季节：东为春、南为夏、西为秋、北为冬。转动上方斗柄，观察方向与季节的对应。'],
  body:['它本来的用途，是衣箱','器物出土于曾侯乙墓。馆方依据箱上的文字，将它解释为收纳睡衣的衣箱；这里的活动星图是学习层，不是说木箱原本能机械观星。']},note:'生成模型用于观察器形；文字以馆方照片为准。浮起的星图为名称与方位示意，星点间距不按真实天文坐标。'}
};
export const seasons=[{name:'春',direction:'东',angle:0,color:'#9bad82',copy:'斗柄朝东，天下皆春。'},{name:'夏',direction:'南',angle:90,color:'#bf816c',copy:'斗柄朝南，天下皆夏。'},{name:'秋',direction:'西',angle:180,color:'#cbb16f',copy:'斗柄朝西，天下皆秋。'},{name:'冬',direction:'北',angle:270,color:'#8ba7ad',copy:'斗柄朝北，天下皆冬。'}];
export const mansionGroups=[['角','亢','氐','房','心','尾','箕'],['井','鬼','柳','星','张','翼','轸'],['奎','娄','胃','昴','毕','觜','参'],['斗','牛','女','虚','危','室','壁']];
export function seasonAt(angle){return Math.round(((angle%360)+360)%360/90)%4}
export function createCollectionState(){return {lid:0,head:0,cups:[false,false,false],stars:false,angle:0}}
export function updateCollectionState(state,action){const s={...state,cups:[...state.cups]};if(action.type==='lid')s.lid=Math.max(0,Math.min(1,Number(action.value)||0));if(action.type==='head')s.head=Math.max(-160,Math.min(160,Number(action.value)||0));if(action.type==='cup'&&s.lid>.7&&Number.isInteger(action.index)&&action.index>=0&&action.index<3)s.cups[action.index]=Boolean(action.inside);if(action.type==='stars')s.stars=Boolean(action.value);if(action.type==='angle')s.angle=((Number(action.value)||0)%360+360)%360;if(action.type==='reset')return createCollectionState();return s}
// Spatial partitions of the supplied image-generated surfaces, in a 100-unit bounding box.
export function surfacePart(id,x,y,z){if(id==='duck'){if(y>43&&x< -18)return 'head';if(x> -13&&x<29&&Math.abs(z)<14&&y>43)return 'lid';return 'body'}if(id==='jz-458')return y>22.5?'lid':'body';return y>32?'lid':'body'}
