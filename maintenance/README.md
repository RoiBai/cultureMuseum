# 器物时间图谱维护

`dist/data/artifacts.json` 是当前 147 条器物记录的维护入口。更新网站不依赖其他本地项目。

## 内容更新

1. 先确认具体器物、年代、出土地、馆藏机构及可核查的来源 URL。没有明确年代的记录暂不加入图谱；出土地不明确时使用“出土地待核”。
2. 保留 `fact`、`observation`、`sourceExtract` 与 `craftEvidence` 的证据区分。不能仅凭照片认定具体铸造方法，也不能由纹样相似直接推断历史传承。
3. 修改 `motifs`、`crafts`、`materialGroup` 时同时核对原始记录与工艺依据。照片颜色由脚本生成；馆方文字颜色另存于 `documentedColors`。
4. 原始照片放在 `dist/assets/`，保留 `image`、`original`、`source`。透明展示副本由 `displayImage` 指向 `dist/cutouts/`，不要覆盖原图。
5. 新的城市会按图谱城市顺序分组；若需要新增城市或分类，同时核对 `dist/app.js` 中的顺序/配色及 `dist/visual-language.js` 中的识别图形。

## 图像处理

`remove-white-background.py` 使用边缘背景种子和 GrabCut 分割；`foreground_masks.py` 保存既有遮罩设置及经检查的灰底、白瓷、阴影约束。新增图片必须查看 `docs/cutout-review-*.jpg`，确认细小器物结构和白色釉面没有被误删；不能把自动抠图视为科学分割。

`prepare.py` 仅从当前展示前景重新提取色板，不会改写器物年代、地点、纹样或工艺证据。它不访问网络，也不依赖其他仓库。每次调整前景后都应运行它，以更新色板、占比与颜色筛选。

`photo_colors.py` 综合明暗、饱和度和色相命名，并核对最终色块。例如 `#545442` 应属于灰绿，而不是金黄。

## 验证与发布

```sh
npm run check
python3 scripts/check-images.py
```

基础检查覆盖唯一 ID、来源链接、资产路径、空朝代省略、密集时代分排以及 320–1600 px 图谱宽度下的不重叠/不溢出。图像检查对比原图哈希、不透明前景 RGB、前景色板与白瓷的白色保留。

浏览器中检查：时代点击直接跳转；工艺、色彩、纹样和材质的线型不同；筛选取并集/交集；未匹配项淡化；路径开关、器物档案与手机布局正常。

推送 `main` 后由 GitHub Actions 验证并发布 `dist/`。发布前后都保留可回退的 Git 提交，不重写旧版本历史。
