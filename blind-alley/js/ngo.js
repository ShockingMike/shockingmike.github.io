import * as THREE from 'three';
import { COMMON } from './npr.js';
import { KHUNG } from './khung.js';

export const PAL = `
const vec3 K_MUC = vec3(23.,19.,26.)/255., K_DEM = vec3(35.,42.,98.)/255., K_SANG = vec3(52.,57.,154.)/255., K_DO = vec3(255.,31.,79.)/255.,
  K_HONG = vec3(255.,58.,134.)/255., K_GIAY = vec3(243.,220.,214.)/255., K_DOCHIM = vec3(96.,36.,67.)/255.;`;

export const NGO = { rong: 2.6, dai: 15, cao: 9, cua: { x: 0.25, w: 1.05, h: 2.15 }, ham: { x: -0.85, w: 0.7, h: 0.42 }, den: [0.25, 2.75, -14.86] };
const f3 = (v) => v.toFixed(3);
const CX = f3(NGO.cua.x), CW2 = f3(NGO.cua.w / 2), CH = f3(NGO.cua.h);
export const moCua = (f) => Math.min(0.86, Math.max(0.3, 0.3 + 0.029 * (f - (KHUNG - 19))));
const BUOC = 0.085;
export function nguoiAt(f, cam) {
  const mo = moCua(f), gapW = NGO.cua.w * mo, gapC = NGO.cua.x + NGO.cua.w / 2 - gapW / 2;
  const z = -NGO.dai + 0.62 + (KHUNG - Math.min(f, KHUNG)) * BUOC;
  const t = (z - cam[2]) / (-NGO.dai - cam[2]);
  const x = cam[0] + (gapC - cam[0]) * t + 0.03 * (KHUNG - f) * 0.1;
  return { x, z, pha: ((f - KHUNG) / 12) * Math.PI * 2 + Math.PI / 2 };
}

export const MAY_NGO = { pos: [0.05, 1.45, -6.9], nhin: [0.18, 0.92, -NGO.dai], fov: 30 };
export function anhDiem(p, aspect = 22 / 16) {
  const cam = new THREE.PerspectiveCamera(MAY_NGO.fov, aspect, 0.05, 60);
  cam.position.set(...MAY_NGO.pos); cam.lookAt(...MAY_NGO.nhin); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(cam); return [v.x * 0.5 + 0.5, v.y * 0.5 + 0.5];
}
export const kheCua = (f) => { const gapW = NGO.cua.w * moCua(f); return { c: NGO.cua.x + NGO.cua.w / 2 - gapW / 2, w: gapW }; };

const VERT = `
varying vec3 vW;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

const RA = `
uniform float uLevelOut;
vec4 ra(float x, float r1, float r3, float r4) {
  float sang = clamp(x, 0.0, 4.0) / 4.0;
  if (uLevelOut > 0.5) return vec4(vec3(sang), 1.0);
  float xx = sang * 4.0; float lo = floor(xx); float b = lo + rutTham(xx - lo, r1, 0.55);
  float tr = b / 4.0 + (r3 + r4 - 1.0) * 0.03; return vec4(vec3(tr), 1.0);
}`;

const FRAG = `
${COMMON}
${RA}
varying vec3 vW;
uniform float uMat;
uniform vec3 uDen;
uniform float uCell, uMua, uMo, uSeed, uHasRefl;
uniform sampler2D uRefl; uniform vec2 uRes;
uniform sampler2D uBongT; uniform mat4 uBongVP; uniform float uCoBong;
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash13(vec3(i, 1.0)), b = hash13(vec3(i + vec2(1, 0), 1.0)), c = hash13(vec3(i + vec2(0, 1), 1.0)), d = hash13(vec3(i + vec2(1, 1), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float bongNguoi(vec3 P) {
  if (uCoBong < 0.5) return 0.0;
  vec4 q = uBongVP * vec4(P, 1.0); q.xyz /= q.w; vec3 u = q.xyz * 0.5 + 0.5;
  if (u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0 || u.z > 1.0) return 0.0;
  return step(texture2D(uBongT, u.xy).r + 0.0015, u.z);
}
void main() {
  vec3 P = vW;
  float cs = uCell * max(length(P - cameraPosition), 0.5);
  vec3 cel = floor(P / cs);
  float r1 = hash13(cel), r3 = hash13(cel + 41.7), r4 = hash13(cel + 73.1);
  float gapW = ${CW2} * 2.0 * uMo;
  float gapC = ${CX} + ${CW2} - gapW * 0.5;
  float x = 0.0, dac = 0.0, vuaM = 0.0;
  if (uMat < 0.5) {
    vec2 g = P.xz * vec2(1.0 / 0.16, 1.0 / 0.11);
    g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5;
    vec2 f = fract(g) - 0.5;
    float khe = step(0.43, max(abs(f.x), abs(f.y) * 1.08));
    float d = P.z + ${NGO.dai.toFixed(2)};
    float halfW = gapW * 0.5 + d * 0.42 * (0.35 + 0.65 * uMo);
    float trong = step(0.0, d) * (1.0 - step(halfW, abs(P.x - gapC))) * (1.0 - smoothstep(3.6, 4.4, d));
    trong *= 1.0 - bongNguoi(P + vec3(0.0, 0.002, 0.0));
    float xa = smoothstep(1.4, 4.4, d);
    x = trong * (2.0 - 1.0 * xa) + (1.0 - trong) * (1.0 - smoothstep(0.0, 6.0, d));
    vuaM = khe * step(0.9, x);
    if (uMua > 0.5) {
      float vung = smoothstep(0.46, 0.52, n2(P.xz * vec2(1.3, 0.75) + 3.7));
      float gon = n2(vec2(P.z * 11.0 + uSeed * 5.3, P.x * 1.5 + uSeed));
      float dai = floor(P.z * 18.0 + gon * 2.0);
      vec2 off = vec2((hash13(vec3(dai, uSeed, 2.0)) - 0.5) * 0.0045, (gon - 0.5) * mix(0.03, 0.012, vung));
      float refl = uHasRefl > 0.5 ? texture2D(uRefl, gl_FragCoord.xy / uRes + off).r : 0.0;
      float vet = step(0.3, n2(vec2(P.x * 22.0, P.z * 3.0 + uSeed * 1.7)));
      float k = mix(0.62 * vet, 0.98, vung);
      x = max(x * mix(1.0, 0.55, vung), refl * 4.0 * k);
      vuaM *= 1.0 - vung;
      vec2 q = P.xz * vec2(2.6, 4.2); vec2 id = floor(q); vec2 fr = fract(q) - 0.5;
      float h = hash13(vec3(id, uSeed + 3.0));
      if (h > 0.55) {
        vec2 c = (vec2(hash13(vec3(id, uSeed + 11.0)), hash13(vec3(id, uSeed + 21.0))) - 0.5) * 0.5;
        float rr = 0.07 + 0.13 * hash13(vec3(id, uSeed + 31.0));
        float rv = length(fr - c);
        float ring = 1.0 - smoothstep(0.0, 0.016, abs(rv - rr));
        x = max(x, ring * (1.0 + 2.2 * trong + 1.2 * vung));
      }
    }
  } else if (uMat < 2.5) {
    float isL = step(uMat, 1.5);
    vec2 g = vec2(P.z / 0.23, P.y / 0.075);
    g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5;
    vec2 f = fract(g) - 0.5;
    float vua = step(0.44, max(abs(f.x), abs(f.y) * 0.98));
    float gan = 1.0 - smoothstep(0.0, 5.0, P.z + 15.0);
    float thap = 1.0 - smoothstep(0.5, 3.6, P.y);
    x = (1.0 * smoothstep(0.0, 0.4, gan) + 1.2 * gan * thap) * (0.55 + 0.45 * uMo);
    x = max(x, step(6.2, P.y));
    vec2 w = vec2(mod(P.z + 1.6, 3.4) - 1.7, mod(P.y - 3.1, 2.6) - 1.3);
    float cuaSo = step(abs(w.x), 0.42) * step(abs(w.y), 0.6) * step(2.6, P.y) * step(P.z, -3.5);
    float bau = step(abs(w.x), 0.5) * step(abs(w.y + 0.66), 0.045) * step(2.6, P.y) * step(P.z, -3.5);
    vuaM = vua * (1.0 - cuaSo);
    x = mix(x, 0.0, cuaSo); x = max(x, bau * 1.0); dac = max(dac, cuaSo);
    if (uMua > 0.5) {
      float chay = step(0.62, n2(vec2(P.z * 9.0, P.y * 0.6))) * step(P.y, 2.6);
      vuaM = max(vuaM, chay * step(0.9, x));
    }
    if (isL < 0.5) {
      float thang = step(abs(P.z + 7.2), 0.025) + step(abs(P.z + 7.9), 0.025);
      float bac2 = step(0.47, abs(fract(P.y / 0.32) - 0.5)) * step(-7.9, P.z) * step(P.z, -7.2);
      float sanThang = step(abs(mod(P.y, 2.6) - 2.3), 0.04) * step(-8.6, P.z) * step(P.z, -6.5);
      x = mix(x, 1.0, clamp((thang + bac2) * step(2.2, P.y) + sanThang * step(3.0, P.y), 0.0, 1.0));
    } else { float ong = step(abs(P.z + 9.3), 0.045); x = mix(x, 0.0, ong); dac = max(dac, ong); }
  } else if (uMat < 3.5) {
    vec2 g = vec2(P.x / 0.23, P.y / 0.075); g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5;
    vec2 f = fract(g) - 0.5;
    float vua = step(0.44, max(abs(f.x), abs(f.y) * 0.98));
    float quang = 1.0 - smoothstep(0.6, 1.9, length((P.xy - vec2(gapC, 1.3)) * vec2(1.0, 0.85)));
    x = 1.0 + (0.4 + 0.6 * uMo) * quang;
    vuaM = vua;
    float cua = step(abs(P.x - ${CX}), ${CW2}) * step(P.y, ${CH});
    float khung = step(abs(P.x - ${CX}), ${CW2} + 0.08) * step(P.y, ${CH} + 0.08) - cua;
    x = mix(x, 0.0, khung); dac = max(dac, khung);
    float khe = cua * step(gapC - gapW * 0.5, P.x);
    float canh = cua * (1.0 - khe);
    x = mix(x, 4.0, khe);
    x = mix(x, 0.0, canh * step(P.x, gapC - gapW * 0.5) * step(gapC - gapW * 0.5 - 0.035, P.x));
    x = mix(x, 1.0, canh * step(P.x, gapC - gapW * 0.5 - 0.035));
    vuaM *= 1.0 - cua;
    float bong = step(length(P.xy - vec2(${f3(NGO.den[0])}, ${f3(NGO.den[1])})), 0.075);
    x = max(x, bong * 4.0);
    float choa = step(abs(P.y - ${f3(NGO.den[1] + 0.09)}), 0.025) * step(abs(P.x - ${f3(NGO.den[0])}), 0.16);
    x = mix(x, 0.0, choa); dac = max(dac, choa);
  } else {
    x = 1.0;
  }
  if (dac < 0.5 && (uMat < 0.5 || uMat > 2.5)) x = min(4.0, x + 1.0);
  x = max(0.0, x - vuaM * step(0.9, x) * (1.0 - step(3.9, x)));
  gl_FragColor = ra(x, r1, r3, r4);
}`;

const VERT_N = `
uniform mat4 uFig, uFigInv; uniform float uPha, uVai, uDy;
varying vec3 vW; varying vec3 vN;
vec2 xoay(vec2 d, float a) { return vec2(d.x * cos(a) + d.y * sin(a), d.y * cos(a) - d.x * sin(a)); }
void main() {
  vec4 wp0 = modelMatrix * vec4(position, 1.0);
  vec3 p = (uFigInv * wp0).xyz;
  vec3 n = mat3(uFigInv) * (mat3(modelMatrix) * normal);
  float tL = 0.4 * sin(uPha), tR = -tL;
  float kL = 0.75 * pow(max(0.0, cos(uPha)), 2.0), kR = 0.75 * pow(max(0.0, -cos(uPha)), 2.0);
  float sL = smoothstep(-0.035, 0.035, p.x);
  float wHip = smoothstep(0.98, 0.84, p.y);
  float wGoi = smoothstep(0.52, 0.44, p.y) * (1.0 - uVai);
  vec3 q = p;
  { float k = mix(kR, kL, sL) * wGoi; vec2 d = xoay(vec2(q.y - 0.48, q.z - 0.02), -k); q.y = 0.48 + d.x; q.z = 0.02 + d.y;
    vec2 m = xoay(n.yz, -k); n.yz = mix(n.yz, m, wGoi); }
  { float t = mix(tR, tL, sL) * wHip; vec2 d = xoay(vec2(q.y - 0.92, q.z), t); q.y = 0.92 + d.x; q.z = d.y;
    vec2 m = xoay(n.yz, t); n.yz = m; }
  q.y += uDy;
  vec4 wp = uFig * vec4(q, 1.0);
  vW = wp.xyz; vN = normalize(mat3(uFig) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG_N = `
${COMMON}
${RA}
varying vec3 vW; varying vec3 vN;
uniform float uCell; uniform vec3 uCuaC;
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vW);
  float cs = uCell * max(length(vW - cameraPosition), 0.5);
  vec3 cel = floor(vW / cs);
  float r1 = hash13(cel), r3 = hash13(cel + 41.7), r4 = hash13(cel + 73.1);
  vec3 L = normalize(uCuaC - vW);
  float mep = 1.0 - abs(dot(n, v));
  float rim = smoothstep(0.72, 0.86, mep) * step(0.05, dot(n, L) + 0.25);
  float x = 0.15 + 2.6 * rim;
  gl_FragColor = ra(x, r1, r3, r4);
}`;
const FRAG_SAU = 'void main() { gl_FragColor = vec4(1.0); }';

const VERT_MUA = `
attribute vec3 aP; attribute float aL;
uniform vec3 uGio; uniform vec2 uRes; uniform float uRong;
varying vec3 vW;
void main() {
  vec3 A = aP, B = aP + uGio * aL;
  vec4 ca = projectionMatrix * viewMatrix * vec4(A, 1.0), cb = projectionMatrix * viewMatrix * vec4(B, 1.0);
  vec2 sa = ca.xy / ca.w, sb = cb.xy / cb.w;
  vec2 dir = normalize((sb - sa) * uRes + 1e-6); vec2 nr = vec2(-dir.y, dir.x);
  vec4 c = mix(ca, cb, position.y);
  c.xy += nr * position.x * 2.0 * uRong / uRes * c.w;
  vW = mix(A, B, position.y);
  gl_Position = c;
}`;
const FRAG_MUA = `
${COMMON}
${RA}
varying vec3 vW; uniform vec3 uDen; uniform float uMo;
void main() {
  float gapW = ${CW2} * 2.0 * uMo; float gapC = ${CX} + ${CW2} - gapW * 0.5;
  float d = vW.z + ${NGO.dai.toFixed(2)};
  float halfW = gapW * 0.5 + d * 0.42;
  float luong = step(0.0, d) * step(abs(vW.x - gapC), halfW) * step(vW.y, ${CH} + d * 0.35) * (1.0 - smoothstep(3.5, 6.0, d));
  vec3 L = uDen - vW; float non = smoothstep(0.4, 0.6, dot(normalize(-L), vec3(0.0, -1.0, 0.25) / 1.0308)) * (1.0 - smoothstep(0.5, 3.5, length(L)));
  float a = max(luong, non);
  vec3 cel = floor(vW / 0.01);
  float x = mix(1.15, 3.1, step(0.5, a));
  if (a < 0.5 && hash13(cel) > 0.55) discard;
  gl_FragColor = ra(x, hash13(cel + 3.0), hash13(cel + 41.7), hash13(cel + 73.1));
}`;

export function makeNgo(renderer, o) {
  const sc = new THREE.Scene();
  let W = o.w, H = o.h;
  const CAM = MAY_NGO.pos;
  const shared = {
    uLevelOut: { value: 0 }, uDen: { value: new THREE.Vector3(...NGO.den) },
    uCell: { value: 0.0015 }, uMua: { value: 1 }, uMo: { value: 0.6 }, uSeed: { value: 1 },
    uHasRefl: { value: 0 }, uRefl: { value: null }, uRes: { value: new THREE.Vector2(W, H) },
    uBongT: { value: null }, uBongVP: { value: new THREE.Matrix4() }, uCoBong: { value: 0 },
  };
  const mk = (geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...shared, uMat: { value: mat } }, side: THREE.DoubleSide }));
    m.position.set(...pos); if (rot) m.rotation.set(...rot); sc.add(m); return m;
  };
  const { rong, dai, cao } = NGO;
  const dat = mk(new THREE.PlaneGeometry(rong, dai + 8), 0, [0, 0, -dai / 2 + 4], [-Math.PI / 2, 0, 0]);
  mk(new THREE.PlaneGeometry(dai + 8, cao), 1, [-rong / 2, cao / 2, -dai / 2 + 4], [0, Math.PI / 2, 0]);
  mk(new THREE.PlaneGeometry(dai + 8, cao), 2, [rong / 2, cao / 2, -dai / 2 + 4], [0, -Math.PI / 2, 0]);
  mk(new THREE.PlaneGeometry(rong, cao), 3, [0, cao / 2, -dai], null);
  mk(new THREE.PlaneGeometry(rong * 3, 6), 4, [0, cao + 2.0, -dai + 0.5], null);
  const nguoi = new THREE.Group(); sc.add(nguoi);
  const uN = { uLevelOut: shared.uLevelOut, uCell: shared.uCell, uCuaC: { value: new THREE.Vector3() },
    uFig: { value: new THREE.Matrix4() }, uFigInv: { value: new THREE.Matrix4() }, uPha: { value: 0 }, uDy: { value: 0 } };
  const VAI = ['Ao', 'VatAo', 'Dai', 'CoAo', 'Tui'];
  const nmAo = new THREE.ShaderMaterial({ vertexShader: VERT_N, fragmentShader: FRAG_N, side: THREE.DoubleSide, uniforms: { ...uN, uVai: { value: 1 } } });
  const nmThan = new THREE.ShaderMaterial({ vertexShader: VERT_N, fragmentShader: FRAG_N, side: THREE.DoubleSide, uniforms: { ...uN, uVai: { value: 0 } } });
  const smAo = new THREE.ShaderMaterial({ vertexShader: VERT_N, fragmentShader: FRAG_SAU, side: THREE.DoubleSide, uniforms: { ...uN, uVai: { value: 1 } } });
  const smThan = new THREE.ShaderMaterial({ vertexShader: VERT_N, fragmentShader: FRAG_SAU, side: THREE.DoubleSide, uniforms: { ...uN, uVai: { value: 0 } } });
  const meshN = [];
  if (o.nguoi) {
    const ban = o.nguoi.clone(true);
    ban.position.set(0, 0, 0); ban.rotation.set(0, 0, 0); ban.scale.set(1, 1, 1);
    ban.traverse((m) => { if (!m.isMesh) return; const vai = VAI.some((k) => m.name === k || m.name.startsWith(k + '_') || m.name.startsWith(k + '.')); m.userData.vai = vai; m.material = vai ? nmAo : nmThan; m.layers.set(0); m.frustumCulled = false; meshN.push(m); });
    nguoi.add(ban);
  }
  const CHAM_DAT = { 0: 0.0164, 524: 0.0254, 1047: -0.0050, 1571: -0.0139, 2094: -0.0156, 2618: -0.0263, 3142: -0.0010, 3665: 0.0194, 4189: 0.0180, 4712: 0.0125, 5236: 0.0187, 5760: 0.0097 };
  const chamDat = (pha) => CHAM_DAT[Math.round((((pha % 6.2832) + 6.2832) % 6.2832) * 1000)] ?? 0;
  const cam = new THREE.PerspectiveCamera(MAY_NGO.fov, W / H, 0.05, 60);
  cam.position.set(...CAM);
  cam.lookAt(...MAY_NGO.nhin);
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const bongRT = new THREE.WebGLRenderTarget(512, 512, { depthTexture: new THREE.DepthTexture(512, 512), depthBuffer: true });
  const camB = new THREE.PerspectiveCamera(110, 1, 0.05, 9);
  shared.uBongT.value = bongRT.depthTexture;
  const N = 3000;
  const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position;
  const aP = new Float32Array(N * 3), aL = new Float32Array(N);
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3)); g.setAttribute('aL', new THREE.InstancedBufferAttribute(aL, 1)); g.instanceCount = N;
  const muaM = new THREE.ShaderMaterial({ vertexShader: VERT_MUA, fragmentShader: FRAG_MUA, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uGio: { value: new THREE.Vector3(-0.28, -1, 0.06).normalize() }, uRes: shared.uRes, uRong: { value: 1.25 * Math.max(1, W / 900) },
      uDen: shared.uDen, uMo: shared.uMo, uLevelOut: shared.uLevelOut } });
  const mua = new THREE.Mesh(g, muaM); mua.frustumCulled = false; sc.add(mua);
  function datMua(f) {
    let s = 11 + f * 7919; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) { aP[i * 3] = (rnd() - 0.5) * rong; aP[i * 3 + 1] = rnd() * 4.6; aP[i * 3 + 2] = -dai + rnd() * 8.2; aL[i] = [0.16, 0.26, 0.4][Math.floor(rnd() * 3)]; }
    g.attributes.aP.needsUpdate = true; g.attributes.aL.needsUpdate = true;
  }
  let reflRT = null;
  const camG = cam.clone();
  const R = new THREE.Matrix4().makeScale(1, -1, 1);
  camG.matrixAutoUpdate = false; camG.matrixWorldAutoUpdate = false;
  camG.matrixWorld.multiplyMatrices(R, cam.matrixWorld); camG.matrixWorldInverse.copy(camG.matrixWorld).invert();
  camG.projectionMatrix.copy(cam.projectionMatrix); camG.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
  function datCo(w, h) { W = w; H = h; shared.uRes.value.set(W, H); if (reflRT) { reflRT.dispose(); reflRT = null; } }
  function datKhung(f, v = 0) {
    const kho = f === KHUNG;
    shared.uMua.value = kho ? 0 : 1; shared.uMo.value = moCua(f); shared.uSeed.value = f + v * 1000;
    const ng = nguoiAt(f, CAM);
    nguoi.position.set(ng.x, 0, ng.z); nguoi.rotation.set(0, Math.PI + 0.1, 0); nguoi.updateMatrixWorld(true);
    uN.uFig.value.copy(nguoi.matrixWorld); uN.uFigInv.value.copy(nguoi.matrixWorld).invert(); uN.uPha.value = ng.pha; uN.uDy.value = chamDat(ng.pha);
    const gapW = NGO.cua.w * moCua(f), gapC = NGO.cua.x + NGO.cua.w / 2 - gapW / 2;
    uN.uCuaC.value.set(gapC, 1.1, -dai);
    mua.visible = !kho;
    if (!kho) datMua(f + v * 1000);
    camB.position.set(gapC, 1.25, -dai + 0.02); camB.lookAt(gapC, 0.2, -dai + 4); camB.updateMatrixWorld(); camB.updateProjectionMatrix();
    shared.uBongVP.value.multiplyMatrices(camB.projectionMatrix, camB.matrixWorldInverse);
    return ng;
  }
  const quanh = (f2) => { const ac = renderer.autoClear; renderer.autoClear = true; const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1); try { f2(); } finally { renderer.setRenderTarget(null); renderer.setClearColor(cc, ca); renderer.autoClear = ac; } };
  function buocBong(f, v = 0) {
    datKhung(f, v);
    quanh(() => {
      for (const m of meshN) m.material = m.userData.vai ? smAo : smThan;
      const hien = sc.children.map((c) => c.visible); sc.children.forEach((c) => { c.visible = c === nguoi; });
      renderer.setRenderTarget(bongRT); renderer.clear(); renderer.render(sc, camB);
      sc.children.forEach((c, i) => { c.visible = hien[i]; });
      for (const m of meshN) m.material = m.userData.vai ? nmAo : nmThan;
    });
    shared.uCoBong.value = meshN.length ? 1 : 0;
  }
  function buocPhan(f) {
    if (f === KHUNG) { shared.uHasRefl.value = 0; return; }
    quanh(() => {
      if (!reflRT) reflRT = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true, format: THREE.RedFormat });
      dat.visible = false; mua.visible = false;
      shared.uLevelOut.value = 1; shared.uRefl.value = null; shared.uHasRefl.value = 0;
      renderer.setRenderTarget(reflRT); renderer.clear(); renderer.render(sc, camG);
      shared.uLevelOut.value = 0; dat.visible = true; mua.visible = true;
      shared.uRefl.value = reflRT.texture; shared.uHasRefl.value = 1;
    });
  }
  function buocChinh(f, rt) { quanh(() => { renderer.setRenderTarget(rt); renderer.clear(); renderer.render(sc, cam); }); void f; }
  function ve(f, rt) { buocBong(f); buocPhan(f); buocChinh(f, rt); }
  function anh(p) { const v = new THREE.Vector3(...p).project(cam); return [v.x * 0.5 + 0.5, v.y * 0.5 + 0.5]; }
  function huy() {
    bongRT.depthTexture.dispose(); bongRT.dispose(); if (reflRT) reflRT.dispose(); reflRT = null;
    sc.traverse((m) => { if (!m.isMesh) return; if (!meshN.includes(m)) m.geometry.dispose(); });
    for (const m of new Set([nmAo, nmThan, smAo, smThan, muaM])) m.dispose();
    sc.traverse((m) => { if (m.isMesh && !meshN.includes(m) && m.material && m.material.dispose) m.material.dispose(); });
  }
  async function lamNongAsync() {
    datKhung(KHUNG - 1);
    const coSS = renderer.extensions.has('KHR_parallel_shader_compile');
    const dich = (s2, c2) => (coSS ? renderer.compileAsync(s2, c2).catch(() => {}) : Promise.resolve(renderer.compile(s2, c2)));
    await dich(sc, cam);
    for (const m of meshN) m.material = m.userData.vai ? smAo : smThan;
    const hien = sc.children.map((c) => c.visible); sc.children.forEach((c) => { c.visible = c === nguoi; });
    try { await dich(sc, camB); } finally { sc.children.forEach((c, i) => { c.visible = hien[i]; }); for (const m of meshN) m.material = m.userData.vai ? nmAo : nmThan; }
  }
  return { ve, buocBong, buocPhan, buocChinh, datCo, anh, cam: CAM, huy, scene: sc, camera: cam, bongRT, camB, shared, lamNongAsync };
}
