import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const [id,input]=process.argv.slice(2),root=fileURLToPath(new URL('../dist/',import.meta.url));
const artifacts=JSON.parse(fs.readFileSync(path.join(root,'data/artifacts.json')));
if(!id||!input||!artifacts.some(a=>a.id===id))throw new Error('用法：node scripts/import-pointcloud-model.mjs <器物 id> <模型.glb>');
const bytes=fs.readFileSync(input);if(bytes.length<20||bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('需要完整的 glTF 2.0 二进制 GLB 文件');
if(bytes.length>50*1024*1024)throw new Error('请先将模型压缩到 50 MB 以下，建议 10 MB 以下');
// Local GLB files are self-contained. Reject external buffers and images before publishing.
if(bytes.readUInt32LE(16)!==0x4e4f534a)throw new Error('GLB 缺少 JSON 首块');
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8').trim());
if((json.extensionsRequired||[]).some(v=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(v)))throw new Error('请导出不使用 Draco、Meshopt 或 KTX2 压缩的模型，当前离线查看器没有这些解码器');
if([...(json.buffers||[]),...(json.images||[])].some(v=>v.uri&&!v.uri.startsWith('data:')))throw new Error('请导出内嵌纹理的 GLB，不要依赖外部 URL');
fs.mkdirSync(path.join(root,'models'),{recursive:true});const target=path.join(root,'models',id+'.glb');if(fs.existsSync(target))throw new Error('模型文件已存在，请检查后再替换，避免覆盖已有模型');
fs.writeFileSync(target,bytes);const manifestPath=path.join(root,'data/pointcloud-models.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));manifest[id]={url:'models/'+id+'.glb',label:'Tripo 模型表面采样',note:'由器物参考照片生成的三维模型，经网格采样转为点云。未拍到的区域为生成推测，不是文物扫描。'};fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('已接入 '+id+'；请运行 npm run check 后预览点云，再发布。');
