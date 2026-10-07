// Lớp hậu kỳ của Kōzō — dựng theo đúng chuỗi mà igloo.inc dùng (thư viện `postprocessing`, cùng bản họ dùng):
// nở sáng · chiều sâu trường ảnh · tia sáng thể tích · ACESFilmic · nắn màu một sắc · nhiễu sắc · hạt · khử răng cưa.
//
//   const post = createPost(renderer, scene, camera, { mode: 'scene', sun: mesh });
//   post.render(dt) · post.setMode('scene'|'draw') · post.resize() · post.setQuality(0…1) · post.dispose()
//
// Lưu ý cho người dựng cảnh: muốn có tia sáng thể tích thì đưa vào một Mesh phát sáng qua `sun`,
// hoặc đặt tên object là 'godray-source'. Không có thì chuỗi vẫn chạy, chỉ thiếu tia.
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, DepthOfFieldEffect, GodRaysEffect, SMAAEffect, SMAAPreset, EdgeDetectionMode,
  ChromaticAberrationEffect, NoiseEffect, ToneMappingEffect, ToneMappingMode,
  BlendFunction, KernelSize,
} from 'postprocessing';
import { HalfFloatType, NoToneMapping, Scene, Vector2, Vector3 } from 'three';
import { GradeEffect, NanGuardEffect, KetCauGhepEffect } from './grade.js';
import { ChuyenEffect, KhungEffect, QuetEffect, CasEffect, SuongEffect, BayEffect, ShojiEffect, GiayEffect, DuongEffect, MoEffect } from './chuyen.js';


// Hai chế độ. Số lấy thẳng từ bảng chỉ tiêu: cảnh chính đáy sáng ≥ 0,30; bản vẽ **sáng lên và nhạt đi**, đáy ≥ 0,60.
export const MODES = {
  scene: {
    grade: { lift: 0.355, outHigh: 0.9, gamma: 1.0, contrast: 1.02, hue: 221 / 360, hueLock: 0.965, satFloor: 0.055, satCeil: 0.2, satK: 3.0, satScale: 1.0, centerLift: 0.04, edgeFade: 0.07 },
    target: { v50: 0.60, s50: 0.115 },
    bloom: { intensity: 0.85, threshold: 0.62, smoothing: 0.35 },
    dof: { focusRange: 0.035, bokehScale: 4.2 },
    godRays: { density: 0.92, decay: 0.93, weight: 0.42, exposure: 0.5, samples: 60 },
    chroma: 0.0011,
    noise: 0.055,
    calib: { v5: 0.37, v50: 0.60 },
  },
  // sàn bão hoà của chế độ bản vẽ phải trên 0,05 — dưới mức ấy phép đo coi là điểm xám, và cả khung mất sắc
  draw: {
    grade: { lift: 0.645, outHigh: 0.9, gamma: 1.0, contrast: 0.9, hue: 220 / 360, hueLock: 0.97, satFloor: 0.062, satCeil: 0.1, satK: 3.0, satScale: 1.0, centerLift: 0.02, edgeFade: 0.03 },
    target: { v50: 0.69, s50: 0.07 },
    bloom: { intensity: 0.5, threshold: 0.72, smoothing: 0.4 },
    dof: { focusRange: 0.06, bokehScale: 2.0 },
    godRays: { density: 0.7, decay: 0.9, weight: 0.2, exposure: 0.32, samples: 40 },
    chroma: 0.0006,
    noise: 0.035,
    calib: { v5: 0.67, v50: 0.69 },
  },
};

const lerp = (a, b, k) => a + (b - a) * k;

export function createPost(renderer, scene, camera, { mode = 'scene', sun = null, quality = 1, ink = null, chuyen = false, cas = 0 } = {}) {
  // ACESFilmic làm ở trong chuỗi, không làm ở renderer — nếu làm cả hai thì ảnh bị nén hai lần
  renderer.toneMapping = NoToneMapping;

  // stencil: vật liệu toà thành ghi 1 — nét cọ đi RA NGOÀI công trình (mặt phẳng sương) vẽ đè mọi thứ trừ toà thành
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, stencilBuffer: !!ink });
  const renderPass = new RenderPass(scene, camera);
  if (ink) renderPass.clearPass.stencil = true;
  composer.addPass(renderPass);
  // CHẶN NaN/Inf NGAY SAU KHI VẼ CẢNH (săn "nháy đen" 24/9): một điểm ảnh hỏng (NaN, hoặc số quá 65 504 —
  // khung đệm nửa độ chính xác ghi thành Inf) mà lọt vào bộ nở sáng thì phép trung bình mip của nó rải
  // NaN ra CẢ KHUNG; lớp nắn màu kẹp NaN về 0 rồi nâng đáy → cả khung một màu xám tối 0,30 trong một
  // khung hình. Pass này thay điểm hỏng bằng đen và kẹp trần — trước mọi pass trung bình diện rộng.
  composer.addPass(new EffectPass(camera, new NanGuardEffect()));

  // ── các hiệu ứng ───────────────────────────────────────────────────────────
  const dof = new DepthOfFieldEffect(camera, {
    focusDistance: 0.0,
    focalLength: 0.02,
    focusRange: MODES[mode].dof.focusRange,
    bokehScale: MODES[mode].dof.bokehScale,
    resolutionScale: 0.6,
  });
  const bloom = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    mipmapBlur: true,
    luminanceThreshold: MODES[mode].bloom.threshold,
    luminanceSmoothing: MODES[mode].bloom.smoothing,
    intensity: MODES[mode].bloom.intensity,
    kernelSize: KernelSize.LARGE,
    radius: 0.72,
  });
  // CHẶN NaN Ở BƯỚC CỘNG NỞ SÁNG (săn nháy đen 24/9, lần 2): dù ảnh vào đã sạch, chuỗi mip của bộ nở sáng
  // thỉnh thoảng vẫn trả về một ảnh NaN (~1 khung / 100 s; tắt riêng phần cộng nở sáng thì 0 khung / 300 s).
  // Một ảnh nở sáng NaN cộng vào là cả khung NaN → lớp nắn màu kẹp về 0 rồi nâng đáy → xám tối 0,30.
  // Đọc bit số mũ (isnan bị trình dịch D3D lược bỏ): texel hỏng → coi như không có nở sáng ở điểm ấy.
  bloom.setFragmentShader(`#ifdef FRAMEBUFFER_PRECISION_HIGH
uniform mediump sampler2D map;
#else
uniform lowp sampler2D map;
#endif
uniform float intensity;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 b = texture2D(map, uv);
  uvec4 u = floatBitsToUint(b) & uvec4(0x7fffffffu);
  if (any(greaterThanEqual(u, uvec4(0x7f800000u)))) b = vec4(0.0);
  outputColor = clamp(b, vec4(0.0), vec4(6.0e4)) * intensity;
}`);
  // (p11a B2: 連絡 cứ ~20 s quầng loá quanh nét tắt đúng MỘT khung, vùng toà thành tối 7 %) đo được: khung ấy ảnh nở sáng có
  // NaN / Inf trên cả một vùng (thay NaN bằng sáng chói thì khung ấy loé trắng thay vì tối) — lớp cộng nở sáng ở trên coi vùng ấy là
  // "không có loá". Mầm NaN đi vào ở LƯỢT LỌC SÁNG đầu chuỗi nở sáng (đọc ảnh cảnh nửa độ chính xác); hai lớp chặn NaN trước đó
  // lại trộn kiểu NORMAL (ảnh vào × 0 + ảnh chặn — 0 × NaN = NaN, tự đưa NaN trở lại — nay trộn SRC, grade.js). Chặn thêm ngay ở chỗ
  // lượt lọc sáng đọc ảnh: texel hỏng → coi như tối. Đo 連絡 lúc nghỉ: trước 4 lần / 90 s, sau 0 lần / 120 s (kozo-chuong --lh120).
  bloom.luminanceMaterial.fragmentShader = bloom.luminanceMaterial.fragmentShader
    .replace('void main(){', 'vec4 kSan(vec4 c){ uvec4 u = floatBitsToUint(c) & uvec4(0x7fffffffu); return any(greaterThanEqual(u, uvec4(0x7f800000u))) ? vec4(0.0) : c; }\nvoid main(){')
    .replace('vec4 texel=texture2D(inputBuffer,vUv);', 'vec4 texel=kSan(texture2D(inputBuffer,vUv));');
  bloom.luminanceMaterial.needsUpdate = true;
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const grade = new GradeEffect(MODES[mode].grade);
  const chroma = new ChromaticAberrationEffect({
    offset: new Vector2(MODES[mode].chroma, MODES[mode].chroma * 0.6),
    radialModulation: true,      // chỉ ở rìa khung, giữa khung sạch
    modulationOffset: 0.35,
  });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.SOFT_LIGHT, premultiply: true });
  noise.blendMode.opacity.value = MODES[mode].noise;
  const smaa = new SMAAEffect({ preset: SMAAPreset.HIGH, edgeDetectionMode: EdgeDetectionMode.COLOR });

  // nguồn của tia sáng thể tích: nhận từ ngoài, hoặc tự tìm trong cảnh
  let sunMesh = sun;
  if (!sunMesh) scene.traverse((o) => { if (!sunMesh && o.isMesh && (o.name === 'godray-source' || o.userData.godRaySource)) sunMesh = o; });
  let godRays = null;
  if (sunMesh) {
    const g = MODES[mode].godRays;
    godRays = new GodRaysEffect(camera, sunMesh, {
      height: 480, density: g.density, decay: g.decay, weight: g.weight, exposure: g.exposure,
      samples: g.samples, clampMax: 0.96, blendFunction: BlendFunction.SCREEN,
    });
  }

  // ── xếp pass ───────────────────────────────────────────────────────────────
  // Tách chiều sâu trường ảnh và tia sáng ra pass riêng để tắt được trên máy yếu;
  // phần còn lại gộp chung một pass (thư viện tự ghép thành một shader).
  const dofPass = new EffectPass(camera, dof);
  const godPass = godRays ? new EffectPass(camera, godRays) : null;
  const mainPass = new EffectPass(camera, bloom, tone, grade, noise);   // gộp được: thư viện ghép thành một shader
  const chromaPass = new EffectPass(camera, chroma);                    // nhiễu sắc lấy nhiều mẫu nên phải đứng riêng
  const smaaPass = new EffectPass(camera, smaa);                        // khử răng cưa làm sau cùng
  composer.addPass(dofPass);
  if (godPass) composer.addPass(godPass);
  // chặn lần hai ngay trước bộ nở sáng: chiều sâu trường ảnh / tia sáng thể tích cũng có thể đẻ ra một điểm hỏng
  // (săn nháy đen 24/9: sau lần chặn thứ nhất vẫn bắt được 1 khung / 180 s, đúng lúc rê chuột quét cả khung)
  composer.addPass(new EffectPass(camera, new NanGuardEffect()));
  // lớp nét kết cấu ghép SAU chiều sâu trường ảnh (nét mảnh giữ sắc), TRƯỚC nở sáng + nắn màu (cùng một màu với cảnh)
  let ghep = null, ghepPass = null;
  if (ink) {
    ghep = new KetCauGhepEffect(ink.glsl, ink.uniforms);
    ghep.uniforms.get('uNF').value.set(camera.near, camera.far);
    ghepPass = new EffectPass(camera, ghep);
    composer.addPass(ghepPass);
  }
  // PHẦN 3: chuyển cảnh mực loang (trộn ảnh cảnh cũ với ảnh cảnh mới, TRƯỚC loá + nắn màu — hậu kỳ của hai cảnh nội suy
  // trên cùng quãng cuộn) và lớp khung (lớp tối sau chữ, SAU loá). Cả hai TẮT ở màn đầu: hình màn đầu không đổi.
  let chuyenFx = null, chuyenPass = null, khungFx = null, khungPass = null, quetFx = null, quetPass = null, bayFx = null, bayPass = null, shojiFx = null, shojiPass = null, giayFx = null, giayPass = null, duongFx = null, duongPass = null;
  if (chuyen) {
    chuyenFx = new ChuyenEffect();
    chuyenPass = new EffectPass(camera, chuyenFx);
    chuyenPass.enabled = false;
    composer.addPass(chuyenPass);
    // PHẦN 4: chuyển ruộng → mỏ đá bằng nét chổi quét ngang (lượt riêng, tắt ngoài quãng chuyển)
    quetFx = new QuetEffect();
    quetPass = new EffectPass(camera, quetFx);
    quetPass.enabled = false;
    composer.addPass(quetPass);
    // PHẦN 5: chuyển mỏ đá → rừng bằng sương dày theo độ sâu (máy bay liền; chỉ một cảnh vẽ mỗi khung)
    bayFx = new BayEffect();
    bayPass = new EffectPass(camera, bayFx);
    bayPass.enabled = false;
    composer.addPass(bayPass);
    // PHẦN 6c: chuyển rừng → làng giấy bằng cửa giấy lùa 障子 dựng 3D (scene/cua.js vẽ riêng; lượt này đặt lên ảnh cảnh)
    shojiFx = new ShojiEffect();
    shojiPass = new EffectPass(camera, shojiFx);
    shojiPass.enabled = false;
    composer.addPass(shojiPass);
    // PHẦN 8: chuyển làng giấy → 仕事 bằng tờ giấy thành bản vẽ quy hoạch rồi tan thành thung lũng
    giayFx = new GiayEffect();
    giayPass = new EffectPass(camera, giayFx);
    giayPass.enabled = false;
    composer.addPass(giayPass);
    // PHẦN 9: chuyển 仕事 → 連絡 — hai cảnh hoà theo chính nét cọ (vùng đất mới thấm ra từ nét)
    duongFx = new DuongEffect();
    duongPass = new EffectPass(camera, duongFx);
    duongPass.enabled = false;
    composer.addPass(duongPass);
  }
  // sương thung lũng sau chữ màn đầu (khổ dọc) — trước nắn màu; tắt ở khổ ngang và khi đã cuộn khỏi màn đầu
  let suongFx = null, suongPass = null;
  if (chuyen) {
    suongFx = new SuongEffect();
    suongPass = new EffectPass(camera, suongFx);
    suongPass.enabled = false;
    composer.addPass(suongPass);
  }
  composer.addPass(mainPass);
  if (chuyen) {
    khungFx = new KhungEffect();
    khungPass = new EffectPass(camera, khungFx);
    khungPass.enabled = false;
    composer.addPass(khungPass);
  }
  composer.addPass(chromaPass);
  // PHẦN 8 (p9a A2): nét hình vẽ của thẻ 仕事 vẽ SAU lớp tối sau chữ — cùng tầng với chữ, không bị lớp tối dập — và sau tách
  // màu (nét sáng mảnh ở mép phải màn mà qua tách màu thì viền tím/hồng, lạc bảng màu). Vẽ chồng lên ảnh đang có (không xoá);
  // cảnh + máy quay do app.js gán mỗi khung (viec.hudScene); tắt khi không có thẻ mở. Khử răng cưa + làm nét vẫn đi sau.
  let hudPass = null;
  if (chuyen) {
    hudPass = new RenderPass(new Scene(), camera);
    hudPass.clearPass.enabled = false;
    hudPass.ignoreBackground = true;
    hudPass.enabled = false;
    composer.addPass(hudPass);
  }
  // (30/9) MỜ CHUYỂN: ảnh đứng của khung cũ tan trên cảnh mới — sau mọi lớp của cảnh (kể cả lớp tối sau chữ), trước khử răng cưa
  let moFx = null, moPass = null;
  if (chuyen) {
    moFx = new MoEffect();
    moPass = new EffectPass(camera, moFx);
    moPass.enabled = false;
    composer.addPass(moPass);
  }
  composer.addPass(smaaPass);
  // làm nét CAS: lượt cuối (ra màn). cas = 0 → không thêm lượt nào (khử răng cưa là lượt cuối như trước)
  let casFx = null, casPass = null;
  if (cas > 0) { casFx = new CasEffect(cas); casPass = new EffectPass(camera, casFx); composer.addPass(casPass); }

  // ── LƯỢT RA MÀN (p9a B1): thư viện chỉ đánh dấu "vẽ ra màn" cho lượt THÊM VÀO CUỐI lúc dựng chuỗi, và bỏ qua mọi lượt đang
  // tắt. Tắt lượt cuối (nấc 2 tắt làm nét CAS; setQuality < 0,3 tắt khử răng cưa) thì KHÔNG lượt nào vẽ ra màn → màn đứng hình
  // ảnh cũ. Hàm này dời dấu sang lượt BẬT cuối cùng; gọi trước mỗi lần vẽ (rẻ: ~20 lượt, chỉ đổi khi khác) nên bật/tắt ở đâu cũng đúng.
  function syncScreen() {
    const P = composer.passes;
    let last = -1;
    for (let i = P.length - 1; i >= 0; i--) if (P[i].enabled) { last = i; break; }
    for (let i = 0; i < P.length; i++) { const on = i === last; if (P[i].renderToScreen !== on) P[i].renderToScreen = on; }
    return last >= 0 ? P[last] : null;
  }

  // ── đổi chế độ: chuyển mượt, không nhảy khựng (静寂 — không có gì giật) ─────
  let cur = mode, from = mode, to = mode, blend = 1, dur = 0.9, pendingCalib = null;
  function applyBlend(k) {
    const a = MODES[from], b = MODES[to];
    grade.set({
      lift: lerp(a.grade.lift, b.grade.lift, k),
      outHigh: lerp(a.grade.outHigh, b.grade.outHigh, k),
      gamma: lerp(a.grade.gamma, b.grade.gamma, k),
      satK: lerp(a.grade.satK, b.grade.satK, k),
      contrast: lerp(a.grade.contrast, b.grade.contrast, k),
      hue: lerp(a.grade.hue, b.grade.hue, k),
      hueLock: lerp(a.grade.hueLock, b.grade.hueLock, k),
      satFloor: lerp(a.grade.satFloor, b.grade.satFloor, k),
      satCeil: lerp(a.grade.satCeil, b.grade.satCeil, k),
      satScale: lerp(a.grade.satScale, b.grade.satScale, k),
      centerLift: lerp(a.grade.centerLift, b.grade.centerLift, k),
      edgeFade: lerp(a.grade.edgeFade, b.grade.edgeFade, k),
    });
    bloom.intensity = lerp(a.bloom.intensity, b.bloom.intensity, k);
    bloom.luminanceMaterial.threshold = lerp(a.bloom.threshold, b.bloom.threshold, k);
    bloom.luminanceMaterial.smoothing = lerp(a.bloom.smoothing, b.bloom.smoothing, k);
    dof.bokehScale = lerp(a.dof.bokehScale, b.dof.bokehScale, k);
    dof.cocMaterial.focusRange = lerp(a.dof.focusRange, b.dof.focusRange, k);
    const off = lerp(a.chroma, b.chroma, k);
    chroma.offset.set(off, off * 0.6);
    noise.blendMode.opacity.value = lerp(a.noise, b.noise, k);
    if (godRays) {
      const gm = godRays.godRaysMaterial;
      gm.weight = lerp(a.godRays.weight, b.godRays.weight, k);
      gm.exposure = lerp(a.godRays.exposure, b.godRays.exposure, k);
      gm.density = lerp(a.godRays.density, b.godRays.density, k);
    }
  }
  applyBlend(1);

  // ── chất lượng: máy yếu thì bỏ trường ảnh rồi tới tia sáng, giữ nắn màu tới cùng ─
  let q = 1;
  function setQuality(v) {
    q = Math.max(0, Math.min(1, v));
    dofPass.enabled = q >= 0.55;
    if (godPass) godPass.enabled = q >= 0.35;
    dof.resolutionScale = q >= 0.85 ? 0.6 : 0.45;
    bloom.mipmapBlurPass.levels = q >= 0.85 ? 8 : q >= 0.5 ? 6 : 4;
    composer.multisampling = 0;
    smaaPass.enabled = q >= 0.3;
    chromaPass.enabled = q >= 0.25;
  }
  setQuality(quality);

  // ── hiệu chỉnh: tự tìm dải sáng vào để ảnh ra rơi đúng bảng chỉ tiêu ───────
  // Người dựng cảnh chỉ cần gọi post.calibrate() một lần sau khi cảnh dựng xong.
  // Cách làm: vẽ một khung, đọc điểm ảnh thật, suy ngược ra dải sáng của cảnh, rồi đặt lại uInLow/uInHigh.
  function readFrame() {
    syncScreen();
    composer.render(1 / 60);
    const gl = renderer.getContext();
    const w = renderer.domElement.width, h = renderer.domElement.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const V = [], S = [];
    for (let y = 0; y < h; y += 7) for (let x = 0; x < w; x += 7) {
      const i = (y * w + x) * 4;
      const mx = Math.max(buf[i], buf[i + 1], buf[i + 2]) / 255;
      const mn = Math.min(buf[i], buf[i + 1], buf[i + 2]) / 255;
      V.push(mx); S.push(mx === 0 ? 0 : (mx - mn) / mx);
    }
    V.sort((a, b) => a - b); S.sort((a, b) => a - b);
    const at = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
    return { v5: at(V, 0.05), v50: at(V, 0.5), v95: at(V, 0.95), v99: at(V, 0.995), s50: at(S, 0.5), s90: at(S, 0.9) };
  }
  function measure() { return readFrame(); }

  // Hiệu chỉnh: đo dải sáng THẬT của cảnh khi lớp nắn màu đang tắt, rồi đặt dải vào đúng một lần.
  // Làm kiểu lặp trên ảnh đã nắn thì phân kỳ, vì chính phép nắn lại đổi thứ mình đang đo.
  // các bước đo phơi sáng viết thành bộ sinh: mỗi lần đọc khung là một bước. calibrate() chạy liền một mạch như cũ;
  // calibrateAsync(chờ) nhường một khung giữa các bước (bước B 25/9: đo liền 6 lần đọc khung làm màn chờ đứng 0,26 s).
  // Cùng phép tính, cùng kết quả.
  function calibrate(o) { const g = calibrateSteps(o); let r = g.next(); while (!r.done) r = g.next(); return r.value; }
  async function calibrateAsync(wait, o) { const g = calibrateSteps(o); let r = g.next(); while (!r.done) { await wait(); r = g.next(); } return r.value; }
  function* calibrateSteps({ margin = 0.0, rounds = 4, log = false } = {}) {
    const t = MODES[cur].target;
    const keep = {
      inLow: grade.get('uInLow'), inHigh: grade.get('uInHigh'), lift: grade.get('uLift'),
      outHigh: grade.get('uOutHigh'), gamma: grade.get('uGamma'), contrast: grade.get('uContrast'),
      hueLock: grade.get('uHueLock'), satFloor: grade.get('uSatFloor'), satCeil: grade.get('uSatCeil'),
      satK: grade.get('uSatK'), centerLift: grade.get('uCenterFade').x, edgeFade: grade.get('uCenterFade').y,
    };
    // 1) đo dải sáng THẬT của cảnh khi lớp nắn màu đang tắt
    grade.set({ inLow: 0, inHigh: 1, lift: 0, outHigh: 1, gamma: 1, contrast: 1, hueLock: 0, satFloor: 0, satCeil: 1, satK: 60, centerLift: 0, edgeFade: 0 });
    const raw = readFrame();
    yield;
    grade.set(keep);
    // hiMul > 1: đỉnh sáng của cảnh KHÔNG bị kéo lên sát trắng (bản chạng vạng: sương trời phải
    // tối, chỉ đèn trong ô cửa mới được sáng)
    const lo = Math.max(0, raw.v5 - margin), hi = Math.min(1, Math.max(lo + 0.02, ((t.hiPct ? raw.v99 : raw.v95) + margin) * (t.hiMul || 1)));
    // 2) uốn phân bố để trung vị rơi đúng chỗ (đáy và đỉnh đã cố định, chỉ còn cách uốn)
    const x50 = Math.min(0.999, Math.max(0.001, (raw.v50 - lo) / Math.max(1e-4, hi - lo)));
    const want = Math.min(0.999, Math.max(0.001, (t.v50 - keep.lift) / Math.max(1e-4, keep.outHigh - keep.lift)));
    // Uốn phân bố có giới hạn hẹp (bản không khí 24/9): uốn tới 4 như bản cũ thì mọi vùng tối bị
    // nén thành một mảng mực đặc — tán rừng, đá, ngói cùng hoá bóng đen.
    const gLo = t.gammaLo ?? 0.3, gHi = t.gammaHi ?? 4;
    const gamma = Math.min(gHi, Math.max(gLo, Math.log(want) / Math.log(x50)));
    grade.set({ inLow: lo, inHigh: hi, gamma });
    // 3) chỉnh trần bão hoà cho tới khi trung vị bão hoà khớp mốc
    let ceil = keep.satCeil, m = readFrame();
    yield;
    for (let i = 0; i < rounds; i++) {
      if (!m.s50 || Math.abs(m.s50 - t.s50) < 0.006) break;
      ceil = Math.min(0.6, Math.max(0.02, ceil * (t.s50 / Math.max(0.004, m.s50))));
      grade.set({ satCeil: ceil });
      m = readFrame();
      yield;
      if (log) console.log(`vòng ${i + 1}: bão hoà trung vị ${m.s50.toFixed(3)} · trần ${ceil.toFixed(3)}`);
    }
    return { raw, inLow: lo, inHigh: hi, gamma, satCeil: ceil, after: m };
  }

  // đích lấy nét của trường ảnh: bám theo điểm camera đang nhìn (mặc định là gốc toạ độ)
  // Điểm cần lấy nét, toạ độ thế giới — người dựng cảnh chỉ việc đặt lại toạ độ của nó.
  // KHÔNG có thông số hậu kỳ nào bám dính con trỏ. Kể cả khi lớp cảnh gán thẳng toạ độ chuột vào
  // focusTarget mỗi khung, điểm lấy nét thật vẫn đuổi theo sau qua một tầng làm trễ (hằng số 0,45 giây
  // ≈ hệ số 0,036 mỗi khung ở 60 hình/giây, dưới mức 0,05 mà lớp cảnh đang dùng).
  const focusTarget = new Vector3(0, 1.2, 0);   // đích: ai cũng gán được
  const focusNow = focusTarget.clone();          // thật: luôn chạy sau
  const FOCUS_TAU = 0.45;
  dof.target = focusNow;

  return {
    composer, grade, bloom, dof, godRays, chroma, noise, smaa, ghep,
    renderPass, dofPass, godPass, mainPass, chuyenFx, chuyenPass, khungFx, khungPass, quetFx, quetPass, bayFx, bayPass, shojiFx, shojiPass, giayFx, giayPass, duongFx, duongPass, moFx, moPass, casFx, casPass, suongFx, suongPass,
    get ghepPass() { return ghepPass; },
    chromaPass,   // (B6: nấc 2 trở đi tắt tách màu)
    smaaPass,     // (p9a B1: nấc 2 tắt làm nét → khử răng cưa thành lượt ra màn)
    hudPass,      // (p9a A2: nét thẻ 仕事 vẽ sau lớp tối)
    focusTarget, focusNow,
    get mode() { return cur; },
    get quality() { return q; },
    setMode(m, { seconds = 0.9 } = {}) {
      if (!MODES[m] || m === to) return;
      from = cur; to = m; blend = 0; dur = Math.max(0.001, seconds); cur = m;
      pendingCalib = true;
    },
    setQuality,
    syncScreen,
    calibrateAsync,
    calibrate,
    measure,
    resize() { composer.setSize(renderer.domElement.clientWidth || window.innerWidth, renderer.domElement.clientHeight || window.innerHeight); },
    render(dt = 1 / 60) {
      if (blend < 1) {
        blend = Math.min(1, blend + dt / dur); applyBlend(blend * blend * (3 - 2 * blend));
        if (blend >= 1 && pendingCalib) { pendingCalib = null; calibrate(); }
      }
      // lấy nét: đích có thể nhảy tuỳ ý, điểm nét thật luôn đi sau — không thứ gì trong hậu kỳ giật theo chuột
      focusNow.lerp(focusTarget, 1 - Math.exp(-dt / FOCUS_TAU));
      syncScreen();
      composer.render(dt);
    },
    dispose() { composer.dispose(); },
  };
}
