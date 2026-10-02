# Tripo 模型优化复现

输入为用户提供的两个 Tripo GLB。原文件只读，未修改。文件名不作为文物身份依据；这些资源是图片生成模型，不是文物扫描或测量模型。

| 输出 | 三角面 | 顶点 | 字节 | MiB |
|---|---:|---:|---:|---:|
| `dist/models/dragon-ring.glb` | 200,000 | 117,152 | 10,152,208 | 9.68 |
| `dist/models/bronze-vessel.glb` | 199,985 | 150,592 | 10,707,824 | 10.21 |

两个模型均为普通 glTF 2.0 GLB：float32 位置、法线和 UV，uint32 索引，内嵌 2048 × 2048 JPEG/PNG 贴图。保留原有 baseColor、metallicRoughness 和 normal 材质槽，无 Draco、Meshopt 或 KTX2 扩展，也没有外部资源请求。meshoptimizer 仅用于制作阶段简化和索引重排。

简化考虑顶点法线与 UV，保留属性接缝；未使用移除孤立部分的 Prune 或不保拓扑的 sloppy 简化。法线和 UV 保留存活顶点的原值，法线贴图缩小后重新归一化向量。这里的质量指标是简化器估计值，不能解释为真实文物的几何误差。

## 复现

使用 Node.js 和 Python 3.9–3.12。临时依赖安装到项目外：

```sh
npm install --prefix /tmp/jingchu-model-tools meshoptimizer@1.1.1
python3 -m venv /tmp/jingchu-model-python
/tmp/jingchu-model-python/bin/pip install Pillow==11.3.0 numpy==1.26.4
MESHOPTIMIZER_DIR=/tmp/jingchu-model-tools/node_modules/meshoptimizer \
PYTHON=/tmp/jingchu-model-python/bin/python \
node scripts/optimize-tripo-models.mjs '/path/to/source-directory'
```

源目录应含 `dragon ring stand 3d model.glb` 和 `ancient bronze vessel 3d model.glb`，也可将两个完整文件路径作为脚本的两个参数。脚本会生成两个 GLB 及 `dist/models/optimization-report.json`；报告包含原文件/输出的 SHA-256、Tripo 来源、几何和纹理统计、原始包围盒、归一化包围盒与高度径向分布。

工具说明：[meshoptimizer 官方 JavaScript 文档](https://github.com/zeux/meshoptimizer/blob/master/js/README.md)。

## 校验与包围盒

使用 Khronos glTF Validator `2.0.0-dev.3.10` 校验，两个文件均为 0 errors、1 warning。警告为 `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE`：原始 Tripo 模型没有显式 tangent，渲染器依据法线和 UV 生成切线空间；两份原始模型也有同一警告。完整输出保存在两个 `*-validation.json` 文件。

模型顶点保留源坐标。以下表格仅说明以最长边为 100、X/Z 居中、最低 Y 为 0 时的尺寸，页面需自行应用该变换：

| 输出 | X 范围 | Y 范围 | Z 范围 |
|---|---|---|---|
| dragon-ring | −43.9257 … 43.9257 | 0 … 100 | −8.5298 … 8.5298 |
| bronze-vessel | −50 … 50 | 0 … 76.7443 | −49.9533 … 49.9533 |

归一化公式：`x' = (x - center.x) × scale`、`y' = (y - min.y) × scale`、`z' = (z - center.z) × scale`，`scale = 100 / max(size.x, size.y, size.z)`。

尊盘教学分组可在源坐标中以 `sqrt(x*x + z*z) < 0.262 && y > 0.155` 划出中央器形；在上述 100 尺度中近似为半径 26.75、高度 15.82。原模型只有一个合并网格，这不是原文件包含的独立部件。按空间范围分组、补底面及新增液体/冰均须称为教学示意。中央尊口在源模型中存在生成的封闭面，不能据此声称已还原真实内腔。
