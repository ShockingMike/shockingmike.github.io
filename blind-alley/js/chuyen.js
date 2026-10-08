import * as THREE from 'three';
import { COMMON } from './npr.js';

const V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const N_DAI = 32, N_CAT = 4;
const KC = 0.16;
const F_MANH = `
${COMMON}
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uC;
uniform float uXoa;
uniform vec2 uRes;
uniform float uK, uGoc, uDpr;
uniform vec2 uGoc0;
uniform float uCat[${N_DAI}];
uniform float uTre[${N_DAI}];
uniform float uLanMin;
uniform float uChiNut, uNutA;
uniform float uNhoe, uNM;
uniform vec2 uNhoeS;
const vec3 P_HONG = vec3(255.0, 58.0, 134.0) / 255.0, P_GIAY = vec3(243.0, 220.0, 214.0) / 255.0;
const float KC = ${KC.toFixed(3)}, DUR = 0.55;
float eio(float e) { return e * e * (1.25 - 0.25 * e); }
vec3 anh(vec2 qq) {
  vec2 uv = clamp(qq, vec2(0.5), uRes - 0.5) / uRes;
  float tr = step(0.0001, uXoa) * step(hash13(vec3(floor(qq / max(1.0, 2.0 * uDpr)), 3.0)), uXoa);
  return mix(texture2D(uA, uv).rgb, texture2D(uC, uv).rgb, tr);
}
void main() {
  vec2 p = vUv * uRes;
  vec2 d = vec2(cos(uGoc), sin(uGoc)), n = vec2(-d.y, d.x);
  float v = dot(p, n), u = dot(p, d);
  int i = 0;
  for (int k = 0; k < ${N_DAI} - 1; k++) { if (v >= uCat[k + 1]) i = k + 1; }
  float va = uCat[i], vb = (i < ${N_DAI} - 1 ? uCat[i + 1] : 1e6), vc = (va + vb) * 0.5;
  float fi = float(i);
  float u0 = min(min(0.0, uRes.x * d.x), min(uRes.y * d.y, uRes.x * d.x + uRes.y * d.y));
  float u1 = max(max(0.0, uRes.x * d.x), max(uRes.y * d.y, uRes.x * d.x + uRes.y * d.y));
  float L = (u1 - u0) + 40.0 * uDpr;
  float cu[${N_CAT + 1}], sl[${N_CAT + 1}];
  cu[0] = -1e9; sl[0] = 0.0; cu[${N_CAT}] = 1e9; sl[${N_CAT}] = 0.0;
  for (int j = 1; j < ${N_CAT}; j++) {
    float fj = float(j), h1 = hash13(vec3(fi, fj, 3.1)), h2 = hash13(vec3(fi, fj, 7.7));
    cu[j] = u0 + (u1 - u0) * (fj + (h1 - 0.5) * 0.55) / float(${N_CAT});
    sl[j] = (h2 > 0.5 ? 1.0 : -1.0) / tan(radians(25.0 + 15.0 * hash13(vec3(fi, fj, 9.3))));
  }
  float cr = smoothstep(KC * 0.55, KC, uK);
  int jj = -1; float off = 0.0, eJ = 0.0;
  for (int j = 0; j < ${N_CAT}; j++) {
    float tre = KC + uTre[i] + float(${N_CAT} - 1 - j) * 0.03;
    float e = clamp((uK - tre) / DUR, 0.0, 1.0);
    float o = eio(e) * L;
    float uq = u - o;
    float ca = cu[j] + sl[j] * (v - vc), cb = cu[j + 1] + sl[j + 1] * (v - vc);
    if (jj < 0 && uq >= ca && uq < cb) { jj = j; off = o; eJ = e; }
  }
  if (jj < 0) discard;
  vec2 q = p - d * off;
  if (q.x < 0.0 || q.y < 0.0 || q.x >= uRes.x || q.y >= uRes.y) discard;
  float fj2 = float(jj);
  vec2 lech = (vec2(hash13(vec3(fi, fj2, 1.3)), hash13(vec3(fi, fj2, 5.9))) - 0.5) * 2.0 * (4.0 + 6.0 * hash13(vec3(fi, fj2, 8.2))) * uDpr * cr;
  float uq = u - off;
  float ca = cu[jj] + sl[jj] * (v - vc), cb = cu[jj + 1] + sl[jj + 1] * (v - vc);
  float bien = min(min(v - va, vb - v), min((uq - ca) / sqrt(1.0 + sl[jj] * sl[jj]), (cb - uq) / sqrt(1.0 + sl[jj + 1] * sl[jj + 1])));
  float h = hash13(vec3(floor(p / (1.5 * uDpr)), 7.0));
  float dang = sin(3.14159 * eJ);
  float lan = max(pow(clamp(uK / KC, 0.0, 1.0), 1.5) * length(uRes) * 1.05, uLanMin);
  bool nut = eJ <= 0.0 && distance(q, uGoc0) < lan && bien < 0.9 * uDpr;
  if (nut && h < 0.92 * uNutA) { bool chinh = mod(fi, 3.0) < 0.5 && min(v - va, vb - v) < 0.9 * uDpr; gl_FragColor = vec4(chinh ? P_HONG : P_GIAY, 1.0); return; }
  if (uChiNut > 0.5) discard;
  if (dang > 0.02 && bien < 1.4 * uDpr && h < dang * 1.2) { gl_FragColor = vec4(P_HONG, 1.0); return; }
  float vtoc = L * (2.5 * eJ - 0.75 * eJ * eJ) / (DUR * 75.0);
  float dong = step(0.001, eJ) * step(eJ, 0.999), hj = hash13(vec3(floor(p / uDpr), 13.0 + floor(uK * 75.0)));
  float tocDo = (2.5 * eJ - 0.75 * eJ * eJ) / 1.75, ram = smoothstep(uNhoeS.x, uNhoeS.y, tocDo);
  if (ram <= 0.0 || uNM < 1.5) {
    gl_FragColor = vec4(anh(q + lech - d * (hj - 0.5) * vtoc * 0.8 * dong), 1.0); return;
  }
  float span = vtoc * mix(0.8, uNhoe, ram) * dong;
  vec3 s = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uNM) break;
    float f = hash13(vec3(floor(p / uDpr), 31.0 + 7.0 * float(i) + floor(uK * 75.0))) - 0.5;
    s += anh(q + lech - d * f * span);
  }
  gl_FragColor = vec4(s / uNM, 1.0);
}`;
const F_TAN = `
${COMMON}
varying vec2 vUv;
uniform sampler2D uA; uniform vec2 uRes; uniform float uK, uDpr;
void main() {
  vec2 cell = floor(vUv * uRes / max(1.0, 2.0 * uDpr));
  float h = hash13(vec3(cell, 3.0));
  if (h < uK) discard;
  gl_FragColor = vec4(texture2D(uA, vUv).rgb, 1.0);
}`;

const F_MAT = `
${COMMON}
varying vec2 vUv;
uniform vec2 uRes; uniform float uDpr; uniform vec2 uQ[4];
void main() {
  vec2 p = vUv * uRes;
  float s = sign((uQ[1].x - uQ[0].x) * (uQ[2].y - uQ[0].y) - (uQ[1].y - uQ[0].y) * (uQ[2].x - uQ[0].x));
  float d = -1e9;
  for (int i = 0; i < 4; i++) {
    vec2 a = uQ[i], b = uQ[i == 3 ? 0 : i + 1], e = normalize(b - a);
    d = max(d, -s * (e.x * (p.y - a.y) - e.y * (p.x - a.x)));
  }
  float B = 7.0 * uDpr;
  if (d <= 0.0) discard;
  float h = hash13(vec3(floor(p / max(1.0, 1.5 * uDpr)), 11.0));
  if (d < B && h > d / B) discard;
  gl_FragColor = vec4(P_MUC, 1.0);
}`;

const F_TRUOT = `
varying vec2 vUv;
uniform sampler2D uA, uB, uC; uniform vec2 uRes; uniform float uO, uBar, uDpr, uMo, uXoa, uN;
const vec3 P_MUC = vec3(23.0, 19.0, 26.0) / 255.0, P_DEM = vec3(35.0, 42.0, 98.0) / 255.0;
vec3 mau(float px, float py) {
  vec3 c = P_MUC;
  float yA = py - uO;
  float yB = yA + uBar;
  if (yA >= 0.0) { vec2 q = vec2(px / uRes.x, min(yA, uRes.y - 0.5) / uRes.y); c = mix(texture2D(uA, q).rgb, texture2D(uC, q).rgb, uXoa); }
  else if (yB >= 0.0) {
    float s = 120.0 * uDpr, x = mod(px - 30.0 * uDpr, s), y = yB - uBar * 0.5;
    vec2 d = abs(vec2(x - 22.0 * uDpr, y)) - vec2(22.0, 14.0) * uDpr + 7.0 * uDpr;
    if (length(max(d, 0.0)) - 7.0 * uDpr < 0.0) c = P_DEM;
  } else c = texture2D(uB, vec2(px / uRes.x, max(yB + uRes.y, 0.5) / uRes.y)).rgb;
  return c;
}
void main() {
  vec2 p = vUv * uRes;
  if (uMo < 1.0) { gl_FragColor = vec4(mau(p.x, p.y), 1.0); return; }
  vec3 s = vec3(0.0); float w = 0.0;
  for (int i = 0; i < 32; i++) { if (float(i) >= uN) break; float f = (float(i) + 0.5) / uN - 0.5, g = 1.0 - abs(f) * 1.6; s += mau(p.x, p.y + uMo * f) * g; w += g; }
  gl_FragColor = vec4(s / w, 1.0);
}`;
const F_ZOOM = `
varying vec2 vUv;
uniform sampler2D uA; uniform vec2 uRes, uF; uniform float uK, uN;
void main() {
  vec2 p = vUv * uRes; vec3 s = vec3(0.0); float w = 0.0;
  for (int i = 0; i < 32; i++) {
    if (float(i) >= uN) break;
    float f = (float(i) + 0.5) / uN, g = 1.0 - f * 0.8;
    vec2 q = uF + (p - uF) * (1.0 - uK * f);
    s += texture2D(uA, q / uRes).rgb * g; w += g;
  }
  gl_FragColor = vec4(s / w, 1.0);
}`;
export function makeChuyen(renderer) {
  const rt = { a: null };
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uM = { uA: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uK: { value: 0 }, uGoc: { value: 0 }, uDpr: { value: 1 },
    uCat: { value: new Array(N_DAI).fill(0) }, uTre: { value: new Array(N_DAI).fill(0) }, uGoc0: { value: new THREE.Vector2() },
    uLanMin: { value: 0 }, uChiNut: { value: 0 }, uNutA: { value: 1 }, uNhoe: { value: 0 }, uNM: { value: 0 }, uNhoeS: { value: new THREE.Vector2(0, 1) }, uC: { value: null }, uXoa: { value: 0 } };
  const mManh = new THREE.ShaderMaterial({ uniforms: uM, vertexShader: V, fragmentShader: F_MANH, depthTest: false, depthWrite: false });
  const uT = { uA: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uK: { value: 0 }, uDpr: { value: 1 } };
  const mTan = new THREE.ShaderMaterial({ uniforms: uT, vertexShader: V, fragmentShader: F_TAN, depthTest: false, depthWrite: false });
  const uQ = { uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uQ: { value: [0, 1, 2, 3].map(() => new THREE.Vector2()) } };
  const mMat = new THREE.ShaderMaterial({ uniforms: uQ, vertexShader: V, fragmentShader: F_MAT, depthTest: false, depthWrite: false });
  const scQ = new THREE.Scene(); { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mMat); q.frustumCulled = false; scQ.add(q); }
  const uR = { uA: { value: null }, uB: { value: null }, uC: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uO: { value: 0 }, uBar: { value: 56 }, uDpr: { value: 1 }, uMo: { value: 0 }, uXoa: { value: 0 }, uN: { value: 32 } };
  const mTruot = new THREE.ShaderMaterial({ uniforms: uR, vertexShader: V, fragmentShader: F_TRUOT, depthTest: false, depthWrite: false });
  const uZ = { uA: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uF: { value: new THREE.Vector2() }, uK: { value: 0 }, uN: { value: 24 } };
  const mZoom = new THREE.ShaderMaterial({ uniforms: uZ, vertexShader: V, fragmentShader: F_ZOOM, depthTest: false, depthWrite: false });
  const scZ = new THREE.Scene(); { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mZoom); q.frustumCulled = false; scZ.add(q); }
  const scR = new THREE.Scene(); { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mTruot); q.frustumCulled = false; scR.add(q); }
  const scM = new THREE.Scene(), scT = new THREE.Scene();
  const q1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mManh); q1.frustumCulled = false; scM.add(q1);
  const q2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mTan); q2.frustumCulled = false; scT.add(q2);
  function khung(W, H) {
    if (!rt.a || rt.a.width !== W || rt.a.height !== H) { rt.a && rt.a.dispose(); rt.a = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true }); }
    uM.uA.value = rt.a.texture; uT.uA.value = rt.a.texture; uR.uA.value = rt.a.texture;
    return rt.a;
  }
  function datDai(W, H, gocNan, dpr) {
    void gocNan;
    const goc = Math.PI + THREE.MathUtils.degToRad(62);
    const d = [Math.cos(goc), Math.sin(goc)], n = [-d[1], d[0]];
    const vs = [0, W * n[0], H * n[1], W * n[0] + H * n[1]];
    const v0 = Math.min(...vs) - 2, v1 = Math.max(...vs) + 2;
    let s = 977; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const cat = [v0]; while (cat.length < N_DAI && cat[cat.length - 1] < v1) cat.push(cat[cat.length - 1] + (125 + 110 * rnd()) * dpr);
    const nThat = cat.length;
    while (cat.length < N_DAI) cat.push(1e7 + cat.length);
    const tre = cat.map((c, i) => (i < nThat ? 0.2 * Math.min(1, Math.max(0, (c - v0) / Math.max(1, v1 - v0))) + (rnd() - 0.5) * 0.06 : 0)).map((x) => Math.min(0.2, Math.max(0, x)));
    uM.uCat.value = cat; uM.uTre.value = tre; uM.uGoc.value = goc; uM.uRes.value.set(W, H); uM.uDpr.value = dpr;
    uM.uGoc0.value.set(W * 0.4, H * 0.45);
    uT.uRes.value.set(W, H); uT.uDpr.value = dpr;
  }
  const veLen = (sc) => { const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(sc, cam); renderer.autoClear = ac; };
  return {
    khung, datDai,
    manh(k, nhoe = 0, n = 0, s0 = 0, s1 = 1, xoa = 0) { uM.uK.value = k; uM.uNhoe.value = nhoe; uM.uNM.value = n; uM.uNhoeS.value.set(s0, s1);
      const tC = rt.c || rt.a; uM.uXoa.value = rt.c ? xoa : 0; uM.uC.value = tC ? tC.texture : null; veLen(scM); },
    nut(r, a = 1) { const k0 = uM.uK.value, l0 = uM.uLanMin.value; uM.uK.value = 0; uM.uLanMin.value = r; uM.uChiNut.value = 1; uM.uNutA.value = a;
      veLen(scM); uM.uK.value = k0; uM.uLanMin.value = l0; uM.uChiNut.value = 0; uM.uNutA.value = 1; },
    datLanMin(r) { uM.uLanMin.value = r; },
    tan(k) { uT.uK.value = k; veLen(scT); },
    truot(e, texB, W, H, dpr, mo = 0, xoa = 0, n = 32) { uR.uN.value = n; const bar = Math.round(56 * dpr); uR.uB.value = texB; uR.uC.value = (rt.c || rt.a).texture; uR.uXoa.value = rt.c ? xoa : 0; uR.uRes.value.set(W, H); uR.uBar.value = bar; uR.uDpr.value = dpr; uR.uO.value = e * (H + bar); uR.uMo.value = mo * (H + bar); veLen(scR); },
    zoom(tex, W, H, fx, fy, k, n = 24) { uZ.uA.value = tex; uZ.uRes.value.set(W, H); uZ.uF.value.set(fx, fy); uZ.uK.value = k; uZ.uN.value = n; veLen(scZ); },
    khungC(W, H) { if (!rt.c || rt.c.width !== W || rt.c.height !== H) { rt.c && rt.c.dispose(); rt.c = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true }); } return rt.c; },
    khungB(W, H) { if (!rt.b || rt.b.width !== W || rt.b.height !== H) { rt.b && rt.b.dispose(); rt.b = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true }); } return rt.b; },
    mat(q, m, W, H, dpr) {
      const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4, cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
      uQ.uRes.value.set(W, H); uQ.uDpr.value = dpr;
      for (let i = 0; i < 4; i++) uQ.uQ.value[i].set((cx + (q[i].x - cx) * m) * dpr, H - (cy + (q[i].y - cy) * m) * dpr);
      veLen(scQ);
    },
    sc: [scM, scT, scQ, scR, scZ], cam,
  };
}
