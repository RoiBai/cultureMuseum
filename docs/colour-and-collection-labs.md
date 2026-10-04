# 颜色图谱与三件漆器互动（2026-10-04）

## 导航与数据

顶部图谱 tab 增加三维颜色图谱、颜色图谱；左侧只保留当前图谱的时间或筛选。旧 XYZ 图谱继续隐藏。颜色图谱从照片原 HEX 出发，配色工作台为页内延伸操作。参考书页仅用于构图参考，未收入实验室或复制成读图任务。

器物分类中的「漆木」统一为「漆器」，共 49 件；保留器物正式名称与馆方原文中的「漆木」。`featureValues` 同时兼容旧分类数据，返回图谱时也迁移旧的已选条件。

## 照片取色与色名

- 149 件器物的 487 个照片色样全部保留原 HEX / RGB、原占比和对应器物。
- 以 OKLab 色差匹配 [中国传统颜色在线手册](https://github.com/zerosoul/chinese-colors/blob/master/src/assets/colors.json) 中 161 个既有色名；色名和参考 HEX 不修改。数据的作者、MIT 许可和原文件 SHA-256 见 `dist/data/traditional-colours.json` 及同目录 LICENSE。
- 照片原色与参考色并列，近似匹配不等于文物原始颜料测量。现代在线色谱不是古籍色值或国家标准表；古籍释色单独提供篇名和链接，未把所有现代色名附会成古籍原名。
- 赤黑关系采用用户提供的《荆楚有色》正文第 7、163 页（PDF 第 13、169 页），另参故宫馆藏漆器说明。
- 三维点云每件一颗主点，以全配色的占比加权中心定位；其他色卡为卫星点。OKLab 的三个分量经过不同显示尺度映射，再作有限防重叠分离。布局表达配色相近，不代表地理或历史关系。旋转、平移、缩放、色群聚焦与点击档案均沿用同一批器物数据。

## 三件新增体验

| 入口 | 动手内容 | 知识依据 |
| --- | --- | --- |
| `object-lab.html?object=duck` | 转动鸟头、打开背盖、环看乐舞纹饰并对照照片 | [馆藏结构介绍](https://szb.nmgnews.com.cn/nmgrb/html/2023-11/30/content_44883_221709.htm)；颈部圆榫、腹内空间与活动小盖 |
| `object-lab.html?object=jz-458` | 提盖，拖动或逐只收纳示意耳杯，再合盖 | [荆州博物馆](http://www.jzmsm.org/news-458.html)；盒的盖身结构、内壁红漆与耳杯收纳 |
| `object-lab.html?object=chest` | 从箱盖展开星图，转动斗柄观察四季，查看原箱盖照片 | [湖北省博物馆 / Google Arts & Culture](https://artsandculture.google.com/asset/lacquered-suitcase-with-patterns-of-28-xiu/iAH4jTSvoyUsxg?hl=zh-cn)；斗、二十八宿、四方与四季 |

三个 GLB 来自用户提供的 Tripo 生成文件。鸳鸯盒采用已选出的「中间上方」单体（输入文件名 `duck-central-upper.glb`），源 SHA-256、输出哈希、三角面数和贴图尺寸见 `dist/models/new-lab-optimization.json`。原始文件不修改。模型约 9–11 MiB，约 20 万三角面，2048² 内嵌贴图；按页面只加载一个模型。

模型是照片生成表面。分件边界、榫、内腔和三只耳杯为教学示意；三只是互动数量，星点不按真实天文坐标。事实、示意说明与馆藏照片在页内可查。

图片：鸳鸯形漆盒为 Gary Todd / CC0，Wikimedia Commons 题名 `Painted Lacquered Wood Mandarin Duck-shaped Case, Tomb of Marquis Yi of Zeng (10167097453)`；衣箱盖为湖北省博物馆提供的 Google Arts & Culture 图；猪形盒复用本项目荆州博物馆馆藏照片。页面均提供照片来源链接。

## 验证

`npm run check` 增加 `check-colours-labs.mjs`：全部照片色样均可匹配已有条目；原色与参考色分离；红黑加权位置；三维分布；旧分类兼容；开盖后才可收杯、不可变状态、复位、鸟头角度限制、四季循环；三件模型哈希、自包含、体积和分件数量。

Khronos glTF Validator 三件均零错误，每件保留一条原有的运行时生成切线空间警告（由 Three.js 计算法线贴图所需切线）。完整结果见 `collection-glb-validation.json`。

浏览器检查：三件模型实际加载，鸳鸯头转动与开盖，猪形盒三杯收纳，衣箱星图/四季切换；顶部图谱往返，漆器 49 件/168 色样，具体色名与并列参考色；点云聚焦、缩放、旋转。原编钟、鼓、尊盘保留各自模块，通过共享六项导航进入。窄屏点云采用较远全景避免裁切；临时视口检查结束后已请求恢复默认。
