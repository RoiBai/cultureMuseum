export const labObjects={
 drum:{id:'drum',name:'虎座鸟架鼓',title:'让鼓声，有形。',english:'01 / RHYTHM & STRUCTURE',intro:'敲中央、试边缘，让自己的节奏留下来。',model:'models/dragon-ring.glb',source:'https://hbsbwg.cjyun.org/zgzb/p/6913.html',facts:{
 tiger:{title:'卧虎，稳住下方',body:'两只背向而坐的卧虎构成底座，凤鸟立在虎背上。动物形象，也承担承托的作用。'},
 phoenix:{title:'凤鸟，举起鼓',body:'两只凤鸟背向而立，长颈向上，鼓悬在凤冠之间。沿着凤身，从虎座看到鼓的高度。'},
 drum:{title:'悬与托，一起用力',body:'大鼓悬在凤冠间，两只小兽后足蹬着凤背、前足托住鼓腔。悬挂与承托共同组成鼓架。'}},note:'基于 Tripo 生成模型；结构分区、补充鼓面与振动用于教学，声音为合成示意。'},
 'hb-6911':{id:'hb-6911',name:'曾侯乙尊盘',title:'冰，在酒之外。',english:'02 / TWO VESSELS, ONE IDEA',intro:'提起、添冰、归位、斟酒。用一次，读懂内外两层。',model:'models/bronze-vessel.glb',source:'https://artsandculture.google.com/asset/bronze-zun-and-pan-of-zeng-hou-yi-pan/vgGnLLw-nwjnLA?hl=zh-cn',catalog:'https://www.hbww.org.cn/zgzb/p/6911.html',facts:{
 zun:{title:'内尊盛酒',body:'中央的尊用来盛酒。把它提起来，就能看见它和外盘是两件器物。'},
 pan:{title:'外盘盛冰',body:'湖北省博物馆的藏品说明记载：铜尊装酒，铜盘盛冰。这层分隔让融冰的水留在酒之外。'},
 cool:{title:'合用，才看懂这套酒器',body:'冰在外盘，酒在内尊。冰吸收周围的热量，经器壁传热，内尊里的酒逐渐变凉；画面只示意这一关系，不模拟历史实测温度。'}},note:'基于 Tripo 生成模型；部件拆分、补充内腔、酒液和冷却过程为教学示意，不是文物结构测绘。'}
};
export const vesselInstructions=[
 ['提起铜尊','向上拖动中央的尊，或移动下方把手。'],
 ['给外盘添冰','点外盘的空处放冰；这次先放三块冰。'],
 ['让尊回到盘心','将铜尊放回原位，冰仍留在外盘。'],
 ['把酒斟进内尊','按住“斟酒”，看酒液进入内尊。'],
 ['酒渐凉，冰水在外','转动器物，观察冰与酒如何被器壁分开。']
];
