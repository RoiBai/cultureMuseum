export const treasureCatalog='https://hbsbwg.cjyun.org/zgzb/index.html';
// Interpretive prompts are modern activities. Facts and image regions remain separately attributed.
export const treasures=[
 {id:'hb-4695',number:'01',title:'曾侯乙编钟',name:'听见青铜',type:'chimes',tag:'演奏 · 三维环看',intro:'走近钟架，敲下一声，或让一段古曲在钟间流动。',source:'https://www.hbww.org.cn/zgzb/p/4695.html',chapters:[]},
 {id:'hb-4694',number:'02',title:'越王勾践剑',name:'一柄剑的身世',type:'sword',tag:'角色视角 · 铭文解读',intro:'从铸剑者、持剑者与发现者的视角，寻找这柄剑留下的证据。',source:'https://www.hbww.org.cn/zgzb/p/4694.html',chapters:[
  {name:'铸剑者',kicker:'春秋 · 观察制作',title:'把时间，留在青铜上。',text:'从制作者的视角细看剑身：菱形纹沿剑身重复，剑格两面分别嵌有蓝色琉璃与绿松石。这里观察已知形制，不补写佚失的工匠姓名与铸造经历。',rect:[0,.18,1,.32],task:'哪一种线索在剑身上反复出现？',answers:['菱形花纹','花卉枝叶'],correct:0,feedback:'菱形纹饰清晰可辨。馆方同时记载剑首内有 11 道同心圆。'},
  {name:'持剑者',kicker:'春秋 · 铭文指认',title:'八个字，留下一个名字。',text:'靠近剑格的鸟篆铭文记下“越王鸠浅，自作用剑”。馆方说明“鸠浅”即勾践。铭文能够指认剑主，但不能据此断言这柄剑参加过哪一场战役。',rect:[0,.69,1,.16],task:'“鸠浅”对应哪位越王？',answers:['勾践','夫差'],correct:0,feedback:'勾践。下方可以逐字点开铭文释读；展示的是现代汉字，不冒充原始鸟篆字形。'},
  {name:'发现者',kicker:'1965 · 江陵望山',title:'重见天日，问题仍在。',text:'1965 年 12 月，剑在江陵望山一号楚墓出土，当时仍在漆木剑鞘中。一柄越王的剑为何来到楚墓？现有馆方条目并未给出确定的流转链。',rect:[0,0,1,1],task:'哪件事有明确的出土记录？',answers:['出土时带有漆木剑鞘','确由某次战争缴获'],correct:0,feedback:'出土时有剑鞘是明确记录；具体如何由越入楚，仍应保留疑问。'}]},
 {id:'hb-6911',number:'03',title:'曾侯乙尊盘',name:'在镂空处，看见结构',type:'lens',tag:'结构细看 · 微距',intro:'尊与盘，龙与蛇；将目光移入青铜留出的空隙。',source:'https://www.hbww.org.cn/zgzb/p/6911.html',chapters:[
  {name:'口沿',title:'云朵般的镂空',text:'尊的口沿由多层镂空附饰套合；馆方将其中盘绕交错的形象辨认为龙蛇。移动、放大照片，寻找实体与空隙如何交织。',rect:[.30,.005,.43,.19]},
  {name:'尊颈',title:'向上攀附的生命',text:'馆方记载尊颈有四只反首吐舌、向上攀附的豹，身上又以镂空龙蛇装饰。本视角只能呈现其中部分。',rect:[.30,.16,.35,.32]},
  {name:'尊与盘',title:'两件器物，一组构成',text:'1978 年出土于随州曾侯乙墓。尊与盘是两个部件；先看中央的尊，再看展开的盘。完整拆解与背面环看适合下一步接入独立部件的三维模型。',rect:[0,0,1,1]}]},
 {id:'drum',number:'04',title:'虎座鸟架鼓',name:'凤鸣，鼓应',type:'drum',tag:'敲击 · 节奏编排',intro:'轻敲、重敲、边击；在双凤之间写下自己的八拍。',source:'https://www.hbww.org.cn/zgzb/p/6913.html',chapters:[
  {name:'鼓与凤',title:'让一声，悬在双凤之间',text:'这件鼓于 2002 年出土于枣阳九连墩 2 号墓。凤鸟立在卧虎背上，小兽托起鼓腔；黑漆与红黄彩绘组织出承托和悬挂的关系。',rect:[0,0,1,1]}]},
 {id:'hb-4696',number:'05',title:'元青花四爱图梅瓶',name:'一瓶，四种雅趣',type:'pairing',tag:'图像辨认 · 故事配对',intro:'将四位人物与他们所爱的事物相连，再看瓶身如何容纳故事。',source:'https://www.hbww.org.cn/zgzb/p/4696.html',chapters:[
  {name:'瓶肩',title:'凤穿牡丹',text:'肩部的凤穿牡丹图在人物故事之外展开另一层纹饰。将镜头拉近，区分鸟形与花枝。',rect:[.08,.08,.81,.27]},
  {name:'瓶腹',title:'开光里的四爱',text:'本体验依馆方中文条目：王羲之爱兰、陶渊明爱菊、林和靖爱梅鹤、周敦颐爱莲。单张正面照片不能同时展示四面，这里的配对依据文字记录。',rect:[.17,.30,.65,.46]},
  {name:'全貌',title:'层次与留白',text:'元代梅瓶在 2006 年从钟祥郢靖王墓出土。小口、丰肩与收束的下腹，为层层纹样留下不同的展示面积。',rect:[0,0,1,1]}]},
 {id:'hb-6912',number:'06',title:'云梦睡虎地秦简',name:'翻开秦人的日常',type:'slips',tag:'文书抽屉 · 主题阅读',intro:'从田间、市场到徭役，翻开竹简里的制度与生活。',source:'https://www.hbww.org.cn/zgzb/p/6912.html',chapters:[
  {name:'田间',title:'农业生产，也进入文书',text:'馆方介绍秦简中的法律文献涉及农业生产。选择这个抽屉，从一行行墨迹想象记录如何进入日常管理；本页不将现代转述伪作竹简原文。',rect:[.02,.22,.94,.32]},
  {name:'市场',title:'交易背后的规则',text:'市场交易也是馆方列出的秦律内容之一。简牍让我们看到，古代的交换活动同样受到制度的组织。具体条文需回到出土文献释读核对。',rect:[.02,.22,.94,.32]},
  {name:'徭役',title:'从个人，到国家',text:'馆方条目还列出徭役征发与官吏职掌。1975 年云梦出土的这批秦简，保存了秦统一前后丰富的法律文献。',rect:[0,0,1,1]}]},
 {id:'yunxian',number:'07',title:'郧县人头骨化石',name:'从化石，寻找证据',type:'lens',tag:'观察 · 考古记录',intro:'保留裂隙与变形，看看一件化石如何成为研究的起点。',image:'treasure-assets/yunxian-skulls.jpeg',period:'旧石器时代',source:'https://hbsbwg.cjyun.org/p/4693.html',chapters:[
  {name:'整体',title:'从保存状态开始观察',text:'馆方记录，1989 年与 1990 年，学堂梁子先后发现两具头骨化石。这里保留照片中的真实状态，不把缺损与变形自动补成一张想象的人脸。',rect:[0,0,1,1]},
  {name:'表面',title:'裂隙也是信息',text:'放大表面，观察色泽、裂隙与保存状态。照片只能辅助观看，不能替代化石测量，也不能独自支持个体面貌或生活习性的判断。',rect:[.20,.2,.6,.6]}]},
 {id:'hb-6915',number:'08',title:'石家河玉人像',name:'与四千年前的面孔相遇',type:'light',tag:'侧光观察 · 造型',intro:'让观察光圈掠过双眼、鼻与口，读一张史前面孔。',source:'https://www.hbww.org.cn/zgzb/p/6915.html',chapters:[
  {name:'双眼',title:'倾斜的目光',text:'馆方将双眼描述为倾斜的倒八字形。沿着眼眶的方向移动视线，观察它如何影响面部的神态。',rect:[.13,.21,.76,.30]},
  {name:'鼻与口',title:'简练的体面',text:'宽阔的鼻、扁方微闭的口构成人面下部。玉人像出土于天门石家河文化遗址，馆方条目记为距今约 4200—4000 年。',rect:[.13,.38,.76,.30]},
  {name:'全貌',title:'光圈下的玉色',text:'移动观察光圈，可以集中注意器面上的起伏线索。此效果只改变观看方式，不模拟真实光照测量，也不补出照片中没有的结构。',rect:[0,0,1,1]}]},
 {id:'hb-6916',number:'09',title:'崇阳铜鼓',name:'另一种鼓的回声',type:'bronze-drum',tag:'金属音色 · 节奏编排',intro:'换成铜鼓的合成音色，听一听余音如何改变节奏。',source:'https://www.hbww.org.cn/zgzb/p/6916.html',chapters:[
  {name:'器形',title:'铜铸的鼓',text:'1977 年发现于崇阳。铜鼓由鼓身、鼓座与鼓冠组成，器身有云雷纹和乳钉纹，圆形仿皮鼓面没有纹饰。这里的音色是设计用的合成示意，并非原器发声记录。',rect:[0,0,1,1]}]},
 {id:'hb-6914',number:'10',title:'彩绘人物车马出行图',name:'跟随一场出行',type:'procession',tag:'叙事导航 · 漆画细看',intro:'五段画面，从出行到迎宾；沿着馆方描述读一周漆画。',source:'https://www.hbww.org.cn/zgzb/p/6914.html',chapters:[
  {name:'出行',title:'一 · 二段：车马出发',text:'馆方将前两段解释为出行场景。原画围绕漆奁外壁展开，五棵柳树划出段落；本照片是器物局部，不是完整展开图。',rect:[.07,.25,.60,.56]},
  {name:'途中',title:'第三段：猪犬腾跃',text:'馆方对第三段的描述是急奔的狗与猪。这段文字帮助理解整体叙事，但当前器物照片未必呈现该段，不能把局部误当整卷。',rect:[0,0,1,1]},
  {name:'迎宾',title:'四 · 五段：相迎',text:'馆方把后两段解读为迎宾。1987 年荆门包山楚墓出土的这件漆画，将行进与相会连续安排在同一器壁上。',rect:[0,0,1,1]}]}
];
export const inscription=['越','王','鸠','浅','自','作','用','剑'];
export const fourLoves=[['王羲之','兰'],['陶渊明','菊'],['林和靖','梅与鹤'],['周敦颐','莲']];
export const isTreasure=id=>treasures.some(t=>t.id===id);
