import {palette,oklab} from './colour-model.js?v=20261011-review';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=new URL('./assets/baoshan-studio/',import.meta.url);
const asset=file=>new URL(file,base).href;
const ink=hex=>oklab(hex)[0]>.65?'#191519':'#fff5ef';
const downloads=[
 {file:'postcard-people.png',name:'人物版',caption:'人物明信片',type:'postcard'},
 {file:'postcard-animals.png',name:'动物版',caption:'动物明信片',type:'postcard'},
 {file:'video-start.png',name:'首帧',caption:'器壁角色动态 · 首帧',type:'frame'},
 {file:'video-end.png',name:'尾帧',caption:'器壁角色动态 · 尾帧',type:'frame'}
];

/** A prepared conversation, with local assets and no network/chat service. */
export function mountObjectAssistant(a){
 if(a?.id!=='hb-6914')return null;
 const existing=document.querySelector('#object-assistant');if(existing)return null;
 const colours=palette(a),root=document.createElement('div');root.className='object-assistant-root';
 const card=d=>`<figure class="oa-asset"><button type="button" class="oa-asset-image" data-oa-preview="${esc(d.file)}" aria-label="放大${esc(d.caption)}"><img src="${esc(asset(d.file))}" alt="${esc(d.caption)}：${d.type==='frame'?'器壁漆画中的人物与柳树':'漆黑底与朱红线框的器物纹样再设计'}" loading="lazy"><span class="oa-image-pending" hidden>画面准备中</span><span class="oa-enlarge" aria-hidden="true">⤢</span></button><figcaption><span>${esc(d.name)}</span><a href="${esc(asset(d.file))}" download="${esc(d.file)}" aria-label="下载${esc(d.caption)}">下载 PNG ↓</a></figcaption></figure>`;
 root.innerHTML=`<button type="button" class="object-assistant-launcher" aria-controls="object-assistant" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h14v11H9l-4 4v-15Z"/><path d="M9 8.5h6M9 12h4"/></svg><span>器物创作对话<small>色卡 · 明信片 · 动态</small></span></button>
 <aside id="object-assistant" class="object-assistant-panel" aria-labelledby="oa-title" hidden>
 <header class="oa-header"><div><span class="oa-kicker">预设对话</span><h2 id="oa-title">从器物，到创作</h2><p>${esc(a.title)}</p></div><button type="button" class="oa-close" aria-label="关闭器物创作对话">×</button></header>
 <div class="oa-conversation" tabindex="0" aria-label="三轮预设创作对话">
 <div class="oa-conversation-note">一段已准备好的创作记录</div>
 <section class="oa-turn" aria-label="第一轮：器物色卡"><div class="oa-message oa-question"><span class="oa-speaker">我</span><p>你可以把这个器物的配色卡发给我吗？</p></div><div class="oa-message oa-answer"><span class="oa-speaker"><i aria-hidden="true">楚</i> 创作助手</span><p>这是从器物照片前景提取的配色卡，保留了每种颜色的色号与占比。</p><div class="oa-colour-strip" aria-label="照片配色条">${colours.map(c=>`<span style="flex-grow:${Math.max(.025,c.weight)};background:${c.hex}" title="${c.hex.toUpperCase()} · ${Math.round(c.weight*100)}%"></span>`).join('')}</div><div class="oa-colour-codes">${colours.map(c=>`<span><i style="background:${c.hex}"></i><code>${c.hex.toUpperCase()}</code><small>${Math.round(c.weight*100)}%</small></span>`).join('')}</div><a class="oa-download-palette" href="${esc(asset('object-palette.svg'))}" download="彩绘人物车马出行图-照片配色卡.svg">保存配色卡 SVG ↓</a><p class="oa-note">照片取色会受光照与保存状况影响。</p></div></section>
 <section class="oa-turn" aria-label="第二轮：纹样明信片"><div class="oa-message oa-question"><span class="oa-speaker">我</span><p>如果把这个器物上的花样做成明信片可以怎么做？你帮我提取一个。</p></div><div class="oa-message oa-answer"><span class="oa-speaker"><i aria-hidden="true">楚</i> 创作助手</span><p>我做了两个版本：人物版与动物版。保留漆黑底、朱红线框和柳树，把器表画面重新编排成明信片。</p><div class="oa-assets">${downloads.filter(d=>d.type==='postcard').map(card).join('')}</div><p class="oa-note oa-design-note">AI 纹样再设计 · 非原纹样复原</p></div></section>
 <section class="oa-turn" aria-label="第三轮：器壁角色动态"><div class="oa-message oa-question"><span class="oa-speaker">我</span><p>你可以让上面的角色动起来吗？</p></div><div class="oa-message oa-answer"><span class="oa-speaker"><i aria-hidden="true">楚</i> 创作助手</span><p>可以，这是器壁画面中人物与柳树的动态演绎。</p><figure class="oa-video"><video controls playsinline preload="metadata" aria-label="器壁角色动态影片"><source src="${esc(asset('painted-characters.mp4'))}" type="video/mp4">你的浏览器暂不支持视频播放，可以下载 MP4 观看。</video><figcaption><span>器壁角色动态</span><a href="${esc(asset('painted-characters.mp4'))}" download="包山漆奁-器壁角色动态.mp4">下载 MP4 ↓</a></figcaption></figure><p class="oa-note">AI 动态演绎 · 基于器物画面的创作</p></div></section>
 </div><footer class="oa-footer"><span aria-hidden="true">◇</span> 预设内容展示，不提供实时对话</footer>
 </aside>
 <dialog class="oa-preview" aria-labelledby="oa-preview-title"><div class="oa-preview-header"><h2 id="oa-preview-title"></h2><button type="button" class="oa-preview-close" aria-label="关闭大图">×</button></div><img class="oa-preview-image" alt=""><div class="oa-preview-footer"><span>AI 纹样再设计 · 非原纹样复原</span><a class="oa-preview-download" download>下载 PNG ↓</a></div></dialog>`;
 document.body.append(root);
 const launcher=root.querySelector('.object-assistant-launcher'),panel=root.querySelector('.object-assistant-panel'),close=root.querySelector('.oa-close'),preview=root.querySelector('.oa-preview'),previewImage=root.querySelector('.oa-preview-image');
 let lastPreviewButton=null;
 function open(){panel.hidden=false;document.body.classList.add('assistant-open');launcher.setAttribute('aria-expanded','true');close.focus({preventScroll:true})}
 function hide(){root.querySelector('video')?.pause();if(preview.open)preview.close();panel.hidden=true;document.body.classList.remove('assistant-open');launcher.setAttribute('aria-expanded','false');launcher.focus({preventScroll:true})}
 launcher.addEventListener('click',open);close.addEventListener('click',hide);
 const onEscape=e=>{
  if(panel.hidden||preview.open)return;
  if(e.key==='Escape'){e.preventDefault();hide();return}
  if(e.key==='Tab'&&matchMedia('(max-width:900px)').matches){
   const focusable=[...panel.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length),first=focusable[0],last=focusable.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }
 };document.addEventListener('keydown',onEscape);
 const onAssetError=e=>{const img=e.currentTarget;img.hidden=true;img.parentElement.querySelector('.oa-image-pending').hidden=false;img.parentElement.disabled=true;const link=img.closest('figure').querySelector('a');link.setAttribute('aria-disabled','true');link.removeAttribute('href')};
 root.querySelectorAll('.oa-asset-image img').forEach(img=>img.addEventListener('error',onAssetError));
 root.querySelectorAll('[data-oa-preview]').forEach(button=>button.addEventListener('click',()=>{
  const file=button.dataset.oaPreview,d=downloads.find(n=>n.file===file);if(!d)return;lastPreviewButton=button;root.querySelector('#oa-preview-title').textContent=d.caption;previewImage.src=asset(d.file);previewImage.alt=d.caption;root.querySelector('.oa-preview-footer span').textContent=d.type==='frame'?'器壁漆画 · AI 动态演绎素材':'AI 纹样再设计 · 非原纹样复原';const link=root.querySelector('.oa-preview-download');link.href=asset(d.file);link.download=d.file;preview.showModal();root.querySelector('.oa-preview-close').focus();
 }));
 root.querySelector('.oa-preview-close').addEventListener('click',()=>preview.close());preview.addEventListener('click',e=>{if(e.target===preview){const rect=preview.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)preview.close()}});preview.addEventListener('close',()=>lastPreviewButton?.focus({preventScroll:true}));
 return {open,close:hide,destroy(){document.removeEventListener('keydown',onEscape);document.body.classList.remove('assistant-open');if(preview.open)preview.close();root.remove()}};
}

export function paletteSVG(a,colours=palette(a)){
 const count=Math.max(1,colours.length),gap=16,width=(1080-gap*(count-1))/count;
 const swatches=colours.map((c,i)=>{const x=60+i*(width+gap);return `<g><rect x="${x}" y="190" width="${width}" height="365" fill="${c.hex}"/><text x="${x+width/2}" y="235" text-anchor="middle" fill="${ink(c.hex)}" font-family="monospace" font-size="${count>5?17:23}">${c.hex.toUpperCase()}</text><text x="${x+width/2}" y="521" text-anchor="middle" fill="${ink(c.hex)}" font-size="18">${Math.round(c.weight*100)}%</text></g>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#100d10"/><path d="M60 64H1140" stroke="#91463f"/><text x="60" y="111" fill="#eaded7" font-family="serif" font-size="33">${esc(a.title)}</text><text x="60" y="149" fill="#b29b9e" font-family="sans-serif" font-size="17">器物照片配色卡 · ${esc(a.period)} · ${esc(a.collection||'湖北省博物馆')}</text>${swatches}<text x="60" y="605" fill="#d5beb9" font-family="sans-serif" font-size="18">照片前景取色 · HEX 色号 / 相对占比</text><text x="60" y="641" fill="#a68e93" font-family="sans-serif" font-size="16">颜色受拍摄光照与器物保存状况影响，不代表古代颜料的原始色值。</text><path d="M60 687H1140" stroke="#493035"/><text x="60" y="721" fill="#a68e93" font-family="serif" font-size="16">大江大湖间的符号——色彩与文化记忆</text><text x="1140" y="721" text-anchor="end" fill="#a68e93" font-family="monospace" font-size="14">${esc(a.id)}</text></svg>`;
}
