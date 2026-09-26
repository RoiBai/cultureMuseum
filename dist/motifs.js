import * as THREE from './vendor/three.module.js';

const root = document.querySelector('#motif-atlas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const action = (text, className, handler) => {
  const node = el('button', className, text);
  node.type = 'button'; node.onclick = handler; return node;
};
let catalogue, group, relations, cards, scene, dialog, selection, openTrigger;
const readingLabels = { position: '形象的位置', form: '轮廓与组织', color: '漆地与彩绘' };
const reading = { left: '', right: '', lens: 'position', focus: false };
const record = id => catalogue.find(item => item.id === id);
const jump = () => {
  root.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  root.querySelector('h2')?.focus({ preventScroll: true });
};
window.addEventListener('jingchu:open-motif', jump);
document.querySelectorAll('[data-motif-open]').forEach(button => button.onclick = jump);

function sourceAnchor(item, label = '馆方资料 ↗') {
  const a = el('a', 'motif-source', label);
  a.href = item.sources.find(s => s.id === item.comparison.sourceIds[0]).url;
  a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
}
function originalAnchor(item) {
  const a = el('a', 'motif-source', '完整原图 ↗');
  a.href = item.image.src; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
}
function pairFor(left, right) {
  return relations.find(edge => [edge.from, edge.to].includes(left) && [edge.from, edge.to].includes(right));
}
function selectCard(id) {
  selection = id;
  cards.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.record === id)));
  scene?.select(id);
  const item = record(id), detail = root.querySelector('.motif-selected');
  detail.replaceChildren();
  const intro = el('div', 'motif-selected-intro');
  intro.append(el('span', 'motif-overline', item.comparison.role), el('h3', '', item.comparison.subtitle));
  const copy = el('div', 'motif-selected-copy');
  copy.append(el('p', '', item.comparison.position));
  const meta = el('p', 'motif-meta', item.period + ' · ' + item.excavatedFrom);
  copy.append(meta);
  const links = el('div', 'motif-links'); links.append(sourceAnchor(item), originalAnchor(item)); copy.append(links);
  const compare = action(id === group.artifactIds[0] ? '并置看同类母题 ↗' : '与虎座鸟架鼓对比 ↗', 'motif-primary', () => {
    openComparison(group.artifactIds[0], id === group.artifactIds[0] ? group.artifactIds[1] : id);
  });
  detail.append(intro, copy, compare);
}

function buildAtlas() {
  root.replaceChildren();
  const heading = el('header', 'motif-heading');
  const title = el('div');
  title.append(el('span', 'motif-overline', '02 / 循母题 · BIRD FORMS'));
  const h2 = el('h2', '', group.title); h2.tabIndex = -1;
  title.append(h2, el('p', 'motif-lead', group.description));
  const count = el('div', 'motif-count');
  count.append(el('strong', '', String(group.artifactIds.length).padStart(2, '0')), el('span', '', '件器物\n一个母题'));
  heading.append(title, count); root.append(heading);
  const gallery = el('div', 'motif-gallery');
  const canvas = el('canvas', 'motif-canvas'); canvas.setAttribute('aria-hidden', 'true');
  gallery.append(canvas);
  const grid = el('div', 'motif-cards');
  grid.style.gridTemplateColumns = 'repeat(' + group.artifactIds.length + ',minmax(0,1fr))';
  cards = group.artifactIds.map((id, i) => {
    const item = record(id);
    const card = action('', 'motif-card', () => selectCard(id));
    card.dataset.record = id; card.setAttribute('aria-label', '展开' + item.title + '的母题联系');
    card.setAttribute('aria-pressed', 'false');
    const photo = el('img', 'motif-fallback'); photo.src = item.image.src; photo.alt = ''; photo.loading = 'lazy';
    card.append(photo, el('span', 'motif-card-number', '0' + (i + 1)), el('span', 'motif-card-role', item.comparison.role), el('strong', '', item.title), el('span', 'motif-card-era', item.period.split('（')[0]), el('span', 'motif-card-arrow', '↗'));
    grid.append(card); return card;
  });
  gallery.append(grid);
  gallery.append(el('p', 'motif-gallery-note', '点选器物，展开联系 · 图片为馆方原图的空间呈现'));
  root.append(gallery, el('div', 'motif-selected'));
  const foot = el('div', 'motif-footnote');
  foot.append(el('span', '', '在同一个母题中，看见不同的位置、轮廓与用途。'), el('span', '', '形式关联不等同于已经证实的传承关系。'));
  root.append(foot);
  selectCard(group.artifactIds[0]);
  buildScene(canvas, gallery).then(api => { scene = api; scene.select(selection); }).catch(() => {
    gallery.classList.add('motif-static');
  });
}

async function buildScene(canvas, container) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x101613, 0);
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, .1, 50);
  camera.position.set(0, 1.05, 11.8); camera.lookAt(0, .2, 0);
  const content = new THREE.Group(); world.add(content);
  const textureLoader = new THREE.TextureLoader();
  const textures = await Promise.all(group.artifactIds.map(id => textureLoader.loadAsync(record(id).image.src)));
  const vertexShader = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const fragmentShader = `uniform sampler2D photo; varying vec2 vUv;
    void main(){vec4 c=texture2D(photo,vUv);float white=min(c.r,min(c.g,c.b));
    float a=1.-smoothstep(.72,.98,white);if(a<.025)discard;
    vec3 rgb=clamp((c.rgb-vec3(1.-a))/max(a,.025),0.,1.);
    gl_FragColor=vec4(rgb,a);}`;
  const meshes = textures.map((texture, i) => {
    const item = record(group.artifactIds[i]);
    const material = new THREE.ShaderMaterial({ uniforms: { photo: { value: texture } }, vertexShader, fragmentShader, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7 * item.image.height / item.image.width), material);
    mesh.position.set((i - (group.artifactIds.length - 1) / 2) * 3.3, .48, 0); content.add(mesh);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.24, 1.252, 96), new THREE.MeshBasicMaterial({ color: 0xb5a078, transparent: true, opacity: .3, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(mesh.position.x, -.64, 0); content.add(ring);
    return mesh;
  });
  for (let i = 0; i < meshes.length - 1; i++) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(meshes[i].position.x, -.68, 0), new THREE.Vector3((meshes[i].position.x + meshes[i+1].position.x)/2, -.45, -.7), new THREE.Vector3(meshes[i+1].position.x, -.68, 0)]);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), new THREE.LineBasicMaterial({ color: 0x987750, transparent: true, opacity: .38 }));
    content.add(line);
  }
  let width = 0, height = 0, selected = 0, visible = false, tx = 0, ty = 0;
  function resize() {
    width = container.clientWidth; height = container.clientHeight - (width < 680 ? 115 : 130);
    canvas.style.height = height + 'px';
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.position.z = Math.max(2.55 / (2 * Math.tan(THREE.MathUtils.degToRad(16.5))), ((group.artifactIds.length - 1) * 3.3 + 3.7) / (2 * Math.tan(THREE.MathUtils.degToRad(16.5)) * camera.aspect));
    camera.position.y = .75; camera.lookAt(0, .38, 0);
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '120px' }).observe(container);
  container.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || reducedMotion.matches) return;
    const rect = container.getBoundingClientRect(); tx = ((e.clientX - rect.left) / rect.width - .5) * .08; ty = ((e.clientY - rect.top) / rect.height - .5) * .03;
  });
  container.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  container.classList.add('motif-webgl');
  let last = 0;
  function frame(time) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden || time - last < 30) return; last = time;
    content.rotation.y = THREE.MathUtils.lerp(content.rotation.y, tx, .06);
    content.rotation.x = THREE.MathUtils.lerp(content.rotation.x, ty, .06);
    meshes.forEach((mesh, i) => {
      const z = i === selected ? .32 : 0;
      mesh.position.z = reducedMotion.matches ? z : THREE.MathUtils.lerp(mesh.position.z, z, .08);
    });
    renderer.render(world, camera);
  }
  requestAnimationFrame(frame);
  return { select(id) { selected = group.artifactIds.indexOf(id); } };
}

function buildDialog() {
  dialog = el('dialog', 'comparison-dialog'); dialog.id = 'comparison-dialog'; dialog.setAttribute('aria-labelledby', 'comparison-title');
  const header = el('header', 'comparison-header');
  const title = el('div'); title.append(el('span', 'motif-overline', '并置 / LOOK TOGETHER'));
  const h2 = el('h2', '', '同见鸟形，各有其位'); h2.id = 'comparison-title'; title.append(h2);
  const close = action('×', 'close-button', () => dialog.close()); close.setAttribute('aria-label', '关闭器物对比');
  header.append(title, close); dialog.append(header);
  const controls = el('div', 'comparison-controls');
  const lenses = el('div', 'comparison-lenses'); lenses.setAttribute('aria-label', '对比视角');
  for (const [key, label] of Object.entries(readingLabels)) {
    const b = action(label, '', () => { reading.lens = key; updateComparison(); }); b.dataset.lens = key; lenses.append(b);
  }
  const focus = action('定位母题', 'comparison-focus', () => { reading.focus = !reading.focus; updateComparison(); }); focus.id = 'comparison-focus'; focus.setAttribute('aria-pressed', 'false');
  controls.append(lenses, focus); dialog.append(controls);
  const body = el('div', 'comparison-body');
  body.append(el('div', 'comparison-pair'), el('section', 'comparison-connection'));
  const limits = el('p', 'comparison-limits', '图片按版面适配，不代表实物等比例。定位仅放大原图已有像素，不补绘纹样；可随时查看完整原图。');
  body.append(limits); dialog.append(body);
  const foot = el('footer', 'comparison-footer');
  const share = action('复制这组对比链接 ↗', '', async () => {
    const url = new URL(location.href); url.searchParams.set('compare', reading.left + ',' + reading.right); url.searchParams.set('lens', reading.lens); url.hash = 'motif-atlas';
    try { await navigator.clipboard.writeText(url.href); status.textContent = '链接已复制，打开即可回到这组对比。'; }
    catch { link.hidden = false; link.value = url.href; link.focus(); link.select(); status.textContent = '请复制下方链接。'; }
  });
  const status = el('span', 'comparison-status'); status.setAttribute('role', 'status');
  const link = el('input', 'comparison-share-url'); link.readOnly = true; link.hidden = true; link.setAttribute('aria-label', '这组对比的分享链接');
  foot.append(share, status, link); dialog.append(foot);
  dialog.addEventListener('close', () => {
    document.body.classList.remove('comparing');
    openTrigger?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
}
function openComparison(left, right) {
  if (left === right || !pairFor(left, right)) return;
  reading.left = left; reading.right = right; reading.focus = false;
  if (!dialog.open) openTrigger = document.activeElement;
  updateComparison();
  dialog.querySelector('.comparison-status').textContent = '';
  dialog.querySelector('.comparison-share-url').hidden = true;
  document.body.classList.add('comparing'); if (!dialog.open) dialog.showModal();
}
function updateComparison() {
  dialog.querySelectorAll('[data-lens]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lens === reading.lens)));
  const focus = dialog.querySelector('#comparison-focus'); focus.setAttribute('aria-pressed', String(reading.focus)); focus.textContent = reading.focus ? '回到完整原图' : '定位母题';
  const pair = dialog.querySelector('.comparison-pair'); pair.replaceChildren();
  for (const side of ['left', 'right']) {
    const item = record(reading[side]), otherSide = side === 'left' ? 'right' : 'left';
    const column = el('article', 'comparison-column');
    const label = el('label', 'comparison-select-label'); label.append(el('span', '', side === 'left' ? '左侧器物' : '右侧器物'));
    const select = el('select'); select.setAttribute('aria-label', side === 'left' ? '左侧器物' : '右侧器物');
    group.artifactIds.forEach(id => {
      const option = el('option', '', record(id).title); option.value = id; option.selected = id === item.id; option.disabled = id === reading[otherSide]; select.append(option);
    });
    select.onchange = () => { reading[side] = select.value; updateComparison(); dialog.querySelectorAll('select')[side === 'left' ? 0 : 1].focus({preventScroll:true}); }; label.append(select); column.append(label);
    const figure = el('figure', 'comparison-photo');
    const img = el('img'); img.src = item.image.src; img.alt = item.title + '馆方原始照片';
    if (reading.focus) {
      const f = item.comparison.focus;
      img.style.transformOrigin = (f.x * 100) + '% ' + (f.y * 100) + '%'; img.style.transform = 'scale(' + f.scale + ')';
      const marker = el('span', 'comparison-focus-caption', '母题所在区域'); figure.append(marker);
    }
    figure.prepend(img); column.append(figure, el('p','comparison-resolution','馆方原图 · ' + item.image.width + ' × ' + item.image.height + ' px'));
    column.append(el('span', 'comparison-role', item.comparison.role), el('h3', '', item.title));
    const text = el('p', 'comparison-reading', item.comparison[reading.lens]); column.append(text);
    const meta = el('div', 'comparison-metadata'); meta.append(el('p', '', item.period), el('p', '', item.excavatedYear + '年 · ' + item.excavatedFrom), el('p', '', item.dimensions || ('通高 ' + item.heightCm + ' · 宽 ' + item.widthCm + ' cm'))); column.append(meta);
    const links = el('div', 'motif-links'); links.append(sourceAnchor(item), originalAnchor(item)); column.append(links);
    pair.append(column);
  }
  const relation = pairFor(reading.left, reading.right), connection = dialog.querySelector('.comparison-connection');
  connection.replaceChildren();
  for (const [label, text] of [['共同线索', relation.shared], ['组织差异', relation.difference]]) {
    const row = el('div'); row.append(el('h3', '', label), el('p', '', text)); connection.append(row);
  }
  const evidence = el('p', 'comparison-evidence', '以上联系为基于馆方记录的形式比较，不据此认定直接传承。'); connection.append(evidence);
}

async function init() {
  try {
    const response = await fetch('data/artifacts.json?v=3', {cache:'no-cache'}); if (!response.ok) throw new Error('Catalogue unavailable');
    const data = await response.json();
    catalogue = [...data.artifacts, ...data.relatedArtifacts]; group = data.motifGroups[0]; relations = data.comparisons;
    buildDialog(); buildAtlas();
    const params = new URLSearchParams(location.search), pair = params.get('compare')?.split(',');
    if (Object.hasOwn(readingLabels, params.get('lens'))) reading.lens = params.get('lens');
    if (pair?.length === 2 && pair[0] !== pair[1] && pair.every(id => group.artifactIds.includes(id)) && pairFor(...pair)) { jump(); openComparison(...pair); }
    const c = document.modelContext;
    if (c?.registerTool) {
      const abort = new AbortController();
      const tool = { name: 'open_motif_comparison', description: '并置两件馆藏器物，阅读相同鸟形母题的位置、轮廓与彩绘。', inputSchema: { type: 'object', properties: { left: { type: 'string', enum: group.artifactIds }, right: { type: 'string', enum: group.artifactIds }, lens: { type: 'string', enum: Object.keys(readingLabels) } }, required: ['left', 'right'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) {
        if (!input || Object.keys(input).some(k => !['left','right','lens'].includes(k)) || !group.artifactIds.includes(input.left) || !group.artifactIds.includes(input.right) || input.left === input.right || (input.lens !== undefined && !Object.hasOwn(readingLabels,input.lens))) throw new Error('请选择两件不同器物及有效的对比视角');
        reading.lens = input.lens || 'position'; openComparison(input.left, input.right); return { left: reading.left, right: reading.right, lens: reading.lens };
      } };
      try { Promise.resolve(c.registerTool(tool, { signal: abort.signal })).catch(() => {}); } catch {}
      window.addEventListener('pagehide', () => abort.abort(), { once: true });
    }
  } catch (error) {
    console.error(error); root.replaceChildren(el('p', 'motif-loading', '母题资料暂未载入。'));
    root.append(action('重新载入', 'motif-primary', () => location.reload()));
  }
}
init();
