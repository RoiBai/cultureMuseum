// These small symbols identify categories; they are not facsimiles of an
// individual object's ornament, nor evidence of a historical relationship.
const svg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const motifGlyphs = {
  '凤鸟':'<path d="M3 17c7 1 8-9 13-10l4 2-4 1c2 7-5 10-8 7M14 9C9 3 5 4 3 6c5 0 6 4 7 7M10 16c-1 4-5 5-7 4m10-3c0 3 3 4 5 3"/><circle cx="16" cy="7" r=".7"/>',
  '龙蛇':'<path d="M20 5l-4 1 2 3c-8-4-13 1-10 5s11-1 8-3S3 10 4 19m10-12 1-4m3 3 3-2M9 16l-2 3m6-4 2 3"/>',
  '虎豹':'<path d="M5 9L4 4l6 3h4l6-3-1 5v6l-7 6-7-6zM8 11l2 1m6-1-2 1m-4 4 2 2 2-2M12 8v3M5 14h3m8 0h3"/>',
  '花卉':'<path d="M12 3c4 0 3 5 3 5s5-2 6 2-4 5-4 5 3 4-1 6-4-3-4-3-1 5-5 3-1-6-1-6-5-1-4-5 6-2 6-2-1-5 4-5z"/><circle cx="12" cy="12" r="2"/>',
  '云雷':'<path d="M3 19V5h18v14H8V10h8v4h-4m-9 5h18"/>',
  '几何':'<path d="M12 2l10 10-10 10L2 12zM12 7l5 5-5 5-5-5z"/>',
  '鱼纹':'<path d="M3 12c5-8 12-6 14-2l5-4v12l-5-4c-2 4-9 6-14-2zM10 7l2-3m-2 13 2 3"/><circle cx="7" cy="11" r=".7"/>',
  '兽面':'<path d="M4 4l4 4h8l4-4v12l-8 5-8-5zM6 12h4m4 0h4m-6-3v8m-4 0h8"/>',
  '人像':'<circle cx="12" cy="6" r="3"/><path d="M6 21l1-8 5-3 5 3 1 8M8 15h8M12 11v10"/>',
  '铭文':'<path d="M5 4h14M12 2v6M4 9h16M8 9v6h8V9M5 20l7-4 7 4M12 15v7"/>',
  '鹿角':'<path d="M12 22V11M12 14 6 8 3 2m3 6-4 1m7 2V3m3 11 6-6 3-6m-3 6 4 1m-7 2V3"/>',
  '禽鸟':'<path d="M3 18c5 0 7-2 9-7s5-7 7-3l3 1-4 2c-1 9-10 11-15 7zM7 15l-4-6c6 1 6 4 9 4m2 5 1 4"/>',
  '车马':'<path d="M3 15h13l3-7 3-2-2-3-4 3v6H6L3 8M7 15v6m8-6v6"/><circle cx="6" cy="16" r="2"/>',
  '蝙蝠':'<path d="M12 7 9 4l-1 6L2 5l2 12c4-4 5 1 8 4 3-3 4-8 8-4l2-12-6 5-1-6z"/>'
};
const brush='<path d="m9 15 9-12 3 2-9 12M9 15c-5-1-2 6-7 6 7 2 12-1 10-4z"/>';
const chisel='<path d="m6 18 12-15 3 3L9 21zM4 18l4 4M8 17l3 2"/>';
const needle='<path d="m3 21 14-18c2-2 5 0 3 3L3 21M17 5l1-1M19 8c6 9-7 2-6 9"/>';
const furnace='<path d="M5 12h14v9H5zM4 12l3-3h10l3 3M9 9c-4-4 4-4 1-8m5 8c4-4-3-4-1-7M9 21v-5h6v5"/>';
const inlay='<path d="M3 3h18v18H3zM12 6l6 6-6 6-6-6zM12 9l3 3-3 3-3-3z"/>';
const leaf='<path d="M5 4h14v16H5zM8 7h8v10H8zM2 9h3m14 6h3"/>';
export function craftGlyph(value){
  if (['髹漆','彩绘','釉下彩','斗彩','书写'].includes(value)) return brush;
  if (['刺绣','累丝','夹纻'].includes(value)) return needle;
  if (['铸造','烧造'].includes(value)) return furnace;
  if (['镶嵌','错金'].includes(value)) return inlay;
  if (['鎏金','贴金'].includes(value)) return leaf;
  return chisel;
}
export const materials = {
  '漆器':{color:'#754634',base:'#653e30',ink:'#b8895b',type:'wood'},
  '青铜':{color:'#4c7565',base:'#527669',ink:'#b1a56d',type:'bronze'},
  '玉石':{color:'#719084',base:'#99b6a0',ink:'#ebead0',type:'jade'},
  '丝织':{color:'#975345',base:'#98554b',ink:'#d8af75',type:'weave'},
  '陶瓷':{color:'#4f7189',base:'#e7e5d8',ink:'#54738b',type:'ceramic'},
  '竹简':{color:'#988047',base:'#b39960',ink:'#665937',type:'bamboo'},
  '金银':{color:'#b08c43',base:'#ba954e',ink:'#f0df9e',type:'metal'},
  '玻璃':{color:'#577f86',base:'#96b8b7',ink:'#e0eee2',type:'glass'},
  '水晶':{color:'#7b8194',base:'#b0b5c0',ink:'#f6f2e8',type:'glass'}
};
export function materialSpec(value){return materials[value]||{color:'#86775d',base:'#b4a58d',ink:'#eee4ce',type:'stone'}}
export function materialPattern(id,value){
 const {base,ink,type}=materialSpec(value);
 const marks={
  wood:'<path d="M-4 2Q4-1 12 2T28 2M-4 7Q4 4 12 7T28 7M-4 12Q4 9 12 12T28 12"/>',
  bronze:'<circle cx="3" cy="4" r="1.4"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="3" r=".8"/>',
  jade:'<path d="M-3 13 5 7 7 0M5 7l9 3 8-5M14 10l3 8"/>',
  weave:'<path d="M2 0v16M8 0v16M14 0v16M20 0v16M0 2h24M0 8h24M0 14h24"/>',
  ceramic:'<path d="M-2 11q4-9 8-2t8 0 8-2M2 4q3-4 5 0"/>',
  bamboo:'<path d="M0 4h24M0 11h24M8 0v4M17 4v7M6 11v5"/>',
  metal:'<path d="M0 0l16 16M8 0l16 16M16 0l8 8"/>',
  glass:'<path d="m-2 16 9-16 8 16L23 0M7 0l8 16M1 9h20"/>',
  stone:'<path d="M-2 4l8 3 5-5 9 9 5-4M4 16l6-5 8 4"/>'
 }[type];
 return `<pattern id="${id}" width="24" height="16" patternUnits="userSpaceOnUse"><rect width="24" height="16" fill="${base}"/><g stroke="${ink}" stroke-width=".85" fill="none" opacity=".8">${marks}</g></pattern>`;
}
export function glyphBody(dimension,value){return dimension==='motifs'?(motifGlyphs[value]||motifGlyphs['几何']):craftGlyph(value)}
export function filterSample(dimension,value,palette){
 if(dimension==='colors')return `<i class="colour-sample" style="--chip-color:${palette[value]}"></i>`;
 if(dimension==='motifs')return `<span class="motif-sample">${svg(glyphBody(dimension,value))}</span>`;
 if(dimension==='crafts')return `<span class="craft-sample">${svg(glyphBody(dimension,value))}</span>`;
 if(dimension==='materialGroup'){
  const m=materialSpec(value);return `<i class="material-sample texture-${m.type}" style="--base:${m.base};--texture-ink:${m.ink}"></i>`;
 }
 return '';
}
