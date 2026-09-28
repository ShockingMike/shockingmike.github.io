/* Post pipeline: HDR scene (MSAA + depth) -> GTAO -> depth of field -> bloom -> ACES output -> grade (saturation, tint,
   vignette, grain, fade to dark) -> SMAA.
   Cost notes (RTX 3060, 1920 x 1080, measured 2026-09-28):
   - the shadow maps are drawn once a frame, for the scene pass only (GTAO's normal pass drew them all again: ~500 draw
     calls and ~4 ms of main thread a frame, for a pass that never reads a shadow);
   - world matrices are updated once a frame, not once per scene pass;
   - with refraction (lib/refraction.js) the glass samples a copy of the scene target instead of a second cabin.
   Quality steps (setQuality) only ever lighten: render scale (then an upscale that sharpens, so the picture never goes
   soft), AO at half resolution or off, MSAA, depth-of-field taps. Scale 1, AO full, MSAA 4, 48 taps is the full look. */
import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { MASK } from './refraction.js';

const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const DOF_FRAG = /* glsl */`
  uniform sampler2D tColor, tDepth; uniform vec2 uTexel;
  uniform float uNear, uFar, uFocus, uRange, uFarK, uNearK, uMaxCoc, uOn;
  varying vec2 vUv;
  float viewZ(float d) { float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
  float coc(float z) {
    float dz = z - uFocus;
    float c = dz > 0.0 ? max(0.0, dz - uRange) / z * uFarK : max(0.0, -dz - uRange * 0.7) / z * uNearK;
    return clamp(c, 0.0, 1.0) * uMaxCoc;
  }
  vec3 fetch(vec2 uv) {
    vec3 c = texture2D(tColor, uv).rgb;
    if (!(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b)) c = vec3(0.0);
    float m = max(c.r, max(c.g, c.b));
    return m > 10.0 ? c * (10.0 / m) : c;
  }
  void main() {
    vec3 base = fetch(vUv);
    if (uOn < 0.5) { gl_FragColor = vec4(base, 1.0); return; }
    float z0 = viewZ(texture2D(tDepth, vUv).x);
    float c0 = coc(z0);
    vec3 acc = base; float wsum = 1.0;
    for (int i = 1; i < TAPS; i++) {
      float fi = float(i);
      float r = sqrt(fi / float(TAPS)) * uMaxCoc;
      float a = fi * 2.39996323;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
      float zs = viewZ(texture2D(tDepth, uv).x);
      float cs = coc(zs);
      float cUse = zs > z0 ? min(cs, c0) : cs;
      float w = smoothstep(r - 1.0, r + 0.5, cUse);
      acc += fetch(uv) * w; wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, 1.0);
  }`;

/* Upscale from the render size to the screen: Catmull-Rom (5 bilinear taps), then a light unsharp mask held inside the
   source pixel's own neighbourhood so it can never ring. Used only when the scene renders below the screen's size. */
const UPSCALE_FRAG = /* glsl */`
  uniform sampler2D tSrc; uniform vec2 uSrcSize; uniform float uSharp; varying vec2 vUv;
  vec3 tap(vec2 uv) { return texture2D(tSrc, uv).rgb; }
  void main() {
    vec2 pos = vUv * uSrcSize, tc = floor(pos - 0.5) + 0.5, f = pos - tc;
    vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
    vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
    vec2 w12 = w1 + w2, t0 = (tc - 1.0) / uSrcSize, t3 = (tc + 2.0) / uSrcSize, t12 = (tc + w2 / w12) / uSrcSize;
    float a = w12.x * w0.y, b = w0.x * w12.y, c = w12.x * w12.y, d = w3.x * w12.y, e = w12.x * w3.y;
    vec3 col = (tap(vec2(t12.x, t0.y)) * a + tap(vec2(t0.x, t12.y)) * b + tap(t12) * c + tap(vec2(t3.x, t12.y)) * d + tap(vec2(t12.x, t3.y)) * e) / (a + b + c + d + e);
    vec2 px = 1.0 / uSrcSize, ctr = (floor(pos) + 0.5) * px;
    vec3 m = tap(ctr), n = tap(ctr - vec2(0.0, px.y)), s = tap(ctr + vec2(0.0, px.y)), wv = tap(ctr - vec2(px.x, 0.0)), ev = tap(ctr + vec2(px.x, 0.0));
    vec3 lo = min(m, min(min(n, s), min(wv, ev))), hi = max(m, max(max(n, s), max(wv, ev)));
    vec3 soft = (n + s + wv + ev + m * 4.0) / 8.0;
    gl_FragColor = vec4(clamp(col + (col - soft) * uSharp, lo, hi), 1.0);
  }`;

/* GPU time per stage (timer queries), only with ?perf&gputime in the address (the queries cost main-thread time):
   window.__cabin.perf() reads it. A stage that issues many draw calls also counts the time the GPU waits for them. */
function gpuTimer(renderer) {
  const gl = renderer.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return null;
  const pending = [], acc = {};
  let open = null;
  return {
    acc,
    mark(name) {
      if (open) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(open); open = null; }
      if (name) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); open = { q, name }; }
    },
    poll() {
      for (let i = pending.length - 1; i >= 0; i--) {
        const it = pending[i];
        if (!gl.getQueryParameter(it.q, gl.QUERY_RESULT_AVAILABLE)) continue;
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) { const a = acc[it.name] || (acc[it.name] = []); a.push(gl.getQueryParameter(it.q, gl.QUERY_RESULT) / 1e6); if (a.length > 240) a.shift(); }
        gl.deleteQuery(it.q); pending.splice(i, 1);
      }
    }
  };
}

export function createPost(renderer, scene, camera, Q) {
  const depthTexture = new THREE.DepthTexture(1, 1);
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Q.msaa, depthTexture });
  const hdr = { type: THREE.HalfFloatType, depthBuffer: false };
  const aoRT = new THREE.WebGLRenderTarget(1, 1, hdr);
  const dofRT = new THREE.WebGLRenderTarget(1, 1, hdr);
  const ldrRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const gradeRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });

  let gtao = null, refraction = null;
  const hideForAO = [];
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.28, 2.2);
  const output = new OutputPass();
  const smaa = new SMAAPass();
  smaa.renderToScreen = true;

  // render scale, AO scale (1 full, 0.5 half, 0 off), depth-of-field taps; see setQuality
  const quality = { scale: 1, ao: Q.ao ? 1 : 0, dofTaps: Q.dofTaps || 48 };
  const full = new THREE.Vector2(1, 1), inner = new THREE.Vector2(1, 1);

  const dofUniforms = {
    tColor: { value: null }, tDepth: { value: depthTexture }, uTexel: { value: new THREE.Vector2() },
    uNear: { value: 0.02 }, uFar: { value: 100 }, uFocus: { value: 1 }, uRange: { value: 0.16 },
    uFarK: { value: 1.25 }, uNearK: { value: 1.0 }, uMaxCoc: { value: 8 }, uOn: { value: 1 }
  };
  const dofMats = new Map();
  const dofMat = (taps) => {
    if (!dofMats.has(taps)) dofMats.set(taps, new THREE.ShaderMaterial({ name: 'dof' + taps, defines: { TAPS: taps }, uniforms: dofUniforms, vertexShader: QUAD_VERT, fragmentShader: DOF_FRAG }));
    return dofMats.get(taps);
  };
  const dofQuad = new FullScreenQuad(dofMat(quality.dofTaps));

  const gradeMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uAspect: { value: 1 }, uVig: { value: 0.3 }, uGrain: { value: 0.035 }, uTime: { value: 0 }, uSat: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uFade: { value: 1 } },
    vertexShader: QUAD_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uAspect, uVig, uGrain, uTime, uSat, uFade; uniform vec3 uTint; varying vec2 vUv;
      float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = max(mix(vec3(luma), c, uSat) * uTint, 0.0);
        vec2 q = vUv - 0.5; q.x *= uAspect;
        float v = smoothstep(1.05, 0.2, length(q) * 1.15);
        c *= mix(1.0 - uVig, 1.0, v);
        float g = h12(gl_FragCoord.xy + fract(uTime * 13.7) * 211.0) + h12(gl_FragCoord.xy * 1.37 + fract(uTime * 7.3) * 97.0) - 1.0;
        c += g * uGrain * (0.35 + 0.65 * (1.0 - dot(c, vec3(0.3333))));
        gl_FragColor = vec4(c * uFade, 1.0);
      }`
  });
  const gradeQuad = new FullScreenQuad(gradeMat);

  function makeAO() {
    if (gtao) return;
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.07, distanceExponent: 1.3, thickness: 0.02, scale: 1.3, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    sizeAO();
  }
  function sizeAO() { if (gtao) gtao.setSize(Math.max(1, Math.round(inner.x * (quality.ao || 1))), Math.max(1, Math.round(inner.y * (quality.ao || 1)))); }
  function setAO(on) { Q.ao = !!on; if (on) makeAO(); }
  setAO(Q.ao);

  // made after the AO pass, so everything above is built in the same order as before (three's ids and the AO noise
  // come from the same random sequence, which keeps pixel comparisons with older builds exact)
  const smaaRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const upMat = new THREE.ShaderMaterial({
    name: 'upscale', uniforms: { tSrc: { value: smaaRT.texture }, uSrcSize: { value: new THREE.Vector2(1, 1) }, uSharp: { value: 0.45 } },
    vertexShader: QUAD_VERT, fragmentShader: UPSCALE_FRAG, depthTest: false, depthWrite: false, toneMapped: false
  });
  const upQuad = new FullScreenQuad(upMat);
  const timer = /[?&]gputime\b/.test(location.search) ? gpuTimer(renderer) : null;

  function sizeAll() {
    const w = inner.x, h = inner.y;
    sceneRT.setSize(w, h); aoRT.setSize(w, h); dofRT.setSize(w, h); ldrRT.setSize(w, h); gradeRT.setSize(w, h); smaaRT.setSize(w, h);
    if (refraction) refraction.setSize(w, h);
    sizeAO();
    bloom.setSize(w, h);
    smaa.setSize(w, h);
    dofUniforms.uTexel.value.set(1 / w, 1 / h);
    dofUniforms.uMaxCoc.value = Math.max(3, h * 0.0075);
    gradeMat.uniforms.uAspect.value = w / h;
    upMat.uniforms.uSrcSize.value.set(w, h);
    smaa.renderToScreen = w === full.x && h === full.y;
  }
  // w, h: the canvas's drawing buffer; the scene renders at quality.scale of it
  function setSize(w, h) {
    full.set(w, h);
    inner.set(Math.max(1, Math.round(w * quality.scale)), Math.max(1, Math.round(h * quality.scale)));
    sizeAll();
  }
  /* Lighter settings (never heavier than the start). { scale, ao: 1 | 0.5 | 0, msaa, dofTaps } */
  function setQuality(o) {
    let resize = false;
    if (o.scale !== undefined && o.scale !== quality.scale) { quality.scale = o.scale; resize = true; }
    if (o.ao !== undefined && o.ao !== quality.ao) { quality.ao = o.ao; setAO(o.ao > 0); resize = true; }
    if (o.msaa !== undefined && o.msaa !== sceneRT.samples) { sceneRT.samples = o.msaa; sceneRT.dispose(); Q.msaa = o.msaa; }
    if (o.dofTaps !== undefined && o.dofTaps !== quality.dofTaps) { quality.dofTaps = o.dofTaps; dofQuad.material = dofMat(o.dofTaps); }
    if (resize) setSize(full.x, full.y);
  }
  // the programs a lighter step needs (fewer depth-of-field taps, the upscale), drawn once into a tiny target while the
  // loader is up, so stepping down later never stalls on a shader compile
  function warmExtras() {
    const tiny = new THREE.WebGLRenderTarget(4, 4, hdr), keep = dofQuad.material;
    renderer.setRenderTarget(tiny);
    for (const taps of [24, 16]) { dofQuad.material = dofMat(taps); dofQuad.render(renderer); }
    dofQuad.material = keep;
    upQuad.render(renderer);
    renderer.setRenderTarget(null);
    tiny.dispose();
  }

  function drawScene() {
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(sceneRT);
    if (!refraction) { renderer.render(scene, camera); return; }
    const mask = camera.layers.mask;
    camera.layers.mask = MASK.opaque;
    renderer.render(scene, camera);
    const seen = refraction.inView(camera);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    if (seen.any) {
      refraction.copyFrom(sceneRT);
      if (seen.back) {
        camera.layers.mask = MASK.back;
        renderer.setRenderTarget(sceneRT);
        renderer.render(scene, camera);
        refraction.copyFrom(sceneRT);
      }
    }
    camera.layers.mask = MASK.over;
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    renderer.autoClear = autoClear;
    camera.layers.mask = mask;
  }

  // upto: 0 nothing (state only), 1 scene (and shadows), 2 + AO, 3 + depth of field, 4 + bloom, 5+ everything
  function render(dt, P, upto = 9) {
    if (upto <= 0) return;
    if (timer) { timer.poll(); timer.mark('scene'); }
    scene.updateMatrixWorld();
    drawScene();
    if (upto <= 1) { if (timer) timer.mark(null); return; }
    let src = sceneRT;
    if (timer) timer.mark('ao');
    if (Q.ao && gtao) {
      for (let i = 0; i < hideForAO.length; i++) hideForAO[i].userData._v = hideForAO[i].visible, hideForAO[i].visible = false;
      gtao.render(renderer, aoRT, sceneRT);
      for (let i = 0; i < hideForAO.length; i++) hideForAO[i].visible = hideForAO[i].userData._v;
      src = aoRT;
    }
    if (upto <= 2) { if (timer) timer.mark(null); return; }
    if (timer) timer.mark('dof');
    const u = dofUniforms;
    u.tColor.value = src.texture; u.uNear.value = camera.near; u.uFar.value = camera.far;
    u.uFocus.value = P.focus; u.uOn.value = Q.dof ? 1 : 0;
    renderer.setRenderTarget(dofRT);
    dofQuad.render(renderer);
    if (upto <= 3) { if (timer) timer.mark(null); return; }
    if (timer) timer.mark('bloom');
    bloom.strength = P.bloom;
    bloom.render(renderer, null, dofRT, dt, false);
    if (upto <= 4) { if (timer) timer.mark(null); return; }
    if (timer) timer.mark('grade');
    output.render(renderer, ldrRT, dofRT);
    gradeMat.uniforms.tDiffuse.value = ldrRT.texture;
    gradeMat.uniforms.uVig.value = P.vignette;
    gradeMat.uniforms.uTime.value = P.time;
    gradeMat.uniforms.uSat.value = P.sat;
    gradeMat.uniforms.uTint.value.set(P.tint[0], P.tint[1], P.tint[2]);
    gradeMat.uniforms.uFade.value = P.fade;
    renderer.setRenderTarget(gradeRT);
    gradeQuad.render(renderer);
    if (timer) timer.mark('smaa');
    if (smaa.renderToScreen) smaa.render(renderer, null, gradeRT);
    else {
      smaa.render(renderer, smaaRT, gradeRT);
      if (timer) timer.mark('upscale');
      renderer.setRenderTarget(null);
      upQuad.render(renderer);
    }
    if (timer) timer.mark(null);
  }

  return {
    render, setSize, setAO, setQuality, warmExtras, hideForAO, sceneRT, bloom,
    get quality() { return { ...quality, msaa: sceneRT.samples, inner: [inner.x, inner.y], full: [full.x, full.y] }; },
    setRefraction(r) { refraction = r; if (r) r.setSize(inner.x, inner.y); },
    get refraction() { return refraction; },
    // for pick widths etc.: the scene's render size in device pixels and its share of the canvas
    get renderScale() { return inner.x / Math.max(1, full.x); },
    gpuTimes() {
      if (!timer) return null;
      const out = {};
      for (const k in timer.acc) { const s = [...timer.acc[k]].sort((a, b) => a - b); out[k] = +s[s.length >> 1].toFixed(2); }
      return out;
    },
    resetTimes() { if (timer) for (const k in timer.acc) timer.acc[k].length = 0; }
  };
}
