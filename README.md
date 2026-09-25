# cultureMuseum

“视觉荆楚”交互网页原型。以九连墩 2 号墓出土的虎座鸟架鼓为首个案例，通过形态、色彩、组织、意象和文化语境五个视角，关联器物原图、高清细部与资料出处。

## 本地运行

这是无需构建的静态网站。安装 Python 3 后，在项目根目录执行：

```sh
python3 -m http.server 43187 --bind 127.0.0.1 --directory dist
```

浏览器访问 <http://127.0.0.1:43187/>。Three.js 已保存在项目内，不需要额外安装依赖。

## 项目结构

- `dist/index.html`、`dist/style.css`、`dist/app.js`：页面、样式与 WebGL 交互。
- `dist/data/artifacts.json`：器物记录、观察点、关系、阅读视角和资料出处；暂不接数据库。
- `dist/assets/`：原始图片与来源说明。
- `dist/vendor/`：Three.js 与其许可证。
- `maintenance/README.md`：提案对应关系、内容维护流程与研究约束。
- `scripts/validate-content.mjs`：内容结构及来源引用校验。

修改内容后，使用 Node.js 执行：

```sh
node scripts/validate-content.mjs
```

同时在浏览器检查观察点、高清图片缩放、引用和手机布局。更多维护说明见 [内容维护文档](maintenance/README.md)。

## 图像与解释边界

当前 WebGL 展台基于真实照片分层和有限角度透视，并非文物三维扫描模型。高清查看保留展陈实拍与馆方照片的不同呈现状态，不将差异解释为已经证实的文物原貌。

馆方图片保留原始来源，项目不对它另行授予许可。高清展陈照片由三十三画生拍摄，采用 CC BY-SA 4.0；具体署名、来源及许可见 [图片来源](dist/assets/drum-exhibition-source.txt) 和网页资料说明。Three.js 的许可见 [THREE-LICENSE.txt](dist/vendor/THREE-LICENSE.txt)。

当前模板展示首件器物；后续扩充还需对应的交互和目录入口。学生维护 skill 尚未安装，固定流程记录在维护文档中。
