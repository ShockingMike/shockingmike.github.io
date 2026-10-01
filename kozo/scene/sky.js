// Bầu trời và mây vờn chân thành — màu lấy từ bản không khí đang chọn (scene/look.js).
// Bản cũ khoá mọi thứ vào dải lam 215–225°: đúng màu của băng. Giờ mỗi bản một bảng màu.
import * as THREE from 'three';
import { INTRO } from './intro.js';

const SKY_VERT = `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Trời không được là một dải màu trơn: thêm một lớp mây tầng rất nhạt (vệt ngang, trôi không
// thấy được bằng mắt) để trời có "chất" như giấy, như sương — không phải nền web.
const SKY_FRAG = `
uniform vec3 uTop, uMid, uHorizon, uGlow, uSunDir;
uniform float uGlowK, uCloudK, uGlowY, uGlowW;
uniform float uFlat;      // màn mở: 1 = trời màu phẳng (sương), 0 = trời thật
uniform vec3 uMistC;
varying vec3 vDir;
float h21(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.02 + 3.7; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.16, h));
  col = mix(col, uTop, smoothstep(0.12, 0.55, h));
  // quầng sáng về phía mặt trời, sát chân trời
  vec3 sd = normalize(uSunDir);
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(sd.x, 0.0, sd.z) + 1e-5)), 0.0);
  float band = exp(-pow((d.y - uGlowY) * uGlowW, 2.0));
  col = mix(col, uGlow, uGlowK * band * pow(az, 2.2));
  col = mix(col, uGlow, uGlowK * 0.6 * pow(max(dot(d, sd), 0.0), 18.0));
  // mây tầng: vệt dài nằm ngang
  vec2 uv = vec2(atan(d.x, d.z) * 3.2, d.y * 26.0);
  float c = fbm(uv * vec2(1.0, 1.0)) * 0.65 + fbm(uv * vec2(3.1, 2.2) + 9.0) * 0.35;
  float cm = smoothstep(0.42, 0.78, c) * smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.35, 0.8, h));
  col = mix(col, mix(uMid, uGlow, 0.5), cm * uCloudK);
  col = mix(col, uHorizon, smoothstep(0.0, -0.12, d.y));
  col = mix(col, uMistC, uFlat);
  gl_FragColor = vec4(col, 1.0);
}`;

// PHẦN 3: cùng shader trời cho thung lũng đêm (cùng mã nguồn → dùng lại chương trình đã dịch, không dịch thêm)
export function skyMaterial(look, sunDir) {
  const S = look.sky;
  const uniforms = {
    uTop: { value: new THREE.Color(S.top) },
    uMid: { value: new THREE.Color(S.mid) },
    uHorizon: { value: new THREE.Color(S.horizon) },
    uGlow: { value: new THREE.Color(S.glow) },
    uGlowK: { value: S.glowK },
    uCloudK: { value: S.cloudK },
    uGlowY: { value: S.glowY ?? 0.03 },
    uGlowW: { value: S.glowW ?? 5.5 },
    uSunDir: { value: (S.glowDir ? new THREE.Vector3().fromArray(S.glowDir) : sunDir.clone()).normalize() },
    uFlat: INTRO.uFlat,
    uMistC: INTRO.uMistC,
  };
  return new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
}

export async function buildSky(renderer, scene, sunDir, look) {
  const S = look.sky;
  const uniforms = {
    uTop: { value: new THREE.Color(S.top) },
    uMid: { value: new THREE.Color(S.mid) },
    uHorizon: { value: new THREE.Color(S.horizon) },
    uGlow: { value: new THREE.Color(S.glow) },
    uGlowK: { value: S.glowK },
    uCloudK: { value: S.cloudK },
    uGlowY: { value: S.glowY ?? 0.03 },
    uGlowW: { value: S.glowW ?? 5.5 },
    uSunDir: { value: (S.glowDir ? new THREE.Vector3().fromArray(S.glowDir) : sunDir.clone()).normalize() },
    uFlat: INTRO.uFlat,
    uMistC: INTRO.uMistC,
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 28), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  // (bỏ compileEquirectangularShader: ảnh môi trường dựng bằng fromScene, không dùng bộ đổi ảnh toàn cảnh — đỡ một
  // chương trình shader dịch đồng bộ lúc nạp, 25/9)
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 20), mat.clone());
  envScene.add(envSky);
  // DỊCH TRƯỚC, KHÔNG CHẶN (bước B 25/9): ba shader của bộ dựng ảnh môi trường (trời, làm nhoè, lọc GGX) vốn dịch đồng bộ
  // ở lần vẽ đầu → màn chờ đứng hình ~0,55 s. Tạo sẵn vật liệu của nó rồi dịch song song, xong mới dựng (hình không đổi).
  const T = buildSky.T = [];
  let tt = performance.now();
  const mark = (l) => { const n = performance.now(); T.push(l + ' ' + Math.round(n - tt)); tt = n; };
  try {
    pmrem._setSize(256);
    const tmp = pmrem._allocateTargets();
    mark('cap-phat');
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    const pre = new THREE.Scene();
    for (const m of [pmrem._blurMaterial, pmrem._ggxMaterial]) if (m) pre.add(new THREE.Mesh(new THREE.BufferGeometry(), m));
    const wait = [renderer.compileAsync(pre, new THREE.OrthographicCamera()), renderer.compileAsync(envScene, new THREE.PerspectiveCamera(90, 1, 0.1, 100))];
    renderer.setRenderTarget(prev);
    mark('goi-dich');
    await Promise.all(wait);
    mark('cho-dich');
    tmp.dispose(); rt.dispose();
  } catch (e) { /* bản three khác: bỏ qua bước dịch trước, vẫn dựng như cũ */ }
  const tEnv = performance.now();
  // DỰNG TỪNG CHẶNG (bước B 25/9): đúng các bước của pmrem.fromScene(envScene, 0.04), cùng thứ tự — chỉ nhường một khung
  // giữa các chặng (vẽ khối lập phương · làm nhoè · lọc GGX từng tầng), để màn chờ không đứng hình ~0,4 s một lèo.
  let env;
  const nhuong = () => new Promise((r) => requestAnimationFrame(() => r()));
  try {
    const prevT = renderer.getRenderTarget(), prevXr = renderer.xr.enabled;
    renderer.xr.enabled = false;
    pmrem._setSize(256);
    const target = pmrem._allocateTargets();
    target.depthBuffer = true;
    pmrem._sceneToCubeUV(envScene, 0.1, 100, target, new THREE.Vector3());
    mark('lap-phuong');
    await nhuong();
    tt = performance.now();
    pmrem._blur(target, 0, 0, 0.04);
    mark('nhoe');
    await nhuong();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    for (let i = 1; i < pmrem._lodMeshes.length; i++) { tt = performance.now(); pmrem._applyGGXFilter(target, i - 1, i); mark('ggx' + i); if (i % 2 === 0) { renderer.autoClear = autoClear; await nhuong(); renderer.autoClear = false; } }
    renderer.autoClear = autoClear;
    renderer.setRenderTarget(prevT);
    renderer.xr.enabled = prevXr;
    target.scissorTest = false;
    target.viewport.set(0, 0, target.width, target.height);
    target.scissor.set(0, 0, target.width, target.height);
    env = target.texture;
  } catch (e) {
    env = pmrem.fromScene(envScene, 0.04).texture;   // bản three khác: dựng một lèo như cũ
  }
  buildSky.envMs = Math.round(performance.now() - tEnv);
  pmrem.dispose();
  envSky.geometry.dispose();
  scene.environment = env;
  return { sky, env, uniforms };
}

// ---------- kết cấu một làn sương: vệt dài, mép tơi — không phải cục bông tròn ----------
function wispTexture() {
  const W = 512, H = 128, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });   // vẽ bằng CPU: trên GPU, lần vẽ đầu phải dịch shader vẽ canvas (~7 s trên Windows, đo 25/9)
  let seed = 9;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) {
    const x = W * (0.12 + rnd() * 0.76), y = H * (0.35 + rnd() * 0.35);
    const rx = W * (0.05 + rnd() * 0.16), ry = H * (0.06 + rnd() * 0.14);
    g.save();
    g.translate(x, y);
    g.scale(rx / ry, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    gr.addColorStop(0, 'rgba(255,255,255,0.12)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.04)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, ry, 0, 7); g.fill();
    g.restore();
  }
  g.globalCompositeOperation = 'destination-in';
  const v = g.createLinearGradient(0, 0, W, 0);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.2, 'rgba(0,0,0,1)');
  v.addColorStop(0.8, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const v2 = g.createLinearGradient(0, 0, 0, H);
  v2.addColorStop(0, 'rgba(0,0,0,0)'); v2.addColorStop(0.35, 'rgba(0,0,0,1)');
  v2.addColorStop(0.7, 'rgba(0,0,0,1)'); v2.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v2; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- 雲 sương vờn sườn: làn dài nằm ngang ôm quanh chân mỏm đá và lưng rừng ----------
export function buildUnkai(scene, rng, avoid, look) {
  const tex = wispTexture();
  const group = new THREE.Group();
  group.name = 'unkai';
  scene.add(group);
  const mats = [
    [look.sea.high, 0.34], [look.sea.high, 0.24], [look.sea.low, 0.30], [look.sea.shade, 0.20],
  ].map(([c, o]) => new THREE.SpriteMaterial({
    map: tex, color: new THREE.Color(c), transparent: true, opacity: o,
    depthWrite: false, fog: true, sizeAttenuation: true,
  }));
  const puffs = [];
  function puff(r, yLo, yHi, sLo, sHi) {
    const s = sLo + rng() * (sHi - sLo);
    let x = 0, z = 0, y0 = 0, ok = false;
    for (let k = 0; k < 30 && !ok; k++) {
      const a = rng() * Math.PI * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      y0 = yLo + rng() * (yHi - yLo);
      const flat = Math.hypot(x - avoid.x, z - avoid.z);
      const d = Math.hypot(flat, y0 - (avoid.y || 0));
      ok = flat > avoid.r && s / d < 0.9;
    }
    if (!ok) return;
    const sp = new THREE.Sprite(mats[Math.floor(rng() * mats.length)]);
    sp.scale.set(s, s * (0.16 + rng() * 0.10), 1);
    sp.position.set(x, y0, z);
    group.add(sp);
    puffs.push({ sp, y0, ph: rng() * 6.283, sw: 0.6 + rng() * 0.8 });
  }
  // làn sương sát chân mỏm đá và lưng rừng gần — mỏng, dài, bám theo độ cao
  // (không còn làn sát chân thành: sprite cắt vào sườn đồi thành đường thẳng)
  for (let i = 0; i < 70; i++) puff(150 + rng() * 120, -12, 2, 60, 150);
  for (let i = 0; i < 60; i++) puff(220 + rng() * 380, -6, 18, 140, 320);
  return {
    group, mats,
    update(t) {
      group.rotation.y = t * 0.0035;
      for (const p of puffs) p.sp.position.y = p.y0 + Math.sin(t * 0.05 * p.sw + p.ph) * 1.2;
    },
  };
}
