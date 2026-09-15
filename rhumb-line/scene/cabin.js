/* Rhumb Line · scene/cabin.js
   The 3D cabin behind the page, as an explorable desk (desk contract v2). Everything is generated in code: geometry,
   textures, sky, sea, sound.

   start(boot) builds the scene step by step (reporting real progress to the loader), compiles every shader, renders
   warm-up passes, and returns { api, enter, skip, emitBearing, dispose }. boot.js publishes `api` as
   window.RhumbCabin:
     objects                                   ['log','chart','chest','compass','crew','letter','porthole','lamp']
     focus(id, { duration = 1400 })            fly to an object and open it; Promise
     home({ duration = 1200 })                 back to the seat at the desk, everything closed; Promise
     setPickable(on), setHighlight(id | null)
     getAnchor(id)                             { x, y, w, h, cx, cy, visible }: the object's box on screen (CSS px)
     showLeg(originId | null, { from, duration = 3500 })   chart: a timelapse, the ship sails to that origin's port with
                                               the ink, the day runs fast outside, then the leg's weather; Promise
     skipTravel()                              finish the leg's timelapse at once
     setHint(id | null)                        the object to look at next breathes a slow pale glow
     setBearingPointer(on)                     chart: pointer or finger on the ocean chart draws a bearing from home
     setFound(originIds, { drop })             sacks in the chest; `drop` falls into its compartment
     landfall({ duration = 1600 })             the camera comes to the chest, dusk, the chest glows; Promise (arrival)
     seaMoment('cape' | 'night' | 'homeward' | null)   storm, moonlit night, dusk, or back to the desk's weather
     flickerLamp(), state { mode, focus, weather, found }, pause(), resume()
   Events on window: rhumbcabin:hover { id }, rhumbcabin:select { id }, rhumbcabin:bearing { deg, originId, nmi }.
   data-weather is written on [data-qa="scene"].

   Pieces: desk.js (objects, views, camera fitting), voyage.js, copy.js; lib/layout (positions), lib/bake +
   lib/canvas-tex + lib/ocean-chart (procedural textures), lib/cabin (table, wall, portholes), lib/lamp, lib/props
   (compass, cup, box, log, slip, letter...), lib/sheet (chart sheets, ink, ship pin), lib/pick (pick proxies,
   highlight shells), lib/coffee, lib/beams, lib/outdoors (sky, sea, rain), lib/post, lib/weather. */
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, breathe, frameCost, TAU, vnoise, fillet } from './lib/util.js';
import { LAYOUT } from './lib/layout.js';
import { createBaker, WOOD_FRAG, BRASS_FRAG, BURLAP_FRAG, bakeSet } from './lib/bake.js';
import * as CT from './lib/canvas-tex.js';
import { oceanChartTexture } from './lib/ocean-chart.js';
import { buildTable, buildWall, buildPorthole, makePortholeGlass } from './lib/cabin.js';
import { buildLamp } from './lib/lamp.js';
import { buildCompass, buildCup, buildPencil, buildBeans, buildBox, buildShadows, buildLogbook, buildDividers, buildSlip, buildLetter, CUP_PROFILE } from './lib/props.js';
import { buildSheet, harbourHeight, oceanHeight, HARBOUR_BASE, inkMaterial, createRibbon, buildShipPin } from './lib/sheet.js';
import { addProxy, createHighlights } from './lib/pick.js';
import { buildDecor } from './lib/decor.js';
import { buildCabinets } from './lib/cabinets.js';
import { harbourChart } from './lib/harbour.js';
import { createBeams } from './lib/beams.js';
import { createOutdoors } from './lib/outdoors.js';
import { createPost } from './lib/post.js';
import { WEATHER, cloneWeather, mixWeather } from './lib/weather.js';
import { OBJECT_IDS, LEG_WEATHER, SEA_WEATHER, publicWeather, VIEWS, RECTS, viewPoints, fitPose, newPose, copyPose } from './desk.js';
import { buildRoute, bearingReading, VOYAGE_ORDER, OCEAN, oceanXY, HOME, wrapDeg } from './voyage.js';
import { COPY } from './copy.js';

const DEG = Math.PI / 180;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* three.js allocates mip levels for a mipmapped render target by calling generateMipmap before anything is drawn into
   it (the transmission target, for one); Firefox reports each such call. Skip generateMipmap for a colour texture that
   has been attached to a framebuffer but not yet drawn into: three calls it again right after drawing. */
function guardLazyMipmaps(gl) {
  if (!gl || gl.__rlMipGuard) return;
  gl.__rlMipGuard = true;
  const unwritten = new WeakSet(), colourOf = new WeakMap();
  let drawFb = null;
  const bind = gl.bindFramebuffer.bind(gl);
  gl.bindFramebuffer = (target, fb) => { if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) drawFb = fb; bind(target, fb); };
  const attach = gl.framebufferTexture2D.bind(gl);
  gl.framebufferTexture2D = (target, att, texTarget, tex, level) => {
    attach(target, att, texTarget, tex, level);
    if (tex && level === 0 && att === gl.COLOR_ATTACHMENT0 && texTarget === gl.TEXTURE_2D && (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER)) { unwritten.add(tex); colourOf.set(drawFb, tex); }
  };
  const touch = () => { const t = drawFb && colourOf.get(drawFb); if (t) unwritten.delete(t); };
  ['clear', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'blitFramebuffer'].forEach((fn) => {
    const f = gl[fn].bind(gl);
    gl[fn] = (...args) => { touch(); return f(...args); };
  });
  const generate = gl.generateMipmap.bind(gl);
  gl.generateMipmap = (target) => {
    if (target === gl.TEXTURE_2D) { const t = gl.getParameter(gl.TEXTURE_BINDING_2D); if (t && unwritten.has(t)) return; }
    generate(target);
  };
}

/* Shadow maps made here instead of by three.js: same targets, but the depth comparison samples NEAREST. With LINEAR
   (three's choice) Firefox warns that filtered comparisons are implementation-defined; the 5-tap PCF kernel keeps the
   penumbra soft either way. */
function makeShadowMap(light) {
  const s = light.shadow, size = s.mapSize;
  if (s.map) s.map.dispose();
  if (light.isPointLight) { s.map = new THREE.WebGLCubeRenderTarget(size.x); s.map.depthTexture = new THREE.CubeDepthTexture(size.x, THREE.UnsignedIntType); }
  else { s.map = new THREE.WebGLRenderTarget(size.x, size.y); s.map.depthTexture = new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType); }
  s.map.texture.name = light.name + '.shadowMap';
  s.map.depthTexture.name = light.name + '.shadowMap';
  s.map.depthTexture.format = THREE.DepthFormat;
  s.map.depthTexture.compareFunction = THREE.LessEqualCompare;
  s.map.depthTexture.minFilter = THREE.NearestFilter;
  s.map.depthTexture.magFilter = THREE.NearestFilter;
  s.camera.updateProjectionMatrix();
}

/* The GPU's name: RENDERER when it is informative (Firefox), else the debug extension (Chromium, Safari mask RENDERER). */
export function rendererName(gl) {
  try {
    const plain = String(gl.getParameter(gl.RENDERER));
    if (!/^(webkit webgl|mozilla)$/i.test(plain)) return plain;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : plain;
  } catch (e) { return 'unknown'; }
}

export async function start(boot) {
  // Motion always runs, whatever prefers-reduced-motion says (Mike, 2026-09-15). A slow machine only waits longer and
  // gets lighter rendering (degrade(): AO, shadow maps, pixel ratio); it never loses motion.
  const timeline = [['start', Math.round(performance.now())]];
  const stamp = (name) => timeline.push([name, Math.round(performance.now())]);
  const sound = boot.sound || { tick() {}, creak() {}, thunder() {}, setWeather() {}, arm() {}, state: () => ({}) };
  let canvas = boot.canvas;
  if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'scene'; (boot.host || document.body).appendChild(canvas); }
  const host = boot.host || canvas.parentElement;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mobile = coarse && Math.min(screen.width, screen.height) < 820;
  const Q = mobile
    ? { tier: 'mobile', dpr: clamp(devicePixelRatio, 1, 1.5), msaa: 0, ao: false, dof: true, dofTaps: 24, shadow: 1024, pointShadow: 512, transmission: false, tex: 2048, chart: 2400, level: 0 }
    // chart 2560: a chart sheet is at most ~1500 device px wide on screen (loader view, chart focus at DPR 1.5), and
    // 2560 against 4096 showed no difference at 1440 while drawing both charts 240-360 ms faster (Firefox, WebKit)
    : { tier: 'high', dpr: Math.min(devicePixelRatio, 1.5), msaa: 4, ao: true, dof: true, dofTaps: 48, shadow: 2048, pointShadow: 1024, transmission: true, tex: 4096, chart: 2560, level: 0 };
  // QA only: ?chartpx=N tries another size for the two chart textures (load-time and sharpness comparisons)
  const chartPx = +(new URLSearchParams(location.search).get('chartpx') || 0);
  if (chartPx >= 1024 && chartPx <= 8192) Q.chart = chartPx;
  const view = () => [canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  } catch (e) {
    throw new Error('WebGL could not start on this device');
  }
  guardLazyMipmaps(renderer.getContext());
  renderer.setPixelRatio(Q.dpr);
  renderer.setSize(view()[0], view()[1], false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Shader diagnostics only with ?debug: on Windows/ANGLE the HLSL compiler prints harmless precision notes as warnings,
  // and skipping the synchronous status checks lets shaders compile in parallel.
  renderer.debug.checkShaderErrors = /[?&]debug\b/.test(location.search);
  let contextLost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); contextLost = true; }, false);
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; }, false);

  /* ---------- Build: textures and geometry, step by step ---------- */
  const TOTAL = 34;
  let done = 0;
  let bakeT0 = 0, firstBakeMs = 0;
  const tickBuild = () => { done++; if (done === 1) firstBakeMs = performance.now() - bakeT0; stamp('b' + done); boot.report('build', Math.min(0.99, done / TOTAL)); };
  const step = async () => { tickBuild(); await breathe(); };
  stamp('renderer');
  const baker = createBaker(renderer);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const woodU = (o) => ({
    uSize: { value: new THREE.Vector2(o.size[0], o.size[1]) }, uPlank: { value: o.plank || 0 }, uJoint: { value: o.joint || 0 },
    uVertical: { value: 0 }, uCaulk: { value: o.caulk ? 1 : 0 }, uGroove: { value: o.groove || 0.003 }, uSeed: { value: o.seed || 1 },
    uFigure: { value: o.figure || 1 }, uColA: { value: V(...o.a) }, uColB: { value: V(...o.b) }, uColC: { value: V(...o.c) },
    uCaulkCol: { value: V(0.011, 0.010, 0.009) },
    uWear: { value: new THREE.Vector4(...(o.wear || [0, 0, 1, 0])) },
    uRing1: { value: new THREE.Vector4(...(o.r1 || [0, 0, 0, 0])) }, uRing2: { value: new THREE.Vector4(...(o.r2 || [0, 0, 0, 0])) }
  });
  const big = Q.tex, half = Q.tex / 2;
  const tiles = mobile ? 4 : 3;
  bakeT0 = performance.now();
  const tableTex = await bakeSet(baker, WOOD_FRAG, woodU({
    size: [1.8, 0.92], plank: 0.1152, joint: 1.9, caulk: true, seed: 3.1, figure: 1.0,
    a: [0.16, 0.068, 0.024], b: [0.34, 0.16, 0.062], c: [0.07, 0.03, 0.011],
    wear: [0.95, 0.80, 0.42, 0.55], r1: [1.36, 0.70, 0.036, 0.6], r2: [1.55, 0.58, 0.041, 0.5]
  }), big, half, tiles, tickBuild);
  const wallTex = await bakeSet(baker, WOOD_FRAG, woodU({
    size: [2.6, 4.8], plank: 0.105, joint: 0, groove: 0.004, seed: 7.7, figure: 0.8,
    a: [0.19, 0.085, 0.038], b: [0.36, 0.175, 0.078], c: [0.09, 0.042, 0.018]
  }), Math.round(half * 0.7), Math.round(big * 0.64), tiles, tickBuild);
  const teakTex = await bakeSet(baker, WOOD_FRAG, woodU({
    size: [0.7, 0.7], seed: 11.3, figure: 1.2, a: [0.13, 0.062, 0.026], b: [0.26, 0.13, 0.058], c: [0.055, 0.027, 0.012]
  }), half / 2, half / 2, 2, tickBuild);
  const oakTex = await bakeSet(baker, WOOD_FRAG, woodU({
    size: [0.4, 0.4], seed: 5.2, figure: 1.6, a: [0.34, 0.21, 0.105], b: [0.52, 0.34, 0.18], c: [0.20, 0.12, 0.055]
  }), half / 2, half / 2, 2, tickBuild);
  const brassTex = await bakeSet(baker, BRASS_FRAG, {}, 1024, 1024, 2, tickBuild);
  const burlapTex = await bakeSet(baker, BURLAP_FRAG, {}, 1024, 1024, 2, tickBuild);
  baker.dispose();

  burlapTex.map.repeat.set(5, 3); burlapTex.rough.repeat.set(5, 3); burlapTex.normal.repeat.set(5, 3);
  brassTex.map.repeat.set(3, 1); brassTex.rough.repeat.set(3, 1); brassTex.normal.repeat.set(3, 1);
  await step();

  let canvasMs = performance.now();
  const chartArt = harbourChart();
  const route = buildRoute();
  // Time each canvas texture (window.__cabin.texTimes). With ?texprobe the canvas is read back once so queued 2D
  // drawing is flushed and counted here rather than at upload; never in normal runs (a readback slows canvases down).
  const texTimes = [], texProbe = /[?&]texprobe\b/.test(location.search);
  const timed = (name, fn) => {
    const t0 = performance.now(), r = fn();
    if (texProbe) [r].flat().forEach((x) => [x, x && x.map, x && x.normal].forEach((t) => { if (t && t.image && t.image.getContext) t.image.getContext('2d').getImageData(0, 0, 1, 1); }));
    texTimes.push([name, Math.round(performance.now() - t0)]);
    return r;
  };
  const T = {
    chart: timed('chart', () => CT.chartTexture(chartArt, renderer, Q.chart)),
    card: timed('card', () => CT.compassCardTexture(renderer, 1024)),
    tags: timed('tags', () => VOYAGE_ORDER.map((id, i) => CT.tagTexture(renderer, i + 1, id))),
    plate: timed('plate', () => CT.plateTextures(renderer, COPY['chest.label'].toUpperCase())),
    knurl: timed('knurl', () => CT.knurlTexture(renderer)),
    blob: CT.blobTexture(renderer), rectShadow: CT.rectShadowTexture(renderer), glow: CT.glowTexture(renderer),
    slip: timed('slip', () => CT.slipTexture(renderer)),
    logPage: timed('logPage', () => CT.logPageTexture(renderer)),
    envelope: timed('envelope', () => CT.envelopeTexture(renderer)),
    letterCard: timed('letterCard', () => CT.letterCardTexture(renderer)),
    lid: timed('lid', () => CT.lidTextures(renderer)),
    clock: timed('clock', () => CT.clockFaceTexture(renderer)),
    baro: timed('baro', () => CT.barometerFaceTexture(renderer)),
    stamp: timed('stamp', () => CT.crateStampTexture(renderer)),
    ropeN: CT.ropeNormalTexture(renderer)
  };
  canvasMs = performance.now() - canvasMs;
  await step();
  const oceanT0 = performance.now();
  T.ocean = timed('ocean', () => oceanChartTexture(renderer, Q.chart, route));
  canvasMs += performance.now() - oceanT0;

  /* Adaptive load budget, from measured time only (never from the browser's name).
     - compile work still ahead scales with the first bake's compile time: ~4.6x with parallel shader compile, ~6.6x
       without (measured on cold caches);
     - the rest (page start, environment, warm-up passes, hand-off) is ~2 s on a fast main thread and scales with how
       long the canvas textures just took (200 ms is fast; capped at 3x);
     - every frame the loader repaints costs what a frame costs here (~30 paints).
     If the loader would pass ~9.5 s, drop the two heaviest shader groups: refractive glass (transmission) and the
     swinging lamp's cube shadow. A warm cache, a fast GPU and a fast main thread keep everything. */
  const parallelCompile = renderer.extensions.has('KHR_parallel_shader_compile');
  const cpuFactor = clamp(canvasMs / 200, 1, 3);
  const projectedMs = performance.now() + firstBakeMs * (parallelCompile ? 4.6 : 6.6) + 2000 * cpuFactor + frameCost() * 30;
  Q.budget = { firstBakeMs: Math.round(firstBakeMs), canvasMs: Math.round(canvasMs), frameMs: Math.round(frameCost()), parallelCompile, projectedMs: Math.round(projectedMs), lite: projectedMs > 9500 };
  if (Q.budget.lite) { Q.transmission = false; Q.pointShadow = 0; Q.tier += '-lite'; }
  await step();

  // band on the cup: navy band below the rim, marker hairline, placed along the lathe profile by arc length
  const prof = fillet(CUP_PROFILE, 6);
  const lens = [0]; for (let i = 1; i < prof.length; i++) lens.push(lens[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const total = lens[lens.length - 1];
  const vAt = (y) => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y && prof[i][0] > 0.035) { const k = (y - prof[i - 1][1]) / (prof[i][1] - prof[i - 1][1] || 1); return (lens[i - 1] + (lens[i] - lens[i - 1]) * clamp(k, 0, 1)) / total; } return 0.5; };
  T.band = CT.bandTexture(renderer, [[vAt(0.0475), vAt(0.0515), '#1B2A3A'], [vAt(0.0538), vAt(0.0546), '#A63A24']]);

  const physGlass = (side, thickness) => new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.02, metalness: 0, ior: 1.5, thickness, side,
    transmission: Q.transmission ? 1 : 0, transparent: !Q.transmission, opacity: Q.transmission ? 1 : 0.07,
    specularIntensity: 1, envMapIntensity: 1.3, depthWrite: false
  });
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // 1x1 stand-ins for a missing map, so materials of one family compile to one shader program
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.colorSpace = THREE.SRGBColorSpace; white.needsUpdate = true;
  const flat = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); flat.needsUpdate = true;
  // Paper albedo is kept a little under the printed colour so a patch of sun on a chart stays readable.
  const paperTint = new THREE.Color(0.86, 0.85, 0.83);
  const M = {
    tableTop: new THREE.MeshPhysicalMaterial({ map: tableTex.map, roughnessMap: tableTex.rough, normalMap: tableTex.normal, roughness: 1, metalness: 0, clearcoat: 0.32, clearcoatRoughness: 0.3 }),
    wall: std({ map: wallTex.map, roughnessMap: wallTex.rough, normalMap: wallTex.normal, roughness: 1 }),
    teak: std({ map: teakTex.map, roughnessMap: teakTex.rough, normalMap: teakTex.normal, roughness: 1 }),
    oak: std({ map: oakTex.map, roughnessMap: oakTex.rough, normalMap: oakTex.normal, roughness: 0.9 }),
    brass: std({ map: brassTex.map, roughnessMap: brassTex.rough, normalMap: brassTex.normal, metalness: 1, roughness: 1 }),
    brassPolished: std({ map: brassTex.map, roughnessMap: brassTex.rough, normalMap: brassTex.normal, metalness: 1, roughness: 0.55 }),
    brassDark: std({ map: brassTex.map, color: 0x8a7458, roughnessMap: brassTex.rough, normalMap: brassTex.normal, metalness: 1, roughness: 1 }),
    brassKnurl: std({ map: brassTex.map, roughnessMap: white, normalMap: T.knurl, normalScale: new THREE.Vector2(1, 1), metalness: 1, roughness: 0.4 }),
    rubber: std({ color: 0x0b0a09, roughness: 0.75 }),
    lampGlass: physGlass(THREE.DoubleSide, 0.003),
    domeGlass: physGlass(THREE.DoubleSide, 0.004),
    wick: std({ color: 0x16110d, roughness: 0.95 }),
    paper: std({ map: T.chart, color: paperTint, roughness: 0.88 }),
    oceanPaper: std({ map: T.ocean, color: paperTint, roughness: 0.88 }),
    paperBack: std({ color: 0xc9bb9e, roughness: 0.92, side: THREE.BackSide }),
    card: std({ map: T.card, roughness: 0.62 }),
    marker: std({ color: 0xa63a24, roughness: 0.5 }),
    porcelain: new THREE.MeshPhysicalMaterial({ color: 0xf1ece2, map: white, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.035 }),
    cupPorcelain: new THREE.MeshPhysicalMaterial({ color: 0xf1ece2, map: T.band, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.035 }),
    pencilLacquer: new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.36, 0.05, 0.025), map: white, roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    pencilWood: std({ color: 0xc4956a, roughness: 0.85 }),
    graphite: std({ color: 0x252528, metalness: 0.4, roughness: 0.35 }),
    eraser: std({ color: 0xb06453, roughness: 0.9 }),
    bean: new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.075, 0.034, 0.016), roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    burlap: std({ map: burlapTex.map, roughnessMap: burlapTex.rough, normalMap: burlapTex.normal, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 1, side: THREE.DoubleSide, emissive: 0xff9a50, emissiveIntensity: 0 }),
    twine: std({ color: 0x86663e, roughness: 0.95 }),
    tags: T.tags.map((map) => std({ map, alphaTest: 0.5, roughness: 0.86, side: THREE.DoubleSide, emissive: 0xffb070, emissiveIntensity: 0 })),
    plate: std({ map: T.plate.map, roughnessMap: white, normalMap: T.plate.normal, metalness: 0.9, roughness: 0.36, emissive: 0xffa050, emissiveIntensity: 0 }),
    leather: new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.028, 0.045, 0.062), map: white, roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    pages: std({ color: 0xe6dcc3, roughness: 0.92 }),
    elastic: std({ color: 0x14100d, roughness: 0.8 }),
    ribbon: std({ color: 0xa63a24, roughness: 0.6 }),
    steel: std({ color: 0xc4c8cc, metalness: 1, roughness: 0.28 }),
    logLabel: std({ map: CT.labelTexture(renderer, COPY['voyage.logLabel'].toUpperCase(), COPY['port.name']), roughness: 0.85 }),
    slip: std({ map: T.slip, color: paperTint, roughness: 0.9 }),
    logPage: std({ map: T.logPage, color: paperTint, roughness: 0.9 }),
    envelope: std({ map: T.envelope, color: paperTint, roughness: 0.9 }),
    letterCard: std({ map: T.letterCard, color: paperTint, roughness: 0.88 }),
    // wax: a soft sheen only (a sharp clearcoat caught the lamp and bloomed into a white spot at the desk)
    wax: new THREE.MeshPhysicalMaterial({ color: 0x8e2418, map: white, roughness: 0.52, clearcoat: 0.22, clearcoatRoughness: 0.55 }),
    enamelNavy: new THREE.MeshPhysicalMaterial({ color: 0x1b2a3a, map: white, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    enamelRed: new THREE.MeshPhysicalMaterial({ color: 0xa63a24, map: white, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
    enamelCream: new THREE.MeshPhysicalMaterial({ color: 0xefe3c8, map: white, roughness: 0.38, clearcoat: 0.9, clearcoatRoughness: 0.1 })
  };
  M.lampGlass.roughness = 0.04; M.lampGlass.specularIntensity = 0.5;
  M.brassLamp = std({ map: brassTex.map, roughnessMap: white, normalMap: flat, color: 0xd8b98c, metalness: 1, roughness: 0.66, envMapIntensity: 1.3 });
  M.cupPorcelain.envMapIntensity = 1.6; M.porcelain.envMapIntensity = 1.4;
  // compass lid, engraved spun brass (same shader program as the other brass): the outside polished, reflecting the
  // portholes and the lamp; the inside a softer, partly lacquered plate so its engraving reads away from the lights
  M.lidOuter = std({ map: T.lid.map, normalMap: T.lid.normal, roughnessMap: white, metalness: 1, roughness: 0.3, envMapIntensity: 2.2 });
  M.lidInner = std({ map: T.lid.map, normalMap: T.lid.normal, roughnessMap: white, metalness: 0.55, roughness: 0.42, envMapIntensity: 2 });
  // dressing (lib/decor.js): same families as the materials above, so they share shader programs
  M.sand = std({ color: 0xcdb48a, roughness: 0.95 });
  M.clockFace = std({ map: T.clock, roughness: 0.6 });
  M.baroFace = std({ map: T.baro, roughness: 0.6 });
  M.stamp = std({ map: T.stamp, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide });
  M.rope = std({ map: white, roughnessMap: white, normalMap: T.ropeN, normalScale: new THREE.Vector2(1.2, 1.2), color: 0x8a6a42, roughness: 0.95 });
  const glassMat = makePortholeGlass(Q.transmission);
  // material names show up in the compile and warm-up logs (which draw uploads which texture)
  for (const k in M) { if (M[k] && M[k].isMaterial && !M[k].name) M[k].name = k; }
  M.tags.forEach((m, i) => { m.name = 'tag' + i; });
  await step();

  /* ---------- Scene ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, view()[0] / view()[1], 0.02, 12000);
  const out = createOutdoors();
  scene.add(out.sky, out.sea, out.rain);
  const ship = new THREE.Group(); ship.name = 'ship'; ship.matrixAutoUpdate = false;
  scene.add(ship);
  const table = buildTable(M); ship.add(table);
  const wall = buildWall(M); ship.add(wall);
  await step();
  const portholes = [0, 1].map((i) => buildPorthole(M, glassMat, i));
  portholes.forEach((p) => ship.add(p.group));
  await step();
  const lamp = buildLamp(M, Q, T.glow); scene.add(lamp.group);
  if (!Q.pointShadow) lamp.light.castShadow = false;
  await step();
  const oceanSheet = buildSheet(LAYOUT.ocean, oceanHeight, null, M.oceanPaper, M.paperBack, 'oceanChart');
  const harbourSheet = buildSheet(LAYOUT.chart, harbourHeight, (u, v) => Math.max(0, harbourHeight(u, v) - HARBOUR_BASE - 0.0031), M.paper, M.paperBack, 'harbourChart');
  ship.add(oceanSheet.group, harbourSheet.group);
  const routeMat = inkMaterial();
  const routeInk = createRibbon(2400, routeMat, 'routeInk');
  // full width on the leg being shown; earlier legs are drawn narrower and lighter by the ink shader (uLegStart)
  routeInk.update(oceanSheet, route.pts.map((p) => [p.x, p.y]), 0.0028, 0.00045, 4);
  routeMat.polygonOffsetFactor = -1; routeMat.polygonOffsetUnits = -2;
  routeMat.userData.uniforms.uHomeStart.value = route.homeStart;
  routeMat.userData.uniforms.uDash.value = 15;
  routeMat.userData.uniforms.uHead.value = 0;
  oceanSheet.group.add(routeInk.mesh);
  const bearingMat = inkMaterial();
  const bearingInk = createRibbon(320, bearingMat, 'bearingInk');
  oceanSheet.group.add(bearingInk.mesh);
  const pin = buildShipPin(M, T.blob);
  oceanSheet.group.add(pin.group);
  await step();
  const compass = buildCompass(M); ship.add(compass.group);
  const cup = buildCup(M); ship.add(cup.group);
  await step();
  const pencil = buildPencil(M); ship.add(pencil);
  const beans = buildBeans(M); ship.add(beans);
  const box = buildBox(M, T); ship.add(box.group);
  const decals = buildShadows(T); ship.add(decals);
  const logbook = buildLogbook(M); ship.add(logbook.group);
  const dividers = buildDividers(M); ship.add(dividers);
  const slip = buildSlip(M, T); ship.add(slip.group);
  const letter = buildLetter(M, T); ship.add(letter.group);
  const decor = buildDecor(M); ship.add(decor.group);
  // QA: ?nocabinets leaves the sample cabinets out (load-time comparisons)
  const cabinets = /[?&]nocabinets\b/.test(location.search)
    ? { group: new THREE.Group(), glass: [], lights: [], update() {} }
    // (no lights of their own by default: two more point lights cost every lit shader ~1 s of compile on Firefox and
    // WebKit, and the lamp and the fills keep the cabinets readable; ?cablights adds them back for comparison)
    : timed('cabinets', () => buildCabinets(M, renderer, { lights: /[?&]cablights\b/.test(location.search) }));
  ship.add(cabinets.group);
  const beams = createBeams(renderer.getPixelRatio()); ship.add(beams.group);
  await step();

  /* ---------- Pickable objects: proxies for ray casts, shells for the highlight ---------- */
  const proxies = [], proxyOf = {};
  const px = (id, parent, shape, size, offset, rot) => { const m = addProxy(parent, id, shape, size, offset, rot); proxies.push(m); if (!proxyOf[id]) proxyOf[id] = m; return m; };
  px('log', logbook.group, 'box', [0.162, 0.03, 0.217], [0, 0.013, 0]);
  px('chart', harbourSheet.group, 'box', [LAYOUT.chart.w, 0.014, LAYOUT.chart.h], [0, 0.004, 0]);
  px('chest', box.group, 'box', [0.31, 0.1, 0.21], [0, 0.048, 0]);
  px('compass', compass.group, 'cylinder', [0.066, 0.052], [0, 0.025, 0]);
  px('crew', slip.paper, 'box', [0.112, 0.012, 0.155], [0, 0.002, 0]);
  px('letter', letter.group, 'box', [0.178, 0.014, 0.118], [0, 0.004, 0]);
  // the porthole's anchor and pick box: the rim's outer radius (0.19), the same ring the camera views are fitted to
  proxyOf.porthole = addProxy(portholes[1].group, 'porthole', 'cylinder', [0.19, 0.06], [0, 0, 0.02], [Math.PI / 2, 0, 0]);
  proxies.push(proxyOf.porthole, addProxy(portholes[0].group, 'porthole', 'cylinder', [0.19, 0.06], [0, 0, 0.02], [Math.PI / 2, 0, 0]));
  px('lamp', lamp.group, 'box', [0.16, 0.33, 0.16], [0, -0.52, 0]);
  px('cup', cup.group, 'cylinder', [0.078, 0.1], [0, 0.048, 0]);
  const highlights = createHighlights({
    // the log's rounded cover has UVs whose border band covers nearly the whole face: rim light only
    log: { roots: [logbook.group], edge: 0 },
    // the chart lies far back and pale under the lamp: a wider paper line
    chart: { roots: [harbourSheet.front], edge: 1, linePx: 8 },
    // the chest lifts its own colours warmer: every slat has its own 0..1 UVs (a border band covered the box) and its
    // upward faces catch strong fresnel from the desk seat (an added rim washed it into flat cream)
    chest: { roots: [box.group] },
    compass: { roots: [compass.group] },
    crew: { roots: [slip.paper], edge: 1 },
    letter: { roots: [letter.group], edge: 1 },
    porthole: { roots: [portholes[0].group, portholes[1].group] },
    // the lamp is all thin brass parts (hoop, rods, cap): a thinner outline keeps it from looking heavy
    lamp: { roots: [lamp.group], px: 1.6 },
    cup: { roots: [cup.group] }
  });

  const sun = new THREE.DirectionalLight(0xffffff, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  Object.assign(sun.shadow.camera, { left: -1.25, right: 1.25, top: 1.25, bottom: -1.25, near: 0.5, far: 9 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.0025; sun.shadow.radius = 1.5;
  sun.target.position.set(0.05, 0, -0.25);
  scene.add(sun, sun.target);
  makeShadowMap(sun);
  if (lamp.light.castShadow) makeShadowMap(lamp.light);
  const amb = new THREE.HemisphereLight(0xffffff, 0x000000, 0.5);
  scene.add(amb);
  const fills = LAYOUT.portholes.map((p) => {
    const s = new THREE.SpotLight(0xffffff, 1, 0, 1.05, 1, 2);
    s.position.set(p.x, p.y, LAYOUT.wallZ + 0.04);
    s.target.position.set(p.x * 0.6, -0.1, 0.25);
    ship.add(s, s.target);
    return s;
  });

  /* ---------- Environment for reflections, built from a tiny proxy of the cabin ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  const envRoom = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 3.2), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
  envRoom.position.set(0, 0.6, 0.6);
  const envTable = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), basic(0x000000)); envTable.rotation.x = -Math.PI / 2; envTable.position.y = -0.03;
  const envWins = LAYOUT.portholes.map((p) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), basic(0xffffff)); m.position.set(p.x, p.y, LAYOUT.wallZ + 0.01); return m; });
  const envLamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), basic(0xffffff)); envLamp.position.set(LAYOUT.lampPivot[0], LAYOUT.lampPivot[1] - 0.55, LAYOUT.lampPivot[2]);
  envScene.add(envRoom, envTable, envLamp, ...envWins);
  let envRT = null;
  const envSeen = { at: -1e9, skyGain: -1, envI: -1, lampI: -1, envWarm: -1, sky0: -1, sky1: -1, lamp: -1 };
  function updateEnv(W, lampK, now) {
    envRoom.material.color.setRGB(0.05 * W.envWarm + 0.012, 0.028 * W.envWarm + 0.008, 0.014 * W.envWarm + 0.006).multiplyScalar(2.2);
    envTable.material.color.setRGB(0.06, 0.03, 0.014).multiplyScalar(0.6 + W.lampI * lampK * 1.6);
    envWins.forEach((m) => m.material.color.setRGB(W.envSky[0], W.envSky[1], W.envSky[2]).multiplyScalar(W.skyGain * 5));
    envLamp.material.color.setRGB(1.0, 0.62, 0.3).multiplyScalar(W.lampI * lampK * 60);
    const next = pmrem.fromScene(envScene, 0.035, 0.05, 20);
    if (envRT) envRT.dispose();
    envRT = next;
    scene.environment = envRT.texture;
    Object.assign(envSeen, { at: now, skyGain: W.skyGain, envI: W.envI, lampI: W.lampI, envWarm: W.envWarm, sky0: W.envSky[0], sky1: W.envSky[1], lamp: lampK });
  }
  function maybeEnv(W, lampK, now, force) {
    const d = Math.max(Math.abs(W.skyGain - envSeen.skyGain), Math.abs(W.envI - envSeen.envI) * 2, Math.abs(W.lampI * lampK - envSeen.lampI * envSeen.lamp) * 2, Math.abs(W.envWarm - envSeen.envWarm), Math.abs(W.envSky[0] - envSeen.sky0), Math.abs(W.envSky[1] - envSeen.sky1));
    if (force ? d > 1e-4 : d > 0.035 && now - envSeen.at > 300) updateEnv(W, lampK, now);
  }

  /* ---------- Desk state ---------- */
  // glancing: a sea moment turned the camera to the porthole and it has not come back to the seat yet
  const desk = { mode: 'desk', focus: null, pickable: true, kbd: null, hover: null, deskWeather: 'dawn', seaKey: null, found: new Set(), glowTarget: 0, glow: 0, glancing: false, glanceToken: 0, landed: false, glowAt: null, lastLeg: null, hint: null };

  // weather: the mixed values in `cur`, blending from a snapshot towards a preset
  const cur = cloneWeather(WEATHER.dawn);
  const wx = { from: cloneWeather(WEATHER.dawn), key: 'dawn', t0: 0, dur: 1 };
  function setWeather(key, duration) {
    if (!WEATHER[key]) return;
    if (key === wx.key && (performance.now() - wx.t0 >= wx.dur)) return;
    wx.from = cloneWeather(cur);
    wx.key = key;
    wx.t0 = performance.now();
    wx.dur = !(duration > 0) ? 1 : duration;
    if (key === 'storm') fl.next = mo.time + 1.4;
  }
  const deskWeatherKey = () => (desk.seaKey ? SEA_WEATHER[desk.seaKey] : desk.deskWeather);

  // opening movements, each eased between two values over a time span
  const tw = () => ({ v: 0, from: 0, to: 0, t0: 0, dur: 1 });
  const opens = { log: tw(), chart: tw(), compass: tw(), crew: tw(), letter: tw(), cup: tw() };
  const route01 = { v: 0, from: 0, to: 0, t0: 0, dur: 1 };
  // a leg's timelapse: { t0, dur, fromP, toP, target, seq (weathers passed through), resolve, hold (QA: fixed progress) }
  let travel = null;
  function animate(o, to, t0, dur) { o.from = o.v; o.to = to; o.t0 = t0; o.dur = Math.max(1, dur); }
  function setNow(o, to) { o.v = o.from = o.to = to; o.t0 = 0; o.dur = 1; }
  function stepTween(o, now) { const k = clamp((now - o.t0) / o.dur, 0, 1); o.v = o.from + (o.to - o.from) * easeInOut(k); return o.v; }

  /* ---------- Camera ---------- */
  const fitCache = new Map();
  function targetPose(target, w, h) {
    const portrait = w / h < 1;
    const key = target + ':' + w + 'x' + h;
    let p = fitCache.get(key);
    if (!p) {
      const ff = portrait ? 'phone' : 'desk';
      let rect = target === 'desk' ? RECTS.desk[ff] : RECTS.focus[ff];
      // 16:10 and squarer landscape windows: pull the desk view back about 5 % so the sample cabinets show at the sides
      if (target === 'desk' && !portrait && w / h < 1.7) {
        const cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2, k = 0.95;
        rect = [cx + (rect[0] - cx) * k, cy + (rect[1] - cy) * k, cx + (rect[2] - cx) * k, cy + (rect[3] - cy) * k];
      }
      p = fitPose(viewPoints(target, portrait), VIEWS[target][ff], rect, w, h, newPose());
      if (fitCache.size > 40) fitCache.clear();
      fitCache.set(key, p);
    }
    return p;
  }
  let camTarget = 'desk';
  let camTween = null;            // { from, t0, dur, resolve }
  const poseCur = newPose(), poseTmp = newPose();
  const b1 = new THREE.Vector3(), b2 = new THREE.Vector3();
  function bezierPose(A, B, t, out, liftA, liftB) {
    const e = easeInOut(t), u = 1 - e;
    b1.copy(A.pos).add(liftA); b2.copy(B.pos).add(liftB);
    out.pos.copy(A.pos).multiplyScalar(u * u * u).addScaledVector(b1, 3 * u * u * e).addScaledVector(b2, 3 * u * e * e).addScaledVector(B.pos, e * e * e);
    out.quat.slerpQuaternions(A.quat, B.quat, easeInOut(clamp((t - 0.08) / 0.92, 0, 1)));
    out.fov = lerp(A.fov, B.fov, e);
    out.focus.copy(A.focus).lerp(B.focus, e);
    return out;
  }
  const liftUp = new THREE.Vector3(), liftDn = new THREE.Vector3();

  /* ---------- Post ---------- */
  const post = (() => { try { return createPost(renderer, scene, camera, Q); } catch (e) { return null; } })();
  if (post) {
    post.hideForAO.push(out.sky, out.sea, lamp.globe, lamp.glow, lamp.flame, cup.steam.mesh, ...beams.meshes, ...portholes.map((p) => p.glass), out.rain, routeInk.mesh, bearingInk.mesh, ...highlights.shells, ...cabinets.glass);
    ship.traverse((o) => { if (o.name === 'domeGlass' || o.name === 'contactShadow' || o.name === 'glow') post.hideForAO.push(o); });
  }
  const size = new THREE.Vector2();
  function resize() {
    const [w, h] = view();
    renderer.setSize(w, h, false);
    renderer.getDrawingBufferSize(size);
    if (post) post.setSize(size.x, size.y);
    highlights.setViewport(size.x, size.y, renderer.getPixelRatio());
    camera.aspect = w / h;
    if (phase === 'loading') topDown = topDownPose(boot.chartRect && boot.chartRect());
  }

  /* ---------- The loader's chart, seen straight down, where the loader drew it ---------- */
  function topDownPose(rect) {
    const [w, h] = view();
    if (!rect || !(rect.width > 10)) { const cw = Math.min(w * 0.88, h * 1.09 * 1.4, 1040); rect = { left: (w - cw) / 2, top: (h - cw / 1.4) / 2, width: cw, height: cw / 1.4 }; }
    const C = LAYOUT.chart, aspect = w / h;
    const fov = aspect < 1 ? 56 : 40;
    const frac = clamp(rect.height / h, 0.1, 1);
    const d = C.h / frac / (2 * Math.tan((fov * DEG) / 2));
    const center = new THREE.Vector3(C.x, HARBOUR_BASE, C.z);
    const visH = 2 * d * Math.tan((fov * DEG) / 2), visW = visH * aspect;
    const offX = ((rect.left + rect.width / 2) / w - 0.5) * visW;
    const offY = ((rect.top + rect.height / 2) / h - 0.5) * visH;
    const up = new THREE.Vector3(-Math.sin(C.yaw), 0, -Math.cos(C.yaw));
    const right = new THREE.Vector3(Math.cos(C.yaw), 0, -Math.sin(C.yaw));
    const target = center.clone().addScaledVector(right, -offX).addScaledVector(up, offY);
    const pos = target.clone().add(new THREE.Vector3(0, d, 0));
    const m = new THREE.Matrix4().lookAt(pos, target, up);
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m), fov, focus: center };
  }
  let phase = 'loading';
  let topDown = topDownPose(boot.chartRect && boot.chartRect());
  let intro = null;
  const introWaiters = [];

  /* ---------- Motion: hull, lamp pendulum, coffee spring, compass card ---------- */
  const mo = { phase: 0.6, time: 0, roll: 0, pitch: 0, heave: 0, gain: 0, lastRollVel: 0 };
  const pend = { ux: 0, uz: 0, vx: 0, vz: 0 };
  const co = { sx: 0, sz: 0, vx: 0, vz: 0, rip: 0, nextChop: 3, nextHeave: 0 };
  const card = { x: 0, z: 0, yaw: 0 };
  const PIV = new THREE.Vector3(...LAYOUT.pivot);
  const lampPivotLocal = new THREE.Vector3(...LAYOUT.lampPivot);
  const cupLocal = new THREE.Vector3(LAYOUT.cup.x, cup.level, LAYOUT.cup.z);
  const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion();
  const mA = new THREE.Matrix4(), mB = new THREE.Matrix4();
  function shipMatrix(o, roll, pitch, heave) {
    _q.setFromEuler(_e.set(roll, 0, pitch, 'XYZ'));
    _m1.makeTranslation(-PIV.x, -PIV.y, -PIV.z);
    _m2.makeRotationFromQuaternion(_q);
    _m3.makeTranslation(PIV.x, PIV.y + heave, PIV.z);
    return o.multiplyMatrices(_m3, _m2).multiply(_m1);
  }
  // A ship at sea is never still: calm weathers get a visible swell on top of their own numbers (about 1.2 deg of roll,
  // 0.6 deg of pitch, 3 cm of heave at dawn); from about 1 deg of roll upwards a weather keeps its own motion.
  const calmOf = (W) => 1 - smooth(1.0, 3.0, W.roll);
  const seaRoll = (W) => W.roll + 0.85 * calmOf(W);
  function poseAt(ph, t, W, g) {
    const c = calmOf(W), R = W.roll + 0.85 * c, Pt = W.pitch + 0.5 * c, Hv = W.heave + 0.02 * c;
    const gust = (vnoise(t * 0.45, 7.3) - 0.5) * 2 * W.gust;
    return {
      roll: g * DEG * R * (Math.sin(ph) * 0.82 + Math.sin(ph * 2.13 + 1.1) * 0.18 + gust * 0.35),
      pitch: g * DEG * Pt * (Math.sin(ph * 0.77 + 0.5) * 0.85 + Math.sin(ph * 1.9 + 2.0) * 0.15),
      heave: g * Hv * (Math.sin(ph * 1.37 + 0.6) * 0.75 + Math.sin(ph * 3.1 + 2) * 0.25)
    };
  }
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), p0 = new THREE.Vector3(), acc = new THREE.Vector3(), cA = new THREE.Vector3(), cB = new THREE.Vector3(), c0 = new THREE.Vector3(), cacc = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0), dir = new THREE.Vector3(), shipQ = new THREE.Quaternion(), shipQi = new THREE.Quaternion();
  const geff = new THREE.Vector3(), nl = new THREE.Vector3();
  const ripples = cup.coffee.uniforms.uRip.value;

  function stepMotion(dt, still) {
    const W = cur;
    if (!still) { mo.time += dt; mo.phase += (dt * TAU) / W.period; }
    const g = still ? 0 : mo.gain;
    const P = poseAt(mo.phase, mo.time, W, g);
    const rollVel = dt > 0 ? (P.roll - mo.roll) / dt : 0;
    const pitchVel = dt > 0 ? (P.pitch - mo.pitch) / dt : 0;
    if (!still && Math.sign(rollVel) !== Math.sign(mo.lastRollVel) && Math.abs(P.roll) > 0.3 * DEG) sound.creak(Math.abs(P.roll) / (2.8 * DEG));
    mo.lastRollVel = rollVel;
    mo.roll = P.roll; mo.pitch = P.pitch; mo.heave = P.heave;
    shipMatrix(ship.matrix, P.roll, P.pitch, P.heave);
    ship.matrixWorldNeedsUpdate = true;
    shipQ.setFromEuler(_e.set(P.roll, 0, P.pitch, 'XYZ'));
    shipQi.copy(shipQ).invert();

    const h = 1 / 30, w = TAU / W.period;
    const a = poseAt(mo.phase - w * h, mo.time - h, W, g), b = poseAt(mo.phase + w * h, mo.time + h, W, g);
    shipMatrix(mA, a.roll, a.pitch, a.heave); shipMatrix(mB, b.roll, b.pitch, b.heave);
    p0.copy(lampPivotLocal).applyMatrix4(ship.matrix); pA.copy(lampPivotLocal).applyMatrix4(mA); pB.copy(lampPivotLocal).applyMatrix4(mB);
    acc.copy(pB).addScaledVector(p0, -2).add(pA).divideScalar(h * h);
    c0.copy(cupLocal).applyMatrix4(ship.matrix); cA.copy(cupLocal).applyMatrix4(mA); cB.copy(cupLocal).applyMatrix4(mB);
    cacc.copy(cB).addScaledVector(c0, -2).add(cA).divideScalar(h * h);

    // lamp: a pendulum hanging true in the world, pushed by the hook's acceleration, lightly damped
    const L = lamp.length, wn = Math.sqrt(9.81 / L), zeta = 0.045;
    if (!still) {
      const gx = (vnoise(mo.time * 1.1, 3) - 0.5) * W.gust * 0.5, gz = (vnoise(mo.time * 0.9, 8) - 0.5) * W.gust * 0.5;
      // and a gentle swing of its own at its natural rate, mostly across the view (about 2 deg at dawn, more in a blow):
      // a force at resonance settles at amplitude F / (2 zeta wn^2)
      const swingA = (0.011 + 0.007 * seaRoll(W)) * mo.gain, sw = 2 * zeta * wn * wn * swingA * Math.sin(wn * mo.time);
      const swDir = Math.sin(mo.time * 0.05) * 0.5, swx = sw * Math.cos(swDir), swz = sw * Math.sin(swDir);
      const n = 4, hs = dt / n;
      for (let i = 0; i < n; i++) {
        const ax = -wn * wn * pend.ux - acc.x - 2 * zeta * wn * pend.vx + gx + swx;
        const az = -wn * wn * pend.uz - acc.z - 2 * zeta * wn * pend.vz + gz + swz;
        pend.vx += ax * hs; pend.vz += az * hs; pend.ux += pend.vx * hs; pend.uz += pend.vz * hs;
      }
      const lim = 0.16;
      const m = Math.hypot(pend.ux, pend.uz);
      if (m > lim) { pend.ux *= lim / m; pend.uz *= lim / m; }
    } else { pend.ux = pend.uz = pend.vx = pend.vz = 0; }
    lamp.group.position.copy(p0);
    dir.set(pend.ux, -Math.sqrt(Math.max(1e-6, L * L - pend.ux * pend.ux - pend.uz * pend.uz)), pend.uz).normalize();
    lamp.group.quaternion.setFromUnitVectors(down, dir);

    // coffee: the surface chases the level set by effective gravity, as a damped spring (lags ~0.4 s, overshoots)
    geff.set(-cacc.x, -9.81 - cacc.y, -cacc.z).applyQuaternion(shipQi);
    nl.copy(geff).multiplyScalar(-1).normalize();
    const cr = cup.cupGroup.rotation.y, cc = Math.cos(-cr), cs = Math.sin(-cr);
    const gain = 2.4;
    const tx = (-nl.x / nl.y) * gain, tz = (-nl.z / nl.y) * gain;
    const lx = tx * cc + tz * cs, lz = -tx * cs + tz * cc;
    if (!still) {
      const wc = 2.6, zc = 0.28, n = 3, hs = dt / n;
      for (let i = 0; i < n; i++) {
        co.vx += (-wc * wc * (co.sx - lx) - 2 * zc * wc * co.vx) * hs;
        co.vz += (-wc * wc * (co.sz - lz) - 2 * zc * wc * co.vz) * hs;
        co.sx += co.vx * hs; co.sz += co.vz * hs;
      }
      const t = mo.time;
      const chopEvery = W.rain > 0.5 ? 2.6 : W.waveAmp > 0.3 ? 8 : 14;
      if (t > co.nextChop) { ripple(W.rain > 0.5 ? 0.0004 : 0.00024); co.nextChop = t + chopEvery * (0.6 + Math.random() * 0.8); }
      if (Math.abs(cacc.y) > 0.16 && t > co.nextHeave) { ripple(0.0005); co.nextHeave = t + 1.3; }
    } else { co.sx = co.sz = co.vx = co.vz = 0; }
    const m = Math.hypot(co.sx, co.sz), cap = 0.13;
    const k = m > cap ? cap / m : 1;
    cup.coffee.uniforms.uSlope.value.set(co.sx * k, co.sz * k);
    cup.coffee.uniforms.uTime.value = mo.time;

    // compass card floats a beat behind the hull
    const kc = 1 - Math.exp(-dt * 1.8);
    card.x += (clamp(-P.roll, -0.05, 0.05) - card.x) * kc;
    card.z += (clamp(-P.pitch, -0.05, 0.05) - card.z) * kc;
    card.yaw += ((still ? 0 : Math.sin(mo.time * 0.37) * 0.04 + P.roll * 0.8) - card.yaw) * (1 - Math.exp(-dt * 0.9));
    compass.cardPivot.rotation.set(card.x, card.yaw, card.z);

    cup.steam.uniforms.uTime.value = mo.time;
    // steam leans with the coffee's slosh (effective gravity in the cup) and trails the hull's swing
    cup.steam.uniforms.uLean.value.set(clamp(co.sx * 3.0 - pitchVel * 1.2, -0.25, 0.25), clamp(co.sz * 3.0 + rollVel * 1.2, -0.25, 0.25));
  }
  function ripple(amp) {
    const r = ripples[co.rip % 3]; co.rip++;
    const a = Math.random() * TAU, d = Math.random() * 0.012;
    r.set(amp, mo.time, Math.cos(a) * d, Math.sin(a) * d);
    co.vx += (Math.random() - 0.5) * 0.08; co.vz += (Math.random() - 0.5) * 0.08;
  }

  /* ---------- Lightning, green water, the lamp's flare ---------- */
  const fl = { at: -99, next: 2, dir: new THREE.Vector3(0, 0.3, -1).normalize() };
  function flashLevel(t) {
    const d = t - fl.at;
    if (d < 0 || d > 1.0) return 0;
    return d < 0.05 ? d / 0.05 : d < 0.18 ? lerp(1, 0.12, (d - 0.05) / 0.13) : d < 0.27 ? lerp(0.12, 0.75, (d - 0.18) / 0.09) : lerp(0.75, 0, (d - 0.27) / 0.73);
  }
  const wash = { at: -99, next: 3 };
  function washLevel(t) {
    const d = t - wash.at;
    return d < 0 ? 0 : d < 0.35 ? d / 0.35 : d < 0.6 ? 1 : d < 2.6 ? 1 - (d - 0.6) / 2.0 : 0;
  }
  const flare = { at: -99 };
  // flickerLamp(): the flame and its light rise about 18 % and settle over 0.7 s (a soft bump, no flash)
  const FLARE = { dur: 700, peak: 0.18 };
  function flareLevel(now) {
    const d = (now - flare.at) / FLARE.dur;
    if (d < 0 || d > 1) return 0;
    return FLARE.peak * Math.pow(Math.sin(Math.PI * d), 2);
  }

  /* ---------- Bearing on the ocean chart: pointer (desktop) or dragged finger (phone), drawn from Merrowick ---------- */
  const [homeX, homeY] = oceanXY(HOME.lat, HOME.lon);
  const IN = { x0: OCEAN.M2 + 4, y0: OCEAN.M2 + 4, x1: OCEAN.W - OCEAN.M2 - 4, y1: OCEAN.H - OCEAN.M2 - 4 };
  const bearing = { deg: 0, end: [homeX, homeY], vis: 0, target: 0, lastKey: '', drawn: '', hasLine: false };
  function drawBearing() {
    const key = bearing.end[0].toFixed(1) + ',' + bearing.end[1].toFixed(1);
    if (key === bearing.drawn) return;
    bearing.drawn = key;
    const len = Math.hypot(bearing.end[0] - homeX, bearing.end[1] - homeY);
    bearing.hasLine = len >= 14;
    if (!bearing.hasLine) return;
    const ux = (bearing.end[0] - homeX) / len, uy = (bearing.end[1] - homeY) / len;
    bearingInk.update(oceanSheet, [[homeX + ux * 11, homeY + uy * 11], bearing.end], 0.0011, 0.00055, 5);
  }
  function emitBearing(force) {
    const r = bearingReading(bearing.deg);
    const key = r.deg + ':' + r.originId;
    if (!force && key === bearing.lastKey) return;
    bearing.lastKey = key;
    window.dispatchEvent(new CustomEvent('rhumbcabin:bearing', { detail: r }));
  }
  let bearingOn = false;
  const bearingActive = () => bearingOn && desk.focus === 'chart' && opens.chart.v > 0.95 && phase === 'entered';

  /* ---------- Pointer: hover, taps, drags ---------- */
  const ptr = { x: -1, y: -1, type: 'mouse', over: false, hoverFresh: false, bearingFresh: false, dragging: false };
  let press = null;
  const onScene = (e) => e.target === canvas || (!!host && host !== document.body && host.contains(e.target));
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), invM = new THREE.Matrix4(), hitP = new THREE.Vector3();
  const oceanPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.0008);
  function setRay(x, y) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -(((y - rect.top) / rect.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
  }
  function pickAt(x, y) {
    setRay(x, y);
    const hits = ray.intersectObjects(proxies, false);
    return hits.length ? hits[0].object.userData.pickId : null;
  }
  // where a screen point falls on the ocean chart (sheet units), and whether it is inside the map's neat line
  function oceanAt(x, y) {
    setRay(x, y);
    oceanSheet.group.updateWorldMatrix(true, false);
    invM.copy(oceanSheet.group.matrixWorld).invert();
    ray.ray.applyMatrix4(invM);
    if (!ray.ray.intersectPlane(oceanPlane, hitP)) return null;
    const S = LAYOUT.ocean, bx = (hitP.x / S.w + 0.5) * 1400, by = (hitP.z / S.h + 0.5) * 1000;
    return { bx, by, inside: bx > IN.x0 && bx < IN.x1 && by > IN.y0 && by < IN.y1 };
  }
  // the object already open is not picked or hovered again
  const isOpen = (id) => desk.mode === 'focus' && desk.focus === id;
  const par = { x: 0, y: 0, tx: 0, ty: 0, k: 0 };
  const PAR_YAW = 2.6 * DEG, PAR_PITCH = 1.4 * DEG;
  window.addEventListener('pointermove', (e) => {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.type = e.pointerType;
    ptr.over = onScene(e) || !!(press && press.bearing);
    ptr.hoverFresh = true;
    if (e.pointerType !== 'touch' || ptr.dragging) ptr.bearingFresh = true;
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > (e.pointerType === 'touch' ? 12 : 6)) press.moved = true;
    if (e.pointerType === 'mouse' && phase === 'entered') { const [w, h] = view(); par.tx = (e.clientX / w - 0.5) * 2; par.ty = (e.clientY / h - 0.5) * 2; }
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (!onScene(e)) return;
    // a press draws a bearing only on the ocean chart itself; elsewhere it can pick another object
    const o = bearingActive() ? oceanAt(e.clientX, e.clientY) : null;
    press = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, bearing: !!(o && o.inside) };
    if (press.bearing) { ptr.dragging = true; ptr.x = e.clientX; ptr.y = e.clientY; ptr.bearingFresh = true; }
  }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    const p = press;
    press = null; ptr.dragging = false;
    if (!p || p.moved || p.bearing || performance.now() - p.t > 800) return;
    if (!onScene(e) || !desk.pickable || phase !== 'entered' || desk.glancing) return;
    const id = pickAt(e.clientX, e.clientY);
    if (id && !isOpen(id)) window.dispatchEvent(new CustomEvent('rhumbcabin:select', { detail: { id } }));
  });
  window.addEventListener('pointercancel', () => { press = null; ptr.dragging = false; });
  function setHover(id) {
    if (id === desk.hover) return;
    desk.hover = id;
    canvas.style.cursor = id ? 'pointer' : '';
    window.dispatchEvent(new CustomEvent('rhumbcabin:hover', { detail: { id } }));
  }
  function updatePointer() {
    if (ptr.hoverFresh && ptr.type !== 'touch') {
      ptr.hoverFresh = false;
      const can = desk.pickable && phase === 'entered' && !desk.glancing && ptr.over;
      const id = can ? pickAt(ptr.x, ptr.y) : null;
      setHover(id && !isOpen(id) ? id : null);
    }
    if ((!desk.pickable || desk.glancing || isOpen(desk.hover)) && desk.hover) setHover(null);
    if (bearingActive() && ptr.bearingFresh) {
      ptr.bearingFresh = false;
      if (!ptr.over && ptr.type !== 'touch') return;
      const o = oceanAt(ptr.x, ptr.y);
      if (!o) return;
      const { bx, by, inside } = o;
      if (ptr.type !== 'touch' && !desk.hover) canvas.style.cursor = inside ? 'crosshair' : '';
      if (!inside) return;
      const dx = bx - homeX, dy = by - homeY;
      if (Math.hypot(dx, dy) < 16) return;
      bearing.deg = wrapDeg(Math.atan2(dx, -dy) / DEG);
      bearing.end = [bx, by];
      bearing.target = 1;
      emitBearing(false);
    }
  }

  /* ---------- Frame ---------- */
  const focusW = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0), orbitV = new THREE.Vector3(), orbitQ = new THREE.Quaternion(), orbitQ2 = new THREE.Quaternion(), _cr = new THREE.Vector3();
  // the harbour chart's flat rectangle on screen (CSS px), for the loader hand-off
  function chartScreenRect() {
    const C = LAYOUT.chart, [w, h] = view();
    harbourSheet.group.updateWorldMatrix(true, false);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      _cr.set((sx * C.w) / 2, HARBOUR_BASE, (sz * C.h) / 2).applyMatrix4(harbourSheet.group.matrixWorld).project(camera);
      const px = ((_cr.x + 1) / 2) * w, py = ((1 - _cr.y) / 2) * h;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  const right = new THREE.Vector3(), upv = new THREE.Vector3(), lightDir = new THREE.Vector3();
  const flashCol = new THREE.Color(0.75, 0.85, 1.0);
  const perf = { frames: 0, t0: performance.now(), fps: 0, low: 0, history: [] };
  const P = { focus: 1, bloom: 0.4, vignette: 0.3, time: 0, sat: 1, tint: [1, 1, 1], fade: 1 };
  let last = performance.now();
  let glassClock = 0, outClock = 40, lastKey = '', postUpto = 9;

  function cameraPose(now, w, h) {
    const target = targetPose(camTarget, w, h);
    if (phase === 'loading') return topDown;
    if (phase === 'moving') {
      // hand-off: hold where the loader drew the chart, rise straight up (the chart settles onto the table), then
      // swing back to the seat
      const el = now - intro.t0, fly0 = intro.hold + intro.rise;
      if (el < fly0) {
        const k = easeInOut(clamp((el - intro.hold) / intro.rise, 0, 1));
        poseCur.pos.lerpVectors(topDown.pos, intro.top.pos, k);
        poseCur.quat.copy(topDown.quat); poseCur.fov = topDown.fov; poseCur.focus.copy(topDown.focus);
        return poseCur;
      }
      const t = clamp((el - fly0) / intro.dur, 0, 1);
      liftUp.set(0, 0.04, 0.12); liftDn.set(0, 0.2, 0.04);
      bezierPose(intro.top, target, t, poseCur, liftUp, liftDn);
      if (t >= 1) { phase = 'entered'; introWaiters.splice(0).forEach((r) => r()); }
      return poseCur;
    }
    if (camTween) {
      const t = clamp((now - camTween.t0) / camTween.dur, 0, 1);
      const dist = camTween.from.pos.distanceTo(target.pos);
      liftUp.set(0, Math.min(0.12, dist * 0.2), 0); liftDn.copy(liftUp);
      bezierPose(camTween.from, target, t, poseTmp, liftUp, liftDn);
      copyPose(poseCur, poseTmp);
      if (t >= 1) { const r = camTween.resolve; camTween = null; r(); }
      return poseCur;
    }
    return copyPose(poseCur, target);
  }

  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 1 / 20);
    last = now;
    const [w, h] = view();
    if (Math.abs(camera.aspect - w / h) > 1e-3) resize();

    // weather: while the ship travels a leg, a timelapse through the day (dusk, night, dawn...) that ends on the leg's
    // weather; otherwise a blend towards the current preset
    let travelSpeed = 0;
    if (travel) {
      if (travel.hold !== null) travel.t0 = now - travel.hold * travel.dur;
      const tk = clamp((now - travel.t0) / travel.dur, 0, 1), seq = travel.seq;
      const f = tk * (seq.length - 1), si = Math.min(seq.length - 2, Math.floor(f));
      mixWeather(cur, seq[si], seq[si + 1], smooth(0, 1, f - si));
      travelSpeed = Math.pow(Math.sin(Math.PI * tk), 2);
      if (tk >= 1 && travel.hold === null) endTravel();
    } else {
      const wk = clamp((now - wx.t0) / wx.dur, 0, 1);
      mixWeather(cur, wx.from, WEATHER[wx.key], smooth(0, 1, wk));
    }
    const pub = publicWeather(wx.key);
    if (pub !== lastKey) { lastKey = pub; if (host) host.setAttribute('data-weather', pub); sound.setWeather(pub); }

    const pose = cameraPose(now, w, h);
    mo.gain = phase === 'loading' ? 0 : phase === 'moving' ? smooth(0.3, 1, (now - intro.t0 - intro.hold - intro.rise) / intro.dur) : 1;
    stepMotion(dt, phase === 'loading');

    // objects: movements, route, pin, sacks, glow
    for (const id in opens) stepTween(opens[id], now);
    harbourSheet.setRoll(opens.chart.v);
    logbook.setOpen(opens.log.v);
    compass.setOpen(opens.compass.v);
    slip.setLift(opens.crew.v);
    letter.setOpen(opens.letter.v);
    cup.steam.uniforms.uSwirl.value = opens.cup.v;
    if (travel) route01.v = travel.fromP + (travel.toP - travel.fromP) * easeInOut(clamp((now - travel.t0) / travel.dur, 0, 1));
    else stepTween(route01, now);
    const head = route.distAt(route01.v);
    routeMat.userData.uniforms.uHead.value = head;
    routeMat.userData.uniforms.uLegStart.value = route.distAt(Math.max(0, Math.ceil(route01.to - 1e-6) - 1));
    routeInk.mesh.visible = head > 0.5 && harbourSheet.roll > 0.01;
    const hp = route.at(Math.max(0.001, head));
    oceanSheet.local(hp.x, hp.y, 0, pin.group.position);
    pin.group.rotation.y = -hp.heading;
    const pinK = smooth(0.82, 1.0, harbourSheet.roll);
    pin.group.visible = pinK > 0.01;
    const ps = 1.75 * pinK;
    pin.token.scale.set(ps, ps, Math.cos(hp.heading) < 0 ? -ps : ps);
    pin.shadow.material.opacity = 0.55 * pinK;
    if (desk.glowAt !== null && now >= desk.glowAt) { desk.glowTarget = 1; desk.glowAt = null; }
    desk.glow += (desk.glowTarget - desk.glow) * (1 - Math.exp(-dt * 1.4));
    box.setGlow(desk.glow * (0.88 + 0.12 * Math.sin(now * 0.0019)));
    box.update(dt);
    decor.update(dt, mo.time, cur);
    cabinets.update(dt, mo.time, cur);

    // pointer, bearing ink, highlight
    updatePointer();
    drawBearing();
    const kb = 1 - Math.exp(-dt * 5);
    bearing.vis += (bearing.target - bearing.vis) * kb;
    bearingMat.opacity = bearing.vis * smooth(0.9, 1.0, harbourSheet.roll);
    bearingInk.mesh.visible = bearing.hasLine && bearingMat.opacity > 0.01;
    highlights.setTarget(desk.glancing ? null : desk.kbd || (desk.pickable && phase === 'entered' ? desk.hover : null));
    highlights.setHint(phase === 'entered' ? desk.hint : null);
    highlights.update(dt, now / 1000);

    // Camera in the rolling cabin. With a mouse it leans a few degrees towards the pointer, orbiting the view's focus
    // with inertia: in full at the desk, about a third with an object open, not during the entry or a glance. Picking
    // and anchors use this same camera, so they stay exact.
    {
      const kp = 1 - Math.exp(-dt * 2.0);
      const pk = phase !== 'entered' || desk.glancing ? 0 : desk.mode === 'desk' && !camTween ? 1 : 0.35;
      par.x += (par.tx - par.x) * kp; par.y += (par.ty - par.y) * kp; par.k += (pk - par.k) * kp;
    }
    right.set(1, 0, 0).applyQuaternion(pose.quat);
    orbitQ.setFromAxisAngle(UP, par.x * par.k * PAR_YAW);
    orbitQ2.setFromAxisAngle(right, par.y * par.k * PAR_PITCH);
    orbitQ.multiply(orbitQ2);
    orbitV.copy(pose.pos).sub(pose.focus).applyQuaternion(orbitQ);
    camera.position.copy(pose.focus).add(orbitV).applyMatrix4(ship.matrix);
    tmpQ.setFromEuler(_e.set(mo.roll * cur.camRoll, 0, mo.pitch * cur.camRoll, 'XYZ'));
    camera.quaternion.copy(tmpQ).multiply(orbitQ).multiply(pose.quat);
    if (Math.abs(camera.fov - pose.fov) > 1e-4) camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    focusW.copy(pose.focus).applyMatrix4(ship.matrix);
    P.focus = camera.position.distanceTo(focusW);
    if (phase === 'moving' && intro && intro.onIntro) {
      const el = now - intro.t0, fly0 = intro.hold + intro.rise;
      intro.onIntro(chartScreenRect(), el < intro.hold ? 'hold' : el < fly0 ? 'rise' : 'fly', clamp((el - intro.hold) / intro.rise, 0, 1));
    }

    // lightning, green water over the glass
    if (phase === 'entered' && cur.lightning > 0.6 && mo.time > fl.next) {
      fl.at = mo.time; fl.next = mo.time + 4.5 + Math.random() * 6;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      fl.dir.set(Math.cos(a), 0.18 + Math.random() * 0.25, Math.sin(a)).normalize();
      sound.thunder(0.6 + Math.random() * 1.4, 0.7 + Math.random() * 0.3);
    }
    const flash = flashLevel(mo.time) * cur.lightning;
    if (cur.wash > 0.3 && mo.time > wash.next) { wash.at = mo.time; wash.next = mo.time + 5 + Math.random() * 5; }
    const washK = washLevel(mo.time) * cur.wash;

    // lights and materials follow the weather
    const lampK = 1 + flareLevel(now);
    maybeEnv(cur, 1, now, false);
    out.apply(cur, flash);
    // calm weathers keep a visible swell and chop in the porthole
    out.uniforms.uWaveAmp.value = Math.max(cur.waveAmp, 0.34);
    out.uniforms.uChop.value = Math.max(cur.chop, 0.45);
    // phone tier (no transmission): the moon's path on the water would bloom into a white patch at full strength
    if (!Q.transmission) out.uniforms.uGlitter.value = cur.glitter * (1 - 0.7 * cur.moon);
    // the outdoor clock runs with the scene and races during a leg's timelapse (clouds, waves, rain)
    outClock += dt * (1 + 60 * travelSpeed);
    out.uniforms.uTime.value = outClock;
    out.uniforms.uFlashDir.value.copy(fl.dir);
    out.rain.position.set(camera.position.x, LAYOUT.seaY + 6, camera.position.z);
    // without transmission (phone tier) the glass shows the outdoors straight: lift dark weather so waves and moon read
    out.uniforms.uOutGain.value = Q.transmission ? 1 : 1 + 1.5 * clamp(1 - cur.lightI / 1.2, 0, 1) * (1 - 0.75 * cur.moon);
    renderer.toneMappingExposure = cur.exposure;
    lightDir.set(cur.lightDir[0], cur.lightDir[1], cur.lightDir[2]).normalize();
    sun.position.copy(sun.target.position).addScaledVector(lightDir, -4);
    sun.intensity = cur.lightI + flash * 2.4;
    sun.color.setRGB(cur.lightColor[0], cur.lightColor[1], cur.lightColor[2]).lerp(flashCol, clamp(flash * 2, 0, 1));
    sun.shadow.radius = cur.shadowSoft;
    const tt = mo.time;
    const flick = 1 + (vnoise(tt * 9, 2) - 0.5) * cur.flicker * 2 + (vnoise(tt * 23, 5) - 0.5) * cur.flicker;
    lamp.light.intensity = cur.lampI * lampK * flick;
    lamp.flameMat.uniforms.uI.value = (0.75 + 0.25 * flick) * (1 + 0.5 * (lampK - 1));
    lamp.flameMat.uniforms.uTime.value = tt;
    lamp.flame.scale.set(1 + 0.25 * (lampK - 1), (1 + (flick - 1) * 1.5) * (1 + 0.6 * (lampK - 1)), 1 + 0.25 * (lampK - 1));
    lamp.glow.material.color.setRGB(2.2, 1.2, 0.5).multiplyScalar((0.25 + cur.lampI * lampK * 0.6) * flick);
    fills.forEach((s) => { s.intensity = cur.fillI + flash * 3.2; s.color.setRGB(cur.fillColor[0], cur.fillColor[1], cur.fillColor[2]).lerp(flashCol, clamp(flash * 2, 0, 1)); });
    scene.environmentIntensity = cur.envI + flash * 0.35;
    amb.intensity = cur.ambI + flash * 0.45;
    beams.update(lightDir, shipQi, cur, tt);
    amb.color.setRGB(cur.ambSky[0], cur.ambSky[1], cur.ambSky[2]);
    amb.groundColor.setRGB(cur.ambGround[0], cur.ambGround[1], cur.ambGround[2]);
    glassClock += dt * cur.rainFlow * (1 + 8 * travelSpeed);
    const gu = glassMat.userData.uniforms;
    gu.uRain.value = cur.rain; gu.uTime.value = glassClock; gu.uWash.value = washK; gu.uClock.value = tt;
    cup.steam.uniforms.uStrength.value = cur.steam * (1 + 0.6 * opens.cup.v);
    P.bloom = cur.bloom; P.vignette = cur.vignette; P.time = tt; P.sat = cur.sat;
    P.tint[0] = cur.tint[0]; P.tint[1] = cur.tint[1]; P.tint[2] = cur.tint[2];
    P.fade = 1;

    if (phase !== 'loading') sound.tick(dt, 0.5 + 0.5 * Math.sin(mo.phase - 0.8), mo.time);

    if (post) post.render(dt, P, postUpto);
    else { renderer.setRenderTarget(null); renderer.render(scene, camera); }

    perf.frames++;
    if (now - perf.t0 >= 1000) {
      perf.fps = (perf.frames * 1000) / (now - perf.t0);
      perf.history.push(Math.round(perf.fps));
      if (perf.history.length > 30) perf.history.shift();
      perf.frames = 0; perf.t0 = now;
      if (phase === 'entered') { if (perf.fps < 30) perf.low++; else perf.low = 0; if (perf.low >= 4) { perf.low = 0; degrade(); } }
    }
  }

  function degrade() {
    Q.level++;
    if (Q.level === 1 && post) post.setAO(false);
    else if (Q.level === 2) {
      Q.dof = false;
      sun.shadow.mapSize.set(Q.shadow / 2, Q.shadow / 2); makeShadowMap(sun);
      if (lamp.light.castShadow) { lamp.light.shadow.mapSize.set(Q.pointShadow / 2, Q.pointShadow / 2); makeShadowMap(lamp.light); }
    } else if (Q.level === 3) { renderer.setPixelRatio(1); resize(); }
  }

  let running = false, paused = false, disposed = false, rafId = 0;
  function loop(now) {
    if (document.hidden || paused || disposed) { running = false; return; }
    if (!contextLost) frame(now);
    rafId = requestAnimationFrame(loop);
  }
  function run() { if (running || paused || disposed) return; running = true; last = performance.now(); rafId = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { perf.t0 = performance.now(); perf.frames = 0; run(); } });
  window.addEventListener('resize', resize);

  resize();
  maybeEnv(cur, 1, performance.now(), true);
  host && host.setAttribute('data-weather', 'dawn');
  await step();

  /* ---------- Compile every shader before the scene is shown ---------- */
  const compileLog = [];
  const hidden = [];
  scene.traverse((o) => { if (!o.visible && !o.userData.pickProxy) { hidden.push(o); o.visible = true; } });
  out.uniforms.uRainOut.value = 0.5;
  const compileList = [out.sky, out.sea, out.rain, table, wall, portholes[0].group, portholes[1].group, lamp.group, oceanSheet.group, harbourSheet.group, compass.group, cup.group, pencil, beans, box.group, decals, logbook.group, dividers, slip.group, letter.group, decor.group, cabinets.group, beams.group];
  camera.position.copy(topDown.pos); camera.quaternion.copy(topDown.quat); camera.updateMatrixWorld();
  shipMatrix(ship.matrix, 0, 0, 0); ship.updateMatrixWorld(true);
  // One unit per distinct material (and mesh kind), weighted by how heavy its program is, so the percent follows the
  // real compile work instead of pausing on the big groups.
  // (Tried keying units by shader-program signature, 79 -> 35 units: no change in load time on Firefox or WebKit, the
  // time is the engines' own linking. Kept one unit per material.)
  const units = [], seenMat = new Set();
  compileList.forEach((root) => root.traverse((o) => {
    if (!o.material || o.userData.pickProxy) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const key = mats.map((m) => m.uuid).join('+') + (o.isInstancedMesh ? ':i' : o.isPoints ? ':p' : o.isSprite ? ':s' : '');
    if (seenMat.has(key)) return;
    seenMat.add(key);
    const m = mats[0];
    units.push({ o, w: m.isMeshPhysicalMaterial ? (m.transmission > 0 ? 5 : 3) : m.isMeshStandardMaterial ? 2 : m.isShaderMaterial ? 1.5 : 0.5 });
  }));
  const totalW = units.reduce((sum, u) => sum + u.w, 0);
  compileLog.push(['@compile-start', 0, Math.round(performance.now())]);
  let doneW = 0;
  const parallel = renderer.extensions.has('KHR_parallel_shader_compile');
  const unitName = (o) => o.name || (o.material && !Array.isArray(o.material) && o.material.name) || o.type;
  const finishUnit = (u, t0) => { compileLog.push([unitName(u.o), u.w, Math.round(performance.now() - t0)]); doneW += u.w; boot.report('compile', doneW / totalW); };
  for (const u of units) {
    const t0 = performance.now();
    try {
      if (parallel) await renderer.compileAsync(u.o, camera, scene);
      else renderer.compile(u.o, camera, scene); // without parallel compile three would only warn and do the same
    } catch (e) { /* compiled on first draw instead */ }
    finishUnit(u, t0);
    if (!parallel) await breathe();
  }
  boot.report('build', 1);
  compileLog.push(['@compile-end', 0, Math.round(performance.now())]);

  /* ---------- Warm-up behind the loader: the desk, the open chart with a route, the storm at the porthole ---------- */
  const WARM = 12;
  const warmPlan = (i) => (i < 2 ? ['desk'] : i < 4 ? ['chart'] : i < 6 ? ['porthole'] : i < 8 ? ['letter'] : ['desk']);
  for (let i = 0; i < WARM; i++) {
    const [target] = warmPlan(i);
    camTarget = target;
    for (const id in opens) setNow(opens[id], id === target ? 1 : 0);
    setNow(route01, target === 'chart' ? 6 : 0);
    const wkey = target === 'porthole' ? 'storm' : target === 'chart' ? 'sun' : 'dawn';
    wx.from = cloneWeather(WEATHER[wkey]); wx.key = wkey; wx.t0 = 0; wx.dur = 1;
    const savedPhase = phase;
    phase = 'warm';
    const tw0 = performance.now();
    if (i === 0 && post) {
      // The first full frame prepares shadow programs, the transmission pass and texture uploads in one go (about 4 s
      // on a cold shader cache). Take it apart: first draw each compile unit on its own (everything else hidden, the
      // lights kept so program keys match, culling off so nothing is skipped), then the post passes one by one, with
      // a progress report after each piece.
      postUpto = 0;
      frame(performance.now()); // state and uniforms only, nothing drawn
      const drawables = [];
      scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && !o.userData.pickProxy) drawables.push([o, o.visible, o.frustumCulled]); });
      drawables.forEach(([o]) => { o.visible = false; });
      let doneU = 0;
      for (const u of units) {
        const ts = performance.now();
        u.o.visible = true; u.o.frustumCulled = false;
        renderer.setRenderTarget(post.sceneRT);
        renderer.render(scene, camera);
        u.o.visible = false;
        compileLog.push(['warm-unit:' + unitName(u.o), u.w, Math.round(performance.now() - ts)]);
        doneU += u.w;
        boot.report('warm', (0.45 * doneU) / totalW);
        await breathe();
      }
      drawables.forEach(([o, vis, culled]) => { o.visible = vis; o.frustumCulled = culled; });
      for (let k = 1; k <= 5; k++) {
        const ts = performance.now();
        postUpto = k;
        frame(performance.now());
        compileLog.push(['warm-step-' + k, 0, Math.round(performance.now() - ts)]);
        boot.report('warm', 0.45 + (0.15 * k) / 5);
        await breathe();
      }
      postUpto = 9;
    } else frame(performance.now());
    compileLog.push(['warm-frame-' + i, 0, Math.round(performance.now() - tw0)]);
    phase = savedPhase;
    if (i === 7) hidden.forEach((o) => { o.visible = false; });
    boot.report('warm', i === 0 ? 0.6 : 0.6 + (i / (WARM - 1)) * 0.37);
    await breathe();
  }
  camTarget = 'desk';
  for (const id in opens) setNow(opens[id], 0);
  setNow(route01, 0);
  wx.from = cloneWeather(WEATHER.dawn); wx.key = 'dawn'; wx.t0 = 0; wx.dur = 1;
  mixWeather(cur, WEATHER.dawn, WEATHER.dawn, 0);
  box.setSlots([false, false, false, false, false, false], -1, true);
  maybeEnv(WEATHER.dawn, 1, performance.now(), true);
  stamp('warm-end');
  run();

  /* ---------- API ---------- */
  function resolveCamTween() { if (camTween) { const r = camTween.resolve; camTween = null; r(); } }
  // Move the camera to a target and run the objects' movements. Returns a Promise that resolves on arrival.
  function goTo(target, duration, schedule) {
    const now = performance.now();
    if (phase === 'loading' || phase === 'warm') { camTarget = target; schedule(now, 0, true); return Promise.resolve(); }
    if (phase === 'moving') {
      camTarget = target;
      const remain = Math.max(300, intro.t0 + intro.hold + intro.rise + intro.dur - now);
      schedule(now, remain, false);
      return new Promise((r) => introWaiters.push(r));
    }
    resolveCamTween();
    if (!(duration > 0)) { camTarget = target; schedule(now, 0, true); return Promise.resolve(); }
    return new Promise((resolve) => {
      camTween = { from: copyPose(newPose(), poseCur), t0: now, dur: duration, resolve };
      camTarget = target;
      schedule(now, duration, false);
    });
  }
  function stopGlance() { desk.glanceToken++; desk.glancing = false; }
  function focus(id, { duration = 1400 } = {}) {
    if (!OBJECT_IDS.includes(id)) return Promise.resolve();
    if (id === 'lamp') { flickerLamp(); return Promise.resolve(); }
    stopGlance();
    desk.mode = 'focus'; desk.focus = id;
    if (id !== 'chart') setBearingPointer(false);
    return goTo(id, duration, (now, dur, instant) => {
      for (const k in opens) {
        if (instant) setNow(opens[k], k === id ? 1 : 0);
        else if (k === id) animate(opens[k], 1, now + dur * 0.25, dur * 0.75);
        else animate(opens[k], 0, now, dur * 0.5);
      }
    });
  }
  function home({ duration = 1200 } = {}) {
    stopGlance();
    desk.mode = 'desk'; desk.focus = null;
    setBearingPointer(false);
    setWeather(deskWeatherKey(), duration); // no change unless a leg was viewed after landfall
    return goTo('desk', duration, (now, dur, instant) => {
      for (const k in opens) { if (instant) setNow(opens[k], 0); else animate(opens[k], 0, now, dur * 0.6); }
    });
  }
  function setPickable(on) { desk.pickable = !!on; if (!on) setHover(null); }
  function setHighlight(id) { desk.kbd = OBJECT_IDS.includes(id) ? id : null; }
  function setBearingPointer(on) {
    bearingOn = !!on;
    bearing.target = on ? 1 : 0;
    canvas.style.touchAction = on ? 'none' : '';
    if (!on && canvas.style.cursor === 'crosshair') canvas.style.cursor = '';
    if (on) ptr.bearingFresh = true;
  }
  /* A leg on the ocean chart, as a timelapse: the ship sails the rhumb lines from `from` ('merrowick', an origin id, or
     null for the leg shown last, Merrowick if none) to the origin's port, the ink following it; outside, the day runs
     fast (dusk, night, dawn; twice over three legs or more) and settles on the leg's weather. Resolves on arrival.
     skipTravel() finishes at once. showLeg(null): the ocean chart, no port. */
  const legParam = (id) => (id === 'merrowick' ? 0 : VOYAGE_ORDER.indexOf(id) >= 0 ? VOYAGE_ORDER.indexOf(id) + 1 : null);
  function endTravel() {
    if (!travel) return;
    const t = travel;
    travel = null;
    setNow(route01, t.toP);
    wx.from = cloneWeather(WEATHER[t.target]); wx.key = t.target; wx.t0 = 0; wx.dur = 1;
    t.resolve();
  }
  function skipTravel() { endTravel(); }
  function showLeg(originId, { from = null, duration = 3500 } = {}) {
    const i = VOYAGE_ORDER.indexOf(originId);
    const now = performance.now();
    if (i < 0) {
      endTravel();
      animate(route01, 0, now, 700);
      return wait(700);
    }
    const toP = i + 1, target = LEG_WEATHER[originId];
    let fromP;
    if (travel) { fromP = route01.v; const r = travel.resolve; travel = null; r(); }
    else if (from !== null && from !== undefined && legParam(from) !== null) fromP = legParam(from);
    else fromP = desk.lastLeg !== null ? desk.lastLeg : 0;
    setBearingPointer(false);
    // the chart shows the leg's weather; the desk keeps it, except after landfall, when the desk stays at dusk
    desk.deskWeather = desk.landed ? 'dusk' : target;
    desk.seaKey = null;
    desk.lastLeg = toP;
    const legs = Math.abs(toP - fromP);
    if (!(duration > 0) || legs < 0.01) {
      const d = !(duration > 0) ? 0 : 900;
      setNow(route01, toP);
      setWeather(target, d);
      return wait(d);
    }
    const keys = legs >= 2.5 ? ['dusk', 'night', 'dawn', 'sun', 'dusk', 'night', 'dawn'] : ['dusk', 'night', 'dawn'];
    setNow(route01, fromP);
    route01.to = toP;
    return new Promise((resolve) => {
      travel = { t0: now, dur: duration, fromP, toP, target, seq: [cloneWeather(cur), ...keys.map((k) => WEATHER[k]), WEATHER[target]], resolve, hold: null };
      // the page and the sound hear the destination's weather at once
      wx.from = cloneWeather(WEATHER[target]); wx.key = target; wx.t0 = 0; wx.dur = 1;
    });
  }
  function setHint(id) { desk.hint = OBJECT_IDS.includes(id) ? id : null; }
  function setFound(originIds, { drop } = {}) {
    desk.found = new Set((originIds || []).filter((id) => VOYAGE_ORDER.includes(id)));
    box.setSlots(VOYAGE_ORDER.map((id) => desk.found.has(id)), VOYAGE_ORDER.indexOf(drop), phase !== 'entered');
  }
  /* Landfall (6/6): usually reached inside the chart, so the camera flies to the chest wherever it is and the chest
     starts to glow as it comes into view; the sky turns to dusk. State becomes
     focus 'chest'. Resolves when the camera has arrived; the page then calls home() or focus() as usual. */
  function landfall({ duration = 1600 } = {}) {
    endTravel();
    desk.landed = true;
    desk.deskWeather = 'dusk';
    desk.seaKey = null;
    setWeather('dusk', 2000);
    const already = desk.mode === 'focus' && desk.focus === 'chest' && !camTween;
    desk.glowAt = performance.now() + (already ? 0 : duration * 0.55);
    return already ? Promise.resolve() : focus('chest', { duration });
  }
  /* A sea moment changes the weather. From the seat at the desk the camera also glances out of the right porthole
     while the weather turns (about 2.5 s: out, a look, back) and the Promise resolves once it is back at the desk.
     Nothing can be hovered or picked during the glance. null only restores the desk's weather. */
  const GLANCE = { out: 850, hold: 900, back: 850 };
  async function seaMoment(key) {
    endTravel();
    desk.seaKey = SEA_WEATHER[key] ? key : null;
    setWeather(deskWeatherKey(), 1400);
    if (!desk.seaKey || desk.mode !== 'desk' || phase !== 'entered') return wait(1400);
    const token = ++desk.glanceToken;
    desk.glancing = true;
    setHover(null);
    const none = () => {};
    await goTo('porthole', GLANCE.out, none);
    if (token !== desk.glanceToken) return;
    await wait(GLANCE.hold);
    if (token !== desk.glanceToken) return;
    await goTo('desk', GLANCE.back, none);
    if (token === desk.glanceToken) desk.glancing = false;
  }
  function flickerLamp() { flare.at = performance.now(); }
  const corner = new THREE.Vector3(), camSpace = new THREE.Vector3();
  function getAnchor(id) {
    const m = proxyOf[id];
    if (!m) return null;
    m.updateWorldMatrix(true, false);
    const bb = m.geometry.boundingBox;
    const [w, h] = view();
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, behind = false;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(m.matrixWorld);
      camSpace.copy(corner).applyMatrix4(camera.matrixWorldInverse);
      if (camSpace.z > -camera.near) { behind = true; continue; }
      corner.project(camera);
      const sx = ((corner.x + 1) / 2) * w, sy = ((1 - corner.y) / 2) * h;
      minx = Math.min(minx, sx); maxx = Math.max(maxx, sx); miny = Math.min(miny, sy); maxy = Math.max(maxy, sy);
    }
    if (!Number.isFinite(minx)) return { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0, visible: false };
    const settled = phase === 'entered' || (phase === 'moving' && intro && performance.now() - intro.t0 - intro.hold - intro.rise >= 0.6 * intro.dur);
    const onScreen = maxx > 0 && minx < w && maxy > 0 && miny < h;
    return { x: minx, y: miny, w: maxx - minx, h: maxy - miny, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, visible: settled && !behind && onScreen && P.fade > 0.5 && !desk.glancing };
  }
  const api = {
    objects: OBJECT_IDS.slice(),
    focus, home, setPickable, setHighlight, setHint, getAnchor, showLeg, skipTravel, setBearingPointer, setFound, landfall, seaMoment, flickerLamp,
    get state() { return { mode: desk.mode, focus: desk.focus, weather: publicWeather(wx.key), found: VOYAGE_ORDER.filter((id) => desk.found.has(id)) }; },
    pause() { paused = true; },
    resume() { if (!paused) return; paused = false; perf.t0 = performance.now(); perf.frames = 0; run(); }
  };

  window.__cabin = {
    get phase() { return phase; },
    fps: () => perf.fps,
    fpsHistory: () => perf.history.slice(),
    quality: () => ({ tier: Q.tier, level: Q.level, budget: Q.budget, transmission: Q.transmission, lampShadow: lamp.light.castShadow, ao: Q.ao, dof: Q.dof, dpr: renderer.getPixelRatio(), post: !!post, gpu: rendererName(renderer.getContext()), programs: renderer.info.programs ? renderer.info.programs.length : -1 }),
    // try another orientation for a view (QA framing searches): merges into VIEWS[target][ff], optional rect; returns the fit
    tuneView: (target, ff, spec, rect) => {
      if (spec) Object.assign(VIEWS[target][ff], spec);
      if (rect) RECTS[target === 'desk' ? 'desk' : 'focus'][ff] = rect;
      fitCache.clear();
      const [w, h] = view(), p = targetPose(target, w, h);
      return { pos: p.pos.toArray().map((v) => +v.toFixed(3)), clamped: !!p.clamped, spec: Object.assign({}, VIEWS[target][ff]) };
    },
    // motion: hull (deg, m), lamp swing (m), coffee slope, sea and steam clocks, parallax
    motion: () => ({ gain: +mo.gain.toFixed(3), t: +mo.time.toFixed(2), roll: +(mo.roll / DEG).toFixed(3), pitch: +(mo.pitch / DEG).toFixed(3), heave: +mo.heave.toFixed(4), lamp: [+pend.ux.toFixed(4), +pend.uz.toFixed(4)], coffee: [+co.sx.toFixed(4), +co.sz.toFixed(4)], seaT: +out.uniforms.uTime.value.toFixed(2), steamT: +cup.steam.uniforms.uTime.value.toFixed(2), glassT: +glassClock.toFixed(2), par: [+par.x.toFixed(3), +par.y.toFixed(3)], camRoll: cur.camRoll, weatherRoll: cur.roll, period: cur.period, running, paused }),
    probe: () => ({ t: mo.time, roll: mo.roll / DEG, phase, mode: desk.mode, focus: desk.focus, glancing: desk.glancing, moving: !!camTween || phase === 'moving', opens: Object.fromEntries(Object.entries(opens).map(([k, o]) => [k, +o.v.toFixed(3)])), route: +route01.v.toFixed(3), weather: wx.key, found: [...desk.found], glow: +desk.glow.toFixed(3), hover: desk.hover, kbd: desk.kbd, pickable: desk.pickable, bearingOn, sacks: box.filled, travel: travel ? +clamp((performance.now() - travel.t0) / travel.dur, 0, 1).toFixed(3) : null, lastLeg: desk.lastLeg, hint: desk.hint, hintLevel: desk.hint ? +highlights.hintLevel(desk.hint).toFixed(3) : 0 }),
    // QA: hold a leg's timelapse at progress k (0..1) for a still frame; null lets it run on from there
    holdTravel: (k) => { if (travel) travel.hold = k === null ? null : clamp(k, 0, 1); return !!travel; },
    highlightLevel: (id) => highlights.level(id),
    // the hint's pulse right now, 0 (off) .. 1 (brightest)
    hintPulse: () => highlights.pulse(),
    anchors: () => Object.fromEntries(OBJECT_IDS.map((id) => [id, getAnchor(id)])),
    flash: () => { fl.at = mo.time; fl.next = mo.time + 4.5; },
    wash: () => { wash.at = mo.time; wash.next = mo.time + 6; },
    compileLog: () => compileLog.slice(),
    texTimes: () => texTimes.slice(),
    timeline: () => timeline.slice(),
    programMap: () => {
      const users = new Map();
      scene.traverse((o) => {
        if (!o.material) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          const pr = renderer.properties.get(m).currentProgram;
          if (!pr) return;
          if (!users.has(pr.id)) users.set(pr.id, new Set());
          users.get(pr.id).add((o.name || o.type) + ':' + m.type.replace('Material', ''));
        });
      });
      return renderer.info.programs.map((pr) => [pr.id, pr.name, users.has(pr.id) ? [...users.get(pr.id)].slice(0, 5).join(' ') : '']);
    },
    camInfo: () => { const inv = new THREE.Matrix4().copy(ship.matrix).invert(); return { cam: camera.position.clone().applyMatrix4(inv).toArray(), lamp: lamp.group.position.clone().applyMatrix4(inv).toArray(), lampDir: new THREE.Vector3(0, -1, 0).applyQuaternion(lamp.group.quaternion).toArray(), lampLen: 0.68 }; },
    // screen position (CSS px) of a point on the ocean chart (sheet units 0..1400, 0..1000)
    // screen position (CSS px) of cabin-space points [[x, y, z], ...], and whether each is in front of the camera
    project: (pts) => { const [w, h] = view(); return pts.map(([x, y, z]) => { const p = new THREE.Vector3(x, y, z).applyMatrix4(ship.matrix), c = p.clone().applyMatrix4(camera.matrixWorldInverse); p.project(camera); return { x: Math.round(((p.x + 1) / 2) * w), y: Math.round(((1 - p.y) / 2) * h), front: c.z < 0 }; }); },
    oceanScreen: (sx, sy) => { const p = oceanSheet.local(sx, sy, 0); oceanSheet.group.localToWorld(p); p.project(camera); const [w, h] = view(); return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h }; },
    // screen positions (CSS px) of the coffee cup's rim and of a porthole's centre, for picking checks
    cupScreen: () => { const p = new THREE.Vector3(0, 0.07, 0); cup.group.localToWorld(p); p.project(camera); const [w, h] = view(); return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h }; },
    portholeScreen: (i) => { const p = new THREE.Vector3(0, 0, 0.02); portholes[i].group.localToWorld(p); p.project(camera); const [w, h] = view(); return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h }; },
    route
  };

  return {
    api,
    /* Hand-off from the loader. onIntro(rect, stage, k) is called every frame of the entry, after the camera has moved:
       rect is the harbour chart on screen (CSS px), stage 'hold' | 'rise' | 'fly', k the rise's progress. */
    enter({ onIntro } = {}) {
      topDown = topDownPose(boot.chartRect && boot.chartRect());
      const top = copyPose(newPose(), topDown);
      top.pos.y = Math.min(1.25, HARBOUR_BASE + (topDown.pos.y - HARBOUR_BASE) * 1.55);
      phase = 'moving';
      intro = { t0: performance.now(), hold: 220, rise: 1050, dur: 2100, top, onIntro: onIntro || null };
      pend.vx = 0.05; pend.vz = 0.015; // the lamp is already swaying when the cabin comes into view
    },
    skip() {
      if (!intro || phase !== 'moving') return;
      const end = intro.hold + intro.rise + intro.dur, el = performance.now() - intro.t0;
      if (el < end - 350) intro.t0 = performance.now() - (end - 350);
    },
    emitBearing() { /* desk contract v2: bearings are only reported while the chart is open */ },
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* gone */ }
    }
  };
}
