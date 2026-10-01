import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { buildScore, createMelodyPlayer } from './music-player.js';

const stage = document.querySelector('#stage');
const canvas = document.querySelector('#chime-canvas');
const hint = document.querySelector('#interaction-hint');
const tooltip = document.querySelector('#bell-tooltip');
const resetButton = document.querySelector('#reset-view');
const soundButton = document.querySelector('#sound-toggle');
const loading = document.querySelector('#model-loading');
const progress = document.querySelector('#load-progress');
const musicPanel = document.querySelector('#music-player');
const musicButton = document.querySelector('#play-piece');
const stopMusicButton = document.querySelector('#stop-piece');
const musicStatus = document.querySelector('#music-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hintDefault = '按住拖动环看 · 点击钟体敲击 · 滚轮缩放';
hint.setAttribute('role', 'status');
hint.setAttribute('aria-live', 'polite');
function say(text) { hint.textContent = text; }
say(hintDefault);

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.rotateSpeed = 0.55;
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.01);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf3e6c7, 0x172219, 1.2));
  const key = new THREE.DirectionalLight(0xffe0ad, 2.8);
  key.position.set(-2, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa1b6a5, 1.7);
  rim.position.set(2, 1, -2); scene.add(rim);
  const [modelManifest, audioManifest] = await Promise.all([
    fetch('./assets/model-manifest.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('model manifest'); return r.json(); }),
    fetch('./data/audio.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('audio manifest'); return r.json(); })
  ]);
  document.querySelector('#audio-provenance').textContent = audioManifest.description || '编钟实录演示配声。';
  let audioContext;
  let masterGain;
  let soundEnabled = true;
  const audioData = new Map();
  const audioBuffers = new Map();
  const hasAudio = Object.keys(audioManifest.bells || {}).length > 0;
  if (!hasAudio) { soundButton.textContent = '音源待核实'; soundButton.disabled = true; }
  soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (masterGain) masterGain.gain.setTargetAtTime(soundEnabled ? 0.75 : 0, audioContext.currentTime, 0.015);
    soundButton.textContent = '钟声 ' + (soundEnabled ? '开' : '关');
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
    soundButton.setAttribute('aria-label', soundEnabled ? '关闭钟声' : '开启钟声');
  });
  function loadAudio(url) {
    if (!audioData.has(url)) audioData.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error('audio unavailable'); return r.arrayBuffer();
    }).catch(error => { audioData.delete(url); throw error; }));
    return audioData.get(url);
  }
  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain(); masterGain.gain.value = soundEnabled ? 0.75 : 0;
      const limiter = audioContext.createDynamicsCompressor();
      limiter.threshold.value = -3; limiter.knee.value = 3;
      limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.25;
      masterGain.connect(limiter); limiter.connect(audioContext.destination);
    }
    return audioContext;
  }
  function decodeSample(url) {
    if (!audioBuffers.has(url)) audioBuffers.set(url, loadAudio(url)
      .then(data => getAudioContext().decodeAudioData(data.slice(0)))
      .catch(error => { audioBuffers.delete(url); throw error; }));
    return audioBuffers.get(url);
  }
  async function play(item, onStart) {
    const sample = audioManifest.bells?.[item.id];
    const url = sample?.front?.url || sample?.url;
    if (!url) { onStart(); say(item.label + ' · 音源暂未载入'); return; }
    if (!soundEnabled) { onStart(); say(item.label + ' · 钟声已关闭'); return; }
    try {
      await getAudioContext().resume();
      stage.dataset.audioState = 'loading';
      const buffer = await decodeSample(url);
      if (!soundEnabled) { onStart(); say(item.label + ' · 钟声已关闭'); return; }
      const sound = audioContext.createBufferSource();
      sound.buffer = buffer;
      sound.connect(masterGain);
      sound.start(); onStart();
      sound.onended = () => sound.disconnect();
      say(item.label + ' · ' + (sample.front?.label || sample.label || '编钟实录配声'));
      stage.dataset.lastAudio = item.id;
      stage.dataset.audioSample = url;
      stage.dataset.audioState = audioContext.state;
    } catch (error) {
      audioBuffers.delete(url); console.error('钟声音频加载失败', error);
      onStart(); stage.dataset.audioState = 'error';
      say('钟声暂时未能载入，请再点一次');
    }
  }
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => loader.load(
    './assets/' + modelManifest.url, resolve,
    e => { progress.textContent = e.total ? '载入模型 ' + Math.round(e.loaded / e.total * 100) + '%' : '载入三维模型…'; }, reject));
  const model = gltf.scene;
  scene.add(model);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  controls.target.copy(center);
  const items = [];
  const selectable = [];
  const lookup = new Map((modelManifest.bells || []).map(entry => [entry.name, entry]));
  const candidates = [];
  model.traverse(object => {
    if (object.isMesh) {
      object.material.envMapIntensity = 0.58;
      if (lookup.has(object.name) || object.userData.bellId) candidates.push(object);
    }
  });
  for (const mesh of candidates) {
    const entry = lookup.get(mesh.name) || mesh.userData;
    const box = new THREE.Box3().setFromObject(mesh);
    const pivotPoint = box.getCenter(new THREE.Vector3()); pivotPoint.y = box.max.y;
    if (entry.pivot) pivotPoint.fromArray(entry.pivot);
    const pivot = new THREE.Group();
    mesh.parent.add(pivot);
    pivot.position.copy(mesh.parent.worldToLocal(pivotPoint.clone()));
    pivot.attach(mesh);
    mesh.material = mesh.material.clone();
    const index = items.length;
    mesh.userData.bellIndex = index;
    selectable.push(mesh);
    items.push({ id: entry.id || entry.bellId || mesh.name,
      label: entry.label || ('第 ' + (index + 1) + ' 口钟（模型位置）'),
      pivot, mesh, resting: pivot.rotation.clone(), strikeTime: -100,
      size: box.getSize(new THREE.Vector3()) });
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let active = -1;
  let pointerDown = null;
  let dragging = false;
  const pointerContacts = new Set();
  let frame = 0;
  let visible = true;
  let disposed = false;
  let lastTime = performance.now();
  let viewportWidth = stage.clientWidth;
  let viewportHeight = stage.clientHeight;
  let homeDistance = 1;
  let melodyPlayer;
  function setHome() {
    const aspect = viewportWidth / viewportHeight;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFit = size.x / (2 * Math.tan(vFov / 2) * aspect);
    const verticalFit = size.y / (2 * Math.tan(vFov / 2));
    homeDistance = Math.max(horizontalFit, verticalFit) * 1.10 + size.z / 2;
    camera.position.copy(center).add(new THREE.Vector3(0, homeDistance * 0.18, homeDistance));
    controls.target.copy(center);
    controls.minDistance = homeDistance * 0.34;
    controls.maxDistance = homeDistance * 2.8;
    controls.update();
    stage.dataset.orientation = 'front';
    schedule();
  }
  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    const ratioChange = Math.abs(width / height - viewportWidth / viewportHeight) > 0.1;
    viewportWidth = width; viewportHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    if (ratioChange) setHome();
    schedule();
  }
  function schedule() { if (!frame && visible && !document.hidden && !disposed) frame = requestAnimationFrame(render); }
  function render(now) {
    frame = 0;
    const delta = Math.min((now - lastTime) / 1000, 0.05); lastTime = now;
    const moving = controls.update(delta);
    let ringing = false;
    for (const item of items) {
      const elapsed = now / 1000 - item.strikeTime;
      const swinging = elapsed < 2.4;
      const amount = swinging && !reducedMotion.matches ? Math.exp(-elapsed * 2.1) * Math.sin(elapsed * 15) * 0.035 : 0;
      item.pivot.rotation.z = item.resting.z + amount;
      item.pivot.rotation.x = item.resting.x + amount * 0.2;
      if (swinging) ringing = true;
    }
    renderer.render(scene, camera);
    if (moving || ringing || dragging) schedule();
  }
  function hitAt(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(model, true)[0]?.object.userData.bellIndex ?? -1;
  }
  function select(index) {
    if (index === active) return;
    if (active >= 0) items[active].mesh.material.emissiveIntensity = 0;
    active = index;
    stage.dataset.selected = index < 0 ? '' : items[index].id;
    tooltip.hidden = index < 0;
    if (index >= 0) {
      const item = items[index]; item.mesh.material.emissive.set(0xb9985c);
      item.mesh.material.emissiveIntensity = 0.12;
      tooltip.textContent = item.label;
      tooltip.style.left = '50%'; tooltip.style.top = '7%';
      tooltip.style.transform = 'translateX(-50%)';
    }
    schedule();
  }
  function strike(index) {
    if (index < 0) return;
    if (melodyPlayer?.busy) melodyPlayer.stop();
    select(index);
    stage.dataset.lastStrike = items[index].id;
    void play(items[index], () => {
      items[index].strikeTime = performance.now() / 1000;
      schedule();
    });
  }
  canvas.addEventListener('pointerdown', event => {
    stage.focus({ preventScroll: true });
    pointerContacts.add(event.pointerId);
    if (pointerContacts.size === 1) {
      pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId, hit: hitAt(event) };
      dragging = false;
    } else dragging = true;
    stage.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', event => {
    if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) {
      dragging = true; if (!melodyPlayer?.busy) select(-1); stage.dataset.orientation = 'rotated';
    }
    if (!pointerDown && event.pointerType !== 'touch' && !melodyPlayer?.busy) {
      select(hitAt(event)); stage.style.cursor = active >= 0 ? 'pointer' : 'grab';
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (pointerContacts.size === 1 && pointerDown?.id === event.pointerId && !dragging) strike(pointerDown.hit);
    pointerContacts.delete(event.pointerId);
    pointerDown = null;
    if (!pointerContacts.size) dragging = false;
    stage.style.cursor = 'grab'; schedule();
  });
  canvas.addEventListener('pointercancel', () => { pointerDown = null; dragging = false; pointerContacts.clear(); });
  canvas.addEventListener('pointerleave', () => { if (!pointerDown && !melodyPlayer?.busy) select(-1); });
  controls.addEventListener('change', schedule);
  controls.addEventListener('start', schedule);
  resetButton.addEventListener('click', () => { select(-1); setHome(); say(hintDefault); });
  stage.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); if (!items.length) return;
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      select(active < 0 ? (direction > 0 ? 0 : items.length - 1) : (active + direction + items.length) % items.length);
      say(items[active].label + ' · 按回车敲击');
    } else if (event.key === 'Enter') { event.preventDefault(); strike(active); }
    else if (event.key === 'Escape') { melodyPlayer?.stop(); select(-1); }
  });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { lastTime = performance.now(); schedule(); }
  }); intersectionObserver.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && melodyPlayer?.busy) melodyPlayer.stop();
    if (!document.hidden) schedule();
  });
  reducedMotion.addEventListener('change', schedule);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); stage.dataset.ready = 'false';
    melodyPlayer?.stop(); musicButton.disabled = true;
    loading.querySelector('span').textContent = '三维展台暂时中断';
    progress.textContent = '刷新页面可重新载入';
  });
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    melodyPlayer?.stop();
    disposed = true; cancelAnimationFrame(frame); controls.dispose();
    resizeObserver.disconnect(); intersectionObserver.disconnect();
    scene.traverse(object => {
      object.geometry?.dispose();
      for (const material of [].concat(object.material || [])) {
        for (const property of Object.values(material)) if (property?.isTexture) property.dispose();
        material.dispose();
      }
    });
    environmentMap.dispose(); renderer.dispose(); void audioContext?.close();
  }, { once: true });
  resize(); setHome(); renderer.render(scene, camera);
  stage.dataset.ready = 'true'; stage.dataset.bellCount = String(items.length);
  stage.dataset.model = modelManifest.url;
  // Fetch recordings after the model is ready; audio starts only after a deliberate strike.
  const urls = new Set(Object.values(audioManifest.bells || {}).map(sample => sample.front?.url || sample.url).filter(Boolean));
  for (const url of urls) void loadAudio(url).catch(() => {});
  // A score failure leaves the individual bell interactions available.
  void Promise.all(['./data/ancient-piece.json', './data/recorded-pitches.json'].map(url =>
    fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('score unavailable'); return r.json(); })
  )).then(([piece, recordings]) => {
    const score = buildScore(piece, recordings);
    const itemIndexes = new Map(items.map((item, index) => [item.id, index]));
    for (const cue of score.cues) if (!itemIndexes.has(cue.id) || audioManifest.bells[cue.id]?.url !== cue.url) throw new Error('Invalid score bell');
    document.querySelector('#piece-title').textContent = piece.title;
    document.querySelector('#piece-subtitle').textContent = piece.subtitle;
    const note = document.createElement('p'); note.className = 'small-note'; note.textContent = piece.description;
    const source = document.createElement('a'); source.className = 'source-link'; source.textContent = '查看《' + piece.title + '》乐谱出处 ↗';
    source.href = piece.sourceUrl; source.target = '_blank'; source.rel = 'noopener noreferrer';
    document.querySelector('.about-body').append(note, source);
    function formatTime(seconds) { const total = Math.floor(seconds); return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0'); }
    function updateProgress(elapsed, total) {
      document.querySelector('#music-progress-fill').style.width = elapsed / total * 100 + '%';
      document.querySelector('#music-time').textContent = formatTime(elapsed) + ' / ' + formatTime(total);
      musicPanel.dataset.elapsed = elapsed.toFixed(2);
    }
    melodyPlayer = createMelodyPlayer({ getContext: getAudioContext, loadBuffer: decodeSample, getOutput: () => masterGain,
      onCue(cue, count) {
        const index = itemIndexes.get(cue.id); select(index);
        items[index].strikeTime = performance.now() / 1000;
        stage.dataset.lastStrike = cue.id; stage.dataset.lastAudio = cue.id; stage.dataset.audioSample = cue.url;
        stage.dataset.audioState = audioContext.state;
        musicPanel.dataset.note = String(count); musicPanel.dataset.pitch = cue.pitch;
        musicPanel.dataset.bell = cue.id; schedule();
      },
      onProgress: updateProgress,
      onState(state) {
        const busy = state === 'loading' || state === 'playing';
        musicPanel.dataset.state = state;
        musicButton.setAttribute('aria-pressed', String(busy));
        musicButton.setAttribute('aria-label', (busy ? '停止演奏' : '演奏') + '《' + piece.title + '》');
        musicButton.querySelector('.music-icon').textContent = busy ? '■' : '▶';
        stopMusicButton.disabled = !busy;
        musicStatus.textContent = ({ idle: '点击曲名，听编钟演绎', loading: '正在迎入钟声…', playing: soundEnabled ? '正在演奏 · 钟体随声轻晃' : '正在演奏 · 钟声已关闭', complete: '一曲终了 · 点击曲名重听', error: '钟声未能载入 · 点击曲名重试' })[state];
        if (!busy) { select(-1); say(hintDefault); }
      }
    });
    musicButton.disabled = false;
    musicPanel.dataset.state = 'idle'; musicPanel.dataset.note = '0'; musicPanel.dataset.totalNotes = String(score.cues.length);
    musicPanel.dataset.duration = String(score.duration);
    musicStatus.textContent = '点击曲名，听编钟演绎'; updateProgress(0, score.duration);
    musicButton.setAttribute('aria-label', '演奏《' + piece.title + '》');
    musicButton.addEventListener('click', () => {
      if (melodyPlayer.busy) { melodyPlayer.stop(); return; }
      musicPanel.dataset.note = '0';
      say('《' + piece.title + '》 · 拖动可继续环看，点击钟体可接着自己敲');
      void melodyPlayer.start(score);
    });
    stopMusicButton.addEventListener('click', () => melodyPlayer.stop());
    soundButton.addEventListener('click', () => {
      if (musicPanel.dataset.state === 'playing') musicStatus.textContent = soundEnabled ? '正在演奏 · 钟体随声轻晃' : '正在演奏 · 钟声已关闭';
    });
  }).catch(error => {
    console.error('古曲曲谱载入失败', error); musicPanel.dataset.state = 'error';
    musicStatus.textContent = '曲谱暂未载入 · 刷新可重试';
  });
  say(hintDefault);
}
init().catch(error => {
  console.error('编钟三维展台载入失败', error);
  loading.querySelector('span').textContent = '三维模型未能载入';
  progress.textContent = '请刷新重试；下方保留文物资料';
  say('三维展台暂时未能载入');
});
