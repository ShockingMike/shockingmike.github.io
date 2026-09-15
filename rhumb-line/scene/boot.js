/* Rhumb Line · scene/boot.js
   Start-up and the "Plotting a course" loader (contract §3 and §3a).
   1. Preload with byte counting: every file of #rl-manifest (the page), plus three.js, its addons and the scene modules.
   2. Fonts used by the chart textures.
   3. Import the scene (from the preloaded text, so nothing downloads twice) and build it: textures, geometry,
      shader compile, warm-up frames. Each step reports real progress.
   4. import('../app/main.js') by its real URL (served from the cache warmed in step 1), then
      page.init({ scene, reduce: false }).
   5. At a real 100 %: #loader.is-leaving, the loader's chart settles onto the 3D chart and the camera flies back to the
      seat at the desk, html.is-loading comes off, #loader.is-gone, and `rhumbcabin:ready` fires on window.
   Motion always runs: prefers-reduced-motion is not read (Mike, 2026-09-15); the page is told reduce: false.
   No WebGL, a failed download or a scene error: #loader.is-error for ~1.5 s, html.no-webgl, page.init({ scene: null }),
   then the loader leaves. A stall watchdog makes sure the loader never hangs.
   The shown number only chases the real one: it never runs ahead, never goes back, and reaches 100 only when the scene
   and the page are both ready. Test pages may set window.RHUMB_BOOT = { page: false } (skip the page) or
   { appUrl: '...' } (a stub page module). */
import { createSound } from './sound.js';

const doc = document, html = doc.documentElement;
const CFG = Object.assign({ page: true }, window.RHUMB_BOOT || {});
const SCENE_DIR = new URL('./', import.meta.url).href;
const APP_URL = CFG.appUrl ? new URL(CFG.appUrl, doc.baseURI).href : new URL('../app/main.js', import.meta.url).href;
const HAS_PAGE = CFG.page !== false;
const T0 = performance.now();
const ms = () => Math.round(performance.now() - T0);

const loader = doc.getElementById('loader') || doc.querySelector('[data-qa="loader"]');
const readout = doc.querySelector('[data-loader-readout]');
const trace = [], marks = {};

/* ---------- Module graph of the scene: real (uncompressed) byte sizes, written by tools/qa/harness/scene-manifest.mjs */
/*SCENE-MANIFEST*/const SCENE_FILES = [["three/build/three.core.js",1458113],["three",392831],["./cabin.js",86575],["three/addons/postprocessing/SMAAPass.js",50379],["./lib/canvas-tex.js",33560],["./lib/props.js",27428],["./lib/cabinets.js",23266],["three/addons/postprocessing/GTAOPass.js",19910],["./coast.js",17928],["./lib/decor.js",17586],["three/addons/postprocessing/UnrealBloomPass.js",15397],["three/addons/math/SimplexNoise.js",15148],["./lib/cabin.js",15124],["three/addons/shaders/SMAAShader.js",15002],["./lib/outdoors.js",12861],["three/addons/shaders/GTAOShader.js",12166],["./lib/sheet.js",11047],["./lib/ocean-chart.js",10964],["./lib/bake.js",10907],["./desk.js",9742],["./lib/weather.js",9620],["./lib/coffee.js",8247],["./voyage.js",7889],["./lib/pick.js",7392],["./lib/post.js",7341],["three/addons/shaders/PoissonDenoiseShader.js",7080],["./lib/util.js",6902],["three/addons/geometries/RoundedBoxGeometry.js",6470],["./lib/lamp.js",5588],["./lib/beams.js",4615],["three/addons/postprocessing/Pass.js",4218],["three/addons/postprocessing/OutputPass.js",4184],["./lib/layout.js",3378],["./lib/harbour.js",2899],["three/addons/shaders/OutputShader.js",1876],["./copy.js",1767],["three/addons/shaders/LuminosityHighPassShader.js",1291],["three/addons/shaders/CopyShader.js",729]];/*END*/

function importMap() {
  let imports = {};
  const el = doc.querySelector('script[type="importmap"]');
  if (el) { try { imports = JSON.parse(el.textContent).imports || {}; } catch (e) { imports = {}; } }
  return {
    three: new URL(imports.three || 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.min.js', doc.baseURI).href,
    addons: new URL(imports['three/addons/'] || 'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/', doc.baseURI).href
  };
}
const MAP = importMap();
const THREE_ROOT = MAP.three.replace(/build\/[^/]*$/, '');
function manifestUrl(key) {
  if (key.startsWith('./')) return SCENE_DIR + key.slice(2);
  if (key === 'three') return MAP.three;
  if (key.startsWith('three/addons/')) return MAP.addons + key.slice(13);
  if (key.startsWith('three/')) return THREE_ROOT + key.slice(6);
  return key;
}
function resolveSpec(spec, from) {
  if (spec === 'three') return MAP.three;
  if (spec.startsWith('three/addons/')) return MAP.addons + spec.slice(13);
  return new URL(spec, from).href;
}

/* ---------- Progress: weighted stages ---------- */
// weights follow measured time on a cold shader cache (RTX 3060, local server): build ~2.7 s, compile ~4.2 s, warm-up ~4.5 s
const WEIGHT = { files: 40, fonts: 3, build: 18, compile: 14, warm: 14, page: HAS_PAGE ? 11 : 0 };
const stage = { files: 0, fonts: 0, build: 0, compile: 0, warm: 0, page: HAS_PAGE ? 0 : 1 };
let real = 0, shown = 0, allDone = false, failed = false, leaving = false, lastInt = -1, lastT = 0, lastRise = performance.now();
function recompute() {
  let sum = 0, tot = 0;
  for (const k in WEIGHT) { sum += WEIGHT[k] * stage[k]; tot += WEIGHT[k]; }
  const r = allDone ? 100 : Math.min(99.4, (sum / tot) * 100);
  if (r > real + 0.01) lastRise = performance.now();
  real = Math.max(real, r);
}
function report(k, f) {
  if (!(k in stage)) return;
  f = Math.max(0, Math.min(1, +f || 0));
  if (f > stage[k]) { stage[k] = f; recompute(); }
}

const valueTemplate = (loader && loader.getAttribute('aria-valuetext')) || '';
function valueText(n) { return /\d+/.test(valueTemplate) ? valueTemplate.replace(/\d+/, String(n)) : `${n} percent`; }
function paint(p) {
  if (!loader) return;
  loader.style.setProperty('--progress', (p / 100).toFixed(4));
  const n = Math.floor(p + 1e-6);
  if (n !== lastInt) {
    lastInt = n;
    if (readout) readout.textContent = n + '%';
    loader.setAttribute('aria-valuenow', String(n));
    loader.setAttribute('aria-valuetext', valueText(n));
  }
}
function tick(now) {
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 1 / 60;
  lastT = now;
  if (!failed) {
    if (shown < real) shown = Math.min(real, shown + (real - shown) * (1 - Math.exp(-dt * 5)) + dt * (allDone ? 240 : 7));
    paint(shown);
    trace.push([ms(), +real.toFixed(2), +shown.toFixed(2)]);
    if (allDone && shown >= 100 && !leaving) { marks.shown100 = ms(); leaving = true; setTimeout(leave, 120); }
    // watchdog: no real progress for 25 s means something is stuck; fall back instead of hanging
    if (!allDone && performance.now() - lastRise > 25000) failover('stalled');
  }
  if (!leaving || failed) requestAnimationFrame(tick);
}
paint(0);
requestAnimationFrame(tick);

/* ---------- Sound binds to the page's controls right away (a tap on the loader may start it) ---------- */
const sound = createSound({});

/* ---------- Stage 1: downloads, counting real bytes ---------- */
const IMPORT_RE = /(^[ \t]*|[;}])(import|export)\s*(?:[\w$*{}\s,]*?\s*from\s*)?(["'])([^"'\n]+)\3/gm;
const files = new Map();
function fileRec(url, expected) {
  let f = files.get(url);
  if (!f) { f = { expected: expected || 16000, got: 0, known: !!expected }; files.set(url, f); }
  else if (expected && !f.known) { f.expected = expected; f.known = true; }
  return f;
}
function totals() {
  let e = 0, g = 0;
  files.forEach((f) => { e += f.expected; g += Math.min(f.got, f.expected); });
  report('files', e ? (g / e) * 0.985 : 0);
}
const local = (url) => url.startsWith(location.origin + '/');
let active = 0; const waiting = [];
function limited(url, job) {
  if (!local(url)) return job();
  return new Promise((resolve, reject) => {
    const run = () => { active++; job().then((v) => { active--; next(); resolve(v); }, (e) => { active--; next(); reject(e); }); };
    const next = () => { if (waiting.length && active < 4) waiting.shift()(); };
    if (active < 4) run(); else waiting.push(run);
  });
}
function download(url, f, attempt) {
  f.got = 0;
  return fetch(url, { credentials: 'same-origin' }).then((res) => {
    if (!res.ok) { const err = new Error(`HTTP ${res.status} for ${url.split('/').pop()}`); err.fatal = res.status < 500; throw err; }
    const len = +res.headers.get('content-length');
    if (!f.known && len > 0 && local(url) && !res.headers.get('content-encoding')) f.expected = len;
    if (!res.body || !res.body.getReader) return res.text();
    const reader = res.body.getReader(), chunks = [];
    let got = 0;
    const pump = () => reader.read().then((r) => {
      if (r.done) return;
      chunks.push(r.value); got += r.value.length;
      f.got = Math.min(got, f.expected * 0.995); totals();
      return pump();
    });
    return pump().then(() => {
      const buf = new Uint8Array(got);
      let o = 0;
      for (const c of chunks) { buf.set(c, o); o += c.length; }
      return new TextDecoder().decode(buf);
    });
  }).catch((e) => {
    if (e.fatal || attempt >= 3) throw e;
    return new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt))).then(() => download(url, f, attempt + 1));
  });
}
// parse: follow static imports (scene graph, page modules); keep: keep the text (scene graph, turned into blobs)
function fetchFile(url, { parse = false, expected = 0 } = {}) {
  const f = fileRec(url, expected);
  if (f.promise) return f.promise;
  f.promise = limited(url, () => download(url, f, 0)).then((text) => {
    f.text = text;
    f.expected = Math.max(1, Math.max(f.expected * (f.known ? 1 : 0), f.got));
    f.got = f.expected;
    totals();
    if (!parse) return;
    const deps = [];
    text.replace(IMPORT_RE, (m, pre, kw, q, spec) => { deps.push(resolveSpec(spec, url)); return m; });
    return Promise.all(deps.map((d) => fetchFile(d, { parse: true })));
  });
  return f.promise;
}
const blobs = new Map();
function blobFor(url) {
  if (blobs.has(url)) return blobs.get(url);
  const f = files.get(url);
  if (!f || f.text == null) throw new Error('Module not preloaded: ' + url);
  const src = f.text.replace(IMPORT_RE, (m, pre, kw, q, spec) => m.slice(0, m.length - spec.length - 1) + blobFor(resolveSpec(spec, url)) + q);
  const b = URL.createObjectURL(new Blob([src + '\n//# sourceURL=' + url], { type: 'text/javascript' }));
  blobs.set(url, b);
  return b;
}
function pageManifest() {
  const el = doc.getElementById('rl-manifest');
  if (!el) return [];
  try {
    const data = JSON.parse(el.textContent);
    const list = Array.isArray(data) ? data : (data && data.files) || [];
    return list.map((it) => typeof it === 'string' ? { url: it, bytes: 0 } : Array.isArray(it) ? { url: it[0], bytes: +it[1] || 0 } : { url: it.url || it.src || it.href, bytes: +(it.bytes || it.size) || 0 })
      .filter((it) => it.url)
      .map((it) => ({ url: new URL(it.url, doc.baseURI).href, bytes: it.bytes }));
  } catch (e) { return []; }
}
const PAGE_FILES = pageManifest();
const isModule = (url) => /\.m?js(\?|#|$)/.test(url) && local(url);
PAGE_FILES.forEach((p) => fileRec(p.url, p.bytes));
const preloadPage = () => Promise.all(PAGE_FILES.map((p) => fetchFile(p.url, { parse: isModule(p.url), expected: p.bytes })));

/* ---------- Stage 2: fonts for the canvas textures ---------- */
function fontsStage() {
  const links = [...doc.querySelectorAll('link[rel~="stylesheet"], link[rel="preload"][as="style"]')].filter((l) => /fonts\.googleapis\.com/.test(l.href));
  const sheet = (l) => new Promise((res) => {
    if (l.sheet && l.media !== 'print') return res();
    l.addEventListener('load', () => res(), { once: true });
    l.addEventListener('error', () => res(), { once: true });
    setTimeout(res, 5000);
  });
  const faces = ['500 16px "IBM Plex Mono"', 'italic 500 32px "EB Garamond"', '500 32px "EB Garamond"', '600 16px "Barlow Condensed"'];
  let done = 0;
  return Promise.all(links.map(sheet)).then(() => {
    report('fonts', 0.2);
    if (!doc.fonts || !doc.fonts.load) return;
    return Promise.all(faces.map((face) => Promise.race([doc.fonts.load(face), new Promise((r) => setTimeout(r, 5000))])
      .catch(() => {}).then(() => { done++; report('fonts', 0.2 + (0.8 * done) / faces.length); })));
  }).then(() => report('fonts', 1));
}

/* ---------- Stage 4: the page ---------- */
async function runPage(scene) {
  if (!HAS_PAGE) return;
  report('page', 0.1);
  let mod = null;
  try { mod = await import(APP_URL); } catch (e) { console.error('[Rhumb Line] The page module could not load.', e); }
  report('page', 0.35);
  if (mod && typeof mod.init === 'function') {
    try {
      await Promise.race([Promise.resolve(mod.init({ scene, reduce: false })), new Promise((r) => setTimeout(r, 30000))]);
    } catch (e) { console.error('[Rhumb Line] The page failed to start.', e); }
  }
  marks.pageDone = ms();
  report('page', 1);
}

/* ---------- Leaving the loader ---------- */
let cabin = null;
function afterLoader(fn) {
  if (!loader) { fn(); return; }
  let called = false;
  const go = () => { if (called) return; called = true; loader.removeEventListener('transitionend', onEnd); fn(); };
  const onEnd = (e) => { if (e.target === loader) go(); };
  loader.addEventListener('transitionend', onEnd);
  setTimeout(go, 900);
}
/* The loader's chart settles onto the chart on the desk. A copy of it (ids renamed, readout removed) is laid over the
   scene exactly where the loader drew it and the loader's own chart is hidden, so the dark ground fades away around
   the copy; while the camera rises, the scene reports the 3D harbour chart's rectangle every frame and the copy follows
   it, then fades into it before the camera swings back to the seat. */
function chartOverlay() {
  const src = doc.getElementById('lchart');
  const host = doc.querySelector('[data-qa="scene"]');
  if (!src || !host) return null;
  const r = src.getBoundingClientRect();
  if (!(r.width > 10 && r.height > 10)) return null;
  const el = src.cloneNode(true);
  el.querySelectorAll('.lreadout, .readout, .lmsg, [data-loader-readout]').forEach((n) => n.remove());
  const ids = [];
  [el, ...el.querySelectorAll('[id]')].forEach((n) => { if (n.id) { ids.push(n.id); n.id += '-settle'; } });
  el.querySelectorAll('*').forEach((n) => {
    for (const a of [...n.attributes]) {
      if (a.name === 'id' || !a.value.includes('#')) continue;
      let v = a.value;
      ids.forEach((id) => { v = v.split('url(#' + id + ')').join('url(#' + id + '-settle)'); if (v === '#' + id) v = '#' + id + '-settle'; });
      if (v !== a.value) n.setAttribute(a.name, v);
    }
  });
  el.querySelectorAll(':scope > svg').forEach((s) => Object.assign(s.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' }));
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '2', pointerEvents: 'none', transformOrigin: '0 0', willChange: 'transform, opacity' });
  for (const s of [loader && loader.style, src.style]) if (s) for (const p of s) if (p.startsWith('--')) el.style.setProperty(p, s.getPropertyValue(p));
  el.style.setProperty('--progress', '1');
  host.appendChild(el);
  src.style.visibility = 'hidden';
  let done = false;
  const finish = () => { if (!done) { done = true; el.remove(); } };
  setTimeout(finish, 6000);
  return {
    update(rect, stage, k) {
      if (done) return;
      if (stage === 'fly' || !rect || !(rect.w > 1)) { finish(); return; }
      el.style.transform = `translate(${rect.x - r.left}px, ${rect.y - r.top}px) scale(${rect.w / r.width}, ${rect.h / r.height})`;
      const f = stage === 'rise' ? Math.min(1, Math.max(0, (k - 0.6) / 0.4)) : 0;
      el.style.opacity = String(1 - f * f * (3 - 2 * f));
    },
    finish
  };
}

function leave() {
  if (loader) loader.classList.add('is-leaving');
  marks.leaving = ms();
  let skip = null;
  if (cabin && !failed) {
    let settle = null;
    try { settle = chartOverlay(); } catch (e) { settle = null; }
    cabin.enter({ onIntro: settle ? settle.update : null });
    skip = () => cabin.skip();
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', skip, true);
    setTimeout(() => { window.removeEventListener('pointerdown', skip, true); window.removeEventListener('keydown', skip, true); }, 3000);
  }
  afterLoader(() => {
    html.classList.remove('is-loading');
    if (loader) loader.classList.add('is-gone');
    marks.entered = ms();
    sound.arm();
    if (cabin && !failed) {
      window.dispatchEvent(new CustomEvent('rhumbcabin:ready', { detail: { reduce: false } }));
      cabin.emitBearing();
    }
  });
}

/* ---------- Failure: a quiet note, then the page without 3D ---------- */
let pageRun = null;
function failover(reason) {
  if (failed) return;
  failed = true;
  marks.fail = { at: ms(), reason: String(reason && reason.message || reason) };
  if (loader) loader.classList.add('is-error');
  try { if (cabin && cabin.dispose) cabin.dispose(); } catch (e) { /* already gone */ }
  cabin = null;
  window.RhumbCabin = null;
  const pagePreload = preloadPage().catch(() => {});
  setTimeout(async () => {
    html.classList.add('no-webgl');
    await pagePreload;
    await runPage(null);
    // everything that will load has loaded: the loader reads 100 before it leaves
    paint(100);
    marks.shown100 = ms();
    leaving = true;
    leave();
  }, 1500);
}

// WebGL 2 on real graphics hardware. A software renderer (SwiftShader, llvmpipe, Microsoft Basic Render) would draw
// this scene at a frame every few seconds, so it counts as unavailable and the page runs without 3D.
function webglStatus() {
  if (CFG.forceNoWebGL || /[?&]nowebgl\b/.test(location.search)) return 'forced off';
  try {
    // Ask on the scene's own canvas with exactly the attributes three.js requests, so the renderer later receives this
    // same context: no throw-away context and no "context lost" notice.
    const c = doc.getElementById('scene') || doc.createElement('canvas');
    const gl = c.getContext('webgl2', { alpha: true, depth: true, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true });
    if (!gl) return 'WebGL 2 unavailable';
    // RENDERER is informative in Firefox (where the debug extension is deprecated); Chromium and Safari mask it
    let name = String(gl.getParameter(gl.RENDERER));
    if (/^(webkit webgl|mozilla)$/i.test(name)) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    }
    marks.renderer = name;
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) return 'software renderer: ' + name;
    return '';
  } catch (e) { return 'WebGL 2 unavailable'; }
}

/* ---------- Boot ---------- */
async function boot() {
  const webgl = webglStatus();
  if (webgl) { failover(webgl); return; }
  SCENE_FILES.forEach(([key, bytes]) => fileRec(manifestUrl(key), bytes));
  const entry = SCENE_DIR + 'cabin.js';
  try {
    await Promise.all([preloadPage(), fetchFile(entry, { parse: true }), fontsStage()]);
    marks.filesDone = ms();
    report('files', 1);
    const mod = await import(blobFor(entry));
    const canvas = doc.getElementById('scene');
    const host = doc.querySelector('[data-qa="scene"]') || (canvas && canvas.parentElement);
    cabin = await mod.start({
      report, sound, canvas, host,
      chartRect: () => { const el = doc.getElementById('lchart'); return el ? el.getBoundingClientRect() : null; }
    });
    marks.sceneBuilt = ms();
    window.RhumbCabin = cabin.api;
  } catch (e) {
    if (!failed) {
      console.warn('[Rhumb Line] 3D cabin unavailable, continuing without it:', e && e.message ? e.message : e);
      failover(e);
    }
    return;
  }
  if (failed) return;
  await runPage(cabin.api);
  if (failed) return;
  allDone = true;
  recompute();
  marks.done = ms();
}

window.__rlBoot = {
  trace, marks, files,
  get real() { return real; }, get shown() { return shown; }, get failed() { return failed; },
  sound: () => sound.state()
};
boot();
